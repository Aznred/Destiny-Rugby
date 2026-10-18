// MONTÉES ET DESCENTES
//
// Elles ne sont plus estimées : elles découlent du CHAMPIONNAT RÉELLEMENT JOUÉ
// (lib/championnat.ts) et de sa PHASE FINALE (lib/phaseFinale.ts).
//
// Pour la division du joueur — et pour ses deux voisines immédiates, celles
// avec lesquelles elle échange des clubs — on résout :
//
//   ⬇️ les RELÉGUÉS DIRECTS de la division descendent — leur nombre est celui du
//      règlement de la division (`competitionRules.ts`) : un en Top 14, deux en
//      Fédérale ;
//   ⬆️ AUTANT de clubs montent de la division du dessous. Fédérale 2 : les
//      quart-finalistes ; Fédérale 1 : les demi-finalistes ; Nationale 2 : les deux finalistes. En POULE UNIQUE : son
//      champion, puis son finaliste, puis le classement. Dans les AUTRES DIVISIONS À
//      POULES (Correctif 39) : les places de CHAQUE poule, gagnées au classement
//      — le tableau final ne désigne que le champion (`echangeFrontiere`) ;
//   ⚔️ le MATCH D'ACCÈS, quand le règlement en prévoit un : le barragiste
//      reçoit le premier club du dessous qui ne monte pas d'office, et le
//      vainqueur prend la place. ⚠️ En Fédérale il n'y en a PAS : les deux
//      derniers descendent sans jouer.
//
// Le résultat est mémorisé dans le store (`mouvementsClubs`), puis publié à
// `lib/divisions.ts` : dès la saison suivante, les poules, les classements et
// l'écran Championnats tiennent compte des mouvements.

import { COMPETITIONS, clubParNom } from '../data/clubs.js';
import { clubsDeDivision } from './divisions.js';
import { championnatEnDirect, poulesDe, versionResultatsJoues, type LigneTableau } from './championnat.js';
import { tournoiDeFinDAnnee } from './tournoi.js';
import { phaseFinale, matchAcces, pretendants, type PhaseFinale } from './phaseFinale.js';
import type { MatchElimination } from './bracketProgressif.js';
import { placesAccessionParTableau, rulesFor, standingsStatuses, zones, type StandingsStatus } from './competitionRules.js';
import { qualifiesPourAccession } from './accessionFederale.js';

export interface MouvementClub {
  club: string;
  de: string; // id de division
  vers: string;
  sens: 'montee' | 'descente';
  /** `phaseFinale` : tour d'accession atteint ; `classement` : place de poule ; `repechage` : meilleur suivant. */
  motif: 'champion' | 'dernier' | 'acces' | 'classement' | 'repechage' | 'phaseFinale';
}

// Ordre des divisions françaises, du sommet vers le bas. Les championnats du
// monde sont pour la plupart fermés (franchises). La PREM anglaise n'a plus
// d'échange automatique à partir de 2026/27 ; le Japon conserve ses étages.
const PYRAMIDES: string[][] = [
  ['top14', 'prod2', 'nationale', 'nationale2', 'fed1', 'fed2', 'fed3', 'reg1', 'reg2', 'reg3'],
  ['japon1', 'japon2', 'japon3'],
  // Rugby féminin (`data/mondeFeminin.generated.ts`) : la France et l'Irlande ont deux étages, le reste est fermé.
  ['f-elite1', 'f-elite2'],
  ['f-ail', 'f-ail2'],
  ['f-fpc', 'f-fpc2'],
];

export function pyramideDe(divisionId: string): string[] | null {
  return PYRAMIDES.find((p) => p.includes(divisionId)) ?? null;
}

export function divisionAuDessus(divisionId: string): string | null {
  const p = pyramideDe(divisionId);
  if (!p) return null;
  const i = p.indexOf(divisionId);
  return i > 0 ? p[i - 1] : null;
}

export function divisionEnDessous(divisionId: string): string | null {
  const p = pyramideDe(divisionId);
  if (!p) return null;
  const i = p.indexOf(divisionId);
  return i >= 0 && i < p.length - 1 ? p[i + 1] : null;
}

export function nomDivision(id: string): string {
  return COMPETITIONS.find((c) => c.id === id)?.nom ?? id;
}

// Club servant à choisir la poule d'une division voisine (les grandes divisions
// amateurs sont découpées en poules). ⚠️ Simplification assumée : on prend la
// première poule — c'est elle qui « échange » ses clubs avec la division voisine.
function ancreDe(divisionId: string): string {
  return clubsDeDivision(divisionId)[0] ?? '';
}

// ---------------------------------------------------------------------------
// ⚠️⚠️ UNE SEULE FIN DE SAISON PAR DIVISION — LE BUG DU « TOP 14 À 16 CLUBS »
// ---------------------------------------------------------------------------
// La fin de saison était calculée DEUX FOIS, et pas de la même façon :
//
//   • `resoudrePyramide()` jouait la division du joueur AVEC son apport
//     (`bonusJoueur`), ancrée sur SON club ;
//   • `resoudreToutesDivisions()` la rejouait SANS apport, ancrée sur le premier
//     club du fichier.
//
// Deux championnats différents, donc deux champions et deux derniers différents.
// Le store fusionnait les deux listes en dédoublonnant PAR NOM DE CLUB : quand
// les deux calculs ne désignaient pas le même club, les DEUX montaient. Le
// Top 14 gagnait un club par saison et la Pro D2 en perdait un — d'où le
// « Top 14 à 16 équipes et Pro D2 à 14 » signalé en jeu.
//
// Désormais il n'y a QU'UN calcul, mémoïsé, et il connaît le contexte du joueur :
// tout le monde lit le même championnat.
let CONTEXTE: { club: string; bonus: number } = { club: '', bonus: 0 };

