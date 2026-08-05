// VÉRIFICATION — LES DIVISIONS GARDENT LEUR TAILLE
//
// Retour de jeu : « je me retrouve dans un Top 14 avec 16 équipes au lieu de 14
// et la Pro D2 à 14 équipes ». Cause : la fin de saison était calculée DEUX fois
// (avec et sans l'apport du joueur), les deux listes de mouvements étaient
// fusionnées en dédoublonnant par nom de club, et quand les deux calculs ne
// désignaient pas le même champion, LES DEUX montaient.
//
// Ici on rejoue douze saisons de suite, en incarnant un joueur de Pro D2 avec un
// apport non nul (c'est ce qui faisait diverger les deux calculs), et on vérifie
// après chaque saison que chaque division a exactement le nombre de clubs
// qu'elle avait au départ.
//
// Lancer : npx vite-node scripts/verifPyramide.ts

import { COMPETITIONS } from '../src/data/clubs';
import { clubsDeDivision, setMouvementsClubs } from '../src/lib/divisions';
import {
  resoudrePyramide, resoudreToutesDivisions, oublierResultats,
  equilibrerMouvements, setContexteJoueur,
} from '../src/lib/promotion';

const PYRAMIDE = ['top14', 'prod2', 'nationale', 'nationale2', 'fed1', 'fed2', 'fed3', 'reg1', 'reg2', 'reg3'];
const TAILLES = new Map<string, number>();
for (const id of PYRAMIDE) {
  TAILLES.set(id, COMPETITIONS.find((c) => c.id === id)?.clubs.length ?? 0);
}

let echecs = 0;
function verifier(saison: number): void {
  for (const id of PYRAMIDE) {
    const attendu = TAILLES.get(id) ?? 0;
    const reel = clubsDeDivision(id).length;
    if (reel !== attendu) {
      echecs++;
      console.log(`  ❌ saison ${saison} — ${id} : ${reel} clubs au lieu de ${attendu}`);
    }
  }
}

// Le joueur évolue en Pro D2 et pèse sur les résultats de son club.
let club = 'US Montauban';
let division = 'prod2';
const mouvements: Record<string, string> = {};

console.log('=== DOUZE SAISONS DE PYRAMIDE FRANÇAISE ===');
console.log(`  départ : ${[...TAILLES].map(([k, v]) => `${k} ${v}`).join(' · ')}`);

for (let saison = 1; saison <= 12; saison++) {
  const py = resoudrePyramide(division, saison, club, 1.4);
  const complete = resoudreToutesDivisions(saison);
  const liste = equilibrerMouvements([
    ...py.mouvements,
    ...complete.mouvements.filter((m) => !py.mouvements.some((p) => p.club === m.club)),
  ]);
  for (const m of liste) mouvements[m.club] = m.vers;
  setMouvementsClubs({ ...mouvements });
  oublierResultats();
  const sien = liste.find((m) => m.club === club);
  if (sien) division = sien.vers;
  verifier(saison);
}

console.log(`  arrivée : ${PYRAMIDE.map((id) => `${id} ${clubsDeDivision(id).length}`).join(' · ')}`);
console.log(`  le club du joueur (${club}) termine en ${division}`);

// Contrôle complémentaire : sans le garde-fou, le déséquilibre serait visible.
// On vérifie donc aussi que `equilibrerMouvements` sait rattraper un cas tordu.
const bancal = equilibrerMouvements([
  { club: 'A', de: 'prod2', vers: 'top14', sens: 'montee', motif: 'champion' },
  { club: 'B', de: 'prod2', vers: 'top14', sens: 'montee', motif: 'champion' },
  { club: 'C', de: 'top14', vers: 'prod2', sens: 'descente', motif: 'dernier' },
]);
const ok = bancal.length === 2 && bancal.every((m) => m.club !== 'B');
if (!ok) echecs++;
console.log(`  ${ok ? '✅' : '❌'} deux montées pour une descente : la seconde est annulée`);

setContexteJoueur('', 0);
console.log(echecs === 0 ? '\n✅ Toutes les divisions gardent leur taille.' : `\n❌ ${echecs} écart(s).`);
