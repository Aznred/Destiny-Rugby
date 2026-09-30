/* oxlint-disable react/only-export-components -- aperçu local de développement */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EditeurCombinaisons } from '../src/components/EditeurCombinaisons';
import { creerCombinaison, type Combinaison } from '../src/lib/ligue/combinaisons';
import '../src/index.css';
import '../src/App.css';
import '../src/screens/CarriereEnLigne.css';
function Apercu() {
  const [plans, setPlans] = useState<Combinaison[]>([creerCombinaison('apercu-melee'), creerCombinaison('apercu-touche', 'touche')]);
  const [mode, setMode] = useState<'automatique' | 'configure'>('configure');
  return <main className="cel" style={{ maxWidth: 1440, margin: '24px auto', padding: 12 }}><EditeurCombinaisons combinaisons={plans} mode={mode} enregistrer={async (p, m) => { setPlans(p); setMode(m); return true; }} /></main>;
}
createRoot(document.getElementById('root')!).render(<Apercu />);
