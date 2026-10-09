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
  return PALIERS_RARETE.reduce((a, b) => pack.probabilites[b] > pack.probabilites[a] ? b : a, 'bronze');
}

export type PalierPack = RareteCarriere | 'special' | 'icon';
export const PALIERS_RARETE: RareteCarriere[] = ['bronze', 'argent', 'or', 'elite', 'star'];
export const PALIERS_PACK: PalierPack[] = [...PALIERS_RARETE, 'special', 'icon'];
export const NOMS_PACK = { bronze: 'Bronze', argent: 'Argent', or: 'Or', elite: 'Élite', star: 'Mythique', special: 'Spécial', icon: 'ICON' };
export const nomRaretePack = (rarete: PalierPack) => rarete === 'icon' || rarete === 'special' ? NOMS_PACK[rarete] : t(`online.rarity.${rarete}`);
export function nomPackCarriere(pack: Pick<PackCarriere, 'id' | 'nom'>): string {
  const cle = `online.packName.${pack.id}`;
  const traduit = t(cle);
  return traduit === cle ? pack.nom : traduit;
}
/**
 * Le palier visuel suit la famille : une ICON termine la montée, une autre
 * carte spéciale passe au-dessus de Mythique, quelle que soit sa note.
 */
export const rangPack = (carte: CarteCarriere) => carte.speciale
  ? PALIERS_PACK.indexOf(carte.speciale.type === 'icon' ? 'icon' : 'special') : PALIERS_PACK.indexOf(carte.rarete);
export const modelePack = (rarete: PalierPack, ouvert = false) => rarete === 'icon' || rarete === 'special'
  ? `/m3d/packs-speciaux/${rarete}.glb` : `/m3d/packs/${rarete}-${ouvert ? 'ouvert' : 'ferme'}.glb`;
/** Les pochettes dédiées masculines conservent leur modèle pendant l'ouverture. */
export const IDS_PACKS_AVEC_SKIN = [
  'allBlacks', 'nationsCeltes', 'leagueOne', 'international', 'pumas',
  'iles', 'urc', 'europeEmergente', 'wallabies', 'top14', 'franceXV',
  'sixNations', 'prod2', 'premiership', 'springboks',
] as const;
const idsAvecSkin = new Set<string>(IDS_PACKS_AVEC_SKIN);
const MODELES_FEMININS: Readonly<Record<string, string>> = {
  'premiership women s rugby': 'f-pwr', 'super rugby aupiki': 'f-aupiki', 'super rugby women s': 'f-superw',
  'elite 1 feminine': 'f-elite2', 'elite 2 feminine': 'f-elite2', 'celtic challenge': 'f-celtic',
  'farah palmer cup': 'f-fpc', 'farah palmer cup premiership': 'f-fpc', 'farah palmer cup championship': 'f-fpc',
  'serie a elite femminile': 'f-seriea', 'liga iberdrola': 'f-liga',
  'women s all ireland league 1a': 'f-ail', 'women s all ireland league 1b': 'f-ail',
};
const modeleFeminin = (id: string) => MODELES_FEMININS[id.replace(/^womens:/, '')];
const MODELES_PRIVES: Readonly<Record<string, string>> = { 'prive-kiri-icons': '/m3d/packs-speciaux/icon.glb' };
/** La boutique et le serveur appliquent la même liste, y compris aux anciens packs personnalisés. */
export const packPropose = (pack: Pick<PackCarriere, 'id' | 'evenement'>) => ['bronze', 'standard', 'or', 'elite'].includes(pack.id) || packAvecSkin(pack);
export const evolutionEliteFrancaise = (pack: Pick<PackCarriere, 'id'>) => pack.id === 'womens:elite 1 feminine';
export const modeleElite1 = '/m3d/packs-speciaux/f-elite1.glb';
/**
 * Les pochettes 3D des événements, par famille de cartes. ⚠️ Un modèle
 * saisonnier ne sort de `assets/packs-saisonniers/` vers
 * `public/m3d/packs-speciaux/` qu'à sa sortie : Noël et Pâques y attendent.
 */
export const MODELES_PACKS_EVENEMENT: Readonly<Record<string, string>> = {
  halloween: '/m3d/packs-speciaux/halloween.glb',
  'octobre-rose': '/m3d/packs-speciaux/octobre-rose.glb',
  influencer: '/m3d/packs-speciaux/special.glb',
};
const modeleEvenement = (pack: Pick<PackCarriere, 'evenement'>) => (pack.evenement ? MODELES_PACKS_EVENEMENT[pack.evenement.type] : undefined);
/** Le pack a sa propre pochette (skin dédié ou pochette d'événement). */
export const packAvecSkin = (pack: string | Pick<PackCarriere, 'id' | 'evenement'>): boolean =>
  typeof pack === 'string' ? idsAvecSkin.has(pack) || Boolean(modeleFeminin(pack) || MODELES_PRIVES[pack]) : packAvecSkin(pack.id) || Boolean(modeleEvenement(pack));
export function modelePackParNom(pack: PackCarriere): string {
  return modeleEvenement(pack) ?? MODELES_PRIVES[pack.id] ?? (modeleFeminin(pack.id) ? `/m3d/packs-speciaux/${modeleFeminin(pack.id)}.glb`
    : idsAvecSkin.has(pack.id) ? `/m3d/packs-speciaux/${pack.id}.glb` : modelePack(apparencePack(pack)));
}
