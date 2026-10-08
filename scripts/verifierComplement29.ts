// Les chemins restant au Correctif 29 : vrais directs, reprises, sélection et limite publique.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { deballerReprise, emballerReprise } from '../serveur/reprisesMatch';
import { creerBase, Releve } from './baseQuiCompte';
import { creerCarriere, agirCarriere, avancerCarriere } from '../src/lib/ligue/carriere';
import { compositionManagerParDefaut } from '../src/lib/compositionManager';
import { dotationBronzeCarriere, coequipierDepuisCarte } from '../src/lib/ligue/catalogueCarriere';
import { departageDuMatch, estMatchCouperet } from '../src/lib/couperet';
import { onlineRules, rulesFor, standingsStatuses } from '../src/lib/competitionRules';
import { mondialEnDirect } from '../src/lib/mondial';
import { enregistrerResultatJoue, effacerResultatsJoues } from '../src/lib/championnat';
import {
  avancerMatchEnLigne, commanderMatchEnLigne, conclureMatchEnLigne, creerMatchEnLigne, dureeMatchEnLigne,
  espaceMoteursPourBanc, pointDeReprise, reprendreMoteur, resumeMatchEnLigne, vueMatchEnLigne,
} from '../src/lib/ligue/matchCarriere';
import type { EtatMatchEnLigne } from '../src/lib/ligue/matchCarriere';

for (const tour of ['huitieme', 'quart', 'demie', 'finale', 'petiteFinale']) {
  const cle = `mondial#1#${tour}#France#Irlande`;
  assert.ok(estMatchCouperet(cle));
  assert.deepEqual(departageDuMatch(cle), { periodes: 2, minutes: 10, criteres: ['tirsAuBut'] });
}
assert.equal(departageDuMatch('mondial#1#poule0#2#France#Irlande'), undefined);
const mondial = mondialEnDirect(1, 4);
const premier = mondial.bracket[0];
const cleMondial = `mondial#1#huitieme#${premier.domicile}#${premier.exterieur}`;
enregistrerResultatJoue(cleMondial, { ...premier, scoreD: 17, scoreE: 17,
  vainqueurDesigne: 'E', prolongation: true, departage: 'tirsAuBut', tirsAuBut: [3, 4] });
const relu = mondialEnDirect(1, 4).bracket[0];
assert.equal(relu.vainqueur, premier.exterieur);
assert.deepEqual([relu.scoreD, relu.scoreE, relu.tirsAuBut], [17, 17, [3, 4]]);
effacerResultatsJoues();
console.log('✓ Coupe du monde : tours couperets, poules avec nul et vainqueur sauvegardé à score égal');

const equipe = (nom: string, clubId: string) => {
  const effectif = dotationBronzeCarriere('complement29', clubId, 'equipes').map(coequipierDepuisCarte);
  return { clubId, nom, effectif, composition: compositionManagerParDefaut(effectif) };
};
const parametres = { domicile: equipe('Stade Toulousain', 'club-a'), exterieur: equipe('Montpellier HR', 'club-b'), debut: 0 };
let depart: EtatMatchEnLigne | undefined;
let termine: EtatMatchEnLigne | undefined;
// Les mêmes cartes bronze que dans une vraie ligue ; aucune mutation du moteur.
for (const n of [8]) {
  const m = creerMatchEnLigne({ ...parametres, id: `complement29-${n}`, graine: n,
    departage: rulesFor('ligueEnLigne').knockout.drawResolution });
  const fin = conclureMatchEnLigne(m);
  console.log(`  Rencontre ${n} : ${fin.score.domicile}-${fin.score.exterieur}, ${Math.round(fin.horloge)} min`);
  if (fin.issue) { depart = m; termine = fin; break; }
}
assert.ok(depart && termine, 'Une rencontre naturelle doit nécessiter la prolongation');
assert.ok(termine.issue, 'Une rencontre à égalité doit nécessiter la prolongation');
assert.ok(termine.horloge >= 100 && termine.periode === 4 && termine.issue);
assert.ok(termine.feuille?.some(l => l.minutes >= 100), 'Les mêmes joueurs continuent à cumuler leurs minutes');
assert.equal(dureeMatchEnLigne(depart), 100 * 60_000);
espaceMoteursPourBanc('complement29-chaud');
const avance = avancerMatchEnLigne(depart, 85 * 60_000, true);
assert.ok(!avance.termine && avance.horloge > 80);
const vue = vueMatchEnLigne(avance, 'club-a');
if (process.env.APERCU_C29 === '1') writeFileSync('scripts/.verification29-direct.json', JSON.stringify(vue));
assert.equal(vue.terrain?.periode, 3);
assert.ok(vue.terrain!.horloge! > 80);
const point = deballerReprise(emballerReprise(pointDeReprise(avance)!))!;
assert.ok(point.sim > 4800);
const ordre = commanderMatchEnLigne(avance, 'club-a', { type: 'strategie', strategie: avance.strategies.domicile }, 86 * 60_000);
assert.ok(ordre.journal.at(-1)!.horloge > 80, 'Les consignes restent datées après 80 min');
const chaud = conclureMatchEnLigne(ordre);
espaceMoteursPourBanc('complement29-repris');
assert.ok(reprendreMoteur(ordre, point));
const repris = conclureMatchEnLigne(JSON.parse(JSON.stringify(ordre)));
espaceMoteursPourBanc('complement29-froid');
const froid = conclureMatchEnLigne(JSON.parse(JSON.stringify(ordre)));
assert.ok(JSON.stringify(repris) === JSON.stringify(chaud), 'Reprise et moteur chaud identiques en prolongation');
assert.ok(JSON.stringify(froid) === JSON.stringify(chaud), 'Rejoue et moteur chaud identiques en prolongation');
assert.deepEqual(resumeMatchEnLigne(chaud).issue, chaud.issue);
assert.deepEqual(vueMatchEnLigne(chaud, 'club-a').issue, chaud.issue);
const ancien = { ...depart, regles: 5 };
const finAncienne = conclureMatchEnLigne(ancien);
assert.equal(finAncienne.horloge, 80);
assert.equal(finAncienne.issue, undefined, 'Un ancien match reste dans ses règles historiques');
console.log(`✓ Direct ${depart.id} : deux prolongations, ordre après 80 min, reprise et rejoue identiques`);

