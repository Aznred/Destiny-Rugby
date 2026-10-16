import { Profiler } from 'react';
import { createRoot } from 'react-dom/client';
import { Manager } from '../src/screens/Manager';
import { useGame } from '../src/store/useGame';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import '../src/index.css';
import '../src/App.css';

chargerTextes(TEXTES);
useGame.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
useGame.getState().creerManager({ nom: 'Coach Fluidité', nation: 'France', club: 'Stade Toulousain', age: 40, libre: true });
useGame.setState({ iaActivee: false });
let clic = 0;
let rendus = 0;
document.addEventListener('click', () => { clic = performance.now(); }, true);
createRoot(document.getElementById('root')!).render(
  <Profiler id="manager" onRender={(_id, _phase, duree) => {
    const mesure = document.getElementById('mesures')!;
    mesure.textContent = `Aperçu sans sauvegarde · rendu ${++rendus} : ${duree.toFixed(0)} ms${clic ? ` · réponse au clic : ${(performance.now() - clic).toFixed(0)} ms` : ''}`;
    mesure.style.cssText = 'padding:8px;background:#14261c;color:white;position:relative;z-index:100';
  }}><Manager /></Profiler>,
);
