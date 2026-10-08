// LE FILM DU DIRECT — ce que le serveur raconte d'un match, et comment l'écran le rejoue.
//
// ═══ POURQUOI UN FILM ET PLUS UNE PHOTO ═════════════════════════════════════
//
// Le direct recevait une photo du terrain toutes les deux secondes et inventait
// le reste : trente trajectoires tirées entre deux positions, un plaquage placé
// « quelque part » entre les deux, un porteur deviné. C'est de là que venaient
// les retours en arrière (l'écran prolongeait une course, puis la photo suivante
// le contredisait), les plaquages à distance et les phases qui démarraient avant
// que les joueurs n'y soient.
//
// Le serveur raconte maintenant LES PAS DU MOTEUR eux-mêmes — un toutes les
// 0,15 s — depuis le dernier que l'écran connaît. L'écran ne devine plus rien :
// il rejoue, avec un peu de retard, exactement ce qui s'est joué. Animations,
// orientation, interpolation entre deux pas, caméra, son : tout cela reste
// calculé côté client, à partir d'un état qui a la forme de celui du moteur.
//
// ═══ LA CHRONOLOGIE (Correctif 24) ══════════════════════════════════════════
//
// ⚠️ 1 MATCH = 1 LIGNE DE TEMPS = N SPECTATEURS. Ce que la caméra filme est
// DÉFINITIF : le moteur ne joue que ce que plus aucun ordre ne peut changer
// (`MARGE_AUTORITE`, dans `matchCarriere.ts`). Deux instances du serveur filment
// donc le même pas, au chiffre près, et un écran peut passer de l'une à l'autre
// d'un sondage au suivant sans rien remarquer.
//
// Le format `ChronoDirect` (v2) remplace les différences pas à pas (v1) :
//   · LES ÉVÉNEMENTS de jeu sont nommés et numérotés depuis le coup d'envoi —
//     passe, plaquage, ruck, touche, mêlée, pénalité, essai… L'écran les reçoit
//     avec quelques secondes d'avance sur ce qu'il montre (son tampon) : il
//     sait donc ce qui vient et peut le préparer.
//   · LES DÉPLACEMENTS ne voyagent plus pas à pas. Le serveur n'envoie d'un
//     joueur que les points où sa course change (une courbe passe par eux à
//     quelques centimètres près) ; l'écran reconstruit les pas intermédiaires.
//     Un joueur immobile ne coûte rien, une course droite deux nombres.
//   · UNE SOMME DE CONTRÔLE accompagne le dernier pas connu de l'écran. Si elle
//     ne correspond pas à celle du serveur, l'écran se raccorde — en douceur,
//     et de préférence sur un regroupement — au lieu de dériver.
//
// ═══ CE QUE ÇA COÛTE ════════════════════════════════════════════════════════
//
// Rien en base : un pas n'est jamais écrit, il sort de la rejoue en mémoire
// (`matchCarriere.ts`). Mesures : `npm run mesure:conso-direct`.
//
// ⚠️ LE CLIENT NE REÇOIT TOUJOURS NI LA GRAINE NI LE PLAN ADVERSE. Il ne peut
// rejouer que le passé que le serveur lui a donné, jamais calculer la suite.

import type { EtatMatch, Phase } from '../moteur/etat.js';
import type { Pion, Role } from '../moteur/entites.js';
import { corpsPourAffichage, type GesteMatch } from '../moteur/dynamique.js';
import { apparenceJoueurMatch, type ApparenceMatch } from '../moteur/apparenceMatch.js';
import type { Cote, Vec } from '../moteur/terrain.js';
import type { PosteId } from '../../types.js';
import { exclusionsDepuisEtat } from '../habillageTV.js';

/** Le pas de simulation du moteur (`DT`), en secondes. */
export const PAS_FILM = 0.15;
/**
 * Ce que la caméra garde en mémoire : seize secondes de match. Un écran qui
 * sonde toutes les trois secondes, même avec une réponse perdue, y retrouve
 * toujours son dernier pas.
 */
const PHOTOS_MAX = 110;
/**
 * La traîne gardée quand PERSONNE ne regarde ce match sur cette instance : cinq secondes. Un écran qui y arrive (il sondait
 * une autre instance l'instant d'avant) y retrouve son dernier pas — sans elle, il fallait rejouer le match du coup d'envoi
 * pour le lui refaire (six secondes de calcul en fin de rencontre), ou le faire sauter par-dessus le trou.
 */
const PHOTOS_VEILLE = 34;
/** Une image complète est servie avec ce recul, pour que l'écran ait de quoi jouer tout de suite. */
const RECUL_CLE = 24;

export type Json = null | boolean | number | string | Json[] | { [cle: string]: Json };
type Objet = { [cle: string]: Json };

/** Ce qui ne change pas pendant le match : envoyé avec l'image complète seulement. */
export interface FeuilleFilm {
  id: string; cote: Cote; nom: string; vitesseMax: number; puissance: number;
  tailleCm?: number; poidsKg?: number;
}
export type GesteFilm = Omit<GesteMatch, 'id'>;

/** Un pas du moteur, tel que la caméra le garde. */
interface PhotoFilm {
  n: number;
  /** Les pions présents sur la pelouse, dans l'ordre du moteur. */
  sur: string[];
  /**
   * Des entiers : horloge et minuteur (centièmes de seconde), ballon x, y et
   * hauteur (cm), arbitre x, y (cm) et regard (centièmes de radian), puis x, y
   * (cm) de chaque pion de `sur`.
   */
  q: number[];
  /** Tout le reste de l'état visible. */
  d: Objet;
  g: GesteMatch[];
}

export interface PasFilm {
  /** Les entiers du pas : différence avec le pas précédent, ou valeurs entières si `a`. */
  q: number[];
  a?: 1;
  sur?: string[];
  /** Ce qui a changé dans l'état. `null` : le champ a disparu. */
  d?: Objet;
  /** Les gestes nés à ce pas. */
  g?: GesteFilm[];
}

/** Le film d'avant la chronologie (v1) : gardé pour les écrans restés ouverts pendant une mise en ligne. */
export interface FilmDirect {
  v: 1;
  /** Image complète : l'écran repart d'elle (premier chargement, ou suite impossible à raccorder). */
  cle?: ImageCle;
  /** Numéro du premier pas de `pas`. */
  de: number;
  pas: PasFilm[];
}
interface ImageCle { n: number; feuille: FeuilleFilm[]; sur: string[]; q: number[]; d: Objet; g: GesteFilm[] }

// ── La chronologie (v2) ─────────────────────────────────────────────────────

/** Les événements de jeu que la chronologie nomme. */
export type TypeEvenement =
  | 'passe' | 'pied' | 'reception' | 'ballonLibre' | 'plaquage' | 'ruck' | 'sortieRuck'
  | 'melee' | 'touche' | 'finConquete' | 'maul' | 'penalite' | 'essai' | 'points'
  | 'tir' | 'tirJoue' | 'carton' | 'retour' | 'remplacement' | 'sifflet' | 'miTemps' | 'fin';
/**
 * Un événement sur le fil : numéro depuis le coup d'envoi, pas du moteur, type,
 * résultat (0 : sans objet), puis les joueurs concernés (leur rang dans la feuille).
 */
export type EvenementBrut = [id: number, pas: number, type: TypeEvenement, resultat?: string | 0, joueurs?: number[]];
/** Le même, tel que l'écran le lit. */
export interface EvenementChrono {
  id: number;
  /** Pas du moteur où il se produit. */
  pas: number;
  type: TypeEvenement;
  resultat?: string;
  /** Identifiants des pions concernés, dans l'ordre (auteur → receveur, plaqueur → plaqué). */
  joueurs: string[];
  /** Un regroupement ou un arrêt : le bon endroit pour se raccorder sans que rien ne saute. */
  repere: boolean;
}
/** Les moments où trente joueurs convergent ou s'arrêtent : un raccord y passe inaperçu. */
const REPERES = new Set<TypeEvenement>(['ruck', 'melee', 'touche', 'maul', 'penalite', 'essai', 'sifflet', 'miTemps', 'fin', 'tir']);

/** Un tronçon de chronologie où les mêmes joueurs sont sur la pelouse. */
export interface SegmentChrono {
  /** Pas de base (connu de l'écran, ou donné ici par `q`) et nombre de pas qui le suivent. */
  b: number; n: number;
  /** Les joueurs sur la pelouse ont changé : le pas `b` est donné entier. */
  sur?: string[]; q?: number[];
  /**
   * Les pistes : pour chaque entier du pas, les seuls points où sa course
   * change — `[Δpas, Δvaleur, …]` depuis la base. `0` : il ne bouge pas.
   */
  p: (number[] | 0)[];
  /** L'état qui change : `[pas relatif, différence, …]` (0 : le pas `b` lui-même). */
  d?: (number | Objet)[];
  /** Les gestes nés : `[pas relatif, [joueur, clip, début, durée, variante?], …]`. */
  g?: (number | GesteCompact)[];
}
/** Un geste sur le fil : les noms de champs ne voyagent pas. */
export type GesteCompact = [joueurId: string, clip: string, debut: number, duree: number, variante?: string];

