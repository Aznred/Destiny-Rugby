import assert from 'node:assert/strict';
import { catalogueBaseCarriere } from '../src/lib/ligue/catalogueCarriere';
import {
  composerEquipeDepuisCollection,
  convertirEnCoequipiers,
  estCompteKiriAutorise,
} from '../src/lib/amicalCollection';
import { cleCarteSolo, etatCollectionSoloVide } from '../src/lib/collectionSolo';
import { creerMatch, avancer, probaPlaquage, resoudreChoix } from '../src/lib/moteur/moteur';
import { actionGesteTactileArcade, creerQteArcade, deflexionJoystickArcade, deplacerJoueurArcade, evaluerQteArcade, selectionnerJoueurPertinent, transformationArcadeReussie } from '../src/lib/moteur/arcade';

console.log('Testing Collection Friendly Match & Realtime Controller Prototype...');

const catalogue = catalogueBaseCarriere();
assert.ok(catalogue.length > 1000, 'Catalogue must be loaded');

// 1. Tester la composition automatique à partir de la collection
const etatCollection = etatCollectionSoloVide();
// On simule 5 cartes possédées
const cartesPossedees = catalogue.slice(0, 5);
for (const c of cartesPossedees) {
  etatCollection.quantites[cleCarteSolo(c.sourceId)] = 1;
}

const equipe = composerEquipeDepuisCollection('XV de Kiri', '#1a56db', etatCollection, catalogue);
assert.equal(equipe.joueurs.length, 15, 'L’équipe doit comporter exactement 15 titulaires');
assert.equal(equipe.nom, 'XV de Kiri');
assert.ok(equipe.noteMoyenne >= 30 && equipe.noteMoyenne <= 99, 'La note moyenne doit être valide');

// Vérifie que les numéros 1 à 15 sont bien présents
const numeros = equipe.joueurs.map(j => j.numero).sort((a, b) => a - b);
assert.deepEqual(numeros, Array.from({ length: 15 }, (_, i) => i + 1), 'Chaque numéro de 1 à 15 doit être attribué');

// 2. Vérification de la conversion en Coequipiers pour le moteur
const coequipiersA = convertirEnCoequipiers(equipe.joueurs);
assert.equal(coequipiersA.length, 15);

const equipeB = composerEquipeDepuisCollection('XV Adverse', '#dc2626', etatCollection, catalogue);
const coequipiersB = convertirEnCoequipiers(equipeB.joueurs);

// 3. Tester l'initialisation et l'avancement du moteur de match
const match = creerMatch(
  equipe.nom,
  equipeB.nom,
  coequipiersA,
  coequipiersB,
  20,
  17,
  'test-amical',
  undefined,
  {
    niveau: 'pro',
    tempsReel: true,
    controle: true,
  },
);

assert.ok(match, 'Le match amical doit être initialisé');
assert.equal(match.pions.length, 30, '30 joueurs doivent être sur la feuille de match');
match.carriereDixMinutes = true;
match.dureeReelleArcade = 8 * 60;
match.finSurSortieOuEnAvant = true;

// Faire avancer de quelques secondes
avancer(match, 1.0);
assert.ok(match.sim > 0, 'Le chrono du match doit progresser');
assert.ok(match.t >= 9 && match.t <= 11, 'Une seconde réelle doit représenter dix secondes du match de 80 minutes.');
match.t = 2399;
match.minute = Math.floor(match.t / 60);
avancer(match, .3);
assert.equal(match.sirene, true, 'La sirène doit sonner au bout des 40 premières minutes affichées.');
assert.equal(match.periode, 1, 'La sirène seule ne doit pas terminer la première mi-temps.');
assert.equal(match.fini, false, 'Le jeu continue après la sirène tant que le ballon reste en jeu.');
match.porteur = null;
match.vol = null;
match.phase = 'ballonLibre';
match.minuteur = 10;
match.ballon = { x: 60, y: .3 };
match.ballonLibre = { vitesse: { x: 0, y: -5 }, hauteur: 0, vitesseVerticale: 0, intention: 'touche', auteurCote: 'A', age: 0, rebonds: 0 };
avancer(match, .15);
assert.equal(match.periode, 2, 'La touche après la sirène doit lancer la mi-temps.');
assert.equal(match.phase, 'miTemps');

match.t = 4799;
match.minute = Math.floor(match.t / 60);
match.sirene = false;
match.phase = 'ballonLibre';
match.minuteur = 10;
match.ballon = { x: 60, y: .3 };
match.ballonLibre = { vitesse: { x: 0, y: -5 }, hauteur: 0, vitesseVerticale: 0, intention: 'touche', auteurCote: 'A', age: 0, rebonds: 0 };
avancer(match, .15);
assert.equal(match.fini, true, 'La touche après 80 minutes affichées doit terminer le match.');
const direction = creerQteArcade('tir', 'test-direction', 1_000);
const parfait = evaluerQteArcade(direction, 1_000 + direction.cible * direction.dureeMs);
assert.equal(parfait.score, 1, 'Le QTE de direction possède une zone parfaite.');
assert.equal(transformationArcadeReussie(.55, .55, 10, 25), true, 'Deux bons gestes transforment un essai facile.');
assert.equal(transformationArcadeReussie(1, -.2, 10, 25), false, 'Un tir sans puissance doit échouer.');
assert.equal(transformationArcadeReussie(.55, 1, 30, 25), false, 'Un angle difficile exige une direction parfaite.');
assert.equal(transformationArcadeReussie(1, .55, 10, 42), false, 'Un tir lointain exige une puissance parfaite.');

