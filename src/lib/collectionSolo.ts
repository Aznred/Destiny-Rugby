import type { PackCarriere, RareteCarriere } from './ligue/typesCarriere.js';
import type { SourceCarte } from './ligue/catalogueCarriere.js';
import { packEvenementOuvert, preparerTirageSpecial, tirerSpeciale, type CatalogueSpecial } from './ligue/cartesSpeciales.js';
import { packAvecSkin } from './presentationPacks.js';
import { OVAS_PAR_CREDIT, prixLesDeux, prixOvas, type PrixArticle } from './monnaies.js';
import { SOURCES_FFR_RETIREES } from '../data/protectionFfr.generated.js';

const CLES_JEUNES_RETIREES = new Set(SOURCES_FFR_RETIREES.map(cle => cle.replace('.', '-')));
export const cleSoloRetireeFfr = (cle: string): boolean => CLES_JEUNES_RETIREES.has(cle);

export interface EtatCollectionSolo {
  /** Nombre d'exemplaires possedes, indexe par l'empreinte stable du joueur. */
  quantites: Record<string, number>;
  packsOuverts: Record<string, number>;
  doublons: number;
  /** Incrémenté par les échanges du compte afin d'écarter les sauvegardes périmées. */
  revision?: number;
}

export interface ResultatPackSolo {
  etat: EtatCollectionSolo;
  indices: number[];
  nouvelles: number;
}

const CLE_SAUVEGARDE_HISTORIQUE = 'destiny-rugby:collection-solo:v1';
const RARETES: RareteCarriere[] = ['bronze', 'argent', 'or', 'elite', 'star'];
export const IDS_PACKS_SOLO_GRATUITS = ['bronze', 'standard', 'or'] as const;
const PACKS_SOLO_GRATUITS = new Set<string>(IDS_PACKS_SOLO_GRATUITS);
/**
 * Probabilites PAR CARTE des trois packs gratuits. Comme ils contiennent dix
 * cartes en solo, 0,01 % donne environ une chance sur 1 000 par pack d'obtenir
 * une Star rouge. Le pack Or ajoute 0,1 % d'Elite bleue par carte, soit environ
 * une chance sur 100 par pack. Les packs payants gardent leurs taux d'origine.
 */
const PROBABILITES_PACKS_SOLO_GRATUITS: Record<string, Record<RareteCarriere, number>> = {
  bronze: { bronze: 90, argent: 9.49, or: 0.5, elite: 0, star: 0.01 },
  standard: { bronze: 48.99, argent: 37, or: 14, elite: 0, star: 0.01 },
  or: { bronze: 20, argent: 44.89, or: 35, elite: 0.1, star: 0.01 },
};
const FAMILLES_AVANTS = new Set(['pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne']);
const RAYONS = new WeakMap<object, Map<string, Record<RareteCarriere, number[]>>>();

/**
 * Grille de prix équilibrée spécifiquement pour la carrière solo, où une carrière
 * complète rapporte ~500 Ovas (contre plusieurs milliers en carrière en ligne).
 * Ne modifie EN AUCUN CAS les prix de la carrière en ligne.
 */
const PRIX_PACKS_SOLO: Record<string, number> = {
  bronze: 0,
  standard: 0,
  or: 0,
  terroir: 25,
  federales: 35,
  avants: 45,
  arrieres: 45,
  france: 50,
  troisiemeLigne: 50,
  premiereLigne: 55,
  finisseurs: 55,
  international: 60,
  nationale: 60,
  charniere: 65,
  espoirs: 70,
  japon: 75,
  prod2: 80,
  europeEmergente: 80,
  confirmes: 85,
  iles: 90,
  premium: 100,
  leagueOne: 105,
  nord: 110,
  sud: 120,
  nationsCeltes: 120,
  wallabies: 130,
  pumas: 130,
  urc: 135,
  premiership: 140,
  superRugby: 150,
  franceXV: 160,
  sixNations: 180,
  springboks: 190,
  allBlacks: 190,
  rugbyChampionship: 200,
  top14: 210,
  grand: 220,
  elite: 300,
};

export function etatCollectionSoloVide(): EtatCollectionSolo {
  return { quantites: {}, packsOuverts: {}, doublons: 0 };
}

/** La gratuité ou le prix solo adapté concerne seulement la collection solo, jamais les ligues. */
export function prixPackSolo(pack: Pick<PackCarriere, 'id' | 'prix'>): number {
  if (PACKS_SOLO_GRATUITS.has(pack.id)) return 0;
  if (pack.id in PRIX_PACKS_SOLO) return PRIX_PACKS_SOLO[pack.id];
  return Math.max(25, Math.min(350, Math.round(pack.prix * 0.05)));
}

