import assert from 'node:assert/strict';
import { appliquerModificationsBoutiqueCompte, type EtatBoutiqueCompte } from '../src/lib/boutiqueCompte';

const fenetre = new EventTarget();
Object.defineProperty(globalThis, 'window', { value: fenetre, configurable: true });
const valeurs = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (cle: string) => valeurs.get(cle) ?? null,
  setItem: (cle: string, valeur: string) => valeurs.set(cle, valeur),
  removeItem: (cle: string) => valeurs.delete(cle),
}, configurable: true });
const { useGame } = await import('../src/store/useGame');
const { activerSynchronisationBoutiqueCompte, appliquerCollectionSoloDistante, attendreBoutiqueSoloEnregistree } = await import('../src/lib/synchronisationBoutiqueCompte');
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
const tailles: number[] = [];
const contenus: Record<string, any>[] = [];
let echouerProchaine = false;
const attendreEcritures = async (nombre: number, delai = 2500) => {
  const fin = Date.now() + delai;
  while (ecritures < nombre && Date.now() < fin) await pause(25);
  assert.equal(ecritures, nombre, `Attente de ${nombre} sauvegardes.`);
};
globalThis.fetch = (async (url, options) => {
  if (String(url).includes('echangesSolo')) { lecturesOffres++; await pause(20); return reponse({ offres: [], total: 0 }); }
  if (options?.method !== 'POST') return reponse({ boutique: coffre });
  ecritures++;
  const corps = JSON.parse(String(options.body));
  contenus.push(corps); tailles.push(Buffer.byteLength(String(options.body)));
  coffre = corps.modifications ? appliquerModificationsBoutiqueCompte(coffre, corps.modifications) : corps.boutique;
  if (echouerProchaine) { echouerProchaine = false; throw new Error('Accusé perdu pour le test'); }
  await new Promise<void>(resolve => { finir = resolve; });
  return reponse({ boutique: ecritures === 1 ? null : coffre });
}) as typeof fetch;
coffre = { ...coffre, collectionSolo: { ...coffre.collectionSolo,
  quantites: Object.fromEntries(Array.from({ length: 69_000 }, (_, i) => [`joueur:${i.toString(36)}-abcdefgh`, 2])) } };
