// Vérifie les colonnes légères et l'index employés par la carrière en ligne.
// Ne lit jamais `donnees`, afin que le contrôle lui-même reste peu coûteux.
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manque.');
const sql = neon(process.env.DATABASE_URL);
const [etat] = await sql`
  select count(*)::int as ligues,
         count(*) filter (where resume is not null)::int as resumes,
         count(*) filter (where reveil_match<=now())::int as a_reveiller,
         count(*) filter (where reveil_match>now())::int as programmees
  from carriere_ligues`;
const index = await sql`
  select indexname from pg_indexes
  where schemaname='public' and tablename='carriere_ligues'
    and indexname in ('carriere_ligues_comptes_idx','carriere_ligues_echeance_idx','carriere_ligues_reveil_match_idx')
  order by indexname`;
if (Number(etat.resumes) !== Number(etat.ligues)) throw new Error('Un résumé de ligue manque.');
if (index.length !== 3) throw new Error('Un index de carrière manque.');
console.log(`OK — ${etat.ligues} ligue(s), ${etat.resumes} résumé(s), ${etat.a_reveiller} réveil(s) dû(s), ${etat.programmees} programmé(s), 3 index présents.`);
