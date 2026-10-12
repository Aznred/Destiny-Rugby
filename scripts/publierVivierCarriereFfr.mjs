// Publie seulement un instantané privé du vivier solo, sans activer un autre catalogue de cartes.
// Sans --appliquer, contrôle uniquement les sources locales et la base cible.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { versionFfrValide } from '../serveur/ffr/jeunesCarriere.js';

const version = process.argv[2];
if (!version || !versionFfrValide(version)) throw new Error('Version de vivier requise.');
const dossier = `.ffr/${version}`;
const rapport = JSON.parse(readFileSync(`${dossier}/report.json`, 'utf8'));
if (rapport.version !== version || !rapport.career_youth?.usable) throw new Error('Rapport du vivier absent ou incohérent.');
const base = new DatabaseSync(`${dossier}/sources.sqlite`, { readOnly: true });
let lignes;
try {
  lignes = base.prepare('SELECT id,club,age,position,data FROM career_youth_sources ORDER BY id').all()
    .map(l => ({...l, data: JSON.parse(l.data)}));
} finally { base.close(); }
if (lignes.length !== rapport.career_youth.usable || new Set(lignes.map(l => l.id)).size !== lignes.length)
  throw new Error('Le snapshot local est incomplet.');
for (const l of lignes) {
  if (l.data.id !== l.id || l.data.sourcePlayerId !== l.id || l.data.youthPlayerId !== l.id || !l.club || !l.position
    || !Number.isSafeInteger(l.age) || ['photo','birth_date','raw'].some(k => k in l.data))
    throw new Error('Profil privé de carrière invalide.');
}
const ligneEnv = readFileSync('.env', 'utf8').split('\n').find(l => l.trim().startsWith('DATABASE_URL='));
const url = process.env.DATABASE_URL ?? ligneEnv?.slice(ligneEnv.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
if (!url) throw new Error('Base de production non configurée.');
const sql = neon(url);
const ordonner = valeur => Array.isArray(valeur) ? valeur.map(ordonner) : valeur && typeof valeur === 'object'
  ? Object.fromEntries(Object.keys(valeur).sort().map(k => [k,ordonner(valeur[k])])) : valeur;
const canonique = valeur => JSON.stringify(ordonner(valeur));
const [actif] = await sql`select version,sha256 from player_datasets where status='ACTIVE'`;
if (!actif || actif.sha256 !== rapport.source_sha256) throw new Error('La source du catalogue actif diffère du snapshot à publier.');
const [existant] = await sql`select version,status,sha256,report from player_datasets where version=${version}`;
if (existant && (existant.sha256 !== rapport.source_sha256 || canonique(existant.report.career_youth) !== canonique(rapport.career_youth)))
  throw new Error('Version déjà attribuée à un autre vivier.');
const [table] = await sql`select to_regclass('youth_career_sources') is not null as existe`;
const deja = table.existe ? await sql`select id,data from youth_career_sources where dataset_version=${version}` : [];
const attendus = new Map(lignes.map(l => [l.id, l.data]));
for (const l of deja) if (!attendus.has(l.id) || canonique(l.data) !== canonique(attendus.get(l.id)))
  throw new Error('Un profil de cette version diffère du snapshot immuable.');
console.log(JSON.stringify({version, profilsLocaux:lignes.length, profilsPublies:deja.length, catalogueActif:actif.version,
  migrationRequise:!table.existe, mode:process.argv.includes('--appliquer')?'publication':'audit'}));
if (process.argv.includes('--appliquer')) {
  const contenu = JSON.stringify(lignes);
  await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtextextended(${'vivier-carriere:'+version},0))`,
    sql`create table if not exists youth_career_sources (dataset_version text not null references player_datasets(version),
      id text not null, club text not null, age integer not null, position text not null, data jsonb not null,
      primary key(dataset_version,id))`,
    sql`create index if not exists youth_career_sources_club on youth_career_sources(dataset_version,club,id)`,
    sql`alter table youth_career_sources enable row level security`,
    sql`insert into player_datasets(version,sha256,status,report) values(${version},${rapport.source_sha256},'RETIRED',${JSON.stringify(rapport)}::jsonb)
      on conflict(version) do nothing`,
    sql`insert into youth_career_sources(dataset_version,id,club,age,position,data)
      select ${version},id,club,age,position,data from jsonb_to_recordset(${contenu}::jsonb)
      r(id text,club text,age integer,position text,data jsonb) on conflict(dataset_version,id) do nothing`,
    // Une erreur annule toute la transaction si le contenu distant ou la source active a changé.
    sql`select 1 / case when
      (select count(*) from youth_career_sources where dataset_version=${version})=${lignes.length}
      and not exists(select 1 from youth_career_sources s join jsonb_to_recordset(${contenu}::jsonb) r(id text,data jsonb)
        on r.id=s.id where s.dataset_version=${version} and s.data<>r.data)
      and exists(select 1 from player_datasets where version=${version} and sha256=${rapport.source_sha256}
        and report->'career_youth'=${JSON.stringify(rapport.career_youth)}::jsonb and status in ('ACTIVE','RETIRED'))
      and exists(select 1 from player_datasets where version=${actif.version} and status='ACTIVE')
      then 1 else 0 end as verifie`,
  ]);
  writeFileSync(`${dossier}/upload-carriere.json`, JSON.stringify({version,total:lignes.length,catalogueActif:actif.version,
    publieLe:new Date().toISOString()},null,2));
  console.log(`Vivier privé publié : ${lignes.length} profils ; catalogue actif conservé (${actif.version}).`);
}
