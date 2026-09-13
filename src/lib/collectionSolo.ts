import type { RareteCarriere } from './ligue/typesCarriere';
import type { SourceCarte } from './ligue/catalogueCarriere';

export type IdPackSolo = 'bronze' | 'argent' | 'or';

export interface PackSolo {
  id: IdPackSolo;
  nom: string;
  cartes: number;
  promesse: string;
  garantie?: RareteCarriere;
  probabilites: Record<RareteCarriere, number>;
}

export interface EtatCollectionSolo {
  possedees: Set<string>;
  packsOuverts: Record<IdPackSolo, number>;
  doublons: number;
}

export interface ResultatPackSolo {
  etat: EtatCollectionSolo;
  indices: number[];
  nouvelles: number;
}

export const PACKS_SOLO: readonly PackSolo[] = [
  {
    id: 'bronze', nom: 'Bronze', cartes: 10,
    promesse: 'Trois cartes gratuites, surtout Bronze. Idéal pour remplir les divisions de base.',
    probabilites: { bronze: 90, argent: 9.5, or: .5, elite: 0, star: 0 },
  },
  {
    id: 'argent', nom: 'Argent', cartes: 10,
    promesse: 'Trois cartes gratuites avec davantage de joueurs confirmés et une chance d’Or.',
    probabilites: { bronze: 48, argent: 37.97, or: 14, elite: 0.02, star: .002 },
  },
  {
    id: 'or', nom: 'Or', cartes: 10, garantie: 'or',
    promesse: 'Trois cartes gratuites, dont au moins une Or ou mieux.',
    probabilites: { bronze: 20, argent: 42, or: 37.89, elite: 0.1, star: .01 },
  },
] as const;

const CLE_SAUVEGARDE = 'destiny-rugby:collection-solo:v1';
const RARETES: RareteCarriere[] = ['bronze', 'argent', 'or', 'elite', 'star'];
interface RayonsSolo { parRarete: Record<RareteCarriere, number[]>; toutes: number[] }
const RAYONS = new WeakMap<object, RayonsSolo>();

interface SauvegardeCollectionSolo {
  version: 1;
  possedees: string[];
  packsOuverts: Record<IdPackSolo, number>;
  doublons: number;
}

export function etatCollectionSoloVide(): EtatCollectionSolo {
  return { possedees: new Set(), packsOuverts: { bronze: 0, argent: 0, or: 0 }, doublons: 0 };
}

/** Une empreinte stable sur 64 bits : la collection survit aux réordonnancements du catalogue. */
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

export function chargerCollectionSolo(): EtatCollectionSolo {
  if (typeof localStorage === 'undefined') return etatCollectionSoloVide();
  try {
    const brute = localStorage.getItem(CLE_SAUVEGARDE);
    if (!brute) return etatCollectionSoloVide();
    const lue = JSON.parse(brute) as Partial<SauvegardeCollectionSolo>;
    if (lue.version !== 1 || !Array.isArray(lue.possedees)) return etatCollectionSoloVide();
    return {
      possedees: new Set(lue.possedees.filter((cle): cle is string => typeof cle === 'string')),
      packsOuverts: {
        bronze: Math.max(0, Math.floor(lue.packsOuverts?.bronze ?? 0)),
        argent: Math.max(0, Math.floor(lue.packsOuverts?.argent ?? 0)),
        or: Math.max(0, Math.floor(lue.packsOuverts?.or ?? 0)),
      },
      doublons: Math.max(0, Math.floor(lue.doublons ?? 0)),
    };
  } catch {
    return etatCollectionSoloVide();
  }
}

export function sauvegarderCollectionSolo(etat: EtatCollectionSolo): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const valeur: SauvegardeCollectionSolo = {
      version: 1,
      possedees: [...etat.possedees],
      packsOuverts: etat.packsOuverts,
      doublons: etat.doublons,
    };
    localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify(valeur));
    return true;
  } catch {
    return false;
  }
}

export function effacerCollectionSolo(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(CLE_SAUVEGARDE);
}

