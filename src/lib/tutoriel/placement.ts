// OÙ POSER LA BULLE — une fonction pure, testée par `npm run verify:tutoriel` sur vingt tailles d'écran.
//
// Demande : « les bulles ne doivent jamais sortir de l'écran, ne pas cacher le bouton expliqué, se repositionner
// automatiquement selon l'orientation ».
//
// ═══ LA RÈGLE, DANS L'ORDRE ═════════════════════════════════════════════════
//
// 1. Pas de cible : la bulle est AU CENTRE.
// 2. Écran étroit (téléphone en portrait, < 640 px) : une FEUILLE pleine largeur, collée en haut ou en bas, du côté où la cible
//    n'est pas. C'est la seule disposition qui laisse toujours de la place à une bulle de trois lignes sur 360 px de large.
// 3. Sinon une bulle flottante : du côté demandé s'il tient, sinon en dessous, au-dessus, à droite, à gauche — la PREMIÈRE
//    qui tient dans l'écran SANS toucher la cible (marge comprise).
// 4. Aucune ne tient (cible énorme, écran minuscule) : la feuille, du côté qui recouvre le moins la cible, et `chevauche`
//    le dit — l'overlay fait alors défiler la page pour dégager la cible.

import type { CoteBulle } from './types';

export interface Boite { x: number; y: number; w: number; h: number }
export interface Vue { w: number; h: number }

export interface Placement {
  mode: 'centre' | 'flottante' | 'feuille';
  /** Coin haut-gauche et largeur de la bulle (feuille : pleine largeur, `y` est le haut OU le bas selon `enHaut`). */
  x: number;
  y: number;
  w: number;
  /** Hauteur retenue (la bulle est bornée par la vue). */
  h: number;
  /** Feuille : collée en haut (`true`) ou en bas. */
  enHaut: boolean;
  /** Le bord de la bulle qui porte la flèche vers la cible — absent s'il n'y a pas de cible ou pas de flèche utile. */
  bord: CoteBulle | null;
  /** Position de la flèche le long de ce bord, en px depuis le début de la bulle. */
  fleche: number;
  /** La bulle recouvre encore la cible. */
  chevauche: boolean;
}

export const MARGE = 12;
export const ECART = 18;
export const MARGE_ANNEAU = 8;
export const LARGEUR_FLOTTANTE = 372;
export const LARGEUR_CARTE = 460;
export const SEUIL_FEUILLE = 640;

/**
 * Un écran « étroit » est un téléphone TENU EN PORTRAIT : la feuille pleine largeur est alors la seule disposition qui laisse de la place.
 * Un téléphone en PAYSAGE (568 × 320…) est plus large que haut : une bulle posée À CÔTÉ de la cible tient, et une feuille de la moitié de
 * la hauteur recouvrirait presque tout.
 */
export const estPortraitEtroit = (vue: Vue): boolean => vue.w < SEUIL_FEUILLE && vue.h >= vue.w * 0.8;
/** Part de la hauteur de l'écran qu'une feuille peut occuper. */
export const PART_FEUILLE = 0.46;

const OPPOSE: Record<CoteBulle, CoteBulle> = { haut: 'bas', bas: 'haut', gauche: 'droite', droite: 'gauche' };

const bornes = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

function aire(a: Boite, b: Boite): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/** La cible élargie de la marge de l'anneau, ramenée dans la vue (une cible plus haute que l'écran ne déborde pas). */
export function boiteDeLaCible(cible: Boite, vue: Vue): Boite {
  const x = Math.max(0, cible.x - MARGE_ANNEAU);
  const y = Math.max(0, cible.y - MARGE_ANNEAU);
  const x2 = Math.min(vue.w, cible.x + cible.w + MARGE_ANNEAU);
  const y2 = Math.min(vue.h, cible.y + cible.h + MARGE_ANNEAU);
  return { x, y, w: Math.max(0, x2 - x), h: Math.max(0, y2 - y) };
}

