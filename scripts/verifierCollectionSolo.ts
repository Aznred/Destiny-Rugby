import assert from 'node:assert/strict';
import { catalogueBaseCarriere, PACKS_CARRIERE } from '../src/lib/ligue/catalogueCarriere';
import { cleCarteSolo, etatCollectionSoloVide, IDS_PACKS_SOLO_GRATUITS, normaliserCollectionSolo, ouvrirPackSolo, packCollectionSolo, prixPackSolo } from '../src/lib/collectionSolo';

const catalogue = catalogueBaseCarriere();
assert.ok(PACKS_CARRIERE.length >= 30, 'Tous les packs du jeu doivent etre proposes dans la roue solo.');
assert.equal(new Set(PACKS_CARRIERE.map(pack => pack.id)).size, PACKS_CARRIERE.length, 'Chaque pack doit avoir un identifiant unique.');
assert.ok(catalogue.length > 10_000, 'Le catalogue mondial complet doit etre disponible hors ligne.');
assert.deepEqual([...IDS_PACKS_SOLO_GRATUITS], ['bronze', 'standard', 'or']);
for (const id of IDS_PACKS_SOLO_GRATUITS) {
  const pack = PACKS_CARRIERE.find(candidat => candidat.id === id);
  assert.ok(pack, `Le pack gratuit ${id} doit exister.`);
  assert.equal(prixPackSolo(pack), 0, `Le pack ${id} doit etre gratuit dans la collection solo.`);
}
const premierPayant = PACKS_CARRIERE.find(pack => !IDS_PACKS_SOLO_GRATUITS.includes(pack.id as typeof IDS_PACKS_SOLO_GRATUITS[number]))!;
assert.ok(prixPackSolo(premierPayant) > 0 && prixPackSolo(premierPayant) <= 350, 'Les packs payants en solo doivent avoir des tarifs calibres (25-350 Ovas).');
assert.ok(premierPayant.prix >= 400, 'Les prix de base pour le jeu en ligne doivent rester intacts.');

const cles = catalogue.map(carte => cleCarteSolo(carte.sourceId));
assert.equal(new Set(cles).size, catalogue.length, 'Les empreintes des joueurs doivent rester uniques.');

const ancienne = normaliserCollectionSolo({ possedees: cles.slice(0, 2), packsOuverts: { bronze: 1 }, doublons: 0 });
assert.equal(Object.keys(ancienne.quantites).length, 2, 'L ancienne collection gratuite doit etre conservee sur le compte.');

let etat = etatCollectionSoloVide();
for (const packBase of PACKS_CARRIERE) {
  const pack = packCollectionSolo(packBase);
  assert.ok(pack.cartes >= 10, `Le pack ${pack.id} doit contenir au moins 10 cartes en solo.`);
  assert.ok(pack.cartes > packBase.cartes, `Le pack ${pack.id} doit avoir plus de cartes en solo que le pack en ligne (${pack.cartes} vs ${packBase.cartes}).`);
  const resultat = ouvrirPackSolo(pack, catalogue, etat, () => .37);
  assert.equal(resultat.indices.length, pack.cartes, `Le pack ${pack.id} doit livrer le nombre de cartes annonce.`);
  if (pack.garantie) {
    const seuil = ['bronze', 'argent', 'or', 'elite', 'star'].indexOf(pack.garantie);
    assert.ok(resultat.indices.some(indice => ['bronze', 'argent', 'or', 'elite', 'star'].indexOf(catalogue[indice].rarete) >= seuil), `La garantie du pack ${pack.id} doit etre tenue.`);
  }
  etat = resultat.etat;
}

const bronze = PACKS_CARRIERE.find(pack => pack.id === 'bronze')!;
const premier = ouvrirPackSolo(bronze, catalogue, etatCollectionSoloVide(), () => .37);
assert.ok(premier.indices.length > new Set(premier.indices).size, 'Un pack doit pouvoir contenir plusieurs exemplaires du meme joueur.');
assert.ok(premier.etat.doublons > 0, 'Les exemplaires repetes doivent etre comptes comme doublons.');
const cleDouble = cleCarteSolo(catalogue[premier.indices[0]].sourceId);
assert.ok(premier.etat.quantites[cleDouble] > 1, 'La quantite possedee doit conserver les doublons.');

assert.equal(Object.values(etat.packsOuverts).reduce((somme, valeur) => somme + valeur, 0), PACKS_CARRIERE.length);
console.log(`OK — collection de compte verifiee sur ${catalogue.length} joueurs, trois packs gratuits et doublons actifs.`);
