import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { compositionManagerParDefaut } from '../src/lib/compositionManager';
import {
  dotationBronzeCarriere, coequipierDepuisCarte,
} from '../src/lib/ligue/catalogueCarriere';
import {
  avancerMatchEnLigne, creerMatchEnLigne, diagnosticCacheMatchEnLigne,
  STRATEGIE_EN_LIGNE_DEFAUT,
} from '../src/lib/ligue/matchCarriere';

const NOMBRE_MATCHS = 400;
const debut = Date.parse('2026-09-12T14:00:00.000Z');
const cartesA = dotationBronzeCarriere('charge', 'club-a', 'charge-a');
const cartesB = dotationBronzeCarriere('charge', 'club-b', 'charge-b');
const equipe = (id: string, cartes: typeof cartesA) => {
  const effectif = cartes.map(coequipierDepuisCarte);
  return {
    clubId: id, nom: id, effectif,
    composition: compositionManagerParDefaut(effectif),
    strategie: STRATEGIE_EN_LIGNE_DEFAUT,
  };
};

let matchs = Array.from({ length: NOMBRE_MATCHS }, (_, i) => creerMatchEnLigne({
  id: `charge-${i}`,
  domicile: equipe(`domicile-${i}`, cartesA),
  exterieur: equipe(`exterieur-${i}`, cartesB),
  debut,
  graine: (i + 1) * 7_919,
}));

// Premier passage : montage des 400 moteurs. Le second mesure le vrai régime
// d'un serveur chaud, celui d'un direct qui n'avance que de deux secondes.
matchs = matchs.map((match) => avancerMatchEnLigne(match, debut + 2_000));
const avant = performance.now();
matchs = matchs.map((match) => avancerMatchEnLigne(match, debut + 4_000));
const duree = performance.now() - avant;
const cache = diagnosticCacheMatchEnLigne();

assert.equal(matchs.length, NOMBRE_MATCHS);
assert.equal(cache.matchs, NOMBRE_MATCHS, 'Les 400 moteurs actifs doivent rester chauds.');
assert.ok(cache.octetsEstimes <= cache.maximumOctets, 'Le cache doit respecter sa limite mémoire.');
assert.ok(duree / NOMBRE_MATCHS < 25, 'Un tick chaud doit rester très inférieur à son budget de 200 ms.');

console.log(
  `OK — ${NOMBRE_MATCHS} matchs chauds en ${duree.toFixed(0)} ms `
  + `(${(duree / NOMBRE_MATCHS).toFixed(2)} ms/match), cache ${(cache.octetsEstimes / 1_048_576).toFixed(1)} Mio.`,
);

