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

import { COMPETITIONS, competitionDuClub } from '../data/clubs.js';
import type { Competition } from '../types.js';

let MOUVEMENTS: Record<string, string> = {};
const cacheCompo = new Map<string, string[]>();

export function setMouvementsClubs(m: Record<string, string> | undefined): void {
  MOUVEMENTS = m ?? {};
  cacheCompo.clear();
}

export function mouvementsClubs(): Record<string, string> {
  return MOUVEMENTS;
}

/**
 * QUAND CHAQUE CLUB EST ARRIVÉ DANS SA DIVISION.
 *
 * ⚠️ LE REGISTRE N'AVAIT AUCUNE DIMENSION SAISON, ET C'EST CE QUI DONNAIT UNE
 * COUPE D'EUROPE FAUSSE. `MOUVEMENTS` dit seulement « ce club joue en Top 14 » ;
 * il ne dit pas depuis quand. Or la qualification européenne se calcule sur le
 * classement de la saison PASSÉE (`classementFinal`, lib/coupe.ts), et cette
 * fonction reconstruisait ce classement avec la composition D'AUJOURD'HUI. Un
 * club promu se retrouvait donc classé dans un Top 14 où il n'avait jamais
 * joué — et, si son effectif le portait dans les huit premiers, il héritait
 * d'un billet de Champions Cup. Retour de jeu : « je viens de monter en Top 14,
 * je devrais être en Challenge Cup, pas en Champions Cup ».
 *
 * On retient donc la saison d'arrivée. Un club arrivé POUR la saison N n'a pas
 * joué la saison N-1 dans cette division : il est classé dernier pour la
 * qualification, ce qui l'envoie naturellement en Challenge Cup. C'est aussi la
 * règle réelle : un promu de Pro D2 ne prend pas la place d'un habitué.
 */
let ARRIVEES: Record<string, number> = {};

export function setArriveesClubs(a: Record<string, number> | undefined): void {
  ARRIVEES = a ?? {};
}

export function arriveesClubs(): Record<string, number> {
  return ARRIVEES;
}

/**
 * Ce club jouait-il déjà dans cette division à la fin de la saison donnée ?
 *
 * Sans information d'arrivée, on répond oui : c'est le comportement d'avant, et
 * il vaut mieux qu'un club de toujours reste qualifiable.
 */
export function etaitDansLaDivision(club: string, saison: number): boolean {
  const arrivee = ARRIVEES[club];
  return arrivee === undefined || arrivee <= saison;
}

// Division réellement occupée par un club, montées/descentes comprises.
export function divisionEffective(club: string, divisionDeBase?: string): string | undefined {
  return MOUVEMENTS[club] ?? divisionDeBase;
}

// ⚠️ LA DIVISION AFFICHÉE DOIT ÊTRE CELLE OÙ L'ON JOUE VRAIMENT.
// `competitionDuClub()` lit `data/clubs.ts`, c'est-à-dire la pyramide FIGÉE au
// moment où les données ont été générées : le panneau de carrière annonçait
// donc encore « Pro D2 » pour un club qui venait de monter en Top 14 (bug
// signalé en jeu). L'ordre de priorité est : la division que le joueur porte
// dans sa fiche (mise à jour à la montée et à la signature), puis le registre
// des mouvements, puis les données d'origine.
export function competitionEffective(
  club: string, divisionDeclaree?: string,
): Competition | undefined {
  const id = divisionDeclaree ?? MOUVEMENTS[club];
  if (id) {
    const trouvee = COMPETITIONS.find((c) => c.id === id);
    if (trouvee) return trouvee;
  }
  return competitionDuClub(club);
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
