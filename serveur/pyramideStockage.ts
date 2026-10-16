import type { ExecuterSql } from './packsInternesStockage.js';
import type { LigueStockee, ResumeDivisionPublique } from './carriereStockage.js';
import type { EquipePyramide, PlanPoule } from './divisionsPubliques.js';
import { equipesPyramide } from './divisionsPubliques.js';
import { indicePoule, positionPublique } from '../src/lib/ligue/pyramidePublique.js';

export interface ClassementMondial { equipes: (EquipePyramide & { nom: string; rangMondial: number })[]; total: number; page: number; moi?: EquipePyramide & { rangMondial: number } }
export interface StockagePyramide {
  verrou(cle: string, jeton: string, maintenant: number, duree: number): Promise<boolean>;
  liberer(cle: string, jeton: string): Promise<void>;
  synchroniser(ligue: LigueStockee): Promise<void>;
  aInitialiser(cycle: number, limite: number): Promise<string[]>;
  aClore(cycle: number, limite: number): Promise<string[]>;
  equipes(cycle: number): Promise<EquipePyramide[]>;
  classement(cycle: number, compte: string, page: number): Promise<ClassementMondial>;
  plan(cycle: number): Promise<{ termine: boolean } | null>;
  enregistrerPlan(cycle: number, plans: PlanPoule[]): Promise<void>;
  manquants(cycle: number, limite: number): Promise<PlanPoule[]>;
  terminer(cycle: number): Promise<void>;
  duCompte(cycle: number, compte: string): Promise<ResumeDivisionPublique | null>;
  ouverte(cycle: number): Promise<ResumeDivisionPublique | null>;
  prochainIndice(cycle: number): Promise<number>;
  bilan(cycle: number): Promise<{ nombre: number; equipes: number; enCours: number; fin: number | null; derniereDivision: number }>;
}
export const codePoule = (cycle: number, p: { division: number; poule: number }) => `DR-PUBLIC-C${cycle}-D${p.division}-P${p.poule}`;
export const resumePoule = (l: LigueStockee): ResumeDivisionPublique => ({ id: l.id, code: l.code,
  ...positionPublique(l.etat.publique!), comptes: l.comptes, nombreClubs: l.comptes.length, phase: l.etat.phase, finLe: l.etat.publique?.finLe });
const depuisSql = (r: Record<string, unknown>): ResumeDivisionPublique => ({ id: String(r.id), code: String(r.code),
  ...positionPublique({ division: Number(r.division), poule: r.poule == null ? undefined : Number(r.poule) }),
  comptes: [], nombreClubs: Number(r.nombre), phase: String(r.phase), finLe: r.fin_le == null ? undefined : String(r.fin_le) });

