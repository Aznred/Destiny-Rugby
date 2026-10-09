// LES CARTES SPÉCIALES — ICONS, Halloween, et tout ce qui viendra ensuite
//
// ⚠️ UN SYSTÈME, PAS DEUX CAS PARTICULIERS. Une carte spéciale est une
// DÉFINITION (qui, quel GEN, quel design, quand) rattachée à un ÉVÉNEMENT (une
// famille qui s'allume et s'éteint, avec ou sans dates, avec ou sans pack
// dédié). Noël, TOTS, Coupe du monde ou Six Nations ne demanderont qu'une
// famille de plus dans `FAMILLES_SPECIALES`, un événement et leurs cartes —
// le tirage, la publication, la collection et le marché ne changent pas.
//
// ⚠️ CE MODULE TOURNE DES DEUX CÔTÉS, comme tout `lib/ligue/` : aucun store,
// aucun DOM, aucune horloge implicite — `maintenant` se passe en paramètre.
//
// ⚠️ ET IL RESTE LÉGER : règles, statuts, chances et tirage. La graine et la
// fusion avec le Labo (qui lisent le catalogue mondial) sont dans
// `catalogueSpecial.ts`. La Collection solo, importée par le store, n'a besoin
// que de ce fichier-ci.
//
// ⚠️ ET UNE CARTE NE SORT JAMAIS AVANT SON IMAGE. Une définition passe par
// quatre états (`statutCarteSpeciale`) : brouillon → image manquante → prête →
// publiée. Seule une carte PUBLIÉE (donc avec image) d'une famille ACTIVE peut
// sortir d'un pack, apparaître dans une collection ou être mise sur le marché.
// Les cartes déjà distribuées ne sont jamais retirées à leur club.

import { POSTES, POSTE_PAR_ID } from '../../data/rugby.js';
import type { PosteId } from '../../types.js';
import { tirerPondere } from './aleatoire.js';
import type { SourceCarte } from './catalogueCarriere.js';
import { carteDansPack, rareteCarriere } from './raretesCartes.js';
import { statistiquesCarte } from './statistiquesCarte.js';
import type { CarteCarriere, InfoCarteSpeciale, PackCarriere } from './typesCarriere.js';

// ═══════════════════════════════════════════════════════════════════════════
// LE VOCABULAIRE
// ═══════════════════════════════════════════════════════════════════════════

/** Ouvert : une nouvelle famille n'a besoin que de son entrée dans `FAMILLES_SPECIALES`. */
export type TypeCarteSpeciale = 'icon' | 'halloween' | 'influencer' | 'octobre-rose' | (string & {});
export type CardType = 'normal' | TypeCarteSpeciale;
export type StatutCarteSpeciale = 'draft' | 'image_missing' | 'ready' | 'published';
export const STATUTS_CARTE_SPECIALE: readonly StatutCarteSpeciale[] = ['draft', 'image_missing', 'ready', 'published'];
export type AnimationRarete = InfoCarteSpeciale['animation'];

/**
 * Une carte spéciale telle que le Labo la règle. Les noms de champs suivent le
 * cahier des charges (`cardType`, `overall`, `packWeight`…) : ce sont ceux
 * qu'on retrouve dans la base et dans l'écran du Labo.
 */
