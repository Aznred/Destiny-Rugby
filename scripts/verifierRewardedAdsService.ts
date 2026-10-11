import assert from 'node:assert/strict';
import { PUBLICITES_PAR_DEFAUT } from '../src/lib/publicitesRecompensees';
import { RewardedAdsService, type SessionNavigateurPub } from '../src/lib/rewardedAdsService';

let scripts=0,lecteurs=0,pauses=0,reprises=0,nettoyages=0;
let options: Parameters<NonNullable<Window['initializeAndOpenPlayer']>>[0];
const fenetre: Partial<Window> = {};
const sdk: NonNullable<Window['initializeAndOpenPlayer']> = o=>{lecteurs++;options=o;};
const scriptsPresents: EventTarget[]=[];
const conteneur={id:'applixir-ad-container',contains:()=>false,querySelectorAll:()=>[],replaceChildren:()=>{nettoyages++;}};
const audio={paused:false,isConnected:true,pause:()=>{pauses++;},play:async()=>{reprises++;}};
Object.defineProperty(globalThis,'window',{value:fenetre,configurable:true});
Object.defineProperty(globalThis,'document',{value:{
  querySelector:()=>scriptsPresents[0],createElement:()=>new EventTarget(),
  head:{appendChild:(s:EventTarget)=>{scripts++;scriptsPresents.push(s);queueMicrotask(()=>{fenetre.initializeAndOpenPlayer=sdk;s.dispatchEvent(new Event('load'));});}},
  getElementById:()=>conteneur,querySelectorAll:()=>[audio],
},configurable:true});
const evenements: string[]=[];
Object.defineProperty(globalThis,'fetch',{value:async (_url:unknown,init:RequestInit)=>{
  evenements.push(JSON.parse(String(init.body)).evenement);
  return new Response('{"ok":true}',{status:200});
},configurable:true});
await Promise.all([RewardedAdsService.initialize(PUBLICITES_PAR_DEFAUT),RewardedAdsService.initialize(PUBLICITES_PAR_DEFAUT)]);
await RewardedAdsService.initialize(PUBLICITES_PAR_DEFAUT);
assert.equal(scripts,1,'SDK chargé une seule fois, même entre demandes simultanées');
assert.equal(lecteurs,0,'initialiser ne lance ni lecteur ni publicité');
const session:SessionNavigateurPub={rewardSessionId:'a'.repeat(36),contexte:'DAILY_PACK',rewardStatus:'REQUESTED',montant:0,apiKey:PUBLICITES_PAR_DEFAUT.apiKey,mode:'TEST'};
let p=RewardedAdsService.showRewardedAd('DAILY_PACK',session);
assert.equal(options!.userId,session.rewardSessionId,'identité signée de la session transmise au fournisseur');
await assert.rejects(RewardedAdsService.showRewardedAd('DAILY_PACK',session),'second lecteur simultané refusé');
options!.adStatusCallbackFn({type:'allAdsCompleted'});assert.equal(await p,false,'allAdsCompleted seul ne récompense jamais');
p=RewardedAdsService.showRewardedAd('DAILY_PACK',session);options!.adStatusCallbackFn({type:'skipped'});assert.equal(await p,false);
p=RewardedAdsService.showRewardedAd('DAILY_PACK',session);options!.adErrorCallbackFn({getError:()=>({data:{errorCode:303}})});assert.equal(await p,false);
p=RewardedAdsService.showRewardedAd('DAILY_PACK',session);RewardedAdsService.cancel();assert.equal(await p,false);
p=RewardedAdsService.showRewardedAd('DAILY_PACK',session);options!.adStatusCallbackFn({type:'complete'});options!.adStatusCallbackFn({type:'allAdsCompleted'});assert.equal(await p,true);
assert.equal(nettoyages,5,'player vidé à chaque fin');assert.equal(pauses,5);assert.equal(reprises,5,'audio repris à chaque fin');
assert.deepEqual(evenements,['NO_FILL','CLOSED','NO_FILL','CLOSED'],'aucun événement client COMPLETE envoyé au serveur');
assert.equal(RewardedAdsService.isAvailable(),true,'aucun lecteur ou verrou conservé');
console.log('14 contrôles du service SDK validés : chargement unique, geste volontaire, statuts, verrou et nettoyage audio/player.');
