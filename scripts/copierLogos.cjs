// Copie les logos fournis (sources/logos/clubs/<compétition>/<club>.png) vers
// public/logos/<slug>.png, à plat et dédoublonnés : un même club apparaît dans
// plusieurs compétitions (Bath en Premiership + Champions Cup…) mais le fichier
// est toujours identique. Les accents sont retirés du nom de fichier pour ne
// pas dépendre de l'encodage des URL.
// Relancer avec : node scripts/copierLogos.cjs
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const SRC = path.join(RACINE, 'sources', 'logos', 'clubs');
const DEST = path.join(RACINE, 'public', 'logos');

function slug(nomFichier) {
  return nomFichier
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_');
}

fs.mkdirSync(DEST, { recursive: true });

const vus = new Map(); // slug -> chemin source (pour détecter les collisions)
let copies = 0;

// Les logos amateurs sont rangés sur deux niveaux
// (logos_amateurs/logos_federales/Federale_1/…) : on parcourt en profondeur.
function parcourir(chemin) {
  for (const entree of fs.readdirSync(chemin, { withFileTypes: true })) {
    const complet = path.join(chemin, entree.name);
    if (entree.isDirectory()) { parcourir(complet); continue; }
    // Quelques écussons ne sont fournis qu'en SVG (RC Orléans).
    if (!/\.(png|svg)$/i.test(entree.name)) continue;
    const s = slug(entree.name);
    if (vus.has(s)) {
      // Même nom de fichier = même club : on vérifie que c'est bien la même image.
      const a = fs.readFileSync(vus.get(s));
      const b = fs.readFileSync(complet);
      if (!a.equals(b)) console.warn(`⚠ collision de nom : ${s} (${vus.get(s)} ≠ ${complet})`);
      continue;
    }
    vus.set(s, complet);
    fs.copyFileSync(complet, path.join(DEST, s));
    copies += 1;
  }
}
parcourir(SRC);

console.log(`${copies} logos copiés vers public/logos/`);