export interface ChronoDirect {
  v: 2;
  /** Image complète : premier envoi, ou suite impossible à raccorder. */
  cle?: ImageCle;
  /**
   * L'écran ne tient pas la même ligne de temps que le serveur (sa somme de
   * contrôle diffère) : il doit se raccorder, pas sauter.
   */
  rupture?: 1;
  s: SegmentChrono[];
  /** Les événements des pas envoyés. */
  ev?: EvenementBrut[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. LA CAMÉRA (serveur) — elle photographie chaque pas du moteur
// ═══════════════════════════════════════════════════════════════════════════

const SCALAIRES = [
  'phase', 'possession', 'dureeArret', 'fini', 'scoreA', 'scoreB', 'essaisA', 'essaisB', 'systeme',
  'phasesDepuisArret', 'ligneAvantage', 'metresGagnesPhase', 'ballonLent', 'ouvert', 'periode', 'sirene', 'placementJoue',
  // Le vent (trois nombres fixés au coup d'envoi) et le changement de côté : l'écran en déduit tout le reste.
  'ventDirection', 'ventForce', 'ventGraine', 'cotesInverses',
  'prolongation',
  // Correctif 30 : le niveau du moteur — la scène y lit si le jeu physique (postures, bibliothèque d'animations) est celui de ce match.
  'ia',
] as const;
/**
 * ⚠️ LES OBJETS DONT L'IDENTITÉ COMPTE. L'affichage reconnaît un nouveau ruck,
 * une nouvelle passe ou un nouveau coup de sifflet à ce que l'OBJET a changé,
 * pas à son contenu. Chacun porte donc une marque de génération (`#`) : tant
 * qu'elle ne bouge pas, l'écran garde son objet et le met à jour ; dès qu'elle
 * change, il en crée un neuf.
 */
const IDENTITES = [
  'vol', 'ruck', 'conquete', 'tir', 'aplatissage', 'sifflet', 'grosImpact', 'maul', 'penalite',
  'piedPrepare', 'echappee', 'tmo', 'dernierReplayEssai', 'indicationJeu',
  // Correctif 30 (règles 7) : l'altercation en cours — qui pousse qui, à quel niveau, jusqu'à quand. Le reste du jeu physique
  // (variante de plaquage, séquence de grattage, combinaison de touche, style d'essai) voyage DANS `ruck`, `conquete`, `tir`
  // et `aplatissage`, et dans la variante des gestes : rien d'autre à transporter.
  'altercation',
] as const;
/** Ceux dont le décompte (`restant`) part en date de fin : une valeur fixe ne se renvoie pas à chaque pas. */
const A_ECHEANCE = new Set<string>(['sifflet', 'grosImpact', 'echappee', 'tmo', 'dernierReplayEssai']);

const r2 = (n: number): number => Math.round(n * 100) / 100;
const r3 = (n: number): number => Math.round(n * 1000) / 1000;
const cm = (n: number): number => Math.round(n * 100);
const estPion = (v: object): v is Pion => typeof (v as Pion).id === 'string' && 'pos' in v && 'stats' in v;

/** Ce que la caméra a vu au pas précédent : de quoi reconnaître un événement à ce qui a changé. */
interface Vu {
  vol: object | null; ruck: object | null; conquete: object | null; maul: object | null; penalite: object | null;
  sifflet: object | null; tir: object | null; tirJoue: boolean; libre: object | null;
  phase: Phase | ''; essaisA: number; essaisB: number; scoreA: number; scoreB: number; periode: number; fini: boolean;
  exclus: Set<string>; remplaces: number;
}

interface Camera {
  /**
   * Quelqu'un regarde ce match. ⚠️ ON NE FILME QUE CE QUI EST REGARDÉ : gardées
   * pour les quatre cents matchs qu'un serveur chaud peut tenir, seize secondes
   * de photos sortaient les moteurs du cache (banc `verify:scale-direct`). La
   * caméra s'allume à la première demande et s'éteint quand plus personne ne
   * demande la suite.
   */
  active: boolean;
  /** Avances du moteur depuis la dernière demande de film. */
  sansDemande: number;
  photos: PhotoFilm[];
  /** On ne photographie qu'à partir de cette seconde SIMULÉE (les rejoues à froid ne filment que la fin). */
  seuil: number;
  generations: WeakMap<object, number>;
  feuille?: FeuilleFilm[];
  /**
   * Les événements, numérotés depuis le coup d'envoi. ⚠️ ILS SONT OBSERVÉS MÊME
   * QUAND LA CAMÉRA NE FILME PAS : une instance qui rejoue le match à froid doit
   * donner à la passe de la 54ᵉ minute le même numéro que les autres.
   */
  evenements: EvenementBrut[];
  prochainId: number;
  vu: Vu;
  rangs?: Map<string, number>;
  /** La date de fin déjà annoncée de chaque objet à échéance (sifflet, bandeau…). */
  echeances: Map<string, { g: number; fin: number }>;
}
const CAMERAS = new WeakMap<EtatMatch, Camera>();
const EVENEMENTS_MAX = 260;

function serialiser(v: unknown, profondeur = 0): Json | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? r3(v) : undefined;
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v !== 'object' || profondeur > 6) return undefined;
  if (Array.isArray(v)) return v.map((x) => serialiser(x, profondeur + 1) ?? null);
  if (estPion(v)) return { $: v.id };
  const o: Objet = {};
  for (const k in v) {
    const s = serialiser((v as Record<string, unknown>)[k], profondeur + 1);
    if (s !== undefined) o[k] = s;
  }
  return o;
}

function photographier(e: EtatMatch, camera: Camera): PhotoFilm {
  const n = Math.round(e.sim / PAS_FILM);
  const marque = (objet: object): number => {
    let g = camera.generations.get(objet);
    if (g === undefined) { g = n; camera.generations.set(objet, g); }
    return g;
  };
  const d: Objet = {};
  for (const cle of SCALAIRES) {
    const v = e[cle];
    if (v !== undefined && v !== null) d[cle] = typeof v === 'number' ? r3(v) : v as Json;
  }
  for (const cle of IDENTITES) {
    const source = (e as unknown as Record<string, unknown>)[cle];
    if (!source || typeof source !== 'object') continue;
    const o = serialiser(source) as Objet;
    o['#'] = marque(source);
    if (A_ECHEANCE.has(cle) && typeof o.restant === 'number') {
      // ⚠️ UNE ÉCHÉANCE QUI GLISSE NE SE RENVOIE PAS À CHAQUE PAS. Pendant qu'un
      // entraîneur choisit, le temps simulé avance et le décompte du sifflet
      // reste figé : sa date de fin reculait de 0,15 s à chaque image. On garde
      // celle déjà annoncée tant qu'elle reste juste à une demi-seconde près.
      let fin = r3(e.sim + o.restant);
      const annoncee = camera.echeances.get(cle);
      if (annoncee && annoncee.g === o['#'] && Math.abs(annoncee.fin - fin) < 0.5) fin = annoncee.fin;
      else camera.echeances.set(cle, { g: o['#'] as number, fin });
      o.fin = fin; delete o.restant;
    }
    if (cle === 'vol') { o.depart = r3(e.sim - e.vol!.ecoule); delete o.ecoule; }
    if (cle === 'conquete') {
      // La progression se relit sur le minuteur ; la mêlée détaillée garde sa propre identité.
      delete o.progression;
      if (e.conquete!.melee && o.melee) (o.melee as Objet)['#'] = marque(e.conquete!.melee);
    }
    d[cle] = o;
  }
  if (e.porteur) d.porteur = { $: e.porteur.id };
  if (e.origine) d.origine = { x: r2(e.origine.x), y: r2(e.origine.y) };
  if (e.cellule) d.cellule = serialiser(e.cellule) as Json;
  if (e.ballonLibre) {
    const b = e.ballonLibre;
    d.ballonLibre = {
      '#': marque(b), orientation: r2(b.orientation ?? 0), vitesseRotation: r2(b.vitesseRotation ?? 0),
      dernierRebondSim: r3(b.dernierRebondSim ?? -10), rebonds: b.rebonds, intention: b.intention,
    };
  }
  if (e.lancement) {
    d.lancement = { type: e.lancement.type, libelle: e.lancement.libelle };
    if (e.lancement.intention) (d.lancement as Objet).intention = e.lancement.intention;
    if (e.lancement.structure) (d.lancement as Objet).structure = e.lancement.structure;
  }
  if (e.combinaisonEnCours) d.combinaisonEnCours = true;
  if (e.discipline?.jaunes || e.discipline?.rouges) d.discipline = { jaunes: e.discipline.jaunes, rouges: e.discipline.rouges };

  const pions: Objet = {};
  const sur: string[] = [];
  const q: number[] = [
    cm(e.t), cm(e.minuteur), cm(e.ballon.x), cm(e.ballon.y), cm(e.ballonLibre?.hauteur ?? 0),
    cm(e.arbitre?.pos.x ?? 0), cm(e.arbitre?.pos.y ?? 0), cm(e.arbitre?.regard ?? 0),
  ];
  for (const p of e.pions) {
    const j: Objet = { role: p.role, numero: p.numero, poste: p.poste };
    if (p.numeroMaillot !== undefined) j.numeroMaillot = p.numeroMaillot;
    // Ce que la fatigue fait à ses gestes (0, 1, 2) : il ne change que quelques fois par match, la différence ne coûte rien.
    if (p.fatigue) j.f = p.fatigue;
    if (p.surLeTerrain) { j.t = 1; sur.push(p.id); q.push(cm(p.pos.x), cm(p.pos.y)); }
    if (p.sanction > 0) j.s = p.sanction > 3600 ? 2 : 1;
    if (p.remplace) j.remplace = true;
    if ((p as Pion & { blessure?: unknown; blesse?: unknown }).blessure || (p as Pion & { blesse?: unknown }).blesse) j.blesse = true;
    if (p.corps) {
      const c = corpsPourAffichage(p)!;
      j.corps = { debut: r3(e.sim - c.age), duree: r3(c.duree), direction: r2(c.direction), intensite: r2(c.intensite), appuis: c.appuis, bras: c.bras };
    }
    // La place visée ne sert à l'écran que pour lier les soutiens d'un regroupement.
    if (p.surLeTerrain && (p.role === 'ruck' || p.role === 'maul')) j.cible = { x: r2(p.cible.x), y: r2(p.cible.y) };
    pions[p.id] = j;
  }
  d.pions = pions;
  // Échéances absolues stables : pas de compteur à retransmettre à chaque image.
  d.exclusionsTV = exclusionsDepuisEtat(e).map(p => ({
    id: p.id, nom: p.nom, numero: p.numero, poste: p.poste, cote: p.cote, type: p.type,
    ...(p.retour !== undefined ? { retour: p.retour } : {}),
    ...(p.motif ? { motif: p.motif } : {}),
  }));
  return { n, sur, q, d, g: e.gestes ?? SANS_GESTE };
}
const SANS_GESTE: GesteMatch[] = [];

