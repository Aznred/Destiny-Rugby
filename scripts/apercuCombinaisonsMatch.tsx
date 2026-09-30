/* oxlint-disable react/only-export-components -- aperçu local de développement */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EditeurCombinaisons } from '../src/components/EditeurCombinaisons';
import { DirectCinema } from '../src/components/match/DirectCinema';
import { creerCombinaison, type Combinaison } from '../src/lib/ligue/combinaisons';
import { actualiserCahierMatchEnLigne, avancerMatchEnLigne, creerMatchEnLigne, STRATEGIE_EN_LIGNE_DEFAUT, vueMatchEnLigne } from '../src/lib/ligue/matchCarriere';
import { effectifDuClub } from '../src/lib/effectif';
import { compositionManagerParDefaut } from '../src/lib/compositionManager';
import '../src/index.css';
import '../src/App.css';
import '../src/screens/CarriereEnLigne.css';

const debut = Date.parse('2026-09-30T12:00:00Z');
const equipe = (clubId: string, nom: string) => {
  const effectif = effectifDuClub(nom, 1);
  return { clubId, nom, effectif, composition: compositionManagerParDefaut(effectif), strategie: STRATEGIE_EN_LIGNE_DEFAUT };
};
function Apercu() {
  const [plans, setPlans] = useState<Combinaison[]>((['ruck', 'melee', 'touche'] as const).map(phase => {
    const c = creerCombinaison(`match-${phase}`, phase);
    c.nom = phase === 'ruck' ? 'Mon lancement sur ruck' : phase === 'melee' ? 'Ma sortie de mêlée' : 'Ma sortie de touche';
    return c;
  }));
  const [mode, setMode] = useState<'automatique' | 'configure'>('automatique');
  const [minute, setMinute] = useState(2);
  const [etat, setEtat] = useState(() => avancerMatchEnLigne(creerMatchEnLigne({
    id: 'apercu-cahier-en-match', domicile: equipe('club-a', 'Stade Toulousain'), exterieur: equipe('club-b', 'RC Toulon'), debut, graine: 43219,
  }), debut + 2 * 60_000));
  const vue = vueMatchEnLigne(etat, 'club-a', Date.now());
  const executions = vue.fil.filter(l => l.cote === 'domicile' && l.texte.startsWith('Combinaison :'));
  return <main className="cel" style={{ maxWidth: 1440, margin: '24px auto', padding: 12 }}>
    <p>Aperçu local · le match a démarré avant la sauvegarde du cahier. Aucun résultat de ligue n’est modifié.</p>
    <EditeurCombinaisons combinaisons={plans} mode={mode} enregistrer={async (p, m) => {
      setPlans(p); setMode(m);
      setEtat(actuel => actualiserCahierMatchEnLigne(actuel, 'club-a', { combinaisons: p, modeCombinaisons: m }, debut + minute * 60_000));
      return true;
    }} />
    <section className="cel-panneau" style={{ marginTop: 24 }}>
      <h2>Match local · moteur de la ligue</h2>
      <button className="btn" disabled={etat.termine} onClick={() => {
        const suivante = Math.min(80, minute + 5); setMinute(suivante);
        setEtat(actuel => avancerMatchEnLigne(actuel, debut + suivante * 60_000));
      }}>Avancer de 5 minutes</button>
      <p role="status">{executions.length} combinaison{executions.length > 1 ? 's' : ''} exécutée{executions.length > 1 ? 's' : ''} par ton équipe.</p>
      <DirectCinema match={vue} domicile="Stade Toulousain" exterieur="RC Toulon" couleurs={{ domicile: '#b9473d', exterieur: '#3889cb' }} />
      <details open><summary>Combinaisons jouées par le moteur</summary>{executions.slice(-10).map(l => <p key={l.id}>{l.minute}′ · {l.texte}</p>)}</details>
    </section>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Apercu />);
