// 🌍 LA COUPE DU MONDE — poules, tableau final, un vainqueur.
//
// Retour de jeu, mot pour mot : « gros bug, il n'y a jamais de Coupe du monde
// jouée ».
//
// ═══ CE QUI EXISTAIT, ET POURQUOI ÇA NE RESSEMBLAIT À RIEN ═══════════════════
//
// La Coupe du monde était déclarée comme une compétition ORDINAIRE
// (`COUPE_DU_MONDE` dans `international.ts`) : 24 équipes, 4 journées, un
// classement au barème rugby, et le « vainqueur » = le premier de ce
// classement. Trois conséquences, toutes visibles en jeu :
//
// 1. **ELLE NE SE TERMINAIT JAMAIS.** Elle déclarait 4 journées et le
//    calendrier ne réserve que **3 dates** à la fenêtre d'automne : la
//    quatrième n'était jamais jouée, et le classement restait celui d'un
//    tournoi interrompu.
// 2. **IL N'Y AVAIT NI POULE NI PHASE FINALE.** Vingt-quatre nations tirées au
//    hasard dans un mini-championnat : ni tableau, ni demi-finale, ni finale.
//    On ne pouvait ni suivre un parcours, ni perdre en quart, ni gagner un
//    titre — on regardait une colonne de points.
// 3. **LE TITRE ALLAIT AU PREMIER D'UNE LIGUE TRONQUÉE**, c'est-à-dire à
//    l'équipe qui avait eu les trois adversaires les plus tendres.
//
// ═══ LE FORMAT RETENU, ET LA COMPRESSION ASSUMÉE ═════════════════════════════
//
// Le calendrier réserve **trois dates** à la fenêtre d'automne, et la Coupe du
// monde les remplace (`estAnneeDeCoupeDuMonde`). Une vraie Coupe du monde en
// prend six ou sept. On compresse donc, et on le dit :
//
//   • **S10 et S11 — les poules.** 24 nations, **4 poules de 6**, et chaque
//     nation ne joue que **DEUX matchs**, contre deux adversaires différents.
//     ⚠️ C'est exactement le format des coupes d'Europe depuis 2023-24 (voir
//     l'entête de `coupe.ts` : « 4 matchs dans une poule de 6 ») — le jeu sait
//     déjà le lire, l'afficher et le classer.
//   • **S12 — le tableau final.** Les **deux premiers de chaque poule** (8)
//     disputent quarts, demies et finale.
//
// ⚠️ **LES TROIS TOURS DU TABLEAU TOMBENT LE MÊME WEEK-END, et c'est le seul
// compromis du fichier.** Le joueur ne dispute qu'UN match par semaine de
// calendrier : il joue donc le quart de finale de sa nation, et voit le reste
// du tableau se dérouler. L'alternative — étaler le tableau sur trois dates —
// demanderait de supprimer la tournée d'automne ET deux journées de
// championnat une saison sur quatre, ce qui déplacerait le nombre de journées
// de la saison et tout l'étalonnage qui en dépend.
//
// ⚠️ **DÉTERMINISTE, RIEN À SAUVEGARDER**, comme les coupes d'Europe : la
// graine est `mondial#saison`. Rouvrir l'écran ne rejoue rien.

import {
  classer, graine, scorePossible,
  type LigneTableau, type MatchChampionnat,
} from './championnat';
import type { MatchFinal } from './phaseFinale';
import { forceNation, jouerTestMatch, qualifiesCoupeDuMonde } from './international';

/** Le nombre de journées de poule, et donc de dates de calendrier. */
export const JOURNEES_POULES = 2;

export interface PouleMondial {
  nom: string;
  equipes: string[];
  journees: MatchChampionnat[][];
  classement: LigneTableau[];
}

