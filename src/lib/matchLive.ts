// LE MATCH DE LA SEMAINE — quelle affiche ton club dispute-t-il ce week-end ?
//
// ⚠️ Ce fichier ne SIMULE plus rien. L'ancien système « narratif » (décomposer
// le score en actions, puis les raconter minute par minute) a été entièrement
// remplacé par le moteur tick par tick de `lib/moteur/` : trente entités qui se
// déplacent en mètres, des plaquages par collision, des essais qui naissent
// d'un espace réellement ouvert. Il ne reste ici que la recherche de l'affiche.

import {
  calendrier, journeesALaSemaine, jouerRencontre, nombreJournees, pouleDe,
  type MatchChampionnat,
} from './championnat';
import type { Coequipier } from './effectif';
import { POSTE_PAR_ID } from '../data/rugby';
import type { Joueur, PosteId } from '../types';

export interface AfficheSemaine {
  journee: number;
  match: MatchChampionnat;
  cle: string;
}

export interface CarriereDeClub {
  division: string;
  club: string;
  saison: number;
  semaine: number;
}

export function matchDuClubSemaine(c: CarriereDeClub, bonus = 0): AfficheSemaine | null {
  const division = c.division;
  if (!division || !c.club) return null;
  const total = nombreJournees(division, c.club);
  const fin = journeesALaSemaine(division, c.semaine + 1, total);
  const debut = journeesALaSemaine(division, c.semaine, total) + 1;
  if (fin < debut) return null;
  const grille = calendrier(pouleDe(division, c.club), `${division}#${c.saison}`);
  for (let journee = debut; journee <= fin; journee++) {
    const affiche = (grille[journee - 1] ?? []).find(([d, e]) => d === c.club || e === c.club);
    if (!affiche) continue;
    const [d, e] = affiche;
    const cle = `${division}#${c.saison}#${journee - 1}#${d}#${e}`;
    return {
      journee,
      match: jouerRencontre(d, e, c.saison, cle, { club: c.club, bonus }),
      cle,
    };
  }
  return null;
}

// Le match du club du joueur pour la semaine en cours, s'il y en a un.
export function matchDeLaSemaine(j: Joueur, bonus = 0): AfficheSemaine | null {
  return matchDuClubSemaine({
    division: j.division ?? '', club: j.club, saison: j.saison, semaine: j.semaine ?? 1,
  }, bonus);
}

// Le numéro de maillot d'un joueur dans la compo (1 à 15).
export function numeroDe(c: Coequipier, index: number): number {
  const ordre: PosteId[] = [
    'pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g', 'deuxieme_ligne_d',
    'troisieme_aile_g', 'troisieme_aile_d', 'numero_8', 'demi_melee', 'demi_ouverture',
    'ailier_gauche', 'premier_centre', 'deuxieme_centre', 'ailier_droit', 'arriere',
  ];
  const i = ordre.indexOf(c.poste);
  return i >= 0 ? i + 1 : index + 1;
}

export function nomPoste(c: Coequipier): string {
  return POSTE_PAR_ID[c.poste]?.nom ?? '';
}
