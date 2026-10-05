import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { stockageFichier } from '../serveur/carriereFichier';
import { stockageNeon } from '../serveur/carriereStockage';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { packsPrivesSolo, tirerPackIconesKiri } from '../serveur/packsPrivesSolo';
import { PACK_ICONES_KIRI, ajouterCartesPackSolo } from '../src/lib/packsPrivesSolo';
import { cleCarteSolo } from '../src/lib/collectionSolo';
import { CATALOGUE_ADMIN_VIDE } from '../src/lib/ligue/atelierCatalogue';
import { catalogueSpecial } from '../src/lib/ligue/catalogueSpecial';
import type { EtatBoutiqueCompte } from '../src/lib/boutiqueCompte';

const config = { ...CATALOGUE_ADMIN_VIDE, revision: 1, speciales: { cartes: {
  'icon:dan-carter': { published: true, image: '/photos/carter.webp' },
  'icon:richie-mccaw': { published: true, image: '/photos/mccaw.webp' },
  // Cette ICON en brouillon et les Halloween ne doivent jamais tomber.
  'icon:jonah-lomu': { published: true, image: '/photos/lomu.webp', brouillon: true },
} } };
const cat = catalogueSpecial(config);
const maintenant = Date.now();
assert.equal(packsPrivesSolo('kiri', cat, maintenant)[0].id, PACK_ICONES_KIRI.id);
assert.deepEqual(packsPrivesSolo('autre', cat, maintenant), []);
assert.throws(() => tirerPackIconesKiri('autre', cat, maintenant));
assert.deepEqual(packsPrivesSolo('kiri', catalogueSpecial(CATALOGUE_ADMIN_VIDE), maintenant), []);
assert.throws(() => tirerPackIconesKiri('kiri', catalogueSpecial(CATALOGUE_ADMIN_VIDE), maintenant));
for (let i = 0; i < 200; i++) {
  const cartes = tirerPackIconesKiri('kiri', cat, maintenant);
  assert.equal(cartes.length, 10);
  assert.ok(cartes.every(c => c.speciale?.type === 'icon' && ['icon:dan-carter', 'icon:richie-mccaw'].includes(c.sourceId)));
}

const coffre: EtatBoutiqueCompte = { ovas: 1_000_025, achatsOvas: 1_001_300,
  collectionSolo: { quantites: { ancienne: 2 }, packsOuverts: { bronze: 3 }, doublons: 1, revision: 4 },
  inventaire: ['classique'], skinActif: 'classique', equipements: [], equipementActif: {}, traitsDebloques: [] };
