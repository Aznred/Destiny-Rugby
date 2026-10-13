import { validerCarteNormale } from '../src/lib/cartesNormales.js';
import type { CatalogueAdmin } from '../src/lib/ligue/atelierCatalogue.js';
import { catalogueMondialCarriere } from '../src/lib/ligue/catalogueCarriere.js';

/** Une correction conserve l'identifiant de la carte et donc ses propriétaires et son histoire. */
export function catalogueAvecCarteNormale(courant: CatalogueAdmin, id: string, brut: unknown): CatalogueAdmin {
  const carte = validerCarteNormale(brut);
  const source = catalogueMondialCarriere(courant).find(c => c.sourceId === id);
  if (source?.speciale) throw new Error('Cette carte se modifie dans Cartes spéciales.');
  if (!source && !/^normale-[0-9a-f-]{36}$/.test(id)) throw new Error('Carte introuvable.');
  if (!source && catalogueMondialCarriere(courant).some(c => c.nom.toLocaleLowerCase('fr') === carte.nom.toLocaleLowerCase('fr')
    && c.clubReel.toLocaleLowerCase('fr') === carte.clubReel.toLocaleLowerCase('fr'))) throw new Error('Cette carte existe déjà. Choisis la carte à corriger.');
  const suivant = structuredClone(courant);
  suivant.ajouts ??= {};
  suivant.ajouts[id] = { ...carte, sourceId: id, ajouteLe: suivant.ajouts[id]?.ajouteLe ?? new Date().toISOString(),
    ...(source?.postesSecondaires ? { postesSecondaires: source.postesSecondaires } : {}) };
  delete suivant.joueurs[id];
  if (Object.keys(suivant.ajouts).length > 5000 || JSON.stringify(suivant).length > 3_000_000) throw new Error('Le catalogue a atteint sa limite.');
  return suivant;
}
