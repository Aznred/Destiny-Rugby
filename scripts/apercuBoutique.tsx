// La boutique (Correctif 21) SANS toucher à la sauvegarde. /scripts/apercuBoutique.html?ovas=300&credits=80&langue=fr
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import '../src/App.css';
import 'flag-icons/css/flag-icons.min.css';
import { Boutique } from '../src/screens/Boutique';
import { ModalesMonnaie } from '../src/components/ModalesMonnaie';
import { Personnalisation } from '../src/components/Personnalisation';
import { useGame } from '../src/store/useGame';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { useSynchroApparenceJoueur } from '../src/lib/synchroApparenceJoueur';

chargerTextes(TEXTES);
useGame.persist.setOptions({ name: 'apercu-boutique', storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
const q = new URLSearchParams(location.search);
useGame.getState().setLangue((q.get('langue') as 'fr') || 'fr');
useGame.getState().creerJoueur({ nom: 'Roméo Aldegheri', poste: 'ailier_droit', nation: 'France', club: 'Meze Rugby Club', division: 'reg3', age: 18, traits: [] });
useGame.setState({
  ecran: 'boutique', coins: Number(q.get('ovas') ?? 300), credits: Number(q.get('credits') ?? 80),
  equipements: ['maillot-bleu', 'kit-destiny-classique', 'stade-regional'], equipementActif: { maillot: 'kit-destiny-classique' },
  cosmetiquesMeta: {},
});
(window as unknown as { __jeu: typeof useGame }).__jeu = useGame;
function Apercu() {
  useSynchroApparenceJoueur();
  return <div className="racine" data-ecran="boutique"><main><Boutique /></main><ModalesMonnaie /><Personnalisation /></div>;
}
createRoot(document.getElementById('root')!).render(<Apercu />);
