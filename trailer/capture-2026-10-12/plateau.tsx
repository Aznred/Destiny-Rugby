// Plateau local : composants et données du jeu inchangés, sans écriture de partie.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import '../../src/App.css';
import 'flag-icons/css/flag-icons.min.css';
import { CarteJoueurEnLigne } from '../../src/components/CarteJoueurEnLigne';
import OuverturePack from '../../src/components/OuverturePack';
import { FicheClub } from '../../src/components/FicheClub';
import { clubParNom } from '../../src/data/clubs';
import { catalogueBaseCarriere, carteDepuisSource } from '../../src/lib/ligue/catalogueCarriere';
import { chargerTextes, definirLangue } from '../../src/lib/i18n';
import { TEXTES } from '../../src/data/textes';
import { useGame } from '../../src/store/useGame';
const p = new URLSearchParams(location.search);
chargerTextes(TEXTES); definirLangue(p.get('lang') === 'en' ? 'en' : 'fr');
useGame.persist.setOptions({name:'tournage-local',storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}});
const catalogue = catalogueBaseCarriere();
const racine = createRoot(document.getElementById('root')!);
if (p.has('club')) {
  const club = clubParNom(p.get('club')!);
  if (!club) throw new Error('Club absent du jeu');
  racine.render(<FicheClub club={club} saison={1} onFermer={()=>{}}/>);
} else {
  const noms = p.get('femme') ? ['ESCUDERO','QUEYROI','BOURDON SANSUS'] : ['RAMOS','JALIBERT','DUPONT'];
  const selection = noms.map(nom=>catalogue.find(c=>c.nom.toUpperCase().includes(nom) && (p.get('femme') ? c.gender==='female' : c.clubReel==='Stade Toulousain'||c.clubReel.includes('Bordeaux'))));
  if (selection.some(c=>!c)) throw new Error('Carte demandée absente du catalogue');
  const cartes = selection.map(c=>carteDepuisSource(c!, 'tournage', 'tournage', 0));
  (window as any).__provenance = cartes.map(c=>({sourceId:c.sourceId,nom:c.nom,note:c.note,rarete:c.rarete,photo:c.photo}));
  racine.render(<OuverturePack cartes={cartes} pack={p.get('femme')?'Élite 1 Féminine':'Top 14'} modele={p.get('femme')?'/m3d/packs-speciaux/f-elite1.glb':'/m3d/packs-speciaux/top14.glb'} apparenceInitiale="star" rendreCarte={c=><CarteJoueurEnLigne carte={c}/>} onFermer={()=>{}}/>);
}
