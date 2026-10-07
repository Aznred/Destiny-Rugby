// 🎮 LE CONTRÔLE DIRECT — le joueur conduit SON pion, les vingt-neuf autres jouent seuls.
// (Correctif 16)
//
// Demande : « quand notre joueur entre en jeu, il faut pouvoir prendre directement
// son contrôle au lieu de rester spectateur. On garde le moteur pour tous les
// autres joueurs, et on remplace UNIQUEMENT l'IA de notre personnage par les
// ordres du joueur. »
//
// ═══ CE QUI A ÉTÉ TRANCHÉ AVANT D'ÉCRIRE UNE LIGNE ═══════════════════════════
//
// 1. ⚠️ ON REMPLACE L'IA D'UN SEUL PION, PAS LA SIMULATION. Le moteur continue de
//    placer, de lancer les combinaisons, de former les regroupements pour les
//    autres. Rien ne se passe pour le pion humain que ce que le joueur demande —
//    sauf quand le jeu ne lui appartient pas (mêlée, touche, tir au but, ruck
//    dans lequel il est lié) : alors l'IA le place, comme n'importe quel joueur.
// 2. ⚠️ LE PION GARDE SA PHYSIQUE. Même vitesse de pointe, même accélération
//    (un peu plus vive : un pouce n'attend pas un demi-tour de pion), même
//    endurance qui fond. Pas de glissade ni de téléportation : la vitesse est un
//    vecteur, qu'on infléchit avec des accélérations et un taux de virage bornés.
// 3. ⚠️ LES ACTIONS PASSENT PAR LES RÈGLES DU MOTEUR. Une passe, c'est
//    `passerLeBallon` (en-avant, interception, mains) ; un plaquage, c'est
//    `resoudrePlaquage` (probabilité, fautes, ruck) ; un coup de pied, c'est
//    `lancerVol`. Le contrôle direct ne court-circuite jamais un arbitrage : il
//    ne fait que CHOISIR, avec ses doigts, ce que l'IA choisissait pour lui.
// 4. ⚠️ ÇA COÛTE. Le sprint vide l'endurance bien plus vite, un plaquage manqué
//    laisse un trou, un grattage mal placé donne une pénalité.
// 5. ⚠️ CE FICHIER NE CONNAÎT PAS `moteur.ts` — c'est l'inverse (voir `controle.ts`).
//    Il déclare, il lit, il mesure ; le moteur exécute, avec ses fonctions privées.
//
// ═══ LES REPÈRES ═════════════════════════════════════════════════════════════
//
// Tout est en repère TERRAIN du moteur (x vers la ligne B, y vers la touche
// haute). C'est l'hôte qui traduit un joystick, une flèche ou un glissé du pouce
// en vecteur terrain, d'après la caméra : « droit devant » est donc ce que le
// joueur voit droit devant, quel que soit son camp ou la mi-temps.

import type { EtatMatch, IntentionPied } from './etat.js';
import { vitesseDisponible, type Pion } from './entites.js';
import { facteurAcceleration, pasEndurance, peutSprinter } from './endurance.js';
import { sortiesPossibles } from './pack.js';
import { attaquantLibre } from './ia/lecture.js';
import { ligneDePasseCoupee } from './ia/vision.js';
import { humainTientLe } from './responsabilites.js';
import {
  AXE, LARGEUR, LIGNE_A, LIGNE_B, LONGUEUR, borner, dansSes22, dansSonCamp, distance, distance2,
  metresAvantLaLigne, sens, type Vec,
} from './terrain.js';

// ---------------------------------------------------------------------------
// LES RÉGLAGES — tout ce qui s'étalonne au banc est ici (`verifierControleDirect.ts`)
// ---------------------------------------------------------------------------

export const REGLAGES_DIRECT = {
  // ── La course ─────────────────────────────────────────────────────────────
  /** Part de la vitesse disponible à stick plein, sans sprint : une course franche, pas la pointe. */
  course: 0.8,
  /** Sprint : multiplicateur de la vitesse disponible, selon la fraîcheur (comme l'intention `sprint` des cartes). */
  sprintFrais: 1.12,
  sprintMoyen: 1.07,
  sprintPlat: 1.02,
  /** Personne ne dépasse 10,9 m/s (garde-fou de l'IA par poste). */
  plafondVitesse: 10.9,
  /** Un pouce n'attend pas : l'accélération du pion humain, en multiple de celle de l'IA. */
  vivacite: 1.2,
  /** Agilité : accélération latérale, en multiple de l'accélération, qui borne le taux de virage (rad/s = a / vitesse). */
  agilite: 2.1,
  /** Taux de virage maximal à l'arrêt ou presque (rad/s) : on se tourne sur place d'un appui. */
  virageMax: 11,
  /** Freinage quand on lâche le stick, m/s² (au moins) et en multiple de l'accélération. */
  freinMin: 7.5,
  freinFacteur: 1.7,
  // ── L'endurance ───────────────────────────────────────────────────────────
  /** Dépense supplémentaire du sprint, par seconde simulée. */
  coutSprint: 1.4,
  /** Part de la dépense de course normale (le moteur ajoute déjà la fatigue condensée au match de dix minutes). */
  depense: 0.7,
  /** Souffle repris par seconde en marchant ou à l'arrêt (hors phases arrêtées, où le moteur en rend déjà). */
  recuperation: 0.28,
  // ── Les gestes ────────────────────────────────────────────────────────────
  /** Combien de temps une demande attend avant d'être oubliée (le geste n'était pas jouable). */
  patience: 0.55,
  /** Passes : portée normale et portée de la passe sautée (m) ; risque de la sautée. */
  porteePasse: 22,
  porteePasseSautee: 32,
  risqueSautee: 0.07,
  /** Plaquage : portée à laquelle on peut s'y jeter (m), allonge une fois lancé (m), durée de l'armé (s). */
  porteePlaquage: 3.4,
  allongePlaquage: 2.5,
  dureePlaquage: 0.9,
  // ── Le plongeon dirigé (Correctif 23, niveau 4) : plus de plaquage « missile » ─────────────────────────────
  /** On peut se jeter dès que le porteur adverse est à cette distance (m) : trop tôt, on tombe dans le vide. */
  porteeLancer: 7.5,
  /** Durée du plongeon (s) et allonge de contact pendant qu'il dure (m). */
  dureeLancer: 0.72,
  allongeLancer: 1.85,
  /** Aide de visée légère : le cap peut se redresser vers le porteur de cette vitesse (rad/s), s'il est dans ce cône (rad). Jamais 90°. */
  aideLancerVitesse: 0.5,
  aideLancerCone: 0.5,
  /** Raffut et crochet : durée de l'armé (s) ; le geste n'agit qu'au contact. */
  dureeGeste: 1.3,
  /** Recharges (s simulées). */
  rechargePlaquage: 1.1,
  rechargeRaffut: 1.2,
  rechargeCrochet: 1.0,
  rechargeFeinte: 2.2,
  rechargeAppel: 2.6,
  rechargeGrattage: 4,
  /** Un drop se tente une fois : tant qu'il n'est pas retombé, on n'en tente pas un autre. */
  rechargeDrop: 6,
  /** Le drop se tente d'au plus cette distance de la ligne (m) ; au-delà, le bouton reste grisé. */
  porteeDrop: 50,
  /** Endurance dépensée. */
  coutPlaquage: 2.2,
  coutRaffut: 1.4,
  coutCrochet: 1.4,
  coutGrattage: 3,
  // ── Le ruck ───────────────────────────────────────────────────────────────
  /** À moins de ce rayon (m) du ballon au sol, on peut s'engager dans le regroupement. */
  porteeRuck: 4.6,
  /** Niveau 5 : on ne gratte que si l'on est SUR le ballon — deux mètres et demi, pas un regroupement aperçu de loin. */
  porteeGrattage: 2.6,
  // ── Réclamer le ballon ────────────────────────────────────────────────────
  /** Durée de l'appel (s) ; il ne garantit rien : l'IA lit et décide. */
  dureeAppel: 5,
  /** Chance par pas qu'un porteur serve un appelant parfaitement démarqué (le score la module). */
  chanceAppel: 0.34,
  /** Un appel en dessous de ce score n'est même pas entendu. */
  seuilAppel: 0.12,
  // ── Le placement ──────────────────────────────────────────────────────────
  /** Écart (m) au poste que l'IA lui aurait donné, au-delà duquel on le dit. */
  ecartPoste: 16,
  /** Secondes hors poste avant que l'équipe en compense l'absence (défense). */
  delaiCompensation: 3.5,
} as const;

