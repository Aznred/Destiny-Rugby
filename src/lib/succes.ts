// SUCCÈS ET DÉFIS — la mécanique (lot 7, point 24)
//
// `evaluerSucces` compare l'état de la carrière à la liste des succès et rend
// ceux qui viennent de tomber. Appelée après chaque action qui change quelque
// chose (semaine, saison, transfert, publication), elle ne peut pas décerner
// deux fois le même trophée.
//
// Les DÉFIS DE LA SEMAINE sont tirés au sort de façon déterministe : trois
// objectifs par semaine de jeu, les mêmes tant que la semaine ne change pas.

import { DEFIS, SUCCES, type ContexteSucces, type Defi, type Succes } from '../data/succes.js';
import type { SuccesDebloques } from '../types.js';
import { graine } from './championnat.js';

export function evaluerSucces(c: ContexteSucces, deja: SuccesDebloques): Succes[] {
  const nouveaux: Succes[] = [];
  for (const s of SUCCES) {
    if (deja[s.id] != null) continue;
    let ok = false;
    try {
      ok = s.atteint(c);
    } catch {
      ok = false; // une vieille sauvegarde incomplète ne doit rien casser
    }
    if (ok) nouveaux.push(s);
  }
  return nouveaux;
}

export function totalOvas(succes: Succes[]): number {
  return succes.reduce((a, s) => a + s.ovas, 0);
}

// Progression globale, pour la barre du panneau « Succès ».
export function progression(deja: SuccesDebloques): { faits: number; total: number } {
  return { faits: Object.keys(deja).length, total: SUCCES.length };
}

// Trois défis par semaine, tirés sans doublon.
export const DEFIS_PAR_SEMAINE = 3;

export function defisDeLaSemaine(saison: number, semaine: number): Defi[] {
  const rng = graine(`defis#${saison}#${semaine}`);
  const pool = [...DEFIS];
  const tires: Defi[] = [];
  for (let i = 0; i < DEFIS_PAR_SEMAINE && pool.length; i++) {
    tires.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return tires;
}

// Clé d'une semaine de jeu : sert à savoir si les défis affichés sont encore
// ceux qu'on est en train de relever.
export function cleSemaine(saison: number, semaine: number): string {
  return `${saison}#${semaine}`;
}