function hasard(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const valeur = new Uint32Array(1);
    crypto.getRandomValues(valeur);
    return valeur[0] / 0x1_0000_0000;
  }
  return Math.random();
}

function rareteTiree(probabilites: Record<RareteCarriere, number>, rng: () => number): RareteCarriere {
  const total = RARETES.reduce((somme, rarete) => somme + probabilites[rarete], 0);
  let cible = rng() * total;
  for (const rarete of RARETES) {
    cible -= probabilites[rarete];
    if (cible <= 0) return rarete;
  }
  return 'bronze';
}

function indiceDisponible(
  candidats: readonly number[],
  catalogue: readonly SourceCarte[],
  possedees: Set<string>,
  exclus: Set<number>,
  rng: () => number,
): number | undefined {
  if (!candidats.length) return undefined;
  const depart = Math.floor(rng() * candidats.length);
  // On cherche d'abord une carte nouvelle. Ce filet anti-doublon rend les
  // 100 % réellement atteignables, y compris quand il ne reste qu'un joueur.
  for (let pas = 0; pas < candidats.length; pas++) {
    const indice = candidats[(depart + pas) % candidats.length];
    if (!exclus.has(indice) && !possedees.has(cleCarteSolo(catalogue[indice].sourceId))) return indice;
  }
  for (let pas = 0; pas < candidats.length; pas++) {
    const indice = candidats[(depart + pas) % candidats.length];
    if (!exclus.has(indice)) return indice;
  }
  return undefined;
}

function rayonsSolo(catalogue: readonly SourceCarte[]): RayonsSolo {
  const connu = RAYONS.get(catalogue);
  if (connu) return connu;
  const parRarete: Record<RareteCarriere, number[]> = { bronze: [], argent: [], or: [], elite: [], star: [] };
  const toutes: number[] = [];
  catalogue.forEach((carte, indice) => { parRarete[carte.rarete].push(indice); toutes.push(indice); });
  const rayons = { parRarete, toutes };
  RAYONS.set(catalogue, rayons);
  return rayons;
}

export function ouvrirPackSolo(
  pack: PackSolo,
  catalogue: readonly SourceCarte[],
  precedent: EtatCollectionSolo,
  rng: () => number = hasard,
): ResultatPackSolo {
  const { parRarete, toutes } = rayonsSolo(catalogue);
  const possedees = new Set(precedent.possedees);
  const exclus = new Set<number>();
  const indices: number[] = [];
  let nouvelles = 0;

  for (let position = 0; position < pack.cartes; position++) {
    const probabilites = position === 0 && pack.garantie
      ? Object.fromEntries(RARETES.map(rarete => [rarete, RARETES.indexOf(rarete) >= RARETES.indexOf(pack.garantie!) ? pack.probabilites[rarete] : 0])) as Record<RareteCarriere, number>
      : pack.probabilites;
    const rarete = rareteTiree(probabilites, rng);
    let indice = indiceDisponible(parRarete[rarete], catalogue, possedees, exclus, rng);
    // Une bande déjà terminée ne bloque jamais la progression : le tirage va
    // chercher une carte encore inconnue dans le catalogue complet.
    if (indice === undefined || possedees.has(cleCarteSolo(catalogue[indice].sourceId))) {
      const nouvelleAilleurs = indiceDisponible(toutes, catalogue, possedees, exclus, rng);
      if (nouvelleAilleurs !== undefined && !possedees.has(cleCarteSolo(catalogue[nouvelleAilleurs].sourceId))) indice = nouvelleAilleurs;
    }
    if (indice === undefined) break;
    exclus.add(indice);
    indices.push(indice);
    const cle = cleCarteSolo(catalogue[indice].sourceId);
    if (!possedees.has(cle)) { possedees.add(cle); nouvelles++; }
  }

  return {
    indices,
    nouvelles,
    etat: {
      possedees,
      packsOuverts: { ...precedent.packsOuverts, [pack.id]: precedent.packsOuverts[pack.id] + 1 },
      doublons: precedent.doublons + indices.length - nouvelles,
    },
  };
}