export interface EtatMondial {
  saison: number;
  poules: PouleMondial[];
  /** Les 8 qualifiés pour le tableau, dans l'ordre du tirage. */
  qualifies: string[];
  bracket: MatchFinal[];
  vainqueur: string | null;
  journeesPoulesJouees: number;
  /** Le tableau final a-t-il été disputé ? */
  tableauJoue: boolean;
}

/**
 * ⚠️ UN TOUR À ÉLIMINATION DIRECTE NE PEUT PAS FINIR SUR UN NUL, et
 * `jouerTestMatch` ne le sait pas — il rend un score de test-match, nul
 * compris. On départage APRÈS l'arrondi de `scorePossible`, comme `duel()` :
 * rabattre 4 sur 3 peut CRÉER une égalité (4-3 devient 3-3), et trancher en
 * amont laisserait des matchs nuls dans un tableau où quelqu'un doit sortir.
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
  if (scoreD === scoreE) {
    // Prolongation : l'écart de niveau tranche, le hasard finit le travail.
    if (ecart > 0 || (ecart === 0 && rng() < 0.5)) scoreD += 3;
    else scoreE += 3;
  }
  return {
    tour,
    libelle,
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
 * Le tirage des poules : quatre chapeaux, un serpentin.
 *
 * ⚠️ LES CHAPEAUX EXISTENT POUR QUE LE TIRAGE AIT UN SENS. Sans eux, une poule
 * pouvait réunir la Nouvelle-Zélande, l'Afrique du Sud et l'Irlande pendant
 * qu'une autre alignait le Paraguay, l'Allemagne et la Roumanie — et le
 * classement mondial des qualifiés, lui, existe déjà. On répartit donc les
 * 24 nations en quatre chapeaux de six selon leur rang, et chaque poule prend
 * une nation par chapeau… deux fois (poules de 6).
 */
function tirerLesPoules(qualifies: string[], saison: number): string[][] {
  const poules: string[][] = [[], [], [], []];
  // Six chapeaux de quatre : chaque poule reçoit une nation de chaque chapeau.
  for (let chapeau = 0; chapeau < 6; chapeau++) {
    const lot = melanger(
      qualifies.slice(chapeau * 4, chapeau * 4 + 4),
      `mondial#${saison}#chapeau${chapeau}`,
    );
    lot.forEach((nation, i) => poules[i].push(nation));
  }
  return poules;
}

/**
 * ⚠️ DEUX MATCHS DANS UNE POULE DE SIX, et c'est le format, pas un raccourci.
 *
 * Chaque nation affronte deux adversaires DIFFÉRENTS, et jamais deux fois le
 * même : c’est la rotation classique du carrousel, la première équipe fixe et
 * les cinq autres qui tournent d’un cran.
 *
 * ⚠️ LA PREMIÈRE VERSION FAISAIT REJOUER UNE AFFICHE SUR TROIS, et elle avait
 * l’air juste : 1-6, 2-5, 3-4 puis 4-1, 5-2, 6-3. On croit avoir tout décalé,
 * mais **2-5 et 5-2 sont le même match** — le banc d’essai a relevé douze
 * doublons sur trois éditions. Une poule où deux nations se rencontrent deux
 * fois pendant qu’elles en ignorent trois autres n’est pas une poule.
 */
function affichesDePoule(poule: string[]): [string, string][][] {
  const [a, b, c, d, e, f] = poule;
  return [
    [[a, f], [b, e], [c, d]],
    [[a, b], [c, f], [d, e]],
  ];
}

/**
 * L'état de la Coupe du monde à un instant de la saison.
 *
 * @param journeesJouees 0, 1 ou 2 pour les poules ; 3 et plus = tableau final.
 */
