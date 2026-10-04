// LES RÈGLES DU MOTEUR EN LIGUE, MESURÉES CÔTE À CÔTE.
//
// Un match de ligue en temps réel, joué avec le moteur d'origine (« normal »),
// en cadence détaillée seule, puis en règles 2 (« joue » : cadence détaillée,
// placement joué, défense resserrée). Pour chacun : points, essais et pénalités
// par match, joueurs déplacés d'un coup par le moteur, durée des attentes de
// placement, coût d'une rejoue complète.
//
// ⚠️ À RELANCER AVANT DE TOUCHER À `RESSERREMENT_REGLES_2` ou au moteur détaillé :
// c'est ce qui dit si les scores de la ligue ont bougé.
//
// Lancer : npm run mesure:regles-ligue -- 24 normal,joue 1
//          (matchs par règle, règles à comparer, resserrement des règles 2)
import { avancer, creerMatch, DT } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import type { EtatMatch } from '../src/lib/moteur/etat';

const PAIRES: [string, string][] = [
  ['Stade Toulousain', 'RC Toulon'], ['Stade Rochelais', 'Racing 92'], ['Union Bordeaux-Bègles', 'ASM Clermont'],
  ['Castres Olympique', 'Section Paloise'],
];
const N = Number(process.argv[2] ?? 12);
const MODES = (process.argv[3] ?? 'normal,detaille,joue').split(',');
const RESSERREMENT = Number(process.argv[4] ?? 0);

function jouer(mode: string, k: number) {
  const [a, b] = PAIRES[k % PAIRES.length];
  const cibles = [[24, 20], [31, 17], [18, 22], [27, 27]][k % 4];
  const e = creerMatch(a, b, effectifDuClub(a, 1), effectifDuClub(b, 1), cibles[0], cibles[1], `c7-${k}`, undefined,
    { tempsReel: true, niveau: 'pro', scoreSurTerrain: true, cadenceDetaillee: mode !== 'normal', placementJoue: mode === 'joue',
      resserrement: mode === 'joue' ? RESSERREMENT : 0 });
  const debut = performance.now();
  let sauts = 0, sautMax = 0;
  const sautsPar: Record<string, number> = {};
  const phases: Record<string, number> = {};
  const attentes: Record<string, { n: number; total: number; max: number }> = {};
  const avant = new Map<string, { x: number; y: number }>();
  let phasePrec = '', attenteDepuis = -1, attentePhase = '';
  e.apresPas = (m: EtatMatch) => {
    if (m.phase !== phasePrec) { phases[m.phase] = (phases[m.phase] ?? 0) + 1; }
    for (const p of m.pions) {
      if (!p.surLeTerrain || p.sanction > 0) { avant.delete(p.id); continue; }
      const q = avant.get(p.id);
      if (q) {
        const d = Math.hypot(p.pos.x - q.x, p.pos.y - q.y);
        // Un sprint couvre 1,5 m par pas : au-delà de 2,2 m, le joueur a été déplacé d'un coup.
        if (d > 2.2) { sauts++; sautMax = Math.max(sautMax, d); const cle = `${phasePrec}→${m.phase}`; sautsPar[cle] = (sautsPar[cle] ?? 0) + 1; }
      }
      avant.set(p.id, { x: p.pos.x, y: p.pos.y });
    }
    const a = m.attentePlacement;
    const attend = !!a && !a.pret && a.phase === m.phase;
    if (attend && attenteDepuis < 0) { attenteDepuis = m.sim; attentePhase = m.phase; }
    if (!attend && attenteDepuis >= 0) {
      const duree = m.sim - attenteDepuis;
      const s = attentes[attentePhase] ??= { n: 0, total: 0, max: 0 };
      s.n++; s.total += duree; s.max = Math.max(s.max, duree);
      attenteDepuis = -1;
    }
    phasePrec = m.phase;
  };
  let garde = 0;
  while (!e.fini && garde++ < 60000) avancer(e, 0.6);
  return { score: [e.scoreA, e.scoreB], essais: e.essaisA + e.essaisB, ms: performance.now() - debut, sauts, sautMax, sautsPar, phases, attentes, cibles, sim: e.sim, t: e.t,
    penalites: e.commentaires.filter(c => c.type === 'but' && c.points === 3).length, fini: e.fini };
}

for (const mode of MODES) {
  const r = Array.from({ length: N }, (_, k) => jouer(mode, k));
  const moy = (f: (x: typeof r[number]) => number) => (r.reduce((s, x) => s + f(x), 0) / r.length).toFixed(1);
  const cumul = (champ: 'phases' | 'sautsPar') => {
    const t: Record<string, number> = {};
    for (const x of r) for (const [p, n] of Object.entries(x[champ])) t[p] = (t[p] ?? 0) + n / r.length;
    return Object.entries(t).sort((a, b) => b[1] - a[1]);
  };
  console.log(`\n${mode.toUpperCase()} — ${N} matchs${mode === 'joue' ? ` (resserrement ${RESSERREMENT})` : ''}${r.every(x => x.fini) ? '' : ' ⚠️ MATCH NON TERMINÉ'}`);
  console.log(`  points par match ${moy(x => x.score[0] + x.score[1])} (cible ${moy(x => x.cibles[0] + x.cibles[1])}), essais ${moy(x => x.essais)}, pénalités réussies ${moy(x => x.penalites)}, ${moy(x => x.sim / 60)} min simulées`);
  console.log(`  coût ${moy(x => x.ms)} ms par match ; déplacés d'un coup (> 2,2 m en un pas) : ${moy(x => x.sauts)} par match, jusqu'à ${Math.max(...r.map(x => x.sautMax)).toFixed(0)} m`);
  console.log('  d\'où viennent-ils : ' + cumul('sautsPar').slice(0, 9).map(([p, n]) => `${p} ${n.toFixed(1)}`).join(', '));
  console.log('  phases par match : ' + cumul('phases').map(([p, n]) => `${p} ${n.toFixed(1)}`).join(', '));
  const att: Record<string, { n: number; total: number; max: number }> = {};
  for (const x of r) for (const [p, s] of Object.entries(x.attentes)) { const c = att[p] ??= { n: 0, total: 0, max: 0 }; c.n += s.n; c.total += s.total; c.max = Math.max(c.max, s.max); }
  if (Object.keys(att).length) console.log('  attentes de placement : ' + Object.entries(att).map(([p, s]) => `${p} ${(s.n / r.length).toFixed(1)}/match, ${(s.total / s.n).toFixed(1)} s en moyenne, ${s.max.toFixed(1)} s au plus`).join(' ; '));
  console.log('  scores : ' + r.map(x => x.score.join('-')).join(' '));
}
void DT;
