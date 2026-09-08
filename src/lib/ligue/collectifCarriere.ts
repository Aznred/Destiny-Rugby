// LE COLLECTIF — ce que vaut une équipe QUI SE CONNAÎT
//
// ⚠️ CE N'EST PAS UN BONUS CACHÉ, ET C'EST TOUT L'INTÉRÊT. Le mode en ligne en
// avait déjà un : une ligne perdue au milieu du lancement de match donnait
// +0,3 par coéquipier de même club ou de même nation, plafonné à +3. Personne
// ne pouvait le voir, donc personne ne pouvait le jouer. Une feuille se compose
// autrement quand on SAIT qu'aligner la première ligne du Stade Toulousain au
// complet rapporte quelque chose.
//
// ⚠️ ET LE RUGBY N'EST PAS LE FOOTBALL. FIFA compte les liens entre voisins de
// la formation ; ici, le voisin, c'est l'UNITÉ — la première ligne, la
// charnière, la paire de centres. Deux piliers du même club poussent
// réellement ensemble en mêlée ; deux ailiers du même club ne se touchent pas
// du match. Un lien à l'intérieur de l'unité vaut donc trois fois un lien
// ailleurs sur le terrain, et c'est ce qui rend la règle vraie plutôt que
// décorative.
//
// Trois affinités, de la plus forte à la plus faible : le CLUB RÉEL (ils
// jouent vraiment ensemble), la NATION (même sélection, même école de jeu), le
// CHAMPIONNAT (mêmes règles arbitrales, même rythme de saison). Un coéquipier
// ne compte qu'une fois, par son lien le plus fort.

import type { CompositionManager } from '../../types.js';
import type { CarteCarriere } from './typesCarriere.js';

/** Le maximum d'un joueur. Le total d'équipe est la moyenne du XV sur 100. */
export const COLLECTIF_MAX = 10;

/**
 * ⚠️ LES UNITÉS DU XV, par index dans `POSTES_XV_MANAGER`
 * (lib/compositionManager.ts). Ce sont les groupes
 * qui travaillent ensemble sur un temps de jeu : la première ligne pousse, la
 * charnière décide, les centres se relaient, le triangle arrière se couvre.
 */
const UNITES: readonly (readonly number[])[] = [
  [0, 1, 2],        // première ligne
  [3, 4],           // deuxième ligne
  [5, 6, 7],        // troisième ligne
  [8, 9],           // charnière
  [11, 12],         // centres
  [10, 13, 14],     // triangle arrière
];

/**
 * ⚠️ LE CLUB RÉEL ÉCRASE LE RESTE, ET C'EST MESURÉ. Un premier barème donnait
 * au partage de la NATION presque autant qu'au partage du club : les trente
 * licenciés de Régionale 3 de la dotation de départ — tous français, tous du
 * même championnat — sortaient à 72 sur 100, une équipe entièrement d'un même
 * club à 88, et un XV délibérément dépareillé à 64. Une échelle où tout le
 * monde a la même note ne dit rien et ne se joue pas. Partager une nation ou un
 * championnat est presque gratuit dans ce jeu ; jouer ensemble, non.
 */
const DANS_UNITE = { club: 4, nation: 1.6, championnat: 0.8 } as const;
const AILLEURS = { club: 0.5, nation: 0.15, championnat: 0.08 } as const;
/** Ce que l'unité peut apporter, et ce que le reste du terrain peut ajouter. */
const PART_UNITE = 6;
const PART_AILLEURS = 4;

export interface AffiniteCarte {
  /** De 0 à `COLLECTIF_MAX`. */
  points: number;
  /** Le détail, pour que l'écran puisse dire POURQUOI. */
  club: number;
  nation: number;
  championnat: number;
}

export interface CollectifEquipe {
  /** De 0 à 100 : la moyenne du XV. */
  total: number;
  parCarte: Record<string, AffiniteCarte>;
}

const memeClub = (a: CarteCarriere, b: CarteCarriere) => Boolean(a.clubReel) && a.clubReel === b.clubReel;
const memeNation = (a: CarteCarriere, b: CarteCarriere) => Boolean(a.nation) && a.nation === b.nation;
const memeChampionnat = (a: CarteCarriere, b: CarteCarriere) => Boolean(a.championnat) && a.championnat === b.championnat;

function uniteDe(index: number): readonly number[] {
  return UNITES.find((u) => u.includes(index)) ?? [];
}

