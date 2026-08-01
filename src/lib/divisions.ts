// COMPOSITION EFFECTIVE DES DIVISIONS
//
// `COMPETITIONS` (data/clubs.ts) donne la pyramide au moment où les données ont
// été générées. Dès qu'une saison est jouée, des clubs montent et d'autres
// descendent : la composition RÉELLE d'une division n'est plus celle du fichier.
//
// Ce module est la source de vérité unique de « qui joue où ». Le store y
// déverse ses `mouvementsClubs` (club → id de division) après chaque saison, et
// tout le reste — championnat en direct, phase finale, promotions, écran
// Championnats — passe par `clubsDeDivision()`.
//
// ⚠️ C'est un registre de MODULE (pas un paramètre) : `championnatEnDirect` est
// appelé depuis une dizaine d'endroits, dont des fonctions pures qui n'ont pas
// accès au store. Le store appelle `setMouvementsClubs()` à la création, à la
// réhydratation et à chaque fin de saison.

import { COMPETITIONS } from '../data/clubs';

let MOUVEMENTS: Record<string, string> = {};
const cacheCompo = new Map<string, string[]>();

export function setMouvementsClubs(m: Record<string, string> | undefined): void {
  MOUVEMENTS = m ?? {};
  cacheCompo.clear();
}

export function mouvementsClubs(): Record<string, string> {
  return MOUVEMENTS;
}

// Division réellement occupée par un club, montées/descentes comprises.
export function divisionEffective(club: string, divisionDeBase?: string): string | undefined {
  return MOUVEMENTS[club] ?? divisionDeBase;
}

// Les clubs qui composent VRAIMENT la division aujourd'hui : ceux d'origine qui
// n'en sont pas partis, plus ceux qui y sont arrivés.
export function clubsDeDivision(divisionId: string): string[] {
  const enCache = cacheCompo.get(divisionId);
  if (enCache) return enCache;

  const division = COMPETITIONS.find((c) => c.id === divisionId);
  const base = division ? division.clubs.map((c) => c.nom) : [];
  const dansLaBase = new Set(base);
  const restants = base.filter((nom) => (MOUVEMENTS[nom] ?? divisionId) === divisionId);
  const entrants = Object.keys(MOUVEMENTS).filter(
    (nom) => MOUVEMENTS[nom] === divisionId && !dansLaBase.has(nom),
  );
  const liste = [...restants, ...entrants.sort()];
  cacheCompo.set(divisionId, liste);
  return liste;
}
