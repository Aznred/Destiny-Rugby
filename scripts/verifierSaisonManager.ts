import { strict as assert } from 'node:assert';
import { COMPETITIONS } from '../src/data/clubs';
import { CALENDRIER, SEMAINES_PAR_SAISON } from '../src/data/calendrier';
import { useGame } from '../src/store/useGame';
import { afficheDuClub } from '../src/lib/matchLive';
import { phaseFinale } from '../src/lib/phaseFinale';
import { championnatEnDirect, nombreJournees, setResultatsJoues } from '../src/lib/championnat';
import { clubsDeDivision, divisionEffective } from '../src/lib/divisions';
import { oublierResultats, resoudreSaisonClub } from '../src/lib/promotion';
import { tableauDetectionManager, motifObservationJeune, proposerProjetJeune } from '../src/lib/formationManager';
import { coupeEnDirect } from '../src/lib/coupe';

const etat = () => useGame.getState();
const manager = () => etat().manager!;
function creer(club: string) {
  etat().creerManager({ nom: 'Contrôle saison', club, nation: 'France', age: 40, libre: true });
}
function jouer(gagne = true) {
  const m = manager();
  const a = afficheDuClub(m);
  assert.ok(a, `Une affiche doit exister semaine ${m.semaine}`);
  const domicile = a.match.domicile === m.club;
  etat().enregistrerResultatManager({
    cle: a.cle, club: m.club, saison: m.saison, semaine: m.semaine,
    journee: a.journee, domicile, adversaire: domicile ? a.match.exterieur : a.match.domicile,
    scorePour: gagne ? 70 : 0, scoreContre: gagne ? 0 : 70,
    essaisPour: gagne ? 10 : 0, essaisContre: gagne ? 0 : 10,
  });
  return a;
}
function gagnerJusqua(semaine: number) {
  for (let garde = 0; manager().semaine < semaine && garde < 100; garde++) {
    const m = manager();
    const a = afficheDuClub(m);
    if (a && !m.resultats[a.cle]) jouer();
    else etat().semaineManager();
  }
  assert.equal(manager().semaine, semaine);
}

