import type { RecompensePub, ChancePackPub, ConfigPublicites, StatsPublicites } from '../src/lib/publicitesRecompensees.js';
import type { ExecuterSql } from './packsInternesStockage.js';

export interface SessionPub extends RecompensePub {
  compte: string; jour: string; creeLe: number; expireLe: number;
  config: ConfigPublicites; chances: ChancePackPub[];
  verifieLe?: number; started?: boolean; videoTerminee?: boolean; failure?: 'FAILED' | 'NO_FILL' | 'CLOSED'; tid?: string;
  /** Le dernier callback AppLixir REFUSÉ pour cette session : quand, pourquoi, et combien de fois (diagnostic du Labo). */
  callback?: { le: number; refus: string; n: number };
}
/** Les derniers callbacks refusés, tous comptes confondus : jamais d'identité, seulement la date et la raison. */
export interface RefusPublicites { total: number; derniers: { le: number; refus: string; videoTerminee: boolean }[] }
export interface RegistrePublicites { revision: number; sessions: SessionPub[]; stats: StatsPublicites }
export interface StockagePublicites {
  lire(compte: string): Promise<RegistrePublicites | null>;
  trouver(session: string): Promise<SessionPub | null>;
  /** CAS, reçu AppLixir et crédit du coffre : une seule transaction. */
  ecrire(compte: string, revision: number | null, registre: RegistrePublicites, credit?: number, tid?: string): Promise<boolean>;
  statistiques(): Promise<StatsPublicites>;
  /** Facultatif : le Labo s'en passe si la lecture échoue. */
  refus?(): Promise<RefusPublicites>;
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
    async refus() {
      const total = await sql`select coalesce(sum((donnees->'stats'->>'callbacksRefuses')::bigint),0) as n from pub_comptes`;
      const derniers = await sql`select s->'callback' as c, coalesce((s->>'videoTerminee')::boolean,false) as v
        from pub_comptes, jsonb_array_elements(donnees->'sessions') s
        where s ? 'callback' order by (s->'callback'->>'le')::bigint desc limit 8`;
      return { total: Number(total[0]?.n ?? 0),
        derniers: derniers.map((l) => ({ le: Number((l.c as { le: number }).le), refus: String((l.c as { refus: string }).refus), videoTerminee: l.v === true })) };
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