export function setContexteJoueur(club: string, bonus: number): void {
  if (CONTEXTE.club === club && CONTEXTE.bonus === bonus) return;
  CONTEXTE = { club, bonus };
  oublierResultats();
}

const cachePhases = new Map<string, PhaseFinale>();

/** La fin de saison d'une division — LA source unique. */
export function phaseFinaleDe(
  divisionId: string, saison: number, numeroPoule?: number,
): PhaseFinale {
  const cle = `${divisionId}#${saison}#${numeroPoule ?? '-'}`;
  const enCache = cachePhases.get(cle);
  if (enCache) return enCache;
  // Le club du joueur n'est l'ancre que dans SA division, et sans numéro de
  // poule imposé : ailleurs, on prend le premier club de la poule visée.
  const sienne = numeroPoule == null && !!CONTEXTE.club
    && clubsDeDivision(divisionId).includes(CONTEXTE.club);
  const ancre = sienne
    ? CONTEXTE.club
    : (poulesDe(divisionId)[numeroPoule ?? 0]?.[0] ?? ancreDe(divisionId));
  const r = phaseFinale(divisionId, saison, ancre, sienne ? CONTEXTE.bonus : 0, numeroPoule);
  cachePhases.set(cle, r);
  return r;
}

// ---------------------------------------------------------------------------
// L'ÉCHANGE ENTRE DEUX ÉTAGES — UNE SEULE DÉFINITION PAR FRONTIÈRE (Correctif 39)
// ---------------------------------------------------------------------------
// Signalé en jeu : « plusieurs groupes/régions participent à la compétition, mais finalement un seul club obtient la
// montée, comme si toute la pyramide dépendait du champion unique du tableau final ».
//
// ⚠️ C'ÉTAIT VRAI, ET PAS POUR LA RAISON QU'ON CROIT. Deux résolutions cohabitaient :
//
//   • `resoudrePyramide` — la division du club et ses deux voisines — ne lisait que SA POULE : le premier de la poule
//     de l'entraîneur montait, personne d'autre ;
//   • `resoudreToutesDivisions` promouvait bien les vainqueurs de chaque poule…
//   • … mais `resoudreSaisonClub` « réservait » les deux frontières de la division du club à la première, et jetait
//     tout ce que la seconde disait de ces frontières. Dans SA division, sur vingt-deux poules régionales, un seul
//     club montait — le premier de la poule de l'entraîneur — et un seul descendait pour lui faire place.
//
// Il n'y a plus qu'UN calcul par frontière (`echangeFrontiere`), lu par la carrière joueur, la carrière entraîneur,
// l'archive du monde et le classement affiché. Et la montée ne doit plus rien au champion :
//
//   • POULE UNIQUE des deux côtés (Top 14 ↔ Pro D2 ↔ Nationale) : rien ne change — le champion monte, le finaliste
//     joue le match d'accès (`championshipBracket.promotionImpact = 'decides'`) ;
//   • AUTRES DIVISIONS À POULES : chaque poule a ses places (`promotionRules.promotionSlots`), gagnées au classement de la
//     saison régulière. Le tableau final ne désigne que le champion — on peut être promu ET continuer à jouer le titre.
//   • RÉGIONALES (`territory: 'ligue'`) : l'échange se fait à l'intérieur de chaque ligue régionale. Les premiers des
//     poules d'Occitanie montent, et ce sont des clubs d'Occitanie qui descendent à leur place. Une ligue qui n'a
//     personne en dessous ne relègue personne.
//   • NATIONALE 2 ET FÉDÉRALES 1 ET 2 : le tour d'accession déclaré dans le règlement décide ; aucune place n'est acquise en poule.

/** Un club dans le classement final de sa poule, avec ce qu'il faut pour le comparer aux autres poules. */
interface Classe {
  club: string;
  /** Sa place dans sa poule (1 = premier) et sa place comptée depuis le bas (1 = dernier). */
  rang: number;
  depuisLeBas: number;
  points: number;
  difference: number;
  /** La ligue régionale de sa poule, et la taille de celle-ci. */
  ligue: string;
  taille: number;
}

/** La ligue régionale d'une poule : celle de la majorité de ses clubs (une petite poule rattachée garde la sienne). */
export function ligueDeLaPoule(clubs: string[]): string {
  const compte = new Map<string, number>();
  for (const c of clubs) {
    const ligue = clubParNom(c)?.ligue ?? 'sans-ligue';
    compte.set(ligue, (compte.get(ligue) ?? 0) + 1);
  }
  return [...compte].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))[0]?.[0] ?? 'sans-ligue';
}

/** Jamais plus d'un club sur quatre d'une même poule : une poule de huit ne perd pas trois clubs d'un coup. */
const plafondDeDescentes = (taille: number): number => Math.max(1, Math.floor(taille / 4));

// Le découpage en poules coûte une trentaine de millisecondes par division : on le garde tant que la division garde
// ses clubs (même test d'identité que `debutPlayoffsDivision`).
const memoPoules = new Map<string, { clubs: string[]; poules: string[][]; ligues: string[] }>();
function poulesEtLigues(divisionId: string): { poules: string[][]; ligues: string[] } {
  const clubs = clubsDeDivision(divisionId);
  const connu = memoPoules.get(divisionId);
  if (connu?.clubs === clubs) return connu;
  const poules = poulesDe(divisionId);
  const neuf = { clubs, poules, ligues: poules.map(ligueDeLaPoule) };
  memoPoules.set(divisionId, neuf);
  return neuf;
}

