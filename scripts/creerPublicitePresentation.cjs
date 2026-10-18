// Publicité verticale : vrais composants du jeu et match 3D capturé image par image.
// Usage : node scripts/creerPublicitePresentation.cjs (aperçu local sur le port 5188).
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');
const ffmpeg = require('ffmpeg-static');
const { ouvrirNavigateur, attendre } = require('./outilsNavigateur.cjs');
const racine = path.resolve(__dirname, '..');
const sortie = path.join(racine, 'trailer/presentation-2026-10-18');
const travail = fs.mkdtempSync(path.join(os.tmpdir(), 'destiny-publicite-'));
const base = process.env.DESTINY_URL || 'http://127.0.0.1:5188';
fs.mkdirSync(sortie, { recursive: true });
const xml = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function executer(args) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8', windowsHide: true, timeout: 300000 });
  if (r.status !== 0) throw new Error(r.stderr || 'Montage interrompu.');
}
async function captures() {
  const p = await ouvrirNavigateur({ largeur: 720, hauteur: 1280, port: 9264 });
  try {
    console.log('Capture du vrai match 3D…');
    await p.ouvrir(base + '/rn26/index.html?banc=1&stade=grand');
    await p.jusqua('Boolean(window.rn26?.match && window.rn26?.scene3D)');
    await p.evaluer(`(()=>{
      const style=document.createElement('style');style.textContent='header,aside,#status,#saved,body>div:not(#scene){display:none!important}html,body{margin:0;overflow:hidden;background:#07130f}#scene{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important}';document.head.appendChild(style);
      const camera=document.querySelector('#camera');if(camera){camera.value='close';camera.dispatchEvent(new Event('change',{bubbles:true}));}
      rn26.scene3D.television={ralentis:false};rn26.scene3D.recadrer();
      for(let i=0;i<1200;i++){rn26.match.step(1/30);rn26.scene3D.image(1/30,{vitesse:1});}
      return true;
    })()`);
    for (let i = 0; i < 180; i++) {
      await p.evaluer('rn26.match.step(1/30);rn26.scene3D.image(1/30,{vitesse:1});true');
      await p.capture(path.join(travail, `match-${String(i).padStart(4, '0')}.png`));
      if (i % 60 === 0) console.log(`Match : ${i}/180 images`);
    }
    // Les aperçus emploient les vrais écrans sans écrire une partie dans le navigateur du joueur.
    for (const [nom, vue] of [['joueur', 'joueur'], ['manager', 'manager'], ['collection', 'collection']]) {
      await p.dimensions(540, 960);
      await p.ouvrir(base + '/scripts/apercuWiki.html?vue=' + vue);
      await p.jusqua(`document.querySelector('main')?.innerText.length>200`);
      await p.evaluer(`(async()=>{const m=await import('/src/lib/tutoriel/memoire.ts');m.desactiverLesTutoriels(true);await Promise.race([Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode().catch(()=>{});})),new Promise(r=>setTimeout(r,3000))]);return true;})()`);
      await attendre(1000);
      await p.capture(path.join(travail, nom + '.png'));
      console.log(`Capture ${nom} prête.`);
    }
  } finally { await p.fermer(); }
}

