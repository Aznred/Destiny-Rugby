import type { Manager } from '../types.js';
import {
  championnatEnDirect, journeesALaSemaine, nombreJournees, resultatJoue,
  type EtatChampionnat,
} from './championnat.js';
import { matchDuClubSemaine, type CarriereDeClub } from './matchLive.js';

/**
 * COMBIEN DE JOURNÉES LE CLASSEMENT DOIT COMPTER, POUR UNE CARRIÈRE DONNÉE.
 *
 * Le calendrier général porte parfois un numéro de journée différent de celui
 * de la division (Pro D2 à 16 clubs, poules amateurs, semaines de coupe) : on
 * suit donc le calendrier propre au championnat du club.
 *
 * ⚠️ LA JOURNÉE COURANTE COMPTE DÈS QUE LE MATCH EST JOUÉ, et c'est tout
 * l'intérêt de cette fonction. `journeesALaSemaine` ne compte que les week-ends
 * STRICTEMENT ANTÉRIEURS à la semaine en cours : s'en servir seul affiche donc
 * un classement en retard d'une journée entre le coup de sifflet final et le
 * passage à la semaine suivante. Retour de jeu : « on a joué le match mais ce
 * n'est pas actualisé sur le classement ».
 *
 * ⚠️ UNE SEULE DÉFINITION, ET C'EST LA RAISON DE CETTE FONCTION. Le bureau de
 * l'entraîneur faisait déjà ce contrôle ; l'écran « classement complet »
 * (`screens/Tableau.tsx`) appelait `journeesALaSemaine` à sec. Deux écrans, deux
 * comptes, un décalage — exactement le genre d'écart que deux formules pour une
 * même donnée finissent toujours par produire.
 */
export function journeesDuClassement(
  c: CarriereDeClub, numeroPoule?: number,
): number {
  if (!c.club || !c.division) return 0;
  const total = nombreJournees(c.division, c.club, numeroPoule);
  const affiche = matchDuClubSemaine(c);
  // Le registre global est le denominateur commun des deux carrières : le
  // manager y publie ses résultats comme le joueur.
  const joue = !!affiche && (!!resultatJoue(affiche.cle) || !!c.resultats?.[affiche.cle]);
  return journeesALaSemaine(c.division, c.semaine + (joue ? 1 : 0), total);
}

/** Le compte du bureau de l'entraîneur — même règle que partout ailleurs. */
export function journeesClassementManager(manager: Manager): number {
  return journeesDuClassement(manager);
}

/** Une seule source pour le rang, les points et le tableau du bureau. */
export function classementManagerEnDirect(manager: Manager): EtatChampionnat | null {
  if (!manager.club || !manager.division) return null;
  return championnatEnDirect(
    manager.division,
    manager.saison,
    manager.club,
    journeesClassementManager(manager),
  );
}
