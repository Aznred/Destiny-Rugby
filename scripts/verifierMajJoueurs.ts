import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PHOTO_JOUEUR_MAJ, NB_PHOTOS_MAJ } from '../src/data/photosMaj';
import { EVALUATION_JOUEUR_MAJ } from '../src/data/evaluationsJoueursMaj';
import { photoReelle, normaliserNom } from '../src/lib/avatars';
import { catalogueMondialCarriere } from '../src/lib/ligue/catalogueCarriere';
import { avancerCarriere, creerCarriere } from '../src/lib/ligue/carriere';

assert.equal(NB_PHOTOS_MAJ, 928);
for (const chemin of new Set(Object.values(PHOTO_JOUEUR_MAJ))) {
  assert.ok(existsSync(join(process.cwd(), 'public', chemin)), `Photo absente : ${chemin}`);
}
assert.equal(photoReelle('Nicholas Gasperini'), photoReelle('Gasperini Nicholas'));
assert.equal(photoReelle('Finn Russell'), photoReelle('Russell Finn'));
assert.equal(photoReelle('Inconnu Smith'), undefined, 'un simple nom de famille ne doit jamais choisir un visage');

const catalogue = catalogueMondialCarriere();
const avecNouvellePhoto = catalogue.filter(j => j.photo?.startsWith('/photos/maj/'));
const evalues = catalogue.filter(j => EVALUATION_JOUEUR_MAJ[normaliserNom(j.nom)]);
assert.ok(avecNouvellePhoto.length >= 650, `${avecNouvellePhoto.length} nouvelles photos seulement reliées au catalogue`);
assert.ok(evalues.length >= 100, `${evalues.length} joueurs évalués seulement présents au catalogue`);
const note = (nom: string) => catalogue.find(j => normaliserNom(j.nom) === normaliserNom(nom))?.note ?? 0;
assert.ok(note('Louis Bielle-Biarrey') >= 95);
assert.ok(note('Sacha Feinberg-Mngomezulu') >= 95);
assert.ok(note('Antoine Dupont') >= 94);
assert.ok(note('Finn Russell') >= 93);
assert.ok(catalogue.every(j => j.note >= 30 && j.note <= 99));
for (const joueur of catalogue) {
  const evaluation = EVALUATION_JOUEUR_MAJ[normaliserNom(joueur.nom)];
  if (evaluation && /^(RugbyPass|FloRugby|We Talk Rugby)/.test(evaluation.source)) assert.equal(joueur.note, evaluation.note);
}

const sourceDupont = catalogue.find(j => normaliserNom(j.nom) === 'antoine dupont')!;
const ligue = creerCarriere({ id: 'maj-joueurs', nom: 'Test', code: 'TEST', compteId: 'compte', pseudo: 'Test', clubNom: 'Test', rythme: 1, maxClubs: 4 }, Date.now(), 'maj');
ligue.cartes[0] = { ...ligue.cartes[0], sourceId: sourceDupont.sourceId, nom: 'Dupont Antoine', note: 50, rarete: 'argent', photo: undefined };
const migree = avancerCarriere(ligue, Date.now(), 'maj').cartes[0];
assert.equal(migree.nom, sourceDupont.nom);
assert.equal(migree.note, sourceDupont.note);
assert.equal(migree.rarete, sourceDupont.rarete);
assert.equal(migree.photo, sourceDupont.photo);

console.log(`OK mise à jour : ${NB_PHOTOS_MAJ} fichiers, ${Object.keys(PHOTO_JOUEUR_MAJ).length} noms/alias, ${avecNouvellePhoto.length} portraits reliés, ${evalues.length} GEN réévalués dans la collection.`);
