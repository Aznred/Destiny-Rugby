import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { stockageFichier } from '../serveur/carriereFichier';
import { creerCarriere } from '../src/lib/ligue/carriere';

const dossier = mkdtempSync(join(tmpdir(), 'destiny-administration-'));

try {
  const stockage = stockageFichier(join(dossier, 'base.json'));
  const kiri = randomUUID();
  const joueur = randomUUID();
  const intrus = randomUUID();

  await stockage.creerCompte({ id: kiri, identifiant: 'kiri', pseudo: 'Kiri', empreinte: 'test' });
  await stockage.creerCompte({ id: joueur, identifiant: 'joueur', pseudo: 'Camille', empreinte: 'test' });
  await stockage.creerCompte({ id: intrus, identifiant: 'intrus', pseudo: 'Intrus', empreinte: 'test' });
  await stockage.ouvrirSession(empreinteJeton(kiri), kiri, Date.now() + 60_000);
  await stockage.ouvrirSession(empreinteJeton(joueur), joueur, Date.now() + 60_000);
  await stockage.ouvrirSession(empreinteJeton(intrus), intrus, Date.now() + 60_000);

  const ligue = creerCarriere({
    id: randomUUID(),
    nom: 'Ligue de Camille',
    code: 'CAM123',
    compteId: joueur,
    pseudo: 'Camille',
    clubNom: 'Camille RC',
    rythme: 1,
    maxClubs: 2,
  }, Date.now(), 'administration-kiri');
  await stockage.creerLigue({ id: ligue.id, code: ligue.code, version: 0, comptes: [joueur], etat: ligue });

  const api = creerGestionnaireCarriere(stockage);
  async function appeler(compte: string, url = '/api/carriere?administration=1') {
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

  assert.equal((await appeler(joueur)).statut, 404, 'Un joueur ordinaire ne doit pas voir le répertoire');
  const reponse = await appeler(kiri);
  assert.equal(reponse.statut, 200);
  assert.deepEqual(reponse.donnees.comptes.map((c: { pseudo: string }) => c.pseudo).sort(), ['Camille', 'Intrus', 'Kiri']);
  const compteJoueur = reponse.donnees.comptes.find((c: { id: string }) => c.id === joueur);
  assert.equal(compteJoueur.ligues, 1);
  assert.ok(compteJoueur.creeLe && compteJoueur.vuLe, 'Les dates de création et de dernière connexion sont disponibles');
  assert.equal(reponse.donnees.ligues[0].nom, 'Ligue de Camille');
  assert.equal(reponse.donnees.ligues[0].createur, 'Camille');
  assert.equal(JSON.stringify(reponse.donnees).includes('empreinte'), false);
  assert.equal(JSON.stringify(reponse.donnees).includes('identifiant'), false);

  const observation = await appeler(kiri, `/api/carriere?ligue=${ligue.id}`);
  assert.equal(observation.statut, 200, 'Kiri doit pouvoir ouvrir une ligue sans la rejoindre');
  assert.equal(observation.donnees.observateur, true);
  assert.equal(observation.donnees.monClubId, '');
  assert.deepEqual(observation.donnees.objectifs, []);
  assert.deepEqual(observation.donnees.transactions, []);
  assert.ok(observation.donnees.clubs.every((c: Record<string, unknown>) => !('composition' in c) && !('strategie' in c)), 'La vue observateur ne doit pas exposer les tactiques privées');
  assert.equal((await appeler(intrus, `/api/carriere?ligue=${ligue.id}`)).statut, 404, 'Un autre non-membre reste refusé');
  console.log('OK — le répertoire et le mode observateur sont réservés à Kiri, sans données privées.');
} finally {
  rmSync(dossier, { recursive: true, force: true });
}

process.exit(0);
