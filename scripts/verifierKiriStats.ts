import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { stockageFichier } from '../serveur/carriereFichier';
import { creerCarriere } from '../src/lib/ligue/carriere';
import type { TransactionCarriere, VenteCarriere } from '../src/lib/ligue/typesCarriere';

const dossier = mkdtempSync(join(tmpdir(), 'destiny-kiri-stats-'));

try {
  const stockage = stockageFichier(join(dossier, 'base.json'));
  const kiri = randomUUID();
  const joueur1 = randomUUID();
  const joueur2 = randomUUID();

  await stockage.creerCompte({ id: kiri, identifiant: 'kiri', pseudo: 'Kiri', empreinte: 'test' });
  await stockage.creerCompte({ id: joueur1, identifiant: 'joueur1', pseudo: 'Alice', empreinte: 'test' });
  await stockage.creerCompte({ id: joueur2, identifiant: 'joueur2', pseudo: 'Bob', empreinte: 'test' });

  await stockage.ouvrirSession(empreinteJeton(kiri), kiri, Date.now() + 60_000);
  await stockage.ouvrirSession(empreinteJeton(joueur1), joueur1, Date.now() + 60_000);

  // Vérification de la limite administration = 2000
  const admin = await stockage.administration();
  assert.equal(admin.limite, 2000, 'La limite administration doit être de 2000');

  // Création de 2 ligues avec packs et ventes
  const ligue1 = creerCarriere({
    id: randomUUID(),
    nom: 'Top 14 Elite',
    code: 'TOP14',
    compteId: joueur1,
    pseudo: 'Alice',
    clubNom: 'Toulouse RC',
    rythme: 1,
    maxClubs: 4,
  }, Date.now(), 'kiri-stats-test');

  const ligue2 = creerCarriere({
    id: randomUUID(),
    nom: 'Premiership Rugby',
    code: 'PREM1',
    compteId: joueur2,
    pseudo: 'Bob',
    clubNom: 'Saracens RC',
    rythme: 1,
    maxClubs: 4,
  }, Date.now(), 'kiri-stats-test');

  // Ajout de transactions packs sur ligue1
  const tPack1: TransactionCarriere = {
    id: randomUUID(),
    clubId: ligue1.clubs[0].id,
    nature: 'pack',
    ovas: -1000,
    cartes: [],
    libelle: 'Pack Or',
    date: new Date().toISOString(),
    meta: { packNom: 'Pack Or', meilleureNote: 90, meilleurJoueur: 'Dupont', packApparence: 'or' },
  };
  const tPack2: TransactionCarriere = {
    id: randomUUID(),
    clubId: ligue1.clubs[0].id,
    nature: 'pack',
    ovas: -500,
    cartes: [],
    libelle: 'Pack Argent',
    date: new Date().toISOString(),
    meta: { packNom: 'Pack Argent', meilleureNote: 82, meilleurJoueur: 'Ntamack', packApparence: 'argent' },
  };
  ligue1.transactions.push(tPack1, tPack2);

  // Ajout de vente sur ligue1
  const vente1: VenteCarriere = {
    id: randomUUID(),
    carteId: randomUUID(),
    vendeurId: randomUUID(),
    acheteurId: ligue1.clubs[0].id,
    type: 'directe',
    prix: 25000,
    expireLe: new Date().toISOString(),
    etat: 'vendue',
    joueurNom: 'Antoine Dupont',
  };
  ligue1.ventes.push(vente1);

  // Ajout d'un pack sur ligue2
  const tPack3: TransactionCarriere = {
    id: randomUUID(),
    clubId: ligue2.clubs[0].id,
    nature: 'pack',
    ovas: -300,
    cartes: [],
    libelle: 'Pack Bronze',
    date: new Date().toISOString(),
    meta: { packNom: 'Pack Bronze', meilleureNote: 75, meilleurJoueur: 'Smith', packApparence: 'bronze' },
  };
  ligue2.transactions.push(tPack3);

  // Ajout d'un club pour Alice (joueur1) sur ligue2 pour tester le cumul multi-ligues
  const clubAliceLigue2Id = randomUUID();
  ligue2.clubs.push({
    id: clubAliceLigue2Id,
    compteId: joueur1,
    pseudo: 'Alice',
    nom: 'Toulouse UK',
    ovas: 1000,
    cartes: [],
    composition: { titulaires: [], remplacants: [] },
    strategie: {} as any,
    rejointLe: new Date().toISOString(),
  });
  ligue2.transactions.push({
    id: randomUUID(),
    clubId: clubAliceLigue2Id,
    nature: 'pack',
    ovas: -500,
    cartes: [],
    libelle: 'Pack Argent',
    date: new Date().toISOString(),
  });

  await stockage.creerLigue({ id: ligue1.id, code: ligue1.code, version: 0, comptes: [joueur1], etat: ligue1 });
  await stockage.creerLigue({ id: ligue2.id, code: ligue2.code, version: 0, comptes: [joueur2, joueur1], etat: ligue2 });

  // Test de statistiquesGlobales
  const stats = await stockage.statistiquesGlobales();
  assert.equal(stats.ligues, 2);
  assert.equal(stats.packsOuverts, 4);
  assert.equal(stats.ovasDepensesPacks, 2300);
  assert.equal(stats.volumeMarche, 25000);

  // Vérification des Top 10 cumulés par compte
  assert.ok(Array.isArray(stats.topOuvreurs), 'topOuvreurs doit être un tableau');
  assert.equal(stats.topOuvreurs.length, 2);
  // Alice a ouvert 2 packs sur ligue1 + 1 pack sur ligue2 = 3 packs cumulés sur son compte
  assert.equal(stats.topOuvreurs[0].pseudo, 'Alice');
  assert.equal(stats.topOuvreurs[0].packs, 3);
  assert.equal(stats.topOuvreurs[0].ligue, 'Top 14 Elite (+1)');
  // Bob a ouvert 1 pack sur ligue2
  assert.equal(stats.topOuvreurs[1].pseudo, 'Bob');
  assert.equal(stats.topOuvreurs[1].packs, 1);
  assert.equal(stats.topOuvreurs[1].ligue, 'Premiership Rugby');

  assert.ok(Array.isArray(stats.topLiguesPacks), 'topLiguesPacks doit être un tableau');
  assert.equal(stats.topLiguesPacks.length, 2);
  assert.equal(stats.topLiguesPacks[0].ligue, 'Top 14 Elite');
  assert.equal(stats.topLiguesPacks[0].packs, 2);
  assert.equal(stats.topLiguesPacks[1].ligue, 'Premiership Rugby');
  assert.equal(stats.topLiguesPacks[1].packs, 2);

  assert.ok(Array.isArray(stats.topVentes), 'topVentes doit être un tableau');
  assert.equal(stats.topVentes.length, 1);
  assert.equal(stats.topVentes[0].joueur, 'Antoine Dupont');
  assert.equal(stats.topVentes[0].montant, 25000);
  assert.equal(stats.topVentes[0].pseudo, 'Alice');

  // Test via HTTP API
  const api = creerGestionnaireCarriere(stockage);
  async function appeler(compte: string, url: string) {
    let statut = 200;
    let donnees: any;
    const res = {
      status(n: number) { statut = n; return res; },
      setHeader() {},
      json(d: unknown) { donnees = d; },
    };
    await api.handler({
      method: 'GET',
      url,
      headers: { host: 'localhost', cookie: `destiny_carriere=${compte}` },
    }, res);
    return { statut, donnees };
  }

  // Joueur ordinaire n'a pas accès
  const rJoueur = await appeler(joueur1, '/api/carriere?statistiques=globales');
  assert.equal(rJoueur.statut, 404, 'Joueur ordinaire ne peut pas voir Kiri stats');

  // Kiri a accès
  const rKiri = await appeler(kiri, '/api/carriere?statistiques=globales');
  assert.equal(rKiri.statut, 200, 'Kiri accède aux statistiques globales');
  assert.equal(rKiri.donnees.packsOuverts, 4);
  assert.equal(rKiri.donnees.topOuvreurs.length, 2);
  assert.equal(rKiri.donnees.topLiguesPacks.length, 2);
  assert.equal(rKiri.donnees.topVentes.length, 1);

  const rAdmin = await appeler(kiri, '/api/carriere?administration=1');
  assert.equal(rAdmin.statut, 200);
  assert.equal(rAdmin.donnees.limite, 2000, 'API administration doit retourner limite: 2000');

  console.log('OK — Tous les tests de Kiri stats (Top 10 Packeurs, Top 10 Ligues, Top 10 Ventes, Limite 2000) sont validés !');
} finally {
  rmSync(dossier, { recursive: true, force: true });
}

process.exit(0);