// ---------------------------------------------------------------------------
// LES TYPES
// ---------------------------------------------------------------------------

/** Ce que le joueur tient entre les doigts, relu par le moteur à chaque pas. */
export interface CommandeDirecte {
  /** Direction voulue, repère TERRAIN, norme de 0 (rien) à 1 (stick à fond). */
  mx: number;
  my: number;
  sprint: boolean;
}

export type ActionDirecte =
  | 'pousser' | 'quitter' | 'passe' | 'coupDePied' | 'raffut' | 'crochet' | 'plaquage' | 'grattage'
  | 'appel' | 'feinte' | 'engager' | 'drop';

export interface DemandeDirecte {
  action: ActionDirecte;
  /** Instant simulé de la demande, posé par `demanderDirect` : c'est ce qui la fait expirer. */
  t?: number;
  /** Le même instant, au dixième de pas près : le pas de simulation en cours compris (c'est lui que le geste en rythme juge). */
  tr?: number;
  /** Passe, crochet, feinte : de quel côté, en vecteur unitaire TERRAIN (le « gauche » de l'écran). */
  vers?: Vec;
  /** Passe sautée : un joueur de plus loin, plus de risque. */
  longue?: boolean;
  /** Coup de pied : direction unitaire (terrain), puissance de 0 à 1, vivacité du geste de 0 à 1. */
  visee?: { x: number; y: number; puissance: number; vif?: number };
  /** Coup de pied sans visée : le moteur choisit selon la situation (appui bref). */
  auto?: boolean;
  /** Quitter un pack : ramasser et partir, passer au 9, se détacher (Correctif 23). */
  sortie?: 'ramasser' | 'passer' | 'detacher';
}

/** Ce que l'appel du joueur dit à l'IA : où il se tient, et ce qu'il demande. */
export type TypeAppel = 'large' | 'intervalle' | 'soutien' | 'profondeur' | 'cellule';

export interface AppelEnCours {
  depuis: number;
  fin: number;
  type: TypeAppel;
  /** Ce que valait l'appel quand il a été lancé : démarqué, bien placé, à portée. */
  force: number;
  /** Il a eu son ballon (ou non) : la note s'en souvient. */
  servi?: boolean;
}

/** Ce que la note du match retient du JEU du joueur (champs optionnels de `StatsMatchJoueur`). */
export interface StatsDirectes {
  /** Secondes simulées de jeu ballon vivant sous contrôle direct. */
  tempsJeu: number;
  /** Secondes passées à moins de `ecartPoste` du poste que l'IA lui aurait donné, et au-delà. */
  tempsAuPoste: number;
  tempsHorsPoste: number;
  /** Secondes de soutien utile : coéquipier au ballon, lui à portée d'épaule, en jeu. */
  tempsSoutien: number;
  appels: number;
  appelsServis: number;
  appelsIgnores: number;
  passesInterceptees: number;
  ballonsPerdus: number;
  fautes: number;
  /** Plaquages lancés dans le vide : la différence avec `plaquagesManques`, qui est un duel perdu. */
  plaquagesDansLeVide: number;
  /** Passes données et reçues par un coéquipier (sans en-avant ni interception). */
  passesReussies: number;
}

export function statsDirectesVides(): StatsDirectes {
  return {
    tempsJeu: 0, tempsAuPoste: 0, tempsHorsPoste: 0, tempsSoutien: 0, appels: 0, appelsServis: 0,
    appelsIgnores: 0, passesInterceptees: 0, ballonsPerdus: 0, fautes: 0, plaquagesDansLeVide: 0, passesReussies: 0,
  };
}

/** Pourquoi le joueur ne conduit pas son pion à cet instant (l'écran l'explique). */
export type RaisonDirect =
  | 'banc' | 'carton' | 'melee' | 'touche' | 'penalite' | 'tir' | 'ruck' | 'sol' | 'engage'
  | 'pied' | 'arret' | 'essai' | 'mitemps' | 'maul';

/** Ce que l'écran et la scène lisent, recalculé à chaque pas du moteur. */
export interface VueDirecte {
  /** Le pion obéit au joueur. */
  libre: boolean;
  raison: RaisonDirect | null;
  /** Il tient le ballon. */
  porte: boolean;
  /** Son équipe a le ballon (ou le ruck qui vient est le sien). */
  attaque: boolean;
  /** Le poste que l'IA lui aurait donné, et l'écart qui l'en sépare. */
  suggestion: Vec | null;
  ecart: number;
  horsPoste: boolean;
  /** Il était devant le botteur : tant qu'il y est, le ballon ne le regarde pas. */
  horsJeu: boolean;
  /** Le porteur adverse à portée de plaquage (id), le ruck à portée (oui/non). */
  cibleDePlaquage: string | null;
  ruckAPortee: boolean;
  /** Un contact est imminent : la passe qu'on donne est un offload. */
  contactImminent: boolean;
  /** Ce qu'il peut jouer maintenant. */
  possible: Record<ActionDirecte, boolean>;
  /** Recharge restante de chaque geste, en secondes simulées. */
  recharge: Partial<Record<ActionDirecte, number>>;
  /** Un geste armé attend son contact (raffut, crochet, plaquage, offload). */
  arme: 'plaquage' | 'raffut' | 'crochet' | 'offload' | null;
}

/**
 * LE GESTE DU JOUEUR DANS UN PACK (Correctif 23) : poussée de mêlée, poussée de maul. Le moteur pose une partition de TEMPS
 * (`temps`) ; le joueur appuie en mesure (`pousser`), chaque appui reçoit une qualité (0 raté, 1 correct, 2 parfait), et la
 * moyenne glissante (`score`, de 0 à 1) devient ce que le joueur ajoute — ou retire — à la force de son pack.
 * Un temps non joué compte pour raté : on ne se contente pas de regarder.
 */
