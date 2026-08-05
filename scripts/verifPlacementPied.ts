// VÉRIFICATION — LE PLACEMENT SUR LA LARGEUR ET LES RÈGLES DU JEU AU PIED
//
// Deux retours de jeu explicites :
//   1. « les joueurs sont en ligne mais sur le bas et du coup ça fait un nuage
//      de joueurs » → les cibles en largeur étaient RABOTÉES par `bornerY` :
//      dès que le ballon approchait d'une touche, six joueurs se voyaient
//      assigner exactement la même valeur. Elles sont maintenant RÉPARTIES.
//   2. « des fois les joueurs reculent trop et se retrouvent dans leur en-but »
//      → les cibles n'étaient bornées que sur la largeur, jamais sur la
//      longueur. `bornerX` s'en charge, sauf pour un chasseur lancé.
//   3. « trop de coups de pied », « les 50/22 marchent pas » → le 50/22 est
//      désormais lu sur la GÉOMÉTRIE (parti de son camp, sorti en touche dans
//      les 22 adverses = touche pour le botteur), et la touche directe depuis
//      l'extérieur de ses 22 se rejoue à l'endroit du coup de pied.
//
// Lancer : npx vite-node scripts/verifPlacementPied.ts

import { creerMatch, avancer, DT } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { LARGEUR, LIGNE_A, LIGNE_B } from '../src/lib/moteur/terrain';
import type { Pion } from '../src/lib/moteur/entites';

const AFFICHES: [string, string][] = [
  ['Stade Toulousain', 'RC Vannes'],
  ['Union Bordeaux Bègles', 'Castres Olympique'],
  ['US Montauban', 'CA Brive'],
  ['SC Albi', 'Rouen Normandie Rugby'],
  ['Section Paloise', 'Aviron Bayonnais'],
  ['USON Nevers', 'Stade Aurillacois'],
];

function plusGrosTas(points: { x: number; y: number }[], rayon = 8): number {
  let max = 0;
  for (const p of points) {
    let n = 0;
    for (const q of points) {
      const dx = p.x - q.x; const dy = p.y - q.y;
      if (dx * dx + dy * dy < rayon * rayon) n++;
    }
    if (n > max) max = n;
  }
  return max;
}

let ticks = 0;
let echantillons = 0;
let ciblesEnBut = 0;
let posEnBut = 0;
let ciblesCollees = 0;
let sommeTasCible = 0;
let pireTasCible = 0;
const tousLesTas: number[] = [];
const commentaires: string[] = [];
let matchs = 0;

for (const [dom, ext] of AFFICHES) {
  const e = creerMatch(dom, ext, effectifDuClub(dom, 1), effectifDuClub(ext, 1), 27, 20, `pied#${dom}`);
  let garde = 0;
  // ⚠️ On ne relève qu'à partir de la 3ᵉ image de jeu courant. Sur l'image où la
  // mêlée se termine, la phase est déjà « jeu courant » mais les cibles sont
  // encore celles de la formation : c'est un artefact de mesure d'UNE image
  // (0,15 s), pas un défaut de placement — à l'écran, la mêlée est encore là.
  let depuisReprise = 0;
  while (!e.fini && garde++ < 60_000) {
    avancer(e, DT);
    if (e.phase !== 'jeuCourant') { depuisReprise = 0; continue; }
    depuisReprise++;
    if (depuisReprise < 3 || garde % 20 !== 0) continue;
    ticks++;
    const sur: Pion[] = e.pions.filter((p) => p.surLeTerrain && p.sanction <= 0);
    const tas = plusGrosTas(sur.map((p) => p.cible));
    sommeTasCible += tas;
    tousLesTas.push(tas);
    if (tas > pireTasCible) pireTasCible = tas;
    for (const p of sur) {
      echantillons++;
      if (p.pos.x < LIGNE_A || p.pos.x > LIGNE_B) posEnBut++;
      if (p.cible.x < LIGNE_A || p.cible.x > LIGNE_B) ciblesEnBut++;
      if (p.cible.y <= 4 || p.cible.y >= LARGEUR - 4) ciblesCollees++;
    }
  }
  matchs++;
  for (const c of e.commentaires) commentaires.push(c.texte);
}

const pc = (n: number, d: number) => (d ? (n / d) * 100 : 0);
const compte = (motif: string) => commentaires.filter((t) => t.includes(motif)).length / matchs;

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(46)} ${valeur}`);
}

console.log(`=== PLACEMENT (${matchs} matchs, ${ticks} relevés en jeu courant) ===`);
ligne('cibles dans un en-but', pc(ciblesEnBut, echantillons).toFixed(1) + ' % (< 1,5 %)',
  pc(ciblesEnBut, echantillons) < 1.5);
ligne('positions dans un en-but', pc(posEnBut, echantillons).toFixed(1) + ' % (< 3 %)',
  pc(posEnBut, echantillons) < 3);
ligne('cibles à moins de 4 m d’une touche', pc(ciblesCollees, echantillons).toFixed(1) + ' % (< 10 %)',
  pc(ciblesCollees, echantillons) < 10);
ligne('plus gros tas de cibles (rayon 8 m), moyenne',
  (sommeTasCible / ticks).toFixed(1) + ' joueurs (< 8)', sommeTasCible / ticks < 8);
// ⚠️ On juge sur le 95ᵉ CENTILE, pas sur le maximum. Autour d'un ruck, cinq
// attaquants au nettoyage, le demi de mêlée, les deux gardiens du couloir et
// les défenseurs qui arrivent tiennent bel et bien dans un cercle de 8 m : le
// maximum ponctuel n'est pas un défaut de placement. Ce qui faisait le
// « nuage », c'est que ces valeurs-là étaient la NORME.
// Mesuré avant correction : moyenne 9,7 · 95ᵉ centile 17 · maximum 25.
const trie = [...tousLesTas].sort((a, b) => a - b);
const p95 = trie[Math.floor(trie.length * 0.95)] ?? 0;
ligne('plus gros tas de cibles, 95ᵉ centile',
  p95 + ' joueurs (≤ 12)', p95 <= 12);
console.log(`  ℹ️  maximum ponctuel (regroupement) : ${pireTasCible} joueurs`);

console.log('\n=== JEU AU PIED ET RÈGLES DE TOUCHE ===');
const cinquante = compte('50/22');
const sansGain = compte('pas de gain de terrain');
const degagements = compte('dégage') + compte('trouve la touche');
ligne('50/22 (tentés + réussis) par match', cinquante.toFixed(1) + ' (0 à 3)', cinquante <= 3);
ligne('50/22 vus au moins une fois', cinquante > 0 ? 'oui' : 'jamais', cinquante > 0);
ligne('touche directe sans gain de terrain, par match',
  sansGain.toFixed(1) + ' (> 0)', sansGain > 0);
ligne('dégagements trouvant la touche, par match', degagements.toFixed(1) + ' (> 2)', degagements > 2);

console.log(`\n${echecs === 0 ? '✅ Tout est conforme.' : `❌ ${echecs} contrôle(s) en échec.`}`);
