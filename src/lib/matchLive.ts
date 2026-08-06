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

// Le match du club du joueur pour la semaine en cours, s'il y en a un.
export function matchDeLaSemaine(j: Joueur, bonus = 0): AfficheSemaine | null {
  const division = j.division;
  if (!division) return null;
  const total = nombreJournees(division, j.club);
  const sem = j.semaine ?? 1;
  const fin = journeesALaSemaine(division, sem + 1, total); // journées jouées APRÈS cette semaine
  const debut = journeesALaSemaine(division, sem, total) + 1;
  if (fin < debut) return null; // pas de journée ce week-end

  // ⚠️ MÊME CLÉ DE TIRAGE QUE `championnatEnDirect` : c'est ce qui garantit que
  // l'affiche annoncée dans le panneau est celle du tableau des résultats.
  const grille = calendrier(pouleDe(division, j.club), `${division}#${j.saison}`);
  for (let journee = debut; journee <= fin; journee++) {
    const affiche = (grille[journee - 1] ?? []).find(([d, e]) => d === j.club || e === j.club);
    if (!affiche) continue;
    const [d, e] = affiche;
    const cle = `${division}#${j.saison}#${journee - 1}#${d}#${e}`;
    return {
      journee,
      match: jouerRencontre(d, e, j.saison, cle, { club: j.club, bonus }),
      cle,
    };
  }
  return null;
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
