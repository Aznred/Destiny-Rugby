import type { CarteCarriere, RareteCarriere, PackCarriere } from './ligue/typesCarriere';

/** L'apparence reflète le palier dominant, sans inventer de garantie. */
export function apparencePack(pack: PackCarriere): RareteCarriere {
  if (pack.garantie) return pack.garantie;
  return PALIERS_PACK.reduce((a, b) => pack.probabilites[b] > pack.probabilites[a] ? b : a, 'bronze');
}

export const PALIERS_PACK: RareteCarriere[] = ['bronze', 'argent', 'or', 'elite', 'star'];
export const NOMS_PACK = { bronze: 'Bronze', argent: 'Argent', or: 'Or', elite: 'Élite', star: 'Mythique' };
export const rangPack = (carte: CarteCarriere) => PALIERS_PACK.indexOf(carte.rarete);
export const modelePack = (rarete: RareteCarriere, ouvert = false) => `/m3d/packs/${rarete}-${ouvert ? 'ouvert' : 'ferme'}.glb`;
