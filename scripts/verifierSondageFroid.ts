import assert from 'node:assert/strict';
import { creerGestionnaireCarriere } from '../serveur/carriereApi';
import { CATALOGUE_ADMIN_VIDE } from '../src/lib/ligue/atelierCatalogue';
import type { StockageCarriere } from '../serveur/carriereStockage';
const id = 'a0000000-0000-4000-8000-000000000001';
let lectures = 0;
const db = {
  atelier: { lire: async () => ({ ...CATALOGUE_ADMIN_VIDE, revision: 77 }) },
  session: async () => ({ id: 'membre', identifiant: 'test', pseudo: 'Test', empreinte: 'unused' }),
  entete: async () => ({ version: 42, comptes: ['membre'], echeance: Date.now() + 60_000, catalogueRevision: 77 }),
  ligue: async () => { lectures++; throw new Error('Aucune lecture complète ne doit avoir lieu'); },
} as unknown as StockageCarriere;
const api = creerGestionnaireCarriere(db);
let statut = 0, reponse: unknown;
const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(x: unknown) { reponse = x; } };
await api.handler({ method: 'GET', url: `/api/carriere?ligue=${id}&v=42`, headers: { host: 'localhost', cookie: 'destiny_carriere=test' } }, res);
assert.equal(statut, 200); assert.deepEqual(reponse, { inchange: true }); assert.equal(lectures, 0);
db.entete = async () => ({ version: 42, comptes: ['autre'], echeance: Date.now() + 60_000, catalogueRevision: 77 });
await api.handler({ method: 'GET', url: `/api/carriere?ligue=${id}&v=42`, headers: { host: 'localhost', cookie: 'destiny_carriere=test' } }, res);
assert.equal(statut, 404); assert.equal(lectures, 0);
console.log('OK : sondage sans lecture complète dès le démarrage, contrôle des membres conservé.');
