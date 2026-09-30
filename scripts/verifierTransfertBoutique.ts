// Compte temporaire indépendant ; les données réelles restent en lecture seule.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { neon, neonConfig } from '@neondatabase/serverless';
import { stockageNeon } from '../serveur/carriereStockage';
import { differencesBoutiqueCompte, validerModificationsBoutiqueCompte, type EtatBoutiqueCompte } from '../src/lib/boutiqueCompte';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manque');
const sql = neon(process.env.DATABASE_URL);
const db = stockageNeon(process.env.DATABASE_URL);
const autre = stockageNeon(process.env.DATABASE_URL);
const compte = randomUUID();
let mesure = false, entres = 0, sortis = 0;
const ancienFetch = neonConfig.fetchFunction;
neonConfig.fetchFunction = async (...args: Parameters<typeof fetch>) => {
  const mesurer = mesure;
  const resultat = await fetch(...args);
  if (mesurer) { entres += Buffer.byteLength(String(args[1]?.body)); sortis += (await resultat.clone().arrayBuffer()).byteLength; }
  return resultat;
};
const coffre: EtatBoutiqueCompte = { ovas: 100, achatsOvas: 0,
  collectionSolo: { quantites: Object.fromEntries(Array.from({ length: 69_000 }, (_, i) => [`joueur:${i.toString(36)}-abcdefgh`, 2])),
    packsOuverts: { bronze: 41_000 }, doublons: 350_000, revision: 0 },
  inventaire: ['classique'], skinActif: 'classique', equipements: [], equipementActif: {}, traitsDebloques: [] };
try {
  assert.ok(await db.creerCompte({ id: compte, identifiant: `test-transfert-${compte}`, pseudo: 'Test transfert', empreinte: 'non-connectable' }));
  await db.sauvegarderBoutique(compte, coffre);
  const suite = { ...coffre, ovas: 95, collectionSolo: { ...coffre.collectionSolo,
    quantites: { ...coffre.collectionSolo.quantites, 'joueur:0-abcdefgh': 3 },
    packsOuverts: { bronze: 41_001 }, doublons: 350_001 } };
  const delta = differencesBoutiqueCompte(coffre, suite);
  assert.ok(validerModificationsBoutiqueCompte(delta));
  assert.ok(Buffer.byteLength(JSON.stringify(delta)) < 250);
  mesure = true;
  assert.equal(await db.modifierBoutique!(compte, delta), null);
  mesure = false;
  assert.ok(entres < 12_000 && sortis < 500, `Neon transfère encore trop : ${entres}/${sortis}`);
  assert.ok(isDeepStrictEqual(await db.boutique(compte), suite), 'Le delta doit conserver exactement les 69 000 cartes et les autres champs.');
  await db.modifierBoutique!(compte, delta);
  assert.ok(isDeepStrictEqual((await db.boutique(compte))!.collectionSolo, suite.collectionSolo), 'Répéter un delta ne double pas les cartes.');
  await Promise.all([
    db.modifierBoutique!(compte, { achatsOvas: 0, collectionSolo: { quantites: { 'joueur:1-abcdefgh': 3 }, packsOuverts: {}, doublons: 350_002, revision: 0 } }),
    autre.modifierBoutique!(compte, { achatsOvas: 0, collectionSolo: { quantites: { 'joueur:2-abcdefgh': 4 }, packsOuverts: {}, doublons: 350_003, revision: 0 } }),
  ]);
  const apres = (await db.boutique(compte))!;
  assert.equal(apres.collectionSolo.quantites['joueur:1-abcdefgh'], 3);
  assert.equal(apres.collectionSolo.quantites['joueur:2-abcdefgh'], 4);
  await db.modifierBoutique!(compte, { collectionSolo: { quantites: { 'joueur:0-abcdefgh': 0 }, packsOuverts: { bronze: 0 }, doublons: 350_003, revision: 0 } });
  assert.equal((await db.boutique(compte))!.collectionSolo.quantites['joueur:0-abcdefgh'], undefined);
  assert.equal((await db.boutique(compte))!.collectionSolo.packsOuverts.bronze, undefined);
  // Simuler l'état d'un échange déjà validé dans le seul compte de test.
  await sql`update compte_boutique set donnees=jsonb_set(donnees,'{collectionSolo,revision}','3'::jsonb) where compte=${compte}`;
  const conflit = await db.modifierBoutique!(compte, delta);
  assert.equal(conflit!.collectionSolo.revision, 3);
  assert.equal(conflit!.collectionSolo.quantites['joueur:0-abcdefgh'], undefined, 'Le delta périmé ne réintroduit pas la carte cédée.');
  assert.equal(await db.modifierBoutique!(compte, { skinActif: 'non-possede' }), undefined);
  assert.equal(await db.modifierBoutique!(compte, { equipementActif: { crampons: 'non-possede' } }), undefined);
  await sql`update compte_boutique set donnees=donnees || '{"achatsOvas":100,"ovas":195,"inventaire":["classique","skin-jaune"],"achatsInventaire":["skin-jaune"]}'::jsonb where compte=${compte}`;
  const credit = await db.modifierBoutique!(compte, { ovas: 90, achatsOvas: 0, inventaire: ['classique'] });
  assert.equal(credit!.ovas, 190);
  assert.ok(credit!.inventaire.includes('skin-jaune'));
  for (const invalide of [{ ovas: -1 }, { collectionSolo: { quantites: { x: -1 }, packsOuverts: {}, doublons: 0, revision: 0 } }, { achatsInventaire: ['x'] }]) {
    assert.equal(validerModificationsBoutiqueCompte(invalide), null);
  }
  console.log(`OK — 69 000 cartes conservées, delta client ${Buffer.byteLength(JSON.stringify(delta))} octets ; Neon ${entres} entrants/${sortis} sortants ; idempotence, concurrence, suppression, échange périmé et achat crédité vérifiés.`);
} finally {
  neonConfig.fetchFunction = ancienFetch;
  await sql`delete from comptes where id=${compte} and identifiant=${`test-transfert-${compte}`}`;
}
