// Ne touche qu'à une ligue de test créée ici, supprimée dans finally.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { stockageNeon } from '../serveur/carriereStockage';
import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manque');
const sql = neon(process.env.DATABASE_URL);
const stockage = stockageNeon(process.env.DATABASE_URL);
const autre = stockageNeon(process.env.DATABASE_URL);
const id = randomUUID();
const code = `TEST-${randomUUID()}`;
const cleDebit = `jeu:test-${id}`;
const etat = { id, code, nom: 'Vérification temporaire transfert', version: 1, phase: 'salon', clubs: [], rencontres: [], catalogueRevision: 77,
  transactions: Array.from({ length: 300 }, (_, i) => ({ id: `transaction:${i}`, clubId: 'test', nature: 'pack', ovas: -500, cartes: [], libelle: 'Test', date: '2026-09-11T00:00:00.000Z' })),
} as unknown as EtatCarriereEnLigne;
try {
  assert.ok(await stockage.creerLigue({ id, code, comptes: [], version: 0, etat }));
  const avant = (await stockage.ligue(id))!;
  assert.deepEqual(avant.etat, etat);
  const maj = { ...avant, etat: { ...etat, version: 2, nom: 'Après' } };
  assert.ok(await stockage.comparerEtEcrire(maj, 0, { compte: 'test', requete: 'initiale' }));
  assert.equal(await stockage.comparerEtEcrire(maj, 0, { compte: 'test', requete: 'initiale' }), false);
  assert.deepEqual((await autre.ligue(id))!.etat, maj.etat);
  const copie = (await autre.ligue(id))!; copie.etat.transactions[0].libelle = 'mutation locale';
  assert.equal((await autre.ligue(id))!.etat.transactions[0].libelle, 'Test');
  assert.deepEqual((await autre.ligueParCode(code))!.etat, maj.etat);
  assert.equal((await stockage.verifierCommande!(id, 'test', 'initiale', { version: 2, comptes: [] }))!.dejaTraitee, true);
  assert.deepEqual(await stockage.verifierSondage!(id, randomUUID(), 2, 77, Date.now()), { statut: 'absente' });
  const concurrentes = await Promise.all([
    stockage.comparerEtEcrire({ ...maj, etat: { ...maj.etat, version: 3, nom: 'A' } }, 1, { compte: 'test', requete: 'A' }),
    autre.comparerEtEcrire({ ...maj, etat: { ...maj.etat, version: 3, nom: 'B' } }, 1, { compte: 'test', requete: 'B' }),
  ]);
  assert.equal(concurrentes.filter(Boolean).length, 1);
  const [recus] = await sql`select count(*)::int as n from carriere_commandes where ligue=${id}`;
  assert.equal(recus.n, 2);
  const dernier = (await stockage.ligue(id))!;
  assert.equal(dernier.etat.nom, concurrentes[0] ? 'A' : 'B');
  await sql`update carriere_ligues set donnees=jsonb_set(donnees,'{nom}','"Ancien serveur"'::jsonb),version=version+1 where id=${id}`;
  const [ancien] = await sql`select transfert_version from carriere_ligues where id=${id}`;
  assert.equal(ancien.transfert_version, null);
  const legacy = (await autre.ligue(id))!;
  assert.equal(legacy.etat.nom, 'Ancien serveur');
  assert.ok(await autre.comparerEtEcrire({ ...legacy, etat: { ...legacy.etat, version: 4 } }, legacy.version));
  await sql`delete from carriere_transfert_blocs where ligue=${id} and cle='nom:objet'`;
  const froid = stockageNeon(process.env.DATABASE_URL);
  assert.equal((await froid.ligue(id))!.etat.nom, 'Ancien serveur');
  const maintenant = Date.now();
  const permis = await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 ? stockage : autre).limiter(cleDebit, 7, 3600_000, maintenant)));
  assert.equal(permis.filter(Boolean).length, 7, 'Les réservations ne doivent pas dépasser le plafond partagé');
  const [compteur] = await sql`select nombre from carriere_debits where cle=${cleDebit}`;
  assert.equal(compteur.nombre, 7);
  const courant = Math.floor(maintenant / 3600_000) * 3600_000;
  const [suivante] = await sql`select carriere_reserver_debit(${cleDebit},7,${courant + 3600_000},4) as n`;
  assert.equal(suivante.n, 4);
  const [retard] = await sql`select carriere_reserver_debit(${cleDebit},7,${courant},4) as n`;
  assert.equal(retard.n, 0, 'Un appel retardé ne réinitialise pas la fenêtre courante');
  console.log('OK : lecture exacte, cache isolé, code, double commande, deux écrivains concurrents, ancien serveur et page manquante.');
} finally {
  await sql`delete from carriere_commandes where ligue=${id}`;
  await sql`delete from carriere_ligues where id=${id} and code=${code}`;
  await sql`delete from carriere_debits where cle=${cleDebit}`;
}
