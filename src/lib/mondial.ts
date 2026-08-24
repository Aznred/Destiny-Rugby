// 🌍 LA COUPE DU MONDE — format 2027 : 24 nations, 6 poules de 4, huitièmes.
//
// ═══ LE FORMAT, TEL QU'IL A ÉTÉ DONNÉ ═══════════════════════════════════════
//
// Demande explicite, et elle décrit le vrai format de l'édition 2027 :
//
//   • **24 équipes en 6 poules de 4.** Chaque équipe joue UNE FOIS contre
//     chacun de ses trois adversaires : un vrai toutes rondes, plus la poule
//     tronquée de l'ancien format.
//   • **Les deux premiers de chaque poule (12) + les quatre meilleurs
//     troisièmes** = 16 qualifiés.
//   • **Huitièmes de finale**, puis quarts, demies, **match pour la 3ᵉ place**
//     et finale.
//   • **Bonus offensif à QUATRE ESSAIS**, pas à trois essais d'écart.
//   • Égalité en phase finale : **prolongation**, puis **tirs au but (drops)**.
//
// ⚠️ CE FICHIER REMPLACE LE FORMAT PRÉCÉDENT (4 poules de 6, deux matchs
// chacune, tableau à 8). Il n'en reste rien : ni le tirage, ni la grille, ni le
// nombre de qualifiés. Ne pas chercher à faire cohabiter les deux.
//
// ═══ LA COMPRESSION DU CALENDRIER, ET ELLE EST ASSUMÉE ══════════════════════
//
// Le calendrier réserve **trois dates** à la fenêtre d'automne, et la Coupe du
// monde les remplace (`estAnneeDeCoupeDuMonde`). Une vraie Coupe du monde en
// prend sept. Il faut donc caser trois tours de poule ET cinq tours de tableau
// dans trois week-ends :
//
//   | date | ce qui se joue |
//   |------|----------------|
//   | S10  | 1ᵉʳ tour de poule |
//   | S11  | **2ᵉ ET 3ᵉ tours de poule** |
//   | S12  | tout le tableau : huitièmes → quarts → demies → 3ᵉ place → finale |
//
// ⚠️ POURQUOI COMPRIMER LES POULES PLUTÔT QUE LE TABLEAU. Le joueur ne dispute
// qu'UN match par date de calendrier. En étalant les poules sur les trois
// dates, il jouerait ses trois matchs de poule et **ne jouerait jamais un match
// à élimination directe de Coupe du monde** — on lui retirerait le seul moment
// qui compte. En comprimant les poules, il joue deux matchs de poule en direct,
// son troisième se résout en fond, et il dispute VRAIMENT son huitième.
//
// ⚠️ L'ALTERNATIVE A ÉTÉ ÉCARTÉE, chiffres à l'appui : étaler le tournoi
// demanderait de supprimer la tournée d'automne ET quatre journées de
// championnat une saison sur quatre — donc de changer le nombre de journées de
// la saison, et tout l'étalonnage qui en dépend (`verifDifficulte.ts`,
// `verifPyramide.ts`, la note de saison, les statistiques individuelles).
//
// ⚠️ **DÉTERMINISTE, RIEN À SAUVEGARDER**, comme les coupes d'Europe : la
// graine est `mondial#saison`. Rouvrir l'écran ne rejoue rien.

import {
  classer, graine, scorePossible,
  type LigneTableau, type MatchChampionnat,
} from './championnat';
import type { MatchFinal } from './phaseFinale';
import { forceNation, jouerTestMatch, qualifiesCoupeDuMonde } from './international';

/**
 * Les tours de poule RÉELLEMENT joués : un toutes rondes de quatre en fait
 * trois. À ne pas confondre avec `DATES_POULES`.
 */
export const JOURNEES_POULES = 3;

/**
 * Les DATES DE CALENDRIER que les poules occupent.
 *
 * ⚠️ DEUX DATES POUR TROIS TOURS, et c'est tout le compromis du fichier (voir
 * l'entête) : la deuxième date en porte deux. C'est ce qui libère la troisième
 * pour le tableau final, et donc ce qui permet au joueur de disputer un
 * huitième de finale de Coupe du monde.
 */
export const DATES_POULES = 2;

/** Nombre de poules, et de nations par poule. */
export const NB_POULES = 6;
export const PAR_POULE = 4;

/** Les quatre meilleurs troisièmes complètent les seize. */
export const MEILLEURS_TROISIEMES = 4;