/**
 * Le prix d'un pack de la collection solo, PAR MONNAIE (Correctif 21). Les packs gratuits restent gratuits ; un pack d'événement suit les
 * règles réglées dans le Labo (`monnaie`, `prixCredits`) ; les autres s'achètent au choix en Ovas ou en Crédits.
 * ⚠️ `pack` est déjà adapté au solo (`packCollectionSolo`) : son `prix` est le prix en Ovas du compte.
 */
export function prixPackSoloArticle(pack: Pick<PackCarriere, 'id' | 'prix' | 'monnaie' | 'prixCredits'>): PrixArticle {
  if (PACKS_SOLO_GRATUITS.has(pack.id) || pack.prix === 0) return prixOvas(0);
  const mode = pack.monnaie ?? 'OVAS_OR_CREDITS';
  const credits = pack.prixCredits ?? Math.max(1, Math.round(pack.prix / OVAS_PAR_CREDIT));
  if (mode === 'OVAS') return prixOvas(pack.prix);
  // Un pack réglé « Crédits seulement » dans le Labo s'ouvre aussi en Ovas : plus rien n'exige la monnaie payante.
  return prixLesDeux(pack.prix, credits);
}

/** Volume de cartes par pack en solo : 10 minimum (doublons fréquents), et jusqu'à 20 pour les grands packs. */
export function cartesPackSolo(pack: Pick<PackCarriere, 'id' | 'cartes'>): number {
  if (pack.id === 'grand') return 20;
  if (pack.id === 'terroir') return 15;
  if (pack.id === 'federales') return 12;
  return Math.max(10, pack.cartes);
}

export function packCollectionSolo(pack: PackCarriere): PackCarriere {
  // ⚠️ UN PACK D'ÉVÉNEMENT EST RÉGLÉ POUR LA COLLECTION SOLO DANS LE LABO : prix
  // en Ovas du compte, volume et chances tels quels. Pas de conversion.
  if (pack.evenement) return { ...pack };
  const probabilitesSolo = PROBABILITES_PACKS_SOLO_GRATUITS[pack.id];
  const precisionGratuite = pack.id === 'or'
    ? 'Pack gratuit : environ 1 chance sur 100 d’obtenir une carte Élite bleue et 1 sur 1 000 une Star rouge.'
    : PACKS_SOLO_GRATUITS.has(pack.id)
      ? 'Pack gratuit : environ 1 chance sur 1 000 d’obtenir une carte Star rouge.'
      : '';
  return {
    ...pack,
    prix: prixPackSolo(pack),
    cartes: cartesPackSolo(pack),
    probabilites: probabilitesSolo ?? pack.probabilites,
    promesse: precisionGratuite || pack.promesse,
  };
}

export function packsCollectionSolo(packs: readonly PackCarriere[]): PackCarriere[] {
  return packs.filter(pack => packAvecSkin(pack.id) || PACKS_SOLO_GRATUITS.has(pack.id) || pack.id.startsWith('womens:')).map(packCollectionSolo);
}

/**
 * Les packs d'événement (Halloween…) en vente À CET INSTANT dans la boutique de
 * packs spéciaux : famille active, fenêtre ouverte, au moins une carte publiée.
 * Le 1er décembre, le pack Halloween disparaît de lui-même.
 */
export function packsEvenementSolo(speciales: CatalogueSpecial | null, maintenant: number): PackCarriere[] {
  if (!speciales) return [];
  return speciales.evenements.filter(ev => ev.pack).map((ev): PackCarriere => ({
    ...structuredClone(ev.pack!),
    evenement: { id: ev.id, type: ev.cardType, actif: ev.actif, ...(ev.availableFrom ? { du: ev.availableFrom } : {}), ...(ev.availableUntil ? { au: ev.availableUntil } : {}),
      cartes: preparerTirageSpecial(ev.pack!, true, maintenant, new Set(), speciales)?.lots.find(l => l.evenement === ev.id)?.candidats.length ?? 0 },
  })).filter(pack => packEvenementOuvert(pack, true, maintenant));
}

/** Une empreinte stable sur 64 bits : la collection survit aux reordonnancements du catalogue. */
export function cleCarteSolo(sourceId: string): string {
  let fnv = 0x811c9dc5;
  let djb = 5381;
  for (let i = 0; i < sourceId.length; i++) {
    const code = sourceId.charCodeAt(i);
    fnv = Math.imul(fnv ^ code, 0x01000193);
    djb = Math.imul(djb, 33) ^ code;
  }
  return `${(fnv >>> 0).toString(36)}-${(djb >>> 0).toString(36)}`;
}

