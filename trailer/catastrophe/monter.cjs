// MONTER — l'image filmée + le mixage → la vidéo livrée, avec ses fichiers d'accompagnement.
//
//   node trailer/catastrophe/monter.cjs fr    # → livrables/DESTINY_RUGBY_CATASTROPHE_FR.mp4 (+ voix .wav, .srt, bande-son)
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const langue = process.argv[2] === 'en' ? 'en' : 'fr';
const LANGUE = langue.toUpperCase();
const { ici, TEXTES } = require('./projet.cjs');
const C = JSON.parse(fs.readFileSync(ici(`chronologie-${langue}.json`), 'utf8'));
fs.mkdirSync(ici('livrables'), { recursive: true });

const sortie = ici('livrables', `${TEXTES.fichier}_${LANGUE}.mp4`);
// Le niveau : le mixage est mesuré, puis ramené à −14 LUFS (la cible des plateformes) avant le limiteur.
const niveau = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', ici('son', `mixage-${langue}.wav`), '-af', 'ebur128', '-f', 'null', '-'], { windowsHide: true }).stderr.toString();
const mesures = [...niveau.matchAll(/I:\s+(-?[\d.]+) LUFS/g)];
const correction = mesures.length ? Math.max(-6, Math.min(3, -14 - Number(mesures.at(-1)[1]))) : 0;
const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', ici('rendus', `image-${langue}.mp4`), '-i', ici('son', `mixage-${langue}.wav`),
  '-map', '0:v:0', '-map', '1:a:0',
  // L'image filmée (rendus/) est un original presque sans perte ; la vidéo livrée est encodée pour être envoyée (≈ 14 Mbit/s).
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-maxrate', '14M', '-bufsize', '28M', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-af', `volume=${correction.toFixed(2)}dB,alimiter=limit=0.80:attack=3:release=60:level=disabled`, '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
  '-t', C.duree.toFixed(3), '-movflags', '+faststart', sortie], { windowsHide: true });
if (r.status !== 0) { console.error(String(r.stderr)); process.exit(1); }

// Les fichiers d'accompagnement : la voix seule (WAV), la bande-son sans la voix, le mixage.
fs.copyFileSync(ici('voix', `destiny_rugby_voice_${langue}.wav`), ici('livrables', `destiny_rugby_voice_${langue}.wav`));
fs.copyFileSync(ici('son', `musique-effets-${langue}.wav`), ici('livrables', `bande-son-sans-voix-${langue}.wav`));

const sonde = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,sample_rate,channels:format=duration,size', '-of', 'json', sortie], { windowsHide: true });
const infos = JSON.parse(sonde.stdout.toString());
const video = infos.streams.find(s => s.width), audio = infos.streams.find(s => s.sample_rate);
const mesure = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', sortie, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { windowsHide: true }).stderr.toString();
const I = /I:\s+(-?[\d.]+) LUFS/g, pics = [...mesure.matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)];
let integre = null; for (const m of mesure.matchAll(I)) integre = m[1];
console.log(`${path.basename(sortie)} : ${video.width}×${video.height}, ${video.r_frame_rate} i/s, ${Number(infos.format.duration).toFixed(2)} s, ${(infos.format.size / 1e6).toFixed(1)} Mo — son ${audio.codec_name} ${audio.sample_rate} Hz, ${integre} LUFS, crête ${pics.length ? pics.at(-1)[1] : '?'} dBFS`);
