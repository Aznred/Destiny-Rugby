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

function styleCheveux(couverture) {
  if (couverture < 0.025) return 'bald';
  if (couverture < 0.11) return 'buzz';
  // Une palette ne permet pas de distinguer sûrement une coupe frisée d'un
  // dégradé. Ne plus choisir une coupe au hasard à partir du nom du joueur.
  return 'short';
}

async function palettePhoto(fichier) {
  try {
    const { data, info } = await sharp(fichier)
      .rotate().resize(96, 128, { fit: 'contain', background: '#00000000' })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const peaux = [];
    const cheveux = [];
    const menton = [], moustache = [];
    let opaquesHaut = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 4;
        const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
        if (a < 170) continue;
        const lumiere = (r + g + b) / 3;
        if (y < info.height * .48 && x > info.width * .18 && x < info.width * .82) {
          opaquesHaut++;
          if (r > g * .92 && g > b * .72 && r > b * 1.08 && lumiere > 48 && lumiere < 238) peaux.push([r, g, b]);
          if (y < info.height * .22 && lumiere < 115 && Math.max(r, g, b) - Math.min(r, g, b) < 68) cheveux.push([r, g, b]);
          if (x > info.width * .38 && x < info.width * .62) {
            if (y > info.height * .34 && y < info.height * .41) menton.push([r, g, b]);
            if (y > info.height * .29 && y < info.height * .33) moustache.push([r, g, b]);
          }
        }
      }
    }
    const moyenne = (pixels, defaut) => pixels.length
      ? [0, 1, 2].map(c => pixels.map(p => p[c]).sort((a, b) => a - b)[Math.floor(pixels.length / 2)])
      : defaut;
    const peau = moyenne(peaux, [174, 119, 82]);
    const cheveu = moyenne(cheveux, peau.map(v => v * .27));
    const lumierePeau = peau.reduce((s, v) => s + v, 0) / 3;
    const sombre = zone => zone.filter(p => p.reduce((s, v) => s + v, 0) / 3 < lumierePeau * .55).length / Math.max(1, zone.length);
    // Estimation prudente ; les corrections explicites priment sur les pixels.
    const barbe = sombre(menton) > .58 ? 'short_beard' : sombre(moustache) > .65 ? 'moustache' : 'none';
    return {
      peau: hex(peau[0], peau[1], peau[2]),
      cheveux: hex(cheveu[0], cheveu[1], cheveu[2]),
      coiffure: styleCheveux(cheveux.length / Math.max(1, opaquesHaut)),
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
const contenu = `// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.\n// npm run data:apparences-match · mensurations AllRugby + pixels des portraits locaux.\n\nexport type CoiffureMatch = 'bald' | 'buzz' | 'short' | 'fade' | 'curly' | 'afro' | 'messy';\nexport interface ApparenceJoueurGeneree { tailleCm?: number; poidsKg?: number; peau?: string; cheveux?: string; coiffure?: CoiffureMatch }\n\nexport const APPARENCES_JOUEURS_MATCH: Record<string, ApparenceJoueurGeneree> = {\n${lignes}\n};\n`;
await fs.writeFile(sortie, contenu.replace('coiffure?: CoiffureMatch }', "coiffure?: CoiffureMatch; barbe?: 'none' | 'moustache' | 'goatee' | 'short_beard' | 'full_beard' }"), 'utf8');
console.log(`${valides.length} apparences de match générées dans ${path.relative(dossierProjet, sortie)}.`);
