// ═══════════════════════════════════════════════════════════════════════════
// LES AUTOMATISMES — pourquoi acheter dix stars ne suffit pas
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « je mettrais une stat d'équipe extrêmement importante : Cohésion
// 74/100 […] Donc acheter 10 stars pendant l'été ne te donne pas immédiatement
// une équipe imbattable. » Puis, mieux : « je ne ferais pas qu'une seule
// cohésion : Mêlée 87 · Touche 82 · Ligne arrière 91 · Défense 76 · Attaque 84.
// Tu changes ton talonneur titulaire ? Cohésion touche 88 → 79, parce que les
// timings avec les sauteurs changent. »
//
// ⚠️ CINQ SECTEURS, PAS UN SEUL, ET C'EST TOUT L'INTÉRÊT. Une cohésion unique
// ne peut pas dire « ma mêlée tourne mais ma touche est neuve » : elle
// moyennerait les deux et n'orienterait aucune décision. Avec cinq, changer de
// talonneur coûte cher en touche et ne touche pas la ligne arrière — et le
// manager voit exactement ce qu'il vient de casser.
//
// ⚠️ ET C'EST UN ÉTAT PERSISTÉ, pas un calcul. La cohésion est la trace de ce
// qu'on a fait jouer et travailler ensemble pendant des semaines : la
// recalculer à la volée reviendrait à l'oublier à chaque rechargement, donc à
// supprimer la mécanique.

import type { PosteId } from '../types';
import { familleDe } from './jeunes';
import type { SecteurCohesion } from './entrainementPro';

export const SECTEURS_COHESION: SecteurCohesion[] = [
  'melee', 'touche', 'ligneArriere', 'defense', 'attaque',
];

export type Automatismes = Record<SecteurCohesion, number>;

/** Un groupe qui n'a jamais joué ensemble démarre bas, mais pas à zéro. */
export function automatismesNeufs(): Automatismes {
  return { melee: 45, touche: 45, ligneArriere: 45, defense: 45, attaque: 45 };
}

/**
 * QUI COMPTE DANS QUEL SECTEUR.
 *
 * ⚠️ UN JOUEUR PÈSE DANS PLUSIEURS SECTEURS, avec des poids différents. Un
 * talonneur est central en touche (il lance) et important en mêlée ; un ailier
 * ne compte ni dans l'une ni dans l'autre. Sans cette table, changer n'importe
 * qui coûterait la même chose partout, et « tu changes ton talonneur » ne
 * voudrait rien dire de particulier.
 */
const POIDS_SECTEUR: Record<string, Partial<Record<SecteurCohesion, number>>> = {
  pilier: { melee: 1.0, defense: 0.4, attaque: 0.2 },
  talonneur: { melee: 0.9, touche: 1.0, defense: 0.4, attaque: 0.2 },
  deuxieme_ligne: { melee: 0.8, touche: 1.0, defense: 0.5, attaque: 0.3 },
  troisieme_ligne: { melee: 0.5, touche: 0.7, defense: 0.9, attaque: 0.6 },
  demi_melee: { attaque: 1.0, defense: 0.5, ligneArriere: 0.6, melee: 0.3 },
  demi_ouverture: { attaque: 1.0, ligneArriere: 0.9, defense: 0.6 },
  centre: { ligneArriere: 1.0, defense: 0.9, attaque: 0.8 },
  ailier: { ligneArriere: 0.9, attaque: 0.6, defense: 0.5 },
  arriere: { ligneArriere: 1.0, defense: 0.7, attaque: 0.5 },
};

export function poidsDansSecteur(poste: PosteId, secteur: SecteurCohesion): number {
  return POIDS_SECTEUR[familleDe(poste)]?.[secteur] ?? 0;
}

/**
 * CE QUE COÛTE UN CHANGEMENT DE TITULAIRE.
 *
 * Demande : « Cohésion touche 88 → 79 » quand le talonneur change. Le coût suit
 * le POIDS du joueur remplacé dans ce secteur, et il est d'autant plus lourd que
 * la cohésion était haute — on ne casse que ce qui existait.
 *
 * ⚠️ ON NE DESCEND JAMAIS SOUS UN PLANCHER. Un XV de professionnels qui se
 * connaissent depuis une semaine joue mal, pas comme une équipe d'inconnus
 * ramassés dans la rue. Sans plancher, un mercato agité mettait la cohésion à
 * zéro et l'équipe devenait injouable pendant six mois — une punition sans
 * issue, pas une mécanique.
 */
export const PLANCHER_COHESION = 28;

export function apresChangements(
  actuels: Automatismes,
  sortants: PosteId[],
  entrants: PosteId[],
): Automatismes {
  const suivants = { ...actuels };
  for (const secteur of SECTEURS_COHESION) {
    let choc = 0;
    for (const p of sortants) choc += poidsDansSecteur(p, secteur);
    for (const p of entrants) choc += poidsDansSecteur(p, secteur) * 0.5;
    if (choc <= 0) continue;
    const perte = Math.min(26, choc * 7.5) * (0.45 + actuels[secteur] / 180);
    suivants[secteur] = Math.max(PLANCHER_COHESION, Math.round(actuels[secteur] - perte));
  }
  return suivants;
}

