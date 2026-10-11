// Exerce la fonction SQL dans une seule instruction atomique annulée volontairement.
// Aucun compte, Ova, reçu ni session du banc ne reste en base.
import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';
const ligne=fs.readFileSync('.env','utf8').split('\n').find(l=>l.trim().startsWith('DATABASE_URL='));
const url=process.env.DATABASE_URL ?? ligne?.slice(ligne.indexOf('=')+1).trim().replace(/^["']|["']$/g,'');
if(!url)throw new Error('DATABASE_URL requise.');
const sql=neon(url);
const instruction=`do $$
declare c uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); t text:='banc-pub-'||gen_random_uuid()::text; d jsonb;
begin
 insert into comptes(id,pseudo,empreinte,identifiant) values(c,'Banc Pub','banc-inutilisable','banc-pub-'||c::text);
 insert into compte_boutique(compte,donnees) values(c,'{"ovas":50,"achatsOvas":0}'::jsonb);
 d:=jsonb_build_object('revision',0,'sessions',jsonb_build_array(jsonb_build_object('rewardSessionId',s::text)),
   'stats',jsonb_build_object('distribution',jsonb_build_object('bronze',1),'distributionAttendue',jsonb_build_object('bronze',0.75,'standard',0.25)));
 if not pub_ecrire(c,null,d,4,t) then raise exception 'écriture initiale refusée'; end if;
 if (select (donnees->>'ovas')::int from compte_boutique where compte=c)<>54 then raise exception 'crédit perdu'; end if;
 if (select (donnees->>'achatsOvas')::int from compte_boutique where compte=c)<>4 then raise exception 'registre de crédit perdu'; end if;
 if not exists(select 1 from pub_sessions where id=s and compte=c) then raise exception 'index session absent'; end if;
 if pub_ecrire(c,null,d,4,null) then raise exception 'ancienne révision acceptée'; end if;
 if pub_ecrire(c,0,d||'{"revision":1}'::jsonb,4,t) then raise exception 'TID dupliqué accepté'; end if;
 if (select (donnees->>'ovas')::int from compte_boutique where compte=c)<>54 then raise exception 'crédit dupliqué'; end if;
 if not pub_ecrire(c,0,d||'{"revision":1}'::jsonb,0,null) then raise exception 'CAS valide refusé'; end if;
 if not exists(select 1 from pub_sessions i join pub_comptes p on p.compte=i.compte,
   jsonb_array_elements(p.donnees->'sessions') element where i.compte=c and element->>'rewardSessionId'=i.id::text)
 then raise exception 'lecture indexée invalide'; end if;
 raise exception 'BANC_PUBLICITES_SQL_VERIFIE_ANNULE';
end $$;`;
try { await sql.query(instruction,[]); throw new Error('Annulation du banc absente.'); }
catch(e) { if(e.message!=='BANC_PUBLICITES_SQL_VERIFIE_ANNULE')throw e; }
console.log('SQL AppLixir validé : crédit, registre, index de session, CAS et TID unique. Transaction du banc annulée.');