const estAPoules = (divisionId: string): boolean => poulesEtLigues(divisionId).poules.length > 1;

/** Le tournoi final d'une division, vu par le contexte du joueur : le MÊME que celui de son écran. */
function tournoiContextuel(divisionId: string, saison: number) {
  const sienne = !!CONTEXTE.club && clubsDeDivision(divisionId).includes(CONTEXTE.club);
  return tournoiDeFinDAnnee(divisionId, saison, nomDivision(divisionId), sienne ? CONTEXTE.club : '', sienne ? CONTEXTE.bonus : 0);
}

const cacheClassements = new Map<string, LigneTableau[][]>();

/**
 * Le classement final de CHAQUE poule d'une division.
 *
 * ⚠️ ON LIT LE TOURNOI QUAND IL EXISTE (il a déjà joué toutes les poules, et il est mémoïsé), MAIS ON NE DÉPEND PAS DE
 * SON TABLEAU pour les places gagnées au classement. Un tableau incohérent fait lever l'accession par phase finale ;
 * les autres échanges peuvent encore lire leurs classements de poule.
 */
function classementsFinaux(divisionId: string, saison: number): LigneTableau[][] {
  const cle = `${divisionId}#${saison}#${CONTEXTE.club}#${CONTEXTE.bonus}#${versionResultatsJoues()}`;
  const connu = cacheClassements.get(cle);
  if (connu) return connu;
  const { poules } = poulesEtLigues(divisionId);
  let classements: LigneTableau[][];
  if (poules.length <= 1) classements = [phaseFinaleDe(divisionId, saison).classement];
  else {
    try {
      classements = tournoiContextuel(divisionId, saison)!.poules.map((p) => p.classement);
    } catch {
      const sienne = !!CONTEXTE.club && clubsDeDivision(divisionId).includes(CONTEXTE.club);
      classements = poules.map((_, i) => championnatEnDirect(
        divisionId, saison, sienne ? CONTEXTE.club : '', 999, sienne ? CONTEXTE.bonus : 0, i,
      ).classement);
    }
  }
  if (cacheClassements.size >= 40) cacheClassements.clear();
  cacheClassements.set(cle, classements);
  return classements;
}

function classes(divisionId: string, classements: LigneTableau[][]): Classe[] {
  const { ligues } = poulesEtLigues(divisionId);
  return classements.flatMap((classement, i) => classement.map((l, r) => ({
    club: l.club, rang: r + 1, depuisLeBas: classement.length - r,
    points: l.points, difference: l.difference,
    ligue: ligues[i] ?? ligueDeLaPoule(classement.map((x) => x.club)), taille: classement.length,
  })));
}

/** Du mieux classé au moins bien classé, toutes poules confondues : la place d'abord, puis les points. */
const duMeilleur = (a: Classe, b: Classe) => a.rang - b.rang || b.points - a.points || b.difference - a.difference || a.club.localeCompare(b.club, 'fr');
/** Du plus menacé au moins menacé : les derniers d'abord (le moins de points en tête), puis les avant-derniers. */
const duPlusMenace = (a: Classe, b: Classe) => a.depuisLeBas - b.depuisLeBas || a.points - b.points || a.difference - b.difference || a.club.localeCompare(b.club, 'fr');

function parLigue(liste: Classe[]): Map<string, Classe[]> {
  const groupes = new Map<string, Classe[]>();
  for (const c of liste) {
    if (!groupes.has(c.ligue)) groupes.set(c.ligue, []);
    groupes.get(c.ligue)!.push(c);
  }
  return groupes;
}

