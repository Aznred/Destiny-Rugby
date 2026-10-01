// Importe les portraits livrés à côté du jeu, par identifiant FFR ou nom exact
// dans le club. Les originaux restent dans ../photos ; le jeu sert du WebP local.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const source = path.resolve(process.argv[2] ?? path.join(root, '../photos'));
const donnees = JSON.parse(fs.readFileSync(path.join(source, 'effectifs_ffr_enrichis.json'), 'utf8'));
const normaliser = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const signature = s => normaliser(s).split(' ').sort().join('|');
const clubs = new Map(donnees.clubs.map(c => [normaliser(c.slug).replaceAll(' ', ''), c]));
const joueurs = new Map(donnees.clubs.flatMap(c => c.joueurs.map(j => [j.id, j])));
// Deux écritures vérifiées dans l'effectif de Palavas : prénom sans h et nom composé abrégé.
const ALIASES_LOCAUX = {
  'rugby-club-mediterranee-palavas/Gauthier PAGES.png': 636274,
  'rugby-club-mediterranee-palavas/Thibault BOUISSEREN.png': 825684,
};
const parId = {}, supplementaires = {}, bilan = { images: 0, lieesParId: 0, lieesParNom: 0, supplementaires: [], photosAnnonceesAbsentes: [], octets: 0 };
const fichiers = fs.readdirSync(source, { withFileTypes: true }).filter(d => d.isDirectory()).sort((a,b) => a.name.localeCompare(b.name)).flatMap(d =>
  fs.readdirSync(path.join(source, d.name)).filter(f => /\.(png|jpe?g|webp)$/i.test(f)).sort().map(f => ({ dossier: d.name, fichier: f })));

async function importer({ dossier, fichier }) {
  const club = clubs.get(normaliser(dossier).replaceAll(' ', ''));
  const nomFichier = path.basename(fichier, path.extname(fichier)).replace(/^\d+[_ -]*/, '').replace(/[-_]removebg[-_]preview.*$/i, '');
  const id = Number(fichier.match(/^(\d+)[_ -]/)?.[1]);
  let joueur = joueurs.get(ALIASES_LOCAUX[`${dossier}/${fichier}`] ?? id);
  if (joueur) bilan.lieesParId++;
  else {
    const candidats = (club?.joueurs ?? []).filter(j => signature(`${j.prenom} ${j.nom}`) === signature(nomFichier));
    if (candidats.length === 1) { joueur = candidats[0]; bilan.lieesParNom++; }
  }
  const nomSortie = `${path.basename(fichier, path.extname(fichier))}.webp`;
  const destination = path.join(root, 'public/photos/ffr', dossier, nomSortie);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  await sharp(path.join(source, dossier, fichier)).rotate().resize({ width: 512, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84, alphaQuality: 95 }).toFile(destination);
  const url = `/photos/ffr/${encodeURIComponent(dossier)}/${encodeURIComponent(nomSortie)}`;
  if (joueur) parId[joueur.id] = url;
  else {
    (supplementaires[club?.structure_id ?? dossier] ??= {})[normaliser(nomFichier)] = url;
    bilan.supplementaires.push({ club: club?.nom ?? dossier, nom: nomFichier, fichier });
  }
  bilan.images++;
  bilan.octets += fs.statSync(destination).size;
}

(async () => {
  // Quatre images à la fois pour borner la mémoire avec les PNG de grande taille.
  for (let i = 0; i < fichiers.length; i += 4) {
    await Promise.all(fichiers.slice(i, i + 4).map(importer));
    if (i % 200 === 0) console.log(`${Math.min(i + 4, fichiers.length)}/${fichiers.length} portraits`);
  }
  for (const club of donnees.clubs) for (const j of club.joueurs) {
    if (j.photo && !parId[j.id]) bilan.photosAnnonceesAbsentes.push({ id: j.id, nom: `${j.prenom} ${j.nom}`, club: club.nom });
  }
  const supplementsTries = Object.fromEntries(Object.entries(supplementaires).sort(([a], [b]) => a.localeCompare(b)).map(([club, photos]) =>
    [club, Object.fromEntries(Object.entries(photos).sort(([a], [b]) => a.localeCompare(b)))]));
  bilan.supplementaires.sort((a, b) => a.fichier.localeCompare(b.fichier));
  fs.writeFileSync(path.join(root, 'src/data/photosFfr.ts'),
    '// Généré par scripts/importerPhotosFfr.cjs. Portraits locaux, identifiants FFR.\n' +
    'export const PHOTOS_FFR_PAR_ID: Record<number, string> = ' + JSON.stringify(parId, null, 2) + ';\n' +
    'export const PHOTOS_FFR_SUPPLEMENTAIRES: Record<string, Record<string, string>> = ' + JSON.stringify(supplementsTries, null, 2) + ';\n');
  fs.writeFileSync(path.join(root, 'scripts/bilanPhotosFfr.json'), JSON.stringify(bilan, null, 2) + '\n');
  console.log(JSON.stringify({ ...bilan, supplementaires: bilan.supplementaires.length, photosAnnonceesAbsentes: bilan.photosAnnonceesAbsentes.length, poidsMo: +(bilan.octets / 1024 / 1024).toFixed(2) }));
})().catch(erreur => { console.error(erreur); process.exitCode = 1; });
