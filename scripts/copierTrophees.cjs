// LES TROPHÉES — COMPRESSION DES MODÈLES LIVRÉS
//
// Entrée : un ou plusieurs dossiers de modèles 3D livrés bruts (sortie Meshy).
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
// place tournent entre 86 000 et 104 000 sommets ; certains bruts montent jusqu'à
// 571 000 (Bundesliga) — cinq fois plus de détail que l'écran n'en montre, pour
// un modèle affiché dans une modale. Au-dessus de `SOMMETS_MAX`, on décime donc
// vers cette densité, avec meshoptimizer et une **borne d'erreur** (0,2 % de la
// taille du modèle) : c'est elle qui commande, pas le taux. Un trophée trop
// ciselé pour être simplifié sans dommage s'arrête tout seul avant la cible —
// c'est ce qui arrive au modèle allemand, qui garde plus de sommets que demandé.
// En dessous du seuil, on ne touche à rien.
//
// `LOTS` est le SEUL endroit à modifier pour ajouter ou remplacer un trophée :
// un lot = un dossier livré + sa table « nom du fichier livré → id du trophée »
// (`data/trophees.ts`), qui est aussi le nom du fichier de sortie.
//
// ⚠️ UN MODÈLE EST REFAIT SI SA SOURCE EST PLUS RÉCENTE QUE SA SORTIE. C'est ce
// qui permet de CORRIGER un trophée déjà embarqué — le modèle allemand et celui
// du meilleur joueur du monde ont été relivrés — sans avoir à tout recompresser
// (le lot des championnats prend une bonne dizaine de minutes).
//
// Relancer : node scripts/copierTrophees.cjs        (ne refait que ce qui a changé)
//            node scripts/copierTrophees.cjs --force (tout refaire)

