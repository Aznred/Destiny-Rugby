import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { stockageFichier } from '../serveur/carriereFichier.js';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi.js';
import { contexteAtelier } from '../serveur/atelierAdmin.js';
import { catalogueMondialCarriere } from '../src/lib/ligue/catalogueCarriere.js';
import { catalogueSpecial, carteSurMarcheAutorisee, carteEchangeAutorise } from '../src/lib/ligue/catalogueSpecial.js';
import { carteSeniorAutorisee } from '../src/lib/ligue/eligibiliteJoueurs.js';
import { migrerCartesJeunesse } from '../src/lib/ligue/migrationJeunesse.js';
import { cleCarteSolo, normaliserCollectionSolo } from '../src/lib/collectionSolo.js';
import { definirRetraitsCartesSolo } from '../src/lib/ligue/atelierCatalogue.js';
import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere.js';

const fichier = join(mkdtempSync(join(tmpdir(), 'destiny-retraits-')), 'base.json');
const db = stockageFichier(fichier), kiri = randomUUID(), autre = randomUUID();
for (const [id, identifiant] of [[kiri, 'kiri'], [autre, 'autre']]) {
  await db.creerCompte({ id, identifiant, pseudo: 'kiri', empreinte: 'test' });
  await db.ouvrirSession(empreinteJeton(id), id, Date.now() + 600_000);
}
const api = creerGestionnaireCarriere(db);
async function appel(compte: string, body?: unknown, q = '', origin = 'http://localhost', publique = false) {
  let statut = 200, donnees: any;
  const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(d: unknown) { donnees = d; } };
  await api.handler({ method: body ? 'POST' : 'GET', url: publique ? '/api/carriere?catalogueSolo=1' : `/api/carriere?atelier=1&section=retraitsCartes&q=${encodeURIComponent(q)}`,
    headers: { host: 'localhost', origin, 'content-type': 'application/json', cookie: compte ? `destiny_carriere=${compte}` : '' }, body }, res);
  return { statut, donnees };
}
assert.equal((await appel('')).statut, 401);
assert.equal((await appel(autre)).statut, 404, 'Le pseudo Kiri ne donne pas accès');
const source = catalogueMondialCarriere()[0];
let vue = await appel(kiri, undefined, source.nom);
assert.equal(vue.statut, 200);
assert.ok(vue.donnees.cartes.some((c: any) => c.sourceId === source.sourceId));
const retrait = { action: 'atelier', operation: 'retirerCarte', revision: vue.donnees.revision, sourceId: source.sourceId, confirmation: source.sourceId, motif: 'Motif confidentiel de test' };
assert.equal((await appel(autre, retrait)).statut, 404);
assert.equal((await appel(kiri, retrait, '', 'https://evil.example')).statut, 403);
for (const invalide of [{ ...retrait, revision: -1 }, { ...retrait, confirmation: '' }, { ...retrait, motif: '' }, { ...retrait, sourceId: '__proto__', confirmation: '__proto__' }]) {
  assert.notEqual((await appel(kiri, invalide)).statut, 200);
}
assert.equal((await appel(kiri, retrait)).statut, 200);
const config = await stockageFichier(fichier).atelier!.lire();
assert.equal(config.retraitsCartes?.[source.sourceId].motif, retrait.motif);
assert.notEqual((await appel(kiri, { ...retrait, revision: config.revision })).statut, 200, 'Un double clic ne répète pas le retrait');
vue = await appel(kiri, undefined, source.nom);
assert.ok(vue.donnees.retraits.some((r: any) => r.sourceId === source.sourceId));
assert.ok(vue.donnees.cartes.every((r: any) => r.sourceId !== source.sourceId));
const publique = await appel('', undefined, '', 'http://localhost', true);
assert.equal(publique.statut, 200);
assert.ok(publique.donnees.retraitsCartes.includes(source.sourceId));
assert.ok(!JSON.stringify(publique.donnees).includes(retrait.motif), 'Le motif reste réservé à Kiri');
contexteAtelier.run(config, () => {
  assert.ok(catalogueMondialCarriere().every(c => c.sourceId !== source.sourceId));
  assert.equal(carteSeniorAutorisee(source, 'mixed'), false);
  assert.equal(carteSeniorAutorisee({ ...source, sourceId: 'homonyme-distinct' }, 'mixed'), true);
  assert.equal(carteSurMarcheAutorisee(source, true), false);
  assert.equal(carteEchangeAutorise(source, true), false);
  const carte = { ...source, id: 'ancienne-carte', proprietaire: 'club-test', gender: 'female' as const };
  const club = { id: 'club-test', ovas: 100, composition: { titulaires: [carte.id], remplacants: [], capitaineId: carte.id } };
  const etat = { id: 'test', cartes: [carte], clubs: [club], transactions: [], ventes: [], echanges: [], rencontres: [], histoire: [] } as unknown as EtatCarriereEnLigne;
  migrerCartesJeunesse(etat, Date.now());
  assert.equal(etat.cartes[0].retiree, true);
  assert.equal(etat.cartes[1].gender, 'female');
  assert.ok(etat.cartes[1].note >= carte.note);
  assert.equal(club.composition.titulaires[0], etat.cartes[1].id);
  migrerCartesJeunesse(etat, Date.now()); assert.equal(etat.cartes.length, 2);
  assert.equal(normaliserCollectionSolo({ quantites: { [cleCarteSolo(source.sourceId)]: 2 } }).quantites[cleCarteSolo(source.sourceId)], undefined);
});
definirRetraitsCartesSolo([source.sourceId]);
assert.equal(carteSeniorAutorisee(source, 'mixed'), false, 'Le client solo applique les retraits synchronisés');
definirRetraitsCartesSolo([]);
const speciale = [...catalogueSpecial().sources.values()][0];
assert.ok(speciale, 'Une carte spéciale est disponible pour le test');
vue = await appel(kiri, undefined, speciale.nom);
assert.ok(vue.donnees.cartes.some((c: any) => c.sourceId === speciale.sourceId));
assert.equal((await appel(kiri, { ...retrait, revision: config.revision, sourceId: speciale.sourceId, confirmation: speciale.sourceId })).statut, 200);
const finale = await db.atelier!.lire();
contexteAtelier.run(finale, () => assert.equal(catalogueSpecial().sources.has(speciale.sourceId), false));
const reintegre = await appel(kiri, { action: 'atelier', operation: 'reintegrerCarte', revision: finale.revision, sourceId: speciale.sourceId });
assert.equal(reintegre.statut, 200);
const restaure = await db.atelier!.lire();
contexteAtelier.run(restaure, () => assert.equal(catalogueSpecial().sources.has(speciale.sourceId), true));
console.log('Retraits : droits Kiri, recherche, validation, concurrence, persistance, confidentialité, cartes normales/spéciales, réintégration, marché, collection et compensation idempotente validés.');