const poidsComplet = Buffer.byteLength(JSON.stringify(coffre));
const arreter = activerSynchronisationBoutiqueCompte();
await pause(30);
try {
  const depart = useGame.getState().coins;
  for (let i = 1; i <= 20; i++) useGame.setState({ coins: depart + i });
  await attendreEcritures(1);
  assert.equal(ecritures, 1, 'Vingt gains rapprochés font une seule sauvegarde.');
  assert.ok(tailles[0] < 200, 'Un gain de monnaie ne doit pas transmettre les 69 000 cartes.');
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
  await attendreEcritures(2);
  useGame.setState({ coins: depart + 20 });
  finir!(); await attendreEcritures(3);
  assert.equal(ecritures, 3, 'Un retour au montant initial pendant une écriture doit être sauvegardé après elle.');
  finir!(); await pause(550);
  assert.equal(ecritures, 3, 'Le coffre stabilisé arrête ses requêtes.');

  useGame.setState({ coins: depart + 22 });
  await attendreEcritures(4);
  coffre = { ...coffre, collectionSolo: { ...coffre.collectionSolo, revision: 3 } };
  appliquerCollectionSoloDistante(coffre.collectionSolo);
  finir!(); await pause(550);
  assert.equal(ecritures, 4, 'Un échange reçu pendant un POST ne crée pas de sauvegarde supplémentaire.');
  assert.equal(useGame.getState().collectionSolo.revision, 3);

  const collection = useGame.getState().collectionSolo;
  useGame.setState({ collectionSolo: { ...collection, quantites: { ...collection.quantites, 'joueur:0-abcdefgh': 3 },
    packsOuverts: { ...collection.packsOuverts, bronze: 1 }, doublons: collection.doublons + 1 } });
  await attendreEcritures(5);
  assert.equal(ecritures, 5);
  assert.equal(Object.keys(contenus.at(-1)!.modifications.collectionSolo.quantites).length, 1);
  assert.ok(tailles.at(-1)! < 350, 'Un pack envoie uniquement la carte et le compteur modifiés.');
  const taillePack = tailles.at(-1)!;
  finir!(); await pause(550);
  assert.equal(ecritures, 5, 'La collection volumineuse ne provoque pas de boucle après son accusé.');
  assert.equal(coffre.collectionSolo.quantites['joueur:1-abcdefgh'], 2, 'Les cartes non envoyées sont conservées.');

  // Un crédit Stripe arrivant pendant un POST doit s'ajouter au gain local.
  useGame.setState(s => ({ coins: s.coins + 1 }));
  await attendreEcritures(6);
  const montantEnvoye = coffre.ovas;
  useGame.setState(s => ({ coins: s.coins + 5 }));
  useGame.setState(s => ({ inventaire: [...s.inventaire, 'skin-local'] }));
  coffre = { ...coffre, ovas: coffre.ovas + 100, achatsOvas: 100, inventaire: [...coffre.inventaire, 'skin-cadeau'], achatsInventaire: ['skin-cadeau'] };
  finir!(); await attendreEcritures(7);
  assert.equal(useGame.getState().coins, montantEnvoye + 105);
  assert.equal(useGame.getState().achatsOvas, 100);
  assert.ok(useGame.getState().inventaire.includes('skin-local') && useGame.getState().inventaire.includes('skin-cadeau'));
  finir!(); await pause(550);
  assert.equal(coffre.ovas, montantEnvoye + 105);
  assert.ok(coffre.inventaire.includes('skin-local') && coffre.inventaire.includes('skin-cadeau'));
  assert.equal(ecritures, 7, 'Le crédit concurrent est acquitté une fois et le gain restant une fois.');

  echouerProchaine = true;
  useGame.setState(s => ({ coins: s.coins + 1 }));
  await attendreEcritures(8);
  await pause(1000);
  assert.equal(ecritures, 8, 'Une erreur réseau ne déclenche pas une boucle immédiate.');
  await attendreEcritures(9, 6000);
  finir!(); await pause(650);
  assert.equal(ecritures, 9, 'La sauvegarde attendue est reprise puis acquittée une seule fois.');

  await Promise.all([listerEchangesSolo(), listerEchangesSolo(), listerEchangesSolo()]);
  assert.equal(lecturesOffres, 1, 'Des rafraîchissements simultanés partagent une lecture du marché.');
  useGame.setState(s => ({ collectionSolo: { ...s.collectionSolo,
    quantites: { ...s.collectionSolo.quantites, 'joueur:2-abcdefgh': 3 } } }));
  let preparee = false;
  const preparation = attendreBoutiqueSoloEnregistree().then(() => { preparee = true; });
  await attendreEcritures(10);
  assert.equal(preparee, false, 'Le pack serveur attend la confirmation du pack local.');
  useGame.setState(s => ({ coins: s.coins + 1 }));
  finir!();
  await attendreEcritures(11);
  assert.equal(preparee, false, 'Les changements arrivés pendant la sauvegarde sont aussi enregistrés.');
  finir!(); await preparation;
  assert.equal(preparee, true);
  assert.equal(coffre.collectionSolo.quantites['joueur:2-abcdefgh'], 3);
  echouerProchaine = true;
  useGame.setState(s => ({ coins: s.coins + 1 }));
  await assert.rejects(attendreBoutiqueSoloEnregistree(), /Impossible de sauvegarder/,
    'Une sauvegarde non confirmée doit empêcher l’ouverture du pack serveur.');
  console.log(`OK — coffre de ${poidsComplet} octets : gain ${tailles[0]} octets, pack ${taillePack} octets ; navigation/trade sans POST, crédit concurrent conservé, reprise espacée après accusé perdu.`);
} finally { arreter(); }
