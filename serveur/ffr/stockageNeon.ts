import { neon } from '@neondatabase/serverless';
import { filtreSource, vueSource } from './stockage.js';
import type { StockageJoueurs } from './stockage.js';
import type { ProfilFfr } from './classification.js';
import { editionProfil, exigerPublication } from './validation.js';
import { filtreJeunesCarriere, REFERENCE_JEUNES_FFR } from './jeunesCarriere.js';
import type { SourceJeuneFfr } from '../../src/lib/jeunesFfr.js';
export function joueursNeon(url: string): StockageJoueurs {
  const sql=neon(url);
  return {
    async acces(compte){
      try { const [r]=await sql`select feature_womens_rugby from player_feature_access where compte=${compte} and role='INTERNAL_TESTER'`;return r?.feature_womens_rugby===true; }
      catch(e){if((e as {code?:string}).code==='42P01')return false;throw e;}
    },
    async rechercher(params){
      const f=filtreSource(params);
      const [dataset]=await sql`select version from player_datasets where status='ACTIVE'`;
      if(!dataset)return {joueurs:[],next:null,version:null};
      const prefix=f.q.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
      const rows=await sql`select data,review,revision,duplicate from source_players where dataset_version=${dataset.version}
        and (${f.gender}='' or gender=${f.gender}) and id>${f.after}
        and (${prefix}='' or identity_key like ${'%'+prefix+'%'} or id=${f.q})
        and (${f.filter}='' or (${f.filter}='seniors' and usage in ('MALE_SENIOR_CARD','FEMALE_SENIOR_CARD'))
          or (${f.filter} in ('youth','regens') and usage='YOUTH_REGEN_SOURCE')
          or (${f.filter}='low' and card_status='LOW_CONFIDENCE') or (${f.filter}='duplicates' and duplicate)
          or (${f.filter}='position' and position is null) or (${f.filter}='club' and club is null)
          or (${f.filter}='overall' and overall is null) or (${f.filter}='review' and review='PENDING'))
        order by id limit ${f.limit+1}`;
      const page=rows.slice(0,f.limit);
      return {version:String(dataset.version),next:rows.length>f.limit?String((page.at(-1)!.data as ProfilFfr).id):null,
        joueurs:page.map(r=>vueSource({...r.data as ProfilFfr,duplicate:r.duplicate===true},String(r.review),Number(r.revision)))};
    },
    async catalogue(gender){
      const [dataset]=await sql`select version,(select coalesce(max(id),0) from player_reviews where dataset_version=player_datasets.version) as revision
        from player_datasets where status='ACTIVE'`;
      if(!dataset)return {version:'',revision:'',joueurs:[]};
      const rows=await sql`select data from game_players where dataset_version=${dataset.version} and gender=${gender}
        and status='ACTIVE_CARD' and review='APPROVED' order by id limit 10000`;
      return {version:String(dataset.version),revision:String(dataset.revision),joueurs:rows.map(r=>r.data as ProfilFfr)};
    },
    async decider(id,revision,action,actor,edit){
      const [row]=await sql`select s.* from source_players s join player_datasets d on d.version=s.dataset_version
        where d.status='ACTIVE' and s.id=${id}`;
      if(!row||Number(row.revision)!==revision)throw new Error('Le profil a changé. Rechargez la page.');
      const p=editionProfil({...row.data as ProfilFfr,duplicate:row.duplicate===true},edit);
      if(action==='APPROVE')exigerPublication(p);
      const review=action==='APPROVE'?'APPROVED':action==='REJECT'?'REJECTED':'PENDING';
      const [result]=await sql`with changed as (
        update source_players set data=${JSON.stringify(p)}::jsonb,club=${p.club},competition=${p.competition},position=${p.primary_position},
          overall=${p.overall},confidence=${p.data_confidence},duplicate=${p.duplicate===true},card_status=${p.card_status},review=${review},revision=revision+1
          where dataset_version=${row.dataset_version} and id=${id} and revision=${revision} returning *
      ), logged as (
        insert into player_reviews(dataset_version,source_id,revision,action,actor,data)
        select dataset_version,id,revision,${action},${actor},jsonb_build_object('profile',data,'edit',${JSON.stringify(edit ?? {})}::jsonb) from changed returning id
      ), game as (
        insert into game_players(id,source_id,dataset_version,gender,status,review,data)
        select id,id,dataset_version,gender,card_status,review,data from changed where usage in ('MALE_SENIOR_CARD','FEMALE_SENIOR_CARD')
        on conflict(id) do update set dataset_version=excluded.dataset_version,gender=excluded.gender,status=excluded.status,review=excluded.review,data=excluded.data returning id
      ) select count(*) as n from changed`;
      if(Number(result.n)!==1)throw new Error('Modification concurrente. Rechargez la page.');
    },
    async rapport(){const [r]=await sql`select version,report from player_datasets where status='ACTIVE'`;return r??null;},
    async jeunesCarriere(params){
      const filtre = filtreJeunesCarriere(params);
      const [dataset] = await sql`select version,report from player_datasets
        where (${filtre.version}='' and status='ACTIVE') or (${filtre.version}<>'' and version=${filtre.version} and status in ('ACTIVE','RETIRED'))`;
      if (!dataset) {
        if (filtre.version) throw new Error('Cette version du vivier est indisponible.');
        return {version:null, referenceDate:REFERENCE_JEUNES_FFR, joueurs:[], next:null, total:0};
      }
      const rapport = (dataset.report as {career_youth?:{referenceDate:string;usable:number}})?.career_youth;
      if (!rapport) return {version:null, referenceDate:REFERENCE_JEUNES_FFR, joueurs:[], next:null, total:0};
      const rows = await sql`select id,data from youth_career_sources where dataset_version=${dataset.version}
        and id>${filtre.after} order by id limit ${filtre.limit+1}`;
      const page = rows.slice(0, filtre.limit);
      return {version:String(dataset.version), referenceDate:rapport.referenceDate, total:Number(rapport.usable),
        next:rows.length>filtre.limit ? String(page.at(-1)!.id) : null, joueurs:page.map(r => r.data as SourceJeuneFfr)};
    },
  };
}