/** L'échange d'une frontière dont l'un des deux étages est découpé en poules : des places, pas un champion. */
function echangeAPlaces(haut: string, bas: string, saison: number): MouvementClub[] {
  const regles = rulesFor(bas);
  const { promotionSlots: places, territory, bestRunnersUp } = regles.promotionRules;
  if (places <= 0) return [];
  const B = classes(bas, classementsFinaux(bas, saison));
  const classementsHaut = classementsFinaux(haut, saison);
  const H = classes(haut, classementsHaut);
  const montants: { c: Classe; motif: MouvementClub['motif'] }[] = [];
  const descendants: Classe[] = [];

  if (territory === 'ligue') {
    // ── PAR LIGUE RÉGIONALE : autant de descentes que de montées, à l'intérieur du territoire ──
    const hautParLigue = parLigue(H);
    const orphelins: Classe[] = [];
    for (const [ligue, lignes] of parLigue(B)) {
      const promus = lignes.filter((l) => l.rang <= places).sort(duMeilleur);
      const relegables = (hautParLigue.get(ligue) ?? []).filter((l) => l.depuisLeBas <= plafondDeDescentes(l.taille)).sort(duPlusMenace);
      const n = Math.min(promus.length, relegables.length);
      for (const c of promus.slice(0, n)) montants.push({ c, motif: 'classement' });
      descendants.push(...relegables.slice(0, n));
      orphelins.push(...promus.slice(n));
    }
    // Une ligue sans étage au-dessus (ou qui n'a plus personne à reléguer) : ses premiers de poule montent quand même,
    // à la place des clubs les plus menacés du pays. Aucun cas dans les poules d'aujourd'hui ; c'est un filet.
    if (orphelins.length) {
      const pris = new Set(descendants.map((d) => d.club));
      const reste = H.filter((l) => !pris.has(l.club) && l.depuisLeBas <= plafondDeDescentes(l.taille)).sort(duPlusMenace);
      const n = Math.min(orphelins.length, reste.length);
      for (const c of orphelins.sort(duMeilleur).slice(0, n)) montants.push({ c, motif: 'classement' });
      descendants.push(...reste.slice(0, n));
    }
  } else {
    // ── TOUTES POULES CONFONDUES : les relégués directs de l'étage du dessus libèrent les places ──
    const reglesHaut = rulesFor(haut);
    const relegables = H
      .filter((l) => l.depuisLeBas <= zones(reglesHaut, l.taille, classementsHaut.length).directRelegation)
      .sort(duPlusMenace);
    const promus = B.filter((l) => l.rang <= places).sort(duMeilleur);
    // Les meilleurs suivants prennent les places que l'étage du dessus libère en plus. Le champion, s'il n'a pas gagné
    // sa poule, passe en tête de cette file quand le règlement le dit (`tiebreak`) : c'est le seul effet du tableau.
    let champion: string | null = null;
    if (bestRunnersUp && regles.championshipBracket.promotionImpact === 'tiebreak') {
      try { champion = tournoiContextuel(bas, saison)?.champion ?? null; } catch { champion = null; }
    }
    const suivants = bestRunnersUp
      ? B.filter((l) => l.rang > places && l.rang <= places + 2)
        .sort((a, b) => Number(b.club === champion) - Number(a.club === champion) || duMeilleur(a, b))
      : [];
    const file = [
      ...promus.map((c) => ({ c, motif: 'classement' as const })),
      ...suivants.map((c) => ({ c, motif: (c.club === champion ? 'champion' : 'repechage') as MouvementClub['motif'] })),
    ];
    const n = Math.min(relegables.length, file.length);
    montants.push(...file.slice(0, n));
    // S'il y a moins de montants que de relégables, ce sont les moins menacés qui sont sauvés.
    descendants.push(...relegables.slice(0, n));
  }

  return [
    ...montants.map(({ c, motif }) => ({ club: c.club, de: bas, vers: haut, sens: 'montee' as const, motif })),
    ...descendants.map((c) => ({ club: c.club, de: haut, vers: bas, sens: 'descente' as const, motif: 'dernier' as const })),
  ];
}

/** Nationale 2 et Fédérales : la qualification sportive donne la place ; le premier de poule n'a aucune priorité. */
function echangeParPhaseFinale(haut: string, bas: string, saison: number): MouvementClub[] {
  const regles = rulesFor(bas);
  const tournoi = tournoiContextuel(bas, saison);
  const matchs = tournoi?.matchs ?? phaseFinaleDe(bas, saison).matchs;
  const promus = qualifiesPourAccession(regles, matchs);
  if (!promus.length) return [];
  const classementsHaut = classementsFinaux(haut, saison);
  const relegables = classes(haut, classementsHaut)
    .filter(l => l.depuisLeBas <= zones(rulesFor(haut), l.taille, classementsHaut.length).directRelegation)
    .sort(duPlusMenace);
  // Les anciens petits tableaux conservent leurs qualifiés sans inventer les
  // clubs manquants ; l'étage supérieur ne se vide pas de places non pourvues.
  const n = Math.min(promus.length, relegables.length);
  return [
    ...promus.slice(0, n).map(club => ({ club, de: bas, vers: haut, sens: 'montee' as const, motif: 'phaseFinale' as const })),
    ...relegables.slice(0, n).map(l => ({ club: l.club, de: haut, vers: bas, sens: 'descente' as const, motif: 'dernier' as const })),
  ];
}

interface Echange {
  mouvements: MouvementClub[];
  /** Le match d'accès de la frontière, quand le règlement en prévoit un (poule unique des deux côtés). */
  acces: MatchElimination | null;
  recits: string[];
}

const cacheEchanges = new Map<string, Echange>();

/** Les noms d'une liste de clubs pour un récit : les six premiers, puis « et N autres ». */
function enumerer(clubs: string[]): string {
  return clubs.length <= 6 ? clubs.join(', ') : `${clubs.slice(0, 6).join(', ')} et ${clubs.length - 6} autres`;
}

/**
 * CE QUI S'ÉCHANGE ENTRE DEUX ÉTAGES VOISINS, À LA FIN DE CETTE SAISON — LA source unique.
 *
 * ⚠️ MÉMOÏSÉE SUR LE CONTEXTE DU JOUEUR ET SUR LES RÉSULTATS JOUÉS : la division du club est lue avec son apport, et
 * tout le monde (les deux carrières, l'archive, l'écran) lit la même réponse.
 */
