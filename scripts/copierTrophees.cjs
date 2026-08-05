// LES TROPHÉES DES NOUVELLES COMPÉTITIONS
//
// Entrée : `nouvellecoupe/` — 20 modèles 3D livrés bruts (sortie Meshy).
// Sortie : `public/m3d/<id>.glb`, au poids des trophées déjà en place.
//
// ⚠️ ON NE COPIE PAS TEL QUEL. Les fichiers fournis pèsent 9 à 49 Mo pièce,
// 391 Mo au total — soit 400 fois le poids d'un trophée existant
// (`brennus.glb` : 843 Ko). Deux gras à retirer, et deux seulement :
//
//   1. **la géométrie**, non compressée : ~4 Mo de sommets en `f32` par modèle,
//      que Draco ramène à ~600 Ko sans rien perdre à l'œil ;
//   2. **les textures**, quatre JPEG en 2048² (5 Mo) alors que le trophée est
//      affiché dans une modale de 400 px : 1024² suffit très largement.
//
// Résultat : ~800 Ko par trophée, exactement l'ordre de grandeur des modèles
// historiques — la cérémonie d'un titre géorgien coûte le même téléchargement
// que celle du Bouclier de Brennus.
//
// ⚠️ POURQUOI FFMPEG ET PAS `gltf-transform optimize`. La commande tout-en-un
// serait plus courte, mais son étage `textureCompress` s'appuie sur sharp, et le
// libvips embarqué échoue ici sur ces JPEG (« colourspace: parameter space not
// set »). On garde donc glTF-Transform pour ce qu'il fait bien — dépaqueter et
// compresser en Draco — et on redimensionne les textures avec ffmpeg entre les
// deux. Si sharp est un jour réparé, `optimize --compress draco
// --texture-compress webp --texture-size 1024` fait la même chose d'un trait.
//
// ⚠️ LE MAILLAGE N'EST ALLÉGÉ QUE S'IL EST HORS NORME. Les trophées déjà en
// place tournent entre 86 000 et 104 000 sommets ; les nouveaux montent jusqu'à
// 571 000 (Bundesliga) — cinq fois plus de détail que l'écran n'en montre, pour
// un modèle affiché dans une modale. Au-dessus de `SOMMETS_MAX`, on décime donc
// vers cette densité, avec meshoptimizer et une **borne d'erreur** (0,2 % de la
// taille du modèle) : c'est elle qui commande, pas le taux. Un trophée trop
// ciselé pour être simplifié sans dommage s'arrête tout seul avant la cible —
// c'est ce qui arrive au modèle allemand, qui garde plus de sommets que demandé.
// En dessous du seuil, on ne touche à rien.
//
// CORRESPONDANCE est le SEUL endroit à modifier pour ajouter ou remplacer un
// trophée : nom du fichier livré → id de compétition (`data/clubs.ts`), qui est
// aussi le nom du fichier de sortie et la clé de `data/trophees.ts`.
//
// Relancer : node scripts/copierTrophees.cjs        (saute ce qui existe déjà)
//            node scripts/copierTrophees.cjs --force (tout refaire)

