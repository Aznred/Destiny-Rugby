// LE MATCH DE LA CARRIÈRE EN LIGNE — 80 minutes de rugby arbitrées par le serveur
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ ON NE STOCKE PAS UN MATCH, ON STOCKE DE QUOI LE REJOUER
// ═══════════════════════════════════════════════════════════════════════════
// `EtatMatch` (moteur/etat.ts) porte 46 pions avec leurs positions, leurs
// vecteurs vitesse, leurs statistiques, le fil de commentaires — et un `rng`
// qui est une FERMETURE. Rien de tout ça ne traverse un `JSON.stringify`, et
// l'écrire dans le jsonb d'une ligue à chaque tick coûterait plus cher que de
// rejouer le match.
//
// Ce qui est persisté tient en quatre choses, et elles suffisent :
//
//   1. la GRAINE — le moteur est déterministe, à pas fixe ;
//   2. les DEUX FEUILLES, gelées au coup d'envoi (un transfert conclu pendant
//      la rencontre ne peut donc pas changer l'équipe qui joue) ;
//   3. le JOURNAL des ordres, chacun daté à la MINUTE DE JEU où il a pris effet ;
//   4. l'horloge et le gel — voir plus bas.
//
// `rejouer()` reconstruit l'état exact à n'importe quelle minute. Deux managers
// qui regardent la même rencontre voient donc rigoureusement le même match :
// même score, mêmes essais, mêmes commentaires, même chrono. Ce n'est pas une
// synchronisation, c'est la même fonction pure appelée deux fois.
//
// ⚠️ COROLLAIRE, ET IL EST DUR : un ordre n'existe que s'il est au journal,
// avec sa minute. Muter l'état rejoué sans l'y écrire donne un match qui se
// contredit au rechargement suivant.
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ POURQUOI LES SCORES NE PARTENT PAS EN VRILLE
// ═══════════════════════════════════════════════════════════════════════════
// « Il ne faut surtout pas que la multiplication des actions provoque des
// scores absurdes du type 200-150. » Le moteur du jeu a ce garde-fou depuis
// l'origine : il reçoit un SCORE CIBLE par équipe, en tire un plan (tant
// d'essais transformés, tant d'essais secs, tant de pénalités) et refuse
// l'essai qui ferait dépasser ce plan — le ballon est tenu dans l'en-but,
// renvoi aux 22, ce qui est une vraie règle du rugby.
//
// La cible vient de la FORCE DES DEUX FEUILLES (`cibleDeScore`), avec la même
// formule que le championnat solo. Ce qui change en ligne, c'est
// `scoreSurTerrain` : le reliquat du plan n'est PAS soldé au coup de sifflet
// final. Le score affiché est donc celui qui a réellement été marqué — il peut
// rester sous la cible, jamais la dépasser franchement.
//
// Mesuré sur 400 rencontres (`npm run verify:carriere`).

import {
  appliquerTactiqueEquipe, avancer, bilan, choisirPenalite, creerMatch,
  demanderRemplacement, infoPenalite,
} from '../moteur/moteur';
import type { EtatMatch } from '../moteur/etat';
import type { Cote } from '../moteur/terrain';
import { scorePossible } from '../championnat';
import { feuilleDepuisComposition } from '../compositionManager';
import type { CompositionManager, PosteId, TactiqueManager } from '../../types';
import type { Coequipier } from '../effectif';
import { graine } from './aleatoire';

/** Les deux camps, nommés comme la rencontre les nomme. */
export type CoteEnLigne = 'domicile' | 'exterieur';
const COTES: readonly CoteEnLigne[] = ['domicile', 'exterieur'];
const MOTEUR: Record<CoteEnLigne, Cote> = { domicile: 'A', exterieur: 'B' };
const autre = (c: CoteEnLigne): CoteEnLigne => c === 'domicile' ? 'exterieur' : 'domicile';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LA STRATÉGIE — ce qu'un entraîneur règle, avant et pendant
// ═══════════════════════════════════════════════════════════════════════════

export type MentaliteEnLigne = 'tresDefensive' | 'defensive' | 'equilibree' | 'offensive' | 'tresOffensive';
export type JeuEnLigne = 'occupation' | 'possession' | 'jeuAuPied' | 'large' | 'axe' | 'rapide' | 'conservation';
export type RythmeEnLigne = 'ralentir' | 'normal' | 'accelerer';
export type DefenseEnLigne = 'conservatrice' | 'normale' | 'agressive';
export type RucksEnLigne = 'faible' | 'normal' | 'forte';
export type ChoixPenaliteEnLigne = 'points' | 'touche' | 'rapide' | 'melee';

/**
 * Les consignes enregistrées d'un club.
 *
 * ⚠️ ELLES SERVENT SURTOUT QUAND PERSONNE N'EST LÀ. « Un match ne doit jamais
 * bloquer toute la ligue » : si les deux managers sont absents, c'est cette
 * structure qui entraîne les deux équipes. Elle doit donc décrire un plan
 * complet, pas seulement une humeur — d'où les deux bascules de fin de match.
 */
export interface StrategieEnLigne {
  mentalite: MentaliteEnLigne;
  jeu: JeuEnLigne;
  rythme: RythmeEnLigne;
  defense: DefenseEnLigne;
  rucks: RucksEnLigne;
  /** Pénalité à moins de 35 mètres. */
  penaliteCourte: ChoixPenaliteEnLigne;
  /** Pénalité au-delà de 35 mètres. */
  penaliteLongue: ChoixPenaliteEnLigne;
  /** Mentalité prise automatiquement si l'équipe est menée après la 60ᵉ. */
  bascule60: MentaliteEnLigne;
  /** Mentalité prise si elle est menée de plus de 7 points après la 70ᵉ. */
  bascule70: MentaliteEnLigne;
  remplacements: 'precoces' | 'standard' | 'tardifs';
}