export type RolePack = 'pilier' | 'talonneur' | 'deuxieme' | 'troisieme' | 'huit';
/** Le métier du geste : un avant dans un pack, un sauteur ou un lifteur en touche, un gratteur au ruck. */
export type PosteGeste = RolePack | 'sauteur' | 'lifteur' | 'gratteur';
export interface PackHumain {
  type: 'melee' | 'maul' | 'touche' | 'ruck';
  poste: PosteGeste;
  /** Identifie la situation : un pack neuf repart de zéro. */
  cle: string;
  /** Ruck : le geste vit jusqu'à cet instant, même quand le regroupement est fini. */
  finA?: number;
  debut: number;
  periode: number;
  /** Les temps de la partition : instant, et qualité une fois joués. */
  temps: { t: number; q?: 0 | 1 | 2 }[];
  /** Justesse récente, de 0 à 1 (0,5 : correct). */
  score: number;
  derniere?: { t: number; q: 0 | 1 | 2 };
  /** Les appuis reçus et non encore jugés (instants simulés). */
  appuis: number[];
  /** Grattage : le premier appui a engagé le joueur dans le regroupement. */
  engage?: boolean;
  /** Le joueur a choisi de sortir du pack (3ᵉ ligne qui se détache, 8 qui part ballon en main). */
  sortie?: 'detacher' | 'ramasser' | 'passer';
  /** Niveau 5 : dans le maul de son équipe, une fois lié, il peut en sortir ballon en main ou servir le 9, quel que soit son poste. */
  libre?: boolean;
}

export interface EtatDirect {
  /** Le geste du joueur dans un pack, quand il en est. */
  pack?: PackHumain;
  /** Le numéro du ruck dont la fenêtre de grattage s'est refermée sans que le joueur se jette : elle ne revient pas. */
  fermeRuck?: number;
  actif: boolean;
  commande: CommandeDirecte;
  file: DemandeDirecte[];
  /** Le poste que l'IA lui aurait donné au dernier recalcul du placement. */
  suggestion: Vec | null;
  suggestionA: number;
  appel: AppelEnCours | null;
  /**
   * Le geste armé qui attend son contact, et jusqu'à quand. `offload` : une passe
   * demandée avec un défenseur sur soi, jouée AU contact (`vers` : le côté voulu).
   */
  arme: { action: 'plaquage' | 'raffut' | 'crochet' | 'offload'; jusqua: number; depuis: number; vers?: Vec; /** Plongeon dirigé : le cap du joueur, en radians (terrain). */ cap?: number } | null;
  /** Un pas de côté en cours : décalage latéral ajouté à la course, sans toucher au cap. */
  pasDeCote: { vers: Vec; jusqua: number; vitesse: number } | null;
  /** Recharge de chaque geste, en secondes simulées. */
  recharges: Partial<Record<ActionDirecte, number>>;
  /** Depuis quand il est le prochain maillon d'une chaîne de passes qu'il ne peut pas servir. */
  attenteChaine?: number;
  /** Ce que le dernier geste demandé a donné (l'écran le dit une seconde). */
  retour: { action: ActionDirecte; ok: boolean; raison?: string; t: number } | null;
  /** Il est pris par une action (grattage, chute) : on ne le pilote pas avant. */
  tenuJusqua: number;
  /** Depuis quand il est hors poste (pour la compensation de la défense), sinon −1. */
  horsPosteDepuis: number;
  vue: VueDirecte;
  stats: StatsDirectes;
  /** Un coup de pied se prépare (viseur affiché) : visée courante, pour la scène. */
  viseur: { x: number; y: number; puissance: number } | null;
  /** Ce que le tutoriel force (aucun effet hors tutoriel). */
  assistance?: { appelAssure?: boolean };
  /** Le saut ou le lift que le joueur vient de minuter en touche (Correctif 23) : de 0 (raté) à 1 (parfait), consommé quand la touche se tranche. */
  timingTouche?: { role: 'sauteur' | 'lifteur'; qualite: number; consomme?: boolean };
}

export function vueVide(): VueDirecte {
  return {
    libre: false, raison: 'banc', porte: false, attaque: false, suggestion: null, ecart: 0, horsPoste: false,
    horsJeu: false, cibleDePlaquage: null, ruckAPortee: false, contactImminent: false,
    possible: {
      passe: false, coupDePied: false, raffut: false, crochet: false, plaquage: false, grattage: false,
      appel: false, feinte: false, engager: false, drop: false, pousser: false, quitter: false,
    },
    recharge: {}, arme: null,
  };
}

export function creerEtatDirect(): EtatDirect {
  return {
    actif: false, commande: { mx: 0, my: 0, sprint: false }, file: [], suggestion: null, suggestionA: -99,
    appel: null, arme: null, pasDeCote: null, recharges: {}, retour: null, tenuJusqua: 0, horsPosteDepuis: -1,
    vue: vueVide(), stats: statsDirectesVides(), viseur: null,
  };
}

// ---------------------------------------------------------------------------
// OBÉIR AU JOUEUR, OU À L'IA ?
// ---------------------------------------------------------------------------

/** Les phases où le jeu appartient au joueur : ballon vivant, dans l'espace. */
const PHASES_OUVERTES = new Set(['jeuCourant', 'ballonEnLAir', 'ballonLibre']);

export function directActif(e: Pick<EtatMatch, 'direct'>): boolean { return !!e.direct?.actif; }

/** Le plaquage du joueur est un plongeon dirigé (Correctif 23, IA de niveau 4) : il peut être raté dans le vide. */
export function plongeonDirige(e: Pick<EtatMatch, 'ia'>): boolean { return (e.ia ?? 1) >= 4; }

/** Pourquoi ce pion n'obéit pas au joueur maintenant, ou `null` s'il obéit. */
export function raisonSansControle(e: EtatMatch, p: Pion): RaisonDirect | null {
  if (!p.surLeTerrain) return 'banc';
  if (p.sanction > 0) return 'carton';
  if (p.corps) return 'sol';
  if (e.direct && e.sim < e.direct.tenuJusqua) return 'engage';
  switch (e.phase) {
    case 'jeuCourant': case 'ballonEnLAir': case 'ballonLibre': break;
    case 'ruck':
      // Lié au regroupement (plaqué, plaqueur, nettoyeur, gratteur) : c'est l'IA qui le tient.
      if (p.role === 'ruck') return 'ruck';
      break;
    case 'melee': return 'melee';
    case 'touche': return 'touche';
    case 'maul': return 'maul';
    case 'penalite': return 'penalite';
    case 'tirAuBut': case 'transformation': return 'tir';
    case 'aplatissage': case 'apresEssai': case 'tmo': return 'essai';
    case 'miTemps': case 'fini': return 'mitemps';
    default: return 'arret';
  }
  // Il arme un coup de pied : il se place, puis tape.
  if (e.piedPrepare?.auteurId === p.id) return 'pied';
  return null;
}

/** Ce pion est-il piloté par le joueur à cet instant ? (La boucle de déplacement le demande à chaque image.) */
export function humainPilote(e: EtatMatch, p: Pion): boolean {
  return !!e.direct?.actif && p.moi && raisonSansControle(e, p) === null;
}

/**
 * Le ballon change de camp au regroupement : si c'était celui du joueur (il le portait quand il a été plaqué), la note
 * s'en souvient. À appeler AVANT que `e.ruck` ne soit vidé.
 */
export function noterBallonPerdu(e: Pick<EtatMatch, 'direct' | 'ruck' | 'pions'>): void {
  const d = e.direct;
  if (!d?.actif || !e.ruck?.porteurId) return;
  const moi = e.pions.find((p) => p.moi);
  if (moi && moi.id === e.ruck.porteurId) d.stats.ballonsPerdus += 1;
}

/** Le pion du joueur, seulement s'il est sous contrôle direct. */
export function pionHumain(e: EtatMatch): Pion | null {
  if (!e.direct?.actif) return null;
  for (const p of e.pions) if (p.moi) return p;
  return null;
}

/**
 * L'IA doit-elle laisser ce pion à lui-même ? Plus large que `humainPilote` : un
 * pion humain lié à un regroupement est conduit par l'IA, mais PAS recomposé dans
 * une cellule, un bloc ou une ligne comme s'il n'avait rien décidé.
 */