export function echangeFrontiere(haut: string, bas: string, saison: number): Echange {
  const cle = `${haut}#${bas}#${saison}#${CONTEXTE.club}#${CONTEXTE.bonus}#${versionResultatsJoues()}`;
  const connu = cacheEchanges.get(cle);
  if (connu) return connu;
  const mouvements: MouvementClub[] = [];
  const recits: string[] = [];
  let acces: MatchElimination | null = null;
  const bouger = (club: string, de: string, vers: string, sens: MouvementClub['sens'], motif: MouvementClub['motif']) => {
    if (!club || mouvements.some((m) => m.club === club)) return;
    mouvements.push({ club, de, vers, sens, motif });
  };

  if (estAPoules(haut) || estAPoules(bas) || placesAccessionParTableau(rulesFor(bas))) {
    const echanges = placesAccessionParTableau(rulesFor(bas)) ? echangeParPhaseFinale(haut, bas, saison) : echangeAPlaces(haut, bas, saison);
    for (const m of echanges) bouger(m.club, m.de, m.vers, m.sens, m.motif);
    const montees = mouvements.filter((m) => m.sens === 'montee').map((m) => m.club);
    const descentes = mouvements.filter((m) => m.sens === 'descente').map((m) => m.club);
    if (montees.length) {
      recits.push(`${montees.length} club${montees.length > 1 ? 's montent' : ' monte'} de ${nomDivision(bas)} en ${nomDivision(haut)} : ${enumerer(montees)}.`);
      recits.push(`${descentes.length} club${descentes.length > 1 ? 's descendent' : ' descend'} de ${nomDivision(haut)} : ${enumerer(descentes)}.`);
    }
  } else {
    // ── Poule unique des deux côtés : le champion monte, le finaliste joue l'accès ──
    const phaseHaut = phaseFinaleDe(haut, saison);
    const phaseBas = phaseFinaleDe(bas, saison);
    // Le tableau final donne la place (`decides`) ; sinon c'est le classement de la saison régulière.
    const ordre = rulesFor(bas).championshipBracket.promotionImpact === 'decides'
      ? pretendants(phaseBas) : phaseBas.classement.map((l) => l.club);
    // Autant de montées directes que la division du dessus relègue de clubs.
    const montants = ordre.slice(0, phaseHaut.relegues.length);
    montants.forEach((club, i) => {
      bouger(club, bas, haut, 'montee', 'champion');
      recits.push(i === 0 && club === phaseBas.champion
        ? `${club}, champion de ${nomDivision(bas)}, accède à la ${nomDivision(haut)}.`
        : `${club} monte directement en ${nomDivision(haut)}.`);
    });
    for (const club of phaseHaut.relegues.slice(0, montants.length)) {
      bouger(club, haut, bas, 'descente', 'dernier');
      recits.push(`${club} est relégué de ${nomDivision(haut)} et descend en ${nomDivision(bas)}.`);
    }
    acces = matchAcces(phaseHaut, phaseBas, saison);
    if (acces?.status === 'completed') {
      const m = acces;
      const monte = m.vainqueur === m.exterieur;
      recits.push(
        `Match d’accès à la ${nomDivision(haut)} : ${m.domicile} ${m.scoreD}-${m.scoreE} ${m.exterieur}. ` +
          (monte
            ? `${m.vainqueur} arrache sa montée, ${m.perdant} est relégué.`
            : `${m.vainqueur} conserve sa place, ${m.perdant} reste en ${nomDivision(bas)}.`),
      );
      if (monte) {
        bouger(m.vainqueur!, bas, haut, 'montee', 'acces');
        bouger(m.perdant!, haut, bas, 'descente', 'acces');
      }
    }
  }

  const echange = { mouvements, acces, recits };
  if (cacheEchanges.size >= 60) cacheEchanges.clear();
  cacheEchanges.set(cle, echange);
  return echange;
}

export interface BilanPyramide {
  mouvements: MouvementClub[];
  phase: PhaseFinale; // la fin de saison de la division du joueur
  accesVersLeHaut: MatchElimination | null; // notre finaliste tente de monter
  accesDepuisLeBas: MatchElimination | null; // notre avant-dernier défend sa place
  recits: string[];
}

/** La division du joueur et ses deux voisines : ce qui monte, ce qui descend, et les matchs d'accès de son club. */
export function resoudrePyramide(
  divisionId: string,
  saison: number,
  clubJoueur: string,
  bonusJoueur = 0,
): BilanPyramide {
  // ⚠️ On POSE le contexte avant de lire quoi que ce soit : `echangeFrontiere` et `phaseFinaleDe` doivent voir
  // exactement le même championnat.
  setContexteJoueur(clubJoueur, bonusJoueur);
  const phase = phaseFinaleDe(divisionId, saison);
  const haut = divisionAuDessus(divisionId);
  const bas = divisionEnDessous(divisionId);
  const versLeHaut = haut ? echangeFrontiere(haut, divisionId, saison) : null;
  const versLeBas = bas ? echangeFrontiere(divisionId, bas, saison) : null;
  const mouvements: MouvementClub[] = [];
  for (const m of [...(versLeHaut?.mouvements ?? []), ...(versLeBas?.mouvements ?? [])]) {
    if (!mouvements.some((x) => x.club === m.club)) mouvements.push(m);
  }
  return {
    mouvements, phase,
    accesVersLeHaut: versLeHaut?.acces ?? null,
    accesDepuisLeBas: versLeBas?.acces ?? null,
    recits: [...(versLeHaut?.recits ?? []), ...(versLeBas?.recits ?? [])],
  };
}

// ---------------------------------------------------------------------------
// TOUTE LA PYRAMIDE, ÉTAGE PAR ÉTAGE
//
// `resoudrePyramide` ne traite que la division du joueur et ses deux voisines :
// ailleurs, plus rien ne bougeait — un club de Fédérale 2 restait en Fédérale 2
// à vie. Ici on résout LES DIX DIVISIONS françaises d'un coup, à la fin de
// chaque saison.
//
// Le champion d'une division amateur n'est pas le premier d'un classement
// unique (elles comptent jusqu'à 22 poules) mais le vainqueur du TOURNOI DE FIN
// D'ANNÉE (lib/tournoi.ts). Les places d'échange viennent du règlement de chaque
// division : classement de poule ou qualification dans le tableau — voir `echangeFrontiere`.
//
// ⚠️ COÛT : on joue vraiment toutes les poules de toutes les divisions. C'est
// la partie la plus lourde de la fin de saison (quelques dizaines de milliers
// de rencontres simulées), d'où la MÉMOÏSATION par saison — l'écran de bilan
// et le calcul des mouvements ne la refont pas deux fois.

