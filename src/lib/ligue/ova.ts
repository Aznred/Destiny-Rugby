// L'OVA — la monnaie d'une ligue
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ TROIS RÈGLES QUI NE SE DISCUTENT PAS
// ═══════════════════════════════════════════════════════════════════════════
//
// 1. **AUCUN OVA NE S'ACHÈTE EN ARGENT RÉEL.** « Tu les gagnes uniquement en
//    jouant. » Ça vaut aussi pour les détours : pas de pack payant, pas de
//    « double gains » vendu, pas de pub récompensée qui verse des OVA. La
//    monétisation du jeu reste cosmétique (voir `MONETISATION.md`) et elle
//    s'arrête à la porte de la ligue. Une ligue entre potes dont l'un peut
//    payer pour gagner n'est plus une ligue entre potes.
//
// 2. **L'OVA DE LA LIGUE N'EST PAS L'OVA DU JEU.** Attention au piège de
//    vocabulaire : Destiny Rugby a déjà une monnaie qui s'appelle « Ovas »
//    (`joueur.ovas`, la Boutique, les skins). Ce sont DEUX MONNAIES SANS AUCUN
//    PONT. Aucune conversion, dans aucun sens, jamais — sinon la boutique
//    cosmétique devient un guichet de puissance, et la règle 1 tombe par la
//    bande. Dans le code : `ovas` (minuscule, pluriel) = la boutique solo ;
//    `ova` = le solde d'un club dans UNE ligue.
//
// 3. **LE SOLDE APPARTIENT À LA LIGUE, PAS AU COMPTE.** « Surtout pas de
//    portefeuille OVA global. » Chaque nouvelle ligue repart de zéro pour tout
//    le monde ; un vétéran de 500 heures n'arrive pas avec un trésor.

