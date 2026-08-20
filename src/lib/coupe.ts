// LES COUPES D'EUROPE, AU VRAI FORMAT (depuis 2023-24)
//
// ⚠️ LE BUG QUI A TOUT DÉCLENCHÉ : « gros bug sur la Champions Cup et la
// Challenge Cup, c'est toujours les mêmes équipes ». Il ne venait pas du
// tirage, il venait de la QUALIFICATION — il n'y en avait aucune. Les engagés
// étaient lus tels quels dans `COUPES_EUROPE` (`data/mondeReel.ts`), une liste
// figée de la saison 2024-25 : les mêmes 24 clubs revenaient éternellement,
// quelle que soit leur saison. Un club relégué en Pro D2 disputait encore la
// Champions Cup dix ans plus tard, et un champion d'Angleterre promu n'y
// entrait jamais.
//
// Désormais, on QUALIFIE (`engagesEuropeens`) : les 8 meilleurs du Top 14, de
// la Premiership et de l'URC de la saison PRÉCÉDENTE entrent en Champions Cup,
// les suivants en Challenge Cup — saison 1 comprise, sur la saison 0 simulée.
//
// ═══════════════════════════════════════════════════════════════════════════
// LE FORMAT, TEL QU'IL EST JOUÉ DEPUIS 2023-24
// ═══════════════════════════════════════════════════════════════════════════
//
// CHAMPIONS CUP — 24 clubs (8 Top 14 + 8 Premiership + 8 URC)
//   • 4 poules de 6, composées de 2 clubs par championnat ;
//   • chaque club ne joue que **4 matchs** (2 à domicile, 2 à l'extérieur)
//     contre 4 adversaires différents. ⚠️ DEUX CLUBS D'UN MÊME CHAMPIONNAT NE
//     S'AFFRONTENT JAMAIS en poule : c'est LA règle du format, et c'est elle
//     qui explique qu'on joue 4 matchs dans une poule de 6 et non 5 ;
//   • barème rugby classique (4 / 2 / 0, bonus offensif et défensif) ;
//   • les 1ᵉʳ, 2ᵉ, 3ᵉ et 4ᵉ de chaque poule (16) vont en huitièmes ;
//   • les **5ᵉ de chaque poule (4) sont REVERSÉS** en huitièmes de Challenge Cup ;
//   • les 6ᵉ sont éliminés de toute compétition européenne.
//
// CHALLENGE CUP — 18 clubs
//   • 3 poules de 6, même fonctionnement, 4 matchs chacun ;
//   • les 4 premiers de chaque poule (12) + les 4 reversés de Champions Cup
//     = les 16 huitièmes de finalistes.
//
// Puis huitièmes, quarts, demies, finale — à élimination directe, en une
// manche, le mieux classé recevant.
//
// ⚠️ ET ÇA TOMBE PILE DANS LE CALENDRIER : 4 journées de poule + 4 tours à
// élimination directe = **8 dates**, exactement ce que `data/calendrier.ts`
// réserve à l'Europe. L'ancien format (aller simple d'une poule de 6, soit 5
// journées) débordait et sacrifiait les huitièmes.
//
// Tout reste DÉTERMINISTE (graine = coupe + saison) : rien à sauvegarder,
// rouvrir l'écran ne rejoue rien.

import { COUPES_EUROPE } from '../data/mondeReel';
import { forceEffectif } from './effectif';
import { clubsDeDivision } from './divisions';
import {
  championnatEnDirect, classer, graine, jouerRencontre,
  type LigneTableau, type MatchChampionnat,
} from './championnat';
import { duel, type MatchFinal } from './phaseFinale';

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
  bracket: MatchFinal[]; // huitièmes → quarts → demies → finale
  vainqueur: string | null;
  engage: boolean; // le club du joueur dispute cette coupe
  /** Les clubs reversés depuis la Champions Cup (Challenge Cup uniquement). */
  reverses: string[];
}

