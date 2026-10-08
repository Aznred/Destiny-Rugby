import { normaliserFfr } from './classification.js';
import type { ProfilFfr } from './classification.js';
import type { SourceJeuneFfr } from '../../src/lib/jeunesFfr.js';

export const REFERENCE_JEUNES_FFR = '2026-10-08';
export const versionFfrValide = (version: string) => /^[A-Za-z0-9_]{3,60}$/.test(version);
export function filtreJeunesCarriere(params: URLSearchParams) {
  const version = params.get('version') ?? '';
  const after = params.get('after') ?? '';
  if (version && !versionFfrValide(version)) throw new Error('Version de vivier invalide.');
  if (after.length > 100 || (after && !/^[a-zA-Z0-9_:.-]+$/.test(after))) throw new Error('Page de vivier invalide.');
  return { version, after, limit: Math.max(1, Math.min(2000, Math.trunc(Number(params.get('limit'))) || 500)) };
}
/** Une borne de catégorie sert seulement d'estimation, jamais de naissance inventée. */
export function ageSourceJeune(p: ProfilFfr, reference = REFERENCE_JEUNES_FFR): { age: number; estime: boolean } | null {
  if (p.age !== null && Number.isFinite(p.age)) return { age: Math.trunc(p.age), estime: false };
  // L'export FFR a déjà actualisé cette borne à la date de son snapshot.
  if (typeof p.raw.age_max === 'number' && Number.isFinite(p.raw.age_max)) return { age: Math.trunc(p.raw.age_max), estime: true };
  const categorie = normaliserFfr([p.raw.category_observed, p.raw.category, p.raw.competition].filter(Boolean).join(' '));
  const borne = categorie.match(/\b[um]\s*(\d{1,2})\b|moins de (\d{1,2})/);
  if (!borne) return null;
  const anneeReference = Number(reference.slice(0, 4)) - (reference.slice(5) < '07-01' ? 1 : 0);
  const saison = p.raw.category_season ?? p.season;
  if (!saison || !/^\d{4}/.test(saison)) return null;
  return { age: Number(borne[1] ?? borne[2]) - 1 + Math.max(0, anneeReference - Number(saison.slice(0, 4))), estime: true };
}
export type MotifExclusionJeune = 'NOT_YOUTH' | 'UNKNOWN_OR_OTHER_GENDER' | 'UNIDENTIFIED' | 'MISSING_CLUB' | 'MISSING_POSITION' | 'MISSING_AGE' | 'OUTSIDE_COHORT';
export function exclusionJeuneCarriere(p: ProfilFfr, reference = REFERENCE_JEUNES_FFR): MotifExclusionJeune | null {
  if (p.usage !== 'YOUTH_REGEN_SOURCE' && p.senior_status !== 'espoir') return 'NOT_YOUTH';
  if (p.gender !== 'male') return 'UNKNOWN_OR_OTHER_GENDER';
  if (!/^ffr_\d+$/.test(p.id) || !p.raw.first_name?.trim() || !p.raw.last_name?.trim() || p.identity_confidence < .85) return 'UNIDENTIFIED';
  if (!p.club?.trim()) return 'MISSING_CLUB';
  if (!p.primary_position || p.position_confidence < .65) return 'MISSING_POSITION';
  const age = ageSourceJeune(p, reference);
  if (!age) return 'MISSING_AGE';
  if (age.age < 14 || age.age > 23) return 'OUTSIDE_COHORT';
  return null;
}
export function sourceJeuneCarriere(p: ProfilFfr, reference = REFERENCE_JEUNES_FFR): SourceJeuneFfr | null {
  if (exclusionJeuneCarriere(p, reference)) return null;
  const age = ageSourceJeune(p, reference)!;
  const raw = p.raw;
  return {
    id: p.id, sourcePlayerId: p.id, youthPlayerId: p.id,
    nom: p.name, clubSource: p.club!, clubIdSource: p.clubId ?? undefined,
    age: age.age, ageEstime: age.estime, categorie: raw.category_observed ?? p.age_category,
    poste: p.primary_position!, postesSecondaires: p.secondary_positions,
    niveauCompetition: p.level, competition: p.competition ?? '', saisonSource: p.season,
    matchs: p.matches, titularisations: p.starts, apparitionsSenior: Math.max(0, Math.trunc(raw.senior_appearances ?? 0)),
    surclassement: raw.promoted === true, forceClub: raw.club_strength,
    progressionObservee: raw.observed_progression, minutes: raw.minutes,
    espoirs: /espoir/.test(normaliserFfr(p.competition ?? '')) || p.senior_status === 'espoir', groupePro: raw.pro_squad,
    confiance: p.data_confidence,
    sourceSeasonHistory: p.season ? [{ saison: p.season, club: p.club!, competition: p.competition ?? '', matchs: p.matches, titularisations: p.starts }] : [],
  };
}