export function humainLibreDeLIA(e: Pick<EtatMatch, 'direct'>, p: Pion): boolean {
  return !!e.direct?.actif && p.moi && p.surLeTerrain && p.sanction <= 0;
}

// ---------------------------------------------------------------------------
// LA CONSOLE : ce que l'hôte pose dans l'état
// ---------------------------------------------------------------------------

export function activerDirect(e: EtatMatch, actif: boolean): void {
  const d = e.direct ??= creerEtatDirect();
  d.actif = actif;
  if (!actif) {
    d.commande = { mx: 0, my: 0, sprint: false };
    d.file = [];
    d.arme = null;
    d.pasDeCote = null;
    d.viseur = null;
    d.vue = vueVide();
    return;
  }
  // Les gestes du pilotage passent par la machinerie du joueur aux commandes (`resoudrePlaquage`, `phaseRuck`).
  e.controle = true;
  // Les cartes de décision et le pilotage direct ne se mêlent jamais : un seul ordre à la fois.
  e.intention = null;
}

/** La commande de l'image : stick et sprint, norme bornée à 1. */
export function commanderDirect(e: EtatMatch, mx: number, my: number, sprint: boolean): void {
  const d = e.direct;
  if (!d?.actif) return;
  const n = Math.hypot(mx, my);
  const k = n > 1 ? 1 / n : 1;
  d.commande.mx = Number.isFinite(mx) ? mx * k : 0;
  d.commande.my = Number.isFinite(my) ? my * k : 0;
  d.commande.sprint = sprint;
}

/** Un geste demandé : il est joué au prochain pas du moteur s'il est jouable, oublié sinon. */
export function demanderDirect(e: EtatMatch, demande: DemandeDirecte): void {
  const d = e.direct;
  if (!d?.actif) return;
  // Une file courte : un joueur qui martèle un bouton ne planifie pas dix passes.
  if (d.file.length >= 4) d.file.shift();
  d.file.push({ ...demande, t: e.sim, tr: e.sim + Math.min(e.reliquat ?? 0, 0.15) });
}

/** Le viseur d'un coup de pied en préparation (scène) ; `null` pour l'éteindre. */
export function poserViseur(e: EtatMatch, viseur: EtatDirect['viseur']): void {
  if (e.direct?.actif) e.direct.viseur = viseur;
}

/** Les recharges fondent avec le temps simulé (une fois par pas). */
export function refroidirDirect(e: EtatMatch, dt: number): void {
  const d = e.direct;
  if (!d) return;
  for (const cle of Object.keys(d.recharges) as ActionDirecte[]) {
    const reste = (d.recharges[cle] ?? 0) - dt;
    if (reste <= 0) delete d.recharges[cle]; else d.recharges[cle] = reste;
  }
}

// ---------------------------------------------------------------------------
// LA COURSE : un cap et une allure qu'on infléchit
// ---------------------------------------------------------------------------

/** Les efforts de sprint selon la fraîcheur : comme l'intention `sprint` des cartes. */
export function effortDeSprint(p: Pion): number {
  const R = REGLAGES_DIRECT;
  // Deux réserves : c'est la barre de sprint qui dit si l'on en a encore sous le pied, pas l'endurance générale.
  if (p.deuxReserves) return p.sprint < 25 ? R.sprintMoyen : R.sprintFrais;
  return p.endurance < 25 ? R.sprintPlat : p.endurance < 45 ? R.sprintMoyen : R.sprintFrais;
}

/** La vitesse que le pion tient à cette commande, en m/s : sa course, ou sa pointe en sprint. */
export function vitesseVoulue(p: Pion, norme: number, sprint: boolean): number {
  const R = REGLAGES_DIRECT;
  const disponible = vitesseDisponible(p);
  const sprinte = sprint && peutSprinter(p) && norme > 0.2;
  const plein = sprinte ? disponible * effortDeSprint(p) : disponible * R.course;
  // Une commande partielle donne une allure partielle ; sous 0,18 on ne bouge pas (zone morte).
  const k = norme < 0.18 ? 0 : sprinte ? 1 : Math.pow(borner((norme - 0.12) / 0.88, 0, 1), 0.85);
  return Math.min(R.plafondVitesse, plein * k);
}

const enRadians = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * UNE IMAGE DE COURSE HUMAINE. Renvoie les mètres parcourus.
 *
 * ⚠️ LA VITESSE RESTE UN VECTEUR, comme pour les vingt-neuf autres (`deplacer`),
 * mais on la gouverne en cap et en allure. Le cap tourne à un taux borné par
 * l'agilité (accélération latérale ÷ vitesse : un ailier lancé décrit un arc, il
 * ne pivote pas sur un point), l'allure monte avec l'accélération du joueur et
 * retombe avec son freinage — et un virage serré ralentit, ce qui est vrai à
 * quarante kilomètres à l'heure. À l'arrêt, on se tourne sur place d'un appui.
 */
export function deplacerHumain(p: Pion, dt: number, cmd: CommandeDirecte, decalage?: Vec | null): number {
  const R = REGLAGES_DIRECT;
  if (p.corps) return 0;
  const norme = Math.hypot(cmd.mx, cmd.my);
  const sprinte = cmd.sprint && peutSprinter(p) && norme > 0.2;
  let voulue = vitesseVoulue(p, norme, cmd.sprint);
  const vivacite = p.deuxReserves ? facteurAcceleration(p) : 0.65 + 0.35 * (p.endurance / 100);
  const acc = p.acceleration * vivacite * R.vivacite;
  const frein = Math.max(R.freinMin, acc * R.freinFacteur);

  const v = Math.hypot(p.vitesse.x, p.vitesse.y);
  const aUnCap = norme >= 0.18;
  const capVoulu = aUnCap ? Math.atan2(cmd.my, cmd.mx) : 0;
  let cap = v > 0.3 ? Math.atan2(p.vitesse.y, p.vitesse.x) : capVoulu;
  if (aUnCap) {
    const ecart = enRadians(capVoulu - cap);
    const taux = Math.min(R.virageMax, (acc * R.agilite) / Math.max(v, 2.5));
    const pas = borner(ecart, -taux * dt, taux * dt);
    cap += pas;
    // Plus le virage qui reste est large, plus on lève le pied.
    const reste = Math.abs(ecart) - Math.abs(pas);
    const t = borner((reste - 0.35) / 2.05, 0, 1);
    voulue *= 1 - 0.65 * t * t * (3 - 2 * t);
  }
  const allure = voulue > v ? Math.min(voulue, v + acc * dt) : Math.max(voulue, v - frein * dt);
  p.vitesse.x = Math.cos(cap) * allure;
  p.vitesse.y = Math.sin(cap) * allure;
  // À l'arrêt complet, on n'invente pas un cap.
  if (allure < 0.02) { p.vitesse.x = 0; p.vitesse.y = 0; }

  const avantX = p.pos.x, avantY = p.pos.y;
  // Un pas de côté déplace le corps sans changer la course : le cap garde le jeu devant lui.
  const lx = decalage ? decalage.x * dt : 0, ly = decalage ? decalage.y * dt : 0;
  p.pos.x = borner(p.pos.x + p.vitesse.x * dt + lx, -1.5, LONGUEUR + 1.5);
  p.pos.y = borner(p.pos.y + p.vitesse.y * dt + ly, -1.5, LARGEUR + 1.5);
  const pas = Math.hypot(p.pos.x - avantX, p.pos.y - avantY);
  // Ce que lisent les autres (placement, poursuite) : où il va, et à quelle allure.
  p.cible = { x: p.pos.x + p.vitesse.x * 0.6, y: p.pos.y + p.vitesse.y * 0.6 };
  p.effort = Math.min(1.2, allure / Math.max(1, vitesseDisponible(p)));

  // L'endurance : la dépense de course du moteur, un peu atténuée, plus le sprint ; on souffle en marchant.
  p.stats.distanceParcourue += pas;
  if (p.deuxReserves) {
    // Les deux réserves : la course normale coûte peu, le sprint vide la barre, ralentir la recharge.
    pasEndurance(p, dt, Math.min(1, pas / dt / p.vitesseMax), sprinte ? 1 : 0);
    return pas;
  }
  if (pas > 0) {
    const intensite = Math.min(1, pas / dt / p.vitesseMax);
    p.endurance = Math.max(0, p.endurance - p.usure * dt * intensite ** 1.6 * 10 * R.depense);
    if (intensite < 0.36) p.endurance = Math.min(100, p.endurance + R.recuperation * dt * (1 - intensite / 0.36));
  } else p.endurance = Math.min(100, p.endurance + R.recuperation * dt);
  if (sprinte) p.endurance = Math.max(0, p.endurance - R.coutSprint * dt);
  return pas;
}

