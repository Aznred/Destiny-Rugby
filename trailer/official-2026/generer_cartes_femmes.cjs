const sharp = require('sharp');

async function genererCartesFemmes() {
  // Melissa Dupont
  const photoMD = await sharp('public/photos/feminines/elite2/stade-francais/melissa-dupont.webp')
    .resize(480, 560, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  const svgMD = `
  <svg width="600" height="920" viewBox="0 0 600 920" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <linearGradient id="magentaCard" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fbcfe8"/>
        <stop offset="25%" stop-color="#ec4899"/>
        <stop offset="70%" stop-color="#be185d"/>
        <stop offset="100%" stop-color="#831843"/>
      </linearGradient>
      <linearGradient id="cardInner" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2a081a"/>
        <stop offset="100%" stop-color="#0e0208"/>
      </linearGradient>
    </defs>
    <path d="M 50,50 L 550,50 L 580,240 L 580,680 L 300,890 L 20,680 L 20,240 Z" fill="url(#magentaCard)"/>
    <path d="M 58,58 L 542,58 L 570,242 L 570,674 L 300,878 L 30,674 L 30,242 Z" fill="#0e0208"/>
    <path d="M 64,64 L 536,64 L 562,244 L 562,668 L 300,868 L 38,668 L 38,244 Z" fill="url(#cardInner)"/>
    <text x="110" y="165" font-family="Impact" font-size="95" fill="#f472b6" text-anchor="middle">88</text>
    <text x="110" y="215" font-family="Arial" font-weight="900" font-size="34" fill="#ffffff" text-anchor="middle">CT</text>
    <text x="110" y="250" font-family="Arial" font-weight="700" font-size="20" fill="#f472b6" text-anchor="middle">N°12</text>
    <g clip-path="url(#photoClip)">
      <clipPath id="photoClip">
        <rect x="175" y="80" width="375" height="490" rx="20"/>
      </clipPath>
      <image x="175" y="80" width="375" height="490" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/png;base64,${photoMD.toString('base64')}"/>
    </g>
    <path d="M 60,590 L 540,590" stroke="url(#magentaCard)" stroke-width="4"/>
    <rect x="70" y="605" width="460" height="60" rx="12" fill="#2d0c1d" stroke="#f472b6" stroke-width="2"/>
    <text x="300" y="648" font-family="Impact" font-size="44" letter-spacing="3" fill="#ffffff" text-anchor="middle">MÉLISSA DUPONT</text>
    <g transform="translate(85, 700)" font-family="Arial" font-weight="800">
      <text x="0" y="30" font-size="32" fill="#f472b6">89</text><text x="50" y="30" font-size="24" fill="#fbcfe8">VIT</text>
      <text x="0" y="75" font-size="32" fill="#f472b6">91</text><text x="50" y="75" font-size="24" fill="#fbcfe8">PAS</text>
      <text x="0" y="120" font-size="32" fill="#f472b6">88</text><text x="50" y="120" font-size="24" fill="#fbcfe8">DEF</text>
      <text x="240" y="30" font-size="32" fill="#f472b6">90</text><text x="290" y="30" font-size="24" fill="#fbcfe8">DRI</text>
      <text x="240" y="75" font-size="32" fill="#f472b6">86</text><text x="290" y="75" font-size="24" fill="#fbcfe8">PLA</text>
      <text x="240" y="120" font-size="32" fill="#f472b6">87</text><text x="290" y="120" font-size="24" fill="#fbcfe8">PHY</text>
    </g>
    <rect x="180" y="835" width="240" height="34" rx="17" fill="#ec4899"/>
    <text x="300" y="859" font-family="Arial" font-weight="900" font-size="18" fill="#ffffff" text-anchor="middle" letter-spacing="2">🌸 ÉLITE FÉMININE</text>
  </svg>
  `;

  await sharp(Buffer.from(svgMD)).png().toFile('trailer/official-2026/carte_melissa_88.png');

  // Jordan Russell
  const photoJR = await sharp('public/photos/feminines/pwr/leicester-tigers/jordan-russell.webp')
    .resize(480, 560, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  const svgJR = `
  <svg width="600" height="920" viewBox="0 0 600 920" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <linearGradient id="purpleCard" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e9d5ff"/>
        <stop offset="25%" stop-color="#a855f7"/>
        <stop offset="70%" stop-color="#7e22ce"/>
        <stop offset="100%" stop-color="#3b0764"/>
      </linearGradient>
      <linearGradient id="cardInner" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1f0933"/>
        <stop offset="100%" stop-color="#0b0214"/>
      </linearGradient>
    </defs>
    <path d="M 50,50 L 550,50 L 580,240 L 580,680 L 300,890 L 20,680 L 20,240 Z" fill="url(#purpleCard)"/>
    <path d="M 58,58 L 542,58 L 570,242 L 570,674 L 300,878 L 30,674 L 30,242 Z" fill="#0b0214"/>
    <path d="M 64,64 L 536,64 L 562,244 L 562,668 L 300,868 L 38,668 L 38,244 Z" fill="url(#cardInner)"/>
    <text x="110" y="165" font-family="Impact" font-size="95" fill="#c084fc" text-anchor="middle">89</text>
    <text x="110" y="215" font-family="Arial" font-weight="900" font-size="34" fill="#ffffff" text-anchor="middle">FL</text>
    <text x="110" y="250" font-family="Arial" font-weight="700" font-size="20" fill="#c084fc" text-anchor="middle">N°7</text>
    <g clip-path="url(#photoClip)">
      <clipPath id="photoClip">
        <rect x="175" y="80" width="375" height="490" rx="20"/>
      </clipPath>
      <image x="175" y="80" width="375" height="490" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/png;base64,${photoJR.toString('base64')}"/>
    </g>
    <path d="M 60,590 L 540,590" stroke="url(#purpleCard)" stroke-width="4"/>
    <rect x="70" y="605" width="460" height="60" rx="12" fill="#200a35" stroke="#c084fc" stroke-width="2"/>
    <text x="300" y="648" font-family="Impact" font-size="44" letter-spacing="3" fill="#ffffff" text-anchor="middle">JORDAN RUSSELL</text>
    <g transform="translate(85, 700)" font-family="Arial" font-weight="800">
      <text x="0" y="30" font-size="32" fill="#c084fc">91</text><text x="50" y="30" font-size="24" fill="#e9d5ff">PAC</text>
      <text x="0" y="75" font-size="32" fill="#c084fc">89</text><text x="50" y="75" font-size="24" fill="#e9d5ff">PAS</text>
      <text x="0" y="120" font-size="32" fill="#c084fc">93</text><text x="50" y="120" font-size="24" fill="#e9d5ff">TAC</text>
      <text x="240" y="30" font-size="32" fill="#c084fc">87</text><text x="290" y="30" font-size="24" fill="#e9d5ff">DRI</text>
      <text x="240" y="75" font-size="32" fill="#c084fc">90</text><text x="290" y="75" font-size="24" fill="#e9d5ff">WRK</text>
      <text x="240" y="120" font-size="32" fill="#c084fc">88</text><text x="290" y="120" font-size="24" fill="#e9d5ff">PHY</text>
    </g>
    <rect x="180" y="835" width="240" height="34" rx="17" fill="#a855f7"/>
    <text x="300" y="859" font-family="Arial" font-weight="900" font-size="18" fill="#ffffff" text-anchor="middle" letter-spacing="2">🏉 PREMIERSHIP WOMEN</text>
  </svg>
  `;

  await sharp(Buffer.from(svgJR)).png().toFile('trailer/official-2026/carte_jordan_89.png');

  console.log('Cartes féminines générées avec succès');
}

genererCartesFemmes().catch(console.error);
