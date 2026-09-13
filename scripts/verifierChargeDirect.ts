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
import { avancerCarrierePourDirect } from '../src/lib/ligue/carriere';
import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere';

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

const horlogeAutre = matchs[1].horloge;
const ligue = {
  version: 9,
  rencontres: [
    { id: 'direct-regarde', match: matchs[0], ferme: new Date(debut + 80 * 60_000).toISOString() },
    { id: 'autre-direct', match: matchs[1], ferme: new Date(debut + 80 * 60_000).toISOString() },
  ],
} as unknown as EtatCarriereEnLigne;
const cibleSeule = avancerCarrierePourDirect(ligue, 'direct-regarde', debut + 6_000, 'charge-cible');
assert.ok(cibleSeule.rencontres[0].match!.horloge > matchs[0].horloge, 'Le match regardé doit avancer.');
assert.equal(cibleSeule.rencontres[1].match!.horloge, horlogeAutre, 'Les autres matchs simultanés ne doivent pas être recalculés.');

console.log(
  `OK — ${NOMBRE_MATCHS} matchs chauds en ${duree.toFixed(0)} ms `
  + `(${(duree / NOMBRE_MATCHS).toFixed(2)} ms/match), cache ${(cache.octetsEstimes / 1_048_576).toFixed(1)} Mio ; direct isolé contrôlé.`,
);
