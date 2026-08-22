// 📺 LE FIL DU MATCH — le moteur raconté ligne par ligne, et rien d'autre
//
// ═══ POURQUOI CE FICHIER EXISTE ══════════════════════════════════════════════
//
// Retour de jeu : « refais la mécanique de match totalement, que ce soit super
// facile et fun à prendre en main sur n'importe quel appareil, super ludique ».
// Avec, juste avant, le format voulu, décrit noir sur blanc : un fil de match
// généré par blocs de deux à quatre actions, chaque ligne au format
// `[minute'] [emoji] [phrase courte]`, centré sur SON joueur, qui s'ARRÊTE dès
// qu'une décision se présente et attend la réponse pour reprendre.
//
// ⚠️ LE MOTEUR NE CHANGE PAS D'UNE LIGNE, ET C'EST LA DÉCISION STRUCTURANTE.
// `lib/moteur/` produit déjà tout : la minute, les phases, les plaquages, les
// cartons, le score EXACT de la ligue, la feuille du joueur et sa note. Le
// problème n'a jamais été la simulation, il a toujours été sa SURFACE : trente
// pions à lire, une caméra à suivre, un joystick à tenir. On remplace donc la
// surface, pas le moteur — et tout ce qui est mesuré (`verifMoteur`,
// `verifControle`, `verifStats`) reste vrai par construction.
//
// ⚠️ ET ON N'AVANCE PLUS À L'IMAGE, ON AVANCE À L'ÉVÈNEMENT. L'ancien écran
// tournait sur `requestAnimationFrame` : soixante images par seconde, une
// interpolation, un `ResizeObserver`, une matrice de caméra. C'est ce qui le
// rendait lourd sur un téléphone modeste — et carrément muet dans un onglet en
// arrière-plan, où le navigateur ne déclenche plus une seule image. Ici, une
// horloge suffit : on demande au moteur de jouer jusqu'à ce qu'il ait quelque
// chose à raconter, et on l'affiche. Ça marche à l'identique sur un téléphone
// d'entrée de gamme, une tablette et un ordinateur.

import { avancer } from './moteur';
import type { Commentaire, EtatMatch, TypeCommentaire } from './etat';
import { LIGNE_A, LIGNE_B } from './terrain';

/**
 * L'emoji de chaque type d'action.
 *
 * ⚠️ IL Y EN A UN POUR CHAQUE TYPE, SANS EXCEPTION, et le banc d'essai le
 * vérifie. Une ligne sans emoji casse l'alignement de tout le fil : le texte ne
 * démarre plus à la même colonne, et l'œil perd le rythme qui rend un live
 * lisible d'un coup d'œil.
 */
export const EMOJI_ACTION: Record<TypeCommentaire, string> = {
  essai: '🔥',
  but: '🎯',
  butRate: '😖',
  plaquage: '💥',
  franchissement: '⚡',
  ruck: '🔒',
  melee: '🏉',
  touche: '🙌',
  maul: '🚂',
  pied: '👟',
  penalite: '⚖️',
  carton: '🟨',
  remplacement: '🔄',
  jalon: '🔔',
  jeu: '🏉',
};

/** Les actions qui méritent d'être plus grosses que les autres à l'écran. */
const FORTES: ReadonlySet<TypeCommentaire> = new Set<TypeCommentaire>([
  'essai', 'but', 'carton', 'jalon', 'penalite',
]);

export interface LigneFil {
  /** Clé de rendu : le fil ne se réordonne jamais, l'index suffit et il est stable. */
  cle: number;
  minute: number;
  emoji: string;
  texte: string;
  /** Mon joueur est dans le coup : la ligne se voit. */
  moi: boolean;
  /** Fait marquant : la ligne prend de la place. */
  fort: boolean;
  /** Le score APRÈS l'action, seulement quand elle l'a changé. */
  score: string | null;
}

/** Habille un commentaire du moteur pour le fil. */
export function habiller(c: Commentaire, index: number, precedent?: Commentaire): LigneFil {
  return {
    cle: index,
    minute: c.minute,
    emoji: EMOJI_ACTION[c.type] ?? '🏉',
    texte: c.texte,
    moi: !!c.moi,
    fort: FORTES.has(c.type) || c.points > 0,
    // ⚠️ ON N'AFFICHE LE SCORE QUE QUAND IL BOUGE. Le répéter à chaque ligne
    // ferait un fil de chiffres où l'essai ne se remarque plus — or c'est
    // exactement ce qu'on vient regarder.
    score: !precedent || precedent.scoreA !== c.scoreA || precedent.scoreB !== c.scoreB
      ? `${c.scoreA} - ${c.scoreB}`
      : null,
  };
}

/**
 * Le fil complet, tel qu'il doit s'afficher.
 *
 * Recalculé à partir de `e.commentaires` : le moteur reste la seule source, et
 * il n'y a aucune liste parallèle à tenir synchronisée.
 */
export function filComplet(e: EtatMatch): LigneFil[] {
  return e.commentaires.map((c, i) => habiller(c, i, e.commentaires[i - 1]));
}