export interface DefinitionCarteSpeciale {
  /** Identifiant stable, aussi `sourceId` de la carte : `icon:richie-mccaw`. */
  id: string;
  cardType: TypeCarteSpeciale;
  specialEventId: string;
  /** La carte ordinaire du même joueur, s'il joue encore (`reel:antoine dupont`). */
  basePlayerId?: string;
  /**
   * Identifie une carte du rugby féminin pour sa présentation et ses écussons.
   */
  gender?: 'female';
  /**
   * L'identifiant de la carte ordinaire de la joueuse quand elle ne vient pas du catalogue mondial (les
   * joueuses vivent dans la base privée des profils). Sert à `identiteJoueur` : pas deux fois la même sur
   * une feuille de match. Contrairement à `basePlayerId`, rien n'est résolu depuis le catalogue.
   */
  identiteId?: string;
  nom: string;
  display_name?: string;
  real_name?: string;
  first_name?: string;
  last_name?: string;
  description?: string;
  rarity?: CarteCarriere['rarete'];
  statistiques?: Record<string, number>;
  /** Vide = aucun pack ; absent = tous les packs éligibles. */
  allowedPackIds?: string[];
  market_allowed?: boolean;
  trade_allowed?: boolean;
  sansClub?: 'nation' | 'neutre' | 'creator';
  niveauInfluenceur?: 'fun' | 'rare' | 'evenement';
  poste: PosteId;
  postesSecondaires?: PosteId[];
  /** Le GEN. */
  overall: number;
  /** Plancher de collectif (0-10). Absent : calculé comme pour une carte ordinaire. */
  collectif?: number;
  designId: string;
  /** Poids relatif parmi les cartes du même événement (1 par défaut). */
  packWeight: number;
  /** Fenêtre propre à la carte ; sinon celle de son événement. */
  availableFrom?: string;
  availableUntil?: string;
  published: boolean;
  /**
   * Première publication (tenue par le serveur). Une image déjà montrée reste
   * servie à tous, même si la carte est dépubliée : les exemplaires distribués
   * en ont besoin.
   */
  publieeLe?: string;
  /** Toujours égal à « une image est enregistrée » : tenu par le serveur. */
  imageReady: boolean;
  /** URL de l'image (servie par `/api/carriere?imageSpeciale=`), HTTPS ou /photos/. */
  image?: string;
  canBePacked: boolean;
  canAppearInCollection: boolean;
  canAppearOnMarket: boolean;
  nation: string;
  club: string;
  league: string;
  rarityAnimation: AnimationRarete;
  specialLogo: string;
  /** Une ICON est TOUJOURS un joueur retraité. */
  retraite: boolean;
  age: number;
  /** Brouillon : rien n'en sort, même avec une image. */
  brouillon?: boolean;
  /** Regroupement d'affichage dans le Labo (« Équipe Halloween · XV »). */
  lot?: string;
}

/**
 * Un événement : une famille de cartes qui s'allume et s'éteint. ICONS n'a pas
 * de dates (toute l'année) ; Halloween en a, et un pack dédié.
 */
export interface EvenementSpecial {
  id: string;
  cardType: TypeCarteSpeciale;
  nom: string;
  /** Le bouton global « Activer ICONS » / « Activer Halloween ». */
  actif: boolean;
  availableFrom?: string;
  availableUntil?: string;
  /**
   * Comment la chance par carte se déduit d'un pack ordinaire :
   * `mythique` — la bande Mythique sert de référence ;
   * `entreBleueEtMythique` — ancien réglage conservé pour lire le Labo.
   * Dans les deux cas, le plafond actuel garde Spécial et ICON au-dessus de Mythique.
   */
  repere: 'mythique' | 'entreBleueEtMythique';
  /** Multiplicateur réglable dans le Labo. 0 coupe l'événement des packs ordinaires. */
  tauxPacksNormaux: number;
  /** Le pack dédié, payant en Ovas, qui n'existe que pendant la fenêtre. */
  pack?: PackCarriere;
}

/** Ce que le Labo enregistre en base : seulement ce qui diffère de la graine. */
export interface ConfigCartesSpeciales {
  evenements?: Record<string, Partial<EvenementSpecial>>;
  cartes?: Record<string, Partial<DefinitionCarteSpeciale>>;
  /** Cartes retirées du catalogue. Les exemplaires déjà distribués restent. */
  supprimees?: string[];
}

/** Ce qui fait une famille : son design, son emblème, ses bornes de GEN. */
export interface FamilleSpeciale {
  type: TypeCarteSpeciale;
  /** Le mot imprimé sur la carte et sur les filtres. */
  nom: string;
  designId: string;
  specialLogo: string;
  evenementDefaut: string;
  collectifDefaut?: number;
  overallMin: number;
  overallMax: number;
  /** ICONS : uniquement des joueurs qui ne jouent plus. */
  retraitesSeulement: boolean;
  clubDefaut: string;
  ligueDefaut: string;
}

