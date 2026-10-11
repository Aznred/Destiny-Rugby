import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scoreDeLaFiche, type FicheCarriere } from '../src/lib/classementMondial';
import { comparaisonValidation, evaluerClassement, validationPublique } from '../src/lib/validationClassement';
import { TROPHEES } from '../src/data/trophees';
import { creerServiceValidation, dossierPublic, stockageValidationLocal } from '../serveur/validationClassement';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { stockageFichier } from '../serveur/carriereFichier';

const ids=Object.keys(TROPHEES); let controles=0;
function verifier(condition:unknown, message:string) { assert.ok(condition,message);controles++; }
function fiche(modifications:Partial<FicheCarriere>={}) {
  const f:FicheCarriere={v:2,pseudo:'Camille',nom:'Camille Martin',poste:'demi-melee',nation:'France',ageDebut:18,age:18,saisons:1,
    note:40,reputation:20,matchs:10,essais:4,selections:0,titres:[],clubs:['Stade Toulousain'],score:0,...modifications};
  f.score=scoreDeLaFiche(f);return f;
}
const evaluer=(f:unknown)=>evaluerClassement(f,ids);
const normal=fiche();const copie=JSON.stringify(normal);
verifier(evaluer(normal).statut==='ELIGIBLE','Carrière ordinaire classée');
verifier(evaluer(fiche({matchs:0,essais:0})).visible,'Aucun minimum de matchs ni délai de création');
verifier(evaluer(fiche({note:100})).statut==='ELIGIBLE','Une progression seule ne suffit pas à exclure');
verifier(evaluer(fiche({matchs:65})).visible,'Calendrier chargé visible');
verifier(evaluer(fiche({essais:65})).visible,'Saison exceptionnelle visible');
const limite=evaluer(fiche({note:100,essais:65}));
verifier(limite.statut==='LIMITED'&&limite.visible&&!limite.recompensesAutorisees,'Risques cumulés : visible, récompenses différées');
const doute=evaluer(fiche({note:100,matchs:65,essais:400,selections:20,clubs:['A','B','C']}));
verifier(doute.statut==='PENDING_VALIDATION'&&doute.visible,'Risques cumulés élevés : provisoire visible');
verifier(evaluer({...normal,v:1}).statut==='PENDING_VALIDATION','Ancienne version récupérable');
verifier(evaluer({pseudo:'Archive',score:1000}).visible,'Ancienne fiche score seul visible');
verifier(evaluer({...normal,age:undefined,saisons:20,ageDebut:undefined,matchs:undefined,essais:100,selections:undefined}).visible,'Données manquantes ne créent pas de contradictions fictives');
verifier(evaluer({...normal,saisons:undefined,titres:[ids[0],ids[0]],matchs:200,score:undefined}).visible,'Calendrier et doublons ne sont pas jugés sur une durée absente');
verifier(evaluer({...normal,ageDebut:undefined,age:18,saisons:30,score:undefined}).visible,'Âge initial historique déduit : vérifier, conserver visible');
verifier(evaluer({...normal,pseudo:'   '}).statut==='PENDING_VALIDATION','Nom vide après espaces à compléter');
for(const f of [
  {...normal,score:normal.score+1},{...normal,matchs:-1},{...normal,note:101},{...normal,essais:-2},
  {...normal,ageDebut:5},{...normal,age:25},{...normal,matchs:101},{...normal,matchs:0,essais:1},
  {...normal,essais:151},{...normal,selections:31},{...normal,titres:[ids[0],ids[0]]},
  {...normal,titres:['trophee-invente']},{...normal,score:1e9},{...normal,score:NaN},{...normal,clubs:42},
  {...normal,pseudo:'Nom\nInjecté'},{...normal,cle:'../une-autre-carriere'},null,[],
]) verifier(evaluer(f).statut==='REJECTED'&&!evaluer(f).visible,'Incohérence forte bloquée : '+JSON.stringify(f));
for(const champ of ['saisons','age','note','reputation','matchs','essais','selections','score']) {
  for(const valeur of [-1,Infinity,'100',{},1.5]) verifier(evaluer({...normal,[champ]:valeur}).statut==='REJECTED',champ+' invalide');
}
verifier(evaluer({...normal,horsClassement:true}).horsClassement&&!evaluer({...normal,horsClassement:true}).visible,'Hors classement volontaire conservé');
for(const preuve of ['integriteInvalide','joueurInexistant','recompenseDupliquee']) {
  verifier(evaluer({...normal,[preuve]:true}).statut==='ELIGIBLE','Preuve déclarée par le client ignorée');
  verifier(evaluerClassement(normal,ids,{[preuve]:true}).statut==='REJECTED','Preuve serveur bloquante');
}
verifier(!('cle' in validationPublique(evaluer({...normal,cle:'secret'}))),'Clé privée absente du statut public');
verifier(JSON.stringify(normal)===copie,'Aucune mutation de sauvegarde pendant validation');
const manager=fiche({poste:'entraineur',ageDebut:60,age:89,saisons:30,note:0,reputation:0,matchs:0,essais:0,
  manager:{saisons:30,montees:4,prestige:95,titres:[],clubs:['A']}});
