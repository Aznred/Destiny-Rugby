// Plateau de tournage : la VRAIE ouverture de pack du jeu (composant OuverturePack, cartes du catalogue), sans écrire de partie.
//   /trailer/enquete/plateau.html?lang=en&noms=KOLISI,POLLARD,KOLBE&pack=Springboks&modele=/m3d/packs-speciaux/springboks.glb
// Même principe que trailer/capture-2026-10-12/plateau.tsx, avec les cartes et le pack passés dans l'adresse.
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import '../../src/App.css';
import 'flag-icons/css/flag-icons.min.css';
import { CarteJoueurEnLigne } from '../../src/components/CarteJoueurEnLigne';
import OuverturePack from '../../src/components/OuverturePack';
import { catalogueBaseCarriere, carteDepuisSource } from '../../src/lib/ligue/catalogueCarriere';
import { chargerTextes, definirLangue } from '../../src/lib/i18n';
import { TEXTES } from '../../src/data/textes';
import { useGame } from '../../src/store/useGame';

const p = new URLSearchParams(location.search);
chargerTextes(TEXTES); definirLangue(p.get('lang') === 'en' ? 'en' : 'fr');
useGame.persist.setOptions({ name: 'tournage-local', storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
const catalogue = catalogueBaseCarriere();
const noms = (p.get('noms') || 'RAMOS,JALIBERT,DUPONT').split(',');
// Pour un nom porté par plusieurs joueurs, la carte la mieux notée.
const selection = noms.map(nom => catalogue.filter(c => c.nom.toUpperCase().includes(nom.toUpperCase())).sort((a, b) => b.note - a.note)[0]);
if (selection.some(c => !c)) throw new Error('Carte demandée absente du catalogue');
const cartes = selection.map(c => carteDepuisSource(c!, 'tournage', 'tournage', 0));
(window as unknown as { __provenance: unknown }).__provenance = cartes.map(c => ({ sourceId: c.sourceId, nom: c.nom, note: c.note, rarete: c.rarete }));
createRoot(document.getElementById('root')!).render(
  <OuverturePack cartes={cartes} pack={p.get('pack') || 'Top 14'} modele={p.get('modele') || '/m3d/packs-speciaux/top14.glb'} apparenceInitiale="star"
    rendreCarte={c => <CarteJoueurEnLigne carte={c} />} onFermer={() => {}} />,
);