// ---------------------------------------------------------------------------
// LES PASSES : à qui, de quel côté, jusqu'où
// ---------------------------------------------------------------------------

export interface ReceveurPossible {
  pion: Pion;
  /** Où il est par rapport au porteur : distance, retrait (positif : derrière), décalage dans le sens demandé. */
  distance: number;
  retrait: number;
  lateral: number;
  coupee: boolean;
}

/**
 * Les partenaires auxquels on peut donner, du côté demandé.
 *
 * ⚠️ JAMAIS EN AVANT, et c'est le moteur qui l'a décidé avant nous : la liste ne
 * propose que ceux qui sont à hauteur ou derrière. Une passe « tactile » un peu
 * de travers part donc vers quelqu'un, pas dans le décor (c'est l'aide à la
 * passe : « le système peut légèrement aider la direction »).
 */
export function receveursDuCote(e: EtatMatch, p: Pion, vers: Vec, longue = false): ReceveurPossible[] {
  const s = sens(p.cote);
  const portee = longue ? REGLAGES_DIRECT.porteePasseSautee : REGLAGES_DIRECT.porteePasse;
  const n = Math.hypot(vers.x, vers.y) || 1;
  const ux = vers.x / n, uy = vers.y / n;
  const sortie: ReceveurPossible[] = [];
  for (const q of e.pions) {
    if (q === p || q.cote !== p.cote || !attaquantLibre(q)) continue;
    const dx = q.pos.x - p.pos.x, dy = q.pos.y - p.pos.y;
    const d = Math.hypot(dx, dy);
    if (d < 1.4 || d > portee) continue;
    const retrait = -dx * s;
    // À hauteur ou derrière : jamais plus d'un demi-mètre devant le passeur.
    if (retrait < -0.5) continue;
    const lateral = dx * ux + dy * uy;
    // Du bon côté : un cône d'environ 75° autour du sens voulu, quelle que soit la profondeur.
    if (lateral < 1 || lateral < d * 0.26) continue;
    sortie.push({ pion: q, distance: d, retrait, lateral, coupee: !!ligneDePasseCoupee(e, p, q) });
  }
  return sortie.sort((a, b) => a.distance - b.distance);
}

/**
 * Le receveur d'une passe demandée : le plus proche du bon côté (passe courte),
 * ou un joueur de plus loin (passe sautée : on saute le premier).
 */
export function choisirReceveur(e: EtatMatch, p: Pion, vers: Vec, longue: boolean): Pion | null {
  const liste = receveursDuCote(e, p, vers, longue);
  if (!liste.length) return null;
  // Entre deux hommes à peu près aussi proches, celui dont la ligne n'est pas coupée.
  const libres = liste.filter((r) => !r.coupee);
  const pool = libres.length ? libres : liste;
  if (!longue) return pool[0]?.pion ?? null;
  // Sautée : le premier est ignoré, on vise le suivant (au moins 8 m), à défaut le plus loin.
  const loin = pool.filter((r) => r.distance >= 8 && r.pion !== liste[0]?.pion);
  return (loin[0] ?? pool[pool.length - 1])?.pion ?? null;
}

// ---------------------------------------------------------------------------
// LE COUP DE PIED : de la visée à l'intention du moteur
// ---------------------------------------------------------------------------

export interface PlanDePied {
  intention: IntentionPied;
  arrivee: Vec;
  duree: number;
  hauteur: number;
  /** Ce qu'on dira : rasant, par-dessus, chandelle, dégagement… (clé du fil). */
  libelle: string;
}

/** Portée d'un botteur, comme `taperAuPied` (24 + pied/3,2) : un dégagement pro fait 40 à 55 m. */
export function porteeDeFrappe(p: Pion): number { return 24 + p.pied / 3.2; }

/** Le défenseur debout le plus proche DEVANT, en mètres (99 s'il n'y en a pas). */
function defenseurDevant(e: EtatMatch, p: Pion): number {
  const s = sens(p.cote);
  let d2 = Infinity;
  for (const q of e.pions) {
    if (q.cote === p.cote || !q.surLeTerrain || q.sanction > 0 || q.corps) continue;
    const dx = (q.pos.x - p.pos.x) * s;
    if (dx < -0.3) continue;
    const dy = Math.abs(q.pos.y - p.pos.y);
    if (dy > 7 + dx * 0.4) continue;
    d2 = Math.min(d2, distance2(q.pos, p.pos));
  }
  return d2 === Infinity ? 99 : Math.sqrt(d2);
}

/** La touche vers laquelle on tape : y = −1 ou LARGEUR + 1. */
function versLaTouche(p: Pion, dirY: number): number {
  return dirY < 0 ? -1 : dirY > 0 ? LARGEUR + 1 : p.pos.y < AXE ? -1 : LARGEUR + 1;
}

/**
 * LA VISÉE DEVIENT UN COUP DE PIED.
 *
 * ⚠️ LE TYPE SE LIT DANS LE GESTE ET DANS LA SITUATION, jamais dans un menu :
 * puissance faible et rideau devant → par-dessus ; faible sans défenseur → rasant ;
 * moyenne vers l'avant → chandelle ; vers la touche avec de la puissance →
 * dégagement (ou 50/22 depuis son camp) ; en travers avec un ailier en face →
 * passe au pied ; sinon occupation.
 *
 * `visee.puissance` : 0 = une touche, 1 = tout ce que le pied sait faire. Sans
 * visée (`auto`), c'est la situation qui parle — comme `intentionDePied`, mais
 * sans tirage : le même ballon donne toujours le même coup de pied.
 */
