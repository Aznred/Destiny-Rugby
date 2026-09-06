// Importe les portraits déposés dans ../maj et transforme les classements fournis
// en notes minimales documentées pour le catalogue de la carrière en ligne.
// Exécuter ensuite scripts/optimiserPhotosMaj.py pour les copies destinées au web.
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..');
const SOURCE = path.join(RACINE, '..', 'maj');
const PHOTOS = path.join(RACINE, 'public', 'photos', 'maj');
const INDEX_PHOTOS = path.join(RACINE, 'src', 'data', 'photosMaj.ts');
const INDEX_NOTES = path.join(RACINE, 'src', 'data', 'evaluationsJoueursMaj.ts');
const normaliser = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const fichier = (s) => normaliser(s).replace(/ /g, '_');
const lire = (nom) => fs.readFileSync(path.join(SOURCE, nom), 'utf8').replace(/\r/g, '');

if (!fs.existsSync(SOURCE)) throw new Error(`Dossier introuvable : ${SOURCE}`);
fs.mkdirSync(PHOTOS, { recursive: true });

const images = [];
function parcourir(dossier) {
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    const absolu = path.join(dossier, entree.name);
    if (entree.isDirectory()) parcourir(absolu);
    else if (/\.(png|jpe?g|webp)$/i.test(entree.name)) images.push(absolu);
  }
}
parcourir(SOURCE);

// Un préfixe stable évite d'écraser les photos françaises déjà présentes.
// Deux fichiers portant le même nom reçoivent un suffixe court tiré du dossier.
const photos = new Map();
const destinations = new Map();
for (const source of images.sort()) {
  const extension = path.extname(source).toLowerCase().replace('.jpeg', '.jpg');
  const cle = normaliser(path.basename(source, path.extname(source)));
  const championnat = source.includes(`${path.sep}urc${path.sep}`) ? 'urc' : 'prem';
  let nom = `${championnat}_${fichier(cle)}${extension}`;
  if (destinations.has(nom) && destinations.get(nom) !== source) {
    nom = `${championnat}_${fichier(path.basename(path.dirname(source)))}_${fichier(cle)}${extension}`;
  }
  fs.copyFileSync(source, path.join(PHOTOS, nom));
  destinations.set(nom, source);
  photos.set(cle, `/photos/maj/${nom}`);
}

// Les JSON connaissent parfois la séparation prénom/nom. Ces alias règlent les
// noms composés, que la simple inversion de tous les mots ne peut pas deviner.
for (const relatif of fs.readdirSync(SOURCE, { recursive: true }).filter(x => String(x).endsWith('.json'))) {
  let donnees;
  try { donnees = JSON.parse(fs.readFileSync(path.join(SOURCE, relatif), 'utf8')); } catch { continue; }
  if (!Array.isArray(donnees)) continue;
  for (const joueur of donnees) {
    const complet = normaliser(joueur['Nom Complet'] ?? `${joueur.Prenom ?? joueur.prenom ?? ''} ${joueur.Nom ?? joueur.nom ?? ''}`);
    const prenom = normaliser(joueur.Prenom ?? joueur.prenom);
    const nom = normaliser(joueur.Nom ?? joueur.nom);
    const chemin = photos.get(complet) ?? photos.get(normaliser(joueur.photo_locale && path.basename(joueur.photo_locale, path.extname(joueur.photo_locale))));
    if (!chemin) continue;
    photos.set(complet, chemin);
    if (prenom && nom) { photos.set(`${prenom} ${nom}`, chemin); photos.set(`${nom} ${prenom}`, chemin); }
  }
}
const lignesPhotos = [...photos].sort(([a], [b]) => a.localeCompare(b)).map(([nom, url]) => `  ${JSON.stringify(nom)}: ${JSON.stringify(url)},`);
fs.writeFileSync(INDEX_PHOTOS, `// Fichier généré par scripts/importerMajJoueurs.cjs depuis ../maj.\nexport const PHOTO_JOUEUR_MAJ: Record<string, string> = {\n${lignesPhotos.join('\n')}\n};\nexport const NB_PHOTOS_MAJ = ${images.length};\n`);

