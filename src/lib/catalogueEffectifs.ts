import { catalogueMondialCarriere, type SourceCarte } from './ligue/catalogueCarriere.js';
import { cleClub } from './cleClub.js';
import { MONDE_FEMININ } from './mondeActif.js';

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
      if ((joueur.gender === 'female') !== MONDE_FEMININ) continue;
      const cle = cleClub(joueur.clubReel);
      const liste = clubs.get(cle) ?? [];
      liste.push(joueur);
      clubs.set(cle, liste);
    }
  }
  return clubs.get(cleClub(club)) ?? [];
}
