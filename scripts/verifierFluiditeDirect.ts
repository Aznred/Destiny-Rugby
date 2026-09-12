import assert from 'node:assert/strict';
import {
  interpolerBallonDirect, interpolerImageDirect, interpolerPionsDirect,
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
assert.ok(imagesPasse.slice(10, -10).some((b) => b.h > 0.5),
  'Une passe manquée par le sondage doit conserver une arche lisible.');

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

console.log('OK — ballon continu, passes intermédiaires reconstruites, courses bornées et reprises sans téléportation.');
