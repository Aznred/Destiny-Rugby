import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { CLUBS_AMATEURS } from '../src/data/amateurs';
import { PHOTOS_FFR_PAR_ID, PHOTOS_FFR_SUPPLEMENTAIRES } from '../src/data/photosFfr';
import { JOUEURS_DETOURES_SUPPLEMENTAIRES } from '../src/data/photosDetourees';
import { POSTE_PAR_ID } from '../src/data/rugby';
import { joueursFfrDuClub, photoJoueurFfr, normaliserNomFfr } from '../src/lib/joueursFfr';
import { effectifDuClub } from '../src/lib/effectif';
import { catalogueBaseCarriere, carteDepuisSource, coequipierDepuisCarte, dotationBronzeCarriere } from '../src/lib/ligue/catalogueCarriere';
import { creerCarriere, avancerCarriere } from '../src/lib/ligue/carriere';

const source = JSON.parse(fs.readFileSync('../photos/effectifs_ffr_enrichis.json', 'utf8'));
const clubsSource = new Map<number, { joueurs: { id: number; poste?: string }[] }>(source.clubs.map((c: { structure_id: number }) => [c.structure_id, c]));
const numerosParLibelle: Record<string, number[]> = {
  'Pilier gauche': [1], Talonneur: [2], 'Pilier droit': [3], 'Deuxième ligne': [4, 5],
  'Troisième ligne aile': [6, 7], 'Troisième ligne centre': [8], 'Demi de mêlée': [9],
  "Demi d'ouverture": [10], Ailier: [11, 14], Centre: [12, 13], Arrière: [15],
  Pilier: [1, 3], 'Troisième ligne': [6, 7, 8],
};
let postes = 0, polyvalents = 0, portraits = 0, ajouts = 0;
for (const club of Object.values(CLUBS_AMATEURS).flat()) {
  const origines = new Map(clubsSource.get(club.structureId)!.joueurs.map(j => [j.id, j]));
  const liste = joueursFfrDuClub(club.nom);
  const effectif = effectifDuClub(club.nom, 1);
  for (const j of liste) {
    const i = j.indexSource;
    assert.ok(j.nom.trim(), `${club.nom}: licencié sans identité`);
    const reel = effectif.find(p => p.id === `${club.nom}-am-${i}`);
    assert.ok(reel, `${club.nom}: identité du licencié ${j.nom} modifiée`);
    if (!j.ffrId) ajouts++;
    const libelle = j.ffrId ? origines.get(j.ffrId)?.poste : undefined;
    if (libelle) {
      assert.ok(numerosParLibelle[libelle].includes(POSTE_PAR_ID[reel.poste].numero), `${j.nom}: ${libelle} attendu`);
      assert.deepEqual(reel.postesSecondaires, j.postesSecondaires);
      postes++;
    }
    if (j.postesSecondaires.length) polyvalents++;
    if (j.photo) { assert.equal(reel.photo, j.photo); portraits++; }
  }
}
assert.equal(postes, 44_133);
assert.equal(ajouts, 7 + Object.values(JOUEURS_DETOURES_SUPPLEMENTAIRES).reduce((n, j) => n + Object.keys(j).length, 0));
assert.ok(polyvalents > 10_000);
const liens = [...Object.values(PHOTOS_FFR_PAR_ID), ...Object.values(PHOTOS_FFR_SUPPLEMENTAIRES).flatMap(Object.values)];
assert.equal(new Set(liens).size, 1466);
for (let i = 0; i < liens.length; i += 12) await Promise.all(liens.slice(i, i + 12).map(async url => {
  const fichier = path.join('public', decodeURIComponent(url));
  assert.ok(fs.existsSync(fichier), `Portrait absent : ${url}`);
  const meta = await sharp(fichier).metadata();
  assert.equal(meta.format, 'webp');
  assert.ok(meta.width! <= 512 && meta.height! <= 640);
}));

