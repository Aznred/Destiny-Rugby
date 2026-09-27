import assert from 'node:assert/strict';
import { apparenceJoueurMatch } from '../src/lib/moteur/apparenceMatch';
import { morphologieSprite } from '../src/lib/moteur/morphologieSprite';

const grandMince = morphologieSprite(208, 88, 65, 'avant');
const petitMassif = morphologieSprite(174, 140, 65, 'avant');
const musculaire = morphologieSprite(184, 110, 95, 'athletique');
const plusLeger = morphologieSprite(184, 75, 60, 'athletique');

assert.ok(grandMince.corps.height > petitMassif.corps.height, 'La taille doit changer la hauteur affichée.');
assert.ok(grandMince.corps.legLength > petitMassif.corps.legLength, 'Les grandes jambes doivent être visibles.');
assert.ok(petitMassif.corps.torsoWidth > grandMince.corps.torsoWidth * 1.5, 'Le joueur massif doit avoir un buste nettement plus large.');
assert.ok((petitMassif.corps.belly ?? 0) > 1, 'Le ventre du joueur très lourd doit ressortir.');
assert.ok((plusLeger.corps.belly ?? 0) === 0, 'Un joueur mince ne doit pas avoir de ventre.');
assert.ok(musculaire.corps.shoulderWidth > plusLeger.corps.shoulderWidth, 'La force doit élargir les épaules.');
assert.ok((musculaire.corps.belly ?? 0) < .2, 'Un joueur musclé doit garder une taille distincte d’un joueur corpulent.');

const dupont = apparenceJoueurMatch('Antoine Dupont', 'demi_melee');
const furlong = apparenceJoueurMatch('Tadhg Furlong', 'pilier_droit');
const etzebeth = apparenceJoueurMatch('Eben Etzebeth', 'deuxieme_ligne_g');
assert.equal(dupont.tailleCm, 177);
assert.equal(furlong.barbe, 'none', 'Le portrait de Tadhg Furlong est rasé.');
assert.equal(etzebeth.barbe, 'full_beard', 'Le portrait d’Eben Etzebeth porte une barbe fournie.');
assert.ok(etzebeth.tailleCm > dupont.tailleCm + 10);

console.log('Morphologies et portraits des joueurs vérifiés.');
