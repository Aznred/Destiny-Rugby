// APERÇU DES CARTES OCTOBRE ROSE — les 23 cartes de la graine, à côté d'une ICON et d'une Halloween.
//
// Ouvrir : /scripts/apercuOctobreRose.html
//
// ⚠️ Dans le jeu, une carte spéciale n'a d'image qu'une fois celle-ci envoyée dans le Labo. Ici, pour juger le
// dessin avec un vrai portrait, chaque carte emprunte le portrait détouré de la joueuse (`public/photos/feminines`).

import { createRoot } from 'react-dom/client';
import '../src/index.css';
// Les drapeaux des cartes : la feuille que `main.tsx` charge pour le jeu (sans elle, la nation n'apparaît pas).
import 'flag-icons/css/flag-icons.min.css';
import '../src/App.css';
import { CarteJoueurEnLigne } from '../src/components/CarteJoueurEnLigne';
import { RubanRose } from '../src/components/EmblemesSpeciaux';
import { chargerTextes, definirLangue } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { carteDepuisSource } from '../src/lib/ligue/catalogueCarriere';
import { assemblerCatalogueSpecial, definitionsDepart, EVENEMENTS_DEPART } from '../src/lib/ligue/catalogueSpecial';

chargerTextes(TEXTES); definirLangue('fr');
const slug = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const DOSSIER: Record<string, string> = { 'Bristol Bears Women': 'pwr/bristol-bears', 'Sale Sharks Women': 'pwr/sale-sharks', 'Gloucester-Hartpury': 'pwr/gloucester-hartpury',
  'Saracens Women': 'pwr/saracens', 'Loughborough Lightning': 'pwr/loughborough-lightning', 'Stade Toulousain': 'elite1/stade-toulousain',
  'Stade Bordelais': 'elite1/stade-bordelais', 'FC Grenoble Amazones': 'elite1/fc-grenoble-amazones' };
const graine = definitionsDepart();
const definitions = [...graine.filter(d => d.cardType === 'octobre-rose'), graine.find(d => d.cardType === 'icon')!, graine.find(d => d.cardType === 'halloween')!]
  .map(d => ({ ...d, image: d.cardType === 'octobre-rose' ? d.image ?? `/photos/feminines/${DOSSIER[d.club]}/${slug(d.nom)}.webp` : undefined }));
const catalogue = assemblerCatalogueSpecial(definitions, EVENEMENTS_DEPART);
const cartes = definitions.map(d => carteDepuisSource(catalogue.sources.get(d.id)!, 'apercu', 'apercu', 0));

createRoot(document.getElementById('root')!).render(<main style={{ padding: 24, maxWidth: 1500, margin: '0 auto' }}>
  <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}><RubanRose taille={34} /> Octobre Rose 2026 <RubanRose taille={20} /></h1>
  <div className="cel-cartes" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 18 }}>
    {cartes.map(c => <CarteJoueurEnLigne key={c.id} carte={c} />)}
  </div>
</main>);
