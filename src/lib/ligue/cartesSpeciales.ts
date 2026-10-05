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
// ⚠️ ET UNE CARTE NE SORT JAMAIS AVANT SON IMAGE. Une définition passe par
// quatre états (`statutCarteSpeciale`) : brouillon → image manquante → prête →
// publiée. Seule une carte PUBLIÉE (donc avec image) d'une famille ACTIVE peut
// sortir d'un pack, apparaître dans une collection ou être mise sur le marché.
// Les cartes déjà distribuées ne sont jamais retirées à leur club.

import { HALLOWEEN_DEPART, ICONS_DEPART } from '../../data/cartesSpeciales.js';
import { POSTES, POSTE_PAR_ID } from '../../data/rugby.js';
import type { PosteId } from '../../types.js';
import { tirerPondere } from './aleatoire.js';
import { catalogueAdmin, type CatalogueAdmin } from './atelierCatalogue.js';
import { carteDansPack, catalogueMondialCarriere, rareteCarriere, type SourceCarte } from './catalogueCarriere.js';
import { statistiquesCarte } from './statistiquesCarte.js';
import type { CarteCarriere, InfoCarteSpeciale, PackCarriere } from './typesCarriere.js';

// ═══════════════════════════════════════════════════════════════════════════
// LE VOCABULAIRE
// ═══════════════════════════════════════════════════════════════════════════

/** Ouvert : une nouvelle famille n'a besoin que de son entrée dans `FAMILLES_SPECIALES`. */
export type TypeCarteSpeciale = 'icon' | 'halloween' | (string & {});
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
  nom: string;
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
   * `mythique` — comme une carte Mythique (ICONS) ;
   * `entreBleueEtMythique` — moyenne géométrique Élite × Mythique, donc
   * toujours plus rare qu'une bleue et plus fréquente qu'une Mythique.
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
};

/** Le pack Halloween de départ. Prix, volume et probabilités se règlent dans le Labo. */
export const PACK_HALLOWEEN: PackCarriere = {
  // « Halloween », pas « Pack Halloween » : l'écran d'ouverture écrit déjà « Pack {nom} ».
  id: 'evenement-halloween-2026', nom: 'Halloween', prix: 9000, cartes: 3, famille: 'general',
  promesse: 'Une carte Halloween garantie, et deux autres chances. Jusqu’à fin novembre seulement.',
  probabilites: { bronze: 10, argent: 40, or: 44, elite: 5.4, star: .6 },
  speciales: { 'halloween-2026': 15 }, garantieSpeciale: 'halloween-2026',
};

