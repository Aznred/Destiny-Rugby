import assert from 'node:assert/strict';
import {
  amortirImageDirect, interpolerBallonDirect, interpolerImageDirect, interpolerPionsDirect,
} from '../src/lib/ligue/interpolationDirect';
import type { PionDirect, TerrainDirect } from '../src/lib/ligue/matchCarriere';

const pion = (
  id: string, cote: PionDirect['cote'], x: number, y: number, vx = 0, vy = 0,
): PionDirect => ({ id, numero: 10, nom: id, poste: 'demiOuverture', cote, x, y, vx, vy });

const terrain = (pions: PionDirect[], ballon = { x: 61, y: 35 }): TerrainDirect => ({
  pions, ballon, phase: 'jeuCourant', systeme: 'glissee', possession: 'domicile',
  sequence: 1, metresGagnes: 0, ballonLent: false, cadence: 1, horloge: 20,
});

const distance = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

// Une passe entière absente des deux relevés est tout de même reconstruite.
const passeA = { ...terrain([pion('a', 'domicile', 28, 18)]), porteurId: 'a' };
const passeB = {
  ...terrain([pion('a', 'domicile', 31, 19), pion('b', 'domicile', 43, 28)]),
  porteurId: 'b', horloge: 20.033,
};
const imagesPasse = Array.from({ length: 101 }, (_, i) =>
  interpolerImageDirect(passeA, passeB, i / 100, 2).ballon);
assert.ok(imagesPasse.every((b) => Number.isFinite(b.x) && Number.isFinite(b.y) && b.h >= 0));
assert.ok(Math.max(...imagesPasse.slice(1).map((b, i) => distance(b, imagesPasse[i]))) < 0.6,
  'Le ballon ne doit jamais sauter au changement de porteur.');
assert.ok(Math.max(...imagesPasse.map((b) => b.h)) <= 0.31,
  'Une passe manquée par le sondage doit rester basse, contrairement à un jeu au pied.');

// Quand le serveur possède l'événement court, la passe garde surtout sa VRAIE
// durée : ballon dans les mains avant, 300 ms de vol, puis dans les mains du
// receveur. Elle n'est plus étirée artificiellement sur tout l'intervalle.
const joueursRecentsA = [pion('a', 'domicile', 28, 18), pion('b', 'domicile', 42, 28)];
const joueursRecentsB = [pion('a', 'domicile', 30, 19), pion('b', 'domicile', 44, 29)];
const passeRecente = {
  id: 'passe:a:b:1200.8', de: { x: 29, y: 18.5 }, vers: { x: 43, y: 28.5 },
  duree: 0.3, ecoule: 1.2, hauteur: 0.8, type: 'passe' as const,
  intention: 'passe' as const, debut: 1200.8, fin: 1201.1,
  auteurId: 'a', receveurId: 'b', seed: 8,
};
const recentA = {
  ...terrain(joueursRecentsA), porteurId: 'a', instantJeu: 1200,
};
const recentB = {
  ...terrain(joueursRecentsB), porteurId: 'b', instantJeu: 1202,
  volsRecents: [passeRecente],
};
const avantPasse = interpolerImageDirect(recentA, recentB, 0.2, 2);
const pendantPasse = interpolerImageDirect(recentA, recentB, 0.45, 2);
const apresPasse = interpolerImageDirect(recentA, recentB, 0.8, 2);
assert.ok(Math.abs(avantPasse.ballon.x - avantPasse.pions.get('a')!.x - 0.92) < 0.01);
assert.ok(pendantPasse.ballon.h > 0.5, 'La passe récente doit être visible pendant son vrai vol.');
assert.ok(Math.abs(apresPasse.ballon.x - apresPasse.pions.get('b')!.x - 0.92) < 0.01);

// Quand le porteur reste le même, le ballon suit sa position interpolée au
// centimètre près au lieu d'être recalculé depuis un relevé voisin.
const courseA = { ...terrain([pion('a', 'domicile', 20, 35, 3, 0)]), porteurId: 'a' };
const courseB = { ...terrain([pion('a', 'domicile', 26, 35, 3, 0)]), porteurId: 'a', horloge: 20.033 };
const course = interpolerImageDirect(courseA, courseB, 0.5, 2);
assert.equal(Number((course.ballon.x - course.pions.get('a')!.x).toFixed(2)), 0.92);
assert.equal(Number((course.ballon.y - course.pions.get('a')!.y).toFixed(2)), 0.42);