/** Les trois championnats qui alimentent les coupes d'Europe. */
const LIGUES_EUROPE = ['top14', 'premiership', 'urc'] as const;
/** Places qualificatives par championnat, dans l'ordre : Champions puis Challenge. */
const PLACES_CHAMPIONS = 8;
/** 18 clubs en Challenge Cup : 6 par championnat, juste derrière les 8 premiers. */
const PLACES_CHALLENGE = 6;
/** Journées de poule. Le format en impose 4, quel que soit le nombre d'engagés. */
export const JOURNEES_POULE = 4;

export function coupeParId(id: string) {
  return COUPES_EUROPE.find((c) => c.id === id);
}

// =============================================================================
// 1. LA QUALIFICATION — c'est ELLE qui manquait
// =============================================================================

/**
 * Un club engagé, le championnat par lequel il s'est qualifié, et son CHAPEAU.
 *
 * ⚠️ LE CHAPEAU N'EST PAS LE CHAMPIONNAT, et la distinction compte. Le format
 * demande trois blocs de six pour faire des poules de « deux par bloc » — or
 * les championnats ne fournissent pas six clubs chacun en Challenge Cup : la
 * Premiership n'a que 10 clubs, donc 2 places une fois ses 8 partis en
 * Champions Cup. On regroupe donc les restes et les invités (Black Lion, les
 * Cheetahs) dans un troisième chapeau, exactement comme l'EPCR complète son
 * tableau dans la réalité. `ligue` reste la vérité pour l'affichage, `chapeau`
 * commande la composition des poules.
 */
export interface Engage {
  club: string;
  ligue: string;
  chapeau: string;
}

/** Clubs par bloc, et blocs par coupe : trois chapeaux de six, ou quatre de six. */
const PAR_POULE_ET_CHAPEAU = 2;
const TAILLE_POULE_EUROPE = 6;

/**
 * Le classement final d'un championnat à la saison donnée.
 *
 * ⚠️ ON SIMULE LA SAISON ENTIÈRE, et c'est gratuit : `championnatEnDirect` est
 * déterministe et sans état — même graine, même classement, à chaque appel.
 * C'est ce qui permet de connaître les qualifiés d'une saison qu'on n'a pas
 * « rejouée » écran par écran.
 */
function classementFinal(ligue: string, saison: number): string[] {
  const clubs = clubsDeDivision(ligue);
  if (!clubs.length) return [];
  const etat = championnatEnDirect(ligue, saison, '', 999);
  const ordre = etat.classement.map((l) => l.club);
  // Ceinture : un club de la division absent du classement (poule partielle)
  // ne doit pas disparaître de la qualification.
  return [...ordre, ...clubs.filter((c) => !ordre.includes(c))];
}

/**
 * Qui joue quoi cette saison. **LE** correctif : les engagés se méritent.
 *
 * ⚠️ Y COMPRIS À LA SAISON 1, et c'est un choix. On aurait pu y garder la liste
 * réelle livrée dans `COUPES_EUROPE` (la vraie affiche 2024-25) — sauf qu'elle
 * ne respecte PAS le format : 22 clubs en Challenge Cup, des invités hors des
 * trois championnats, des contingents inégaux. On obtenait 5 poules de 4 ou 5
 * au lieu de 3 poules de 6, dès la première saison. La qualification part donc
 * du classement de la saison 0, simulée : elle est déterministe, et comme
 * `forceEffectif` s'appuie sur les notes RÉELLES des clubs, les huit premiers
 * du Top 14 « saison 0 » sont de toute façon les habitués de la Champions Cup.
 */
