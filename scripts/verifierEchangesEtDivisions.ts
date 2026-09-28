import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stockageFichier } from '../serveur/carriereFichier';
import { agirCarriere, avancerCarriere, creerCarriere, creerDivisionPublique } from '../src/lib/ligue/carriere';
import { nombreQualifiesPlayoffs } from '../src/lib/ligue/poulesCarriere';
import { planifierDivisionsPubliques } from '../serveur/divisionsPubliques';
import { compositionManagerParDefaut } from '../src/lib/compositionManager';
import { coequipierDepuisCarte } from '../src/lib/ligue/catalogueCarriere';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import type { EtatBoutiqueCompte } from '../src/lib/boutiqueCompte';
import type { LigueStockee } from '../serveur/carriereStockage';

for (const [clubs, qualifies] of [[2,2],[3,2],[4,4],[7,4],[8,8],[15,8],[16,16],[31,16],[32,32],[64,32]]) {
  assert.equal(nombreQualifiesPlayoffs(clubs), qualifies);
}
const maintenant = Date.parse('2026-09-28T12:00:00Z');
const identifiants = [1,2,3,4].map(n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`);
const ligue = creerCarriere({ id: identifiants[0], code: 'TEST-OPTIONS', compteId: identifiants[0], pseudo: 'Un',
  nom: 'Test des options', clubNom: 'Club un', rythme: 1, maxClubs: 4,
  packsActifs: ['bronze','top14'], packsGratuitsParJour: 0, doublonsAutorises: true, playoffs: true }, maintenant, 'test-options');
assert.deepEqual(ligue.packsActifs, ['bronze','top14']);
assert.equal(ligue.clubs[0].packsGratuits?.length ?? 0, 0);
assert.equal(ligue.doublonsAutorises, true);

const publique = [0,1].map((division) => creerDivisionPublique({ id: identifiants[division],
  code: `DR-PUBLIC-C0-D${division+1}`, compteId: identifiants[division*2],
  pseudo: `Joueur ${division}`, clubNom: `Club ${division}` }, 0, division+1, maintenant, `graine-${division}`));
for (let i = 0; i < 2; i++) {
  const premiere = publique[i].clubs[0];
  const seconde = structuredClone(premiere);
  seconde.id = `${publique[i].id}:club:2`; seconde.compteId = identifiants[i*2+1]; seconde.nom = `Second ${i}`;
  const cartes = publique[i].cartes.map(c => ({ ...structuredClone(c), id: `${c.id}:second`, proprietaire: seconde.id }));
  seconde.composition = compositionManagerParDefaut(cartes.map(coequipierDepuisCarte));
  publique[i].clubs.push(seconde);
  publique[i].cartes.push(...cartes);
}
const troisieme = structuredClone(publique[0].clubs[0]);
troisieme.id = `${publique[0].id}:club:3`;
troisieme.compteId = `00000000-0000-4000-8000-${String(6).padStart(12,'0')}`;
troisieme.nom = 'Troisième club';
const cartesTroisieme = publique[0].cartes.filter(c => c.proprietaire === publique[0].clubs[0].id)
  .map(c => ({ ...structuredClone(c), id: `${c.id}:troisieme`, proprietaire: troisieme.id }));
troisieme.composition = compositionManagerParDefaut(cartesTroisieme.map(coequipierDepuisCarte));
publique[0].clubs.push(troisieme);
publique[0].cartes.push(...cartesTroisieme);
const lignes: LigueStockee[] = publique.map(etat => ({ id: etat.id, code: etat.code, version: 0,
  comptes: etat.clubs.map(c => c.compteId), etat }));
let entamee = avancerCarriere(publique[0], maintenant + 5*86400000, 'matchs-publics');
assert.ok(entamee.rencontres.some(r => r.resultat), 'Une journée de la ligue publique doit pouvoir être jouée.');
const matchsJoues = entamee.rencontres.filter(r => r.resultat).length;
entamee = agirCarriere(entamee, `00000000-0000-4000-8000-${String(5).padStart(12,'0')}`,
  { type: 'rejoindre', pseudo: 'Retardataire', clubNom: 'Club retardataire' }, maintenant + 5*86400000, 'entree-retardataire');
assert.equal(entamee.clubs.length, 4, 'La ligue publique reste ouverte après la première journée.');
assert.equal(entamee.rencontres.filter(r => r.resultat).length, matchsJoues, 'Les résultats déjà joués restent intacts.');
const plan = planifierDivisionsPubliques(lignes, 1);
assert.equal(plan.length, 2);
assert.equal(new Set(plan.flatMap(p => p.heritiers.map(h => h.club.compteId))).size, 5);
assert.ok(plan[0].barrage?.includes('Barrage D1/D2'));
assert.equal(plan[0].heritiers.length, 3);
const renouvelee = creerDivisionPublique({ id: identifiants[3], code: 'DR-PUBLIC-C1-D1',
  compteId: plan[0].heritiers[0].club.compteId, pseudo: plan[0].heritiers[0].club.pseudo,
  clubNom: plan[0].heritiers[0].club.nom }, 1, 1, maintenant + 30*86400000, 'graine-nouvelle', plan[0].heritiers);
assert.equal(renouvelee.phase, 'saison');
assert.equal(renouvelee.competitions.length, 2);
assert.equal(renouvelee.packsGratuitsParJour, 0);
assert.equal(renouvelee.doublonsAutorises, true);

const dossier = mkdtempSync(join(tmpdir(), 'destiny-echanges-'));
const chemin = join(dossier, 'base.json');
const stockage = stockageFichier(chemin);
const coffre = (quantites: Record<string,number>): EtatBoutiqueCompte => ({
  ovas: 0, collectionSolo: { quantites, packsOuverts: {}, doublons: 1, revision: 0 },
  inventaire: ['defaut'], skinActif: 'defaut', equipements: [], equipementActif: {}, traitsDebloques: [],
});
const auteur = identifiants[0], acheteur = identifiants[1];
await stockage.sauvegarderBoutique(auteur, coffre({ joueurA: 2 }));
await stockage.sauvegarderBoutique(acheteur, coffre({ joueurB: 2 }));
const offre = identifiants[2];
await stockage.echangesSolo!.creer(offre, auteur, 'Auteur', { joueurA: 1 }, { joueurB: 1 });
assert.equal((await stockage.boutique(auteur))!.collectionSolo.quantites.joueurA, 1);
await assert.rejects(stockage.echangesSolo!.creer(identifiants[3], auteur, 'Auteur', { joueurA: 1 }, {}));
await stockage.echangesSolo!.accepter(offre, acheteur);
assert.equal((await stockage.boutique(auteur))!.collectionSolo.quantites.joueurB, 1);
assert.equal((await stockage.boutique(acheteur))!.collectionSolo.quantites.joueurA, 1);
assert.equal((await stockage.boutique(acheteur))!.collectionSolo.quantites.joueurB, 1);
await stockage.sauvegarderBoutique(auteur, coffre({ joueurA: 2 }));
assert.equal((await stockage.boutique(auteur))!.collectionSolo.quantites.joueurA, 1, 'Une sauvegarde locale périmée ne rétablit pas la carte échangée.');
const api = creerGestionnaireCarriere(stockage);
async function rejoindre(numero: number) {
  const id = `00000000-0000-4000-9000-${String(numero).padStart(12,'0')}`;
  const jeton = `public-${numero}`;
  await stockage.creerCompte({ id, identifiant: `public-${numero}`, pseudo: `Public ${numero}`, empreinte: 'test' });
  await stockage.ouvrirSession(empreinteJeton(jeton), id, Date.now()+60000);
  let statut = 200; let donnees: any;
  const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(v: unknown) { donnees = v; } };
  await api.handler({ method: 'POST', url: '/api/carriere',
    headers: { host: 'localhost', 'content-type': 'application/json', cookie: `destiny_carriere=${jeton}` },
    body: { action: 'rejoindreDivisionPublique', clubNom: `Club public ${numero}` } }, res);
  assert.equal(statut, 200, JSON.stringify(donnees));
  return donnees;
}
for (let i = 1; i <= 17; i++) await rejoindre(i);
const divisions = await stockage.divisionsPubliques(0);
assert.deepEqual(divisions.map(d => d.etat.clubs.length), [16,1]);
assert.ok(divisions.every(d => d.etat.doublonsAutorises && d.etat.packsGratuitsParJour === 0));
assert.equal(divisions[0].etat.clubs[0].ovas, 5000);
const roulement = join(dossier, 'roulement.json');
const stockageCycle = stockageFichier(roulement);
const ancien = new Date(Date.now() - 31*86400000).toISOString();
for (const etat of publique) {
  etat.creeLe = ancien;
  for (const club of etat.clubs) club.rejointLe = new Date(Date.now() - 86400000).toISOString();
  await stockageCycle.creerLigue({ id: etat.id, code: etat.code, version: 0,
    comptes: etat.clubs.map(c => c.compteId), etat });
}
await stockageCycle.creerCompte({ id: identifiants[0], identifiant: 'cycle-test', pseudo: 'Cycle', empreinte: 'test' });
await stockageCycle.ouvrirSession(empreinteJeton('cycle-test'), identifiants[0], Date.now()+60000);
const apiCycle = creerGestionnaireCarriere(stockageCycle);
let statutCycle = 200;
const resCycle = { status(n: number) { statutCycle = n; return resCycle; }, setHeader() {}, json(_v: unknown) {} };
await apiCycle.handler({ method: 'GET', url: '/api/carriere',
  headers: { host: 'localhost', cookie: 'destiny_carriere=cycle-test' } }, resCycle);
assert.equal(statutCycle, 200, 'Le cycle mensuel doit être créé automatiquement.');
const nouvelles = await stockageCycle.divisionsPubliques(1);
assert.equal(nouvelles.length, 2);
assert.equal(new Set(nouvelles.flatMap(l => l.comptes)).size, 5);
assert.ok(nouvelles[0].etat.publique?.barrage?.includes('Barrage'));
const ancienCycle = await stockageCycle.divisionsPubliques(0);
assert.ok(ancienCycle.every(l => l.etat.rencontres.every(r => r.resultat)),
  'Toutes les rencontres d’une saison commencée tard doivent être conclues avant le classement final.');
rmSync(chemin);
rmSync(roulement);
rmdirSync(dossier);
console.log('Échanges et divisions : OK');