const scenes = [
  { nom: 'accroche', duree: 3, match: 0, lignes: ['TU AURAIS FAIT', 'LA PASSE ?'], sous: 'Sur le terrain, c’est toi qui décides.', numero: 'LE RUGBY. TES CHOIX.' },
  { nom: 'terrain', duree: 3, match: 90, lignes: ['ALORS PRENDS', 'LE BALLON.'], sous: 'Vis les matchs en 3D.', numero: 'PRENDS LES COMMANDES' },
  { nom: 'joueur', duree: 5, image: 'joueur', lignes: ['CRÉE TA', 'CARRIÈRE.'], sous: 'Progresse. Négocie. Gagne ta place.', numero: '01 / CARRIÈRE JOUEUR' },
  { nom: 'manager', duree: 5, image: 'manager', lignes: ['LE COACH,', 'C’EST TOI.'], sous: 'Compose ton XV. Fais grandir ton club.', numero: '02 / CARRIÈRE ENTRAÎNEUR' },
  { nom: 'ligue', duree: 5, image: 'ligue', lignes: ['TES POTES.', 'TES RIVAUX.'], sous: 'Crée ta ligue privée. Défie tes amis.', numero: '03 / CARRIÈRE EN LIGNE' },
  { nom: 'conclusion', duree: 7, image: 'collection', lignes: ['TON HISTOIRE', 'COMMENCE ICI.'], sous: 'Joue gratuitement dans ton navigateur.', numero: 'DESTINY RUGBY' },
];
async function calque(scene) {
  const fin = scene.nom === 'conclusion';
  const contenu = fin ? `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <defs><radialGradient id="fond"><stop stop-color="#193c2b"/><stop offset="1" stop-color="#040d09"/></radialGradient></defs>
    <rect width="1080" height="1920" fill="url(#fond)"/>
    <path d="M-80 280L1160 40M-80 320L1160 80M-80 360L1160 120" stroke="#e7b957" stroke-opacity=".12" stroke-width="2"/>
    <path d="M80 310H170" stroke="#e7b957" stroke-width="8"/>
    <text x="80" y="395" fill="#e7b957" font-family="Arial" font-size="29" letter-spacing="5" font-weight="700">PRENDS TA PLACE.</text>
    <text x="70" y="665" fill="#fff9eb" font-family="Impact,Arial" font-size="208">DESTINY</text>
    <text x="70" y="885" fill="#e7b957" font-family="Impact,Arial" font-size="238">RUGBY</text>
    <path d="M80 960H920" stroke="#e7b957" stroke-opacity=".55"/>
    <text x="82" y="1055" fill="#ecede3" font-family="Bahnschrift,Arial" font-size="39">JOUEUR. COACH. RIVAL.</text>
    <text x="82" y="1120" fill="#b9cbbf" font-family="Arial" font-size="31">Ton histoire commence ici.</text>
    <rect x="80" y="1260" width="840" height="130" rx="5" fill="#e7b957"/>
    <text x="500" y="1345" text-anchor="middle" fill="#07140d" font-family="Impact,Arial" font-size="57">JOUE GRATUITEMENT</text>
    <text x="80" y="1520" fill="#fff9eb" font-family="Bahnschrift,Arial" font-size="69" font-weight="700">destiny-rugby.fr</text>
    <text x="82" y="1600" fill="#b9cbbf" font-family="Arial" font-size="25" letter-spacing="2">MOBILE · ORDINATEUR · NAVIGATEUR</text>
    <text x="82" y="1755" fill="#e7b957" font-family="Arial" font-size="28" letter-spacing="4">LIEN EN BIO</text>
  </svg>` : `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <defs><linearGradient id="haut" x2="0" y2="1"><stop stop-color="#040d09"/><stop offset="1" stop-color="#040d09" stop-opacity="0"/></linearGradient><linearGradient id="bas" x2="0" y2="1"><stop stop-color="#040d09" stop-opacity="0"/><stop offset=".45" stop-color="#040d09" stop-opacity=".97"/><stop offset="1" stop-color="#040d09"/></linearGradient></defs>
    <rect width="1080" height="380" fill="url(#haut)"/>
    <rect y="1140" width="1080" height="780" fill="url(#bas)"/>
    <path d="M80 140H160" stroke="#e7b957" stroke-width="7"/>
    <text x="80" y="118" fill="#f7f1df" font-family="Bahnschrift,Arial" font-size="37" font-weight="700" letter-spacing="5">DESTINY RUGBY</text>
    <text x="80" y="214" fill="#e7b957" font-family="Arial" font-size="24" font-weight="700" letter-spacing="4">${xml(scene.numero)}</text>
    ${scene.lignes.map((l, i) => `<text x="80" y="${1370 + i * 116}" fill="${i ? '#e7b957' : '#fff9eb'}" font-family="Impact,Arial" font-size="${l.length > 13 ? 99 : 114}" letter-spacing="1">${xml(l)}</text>`).join('')}
    <text x="82" y="1572" fill="#ecede3" font-family="Arial" font-size="31">${xml(scene.sous)}</text>
    <path d="M80 1620H920" stroke="#e7b957" stroke-opacity=".5"/>
    <text x="80" y="1697" fill="#e7b957" font-family="Bahnschrift,Arial" font-size="${fin ? 62 : 43}" font-weight="700">destiny-rugby.fr</text>
    <text x="82" y="1765" fill="#d1dacb" font-family="Arial" font-size="27" letter-spacing="2">${fin ? 'À TOI DE JOUER · LIEN EN BIO' : 'GRATUIT · SUR MOBILE ET ORDINATEUR'}</text>
  </svg>`;
  const fichier = path.join(travail, scene.nom + '-calque.png');
  await sharp(Buffer.from(contenu)).png().toFile(fichier); return fichier;
}
function percussion() {
  // Pulsation originale, sans musique tierce : grosse caisse, claquement et basse.
  const frequence = 48000, duree = 28, n = frequence * duree;
  const entete = Buffer.alloc(44); entete.write('RIFF'); entete.writeUInt32LE(36 + n * 2, 4); entete.write('WAVEfmt ', 8);
  entete.writeUInt32LE(16, 16); entete.writeUInt16LE(1, 20); entete.writeUInt16LE(1, 22); entete.writeUInt32LE(frequence, 24);
  entete.writeUInt32LE(frequence * 2, 28); entete.writeUInt16LE(2, 32); entete.writeUInt16LE(16, 34); entete.write('data', 36); entete.writeUInt32LE(n * 2, 40);
  const donnees = Buffer.alloc(n * 2); let graine = 18;
  for (let i = 0; i < n; i++) {
    const t = i / frequence, temps = t % .5, contre = (t + .25) % 1;
    graine = (Math.imul(graine, 1664525) + 1013904223) >>> 0;
    const bruit = graine / 4294967296 * 2 - 1;
    const grosse = Math.sin(2 * Math.PI * (48 * temps + 5 * (1 - Math.exp(-temps * 35)))) * Math.exp(-temps * 18) * .55;
    const caisse = bruit * Math.exp(-contre * 38) * .18;
    const basse = Math.sin(2 * Math.PI * (Math.floor(t / 2) % 2 ? 65.406 : 55) * t) * .075;
    const fondu = Math.min(1, t / .04, (duree - t) / 1.3);
    donnees.writeInt16LE(Math.round(Math.max(-1, Math.min(1, (grosse + caisse + basse) * fondu)) * 26000), i * 2);
  }
  const fichier = path.join(travail, 'pulsation.wav'); fs.writeFileSync(fichier, Buffer.concat([entete, donnees])); return fichier;
}
async function monter() {
  const reutiliser = process.argv.includes('--finaliser');
  if (!reutiliser) {
    await captures();
    await sharp(path.join(racine, 'public/images/wiki/ligue-en-ligne.webp')).png().toFile(path.join(travail, 'ligue.png'));
  }
  const morceaux = [];
  if (reutiliser) {
    const prefixe = path.join(travail, 'debut.mp4');
    executer(['-i', path.join(sortie, 'Destiny-Rugby-presentation-28s.mp4'), '-t', '21', '-an', '-c:v', 'copy', prefixe]);
    morceaux.push(prefixe);
  }
  for (const scene of scenes.filter(s => !reutiliser || s.nom === 'conclusion')) {
    const masque = await calque(scene), fichier = path.join(travail, scene.nom + '.mp4');
    const entree = scene.nom === 'conclusion' ? ['-f', 'lavfi', '-i', 'color=c=0x07140d:s=1080x1920:r=30'] : scene.match !== undefined
      ? ['-framerate', '30', '-start_number', String(scene.match), '-i', path.join(travail, 'match-%04d.png')]
      : ['-loop', '1', '-i', path.join(travail, scene.image + '.png')];
    const filtre = scene.match !== undefined
      ? '[0:v]scale=1080:1920:flags=lanczos[v];[v][1:v]overlay=0:0,format=yuv420p[o]'
      : `[0:v]scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,zoompan=z='1.02+on*0.00012':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1080x1920:fps=30[v];[v][1:v]overlay=0:0,format=yuv420p[o]`;
    executer([...entree, '-i', masque, '-filter_complex', filtre, '-map', '[o]', '-t', String(scene.duree), '-r', '30', '-an', '-c:v', 'libx264', '-threads', '4', '-preset', 'veryfast', '-crf', '20', fichier]);
    morceaux.push(fichier); console.log(`Montage ${scene.nom} prêt.`);
  }
  const liste = path.join(travail, 'montage.txt');
  fs.writeFileSync(liste, morceaux.map(p => `file '${p.replaceAll('\\', '/')}'`).join('\n'));
  const muet = path.join(travail, 'montage.mp4');
  executer(['-f', 'concat', '-safe', '0', '-i', liste, '-c', 'copy', muet]);
  const video = path.join(sortie, 'Destiny-Rugby-presentation-28s.mp4');
  executer(['-i', muet, '-i', percussion(), '-stream_loop', '-1', '-i', path.join(racine, 'public/rn26/sons/foule_pleine.ogg'),
    '-i', path.join(racine, 'public/rn26/sons/sifflet_engagement.ogg'),
    '-filter_complex', '[1:a]volume=0.8[a];[2:a]volume=0.24,afade=t=in:d=0.3,afade=t=out:st=26:d=2[b];[3:a]volume=0.3,adelay=150|150[c];[a][b][c]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.9[o]',
    '-map', '0:v', '-map', '[o]', '-t', '28', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', video]);
  executer(['-i', video, '-f', 'null', '-']);
  executer(['-ss', '1.5', '-i', video, '-frames:v', '1', path.join(sortie, 'apercu.jpg')]);
  // Planche de contrôle conservée avec la vidéo pour vérifier chaque séquence.
  executer(['-i', video, '-vf', 'fps=1/4,scale=270:480,tile=4x2', '-frames:v', '1', path.join(sortie, 'plans.jpg')]);
  const legende = 'Tu aurais fait la passe ? Prouve-le. Crée ton joueur, prends le banc ou défie tes potes dans une ligue privée. Destiny Rugby : gratuit, sur mobile et ordinateur, directement dans ton navigateur. Joue sur destiny-rugby.fr — lien en bio. #DestinyRugby #Rugby #JeuDeRugby #GamingFR';
  fs.writeFileSync(path.join(sortie, 'publication.md'), `# Destiny Rugby — présentation\n\nVidéo verticale 1080 × 1920, 30 images/s, 28 secondes. Son : pulsation originale et ambiance du jeu. Textes intégrés pour une lecture sans son.\n\n## Légende TikTok / Reels\n\n${legende}\n\n## Découpage\n\n${scenes.map(s => `- ${s.duree} s : ${s.lignes.join(' ')} — ${s.sous}`).join('\n')}\n\nCaptures du vrai jeu ; la ligue utilise la capture réelle du wiki. Aucune publication automatique. Relancer le script depuis le projet avec le serveur local actif pour régénérer le montage.\n`);
  console.log(`Vidéo vérifiée : ${video} (${(fs.statSync(video).size / 1e6).toFixed(1)} Mo).`);
}
monter().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => {
  const temporaire = fs.realpathSync(os.tmpdir()); const cible = path.resolve(travail);
  if (cible.startsWith(temporaire + path.sep) && path.basename(cible).startsWith('destiny-publicite-')) fs.rmSync(cible, { recursive: true, force: true });
});
