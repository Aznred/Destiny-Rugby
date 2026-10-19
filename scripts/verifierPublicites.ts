import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, unlinkSync, readFileSync } from 'node:fs';
import { stockageFichier } from '../serveur/carriereFichier';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { parametresCallbackAppLixir, resumeCallback, creerServicePublicites } from '../serveur/publicitesRecompensees';
import { contexteAtelier, validerConfigPublicites } from '../serveur/atelierAdmin';
import { CATALOGUE_ADMIN_VIDE } from '../src/lib/ligue/atelierCatalogue';
import { PUBLICITES_PAR_DEFAUT, chancesPacksPub, choisirPackPub, jourPublicites } from '../src/lib/publicitesRecompensees';
import { PACKS_CARRIERE } from '../src/lib/ligue/catalogueCarriere';
import { packAvecSkin, vignettePackPublicitaire } from '../src/lib/presentationPacks';
import { existsSync } from 'node:fs';
import { creerCarriere, agirCarriere, vueCarriere } from '../src/lib/ligue/carriere';
import type { EtatBoutiqueCompte } from '../src/lib/boutiqueCompte';

let controles=0;
const egal=(a:unknown,b:unknown,message:string) => { assert.deepEqual(a,b,message); controles++; console.log(`✓ ${message}`); };
const ok=(a:unknown,message:string) => { assert.ok(a,message); controles++; console.log(`✓ ${message}`); };
const maintenant=Date.now(), fichier=`node_modules/.tmp/publicites-${randomUUID()}.json`;
mkdirSync('node_modules/.tmp',{recursive:true});
const secretAvant=process.env.APPLIXIR_CALLBACK_SECRET;
process.env.APPLIXIR_CALLBACK_SECRET=`banc-${randomUUID()}`;
const key=PUBLICITES_PAR_DEFAUT.apiKey, config={...PUBLICITES_PAR_DEFAUT};
let db=stockageFichier(fichier), api=creerGestionnaireCarriere(db);
const joueur=randomUUID(), autre=randomUUID(), kiri=randomUUID();
const coffre=():EtatBoutiqueCompte => ({ovas:50,achatsOvas:0,collectionSolo:{quantites:{},packsOuverts:{},doublons:0,revision:0},
  inventaire:[],skinActif:'cuir',equipements:[],equipementActif:{},traitsDebloques:[]});
