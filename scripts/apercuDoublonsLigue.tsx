import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Composition } from '../src/screens/CarriereEnLigne';
import { agirCarriere, vueCarriere } from '../src/lib/ligue/carriere';
import { identiteJoueur } from '../src/lib/ligue/cartesSpeciales';
import type { CommandeCarriere } from '../src/lib/ligue/typesCarriere';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { useGame } from '../src/store/useGame';
import { creerRecetteDoublons, COMPTE_RECETTE, INSTANT_RECETTE } from './recettePacksDoublonsLigue';
import '../src/index.css';
import '../src/App.css';
import 'flag-icons/css/flag-icons.min.css';

if (!import.meta.env.DEV) throw new Error('Recette réservée au développement.');
chargerTextes(TEXTES);
useGame.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
const fetchReel = window.fetch.bind(window);
window.fetch = async (url, options) => {
  if (!new URL(String(url), location.href).pathname.startsWith('/api/')) return fetchReel(url, options);
  if (options?.method === 'POST') throw new Error('Aucune écriture distante dans cette recette.');
  return new Response(JSON.stringify({ groupes: [] }), { status: 200 });
};
export function ApercuDoublonsLigue() {
  const [etat, changer] = useState(() => creerRecetteDoublons().etat);
  const [revision, relancer] = useState(0), [commandes, noter] = useState(0), [erreur, signaler] = useState('');
  const agir = async (commande: CommandeCarriere) => {
    try {
      const suite = agirCarriere(etat, COMPTE_RECETTE, commande, INSTANT_RECETTE, `recette-${commandes}`);
      changer(suite); noter(n => n + 1); signaler(''); return vueCarriere(suite, COMPTE_RECETTE);
    } catch (e) { signaler((e as Error).message); return undefined; }
  };
  const feuille = [...etat.clubs[0].composition.titulaires, ...etat.clubs[0].composition.remplacants];
  return <main style={{ maxWidth: 1280, margin: 'auto', padding: 8 }}>
    <p>Recette locale · composition réelle · aucune modification de compte</p>
    <button id="reinitialiser" className="btn" onClick={() => { changer(creerRecetteDoublons().etat); noter(0); signaler(''); relancer(n => n + 1); }}>Réinitialiser la recette</button>
    <output data-commandes={commandes} data-feuille={JSON.stringify(feuille)} data-identites={JSON.stringify(feuille.map(id => identiteJoueur(etat.cartes.find(c => c.id === id)!)))} />
    <section className="cel"><Composition key={revision} vue={vueCarriere(etat, COMPTE_RECETTE)} agir={agir} occupe={false} erreur={erreur} /></section>
  </main>;
}
createRoot(document.getElementById('root')!).render(<ApercuDoublonsLigue />);
