// 🎬 LES ANIMATIONS CONTEXTUELLES — la bibliothèque du Correctif 30 (niveau d'IA 6)
//
// Demande : « on revoit trop souvent les mêmes crochets, plaquages, rucks et touches. Il faut une vraie bibliothèque
// d'animations contextuelles, choisies selon la vitesse, l'angle, la puissance, le poste, la fatigue et la situation.
// Aucun choix d'animation purement aléatoire. La variété ne doit pas être cosmétique : chaque animation doit correspondre
// à ce qui vient réellement de se produire dans la simulation. »
//
// ═══ LE PRINCIPE ═════════════════════════════════════════════════════════════
//
// `duels.ts` LIT un contact (angle, fermeture, rapport de force) et en tire un TYPE — neuf plaquages. Ce module va un cran
// plus loin : du même contact, il tire la VARIANTE qu'on va voir — vingt-deux plaquages aboutis, treize manqués, douze
// crochets, six raffuts, cinq percussions, huit déblayages, cinq grattages… Le moteur écrit cette variante dans l'état
// (`ruck.plaquage.variante`, la `variante` d'un geste, `ruck.duel.sequence`) ; la scène la joue telle quelle.
//
// ⚠️ FONCTIONS PURES, SANS TIRAGE. Rien ici ne consomme le générateur du match : deux écrans qui lisent le même état montrent
// la même animation, et le film d'un match de ligue n'a rien de plus à transporter que l'état. Le seul départage qui ne
// vienne pas des joueurs est `alternance` (±1, horloge et numéros) — celui qu'utilisait déjà `lirePlaquage`.
//
// ⚠️ LA VARIANTE NE DÉCIDE DE RIEN. Qui gagne le duel, combien de mètres sont rendus, qui tombe : c'est le moteur. La
// variante choisit, PARMI les gestes compatibles avec ce que le moteur a décidé, celui que la situation appelle.
//
// ⚠️ TOUT CELA EST DERRIÈRE `EtatMatch.ia` ≥ 6 (`jeuPhysique`). Les matchs déjà commencés gardent leur moteur.
import type { Pion } from './entites.js';
import type { EtatMatch } from './etat.js';
import type { AnglePlaquage, GesteContact, IssueCrochet, IssueRaffut, LecturePlaquage, TypePlaquage } from './duels.js';
import { AXE, LARGEUR, LIGNE_A, LIGNE_B, borner, sens, type Vec } from './terrain.js';

/** Le jeu physique du Correctif 30 est-il actif dans ce match ? (niveau figé à la création) */
export function jeuPhysique(e: Pick<EtatMatch, 'ia'>): boolean { return (e.ia ?? 1) >= 6; }

const poids = (p: Pion) => p.poidsKg ?? (p.avant ? 108 : 90);
const allure = (p: Pion) => Math.hypot(p.vitesse.x, p.vitesse.y);
const ecart = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

// ═══════════════════════════════════════════════════════════════════════════
// QUI JOUE : LE PROFIL DU POSTE ET LA FATIGUE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * La famille de gestes d'un joueur. Un pilier ne plaque pas, ne court pas et ne crochète pas comme un ailier :
 * `lourd` (cinq de devant), `troisieme` (6, 7, 8), `demi` (9, 10), `centre` (12, 13), `arriere` (11, 14, 15).
 */
export type ProfilAnimation = 'lourd' | 'troisieme' | 'demi' | 'centre' | 'arriere';

export function profilAnimation(p: Pick<Pion, 'numero' | 'avant'> & Partial<Pick<Pion, 'puissance' | 'evitement'>>): ProfilAnimation {
  const n = p.numero;
  if (n >= 1 && n <= 5) return 'lourd';
  if (n >= 6 && n <= 8) return 'troisieme';
  if (n === 9 || n === 10) return 'demi';
  if (n === 12 || n === 13) return 'centre';
  if (n === 11 || n === 14 || n === 15) return 'arriere';
  // Un remplaçant entré sous son numéro de banc : on lit ce qu'il est.
  if (p.avant) return (p.puissance ?? 70) >= (p.evitement ?? 55) + 14 ? 'lourd' : 'troisieme';
  return (p.puissance ?? 60) >= (p.evitement ?? 65) ? 'centre' : 'arriere';
}

/** 0 : frais ; 1 : entamé ; 2 : épuisé. */
export type NiveauFatigue = 0 | 1 | 2;

/**
 * Ce que la fatigue fait au geste. Elle se lit sur l'endurance générale ET sur le souffle du moment : un joueur encore frais
 * qui vient de vider sa barre de sprint plaque moins proprement pendant quelques secondes.
 */
