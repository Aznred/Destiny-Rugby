// Génère cinq propositions quotidiennes à partir de captures réelles du jeu.
// Usage : node scripts/genererPostsTikTok.cjs [AAAA-MM-JJ]
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');
const ffmpeg = require('ffmpeg-static');

const root = path.resolve(__dirname, '..');
const clips = path.join(root, 'trailer', 'work', 'tiktok-live');
const todayParis = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const date = process.argv[2] || todayParis();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) {
  throw new Error('Date attendue au format AAAA-MM-JJ');
}
const out = path.join(root, 'trailer', 'promo-quotidienne', date);
fs.mkdirSync(out, { recursive: true });

const posts = [
  {
    source: '09-en-ligne/00000.jpg',
    hooks: [['TU COMMENTES', 'COMME UN COACH ?'], ['TU CONNAIS', 'LE RUGBY ?'], ['TOUT LE MONDE', 'EST COACH ICI.'], ['TU PARLES TACTIQUE ?', 'PROUVE-LE.'], ['30 JOURS.', 'ZÉRO EXCUSE.'], ['TON CLUB', 'VA TENIR ?'], ['TU PARLES TROP ?', 'VIENS JOUER.']],
    punch: 'PROUVE-LE EN LIGUE.',
    description: 'Les commentaires sont faciles. Gérer un club pendant 30 jours, un peu moins. Tu relèves le défi ?',
    hashtags: '#DestinyRugby #Rugby #JeuDeRugby #LigueEnLigne #RugbyFrancais',
  },
  {
    source: '09-en-ligne/00138.jpg',
    hooks: [['TON XV EST SI FORT ?', 'ON VEUT VOIR ÇA.'], ['TU FERAIS MIEUX ?', 'MONTRE TON XV.'], ['LE MEILLEUR COACH ?', 'VIENS LE PROUVER.']],
    punch: 'COMPOSE TON XV.',
    description: 'Tu penses faire mieux que les autres managers ? Compose ton XV et viens jouer la ligue publique.',
    hashtags: '#DestinyRugby #RugbyManager #XVDeDepart #JeuDeSport #LiguePublique',
  },
  {
    source: '06-match/00395.jpg',
    hooks: [['LE MATCH EST FACILE', 'DEPUIS TON CANAPÉ.'], ['TU FERAIS MIEUX', 'SUR LE TERRAIN ?'], ['ARRÊTE DE CRITIQUER.', 'VIENS JOUER.']],
    punch: 'À TOI DE JOUER.',
    description: 'Sur le terrain, chaque choix compte. Crée ton club et rejoins les autres joueurs sur Destiny Rugby.',
    hashtags: '#DestinyRugby #RugbyGame #Rugby #GamingFR #JeuDeRugby',
  },
  {
    source: '09-en-ligne/00000.jpg',
    hooks: [['PREMIER : MONTÉE.', 'DERNIER : DESCENTE.'], ['LA DESCENTE', 'N’ATTEND PERSONNE.'], ['30 JOURS POUR', 'ÉVITER LA DESCENTE.']],
    punch: 'TA PLACE EST OÙ ?',
    description: 'Première place : montée. Dernière place : descente. Dans la ligue publique, ton classement parlera pour toi.',
    hashtags: '#DestinyRugby #LiguePublique #Rugby #MonteeDescente #JeuEnLigne',
  },
  {
    source: '09-en-ligne/00275.jpg',
    hooks: [['16 CLUBS.', 'TU FINIS COMBIEN ?'], ['DIVISION 1.', 'TU TIENS COMBIEN ?'], ['UNE DIVISION.', 'ZÉRO EXCUSE.']],
    punch: 'REJOINS LA LIGUE.',
    description: 'Une division démarre à 16 clubs et dure 30 jours. Crée le tien et viens te mesurer aux autres.',
    hashtags: '#DestinyRugby #LigueEnLigne #RugbyManager #RugbyFR #JeuVideo',
  },
];

const xml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const dayNumber = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86400000);

