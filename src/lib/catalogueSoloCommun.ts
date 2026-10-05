import { useEffect, useState } from 'react';
import { catalogueBaseCarriere, catalogueMondialCarriere } from './ligue/catalogueCarriere';
import type { SourceCarte } from './ligue/catalogueCarriere';
import type { EditionJoueur } from './ligue/atelierCatalogue';
import { assemblerCatalogueSpecial, type CatalogueSpecial, type DefinitionCarteSpeciale, type EvenementSpecial } from './ligue/cartesSpeciales';
import { fournirCatalogueEffectifs } from './catalogueEffectifs';

let revision = -1;
let courant: readonly SourceCarte[] = catalogueBaseCarriere();
/**
 * Les cartes spéciales publiées (ICONS, Halloween…) et leurs événements, tels
 * que le serveur les sert. `null` tant qu'il n'a pas répondu, ou hors ligne :
 * la collection reste alors celle des joueurs ordinaires.
 */
let speciales: CatalogueSpecial | null = null;
let attente: Promise<readonly SourceCarte[]> | null = null;
let dernierChargement = 0;
const FRAICHEUR_CATALOGUE = 60_000;

export const catalogueSpecialSolo = (): CatalogueSpecial | null => speciales;

/**
 * Le même catalogue de base que la ligue, complété par ses éditions en ligne,
 * puis par les cartes spéciales publiées.
 *
 * ⚠️ LES CARTES SPÉCIALES VONT EN FIN DE LISTE. Une collection solo est
 * indexée par l'empreinte du joueur, mais les packs tirent par INDICE dans ce
 * tableau : ajoutées en tête, elles décaleraient tous les joueurs ordinaires.
 * Et elles n'entrent jamais dans les bandes de rareté (`rayonsDuPack`).
 */
export function synchroniserCatalogueSolo(): Promise<readonly SourceCarte[]> {
  if (attente) return attente;
  if (Date.now() - dernierChargement < FRAICHEUR_CATALOGUE) return Promise.resolve(courant);
  attente = fetch(`/api/carriere?catalogueSolo=1&revision=${revision}`, { cache: 'no-store' })
    .then(async reponse => {
      if (!reponse.ok) throw new Error('Catalogue indisponible');
      const donnees = await reponse.json() as { revision?: number; joueurs?: Record<string, EditionJoueur>;
        speciales?: { definitions?: DefinitionCarteSpeciale[]; evenements?: EvenementSpecial[] } };
      dernierChargement = Date.now();
      if (Number.isInteger(donnees.revision) && donnees.joueurs && typeof donnees.joueurs === 'object') {
        revision = donnees.revision!;
        const mondial = catalogueMondialCarriere({ revision, joueurs: donnees.joueurs, packs: {}, rotationPacks: false });
        fournirCatalogueEffectifs(mondial);
        const definitions = Array.isArray(donnees.speciales?.definitions) ? donnees.speciales!.definitions : [];
        const evenements = Array.isArray(donnees.speciales?.evenements) ? donnees.speciales!.evenements : [];
        const parId = new Map(mondial.map(s => [s.sourceId, s]));
        speciales = assemblerCatalogueSpecial(definitions, evenements, id => parId.get(id));
        courant = speciales.definitions.length ? [...mondial, ...speciales.definitions.map(d => speciales!.sources.get(d.id)!)] : mondial;
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('destiny-catalogue-solo-actualise'));
      }
      return courant;
    })
    .catch(() => courant)
    .finally(() => { attente = null; });
  return attente;
}

export function useCatalogueSolo(): readonly SourceCarte[] {
  const [catalogue, setCatalogue] = useState(courant);
  useEffect(() => {
    let actif = true;
    const afficher = () => { if (actif) setCatalogue(courant); };
    const actualiser = () => { if (!document.hidden) void synchroniserCatalogueSolo().then(afficher); };
    const surVisibilite = () => { if (!document.hidden) actualiser(); };
    actualiser();
    window.addEventListener('destiny-catalogue-solo-actualise', afficher);
    window.addEventListener('focus', actualiser);
    document.addEventListener('visibilitychange', surVisibilite);
    const intervalle = window.setInterval(actualiser, FRAICHEUR_CATALOGUE);
    return () => {
      actif = false;
      window.clearInterval(intervalle);
      window.removeEventListener('destiny-catalogue-solo-actualise', afficher);
      window.removeEventListener('focus', actualiser);
      document.removeEventListener('visibilitychange', surVisibilite);
    };
  }, []);
  return catalogue;
}
