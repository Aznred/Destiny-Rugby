// CE QUE RAPPORTE CHAQUE JEU — le détail derrière `mesurerRugby.ts`.
//
// Pour chaque jeu choisi par le demi de mêlée (cellule, écran, large, petit
// côté, coup de pied…) : combien de fois, les mètres gagnés jusqu'au
// regroupement suivant, et comment le temps de jeu se termine — essai, ruck,
// ballon perdu, pénalité, coup de pied. C'est ce qui dit QUEL jeu produit les
// essais, et lequel ne mène nulle part.
//
// Lancer : npx vite-node scripts/mesurerJeux.ts 24 [ia]
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import type { EtatMatch } from '../src/lib/moteur/etat';
import { sens } from '../src/lib/moteur/terrain';
import { REGLAGES_IA } from '../src/lib/moteur/ia/reglages';

const PAIRES: [string, string][] = [
  ['Stade Toulousain', 'RC Toulon'], ['Stade Rochelais', 'Racing 92'], ['Union Bordeaux-Bègles', 'ASM Clermont'],
  ['Castres Olympique', 'Section Paloise'], ['Racing 92', 'Stade Toulousain'], ['ASM Clermont', 'Castres Olympique'],
];
const N = Number(process.argv[2] ?? 24);
const IA = Number(process.argv[3] ?? 2);
/** --ligue : quatre-vingts minutes réelles, comme un match de ligue en règles 3. */
const LIGUE = process.argv.includes('--ligue');
const ESSAI = process.argv.find((a) => a.startsWith('--reglages='));
if (ESSAI) for (const paire of ESSAI.slice('--reglages='.length).split(',')) { const [cle, valeur] = paire.split(':'); (REGLAGES_IA as Record<string, number>)[cle] = Number(valeur); }

interface Bilan { n: number; metres: number; essais: number; rucks: number; perdus: number; penalitesPour: number; penalitesContre: number; pieds: number; touches: number; zoneMarque: number }
const bilans: Record<string, Bilan> = {};
const bilan = (jeu: string): Bilan => bilans[jeu] ??= { n: 0, metres: 0, essais: 0, rucks: 0, perdus: 0, penalitesPour: 0, penalitesContre: 0, pieds: 0, touches: 0, zoneMarque: 0 };
// Comment se terminent les possessions qui entrent dans les 22 adverses.
const entrees = { n: 0, essais: 0, penalites: 0, perdus: 0, autres: 0 };
// Vitesse des ballons de ruck, et ce qui suit.
const rucks = { eclair: 0, rapide: 0, lent: 0, gainEclair: 0, gainRapide: 0, gainLent: 0 };
// D'où partent les possessions, et celles qui finissent par un essai : origine, nombre de temps de jeu.
const origines: Record<string, { n: number; essais: number }> = {};
const tempsDeJeu: Record<string, number> = {};
const departs: Record<string, number> = {};

