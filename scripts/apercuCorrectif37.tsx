import { createRoot } from 'react-dom/client';
import {createPortal} from 'react-dom';
import { useEffect, useState } from 'react';
import { MatchLive } from '../src/components/MatchLive';
import { ChoixMatchEquipe } from '../src/components/match/ChoixMatchEquipe';
import { useGame } from '../src/store/useGame';
import { compositionManagerParDefaut } from '../src/lib/compositionManager';
import { effectifDuClub } from '../src/lib/effectif';
import { installerSituationCombinaison } from '../src/lib/moteur/moteur';
import type { EtatMatch } from '../src/lib/moteur/etat';
import type { PilotageDirect } from '../src/lib/controleDirect/pilotage';
import { REGLAGES_EQUIPE, type ReglagesEquipe } from '../src/lib/moteur/equipeSolo';
import { retenirPreferencesTele } from '../src/lib/match3D';
import { ecrirePreferencesControle } from '../src/lib/controleDirect/prefs';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import '../src/index.css';
import '../src/App.css';
chargerTextes(TEXTES);
useGame.persist.setOptions({storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}});
useGame.getState().creerManager({nom:'Aperçu contrôle collectif',nation:'France',club:'Stade Toulousain',age:40,libre:true});
useGame.setState({iaActivee:false});
ecrirePreferencesControle({tutorielVu:true,tutosResp:['penalite','tir','engagement','touche','drop']});
retenirPreferencesTele({presentation:false,ralentis:false});
window.requestAnimationFrame=cb=>window.setTimeout(()=>cb(performance.now()),16);
window.cancelAnimationFrame=id=>window.clearTimeout(id);
const composition=compositionManagerParDefaut(effectifDuClub('Stade Toulousain',1));
const adresse=new URLSearchParams(location.search);
export function ApercuEquipe() {
  const [mode,setMode]=useState<'equipe'|'coach'|null>(null);
  const [reglages,setReglages]=useState<ReglagesEquipe>({...REGLAGES_EQUIPE});
  useEffect(()=>{
    if (!mode) return;
    let installe=false;
    const minuteur=window.setInterval(()=>{
      const live=(globalThis as {__matchLive?:{e:EtatMatch;pilotage:PilotageDirect}}).__matchLive;
      if (!live || installe || (mode==='equipe'&&!live.pilotage.actif)) return;
      if (adresse.get('tactile')==='1') { live.pilotage.tactile.actif=performance.now(); live.pilotage.appareil='tactile'; }
      const situation=adresse.get('situation');
      if (situation==='ruck'||situation==='melee'||situation==='touche') {
        live.e.responsabilites!.attente=null;live.e.vol=null;live.e.tir=null;delete live.e.piedPrepare;
        live.e.sim=20;
        installerSituationCombinaison(live.e,situation,{x:adresse.get('zone')==='ligne'?105:61,y:35});
        if(situation==='ruck') live.e.rng=()=>0.93; // Exercice de distribution, le duel conserve le ballon.
      }
      installe=true;
    },150);
    return ()=>window.clearInterval(minuteur);
  },[mode]);
  return mode ? <><MatchLive match={{domicile:'Stade Toulousain',exterieur:'RC Toulon',scoreD:0,scoreE:0,essaisD:0,essaisE:0}} saison={1} cle="apercu37" titre="Carrière entraîneur · contrôle collectif" manager={{club:'Stade Toulousain',modeControle:mode,reglagesControle:reglages,composition,tactique:useGame.getState().manager!.tactique,onTactique:()=>{}}} onFermer={()=>setMode(null)}/>{adresse.has('tournage')&&<Enregistreur/>}</>
    : <ChoixMatchEquipe surFermer={()=>{}} surChoisir={(m,r)=>{setReglages(r);setMode(m);}}/>;
}
/** Outil de tournage de l'aperçu : le canevas réel est enregistré, jamais une scène inventée. */
function Enregistreur() {
  const [etat,setEtat]=useState('prêt'),[fichier,setFichier]=useState('');
  const [cible,setCible]=useState<HTMLElement|null>(null);
  useEffect(()=>{const id=setInterval(()=>{const element=document.querySelector<HTMLElement>('[role="dialog"]');if(element){setCible(element);clearInterval(id);}},150);return()=>clearInterval(id);},[]);
  const enregistrer=()=>{
    const toile=document.querySelector<HTMLCanvasElement>('canvas');
    if(!toile){setEtat('Scène en chargement');return;}
    const flux=toile.captureStream(30);const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
    const recorder=new MediaRecorder(flux,{mimeType:mime,videoBitsPerSecond:12_000_000});const morceaux:Blob[]=[];
    recorder.ondataavailable=e=>{if(e.data.size)morceaux.push(e.data);};
    recorder.onstop=()=>{setFichier(URL.createObjectURL(new Blob(morceaux,{type:'video/webm'})));setEtat('terminé');flux.getTracks().forEach(t=>t.stop());};
    recorder.start();setEtat('capture en cours');setTimeout(()=>recorder.stop(),9000);
  };
  const rejouer=()=>{
    const live=(globalThis as {__matchLive?:{e:EtatMatch;pilotage:PilotageDirect}}).__matchLive;
    if (!live) return;
    live.e.responsabilites!.attente=null;live.e.vol=null;live.e.tir=null;delete live.e.piedPrepare;delete live.e.controleEquipe?.sortie;
    installerSituationCombinaison(live.e,'ruck',{x:61,y:35});live.e.rng=()=>0.93;
    if(adresse.get('tactile')==='1'){live.pilotage.appareil='tactile';live.pilotage.tactile.actif=performance.now();}
  };
  const balayer=()=>{
    const zone=document.querySelector<HTMLElement>('.cd-zone-gestes');if(!zone)return;
    const r=zone.getBoundingClientRect(), x=r.x+r.width*.25,y=r.y+r.height*.5;
    zone.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:37,pointerType:'touch',clientX:x,clientY:y}));
    zone.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:37,pointerType:'touch',clientX:x+90,clientY:y}));
  };
  return cible ? createPortal(<div style={{position:'fixed',bottom:12,right:12,zIndex:100000,background:'#101c16',padding:12,border:'1px solid #d8b65c'}}>
    <button className="btn petit" onClick={rejouer}>Rejouer le ruck</button>
    {adresse.get('tactile')==='1'&&<button className="btn petit" onClick={balayer}>Tester le balayage →</button>}
    <button className="btn petit" disabled={etat==='capture en cours'} onClick={enregistrer}>Capturer 9 secondes</button><span style={{marginLeft:12}}>{etat}</span>
    {fichier&&<a style={{marginLeft:12}} href={fichier} download={`manager-${adresse.get('plan')??'terrain'}.webm`}>Télécharger la séquence</a>}
  </div>,cible) : null;
}
createRoot(document.getElementById('root')!).render(<ApercuEquipe/>);