export const EVENEMENTS_DEPART: readonly EvenementSpecial[] = [
  { id: 'icons', cardType: 'icon', nom: 'ICONS', actif: true, repere: 'mythique', tauxPacksNormaux: .8 },
  // « De maintenant jusqu'à fin novembre » : du 5 octobre 2026 à 0 h au
  // 1er décembre 2026 à 0 h, heure de Paris.
  { id: 'halloween-2026', cardType: 'halloween', nom: 'Halloween 2026', actif: true,
    availableFrom: '2026-10-04T22:00:00.000Z', availableUntil: '2026-11-30T23:00:00.000Z',
    repere: 'entreBleueEtMythique', tauxPacksNormaux: 1, pack: PACK_HALLOWEEN },
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

let graineCache: DefinitionCarteSpeciale[] | undefined;
/** Les 100 ICONS et les 23 Halloween de départ, toutes en « image manquante ». */
export function definitionsDepart(): readonly DefinitionCarteSpeciale[] {
  if (graineCache) return graineCache;
  const icon = FAMILLES_SPECIALES.icon, halloween = FAMILLES_SPECIALES.halloween;
  const commun = { packWeight: 1, published: false, imageReady: false, canBePacked: true, canAppearInCollection: true,
    canAppearOnMarket: true, rarityAnimation: 'mythique' as const };
  graineCache = [
    ...ICONS_DEPART.map(([nom, numeros, nation, overall]): DefinitionCarteSpeciale => ({
      ...commun, id: `icon:${slugSpecial(nom)}`, cardType: 'icon', specialEventId: icon.evenementDefaut, nom,
      ...postesDepuisNumeros(numeros), overall, designId: icon.designId, nation, club: icon.clubDefaut,
      league: icon.ligueDefaut, specialLogo: icon.specialLogo, retraite: true, age: 30, lot: 'ICONS · Pool initial',
    })),
    ...HALLOWEEN_DEPART.map(([nom, numeros, nation, overall, role, base]): DefinitionCarteSpeciale => ({
      ...commun, id: `halloween-2026:${slugSpecial(nom)}`, cardType: 'halloween', specialEventId: halloween.evenementDefaut,
      basePlayerId: base, nom, ...postesDepuisNumeros(numeros), overall, collectif: halloween.collectifDefaut,
      designId: halloween.designId, nation,
      // Un joueur actif garde son club et son championnat (résolus depuis le
      // catalogue) : sa carte Halloween compte normalement pour ses coéquipiers.
      club: base ? '' : halloween.clubDefaut, league: base ? '' : halloween.ligueDefaut,
      specialLogo: halloween.specialLogo, retraite: !base, age: base ? 0 : 30,
      lot: role === 'titulaire' ? 'Équipe Halloween · XV de départ' : 'Équipe Halloween · Banc',
    })),
  ];
  return graineCache;
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

const CHAMPS_REQUIS: (keyof DefinitionCarteSpeciale)[] = ['id', 'cardType', 'specialEventId', 'nom', 'poste', 'overall', 'nation'];
const caches = new WeakMap<object, CatalogueSpecial>();

export function infoSpeciale(def: DefinitionCarteSpeciale): InfoCarteSpeciale {
  return {
    type: def.cardType, evenement: def.specialEventId, design: def.designId, logo: def.specialLogo,
    animation: def.rarityAnimation,
    ...(def.collectif !== undefined ? { collectif: def.collectif } : {}),
    ...(def.basePlayerId ? { base: def.basePlayerId } : {}),
    ...(def.retraite ? { retraite: true } : {}),
  };
}

function sourceSpeciale(def: DefinitionCarteSpeciale, base: SourceCarte | undefined): SourceCarte {
  const famille = POSTE_PAR_ID[def.poste].famille;
  return {
    sourceId: def.id, nom: def.nom, poste: def.poste, famille,
    postesSecondaires: def.postesSecondaires?.length ? [...def.postesSecondaires] : undefined,
    note: def.overall, potentiel: def.overall, age: def.age, nation: def.nation, clubReel: def.club,
    championnat: def.league, pays: base?.pays ?? 'Légendes', photo: def.image, origine: 'professionnel',
    rarete: rareteCarriere(def.overall), statistiques: statistiquesCarte(def.overall, famille, def.id),
    speciale: infoSpeciale(def),
  };
}

/**
 * La liste effective : la graine, corrigée par le Labo, plus ce qu'il a ajouté.
 * Calculée une fois par révision du catalogue (même objet, même résultat).
 */
export function catalogueSpecial(config: CatalogueAdmin = catalogueAdmin()): CatalogueSpecial {
  const connu = caches.get(config);
  if (connu) return connu;
  const reglages = config.speciales ?? {};
  const supprimees = new Set(reglages.supprimees ?? []);
  const evenements = new Map<string, EvenementSpecial>();
  for (const ev of EVENEMENTS_DEPART) evenements.set(ev.id, { ...ev, ...(reglages.evenements?.[ev.id] ?? {}), id: ev.id, cardType: ev.cardType });
  for (const [id, ev] of Object.entries(reglages.evenements ?? {})) {
    if (evenements.has(id) || !ev.cardType || !ev.nom) continue;
    evenements.set(id, { actif: false, repere: 'mythique', tauxPacksNormaux: 1, ...ev, id, cardType: ev.cardType, nom: ev.nom } as EvenementSpecial);
  }
  const bruts = new Map<string, Partial<DefinitionCarteSpeciale>>();
  for (const def of definitionsDepart()) bruts.set(def.id, { ...def, ...(reglages.cartes?.[def.id] ?? {}), id: def.id });
  for (const [id, def] of Object.entries(reglages.cartes ?? {})) if (!bruts.has(id)) bruts.set(id, { ...def, id });
  const mondial = new Map(catalogueMondialCarriere(config).map(s => [s.sourceId, s]));
  const definitions: DefinitionCarteSpeciale[] = [];
  const sources = new Map<string, SourceCarte>();
  for (const brut of bruts.values()) {
    if (supprimees.has(brut.id!) || CHAMPS_REQUIS.some(c => brut[c] === undefined || brut[c] === '')) continue;
    if (!POSTE_PAR_ID[brut.poste as PosteId]) continue;
    const famille = FAMILLES_SPECIALES[brut.cardType!];
    const base = brut.basePlayerId ? mondial.get(brut.basePlayerId) : undefined;
    const def: DefinitionCarteSpeciale = {
      packWeight: 1, published: false, canBePacked: true, canAppearInCollection: true, canAppearOnMarket: true,
      rarityAnimation: 'mythique', retraite: !brut.basePlayerId,
      designId: famille?.designId ?? `special-${brut.cardType}`, specialLogo: famille?.specialLogo ?? 'etoile',
      ...brut,
      club: brut.club || base?.clubReel || famille?.clubDefaut || 'Légendes',
      league: brut.league || base?.championnat || famille?.ligueDefaut || 'Légendes',
      age: brut.age || base?.age || 30,
      imageReady: Boolean(brut.image),
    } as DefinitionCarteSpeciale;
    definitions.push(def);
    sources.set(def.id, sourceSpeciale(def, base));
  }
  definitions.sort((a, b) => a.cardType.localeCompare(b.cardType) || b.overall - a.overall || a.nom.localeCompare(b.nom, 'fr'));
  const resultat: CatalogueSpecial = {
    definitions, parId: new Map(definitions.map(d => [d.id, d])),
    evenements: [...evenements.values()], evenementParId: evenements, sources,
  };
  caches.set(config, resultat);
  return resultat;
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
  return statutCarteSpeciale(def) === 'published' && cat.evenementParId.get(def.specialEventId)?.actif === true;
}

/** Peut sortir d'un pack à cet instant. */
export function carteSpecialePackable(def: DefinitionCarteSpeciale, cat: CatalogueSpecial, maintenant: number): boolean {
  if (!carteSpecialePubliee(def, cat) || !def.canBePacked) return false;
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

/** Une carte spéciale peut-elle être mise ou rester en vente ? Une carte ordinaire, toujours. */
export function carteSurMarcheAutorisee(carte: Pick<CarteCarriere, 'sourceId' | 'speciale'>, ligueAutorise: boolean, config: CatalogueAdmin = catalogueAdmin()): boolean {
  if (!carte.speciale) return true;
  if (!ligueAutorise) return false;
  const cat = catalogueSpecial(config);
  const def = cat.parId.get(carte.sourceId);
  // Une définition retirée du Labo n'enferme pas les exemplaires déjà distribués.
  if (!def) return true;
  return carteSpecialePubliee(def, cat) && def.canAppearOnMarket;
}

/** Un pack d'événement est-il en boutique, dans cette ligue, à cet instant ? */
export function packEvenementOuvert(pack: Pick<PackCarriere, 'evenement'>, ligueAutorise: boolean | undefined, maintenant: number): boolean {
  if (!pack.evenement) return true;
  return ligueAutorise === true && pack.evenement.actif && (pack.evenement.cartes ?? 1) > 0
    && dans(maintenant, pack.evenement.du, pack.evenement.au);
}

/** Les packs d'événement tels qu'une ligue doit les recopier (`completerPacks`). */
export function packsEvenements(config: CatalogueAdmin = catalogueAdmin()): PackCarriere[] {
  const cat = catalogueSpecial(config);
  return cat.evenements.filter(ev => ev.pack).map(ev => ({
    ...structuredClone(ev.pack!),
    evenement: { id: ev.id, type: ev.cardType, actif: ev.actif, ...(ev.availableFrom ? { du: ev.availableFrom } : {}), ...(ev.availableUntil ? { au: ev.availableUntil } : {}),
      // ⚠️ TANT QU'AUCUNE CARTE N'EST PUBLIÉE, LE PACK N'EXISTE PAS EN BOUTIQUE :
      // il promettrait une carte que personne ne peut encore recevoir.
      cartes: cat.definitions.filter(d => d.specialEventId === ev.id && d.canBePacked && carteSpecialePubliee(d, cat)).length },
  }));
}

/**
 * Le même joueur, quelle que soit sa carte. Deux cartes de même identité ne
 * vont jamais ensemble sur une feuille de match (Dupont et Dupont Halloween,
 * McCaw ICON et McCaw Halloween).
 */
export function identiteJoueur(c: Pick<CarteCarriere, 'sourceId' | 'nom' | 'speciale'>): string {
  if (!c.speciale) return c.sourceId;
  return c.speciale.base ?? `legende:${normaliserNom(c.nom)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LE TIRAGE
// ═══════════════════════════════════════════════════════════════════════════

const borner = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));

/**
 * La chance, en %, qu'UNE carte de ce pack soit une carte de cet événement.
 *
 * ⚠️ ELLE SUIT LA QUALITÉ DU PACK, PAS UN TAUX FIXE. Un pack Bronze n'a pas de
 * Mythique : il n'a donc ni ICON ni Halloween. Un pack Élite garantie en a dix
 * fois plus qu'un pack Argent. ICONS se calent sur la Mythique ; Halloween sur
 * la moyenne géométrique Élite × Mythique — mesurée toujours entre les deux.
 */
export function chanceSpecialeParCarte(pack: Pick<PackCarriere, 'probabilites' | 'speciales'>, ev: Pick<EvenementSpecial, 'id' | 'repere' | 'tauxPacksNormaux'>): number {
  const imposee = pack.speciales?.[ev.id];
  if (typeof imposee === 'number' && Number.isFinite(imposee)) return borner(imposee, 0, 100);
  const elite = Math.max(0, pack.probabilites.elite || 0), star = Math.max(0, pack.probabilites.star || 0);
  const repere = ev.repere === 'mythique' ? star : Math.sqrt(elite * star);
  return borner(repere * Math.max(0, ev.tauxPacksNormaux), 0, 50);
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
  config: CatalogueAdmin = catalogueAdmin(),
): TirageSpecial | null {
  if (!ligueAutorise) return null;
  const cat = catalogueSpecial(config);
  const lots: TirageSpecial['lots'] = [];
  for (const ev of cat.evenements) {
    if (!ev.actif) continue;
    const chance = chanceSpecialeParCarte(pack, ev);
    if (chance <= 0 && pack.garantieSpeciale !== ev.id) continue;
    const candidats: SourceCarte[] = [], poids: number[] = [];
    for (const def of cat.definitions) {
      if (def.specialEventId !== ev.id || pris.has(def.id) || !carteSpecialePackable(def, cat, maintenant)) continue;
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
 *   spéciales qui satisfont la garantie y entrent AU MÊME PRORATA, sans quoi un
 *   pack garanti sortirait plus de Mythiques que de Halloween — l'inverse de la
 *   règle « entre la bleue et la Mythique ».
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

/**
 * Ce qu'une ligue montre des cartes spéciales : les événements allumés et, pour
 * chaque pack, la chance par carte. ⚠️ LES PROBABILITÉS S'AFFICHENT : un tirage
 * qu'on paie en Ovas ne cache pas ce qu'il peut donner. Les dates sont rendues
 * telles quelles ; l'écran les compare à son horloge.
 */
export interface ResumeSpeciauxLigue {
  evenements: { id: string; type: string; nom: string; du?: string; au?: string; cartes: number }[];
  chances: Record<string, Record<string, number>>;
}
export function resumeSpeciauxLigue(packs: readonly PackCarriere[], config: CatalogueAdmin = catalogueAdmin()): ResumeSpeciauxLigue {
  const cat = catalogueSpecial(config);
  const actifs = cat.evenements.filter(ev => ev.actif).map(ev => ({ ev,
    cartes: cat.definitions.filter(d => d.specialEventId === ev.id && d.canBePacked && carteSpecialePubliee(d, cat)).length }));
  const ouverts = actifs.filter(a => a.cartes > 0);
  return {
    evenements: actifs.map(({ ev, cartes }) => ({ id: ev.id, type: ev.cardType, nom: ev.nom, cartes,
      ...(ev.availableFrom ? { du: ev.availableFrom } : {}), ...(ev.availableUntil ? { au: ev.availableUntil } : {}) })),
    chances: Object.fromEntries(packs.map(p => [p.id, Object.fromEntries(ouverts
      .map(({ ev }) => [ev.id, Math.round(chanceSpecialeParCarte(p, ev) * 1000) / 1000] as const).filter(([, c]) => c > 0))])),
  };
}

/** Le libellé de famille imprimé sur la carte et sur les filtres. */
export function nomFamilleSpeciale(type: string): string {
  return FAMILLES_SPECIALES[type]?.nom ?? type.toUpperCase();
}
