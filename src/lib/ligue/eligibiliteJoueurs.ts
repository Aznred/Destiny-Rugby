import { SOURCES_FFR_RETIREES } from '../../data/protectionFfr.generated.js';
import type { SourceCarte } from './catalogueCarriere.js';
const retirees = new Set(SOURCES_FFR_RETIREES);
/** Two independent integer hashes: no youth names or licence numbers in this list. */
export function empreinteSourceFfr(id: string): string {
  let a = 2166136261, b = 5381;
  for (const char of id) { a = Math.imul(a ^ char.charCodeAt(0), 16777619); b = Math.imul(b, 33) ^ char.charCodeAt(0); }
  return `${(a >>> 0).toString(36)}.${(b >>> 0).toString(36)}`;
}
export const sourceRetireeFfr = (id: string) => retirees.has(empreinteSourceFfr(id));
export function carteSeniorAutorisee(c: Pick<SourceCarte, 'sourceId' | 'age' | 'origine' | 'gender' | 'retiree' | 'speciale'>, pool: 'men' | 'women' | 'mixed' = 'men') {
  return !c.retiree && !sourceRetireeFfr(c.sourceId) && !sourceRetireeFfr(c.speciale?.base ?? c.sourceId) && (c.origine === 'formation' || c.age >= 18)
    && (pool === 'mixed' || (c.gender === 'female' ? pool === 'women' : pool === 'men'));
}
let fournisseur: () => { pool: 'men' | 'women' | 'mixed'; joueurs: readonly SourceCarte[] } | null = () => null;
export function fournirPoolFfr(f: typeof fournisseur) { fournisseur = f; }
export const poolFfrCourant = () => fournisseur()?.pool ?? 'men';
const caches = new WeakMap<readonly SourceCarte[], Map<string, { ajouts: readonly SourceCarte[] | undefined; resultat: readonly SourceCarte[] }>>();
export function filtrerCatalogueFfr(base: readonly SourceCarte[]): readonly SourceCarte[] {
  const contexte = fournisseur();
  const pool = contexte?.pool ?? 'men';
  const ajouts = contexte?.joueurs;
  const cle = `${pool}`;
  // Cache by identity of both immutable revisions, never by a mutable global flag.
  let cache = caches.get(base); if (!cache) { cache = new Map(); caches.set(base, cache); }
  const existant = cache.get(cle); if (existant && existant.ajouts === ajouts) return existant.resultat;
  const liste = pool === 'women' ? (ajouts ?? []) : [...base, ...(ajouts ?? [])];
  const resultat = [...new Map(liste.filter(c => carteSeniorAutorisee(c, pool)).map(c => [c.sourceId, c])).values()];
  cache.set(cle, { ajouts, resultat }); return resultat;
}
