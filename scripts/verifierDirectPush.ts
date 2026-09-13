import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import webpush from 'web-push';
import {alertesMatchs,notifierMatchs,validerAbonnement} from '../serveur/notificationsPush';
import {pushLocal,type BasePush} from '../serveur/pushStockage';
import {stockageFichier} from '../serveur/carriereFichier';
import {creerGestionnaireCarriere,empreinteJeton} from '../serveur/carriereApi';
import {prochainReveilMatch} from '../serveur/horlogeVercel';
import {momentsDepuisFil} from '../src/lib/ligue/momentsForts';
import {agirCarriere,creerCarriere} from '../src/lib/ligue/carriere';
import {prochaineEcheanceMatch} from '../src/lib/ligue/echeanceCarriere';
import type {EtatCarriereEnLigne} from '../src/lib/ligue/typesCarriere';
import type {LigneFil} from '../src/lib/ligue/matchCarriere';
const now=1700000000000;
const fil:LigneFil[]=[
 {id:'1',minute:1,seconde:60,type:'essai',texte:'Martin aplatit.',cote:'domicile',points:5,score:{domicile:5,exterieur:0}},
 {id:'2',minute:1,seconde:75,type:'but',texte:'Transformation.',cote:'domicile',points:2,score:{domicile:7,exterieur:0}},
 {id:'3',minute:1,seconde:80,type:'penalite',texte:'Hors-jeu.',cote:'exterieur',score:{domicile:7,exterieur:0}},
 {id:'4',minute:1,seconde:85,type:'carton',texte:'Carton jaune.',cote:'domicile',score:{domicile:7,exterieur:0}},
 {id:'5',minute:1,seconde:88,type:'but',texte:'Trois points.',cote:'exterieur',points:3,score:{domicile:7,exterieur:3}},
];
const e={id:'ligue',clubs:[{id:'A',compteId:'a',nom:'Club A'},{id:'B',compteId:'b',nom:'Club B'},{id:'C',compteId:'c',nom:'Club C'}],rencontres:[{id:'match',domicile:'A',exterieur:'B',ouvre:new Date(now-10000000).toISOString(),ferme:new Date(now-90000).toISOString(),match:{id:'match',debut:now-90000,gel:0,horloge:1.5,fil,score:{domicile:7,exterieur:3},termine:false}}]} as unknown as EtatCarriereEnLigne;
e.phase='saison';
assert.equal(prochainReveilMatch(e,now),Math.ceil((now+15000)/15000)*15000);
assert.equal(prochainReveilMatch({...e,phase:'salon'},now),null);
const futur=structuredClone(e);delete futur.rencontres[0].match;futur.rencontres[0].ouvre=new Date(now+600000).toISOString();futur.rencontres[0].ferme=new Date(now+1200000).toISOString();
assert.equal(prochainReveilMatch(futur,now),now+600000);
assert.equal(prochainReveilMatch(futur,now+600001),now+1080000);
assert.equal(prochaineEcheanceMatch(futur,now),now+600000);
assert.equal(prochaineEcheanceMatch({...futur,phase:'salon'},now),null);
const moments=momentsDepuisFil('match',fil);
assert.deepEqual(moments,momentsDepuisFil('match',fil));
assert.deepEqual(moments[1].score,{domicile:7,exterieur:0});
assert.equal(moments[1].seconde,75);
assert.notEqual(moments[0].id,momentsDepuisFil('autre',fil)[0].id);
const alertes=alertesMatchs(e,now);
assert.equal(alertes.length,6);
assert.ok(alertes.some(a=>a.titre==='Transformation réussie'));
assert.ok(alertes.some(a=>a.titre==='Trois points !'));
assert.ok(alertes.every(a=>a.comptes.join(',')==='a,b'));
assert.equal(alertesMatchs(e,now+300000).length,0);
e.rencontres[0].match!.decision={cote:'domicile',distance:30,angle:0,probabilite:.8,buteur:'Martin',horloge:1.5,aPortee:true,jusqua:now+10000};
assert.deepEqual(alertesMatchs(e,now).find(a=>a.titre==='À toi de décider')?.comptes,['a']);
assert.ok(!alertesMatchs(e,now+10001).some(a=>a.titre==='À toi de décider'));
delete e.rencontres[0].match!.decision;
const abonnement={endpoint:'https://fcm.googleapis.com/fcm/send/test',keys:{p256dh:'B'+'a'.repeat(86),auth:'a'.repeat(22)}};
assert.deepEqual(validerAbonnement(abonnement),abonnement);
for(const endpoint of ['https://localhost/push','http://fcm.googleapis.com/x','https://fcm.googleapis.com.evil.example/x','https://fcm.googleapis.com:8443/x','https://user@fcm.googleapis.com/x'])assert.throws(()=>validerAbonnement({...abonnement,endpoint}));
assert.throws(()=>validerAbonnement({...abonnement,keys:{p256dh:'x',auth:'y'}}));
const base:BasePush={abonnements:[],envois:{}};const stockage=pushLocal(base,()=>{});
await stockage.enregistrer({id:'terminal',compte:'a',ligue:'ligue',cree:now-100000,abonnement});
await stockage.enregistrer({id:'spectateur',compte:'c',ligue:'ligue',cree:now-100000,abonnement});
const cles=webpush.generateVAPIDKeys();process.env.WEB_PUSH_PUBLIC_KEY=cles.publicKey;process.env.WEB_PUSH_PRIVATE_KEY=cles.privateKey;process.env.WEB_PUSH_SUBJECT='https://example.com';
const original=webpush.sendNotification;let envoyes=0;let echouer=false;let statut=503;
webpush.sendNotification=(async()=>{if(echouer)throw {statusCode:statut};envoyes++;return {statusCode:201,body:'',headers:{}};}) as typeof original;
try{
 await Promise.all([notifierMatchs(stockage,e,now),notifierMatchs(stockage,e,now)]);
 assert.equal(envoyes,6,'Une livraison par événement malgré deux appels concurrents');
 await notifierMatchs(stockage,e,now);assert.equal(envoyes,6);
 await stockage.enregistrer({id:'nouveau',compte:'a',ligue:'ligue',cree:now+1,abonnement});
 await notifierMatchs(stockage,e,now+2);assert.equal(envoyes,6,'Ne pas envoyer les anciens événements à un nouvel abonnement');
 await stockage.enregistrer({id:'retry',compte:'a',ligue:'ligue',cree:now-100000,abonnement});
 echouer=true;await notifierMatchs(stockage,e,now);echouer=false;await notifierMatchs(stockage,e,now+5000);assert.equal(envoyes,12,'Retenter après erreur transitoire');
 await stockage.enregistrer({id:'expire',compte:'a',ligue:'ligue',cree:now-100000,abonnement});
 echouer=true;statut=410;await notifierMatchs(stockage,e,now);assert.ok(!base.abonnements.some(a=>a.id==='expire'));echouer=false;
}finally{webpush.sendNotification=original;}
const dossier=mkdtempSync(join(tmpdir(),'destiny-push-'));
try{
 const db=stockageFichier(join(dossier,'base.json'));
 const id='a0000000-0000-4000-8000-000000000001',compte='a0000000-0000-4000-8000-000000000002';
 await db.creerCompte({id:compte,identifiant:'testpush',pseudo:'Test',empreinte:'unused'});
 await db.ouvrirSession(empreinteJeton('jeton-test'),compte,Date.now()+60000);
 let etat=creerCarriere({id,nom:'Test push',code:'DR-PUSH',compteId:compte,pseudo:'Test',clubNom:'Test RFC',rythme:1,maxClubs:2},now,'push-test');
 etat=agirCarriere(etat,'b0000000-0000-4000-8000-000000000002',{type:'rejoindre',pseudo:'Adversaire',clubNom:'Adversaire RFC'},now,'push-adversaire');
 etat=agirCarriere(etat,compte,{type:'demarrerSaison'},now,'push-saison');
 await db.creerLigue({id,code:'DR-PUSH',version:0,comptes:[compte],etat});
 const api=creerGestionnaireCarriere(db);
 async function appel(body:object,auth=true,origin='http://localhost'){
   let status=200;let donnees:any;
   const res={status(n:number){status=n;return res;},setHeader(){},json(x:unknown){donnees=x;}};
   await api.handler({method:'POST',url:'/api/carriere',headers:{host:'localhost',origin,'content-type':'application/json',cookie:auth?'destiny_carriere=jeton-test':''},body},res);
   return {status,donnees};
 }
 async function lire(url:string){
   let status=200;let donnees:any;
   const res={status(n:number){status=n;return res;},setHeader(){},json(x:unknown){donnees=x;}};
   await api.handler({method:'GET',url,headers:{host:'localhost',origin:'http://localhost',cookie:'destiny_carriere=jeton-test'}},res);
   return {status,donnees};
 }
 const delta=await lire(`/api/carriere?ligue=${id}&direct=${encodeURIComponent(etat.rencontres[0].id)}`);
 assert.equal(delta.status,200);
 assert.equal(delta.donnees.rencontre.id,etat.rencontres[0].id);
 assert.equal(delta.donnees.clubs,undefined,'Le direct ne doit pas renvoyer la ligue complète');
 assert.equal((await appel({action:'push',operation:'activer',ligue:id,abonnement},false)).status,401);
 assert.equal((await appel({action:'push',operation:'activer',ligue:id,abonnement},true,'https://evil.example')).status,403);
 assert.equal((await appel({action:'push',operation:'activer',ligue:'b0000000-0000-4000-8000-000000000001',abonnement})).status,404);
 assert.equal((await appel({action:'push',operation:'activer',ligue:id,abonnement})).status,200);
 assert.equal((await appel({action:'push',operation:'etat',ligue:id,abonnement})).donnees.actif,true);
 assert.equal((await appel({action:'push',operation:'supprimer',ligue:id,endpoint:abonnement.endpoint})).status,200);
 assert.equal((await appel({action:'push',operation:'etat',ligue:id,abonnement})).donnees.actif,false);
}finally{rmSync(dossier,{recursive:true,force:true});}
console.log('OK — événements, scores, secondes, destinataires, expiration, concurrence, reprise, endpoint, session, origine, appartenance et désactivation.');

process.exit(0);
