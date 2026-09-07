import {useRef, useState} from 'react';
import type {CSSProperties} from 'react';
import type {CarteCarriere} from '../lib/ligue/typesCarriere';
import {CarteJoueurEnLigne} from './CarteJoueurEnLigne';
import './RoueCartes.css';
const modulo=(n:number,m:number)=>((n%m)+m)%m;
export function RoueCartes({cartes,onChoisir,selection,titre,vide='Aucun joueur ne correspond à ta recherche.'}:{cartes:CarteCarriere[];onChoisir:(id:string)=>void;selection?:string;titre:string;vide?:string}) {
  // Une nouvelle recherche remet la roue sur son premier résultat.
  return <Roue key={cartes.map(c=>c.id).join('|')} cartes={cartes} onChoisir={onChoisir} selection={selection} titre={titre} vide={vide}/>;
}
function Roue({cartes,onChoisir,selection,titre,vide}:Parameters<typeof RoueCartes>[0]) {
  const [position,setPosition]=useState(0);
  const geste=useRef<{x:number;y:number;distance:number}|null>(null);
  const ignorer=useRef(false);
  const n=cartes.length;
  const avancer=(d:number)=>setPosition(p=>p+d);
  if(!n)return <div className="rc-vide"><h3>{titre}</h3><p>{vide}</p></div>;
  const centre=modulo(position,n);
  const nombre=Math.min(7,n);
  const slots=Array.from({length:nombre},(_,i)=>i-Math.floor(nombre/2));
  return <section className="rc" aria-label={titre}>
    <header><h3>{titre}</h3><span>{centre+1} / {n} joueurs</span></header>
    <div className="rc-scene" tabIndex={0} role="group" aria-label="Roue de cartes. Flèches pour tourner, Entrée pour choisir." onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();avancer(e.key==='ArrowRight'?1:-1);}if(e.key==='Enter'){e.preventDefault();onChoisir(cartes[centre].id);}}}
      onPointerDown={e=>{if(e.button!==0)return;geste.current={x:e.clientX,y:e.clientY,distance:0};ignorer.current=false;}}
      onPointerMove={e=>{const g=geste.current;if(!g)return;g.distance=Math.max(g.distance,Math.abs(e.clientX-g.x));if(g.distance>10&&Math.abs(e.clientX-g.x)>Math.abs(e.clientY-g.y))e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerUp={e=>{const g=geste.current;geste.current=null;if(!g)return;if(g.distance>10){ignorer.current=true;avancer(Math.sign(g.x-e.clientX)*Math.max(1,Math.round(g.distance/100)));}if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
      onPointerCancel={()=>{geste.current=null;ignorer.current=true;}}>
      <div className="rc-anneau"/>
      {slots.map(slot=>{const c=cartes[modulo(centre+slot,n)];const angle=slot*Math.PI/4;return <button type="button" key={c.id} className={`rc-carte${selection===c.id?' choisie':''}`} aria-label={`Choisir ${c.nom}, ${c.note} GEN`} aria-pressed={selection===c.id} style={{'--x':`${Math.sin(angle)*340}px`,'--z':`${Math.cos(angle)*150-150}px`,'--rotation':`${-slot*12}deg`,zIndex:10-Math.abs(slot)} as CSSProperties} onClick={()=>{if(ignorer.current)return;setPosition(position+slot);onChoisir(c.id);}}><CarteJoueurEnLigne carte={c}/></button>})}
    </div>
    <footer><button type="button" disabled={n<2} aria-label="Joueur précédent" onClick={()=>avancer(-1)}>←</button><span>Glisse pour tourner · Clique sur une carte</span><button type="button" disabled={n<2} aria-label="Joueur suivant" onClick={()=>avancer(1)}>→</button></footer>
  </section>;
}