export function mondialEnDirect(saison: number, journeesJouees: number): EtatMondial {
  const qualifies = qualifiesCoupeDuMonde(saison);
  const tirage = tirerLesPoules(qualifies, saison);
  const jouees = Math.max(0, Math.min(JOURNEES_POULES, journeesJouees));

  const poules: PouleMondial[] = tirage.map((equipes, i) => {
    const grille = affichesDePoule(equipes);
    const journees: MatchChampionnat[][] = [];
    for (let j = 0; j < jouees; j++) {
      journees.push(grille[j].map(([x, y]) =>
        jouerTestMatch(x, y, saison, `mondial#${saison}#poule${i}#${j}#${x}#${y}`, null)));
    }
    return {
      nom: `Poule ${String.fromCharCode(65 + i)}`,
      equipes,
      journees,
      classement: classer(equipes, journees),
    };
  });

  const tableauJoue = journeesJouees > JOURNEES_POULES && jouees === JOURNEES_POULES;
  const bracket: MatchFinal[] = [];
  let vainqueur: string | null = null;
  // ⚠️ LES DEUX PREMIERS DE CHAQUE POULE, CROISÉS. Un premier de poule ne
  // rencontre pas un autre premier en quart : c'est la règle de tout tableau,
  // et sans le croisement les quatre favoris se seraient éliminés d'entrée.
  const premiers = poules.map((p) => p.classement[0]?.club).filter(Boolean) as string[];
  const seconds = poules.map((p) => p.classement[1]?.club).filter(Boolean) as string[];
  const huit = [premiers[0], seconds[1], premiers[2], seconds[3],
    premiers[1], seconds[0], premiers[3], seconds[2]].filter(Boolean) as string[];

  if (tableauJoue && huit.length === 8) {
    const TOURS: MatchFinal['tour'][] = ['quart', 'demie', 'finale'];
    const LIBELLES = ['Quart de finale', 'Demi-finale', 'FINALE'];
    let tour = huit;
    for (let etape = 0; etape < TOURS.length && tour.length > 1; etape++) {
      const suivants: string[] = [];
      for (let i = 0; i < tour.length; i += 2) {
        const m = duelNation(
          tour[i], tour[i + 1],
          `mondial#${saison}#${TOURS[etape]}#${tour[i]}#${tour[i + 1]}`,
          TOURS[etape], `${LIBELLES[etape]} : ${tour[i]} - ${tour[i + 1]}`,
        );
        bracket.push(m);
        suivants.push(m.vainqueur);
      }
      tour = suivants;
    }
    vainqueur = tour[0] ?? null;
  }

  return {
    saison, poules, qualifies: huit, bracket, vainqueur,
    journeesPoulesJouees: jouees, tableauJoue,
  };
}

/**
 * L'affiche de CETTE nation à la journée demandée, s'il y en a une.
 *
 * ⚠️ AU TABLEAU FINAL, ON REND LE PREMIER MATCH DE SA NATION. Les trois tours
 * tombent le même week-end (voir l'entête) : le joueur dispute le quart de
 * finale, et les tours suivants sont résolus. Rendre le dernier match aurait
 * fait jouer une finale à une équipe qui n'a pas passé son quart.
 */
export function afficheMondialDe(
  etat: EtatMondial, nation: string, journee: number,
): { match: MatchChampionnat; libelle: string } | null {
  if (journee <= JOURNEES_POULES) {
    for (const poule of etat.poules) {
      const m = poule.journees[journee - 1]?.find(
        (x) => x.domicile === nation || x.exterieur === nation,
      );
      if (m) return { match: m, libelle: `${poule.nom}, journée ${journee}` };
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

/** Tous les matchs disputés, pour le classement mondial et les statistiques. */
export function matchsDuMondial(etat: EtatMondial): MatchChampionnat[] {
  const tous: MatchChampionnat[] = [];
  for (const p of etat.poules) for (const j of p.journees) tous.push(...j);
  for (const f of etat.bracket) {
    tous.push({
      domicile: f.domicile, exterieur: f.exterieur,
      scoreD: f.scoreD, scoreE: f.scoreE,
      essaisD: Math.max(0, Math.round((f.scoreD - 6) / 7)),
      essaisE: Math.max(0, Math.round((f.scoreE - 6) / 7)),
    });
  }
  return tous;
}
