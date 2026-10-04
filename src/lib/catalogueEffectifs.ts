import { catalogueMondialCarriere, type SourceCarte } from './ligue/catalogueCarriere.js';

let publicSolo: readonly SourceCarte[] | undefined;
let indexSource: readonly SourceCarte[] | undefined;
let clubs = new Map<string, SourceCarte[]>();

/** Les éditions publiques reçues par le solo restent distinctes du contexte serveur. */
export function fournirCatalogueEffectifs(source: readonly SourceCarte[]) { publicSolo = source; }
export function sourceCatalogueEffectifs() { return publicSolo ?? catalogueMondialCarriere(); }
export function joueursCatalogueDuClub(club: string): readonly SourceCarte[] {
  const source = sourceCatalogueEffectifs();
  if (source !== indexSource) {
    indexSource = source;
    clubs = new Map();
    for (const joueur of source) {
      const liste = clubs.get(joueur.clubReel) ?? [];
      liste.push(joueur);
      clubs.set(joueur.clubReel, liste);
    }
  }
  return clubs.get(club) ?? [];
}
