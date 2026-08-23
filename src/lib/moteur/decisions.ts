// ⏸️ LES MOMENTS DE DÉCISION — le match s'arrête, tu choisis, le jeu le joue
//
// ═══ CE QUI A ÉTÉ DEMANDÉ, ET POURQUOI ═══════════════════════════════════════
//
// Retour de jeu, mot pour mot : « rends la mécanique de jeu plus fun et plus
// jouable, plus en mode on a un moment, 10 secondes pour choisir une action, et
// ça la simule ». Et juste après : « le temps passe trop lentement, trop
// d'action en ce temps ».
//
// Les deux vont ensemble, et ils disent la même chose : le mode manette
// (`moteur/moments.ts`) demande de LIRE et de RÉAGIR en temps réel, quatre-vingt
// fois par match. C'est un jeu de sport à la manette — très bien pour qui veut
// ça, épuisant pour qui veut vivre une CARRIÈRE. Entre deux gestes il ne se
// passe rien pour soi, et pourtant il faut rester devant.
//
// ═══ LA RÉPONSE : ON NE JOUE QUE LES CARREFOURS ══════════════════════════════
//
// Le match file à vive allure. Quand une vraie décision se présente — le ballon
// est dans tes mains, il arrive sur toi, un porteur te fonce dessus, un
// regroupement se forme — **le jeu se fige**, une carte s'ouvre avec deux à
// quatre options, et un compte à rebours de dix secondes. Tu choisis ; le
// moteur joue la suite, au ralenti, pour que tu VOIES ce que ton choix a donné.
//
// ⚠️ TROIS RÈGLES QUI TIENNENT TOUT LE RESTE :
//
// 1. **AUCUNE OPTION N'EST INVENTÉE.** Une carte ne propose que des actions que
//    `controle.ts` déclare jouables à cet instant précis. Il n'y a donc pas deux
//    façons de jouer un plaquage, une seule surface d'appel, et rien à re-régler
//    quand une action change.
//
//    ⚠️ ET DEPUIS « QUE ÇA S'APPLIQUE VRAIMENT », ELLE LES FAIT JOUER PAR
//    `resoudreChoix` (moteur/moteur.ts) ET NON PLUS PAR `demanderAction`. La
//    différence est tout sauf cosmétique : `demanderAction` ARMAIT une intention
//    que le moteur dépensait plus tard, au prochain contact — qui pouvait ne
//    jamais venir. `resoudreChoix` tire le dé tout de suite, avec la chance
//    affichée sur le bouton, et applique l'issue dans la foulée : le plaquage a
//    lieu, ou le porteur perce.
// 2. **NE PAS CHOISIR EST UN CHOIX.** À zéro, la carte se ferme sans rien armer
//    et le jeu reprend : le moteur joue son rugby automatique, comme pour les
//    vingt-neuf autres. Ce n'est pas une punition, c'est ce qui se passe quand
//    un joueur reste spectateur — et c'est ce qui rend le fait de décider
//    intéressant.
// 3. **LE MATCH NE SE JOUE PAS DEUX FOIS.** Ce fichier ne mute RIEN. Comme
//    `moments.ts`, il lit l'état et propose ; le déterminisme du moteur est
//    intact, et deux joueurs qui font les mêmes choix vivent le même match.

import { ACTION_PAR_ID, actionsDisponibles } from './controle';
import { enjeuDe } from './moteur';
import type { ActionJoueur, EtatMatch } from './etat';
import type { Pion } from './entites';
import { momentDuJoueur, type TypeMoment } from './moments';

/**
 * ⚠️ DIX SECONDES, EN TEMPS RÉEL, PENDANT QUE LE JEU EST FIGÉ. C'est la demande
 * telle quelle. C'est aussi la bonne durée : assez pour lire quatre options et
 * regarder le terrain, trop court pour calculer — un choix de rugby se prend
 * dans l'instant, et l'hésitation doit coûter.
 */
export const DELAI_DECISION = 10;

