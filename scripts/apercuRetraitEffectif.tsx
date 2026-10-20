import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FicheClub } from '../src/components/FicheClub';
import { clubParNom } from '../src/data/clubs';
import { catalogueBaseCarriere } from '../src/lib/ligue/catalogueCarriere';
import { fournirCatalogueEffectifs } from '../src/lib/catalogueEffectifs';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import '../src/index.css';
import '../src/App.css';
chargerTextes(TEXTES);
const nom = 'Le Relecq Kerhuon Rugby';
const catalogue = catalogueBaseCarriere();
fournirCatalogueEffectifs(catalogue);
window.fetch = async () => new Response('{}', {status: 503});
export function ApercuRetrait() {
  const [ouverte, changer] = useState(true);
  return <main style={{padding: 16}}>
    <p>Vérification locale du retrait de l’effectif, sans compte distant.</p>
    <output data-catalogue={catalogue.filter(c => c.clubReel === nom).length} />
    <button onClick={() => changer(true)}>Ouvrir le club</button>
    {ouverte && <FicheClub club={clubParNom(nom)!} saison={1} onFermer={() => changer(false)} />}
  </main>;
}
createRoot(document.getElementById('root')!).render(<ApercuRetrait />);
