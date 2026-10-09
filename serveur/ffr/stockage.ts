import type { ProfilFfr } from './classification.js';
import type { PageJeunesFfr } from '../../src/lib/jeunesFfr.js';
export interface PageSources { joueurs: (Omit<ProfilFfr, 'raw'> & { review: string; revision: number })[]; next: string | null; version: string | null }
export interface StockageJoueurs {
  acces(compte: string): Promise<boolean>;
  rechercher(params: URLSearchParams): Promise<PageSources>;
  catalogue(gender: 'male' | 'female'): Promise<{ version: string; revision: string; joueurs: ProfilFfr[] }>;
  /**
   * La version et la révision du catalogue, SANS ses profils (quelques octets). ⚠️ `contexte.ts` vérifiait toutes les
   * trente secondes, par instance, si le catalogue avait changé — en le retéléchargeant en entier pour comparer : 9 042
   * lectures de 330 Ko en une journée, trois gigaoctets de transfert pour un catalogue qui n'avait pas bougé.
   */
  revisionCatalogue?(): Promise<{ version: string; revision: string }>;
  decider(id: string, revision: number, action: 'APPROVE' | 'REJECT' | 'EDIT', actor: string, edit?: Record<string, unknown>): Promise<void>;
  rapport(): Promise<unknown>;
  /** Lecture privée de l'instantané initial de carrière, distinct du catalogue de cartes. */
  jeunesCarriere?(params: URLSearchParams): Promise<PageJeunesFfr>;
}
export const filtreSource = (p: URLSearchParams) => ({ q: (p.get('q') ?? '').slice(0,80).trim(), gender: p.get('gender') ?? '',
  filter: p.get('filter') ?? '', after: (p.get('after') ?? '').slice(0,100), limit: Math.max(1,Math.min(50,Math.trunc(Number(p.get('limit')))||20)) });
export function vueSource(p: ProfilFfr, review: string, revision: number): PageSources['joueurs'][number] {
  const { raw: _raw, ...publicProfile } = p;
  if (p.usage === 'YOUTH_REGEN_SOURCE') { publicProfile.name = 'Source jeunesse — identité privée'; publicProfile.photo = null; publicProfile.identity_key = ''; }
  return { ...publicProfile, review, revision };
}
