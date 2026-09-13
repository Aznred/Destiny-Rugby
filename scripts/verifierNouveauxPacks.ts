import assert from 'node:assert/strict';
import { catalogueBaseCarriere, packsBoutiqueDuJour, PACKS_CARRIERE, RARETES_CARRIERE, rayonDePack } from '../src/lib/ligue/catalogueCarriere';
import { TEXTES_EN_LIGNE } from '../src/data/textesEnLigne';

const ids = ['nationale', 'federales', 'premiership', 'urc', 'superRugby', 'leagueOne', 'sixNations',
  'rugbyChampionship', 'franceXV', 'springboks', 'allBlacks', 'wallabies', 'pumas', 'nationsCeltes', 'europeEmergente'];
const catalogue = catalogueBaseCarriere();
assert.equal(new Set(PACKS_CARRIERE.map(pack => pack.id)).size, PACKS_CARRIERE.length, 'Chaque pack doit avoir un identifiant unique.');
for (const id of ids) {
  const pack = PACKS_CARRIERE.find(candidat => candidat.id === id);
  assert.ok(pack, `Pack ${id} absent.`);
  const rayon = RARETES_CARRIERE.flatMap(rarete => [...rayonDePack(rarete, pack)]);
  assert.ok(rayonsUniques(rayon) >= pack.cartes * 3, `Le pack ${id} ne possède que ${rayon.length} cartes disponibles.`);
  assert.ok(rayon.every(carte => !pack.filtre || respecteFiltreVisible(carte, pack.filtre)), `Le pack ${id} laisse passer une carte hors filtre.`);
}
for (const [cle, traduction] of Object.entries(TEXTES_EN_LIGNE)) {
  for (const langue of ['fr', 'en', 'es', 'it', 'de', 'pt', 'ja'] as const) {
    assert.ok(traduction[langue]?.trim(), `${cle} n'est pas traduit en ${langue}.`);
  }
}
const rayonPermanent = packsBoutiqueDuJour(PACKS_CARRIERE, Date.parse('2026-09-11T12:00:00+02:00'));
assert.deepEqual(rayonPermanent.map(pack => pack.id), ['bronze', 'standard', 'or'], 'La boutique doit rester limitée aux trois packs permanents par défaut.');
const aujourdHui = packsBoutiqueDuJour(PACKS_CARRIERE, Date.parse('2026-09-11T12:00:00+02:00'), true);
assert.deepEqual(aujourdHui.slice(3).map(pack => pack.id), ['springboks', 'premiership', 'top14'], 'La sélection du 11 septembre doit contenir les trois packs annoncés.');
console.log(`OK — ${ids.length} nouveaux packs, ${catalogue.length} joueurs et ${Object.keys(TEXTES_EN_LIGNE).length} textes en 7 langues contrôlés.`);

function rayonsUniques(rayons: readonly { sourceId: string }[]): number {
  return new Set(rayons.map(carte => carte.sourceId)).size;
}

function respecteFiltreVisible(carte: { nation: string; championnat: string }, filtre: { nations?: string[]; championnats?: string[] }): boolean {
  return (!filtre.nations || filtre.nations.includes(carte.nation))
    && (!filtre.championnats || filtre.championnats.includes(carte.championnat));
}
