// LE REGISTRE DES PARCOURS — tous les tutoriels du jeu, au même endroit.
//
// ⚠️ UN PARCOURS PAR SECTION, UN FICHIER PAR MODE. Ajouter un tutoriel, c'est écrire un `ParcoursTuto` dans le fichier de son
// mode, ses textes dans `data/textesTutoriel*.ts`, et poser les `data-tuto` voulus dans l'écran : rien d'autre à brancher.

import { enregistrerLesParcours } from '../guide';
import { PARCOURS_GENERAUX } from './general';
import { PARCOURS_JOUEUR } from './joueur';
import { PARCOURS_ENTRAINEUR } from './entraineur';
import { PARCOURS_LIGUE } from './ligue';
import { PARCOURS_CONTEXTE } from './contexte';

let installe = false;

/** Idempotent : l'overlay l'appelle au montage. */
export function parcoursInstalles(): void {
  if (installe) return;
  installe = true;
  enregistrerLesParcours([...PARCOURS_GENERAUX, ...PARCOURS_JOUEUR, ...PARCOURS_ENTRAINEUR, ...PARCOURS_LIGUE, ...PARCOURS_CONTEXTE]);
}
