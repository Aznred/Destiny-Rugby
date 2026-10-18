// Plateau local : composants publiés, catalogue réel, aucune soumission ni sauvegarde.
import { createRoot } from 'react-dom/client';
import { Suspense, useState, useEffect } from 'react';
import { CarteJoueurEnLigne } from '../src/components/CarteJoueurEnLigne';
import Pack3D from '../src/components/Pack3D';
import { Nav } from '../src/components/Nav';
import { Reglages } from '../src/components/Reglages';
import { CompleteTaCarte } from '../src/screens/CompleteTaCarte';
import { Accueil } from '../src/screens/Accueil';
import { useGame } from '../src/store/useGame';
import { catalogueBaseCarriere, carteDepuisSource } from '../src/lib/ligue/catalogueCarriere';
import { fournirPoolFfr } from '../src/lib/ligue/eligibiliteJoueurs';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import '../src/index.css';
import '../src/App.css';
import 'flag-icons/css/flag-icons.min.css';

const parametres = new URLSearchParams(location.search);
const langue = parametres.get('lang') === 'en' ? 'en' : 'fr';
chargerTextes(TEXTES);
useGame.persist.setOptions({ storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}} });
useGame.getState().setLangue(langue);
useGame.setState({iaActivee:false});
fournirPoolFfr(()=>({pool:'mixed',joueurs:[]}));
const catalogue = catalogueBaseCarriere();
const normaliser = (v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const trouver = (q:string)=>catalogue.find(c=>normaliser(c.nom)===normaliser(q));
const choix = langue==='fr'
  ? ['Antoine Dupont','Gabrielle Vernier','Thomas Ramos']
  : ['Marcus Smith','Ellie Kildunne','Cheslin Kolbe'];
const selection = choix.map(trouver).filter(c=>!!c);
for(const championnat of langue==='fr' ? ['Pro D2','Fédérale 1','Régionale 3'] : ['RFU Championship','United Rugby Championship','Régionale 3']) {
  const candidats = catalogue.filter(c=>c.championnat===championnat && c.age>=18);
  const joueur = championnat==='Régionale 3' ? candidats.find(c=>normaliser(c.nom)==='anthony rodrigues') : championnat==='RFU Championship' ? candidats[0] : candidats.find(c=>Boolean(c.photo)) ?? candidats[0];
  if(joueur && !selection.includes(joueur)) selection.push(joueur);
}
if(selection.length<5) throw new Error('Sélection de cartes insuffisante.');
const cartes = selection.map(c=>carteDepuisSource(c,'tournage-local','tournage',1));
const original = window.fetch.bind(window);
window.fetch = async (entree,init)=>{
  const url = new URL(String(entree),location.href);
  if(url.pathname==='/api/carriere') {
    if(init?.method && init.method!=='GET') throw new Error('Aucune écriture pendant le tournage.');
    const q = normaliser(url.searchParams.get('q')??'');
    return new Response(JSON.stringify({miennes:[],retirees:[],ajoutees:{},demandes:[],cartes:q?catalogue.filter(c=>normaliser(c.nom+' '+c.clubReel).includes(q)).slice(0,12):[],revisionCatalogue:0}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  return original(entree,init);
};
Object.assign(window,{__tournageCartes:{cartes:selection.map(c=>({nom:c.nom,club:c.clubReel,championnat:c.championnat,genre:c.gender,photo:c.photo,sourceId:c.sourceId})),catalogue:catalogue.length}});
export function Plateau(){
  const [reglages,ouvrirReglages] = useState(false);
  const [indexCarte,choisirCarte] = useState(Number(parametres.get('i')??0));
  useEffect(()=>{Object.assign(window,{__choisirCarte:choisirCarte});},[]);
  const ecran = useGame(s=>s.ecran);
  useEffect(()=>{if(ecran==='contribuer')ouvrirReglages(false);},[ecran]);
  const vue = parametres.get('vue')??'carte';
  if(vue==='pack') return <div style={{width:'100vw',height:'100vh'}}><Suspense fallback={null}><Pack3D rarete="or" modele={langue==='fr'?'/m3d/packs-speciaux/top14.glb':'/m3d/packs-speciaux/premiership.glb'} ouvert={false} calme={false} transition="attente"/></Suspense></div>;
  if(vue==='carte') return <div className="carte-tournage"><CarteJoueurEnLigne carte={cartes[indexCarte]}/></div>;
  return <div className="racine" data-ecran={ecran} lang={langue}><Nav onReglages={()=>ouvrirReglages(true)}/><main>{ecran==='contribuer'?<CompleteTaCarte/>:<Accueil/>}</main>{reglages&&<Reglages onFermer={()=>ouvrirReglages(false)}/>}</div>;
}
const vueDetouree = ['carte','pack'].includes(parametres.get('vue')??'carte');
createRoot(document.getElementById('root')!).render(<><style>{`html,body,#root{margin:0;min-height:100%;}${vueDetouree?'html,body,#root{background:transparent!important}body::before,body::after{display:none!important}':''}.carte-tournage{width:480px;height:720px}.carte-tournage .dr-player{width:480px!important;height:720px!important;max-width:none!important;font-size:32px!important;animation:none!important;transform:none!important}`}</style><Plateau/></>);
