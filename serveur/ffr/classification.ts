import { POSTE_PAR_ID } from '../../src/data/rugby.js';
import type { PosteId } from '../../src/types.js';

export type UsageFfr = 'MALE_SENIOR_CARD' | 'FEMALE_SENIOR_CARD' | 'YOUTH_REGEN_SOURCE' | 'IGNORE' | 'NEEDS_REVIEW';
export interface SourceFfr {
  player_id?: string; ffr_id?: number; first_name?: string; last_name?: string;
  sex?: string; club?: string; competition?: string; category?: string; category_observed?: string;
  category_season?: string; season?: string; adult?: boolean; age?: number; age_max?: number;
  birth_date?: string; age_group?: string; position?: string; secondary_positions?: string[];
  matches?: number; starts?: number; matches_all_seasons?: number; tries?: number;
  points?: number; overall?: number; potential?: number; rating_confidence?: number;
  photo?: string; countryId?: string; clubId?: string; competitionId?: string;
  position_confidence?: number; identity_confidence?: number; club_strength?: number;
  promoted?: boolean; senior_appearances?: number; performance?: number;
}
export interface ProfilFfr {
  id: string; name: string; identity_key: string; gender: 'male' | 'female' | 'unknown';
  age_category: string; senior_status: 'senior' | 'youth' | 'espoir' | 'unknown';
  age: number | null; club: string | null; competition: string | null; level: number | null;
  countryId: string; clubId: string | null; competitionId: string | null;
  primary_position: PosteId | null; secondary_positions: PosteId[];
  overall: number | null; potential: number | null; data_confidence: number;
  identity_confidence: number; position_confidence: number; usage: UsageFfr;
  card_status: 'ACTIVE_CARD' | 'DATABASE_ONLY' | 'LOW_CONFIDENCE';
  reasons: string[]; season: string | null; matches: number; starts: number | null;
  photo: string | null; raw: SourceFfr; duplicate?: boolean;
}
export const normaliserFfr = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const born = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
export function posteFfr(v?: string): PosteId | null {
  if (!v) return null;
  if (POSTE_PAR_ID[v as PosteId]) return v as PosteId;
  const s = normaliserFfr(v);
  const aliases: Record<string, PosteId> = { pilier: 'pilier_gauche', 'pilier gauche': 'pilier_gauche', 'pilier droit': 'pilier_droit', talonneur: 'talonneur',
    'deuxieme ligne': 'deuxieme_ligne_g', 'troisieme ligne': 'troisieme_aile_g', 'troisieme ligne centre': 'numero_8',
    'demi de melee': 'demi_melee', 'demi melee': 'demi_melee', 'demi ouverture': 'demi_ouverture', 'demi d ouverture': 'demi_ouverture',
    centre: 'premier_centre', ailier: 'ailier_gauche', arriere: 'arriere' };
  return aliases[s] && POSTE_PAR_ID[aliases[s]] ? aliases[s] : null;
}
/** Game calibration priors; sporting evidence below is mandatory before a rating exists. */
export function niveauFfr(competition?: string, gender = 'male'): number | null {
  const c = normaliserFfr(competition ?? '');
  const feminine = gender === 'female';
  if (/\b(top 14)\b/.test(c)) return 78;
  if (/\b(pro d2)\b/.test(c)) return 68;
  if (/elite.*1|premiere division elite/.test(c) && feminine) return 74;
  if (/elite.*2|deuxieme division elite/.test(c) && feminine) return 63;
  if (/crabos/.test(c)) return 52;
  if (/alamercery|gaudermen/.test(c)) return 45;
  if (/espoir/.test(c)) return 57;
  if (/nationale.*2/.test(c)) return 57;
  if (/nationale/.test(c)) return 62;
  for (const [re, base] of [[/federale.*1|1ere division federale/, 54], [/federale.*2|2eme division federale/, 49], [/federale.*3|3eme division federale/, 44],
    [/regionale.*1/, 39], [/regionale.*2/, 35], [/regionale.*3/, 31], [/regional|territorial/, 33]] as const) {
    if (re.test(c)) return base - (/reserve/.test(c) ? 4 : 0);
  }
  return null;
}
export function classifierFfr(raw: SourceFfr, reference = '2026-10-08'): ProfilFfr {
  const gender = raw.sex === 'M' ? 'male' : raw.sex === 'F' ? 'female' : 'unknown';
  const age = raw.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(raw.birth_date)
    ? Number(reference.slice(0, 4)) - Number(raw.birth_date.slice(0, 4)) - (reference.slice(5) < raw.birth_date.slice(5) ? 1 : 0)
    : Number.isFinite(raw.age) ? raw.age! : null;
  const category = normaliserFfr([raw.category, raw.category_observed, raw.age_group, raw.competition].filter(Boolean).join(' '));
  const youthCategory = /\b[um]\s*(6|8|10|12|14|15|16|17|18|19)\b|cadet|junior|crabos|alamercery|gaudermen|moins de (14|16|18|19)|youth/.test(category);
  const espoir = /espoir/.test(category);
  const youth = (age !== null && age < 18) || (raw.age_max != null && raw.age_max < 18) || youthCategory || raw.adult === false;
  // Espoirs and contradictory adult/category evidence never imply a senior card.
  const senior = !youth && !espoir && /senior|reserve/.test(category);
  const primary_position = posteFfr(raw.position);
  const position_confidence = primary_position ? born(raw.position_confidence ?? .8) : 0;
  const name = [raw.first_name, raw.last_name].filter(Boolean).join(' ').trim();
  const identity_confidence = born(raw.identity_confidence ?? (raw.ffr_id && raw.first_name && raw.last_name ? .95 : raw.first_name && raw.last_name ? .7 : .3));
  const matches = Math.max(0, Math.trunc(raw.matches ?? 0));
  const starts = raw.starts == null ? null : Math.max(0, Math.min(matches, raw.starts));
  const level = niveauFfr(raw.competition, gender);
  const reasons: string[] = [];
  const recent = Boolean(raw.season && Number(raw.season.slice(0, 4)) >= Number(reference.slice(0, 4)) - 1);
  if (!recent) reasons.push('NO_RECENT_MATCH_EVIDENCE');
  if (!primary_position) reasons.push('MISSING_POSITION');
  if (!raw.club) reasons.push('MISSING_CLUB');
  if (level === null) reasons.push('UNKNOWN_COMPETITION_LEVEL');
  if (identity_confidence < .85) reasons.push('LOW_IDENTITY_CONFIDENCE');
  if (gender === 'unknown') reasons.push('UNKNOWN_GENDER');
  if (matches < 3) reasons.push('INSUFFICIENT_MATCHES');
  if (espoir && !youth) reasons.push('ESPOIR_REQUIRES_SENIOR_EVIDENCE');
  const data_confidence = Math.round(born(identity_confidence * .25 + position_confidence * .2 + (level !== null ? .15 : 0)
    + Math.min(15, matches) / 15 * .2 + (starts !== null ? .1 : 0) + (recent ? .1 : 0)) * 100) / 100;
  // Division sets the prior, appearances, starts, position-adjusted performance,
  // club evidence and trajectory set bounded corrections. Missing evidence stays null.
  let overall: number | null = null;
  let potential: number | null = null;
  if (level !== null && matches >= 3) {
    const forward = primary_position && ['pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne'].includes(POSTE_PAR_ID[primary_position].famille);
    const performance = raw.tries != null ? Math.min(2, raw.tries / matches * 2) * (forward ? .25 : 1) : 0;
    overall = Math.round(born(level + Math.min(2, Math.log1p(matches) * .55) + (starts === null ? 0 : 3 * (starts / matches - .5))
      + performance + born(raw.club_strength ?? 0, -2, 2) + born(raw.performance ?? 0, -2, 2), 1, 99));
    potential = Math.round(born(overall + (youth ? 8 : age !== null && age < 23 ? 4 : 0) + (raw.promoted ? 2 : 0), overall, 99));
  }
  const usage: UsageFfr = youth ? 'YOUTH_REGEN_SOURCE' : senior && gender !== 'unknown'
    ? gender === 'female' ? 'FEMALE_SENIOR_CARD' : 'MALE_SENIOR_CARD'
    : !name ? 'IGNORE' : 'NEEDS_REVIEW';
  const eligible = senior && gender !== 'unknown' && recent && matches >= 3 && !!raw.club && !!raw.competition && overall !== null
    && identity_confidence >= .85 && position_confidence >= .65 && data_confidence >= .65;
  return { id: raw.ffr_id ? `ffr_${raw.ffr_id}` : raw.player_id ?? `unresolved:${normaliserFfr(name)}`, name, identity_key: normaliserFfr(name), gender,
    age_category: youth ? raw.category ?? 'youth' : espoir ? 'Espoirs' : senior ? 'Senior' : 'unknown',
    senior_status: youth ? 'youth' : espoir ? 'espoir' : senior ? 'senior' : 'unknown', age,
    club: raw.club ?? null, competition: raw.competition ?? null, level, primary_position,
    secondary_positions: [...new Set((raw.secondary_positions ?? []).map(posteFfr).filter((p): p is PosteId => !!p && p !== primary_position))],
    countryId: raw.countryId ?? 'FR', clubId: raw.clubId ?? (raw.club ? `club:${normaliserFfr(raw.club)}` : null),
    competitionId: raw.competitionId ?? (raw.competition ? `competition:${gender}:${normaliserFfr(raw.competition)}` : null),
    overall, potential, data_confidence, identity_confidence, position_confidence, usage,
    card_status: eligible ? 'ACTIVE_CARD' : data_confidence < .65 ? 'LOW_CONFIDENCE' : 'DATABASE_ONLY', reasons,
    season: raw.season ?? null, matches, starts, photo: raw.photo ?? null, raw };
}