// ───────────────────────────────────────────────────────────────────────────
// LA GÉNÉRATION PAR BLOCS
// ───────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ « DES BLOCS DE DEUX À QUATRE ACTIONS », c'est la demande, et c'est aussi
 * ce qui rend un live lisible : une ligne à la fois donne un télétype qu'on
 * n'arrive pas à suivre, dix d'un coup donnent un mur de texte qu'on ne lit
 * pas. Deux, c'est le minimum pour qu'il se passe quelque chose ; quatre, le
 * maximum qu'on embrasse d'un regard sur un téléphone.
 */
export const BLOC_MIN = 2;
export const BLOC_MAX = 4;

/**
 * Le pas de simulation entre deux relectures.
 *
 * ⚠️ IL EST PETIT EXPRÈS. On s'arrête sur la première décision qui se présente,
 * et une décision se lit ENTRE deux pas : un pas d'une seconde ferait manquer
 * le moment où le ballon arrive sur soi, et la carte s'ouvrirait une seconde
 * trop tard, sur une situation qui n'existe plus.
 */
const PAS = 0.45;

/** Pourquoi la génération s'est arrêtée. */
export type ArretFil = 'bloc' | 'decision' | 'bagarre' | 'fini';

export interface ResultatBloc {
  raison: ArretFil;
  /** Nombre de lignes produites par ce bloc. */
  produites: number;
}

/**
 * Fait jouer le match jusqu'au prochain point d'arrêt.
 *
 * On s'arrête à la PREMIÈRE des quatre raisons rencontrées : la sirène, une
 * bagarre qui attend un ordre, une décision à prendre, ou un bloc de lignes
 * assez fourni pour être affiché.
 *
 * ⚠️ `decisionPrete` EST INJECTÉE, elle n'est pas importée. Ce fichier ne doit
 * rien savoir de la façon dont l'écran espace ses cartes (le repos, le
 * compteur) : il lui demande juste, à chaque pas, « est-ce qu'il y a une
 * décision maintenant ? ». C'est aussi ce qui permet au banc d'essai de le
 * faire tourner sans carte du tout.
 */
export function jouerUnBloc(
  e: EtatMatch,
  decisionPrete: (e: EtatMatch) => boolean,
): ResultatBloc {
  const depart = e.commentaires.length;
  // Garde-fou : une phase arrêtée peut ne rien raconter pendant un moment (une
  // mêlée qui se met en place). Sans borne, on jouerait le match entier dans
  // une seule itération et l'écran se figerait le temps de tout calculer.
  const maxPas = Math.ceil(90 / PAS);

  // ⚠️ LA TAILLE DU BLOC VARIE, ET ELLE NE TIRE PAS AU SORT. Un bloc toujours
  // long de deux lignes donne un télétype régulier comme un métronome : on
  // décroche. On la fait donc cycler sur 2, 3, 4 à partir du nombre de lignes
  // déjà écrites — une LECTURE de l'état, jamais un appel à `e.rng()`, qui
  // changerait le match lui-même et casserait le déterminisme du moteur.
  const cible = BLOC_MIN + (e.commentaires.length % (BLOC_MAX - BLOC_MIN + 1));

  for (let i = 0; i < maxPas; i++) {
    if (e.fini) return { raison: 'fini', produites: e.commentaires.length - depart };
    if (e.bagarre) return { raison: 'bagarre', produites: e.commentaires.length - depart };
    if (decisionPrete(e)) return { raison: 'decision', produites: e.commentaires.length - depart };
    avancer(e, PAS);
    if (e.commentaires.length - depart >= cible) break;
  }

  if (e.fini) return { raison: 'fini', produites: e.commentaires.length - depart };
  return { raison: 'bloc', produites: e.commentaires.length - depart };
}

// ───────────────────────────────────────────────────────────────────────────
// LA POSITION DU BALLON, EN UN SEUL NOMBRE
// ───────────────────────────────────────────────────────────────────────────

/**
 * Où en est le ballon sur le terrain, de 0 (ma ligne d'essai) à 1 (la sienne).
 *
 * ⚠️ C'EST TOUTE LA PARTIE « VISUELLE » DONT UN FIL A BESOIN. Un texte seul ne
 * dit jamais si on défend sur sa ligne ou si on pilonne à cinq mètres — et
 * c'est pourtant ce qui fait monter la tension. Une barre et un ballon qui
 * glisse suffisent, là où une scène en deux dimensions demandait une caméra,
 * une interpolation et soixante images par seconde.
 *
 * @param monCote le camp du joueur incarné ; à défaut, on regarde du côté A.
 */
export function avanceeDuBallon(e: EtatMatch, monCote: 'A' | 'B' = 'A'): number {
  const brut = (e.ballon.x - LIGNE_A) / (LIGNE_B - LIGNE_A);
  const borne = Math.max(0, Math.min(1, brut));
  // Le camp B attaque vers les X décroissants : on retourne pour que « vers la
  // droite » veuille toujours dire « vers l'en-but adverse ».
  return monCote === 'A' ? borne : 1 - borne;
}
