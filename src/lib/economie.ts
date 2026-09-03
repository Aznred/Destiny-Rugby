// ═══════════════════════════════════════════════════════════════════════════
// L'ÉCONOMIE DU RUGBY FRANÇAIS — une seule table, dix étages
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « revois le système de valeur, budget et transfert par rapport à
// ça », avec une table d'ordres de grandeur réels (produits d'exploitation LNR
// 2024/25, salary cap Top 14, minima de l'accord collectif du rugby fédéral).
//
// ⚠️ TROIS DÉFAUTS MESURÉS AVANT D'ÉCRIRE UNE LIGNE, et ils expliquent tout ce
// fichier :
//
//   1. UN JOUEUR NOTÉ 98 VALAIT 13 800 000 €, un joueur de Nationale noté 74 en
//      valait 6 175 000. Le jeu appliquait un barème de FOOTBALL — un prix plein
//      à chaque mouvement. Le rugby français ne fonctionne pas comme ça : on
//      attend la fin du contrat, et on ne paie que pour libérer quelqu'un tout
//      de suite. D'où la séparation `valeurEstimee` / `indemniteDeRachat`.
//   2. LA MASSE SALARIALE S'INVERSAIT ENTRE ÉTAGES. Elle était dérivée de la
//      force du groupe (`(force − 31)² × k`), or un bon club de Nationale 2
//      (60,5) pèse plus qu'un club moyen de Nationale (58,3) : mesuré,
//      1 230 000 € en Nationale 2 contre 1 110 000 € en Nationale. Une pyramide
//      dont l'étage inférieur paie mieux n'est pas une pyramide.
//   3. LE « BUDGET TRANSFERTS » VALAIT LE BUDGET DU CLUB (28 650 000 € en
//      Top 14). C'est un budget d'ACHAT dans un sport qui n'achète presque pas.
//
// ⚠️ ON ANCRE DONC SUR L'ÉTAGE, PAS SUR LA FORCE DU GROUPE. Les fourchettes ne
// se chevauchent pas d'un étage à l'autre : la hiérarchie est vraie PAR
// CONSTRUCTION, et aucun club ne peut plus doubler la division du dessus. La
// force ne sert plus qu'à placer un club DANS la fourchette de son étage.

import { NOTE_PAR_NIVEAU } from '../data/clubs';

/** Le dernier étage professionnel : au-delà, plus d'indemnité ni de salaire. */
export const PRO_JUSQUA = 3;

export interface EtageEconomique {
  /** Produits d'exploitation annuels du club, du plus modeste au plus riche. */
  budget: [number, number];
  /**
   * Masse salariale JOUEURS.
   *
   * ⚠️ C'EST UN PLAFOND, PAS UNE DÉPENSE. En Top 14 c'est le salary cap (11 M€
   * en 2026/27) ; ailleurs c'est ce que le club peut tenir. Dix clubs de Top 14
   * sur quatorze étaient au-dessus de 95 % de leur plafond en 2024/25 : la
   * contrainte doit mordre, sinon elle n'existe pas.
   */
  masse: [number, number];
  /**
   * L'indemnité MAXIMALE qu'un club de cet étage réclame pour libérer un joueur
   * avant la fin de son contrat. ⚠️ Zéro à partir de la Nationale 2 : le rugby
   * fédéral ne vend pas ses joueurs (demande explicite, déjà en vigueur).
   */
  indemniteMax: number;
  /** Le salaire annuel d'un titulaire ordinaire de l'étage. */
  salaireTypique: number;
  /** Ce que touche la vedette de l'étage. */
  salaireStar: number;
}

/**
 * ⚠️ LES DIX ÉTAGES, ET LE NIVEAU 0.
 *
 * `niveau 0` désigne les championnats étrangers de l'élite (Premiership, URC,
 * Super Rugby, League One D1…) : on l'aligne sur le Top 14 plutôt que de lui
 * inventer une économie, parce que c'est le seul étage du jeu dont on ne
 * connaît pas les comptes et que ses clubs jouent au même niveau.
 */
