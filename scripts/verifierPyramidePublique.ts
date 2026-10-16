import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { positionPoule, capaciteDivision, monteeMaximum } from '../src/lib/ligue/pyramidePublique.js';
import { planifierPyramide, type EquipePyramide } from '../serveur/divisionsPubliques.js';
import { actualiserEloPublic } from '../serveur/eloPublic.js';
import { creerDivisionPublique, vueCarriere } from '../src/lib/ligue/carriere.js';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi.js';
import { stockageFichier } from '../serveur/carriereFichier.js';
import { creerPyramidePublique } from '../serveur/pyramidePublique.js';
import { codePoule } from '../serveur/pyramideStockage.js';
import { fournirPoolFfr } from '../src/lib/ligue/eligibiliteJoueurs.js';
import { pyramideLocale, pyramideSql, type BasePyramideLocale } from '../serveur/pyramideStockage.js';
import type { LigueStockee, StockageCarriere } from '../serveur/carriereStockage.js';
import { onlineRules, standingsStatuses } from '../src/lib/competitionRules.js';

const poolTest = { pool: 'mixed' as const, joueurs: [] as const };
fournirPoolFfr(() => poolTest);
const generer = (nombre: number): EquipePyramide[] => Array.from({ length: nombre }, (_, i) => ({
  ...positionPoule(Math.floor(i / 16) + 1), clubId: 'club-' + i, compteId: String(i).padStart(8, '0'), ligueId: 'ligue-' + Math.floor(i / 16),
  nom: 'Club ' + i, rang: i % 16 + 1, points: 100 - i % 16 * 4, joues: 30, gagnes: 22 - i % 16, nuls: 0,
  perdus: 8 + i % 16, pour: 700 - i % 16 * 10, contre: 550, difference: 150 - i % 16 * 10, bonus: 0, elo: 1800 - i % 16 * 10,
}));
assert.deepEqual(positionPoule(3), { division: 2, poule: 2 });
assert.deepEqual(positionPoule(512), { division: 10, poule: 1 });
assert.deepEqual(positionPoule(6250), { division: 10, poule: 5739 });
assert.equal(standingsStatuses(onlineRules({ publique: { division: 1 } }), 16).filter(s => s === 'DIRECT_RELEGATION').length, 4);
assert.equal(standingsStatuses(onlineRules({ publique: { division: 2 } }), 16).filter(s => s === 'PROMOTION').length, 2);
assert.ok(!standingsStatuses(onlineRules({ publique: { division: 2 } }), 16).includes('ACCESS_MATCH'));
assert.ok(!standingsStatuses(onlineRules({ publique: { division: 10, derniereDivision: true } }), 16).includes('DIRECT_RELEGATION'));
for (const [nombre, derniere] of [[1000, 6], [10000, 10], [100000, 10]]) {
  const equipes = generer(nombre), debut = performance.now(), plans = planifierPyramide(equipes);
  assert.equal(Math.max(...plans.map(p => p.division)), derniere);
  assert.equal(plans.flatMap(p => p.equipes).length, nombre);
  assert.equal(new Set(plans.flatMap(p => p.equipes.map(e => e.compteId))).size, nombre);
  assert.equal(plans.filter(p => p.division === 1).length, 1);
  assert.equal(plans[0].equipes.length, 16);
  assert.equal(plans.length, Math.ceil(nombre / 16), JSON.stringify(Array.from({ length: derniere }, (_, i) => plans.filter(p => p.division === i + 1).map(p => p.equipes.length))));
  assert.ok(plans.every(p => p.equipes.length <= 16));
  assert.ok(plans.filter(p => p.equipes.length < 16).length <= 1);
  for (let d = 1; d <= 10; d++) assert.ok(plans.filter(p => p.division === d).flatMap(p => p.equipes).length <= capaciteDivision(d));
  assert.deepEqual(new Set(plans[0].equipes.filter(e => e.division === 1).map(e => e.rang)), new Set(Array.from({ length: 12 }, (_, i) => i + 1)));
  assert.equal(plans[0].equipes.filter(e => e.division === 2 && e.rang <= 2).length, 4);
  for (const p of plans) for (const e of p.equipes) { assert.ok(e.division - p.division <= 3); assert.ok(p.division - e.division <= 1); }
  console.log(nombre + ' équipes : ' + plans.length + ' poules, D' + derniere + ', ' + Math.round(performance.now() - debut) + ' ms');
}
const exceptionnelles = generer(1000);
console.log('Vérification des promotions accélérées…');
const champion = exceptionnelles.find(e => e.division === 6 && e.rang === 1)!;
Object.assign(champion, { elo: 2500, points: 150, gagnes: 30, perdus: 0, difference: 900 });
assert.equal(monteeMaximum(1, 30, 30, 900, 2500, 1600), 3);
assert.equal(planifierPyramide(exceptionnelles).find(p => p.equipes.some(e => e.compteId === champion.compteId))?.division, 3);
assert.throws(() => planifierPyramide([champion, champion]), /plusieurs poules/);

