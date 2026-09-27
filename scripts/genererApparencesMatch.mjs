import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const dossierProjet = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceMensurations = path.resolve(dossierProjet, '..', 'allrugby_joueurs_complets.json');
const sourcesPhotos = ['photosMonde.ts', 'photosJoueurs.ts', 'photosMaj.ts', 'photosNewMaj.ts']
  .map(nom => path.join(dossierProjet, 'src', 'data', nom));
const sortie = path.join(dossierProjet, 'src', 'data', 'apparencesMatch.generated.ts');
const dossierPhotos = path.join(dossierProjet, 'public');

const normaliser = (texte) => texte
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, ' ').trim().toLowerCase();

const borner = (n, min, max) => Math.max(min, Math.min(max, n));
const hex = (r, g, b) => `#${[r, g, b].map(v => Math.round(borner(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`;

function nomDepuisFiche(fiche) {
  const entete = String(fiche.header ?? '').match(/^(.+?)\s+\d+\s+ans\b/i)?.[1];
  if (entete) return entete.replace(/\s+/g, ' ').trim();
  const slug = String(fiche.url ?? '').match(/\/joueurs\/([^/]+?)(?:-\d+)?\.html/i)?.[1];
  return slug ? slug.replace(/-/g, ' ') : '';
}

function mediane(pixels, defaut) {
  return pixels.length
    ? [0, 1, 2].map(c => pixels.map(p => p[c]).sort((a, b) => a - b)[Math.floor(pixels.length / 2)])
    : defaut;
}

async function palettePhoto(fichier) {
  try {
    const { data, info } = await sharp(fichier)
      .rotate().resize(96, 128, { fit: 'contain', background: '#00000000' })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const pixel = (x, y) => {
      const i = (Math.round(y) * info.width + Math.round(x)) * 4;
      return [data[i], data[i + 1], data[i + 2], data[i + 3]];
    };
    const premierePeau = [];
    for (let y = 8; y < 54; y++) for (let x = 32; x < 64; x++) {
      const p = pixel(x, y), [r, g, b, a] = p;
      if (a >= 170 && r > g + 5 && g >= b - 5 && r - g < 105 && g - b < 75 && r > 45 && r < 240) premierePeau.push(p);
    }
    const teintInitial = mediane(premierePeau, [174, 119, 82]);
    const seuilVisage = teintInitial.reduce((s, v) => s + v, 0) / 3 * .76;
    const peauPossible = ([r, g, b, a]) => a >= 170 && r > g + 5 && g >= b - 5 && r - g < 105 && g - b < 75 && r > 45 && r < 240 && (r + g + b) / 3 >= seuilVisage;
    const lignes = [];
    for (let y = 5; y < 56; y++) {
      let compte = 0;
      for (let x = 29; x < 67; x++) if (peauPossible(pixel(x, y))) compte++;
      lignes.push(compte);
    }
    let haut = lignes.findIndex((n, i) => n >= 7 && lignes.slice(i, i + 6).filter(v => v >= 7).length >= 4) + 5;
    if (haut < 5) haut = 18;
    const bas = Math.min(haut + 31, 53);
    const visage = [];
    for (let y = haut + 5; y < Math.min(bas - 6, haut + 22); y++)
      for (let x = 34; x < 62; x++) { const p = pixel(x, y); if (peauPossible(p)) visage.push(p); }
    const peau = mediane(visage, [174, 119, 82]);
    const lumierePeau = peau.reduce((s, v) => s + v, 0) / 3;
    const sombre = p => p[3] >= 170 && (p[0] + p[1] + p[2]) / 3 < lumierePeau * .76;
    const cheveux = [], sommet = [], cotes = [], menton = [], moustache = [], iris = [];
    for (let y = Math.max(0, haut - 17); y < haut + 3; y++) for (let x = 27; x < 69; x++) {
      const p = pixel(x, y); if (p[3] < 170) continue;
      if (sombre(p)) { sommet.push(p); cheveux.push(p); }
    }
    for (let y = haut + 8; y < Math.min(bas, haut + 29); y++) for (let x = 26; x < 70; x++) {
      const p = pixel(x, y); if (p[3] < 170) continue;
      const bord = x < 35 || x > 61;
      if (bord && sombre(p)) { cotes.push(p); cheveux.push(p); }
      if (x >= 39 && x <= 57 && y >= haut + 20 && y <= haut + 29) menton.push(p);
      if (x >= 42 && x <= 54 && y >= haut + 14 && y <= haut + 21) moustache.push(p);
      if ((x >= 37 && x <= 44 || x >= 52 && x <= 59) && y >= haut + 9 && y <= haut + 15) iris.push(p);
    }
    const cheveu = mediane(cheveux, peau.map(v => v * .27));
    const couverture = sommet.length / (20 * 42);
    const couvertureCotes = cotes.length / (21 * 18);
    const coiffure = couverture < .035 ? 'bald' : couverture < .085 ? 'buzz'
      : couvertureCotes > .55 && couverture > .12 ? 'long' : couverture > .65 ? 'afro'
        : couverture > .38 ? 'curly' : couverture > .23 ? 'messy' : 'short';
    const ratioSombre = zone => zone.filter(sombre).length / Math.max(1, zone.filter(p => p[3] >= 170).length);
    const barbe = ratioSombre(menton) > .65 ? 'full_beard'
      : ratioSombre(menton) > .38 ? 'short_beard'
        : ratioSombre(moustache) > .46 ? 'moustache' : 'none';
    const irisColorees = iris.filter(p => p[3] >= 170 && p[2] > p[0] * 1.12 && p[2] > p[1] * .95);
    const irisVertes = iris.filter(p => p[3] >= 170 && p[1] > p[0] * .91 && p[1] > p[2] * 1.08);
    const yeux = irisColorees.length >= 3 ? '#587383' : irisVertes.length >= 3 ? '#657452' : '#624633';
    return {
      peau: hex(peau[0], peau[1], peau[2]),
      cheveux: hex(cheveu[0], cheveu[1], cheveu[2]),
      yeux,
      coiffure,
      barbe,
    };
  } catch {
    return undefined;
  }
}

