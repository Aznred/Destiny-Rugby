// Reconstruit une bande-annonce paysage et muette à partir de captures du jeu.
// Usage : node scripts/creerTrailerPresentation.cjs
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const trailer = path.join(root, 'trailer');
const assets = path.join(trailer, 'assets');
const work = path.join(trailer, 'work', 'render');
const ffmpeg = require('ffmpeg-static');
const width = 1920;
const height = 1080;
const gold = '#f6cd65';
const cream = '#fff9ec';
const muted = '#b7c9be';
fs.mkdirSync(work, { recursive: true });

const scene = [
  { id: '01-intro', seconds: 5, kind: 'art', image: 'public/images/wiki/carriere-joueur.png', eyebrow: 'LE RUGBY, TON HISTOIRE', title: ['DESTINY', 'RUGBY'], sub: 'Ta légende commence ici.' },
  { id: '02-voies', seconds: 5, kind: 'screen', image: 'trailer/assets/creation-jeu.png', eyebrow: '01 / CHOISIS TA VOIE', title: 'JOUEUR. ENTRAÎNEUR. EN LIGNE.' },
  { id: '03-carriere', seconds: 5, kind: 'art', image: 'public/images/wiki/carriere-joueur.png', eyebrow: 'CARRIÈRE JOUEUR', title: ['DU VESTIAIRE', 'À LA GLOIRE'], sub: 'Joue, progresse et écris ton parcours.' },
  { id: '04-match', seconds: 5, kind: 'phone', image: 'verification-match-mobile.png', art: 'public/images/wiki/carriere-joueur.png', eyebrow: 'SUR LE TERRAIN', title: ['CHAQUE ACTION', 'COMPTE'], sub: 'Prends les commandes pendant le match.', side: 'right' },
  { id: '05-entraineur', seconds: 5, kind: 'art', image: 'public/images/wiki/carriere-entraineur.png', eyebrow: 'CARRIÈRE ENTRAÎNEUR', title: ['PRENDS', 'LES DÉCISIONS'], sub: 'Compose ton XV. Mène ton club.' },
  { id: '06-xv', seconds: 5, kind: 'phone', image: 'verification-manager-mobile.png', art: 'public/images/wiki/carriere-entraineur.png', eyebrow: 'TACTIQUE ET EFFECTIF', title: ['TON XV.', 'TES CHOIX.'], sub: 'Sélectionne tes joueurs et construis ton équipe.', side: 'right' },
  { id: '07-clubs', seconds: 5, kind: 'screen', image: 'trailer/assets/championnats-jeu.png', eyebrow: 'CLUBS ET CHAMPIONNATS', title: 'TROUVE TA PLACE DANS LE RUGBY.' },
  { id: '08-en-ligne', seconds: 6, kind: 'screen', image: 'trailer/assets/en-ligne-jeu.png', eyebrow: 'CARRIÈRE EN LIGNE', title: 'UNE LIGUE. VOS CLUBS. VOTRE HISTOIRE.' },
  { id: '09-collection', seconds: 5, kind: 'screen', image: 'trailer/assets/collection-jeu.png', eyebrow: 'COLLECTION DE CARTES', title: 'CONSTRUIS TA COLLECTION.' },
  { id: '10-packs-a', seconds: 6, kind: 'full', image: 'trailer/assets/packs.png' },
  { id: '11-packs-b', seconds: 6, kind: 'full', image: 'trailer/assets/packs2.png' },
  { id: '12-final', seconds: 6, kind: 'art', image: 'public/images/wiki/carriere-joueur.png', eyebrow: 'JOUE. COLLECTIONNE. DIRIGE. AFFRONTE TES AMIS.', title: ['ÉCRIS TA', 'LÉGENDE.'], sub: 'DESTINY RUGBY' },
];

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
}

function textSvg({ eyebrow, title, sub, align = 'left', x = 100, y = 270, size = 116, color = cream }) {
  const lines = Array.isArray(title) ? title : [title];
  const anchor = align === 'center' ? 'middle' : 'start';
  const tspan = lines.map((line, i) => `<tspan x="${x}" dy="${i ? Math.round(size * 0.87) : 0}">${escapeXml(line)}</tspan>`).join('');
  const subtitleY = y + (lines.length - 1) * size * 0.87 + 87;
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="${x}" y="${y - Math.max(150, size + 35)}" fill="${gold}" font-family="Arial,sans-serif" font-size="28" font-weight="bold" letter-spacing="8" text-anchor="${anchor}">${escapeXml(eyebrow)}</text>
    <text x="${x}" y="${y}" fill="${color}" font-family="Impact,Arial Black,Arial,sans-serif" font-size="${size}" font-weight="900" text-anchor="${anchor}" letter-spacing="1">${tspan}</text>
    ${sub ? `<text x="${x}" y="${subtitleY}" fill="${muted}" font-family="Arial,sans-serif" font-size="37" text-anchor="${anchor}">${escapeXml(sub)}</text>` : ''}
    <rect x="${x}" y="${Math.min(1005, subtitleY + 50)}" width="132" height="5" rx="2" fill="${gold}"/>
  </svg>`);
}

function backgroundSvg() {
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="g" cx="48%" cy="35%" r="90%"><stop stop-color="#143c2b"/><stop offset="0.55" stop-color="#061e16"/><stop offset="1" stop-color="#020d0a"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g opacity="0.15" stroke="#d0a842">${Array.from({ length: 13 }, (_, i) => `<line x1="${i * 160}" x2="${i * 160}" y1="0" y2="1080"/>`).join('')}</g>
  </svg>`);
}

