// LA GÉOMÉTRIE DU TERRAIN — tout le moteur raisonne EN MÈTRES.
//
// 100 m de jeu + 2 × 11 m d'en-but sur 70 m de large : les dimensions réelles
// d'un terrain de rugby à XV. L'affichage convertit en pixels, jamais l'inverse
// — c'est ce qui permet d'écrire les règles telles qu'elles sont (« le 50/22
// vise les 22 adverses », « la ligne de hors-jeu est au dernier pied »).
//
// Convention de sens : le camp A attaque vers les X croissants (la ligne B),
// le camp B attaque vers les X décroissants (la ligne A).

export const LONGUEUR = 122;
export const LARGEUR = 70;
export const EN_BUT = 11;

export const LIGNE_A = EN_BUT;              // ligne d'essai défendue par A
export const LIGNE_B = LONGUEUR - EN_BUT;   // ligne d'essai défendue par B
export const MILIEU = LONGUEUR / 2;
export const M22_A = LIGNE_A + 22;          // ligne des 22 m du camp A
export const M22_B = LIGNE_B - 22;          // ligne des 22 m du camp B
export const AXE = LARGEUR / 2;

export type Cote = 'A' | 'B';

export interface Vec { x: number; y: number; }

export function vec(x: number, y: number): Vec { return { x, y }; }
export function copie(v: Vec): Vec { return { x: v.x, y: v.y }; }

export function distance(a: Vec, b: Vec): number {
  const dx = a.x - b.x; const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Distance au carré : évite une racine carrée dans les boucles chaudes
// (30 pions × 6 tests par tick × 15 000 ticks par match).
export function distance2(a: Vec, b: Vec): number {
  const dx = a.x - b.x; const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function borner(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function melanger(a: number, b: number, k: number): number { return a + (b - a) * k; }

// Sens de progression d'un camp : +1 pour A, −1 pour B.
export function sens(cote: Cote): 1 | -1 { return cote === 'A' ? 1 : -1; }
export function adverse(cote: Cote): Cote { return cote === 'A' ? 'B' : 'A'; }

// La ligne d'essai que ce camp doit franchir pour marquer.
export function ligneAdverse(cote: Cote): number { return cote === 'A' ? LIGNE_B : LIGNE_A; }
// La ligne d'essai que ce camp défend.
export function ligneDefendue(cote: Cote): number { return cote === 'A' ? LIGNE_A : LIGNE_B; }

// Mètres restants avant la ligne d'essai adverse (négatif = déjà dans l'en-but).
export function metresAvantLaLigne(p: Vec, cote: Cote): number {
  return (ligneAdverse(cote) - p.x) * sens(cote);
}

export function dansLes22Adverses(p: Vec, cote: Cote): boolean {
  return metresAvantLaLigne(p, cote) <= 22;
}

export function dansSes22(p: Vec, cote: Cote): boolean {
  return cote === 'A' ? p.x <= M22_A : p.x >= M22_B;
}

export function dansSonCamp(p: Vec, cote: Cote): boolean {
  return cote === 'A' ? p.x < MILIEU : p.x > MILIEU;
}

export function franchieLigne(p: Vec, cote: Cote): boolean {
  return metresAvantLaLigne(p, cote) <= 0;
}

export function horsDuTerrain(p: Vec): boolean { return p.y <= 0 || p.y >= LARGEUR; }

// Ramène un point dans l'aire de jeu (en-buts compris).
export function dansLAire(p: Vec): Vec {
  return { x: borner(p.x, 0.6, LONGUEUR - 0.6), y: borner(p.y, 0.6, LARGEUR - 0.6) };
}

// LE CÔTÉ OUVERT : le grand côté du terrain depuis le ballon. C'est LA notion
// qui structure toute l'attaque — on joue du côté où il reste de l'espace.
// Renvoie +1 si le large est vers les Y croissants, −1 sinon.
export function coteOuvert(ballon: Vec): 1 | -1 { return ballon.y < AXE ? 1 : -1; }

// Espace disponible entre le ballon et la touche, du côté ouvert.
export function largeurOuverte(ballon: Vec): number {
  return ballon.y < AXE ? LARGEUR - ballon.y : ballon.y;
}

// Point de touche le plus proche (pour les sorties en touche et les alignements).
export function bordProche(y: number): 0 | typeof LARGEUR { return y < AXE ? 0 : LARGEUR; }
