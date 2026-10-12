const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function testCarteDupont() {
  const photoBuf = await sharp('public/photos/antoine_dupont.webp')
    .resize(480, 560, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();
    
  const logoBuf = await sharp('public/logos/toulouse.png')
    .resize(75, 75)
    .png()
    .toBuffer();

  const cardSvg = `
  <svg width="600" height="920" viewBox="0 0 600 920" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <linearGradient id="goldCard" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fff4cc"/>
        <stop offset="25%" stop-color="#d4af37"/>
        <stop offset="60%" stop-color="#aa7c11"/>
        <stop offset="85%" stop-color="#ffd700"/>
        <stop offset="100%" stop-color="#553a00"/>
      </linearGradient>
      <linearGradient id="cardInner" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#14281f"/>
        <stop offset="40%" stop-color="#0a1913"/>
        <stop offset="100%" stop-color="#040b08"/>
      </linearGradient>
      <filter id="cardGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="15" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    
    <!-- Outer Glow & Shield Shape -->
    <path d="M 50,50 L 550,50 L 580,240 L 580,680 L 300,890 L 20,680 L 20,240 Z" fill="url(#goldCard)" filter="url(#cardGlow)"/>
    <path d="M 58,58 L 542,58 L 570,242 L 570,674 L 300,878 L 30,674 L 30,242 Z" fill="#040a07"/>
    <path d="M 64,64 L 536,64 L 562,244 L 562,668 L 300,868 L 38,668 L 38,244 Z" fill="url(#cardInner)"/>

    <!-- Rating & Position -->
    <text x="110" y="165" font-family="Impact" font-size="95" fill="#ffd700" text-anchor="middle">96</text>
    <text x="110" y="215" font-family="Arial" font-weight="900" font-size="34" fill="#ffffff" text-anchor="middle">DM</text>
    <text x="110" y="250" font-family="Arial" font-weight="700" font-size="20" fill="#d4af37" text-anchor="middle">N°9</text>
    
    <!-- Toulouse Crest -->
    <image x="72" y="275" width="75" height="75" xlink:href="data:image/png;base64,${logoBuf.toString('base64')}"/>

    <!-- Player Photo -->
    <g clip-path="url(#photoClip)">
      <clipPath id="photoClip">
        <rect x="175" y="80" width="375" height="490" rx="20"/>
      </clipPath>
      <image x="175" y="80" width="375" height="490" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/png;base64,${photoBuf.toString('base64')}"/>
    </g>

    <!-- Golden Divider -->
    <path d="M 60,590 L 540,590" stroke="url(#goldCard)" stroke-width="4"/>

    <!-- Player Name -->
    <rect x="70" y="605" width="460" height="60" rx="12" fill="#0b2418" stroke="#d4af37" stroke-width="2"/>
    <text x="300" y="648" font-family="Impact" font-size="44" letter-spacing="3" fill="#ffffff" text-anchor="middle">ANTOINE DUPONT</text>

    <!-- Stats Grid -->
    <g transform="translate(85, 700)" font-family="Arial" font-weight="800">
      <!-- Col 1 -->
      <text x="0" y="30" font-size="32" fill="#ffd700">95</text>
      <text x="50" y="30" font-size="24" fill="#b0c8b8">VIT</text>

      <text x="0" y="75" font-size="32" fill="#ffd700">98</text>
      <text x="50" y="75" font-size="24" fill="#b0c8b8">PAS</text>

      <text x="0" y="120" font-size="32" fill="#ffd700">96</text>
      <text x="50" y="120" font-size="24" fill="#b0c8b8">VIS</text>

      <!-- Col 2 -->
      <text x="240" y="30" font-size="32" fill="#ffd700">94</text>
      <text x="290" y="30" font-size="24" fill="#b0c8b8">CRO</text>

      <text x="240" y="75" font-size="32" fill="#ffd700">88</text>
      <text x="290" y="75" font-size="24" fill="#b0c8b8">PLA</text>

      <text x="240" y="120" font-size="32" fill="#ffd700">92</text>
      <text x="290" y="120" font-size="24" fill="#b0c8b8">PHY</text>
    </g>

    <!-- Star Rarity Badge -->
    <rect x="180" y="835" width="240" height="34" rx="17" fill="#d4af37"/>
    <text x="300" y="859" font-family="Arial" font-weight="900" font-size="18" fill="#040b08" text-anchor="middle" letter-spacing="2">⭐ STAR · DESTINY</text>
  </svg>
  `;

  await sharp(Buffer.from(cardSvg))
    .png()
    .toFile('trailer/official-2026/carte_dupont_96.png');
    
  console.log('Carte Dupont 96 générée avec succès');
}

testCarteDupont().catch(console.error);