export function engagesEuropeens(saison: number): Record<string, Engage[]> {
  const classements = new Map<string, string[]>();
  for (const l of LIGUES_EUROPE) classements.set(l, classementFinal(l, saison - 1));
  const rang = (ligue: string, de: number, a: number): string[] =>
    (classements.get(ligue) ?? []).slice(de, a);

  // --- CHAMPIONS CUP : 8 + 8 + 8, un chapeau par championnat --------------
  const champions: Engage[] = [];
  for (const ligue of LIGUES_EUROPE) {
    rang(ligue, 0, PLACES_CHAMPIONS).forEach((club) => champions.push({ club, ligue, chapeau: ligue }));
  }

  // --- CHALLENGE CUP : trois chapeaux de six ------------------------------
  // ⚠️ LE TROISIÈME CHAPEAU EST UN ASSEMBLAGE, ET IL LE FAUT BIEN. Après le
  // départ des 8 premiers en Champions Cup, il reste 6 clubs en Top 14, 6 (sur
  // 8) en URC… et seulement 2 en Premiership. Le troisième chapeau prend donc
  // ces 2 Anglais, les invités européens (Black Lion, Cheetahs) et le reliquat
  // de l'URC : six clubs, comme les deux autres.
  const challenge: Engage[] = [];
  const ajouter = (clubs: string[], ligue: string, chapeau: string) =>
    clubs.forEach((club) => challenge.push({ club, ligue, chapeau }));
  ajouter(rang('top14', PLACES_CHAMPIONS, PLACES_CHAMPIONS + PLACES_CHALLENGE), 'top14', 'top14');
  ajouter(rang('urc', PLACES_CHAMPIONS, PLACES_CHAMPIONS + PLACES_CHALLENGE), 'urc', 'urc');

  const autres: Engage[] = [];
  rang('premiership', PLACES_CHAMPIONS, 99)
    .forEach((club) => autres.push({ club, ligue: 'premiership', chapeau: 'autres' }));
  clubsDeDivision('invitesEurope')
    .forEach((club) => autres.push({ club, ligue: 'invitesEurope', chapeau: 'autres' }));
  // Il manque encore des clubs ? On complète avec le reliquat de l'URC, le plus
  // gros championnat — plutôt que de laisser une poule bancale.
  rang('urc', PLACES_CHAMPIONS + PLACES_CHALLENGE, 99)
    .forEach((club) => autres.push({ club, ligue: 'urc', chapeau: 'autres' }));
  challenge.push(...autres.slice(0, PLACES_CHALLENGE));

  // La Premiership Rugby Cup n'est pas européenne : elle garde sa liste.
  const premCup = coupeParId('premCup');
  return {
    championsCup: champions,
    challengeCup: challenge,
    premCup: (premCup?.clubs ?? [])
      .map((c) => ({ club: c.nom, ligue: 'premiership', chapeau: 'premiership' })),
  };
}

/** Le club dispute-t-il cette coupe cette saison-là ? */
export function participe(coupeId: string, club: string, saison: number): boolean {
  return (engagesEuropeens(saison)[coupeId] ?? []).some((e) => e.club === club);
}

/** Coupes auxquelles ce club participe cette saison-là. */
export function coupesDuClub(club: string, saison: number): string[] {
  const engages = engagesEuropeens(saison);
  return COUPES_EUROPE.filter((c) => (engages[c.id] ?? []).some((e) => e.club === club)).map((c) => c.id);
}

// =============================================================================
// 2. LES POULES — 2 clubs par championnat, jamais deux compatriotes ensemble
// =============================================================================

/**
 * Répartit les engagés en poules de 6, **deux par championnat**.
 *
 * ⚠️ ON RÉPARTIT CHAMPIONNAT PAR CHAMPIONNAT, en serpent sur la force
 * d'effectif : les deux meilleurs Français ne tombent pas dans la même poule,
 * et chaque poule reçoit exactement deux clubs de chaque ligue. C'est cette
 * composition qui rend le format possible — sans elle, la règle « jamais deux
 * clubs du même championnat » ne pourrait pas être tenue en 4 matchs.
 */
