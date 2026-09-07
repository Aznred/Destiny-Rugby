// NETTOYAGE DES PORTRAITS — la carte grise n'est pas un joueur sans photo,
// c'est une photo qui n'en est pas une.
//
// ⚠️ 181 FICHIERS DE `public/photos/` SONT LE MÊME OCTET POUR OCTET : la
// silhouette grise « pas de portrait disponible » du site source, aspirée avec
// les autres. Elle était indexée comme un vrai portrait, donc `photoReelle()`
// la renvoyait fièrement — et 178 joueurs affichaient un fantôme gris au lieu
// de tomber sur le repli, ou pire, sans jamais chercher leur VRAIE photo rangée
// dans `photos/maj/` ou `photos/new maj/`.
//
// ⚠️ 97 ENTRÉES DE `photosMaj.ts` POINTAIENT DANS LE VIDE : l'index annonce
// `prem_adam_radwan.webp` là où le disque porte `prem_adam_radwan-removebg-
// preview.png`. Le fichier était bien là, sous un nom que personne ne
// demandait. On raccroche l'index à ce qui existe — SANS RENOMMER : le suffixe
// `-removebg-preview` est aussi le nom sous lequel `photosNewMaj.ts` référence
// ses propres fichiers, et renommer sur le disque casserait CET index-là.
//
// Le script est IDEMPOTENT : relancé, il ne trouve plus rien à faire.
//
// Relancer : node scripts/nettoyerPhotos.cjs
//   puis    : node scripts/copierPhotosJoueurs.cjs
//   mesure  : npx vite-node scripts/verifPhotosCartes.ts

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RACINE = path.join(__dirname, '..');
const PUBLIC = path.join(RACINE, 'public');
const DONNEES = path.join(RACINE, 'src', 'data');
const DOSSIERS = ['photos', 'photos/maj', 'photos/new maj'];

