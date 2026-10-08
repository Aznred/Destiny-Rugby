import type { PosteId } from '../types.js';

/** Contrat du snapshot privé de carrière. Aucun profil nominatif n'est embarqué dans le site. */
export interface SaisonSourceJeuneFfr {
  saison: string;
  club: string;
  competition: string;
  matchs: number;
  titularisations: number | null;
}
export interface SourceJeuneFfr {
  /** Le même identifiant FFR est conservé si la source devient senior. */
  id: string;
  sourcePlayerId: string;
  youthPlayerId: string;
  nom: string;
  clubSource: string;
  /** Libellé original lorsque l'annuaire du jeu possède un nom canonique différent. */
  clubLibelleSource?: string;
  clubIdSource?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  age: number;
  /** Une borne de catégorie n'est jamais présentée comme une date de naissance connue. */
  ageEstime: boolean;
  categorie: string;
  poste: PosteId;
  postesSecondaires: PosteId[];
  /** Force sportive calibrée sur 100, distincte de l'étage de division. */
  niveauCompetition: number | null;
  niveauDivision?: number;
  competition: string;
  saisonSource: string | null;
  matchs: number;
  titularisations: number | null;
  apparitionsSenior: number;
  surclassement: boolean;
  forceClub?: number;
  progressionObservee?: number;
  minutes?: number;
  espoirs?: boolean;
  groupePro?: boolean;
  confiance: number;
  sourceSeasonHistory: SaisonSourceJeuneFfr[];
}
export interface PageJeunesFfr {
  version: string | null;
  referenceDate: string;
  joueurs: SourceJeuneFfr[];
  next: string | null;
  total: number;
}
