// 🫁 DEUX RÉSERVES, PAS UNE — endurance générale et barre de sprint (Correctif 23, niveau d'IA 4)
//
// Demande : « La stamina actuelle est beaucoup trop faible. En Régionale, le joueur peut être pratiquement
// vidé avant la mi-temps. Séparer endurance générale et énergie de sprint. »
//
// ═══ LE MODÈLE ═══════════════════════════════════════════════════════════════
//
// 1. `endurance` (100 → 0) est l'endurance GÉNÉRALE. Elle ne descend que lentement, sur quatre-vingts minutes d'horloge,
//    avec la distance courue et les efforts du jeu collectif (regroupements, mêlées, mauls, touches). Un titulaire de
//    Régionale doit encore avoir du souffle à l'heure de jeu ; un joueur pro finit le match debout.
// 2. `sprint` (0 → `sprintMax`) est une COURTE réserve : elle ne descend que quand on sprinte, et se recharge dès qu'on
//    ralentit. Un sprint franc la fait passer de 100 à 60 ; trottiner la remonte en quelques secondes.
// 3. `sprintMax` est le plafond de cette réserve : il baisse doucement avec l'endurance générale (≈ 85 à l'heure de jeu,
//    ≈ 70 à la 78ᵉ pour un joueur ordinaire). La fatigue réduit donc la durée du sprint, sa récupération et un peu
//    l'accélération — jamais l'allure de course normale à plat.
// 4. Barre vide : plus de sprint (l'effort retombe à 1). On ne le retrouve qu'après `seuilRelance`, pour ne pas
//    clignoter entre « je peux » et « je ne peux pas » à chaque image.
//
// ⚠️ TOUT CELA EST DERRIÈRE `EtatMatch.ia` ≥ 4 (`enduranceDeuxReserves`) : les matchs de ligue déjà commencés gardent leur
// moteur, et l'empreinte du moteur d'origine ne bouge pas. Les pions portent le drapeau `deuxReserves`.
import type { EtatMatch } from './etat.js';
import type { Pion } from './entites.js';

export const REGLAGES_ENDURANCE = {
  // ── L'endurance générale ───────────────────────────────────────────────────
  /** Part de l'ancienne dépense de course (`deplacer`, fatigue condensée) : étalonnée au banc `mesure:endurance`. */
  usureGenerale: 0.6,
  /** Souffle repris par l'endurance générale pendant un arrêt de jeu, par seconde d'horloge. */
  recupArretGenerale: 0.055,
  /** Elle ne tombe jamais plus bas : un joueur « à plat » court encore. */
  plancher: 12,
  /** Dépense par seconde simulée des efforts collectifs, en points d'endurance générale. */
  coutLien: { ruck: 0.05, melee: 0.09, maul: 0.08, alignement: 0.04 } as Record<string, number>,
  /** Coûts ponctuels d'un geste (points d'endurance générale). */
  coutContreRuck: 0.45,
  coutPercussion: 0.5,
  coutGrattage: 0.35,
  coutPousseeMelee: 0.3,
  // ── La barre de sprint ─────────────────────────────────────────────────────
  /** Points de barre perdus par seconde de sprint plein. Un sprint de six secondes : −38. */
  coutSprint: 6.3,
  /** Plafond de la barre : `sprintMin + sprintPente × endurance`. 100 frais, ≈ 85 à 77 d'endurance, ≈ 70 à 55. */
  sprintMin: 35,
  sprintPente: 0.65,
  /** Récupération par seconde, à l'arrêt ; en trottinant on en retrouve la moitié, en courant presque plus. */
  recupArret: 5.2,
  recupPlancher: 1.1,
  /** Sous ce seuil de barre on est essoufflé : plus de sprint avant d'avoir dépassé `seuilRelance`. */
  seuilVide: 0.8,
  seuilRelance: 18,
  /** Une fatigue générale ralentit la récupération : de 1 (frais) à ce plancher (à plat). */
  recupFatigue: 0.55,
  /** La fatigue générale rogne l'accélération : jusqu'à cette fraction perdue à plat. */
  accelerationFatigue: 0.14,
  /** L'allure de course normale (hors sprint) : de 1 à ce plancher quand l'endurance générale est à plat. */
  allurePlancher: 0.9,
  /** Un effort d'IA au-delà de 1 + ce seuil compte comme du sprint (barre dépensée). */
  seuilSprintIA: 0.035,
} as const;

