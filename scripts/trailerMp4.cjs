// LE TRAILER, EN MP4 — 1080 × 1920, 30 fps, prêt pour TikTok / Reels / Shorts
//
// ⚠️ POURQUOI FFMPEG ET PAS UNE CAPTURE D'ÉCRAN. Filmer une page web donne une
// vidéo à la merci du taux de rafraîchissement, du redimensionnement et de ce
// qui passe à l'écran pendant l'enregistrement. Ici chaque image est CALCULÉE :
// 1080 × 1920 exact, 30 images par seconde exactes, mêmes couleurs à chaque
// exécution. On peut relancer le script après avoir changé une phrase.
//
// ⚠️ LES OBJETS SONT LES VRAIS. Le Bouclier de Brennus, le ballon et la
// Champions Cup viennent des `.glb` du jeu, rendus sur fond transparent par
// `capture-trailer.html` (page jetable, voir le README de ce dossier). Le
// trailer ne montre donc pas des dessins qui ressemblent aux objets du jeu :
// il montre les objets du jeu.
//
// Relancer :  node scripts/trailerMp4.cjs
// Sortie   :  sources/trailer/destiny-rugby-trailer.mp4

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const VISUELS = process.argv[2] || path.join(RACINE, 'sources', 'trailer', 'visuels');
const SORTIE = path.join(RACINE, 'sources', 'trailer');
const FICHIER = path.join(SORTIE, 'destiny-rugby-trailer.mp4');

const L = 1080, H = 1920, FPS = 30;

// ── LES POLICES ────────────────────────────────────────────────────────────
// ⚠️ Impact est LA condensée des banderoles de stade, et elle est présente sur
// tout Windows et tout macOS. Bahnschrift sert d'instrument (chrono, chiffres).
const POLICES = [
  ['affiche', 'C:/Windows/Fonts/impact.ttf'],
  ['grasse', 'C:/Windows/Fonts/ariblk.ttf'],
  ['instrument', 'C:/Windows/Fonts/bahnschrift.ttf'],
  ['corps', 'C:/Windows/Fonts/segoeui.ttf'],
];
// ⚠️ ON COPIE LES POLICES DANS L'ATELIER, ET C'EST LA SEULE FAÇON SAINE.
// `fontfile=C:/Windows/...` ne passe pas : dans une valeur de filtre ffmpeg le
// deux-points sépare deux options, et l'échapper diffère entre cmd, PowerShell
// et bash — on obtient « No option name near '/Windows/Fonts/…' », un message
// qui ne dit rien de la vraie cause. En travaillant dans le dossier des
// polices, le chemin n'a plus ni lettre de lecteur ni deux-points.
const atelier = fs.mkdtempSync(path.join(os.tmpdir(), 'trailer-'));
const police = {};
for (const [nom, chemin] of POLICES) {
  if (!fs.existsSync(chemin)) throw new Error(`Police introuvable : ${chemin}`);
  const local = `${nom}.ttf`;
  fs.copyFileSync(chemin, path.join(atelier, local));
  police[nom] = local;
}

const OR = '0xf4cd63';
const OR_SOMBRE = '0xe8b23a';
const CRAIE = '0xf5f7f2';
const VERT = '0x34a35a';
const SANG = '0x9c1b2f';

function ffmpeg(args) {
  execSync(`ffmpeg -hide_banner -loglevel error -y ${args}`, {
    stdio: ['ignore', 'ignore', 'pipe'],
    cwd: atelier, // pour que `fontfile=affiche.ttf` se résolve
  });
}

