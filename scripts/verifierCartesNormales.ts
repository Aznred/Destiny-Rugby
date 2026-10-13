import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { stockageFichier } from '../serveur/carriereFichier';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { validerCarteNormale, validerDemandeCarte, carteNormaleVide, saisieDepuisSource } from '../src/lib/cartesNormales';
import { catalogueAvecCarteNormale } from '../serveur/cartesNormales';
import { catalogueMondialCarriere } from '../src/lib/ligue/catalogueCarriere';
import { contexteFfr } from '../serveur/ffr/contexte';
import type { DemandeCarte, SaisieCarteNormale } from '../src/lib/cartesNormales';
import type { SourceCarte } from '../src/lib/ligue/catalogueCarriere';

const dossier = mkdtempSync(join(tmpdir(),'destiny-cartes-normales-'));
const fichier = join(dossier,'base.json'), db = stockageFichier(fichier), kiri = randomUUID(), joueur = randomUUID(), autre = randomUUID();
for (const [id,identifiant] of [[kiri,'kiri'],[joueur,'proposant'],[autre,'autre']]) {
  await db.creerCompte({id,identifiant,pseudo:id===autre?'kiri':identifiant,empreinte:'test'});
  await db.ouvrirSession(empreinteJeton(id),id,Date.now()+600_000);
}
const api = creerGestionnaireCarriere(db);
let controles=0;
const eg = (a:unknown,b:unknown,raison:string) => {assert.deepEqual(a,b,raison);controles++;};
async function appel(compte:string,corps?:unknown,params='',origin='http://localhost') {
  let statut=200,donnees: any;
  const res = {status(n:number){statut=n;return res;},setHeader(){},json(d:unknown){donnees=d;}};
  const atelier = (corps as {operation?:string})?.operation === 'carteNormale';
  await api.handler({method:corps?'POST':'GET',url:atelier ? '/api/carriere?atelier=1' : `/api/carriere?demandesCartes=1${params}`,headers:{host:'localhost',origin,
    'content-type':'application/json',cookie:compte?`destiny_carriere=${compte}`:''},body:corps},res);
  return {statut,donnees};
}
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const carte: SaisieCarteNormale = {...carteNormaleVide(),nom:'Adrien Vérification',clubReel:'RC Vérification',championnat:'Top 14',note:71,potentiel:78,photo:PNG};
for (const mauvais of [{...carte,note:100},{...carte,age:17},{...carte,poste:'autre'},{...carte,potentiel:60},
  {...carte,photo:'javascript:alert(1)'},{...carte,photo:'data:image/svg+xml;base64,PHN2Zz4='},{...carte,photo:'/photos/../.env'}]) {
  assert.throws(()=>validerCarteNormale(mauvais));controles++;
}
assert.throws(()=>validerDemandeCarte({type:'correction',carte}));controles++;
eg((await appel('')).statut,401,'Une session est nécessaire');
eg((await appel(joueur,{action:'demandesCartes',operation:'modifier'})).statut,403,'Le pseudo ne donne aucun droit de décision');
eg((await appel(joueur,{action:'demandesCartes',operation:'soumettre',type:'creation',carte},'','https://evil.example')).statut,403,'Origine tierce refusée');
eg((await appel(joueur,{action:'demandesCartes',operation:'soumettre',type:'creation',carte,message:'Ma carte'})).statut,200,'Création proposée');
let vue = await appel(kiri), demande:DemandeCarte = vue.donnees.demandes[0];
eg(demande.carte.photo,undefined,'La liste ne transporte pas les portraits proposés');
eg((await appel(kiri,undefined,`&id=${demande.id}`)).donnees.demande.carte.photo,PNG,'Le détail interne contient la photo proposée');
eg((await appel(autre)).donnees.demandes.length,0,'Demandes privées');
eg((await appel(autre,undefined,`&id=${demande.id}`)).statut,404,'Détail privé');
eg((await db.atelier!.lire()).ajouts,undefined,'Aucune publication avant la décision');
const modifiee={...carte,note:75};
eg((await appel(kiri,{action:'demandesCartes',operation:'modifier',id:demande.id,revision:0,carte:modifiee})).statut,200,'Kiri modifie la proposition');
eg((await appel(kiri,{action:'demandesCartes',operation:'approuver',id:demande.id,revision:0,revisionCatalogue:0,carte})).statut,409,'Ancienne révision de demande refusée');
demande=(await appel(kiri,undefined,`&id=${demande.id}`)).donnees.demande;
const approbation={action:'demandesCartes',operation:'approuver',id:demande.id,revision:demande.revision,revisionCatalogue:0,carte:modifiee};
eg((await appel(autre,approbation)).statut,403,'Un autre compte ne peut pas approuver');
eg((await appel(kiri,approbation)).statut,200,'Approbation et publication');
eg((await appel(kiri,approbation)).statut,409,'Double approbation refusée');
let config=await db.atelier!.lire();
const sourceId=`normale-${demande.id}`;
eg(config.ajouts?.[sourceId].note,75,'Les modifications validées sont publiées');
eg(config.ajouts?.[sourceId].photo,PNG,'Le portrait validé accompagne la carte');
eg((await stockageFichier(fichier).atelier!.lire()).ajouts?.[sourceId].nom,carte.nom,'La carte survit au redémarrage');
eg((await appel(kiri,undefined,'&q=Adrien%20V%C3%A9rification')).donnees.cartes.some((c:SourceCarte)=>c.sourceId===sourceId),true,'La nouvelle carte entre dans le catalogue ordinaire');
eg((await appel(joueur)).donnees.demandes[0].statut,'acceptee','Le proposant voit la décision');

