import assert from 'node:assert/strict';
import { avancer, DT } from '../src/lib/moteur/moteur';
import { recupererAMiTemps, sprintMaxDe } from '../src/lib/moteur/endurance';
import { optionsMoteurDesRegles, REGLES_MATCH_EN_LIGNE } from '../src/lib/ligue/matchCarriere';
import { creerRecetteMiTemps } from './recetteRecuperationMiTemps';
import { resumerMatch } from './outilsEmpreinte';

assert.ok(REGLES_MATCH_EN_LIGNE >= 13);
assert.equal(optionsMoteurDesRegles().recuperationMiTemps, true);
assert.equal(optionsMoteurDesRegles(13).recuperationMiTemps, true);
for (const version of [1, 5, 11, 12]) assert.equal(optionsMoteurDesRegles(version).recuperationMiTemps, false);

for (const deuxReserves of [false, true]) for (const endurance of [12, 42, 91, 100]) {
  const p = creerRecetteMiTemps().pions[0];
  Object.assign(p, { endurance, deuxReserves, sprint: 0, essoufle: true });
  recupererAMiTemps(p);
  assert.equal(p.endurance, Math.min(100, endurance + 15));
  if (deuxReserves) {
    assert.equal(p.sprint, sprintMaxDe(p.endurance));
    assert.equal(p.sprintMax, p.sprint);
    assert.equal(p.essoufle, false);
  }
}

for (const tempsReel of [true, false]) {
  const e = creerRecetteMiTemps({ tempsReel });
  const avant = e.pions.map(p => p.endurance);
  const suspendu = e.pions.find(p => p.surLeTerrain && p.cote === 'B')!;
  suspendu.sanction = 120; suspendu.surLeTerrain = false;
  avancer(e, DT);
  assert.equal(e.phase, 'miTemps');
  assert.equal(e.periode, 2);
  e.pions.forEach((p, i) => {
    assert.equal(p.endurance, Math.min(100, avant[i] + 15), 'Les deux équipes et leur banc récupèrent.');
    assert.ok(p.sprint <= p.sprintMax);
  });
  assert.equal(suspendu.surLeTerrain, false, 'Le repos ne supprime pas un carton.');
  assert.ok(suspendu.sanction > 0 && suspendu.sanction < 120, 'Seul le temps de jeu écoulé est décompté du carton.');
  const repos = e.pions.map(p => p.endurance), horloge = e.t;
  avancer(e, DT * 2);
  assert.equal(e.t, horloge, 'Le chronomètre reste arrêté.');
  assert.deepEqual(e.pions.map(p => p.endurance), repos, 'La pause ne cumule pas le bonus à chaque tick.');
  e.minuteur = 0; avancer(e, DT);
  assert.equal(e.phase, 'coupEnvoi');
  assert.deepEqual(e.pions.map(p => p.endurance), repos, 'La reprise ne redonne pas une deuxième fois le bonus.');
}

const ancien = creerRecetteMiTemps({}, 12), avantAncien = ancien.pions.map(p => p.endurance);
avancer(ancien, DT);
assert.equal(ancien.phase, 'miTemps');
assert.deepEqual(ancien.pions.map(p => p.endurance), avantAncien, 'Une ancienne ligue garde sa rejoue.');
const sauvegarde = creerRecetteMiTemps(); delete sauvegarde.recuperationMiTemps;
const avantSauvegarde = sauvegarde.pions.map(p => p.endurance); avancer(sauvegarde, DT);
assert.deepEqual(sauvegarde.pions.map(p => p.endurance), avantSauvegarde, 'Une ancienne sauvegarde sans drapeau garde son comportement.');

const prolongation = creerRecetteMiTemps({ departage: { periodes: 2, minutes: 10, criteres: ['tirsAuBut'] } });
prolongation.periode = 2; prolongation.t = 4800; prolongation.minute = 80;
prolongation.scoreA = prolongation.scoreB = 0;
const avantProlongation = prolongation.pions.map(p => p.endurance);
avancer(prolongation, DT);
assert.equal(prolongation.periode, 3);
assert.deepEqual(prolongation.pions.map(p => p.endurance), avantProlongation, 'Pas de bonus de vestiaire à chaque prolongation.');

const fin = creerRecetteMiTemps(); fin.periode = 2; fin.t = 4800; fin.minute = 80;
const avantFin = fin.pions.map(p => p.endurance); avancer(fin, DT);
assert.equal(fin.fini, true);
assert.deepEqual(fin.pions.map(p => p.endurance), avantFin, 'Le coup de sifflet final ne donne pas un bonus de mi-temps.');

const bloc = creerRecetteMiTemps(), decoupe = creerRecetteMiTemps();
avancer(bloc, 1.5);
for (let n = 0; n < 10; n++) avancer(decoupe, DT);
assert.equal(resumerMatch(bloc), resumerMatch(decoupe), 'La récupération reste déterministe quelle que soit la taille des appels.');
console.log('Mi-temps : +15 plafonné à 100, sprint rechargé, deux équipes et banc, cartons conservés, bonus unique, ancienne ligue, prolongations et déterminisme : OK.');
