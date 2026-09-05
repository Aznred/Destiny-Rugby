// ═══════════════════════════════════════════════════════════════════════════
// L'ÉCUSSON D'UN CLUB, SANS SON FOND BLANC
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ PRESQUE LA MOITIÉ DES ÉCUSSONS DU JEU SONT LIVRÉS AVEC UN FOND BLANC.
// Mesuré sur 108 logos de `public/logos/` tirés au hasard : 53 sont déjà
// détourés, 46 portent un rectangle blanc opaque, 9 un fond coloré. Posés sur
// le vert nuit du jeu, ces 46-là font une vignette blanche au milieu de la
// page — c'est ce qu'on voit dans le classement et sur les cartes.
//
// ⚠️ UN FILTRE CSS NE PEUT PAS FAIRE CE TRAVAIL, et c'est mesuré aussi. Un
// `feColorMatrix` qui rend transparent ce qui est clair enlève bien le fond…
// et TROUS les blancs INTÉRIEURS avec : le S blanc du Stade Toulousain
// disparaît, les liserés blancs des écussons deviennent des trous. Essayé sur
// six logos, le résultat est inutilisable.
//
// La seule façon correcte est de distinguer le fond du dessin, donc de partir
// des BORDS : on remplit depuis le cadre tant qu'on rencontre du blanc, et on
// s'arrête au premier pixel coloré. Le blanc enfermé dans l'écusson n'est
// jamais atteint. C'est ce que fait `detourer`.
//
// ⚠️ LES 599 ÉCUSSONS DISTANTS PASSENT PAR UN RELAIS. Les logos de Fédérale et
// de Régionale sont servis par l'API de la FFR, qui ne renvoie pas d'en-tête
// CORS utilisable : dessinés sur un canvas, ils le « souillent » et
// `getImageData` lève. Mesuré sur trois d'entre eux : refus avec `crossOrigin`,
// canvas souillé sans. `sourceEcusson` (`lib/ecussons.ts`) les fait donc passer
// par notre propre origine, ce qui les rend détourables comme les autres.
//
// Le composant ne suppose jamais que le détourage a réussi : quand il échoue —
// relais indisponible, image introuvable, fond coloré — l'image d'origine
// reste affichée telle quelle.

import { useEffect, useState } from 'react';
import { sourceEcusson } from '../lib/ecussons';

/** Le résultat par URL : une image détourée, ou `null` si on n'a pas pu. */
const cache = new Map<string, string | null>();
const enCours = new Map<string, Promise<string | null>>();

/** Un pixel de fond : opaque et quasiment blanc. */
const EST_BLANC = 226;
/** Au-delà, on ne redimensionne pas : les écussons ne sont jamais grands. */
const TAILLE_MAX = 160;

