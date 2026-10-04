import { competitionDuClub } from '../data/clubs.js';

/** Notes initiales estimées, avec un chevauchement limité entre deux étages. */
export const ECHELLE_NOTES_FFR: Record<string, { min: number; max: number; ancienneBase: number }> = {
  nationale: { min: 55, max: 65, ancienneBase: 65 },
  nationale2: { min: 48, max: 58, ancienneBase: 61 },
  fed1: { min: 42, max: 51, ancienneBase: 56 },
  fed2: { min: 37, max: 45, ancienneBase: 51 },
  fed3: { min: 33, max: 40, ancienneBase: 47 },
  reg1: { min: 30, max: 35, ancienneBase: 43 },
  reg2: { min: 27, max: 32, ancienneBase: 39 },
  reg3: { min: 24, max: 29, ancienneBase: 35 },
};

export function echelleFfrDuClub(club: string) {
  return ECHELLE_NOTES_FFR[competitionDuClub(club)?.id ?? ''];
}

/** Conserve les écarts individuels, sur une échelle commune aux deux modes. */
export function recalibrerNoteFfr(club: string, note: number, initiale = true, ancienneBase?: number): number {
  const echelle = echelleFfrDuClub(club);
  if (!echelle) return note;
  const centre = (echelle.min + echelle.max) / 2;
  const valeur = Math.round(centre + (note - (ancienneBase ?? echelle.ancienneBase)) * (echelle.max - echelle.min) / 14);
  return initiale ? Math.max(echelle.min, Math.min(echelle.max, valeur)) : Math.max(20, Math.min(97, valeur));
}

export function bornerNoteInitialeFfr(club: string, note: number): number {
  const echelle = echelleFfrDuClub(club);
  return echelle ? Math.max(echelle.min, Math.min(echelle.max, note)) : note;
}
