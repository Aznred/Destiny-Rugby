// LE TEMPS DE JEU QU'UN JOUEUR PEUT RÉCLAMER — Correctif 33
//
// Retour de jeu : « des joueurs blessés râlent de ne pas avoir joué ». Le vestiaire rapportait les feuilles de match
// d'un joueur à TOUS les matchs du club : huit semaines à l'infirmerie comptaient comme huit matchs où l'entraîneur
// ne l'avait pas choisi. Sa satisfaction baissait pendant sa blessure, sa demande partait à son retour (ou pendant,
// par le canal des messages, qui ne regardait même pas s'il était disponible), une promesse de temps de jeu était
// « rompue » pendant qu'il était en soins, et son contrat se dégradait pour la même raison.
//
// ⚠️ UNE SEULE DÉFINITION, lue par les cinq endroits qui jugent le temps de jeu (satisfaction du vestiaire, discussion,
// message du joueur, promesse, contrat) : un match ne compte contre l'entraîneur que si le joueur POUVAIT le jouer.
// Blessé, en reprise sans avoir joué, ou parti en sélection : ce match n'existe pas pour lui.
//
// Module pur : ni store, ni DOM, ni tirage.

import type { Manager } from '../types.js';
import type { EtatCarriereAvancee } from './carriereAvancee.js';

/** On ne se plaint pas avant d'avoir laissé sa chance au manager : cinq matchs que le joueur POUVAIT jouer. */
export const MATCHS_AVANT_DE_SE_PLAINDRE = 5;

type Sante = Pick<EtatCarriereAvancee, 'medical' | 'convocations' | 'profilsMedicaux'>;

/** Un dossier médical encore ouvert : suspicion, diagnostic, guérison ou reprise (les anciens dossiers n'ont que `semaines`). */
export function dossierMedicalOuvert(a: Pick<Sante, 'medical'> | undefined, joueurId: string): boolean {
  return Boolean(a?.medical.some((d) => d.joueurId === joueurId && (d.phase ?? (d.semaines > 0 ? 'diagnostic' : 'clos')) !== 'clos'));
}

/**
 * Blessé, en convalescence ou en sélection cette semaine.
 * ⚠️ PLUS LARGE QUE « NON SÉLECTIONNABLE » : un joueur autorisé à vingt minutes de reprise est sélectionnable, mais il
 * ne peut pas reprocher à son entraîneur de ménager son retour. Tant que le dossier est ouvert, il ne réclame rien.
 */
export function horsDEtatDeJouer(a: Pick<Sante, 'medical' | 'convocations'> | undefined, joueurId: string, semaine: number): boolean {
  if (!a) return false;
  return dossierMedicalOuvert(a, joueurId)
    || a.convocations.some((c) => c.joueurId === joueurId && semaine >= c.debut && semaine <= c.fin);
}

/** Les matchs de la saison que le joueur n'a pas pu jouer (blessure, convalescence, sélection). */
export function matchsEmpeches(a: Pick<Sante, 'profilsMedicaux'> | undefined, joueurId: string, saison: number): number {
  const ligne = a?.profilsMedicaux[joueurId]?.disponibilites?.find((d) => d.saison === saison);
  if (!ligne) return 0;
  // `empeches` existe depuis le Correctif 33 ; avant, seules les absences complètes étaient comptées.
  return Math.max(0, ligne.empeches ?? ligne.possibles - ligne.disponibles);
}

export interface TempsDeJeuReclamable {
  /** Les matchs du club que le joueur pouvait jouer. */
  ouverts: number;
  /** Ses feuilles de match. */
  joues: number;
  /** Sa part de temps de jeu sur ces matchs-là ; `null` quand il n'a pu en jouer aucun (rien à lui reprocher, rien à réclamer). */
  part: number | null;
}

/** Ce que le joueur a joué, rapporté à ce qu'il POUVAIT jouer. */
export function tempsDeJeuReclamable(
  m: Pick<Manager, 'tempsDeJeu' | 'saison' | 'avancee'>, joueurId: string, matchsDuClub: number,
  sante: Pick<Sante, 'profilsMedicaux'> | undefined = m.avancee,
): TempsDeJeuReclamable {
  const joues = m.tempsDeJeu[joueurId] ?? 0;
  // Une feuille de match prouve que le match était ouvert, quoi qu'en dise le compte des absences.
  const ouverts = Math.max(joues, matchsDuClub - matchsEmpeches(sante, joueurId, m.saison));
  return { ouverts, joues, part: ouverts > 0 ? Math.min(1, joues / ouverts) : null };
}
