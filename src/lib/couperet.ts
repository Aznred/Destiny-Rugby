// LE MATCH COUPERET — il faut un vainqueur (Correctifs 26 et 29)
//
// Phase finale d'une poule, tournoi final d'une division, coupe à élimination, match d'accès : aucun ne peut finir
// sur un nul, sinon le tableau n'a personne à faire avancer.
//
// ⚠️ C'EST LE RÈGLEMENT DE LA COMPÉTITION QUI LE DIT (`competitionRules.ts`, `allowDraw`), pas ce module. Un match
// JOUÉ (carrière joueur ou entraîneur) reçoit ce règlement à sa création (`departageDuMatch`) : à égalité à la
// sirène, le moteur enchaîne sur la prolongation — mêmes joueurs, même fatigue — puis, si l'égalité persiste, sur la
// procédure prévue (nombre d'essais, tirs au but). Son issue est inscrite ici par l'écran de match
// (`inscrireIssueJouee`) et relue par le store : le score annoncé au joueur est celui qui entre dans le tableau.
//
// Un match NON joué (résultat automatique, avance déléguée, anciennes sauvegardes) n'a pas de prolongation à
// montrer : `departager` garde alors son départage abstrait — trois points pour l'une des deux équipes, tirés une
// fois pour toutes de la clé de la rencontre.
//
// ⚠️ LE TYPE DE COMPÉTITION N'EMPÊCHE JAMAIS LA SIMULATION : rien ici ne s'exécute avant la sirène.

import { graine } from './championnat.js';
import { matchRules, type KnockoutRules } from './competitionRules.js';

/** La rencontre est-elle à élimination directe ? Sa clé le dit (préfixes posés par `afficheDuClub`). */
export function estMatchCouperet(cle: string): boolean {
  return /^(phase|coupe|acces|tournoi)#/.test(cle);
}

/**
 * Ce que le moteur doit jouer si la rencontre est à égalité à la sirène (`OptionsMatch.departage`).
 * `undefined` : le nul est permis.
 */
export function departageDuMatch(cle: string): { periodes: number; minutes: number; criteres: ('essais' | 'tirsAuBut')[] } | undefined {
  if (!estMatchCouperet(cle)) return undefined;
  const regles = matchRules(cle) as KnockoutRules;
  if (regles.allowDraw || !regles.extraTime || !regles.drawResolution.extraTime) return undefined;
  return { ...regles.drawResolution.extraTime, criteres: regles.drawResolution.thenCompetitionSpecificTiebreak };
}

/** L'issue d'un match couperet allé au-delà de la sirène, telle que le moteur l'a jouée. */
export interface IssueJouee {
  /** Le club vainqueur. */
  vainqueur: string;
  critere: 'prolongation' | 'essais' | 'tirsAuBut';
  /** Tirs au but réussis par le club vainqueur et par le battu. */
  tirs?: [number, number];
}

const ISSUES = new Map<string, IssueJouee>();

/** L'écran de match inscrit l'issue à la sirène, avant que le store n'enregistre le résultat. */
export function inscrireIssueJouee(cle: string, issue: IssueJouee | null): void {
  if (issue) ISSUES.set(cle, issue); else ISSUES.delete(cle);
}

export function issueJouee(cle: string): IssueJouee | undefined {
  return ISSUES.get(cle);
}

export interface Departage {
  scorePour: number;
  scoreContre: number;
  /** Vrai si le score était à égalité à la sirène et qu'il a fallu départager. */
  prolongation: boolean;
  /** L'issue jouée par le moteur, quand il y en a une. Le score peut alors rester à égalité : `vainqueur` tranche. */
  issue?: IssueJouee;
}

/**
 * Le score retenu pour une rencontre, vu de l'équipe « pour ». Une prolongation jouée est rendue telle quelle avec
 * son issue ; un nul couperet sans prolongation jouée reçoit ses trois points de départage ; tout autre score est
 * rendu tel quel.
 */
export function departager(cle: string, scorePour: number, scoreContre: number): Departage {
  if (!estMatchCouperet(cle)) return { scorePour, scoreContre, prolongation: false };
  const issue = ISSUES.get(cle);
  if (issue) return { scorePour, scoreContre, prolongation: true, issue };
  if (scorePour !== scoreContre) return { scorePour, scoreContre, prolongation: false };
  const victoire = graine(`departage#${cle}`)() < 0.5;
  return {
    scorePour: scorePour + (victoire ? 3 : 0),
    scoreContre: scoreContre + (victoire ? 0 : 3),
    prolongation: true,
  };
}