import type { ReglagesLigue } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LE BARÈME
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ DOTATION DE DÉPART : LE SEUL CHIFFRE QUE LA DEMANDE NE DONNAIT PAS.
 *
 * 20 000, et voici le raisonnement, pour qu'on puisse le contester : c'est
 * exactement quatre packs standard (4 × 5 000) ou un premium plus un espoir
 * (15 000 + 8 000 ne passe pas — il manque 3 000, et c'est voulu). Assez pour
 * qu'un choix existe dès le premier jour, trop peu pour acheter un joueur à 80
 * (30 000) sans avoir joué une seule journée.
 *
 * C'est aussi la moitié d'un joueur à 82 : le message est clair — les cartes
 * qui comptent se gagnent sur le terrain, pas au démarrage.
 */
export const OVA_DEPART = 20_0000000;

/** Ce qu'une rencontre rapporte. Voir `gainsDeRencontre`. */
export const BAREME_MATCH = {
  /** Simplement avoir joué. C'est la base : jouer, c'est développer son club. */
  joue: 1_00000,
  victoire: 700,
  nul: 300,
  /** Bonus offensif : quatre essais ou plus dans le match. */
  bonusOffensif: 200,
  /** Bonus défensif : battu de moins de 8 points, comme au rugby. */
  bonusDefensif: 100,
} as const;

/**
 * Récompense de fin de saison au championnat.
 *
 * ⚠️ LE PODIUM EST DONNÉ (30 000 / 20 000 / 15 000), LA SUITE EST DÉDUITE.
 * Elle décroît jusqu'à un plancher : le dernier touche quelque chose, et ce
 * n'est pas de la charité — un club à zéro en fin de saison ne peut plus rien
 * acheter, donc plus rien négocier, donc il décroche pour de bon. Une ligue où
 * le dernier ne peut plus jouer au marché perd un manager, puis deux.
 */
const PODIUM = [30_000, 20_000, 15_000];
const PLANCHER_CLASSEMENT = 2_000;

export function recompenseClassement(rang: number, clubs: number): number {
  if (rang <= 0 || rang > clubs) return 0;
  if (rang <= PODIUM.length) return PODIUM[rang - 1];
  // Décroissance linéaire de 12 000 (4e) jusqu'au plancher (dernier).
  const premier = 12_000;
  const marches = Math.max(1, clubs - PODIUM.length);
  const position = rang - PODIUM.length - 1;
  const valeur = premier - ((premier - PLANCHER_CLASSEMENT) * position) / marches;
  return Math.round(Math.max(PLANCHER_CLASSEMENT, valeur) / 500) * 500;
}

/**
 * Récompense par défaut d'une coupe.
 *
 * ⚠️ « PAR DÉFAUT » EST LE MOT. Le commissaire fixe la dotation de chaque coupe
 * qu'il crée (`CompetitionLigue.dotation`), et il a le droit de la mettre à
 * ZÉRO : « une compétition sans récompense économique, uniquement pour le
 * prestige ». Ce barème-ci ne sert qu'à pré-remplir le formulaire.
 */
export const BAREME_COUPE = {
  vainqueur: 15_000,
  finaliste: 6_000,
  demiFinaliste: 3_000,
} as const;

/**
 * Les objectifs — les petites primes qui donnent une raison de jouer un match
 * déjà perdu.
 *
 * ⚠️ ILS SE MESURENT SUR DES FAITS DU MOTEUR, jamais sur une déclaration du
 * client. « Marquer 4 essais » se lit dans le résultat enregistré côté serveur.
 */
export interface Objectif {
  id: string;
  /** Clé i18n du libellé. */
  cle: string;
  prime: number;
  /** Sur quoi il porte : une rencontre, ou la saison. */
  portee: 'match' | 'saison';
}

export const OBJECTIFS: readonly Objectif[] = [
  { id: 'quatreEssais', cle: 'ligue.objectif.quatreEssais', prime: 500, portee: 'match' },
  { id: 'troisVictoires', cle: 'ligue.objectif.troisVictoires', prime: 1_500, portee: 'saison' },
  { id: 'invincibleCinq', cle: 'ligue.objectif.invincibleCinq', prime: 2_000, portee: 'saison' },
  { id: 'centEssais', cle: 'ligue.objectif.centEssais', prime: 3_000, portee: 'saison' },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// 2. LE CALCUL
// ═══════════════════════════════════════════════════════════════════════════

export interface FaitsRencontre {
  pointsPour: number;
  pointsContre: number;
  essaisPour: number;
}

/**
 * Ce qu'une rencontre rapporte à UN club.
 *
 * ⚠️ `dureteEconomie` DIVISE, elle ne multiplie pas. À 2 (ligue hardcore), on
 * gagne deux fois moins ; à 0,5, deux fois plus. Écrire l'inverse ferait d'un
 * réglage « difficile » un réglage généreux, et personne ne s'en apercevrait
 * avant la fin d'une saison.
 */
export function gainsDeRencontre(
  faits: FaitsRencontre,
  reglages: Pick<ReglagesLigue, 'dureteEconomie'>,
): number {
  let total = BAREME_MATCH.joue;
  if (faits.pointsPour > faits.pointsContre) total += BAREME_MATCH.victoire;
  else if (faits.pointsPour === faits.pointsContre) total += BAREME_MATCH.nul;
  if (faits.essaisPour >= 4) total += BAREME_MATCH.bonusOffensif;
  const ecart = faits.pointsContre - faits.pointsPour;
  if (ecart > 0 && ecart <= 7) total += BAREME_MATCH.bonusDefensif;
  return appliquerDurete(total, reglages);
}

/** La règle de trois de la dureté, au même endroit pour tous les gains. */
export function appliquerDurete(
  brut: number,
  reglages: Pick<ReglagesLigue, 'dureteEconomie'>,
): number {
  const durete = reglages.dureteEconomie > 0 ? reglages.dureteEconomie : 1;
  return Math.round(brut / durete / 50) * 50;
}

/**
 * Estimation de ce qu'une saison rapporte à un club moyen. Sert à l'écran
 * (« ce que vous gagnerez à peu près ») et surtout aux bancs de mesure : c'est
 * ce chiffre-là qui dit si les prix des packs et des cartes tiennent debout.
 */
export function gainsDeSaisonEstimes(
  journees: number,
  clubs: number,
  reglages: Pick<ReglagesLigue, 'dureteEconomie'>,
): number {
  // Un club moyen gagne la moitié de ses matchs, fait le bonus offensif deux
  // fois sur cinq, et le bonus défensif une fois sur cinq.
  const parMatch = BAREME_MATCH.joue
    + BAREME_MATCH.victoire * 0.47
    + BAREME_MATCH.nul * 0.06
    + BAREME_MATCH.bonusOffensif * 0.4
    + BAREME_MATCH.bonusDefensif * 0.2;
  // Classement : la moyenne de la grille sur tous les rangs.
  let classement = 0;
  for (let rang = 1; rang <= clubs; rang++) classement += recompenseClassement(rang, clubs);
  classement /= clubs;
  return appliquerDurete(parMatch * journees + classement, reglages);
}

/**
 * Un solde peut-il payer ce prix ?
 *
 * ⚠️ CETTE FONCTION EXISTE POUR QU'IL N'Y EN AIT PAS DEUX. Le contrôle de solde
 * est le point le plus sensible du serveur : c'est lui qui empêche d'ouvrir dix
 * packs avec l'argent d'un seul. Il ne doit pas être réécrit à chaque point
 * d'entrée — un `>=` transformé en `>` quelque part et le solde passe négatif.
 */
export function peutPayer(solde: number, prix: number): boolean {
  return Number.isFinite(solde) && Number.isFinite(prix) && prix >= 0 && solde >= prix;
}
