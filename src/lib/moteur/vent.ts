// LE VENT — une direction, une force et une graine, fixées au coup d'envoi
//
// ⚠️ TROIS NOMBRES SUFFISENT, ET ILS NE CHANGENT PLUS. Tout le reste (la
// rafale du moment, la dérive d'un ballon, le côté d'où il souffle après la
// mi-temps) s'en déduit par des fonctions pures : le serveur d'une ligue
// n'envoie rien de plus, et deux écrans voient le même vent.
//
// ⚠️ LE VENT A SON PROPRE TIRAGE (`graine('vent#' + clé)`), jamais celui du
// match : le poser ne décale aucun des tirages du moteur.
//
// Le vent est donné dans le repère du STADE. Les équipes changent de côté à la
// mi-temps (`cotesInverses`) : dans le repère du moteur, où l'équipe A attaque
// toujours vers les x croissants, il souffle alors dans l'autre sens — celle
// qui l'avait dans le dos l'a de face.
import { graine } from '../championnat.js';
import type { Vec } from './terrain.js';

export interface Vent {
  /** D'où il pousse le ballon, en radians, dans le repère du stade (0 = vers les x croissants). */
  direction: number;
  /** Vitesse moyenne, en mètres par seconde (0 à 12 : de l'air immobile au coup de vent). */
  force: number;
  /** Graine des rafales. */
  graine: number;
}

/** Ce que le moteur garde du vent : trois champs à plat, pour voyager tels quels dans le film d'un direct. */
export interface EtatVent {
  ventDirection?: number;
  ventForce?: number;
  ventGraine?: number;
  /** Seconde période : les équipes ont changé de côté (repère du stade tourné d'un demi-tour). */
  cotesInverses?: boolean;
}

/** Le vent d'un match, tiré de sa clé : un jour sur trois sans vent, un sur cinq avec un vrai vent. */
export function creerVent(cle: string): Vent {
  const tirage = graine('vent#' + cle);
  const r = tirage();
  const force = r < 0.34 ? tirage() * 2 : r < 0.8 ? 2 + tirage() * 4 : 6 + tirage() * 5;
  return { direction: tirage() * Math.PI * 2, force: Math.round(force * 10) / 10, graine: Math.floor(tirage() * 1e6) };
}

/** La rafale du moment : entre 0,7 et 1,35 fois la force moyenne, lentement. */
export function rafale(e: EtatVent, t: number): number {
  const g = e.ventGraine ?? 0;
  return 1 + 0.22 * Math.sin(0.19 * t + g * 0.0137) + 0.13 * Math.sin(0.071 * t + g * 0.0291);
}

/** Le vent de cet instant dans le repère du MOTEUR, en mètres par seconde. */
export function ventAuMoteur(e: EtatVent, t: number): Vec {
  const force = (e.ventForce ?? 0) * rafale(e, t);
  if (force <= 0) return { x: 0, y: 0 };
  const sensStade = e.cotesInverses ? -1 : 1;
  return { x: Math.cos(e.ventDirection ?? 0) * force * sensStade, y: Math.sin(e.ventDirection ?? 0) * force * sensStade };
}

/** Le vent moyen (sans rafale) : celui qu'un botteur LIT avant de frapper. */
export function ventMoyen(e: EtatVent): Vec {
  const force = e.ventForce ?? 0, sensStade = e.cotesInverses ? -1 : 1;
  return { x: Math.cos(e.ventDirection ?? 0) * force * sensStade, y: Math.sin(e.ventDirection ?? 0) * force * sensStade };
}

/** Prise au vent d'un coup de pied : un rasant y échappe, une chandelle s'y offre. */
const PRISE: Record<string, number> = { rasant: 0.12, parDessus: 0.55, chandelle: 1.25, transversale: 1.1 };

/**
 * De combien le vent déplace le point de chute d'un ballon resté `duree`
 * secondes en l'air. Une poussée constante : la dérive grandit comme le carré
 * du temps — presque rien au départ, tout à la fin.
 */
export function deriveDuVent(vent: Vec, duree: number, intention: string): Vec {
  const k = 0.5 * 0.11 * duree * duree * (PRISE[intention] ?? 1);
  return { x: vent.x * k, y: vent.y * k };
}

/** Les deux composantes du vent pour un coup de pied donné vers `cap` : de dos (positif) ou de face, et de travers. */
export function ventPourLeBotteur(vent: Vec, de: Vec, vers: Vec): { dos: number; travers: number } {
  const dx = vers.x - de.x, dy = vers.y - de.y, d = Math.hypot(dx, dy) || 1;
  return { dos: (vent.x * dx + vent.y * dy) / d, travers: (-vent.x * dy + vent.y * dx) / d };
}

/** L'échelle de Beaufort en un mot, pour l'habillage. */
export function nomDuVent(force: number): 'calme' | 'leger' | 'modere' | 'fort' {
  return force < 1.5 ? 'calme' : force < 4 ? 'leger' : force < 7.5 ? 'modere' : 'fort';
}
