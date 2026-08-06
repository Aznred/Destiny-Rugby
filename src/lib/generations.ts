// LES CYCLES D'UN CLUB — et les GÉNÉRATIONS DORÉES
//
// ⚠️ POURQUOI CE FICHIER EXISTE. Retour de jeu : « j'ai l'impression que c'est
// toujours le même calendrier des matchs et que les équipes font toujours les
// mêmes générales, en mode ça sera toujours le Stade premier ; fais qu'il puisse
// y avoir des générations dorées dans tous les clubs des divisions, qu'on puisse
// gagner un Top 14 avec un outsider — mais que ça reste rare ».
//
// Le constat était juste, et c'était mécanique. La force d'un club
// (`forceEffectif`) est la moyenne pondérée de ses 23 meilleurs joueurs ; ces
// joueurs vieillissent d'un an par saison, donc la hiérarchie de 2025-26 se
// reconduisait presque à l'identique pendant douze ans. Le Stade Toulousain
// commence à 86, personne d'autre n'est au-dessus de 80 : il finissait premier
// TOUTES les saisons, et un club de milieu de tableau n'avait aucune histoire.
//
// ⚠️ CE N'EST PAS DU BRUIT ALÉATOIRE, C'EST UN CYCLE. Un club ne saute pas de
// 75 à 82 puis retombe : il monte, il culmine, il redescend. C'est ce qui rend
// l'irrégularité LISIBLE — on voit une équipe se construire, dominer trois ans,
// puis se déliter, et ça se raconte. Trois couches se superposent :
//
//   1. LE CYCLE ORDINAIRE (toujours actif) — une sinusoïde de faible amplitude
//      (±2,2), période 7 à 11 saisons, phase propre à chaque club. C'est le
//      vivier qui se garnit et se vide, les bonnes et les mauvaises séries.
//   2. LA GÉNÉRATION DORÉE (rare) — une fenêtre de 4 à 6 saisons où un club
//      prend jusqu'à +8. Une promotion du centre de formation qui éclot en même
//      temps. En cloche : elle arrive, elle culmine, elle s'en va.
//   3. LA TRAVERSÉE DU DÉSERT (rare) — la même chose à l'envers, jusqu'à −6.
//      Indispensable : sans elle, les gros clubs ne redescendent jamais et un
//      outsider ne peut gagner qu'en étant meilleur dans l'absolu.
//
// ⚠️ TOUT EST DÉTERMINISTE (graine = nom du club). Comme les effectifs et les
// championnats : rien n'est sauvegardé, rouvrir un écran ne retire pas au sort,
// et deux parties du même joueur voient le même monde. C'est la règle du projet.
//
// ⚠️ ET ON L'APPLIQUE À UN SEUL ENDROIT — `effectifDuClub` (lib/effectif.ts),
// sur la note de chaque joueur. Tout en découle sans rien d'autre à toucher :
// la force d'effectif, le classement, les montées, les offres de contrat, la
// feuille de match, et l'écran 👥 qui montre bien des joueurs meilleurs. Poser
// le bonus sur `forceEffectif` seul aurait donné un club qui gagne 82 avec un
// effectif affiché à 75 : deux vérités, et le joueur a raison de ne pas y croire.

import { graine } from './championnat';

export interface Generation {
  /** Ce qui s'ajoute à la note de CHAQUE joueur du club cette saison. */
  bonus: number;
  /** Une génération dorée est en cours (à afficher au joueur). */
  doree: boolean;
  /** Une traversée du désert est en cours. */
  creuse: boolean;
  /** Où on en est dans la vague, 0 → 1 → 0. Sert au libellé. */
  intensite: number;
}

// ⚠️ LES DEUX CHIFFRES QUI COMMANDENT LA RARETÉ. Mesurés dans
// `scripts/verifGenerations.ts` : viser ~1 club sur 12 en génération dorée à un
// instant donné, et un champion « surprise » sur cinq ou six saisons de Top 14.
// Les monter, c'est un championnat qui ne veut plus rien dire ; les baisser,
// c'est revenir au Stade Toulousain champion à vie.
const PROBA_DOREE = 0.34;
const PROBA_CREUSE = 0.30;

