// Aperçu des vraies cartes du catalogue et de la fiche de carrière, sans compte de test.
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { CarteJoueurEnLigne } from '../src/components/CarteJoueurEnLigne';
import { FicheJoueur } from '../src/components/FicheJoueur';
import { catalogueBaseCarriere, carteDepuisSource } from '../src/lib/ligue/catalogueCarriere';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import type { CarteCarriere } from '../src/lib/ligue/typesCarriere';
import '../src/index.css';
import '../src/App.css';
import 'flag-icons/css/flag-icons.min.css';

chargerTextes(TEXTES);
const catalogue = catalogueBaseCarriere();
const cartes = ['Nationale', 'Nationale 2', 'Fédérale 1', 'Fédérale 2', 'Fédérale 3', 'Régionale 1', 'Régionale 2', 'Régionale 3']
  .map(championnat => catalogue.find(j => j.championnat === championnat && j.photo?.startsWith('/photos/ffr/')))
  .filter(j => !!j).map(j => carteDepuisSource(j, 'apercu', 'club', 1));
export function Apercu() {
  const [selection, setSelection] = useState<CarteCarriere>();
  return <main style={{ maxWidth: 1250, margin: '32px auto', padding: 24 }}>
    <h1>Nouveaux portraits et postes</h1>
    <p>De la Nationale à la Régionale 3 · Cliquez sur un joueur pour ouvrir sa fiche de carrière.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, marginTop: 28 }}>
      {cartes.map(carte => <article key={carte.id}><h3 style={{ marginBottom: 12 }}>{carte.championnat}</h3><CarteJoueurEnLigne carte={carte} onClick={() => setSelection(carte)} /></article>)}
    </div>
    {selection && <FicheJoueur joueur={{ ...selection, club: selection.clubReel }} onFermer={() => setSelection(undefined)} />}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Apercu />);
