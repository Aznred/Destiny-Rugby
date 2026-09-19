import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const dossierProjet = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceMensurations = path.resolve(dossierProjet, '..', 'allrugby_joueurs_complets.json');
const sourcePhotos = path.join(dossierProjet, 'src', 'data', 'photosJoueurs.ts');
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

function styleCheveux(couverture, graine) {
  if (couverture < 0.025) return 'bald';
  if (couverture < 0.11) return 'buzz';
  return ['short', 'fade', 'curly', 'afro', 'messy'][graine % 5];
}

async function palettePhoto(fichier, graine) {
  try {
    const { data, info } = await sharp(fichier)
      .rotate().resize(30, 40, { fit: 'cover', position: 'attention' })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const peaux = [];
    const cheveux = [];
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
          if (lumiere < 92 && Math.max(r, g, b) - Math.min(r, g, b) < 68) cheveux.push([r, g, b]);
        }
      }
    }
    const moyenne = (pixels, defaut) => pixels.length
      ? pixels.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map(v => v / pixels.length)
      : defaut;
    const peau = moyenne(peaux, [174, 119, 82]);
    const cheveu = moyenne(cheveux, peau.map(v => v * .27));
    return {
      peau: hex(peau[0], peau[1], peau[2]),
      cheveux: hex(cheveu[0], cheveu[1], cheveu[2]),
      coiffure: styleCheveux(cheveux.length / Math.max(1, opaquesHaut), graine),
    };
  } catch {
    return undefined;
  }
}

const hacher = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

async function enLots(elements, taille, travail) {
  const resultats = [];
  for (let i = 0; i < elements.length; i += taille) {
    resultats.push(...await Promise.all(elements.slice(i, i + taille).map(travail)));
  }
  return resultats;
}

const [brutFiches, brutPhotos] = await Promise.all([
  fs.readFile(sourceMensurations, 'utf8'),
  fs.readFile(sourcePhotos, 'utf8'),
]);
const fiches = JSON.parse(brutFiches);
const mensurations = new Map();
for (const fiche of fiches) {
  const nom = nomDepuisFiche(fiche);
  if (!nom) continue;
  const tailleCm = Number(fiche.taille_cm);
  const poidsKg = Number(fiche.poids_kg);
  if (!Number.isFinite(tailleCm) && !Number.isFinite(poidsKg)) continue;
  mensurations.set(normaliser(nom), {
    tailleCm: Number.isFinite(tailleCm) ? borner(Math.round(tailleCm), 155, 215) : undefined,
    poidsKg: Number.isFinite(poidsKg) ? borner(Math.round(poidsKg), 60, 155) : undefined,
  });
}

const photos = [...brutPhotos.matchAll(/^\s*"([^"]+)":\s*"([^"]+)"/gm)]
  .map(([, nom, photo]) => ({ nom, photo }));
const profils = await enLots(photos, 12, async ({ nom, photo }) => {
  const cle = normaliser(nom);
  const palette = await palettePhoto(path.join(dossierPhotos, photo.replace(/^\//, '')), hacher(cle));
  const physique = mensurations.get(cle);
  if (!palette && !physique) return null;
  return [cle, { ...physique, ...palette }];
});

const valides = profils.filter(Boolean).sort((a, b) => a[0].localeCompare(b[0], 'fr'));
const lignes = valides.map(([nom, p]) => `  ${JSON.stringify(nom)}: ${JSON.stringify(p)},`).join('\n');
const contenu = `// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.\n// npm run data:apparences-match · mensurations AllRugby + pixels des portraits locaux.\n\nexport type CoiffureMatch = 'bald' | 'buzz' | 'short' | 'fade' | 'curly' | 'afro' | 'messy';\nexport interface ApparenceJoueurGeneree { tailleCm?: number; poidsKg?: number; peau?: string; cheveux?: string; coiffure?: CoiffureMatch }\n\nexport const APPARENCES_JOUEURS_MATCH: Record<string, ApparenceJoueurGeneree> = {\n${lignes}\n};\n`;
await fs.writeFile(sortie, contenu, 'utf8');
console.log(`${valides.length} apparences de match générées dans ${path.relative(dossierProjet, sortie)}.`);
