import { resultatJoue, resultatsJouesDuTableau } from './championnat.js';
import { CALENDRIER } from '../data/calendrier.js';
import type { MatchFinal, TourFinal } from './phaseFinale.js';

export type CodeTour = 'ROUND_OF_64' | 'ROUND_OF_32' | 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL';
export const TOURS_ELIMINATION: Record<number, { code: CodeTour; tour: TourFinal; libelle: string }> = {
  64: { code: 'ROUND_OF_64', tour: 'trenteDeuxieme', libelle: '32es de finale' },
  32: { code: 'ROUND_OF_32', tour: 'seizieme', libelle: '16es de finale' },
  16: { code: 'ROUND_OF_16', tour: 'huitieme', libelle: '8es de finale' },
  8: { code: 'QUARTER_FINAL', tour: 'quart', libelle: 'Quarts de finale' },
  4: { code: 'SEMI_FINAL', tour: 'demie', libelle: 'Demi-finales' },
  2: { code: 'FINAL', tour: 'finale', libelle: 'Finale' },
};

export interface MatchElimination extends Omit<MatchFinal, 'scoreD' | 'scoreE' | 'vainqueur' | 'perdant'> {
  cle: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  scoreD: number | null;
  scoreE: number | null;
  vainqueur: string | null;
  perdant: string | null;
  qualifiedTeamId: string | null;
  codeTour?: CodeTour;
  semaine: number;
}

/** Les grands tableaux commencent plus tôt ; chaque tour a son propre samedi. */
export function semaineElimination(taille: number): number {
  if (!TOURS_ELIMINATION[taille]) throw new Error(`Taille de tour invalide : ${taille}`);
  return CALENDRIER.find(s => s.tourFinal === 'finale')!.numero - Math.log2(taille) + 1;
}

/** Lecture seule : aucun tirage de score ni de vainqueur pendant la construction. */
export function preparerElimination(
  domicile: string, exterieur: string, cle: string, tour: TourFinal, libelle: string,
  semaine: number, codeTour?: CodeTour, ancienneCle?: string,
): MatchElimination {
  const m: MatchElimination = { domicile, exterieur, cle, tour, libelle, semaine, codeTour,
    status: 'scheduled', scoreD: null, scoreE: null, vainqueur: null, perdant: null, qualifiedTeamId: null };
  const reel = resultatJoue(cle) ?? (ancienneCle ? resultatJoue(ancienneCle) : undefined);
  if (!reel) return m;
  if (reel.domicile !== domicile || reel.exterieur !== exterieur
    || !Number.isFinite(reel.scoreD) || !Number.isFinite(reel.scoreE) || reel.scoreD < 0 || reel.scoreE < 0) {
    throw new Error(`Résultat incohérent dans le tableau : ${cle}`);
  }
  // Un nul sans procédure de départage n'autorise jamais le tour suivant.
  if (reel.scoreD === reel.scoreE && !reel.vainqueurDesigne) return { ...m, status: 'in_progress' };
  const recoit = reel.vainqueurDesigne ? reel.vainqueurDesigne === 'D' : reel.scoreD > reel.scoreE;
  return { ...m, status: 'completed', scoreD: reel.scoreD, scoreE: reel.scoreE,
    vainqueur: recoit ? domicile : exterieur, perdant: recoit ? exterieur : domicile,
    qualifiedTeamId: recoit ? domicile : exterieur, prolongation: reel.prolongation, tirsAuBut: reel.tirsAuBut };
}

export function vainqueursDuTour(matchs: MatchElimination[], participants: string[]): string[] | null {
  if (new Set(participants).size !== participants.length || matchs.length * 2 !== participants.length) {
    throw new Error('Tableau invalide : nombre de rencontres ou clubs en double.');
  }
  const engages = matchs.flatMap(m => [m.domicile, m.exterieur]);
  if (new Set(engages).size !== participants.length || engages.some(c => !participants.includes(c))) {
    throw new Error('Tableau invalide : un club a disparu ou joue plusieurs rencontres.');
  }
  if (matchs.some(m => m.status !== 'completed')) return null;
  const vainqueurs = matchs.map(m => m.vainqueur!);
  if (vainqueurs.some((c, i) => !c || ![matchs[i].domicile, matchs[i].exterieur].includes(c))
    || new Set(vainqueurs).size !== participants.length / 2) {
    throw new Error('Tableau invalide : nombre de qualifiés incohérent.');
  }
  return vainqueurs;
}

export function construireBracket(qualifies: string[], prefixe: string): MatchElimination[] {
  if (!TOURS_ELIMINATION[qualifies.length] || new Set(qualifies).size !== qualifies.length) {
    throw new Error('Tableau invalide : qualifications non uniques ou taille non prise en charge.');
  }
  const matchs: MatchElimination[] = [];
  let participants = [...qualifies];
  while (participants.length >= 2) {
    const taille = participants.length;
    const { code, tour, libelle } = TOURS_ELIMINATION[taille];
    // Une ancienne carrière peut avoir joué un croisement différent : on conserve les vrais matchs
    // uniquement quand les deux clubs se sont effectivement qualifiés au tour précédent.
    const anciens = resultatsJouesDuTableau(`${prefixe}#${taille}`);
    const paires: [string, string][] = [];
    const utilises = new Set<string>();
    for (const { match } of anciens) {
      const { domicile: a, exterieur: b } = match;
      if (!participants.includes(a) || !participants.includes(b) || a === b || utilises.has(a) || utilises.has(b)) continue;
      paires.push([a, b]); utilises.add(a); utilises.add(b);
    }
    const restants = participants.filter(c => !utilises.has(c));
    for (let i = 0; i < restants.length / 2; i++) paires.push([restants[i], restants[restants.length - 1 - i]]);
    paires.sort((a, b) => Math.min(...a.map(c => participants.indexOf(c))) - Math.min(...b.map(c => participants.indexOf(c))));
    const rencontres = paires.map(([a, b]) => {
      return preparerElimination(a, b, `${prefixe}#${taille}#${a}#${b}`, tour,
        `${libelle} : ${a} - ${b}`, semaineElimination(taille), code);
    });
    matchs.push(...rencontres);
    const suivants = vainqueursDuTour(rencontres, participants);
    if (!suivants) break;
    // L'ordre des rencontres est conservé : aucun nouveau tri par force ne change les croisements.
    participants = suivants;
  }
  return matchs;
}
