import assert from 'node:assert/strict';
import { fusionnerDeltaDirect, fusionnerVueLigue } from '../src/lib/ligue/fusionDirect';
import type { VueCarriereEnLigne } from '../src/lib/ligue/typesCarriere';

const rencontre = (horloge: number, domicile: number, exterieur: number, termine = false) => ({
  id: 'match-1', domicile: 'club-a', exterieur: 'club-b',
  match: { id: 'match-1', horloge, minute: Math.floor(horloge), termine, score: { domicile, exterieur } },
});
const vue = (version: number, horloge: number, domicile: number, exterieur: number, termine = false) => ({
  id: 'ligue-1', version, saison: 1, rencontres: [rencontre(horloge, domicile, exterieur, termine)],
}) as unknown as VueCarriereEnLigne;

const actuelle = vue(12, 62.5, 24, 17);
const ancienDelta = { id: actuelle.id, version: 12, rencontre: rencontre(22.1, 7, 3) as VueCarriereEnLigne['rencontres'][number] };
assert.equal(fusionnerDeltaDirect(actuelle, ancienDelta), actuelle, 'Une ancienne réponse ne doit pas relancer le match');

const ancienScore = { id: actuelle.id, version: 12, rencontre: rencontre(62.5, 17, 17) as VueCarriereEnLigne['rencontres'][number] };
assert.equal(fusionnerDeltaDirect(actuelle, ancienScore), actuelle, 'Le score ne doit jamais diminuer à version égale');

const frais = { id: actuelle.id, version: 12, rencontre: rencontre(63.2, 27, 17) as VueCarriereEnLigne['rencontres'][number] };
const actualisee = fusionnerDeltaDirect(actuelle, frais);
assert.equal(actualisee.rencontres[0].match?.horloge, 63.2);
assert.deepEqual(actualisee.rencontres[0].match?.score, { domicile: 27, exterieur: 17 });

const vueAncienne = vue(12, 21, 7, 3);
const fusion = fusionnerVueLigue(actuelle, vueAncienne);
assert.equal(fusion.rencontres[0].match?.horloge, 62.5, 'Une vue complète arrivée en retard est protégée elle aussi');

const terminee = vue(12, 80, 30, 20, true);
assert.equal(fusionnerVueLigue(terminee, actuelle).rencontres[0].match?.termine, true, 'Un match terminé ne redevient pas actif');

const reinitialisee = vue(13, 0, 0, 0);
assert.equal(fusionnerVueLigue(actuelle, reinitialisee).rencontres[0].match?.horloge, 0, 'Une vraie nouvelle version reste applicable');

console.log('OK — aucune réponse périmée ne peut faire reculer le chrono, le score ou relancer un match terminé.');
process.exit(0);