export interface PouleMondial {
  nom: string;
  equipes: string[];
  journees: MatchChampionnat[][];
  classement: LigneTableau[];
}

export interface EtatMondial {
  saison: number;
  poules: PouleMondial[];
  /** Les 16 qualifiés pour le tableau, dans l'ordre des têtes de série. */
  qualifies: string[];
  /** Les quatre meilleurs troisièmes retenus, pour l'afficher à l'écran. */
  meilleursTroisiemes: string[];
  bracket: MatchFinal[];
  vainqueur: string | null;
  /** Le finaliste battu, et le vainqueur de la petite finale. */
  finaliste: string | null;
  troisieme: string | null;
  /** Tours de poule joués (0 à 3), pas dates de calendrier. */
  journeesPoulesJouees: number;
  /** Le tableau final a-t-il été disputé ? */
  tableauJoue: boolean;
}

/**
 * Combien de tours de poule sont joués après `dates` dates de calendrier.
 *
 * ⚠️ UNE SEULE DÉFINITION DE LA COMPRESSION. Elle est lue par `mondialEnDirect`,
 * par `afficheMondialDe` et par `matchsInternationaux` (international.ts) :
 * trois exemplaires de cette petite règle, et un jour l'écran annoncerait un
 * match que le classement ne connaît pas.
 */
export function toursDePouleApres(dates: number): number {
  if (dates <= 0) return 0;
  if (dates === 1) return 1;
  return JOURNEES_POULES; // la 2ᵉ date porte les tours 2 et 3
}

/**
 * Un tour à élimination directe : prolongation, puis tirs au but.
 *
 * ⚠️ UN TOUR À ÉLIMINATION DIRECTE NE PEUT PAS FINIR SUR UN NUL, et
 * `jouerTestMatch` ne le sait pas — il rend un score de test-match, nul
 * compris. On départage APRÈS l'arrondi de `scorePossible`, comme `duel()` :
 * rabattre 4 sur 3 peut CRÉER une égalité (4-3 devient 3-3), et trancher en
 * amont laisserait des matchs nuls dans un tableau où quelqu'un doit sortir.
 *
 * ⚠️ ET LE DÉPARTAGE SE FAIT EN DEUX TEMPS, comme le règlement : d'abord une
 * PROLONGATION où l'on peut marquer (donc un score qui bouge, +3 ou +5), et si
 * l'égalité persiste une séance de DROPS — qui, elle, ne change pas le score
 * affiché. C'est la seule façon d'avoir un vainqueur sans inventer des points
 * qui n'ont pas été marqués sur le terrain.
 */
function duelNation(
  a: string, b: string, cle: string,
  tour: MatchFinal['tour'], libelle: string,
): MatchFinal {
  const rng = graine(cle);
  // Terrain neutre : une Coupe du monde se joue chez un hôte, pas chez l'un des
  // deux. Aucun avantage au « receveur », qui n'en est pas un.
  const ecart = forceNation(a) - forceNation(b);
  let scoreD = scorePossible(23 + ecart * 1.2 + (rng() * 18 - 9));
  let scoreE = scorePossible(23 - ecart * 1.2 + (rng() * 18 - 9));
  let mention = '';

  if (scoreD === scoreE) {
    // Prolongation : vingt minutes, et l'écart de niveau pèse plus qu'à
    // quatre-vingts — les organismes lâchent, la meilleure équipe sort.
    const prolongation = rng();
    const pourA = ecart > 0 ? prolongation < 0.66 : ecart < 0 ? prolongation < 0.34 : prolongation < 0.5;
    // Un essai en prolongation existe : on ne se contente pas d'un drop.
    const gain = rng() < 0.3 ? 7 : 3;
    if (pourA) scoreD += gain; else scoreE += gain;
    mention = ' (a.p.)';

    // Une prolongation peut se terminer sur une égalité elle aussi — l'autre
    // équipe a répondu. Là, et seulement là, on passe aux drops.
    if (rng() < 0.18) {
      if (pourA) scoreE += gain; else scoreD += gain;
      // Les drops ne s'ajoutent PAS au score : ils désignent un vainqueur.
      const auxDrops = ecart >= 0 ? rng() < 0.6 : rng() < 0.4;
      return {
        tour,
        libelle: libelle + ' (tirs au but)',
        domicile: a,
        exterieur: b,
        scoreD,
        scoreE,
        vainqueur: auxDrops ? a : b,
        perdant: auxDrops ? b : a,
      };
    }
  }

  return {
    tour,
    libelle: libelle + mention,
    domicile: a,
    exterieur: b,
    scoreD,
    scoreE,
    vainqueur: scoreD > scoreE ? a : b,
    perdant: scoreD > scoreE ? b : a,
  };
}

