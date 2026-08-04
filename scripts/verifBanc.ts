// LA FEUILLE DE MATCH — le banc porte-t-il les bons maillots, au bon poste ?
//
// Deux bugs vus en jeu, vérifiés ici :
//   1. `creerPion` renvoyait le remplaçant au poste du maillot `index % 15` :
//      le demi de mêlée du banc jouait troisième ligne, le centre jouait n°8,
//      et les huit remplaçants étaient comptés comme des avants ;
//   2. `gererRemplacements` donnait à l'entrant le NUMÉRO du sortant : plus
//      aucun maillot de 16 à 23 n'apparaissait sur la feuille de match.

import { creerMatch, avancer, bilan } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { POSTE_PAR_ID } from '../src/data/rugby';

const AFFICHES: [string, string][] = [
  ['Stade Toulousain', 'Stade Rochelais'],
  ['Union Bordeaux Bègles', 'ASM Clermont Auvergne'],
  ['RC Vannes', 'USA Perpignan'],
];

let numerosHorsPlage = 0;
let entresMalNumerotes = 0;
let bancAvants = 0;
let bancTroisQuarts = 0;
let feuilleAberrante = 0;
let remplacementsHorsCategorie = 0;

console.log('=== 1. LA COMPOSITION DU BANC ===');
for (const [domicile, exterieur] of AFFICHES) {
  const e = creerMatch(
    domicile, exterieur,
    effectifDuClub(domicile, 1), effectifDuClub(exterieur, 1),
    27, 22, `banc#${domicile}#${exterieur}`,
  );

  const surLeBanc = e.pions.filter((p) => Number(p.id.slice(1)) >= 15);
  for (const p of surLeBanc) {
    const place = Number(p.id.slice(1));
    if (p.numero !== place + 1 || p.numero < 16 || p.numero > 23) numerosHorsPlage += 1;
    if (p.avant) bancAvants += 1; else bancTroisQuarts += 1;
  }
  console.log(`  ${domicile.padEnd(24)} ${surLeBanc
    .filter((p) => p.cote === 'A')
    .map((p) => `${p.numero} ${POSTE_PAR_ID[p.poste].nom}`)
    .join(' · ')}`);

  // --- le match, poussé jusqu'à la sirène ---
  let garde = 0;
  while (!e.fini && garde++ < 4000) avancer(e, 8);

  for (const p of surLeBanc) {
    if (p.minutes <= 0.3) continue;
    if (p.numero <= 15) entresMalNumerotes += 1;
    // Un remplaçant n'entre jamais dans l'autre catégorie : pas d'arrière
    // en pilier, pas de pilier à l'aile.
    const avantDeMaillot = POSTE_PAR_ID[p.poste].categorie === 'Avant';
    if (avantDeMaillot !== p.avant) remplacementsHorsCategorie += 1;
  }
  for (const j of bilan(e).parJoueur) {
    if (j.numero < 1 || j.numero > 23) feuilleAberrante += 1;
  }
}

console.log('\n=== 2. LES ENTRÉES EN JEU ===');
{
  const e = creerMatch(
    'Stade Toulousain', 'Stade Rochelais',
    effectifDuClub('Stade Toulousain', 1), effectifDuClub('Stade Rochelais', 1),
    31, 24, 'banc#detail',
  );
  let garde = 0;
  while (!e.fini && garde++ < 4000) avancer(e, 8);
  for (const p of e.pions.filter((x) => x.cote === 'A' && Number(x.id.slice(1)) >= 15 && x.minutes > 0.3)) {
    console.log(`  #${String(p.numero).padStart(2)} ${p.nom.padEnd(26)} ${POSTE_PAR_ID[p.poste].nom.padEnd(24)} ${Math.round(p.minutes)}′`);
  }
}

console.log('\n=== BILAN ===');
const ok = (nom: string, valeur: number) =>
  console.log(`  ${valeur === 0 ? '✅' : '❌'} ${nom} : ${valeur}`);
ok('maillots de banc hors 16-23', numerosHorsPlage);
ok('remplaçants entrés avec un maillot de titulaire', entresMalNumerotes);
ok('numéros aberrants sur la feuille de match', feuilleAberrante);
ok('remplaçants entrés dans la mauvaise catégorie', remplacementsHorsCategorie);
const total = bancAvants + bancTroisQuarts;
console.log(
  `  ${bancAvants === (total / 8) * 5 ? '✅' : '❌'} composition : ${bancAvants} avants / `
  + `${bancTroisQuarts} trois-quarts (attendu 5 et 3 par banc)`,
);
