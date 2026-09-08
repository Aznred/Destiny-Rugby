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
// modèle de segmentation). Ce script les rassemble, et sait les remettre.
//
//   node scripts/photosNonDetourees.cjs            → extrait vers photos-a-detourer/
//   node scripts/photosNonDetourees.cjs --retour   → replace les fichiers retouchés
//
// ⚠️ ON EXTRAIT LA PREMIÈRE VERSION CONNUE DE GIT, PAS CELLE DU DISQUE. Demandé
// en jeu : « avant tentative de détourage, genre l'originale ». Ce n'est pas la
// même chose, et c'est mesuré : **18 des 68 fichiers portent déjà les traces
// d'une passe ratée**. Apolosi Ranawai est arrivé sans couche alpha (30 Ko) et
// se retrouve avec une (34 Ko), le maillot bleu ciel mordu de blanc aux épaules
// et un halo au contour — une version antérieure du script, avant le garde-fou
// du haut de cadre, l'avait écrite malgré tout. Repartir de ce fichier-là, ce
// serait détourer par-dessus les dégâts. On remonte donc au commit qui a AJOUTÉ
// chaque photo.
//
// ⚠️ UN SEUL DOSSIER, À PLAT. Les quatre dossiers de portraits partagent des
// noms de fichiers (`maj/` et `new maj/` portent les mêmes joueurs) : le
// manifeste `index.json` retient donc, pour chaque fichier extrait, TOUTES les
// destinations où `--retour` doit le réécrire. Deux copies identiques ne sont
// extraites qu'une fois ; deux copies différentes gardent un préfixe.
//
// ⚠️ LE DOSSIER EST DANS LE DÉPÔT, MAIS PAS DANS `public/`. Suivi par git, il se
// retouche depuis n'importe quelle machine. Dans `public/`, il serait SERVI par
// le site et pèserait deux fois dans le build — une fois avec le fond, une fois
// sans.
//
// ⚠️ UN PORTRAIT DÉTOURÉ N'A PAS QUATRE COINS TRANSPARENTS. Il est coupé aux
// épaules : ses deux coins du BAS sont pleins de maillot. C'est l'erreur qui a
// fait annoncer « 1 465 photos avec un fond » là où il y en avait 52. Seuls les
// coins du HAUT disent si le mur est parti.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');

const RACINE = path.join(__dirname, '..');
const SORTIE = path.join(RACINE, 'photos-a-detourer');
const MANIFESTE = path.join(SORTIE, 'index.json');
/** Les quatre dossiers de portraits, et le préfixe qui les désigne à plat. */
const DOSSIERS = [
  ['public/photos', ''],
  ['public/photos/maj', 'maj-'],
  ['public/photos/new maj', 'newmaj-'],
  ['public/photos/monde', ''],
];
const EST_IMAGE = /\.(webp|png|jpe?g)$/i;
const md5 = (buffer) => crypto.createHash('md5').update(buffer).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: RACINE, maxBuffer: 128e6 });

/** Le mur du studio est-il parti ? On ne regarde que les deux coins du HAUT. */
async function detouree(source) {
  const image = sharp(Buffer.isBuffer(source) ? source : fs.readFileSync(source));
  const meta = await image.metadata();
  if (!meta.hasAlpha) return false;
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data[3] < 32 && data[(info.width - 1) * info.channels + 3] < 32;
}

/**
 * La version d'ORIGINE : celle du commit qui a ajouté le fichier.
 *
 * ⚠️ ON REMONTE L'HISTORIQUE JUSQU'À CE QUE `git show` RÉPONDE. `--follow` suit
 * les renommages, donc le plus vieux commit de la liste peut connaître le
 * fichier sous un AUTRE chemin — `git show <vieux>:<chemin actuel>` échoue
 * alors. On descend d'un cran à chaque échec plutôt que de rendre HEAD, qui est
 * précisément la version qu'on cherche à éviter.
 */
function versionOrigine(chemin) {
  const commits = git('log', '--follow', '--format=%h', '--', chemin)
    .toString().trim().split('\n').filter(Boolean);
  for (let i = commits.length - 1; i >= 0; i--) {
    try { return { contenu: git('show', `${commits[i]}:${chemin}`), commit: commits[i] }; }
    catch { /* renommé à cette époque : on essaie le commit suivant */ }
  }
  return { contenu: fs.readFileSync(path.join(RACINE, chemin)), commit: 'disque' };
}

