import React from 'react';
import { createRoot } from 'react-dom/client';
import { LaboBaseJoueurs } from '../src/components/LaboBaseJoueurs';
import '../src/index.css';
import '../src/components/AtelierKiri.css';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
chargerTextes(TEXTES);
const example={id:'fixture_1',name:'Camille Morel · fiction de démonstration',identity_key:'camille morel',gender:'female',age_category:'Senior',senior_status:'senior',age:25,
  club:'Club de démonstration',competition:'Fédérale 1 féminine',countryId:'FR',clubId:'demo',competitionId:'demo',level:54,primary_position:'talonneur',secondary_positions:[],
  overall:58,potential:65,data_confidence:.91,identity_confidence:.95,position_confidence:.8,usage:'FEMALE_SENIOR_CARD',card_status:'ACTIVE_CARD',reasons:[],season:'2025-2026',matches:15,starts:12,photo:null,review:'PENDING',revision:0};
const originalFetch=window.fetch.bind(window);
window.fetch=async(input,options)=>{
  const url=String(input);if(!url.includes('baseJoueurs'))return originalFetch(input,options);
  return new Response(JSON.stringify(options?.method==='POST'?{ok:true}:url.includes('rapport')?{version:'APERÇU_FICTIF',sources:470742}: {version:'APERÇU_FICTIF',next:null,joueurs:[example,{...example,id:'fixture_2',name:'Source jeunesse — identité privée',gender:'male',age_category:'U18',senior_status:'youth',age:17,photo:null,usage:'YOUTH_REGEN_SOURCE',card_status:'DATABASE_ONLY',overall:44,potential:78}, {...example,id:'fixture_3',name:'Alex Laurent · fiction de démonstration',gender:'male',card_status:'LOW_CONFIDENCE',primary_position:null,overall:null,potential:null,data_confidence:.32,reasons:['MISSING_POSITION','INSUFFICIENT_MATCHES']}]}),{status:200,headers:{'Content-Type':'application/json'}});
};
createRoot(document.getElementById('root')!).render(<React.StrictMode><main style={{padding:'24px',maxWidth:1500,margin:'auto'}}><p>APERÇU LOCAL · profils fictifs pour vérifier l’interface</p><LaboBaseJoueurs/></main></React.StrictMode>);
