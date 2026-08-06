// LES COUPES D'EUROPE, JOUÉES POUR DE VRAI
//
// Même moteur que le championnat (lib/championnat.ts) : phase de poules au
// barème rugby, puis un TABLEAU FINAL à élimination directe, jusqu'à la finale.
//
// ⚠️ TOUT EST CALÉ SUR LE CALENDRIER, ET C'EST LA CORRECTION DE FOND.
// `data/calendrier.ts` réserve 8 dates européennes : QUATRE journées de poules
// (décembre-janvier) puis QUATRE tours (huitièmes, quarts, demies, finale).
// L'ancienne version devinait ces chiffres — elle jouait 5 journées de poules
// pour 4 dates, et surtout elle produisait le tableau ENTIER dès que les poules
// étaient finies : le joueur voyait les quarts, les demies ET la finale avec
// leurs scores le même week-end, avant même de les avoir disputés.
//
// Format : les clubs engagés sont répartis en poules équilibrées (méthode du
// serpent sur la force d'effectif), chaque poule se joue à l'aller sur 4
// journées — c'est le vrai format européen : dans une poule de 6, on n'affronte
// que 4 adversaires. Les quatre premiers de chaque poule sortent (les deux
// premiers dans une coupe à deux poules). Tout est DÉTERMINISTE (graine = coupe
// + saison) : rien à sauvegarder, rouvrir l'écran ne rejoue rien.

import { COUPES_EUROPE } from '../data/mondeReel';
import { JOURNEES_POULES_COUPE, TOURS_COUPE, weekEndsCoupePasses } from '../data/calendrier';
import { forceEffectif } from './effectif';
import {
  calendrier, classer, jouerRencontre,
  type LigneTableau, type MatchChampionnat,
} from './championnat';
import { duel, type MatchFinal, type TourFinal } from './phaseFinale';

export interface PouleCoupe {
  nom: string;
  clubs: string[];
  journees: MatchChampionnat[][];
  classement: LigneTableau[];
}

export interface EtatCoupe {
  id: string;
  nom: string;
  emoji: string;
  poules: PouleCoupe[];
  totalJournees: number;
  journeesJouees: number;
  /** Les tours DÉJÀ DISPUTÉS, et eux seuls : pas de spoiler. */
  bracket: MatchFinal[];
  toursJoues: number;
  totalTours: number;
  vainqueur: string | null; // null tant que la finale n'a pas été jouée
  engage: boolean; // le club du joueur dispute cette coupe
}

// 4 poules quand il y a du monde (Champions Cup, Challenge Cup), 2 seulement
// pour une coupe courte comme la Premiership Rugby Cup — sinon on qualifierait
// 8 clubs sur 10 engagés.
function nbPoules(engages: number): number {
  return engages >= 16 ? 4 : 2;
}

// Combien de clubs sortent de chaque poule. Le total doit être une PUISSANCE DE
// DEUX (16 avec quatre poules, 4 avec deux) : sans ça le tableau final aurait
// des exempts, et le calendrier ne réserve pas de date pour eux.
function qualifiesParPoule(poules: number): number {
  return poules >= 4 ? 4 : 2;
}

export function coupeParId(id: string) {
  return COUPES_EUROPE.find((c) => c.id === id);
}

// Le club dispute-t-il cette coupe cette saison ?
export function participe(coupeId: string, club: string): boolean {
  return !!coupeParId(coupeId)?.clubs.some((c) => c.nom === club);
}

// Coupes auxquelles ce club participe.
export function coupesDuClub(club: string): string[] {
  return COUPES_EUROPE.filter((c) => c.clubs.some((x) => x.nom === club)).map((c) => c.id);
}

// Répartition en poules « serpent » : on classe par force d'effectif, puis on
// distribue 1-2-3-4 / 4-3-2-1. Les gros ne se retrouvent pas tous ensemble.
function repartir(clubs: string[], saison: number): string[][] {
  const n = nbPoules(clubs.length);
  const tries = [...clubs].sort((a, b) => forceEffectif(b, saison) - forceEffectif(a, saison));
  const poules: string[][] = Array.from({ length: n }, () => []);
  tries.forEach((club, i) => {
    const rangee = Math.floor(i / n);
    const col = rangee % 2 === 0 ? i % n : n - 1 - (i % n);
    poules[col].push(club);
  });
  return poules;
}

