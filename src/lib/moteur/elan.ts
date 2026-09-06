// 🌊 LA DYNAMIQUE — ce qui fait qu'une équipe « est dedans ».
//
// Retour de jeu, mot pour mot : « c'est pas assez fun, nos actions n'ont aucun
// impact dans le jeu […] un turnover relance la dynamique de l'équipe ».
//
// ═══ POURQUOI UN FICHIER, ET PAS TROIS LIGNES DANS `moteur.ts` ═══════════════
//
// Parce que trois lecteurs en ont besoin, et qu'ils ne peuvent pas s'importer
// entre eux. `moteur.ts` pousse l'élan (turnover, percée, essai) ; `controle.ts`
// et `decisions.ts` le LISENT pour annoncer les pourcentages — et ces deux-là
// ne connaissent pas `moteur.ts`, c'est l'inverse (voir l'entête de
// `controle.ts`). Un module sans dépendance, comme `terrain.ts`, est le seul
// endroit où la règle peut vivre une seule fois.
//
// ═══ CE QUI A ÉTÉ TRANCHÉ ════════════════════════════════════════════════════
//
// 1. **UN SEUL NOMBRE, SIGNÉ.** L'élan est un rapport de force : ce que l'un
//    prend, l'autre le perd. Deux jauges indépendantes auraient laissé les deux
//    équipes être portées en même temps, ce qui ne veut rien dire sur un
//    terrain de rugby.
// 2. **IL AGIT SUR LES DUELS, PAS SUR LE SCORE.** Le score reste celui de la
//    ligue (`plan.ts`) — c'est la règle d'architecture la plus importante du
//    moteur, et l'élan n'y touche pas. Il change le COMMENT : on plaque mieux,
//    on gratte mieux, et le pourcentage affiché sur la carte le dit.
// 3. **IL S'ÉTEINT TOUT SEUL.** Un ballon volé à la 12ᵉ minute ne porte pas
//    l'équipe jusqu'à la sirène. La demi-vie est courte — une possession, deux
//    au plus.

import type { EtatMatch } from './etat.js';
import type { Cote } from './terrain.js';

/**
 * Ce que chaque évènement pousse, du point de vue de celui à qui ça arrive.
 *
 * ⚠️ LE TURNOVER EST LE PLUS FORT DU LOT, et c'est la demande elle-même : « un
 * turnover relance la dynamique de l'équipe ». Voler un ballon, c'est le seul
 * évènement du rugby qui retourne complètement une situation sans coup de
 * sifflet — d'où un demi-point d'élan d'un coup, soit près de la moitié de
 * l'échelle.
 */
export const POUSSEES = {
  /** Ballon volé : grattage, interception, contre-poussée, mêlée retournée. */
  turnover: 0.50,
  /** La ligne d'avantage franchie, le rideau dans le dos. */
  percee: 0.26,
  essai: 0.42,
  /** Un plaquage qui fait reculer : la défense prend le dessus. */
  plaquageDur: 0.10,
  /** Un ballon perdu de ses propres mains. Négatif : on se le pousse à soi. */
  enAvant: -0.24,
  penalite: -0.14,
} as const;

/**
 * Le temps qu'il faut à l'élan pour retomber de moitié, en secondes simulées.
 *
 * ⚠️ QUARANTE SECONDES, C'EST UNE POSSESSION. Plus court, la jauge clignote et
 * personne ne la lit ; plus long, un ballon volé de la 12ᵉ minute porte encore
 * à la 30ᵉ, et l'élan devient une deuxième note d'équipe.
 */
export const DEMI_VIE = 40;

/** L'élan du point de vue d'un camp : +1 il est porté, −1 il subit. */
export function elanDe(e: EtatMatch, cote: Cote): number {
  return cote === 'A' ? e.elan : -e.elan;
}

/**
 * Pousser la dynamique en faveur d'un camp.
 *
 * ⚠️ ON POUSSE VERS LA BORNE, ON N'ADDITIONNE PAS. Une équipe déjà à +0,9 qui
 * vole deux ballons ne monte pas à +1,9 (borné à 1, donc perdu) : elle avance
 * de la moitié de ce qui lui reste. C'est ce qui garde de la marge en haut de
 * l'échelle — sinon le premier turnover sature la jauge et les six suivants ne
 * se voient plus.
 */
export function pousserElan(e: EtatMatch, cote: Cote, montant: number): void {
  // `vise` peut être NÉGATIF : un en-avant pousse contre son propre camp.
  const vise = (cote === 'A' ? 1 : -1) * montant;
  // Ce qui reste avant la borne, dans le sens où l’on pousse.
  const marge = vise > 0 ? 1 - e.elan : 1 + e.elan;
  e.elan = Math.max(-1, Math.min(1, e.elan + vise * Math.min(1, marge / 1.2)));
}

/** L'élan retombe : appelé à chaque pas du moteur. */
export function fondreElan(e: EtatMatch, dt: number): void {
  e.elan *= Math.pow(0.5, dt / DEMI_VIE);
  if (Math.abs(e.elan) < 0.002) e.elan = 0;
}

/**
 * Ce que l'élan ajoute à une probabilité de duel, en points de pourcentage.
 *
 * ⚠️ SIX POINTS AU MAXIMUM, ET C'EST DÉJÀ BEAUCOUP. Un plaquage à 88 % qui
 * passe à 94 %, c'est une chance sur deux de moins de le manquer : ça se voit
 * sur la carte, ça se sent sur le terrain, et ça ne transforme pas un pilier de
 * Fédérale en ailier international. Au-delà, l'élan écraserait les attributs du
 * joueur, qui sont le vrai sujet d'un jeu de carrière.
 */
export const POIDS_DUEL = 0.06;

export function bonusElan(e: EtatMatch, cote: Cote): number {
  return elanDe(e, cote) * POIDS_DUEL;
}
