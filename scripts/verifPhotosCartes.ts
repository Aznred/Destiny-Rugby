// BANC DES PORTRAITS DE CARTES — « plein de cartes sans image en mode joueur
// grisé alors qu'ils sont bien présents dans le set d'images ».
//
// Trois pannes se cachaient derrière ce retour de jeu, et ce banc les tient
// toutes les trois fermées :
//
//  1. 181 fichiers de `public/photos/` étaient la MÊME silhouette grise
//     « portrait indisponible » du site source, indexée comme un vrai
//     portrait — et gagnant contre le vrai visage rangé ailleurs.
//  2. 99 entrées de `photosMaj.ts` pointaient sur un fichier absent (`.webp`
//     annoncé, `-removebg-preview.png` sur le disque) : image cassée.
//  3. Les noms ne concordent pas d'un fichier à l'autre (« Aaron GRANDIDIER »
//     contre `aaron_grandidier_nkanang`, « Gaël DRÉAN » contre `gal_drean`) :
//     `photoReelle` ne trouvait rien alors que la photo était là.
//
// Lancer : npx vite-node scripts/verifPhotosCartes.ts
// Réparer : node scripts/nettoyerPhotos.cjs && node scripts/copierPhotosJoueurs.cjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { photoReelle } from '../src/lib/avatars';
import { PHOTO_JOUEUR } from '../src/data/photosJoueurs';
import { PHOTO_JOUEUR_MAJ } from '../src/data/photosMaj';
import { PHOTOS_NEW_MAJ } from '../src/data/photosNewMaj';
import { LNR_MAJ } from '../src/data/lnrMaj';
import { EFFECTIFS_REELS } from '../src/data/effectifsReels';
import { COMPETITIONS_REELLES } from '../src/data/mondeReel';

