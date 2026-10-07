// LES TENUES D'UN MATCH — deux équipes, deux couleurs qu'on ne confond pas, et le même choix partout (Correctif 24)
//
// Demande : « Il faut réellement analyser les deux équipes avant chaque match et déterminer : couleur principale, couleur
// secondaire, contraste, maillot domicile, maillot extérieur éventuel. Éviter absolument : deux équipes presque identiques,
// mauvaise couleur attribuée au club, couleur sans rapport avec son identité. » Et pour le tableau des scores : « Les
// couleurs doivent réellement correspondre aux équipes. »
//
// ═══ CE QUI CLOCHAIT ════════════════════════════════════════════════════════
//
//   1. LE TABLEAU DONNAIT TOUJOURS DU BLANC AU VISITEUR (`couleursEquipeTV(couleur, true)`), quelle que soit sa couleur.
//   2. UN CLUB SANS COULEURS SAISIES RECEVAIT UNE TEINTE TIRÉE DE SON NOM (dix couleurs, au hasard du hachage) : 450 clubs
//      amateurs jouaient dans un maillot sans rapport avec leur écusson.
//   3. L'ÉCUSSON ÉTAIT MAL LU : on gardait le PREMIER pixel de la teinte la plus saturée (souvent un liseré), et le noir
//      comme le blanc étaient écartés d'office — un club noir et blanc jouait donc dans la couleur de son ballon.
//   4. LE DÉPARTAGE N'EXISTAIT QUE DANS LA SCÈNE 3D : le terrain vu de haut et le tableau ne le suivaient pas.
//
// ═══ CE QUE FAIT CE MODULE ══════════════════════════════════════════════════
//
// Fonctions pures, sans DOM (sauf `couleursDepuisEcusson`, qui lit une image) :
//   · `ecartCouleur` : la distance PERÇUE entre deux couleurs (CIE Lab), pas la distance des composantes — un bleu marine
//     et un noir sont proches pour l'œil, un rouge et un orange ne le sont pas ;
//   · `analyserEcusson` : les deux couleurs d'un écusson, pondérées par la SURFACE qu'elles occupent, fond exclu ;
//   · `departagerLesTenues` : si les deux maillots se confondent, le visiteur passe en tenue alternative — sa couleur
//     secondaire si elle tranche, sinon blanc ou anthracite, en gardant sa couleur d'origine sur les parements ;
//   · `couleursDuTableau` : ce que le tableau des scores affiche, texte clair ou sombre selon le contraste.
import type { MaillotMatch } from './moteur/apparenceMatch.js';

type Rvb = [number, number, number];

/** Lit `#abc`, `#aabbcc`, `rgb(…)` ou `hsl(…)`. Renvoie `null` si la couleur n'est pas reconnue. */
export function lireCouleur(couleur: string | undefined | null): Rvb | null {
  if (!couleur) return null;
  const c = couleur.trim().toLowerCase();
  const hex = c.match(/^#([\da-f]{3}|[\da-f]{6})$/)?.[1];
  if (hex) {
    const v = hex.length === 3 ? hex.split('').map((x) => x + x).join('') : hex;
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)) as Rvb;
  }
  const rvb = c.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (rvb) return [Number(rvb[1]), Number(rvb[2]), Number(rvb[3])].map((n) => Math.max(0, Math.min(255, Math.round(n)))) as Rvb;
  const hsl = c.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/);
  if (hsl) {
    const h = ((Number(hsl[1]) % 360) + 360) % 360 / 360, s = Number(hsl[2]) / 100, l = Number(hsl[3]) / 100;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const canal = (t: number) => {
      const u = ((t % 1) + 1) % 1;
      return u < 1 / 6 ? p + (q - p) * 6 * u : u < 1 / 2 ? q : u < 2 / 3 ? p + (q - p) * (2 / 3 - u) * 6 : p;
    };
    return [canal(h + 1 / 3), canal(h), canal(h - 1 / 3)].map((n) => Math.round(n * 255)) as Rvb;
  }
  return null;
}

/** La même couleur, toujours en `#rrggbb` (ou la valeur de repli). */
export function enHex(couleur: string | undefined | null, repli = '#344054'): string {
  const c = lireCouleur(couleur);
  return c ? `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}` : repli;
}

