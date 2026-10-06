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
