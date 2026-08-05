// LES ÉCUSSONS DES SÉLECTIONS NATIONALES
//
// ⚠️ Les logos de sélections livrés avec le pack `logos_equipes/` n'étaient pas
// les bons (retour de jeu : « dans "bonne selection" tu as les bons logos des
// sélections, là c'est pas bon, change-les »). Le dossier `bonne selection/` à
// la racine contient les écussons corrects, un par équipe.
//
// Le nom de fichier EST la clé : `LOGO_PAR_EQUIPE` (src/data/mondeReel.ts)
// pointe déjà sur `/logos/<nom sans accent>.png` — « Écosse » → `ecosse.png`,
// « Nouvelle-Zélande » → `nouvelle-zelande.png`, « Māori All Blacks » →
// `maori_all_blacks.png`. On applique donc exactement la même normalisation que
// `copierLogos.cjs` : minuscules, accents retirés, espaces en `_`, tirets
// conservés. Aucun code à modifier, seulement des fichiers à écraser.
//
// Relancer : node scripts/copierLogosSelections.cjs

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'bonne selection');
const CIBLE = path.join(__dirname, '..', 'public', 'logos');

function slug(nom) {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_');
}

if (!fs.existsSync(SOURCE)) {
  console.error(`❌ Dossier introuvable : ${SOURCE}`);
  process.exit(1);
}
fs.mkdirSync(CIBLE, { recursive: true });

let remplaces = 0;
let ajoutes = 0;
const details = [];

for (const fichier of fs.readdirSync(SOURCE)) {
  if (!/\.(png|jpg|jpeg|webp|svg)$/i.test(fichier)) continue;
  const ext = path.extname(fichier);
  const cible = path.join(CIBLE, slug(path.basename(fichier, ext)) + ext.toLowerCase());
  const existait = fs.existsSync(cible);
  const avant = existait ? fs.statSync(cible).size : 0;
  fs.copyFileSync(path.join(SOURCE, fichier), cible);
  const apres = fs.statSync(cible).size;
  if (existait) {
    remplaces++;
    if (avant !== apres) details.push(`  ↻ ${path.basename(cible)} : ${avant} → ${apres} octets`);
  } else {
    ajoutes++;
    details.push(`  + ${path.basename(cible)} (nouveau)`);
  }
}

console.log(`✅ ${remplaces} écusson(s) remplacé(s), ${ajoutes} ajouté(s) dans public/logos/`);
for (const d of details) console.log(d);
