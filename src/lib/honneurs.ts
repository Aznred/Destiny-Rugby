// LES HONNEURS INDIVIDUELS — comment on devient meilleur joueur de quelque chose
//
// Demande explicite : « mets en place les trophées individuels in game, qu'on
// puisse les gagner, et que ça soit par rapport à notre note de saison, nos
// stats et notre palmarès — ce qu'on a gagné dans l'année ».
//
// ⚠️ CE QUI EXISTAIT AVANT, ET POURQUOI ÇA NE SUFFISAIT PAS. Une seule
// distinction était décernée (« meilleur joueur de l'année »), sur cette ligne :
//
//     if (perso >= 88 && trophees.length > 0 && tire((perso - 88) / 140))
//
// C'est-à-dire : un seuil de niveau GÉNÉRAL, puis un tirage au sort. La saison
// elle-même n'entrait nulle part — on pouvait passer l'année à 4/10, ne rien
// marquer, ne rien plaquer, et décrocher le titre parce qu'on avait 90 de
// générale. Et à l'inverse, une saison énorme dans un club moyen ne valait
// rien. Ici, c'est la SAISON qu'on juge, pas la fiche du joueur.
//
// ⚠️ QUATRE ENTRÉES, ET SEULEMENT QUATRE :
//   1. **la note de saison** (`noterSaison`, lib/progression.ts) — le juge de
//      paix, celui qui compte le plus lourd. Elle intègre déjà le temps de jeu,
//      la finition, la forme et l'écart au groupe ;
//   2. **les statistiques** — essais, plaquages, grattages, passes décisives,
//      réussite au pied, comparés à ce qu'on attend de SON POSTE (`PROFILS`,
//      lib/statsJoueurs.ts — la même table que les classements individuels) ;
//   3. **le palmarès de l'année** — les titres collectifs déjà acquis CETTE
//      saison, pondérés par leur prestige ;
//   4. **le résultat du club et la notoriété**, en appoint.
//
// ⚠️ AUCUN TIRAGE AU SORT. Le seul aléa est la BARRE elle-même : elle bouge de
// ±3,5 point d'une saison à l'autre, de façon DÉTERMINISTE (graine =
// compétition + saison), parce qu'un titre individuel se dispute à d'autres et
// que le meilleur rival n'est pas le même tous les ans. Rejouer la même saison
// redonne le même verdict — c'est la règle du projet, et c'est ce qui rend ce
// module testable sans navigateur.
//
// ⚠️ ET ILS RESTENT RARES. Cinq championnats sur trente-trois décernent une
// distinction (`MEILLEUR_JOUEUR_PAR_DIVISION`), et il faut une saison
// exceptionnelle pour l'emporter. Mesuré par `scripts/verifHonneurs.ts` :
// une saison correcte (6/10) n'en rapporte AUCUNE.

import type { PosteId, StatsDetaillees } from '../types';
import { graine } from './championnat';
import { PROFILS } from './statsJoueurs';
import {
  HONNEUR_CHAMPIONS_CUP, HONNEUR_FINALE_MONDE, HONNEUR_MONDIAL, HONNEUR_TOURNOI,
  MEILLEUR_JOUEUR_PAR_DIVISION, TROPHEES,
} from '../data/trophees';

