// Captures des vrais composants, avec une carrière de démonstration sans sauvegarde.
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import '../src/App.css';
import 'flag-icons/css/flag-icons.min.css';
import { Carriere } from '../src/screens/Carriere';
import { Manager } from '../src/screens/Manager';
import { CollectionSolo } from '../src/screens/CollectionSolo';
import { WikiLigue } from '../src/components/WikiLigue';
import { Nav } from '../src/components/Nav';
import { useGame } from '../src/store/useGame';
import { chargerTextes, definirLangue } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
chargerTextes(TEXTES);
definirLangue('fr');
useGame.persist.setOptions({ name: 'apercu-wiki', storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
const vue = new URLSearchParams(location.search).get('vue') ?? 'joueur';
if (vue === 'manager') useGame.getState().creerManager({ nom: 'Alex Martin', nation: 'France', club: 'Meze Rugby Club', age: 35 });
else if (vue === 'joueur') {
  useGame.getState().creerJoueur({ nom: 'Alex Martin', poste: 'demi_ouverture', nation: 'France', club: 'Meze Rugby Club', division: 'reg3', age: 18, traits: ['professionnel', 'ambitieux'] });
  useGame.setState({ attenteEvenement: false, evenementHebdo: null, scenarioActif: null, iaActivee: false });
}
useGame.getState().setLangue('fr');
useGame.getState().setTheme('vert');
createRoot(document.getElementById('root')!).render(<div className="racine" data-ecran={vue === 'manager' ? 'manager' : 'carriere'} lang="fr"><Nav onReglages={() => {}} /><main>{vue === 'manager' ? <Manager /> : vue === 'collection' ? <CollectionSolo /> : vue === 'wiki' ? <WikiLigue /> : <Carriere onReglages={() => {}} />}</main></div>);