// --- LA PHASE DE POULES ------------------------------------------------------
interface Poules {
  poules: PouleCoupe[];
  total: number;
  jouees: number;
}

function jouerPoules(coupeId: string, saison: number, journeesJouees: number): Poules | null {
  const coupe = coupeParId(coupeId);
  if (!coupe || coupe.clubs.length < 8) return null;

  const groupes = repartir(coupe.clubs.map((c) => c.nom), saison);
  // ALLER SIMPLE, TRONQUÉ AU NOMBRE DE DATES : le calendrier ne réserve que 4
  // journées de poules. Dans une poule de 6, on n'affronte donc que 4 des 5
  // adversaires — exactement le format de la vraie Champions Cup.
  const grilles = groupes.map((g) => calendrier(g).slice(0, JOURNEES_POULES_COUPE));
  const total = Math.max(...grilles.map((g) => g.length));
  const jusqua = Math.max(0, Math.min(total, journeesJouees));

  const poules: PouleCoupe[] = groupes.map((clubs, p) => {
    const journees: MatchChampionnat[][] = [];
    for (let j = 0; j < Math.min(jusqua, grilles[p].length); j++) {
      journees.push(grilles[p][j].map(([d, e]) =>
        jouerRencontre(d, e, saison, `${coupeId}#${saison}#${p}#${j}#${d}#${e}`, null),
      ));
    }
    return {
      nom: `Poule ${String.fromCharCode(65 + p)}`,
      clubs,
      journees,
      classement: classer(clubs, journees),
    };
  });

  return { poules, total, jouees: jusqua };
}

// --- LE TABLEAU FINAL --------------------------------------------------------
const LIBELLE_TOUR: Record<string, string> = {
  huitieme: 'Huitième de finale', quart: 'Quart de finale',
  demie: 'Demi-finale', finale: 'FINALE',
};

/**
 * Le tableau complet, TOUR PAR TOUR. On le calcule toujours en entier — il faut
 * bien connaître le vainqueur pour décerner le trophée — mais on le rend
 * découpé, et l'appelant ne montre que les tours déjà disputés.
 */
function bracketParTour(
  coupeId: string, saison: number, poules: PouleCoupe[],
): MatchFinal[][] {
  const n = poules.length;
  const parPoule = qualifiesParPoule(n);
  // Les têtes de série, rang par rang : tous les premiers, puis tous les
  // deuxièmes… L'appariement 1 contre dernier qui suit garantit qu'aucun club
  // ne retrouve un adversaire de sa poule au premier tour.
  const tetes: string[] = [];
  for (let rang = 0; rang < parPoule; rang++) {
    for (let p = 0; p < n; p++) {
      const club = poules[p].classement[rang]?.club;
      if (club) tetes.push(club);
    }
  }
  if (tetes.length !== n * parPoule) return [];

  // Les tours disponibles sont alignés sur la FIN du calendrier : un tableau à
  // 4 équipes commence en demi-finales, pas en huitièmes.
  const nbTours = Math.round(Math.log2(tetes.length));
  const noms = TOURS_COUPE.slice(Math.max(0, TOURS_COUPE.length - nbTours));

  const tours: MatchFinal[][] = [];
  // ⚠️ APPARIEMENT 1 CONTRE N À CHAQUE TOUR. C'est ce qui fait un vrai bracket :
  // le vainqueur de « 1 – 16 » retrouve celui de « 8 – 9 », pas celui de
  // « 2 – 15 ». Apparier les vainqueurs deux à deux dans l'ordre remettrait la
  // tête de série n°1 face à la n°2 dès le tour suivant.
  let engages = tetes;
  for (let t = 0; t < noms.length; t++) {
    const tour = noms[t] as TourFinal;
    const matchs: MatchFinal[] = [];
    const taille = engages.length;
    for (let i = 0; i < taille / 2; i++) {
      const [d, e] = [engages[i], engages[taille - 1 - i]];
      matchs.push(duel(
        d, e, saison,
        `coupe#${coupeId}#${saison}#${tour}#${d}#${e}`,
        tour,
        `${LIBELLE_TOUR[tour] ?? 'Tour'} : ${d} – ${e}`,
        // La finale se joue sur terrain neutre ; ailleurs, le mieux classé reçoit.
        tour === 'finale' ? 0 : 3,
      ));
    }
    tours.push(matchs);
    engages = matchs.map((m) => m.vainqueur);
  }
  return tours;
}