// Deux homonymes licenciés ne partagent jamais le portrait de l'autre club.
const groupes = new Map<string, { club: string; photo?: string }[]>();
for (const c of Object.values(CLUBS_AMATEURS).flat()) for (const j of joueursFfrDuClub(c.nom)) {
  const cle = normaliserNomFfr(j.nom);
  const groupe = groupes.get(cle) ?? []; groupe.push({ club: c.nom, photo: j.photo }); groupes.set(cle, groupe);
}
let homonymes = 0;
for (const [nom, groupe] of groupes) if (groupe.length > 1 && groupe.some(j => j.photo)) {
  assert.equal(photoJoueurFfr(nom), undefined, `Portrait global ambigu : ${nom}`);
  for (const j of groupe) if (groupe.filter(g => g.club === j.club).length === 1) assert.equal(photoJoueurFfr(nom, j.club), j.photo);
  homonymes++;
}
assert.ok(homonymes > 0);

const catalogue = catalogueBaseCarriere();
for (const nom of Object.keys(Object.values(PHOTOS_FFR_SUPPLEMENTAIRES)[0])) {
  assert.ok(catalogue.some(j => normaliserNomFfr(j.nom) === nom && j.photo), `Portrait supplémentaire absent du catalogue : ${nom}`);
}
const pierre = catalogue.find(j => normaliserNomFfr(j.nom) === 'pierre guyenon')!;
assert.equal(pierre.poste, 'pilier_droit');
assert.ok(pierre.postesSecondaires?.includes('pilier_gauche'));
assert.ok(pierre.photo?.startsWith('/photos/'));
assert.equal(coequipierDepuisCarte(carteDepuisSource(pierre, 'test', 'club', 1)).photo, pierre.photo);
const dotation = dotationBronzeCarriere('test', 'club', 'postes-ffr');
const parId = new Map(catalogue.map(c => [c.sourceId, c]));
assert.equal(dotation.length, 30);
for (const carte of dotation) assert.equal(carte.poste, parId.get(carte.sourceId)!.poste, 'La dotation a changé le vrai poste');

// Une ancienne carte reçoit les corrections du catalogue, en gardant son histoire.
const maintenant = Date.parse('2026-09-07T10:00:00Z');
const etat = creerCarriere({ id: 'test-ffr', nom: 'Test FFR', code: 'DR-FFR', compteId: 'compte', pseudo: 'Test', clubNom: 'Test Rugby', rythme: 1, maxClubs: 4 }, maintenant, 'ffr');
const carte = carteDepuisSource(pierre, etat.id, etat.clubs[0].id, 1);
Object.assign(carte, { poste: 'ailier_droit', famille: 'ailier', photo: undefined, note: 64, potentiel: 77, fatigue: 31, matchs: 19, essais: 4, favori: true, blesseJusqua: '2027-01-01T00:00:00.000Z' });
etat.cartes.push(carte);
const avant = structuredClone(etat);
const actualise = avancerCarriere(etat, maintenant, 'ffr');
const nouvelle = actualise.cartes.find(c => c.id === carte.id)!;
assert.equal(nouvelle.poste, pierre.poste);
assert.equal(nouvelle.photo, pierre.photo);
assert.deepEqual(nouvelle.postesSecondaires, pierre.postesSecondaires);
assert.equal(nouvelle.note, pierre.note);
assert.equal(nouvelle.potentiel, pierre.potentiel);
for (const champ of ['id', 'sourceId', 'proprietaire', 'age', 'fatigue', 'matchs', 'essais', 'favori', 'blesseJusqua', 'clubs'] as const) assert.deepEqual(nouvelle[champ], carte[champ], champ);
assert.deepEqual(etat, avant, 'La lecture a muté la sauvegarde d’origine');
console.log(`OK FFR enrichi : ${postes} postes, ${polyvalents} profils polyvalents, ${portraits} portraits dans les effectifs, ${ajouts} joueurs supplémentaires, 1466 images valides, ${homonymes} groupes d’homonymes protégés. Cartes existantes et dotations vérifiées.`);
