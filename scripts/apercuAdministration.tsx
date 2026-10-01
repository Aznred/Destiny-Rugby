import { createRoot } from 'react-dom/client';
import { AdministrationKiri } from '../src/screens/CarriereEnLigne';
import type { AdministrationCarriere } from '../src/lib/ligue/typesCarriere';
import '../src/index.css';
import '../src/App.css';
import '../src/screens/CarriereEnLigne.css';

const vue: AdministrationCarriere = {
  comptes: [
    { id: '00000000-0000-4000-8000-000000000001', identifiant: 'kiri', pseudo: 'Kiri', ligues: 4, creeLe: '2026-09-01T12:00:00Z', vuLe: '2026-10-01T08:00:00Z' },
    { id: '00000000-0000-4000-8000-000000000002', identifiant: 'capitaine.rc', pseudo: 'Camille', ligues: 2, creeLe: '2026-09-15T12:00:00Z', vuLe: '2026-09-30T18:00:00Z' },
    { id: '00000000-0000-4000-8000-000000000003', identifiant: 'joueur_' + 'rugby'.repeat(18), pseudo: 'Léo', ligues: 1 },
  ],
  ligues: [{ id: 'ligue-demo', nom: 'Ligue de démonstration', code: 'DEMO01', phase: 'saison', saison: 1, clubs: 6, createur: 'Camille' }],
  limite: 500, comptesTronques: false, liguesTronquees: false,
};
const charger = async () => vue;
createRoot(document.getElementById('root')!).render(<main className="cel" style={{ maxWidth: 1280, margin: '32px auto', padding: 16 }}>
  <p className="cel-note">Aperçu local · comptes de démonstration.</p>
  <AdministrationKiri charger={charger} observer={async () => {}} occupe={false} />
</main>);
