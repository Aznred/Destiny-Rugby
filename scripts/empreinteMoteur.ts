// L'EMPREINTE DU MOTEUR — la preuve qu'une retouche n'a rien déplacé.
//
// Rejoue quelques matchs de carrière en trois dimensions (IA de niveau 3, cadence
// détaillée, un joueur incarné titulaire ou remplaçant) et résume ce que le moteur
// a produit en UNE empreinte par match : score, horloge, feuille de chaque pion,
// positions finales, longueur du fil. Deux exécutions du même moteur donnent
// exactement les mêmes empreintes ; une retouche qui change le jeu en change au
// moins une.
//
// C'est le garde-fou des correctifs qui ajoutent un mode PAR-DESSUS le moteur
// (le contrôle direct, par exemple) : tant que le mode est éteint, les empreintes
// d'avant et d'après doivent être identiques au caractère près.
//
// Lancer : npm run mesure:empreinte -- 6 [--detail]
import { empreinte, jouerPourEmpreinte, resumerMatch } from './outilsEmpreinte';

const N = Number(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 6);
const DETAIL = process.argv.includes('--detail');

const toutes: string[] = [];
for (let k = 0; k < N; k++) {
  const e = jouerPourEmpreinte(k);
  const h = empreinte(resumerMatch(e));
  toutes.push(h);
  console.log(`match ${k} · ${e.clubA} ${e.scoreA}-${e.scoreB} ${e.clubB} · ${e.essaisA + e.essaisB} essais · sim ${e.sim.toFixed(1)} s · empreinte ${h}`);
  if (DETAIL) console.log(resumerMatch(e).slice(0, 400));
}
console.log(`EMPREINTE GLOBALE ${empreinte(toutes.join('/'))}`);