export const ECONOMIE: Record<number, EtageEconomique> = {
  0: { budget: [18e6, 50e6], masse: [7e6, 11e6], indemniteMax: 500_000, salaireTypique: 230_000, salaireStar: 800_000 },
  1: { budget: [20e6, 55e6], masse: [8e6, 11e6], indemniteMax: 500_000, salaireTypique: 250_000, salaireStar: 850_000 },
  2: { budget: [5e6, 18e6], masse: [2e6, 6e6], indemniteMax: 150_000, salaireTypique: 70_000, salaireStar: 220_000 },
  3: { budget: [2e6, 6e6], masse: [800_000, 2.5e6], indemniteMax: 50_000, salaireTypique: 35_000, salaireStar: 80_000 },
  4: { budget: [800_000, 2.5e6], masse: [250_000, 900_000], indemniteMax: 0, salaireTypique: 20_000, salaireStar: 45_000 },
  5: { budget: [400_000, 1.5e6], masse: [100_000, 500_000], indemniteMax: 0, salaireTypique: 12_000, salaireStar: 32_000 },
  6: { budget: [200_000, 700_000], masse: [30_000, 200_000], indemniteMax: 0, salaireTypique: 5_700, salaireStar: 18_000 },
  7: { budget: [100_000, 400_000], masse: [10_000, 100_000], indemniteMax: 0, salaireTypique: 2_400, salaireStar: 9_000 },
  8: { budget: [70_000, 250_000], masse: [0, 50_000], indemniteMax: 0, salaireTypique: 1_500, salaireStar: 6_000 },
  9: { budget: [40_000, 150_000], masse: [0, 25_000], indemniteMax: 0, salaireTypique: 0, salaireStar: 3_000 },
  10: { budget: [20_000, 100_000], masse: [0, 8_000], indemniteMax: 0, salaireTypique: 0, salaireStar: 1_500 },
};

export function etage(niveau: number): EtageEconomique {
  return ECONOMIE[niveau] ?? ECONOMIE[8];
}

/**
 * LE SALARY CAP — le plafond DUR du Top 14.
 *
 * ⚠️ IL NE SE CONFOND PAS AVEC LA MASSE SALARIALE DU CLUB : celle-ci dit ce que
 * le club a les moyens de payer, le cap dit ce que la ligue l'autorise à payer.
 * Un club riche est donc bloqué par le cap, un club modeste par ses recettes —
 * et c'est ce qui rend la contrainte intéressante des deux côtés.
 * 11 M€ en 2026/27 (LNR), 6 M€ en Pro D2. Rien en dessous : le rugby fédéral
 * n'a pas de plafond de ce type.
 */
export const SALARY_CAP: Record<number, number> = { 0: 11e6, 1: 11e6, 2: 6e6 };

export function salaryCap(niveau: number): number | null {
  return SALARY_CAP[niveau] ?? null;
}

/**
 * Où se place un club DANS la fourchette de son étage, de 0 à 1.
 *
 * ⚠️ LA FORCE NE FIXE PLUS LE BUDGET, ELLE LE PLACE. C'est toute la différence
 * avec l'ancienne formule : un club six points au-dessus du standard de sa
 * division est en haut de SA fourchette, jamais dans celle du dessus.
 *
 * ⚠️ ET LA RÉFÉRENCE EST LA FORCE RÉELLE DE LA DIVISION, PAS `NOTE_PAR_NIVEAU`.
 * Cette table SURESTIME les étages — `recrutementManager.ts` le documente
 * depuis longtemps : « elle annonce 64 pour la Nationale quand ses effectifs
 * pèsent 53 ». Mesuré en s'appuyant dessus : le SC Albi, club moyen de
 * Nationale, tombait au plancher de sa fourchette (800 000 €) tout en payant
 * 996 700 € de salaires — **125 % de son propre plafond**, et donc l'incapacité
 * de recruter qui que ce soit dès la première seconde. Le repli sur la table
 * ne sert qu'aux appelants qui n'ont pas de division sous la main.
 */
export function positionDansEtage(force: number, niveau: number, reference?: number): number {
  const standard = reference ?? NOTE_PAR_NIVEAU[niveau] ?? 50;
  return Math.max(0, Math.min(1, 0.5 + (force - standard) / 12));
}

function entre([bas, haut]: [number, number], t: number, pas: number): number {
  return Math.round((bas + (haut - bas) * t) / pas) * pas;
}

export interface FinancesClub {
  /** Produits d'exploitation : ce que le club fait entrer dans l'année. */
  budget: number;
  /** Ce que la masse salariale joueurs ne doit pas dépasser. */
  masseMax: number;
  /** L'enveloppe d'indemnités de transfert — petite, par nature. */
  recrutement: number;
  /** Les murs (`lib/installations.ts`). */
  structure: number;
}

