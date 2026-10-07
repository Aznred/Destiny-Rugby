// Aperçu isolé : aucune sauvegarde ni donnée du serveur n'est écrite.
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import '../src/App.css';
import 'flag-icons/css/flag-icons.min.css';
import { useGame } from '../src/store/useGame';
import { Manager } from '../src/screens/Manager';
import { LaboDonneesClubs } from '../src/components/LaboDonneesClubs';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { effectifDuClub } from '../src/lib/effectif';
import { verifierDonneesClubs } from '../src/lib/donneesClubs';
import { compositionMedicale } from '../src/lib/infirmerieManager';
import type { DossierMedical } from '../src/lib/carriereAvancee';

chargerTextes(TEXTES);
useGame.persist.setOptions({ name: 'apercu-correctif27', storage: { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} } });
useGame.getState().creerManager({ nom:'Camille Martin',nation:'France',club:'Stade Toulousain' });
useGame.getState().setLangue('fr');
const m=useGame.getState().manager!, groupe=effectifDuClub(m.club,m.saison);
const medical: DossierMedical[]=groupe.slice(0,3).map((j,i)=>({ id:`apercu27-${i}`,joueurId:j.id,nom:j.nom,
  type:['Entorse de la cheville','Fracture du tibia','Commotion cérébrale'][i],gravite:i===1?'grave':'moyenne',disponibilite:0,douleur:25,risqueAggravation:25,
  semaines:i===0?0:i===1?14:3,joursRestants:i===0?0:i===1?98:21,dureeInitiale:i===0?42:i===1?140:28,joursEcoules:i===0?42:14,joursReprise:i===0?14:0,
  decision:'repos',penalitePerformance:12,saison:1,semaine:6,phase:i===0?'reprise':'guerison',zone:i===2?'commotion':'cheville',origine:'match',
  condition:i===0?81:50,rythme:i===0?70:40,guerison:i===0?100:40,risqueBase:22,risqueRechute:22,protocoleCommotion:i===2 }));
const avancee={...m.avancee!,medical};
useGame.setState({ manager:{...m,semaine:12,budgetStructure:3_000_000,avancee,composition:compositionMedicale(groupe,m.composition,medical)} });
const labo=new URLSearchParams(location.search).get('vue')==='labo';
if(labo){const fetchReel=window.fetch;window.fetch=(input,init)=>String(input).startsWith('/api/carriere?atelier=1&section=clubs')
  ? Promise.resolve(new Response(JSON.stringify({revision:0,clubs:verifierDonneesClubs(),rivalites:[]}),{headers:{'Content-Type':'application/json'}})) : fetchReel(input,init);}
createRoot(document.getElementById('root')!).render(labo?<main style={{padding:24,maxWidth:1500,margin:'auto'}}><LaboDonneesClubs /></main>:<Manager />);
