// LES PORTRAITS DU JAPON ET DU SUPER RUGBY PACIFIC
//
// Source : `../rugby_players.json` — 1 847 joueurs, 36 clubs, deux
// compétitions (Japan Rugby League One D1/D2/D3 saison 25-26, Super Rugby
// Pacific 2026). Le fichier ne contient que des URL DISTANTES.
//
// ⚠️ ON NE POINTE JAMAIS SUR UNE URL DISTANTE. Le jeu doit rester entier hors
// ligne, et un portrait servi par le site d'un club disparaît le jour où le
// club refait son site — c'est exactement pour ça que `randomuser.me` a été
// supprimé (voir `lib/avatars.ts`). Chaque photo est donc téléchargée,
// recompressée et rangée dans `public/photos/monde/`.
//
// ⚠️ ET ON LES RECOMPRESSE, SINON C'EST UN GIGAOCTET. Les originaux font
// jusqu'à 500 Ko en 720 × 1080 ; une carte n'affiche jamais plus de 250 px de
// large. Redimensionnés à 600 px et encodés en WebP q80, les 1 847 portraits
// tiennent dans ~45 Mo — l'ordre de grandeur des 1 400 photos françaises déjà
// dans le dépôt (78 Ko pièce).
//
// ⚠️ TROIS CLUBS DONNENT DES CHEMINS RELATIFS (Crusaders, Highlanders,
// Hurricanes) : ils se résolvent contre l'URL de l'équipe. Et cinquante noms
// arrivent collés (« ScottBarrett ») : on recoupe sur les majuscules, sinon la
// clé d'index ne ressemble à aucun nom de la base.
//
// Le script est REPRENABLE : un fichier déjà présent n'est pas retéléchargé.
//
// Relancer : node scripts/importerPhotosMondiales.cjs
//   mesure  : npx vite-node scripts/verifPhotosCartes.ts

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const RACINE = path.join(__dirname, '..');
const SOURCE = path.join(RACINE, '..', 'rugby_players.json');
const DOSSIER = path.join(RACINE, 'public', 'photos', 'monde');
const INDEX = path.join(RACINE, 'src', 'data', 'photosMonde.ts');

/** Le préfixe de fichier par compétition — il évite d'écraser un homonyme. */
const PREFIXES = { 'Japan Rugby League One': 'jpn', 'Super Rugby Pacific': 'srp' };
const LARGEUR = 600;
const QUALITE = 80;
const PARALLELE = 8;
const ESSAIS = 3;

const normaliser = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/([a-z])([A-Z])/g, '$1 $2') // « ScottBarrett » → « Scott Barrett »
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const fichierDe = (s) => normaliser(s).replace(/ /g, '_');

if (!fs.existsSync(SOURCE)) throw new Error(`Fichier introuvable : ${SOURCE}`);
fs.mkdirSync(DOSSIER, { recursive: true });

const donnees = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const attendus = [];
const noms = new Map();
for (const competition of donnees.competitions ?? []) {
  const prefixe = PREFIXES[competition.competition] ?? 'monde';
  for (const equipe of competition.teams ?? []) {
    for (const joueur of equipe.players ?? []) {
      if (!joueur.photo_url || !joueur.name) continue;
      let url;
      try { url = new URL(joueur.photo_url, equipe.team_url ?? undefined).href; } catch { continue; }
      const cle = normaliser(joueur.name);
      if (!cle) continue;
      // Deux joueurs du même nom dans deux clubs : le second prend le nom de
      // son équipe en suffixe, et l'index gardera le premier arrivé.
      let nom = `${prefixe}_${fichierDe(joueur.name)}`;
      if (noms.has(nom)) nom = `${prefixe}_${fichierDe(equipe.team)}_${fichierDe(joueur.name)}`;
      noms.set(nom, true);
      attendus.push({ cle, nom, url, equipe: equipe.team, competition: competition.competition });
    }
  }
}
console.log(`→ ${attendus.length} portraits annoncés par ${SOURCE.split(path.sep).pop()}.`);

