import type { RecompensePub, ChancePackPub, ConfigPublicites, StatsPublicites } from '../src/lib/publicitesRecompensees.js';
import type { ExecuterSql } from './packsInternesStockage.js';

export interface SessionPub extends RecompensePub {
  compte: string; jour: string; creeLe: number; expireLe: number;
  config: ConfigPublicites; chances: ChancePackPub[];
  verifieLe?: number; started?: boolean; videoTerminee?: boolean; failure?: 'FAILED' | 'NO_FILL' | 'CLOSED'; tid?: string;
}
export interface RegistrePublicites { revision: number; sessions: SessionPub[]; stats: StatsPublicites }
export interface StockagePublicites {
  lire(compte: string): Promise<RegistrePublicites | null>;
  trouver(session: string): Promise<SessionPub | null>;
  /** CAS, reçu AppLixir et crédit du coffre : une seule transaction. */
  ecrire(compte: string, revision: number | null, registre: RegistrePublicites, credit?: number, tid?: string): Promise<boolean>;
  statistiques(): Promise<StatsPublicites>;
}
export function publicitesSql(sql: ExecuterSql): StockagePublicites {
  return {
    async lire(compte) {
      const lignes = await sql`select donnees from pub_comptes where compte=${compte}::uuid`;
      return lignes[0]?.donnees as RegistrePublicites ?? null;
    },
    async trouver(session) {
      const lignes = await sql`select s from pub_sessions index_session join pub_comptes p on p.compte=index_session.compte,
        jsonb_array_elements(p.donnees->'sessions') s
        where index_session.id=${session}::uuid and s->>'rewardSessionId'=${session} limit 1`;
      return lignes[0]?.s as SessionPub ?? null;
    },
    async ecrire(compte, revision, registre, credit = 0, tid) {
      const lignes = await sql`select pub_ecrire(${compte}::uuid, ${revision}::int, ${JSON.stringify(registre)}::jsonb,
        ${credit}::bigint, ${tid ?? null}::text) as ok`;
      return lignes[0]?.ok === true;
    },
    async statistiques() {
      const lignes = await sql`select
        coalesce(sum((donnees->'stats'->>'requested')::bigint),0) as requested,
        coalesce(sum((donnees->'stats'->>'started')::bigint),0) as started,
        coalesce(sum((donnees->'stats'->>'completed')::bigint),0) as completed,
        coalesce(sum((donnees->'stats'->>'failed')::bigint),0) as failed,
        coalesce(sum((donnees->'stats'->>'noFill')::bigint),0) as "noFill",
        coalesce(sum((donnees->'stats'->>'ovasRewarded')::bigint),0) as "ovasRewarded",
        coalesce(sum((donnees->'stats'->>'packsEarned')::bigint),0) as "packsEarned",
        count(*) filter(where (donnees->'stats'->>'completed')::bigint > 0) as joueurs,
        (select coalesce(jsonb_object_agg(k, n),'{}'::jsonb) from (
          select k,sum(v::bigint) n from pub_comptes, jsonb_each_text(donnees->'stats'->'distribution') d(k,v) group by k
        ) d) as distribution,
        (select coalesce(jsonb_object_agg(k, n),'{}'::jsonb) from (
          select k,sum(v::numeric) n from pub_comptes, jsonb_each_text(coalesce(donnees->'stats'->'distributionAttendue','{}'::jsonb)) d(k,v) group by k
        ) d) as "distributionAttendue" from pub_comptes`;
      const l = lignes[0];
      return { ...Object.fromEntries(Object.entries(l).filter(([k]) => k !== 'distribution' && k !== 'distributionAttendue').map(([k,v]) => [k,Number(v)])),
        distribution: l.distribution, distributionAttendue: l.distributionAttendue } as StatsPublicites;
    },
  };
}
