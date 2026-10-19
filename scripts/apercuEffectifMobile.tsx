// Recette isolée : les cartes et commandes restent en mémoire, sans compte réel.
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { Effectif } from '../src/screens/CarriereEnLigne';
import { catalogueBaseCarriere, carteDepuisSource } from '../src/lib/ligue/catalogueCarriere';
import { creerCarriere, agirCarriere, vueCarriere } from '../src/lib/ligue/carriere';
import type { CommandeCarriere } from '../src/lib/ligue/typesCarriere';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { useGame } from '../src/store/useGame';
import '../src/index.css';
import '../src/App.css';

if (!import.meta.env.DEV) throw new Error('Recette réservée au développement.');
chargerTextes(TEXTES);
useGame.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
const parametres = new URLSearchParams(location.search);
const nombre = Math.min(1000, Math.max(26, Number(parametres.get('nombre')) || 500));
const instant = Date.now(), compte = 'compte-recette-effectif';
const initial = creerCarriere({ id: 'recette-effectif-mobile', code: 'EFFECTIF', nom: 'Recette locale', compteId: compte,
  pseudo: 'Recette', clubNom: 'Club local', rythme: 3, maxClubs: 2, packsGratuitsParJour: 0 }, instant, 'effectif-mobile');
const club = initial.clubs[0];
initial.cartes = catalogueBaseCarriere().slice(0, nombre).map((source, i) => ({
  ...carteDepuisSource(source, initial.id, club.id, 1), id: `carte-mobile-${i}`, nom: `${source.nom} · ${i + 1}`,
  note: 75, favori: i === 25, verrou: i === 26 ? 'vente-recette' : undefined,
}));
club.composition = { titulaires: initial.cartes.slice(0, 15).map(c => c.id), remplacants: initial.cartes.slice(15, 23).map(c => c.id) };
const fetchReel = window.fetch.bind(window);
window.fetch = async (adresse, options) => {
  if (!new URL(String(adresse), location.href).pathname.startsWith('/api/')) return fetchReel(adresse, options);
  if (options?.method === 'POST') throw new Error('Aucune écriture distante dans cette recette.');
  return new Response(JSON.stringify({ groupes: [] }), { status: 200 });
};
export function ApercuEffectif() {
  const [etat, changer] = useState(initial);
  const [commandes, noter] = useState<CommandeCarriere[]>([]);
  const [erreur, signaler] = useState('');
  const [revision, relancer] = useState(0);
  const reinitialiser = (taille: number) => {
    changer({ ...initial, cartes: initial.cartes.slice(0, taille) });
    noter([]); signaler(''); relancer(n => n + 1);
  };
  const agir = async (commande: CommandeCarriere) => {
    try {
      const suite = agirCarriere(etat, compte, commande, instant, `commande-${commandes.length}`);
      changer(suite); noter(avant => [...avant, commande]); return vueCarriere(suite, compte);
    } catch (e) { signaler((e as Error).message); return undefined; }
  };
  return <main className="carriere-en-ligne" style={{ maxWidth: 1280, margin: 'auto', padding: 12, minWidth: 0 }}>
    <p>Recette locale · {etat.cartes.length} cartes · aucune vente réelle</p>
    <button type="button" data-recette="initiale" onClick={() => reinitialiser(nombre)}>Réinitialiser la recette</button>
    <button type="button" data-recette="plancher" onClick={() => reinitialiser(26)}>Effectif au plancher de 26</button>
    <output data-commandes={commandes.length} data-derniere-commande={JSON.stringify(commandes.at(-1))}
      data-effectif={etat.cartes.length} data-disponibles={etat.cartes.filter(c => !c.verrou).length}
      data-ovas={etat.clubs[0].ovas}>{commandes.at(-1)?.type ?? ''}</output>
    {erreur && <p role="alert">{erreur}</p>}
    <Effectif key={revision} vue={vueCarriere(etat, compte)} agir={agir} occupe={false} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<ApercuEffectif />);
