// LE STADE DU MATCH EN TROIS DIMENSIONS, SELON LE NIVEAU DU CLUB QUI REÇOIT.
//
// Un Régionale 3 ne joue pas au Stade de France : terrain de campagne, une
// tribune et des clôtures ; un peu mieux en Fédérale ; un vrai stade moyen en
// Nationale ; les grandes enceintes pour le Top 14, la Pro D2 et les premières
// divisions étrangères. Les décors viennent de `public/rn26/decor/` (voir
// `../analyse-rn26/exporter_stades.py`) ; un décor absent retombe tout seul sur
// l'enceinte internationale, côté scène.
import { COMPETITIONS, competitionDuClub } from '../data/clubs';
import { divisionEffective } from './divisions';

export type Stade3D = 'campagne' | 'village' | 'moyen' | 'grand' | 'international';

/** Carrière : la division RÉELLE du club (montées et descentes comprises) décide. */
export function stadePourClub(nomClub: string): Stade3D {
  const base = competitionDuClub(nomClub);
  const id = divisionEffective(nomClub, base?.id);
  const competition = COMPETITIONS.find((c) => c.id === id) ?? base;
  // Une sélection nationale n'est dans aucun championnat : elle joue dans la grande enceinte.
  if (!competition) return 'international';
  const niveau = competition.niveau;
  if (competition.zone !== 'France') return niveau <= 1 ? 'international' : niveau === 2 ? 'grand' : 'moyen';
  return niveau <= 1 ? 'international' : niveau === 2 ? 'grand' : niveau <= 4 ? 'moyen' : niveau <= 7 ? 'village' : 'campagne';
}

/**
 * Ligue en ligne : il n'y a pas de division, tout le monde part avec des
 * licenciés de Régionale 3. Le stade grandit donc avec l'effectif de celui
 * qui reçoit — la moyenne de ses quinze meilleures cartes.
 */
export function stadePourEffectif(notes: readonly number[]): Stade3D {
  const quinze = [...notes].sort((a, b) => b - a).slice(0, 15);
  if (!quinze.length) return 'campagne';
  const moyenne = quinze.reduce((s, n) => s + n, 0) / quinze.length;
  return moyenne < 46 ? 'campagne' : moyenne < 57 ? 'village' : moyenne < 67 ? 'moyen' : moyenne < 77 ? 'grand' : 'international';
}