const fs = require('fs');
const os = require('os');
const path = require('path');
// ⚠️ `execFileSync('npx', …)` échoue sous Windows (EINVAL sur un `.cmd`) : on
// passe par le shell, avec les chemins entre guillemets — « Destiny Rugby »
// contient une espace.
const { execSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const DEST = path.join(RACINE, 'public', 'm3d');
const TAILLE_TEXTURE = 1024;
// La densité des trophées historiques (86 000 à 104 000 sommets). Au-delà, on
// décime — mais jamais au prix de la silhouette (voir `ERREUR_MAX`).
const SOMMETS_MAX = 130_000;
const SOMMETS_CIBLE = 120_000;
const ERREUR_MAX = 0.002;

// Un lot = un dossier livré + sa table « fichier livré (sans extension) → id ».
const LOTS = [{
  dossier: 'sources/modeles/trophees/championnats',
  intitule: 'les 20 championnats et coupes du monde',
  correspondance: {
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
  },
}, {
  // ⚠️ DEUX CORRECTIONS ET SEPT NOUVEAUTÉS. Le modèle allemand et celui du
  // meilleur joueur du monde ont été relivrés (les précédents ne représentaient
  // pas le bon trophée) : ils écrasent les fichiers en place, parce que leur
  // source est plus récente. Les sept autres ouvrent une famille entière —
  // les HONNEURS INDIVIDUELS, qui n'existaient pas en jeu (`lib/honneurs.ts`).
  dossier: 'sources/modeles/trophees/honneurs',
  intitule: 'les honneurs individuels (+ 2 corrections)',
  correspondance: {
    // Corrections de modèles déjà embarqués
    'bon trophée bundes': 'bundesliga',
    'bestplayerintheworld': 'meilleur-joueur',
    // Meilleur joueur d'un championnat
    'meilleurjoueurtop14': 'meilleurTop14',
    'premiershipbestplayer': 'meilleurPremiership',
    'urcbestplayer': 'meilleurUrc',
    'meilleurjoueurnouvellezelande': 'meilleurNZ',
    // Meilleur joueur d'une coupe ou d'un tournoi
    'championscup best player': 'meilleurChampionsCup',
    'meilleurjoueursixnations': 'meilleurSixNations',
    'manofthematchworldcup': 'hommeDuMatchMonde',
  },
}, {
  dossier: 'sources/modeles/trophees/internationaux',
  intitule: 'les compétitions internationales',
  correspondance: {
    'Americas Rugby Championship': 'americasChamp',
    "Oceania Cup (Oceania Rugby Men's Championship)": 'oceaniaCup',
    'Rugby Europe Trophy  Conference': 'recTrophyConference',
    'The Rugby Championship (Ancien Tri-Nations)': 'rugbyChampionship',
    'World Rugby Nations Cup': 'nationsCup',
    'World Rugby Pacific Challenge': 'pacificChallenge',
    'World Rugby U20 Championship': 'mondialU20',
  },
}, {
  // ⚠️ CE LOT N'EST PAS FAIT DE TROPHÉES — le nom du script est historique.
  // Ce sont **le rugbyman et ses cosmétiques** : le personnage qu'on voit sur
  // l'accueil et dans le profil, et ce qu'on lui achète au vestiaire
  // (`data/boutique.ts`). Même pipeline, mêmes raisons : livrés à ~90 Mo pièce
  // (700 Mo au total), ils sont impubliables tels quels.
  //
  // ⚠️ `rugbyplayer` EST À PART : c'est le seul modèle que le jeu affiche EN
  // GRAND et en permanence sur l'écran d'accueil. Il passe par le même
  // traitement, mais c'est LUI qu'il faut regarder si la compression abîme
  // quelque chose.
  dossier: 'sources/modeles/cosmetiques',
  intitule: 'le rugbyman et ses cosmétiques',
  correspondance: {
    'rugbyplayer': 'rugbyman',
    'casque': 'casque',
    'chausettes': 'chaussettes',
    'mitaines': 'mitaines',
    'protege dent': 'protege-dents',
    'tee': 'tee',
    'bag': 'sac',
    'bouclierde percu': 'bouclier-plaquage',
  },
}, {
  // ⚠️ LE SECOND LOT DE COSMÉTIQUES — livré à la racine, et il y reste.
  // Le dossier s'appelle « new model boutique » parce que c'est ainsi qu'il a
  // été déposé ; le script prend un chemin relatif à la racine, il n'y a donc
  // rien à déplacer (1,3 Go de sources) pour que la chaîne fonctionne.
  //
  // ⚠️ CES MODÈLES-LÀ NE SE TEINTENT PAS. Les précédents partageaient un même
  // `.glb` décliné par `teinte` (trois paires de crampons, un seul fichier) ;
  // ceux-ci portent leur maillot peint — le Stade Toulousain, l'Irlande, le
  // rose fluo. Les teinter reviendrait à repeindre par-dessus le motif, donc
  // `data/boutique.ts` les déclare SANS `teinte`.
  dossier: 'new model boutique',
  intitule: 'le second lot de cosmétiques (maillots de club, casques, crampons)',
  correspondance: {
    // ⚠️ Le ballon UBB REMPLACE le « Tricolore Away » (demande explicite, cf. le
    // nom du fichier livré) : c'est le même id de skin, donc les joueurs qui
    // l'avaient acheté gardent leur article — il change simplement de modèle.
    'ballon ubb à la place du ballon tricolore': 'ballon-ubb',
    'casque australie': 'casque-australie',
    'casque rose fluo': 'casque-rose',
    'casque rouge': 'casque-rouge',
    'casque tribal': 'casque-tribal',
    'crampons dupont signature': 'crampons-dupont',
    'crampons graffiti': 'crampons-graffiti',
    'maillor stade toulousain': 'maillot-toulousain',
    'maillot angleterre': 'maillot-angleterre',
    'maillot aviron bayonnais': 'maillot-bayonnais',
    'maillot irelande': 'maillot-irlande',
    'maillot italie': 'maillot-italie',
    'maillot lyon': 'maillot-lyon',
    'maillot stade francais': 'maillot-stade-francais',
    'maillot vannes': 'maillot-vannes',
    // Troisième livraison : 3 maillots et 2 paires de crampons de plus.
    // (Le fichier de La Rochelle est livré « mallot » — on ne renomme pas la
    // source, la table est là pour ça.)
    'la rochelle mallot': 'maillot-rochelais',
    'ubb maillot': 'maillot-ubb',
    'pau maillot': 'maillot-pau',
    'crampons bleu': 'crampons-bleus',
    'crampons rose': 'crampons-roses',
  },
}];

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

for (const lot of LOTS) {
const SRC = path.join(RACINE, lot.dossier);
console.log(`\n▸ ${lot.dossier}/ — ${lot.intitule}`);
if (!fs.existsSync(SRC)) {
  avertissements.push(`dossier source absent : ${lot.dossier}/`);
  continue;
}

// Un modèle livré mais absent de la table, c'est un trophée qu'on oublie de
// brancher : ça ne doit pas passer en silence.
for (const f of fs.readdirSync(SRC).filter((n) => n.toLowerCase().endsWith('.glb'))) {
  if (!(path.basename(f, path.extname(f)) in lot.correspondance)) {
    avertissements.push(`modèle livré non déclaré dans LOTS : ${lot.dossier}/${f}`);
  }
}

for (const [fichier, id] of Object.entries(lot.correspondance)) {
  const source = path.join(SRC, `${fichier}.glb`);
  if (!fs.existsSync(source)) {
    avertissements.push(`modèle absent : ${lot.dossier}/${fichier}.glb (${id})`);
    continue;
  }
  const cible = path.join(DEST, `${id}.glb`);
  const tailleSource = fs.statSync(source).size;
  entree += tailleSource;

  // ⚠️ LA DATE COMMANDE, PAS LA SEULE PRÉSENCE. Un modèle relivré doit écraser
  // celui qui est embarqué — sinon la correction ne part jamais en production,
  // et rien ne le signale. Ce qui n'a pas bougé n'est pas recompressé.
  const aJour = fs.existsSync(cible) && fs.statSync(source).mtimeMs <= fs.statSync(cible).mtimeMs;
  if (aJour && !force) {
    sortie += fs.statSync(cible).size;
    sautes += 1;
    continue;
  }
  const remplace = fs.existsSync(cible);

  process.stdout.write(`   ${id.padEnd(20)} ${mo(tailleSource).padStart(8)} → `);
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
  console.log(`${ko(tailleCible).padStart(9)}  (−${(100 - (tailleCible / tailleSource) * 100).toFixed(1)} %)${remplace ? '  ♻ remplacé' : ''}`);
}
}

console.log(`\n✅ ${traites} trophée(s) traité(s)${sautes ? `, ${sautes} déjà à jour` : ''} → public/m3d/`);
console.log(`   ${mo(entree)} livrés → ${mo(sortie)} embarqués (${(100 - (sortie / entree) * 100).toFixed(1)} % de gagné)`);
if (avertissements.length) {
  console.log(`\n⚠ ${avertissements.length} avertissement(s) :`);
  for (const a of avertissements) console.log('   ·', a);
} else {
  console.log('   Aucun avertissement ✅');
}
