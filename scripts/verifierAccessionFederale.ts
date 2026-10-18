import assert from 'node:assert/strict';
import { rulesFor, placesAccessionParTableau } from '../src/lib/competitionRules';
import { qualifiesPourAccession } from '../src/lib/accessionFederale';
import { preparerElimination } from '../src/lib/bracketProgressif';
import { tournoiDeFinDAnnee } from '../src/lib/tournoi';
import { enregistrerResultatJoue, effacerResultatsJoues, resultatsJouesDuTableau } from '../src/lib/championnat';
import { echangeFrontiere, oublierResultats, statutsDeLaPoule, placesDeLaPoule, resoudreSaisonClub, setContexteJoueur } from '../src/lib/promotion';
import { setMouvementsClubs } from '../src/lib/divisions';

setMouvementsClubs({}); setContexteJoueur('', 0); effacerResultatsJoues(); oublierResultats();
for (const [division, haut, tour, nombre] of [['fed2','fed1','quart',8],['fed1','nationale2','demie',4],['nationale2','nationale','finale',2]] as const) {
  const regles = rulesFor(division);
  assert.equal(placesAccessionParTableau(regles), nombre);
  assert.equal(regles.championshipBracket.tourAccession, tour);
  assert.equal(regles.promotionRules.promotionSlots, 0);
  const lire = () => tournoiDeFinDAnnee(division, 1, division)!;
  const debut = lire();
  const premiers = debut.poules.map(p => p.classement[0].club);
  assert.deepEqual(echangeFrontiere(haut, division, 1).mouvements, [], 'Aucune montée avant les résultats qualificatifs.');
  debut.poules.forEach((p, i) => {
    const statuts = statutsDeLaPoule(division, i, p.classement.length);
    assert.deepEqual(statuts.slice(0, 6), ['QUALIFIED','QUALIFIED','PLAYOFF','PLAYOFF','PLAYOFF','PLAYOFF']);
    assert.equal(placesDeLaPoule(division, i).promotion, 0);
  });
  assert.equal(placesDeLaPoule(haut, 0).relegation, 2);
  let vainqueurBarrage = '', perdantPremier = '';
  const snapshots: string[] = [];
  for (let garde = 0; garde < 8; garde++) {
    const tableau = lire();
    const aJouer = tableau.matchs.filter(m => m.status !== 'completed');
    if (!aJouer.length) break;
    for (const m of aJouer) {
      // Les visiteurs gagnent : on prouve qu'un barragiste peut monter et qu'un premier éliminé ne monte pas.
      enregistrerResultatJoue(m.cle, { domicile:m.domicile, exterieur:m.exterieur, scoreD:10, scoreE:30, essaisD:1, essaisE:4 });
      if (m.tour === 'barrage' && !vainqueurBarrage) vainqueurBarrage = m.exterieur;
      if (premiers.includes(m.domicile) && m.tour !== tour && !qualifiesPourAccession(regles, tableau.matchs).includes(m.domicile)) perdantPremier ||= m.domicile;
    }
    const enregistres = JSON.stringify(resultatsJouesDuTableau(`tournoi#${division}#1`));
    const prochain = lire();
    const qualifies = qualifiesPourAccession(regles, prochain.matchs);
    if (prochain.matchs.some(m => m.tour === tour)) assert.equal(qualifies.length, nombre);
    const mouvements = echangeFrontiere(haut, division, 1).mouvements;
    assert.deepEqual(new Set(mouvements.filter(m => m.sens === 'montee').map(m => m.club)), new Set(qualifies));
    assert.equal(mouvements.filter(m => m.sens === 'descente').length, qualifies.length);
    assert.ok(mouvements.filter(m => m.sens === 'montee').every(m => m.motif === 'phaseFinale'));
    assert.equal(JSON.stringify(resultatsJouesDuTableau(`tournoi#${division}#1`)), enregistres, 'Lire l’accession ne rejoue aucun match.');
    snapshots.push(JSON.stringify(qualifies));
  }
  const fin = lire();
  const promus = qualifiesPourAccession(regles, fin.matchs);
  assert.equal(promus.length, nombre);
  assert.ok(vainqueurBarrage && promus.some(c => debut.barragistes!.includes(c)), 'Un club passé par les barrages monte.');
  assert.ok(!promus.includes(perdantPremier), 'Le premier éliminé avant le seuil ne monte pas.');
  assert.ok(promus.some(c => c !== fin.champion), 'La montée ne dépend pas du titre.');
  assert.notEqual(snapshots[0], snapshots.at(-1), 'Les résultats invalident bien la liste des promus.');
  const bilan = resoudreSaisonClub(division, 1, promus[0]);
  assert.equal(bilan.mouvements.find(m => m.club === promus[0])?.vers, haut, 'La carrière lit les mêmes qualifications que le tableau.');
  setContexteJoueur('', 0);
  console.log(`OK ${division} : ${nombre} promus par qualification, barragiste promu, premier éliminé, lecture sans mutation et bilan de carrière.`);
}

// Un seul résultat peut acquérir l'accession avant que tout le tour soit terminé.
const avant = preparerElimination('A', 'B', 'temoin-accession', 'huitieme', 'Témoin', 49);
assert.deepEqual(qualifiesPourAccession(rulesFor('fed2'), [avant]), []);
const gagne = { ...avant, status:'completed' as const, vainqueur:'B', perdant:'A', scoreD:10, scoreE:20 };
assert.deepEqual(qualifiesPourAccession(rulesFor('fed2'), [gagne]), ['B']);
const demie = preparerElimination('C', 'D', 'temoin-accession-n2', 'demie', 'Demi-finale', 50);
assert.deepEqual(qualifiesPourAccession(rulesFor('nationale2'), [demie]), []);
const finaliste = { ...demie, status:'completed' as const, vainqueur:'D', perdant:'C', scoreD:10, scoreE:20 };
assert.deepEqual(qualifiesPourAccession(rulesFor('nationale2'), [finaliste]), ['D'], 'Le vainqueur de demi-finale monte sans attendre l’autre demi-finale.');
const finale = preparerElimination('D', 'E', 'temoin-finale-n2', 'finale', 'Finale', 51);
assert.deepEqual(new Set(qualifiesPourAccession(rulesFor('nationale2'), [finale])), new Set(['D','E']), 'Les deux finalistes montent avant de jouer le titre.');
// Un ancien tableau plus petit garde son parcours et ne crée aucun club supplémentaire.
const ancien = preparerElimination('A', 'B', 'ancien-accession', 'demie', 'Ancienne demi-finale', 50);
assert.deepEqual(qualifiesPourAccession(rulesFor('fed2'), [ancien]), ['A','B']);
assert.deepEqual(qualifiesPourAccession(rulesFor('reg3'), [gagne]), []);
effacerResultatsJoues(); oublierResultats(); setMouvementsClubs({});
console.log('OK : résultats partiels, anciens tableaux et autres divisions conservés.');