/** Mélange déterministe (Fisher-Yates seedé), comme le tirage du championnat. */
function melanger<T>(liste: T[], cle: string): T[] {
  const rng = graine(cle);
  const t = [...liste];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

/**
 * Le tirage : quatre chapeaux de six, un par ligne de poule.
 *
 * ⚠️ LES CHAPEAUX EXISTENT POUR QUE LE TIRAGE AIT UN SENS. Sans eux, une poule
 * pouvait réunir la Nouvelle-Zélande, l'Afrique du Sud et l'Irlande pendant
 * qu'une autre alignait le Paraguay, l'Allemagne et la Roumanie. On répartit
 * donc les 24 nations en **quatre chapeaux de six** selon leur rang mondial, et
 * chaque poule reçoit exactement une nation de chaque chapeau — c'est le tirage
 * réel d'une Coupe du monde, et avec des poules de quatre il tombe juste sans
 * le moindre reste.
 */
function tirerLesPoules(qualifies: string[], saison: number): string[][] {
  const poules: string[][] = Array.from({ length: NB_POULES }, () => []);
  for (let chapeau = 0; chapeau < PAR_POULE; chapeau++) {
    const lot = melanger(
      qualifies.slice(chapeau * NB_POULES, chapeau * NB_POULES + NB_POULES),
      `mondial#${saison}#chapeau${chapeau}`,
    );
    lot.forEach((nation, i) => poules[i].push(nation));
  }
  return poules;
}

/**
 * Les trois tours d'une poule de quatre : un vrai toutes rondes.
 *
 * ⚠️ LES SIX AFFICHES SONT LÀ, ET CHACUNE UNE SEULE FOIS. C'est ce que
 * l'ancien format ne savait pas faire : sa poule de six ne jouait que deux
 * matchs, et sa première version rejouait une affiche sur trois (2-5 et 5-2
 * sont le même match). Avec quatre équipes, il n'y a plus de compromis à
 * faire : ab · cd, puis ac · db, puis ad · bc — les six paires, une fois.
 */
function affichesDePoule(poule: string[]): [string, string][][] {
  const [a, b, c, d] = poule;
  return [
    [[a, b], [c, d]],
    [[a, c], [d, b]],
    [[a, d], [b, c]],
  ];
}

/**
 * ⚠️ LE BARÈME DE LA COUPE DU MONDE N'EST PAS CELUI DU TOP 14.
 *
 * Le bonus offensif d'un championnat de clubs se gagne à **trois essais
 * d'écart** ; celui d'une Coupe du monde se gagne à **quatre essais marqués**,
 * quel que soit le résultat. `classer` applique la règle des clubs (c'est la
 * bonne, pour eux) : on recalcule donc ici les seuls points, sur les mêmes
 * matchs, avec la règle du tournoi.
 */
function classerMondial(equipes: string[], journees: MatchChampionnat[][]): LigneTableau[] {
  const base = new Map(classer(equipes, journees).map((l) => [l.club, { ...l, points: 0, bonus: 0 }]));
  for (const journee of journees) {
    for (const m of journee) {
      const a = base.get(m.domicile);
      const b = base.get(m.exterieur);
      if (!a || !b) continue;
      if (m.scoreD > m.scoreE) a.points += 4;
      else if (m.scoreD < m.scoreE) b.points += 4;
      else { a.points += 2; b.points += 2; }
      // Bonus offensif : quatre essais ou plus, victoire ou défaite.
      if (m.essaisD >= 4) { a.points++; a.bonus++; }
      if (m.essaisE >= 4) { b.points++; b.bonus++; }
      // Bonus défensif : battu de sept points ou moins. Cumulable.
      if (m.scoreD < m.scoreE && m.scoreE - m.scoreD <= 7) { a.points++; a.bonus++; }
      if (m.scoreE < m.scoreD && m.scoreD - m.scoreE <= 7) { b.points++; b.bonus++; }
    }
  }
  return [...base.values()]
    .sort((x, y) => y.points - x.points || y.difference - x.difference || y.pour - x.pour)
    .map((l, i) => ({ ...l, position: i + 1 }));
}

/**
 * L'état de la Coupe du monde à un instant de la saison.
 *
 * @param datesJouees Nombre de DATES DE CALENDRIER de la fenêtre déjà jouées
 *   (0 à 3), pas de tours de poule. La conversion est dans
 *   `toursDePouleApres` — une seule définition, trois lecteurs.
 */
export function mondialEnDirect(saison: number, datesJouees: number): EtatMondial {
  const qualifies = qualifiesCoupeDuMonde(saison);
  const tirage = tirerLesPoules(qualifies, saison);
  const tours = toursDePouleApres(datesJouees);

  const poules: PouleMondial[] = tirage.map((equipes, i) => {
    const grille = affichesDePoule(equipes);
    const journees: MatchChampionnat[][] = [];
    for (let j = 0; j < tours && j < grille.length; j++) {
      journees.push(grille[j].map(([x, y]) =>
        jouerTestMatch(x, y, saison, `mondial#${saison}#poule${i}#${j}#${x}#${y}`, null)));
    }
    return {
      nom: `Poule ${String.fromCharCode(65 + i)}`,
      equipes,
      journees,
      classement: classerMondial(equipes, journees),
    };
  });

  const poulesFinies = tours >= JOURNEES_POULES;
  const tableauJoue = datesJouees > DATES_POULES && poulesFinies;

  // ═══ LES SEIZE QUALIFIÉS ═══════════════════════════════════════════════
  const premiers = poules.map((p) => p.classement[0]).filter(Boolean);
  const seconds = poules.map((p) => p.classement[1]).filter(Boolean);
  // ⚠️ LES QUATRE MEILLEURS TROISIÈMES SE COMPARENT ENTRE POULES, et c'est le
  //    seul endroit du jeu où des lignes de tableaux DIFFÉRENTS sont mises en
  //    concurrence. Le critère est celui du règlement, dans l'ordre : points,
  //    puis différence, puis points marqués.
  const troisiemesClasses = poules
    .map((p) => p.classement[2])
    .filter(Boolean)
    .sort((x, y) => y.points - x.points || y.difference - x.difference || y.pour - x.pour);
  const troisiemesRetenus = poulesFinies
    ? troisiemesClasses.slice(0, MEILLEURS_TROISIEMES)
    : [];

  // Têtes de série : les six vainqueurs de poule, puis les six deuxièmes, puis
  // les quatre troisièmes repêchés. Chaque bloc trié sur son propre mérite.
  const parMerite = (l: LigneTableau[]) =>
    [...l].sort((x, y) => y.points - x.points || y.difference - x.difference || y.pour - x.pour);
  const seize = poulesFinies
    ? [...parMerite(premiers), ...parMerite(seconds), ...troisiemesRetenus].map((l) => l.club)
    : [];

  const bracket: MatchFinal[] = [];
  let vainqueur: string | null = null;
  let finaliste: string | null = null;
  let troisieme: string | null = null;

  if (tableauJoue && seize.length === 16) {
    // ⚠️ TABLEAU CLASSIQUE 1-16, 2-15, 3-14… La tête de série 1 ne peut
    //    rencontrer la 2 qu'en finale : sans ce croisement, les favoris
    //    s'élimineraient d'entrée et le tableau ne voudrait rien dire.
    const TOURS: MatchFinal['tour'][] = ['huitieme', 'quart', 'demie', 'finale'];
    const LIBELLES = ['Huitième de finale', 'Quart de finale', 'Demi-finale', 'FINALE'];
    let tour = seize;
    const perdantsDemies: string[] = [];

    for (let etape = 0; etape < TOURS.length && tour.length > 1; etape++) {
      const suivants: string[] = [];
      const moitie = Math.floor(tour.length / 2);
      for (let i = 0; i < moitie; i++) {
        const d = tour[i];
        const e = tour[tour.length - 1 - i];
        const m = duelNation(
          d, e,
          `mondial#${saison}#${TOURS[etape]}#${d}#${e}`,
          TOURS[etape], `${LIBELLES[etape]} : ${d} - ${e}`,
        );
        bracket.push(m);
        suivants.push(m.vainqueur);
        if (TOURS[etape] === 'demie') perdantsDemies.push(m.perdant);
        if (TOURS[etape] === 'finale') finaliste = m.perdant;
      }
      tour = suivants;
    }
    vainqueur = tour[0] ?? null;

    // ⚠️ LA PETITE FINALE SE JOUE APRÈS LA FINALE DANS LE CODE, mais elle se
    //    place AVANT dans le tableau affiché (`ORDRE_TOURS`, Tableau.tsx) :
    //    il faut connaître les deux perdants de demies, et on ne les a qu'une
    //    fois les demies jouées.
    if (perdantsDemies.length === 2) {
      const p = duelNation(
        perdantsDemies[0], perdantsDemies[1],
        `mondial#${saison}#petiteFinale#${perdantsDemies[0]}#${perdantsDemies[1]}`,
        'petiteFinale',
        `Match pour la 3ᵉ place : ${perdantsDemies[0]} - ${perdantsDemies[1]}`,
      );
      bracket.push(p);
      troisieme = p.vainqueur;
    }
  }

  return {
    saison,
    poules,
    qualifies: seize,
    meilleursTroisiemes: troisiemesRetenus.map((l) => l.club),
    bracket,
    vainqueur,
    finaliste,
    troisieme,
    journeesPoulesJouees: tours,
    tableauJoue,
  };
}

/**
 * L'affiche de CETTE nation à la date de calendrier demandée, s'il y en a une.
 *
 * ⚠️ LA DATE 2 PORTE DEUX TOURS DE POULE, et on rend celui du tour 2 : le
 * troisième se résout en fond. C'est la compression décrite en tête de fichier,
 * et c'est ce qui laisse la date 3 au tableau final.
 *
 * ⚠️ AU TABLEAU FINAL, ON REND LE PREMIER MATCH DE SA NATION — son huitième.
 * Les cinq tours tombent le même week-end : rendre le dernier aurait fait jouer
 * une finale à une équipe qui n'a pas passé son huitième.
 */
export function afficheMondialDe(
  etat: EtatMondial, nation: string, dateJournee: number,
): { match: MatchChampionnat; libelle: string } | null {
  if (dateJournee <= DATES_POULES) {
    // date 1 → tour 1 · date 2 → tour 2
    const tour = dateJournee - 1;
    for (const poule of etat.poules) {
      const m = poule.journees[tour]?.find(
        (x) => x.domicile === nation || x.exterieur === nation,
      );
      if (m) return { match: m, libelle: `${poule.nom}, journée ${dateJournee}` };
    }
    return null;
  }
  const f = etat.bracket.find((m) => m.domicile === nation || m.exterieur === nation);
  if (!f) return null;
  return {
    match: {
      domicile: f.domicile, exterieur: f.exterieur,
      scoreD: f.scoreD, scoreE: f.scoreE,
      essaisD: Math.max(0, Math.round((f.scoreD - 6) / 7)),
      essaisE: Math.max(0, Math.round((f.scoreE - 6) / 7)),
    },
    libelle: f.libelle,
  };
}

/**
 * Les matchs regroupés PAR DATE DE CALENDRIER, pas par tour de poule.
 *
 * ⚠️ C'EST CE QUI PERMET AUX ÉCRANS DE GARDER « journée = date ». La date 2
 * porte deux tours : elle rend donc douze affiches, et c'est exact — deux
 * rondes se sont jouées ce week-end-là. Sans ce regroupement, l'écran Résultats
 * afficherait le tour 3 à la place du tableau final.
 */
export function journeesParDate(etat: EtatMondial): MatchChampionnat[][] {
  const dates: MatchChampionnat[][] = [];
  const tour = (j: number) => etat.poules.flatMap((p) => p.journees[j] ?? []);
  if (etat.journeesPoulesJouees >= 1) dates.push(tour(0));
  if (etat.journeesPoulesJouees >= 2) dates.push([...tour(1), ...tour(2)]);
  if (etat.tableauJoue) dates.push(matchsDuBracket(etat));
  return dates;
}

/** Le tableau final, en matchs de championnat (pour le classement mondial). */
export function matchsDuBracket(etat: EtatMondial): MatchChampionnat[] {
  return etat.bracket.map((f) => ({
    domicile: f.domicile, exterieur: f.exterieur,
    scoreD: f.scoreD, scoreE: f.scoreE,
    essaisD: Math.max(0, Math.round((f.scoreD - 6) / 7)),
    essaisE: Math.max(0, Math.round((f.scoreE - 6) / 7)),
  }));
}

/** Tous les matchs disputés, pour le classement mondial et les statistiques. */
export function matchsDuMondial(etat: EtatMondial): MatchChampionnat[] {
  const tous: MatchChampionnat[] = [];
  for (const p of etat.poules) for (const j of p.journees) tous.push(...j);
  tous.push(...matchsDuBracket(etat));
  return tous;
}
