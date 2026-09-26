// LE COLLECTIF — ce que vaut une équipe QUI SE CONNAÎT
//
// ⚠️ CE N'EST PAS UN BONUS CACHÉ, ET C'EST TOUT L'INTÉRÊT. Le mode en ligne en
// avait déjà un : une ligne perdue au milieu du lancement de match donnait
// +0,3 par coéquipier de même club ou de même nation, plafonné à +3. Personne
// ne pouvait le voir, donc personne ne pouvait le jouer. Une feuille se compose
// autrement quand on SAIT qu'aligner quatre Toulousains rapporte quelque chose.
//
// ⚠️ ON COMPTE DES GROUPES, PAS DES PAIRES — et c'est la correction demandée en
// jeu (« c'est trop sévère »). La première version pesait chaque lien deux à
// deux, en donnant quatre fois plus de poids aux liens à l'intérieur de l'unité
// (première ligne, charnière, centres). Résultat mesuré : un XV entièrement
// d'un même club sortait à 100, mais tout le reste s'effondrait — 43 pour la
// dotation de départ, 1 pour un XV dépareillé. Une échelle qui ne récompense
// qu'un cas impossible à réunir ne se joue pas davantage qu'une échelle plate.
//
// La règle est maintenant celle qu'on peut tenir dans la tête en composant :
//
//   • un joueur regarde COMBIEN DE COÉQUIPIERS DU XV il retrouve, pour chacune
//     des trois affinités — même CLUB RÉEL, même NATION, même CHAMPIONNAT ;
//   • il garde sa MEILLEURE des trois, jamais la somme ;
//   • le club monte beaucoup plus vite : TROIS JOUEURS DU MÊME CLUB SUFFISENT
//     À METTRE CES TROIS-LÀ AU MAXIMUM. C'est ce qui rend une équipe HYBRIDE
//     jouable — un bloc toulousain au milieu d'un XV cosmopolite reste payant ;
//   • cinq joueurs de même nation ou sept de même championnat ont 10/10.
//
// ⚠️ LE BANC NE COMPTE PAS. Ni comme bénéficiaire, ni comme partenaire. Un
// remplaçant ne joue pas les 80 minutes et n'a pas à gonfler le total parce
// qu'on aurait garni huit places d'un même club. Il n'a donc NI bonus NI
// pénalité : `parCarte` ne contient que le XV de départ.

import type { CompositionManager } from '../../types.js';
import type { CarteCarriere } from './typesCarriere.js';

/** Le maximum d'un joueur. Le total d'équipe est la moyenne du XV sur 100. */
export const COLLECTIF_MAX = 10;

export type Affinite = 'club' | 'nation' | 'championnat';

/**
 * ⚠️ LES PALIERS, ET ILS SE LISENT DE HAUT EN BAS. Chaque ligne est
 * `[taille du groupe, points]`, la première atteinte gagne. La taille COMPTE LE
 * JOUEUR LUI-MÊME : « club 3 » veut dire trois joueurs du même club sur la
 * feuille, lui compris — la formulation demandée en jeu.
 *
 * Le club grimpe vite : TROIS joueurs du même club suffisent au maximum.
 * La nation demande CINQ joueurs pour le maximum, et le championnat SEPT.
 */
const PALIERS: Readonly<Record<Affinite, readonly (readonly [number, number])[]>> = {
  club: [[3, 10], [2, 6]],
  nation: [[5, 10], [4, 7], [3, 4], [2, 2]],
  championnat: [[7, 10], [5, 7], [4, 4], [3, 2], [2, 1]],
};

export interface AffiniteCarte {
  /** De 0 à `COLLECTIF_MAX`. */
  points: number;
  /** La taille du groupe pour chaque affinité, le joueur lui-même compris. */
  club: number;
  nation: number;
  championnat: number;
  /** Celle qui a donné les points — pour que l'écran puisse dire POURQUOI. */
  meilleure: Affinite | null;
}

export interface CollectifEquipe {
  /** De 0 à 100 : la moyenne du XV de départ. */
  total: number;
  parCarte: Record<string, AffiniteCarte>;
}

/** Ce que vaut un groupe de cette taille pour cette affinité. */
function niveau(affinite: Affinite, taille: number): number {
  for (const [seuil, points] of PALIERS[affinite]) if (taille >= seuil) return points;
  return 0;
}

