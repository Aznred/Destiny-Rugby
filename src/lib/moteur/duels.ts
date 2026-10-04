// LES DUELS BALLON EN MAIN — LIRE LE CONTACT AVANT DE LE JOUER.
//
// Un plaquage n'est pas « un plaquage » : il arrive de face, de côté ou dans le
// dos, vite ou à l'arrêt, entre deux gabarits qui ne se valent pas. Ce module
// LIT la situation — angle, vitesse de fermeture, rapport de force — et en
// tire ce que le match va montrer : plaquage aux jambes, à la taille, de côté,
// en poursuite, dominant, porteur tenu debout ; défenseur repoussé, déséquilibré
// ou assis par un raffut ; crochet qui élimine ou qui prend à contre-pied.
//
// ⚠️ FONCTIONS PURES, SANS TIRAGE. Tout se déduit des deux joueurs : le même
// contact donne la même lecture, et le moteur garde son RNG pour ce qui se
// décide vraiment (le plaquage aboutit-il ?). C'est ce qui interdit les
// animations spectaculaires entre deux joueurs presque à l'arrêt.

import type { Pion } from './entites.js';
import { borner, sens } from './terrain.js';

/** D'où vient le plaqueur, vu du porteur. */
export type AnglePlaquage = 'face' | 'cote' | 'dos';

export type TypePlaquage =
  | 'jambes'     // le défenseur plonge dans les appuis : le geste d'un petit sur un gros
  | 'taille'     // plaquage classique, épaule au bassin
  | 'haut'       // à la poitrine, réglementaire : on enferme le ballon
  | 'cote'       // pris de travers
  | 'arriere'    // rattrapé et saisi dans le dos
  | 'poursuite'  // cuillère : le défenseur lancé plonge sur les chevilles
  | 'dominant'   // le défenseur gagne nettement l'impact : le porteur recule
  | 'debout'     // porteur enfermé debout, qui ne va au sol qu'après lutte
  | 'accroche';  // le porteur gagne l'impact et emmène son plaqueur

export interface LecturePlaquage {
  type: TypePlaquage;
  angle: AnglePlaquage;
  /** Vitesse à laquelle les deux hommes se rapprochent, en m/s. */
  fermeture: number;
  /** Rapport de force, en points d'attribut : positif pour le défenseur. */
  rapport: number;
  /** Mètres rendus par le porteur (positif) ou gagnés au contact (négatif). */
  recul: number;
}

const poids = (p: Pion) => p.poidsKg ?? (p.avant ? 108 : 90);
const allure = (p: Pion) => Math.hypot(p.vitesse.x, p.vitesse.y);

/** La direction de course du porteur ; à l'arrêt, celle de son attaque. */
function directionDe(p: Pion): { x: number; y: number } {
  const v = allure(p);
  return v > 0.6 ? { x: p.vitesse.x / v, y: p.vitesse.y / v } : { x: sens(p.cote), y: 0 };
}

/**
 * Ce que le duel physique donne au défenseur : technique de plaquage et
 * puissance d'un côté, puissance et appuis de l'autre, et le poids entre les deux.
 */
export function rapportDeForce(porteur: Pion, defenseur: Pion): number {
  return (defenseur.plaquage + defenseur.puissance) / 2
    - (porteur.puissance * 0.62 + porteur.evitement * 0.38)
    + (poids(defenseur) - poids(porteur)) / 6;
}

/**
 * Le plaquage qui vient de RÉUSSIR : comment il s'est fait.
 *
 * @param alternance ±1, tiré de l'horloge et des numéros : départage taille et
 *   poitrine quand rien d'autre ne le fait, sans consommer le RNG du match.
 */
export function lirePlaquage(porteur: Pion, defenseur: Pion, alternance: number): LecturePlaquage {
  const dir = directionDe(porteur);
  const rx = defenseur.pos.x - porteur.pos.x;
  const ry = defenseur.pos.y - porteur.pos.y;
  const ecart = Math.max(0.01, Math.hypot(rx, ry));
  const devant = (rx * dir.x + ry * dir.y) / ecart;
  const angle: AnglePlaquage = devant > 0.45 ? 'face' : devant < -0.3 ? 'dos' : 'cote';
  const fermeture = ((porteur.vitesse.x - defenseur.vitesse.x) * rx + (porteur.vitesse.y - defenseur.vitesse.y) * ry) / ecart;
  const rapport = rapportDeForce(porteur, defenseur);
  const vPorteur = allure(porteur);
  const vDefenseur = allure(defenseur);

  let type: TypePlaquage;
  if (angle === 'dos') {
    // Rattrapé : s'il est à bout de bras et lancé, il plonge ; sinon il saisit.
    type = ecart > 0.95 && vDefenseur > 5.5 ? 'poursuite' : 'arriere';
  } else if (angle === 'cote') {
    type = rapport < -7 || (vPorteur > 6.5 && ecart > 0.9) ? 'jambes' : 'cote';
  } else if (fermeture >= 6.2 && rapport >= 5.5 && vDefenseur >= 2.8) {
    // ⚠️ IL FAUT LES DEUX : de la vitesse ET l'ascendant. Un gros tampon entre
    // deux joueurs à l'arrêt, ou d'un demi de mêlée sur un pilier, n'existe pas.
    type = 'dominant';
  } else if (rapport >= 9 && vPorteur < 4) {
    type = 'debout';
  } else if (rapport <= -8) {
    type = 'jambes';
  } else if (rapport <= -3 && vPorteur >= 4.5) {
    type = 'accroche';
  } else {
    type = alternance > 0 ? 'taille' : 'haut';
  }
  const recul = type === 'dominant' ? borner(0.7 + (fermeture - 6.2) * 0.22 + rapport / 14, 0.7, 2.4)
    : type === 'accroche' ? -borner(0.6 - rapport / 9 + (vPorteur - 4.5) * 0.2, 0.6, 1.8) : 0;
  return { type, angle, fermeture, rapport, recul };
}

