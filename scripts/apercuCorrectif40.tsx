// APERÇU DU CORRECTIF 40 — la fiche d'une joueuse dans la composition d'une ligue en ligne.
//
// Dix-huit VRAIES cartes de joueuses tirées du catalogue (`apercuCorrectif40.json` : douze championnats, dont AC Bobigny 93,
// des joueuses avec et sans portrait, et Bethan LEWIS — dont le nom ressemble à celui d'un joueur) et cinq joueurs, dans la
// composition du jeu. Ce qu'on doit voir en ouvrant une fiche : le portrait de la carte (ou la silhouette d'une joueuse),
// l'écusson de son club, et le logo de sa ligue — exactement comme pour un joueur.
//
//   /scripts/apercuCorrectif40.html             la composition (toucher une carte ouvre sa fiche)
//   /scripts/apercuCorrectif40.html?vue=cartes  les cartes seules, côte à côte
import { createRoot } from 'react-dom/client';
import { Composition } from '../src/screens/CarriereEnLigne';
import { CarteJoueurEnLigne } from '../src/components/CarteJoueurEnLigne';
import { POSTES_XV_MANAGER } from '../src/lib/compositionManager';
import type { CarteCarriere, VueCarriereEnLigne } from '../src/lib/ligue/typesCarriere';
import '../src/index.css';
import '../src/App.css';
import '../src/screens/CarriereEnLigne.css';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import 'flag-icons/css/flag-icons.min.css';
import joueuses from './apercuCorrectif40.json';
chargerTextes(TEXTES);

const STATS = { VIT: 80, PAS: 80, JDP: 80, DEF: 80, PHY: 80, END: 80 };
const JOUEURS = ([
  ['Antoine DUPONT', 'demi_melee', 95, 'Stade Toulousain'], ['Romain NTAMACK', 'demi_ouverture', 90, 'Stade Toulousain'],
  ['Grégory ALLDRITT', 'numero_8', 91, 'Stade Rochelais'], ['Louis BIELLE-BIARREY', 'ailier_gauche', 90, 'Union Bordeaux-Bègles'],
  ['Joueur Sans Portrait', 'pilier_droit', 71, 'Stade Toulousain'],
] as const).map(([nom, poste, note, clubReel]) => ({
  sourceId: `reel:${nom}`, nom, poste, note, potentiel: 92, age: 27, nation: 'France', clubReel, championnat: 'Top 14', pays: 'France',
  rarete: note > 85 ? 'star' : 'or', statistiques: STATS, origine: 'professionnel',
}));
const cartes = [...joueuses, ...JOUEURS].map((c, i) => ({ ...c, id: `apercu-${i}`, proprietaire: 'apercu', fatigue: 10, forme: 80, verrou: false })) as unknown as CarteCarriere[];

// Chaque carte à son poste quand il est libre, sinon au premier poste libre : toutes les fiches peuvent s'ouvrir.
const pris = new Set<string>();
const titulaires = POSTES_XV_MANAGER.map((poste) => {
  const carte = cartes.find((c) => c.poste === poste && !pris.has(c.id)) ?? cartes.find((c) => !pris.has(c.id))!;
  pris.add(carte.id);
  return carte.id;
});
const remplacants = cartes.filter((c) => !pris.has(c.id)).slice(0, 8).map((c) => c.id);
const vue = {
  monClubId: 'apercu', cartes, playerPool: 'mixed',
  clubs: [{ id: 'apercu', composition: { titulaires, remplacants, capitaineId: titulaires[8], buteurId: titulaires[9] } }],
} as unknown as VueCarriereEnLigne;

const seules = new URLSearchParams(location.search).get('vue') === 'cartes';
createRoot(document.getElementById('root')!).render(seules
  ? <main className="page cel"><div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', padding: 16 }}>{cartes.map((c) => <div key={c.id} style={{ width: 178 }}><CarteJoueurEnLigne carte={c} /></div>)}</div></main>
  : <main className="page cel"><Composition vue={vue} agir={async () => null} occupe={false} /></main>);
