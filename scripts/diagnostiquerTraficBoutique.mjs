// Diagnostic en lecture seule : tailles et activité, sans contenu des comptes.
import { neon } from '@neondatabase/serverless';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manque');
const sql = neon(process.env.DATABASE_URL);
const depuis = new Date(Date.now() - 15 * 60_000).toISOString();
console.log(JSON.stringify({
  coffres: await sql`select count(*)::int as nombre, max(octet_length(donnees::text)) as taille_max,
    avg(octet_length(donnees::text))::int as taille_moyenne,
    count(*) filter(where modifie_le > ${depuis}::timestamptz)::int as actifs_15min from compte_boutique`,
  plusGros: await sql`select octet_length(donnees::text) as octets,
    (select count(*)::int from jsonb_object_keys(donnees->'collectionSolo'->'quantites')) as cartes,
    (select sum(valeur::bigint) from jsonb_each_text(donnees->'collectionSolo'->'packsOuverts') as p(cle,valeur)) as packs_ouverts,
    donnees->'collectionSolo'->>'doublons' as doublons, md5(donnees::text) as empreinte,
    donnees->'collectionSolo'->>'revision' as revision, modifie_le
    from compte_boutique order by octet_length(donnees::text) desc limit 10`,
  debit: await sql`select max(nombre)::int as maximum, count(*)::int as comptes_actifs
    from carriere_debits where cle like 'jeu:%' and debut > ${Date.now() - 15 * 60_000}`,
}, null, 2));
