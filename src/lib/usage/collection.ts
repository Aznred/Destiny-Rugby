import type { EtatCollectionSolo } from '../collectionSolo';
import type { SourceCarte } from '../ligue/catalogueCarriere';
import type { JaugesUsage } from './agregats';

// Installé seulement quand le catalogue est déjà chargé par la collection.
let sources = new Map<string, SourceCarte>();
let precedent: EtatCollectionSolo | undefined;
let resume: JaugesUsage | undefined;
export function fournirCatalogueUsage(catalogue: readonly SourceCarte[], cle: (id: string) => string): void {
  sources = new Map(catalogue.map(c => [cle(c.sourceId), c]));
  precedent = undefined;
}
export function nomCarteUsage(cle: string): string | undefined { return sources.get(cle)?.nom; }
/** Sans catalogue, conserver le résumé connu ; avec catalogue, remplacer aussi un XV devenu incomplet. */
export function fusionnerJaugesCollection(ancienne: JaugesUsage | undefined, actuelle: JaugesUsage): JaugesUsage {
  return actuelle.rares !== undefined ? actuelle : { ...ancienne, ...actuelle };
}
export function jaugesCollection(collection: EtatCollectionSolo): JaugesUsage {
  if (collection === precedent && resume) return resume;
  const exemplaires = Object.entries(collection.quantites).filter(([, n]) => n > 0);
  const possedees = exemplaires.flatMap(([id, n]) => { const c = sources.get(id); return c ? [{ ...c, n }] : []; });
  const besoins: Record<string, number> = { pilier: 2, talonneur: 1, deuxieme_ligne: 2, troisieme_ligne: 3, demi_melee: 1, demi_ouverture: 1, centre: 2, ailier: 2, arriere: 1 };
  let total = 0, places = 0;
  const xv: string[] = [];
  for (const carte of possedees.sort((a, b) => b.note - a.note)) {
    if ((besoins[carte.famille] ?? 0) > 0) { besoins[carte.famille]--; total += carte.note; places++; xv.push(carte.nom.slice(0, 60)); }
  }
  resume = { taille: exemplaires.length, exemplaires: exemplaires.reduce((s, [, n]) => s + n, 0), packs: Object.values(collection.packsOuverts).reduce((s, n) => s + n, 0),
    ...(places === 15 ? { genEquipe: Math.round(total / 15), xv } : {}),
    ...(sources.size ? { rares: possedees.filter(c => c.rarete === 'star' || c.rarete === 'elite').sort((a, b) => (a.rarete === b.rarete ? b.note - a.note : a.rarete === 'star' ? -1 : 1)).slice(0, 60)
      .map(c => ({ nom: c.nom.slice(0, 60), n: c.n, note: c.note, rarete: c.rarete as 'star' | 'elite' })) } : {}) };
  precedent = collection;
  return resume;
}
