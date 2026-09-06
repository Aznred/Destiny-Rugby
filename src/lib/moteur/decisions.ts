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

import { ACTION_PAR_ID, actionsDisponibles } from './controle.js';
import { enjeuDe } from './moteur.js';
import type { ActionJoueur, EtatMatch } from './etat.js';
import type { Pion } from './entites.js';
import { momentDuJoueur, type TypeMoment } from './moments.js';

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
 * Le compte à rebours d’une carte de BALLON, en secondes réelles.
 *
 * ⚠️ SIX, ET PAS DIX, PARCE QU’IL Y EN A SOIXANTE PAR MATCH. Depuis qu’une
 * carte s’ouvre à chaque ballon touché, ce n’est plus un carrefour toutes les
 * deux minutes : c’est le rythme du jeu. Dix secondes de menu sur une passe de
 * routine, soixante fois, c’est six minutes de formulaire — mesuré, et ça
 * faisait passer le match de 5,7 à 12,4 minutes.
 *
 * ⚠️ ET SIX SECONDES, C’EST DÉJÀ LONG POUR UN BALLON EN MAIN. Un ouvreur qui
 * reçoit décide en un temps ; ce qu’on lui laisse ici, c’est le temps de LIRE
 * quatre options, pas de calculer.
 */
export const DELAI_BALLON = 6;

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
 * Le repos avant une carte de BALLON, en secondes simulées.
 *
 * ⚠️ SIX, ET PAS QUATRE-VINGT-QUINZE. Demande explicite : « dès que notre
 * joueur va ou touche le ballon, on a le choix de l’action ». Un ballon touché
 * est LE moment où l’on veut décider — l’espacement de 95 secondes, qui évite
 * qu’un plaquage ou un regroupement ne devienne un menu, n’a aucune raison de
 * s’appliquer là.
 *
 * ⚠️ MAIS PAS ZÉRO NON PLUS, et voici pourquoi : une réception et la
 * possession qui suit sont DEUX moments (`reception` puis `ballon`) séparés
 * d’une seconde ou deux. À zéro, un seul ballon touché ouvrirait deux cartes
 * coup sur coup — la seconde annulant la première, qu’on venait à peine de
 * jouer. Six secondes simulées, c’est le temps d’un ballon.
 */
export const REPOS_BALLON = 6;

/**
 * Le repos avant une carte « tu es dans l’espace », en secondes simulées.
 *
 * ⚠️ TROIS, ET PAS SIX, PARCE QUE L’ÉCHAPPÉE N’EN DURE QUE SEPT. Mesuré : la
 * carte de l’espace **ne s’ouvrait jamais** — zéro sur vingt matchs. La cause
 * est arithmétique : une percée se joue depuis une carte de ballon, donc le
 * repos de six secondes vient d’être remis à zéro, et l’échappée est finie
 * avant qu’il ne s’écoule. Le moment existait, le geste existait, et la
 * question ne se posait jamais.
 *
 * ⚠️ ET ÇA RESTE UN REPOS, PAS ZÉRO : sans lui, une échappée de sept secondes
 * rouvrirait une carte à chaque image tant qu’on choisit « sprint ».
 */
