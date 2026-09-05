// LE TIRAGE DÉTERMINISTE DE LA LIGUE
//
// ⚠️ POURQUOI CE PRNG EST RECOPIÉ ICI ALORS QUE `lib/championnat.ts` EN A DÉJÀ
// UN. La règle du dossier `lib/ligue/` est simple et elle ne souffre pas
// d'exception : **tout ce qui vit ici doit pouvoir tourner dans une fonction
// serverless**, donc sans store, sans DOM, et sans traîner le domaine du jeu
// derrière soi. Or `championnat.ts` importe `effectif`, `divisions`, le
// calendrier et l'atlas des clubs, et garde un registre mutable au niveau du
// module : l'importer pour six lignes de PRNG ferait entrer 800 clubs et
// 6 306 joueurs dans le serveur.
//
// Ce n'est pas une règle du jeu qu'on duplique — c'est un utilitaire. L'algo
// est le même (mulberry32 amorcé par un hachage de chaîne), volontairement,
// pour que deux tirages écrits des deux côtés donnent la même suite.

/** Générateur pseudo-aléatoire amorcé par une chaîne. Toujours la même suite. */
export function graine(s: string): () => number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entier dans [min, max] inclus. */
export function entre(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Mélange de Fisher-Yates, sur une COPIE.
 *
 * ⚠️ Sur une copie, et c'est délibéré : le vivier d'une ligue est tiré une
 * seule fois puis relu par la dotation, les packs et le marché. Un mélange en
 * place transformerait une simple lecture en effet de bord — et deux appels
 * successifs ne donneraient plus le même monde.
 */
export function melanger<T>(liste: readonly T[], rng: () => number): T[] {
  const copie = liste.slice();
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/**
 * Tirage pondéré : rend l'index choisi, ou -1 si tous les poids sont nuls.
 * Sert aux packs (une bande de note a d'autant plus de chances qu'elle pèse).
 */
export function tirerPondere(poids: readonly number[], rng: () => number): number {
  let total = 0;
  for (const p of poids) total += Math.max(0, p);
  if (total <= 0) return -1;
  let seuil = rng() * total;
  for (let i = 0; i < poids.length; i++) {
    seuil -= Math.max(0, poids[i]);
    if (seuil <= 0) return i;
  }
  return poids.length - 1;
}
