/* oxlint-disable react/only-export-components -- aperçu local autonome */
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { DirectCinema } from '../src/components/match/DirectCinema';
import { MatchLive } from '../src/components/MatchLive';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import type { VueMatchEnLigne } from '../src/lib/ligue/matchCarriere';
import direct from './.verification29-direct.json';
import '../src/index.css';
import '../src/App.css';
import '../src/screens/CarriereEnLigne.css';
import './apercuHabillageTV.css';
chargerTextes(TEXTES);
const root = createRoot(document.getElementById('root')!);
function Apercu() {
  const [solo, ouvrirSolo] = useState(false);
  return <main className="apercu-tv cel"><header><div><h1>Prolongation jouée</h1>
  <p>Capture du moteur serveur à la 85e minute · aucune horloge modifiée</p></div></header>
  <button className="btn primaire" onClick={() => ouvrirSolo(true)}>Jouer la finale en sélection</button>
  <DirectCinema match={direct as VueMatchEnLigne} domicile="Stade Toulousain" exterieur="Montpellier HR" pause
    couleurs={{ domicile: '#d5001c', exterieur: '#f3f5f6' }} identite={{ nom: 'Ligue privée', logo: 'top14', journee: 1 }} />
  {solo && <MatchLive match={{ domicile: 'France', exterieur: 'Irlande', scoreD: 17, scoreE: 17, essaisD: 2, essaisE: 2 }}
    saison={1} cle="mondial#1#finale#France#Irlande#apercu-15" titre="Finale — Coupe du monde" selection
    habillage={{ nom: 'Coupe du monde', logo: 'coupeDuMonde' }} onFermer={() => ouvrirSolo(false)} />}
</main>;
}
root.render(<Apercu />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
