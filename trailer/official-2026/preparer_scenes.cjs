const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '../../..');
const dirFR = path.join(__dirname, 'scenes-fr');
const dirEN = path.join(__dirname, 'scenes-en');
if (!fs.existsSync(dirFR)) fs.mkdirSync(dirFR, { recursive: true });
if (!fs.existsSync(dirEN)) fs.mkdirSync(dirEN, { recursive: true });

const W = 1080;
const H = 1920;

function esc(s) {
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

function headerPill() {
  return `
    <g transform="translate(60, 65)">
      <rect width="400" height="64" rx="32" fill="#04140df0" stroke="#f4cf6a" stroke-width="2.5"/>
      <circle cx="36" cy="32" r="16" fill="#f4cf6a"/>
      <path d="M26 32h20m-15-5v10m5-10v10m5-10v10" stroke="#0a2518" stroke-width="2"/>
      <text x="68" y="42" font-family="Arial" font-weight="900" font-size="22" letter-spacing="3" fill="#ffffff">DESTINY RUGBY</text>
      <circle cx="368" cy="32" r="6" fill="#22c55e"/>
    </g>
  `;
}

function footerPill(isEn = false) {
  return `
    <g transform="translate(70, 1750)">
      <rect width="940" height="74" rx="37" fill="#04140de0" stroke="#d4af3788" stroke-width="2"/>
      <text x="50" y="48" font-family="Arial" font-weight="900" font-size="34" fill="#ffffff">destiny-rugby.fr</text>
      <rect x="680" y="10" width="230" height="54" rx="27" fill="#f4cf6a"/>
      <text x="795" y="46" font-family="Arial" font-weight="900" font-size="24" fill="#04120a" text-anchor="middle">${isEn ? 'FREE TO PLAY' : '100% GRATUIT'}</text>
    </g>
  `;
}

function titleBanner(titleLines, subText = '', color = '#ffffff', accent = '#f4cf6a') {
  const lineCount = titleLines.length;
  const startY = 250;
  const fontSize = lineCount > 1 ? 92 : 108;
  const lineHeight = fontSize * 1.12;

  let linesSvg = titleLines.map((line, idx) => {
    const y = startY + idx * lineHeight;
    return `
      <text x="540" y="${y}" font-family="Impact" font-size="${fontSize}" fill="${color}" stroke="#020805" stroke-width="8" paint-order="stroke" text-anchor="middle" letter-spacing="2">
        ${esc(line)}
      </text>
    `;
  }).join('');

  let subSvg = '';
  if (subText) {
    const subY = startY + lineCount * lineHeight + 15;
    subSvg = `
      <rect x="${540 - 380}" y="${subY - 38}" width="760" height="52" rx="26" fill="#0a2e1ee8" stroke="${accent}" stroke-width="2"/>
      <text x="540" y="${subY}" font-family="Arial" font-weight="800" font-size="24" fill="${accent}" text-anchor="middle" letter-spacing="3">
        ${esc(subText)}
      </text>
    `;
  }

  return `
    <defs>
      <linearGradient id="topShadow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#020805" stop-opacity="0.95"/>
        <stop offset="65%" stop-color="#020805" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#020805" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="520" fill="url(#topShadow)"/>
    ${linesSvg}
    ${subSvg}
  `;
}

async function bgDarkPattern() {
  const svgPattern = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#0f3d27"/>
          <stop offset="60%" stop-color="#04160e"/>
          <stop offset="100%" stop-color="#010604"/>
        </radialGradient>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#235c3c" stroke-width="1" opacity="0.15"/>
        </pattern>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#grad)"/>
      <rect width="${W}" height="${H}" fill="url(#grid)"/>
    </svg>
  `;
  return Buffer.from(svgPattern);
}

// ── SCENE 0: HOOK FIFA ────────────────────────────────────────────────────────
async function scene0(isEn = false) {
  const bg = await bgDarkPattern();
  const pack = await sharp('public/images/packs-roulette/top14.webp')
    .resize(520, 690, { fit: 'contain' })
    .png()
    .toBuffer();

  const title = isEn ? ['FIFA PACKS?'] : ['FIFA ?'];
  const sub = isEn ? 'OPEN CARDS & BUILD YOUR SQUAD' : 'PACKS ET CARTES DE JOUEURS';

  const overlay = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${headerPill()}
      ${titleBanner(title, sub, '#ffffff', '#ffd700')}
      ${footerPill(isEn)}
    </svg>
  `;

  return sharp(bg)
    .composite([
      { input: pack, top: 620, left: (W - 520) / 2 },
      { input: Buffer.from(overlay), top: 0, left: 0 }
    ])
    .png()
    .toBuffer();
}

// ── SCENE 1: HOOK FOOTBALL MANAGER ───────────────────────────────────────────
async function scene1(isEn = false) {
  const bg = await bgDarkPattern();
  const tactics = await sharp('verification-manager-mobile.png')
    .resize(720, 1558, { fit: 'contain' })
    .png()
    .toBuffer();

  const title = isEn ? ['FOOTBALL MANAGER?'] : ['FOOTBALL MANAGER ?'];
  const sub = isEn ? 'TACTICS · CHEMISTRY · MANAGEMENT' : 'COMPOSITION · TACTIQUES · GESTION';

  const overlay = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${headerPill()}
      ${titleBanner(title, sub, '#ffffff', '#ffd700')}
      ${footerPill(isEn)}
    </svg>
  `;

  return sharp(bg)
    .composite([
      { input: tactics, top: 220, left: (W - 720) / 2 },
      { input: Buffer.from(overlay), top: 0, left: 0 }
    ])
    .png()
    .toBuffer();
}

// ── SCENE 2: HOOK RUGBY (SMASH CUT) ─────────────────────────────────────────
async function scene2(isEn = false) {
  const bg = await bgDarkPattern();
  const matchTackle = await sharp('verification-c30-plaquage-a-deux.jpg')
    .resize(W, 1100, { fit: 'cover' })
    .png()
    .toBuffer();

  const title = isEn ? ['BUT FOR RUGBY!'] : ['MAIS EN RUGBY !'];
  const sub = isEn ? '3D MATCHES · TRIES · REAL TACKLES' : 'MATCHS 3D · ESSAIS · PLAQUAGES';

  const overlay = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${headerPill()}
      ${titleBanner(title, sub, '#ffe066', '#ffffff')}
      ${footerPill(isEn)}
    </svg>
  `;

  return sharp(bg)
    .composite([
      { input: matchTackle, top: 480, left: 0 },
      { input: Buffer.from(overlay), top: 0, left: 0 }
    ])
    .png()
    .toBuffer();
}

// ── SCENE 3: DESTINY RUGBY LOGO & 3D MATCH ──────────────────────────────────
async function scene3(isEn = false) {
  const bg = await bgDarkPattern();
  const match3D = await sharp('verification-match-mobile.png')
    .resize(720, 1558, { fit: 'contain' })
    .png()
    .toBuffer();

  const title = ['DESTINY RUGBY'];
  const sub = isEn ? 'THE ULTIMATE RUGBY EXPERIENCE' : 'LE JEU DE RUGBY ULTIME';

  const overlay = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${headerPill()}
      ${titleBanner(title, sub, '#f4cf6a', '#ffffff')}
      ${footerPill(isEn)}
    </svg>
  `;

  return sharp(bg)
    .composite([
      { input: match3D, top: 220, left: (W - 720) / 2 },
      { input: Buffer.from(overlay), top: 0, left: 0 }
    ])
    .png()
    .toBuffer();
}

// ── SCENE 4: CLUBS SHOWCASE ──────────────────────────────────────────────────
async function scene4(isEn = false) {
  const bg = await bgDarkPattern();

  const logoFilesFR = [
    { file: 'public/logos/toulouse.png', name: 'STADE TOULOUSAIN', league: 'TOP 14' },
    { file: 'public/logos/bordeaux.png', name: 'BORDEAUX-BÈGLES', league: 'TOP 14' },
    { file: 'public/logos/la_rochelle.png', name: 'STADE ROCHELAIS', league: 'TOP 14' },
    { file: 'public/logos/toulon.png', name: 'RC TOULON', league: 'TOP 14' }
  ];

  const logoFilesEN = [
    { file: 'public/logos/leinster.png', name: 'LEINSTER RUGBY', league: 'URC' },
    { file: 'public/logos/saracens.png', name: 'SARACENS', league: 'PREMIERSHIP' },
    { file: 'public/logos/munster.png', name: 'MUNSTER RUGBY', league: 'URC' },
    { file: 'public/logos/crusaders.png', name: 'CRUSADERS', league: 'SUPER RUGBY' }
  ];

  const clubs = isEn ? logoFilesEN : logoFilesFR;
  const compos = [];

  for (let i = 0; i < clubs.length; i++) {
    const c = clubs[i];
    const logoBuf = await sharp(c.file).resize(110, 110, { fit: 'contain' }).png().toBuffer();
    const yCard = 500 + i * 230;
    compos.push({ input: logoBuf, top: yCard + 35, left: 140 });
  }

  const title = isEn ? ['ICONIC RUGBY CLUBS'] : ['TES CLUBS PRÉFÉRÉS'];
  const sub = isEn ? 'LEINSTER · SARACENS · MUNSTER · TOULOUSE' : '655+ CLUBS · TOP 14 · PRO D2 · RÉGIONALE';

  const cardsSvg = clubs.map((c, i) => {
    const yCard = 500 + i * 230;
    return `
      <g transform="translate(100, ${yCard})">
        <rect width="880" height="180" rx="25" fill="#082216e0" stroke="#f4cf6a" stroke-width="2.5"/>
        <text x="210" y="85" font-family="Impact" font-size="44" fill="#ffffff" letter-spacing="1">${esc(c.name)}</text>
        <rect x="210" y="105" width="160" height="34" rx="17" fill="#d4af37"/>
        <text x="290" y="129" font-family="Arial" font-weight="900" font-size="18" fill="#040b08" text-anchor="middle">${esc(c.league)}</text>
        <text x="820" y="105" font-family="Arial" font-weight="900" font-size="34" fill="#f4cf6a" text-anchor="middle">✔</text>
      </g>
    `;
  }).join('');

  // Amateur club banner for FR
  const amateurBanner = isEn ? `
    <g transform="translate(100, 1450)">
      <rect width="880" height="120" rx="20" fill="#04120be8" stroke="#3b82f6" stroke-width="2"/>
      <text x="440" y="55" font-family="Impact" font-size="34" fill="#60a5fa" text-anchor="middle">INTERNATIONAL CHAMPIONS</text>
      <text x="440" y="95" font-family="Arial" font-weight="700" font-size="20" fill="#cbd5e1" text-anchor="middle">FROM EUROPE TO SOUTHERN HEMISPHERE</text>
    </g>
  ` : `
    <g transform="translate(100, 1450)">
      <rect width="880" height="120" rx="20" fill="#04120be8" stroke="#22c55e" stroke-width="2"/>
      <text x="440" y="55" font-family="Impact" font-size="34" fill="#4ade80" text-anchor="middle">+ CLUBS AMATEURS &amp; RÉGIONAUX</text>
      <text x="440" y="95" font-family="Arial" font-weight="700" font-size="20" fill="#cbd5e1" text-anchor="middle">DU PLUS PETIT VILLAGE AUX GRANDS STADES</text>
    </g>
  `;

  const overlay = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${headerPill()}
      ${titleBanner(title, sub, '#ffffff', '#ffd700')}
      ${cardsSvg}
      ${amateurBanner}
      ${footerPill(isEn)}
    </svg>
  `;

  return sharp(bg)
    .composite([
      ...compos,
      { input: Buffer.from(overlay), top: 0, left: 0 }
    ])
    .png()
    .toBuffer();
}

// ── SCENE 5: PACK OPENING & STAR REVEAL ──────────────────────────────────────
async function scene5Reveal(isEn = false) {
  const bg = await bgDarkPattern();
  const cardFile = isEn ? 'trailer/official-2026/carte_kolbe_94.png' : 'trailer/official-2026/carte_dupont_96.png';
  const card = await sharp(cardFile)
    .resize(650, 996, { fit: 'contain' })
    .png()
    .toBuffer();

  const title = isEn ? ['PACK THE BEST'] : ['OUVRE DES PACKS'];
  const sub = isEn ? 'MYTHIC REVEAL · CHESLIN KOLBE 94' : 'REVEAL LÉGENDAIRE · ANTOINE DUPONT 96';

  const overlay = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${headerPill()}
      ${titleBanner(title, sub, '#ffd700', '#ffffff')}
      ${footerPill(isEn)}
    </svg>
  `;

  return sharp(bg)
    .composite([
      { input: card, top: 460, left: (W - 650) / 2 },
      { input: Buffer.from(overlay), top: 0, left: 0 }
    ])
    .png()
    .toBuffer();
}

// ── SCENE 6: SQUAD BUILDING ──────────────────────────────────────────────────
async function scene6(isEn = false) {
  const bg = await bgDarkPattern();
  const tactics = await sharp('verification-manager-mobile.png')
    .resize(760, 1644, { fit: 'contain' })
    .png()
    .toBuffer();

  const title = isEn ? ['BUILD YOUR DREAM XV'] : ['CRÉE TON ÉQUIPE'];
  const sub = isEn ? 'SQUAD CHEMISTRY & STARTING XV' : 'COLLECTIF · TACTIQUES · REMPLAÇANTS';

  const overlay = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${headerPill()}
      ${titleBanner(title, sub, '#ffffff', '#ffd700')}
      ${footerPill(isEn)}
    </svg>
  `;

  return sharp(bg)
    .composite([
      { input: tactics, top: 200, left: (W - 760) / 2 },
      { input: Buffer.from(overlay), top: 0, left: 0 }
    ])
    .png()
    .toBuffer();
}

// ── SCENE 7: CAREER PLAYER & COACH ──────────────────────────────────────────
async function scene7(isEn = false) {
  const bg = await bgDarkPattern();
  const career = await sharp('verification-c29-carriere-desktop.jpg')
    .resize(W, 770, { fit: 'cover' })
    .png()
    .toBuffer();
    
  const market = await sharp('verification-marche-pc.jpg')
    .resize(W, 610, { fit: 'cover' })
    .png()
    .toBuffer();

  const title = isEn ? ['PLAYER OR MANAGER'] : ['DEVIENS UNE LÉGENDE'];
  const sub = isEn ? 'CREATE YOUR PLAYER · LEAD YOUR CLUB' : 'CARRIÈRE JOUEUR OU ENTRAÎNEUR';

  const overlay = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${headerPill()}
      ${titleBanner(title, sub, '#ffffff', '#ffd700')}
      <g transform="translate(100, 430)">
        <rect width="360" height="44" rx="22" fill="#d4af37"/>
        <text x="180" y="30" font-family="Arial" font-weight="900" font-size="20" fill="#05120a" text-anchor="middle">MODE CARRIÈRE JOUEUR</text>
      </g>
      <g transform="translate(100, 1180)">
        <rect width="360" height="44" rx="22" fill="#d4af37"/>
        <text x="180" y="30" font-family="Arial" font-weight="900" font-size="20" fill="#05120a" text-anchor="middle">MODE HEAD COACH</text>
      </g>
      ${footerPill(isEn)}
    </svg>
  `;

  return sharp(bg)
    .composite([
      { input: career, top: 400, left: 0 },
      { input: market, top: 1150, left: 0 },
      { input: Buffer.from(overlay), top: 0, left: 0 }
    ])
    .png()
    .toBuffer();
}

// ── SCENE 8: WOMEN'S RUGBY ───────────────────────────────────────────────────
async function scene8(isEn = false) {
  const bg = await bgDarkPattern();
  const cardFile = isEn ? 'trailer/official-2026/carte_jordan_89.png' : 'trailer/official-2026/carte_melissa_88.png';
  const card = await sharp(cardFile)
    .resize(600, 920, { fit: 'contain' })
    .png()
    .toBuffer();

  const packRoulette = isEn ? 'public/images/packs-roulette/f-pwr.webp' : 'public/images/packs-roulette/f-elite1.webp';
  const pack = await sharp(packRoulette)
    .resize(280, 370, { fit: 'contain' })
    .png()
    .toBuffer();

  const title = isEn ? ["WOMEN'S RUGBY"] : ['LE RUGBY FÉMININ AUSSI'];
  const sub = isEn ? 'PREMIERSHIP WOMEN · SUPER RUGBY AUPIKI' : 'ÉLITE 1 · ÉLITE 2 · CHAMPIONNATS FÉMININS';

  const overlay = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${headerPill()}
      ${titleBanner(title, sub, '#f472b6', '#ffffff')}
      ${footerPill(isEn)}
    </svg>
  `;

  return sharp(bg)
    .composite([
      { input: card, top: 480, left: 70 },
      { input: pack, top: 750, left: 710 },
      { input: Buffer.from(overlay), top: 0, left: 0 }
    ])
    .png()
    .toBuffer();
}

// ── SCENE 9: MULTIPLAYER LEAGUES & 3D MATCH ──────────────────────────────────
async function scene9(isEn = false) {
  const bg = await bgDarkPattern();
  const social = await sharp('verification-social-mobile.png')
    .resize(480, 1120, { fit: 'contain' })
    .png()
    .toBuffer();

  const match = await sharp('verification-match-mobile.png')
    .resize(480, 1040, { fit: 'contain' })
    .png()
    .toBuffer();

  const title = isEn ? ['CHALLENGE YOUR MATES'] : ['AFFRONTE TES POTES'];
  const sub = isEn ? 'ONLINE LEAGUES · LIVE 3D MATCHES' : 'LIGUES PRIVÉES · MATCHS 3D EN DIRECT';

  const overlay = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${headerPill()}
      ${titleBanner(title, sub, '#ffffff', '#ffd700')}
      <!-- Live Score Board -->
      <g transform="translate(140, 1530)">
        <rect width="800" height="150" rx="25" fill="#04120bf0" stroke="#f4cf6a" stroke-width="3"/>
        <text x="180" y="65" font-family="Arial" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">TOULOUSE</text>
        <text x="180" y="115" font-family="Impact" font-size="48" fill="#f4cf6a" text-anchor="middle">24</text>
        <text x="400" y="85" font-family="Arial" font-weight="900" font-size="30" fill="#94a3b8" text-anchor="middle">79' — EN DIRECT</text>
        <circle cx="400" cy="115" r="7" fill="#ef4444"/>
        <text x="620" y="65" font-family="Arial" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">LA ROCHELLE</text>
        <text x="620" y="115" font-family="Impact" font-size="48" fill="#f4cf6a" text-anchor="middle">21</text>
      </g>
      ${footerPill(isEn)}
    </svg>
  `;

  return sharp(bg)
    .composite([
      { input: social, top: 400, left: 50 },
      { input: match, top: 440, left: 550 },
      { input: Buffer.from(overlay), top: 0, left: 0 }
    ])
    .png()
    .toBuffer();
}

// ── SCENE 10: HIGHLIGHTS & TROPHIES ──────────────────────────────────────────
async function scene10(isEn = false) {
  const bg = await bgDarkPattern();
  const tryImg = await sharp('verification-c30-essai-plonge.jpg')
    .resize(W, 620, { fit: 'cover' })
    .png()
    .toBuffer();

  const trophyImg = await sharp('verification-coupe-mobile.png')
    .resize(480, 1040, { fit: 'contain' })
    .png()
    .toBuffer();

  const celebImg = await sharp('verification-celebration-mobile.png')
    .resize(480, 1040, { fit: 'contain' })
    .png()
    .toBuffer();

  const title = isEn ? ['MAKE HISTORY'] : ['ÉCRIS TON HISTOIRE'];
  const sub = isEn ? 'FROM GRASSROOTS TO THE BIGGEST TROPHIES' : 'DES DIVISIONS RÉGIONALES AUX PLUS GRANDS TITRES';

  const overlay = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${headerPill()}
      ${titleBanner(title, sub, '#ffd700', '#ffffff')}
      ${footerPill(isEn)}
    </svg>
  `;

  return sharp(bg)
    .composite([
      { input: trophyImg, top: 460, left: 40 },
      { input: celebImg, top: 460, left: 560 },
      { input: tryImg, top: 1100, left: 0 },
      { input: Buffer.from(overlay), top: 0, left: 0 }
    ])
    .png()
    .toBuffer();
}

// ── SCENE 11: HERO OUTRO CTA ─────────────────────────────────────────────────
async function scene11(isEn = false) {
  const bg = await bgDarkPattern();
  const stadium = await sharp('verification-c31-ecran-stade.jpg')
    .resize(W, 1100, { fit: 'cover' })
    .blur(1.5)
    .png()
    .toBuffer();

  const logoBuf = await sharp('public/favicon.svg')
    .resize(260, 260)
    .png()
    .toBuffer();

  const title = isEn ? 'THIS IS DESTINY RUGBY' : 'DESTINY RUGBY';
  const cta = isEn ? 'FREE TO PLAY — PLAY NOW' : '100% GRATUIT — JOUE MAINTENANT';
  const slogan = isEn ? 'Your club. Your team. Your destiny.' : 'Alors… tu choisis quel club ?';

  const overlay = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="outroShadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#020805" stop-opacity="0.9"/>
          <stop offset="40%" stop-color="#020805" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#020805" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#outroShadow)"/>

      <!-- Title -->
      <text x="540" y="720" font-family="Impact" font-size="115" fill="#f4cf6a" stroke="#020805" stroke-width="8" paint-order="stroke" text-anchor="middle" letter-spacing="3">DESTINY</text>
      <text x="540" y="840" font-family="Impact" font-size="115" fill="#ffffff" stroke="#020805" stroke-width="8" paint-order="stroke" text-anchor="middle" letter-spacing="3">RUGBY</text>

      <!-- Subtitle -->
      <text x="540" y="930" font-family="Arial" font-weight="800" font-size="34" fill="#cbd5e1" text-anchor="middle" letter-spacing="3">
        ${isEn ? 'NO DOWNLOAD · DIRECT IN BROWSER' : 'SANS TÉLÉCHARGEMENT · SUR NAVIGATEUR'}
      </text>

      <!-- Features Checklist -->
      <g transform="translate(180, 1020)" font-family="Arial" font-weight="800" font-size="32" fill="#ffffff">
        <text x="0" y="0">🏉  655+ CLUBS &amp; STARS MONDIALES</text>
        <text x="0" y="65">📦  PACKS &amp; CARTES DE JOUEURS</text>
        <text x="0" y="130">🎮  MATCHS 3D &amp; LIGUES PRIVÉES</text>
        <text x="0" y="195">🌸  CARRIÈRE FEMMES &amp; HOMMES</text>
      </g>

      <!-- Big CTA Button -->
      <g transform="translate(90, 1330)">
        <rect width="900" height="130" rx="30" fill="#f4cf6a" stroke="#ffffff" stroke-width="4"/>
        <text x="450" y="80" font-family="Impact" font-size="52" fill="#04120a" text-anchor="middle" letter-spacing="2">
          ${esc(cta)}
        </text>
      </g>

      <!-- URL Badge -->
      <rect x="140" y="1510" width="800" height="80" rx="20" fill="#062215e8" stroke="#f4cf6a" stroke-width="2.5"/>
      <text x="540" y="1563" font-family="Impact" font-size="48" fill="#ffffff" text-anchor="middle" letter-spacing="3">
        destiny-rugby.fr
      </text>

      <!-- Slogan -->
      <text x="540" y="1660" font-family="Arial" font-weight="800" font-size="32" fill="#f4cf6a" text-anchor="middle" font-style="italic">
        "${esc(slogan)}"
      </text>
    </svg>
  `;

  return sharp(bg)
    .composite([
      { input: stadium, top: 200, left: 0 },
      { input: logoBuf, top: 380, left: (W - 260) / 2 },
      { input: Buffer.from(overlay), top: 0, left: 0 }
    ])
    .png()
    .toBuffer();
}

async function main() {
  console.log('--- Génération des scènes en cours ---');
  for (const isEn of [false, true]) {
    const d = isEn ? dirEN : dirFR;
    const tag = isEn ? 'EN' : 'FR';
    console.log(`Génération scènes ${tag}...`);

    await sharp(await scene0(isEn)).png().toFile(path.join(d, 'scene_00_hook_fifa.png'));
    await sharp(await scene1(isEn)).png().toFile(path.join(d, 'scene_01_hook_fm.png'));
    await sharp(await scene2(isEn)).png().toFile(path.join(d, 'scene_02_hook_rugby.png'));
    await sharp(await scene3(isEn)).png().toFile(path.join(d, 'scene_03_logo_match.png'));
    await sharp(await scene4(isEn)).png().toFile(path.join(d, 'scene_04_clubs.png'));
    await sharp(await scene5Reveal(isEn)).png().toFile(path.join(d, 'scene_05_pack_reveal.png'));
    await sharp(await scene6(isEn)).png().toFile(path.join(d, 'scene_06_squad.png'));
    await sharp(await scene7(isEn)).png().toFile(path.join(d, 'scene_07_careers.png'));
    await sharp(await scene8(isEn)).png().toFile(path.join(d, 'scene_08_women.png'));
    await sharp(await scene9(isEn)).png().toFile(path.join(d, 'scene_09_leagues.png'));
    await sharp(await scene10(isEn)).png().toFile(path.join(d, 'scene_10_highlights.png'));
    await sharp(await scene11(isEn)).png().toFile(path.join(d, 'scene_11_outro.png'));

    console.log(`12 scènes ${tag} générées avec succès dans ${d}`);
  }
}

main().catch(console.error);
