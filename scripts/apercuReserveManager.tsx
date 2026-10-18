import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { CompositionTerrainManager } from '../src/components/CompositionTerrainManager';
import { CadreCompositionManager } from '../src/components/CadreCompositionManager';
import { CarteJoueurEnLigne } from '../src/components/CarteJoueurEnLigne';
import { effectifDuClub } from '../src/lib/effectif';
import { compositionManagerParDefaut } from '../src/lib/compositionManager';
import { rareteCarriere } from '../src/lib/ligue/catalogueCarriere';
import { statistiquesCarte } from '../src/lib/ligue/statistiquesCarte';
import { POSTE_PAR_ID } from '../src/data/rugby';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { useGame } from '../src/store/useGame';
import type { CarteCarriere } from '../src/lib/ligue/typesCarriere';
import '../src/index.css';
import '../src/App.css';

chargerTextes(TEXTES);
useGame.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
useGame.getState().setLangue('fr');
const base = effectifDuClub('Stade Toulousain', 1);
const nombre = Number(new URLSearchParams(location.search).get('nombre') || 223);
const classique = new URLSearchParams(location.search).has('classique');
const effectif = Array.from({ length: nombre }, (_, i) => ({ ...base[i % base.length], id: `reserve-test-${i}`, nom: `Joueur Test ${i}`, photo: undefined, note: 65 + i % 25 }));
const cartes = new Map(effectif.map(j => {
  const famille = POSTE_PAR_ID[j.poste].famille;
  return [j.id, { ...j, sourceId: j.id, famille, clubReel: 'Stade Toulousain', championnat: 'Top 14', pays: 'France', origine: 'professionnel', rarete: rareteCarriere(j.note), statistiques: statistiquesCarte(j.note, famille, j.id), fatigue: 0, matchs: 0, essais: 0, clubs: [] } as CarteCarriere];
}));
export function ApercuReserve() {
  const [composition, changer] = useState(() => compositionManagerParDefaut(effectif));
  return <CadreCompositionManager><CompositionTerrainManager effectif={effectif} composition={composition}
    rendreCarte={classique ? undefined : j => <CarteJoueurEnLigne carte={cartes.get(j.id)!} compacte />}
    onPlacer={(zone, index, id) => changer(c => {
      const suivant = { ...c, titulaires: [...c.titulaires], remplacants: [...c.remplacants] };
      suivant[zone][index] = id; return suivant;
    })}/></CadreCompositionManager>;
}
createRoot(document.getElementById('root')!).render(<ApercuReserve/>);
