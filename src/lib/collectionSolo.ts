import type { PackCarriere, RareteCarriere } from './ligue/typesCarriere';
import type { SourceCarte } from './ligue/catalogueCarriere';

export interface EtatCollectionSolo {
  /** Nombre d'exemplaires possedes, indexe par l'empreinte stable du joueur. */
  quantites: Record<string, number>;
  packsOuverts: Record<string, number>;
  doublons: number;
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
const FAMILLES_AVANTS = new Set(['pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne']);
const RAYONS = new WeakMap<object, Map<string, Record<RareteCarriere, number[]>>>();

export function etatCollectionSoloVide(): EtatCollectionSolo {
  return { quantites: {}, packsOuverts: {}, doublons: 0 };
}

/** La gratuite concerne seulement la collection solo, jamais les ligues. */
export function prixPackSolo(pack: Pick<PackCarriere, 'id' | 'prix'>): number {
  return PACKS_SOLO_GRATUITS.has(pack.id) ? 0 : pack.prix;
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
  const brut = valeur as { quantites?: unknown; possedees?: unknown; packsOuverts?: unknown; doublons?: unknown };
  const quantites: Record<string, number> = {};
  if (brut.quantites && typeof brut.quantites === 'object' && !Array.isArray(brut.quantites)) {
    for (const [cle, nombre] of Object.entries(brut.quantites as Record<string, unknown>)) {
      if (typeof nombre === 'number' && Number.isFinite(nombre) && nombre > 0) quantites[cle] = Math.floor(nombre);
    }
  } else if (Array.isArray(brut.possedees)) {
    for (const cle of brut.possedees) if (typeof cle === 'string') quantites[cle] = 1;
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
  catalogue.forEach((carte, indice) => { if (carteDansPack(carte, pack)) rayons[carte.rarete].push(indice); });
  parPack.set(cle, rayons);
  return rayons;
}

/** Tirage avec remise : une carte possedee peut ressortir, meme dans le meme pack. */
export function ouvrirPackSolo(
  pack: PackCarriere,
  catalogue: readonly SourceCarte[],
  precedent: EtatCollectionSolo,
  rng: () => number = hasard,
): ResultatPackSolo {
  const quantites = { ...precedent.quantites };
  const rayons = rayonsDuPack(pack, catalogue);
  const disponibles = new Set(RARETES.filter(rarete => rayons[rarete].length > 0 && pack.probabilites[rarete] > 0));
  if (!disponibles.size) return { etat: precedent, indices: [], nouvelles: 0 };

  const indices: number[] = [];
  let nouvelles = 0;
  const garanties = pack.garantie ? RARETES.slice(RARETES.indexOf(pack.garantie)) : [];
  for (let position = 0; position < pack.cartes; position++) {
    const derniere = position === pack.cartes - 1;
    const dejaGarantie = indices.some(indice => garanties.includes(catalogue[indice].rarete));
    const doitGarantir = derniere && garanties.length > 0 && !dejaGarantie;
    const autorisees = doitGarantir
      ? new Set([...disponibles].filter(rarete => garanties.includes(rarete)))
      : disponibles;
    const rarete = rareteTiree(pack.probabilites, autorisees.size ? autorisees : disponibles, rng);
    if (!rarete) break;
    const rayon = rayons[rarete];
    const indice = rayon[Math.min(rayon.length - 1, Math.floor(rng() * rayon.length))];
    indices.push(indice);
    const cle = cleCarteSolo(catalogue[indice].sourceId);
    if (!quantites[cle]) nouvelles++;
    quantites[cle] = (quantites[cle] ?? 0) + 1;
  }

  return {
    indices,
    nouvelles,
    etat: {
      quantites,
      packsOuverts: { ...precedent.packsOuverts, [pack.id]: (precedent.packsOuverts[pack.id] ?? 0) + 1 },
      doublons: precedent.doublons + indices.length - nouvelles,
    },
  };
}
