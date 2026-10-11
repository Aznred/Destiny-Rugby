import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {LaboValidationClassement,type VueValidation} from '../src/components/LaboValidationClassement';
import {EtatValidationClassement,BadgeValidationClassement} from '../src/components/ValidationClassement';
import {evaluerClassement,validationPublique} from '../src/lib/validationClassement';
import {scoreDeLaFiche,type FicheCarriere} from '../src/lib/classementMondial';
import {TROPHEES} from '../src/data/trophees';
import {chargerTextes} from '../src/lib/i18n';
import {TEXTES} from '../src/data/textes';
import '../src/index.css';import '../src/App.css';
chargerTextes(TEXTES);
const f:FicheCarriere={v:2,pseudo:'Camille',nom:'Camille',poste:'demi-melee',nation:'France',ageDebut:18,age:18,saisons:1,note:100,
 reputation:20,matchs:10,essais:4,selections:0,titres:[],clubs:['Stade Toulousain'],score:0};f.score=scoreDeLaFiche(f);
const ids=Object.keys(TROPHEES);const date='2026-10-11T11:00:00Z';
const faits=[{...f,v:1,pseudo:'Camille — ancienne sauvegarde'},{...f,pseudo:'Alex — score incohérent',score:f.score+1000},{...f,pseudo:'Morgan — belle progression'}];
const dossiers=faits.map((fiche,i)=>({careerId:`00000000-0000-4000-8000-00000000000${i}`,userId:'compte-demo-'+i,pseudo:fiche.pseudo,
 validation:validationPublique(evaluerClassement({...fiche,pseudo:'Camille'},ids)),revision:1,date,derniereSynchronisation:date}));
const charger=async(filtre:string,page:number,corps?:unknown):Promise<VueValidation>=>{
 if(corps) {
   const c=corps as {operation:string;careerId:string;revision:number};
   if(c.operation==='revalider')return {traites:dossiers.length,suite:false} as unknown as VueValidation;
   const d=dossiers.find(d=>d.careerId===c.careerId)!;
   if(d.revision!==c.revision)throw new Error('Vérification modifiée.');
   d.revision++;
   d.validation=c.operation==='reinitialiser'?validationPublique(evaluerClassement({...faits[dossiers.indexOf(d)],pseudo:'Camille'},ids)):
    {...d.validation,statut:c.operation==='valider'?'ELIGIBLE':'REJECTED',visible:c.operation==='valider',recompensesAutorisees:c.operation==='valider'};
 }
 const liste=dossiers.filter(d=>filtre==='ALL'||(filtre==='HIGH_RISK'?d.validation.riskScore>=60:d.validation.statut===(filtre==='PENDING'?'PENDING_VALIDATION':filtre)));
 return structuredClone({dossiers:liste,total:liste.length,page,parPage:50,bilan:{total:dossiers.length,normalementEligibles:dossiers.length,
 visibles:dossiers.filter(d=>d.validation.visible).length,rejetes:dossiers.filter(d=>d.validation.statut==='REJECTED').length,causes:[['ancienne_version',1],['score_modifie',1]]}});
};
function Apercu() {
 const [validation,setValidation]=useState(validationPublique(evaluerClassement({...f,v:1},ids)));
 return <main style={{maxWidth:1080,margin:'auto',padding:24}}><div className="eyebrow">Destiny Rugby · aperçu de développement</div><h1>Classement en ligne</h1>
 <p>Camille · {f.score} points <BadgeValidationClassement validation={validation}/></p>
 <EtatValidationClassement validation={validation} synchroniser={()=>setValidation(validationPublique(evaluerClassement(f,ids)))}/>
 <LaboValidationClassement charger={charger}/></main>;
}
createRoot(document.getElementById('root')!).render(<Apercu/>);