const dossier = mkdtempSync(join(tmpdir(), 'destiny-pack-prive-'));
try {
  const db = stockageFichier(join(dossier, 'base.json'));
  const kiri = randomUUID(), autre = randomUUID();
  await db.creerCompte({ id: kiri, identifiant: 'kiri', pseudo: 'Colin', empreinte: 'inutilisee' });
  await db.creerCompte({ id: autre, identifiant: 'autre', pseudo: 'kiri', empreinte: 'inutilisee' });
  for (const [compte, jeton] of [[kiri, 'kiri-test'], [autre, 'autre-test']]) {
    await db.ouvrirSession(empreinteJeton(jeton), compte, maintenant + 600_000);
    await db.sauvegarderBoutique(compte, coffre);
  }
  assert.ok(await db.atelier!.ecrire(config, 0));
  const autreAvant = await db.boutique(autre);
  const api = creerGestionnaireCarriere(db);
  async function appel(method: string, jeton: string, body?: object, origin = 'http://localhost') {
    let statut = 200, donnees: any;
    const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(x: unknown) { donnees = x; } };
    await api.handler({ method, url: method === 'GET' ? '/api/carriere?packsPrivesSolo=1' : '/api/carriere',
      headers: { host: 'localhost', origin, 'content-type': 'application/json', cookie: jeton ? `destiny_carriere=${jeton}` : '' }, body }, res);
    return { statut, donnees };
  }
  const ouvrir = { action: 'ouvrirPackPriveSolo', pack: PACK_ICONES_KIRI.id };
  assert.equal((await appel('GET', '')).statut, 401);
  assert.deepEqual((await appel('GET', 'autre-test')).donnees.packs, [], 'Le pseudo Kiri ne donne pas accès.');
  assert.equal((await appel('POST', 'autre-test', ouvrir)).statut, 404);
  assert.equal((await appel('POST', '', ouvrir)).statut, 401);
  assert.equal((await appel('POST', 'kiri-test', ouvrir, 'https://evil.example')).statut, 403);
  assert.equal((await appel('POST', 'kiri-test', { ...ouvrir, pack: 'bronze' })).statut, 404);
  assert.equal((await appel('GET', 'kiri-test')).donnees.packs[0].prix, 0);
  const ouvert = await appel('POST', 'kiri-test', { ...ouvrir, cartes: ['reel:joueur'], prix: -1 });
  assert.equal(ouvert.statut, 200);
  assert.equal(ouvert.donnees.cartes.length, 10);
  assert.ok(ouvert.donnees.cartes.every((c: any) => c.speciale?.type === 'icon'));
  const sauvegarde = (await db.boutique(kiri))!;
  assert.equal(sauvegarde.ovas, coffre.ovas, 'Le pack privé est gratuit.');
  assert.equal(sauvegarde.collectionSolo.revision, 5);
  assert.equal(sauvegarde.collectionSolo.quantites.ancienne, 2);
  assert.equal(Object.values(sauvegarde.collectionSolo.quantites).reduce((s, n) => s + n, 0), 12);
  assert.equal(sauvegarde.collectionSolo.packsOuverts[PACK_ICONES_KIRI.id], 1);
  for (const carte of ouvert.donnees.cartes) assert.ok(sauvegarde.collectionSolo.quantites[cleCarteSolo(carte.sourceId)]);
  await db.sauvegarderBoutique(kiri, coffre);
  assert.deepEqual((await db.boutique(kiri))!.collectionSolo, sauvegarde.collectionSolo, 'Une sauvegarde périmée ne retire pas les ICONS.');
  await db.modifierBoutique!(kiri, { collectionSolo: { ...coffre.collectionSolo, quantites: {}, packsOuverts: {} } });
  assert.deepEqual((await db.boutique(kiri))!.collectionSolo, sauvegarde.collectionSolo);
  assert.deepEqual(await db.boutique(autre), autreAvant, 'Aucun changement sur les autres comptes.');
} finally {
  assert.equal(dirname(dossier), tmpdir());
  rmSync(dossier, { recursive: true });
}

if (process.argv.includes('--neon')) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manque');
  const sql = neon(process.env.DATABASE_URL), db = stockageNeon(process.env.DATABASE_URL);
  const compte = randomUUID(), identifiant = `test-pack-prive-${compte}`;
  const cartes = { [cleCarteSolo('icon:dan-carter')]: 6, [cleCarteSolo('icon:richie-mccaw')]: 4 };
  try {
    assert.ok(await db.creerCompte({ id: compte, identifiant, pseudo: 'Test pack privé', empreinte: 'non-connectable' }));
    await db.sauvegarderBoutique(compte, coffre);
    const attendu = ajouterCartesPackSolo(coffre.collectionSolo, PACK_ICONES_KIRI.id, cartes);
    const ouvert = await db.ajouterPackSolo!(compte, PACK_ICONES_KIRI.id, cartes);
    assert.deepEqual(ouvert!.collectionSolo, attendu);
    const autreDb = stockageNeon(process.env.DATABASE_URL);
    await Promise.all([db.ajouterPackSolo!(compte, PACK_ICONES_KIRI.id, cartes), autreDb.ajouterPackSolo!(compte, PACK_ICONES_KIRI.id, cartes)]);
    const trois = (await db.boutique(compte))!;
    const troisAttendus = ajouterCartesPackSolo(ajouterCartesPackSolo(attendu, PACK_ICONES_KIRI.id, cartes), PACK_ICONES_KIRI.id, cartes);
    assert.deepEqual(trois.collectionSolo, troisAttendus, 'Les ouvertures simultanées restent toutes enregistrées.');
    assert.equal(trois.ovas, coffre.ovas);
    await db.sauvegarderBoutique(compte, coffre);
    await db.modifierBoutique!(compte, { collectionSolo: { ...coffre.collectionSolo, quantites: {}, packsOuverts: {} } });
    assert.deepEqual((await db.boutique(compte))!.collectionSolo, troisAttendus);
    console.log('OK — stockage Neon : ajouts atomiques, ouvertures concurrentes et sauvegardes périmées.');
  } finally { await sql`delete from comptes where id=${compte} and identifiant=${identifiant}`; }
}
console.log('OK — 2 000 cartes exclusivement ICONS ; accès authentifié Kiri, gratuité, sauvegarde et autres comptes vérifiés.');
