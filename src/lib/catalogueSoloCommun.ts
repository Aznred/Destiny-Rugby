import { useEffect, useState } from 'react';
import { catalogueBaseCarriere, catalogueMondialCarriere } from './ligue/catalogueCarriere';
import type { SourceCarte } from './ligue/catalogueCarriere';
import type { EditionJoueur } from './ligue/atelierCatalogue';

let revision = -1;
let courant: readonly SourceCarte[] = catalogueBaseCarriere();
let attente: Promise<readonly SourceCarte[]> | null = null;

/** Le même catalogue de base que la ligue, complété par ses éditions en ligne. */
export function synchroniserCatalogueSolo(): Promise<readonly SourceCarte[]> {
  if (attente) return attente;
  attente = fetch(`/api/carriere?catalogueSolo=1&revision=${revision}`, { cache: 'no-store' })
    .then(async reponse => {
      if (!reponse.ok) throw new Error('Catalogue indisponible');
      const donnees = await reponse.json() as { revision?: number; joueurs?: Record<string, EditionJoueur> };
      if (Number.isInteger(donnees.revision) && donnees.joueurs && typeof donnees.joueurs === 'object') {
        revision = donnees.revision!;
        courant = catalogueMondialCarriere({ revision, joueurs: donnees.joueurs, packs: {}, rotationPacks: false });
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
    const actualiser = () => { void synchroniserCatalogueSolo().then(afficher); };
    const surVisibilite = () => { if (!document.hidden) actualiser(); };
    actualiser();
    window.addEventListener('destiny-catalogue-solo-actualise', afficher);
    window.addEventListener('focus', actualiser);
    document.addEventListener('visibilitychange', surVisibilite);
    const intervalle = window.setInterval(actualiser, 30_000);
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