function artShade() {
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="s"><stop stop-color="#010a08" stop-opacity="0.96"/><stop offset="0.49" stop-color="#010a08" stop-opacity="0.72"/><stop offset="1" stop-color="#010a08" stop-opacity="0.14"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#s)"/>
  </svg>`);
}

async function renderSlide(item) {
  const file = path.join(work, `${item.id}.png`);
  const source = path.join(root, item.image);
  let composite = [];
  let base;
  if (item.kind === 'full') {
    base = sharp(source).resize(width, height, { fit: 'cover' });
  } else if (item.kind === 'art') {
    base = sharp(source).resize(width, height, { fit: 'cover' });
    composite = [
      { input: artShade(), top: 0, left: 0 },
      { input: textSvg({ ...item, x: 105, y: item.id === '12-final' ? 480 : 480, size: item.id === '01-intro' ? 154 : 116 }), top: 0, left: 0 },
    ];
  } else if (item.kind === 'screen') {
    base = sharp(backgroundSvg());
    const shot = await sharp(source).resize(1650, 928, { fit: 'cover' }).png().toBuffer();
    const frame = Buffer.from(`<svg width="1700" height="975" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="1696" height="970" rx="20" fill="#163728" stroke="#d0a842" stroke-width="3"/></svg>`);
    const heading = Buffer.from(`<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
      <text x="110" y="92" fill="${gold}" font-family="Arial,sans-serif" font-size="29" font-weight="bold" letter-spacing="7">${escapeXml(item.eyebrow)}</text>
      <text x="110" y="170" fill="${cream}" font-family="Impact,Arial Black,Arial,sans-serif" font-size="64">${escapeXml(item.title)}</text>
      <rect x="110" y="190" width="134" height="5" rx="2" fill="${gold}"/>
    </svg>`);
    composite = [{ input: frame, top: 226, left: 110 }, { input: shot, top: 248, left: 135 }, { input: heading, top: 0, left: 0 }];
  } else if (item.kind === 'phone') {
    base = sharp(path.join(root, item.art)).resize(width, height, { fit: 'cover' });
    const shade = artShade();
    const phone = await sharp(source).resize({ width: 420, height: 912, fit: 'contain', background: '#071611' }).png().toBuffer();
    const frame = Buffer.from(`<svg width="468" height="958" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="462" height="952" rx="37" fill="#04130f" stroke="#f6cd65" stroke-width="4"/></svg>`);
    composite = [
      { input: shade, top: 0, left: 0 },
      { input: frame, top: 61, left: 1334 },
      { input: phone, top: 83, left: 1358 },
      { input: textSvg({ ...item, x: 100, y: 468, size: 101 }), top: 0, left: 0 },
    ];
  }
  await base.composite(composite).png().toFile(file);
  return file;
}

function encodeSegment(item, slide) {
  const output = path.join(work, `${item.id}.mp4`);
  const frames = item.seconds * 30;
  const fade = item.id === '01-intro' ? ',fade=t=in:st=0:d=0.35' : item.id === '12-final' ? `,fade=t=out:st=${item.seconds - 0.5}:d=0.5` : '';
  const filter = `zoompan=z='min(zoom+0.00014,1.035)':d=${frames}:s=${width}x${height}:fps=30,format=yuv420p${fade}`;
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1', '-i', slide, '-vf', filter, '-frames:v', String(frames), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', '30', output], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Encodage impossible : ${item.id} (${result.status})`);
  return output;
}

async function main() {
  const segments = [];
  for (const item of scene) {
    console.log(`${item.id} (${item.seconds}s)`);
    const slide = await renderSlide(item);
    segments.push(encodeSegment(item, slide));
  }
  const list = path.join(work, 'segments.txt');
  fs.writeFileSync(list, segments.map((file) => `file '${file.replace(/'/g, "'\\''").replace(/\\/g, '/')}'`).join('\n') + '\n');
  const output = path.join(trailer, 'destiny-rugby-presentation-2026.mp4');
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', output], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Assemblage impossible (${result.status})`);
  console.log(`Bande-annonce créée : ${output} (${scene.reduce((n, item) => n + item.seconds, 0)}s)`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
