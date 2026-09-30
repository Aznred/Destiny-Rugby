// Aperçu local : aucune requête ni écriture vers un compte réel.
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { CollectionSolo } from '../src/screens/CollectionSolo';
import { useGame } from '../src/store/useGame';
import { activerSynchronisationBoutiqueCompte } from '../src/lib/synchronisationBoutiqueCompte';
import { appliquerModificationsBoutiqueCompte, type EtatBoutiqueCompte } from '../src/lib/boutiqueCompte';
import { cleCarteSolo, ouvrirPackSolo, packCollectionSolo } from '../src/lib/collectionSolo';
import { catalogueBaseCarriere, PACKS_CARRIERE } from '../src/lib/ligue/catalogueCarriere';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import '../src/index.css';
import '../src/App.css';
chargerTextes(TEXTES);
// Le store réel reste branché sur un stockage mémoire pour cet aperçu :
// les sauvegardes locales du navigateur ne reçoivent jamais les cartes de test.
const memoire = new Map<string, string>();
Object.defineProperty(window, 'localStorage', { configurable: true, value: {
  getItem: (cle: string) => memoire.get(cle) ?? null,
  setItem: (cle: string, valeur: string) => memoire.set(cle, valeur),
  removeItem: (cle: string) => memoire.delete(cle),
  clear: () => memoire.clear(), key: (n: number) => [...memoire.keys()][n] ?? null,
  get length() { return memoire.size; },
} });
const catalogue = catalogueBaseCarriere();
const initial = useGame.getState();
let coffre: EtatBoutiqueCompte = { ovas: 1000, achatsOvas: 0, collectionSolo: {
  quantites: Object.fromEntries(catalogue.slice(0, 69_000).map(c => [cleCarteSolo(c.sourceId), 2])),
  packsOuverts: { bronze: 41_000 }, doublons: 69_000, revision: 0 },
  inventaire: initial.inventaire, skinActif: initial.skinActif, equipements: initial.equipements,
  equipementActif: initial.equipementActif, traitsDebloques: initial.traitsDebloques };
const poids = new TextEncoder().encode(JSON.stringify(coffre)).length;
const appels: number[] = [];
const vraiFetch = window.fetch.bind(window);
window.fetch = async (url, options) => {
  if (!String(url).startsWith('/api/carriere')) return vraiFetch(url, options);
  let contenu: unknown = {};
  if (String(url).includes('catalogueSolo')) contenu = { revision: 0, joueurs: catalogue };
  else if (options?.method === 'POST') {
    const corps = JSON.parse(String(options.body));
    appels.push(new TextEncoder().encode(String(options.body)).length);
    coffre = corps.modifications ? appliquerModificationsBoutiqueCompte(coffre, corps.modifications) : corps.boutique;
    contenu = { boutique: null };
    window.dispatchEvent(new Event('trafic-test'));
  } else contenu = { boutique: coffre };
  return new Response(JSON.stringify(contenu), { status: 200 });
};
export function Apercu() {
  const [, actualiser] = useState(0);
  useEffect(() => {
    const arreter = activerSynchronisationBoutiqueCompte();
    const changer = () => actualiser(n => n + 1);
    window.addEventListener('trafic-test', changer);
    return () => { arreter(); window.removeEventListener('trafic-test', changer); };
  }, []);
  const testerPack = () => useGame.getState().acheterPackCollectionSolo(0,
    etat => ouvrirPackSolo(packCollectionSolo(PACKS_CARRIERE.find(p => p.id === 'bronze')!), catalogue, etat));
  return <><aside style={{ padding: 16, background: '#172a22', position: 'sticky', top: 0, zIndex: 50 }}>
    <strong>Test local · coffre de {poids.toLocaleString('fr-FR')} octets</strong>
    <p role="status">{appels.length} sauvegarde(s) · dernier envoi : {appels.at(-1) ?? 0} octets</p>
    <button className="btn primaire" onClick={testerPack}>Tester un pack de dix cartes</button>{' '}
    <button className="btn fantome" onClick={() => useGame.setState(s => ({ coins: s.coins + 1 }))}>Gagner un Ova</button>
  </aside><CollectionSolo /></>;
}
createRoot(document.getElementById('root')!).render(<Apercu />);