/**
 * Le compte à rebours d'une carte D'ENCHAÎNEMENT, en secondes réelles.
 *
 * ⚠️ PLUS COURT QUE DIX, ET C'EST LE POINT. Un enchaînement se joue au cœur de
 * l'action — on vient de percer, le défenseur est au sol, il y a un trou. Dix
 * secondes de réflexion là-dedans casseraient exactement l'élan qu'on vient de
 * créer. Cinq, c'est le temps de lire deux options et de trancher.
 */
export const DELAI_COMBO = 5;

/**
 * Le repos entre deux cartes, en secondes SIMULÉES.
 *
 * ⚠️ C'EST LUI QUI FAIT LA DIFFÉRENCE ENTRE UN CARREFOUR ET UNE CORVÉE.
 * `momentDuJoueur` déclenche 119 fois par match : une carte à chaque fois, ce
 * serait vingt minutes de menus et plus une seconde de rugby. Espacées, elles
 * tombent sur une vingtaine de moments — l'ordre de grandeur des ballons qu'un
 * joueur touche vraiment dans un match.
 */
export const REPOS_DECISION = 95;

/**
 * Le rejeu : les secondes RÉELLES pendant lesquelles le match repart au ralenti
 * juste après un choix.
 *
 * ⚠️ SANS LUI, LA DÉCISION N'A PAS DE RÉPONSE. On choisit « je plaque », le jeu
 * repart à seize fois la vitesse réelle, et trois images plus tard on est au
 * ruck suivant sans avoir rien vu. Un choix dont on ne voit pas le résultat
 * n'apprend rien et ne procure rien.
 */
export const REJEU = 3.2;

export interface OptionDecision {
  action: ActionJoueur;
  emoji: string;
  /** Clé i18n du libellé (celui de l'action : une seule vérité). */
  cle: string;
  /** Clé i18n de l'explication : ce que ça fait, ce que ça risque. */
  aide: string;
  /**
   * ⚠️ LA CHANCE DE RÉUSSITE, 0 À 1 — ET C'EST CELLE QUI SERA TIRÉE.
   *
   * Demande : « avec un système de pourcentage de réussite et d'impact dans le
   * jeu ». Elle vient de `enjeuDe`, que `resoudreChoix` rappelle juste avant de
   * lancer le dé : le chiffre écrit sur le bouton EST le chiffre joué. Il ne
   * peut pas dériver, parce qu'il n'existe qu'à un seul endroit.
   *
   * ⚠️ ELLE EST CALCULÉE À L'OUVERTURE DE LA CARTE, et le jeu est FIGÉ tant
   * qu'elle est ouverte : la situation ne peut donc pas changer entre
   * l'affichage et le clic. C'est ce qui rend la promesse tenable.
   */
  chance: number;
  /** Clé i18n : ce que la réussite donne. */
  gain: string;
  /** Clé i18n : ce que l'échec coûte. */
  risque: string;
}

export interface Decision {
  moment: TypeMoment;
  /**
   * Cette carte est un ENCHAÎNEMENT : elle suit un geste réussi, sans repos.
   * L'écran s'en sert pour le dire (« ⚡ Enchaîne ! ») et pour raccourcir le
   * compte à rebours.
   */
  enchaine?: boolean;
  /** Clé i18n de la situation, en une phrase. */
  cle: string;
  emoji: string;
  /** Deux à quatre options, dans l'ordre où on les lit. */
  options: OptionDecision[];
}

/** L'entête de la carte, par type de moment. */
const SITUATIONS: Record<TypeMoment, { cle: string; emoji: string }> = {
  ballon: { cle: 'ml.dec.ballon', emoji: '🏉' },
  reception: { cle: 'ml.dec.reception', emoji: '🙌' },
  libre: { cle: 'ml.dec.libre', emoji: '⚡' },
  defense: { cle: 'ml.dec.defense', emoji: '🛡️' },
  ruck: { cle: 'ml.dec.ruck', emoji: '🔒' },
};

/**
 * L'ordre de préférence des actions, par situation.
 *
 * ⚠️ CE N'EST PAS UN CLASSEMENT DU MEILLEUR AU MOINS BON, et il ne faut surtout
 * pas le lire comme ça : c'est l'ordre de LECTURE. On met d'abord les deux
 * gestes qui s'opposent (ouvrir ou fermer, plaquer ou monter), parce qu'une
 * carte se lit en une seconde et que la première paire doit poser le vrai
 * dilemme. La quatrième option est toujours celle qui sort du cadre.
 */
