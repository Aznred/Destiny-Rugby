import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { IDENTITES_JOUEURS_MONDIAUX } from '../src/data/identitesJoueursMondiaux';
import { EFFECTIFS_REELS } from '../src/data/effectifsReels';
import { catalogueBaseCarriere, catalogueMondialCarriere, carteDepuisSource, PACKS_CARRIERE } from '../src/lib/ligue/catalogueCarriere';
import { CATALOGUE_ADMIN_VIDE } from '../src/lib/ligue/atelierCatalogue';
import { analyserImport } from '../src/lib/ligue/importsJoueurs';
import { LOT_MLR_CHAMPIONSHIP_NPC } from '../serveur/lotImportJoueurs';
import { effectifDuClub } from '../src/lib/effectif';
import { fournirCatalogueEffectifs, sourceCatalogueEffectifs } from '../src/lib/catalogueEffectifs';
import { cleCarteSolo, etatCollectionSoloVide, ouvrirPackSolo } from '../src/lib/collectionSolo';

const normaliser = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const catalogue = catalogueBaseCarriere();
const parId = new Map(catalogue.map(s => [s.sourceId, s]));
assert.equal(parId.size, catalogue.length, 'une carte par identifiant');
const fiches = new Map<string, string>();
for (const [cle, identite] of Object.entries(IDENTITES_JOUEURS_MONDIAUX)) {
  assert.ok(parId.has(identite.sourceId), `fiche disponible : ${cle}`);
  fiches.set(identite.fiche, identite.sourceId);
  if (!identite.distinct) assert.equal(identite.sourceId, `reel:${cle.split('|')[0]}`, 'identifiant historique conservé');
}
const source = JSON.parse(readFileSync('sources/data/base_rugby_finale.json', 'utf8')) as Record<string, string>[];
for (const ligue of ['MLR', 'Champ Rugby', 'NPC']) {
  const lignes = source.filter(l => l.Ligue === ligue);
  for (const l of lignes) {
    const id = fiches.get(l['Lien Joueur']) ?? `reel:${normaliser(l.Joueur)}`;
    assert.ok(parId.has(id), `${ligue} : ${l.Joueur}, ${l['Lien Joueur']}`);
  }
  console.log(`${ligue} : ${new Set(lignes.map(l => l['Lien Joueur'])).size} joueurs source présents.`);
}
const analyses = analyserImport(LOT_MLR_CHAMPIONSHIP_NPC, CATALOGUE_ADMIN_VIDE);
assert.ok(analyses.every(a => a.verdict !== 'nouveau'), 'aucun nom du lot absent');
assert.ok(analyses.filter(a => (a.ligne.fichesSource ?? 1) > 1).every(a => a.verdict === 'present'), 'tous les homonymes source sont intégrés');
const restores = Object.entries(IDENTITES_JOUEURS_MONDIAUX).filter(([, i]) => i.distinct);
assert.equal(new Set(restores.map(([, i]) => i.sourceId)).size, 17);
for (const [cle, identite] of restores) {
  const club = cle.split('|')[1];
  const joueur = parId.get(identite.sourceId)!;
  const reel = EFFECTIFS_REELS[club].find(j => normaliser(j.nom) === normaliser(joueur.nom))!;
  assert.equal(joueur.famille, reel.poste, `poste de l'homonyme : ${cle}`);
  assert.equal(joueur.note, reel.note, `note propre : ${cle}`);
  assert.ok(effectifDuClub(club, 1).some(j => j.nom === joueur.nom && !j.regen), `effectif joueur/manager : ${cle}`);
  const carte = carteDepuisSource(joueur, 'ligue-test', 'club-test', 1);
  assert.equal(carte.sourceId, identite.sourceId, 'carte jouable en ligne');
  const pack = PACKS_CARRIERE.find(p => p.id === 'bronze')!;
  const tirage = ouvrirPackSolo(pack, [joueur], etatCollectionSoloVide(), () => 0.1);
  assert.ok(tirage.etat.quantites[cleCarteSolo(joueur.sourceId)] > 0, 'joueur obtenable dans les packs solo');
}
const joueur = parId.get('import:andrew-smith:waikato')!;
const ajout = { ...joueur, ajouteLe: '2026-10-05T00:00:00Z' };
const mondial = catalogueMondialCarriere({ ...CATALOGUE_ADMIN_VIDE, ajouts: { [joueur.sourceId]: ajout } });
assert.equal(mondial.length, catalogue.length, 'un ancien import du Labo ne double pas le joueur restauré');
assert.equal(mondial.filter(s => s.sourceId === joueur.sourceId).length, 1);

const ancienFetch = globalThis.fetch;
try {
  const nouveau = { ...ajout, sourceId: 'import:verification:club', nom: 'Joueur Vérification', clubReel: 'Waikato' };
  globalThis.fetch = async () => new Response(JSON.stringify({ revision: 1, joueurs: {}, ajouts: { [nouveau.sourceId]: nouveau }, speciales: {} }));
  const { synchroniserCatalogueSolo } = await import('../src/lib/catalogueSoloCommun');
  const solo = await synchroniserCatalogueSolo();
  assert.ok(solo.some(s => s.sourceId === nouveau.sourceId), 'ajout du Labo reçu par la collection solo');
  assert.ok(sourceCatalogueEffectifs().some(s => s.sourceId === nouveau.sourceId), 'ajout partagé avec les effectifs solo');
} finally { globalThis.fetch = ancienFetch; fournirCatalogueEffectifs(catalogue); }
console.log('OK : 17 homonymes restaurés, identifiants historiques, effectifs, packs solo, cartes en ligne et synchronisation du Labo.');
