import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import '../src/index.css';
import '../src/App.css';
import 'flag-icons/css/flag-icons.min.css';
import { Carriere } from '../src/screens/Carriere';
import { Nav } from '../src/components/Nav';
import { useGame } from '../src/store/useGame';
import { chargerTextes, LANGUES } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { definirCleGroqJoueur } from '../src/lib/groq';

chargerTextes(TEXTES);
// L'aperçu n'écrit aucune sauvegarde, quel que soit le port utilisé.
useGame.persist.setOptions({
  name: 'apercu-carriere-joueur',
  storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
});
// Affiche les suggestions sans lancer d’appel réseau (aucun événement en attente).
definirCleGroqJoueur('apercu-local-sans-reseau');
// Personnage de démonstration indépendant de la partie réelle.
useGame.getState().creerJoueur({ nom: 'Roméo Aldegheri', poste: 'ailier_droit', nation: 'France', club: 'Meze Rugby Club', division: 'reg3', age: 18, traits: ['professionnel', 'fetard'] });
useGame.setState({
  attenteEvenement: false, evenementHebdo: null, scenarioActif: null,
  iaActivee: true,
  equipementActif: { sac: 'sac', casque: 'casque-tribal', bouclier: 'bouclier', crampons: 'crampons-dupont', maillot: 'maillot-bayonnais' },
});
useGame.getState().setLangue('en');
useGame.getState().setTheme('bleu');
export function Apercu() {
  const langue = useGame(s => s.langue);
  const [reglages, setReglages] = useState(false);
  return <div className="racine" data-ecran="carriere" lang={langue}>
    <Nav onReglages={() => setReglages(!reglages)} />
    {reglages && <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, padding: 8 }}>
      {LANGUES.map(l => <button key={l.id} className="btn fantome petit" onClick={() => { useGame.getState().setLangue(l.id); setReglages(false); }}>{l.nom}</button>)}
    </div>}
    <main><Carriere onReglages={() => {}} /></main>
  </div>;
}
createRoot(document.getElementById('root')!).render(<Apercu />);
