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
const crypto = require('crypto');

const SOURCE = path.join(__dirname, '..', 'public', 'photos');
const SORTIE = path.join(__dirname, '..', 'src', 'data', 'photosJoueurs.ts');

// ⚠️ LE SITE SOURCE SERT UNE SILHOUETTE GRISE QUAND IL N'A PAS LA PHOTO, et
// l'aspirateur l'a enregistrée 181 fois sous 181 noms de joueurs. Indexée comme
// un vrai portrait, elle gagnait contre les autres jeux d'images : la carte
// affichait un fantôme gris alors que le joueur avait bien un visage dans
// `photos/maj/`. On la reconnaît à l'octet près — jamais à son nom, puisqu'elle
// porte celui de vrais joueurs. `scripts/nettoyerPhotos.cjs` fait le ménage sur
// le disque ; ce garde-fou empêche seulement de la réindexer.
const SILHOUETTE = '5bb34e3ef5ec20cd45a57ae140406cf0';

if (!fs.existsSync(SOURCE)) {
  console.error(`✗ Dossier introuvable : ${SOURCE}`);
  process.exit(1);
}

const fichiers = fs.readdirSync(SOURCE).filter((f) => /\.(webp|jpg|jpeg|png)$/i.test(f));
const table = new Map();
let ignorees = 0;
for (const fichier of fichiers) {
  const ext = path.extname(fichier).toLowerCase();
  const slug = path.basename(fichier, ext).toLowerCase();
  const cle = slug.replace(/_+/g, ' ').trim();
  if (!cle) continue;
  // `silhouette.webp` EST la silhouette, et c'est voulu : elle sert de repli
  // aux cartes sans portrait. Elle n'entre simplement pas dans l'index.
  if (crypto.createHash('md5').update(fs.readFileSync(path.join(SOURCE, fichier))).digest('hex') === SILHOUETTE) { if (cle !== 'silhouette') ignorees++; continue; }
  table.set(cle, `/photos/${fichier}`);
}
if (ignorees) console.log(`⚠ ${ignorees} silhouette(s) grise(s) ignorée(s) — lancer scripts/nettoyerPhotos.cjs.`);

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