export function classerCoupDePied(e: EtatMatch, p: Pion, demande: Pick<DemandeDirecte, 'visee' | 'auto'>): PlanDePied {
  const s = sens(p.cote);
  const portee = porteeDeFrappe(p);
  const devant = defenseurDevant(e, p);
  const restant = metresAvantLaLigne(p.pos, p.cote);
  const chezSoi = dansSes22(p.pos, p.cote);
  const sonCamp = dansSonCamp(p.pos, p.cote);
  const bornerX = (x: number) => borner(x, LIGNE_A + 1, LIGNE_B - 1);

  // ── Sans visée : la situation décide ────────────────────────────────────
  if (!demande.visee) {
    const vers = e.ouvert; // le côté ouvert : là où il y a de l'espace
    if (chezSoi) {
      // Dans ses 22 : on sort en touche, de son côté si possible.
      const longueur = Math.min(portee, 46);
      return { intention: 'degagement', arrivee: { x: bornerX(p.pos.x + s * longueur), y: versLaTouche(p, p.pos.y < AXE ? -1 : 1) }, duree: 2.7, hauteur: 0.5, libelle: 'degagement' };
    }
    if (devant < 9 && !p.avant && restant > 12) {
      return { intention: 'parDessus', arrivee: { x: bornerX(p.pos.x + s * 11), y: borner(p.pos.y + vers * 3, 3, LARGEUR - 3) }, duree: 1.2, hauteur: 0.5, libelle: 'parDessus' };
    }
    if (restant < 30) {
      return { intention: 'rasant', arrivee: { x: bornerX(p.pos.x + s * 14), y: borner(p.pos.y + vers * 5, 4, LARGEUR - 4) }, duree: 1.35, hauteur: 0.1, libelle: 'rasant' };
    }
    if (p.numero === 9) {
      return { intention: 'chandelle', arrivee: { x: bornerX(p.pos.x + s * 22), y: borner(p.pos.y + vers * 7, 4, LARGEUR - 4) }, duree: 3.2, hauteur: 1, libelle: 'chandelle' };
    }
    const longueur = Math.min(portee, 44);
    return { intention: 'occupation', arrivee: { x: bornerX(p.pos.x + s * longueur), y: borner(p.pos.y + vers * 6, 4, LARGEUR - 4) }, duree: 1.4 + longueur / 24, hauteur: 0.55, libelle: 'occupation' };
  }

  // ── Avec visée ──────────────────────────────────────────────────────────
  const v = demande.visee;
  const n = Math.hypot(v.x, v.y) || 1;
  const ux = v.x / n, uy = v.y / n;
  const puissance = borner(v.puissance, 0, 1);
  // Angle avec l'axe d'attaque : 0 = droit devant, 90° = en travers.
  const avant = ux * s;
  const angle = Math.acos(borner(avant, -1, 1)) * 180 / Math.PI;
  const dist = borner(5 + (portee * 1.08 - 5) * Math.pow(puissance, 0.9), 5, portee * 1.1);
  const cible = (longueur: number): Vec => ({
    x: bornerX(p.pos.x + ux * longueur),
    y: borner(p.pos.y + uy * longueur, -1, LARGEUR + 1),
  });
  // Un coup de pied vers l'arrière n'existe pas : il part au pied du porteur, vers l'avant.
  if (avant < 0.08) {
    const l = borner(dist * 0.5, 6, 18);
    return { intention: 'rasant', arrivee: { x: bornerX(p.pos.x + s * l), y: borner(p.pos.y + uy * l, 3, LARGEUR - 3) }, duree: 0.9 + l / 22, hauteur: 0.1, libelle: 'rasant' };
  }

  // Petit coup de pied : par-dessus le rideau s'il est devant et proche, rasant sinon.
  if (puissance < 0.3) {
    const l = borner(dist, 7, 14);
    const a = cible(l);
    if (angle < 55 && devant < 12 && !p.avant) {
      return { intention: 'parDessus', arrivee: { x: a.x, y: borner(a.y, 3, LARGEUR - 3) }, duree: 1.2, hauteur: 0.5, libelle: 'parDessus' };
    }
    return { intention: 'rasant', arrivee: { x: a.x, y: borner(a.y, 3, LARGEUR - 3) }, duree: 0.9 + l / 22, hauteur: 0.1, libelle: 'rasant' };
  }

  // En travers, avec un ailier ou un arrière à servir de ce côté-là : la passe au pied.
  if (angle > 38 && angle < 105 && puissance >= 0.4 && puissance <= 0.88 && !p.avant) {
    const cibleAilier = e.pions
      .filter((q) => q !== p && q.cote === p.cote && attaquantLibre(q) && (q.pos.x - p.pos.x) * s <= 0.6
        && ((q.pos.y - p.pos.y) * uy > 0) && Math.abs(q.pos.y - p.pos.y) > 9)
      .sort((a, b) => Math.abs(b.pos.y - p.pos.y) - Math.abs(a.pos.y - p.pos.y))[0];
    if (cibleAilier) {
      const largeur = Math.abs(cibleAilier.pos.y - p.pos.y);
      const duree = borner(1.55 + largeur / 30, 1.8, 2.9);
      const course = Math.min(cibleAilier.vitesseMax * duree * 0.62, 18);
      return {
        intention: 'transversale',
        arrivee: { x: bornerX(cibleAilier.pos.x + s * course * 0.7), y: borner(cibleAilier.pos.y, 3.5, LARGEUR - 3.5) },
        duree, hauteur: 0.9, libelle: 'transversale',
      };
    }
  }

  // Une chandelle : vers l'avant, hauteur et suspension plutôt que longueur.
  if (puissance < 0.62 && angle < 60) {
    const l = borner(dist, 14, 30);
    const a = cible(l);
    return { intention: 'chandelle', arrivee: { x: a.x, y: borner(a.y, 4, LARGEUR - 4) }, duree: 3.1 + l / 80, hauteur: 1, libelle: 'chandelle' };
  }

  // La ligne visée atteint-elle la touche avant d'avoir donné toute sa longueur ? Alors c'est un coup de pied en touche.
  const versLaLigne = Math.abs(uy) > 0.3
    ? (uy < 0 ? p.pos.y / -uy : (LARGEUR - p.pos.y) / uy) : Infinity;
  if (puissance >= 0.5 && versLaLigne <= dist * 1.03) {
    const arrivee = { x: bornerX(p.pos.x + ux * versLaLigne), y: versLaTouche(p, uy) };
    const reste = metresAvantLaLigne(arrivee, p.cote);
    // 50/22 : tapé de son camp (hors de ses 22), le ballon sort dans les 22 adverses.
    const cinquanteVingtDeux = sonCamp && !chezSoi && reste <= 22 && reste > -1;
    return {
      intention: cinquanteVingtDeux ? 'cinquanteVingtDeux' : 'degagement', arrivee,
      duree: cinquanteVingtDeux ? 2.8 : borner(1.3 + versLaLigne / 24, 1.5, 3.1), hauteur: cinquanteVingtDeux ? 0.6 : 0.5,
      libelle: cinquanteVingtDeux ? 'cinquanteVingtDeux' : 'degagement',
    };
  }
  const a = cible(dist);
  return { intention: 'occupation', arrivee: { x: a.x, y: borner(a.y, 2, LARGEUR - 2) }, duree: borner(1.3 + dist / 24, 1.5, 3.1), hauteur: 0.25 + 0.4 * puissance, libelle: 'occupation' };
}

// ---------------------------------------------------------------------------
// RÉCLAMER LE BALLON : ce que l'IA entend
// ---------------------------------------------------------------------------

/**
 * Ce que vaut l'appel du joueur au moment où il le lance, de 0 à 1, et de quel
 * genre il est — l'IA le lit comme un partenaire l'entendrait.
 *
 * ⚠️ UN APPEL NE GARANTIT RIEN. Démarqué, bien placé, à portée d'une passe :
 * l'IA l'entend presque toujours. Couvert : elle peut l'ignorer. Devant le ballon
 * ou à l'autre bout du terrain : elle ne le voit même pas.
 *
 * Les genres : « large » (ailier ou centre ouverts, le surnombre), « intervalle »
 * (il attaque un trou du rideau), « soutien » (il revient à l'intérieur, à
 * l'épaule), « profondeur » (il est lancé derrière la ligne, pour un petit
 * coup de pied ou une passe longue), « cellule » (il est derrière un bloc d'avants).
 */
