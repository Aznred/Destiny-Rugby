// Banc Vite local uniquement. Aucun appel à AppLixir ni crédit d'un vrai compte.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { OffrePublicitaire } from '../src/components/PublicitesRecompensees';
import { LaboPublicites } from '../src/components/LaboPublicites';
import { RewardedAdsService, type SessionNavigateurPub } from '../src/lib/rewardedAdsService';
import { PUBLICITES_PAR_DEFAUT, PACK_MYTHIQUE_PUBLICITAIRE, STATS_PUB_VIDES, chancesPacksPub, type RecompensePub } from '../src/lib/publicitesRecompensees';
import { PACKS_CARRIERE } from '../src/lib/ligue/catalogueCarriere';
import { PACK_HALLOWEEN, PACK_OCTOBRE_ROSE } from '../src/lib/ligue/cartesSpeciales';
import { CHAMPIONNATS_FEMININS } from '../src/data/mondeFeminin.generated';
import '../src/index.css';
import '../src/App.css';
import '../src/components/AtelierKiri.css';

if (!import.meta.env.DEV) throw new Error('Banc réservé au développement.');
// Le banc montre les pochettes avec un inventaire simulé, sans construire le vivier des joueurs.
const feminins = CHAMPIONNATS_FEMININS.filter(c=>c.nom !== 'Élite 2 Féminine').map(c=>({
  ...PACKS_CARRIERE.find(p=>p.id==='standard')!, id:'womens:'+c.nom.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),
  nom:c.nom === 'Élite 1 Féminine' ? 'Élite 1 et 2 Féminines' : c.nom, prix:700,cartes:3,
}));
const packs = [...PACKS_CARRIERE,...feminins,PACK_MYTHIQUE_PUBLICITAIRE,
  {...PACK_HALLOWEEN,evenement:{id:'halloween-2026',type:'halloween',actif:true,cartes:3}},
  {...PACK_OCTOBRE_ROSE,evenement:{id:'octobre-rose-2026',type:'octobre-rose',actif:true,cartes:3}},
].map(p=>({...p,rewardedAdsEnabled:true}));
const chances = chancesPacksPub(packs,Date.now());
const sessions = new Map<string,RecompensePub>();
let utilisations=0, demarrages=0, appels=0;
let resultat: 'complete' | 'no-fill' | 'skipped' | 'error' = 'complete';
let dernieresOptions: Parameters<NonNullable<Window['initializeAndOpenPlayer']>>[0];
window.initializeAndOpenPlayer = options => {
  dernieresOptions=options; demarrages++;
  const conteneur=document.getElementById(options.injectionElementId)!;
  const texte=document.createElement('p'); texte.textContent='SIMULATION LOCALE · aucune annonce réelle'; conteneur.appendChild(texte);
  const bouton=document.createElement('button'); bouton.className='btn primaire'; bouton.textContent='Terminer le scénario simulé';
  bouton.onclick=()=> {
    if(resultat==='complete') {
      const session=sessions.get(options.userId)!; session.rewardStatus='RESERVED'; session.pack=packs.find(p=>p.id==='top14')!; utilisations++;
      options.adStatusCallbackFn({type:'complete'}); options.adStatusCallbackFn({type:'allAdsCompleted'}); options.adStatusCallbackFn({type:'thankYouModalClosed'});
    } else if(resultat==='no-fill') { options.adStatusCallbackFn({type:'allAdsCompleted'}); options.adStatusCallbackFn({type:'thankYouModalClosed'}); }
    else if(resultat==='error') options.adErrorCallbackFn({getError:()=>({data:{errorCode:303}})});
    else { options.adStatusCallbackFn({type:'skipped'}); options.adStatusCallbackFn({type:'adSkippedNoReward'}); }
  };
  conteneur.appendChild(bouton); options.adStatusCallbackFn({type:'start'});
};
window.fetch = async (_url,options) => {
  appels++;
  const url=String(_url), body=options?.body ? JSON.parse(String(options.body)) : null;
  let donnees: unknown;
  if(url.includes('atelier')) donnees={revision:0,config:{...PUBLICITES_PAR_DEFAUT,mode:'LIVE'},modeEffectif:'TEST',raisonMode:'Le mode Test reste actif jusqu’à l’approbation du site par AppLixir et l’activation du Live sur le serveur.',callbackConfigure:true,packs,statistiques:STATS_PUB_VIDES()};
  else if(!body) donnees={config:PUBLICITES_PAR_DEFAUT,disponible:true,jour:'2026-10-11',ovasRestantes:2,packsRestants:Math.max(0,2-utilisations),chances,
    enAttente:[...sessions.values()].filter(s=>s.rewardStatus==='RESERVED')};
  else if(body.operation==='commencer') {
    const session:SessionNavigateurPub={rewardSessionId:crypto.randomUUID(),contexte:body.contexte,ligue:body.ligue,rewardStatus:'REQUESTED',montant:0,apiKey:PUBLICITES_PAR_DEFAUT.apiKey,mode:'TEST'};
    sessions.set(session.rewardSessionId,session); donnees=session;
  } else if(body.operation==='reclamer') {
    const s=sessions.get(body.rewardSessionId)!; donnees={statut:s.rewardStatus==='RESERVED'?'RESERVED':'PENDING',recompense:s};
  } else donnees={ok:true};
  return new Response(JSON.stringify(donnees),{status:200,headers:{'Content-Type':'application/json'}});
};
export function Banc() {
  const [scenario,setScenario]=useState(resultat), [labo,setLabo]=useState(false), [message,setMessage]=useState(''),[verification,setVerification]=useState('');
  const verifier=async()=> {
    const avant=demarrages; await Promise.all([RewardedAdsService.initialize(PUBLICITES_PAR_DEFAUT),RewardedAdsService.initialize(PUBLICITES_PAR_DEFAUT)]);
    const auto=demarrages===avant;
    const s:SessionNavigateurPub={rewardSessionId:crypto.randomUUID(),contexte:'DAILY_PACK',rewardStatus:'REQUESTED',montant:0,apiKey:PUBLICITES_PAR_DEFAUT.apiKey,mode:'TEST'};
    const conteneur=document.createElement('div');conteneur.id='applixir-ad-container';document.body.appendChild(conteneur);
    const tous=RewardedAdsService.showRewardedAd('DAILY_PACK',s); dernieresOptions.adStatusCallbackFn({type:'allAdsCompleted'}); dernieresOptions.adStatusCallbackFn({type:'thankYouModalClosed'}); const sans=!(await tous);
    const abandon=RewardedAdsService.showRewardedAd('DAILY_PACK',s); dernieresOptions.adStatusCallbackFn({type:'skipped'}); dernieresOptions.adStatusCallbackFn({type:'adSkippedNoReward'}); const ferme=!(await abandon);
    const erreur=RewardedAdsService.showRewardedAd('DAILY_PACK',s); dernieresOptions.adErrorCallbackFn({getError:()=>({data:{errorCode:303}})}); const nofill=!(await erreur);
    const fin=RewardedAdsService.showRewardedAd('DAILY_PACK',s); dernieresOptions.adStatusCallbackFn({type:'complete'}); dernieresOptions.adStatusCallbackFn({type:'allAdsCompleted'}); dernieresOptions.adStatusCallbackFn({type:'thankYouModalClosed'}); const complet=await fin;
    const propre=conteneur.childElementCount===0 && RewardedAdsService.isAvailable();conteneur.remove();
    setVerification([auto,sans,ferme,nofill,complet,propre].every(Boolean)?'6 contrôles SDK validés : volontaire, no-fill, fermeture, erreur, complétion et nettoyage.':'Échec des contrôles SDK');
  };
  return <main style={{maxWidth:1150,margin:'40px auto',padding:20}}><span className="eyebrow">Banc de vérification local</span><h1>Publicités récompensées</h1>
    <p>Annonce et serveur simulés pour vérifier l’interface. Aucun gain sur un compte réel.</p>
    <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>{(['complete','no-fill','skipped','error'] as const).map(s=><button className="btn fantome" aria-pressed={scenario===s} key={s} onClick={()=>{resultat=s;setScenario(s);}}>{s}</button>)}
      <button className="btn fantome" onClick={()=>setLabo(!labo)}>{labo?'Fermer le Labo':'Voir le Labo'}</button><button className="btn fantome" onClick={()=>void verifier()}>Vérifier le service SDK</button></div>
    <p role="status">{verification || message}</p><small>Requêtes simulées : {appels} · Lecteurs démarrés : {demarrages}</small>
    {labo ? <LaboPublicites /> : <OffrePublicitaire contexte="DAILY_PACK" ligue="banc-local" onPack={async id=>{sessions.get(id)!.rewardStatus='CLAIMED';setMessage('Pack ouvert une fois dans le banc local.');}} />}
  </main>;
}
const racine = createRoot(document.getElementById('root')!);
racine.render(<Banc />);
import.meta.hot?.dispose(() => racine.unmount());
