// Mesure les corps HTTP réellement reçus du pilote Neon, enveloppes comprises.
// Les données et le compte de test sont créés ici et supprimés dans finally.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { neon, neonConfig } from '@neondatabase/serverless';
import { stockageNeon } from '../serveur/carriereStockage';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { creerCarriere, agirCarriere } from '../src/lib/ligue/carriere';
import type { VueCarriereEnLigne } from '../src/lib/ligue/typesCarriere';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manque');
const sql = neon(process.env.DATABASE_URL);
const id = randomUUID(), compte = randomUUID(), code = `TEST-${randomUUID().slice(0, 8)}`, jeton = randomUUID();
const api = () => { const db = stockageNeon(process.env.DATABASE_URL!); db.push = undefined; return creerGestionnaireCarriere(db); };
const principal = api(), spectateur = api();
const resultats: Record<string, { octets: number; requetes: number; appels: number }> = {};
let phase = '';
const originalFetch = neonConfig.fetchFunction;
neonConfig.fetchFunction = async (...args: Parameters<typeof fetch>) => {
  const contexte = phase;
  const r = await fetch(...args);
  if (contexte) {
    const taille = (await r.clone().arrayBuffer()).byteLength;
    resultats[contexte].octets += taille; resultats[contexte].requetes++;
  }
  return r;
};
async function appel(service: ReturnType<typeof api>, nom: string, body?: object, version?: number) {
  resultats[nom] ??= { octets: 0, requetes: 0, appels: 0 }; phase = nom;
  let statut = 0; let donnees: any;
  const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(x: unknown) { donnees = x; } };
  try {
    await service.handler({ method: body ? 'POST' : 'GET', url: `/api/carriere?ligue=${id}${version == null ? '' : `&v=${version}`}`,
      headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: `destiny_carriere=${jeton}` }, body }, res);
    assert.equal(statut, 200, JSON.stringify(donnees));
    resultats[nom].appels++; return donnees as VueCarriereEnLigne & { inchange?: boolean };
  } finally { phase = ''; }
}
try {
  const db = stockageNeon(process.env.DATABASE_URL);
  await db.creerCompte({ id: compte, identifiant: `test-${compte}`, pseudo: 'Test capacité', empreinte: 'test-non-connectable' });
  await db.ouvrirSession(empreinteJeton(jeton), compte, Date.now() + 3600_000);
  let etat = creerCarriere({ id, code, nom: 'Test capacité temporaire', compteId: compte, pseudo: 'Test', clubNom: 'Test RFC', rythme: 1, maxClubs: 4 }, Date.now(), 'capacite');
  for (let i = 0; i < 3; i++) etat = agirCarriere(etat, randomUUID(), { type: 'rejoindre', pseudo: `Test ${i}`, clubNom: `Test ${i}` }, Date.now(), `capacite-${i}`);
  etat = agirCarriere(etat, compte, { type: 'demarrerSaison' }, Date.now(), 'saison');
  etat.clubs[0].ovas = 1_000_000;
  etat.transactions.push(...Array.from({ length: 10_000 }, (_, i) => ({
    id: `historique-test:${i}`, clubId: etat.clubs[i % 4].id, nature: 'pack' as const, ovas: -500,
    cartes: [`carte-historique:${i}`], libelle: 'Ouverture de pack : historique de capacité', date: '2026-09-10T12:00:00.000Z',
    meta: { packId: 'premium', packNom: 'Premium', meilleureNote: 74, meilleurJoueur: `Joueur historique ${i}` },
  })));
  assert.ok(await db.creerLigue({ id, code, etat, comptes: etat.clubs.map(c => c.compteId), version: 0 }));
  assert.ok(await db.comparerEtEcrire({ id, code, etat, comptes: etat.clubs.map(c => c.compteId), version: 0 }, 0));
  let vue = await appel(principal, 'initialisation');
  await appel(spectateur, 'initialisation');
  for (let i = 0; i < 12; i++) {
    vue = await appel(principal, 'commande_chaude', { action: 'commande', ligue: id, requeteId: randomUUID(), commande: { type: 'ouvrirPack', packId: 'premium' } });
    await appel(spectateur, 'lecture_autre_instance');
    const inchange = await appel(principal, 'sondage_inchange', undefined, vue.version);
    assert.ok(inchange.inchange);
  }
  await appel(api(), 'demarrage_froid');
  const moyennes = Object.fromEntries(Object.entries(resultats).map(([k,v]) => [k, { ...v, octetsParAppel: Math.ceil(v.octets / v.appels), requetesParAppel: +(v.requetes / v.appels).toFixed(2) }]));
  const N = 1200, commandes = 20_000, jours = 30;
  const chaud = moyennes.commande_chaude.octetsParAppel, lecture = moyennes.lecture_autre_instance.octetsParAppel;
  const rapport = { date: new Date().toISOString(), methode: 'Corps HTTP Neon reçus (enveloppes incluses, hors en-têtes/TLS ; pas une mesure de facturation ni un test de débit à 1200 ligues).',
    fixture: { clubs: 4, transactionsHistoriques: 10000, commandesMesurees: 12, commande: 'ouvrirPack premium' },
    mesures: moyennes,
    projection: { ligues: N, commandesParLigueParJour: commandes, jours, plafondGo: 500,
      budgetOctetsParCommandeAvantLectures: 500e9 / (N * commandes * jours),
      commandesChaudesSeulesGo: +(chaud * N * commandes * jours / 1e9).toFixed(1),
      commandesEtUneLectureAutreInstanceGo: +((chaud + lecture) * N * commandes * jours / 1e9).toFixed(1),
      avertissement: 'Ces projections excluent notamment sessions supplémentaires, autres écrans, matchs, réveils, croissance du journal et démarrages à froid.' } };
  writeFileSync('serveur/mesure-capacite-db.json', JSON.stringify(rapport, null, 2) + '\n');
  console.log(JSON.stringify(rapport, null, 2));
} finally {
  phase = ''; neonConfig.fetchFunction = originalFetch;
  await sql`delete from carriere_commandes where ligue=${id}`;
  await sql`delete from carriere_ligues where id=${id} and code=${code}`;
  await sql`delete from sessions where compte=${compte}`;
  await sql`delete from carriere_debits where cle=${`jeu:${compte}`}`;
  await sql`delete from comptes where id=${compte} and identifiant=${`test-${compte}`}`;
}