async function extraire() {
  fs.rmSync(SORTIE, { recursive: true, force: true });
  fs.mkdirSync(SORTIE, { recursive: true });

  // 1. Qui refuse le détourage ? On juge sur la version d'ORIGINE, pas sur le
  //    disque : un fichier déjà abîmé par une passe ratée doit être repris lui
  //    aussi, alors que sa couche alpha pourrait le faire passer pour détouré.
  const trouves = [];
  for (const [source, prefixe] of DOSSIERS) {
    const dossier = path.join(RACINE, source);
    const fichiers = fs.readdirSync(dossier).filter((f) => EST_IMAGE.test(f));
    let compte = 0;
    for (const nom of fichiers) {
      if (await detouree(path.join(dossier, nom))) continue;
      const { contenu, commit } = versionOrigine(`${source}/${nom}`);
      trouves.push({ source, nom, prefixe, contenu, commit, reprise: commit !== 'disque' && md5(contenu) !== md5(fs.readFileSync(path.join(dossier, nom))) });
      compte++;
    }
    console.log(`${source.padEnd(24)} ${String(compte).padStart(4)} à détourer sur ${fichiers.length}`);
  }

  // 2. À plat, en fusionnant les doublons parfaits (`maj/` et `new maj/`).
  const parEmpreinte = new Map();
  for (const t of trouves) {
    const cle = md5(t.contenu);
    if (parEmpreinte.has(cle)) { parEmpreinte.get(cle).destinations.push(`${t.source}/${t.nom}`); continue; }
    parEmpreinte.set(cle, { nom: t.nom, prefixe: t.prefixe, contenu: t.contenu, reprise: t.reprise, destinations: [`${t.source}/${t.nom}`] });
  }
  // Le préfixe ne sert que si deux fichiers DIFFÉRENTS portent le même nom.
  const compteNoms = new Map();
  for (const e of parEmpreinte.values()) compteNoms.set(e.nom, (compteNoms.get(e.nom) ?? 0) + 1);
  const manifeste = {};
  let reprises = 0;
  for (const e of parEmpreinte.values()) {
    const nom = compteNoms.get(e.nom) > 1 ? `${e.prefixe}${e.nom}` : e.nom;
    fs.writeFileSync(path.join(SORTIE, nom), e.contenu);
    manifeste[nom] = e.destinations;
    if (e.reprise) reprises++;
  }

  const noms = Object.keys(manifeste).sort();
  fs.writeFileSync(MANIFESTE, `${JSON.stringify(manifeste, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(SORTIE, 'LISEZ-MOI.md'), [
    '# Les portraits que le détourage automatique refuse',
    '',
    `**${noms.length} fichiers**, extraits le ${new Date().toISOString().slice(0, 10)}.`,
    '',
    'Ce sont les **originaux**, tels qu\'ils sont entrés dans le dépôt : le script',
    'les reprend au commit qui les a AJOUTÉS, pas sur le disque. La nuance compte —',
    `**${reprises} d'entre eux portent déjà les traces d'une passe ratée** sur le`,
    'disque (une couche alpha, un maillot mordu de blanc, un halo au contour),',
    'écrite par une version antérieure de `detourerPhotos.cjs` avant que le',
    'garde-fou du haut de cadre existe. Détourer par-dessus ces dégâts n\'aurait',
    'rien donné de bon.',
    '',
    '## Pourquoi l\'automatique les refuse',
    '',
    '`detourerPhotos.cjs` sépare le joueur du mur par la COULEUR, en partant des',
    'bords. Ça ne peut pas marcher quand les deux partagent la même couleur — un',
    'lettrage blanc sur fond blanc, et la propagation traverse le maillot et le',
    'vide. Ni quand le « fond » n\'en est pas un : un drapeau tenu à bout de bras',
    'fait partie de la photo. Le script refuse, et il a raison : un portrait refusé',
    'garde son fond et se corrige plus tard, un portrait troué est écrit sur le',
    'disque et se voit en jeu.',
    '',
    '## Comment les rendre',
    '',
    'Détoure-les sur place, **en gardant exactement le même nom de fichier**, puis :',
    '',
    '```bash',
    'node scripts/photosNonDetourees.cjs --retour',
    '```',
    '',
    '`index.json` dit à quel(s) chemin(s) chaque fichier retourne — certains',
    'existent en deux exemplaires dans le jeu (`photos/maj/` et `photos/new maj/`',
    'portent les mêmes joueurs), et un seul fichier retouché les sert tous les',
    'deux. Le script ne reprend que ceux **réellement détourés** (coins du HAUT',
    'transparents) : un fichier laissé tel quel est ignoré, pas recopié pour rien.',
    '',
    '## Inventaire',
    '',
    ...noms.map((n) => `- \`${n}\` → ${manifeste[n].map((d) => `\`${d}\``).join(', ')}`),
    '',
  ].join('\n'), 'utf8');

  console.log(`\n✓ ${noms.length} portraits dans ${path.relative(RACINE, SORTIE)}/ (à plat)`);
  console.log(`  dont ${reprises} repris à leur version d'origine — le disque en portait une tentative ratée.`);
  console.log('  Retouche-les, puis : node scripts/photosNonDetourees.cjs --retour');
}

async function retour() {
  if (!fs.existsSync(MANIFESTE)) throw new Error(`Rien à reprendre : ${MANIFESTE} n'existe pas.`);
  const manifeste = JSON.parse(fs.readFileSync(MANIFESTE, 'utf8'));
  let reprises = 0;
  let ignorees = 0;
  for (const [nom, destinations] of Object.entries(manifeste)) {
    const fichier = path.join(SORTIE, nom);
    if (!fs.existsSync(fichier)) { ignorees++; continue; }
    // ⚠️ ON NE REPREND QUE CE QUI A VRAIMENT ÉTÉ DÉTOURÉ. Recopier un fichier
    // inchangé ne casserait rien, mais il apparaîtrait modifié dans git à cause
    // du seul ré-encodage — et on ne saurait plus ce qui a été retouché.
    if (!(await detouree(fichier))) { ignorees++; continue; }
    for (const destination of destinations) fs.copyFileSync(fichier, path.join(RACINE, destination));
    reprises++;
  }
  console.log(`✓ ${reprises} portraits remis en place, ${ignorees} laissés (pas encore détourés).`);
}

(async () => {
  if (process.argv.includes('--retour')) await retour();
  else await extraire();
})();
