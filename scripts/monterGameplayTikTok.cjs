// Assemble les captures du vrai jeu, sans texte ajouté et sans piste sonore.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ffmpeg = require('ffmpeg-static');

const racine = path.resolve(__dirname, '../trailer/work/tiktok-live');
const sortie = path.resolve(__dirname, '../trailer/destiny-rugby-tiktok-gameplay-2026.mp4');
const plan = [
  ['01-accueil', 0.2, 2.4],
  ['02-choix-carriere', 0.5, 3.3],
  ['03-bureau', 0.3, 3.4],
  ['04-composition', 0.4, 3.2],
  ['05-avant-match', 0.5, 2.5],
  ['06-match', 14, 26],
  ['06-match', 33, 41],
  ['07-collection', 0.4, 3.6],
  ['08-ouverture-pack', 0.4, 10.2],
  ['09-en-ligne', 0.4, 5.4],
];

const images = [];
for (const [scene, debut, fin] of plan) {
  const dossier = path.join(racine, scene);
  const brut = JSON.parse(fs.readFileSync(path.join(dossier, 'frames.json'), 'utf8')).frames;
  const captures = brut.filter(f => fs.existsSync(path.join(dossier, f.file)))
    .sort((a, b) => a.at - b.at);
  if (!captures.length) throw new Error(`Aucune image pour ${scene}`);
  let i = 0;
  for (let temps = debut; temps < fin; temps += 1 / 30) {
    while (i + 1 < captures.length && captures[i + 1].at <= temps * 1000) i++;
    images.push(path.join(dossier, captures[i].file).replaceAll('\\', '/'));
  }
}

const liste = path.join(racine, 'montage-ffmpeg.txt');
fs.writeFileSync(liste, images.map(p => `file '${p}'\nduration 0.0333333333`).join('\n') +
  `\nfile '${images.at(-1)}'\n`);
const result = spawnSync(ffmpeg, [
  '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', liste,
  '-vf', 'fps=30,scale=1080:1920:flags=lanczos,format=yuv420p',
  '-r', '30', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
  '-movflags', '+faststart', sortie,
], { stdio: 'inherit', timeout: 300000 });
if (result.status !== 0) throw new Error(`Montage échoué (${result.status})`);
console.log(`${sortie} — ${(images.length / 30).toFixed(1)} s, ${images.length} images du jeu`);
