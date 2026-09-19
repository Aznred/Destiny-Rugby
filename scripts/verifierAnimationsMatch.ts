import assert from 'node:assert/strict';
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { MILIEU } from '../src/lib/moteur/terrain';

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
let receveursRestesDansLeurCamp = true;
let engagementReceveursVerifie = false;
let lifteursResserres = false;
let impactPlaquageSynchronise = false;
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
    impactPlaquageSynchronise ||= !!match.ruck?.porteurId && !!match.ruck?.plaqueurId
      && match.ruck.debut !== undefined;
  }
  if (match.phase === 'ballonEnLAir' && match.vol?.intention === 'renvoi'
    && Math.abs(match.vol.de.x - MILIEU) < .5) {
    const receveur = match.vol.auteur.cote === 'A' ? 'B' : 'A';
    const joueurs = match.pions.filter((p) => p.surLeTerrain && p.cote === receveur);
    engagementReceveursVerifie ||= joueurs.length >= 14 && joueurs.every((p) => !!match.placement?.[p.id]);
    receveursRestesDansLeurCamp &&= joueurs.every((p) =>
      p.cote === 'A' ? p.pos.x <= MILIEU + .35 : p.pos.x >= MILIEU - .35);
  }
  if (match.phase === 'touche' && match.conquete?.type === 'touche' && match.conquete.progression > .72) {
    const cible = match.pions.find((p) => p.id === match.conquete?.cibleId);
    if (cible) {
      const proches = match.pions
        .filter((p) => p.surLeTerrain && p.cote === cible.cote && p.avant && p.numero !== 2 && p !== cible)
        .sort((a, b) => Math.hypot(a.pos.x - cible.pos.x, a.pos.y - cible.pos.y)
          - Math.hypot(b.pos.x - cible.pos.x, b.pos.y - cible.pos.y))
        .slice(0, 2);
      lifteursResserres ||= proches.length === 2 && proches.every((p) =>
        Math.hypot(p.pos.x - cible.pos.x, p.pos.y - cible.pos.y) < 1.9);
    }
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
assert.ok(engagementReceveursVerifie && receveursRestesDansLeurCamp,
  `À l'engagement, les receveurs doivent garder leur structure dans leur propre moitié.`);
assert.ok(lifteursResserres, 'Les deux lifteurs doivent venir au contact du sauteur en touche.');
assert.ok(impactPlaquageSynchronise, 'Le plaquage doit exposer un impact synchronisé pour le plaqueur et le porteur.');

console.log('OK — arrêts raccourcis, conquêtes animées, ballon libre avec rebonds, contact synchronisé et aplatissages visibles.');
