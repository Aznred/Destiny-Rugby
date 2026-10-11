import {readFileSync,existsSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';
import {randomUUID} from 'node:crypto';
import {stockageValidationNeon,type DossierClassement} from '../serveur/validationClassement';
import {evaluerClassement,validationPublique} from '../src/lib/validationClassement';
import {TROPHEES} from '../src/data/trophees';

async function main() {
  let chaine=process.env.DATABASE_URL;
  for(const f of ['.env.local','.env'])if(!chaine&&existsSync(f)) {
    const l=readFileSync(f,'utf8').split(/\r?\n/).find(l=>l.startsWith('DATABASE_URL='));
    chaine=l?.slice(l.indexOf('=')+1).trim().replace(/^["']|["']$/g,'');
  }
  if(!chaine)throw new Error('Connexion absente.');
  const sql=neon(chaine);
  // Les commentaires sont retirés ; les chaînes SQL restent entières.
  const source=readFileSync('serveur/schema-classement-validation.sql','utf8').replace(/--[^\r\n]*/g,'');
  if(source.includes('$$'))throw new Error('Découpage SQL à adapter aux blocs dollar.');
  const instructions:string[]=[];let debut=0;let chaineSql=false;
  for(let i=0;i<source.length;i++) {
    if(source[i]==="'") { if(chaineSql&&source[i+1]==="'"){i++;continue;}chaineSql=!chaineSql; }
    else if(source[i]===';'&&!chaineSql){const q=source.slice(debut,i).trim();if(q)instructions.push(q);debut=i+1;}
  }
  if(source.slice(debut).trim())instructions.push(source.slice(debut).trim());
  const appliquer=process.argv.includes('--appliquer');
  const avant=await sql`select count(*)::int as total from classement`;
  const lot=instructions.map(q=>sql.query(q,[]));
  lot.push(sql`select count(*)::int as total from classement`);
  if(!appliquer) {
    const brut={v:1,pseudo:'Banc 38',score:500};
    const dossier:DossierClassement={careerId:randomUUID(),cle:'banc38:'+randomUUID().slice(0,28),userId:null,fiche:brut,
      validation:validationPublique(evaluerClassement(brut,Object.keys(TROPHEES))),revision:1,date:new Date().toISOString(),derniereSynchronisation:new Date().toISOString()};
    const captures:{q:string;p:unknown[]}[]=[];
    const depot=stockageValidationNeon({query:async(q,p)=>{captures.push({q,p});return[{id:dossier.careerId}];}});
    await depot.enregistrer(dossier,null);
    await depot.enregistrer({...dossier,revision:2},1);
    await depot.enregistrer({...dossier,revision:3},1); // CAS périmé : aucun journal ajouté.
    for(const c of captures)lot.push(sql.query(c.q,c.p));
    lot.push(sql.query(`do $$ begin
      if (select revision from classement_validations where id='${dossier.careerId}')<>2 then raise exception 'CAS incorrect'; end if;
      if (select count(*) from classement_validation_logs where career_id='${dossier.careerId}')<>2 then raise exception 'Journal incorrect'; end if;
      if (select count(*) from classement)<>${Number(avant[0].total)} then raise exception 'Lignes perdues'; end if;
      raise exception 'BANC_CLASSEMENT38_VERIFIE_ANNULE'; end $$`,[]));
  }
  try {
    const retour=await sql.transaction(lot);
    if(!appliquer)throw new Error('Annulation du banc absente.');
    const apres=retour[instructions.length][0].total;
    if(apres!==avant[0].total)throw new Error('Nombre de lignes modifié.');
    console.log(`Migration 38 appliquée atomiquement : ${apres} lignes conservées. Sauvegardes inchangées.`);
  } catch(e) {
    if(!appliquer&&(e as Error).message==='BANC_CLASSEMENT38_VERIFIE_ANNULE')console.log('Migration et SQL vérifiés : lignes conservées, CAS, journal atomique. Transaction entièrement annulée.');
    else throw e;
  }
}
void main().catch(e=>{console.error('Migration indisponible.',{type:e?.name,code:e?.code});process.exitCode=1;});