const PREFERENCES: Record<TypeMoment, ActionJoueur[]> = {
  ballon: ['passeGauche', 'passeDroite', 'crochet', 'raffut', 'pied', 'sprint', 'passe'],
  reception: ['crochet', 'raffut', 'sprint', 'appel', 'soutien'],
  libre: ['sprint', 'appel', 'soutien', 'plaquage'],
  defense: ['plaquage', 'monter', 'grattage'],
  ruck: ['grattage', 'plaquage', 'monter'],
};

/**
 * Les gestes qui font monter la température, dans l'ordre où on les propose.
 *
 * ⚠️ ILS ONT PERDU LEUR BOUTON, PAS LEUR PLACE DANS LE JEU. Chambrer, frapper
 * et calmer vivaient derrière le 💢 du HUD, avec sa jauge de tension ; le HUD
 * est parti avec le pilotage (« on ne fait que les choix »). Sans ce repli, le
 * joueur ne pourrait plus JAMAIS déclencher une bagarre — il ne pourrait que
 * les subir, et toute la ligne « Ovale » du jeu deviendrait décorative.
 *
 * ⚠️ ET SEULEMENT QUAND LE MATCH EST CHAUD. Proposer « frapper » à la 3e minute
 * d'un match tranquille, c'est le proposer QUATRE-VINGTS fois : la moitié des
 * carrières finiraient sur une commission de discipline. Au-dessus de `TENDU`,
 * c'est un vrai carrefour ; en dessous, ça n'aurait aucun sens dramatique.
 */
const DISCIPLINE: ActionJoueur[] = ['provoquer', 'frapper', 'calmer'];

/** La température à partir de laquelle la carte ose proposer un geste chaud. */
export const TENDU = 55;

/** Au-delà, la carte devient une liste : on ne choisit plus, on cherche. */
const MAX_OPTIONS = 4;
/** En deçà, il n'y a pas de décision à prendre : on ne coupe pas le match. */
const MIN_OPTIONS = 2;

/**
 * La carte à afficher MAINTENANT, ou `null`.
 *
 * @param depuis secondes simulées écoulées depuis la dernière carte. C'est
 *   l'appelant qui les tient : ce fichier ne garde aucun état, sinon deux
 *   matchs joués en parallèle se partageraient le même compteur — la règle de
 *   déterminisme du moteur.
 */
export function decisionPour(e: EtatMatch, p: Pion | undefined, depuis: number): Decision | null {
  if (!e.controle || e.fini || e.bagarre || !p) return null;
  if (depuis < REPOS_DECISION) return null;

  const moment = momentDuJoueur(e, p);
  if (!moment) return null;

  const dispo = new Set(actionsDisponibles(e).map((a) => a.id));
  const options: OptionDecision[] = [];
  const ajouter = (id: ActionJoueur) => {
    if (!dispo.has(id) || options.length >= MAX_OPTIONS) return;
    const def = ACTION_PAR_ID.get(id);
    if (!def) return;
    const enjeu = enjeuDe(e, p, id);
    options.push({
      action: id, emoji: def.emoji, cle: def.cle, aide: def.aide,
      chance: enjeu.chance, gain: enjeu.gain, risque: enjeu.risque,
    });
  };
  for (const id of PREFERENCES[moment.type]) ajouter(id);
  // ⚠️ LA DISCIPLINE PASSE EN DERNIER, ET SEULEMENT S'IL RESTE DE LA PLACE.
  // C'est exactement le rôle qu'on lui donne : « la quatrième option est
  // toujours celle qui sort du cadre ». Elle ne prend jamais la place d'un
  // geste de rugby — elle occupe le slot qu'aucun geste de rugby ne réclame.
  if (e.tension >= TENDU) for (const id of DISCIPLINE) ajouter(id);
  if (options.length < MIN_OPTIONS) return null;

  return { moment: moment.type, ...SITUATIONS[moment.type], options };
}