export const FAMILLES_SPECIALES: Readonly<Record<string, FamilleSpeciale>> = {
  icon: {
    type: 'icon', nom: 'ICON', designId: 'icon-hall-of-fame', specialLogo: 'icon', evenementDefaut: 'icons',
    overallMin: 75, overallMax: 99, retraitesSeulement: true, clubDefaut: 'ICON', ligueDefaut: 'ICONS',
  },
  halloween: {
    type: 'halloween', nom: 'HALLOWEEN', designId: 'halloween-citrouilles', specialLogo: 'citrouille', evenementDefaut: 'halloween-2026',
    collectifDefaut: 10, overallMin: 82, overallMax: 92, retraitesSeulement: false, clubDefaut: 'Halloween', ligueDefaut: 'Halloween',
  },
  'octobre-rose': {
    type: 'octobre-rose', nom: 'OCTOBRE ROSE', designId: 'octobre-rose-ruban', specialLogo: 'ruban', evenementDefaut: 'octobre-rose-2026',
    collectifDefaut: 10, overallMin: 84, overallMax: 96, retraitesSeulement: false, clubDefaut: 'Octobre Rose', ligueDefaut: 'Octobre Rose',
  },
  influencer: {
    type: 'influencer', nom: 'INFLUENCEUR', designId: 'influencer-live', specialLogo: 'creator', evenementDefaut: 'influencers',
    overallMin: 60, overallMax: 99, retraitesSeulement: false, clubDefaut: '', ligueDefaut: '',
  },
};

/**
 * Le pack Halloween de départ. ⚠️ IL SE VEND DANS LA BOUTIQUE DE PACKS SPÉCIAUX
 * DE LA COLLECTION SOLO, PAS DANS LES LIGUES : son prix est en Ovas du compte
 * (l'échelle solo : 25 à 300) et il compte dix cartes, comme les autres packs
 * solo. Prix, volume et probabilités se règlent dans le Labo.
 */
export const PACK_HALLOWEEN: PackCarriere = {
  // « Halloween », pas « Pack Halloween » : l'écran d'ouverture écrit déjà « Pack {nom} ».
  id: 'evenement-halloween-2026', nom: 'Halloween', prix: 150, cartes: 10, famille: 'general',
  promesse: 'Dix cartes, dont au moins une Halloween. Jusqu’à fin novembre seulement.',
  probabilites: { bronze: 10, argent: 40, or: 44, elite: 5.4, star: .6 },
  speciales: { 'halloween-2026': 10 }, garantieSpeciale: 'halloween-2026',
};
export const PACK_OCTOBRE_ROSE: PackCarriere = {
  id: 'evenement-octobre-rose-2026', nom: 'Octobre Rose', prix: 150, cartes: 10, famille: 'general',
  promesse: 'Dix cartes, dont au moins une Octobre Rose. Disponible pendant octobre.',
  probabilites: { bronze: 10, argent: 40, or: 44, elite: 5.4, star: .6 },
  speciales: { 'octobre-rose-2026': 10 }, garantieSpeciale: 'octobre-rose-2026',
};

export const EVENEMENTS_DEPART: readonly EvenementSpecial[] = [
  { id: 'influencers', cardType: 'influencer', nom: 'Influenceurs', actif: false, repere: 'mythique', tauxPacksNormaux: .25,
    pack: { id: 'evenement-influencers', nom: 'Créateurs', prix: 200, cartes: 10, famille: 'general',
      promesse: 'Dix cartes, dont une carte Influenceur garantie.',
      probabilites: { bronze: 10, argent: 40, or: 44, elite: 5.4, star: .6 }, speciales: { influencers: 1 }, garantieSpeciale: 'influencers' } },
  { id: 'icons', cardType: 'icon', nom: 'ICONS', actif: true, repere: 'mythique', tauxPacksNormaux: .1 },
  // « De maintenant jusqu'à fin novembre » : du 5 octobre 2026 à 0 h au
  // 1er décembre 2026 à 0 h, heure de Paris.
  { id: 'halloween-2026', cardType: 'halloween', nom: 'Halloween 2026', actif: true,
    availableFrom: '2026-10-04T22:00:00.000Z', availableUntil: '2026-11-30T23:00:00.000Z',
    repere: 'mythique', tauxPacksNormaux: .25, pack: PACK_HALLOWEEN },
  // Octobre Rose : tout octobre, avec sa pochette et la même garantie que Halloween.
  { id: 'octobre-rose-2026', cardType: 'octobre-rose', nom: 'Octobre Rose 2026', actif: true,
    availableFrom: '2026-09-30T22:00:00.000Z', availableUntil: '2026-10-31T23:00:00.000Z',
    repere: 'mythique', tauxPacksNormaux: .25, pack: PACK_OCTOBRE_ROSE },
];

// ═══════════════════════════════════════════════════════════════════════════
// LA GRAINE
// ═══════════════════════════════════════════════════════════════════════════

