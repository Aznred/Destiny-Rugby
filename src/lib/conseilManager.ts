import type { Manager } from '../types.js';
import type { Coequipier } from './effectif.js';
import { evaluerObjectif } from './objectifsManager.js';
import { situationSalariale } from './recrutementManager.js';
import { pouleDe } from './championnat.js';

export interface SuiviConseil {
  club: string;
  score: number;
  detail: { sportif: number; objectifs: number; finances: number; groupe: number };
  avertissement?: { saison: number; debut: number; cible: number; matchs: number; victoires: number; termine?: boolean };
  offre?: { club: string; saison: number; duree: number; salaire: number; budgetBonus: number };
  decision?: 'prolongation' | 'attente' | 'nonRenouvele' | 'licencie' | 'accepte';
  motif?: string;
  depart?: { club: string; saison: number };
}
const borne = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
export function evaluerConseil(m: Manager, effectif: Coequipier[], rang?: number, final = false) {
  const matchs = Object.values(m.resultats).filter(r => r.club === m.club && r.saison === m.saison);
  const recents = matchs.slice(-10);
  const clubs = Math.max(2, pouleDe(m.division, m.club).length);
  const attendu = Math.max(.2, Math.min(.75, 1 - m.objectif / clubs));
  const taux = recents.length ? recents.reduce((n, r) => n + (r.scorePour > r.scoreContre ? 1 : r.scorePour === r.scoreContre ? .5 : 0), 0) / recents.length : attendu;
  const resultats = borne(60 + (taux - attendu) * 90);
  const classement = rang ? borne(68 + (m.objectif - rang) * 9) : 60;
  const precedent = m.historique.filter(h => h.club === m.club && h.division === m.division).at(-1);
  const progression = precedent && rang ? Math.max(-8, Math.min(8, (precedent.rang - rang) * 2)) : 0;
  const sportif = borne(resultats * .4 + classement * .6 + progression);
  const secondaires = (m.avancee?.objectifs ?? []).filter(o => o.indicateur !== 'classement');
  const progressionSaison = final ? 1 : Math.max(.15, Math.min(1, matchs.length / Math.max(8, (clubs - 1) * 2)));
  const objectifs = secondaires.length ? borne(secondaires.reduce((n, o) => {
    const v = evaluerObjectif(o, m, effectif, rang, final);
    const instantane = ['masseSalariale', 'reserveTransferts', 'locaux'].includes(o.indicateur);
    return n + Math.min(100, v.pourcentage / (instantane ? 1 : progressionSaison)) * o.importance;
  }, 0) / secondaires.reduce((n, o) => n + o.importance, 0)) : 60;
  const salaires = situationSalariale(m);
  const finances = m.budgetTransferts < 0 || m.budgetStructure < 0 ? 15 : salaires.engagee > salaires.plafond ? 35 : 85;
  const profils = effectif.map(j => m.avancee?.vestiaire[j.id]).filter(p => !!p);
  const groupe = profils.length ? borne(profils.reduce((n, p) => n + p.moral, 0) / profils.length) : 65;
  const score = borne(sportif * .65 + objectifs * .2 + finances * .1 + groupe * .05);
  return { score, detail: { sportif, objectifs, finances, groupe }, matchs: matchs.length, victoires: matchs.filter(r => r.scorePour > r.scoreContre).length };
}
/** Au moins huit matchs d'observation puis cinq matchs pour répondre à l'avertissement. */
export function suivreConseil(m: Manager, effectif: Coequipier[], rang?: number): { conseil: SuiviConseil; confiance: number; licencie: boolean; nouveauMessage?: string } {
  const bilan = evaluerConseil(m, effectif, rang);
  const precedent = m.conseil?.club === m.club ? m.conseil : undefined;
  const delta = Math.max(-3, Math.min(3, Math.round((bilan.score - m.confiance) * .18)));
  let confiance = borne(m.confiance + delta);
  let avertissement = precedent?.avertissement;
  let nouveauMessage: string | undefined;
  const matchs = Object.values(m.resultats).filter(r => r.club === m.club && r.saison === m.saison);
  if (avertissement && !avertissement.termine && avertissement.saison === m.saison) {
    const suite = matchs.slice(avertissement.debut, avertissement.debut + 5);
    avertissement = { ...avertissement, matchs: suite.length, victoires: suite.filter(r => r.scorePour > r.scoreContre).length };
    if (suite.length >= 5 && avertissement.victoires >= avertissement.cible) {
      avertissement.termine = true;
      confiance = Math.max(40, confiance);
      nouveauMessage = 'Le conseil constate la réaction attendue et lève son avertissement.';
    }
  }
  if (!avertissement && bilan.matchs >= 8 && confiance <= 35 && bilan.score < 40) {
    avertissement = { saison: m.saison, debut: bilan.matchs, cible: 2, matchs: 0, victoires: 0 };
    nouveauMessage = 'Le conseil commence à s’inquiéter de vos résultats. Objectif sur les 5 prochains matchs : obtenir au moins 2 victoires.';
  }
  const licencie = !!avertissement && !avertissement.termine && avertissement.saison === m.saison && avertissement.matchs >= 5
    && avertissement.victoires < avertissement.cible && confiance <= 25 && bilan.score < 40;
  const conseil: SuiviConseil = { ...precedent, club: m.club, score: bilan.score, detail: bilan.detail, avertissement,
    ...(licencie ? { decision: 'licencie', motif: 'Après une longue série de mauvais résultats, l’objectif de réaction n’a pas été atteint.', depart: { club: m.club, saison: m.saison }, offre: undefined } : {}),
  };
  return { conseil, confiance, licencie, nouveauMessage };
}
/** Seul le conseil émet une offre, après le bilan complet. Jamais d'années ajoutées par un clic. */
export function bilanContrat(m: Manager, effectif: Coequipier[], rang: number): SuiviConseil {
  const b = evaluerConseil(m, effectif, rang, true);
  const expire = (m.contrat?.saisons ?? 0) <= 1;
  const gravementManque = rang - m.objectif >= 4;
  const suivi: SuiviConseil = { club: m.club, score: b.score, detail: b.detail, depart: m.conseil?.depart };
  if (expire && (b.score < 50 || gravementManque)) return { ...suivi, decision: 'nonRenouvele',
    motif: `Le club ne souhaite pas renouveler votre contrat : ${rang}e pour un objectif top ${m.objectif}, bilan ${b.score}/100.`, depart: { club: m.club, saison: m.saison + 1 } };
  if (expire) {
    const excellente = b.score >= 75 && rang <= m.objectif;
    return { ...suivi, decision: 'prolongation', motif: 'Le conseil propose une prolongation après l’évaluation de la saison.',
      offre: { club: m.club, saison: m.saison + 1, duree: excellente ? 3 : 2,
        salaire: Math.round((m.contrat?.salaire ?? 0) * (excellente ? 1.15 : 1.05) / 1000) * 1000,
        budgetBonus: excellente ? .1 : 0 } };
  }
  return { ...suivi, decision: 'attente', motif: 'Le contrat se poursuit. Le renouvellement sera évalué à son échéance.' };
}
export function accepterProlongation(m: Manager): { contrat: Manager['contrat']; conseil: SuiviConseil | undefined; budgetBonus: number } {
  const offre = m.conseil?.offre;
  if (!offre || offre.club !== m.club || offre.saison !== m.saison || (m.contrat?.saisons ?? 0) > 0) return { contrat: m.contrat, conseil: m.conseil, budgetBonus: 0 };
  return { contrat: { saisons: offre.duree, salaire: offre.salaire }, conseil: { ...m.conseil!, offre: undefined, decision: 'accepte', motif: `Prolongation signée pour ${offre.duree} saisons. Les objectifs sont réévalués chaque été.` }, budgetBonus: offre.budgetBonus };
}