/**
 * ⚠️ LE BUDGET GLOBAL SE RÉPARTIT, IL NE SE CONFOND AVEC AUCUN POSTE.
 *
 * Demande explicite : « évite de donner un simple budget transfert comme FIFA ;
 * je séparerais budget global → masse salariale → staff → primes →
 * recrutement/indemnités → formation → infrastructures ». Les parts ci-dessous
 * sont celles qui pèsent sur le jeu — le staff, les déplacements et
 * l'administratif existent dans le budget, mais aucun écran ne les arbitre : les
 * afficher sans pouvoir les toucher, ce serait du décor.
 *
 * ⚠️ ET L'ENVELOPPE DE RECRUTEMENT EST PETITE — 3 % du budget. C'est la
 * conséquence directe du modèle : on n'achète presque personne, on attend les
 * fins de contrat. En Top 14 ça fait ~1 M€, de quoi libérer deux joueurs en
 * cours de contrat dans l'année. L'ancien « budget transferts » valait
 * 28 650 000 €.
 */
const PART_RECRUTEMENT = 0.03;
const PART_STRUCTURE = 0.06;

export function financesDuClub(force: number, niveau: number, reference?: number): FinancesClub {
  const e = etage(niveau);
  const t = positionDansEtage(force, niveau, reference);
  const budget = entre(e.budget, t, niveau <= 2 ? 100_000 : niveau <= 5 ? 10_000 : 5_000);
  const cap = salaryCap(niveau);
  const masseEtage = entre(e.masse, t, niveau <= 2 ? 100_000 : niveau <= 5 ? 10_000 : 1_000);
  return {
    budget,
    // Le plafond effectif est le plus contraignant des deux.
    masseMax: cap === null ? masseEtage : Math.min(masseEtage, cap),
    recrutement: Math.round(budget * PART_RECRUTEMENT / 5_000) * 5_000,
    structure: Math.round(budget * PART_STRUCTURE / 5_000) * 5_000,
  };
}

// ---------------------------------------------------------------------------
// CE QUE VAUT UN JOUEUR — et ce qu'on paie vraiment
// ---------------------------------------------------------------------------

/**
 * La VALEUR ESTIMÉE d'un joueur, celle qu'on affiche sur sa fiche.
 *
 * ⚠️ C'EST UNE VALEUR DE JEU, PAS UN PRIX. Demande explicite : « cette valeur
 * ne signifie pas qu'un club paie réellement cette somme à chaque changement de
 * club ». Elle sert à comparer deux joueurs et à cadrer une négociation ; ce
 * qu'on décaisse, c'est `indemniteDeRachat`, qui est bien plus petit.
 *
 * ⚠️ LA COURBE EST CUBIQUE SUR `note − 42`, et c'est mesuré, pas choisi : c'est
 * la seule forme simple qui reproduit la table demandée sur toute son étendue.
 *   note 95 → 1,1 M€ (superstar : 800k-1,5M) · 80 → 406k (titulaire T14 : 150-400k)
 *   note 70 → 162k (rotation T14 / excellent Pro D2 : 80-250k) · 60 → 43k
 *   (Nationale : 10-60k) · 50 → 4k (N2 : 5-30k) · sous 42 → 0.
 * Une exponentielle écrasait le bas, un carré écrasait le haut.
 */
const SEUIL_VALEUR = 42;
const COEF_VALEUR = 7.4;
/**
 * ⚠️ LE PLAFOND EST CELUI DE LA TABLE, ET IL SERT.
 * Mesuré sans lui : un espoir de 22 ans noté 96 avec huit points de marge
 * ressortait à 1 695 000 €, au-dessus du haut de la fourchette « superstar
 * internationale » (800k-1,5M). C'est exactement le cas que la jeunesse fait
 * exploser, et c'est le plus rare du jeu : le borner ne coûte rien à personne.
 */
const VALEUR_MAX = 1_500_000;