function repartir(engages: Engage[], saison: number, cle: string): Engage[][] {
  // ⚠️ ON GROUPE PAR CHAPEAU, PAS PAR CHAMPIONNAT (voir `Engage`).
  const parChapeau = new Map<string, Engage[]>();
  for (const e of engages) {
    if (!parChapeau.has(e.chapeau)) parChapeau.set(e.chapeau, []);
    parChapeau.get(e.chapeau)!.push(e);
  }
  // Le nombre de poules découle du plus gros contingent : 8 clubs par ligue à
  // deux par poule → 4 poules ; 6 clubs par ligue → 3 poules.
  //
  // ⚠️ SAUF QUAND TOUS LES CLUBS VIENNENT DU MÊME CHAMPIONNAT. C'est le cas de
  // la Premiership Rugby Cup, qui est une coupe DOMESTIQUE anglaise : la règle
  // « deux par ligue » y donnerait cinq poules de deux, ce qui n'est plus une
  // poule mais un match. On y retombe sur deux poules, comme avant.
  const parPoule = PAR_POULE_ET_CHAPEAU;
  const nb = parChapeau.size <= 1
    ? 2
    : Math.max(1, Math.ceil(
      Math.max(...[...parChapeau.values()].map((v) => v.length)) / parPoule,
    ));
  const poules: Engage[][] = Array.from({ length: nb }, () => []);

  const alea = graine(cle);
  for (const liste of parChapeau.values()) {
    // Les plus forts d'abord, puis serpent : poule 0,1,2,3 / 3,2,1,0.
    const tries = [...liste].sort((a, b) =>
      forceEffectif(b.club, saison) - forceEffectif(a.club, saison)
      // Départage stable mais tiré : deux clubs de force égale ne sont pas
      // éternellement dans le même ordre d'une saison à l'autre.
      || alea() - 0.5);
    tries.forEach((e, i) => {
      const rangee = Math.floor(i / nb);
      const col = rangee % 2 === 0 ? i % nb : nb - 1 - (i % nb);
      poules[col].push(e);
    });
  }
  return poules.filter((p) => p.length >= 2);
}

/**
 * LES 4 JOURNÉES D'UNE POULE DE 6, sans aucun duel entre compatriotes.
 *
 * ⚠️ CE N'EST PAS UN CALENDRIER TOUR-DE-TABLE TRONQUÉ. Une poule de 6 à deux
 * clubs par championnat, c'est l'octaèdre K(2,2,2) : 4-régulier, donc
 * décomposable en exactement **4 couplages parfaits**. Chaque journée fait
 * jouer les six clubs, chaque club rencontre ses 4 adversaires étrangers une
 * fois et une seule, et son compatriote jamais. Tronquer un aller-retour
 * classique ne donnerait aucune de ces trois propriétés.
 *
 * Notation : a1/a2, b1/b2, c1/c2 = les deux clubs de chaque championnat.
 */
// ⚠️ ET L'ORDRE DE CHAQUE PAIRE EST LE RECEVEUR EN PREMIER — ce n'est pas
// cosmétique. Le format impose **2 réceptions et 2 déplacements** par club.
// Inverser une journée entière (ce que faisait une première version) ne le
// donne jamais : dans une journée, les trois receveurs changent ensemble, et
// certains clubs finissaient à 4 réceptions, d'autres à 1. Il faut orienter les
// 12 arêtes de sorte que chaque sommet ait exactement 2 sorties — autrement dit
// une ORIENTATION EULÉRIENNE du graphe, qui existe parce qu'il est 4-régulier
// (donc de degrés pairs) et connexe. Celle retenue vient du circuit
// 0→2→1→3→0→4→2→5→3→4→1→5→0. Vérifié par `verifCoupesEurope.ts`.
const COUPLAGES: [number, number][][] = [
  [[0, 2], [4, 1], [5, 3]], // a1 reçoit b1 · c1 reçoit a2 · c2 reçoit b2
  [[3, 0], [1, 5], [4, 2]], // b2 reçoit a1 · a2 reçoit c2 · c1 reçoit b1
  [[0, 4], [1, 3], [2, 5]], // a1 reçoit c1 · a2 reçoit b2 · b1 reçoit c2
  [[5, 0], [2, 1], [3, 4]], // c2 reçoit a1 · b1 reçoit a2 · b2 reçoit c1
];

/**
 * Les journées d'une poule. Six clubs → les 4 couplages ci-dessus. Toute autre
 * taille (une coupe courte, une poule incomplète) retombe sur un tour de table
 * ordinaire tronqué à 4 journées : mieux vaut un format approché qu'un écran
 * vide.
 */
