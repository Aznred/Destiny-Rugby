import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { stockageFichier } from '../serveur/carriereFichier';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { contexteAtelier, validerPhoto } from '../serveur/atelierAdmin';
import { CATALOGUE_ADMIN_VIDE } from '../src/lib/ligue/atelierCatalogue';
import { catalogueMondialCarriere, rayonDePack, packsBoutiqueDuJour } from '../src/lib/ligue/catalogueCarriere';
import { creerCarriere, avancerCarriere, agirCarriere } from '../src/lib/ligue/carriere';
import { collectionCarriere } from '../src/lib/ligue/collectionCarriere';

const dossier=mkdtempSync(join(tmpdir(),'destiny-atelier-'));
try {
  const fichier=join(dossier,'base.json'),db=stockageFichier(fichier),kiri=randomUUID(),autre=randomUUID();
  for(const [id,identifiant] of [[kiri,'kiri'],[autre,'autre']]) {
    await db.creerCompte({id,identifiant,pseudo:identifiant==='autre'?'kiri':'Kiri',empreinte:'test'});
    await db.ouvrirSession(empreinteJeton(id),id,Date.now()+60000);
  }
  const api=creerGestionnaireCarriere(db);
  async function appel(compte:string,body?:unknown,origin='http://localhost') {
    let statut=200; let donnees:any;
    const res={status(n:number){statut=n;return res;},setHeader(){},json(d:unknown){donnees=d;}};
    await api.handler({method:body?'POST':'GET',url:'/api/carriere?atelier=1',headers:{host:'localhost',origin,'content-type':'application/json',cookie:compte?`destiny_carriere=${compte}`:''},body},res);
    return {statut,donnees};
  }
  assert.equal((await appel('')).statut,401);
  assert.equal((await appel(autre)).statut,404,'Le pseudo Kiri ne donne pas accès');
  assert.equal((await appel(autre,{action:'atelier',operation:'pack'})).statut,404);
  assert.equal((await appel(kiri,{action:'atelier'},'https://evil.example')).statut,403);
  const initial=await appel(kiri);assert.equal(initial.statut,200);assert.ok(initial.donnees.joueurs.length<=40);assert.ok(initial.donnees.nations.includes('France'));
  const now=Date.now();
  const ligue=()=>creerCarriere({id:randomUUID(),nom:'Test atelier',code:'TEST',compteId:kiri,pseudo:'Kiri',clubNom:'Kiri RFC',rythme:1,maxClubs:2},now,'atelier');
  const l1=ligue(),l2=ligue(),joueur=l1.cartes[0];
  for(const l of [l1,l2]) await db.creerLigue({id:l.id,code:l.id,version:0,comptes:[kiri],etat:l});
  async function lireLigue(id:string,version?:number) {
    let donnees:any;let statut=200;const res={status(n:number){statut=n;return res;},setHeader(){},json(d:unknown){donnees=d;}};
    await api.handler({method:'GET',url:`/api/carriere?ligue=${id}${version ? '&v='+version : ''}`,headers:{host:'localhost',cookie:`destiny_carriere=${kiri}`}},res);
    assert.equal(statut,200);return donnees;
  }
  const chaude=await lireLigue(l1.id);
  const avant=structuredClone(joueur);
  const nationInitiale=joueur.nation,nationCible=initial.donnees.nations.find((n:string)=>n!==nationInitiale) as string;
  const edition={action:'atelier',operation:'joueur',revision:0,sourceId:joueur.sourceId,joueur:{note:94,potentiel:96,photo:'https://example.org/photo.webp',nation:nationCible}};
  assert.equal((await appel(kiri,{...edition,joueur:{...edition.joueur,note:101}})).statut,400);
  assert.equal((await appel(kiri,edition)).statut,200);
  assert.equal((await appel(kiri,edition)).statut,400,'Révision périmée refusée');
  assert.throws(()=>validerPhoto('javascript:alert(1)'));
  assert.throws(()=>validerPhoto('data:image/svg+xml;base64,PHN2Zz4='));
  assert.throws(()=>validerPhoto('/photos/../../.env'));
  const miseAJour=await lireLigue(l1.id,chaude.version);
  assert.equal(miseAJour.cartes.find((c:any)=>c.sourceId===joueur.sourceId).note,94,'La lecture conditionnelle ne masque pas une édition globale');
  assert.equal((await lireLigue(l2.id)).cartes.find((c:any)=>c.sourceId===joueur.sourceId).note,94);
  const config=await db.atelier!.lire();
  assert.equal(stockageFichier(fichier) && (await stockageFichier(fichier).atelier!.lire()).revision,1,'Persistance après redémarrage');
  contexteAtelier.run(config,()=>{
    const nouveau=catalogueMondialCarriere().find(c=>c.sourceId===joueur.sourceId)!;
    assert.equal(nouveau.note,94);assert.equal(nouveau.rarete,'star');
    for(const l of [l1,l2]) {
      const resultat=avancerCarriere(l,now,'test');const carte=resultat.cartes.find(c=>c.sourceId===joueur.sourceId)!;
      assert.equal(carte.note,94);assert.equal(carte.photo,edition.joueur.photo);assert.equal(carte.nation,nationCible);assert.equal(carte.proprietaire,l.clubs[0].id);assert.equal(carte.matchs,avant.matchs);
      assert.equal(resultat.catalogueRevision,1);
    }
    assert.ok(rayonDePack('star',{id:'test'}).some(c=>c.sourceId===joueur.sourceId));
    assert.ok(!rayonDePack('bronze',{id:'test'}).some(c=>c.sourceId===joueur.sourceId));
    assert.ok(rayonDePack('star',{id:'nation-cible',filtre:{nations:[nationCible]}}).some(c=>c.sourceId===joueur.sourceId));
    assert.ok(!rayonDePack('star',{id:'nation-initiale',filtre:{nations:[nationInitiale]}}).some(c=>c.sourceId===joueur.sourceId));
    const page=collectionCarriere(l1,kiri,new URLSearchParams({q:joueur.nom}));
    assert.ok(JSON.stringify(page).includes('https://example.org/photo.webp'));
  });
  assert.equal(catalogueMondialCarriere().find(c=>c.sourceId===joueur.sourceId)!.note,avant.note,'Aucun état global modifié hors contexte');
  await Promise.all([contexteAtelier.run(config,async()=>{await Promise.resolve();assert.equal(catalogueMondialCarriere().find(c=>c.sourceId===joueur.sourceId)!.note,94);}),contexteAtelier.run(CATALOGUE_ADMIN_VIDE,async()=>{await Promise.resolve();assert.equal(catalogueMondialCarriere().find(c=>c.sourceId===joueur.sourceId)!.note,avant.note);})]);
  const pack={id:'kiri-test',nom:'Test garanti',prix:1,cartes:2,garantie:'star',probabilites:{bronze:100,argent:0,or:0,elite:0,star:0}};
  const commande={action:'atelier',operation:'pack',revision:1,pack};
  assert.equal((await appel(kiri,{...commande,pack:{...pack,probabilites:{...pack.probabilites,bronze:50}}})).statut,400);
  assert.equal((await appel(kiri,commande)).statut,200);
  const packFrance={...pack,id:'kiri-france',nom:'France uniquement',garantie:undefined,probabilites:{bronze:100,argent:0,or:0,elite:0,star:0},filtre:{nations:['France']}};
  assert.equal((await appel(kiri,{action:'atelier',operation:'pack',revision:2,pack:packFrance})).statut,200);
  const final=await db.atelier!.lire();
  contexteAtelier.run(final,()=>{
    const l=avancerCarriere(l1,now,'test');
    assert.ok(packsBoutiqueDuJour(l.packs).some(p=>p.id===pack.id),'Pack Kiri visible tous les jours');
    const resultat=agirCarriere(l,kiri,{type:'ouvrirPack',packId:pack.id},now,'test-garantie');
    const cartes=resultat.cartes.slice(l.cartes.length);
    assert.equal(cartes.length,2);assert.ok(cartes.some(c=>c.rarete==='star'),'La garantie fonctionne même avec un poids nul');
    assert.equal(resultat.clubs[0].ovas,l.clubs[0].ovas-1);
    assert.ok(ligue().packs.some(p=>p.id===pack.id),'Les nouvelles ligues héritent aussi du pack');
    const filtreNation=final.packs[packFrance.id];
    for(const rarete of ['bronze','argent','or','elite','star'] as const) assert.ok(rayonDePack(rarete,filtreNation).every(c=>c.nation==='France'),'Le filtre nation exclut les autres nations');
  });
  console.log('OK — accès Kiri, validations, conflit, persistance, GEN, photos et nation sur deux ligues, filtres nation, collection, raretés, contextes concurrents, boutique et garantie.');
} finally { rmSync(dossier,{recursive:true,force:true}); }
process.exit(0);