const source=(await appel(kiri,undefined,'&q=Adrien%20V%C3%A9rification')).donnees.cartes[0] as SourceCarte;
const correction={...saisieDepuisSource(source),poste:'arriere' as const,age:26,note:80,potentiel:85};
eg((await appel(joueur,{action:'demandesCartes',operation:'soumettre',type:'correction',sourceId,carte:correction})).statut,200,'Correction proposée');
vue=await appel(kiri);demande=vue.donnees.demandes.find((d:DemandeCarte)=>d.statut==='attente');
eg((await appel(kiri,{action:'demandesCartes',operation:'approuver',id:demande.id,revision:0,revisionCatalogue:0,carte:correction})).statut,409,'Ancienne révision du catalogue refusée');
eg((await appel(kiri,{action:'demandesCartes',operation:'approuver',id:demande.id,revision:0,revisionCatalogue:1,carte:correction})).statut,200,'Correction validée');
config=await db.atelier!.lire();
eg(Object.keys(config.ajouts!).length,1,'La correction conserve une seule identité');
eg(config.ajouts![sourceId].poste,'arriere','Poste corrigé');
const ffrOriginal={...source,sourceId:'ffr-test-source',editionManuelle:undefined};
const contexte={request:true,pool:'mixed' as const,joueurs:[ffrOriginal]};
const corrigee=contexteFfr.run(contexte,()=>catalogueAvecCarteNormale(config,ffrOriginal.sourceId,{...correction,nom:'FFR corrigé'}));
eg(contexteFfr.run(contexte,()=>catalogueMondialCarriere(corrigee).find(c=>c.sourceId===ffrOriginal.sourceId)?.nom),'FFR corrigé','La source FFR ne masque pas une correction manuelle');

await appel(joueur,{action:'demandesCartes',operation:'soumettre',type:'creation',carte:{...carte,nom:'Carte Refusée'}});
vue=await appel(kiri);demande=vue.donnees.demandes.find((d:DemandeCarte)=>d.statut==='attente');
eg((await appel(kiri,{action:'demandesCartes',operation:'refuser',id:demande.id,revision:0,reponse:'Informations à revoir'})).statut,200,'Refus possible');
eg((await db.atelier!.lire()).ajouts?.[`normale-${demande.id}`],undefined,'Un refus ne publie rien');
eg((await appel(joueur)).donnees.demandes.find((d:DemandeCarte)=>d.id===demande.id).reponse,'Informations à revoir','Motif visible par le proposant');

const creees=await Promise.all(Array.from({length:8},(_,i)=>db.demandesCartes!.creer(autre,randomUUID(),{type:'creation',carte:{...carte,nom:`Limite ${i}`},message:''})));
eg(creees.filter(Boolean).length,5,'Maximum de cinq propositions en attente');
const pleine=(await db.demandesCartes!.lister(null)).find(d=>d.statut==='attente')!;
const avant=await db.atelier!.lire(), nouv=catalogueAvecCarteNormale(avant,`normale-${pleine.id}`,pleine.carte);nouv.revision++;
eg(await db.demandesCartes!.approuver(pleine.id,pleine.revision,nouv,999,pleine.carte,'kiri'),false,'Le conflit du catalogue refuse toute publication');
eg((await db.demandesCartes!.lire(pleine.id,null))!.statut,'attente','L’approbation échouée reste en attente');
eg((await db.atelier!.lire()).revision,avant.revision,'Le conflit ne modifie pas le catalogue');
const nouvelleId=`normale-${randomUUID()}`;
const nouvelle={action:'atelier',operation:'carteNormale',revision:avant.revision,sourceId:nouvelleId,carte:{...carte,nom:'Claire Carte Normale',gender:'female'}};
eg((await appel(autre,nouvelle)).statut,404,'La création directe du Labo reste privée');
eg((await appel(kiri,nouvelle)).statut,200,'Kiri peut créer directement une carte normale');
eg((await appel(kiri,undefined,'&q=Claire Carte')).donnees.cartes.some((c:SourceCarte)=>c.sourceId===nouvelleId&&c.gender==='female'),true,'La nouvelle joueuse apparaît dans la recherche mixte');
eg((await appel(kiri,nouvelle)).statut,400,'Une ancienne révision ne crée pas de doublon');
console.log(`OK · ${controles} contrôles des cartes normales et des demandes. Base temporaire : ${dossier}`);
