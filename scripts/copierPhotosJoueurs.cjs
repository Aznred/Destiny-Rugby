// PHOTOS DE PROFIL DES JOUEURS RÉELS (Top 14 & Pro D2)
//
// Source : `photos_joueurs/` à la racine, 1 574 fichiers nommés
// `prenom_nom_top_14.webp` / `prenom_nom_pro_d2.webp`.
//
// Ce script :
//   1. copie les images vers `public/photos/<slug>.webp` ;
//   2. génère `src/data/photosJoueurs.ts`, la table `nom normalisé → chemin`.
//
// ⚠️ La clé de recherche est le nom NORMALISÉ (sans accent, sans tiret, en
// minuscules, espaces compressés) : la base de joueurs écrit « Louis
// BIELLE-BIARREY » là où le fichier s'appelle `louis_bielle_biarrey_top_14`.
// Sans cette normalisation, un tiers des photos ne se rattachaient à personne.
//
// Relancer : node scripts/copierPhotosJoueurs.cjs

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'photos_joueurs');
const DEST = path.join(__dirname, '..', 'public', 'photos');
const SORTIE = path.join(__dirname, '..', 'src', 'data', 'photosJoueurs.ts');

// Suffixes de championnat à retirer du nom de fichier.
const LIGUES = ['_top_14', '_pro_d2', '_nationale', '_top14', '_prod2'];

function normaliser(nom) {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

if (!fs.existsSync(SOURCE)) {
  console.error(`✗ Dossier introuvable : ${SOURCE}`);
  process.exit(1);
}
fs.mkdirSync(DEST, { recursive: true });

const fichiers = fs.readdirSync(SOURCE).filter((f) => /\.(webp|jpg|jpeg|png)$/i.test(f));
const table = new Map();
let copies = 0;
let doublons = 0;

for (const f of fichiers) {
  const ext = path.extname(f).toLowerCase();
  let base = path.basename(f, ext);
  for (const l of LIGUES) {
    if (base.endsWith(l)) { base = base.slice(0, -l.length); break; }
  }
  const cle = normaliser(base);
  if (!cle) continue;
  const slug = cle.replace(/ /g, '_');
  const cible = path.join(DEST, slug + ext);
  if (!fs.existsSync(cible)) {
    fs.copyFileSync(path.join(SOURCE, f), cible);
    copies += 1;
  }
  if (table.has(cle)) doublons += 1;
  table.set(cle, `/photos/${slug}${ext}`);
}

const lignes = [...table.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([cle, chemin]) => `  ${JSON.stringify(cle)}: ${JSON.stringify(chemin)},`);

fs.writeFileSync(SORTIE, `// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Source : photos_joueurs/ · Généré par scripts/copierPhotosJoueurs.cjs
//
// Photos de profil des joueurs réels du Top 14 et de la Pro D2, utilisées comme
// avatars sur L'Ovale. La clé est le nom NORMALISÉ (voir \`normaliserNom\` dans
// src/lib/avatars.ts) : accents retirés, tirets et apostrophes remplacés par des
// espaces, minuscules.

export const PHOTO_JOUEUR: Record<string, string> = {
${lignes.join('\n')}
};

export const NB_PHOTOS = ${table.size};
`, 'utf8');

console.log(`✓ ${copies} images copiées vers public/photos/`);
console.log(`✓ ${table.size} joueurs référencés (${doublons} doublon(s) écrasé(s))`);
console.log(`✓ ${SORTIE}`);