const matchPilote = creerMatch(equipe.nom, equipeB.nom, coequipiersA, coequipiersB, 20, 17, 'test-porteur-arcade', undefined, {
  niveau: 'pro', tempsReel: true, controle: false,
});
matchPilote.phase = 'jeuCourant';
matchPilote.controleArcadeCamps = ['A'];
matchPilote.defenseArcadeCote = 'B';
const porteur = matchPilote.pions.find((p) => p.cote === 'A')!;
const defenseur = matchPilote.pions.find((p) => p.cote === 'B')!;
matchPilote.porteur = porteur;
matchPilote.possession = 'A';
porteur.pos = { x: 60, y: 35 };
matchPilote.ballon = { ...porteur.pos };
for (const pion of matchPilote.pions) if (pion !== porteur) pion.pos = { x: pion.cote === 'A' ? 22 : 108, y: pion.numero * 3 };
assert.equal(selectionnerJoueurPertinent(matchPilote, 'A', 'ancien-joueur'), porteur, 'Le contrôle suit toujours le porteur de notre équipe.');
deplacerJoueurArcade(matchPilote, porteur, { sequence: 1, dx: 1, dy: 0, sprint: false, evenements: [], tempsClient: 0 }, .15);
const positionPilote = { ...porteur.pos };
avancer(matchPilote, .15);
assert.ok(Math.abs(porteur.pos.x - positionPilote.x) < .1, 'Le moteur ne doit pas annuler le déplacement manuel du porteur.');
for (const phase of ['melee', 'touche'] as const) {
  matchPilote.phase = phase;
  const positionArretee = { ...porteur.pos };
  deplacerJoueurArcade(matchPilote, porteur, { sequence: 2, dx: 1, dy: 0, sprint: true, evenements: [], tempsClient: 0 }, .3);
  assert.deepEqual(porteur.pos, positionArretee, `Le joystick ne doit pas déplacer le joueur pendant la ${phase}.`);
}
matchPilote.phase = 'jeuCourant';
assert.equal(actionGesteTactileArcade(0, -85, true), 'PASS_LEFT');
assert.equal(actionGesteTactileArcade(0, 85, true), 'PASS_RIGHT');
assert.equal(actionGesteTactileArcade(85, -45, true), 'KICK');
assert.equal(actionGesteTactileArcade(85, 45, true), 'KICK');
assert.equal(actionGesteTactileArcade(0, -85, true, true), 'KICK', 'En portrait le pied part vers le haut.');
assert.equal(actionGesteTactileArcade(0, 0, true), null, 'Un appui simple est réservé au raffut ciblé.');
assert.equal(actionGesteTactileArcade(70, 0, false), 'ACTION_PRIMARY');
assert.equal(actionGesteTactileArcade(0, -85, false), 'ACTION_PRIMARY');
const matchPied = creerMatch(equipe.nom, equipeB.nom, coequipiersA, coequipiersB, 20, 17, 'test-pied-dirige', undefined, {
  niveau: 'pro', tempsReel: true, controle: true,
});
const buteur = matchPied.pions.find((p) => p.cote === 'A')!;
matchPied.phase = 'jeuCourant';
matchPied.porteur = buteur;
matchPied.possession = 'A';
buteur.pos = { x: 60, y: 35 };
matchPied.ballon = { ...buteur.pos };
matchPied.rng = () => 0;
const piedDirige = resoudreChoix(matchPied, buteur, 'pied', 0, { directionPied: { x: .8, y: -.6 } });
assert.equal(piedDirige.joue, true, 'Le coup de pied dirigé doit être effectivement joué.');
assert.ok(matchPied.piedPrepare && matchPied.piedPrepare.arrivee.x > buteur.pos.x
  && matchPied.piedPrepare.arrivee.y < buteur.pos.y,
  'La frappe préparée doit suivre le glissement diagonal vers l’avant.');
assert.equal(deflexionJoystickArcade(20, 0).sprint, false, 'La première moitié du joystick conserve la course normale.');
assert.equal(deflexionJoystickArcade(45, 0).sprint, true, 'Le bord du joystick active le sprint.');
assert.equal(deflexionJoystickArcade(90, 0).dx, 1, 'La course du joystick reste bornée.');
matchPilote.defenseArcadeCote = undefined;
const chanceStandard = probaPlaquage(matchPilote, porteur, defenseur, null, false);
matchPilote.defenseArcadeCote = 'B';
assert.ok(probaPlaquage(matchPilote, porteur, defenseur, null, false) > chanceStandard, 'Le bot de collection doit mieux défendre à attributs égaux.');

// 4. Tester la détection du compte Kiri
assert.equal(estCompteKiriAutorise({ pseudo: 'kiri' }), true, 'Pseudo kiri doit être autorisé');
assert.equal(estCompteKiriAutorise({ administrateur: true }), true, 'Administrateur doit être autorisé');
assert.equal(estCompteKiriAutorise({ pseudo: 'joueur_lambda' }), false, 'Joueur ordinaire ne doit pas être autorisé par défaut');

console.log('✅ ALL TESTS PASSED SUCCESSFULLY for Collection Friendly Match Prototype!');
