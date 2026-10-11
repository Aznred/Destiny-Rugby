import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { comparaisonValidation, evaluerClassement, validationPublique } from '../src/lib/validationClassement';
import { TROPHEES } from '../src/data/trophees';
import { creerServiceValidation, stockageValidationNeon } from '../serveur/validationClassement';

/** Les anciennes lignes n'ont ni âge initial ni parcours manager complet. Elles restent provisoires. */
export function ficheHistorique(ligne: Record<string,unknown>) {
  const autorises=['pseudo','nom','poste','nation','age','saisons','note','reputation','matchs','essais','selections','titres','clubs','score'];
  return Object.fromEntries(autorises.filter(k=>ligne[k]!=null).map(k=>[k,ligne[k]]));
}
async function main() {
  let chaine=process.env.DATABASE_URL;
  for(const fichier of ['.env.local','.env']) {
    if(chaine||!existsSync(fichier))continue;
    const ligne=readFileSync(fichier,'utf8').split(/\r?\n/).find(l=>l.startsWith('DATABASE_URL='));
    chaine=ligne?.slice(ligne.indexOf('=')+1).trim().replace(/^["']|["']$/g,'');
  }
  if(!chaine)throw new Error('Connexion à la base absente.');
  const sql=neon(chaine);
  const lignes=await sql`select to_jsonb(c) as fiche from classement c order by score desc,maj_le asc limit 20000`;
  const ids=Object.keys(TROPHEES);
  const fiches=lignes.map(l=>ficheHistorique(l.fiche as Record<string,unknown>));
  const comparaison=comparaisonValidation(fiches,ids);
  const bilan={ total:comparaison.total, classeesActuellement:lignes.length, normalementEligibles:comparaison.normalementEligibles,
    visiblesProposees:comparaison.visiblesApres, statutsProposes:comparaison.statuts, causesValidationProposee:comparaison.causesApres,
    fichesScoreSeulement:fiches.filter(f=>!('nom' in f)).length,
    source:'Audit des lignes déjà classées. Les refus anciens ne sont pas enregistrés. Les champs de version et âge initial absents du stockage empêchent de rejouer exactement le crible historique.',
    ancienneFicheIncomplete:true, collecteLe:new Date().toISOString(), limite:20000, tronque:lignes.length===20000};
  if(process.argv.includes('--revalider')) {
    const service=creerServiceValidation(stockageValidationNeon(sql));
    let traites=0;
    const depot=stockageValidationNeon(sql);
    for(let debut=0;debut<lignes.length;debut+=20) {
    await Promise.all(lignes.slice(debut,debut+20).map(async ligne=>{
      const ancienne=ligne.fiche as Record<string,unknown>;
      if(typeof ancienne.cle!=='string')return;
      const deja=await depot.lire(ancienne.cle);
      // Une fiche complète déjà synchronisée prime sur sa projection historique incomplète.
      const fiche=deja?.fiche ?? ficheHistorique(ancienne);
      const resultat=await service.synchroniser(ancienne.cle,deja?.userId ?? null,fiche,Date.now(),true);traites++;
      // Initialiser le statut du record historique une seule fois, sans remplacer ses faits ni son score.
      await sql`update classement set validation=${JSON.stringify(resultat.dossier.validation)}::jsonb where cle=${ancienne.cle} and validation is null`;
    }));
    console.log(`Revalidation : ${traites}/${lignes.length}.`);
    }
    Object.assign(bilan,{revalidees:traites,bilanEnregistre:await depot.bilan()});
  }
  writeFileSync('VALIDATION-CLASSEMENT-38.json',JSON.stringify(bilan,null,2));
  console.log(JSON.stringify(bilan,null,2));
  // Aucun nom, clé d'écriture, compte ou contenu de carrière ne sort dans le rapport.
  const controle=fiches.map(f=>validationPublique(evaluerClassement(f,ids))).length;
  if(controle!==lignes.length)throw new Error('Audit incomplet.');
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/auditerClassement38.ts'))void main().catch(e=>{console.error('Audit indisponible.',{type:e?.name,code:e?.code,cause:e?.cause?.code});process.exitCode=1;});