/** La saison écoulée, vue par le jury. Tout ce dont on a besoin, et rien de plus. */
export interface SaisonJugee {
  /** Note de la saison sur 10 (`noterSaison`). Le juge de paix. */
  note: number;
  /** Notoriété du joueur, 0-100. */
  reputation: number;
  poste: PosteId;
  matchs: number;
  essais: number;
  /**
   * Cumul détaillé de la saison (`Joueur.saisonEnCours.stats`).
   * ⚠️ ABSENT EN MODE « SAISON RAPIDE » : il n'existe que si l'on joue journée
   * par journée. Sans lui, on note la saison sur les seuls essais — c'est moins
   * fin, mais ça ne ferme la porte à personne.
   */
  stats?: StatsDetaillees;
  /** Classement final du club dans sa poule, et taille de la poule. */
  rang: number;
  taillePoule: number;
  /** Les titres COLLECTIFS déjà acquis cette saison (ids de `data/trophees.ts`). */
  titres: string[];
  /** Id de la compétition disputée (`data/clubs.ts`). */
  competition: string;
  /** Le club dispute la Champions Cup cette saison. */
  championsCup: boolean;
  /** Le joueur est retenu en sélection pour le Tournoi. */
  tournoi: boolean;
  saison: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. NOTER LA SAISON D'UN JOUEUR, SUR 100
// ═══════════════════════════════════════════════════════════════════════════
// Les quatre poids ci-dessous sont l'échelle entière. La note de saison pèse à
// elle seule les deux tiers : c'est voulu, c'est la mesure la plus complète
// dont on dispose, et les trois autres ne font que la nuancer.

const POIDS_NOTE = 7; // note /10 → 21 à 68,6
const MAX_STATS = 16;
const MAX_PALMARES = 14;
const MAX_CLUB = 6;
const MAX_NOTORIETE = 6;

/** Un match plein vaut 22 rencontres : c'est la référence d'une saison complète. */
const MATCHS_SAISON_PLEINE = 22;

function borner(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/**
 * Ce que les statistiques valent, sur 16.
 *
 * ⚠️ TOUT EST RAPPORTÉ AU POSTE. Quatre essais, c'est une saison catastrophique
 * pour un ailier et une saison historique pour un pilier — comparer les deux au
 * même barème reviendrait à ne jamais distinguer un avant. On compare donc
 * chaque ligne à `PROFILS[poste]`, la table qui sert déjà aux classements
 * individuels de l'écran Résultats.
 */
export function noteStatistiques(s: SaisonJugee): number {
  const profil = PROFILS[s.poste] ?? PROFILS.premier_centre;
  const matchs = Math.max(1, s.matchs);
  // Un axe rapporte 0 quand on fait ce qu'on attend, 4 quand on double la mise.
  //
  // ⚠️ LE PLANCHER EST INDISPENSABLE, et c'est un vrai piège de conception. Sans
  // lui, on divise par l'attendu : or un pilier gauche n'est attendu qu'à 1,1
  // essai sur la saison. En marquer 2 — c'est-à-dire UN de plus, ce qui peut
  // n'être qu'un ballon poussé en mêlée — le faisait bondir de +82 % et lui
  // donnait 3,3 sur 4, mieux qu'un ailier auteur de 15 essais. Un événement
  // rare est bruyant par nature : on rapporte donc l'écart au plus grand des
  // deux, l'attendu ou ce plancher. Un avant reste élu sur ses plaquages et ses
  // grattages — c'est-à-dire sur ce qui fait vraiment son match.
  const PLANCHER = 3;
  const axe = (fait: number, parMatch: number) => {
    const attendu = parMatch * matchs;
    if (attendu <= 0) return 0;
    return borner(((fait - attendu) / Math.max(attendu, PLANCHER)) * 4, -2, 4);
  };

  if (!s.stats) {
    // ⚠️ MODE « SAISON RAPIDE » : IL FAUT ESTIMER, PAS PÉNALISER. Les
    // statistiques détaillées n'existent qu'en jouant journée par journée. Le
    // premier réglage plafonnait alors la note à la moitié — mesuré sur
    // 40 carrières jouées : AUCUN meilleur joueur de championnat en 560
    // saisons. Autrement dit, choisir le rythme « saison » dans les réglages
    // fermait la porte à toute une famille de trophées, sans le dire.
    //
    // On estime donc les trois axes manquants (plaquages, grattages, passes) à
    // partir de la NOTE DE SAISON, qui les intègre déjà et ne favorise aucun
    // poste — un pilier ne serait pas jugé sur ses seuls essais. Et on garde
    // les essais, la seule ligne réellement comptée dans ce mode.
    const parLaNote = borner((s.note - 5.5) / 4, 0, 1) * MAX_STATS;
    return borner((borner(axe(s.essais, profil.essais), -2, 4) * 4 + parLaNote) / 2, 0, MAX_STATS);
  }
  const essais = axe(s.essais, profil.essais);

  const st = s.stats;
  const plaquages = axe(st.plaquages, profil.plaquages);
  const grattages = axe(st.grattages, profil.grattages);
  const passes = axe(st.passesDecisives, profil.passesD);
  // Le pied : seulement pour ceux qui tirent. 75 % est la référence d'un bon
  // buteur professionnel ; en dessous de 10 tentatives, la ligne ne dit rien.
  const pied = st.butsTentes >= 10
    ? borner((st.butsReussis / st.butsTentes - 0.75) * 26, -2, 4)
    : 0;
  // Les cartons, eux, retirent : un carton rouge coûte une saison de vote.
  const discipline = st.cartonsJaunes * 0.5 + st.cartonsRouges * 3;

  return borner(essais + plaquages + grattages + passes + pied - discipline, 0, MAX_STATS);
}

/**
 * Ce que le palmarès de l'année vaut, sur 14. Un titre de Fédérale ne pèse pas
 * un doublé Brennus + Champions Cup : le prestige se lit dans les Ovas, la seule
 * mesure de valeur du jeu, déjà calibrée pour ça.
 */
export function notePalmares(titres: string[]): number {
  const prestige = titres.reduce((a, id) => a + (TROPHEES[id]?.ovas ?? 0), 0);
  return borner(prestige / 2.2, 0, MAX_PALMARES);
}

/** LA note de la saison individuelle, sur ~100. */
export function noterSaisonIndividuelle(s: SaisonJugee): number {
  const club = s.taillePoule > 1
    ? MAX_CLUB * (1 - (borner(s.rang, 1, s.taillePoule) - 1) / (s.taillePoule - 1))
    : MAX_CLUB / 2;
  const notoriete = borner((s.reputation - 55) / 7.5, 0, MAX_NOTORIETE);
  // ⚠️ Une saison écourtée ne se compare pas à une saison pleine. Sans ce
  // prorata, six matchs énormes valaient vingt-deux bons matchs — et une
  // blessure de six mois devenait le meilleur plan de carrière.
  const presence = borner(s.matchs / (MATCHS_SAISON_PLEINE * 0.6), 0.35, 1);

  return (s.note * POIDS_NOTE + noteStatistiques(s) + club + notoriete) * presence
    + notePalmares(s.titres);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LES BARRES — ce qu'il faut atteindre, et ce qu'il faut avoir fait
// ═══════════════════════════════════════════════════════════════════════════
// Repères MESURÉS (`scripts/verifHonneurs.ts`) sur un joueur de Top 14 :
//   · saison correcte   (6,0/10, 5ᵉ, sans titre) ......... 47
//   · bonne saison      (7,5/10, 3ᵉ, sans titre) ......... 59
//   · grande saison     (8,5/10, champion) ............... 78
//   · saison historique (9,5/10, doublé Brennus+Europe) .. 102
//
// ⚠️ LES BARRES ONT ÉTÉ DESCENDUES APRÈS MESURE. Le premier réglage plaçait le
// championnat à 82 : personne ne l'atteignait. Une saison à 8,5/10 en étant
// champion de France, c'est déjà le sommet de ce que le moteur produit — la
// mesure de difficulté plafonne la générale à 85 sur douze saisons, ce qui
// donne une note de saison autour de 8,5. Une barre au-dessus de ce plafond,
// c'est un trophée qui n'existe que dans les données. Même erreur que
// l'ancienne difficulté (« 0 carrière sur 100 au-dessus de 80 ») : on ne
// recommence pas.

const BARRES = {
  /** Meilleur joueur d'un championnat : une grande saison, et un club qui gagne. */
  championnat: 76,
  /** Meilleur joueur de la Champions Cup — il faut d'abord la disputer. */
  championsCup: 82,
  /** Meilleur joueur du Tournoi — il faut d'abord être sélectionné. */
  tournoi: 84,
  /** Homme du match de la finale du monde — il faut l'avoir GAGNÉE. */
  finaleMonde: 80,
  /** Meilleur joueur du monde : le sommet absolu, et une saison titrée. */
  mondial: 94,
} as const;

/**
 * De combien la barre bouge d'une saison à l'autre. Ce n'est pas de l'aléa
 * gratuit : c'est le meilleur RIVAL, qui n'est pas le même tous les ans. Une
 * année pauvre, une grande saison suffit ; une année où trois joueurs sortent
 * le match de leur vie, il faut être au-dessus.
 */
const AMPLITUDE_RIVAL = 3.5;

function barre(base: number, cle: string, saison: number): number {
  return base + (graine(`honneur#${cle}#${saison}`)() * 2 - 1) * AMPLITUDE_RIVAL;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LE VERDICT
// ═══════════════════════════════════════════════════════════════════════════

/** Une distinction décernée, et de justesse ou non — pour l'expliquer au joueur. */
export interface Honneur {
  trophee: string;
  /** La note de la saison individuelle, sur ~100. */
  score: number;
  /** La barre qu'il fallait franchir cette année-là. */
  barre: number;
}

/**
 * Les distinctions remportées à l'issue de la saison. Pure, déterministe, sans
 * effet de bord : le store n'a qu'à pousser les ids dans le palmarès.
 *
 * ⚠️ L'ORDRE COMPTE. « Meilleur joueur du monde » se juge EN DERNIER et exige un
 * titre collectif : c'est la couronne d'une saison, pas un lot de consolation.
 */
export function decernerHonneurs(s: SaisonJugee): Honneur[] {
  const score = noterSaisonIndividuelle(s);
  const obtenus: Honneur[] = [];
  const tenter = (trophee: string | undefined, base: number, cle: string, possible: boolean) => {
    if (!trophee || !possible) return;
    const seuil = barre(base, cle, s.saison);
    if (score >= seuil) obtenus.push({ trophee, score, barre: seuil });
  };

  // 1. Le championnat — là où il existe une distinction (5 championnats).
  tenter(
    MEILLEUR_JOUEUR_PAR_DIVISION[s.competition],
    BARRES.championnat, `championnat#${s.competition}`, true,
  );

  // 2. La coupe d'Europe — il faut y avoir joué.
  tenter(HONNEUR_CHAMPIONS_CUP, BARRES.championsCup, 'championsCup', s.championsCup);

  // 3. Le Tournoi — il faut avoir été sélectionné.
  tenter(HONNEUR_TOURNOI, BARRES.tournoi, 'tournoi', s.tournoi);

  // 4. La finale de la Coupe du monde : on ne peut être homme du match d'une
  //    finale qu'on n'a pas jouée. Dans le jeu, on la joue quand on la gagne.
  tenter(HONNEUR_FINALE_MONDE, BARRES.finaleMonde, 'finaleMonde', s.titres.includes('monde'));

  // 5. Meilleur joueur du monde. Le sommet — et jamais sans un titre.
  //
  // ⚠️ ET JAMAIS DEPUIS LE BAS DE LA PYRAMIDE. Le bug attrapé à la mesure : la
  // note de saison est RELATIVE à son groupe (`noterSaison` compare le joueur à
  // l'effectif qui l'entoure). Un joueur trop fort pour la Fédérale 2 y obtient
  // donc 9,8/10 sans effort — et décrochait le titre de meilleur joueur du
  // MONDE avec un bouclier de Fédérale. Il faut désormais jouer là où le monde
  // regarde : un championnat qui élit son joueur de l'année, la Champions Cup,
  // ou une sélection du Tournoi.
  const vitrineMondiale = !!MEILLEUR_JOUEUR_PAR_DIVISION[s.competition] || s.championsCup || s.tournoi;
  tenter(HONNEUR_MONDIAL, BARRES.mondial, 'mondial', s.titres.length > 0 && vitrineMondiale);

  return obtenus;
}

/** Les seuils, exposés pour le script de vérification et la documentation. */
export const BARRES_HONNEURS = BARRES;