export function valeurEstimee(
  j: { note: number; potentiel: number; age: number },
): number {
  const base = Math.max(0, j.note - SEUIL_VALEUR);
  if (base <= 0) return 0;
  // Un espoir vaut plus que sa note du jour, un trentenaire moins. La marge est
  // bornée : on ne paie jamais pour un potentiel qu'on ne verra pas.
  const marge = Math.max(0, Math.min(12, j.potentiel - j.note));
  const jeunesse = j.age <= 21 ? 1.35 : j.age <= 24 ? 1.2 : j.age <= 28 ? 1 : j.age <= 31 ? 0.75 : 0.45;
  const brut = Math.min(VALEUR_MAX, (base + marge * 0.45) ** 3 * COEF_VALEUR * jeunesse);
  return Math.round(brut / 5_000) * 5_000;
}

/**
 * L'INDEMNITÉ QU'UN CLUB AMATEUR VERSE VRAIMENT.
 *
 * ⚠️ C'ÉTAIT ZÉRO, ET ÇA VIDAIT LE MODE DE SON ÉCONOMIE. `valeurMarchande`
 * rendait `0` dès `estAmateurNiveau(niveau)`, c'est-à-dire à partir de la
 * Nationale 2 — soit SEPT divisions françaises sur dix, et précisément celles
 * où commence toute carrière d'entraîneur. Conséquence mesurée : de la
 * Régionale 3 à la Nationale 2, chaque joueur valait 0 €, chaque offre reçue
 * valait 0 €, et vendre son meilleur élément ne rapportait pas un centime. Le
 * marché existait à l'écran et ne servait à rien.
 *
 * ⚠️ ON NE FAIT PAS DES AMATEURS DES PROS POUR AUTANT. Dans le rugby français,
 * un club de Fédérale n'achète pas un joueur : il verse une indemnité de
 * formation ou de mutation, sans commune mesure avec un transfert
 * professionnel. La courbe ci-dessous garde donc cet ordre de grandeur — on
 * passe de quelques centaines d'euros en Régionale à quelques dizaines de
 * milliers en Nationale 2, là où le barème pro démarrerait à des centaines de
 * milliers.
 */
const PART_INDEMNITE_AMATEUR: Record<number, number> = {
  4: 0.09,   // Nationale 2 — semi-pro, les indemnités existent vraiment
  5: 0.035,  // Fédérale 1
  6: 0.018,  // Fédérale 2
  7: 0.009,  // Fédérale 3
  8: 0.005,  // Régionale 1
  9: 0.003,  // Régionale 2
  10: 0.002, // Régionale 3
};

export function indemniteAmateur(
  joueur: { note: number; potentiel: number; age: number },
  niveau: number,
): number {
  const part = PART_INDEMNITE_AMATEUR[niveau] ?? 0.002;
  const brut = valeurEstimee(joueur) * part;
  // En dessous de 200 €, ça ne vaut pas la peine d'être écrit sur une fiche.
  return brut < 200 ? 0 : Math.round(brut / 100) * 100;
}

/**
 * LE SALAIRE ANNUEL d'un joueur, à son étage et pour ce qu'il y pèse.
 *
 * ⚠️ L'ÉCART DE SALAIRE ÉTAIT BEAUCOUP TROP ÉTROIT — c'est le second défaut
 * mesuré. L'ancienne formule multipliait une base d'étage par `1 + ecart/15`,
 * **plafonné à 1,8** : un Top 14 entier tenait donc entre 165 000 € et
 * 470 000 €, soit un rapport de 2,8. La table demandée va de 2-6k €/mois pour
 * un jeune à 75k €/mois pour une superstar — un rapport de **trente**.
 * « Rends les écarts énormes, ça donnera de la personnalité aux divisions » :
 * c'est littéralement la demande, et une multiplication bornée ne peut pas la
 * produire.
 *
 * On interpole donc GÉOMÉTRIQUEMENT entre le salaire typique de l'étage et
 * celui de sa vedette : à écart nul on paie le tarif de l'étage, à +10 celui de
 * la star, à −10 le même rapport dans l'autre sens. Les deux bornes viennent de
 * la table, donc chaque division garde sa propre amplitude — 3,4 en Top 14,
 * 2,3 en Nationale.
 */
