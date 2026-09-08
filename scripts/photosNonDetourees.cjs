// LES PORTRAITS QUE LE DÉTOURAGE AUTOMATIQUE REFUSE
//
// ⚠️ CEUX-LÀ NE SE RÉPARENT PAS AVEC UN SEUIL. `detourerPhotos.cjs` sépare le
// joueur du mur par la COULEUR, en partant des bords. Ça ne peut pas marcher
// quand le fond et le joueur partagent la même couleur — Rieko Ioane, bras
// levés sur fond blanc, a le lettrage « Bank of Ireland » en blanc sur son
// maillot : la propagation entre par le mur, ressort par les lettres et vide le
// maillot. Ni quand le « fond » n'en est pas un : un drapeau tenu à bout de
// bras fait partie de la photo. Le script les refuse, et il a raison.
//
// Il reste donc une poignée de portraits à détourer À LA MAIN (ou avec un
// modèle de segmentation). Ce script les rassemble dans un dossier, et sait les
// remettre à leur place une fois retouchés.
//
//   node scripts/photosNonDetourees.cjs            → extrait vers photos-a-detourer/
//   node scripts/photosNonDetourees.cjs --retour   → replace les fichiers retouchés
//
// ⚠️ LE DOSSIER EST DANS LE DÉPÔT, MAIS PAS DANS `public/`. Demandé en jeu :
// « copie-les moi juste dans un dossier dans le git, que je les détoure moi-même ».
// Suivis par git, ils se retrouvent sur n'importe quelle machine et se
// retouchent d'où on veut. Dans `public/`, en revanche, ils seraient SERVIS par
// le site et compteraient deux fois dans le poids du build — une fois avec leur
// fond, une fois sans.
//
// ⚠️ UN PORTRAIT DÉTOURÉ N'A PAS QUATRE COINS TRANSPARENTS. Il est coupé aux
// épaules : ses deux coins du BAS sont pleins de maillot. C'est l'erreur qui a
// fait annoncer « 1 465 photos avec un fond » là où il y en avait 52. Seuls les
// coins du HAUT disent si le mur est parti.

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const RACINE = path.join(__dirname, '..');
const SORTIE = path.join(RACINE, 'photos-a-detourer');
/** Les quatre dossiers de portraits, et le nom qu'ils portent dans la sortie. */
const DOSSIERS = [
  ['public/photos', 'photos'],
  ['public/photos/maj', 'maj'],
  ['public/photos/new maj', 'new maj'],
  ['public/photos/monde', 'monde'],
];
const EST_IMAGE = /\.(webp|png|jpe?g)$/i;

/** Le mur du studio est-il parti ? On ne regarde que les deux coins du HAUT. */
async function detouree(fichier) {
  const meta = await sharp(fichier).metadata();
  if (!meta.hasAlpha) return false;
  const { data, info } = await sharp(fs.readFileSync(fichier)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, channels } = info;
  return data[3] < 32 && data[(width - 1) * channels + 3] < 32;
}

async function extraire() {
  fs.mkdirSync(SORTIE, { recursive: true });
  let total = 0;
  const inventaire = [];
  for (const [source, nomSortie] of DOSSIERS) {
    const dossier = path.join(RACINE, source);
    const cible = path.join(SORTIE, nomSortie);
    const fichiers = fs.readdirSync(dossier).filter((f) => EST_IMAGE.test(f));
    const restants = [];
    for (const nom of fichiers) {
      const chemin = path.join(dossier, nom);
      if (await detouree(chemin)) continue;
      restants.push(nom);
    }
    if (restants.length) {
      fs.mkdirSync(cible, { recursive: true });
      for (const nom of restants) fs.copyFileSync(path.join(dossier, nom), path.join(cible, nom));
    }
    total += restants.length;
    inventaire.push(`- **${source}** — ${restants.length} sur ${fichiers.length}${restants.length ? ` :\n${restants.map((n) => `  - \`${n}\``).join('\n')}` : ''}`);
    console.log(`${source.padEnd(24)} ${String(restants.length).padStart(4)} à détourer sur ${fichiers.length}`);
  }
  fs.writeFileSync(path.join(SORTIE, 'LISEZ-MOI.md'), [
    '# Les portraits que le détourage automatique refuse',
    '',
    `**${total} fichiers**, extraits le ${new Date().toISOString().slice(0, 10)}.`,
    '',
    'Ils ne se réparent pas en remontant un seuil : `detourerPhotos.cjs` sépare le',
    'joueur du mur par la COULEUR. Quand les deux partagent la même — un lettrage',
    'blanc sur fond blanc — la propagation traverse le joueur et le vide. Quand le',
    'fond n\'en est pas un — un drapeau tenu à bout de bras — il n\'y a rien à',
    'retirer. Le script refuse, et il a raison : un portrait refusé garde son fond',
    'et se corrige plus tard, un portrait troué est écrit sur le disque.',
    '',
    '## Comment les rendre',
    '',
    'Détoure-les à la main (ou avec un outil de segmentation), **garde exactement',
    'le même nom de fichier et le même sous-dossier**, puis :',
    '',
    '```bash',
    'node scripts/photosNonDetourees.cjs --retour',
    '```',
    '',
    'Le script ne reprend que les fichiers **réellement détourés** (coins du HAUT',
    'transparents) : un fichier non retouché est ignoré, pas recopié pour rien.',
    '',
    '⚠️ `maj/` et `new maj/` contiennent les MÊMES joueurs. `lib/avatars.ts` lit',
    '`new maj` en premier — c\'est celui-là qui s\'affiche sur la carte — mais',
    '`maj` sert de repli pour les noms absents de l\'autre. Détoure les deux.',
    '',
    '## Inventaire',
    '',
    ...inventaire,
    '',
  ].join('\n'), 'utf8');
  console.log(`\n✓ ${total} portraits copiés dans ${SORTIE}`);
  console.log('  Retouche-les sur place, puis : node scripts/photosNonDetourees.cjs --retour');
}

async function retour() {
  if (!fs.existsSync(SORTIE)) throw new Error(`Rien à reprendre : ${SORTIE} n'existe pas.`);
  let reprises = 0;
  let ignorees = 0;
  for (const [source, nomSortie] of DOSSIERS) {
    const cible = path.join(SORTIE, nomSortie);
    if (!fs.existsSync(cible)) continue;
    for (const nom of fs.readdirSync(cible).filter((f) => EST_IMAGE.test(f))) {
      const retouche = path.join(cible, nom);
      // ⚠️ ON NE REPREND QUE CE QUI A VRAIMENT ÉTÉ DÉTOURÉ. Recopier un fichier
      // inchangé ne casserait rien, mais il apparaîtrait modifié dans git à
      // cause du ré-encodage — et on ne saurait plus ce qui a été retouché.
      if (!(await detouree(retouche))) { ignorees++; continue; }
      fs.copyFileSync(retouche, path.join(RACINE, source, nom));
      reprises++;
    }
  }
  console.log(`✓ ${reprises} portraits remis en place, ${ignorees} laissés (pas encore détourés).`);
}

(async () => {
  if (process.argv.includes('--retour')) await retour();
  else await extraire();
})();
