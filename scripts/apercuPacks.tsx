// Aperçu local uniquement, absent du build. Aucune connexion ni dépense d'Ovas.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import 'flag-icons/css/flag-icons.min.css';
import '../src/App.css';
import { CarteJoueurEnLigne } from '../src/screens/CarriereEnLigne';
import OuverturePack from '../src/components/OuverturePack';
import { PALIERS_PACK } from '../src/lib/presentationPacks';
import type { CarteCarriere } from '../src/lib/ligue/typesCarriere';

export function Apercu() {
  const [ouvert, setOuvert] = useState(true);
  const params = new URLSearchParams(location.search);
  const rang = Math.min(4, Math.max(0, Number(params.get('rang') ?? 4)));
  const nombre = Math.min(8, Math.max(1, Number(params.get('cartes') ?? 3)));
  const cartes: CarteCarriere[] = Array.from({ length: nombre }, (_, i) => ({
    id: `apercu-${i}`, sourceId: `demo-${i}`, nom: ['Louis Martin', 'Thomas Durand', 'Antoine Dupont'][i % 3],
    poste: 'demi_melee', famille: 'demi_melee', note: i === nombre - 1 ? 94 : 54 + i * 4,
    potentiel: 96, age: 25, nation: 'France', clubReel: 'Stade Toulousain', championnat: 'Top 14', pays: 'France',
    origine: 'professionnel', rarete: PALIERS_PACK[i === nombre - 1 ? rang : Math.min(rang, i % 3)],
    statistiques: { VIT: 88, PAS: 94, DEF: 81, PHY: 85, PIED: 87, TEC: 96 }, proprietaire: 'demo', fatigue: 0, matchs: 0, essais: 0, clubs: [],
  }));
  return ouvert ? <OuverturePack cartes={cartes} pack="Prestige" garantie={params.has('garantie') ? PALIERS_PACK[Math.min(rang, Math.max(0, Number(params.get('garantie'))))] : undefined} rendreCarte={carte => <CarteJoueurEnLigne carte={carte} />} onFermer={() => setOuvert(false)} /> : <button onClick={() => setOuvert(true)}>Rejouer l’ouverture</button>;
}
createRoot(document.getElementById('root')!).render(<Apercu />);