const empreinte = (fichier) => crypto.createHash('md5').update(fs.readFileSync(fichier)).digest('hex');
const estImage = (nom) => /\.(webp|png|jpe?g)$/i.test(nom);
const surLeDisque = (url) => fs.existsSync(path.join(PUBLIC, decodeURIComponent(url).replace(/^\//, '')));
const normaliser = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// L'empreinte de la silhouette grise. Elle ne changera pas : c'est un fichier
// figé du site source, et on le reconnaît à l'octet près plutôt qu'à son nom —
// il porte le nom d'un vrai joueur (`adam_hastings.webp`).
const SILHOUETTE = '5bb34e3ef5ec20cd45a57ae140406cf0';

// ⚠️ ON EN GARDE UN SEUL EXEMPLAIRE, SOUS UN NOM QUI NE REVENDIQUE PERSONNE.
// La silhouette reste le repli voulu à l'écran quand un joueur n'a aucune
// photo — c'est de porter le nom de 181 joueurs qui était le bug, pas d'exister.
const REPLI = path.join(PUBLIC, 'photos', 'silhouette.webp');

// ── 1. Les silhouettes grises quittent le dossier ─────────────────────────
// Les supprimer plutôt que les désindexer a un effet utile : une carte déjà
// distribuée qui garde l'ancienne URL reçoit un 404, son `onError` se déclenche
// et la carte retombe sur le portrait actuellement indexé.
let silhouettes = 0;
for (const dossier of DOSSIERS) {
  const abs = path.join(PUBLIC, dossier);
  for (const nom of fs.readdirSync(abs)) {
    const fichier = path.join(abs, nom);
    if (!estImage(nom) || !fs.statSync(fichier).isFile()) continue;
    if (empreinte(fichier) !== SILHOUETTE) continue;
    if (path.resolve(fichier) === REPLI) continue;
    if (!fs.existsSync(REPLI)) fs.copyFileSync(fichier, REPLI);
    fs.unlinkSync(fichier);
    silhouettes++;
  }
}
if (!fs.existsSync(REPLI)) console.warn('⚠ public/photos/silhouette.webp manquant — le repli des cartes sans portrait.');
console.log(`✓ ${silhouettes} silhouette(s) grise(s) supprimée(s), le repli reste dans photos/silhouette.webp.`);

// ── 2. Les index se raccrochent à ce qui existe ───────────────────────────
// Index de secours par nom normalisé : un portrait peut avoir changé
// d'extension (`.png` jamais converti en `.webp`), de suffixe ou de dossier
// sans changer de joueur. On ne devine RIEN d'autre : à défaut, l'entrée
// disparaît, et le joueur retombe sur le repli neutre de la carte.
const parNom = new Map();
function referencer(cle, url) {
  if (cle && !parNom.has(cle)) parNom.set(cle, url);
}
for (const dossier of DOSSIERS) {
  for (const nom of fs.readdirSync(path.join(PUBLIC, dossier))) {
    if (!estImage(nom)) continue;
    const url = `/${dossier}/${nom}`.replace(/ /g, '%20');
    const brut = normaliser(path.basename(nom, path.extname(nom)));
    const court = normaliser(path.basename(nom, path.extname(nom)).replace(/-?removebg-?preview/i, ''));
    for (const cle of new Set([brut, court])) {
      referencer(`${dossier}|${cle}`, url);
      referencer(cle, url);
    }
  }
}

/** L'URL de remplacement d'un portrait absent, ou `undefined` s'il a disparu. */
function remplacant(url) {
  const decode = decodeURIComponent(url);
  const dossier = path.posix.dirname(decode).replace(/^\//, '');
  const cle = normaliser(path.basename(decode, path.extname(decode)));
  return parNom.get(`${dossier}|${cle}`) ?? parNom.get(cle);
}

// ⚠️ `photosMaj.ts` EST RÉÉCRIT PAR UN SCRIPT PYTHON, DONC EN CRLF, quand les
// deux autres index sortent de Node en LF. Une expression rationnelle ancrée
// sur `$` ne reconnaissait aucune ligne du premier — le script annonçait « 0
// entrée réparée » sur le fichier qui en comptait 97 de cassées.
const ENTREE = /^(\s*)("[^"]+"):\s*"(\/photos\/[^"]+)",?\r?$/;

function reparerIndex(fichier) {
  const chemin = path.join(DONNEES, fichier);
  const texte = fs.readFileSync(chemin, 'utf8');
  const finDeLigne = texte.includes('\r\n') ? '\r\n' : '\n';
  let repointees = 0;
  let retirees = 0;
  const lignes = [];
  for (const ligne of texte.split(/\r?\n/)) {
    const entree = ligne.match(ENTREE);
    if (!entree || surLeDisque(entree[3])) { lignes.push(ligne); continue; }
    const autre = remplacant(entree[3]);
    if (!autre) { retirees++; continue; }
    lignes.push(`${entree[1]}${entree[2]}: ${JSON.stringify(autre)},`);
    repointees++;
  }
  fs.writeFileSync(chemin, lignes.join(finDeLigne), 'utf8');
  console.log(`  ${fichier} : ${repointees} entrée(s) raccrochée(s), ${retirees} retirée(s).`);
}

reparerIndex('photosMaj.ts');
reparerIndex('photosNewMaj.ts');

// ── 3. `lnrMaj.ts` tient sur une seule ligne : on passe par son JSON ──────
// Il sert de dernier recours au catalogue ; une URL morte y vaut une carte grise.
{
  const chemin = path.join(DONNEES, 'lnrMaj.ts');
  const texte = fs.readFileSync(chemin, 'utf8');
  const debut = texte.indexOf('= {') + 2;
  const fin = texte.lastIndexOf('}');
  const table = JSON.parse(texte.slice(debut, fin + 1));
  let repointees = 0;
  let retirees = 0;
  for (const entree of Object.values(table)) {
    if (!entree.photo || surLeDisque(entree.photo)) continue;
    const autre = remplacant(entree.photo);
    if (autre) { entree.photo = autre; repointees++; continue; }
    delete entree.photo;
    retirees++;
  }
  fs.writeFileSync(chemin, `${texte.slice(0, debut)}${JSON.stringify(table)}${texte.slice(fin + 1)}`, 'utf8');
  console.log(`  lnrMaj.ts : ${repointees} photo(s) raccrochée(s), ${retirees} retirée(s).`);
}

console.log('→ Relancer maintenant : node scripts/copierPhotosJoueurs.cjs');