export function placerLaBulle(
  cible: Boite | null,
  bulle: Vue,
  vue: Vue,
  cotePrefere?: CoteBulle,
): Placement {
  const hMax = Math.max(80, vue.h - 2 * MARGE);

  // ── 1. Pas de cible : au centre ───────────────────────────────────────────
  if (!cible) {
    const w = Math.min(LARGEUR_CARTE, vue.w - 2 * MARGE);
    const h = Math.min(bulle.h, hMax);
    return { mode: 'centre', x: (vue.w - w) / 2, y: (vue.h - h) / 2, w, h, enHaut: false, bord: null, fleche: 0, chevauche: false };
  }

  const R = boiteDeLaCible(cible, vue);
  const cx = R.x + R.w / 2;
  const cy = R.y + R.h / 2;

  // ── 2/4. La feuille ───────────────────────────────────────────────────────
  const feuille = (): Placement => {
    // Téléphone : pleine largeur. Grand écran (la cible est trop grande pour une bulle flottante) : une feuille de la largeur
    // d'une bulle, calée sous ou sur la cible — pas un bandeau de 1 200 px dont la phrase se perd.
    const etroit = estPortraitEtroit(vue);
    const w = etroit ? vue.w - 2 * MARGE : Math.min(LARGEUR_CARTE, vue.w - 2 * MARGE);
    const x0 = etroit ? MARGE : bornes(cx - w / 2, MARGE, vue.w - MARGE - w);
    const h = Math.min(bulle.h, vue.h * PART_FEUILLE);
    const enHautBox: Boite = { x: x0, y: MARGE, w, h };
    const enBasBox: Boite = { x: x0, y: vue.h - MARGE - h, w, h };
    const chevHaut = aire(R, enHautBox);
    const chevBas = aire(R, enBasBox);
    // Du côté opposé à la cible ; si la cible déborde sur ce côté, de celui qui la recouvre le moins.
    let enHaut = cy > vue.h / 2;
    const choisie = enHaut ? chevHaut : chevBas;
    const autre = enHaut ? chevBas : chevHaut;
    if (choisie > 0 && autre < choisie) enHaut = !enHaut;
    const box = enHaut ? enHautBox : enBasBox;
    const chev = aire(R, box) > 0;
    // La flèche pointe vers la cible : sur le bord bas d'une feuille du haut, sur le bord haut d'une feuille du bas.
    const bord: CoteBulle | null = chev ? null : enHaut ? 'bas' : 'haut';
    return {
      mode: 'feuille', x: box.x, y: box.y, w, h, enHaut,
      bord, fleche: bornes(cx - box.x, 24, w - 24), chevauche: chev,
    };
  };

  if (estPortraitEtroit(vue)) return feuille();

  // ── 3. La bulle flottante ─────────────────────────────────────────────────
  // Paysage de téléphone : une bulle plus étroite (60 % de la largeur) laisse la place de se poser à côté de la cible.
  const w = Math.min(vue.w < SEUIL_FEUILLE ? vue.w * 0.6 : LARGEUR_FLOTTANTE, vue.w - 2 * MARGE);
  const h = Math.min(bulle.h, hMax);
  const ordre: CoteBulle[] = [];
  for (const c of [cotePrefere, 'bas', 'haut', 'droite', 'gauche'] as (CoteBulle | undefined)[]) {
    if (c && !ordre.includes(c)) ordre.push(c);
  }
  for (const cote of ordre) {
    let x = 0;
    let y = 0;
    if (cote === 'bas') { x = cx - w / 2; y = R.y + R.h + ECART; }
    else if (cote === 'haut') { x = cx - w / 2; y = R.y - ECART - h; }
    else if (cote === 'droite') { x = R.x + R.w + ECART; y = cy - h / 2; }
    else { x = R.x - ECART - w; y = cy - h / 2; }
    x = bornes(x, MARGE, vue.w - MARGE - w);
    y = bornes(y, MARGE, vue.h - MARGE - h);
    const box: Boite = { x, y, w, h };
    const dedans = box.x >= MARGE - 0.5 && box.y >= MARGE - 0.5 && box.x + w <= vue.w - MARGE + 0.5 && box.y + h <= vue.h - MARGE + 0.5;
    if (!dedans || aire(R, box) > 0) continue;
    const vertical = cote === 'bas' || cote === 'haut';
    const fleche = vertical ? bornes(cx - x, 26, w - 26) : bornes(cy - y, 26, h - 26);
    return { mode: 'flottante', x, y, w, h, enHaut: false, bord: OPPOSE[cote], fleche, chevauche: false };
  }
  return feuille();
}
