// L'ENDURANCE, MESURÉE MINUTE PAR MINUTE — Correctif 23 (`moteur/endurance.ts`).
//
// Le joueur se plaignait d'être « pratiquement vidé avant la mi-temps » en Régionale. Ce banc joue des matchs de
// carrière 3D (dix minutes d'écran, quatre-vingts d'horloge) et relève, aux minutes 20, 40, 60 et 78, l'endurance
// générale moyenne des titulaires encore sur le terrain, leur barre de sprint, et la part de temps passée essoufflée.
// Il joue aussi un titulaire CONDUIT par un pilote qui sprinte dès qu'il y a de l'espace, comme le ferait un joueur.
//
// Lancer : npm run mesure:endurance -- 12 [ia] [niveau : regionale|pro]
import { avancer, creerMatch, DT } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { COMPETITIONS } from '../src/data/clubs';
import { activerDirect, commanderDirect } from '../src/lib/moteur/direct';
import type { EtatMatch } from '../src/lib/moteur/etat';
import { REGLAGES_ENDURANCE } from '../src/lib/moteur/endurance';
import { IA_MATCH_DE_CARRIERE } from '../src/lib/moteur/ia/reglages';

const N = Number(process.argv[2] ?? 6);
const IA = process.argv[3] ? Number(process.argv[3]) : IA_MATCH_DE_CARRIERE;
const NIVEAU = process.argv[4] ?? 'regionale';
const reg = COMPETITIONS.find((c) => c.id === 'reg1')!.clubs;
const PAIRES: [string, string][] = NIVEAU === 'pro'
  ? [['Stade Toulousain', 'RC Toulon'], ['Stade Rochelais', 'Racing 92'], ['Union Bordeaux-Bègles', 'ASM Clermont'], ['Castres Olympique', 'Section Paloise']]
  : [[reg[0].nom, reg[1].nom], [reg[2].nom, reg[3].nom], [reg[4].nom, reg[5].nom], [reg[6].nom, reg[7].nom]];
const ESSAI = process.argv.find((a) => a.startsWith('--regl='));
if (ESSAI) for (const kv of ESSAI.slice(7).split(',')) { const [k, v] = kv.split(':'); (REGLAGES_ENDURANCE as Record<string, number>)[k] = Number(v); }

const JALONS = [20, 40, 60, 78];
const moy = (l: number[]) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : NaN);

interface Releve { gen: number[][]; avants: number[][]; sprint: number[]; essouffle: number; essais: number; humain: number[][]; sprintsHumain: number; }

function jouer(k: number, conduit: boolean): Releve {
  const [a, b] = PAIRES[k % PAIRES.length];
  const effA = effectifDuClub(a, 1);
  const moi = effA[3];
  const e = creerMatch(a, b, effA, effectifDuClub(b, 1), 24, 20, `endurance-${k}`,
    conduit ? { club: a, nom: moi.nom, poste: moi.poste, titulaire: true } : undefined,
    { niveau: NIVEAU === 'pro' ? 'pro' : 'amateur', scoreSurTerrain: true, cadenceDetaillee: true, placementJoue: true, ia: IA, controle: conduit });
  e.carriereDixMinutes = true;
  const r: Releve = { gen: JALONS.map(() => []), avants: JALONS.map(() => []), sprint: [], essouffle: 0, essais: 0, humain: JALONS.map(() => []), sprintsHumain: 0 };
  const vus = new Set<number>();
  let echant = 0, ess = 0;
  const derniere = new Map<string, number>();
  e.apresPas = (m: EtatMatch) => {
    for (const p of m.pions) if (p.surLeTerrain && Number(p.id.slice(1)) < 15) derniere.set(p.id, p.endurance);
    JALONS.forEach((j, i) => {
      if (m.minute >= j && !vus.has(j)) {
        vus.add(j);
        // Les quinze de départ, même ceux qui sont sortis : leur dernière valeur (sinon on ne mesure que les rescapés).
        for (const p of m.pions) {
          const index = Number(p.id.slice(1));
          if (index >= 15) continue;
          const v = p.surLeTerrain ? p.endurance : (derniere.get(p.id) ?? p.endurance);
          (p.avant ? r.avants[i] : r.gen[i]).push(v);
          if (p.moi) r.humain[i].push(v);
        }
      }
    });
    for (const p of m.pions) {
      if (!p.surLeTerrain || p.numero > 15) continue;
      r.sprint.push(p.sprint); echant++; if (p.essoufle) ess++;
    }
    if (m.direct?.actif) {
      const h = m.pions.find((p) => p.moi);
      if (h && h.essoufle) r.sprintsHumain += 1;
    }
  };
  if (conduit) activerDirect(e, true);
  let garde = 0;
  while (!e.fini && garde++ < 400000) {
    if (conduit) {
      const h = e.pions.find((p) => p.moi)!;
      // Un pilote qui court vers le ballon à fond dès que le jeu est ouvert, puis souffle.
      const ouvert = e.phase === 'jeuCourant' || e.phase === 'ballonEnLAir' || e.phase === 'ballonLibre';
      if (ouvert && h.surLeTerrain) {
        const dx = e.ballon.x - h.pos.x, dy = e.ballon.y - h.pos.y, d = Math.hypot(dx, dy) || 1;
        commanderDirect(e, dx / d, dy / d, d > 6);
      } else commanderDirect(e, 0, 0, false);
    }
    avancer(e, DT * 4);
  }
  r.essouffle = echant ? ess / echant : 0;
  r.essais = e.essaisA + e.essaisB;
  return r;
}

for (const conduit of [false, true]) {
  const releves: Releve[] = [];
  for (let k = 0; k < N; k++) releves.push(jouer(k, conduit));
  const lignes = JALONS.map((j, i) => `${j}ᵉ : trois-quarts ${moy(releves.flatMap((r) => r.gen[i])).toFixed(0)} · avants ${moy(releves.flatMap((r) => r.avants[i])).toFixed(0)}`
    + (conduit ? ` · conduit ${moy(releves.flatMap((r) => r.humain[i])).toFixed(0)}` : ''));
  console.log(`\n${conduit ? 'UN TITULAIRE CONDUIT (sprinte vers le ballon)' : 'TOUT À L\'IA'} — ${NIVEAU}, ia ${IA}, ${N} matchs`);
  console.log(lignes.join('\n'));
  console.log(`barre de sprint moyenne ${moy(releves.flatMap((r) => r.sprint)).toFixed(0)} · essoufflés ${(moy(releves.map((r) => r.essouffle)) * 100).toFixed(1)} % du temps · essais ${moy(releves.map((r) => r.essais)).toFixed(1)}`);
  if (conduit) console.log(`pas de jeu du joueur conduit passés essoufflé : ${moy(releves.map((r) => r.sprintsHumain)).toFixed(0)}`);
}