const maintenant = Date.now(), id = randomUUID(), compte = randomUUID();
console.log('Vérification de la reprise des Elo…');
const ancien = creerDivisionPublique({ id, code: 'DR-PUBLIC-C0-D3', compteId: compte, pseudo: 'Ancien', clubNom: 'Club conservé' }, 0, 3, maintenant, 'elo-test');
delete ancien.publique!.poule; ancien.publique!.division = 3; delete ancien.publique!.eloDepart;
delete ancien.clubs[0].eloPublic;
const autre = structuredClone(ancien.clubs[0]); autre.id = 'adversaire'; autre.compteId = randomUUID(); autre.nom = 'Adversaire';
ancien.clubs.push(autre);
ancien.rencontres.push({ id: 'ancien-match', competitionId: 'ancien-championnat', journee: 1, domicile: ancien.clubs[0].id, exterieur: autre.id,
  ouvre: new Date(maintenant - 2000).toISOString(), ferme: new Date(maintenant - 1000).toISOString(),
  resultat: { pointsD: 25, pointsE: 10, essaisD: 3, essaisE: 1, joueLe: new Date(maintenant - 1000).toISOString(), origine: 'direct' } });
const copie = structuredClone(ancien), migree = actualiserEloPublic(ancien);
assert.deepEqual(ancien, copie);
assert.equal(migree.id, ancien.id); assert.equal(migree.code, ancien.code);
assert.deepEqual(migree.cartes, ancien.cartes); assert.deepEqual(migree.rencontres, ancien.rencontres);
assert.deepEqual(migree.competitions, ancien.competitions);
assert.deepEqual(migree.clubs.map(c => [c.id, c.compteId, c.ovas, c.composition]), ancien.clubs.map(c => [c.id, c.compteId, c.ovas, c.composition]));
assert.equal(migree.publique?.division, 2); assert.equal(migree.publique?.poule, 2);
assert.equal(migree.clubs[0].eloPublic?.valeur, 1516); assert.equal(migree.clubs[1].eloPublic?.valeur, 1484);
assert.equal(actualiserEloPublic(migree), migree);
assert.equal(vueCarriere(migree, compte).publique?.eloDepart, undefined);
const nouvelle = creerDivisionPublique({ id: randomUUID(), code: 'suivante', compteId: compte, pseudo: 'Ancien', clubNom: 'Club conservé' },
  1, 2, maintenant, 'suite', [{ club: migree.clubs[0], cartes: migree.cartes }], 2);
assert.equal(actualiserEloPublic(nouvelle).clubs[0].eloPublic?.valeur, 1516);

