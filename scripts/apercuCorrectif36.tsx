import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { Arbre } from '../src/screens/Tableau';
import { Manager } from '../src/screens/Manager';
import { Social } from '../src/screens/Social';
import { useGame } from '../src/store/useGame';
import { construireBracket } from '../src/lib/bracketProgressif';
import { effacerResultatsJoues, enregistrerResultatJoue } from '../src/lib/championnat';
import { COMPETITIONS } from '../src/data/clubs';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import '../src/index.css';
import '../src/App.css';

chargerTextes(TEXTES);
// Cet aperçu n'écrit aucune partie dans le navigateur.
useGame.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
useGame.getState().creerManager({ nom: 'Essai contrats', nation: 'France', club: COMPETITIONS.find(c => c.id === 'nationale')!.clubs[0].nom, age: 40, libre: true });
useGame.setState(s => ({ iaActivee: false, manager: { ...s.manager!, budgetTransferts: 10_000_000, budgetSalarial: 100_000_000 } }));
effacerResultatsJoues();
const qualifies = Array.from({ length: 32 }, (_, i) => `Club qualifié ${i + 1}`);
export function Apercu() {
  const ecran = useGame(s => s.ecran);
  const [revision, actualiser] = useState(0);
  const [contrats, voirContrats] = useState(false);
  const matchs = construireBracket(qualifies, 'tournoi#apercu#1');
  return <main style={{ maxWidth: 1200, margin: 'auto', padding: '1rem' }}>
    <h1>Correctif 36 · aperçu local</h1>
    <div className="barre-poules"><button className="btn fantome" onClick={() => voirContrats(false)}>Tableau de 32 clubs</button><button className="btn fantome" onClick={() => voirContrats(true)}>Contrats entraîneur</button></div>
    {contrats ? ecran === 'social' ? <Social /> : <Manager /> : <section className="carte bloc-competition" key={revision}>
      <h2>32 qualifiés · {matchs.filter(m => m.status === 'completed').length} matchs joués</h2>
      <p>Tour actuel : {matchs.find(m => m.status !== 'completed')?.libelle.split(' : ')[0] ?? 'Compétition terminée'}</p>
      <button className="btn primaire" disabled={matchs.every(m => m.status === 'completed')} onClick={() => {
        for (const m of matchs.filter(m => m.status === 'scheduled')) enregistrerResultatJoue(m.cle,
          { domicile: m.domicile, exterieur: m.exterieur, scoreD: 24, scoreE: 10, essaisD: 3, essaisE: 1 });
        actualiser(revision + 1);
      }}>Jouer le tour actuel</button>
      <Arbre matchs={matchs} club={qualifies[0]} taille={32} />
    </section>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Apercu />);