for (let k = 0; k < N; k++) {
  const [a, b] = PAIRES[k % PAIRES.length];
  const e = creerMatch(a, b, effectifDuClub(a, 1), effectifDuClub(b, 1), 24, 20, `rugby-${k}`, undefined,
    { niveau: 'pro', scoreSurTerrain: true, cadenceDetaillee: true, placementJoue: true, ia: IA, ...(LIGUE ? { tempsReel: true, resserrement: 1 } : {}) } as never);
  if (!LIGUE) e.carriereDixMinutes = true;
  let courant: { jeu: string; cote: string; depart: number; ruck: 'eclair' | 'rapide' | 'lent' | null } | null = null;
  let lancementPrec: unknown = null, phasePrec = '', essais = 0, penalites = 0, dernierRuck: 'eclair' | 'rapide' | 'lent' | null = null;
  let dansLes22: string | null = null;
  let origine = 'coupEnvoi', possPrec: string = e.possession, arretPrec = 'coupEnvoi', departX = 61;
  const noter = (o: string, essai: boolean) => { const b = origines[o] ??= { n: 0, essais: 0 }; if (essai) b.essais++; else b.n++; };
  const clore = (m: EtatMatch, fin: keyof Bilan | 'rien') => {
    if (!courant) return;
    const bl = bilan(courant.jeu);
    const gain = (m.ballon.x - courant.depart) * sens(courant.cote as 'A' | 'B');
    bl.n++; bl.metres += fin === 'pieds' ? 0 : gain;
    if (fin !== 'rien') (bl[fin] as number)++;
    if (courant.ruck && fin !== 'pieds') {
      rucks[courant.ruck]++;
      rucks[courant.ruck === 'eclair' ? 'gainEclair' : courant.ruck === 'rapide' ? 'gainRapide' : 'gainLent'] += gain;
    }
    courant = null;
  };
  e.apresPas = (m: EtatMatch) => {
    const nEssais = m.essaisA + m.essaisB;
    const nPen = m.commentaires.reduce((s, c) => s + (c.type === 'penalite' ? 1 : 0), 0);
    if (m.phase === 'ruck' && phasePrec !== 'ruck' && m.ruck) {
      dernierRuck = (m.ruck as { eclair?: boolean }).eclair ? 'eclair' : m.ballonLent ? 'lent' : 'rapide';
    }
    // Une nouvelle possession : après un arrêt, ou quand le ballon change de camp dans le jeu.
    const arretes = ['melee', 'touche', 'coupEnvoi', 'renvoi22', 'penalite'];
    if (arretes.includes(m.phase) && phasePrec !== m.phase) arretPrec = m.phase;
    if (m.phase === 'jeuCourant' && phasePrec !== 'jeuCourant' && arretes.includes(phasePrec)) { origine = phasePrec === 'coupEnvoi' || phasePrec === 'renvoi22' ? 'réception de renvoi' : phasePrec; noter(origine, false); departX = (m.possession === 'A' ? 111 - m.ballon.x : m.ballon.x - 11); }
    else if (m.possession !== possPrec && (m.phase === 'jeuCourant' || m.phase === 'ruck')) { origine = phasePrec === 'ballonEnLAir' || phasePrec === 'ballonLibre' ? 'réception de coup de pied' : 'ballon récupéré'; noter(origine, false); departX = (m.possession === 'A' ? 111 - m.ballon.x : m.ballon.x - 11); }
    possPrec = m.possession;
    if (nEssais > essais) {
      noter(origine, true);
      const n = m.phasesDepuisArret; const cle = n === 0 ? 'en première main' : n <= 2 ? '1-2 rucks' : n <= 5 ? '3-5 rucks' : '6 et plus';
      tempsDeJeu[cle] = (tempsDeJeu[cle] ?? 0) + 1;
      const d = departX > 78 ? 'de ses 22' : departX > 50 ? 'de son camp' : departX > 22 ? 'du camp adverse' : 'des 22 adverses';
      departs[d] = (departs[d] ?? 0) + 1;
    }
    void arretPrec;
    if (nEssais > essais) { clore(m, 'essais'); if (dansLes22) { entrees.essais++; dansLes22 = null; } }
    else if (nPen > penalites) {
      const pour = m.penalite?.pour;
      if (courant) clore(m, pour === courant.cote ? 'penalitesPour' : 'penalitesContre');
      if (dansLes22) { if (pour === dansLes22) entrees.penalites++; else entrees.perdus++; dansLes22 = null; }
    } else if (courant && m.possession !== courant.cote) { clore(m, m.phase === 'ballonEnLAir' || phasePrec === 'ballonEnLAir' ? 'pieds' : 'perdus'); if (dansLes22) { entrees.perdus++; dansLes22 = null; } }
    else if (courant && m.phase === 'ruck' && phasePrec !== 'ruck') clore(m, 'rucks');
    else if (courant && m.phase === 'ballonEnLAir' && phasePrec !== 'ballonEnLAir') clore(m, 'pieds');
    else if (courant && (m.phase === 'touche' || m.phase === 'melee') && phasePrec !== m.phase) { clore(m, 'touches'); if (dansLes22) { entrees.autres++; dansLes22 = null; } }
    essais = nEssais; penalites = nPen;
    if (m.lancement && m.lancement !== lancementPrec && m.phase === 'jeuCourant') {
      const jeu = (m.lancement as { jeu?: string }).jeu ?? m.lancement.structure ?? m.lancement.type;
      courant = { jeu, cote: m.possession, depart: m.ballon.x, ruck: dernierRuck };
      dernierRuck = null;
      const restant = (m.possession === 'A' ? 111 - m.ballon.x : m.ballon.x - 11);
      if (restant < 22) { bilan(jeu).zoneMarque++; if (!dansLes22) { dansLes22 = m.possession; entrees.n++; } }
    }
    lancementPrec = m.lancement; phasePrec = m.phase;
  };
  let garde = 0;
  while (!e.fini && garde++ < 200000) avancer(e, 0.6);
}

const f = (n: number, d = 1) => n.toFixed(d);
console.log(`\n${N} matchs de carrière 3D, IA ${IA} — par jeu : nombre par match, mètres gagnés, puis ce qui termine le temps de jeu (%)`);
console.log('jeu'.padEnd(13) + 'n/match  mètres  essai  ruck  perdu  pén.+  pén.−  pied  arrêt  dans les 22');
for (const [jeu, b] of Object.entries(bilans).sort((x, y) => y[1].n - x[1].n)) {
  const p = (n: number) => f(100 * n / b.n, 0).padStart(4) + ' %';
  console.log(jeu.padEnd(13) + f(b.n / N).padStart(6) + f(b.metres / b.n).padStart(8) + p(b.essais) + p(b.rucks) + p(b.perdus) + p(b.penalitesPour) + p(b.penalitesContre) + p(b.pieds) + p(b.touches) + f(b.zoneMarque / N).padStart(8));
}
console.log(`\nEntrées dans les 22 adverses : ${f(entrees.n / N)} par match → essai ${f(100 * entrees.essais / entrees.n, 0)} %, pénalité obtenue ${f(100 * entrees.penalites / entrees.n, 0)} %, ballon perdu ${f(100 * entrees.perdus / entrees.n, 0)} %, arrêt ${f(100 * entrees.autres / entrees.n, 0)} %`);
console.log('Possessions par match et part qui finit en essai : ' + Object.entries(origines).sort((x, y) => y[1].n - x[1].n).map(([o, b]) => `${o} ${f(b.n / N)} (${f(100 * b.essais / Math.max(1, b.n), 0)} %)`).join(', '));
const totalEssais = Object.values(tempsDeJeu).reduce((s, n) => s + n, 0);
console.log('Essais marqués : ' + Object.entries(tempsDeJeu).map(([c, n]) => `${c} ${f(100 * n / totalEssais, 0)} %`).join(', ') + ' ; possession partie ' + Object.entries(departs).map(([c, n]) => `${c} ${f(100 * n / totalEssais, 0)} %`).join(', '));
console.log(`Ballons de ruck par match : éclair ${f(rucks.eclair / N)} (${f(rucks.gainEclair / Math.max(1, rucks.eclair))} m au temps suivant), rapide ${f(rucks.rapide / N)} (${f(rucks.gainRapide / Math.max(1, rucks.rapide))} m), lent ${f(rucks.lent / N)} (${f(rucks.gainLent / Math.max(1, rucks.lent))} m)`);