/** Index séparés : les visites et inscriptions ne téléchargent jamais les états des milliers de poules. */
export function pyramideSql(sql: ExecuterSql): StockagePyramide {
  let preparation: Promise<void> | undefined;
  const preparer = () => preparation ??= (async () => {
    // Un seul commit et un verrou transactionnel pour les démarrages simultanés de fonctions serveur.
    await sql`do $pyramide$ begin
      perform pg_advisory_xact_lock(1760202610);
      create table if not exists carriere_public_verrous(cle text primary key,jeton text not null,expire_le bigint not null);
      create table if not exists carriere_public_cycles(cycle integer primary key,termine boolean not null default false,plans jsonb not null default '[]');
      create table if not exists carriere_public_plans(cycle integer not null,division integer not null,poule integer not null,
        code text not null unique,plan jsonb not null,primary key(cycle,division,poule));
      create table if not exists carriere_public_equipes(cycle integer not null,compte text not null,ligue uuid not null,
        version bigint not null,elo double precision not null,equipe jsonb not null,primary key(cycle,compte));
      create index if not exists carriere_public_elo_idx on carriere_public_equipes(cycle,elo desc,compte);
      create index if not exists carriere_public_ligue_idx on carriere_public_equipes(ligue);
      create index if not exists carriere_public_cycle_idx on carriere_ligues((resume->'publique'->>'cycle')) where resume ? 'publique';
      create index if not exists carriere_public_comptes_idx on carriere_ligues using gin(comptes) where resume ? 'publique';
      create index if not exists carriere_public_ouvertes_idx on carriere_ligues((resume->'publique'->>'cycle')) where phase='salon' and cardinality(comptes)<16;
    end $pyramide$`;
  })().catch(e => { preparation = undefined; throw e; });
  return {
    async verrou(cle, jeton, maintenant, duree) {
      await preparer();
      return (await sql`insert into carriere_public_verrous(cle,jeton,expire_le) values(${cle},${jeton},${maintenant + duree})
        on conflict(cle) do update set jeton=excluded.jeton,expire_le=excluded.expire_le
        where carriere_public_verrous.expire_le<=${maintenant} returning cle`).length > 0;
    },
    async liberer(cle, jeton) { await sql`delete from carriere_public_verrous where cle=${cle} and jeton=${jeton}`; },
    async synchroniser(l) {
      if (!l.etat.publique) return;
      await preparer();
      const equipes = equipesPyramide(l);
      await sql`insert into carriere_public_equipes(cycle,compte,ligue,version,elo,equipe)
        select ${l.etat.publique.cycle},e->>'compteId',${l.id}::uuid,${l.etat.version},(e->>'elo')::double precision,e
        from jsonb_array_elements(${JSON.stringify(equipes)}::jsonb) e
        on conflict(cycle,compte) do update set version=excluded.version,elo=excluded.elo,equipe=excluded.equipe
        where carriere_public_equipes.ligue=excluded.ligue and carriere_public_equipes.version<=excluded.version
          and carriere_public_equipes.equipe is distinct from excluded.equipe`;
    },
    async aInitialiser(cycle, limite) {
      await preparer();
      return (await sql`select l.id from carriere_ligues l where l.resume ? 'publique' and l.resume->'publique'->>'cycle'=${String(cycle)}
        and not exists(select 1 from carriere_public_equipes e where e.ligue=l.id) order by l.code limit ${limite}`).map(r => String(r.id));
    },
    async aClore(cycle, limite) {
      await preparer();
      return (await sql`select id from carriere_ligues where resume ? 'publique' and resume->'publique'->>'cycle'=${String(cycle)} and phase='saison' order by code limit ${limite}`).map(r => String(r.id));
    },
    async equipes(cycle) { await preparer(); return (await sql`select equipe from carriere_public_equipes where cycle=${cycle}`).map(r => r.equipe as EquipePyramide); },
    async classement(cycle, compte, page) {
      await preparer();
      const [lignes, total, moi] = await Promise.all([
        sql`select equipe from carriere_public_equipes where cycle=${cycle} order by elo desc,compte limit 50 offset ${(page - 1) * 50}`,
        sql`select count(*)::integer as n from carriere_public_equipes where cycle=${cycle}`,
        sql`select e.equipe,1+(select count(*) from carriere_public_equipes a where a.cycle=e.cycle and (a.elo>e.elo or (a.elo=e.elo and a.compte<e.compte))) as rang
          from carriere_public_equipes e where e.cycle=${cycle} and e.compte=${compte}`,
      ]);
      return { equipes: lignes.map((r, i) => ({ ...(r.equipe as EquipePyramide), rangMondial: (page - 1) * 50 + i + 1 })), total: Number(total[0].n), page,
        moi: moi[0] ? { ...(moi[0].equipe as EquipePyramide), rangMondial: Number(moi[0].rang) } : undefined };
    },
    async plan(cycle) { await preparer(); const r = await sql`select termine from carriere_public_cycles where cycle=${cycle}`; return r[0] ? { termine: Boolean(r[0].termine) } : null; },
    async enregistrerPlan(cycle, plans) {
      await preparer();
      await sql`with nouveau as (insert into carriere_public_cycles(cycle,plans) values(${cycle},'[]'::jsonb) on conflict do nothing returning cycle)
        insert into carriere_public_plans(cycle,division,poule,code,plan)
        select n.cycle,(p->>'division')::integer,(p->>'poule')::integer,
          concat('DR-PUBLIC-C',n.cycle,'-D',p->>'division','-P',p->>'poule'),p
        from nouveau n cross join lateral jsonb_array_elements(${JSON.stringify(plans)}::jsonb) p`;
    },
    async manquants(cycle, limite) {
      await preparer();
      return (await sql`select p.plan from carriere_public_plans p where p.cycle=${cycle}
        and not exists(select 1 from carriere_ligues l where l.code=p.code)
        order by p.division,p.poule limit ${limite}`).map(r => r.plan as PlanPoule);
    },
    async terminer(cycle) { await sql`update carriere_public_cycles set termine=true where cycle=${cycle}`; },
    async duCompte(cycle, compte) {
      await preparer();
      const r = await sql`select id,code,cardinality(comptes) as nombre,phase,resume->'publique'->>'division' as division,
        resume->'publique'->>'poule' as poule,resume->'publique'->>'finLe' as fin_le from carriere_ligues
        where resume ? 'publique' and resume->'publique'->>'cycle'=${String(cycle)} and comptes @> array[${compte}::uuid] limit 1`;
      return r[0] ? depuisSql(r[0]) : null;
    },
    async ouverte(cycle) {
      await preparer();
      const r = await sql`select id,code,cardinality(comptes) as nombre,phase,resume->'publique'->>'division' as division,
        resume->'publique'->>'poule' as poule,resume->'publique'->>'finLe' as fin_le from carriere_ligues
        where resume ? 'publique' and resume->'publique'->>'cycle'=${String(cycle)} and phase='salon' and cardinality(comptes)<16
        order by case when resume->'publique'->>'poule' is null then (resume->'publique'->>'division')::integer
          else (resume->'publique'->>'poule')::integer + power(2,(resume->'publique'->>'division')::integer-1)::integer-1 end limit 1`;
      return r[0] ? depuisSql(r[0]) : null;
    },
    async prochainIndice(cycle) {
      await preparer();
      const r = await sql`select greatest(coalesce((select max(case when resume->'publique'->>'poule' is null then (resume->'publique'->>'division')::integer
        else (resume->'publique'->>'poule')::integer + power(2,(resume->'publique'->>'division')::integer-1)::integer-1 end)
        from carriere_ligues where resume ? 'publique' and resume->'publique'->>'cycle'=${String(cycle)}),0),
        coalesce((select max(poule+power(2,division-1)::integer-1)
        from carriere_public_plans where cycle=${cycle}),0))+1 as n`;
      return Number(r[0].n);
    },
    async bilan(cycle) {
      await preparer();
      const [r] = await sql`select count(*)::integer as n,coalesce(sum(cardinality(comptes)),0)::integer as equipes,count(*) filter(where phase='saison')::integer as en_cours,
        extract(epoch from max((resume->'publique'->>'finLe')::timestamptz))*1000 as fin,
        max(case when resume->'publique' ? 'poule' then (resume->'publique'->>'division')::integer
          else least(10,floor(log(2,(resume->'publique'->>'division')::numeric))::integer+1) end) as derniere
        from carriere_ligues where resume ? 'publique' and resume->'publique'->>'cycle'=${String(cycle)}`;
      return { nombre: Number(r.n), equipes: Number(r.equipes), enCours: Number(r.en_cours), fin: r.fin == null ? null : Number(r.fin), derniereDivision: Number(r.derniere ?? 0) };
    },
  };
}

