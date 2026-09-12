import { EVALUATION_ALLRUGBY } from '../data/evaluationsAllRugby.js';
import { EVALUATION_JOUEUR_MAJ } from '../data/evaluationsJoueursMaj.js';

export const normaliserIdentiteJoueur = (nom: string): string => nom.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Une évaluation ne peut que revaloriser un joueur : les notes éditoriales et
 * le relevé AllRugby sont des planchers, jamais une raison d'écraser une note
 * déjà mieux calibrée dans l'effectif d'origine.
 */
export function noteJoueurRevalorisee(nom: string, noteOrigine: number): number {
  const cle = normaliserIdentiteJoueur(nom);
  return Math.max(
    30,
    noteOrigine,
    EVALUATION_JOUEUR_MAJ[cle]?.note ?? 0,
    EVALUATION_ALLRUGBY[cle]?.note ?? 0,
  );
}
