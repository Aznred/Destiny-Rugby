import { validerCarteNormale, validerClubPropose } from '../src/lib/cartesNormales.js';
import { createHash } from 'node:crypto';
import { clubParNom } from '../src/data/clubs.js';
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

/** Toute la proposition est préparée avant son unique publication atomique. */
export function catalogueAvecClubPropose(courant: CatalogueAdmin, demandeId: string, brut: unknown): CatalogueAdmin {
  const club = validerClubPropose(brut);
  const suivant = structuredClone(courant);
  suivant.clubs ??= {};
  const reference = clubParNom(club.nom);
  suivant.clubs[club.nom] = { ...suivant.clubs[club.nom], ville: club.ville, pays: club.pays,
    latitude: suivant.clubs[club.nom]?.latitude ?? reference?.latitude,
    longitude: suivant.clubs[club.nom]?.longitude ?? reference?.longitude,
    logo: club.logo, c1: club.c1, c2: club.c2 };
  suivant.ajouts ??= {};
  const catalogue = catalogueMondialCarriere(courant);
  const noms = new Set<string>();
  for (const [index, joueur] of club.joueurs.entries()) {
    const cle = joueur.nom.toLocaleLowerCase('fr');
    if (noms.has(cle)) throw new Error(`Le joueur ${joueur.nom} apparaît deux fois dans l'effectif.`);
    noms.add(cle);
    const existantes = catalogue.filter(c => !c.speciale && c.nom.toLocaleLowerCase('fr') === cle
      && c.clubReel.toLocaleLowerCase('fr') === club.nom.toLocaleLowerCase('fr'));
    if (existantes.length > 1) throw new Error(`Plusieurs cartes correspondent à ${joueur.nom}. Corrige-les séparément.`);
    // Le premier identifiant garde la forme historique ; les autres sont stables en cas de reprise.
    const hex = createHash('sha256').update(`${demandeId}:joueur:${index}`).digest('hex').slice(0, 32);
    const uuid = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    const id = existantes[0]?.sourceId ?? `normale-${index === 0 ? demandeId : uuid}`;
    suivant.ajouts[id] = { ...joueur, sourceId: id, ajouteLe: suivant.ajouts[id]?.ajouteLe ?? new Date().toISOString(),
      ...(existantes[0]?.postesSecondaires ? { postesSecondaires: existantes[0].postesSecondaires } : {}) };
    delete suivant.joueurs[id];
  }
  if (Object.keys(suivant.ajouts).length > 5000 || JSON.stringify(suivant).length > 3_000_000) throw new Error('Le catalogue a atteint sa limite.');
  return suivant;
}