/** Un texte, avec sa montée d'un bloc et son maintien. */
function txt({
  t, police: p = 'affiche', taille = 132, couleur = CRAIE, y, x = 88,
  depart = 0, monte = 0.34, opacite = 1, espace = 0,
}) {
  // ⚠️ `\:` et `'` cassent le parseur de filtres : on échappe, sinon un simple
  // « L'élite » suffit à faire échouer tout le rendu avec un message obscur.
  const propre = String(t).replace(/\\/g, '\\\\').replace(/'/g, "\u2019").replace(/:/g, '\\:').replace(/%/g, '\\%');
  const dy = `${y}+40*max(0\\,1-(t-${depart})/${monte})`;
  const alpha = `${opacite}*min(1\\,max(0\\,(t-${depart})/${monte}))`;
  return `drawtext=fontfile='${police[p]}':text='${propre}':fontcolor=${couleur}`
    + `:fontsize=${taille}:x=${x}:y='${dy}':alpha='${alpha}'`
    + (espace ? `:expansion=none` : '')
    + `:shadowcolor=0x000000@0.55:shadowx=0:shadowy=6`;
}

/** Le fond commun : pelouse nocturne, projecteurs, lignes de craie, grain. */
function fond(duree) {
  return [
    `color=c=0x050d09:s=${L}x${H}:d=${duree}:r=${FPS}[base]`,
    // Deux cônes de projecteur, très doux.
    `[base]drawbox=x=0:y=0:w=${L}:h=${H}:color=0x0a2115@0.55:t=fill[b1]`,
    // Le halo doré du haut.
    `[b1]vignette=angle=PI/3.6:x0=${L / 2}:y0=${H * 0.14}:mode=backward[b2]`,
    // Les lignes de craie qui fuient vers le bas.
    `[b2]geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)'[b3]`,
    `[b3]noise=alls=7:allf=t+u[fondu]`,
  ].join(';');
}

// ═══════════════════════════════════════════════════════════════════════════
// LES PLANS
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ CHAQUE PLAN EST UN FICHIER. On les concatène à la fin : une phrase à
// changer ne demande de recalculer qu'un plan de trois secondes, pas la vidéo.
const morceaux = [];

function plan(nom, duree, filtres, entrees = '') {
  const cible = path.join(atelier, `${nom}.mp4`);
  const chaine = `${fond(duree)};${filtres}`;
  ffmpeg(
    `-f lavfi -i "color=c=black:s=${L}x${H}:d=${duree}:r=${FPS}" ${entrees}`
    + ` -filter_complex "${chaine}" -map "[fin]" -t ${duree}`
    + ` -c:v libx264 -pix_fmt yuv420p -preset slow -crf 17 -r ${FPS} "${cible}"`,
  );
  morceaux.push(cible);
  console.log(`   ${nom.padEnd(14)} ${duree}s`);
}

console.log('\n▸ Rendu des plans');

// ── 1 · LE CROCHET ─────────────────────────────────────────────────────────
// ⚠️ Trois secondes pour tuer l'objection « encore un jeu de manager ». C'est
// le plan qui décide de la rétention : tout le reste ne sert à rien s'il rate.
plan('01-crochet', 3, [
  `[fondu]${txt({ t: 'RPG DE CARRIERE', police: 'instrument', taille: 34, couleur: OR, y: 690, depart: 0.05 })}[a]`,
  `[a]${txt({ t: 'TU NE GERES', taille: 150, y: 760, depart: 0.12 })}[b]`,
  `[b]${txt({ t: 'PAS UN CLUB.', taille: 150, y: 900, depart: 0.2 })}[c]`,
  // La rature rouge : elle arrive après, et elle claque.
  `[c]drawbox=x=88:y=968:w='min(770\\,900*max(0\\,(t-0.62)/0.28))':h=16:color=${SANG}@0.95:t=fill[d]`,
  `[d]${txt({ t: 'TU ES LE JOUEUR.', taille: 150, couleur: OR, y: 1090, depart: 0.95 })}[e]`,
  `[e]${txt({ t: 'Un seul. De son premier match a sa retraite.', police: 'corps', taille: 42, couleur: '0xc7d1c6', y: 1270, depart: 1.25 })}[fin]`,
].join(';'));

// ── 2 · LE MONDE ───────────────────────────────────────────────────────────
plan('02-monde', 3, [
  `[fondu]${txt({ t: 'TA PREMIERE SIGNATURE', police: 'instrument', taille: 34, couleur: OR, y: 560 })}[a]`,
  `[a]${txt({ t: '15 POSTES.', taille: 140, y: 630, depart: 0.1 })}[b]`,
  `[b]${txt({ t: '655 CLUBS REELS.', taille: 140, couleur: OR, y: 770, depart: 0.22 })}[c]`,
  // L'échelle des divisions, qui se remplit du bas vers le haut.
  `[c]drawbox=x=88:y=1010:w='min(880\\,1000*max(0\\,(t-0.7)/0.3))':h=14:color=0x2a4a36:t=fill[d1]`,
  `[d1]${txt({ t: 'REGIONALE 3', police: 'instrument', taille: 32, couleur: '0x8ea394', y: 1046, depart: 0.75 })}[d2]`,
  `[d2]drawbox=x=88:y=1130:w='min(880\\,1000*max(0\\,(t-0.95)/0.3))':h=14:color=0x2f6a46:t=fill[e1]`,
  `[e1]${txt({ t: 'NATIONALE', police: 'instrument', taille: 32, couleur: '0x8ea394', y: 1166, depart: 1 })}[e2]`,
  `[e2]drawbox=x=88:y=1250:w='min(880\\,1000*max(0\\,(t-1.2)/0.3))':h=14:color=${VERT}:t=fill[f1]`,
  `[f1]${txt({ t: 'PRO D2', police: 'instrument', taille: 32, couleur: '0xc7d1c6', y: 1286, depart: 1.25 })}[f2]`,
  `[f2]drawbox=x=88:y=1370:w='min(880\\,1000*max(0\\,(t-1.45)/0.3))':h=20:color=${OR}:t=fill[g1]`,
  `[g1]${txt({ t: 'TOP 14', police: 'affiche', taille: 66, couleur: OR, y: 1400, depart: 1.5 })}[fin]`,
].join(';'));

// ── 3 · LE RYTHME ──────────────────────────────────────────────────────────
plan('03-saison', 3, [
  `[fondu]${txt({ t: 'AOUT  ->  JUIN', police: 'instrument', taille: 34, couleur: OR, y: 700 })}[a]`,
  `[a]${txt({ t: '43 SEMAINES.', taille: 148, y: 770, depart: 0.1 })}[b]`,
  `[b]${txt({ t: 'UNE PAR UNE.', taille: 148, couleur: OR, y: 915, depart: 0.24 })}[c]`,
  `[c]${txt({ t: 'Championnat. Coupe d Europe.', police: 'corps', taille: 44, couleur: '0xc7d1c6', y: 1110, depart: 0.6 })}[d]`,
  `[d]${txt({ t: 'Fenetres internationales.', police: 'corps', taille: 44, couleur: '0xc7d1c6', y: 1170, depart: 0.75 })}[e]`,
  // La frise des semaines qui se remplit — l'instrument, pas un ornement.
  `[e]drawbox=x=88:y=1320:w=904:h=10:color=0x1a3324:t=fill[f]`,
  `[f]drawbox=x=88:y=1320:w='min(904\\,904*max(0\\,(t-0.5)/2.2))':h=10:color=${OR}:t=fill[fin]`,
].join(';'));

// ── 4 · LA MÉCANIQUE ───────────────────────────────────────────────────────
// Le plan différenciant : il dure une seconde de plus, exprès.
plan('04-mj', 4, [
  `[fondu]${txt({ t: 'CHAQUE SEMAINE, UNE SITUATION', police: 'instrument', taille: 34, couleur: OR, y: 560 })}[a]`,
  `[a]${txt({ t: 'TU ECRIS.', taille: 150, y: 630, depart: 0.1 })}[b]`,
  `[b]${txt({ t: 'LE MJ TRANCHE.', taille: 150, couleur: OR, y: 775, depart: 0.24 })}[c]`,
  `[c]drawbox=x=88:y=1000:w=904:h=300:color=0x0a1c12@0.85:t=fill[d]`,
  `[d]drawbox=x=88:y=1000:w=904:h=300:color=${OR}@0.35:t=3[e]`,
  `[e]${txt({ t: '" Je reste une heure de plus au plaquage.', police: 'corps', taille: 40, couleur: CRAIE, x: 128, y: 1050, depart: 0.8 })}[f]`,
  `[f]${txt({ t: 'Je veux le poste de titulaire. "', police: 'corps', taille: 40, couleur: OR, x: 128, y: 1108, depart: 1.05 })}[g]`,
  `[g]${txt({ t: 'PLAQUAGE +2', police: 'instrument', taille: 40, couleur: VERT, x: 128, y: 1210, depart: 1.7 })}[h]`,
  `[h]${txt({ t: 'STAFF +6', police: 'instrument', taille: 40, couleur: VERT, x: 460, y: 1210, depart: 1.95 })}[i]`,
  `[i]${txt({ t: 'FORME -4', police: 'instrument', taille: 40, couleur: '0xe58b8b', x: 700, y: 1210, depart: 2.2 })}[j]`,
  `[j]${txt({ t: 'Aucun autre jeu de rugby ne fait ca.', police: 'corps', taille: 40, couleur: '0x8ea394', y: 1400, depart: 2.6 })}[fin]`,
].join(';'));

// ── 5 · LA PREUVE ──────────────────────────────────────────────────────────
plan('05-match', 3, [
  `[fondu]${txt({ t: 'J23  -  DEMI-FINALE', police: 'instrument', taille: 34, couleur: OR, y: 660 })}[a]`,
  `[a]drawbox=x=88:y=730:w=904:h=4:color=${OR}@0.4:t=fill[b]`,
  `[b]${txt({ t: 'PIERREFEUCAIN', taille: 62, y: 770, depart: 0.1 })}[c]`,
  `[c]${txt({ t: '24 - 21', police: 'instrument', taille: 128, couleur: OR, y: 850, depart: 0.25 })}[d]`,
  `[d]${txt({ t: 'LOUDUN', taille: 62, y: 1010, depart: 0.15 })}[e]`,
  `[e]drawbox=x=88:y=1110:w=904:h=4:color=${OR}@0.4:t=fill[f]`,
  `[f]${txt({ t: '79e MINUTE - ESSAI.', taille: 96, couleur: VERT, y: 1180, depart: 1.1 })}[g]`,
  `[g]${txt({ t: 'LE TIEN.', taille: 96, couleur: VERT, y: 1290, depart: 1.4 })}[h]`,
  `[h]${txt({ t: 'Des matchs joues, pas des chiffres tires au sort.', police: 'corps', taille: 38, couleur: '0x8ea394', y: 1440, depart: 1.9 })}[fin]`,
].join(';'));

// ── 6 · LE BRENNUS ─────────────────────────────────────────────────────────
// ⚠️ LE VRAI MODÈLE DU JEU, rendu depuis `m3d/brennus.glb`. Il monte du bas et
// s'arrête net : c'est le seul plan où un objet occupe tout l'écran, parce que
// c'est le seul objet qui vaut qu'on s'arrête dessus.
const brennus = path.join(VISUELS, 'brennus.png').replace(/\\/g, '/');
if (!fs.existsSync(brennus)) throw new Error(`Visuel manquant : ${brennus}`);
plan('06-brennus', 4, [
  `[1:v]scale=1180:-1,format=rgba[bou]`,
  `[fondu][bou]overlay=x=(W-w)/2:y='(H-h)/2+120+700*max(0\\,1-(t/0.55))':eval=frame[a]`,
  // Une lueur qui monte derrière le bouclier au moment où il se pose.
  `[a]drawbox=x=0:y=0:w=${L}:h=${H}:color=${OR}@'0.10*max(0\\,1-abs(t-0.6)/0.25)':t=fill[b]`,
  `[b]${txt({ t: 'QUINZE SAISONS PLUS TARD', police: 'instrument', taille: 34, couleur: OR, y: 420, depart: 1.1 })}[c]`,
  `[c]${txt({ t: 'ET UN JOUR,', taille: 132, y: 1560, depart: 1.5 })}[d]`,
  `[d]${txt({ t: 'LE BOUCLIER.', taille: 132, couleur: OR, y: 1690, depart: 1.75 })}[fin]`,
].join(';'), `-loop 1 -framerate ${FPS} -t 4 -i "${brennus}"`);

// ── 7 · L'APPEL ────────────────────────────────────────────────────────────
const ballon = path.join(VISUELS, 'ballon.png').replace(/\\/g, '/');
plan('07-appel', 4, [
  `[1:v]scale=520:-1,format=rgba[bal]`,
  `[fondu][bal]overlay=x=(W-w)/2:y='560-24*sin(t*2)':eval=frame[a]`,
  `[a]${txt({ t: 'DESTINY', taille: 156, y: 1020, x: '(w-text_w)/2', depart: 0.2 })}[b]`,
  `[b]${txt({ t: 'RUGBY', taille: 156, couleur: OR, y: 1170, x: '(w-text_w)/2', depart: 0.32 })}[c]`,
  `[c]${txt({ t: 'GRATUIT  -  SANS INSCRIPTION', police: 'instrument', taille: 38, couleur: VERT, y: 1370, x: '(w-text_w)/2', depart: 0.7 })}[d]`,
  `[d]drawbox=x=190:y=1470:w=700:h=110:color=${OR}@'min(1\\,max(0\\,(t-0.95)/0.3))':t=4[e]`,
  `[e]${txt({ t: 'destiny-rugby.fr', police: 'instrument', taille: 58, couleur: CRAIE, y: 1495, x: '(w-text_w)/2', depart: 1.05 })}[fin]`,
].join(';'), `-loop 1 -framerate ${FPS} -t 4 -i "${ballon}"`);

// ═══════════════════════════════════════════════════════════════════════════
// LE MONTAGE
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n▸ Montage');
const liste = path.join(atelier, 'liste.txt');
fs.writeFileSync(liste, morceaux.map((m) => `file '${m.replace(/\\/g, '/')}'`).join('\n'));
fs.mkdirSync(SORTIE, { recursive: true });
// ⚠️ `-movflags +faststart` : sans lui, l'index de la vidéo est en fin de
// fichier et les réseaux sociaux mettent une éternité à la prévisualiser.
ffmpeg(`-f concat -safe 0 -i "${liste}" -c:v libx264 -pix_fmt yuv420p -preset slow -crf 18`
  + ` -movflags +faststart -r ${FPS} "${FICHIER}"`);

fs.rmSync(atelier, { recursive: true, force: true });
const taille = fs.statSync(FICHIER).size;
console.log(`\n✅ ${path.relative(RACINE, FICHIER)} — ${(taille / 1024 / 1024).toFixed(1)} Mo, ${L}x${H}, ${FPS} fps`);
