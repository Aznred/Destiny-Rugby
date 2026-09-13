import assert from 'node:assert/strict';
import { catalogueBaseCarriere } from '../src/lib/ligue/catalogueCarriere';
import { cleCarteSolo, etatCollectionSoloVide, ouvrirPackSolo, PACKS_SOLO } from '../src/lib/collectionSolo';

const catalogue = catalogueBaseCarriere();
assert.deepEqual(PACKS_SOLO.map(pack => pack.id), ['bronze', 'argent', 'or'], 'Le solo ne doit proposer que Bronze, Argent et Or.');
assert.ok(catalogue.length > 10_000, 'Le catalogue mondial complet doit être disponible hors ligne.');

const cles = catalogue.map(carte => cleCarteSolo(carte.sourceId));
assert.equal(new Set(cles).size, catalogue.length, 'Les empreintes locales des joueurs doivent rester uniques.');

let etat = etatCollectionSoloVide();
for (let ouverture = 0; ouverture < 20; ouverture++) {
  const pack = PACKS_SOLO[ouverture % PACKS_SOLO.length];
  const resultat = ouvrirPackSolo(pack, catalogue, etat, () => .37);
  assert.equal(resultat.indices.length, pack.cartes, 'Chaque pack doit livrer le nombre de cartes annoncé.');
  assert.equal(new Set(resultat.indices).size, resultat.indices.length, 'Un même pack ne doit pas contenir deux fois la même carte.');
  assert.equal(resultat.nouvelles, pack.cartes, 'La protection anti-doublon doit faire progresser une collection incomplète.');
  if (pack.id === 'or') assert.ok(catalogue[resultat.indices[0]].note >= 65, 'Le pack Or doit garantir une première carte Or ou mieux.');
  etat = resultat.etat;
}

assert.equal(etat.possedees.size, 60, 'Vingt packs de trois cartes doivent débloquer soixante joueurs distincts.');
assert.equal(Object.values(etat.packsOuverts).reduce((somme, valeur) => somme + valeur, 0), 20);
console.log(`OK — collection solo vérifiée sur ${catalogue.length} joueurs, 3 packs gratuits et 60 tirages protégés.`);
