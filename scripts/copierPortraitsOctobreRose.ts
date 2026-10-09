// LES PORTRAITS DES CARTES OCTOBRE ROSE → public/photos/octobre-rose/<carte>.webp
//
//   npx vite-node scripts/copierPortraitsOctobreRose.ts
//
// Ce sont les portraits officiels de la Coupe du monde 2025 (rugbyworldcup.com), déjà détourés à la source, que
// `../Objectif Ffr/scrape_feminines.py` range sous `photos/selections/`. Une carte Octobre Rose porte CE portrait
// (pose de célébration, maillot de la sélection), pas celui de la carte ordinaire de la joueuse.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { definitionsDepart } from '../src/lib/ligue/catalogueSpecial';

const source = path.resolve('../Objectif Ffr/exports/feminines/photos/selections');
const cible = path.resolve('public/photos/octobre-rose');
const cle = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(' ').sort().join(' ');
// Le site de la Coupe du monde écrit un diminutif ; la carte porte le nom de la joueuse.
const ALIAS: Record<string, string> = { 'gabrielle vernier': 'gaby vernier' };
const fichiers = fs.readdirSync(source).flatMap(d => fs.readdirSync(path.join(source, d)).map(f => path.join(source, d, f)));
fs.mkdirSync(cible, { recursive: true });
let faits = 0;
for (const carte of definitionsDepart().filter(d => d.cardType === 'octobre-rose')) {
  const nom = cle(ALIAS[carte.nom.toLowerCase()] ?? carte.nom);
  const portrait = fichiers.find(f => cle(path.basename(f, path.extname(f)).replaceAll('-', ' ')) === nom);
  if (!portrait) { console.warn('sans portrait :', carte.nom); continue; }
  await sharp(portrait).trim().resize(600, 600, { fit: 'inside' }).webp({ quality: 88 }).toFile(path.join(cible, `${carte.id.split(':')[1]}.webp`));
  faits++;
}
console.log(`${faits} portraits Octobre Rose copiés`);
