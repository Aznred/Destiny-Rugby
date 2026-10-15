/** Indices logiques → boutons physiques. Une permutation conserve toutes les commandes. */
export const BOUTONS_PAR_DEFAUT = Array.from({ length: 17 }, (_, i) => i);
export function assainirBoutons(brut: unknown): number[] {
  return Array.isArray(brut) && brut.length === 17 && new Set(brut).size === 17
    && brut[16] === 16 && brut.every(n => Number.isInteger(n) && n >= 0 && n < 17) ? [...brut] : [...BOUTONS_PAR_DEFAUT];
}
export function reassignerBouton(table: number[], action: number, bouton: number): number[] {
  const copie = assainirBoutons(table);
  const autre = copie.indexOf(bouton);
  if (autre < 0 || bouton === 16 || action < 0 || action >= 16) return copie;
  [copie[action], copie[autre]] = [copie[autre], copie[action]];
  return copie;
}