export const slugSpecial = (texte: string) => texte.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const normaliserNom = (texte: string) => texte.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** « 11/14 » → ailier gauche, ailier droit en second poste. */
export function postesDepuisNumeros(numeros: string): { poste: PosteId; postesSecondaires: PosteId[] } {
  const postes = numeros.split('/').map(n => POSTES.find(p => p.numero === Number(n.trim()))?.id).filter((p): p is PosteId => Boolean(p));
  if (!postes.length) throw new Error(`Poste inconnu : ${numeros}`);
  return { poste: postes[0], postesSecondaires: [...new Set(postes.slice(1))] };
}

// ═══════════════════════════════════════════════════════════════════════════
// LA FUSION GRAINE + LABO
// ═══════════════════════════════════════════════════════════════════════════

export interface CatalogueSpecial {
  definitions: readonly DefinitionCarteSpeciale[];
  parId: ReadonlyMap<string, DefinitionCarteSpeciale>;
  evenements: readonly EvenementSpecial[];
  evenementParId: ReadonlyMap<string, EvenementSpecial>;
  /** La carte telle qu'elle sortirait d'un pack, par identifiant. */
  sources: ReadonlyMap<string, SourceCarte>;
}

export function infoSpeciale(def: DefinitionCarteSpeciale): InfoCarteSpeciale {
  return {
    type: def.cardType, evenement: def.specialEventId, design: def.designId, logo: def.specialLogo,
    animation: def.rarityAnimation,
    ...(def.cardType === 'influencer' ? { sansClub: def.sansClub ?? 'nation', market_allowed: def.market_allowed ?? def.canAppearOnMarket,
      trade_allowed: def.trade_allowed ?? true, description: def.description } : {}),
    ...(def.collectif !== undefined ? { collectif: def.collectif } : {}),
    ...(def.basePlayerId || def.identiteId ? { base: def.basePlayerId ?? def.identiteId } : {}),
    ...(def.retraite ? { retraite: true } : {}),
  };
}

function sourceSpeciale(def: DefinitionCarteSpeciale, base: SourceCarte | undefined): SourceCarte {
  const famille = POSTE_PAR_ID[def.poste].famille;
  return {
    sourceId: def.id, nom: def.display_name || def.nom, poste: def.poste, famille,
    postesSecondaires: def.postesSecondaires?.length ? [...def.postesSecondaires] : undefined,
    note: def.overall, potentiel: def.overall, age: def.age, nation: def.nation, clubReel: def.club,
    championnat: def.league, pays: base?.pays ?? 'Légendes', photo: def.image, origine: 'professionnel',
    rarete: def.rarity ?? rareteCarriere(def.overall), statistiques: { ...statistiquesCarte(def.overall, famille, def.id), ...def.statistiques },
    speciale: infoSpeciale(def),
    ...(def.gender === 'female' ? { gender: 'female' as const } : {}),
  };
}

/**
 * Un catalogue spécial à partir de définitions DÉJÀ RÉSOLUES (club, ligue, âge)
 * et d'événements. C'est ce que reçoit le navigateur de la Collection solo :
 * les seules cartes publiées, jamais la configuration entière du Labo.
 */
