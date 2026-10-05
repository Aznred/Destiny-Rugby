import { randomInt } from 'node:crypto';
import { PACK_ICONES_KIRI } from '../src/lib/packsPrivesSolo.js';
import { carteSpecialePackable, type CatalogueSpecial } from '../src/lib/ligue/cartesSpeciales.js';
import type { SourceCarte } from '../src/lib/ligue/catalogueCarriere.js';

function iconesDisponibles(catalogue: CatalogueSpecial, maintenant: number): SourceCarte[] {
  return catalogue.definitions.filter(def => def.cardType === 'icon' && def.canAppearInCollection
    && carteSpecialePackable(def, catalogue, maintenant))
    .map(def => catalogue.sources.get(def.id)).filter((source): source is SourceCarte => Boolean(source));
}

export function packsPrivesSolo(identifiant: string, catalogue: CatalogueSpecial, maintenant: number) {
  return identifiant === 'kiri' && iconesDisponibles(catalogue, maintenant).length ? [PACK_ICONES_KIRI] : [];
}

/** Aucun nom, prix ou joueur transmis par le navigateur ne décide du contenu. */
export function tirerPackIconesKiri(identifiant: string, catalogue: CatalogueSpecial, maintenant: number): SourceCarte[] {
  if (identifiant !== 'kiri') throw new Error('Pack réservé au compte Kiri.');
  const icones = iconesDisponibles(catalogue, maintenant);
  if (!icones.length) throw new Error('Aucune ICON disponible actuellement.');
  return Array.from({ length: PACK_ICONES_KIRI.cartes }, () => icones[randomInt(icones.length)]);
}