/** Assainit un etat venant d'une ancienne sauvegarde ou du stockage du compte. */
export function normaliserCollectionSolo(valeur: unknown): EtatCollectionSolo {
  if (!valeur || typeof valeur !== 'object') return etatCollectionSoloVide();
  const brut = valeur as { quantites?: unknown; possedees?: unknown; packsOuverts?: unknown; doublons?: unknown; revision?: unknown };
  const quantites: Record<string, number> = {};
  if (brut.quantites && typeof brut.quantites === 'object' && !Array.isArray(brut.quantites)) {
    for (const [cle, nombre] of Object.entries(brut.quantites as Record<string, unknown>)) {
      if (!cleSoloRetireeFfr(cle) && typeof nombre === 'number' && Number.isFinite(nombre) && nombre > 0) quantites[cle] = Math.floor(nombre);
    }
  } else if (Array.isArray(brut.possedees)) {
    for (const cle of brut.possedees) if (typeof cle === 'string' && !cleSoloRetireeFfr(cle)) quantites[cle] = 1;
  }
  const packsOuverts: Record<string, number> = {};
  if (brut.packsOuverts && typeof brut.packsOuverts === 'object' && !Array.isArray(brut.packsOuverts)) {
    for (const [id, nombre] of Object.entries(brut.packsOuverts as Record<string, unknown>)) {
      if (typeof nombre === 'number' && Number.isFinite(nombre) && nombre > 0) packsOuverts[id] = Math.floor(nombre);
    }
  }
  return {
    quantites,
    packsOuverts,
    doublons: typeof brut.doublons === 'number' && Number.isFinite(brut.doublons) ? Math.max(0, Math.floor(brut.doublons)) : 0,
    revision: Number.isSafeInteger(brut.revision) && Number(brut.revision) >= 0 ? Number(brut.revision) : 0,
  };
}

/** Importe la collection gratuite qui precedait le compte commun. */
export function chargerAncienneCollectionSolo(): EtatCollectionSolo {
  if (typeof localStorage === 'undefined') return etatCollectionSoloVide();
  try {
    const brute = localStorage.getItem(CLE_SAUVEGARDE_HISTORIQUE);
    return brute ? normaliserCollectionSolo(JSON.parse(brute)) : etatCollectionSoloVide();
  } catch {
    return etatCollectionSoloVide();
  }
}

function hasard(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const valeur = new Uint32Array(1);
    crypto.getRandomValues(valeur);
    return valeur[0] / 0x1_0000_0000;
  }
  return Math.random();
}

function carteDansPack(carte: SourceCarte, pack: Pick<PackCarriere, 'filtre'>): boolean {
  const filtre = pack.filtre;
  if (!filtre) return true;
  if (filtre.categorie) {
    const avant = FAMILLES_AVANTS.has(carte.famille);
    if (avant !== (filtre.categorie === 'avant')) return false;
  }
  if (filtre.familles && !filtre.familles.includes(carte.famille)) return false;
  if (filtre.championnats && !filtre.championnats.includes(carte.championnat)) return false;
  if (filtre.pays && !filtre.pays.includes(carte.pays)) return false;
  if (filtre.nations && !filtre.nations.includes(carte.nation)) return false;
  if (filtre.horsFrance && carte.pays === 'France') return false;
  if (filtre.ageMax !== undefined && carte.age > filtre.ageMax) return false;
  if (filtre.ageMin !== undefined && carte.age < filtre.ageMin) return false;
  return true;
}

function rareteTiree(probabilites: Record<RareteCarriere, number>, disponibles: ReadonlySet<RareteCarriere>, rng: () => number): RareteCarriere | undefined {
  const total = RARETES.reduce((somme, rarete) => somme + (disponibles.has(rarete) ? probabilites[rarete] : 0), 0);
  if (total <= 0) return undefined;
  let cible = rng() * total;
  for (const rarete of RARETES) {
    if (!disponibles.has(rarete)) continue;
    cible -= probabilites[rarete];
    if (cible <= 0) return rarete;
  }
  return [...disponibles][0];
}

function rayonsDuPack(pack: PackCarriere, catalogue: readonly SourceCarte[]): Record<RareteCarriere, number[]> {
  let parPack = RAYONS.get(catalogue);
  if (!parPack) { parPack = new Map(); RAYONS.set(catalogue, parPack); }
  const cle = `${pack.id}#${JSON.stringify(pack.filtre)}`;
  const connus = parPack.get(cle);
  if (connus) return connus;
  const rayons: Record<RareteCarriere, number[]> = { bronze: [], argent: [], or: [], elite: [], star: [] };
  // ⚠️ UNE CARTE SPÉCIALE N'EST JAMAIS DANS UNE BANDE : elle a sa propre chance
  // (`preparerTirageSpecial`), sinon une ICON à 97 sortirait comme une Mythique.
  catalogue.forEach((carte, indice) => { if (!carte.speciale && carteDansPack(carte, pack)) rayons[carte.rarete].push(indice); });
  parPack.set(cle, rayons);
  return rayons;
}

