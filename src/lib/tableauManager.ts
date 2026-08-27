import type { Manager } from '../types';
import {
  championnatEnDirect, journeesALaSemaine, nombreJournees,
  type EtatChampionnat,
} from './championnat';
import { matchDuClubSemaine } from './matchLive';

/**
 * Nombre de journées réellement visibles dans le bureau du manager.
 *
 * Le calendrier général porte parfois un numéro de journée différent de celui
 * de la division (Pro D2 à 16 clubs, poules amateurs, semaines de coupe). Le
 * bureau doit donc suivre le calendrier propre au championnat du club. La
 * journée courante n'est ajoutée qu'après l'enregistrement du match coaché.
 */
export function journeesClassementManager(manager: Manager): number {
  if (!manager.club || !manager.division) return 0;
  const total = nombreJournees(manager.division, manager.club);
  const avantCetteSemaine = journeesALaSemaine(manager.division, manager.semaine, total);
  const apresCetteSemaine = journeesALaSemaine(manager.division, manager.semaine + 1, total);
  const affiche = matchDuClubSemaine(manager);
  return affiche && manager.resultats[affiche.cle]
    ? apresCetteSemaine
    : avantCetteSemaine;
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
