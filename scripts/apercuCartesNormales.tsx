import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { DemandesCartes } from '../src/components/DemandesCartes';
import { LaboCartesNormales } from '../src/components/LaboCartesNormales';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { validerCarteNormale, validerDemandeCarte, saisieDepuisSource } from '../src/lib/cartesNormales';
import { POSTE_PAR_ID } from '../src/data/rugby';
import { rareteCarriere, statistiquesCarte } from '../src/lib/ligue/catalogueCarriere';
import type { SourceCarte } from '../src/lib/ligue/catalogueCarriere';
import type { DemandeCarte, SaisieCarteNormale } from '../src/lib/cartesNormales';
import '../src/index.css';
import '../src/App.css';
import '../src/components/AtelierKiri.css';
chargerTextes(TEXTES);

const sources:SourceCarte[]=[];
const demandes:DemandeCarte[]=[];
let revision=0;
const origine=window.fetch.bind(window);
const publier=(sourceId:string,carte:SaisieCarteNormale)=>{
  const famille=POSTE_PAR_ID[carte.poste].famille;
  const source:SourceCarte={...carte,sourceId,famille,origine:'professionnel',rarete:rareteCarriere(carte.note),statistiques:statistiquesCarte(carte.note,famille,sourceId)};
  const index=sources.findIndex(s=>s.sourceId===sourceId);if(index>=0)sources[index]=source;else sources.push(source);
  revision++;
};
publier('apercu-joueur',{nom:'Louis Exemple',poste:'arriere',age:25,note:65,potentiel:70,clubReel:'Club Exemple',championnat:'Fédérale 1',nation:'France',pays:'France',gender:'male',photo:'/photos/antoine_dupont.webp'});
const base = saisieDepuisSource(sources[0]);
demandes.push({id:'00000000-0000-4000-8000-000000000001',type:'correction',sourceId:'apercu-joueur',
  carte:{...base,note:78,potentiel:84,age:26,clubReel:'Stade Toulousain',championnat:'Top 14',photo:'/photos/matthieu_jalibert.webp'},
  message:'Mon club, ma note et ma photo sont à jour dans cette proposition.',statut:'attente',revision:0,
  creeLe:new Date().toISOString(),pseudo:'Joueur de test',droitsCertifies:true});
demandes.push({id:'00000000-0000-4000-8000-000000000002',type:'creation',
  carte:{...base,nom:'Camille Exemple',photo:undefined},message:'Une nouvelle carte à examiner.',statut:'attente',revision:0,
  creeLe:new Date().toISOString(),pseudo:'Autre joueur de test',droitsCertifies:true});
window.fetch=async(input,init)=>{
  const url=new URL(String(input),location.href);
  if(!url.pathname.startsWith('/api/carriere')||(!url.searchParams.has('demandesCartes')&&!url.searchParams.has('atelier')))return origine(input,init);
  const repondre=(donnees:unknown,statut=200)=>new Response(JSON.stringify(donnees),{status:statut,headers:{'Content-Type':'application/json'}});
  const q=(url.searchParams.get('q')??'').toLowerCase();
  try {
    if(!init?.body){const id=url.searchParams.get('id');if(id){const demande=demandes.find(d=>d.id===id);return repondre({demande,...(demande?.type==='correction'?{carteActuelle:sources.find(s=>s.sourceId===demande.sourceId)??null}:{})});}return repondre({demandes,cartes:sources.filter(s=>q&&s.nom.toLowerCase().includes(q)),revisionCatalogue:revision,interne:true});}
    const b=JSON.parse(String(init.body));
    if(b.operation==='soumettre'){demandes.unshift({...validerDemandeCarte(b),id:crypto.randomUUID(),revision:0,statut:'attente',creeLe:new Date().toISOString(),pseudo:'Joueur de test'});}
    else if(b.operation==='carteNormale'){publier(b.sourceId,validerCarteNormale(b.carte));}
    else {const d=demandes.find(d=>d.id===b.id);if(!d||d.revision!==b.revision)return repondre({erreur:'Demande modifiée.'},409);
      if(b.operation==='refuser'){d.statut='refusee';d.reponse=b.reponse;}
      else {d.carte=validerCarteNormale(b.carte);if(b.operation==='approuver'){publier(d.sourceId??`normale-${d.id}`,d.carte);d.statut='acceptee';}}
      d.revision++;
    }
    return repondre({demandes,revisionCatalogue:revision,revision});
  }catch(e){return repondre({erreur:(e as Error).message},400);}
};
export function ApercuCartes(){
  const [vue,setVue]=useState<'joueur'|'creation'|'demandes'>(()=>new URLSearchParams(location.search).get('vue')==='demandes'?'demandes':'joueur');
  return <main className="atelier-kiri" style={{maxWidth:1200,margin:'auto',padding:20}}>
    <h1>Cartes normales · aperçu local</h1><p>Formulaires réels avec une API de test. Aucune sauvegarde ni publication.</p>
    <nav className="cn-actions"><button className="btn fantome" onClick={()=>setVue('joueur')}>Demande joueur</button><button className="btn fantome" onClick={()=>setVue('creation')}>Créer dans le Labo</button><button className="btn fantome" onClick={()=>setVue('demandes')}>Valider les demandes</button></nav>
    {vue==='joueur'?<DemandesCartes />:<LaboCartesNormales key={vue} demandesSeulement={vue==='demandes'} />}
  </main>;
}
createRoot(document.getElementById('root')!).render(<ApercuCartes />);