async function enLots(elements, taille, travail) {
  const resultats = [];
  for (let i = 0; i < elements.length; i += taille) {
    resultats.push(...await Promise.all(elements.slice(i, i + taille).map(travail)));
  }
  return resultats;
}

const [brutFiches, brutPhotos] = await Promise.all([
  fs.readFile(sourceMensurations, 'utf8'),
  Promise.all(sourcesPhotos.map(f => fs.readFile(f, 'utf8'))),
]);
const fiches = JSON.parse(brutFiches);
const mensurations = new Map();
for (const fiche of fiches) {
  const nom = nomDepuisFiche(fiche);
  if (!nom) continue;
  const tailleCm = fiche.taille_cm == null ? NaN : Number(fiche.taille_cm);
  const poidsKg = fiche.poids_kg == null ? NaN : Number(fiche.poids_kg);
  if (!Number.isFinite(tailleCm) && !Number.isFinite(poidsKg)) continue;
  mensurations.set(normaliser(nom), {
    tailleCm: tailleCm >= 155 && tailleCm <= 215 ? Math.round(tailleCm) : undefined,
    poidsKg: poidsKg >= 60 && poidsKg <= 155 ? Math.round(poidsKg) : undefined,
  });
}

const indexPhotos = new Map();
for (const source of brutPhotos) for (const [, nom, photo] of source.matchAll(/^\s*"([^"]+)":\s*"(\/photos\/[^\"]+)"/gm)) {
  indexPhotos.set(normaliser(nom), photo);
}
const photos = [...indexPhotos].map(([nom, photo]) => ({ nom, photo }));
const corrections = JSON.parse(await fs.readFile(path.join(dossierProjet, 'src/data/apparencesMatch.corrections.json'), 'utf8'));
const palettes = new Map();
const profils = await enLots(photos, 12, async ({ nom, photo }) => {
  const cle = normaliser(nom);
  if (!palettes.has(photo)) palettes.set(photo, palettePhoto(path.join(dossierPhotos, decodeURIComponent(photo.replace(/^\//, '')))));
  const palette = await palettes.get(photo);
  const physique = mensurations.get(cle);
  if (!palette && !physique) return null;
  return [cle, { ...physique, ...palette, ...corrections[cle] }];
});

const valides = profils.filter(Boolean).sort((a, b) => a[0].localeCompare(b[0], 'fr'));
const lignes = valides.map(([nom, p]) => `  ${JSON.stringify(nom)}: ${JSON.stringify(p)},`).join('\n');
const contenu = `// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.\n// npm run data:apparences-match · mensurations AllRugby + pixels des portraits locaux.\n\nexport type CoiffureMatch = 'bald' | 'buzz' | 'short' | 'fade' | 'curly' | 'afro' | 'mullet' | 'mohawk' | 'messy' | 'long' | 'dreadlocks';\nexport interface ApparenceJoueurGeneree { tailleCm?: number; poidsKg?: number; peau?: string; yeux?: string; cheveux?: string; coiffure?: CoiffureMatch; barbe?: 'none' | 'moustache' | 'goatee' | 'short_beard' | 'full_beard' }\n\nexport const APPARENCES_JOUEURS_MATCH: Record<string, ApparenceJoueurGeneree> = {\n${lignes}\n};\n`;
await fs.writeFile(sortie, contenu, 'utf8');
console.log(`${valides.length} apparences de match générées dans ${path.relative(dossierProjet, sortie)}.`);