export const REPOS_ESPACE = 3;

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
   * Le ballon est DANS les mains ou EN VOL vers elles.
   *
   * ⚠️ CE N’EST PAS `moment === 'reception'`. Ce moment-là couvre aussi « je
   * suis le prochain de la combinaison », qui arrive à chaque phase et ne se
   * concrétise presque jamais : ouvrir une carte dessus donnait 61 cartes de
   * réception pour 3 ballons réellement joués.
   */
  balleEnMain: boolean;
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
  espace: { cle: 'ml.dec.espace', emoji: '💨' },
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
// ⚠️ LES GESTES DE POSTE SONT EN TÊTE DE LEUR SITUATION, et c’est voulu : ils
// ne sortent que pour celui qui peut les jouer (`DefinitionAction.pour`), donc
// ils ne prennent jamais la place d’une option à quelqu’un d’autre. Un arrière
// doit voir son 50/22 en premier quand il est dans son camp — c’est le geste
// qui définit son poste, pas une variante de la passe.
const PREFERENCES: Record<TypeMoment, ActionJoueur[]> = {
  // ⚠️ LA PASSE D’ABORD, TOUJOURS. Première version : les gestes de poste en
  // tête « parce qu’ils définissent le poste ». Mesuré, ils occupaient les
  // quatre emplacements et **la passe n’était plus jamais proposée** — le
  // geste le plus fondamental du rugby, chassé par des coups spéciaux. Les
  // deux passes ouvrent donc toutes les cartes ; les gestes de poste prennent
  // le troisième et le quatrième, et comme ils sont filtrés par `pour`, un
  // avant y voit sa percussion là où un arrière y voit son 50/22.
  ballon: [
    'passeGauche', 'passeDroite',
    'percee', 'percussion', 'cinquanteVingtDeux', 'chandelle',
    'plongeon', 'chipEtSuivre',
    'crochet', 'offload', 'raffut', 'pied', 'sprint', 'passe',
  ],
  reception: ['percee', 'percussion', 'offload', 'crochet', 'raffut', 'sprint', 'appel', 'soutien'],
  libre: ['sprint', 'appel', 'soutien', 'plaquage'],
  defense: ['interception', 'plaquage', 'monter', 'grattage'],
  // ⚠️ LE RUCK SE JOUE DES DEUX CÔTÉS, et la liste doit le porter : en défense
  // on gratte et on plaque, en attaque le 9 protège sa sortie. Avec la seule
  // chenille, une carte de ruck offensive n’aurait eu QU’UNE option — et
  // `MIN_OPTIONS` l’aurait refusée sans rien dire, ce qui revenait à réécrire
  // le moment pour rien.
  ruck: ['chenille', 'contreRuck', 'grattage', 'plaquage', 'monter', 'appel', 'soutien'],
  // ⚠️ DANS L’ESPACE, ON NE PROPOSE PLUS DE PERCER : c’est fait. La question
  // devient « comment je conclus ? » — plonger si la ligne est là, chiper
  // par-dessus le dernier défenseur, ou servir le soutien qui suit.
  espace: ['plongeon', 'chipEtSuivre', 'passeGauche', 'passeDroite', 'offload', 'sprint'],
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

  // ⚠️ LE MOMENT SE LIT AVANT LE REPOS, et l’ordre compte : c’est la NATURE du
  // moment qui décide du repos à appliquer. Un ballon dans les mains ouvre une
  // carte à tous les coups ; un plaquage ou un regroupement, non — sinon le
  // match redevient le menu permanent qu’on avait mesuré à 114 sollicitations.
  const moment = momentDuJoueur(e, p);
  if (!moment) return null;
  // ⚠️ « VA AU BALLON » VEUT DIRE QUE LE BALLON VIENT VRAIMENT, pas qu’il
  // pourrait venir. Le moment `reception` couvre DEUX situations très
  // différentes : le ballon est en l’air pour moi (`e.vol.receveur`), ou je suis
  // simplement le prochain maillon de la combinaison — ce qui arrive à chaque
  // phase et ne se concrétise presque jamais. Mesuré en ouvrant une carte sur
  // les deux : **61 cartes de réception pour 3 ballons réellement joués**, et
  // un match qui passait de 5,7 à 12,8 minutes. On ne coupe donc le jeu que
  // quand le ballon est DANS les mains ou EN VOL vers elles.
  //
  // ⚠️ LE MOMENT, LUI, NE CHANGE PAS : être le prochain de la chaîne déclenche
  // toujours le ralenti (`moments.ts`) et permet toujours d’armer un crochet.
  // C’est la CARTE qu’on réserve au vrai ballon, pas le ralenti.
  // ⚠️ ET LE 9 À SON PROPRE RUCK COMPTE COMME UN BALLON EN MAIN. Il l'a à ses
  // pieds, il va le ramasser : c'est « va au ballon » au sens le plus littéral.
  // Sans cette ligne, sa carte tombait sous le repos de 95 secondes des
  // carrefours — un repos que les cartes de ballon remettent à zéro en
  // permanence, si bien que la chenille sortait UNE fois tous les trois matchs.
  const balleEnMain = moment.type === 'ballon' || moment.type === 'espace'
    || (moment.type === 'ruck' && e.possession === p.cote);
  const repos = moment.type === 'espace' ? REPOS_ESPACE
    : balleEnMain ? REPOS_BALLON : REPOS_DECISION;
  if (depuis < repos) return null;

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

  return { moment: moment.type, balleEnMain, ...SITUATIONS[moment.type], options };
}

/**
 * ⚠️ COMBIEN DE TEMPS ON A POUR CHOISIR — UNE SEULE DÉFINITION.
 *
 * Trois délais coexistent (carrefour, ballon, enchaînement) et deux lecteurs
 * en ont besoin : l’écran, qui arme le compte à rebours, et le banc d’essai,
 * qui calcule la durée d’un match. Recopiée, la règle diverge — et le banc se
 * met à mesurer un jeu qui n’existe pas.
 */
export function delaiDeCarte(d: Decision): number {
  if (d.enchaine) return DELAI_COMBO;
  return d.balleEnMain ? DELAI_BALLON : DELAI_DECISION;
}