/**
 * Le collectif d'une feuille de match.
 *
 * ⚠️ L'UNITÉ SE COMPTE EN PROPORTION, PAS EN SOMME. Une première ligne a deux
 * partenaires, une charnière un seul : à sommer les liens, le pilier d'une
 * équipe entièrement toulousaine sortait à 10 sur 10 et son deuxième ligne à 6,
 * pour exactement le même travail. On mesure donc ce que l'unité réalise SUR CE
 * QU'ELLE POURRAIT réaliser.
 *
 * ⚠️ LES REMPLAÇANTS COMPTENT, MAIS MOINS. Ils ne sont pas encore dans la
 * machine : pas d'unité, donc pas de lien fort — seulement ce que leur donne le
 * reste de la feuille, soit 4 sur 10 au mieux. C'est aussi ce qui évite qu'on
 * garnisse le banc d'un même club pour gonfler le total : **le total d'équipe
 * ne compte que le XV de départ.**
 */
export function collectifCarriere(
  cartes: readonly CarteCarriere[],
  composition: Pick<CompositionManager, 'titulaires' | 'remplacants'>,
): CollectifEquipe {
  const parId = new Map(cartes.map((c) => [c.id, c]));
  const titulaires = composition.titulaires.map((id) => parId.get(id));
  const remplacants = composition.remplacants.map((id) => parId.get(id));
  const parCarte: Record<string, AffiniteCarte> = {};

  const affinite = (carte: CarteCarriere, index: number): AffiniteCarte => {
    const unite = index >= 0 ? uniteDe(index) : [];
    const partenaires = Math.max(0, unite.length - 1);
    let club = 0;
    let nation = 0;
    let championnat = 0;
    let dansUnite = 0;
    let ailleurs = 0;
    for (const [autreIndex, autre] of titulaires.entries()) {
      if (!autre || autre.id === carte.id) continue;
      const ensemble = unite.includes(autreIndex);
      const bareme = ensemble ? DANS_UNITE : AILLEURS;
      // Un coéquipier ne compte qu'UNE fois, par son lien le plus fort : sans
      // ça, un joueur du même club ET du même championnat compterait double, et
      // le championnat n'ajouterait qu'un bruit proportionnel au club.
      const points = memeClub(carte, autre) ? bareme.club
        : memeNation(carte, autre) ? bareme.nation
          : memeChampionnat(carte, autre) ? bareme.championnat : 0;
      if (!points) continue;
      if (memeClub(carte, autre)) club += points;
      else if (memeNation(carte, autre)) nation += points;
      else championnat += points;
      if (ensemble) dansUnite += points; else ailleurs += points;
    }
    const partUnite = partenaires
      ? (dansUnite / (partenaires * DANS_UNITE.club)) * PART_UNITE
      : 0;
    const points = Math.max(0, Math.min(COLLECTIF_MAX, partUnite + Math.min(PART_AILLEURS, ailleurs)));
    return { points: Math.round(points * 10) / 10, club, nation, championnat };
  };

  for (const [index, carte] of titulaires.entries()) if (carte) parCarte[carte.id] = affinite(carte, index);
  for (const carte of remplacants) if (carte && !parCarte[carte.id]) parCarte[carte.id] = affinite(carte, -1);

  const presents = titulaires.filter(Boolean) as CarteCarriere[];
  const total = presents.length
    ? Math.round((presents.reduce((somme, c) => somme + parCarte[c.id].points, 0) / presents.length) * (100 / COLLECTIF_MAX))
    : 0;
  return { total, parCarte };
}

/**
 * Ce que le collectif change à la note d'un joueur, de −1 à +3.
 *
 * ⚠️ IL Y A UNE PÉNALITÉ, ET ELLE EST PETITE. Sans elle, le collectif n'est
 * qu'un bonus qu'on prend quand il tombe — jamais une contrainte qui fait
 * hésiter entre le meilleur joueur et celui qui parle la même langue que sa
 * charnière. Elle reste à −1 parce que le mode distribue des cartes au hasard :
 * une dotation de trente licenciés de Régionale 3 n'a aucun collectif au
 * départ, et il ne s'agit pas de punir un joueur pour ce que les packs lui ont
 * donné. L'ancien barème allait de 0 à +3 ; la moyenne d'un XV ordinaire bouge
 * donc à peine, et un XV construit gagne un point de note complet.
 */
export function bonusCollectif(points: number): number {
  const borne = Math.max(0, Math.min(COLLECTIF_MAX, points));
  return Math.round((-1 + (borne / COLLECTIF_MAX) * 4) * 10) / 10;
}

/** Les cinq paliers d'affichage, du groupe neuf à l'équipe qui se connaît. */
export function paliersCollectif(total: number): 'neuf' | 'fragile' | 'correct' | 'solide' | 'fusionnel' {
  if (total < 20) return 'neuf';
  if (total < 40) return 'fragile';
  if (total < 60) return 'correct';
  if (total < 80) return 'solide';
  return 'fusionnel';
}