const PUBLIC = path.resolve('public');
const SILHOUETTE = '5bb34e3ef5ec20cd45a57ae140406cf0';
const empreintes = new Map<string, string | null>();
function empreinte(url: string): string | null {
  if (empreintes.has(url)) return empreintes.get(url)!;
  let valeur: string | null = null;
  try { valeur = crypto.createHash('md5').update(fs.readFileSync(path.join(PUBLIC, decodeURIComponent(url).replace(/^\//, '')))).digest('hex'); } catch { valeur = null; }
  empreintes.set(url, valeur);
  return valeur;
}

// ── 1. Aucun index ne promet un fichier qui n'existe pas ──────────────────
const index: [string, Record<string, string>][] = [
  ['photosJoueurs.ts', PHOTO_JOUEUR],
  ['photosMaj.ts', PHOTO_JOUEUR_MAJ],
  ['photosNewMaj.ts', PHOTOS_NEW_MAJ],
  ['lnrMaj.ts', Object.fromEntries(Object.entries(LNR_MAJ).filter(([, v]) => v.photo).map(([k, v]) => [k, v.photo!]))],
];
for (const [nom, table] of index) {
  const absents = Object.entries(table).filter(([, url]) => empreinte(url) === null);
  const grises = Object.entries(table).filter(([, url]) => empreinte(url) === SILHOUETTE);
  assert.equal(absents.length, 0, `${nom} : ${absents.length} portrait(s) absent(s) du disque, ex. ${absents[0]?.join(' → ')}`);
  assert.equal(grises.length, 0, `${nom} : ${grises.length} entrée(s) sur la silhouette grise, ex. ${grises[0]?.join(' → ')}`);
}

// ── 2. Une seule silhouette dans le dossier, et elle n'a pas de nom de joueur ─
// Elle reste le repli à l'écran (`CarteJoueurEnLigne`) : ce qu'on interdit,
// c'est qu'elle se fasse passer pour le portrait de quelqu'un.
const REPLI = '/photos/silhouette.webp';
assert.equal(empreinte(REPLI), SILHOUETTE, 'public/photos/silhouette.webp manquant : c’est le repli des cartes sans portrait.');
let fichiers = 0;
for (const dossier of ['photos', 'photos/maj', 'photos/new maj']) {
  for (const fichier of fs.readdirSync(path.join(PUBLIC, dossier))) {
    if (!/\.(webp|png|jpe?g)$/i.test(fichier)) continue;
    fichiers++;
    const url = `/${dossier}/${fichier}`;
    if (url === REPLI) continue;
    assert.notEqual(empreinte(url), SILHOUETTE, `${dossier}/${fichier} est la silhouette grise sous un nom de joueur : lancer scripts/nettoyerPhotos.cjs`);
  }
}

// ── 3. Les rapprochements de noms qui ont coûté cher ──────────────────────
// Chacun a été vu gris à l'écran ; chacun a sa règle dans `lib/avatars.ts`.
const attendus: [string, string][] = [
  ['Will SKELTON', '/photos/william_skelton.webp'],          // prénom d'usage
  ['Aaron GRANDIDIER', '/photos/aaron_grandidier_nkanang.webp'], // nom composé tronqué
  ['Levani BOTIA', '/photos/levani_botia_veivuke.webp'],
  ['Dany PRISO', '/photos/dany_priso_mouangue.webp'],
  ['Santiago ARATA', '/photos/santiago_arata_perrone.webp'],
  ["David AINU'U", '/photos/david_ainuu.webp'],              // apostrophe recollée
  ['Gaël DRÉAN', '/photos/gal_drean.webp'],                  // lettre accentuée mangée
  ['Jérémy SINZELLE', '/photos/jrmy_sinzelle.webp'],
  ['Léon BOULIER', '/photos/lon_boulier.webp'],
  ['Tom STANIFORTH', '/photos/thomas_staniforth.webp'],      // prénom + initiale
  ['Thibaut MOTASSI', '/photos/thibaut_robert_motassi_dibongue.webp'], // deux mots du nom
];
for (const [nom, url] of attendus) assert.equal(photoReelle(nom), url, `photoReelle(${nom})`);

// ⚠️ ET CE QU'IL NE FAUT SURTOUT PAS RAPPROCHER. Le nom de famille seul
// donnait à ces joueurs le visage d'un homonyme : une carte au mauvais visage
// est pire qu'une carte sans visage.
for (const nom of ['Sacha ELISSALDE', 'Louis VERMEULEN', 'Mako VUNIPOLA', 'Jean-Luc DU PREEZ', 'Hugo GONZÁLEZ', 'Reece HODGE']) {
  assert.equal(photoReelle(nom), undefined, `photoReelle(${nom}) doit rester sans visage plutôt que d'en emprunter un`);
}

// ── 4. La couverture du Top 14, celle que le joueur voit sur le marché ────
const top14 = COMPETITIONS_REELLES.find((c) => c.id === 'top14')!;
let effectif = 0;
let avecPhoto = 0;
for (const club of top14.clubs) {
  for (const joueur of EFFECTIFS_REELS[club.nom] ?? []) {
    effectif++;
    const url = photoReelle(joueur.nom);
    if (!url) continue;
    assert.notEqual(empreinte(url), null, `${joueur.nom} : portrait annoncé mais absent (${url})`);
    avecPhoto++;
  }
}
const couverture = Math.round((avecPhoto / effectif) * 100);
// Mesuré à 88 % le 7 septembre 2026 (594 sur 677) ; c'était 84 % avant, dont
// 22 fausses photos grises. Les 83 restants n'ont AUCUN portrait sur le disque.
assert.ok(couverture >= 86, `couverture Top 14 tombée à ${couverture} % (${avecPhoto}/${effectif})`);

console.log(`OK portraits : ${fichiers} fichiers sans silhouette, 4 index sans lien mort, Top 14 couvert à ${couverture} % (${avecPhoto}/${effectif}).`);