async function appel(jeton:string,chemin:string,body?:object) {
  let statut=200,donnees:any;
  const res={status(n:number){statut=n;return res;},setHeader(){},json(x:unknown){donnees=x;}};
  await api.handler({method:body?'POST':'GET',url:`/api/carriere${chemin}`,headers:{host:'localhost',origin:'http://localhost',
    'content-type':'application/json',cookie:jeton?`destiny_carriere=${jeton}`:''},body},res);
  return {statut,donnees};
}
const action=(jeton:string,operation:string,plus:object={}) => appel(jeton,'?publicites=1',{action:'publicites',operation,...plus});
const commencer=(contexte:string,ligue?:string) => action('joueur','commencer',{contexte,ligue});
function signature(id:string,tid=randomUUID(),plus:Record<string,string>={}) {
  const q=new URLSearchParams({gameApiKey:key,gameId:'123',userId:id,tid,...plus});
  q.set('signature',createHash('md5').update(q.get('gameApiKey')!+q.get('gameId')!+q.get('userId')!+tid+process.env.APPLIXIR_CALLBACK_SECRET!).digest('hex'));
  return q;
}
const callback=(q:URLSearchParams) => appel('',`?applixirCallback=1&${q}`);
try {
  for (const [id,identifiant,pseudo,jeton] of [[joueur,'joueur','Alice','joueur'],[autre,'autre','kiri','autre'],[kiri,'kiri','Admin','kiri']]) {
    await db.creerCompte({id,identifiant,pseudo,empreinte:'x'});
    await db.ouvrirSession(empreinteJeton(jeton),id,maintenant+3600000); await db.sauvegarderBoutique(id,coffre());
  }
  const sansCompte = await appel('','?publicites=1'); if(sansCompte.statut!==401) console.log('Diagnostic API',sansCompte);
  egal(sansCompte.statut,401,'compte authentifié obligatoire');
  egal((await appel('autre','?atelier=1&section=publicites')).statut,404,'le pseudo Kiri ne donne pas accès au Labo');
  const labo = await appel('kiri','?atelier=1&section=publicites');
  egal(labo.statut,200,'Labo AppLixir accessible à l’identité Kiri');
  ok(labo.donnees.packs.some((p:any)=>p.id==='top14' && p.rewardedAdsEnabled),'Top 14 disponible dans la roulette avec son poids du Labo');
  ok(labo.donnees.packs.every((p:any)=>['bronze','standard','or','elite'].includes(p.id) || packAvecSkin(p)), 'seuls les packs de base et les pochettes dédiées sont proposés');
  ok(labo.donnees.packs.filter((p:any)=>p.id.startsWith('womens:')).length>=10,'tous les championnats féminins accessibles');
  ok(['pub-mythique','evenement-halloween-2026','evenement-octobre-rose-2026'].every(id=>labo.donnees.packs.some((p:any)=>p.id===id)), 'packs Mythique et saisonniers dans le Labo');
  ok(labo.donnees.packs.every((p:any)=>existsSync('public'+vignettePackPublicitaire(p))), 'chaque pack a sa texture réelle de roulette');
  ok(!labo.donnees.packs.some((p:any)=>p.id==='pub-icons' || p.evenement?.type==='influencer' || p.evenement?.type==='icon'),'ICON et Créateurs retirés de la roulette');
  const chancesLabo=chancesPacksPub(labo.donnees.packs,maintenant);
  ok(Math.abs(chancesLabo.find(c=>c.pack.id==='bronze')!.chance-25)<1e-9,'Bronze à 25 % dans le catalogue complet');
  ok(Math.abs(chancesLabo.find(c=>c.pack.id==='standard')!.chance-20)<1e-9,'Argent à 20 % dans le catalogue complet');
  ok(Math.abs(chancesLabo.find(c=>c.pack.id==='or')!.chance-10)<1e-9,'Or garanti à 10 %');
  const avecPoids=chancesPacksPub(labo.donnees.packs.map((p:any)=>({...p,rewardedAdWeight:1})),maintenant);
  ok(Math.abs(avecPoids[0].chance-100/avecPoids.length)<1e-9,'les poids personnalisés du Labo remplacent la répartition initiale');

  // 15 octobre 2026 : une publicité préparée puis laissée en plan (onglet fermé, autre offre) ne bloque ni ne compte.
  const abandonnee=await commencer('SHOP_OVAS'); egal(abandonnee.statut,200,'session Ovas préparée');
  egal((await appel('joueur','?publicites=1')).donnees.ovasRestantes,2,'une publicité préparée mais pas lancée ne prend pas de place dans le plafond');
  await action('joueur','evenement',{rewardSessionId:abandonnee.donnees.rewardSessionId,evenement:'STARTED'});
  egal((await appel('joueur','?publicites=1')).donnees.ovasRestantes,1,'une vidéo lancée réserve sa place le temps du reçu');
  const premiere=await commencer('SHOP_OVAS'); egal(premiere.statut,200,'une publicité laissée en plan ne bloque plus la suivante');
  const id=premiere.donnees.rewardSessionId;
  egal((await appel('joueur','?publicites=1')).donnees.ovasRestantes,2,'la publicité abandonnée est close : elle ne compte plus');
  egal((await action('joueur','reclamer',{rewardSessionId:abandonnee.donnees.rewardSessionId})).donnees.statut,'PENDING','une publicité abandonnée ne rapporte rien');
  egal((await db.boutique(joueur))!.ovas,50,'aucun gain au clic');
  egal((await action('joueur','reclamer',{rewardSessionId:id,videoComplete:true,montant:10000})).donnees.statut,'PENDING','une fausse complétion client ne récompense pas');
  egal((await action('autre','reclamer',{rewardSessionId:id})).statut,400,'session privée, inaccessible à un autre compte');
  egal((await action('joueur','evenement',{rewardSessionId:id,evenement:'COMPLETE'})).statut,400,'aucun événement client ne valide une vidéo');
  egal((await action('joueur','evenement',{rewardSessionId:id,evenement:'WATCHED'})).statut,200,'complétion locale conservée pour la reprise');
  egal((await action('joueur','reclamer',{rewardSessionId:id})).donnees.statut,'PENDING','WATCHED seul ne crédite aucun gain');
  egal((await appel('joueur','?publicites=1')).donnees.aVerifier.map((s:any)=>s.rewardSessionId),[id],'récompense à vérifier retrouvée après rechargement');
  egal((await commencer('SHOP_OVAS')).statut,200,'une vidéo terminée qui attend son reçu ne bloque pas une nouvelle publicité');
  egal((await appel('joueur','?publicites=1')).donnees.aVerifier.map((s:any)=>s.rewardSessionId),[id],'et elle n’est pas close : son reçu peut encore arriver');
  const q=signature(id), fausse=new URLSearchParams(q); fausse.set('signature','0'.repeat(32));
  egal((await callback(fausse)).statut,403,'signature falsifiée refusée');
  const autreId=new URLSearchParams(q); autreId.set('userId',randomUUID());
  egal((await callback(autreId)).statut,403,'le userId signé est la session, contexte non falsifiable');
  const unsigned=new URLSearchParams(q); unsigned.delete('tid');
  egal((await callback(unsigned)).statut,403,'TID obligatoire');
  egal((await callback(q)).statut,200,'callback signé valide la vidéo');
  egal((await callback(q)).statut,200,'callback rejoué accepté sans doubler le crédit');
  egal((await db.boutique(joueur))!.ovas,50,'le callback valide, la réclamation crédite');
  const deux=await Promise.all([action('joueur','reclamer',{rewardSessionId:id}),action('joueur','reclamer',{rewardSessionId:id})]);
  egal(deux.map(r=>r.donnees.statut).sort(),['ALREADY_CLAIMED','CLAIMED'],'deux réclamations simultanées, un seul crédit');
  egal((await db.boutique(joueur))!.ovas,54,'montant serveur configuré, 4 Ovas');
  egal((await db.boutique(joueur))!.achatsOvas,4,'registre serveur conservé contre une ancienne sauvegarde');

  const seconde=(await commencer('SHOP_OVAS')).donnees, q2=signature(seconde.rewardSessionId);
  const reuse=signature(seconde.rewardSessionId,q.get('tid')!);
  egal((await callback(reuse)).statut,403,'TID réutilisé dans une autre session refusé');
  await callback(q2); await action('joueur','reclamer',{rewardSessionId:seconde.rewardSessionId});
  egal((await commencer('SHOP_OVAS')).statut,400,'plafond Ovas journalier contrôlé par le serveur');
  await db.sauvegarderBoutique(joueur,coffre());
  egal((await db.boutique(joueur))!.ovas,58,'ancienne sauvegarde, crédits serveur préservés');
  const echouee=await action('autre','commencer',{contexte:'SHOP_OVAS'});
  await action('autre','evenement',{rewardSessionId:echouee.donnees.rewardSessionId,evenement:'NO_FILL'});
  egal((await action('autre','reclamer',{rewardSessionId:echouee.donnees.rewardSessionId})).donnees.statut,'PENDING','no-fill, aucune récompense');
  egal((await callback(signature(echouee.donnees.rewardSessionId))).statut,200,'reçu signé retardé accepté après un no-fill local');
  egal((await action('autre','reclamer',{rewardSessionId:echouee.donnees.rewardSessionId})).donnees.statut,'CLAIMED','récompense retardée récupérable une seule fois');
  const annulee=await action('autre','commencer',{contexte:'SHOP_OVAS'});
  await action('autre','evenement',{rewardSessionId:annulee.donnees.rewardSessionId,evenement:'CLOSED'});
  const derniere=await action('autre','commencer',{contexte:'SHOP_OVAS'});
  const callbacksRetardes=await Promise.all([callback(signature(derniere.donnees.rewardSessionId)),callback(signature(annulee.donnees.rewardSessionId))]);
  egal(callbacksRetardes.map(r=>r.statut).sort(),[200,403],'callbacks concurrents et retardés soumis au plafond quotidien');
  const sansAnnonce=await action('kiri','commencer',{contexte:'SHOP_OVAS'});
  egal(sansAnnonce.statut,200,'session sans annonce créée');
  egal((await action('kiri','evenement',{rewardSessionId:sansAnnonce.donnees.rewardSessionId,evenement:'NO_FILL'})).statut,200,'absence d’annonce enregistrée');
  egal((await db.publicites!.statistiques()).noFill,1,'absence d’annonce comptée avant redémarrage');

  const ligue=randomUUID();
  let etat=creerCarriere({id:ligue,code:'PUBBANC',nom:'Banc Publicités',compteId:joueur,pseudo:'Alice',clubNom:'Club Test',maxClubs:2,rythme:3,
    packsGratuitsParJour:0,packsActifs:['bronze','standard','or'],doublonsAutorises:false},maintenant,'graine-pub');
  etat=agirCarriere(etat,autre,{type:'rejoindre',pseudo:'Bob',clubNom:'Club Autre'},maintenant,'graine-join');
  await db.creerLigue({id:ligue,code:'PUBBANC',version:etat.version,comptes:[joueur,autre],etat});
  const chancesLigue=(await appel('joueur',`?publicites=1&ligue=${ligue}`)).donnees.chances;
  ok(chancesLigue.some((c:any)=>c.pack.id.startsWith('womens:')) && chancesLigue.some((c:any)=>c.pack.id==='elite') && !chancesLigue.some((c:any)=>['avants','premium','grand'].includes(c.pack.id)),'packs féminins et Élite obtenables ; pochettes génériques retirées');
  ok(Math.abs(chancesLigue.find((c:any)=>c.pack.id==='bronze').chance-25)<1e-9 && Math.abs(chancesLigue.find((c:any)=>c.pack.id==='standard').chance-20)<1e-9,'25 % / 20 % conservés après filtrage du stock de la ligue');
  const avant=etat.cartes.length;
  const packSession=(await commencer('DAILY_PACK',ligue)).donnees;
  await callback(signature(packSession.rewardSessionId));
  ok((await db.ligue(ligue))!.etat.packsPubReserves?.[packSession.rewardSessionId]?.cartes.length,'contenu réservé dès le callback, avant toute réclamation client');
  const reclame=await action('joueur','reclamer',{rewardSessionId:packSession.rewardSessionId});
  egal(reclame.donnees.statut,'RESERVED','pack choisi côté serveur avant la roulette');
  const reserve=(await db.ligue(ligue))!;
  egal(reserve.etat.cartes.length,avant,'cartes privées avant ouverture');
  ok(reserve.etat.packsPubReserves?.[packSession.rewardSessionId]?.cartes.length,'contenu du pack réellement réservé');
  ok(!('packsPubReserves' in vueCarriere(reserve.etat,joueur)),'aucun contenu de pack réservé dans la vue publique');
  const cartesReservees=reserve.etat.packsPubReserves![packSession.rewardSessionId].cartes.map(c=>c.id);
  const commande=(jeton:string,session:string,plus:object={}) => appel(jeton,'',{action:'commande',ligue,requeteId:randomUUID(),commande:{type:'ouvrirPackPub',rewardSessionId:session,...plus}});
  egal((await commande('autre',packSession.rewardSessionId)).statut,400,'un autre compte ne peut pas voler le pack');
  db=stockageFichier(fichier); api=creerGestionnaireCarriere(db);
  const recuperee=await appel('joueur',`?publicites=1&ligue=${ligue}`);
  ok(recuperee.donnees.enAttente.some((r:any)=>r.rewardSessionId===packSession.rewardSessionId),'pack récupérable après redémarrage du serveur');
  const ouvert=await commande('joueur',packSession.rewardSessionId,{packId:'elite',cartes:['faux']});
  egal(ouvert.statut,200,'ouverture normale après la roulette');
  const ajoutees=(await db.ligue(ligue))!.etat.cartes.slice(avant);
  egal(ajoutees.map(c=>c.id),cartesReservees,'seul le contenu réservé est délivré');
  const rejoue=await commande('joueur',packSession.rewardSessionId);
  egal(rejoue.statut,200,'réponse perdue, ouverture idempotente avec un nouvel identifiant de requête client');
  egal((await db.ligue(ligue))!.etat.cartes.length,avant+ajoutees.length,'pack jamais dupliqué');
  const pack2=(await commencer('DAILY_PACK',ligue)).donnees; await callback(signature(pack2.rewardSessionId));
  egal((await commencer('DAILY_PACK',ligue)).statut,400,'deux packs maximum pour le compte');
  const ligue2=randomUUID();
  await db.creerLigue({id:ligue2,code:'PUBBANC2',version:etat.version,comptes:[joueur,autre],etat:{...etat,id:ligue2,code:'PUBBANC2'}});
  egal((await commencer('DAILY_PACK',ligue2)).statut,400,'changer de ligue ne contourne pas les deux packs quotidiens');
  egal((await db.publicites!.statistiques()).packsEarned,2,'statistiques serveur des packs gagnés');
  const stats=await db.publicites!.statistiques();
  egal(stats.completed,6,'complétions signées, y compris retardées, sans doublon'); egal(stats.ovasRewarded,12,'Ovas réellement attribués'); egal(stats.noFill,1,'no-fill comptabilisé seulement sans reçu signé');
  egal(Object.values(stats.distribution).reduce((a,b)=>a+b,0),2,'distribution cumulée exacte');
  ok(Math.abs(Object.values(stats.distributionAttendue ?? {}).reduce((a,b)=>a+b,0)-2)<1e-9,'théorie cumulée depuis les vraies probabilités de chaque tirage');
  const schema=readFileSync('serveur/schema-publicites.sql','utf8');
  ok(schema.includes('pg_advisory_xact_lock')&&schema.includes('achatsOvas')&&schema.includes('pub_transactions'),'SQL : verrou, crédit et reçu dans une seule transaction');

  const bronze={...PACKS_CARRIERE.find(p=>p.id==='bronze')!,rewardedAdsEnabled:true,rewardedAdWeight:3};
  const argent={...PACKS_CARRIERE.find(p=>p.id==='standard')!,rewardedAdsEnabled:true,rewardedAdWeight:1};
  const eligibles=chancesPacksPub([bronze,argent,{...bronze,id:'non-publie',published:false},
    {...bronze,id:'termine',endsAt:'2020-01-01T00:00:00Z'}, {...bronze,id:'futur',startsAt:'2099-01-01T00:00:00Z'},
    {...bronze,id:'sans-poids',rewardedAdWeight:0}, {...bronze,id:'influencer',evenement:{id:'influencer',type:'influencer',actif:false,cartes:3}}],maintenant);
  egal(eligibles.map(c=>c.chance),[75,25],'poids convertis en probabilités, actifs uniquement');
  egal(choisirPackPub(eligibles,.74999).id,'bronze','borne basse correcte'); egal(choisirPackPub(eligibles,.75).id,'standard','frontière exacte du tirage');
  egal(jourPublicites(Date.parse('2026-10-11T21:59:59Z')),'2026-10-11','jour français avant minuit');
  egal(jourPublicites(Date.parse('2026-10-11T22:00:00Z')),'2026-10-12','reset à minuit Paris, pas UTC ni localStorage');
  assert.throws(()=>validerConfigPublicites({...config,packsDailyLimit:3})); controles++;
  const service=creerServicePublicites(db.publicites!);
  const lendemain=maintenant+86400000;
  const nouvelle=await contexteAtelier.run(CATALOGUE_ADMIN_VIDE,()=>service.commencer(joueur,'SHOP_OVAS',[],undefined,lendemain));
  ok(nouvelle.rewardSessionId,'reset quotidien effectif côté backend');
  await assert.rejects(()=>service.callback(signature(nouvelle.rewardSessionId),lendemain+16*60000)); controles++;
  egal((await db.boutique(joueur))!.ovas,58,'session expirée ne récompense jamais');
  // ═══ LE CALLBACK TEL QU'UN FOURNISSEUR PEUT L'ENVOYER (12 octobre 2026) ════════════════════════════════════════
  // Signalé : « on ne récupère pas la récompense quand on regarde la vidéo en entier ». L'adresse enregistrée chez
  // AppLixir contient déjà un « ? » : collée naïvement, la requête devient « ?applixirCallback=1?gameApiKey=… » et
  // n'était pas reconnue (401 « Connectez-vous… », mesuré sur le site public).
  const brut = async (methode: string, url: string, headers: Record<string, string> = { host: 'localhost' }, body?: unknown) => {
    let statut = 200, donnees: any;
    const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(x: unknown) { donnees = x; } };
    await api.handler({ method: methode, url, headers, body }, res);
    return { statut, donnees };
  };
  const comptes: string[] = [];
  for (let i = 0; i < 4; i++) {
    const idCompte = randomUUID(); comptes.push(`s2s-${i}`);
    await db.creerCompte({ id: idCompte, identifiant: `s2s-${i}`, pseudo: `S2S ${i}`, empreinte: 'x' });
    await db.ouvrirSession(empreinteJeton(`s2s-${i}`), idCompte, maintenant + 3600000); await db.sauvegarderBoutique(idCompte, coffre());
  }
  const ouvrir = async (jeton: string) => (await action(jeton, 'commencer', { contexte: 'SHOP_OVAS' })).donnees.rewardSessionId as string;
  const statutDe = async (jeton: string, idSession: string) => (await action(jeton, 'reclamer', { rewardSessionId: idSession })).donnees.statut;
  const silence = { info: console.info, warn: console.warn }; const journal: string[] = [];
  console.info = (...x: unknown[]) => { journal.push(x.join(' ')); }; console.warn = (...x: unknown[]) => { journal.push(x.join(' ')); };
  try {
    // 1. Le second « ? » : la forme qui recevait un 401.
    const colle = await ouvrir(comptes[0]);
    egal((await brut('GET', `/api/carriere?applixirCallback=1?${signature(colle)}`)).statut, 200, 'paramètres collés avec un second « ? » : callback reconnu et accepté');
    egal(await statutDe(comptes[0], colle), 'CLAIMED', 'et la récompense est créditée');
    // 2. L'adresse propre, sans « ? ».
    const propre = await ouvrir(comptes[0]);
    egal((await brut('GET', `/api/applixir?${signature(propre)}`)).statut, 200, 'adresse /api/applixir : callback accepté');
    egal(await statutDe(comptes[0], propre), 'CLAIMED', 'récompense créditée par l’adresse propre');
    // 3. Une signature en majuscules, et le secret que le fournisseur joint à sa requête.
    const majuscules = await ouvrir(comptes[1]); const qMaj = signature(majuscules); qMaj.set('signature', qMaj.get('signature')!.toUpperCase()); qMaj.set('secretKey', 'jamais-dans-un-journal');
    egal((await brut('GET', `/api/carriere?applixirCallback=1&${qMaj}`)).statut, 200, 'signature en majuscules acceptée');
    // 4. Un POST de serveur à serveur : ni JSON, ni origine, paramètres dans le corps.
    const poste = await ouvrir(comptes[1]);
    egal((await brut('POST', '/api/applixir', { host: 'localhost', 'content-type': 'application/x-www-form-urlencoded' }, String(signature(poste)))).statut, 200, 'POST de serveur à serveur accepté (corps de formulaire)');
    egal(await statutDe(comptes[1], poste), 'CLAIMED', 'récompense créditée par le POST');
    // 5. Un reçu REFUSÉ laisse une trace : on saura qu'il est arrivé, et pourquoi il n'a rien donné.
    // Les reçus falsifiés du début du banc ont déjà laissé leur trace : on compte ce que CETTE section ajoute.
    const refusAvant = (await db.publicites!.refus!()).total;
    const refusee = await ouvrir(comptes[2]); const qFaux = signature(refusee); qFaux.set('signature', 'f'.repeat(32));
    egal((await brut('GET', `/api/carriere?applixirCallback=1?${qFaux}`)).statut, 403, 'un reçu mal signé reste refusé, quelle que soit sa forme');
    egal(await statutDe(comptes[2], refusee), 'PENDING', 'et ne crédite rien');
    const trace = (await db.publicites!.trouver(refusee))!.callback;
    ok(trace && trace.refus === 'signature' && trace.n === 1, 'le refus est noté sur la session : date, raison');
    const autreCle = signature(refusee); autreCle.set('gameApiKey', 'une-autre-cle');
    autreCle.set('signature', createHash('md5').update('une-autre-cle' + '123' + refusee + autreCle.get('tid') + process.env.APPLIXIR_CALLBACK_SECRET!).digest('hex'));
    egal((await brut('GET', `/api/applixir?${autreCle}`)).statut, 403, 'un reçu signé pour une autre clé d’API est refusé');
    egal((await db.publicites!.trouver(refusee))!.callback, { le: (await db.publicites!.trouver(refusee))!.callback!.le, refus: 'cle', n: 2 }, 'la raison distingue une mauvaise clé d’une mauvaise signature');
    const refus = await db.publicites!.refus!();
    ok(refus.total === refusAvant + 2 && refus.derniers[0].refus === 'cle', 'le Labo retrouve les derniers refus, le plus récent en tête');
    ok(refus.derniers.every((r) => Object.keys(r).sort().join() === 'le,refus,videoTerminee'), 'sans compte, sans session, sans signature');
    const laboPub = await appel('kiri', '?atelier=1&section=publicites');
    ok(laboPub.statut === 200 && laboPub.donnees.refus?.total === refusAvant + 2, 'ils arrivent avec les statistiques du Labo');
    // 6. Le journal du serveur : la forme et la raison, jamais le secret ni la signature.
    ok(journal.some((l) => l.includes('callback accepté') && l.includes('second « ? »')), 'le journal dit qu’un callback collé a été accepté');
    ok(journal.some((l) => l.includes('callback refusé') && l.includes('"raison":"signature"')), 'et pourquoi un autre a été refusé');
    ok(!journal.some((l) => l.includes('jamais-dans-un-journal') || l.includes(process.env.APPLIXIR_CALLBACK_SECRET!) || /[a-f0-9]{32}/i.test(l)), 'ni secret ni signature dans le journal');
    egal(resumeCallback(qMaj).parametres.includes('secretKey'), false, 'le secret joint à la requête n’est pas même nommé');
    // 7. Ce qui n'est pas un callback ne le devient pas.
    egal(parametresCallbackAppLixir(new URL('http://x/api/carriere?publicites=1')), null, 'une requête ordinaire n’est pas un callback');
    egal(parametresCallbackAppLixir(new URL('http://x/api/carriere?applixirCallback=2')), null, 'ni une autre valeur du drapeau');
    egal((await brut('GET', '/api/carriere?applixirCallback=2&gameApiKey=x')).statut, 401, 'elle suit le chemin ordinaire');
    egal(parametresCallbackAppLixir(new URL('http://x/api/carriere?applixirCallback=1?gameApiKey=abc&tid=7'))!.get('gameApiKey'), 'abc', 'le premier paramètre collé est retrouvé');
    egal(parametresCallbackAppLixir(new URL('http://x/api/applixir/'), { userId: 'u', tid: 3 })!.get('tid'), '3', 'le corps JSON complète la requête');
    egal((await brut('POST', '/api/carriere?publicites=1', { host: 'localhost', 'content-type': 'text/plain' }, {})).statut, 415, 'la protection d’origine des autres routes n’a pas bougé');
  } finally { console.info = silence.info; console.warn = silence.warn; }
  console.log(`\n${controles} contrôles publicités validés.`);
} finally {
  if(secretAvant===undefined) delete process.env.APPLIXIR_CALLBACK_SECRET; else process.env.APPLIXIR_CALLBACK_SECRET=secretAvant;
  try { unlinkSync(fichier); } catch { /* fichier absent */ }
}
