// LE TERRAIN ET SA GÉOMÉTRIE
//
// Tout le moteur travaille en MÈTRES, sur un terrain aux dimensions réelles.
// C'est la seule façon d'écrire des règles justes : « le hors-jeu est à 10 m »,
// « le 50/22 vise les 22 adverses », « le maul part d'une touche à 5 m ».
// L'affichage convertit ensuite en coordonnées SVG — jamais l'inverse.
//
// Repère : X va de 0 (ligne de ballon mort de l'équipe A) à 122
// (ligne de ballon mort de l'équipe B). Y va de 0 à 70 en largeur.
// L'équipe A (domicile) attaque vers les X croissants.

export const LONGUEUR = 122; // 100 m de jeu + 2 × 11 m d'en-but
export const LARGEUR = 70;
export const EN_BUT = 11;
export const LIGNE_A = EN_BUT; // ligne d'essai de A (que B doit franchir)
export const LIGNE_B = LONGUEUR - EN_BUT;
export const MILIEU = LONGUEUR / 2;
export const M22_A = LIGNE_A + 22;
export const M22_B = LIGNE_B - 22;

export interface Vec {
  x: number;
  y: number;
}

export function vec(x: number, y: number): Vec {
  return { x, y };
}

export function distance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normaliser(v: Vec): Vec {
  const n = Math.hypot(v.x, v.y);
  return n < 1e-6 ? { x: 0, y: 0 } : { x: v.x / n, y: v.y / n };
}

export function versLe(de: Vec, vers: Vec): Vec {
  return normaliser({ x: vers.x - de.x, y: vers.y - de.y });
}

export function borner(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// On garde les joueurs sur l'aire de jeu (en-buts compris).
export function dansLeTerrain(p: Vec): Vec {
  return { x: borner(p.x, 1, LONGUEUR - 1), y: borner(p.y, 1, LARGEUR - 1) };
}

// Le ballon est-il sorti en touche ?
export function enTouche(p: Vec): boolean {
  return p.y <= 0 || p.y >= LARGEUR;
}

// Sens d'attaque d'une équipe : +1 pour A (domicile), −1 pour B.
export type Cote = 'A' | 'B';
export function sens(cote: Cote): 1 | -1 {
  return cote === 'A' ? 1 : -1;
}

// La ligne d'essai visée par cette équipe.
export function ligneAdverse(cote: Cote): number {
  return cote === 'A' ? LIGNE_B : LIGNE_A;
}
export function ligneDefendue(cote: Cote): number {
  return cote === 'A' ? LIGNE_A : LIGNE_B;
}

// Distance restante jusqu'à l'en-but adverse.
export function distanceEnBut(p: Vec, cote: Cote): number {
  return Math.abs(ligneAdverse(cote) - p.x);
}

// Le ballon est-il dans les 22 mètres de l'équipe qui défend ?
export function dansLes22(p: Vec, cote: Cote): boolean {
  return cote === 'A' ? p.x >= M22_B : p.x <= M22_A;
}

// Dans SON propre camp (avant la ligne médiane) — condition du 50/22.
export function dansSonCamp(p: Vec, cote: Cote): boolean {
  return cote === 'A' ? p.x < MILIEU : p.x > MILIEU;
}
