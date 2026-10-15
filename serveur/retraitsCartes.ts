import { catalogueAdmin } from '../src/lib/ligue/atelierCatalogue.js';
import { catalogueMondialCarriere } from '../src/lib/ligue/catalogueCarriere.js';
import { catalogueSpecial } from '../src/lib/ligue/catalogueSpecial.js';

/** Appelé uniquement derrière l'autorisation Kiri de l'atelier. */
export function vueRetraitsCartes(q: string) {
  const normaliser = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const mots = normaliser(q.slice(0, 100)).trim().split(/\s+/).filter(Boolean);
  const sources = [...catalogueMondialCarriere(), ...catalogueSpecial().sources.values()];
  const resultats = mots.length ? sources.filter(c => mots.every(m => normaliser(`${c.nom} ${c.clubReel} ${c.sourceId}`).includes(m))) : [];
  return {
    revision: catalogueAdmin().revision, total: resultats.length,
    cartes: resultats.slice(0, 60).map(c => ({ sourceId: c.sourceId, nom: c.nom, club: c.clubReel, note: c.note,
      type: c.speciale ? 'Spéciale' : 'Normale', variantes: sources.filter(s => s.speciale?.base === c.sourceId).length })),
    retraits: Object.values(catalogueAdmin().retraitsCartes ?? {}).sort((a, b) => b.retireLe.localeCompare(a.retireLe)),
  };
}
