import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assemblerStatistiques, fusionnerEnvoi, matiereDepuisLignes, validerEnvoi, type LigneUsage, type CompteurUsage, type EnvoiUsage } from '../src/lib/usage/agregats';
import { bilanCarrieres, fusionnerCarrieres, type CarriereUsage } from '../src/lib/usage/carrieres';
import { fournirCatalogueUsage, fusionnerJaugesCollection, jaugesCollection } from '../src/lib/usage/collection';
import { stockageFichier } from '../serveur/carriereFichier';
import { creerMatchDEmpreinte } from './outilsEmpreinte';
import { avancer, DT } from '../src/lib/moteur/moteur';
import { activerDirect, demanderDirect, majVueDirecte } from '../src/lib/moteur/direct';
import { sens } from '../src/lib/moteur/terrain';
import type { SourceCarte } from '../src/lib/ligue/catalogueCarriere';
// @ts-expect-error lecteur 3D JavaScript partagé avec les bancs
import { PhysicalPlayers } from '../public/rn26/placements.mjs';

const maintenant = Date.parse('2026-10-07T12:00:00Z'), jour = '2026-10-07';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const carriere: CarriereUsage = { id: id(1), type: 'existant', debut: '2026-08-01', dernier: jour, club: 'Stade Toulousain', poste: 'demi_melee', incarne: 'Antoine Dupont', matchs: 24, saisons: 2, secondes: 3600, fermee: false };
const envoi: EnvoiUsage = { appareil: id(2), jour, premier: jour, modePremier: 'existant', secondes: { existant: 600 }, sessions: 1,
  compteurs: { 'sessions.existant': 1, 'obtenue.Antoine Dupont': 3, 'utilisee.Antoine Dupont': 2 }, carrieres: [carriere],
  jauges: { taille: 25, exemplaires: 30, packs: 3, genEquipe: 75, rares: [{ nom: 'Antoine Dupont', rarete: 'star', note: 92, n: 1 }] } };
assert.ok(validerEnvoi(envoi, maintenant));
assert.equal(validerEnvoi({ ...envoi, carrieres: [{ ...carriere, secondes: Infinity }] }, maintenant), null);
assert.equal(validerEnvoi({ ...envoi, premier: '2026-02-30' }, maintenant), null);
assert.equal(validerEnvoi({ ...envoi, jauges: { ...envoi.jauges, rares: new Array(61).fill(envoi.jauges!.rares![0]) } }, maintenant), null);
const prive = validerEnvoi({ ...envoi, carrieres: [{ ...carriere, type: 'cree', incarne: 'Nom privé' }] }, maintenant)!;
assert.equal(prive.carrieres![0].incarne, undefined);
const carrieres: CarriereUsage[] = [];
fusionnerCarrieres(carrieres, [carriere]); fusionnerCarrieres(carrieres, [carriere]);
assert.equal(carrieres.length, 1);
fusionnerCarrieres(carrieres, [{ ...carriere, dernier: '2026-09-01', matchs: 1, secondes: 1 }]);
assert.equal(carrieres[0].matchs, 24);
fusionnerCarrieres(carrieres, [{ ...carriere, id: id(3), dernier: '2026-09-01', matchs: 12, secondes: 1800 }]);
const bilan = bilanCarrieres(carrieres, 'tout', jour).bilans.find(c => c.type === 'existant')!;
assert.deepEqual([bilan.nombre, bilan.actives, bilan.abandonnees, bilan.matchsAvantAbandon], [2, 1, 1, 12]);
const lignes: LigneUsage[] = [], compteurs: CompteurUsage[] = [];
fusionnerEnvoi(lignes, compteurs, envoi);
const stats = assemblerStatistiques({ ...matiereDepuisLignes(lignes, compteurs, '7', jour), carrieres: bilanCarrieres(carrieres, '7', jour) }, '7');
assert.equal(stats.comparaison[1].creations, 0);
assert.equal(stats.comparaison[1].matchsParCarriere, 24, 'une ancienne carrière active a une moyenne, même sans création dans la période');
assert.equal(stats.details.sessions.existant!.moyenne, 600);
assert.equal(stats.details.genEquipe, 75);
fusionnerEnvoi(lignes, compteurs, { ...envoi, secondes: {}, sessions: 0, compteurs: {}, jauges: { ...envoi.jauges!, rares: [] } });
assert.deepEqual(matiereDepuisLignes(lignes, compteurs, 'tout', jour).collections.rares, [], 'une carte cédée disparaît du relevé de possession');
const fichier = join(mkdtempSync(join(tmpdir(), 'correctif25-')), 'usage.json');
const stockage = stockageFichier(fichier);
await stockage.enregistrerUsage(envoi);
const depuisFichier = await stockage.matiereUsage('7', jour);
assert.equal(depuisFichier!.carrieres!.bilans.find(c => c.type === 'existant')!.actives, 1);
assert.ok(!JSON.stringify(assemblerStatistiques(depuisFichier!, '7')).includes(id(2)), 'le Labo ne reçoit aucune identité');

