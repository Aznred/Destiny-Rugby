/** Une division est un niveau ; une poule reste un championnat indépendant de seize clubs. */
export const CLUBS_PAR_POULE = 16;
export const DIVISIONS_MAX = 10;
export const poulesMaximum = (division: number) => division >= DIVISIONS_MAX ? Infinity : 2 ** (division - 1);
export const capaciteDivision = (division: number) => CLUBS_PAR_POULE * poulesMaximum(division);

/** Les anciennes D1, D2, D3… étaient en réalité des numéros de poule. Leurs identités restent intactes. */
export function positionPoule(indice: number): { division: number; poule: number } {
  const n = Math.max(1, Math.floor(indice));
  const division = Math.min(DIVISIONS_MAX, Math.floor(Math.log2(n)) + 1);
  return { division, poule: n - (2 ** (division - 1) - 1) };
}
export function positionPublique(publique: { division: number; poule?: number }) {
  return publique.poule ? { division: publique.division, poule: publique.poule } : positionPoule(publique.division);
}
export const indicePoule = (publique: { division: number; poule?: number }) => {
  const p = positionPublique(publique);
  return 2 ** (p.division - 1) - 1 + p.poule;
};
export const nomPoulePublique = (p: { division: number; poule: number }) =>
  `Destiny Rugby · Division ${p.division}${p.division === 1 ? '' : ` · Poule ${p.poule}`}`;

export interface EloPublic { valeur: number; joues: number; victoires: number; nuls: number; defaites: number }
export const eloInitial = (): EloPublic => ({ valeur: 1500, joues: 0, victoires: 0, nuls: 0, defaites: 0 });

/** Seuils publics des promotions exceptionnelles : uniquement le champion d'une poule ayant joué. */
export function monteeMaximum(rang: number, joues: number, victoires: number, difference: number, elo: number, eloMoyen: number) {
  if (rang !== 1 || joues < 10 || victoires / joues < .85 || difference / joues < 14) return 1;
  return elo - eloMoyen >= 200 && victoires / joues >= .9 ? 3 : 2;
}