async function render(post, index) {
  const [line1, line2] = post.hooks[(dayNumber + index) % post.hooks.length];
  const source = path.join(clips, post.source);
  if (!fs.existsSync(source)) throw new Error(`Capture introuvable : ${source}`);
  const shot = await sharp(source)
    .resize(1000, 990, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.84, saturation: 1.08 })
    .png().toBuffer();
  const publicLeagueCard = post.source === '09-en-ligne/00000.jpg' ? `
    <rect x="57" y="471" width="966" height="235" rx="18" fill="#092b1d" stroke="#f7ca5c" stroke-width="2"/>
    <text x="90" y="561" fill="#f7ca5c" font-family="Arial,sans-serif" font-size="56" font-weight="900">LIGUE PUBLIQUE</text>
    <text x="90" y="638" fill="#f8f9ee" font-family="Arial,sans-serif" font-size="36" font-weight="700">TON CLUB · TA DIVISION · TON CLASSEMENT</text>` : '';
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <defs><linearGradient id="fade" x2="0" y2="1"><stop stop-color="#061710" stop-opacity="0"/><stop offset="1" stop-color="#061710" stop-opacity=".75"/></linearGradient></defs>
    <text x="58" y="105" fill="#f7ca5c" font-family="Arial,sans-serif" font-size="44" font-weight="900" letter-spacing="4">DESTINY RUGBY</text>
    <text x="58" y="240" fill="#f8f9ee" font-family="Arial,sans-serif" font-size="76" font-weight="900" letter-spacing="-3" textLength="958" lengthAdjust="spacingAndGlyphs">${xml(line1)}</text>
    <text x="58" y="340" fill="#f8f9ee" font-family="Arial,sans-serif" font-size="76" font-weight="900" letter-spacing="-3" textLength="958" lengthAdjust="spacingAndGlyphs">${xml(line2)}</text>
    <rect x="40" y="405" width="1000" height="990" rx="26" fill="none" stroke="#f7ca5c" stroke-width="5"/>
    ${publicLeagueCard}
    <rect x="40" y="1120" width="1000" height="275" rx="26" fill="url(#fade)"/>
    <text x="65" y="1500" fill="#f7ca5c" font-family="Arial,sans-serif" font-size="78" font-weight="900" textLength="950" lengthAdjust="spacingAndGlyphs">${xml(post.punch)}</text>
    <text x="58" y="1628" fill="#f8f9ee" font-family="Arial,sans-serif" font-size="47" font-weight="700">LIGUE PUBLIQUE · 30 JOURS</text>
    <rect x="48" y="1685" width="984" height="140" rx="22" fill="#f7ca5c"/>
    <text x="540" y="1773" text-anchor="middle" fill="#071b11" font-family="Arial,sans-serif" font-size="55" font-weight="900" textLength="895" lengthAdjust="spacingAndGlyphs">REJOINS DESTINY RUGBY</text>
  </svg>`;
  const file = path.join(out, `${String(index + 1).padStart(2, '0')}-post.png`);
  await sharp({ create: { width: 1080, height: 1920, channels: 4, background: '#061710' } })
    .composite([{ input: shot, left: 40, top: 405 }, { input: Buffer.from(overlay), left: 0, top: 0 }])
    .png().toFile(file);
  const video = file.replace(/\.png$/, '.mp4');
  const conversion = spawnSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-framerate', '30',
    '-i', file, '-t', '7', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', video,
  ], { encoding: 'utf8' });
  if (conversion.status !== 0) throw new Error(`Conversion vidéo échouée : ${conversion.stderr}`);
  return {
    ordre: index + 1,
    heureParis: ['09:00', '12:00', '15:00', '18:00', '21:00'][index],
    image: path.basename(file),
    video: path.basename(video),
    accroche: `${line1} ${line2}`,
    description: `${post.description} Rejoins la ligue publique sur destiny-rugby.fr (lien en bio). ${post.hashtags}`,
    musique: 'Choisir au hasard un titre vérifié dans les Sons libres de droits de TikTok Studio.',
    statut: 'brouillon_local',
  };
}

Promise.all(posts.map(render)).then(result => {
  fs.writeFileSync(path.join(out, 'planning.json'), JSON.stringify({ date, fuseau: 'Europe/Paris', compte: 'destiny.rugby2', posts: result }, null, 2) + '\n');
  console.log(`5 brouillons créés : ${out}`);
}).catch(error => { console.error(error); process.exitCode = 1; });
