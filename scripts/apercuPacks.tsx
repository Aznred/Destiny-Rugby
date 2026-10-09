// Aperçu local uniquement, absent du build. Aucune connexion ni dépense d'Ovas.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import 'flag-icons/css/flag-icons.min.css';
import '../src/App.css';
import { CarteJoueurEnLigne } from '../src/screens/CarriereEnLigne';
import OuverturePack from '../src/components/OuverturePack';
import { PALIERS_RARETE as PALIERS_PACK } from '../src/lib/presentationPacks';
import { TEXTES } from '../src/data/textes';
import { chargerTextes } from '../src/lib/i18n';
import type { CarteCarriere } from '../src/lib/ligue/typesCarriere';

export function Apercu() {
  const [ouvert, setOuvert] = useState(true);
  const [tiragePret, setTiragePret] = useState(false);
  const params = new URLSearchParams(location.search);
  const attente = params.has('attente');
  const speciale = params.get('special');
  const france = params.has('france');
  useEffect(() => {
    if (!attente) return;
    const timer = window.setTimeout(() => setTiragePret(true), 1500);
    return () => window.clearTimeout(timer);
  }, [attente]);
  const rang = Math.min(4, Math.max(0, Number(params.get('rang') ?? 4)));
  const nombre = Math.min(8, Math.max(1, Number(params.get('cartes') ?? 3)));
  const cartes: CarteCarriere[] = Array.from({ length: nombre }, (_, i) => ({
    id: `apercu-${i}`, sourceId: `demo-${i}`, nom: ['Louis Martin', 'Thomas Durand', 'Antoine Dupont'][i % 3],
    poste: 'demi_melee', famille: 'demi_melee', note: i === nombre - 1 ? 94 : 54 + i * 4,
    potentiel: 96, age: 25, nation: 'France', clubReel: 'Stade Toulousain', championnat: 'Top 14', pays: 'France',
    origine: 'professionnel', rarete: PALIERS_PACK[i === nombre - 1 ? rang : Math.min(rang, i % 3)],
    statistiques: { VIT: 88, PAS: 94, DEF: 81, PHY: 85, PIED: 87, TEC: 96 }, proprietaire: 'demo', fatigue: 0, matchs: 0, essais: 0, clubs: [],
    ...(i === nombre - 1 && speciale ? { speciale: { type: speciale, evenement: speciale === 'icon' ? 'icons' : 'halloween-2026', design: speciale, logo: speciale, animation: 'mythique' as const } } : {}),
    ...(france ? { gender: 'female' as const, clubReel: 'Stade Toulousain', championnat: params.has('elite2seule') ? 'Élite 2 Féminine' : i === nombre - 1 ? 'Élite 1 Féminine' : 'Élite 2 Féminine' } : {}),
  }));
  const base = Math.min(4, Math.max(0, Number(params.get('base') ?? params.get('garantie') ?? 0)));
  const modele = france ? '/m3d/packs-speciaux/f-elite2.glb' : params.get('modele') ? `/m3d/packs-speciaux/${params.get('modele')}.glb` : params.has('skin') ? '/m3d/packs-speciaux/top14.glb' : undefined;
  return ouvert ? <OuverturePack cartes={attente && !tiragePret ? null : cartes} pack={france ? 'Élite 1 et 2 Féminines' : 'Prestige'} modele={modele} evolutionElite={france} apparenceInitiale={PALIERS_PACK[base]} rendreCarte={carte => <CarteJoueurEnLigne carte={carte} />} onFermer={() => setOuvert(false)} /> : <button onClick={() => setOuvert(true)}>Rejouer l’ouverture</button>;
}
chargerTextes(TEXTES);
createRoot(document.getElementById('root')!).render(<Apercu />);
