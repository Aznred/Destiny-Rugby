import { createReadStream, existsSync, mkdirSync, writeFileSync, copyFileSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { classifierFfr, normaliserFfr } from '../serveur/ffr/classification.ts';
import { catalogueBaseCarriere } from '../src/lib/ligue/catalogueCarriere.ts';
import { empreinteSourceFfr } from '../src/lib/ligue/eligibiliteJoueurs.ts';

const input = resolve(process.argv[2] ?? '../Objectif Ffr/exports/joueurs.json');
const version = process.argv[3] ?? '2026_10_FFR_FULL';
if (!/^[A-Za-z0-9_]{3,60}$/.test(version)) throw new Error('Version invalide.');
const root = resolve('.ffr', version); mkdirSync(root, { recursive: true });
const path = resolve(root, 'sources.sqlite');
const resume=existsSync(path)&&process.argv.includes('--reprendre');
if (existsSync(path) && !resume) throw new Error('Version déjà préparée. Utiliser une nouvelle version pour préserver le snapshot.');
const old = resume ? JSON.parse(readFileSync(resolve(root,'catalogue-before.json'),'utf8')) : catalogueBaseCarriere();
if(!resume)writeFileSync(resolve(root, 'catalogue-before.json'), JSON.stringify(old), { mode: 0o600 });
const db = new DatabaseSync(path);
if(!resume)db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE sources(id TEXT PRIMARY KEY, identity_key TEXT NOT NULL, gender TEXT NOT NULL,
  usage TEXT NOT NULL, card_status TEXT NOT NULL, club TEXT, competition TEXT, position TEXT, overall INTEGER, confidence REAL,
  duplicate INTEGER DEFAULT 0, review TEXT DEFAULT 'PENDING', revision INTEGER DEFAULT 0, data TEXT NOT NULL);
  CREATE INDEX source_name ON sources(identity_key); CREATE INDEX source_filters ON sources(gender,usage,card_status,id);
  CREATE INDEX source_club ON sources(club,id); CREATE TABLE decisions(id TEXT,revision INTEGER,action TEXT,actor TEXT,at TEXT,data TEXT);
  CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT);`);
const insert = db.prepare(`INSERT INTO sources(id,identity_key,gender,usage,card_status,club,competition,position,overall,confidence,data)
  VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET identity_key=excluded.identity_key, gender=excluded.gender,
  usage=excluded.usage,card_status=excluded.card_status,club=excluded.club,competition=excluded.competition,position=excluded.position,
  overall=excluded.overall,confidence=excluded.confidence,data=excluded.data
  WHERE coalesce(json_extract(excluded.data,'$.season'),'') > coalesce(json_extract(sources.data,'$.season'),'')
  OR (coalesce(json_extract(excluded.data,'$.season'),'')=coalesce(json_extract(sources.data,'$.season'),'') AND excluded.confidence>sources.confidence)`);
const hash = createHash('sha256'); let rows = 0, sameId = 0;
db.exec('BEGIN');
// FFR compact exporter writes one object per line. Reject other formats rather than partially importing them.
for await (const line of createInterface({ input: createReadStream(input, { encoding: 'utf8' }), crlfDelay: Infinity })) {
  hash.update(line + '\n'); const text = line.trim().replace(/,$/, '');
  if (!text || text === '[' || text === ']') continue;
  if(resume){rows++;continue;}
  if (!text.startsWith('{') || !text.endsWith('}')) throw new Error(`Format FFR inattendu à la ligne ${rows + 2}.`);
  const raw = JSON.parse(text), p = classifierFfr(raw);
  if (!raw.player_id && !raw.ffr_id) throw new Error('Profil sans identifiant source : import interrompu.');
  if (db.prepare('SELECT 1 FROM sources WHERE id=?').get(p.id)) sameId++;
  insert.run(p.id,p.identity_key,p.gender,p.usage,p.card_status,p.club,p.competition,p.primary_position,p.overall,p.data_confidence,JSON.stringify(p));
  rows++;
  if (rows % 10000 === 0) { db.exec('COMMIT; BEGIN'); if (rows % 100000 === 0) process.stdout.write(`${rows} profils classifiés\n`); }
}
db.exec('COMMIT');
db.exec(`CREATE TABLE IF NOT EXISTS sources_name_tokens(token TEXT NOT NULL,id TEXT NOT NULL,PRIMARY KEY(token,id));
  INSERT OR IGNORE INTO sources_name_tokens(token,id)
  WITH RECURSIVE words(id,rest,token) AS (
    SELECT id,identity_key||' ','' FROM sources
    UNION ALL SELECT id,substr(rest,instr(rest,' ')+1),substr(rest,1,instr(rest,' ')-1) FROM words WHERE instr(rest,' ')>0
  ) SELECT token,id FROM words WHERE token<>'';`);
// Names alone never merge people. Accent/compound-name matches enter the review queue.
db.exec(`UPDATE sources SET duplicate=1,card_status='DATABASE_ONLY' WHERE identity_key IN
  (SELECT identity_key FROM sources WHERE identity_key<>'' GROUP BY identity_key HAVING count(*)>1)`);
const youthNames = db.prepare("SELECT identity_key FROM sources WHERE usage='YOUTH_REGEN_SOURCE' GROUP BY identity_key").all();
const youths = new Set(youthNames.map(r => r.identity_key));
const profilesForName = db.prepare('SELECT data FROM sources WHERE identity_key=?');
const withdrawn = [];
for (const c of old) {
  const key = normaliserFfr(c.nom);
  if (!youths.has(key)) continue;
  const profiles = profilesForName.all(key).map(r => JSON.parse(r.data));
  const sameClub = profiles.filter(p => normaliserFfr(p.club ?? '') === normaliserFfr(c.clubReel));
  const matches = sameClub.length ? sameClub : profiles;
  // Conflicting identities stay out of automatic destructive migration.
  if (matches.some(p => p.senior_status === 'senior')) continue;
  if (matches.some(p => p.usage === 'YOUTH_REGEN_SOURCE') && (sameClub.length || profiles.length === 1)) withdrawn.push(c.sourceId);
}
writeFileSync(resolve(root,'withdrawn-sources.json'),JSON.stringify(withdrawn),{mode:0o600});
const protection = resolve('src/data/protectionFfr.generated.ts');
if (existsSync(protection)&&!existsSync(resolve(root,'protection-before.ts'))) copyFileSync(protection, resolve(root,'protection-before.ts'));
writeFileSync(protection, `// Generated. Opaque hashes only; source identities remain private.\nexport const VERSION_PROTECTION_FFR = ${JSON.stringify(version)};\nexport const SOURCES_FFR_RETIREES: readonly string[] = ${JSON.stringify([...new Set(withdrawn.map(empreinteSourceFfr))].sort())};\n`);
const academies = {};
const youthStatement=db.prepare("SELECT data FROM sources WHERE usage='YOUTH_REGEN_SOURCE' AND club IS NOT NULL");
for (const row of youthStatement.iterate()) {
  const p = JSON.parse(row.data), key = `${p.gender}:${normaliserFfr(p.club)}`;
  const a = academies[key] ??= { club:p.club,gender:p.gender,youth_count:0,matches:0,level_sum:0,level_count:0,promoted:0,positions:{} };
  a.youth_count++; a.matches += p.matches;
  if(p.level!==null){a.level_sum+=p.level;a.level_count++;} if(p.raw.promoted)a.promoted++;
  if(p.primary_position)a.positions[p.primary_position]=(a.positions[p.primary_position]??0)+1;
}
for(const a of Object.values(academies)) {
  a.academy_rating=Math.round(Math.max(0,Math.min(100,(a.level_count?a.level_sum/a.level_count:25)*.8
    +Math.min(18,Math.log1p(a.youth_count)*3)+Math.min(8,a.matches/Math.max(1,a.youth_count))
    +Math.min(10,a.promoted/Math.max(1,a.youth_count)*30))));
  a.confidence=a.level_count?Math.min(.9,.3+Math.log1p(a.youth_count)/10):.25;
  delete a.level_sum;delete a.level_count;
}
writeFileSync(resolve(root,'academies.json'),JSON.stringify(academies),{mode:0o600});
// Only aggregates from male youth cohorts feed the current solo career. No identities, photographs or licence ids.
const publicAcademies=Object.fromEntries(Object.entries(academies).filter(([,a])=>a.gender==='male'&&a.youth_count>=5).map(([k,a])=>[k.slice(5),{rating:a.academy_rating,count:a.youth_count,positions:a.positions,confidence:a.confidence}]));
writeFileSync(resolve('src/data/academiesFfr.generated.ts'),`// Aggregated cohorts of at least five; no real youth identities.\nexport const ACADEMIES_FFR: Record<string,{rating:number;count:number;positions:Record<string,number>;confidence:number}> = ${JSON.stringify(publicAcademies)};\n`);
const counts = db.prepare('SELECT usage,card_status,count(*) AS n FROM sources GROUP BY usage,card_status').all();
const report = {version,input_rows:rows,unique_sources:db.prepare('SELECT count(*) n FROM sources').get().n,same_id_duplicates:sameId,
  name_duplicate_candidates:db.prepare('SELECT count(*) n FROM sources WHERE duplicate=1').get().n,
  source_sha256:hash.digest('hex'),counts,youth_players_found:db.prepare("SELECT count(*) n FROM sources WHERE usage='YOUTH_REGEN_SOURCE'").get().n,youth_cards_existing:withdrawn.length,
  youth_cards_owned:null,youth_cards_on_market:null,youth_cards_in_lineups:null,
  production_audit:existsSync(resolve(root,'production-audit.json'))?'COMPLETED':'NOT_RUN',
  ...(existsSync(resolve(root,'production-audit.json'))?{production:JSON.parse(readFileSync(resolve(root,'production-audit.json'),'utf8'))}:{}),
  academies:Object.keys(academies).length,created_at:new Date().toISOString()};
db.prepare('INSERT OR REPLACE INTO meta VALUES(?,?)').run('report',JSON.stringify(report));
db.exec('PRAGMA wal_checkpoint(TRUNCATE)');db.close();
writeFileSync(resolve(root,'report.json'),JSON.stringify(report,null,2),{mode:0o600});
process.stdout.write(JSON.stringify(report,null,2)+'\n');