const INDEX_SOURCES = new WeakMap<object, Map<string, number>>();
function indexDesSources(catalogue: readonly SourceCarte[]): Map<string, number> {
  let index = INDEX_SOURCES.get(catalogue);
  if (!index) { index = new Map(catalogue.map((carte, i) => [carte.sourceId, i])); INDEX_SOURCES.set(catalogue, index); }
  return index;
}

/**
 * Tirage avec remise : une carte possedee peut ressortir, meme dans le meme pack.
 *
 * `speciales` : les cartes spéciales publiées (ICONS, Halloween), tirées AVANT
 * la bande avec la même règle que les ligues (`chanceSpecialeParCarte`), et la
 * garantie d'un pack d'événement. Elles doivent figurer dans `catalogue`.
 */
export function ouvrirPackSolo(
  pack: PackCarriere,
  catalogue: readonly SourceCarte[],
  precedent: EtatCollectionSolo,
  rng: () => number = hasard,
  options: { speciales?: CatalogueSpecial | null; maintenant?: number } = {},
): ResultatPackSolo {
  const quantites = { ...precedent.quantites };
  const rayons = rayonsDuPack(pack, catalogue);
  const disponibles = new Set(RARETES.filter(rarete => rayons[rarete].length > 0 && pack.probabilites[rarete] > 0));
  if (!disponibles.size) return { etat: precedent, indices: [], nouvelles: 0 };
  const index = indexDesSources(catalogue);
  const tirage = options.speciales
    ? preparerTirageSpecial(pack, true, options.maintenant ?? Date.now(), new Set(), options.speciales) : null;
  if (tirage) for (const lot of tirage.lots) {
    // Une carte absente du catalogue reçu ne peut pas être montrée : on l'écarte.
    for (let i = lot.candidats.length - 1; i >= 0; i--) if (!index.has(lot.candidats[i].sourceId)) { lot.candidats.splice(i, 1); lot.poids.splice(i, 1); }
  }
  if (pack.garantieSpeciale && !tirage?.lots.some(l => l.evenement === pack.garantieSpeciale && l.candidats.length)) {
    // Un pack d'événement promet SA carte : sans elle, rien n'est débité.
    return { etat: precedent, indices: [], nouvelles: 0 };
  }

  const indices: number[] = [];
  let nouvelles = 0;
  const garanties = pack.garantie ? RARETES.slice(RARETES.indexOf(pack.garantie)) : [];
  const compter = (indice: number) => {
    indices.push(indice);
    const cle = cleCarteSolo(catalogue[indice].sourceId);
    if (!quantites[cle]) nouvelles++;
    quantites[cle] = (quantites[cle] ?? 0) + 1;
  };
  for (let position = 0; position < pack.cartes; position++) {
    const derniere = position === pack.cartes - 1;
    const dejaGarantie = indices.some(indice => garanties.includes(catalogue[indice].rarete));
    const doitGarantir = derniere && garanties.length > 0 && !dejaGarantie;
    const doitGarantirSpeciale = derniere && Boolean(pack.garantieSpeciale)
      && !indices.some(indice => catalogue[indice].speciale?.evenement === pack.garantieSpeciale);
    const speciale = doitGarantirSpeciale ? tirerSpeciale(tirage, rng, { forcer: pack.garantieSpeciale })
      : doitGarantir ? tirerSpeciale(tirage, rng, { accepte: s => garanties.includes(s.rarete),
        base: garanties.reduce((total, r) => total + (disponibles.has(r) ? pack.probabilites[r] || 1 : 0), 0) })
      : tirerSpeciale(tirage, rng);
    if (speciale) { compter(index.get(speciale.sourceId)!); continue; }
    const autorisees = doitGarantir
      ? new Set([...disponibles].filter(rarete => garanties.includes(rarete)))
      : disponibles;
    const rarete = rareteTiree(pack.probabilites, autorisees.size ? autorisees : disponibles, rng);
    if (!rarete) break;
    const rayon = rayons[rarete];
    compter(rayon[Math.min(rayon.length - 1, Math.floor(rng() * rayon.length))]);
  }

  return {
    indices,
    nouvelles,
    etat: {
      quantites,
      packsOuverts: { ...precedent.packsOuverts, [pack.id]: (precedent.packsOuverts[pack.id] ?? 0) + 1 },
      doublons: precedent.doublons + indices.length - nouvelles,
      revision: precedent.revision ?? 0,
    },
  };
}
