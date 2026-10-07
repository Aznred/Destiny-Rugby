// LE MATCH COUPERET — il faut un vainqueur (Correctif 26)
//
// Phase finale d'une poule, tournoi final d'une division, coupe à élimination, match d'accès : aucun ne peut finir
// sur un nul, sinon le tableau n'a personne à faire avancer. Le moteur joue quatre-vingts minutes comme pour
// n'importe quel match ; si le score est à égalité à la sirène, la prolongation est tranchée ICI — trois points
// (pénalité ou drop) pour l'une des deux équipes, décidés une fois pour toutes par la clé de la rencontre.
//
// ⚠️ UNE SEULE DÉFINITION, lue par le store (carrière joueur ET entraîneur) et par l'écran de fin de match : le
// score annoncé au joueur est celui qui entre dans le tableau. Elle vivait en double dans le store, et l'écran de
// fin affichait encore « 17-17 » alors que le tableau retenait « 20-17 ».
//
// ⚠️ LE TYPE DE COMPÉTITION N'EMPÊCHE JAMAIS LA SIMULATION : rien ici ne s'exécute avant la sirène.

import { graine } from './championnat.js';

/** La rencontre est-elle à élimination directe ? Sa clé le dit (préfixes posés par `afficheDuClub`). */
export function estMatchCouperet(cle: string): boolean {
  return /^(phase|coupe|acces|tournoi)#/.test(cle);
}

export interface Departage {
  scorePour: number;
  scoreContre: number;
  /** Vrai si le score était à égalité et qu'une prolongation l'a tranché. */
  prolongation: boolean;
}

/**
 * Le score retenu pour une rencontre, vu de l'équipe « pour ». Un nul en match couperet reçoit ses trois points de
 * prolongation ; tout autre score est rendu tel quel.
 */
export function departager(cle: string, scorePour: number, scoreContre: number): Departage {
  if (!estMatchCouperet(cle) || scorePour !== scoreContre) return { scorePour, scoreContre, prolongation: false };
  const victoire = graine(`departage#${cle}`)() < 0.5;
  return {
    scorePour: scorePour + (victoire ? 3 : 0),
    scoreContre: scoreContre + (victoire ? 0 : 3),
    prolongation: true,
  };
}
