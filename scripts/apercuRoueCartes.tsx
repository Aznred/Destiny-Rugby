// Banc d'essai de la roue du marché, ouvert avec `npm run dev` puis
// /apercu-roue.html. Il sert à deux choses à la fois :
//
//  · le GESTE (glisser qui suit la main, calage sur la carte de face, clic qui
//    ramène une carte au centre) — voir les avertissements de RoueCartes.tsx ;
//  · les PORTRAITS, avec la liste exacte des noms qui sortaient gris alors que
//    leur photo était sur le disque (nom composé tronqué, lettre accentuée
//    mangée à l'aspiration, apostrophe, prénom d'usage). Le dernier n'a
//    vraiment aucune photo : il doit montrer la silhouette de repli.
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { RoueCartes } from '../src/components/RoueCartes';
import type { CarteCarriere } from '../src/lib/ligue/typesCarriere';
import '../src/index.css'; import '../src/App.css';

const NOMS = [
  ['Aaron GRANDIDIER', 'Section Paloise'], ['Gaël DRÉAN', 'RC Toulon'],
  ["David AINU'U", 'Stade Toulousain'], ['Will SKELTON', 'Stade Rochelais'],
  ['Tom STANIFORTH', 'Castres Olympique'], ['Jérémy SINZELLE', 'RC Toulon'],
  ['Levani BOTIA', 'Stade Rochelais'], ['Dany PRISO', 'RC Toulon'],
  ['Santiago ARATA', 'Castres Olympique'], ['Thibaut MOTASSI', 'Stade Français Paris'],
  ['Antoine DUPONT', 'Stade Toulousain'], ['Thomas RAMOS', 'Stade Toulousain'],
  ['Naoto SAITO', 'Stade Toulousain'],
  // Japon et Super Rugby Pacific (rugby_players.json) : fond blanc d'origine.
  ['Ardie SAVEA', 'Kobelco Kobe Steelers'], ['Anton LIENERT-BROWN', 'Kobelco Kobe Steelers'],
  ['Richie MOUNGA', 'Toshiba Brave Lupus'], ['Damian MCKENZIE', 'Chiefs'],
];
const cartes = NOMS.map(([nom, clubReel], i) => ({
  id: String(i), nom, clubReel, note: 75 + i, rarete: i % 3 ? 'or' : 'elite',
  poste: 'demi_melee', nation: 'France', age: 25, fatigue: 0,
  statistiques: { VIT: 80, PAS: 83, DEF: 78 },
} as unknown as CarteCarriere));

function Test() {
  const [q, setQ] = useState('');
  const [id, setId] = useState('');
  return <main style={{ maxWidth: 1100, margin: '20px auto' }}>
    <input aria-label="Recherche" value={q} onChange={(e) => setQ(e.target.value)} />
    <RoueCartes cartes={cartes.filter((c) => c.nom.toLowerCase().includes(q.toLowerCase()))} titre="Marché" selection={id} onChoisir={setId} />
    <output>{id}</output>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Test />);
