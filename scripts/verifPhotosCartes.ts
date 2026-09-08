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
// Il couvre aussi les 1 830 portraits du Japon et du Super Rugby Pacific,
// rapatriés par `scripts/importerPhotosMondiales.cjs`.
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
import { PHOTO_JOUEUR_MONDE } from '../src/data/photosMonde';
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
  ['photosMonde.ts', PHOTO_JOUEUR_MONDE],
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
for (const dossier of ['photos', 'photos/maj', 'photos/new maj', 'photos/monde']) {
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
  // Les deux championnats apportés par rugby_players.json.
  ['Ardie SAVEA', '/photos/monde/jpn_ardie_savea.webp'],
  ['Anton LIENERT-BROWN', '/photos/monde/jpn_anton_lienert_brown.webp'],
];
for (const [nom, url] of attendus) assert.equal(photoReelle(nom), url, `photoReelle(${nom})`);

// ⚠️ ET CE QU'IL NE FAUT SURTOUT PAS RAPPROCHER. Le nom de famille seul
// donnait à ces joueurs le visage d'un homonyme : une carte au mauvais visage
// est pire qu'une carte sans visage.
// « Mako » n'est pas « Manu » : depuis l'arrivée des portraits japonais, les
// deux Vunipola se croisaient sur le même nom de famille et la même initiale.
for (const nom of ['Sacha ELISSALDE', 'Louis VERMEULEN', 'Mako VUNIPOLA', 'Jean-Luc DU PREEZ', 'Hugo GONZÁLEZ', 'Reece HODGE']) {
  assert.equal(photoReelle(nom), undefined, `photoReelle(${nom}) doit rester sans visage plutôt que d'en emprunter un`);
}

// ── 4. La couverture, celle que le joueur voit sur le marché ──────────────
function couvertureDe(idCompetition: string): { couverture: number; avec: number; total: number } {
  const competition = COMPETITIONS_REELLES.find((c) => c.id === idCompetition);
  assert.ok(competition, `compétition ${idCompetition} introuvable`);
  let total = 0;
  let avec = 0;
  for (const club of competition.clubs) {
    for (const joueur of EFFECTIFS_REELS[club.nom] ?? []) {
      total++;
      const url = photoReelle(joueur.nom);
      if (!url) continue;
      assert.notEqual(empreinte(url), null, `${joueur.nom} : portrait annoncé mais absent (${url})`);
      avec++;
    }
  }
  return { couverture: Math.round((avec / total) * 100), avec, total };
}

// Mesuré le 8 septembre 2026. Top 14 : 88 % (594/677) — c'était 84 % avant, dont
// 22 fausses photos grises ; les 83 restants n'ont AUCUN portrait sur le disque.
// Japon et Super Rugby : apportés par `rugby_players.json` (voir
// scripts/importerPhotosMondiales.cjs). Le Super Rugby plafonne parce que la
// source ne contient AUCUN joueur des Blues et que Moana Pasifika n'y est pas.
const seuils: [string, number][] = [['top14', 86], ['japon1', 90], ['super', 70]];
const mesures = seuils.map(([id, seuil]) => {
  const mesure = couvertureDe(id);
  assert.ok(mesure.couverture >= seuil, `couverture ${id} tombée à ${mesure.couverture} % (${mesure.avec}/${mesure.total}), seuil ${seuil} %`);
  return `${id} ${mesure.couverture} %`;
});

console.log(`OK portraits : ${fichiers} fichiers sans silhouette, ${index.length} index sans lien mort, couverture ${mesures.join(' · ')}.`);
