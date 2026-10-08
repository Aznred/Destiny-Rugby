import type { ProfilFfr } from './classification.js';
export interface PageSources { joueurs: (Omit<ProfilFfr, 'raw'> & { review: string; revision: number })[]; next: string | null; version: string | null }
export interface StockageJoueurs {
  acces(compte: string): Promise<boolean>;
  rechercher(params: URLSearchParams): Promise<PageSources>;
  catalogue(gender: 'male' | 'female'): Promise<{ version: string; revision: string; joueurs: ProfilFfr[] }>;
  decider(id: string, revision: number, action: 'APPROVE' | 'REJECT' | 'EDIT', actor: string, edit?: Record<string, unknown>): Promise<void>;
  rapport(): Promise<unknown>;
}
export const filtreSource = (p: URLSearchParams) => ({ q: (p.get('q') ?? '').slice(0,80).trim(), gender: p.get('gender') ?? '',
  filter: p.get('filter') ?? '', after: (p.get('after') ?? '').slice(0,100), limit: Math.max(1,Math.min(50,Math.trunc(Number(p.get('limit')))||20)) });
export function vueSource(p: ProfilFfr, review: string, revision: number): PageSources['joueurs'][number] {
  const { raw: _raw, ...publicProfile } = p;
  if (p.usage === 'YOUTH_REGEN_SOURCE') { publicProfile.name = 'Source jeunesse — identité privée'; publicProfile.photo = null; publicProfile.identity_key = ''; }
  return { ...publicProfile, review, revision };
}
