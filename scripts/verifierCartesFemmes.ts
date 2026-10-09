import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { catalogueMondialCarriere, packsChampionnatsFeminins, carteDepuisSource } from '../src/lib/ligue/catalogueCarriere';
import { fournirPoolFfr } from '../src/lib/ligue/eligibiliteJoueurs';
import { CHAMPIONNATS_FEMININS, effectifFeminin } from '../src/data/mondeFeminin.generated';
import { creerDivisionPublique, avancerCarriere, vueCarriere, agirCarriere } from '../src/lib/ligue/carriere';
import { cleCarteSolo, ouvrirPackSolo, packCollectionSolo, packsCollectionSolo, etatCollectionSoloVide } from '../src/lib/collectionSolo';
import { fournirCatalogueEffectifs, joueursCatalogueDuClub } from '../src/lib/catalogueEffectifs';
import { marcheVide, publierAnnonce, vueMarchePartage, echeancesMarche } from '../src/lib/ligue/marchePartage';

let pool: 'men' | 'women' | 'mixed' = 'mixed';
const ajouts = [] as const;
fournirPoolFfr(() => ({ pool, joueurs: ajouts }));
const catalogue = catalogueMondialCarriere(), femmes = catalogue.filter(c => c.gender === 'female');
const attendues = CHAMPIONNATS_FEMININS.flatMap(c => c.clubs.flatMap(club => (effectifFeminin(club.nom) ?? []).filter(j => !j.generee && j.age >= 18)));
assert.equal(femmes.length, attendues.length);
assert.ok(femmes.length > 1000);
assert.equal(new Set(femmes.map(c => c.sourceId)).size, femmes.length);
const packs = packsChampionnatsFeminins();
const championnats = new Set(femmes.map(c => c.championnat)).size;
assert.equal(packs.length, championnats - 1, 'Élite 1 et Élite 2 partagent leur pack évolutif.');
assert.equal(packsCollectionSolo(packs).length, packs.length, 'Les packs féminins figurent dans la boutique solo.');
console.log(`Catalogue : ${femmes.length} joueuses et ${packs.length} packs.`);
for (const pack of packs) {
  const resultat = ouvrirPackSolo(packCollectionSolo(pack), catalogue, etatCollectionSoloVide(), () => .51);
  assert.ok(resultat.indices.length >= 10);
  for (const indice of resultat.indices) {
    const source = catalogue[indice];
    assert.equal(source.gender, 'female');
    assert.ok(pack.filtre!.championnats!.includes(source.championnat));
    assert.ok(resultat.etat.quantites[cleCarteSolo(source.sourceId)]);
  }
}
console.log('Ouverture des packs solo validée.');
fournirCatalogueEffectifs(catalogue);
assert.ok(joueursCatalogueDuClub('Stade Toulousain').every(c => c.gender !== 'female'), 'Le club masculin conserve son effectif.');
assert.ok(joueursCatalogueDuClub('Stade Toulousain').some(c => c.nom.includes('DUPONT')));
const compteId = randomUUID(), maintenant = Date.now();
const publique = creerDivisionPublique({id:randomUUID(),code:'PUBLIC-FEMMES',compteId,pseudo:'Vérification',clubNom:'Club'},1,1,maintenant,'femmes');
console.log('Division publique créée.');
assert.equal(publique.playerPool, 'mixed');
const ancienne = structuredClone(publique); ancienne.playerPool = 'men'; ancienne.packs = ancienne.packs.filter(p => !p.id.startsWith('womens:'));
ancienne.cartesSpeciales = false;
ancienne.packs.find(p => p.id === 'bronze')!.probabilites = { bronze:90, argent:9.5, or:.5, elite:0, star:0 };
ancienne.clubs[0].packsGratuits = [{ id:'ancien-pack', packId:'premium', recuLe:new Date(maintenant).toISOString() }];
const ouverte = avancerCarriere(ancienne, maintenant, 'femmes');
assert.equal(ouverte.playerPool, 'mixed');
assert.equal(ouverte.cartesSpeciales, true);
assert.ok(ouverte.packs.find(p => p.id === 'bronze')!.probabilites.star > 0);
assert.equal(ouverte.clubs[0].packsGratuits![0].packId, 'standard', 'Un ancien pack offert reste ouvrable.');
assert.deepEqual(vueCarriere(ouverte, compteId).packsActifs, ['bronze', 'standard', 'or'], 'La division publique propose uniquement Bronze, Argent et Or.');
assert.throws(() => agirCarriere(ouverte, compteId, {type:'ouvrirPack',packId:packs[0].id},maintenant,'femmes'), /désactivé/, 'Les packs féminins dédiés ne s’ouvrent pas en division publique.');
assert.throws(() => agirCarriere(ouverte, compteId, {type:'ouvrirPack',packId:'premium'},maintenant,'femmes'), /désactivé/);
let joueuseTiree = false;
for (let essai = 0; essai < 100 && !joueuseTiree; essai++) {
  const apresPack = agirCarriere(ouverte, compteId, {type:'ouvrirPack',packId:'or'},maintenant,`femmes-${essai}`);
  joueuseTiree = apresPack.cartes.some(c => c.gender === 'female' && c.proprietaire === ouverte.clubs[0].id);
}
assert.ok(joueuseTiree, 'Les cartes femmes continuent de sortir du pack Or public.');
const marche = marcheVide(1), carte = carteDepuisSource(femmes[0], ouverte.id, ouverte.clubs[0].id, 1);
publierAnnonce(marche, {id:'femmes',carte,vendeur:{ligueId:ouverte.id,clubId:ouverte.clubs[0].id,pseudo:'Test',nom:'Club',division:1},type:'directe',prix:100,publieLe:new Date(maintenant).toISOString(),expireLe:new Date(maintenant+3600000).toISOString(),etat:'ouverte'});
echeancesMarche(marche, maintenant);
assert.equal(vueMarchePartage(marche,1,ouverte.id,maintenant).ventes.length, 1);
pool = 'men'; assert.ok(catalogueMondialCarriere().every(c => c.gender !== 'female'));
pool = 'women'; assert.ok(catalogueMondialCarriere().length >= femmes.length); assert.ok(catalogueMondialCarriere().every(c => c.gender === 'female'));
console.log(`${femmes.length} joueuses seniors, ${packs.length} packs, ouverture solo et division publique, migration, marché et séparation des effectifs validés.`);