/** Ce qu'un raffut ou une percussion RÉUSSIS font du défenseur. */
export type IssueRaffut = 'repousse' | 'equilibre' | 'tombe';

/**
 * ⚠️ UN PETIT ARRIÈRE N'ASSOIT PAS UN PILIER. L'issue se lit sur la puissance,
 * le poids et la vitesse du porteur à l'impact — plus rien n'est tiré au sort.
 */
export function issueRaffut(porteur: Pion, defenseur: Pion): IssueRaffut {
  const ascendant = (porteur.puissance - defenseur.puissance) / 9
    + (poids(porteur) - poids(defenseur)) / 13
    + (allure(porteur) - 4.5) / 2.6;
  // Asseoir un défenseur demande d'arriver LANCÉ : à petite allure, même un pilier ne fait que le déséquilibrer.
  return ascendant >= 2.1 && allure(porteur) >= 5.2 ? 'tombe' : ascendant >= 0.7 ? 'equilibre' : 'repousse';
}

/** Comment le porteur cherche le contact : bras tendu, ou épaule en avant, ballon protégé. */
export type GesteContact = 'epaule' | 'torse' | 'percussion';

export function gesteDeContact(porteur: Pion, defenseur: Pion): GesteContact {
  // Un avant, ou un gabarit lourd, baisse le centre de gravité et entre à
  // l'épaule ; un trois-quarts garde son vis-à-vis à distance, bras tendu.
  if (porteur.avant || poids(porteur) >= 104) return 'percussion';
  return poids(defenseur) > poids(porteur) + 6 ? 'epaule' : 'torse';
}

/** Ce qu'un crochet RÉUSSI fait du défenseur : simplement éliminé, ou pris à contre-pied. */
export type IssueCrochet = 'elimine' | 'contrepied';

export function issueCrochet(porteur: Pion, defenseur: Pion): IssueCrochet {
  const marge = (porteur.evitement - defenseur.plaquage) / 12 + (allure(defenseur) - 3) / 2.2
    + (porteur.vitesseMax - defenseur.vitesseMax) / 1.5;
  // Un défenseur lancé à fond n'a plus d'appui pour se reprendre.
  return marge >= 0.9 ? 'contrepied' : 'elimine';
}

export type VarianteCrochet = 'interieur' | 'exterieur' | 'double' | 'feinte';

/**
 * @param direction ±1 : le sens latéral de l'appui.
 * @param ouvert ±1 : le côté ouvert de la phase.
 */
export function varianteCrochet(porteur: Pion, direction: number, ouvert: number, alternance: number): VarianteCrochet {
  if (allure(porteur) < 3.6) return 'feinte';
  if (porteur.evitement >= 76 && alternance > 0) return 'double';
  return direction === ouvert ? 'exterieur' : 'interieur';
}

/** Les façons de donner après contact. */
export type VarianteOffload = 'une-main' | 'deux-mains' | 'dos' | 'sol';

/**
 * La chance qu'un porteur plaqué fasse vivre le ballon.
 *
 * Elle dépend de ses mains et de sa puissance (rester debout une demi-seconde
 * de plus), du plaquage subi (les bras libres ou non), du soutien (lancé ou
 * arrêté) et du nombre de défenseurs sur lui.
 */
export function chanceOffload(
  porteur: Pion, lecture: LecturePlaquage, soutienLance: boolean, defenseursProches: number, brasLibre: boolean,
): number {
  // ⚠️ RARE, ET ÇA DOIT LE RESTER. Réglé une première fois trop haut (dix offloads par match au
  // lieu de quatre), le jeu ne passait plus par le sol : 3,8 essais par match contre 2,3.
  const mains = 0.008 + porteur.passe / 2900 + porteur.vision / 5800 + Math.max(0, porteur.puissance - 60) / 2400;
  const selonPlaquage: Record<TypePlaquage, number> = {
    jambes: 1.55, poursuite: 1.45, accroche: 1.4, arriere: 1.15, cote: 1.05, taille: 0.95, haut: 0.6, debout: 0.5, dominant: 0.2,
  };
  return borner(
    (mains + (brasLibre ? 0.07 : 0)) * selonPlaquage[lecture.type] * (soutienLance ? 1.3 : 0.55) * (defenseursProches >= 2 ? 0.55 : 1),
    0, 0.3,
  );
}

/** Le risque qu'un offload tenté se perde : ballon lâché, en-avant, passe mal assurée. */
export function risqueOffload(porteur: Pion, lecture: LecturePlaquage, defenseursProches: number): number {
  return borner(
    0.09 + (70 - porteur.passe) / 260 + (lecture.type === 'dominant' ? 0.2 : lecture.type === 'haut' || lecture.type === 'debout' ? 0.08 : 0)
      + Math.max(0, defenseursProches - 1) * 0.06 + Math.max(0, 50 - porteur.endurance) / 300,
    0.05, 0.5,
  );
}

export function varianteOffload(lecture: LecturePlaquage, soutienDerriere: boolean, alternance: number): VarianteOffload {
  if (lecture.type === 'jambes' || lecture.type === 'poursuite') return 'sol';
  if (soutienDerriere && alternance > 0) return 'dos';
  return lecture.type === 'accroche' || lecture.type === 'cote' ? 'une-main' : 'deux-mains';
}
