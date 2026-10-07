import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { stockageFichier } from '../serveur/carriereFichier';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { contexteAtelier } from '../serveur/atelierAdmin';
import { clubParNom } from '../src/data/clubs';
import { derbyGeographique } from '../src/lib/donneesClubs';

const dossier=mkdtempSync(join(tmpdir(),'destiny-clubs27-'));
try {
  const db=stockageFichier(join(dossier,'base.json')), kiri=randomUUID(), autre=randomUUID();
  for(const [id,identifiant] of [[kiri,'kiri'],[autre,'lecteur']]){
    await db.creerCompte({id,identifiant,pseudo:identifiant,empreinte:'fixture'});
    await db.ouvrirSession(empreinteJeton(id),id,Date.now()+60000);
  }
  const api=creerGestionnaireCarriere(db);
  async function appel(token:string,url='/api/carriere?atelier=1&section=clubs',body?:unknown){
    let statut=200,donnees:any;const res={status(n:number){statut=n;return res;},setHeader(){},json(d:unknown){donnees=d;}};
    await api.handler({method:body?'POST':'GET',url,headers:{host:'localhost',origin:'http://localhost','content-type':'application/json',cookie:token?`destiny_carriere=${token}`:''},body},res);
    return{statut,donnees};
  }
  assert.equal((await appel('')).statut,401); assert.equal((await appel(autre)).statut,404);
  const vue=await appel(kiri);assert.equal(vue.statut,200);assert.ok(vue.donnees.clubs.length>1000);assert.ok(vue.donnees.clubs.some((c:any)=>c.alertes.length));
  const initial=vue.donnees.clubs.find((c:any)=>c.nom==='US Colomiers');
  const modification={action:'atelier',operation:'localisationClub',revision:0,club:initial.nom,
    localisation:{...initial,longitude:1.35,statutGeographique:'verifie'}};
  assert.equal((await appel(autre,undefined,modification)).statut,404);
  assert.equal((await appel(kiri,undefined,{...modification,localisation:{...modification.localisation,latitude:100}})).statut,400);
  assert.equal((await appel(kiri,undefined,modification)).statut,200);
  assert.equal((await appel(kiri,undefined,modification)).statut,400,'La révision périmée ne peut écraser une correction');
  const corrige=await appel(kiri);assert.equal(corrige.donnees.clubs.find((c:any)=>c.nom===initial.nom).longitude,1.35);
  assert.equal((await stockageFichier(join(dossier,'base.json')).atelier!.lire()).clubs![initial.nom].longitude,1.35);
  const publicSolo=await appel('','/api/carriere?catalogueSolo=1&revision=-1');assert.equal(publicSolo.statut,200);assert.equal(publicSolo.donnees.clubs[initial.nom].longitude,1.35);
  const rivalite={action:'atelier',operation:'rivaliteHistorique',revision:1,clubA:'Stade Toulousain',clubB:'Montpellier HR',source:'https://example.org/rivalite-test'};
  assert.equal((await appel(kiri,undefined,rivalite)).statut,200);
  const config=await db.atelier!.lire();contexteAtelier.run(config,()=>{
    assert.equal(clubParNom(initial.nom)!.longitude,1.35);
    assert.equal(derbyGeographique(rivalite.clubA,rivalite.clubB).type,'historique');
  });
  assert.equal((await appel(kiri,undefined,{...rivalite,revision:2,supprimer:true})).statut,200);
  assert.equal((await db.atelier!.lire()).rivalitesHistoriques!.length,0);
  console.log(`OK Labo clubs : ${vue.donnees.clubs.length} clubs, accès administrateur, validation, révision, persistance, catalogue solo et rivalités.`);
} finally {
  if(resolve(dossier).startsWith(resolve(tmpdir())+sep)) rmSync(dossier,{recursive:true,force:true});
}