/**
 * Ce qui vient de se passer, lu à ce qui a CHANGÉ depuis le pas précédent.
 *
 * ⚠️ ELLE NE FAIT QU'OBSERVER, ET ELLE EST BON MARCHÉ : une douzaine de
 * comparaisons d'identité par pas, sans rien sérialiser. C'est ce qui permet de
 * la laisser tourner pendant toute une rejoue à froid.
 */
function observer(m: EtatMatch, c: Camera): void {
  const v = c.vu, n = Math.round(m.sim / PAS_FILM);
  const rang = (p: Pion | string | null | undefined): number => {
    if (!p) return -1;
    c.rangs ??= new Map(m.pions.map((x, i) => [x.id, i]));
    return c.rangs.get(typeof p === 'string' ? p : p.id) ?? -1;
  };
  const noter = (type: TypeEvenement, resultat?: string | 0, ...joueurs: number[]): void => {
    const qui = joueurs.filter((i) => i >= 0);
    const ev: EvenementBrut = qui.length ? [c.prochainId, n, type, resultat ?? 0, qui] : resultat ? [c.prochainId, n, type, resultat] : [c.prochainId, n, type];
    c.prochainId += 1;
    c.evenements.push(ev);
    if (c.evenements.length > EVENEMENTS_MAX) c.evenements.splice(0, c.evenements.length - EVENEMENTS_MAX);
  };

  const vol = m.vol ?? null;
  if (vol !== v.vol) {
    if (vol) noter(vol.type === 'passe' ? 'passe' : 'pied', vol.intention === 'passe' ? 0 : vol.intention, rang(vol.auteur), rang(vol.receveur));
    else if (m.porteur) noter('reception', 0, rang(m.porteur));
    v.vol = vol;
  }
  const libre = m.ballonLibre ?? null;
  if (libre !== v.libre) { if (libre) noter('ballonLibre'); v.libre = libre; }
  const ruck = m.ruck ?? null;
  if (ruck !== v.ruck) {
    if (ruck?.plaqueurId) noter('plaquage', ruck.plaquage?.type ?? 0, rang(ruck.plaqueurId), rang(ruck.porteurId));
    v.ruck = ruck;
  }
  if (m.phase !== v.phase) {
    if (m.phase === 'ruck') noter('ruck', m.possession);
    else if (v.phase === 'ruck' && m.porteur) noter('sortieRuck', m.possession, rang(m.porteur));
    else if ((v.phase === 'melee' || v.phase === 'touche') && m.phase !== 'melee' && m.phase !== 'touche') noter('finConquete', m.possession, rang(m.porteur));
    v.phase = m.phase;
  }
  const conquete = m.conquete ?? null;
  if (conquete !== v.conquete) { if (conquete) noter(conquete.type, m.possession); v.conquete = conquete; }
  const maul = (m.maul as object | null | undefined) ?? null;
  if (maul !== v.maul) { if (maul) noter('maul', m.possession); v.maul = maul; }
  const penalite = m.penalite ?? null;
  if (penalite !== v.penalite) { if (penalite) noter('penalite', penalite.pour); v.penalite = penalite; }
  if (m.essaisA !== v.essaisA || m.essaisB !== v.essaisB) {
    noter('essai', m.essaisA !== v.essaisA ? 'A' : 'B', rang(m.aplatissage?.marqueur));
  } else if (m.scoreA !== v.scoreA || m.scoreB !== v.scoreB) {
    noter('points', m.scoreA !== v.scoreA ? `A+${m.scoreA - v.scoreA}` : `B+${m.scoreB - v.scoreB}`);
  }
  v.essaisA = m.essaisA; v.essaisB = m.essaisB; v.scoreA = m.scoreA; v.scoreB = m.scoreB;
  const tir = m.tir ?? null;
  if (tir !== v.tir) { if (tir) noter('tir', String(tir.valeur), rang(tir.buteur)); v.tir = tir; v.tirJoue = false; }
  if (tir && !v.tirJoue && tir.reussi !== undefined && tir.volLance) { noter('tirJoue', tir.reussi ? 'reussi' : 'manque', rang(tir.buteur)); v.tirJoue = true; }
  const sifflet = m.sifflet ?? null;
  if (sifflet !== v.sifflet) { if (sifflet) noter('sifflet', sifflet.cle ?? 0); v.sifflet = sifflet; }
  let remplaces = 0;
  for (const p of m.pions) {
    if (p.remplace) remplaces += 1;
    const exclu = p.sanction > 0;
    if (exclu === v.exclus.has(p.id)) continue;
    if (exclu) { v.exclus.add(p.id); noter('carton', p.sanction > 3600 ? 'rouge' : 'jaune', rang(p)); }
    else { v.exclus.delete(p.id); noter('retour', 0, rang(p)); }
  }
  if (remplaces !== v.remplaces) { noter('remplacement', String(remplaces - v.remplaces)); v.remplaces = remplaces; }
  if (m.periode !== v.periode) { noter('miTemps'); v.periode = m.periode; }
  if (m.fini && !v.fini) { noter('fin'); v.fini = true; }
}

/**
 * Pose la caméra sur un moteur. ⚠️ ELLE NE FAIT QU'OBSERVER : `apresPas` est
 * appelé après chaque pas, et rien de ce qu'elle lit n'est modifié — deux
 * rejoues du même match restent identiques, qu'on les filme ou non.
 */
export function filmer(e: EtatMatch): void {
  if (CAMERAS.has(e)) return;
  const camera: Camera = {
    active: false, sansDemande: 0, photos: [], seuil: Infinity, generations: new WeakMap(),
    evenements: [], prochainId: 1, echeances: new Map(),
    vu: {
      vol: null, ruck: null, conquete: null, maul: null, penalite: null, sifflet: null, tir: null, tirJoue: false, libre: null,
      phase: '', essaisA: 0, essaisB: 0, scoreA: 0, scoreB: 0, periode: e.periode, fini: false, exclus: new Set(), remplaces: 0,
    },
  };
  CAMERAS.set(e, camera);
  e.apresPas = (m) => {
    observer(m, camera);
    if (m.sim < camera.seuil) return;
    const photo = photographier(m, camera);
    const derniere = camera.photos[camera.photos.length - 1];
    // Un trou dans la suite (la caméra n'a filmé que la fin d'un long rattrapage) : on repart de là.
    if (derniere && photo.n !== derniere.n + 1) camera.photos.length = 0;
    camera.photos.push(photo);
    const garde = camera.active ? PHOTOS_MAX : PHOTOS_VEILLE;
    if (camera.photos.length > garde) camera.photos.splice(0, camera.photos.length - garde);
  };
}

/**
 * Avant d'avancer le moteur jusqu'à `simCible` : ne filmer que les dernières
 * secondes. `regarde` : un écran attend la suite, la caméra tourne (une rejoue
 * à froid filme alors d'emblée la fin, et peut servir n'importe quel écran).
 */
export function cadrerFilm(e: EtatMatch, simCible: number, regarde = false): void {
  const camera = CAMERAS.get(e);
  if (!camera) return;
  if (regarde) { camera.active = true; camera.sansDemande = 0; }
  else if (camera.active && ++camera.sansDemande > 12) {
    camera.active = false;
    if (camera.photos.length > PHOTOS_VEILLE) camera.photos.splice(0, camera.photos.length - PHOTOS_VEILLE);
  }
  // Une cible infinie (match conclu d'un bloc) ne se filme pas ; sinon la traîne, longue si l'on regarde.
  camera.seuil = Number.isFinite(simCible) ? simCible - (camera.active ? PHOTOS_MAX : PHOTOS_VEILLE) * PAS_FILM : Infinity;
}