// Plusieurs lots, puis panne entre deux créations : la reprise doit suivre exactement le plan déjà figé.
{
  const lignes: LigueStockee[] = Array.from({ length: 6 }, (_, i) => {
    const etat = structuredClone(migree), id = randomUUID();
    etat.id = id; etat.code = 'SOURCE-' + i; etat.phase = 'intersaison'; etat.rencontres = []; etat.competitions = [];
    etat.publique = { cycle: 0, ...positionPoule(i + 1), finLe: new Date(maintenant - 1).toISOString() };
    etat.clubs = Array.from({ length: 16 }, (_, j) => ({ ...structuredClone(migree.clubs[0]), id: id + ':club:' + j, compteId: randomUUID(), nom: 'Club ' + i + '-' + j }));
    etat.cartes = etat.clubs.map((c, j) => ({ ...structuredClone(migree.cartes[0]), id: id + ':carte:' + j, proprietaire: c.id }));
    return { id, code: etat.code, version: 1, comptes: etat.clubs.map(c => c.compteId), etat };
  });
  const avant = structuredClone(lignes), base: BasePyramideLocale = { verrous: {}, equipes: {}, plans: {} };
  const depot = pyramideLocale(base, () => lignes, () => {});
  const stockage = { pyramide: depot, dernierCyclePublic: async () => Math.max(...lignes.map(l => l.etat.publique!.cycle)) } as unknown as StockageCarriere;
  let panne = false;
  const service = () => creerPyramidePublique(stockage, {
    lire: async id => { const l = lignes.find(l => l.id === id); return l ? structuredClone(l) : null; },
    actualiser: async () => { throw new Error('Les sources sont déjà clôturées.'); },
    async creer(cycle, p, heritiers, date) {
      const etat = structuredClone(avant[0].etat), id = randomUUID(), code = codePoule(cycle, p);
      etat.id = id; etat.code = code; etat.publique = { cycle, division: p.division, poule: p.poule, finLe: new Date(date + 30 * 86400000).toISOString() };
      etat.phase = 'saison'; etat.clubs = heritiers.map(h => h.club); etat.cartes = heritiers.flatMap(h => h.cartes);
      if (!lignes.some(l => l.code === code)) lignes.push({ id, code, etat, comptes: etat.clubs.map(c => c.compteId), version: 0 });
      if (panne) throw new Error('Interruption simulée après commit.');
    },
  });
  assert.equal((await service().assurer(maintenant)).transition, 1);
  assert.equal(lignes.filter(l => l.etat.publique!.cycle === 1).length, 4);
  panne = true;
  await assert.rejects(service().assurer(maintenant + 1), /Interruption simulée/);
  panne = false;
  assert.equal((await service().assurer(maintenant + 2)).cycle, 1);
  const cibles = lignes.filter(l => l.etat.publique!.cycle === 1);
  assert.equal(cibles.length, 6);
  assert.equal(new Set(cibles.flatMap(l => l.comptes)).size, 96);
  assert.deepEqual(cibles.flatMap(l => l.etat.cartes.map(c => c.id)).sort(), avant.flatMap(l => l.etat.cartes.map(c => c.id)).sort());
  assert.deepEqual(lignes.filter(l => l.etat.publique!.cycle === 0), avant);
}

