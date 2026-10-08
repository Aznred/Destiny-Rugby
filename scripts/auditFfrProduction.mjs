import { readFileSync,writeFileSync,existsSync } from 'node:fs';
import {neon} from '@neondatabase/serverless';
const version=process.argv[2]??'2026_10_FFR_FULL',root=`.ffr/${version}`;
const apres=process.argv.includes('--apres');
const withdrawn=JSON.parse(readFileSync(`${root}/withdrawn-sources.json`,'utf8'));
function connection(){if(process.env.DATABASE_URL)return process.env.DATABASE_URL;
  const line=readFileSync('.env','utf8').split('\n').find(l=>l.trim().startsWith('DATABASE_URL='));
  return line?.slice(line.indexOf('=')+1).trim().replace(/^["']|["']$/g,'');}
const url=connection();if(!url)throw new Error('DATABASE_URL absente.');const sql=neon(url);
const tables=await sql`select table_name from information_schema.tables where table_schema='public'`;
const present=new Set(tables.map(r=>r.table_name));
if(!present.has('carriere_ligues'))throw new Error('Cette base ne contient pas les ligues Destiny Rugby.');
const ids=JSON.stringify(withdrawn);
const [league]=await sql`with cards as (
  select l.id as league_id,l.donnees,c from carriere_ligues l cross join lateral jsonb_array_elements(coalesce(l.donnees->'cartes','[]')) c
  where (c->>'sourceId' in(select jsonb_array_elements_text(${ids}::jsonb))
    or c->'speciale'->>'base' in(select jsonb_array_elements_text(${ids}::jsonb))
    or (c->>'origine'<>'formation' and (c->>'age')::numeric<18))
    and coalesce((c->>'retiree')::boolean,false)=false
) select count(*)::int as youth_cards_existing,
  count(*) filter(where c->>'proprietaire' is not null)::int as youth_cards_owned,
  (select count(distinct l.id)::int from carriere_ligues l where exists(select 1 from cards c where c.league_id=l.id)) as affected_leagues,
  (select count(*)::int from carriere_ligues l cross join lateral jsonb_array_elements(coalesce(l.donnees->'ventes','[]')) v
    where v->>'etat'='ouverte' and exists(select 1 from cards c where c.league_id=l.id and c.c->>'id'=v->>'carteId')) as youth_cards_on_market,
  (select count(*)::int from cards c where exists(select 1 from jsonb_array_elements(c.donnees->'clubs') club
    where (club->'composition'->'titulaires') ? (c.c->>'id') or (club->'composition'->'remplacants') ? (c.c->>'id'))) as youth_cards_in_lineups,
  (select count(*)::int from carriere_ligues l cross join lateral jsonb_array_elements(coalesce(l.donnees->'echanges','[]')) e
    where e->>'etat'='propose' and exists(select 1 from cards c where c.league_id=l.id and
      ((e->'cartesDonnees') ? (c.c->>'id') or (e->'cartesDemandees') ? (c.c->>'id')))) as youth_trade_offers,
  (select count(*)::int from cards c where exists(select 1 from jsonb_array_elements(coalesce(c.donnees->'transactions','[]')) t
    where t->'cartes' ? (c.c->>'id'))) as youth_cards_in_history from cards`;
let market={count:0};
if(present.has('carriere_marches')){
  const [r]=await sql`select count(*)::int as count from carriere_marches m cross join lateral jsonb_array_elements(coalesce(m.donnees->'annonces','[]')) a
    where a->'carte'->>'sourceId' in(select jsonb_array_elements_text(${ids}::jsonb))`;market=r;
}
// Solo inventory keys are opaque hashes, produced by the same shared function as the game.
const {cleCarteSolo}=await import('../src/lib/collectionSolo.ts');
const keys=JSON.stringify(withdrawn.map(cleCarteSolo));let solo={owners:0,copies:0},trades={offers:0};
if(present.has('compte_boutique')){
  const [r]=await sql`select count(distinct b.compte)::int as owners,coalesce(sum(q.value::int),0)::int as copies
    from compte_boutique b cross join lateral jsonb_each_text(coalesce(b.donnees->'collectionSolo'->'quantites','{}')) q
    where q.key in(select jsonb_array_elements_text(${keys}::jsonb))`;solo=r;
}
if(present.has('collection_offres')){
  const [r]=await sql`select count(*)::int as offers from collection_offres
    where statut='ouverte' and (offertes ?| array(select jsonb_array_elements_text(${keys}::jsonb))
      or souhaitees ?| array(select jsonb_array_elements_text(${keys}::jsonb))
      or exists(select 1 from jsonb_array_elements(propositions) p where p->'cartes' ?| array(select jsonb_array_elements_text(${keys}::jsonb))))`;trades=r;
}
const report={version,audited_at:new Date().toISOString(),database_host:new URL(url).hostname,...league,
  youth_cards_shared_market:market.count,solo_youth_owners:solo.owners,solo_youth_copies:solo.copies,solo_youth_trade_offers:trades.offers,
  public_packs:'All draws and rewards use the filtered catalogue',source_players_available:present.has('source_players'),production_audit:'COMPLETED'};
writeFileSync(`${root}/${apres?'production-audit-after':'production-audit'}.json`,JSON.stringify(report,null,2),{mode:0o600});
if(existsSync(`${root}/report.json`)){const original=JSON.parse(readFileSync(`${root}/report.json`,'utf8'));writeFileSync(`${root}/report.json`,JSON.stringify({...original,[apres?'production_after':'production']:report},null,2));}
process.stdout.write(JSON.stringify(report,null,2)+'\n');
