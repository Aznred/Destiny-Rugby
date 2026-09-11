import assert from 'node:assert/strict';
import { encoderTransfert, decoderBloc, assemblerTransfert } from '../serveur/transfertCarriere';
const etat = { id: 'ligue-test', absent: undefined, vide: [], nul: null,
  transactions: Array.from({ length: 10_000 }, (_, i) => ({ id: `transaction:${i}`, clubId: 'club', ovas: -500, nature: 'pack', date: '2026-09-11T00:00:00.000Z', libelle: 'Ouverture d’un pack', cartes: [`carte:${i}`] })),
  clubs: [{ id: 'club', ovas: 15000 }], version: 1 };
const initial = encoderTransfert(etat);
const valeurs = new Map(initial.blocs.map(b => [b.empreinte, decoderBloc(b)]));
assert.deepEqual(assemblerTransfert(initial.manifest, (_c, h) => valeurs.get(h)), JSON.parse(JSON.stringify(etat)));
const suite = structuredClone(etat);
suite.transactions.push({ ...suite.transactions[0], id: 'transaction:10000' });
suite.clubs[0].ovas -= 500; suite.version++;
const apres = encoderTransfert(suite);
const nouveaux = apres.blocs.filter(b => initial.manifest.empreintes[b.cle] !== b.empreinte);
assert.equal(nouveaux.filter(b => b.cle.startsWith('transactions:')).length, 1);
assert.equal(nouveaux.length, 3);
assert.throws(() => decoderBloc({ ...initial.blocs[0], empreinte: 'incorrect' }));
const brut = Buffer.byteLength(JSON.stringify(etat));
const compact = Buffer.byteLength(JSON.stringify(initial));
const delta = Buffer.byteLength(JSON.stringify(nouveaux));
assert.ok(compact < brut / 5);
assert.ok(delta < brut / 100);
console.log(`OK : aller-retour exact, tableaux vides, Unicode, corruption rejetée ; ${brut} octets JSON, ${compact} compressés, ${delta} octets de pages modifiées.`);
