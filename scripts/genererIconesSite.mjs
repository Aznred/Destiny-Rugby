import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = await readFile(new URL('../public/favicon.svg', import.meta.url));
const sorties = [
  [32, 'favicon-32.png'],
  [180, 'icons/apple-touch-icon.png'],
  [192, 'icons/icon-192.png'],
  [512, 'icons/icon-512.png'],
];

for (const [taille, nom] of sorties) {
  await sharp(source).resize(taille, taille).png().toFile(fileURLToPath(new URL(`../public/${nom}`, import.meta.url)));
}