export const STRATEGIE_EN_LIGNE_DEFAUT: StrategieEnLigne = {
  mentalite: 'equilibree', jeu: 'possession', rythme: 'normal', defense: 'normale',
  rucks: 'normal', penaliteCourte: 'points', penaliteLongue: 'touche',
  bascule60: 'offensive', bascule70: 'tresOffensive', remplacements: 'standard',
};

export const MENTALITES: readonly MentaliteEnLigne[] = ['tresDefensive', 'defensive', 'equilibree', 'offensive', 'tresOffensive'];
export const JEUX: readonly JeuEnLigne[] = ['occupation', 'possession', 'jeuAuPied', 'large', 'axe', 'rapide', 'conservation'];
export const RYTHMES: readonly RythmeEnLigne[] = ['ralentir', 'normal', 'accelerer'];
export const DEFENSES: readonly DefenseEnLigne[] = ['conservatrice', 'normale', 'agressive'];
export const RUCKS: readonly RucksEnLigne[] = ['faible', 'normal', 'forte'];
export const CHOIX_PENALITE: readonly ChoixPenaliteEnLigne[] = ['points', 'touche', 'rapide', 'melee'];

/**
 * Assainit une stratégie reçue du client.
 *
 * ⚠️ C'EST LA SEULE PORTE D'ENTRÉE. Le serveur ne fait jamais confiance à ce
 * qu'on lui envoie : une valeur inconnue ne provoque pas d'erreur, elle est
 * remplacée par le défaut. Un client bricolé ne peut donc pas inventer une
 * mentalité « invincible ».
 */
export function strategieValide(brut: unknown): StrategieEnLigne {
  const s = (brut ?? {}) as Partial<StrategieEnLigne>;
  const dans = <T extends string>(valeur: unknown, options: readonly T[], defaut: T): T =>
    options.includes(valeur as T) ? valeur as T : defaut;
  return {
    mentalite: dans(s.mentalite, MENTALITES, 'equilibree'),
    jeu: dans(s.jeu, JEUX, 'possession'),
    rythme: dans(s.rythme, RYTHMES, 'normal'),
    defense: dans(s.defense, DEFENSES, 'normale'),
    rucks: dans(s.rucks, RUCKS, 'normal'),
    penaliteCourte: dans(s.penaliteCourte, CHOIX_PENALITE, 'points'),
    penaliteLongue: dans(s.penaliteLongue, CHOIX_PENALITE, 'touche'),
    bascule60: dans(s.bascule60, MENTALITES, 'offensive'),
    bascule70: dans(s.bascule70, MENTALITES, 'tresOffensive'),
    remplacements: dans(s.remplacements, ['precoces', 'standard', 'tardifs'] as const, 'standard'),
  };
}

/**
 * La stratégie devient le plan que le moteur comprend.
 *
 * ⚠️ TOUT NE TIENT PAS DANS `TactiqueManager`, et c'est voulu. Le moteur solo
 * connaît quatre plans d'attaque, trois défenses et trois rythmes ; la ligue en
 * ligne ajoute une mentalité, une consigne de ruck et une agressivité
 * défensive. Ce qui n'a pas d'équivalent ne se perd pas : il devient un
 * `impactSupplementaire`, l'ajustement de potentiel de marque que le moteur
 * applique déjà à toute modification tactique en cours de match. Une consigne
 * qui ne changerait rien au résultat serait décorative — c'est exactement ce
 * que la demande interdit.
 */
export function tactiqueDepuisStrategie(s: StrategieEnLigne): TactiqueManager {
  return {
    attaque: s.jeu === 'large' || s.jeu === 'rapide' ? 'large'
      : s.jeu === 'occupation' || s.jeu === 'jeuAuPied' ? 'occupation'
        : s.jeu === 'axe' || s.jeu === 'conservation' ? 'avants' : 'equilibre',
    defense: s.defense === 'agressive' ? 'blitz' : s.defense === 'conservatrice' ? 'repli' : 'glissee',
    rythme: s.rythme === 'accelerer' ? 'intense' : s.rythme === 'ralentir' ? 'gestion' : 'normal',
    penalites: s.penaliteCourte === 'points' && s.penaliteLongue === 'points' ? 'points'
      : s.penaliteCourte === 'touche' && s.penaliteLongue === 'touche' ? 'touche'
        : 'mixte',
    remplacements: s.remplacements,
  };
}

/** Le supplément d'agressivité, en points de potentiel de marque. */
export function impactStrategie(s: StrategieEnLigne): number {
  const mentalite = { tresDefensive: -5, defensive: -2.5, equilibree: 0, offensive: 2.5, tresOffensive: 5 }[s.mentalite];
  const rucks = { faible: -1.5, normal: 0, forte: 1.5 }[s.rucks];
  const defense = { conservatrice: -1, normale: 0, agressive: 1 }[s.defense];
  return mentalite + rucks + defense;
}

/** La mentalité réellement appliquée à cette minute, bascules comprises. */
export function mentaliteAppliquee(s: StrategieEnLigne, minute: number, ecart: number): MentaliteEnLigne {
  if (minute >= 70 && ecart <= -8) return s.bascule70;
  if (minute >= 60 && ecart < 0) return s.bascule60;
  return s.mentalite;
}