// Avancer librement malgré un match, sans perdre une deuxième journée.
creer('Stade Toulousain');
assert.equal(etat().avancerJusquaManager(5).arret, 'match');
assert.equal(etat().avancerJusquaManager(5, true).semaines, 4);
assert.equal(manager().semaine, 5);
const comptes = Object.keys(manager().resultats).length;
assert.equal(etat().avancerJusquaManager(2, true).semaines, 0);
assert.equal(etat().avancerJusquaManager(Number.NaN, true).semaines, 0);
assert.equal(Object.keys(manager().resultats).length, comptes);
gagnerJusqua(40);
const ligue = championnatEnDirect('top14', 1, manager().club, 999);
assert.equal(ligue.classement.find((l) => l.club === manager().club)?.joues, nombreJournees('top14', manager().club));
assert.equal(Object.values(manager().resultats).filter((r) => r.cle.startsWith('top14#')).length, nombreJournees('top14', manager().club));
assert.equal(Object.values(manager().resultats).filter((r) => /^championsCup#/.test(r.cle)).length, 4, 'Les 4 poules européennes sont jouables');
assert.equal(coupeEnDirect('championsCup', 1, manager().club, 8)?.vainqueur, manager().club, 'Les victoires de coupe déterminent le titre');
console.log('✓ avance libre, doubles journées et coupe complète');

// Une victoire contraire au tirage fait réellement avancer dans le tableau.
for (const division of ['reg3', 'reg2', 'prod2']) {
  creer(COMPETITIONS.find((c) => c.id === division)!.clubs[0].nom);
  const club = manager().club;
  gagnerJusqua(40);
  gagnerJusqua(43);
  assert.equal(phaseFinale(division, 1, club).champion, club);
  const py = resoudreSaisonClub(division, 1, club);
  const mouvement = py.mouvements.find((x) => x.club === club);
  assert.equal(mouvement?.sens, 'montee', 'La montée ne doit pas disparaître pendant l’équilibrage');
  const tailles = new Map(COMPETITIONS.map((c) => [c.id, clubsDeDivision(c.id).length]));
  etat().avancerJusquaManager(SEMAINES_PAR_SAISON + 1, true);
  assert.equal(manager().saison, 2);
  assert.equal(manager().division, mouvement!.vers);
  assert.equal(divisionEffective(club), mouvement!.vers);
  assert.ok(manager().historique[0].montee);
  assert.ok(manager().historique[0].titres.length, 'Le titre est attribué avant de reconstruire les poules');
  for (const c of COMPETITIONS) assert.equal(clubsDeDivision(c.id).length, tailles.get(c.id), c.id);
}
console.log('✓ promotion, trophée et tailles des divisions sur trois étages');

// Le finaliste malheureux a son vrai match d'accès, dont le résultat compte.
creer(COMPETITIONS.find((c) => c.id === 'reg2')!.clubs[0].nom);
gagnerJusqua(42);
jouer(false);
etat().semaineManager();
assert.equal(afficheDuClub(manager())?.tour, 'accession');
const acces = jouer();
assert.ok(acces.cle.startsWith('acces#'));
assert.equal(resoudreSaisonClub('reg2', 1, manager().club).mouvements.find((x) => x.club === manager().club)?.sens, 'montee');
// Même registre reconstruit à partir des seules données sauvegardées.
setResultatsJoues(Object.values(JSON.parse(JSON.stringify(manager().resultats)) as ReturnType<typeof manager>['resultats']).map((r) => ({
  cle: r.cle, match: { domicile: r.domicile ? r.club : r.adversaire, exterieur: r.domicile ? r.adversaire : r.club,
    scoreD: r.domicile ? r.scorePour : r.scoreContre, scoreE: r.domicile ? r.scoreContre : r.scorePour,
    essaisD: r.domicile ? r.essaisPour : r.essaisContre, essaisE: r.domicile ? r.essaisContre : r.essaisPour },
})));
oublierResultats();
assert.equal(resoudreSaisonClub('reg2', 1, manager().club).mouvements.find((x) => x.club === manager().club)?.sens, 'montee');
console.log('✓ barrage d’accès et résultats rechargés');

// Une élimination en demi-finale ne doit pas proposer de finale au perdant.
creer(COMPETITIONS.find((c) => c.id === 'reg3')!.clubs[0].nom);
gagnerJusqua(41);
jouer(false);
etat().semaineManager();
assert.equal(afficheDuClub(manager()), null);

// Une dernière place entraîne bien une descente effective la saison suivante.
creer('Stade Toulousain');
for (let garde = 0; manager().semaine < 43 && garde < 100; garde++) {
  const a = afficheDuClub(manager());
  if (a && !manager().resultats[a.cle]) jouer(false); else etat().semaineManager();
}
etat().avancerJusquaManager(SEMAINES_PAR_SAISON + 1, true);
assert.equal(manager().division, 'prod2');
assert.ok(manager().historique[0].descente);
console.log('✓ élimination et relégation');

// Recruter puis observer sans faire réapparaître le jeune dans le vivier.
creer(COMPETITIONS.find((c) => c.id === 'reg3')!.clubs[0].nom);
const local = tableauDetectionManager(manager()).fiches.find((f) => f.jeune.club === manager().club)!;
assert.ok(local, 'Un petit club doit pouvoir voir les jeunes de son école');
const budget = manager().budgetTransferts;
etat().proposerProjetJeuneManager(local.jeune.id);
assert.equal(manager().academie.length, 1);
assert.equal(manager().budgetTransferts, budget);
assert.ok(!tableauDetectionManager(manager()).fiches.some((f) => f.jeune.id === local.jeune.id));
etat().proposerProjetJeuneManager(local.jeune.id);
assert.equal(manager().academie.length, 1);
useGame.setState({ manager: { ...manager(), missionsJeunes: { saison: 1, utilises: 999 } } });
assert.equal(motifObservationJeune(manager(), local.jeune.id), null);
for (let i = 0; i < 3; i++) etat().observerJeuneManager(local.jeune.id);
etat().observerJeuneManager(local.jeune.id, true);
assert.equal(manager().observationsJeunes[local.jeune.id].matchs, 3);
assert.equal(manager().observationsJeunes[local.jeune.id].entretien, true);
assert.equal(manager().missionsJeunes.utilises, 999, 'Le suivi au centre est gratuit');
if (manager().academie[0].age >= 17) {
  etat().gererAcademicienManager(local.jeune.id, 'senior');
  assert.ok(!tableauDetectionManager(manager()).fiches.some((f) => f.jeune.id === local.jeune.id), 'Un jeune intégré en senior ne revient pas dans le vivier');
}
assert.equal(CALENDRIER.filter((s) => s.type === 'phaseFinale').length, 4);
console.log('✓ recrutement, suivi gratuit au centre et entretien');

creer('Stade Toulousain');
const externes = tableauDetectionManager(manager()).fiches.filter((f) => f.jeune.club !== manager().club);
assert.ok(externes.some((f) => proposerProjetJeune(manager(), f.jeune.id).etat === 'accepte'), 'Le recrutement extérieur doit aussi rester possible');
console.log('✓ recrutement extérieur accessible sans forcer les signatures');
