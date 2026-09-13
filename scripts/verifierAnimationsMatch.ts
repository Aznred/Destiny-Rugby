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
let pousseeMeleeVisible = false;
let combinaisonToucheVisible = false;
let ballonLibreVisible = false;
let rebondVisible = false;
let aplatissageVisible = false;
let meleeLaPlusLongue = 0;
let toucheLaPlusLongue = 0;
let coupEnvoiLePlusLong = 0;
let meleePlaceeInstantanement = false;
let touchePlaceeInstantanement = false;
let pireEcartAvantEngagement = 0;
let phasePrecedente = match.phase;

for (let garde = 0; !match.fini && garde < 80_000; garde++) {
  const phaseAvant = match.phase;
  const ecartEngagementAvant = phaseAvant === 'coupEnvoi' && match.placement
    ? Math.max(0, ...match.pions.filter(p => p.surLeTerrain && match.placement?.[p.id])
      .map(p => Math.hypot(p.pos.x - match.placement![p.id].x, p.pos.y - match.placement![p.id].y)))
    : 0;
  avancer(match, 0.15);
  if (phaseAvant === 'coupEnvoi' && match.phase === 'ballonEnLAir') {
    pireEcartAvantEngagement = Math.max(pireEcartAvantEngagement, ecartEngagementAvant);
  }
  if (match.phase !== phasePrecedente) {
    if (match.phase === 'melee') {
      meleeLaPlusLongue = Math.max(meleeLaPlusLongue, match.minuteur);
      meleePlaceeInstantanement ||= !!match.placement && match.pions
        .filter(p => p.surLeTerrain && match.placement?.[p.id])
        .every(p => Math.hypot(p.pos.x - match.placement![p.id].x, p.pos.y - match.placement![p.id].y) < .01);
    }
    if (match.phase === 'touche') {
      toucheLaPlusLongue = Math.max(toucheLaPlusLongue, match.minuteur);
      touchePlaceeInstantanement ||= !!match.placement && match.pions
        .filter(p => p.surLeTerrain && match.placement?.[p.id])
        .every(p => Math.hypot(p.pos.x - match.placement![p.id].x, p.pos.y - match.placement![p.id].y) < .01);
    }
    if (match.phase === 'coupEnvoi') coupEnvoiLePlusLong = Math.max(coupEnvoiLePlusLong, match.minuteur);
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
  if (match.phase === 'ballonLibre' && match.ballonLibre) {
    ballonLibreVisible = true;
    rebondVisible ||= match.ballonLibre.rebonds > 0 || match.ballonLibre.hauteur > 0.05;
  }
  aplatissageVisible ||= match.phase === 'aplatissage'
    && !!match.aplatissage
    && match.porteur === match.aplatissage.marqueur;
  passeMemorisee ||= (match.volsRecents ?? []).some((v) => v.type === 'passe');
  pousseeMeleeVisible ||= match.phase === 'melee'
    && match.conquete?.type === 'melee'
    && match.conquete.progression > 0.55
    && !!match.conquete.pousseVers;
  combinaisonToucheVisible ||= match.phase === 'touche'
    && match.conquete?.type === 'touche'
    && match.conquete.progression > 0.3
    && !!match.conquete.combinaison
    && !!match.conquete.cibleId;
}

assert.ok(match.fini, 'Le match direct doit arriver à son terme.');
assert.ok(transformationPreparee, 'La transformation doit avoir un temps de préparation visible.');
assert.ok(transformationEnVol, 'La transformation doit montrer la trajectoire du ballon.');
assert.ok(ruckSynchronise, 'Le joueur plaqué et le ballon doivent finir ensemble au ruck.');
assert.ok(passeMemorisee,
  'Les passes courtes doivent rester dans la mémoire visuelle du direct.');
assert.ok(pousseeMeleeVisible, 'La poussée d’une mêlée doit être visible pendant le direct.');
assert.ok(combinaisonToucheVisible, 'La combinaison et sa cible doivent être visibles en touche.');
assert.ok(ballonLibreVisible && rebondVisible, 'Un coup de pied dans l’espace doit rebondir sans attribuer le ballon à distance.');
assert.ok(aplatissageVisible, 'Le marqueur doit conserver et aplatir visiblement le ballon avant les cinq points.');
assert.ok(meleePlaceeInstantanement && touchePlaceeInstantanement,
  'Les joueurs doivent être placés immédiatement au début des mêlées et touches.');
assert.ok(meleeLaPlusLongue <= 9.51, `Mêlée directe trop longue : ${meleeLaPlusLongue.toFixed(1)} s.`);
assert.ok(toucheLaPlusLongue <= 8.51, `Touche directe trop longue : ${toucheLaPlusLongue.toFixed(1)} s.`);
assert.ok(coupEnvoiLePlusLong <= 5.01, `Engagement direct trop long : ${coupEnvoiLePlusLong.toFixed(1)} s.`);
// Mesuré avant le dernier pas de mouvement (jusqu'à ~1,2 m en 150 ms) ; au
// moment exact du coup de pied le moteur exige 1,1 m ou moins.
assert.ok(pireEcartAvantEngagement <= 2.41,
  `L'engagement est parti avec un joueur à ${pireEcartAvantEngagement.toFixed(1)} m de sa place.`);

console.log('OK — arrêts raccourcis, conquêtes animées, ballon libre avec rebonds, contact synchronisé et aplatissages visibles.');
