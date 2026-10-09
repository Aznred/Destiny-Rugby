// Diagnostic en LECTURE SEULE : ce que pèse chaque table, et ce qui grossit. Aucun contenu de compte n'est lu.
//   node --env-file=.env scripts/diagnostiquerTailleBase.mjs
import { neon } from '@neondatabase/serverless';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manque');
const sql = neon(process.env.DATABASE_URL);
const tables = await sql`select c.relname as table, pg_total_relation_size(c.oid) as octets, pg_relation_size(c.oid) as tas,
    pg_total_relation_size(c.oid) - pg_relation_size(c.oid) as index_et_toast, c.reltuples::bigint as lignes,
    s.n_tup_ins as inserts, s.n_tup_upd as updates, s.n_tup_del as deletes, s.n_dead_tup as mortes, s.last_autovacuum
  from pg_class c join pg_namespace n on n.oid = c.relnamespace left join pg_stat_user_tables s on s.relid = c.oid
  where n.nspname = 'public' and c.relkind = 'r' order by 2 desc limit 25`;
const mo = n => (Number(n) / 1048576).toFixed(1).padStart(8) + ' Mo';
console.log('base :', mo((await sql`select pg_database_size(current_database()) as o`)[0].o));
for (const t of tables) console.log(t.table.padEnd(38), mo(t.octets), ' tas', mo(t.tas), ' lignes', String(t.lignes).padStart(9),
  ' ins', String(t.inserts ?? '').padStart(9), ' maj', String(t.updates ?? '').padStart(9), ' sup', String(t.deletes ?? '').padStart(8), ' mortes', String(t.mortes ?? '').padStart(8));