/** Octets estimés des photos gardées : le cache des moteurs en tient compte. */
export function poidsFilm(e: EtatMatch): number {
  return (CAMERAS.get(e)?.photos.length ?? 0) * 5_120;
}

const gesteFilm = (g: GesteMatch): GesteFilm => {
  const f: GesteFilm = { joueurId: g.joueurId, clip: g.clip, debut: r3(g.debut), duree: r3(g.duree) };
  if (g.variante) f.variante = g.variante;
  return f;
};
const gestesNes = (avant: PhotoFilm, photo: PhotoFilm): GesteFilm[] | undefined => {
  if (photo.g === avant.g) return undefined;
  const connus = new Set(avant.g.map((g) => g.id));
  const nes = photo.g.filter((g) => !connus.has(g.id));
  return nes.length ? nes.map(gesteFilm) : undefined;
};
const memeSur = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((id, j) => id === b[j]);
function imageCle(e: EtatMatch, camera: Camera, photo: PhotoFilm): ImageCle {
  camera.feuille ??= e.pions.map((p) => ({
    id: p.id, cote: p.cote, nom: p.nom, vitesseMax: r2(p.vitesseMax), puissance: Math.round(p.puissance),
    tailleCm: p.tailleCm, poidsKg: p.poidsKg,
  }));
  return { n: photo.n, feuille: camera.feuille, sur: photo.sur, q: photo.q, d: photo.d, g: photo.g.map(gesteFilm) };
}

/**
 * Le film v1 : les pas qui suivent `depuis`, différence par différence. Servi
 * aux écrans d'avant la chronologie (onglet resté ouvert pendant la mise en ligne).
 */
export function extraireFilm(e: EtatMatch, depuis?: number): FilmDirect | undefined {
  const camera = CAMERAS.get(e);
  if (!camera) return undefined;
  // Première demande : la caméra s'allume, et cette réponse-ci part avec le
  // relevé du terrain — le film commence au sondage suivant.
  camera.active = true; camera.sansDemande = 0;
  const photos = camera.photos;
  if (!photos.length) return undefined;
  const derniere = photos[photos.length - 1];
  let i = depuis === undefined ? -1 : photos.findIndex((p) => p.n === depuis);
  // L'écran est déjà à jour (chrono gelé, ou instance un pas en retard) : rien de neuf.
  if (i < 0 && depuis !== undefined && depuis >= derniere.n && depuis - derniere.n < 60) return { v: 1, de: depuis + 1, pas: [] };
  const film: FilmDirect = { v: 1, de: 0, pas: [] };
  if (i < 0) {
    i = Math.max(0, photos.length - 1 - RECUL_CLE);
    film.cle = imageCle(e, camera, photos[i]);
  }
  film.de = photos[i].n + 1;
  for (let k = i + 1; k < photos.length; k++) {
    const avant = photos[k - 1], photo = photos[k];
    const pas: PasFilm = memeSur(avant.sur, photo.sur) ? { q: photo.q.map((v, j) => v - avant.q[j]) } : { q: photo.q, a: 1, sur: photo.sur };
    const d = difference(avant.d, photo.d);
    if (d !== undefined && d !== null) pas.d = d as Objet;
    const g = gestesNes(avant, photo);
    if (g) pas.g = g;
    film.pas.push(pas);
  }
  return film;
}

// ── Les pistes : ne garder d'une course que les points où elle change ───────

/**
 * Ce que l'œil ne distingue pas, par entier du pas (centimètres, centièmes) :
 * l'horloge et le minuteur sont exacts ; le ballon à 3 cm ; l'arbitre à 25 ;
 * son regard à 8 centièmes de radian.
 *
 * ⚠️ UN JOUEUR N'A PAS LA MÊME TOLÉRANCE PARTOUT. Près du ballon — porteur,
 * plaqueur, soutiens, sauteurs — sa place se lit au contact : 5 cm. Loin de
 * l'action, le moteur le fait frémir de vingt à trente centimètres d'un pas à
 * l'autre (un rideau défensif qui se réajuste) : suivre ce frémissement au
 * centimètre triplait le poids des pistes pour un mouvement que la scène lisse
 * de toute façon. À plus de sept mètres du ballon, 20 cm.
 */
const tolerance = (j: number): number => (j < 2 ? 0 : j < 5 ? 3 : j < 7 ? 25 : 8);
const TOLERANCE_PRES = 5, TOLERANCE_LOIN = 20, RAYON_PRES = 700;
/** La tolérance de chaque joueur de `sur` pour ce tronçon : serrée s'il passe près du ballon à un pas quelconque. */
function tolerancesJoueurs(photos: readonly PhotoFilm[], debut: number, fin: number, base: PhotoFilm): number[] {
  const n = (base.q.length - 8) / 2;
  const sortie = new Array<number>(n).fill(TOLERANCE_LOIN);
  for (let k = debut - 1; k < fin; k++) {
    const q = k < debut ? base.q : photos[k].q;
    const bx = q[2], by = q[3];
    for (let i = 0; i < n; i++) {
      if (sortie[i] === TOLERANCE_PRES) continue;
      const dx = q[8 + i * 2] - bx, dy = q[9 + i * 2] - by;
      if (dx * dx + dy * dy < RAYON_PRES * RAYON_PRES) sortie[i] = TOLERANCE_PRES;
    }
  }
  return sortie;
}

/**
 * La valeur de la piste au pas `k`, entre les points `ks` / `vs` : une courbe
 * de Hermite dont les tangentes se déduisent des points voisins.
 *
 * ⚠️ LE SERVEUR ET L'ÉCRAN FONT EXACTEMENT CE CALCUL. Il n'emploie que les
 * quatre opérations (pas de sinus ni de racine) : deux machines différentes
 * rendent le même entier, et la tolérance vérifiée par le serveur est celle
 * que l'écran obtient.
 */
function valeurPiste(ks: readonly number[], vs: readonly number[], i: number, k: number): number {
  const k0 = ks[i], k1 = ks[i + 1], v0 = vs[i], v1 = vs[i + 1], h = k1 - k0;
  if (k >= k1) return v1;
  const pente = (v1 - v0) / h;
  const m0 = i > 0 ? (v1 - vs[i - 1]) / (k1 - ks[i - 1]) : pente;
  const m1 = i + 2 < ks.length ? (vs[i + 2] - v0) / (ks[i + 2] - k0) : pente;
  const s = (k - k0) / h, s2 = s * s, s3 = s2 * s;
  return Math.round((2 * s3 - 3 * s2 + 1) * v0 + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * v1 + (s3 - s2) * h * m1);
}

/** Choisit les points d'une piste : on ajoute le pas le plus mal rendu jusqu'à tenir la tolérance partout. */
function pister(base: number, valeurs: readonly number[], tol: number): number[] | 0 {
  const n = valeurs.length;
  let bouge = false;
  for (let k = 0; k < n; k++) if (valeurs[k] !== base) { bouge = true; break; }
  if (!bouge) return 0;
  const vrai = (k: number): number => (k === 0 ? base : valeurs[k - 1]);
  const ks = [0, n], vs = [base, valeurs[n - 1]];
  for (let garde = 0; garde < n; garde++) {
    let pire = -1, ecartMax = tol;
    for (let i = 0; i + 1 < ks.length; i++) {
      for (let k = ks[i] + 1; k < ks[i + 1]; k++) {
        const ecart = Math.abs(valeurPiste(ks, vs, i, k) - vrai(k));
        if (ecart > ecartMax) { ecartMax = ecart; pire = k; }
      }
    }
    if (pire < 0) break;
    let ou = 1;
    while (ks[ou] < pire) ou++;
    ks.splice(ou, 0, pire); vs.splice(ou, 0, vrai(pire));
  }
  const piste: number[] = [];
  for (let i = 1; i < ks.length; i++) piste.push(ks[i] - ks[i - 1], vs[i] - vs[i - 1]);
  return piste;
}

/** Rend les `n` pas d'une piste à partir de sa base. */
function depister(base: number, piste: number[] | 0, n: number, sortie: number[][], j: number): void {
  if (!piste) { for (let k = 0; k < n; k++) sortie[k][j] = base; return; }
  const ks = [0], vs = [base];
  for (let i = 0; i + 1 < piste.length; i += 2) { ks.push(ks[ks.length - 1] + piste[i]); vs.push(vs[vs.length - 1] + piste[i + 1]); }
  let i = 0;
  for (let k = 1; k <= n; k++) {
    while (i + 2 < ks.length && k > ks[i + 1]) i++;
    sortie[k - 1][j] = k >= ks[ks.length - 1] ? vs[vs.length - 1] : valeurPiste(ks, vs, i, k);
  }
}

/** La somme de contrôle des entiers d'un pas : l'écran l'annonce avec son dernier pas connu. */
export function sommeFilm(q: readonly number[]): number {
  let s = 7;
  for (let i = 0; i < q.length; i++) s = (s * 31 + q[i] + 100_000) % 1_000_003;
  return s;
}

