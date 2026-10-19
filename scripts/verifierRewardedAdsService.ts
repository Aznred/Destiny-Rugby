import assert from 'node:assert/strict';
import { PUBLICITES_PAR_DEFAUT } from '../src/lib/publicitesRecompensees';
import { appelerPublicites, RewardedAdsService, type SessionNavigateurPub } from '../src/lib/rewardedAdsService';

let scripts=0,lecteurs=0,pauses=0,reprises=0,nettoyages=0, chargementEchoue=true;
let options: Parameters<NonNullable<Window['initializeAndOpenPlayer']>>[0];
const fenetre: Partial<Window> = {};
const sdk: NonNullable<Window['initializeAndOpenPlayer']> = o=>{lecteurs++;options=o;};
const scriptsPresents: EventTarget[]=[];
const conteneur={id:'applixir-ad-container',contains:()=>false,querySelectorAll:()=>[],replaceChildren:()=>{nettoyages++;}};
const audio={paused:false,isConnected:true,pause:()=>{pauses++;},play:async()=>{reprises++;}};
Object.defineProperty(globalThis,'window',{value:fenetre,configurable:true});
Object.defineProperty(globalThis,'document',{value:{
  querySelector:()=>scriptsPresents[0],createElement:()=>Object.assign(new EventTarget(),{remove:()=>scriptsPresents.splice(0,1)}),
  head:{appendChild:(s:EventTarget)=>{scripts++;scriptsPresents.push(s);queueMicrotask(()=>{if(chargementEchoue) { chargementEchoue=false;s.dispatchEvent(new Event('error')); } else { fenetre.initializeAndOpenPlayer=sdk;s.dispatchEvent(new Event('load')); }});}},
  getElementById:()=>conteneur,querySelectorAll:()=>[audio],
},configurable:true});
const evenements: string[]=[];
Object.defineProperty(globalThis,'fetch',{value:async (_url:unknown,init:RequestInit)=>{
  evenements.push(JSON.parse(String(init.body)).evenement);
  return new Response('{"ok":true}',{status:200});
},configurable:true});
await assert.rejects(RewardedAdsService.initialize(PUBLICITES_PAR_DEFAUT),'chargement SDK échoué signalé');
await Promise.all([RewardedAdsService.initialize(PUBLICITES_PAR_DEFAUT),RewardedAdsService.initialize(PUBLICITES_PAR_DEFAUT)]);
await RewardedAdsService.initialize(PUBLICITES_PAR_DEFAUT);
assert.equal(scripts,2,'SDK retenté après échec puis partagé entre demandes simultanées');
assert.equal(lecteurs,0,'initialiser ne lance ni lecteur ni publicité');
const session:SessionNavigateurPub={rewardSessionId:'a'.repeat(36),contexte:'DAILY_PACK',rewardStatus:'REQUESTED',montant:0,apiKey:PUBLICITES_PAR_DEFAUT.apiKey,mode:'TEST'};
let p=RewardedAdsService.showRewardedAd('DAILY_PACK',session);
assert.equal(options!.userId,session.rewardSessionId,'identité signée de la session transmise au fournisseur');
await assert.rejects(RewardedAdsService.showRewardedAd('DAILY_PACK',session),'second lecteur simultané refusé');
options!.adStatusCallbackFn({type:'allAdsCompleted'});assert.equal(nettoyages,0,'allAdsCompleted ne détruit pas le SDK pendant son callback');
options!.adStatusCallbackFn({type:'thankYouModalClosed'});assert.equal(await p,false,'allAdsCompleted seul ne récompense jamais');
p=RewardedAdsService.showRewardedAd('DAILY_PACK',session);options!.adStatusCallbackFn({type:'skipped'});options!.adStatusCallbackFn({type:'adSkippedNoReward'});assert.equal(await p,false);
p=RewardedAdsService.showRewardedAd('DAILY_PACK',session);options!.adErrorCallbackFn({getError:()=>({data:{errorCode:303}})});assert.equal(await p,false);
p=RewardedAdsService.showRewardedAd('DAILY_PACK',session);RewardedAdsService.cancel();assert.equal(await p,false);
p=RewardedAdsService.showRewardedAd('DAILY_PACK',session);options!.adStatusCallbackFn({type:'start'});options!.adStatusCallbackFn({type:'complete'});options!.adStatusCallbackFn({type:'allAdsCompleted'});
assert.equal(nettoyages,4,'lecteur conservé pendant l’envoi du reçu fournisseur');
options!.adStatusCallbackFn({type:'thankYouModalClosed'});assert.equal(nettoyages,4,'nettoyage différé après le dernier callback SDK');
assert.equal(RewardedAdsService.isAvailable(),false,'pas de second lecteur avant la résolution et la fermeture du portail');
assert.equal(await p,true);
fenetre.initializeAndOpenPlayer=()=>Promise.reject(new Error('initialisation distante refusée'));
p=RewardedAdsService.showRewardedAd('DAILY_PACK',session);assert.equal(await p,false,'rejet asynchrone SDK ferme et libère la tentative');
fenetre.initializeAndOpenPlayer=sdk;
p=RewardedAdsService.showRewardedAd('DAILY_PACK',session);
options!.adStatusCallbackFn({type:'allAdsCompleted'});options!.adStatusCallbackFn({type:'complete'});options!.adStatusCallbackFn({type:'thankYouModalClosed'});
assert.equal(await p,true,'complétion tardive dans le même cycle reconnue');
assert.equal(nettoyages,7,'player vidé à chaque fin');assert.equal(pauses,7);assert.equal(reprises,7,'audio repris à chaque fin');
assert.deepEqual(evenements,['NO_FILL','CLOSED','NO_FILL','CLOSED','STARTED','WATCHED','FAILED','WATCHED'],'WATCHED est un suivi local et jamais une validation de récompense');
assert.equal(RewardedAdsService.isAvailable(),true,'aucun lecteur ou verrou conservé');
const suivante = { ...session, rewardSessionId: 'b'.repeat(36) };
p = RewardedAdsService.showRewardedAd('DAILY_PACK', suivante);
RewardedAdsService.cancel(session.rewardSessionId);
assert.equal(RewardedAdsService.isAvailable(),false,'le démontage d’un ancien lecteur ne ferme pas une nouvelle session');
const mediaDefectueux = { pause: () => { throw new Error('média détaché'); } };
Object.assign(conteneur, { querySelectorAll: () => [mediaDefectueux] });
Object.assign(audio, { play: () => { throw new Error('lecture refusée'); } });
options!.adStatusCallbackFn({ type: 'complete' });
options!.adStatusCallbackFn({ type: 'thankYouModalClosed' });
assert.equal(await p, true, 'une erreur de nettoyage ou de reprise audio ne bloque pas la fin');
assert.equal(RewardedAdsService.isAvailable(),true);
// Une requête sans réponse se termine et rend la main à l'offre.
const temporiser = globalThis.setTimeout;
globalThis.setTimeout = ((f: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) =>
  temporiser(f, ms === 15000 ? 5 : ms, ...args)) as typeof setTimeout;
Object.defineProperty(globalThis,'fetch',{value:async (_url:unknown, init:RequestInit) => new Promise((_res, rej) => {
  init.signal?.addEventListener('abort', () => rej(init.signal?.reason), { once: true });
}),configurable:true});
try { await assert.rejects(appelerPublicites(), /connexion a pris trop de temps/); }
finally { globalThis.setTimeout = temporiser; }
console.log('Service SDK validé : relance du chargement, start IMA, cycle complet, reçu avant nettoyage, rejet asynchrone et complétion tardive.');
