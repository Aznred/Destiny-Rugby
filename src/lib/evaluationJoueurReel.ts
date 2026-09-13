import { EVALUATION_ALLRUGBY, PROFIL_POSTES_ALLRUGBY } from '../data/evaluationsAllRugby.js';
import { EVALUATION_JOUEUR_MAJ } from '../data/evaluationsJoueursMaj.js';
import { posteDepuisFamille } from '../data/rugby.js';
import type { FamillePoste, PosteId } from '../types.js';

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

function grainePoste(nom: string): number {
  let valeur = 2166136261;
  for (const caractere of normaliserIdentiteJoueur(nom)) {
    valeur ^= caractere.charCodeAt(0);
    valeur = Math.imul(valeur, 16777619);
  }
  return valeur >>> 0;
}

/** Poste exact observé sur AllRugby, avec un repli varié mais déterministe. */
export function postesJoueurReel(
  nom: string, familleOrigine: FamillePoste,
): { poste: PosteId; postesSecondaires: PosteId[] } {
  const profil = PROFIL_POSTES_ALLRUGBY[normaliserIdentiteJoueur(nom)];
  if (profil) {
    return {
      poste: profil.postePrincipal,
      postesSecondaires: [...profil.postesSecondaires],
    };
  }
  return { poste: posteDepuisFamille(familleOrigine, grainePoste(nom)), postesSecondaires: [] };
}