const base = creerBase(new Releve());
const compte = randomUUID(), autre = randomUUID(), ligueId = randomUUID();
base.comptes.set(compte, { id: compte, identifiant: 'complement29', pseudo: 'Manager', empreinte: '' });
base.sessions.set(empreinteJeton('complement29'), compte);
let ligue = creerCarriere({ id: ligueId, code: 'DR-COMP29', nom: 'Ligue de contrôle', compteId: compte,
  pseudo: 'Manager', clubNom: 'Club A', rythme: 7, maxClubs: 16 }, Date.now(), 'complement29');
ligue = agirCarriere(ligue, autre, { type: 'rejoindre', pseudo: 'Visiteur', clubNom: 'Club B' }, Date.now(), 'autre');
ligue = agirCarriere(ligue, compte, { type: 'demarrerSaison' }, Date.now(), 'saison');
const competition = { ...ligue.competitions[0], id: 'coupe-complement29', format: 'elimination' as const, etat: 'en_cours' as const };
const r = { id: 'finale-complement29', competitionId: competition.id, journee: 1,
  domicile: ligue.clubs[0].id, exterieur: ligue.clubs[1].id,
  ouvre: new Date().toISOString(), ferme: new Date().toISOString(), match: { ...termine! } };
ligue.competitions = [competition]; ligue.rencontres = [r];
const avecResultat = avancerCarriere(ligue, Date.now(), 'finalisation').rencontres[0];
assert.equal(avecResultat.resultat?.vainqueurId, termine!.issue!.vainqueur === 'domicile' ? r.domicile : r.exterieur);
assert.deepEqual([avecResultat.resultat?.pointsD, avecResultat.resultat?.pointsE], [termine!.score.domicile, termine!.score.exterieur]);
assert.ok(avecResultat.resultat?.ap);
if (termine!.issue!.tirs) assert.deepEqual(avecResultat.resultat?.tirsAuBut, { tirsD: termine!.issue!.tirs[0], tirsE: termine!.issue!.tirs[1] });
console.log('✓ Résultat de ligue : aucun second départage ni point ajouté après le coup de sifflet');

ligue.rencontres = []; ligue.competitions = []; ligue.phase = 'salon';
ligue.publique = { cycle: 1, division: 2 };
const db = base.instance();
let limite = 2;
db.resumesDivisionsPubliques = async () => Array.from({ length: limite }, (_, i) => ({
  id: randomUUID(), code: 'DR-PUBLIC', division: i + 1, comptes: [], nombreClubs: 16, phase: 'saison',
}));
await db.creerLigue({ id: ligueId, code: ligue.code, version: 0, comptes: [compte, autre], etat: ligue });
const api = creerGestionnaireCarriere(db, async () => {});
async function lire(url: string) {
  let statut = 200; let donnees: any;
  const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(d: unknown) { donnees = d; } };
  await api.handler({ method: 'GET', url, headers: { host: 'localhost', cookie: 'destiny_carriere=complement29' } }, res);
  assert.equal(statut, 200);
  return donnees;
}
const derniere = await lire(`/api/carriere?ligue=${ligueId}`);
assert.equal(derniere.publique.derniereDivision, true);
const statuts = standingsStatuses(onlineRules(derniere), 16);
assert.ok(!statuts.includes('DIRECT_RELEGATION') && !statuts.includes('ACCESS_MATCH'));
assert.equal(statuts[0], 'PROMOTION');
const vraieDate = Date.now;
try {
  limite = 3;
  const prochain = vraieDate() + 6000;
  Date.now = () => prochain;
  const nouvelle = await lire(`/api/carriere?ligue=${ligueId}&v=${derniere.version}&cycle=1&division=2&derniere=1`);
  assert.equal(nouvelle.publique.derniereDivision, false, 'Une nouvelle division invalide aussi la lecture conditionnelle');
  assert.ok(standingsStatuses(onlineRules(nouvelle), 16).includes('DIRECT_RELEGATION'));
} finally { Date.now = vraieDate; }
console.log('✓ Dernière division publique : métadonnée serveur, zones cohérentes et actualisation sans changement de classement');
