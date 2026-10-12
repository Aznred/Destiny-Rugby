const sharp = require('sharp');

async function genererCarteKolbe() {
  const photoBuf = await sharp('public/photos/monde/jpn_cheslin_kolbe.webp')
    .resize(480, 560, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  const logoBuf = await sharp('public/logos/toulon.png')
    .resize(75, 75)
    .png()
    .toBuffer();

  const cardSvg = `
  <svg width="600" height="920" viewBox="0 0 600 920" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <linearGradient id="iconCard" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e8f8ff"/>
        <stop offset="25%" stop-color="#4fc3f7"/>
        <stop offset="60%" stop-color="#0288d1"/>
        <stop offset="85%" stop-color="#00e5ff"/>
        <stop offset="100%" stop-color="#01579b"/>
      </linearGradient>
      <linearGradient id="cardInner" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#081a24"/>
        <stop offset="40%" stop-color="#041018"/>
        <stop offset="100%" stop-color="#02080d"/>
      </linearGradient>
      <filter id="cardGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="15" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    
    <!-- Outer Glow & Shield Shape -->
    <path d="M 50,50 L 550,50 L 580,240 L 580,680 L 300,890 L 20,680 L 20,240 Z" fill="url(#iconCard)" filter="url(#cardGlow)"/>
    <path d="M 58,58 L 542,58 L 570,242 L 570,674 L 300,878 L 30,674 L 30,242 Z" fill="#02080d"/>
    <path d="M 64,64 L 536,64 L 562,244 L 562,668 L 300,868 L 38,668 L 38,244 Z" fill="url(#cardInner)"/>

    <!-- Rating & Position -->
    <text x="110" y="165" font-family="Impact" font-size="95" fill="#4fc3f7" text-anchor="middle">94</text>
    <text x="110" y="215" font-family="Arial" font-weight="900" font-size="34" fill="#ffffff" text-anchor="middle">WG</text>
    <text x="110" y="250" font-family="Arial" font-weight="700" font-size="20" fill="#4fc3f7" text-anchor="middle">N°14</text>
    
    <!-- Club Crest -->
    <image x="72" y="275" width="75" height="75" xlink:href="data:image/png;base64,${logoBuf.toString('base64')}"/>

    <!-- Player Photo -->
    <g clip-path="url(#photoClip)">
      <clipPath id="photoClip">
        <rect x="175" y="80" width="375" height="490" rx="20"/>
      </clipPath>
      <image x="175" y="80" width="375" height="490" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/png;base64,${photoBuf.toString('base64')}"/>
    </g>

    <!-- Divider -->
    <path d="M 60,590 L 540,590" stroke="url(#iconCard)" stroke-width="4"/>

    <!-- Player Name -->
    <rect x="70" y="605" width="460" height="60" rx="12" fill="#081e2b" stroke="#4fc3f7" stroke-width="2"/>
    <text x="300" y="648" font-family="Impact" font-size="44" letter-spacing="3" fill="#ffffff" text-anchor="middle">CHESLIN KOLBE</text>

    <!-- Stats Grid -->
    <g transform="translate(85, 700)" font-family="Arial" font-weight="800">
      <text x="0" y="30" font-size="32" fill="#4fc3f7">98</text>
      <text x="50" y="30" font-size="24" fill="#a0c8e0">PAC</text>

      <text x="0" y="75" font-size="32" fill="#4fc3f7">91</text>
      <text x="50" y="75" font-size="24" fill="#a0c8e0">PAS</text>

      <text x="0" y="120" font-size="32" fill="#4fc3f7">97</text>
      <text x="50" y="120" font-size="24" fill="#a0c8e0">DRI</text>

      <text x="240" y="30" font-size="32" fill="#4fc3f7">95</text>
      <text x="290" y="30" font-size="24" fill="#a0c8e0">AGI</text>

      <text x="240" y="75" font-size="32" fill="#4fc3f7">84</text>
      <text x="290" y="75" font-size="24" fill="#a0c8e0">TAC</text>

      <text x="240" y="120" font-size="32" fill="#4fc3f7">86</text>
      <text x="290" y="120" font-size="24" fill="#a0c8e0">PHY</text>
    </g>

    <!-- Mythic Rarity Badge -->
    <rect x="180" y="835" width="240" height="34" rx="17" fill="#00e5ff"/>
    <text x="300" y="859" font-family="Arial" font-weight="900" font-size="18" fill="#02080d" text-anchor="middle" letter-spacing="2">⚡ MYTHIC ICON</text>
  </svg>
  `;

  await sharp(Buffer.from(cardSvg))
    .png()
    .toFile('trailer/official-2026/carte_kolbe_94.png');
    
  console.log('Carte Kolbe 94 générée avec succès');
}

genererCarteKolbe().catch(console.error);