/**
 * Combien de tours du tableau final ont déjà été disputés à cette semaine.
 * `semainesPassees` = week-ends européens ÉCOULÉS (voir `weekEndsCoupePasses`).
 */
function toursJouesA(semainesPassees: number, nbTours: number): number {
  const decalage = JOURNEES_POULES_COUPE + (TOURS_COUPE.length - nbTours);
  return Math.max(0, Math.min(nbTours, semainesPassees - decalage));
}

/**
 * L'état d'une coupe après `semainesPassees` week-ends européens.
 *
 * ⚠️ `semainesPassees` compte les DATES du calendrier, pas les journées de
 * poules : au-delà de 4, on est dans le tableau final.
 */
export function coupeEnDirect(
  coupeId: string, saison: number, clubJoueur: string, semainesPassees: number,
): EtatCoupe | null {
  const coupe = coupeParId(coupeId);
  const p = jouerPoules(coupeId, saison, semainesPassees);
  if (!coupe || !p) return null;

  let bracket: MatchFinal[] = [];
  let toursJoues = 0;
  let totalTours = 0;
  let vainqueur: string | null = null;
  if (p.jouees >= p.total) {
    const tours = bracketParTour(coupeId, saison, p.poules);
    totalTours = tours.length;
    toursJoues = toursJouesA(semainesPassees, totalTours);
    bracket = tours.slice(0, toursJoues).flat();
    // ⚠️ LE VAINQUEUR N'EXISTE QU'UNE FOIS LA FINALE JOUÉE. L'annoncer plus tôt,
    // c'est écrire le nom du champion en tête d'un tableau vide.
    if (toursJoues >= totalTours && totalTours > 0) {
      vainqueur = tours[totalTours - 1][0]?.vainqueur ?? null;
    }
  }

  return {
    id: coupe.id,
    nom: coupe.nom,
    emoji: coupe.emoji,
    poules: p.poules,
    totalJournees: p.total,
    journeesJouees: p.jouees,
    bracket,
    toursJoues,
    totalTours,
    vainqueur,
    engage: participe(coupeId, clubJoueur),
  };
}

/**
 * LE VAINQUEUR DE LA COUPE, une fois la saison finie. Sert au palmarès :
 * `resoudreTrophees` ne tire plus le trophée européen au sort, il regarde qui a
 * gagné la finale.
 */
export function vainqueurCoupe(coupeId: string, saison: number): string | null {
  const p = jouerPoules(coupeId, saison, JOURNEES_POULES_COUPE);
  if (!p || p.jouees < p.total) return null;
  const tours = bracketParTour(coupeId, saison, p.poules);
  return tours.length ? tours[tours.length - 1][0]?.vainqueur ?? null : null;
}

// --- LE MATCH DU CLUB, CE WEEK-END EUROPÉEN ---------------------------------
export interface AfficheCoupe {
  coupeId: string;
  nom: string;
  emoji: string;
  /** Journée de poules (1-4), ou 0 en phase finale. */
  journee: number;
  /** Libellé du tour : « poule », « quart de finale »… */
  tour: string;
  match: MatchChampionnat;
  cle: string;
}

/**
 * ⚠️ CE QUI MANQUAIT POUR JOUER L'EUROPE (bug signalé en jeu : « on peut pas
 * jouer les coupes d'Europe, les matchs ne sont pas simulés en direct »).
 * `matchDeLaSemaine` ne connaissait que le championnat : un week-end européen,
 * il ne renvoyait rien, donc aucun bouton « ▶️ Jouer le match », et le store se
 * rabattait sur une estimation sans adversaire ni score.
 *
 * Ici on rend la VRAIE affiche : poule ou tour du tableau final, avec le score
 * que la coupe a déjà arbitré — le moteur 2D n'a plus qu'à le raconter.
 */
