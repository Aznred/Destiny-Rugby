import assert from 'node:assert/strict';
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';

const clubA = 'Stade Toulousain';
const clubB = 'Stade Rochelais';
const match = creerMatch(
  clubA, clubB, effectifDuClub(clubA, 1), effectifDuClub(clubB, 1),
  28, 27, 'animations-rugby', undefined,
  { tempsReel: true, scoreSurTerrain: false },
);

let transformationPreparee = false;
let transformationEnVol = false;
let ruckSynchronise = false;
let passeMemorisee = false;
let meleeLaPlusLongue = 0;
let toucheLaPlusLongue = 0;
let phasePrecedente = match.phase;

for (let garde = 0; !match.fini && garde < 80_000; garde++) {
  avancer(match, 0.15);
  if (match.phase !== phasePrecedente) {
    if (match.phase === 'melee') meleeLaPlusLongue = Math.max(meleeLaPlusLongue, match.minuteur);
    if (match.phase === 'touche') toucheLaPlusLongue = Math.max(toucheLaPlusLongue, match.minuteur);
    phasePrecedente = match.phase;
  }
  if (match.phase === 'transformation') {
    transformationPreparee ||= !match.vol && !match.porteur && !!match.tir;
    if (match.vol) {
      transformationEnVol = true;
      assert.equal(match.vol.type, 'pied');
      assert.ok(match.vol.hauteur >= 5.5, 'La transformation doit avoir une arche visible.');
    }
  }
  if (match.phase === 'ruck') {
    const engages = match.pions.filter((p) => p.role === 'ruck');
    ruckSynchronise ||= engages.length >= 2 && engages.some((p) =>
      Math.hypot(p.cible.x - match.ballon.x, p.cible.y - match.ballon.y) < 1.5);
  }
  passeMemorisee ||= (match.volsRecents ?? []).some((v) => v.type === 'passe');
}

assert.ok(match.fini, 'Le match direct doit arriver à son terme.');
assert.ok(transformationPreparee, 'La transformation doit avoir un temps de préparation visible.');
assert.ok(transformationEnVol, 'La transformation doit montrer la trajectoire du ballon.');
assert.ok(ruckSynchronise, 'Le joueur plaqué et le ballon doivent finir ensemble au ruck.');
assert.ok(passeMemorisee,
  'Les passes courtes doivent rester dans la mémoire visuelle du direct.');
assert.ok(meleeLaPlusLongue <= 16.01, `Mêlée directe trop longue : ${meleeLaPlusLongue.toFixed(1)} s.`);
assert.ok(toucheLaPlusLongue <= 12.01, `Touche directe trop longue : ${toucheLaPlusLongue.toFixed(1)} s.`);

console.log('OK — arrêts raccourcis, contact synchronisé, passes mémorisées et transformations visibles.');
