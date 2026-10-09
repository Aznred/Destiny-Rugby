import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { catalogueMondialCarriere, PACKS_CARRIERE, packsChampionnatsFeminins, carteDepuisSource } from '../src/lib/ligue/catalogueCarriere';
import { fournirPoolFfr } from '../src/lib/ligue/eligibiliteJoueurs';
import { CATALOGUE_ADMIN_VIDE } from '../src/lib/ligue/atelierCatalogue';
import { catalogueSpecial, definitionsDepart } from '../src/lib/ligue/catalogueSpecial';
import { chanceSpecialeParCarte } from '../src/lib/ligue/cartesSpeciales';
import { PALIERS_PACK, modelePack, modelePackParNom, packPropose, rangPack, evolutionEliteFrancaise } from '../src/lib/presentationPacks';
import { packsCollectionSolo, packsEvenementSolo, ouvrirPackSolo, etatCollectionSoloVide } from '../src/lib/collectionSolo';
import { LOGOS_CLUBS_FEMININS } from '../src/data/logosFeminins.generated';
import { CHAMPIONNATS_FEMININS } from '../src/data/mondeFeminin.generated';
import { TROPHEES, TROPHEE_PAR_DIVISION } from '../src/data/trophees';
import { calendrierCompetition } from '../src/lib/championnat';
import { divisionAuDessus, divisionEnDessous } from '../src/lib/promotion';
import { graine } from '../src/lib/ligue/aleatoire';

fournirPoolFfr(() => ({ pool: 'mixed', joueurs: [] }));
const catalogue = catalogueMondialCarriere(), femmes = catalogue.filter(c => c.gender === 'female');
const packs = [...PACKS_CARRIERE, ...packsChampionnatsFeminins(catalogue)];
assert.deepEqual(PALIERS_PACK, ['bronze','argent','or','elite','star','special','icon']);
assert.ok(packs.every(packPropose));
assert.equal(packsCollectionSolo(packs).length, packs.length);
assert.ok(!packs.some(p => ['grand','premium','avants','superRugby'].includes(p.id)));
for (const p of packs) {
  assert.ok(existsSync('public' + modelePackParNom(p)), `Pochette absente : ${p.nom}`);
  if (p.id.startsWith('womens:')) assert.ok(new Set(femmes.filter(c => p.filtre?.championnats?.includes(c.championnat)).map(c => c.rarete)).size > 1, `Plusieurs niveaux réels : ${p.nom}`);
}
for (const palier of PALIERS_PACK) for (const ouvert of [false,true]) {
  const buf = readFileSync('public' + modelePack(palier, ouvert));
  assert.equal(buf.readUInt32LE(0), 0x46546c67);
  assert.equal(buf.readUInt32LE(8), buf.length);
}
for (const c of femmes) assert.ok(LOGOS_CLUBS_FEMININS[c.clubReel], `Blason absent : ${c.clubReel}`);
for (const c of CHAMPIONNATS_FEMININS) {
  const trophee = TROPHEES[TROPHEE_PAR_DIVISION[c.id]];
  assert.ok(trophee && existsSync('public' + trophee.modele));
}
for (const championnat of ['Liga Iberdrola', "Women's All-Ireland League 1A", "Women's All-Ireland League 1B"]) {
  const joueuses = femmes.filter(c => c.championnat === championnat);
  assert.ok(joueuses.length >= 30, championnat);
  assert.ok(new Set(joueuses.map(c => c.rarete)).size > 1, `Plusieurs raretés : ${championnat}`);
}
const elites = packs.find(evolutionEliteFrancaise)!;
assert.deepEqual(elites.filtre?.championnats, ['Élite 1 Féminine','Élite 2 Féminine']);
assert.ok(modelePackParNom(elites).endsWith('f-elite2.glb'));
assert.equal(divisionAuDessus('f-fpc2'), 'f-fpc');
assert.equal(divisionEnDessous('f-fpc'), 'f-fpc2');
for (const id of ['f-fpc','f-fpc2']) {
  const c = CHAMPIONNATS_FEMININS.find(c => c.id === id)!;
  assert.equal(c.clubs.length, 6);
  assert.equal(calendrierCompetition(id, c.clubs.map(c => c.nom)).length, 5);
}
const definitions = definitionsDepart();
const speciales = catalogueSpecial({ ...CATALOGUE_ADMIN_VIDE, revision: 99,
  speciales: { cartes: Object.fromEntries(definitions.map(d => [d.id, { published: true, image: d.image || '/photos/essai.webp' }])) } });
const instant = Date.parse('2026-10-09T12:00:00Z');
const rose = packsEvenementSolo(speciales, instant).find(p => p.id === 'evenement-octobre-rose-2026')!;
assert.ok(rose && rose.cartes === 10 && rose.prix === 150);
assert.ok(modelePackParNom(rose).endsWith('octobre-rose.glb'));
assert.ok(!packsEvenementSolo(speciales, Date.parse('2026-11-01T00:00:00Z')).some(p => p.id === rose.id));
const sources = [...catalogue, ...speciales.sources.values()];
for (let seed = 0; seed < 30; seed++) {
  const r = ouvrirPackSolo(rose, sources, etatCollectionSoloVide(), graine(`rose-${seed}`), { speciales, maintenant: instant });
  assert.equal(r.indices.length, 10);
  assert.ok(r.indices.some(i => sources[i].speciale?.type === 'octobre-rose'));
}
for (const pack of PACKS_CARRIERE.filter(p => ['bronze','standard','or'].includes(p.id))) {
  const icon = chanceSpecialeParCarte(pack, speciales.evenementParId.get('icons')!);
  const special = chanceSpecialeParCarte(pack, speciales.evenementParId.get('halloween-2026')!);
  assert.ok(icon > 0 && icon < special && special < pack.probabilites.star);
}
for (const type of ['icon','halloween','octobre-rose','influencer']) {
  const source = [...speciales.sources.values()].find(s => s.speciale?.type === type);
  if (source) assert.equal(rangPack(carteDepuisSource(source, 'verification', 'club', 1)), type === 'icon' ? 6 : 5);
}
console.log(`OK : ${femmes.length} joueuses, ${packs.length} packs texturés, 85 blasons, 12 titres, 7 paliers et 30 garanties Octobre Rose.`);
