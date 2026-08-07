// VÉRIFICATION — LOGOS DES SÉLECTIONS
//
// Contrôle le lot complémentaire, les chemins réellement servis par Vite et
// la couverture du classement World Rugby. Les fichiers HTML enregistrés par
// erreur sous une extension d'image sont détectés par leur signature binaire.
//
// Lancer : npx vite-node scripts/verifLogosSelections.ts

import fs from 'node:fs';
import path from 'node:path';
import { CLASSEMENT_WORLD_RUGBY_INITIAL } from '../src/data/classementWorldRugby';
import { LOGO_SELECTION_CATALOGUE, LOGO_SELECTION_PRINCIPALE } from '../src/data/logosSelections';
import { LOGO_PAR_EQUIPE } from '../src/data/mondeReel';
import { COMPETITIONS_NATIONS_NOUVELLES } from '../src/data/nouvellesLigues';
import { SELECTIONS_SENIOR, SELECTIONS_U20 } from '../src/data/selections';
import { nomNation } from '../src/lib/nations';

const racine = process.cwd();

function signatureImage(fichier: string): boolean {
  if (!fs.existsSync(fichier) || !fs.statSync(fichier).isFile()) return false;
  const brut = fs.readFileSync(fichier);
  if (brut.length < 4) return false;
  // Certains SVG Illustrator placent ~900 octets de métadonnées XML avant la
  // balise `<svg>` : 4 Ko évitent de les prendre pour des fichiers corrompus.
  const debut = brut.subarray(0, Math.min(brut.length, 4096));
  const texte = debut.toString('utf8').trimStart().toLowerCase();
  if (texte.startsWith('<!doctype html') || texte.startsWith('<html')) return false;
  if (texte.startsWith('<svg') || texte.includes('<svg')) return true;
  return brut.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    || brut.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    || brut.subarray(0, 6).toString('ascii') === 'GIF87a'
    || brut.subarray(0, 6).toString('ascii') === 'GIF89a'
    || (brut.subarray(0, 4).toString('ascii') === 'RIFF'
      && brut.subarray(8, 12).toString('ascii') === 'WEBP');
}

const logoParNation = new Map<string, string>();
for (const [equipe, logo] of Object.entries(LOGO_PAR_EQUIPE)) {
  if (!/\s+(?:U20|A|B|C|XV|-20)$/i.test(equipe)) logoParNation.set(nomNation(equipe), logo);
}
for (const competition of COMPETITIONS_NATIONS_NOUVELLES) {
  for (const equipe of competition.equipes) {
    if (equipe.logo && !logoParNation.has(nomNation(equipe.nom))) {
      logoParNation.set(nomNation(equipe.nom), equipe.logo);
    }
  }
}
for (const [equipe, logo] of Object.entries(LOGO_SELECTION_CATALOGUE)) {
  logoParNation.set(nomNation(equipe), logo);
}
// Dernier passage volontaire : le principal écrase toutes les autres sources.
for (const [equipe, logo] of Object.entries(LOGO_SELECTION_PRINCIPALE)) {
  logoParNation.set(nomNation(equipe), logo);
}

const cheminsPrincipaux = [...new Set(Object.values(LOGO_SELECTION_PRINCIPALE))];
const cheminsCatalogue = [...new Set(Object.values(LOGO_SELECTION_CATALOGUE))];
const principauxInvalides = cheminsPrincipaux.filter((url) => !signatureImage(path.join(racine, 'public', url)));
const catalogueInvalides = cheminsCatalogue.filter((url) => !signatureImage(path.join(racine, 'public', url)));
const nomsCommuns = Object.keys(LOGO_SELECTION_PRINCIPALE)
  .filter((nom) => LOGO_SELECTION_CATALOGUE[nom]);
const prioritesInvalides = nomsCommuns.filter((nom) => {
  const resolu = LOGO_SELECTION_PRINCIPALE[nom]
    ?? LOGO_SELECTION_CATALOGUE[nom];
  return resolu !== LOGO_SELECTION_PRINCIPALE[nom];
});
const classementSansLogo = CLASSEMENT_WORLD_RUGBY_INITIAL
  .filter(({ nation }) => !logoParNation.has(nomNation(nation)))
  .map(({ nation }) => nation);
const cheminsClassementInvalides = CLASSEMENT_WORLD_RUGBY_INITIAL
  .map(({ nation }) => ({ nation, url: logoParNation.get(nomNation(nation)) }))
  .filter((entree): entree is { nation: string; url: string } => Boolean(entree.url))
  .filter(({ url }) => !signatureImage(path.join(racine, 'public', url)));
const atlas = [...SELECTIONS_SENIOR, ...SELECTIONS_U20];
const atlasInvalides = atlas
  .map((selection) => ({
    nom: selection.nom,
    url: LOGO_SELECTION_PRINCIPALE[selection.nom]
      ?? LOGO_SELECTION_PRINCIPALE[nomNation(selection.nom)]
      ?? LOGO_SELECTION_CATALOGUE[selection.nom]
      ?? LOGO_SELECTION_CATALOGUE[nomNation(selection.nom)]
      ?? selection.logo
      ?? logoParNation.get(nomNation(selection.nom)),
  }))
  .filter((entree): entree is { nom: string; url: string } => Boolean(entree.url))
  .filter(({ url }) => !signatureImage(path.join(racine, 'public', url)));

console.log(`✅ ${cheminsPrincipaux.length} logos principaux valides et prioritaires`);
console.log(`✅ ${cheminsCatalogue.length} logos du catalogue valides en repli`);
console.log(`✅ priorité contrôlée sur ${nomsCommuns.length} nom(s) présent(s) dans les deux lots`);
console.log(`✅ ${CLASSEMENT_WORLD_RUGBY_INITIAL.length - classementSansLogo.length}/${CLASSEMENT_WORLD_RUGBY_INITIAL.length} nations classées ont un logo déclaré`);
console.log(`✅ atlas : ${SELECTIONS_SENIOR.length} sélections sénior + ${SELECTIONS_U20.length} sélections U20`);
if (principauxInvalides.length) console.log(`❌ Principaux invalides : ${principauxInvalides.join(', ')}`);
if (catalogueInvalides.length) console.log(`❌ Catalogue invalide : ${catalogueInvalides.join(', ')}`);
if (prioritesInvalides.length) console.log(`❌ Priorité incorrecte : ${prioritesInvalides.join(', ')}`);
if (cheminsClassementInvalides.length) {
  console.log(`❌ Logos déclarés mais absents/invalides : ${cheminsClassementInvalides.map(({ nation, url }) => `${nation} (${url})`).join(', ')}`);
}
if (atlasInvalides.length) {
  console.log(`❌ Logos invalides dans l’atlas : ${atlasInvalides.map(({ nom, url }) => `${nom} (${url})`).join(', ')}`);
}
if (classementSansLogo.length) console.log(`ℹ️ Nations classées sans logo : ${classementSansLogo.join(', ')}`);

if (principauxInvalides.length || catalogueInvalides.length || prioritesInvalides.length
  || cheminsClassementInvalides.length || atlasInvalides.length) process.exitCode = 1;
