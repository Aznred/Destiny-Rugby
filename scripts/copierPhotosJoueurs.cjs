// INDEX DES PHOTOS DE JOUEURS RÉELS (Top 14 & Pro D2)
//
// `public/photos/` est désormais la source canonique. L'ancien dossier
// `photos_joueurs/` contenait les 1 574 mêmes fichiers, octet pour octet, avec
// seulement un suffixe de championnat dans leur nom : il a donc été supprimé.
//
// Ce script régénère `src/data/photosJoueurs.ts` depuis les noms normalisés déjà
// utilisés par les fichiers publics.
//
// Relancer : node scripts/copierPhotosJoueurs.cjs

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'public', 'photos');
const SORTIE = path.join(__dirname, '..', 'src', 'data', 'photosJoueurs.ts');

if (!fs.existsSync(SOURCE)) {
  console.error(`✗ Dossier introuvable : ${SOURCE}`);
  process.exit(1);
}

const fichiers = fs.readdirSync(SOURCE).filter((f) => /\.(webp|jpg|jpeg|png)$/i.test(f));
const table = new Map();
for (const fichier of fichiers) {
  const ext = path.extname(fichier).toLowerCase();
  const slug = path.basename(fichier, ext).toLowerCase();
  const cle = slug.replace(/_+/g, ' ').trim();
  if (!cle) continue;
  table.set(cle, `/photos/${fichier}`);
}

const lignes = [...table.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([cle, chemin]) => `  ${JSON.stringify(cle)}: ${JSON.stringify(chemin)},`);

fs.writeFileSync(SORTIE, `// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.\n`
  + `// Source canonique : public/photos/ · Généré par scripts/copierPhotosJoueurs.cjs\n`
  + `//\n`
  + `// Photos de profil des joueurs réels du Top 14 et de la Pro D2, utilisées comme\n`
  + `// avatars sur L'Ovale. La clé est le nom normalisé : accents retirés, tirets et\n`
  + `// apostrophes remplacés par des espaces, minuscules.\n\n`
  + `export const PHOTO_JOUEUR: Record<string, string> = {\n`
  + `${lignes.join('\n')}\n};\n\n`
  + `export const NB_PHOTOS = ${table.size};\n`, 'utf8');

console.log(`✓ ${table.size} joueurs référencés depuis public/photos/`);
console.log(`✓ ${SORTIE}`);