export function niveauFatigue(p: Pick<Pion, 'endurance'> & Partial<Pick<Pion, 'sprint' | 'essoufle' | 'deuxReserves'>>): NiveauFatigue {
  let reste = p.endurance;
  if (p.deuxReserves) reste -= (p.essoufle ? 20 : 0) + Math.max(0, 28 - (p.sprint ?? 100)) * 0.45;
  return reste >= 64 ? 0 : reste >= 42 ? 1 : 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// LE CONTACT, LU EN ENTIER
// ═══════════════════════════════════════════════════════════════════════════

export interface ContexteContact {
  angle: AnglePlaquage;
  /** D'où vient le défenseur, vu du porteur : −1 à sa gauche, 1 à sa droite, 0 droit devant ou droit derrière. */
  cote: -1 | 0 | 1;
  vPorteur: number;
  vDefenseur: number;
  /** Vitesse de rapprochement des deux hommes (m/s). */
  fermeture: number;
  /** Rapport de force en points d'attribut : positif pour le défenseur. */
  rapport: number;
  poidsPorteur: number;
  poidsDefenseur: number;
  /** Équilibre du porteur à l'impact, de 0 (emporté) à 1 (planté sur ses appuis). */
  equilibre: number;
  fatiguePorteur: NiveauFatigue;
  fatigueDefenseur: NiveauFatigue;
  profilPorteur: ProfilAnimation;
  profilDefenseur: ProfilAnimation;
  /** Le ballon est-il du côté d'où vient le plaqueur ? Un bon porteur le change de bras ; pris de face, il est toujours exposé. */
  expose: boolean;
  /** Mètres entre le porteur et la ligne d'essai qu'il attaque. */
  presLigne: number;
  /** Un second défenseur est au contact : son identifiant. */
  secondId?: string;
  /** Aucun soutien à moins de quatre mètres : le porteur doit protéger son ballon. */
  isole: boolean;
}

const directionDe = (p: Pion): Vec => {
  const v = allure(p);
  return v > 0.6 ? { x: p.vitesse.x / v, y: p.vitesse.y / v } : { x: sens(p.cote), y: 0 };
};

/** Tout ce qu'un contact entre un porteur et un défenseur donne à lire. Aucun tirage, aucune écriture. */
export function lireContexte(e: Pick<EtatMatch, 'pions'>, porteur: Pion, defenseur: Pion, lecture: LecturePlaquage): ContexteContact {
  const dir = directionDe(porteur);
  const rx = defenseur.pos.x - porteur.pos.x, ry = defenseur.pos.y - porteur.pos.y;
  // La gauche du porteur : (−dy, dx). L'équipe A, qui attaque vers les x croissants, a sa gauche du côté des y croissants.
  const aGauche = rx * -dir.y + ry * dir.x;
  const cote: -1 | 0 | 1 = Math.abs(aGauche) < 0.18 ? 0 : aGauche > 0 ? -1 : 1;
  const fatiguePorteur = niveauFatigue(porteur), fatigueDefenseur = niveauFatigue(defenseur);
  const vPorteur = allure(porteur);
  // Le bras qui porte : à l'opposé du défenseur pour celui qui lit le jeu, sinon son bras habituel (numéro pair ou impair).
  const bras = porteur.vision >= 62 && cote !== 0 ? -cote : (porteur.numero & 1 ? 1 : -1);
  let secondId: string | undefined, plusProche = 1.75;
  let isole = true;
  for (const q of e.pions) {
    if (!q.surLeTerrain || q.sanction > 0 || q.corps || q === porteur || q === defenseur) continue;
    const d = ecart(q.pos, porteur.pos);
    if (q.cote === defenseur.cote) { if (q.battu <= 0 && d < plusProche) { plusProche = d; secondId = q.id; } }
    else if (d < 4) isole = false;
  }
  return {
    angle: lecture.angle, cote, vPorteur, vDefenseur: allure(defenseur), fermeture: lecture.fermeture, rapport: lecture.rapport,
    poidsPorteur: poids(porteur), poidsDefenseur: poids(defenseur),
    equilibre: borner(0.5 + (porteur.evitement * 0.5 + porteur.puissance * 0.5 - 62) / 70 - fatiguePorteur * 0.13
      - (lecture.angle === 'cote' ? 0.1 : lecture.angle === 'dos' ? 0.16 : 0) + (vPorteur < 3 ? 0.1 : vPorteur > 7 ? -0.08 : 0), 0, 1),
    fatiguePorteur, fatigueDefenseur,
    profilPorteur: profilAnimation(porteur), profilDefenseur: profilAnimation(defenseur),
    expose: lecture.angle === 'face' || bras === cote,
    presLigne: porteur.cote === 'A' ? LIGNE_B - porteur.pos.x : porteur.pos.x - LIGNE_A,
    ...(secondId ? { secondId } : {}),
    isole,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// LES PLAQUAGES ABOUTIS — vingt-deux façons d'aller au sol
// ═══════════════════════════════════════════════════════════════════════════

export type VariantePlaquage =
  // Aux jambes : plongeon dans les appuis, fauché de côté, fauché net à pleine vitesse, cuillère, sauvetage devant la ligne.
  | 'jambes' | 'jambes-cote' | 'fauche' | 'chevilles' | 'in-extremis'
  // Au bassin : classique, plaqueur qui roule et se relève, épaule contre épaule, ballon protégé, à deux.
  | 'bassin' | 'bassin-roule' | 'epaules' | 'protege' | 'a-deux'
  // Haut (réglementaire) : ballon enfermé, porteur renversé sur le dos.
  | 'haut' | 'sur-le-dos'
  // De côté : saisi, emporté en roulant, défenseur qui glisse le long du porteur.
  | 'cote' | 'cote-roule' | 'glisse'
  // Par-derrière : saisi dans le dos, plongé à la taille.
  | 'dos' | 'dos-plonge'
  // Offensif : le porteur recule, de face ou de travers.
  | 'offensif' | 'offensif-cote'
  // Debout : enfermé, ou soulevé et porté en reculant.
  | 'debout' | 'debout-porte'
  // Le porteur gagne l'impact : encore un ou deux mètres avant de tomber.
  | 'gagne-metres';

export const VARIANTES_PLAQUAGE: readonly VariantePlaquage[] = [
  'jambes', 'jambes-cote', 'fauche', 'chevilles', 'in-extremis', 'bassin', 'bassin-roule', 'epaules', 'protege', 'a-deux',
  'haut', 'sur-le-dos', 'cote', 'cote-roule', 'glisse', 'dos', 'dos-plonge', 'offensif', 'offensif-cote', 'debout', 'debout-porte',
  'gagne-metres',
];

/**
 * LE PLAQUAGE QU'ON VA VOIR. Le TYPE vient de `lirePlaquage` et il commande la physique (recul, mètres gagnés) ; la variante
 * reste dans sa famille. Ce qui la choisit : angle + vitesse de l'attaquant + vitesse du défenseur + différence de poids +
 * puissance (le rapport de force) + équilibre + fatigue + position du ballon — et la ligne d'essai, et le second plaqueur.
 */
export function choisirPlaquage(type: TypePlaquage, c: ContexteContact, alternance: number): VariantePlaquage {
  switch (type) {
    case 'jambes':
      // Devant sa ligne, le plongeon dans les appuis est un sauvetage : le porteur tombe en tendant le bras.
      if (c.presLigne < 6 && c.vPorteur > 3.2) return 'in-extremis';
      if (c.angle === 'cote') return 'jambes-cote';
      return c.vPorteur >= 6 && c.fermeture >= 7 ? 'fauche' : 'jambes';
    case 'poursuite':
      return c.presLigne < 8 ? 'in-extremis' : 'chevilles';
    case 'taille':
      if (c.secondId) return 'a-deux';
      // Deux gabarits lancés l'un sur l'autre, à forces égales : ni l'un ni l'autre ne passe.
      if (Math.abs(c.rapport) < 3.5 && c.fermeture >= 5.2 && c.poidsPorteur + c.poidsDefenseur >= 200) return 'epaules';
      if (c.isole && !c.expose && c.equilibre >= 0.45) return 'protege';
      // Un troisième ligne frais plaque, roule et se relève : il est déjà debout pour le ballon.
      if (c.profilDefenseur === 'troisieme' && c.fatigueDefenseur === 0) return 'bassin-roule';
      return 'bassin';
    case 'haut':
      if (c.secondId) return 'a-deux';
      return c.rapport >= 3 && c.equilibre < 0.55 ? 'sur-le-dos' : 'haut';
    case 'cote':
      // Le défenseur dominé, ou à bout de souffle, n'a que ses bras : il glisse le long du porteur et finit aux chevilles.
      if (c.rapport < -2.5 || c.fatigueDefenseur === 2) return 'glisse';
      return c.vPorteur >= 5.4 ? 'cote-roule' : 'cote';
    case 'arriere':
      return c.vDefenseur >= 5 && c.vPorteur >= 4.2 ? 'dos-plonge' : 'dos';
    case 'dominant':
      return c.angle === 'cote' ? 'offensif-cote' : 'offensif';
    case 'debout':
      // Soulevé et emmené : il faut un écart net, de force ET de poids.
      return c.rapport >= 15 && c.poidsDefenseur - c.poidsPorteur >= 10 ? 'debout-porte' : 'debout';
    case 'accroche':
      return c.fatigueDefenseur >= 1 && c.rapport <= -6 && alternance > 0 ? 'glisse' : 'gagne-metres';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LES PLAQUAGES MANQUÉS — treize façons de se rater
// ═══════════════════════════════════════════════════════════════════════════

export type VarianteManque =
  // Le défenseur va au sol.
  | 'plonge-tot' | 'passe-derriere' | 'contre-pied' | 'glisse-cote' | 'une-jambe' | 'depasse' | 'a-genoux'
  | 'percute' | 'assis' | 'rebondit'
  // Il reste debout, battu.
  | 'plante' | 'bras' | 'raffute';

export const VARIANTES_MANQUE: readonly VarianteManque[] = [
  'plonge-tot', 'passe-derriere', 'contre-pied', 'glisse-cote', 'une-jambe', 'depasse', 'a-genoux', 'percute', 'assis', 'rebondit',
  'plante', 'bras', 'raffute',
];

/** Ces variantes laissent le défenseur DEBOUT : le moteur ne doit pas le faire tomber, la scène ne doit pas le coucher. */
export const MANQUES_DEBOUT: ReadonlySet<VarianteManque> = new Set(['plante', 'bras', 'raffute']);

export type GesteDuel = 'crochet' | 'raffut' | 'sprint' | null;

/**
 * COMMENT LE DÉFENSEUR S'EST RATÉ. Le moteur a déjà décidé de ce qui lui arrive (`issueRaffut`, `issueCrochet` : debout,
 * déséquilibré, au sol) ; on choisit ici le geste qui le raconte.
 *
 * @param direction ±1 : le côté de l'appui du porteur (repère du terrain).
 */
export function choisirManque(
  c: ContexteContact, geste: GesteDuel, issue: IssueRaffut | IssueCrochet | null, contact: GesteContact | null,
  direction: number, alternance: number,
): VarianteManque {
  if (geste === 'raffut') {
    // Percuté à pleine vitesse, il part à la renverse ; pris par un bras ou par un porteur moins lancé, il s'assoit.
    if (issue === 'tombe') return contact === 'percussion' && c.vPorteur >= 5.6 ? 'percute' : 'assis';
    if (issue === 'equilibre') return 'rebondit';
    return 'raffute';
  }
  if (geste === 'crochet') {
    if (issue === 'contrepied') {
      // Lancé à fond, il a plongé avant l'appui : le porteur n'était déjà plus là.
      if (c.vDefenseur >= 5.6) return 'plonge-tot';
      // Le porteur est reparti du côté d'où venait le défenseur : il lui passe dans le dos.
      const versLui = c.cote !== 0 && (direction > 0 ? -1 : 1) === c.cote;
      return versLui ? 'passe-derriere' : 'contre-pied';
    }
    // Simplement éliminé : il tend un bras s'il était assez près, sinon il reste planté sur le mauvais appui.
    return c.fermeture >= 4.5 || c.rapport > 2 ? 'bras' : 'plante';
  }
  if (geste === 'sprint') {
    if (c.angle === 'dos') return 'depasse';
    return c.rapport > 0 && c.vDefenseur >= 3 ? 'une-jambe' : 'glisse-cote';
  }
  // Plaquage cassé en force, sans geste particulier.
  if (c.fatigueDefenseur === 2) return 'a-genoux';
  if (c.angle === 'dos') return 'depasse';
  if (c.angle === 'cote') return c.rapport > -4 && alternance > 0 ? 'une-jambe' : 'glisse-cote';
  return c.rapport < -9 ? 'rebondit' : c.vDefenseur >= 5 ? 'plonge-tot' : 'glisse-cote';
}

// ═══════════════════════════════════════════════════════════════════════════
// LES CROCHETS — douze appuis
// ═══════════════════════════════════════════════════════════════════════════

export type VarianteCrochet30 =
  | 'interieur' | 'exterieur' | 'double' | 'appui-court' | 'feinte-corps' | 'faux-exterieur' | 'arret-relance'
  | 'explosif' | 'lourd' | 'bassin' | 'accelere' | 'rate';

export const VARIANTES_CROCHET: readonly VarianteCrochet30[] = [
  'interieur', 'exterieur', 'double', 'appui-court', 'feinte-corps', 'faux-exterieur', 'arret-relance', 'explosif', 'lourd',
  'bassin', 'accelere', 'rate',
];

/**
 * L'APPUI DU PORTEUR. Vitesse, agilité, accélération, poste et fatigue décident de ce qu'il sait faire ; l'espace et la
 * course du défenseur, de ce qu'il a intérêt à faire. `rate` n'est jamais rendu ici : le moteur le pose quand, malgré
 * l'appui, le défenseur est resté devant (`variantePourCrochetRate`).
 *
 * @param direction ±1 : le sens latéral de l'appui. @param ouvert ±1 : le côté ouvert de la phase.
 * @param espace mètres libres devant le porteur.
 */
export function choisirCrochet(
  porteur: Pion, defenseur: Pion, direction: number, ouvert: number, espace: number, alternance: number,
): VarianteCrochet30 {
  const v = allure(porteur), vD = allure(defenseur);
  const profil = profilAnimation(porteur), fatigue = niveauFatigue(porteur);
  // Presque arrêté : il n'a pas d'élan à changer — il s'arrête et repart, ou il ne fait que balancer le buste.
  if (v < 2.6) return 'arret-relance';
  if (v < 3.8) return 'feinte-corps';
  // Un avant, un centre de percussion ou un joueur épuisé ne danse pas : un seul appui, lourd, épaules basses.
  if (profil === 'lourd' || fatigue === 2 || (profil !== 'arriere' && profil !== 'demi' && porteur.puissance >= porteur.evitement + 10)) return 'lourd';
  const exterieur = direction === ouvert;
  const agile = porteur.evitement >= 72, tresAgile = porteur.evitement >= 80;
  if (tresAgile && fatigue === 0 && v >= 6.2) return alternance > 0 ? 'explosif' : 'double';
  // Le défenseur monte vite : pas le temps d'un grand appui.
  if (vD >= 5.2 && v < 6.4) return 'appui-court';
  if (agile && !exterieur) return alternance > 0 ? 'faux-exterieur' : 'interieur';
  // De l'espace à l'extérieur et des jambes : l'appui, puis il met le pied au plancher.
  if (exterieur && espace >= 5 && porteur.acceleration >= 4.6 && fatigue === 0) return 'accelere';
  // Lancé à pleine vitesse : une simple rotation du bassin suffit à sortir de l'axe du plaquage.
  if (v >= 6.6) return 'bassin';
  if (agile && alternance > 0) return 'double';
  return exterieur ? 'exterieur' : 'interieur';
}

// ═══════════════════════════════════════════════════════════════════════════
// RAFFUTS ET PERCUSSIONS
// ═══════════════════════════════════════════════════════════════════════════

export type VarianteRaffut = 'bras-tendu' | 'poitrine' | 'epaule' | 'main-epaule' | 'protege-repousse' | 'en-course';
export const VARIANTES_RAFFUT: readonly VarianteRaffut[] = ['bras-tendu', 'poitrine', 'epaule', 'main-epaule', 'protege-repousse', 'en-course'];

/** Où va la main du porteur, et comment : selon le gabarit d'en face, l'angle, la vitesse et le bras qui tient le ballon. */
export function choisirRaffut(porteur: Pion, defenseur: Pion, c: Pick<ContexteContact, 'angle' | 'vPorteur' | 'vDefenseur' | 'expose'>): VarianteRaffut {
  // On ne repousse pas un plus lourd : la main se pose sur son épaule pour s'en écarter.
  if (poids(defenseur) > poids(porteur) + 8) return 'main-epaule';
  // Lancé, défenseur sur le côté : le bras sort sans que la foulée change.
  if (c.vPorteur >= 6.2 && c.angle !== 'face') return 'en-course';
  // Le ballon est du côté du plaqueur : il le rentre d'abord, puis repousse de l'autre main.
  if (c.expose && c.angle !== 'face') return 'protege-repousse';
  // Le défenseur arrive bas, lancé : c'est son épaule qu'on prend.
  if (c.vDefenseur >= 4.6) return 'epaule';
  return porteur.puissance >= 74 && c.angle === 'face' ? 'poitrine' : 'bras-tendu';
}

export type VariantePercussion = 'traverse' | 'lance' | 'pilier' | 'centimetres' | 'stoppe';
export const VARIANTES_PERCUSSION: readonly VariantePercussion[] = ['traverse', 'lance', 'pilier', 'centimetres', 'stoppe'];

/**
 * La percussion telle qu'elle PART : centre puissant qui veut traverser, troisième ligne lancé, pilier sur un plus léger.
 * Si le défenseur tient, le moteur la requalifie (`issuePercussion`) : quelques centimètres gagnés, ou stoppé net.
 */
export function choisirPercussion(porteur: Pion, defenseur: Pion): VariantePercussion {
  const profil = profilAnimation(porteur), v = allure(porteur);
  if (profil === 'lourd') return poids(porteur) - poids(defenseur) >= 9 ? 'pilier' : 'centimetres';
  if (profil === 'troisieme') return v >= 5 ? 'lance' : 'centimetres';
  return v >= 4.6 && porteur.puissance >= 70 ? 'traverse' : 'centimetres';
}

/** La percussion qui n'a pas percé : le plaquage subi dit si le porteur a tout de même avancé. */
export function issuePercussion(type: TypePlaquage): VariantePercussion {
  return type === 'dominant' || type === 'debout' || type === 'haut' ? 'stoppe' : 'centimetres';
}

// ═══════════════════════════════════════════════════════════════════════════
// LE PLAQUAGE DANGEREUX — détecté, mesuré, puis jugé
// ═══════════════════════════════════════════════════════════════════════════

export type TypeDanger = 'souleve' | 'charge' | 'haut' | 'retard';

export interface PlaquageDangereux {
  type: TypeDanger;
  /** Le porteur a-t-il quitté le sol ? */
  souleve: boolean;
  /** Maîtrise de la chute par le plaqueur, de 0 (il le lâche sur la tête ou les épaules) à 1 (il l'accompagne au sol). */
  maitrise: number;
  /** Violence de l'impact, de 0 à 1. */
  impact: number;
  /** 1 : pénalité ; 2 : carton jaune ; 3 : carton rouge. */
  gravite: 1 | 2 | 3;
  motif: string;
}

/**
 * CE QUE VAUT UN GESTE ILLÉGAL. Le moteur a décidé qu'il y avait faute (`irregularite`) ; on mesure ici ce qu'elle EST.
 *   - soulevé : il faut un plaqueur nettement plus fort ET plus lourd, pris bas, sur un porteur qui arrive vite — on ne
 *     retourne pas un pilier ;
 *   - charge : deux joueurs lancés, épaule en avant, sans les bras ;
 *   - sinon : plaquage haut, ou en retard.
 * La gravité se lit sur le danger réel — hauteur prise, maîtrise de la chute, violence — pas sur un tirage.
 */
export function lirePlaquageDangereux(
  porteur: Pion, defenseur: Pion, lecture: LecturePlaquage, enRetard: boolean,
): PlaquageDangereux {
  const fatigue = niveauFatigue(defenseur);
  const ascendant = (defenseur.puissance - porteur.puissance) / 10 + (poids(defenseur) - poids(porteur)) / 9;
  const impact = borner((lecture.fermeture - 3) / 7 + Math.max(0, ascendant) / 8, 0, 1);
  const technique = borner((defenseur.plaquage - 45) / 45, 0, 1);
  const souleve = !enRetard && lecture.angle !== 'dos' && ascendant >= 1.7 && allure(porteur) >= 3.5 && lecture.fermeture >= 4.5;
  if (souleve) {
    // Il l'a soulevé : tout dépend de la façon dont il le repose. Un plaqueur technique, frais, discipliné l'accompagne ;
    // un joueur épuisé, qui a mis tout son poids, le lâche.
    const maitrise = borner(0.25 + technique * 0.45 + defenseur.discipline / 250 - fatigue * 0.18 - impact * 0.25, 0, 1);
    const gravite = maitrise < 0.32 ? 3 : maitrise < 0.62 ? 2 : 1;
    return { type: 'souleve', souleve: true, maitrise, impact, gravite, motif: 'plaquage cathédrale' };
  }
  if (!enRetard && lecture.angle === 'face' && lecture.fermeture >= 6.2 && allure(defenseur) >= 2.8) {
    // Épaule en avant, sans les bras : la gravité suit la violence du choc.
    const gravite = impact >= 0.82 ? 3 : impact >= 0.5 ? 2 : 1;
    return { type: 'charge', souleve: false, maitrise: 1 - impact, impact, gravite, motif: 'charge dangereuse sans les bras' };
  }
  if (enRetard) {
    return { type: 'retard', souleve: false, maitrise: 1, impact, gravite: impact >= 0.7 ? 2 : 1, motif: 'plaquage en retard' };
  }
  // Monté trop haut : un contact appuyé à la tête vaut un carton, un bras qui glisse sur l'épaule une pénalité.
  const gravite = impact >= 0.85 && fatigue >= 1 ? 3 : impact >= 0.45 ? 2 : 1;
  return { type: 'haut', souleve: false, maitrise: 1 - impact * 0.6, impact, gravite, motif: 'plaquage haut' };
}

/**
 * LÀ OÙ LES GESTES DANGEREUX ARRIVENT. Le moteur tire l'irrégularité sur la fatigue, la tension et l'indiscipline du plaqueur ;
 * ce facteur dit que le CONTACT s'y prête : un défenseur bien plus fort et plus lourd, pris bas sur un porteur lancé (c'est là
 * qu'on soulève), ou deux joueurs lancés de face (c'est là qu'on charge à l'épaule). Ailleurs : 1.
 */
export function risqueDeGesteDangereux(porteur: Pion, defenseur: Pion, lecture: LecturePlaquage): number {
  const ascendant = (defenseur.puissance - porteur.puissance) / 10 + (poids(defenseur) - poids(porteur)) / 9;
  // Mesuré sur 144 matchs avec des facteurs 4 et 3 : un joueur soulevé tous les 48 matchs, une charge tous les 144 — on ne les
  // voyait jamais. À 7 et 6, ils restent des accidents (un match sur vingt-cinq à quarante), mais ils existent.
  if (lecture.angle !== 'dos' && ascendant >= 1.7 && allure(porteur) >= 3.5 && lecture.fermeture >= 4.5) return 7;
  if (lecture.angle === 'face' && lecture.fermeture >= 6.2 && allure(defenseur) >= 2.8) return 6;
  return 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// LE RUCK : GRATTAGES, DÉBLAYAGES, CONTRE-RUCKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les cinq grattages :
 *   rapide    le défenseur arrive seul sur le ballon et repart avec ;
 *   conteste  il pose les mains, les soutiens arrivent et tentent de le déloger — il tient ;
 *   penalite  il tient malgré le déblayage et le porteur ne lâche pas : l'arbitre siffle pour lui ;
 *   perdu     il tente, il est nettoyé par le soutien ;
 *   tardif    le ruck est déjà formé quand il arrive : il y met les mains quand même, et il est sanctionné.
 */
export type SequenceGrattage = 'rapide' | 'conteste' | 'penalite' | 'perdu' | 'tardif';
export const SEQUENCES_GRATTAGE: readonly SequenceGrattage[] = ['rapide', 'conteste', 'penalite', 'perdu', 'tardif'];

/** Durées d'une séquence après le contact (s) : prise d'appui et mains sur le ballon, lutte, conclusion. */
export const TEMPS_GRATTAGE: Record<SequenceGrattage, { appui: number; lutte: number; fin: number }> = {
  rapide: { appui: 0.5, lutte: 0.55, fin: 0.9 },
  conteste: { appui: 0.57, lutte: 1.35, fin: 1.0 },
  penalite: { appui: 0.57, lutte: 1.7, fin: 0.35 },
  perdu: { appui: 0.57, lutte: 0.8, fin: 1.2 },
  tardif: { appui: 0.5, lutte: 0.9, fin: 0.3 },
};

/**
 * Un grattage gagné : seul sur le ballon, ou disputé aux soutiens. « Seul » se lit AU PLAQUAGE — un porteur isolé, sans
 * soutien à moins de quatre mètres et demi : le défenseur est sur le ballon avant tout le monde. À l'instant où le ruck se
 * dénoue, les soutiens sont toujours arrivés (mesuré : un grattage « rapide » en 144 matchs avec ce seul critère).
 */
export function sequenceDuGrattageGagne(soutiensArrives: number, porteurIsole: boolean): SequenceGrattage {
  return porteurIsole || soutiensArrives === 0 ? 'rapide' : 'conteste';
}

export type VarianteDeblayage =
  | 'epaule-basse' | 'poussee-droite' | 'cote' | 'a-deux' | 'resiste' | 'repousse' | 'desequilibre' | 'accroche';
export const VARIANTES_DEBLAYAGE: readonly VarianteDeblayage[] = [
  'epaule-basse', 'poussee-droite', 'cote', 'a-deux', 'resiste', 'repousse', 'desequilibre', 'accroche',
];

export interface LectureDeblayage {
  variante: VarianteDeblayage;
  /** Ce que le nettoyeur impose à l'autre, en points : puissance, vitesse d'arrivée, poids, fatigue. */
  force: number;
  /** Le défenseur perd-il ses appuis ? */
  chute: boolean;
}

/**
 * LE DÉBLAYAGE. Puissance, vitesse d'arrivée, angle, poids et fatigue des deux hommes : le nettoyeur passe sous l'épaule,
 * pousse droit, arrive de travers, s'y met à deux — et en face on résiste, on recule, ou on perd l'équilibre.
 *
 * @param relative vitesse relative des deux joueurs au contact (m/s).
 * @param axe direction d'attaque du nettoyeur (±1, le long du terrain).
 * @param aDeux un autre nettoyeur est déjà sur le même homme.
 */
export function lireDeblayage(nettoyeur: Pion, cible: Pion, relative: number, axe: number, aDeux: boolean): LectureDeblayage {
  const fN = niveauFatigue(nettoyeur), fC = niveauFatigue(cible);
  const force = (nettoyeur.puissance - cible.puissance) / 10 + (poids(nettoyeur) - poids(cible)) / 12 + (relative - 2) / 1.4
    - fN * 0.45 + fC * 0.35 + (aDeux ? 1.1 : 0);
  const dx = (cible.pos.x - nettoyeur.pos.x) * axe, dy = Math.abs(cible.pos.y - nettoyeur.pos.y);
  const deTravers = dy > Math.max(0.25, dx) * 1.15;
  const chute = force >= 1.7 && relative >= 1.6;
  let variante: VarianteDeblayage;
  if (chute) variante = 'desequilibre';
  else if (aDeux) variante = 'a-deux';
  else if (force <= -0.9) variante = 'resiste';
  else if (deTravers) variante = 'cote';
  else if (force >= 0.8) variante = 'repousse';
  // Arrivé sans élan sur un homme déjà en appui : il l'agrippe et le tire hors de l'axe.
  else if (relative < 1.2) variante = 'accroche';
  else variante = relative >= 3 ? 'epaule-basse' : 'poussee-droite';
  return { variante, force, chute };
}

export type VarianteContreRuck = 'un' | 'deux' | 'collectif';
/** Un contre-ruck se nomme par ceux qui le mènent ; son issue (stoppé, ballon récupéré) est dans `ruck.duel.issue`. */
export function varianteContreRuck(contreurs: number): VarianteContreRuck {
  return contreurs <= 1 ? 'un' : contreurs === 2 ? 'deux' : 'collectif';
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSES, RÉCEPTIONS, JEU AU PIED
// ═══════════════════════════════════════════════════════════════════════════

export type StylePasse = 'classique' | 'vrillee' | 'courte' | 'avant-plaquage';
export const STYLES_PASSE: readonly StylePasse[] = ['classique', 'vrillee', 'courte', 'avant-plaquage'];

/**
 * La passe ordinaire, selon sa longueur et la pression. Les passes après contact gardent les variantes de `duels.ts`
 * (une main, deux mains, dos, sol, chistera) : ce sont déjà des lectures du plaquage subi.
 *
 * @param pression distance du défenseur le plus proche du passeur (m).
 */
export function choisirPasse(longueur: number, pression: number, fermeture: number): StylePasse {
  if (pression < 1.9 && fermeture > 1.5) return 'avant-plaquage';
  if (longueur >= 12.5) return 'vrillee';
  if (longueur <= 4.6) return 'courte';
  return 'classique';
}

export type StyleReception = 'poitrine' | 'bras-tendus' | 'haute' | 'derriere' | 'difficile' | 'jonglee' | 'course';
export const STYLES_RECEPTION: readonly StyleReception[] = ['poitrine', 'bras-tendus', 'haute', 'derriere', 'difficile', 'jonglee', 'course'];

/**
 * COMMENT LE BALLON ARRIVE. Derrière le receveur (la passe n'a pas suivi sa course), au-dessus de lui, loin devant ses
 * mains, dans la course — et, pour des mains moyennes sous pression ou fatiguées, un ballon qui danse avant d'être maîtrisé.
 *
 * @param retard mètres dont le ballon arrive DERRIÈRE la course du receveur (négatif : devant lui).
 * @param hauteur sommet de la trajectoire (m). @param pression distance du défenseur le plus proche du receveur (m).
 */
export function choisirReception(
  receveur: Pion, longueur: number, retard: number, hauteur: number, pression: number, stylePasse: StylePasse | undefined,
): StyleReception {
  const v = allure(receveur), fatigue = niveauFatigue(receveur);
  if (retard >= 0.85) return 'derriere';
  // Une passe en cloche (son sommet dépasse de 85 cm la ligne des mains) se prend au-dessus de la tête.
  if (hauteur >= 0.85) return 'haute';
  // Des mains ordinaires et un défenseur dessus, ou les jambes lourdes : le ballon n'est assuré qu'au deuxième temps.
  if (receveur.passe < 74 && (pression < 2.6 || fatigue === 2) && longueur > 4) return 'jonglee';
  if (stylePasse === 'avant-plaquage' || pression < 2) return 'difficile';
  if (retard <= -0.9 || longueur >= 12.5) return 'bras-tendus';
  if (v >= 5.6) return 'course';
  return 'poitrine';
}

export type StyleFrappe = 'pose' | 'presse' | 'en-course';
/** Le coup de pied dans le jeu : posé, tapé en pleine course, ou arraché sous la pression d'un défenseur qui arrive. */
export function choisirFrappe(botteur: Pion, pression: number): StyleFrappe {
  if (pression < 3.2) return 'presse';
  return allure(botteur) >= 4.5 ? 'en-course' : 'pose';
}

// ═══════════════════════════════════════════════════════════════════════════
// LES ESSAIS ET CE QUI LES SUIT
// ═══════════════════════════════════════════════════════════════════════════

export type StyleEssai = 'plongeon' | 'puissance' | 'glissade' | 'calme' | 'coin' | 'poteaux' | 'melee' | 'maul' | 'interception';
export const STYLES_ESSAI: readonly StyleEssai[] = ['plongeon', 'puissance', 'glissade', 'calme', 'coin', 'poteaux', 'melee', 'maul', 'interception'];

/**
 * @param defenseur distance du défenseur valide le plus proche à l'instant d'aplatir (m ; Infinity s'il n'y en a pas).
 * @param origine d'où vient l'essai : jeu courant, ballon porté, poussée de mêlée, ballon intercepté.
 */
export function choisirEssai(
  marqueur: Pion, defenseur: number, origine: 'jeu' | 'maul' | 'melee' | 'interception',
): StyleEssai {
  if (origine === 'maul') return 'maul';
  if (origine === 'melee') return 'melee';
  const v = allure(marqueur), profil = profilAnimation(marqueur);
  const auBord = marqueur.pos.y < 6.5 || marqueur.pos.y > LARGEUR - 6.5;
  if (defenseur < 2.4) {
    // Défenseur sur lui : en coin on plonge vers le poteau de touche, un avant passe en force, les autres plongent.
    if (auBord) return 'coin';
    return profil === 'lourd' || profil === 'troisieme' || (profil === 'centre' && v < 4.5) ? 'puissance' : 'plongeon';
  }
  if (origine === 'interception' && defenseur > 6) return 'interception';
  // Poursuivi de près à pleine vitesse : il se laisse glisser dans l'en-but.
  if (defenseur < 4.5 && v >= 5.5) return 'glissade';
  // Seul : sous les poteaux il pose ; lancé le long de la touche il plonge en coin ; un ailier ou un arrière à pleine vitesse
  // s'offre le plongeon ; les autres aplatissent sans se presser.
  if (defenseur >= 7 && Math.abs(marqueur.pos.y - AXE) < 7) return 'poteaux';
  if (auBord && v >= 5) return 'coin';
  return v >= 6.4 && profil === 'arriere' ? 'plongeon' : 'calme';
}

export type StyleCelebration = 'sobre' | 'accolade' | 'ballon-leve' | 'collective' | 'decisive';
export const STYLES_CELEBRATION: readonly StyleCelebration[] = ['sobre', 'accolade', 'ballon-leve', 'collective', 'decisive'];

/**
 * LA FÊTE DÉPEND DU MATCH. Un essai qui fait passer devant dans le dernier quart d'heure soulève toute l'équipe ; celui qui
 * ramène à vingt points ne se fête pas.
 *
 * @param ecartApres score du marqueur moins score adverse, essai compté. @param minute minute de jeu (0-80+).
 * @param essaisDuMarqueur essais déjà marqués par ce joueur dans le match, celui-ci compris.
 */
export function choisirCelebration(ecartApres: number, minute: number, essaisDuMarqueur: number, profil: ProfilAnimation): StyleCelebration {
  if (ecartApres <= -13) return 'sobre';
  const avant = ecartApres - 5;
  // Il fait basculer le match (on passe devant, ou à portée d'une transformation) dans les vingt dernières minutes.
  if (minute >= 60 && avant <= 0 && ecartApres >= -2) return 'decisive';
  if (ecartApres >= 25) return 'accolade';
  if (essaisDuMarqueur >= 2 || profil === 'arriere') return 'ballon-leve';
  return profil === 'lourd' || profil === 'troisieme' ? 'collective' : 'accolade';
}

/** Combien de coéquipiers viennent : de un seul à toute l'équipe. */
export const FETEURS: Record<StyleCelebration, number> = { sobre: 1, accolade: 2, 'ballon-leve': 3, collective: 6, decisive: 12 };

// ═══════════════════════════════════════════════════════════════════════════
// LES ALTERCATIONS — rares, brèves, non graphiques
// ═══════════════════════════════════════════════════════════════════════════

export type CauseAltercation = 'gros-plaquage' | 'geste-dangereux' | 'provocation' | 'fautes-repetees' | 'match-tendu';
/** 1 : on se pousse et on se parle ; 2 : on se saisit par les maillots ; 3 : regroupement général, les arbitres séparent. */
export type NiveauAltercation = 1 | 2 | 3;
export type SanctionAltercation = 'rappel' | 'penalite' | 'jaune' | 'rouge';

/**
 * L'ENVIE D'EN DÉCOUDRE, de 0 à 1 — ce n'est pas une probabilité tirée ici, c'est une mesure : le moteur la compare à un
 * seuil propre au match (voir `seuilAltercation`). Il faut de la tension ET une cause ; un match calme n'en produit aucune.
 */
export function envieDAltercation(
  tension: number, cause: CauseAltercation, gravite: number, fautesRecentes: number, disciplineVictime: number,
): number {
  const base: Record<CauseAltercation, number> = {
    'geste-dangereux': 0.46, 'gros-plaquage': 0.26, provocation: 0.3, 'fautes-repetees': 0.2, 'match-tendu': 0.08,
  };
  // ⚠️ MESURÉ, pas supposé (`npm run mesure:animations`) : un match d'IA reste froid (température 0 à 11), un match où le joueur
  // chambre monte à 50 et plus. Réglé pour une altercation tous les cinq ou six matchs ordinaires — presque toujours après un
  // plaquage haut ou dangereux — et une tous les deux matchs quand la température ne redescend pas.
  return borner(
    base[cause] + tension / 180 + (gravite - 1) * 0.16 + Math.min(4, fautesRecentes) * 0.05 + (60 - disciplineVictime) / 220,
    0, 1,
  );
}

/**
 * Jusqu'où ça monte : la gravité de ce qui l'a déclenchée, la température du match et le nombre de joueurs autour. Un geste
 * sans gravité dans un match calme reste une explication entre deux hommes ; le regroupement général demande un match déjà
 * très chaud, un geste qui valait un carton, et du monde à proximité.
 */
export function niveauAltercation(gravite: number, tension: number, prochesParCamp: number): NiveauAltercation {
  if (tension >= 55 && gravite >= 2 && prochesParCamp >= 4) return 3;
  // Un carton dans un match froid ne fait venir personne : il faut que la température ait déjà monté.
  if (((gravite >= 2 && tension >= 22) || tension >= 40) && prochesParCamp >= 2) return 2;
  return 1;
}

/**
 * CE QUE L'ARBITRE EN FAIT. Il sanctionne celui qui a DÉCLENCHÉ l'incident (celui qui est venu chercher l'autre), d'après ce
 * qu'il a fait : se pousser vaut un rappel, saisir un adversaire une pénalité, et dans un regroupement général celui qui a
 * allumé la mèche prend dix minutes — un rouge s'il avait déjà été averti ou si le geste d'origine l'était déjà.
 */
export function sanctionAltercation(niveau: NiveauAltercation, vu: boolean, dejaAverti: boolean, graviteOrigine: number): SanctionAltercation {
  if (!vu || niveau === 1) return 'rappel';
  if (niveau === 2) return dejaAverti ? 'jaune' : 'penalite';
  return dejaAverti && graviteOrigine >= 2 ? 'rouge' : 'jaune';
}

/** Durée d'écran d'une altercation, de la première poussée au retour au calme (s). */
export const DUREE_ALTERCATION: Record<NiveauAltercation, number> = { 1: 3.2, 2: 5.2, 3: 7.5 };

// ═══════════════════════════════════════════════════════════════════════════
// LES GESTES DE L'ARBITRE
// ═══════════════════════════════════════════════════════════════════════════

export type SignalArbitre =
  | 'penalite' | 'plaquage-haut' | 'ballon-garde' | 'pas-roule' | 'tenu' | 'ecroulement' | 'hors-appuis' | 'hors-jeu'
  | 'en-avant' | 'passe-en-avant' | 'melee' | 'maul-injouable' | 'touche' | 'essai' | 'renvoi' | 'tmo'
  | 'carton-jaune' | 'carton-rouge' | 'rappel' | 'separation';
export const SIGNAUX_ARBITRE: readonly SignalArbitre[] = [
  'penalite', 'plaquage-haut', 'ballon-garde', 'pas-roule', 'tenu', 'ecroulement', 'hors-appuis', 'hors-jeu', 'en-avant',
  'passe-en-avant', 'melee', 'maul-injouable', 'touche', 'essai', 'renvoi', 'tmo', 'carton-jaune', 'carton-rouge', 'rappel', 'separation',
];

/** Le signal qui dit POURQUOI il a sifflé la pénalité, d'après son motif. */
export function signalDeLaFaute(motif: string): SignalArbitre {
  const m = motif.toLowerCase();
  if (/hors-jeu|entrée par le côté/.test(m)) return 'hors-jeu';
  if (/haut|tête|cathédrale|charge|en retard|sans ballon|dangereu|brutalité|coup de/.test(m)) return 'plaquage-haut';
  if (/ballon gardé/.test(m)) return 'ballon-garde';
  if (/ne se relève pas/.test(m)) return 'pas-roule';
  if (/plonge au ruck|mains dans le ruck/.test(m)) return 'hors-appuis';
  if (/écroul|liaison perdue/.test(m)) return 'ecroulement';
  if (/obstruction|tenu|retenu/.test(m)) return 'tenu';
  return 'penalite';
}

/**
 * LE GESTE CORRESPOND À LA DÉCISION. Lu sur l'état que tout écran possède (phase, sifflet, motif de la pénalité,
 * altercation en cours) : la scène d'un match de carrière et celle d'un direct en ligne montrent le même bras.
 * ⚠️ Pas de geste « avantage » : le moteur ne joue pas la règle de l'avantage, l'arbitre ne l'annonce donc jamais.
 */
export function signalArbitre(e: {
  phase: EtatMatch['phase']; sim: number;
  sifflet?: { cle: string; avertissement?: string } | null; penalite?: { motif: string } | null; tmo?: unknown;
  altercation?: { fin: number } | null; indicationJeu?: { cle: string; t: number } | null;
}): SignalArbitre | null {
  const cle = e.sifflet?.cle ?? '';
  if (e.altercation && e.sim < e.altercation.fin) return 'separation';
  if (e.phase === 'tmo' || e.tmo) return 'tmo';
  if (/cartonRouge/.test(cle)) return 'carton-rouge';
  if (/cartonJaune/.test(cle)) return 'carton-jaune';
  if (e.sifflet?.avertissement) return 'rappel';
  if (/passeAvant/.test(cle)) return 'passe-en-avant';
  if (/enAvant/.test(cle)) return 'en-avant';
  if (e.phase === 'penalite' || /penalite/.test(cle)) return signalDeLaFaute(e.penalite?.motif ?? '');
  if (e.phase === 'aplatissage' || e.phase === 'apresEssai') return 'essai';
  // Un maul arrêté net se rejoue en mêlée : l'arbitre l'annonce avant de la faire former.
  if (e.phase === 'melee') return e.indicationJeu?.cle === 'melee' && e.sim - e.indicationJeu.t < 3 ? 'maul-injouable' : 'melee';
  if (e.phase === 'touche') return 'touche';
  if (e.phase === 'renvoi22') return 'renvoi';
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// LES BANQUES — ce qu'un match a besoin de charger
// ═══════════════════════════════════════════════════════════════════════════

export type BanqueAnimations = 'common' | 'contact' | 'ruck' | 'lineout' | 'scrum' | 'backs' | 'forwards' | 'fouls' | 'celebrations';
export const BANQUES: readonly BanqueAnimations[] = ['common', 'contact', 'ruck', 'lineout', 'scrum', 'backs', 'forwards', 'fouls', 'celebrations'];

/**
 * La banque dont la phase en cours a besoin, en plus de `common`. La scène s'en sert pour charger à la demande ce qu'elle
 * n'a pas encore reçu — un écran qui rejoint un direct en pleine mêlée demande d'abord la banque des mêlées.
 */
export function banqueDeLaPhase(phase: EtatMatch['phase']): BanqueAnimations | null {
  switch (phase) {
    case 'ruck': return 'ruck';
    case 'maul': return 'forwards';
    case 'melee': return 'scrum';
    case 'touche': return 'lineout';
    case 'penalite': return 'fouls';
    case 'aplatissage': case 'apresEssai': case 'tmo': case 'transformation': return 'celebrations';
    case 'ballonEnLAir': case 'coupEnvoi': case 'renvoi22': return 'backs';
    case 'jeuCourant': case 'ballonLibre': return 'contact';
    default: return null;
  }
}
