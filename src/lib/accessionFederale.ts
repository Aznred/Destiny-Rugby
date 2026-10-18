import { TOURS_ELIMINATION, type MatchElimination } from './bracketProgressif.js';
import { placesAccessionParTableau, type CompetitionRules } from './competitionRules.js';

const taillesDesTours = Object.fromEntries(Object.entries(TOURS_ELIMINATION).map(([taille, tour]) => [tour.tour, Number(taille)]));

/** Lecture des seules qualifications établies : un score futur ou le rang de poule ne donne jamais la montée. */
export function qualifiesPourAccession(regles: CompetitionRules, matchs: readonly MatchElimination[]): string[] {
  const seuil = placesAccessionParTableau(regles);
  if (!seuil) return [];
  const qualifies = new Set<string>();
  for (const m of matchs) {
    const taille = taillesDesTours[m.tour];
    if (!taille) continue;
    // Les deux clubs ont atteint ce tour, même s'il n'est pas encore joué.
    // Cela conserve aussi les qualifications d'un ancien tableau plus petit.
    if (taille <= seuil) { qualifies.add(m.domicile); qualifies.add(m.exterieur); }
    else if (taille === seuil * 2 && m.status === 'completed' && m.vainqueur && [m.domicile, m.exterieur].includes(m.vainqueur)) {
      // Un club peut déjà avoir gagné son accession avant que les autres
      // rencontres du tour aient permis de construire la colonne suivante.
      qualifies.add(m.vainqueur);
    }
  }
  return [...qualifies];
}