const repertoire = mkdtempSync(join(tmpdir(), 'destiny-pyramide-'));
console.log('Vérification des inscriptions…');
try {
  const fichier = join(repertoire, 'base.json'), stockage = stockageFichier(fichier);
  const api = creerGestionnaireCarriere(stockage);
  async function requete(body: Record<string, unknown> | undefined, jeton?: string, url = '/api/carriere', gestionnaire = api) {
    let statut = 200, donnees: any, cookie = '';
    const res = { status(n: number) { statut = n; return res; }, setHeader(n: string, v: unknown) { if (n.toLowerCase() === 'set-cookie') cookie = String(v); }, json(v: unknown) { donnees = v; } };
    await gestionnaire.handler({ method: body ? 'POST' : 'GET', url, headers: { host: 'localhost', 'content-type': 'application/json', ...(jeton ? { cookie: 'destiny_carriere=' + jeton } : {}) }, body }, res);
    assert.equal(statut, 200, JSON.stringify(donnees));
    return { donnees, jeton: cookie.match(/destiny_carriere=([^;]+)/)?.[1] ?? jeton };
  }
  const inscription = await requete({ action: 'inscription', identifiant: 'nouveau.test', pseudo: 'Nouveau', motDePasse: 'mot-de-passe-test', confirmationMotDePasse: 'mot-de-passe-test' });
  assert.equal((await stockage.divisionsPubliques(0)).length, 1);
  const compteNeuf = inscription.donnees.compte.id;
  assert.ok(await stockage.pyramide!.duCompte(0, compteNeuf));
  await Promise.all(Array.from({ length: 3 }, () => requete({ action: 'rejoindreDivisionPublique', clubNom: 'Un doublon ?' }, inscription.jeton)));
  assert.equal((await stockage.divisionsPubliques(0)).flatMap(l => l.etat.clubs).filter(c => c.compteId === compteNeuf).length, 1);
  const ancienCompte = randomUUID(), jetonAncien = 'ancien-sans-poule';
  await stockage.creerCompte({ id: ancienCompte, identifiant: 'ancien', pseudo: 'Ancien' });
  await stockage.ouvrirSession(empreinteJeton(jetonAncien), ancienCompte, maintenant + 60_000);
  await requete(undefined, jetonAncien);
  assert.ok(await stockage.pyramide!.duCompte(0, ancienCompte));
  await requete({ action: 'inscription', identifiant: 'homonyme.test', pseudo: 'Nouveau', motDePasse: 'mot-de-passe-test', confirmationMotDePasse: 'mot-de-passe-test' });
  const homonymes = (await stockage.divisionsPubliques(0))[0].etat.clubs.filter(c => c.pseudo === 'Nouveau');
  assert.equal(homonymes.length, 2); assert.equal(new Set(homonymes.map(c => c.nom)).size, 2);
  const classement = await requete(undefined, inscription.jeton, '/api/carriere?classementMondial=1');
  assert.equal(classement.donnees.total, 3); assert.ok(classement.donnees.moi);
  assert.ok(classement.donnees.equipes.every((e: any) => !e.compteId && !e.ligueId));

  const verifierGoogle = OAuth2Client.prototype.verifyIdToken, ancienClient = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = 'test-google';
  OAuth2Client.prototype.verifyIdToken = (async () => ({ getPayload: () => ({ sub: 'google-test', email: 'test@example.invalid', email_verified: true, name: 'Google test' }) })) as any;
  try {
    const google = creerGestionnaireCarriere(stockage);
    const reponse = await requete({ action: 'google', credential: 'jeton-de-test-'.repeat(10) }, undefined, '/api/carriere', google);
    assert.ok(await stockage.pyramide!.duCompte(0, reponse.donnees.compte.id));
  } finally { OAuth2Client.prototype.verifyIdToken = verifierGoogle; if (ancienClient === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = ancienClient; }

  // Une clôture partiellement matérialisée se reprend après redémarrage, sans dupliquer les poules ni les cartes.
  const sources = (await stockage.divisionsPubliques(0));
  const source = sources[0]; source.etat.phase = 'intersaison'; source.etat.publique!.finLe = new Date(maintenant - 1).toISOString();
  await stockage.comparerEtEcrire(source, source.version);
  const creerService = () => creerPyramidePublique(stockage, {
    lire: async id => { const l = await stockage.ligue(id); return l ? { ...l, etat: actualiserEloPublic(l.etat) } : null; },
    actualiser: async id => (await stockage.ligue(id))!.etat,
    async creer(cycle, plan, heritiers, date) {
      const premier = heritiers[0].club, id = randomUUID(), code = codePoule(cycle, plan);
      const etat = creerDivisionPublique({ id, code, compteId: premier.compteId, pseudo: premier.pseudo, clubNom: premier.nom }, cycle, plan.division, date, 'reprise', heritiers, plan.poule);
      await stockage.creerLigue({ id, code, etat, comptes: etat.clubs.map(c => c.compteId), version: 0 });
    },
  });
  assert.equal((await creerService().assurer(maintenant)).cycle, 1);
  assert.equal((await creerService().assurer(maintenant)).cycle, 1);
  const cible = await stockage.divisionsPubliques(1);
  assert.equal(cible.length, 1);
  assert.deepEqual(new Set(cible[0].etat.clubs.map(c => c.compteId)), new Set(source.etat.clubs.map(c => c.compteId)));
  assert.deepEqual(cible[0].etat.cartes.map(c => c.id).sort(), source.etat.cartes.map(c => c.id).sort());
  assert.equal((JSON.parse(readFileSync(fichier, 'utf8')) as any).pyramide.plans['1'].termine, true);
} finally { rmSync(repertoire, { recursive: true, force: true }); }

// Contrats SQL sans connexion à la base de production.
const appels: string[] = [];
const sql = pyramideSql(async (textes, ..._valeurs) => { const q = textes.join('?'); appels.push(q); if (q.includes('as n')) return [{ n: 1 }]; return []; });
await sql.manquants(1, 4); await sql.duCompte(1, compte); await sql.prochainIndice(1); await sql.aInitialiser(1, 8);
assert.ok(appels.some(q => q.includes('using gin(comptes)')));
assert.ok(appels.some(q => q.includes('carriere_public_elo_idx')));
assert.ok(appels.some(q => q.includes('not exists') && q.includes('limit')));
assert.ok(appels.some(q => q.includes('comptes @>') && q.includes("resume ? 'publique'")), 'La recherche de compte peut utiliser son index partiel.');
assert.ok(appels.some(q => q.includes('select max(case when')), 'Les anciennes divisions séquentielles ne passent pas dans une exponentielle SQL.');
console.log('Pyramide : conservation, Elo, inscriptions mot de passe/Google, doublons, reprise et contrats SQL validés.');
