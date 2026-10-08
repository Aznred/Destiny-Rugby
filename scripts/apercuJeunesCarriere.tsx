/* oxlint-disable react/only-export-components -- aperçu local autonome */
// Toutes les identités de cet aperçu sont inventées. Aucun compte ni sauvegarde réelle n'est écrit.
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { JeunesCarriere } from '../src/components/JeunesCarriere';
import { Manager } from '../src/screens/Manager';
import { useGame } from '../src/store/useGame';
import { creerMondeJeunes, avancerMondeJeunes, enregistrerActionMondeJeune } from '../src/lib/mondeJeunes';
import { synchroniserAcademieReelle } from '../src/lib/formationManager';
import { chargerTextes, definirLangue } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import type { SourceJeuneFfr } from '../src/lib/jeunesFfr';
import type { PosteId } from '../src/types';
import '../src/index.css';
import '../src/App.css';

chargerTextes(TEXTES);
definirLangue('fr');
useGame.persist.setOptions({ name: 'apercu-jeunes34', storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
useGame.setState({ chargerJeunesCarriereManager: async () => {} });
useGame.getState().creerManager({ nom: 'Camille Martin', nation: 'France', club: 'Stade Toulousain' });
const noms = ['Noé Bérard', 'Louis Vidal', 'Martin Arnaud', 'Sacha Perrin', 'Jules Aymard', 'Arthur Fabre', 'Raphaël Coste', 'Elias Roux', 'Adam Clément', 'Paul Verdier', 'Robin Lacombe', 'Alexandre Merle'];
const clubs = ['Stade Toulousain', 'Montauban', 'Colomiers', 'Castres Olympique', 'Bordeaux-Bègles', 'Stade Rochelais'];
const postes: PosteId[] = ['pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g', 'troisieme_aile_g', 'numero_8', 'demi_melee', 'demi_ouverture', 'premier_centre', 'ailier_gauche', 'arriere'];
const sources: SourceJeuneFfr[] = Array.from({ length: 96 }, (_, i) => ({
  id: `apercu34_fictif_${i}`, sourcePlayerId: `apercu34_fictif_${i}`, youthPlayerId: `apercu34_fictif_${i}`,
  nom: `${noms[i % noms.length]} ${Math.floor(i / noms.length) + 1}`, clubSource: clubs[i % clubs.length],
  region: i % clubs.length >= 4 ? 'nouvelleaquitaine' : 'occitanie', age: 14 + i % 6, ageEstime: i % 7 === 0,
  categorie: i % 6 > 3 ? 'Espoirs' : 'U18', poste: postes[i % postes.length], postesSecondaires: i % 5 === 0 ? ['arriere'] : [],
  niveauCompetition: 6 + i % 5, competition: 'Compétition de démonstration', saisonSource: '2025-2026', matchs: 8 + i % 15,
  titularisations: null, apparitionsSenior: i % 8 === 0 ? 3 : 0, surclassement: i % 8 === 0, confiance: .85,
  sourceSeasonHistory: [{ saison: '2025-2026', club: clubs[i % clubs.length], competition: 'Compétition de démonstration', matchs: 8 + i % 15, titularisations: null }],
}));
let monde = creerMondeJeunes(sources, { snapshotId: 'apercu34_fictif', sourceVersion: 'APERÇU_FICTIF', graine: 'carnet-34', saison: 1, annee: 2026 });
monde = enregistrerActionMondeJeune(monde, { id: sources[6].id, saison: 1, type: 'recrutement', club: 'Stade Toulousain' });
monde = avancerMondeJeunes(monde);
const precedent = useGame.getState().manager!;
const manager = { ...precedent, saison: 2, semaine: 6, mondeJeunes: monde,
  installations: { ...precedent.installations, 'Stade Toulousain': { formation: 4, recrutement: 4, entrainement: 4 } },
  jeunesSuivis: { [sources[8].id]: true }, observationsJeunes: { [sources[8].id]: { jeuneId: sources[8].id, matchs: 3, entretien: false, saison: 2 } } };
manager.academie = synchroniserAcademieReelle(manager);
useGame.setState({ manager });

function Apercu() {
  const [mode, setMode] = useState<'formation' | 'recrutement'>(new URLSearchParams(location.search).get('vue') === 'formation' ? 'formation' : 'recrutement');
  const courant = useGame((s) => s.manager)!;
  if (new URLSearchParams(location.search).get('ecran') === 'manager') return <Manager />;
  return <main style={{ padding: 'clamp(12px, 2vw, 28px)', maxWidth: 1480, margin: '0 auto' }}>
    <p style={{ color: 'var(--brume)', fontSize: 12, marginBottom: 12 }}>APERÇU LOCAL · identités fictives · aucune sauvegarde écrite</p>
    <nav style={{ display: 'flex', gap: 8, marginBottom: 18 }}><button className={`btn ${mode === 'recrutement' ? 'primaire' : 'fantome'}`} onClick={() => setMode('recrutement')}>Jeunes à suivre</button><button className={`btn ${mode === 'formation' ? 'primaire' : 'fantome'}`} onClick={() => setMode('formation')}>Centre de formation</button></nav>
    <JeunesCarriere manager={courant} mode={mode} />
  </main>;
}
const racine = createRoot(document.getElementById('root')!);
racine.render(<Apercu />);
if (import.meta.hot) import.meta.hot.dispose(() => racine.unmount());