verifier(evaluer(manager).visible,'Entraîneur âgé avec vraie longue carrière accepté');
verifier(evaluer({...manager,manager:{...manager.manager,montees:31}}).statut==='REJECTED','Montées au-delà des saisons bloquées');
verifier(evaluer(fiche({ageDebut:18,age:87,saisons:70,matchs:2000})).visible,'Très longue carrière atypique : contrôle, pas rejet automatique');
const audit=comparaisonValidation([normal,fiche({note:100}),{pseudo:'Archive',score:500},{...normal,matchs:-1}],ids);
verifier(audit.recuperees===2&&audit.visiblesApres===3&&audit.statuts.REJECTED===1,'Audit avant/après distingue récupérations et incohérences');

const base={};let sauvegardes=0;const depot=stockageValidationLocal(base,()=>sauvegardes++);const service=creerServiceValidation(depot);
let d=(await service.synchroniser('cle-test','user-test',{...normal,v:1})).dossier;
const id=d.careerId;
verifier(d.validation.statut==='PENDING_VALIDATION','Synchronisation ancienne version enregistrée');
d=(await service.synchroniser('cle-test',null,normal)).dossier;
verifier(d.careerId===id&&d.userId==='user-test'&&d.validation.statut==='ELIGIBLE','Prochain envoi revalide automatiquement sans hausse du score');
await assert.rejects(()=>service.decider({id:'intrus',identifiant:'joueur'},id,d.revision,'valider',''),/Kiri/);controles++;
await assert.rejects(()=>service.decider({id:'k',identifiant:'kiri'},id,d.revision-1,'refuser',''),/changé/);controles++;
await service.decider({id:'k',identifiant:'kiri'},id,d.revision,'refuser','Cas à examiner');
d=(await depot.lire('cle-test'))!;
verifier(d.validation.statut==='REJECTED'&&d.decision?.motif==='Cas à examiner','Refus Kiri auditable');
d=(await service.synchroniser('cle-test',null,normal)).dossier;
verifier(d.validation.statut==='REJECTED','Même fiche : décision Kiri conservée');
d=(await service.synchroniser('cle-test',null,fiche({matchs:11}))).dossier;
verifier(d.validation.statut==='ELIGIBLE'&&!d.decision,'Nouveaux faits : réexamen automatique');
d=(await service.synchroniser('cle-test',null,{...normal,v:1})).dossier;
await service.decider({id:'k',identifiant:'kiri'},id,d.revision,'valider','Archive vérifiée');
verifier((await depot.lire('cle-test'))!.validation.statut==='ELIGIBLE','Validation manuelle des cas ambigus');
d=(await depot.lire('cle-test'))!;await service.decider({id:'k',identifiant:'kiri'},id,d.revision,'reinitialiser','');
verifier((await depot.lire('cle-test'))!.validation.statut==='PENDING_VALIDATION','Réinitialisation reprend les règles automatiques');
d=(await service.synchroniser('triche',null,{...normal,score:normal.score+100})).dossier;
await assert.rejects(()=>service.decider({id:'k',identifiant:'kiri'},d.careerId,d.revision,'valider',''),/incohérence/);controles++;
await service.revalider();
verifier((await depot.lire('triche'))!.validation.statut==='REJECTED','Revalidation en lot ne blanchit pas un score modifié');
verifier((await depot.lister('PENDING',1)).total===1&&(await depot.lister('REJECTED',1)).total===1,'Filtres du Labo');
verifier(!JSON.stringify(dossierPublic(d)).includes('cle-test')&&!('fiche' in dossierPublic(d)),'Labo ne diffuse pas la clé ni la fiche brute');
verifier(sauvegardes>=10,'Décisions persistées');

