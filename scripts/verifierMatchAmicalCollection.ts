import assert from 'node:assert/strict';
import { catalogueBaseCarriere } from '../src/lib/ligue/catalogueCarriere';
import {
  composerEquipeDepuisCollection,
  convertirEnCoequipiers,
  estCompteKiriAutorise,
} from '../src/lib/amicalCollection';
import { cleCarteSolo, etatCollectionSoloVide } from '../src/lib/collectionSolo';
import { creerMatch, avancer, probaPlaquage, resoudreChoix } from '../src/lib/moteur/moteur';
import { actionGesteTactileArcade, creerQteArcade, deflexionJoystickArcade, deplacerJoueurArcade, engagerJoueurRuckArcade, evaluerQteArcade, scorePuissanceGesteArcade, selectionnerJoueurPertinent, transformationArcadeReussie } from '../src/lib/moteur/arcade';
import { terrainSprites } from '../src/components/match/MatchAmicalManette';

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
assert.equal(scorePuissanceGesteArcade(-180, 390).score, 1, 'Un grand glissement vers le haut donne la pleine puissance.');
assert.equal(scorePuissanceGesteArcade(-35, 390).score, -.2, 'Un petit glissement ne suffit pas.');
assert.equal(scorePuissanceGesteArcade(90, 390).score, -.2, 'Glisser vers le bas ne donne pas de puissance.');

const matchPenalite = creerMatch(equipe.nom, equipeB.nom, coequipiersA, coequipiersB, 20, 17, 'test-penalite-qte', undefined, {
  niveau: 'pro', tempsReel: true, controle: true,
});
const buteurPenalite = matchPenalite.pions.find((p) => p.cote === 'A')!;
buteurPenalite.pos = { x: 70, y: 35 };
matchPenalite.phase = 'tirAuBut';
matchPenalite.minuteur = 0;
matchPenalite.tir = { buteur: buteurPenalite, distance: 30, angle: 0, valeur: 3,
  suite: 'renvoi', lieu: { ...buteurPenalite.pos }, reussi: false };
matchPenalite.rng = () => 0;
avancer(matchPenalite, .15);
assert.equal(matchPenalite.tir?.volLance, true, 'Le tir de pénalité doit partir pendant le test.');
assert.equal(matchPenalite.tir?.reussi, false, 'La pénalité doit respecter le résultat du geste même avec un tirage moteur favorable.');

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
const soutienRuck = matchPilote.pions.find((p) => p.cote === 'A' && p !== porteur)!;
soutienRuck.pos = { x: 62, y: 35 };
soutienRuck.role = 'ligne';
matchPilote.phase = 'ruck';
matchPilote.porteur = null;
matchPilote.ruck = { attaque: 'A', vitesseAttaque: 50, vitesseDefense: 50,
  organisation: { debut: matchPilote.sim, origine: { ...matchPilote.ballon }, attaque: [], defense: [], contacts: [], animations: {} } };
matchPilote.ruck.porteurId = porteur.id;
matchPilote.ruck.plaqueurId = defenseur.id;
matchPilote.gestes = [{ id: 'test-plaquage', joueurId: defenseur.id, clip: 'tackle_low', debut: matchPilote.sim, duree: 1.2 }];
const terrainPlaquage = terrainSprites(matchPilote);
assert.equal(terrainPlaquage.gestes?.[0]?.clip, 'tackle_low', 'Le geste de plaquage doit parvenir aux sprites.');
assert.equal(terrainPlaquage.contact?.porteurId, porteur.id, 'La chute du porteur doit parvenir aux sprites.');
assert.equal(engagerJoueurRuckArcade(matchPilote, soutienRuck), true, 'Le soutien rejoint le ruck proche.');
assert.ok(matchPilote.ruck.organisation?.attaque.includes(soutienRuck.id));
const positionSoutien = { ...soutienRuck.pos };
deplacerJoueurArcade(matchPilote, soutienRuck, { sequence: 3, dx: 1, dy: 0, sprint: true, evenements: [], tempsClient: 0 }, .3);
assert.deepEqual(soutienRuck.pos, positionSoutien, 'Le joueur engagé ne doit pas sortir du ruck au joystick.');
const gratteurRuck = matchPilote.pions.find((p) => p.cote === 'B' && p !== defenseur)!;
gratteurRuck.pos = { x: 61, y: 35 };
gratteurRuck.role = 'ligne';
assert.equal(engagerJoueurRuckArcade(matchPilote, gratteurRuck), true, 'Le gratteur rejoint lui aussi le regroupement.');
assert.ok(matchPilote.ruck.organisation?.defense.includes(gratteurRuck.id));
const positionGratteur = { ...gratteurRuck.pos };
deplacerJoueurArcade(matchPilote, gratteurRuck, { sequence: 4, dx: 1, dy: 0, sprint: false, evenements: [], tempsClient: 0 }, .3);
assert.deepEqual(gratteurRuck.pos, positionGratteur, 'Le gratteur reste engagé pendant le ruck.');
matchPilote.phase = 'jeuCourant';
soutienRuck.role = 'ligne';
deplacerJoueurArcade(matchPilote, soutienRuck, { sequence: 4, dx: 1, dy: 0, sprint: false, evenements: [], tempsClient: 0 }, .3);
assert.ok(soutienRuck.pos.x > positionSoutien.x, 'Le contrôle revient une fois le ruck terminé.');
assert.equal(actionGesteTactileArcade(0, -85, true), 'PASS_LEFT');
assert.equal(actionGesteTactileArcade(0, 85, true), 'PASS_RIGHT');
assert.equal(actionGesteTactileArcade(85, -45, true), 'KICK');
assert.equal(actionGesteTactileArcade(85, 45, true), 'KICK');
assert.equal(actionGesteTactileArcade(34, 0, true), 'KICK', 'Un glissement court doit déjà déclencher le pied.');
assert.equal(actionGesteTactileArcade(0, -85, true, true), 'KICK', 'En portrait le pied part vers le haut.');
assert.equal(actionGesteTactileArcade(0, 0, true), null, 'Un appui simple est réservé au raffut ciblé.');
assert.equal(actionGesteTactileArcade(70, 0, false), 'ACTION_PRIMARY');
assert.equal(actionGesteTactileArcade(0, -85, false), 'ACTION_PRIMARY');
const matchPied = creerMatch(equipe.nom, equipeB.nom, coequipiersA, coequipiersB, 20, 17, 'test-pied-dirige', undefined, {
  niveau: 'pro', tempsReel: true, controle: true,
});
const buteur = matchPied.pions.find((p) => p.cote === 'A')!;
matchPied.phase = 'jeuCourant';
matchPied.controleArcadeCamps = ['A'];
buteur.moi = true;
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
assert.equal(matchPied.piedPrepare?.rapideArcade, true, 'Le tir dirigé du joueur doit être armé rapidement.');
for (const pion of matchPied.pions) if (pion !== buteur) pion.pos = { x: pion.cote === 'A' ? 20 : 110, y: pion.numero * 3 };
avancer(matchPied, .45);
assert.equal(matchPied.piedPrepare, undefined, 'Le pied arcade doit partir sans longue attente après le geste.');
assert.equal(matchPied.vol?.type, 'pied');
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