export function assemblerCatalogueSpecial(
  definitions: readonly DefinitionCarteSpeciale[], evenements: readonly EvenementSpecial[],
  base: (sourceId: string) => SourceCarte | undefined = () => undefined,
): CatalogueSpecial {
  const triees = [...definitions].sort((a, b) => a.cardType.localeCompare(b.cardType) || b.overall - a.overall || a.nom.localeCompare(b.nom, 'fr'));
  return {
    definitions: triees, parId: new Map(triees.map(d => [d.id, d])),
    evenements: [...evenements], evenementParId: new Map(evenements.map(ev => [ev.id, ev])),
    sources: new Map(triees.map(d => [d.id, sourceSpeciale(d, d.basePlayerId ? base(d.basePlayerId) : undefined)])),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUI A LE DROIT DE SE MONTRER
// ═══════════════════════════════════════════════════════════════════════════

export function statutCarteSpeciale(def: Pick<DefinitionCarteSpeciale, 'brouillon' | 'imageReady' | 'published'>): StatutCarteSpeciale {
  if (def.brouillon) return 'draft';
  if (!def.imageReady) return 'image_missing';
  return def.published ? 'published' : 'ready';
}

const dans = (maintenant: number, du?: string, au?: string) =>
  (!du || Date.parse(du) <= maintenant) && (!au || maintenant < Date.parse(au));

/** La fenêtre de la carte si elle en a une, sinon celle de son événement. */
export function fenetreCarte(def: DefinitionCarteSpeciale, ev?: EvenementSpecial): { du?: string; au?: string } {
  return { du: def.availableFrom ?? ev?.availableFrom, au: def.availableUntil ?? ev?.availableUntil };
}

/** Publiée, avec image, et sa famille est allumée. */
export function carteSpecialePubliee(def: DefinitionCarteSpeciale, cat: CatalogueSpecial): boolean {
  if (def.cardType === 'influencer' && cat.evenementParId.get(FAMILLES_SPECIALES.influencer.evenementDefaut)?.actif !== true) return false;
  return statutCarteSpeciale(def) === 'published' && cat.evenementParId.get(def.specialEventId)?.actif === true;
}

/** Peut sortir d'un pack à cet instant. */
export function carteSpecialePackable(def: DefinitionCarteSpeciale, cat: CatalogueSpecial, maintenant: number): boolean {
  if (!carteSpecialePubliee(def, cat) || !def.canBePacked) return false;
  if (def.cardType === 'influencer' && !def.canAppearInCollection) return false;
  const { du, au } = fenetreCarte(def, cat.evenementParId.get(def.specialEventId));
  return dans(maintenant, du, au);
}

/**
 * Visible dans la collection d'une ligue qui autorise les cartes spéciales.
 * ⚠️ Après la fin d'un événement, la carte RESTE visible (c'est une
 * collection) ; avant son ouverture, elle ne se dévoile pas.
 */
export function carteSpecialeVisibleCollection(def: DefinitionCarteSpeciale, cat: CatalogueSpecial, maintenant: number): boolean {
  if (!carteSpecialePubliee(def, cat) || !def.canAppearInCollection) return false;
  const { du } = fenetreCarte(def, cat.evenementParId.get(def.specialEventId));
  return !du || Date.parse(du) <= maintenant;
}

/** Un pack d'événement est-il en boutique, dans cette ligue, à cet instant ? */
export function packEvenementOuvert(pack: Pick<PackCarriere, 'evenement'>, ligueAutorise: boolean | undefined, maintenant: number): boolean {
  if (!pack.evenement) return true;
  return ligueAutorise === true && pack.evenement.actif && (pack.evenement.cartes ?? 1) > 0
    && dans(maintenant, pack.evenement.du, pack.evenement.au);
}

/**
 * Le même joueur, quelle que soit sa carte. Deux cartes de même identité ne
 * vont jamais ensemble sur une feuille de match (Dupont et Dupont Halloween,
 * McCaw ICON et McCaw Halloween).
 */
export function identiteJoueur(c: Pick<CarteCarriere, 'sourceId' | 'nom' | 'speciale'>): string {
  if (!c.speciale) return c.sourceId;
  if (c.speciale.type === 'influencer') return c.sourceId;
  return c.speciale.base ?? `legende:${normaliserNom(c.nom)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LE TIRAGE
// ═══════════════════════════════════════════════════════════════════════════

const borner = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));

/**
 * La chance, en %, qu'UNE carte de ce pack soit une carte de cet événement.
 *
 * Elle suit la qualité du pack : au maximum 10 % du taux Mythique pour ICON,
 * 25 % pour chaque famille Spécial. Un taux explicite et les garanties des
 * packs dédiés restent prioritaires.
 */
export function chanceSpecialeParCarte(pack: Pick<PackCarriere, 'probabilites' | 'speciales'>, ev: Pick<EvenementSpecial, 'id' | 'repere' | 'tauxPacksNormaux'>): number {
  const imposee = pack.speciales?.[ev.id];
  if (typeof imposee === 'number' && Number.isFinite(imposee)) return borner(imposee, 0, 100);
  const elite = Math.max(0, pack.probabilites.elite || 0), star = Math.max(0, pack.probabilites.star || 0);
  const repere = ev.repere === 'mythique' ? star : Math.sqrt(elite * star);
  // Les anciens réglages du Labo ne doivent pas inverser les nouveaux paliers.
  // Les packs dédiés gardent leur taux explicite et leur garantie.
  return borner(Math.min(repere * Math.max(0, ev.tauxPacksNormaux), star * (ev.id === 'icons' ? .1 : .25)), 0, 50);
}

export interface TirageSpecial {
  lots: { evenement: string; chance: number; candidats: SourceCarte[]; poids: number[] }[];
}

/**
 * Ce que ce pack peut donner en cartes spéciales, dans cette ligue, maintenant.
 * `null` quand rien n'est possible — et dans ce cas l'ouverture ne consomme
 * AUCUN tirage de plus : une ligue sans cartes spéciales tire exactement comme avant.
 */
export function preparerTirageSpecial(
  pack: PackCarriere, ligueAutorise: boolean | undefined, maintenant: number, pris: ReadonlySet<string>,
  cat: CatalogueSpecial,
  /** Le vivier de la ligue. ⚠️ Il ne filtre plus rien (9 octobre 2026) : une carte spéciale sort dans TOUS les packs, Octobre Rose comprise. */
  _pool: 'men' | 'women' | 'mixed' = 'men',
): TirageSpecial | null {
  if (!ligueAutorise) return null;
  const lots: TirageSpecial['lots'] = [];
  for (const ev of cat.evenements) {
    if (!ev.actif) continue;
    const chance = chanceSpecialeParCarte(pack, ev);
    if (chance <= 0 && pack.garantieSpeciale !== ev.id) continue;
    const candidats: SourceCarte[] = [], poids: number[] = [];
    for (const def of cat.definitions) {
      if (def.specialEventId !== ev.id || pris.has(def.id) || !carteSpecialePackable(def, cat, maintenant)) continue;
      if (def.allowedPackIds && !def.allowedPackIds.includes(pack.id)) continue;
      const source = cat.sources.get(def.id)!;
      if (!carteDansPack(source, pack.filtre) || !(def.packWeight > 0)) continue;
      candidats.push(source); poids.push(def.packWeight);
    }
    if (candidats.length) lots.push({ evenement: ev.id, chance, candidats, poids });
  }
  return lots.length ? { lots } : null;
}

/**
 * Une carte spéciale pour cet emplacement, ou `null` pour le tirage ordinaire.
 * La carte choisie quitte le lot : un même pack ne donne jamais deux fois la même.
 *
 * - `forcer` : la garantie d'un pack d'événement (dernière carte).
 * - `base` + `accepte` : la carte GARANTIE d'un pack ordinaire (« Élite
 *   garantie »). ⚠️ Elle ne tire plus sur 100 mais sur les seules bandes
 *   autorisées : la Mythique y pèse dix fois plus que d'habitude. Les cartes
 *   spéciales qui satisfont la garantie y entrent AU MÊME PRORATA pour
 *   conserver l'ordre Mythique, Spécial, ICON.
 */
export function tirerSpeciale(
  tirage: TirageSpecial | null, rng: () => number,
  options: { forcer?: string; base?: number; accepte?: (s: SourceCarte) => boolean } = {},
): SourceCarte | null {
  if (!tirage) return null;
  const accepte = options.accepte ?? (() => true);
  const lots = tirage.lots
    .map(lot => ({ lot, indices: lot.candidats.map((c, i) => (accepte(c) ? i : -1)).filter(i => i >= 0) }))
    .filter(l => l.indices.length);
  let choix: (typeof lots)[number] | undefined;
  if (options.forcer) choix = lots.find(l => l.lot.evenement === options.forcer);
  else {
    const total = Math.min(100, lots.reduce((s, l) => s + l.lot.chance, 0));
    if (total <= 0) return null;
    let u = rng() * (options.base !== undefined ? total + Math.max(0, options.base) : 100);
    if (u >= total) return null;
    for (const l of lots) { if (u < l.lot.chance) { choix = l; break; } u -= l.lot.chance; }
    choix ??= lots[lots.length - 1];
  }
  if (!choix) return null;
  const i = tirerPondere(choix.indices.map(j => choix!.lot.poids[j]), rng);
  if (i < 0) return null;
  const index = choix.indices[i];
  const [choisie] = choix.lot.candidats.splice(index, 1);
  choix.lot.poids.splice(index, 1);
  return choisie;
}

/** Le libellé de famille imprimé sur la carte et sur les filtres. */
export function nomFamilleSpeciale(type: string): string {
  return FAMILLES_SPECIALES[type]?.nom ?? type.toUpperCase();
}
