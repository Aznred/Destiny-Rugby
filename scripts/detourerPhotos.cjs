// LE DÉTOURAGE AUTOMATIQUE DES PORTRAITS
//
// ⚠️ SUR UNE CARTE, UN FOND EST UN RECTANGLE. Les 1 400 portraits français du
// jeu sont détourés : le joueur se pose directement sur le métal de la carte.
// Les portraits japonais et du Super Rugby arrivent, eux, sur le fond du studio
// — blanc, gris clair, parfois dégradé. Collés tels quels, ils dessinent un
// carré blanc au milieu de la carte, et ça se voit au premier coup d'œil.
//
// La méthode est celle de `components/EcussonClub.tsx` pour les écussons à fond
// blanc, portée sur les photos : **on part des BORDS**. Un fond de studio
// touche forcément le cadre ; le joueur, non. On propage donc depuis les quatre
// côtés tant que la couleur reste celle du fond, et on s'arrête net au premier
// contour. Un blanc INTÉRIEUR — un maillot blanc, un logo — n'est jamais
// atteint, puisqu'il n'est pas connecté au bord.
//
// ⚠️ DEUX SEUILS, PAS UN. Un seul seuil donne un contour en escalier et une
// auréole claire autour des cheveux. En dessous du seuil DUR le pixel est du
// fond (alpha 0) ; entre les deux il est à moitié transparent, et on lui retire
// la couleur du fond qu'il a absorbée (`(pixel - fond·(1-a)) / a`) — sans quoi
// il reste un liseré blanc autour du joueur.
//
// ⚠️ ET ON NE TOUCHE À RIEN QUAND ON N'EST PAS SÛR. Photo déjà détourée, fond
// non uniforme (photo d'action), résultat qui mangerait plus de 92 % ou moins
// de 3 % de l'image : on repart sans écrire. Mieux vaut un fond blanc qu'un
// joueur troué.
//
// Le script est IDEMPOTENT : une photo détourée a des bords transparents, elle
// est donc sautée à la relance.
//
// Relancer : node scripts/detourerPhotos.cjs [dossier]
//   défaut  : public/photos/monde

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const RACINE = path.join(__dirname, '..');
const DOSSIER = path.resolve(RACINE, process.argv[2] ?? path.join('public', 'photos', 'monde'));

/**
 * En deçà, le pixel EST le fond. Au-delà du seuil doux, c'est le joueur ; entre
 * les deux, c'est le liseré, à moitié transparent.
 *
 * ⚠️ LE SEUIL DOUX ÉTAIT À 62, ET IL MANGEAIT DES VISAGES. Une peau claire sous
 * un éclairage de studio n'est qu'à ~40 du gris du mur : la propagation entrait
 * par la joue et ressortait avec un trou au milieu de la figure (mesuré sur
 * deux portraits sur trente-six). À 34, le mur part toujours — il est à moins
 * de 24 — et la peau reste.
 */
const SEUIL_DUR = 24;
const SEUIL_DOUX = 34;
/** Un fond de studio ne change pas brutalement d'un pixel à l'autre. */
const PAS_MAXIMUM = 14;
/**
 * ⚠️ ET IL PEUT ÊTRE UN DÉGRADÉ. Le fond des Crusaders passe de 171 à 227 de
 * gris : à s'en tenir à l'écart avec la couleur de départ, la moitié du mur
 * restait collée au joueur. On suit donc le dégradé de proche en proche, mais
 * jamais au-delà de cette borne — sinon on finirait dans le short.
 */
const SEUIL_LARGE = 150;
/** Au-delà de cet écart entre canaux, ce n'est plus un mur : c'est quelqu'un. */
const SATURATION_FOND = 22;
/** Bornes de sécurité : au-delà, on a mangé le joueur ou on n'a rien fait. */
const PART_MINIMALE = 0.03;
const PART_MAXIMALE = 0.92;

const distance = (r1, v1, b1, r2, v2, b2) => Math.sqrt((r1 - r2) ** 2 + (v1 - v2) ** 2 + (b1 - b2) ** 2);

/**
 * La couleur du fond, lue sur le HAUT du cadre.
 *
 * ⚠️ PAS SUR LES QUATRE BORDS : UN PORTRAIT EST COUPÉ AUX ÉPAULES. Le bas du
 * cadre est plein de maillot, et la médiane des quatre côtés tombait donc entre
 * le fond et le joueur — aucune photo n'était reconnue. Au-dessus de la tête,
 * en revanche, il n'y a que le studio.
 */