/** Une cloche douce : 0 aux extrémités, 1 au milieu. */
function cloche(t: number): number {
  return t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t) ** 1.3;
}

const cache = new Map<string, Generation>();

/**
 * Où en est ce club, cette saison ?
 *
 * @param club le nom exact du club (c'est lui la graine — deux clubs de même
 *   nom dans deux divisions n'existent pas dans les données).
 */
export function generationDuClub(club: string, saison: number, noteBase?: number): Generation {
  const cle = `${club}#${saison}`;
  const memo = cache.get(cle);
  if (memo) return memo;

  // ⚠️ UNE GÉNÉRATION DORÉE FAIT PLUS DE BRUIT DANS UN CLUB MOYEN. Mesuré sans
  // ce tempérament : le Stade Toulousain, déjà premier à 86, montait à 92,8 et
  // remportait 11 des 20 saisons — la génération dorée renforçait justement
  // celui qui n'en avait pas besoin, à rebours de la demande (« qu'on puisse
  // gagner un Top 14 avec un outsider »). En haut de l'échelle il n'y a plus
  // grand-chose à gagner ; en milieu de tableau, une promotion qui éclot change
  // tout. Le CREUX, lui, n'est pas tempéré : un gros club doit pouvoir
  // s'effondrer, c'est même ce qui ouvre la porte aux autres.
  const tempere = noteBase == null
    ? 1
    : Math.max(0.3, Math.min(1, (88 - noteBase) / 12));

  const rng = graine(`generation#${club}`);
  // 1. Le cycle ordinaire — il tourne toujours.
  const periode = 7 + rng() * 4;
  const phase = rng() * Math.PI * 2;
  const amplitude = 1.4 + rng() * 0.8;
  let bonus = Math.sin((saison / periode) * Math.PI * 2 + phase) * amplitude;

  // 2. La génération dorée. Elle tombe une fois, à une saison tirée d'avance —
  //    parfois avant même que la carrière du joueur ne commence (le club est
  //    alors déjà au sommet quand on arrive, et il redescendra).
  let doree = false;
  let intensite = 0;
  if (rng() < PROBA_DOREE) {
    const debut = -2 + Math.floor(rng() * 16); // de « déjà en cours » à la S13
    const duree = 4 + Math.floor(rng() * 3);
    const pic = (4.5 + rng() * 3.5) * tempere;
    const t = (saison - debut) / duree;
    const c = cloche(t);
    if (c > 0) {
      bonus += c * pic;
      // On ne l'annonce que quand elle se voit vraiment : les deux saisons de
      // bordure sont une montée en puissance, pas encore un événement.
      doree = c > 0.55;
      intensite = c;
    }
  }

  // 3. La traversée du désert — le pendant, et c'est elle qui ouvre la porte
  //    aux outsiders : sans elle, les gros clubs ne redescendent jamais.
  let creuse = false;
  if (rng() < PROBA_CREUSE) {
    const debut = -2 + Math.floor(rng() * 16);
    const duree = 3 + Math.floor(rng() * 3);
    const creux = 3 + rng() * 3;
    const c = cloche((saison - debut) / duree);
    if (c > 0) {
      bonus -= c * creux;
      creuse = c > 0.55 && !doree;
      if (c > intensite) intensite = c;
    }
  }

  const g: Generation = {
    bonus: Math.round(bonus * 100) / 100,
    doree,
    creuse: creuse && !doree,
    intensite: Math.round(intensite * 100) / 100,
  };
  cache.set(cle, g);
  return g;
}

/** Le libellé à afficher sur la fiche d'un club, ou rien. */
export function libelleGeneration(g: Generation): string | null {
  if (g.doree) return '🥇 Génération dorée';
  if (g.creuse) return '📉 Traversée du désert';
  return null;
}

/** Purge du cache — utile aux scripts de mesure, jamais au jeu. */
export function oublierGenerations(): void {
  cache.clear();
}
