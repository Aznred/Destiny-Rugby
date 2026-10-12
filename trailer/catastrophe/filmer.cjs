// FILMER LA PUB — image par image, en 1080 × 1920. La cadence de la machine ne compte pas : la page dessine
// l'instant qu'on lui demande (avec son flou de mouvement), on le photographie, ffmpeg l'encode.
//
//   node trailer/catastrophe/filmer.cjs fr                 # → rendus/image-fr.mp4 (sans le son)
//   node trailer/catastrophe/filmer.cjs en --flou 8        # sous-images par image (défaut 6)
//   node trailer/catastrophe/filmer.cjs fr --demi --flou 2 # brouillon 540 × 960, pour vérifier le mouvement
//   node trailer/catastrophe/filmer.cjs fr --de 17 --a 23  # un extrait
// Le jeu doit tourner (DESTINY_URL, par défaut http://localhost:5199 — la configuration « destiny-rugby-5199 » de .claude/launch.json).
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { ouvrir, racine } = require('./cdp.cjs');
const { NOM, ici } = require('./projet.cjs');

const BASE = process.env.DESTINY_URL || 'http://localhost:5199';
const option = (nom, defaut) => { const i = process.argv.indexOf('--' + nom); return i > 0 ? process.argv[i + 1] : defaut; };

(async () => {
  const langue = process.argv[2] === 'en' ? 'en' : 'fr';
  const demi = process.argv.includes('--demi');
  const flou = Number(option('flou', demi ? 2 : 6));
  const dossier = ici('rendus');
  fs.mkdirSync(dossier, { recursive: true });
  const sortie = path.join(dossier, option('sortie', `image-${langue}${demi ? '-brouillon' : ''}.mp4`));
  const page = await ouvrir({ largeur: 540, hauteur: 960, echelle: demi ? 1 : 2, port: Number(option('port', 9265)), profil: path.join(racine, 'node_modules', `.capture-${NOM}-film-${langue}`) });
  let ffmpeg;
  try {
    await page.send('Page.navigate', { url: `${BASE}/trailer/${NOM}/pub.html?langue=${langue}&fige=1&flou=${flou}` });
    try { await page.attendre('Boolean(window.__pub && window.__pub.pret)', 400, 500); }
    catch (e) { console.log(page.journal.join('\n')); throw e; }
    const infos = await page.evaluer('({ carte: __pub.carte, taille: __pub.taille, duree: __pub.duree, ips: __pub.ips })');
    const de = Math.round(Number(option('de', 0)) * infos.ips), a = Math.round(Math.min(infos.duree, Number(option('a', infos.duree))) * infos.ips);
    console.log(`${langue} : ${infos.taille.join('×')}, ${a - de} images, flou ${flou} — ${infos.carte}`);
    ffmpeg = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(infos.ips), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', demi ? '20' : '14', '-pix_fmt', 'yuv420p', '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', sortie],
      { windowsHide: true, stdio: ['pipe', 'inherit', 'inherit'] });
    const fini = new Promise((resolve, reject) => ffmpeg.on('close', code => code === 0 ? resolve() : reject(new Error('ffmpeg ' + code))));
    const depart = Date.now();
    for (let i = de; i < a; i++) {
      // Une image d'écran pour que la page présente ce qu'elle vient de dessiner — sans l'attendre plus de 50 ms si l'écran dort.
      await page.evaluer(`__pub.dessiner(${(i + 0.5) / infos.ips}), new Promise(r => { requestAnimationFrame(r); setTimeout(r, 50); })`);
      const image = await page.photo('jpeg', 97);
      if (!ffmpeg.stdin.write(image)) await new Promise(r => ffmpeg.stdin.once('drain', r));
      if ((i - de) % 60 === 59) console.log(`  ${i - de + 1}/${a - de} images — ${((Date.now() - depart) / (i - de + 1)).toFixed(0)} ms par image`);
    }
    ffmpeg.stdin.end();
    await fini;
    if (page.journal.length) console.log([...new Set(page.journal)].slice(0, 10).join('\n'));
    console.log(`→ ${sortie} (${((Date.now() - depart) / 1000).toFixed(0)} s)`);
  } finally { page.fermer(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