export function jugerAppel(e: EtatMatch, p: Pion, porteur: Pion | null): { force: number; type: TypeAppel } {
  const ref: Vec = porteur ? porteur.pos : e.ballon;
  const s = sens(p.cote);
  const retrait = (ref.x - p.pos.x) * s;          // positif : il est derrière le ballon
  const lateral = Math.abs(p.pos.y - ref.y);
  const d = distance(p.pos, ref);
  // Le marquage : le défenseur debout le plus proche.
  let marque = 60;
  for (const q of e.pions) {
    if (q.cote === p.cote || !q.surLeTerrain || q.sanction > 0 || q.corps) continue;
    marque = Math.min(marque, distance(p.pos, q.pos));
  }
  const demarque = borner((marque - 1.6) / 6, 0, 1);
  // Derrière le ballon : tout vaut quelque chose ; devant (en avant), rien — une passe n'y va pas.
  const angle = borner(1 - Math.max(0, -retrait) / 2.5, 0, 1) * borner(1 - Math.max(0, retrait - 12) / 10, 0.2, 1);
  const portee = borner(1 - Math.max(0, d - 16) / 14, 0, 1);
  // Lancé dans la profondeur : derrière le ballon, à pleine course, avec de l'espace devant lui.
  const vitesseAvant = p.vitesse.x * s;
  let libreDevant = 99;
  for (const q of e.pions) {
    if (q.cote === p.cote || !q.surLeTerrain || q.sanction > 0 || q.corps) continue;
    const dx = (q.pos.x - p.pos.x) * s;
    if (dx > 0 && Math.abs(q.pos.y - p.pos.y) < 5 + dx * 0.25) libreDevant = Math.min(libreDevant, dx);
  }
  let type: TypeAppel = 'soutien';
  if (lateral > 14) type = 'large';
  else if (e.cellule && p.avant && retrait > 0) type = 'cellule';
  else if (vitesseAvant > 4.2 && retrait >= -0.5 && retrait < 10 && libreDevant > 7) type = 'profondeur';
  else if (lateral > 6 && retrait > 1.5) type = 'intervalle';
  // Le genre d'appel bien joué vaut un peu plus : un large démarqué est une vraie option.
  const bonus = type === 'large' ? 1.06 : type === 'intervalle' ? 1.1 : type === 'profondeur' ? 1.12 : 1;
  // Un joueur collé à son défenseur n'est pas une option, même bien placé : le marquage pèse d'abord.
  const force = borner(demarque * 0.7 + 0.3 * angle * portee * Math.min(1, demarque * 2 + 0.25), 0, 1) * bonus
    * (retrait < -0.5 ? 0 : 1);
  return { force: borner(force, 0, 1), type };
}

/** L'appel est-il encore en vigueur ? */
export function appelEnCours(e: EtatMatch): AppelEnCours | null {
  const a = e.direct?.appel;
  return a && e.sim < a.fin ? a : null;
}

/**
 * La chance qu'un porteur de l'IA serve le joueur à ce pas.
 *
 * ⚠️ LE SCORE EST RECALCULÉ À CHAQUE PAS, pas figé au moment de l'appel : si le
 * joueur se fait marquer après avoir appelé, on ne lui donne plus. Et un appel
 * « à vide » (personne n'est dans le rôle qu'il annonce) se perd tout seul.
 */
export function chanceDeLeServir(e: EtatMatch, porteur: Pion, humain: Pion): number {
  const a = appelEnCours(e);
  if (!a || porteur === humain || porteur.cote !== humain.cote) return 0;
  const s = sens(porteur.cote);
  if ((humain.pos.x - porteur.pos.x) * s > 0.5) return 0;
  if (!attaquantLibre(humain) || humain.battu > 0.3) return 0;
  const d = distance(porteur.pos, humain.pos);
  if (d < 2 || d > REGLAGES_DIRECT.porteePasse) return 0;
  const { force } = jugerAppel(e, humain, porteur);
  const assure = e.direct?.assistance?.appelAssure ? 0.6 : 0;
  if (ligneDePasseCoupee(e, porteur, humain)) return Math.max(0, force - 0.45) * REGLAGES_DIRECT.chanceAppel * 0.4;
  if (force < REGLAGES_DIRECT.seuilAppel && !assure) return 0;
  // Par pas de 0,15 s : démarqué, il est servi en une ou deux secondes ; à demi couvert, une fois sur trois.
  return borner(Math.pow(force, 1.6) * REGLAGES_DIRECT.chanceAppel + assure, 0, 0.9);
}

// ---------------------------------------------------------------------------
// LE PLAQUAGE ET LE REGROUPEMENT : qui est à portée
// ---------------------------------------------------------------------------

/** Le porteur adverse que le joueur peut plaquer, s'il est à portée. */
export function cibleDePlaquage(e: EtatMatch, p: Pion, portee: number = REGLAGES_DIRECT.porteePlaquage): Pion | null {
  const porteur = e.porteur;
  if (!porteur || porteur.cote === p.cote || e.phase !== 'jeuCourant' || porteur.corps) return null;
  return distance(p.pos, porteur.pos) <= portee ? porteur : null;
}

/**
 * LE GRATTAGE EST-IL POSSIBLE, LÀ, POUR CE DÉFENSEUR ? (niveau 5)
 *
 * Demande : « Le bouton ne doit devenir actif que si le joueur remplit réellement les conditions. » Il faut être debout, sur
 * le ballon, y être entré par son camp (pas par le côté ni de dos), et que le ruck ne soit pas déjà fermé : deux soutiens
 * liés au-dessus du ballon, et les mains n'y vont plus — ce serait une faute.
 */
export function peutGratter(e: EtatMatch, p: Pion): boolean {
  const ruck = e.ruck;
  if (e.phase !== 'ruck' || !ruck || ruck.duel || p.cote === ruck.attaque) return false;
  if (!p.surLeTerrain || p.sanction > 0 || p.corps || p.battu > 0) return false;
  if (distance(p.pos, e.ballon) > REGLAGES_DIRECT.porteeGrattage) return false;
  if ((p.pos.x - e.ballon.x) * sens(ruck.attaque) < -0.6) return false;
  let lies = 0;
  for (const q of e.pions) {
    if (q.cote !== ruck.attaque || !q.surLeTerrain || q.corps || q.id === ruck.porteurId) continue;
    const dx = q.pos.x - e.ballon.x, dy = q.pos.y - e.ballon.y;
    if (dx * dx + dy * dy < 1.3 * 1.3) lies += 1;
  }
  return lies < 2;
}

/** Le regroupement est-il assez près pour s'y engager ? */
export function ruckAPortee(e: EtatMatch, p: Pion, portee: number = REGLAGES_DIRECT.porteeRuck): boolean {
  return e.phase === 'ruck' && !!e.ruck && distance(p.pos, e.ballon) <= portee;
}

// ---------------------------------------------------------------------------
// LE POSTE QUE L'IA LUI AURAIT DONNÉ
// ---------------------------------------------------------------------------

/**
 * Appelée juste après le placement tactique : la cible que l'IA vient de poser
 * au pion du joueur est SON poste du moment. On la garde, c'est elle que
 * l'aide au placement montre — et qui sert à juger s'il tient son rôle.
 */
