// Aperçu de l'écran de création (apparence comprise) SANS toucher à la sauvegarde : tout reste en mémoire.
// /scripts/apercuCreation.html?langue=fr&achats=1   (achats=1 : casque et crampons déjà achetés)
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import '../src/App.css';
import 'flag-icons/css/flag-icons.min.css';
import { Creation } from '../src/screens/Creation';
import { useGame } from '../src/store/useGame';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { useSynchroApparenceJoueur } from '../src/lib/synchroApparenceJoueur';

chargerTextes(TEXTES);
useGame.persist.setOptions({ name: 'apercu-creation', storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
const q = new URLSearchParams(location.search);
useGame.getState().setLangue((q.get('langue') as 'fr') || 'fr');
if (q.get('achats')) useGame.setState({ equipements: ['casque-rouge', 'casque-tribal', 'crampons-bleus', 'crampons-dupont'], equipementActif: { casque: 'casque-rouge' } });
(window as unknown as { __jeu: typeof useGame }).__jeu = useGame;
function Apercu() { useSynchroApparenceJoueur(); return <div className="racine" data-ecran="creation"><main><Creation /></main></div>; }
createRoot(document.getElementById('root')!).render(<Apercu />);
