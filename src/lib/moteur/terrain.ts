export const LONGUEUR = 122;
export const LARGEUR = 70;
export const EN_BUT = 11;
export const LIGNE_A = EN_BUT;
export const LIGNE_B = LONGUEUR - EN_BUT;
export const MILIEU = LONGUEUR / 2;
export const M22_A = LIGNE_A + 22;
export const M22_B = LIGNE_B - 22;

export interface Vec { x: number; y: number; }
export function vec(x: number, y: number): Vec { return { x, y }; }
export function distance(a: Vec, b: Vec): number { return Math.hypot(a.x - b.x, a.y - b.y); }
export function normaliser(v: Vec): Vec { const n = Math.hypot(v.x, v.y); return n < 1e-6 ? { x: 0, y: 0 } : { x: v.x / n, y: v.y / n }; }
export function versLe(de: Vec, vers: Vec): Vec { return normaliser({ x: vers.x - de.x, y: vers.y - de.y }); }
export function borner(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
export function dansLeTerrain(p: Vec): Vec { return { x: borner(p.x, 1, LONGUEUR - 1), y: borner(p.y, 1, LARGEUR - 1) }; }
export function enTouche(p: Vec): boolean { return p.y <= 0 || p.y >= LARGEUR; }

export type Cote = 'A' | 'B';
export function sens(cote: Cote): 1 | -1 { return cote === 'A' ? 1 : -1; }
export function ligneAdverse(cote: Cote): number { return cote === 'A' ? LIGNE_B : LIGNE_A; }
export function ligneDefendue(cote: Cote): number { return cote === 'A' ? LIGNE_A : LIGNE_B; }
export function distanceEnBut(p: Vec, cote: Cote): number { return Math.abs(ligneAdverse(cote) - p.x); }
export function dansLes22(p: Vec, cote: Cote): boolean { return cote === 'A' ? p.x >= M22_B : p.x <= M22_A; }
export function dansSonCamp(p: Vec, cote: Cote): boolean { return cote === 'A' ? p.x < MILIEU : p.x > MILIEU; }