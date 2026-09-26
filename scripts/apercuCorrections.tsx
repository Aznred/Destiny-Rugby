import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { CelebrationLigue } from '../src/components/CelebrationLigue';
import { MatchLive } from '../src/components/MatchLive';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import type { VueCarriereEnLigne } from '../src/lib/ligue/typesCarriere';
import '../src/index.css';
import '../src/App.css';
chargerTextes(TEXTES);
const noms=['Cyril Baille','Peato Mauvaka','Uini Atonio','Thibaud Flament','Emmanuel Meafou','François Cros','Charles Ollivon','Grégory Alldritt','Antoine Dupont','Romain Ntamack','Louis Bielle-Biarrey','Yoram Moefana','Gaël Fickou','Damian Penaud','Thomas Ramos'];
function Apercu() {
  const [vue,setVue]=useState({id:'test',monClubId:'club',cartes:noms.map((nom,i)=>({id:String(i),nom})),clubs:[{id:'club',nom:'Les champions',composition:{titulaires:noms.map((_,i)=>String(i))}}],histoire:[{competitionId:'coupe',nom:'Ligue des amis',trophee:'Coupe des champions',saison:1,vainqueur:'club',tropheeId:'champions_cup'}]} as VueCarriereEnLigne);
  if(location.search.includes('match')) return <MatchLive match={{domicile:'Stade Toulousain',exterieur:'Stade Rochelais',scoreD:24,scoreE:17,journee:1}} saison={1} cle="verification-visuelle" titre="Match de carrière" onFermer={()=>location.assign('/')} />;
  return <CelebrationLigue vue={vue} agir={async()=>{const suivante={...vue,clubs:vue.clubs.map(c=>({...c,tropheesVus:['coupe:1']}))};setVue(suivante);return suivante;}} />;
}
createRoot(document.getElementById('root')!).render(<Apercu />);
