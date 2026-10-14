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
/** La progression d'un cosmétique « par publicité » : le serveur seul la fait avancer. `livre` : l'article est dans le coffre. */
export interface EtatCosmetiquePub { progres: number; debloqueLe?: number; livre?: boolean }
export interface RegistrePublicites { revision: number; sessions: SessionPub[]; stats: StatsPublicites; cosmetiques?: Record<string, EtatCosmetiquePub> }
export interface StockagePublicites {
  lire(compte: string): Promise<RegistrePublicites | null>;
  trouver(session: string): Promise<SessionPub | null>;
  /** CAS, reçu AppLixir et crédit du coffre : une seule transaction. */
  ecrire(compte: string, revision: number | null, registre: RegistrePublicites, credit?: number, tid?: string): Promise<boolean>;
  statistiques(): Promise<StatsPublicites>;
  /**
   * Ajoute un cosmétique débloqué au coffre du compte (`achatsEquipements`, que la synchronisation du coffre réunit
   * toujours à l'inventaire). Idempotent. Rend faux si le compte n'a pas encore de coffre : la livraison sera retentée.
   * Facultatif : sans lui, le déblocage reste acquis dans le registre et l'écran l'applique à la lecture de la vue.
   */
  octroyerCosmetique?(compte: string, article: string): Promise<boolean>;
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
    async octroyerCosmetique(compte, article) {
      // Une simple mise à jour du coffre, sans nouvelle table ni fonction : la même réunion que `sauvegarderBoutique`.
      const lignes = await sql`update compte_boutique set donnees = donnees || jsonb_build_object(
          'achatsEquipements', to_jsonb(array(select distinct v from jsonb_array_elements_text(
            coalesce(donnees->'achatsEquipements','[]'::jsonb) || to_jsonb(array[${article}]::text[])) as a(v))),
          'equipements', to_jsonb(array(select distinct v from jsonb_array_elements_text(
            coalesce(donnees->'equipements','[]'::jsonb) || to_jsonb(array[${article}]::text[])) as a(v)))
        ), modifie_le = now() where compte = ${compte}::uuid returning 1 as ok`;
      return lignes.length > 0;
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
        ) d) as "distributionAttendue",
        (select coalesce(jsonb_object_agg(k, n),'{}'::jsonb) from (
          select k,sum(v::numeric) n from pub_comptes, jsonb_each_text(coalesce(donnees->'stats'->'contextes','{}'::jsonb)) d(k,v) group by k
        ) d) as contextes from pub_comptes`;
      const l = lignes[0];
      const objets = ['distribution', 'distributionAttendue', 'contextes'];
      return { ...Object.fromEntries(Object.entries(l).filter(([k]) => !objets.includes(k)).map(([k,v]) => [k,Number(v)])),
        distribution: l.distribution, distributionAttendue: l.distributionAttendue,
        contextes: Object.fromEntries(Object.entries((l.contextes ?? {}) as Record<string, unknown>).map(([k, v]) => [k, Number(v)])) } as StatsPublicites;
    },
  };
}