const fs = require('fs');
const os = require('os');
const path = require('path');
// ⚠️ `execFileSync('npx', …)` échoue sous Windows (EINVAL sur un `.cmd`) : on
// passe par le shell, avec les chemins entre guillemets — « Destiny Rugby »
// contient une espace.
const { execSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const SRC = path.join(RACINE, 'nouvellecoupe');
const DEST = path.join(RACINE, 'public', 'm3d');
const TAILLE_TEXTURE = 1024;
// La densité des trophées historiques (86 000 à 104 000 sommets). Au-delà, on
// décime — mais jamais au prix de la silhouette (voir `ERREUR_MAX`).
const SOMMETS_MAX = 130_000;
const SOMMETS_CIBLE = 120_000;
const ERREUR_MAX = 0.002;

// fichier livré (sans extension) → id de compétition
const CORRESPONDANCE = {
  // Championnats et coupes de clubs
  'bundesliga': 'bundesliga',
  'cury cup south africa': 'currieCup',
  'ecosseleague': 'ecosseSuper',
  'espagneleague': 'espagne',
  'finlandeleague': 'finlande',
  'gallesleague': 'gallesSRC',
  'gallesd2league': 'gallesPrem',
  'gallescup': 'gallesChall',
  'georgieleague': 'georgie',
  'irelandeleague': 'irlandeAIL',
  'leagueargentine': 'argentine',
  'netherlandleague': 'paysBas',
  'newzelandleague': 'nzHeartland',
  'polandleague': 'pologne',
  'portugalleague': 'portugal',
  'republiquetchequeleague': 'tcheque',
  'romanianleague': 'roumanie',
  'russianleague': 'russie',
  'seria league': 'italie',
  // Sélections : « Six Nations B » est le surnom du Rugby Europe Championship.
  'Six Nations B cup': 'recEurope',
};

const force = process.argv.includes('--force');
const ko = (n) => `${(n / 1024).toFixed(0)} Ko`;
const mo = (n) => `${(n / 1024 / 1024).toFixed(1)} Mo`;
const gltf = (args) => execSync(`npx --yes @gltf-transform/cli@4 ${args}`, { stdio: ['ignore', 'ignore', 'pipe'] });

// Le nombre de sommets d'un modèle, lu dans le rapport `inspect`. La ligne des
// MESHES est la seule à contenir « TRIANGLES » ; la 6ᵉ colonne est le compte.
function sommets(fichier) {
  const rapport = execSync(
    `npx --yes @gltf-transform/cli@4 inspect "${fichier}" --format csv`,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  let total = 0;
  for (const ligne of rapport.split('\n')) {
    if (!/^\d+,[^,]*,TRIANGLES,/.test(ligne)) continue;
    total += Number(ligne.split(',')[5]) || 0;
  }
  return total;
}

fs.mkdirSync(DEST, { recursive: true });

const avertissements = [];
let entree = 0;
let sortie = 0;
let traites = 0;
let sautes = 0;

// Un modèle livré mais absent de la table, c'est une compétition qu'on oublie
// de récompenser : ça ne doit pas passer en silence.
for (const f of fs.readdirSync(SRC).filter((n) => n.toLowerCase().endsWith('.glb'))) {
  if (!(path.basename(f, path.extname(f)) in CORRESPONDANCE)) {
    avertissements.push(`modèle livré non déclaré dans CORRESPONDANCE : ${f}`);
  }
}

for (const [fichier, id] of Object.entries(CORRESPONDANCE)) {
  const source = path.join(SRC, `${fichier}.glb`);
  if (!fs.existsSync(source)) {
    avertissements.push(`modèle absent : ${fichier}.glb (${id})`);
    continue;
  }
  const cible = path.join(DEST, `${id}.glb`);
  const tailleSource = fs.statSync(source).size;
  entree += tailleSource;

  if (fs.existsSync(cible) && !force) {
    sortie += fs.statSync(cible).size;
    sautes += 1;
    continue;
  }

  process.stdout.write(`   ${id.padEnd(14)} ${mo(tailleSource).padStart(8)} → `);
  const atelier = fs.mkdtempSync(path.join(os.tmpdir(), 'trophee-'));
  try {
    // 1. dépaquetage : le .gltf sort ses textures en fichiers séparés
    let travail = path.join(atelier, 'm.gltf');
    gltf(`copy "${source}" "${travail}"`);

    // 2. le maillage, décimé s'il sort de la norme des trophées existants
    const avant = sommets(travail);
    if (avant > SOMMETS_MAX) {
      const allege = path.join(atelier, 'allege.gltf');
      // `weld` d'abord : meshoptimizer a besoin d'un maillage indexé propre.
      gltf(`weld "${travail}" "${allege}"`);
      gltf(`simplify "${allege}" "${allege}" --ratio ${(SOMMETS_CIBLE / avant).toFixed(4)} --error ${ERREUR_MAX}`);
      travail = allege;
      process.stdout.write(`${(avant / 1000).toFixed(0)}k→${(sommets(travail) / 1000).toFixed(0)}k sommets, `);
    }

    // 3. les textures, ramenées à 1024² (jamais agrandies)
    for (const img of fs.readdirSync(atelier).filter((n) => /\.(jpe?g|png)$/i.test(n))) {
      const p = path.join(atelier, img);
      const reduit = `${p}.reduit${path.extname(img)}`;
      execSync(
        `ffmpeg -v error -y -i "${p}" -vf "scale='min(${TAILLE_TEXTURE},iw)':-1" -q:v 4 "${reduit}"`,
        { stdio: ['ignore', 'ignore', 'pipe'] },
      );
      fs.renameSync(reduit, p);
    }

    // 4. Draco + rempaquetage dans un .glb (les textures repartent dedans)
    gltf(`draco "${travail}" "${cible}"`);
  } finally {
    fs.rmSync(atelier, { recursive: true, force: true });
  }

  const tailleCible = fs.statSync(cible).size;
  sortie += tailleCible;
  traites += 1;
  console.log(`${ko(tailleCible).padStart(9)}  (−${(100 - (tailleCible / tailleSource) * 100).toFixed(1)} %)`);
}

console.log(`\n✅ ${traites} trophée(s) traité(s)${sautes ? `, ${sautes} déjà à jour` : ''} → public/m3d/`);
console.log(`   ${mo(entree)} livrés → ${mo(sortie)} embarqués (${(100 - (sortie / entree) * 100).toFixed(1)} % de gagné)`);
if (avertissements.length) {
  console.log(`\n⚠ ${avertissements.length} avertissement(s) :`);
  for (const a of avertissements) console.log('   ·', a);
} else {
  console.log('   Aucun avertissement ✅');
}