function detourer(image: HTMLImageElement): string | null {
  const l = Math.min(TAILLE_MAX, image.naturalWidth || TAILLE_MAX);
  const h = Math.min(TAILLE_MAX, image.naturalHeight || TAILLE_MAX);
  const toile = document.createElement('canvas');
  toile.width = l; toile.height = h;
  const ctx = toile.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, l, h);

  let donnees: ImageData;
  try { donnees = ctx.getImageData(0, 0, l, h); }
  catch { return null; } // Canvas souillé : image d'un autre domaine.
  const p = donnees.data;
  const blanc = (i: number) => p[i + 3] > 200 && p[i] >= EST_BLANC && p[i + 1] >= EST_BLANC && p[i + 2] >= EST_BLANC;

  // Rien à faire si les quatre coins sont déjà transparents.
  const coins = [0, (l - 1) * 4, (h - 1) * l * 4, ((h - 1) * l + l - 1) * 4];
  if (coins.every((i) => p[i + 3] < 200)) return null;
  if (!coins.some(blanc)) return null; // Fond coloré : on n'y touche pas.

  // ── Le remplissage depuis les bords ──────────────────────────────────────
  const vus = new Uint8Array(l * h);
  const pile: number[] = [];
  const pousser = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= l || y >= h) return;
    const n = y * l + x;
    if (vus[n]) return;
    vus[n] = 1;
    if (blanc(n * 4)) pile.push(n);
  };
  for (let x = 0; x < l; x++) { pousser(x, 0); pousser(x, h - 1); }
  for (let y = 0; y < h; y++) { pousser(0, y); pousser(l - 1, y); }
  let efface = 0;
  while (pile.length) {
    const n = pile.pop()!;
    p[n * 4 + 3] = 0;
    efface++;
    const x = n % l, y = (n / l) | 0;
    pousser(x + 1, y); pousser(x - 1, y); pousser(x, y + 1); pousser(x, y - 1);
  }
  // Moins de 3 % effacé : ce n'était pas un fond, on ne dégrade pas l'image.
  if (efface < l * h * 0.03) return null;

  // ── L'ADOUCISSEMENT DU BORD, et il n'est pas facultatif ──────────────────
  // Les écussons sont anticrénelés : entre le dessin et le fond blanc, il
  // reste une frange de pixels presque blancs que le remplissage n'a pas
  // touchés parce qu'ils ne sont pas ASSEZ blancs. Sans cette passe, chaque
  // écusson détouré garde un liseré blanc qui se voit encore plus que le fond
  // d'origine. On rend donc ces pixels d'autant plus transparents qu'ils sont
  // clairs — l'anticrénelage redevient un dégradé vers le vide.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      const n = y * l + x;
      const i = n * 4;
      if (p[i + 3] === 0) continue;
      const voisinVide = (x > 0 && p[(n - 1) * 4 + 3] === 0) || (x < l - 1 && p[(n + 1) * 4 + 3] === 0)
        || (y > 0 && p[(n - l) * 4 + 3] === 0) || (y < h - 1 && p[(n + l) * 4 + 3] === 0);
      if (!voisinVide) continue;
      const clarte = Math.min(p[i], p[i + 1], p[i + 2]);
      if (clarte < 170) continue;
      p[i + 3] = Math.round(p[i + 3] * Math.max(0, (EST_BLANC - clarte) / (EST_BLANC - 170)));
    }
  }
  ctx.putImageData(donnees, 0, 0);
  return toile.toDataURL('image/png');
}

function preparer(logo: string): Promise<string | null> {
  const connu = enCours.get(logo);
  if (connu) return connu;
  const travail = new Promise<string | null>((resoudre) => {
    const image = new Image();
    image.onload = () => { try { resoudre(detourer(image)); } catch { resoudre(null); } };
    image.onerror = () => resoudre(null);
    image.src = sourceEcusson(logo);
  }).then((resultat) => { cache.set(logo, resultat); return resultat; });
  enCours.set(logo, travail);
  return travail;
}

/**
 * L'écusson d'un club. Rend le logo détouré dès qu'il est prêt, l'original en
 * attendant — jamais de case vide, jamais de scintillement.
 */
export function EcussonClub({ logo, nom, taille = 28, className }: {
  logo?: string; nom?: string; taille?: number; className?: string;
}) {
  const [source, setSource] = useState<string | undefined>(() => logo ? cache.get(logo) ?? sourceEcusson(logo) : undefined);
  useEffect(() => {
    if (!logo) return setSource(undefined);
    const deja = cache.get(logo);
    if (deja !== undefined) return setSource(deja ?? sourceEcusson(logo));
    setSource(sourceEcusson(logo));
    let actif = true;
    void preparer(logo).then((r) => { if (actif) setSource(r ?? sourceEcusson(logo)); });
    return () => { actif = false; };
  }, [logo]);
  if (!source) return null;
  return <img className={className ?? 'ecusson-club'} src={source} alt="" title={nom}
    width={taille} height={taille} style={{ width: taille, height: taille }} loading="lazy" decoding="async" />;
}