const repertoire=mkdtempSync(join(tmpdir(),'destiny-validation38-'));
try {
  const fichier=join(repertoire,'base.json');const stockage=stockageFichier(fichier);
  const kiri=randomUUID(),intrus=randomUUID();
  await stockage.creerCompte({id:kiri,identifiant:'kiri',pseudo:'Administrateur',empreinte:'test'});
  await stockage.creerCompte({id:intrus,identifiant:'intrus',pseudo:'kiri',empreinte:'test'});
  for(const user of [kiri,intrus])await stockage.ouvrirSession(empreinteJeton(user),user,Date.now()+60000);
  const controle=creerServiceValidation(stockage.classementValidation!);
  const dossier=(await controle.synchroniser('preuve-privee',intrus,{...normal,v:1})).dossier;
  const baseAvant=JSON.parse(readFileSync(fichier,'utf8'));
  const api=creerGestionnaireCarriere(stockage);
  async function appeler(compte:string,body?:unknown,filtre='ALL') {
    let statut=0;let donnees:any;const res={status(n:number){statut=n;return res;},setHeader(){},json(v:unknown){donnees=v;}};
    await api.handler({method:body?'POST':'GET',url:'/api/carriere?classementValidation=1&filtre='+filtre,
      headers:{host:'localhost',origin:'http://localhost','content-type':'application/json',cookie:'destiny_carriere='+compte},body},res);return{statut,donnees};
  }
  verifier((await appeler('inconnue')).statut===401,'Labo anonyme protégé côté backend');
  verifier((await appeler(intrus)).statut===404,'Le pseudo kiri ne donne aucun droit');
  const interdit=await appeler(intrus,{action:'classementValidation',operation:'valider',careerId:dossier.careerId,revision:1});
  verifier(interdit.statut===404,'Décision manuelle interdite au joueur ordinaire : '+JSON.stringify(interdit));
  const vue=await appeler(kiri);verifier(vue.statut===200&&vue.donnees.dossiers.length===1,'Kiri lit les dossiers et le bilan');
  verifier(!JSON.stringify(vue.donnees).includes('preuve-privee'),'Aucune clé privée dans la réponse Labo');
  const decision=await appeler(kiri,{action:'classementValidation',operation:'valider',careerId:dossier.careerId,revision:1});
  verifier(decision.statut===200&&decision.donnees.validation.statut==='ELIGIBLE','Route Kiri valide réellement');
  verifier((await appeler(kiri,{action:'classementValidation',operation:'refuser',careerId:dossier.careerId,revision:1})).statut===409,'Décision périmée refusée');
  verifier((await appeler(kiri,undefined,'INVENTE')).statut===400,'Filtre arbitraire refusé');
  const relu=stockageFichier(fichier);verifier((await relu.classementValidation!.parId(dossier.careerId))!.validation.statut==='ELIGIBLE','État conservé après rechargement du stockage');
  const baseApres=JSON.parse(readFileSync(fichier,'utf8'));
  for(const champ of ['ligues','echanges','instantanesSolo']) verifier(JSON.stringify(baseApres[champ])===JSON.stringify(baseAvant[champ]),'Validation ne modifie pas les sauvegardes : '+champ);
} finally { rmSync(repertoire,{recursive:true,force:true}); }
console.log(`Correctif 38 : ${controles} contrôles réussis.`);
process.exit(0);
