import type { Club } from '../types.js';
import { SOURCES_FFR, LOCALISATIONS_OFFICIELLES } from '../data/localisationsClubs.generated.js';
import { cleClub } from './cleClub.js';
import { catalogueAdmin } from './ligue/atelierCatalogue.js';

export interface LocalisationClub {
  ville?: string; stade?: string; adresseStade?: string;
  departement?: string; departementNum?: string; codePostal?: string; region?: string; pays?: string;
  latitude?: number; longitude?: number; latitudeVille?: number; longitudeVille?: number;
  sourceLocalisation?: string; sourceCoordonnees?: string;
  precisionLieu?: 'stade' | 'siege' | 'commune' | 'fallback';
  statutGeographique?: 'verifie' | 'nonVerifie'; verifieLe?: string;
}
export interface RivaliteHistorique { clubA: string; clubB: string; source: string; }
const officielles = new Map(Object.entries(LOCALISATIONS_OFFICIELLES).map(([nom, d]) => [cleClub(nom), d]));
const references = new Map<string, LocalisationClub>();
export function localisationDeReference(nom: string): LocalisationClub | undefined { return references.get(nom); }
let editionsLocales: Record<string, LocalisationClub> = {};
let historiquesLocales: RivaliteHistorique[] = [];
export function appliquerLocalisations(clubs: Record<string, LocalisationClub>, rivalites: RivaliteHistorique[] = []) {
  editionsLocales = clubs; historiquesLocales = rivalites;
}
export function enrichirClub(c: Club, pays?: string): Club {
  const enrichi = { ...c, pays: c.pays ?? pays, region: c.region ?? c.ligue,
    ...(c.structureId ? SOURCES_FFR[c.structureId] : {}), ...officielles.get(cleClub(c.nom)) };
  references.set(c.nom, { ...enrichi });
  return enrichi;
}
export function localisationCorrigee(c: Club): Club {
  const edition = catalogueAdmin().clubs?.[c.nom] ?? editionsLocales[c.nom];
  return edition ? { ...c, ...edition, latitude: edition.latitude, longitude: edition.longitude } : c;
}
export function rivalitesHistoriques(): RivaliteHistorique[] { return catalogueAdmin().rivalitesHistoriques ?? historiquesLocales; }
export function coordonneesValides(c: Pick<LocalisationClub, 'latitude' | 'longitude'>): boolean {
  return typeof c.latitude === 'number' && Number.isFinite(c.latitude) && Math.abs(c.latitude) <= 90
    && typeof c.longitude === 'number' && Number.isFinite(c.longitude) && Math.abs(c.longitude) <= 180;
}
export function haversine(latA: number, lonA: number, latB: number, lonB: number): number {
  const rad = (n: number) => n * Math.PI / 180;
  const h = Math.sin(rad(latB - latA) / 2) ** 2 + Math.cos(rad(latA)) * Math.cos(rad(latB)) * Math.sin(rad(lonB - lonA) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