function journeesDePoule(clubs: Engage[], cle: string): [string, string][][] {
  if (clubs.length === TAILLE_POULE_EUROPE) {
    // On ordonne a1,a2,b1,b2,c1,c2 : les couplages supposent cet agencement.
    // ⚠️ Par CHAPEAU, pas par championnat (voir `Engage`).
    const parChapeau = new Map<string, string[]>();
    for (const e of clubs) {
      if (!parChapeau.has(e.chapeau)) parChapeau.set(e.chapeau, []);
      parChapeau.get(e.chapeau)!.push(e.club);
    }
    const paires = [...parChapeau.values()];
    if (paires.length === 3 && paires.every((p) => p.length === 2)) {
      const ordre = paires.flat();
      // ⚠️ LE SEUL PANACHAGE AUTORISÉ EST GLOBAL : on inverse TOUTES les
      // affiches, ou aucune. Renverser une journée isolée casserait
      // l'orientation eulérienne (voir `COUPLAGES`) et donc l'équilibre
      // 2 réceptions / 2 déplacements. Inverser tout le monde, en revanche, le
      // préserve exactement — et suffit à ce que ce ne soit pas éternellement
      // le même club qui reçoive à la première journée.
      const miroir = graine(cle)() < 0.5;
      return COUPLAGES.map((journee) => journee.map(([x, y]) =>
        (miroir ? [ordre[y], ordre[x]] : [ordre[x], ordre[y]]) as [string, string]));
    }
  }
  // Repli : tour de table, tronqué au format.
  const noms = clubs.map((e) => e.club);
  const tour: [string, string][][] = [];
  const n = noms.length;
  for (let j = 0; j < Math.min(JOURNEES_POULE, n - 1); j++) {
    const journee: [string, string][] = [];
    for (let i = 0; i < Math.floor(n / 2); i++) {
      const a = noms[i];
      const b = noms[(n - 1 - i + j) % n];
      if (a !== b) journee.push(j % 2 === 0 ? [a, b] : [b, a]);
    }
    tour.push(journee);
  }
  return tour;
}

// =============================================================================
// 3. LA COUPE, JOUÉE
// =============================================================================

interface Qualifies {
  /** Les 16 huitièmes de finalistes, du mieux classé au moins bien classé. */
  seize: string[];
  /** Les 5ᵉ de poule, reversés en Challenge Cup. */
  reverses: string[];
  poules: PouleCoupe[];
  total: number;
}