/** Ce que l'écran annonce : son dernier pas connu, et la somme de contrôle de ce pas. */
export interface RepereChrono { depuis?: number; somme?: number }

/** `'refilmer'` : ce moteur n'a pas filmé les pas que l'écran attend — le serveur les rejoue (voir `vueMatchEnLigne`). */
export function extraireChrono(e: EtatMatch, repere: RepereChrono = {}, dernierRecours = false): ChronoDirect | 'refilmer' | undefined {
  const camera = CAMERAS.get(e);
  if (!camera) return undefined;
  const allumee = camera.active;
  camera.active = true; camera.sansDemande = 0;
  const photos = camera.photos;
  const { depuis } = repere;
  if (!photos.length) return allumee || dernierRecours ? undefined : 'refilmer';
  const premiere = photos[0], derniere = photos[photos.length - 1];
  let i = depuis === undefined ? -1 : photos.findIndex((p) => p.n === depuis);
  // L'écran est déjà à jour, ou cette instance a quelques pas de retard sur celle d'avant : rien de neuf.
  if (i < 0 && depuis !== undefined && depuis >= derniere.n && depuis - derniere.n < 80) return { v: 2, s: [] };
  // L'écran attend des pas que CETTE caméra n'a pas filmés (elle était éteinte) : on les rejoue plutôt que de le faire sauter.
  if (i < 0 && depuis !== undefined && depuis < premiere.n && premiere.n - depuis < PHOTOS_MAX && !dernierRecours) return 'refilmer';
  const chrono: ChronoDirect = { v: 2, s: [] };
  if (i >= 0 && repere.somme !== undefined && sommeFilm(photos[i].q) !== repere.somme) {
    // Même pas, autre contenu : l'écran tient une autre ligne de temps. Il repart d'un peu avant, là où il en est à l'image.
    chrono.rupture = 1;
    i = Math.max(0, i - RECUL_CLE);
    chrono.cle = imageCle(e, camera, photos[i]);
  } else if (i < 0) {
    i = Math.max(0, photos.length - 1 - RECUL_CLE);
    chrono.cle = imageCle(e, camera, photos[i]);
  }
  const depart = photos[i].n;
  let base = photos[i];
  let debut = i + 1;
  while (debut < photos.length) {
    const segment: SegmentChrono = { b: base.n, n: 0, p: [] };
    const d: (number | Objet)[] = [], g: (number | GesteCompact)[] = [];
    const etat = (avant: PhotoFilm, photo: PhotoFilm, k: number): void => {
      const dd = difference(avant.d, photo.d);
      if (dd !== undefined && dd !== null) d.push(k, dd as Objet);
      const nes = gestesNes(avant, photo);
      if (nes) for (const x of nes) g.push(k, x.variante ? [x.joueurId, x.clip, x.debut, x.duree, x.variante] : [x.joueurId, x.clip, x.debut, x.duree]);
    };
    if (!memeSur(base.sur, photos[debut].sur)) {
      // Un joueur entre ou sort : ce pas-là part entier, et les pistes repartent de lui.
      const entier = photos[debut];
      segment.b = entier.n; segment.sur = entier.sur; segment.q = entier.q;
      etat(photos[debut - 1], entier, 0);
      base = entier; debut += 1;
    }
    let fin = debut;
    while (fin < photos.length && memeSur(base.sur, photos[fin].sur)) fin++;
    segment.n = fin - debut;
    if (segment.n) {
      const valeurs: number[] = new Array(segment.n);
      const joueurs = tolerancesJoueurs(photos, debut, fin, base);
      for (let j = 0; j < base.q.length; j++) {
        for (let k = 0; k < segment.n; k++) valeurs[k] = photos[debut + k].q[j];
        segment.p.push(pister(base.q[j], valeurs, j < 8 ? tolerance(j) : joueurs[(j - 8) >> 1]));
      }
      for (let k = 0; k < segment.n; k++) etat(photos[debut + k - 1], photos[debut + k], k + 1);
      base = photos[fin - 1];
    }
    if (d.length) segment.d = d;
    if (g.length) segment.g = g;
    chrono.s.push(segment);
    debut = fin;
  }
  const ev = camera.evenements.filter((x) => x[1] > depart && x[1] <= derniere.n);
  if (ev.length) chrono.ev = ev;
  return chrono;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LA DIFFÉRENCE ENTRE DEUX PAS
// ═══════════════════════════════════════════════════════════════════════════

const estObjet = (v: Json | undefined): v is Objet => typeof v === 'object' && v !== null && !Array.isArray(v);

/** `undefined` : rien n'a changé. `null` : la valeur a disparu. Un objet marqué (`#`) d'une autre génération part entier. */
export function difference(a: Json | undefined, b: Json | undefined): Json | undefined {
  if (b === undefined) return a === undefined ? undefined : null;
  if (a === undefined) return b;
  if (!estObjet(a) || !estObjet(b)) {
    if (a === b) return undefined;
    return Array.isArray(a) && Array.isArray(b) && JSON.stringify(a) === JSON.stringify(b) ? undefined : b;
  }
  if (a['#'] !== b['#']) return b;
  let patch: Objet | undefined;
  for (const k in b) {
    const d = difference(a[k], b[k]);
    if (d !== undefined) (patch ??= {})[k] = d;
  }
  for (const k in a) if (!(k in b)) (patch ??= {})[k] = null;
  return patch;
}

/** Applique une différence. Renvoie rien : `base` est modifié en place. */
export function appliquerDifference(base: Objet, patch: Objet): void {
  for (const k in patch) {
    const v = patch[k];
    const ici = base[k];
    if (v === null) delete base[k];
    else if (estObjet(v) && !('#' in v) && estObjet(ici)) appliquerDifference(ici, v);
    else base[k] = v;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LE LECTEUR (client) — il rejoue le film avec un peu de retard
// ═══════════════════════════════════════════════════════════════════════════

/** Un pion tel que l'affichage le lit : la forme de celui du moteur, sans ses attributs de jeu. */
export interface PionFilm {
  id: string; cote: Cote; nom: string; numero: number; numeroMaillot?: number; poste: PosteId;
  pos: Vec; vitesse: Vec; cible?: Vec; surLeTerrain: boolean; sanction: number; role: Role;
  corps?: { age: number; debut: number; duree: number; direction: number; intensite: number; appuis?: number[]; bras?: number[] };
  vitesseMax: number; puissance: number; tailleCm?: number; poidsKg?: number;
  remplace?: boolean; blesse?: boolean;
  /** Ce que la fatigue fait à ses gestes (0 frais, 1 entamé, 2 épuisé) : voir `moteur/animations.ts`. */
  fatigue?: 0 | 1 | 2;
  apparence: Pick<ApparenceMatch, 'peau' | 'cheveux' | 'coiffure' | 'barbe'>;
  stats: Record<string, number>;
}

/** Ce qui vient : un événement que l'écran n'a pas encore montré, et dans combien de secondes il le montrera. */
export interface EvenementAVenir extends EvenementChrono { dans: number }

/**
 * L'état rejoué. ⚠️ IL A LA FORME DE CELUI DU MOTEUR, champ pour champ, pour ce
 * que l'affichage en lit : la scène 3D et le terrain vu de haut le lisent comme
 * ils lisent un match de carrière. C'est un seul objet pour tout le match, mis
 * à jour en place à chaque pas.
 */
export interface EtatFilm {
  sim: number; t: number; minute: number; reliquat: number; fini: boolean; tempsReel: true;
  phase: Phase; possession: Cote; minuteur: number; dureeArret?: number;
  scoreA: number; scoreB: number; essaisA: number; essaisB: number;
  pions: PionFilm[]; ballon: Vec; porteur: PionFilm | null;
  gestes: GesteMatch[];
  arbitre: { pos: Vec; vitesse: Vec; regard: number };
  volsRecents: never[]; commentaires: never[]; compteurs: Record<string, number>;
  /** Les événements des deux prochaines secondes : la scène, la caméra et le son peuvent s'y préparer. */
  aVenir: EvenementAVenir[];
  [champ: string]: unknown;
}

/**
 * Ce qu'il doit rester de film AU PLUS BAS, juste avant qu'un envoi n'arrive.
 *
 * ⚠️ ON RÈGLE LE CREUX, PAS LA MOYENNE. Le film se vide entre deux envois et se
 * remplit d'un coup : viser « trois secondes d'avance » à l'arrivée ne dit rien
 * de ce qui reste quand une réponse met une seconde de plus que la précédente.
 * Le lecteur mesure donc le creux de ses derniers envois et s'en tient à cette
 * marge — son retard sur le direct s'adapte tout seul au réseau qu'il a.
 */
const CREUX_CIBLE = 1.1;
/** En deçà, on ne corrige pas : une réponse un peu lente n'est pas une dérive. */
const CREUX_TOLERANCE = 0.35;
/** Avance donnée à la lecture quand elle repart de zéro. */
const AVANCE_REPRISE = 3.6;
/** En dessous, le film ralentit pour ne jamais buter sur sa dernière image. */
const AVANCE_BASSE = 0.5;
/** Au-delà, on n'accélère plus : on saute (onglet resté caché, réseau coupé). */
const AVANCE_RUPTURE = 14;
/** Un raccord se fond sur cette durée : les joueurs rejoignent leur place en courant, ils n'y apparaissent pas. */
const PAS_DE_FONDU = 8;
/** Au-delà de cet écart, fondre n'a pas de sens (autre phase de jeu) : le raccord est franc. */
const ECART_FONDU_MAX = 22;
/** On attend au plus ce temps un regroupement pour y glisser le raccord. */
const ATTENTE_REPERE = 1.6;
/** Ce que l'écran regarde devant lui. */
const HORIZON_A_VENIR = 2.4;

interface PasRecu { n: number; sur?: string[]; q: number[]; d?: Objet; g?: GesteFilm[] }
/** Tant que le poste du pion n'est pas connu : remplacée au premier pas par celle de sa carte. */
const APPARENCE_VIDE = {} as PionFilm['apparence'];
const SANS_EVENEMENT: EvenementAVenir[] = [];

export class LecteurFilm {
  /** L'état rejoué. Le même objet du premier pas à la sirène. */
  readonly etat: EtatFilm;
  /** Numéro du dernier pas reçu : c'est lui qu'on annonce au serveur. `undefined` : rien reçu. */
  dernier: number | undefined;
  /** Compte les reprises à zéro (image complète non raccordée) : l'affichage doit alors se rebrancher. */
  coupes = 0;
  /** Compte les raccords en douceur (la ligne de temps du serveur n'était plus celle de l'écran). */
  raccords = 0;
  /** Le film n'avance pas, faute d'images : le serveur est en retard ou le chrono est gelé. */
  enAttente = true;
  /** Les événements reçus, du plus ancien au plus récent (les vingt dernières secondes et ce qui vient). */
  evenements: EvenementChrono[] = [];

  private pions = new Map<string, PionFilm>();
  private feuille: FeuilleFilm[] = [];
  private brut: Objet = {};
  private sur: string[] = [];
  /** Entiers du dernier pas reçu (décodage) et du pas affiché. */
  private qTete: number[] = [];
  private tampon: PasRecu[] = [];
  /** Numéro du pas appliqué à `etat`. */
  private applique = -1;
  /** Position de lecture, en secondes simulées. */
  private lecture = 0;
  /** Écart de synchronisation restant à résorber (secondes) : positif, on est en retard sur le direct. */
  private ecart = 0;
  /** Ce qu'il restait de film à l'arrivée des derniers envois. */
  private creux: number[] = [];
  private precedentes = new Map<string, Vec>();
  private ballonAvant: Vec = { x: 61, y: 35 };
  private immobile = false;
  /** Raccord en cours : l'écart entre ce qui était montré et la nouvelle ligne de temps, résorbé en quelques pas. */
  private fondu: { depuis: number; ecarts: Map<string, Vec>; ballon: Vec } | null = null;
  /** Une nouvelle ligne de temps attend le prochain regroupement pour prendre la place. */
  private suspendu: { cle: ImageCle; pas: PasRecu[]; a: number } | null = null;

  constructor() {
    this.etat = {
      sim: 0, t: 0, minute: 0, reliquat: 0, fini: false, tempsReel: true,
      phase: 'coupEnvoi', possession: 'A', minuteur: 0,
      scoreA: 0, scoreB: 0, essaisA: 0, essaisB: 0,
      pions: [], ballon: { x: 61, y: 35 }, porteur: null, gestes: [],
      arbitre: { pos: { x: 54, y: 26 }, vitesse: { x: 0, y: 0 }, regard: 0 },
      volsRecents: [], commentaires: [], compteurs: {}, aVenir: SANS_EVENEMENT,
      vol: null, ruck: null, conquete: null, tir: null, aplatissage: null, sifflet: null, ballonLibre: null,
    };
  }

  /** Le film a de quoi être montré. */
  get pret(): boolean { return this.applique >= 0; }
  /** Secondes de film encore devant la lecture. */
  get avance(): number { return this.dernier === undefined ? 0 : this.dernier * PAS_FILM - this.lecture; }
  /** Position d'un pion au pas précédent, pour l'interpolation du terrain vu de haut. */
  avant(id: string): Vec | undefined { return this.precedentes.get(id); }
  /** Position du ballon au pas précédent. */
  get ballonPrecedent(): Vec { return this.ballonAvant; }
  /** Part du pas courant déjà écoulée, de 0 (pas précédent) à 1 (pas courant). */
  get alpha(): number { return Math.max(0, Math.min(1, this.etat.reliquat / PAS_FILM)); }
  /** Ce que le sondage annonce au serveur : dernier pas connu et somme de contrôle de ce pas (`''` : rien). */
  get repere(): string { return this.dernier === undefined ? '' : `${this.dernier}.${sommeFilm(this.qTete)}`; }

  /** Range un envoi du film v1. Une réponse ancienne ou en double est simplement ignorée. */
  recevoir(film: FilmDirect | undefined): void {
    if (!film || film.v !== 1) return;
    // Les différences se décodent depuis l'image complète quand il y en a une, sinon depuis le dernier pas reçu.
    if (!film.cle && (this.dernier === undefined || film.de !== this.dernier + 1)) return;
    let q = film.cle ? film.cle.q : this.qTete;
    let n = film.cle ? film.cle.n : this.dernier!;
    const pas: PasRecu[] = film.pas.map((p) => {
      q = p.a ? p.q : p.q.map((v, j) => v + (q[j] ?? 0));
      return { n: ++n, sur: p.sur, q, d: p.d, g: p.g };
    });
    this.livrer(film.cle, pas, false);
  }

  /** Range un envoi de la chronologie (v2). */
  recevoirChrono(chrono: ChronoDirect | undefined): void {
    if (!chrono || chrono.v !== 2) return;
    const premier = chrono.s[0];
    if (!chrono.cle && premier && !premier.q && (this.dernier === undefined || premier.b !== this.dernier)) return;
    if (chrono.cle) this.adopterFeuille(chrono.cle.feuille);
    let q = chrono.cle ? chrono.cle.q : this.qTete;
    const pas: PasRecu[] = [];
    for (const s of chrono.s) {
      const d = new Map<number, Objet>(), g = new Map<number, GesteFilm[]>();
      for (let i = 0; s.d && i + 1 < s.d.length; i += 2) d.set(s.d[i] as number, s.d[i + 1] as Objet);
      for (let i = 0; s.g && i + 1 < s.g.length; i += 2) {
        const k = s.g[i] as number, [joueurId, clip, debut, duree, variante] = s.g[i + 1] as GesteCompact;
        g.set(k, [...(g.get(k) ?? []), { joueurId, clip, debut, duree, ...(variante ? { variante } : {}) } as GesteFilm]);
      }
      if (s.q) { q = s.q; pas.push({ n: s.b, sur: s.sur, q, d: d.get(0), g: g.get(0) }); }
      if (!s.n) continue;
      const base = q;
      const suite: number[][] = Array.from({ length: s.n }, () => new Array<number>(base.length));
      for (let j = 0; j < base.length; j++) depister(base[j], s.p[j] ?? 0, s.n, suite, j);
      for (let k = 1; k <= s.n; k++) pas.push({ n: s.b + k, q: suite[k - 1], d: d.get(k), g: g.get(k) });
      q = suite[s.n - 1];
    }
    if (chrono.ev) this.noterEvenements(chrono.ev);
    this.livrer(chrono.cle, pas, chrono.rupture === 1);
  }

  /** Le rangement commun aux deux formats : des pas ENTIERS, numérotés, et l'image complète s'il y en a une. */
  private livrer(cle: ImageCle | undefined, pas: PasRecu[], rupture: boolean): void {
    if (cle) {
      const fin = cle.n + pas.length;
      const raccord = !rupture && this.dernier !== undefined && cle.n <= this.dernier && fin >= this.dernier;
      if (raccord) {
        // On connaît déjà ce passé : seule la suite nous intéresse.
        pas = pas.filter((p) => p.n > this.dernier!);
      } else if (this.applique < 0 || !this.raccorder(cle, pas, rupture)) {
        this.repartir(cle);
      } else return;
    }
    if (this.dernier === undefined || !pas.length || pas[0].n !== this.dernier + 1) return;
    const creux = this.avance;
    for (const p of pas) this.tampon.push(p);
    const tete = pas[pas.length - 1];
    this.qTete = tete.q;
    this.dernier = tete.n;
    if (this.avance > AVANCE_RUPTURE) {
      // Très loin derrière : on saute au retard voulu plutôt que de rejouer quatorze secondes en accéléré.
      this.lecture = tete.n * PAS_FILM - AVANCE_REPRISE;
      this.ecart = 0; this.creux.length = 0; this.coupes++;
      this.rattraper(true);
      return;
    }
    // La correction se fait par la vitesse de lecture, jamais par un saut — et
    // seulement quand trois envois de suite disent la même chose.
    this.creux.push(creux);
    if (this.creux.length < 3 || Math.abs(this.ecart) > 0.05) return;
    const bas = Math.min(...this.creux);
    const derive = bas - CREUX_CIBLE;
    if (this.creux.length > 6) this.creux.shift();
    if (Math.abs(derive) <= CREUX_TOLERANCE) return;
    this.ecart = derive;
    this.creux.length = 0;
  }

  /**
   * Fait avancer la lecture de `dt` secondes réelles et applique les pas
   * franchis. Renvoie vrai si l'état a changé de pas.
   *
   * ⚠️ LA LECTURE NE RECULE JAMAIS ET NE DÉPASSE JAMAIS LA DERNIÈRE IMAGE. Un
   * envoi en retard ne se rattrape pas en inventant la suite : le film ralentit
   * à l'approche de sa fin, s'arrête au besoin, puis repart un peu plus vite.
   */
  avancer(dt: number): boolean {
    if (this.dernier === undefined || this.applique < 0) return false;
    const reste = Math.max(0, this.dernier * PAS_FILM - this.lecture);
    // L'écart se résorbe par la vitesse, sur quelques secondes : 12 % de moins
    // ou 15 % de plus ne se remarquent pas, un saut si.
    const correction = Math.abs(this.ecart) < 0.04 ? 0 : Math.max(-0.12, Math.min(0.15, this.ecart * 0.25));
    const freine = reste < AVANCE_BASSE && reste / AVANCE_BASSE < 1 + correction;
    const vitesse = freine ? reste / AVANCE_BASSE : 1 + correction;
    const parcouru = Math.min(reste, dt * vitesse);
    this.enAttente = dt > 0 && parcouru < dt * 0.05;
    // Seule la correction VOULUE consomme l'écart. Ce que la fin du film a
    // freiné creuse le retard — c'est justement ce qu'un écart négatif demande.
    if (!freine) this.ecart = correction ? this.ecart - correction * dt : 0;
    else if (this.ecart < 0) this.ecart = Math.min(0, this.ecart + dt - parcouru);
    this.lecture += parcouru;
    // Le raccord qui attendait son regroupement : c'est le moment.
    if (this.suspendu && this.lecture >= this.suspendu.a) {
      const s = this.suspendu;
      this.suspendu = null;
      this.basculer(s.cle, s.pas);
      return true;
    }
    const change = this.rattraper(false);
    // Le film attend sa suite : plus personne ne court sur place, chacun
    // s'arrête comme on s'arrête quand le jeu s'arrête.
    if (this.enAttente && !change && !this.immobile) {
      this.immobile = true;
      for (const p of this.etat.pions) { p.vitesse.x = 0; p.vitesse.y = 0; }
      this.etat.arbitre.vitesse.x = 0; this.etat.arbitre.vitesse.y = 0;
    }
    if (change) this.regarderDevant();
    return change;
  }

  // ── Les événements ─────────────────────────────────────────────────────────

  /** Les événements que l'écran montrera dans les `horizon` prochaines secondes. */
  aVenir(horizon = HORIZON_A_VENIR): EvenementAVenir[] {
    const sortie: EvenementAVenir[] = [];
    for (const ev of this.evenements) {
      const dans = ev.pas * PAS_FILM - this.lecture;
      if (dans > 0 && dans <= horizon) sortie.push({ ...ev, dans });
    }
    return sortie;
  }
  /** Le prochain événement d'un type donné déjà dans le tampon, s'il y en a un. */
  prochain(...types: TypeEvenement[]): EvenementAVenir | undefined {
    for (const ev of this.evenements) {
      const dans = ev.pas * PAS_FILM - this.lecture;
      if (dans > 0 && types.includes(ev.type)) return { ...ev, dans };
    }
    return undefined;
  }

  private noterEvenements(bruts: EvenementBrut[]): void {
    const dernierId = this.evenements.length ? this.evenements[this.evenements.length - 1].id : 0;
    for (const [id, pas, type, resultat, joueurs] of bruts) {
      if (id <= dernierId) continue;
      this.evenements.push({
        id, pas, type, ...(resultat ? { resultat } : {}),
        joueurs: (joueurs ?? []).map((i) => this.feuille[i]?.id).filter((x): x is string => !!x),
        repere: REPERES.has(type),
      });
    }
    // On garde vingt secondes de passé : de quoi nourrir un fil ou un ralenti, pas plus.
    const limite = (this.lecture - 20) / PAS_FILM;
    let debut = 0;
    while (debut < this.evenements.length - 200 || (debut < this.evenements.length && this.evenements[debut].pas < limite)) debut++;
    if (debut) this.evenements.splice(0, debut);
  }
  private regarderDevant(): void {
    const devant = this.aVenir();
    this.etat.aVenir = devant.length ? devant : SANS_EVENEMENT;
  }

  // ── Les raccords ───────────────────────────────────────────────────────────

  /**
   * La ligne de temps du serveur n'est plus celle de l'écran (ou sa suite ne se
   * raccorde pas). ⚠️ ON NE TÉLÉPORTE PERSONNE AU MILIEU D'UNE ACTION : si un
   * regroupement arrive dans la seconde et demie, c'est là qu'on bascule ;
   * sinon tout de suite, et dans les deux cas les joueurs rejoignent leur
   * nouvelle place en quelques foulées. Renvoie faux quand l'écart de temps est
   * trop grand pour un raccord (onglet resté caché) : il faut repartir à zéro.
   */
  private raccorder(cle: ImageCle, pas: PasRecu[], rupture: boolean): boolean {
    const fin = (cle.n + pas.length) * PAS_FILM;
    // Une réponse plus vieille que ce qui est à l'écran (elle s'est fait doubler) : on l'ignore, on ne recule pas.
    if (fin < this.lecture - 1 && this.lecture - fin < 40) return true;
    if (fin < this.lecture - 1 || cle.n * PAS_FILM > this.lecture + 8) return false;
    this.raccords++;
    const repere = rupture ? this.evenements.find((ev) => ev.repere && ev.pas * PAS_FILM > this.lecture
      && ev.pas * PAS_FILM <= Math.min(this.lecture + ATTENTE_REPERE, fin) && ev.pas <= (this.dernier ?? 0)) : undefined;
    if (repere) { this.suspendu = { cle, pas, a: repere.pas * PAS_FILM }; return true; }
    this.basculer(cle, pas);
    return true;
  }

  /** Passe sur la nouvelle ligne de temps, en gardant ce qui est montré comme point de départ du fondu. */
  private basculer(cle: ImageCle, pas: PasRecu[]): void {
    const montres = new Map<string, Vec>();
    for (const p of this.etat.pions) if (p.surLeTerrain) montres.set(p.id, { x: p.pos.x, y: p.pos.y });
    const ballon = { x: this.etat.ballon.x, y: this.etat.ballon.y };
    const lecture = this.lecture;
    this.repartir(cle, true);
    for (const p of pas) this.tampon.push(p);
    if (pas.length) { this.qTete = pas[pas.length - 1].q; this.dernier = pas[pas.length - 1].n; }
    // La lecture reste où elle était si la nouvelle ligne de temps la couvre.
    this.lecture = Math.max(cle.n * PAS_FILM, Math.min(lecture, (this.dernier ?? cle.n) * PAS_FILM));
    this.fondu = null;
    this.rattraper(true);
    const ecarts = new Map<string, Vec>();
    let pire = 0;
    for (const p of this.etat.pions) {
      const m = montres.get(p.id);
      if (!m || !p.surLeTerrain) continue;
      const dx = m.x - p.pos.x, dy = m.y - p.pos.y;
      pire = Math.max(pire, Math.hypot(dx, dy));
      if (Math.abs(dx) + Math.abs(dy) > 0.04) ecarts.set(p.id, { x: dx, y: dy });
    }
    if (!ecarts.size || pire > ECART_FONDU_MAX) return;
    this.fondu = { depuis: this.applique, ecarts, ballon: { x: ballon.x - this.etat.ballon.x, y: ballon.y - this.etat.ballon.y } };
    // Le pas courant est déjà affiché : on le replace d'où l'on vient, le fondu fera le reste.
    for (const [id, d] of ecarts) {
      const p = this.pions.get(id)!;
      p.pos.x += d.x; p.pos.y += d.y; p.vitesse.x = 0; p.vitesse.y = 0;
      this.precedentes.set(id, { x: p.pos.x, y: p.pos.y });
    }
    this.etat.ballon.x += this.fondu.ballon.x; this.etat.ballon.y += this.fondu.ballon.y;
    this.ballonAvant = { x: this.etat.ballon.x, y: this.etat.ballon.y };
  }

  /** Applique les pas dont l'instant est atteint. */
  private rattraper(force: boolean): boolean {
    let change = force;
    // L'état montre le pas `k` dès que la lecture a dépassé l'instant du pas `k - 1`.
    while (this.tampon.length && this.lecture > (this.tampon[0].n - 1) * PAS_FILM - 1e-9) {
      this.appliquer(this.tampon.shift()!);
      change = true;
    }
    this.etat.reliquat = Math.max(0, Math.min(PAS_FILM, this.lecture - (this.applique - 1) * PAS_FILM));
    return change;
  }

  private adopterFeuille(feuille: FeuilleFilm[]): void {
    this.feuille = feuille;
    for (const f of feuille) {
      if (this.pions.has(f.id)) continue;
      this.pions.set(f.id, {
        id: f.id, cote: f.cote, nom: f.nom, numero: 0, poste: 'pilier_gauche', pos: { x: 0, y: 0 }, vitesse: { x: 0, y: 0 },
        surLeTerrain: false, sanction: 0, role: 'ligne', vitesseMax: f.vitesseMax, puissance: f.puissance,
        tailleCm: f.tailleCm, poidsKg: f.poidsKg, apparence: APPARENCE_VIDE, stats: {},
      });
    }
  }

  private repartir(cle: ImageCle, doux = false): void {
    this.tampon.length = 0;
    this.brut = {};
    this.precedentes.clear();
    this.suspendu = null;
    this.fondu = null;
    this.adopterFeuille(cle.feuille);
    this.etat.pions = cle.feuille.map((f) => this.pions.get(f.id)!);
    this.etat.gestes = [];
    if (this.dernier !== undefined && !doux) this.coupes++;
    this.qTete = cle.q;
    this.dernier = cle.n;
    this.applique = -1;
    this.appliquer({ n: cle.n, sur: cle.sur, q: cle.q, d: cle.d, g: cle.g }, true);
    this.lecture = cle.n * PAS_FILM;
    this.ecart = 0; this.creux.length = 0;
    this.etat.reliquat = PAS_FILM;
  }

  private appliquer(pas: PasRecu, entier = false): void {
    const e = this.etat;
    const sim = pas.n * PAS_FILM;
    this.immobile = false;
    this.ballonAvant = entier ? { x: pas.q[2] / 100, y: pas.q[3] / 100 } : { x: e.ballon.x, y: e.ballon.y };
    for (const id of this.sur) { const p = this.pions.get(id); if (p) this.precedentes.set(id, { x: p.pos.x, y: p.pos.y }); }
    if (pas.sur) this.sur = pas.sur;
    const q = pas.q;
    const suite = !entier && pas.n === this.applique + 1;
    // Ce qu'il reste du fondu d'un raccord : nul au bout de quelques pas.
    let poids = 0;
    if (this.fondu) {
      const u = (pas.n - this.fondu.depuis) / PAS_DE_FONDU;
      if (u >= 1 || u < 0) this.fondu = null;
      else poids = (1 - u) * (1 - u) * (1 + 2 * u);
    }
    e.sim = sim; e.t = q[0] / 100; e.minute = Math.floor(e.t / 60); e.minuteur = q[1] / 100;
    e.ballon.x = q[2] / 100 + (this.fondu ? this.fondu.ballon.x * poids : 0);
    e.ballon.y = q[3] / 100 + (this.fondu ? this.fondu.ballon.y * poids : 0);
    const a = e.arbitre, ax = q[5] / 100, ay = q[6] / 100;
    a.vitesse.x = suite ? (ax - a.pos.x) / PAS_FILM : 0; a.vitesse.y = suite ? (ay - a.pos.y) / PAS_FILM : 0;
    a.pos.x = ax; a.pos.y = ay; a.regard = q[7] / 100;

    // ── L'état : seuls les champs qui ont changé sont repris ──────────────────
    if (pas.d) {
      const patch = pas.d;
      appliquerDifference(this.brut, patch);
      const pions = patch.pions;
      if (estObjet(pions)) for (const id in pions) this.majPion(id);
      for (const cle in patch) {
        if (cle === 'pions') continue;
        const valeur = this.brut[cle];
        const p = patch[cle];
        const neuf = estObjet(p) && '#' in p;
        e[cle] = valeur === undefined ? null : this.animer(valeur, neuf ? undefined : e[cle]);
      }
    }
    // ── Les positions : la vitesse d'un pion est son déplacement réel ────────
    for (let i = 0; i < this.sur.length; i++) {
      const p = this.pions.get(this.sur[i]);
      if (!p) continue;
      const decale = poids ? this.fondu!.ecarts.get(p.id) : undefined;
      const x = q[8 + i * 2] / 100 + (decale ? decale.x * poids : 0), y = q[9 + i * 2] / 100 + (decale ? decale.y * poids : 0);
      const connu = suite && this.precedentes.has(p.id);
      p.vitesse.x = connu ? (x - p.pos.x) / PAS_FILM : 0;
      p.vitesse.y = connu ? (y - p.pos.y) / PAS_FILM : 0;
      p.pos.x = x; p.pos.y = y;
      if (!connu) this.precedentes.set(p.id, { x, y });
      if (p.corps) p.corps.age = Math.max(0, sim - p.corps.debut);
    }
    // ── Ce qui se déduit du temps : rien de tout ça ne voyage à chaque pas ───
    const vol = e.vol as { depart?: number; ecoule?: number } | null;
    if (vol && typeof vol.depart === 'number') vol.ecoule = Math.max(0, sim - vol.depart);
    for (const cle of A_ECHEANCE) {
      const o = e[cle] as { fin?: number; restant?: number } | null;
      if (o && typeof o.fin === 'number') o.restant = Math.max(0, o.fin - sim);
    }
    const conquete = e.conquete as { progression?: number } | null;
    if (conquete) conquete.progression = e.dureeArret ? Math.max(0, Math.min(1, 1 - e.minuteur / e.dureeArret)) : 1;
    const libre = e.ballonLibre as { hauteur?: number } | null;
    if (libre) libre.hauteur = q[4] / 100;
    if (pas.g?.length) {
      for (const g of pas.g) e.gestes.push({ ...g, id: `${g.joueurId}:${g.debut.toFixed(3)}:${g.clip}` });
    }
    if (e.gestes.length && sim - e.gestes[0].debut >= 8) e.gestes = e.gestes.filter((g) => sim - g.debut < 8);
    this.applique = pas.n;
  }

  private majPion(id: string): void {
    const p = this.pions.get(id);
    const j = (this.brut.pions as Objet | undefined)?.[id];
    if (!p || !estObjet(j)) return;
    const poste = j.poste as PosteId;
    if (poste !== p.poste || p.apparence === APPARENCE_VIDE) {
      const a = apparenceJoueurMatch(p.nom, poste);
      p.apparence = { peau: a.peau, cheveux: a.cheveux, coiffure: a.coiffure, barbe: a.barbe };
    }
    p.poste = poste;
    p.role = j.role as Role;
    p.numero = j.numero as number;
    p.numeroMaillot = j.numeroMaillot as number | undefined;
    p.fatigue = (j.f as 0 | 1 | 2 | undefined) ?? 0;
    const etait = p.surLeTerrain;
    p.surLeTerrain = j.t === 1;
    if (etait !== p.surLeTerrain) this.precedentes.delete(id);
    // La durée exacte ne voyage pas : l'écran n'a besoin que de savoir s'il est exclu, et pour de bon ou non.
    p.sanction = j.s === 2 ? 99_999 : j.s === 1 ? 600 : 0;
    p.remplace = j.remplace === true;
    p.blesse = j.blesse === true;
    p.cible = estObjet(j.cible) ? { x: j.cible.x as number, y: j.cible.y as number } : undefined;
    if (estObjet(j.corps)) {
      const c = j.corps;
      p.corps = {
        age: 0, debut: c.debut as number, duree: c.duree as number, direction: c.direction as number,
        intensite: c.intensite as number, appuis: c.appuis as number[], bras: c.bras as number[],
      };
    } else delete p.corps;
  }

  /** Rend vivant un morceau d'état : les renvois deviennent des pions, l'objet déjà en place est gardé. */
  private animer(brut: Json, vivant: unknown): unknown {
    if (!estObjet(brut)) return Array.isArray(brut) ? brut.map((x) => this.animer(x, undefined)) : brut;
    if (typeof brut.$ === 'string') return this.pions.get(brut.$) ?? null;
    const cible = (vivant && typeof vivant === 'object' && !Array.isArray(vivant) ? vivant : {}) as Record<string, unknown>;
    for (const k in cible) if (!(k in brut)) delete cible[k];
    for (const k in brut) if (k !== '#') cible[k] = this.animer(brut[k], cible[k]);
    return cible;
  }
}

/** Ce que rapporte un événement, en clair : `1582 | 54:32.4 | passe | A9 → A10 | …` — pour les journaux et les bancs. */
export function ligneEvenement(ev: EvenementChrono, seconde: number, nomme: (id: string) => string = (id) => id): string {
  const m = Math.floor(seconde / 60), s = seconde - m * 60;
  return `${ev.id} | ${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')} | ${ev.type} | ${ev.joueurs.map(nomme).join(' → ') || '—'} | ${ev.resultat ?? '—'} | ${graineEvenement(ev.id)}`;
}
/**
 * La graine d'un événement : le même nombre sur tous les écrans, pour que les
 * variantes purement visuelles (quel cri de foule, quelle variante d'animation)
 * tombent pareil partout sans qu'aucun octet ne voyage.
 */
export function graineEvenement(id: number, sel = 0): number {
  let h = (id * 2654435761 + sel * 40503 + 0x9e3779b9) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) % 65536;
}

/**
 * Le dernier pas connu de chaque direct ouvert, pour que le sondage l'annonce
 * au serveur. Le lecteur vit dans l'écran du terrain, le sondage dans celui de
 * la ligue : ce repère évite de les lier l'un à l'autre.
 */
export const reperesFilm = new Map<string, number>();
/** Le même, pour la chronologie : « dernier pas . somme de contrôle ». */
export const reperesChrono = new Map<string, string>();