/**
 * Le collectif d'une feuille de match.
 *
 * ⚠️ ON NE COMPTE QUE LES TITULAIRES, des deux côtés du calcul : le banc n'est
 * ni servi ni compté comme partenaire. Une carte du banc n'apparaît donc PAS
 * dans `parCarte` — et l'appelant doit lire cette absence comme « aucun effet »,
 * jamais comme « zéro point » : zéro point vaut −1 de note.
 */
export function collectifCarriere(
  cartes: readonly CarteCarriere[],
  composition: Pick<CompositionManager, 'titulaires'>,
): CollectifEquipe {
  const parId = new Map(cartes.map((c) => [c.id, c]));
  const titulaires = composition.titulaires
    .map((id) => parId.get(id))
    .filter((c): c is CarteCarriere => Boolean(c));

  // Les groupes du XV : combien de titulaires portent ce club, cette nation, ce
  // championnat. Une valeur vide (carte sans club réel connu) ne fait pas
  // groupe — sinon tous les inconnus se reconnaîtraient entre eux.
  const compter = (cle: (c: CarteCarriere) => string | undefined) => {
    const tailles = new Map<string, number>();
    for (const c of titulaires) {
      const valeur = cle(c);
      if (valeur) tailles.set(valeur, (tailles.get(valeur) ?? 0) + 1);
    }
    return (c: CarteCarriere) => {
      const valeur = cle(c);
      return valeur ? tailles.get(valeur) ?? 0 : 0;
    };
  };
  const tailleClub = compter((c) => c.clubReel);
  const tailleNation = compter((c) => c.nation);
  const tailleChampionnat = compter((c) => c.championnat);

  const parCarte: Record<string, AffiniteCarte> = {};
  for (const carte of titulaires) {
    const club = tailleClub(carte);
    const nation = tailleNation(carte);
    const championnat = tailleChampionnat(carte);
    // ⚠️ LA MEILLEURE, PAS LA SOMME. Un Toulousain français du Top 14 remplit
    // les trois cases ; les additionner ferait payer trois fois la même
    // évidence, et le club — le seul lien qu'on construise vraiment — se
    // noierait dans deux affinités qu'on a sans rien faire.
    const scores: readonly (readonly [Affinite, number])[] = [
      ['club', niveau('club', club)],
      ['nation', niveau('nation', nation)],
      ['championnat', niveau('championnat', championnat)],
    ];
    let meilleure: Affinite | null = null;
    let points = 0;
    for (const [nom, valeur] of scores) if (valeur > points) { points = valeur; meilleure = nom; }
    parCarte[carte.id] = { points, club, nation, championnat, meilleure };
  }

  const total = titulaires.length
    ? Math.round((titulaires.reduce((somme, c) => somme + parCarte[c.id].points, 0) / titulaires.length) * (100 / COLLECTIF_MAX))
    : 0;
  return { total, parCarte };
}

/**
 * Ce que le collectif change à la note d'un joueur, de −2 à +4.
 *
 * ⚠️ IL Y A UNE PÉNALITÉ, ET ELLE EST PETITE. Sans elle, le collectif n'est
 * qu'un bonus qu'on prend quand il tombe — jamais une contrainte qui fait
 * hésiter entre le meilleur joueur et celui qui parle la même langue que sa
 * charnière. Le collectif doit pouvoir compenser plusieurs points de GEN sans
 * pour autant transformer une équipe moyenne en sélection mondiale.
 *
 * ⚠️ ELLE NE S'APPLIQUE PAS AU BANC. Un remplaçant n'a pas d'entrée dans
 * `parCarte` : l'appelant doit alors laisser sa note tranquille, et surtout pas
 * appeler cette fonction avec 0.
 */
export function bonusCollectif(points: number): number {
  const borne = Math.max(0, Math.min(COLLECTIF_MAX, points));
  return Math.round((-2 + (borne / COLLECTIF_MAX) * 6) * 10) / 10;
}

/** Les cinq paliers d'affichage, du groupe neuf à l'équipe qui se connaît. */
export function paliersCollectif(total: number): 'neuf' | 'fragile' | 'correct' | 'solide' | 'fusionnel' {
  if (total < 20) return 'neuf';
  if (total < 40) return 'fragile';
  if (total < 60) return 'correct';
  if (total < 80) return 'solide';
  return 'fusionnel';
}