/** Joue la phase de poules d'une coupe et en tire les qualifiés. */
function phaseDePoules(
  coupeId: string, saison: number, journeesJouees: number, clubJoueur: string,
): Qualifies | null {
  const engages = engagesEuropeens(saison)[coupeId] ?? [];
  if (engages.length < 6) return null;

  const groupes = repartir(engages, saison, `${coupeId}#${saison}`);
  const grilles = groupes.map((g, p) => journeesDePoule(g, `${coupeId}#${saison}#${p}`));
  const total = Math.max(...grilles.map((g) => g.length));
  const jusqua = Math.max(0, Math.min(total, journeesJouees));

  const poules: PouleCoupe[] = groupes.map((groupe, p) => {
    const clubs = groupe.map((e) => e.club);
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

  if (jusqua < total) return { seize: [], reverses: [], poules, total };

  // ⚠️ LE CLASSEMENT EST GLOBAL, PAS PAR POULE. Le format le veut ainsi : on
  // range tous les 1ᵉʳ ensemble, puis tous les 2ᵉ, etc., et à rang égal ce sont
  // les points (puis la différence) qui départagent. C'est ce classement-là qui
  // donne l'avantage du terrain en huitièmes.
  const parRang: { club: string; rang: number; pts: number; diff: number }[] = [];
  const reverses: string[] = [];
  poules.forEach((poule) => {
    poule.classement.forEach((l, i) => {
      if (i < 4) parRang.push({ club: l.club, rang: i, pts: l.points, diff: l.pour - l.contre });
      else if (i === 4) reverses.push(l.club);
    });
  });
  parRang.sort((a, b) => a.rang - b.rang || b.pts - a.pts || b.diff - a.diff);

  void clubJoueur;
  return { seize: parRang.map((e) => e.club), reverses, poules, total };
}

export function coupeEnDirect(
  coupeId: string, saison: number, clubJoueur: string, journeesJouees: number,
): EtatCoupe | null {
  const coupe = coupeParId(coupeId);
  if (!coupe) return null;
  const phase = phaseDePoules(coupeId, saison, journeesJouees, clubJoueur);
  if (!phase) return null;
  const { poules, total } = phase;
  const jusqua = Math.max(0, Math.min(total, journeesJouees));
  const toursJoues = Math.max(0, journeesJouees - total);

  // ⚠️ LA CHALLENGE CUP DOIT ATTENDRE LA CHAMPIONS CUP. Ses huitièmes ne sont
  // pas complets sans les 4 reversés — c'est le cœur du nouveau format. On
  // rejoue donc la phase de poules de la Champions Cup pour les connaître :
  // c'est déterministe et sans état, il n'y a rien à mémoriser.
  let seize = phase.seize;
  let reverses: string[] = [];
  if (coupeId === 'challengeCup' && seize.length) {
    const grande = phaseDePoules('championsCup', saison, total, clubJoueur);
    reverses = grande?.reverses ?? [];
    // Les 12 qualifiés d'office devant, les repêchés derrière : un reversé n'a
    // pas l'avantage du terrain sur un premier de poule.
    seize = [...seize, ...reverses];
  }

  const bracket: MatchFinal[] = [];
  let vainqueur: string | null = null;

  if (jusqua >= total && seize.length >= 4) {
    const cle = (tour: string, a: string, b: string) => `coupe#${coupeId}#${saison}#${tour}#${a}#${b}`;
    // Tableau classique : 1-16, 2-15, 3-14… le mieux classé reçoit.
    let tour = seize.slice(0, 16);
    const nomsTours: MatchFinal['tour'][] = ['barrage', 'quart', 'demie', 'finale'];
    const libelles = ['Huitième de finale', 'Quart de finale', 'Demi-finale', 'FINALE'];
    // Un tableau de 16 fait 4 tours, un tableau de 8 en fait 3 : on démarre au
    // bon endroit pour que la finale reste la finale.
    let etape = tour.length > 8 ? 0 : 1;
    const tous: MatchFinal[] = [];

    while (tour.length > 1 && etape < nomsTours.length) {
      const suivants: string[] = [];
      const moitie = Math.floor(tour.length / 2);
      for (let i = 0; i < moitie; i++) {
        const d = tour[i];
        const e = tour[tour.length - 1 - i];
        const finale = tour.length === 2;
        const m = duel(
          d, e, saison, cle(nomsTours[etape], d, e), nomsTours[etape],
          `${libelles[etape]} : ${d} - ${e}`,
          // Terrain neutre pour la finale, avantage au mieux classé sinon.
          finale ? 0 : undefined,
        );
        tous.push(m);
        suivants.push(m.vainqueur);
      }
      tour = suivants;
      etape += 1;
    }

    const ordre: Record<MatchFinal['tour'], number> = { barrage: 1, quart: 2, demie: 3, finale: 4, accession: 5 };
    // Les tours d'un tableau de 8 démarrent au quart : on décale pour que le
    // premier tour joué soit bien débloqué à la première date de phase finale.
    const decalage = seize.length > 8 ? 0 : 1;
    bracket.push(...tous.filter((m) => ordre[m.tour] - decalage <= toursJoues));
    const derniere = tous[tous.length - 1];
    if (derniere && ordre[derniere.tour] - decalage <= toursJoues) vainqueur = derniere.vainqueur;
  }

  return {
    id: coupe.id,
    nom: coupe.nom,
    emoji: coupe.emoji,
    poules,
    totalJournees: total,
    journeesJouees: jusqua,
    bracket,
    vainqueur,
    engage: (engagesEuropeens(saison)[coupeId] ?? []).some((e) => e.club === clubJoueur),
    reverses,
  };
}
