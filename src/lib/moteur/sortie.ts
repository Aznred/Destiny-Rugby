// SE FAIRE REMPLACER, OU SIMULER LA FIN DU MATCH — Correctif 19 (suite).
//
// Demande : « un bouton pour se faire remplacer / simuler ». Quand on ne veut plus jouer un match de carrière — on a ce
// qu'on voulait, ou on veut simplement avancer — deux sorties :
//
//  1. ⚠️ SE FAIRE REMPLACER : le staff fait entrer un remplaçant à la place du joueur AU PROCHAIN ARRÊT DE JEU, comme
//     depuis un vrai banc (`demanderRemplacement`). On ne sort jamais en pleine course, et on ne remplace pas par
//     « le premier venu » : même poste, à défaut même famille, à défaut même catégorie — le même appariement que le
//     moteur pour ses propres changements.
//  2. ⚠️ SIMULER : le moteur joue le reste du match tout seul, pas à pas, sans rien sauter. C'est exactement le même
//     moteur à pas fixe : le résultat est celui qu'on aurait obtenu en regardant (le banc `verify:vitesse-match` le
//     vérifie), seul le temps d'attente disparaît.
//
// ⚠️ CE FICHIER NE TIENT AUCUNE HORLOGE : `simulerPendant` reçoit la sienne en paramètre.

import type { EtatMatch } from './etat.js';
import type { Pion } from './entites.js';
import { POSTE_PAR_ID } from '../../data/rugby.js';
import { avancer, demanderRemplacement } from './moteur.js';

/** Le moteur ne fait jamais plus de huit changements par équipe (`gererRemplacements`). */
const CHANGEMENTS_MAXIMUM = 8;

export type RaisonSansSortie =
  | 'fini'          // le match est terminé
  | 'absent'        // pas de joueur incarné (match de manager)
  | 'banc'          // il n'est pas encore entré en jeu
  | 'sorti'         // il a déjà été remplacé
  | 'sanction'      // exclu ou au carton : il ne peut pas être remplacé tant qu'il n'est pas revenu
  | 'aucunRemplacant'
  | 'demande';      // un remplacement est déjà demandé pour lui

export interface PossibiliteDeSortie {
  possible: boolean;
  raison?: RaisonSansSortie;
  /** Celui qui entrerait à sa place. */
  remplacant?: Pion;
}

/** Les remplaçants qui n'ont pas encore joué et peuvent entrer, comme le moteur les compte. */
function banc(e: EtatMatch, cote: Pion['cote']): Pion[] {
  return e.pions.filter((p) => p.cote === cote && !p.surLeTerrain && !p.remplace && p.sanction <= 0 && p.minutes === 0 && !!p.sourceId);
}

/**
 * Qui entre à la place de `sortant` ? Le même poste, à défaut la même famille, à défaut la même catégorie
 * (avant ou arrière) — jamais « le premier venu » : un arrière est déjà entré pilier.
 */
export function remplacantPour(e: EtatMatch, sortant: Pion): Pion | null {
  const famille = (x: Pion) => POSTE_PAR_ID[x.poste]?.famille;
  const possibles = banc(e, sortant.cote);
  return possibles.find((p) => p.poste === sortant.poste)
    ?? possibles.find((p) => famille(p) === famille(sortant))
    ?? possibles.find((p) => p.avant === sortant.avant)
    ?? null;
}

/** Le joueur incarné, la sortie qu'on peut lui offrir, et pourquoi pas. */
export function possibiliteDeSortie(e: EtatMatch): PossibiliteDeSortie {
  if (e.fini) return { possible: false, raison: 'fini' };
  const moi = e.pions.find((p) => p.moi);
  if (!moi) return { possible: false, raison: 'absent' };
  if (!moi.surLeTerrain) {
    if (moi.sanction > 0) return { possible: false, raison: 'sanction' };
    return { possible: false, raison: moi.minutes > 0 ? 'sorti' : 'banc' };
  }
  if (e.remplacementsDemandes[moi.cote]?.sortantId === moi.sourceId) return { possible: false, raison: 'demande' };
  if ((moi.cote === 'A' ? e.remplacementsA : e.remplacementsB) >= CHANGEMENTS_MAXIMUM) return { possible: false, raison: 'aucunRemplacant' };
  const remplacant = remplacantPour(e, moi);
  return remplacant ? { possible: true, remplacant } : { possible: false, raison: 'aucunRemplacant' };
}

/**
 * Demande le remplacement du joueur incarné. Rend la possibilité qui a servi, `possible` valant faux si rien n'a été
 * demandé.
 *
 * ⚠️ UN CHANGEMENT DEMANDÉ PAR LE STAFF ADVERSE OU PAR L'IA POUR CE CÔTÉ EST REMPLACÉ : le moteur n'en garde qu'un par
 * équipe, et celui du joueur — qui vient de le demander — prime.
 */
export function demanderMaSortie(e: EtatMatch): PossibiliteDeSortie {
  const p = possibiliteDeSortie(e);
  if (!p.possible || !p.remplacant) return p;
  const moi = e.pions.find((x) => x.moi)!;
  if (!demanderRemplacement(e, moi.cote, p.remplacant.sourceId, moi.sourceId)) return { possible: false, raison: 'aucunRemplacant' };
  return p;
}

/**
 * Joue le match par lots de trois secondes tant que le budget de temps n'est pas épuisé, ou jusqu'à la sirène.
 * L'écran l'appelle à chaque image avec un budget de quelques millisecondes : la page reste vivante, et le match entier
 * passe en une à deux secondes. `apresChaqueLot` laisse l'écran faire ce qu'il fait d'habitude entre deux avances (les
 * blessures du groupe du manager, tirées minute par minute).
 */
export function simulerPendant(e: EtatMatch, budgetMs: number, maintenant: () => number, apresChaqueLot?: () => void): void {
  const debut = maintenant();
  do {
    avancer(e, 3);
    apresChaqueLot?.();
  } while (!e.fini && maintenant() - debut < budgetMs);
}
