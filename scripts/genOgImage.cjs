// L'IMAGE DE PARTAGE (Open Graph / X), générée — pas dessinée à la main.
//
// Quand on colle https://destiny-rugby.fr dans un message, sur X ou sur
// WhatsApp, c'est CETTE image qui s'affiche. Sans elle, le lien apparaît nu :
// un titre gris sur fond blanc, qui ne donne envie à personne de cliquer.
//
// ⚠️ Aucune dépendance : le PNG est encodé à la main avec `zlib` (livré avec
// Node). Le dessin est purement géométrique — dégradé de pelouse nocturne,
// halo de projecteurs, ballon de cuir et lignes de touche — et il est
// SUPERÉCHANTILLONNÉ ×3 puis réduit, ce qui donne des bords lisses sans moteur
// de rendu. Le texte, lui, reste dans `og:title` : pas de police à embarquer,
// et un titre qui reste lisible et traduisible.
//
// Relancer : node scripts/genOgImage.cjs   → public/og.png (1200×630)

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const L = 1200;
const H = 630;
const S = 3; // superéchantillonnage

const LARGE = L * S;
const HAUT = H * S;

// --- petite boîte à outils ---------------------------------------------------
const melanger = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const couleur = (r, g, b) => [r, g, b];
const lerpC = (c1, c2, t) => [
  melanger(c1[0], c2[0], t), melanger(c1[1], c2[1], t), melanger(c1[2], c2[2], t),
];

// Le thème du jeu : stade nocturne, pelouse, cuir et dorures.
const PELOUSE_HAUT = couleur(0x12, 0x3a, 0x25);
const PELOUSE_BAS = couleur(0x06, 0x14, 0x0d);
const CRAIE = couleur(0xf2, 0xf0, 0xe6);
const CUIR_CLAIR = couleur(0xc0, 0x6e, 0x3c);
const CUIR_SOMBRE = couleur(0x5f, 0x30, 0x17);
const OR = couleur(0xe8, 0xb2, 0x3a);

// Le ballon : une ellipse inclinée, avec sa couture et ses lacets.
const BALLON = {
  cx: LARGE * 0.735, cy: HAUT * 0.52,
  rx: LARGE * 0.20, ry: HAUT * 0.215,
  angle: (-28 * Math.PI) / 180,
};

function dansEllipse(x, y, e) {
  const dx = x - e.cx;
  const dy = y - e.cy;
  const cos = Math.cos(-e.angle);
  const sin = Math.sin(-e.angle);
  const u = (dx * cos - dy * sin) / e.rx;
  const v = (dx * sin + dy * cos) / e.ry;
  return { dedans: u * u + v * v <= 1, u, v };
}

// --- le rendu ----------------------------------------------------------------
const grand = Buffer.alloc(LARGE * HAUT * 3);

for (let y = 0; y < HAUT; y++) {
  for (let x = 0; x < LARGE; x++) {
    // 1. La pelouse, en dégradé vertical.
    let c = lerpC(PELOUSE_HAUT, PELOUSE_BAS, y / HAUT);

    // 2. Les bandes de tonte, dans le sens de la longueur.
    const bande = Math.floor((y / HAUT) * 9) % 2;
    if (bande) c = lerpC(c, CRAIE, 0.022);

    // 3. Le halo des projecteurs, en haut à gauche.
    const hx = (x - LARGE * 0.28) / (LARGE * 0.62);
    const hy = (y - HAUT * 0.22) / (HAUT * 0.75);
    const halo = Math.max(0, 1 - Math.sqrt(hx * hx + hy * hy));
    c = lerpC(c, CRAIE, halo * halo * 0.10);

    // 4. Les lignes du terrain : les 22 et la médiane, en fuite.
    for (const px of [0.10, 0.30, 0.50]) {
      const lx = LARGE * px + (y - HAUT / 2) * 0.16;
      if (Math.abs(x - lx) < 2.4 * S) c = lerpC(c, CRAIE, 0.30);
    }

    // 5. Le ballon.
    const e = dansEllipse(x, y, BALLON);
    if (e.dedans) {
      const bord = 1 - Math.sqrt(e.u * e.u + e.v * e.v);
      // Volume : plus clair en haut à gauche, plus sombre sur le bas droit.
      const relief = 0.5 - (e.u * 0.45 + e.v * 0.55);
      c = lerpC(CUIR_SOMBRE, CUIR_CLAIR, Math.max(0, Math.min(1, relief)));
      // La couture centrale et les quatre lacets.
      if (Math.abs(e.v) < 0.055) c = lerpC(c, CRAIE, 0.9);
      for (const lu of [-0.19, -0.07, 0.07, 0.19]) {
        if (Math.abs(e.u - lu) < 0.028 && Math.abs(e.v) < 0.24) c = lerpC(c, CRAIE, 0.92);
      }
      // Les deux quartiers, en arc.
      for (const qu of [-0.62, 0.62]) {
        if (Math.abs(e.u - qu) < 0.022 && Math.abs(e.v) < 0.62) c = lerpC(c, CRAIE, 0.55);
      }
      // Un liseré doré sur le pourtour : la signature du thème.
      if (bord < 0.045) c = lerpC(c, OR, 1 - bord / 0.045);
    }

    // 6. Le bandeau doré du bas — le « sol » de la carte.
    if (y > HAUT - 10 * S) c = lerpC(c, OR, 0.85);

    // 7. Vignettage, pour que le titre superposé reste lisible.
    const vx = (x / LARGE - 0.5) * 2;
    const vy = (y / HAUT - 0.5) * 2;
    c = lerpC(c, couleur(0, 0, 0), Math.min(0.42, (vx * vx + vy * vy) * 0.22));

    const i = (y * LARGE + x) * 3;
    grand[i] = c[0];
    grand[i + 1] = c[1];
    grand[i + 2] = c[2];
  }
}

// --- réduction (anti-aliasing) ----------------------------------------------
const pixels = Buffer.alloc(H * (L * 3 + 1));
for (let y = 0; y < H; y++) {
  pixels[y * (L * 3 + 1)] = 0; // filtre PNG « None »
  for (let x = 0; x < L; x++) {
    let r = 0, g = 0, b = 0;
    for (let dy = 0; dy < S; dy++) {
      for (let dx = 0; dx < S; dx++) {
        const i = ((y * S + dy) * LARGE + (x * S + dx)) * 3;
        r += grand[i]; g += grand[i + 1]; b += grand[i + 2];
      }
    }
    const n = S * S;
    const o = y * (L * 3 + 1) + 1 + x * 3;
    pixels[o] = Math.round(r / n);
    pixels[o + 1] = Math.round(g / n);
    pixels[o + 2] = Math.round(b / n);
  }
}

// --- encodage PNG ------------------------------------------------------------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function bloc(type, data) {
  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(data.length, 0);
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const somme = Buffer.alloc(4);
  somme.writeUInt32BE(crc32(corps), 0);
  return Buffer.concat([longueur, corps, somme]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(L, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // 8 bits par canal
ihdr[9] = 2;  // couleur vraie (RGB)

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  bloc('IHDR', ihdr),
  bloc('IDAT', zlib.deflateSync(pixels, { level: 9 })),
  bloc('IEND', Buffer.alloc(0)),
]);

const sortie = path.join(__dirname, '..', 'public', 'og.png');
fs.writeFileSync(sortie, png);
console.log(`✅ ${path.relative(process.cwd(), sortie)} — ${L}×${H}, ${(png.length / 1024).toFixed(1)} Ko`);