const cacheChampions = new Map<string, ResultatDivision>();

export interface ResultatDivision {
  divisionId: string;
  champions: string[]; // dans l'ordre : le meilleur d'abord
  derniers: string[]; // dans l'ordre : le pire d'abord
  vainqueurTournoi: string | null;
}

// Champions et relégables d'une division, poules comprises. Sert au récit des tournois ; les montées, elles, passent
// par `echangeFrontiere`.
export function resultatDivision(divisionId: string, saison: number): ResultatDivision {
  const cle = `${divisionId}#${saison}`;
  const enCache = cacheChampions.get(cle);
  if (enCache) return enCache;

  const poules = poulesDe(divisionId);
  let res: ResultatDivision;
  if (poules.length <= 1) {
    const phase = phaseFinaleDe(divisionId, saison);
    res = {
      divisionId,
      champions: phase.champion ? pretendants(phase) : [],
      derniers: [...phase.relegues],
      vainqueurTournoi: null,
    };
  } else {
    // Le tournoi du CONTEXTE : celui que le joueur voit à l'écran, apport de son club compris.
    const t = tournoiContextuel(divisionId, saison);
    if (!t) {
      res = { divisionId, champions: [], derniers: [], vainqueurTournoi: null };
    } else {
      const vainqueursDePoule = t.poules
        .map((poule) => poule.classement[0]?.club)
        .filter((c): c is string => !!c);
      const deuxiemes = t.poules
        .map((poule) => poule.classement[1])
        .filter((l): l is NonNullable<typeof l> => !!l)
        .sort((a, b) => b.points - a.points || b.difference - a.difference)
        .map((l) => l.club);
      const champions = [
        ...(t.champion && vainqueursDePoule.includes(t.champion) ? [t.champion] : []),
        ...vainqueursDePoule,
        ...(t.champion && !vainqueursDePoule.includes(t.champion) ? [t.champion] : []),
        ...deuxiemes,
      ].filter((c, i, liste) => liste.indexOf(c) === i);
      res = { divisionId, champions, derniers: t.relegues, vainqueurTournoi: t.champion };
    }
  }
  cacheChampions.set(cle, res);
  return res;
}

export function oublierResultats(): void {
  cacheChampions.clear();
  cachePhases.clear();
  cacheClassements.clear();
  cacheEchanges.clear();
}

// ---------------------------------------------------------------------------
// ⚠️ LE GARDE-FOU : UNE DIVISION NE CHANGE JAMAIS DE TAILLE
// ---------------------------------------------------------------------------
// `echangeFrontiere` échange toujours autant de clubs dans un sens que dans
// l'autre. Ce filtre reste la ceinture ET les bretelles : pour CHAQUE division,
// autant de clubs doivent entrer que de clubs doivent sortir. Si ce n'est pas le
// cas, on retire le mouvement le moins prioritaire (les derniers de la liste
// sont ceux des étages où le joueur ne joue pas) jusqu'à ce que tout
// s'équilibre. Résultat : le Top 14 compte 14 clubs à la saison 12 comme à la
// saison 1.
export function equilibrerMouvements(mouvements: MouvementClub[]): MouvementClub[] {
  const garde = [...mouvements];
  const soldes = () => {
    const s = new Map<string, number>();
    for (const m of garde) {
      s.set(m.de, (s.get(m.de) ?? 0) - 1);
      s.set(m.vers, (s.get(m.vers) ?? 0) + 1);
    }
    return s;
  };
  // Chaque tour retire au plus un mouvement : la boucle termine forcément.
  for (let tour = 0; tour <= mouvements.length; tour++) {
    const s = soldes();
    let desequilibre = false;
    for (const v of s.values()) if (v !== 0) { desequilibre = true; break; }
    if (!desequilibre) return garde;
    // On annule en priorité un mouvement qui ALIMENTE une division en surnombre
    // ou qui VIDE une division en sous-nombre, en partant de la fin de liste.
    let index = -1;
    for (let i = garde.length - 1; i >= 0; i--) {
      const m = garde[i];
      if ((s.get(m.vers) ?? 0) > 0 || (s.get(m.de) ?? 0) < 0) { index = i; break; }
    }
    if (index < 0) return garde;
    garde.splice(index, 1);
  }
  return garde;
}

export interface BilanPyramideComplete {
  mouvements: MouvementClub[];
  recits: string[];
  tournois: { divisionId: string; nom: string; champion: string | null }[];
  /** Les frontières qui n'ont pas pu être résolues (un tableau incohérent lève exprès) : rien n'y bouge, les autres bougent. */
  incidents: string[];
}

const messageDe = (erreur: unknown) => (erreur instanceof Error ? erreur.message : String(erreur));

/**
 * La fin de saison vue d'un club : sa division, ses matchs d'accès, et TOUS les mouvements de la pyramide.
 *
 * ⚠️ PLUS DE « FRONTIÈRE RÉSERVÉE » (Correctif 39). Les deux résolutions lisent la même `echangeFrontiere` : là où
 * elles se recouvrent, elles disent la même chose, et il n'y a plus rien à arbitrer. C'est l'ancien arbitrage qui
 * laissait, dans la division de l'entraîneur, un seul club monter sur toutes les poules.
 */