export function salaireAnnuel(niveau: number, ecart: number, age: number): number {
  const e = etage(niveau);
  const t = Math.max(-1.3, Math.min(1.3, ecart / 10));
  const parLAge = age <= 20 ? 0.5 : age <= 23 ? 0.74 : age <= 24 ? 0.9
    : age <= 31 ? 1 : age <= 33 ? 0.88 : 0.68;
  // ⚠️ EN RÉGIONALE 2 ET 3, LE JOUEUR TYPIQUE TOUCHE ZÉRO — c'est la table, et
  //    c'est la réalité. Une interpolation GÉOMÉTRIQUE ne sait pas partir de
  //    zéro : elle y reste. La première version rendait donc 0 à tout l'étage,
  //    VEDETTE COMPRISE, alors que la table lui accorde 3 000 € et 1 500 €. Le
  //    banc du marché l'a attrapé sous une autre forme — une offre sans salaire
  //    ET sans défraiement, c'est-à-dire un contrat vide. On rampe donc
  //    linéairement du néant vers la vedette : seul celui qui pèse vraiment
  //    dans sa poule reçoit quelque chose.
  const brut = e.salaireTypique <= 0
    ? e.salaireStar * Math.max(0, t) * parLAge
    : e.salaireTypique * (e.salaireStar / e.salaireTypique) ** t * parLAge;
  const pas = brut > 200_000 ? 10_000 : brut > 50_000 ? 5_000 : brut > 10_000 ? 1_000 : 100;
  return Math.round(brut / pas) * pas;
}

/**
 * CET ÉTAGE EMPLOIE-T-IL SES JOUEURS, OU LES DÉFRAIE-T-IL ?
 *
 * ⚠️ LA RÉPONSE SE LIT DANS LA TABLE, ELLE NE SE REDÉCLARE PAS. Un étage dont
 * le joueur typique gagne zéro n'a pas de club employeur : y laisser une part
 * de clubs « professionnels » leur faisait proposer un salaire de 0 € sans
 * défraiement, donc un contrat qui ne rapporte rien du tout. C'est exactement
 * ce que `verifMarche` a relevé au Beausset, en Régionale 2.
 */
export function etagePaieUnSalaire(niveau: number): boolean {
  return etage(niveau).salaireTypique > 0;
}

/**
 * L'INDEMNITÉ RÉELLEMENT RÉCLAMÉE pour libérer un joueur AVANT la fin de son
 * contrat.
 *
 * ⚠️ ELLE VAUT ZÉRO À LA FIN DU CONTRAT, ET C'EST LE CŒUR DU MODÈLE. Demande
 * explicite : « plutôt que de payer systématiquement, tu pourrais attendre sa
 * fin de contrat — coût transfert : 0 € — mais Bordeaux, Pau et Montpellier
 * peuvent aussi le contacter ». C'est ça, le marché du rugby français : la
 * patience contre la concurrence.
 *
 * ⚠️ ET ELLE EST BORNÉE PAR L'ÉTAGE DU VENDEUR, pas par la valeur du joueur.
 * Un club de Nationale ne réclame jamais plus de 50 000 €, même pour un joueur
 * qui en vaudrait 200 000 : il n'a ni le pouvoir de négociation ni l'habitude.
 */
export function indemniteDeRachat(
  valeur: number, saisonsRestantes: number, niveauVendeur: number,
): number {
  const plafond = etage(niveauVendeur).indemniteMax;
  if (plafond <= 0 || saisonsRestantes <= 0) return 0;
  // Plus le contrat court longtemps, plus le club se fait prier.
  const part = saisonsRestantes >= 3 ? 0.55 : saisonsRestantes === 2 ? 0.35 : 0.15;
  return Math.round(Math.min(plafond, valeur * part) / 5_000) * 5_000;
}

// ---------------------------------------------------------------------------
// LA SITUATION CONTRACTUELLE
// ---------------------------------------------------------------------------

/**
 * Où en est un joueur, du point de vue du recrutement.
 *
 * ⚠️ C'EST CE QUI REMPLACE « tout le monde est achetable au même prix ».
 * Demande explicite : la liste vient d'elle. Trois d'entre elles ne coûtent
 * RIEN en indemnité (`finDeContrat`, `libre`, `amateur`), et c'est par elles que
 * se fait l'essentiel du recrutement dans ce sport.
 */
export type SituationRecrutement =
  | 'sousContrat'
  | 'finDeContrat'
  | 'libre'
  | 'espoir'
  | 'amateur'
  | 'prete';

export function situationDe(
  saisonsRestantes: number, age: number, niveau: number,
): SituationRecrutement {
  if (niveau > PRO_JUSQUA) return 'amateur';
  if (saisonsRestantes <= 0) return 'libre';
  if (age <= 21) return 'espoir';
  if (saisonsRestantes === 1) return 'finDeContrat';
  return 'sousContrat';
}
