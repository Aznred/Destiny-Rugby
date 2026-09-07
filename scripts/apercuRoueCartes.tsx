import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {RoueCartes} from '../src/components/RoueCartes';
import type {CarteCarriere} from '../src/lib/ligue/typesCarriere';
import '../src/index.css';import '../src/App.css';
const cartes=Array.from({length:15},(_,i)=>({id:String(i),nom:`Joueur ${i}`,note:75+i,rarete:i%2?'elite':'or',poste:'demi_melee',clubReel:'Stade Toulousain',nation:'France',age:25,statistiques:{VIT:80,PAS:83,DEF:78},fatigue:0} as unknown as CarteCarriere));
function Test(){const [q,setQ]=useState(''),[id,setId]=useState('');return <main style={{maxWidth:1100,margin:'20px auto'}}><input aria-label="Recherche" value={q} onChange={e=>setQ(e.target.value)}/><RoueCartes cartes={cartes.filter(c=>c.nom.includes(q))} titre="Marché" selection={id} onChoisir={setId}/><output>{id}</output></main>;}createRoot(document.getElementById('root')!).render(<Test/>);