// Une note de magazine fixe le niveau mondial. Les statistiques ne servent que
// de plancher de forme : elles ne doivent pas surévaluer un joueur par volume brut.
const evaluations = new Map();
function noter(nom, note, source) {
  const cle = normaliser(nom);
  if (!cle) return;
  const actuel = evaluations.get(cle);
  if (!actuel || note > actuel.note) evaluations.set(cle, { note: Math.round(note), source });
}
const rugbyPass = [...lire('top  100 player rugbypass.txt').matchAll(/^(.+?)\n(\d{1,3})\n\1$/gm)];
for (const m of rugbyPass) noter(m[1], 79 + (101 - Number(m[2])) * 0.16, `RugbyPass #${m[2]}`);
const flo = [...lire('flo top 10.txt').matchAll(/^(\d+)\.\s+(.+?)(?:\s{2,}|$)/gm)];
for (const m of flo) noter(m[2], 88 + (11 - Number(m[1])) * 0.7, `FloRugby #${m[1]}`);
const weTalk = [...lire('top30 we talk rugby.txt').matchAll(/^\s{4}(.+?)\s+—/gm)];
weTalk.forEach((m, i) => noter(m[1].trim(), 84 + (30 - i) / 3, `We Talk Rugby #${i + 1}`));

const six = JSON.parse(lire('stats six nations 2026.json')).player_statistics_2026;
const pointsSix = new Map();
for (const categorie of six) for (const r of categorie.rankings ?? []) {
  const cle = normaliser(r.player); const precedent = pointsSix.get(cle) ?? { nom: r.player, points: 0, citations: 0 };
  precedent.points += Math.max(1, 8 - Number(r.rank)); precedent.citations++; pointsSix.set(cle, precedent);
}
const maxSix = Math.max(...[...pointsSix.values()].map(x => x.points));
for (const x of pointsSix.values()) if (x.citations >= 2) noter(x.nom, 74 + 12 * x.points / maxSix, `Six Nations 2026 (${x.citations} catégories)`);

// Dans les statistiques de clubs, on retient les dix meilleurs de chaque mesure
// positive. Un joueur doit apparaître plusieurs fois pour obtenir un plancher.
const champs = ['Tries Scored','Try Assists','Assists','Clean Breaks','Defenders Beaten','Metres Gained','Offloads','Number of Tackles','Turnovers Won','Lineouts Won','Points scored','Points Scored'];
const stats = [];
for (const relatif of fs.readdirSync(SOURCE, { recursive: true }).filter(x => String(x).endsWith('.json'))) {
  let donnees; try { donnees = JSON.parse(fs.readFileSync(path.join(SOURCE, relatif), 'utf8')); } catch { continue; }
  if (Array.isArray(donnees)) stats.push(...donnees);
}
const pointsStats = new Map();
for (const champ of champs) {
  const classes = stats.map(j => ({ j, v: Number(j[champ] ?? j.stats?.[champ] ?? 0) })).filter(x => Number.isFinite(x.v) && x.v > 0).sort((a,b) => b.v-a.v).slice(0,10);
  classes.forEach((x,i) => { const nom = x.j['Nom Complet'] ?? `${x.j.Prenom ?? x.j.prenom ?? ''} ${x.j.Nom ?? x.j.nom ?? ''}`; const cle=normaliser(nom); const precedent=pointsStats.get(cle)??{nom,points:0,citations:0}; precedent.points += 10-i; precedent.citations++; pointsStats.set(cle,precedent); });
}
const maxStats = Math.max(...[...pointsStats.values()].map(x => x.points));
for (const x of pointsStats.values()) if (x.citations >= 2) noter(x.nom, 64 + 15 * x.points / maxStats, `Statistiques clubs (${x.citations} catégories)`);

const lignesNotes = [...evaluations].sort(([a], [b]) => a.localeCompare(b)).map(([nom, x]) => `  ${JSON.stringify(nom)}: { note: ${x.note}, source: ${JSON.stringify(x.source)} },`);
fs.writeFileSync(INDEX_NOTES, `// Fichier généré par scripts/importerMajJoueurs.cjs depuis les classements et statistiques de ../maj.\nexport const EVALUATION_JOUEUR_MAJ: Record<string, { note: number; source: string }> = {\n${lignesNotes.join('\n')}\n};\n`);
console.log(`Photos importées : ${images.length}; clés/alias : ${photos.size}; évaluations : ${evaluations.size}.`);