export function memoriserSuggestion(e: EtatMatch): void {
  const d = e.direct;
  if (!d?.actif) return;
  const p = e.pions.find((q) => q.moi);
  if (!p || !p.surLeTerrain || p === e.porteur) return;
  d.suggestion = { x: borner(p.cible.x, LIGNE_A - 4, LIGNE_B + 4), y: borner(p.cible.y, 2, LARGEUR - 2) };
  d.suggestionA = e.sim;
}

/** Une suggestion encore fraîche (le placement est recalculé toutes les 0,45 s). */
export function suggestionFraiche(e: EtatMatch): Vec | null {
  const d = e.direct;
  if (!d?.actif || !d.suggestion || e.sim - d.suggestionA > 2.5) return null;
  return d.suggestion;
}

// ---------------------------------------------------------------------------
// LA VUE : ce que l'écran et la scène lisent
// ---------------------------------------------------------------------------

/**
 * Recalcule `e.direct.vue` (à chaque pas du moteur) : peut-il conduire, que
 * peut-il jouer, qui est à plaquer, où est son poste.
 */
export function majVueDirecte(e: EtatMatch): void {
  const d = e.direct;
  if (!d?.actif) return;
  const p = e.pions.find((q) => q.moi);
  const v = d.vue = vueVide();
  if (!p) return;
  const raison = raisonSansControle(e, p);
  v.libre = raison === null;
  v.raison = raison;
  v.porte = e.porteur === p;
  v.attaque = e.possession === p.cote;
  v.horsJeu = p.horsJeu;
  const sug = suggestionFraiche(e);
  v.suggestion = sug;
  v.ecart = sug ? distance(p.pos, sug) : 0;
  v.horsPoste = !!sug && !v.porte && v.ecart > REGLAGES_DIRECT.ecartPoste;
  const recharge = (a: ActionDirecte): number => Math.max(0, d.recharges[a] ?? 0);
  const libre = v.libre && p.battu <= 0;
  const ouvert = PHASES_OUVERTES.has(e.phase);
  const cible = libre ? cibleDePlaquage(e, p) : null;
  v.cibleDePlaquage = cible?.id ?? null;
  v.ruckAPortee = libre && ruckAPortee(e, p);
  // Un contact est imminent quand un défenseur debout est à moins de 2,4 m devant le porteur.
  if (v.porte) {
    const s = sens(p.cote);
    for (const q of e.pions) {
      if (q.cote === p.cote || !q.surLeTerrain || q.sanction > 0 || q.corps || q.battu > 0) continue;
      const devant = (q.pos.x - p.pos.x) * s;
      if (devant > -0.6 && distance2(q.pos, p.pos) < 2.4 * 2.4) { v.contactImminent = true; break; }
    }
  }
  // Ce qui est jouable.
  const poss = v.possible;
  poss.passe = libre && v.porte && e.phase === 'jeuCourant' && !e.vol;
  poss.coupDePied = libre && v.porte && e.phase === 'jeuCourant' && !e.vol;
  poss.raffut = libre && v.porte && recharge('raffut') <= 0;
  poss.crochet = libre && v.porte && recharge('crochet') <= 0;
  poss.feinte = libre && v.porte && !p.avant && recharge('feinte') <= 0;
  // Niveau 4 : on peut se jeter dès que le porteur est à `porteeLancer` — la distance n'est plus une garantie de contact.
  poss.plaquage = libre && recharge('plaquage') <= 0 && (!!cible || (plongeonDirige(e) && !!cibleDePlaquage(e, p, REGLAGES_DIRECT.porteeLancer)));
  poss.grattage = libre && ((e.ia ?? 1) >= 5 ? peutGratter(e, p) : v.ruckAPortee) && !v.attaque && recharge('grattage') <= 0;
  poss.engager = libre && v.ruckAPortee && v.attaque;
  poss.pousser = !!d.pack;
  poss.quitter = !!d.pack && sortiesPossibles(d.pack).length > 0;
  poss.appel = libre && ouvert && !v.porte && (e.possession === p.cote || e.phase === 'ballonEnLAir') && recharge('appel') <= 0;
  // Le drop (Correctif 17) : seulement avec les responsabilités, au ballon, en jeu, à portée — et celui qui tient le rôle de droppeur
  // ou un pied sûr. Les autres le laissent à leur 10.
  poss.drop = libre && v.porte && !!e.responsabilites && e.phase === 'jeuCourant' && !e.vol && recharge('drop') <= 0
    && metresAvantLaLigne(p.pos, p.cote) < REGLAGES_DIRECT.porteeDrop && (humainTientLe(e, 'droppeur') || p.pied >= 55);
  v.recharge = {
    plaquage: recharge('plaquage'), raffut: recharge('raffut'), crochet: recharge('crochet'),
    feinte: recharge('feinte'), appel: recharge('appel'), grattage: recharge('grattage'), drop: recharge('drop'),
  };
  v.arme = d.arme && e.sim < d.arme.jusqua ? d.arme.action : null;
}

/**
 * LE JOUEUR A DÉSERTÉ SON POSTE DE DÉFENSEUR : la ligne se refait sans lui.
 *
 * ⚠️ ON NE L'EMPÊCHE PAS DE BOUGER — on compense. S'il reste plus de
 * `delaiCompensation` secondes loin de la place que l'IA lui aurait donnée
 * pendant que son équipe défend, ses partenaires se répartissent sur la largeur
 * à quatorze : l'adversaire trouvera un homme de moins là où il manque, et c'est
 * au joueur de le sentir (l'aide au placement le lui dit, la note aussi).
 */
export function deserteurDefensif(e: EtatMatch): Pion | null {
  const d = e.direct;
  if (!d?.actif || d.horsPosteDepuis < 0 || e.sim - d.horsPosteDepuis < REGLAGES_DIRECT.delaiCompensation) return null;
  const p = e.pions.find((q) => q.moi);
  return p && p.surLeTerrain && p.cote !== e.possession && e.phase === 'jeuCourant' ? p : null;
}

// ---------------------------------------------------------------------------
// LES STATISTIQUES DU JEU : ce que la note retient
// ---------------------------------------------------------------------------

/**
 * Un pas de jeu sous contrôle direct : le temps passé à son poste, hors poste,
 * en soutien. Appelée une fois par pas, ballon vivant seulement.
 */
export function compterLeJeu(e: EtatMatch, dt: number): void {
  const d = e.direct;
  if (!d?.actif) return;
  const p = e.pions.find((q) => q.moi);
  if (!p || !humainPilote(e, p) || !PHASES_OUVERTES.has(e.phase)) { d.horsPosteDepuis = -1; return; }
  const st = d.stats;
  st.tempsJeu += dt;
  const v = d.vue;
  // Le porteur n'a pas de poste : il joue le ballon.
  if (e.porteur !== p) {
    if (v.suggestion) {
      if (v.ecart <= REGLAGES_DIRECT.ecartPoste) { st.tempsAuPoste += dt; d.horsPosteDepuis = -1; }
      else {
        st.tempsHorsPoste += dt;
        if (d.horsPosteDepuis < 0) d.horsPosteDepuis = e.sim;
      }
    }
    // Le soutien : un partenaire au ballon, lui à portée d'épaule, en jeu et pas hors-jeu.
    const porteur = e.porteur;
    if (porteur && porteur.cote === p.cote && !p.horsJeu) {
      const s = sens(p.cote);
      const retrait = (porteur.pos.x - p.pos.x) * s;
      const dist = distance(p.pos, porteur.pos);
      if (retrait > -0.5 && retrait < 14 && dist > 2 && dist < 16) st.tempsSoutien += dt;
    }
  } else d.horsPosteDepuis = -1;
}
