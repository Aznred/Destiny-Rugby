import type { Manager, TransfertAnnonce } from '../types.js';
import { competitionEffective } from './divisions.js';
import { salaryCap } from './economie.js';
import { budgetsDuClub, situationSalariale } from './recrutementManager.js';

export const REPORT_TRANSFERTS = 0.28;
export const REPORT_SALARIAL = 0.20;

/** Rembourse uniquement les anciens débits salariaux imputés au banc courant. */
export function reparerPlafondSalarial(m: Manager, transferts: TransfertAnnonce[]): number {
  const dernierAutreClub = m.historique.findLast((s) => s.club !== m.club)?.saison ?? 0;
  const remboursement = m.recrues.reduce((total, r) => {
    const auClub = r.saison > dernierAutreClub && transferts.some((t) => t.nom === r.joueur.nom
      && t.de === r.joueur.club && t.vers === m.club && t.saison === r.saison);
    return total + (auClub ? r.termes.salaire * REPORT_SALARIAL ** Math.max(0, m.saison - r.saison) : 0);
  }, 0);
  return situationSalariale({ ...m, budgetSalarial: m.budgetSalarial + Math.round(remboursement) }).plafond;
}

/** Les mêmes reports alimentent l'écran et la clôture de saison. */
export function reportsBudgets(m: Manager) {
  return {
    transferts: Math.round(Math.max(0, m.budgetTransferts) * REPORT_TRANSFERTS),
    salarial: Math.round(Math.max(0, situationSalariale(m).disponible) * REPORT_SALARIAL),
    structure: Math.max(0, m.budgetStructure),
  };
}

export function renouvelerBudgets(
  m: Manager, dotation: ReturnType<typeof budgetsDuClub>,
  indemnitesFormation: number, revenusMarketing: number,
  reports = reportsBudgets(m),
) {
  const cap = salaryCap(competitionEffective(m.club)?.niveau ?? 8);
  return {
    budgetTransferts: dotation.transferts + reports.transferts + Math.round(indemnitesFormation + revenusMarketing * .35),
    budgetSalarial: Math.min(cap ?? Infinity, dotation.salarial + reports.salarial),
    budgetStructure: dotation.structure + reports.structure + Math.round(revenusMarketing * .15),
  };
}
