import type { CarteCarriere, RareteCarriere, PackCarriere } from './ligue/typesCarriere.js';
import { t } from './i18n.js';

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
/**
 * Le palier d'animation d'une carte. ⚠️ UNE CARTE SPÉCIALE OUVRE COMME UNE
 * MYTHIQUE (`rarityAnimation`), quelle que soit sa note : une Halloween à 84
 * n'est pas une simple bleue, et la pochette doit monter jusqu'au rouge.
 */
const PALIER_ANIMATION = { mythique: 'star', elite: 'elite', or: 'or', influenceur: 'star' } as const;
export const rangPack = (carte: CarteCarriere) => carte.speciale?.type === 'influencer' ? 5 : carte.speciale
  ? Math.max(PALIERS_PACK.indexOf(carte.rarete), PALIERS_PACK.indexOf(PALIER_ANIMATION[carte.speciale.animation] ?? 'star'))
  : PALIERS_PACK.indexOf(carte.rarete);
export const modelePack = (rarete: RareteCarriere, ouvert = false) => `/m3d/packs/${rarete}-${ouvert ? 'ouvert' : 'ferme'}.glb`;
/** Une pochette dédiée reste identique quelle que soit la rareté des cartes tirées. */
export const IDS_PACKS_AVEC_SKIN = [
  'allBlacks', 'nationsCeltes', 'leagueOne', 'international', 'pumas',
  'iles', 'urc', 'europeEmergente', 'wallabies', 'top14', 'franceXV',
  'sixNations', 'prod2', 'premiership',
] as const;
const idsAvecSkin = new Set<string>(IDS_PACKS_AVEC_SKIN);
/**
 * Les pochettes 3D des événements, par famille de cartes. ⚠️ Un modèle
 * saisonnier ne sort de `assets/packs-saisonniers/` vers
 * `public/m3d/packs-speciaux/` qu'à sa sortie : Noël et Pâques y attendent.
 */
export const MODELES_PACKS_EVENEMENT: Readonly<Record<string, string>> = {
  halloween: '/m3d/packs-speciaux/halloween.glb',
};
const modeleEvenement = (pack: Pick<PackCarriere, 'evenement'>) => (pack.evenement ? MODELES_PACKS_EVENEMENT[pack.evenement.type] : undefined);
/** Le pack a sa propre pochette (skin dédié ou pochette d'événement). */
export const packAvecSkin = (pack: string | Pick<PackCarriere, 'id' | 'evenement'>): boolean =>
  typeof pack === 'string' ? idsAvecSkin.has(pack) : idsAvecSkin.has(pack.id) || Boolean(modeleEvenement(pack));
export function modelePackParNom(pack: PackCarriere): string {
  return modeleEvenement(pack) ?? (packAvecSkin(pack.id) ? `/m3d/packs-speciaux/${pack.id}.glb` : modelePack(apparencePack(pack)));
}
