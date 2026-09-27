import type { CarteCarriere, RareteCarriere, PackCarriere } from './ligue/typesCarriere';
import { t } from './i18n';

/** L'apparence reflète le palier dominant, sans inventer de garantie. */
export function apparencePack(pack: PackCarriere): RareteCarriere {
  if (pack.garantie) return pack.garantie;
  // Les packs de base gardent la couleur annoncée par leur nom. Le pack
  // Argent contient volontairement davantage de Bronze pour son équilibrage,
  // mais ne doit pas être présenté comme un pack Bronze dans la boutique.
  if (pack.id === 'bronze') return 'bronze';
  if (pack.id === 'standard') return 'argent';
  return PALIERS_PACK.reduce((a, b) => pack.probabilites[b] > pack.probabilites[a] ? b : a, 'bronze');
}

export const PALIERS_PACK: RareteCarriere[] = ['bronze', 'argent', 'or', 'elite', 'star'];
export const NOMS_PACK = { bronze: 'Bronze', argent: 'Argent', or: 'Or', elite: 'Élite', star: 'Mythique' };
export const nomRaretePack = (rarete: RareteCarriere) => t(`online.rarity.${rarete}`);
export function nomPackCarriere(pack: Pick<PackCarriere, 'id' | 'nom'>): string {
  const cle = `online.packName.${pack.id}`;
  const traduit = t(cle);
  return traduit === cle ? pack.nom : traduit;
}
export const rangPack = (carte: CarteCarriere) => PALIERS_PACK.indexOf(carte.rarete);
export const modelePack = (rarete: RareteCarriere, ouvert = false) => `/m3d/packs/${rarete}-${ouvert ? 'ouvert' : 'ferme'}.glb`;
/** Une pochette dédiée reste identique quelle que soit la rareté des cartes tirées. */
export const IDS_PACKS_AVEC_SKIN = [
  'allBlacks', 'nationsCeltes', 'rugbyChampionship', 'international', 'pumas',
  'iles', 'premium', 'europeEmergente', 'wallabies', 'top14', 'franceXV',
  'grand', 'standard', 'sixNations',
] as const;
const idsAvecSkin = new Set<string>(IDS_PACKS_AVEC_SKIN);
export const packAvecSkin = (id: string): boolean => idsAvecSkin.has(id);
export function modelePackParNom(pack: PackCarriere): string {
  return packAvecSkin(pack.id) ? `/m3d/packs-speciaux/${pack.id}.glb` : modelePack(apparencePack(pack));
}
