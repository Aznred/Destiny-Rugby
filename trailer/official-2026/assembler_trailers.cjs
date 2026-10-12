const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const dir = __dirname;
const trailerDir = path.resolve(dir, '..');
const fps = 30;
const width = 1080;
const height = 1920;

function execFfmpeg(args, desc) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => err += d.toString());
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${desc} a échoué (code ${code}): ${err}`));
    });
  });
}

const plans = [
  { id: '00_hook_fifa', img: 'scene_00_hook_fifa.png', d: 1.0, zoom: 1.05 },
  { id: '01_hook_fm', img: 'scene_01_hook_fm.png', d: 1.0, zoom: 1.04 },
  { id: '02_hook_rugby', img: 'scene_02_hook_rugby.png', d: 1.0, zoom: 1.08, flash: true },
  { id: '03_logo_match', img: 'scene_03_logo_match.png', d: 3.0, zoom: 1.04 },
  { id: '04_clubs', img: 'scene_04_clubs.png', d: 5.0, zoom: 1.06 },
  { id: '05_pack_reveal', img: 'scene_05_pack_reveal.png', d: 6.0, zoom: 1.05, flash: true },
  { id: '06_squad', img: 'scene_06_squad.png', d: 4.0, zoom: 1.04 },
  { id: '07_careers', img: 'scene_07_careers.png', d: 4.0, zoom: 1.05 },
  { id: '08_women', img: 'scene_08_women.png', d: 4.0, zoom: 1.05 },
  { id: '09_leagues', img: 'scene_09_leagues.png', d: 6.0, zoom: 1.04 },
  { id: '10_highlights', img: 'scene_10_highlights.png', d: 3.0, zoom: 1.07 },
  { id: '11_outro', img: 'scene_11_outro.png', d: 4.0, zoom: 1.03 }
];

async function rendrePlan(p, isEn, tempDir) {
  const sceneFolder = path.join(dir, isEn ? 'scenes-en' : 'scenes-fr');
  const imgPath = path.join(sceneFolder, p.img);
  const outPath = path.join(tempDir, `${p.id}.mp4`);

  const n = Math.round(p.d * fps);
  const zMax = p.zoom || 1.04;
  const zoomFilter = `zoompan=z='1+${(zMax - 1).toFixed(4)}*on/${n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=${fps},setsar=1`;
  const filters = [zoomFilter];

  if (p.flash) {
    filters.push('fade=t=in:st=0:d=0.14:color=white');
  }

  const args = [
    '-loop', '1',
    '-framerate', String(fps),
    '-i', imgPath,
    '-vf', filters.join(','),
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-frames:v', String(n),
    '-r', String(fps),
    outPath
  ];

  await execFfmpeg(args, `Rendu plan ${p.id}`);
  return outPath;
}

async function assemblerTrailerComplet(isEn = false) {
  const lang = isEn ? 'EN' : 'FR';
  console.log(`\n========================================`);
  console.log(`Assemblage du Trailer Officiel ${lang} (42s)...`);
  console.log(`========================================`);

  const tempDir = path.join(dir, `temp-${lang.toLowerCase()}`);
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const clipPaths = [];
  for (let i = 0; i < plans.length; i++) {
    const p = plans[i];
    console.log(`[${i + 1}/${plans.length}] Rendu plan ${p.id} (${p.d}s)...`);
    const clip = await rendrePlan(p, isEn, tempDir);
    clipPaths.push(clip);
  }

  const listFile = path.join(tempDir, 'concat_list.txt');
  fs.writeFileSync(listFile, clipPaths.map(f => `file '${f.replaceAll('\\', '/')}'`).join('\n'));

  const audioMix = path.join(dir, isEn ? 'mixage-en.wav' : 'mixage-fr.wav');
  const finalVideo = path.join(trailerDir, isEn ? 'destiny-rugby-trailer-officiel-en.mp4' : 'destiny-rugby-trailer-officiel-fr.mp4');

  console.log(`Multiplexage final et encodage AAC/H264...`);
  const concatArgs = [
    '-f', 'concat',
    '-safe', '0',
    '-i', listFile,
    '-i', audioMix,
    '-c:v', 'copy',
    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=8',
    '-c:a', 'aac',
    '-b:a', '256k',
    '-ar', '48000',
    '-t', '42.0',
    '-movflags', '+faststart',
    finalVideo
  ];

  await execFfmpeg(concatArgs, `Concaténation finale trailer ${lang}`);
  console.log(`>>> TRAILER ${lang} GÉNÉRÉ AVEC SUCCÈS : ${finalVideo}`);
  return finalVideo;
}

async function assemblerTrailerShort15s() {
  console.log(`\n========================================`);
  console.log(`Assemblage du Trailer Court 15s (TikTok / Reels)...`);
  console.log(`========================================`);

  const shortPlans = [
    { id: 'short_00_fifa', img: 'scene_00_hook_fifa.png', d: 1.0, zoom: 1.06 },
    { id: 'short_01_fm', img: 'scene_01_hook_fm.png', d: 1.0, zoom: 1.05 },
    { id: 'short_02_rugby', img: 'scene_02_hook_rugby.png', d: 1.0, zoom: 1.09, flash: true },
    { id: 'short_04_clubs', img: 'scene_04_clubs.png', d: 2.5, zoom: 1.06 },
    { id: 'short_05_pack', img: 'scene_05_pack_reveal.png', d: 4.0, zoom: 1.06, flash: true },
    { id: 'short_10_highlights', img: 'scene_10_highlights.png', d: 2.5, zoom: 1.08 },
    { id: 'short_11_outro', img: 'scene_11_outro.png', d: 3.0, zoom: 1.04 }
  ];

  const tempDir = path.join(dir, 'temp-short-15s');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const clipPaths = [];
  for (let i = 0; i < shortPlans.length; i++) {
    const p = shortPlans[i];
    const clip = await rendrePlan(p, false, tempDir);
    clipPaths.push(clip);
  }

  const listFile = path.join(tempDir, 'concat_short.txt');
  fs.writeFileSync(listFile, clipPaths.map(f => `file '${f.replaceAll('\\', '/')}'`).join('\n'));

  const finalVideo = path.join(trailerDir, 'destiny-rugby-trailer-short-15s.mp4');
  const audioMix = path.join(dir, 'mixage-fr.wav');

  const concatArgs = [
    '-f', 'concat',
    '-safe', '0',
    '-i', listFile,
    '-i', audioMix,
    '-c:v', 'copy',
    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=8',
    '-c:a', 'aac',
    '-b:a', '256k',
    '-ar', '48000',
    '-t', '15.0',
    '-movflags', '+faststart',
    finalVideo
  ];

  await execFfmpeg(concatArgs, 'Concaténation trailer short 15s');
  console.log(`>>> TRAILER COURT 15S GÉNÉRÉ AVEC SUCCÈS : ${finalVideo}`);
  return finalVideo;
}

async function main() {
  await assemblerTrailerComplet(false); // FR 42s
  await assemblerTrailerComplet(true);  // EN 42s
  await assemblerTrailerShort15s();     // Short 15s
  console.log('\n--- TOUTES LES VIDÉOS ONT ÉTÉ PRODUITES AVEC SUCCÈS ! ---');
}

main().catch((err) => {
  console.error('Erreur critique:', err);
  process.exitCode = 1;
});
