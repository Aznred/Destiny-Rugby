// Profil du joueur (portrait 3D + personnalisation) SANS toucher à la sauvegarde. /scripts/apercuProfil.html
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import '../src/App.css';
import 'flag-icons/css/flag-icons.min.css';
import { Profil } from '../src/screens/Profil';
import { useGame } from '../src/store/useGame';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { useSynchroApparenceJoueur } from '../src/lib/synchroApparenceJoueur';

chargerTextes(TEXTES);
useGame.persist.setOptions({ name: 'apercu-profil', storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
useGame.getState().creerJoueur({ nom: 'Roméo Aldegheri', poste: 'pilier_gauche', nation: 'France', club: 'Meze Rugby Club', division: 'reg3', age: 18, traits: [] });
useGame.setState({ equipements: ['casque-rouge', 'crampons-bleus'], equipementActif: { casque: 'casque-rouge', crampons: 'crampons-bleus' }, ecran: 'profil' });
(window as unknown as { __jeu: typeof useGame }).__jeu = useGame;
function Apercu() { useSynchroApparenceJoueur(); return <div className="racine" data-ecran="profil"><main><Profil /></main></div>; }
createRoot(document.getElementById('root')!).render(<Apercu />);
