/** Gestion physique solo ; les trois niveaux ne modifient ni notes, ni progression, ni adversaires. */
export const DIFFICULTES_CARRIERE = ['facile', 'moyen', 'difficile'] as const;
export type DifficulteCarriere = typeof DIFFICULTES_CARRIERE[number];
export const DIFFICULTE_CARRIERE_DEFAUT: DifficulteCarriere = 'moyen';
export const BAREMES_FORME = {
  facile: { coutMatch: 10, recuperation: 12 },
  moyen: { coutMatch: 18, recuperation: 10 },
  difficile: { coutMatch: 24, recuperation: 8 },
} as const;
export function normaliserDifficulteCarriere(valeur: unknown): DifficulteCarriere {
  return DIFFICULTES_CARRIERE.includes(valeur as DifficulteCarriere) ? valeur as DifficulteCarriere : DIFFICULTE_CARRIERE_DEFAUT;
}
/** Minutes réelles, prolongation comprise. Un remplaçant inutilisé ne paie rien. */
export function coutFormeMatch(minutes: number, difficulte?: DifficulteCarriere, intensite = 1): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.round(BAREMES_FORME[normaliserDifficulteCarriere(difficulte)].coutMatch
    * Math.min(120, minutes) / 80 * Math.max(.8, Math.min(1.25, intensite)));
}
/** Une vraie semaine de repos restaure la condition ; charger l'entraînement ralentit ce retour. */
export function recuperationConditionManager(charge: number, recuperation: number, difficulte?: DifficulteCarriere): number {
  const base = BAREMES_FORME[normaliserDifficulteCarriere(difficulte)].recuperation;
  return Math.max(2, Math.round(base + (recuperation - 2) * 1.5 - Math.max(0, charge - 5) * .9));
}
