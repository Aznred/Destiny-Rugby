import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { stockageFichier } from '../serveur/carriereFichier';

const dossier = mkdtempSync(join(tmpdir(), 'destiny-laboratoire-'));
try {
  const db = stockageFichier(join(dossier, 'base.json'));
  const kiri = randomUUID();
  const autre = randomUUID();
  for (const [id, identifiant, pseudo] of [[kiri, 'kiri', 'Kiri'], [autre, 'visiteur', 'Visiteur']] as const) {
    await db.creerCompte({ id, identifiant, pseudo, empreinte: 'test' });
    await db.ouvrirSession(empreinteJeton(id), id, Date.now() + 60_000);
  }
  const api = creerGestionnaireCarriere(db);
  async function appel(jeton: string, url: string, body?: unknown) {
    let statut = 200;
    let donnees: any;
    const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(d: unknown) { donnees = d; } };
    await api.handler({
      method: body ? 'POST' : 'GET', url,
      headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: `destiny_carriere=${jeton}` },
      body,
    }, res);
    return { statut, donnees };
  }

  const premiere = await appel(kiri, '/api/carriere');
  assert.equal(premiere.statut, 200);
  const resume = premiere.donnees.ligues.find((l: any) => l.laboratoire);
  assert.ok(resume, 'Kiri reçoit automatiquement son laboratoire');
  assert.equal(resume.nom, 'Laboratoire Kiri');

  const seconde = await appel(kiri, '/api/carriere');
  assert.equal(seconde.donnees.ligues.filter((l: any) => l.laboratoire).length, 1, 'Les rechargements ne créent pas de doublon');

  const vue = await appel(kiri, `/api/carriere?ligue=${resume.id}`);
  assert.equal(vue.statut, 200);
  assert.equal(vue.donnees.laboratoire, true);
  assert.equal(vue.donnees.rythme, 7);
  assert.equal(vue.donnees.phase, 'saison');
  assert.equal(vue.donnees.clubs.length, 4);
  assert.equal(vue.donnees.clubs.find((c: any) => c.id === vue.donnees.monClubId).ovas, 1_000_000);

  const matchId = vue.donnees.rencontres.find((r: any) => !r.resultat).id;
  const interdit = await appel(autre, '/api/carriere', {
    action: 'commande', ligue: resume.id, requeteId: randomUUID(),
    commande: { type: 'laboratoireLancer', matchId },
  });
  assert.equal(interdit.statut, 404, 'Un autre compte ne peut pas appeler les outils de développement');

  const commander = (commande: unknown) => appel(kiri, '/api/carriere', {
    action: 'commande', ligue: resume.id, requeteId: randomUUID(), commande,
  });
  const lance = await commander({ type: 'laboratoireLancer', matchId });
  assert.equal(lance.statut, 200);
  assert.ok(lance.donnees.rencontres.find((r: any) => r.id === matchId).match, 'Le match part immédiatement');

  const avance = await commander({ type: 'laboratoireMinute', matchId, minute: 40 });
  assert.equal(avance.statut, 200);
  assert.ok(avance.donnees.rencontres.find((r: any) => r.id === matchId).match.horloge >= 40, 'Le chronomètre saute à la minute choisie');

  const termine = await commander({ type: 'laboratoireTerminer', matchId });
  assert.equal(termine.statut, 200);
  assert.ok(termine.donnees.rencontres.find((r: any) => r.id === matchId).resultat, 'La sirène archive immédiatement le résultat');

  const avantCredit = termine.donnees.clubs.find((c: any) => c.id === termine.donnees.monClubId).ovas;
  const credite = await commander({ type: 'laboratoireCrediter' });
  assert.equal(credite.donnees.clubs.find((c: any) => c.id === credite.donnees.monClubId).ovas, avantCredit + 100_000);
  const soigne = await commander({ type: 'laboratoireSoigner' });
  assert.ok(soigne.donnees.cartes.every((c: any) => c.fatigue === 0 && !c.blesseJusqua));

  const reset = await commander({ type: 'laboratoireReinitialiser' });
  assert.equal(reset.statut, 200);
  assert.equal(reset.donnees.rencontres.filter((r: any) => r.resultat).length, 0);
  assert.equal(reset.donnees.clubs.length, 4);
  assert.equal((await appel(kiri, '/api/carriere')).donnees.ligues.filter((l: any) => l.laboratoire).length, 1);

  console.log('OK — laboratoire Kiri unique, saison prête, commandes directes, soins, crédit, remise à zéro et accès privé.');
} finally {
  rmSync(dossier, { recursive: true, force: true });
}
process.exit(0);