export function resoudreSaisonClub(division: string, saison: number, club: string): BilanPyramide & { incidents: string[] } {
  const incidents: string[] = [];
  // ⚠️ UNE FRONTIÈRE ILLISIBLE NE FIGE PAS TOUTE LA PYRAMIDE. Si la division du club ne se résout pas (tableau
  // incohérent), son club ne bouge pas — et le reste du pays monte et descend quand même.
  let proche: BilanPyramide;
  try { proche = resoudrePyramide(division, saison, club); } catch (erreur) {
    setContexteJoueur(club, 0);
    incidents.push(`${nomDivision(division)} : ${messageDe(erreur)}`);
    proche = {
      mouvements: [], accesVersLeHaut: null, accesDepuisLeBas: null, recits: [],
      phase: { divisionId: division, classement: [], qualifies: [], matchs: [], champion: null, finaliste: null, relegues: [], barragistes: [], dernier: null, avantDernier: null },
    };
  }
  const complete = resoudreToutesDivisions(saison);
  incidents.push(...complete.incidents.filter((i) => !incidents.includes(i)));
  const mouvements = [...proche.mouvements];
  const deplaces = new Set(mouvements.map((m) => m.club));
  for (const m of complete.mouvements) {
    if (deplaces.has(m.club)) continue;
    mouvements.push(m);
    deplaces.add(m.club);
  }
  return { ...proche, mouvements: equilibrerMouvements(mouvements), incidents };
}

export function resoudreToutesDivisions(saison: number): BilanPyramideComplete {
  const pyramide = PYRAMIDES[0]; // la pyramide FRANÇAISE : c'est là que se joue la carrière
  const mouvements: MouvementClub[] = [];
  const recits: string[] = [];
  const tournois: BilanPyramideComplete['tournois'] = [];
  const incidents: string[] = [];
  const deplaces = new Set<string>();

  for (const id of pyramide) {
    let r: ResultatDivision;
    try { r = resultatDivision(id, saison); } catch { continue; }
    if (r.vainqueurTournoi) {
      tournois.push({ divisionId: id, nom: nomDivision(id), champion: r.vainqueurTournoi });
      recits.push(`🏆 ${r.vainqueurTournoi} remporte le tournoi final de ${nomDivision(id)}.`);
    }
  }

  for (let i = 0; i < pyramide.length - 1; i++) {
    const haut = pyramide[i];
    const bas = pyramide[i + 1];
    let echange: MouvementClub[];
    try { echange = echangeFrontiere(haut, bas, saison).mouvements; } catch (erreur) {
      incidents.push(`${nomDivision(haut)} / ${nomDivision(bas)} : ${messageDe(erreur)}`);
      continue;
    }
    for (const m of echange) {
      if (deplaces.has(m.club)) continue;
      deplaces.add(m.club);
      mouvements.push(m);
      recits.push(m.sens === 'montee'
        ? `⬆️ ${m.club} monte de ${nomDivision(bas)} en ${nomDivision(haut)}.`
        : `⬇️ ${m.club} descend de ${nomDivision(haut)} en ${nomDivision(bas)}.`);
    }
  }

  return { mouvements, recits, tournois, incidents };
}

// ---------------------------------------------------------------------------
// CE QUE VAUT CHAQUE PLACE D'UNE POULE — pour le classement affiché
// ---------------------------------------------------------------------------
// ⚠️ L'ÉCRAN COLORE CE QUE LA CLÔTURE APPLIQUERA. Dans une division à poules, le nombre de montées et de descentes
// d'une poule dépend de l'étage voisin (combien de poules, dans quelle ligue) : `zones()` ne le sait pas, c'est un
// module feuille. Ces deux fonctions comptent les places à partir de la STRUCTURE seule (aucun match joué) — donc
// dès la première journée, et sans rien coûter.

export interface PlacesDePoule {
  /** Les premières places qui montent à coup sûr, et s'il en reste une « possible » juste derrière. */
  promotion: number;
  promotionPossible: number;
  /** Les dernières places qui descendent à coup sûr, et s'il en reste une « possible » juste au-dessus. */
  relegation: number;
  relegationPossible: number;
}

/**
 * Remplit des « couches » (tous les derniers, puis tous les avant-derniers…) avec `n` places : rend combien de couches
 * sont pleines pour une poule qui en a `mienne` de disponibles, et si la suivante est entamée.
 */
function couches(n: number, capacites: number[], mienne: number): { sures: number; possible: number } {
  let reste = n;
  let sures = 0;
  for (let d = 1; d <= mienne; d++) {
    const dansLaCouche = capacites.filter((c) => c >= d).length;
    if (reste >= dansLaCouche) { sures++; reste -= dansLaCouche; } else return { sures, possible: reste > 0 ? 1 : 0 };
  }
  return { sures, possible: 0 };
}

