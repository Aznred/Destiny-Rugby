import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PHOTOS_DETOUREES_PAR_CLUB, PHOTOS_DETOUREES_PAR_ID, JOUEURS_DETOURES_SUPPLEMENTAIRES } from '../src/data/photosDetourees';
import { photoReelle } from '../src/lib/avatars';
import { joueursFfrDuClub, normaliserNomFfr } from '../src/lib/joueursFfr';
import { catalogueBaseCarriere, carteDepuisSource, coequipierDepuisCarte } from '../src/lib/ligue/catalogueCarriere';
import { creerCarriere, avancerCarriere } from '../src/lib/ligue/carriere';

const urls = new Set(Object.values(PHOTOS_DETOUREES_PAR_CLUB).flatMap(Object.values));
const source = '../photos-detourees';
const fichiers = fs.readdirSync(source, { withFileTypes: true }).filter(d => d.isDirectory()).flatMap(d => fs.readdirSync(path.join(source, d.name)).filter(f => /\.(png|jpe?g|webp)$/i.test(f)));
assert.equal(urls.size, fichiers.length, 'Chaque portrait livré doit être intégré');
assert.equal(Object.keys(PHOTOS_DETOUREES_PAR_CLUB).length, 23);
for (const url of urls) {
  const meta = await sharp(path.join('public', decodeURIComponent(url))).metadata();
  assert.equal(meta.format, 'webp');
  assert.ok(meta.hasAlpha, `Transparence perdue : ${url}`);
  assert.ok(meta.width! <= 512 && meta.height! <= 640);
}
for (const [club, photos] of Object.entries(PHOTOS_DETOUREES_PAR_CLUB)) {
  for (const [nom, url] of Object.entries(photos)) assert.equal(photoReelle(nom, club), url);
  for (const j of joueursFfrDuClub(club)) {
    const nouvelle = photos[normaliserNomFfr(j.nom)] ?? (j.ffrId ? PHOTOS_DETOUREES_PAR_ID[j.ffrId] : undefined);
    if (nouvelle) assert.equal(j.photo, nouvelle);
  }
}
const catalogue = catalogueBaseCarriere();
for (const profils of Object.values(JOUEURS_DETOURES_SUPPLEMENTAIRES)) for (const j of Object.values(profils)) {
  assert.ok(catalogue.some(c => normaliserNomFfr(c.nom) === normaliserNomFfr(j.nom) && c.photo), `${j.nom} absent des cartes`);
  assert.ok(!/ligne|ouvreur|talonneur/i.test(j.nom), `Poste conservé dans le nom : ${j.nom}`);
}
const maintenant = Date.parse('2026-10-02T10:00:00Z');
const etat = creerCarriere({ id: 'portraits', nom: 'Portraits', code: 'DR-PHOTO', compteId: 'test', pseudo: 'Test', clubNom: 'Test Rugby', rythme: 1, maxClubs: 4 }, maintenant, 'portraits');
const selection = ['ffr', 'professionnel'].map(origine => catalogue.find(c => c.origine === origine && c.photo?.startsWith('/photos/detourees/'))!);
for (const source of selection) {
  assert.ok(source);
  const carte = carteDepuisSource(source, etat.id, etat.clubs[0].id, 1);
  assert.equal(coequipierDepuisCarte(carte).photo, source.photo);
  carte.photo = '/ancienne-photo.png'; carte.matchs = 12; carte.essais = 3;
  etat.cartes.push(carte);
}
const actualise = avancerCarriere(etat, maintenant, 'portraits');
for (const source of selection) {
  const carte = actualise.cartes.find(c => c.sourceId === source.sourceId)!;
  assert.equal(carte.photo, source.photo); assert.equal(carte.matchs, 12); assert.equal(carte.essais, 3);
  assert.equal(etat.cartes.find(c => c.id === carte.id)!.photo, '/ancienne-photo.png');
}
console.log(`OK : ${urls.size} portraits détourés, 23 clubs, transparence, cartes et anciennes sauvegardes vérifiées.`);
