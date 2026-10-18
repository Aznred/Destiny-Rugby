import { Profiler, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Selecteur, type OptionSelecteur } from '../src/components/Selecteur';
import { chargerTextes, definirLangue, nombre, tn } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import '../src/index.css';
import '../src/App.css';

chargerTextes(TEXTES);
definirLangue('fr');
let lectures = 0;
const options: OptionSelecteur[] = Array.from({ length: 2000 }, (_, i) => ({
  valeur: String(i), get label() { lectures++; return i === 0 ? 'Facile' : `Équipe ${i}`; },
  groupe: i < 1000 ? 'France' : 'Angleterre', sous: i === 37 ? 'Béziers' : `Club ${i}`,
  recherche: i === 37 ? 'Hérault' : '',
}));
let actualiser: (nouvelleSource?: boolean) => void;
let choisirLangue: (langue: 'fr' | 'en') => void;
let changerValeur: (valeur: string) => void;
const rendus: number[] = [];
export function Banc() {
  const [valeur, setValeur] = useState('0');
  const [compteur, setCompteur] = useState(0);
  const [liste, setListe] = useState(options);
  actualiser = nouvelleSource => { setCompteur(c => c + 1); if (nouvelleSource) setListe([...options]); };
  changerValeur = setValeur;
  choisirLangue = langue => { definirLangue(langue); actualiser(); };
  return <main style={{ maxWidth: 600, padding: 20, margin: 'auto' }}>
    <h1>Grandes listes · aperçu sans sauvegarde</h1>
    <p>Passage {compteur} · choix <output id="choix">{valeur}</output></p>
    <label htmlFor="equipes">Deux mille équipes</label>
    <Selecteur id="equipes" options={liste} valeur={valeur} onChange={setValeur} recherche />
    <button id="autre" onClick={() => setValeur('1999')}>Choisir la dernière équipe</button>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Profiler id="listes" onRender={(_id, _phase, duree) => rendus.push(duree)}><Banc /></Profiler>);
Object.assign(window, { __bancOptimisation: {
  mesurer(nouvelleSource = false) {
    lectures = 0; rendus.length = 0;
    for (let i = 0; i < 8; i++) flushSync(() => actualiser(nouvelleSource));
    return { lectures, rendus: [...rendus] };
  },
  choisirLangue: (langue: 'fr' | 'en') => flushSync(() => choisirLangue(langue)),
  changerValeur: (valeur: string) => flushSync(() => changerValeur(valeur)),
  mesurerNombres() {
    const debut = performance.now();
    let sortie = '';
    for (let i = 0; i < 5000; i++) sortie = nombre(i / 3) + tn('gen.match', i % 3);
    return { duree: performance.now() - debut, sortie };
  },
} });