export interface BasePyramideLocale { verrous: Record<string, { jeton: string; expire: number }>; plans: Record<string, { termine: boolean; poules: PlanPoule[] }>; equipes: Record<string, { version: number; equipe: EquipePyramide }> }
export function pyramideLocale(base: BasePyramideLocale, ligues: () => LigueStockee[], sauver: () => void): StockagePyramide {
  const publiques = (cycle: number) => ligues().filter(l => l.etat.publique?.cycle === cycle);
  return {
    async verrou(cle, jeton, maintenant, duree) { if ((base.verrous[cle]?.expire ?? 0) > maintenant) return false; base.verrous[cle] = { jeton, expire: maintenant + duree }; sauver(); return true; },
    async liberer(cle, jeton) { if (base.verrous[cle]?.jeton === jeton) { delete base.verrous[cle]; sauver(); } },
    async synchroniser(l) { for (const e of equipesPyramide(l)) { const cle = `${l.etat.publique!.cycle}:${e.compteId}`, ancien = base.equipes[cle]; if (!ancien || (ancien.equipe.ligueId === l.id && ancien.version <= l.etat.version)) base.equipes[cle] = { version: l.etat.version, equipe: e }; } sauver(); },
    async aInitialiser(cycle, limite) { const faites = new Set(Object.values(base.equipes).map(e => e.equipe.ligueId)); return publiques(cycle).filter(l => !faites.has(l.id)).slice(0, limite).map(l => l.id); },
    async aClore(cycle, limite) { return publiques(cycle).filter(l => l.etat.phase === 'saison').slice(0, limite).map(l => l.id); },
    async equipes(cycle) { const ids = new Set(publiques(cycle).map(l => l.id)); return structuredClone(Object.values(base.equipes).map(e => e.equipe).filter(e => ids.has(e.ligueId))); },
    async classement(cycle, compte, page) { const equipes = (await this.equipes(cycle)).sort((a, b) => b.elo - a.elo || a.compteId.localeCompare(b.compteId)).map((e, i) => ({ ...e, rangMondial: i + 1 })); return { equipes: equipes.slice((page - 1) * 50, page * 50), total: equipes.length, page, moi: equipes.find(e => e.compteId === compte) }; },
    async plan(cycle) { return base.plans[cycle] ? { termine: base.plans[cycle].termine } : null; },
    async enregistrerPlan(cycle, plans) { base.plans[cycle] ??= { termine: false, poules: structuredClone(plans) }; sauver(); },
    async manquants(cycle, limite) { const codes = new Set(ligues().map(l => l.code)); return structuredClone((base.plans[cycle]?.poules ?? []).filter(p => !codes.has(codePoule(cycle, p))).slice(0, limite)); },
    async terminer(cycle) { base.plans[cycle].termine = true; sauver(); },
    async duCompte(cycle, compte) { const l = publiques(cycle).find(l => l.comptes.includes(compte)); return l ? resumePoule(l) : null; },
    async ouverte(cycle) { const l = publiques(cycle).filter(l => l.etat.phase === 'salon' && l.comptes.length < 16).sort((a, b) => indicePoule(a.etat.publique!) - indicePoule(b.etat.publique!))[0]; return l ? resumePoule(l) : null; },
    async prochainIndice(cycle) { return 1 + Math.max(0, ...publiques(cycle).map(l => indicePoule(l.etat.publique!)), ...(base.plans[cycle]?.poules ?? []).map(indicePoule)); },
    async bilan(cycle) { const ls = publiques(cycle), fins = ls.flatMap(l => l.etat.publique?.finLe ? [Date.parse(l.etat.publique.finLe)] : []); return { nombre: ls.length, equipes: ls.reduce((n, l) => n + l.comptes.length, 0), enCours: ls.filter(l => l.etat.phase === 'saison').length, fin: fins.length ? Math.max(...fins) : null, derniereDivision: Math.max(0, ...ls.map(l => positionPublique(l.etat.publique!).division)) }; },
  };
}