/** Les deux réserves sont-elles actives dans ce match ? (niveau figé à la création) */
export function enduranceDeuxReserves(e: Pick<EtatMatch, 'ia'>): boolean { return (e.ia ?? 1) >= 4; }

/** Le plafond de la barre de sprint, d'après l'endurance générale. */
export function sprintMaxDe(endurance: number): number {
  const R = REGLAGES_ENDURANCE;
  return Math.min(100, R.sprintMin + R.sprintPente * Math.max(0, Math.min(100, endurance)));
}

/** Allure de course normale (hors sprint) : la fatigue générale n'écrase jamais un joueur sur place. */
export function allureDeCourse(p: Pion): number {
  const R = REGLAGES_ENDURANCE;
  const plancher = p.allurePlancher ?? R.allurePlancher;
  return plancher + (1 - plancher) * (Math.max(0, Math.min(100, p.endurance)) / 100);
}

/** Peut-il sprinter à cet instant ? */
export function peutSprinter(p: Pion): boolean {
  return !p.deuxReserves ? p.endurance > 6 : !p.essoufle;
}

/** Facteur d'accélération : un joueur à plat part un peu moins vite, jamais plus de `accelerationFatigue`. */
export function facteurAcceleration(p: Pion): number {
  const R = REGLAGES_ENDURANCE;
  return 1 - (p.accelFatigue ?? R.accelerationFatigue) * (1 - Math.max(0, Math.min(100, p.endurance)) / 100);
}

/**
 * Un pas d'endurance. `intensite` : allure rapportée à la pointe (0 → 1) ; `sprint` : de 0 (aucun) à 1 (sprint plein).
 * Met à jour `sprint`, `sprintMax`, `essoufle` ET l'endurance générale — c'est la seule porte d'entrée de la dépense de
 * course des deux réserves.
 */
export function pasEndurance(p: Pion, dt: number, intensite: number, sprint: number, multiplicateurGeneral = 1): void {
  const R = REGLAGES_ENDURANCE;
  // L'endurance générale : l'ancienne loi (exposant 1,6 sur l'intensité), à l'échelle de `usureGenerale`.
  if (intensite > 0) {
    p.endurance = Math.max(R.plancher, p.endurance - p.usure * dt * intensite ** 1.6 * 10 * R.usureGenerale * multiplicateurGeneral);
  }
  p.sprintMax = sprintMaxDe(p.endurance);
  if (sprint > 0 && !p.essoufle) {
    // Sprinter coûte un peu plus cher quand on est fatigué.
    const fatigue = 1 + (1 - p.endurance / 100) * 0.35;
    p.sprint = Math.max(0, p.sprint - R.coutSprint * sprint * fatigue * dt);
    if (p.sprint <= R.seuilVide) p.essoufle = true;
  } else {
    // Ralentir recharge la barre : vite à l'arrêt, un peu en trottinant, à peine en courant fort.
    const repos = 1 - Math.min(1, intensite / 0.72);
    const fatigue = R.recupFatigue + (1 - R.recupFatigue) * (p.endurance / 100);
    p.sprint = Math.min(p.sprintMax, p.sprint + (R.recupPlancher + (R.recupArret - R.recupPlancher) * repos) * fatigue * dt);
    if (p.essoufle && p.sprint >= R.seuilRelance) p.essoufle = false;
  }
  if (p.sprint > p.sprintMax) p.sprint = p.sprintMax;
}

/** Un coût ponctuel (regroupement, percussion, grattage…) sur l'endurance générale. */
export function coutEffort(p: Pion, cout: number): void {
  if (!p.deuxReserves) return;
  p.endurance = Math.max(REGLAGES_ENDURANCE.plancher, p.endurance - cout);
  p.sprintMax = sprintMaxDe(p.endurance);
}

/** L'effort d'un pion d'IA, ramené à ce que sa barre de sprint permet : vide, il ne sprinte plus. */
export function effortPermis(p: Pion, effort: number): number {
  if (!p.deuxReserves || !p.essoufle) return effort;
  return Math.min(effort, 1);
}

/** La part de sprint d'un effort d'IA (0 : course normale, 1 : sprint plein à 1,15). */
export function partDeSprintIA(effort: number): number {
  const s = (effort - 1 - REGLAGES_ENDURANCE.seuilSprintIA) / 0.1;
  return s <= 0 ? 0 : Math.min(1.2, s);
}