// Un même vol se poursuit selon sa vraie durée et ne redémarre pas à chaque réponse.
const vol = { de: { x: 30, y: 20 }, vers: { x: 50, y: 30 }, duree: 4, hauteur: 3, type: 'passe' as const };
const volA = { ...terrain([]), vol: { ...vol, ecoule: 1 } };
const volB = { ...terrain([]), vol: { ...vol, ecoule: 3 }, horloge: 20.033 };
const milieuVol = interpolerBallonDirect(volA, volB, new Map(), 0.5);
assert.equal(Number(milieuVol.x.toFixed(2)), 40);
assert.equal(Number(milieuVol.y.toFixed(2)), 25);
assert.ok(milieuVol.h > 2.9);

// Avec l'enveloppe événementielle du serveur, une passe reçoit une courbure
// déterministe : mêmes extrémités, même seed, même film chez deux spectateurs.
const volCourbe = { ...vol, id: 'passe:10:12:100', seed: 42, type: 'passe' as const };
const courbeA = { ...terrain([]), vol: { ...volCourbe, ecoule: 0 } };
const courbeB = { ...terrain([]), vol: { ...volCourbe, ecoule: 4 }, horloge: 20.033 };
const trajectoire1 = Array.from({ length: 41 }, (_, i) =>
  interpolerBallonDirect(courbeA, courbeB, new Map(), i / 40));
const trajectoire2 = Array.from({ length: 41 }, (_, i) =>
  interpolerBallonDirect(courbeA, courbeB, new Map(), i / 40));
assert.deepEqual(trajectoire1, trajectoire2);
assert.deepEqual(trajectoire1[0], { x: 30, y: 20, h: 0 });
assert.equal(trajectoire1.at(-1)?.x, 50);
assert.equal(trajectoire1.at(-1)?.y, 30);
assert.ok(Math.abs(trajectoire1[20].y - 25) > 0.2, 'La passe doit former une légère courbe en vue de dessus.');

// Une inversion brutale de vitesse ne peut plus créer une boucle d'Hermite.
const virageA = terrain([pion('a', 'domicile', 50, 30, 12, 9)]);
const virageB = { ...terrain([pion('a', 'domicile', 51, 31, -12, -9)]), horloge: 20.033 };
const virage = Array.from({ length: 101 }, (_, i) => interpolerPionsDirect(virageA, virageB, i / 100, 2).get('a')!);
assert.ok(virage.every((p) => p.x >= 49 && p.x <= 52 && p.y >= 29 && p.y <= 32),
  'La courbe d’un joueur doit rester près de ses deux positions vraies.');

// Après un retour d'onglet ou une reprise, une grande distance se rattrape par
// une transition bornée, jamais par une vieille vitesse extrapolée.
const repriseA = terrain([pion('a', 'domicile', 8, 8, 9, 0)]);
const repriseB = { ...terrain([pion('a', 'domicile', 112, 60, -9, 0)]), horloge: 21 };
const reprise = Array.from({ length: 101 }, (_, i) => interpolerPionsDirect(repriseA, repriseB, i / 100, 60).get('a')!);
assert.deepEqual(reprise[0], { x: 8, y: 8 });
assert.deepEqual(reprise.at(-1), { x: 112, y: 60 });
assert.ok(Math.max(...reprise.slice(1).map((p, i) => distance(p, reprise[i]))) < 2,
  'Une reprise lointaine doit rester continue à l’écran.');

// Si le couple de paquets change soudainement, la couche d'affichage rejoint
// la nouvelle vérité sur plusieurs images au lieu de l'appliquer d'un coup.
let amortie = { pions: new Map([['a', { x: 10, y: 10 }]]), ballon: { x: 10, y: 10, h: 0 } };
const cible = { pions: new Map([['a', { x: 22, y: 16 }]]), ballon: { x: 25, y: 18, h: 4 } };
const premiere = amortirImageDirect(amortie, cible, 1 / 60);
assert.ok(premiere.pions.get('a')!.x > 10 && premiere.pions.get('a')!.x < 22);
assert.ok(premiere.ballon.x > 10 && premiere.ballon.x < 25);
for (let i = 0; i < 45; i++) amortie = amortirImageDirect(amortie, cible, 1 / 60);
assert.ok(distance(amortie.pions.get('a')!, cible.pions.get('a')!) < 0.01,
  'La correction doit converger sans figer le joueur.');

console.log('OK — ballon continu, passes basses, corrections amorties, courses bornées et reprises sans téléportation.');