export function afficheCoupeDuClub(
  coupeId: string, saison: number, club: string, numeroSemaine: number,
): AfficheCoupe | null {
  const coupe = coupeParId(coupeId);
  if (!coupe || !participe(coupeId, club)) return null;
  const passees = weekEndsCoupePasses(numeroSemaine);
  const commun = { coupeId, nom: coupe.nom, emoji: coupe.emoji };

  // --- Une journée de poules -------------------------------------------------
  if (passees < JOURNEES_POULES_COUPE) {
    const journee = passees + 1;
    const p = jouerPoules(coupeId, saison, journee);
    if (!p || journee > p.total) return null;
    for (const poule of p.poules) {
      const matchs = poule.journees[journee - 1];
      if (!matchs) continue;
      const mien = matchs.find((m) => m.domicile === club || m.exterieur === club);
      if (!mien) continue;
      const index = p.poules.indexOf(poule);
      return {
        ...commun,
        journee,
        tour: `${poule.nom} · journée ${journee}`,
        match: mien,
        cle: `${coupeId}#${saison}#${index}#${journee - 1}#${mien.domicile}#${mien.exterieur}`,
      };
    }
    return null; // exempt cette journée (poule impaire)
  }

  // --- Un tour du tableau final ---------------------------------------------
  const p = jouerPoules(coupeId, saison, JOURNEES_POULES_COUPE);
  if (!p || p.jouees < p.total) return null;
  const tours = bracketParTour(coupeId, saison, p.poules);
  if (!tours.length) return null;
  // Le tour de CE week-end : celui qui suit les tours déjà joués.
  const index = toursJouesA(passees, tours.length);
  if (index >= tours.length) return null;
  // Le décalage : un tableau court ne commence pas au premier week-end de
  // phase finale — d'ici là, il n'y a pas de match pour ce club.
  const decalage = JOURNEES_POULES_COUPE + (TOURS_COUPE.length - tours.length);
  if (passees < decalage) return null;
  const mien = tours[index].find((m) => m.domicile === club || m.exterieur === club);
  if (!mien) return null;
  return {
    ...commun,
    journee: 0,
    tour: LIBELLE_TOUR[mien.tour] ?? 'Phase finale',
    match: {
      domicile: mien.domicile, exterieur: mien.exterieur,
      scoreD: mien.scoreD, scoreE: mien.scoreE,
      essaisD: Math.max(0, Math.round((mien.scoreD - 6) / 7)),
      essaisE: Math.max(0, Math.round((mien.scoreE - 6) / 7)),
    },
    cle: `coupe#${coupeId}#${saison}#${mien.tour}#${mien.domicile}#${mien.exterieur}`,
  };
}

/** Toutes les affiches d'un tour du tableau final (pour la simulation de fond). */
export function affichesTourCoupe(
  coupeId: string, saison: number, numeroSemaine: number,
): { match: MatchChampionnat; cle: string }[] {
  const passees = weekEndsCoupePasses(numeroSemaine);
  if (passees < JOURNEES_POULES_COUPE) return [];
  const p = jouerPoules(coupeId, saison, JOURNEES_POULES_COUPE);
  if (!p || p.jouees < p.total) return [];
  const tours = bracketParTour(coupeId, saison, p.poules);
  const index = toursJouesA(passees, tours.length);
  const decalage = JOURNEES_POULES_COUPE + (TOURS_COUPE.length - tours.length);
  if (!tours.length || index >= tours.length || passees < decalage) return [];
  return tours[index].map((m) => ({
    match: {
      domicile: m.domicile, exterieur: m.exterieur, scoreD: m.scoreD, scoreE: m.scoreE,
      essaisD: Math.max(0, Math.round((m.scoreD - 6) / 7)),
      essaisE: Math.max(0, Math.round((m.scoreE - 6) / 7)),
    },
    cle: `coupe#${coupeId}#${saison}#${m.tour}#${m.domicile}#${m.exterieur}`,
  }));
}

/** Les affiches d'une journée de POULES (simulation de fond). */
export function affichesJourneePoule(
  coupeId: string, saison: number, journee: number,
): { match: MatchChampionnat; cle: string }[] {
  const p = jouerPoules(coupeId, saison, journee);
  if (!p) return [];
  const sortie: { match: MatchChampionnat; cle: string }[] = [];
  p.poules.forEach((poule, index) => {
    for (const m of poule.journees[journee - 1] ?? []) {
      sortie.push({
        match: m,
        cle: `${coupeId}#${saison}#${index}#${journee - 1}#${m.domicile}#${m.exterieur}`,
      });
    }
  });
  return sortie;
}
