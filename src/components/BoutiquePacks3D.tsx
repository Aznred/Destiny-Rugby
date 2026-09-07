import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, MutableRefObject, CSSProperties } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { Box3, Group, Vector3 } from 'three';
import type { PackCarriere } from '../lib/ligue/typesCarriere';
import { modelePack, NOMS_PACK, apparencePack } from '../lib/presentationPacks';
import './BoutiquePacks3D.css';
const modulo = (n:number, max:number) => ((n % max) + max) % max;
const couleurs = {bronze:'#dca575',argent:'#dce5ef',or:'#ffd365',elite:'#69e7f5',star:'#ff4057'};
type Mouvement = {position:number;cible:number;pause:boolean;glisse:boolean;bloque:boolean;calme:boolean};
class Protection extends Component<{children:ReactNode; secours:ReactNode},{erreur:boolean}> {
  state={erreur:false}; static getDerivedStateFromError(){return {erreur:true};}
  render(){return this.state.erreur ? this.props.secours : this.props.children;}
}
function Pochette({pack,slot,mouvement,achat,surToucher}: {pack:PackCarriere;slot:number;mouvement:MutableRefObject<Mouvement>;achat:string|null;surToucher:(slot:number)=>void}) {
  const {scene}=useGLTF(modelePack(apparencePack(pack)));
  const ref=useRef<Group>(null);
  const etiquette=useRef<HTMLSpanElement>(null);
  const clone=useMemo(()=>{const obj=scene.clone(true);const box=new Box3().setFromObject(obj,true);const size=box.getSize(new Vector3());const center=box.getCenter(new Vector3());const scale=2.8/Math.max(size.x,size.y,size.z);const g=new Group();g.add(obj);g.scale.setScalar(scale);g.position.copy(center.multiplyScalar(-scale));return g;},[scene]);
  useFrame(({clock},dt)=>{if(!ref.current)return;const a=(slot-mouvement.current.position)*Math.PI*2/7;const devant=(Math.cos(a)+1)/2;ref.current.position.set(Math.sin(a)*5.2, (mouvement.current.calme?0:Math.sin(clock.elapsedTime*1.3+slot)*.045), Math.cos(a)*2.25-1.1);ref.current.rotation.set(0,-a*.35+(mouvement.current.calme?0:Math.sin(clock.elapsedTime*.7+slot)*.07),0);if(etiquette.current)etiquette.current.style.visibility=Math.cos(a)>.4?'visible':'hidden';const cible=achat===pack.id?1.35:.72+devant*.28;ref.current.scale.lerp(new Vector3(cible,cible,cible),1-Math.exp(-dt*9));});
  return <group ref={ref} onClick={e=>{e.stopPropagation();surToucher(slot);}}>
    <primitive object={clone}/>
    <Html position={[0,-1.7,0]} center zIndexRange={[10,0]} style={{pointerEvents:'none'}}><span ref={etiquette} className="bp3-etiquette"><b>{pack.nom}</b><small>{pack.prix.toLocaleString('fr-FR')} Ovas</small></span></Html>
  </group>;
}
function Couronne({packs,mouvement,achat,surToucher,onSelection}: {packs:PackCarriere[];mouvement:MutableRefObject<Mouvement>;achat:string|null;surToucher:(slot:number)=>void;onSelection:(n:number)=>void}) {
  const [centre,setCentre]=useState(0);
  const dernier=useRef(0);
  useFrame((_,delta)=>{const m=mouvement.current;const dt=Math.min(delta,.05);if(!m.pause&&!m.glisse&&!m.bloque&&!m.calme)m.cible+=dt*.16;m.position+=(m.cible-m.position)*(1-Math.exp(-dt*9));const prochain=Math.round(m.position);if(prochain!==dernier.current){dernier.current=prochain;setCentre(prochain);onSelection(modulo(prochain,packs.length));}});
  const slots=Array.from({length:Math.min(7,packs.length)},(_,i)=>centre+i-Math.floor(Math.min(7,packs.length)/2));
  return <>{slots.map(slot=><Suspense key={slot} fallback={null}><Pochette pack={packs[modulo(slot,packs.length)]} slot={slot} mouvement={mouvement} achat={achat} surToucher={surToucher}/></Suspense>)}<mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.82,-1.1]} scale={[1,.48,1]}><ringGeometry args={[4.9,4.93,96]}/><meshBasicMaterial color="#bdab68" transparent opacity={.25}/></mesh></>;
}
export default function BoutiquePacks3D({packs,solde,occupe,onOuvrir}: {packs:PackCarriere[];solde:number;occupe:boolean;onOuvrir:(id:string,nom:string)=>Promise<void>}) {
  const [selection,setSelection]=useState(0),[achat,setAchat]=useState<string|null>(null);
  const [message,setMessage]=useState('');
  const mouvement=useRef<Mouvement>({position:0,cible:0,pause:false,glisse:false,bloque:false,calme:window.matchMedia('(prefers-reduced-motion: reduce)').matches});
  const drag=useRef({x:0,depart:0,distance:0});const ignorer=useRef(0);const dernierTap=useRef({slot:Infinity,temps:0});const verrou=useRef(false);const vivant=useRef(true);
  useEffect(()=>{vivant.current=true;const media=window.matchMedia('(prefers-reduced-motion: reduce)');const change=()=>{mouvement.current.calme=media.matches;};media.addEventListener('change',change);return()=>{vivant.current=false;media.removeEventListener('change',change);};},[]);
  mouvement.current.bloque=occupe||achat!==null;
  const pack=packs[selection % packs.length];
  async function acheter(slot:number){const p=packs[modulo(slot,packs.length)];if(!p||occupe||verrou.current)return;if(solde<p.prix){setMessage(`Il te manque ${(p.prix-solde).toLocaleString('fr-FR')} Ovas.`);return;}verrou.current=true;setAchat(p.id);setMessage('Ouverture du pack…');mouvement.current.cible=slot;try{await new Promise(resolve=>window.setTimeout(resolve,mouvement.current.calme?0:380));if(vivant.current)await onOuvrir(p.id,p.nom);}finally{verrou.current=false;if(vivant.current){setAchat(null);setMessage('');}}}
  function toucher(slot:number){if(performance.now()<ignorer.current||drag.current.distance>6)return;setSelection(modulo(slot,packs.length));void acheter(slot);}

  if(!pack)return <p>Aucun pack disponible.</p>;
  return <section className="bp3" aria-label="Boutique des packs 3D" style={{'--bp3-color':couleurs[apparencePack(pack)]} as CSSProperties}>
    <div className="bp3-scene" tabIndex={0} role="group" aria-label="Présentoir circulaire. Glisser pour tourner, cliquer sur un pack pour acheter. Au clavier : flèches, puis une pression sur Entrée." onPointerEnter={()=>{mouvement.current.pause=true;}} onPointerLeave={()=>{mouvement.current.pause=false;}} onFocus={()=>{mouvement.current.pause=true;}} onBlur={()=>{mouvement.current.pause=false;}} onPointerDown={e=>{if(e.button!==0)return;drag.current={x:e.clientX,depart:mouvement.current.cible,distance:0};mouvement.current.glisse=true;}} onPointerMove={e=>{if(!mouvement.current.glisse||mouvement.current.bloque)return;const dx=e.clientX-drag.current.x;drag.current.distance=Math.max(drag.current.distance,Math.abs(dx));if(Math.abs(dx)>6){e.currentTarget.setPointerCapture(e.pointerId);mouvement.current.cible=drag.current.depart-dx/150;}}} onPointerUp={e=>{mouvement.current.glisse=false;if(drag.current.distance>6){ignorer.current=performance.now()+300;dernierTap.current={slot:Infinity,temps:0};}if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={()=>{mouvement.current.glisse=false;ignorer.current=performance.now()+300;}} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();mouvement.current.cible=Math.round(mouvement.current.cible)+(e.key==='ArrowRight'?1:-1);setSelection(modulo(mouvement.current.cible,packs.length));dernierTap.current={slot:Infinity,temps:0};}if(e.key==='Enter'&&!e.repeat){e.preventDefault();void acheter(Math.round(mouvement.current.cible));}}}>
      <Protection secours={<div className="bp3-secours" onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()}><p>Choisis ton pack</p><div>{packs.map((p,i)=><button type="button" key={p.id} disabled={occupe || achat!==null || solde<p.prix} onClick={()=>{void acheter(i);}} style={{borderColor:couleurs[apparencePack(p)]}}><b>{p.nom}</b><span>{p.cartes} cartes</span><strong>{p.prix.toLocaleString('fr-FR')} Ovas</strong></button>)}</div></div>}><Canvas camera={{position:[0,1,8.8],fov:45}} dpr={[1,1.5]} gl={{alpha:true,antialias:true}}><ambientLight intensity={1.8}/><directionalLight position={[3,4,5]} intensity={3.5}/><directionalLight position={[-4,2,3]} intensity={2} color="#c7eaff"/><Couronne packs={packs} mouvement={mouvement} achat={achat} surToucher={toucher} onSelection={setSelection}/></Canvas></Protection>
      <span className="bp3-geste">Glisse pour faire tourner · Clique sur le pack pour acheter</span>
    </div>
    <div className="bp3-details"><div className="eyebrow">{pack.cartes} cartes · {pack.garantie?`${NOMS_PACK[pack.garantie]} garanti`:'Tirage par carte'}</div><h3>Pack {pack.nom}</h3><p>{pack.promesse??'De nouvelles recrues pour ton club.'}</p><strong className="bp3-prix">{pack.prix.toLocaleString('fr-FR')} <small>Ovas</small></strong><p className="bp3-message" role="status">{message||(solde<pack.prix?`Il te manque ${(pack.prix-solde).toLocaleString('fr-FR')} Ovas.`:'Un clic pour acheter et ouvrir')}</p><details><summary>Chances de tirage par carte</summary><p>Poids de base : les raretés épuisées sont exclues et les chances restantes sont renormalisées. Une garantie peut modifier la dernière carte.</p><ul>{Object.entries(pack.probabilites).map(([r,p])=><li key={r}>{NOMS_PACK[r as keyof typeof NOMS_PACK]} <b>{p.toLocaleString('fr-FR')} %</b></li>)}</ul></details></div>
  </section>;
}
