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
// ⚠️⚠️ CE SCRIPT DOIT PASSER **APRÈS** `copierLogos.cjs`, TOUJOURS. C'est la
// cause d'une régression retrouvée en jeu : les écussons de sélections étaient
// redevenus de minuscules vignettes (France 210 octets, Angleterre 291, Japon
// 383 — au lieu de 4 à 12 Ko). `logos_equipes/nations_championship/` contient
// `france.png` et `angleterre.png` : `copierLogos.cjs`, qui balaie tout le pack
// de façon récursive, réécrit donc par-dessus les bons fichiers. Le désordre ne
// se voit nulle part au build — seulement à l'écran, sur des vignettes de 40 px
// que l'œil accepte trop facilement.
//
// L'ordre correct, dans cet ordre :
//   node scripts/copierLogos.cjs             # le pack complet des clubs
//   node scripts/copierLogosSelections.cjs   # PUIS les vrais écussons nationaux
//
// `npx vite-node scripts/verifU20.ts` le contrôle : il refuse tout écusson de
// sélection sous 2 Ko.
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
