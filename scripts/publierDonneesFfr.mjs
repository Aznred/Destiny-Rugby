import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';
const version=process.argv[2]??'2026_10_FFR_FULL',root=`.ffr/${version}`;
const report=JSON.parse(readFileSync(`${root}/report.json`,'utf8'));
if(!process.argv.includes('--appliquer'))throw new Error('Ajouter --appliquer après vérification du rapport et du snapshot.');
const line=readFileSync('.env','utf8').split('\n').find(l=>l.trim().startsWith('DATABASE_URL='));
const url=process.env.DATABASE_URL??line?.slice(line.indexOf('=')+1).trim().replace(/^["']|["']$/g,'');
if(!url)throw new Error('DATABASE_URL absente.');
const audit=JSON.parse(readFileSync(`${root}/production-audit.json`,'utf8'));
if(audit.database_host!==new URL(url).hostname)throw new Error('La base diffère de celle auditée.');
const sql=neon(url),db=new DatabaseSync(`${root}/sources.sqlite`,{readOnly:true});
const [existing]=await sql`select sha256,status from player_datasets where version=${version}`;
if(existing&&existing.sha256!==report.source_sha256)throw new Error('Version déjà attribuée à une autre source.');
if(existing?.status==='ACTIVE')throw new Error('Cette version est déjà active. Les décisions de validation sont conservées.');
await sql`insert into player_datasets(version,sha256,report) values(${version},${report.source_sha256},${JSON.stringify(report)}::jsonb) on conflict(version) do nothing`;
let after='',total=0;
for(;;){
  const rows=db.prepare('SELECT * FROM sources WHERE id>? ORDER BY id LIMIT 500').all(after);
  if(!rows.length)break;
  const payload=rows.map(r=>({...r,duplicate:r.duplicate===1,data:{...JSON.parse(r.data),card_status:r.card_status,duplicate:r.duplicate===1},
    review:r.gender==='male'&&r.card_status==='ACTIVE_CARD'?'APPROVED':r.review}));
  const serialized=JSON.stringify(payload);
  await sql`with imported as (
    insert into source_players(dataset_version,id,identity_key,gender,usage,card_status,club,competition,position,overall,confidence,duplicate,review,revision,data)
    select ${version},id,identity_key,gender,usage,card_status,club,competition,position,overall,confidence,duplicate,review,revision,data
    from jsonb_to_recordset(${serialized}::jsonb) r(id text,identity_key text,gender text,usage text,card_status text,club text,competition text,position text,
      overall integer,confidence real,duplicate boolean,review text,revision integer,data jsonb)
    on conflict(dataset_version,id) do nothing returning *
  ) insert into game_players(id,source_id,dataset_version,gender,status,review,data)
    select id,id,dataset_version,gender,card_status,review,data from imported
      where usage in ('MALE_SENIOR_CARD','FEMALE_SENIOR_CARD') and card_status='ACTIVE_CARD'
    on conflict(id) do update set dataset_version=excluded.dataset_version,status=excluded.status,
      data=case when game_players.review='APPROVED' then game_players.data else excluded.data end`;
  total+=rows.length;after=rows.at(-1).id;
  if(total%10000===0)process.stdout.write(`${total} sources privées transférées\n`);
}
const academies=Object.values(JSON.parse(readFileSync(`${root}/academies.json`,'utf8')));
for(let start=0;start<academies.length;start+=200){
  const batch=academies.slice(start,start+200).map(a=>({club_id:a.club,gender:a.gender,data:a}));
  await sql`insert into academy_profiles(dataset_version,club_id,gender,data) select ${version},club_id,gender,data
    from jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) r(club_id text,gender text,data jsonb) on conflict do nothing`;
}
const [count]=await sql`select count(*)::int n from source_players where dataset_version=${version}`;
if(count.n!==report.unique_sources)throw new Error('Le nombre de sources transférées ne correspond pas au rapport. Version maintenue en STAGING.');
// Only the last small transaction activates the dataset, after complete upload and count verification.
await sql.transaction([
  sql`update player_datasets set status='RETIRED' where status='ACTIVE' and version<>${version}`,
  sql`update player_datasets set status='ACTIVE' where version=${version} and sha256=${report.source_sha256}`,
]);
writeFileSync(`${root}/upload-result.json`,JSON.stringify({version,total,activated_at:new Date().toISOString()},null,2));
process.stdout.write(`Version ${version} activée : ${total} sources privées.\n`);db.close();