const familles = ['pilier', 'pilier', 'talonneur', 'deuxieme_ligne', 'deuxieme_ligne', 'troisieme_ligne', 'troisieme_ligne', 'troisieme_ligne', 'demi_melee', 'demi_ouverture', 'centre', 'centre', 'ailier', 'ailier', 'arriere'];
const catalogue = familles.map((famille, i) => ({ sourceId: `c${i}`, nom: `Joueur ${i}`, famille, note: 75, rarete: i === 8 ? 'star' : 'bronze' })) as SourceCarte[];
fournirCatalogueUsage(catalogue, x => x);
const collection = { quantites: Object.fromEntries(catalogue.map(c => [c.sourceId, 1])), packsOuverts: { bronze: 2 }, doublons: 0 };
assert.equal(jaugesCollection(collection).genEquipe, 75);
assert.equal(jaugesCollection(collection).rares!.length, 1);
assert.equal(jaugesCollection(collection).xv!.length, 15);
assert.equal(validerEnvoi({ ...envoi, jauges: jaugesCollection(collection) }, maintenant)!.jauges!.xv!.length, 15);
assert.equal(fusionnerJaugesCollection(jaugesCollection(collection), jaugesCollection({ ...collection, quantites: { c8: 1 } })).genEquipe, undefined);
assert.equal(jaugesCollection({ ...collection, quantites: { c8: 1 } }).genEquipe, undefined, 'un XV incomplet n’invente pas une note d’équipe');
console.log('Statistiques : snapshots, anciennes carrières, abandon, sessions, cartes rares et XV vérifiés.');

for (const arcade of [false, true]) {
  const e = creerMatchDEmpreinte(2, { ia: 5 });
  const h = e.pions.find(p => p.moi)!;
  e.phase = 'jeuCourant'; e.placement = null; e.ruck = null; e.vol = null; e.ballonLibre = null; e.lancement = null; e.cellule = null; e.duel = null;
  e.pions.forEach((p, i) => { p.pos = { x: 95 + i % 4, y: 3 + i * 1.9 }; p.cible = { ...p.pos }; p.corps = undefined; p.battu = 0; p.vitesse = { x: 0, y: 0 }; });
  h.pos = { x: 65, y: 35 }; h.cible = { ...h.pos }; h.numero = 10;
  e.porteur = h; e.possession = h.cote; e.ballon = { ...h.pos }; e.origine = { ...h.pos }; e.minuteur = 99; e.gardeRuck = 0; e.ligneDef = 90;
  if (arcade) e.controleArcadeCamps = [h.cote];
  activerDirect(e, true); majVueDirecte(e);
  demanderDirect(e, { action: 'coupDePied', visee: { x: sens(h.cote), y: 0, puissance: .6 } });
  avancer(e, DT);
  assert.ok(e.piedPrepare?.pretDepuis !== undefined, 'le geste démarre au pas de la demande');
  const debut = e.piedPrepare!.pretDepuis!, defenseur = e.pions.find(p => p.cote !== h.cote && p.surLeTerrain)!;
  defenseur.pos = { x: h.pos.x + sens(h.cote) * .3, y: h.pos.y }; defenseur.cible = { ...defenseur.pos }; defenseur.vitesse = { x: 0, y: 0 };
  avancer(e, DT);
  assert.equal(e.piedPrepare, undefined, 'le plaquage annule le kick, y compris en arcade');
  assert.ok(e.vol?.type !== 'pied');
  assert.ok(e.sim - debut <= .3);
}
console.log('Kicks : préparation immédiate et plaquage avant frappe, en carrière et en arcade.');

// La broadphase conserve la trajectoire exacte, même pendant des changements de cellule et des croisements.
for (const dense of [false, true]) {
  const joueurs = Array.from({ length: 30 }, (_, i) => ({ id: `p${i}`, visible: true, number: i % 15 + 1, team: i < 15 ? 0 : 1,
    x: (i % 10) * (dense ? .4 : 4), z: Math.floor(i / 10) * (dense ? .5 : 8), source: { role: 'ligne', vitesseMax: 8 } }));
  const apres = new PhysicalPlayers(), avant = new PhysicalPlayers();
  const commun = { slots: new Map(), phase: 'jeuCourant', e: { placementJoue: false }, progress: () => 0 };
  for (let t = 0; t < 180; t++) {
    const cibles = joueurs.map((p, i) => ({ ...p, x: p.x + Math.sin(t / 25 + i) * 4, z: p.z + Math.cos(t / 30 + i) * 4 }));
    const a = avant.update(cibles, 1 / 60, { ...commun, broadphase: false }), b = apres.update(cibles, 1 / 60, commun);
    for (let i = 0; i < a.length; i++) assert.ok(Math.hypot(a[i].x - b[i].x, a[i].z - b[i].z) < 1e-10, 'la grille conserve la physique');
  }
}
console.log('Physique : 10 800 comparaisons de positions avec et sans grille, identiques.');