function enLab([r, g, b]: Rvb): Rvb {
  const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** La distance perçue entre deux couleurs (ΔE CIE76) : 0 identiques, ~2 indiscernables, 100 noir contre blanc. */
export function ecartCouleur(a: string, b: string): number {
  const x = lireCouleur(a), y = lireCouleur(b);
  if (!x || !y) return 100;
  const p = enLab(x), q = enLab(y);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** La clarté d'une couleur, de 0 (noir) à 1 (blanc). */
export function clarte(couleur: string): number {
  const c = lireCouleur(couleur);
  return c ? enLab(c)[0] / 100 : 0.5;
}

/** Le texte lisible sur un fond de cette couleur : sombre sur clair, clair sur sombre (contraste WCAG). */
export function texteLisibleSur(couleur: string): string {
  const c = lireCouleur(couleur);
  if (!c) return '#ffffff';
  const [r, g, b] = c.map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#101613' : '#ffffff';
}

const luminanceRelative = (couleur: string): number => {
  const c = lireCouleur(couleur);
  if (!c) return 0;
  const [r, g, b] = c.map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Le rapport de contraste WCAG entre deux couleurs (de 1 à 21). */
export function contraste(a: string, b: string): number {
  const x = luminanceRelative(a), y = luminanceRelative(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** En deçà, deux maillots se confondent sur une pelouse (un bleu marine et un noir sont à 30, un rouge et un bordeaux à 22). */
export const ECART_MINIMAL = 34;
const BLANC = '#f1efe6', ANTHRACITE = '#22262c';

export interface TenuesDuMatch {
  domicile: MaillotMatch;
  exterieur: MaillotMatch;
  /** Le visiteur joue en tenue alternative : ses couleurs étaient trop proches de celles du club qui reçoit. */
  alternative: boolean;
}

/**
 * Deux tenues qu'on ne confond pas. Le club qui reçoit garde la sienne ; le visiteur change si nécessaire.
 *
 * ⚠️ LA TENUE ALTERNATIVE RESTE LA SIENNE. Elle prend d'abord sa couleur SECONDAIRE (les vrais maillots extérieurs sont
 * presque toujours l'inverse du maillot domicile) ; si celle-là se confond aussi, du blanc ou de l'anthracite — et dans
 * tous les cas sa couleur d'origine reste sur les parements et les bas, pour qu'on reconnaisse le club.
 */
export function departagerLesTenues(domicile: MaillotMatch, exterieur: MaillotMatch, fige?: 'exterieur'): TenuesDuMatch {
  const ecart = ecartCouleur(domicile.principal, exterieur.principal);
  if (ecart >= ECART_MINIMAL) return { domicile, exterieur, alternative: false };
  // ⚠️ UN KIT ACHETÉ NE SE REPEINT JAMAIS (`fige`). Si c'est le visiteur qui le porte, c'est le club qui reçoit qui
  // passe en tenue alternative — le joueur a payé ce maillot, il doit le voir sur le terrain.
  if (fige === 'exterieur') {
    const inverse = departagerLesTenues(exterieur, domicile);
    return { domicile: inverse.exterieur, exterieur, alternative: true };
  }
  const candidats = [enHex(exterieur.secondaire, BLANC), BLANC, ANTHRACITE]
    .map((couleur) => ({ couleur, ecart: Math.min(ecartCouleur(couleur, domicile.principal), 60) }));
  // La secondaire d'abord si elle tranche nettement ; sinon ce qui s'écarte le plus du maillot d'en face.
  const choisie = candidats[0].ecart >= ECART_MINIMAL + 4 ? candidats[0]
    : [...candidats].sort((a, b) => b.ecart - a.ecart)[0];
  const origine = enHex(exterieur.principal);
  const clair = clarte(choisie.couleur) > 0.6;
  const tenue: MaillotMatch = {
    ...exterieur,
    principal: choisie.couleur,
    secondaire: origine,
    accent: origine,
    chaussettes: origine,
    short: clair ? origine : BLANC,
    // Deux maillots cerclés ou rayés des mêmes couleurs se confondent même inversés : le visiteur joue uni.
    motif: ['cerceaux', 'rayures'].includes(domicile.motif) || ['cerceaux', 'rayures'].includes(exterieur.motif) ? 'uni' : exterieur.motif,
  };
  delete tenue.texture;
  return { domicile, exterieur: tenue, alternative: true };
}

/** Ce que le tableau des scores affiche pour une équipe : la couleur qu'elle PORTE, son texte, et un liseré à sa seconde couleur. */
export interface CouleursTableau { couleur: string; texte: string; lisere: string }
export function couleursDuTableau(tenue: Pick<MaillotMatch, 'principal' | 'secondaire'>): CouleursTableau {
  let couleur = enHex(tenue.principal);
  // ⚠️ UNE POIGNÉE DE TEINTES MOYENNES NE PORTENT NI LE BLANC NI LE NOIR (contraste 4,0 au lieu des 4,5 lisibles) : on
  // fonce alors le fond de quelques pour cent — la couleur reste celle du club, et le score se lit.
  for (let pas = 0; pas < 8 && contraste(couleur, texteLisibleSur(couleur)) < 4.5; pas++) {
    couleur = `#${lireCouleur(couleur)!.map((v) => Math.round(v * 0.95).toString(16).padStart(2, '0')).join('')}`;
  }
  const seconde = enHex(tenue.secondaire, couleur);
  // Un liseré qui ne se voit pas ne sert à rien : à défaut, celui du texte.
  return { couleur, texte: texteLisibleSur(couleur), lisere: ecartCouleur(couleur, seconde) >= 18 ? seconde : texteLisibleSur(couleur) };
}

/**
 * Les deux couleurs d'un écusson, lues sur ses pixels (`rgba`, ligne par ligne, `largeur` pixels par ligne).
 *
 * ⚠️ ON PÈSE LA SURFACE, PAS LA SATURATION SEULE, ET ON GARDE LE NOIR ET LE BLANC. La couleur d'un club est celle qui
 * COUVRE son écusson ; une étoile jaune de vingt pixels n'en fait pas un club jaune. Seul le FOND est écarté : la couleur
 * qui borde l'image quand elle est opaque (près d'un écusson sur deux a un fond blanc plein).
 * ⚠️ ET ON REND LA MOYENNE DE LA FAMILLE, pas son premier pixel — celui-là était souvent un bord adouci, plus terne.
 */
export function analyserEcusson(rgba: ArrayLike<number>, largeur: number): { principal: string; secondaire: string } | null {
  const hauteur = Math.floor(rgba.length / 4 / largeur);
  if (!largeur || !hauteur) return null;
  interface Famille { r: number; g: number; b: number; n: number; bord: number }
  const familles = new Map<number, Famille>();
  let bordOpaque = 0, bordTotal = 0;
  for (let y = 0; y < hauteur; y++) for (let x = 0; x < largeur; x++) {
    const i = (y * largeur + x) * 4;
    const auBord = x === 0 || y === 0 || x === largeur - 1 || y === hauteur - 1;
    if (auBord) bordTotal++;
    if (rgba[i + 3] < 160) continue;
    if (auBord) bordOpaque++;
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    const cle = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5);
    const f = familles.get(cle);
    if (f) { f.r += r; f.g += g; f.b += b; f.n++; if (auBord) f.bord++; }
    else familles.set(cle, { r, g, b, n: 1, bord: auBord ? 1 : 0 });
  }
  if (!familles.size) return null;
  const hex = (f: Famille) => `#${[f.r, f.g, f.b].map((v) => Math.round(v / f.n).toString(16).padStart(2, '0')).join('')}`;
  let liste = [...familles.values()];
  // Le fond : l'image est opaque jusqu'au bord, et une seule famille en tient plus de la moitié.
  if (bordTotal && bordOpaque / bordTotal > 0.8) {
    const fond = [...liste].sort((a, b) => b.bord - a.bord)[0];
    if (fond.bord / bordOpaque > 0.55) {
      const couleurFond = hex(fond);
      const sans = liste.filter((f) => f !== fond && ecartCouleur(hex(f), couleurFond) > 9);
      if (sans.length) liste = sans;
    }
  }
  const total = liste.reduce((n, f) => n + f.n, 0);
  // La surface d'abord. Une couleur franche pèse un peu plus qu'une couleur sourde ; le blanc, le gris et le noir pèsent
  // moitié moins (ce sont souvent le champ de l'écu ou son contour) — mais ils gagnent quand ils couvrent vraiment l'écusson.
  const poids = (f: Famille) => {
    const vif = (Math.max(f.r, f.g, f.b) - Math.min(f.r, f.g, f.b)) / f.n / 255;
    return (f.n / total) * (vif < 0.12 ? 0.5 : 0.85 + 0.3 * vif);
  };
  // On regroupe les familles voisines (un dégradé se répartit sur plusieurs cases) autour des plus lourdes.
  const groupes: { couleur: string; poids: number }[] = [];
  for (const f of [...liste].sort((a, b) => poids(b) - poids(a))) {
    const c = hex(f);
    const voisin = groupes.find((g) => ecartCouleur(g.couleur, c) < 14);
    if (voisin) voisin.poids += poids(f); else groupes.push({ couleur: c, poids: poids(f) });
  }
  groupes.sort((a, b) => b.poids - a.poids);
  const principal = groupes[0].couleur;
  const second = groupes.find((g) => g.poids > 0.035 && ecartCouleur(g.couleur, principal) >= 28)?.couleur
    ?? (clarte(principal) > 0.55 ? '#191f26' : '#f5f1e2');
  return { principal, secondaire: second };
}

const LECTURES = new Map<string, Promise<{ principal: string; secondaire: string } | null>>();
/** Les couleurs d'un écusson servi par une URL. Chaque écusson n'est lu qu'une fois ; `null` s'il n'est pas lisible. */
export function couleursDepuisEcusson(url: string | undefined): Promise<{ principal: string; secondaire: string } | null> {
  if (!url || typeof document === 'undefined') return Promise.resolve(null);
  let lecture = LECTURES.get(url);
  if (!lecture) {
    lecture = new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        try {
          const cote = 48;
          const toile = document.createElement('canvas'); toile.width = cote; toile.height = cote;
          const ctx = toile.getContext('2d', { willReadFrequently: true });
          if (!ctx) return resolve(null);
          ctx.drawImage(image, 0, 0, cote, cote);
          resolve(analyserEcusson(ctx.getImageData(0, 0, cote, cote).data, cote));
        } catch { resolve(null); }
      };
      image.onerror = () => resolve(null);
      image.src = url;
    });
    LECTURES.set(url, lecture);
    if (LECTURES.size > 400) LECTURES.delete(LECTURES.keys().next().value!);
  }
  return lecture;
}

/**
 * Deux sigles qu'on ne confond pas non plus. « Stade Toulousain » et « RC Toulon » donnaient tous deux « TOU » : le
 * second prend alors ses initiales (« RCT »), sinon ses consonnes.
 */
export function departagerLesSigles(sigleA: string, nomA: string, sigleB: string, nomB: string): [string, string] {
  if (sigleA !== sigleB) return [sigleA, sigleB];
  const net = (nom: string) => nom.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
  // Un sigle déjà écrit dans le nom se garde entier : « RC Toulon » donne « RCT », pas « RT ».
  const initiales = (nom: string) => net(nom).split(/\s+/).filter(Boolean).map((m) => (m.length <= 3 && m === m.toUpperCase() ? m : m[0])).join('').toUpperCase();
  const consonnes = (nom: string) => {
    const mot = net(nom).split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length)[0] ?? '';
    return (mot[0] + mot.slice(1).replace(/[aeiouy]/gi, '')).slice(0, 3).toUpperCase();
  };
  // Le mot qui DIT le club : le plus long, hors « rugby », « club », « olympique »…
  const propre = (nom: string) => net(nom).split(/\s+/).filter((m) => m.length > 2 && !/^(rugby|club|stade|union|racing|sporting|olympique|athletic|association|entente|sportive|sportif)$/i.test(m))
    .sort((a, b) => b.length - a.length)[0] ?? '';
  const candidats = (nom: string) => {
    const mot = propre(nom).toUpperCase();
    return [
      initiales(nom), mot.slice(0, 3), consonnes(nom), mot ? mot[0] + mot.slice(-2) : '', mot ? mot.slice(0, 2) + mot.slice(-1) : '',
      initiales(nom).slice(0, 2) + (mot[0] ?? ''),
    ].map((s) => s.slice(0, 3)).filter((s) => s.length >= 2);
  };
  for (const autre of candidats(nomB)) if (autre !== sigleA) return [sigleA, autre];
  for (const autre of candidats(nomA)) if (autre !== sigleB) return [autre, sigleB];
  return [sigleA, sigleB];
}
