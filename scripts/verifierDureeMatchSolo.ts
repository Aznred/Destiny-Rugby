import assert from 'node:assert/strict';
import { avancer, DT } from '../src/lib/moteur/moteur';
import { DUREES_MI_TEMPS_SOLO, normaliserDureeMiTempsSolo } from '../src/lib/dureeMatchSolo';
import { creerMatchDEmpreinte, resumerMatch } from './outilsEmpreinte';

for (const minutes of DUREES_MI_TEMPS_SOLO) assert.equal(normaliserDureeMiTempsSolo(minutes), minutes);
for (const valeur of [undefined, null, NaN, Infinity, -1, 0, 4, '10', {}]) assert.equal(normaliserDureeMiTempsSolo(valeur), 6);

for (const minutes of [3, 6, 10, 40] as const) {
  const e = creerMatchDEmpreinte(0, { dureeMiTempsSolo: minutes });
  assert.equal(e.dureeMiTempsSolo, minutes);
  let garde = 0;
  while (e.phase !== 'jeuCourant' && garde++ < 2000) avancer(e, DT);
  assert.equal(e.phase, 'jeuCourant');
  const avant = e.t;
  avancer(e, DT);
  assert.ok(Math.abs(e.t - avant - DT * 40 / minutes) < 1e-8, '40 minutes sportives correspondent à la durée choisie');
  const periodes = new Set([e.periode]);
  while (!e.fini && garde++ < 150000) { avancer(e, .6); periodes.add(e.periode); }
  assert.ok(e.fini, `la durée ${minutes} va au coup de sifflet final`);
  assert.deepEqual([...periodes], [1, 2]);
  assert.equal(e.minute, 80);
  assert.ok(e.t >= 4800);
  console.log(`${minutes} min par mi-temps : match complet, deux périodes, chrono final 80 min (${Math.round(e.sim)} s simulées).`);
}

const court = creerMatchDEmpreinte(2, { dureeMiTempsSolo: 3 });
const accelere = creerMatchDEmpreinte(2, { dureeMiTempsSolo: 3 });
while (!court.fini) avancer(court, DT);
while (!accelere.fini) avancer(accelere, .6);
assert.equal(resumerMatch(court), resumerMatch(accelere), 'accélérer ou simuler conserve le même résultat à durée égale');

const reel = creerMatchDEmpreinte(0, { tempsReel: true, dureeMiTempsSolo: 3 });
assert.equal(reel.dureeMiTempsSolo, undefined, 'aucune préférence solo dans un match en temps réel');
console.log('Durées valides, replis, chronomètre, mi-temps, fin, rejoue et isolation du temps réel : OK.');