/**
 * CE QU'UNE SEMAINE DE TRAVAIL ET UN MATCH REMETTENT.
 *
 * ⚠️ LA REMONTÉE EST PLUS LENTE QUE LA CHUTE, et il le faut. Une chute de neuf
 * points regagnée en une semaine rendrait le mercato indolore : on changerait
 * son talonneur tous les mois sans jamais le payer. Ici, il faut trois ou quatre
 * semaines pour effacer un seul changement — « après quelques semaines : 79 → 83
 * → 87… », c'est littéralement la courbe de la demande.
 *
 * ⚠️ ET LE MATCH VAUT PLUS QUE L'ENTRAÎNEMENT. On se soude en jouant ensemble,
 * pas en répétant à l'entraînement : sans cet écart, faire tourner l'effectif
 * n'aurait aucun coût d'automatismes.
 */
export function apresLaSemaine(
  actuels: Automatismes,
  travail: Partial<Record<SecteurCohesion, number>>,
  aJoueEnsemble: boolean,
): Automatismes {
  const suivants = { ...actuels };
  for (const secteur of SECTEURS_COHESION) {
    const seances = travail[secteur] ?? 0;
    const gainMatch = aJoueEnsemble ? 1.5 : 0;
    // Le plafond se rapproche lentement : les derniers points sont les plus durs.
    const marge = (100 - actuels[secteur]) / 100;
    const gain = (seances * 0.55 + gainMatch) * (0.35 + marge);
    // Sans rien faire, les automatismes s'émoussent doucement.
    const derive = seances === 0 && !aJoueEnsemble ? -0.6 : 0;
    suivants[secteur] = Math.max(
      PLANCHER_COHESION,
      Math.min(100, Math.round((actuels[secteur] + gain + derive) * 10) / 10),
    );
  }
  return suivants;
}

/**
 * LA CONNEXION ENTRE DEUX JOUEURS.
 *
 * Demande : « Dupont – Ntamack · Connexion 94 ; Nouveau 9 – Ntamack ·
 * Connexion 51 ».
 *
 * ⚠️ ON NE STOCKE PAS UNE MATRICE DE 50 × 50. Deux mille cinq cents nombres
 * dans la sauvegarde pour une information qu'on lit à quinze endroits, ce
 * serait faire exploser le quota du `localStorage` (le projet a déjà payé ça
 * avec `statsReelles`). La connexion se DÉDUIT du nombre de semaines passées
 * ensemble dans le même secteur, qui est déjà compté.
 */
export function connexion(
  semainesEnsemble: number,
  a: PosteId,
  b: PosteId,
  automatismes: Automatismes,
): number {
  let poids = 0; let base = 0;
  for (const secteur of SECTEURS_COHESION) {
    const p = Math.min(poidsDansSecteur(a, secteur), poidsDansSecteur(b, secteur));
    if (p <= 0) continue;
    poids += p;
    base += p * automatismes[secteur];
  }
  if (poids <= 0) return Math.round(30 + Math.min(28, semainesEnsemble * 0.7));
  const socle = base / poids;
  // Le temps passé ensemble compte autant que le secteur : c'est ce qui fait la
  // différence entre deux joueurs d'une même ligne arrière bien rodée.
  return Math.max(1, Math.min(99, Math.round(socle * 0.62 + Math.min(38, semainesEnsemble * 1.1))));
}

/**
 * LE MULTIPLICATEUR QUE LE MOTEUR CONSOMME.
 *
 * ⚠️ L'AMPLITUDE EST DÉLIBÉRÉMENT ÉTROITE (±6 %). La cohésion doit se sentir
 * sans réécrire la hiérarchie : le score d'un match vient de la ligue, et une
 * mécanique d'automatismes qui vaudrait vingt points de force d'effectif ferait
 * gagner des matchs qu'on devait perdre. Six pour cent, c'est ce qui fait
 * basculer un match serré — exactement ce qu'on veut d'un mercato mal digéré.
 */
export function effetSurLeJeu(automatismes: Automatismes): number {
  const moyenne = SECTEURS_COHESION.reduce((s, k) => s + automatismes[k], 0) / SECTEURS_COHESION.length;
  return 1 + (moyenne - 62) / 630;
}

/** La cohésion globale affichée en tête d'écran. */
export function cohesionGlobale(a: Automatismes): number {
  return Math.round(SECTEURS_COHESION.reduce((s, k) => s + a[k], 0) / SECTEURS_COHESION.length);
}

export function libelleCohesion(v: number): 'neuve' | 'fragile' | 'correcte' | 'solide' | 'rodee' {
  if (v < 40) return 'neuve';
  if (v < 55) return 'fragile';
  if (v < 70) return 'correcte';
  if (v < 85) return 'solide';
  return 'rodee';
}
