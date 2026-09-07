// Indexe les fichiers fournis, sans modifier les images ni inventer de joueurs.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'public/photos/new maj');
const normaliser = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const images = fs.readdirSync(dir).filter(f => /\.(png|webp|jpe?g)$/i.test(f)).sort();
const photos = {}, priorites = {};
for (const f of images) {
  const cle = normaliser(path.basename(f, path.extname(f)).replace(/^(prem|urc)_/, '').replace(/[-_]removebg[-_]preview.*$/i, ''));
  const priorite = /removebg/i.test(f) ? 3 : /^(prem|urc)_/.test(f) ? 1 : 2;
  if (priorites[cle] === undefined || priorite > priorites[cle]) { photos[cle] = '/photos/new%20maj/' + encodeURIComponent(f); priorites[cle] = priorite; }
}
const joueurs = {}, sansPhoto = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  const rows = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\uFEFF/, ''));
  if (!Array.isArray(rows)) throw new Error('Format JSON inattendu : ' + f);
  for (const j of rows) {
    if (!j.nom || !j.club) continue;
    const cle = normaliser(j.nom);
    const fichier = String(j.image_locale ?? '').split(/[\\/]/).pop();
    const alias = normaliser(path.basename(fichier, path.extname(fichier)));
    const photo = photos[cle] ?? photos[alias];
    if (photo) photos[cle] = photo; else sansPhoto.push(j.nom);
    joueurs[cle] = {club: j.club, poste: j.poste || undefined};
  }
}
fs.writeFileSync(path.join(root, 'src/data/photosNewMaj.ts'), '// Généré par scripts/importerPhotosNewMaj.cjs. Images originales conservées.\nexport const PHOTOS_NEW_MAJ: Record<string, string> = ' + JSON.stringify(photos, null, 2) + ';\nexport const JOUEURS_NEW_MAJ: Record<string, {club:string;poste?:string}> = ' + JSON.stringify(joueurs, null, 2) + ';\n');
console.log(JSON.stringify({images: images.length, aliasPhotos: Object.keys(photos).length, profilsJson: Object.keys(joueurs).length, profilsSansPhoto: sansPhoto.length}));