export function placesDeLaPoule(divisionId: string, numeroPoule: number): PlacesDePoule {
  const { poules, ligues } = poulesEtLigues(divisionId);
  const places: PlacesDePoule = { promotion: 0, promotionPossible: 0, relegation: 0, relegationPossible: 0 };
  const poule = poules[numeroPoule];
  if (!poule) return places;
  const ligue = ligues[numeroPoule];
  const haut = divisionAuDessus(divisionId);
  const bas = divisionEnDessous(divisionId);

  // ── Vers le haut : mes places de montée ──────────────────────────────────
  if (haut && (poules.length > 1 || estAPoules(haut))) {
    const r = rulesFor(divisionId).promotionRules;
    const H = poulesEtLigues(haut);
    if (r.promotionSlots > 0) {
      if (r.territory === 'ligue') {
        // Les places de la ligue d'abord ; à défaut, celles du pays (le filet des « orphelins »).
        const demande = r.promotionSlots * ligues.filter((l) => l === ligue).length;
        const offre = H.poules.filter((_, i) => H.ligues[i] === ligue).reduce((n, p) => n + plafondDeDescentes(p.length), 0);
        const demandeTotale = r.promotionSlots * poules.length;
        const offreTotale = H.poules.reduce((n, p) => n + plafondDeDescentes(p.length), 0);
        if (offre >= demande || offreTotale >= demandeTotale) places.promotion = r.promotionSlots;
        else places.promotionPossible = 1;
      } else {
        const offre = H.poules.reduce((n, p) => n + zones(rulesFor(haut), p.length, H.poules.length).directRelegation, 0);
        const demande = r.promotionSlots * poules.length;
        if (demande <= offre) {
          places.promotion = r.promotionSlots;
          places.promotionPossible = r.bestRunnersUp && offre > demande ? 1 : 0;
        } else {
          places.promotion = Math.min(r.promotionSlots, Math.floor(offre / poules.length));
          places.promotionPossible = 1;
        }
      }
    }
  }

  // ── Vers le bas : mes places de descente ─────────────────────────────────
  if (bas && (poules.length > 1 || estAPoules(bas))) {
    const r = rulesFor(bas).promotionRules;
    const B = poulesEtLigues(bas);
    if (r.promotionSlots > 0 || placesAccessionParTableau(rulesFor(bas))) {
      if (r.territory === 'ligue') {
        const memes = poules.filter((_, i) => ligues[i] === ligue).map((p) => plafondDeDescentes(p.length));
        const montantsDeLaLigue = r.promotionSlots * B.ligues.filter((l) => l === ligue).length;
        const offre = memes.reduce((n, c) => n + c, 0);
        const c = couches(Math.min(montantsDeLaLigue, offre), memes, plafondDeDescentes(poule.length));
        places.relegation = c.sures;
        places.relegationPossible = c.possible;
        // Des premiers de poule sans place dans leur ligue prennent celles des clubs les plus menacés du pays.
        const orphelins = [...new Set(B.ligues)].reduce((n, l) => {
          const demande = r.promotionSlots * B.ligues.filter((x) => x === l).length;
          const offreL = poules.filter((_, i) => ligues[i] === l).reduce((s, p) => s + plafondDeDescentes(p.length), 0);
          return n + Math.max(0, demande - offreL);
        }, 0);
        if (orphelins > 0 && places.relegation < plafondDeDescentes(poule.length)) places.relegationPossible = 1;
      } else {
        const directs = poules.map((p) => zones(rulesFor(divisionId), p.length, poules.length).directRelegation);
        const mien = directs[numeroPoule];
        const montants = placesAccessionParTableau(rulesFor(bas)) || r.promotionSlots * B.poules.length + (r.bestRunnersUp ? 2 * B.poules.length : 0);
        const c = couches(Math.min(montants, directs.reduce((n, d) => n + d, 0)), directs, mien);
        places.relegation = c.sures;
        places.relegationPossible = c.possible;
      }
    }
  }
  return places;
}

/**
 * Le statut de chaque place de CETTE poule, de la première à la dernière : ce que `standingsStatuses` promet, corrigé par
 * les places réelles de la poule dans sa division et dans sa ligue. `taille` : le nombre de lignes du classement affiché.
 */
export function statutsDeLaPoule(divisionId: string, numeroPoule: number, taille?: number): StandingsStatus[] {
  const { poules } = poulesEtLigues(divisionId);
  const n = taille ?? poules[numeroPoule]?.length ?? 0;
  const regles = rulesFor(divisionId);
  const base = standingsStatuses(regles, n, poules.length);
  const haut = divisionAuDessus(divisionId);
  const bas = divisionEnDessous(divisionId);
  const hautAPlaces = !!haut && (poules.length > 1 || estAPoules(haut));
  const basAPlaces = !!bas && (poules.length > 1 || estAPoules(bas));
  if (!hautAPlaces && !basAPlaces) return base;
  const places = placesDeLaPoule(divisionId, numeroPoule);
  const z = zones(regles, n, poules.length);
  return base.map((statut, i) => {
    const position = i + 1;
    const depuisLeBas = n - i;
    if (basAPlaces) {
      if (depuisLeBas <= places.relegation) return 'DIRECT_RELEGATION';
      if (depuisLeBas <= places.relegation + places.relegationPossible) return 'RELEGATION_POSSIBLE';
      // La valeur nominale du règlement ne s'applique pas à cette poule-ci.
      if (statut === 'DIRECT_RELEGATION' || statut === 'ACCESS_MATCH') statut = 'SAFE';
    }
    if (hautAPlaces) {
      const finales = poules.length > 1 && position <= z.qualified;
      if (position <= places.promotion) return finales ? 'PROMOTION_FINALS' : 'PROMOTION';
      if (position <= places.promotion + places.promotionPossible) return finales ? 'QUALIFIED' : 'PROMOTION_POSSIBLE';
      if (statut === 'PROMOTION' || statut === 'PROMOTION_FINALS') statut = finales ? 'QUALIFIED' : 'SAFE';
    }
    return statut;
  });
}

/** Le numéro de la poule d'un club dans sa division (0 s'il n'y figure pas). */
export function numeroDeLaPoule(divisionId: string, club: string): number {
  return Math.max(0, poulesEtLigues(divisionId).poules.findIndex((p) => p.includes(club)));
}
