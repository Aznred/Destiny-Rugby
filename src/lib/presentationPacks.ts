import type { CarteCarriere, RareteCarriere } from './ligue/typesCarriere';

export const PALIERS_PACK: RareteCarriere[] = ['bronze', 'argent', 'or', 'elite', 'star'];
export const NOMS_PACK = { bronze: 'Bronze', argent: 'Argent', or: 'Or', elite: 'Élite', star: 'Mythique' };
export const rangPack = (carte: CarteCarriere) => PALIERS_PACK.indexOf(carte.rarete);
export const modelePack = (rarete: RareteCarriere, ouvert = false) => `/m3d/packs/${rarete}-${ouvert ? 'ouvert' : 'ferme'}.glb`;
