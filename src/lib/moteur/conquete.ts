// 🏉 LA CONQUÊTE LISIBLE — touches, rucks, mêlées, mauls (Correctif 23, niveau d'IA 4)
//
// Demande : « Si la possession change, le joueur doit pouvoir comprendre pourquoi rien qu'en regardant la scène. Jamais :
// possession équipe A → changement de variable → ballon dans les mains équipe B. »
//
// ═══ LE PRINCIPE ═════════════════════════════════════════════════════════════
//
// Avant ce correctif, chaque conquête se jouait en deux temps : une animation de formation, puis UN instant de résolution où
// l'issue était tirée et la possession changeait d'un coup — le ballon apparaissait alors dans les mains du 9 adverse.
// Désormais l'issue est DÉCIDÉE AVANT le geste qui la montre (le saut, la poussée, le grattage), stockée dans l'état
// (`conquete.issue`, `ruck.duel`, `melee.dyn`…), et la scène joue ce que l'état annonce : l'adversaire capte vraiment, le
// gratteur se couche sur le ballon et le ressort, le pack avance de mètres mesurés. À la fin de la phase, le moteur ne fait
// plus qu'appliquer ce que tout le monde a vu.
//
// ⚠️ TOUT CELA EST DERRIÈRE `EtatMatch.ia` ≥ 4 (`conqueteLisible`). Les matchs de ligue déjà commencés gardent leur moteur.
import type { EtatMatch } from './etat.js';

/** Les conquêtes lisibles sont-elles actives dans ce match ? (niveau figé à la création) */
export function conqueteLisible(e: Pick<EtatMatch, 'ia'>): boolean { return (e.ia ?? 1) >= 4; }

/**
 * LE JEU VIVANT (Correctifs 24 et 25, niveau d'IA 5). Le ballon ne meurt que lorsqu'il est mort : une pénalité accordée avant
 * la sirène se joue jusqu'au bout (touche ou mêlée comprises), un tir manqué qui retombe dans le champ ou dans l'en-but reste
 * en jeu, le regroupement se forme autour du joueur plaqué là où il est tombé, les phases arrêtées partent dès que leurs
 * joueurs sont prêts, un coup de pied dans le jeu courant part vite — et celui qui l'arme peut être plaqué ou contré.
 * ⚠️ Niveau figé à la création du match : les rencontres de ligue commencées avant gardent leur moteur.
 */
export function jeuVivant(e: Pick<EtatMatch, 'ia'>): boolean { return (e.ia ?? 1) >= 5; }

/** La mêlée quand les packs sont prêts : flexion, liaison, jeu — sans temps mort entre les ordres (secondes). */
export const MELEE_VIVE = { liaison: 2.1, impact: 0.8, introduction: 1.0, sortie: 0.8 } as const;
/**
 * Le rituel du buteur sans attente : le tee et le ballon sont installés PENDANT qu'il arrive, il n'en joue donc que la fin
 * (`de` : part de la routine déjà faite quand il s'accroupit), puis recule, vise et frappe.
 */
export const RITUEL_VIF = { celebration: 4.2, ramassage: 1.0, pose: 4.3, de: 0.55, pret: 0.7 } as const;
/**
 * Le délai entre l'armé et la frappe d'un coup de pied dans le jeu courant, par type (secondes). Un coup de pied placé prend
 * son temps ; un rasant ou un petit par-dessus sous pression, non.
 */
export const FRAPPE_VIVE = { rasant: 0.18, chip: 0.24, degagement: 0.32, boite: 0.42, drop: 0.5 } as const;
/** Avant cet instant de la frappe, un défenseur arrivé au contact plaque le botteur ; après, il ne peut plus que gêner ou contrer. */
export const MARGE_DE_FRAPPE = 0.16;
/**
 * La touche (niveau 5) : tant que sa formation n'a pas atteint cette part (alignements en place, ballon en main, personne ne
 * saute encore), son temps s'écoule à ce facteur. Le saut, lui, garde sa durée.
 */
export const CADENCE_TOUCHE = { jusqua: 0.32, facteur: 2.4 } as const;

export const REGLAGES_CONQUETE = {
  // ── La touche ─────────────────────────────────────────────────────────────
  /** Avancement de la formation (0 → 1) où l'issue est tranchée : juste avant le saut, qui part à 0,48. */
  tranchee: 0.42,
  /** Le déroulé s'arrête là quand c'est le joueur qui lance : il annonce, puis il lance, puis on voit le saut. */
  attenteLancer: 0.38,
  /** Part des touches perdues qui sont arrachées en l'air, captées par-dessus, ou tapées vers le 9 adverse. */
  varianteCapte: 0.4,
  varianteArrache: 0.3,
  // ── Le ruck ───────────────────────────────────────────────────────────────
  /** Chance, par ruck contesté (défense au-dessus du ballon, deux défenseurs au moins), d'un contre-ruck visible sans renversement forcé. */
  contreRuckVisible: 0.16,
  // ── La mêlée ──────────────────────────────────────────────────────────────
  /** Mètres par seconde de vitesse visée pour chaque point de rapport de force entre les deux packs. */
  vitessePousseeParPoint: 0.055,
  /** Inertie de la mêlée : en secondes, le temps qu'elle met à prendre sa vitesse. */
  inertiePoussee: 0.5,
  /** Une mêlée ne recule jamais de plus de ce nombre de mètres (le pack qui cède s'écroule ou se relève avant). */
  recuMax: 4.2,
  /** Part de la poussée où l'issue (pénalité, écroulement, mêlée qui tourne, ballon renversé) est tranchée. */
  decision: 0.45,
  /** À moins de cette distance de la ligne (m), un pack qui domine continue de pousser, ballon aux pieds du 8. */
  essaiPortee: 7,
  /** Rapport de force à partir duquel le pack continue de pousser vers la ligne au lieu de libérer le ballon. */
  essaiSeuil: 11,
  /** La poussée, prolongée pour aller jusqu'à la ligne, ne dépasse jamais cette durée (s). */
  poussee: 9,
  // ── Le geste du joueur (mêlée, maul) ──────────────────────────────────────
  /** Secondes entre deux temps de poussée. */
  periodeMelee: 0.85,
  periodeMaul: 0.72,
  /** Fenêtres de justesse autour d'un temps (s) : parfait, correct. */
  fenetreParfaite: 0.11,
  fenetreCorrecte: 0.26,
  /** Ce qu'un geste parfaitement synchronisé ajoute au rapport de force, par poste (points de duel). */
  bonusMelee: { pilier: 13, talonneur: 11, deuxieme: 16, troisieme: 9, huit: 10 } as Record<string, number>,
} as const;