async function telecharger(entree) {
  const destination = path.join(DOSSIER, `${entree.nom}.webp`);
  if (fs.existsSync(destination)) return 'deja';
  for (let essai = 1; essai <= ESSAIS; essai++) {
    try {
      const reponse = await fetch(entree.url, { signal: AbortSignal.timeout(30_000), headers: { 'user-agent': 'Mozilla/5.0 destiny-rugby-import' } });
      if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
      const brut = Buffer.from(await reponse.arrayBuffer());
      await sharp(brut)
        .resize({ width: LARGEUR, height: Math.round(LARGEUR * 1.4), fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITE })
        .toFile(destination);
      return 'telecharge';
    } catch (erreur) {
      if (essai === ESSAIS) { console.warn(`   ✗ ${entree.nom} : ${erreur.message}`); return 'echec'; }
      await new Promise((suite) => setTimeout(suite, 400 * essai));
    }
  }
  return 'echec';
}

(async () => {
  const compteur = { deja: 0, telecharge: 0, echec: 0 };
  let index = 0;
  const ouvriers = Array.from({ length: PARALLELE }, async () => {
    while (index < attendus.length) {
      const entree = attendus[index++];
      compteur[await telecharger(entree)]++;
      const total = compteur.deja + compteur.telecharge + compteur.echec;
      if (total % 100 === 0) console.log(`   ${total}/${attendus.length}…`);
    }
  });
  await Promise.all(ouvriers);
  console.log(`✓ ${compteur.telecharge} téléchargés, ${compteur.deja} déjà là, ${compteur.echec} en échec.`);

  // ── Les portraits génériques se reconnaissent à leur empreinte ───────────
  // Un club qui n'a pas la photo d'un joueur sert son logo ou une silhouette
  // maison : le même fichier revient alors des dizaines de fois. On ne peut
  // pas le deviner par son nom, on le voit à l'octet près.
  const empreintes = new Map();
  for (const entree of attendus) {
    const fichier = path.join(DOSSIER, `${entree.nom}.webp`);
    if (!fs.existsSync(fichier)) continue;
    const empreinte = crypto.createHash('md5').update(fs.readFileSync(fichier)).digest('hex');
    if (!empreintes.has(empreinte)) empreintes.set(empreinte, []);
    empreintes.get(empreinte).push(entree.nom);
  }
  const generiques = new Set();
  for (const [empreinte, fichiers] of empreintes) {
    if (fichiers.length < 3) continue;
    console.log(`   ⚠ ${fichiers.length} portraits identiques (${empreinte.slice(0, 8)}) : image générique, écartée.`);
    for (const nom of fichiers) { fs.unlinkSync(path.join(DOSSIER, `${nom}.webp`)); generiques.add(nom); }
  }

  // ── L'index ─────────────────────────────────────────────────────────────
  const table = new Map();
  for (const entree of attendus) {
    if (generiques.has(entree.nom) || !fs.existsSync(path.join(DOSSIER, `${entree.nom}.webp`))) continue;
    if (!table.has(entree.cle)) table.set(entree.cle, `/photos/monde/${entree.nom}.webp`);
  }
  const lignes = [...table].sort(([a], [b]) => a.localeCompare(b)).map(([cle, url]) => `  ${JSON.stringify(cle)}: ${JSON.stringify(url)},`);
  fs.writeFileSync(INDEX,
    '// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.\n'
    + '// Source : ../rugby_players.json · Généré par scripts/importerPhotosMondiales.cjs\n'
    + '//\n'
    + '// Portraits du Japan Rugby League One (D1, D2, D3) et du Super Rugby\n'
    + '// Pacific, téléchargés puis recompressés dans public/photos/monde/.\n'
    + '// La clé est le nom normalisé, comme les autres index de portraits.\n\n'
    + 'export const PHOTO_JOUEUR_MONDE: Record<string, string> = {\n'
    + `${lignes.join('\n')}\n};\n\n`
    + `export const NB_PHOTOS_MONDE = ${table.size};\n`, 'utf8');
  const poids = fs.readdirSync(DOSSIER).reduce((total, f) => total + fs.statSync(path.join(DOSSIER, f)).size, 0);
  console.log(`✓ ${table.size} joueurs indexés · ${(poids / 1024 / 1024).toFixed(1)} Mo dans public/photos/monde/`);
  console.log(`✓ ${INDEX}`);
})();