function couleurDuFond(data, w, h, c) {
  const lire = (x, y) => { const i = (y * w + x) * c; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
  const hauts = [];
  for (let x = 0; x < w; x += 2) hauts.push(lire(x, 0), lire(x, 1));
  for (let y = 0; y < Math.floor(h * 0.45); y += 2) hauts.push(lire(0, y), lire(w - 1, y));
  // Déjà détourée : les bords sont transparents, il n'y a rien à faire.
  if (hauts.filter(([, , , a]) => a < 200).length > hauts.length * 0.25) return null;
  const median = (indice) => {
    const valeurs = hauts.map((p) => p[indice]).sort((a, b) => a - b);
    return valeurs[Math.floor(valeurs.length / 2)];
  };
  const fond = [median(0), median(1), median(2)];
  const proches = hauts.filter((p) => distance(p[0], p[1], p[2], fond[0], fond[1], fond[2]) <= SEUIL_DOUX);
  // Le haut du cadre doit être franchement d'une seule couleur, sinon c'est une
  // photo d'action ou un fond travaillé : on n'y touche pas.
  if (proches.length < hauts.length * 0.85) return null;
  return fond;
}

/** Détoure une image ; rend `false` si elle a été laissée telle quelle. */
async function detourer(fichier) {
  // ⚠️ ON LIT LE FICHIER EN MÉMOIRE D'ABORD. sharp garde la main sur le
  // fichier source tant qu'il le décode, et Windows refuse alors de le
  // réécrire (`EPERM`).
  const original = fs.readFileSync(fichier);
  const { data, info } = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const fond = couleurDuFond(data, w, h, c);
  if (!fond) return false;
  const [fr, fv, fb] = fond;

  // Propagation depuis les bords : une file plate, pas de récursion — une
  // image de 600 × 840 fait un demi-million de pixels.
  const alpha = new Uint8Array(w * h).fill(255);
  const vu = new Uint8Array(w * h);
  const file = new Int32Array(w * h);
  // La couleur du fond LOCAL de chaque pixel retiré : sur un dégradé, ce n'est
  // pas la couleur de départ, et c'est elle qu'il faut soustraire du liseré.
  const fondLocal = new Uint8Array(w * h * 3);
  let debut = 0;
  let fin = 0;

  const empiler = (p, parent) => {
    if (vu[p]) return;
    const i = p * c;
    const [r, v, b] = [data[i], data[i + 1], data[i + 2]];
    const ecartFond = distance(r, v, b, fr, fv, fb);
    if (ecartFond > SEUIL_LARGE) return;
    // Deux façons d'être du fond : ressembler à la couleur de départ, ou
    // prolonger sans à-coup le pixel de fond voisin (le dégradé du studio).
    let pas = Infinity;
    if (parent >= 0) {
      const j = parent * c;
      pas = distance(r, v, b, data[j], data[j + 1], data[j + 2]);
    }
    // ⚠️ LE DÉGRADÉ NE SE SUIT QUE DANS DU GRIS. Sans ce garde-fou, la marche
    // de proche en proche passait du mur à la peau — le fond d'un studio et un
    // visage éclairé ne sont séparés que par une transition douce — et le
    // détourage mangeait le visage. Un fond de studio est neutre ; une peau,
    // un maillot, un ballon ne le sont pas.
    const neutre = Math.max(r, v, b) - Math.min(r, v, b) <= SATURATION_FOND;
    if (ecartFond > SEUIL_DOUX && !(neutre && pas <= PAS_MAXIMUM)) return;
    vu[p] = 1;
    const ecart = Math.min(ecartFond, pas);
    alpha[p] = ecart <= SEUIL_DUR ? 0 : Math.round(255 * Math.min(1, (ecart - SEUIL_DUR) / (SEUIL_DOUX - SEUIL_DUR)));
    // Le fond local : celui du parent s'il était opaque au fond, sinon le sien.
    const source = parent >= 0 && alpha[parent] === 0 ? parent * c : i;
    fondLocal[p * 3] = data[source];
    fondLocal[p * 3 + 1] = data[source + 1];
    fondLocal[p * 3 + 2] = data[source + 2];
    file[fin++] = p;
  };
  for (let x = 0; x < w; x++) { empiler(x, -1); empiler((h - 1) * w + x, -1); }
  for (let y = 0; y < h; y++) { empiler(y * w, -1); empiler(y * w + w - 1, -1); }

  let retires = 0;
  while (debut < fin) {
    const p = file[debut++];
    retires++;
    const x = p % w;
    const y = (p - x) / w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      empiler(ny * w + nx, p);
    }
  }

  const part = retires / (w * h);
  if (part < PART_MINIMALE || part > PART_MAXIMALE) return false;
  // ⚠️ UN DÉTOURAGE À MOITIÉ FAIT EST PIRE QUE PAS DE DÉTOURAGE. Si le fond
  // résiste quelque part — dégradé trop marqué, cloison, ombre portée — il
  // reste un pan de mur collé au joueur. Le HAUT du cadre doit être entièrement
  // parti, sinon on rend la photo telle qu'elle était.
  //
  // ⚠️ LE HAUT SEULEMENT, jamais les quatre coins : un portrait est coupé aux
  // épaules, ses deux coins du BAS sont du maillot. La règle les a d'abord
  // exigés transparents, et elle refusait alors tous les portraits japonais —
  // c'est-à-dire précisément ceux qu'on voulait détourer.
  const opaque = (x, y) => alpha[y * w + x] > 40;
  const marge = Math.round(Math.min(w, h) * 0.04);
  if ([[marge, marge], [w - 1 - marge, marge]].some(([x, y]) => opaque(x, y))) return false;
  // ⚠️ ET LE HAUT SE MESURE LARGE. Un joueur qui lève un ballon, une coupe de
  // cheveux qui touche le cadre : le sujet a le droit d'entamer la première
  // ligne. On ne refuse que si le haut est un MUR — c'est-à-dire s'il est
  // opaque sur plus du quart de sa largeur. Le seuil a d'abord été à 6 %, et il
  // recalait des portraits parfaitement détourables (Fraser McReight, son
  // ballon au-dessus de l'épaule : 8 %).
  let hautOpaque = 0;
  for (let x = 0; x < w; x++) if (opaque(x, marge)) hautOpaque++;
  if (hautOpaque > w * 0.25) return false;


  // On rend au pixel la couleur qu'il aurait sans le fond derrière lui : sinon
  // les cheveux gardent un liseré clair, visible sur le métal sombre.
  const sortie = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const i = p * c;
    const a = alpha[p];
    const j = p * 4;
    if (a === 255) {
      sortie[j] = data[i]; sortie[j + 1] = data[i + 1]; sortie[j + 2] = data[i + 2]; sortie[j + 3] = data[i + 3];
      continue;
    }
    if (a === 0) { sortie[j] = sortie[j + 1] = sortie[j + 2] = sortie[j + 3] = 0; continue; }
    const facteur = a / 255;
    const purifier = (valeur, fondCanal) => Math.max(0, Math.min(255, Math.round((valeur - fondCanal * (1 - facteur)) / facteur)));
    sortie[j] = purifier(data[i], fondLocal[p * 3]);
    sortie[j + 1] = purifier(data[i + 1], fondLocal[p * 3 + 1]);
    sortie[j + 2] = purifier(data[i + 2], fondLocal[p * 3 + 2]);
    sortie[j + 3] = Math.min(a, data[i + 3]);
  }
  const encodee = await sharp(sortie, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
  fs.writeFileSync(fichier, encodee);
  return true;
}

(async () => {
  if (!fs.existsSync(DOSSIER)) throw new Error(`Dossier introuvable : ${DOSSIER}`);
  const fichiers = fs.readdirSync(DOSSIER).filter((f) => /\.(webp|png|jpe?g)$/i.test(f));
  console.log(`→ ${fichiers.length} portraits dans ${path.relative(RACINE, DOSSIER)}`);
  let detoures = 0;
  let laisses = 0;
  let echecs = 0;
  for (const [rang, nom] of fichiers.entries()) {
    try {
      if (await detourer(path.join(DOSSIER, nom))) detoures++; else laisses++;
    } catch (erreur) {
      echecs++;
      console.warn(`   ✗ ${nom} : ${erreur.message}`);
    }
    if ((rang + 1) % 200 === 0) console.log(`   ${rang + 1}/${fichiers.length}…`);
  }
  const poids = fs.readdirSync(DOSSIER).reduce((total, f) => total + fs.statSync(path.join(DOSSIER, f)).size, 0);
  console.log(`✓ ${detoures} détourés, ${laisses} laissés tels quels (déjà détourés ou fond non uniforme), ${echecs} en échec.`);
  console.log(`✓ ${(poids / 1024 / 1024).toFixed(1)} Mo`);
})();
