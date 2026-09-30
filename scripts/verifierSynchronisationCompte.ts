import assert from 'node:assert/strict';
import type { EtatBoutiqueCompte } from '../src/lib/boutiqueCompte';

const fenetre = new EventTarget();
Object.defineProperty(globalThis, 'window', { value: fenetre, configurable: true });
const valeurs = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (cle: string) => valeurs.get(cle) ?? null,
  setItem: (cle: string, valeur: string) => valeurs.set(cle, valeur),
  removeItem: (cle: string) => valeurs.delete(cle),
}, configurable: true });
const { useGame } = await import('../src/store/useGame');
const { activerSynchronisationBoutiqueCompte, appliquerCollectionSoloDistante } = await import('../src/lib/synchronisationBoutiqueCompte');
const { listerEchangesSolo } = await import('../src/lib/carriereEnLigneClient');
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const reponse = (contenu: unknown) => new Response(JSON.stringify(contenu), { status: 200 });
const s = useGame.getState();
let coffre: EtatBoutiqueCompte = {
  ovas: s.coins, achatsOvas: 0, collectionSolo: s.collectionSolo,
  inventaire: s.inventaire, skinActif: s.skinActif, equipements: s.equipements,
  equipementActif: s.equipementActif, traitsDebloques: s.traitsDebloques,
};
let ecritures = 0;
let lecturesOffres = 0;
let finir: (() => void) | undefined;
globalThis.fetch = (async (url, options) => {
  if (String(url).includes('echangesSolo')) { lecturesOffres++; await pause(20); return reponse({ offres: [], total: 0 }); }
  if (options?.method !== 'POST') return reponse({ boutique: coffre });
  ecritures++;
  coffre = JSON.parse(String(options.body)).boutique;
  await new Promise<void>(resolve => { finir = resolve; });
  return reponse({ boutique: ecritures === 1 ? null : coffre });
}) as typeof fetch;
const arreter = activerSynchronisationBoutiqueCompte();
await pause(30);
try {
  const depart = useGame.getState().coins;
  for (let i = 1; i <= 20; i++) useGame.setState({ coins: depart + i });
  await pause(550);
  assert.equal(ecritures, 1, 'Vingt gains rapprochés font une seule sauvegarde.');
  for (let i = 0; i < 100; i++) useGame.setState({ ecran: i % 2 ? 'accueil' : 'collectionSolo' });
  finir!(); await pause(550);
  assert.equal(ecritures, 1, 'Les changements de navigation pendant un POST ne le répètent pas.');

  coffre = { ...coffre, collectionSolo: { ...coffre.collectionSolo, revision: 2 } };
  appliquerCollectionSoloDistante(coffre.collectionSolo);
  await pause(550);
  assert.equal(ecritures, 1, 'Un échange déjà enregistré ne provoque aucune sauvegarde du coffre.');
  appliquerCollectionSoloDistante({ ...coffre.collectionSolo, revision: 1 });
  assert.equal(useGame.getState().collectionSolo.revision, 2, 'Une ancienne réponse ne remplace pas un échange récent.');

  useGame.setState({ coins: depart + 21 });
  await pause(550);
  useGame.setState({ coins: depart + 20 });
  finir!(); await pause(30);
  assert.equal(ecritures, 3, 'Un retour au montant initial pendant une écriture doit être sauvegardé après elle.');
  finir!(); await pause(550);
  assert.equal(ecritures, 3, 'Le coffre stabilisé arrête ses requêtes.');

  useGame.setState({ coins: depart + 22 });
  await pause(550);
  coffre = { ...coffre, collectionSolo: { ...coffre.collectionSolo, revision: 3 } };
  appliquerCollectionSoloDistante(coffre.collectionSolo);
  finir!(); await pause(550);
  assert.equal(ecritures, 4, 'Un échange reçu pendant un POST ne crée pas de sauvegarde supplémentaire.');
  assert.equal(useGame.getState().collectionSolo.revision, 3);

  await Promise.all([listerEchangesSolo(), listerEchangesSolo(), listerEchangesSolo()]);
  assert.equal(lecturesOffres, 1, 'Des rafraîchissements simultanés partagent une lecture du marché.');
  console.log('OK — gains regroupés, aucun POST de navigation ou de réception de trade, réponse périmée rejetée, modification concurrente conservée, lectures du marché mutualisées.');
} finally { arreter(); }