/**
 * Le choix de l'IA sur une pénalité, quand le manager n'est pas là.
 *
 * ⚠️ LA SITUATION PASSE AVANT LA CONSIGNE. « Toujours les points » à la 79ᵉ en
 * étant mené de cinq fait perdre le match à coup sûr : trois points ne
 * suffisent pas. La consigne décide du cas ordinaire, la fin de match décide du
 * reste — c'est ce qui rend une équipe abandonnée à l'IA encore crédible.
 */
export function decisionIA(
  s: StrategieEnLigne, distance: number, aPortee: boolean, minute: number, ecart: number,
): ChoixPenaliteEnLigne {
  if (!aPortee) return distance > 45 ? 'touche' : 'rapide';
  if (minute >= 65 && ecart < -3) return 'touche';
  if (minute >= 75 && ecart >= -3) return 'points';
  const consigne = distance < 35 ? s.penaliteCourte : s.penaliteLongue;
  return consigne === 'melee' && distance < 40 ? 'rapide' : consigne;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. L'ÉTAT PERSISTÉ
// ═══════════════════════════════════════════════════════════════════════════

export type CommandeMatchEnLigne =
  | { type: 'presence' }
  | { type: 'strategie'; strategie: StrategieEnLigne }
  | { type: 'remplacement'; sortantId: string; entrantId: string }
  | { type: 'decision'; choix: ChoixPenaliteEnLigne };

export interface EvenementMatchEnLigne {
  /** La minute de jeu à laquelle l'ordre prend effet. Le journal est trié dessus. */
  horloge: number;
  cote: CoteEnLigne;
  commande: CommandeMatchEnLigne;
}

export interface LigneFil {
  minute: number; texte: string; type: string; cote?: CoteEnLigne; points?: number;
}

export interface DecisionEnAttente {
  cote: CoteEnLigne; distance: number; angle: number; probabilite: number;
  buteur: string; horloge: number;
  /** Date limite réelle (ms). Passée, l'IA tranche et le jeu repart. */
  jusqua: number;
}

export interface StatsEquipeMatch {
  possession: number; essais: number; penalitesTentees: number; penalitesReussies: number;
  plaquages: number; metres: number; turnovers: number; cartons: number;
}

export interface LigneFeuilleMatch {
  carteId: string; nom: string; numero: number; poste: PosteId; cote: CoteEnLigne;
  minutes: number; essais: number; plaquages: number; metres: number;
  butsTentes: number; butsReussis: number; cartons: number;
}

/** Une équipe telle qu'on la présente au coup d'envoi. */
export interface EquipeMatchEnLigne {
  clubId: string;
  nom: string;
  effectif: Coequipier[];
  composition: CompositionManager;
  strategie?: StrategieEnLigne;
}

/** La feuille GELÉE : 1 → 23, plus le brassard et la cible. */
export interface FeuilleGelee {
  clubId: string; nom: string; feuille: Coequipier[]; capitaineId: string; buteurId: string;
}

export interface ParametresCreationMatch {
  id: string;
  domicile: EquipeMatchEnLigne;
  exterieur: EquipeMatchEnLigne;
  /** Coup d'envoi réel, en millisecondes. */
  debut: number;
  /** Entier tiré par la ligue : il rend la rencontre unique et rejouable. */
  graine: number;
}

export type Paire = Record<CoteEnLigne, number>;

export interface EtatMatchEnLigne {
  id: string;
  cle: string;
  /** Coup d'envoi réel (ms). `enregistrerResultat` s'en sert pour l'origine. */
  debut: number;
  /** Millisecondes réelles gelées par les décisions en attente. */
  gel: number;
  /** Minutes de jeu validées, 0 → 80. */
  horloge: number;
  cibles: Paire;
  /**
   * ⚠️ EFFACÉES À LA SIRÈNE. Deux feuilles de 23, ce sont 6 Ko par rencontre :
   * gardées sur les 380 matchs d'une saison à vingt clubs, la ligue pèserait
   * deux mégaoctets réécrits à chaque action. Une fois le match terminé, le
   * score, le fil et la feuille de match suffisent à tout raconter.
   */
  equipes?: Record<CoteEnLigne, FeuilleGelee>;
  strategies: Record<CoteEnLigne, StrategieEnLigne>;
  journal: EvenementMatchEnLigne[];
  decision?: DecisionEnAttente;
  /** Dernière présence connue d'un manager devant son match (ms). */
  presence: Partial<Record<CoteEnLigne, number>>;
  termine: boolean;
  score: Paire;
  essais: Paire;
  /** Pénalités et drops RÉUSSIS — les objectifs de la ligue les comptent. */
  penalites: Paire;
  fil: LigneFil[];
  stats: Record<CoteEnLigne, StatsEquipeMatch>;
  feuille?: LigneFeuilleMatch[];
}

/** Ce que le client reçoit : jamais la graine, jamais le plan d'en face. */
export interface VueMatchEnLigne {
  id: string;
  minute: number;
  termine: boolean;
  score: Paire;
  essais: Paire;
  penalites: Paire;
  fil: LigneFil[];
  stats: Record<CoteEnLigne, StatsEquipeMatch>;
  feuille?: LigneFeuilleMatch[];
  monCote?: CoteEnLigne;
  maStrategie?: StrategieEnLigne;
  decision?: DecisionEnAttente;
  /** Clé i18n : « l'adversaire semble jouer beaucoup plus offensivement ». */
  signalAdverse?: string;
  remplacementsFaits: number;
  surLeTerrain: { carteId: string; nom: string; numero: number; poste: PosteId }[];
  surLeBanc: { carteId: string; nom: string; numero: number; poste: PosteId }[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LE TEMPS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ QUATRE SECONDES DE VRAIE VIE POUR UNE MINUTE DE RUGBY — soit 5 min 20 de
 * match. Le compromis a deux bornes. Trop rapide (une seconde par minute), on
 * n'a le temps de rien : le changement tactique arrive après l'essai qu'il
 * devait empêcher, et regarder son match ne sert plus à rien. Trop lent (le
 * temps réel), personne ne reste quatre-vingts minutes devant un onglet.
 * L'écran sonde à 2 s : l'horloge avance d'une demi-minute entre deux
 * rafraîchissements, ce qui se lit comme un vrai chrono.
 */
export const MS_PAR_MINUTE = 4_000;
/** Ce qu'un manager a pour trancher une pénalité avant que l'IA ne le fasse. */
export const DELAI_DECISION = 20_000;
/** Au-delà, on considère que le manager a fermé l'onglet. */
export const DELAI_PRESENCE = 45_000;
/** Un match lancé puis oublié se termine tout seul au bout de ce délai. */
export const DUREE_REELLE = 80 * MS_PAR_MINUTE;

/**
 * ⚠️ L'HORLOGE D'UN MATCH NE RECULE JAMAIS. Elle est calculée à partir de
 * `Date.now()` du serveur, et deux instances serverless n'ont pas la
 * milliseconde exacte : sans ce plancher, une requête servie par une machine
 * légèrement en retard ramènerait le chrono de la 44ᵉ à la 43ᵉ, rejouerait un
 * essai déjà annoncé, et le fil se contredirait sous les yeux des deux
 * managers.
 */
export function minuteCible(etat: EtatMatchEnLigne, maintenant: number): number {
  return Math.max(etat.horloge, Math.min(80, (maintenant - etat.debut - etat.gel) / MS_PAR_MINUTE));
}

/** Le gel ne se relâche jamais non plus : il ne fait que s'ajouter. */
function gelJusqua(etat: EtatMatchEnLigne, instant: number): number {
  return Math.max(etat.gel, instant - etat.debut - etat.horloge * MS_PAR_MINUTE);
}

export function presenceActive(etat: EtatMatchEnLigne, cote: CoteEnLigne, maintenant: number): boolean {
  const vu = etat.presence[cote];
  return Boolean(vu && maintenant - vu < DELAI_PRESENCE && maintenant + 1 >= vu);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. LA CIBLE DE SCORE
// ═══════════════════════════════════════════════════════════════════════════

/** La force d'une feuille : le XV pèse presque quatre fois le banc. */
export function forceFeuille(feuille: readonly Coequipier[]): number {
  if (!feuille.length) return 35;
  const moyenne = (l: readonly Coequipier[]) => l.length ? l.reduce((s, j) => s + j.note, 0) / l.length : 0;
  const xv = feuille.slice(0, 15);
  const banc = feuille.slice(15);
  return banc.length ? moyenne(xv) * 0.78 + moyenne(banc) * 0.22 : moyenne(xv);
}

/**
 * Le score visé par chaque équipe — LA MÊME FORMULE que le championnat solo
 * (`jouerRencontre`), avec l'avantage du terrain et le même bruit de ±10.
 * C'est elle qui garantit qu'une ligue de Bronze à 35 GEN produit des 17-13 et
 * pas des 120-95 : deux effectifs faibles ont un petit écart, donc de petits
 * scores, et un effectif écrasant ne dépasse pas non plus le réalisme du rugby.
 */
export function cibleDeScore(forceD: number, forceE: number, cle: string): Paire {
  const rng = graine(`cible#${cle}`);
  const ecart = (forceD + 2.5) - forceE;
  return {
    domicile: scorePossible(21 + ecart * 1.1 + (rng() * 20 - 10)),
    exterieur: scorePossible(21 - ecart * 1.1 + (rng() * 20 - 10)),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. LA REJOUE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ LE CACHE EST UNE OPTIMISATION, JAMAIS UNE MÉMOIRE. Sa clé contient tout ce
 * qui détermine le match (graine et nombre d'ordres) : un ordre de plus, et
 * c'est un autre match qui est calculé. Un processus serverless qui démarre à
 * froid le retrouve à l'identique en rejouant — le cache n'est donc jamais une
 * source de vérité, seulement un raccourci.
 */
const CACHE = new Map<string, { moteur: EtatMatch; minute: number }>();
const CACHE_MAX = 16;
const cleCache = (etat: EtatMatchEnLigne) => `${etat.cle}#${etat.journal.length}`;

function ranger(cle: string, moteur: EtatMatch): void {
  if (CACHE.size >= CACHE_MAX && !CACHE.has(cle)) {
    const plusAncienne = CACHE.keys().next().value;
    if (plusAncienne !== undefined) CACHE.delete(plusAncienne);
  }
  CACHE.set(cle, { moteur, minute: moteur.minute });
}

/** Avance le moteur, en s'arrêtant sur une pénalité si un manager doit trancher. */
function pousser(e: EtatMatch, jusqua: number, arretSur: Cote | null): void {
  // ⚠️ UN PAS DE 0,6 SECONDE, TOUJOURS LE MÊME, ET POUR DEUX RAISONS.
  //
  // La première est la décision du manager : la phase « pénalité » ne dure que
  // 2,5 secondes à l'écran. Un pas plus large la traverserait sans jamais
  // pouvoir s'y arrêter, et « je prends les points ou je vais en touche ? »
  // n'existerait tout simplement pas.
  //
  // La seconde est le DÉTERMINISME, et c'est elle qui interdit d'optimiser ici.
  // Un pas plus large dépasse la minute demandée de plus loin : la rejoue
  // s'arrêterait à la 30ᵉ 42 au lieu de la 30ᵉ 03, donc à un autre tick, donc
  // AVANT ou APRÈS un ordre daté de la 30ᵉ. Deux managers dont l'un regarde et
  // l'autre pas verraient alors deux matchs différents.
  //
  // Le coût est mesuré, et il ne vient pas de là : à pas de 8 secondes, un
  // match complet prend 267 ms au lieu de 285 (le prix est celui des ticks du
  // moteur, pas celui des appels). Il n'y a donc rien à gagner à élargir.
  let garde = 0;
  while (!e.fini && e.minute < jusqua && garde++ < 40_000) {
    if (arretSur && e.phase === 'penalite' && e.penalite?.pour === arretSur) return;
    avancer(e, 0.6);
  }
}

/** La stratégie d'un camp telle qu'elle était à une minute donnée. */
function strategieA(etat: EtatMatchEnLigne, cote: CoteEnLigne, horloge: number): StrategieEnLigne {
  let s = etat.strategies[cote];
  for (const ev of etat.journal) {
    if (ev.horloge > horloge) break;
    if (ev.cote === cote && ev.commande.type === 'strategie') s = ev.commande.strategie;
  }
  return s;
}

function appliquerAuMoteur(e: EtatMatch, ev: EvenementMatchEnLigne): void {
  const cote = MOTEUR[ev.cote];
  const c = ev.commande;
  if (c.type === 'strategie') {
    const ecart = cote === 'A' ? e.scoreA - e.scoreB : e.scoreB - e.scoreA;
    const effective: StrategieEnLigne = { ...c.strategie, mentalite: mentaliteAppliquee(c.strategie, e.minute, ecart) };
    appliquerTactiqueEquipe(e, cote, tactiqueDepuisStrategie(effective), true, impactStrategie(effective));
  } else if (c.type === 'remplacement') {
    demanderRemplacement(e, cote, c.entrantId, c.sortantId);
  } else if (c.type === 'decision') {
    choisirPenalite(e, cote, c.choix);
  }
}

function monter(etat: EtatMatchEnLigne): EtatMatch {
  const equipes = etat.equipes;
  if (!equipes) throw new Error('Ce match est terminé : ses feuilles ont été archivées.');
  const strategieD = strategieA(etat, 'domicile', 0);
  const strategieE = strategieA(etat, 'exterieur', 0);
  const e = creerMatch(
    equipes.domicile.nom, equipes.exterieur.nom,
    equipes.domicile.feuille, equipes.exterieur.feuille,
    etat.cibles.domicile, etat.cibles.exterieur, etat.cle, undefined,
    {
      rng: graine(`match#${etat.cle}`),
      scoreSurTerrain: true,
      compositionA: equipes.domicile.feuille, compositionB: equipes.exterieur.feuille,
      tactiqueA: tactiqueDepuisStrategie(strategieD), tactiqueB: tactiqueDepuisStrategie(strategieE),
      capitaineAId: equipes.domicile.capitaineId, capitaineBId: equipes.exterieur.capitaineId,
      buteurAId: equipes.domicile.buteurId, buteurBId: equipes.exterieur.buteurId,
    },
  );
  e.impactBanc = { A: impactStrategie(strategieD), B: impactStrategie(strategieE) };
  return e;
}

/** Reconstruit l'état du moteur à la minute demandée. */
function rejouer(etat: EtatMatchEnLigne, jusqua: number, arretSur: CoteEnLigne | null): EtatMatch {
  const cle = cleCache(etat);
  const garde = CACHE.get(cle);
  let e: EtatMatch;
  let depart = 0;
  if (garde && garde.minute <= jusqua + 1e-9) {
    // Le match est déjà calculé jusqu'ici : on repart de là, sans rien rejouer.
    e = garde.moteur;
    depart = etat.journal.length;
  } else {
    e = monter(etat);
  }
  for (let i = depart; i < etat.journal.length; i++) {
    const ev = etat.journal[i];
    if (ev.horloge > jusqua) break;
    pousser(e, ev.horloge, null);
    appliquerAuMoteur(e, ev);
  }
  pousser(e, jusqua, arretSur ? MOTEUR[arretSur] : null);
  ranger(cle, e);
  return e;
}

/**
 * Déplace l'entrée de cache d'un état vers son successeur.
 *
 * Sans elle, chaque ordre d'un manager relancerait un match complet depuis la
 * première seconde : quinze changements tactiques dans une rencontre, ce sont
 * quinze rejoues de 80 minutes pour rien.
 */
function adopterCache(avant: EtatMatchEnLigne, apres: EtatMatchEnLigne, moteur: EtatMatch): void {
  CACHE.delete(cleCache(avant));
  ranger(cleCache(apres), moteur);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. LA LECTURE DU MOTEUR
// ═══════════════════════════════════════════════════════════════════════════

const TYPES_FIL = new Set(['essai', 'but', 'butRate', 'carton', 'jalon', 'remplacement']);
const FIL_MAX = 80;

function extraireFil(e: EtatMatch): LigneFil[] {
  const lignes: LigneFil[] = [];
  for (const c of e.commentaires) {
    if (!TYPES_FIL.has(c.type)) continue;
    lignes.push({
      minute: Math.min(80, Math.round(c.minute)), texte: c.texte, type: c.type,
      cote: c.cote === 'A' ? 'domicile' : c.cote === 'B' ? 'exterieur' : undefined,
      points: c.points || undefined,
    });
  }
  return lignes.slice(-FIL_MAX);
}

const statsVides = (): StatsEquipeMatch => ({
  possession: 50, essais: 0, penalitesTentees: 0, penalitesReussies: 0,
  plaquages: 0, metres: 0, turnovers: 0, cartons: 0,
});

function extraireStats(e: EtatMatch): Record<CoteEnLigne, StatsEquipeMatch> {
  const total = Math.max(1, e.compteurs.tempsA + e.compteurs.tempsB);
  const stats: Record<CoteEnLigne, StatsEquipeMatch> = { domicile: statsVides(), exterieur: statsVides() };
  stats.domicile.possession = Math.round((e.compteurs.tempsA / total) * 100);
  stats.exterieur.possession = 100 - stats.domicile.possession;
  stats.domicile.essais = e.essaisA;
  stats.exterieur.essais = e.essaisB;
  for (const p of e.pions) {
    const s = p.cote === 'A' ? stats.domicile : stats.exterieur;
    s.penalitesTentees += p.stats.butsTentes;
    s.penalitesReussies += p.stats.butsReussis;
    s.plaquages += p.stats.plaquages;
    s.metres += Math.round(p.stats.metres);
    s.turnovers += p.stats.grattages;
    s.cartons += p.stats.cartonsJaunes + p.stats.cartonsRouges;
  }
  return stats;
}

/**
 * Les pénalités et drops réussis.
 *
 * ⚠️ PAS `butsReussis` : ce compteur additionne les transformations, et
 * l'objectif « réussir 5 pénalités » serait alors validé par cinq essais. Un
 * but à trois points, c'est une pénalité ou un drop — jamais une transformation.
 */
function extrairePenalites(e: EtatMatch): Paire {
  const p: Paire = { domicile: 0, exterieur: 0 };
  for (const c of e.commentaires) {
    if (c.type !== 'but' || c.points !== 3) continue;
    if (c.cote === 'A') p.domicile += 1; else if (c.cote === 'B') p.exterieur += 1;
  }
  return p;
}

function extraireFeuille(e: EtatMatch): LigneFeuilleMatch[] {
  const parNom = new Map(e.pions.map((p) => [`${p.cote}${p.numero}`, p]));
  return bilan(e).parJoueur.map((l) => {
    const pion = parNom.get(`A${l.numero}`)?.nom === l.nom ? parNom.get(`A${l.numero}`) : parNom.get(`B${l.numero}`);
    return {
      carteId: pion?.sourceId ?? l.nom, nom: l.nom, numero: l.numero, poste: l.poste,
      cote: (pion?.cote ?? 'A') === 'A' ? 'domicile' as const : 'exterieur' as const,
      minutes: l.minutes, essais: l.stats.essais, plaquages: l.stats.plaquages,
      metres: Math.round(l.stats.metres), butsTentes: l.stats.butsTentes,
      butsReussis: l.stats.butsReussis, cartons: l.stats.cartonsJaunes + l.stats.cartonsRouges,
    };
  }).sort((a, b) => a.cote === b.cote ? a.numero - b.numero : a.cote === 'domicile' ? -1 : 1);
}

function relever(etat: EtatMatchEnLigne, e: EtatMatch): void {
  etat.horloge = Math.min(80, e.minute);
  etat.score = { domicile: e.scoreA, exterieur: e.scoreB };
  etat.essais = { domicile: e.essaisA, exterieur: e.essaisB };
  etat.penalites = extrairePenalites(e);
  etat.fil = extraireFil(e);
  etat.stats = extraireStats(e);
}

/** Le coup de sifflet final : on relève tout, puis on archive. */
function clore(etat: EtatMatchEnLigne, e: EtatMatch): void {
  relever(etat, e);
  etat.horloge = 80;
  etat.termine = true;
  etat.feuille = extraireFeuille(e);
  delete etat.decision;
  delete etat.equipes;
  etat.journal = [];
  CACHE.delete(cleCache(etat));
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. LES POINTS D'ENTRÉE
// ═══════════════════════════════════════════════════════════════════════════

export function creerMatchEnLigne(p: ParametresCreationMatch): EtatMatchEnLigne {
  const geler = (equipe: EquipeMatchEnLigne): FeuilleGelee => ({
    clubId: equipe.clubId, nom: equipe.nom,
    feuille: feuilleDepuisComposition(equipe.effectif, equipe.composition),
    capitaineId: equipe.composition.capitaineId, buteurId: equipe.composition.buteurId,
  });
  const equipes = { domicile: geler(p.domicile), exterieur: geler(p.exterieur) };
  const cle = `${p.id}#${p.graine >>> 0}`;
  return {
    id: p.id, cle, debut: p.debut, gel: 0, horloge: 0,
    cibles: cibleDeScore(forceFeuille(equipes.domicile.feuille), forceFeuille(equipes.exterieur.feuille), cle),
    equipes,
    strategies: {
      domicile: strategieValide(p.domicile.strategie),
      exterieur: strategieValide(p.exterieur.strategie),
    },
    journal: [], presence: {}, termine: false,
    score: { domicile: 0, exterieur: 0 }, essais: { domicile: 0, exterieur: 0 },
    penalites: { domicile: 0, exterieur: 0 }, fil: [],
    stats: { domicile: statsVides(), exterieur: statsVides() },
  };
}

/**
 * Fait avancer un match jusqu'à l'instant présent.
 *
 * ⚠️ C'EST LE SEUL ENDROIT QUI FAIT AVANCER LE TEMPS, et il est appelé à chaque
 * lecture de la ligue — donc par n'importe qui, y compris par l'horloge
 * automatique quand personne ne regarde. C'est ce qui garantit qu'un match
 * lancé puis abandonné se termine quand même, et qu'une ligue ne se bloque
 * jamais sur l'absence d'un manager.
 */
export function avancerMatchEnLigne(etat: EtatMatchEnLigne, maintenant: number): EtatMatchEnLigne {
  if (etat.termine) return etat;
  const suivant: EtatMatchEnLigne = {
    ...etat, journal: [...etat.journal], presence: { ...etat.presence },
    score: { ...etat.score }, essais: { ...etat.essais }, penalites: { ...etat.penalites },
  };
  if (!suivant.equipes) { suivant.termine = true; return suivant; }

  // ── 1. Une décision en attente gèle l'horloge, puis expire ────────────────
  if (suivant.decision) {
    const limite = suivant.decision.jusqua;
    if (maintenant < limite) {
      suivant.gel = gelJusqua(etat, maintenant);
      return suivant;
    }
    const d = suivant.decision;
    const ecart = suivant.score[d.cote] - suivant.score[autre(d.cote)];
    const choix = decisionIA(
      strategieA(suivant, d.cote, d.horloge), d.distance,
      d.distance < 52 && d.angle < 30, Math.round(d.horloge), ecart,
    );
    suivant.journal.push({ horloge: d.horloge, cote: d.cote, commande: { type: 'decision', choix } });
    suivant.gel = gelJusqua(etat, limite);
    delete suivant.decision;
  }

  // ── 2. On avance jusqu'à l'heure qu'il est ────────────────────────────────
  // Un manager présent a le droit de trancher SES pénalités : on arrête le
  // moteur sur la sienne. Si les deux regardent, la sienne arrivera au tour
  // suivant — deux pénalités ne tombent jamais dans la même seconde de jeu.
  const arret = presenceActive(suivant, 'domicile', maintenant) ? 'domicile' as const
    : presenceActive(suivant, 'exterieur', maintenant) ? 'exterieur' as const : null;
  const e = rejouer(suivant, minuteCible(suivant, maintenant), arret);
  relever(suivant, e);

  // ── 3. Une pénalité arrêtée devant un manager présent devient une décision ─
  const penalite = infoPenalite(e);
  if (penalite && !e.fini) {
    const cote: CoteEnLigne = penalite.cote === 'A' ? 'domicile' : 'exterieur';
    if (presenceActive(suivant, cote, maintenant)) {
      suivant.decision = {
        cote, distance: penalite.distance, angle: penalite.angle,
        probabilite: Math.round(penalite.probabilite * 100), buteur: penalite.buteur,
        horloge: suivant.horloge, jusqua: maintenant + DELAI_DECISION,
      };
    }
  }

  if (e.fini || suivant.horloge >= 80) clore(suivant, e);
  return suivant;
}

/**
 * Enregistre l'ordre d'un manager.
 *
 * ⚠️ IL REND TOUJOURS UN ÉTAT, jamais une exception. Un clic sur « prendre les
 * points » qui arrive une seconde après la reprise du jeu n'est pas une faute
 * du joueur : l'ordre est ignoré, le match continue. Lever une erreur ferait
 * remonter « action impossible » à l'écran pour un geste parfaitement normal.
 */
export function commanderMatchEnLigne(
  etat: EtatMatchEnLigne, clubId: string, action: CommandeMatchEnLigne, maintenant: number,
): EtatMatchEnLigne {
  if (etat.termine || !etat.equipes) return etat;
  const cote = COTES.find((c) => etat.equipes![c].clubId === clubId);
  if (!cote) return etat;
  const commande = normaliserCommande(action);
  if (!commande) return etat;

  const marque: EtatMatchEnLigne = { ...etat, presence: { ...etat.presence, [cote]: maintenant } };
  if (commande.type === 'presence') return avancerMatchEnLigne(marque, maintenant);

  // La décision se prend à la minute où le jeu est arrêté, pas à celle qu'il
  // serait sans l'arrêt : sinon l'ordre serait daté après la reprise.
  const horloge = etat.decision && etat.decision.cote === cote
    ? etat.decision.horloge
    : Math.min(80, minuteCible(marque, maintenant));

  if (commande.type === 'decision' && (!etat.decision || etat.decision.cote !== cote)) {
    return avancerMatchEnLigne(marque, maintenant);
  }

  const moteur = rejouer(marque, horloge, null);
  if (commande.type === 'remplacement') {
    // Le moteur refuse un entrant déjà utilisé ou un sortant absent. On le lui
    // demande AVANT d'écrire au journal : un ordre mort y resterait pour
    // toutes les rejoues suivantes.
    const cible = MOTEUR[cote];
    const entrant = moteur.pions.find((p) => p.cote === cible && p.sourceId === commande.entrantId && !p.surLeTerrain && p.minutes === 0);
    const sortant = moteur.pions.find((p) => p.cote === cible && p.sourceId === commande.sortantId && p.surLeTerrain && p.numero <= 15);
    if (!entrant || !sortant) return avancerMatchEnLigne(marque, maintenant);
  }

  const evenement: EvenementMatchEnLigne = { horloge, cote, commande };
  const suivant: EtatMatchEnLigne = { ...marque, journal: [...marque.journal, evenement] };
  if (commande.type === 'strategie') {
    suivant.strategies = { ...marque.strategies, [cote]: commande.strategie };
  }
  if (commande.type === 'decision' && marque.decision) {
    // Le gel s'arrête à l'instant du clic : le manager n'a pas volé de temps.
    suivant.gel = gelJusqua(marque, maintenant);
    delete suivant.decision;
  }
  appliquerAuMoteur(moteur, evenement);
  adopterCache(marque, suivant, moteur);
  return avancerMatchEnLigne(suivant, maintenant);
}

/** Assainit l'ordre reçu du client. Une commande inconnue est simplement ignorée. */
function normaliserCommande(action: unknown): CommandeMatchEnLigne | null {
  if (!action || typeof action !== 'object') return null;
  const a = action as { type?: unknown; strategie?: unknown; choix?: unknown; sortantId?: unknown; entrantId?: unknown };
  if (a.type === 'presence') return { type: 'presence' };
  if (a.type === 'strategie') return { type: 'strategie', strategie: strategieValide(a.strategie) };
  if (a.type === 'decision') {
    return CHOIX_PENALITE.includes(a.choix as ChoixPenaliteEnLigne)
      ? { type: 'decision', choix: a.choix as ChoixPenaliteEnLigne } : null;
  }
  if (a.type === 'remplacement') {
    const ok = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 250;
    return ok(a.sortantId) && ok(a.entrantId) && a.sortantId !== a.entrantId
      ? { type: 'remplacement', sortantId: a.sortantId, entrantId: a.entrantId } : null;
  }
  return null;
}

/**
 * Termine un match d'un seul coup, sans horloge.
 *
 * C'est le chemin des ABSENCES : la fenêtre s'est refermée, personne n'a lancé
 * la rencontre, elle se joue quand même avec les compositions et les consignes
 * enregistrées. Exactement le même moteur, exactement les mêmes règles.
 */
export function conclureMatchEnLigne(etat: EtatMatchEnLigne): EtatMatchEnLigne {
  if (etat.termine) return etat;
  const suivant: EtatMatchEnLigne = { ...etat, presence: {}, decision: undefined };
  if (!suivant.equipes) { suivant.termine = true; return suivant; }
  clore(suivant, rejouer(suivant, 80, null));
  return suivant;
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. LA VUE
// ═══════════════════════════════════════════════════════════════════════════

const LISIBILITE: Record<MentaliteEnLigne, number> = {
  tresDefensive: -2, defensive: -1, equilibree: 0, offensive: 1, tresOffensive: 2,
};

/**
 * Ce que l'adversaire perçoit du plan d'en face.
 *
 * ⚠️ UNE IMPRESSION, JAMAIS LE RÉGLAGE. « L'adversaire semble jouer beaucoup
 * plus offensivement » se lit sur un terrain ; « il est passé en jeu au large,
 * rucks à forte contestation, défense montante » ne se lit nulle part. Sans ce
 * filtre, le duel tactique devient un jeu de miroir où chacun contre exactement
 * le dernier réglage de l'autre — et la lecture du jeu ne sert plus à rien.
 */
export function signalAdverse(etat: EtatMatchEnLigne, moi: CoteEnLigne): string | undefined {
  const lui = autre(moi);
  const ordres = etat.journal.filter((ev) => ev.cote === lui && ev.commande.type === 'strategie');
  if (!ordres.length) return undefined;
  const dernier = ordres[ordres.length - 1];
  // Un changement se ressent pendant quelques minutes, pas jusqu'à la sirène.
  if (etat.horloge - dernier.horloge > 6) return undefined;
  const avant = ordres.length > 1 ? ordres[ordres.length - 2].commande : null;
  const precedente = avant && avant.type === 'strategie' ? avant.strategie : etat.strategies[lui];
  const suivante = dernier.commande.type === 'strategie' ? dernier.commande.strategie : precedente;
  const delta = LISIBILITE[suivante.mentalite] - LISIBILITE[precedente.mentalite];
  if (delta >= 2) return 'ligue.match.signal.beaucoupPlusOffensif';
  if (delta === 1) return 'ligue.match.signal.plusOffensif';
  if (delta <= -2) return 'ligue.match.signal.beaucoupPlusDefensif';
  if (delta === -1) return 'ligue.match.signal.plusDefensif';
  if (suivante.rythme !== precedente.rythme) {
    return suivante.rythme === 'accelerer' ? 'ligue.match.signal.acceleration' : 'ligue.match.signal.ralentissement';
  }
  if (suivante.defense !== precedente.defense) {
    return suivante.defense === 'agressive' ? 'ligue.match.signal.defenseAgressive' : 'ligue.match.signal.defenseBasse';
  }
  return undefined;
}

export function vueMatchEnLigne(etat: EtatMatchEnLigne, clubId: string): VueMatchEnLigne {
  const monCote = etat.equipes ? COTES.find((c) => etat.equipes![c].clubId === clubId) : undefined;
  const vue: VueMatchEnLigne = {
    id: etat.id, minute: Math.floor(etat.horloge), termine: etat.termine,
    score: etat.score, essais: etat.essais, penalites: etat.penalites,
    fil: etat.fil, stats: etat.stats, feuille: etat.feuille,
    remplacementsFaits: 0, surLeTerrain: [], surLeBanc: [],
  };
  if (!monCote || etat.termine) return vue;
  vue.monCote = monCote;
  vue.maStrategie = strategieA(etat, monCote, etat.horloge);
  vue.signalAdverse = signalAdverse(etat, monCote);
  if (etat.decision && etat.decision.cote === monCote) vue.decision = etat.decision;

  // Le banc et le terrain viennent du moteur : un remplaçant déjà entré ne doit
  // plus apparaître comme disponible, et un exclu ne doit plus être remplaçable.
  const e = rejouer(etat, etat.horloge, null);
  const cible = MOTEUR[monCote];
  vue.remplacementsFaits = cible === 'A' ? e.remplacementsA : e.remplacementsB;
  for (const p of e.pions) {
    if (p.cote !== cible) continue;
    const ligne = { carteId: p.sourceId, nom: p.nom, numero: p.numero, poste: p.poste };
    if (p.surLeTerrain && p.numero <= 15) vue.surLeTerrain.push(ligne);
    else if (!p.surLeTerrain && p.minutes === 0 && p.numero > 15) vue.surLeBanc.push(ligne);
  }
  vue.surLeTerrain.sort((a, b) => a.numero - b.numero);
  vue.surLeBanc.sort((a, b) => a.numero - b.numero);
  return vue;
}
