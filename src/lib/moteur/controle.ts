// 🎮 LE JOUEUR PREND LA MAIN SUR SON PION
//
// Demande explicite : « en match, j'aimerais qu'on puisse avoir l'option de
// contrôler notre joueur comme dans un jeu — plaquage, sprint, passe,
// grattages, etc. »
//
// ═══ CE QUI A ÉTÉ TRANCHÉ AVANT D'ÉCRIRE UNE LIGNE ═══════════════════════════
//
// 1. **ON NE PILOTE PAS AU JOYSTICK.** Le moteur déplace trente pions par
//    inertie, sept fois par seconde, et c'est ce qui rend le direct crédible.
//    Poser deux flèches dessus donnerait un pion qui glisse à côté du rugby des
//    vingt-neuf autres. Le joueur donne donc des INTENTIONS de rugbyman —
//    « je plaque », « je gratte », « je réclame le ballon » — et le moteur les
//    joue avec ses propres règles.
// 2. **UNE INTENTION EST ARMÉE, PAS INSTANTANÉE.** « Je plaque » ne veut rien
//    dire à l'instant où on clique : le porteur est à quinze mètres. L'ordre
//    reste donc valable quelques secondes, le temps que la situation se
//    présente — puis il expire, comme un joueur qui a lu la mauvaise action.
// 3. **UN SEUL ORDRE À LA FOIS.** Le slot est unique (`e.intention`) : on ne
//    sprinte pas en grattant. C'est ce qui rend la barre lisible, et ce qui
//    empêche d'empiler les bonus.
// 4. **ÇA COÛTE.** Chaque geste prend de l'endurance, et un geste raté coûte
//    plus cher qu'il ne rapporte (un plaquage manqué laisse un trou, un
//    grattage sur un ballon protégé donne une pénalité). Sans risque, on
//    cliquerait en boucle.
//
// ⚠️ CE FICHIER NE CONNAÎT PAS `moteur.ts` — c'est l'inverse. Il déclare, il
// vérifie ce qui est possible, il pose l'intention ; le moteur la consomme au
// bon endroit de sa boucle (contact, ruck, choix de combinaison).

import { calmerLeJeu, frapper, monPion, provoquer } from './bagarre';
import type { Pion } from './entites';
import type { ActionJoueur, EtatMatch } from './etat';
import { surLeTerrain } from './tactique';
import {
  LARGEUR, LIGNE_A, LIGNE_B, adverse, dansSes22, dansSonCamp, distance2,
} from './terrain';

export type FamilleAction = 'ballon' | 'attaque' | 'defense' | 'discipline';

export interface DefinitionAction {
  id: ActionJoueur;
  emoji: string;
  /** Clé i18n du libellé court affiché sur le bouton. */
  cle: string;
  /** Clé i18n de l'explication, au survol : ce que ça fait, ce que ça risque. */
  aide: string;
  famille: FamilleAction;
  /** Secondes simulées pendant lesquelles l'ordre reste armé. */
  duree: number;
  /**
   * Secondes simulées avant de pouvoir redemander quoi que ce soit.
   *
   * ⚠️ C'EST LE GARDE-FOU ANTI-MARTÈLEMENT, et il est chiffré (voir la note de
   * `IntentionJoueur` dans `etat.ts`). Il est TOUJOURS ≥ `duree` : un ordre qui
   * pourrait être relancé avant d'avoir expiré ne serait pas une recharge.
   */
  recharge: number;
  /** Endurance dépensée à la demande. */
  cout: number;
  /**
   * ⚠️ QUI PEUT LA JOUER. Un 50/22 n’est pas un geste de pilier, une chenille
   * n'est pas un geste d'ailier.
   *
   * ⚠️ ET C’EST UNE DONNÉE, PAS UN `if` DANS `actionsDisponibles`. Le filtre
   * de poste et le filtre de SITUATION sont deux questions différentes :
   * mélangées dans le même `switch`, on ne sait plus laquelle refuse une
   * action qu'on s'attendait à voir. Absente, l'action est ouverte à tous.
   */
  pour?: (p: Pion) => boolean;
}

/**
 * Qui tape : les lignes arrière, et seulement elles.
 *
 * ⚠️ LE `!p.avant` N'EST PAS DÉCORATIF. Un pilier ne tape pas de chandelle et
 * ne tente pas de 50/22 — et sans ce filtre, un talonneur bien noté au pied
 * les verrait proposés, ce qui est exactement le genre de détail qui fait
 * dire d'un jeu de rugby qu'il n'a pas été écrit par quelqu'un qui en joue.
 */
const BOTTEUR = (p: Pion) => !p.avant && p.pied >= 50;

// ⚠️ L'ORDRE DE CE TABLEAU EST L'ORDRE DES RACCOURCIS CLAVIER (1, 2, 3…) et
// celui des boutons à l'écran. Le changer change les réflexes du joueur.
export const ACTIONS: DefinitionAction[] = [
  // ── Ballon en main ───────────────────────────────────────────────────────
  { id: 'sprint', emoji: '🏃', cle: 'ml.act.sprint', aide: 'ml.act.sprint.aide', famille: 'ballon', duree: 3.2, recharge: 6, cout: 3 },
  // ⚠️ FENÊTRE ALLONGÉE DE 2,6 À 3,4 s. Un crochet ne « marche » que s'il est
  // encore armé À L'INSTANT DU CONTACT : armé trop tôt, il expirait avant le
  // plaqueur et le joueur voyait son geste ne rien faire — d'où « raffut,
  // crochet qui marche vraiment ». Huit dixièmes de plus, c'est la différence
  // entre anticiper le contact et devoir le deviner à la frame près.
  { id: 'crochet', emoji: '↩️', cle: 'ml.act.crochet', aide: 'ml.act.crochet.aide', famille: 'ballon', duree: 3.4, recharge: 5, cout: 3 },
  { id: 'raffut', emoji: '💪', cle: 'ml.act.raffut', aide: 'ml.act.raffut.aide', famille: 'ballon', duree: 3.4, recharge: 5, cout: 3 },
  { id: 'passe', emoji: '🤝', cle: 'ml.act.passe', aide: 'ml.act.passe.aide', famille: 'ballon', duree: 1.4, recharge: 2, cout: 0 },
  // ⚠️ LA PASSE A UN CÔTÉ. Retour de jeu : « en mode A ou E pour faire la passe
  // droite ou gauche ». Avec un seul bouton, c'est le moteur qui choisissait le
  // receveur — on subissait sa lecture au lieu de jouer la sienne, et l'aile
  // fermée ne recevait jamais rien. Ces deux-là ne remplacent pas `passe`
  // (l'action contextuelle du gros bouton), elles la précisent.
  { id: 'passeGauche', emoji: '⬅️', cle: 'ml.act.passeGauche', aide: 'ml.act.passeGauche.aide', famille: 'ballon', duree: 1.4, recharge: 2, cout: 0 },
  { id: 'passeDroite', emoji: '➡️', cle: 'ml.act.passeDroite', aide: 'ml.act.passeDroite.aide', famille: 'ballon', duree: 1.4, recharge: 2, cout: 0 },
  { id: 'pied', emoji: '🦶', cle: 'ml.act.pied', aide: 'ml.act.pied.aide', famille: 'ballon', duree: 1.4, recharge: 3, cout: 1 },
  // ── Les gestes de poste ─────────────────────────────────────────────────
  // ⚠️ RECHARGES LONGUES, ET C’EST LEUR CONTREPARTIE. Ce sont des coups
  // spéciaux : un 50/22 tenté à chaque ballon, ce n’est plus un pari, c’est
  // une tactique de base — et le banc d’essai relèverait six 50/22 par match
  // là où le rugby professionnel en compte un à trois. Même logique qu'au
  // grattage, qui a coûté quinze secondes pour la même raison.
  { id: 'cinquanteVingtDeux', emoji: '🎯', cle: 'ml.act.cinquanteVingtDeux', aide: 'ml.act.cinquanteVingtDeux.aide', famille: 'ballon', duree: 1.4, recharge: 40, cout: 2, pour: BOTTEUR },
  { id: 'chandelle', emoji: '☂️', cle: 'ml.act.chandelle', aide: 'ml.act.chandelle.aide', famille: 'ballon', duree: 1.4, recharge: 14, cout: 1, pour: BOTTEUR },
  { id: 'percussion', emoji: '🐂', cle: 'ml.act.percussion', aide: 'ml.act.percussion.aide', famille: 'ballon', duree: 3.4, recharge: 8, cout: 4, pour: (p) => p.avant },
  { id: 'offload', emoji: '🤲', cle: 'ml.act.offload', aide: 'ml.act.offload.aide', famille: 'ballon', duree: 3.4, recharge: 12, cout: 2 },
  // La chenille appartient au 9, et à lui seul : c'est lui qui protège la
  // sortie de ruck derrière le paquet, personne d’autre ne se met là.
  // ── Les gestes qui mènent quelque part ──────────────────────────────────
  // ⚠️ CEUX-LÀ NE CHERCHENT PAS DES MÈTRES, ILS CHERCHENT LA LIGNE. Retour de
  // jeu : « nos actions n'ont aucun impact ; fais qu'un raffut, un sprint ou
  // un prendre-l'espace mène à un essai si réussi ». Chacun ouvre une
  // ÉCHAPPÉE (`EtatMatch.echappee`) ou la conclut — et l'échappée, elle, court
  // à la ligne d’en-but.
  //
  // ⚠️ RECHARGES TRÈS LONGUES. On ne prend pas l'intervalle huit fois par
  // match : ce sont des paris, pas des tactiques. Sans ça le banc d’essai
  // relèverait dix percées par match là où le rugby professionnel en compte
  // deux à quatre pour QUINZE joueurs.
  { id: 'percee', emoji: '🕳️', cle: 'ml.act.percee', aide: 'ml.act.percee.aide', famille: 'ballon', duree: 3.4, recharge: 52, cout: 5 },
  { id: 'chipEtSuivre', emoji: '🪁', cle: 'ml.act.chipEtSuivre', aide: 'ml.act.chipEtSuivre.aide', famille: 'ballon', duree: 1.4, recharge: 46, cout: 3, pour: (p) => !p.avant && p.pied >= 42 },
  { id: 'plongeon', emoji: '🤿', cle: 'ml.act.plongeon', aide: 'ml.act.plongeon.aide', famille: 'ballon', duree: 2, recharge: 10, cout: 3 },
  { id: 'interception', emoji: '🦅', cle: 'ml.act.interception', aide: 'ml.act.interception.aide', famille: 'defense', duree: 2.2, recharge: 50, cout: 3 },
  { id: 'contreRuck', emoji: '🐘', cle: 'ml.act.contreRuck', aide: 'ml.act.contreRuck.aide', famille: 'defense', duree: 5, recharge: 24, cout: 5, pour: (p) => p.avant },
  { id: 'chenille', emoji: '🐛', cle: 'ml.act.chenille', aide: 'ml.act.chenille.aide', famille: 'attaque', duree: 4, recharge: 26, cout: 3, pour: (p) => p.numero === 9 },
  // ── Son équipe attaque, il n'a pas le ballon ─────────────────────────────
  { id: 'appel', emoji: '🙋', cle: 'ml.act.appel', aide: 'ml.act.appel.aide', famille: 'attaque', duree: 11, recharge: 14, cout: 0 },
  { id: 'soutien', emoji: '🤸', cle: 'ml.act.soutien', aide: 'ml.act.soutien.aide', famille: 'attaque', duree: 8, recharge: 9, cout: 2 },
  // ── Son équipe défend ───────────────────────────────────────────────────
  { id: 'plaquage', emoji: '💥', cle: 'ml.act.plaquage', aide: 'ml.act.plaquage.aide', famille: 'defense', duree: 4, recharge: 6, cout: 3 },
  { id: 'monter', emoji: '⬆️', cle: 'ml.act.monter', aide: 'ml.act.monter.aide', famille: 'defense', duree: 6, recharge: 7, cout: 2 },
  // ⚠️ Gratter est le geste le plus cher du lot : on plonge, on se relève, on
  // court se replacer. Quinze secondes, c'est ce qui l'empêche d'être joué à
  // TOUS les regroupements — mesuré sans recharge : 14 turnovers par match.
  { id: 'grattage', emoji: '🪝', cle: 'ml.act.grattage', aide: 'ml.act.grattage.aide', famille: 'defense', duree: 8, recharge: 15, cout: 4 },
  // ── Discipline : à tout moment, même ballon mort ─────────────────────────
  // ⚠️ QUARANTE-CINQ SECONDES. On ne chambre pas quelqu'un toutes les six secondes :
  // c'est ce qui transformait le match en seize bagarres.
  { id: 'provoquer', emoji: '🗯️', cle: 'ml.act.provoquer', aide: 'ml.act.provoquer.aide', famille: 'discipline', duree: 6, recharge: 45, cout: 0 },
  { id: 'frapper', emoji: '🥊', cle: 'ml.act.frapper', aide: 'ml.act.frapper.aide', famille: 'discipline', duree: 6, recharge: 45, cout: 2 },
  { id: 'calmer', emoji: '✋', cle: 'ml.act.calmer', aide: 'ml.act.calmer.aide', famille: 'discipline', duree: 6, recharge: 20, cout: 0 },
];

export const ACTION_PAR_ID = new Map(ACTIONS.map((a) => [a.id, a]));

/** Le ballon est-il vivant ? (hors mêlée, touche, tir au but, mi-temps…) */
function ballonVivant(e: EtatMatch): boolean {
  return e.phase === 'jeuCourant' || e.phase === 'ruck' || e.phase === 'maul'
    || e.phase === 'ballonEnLAir';
}

/**
 * Les actions proposées ICI ET MAINTENANT.
 *
 * ⚠️ ON NE GRISE PAS, ON RETIRE. Une barre de treize boutons dont onze sont
 * éteints, sur un téléphone de 375 px, c'est illisible — et ça oblige à
 * chercher lequel est actif. La barre ne montre que ce qui est jouable : trois
 * à cinq boutons, qui changent avec la phase.
 */
export function actionsDisponibles(e: EtatMatch): DefinitionAction[] {
  if (e.fini || e.bagarre) return [];
  const p = monPion(e);
  if (!p) return [];

  const jeVaisAuBallon = e.porteur === p;
  // ⚠️ ON PEUT S'ARMER AVANT QUE LE BALLON N'ARRIVE, et c'est une correction de
  // fond. Un crochet ne « marche » que s'il est encore armé à l'instant du
  // contact : tant qu'il fallait AVOIR le ballon pour le demander, il ne
  // restait qu'une fraction de seconde entre la réception et le plaqueur, et le
  // geste ne servait jamais. Un rugbyman, lui, sait ce qu'il va faire avant que
  // la passe ne parte. Les gestes de course s'arment donc dès que le ballon
  // vient sur soi ; la passe et le coup de pied, non — on ne donne pas un
  // ballon qu'on n'a pas.
  const suivantDeLaChaine = e.lancement
    && e.possession === p.cote
    && e.lancement.chaine[e.lancement.index + 1] === p;
  const ballonArrive = jeVaisAuBallon || e.vol?.receveur === p || !!suivantDeLaChaine;
  const monEquipeAttaque = e.possession === p.cote;
  const vivant = ballonVivant(e);
  const adversairePres = !!surLeTerrain(e, adverse(p.cote))
    .find((q) => q.sanction <= 0 && distance2(q.pos, p.pos) < 26 * 26);

  // ⚠️ ON NE PROPOSE PAS DE PERCER QUAND ON EST DÉJÀ PASSÉ. Pendant une
  // échappée, l’intervalle est derrière soi : la carte de l’espace propose
  // autre chose (plonger, chiper, servir le soutien).
  const dejaDansLEspace = e.echappee?.pion === p;

  /** Dans son camp, hors de ses 22 : la zone du 50/22. */
  const zone5022 = dansSonCamp(p.pos, p.cote) && !dansSes22(p.pos, p.cote);

  return ACTIONS.filter((a) => {
    if ((e.recharges[a.id] ?? 0) > 0) return false;
    // ⚠️ LE POSTE D’ABORD, LA SITUATION ENSUITE. Deux questions, deux filtres.
    if (a.pour && !a.pour(p)) return false;

    // ── Les gestes de poste, chacun avec sa fenêtre ─────────────────────
    // ⚠️ UN 50/22 SE TAPE DE SON PROPRE CAMP, hors de ses 22 : c'est la règle,
    // et c'est aussi ce qui en fait un pari — de plus loin, on dégage ; de
    // plus près, la touche adverse est hors de portée.
    if (a.id === 'cinquanteVingtDeux') return jeVaisAuBallon && zone5022;
    if (a.id === 'chandelle') return jeVaisAuBallon;
    // Foncer et donner après contact s’ARMENT avant de recevoir : un rugbyman
    // sait ce qu’il va faire avant que la passe ne parte (même raison que le
    // crochet et le raffut, voir plus haut).
    if (a.id === 'percussion' || a.id === 'offload') return ballonArrive;
    // La chenille se joue AU REGROUPEMENT, ballon à nous : le 9 est derrière
    // le paquet, il protège la sortie. Nulle part ailleurs.
    if (a.id === 'chenille') return e.phase === 'ruck' && monEquipeAttaque;

    // ── Les gestes qui mènent à la ligne ────────────────────────────────
    // ⚠️ PRENDRE L'ESPACE SUPPOSE QU'IL Y EN AIT. Le geste ne s'offre que
    // s'il reste un intervalle devant : proposé rideau fermé, c'est un bouton
    // qui ne peut que rater, et le joueur le lit comme un mensonge.
    // ⚠️ SEPT MÈTRES, PAS « UN INTERVALLE ». Premier réglage : `> 0`, soit
    // n’importe quel écart de plus de quatre mètres. Or le premier rideau se
    // place à ~4,5 m d’écart (`tactique.ts`) : la condition était donc vraie
    // en permanence. Mesuré : **13,7 percées proposées par match** et 7,5
    // échappées, là où le rugby professionnel compte deux à quatre
    // franchissements par ÉQUIPE. Sept mètres, c’est un vrai trou.
    if (a.id === 'percee') return ballonArrive && !dejaDansLEspace && intervalle(e, p) >= 7;
    // Le coup de pied par-dessus n'a de sens que sous PRESSION : sans personne
    // devant, on court, on ne tape pas. Et jamais dans ses 22 — rendre le
    // ballon à trente mètres de sa ligne n'est pas une option, c'est une faute.
    if (a.id === 'chipEtSuivre') {
      return jeVaisAuBallon && !dansSes22(p.pos, p.cote) && pressionDevant(e, p) < 13;
    }
    // ⚠️ PLONGER, ÇA NE SE FAIT QU'À PORTÉE DE LA LIGNE. Douze mètres, c'est
    // la distance d'un plongeon suivi d'une glissade — au-delà, ce n'est plus
    // un plongeon, c’est une course.
    if (a.id === 'plongeon') return jeVaisAuBallon && metresDeLaLigne(p) <= 12;
    // ⚠️ INTERCEPTER SUPPOSE UNE PASSE EN L'AIR, POUR EUX, ET À MA PORTÉE.
    // C'est le geste le plus rare du jeu : sans ces trois conditions, il serait
    // proposé à chaque ballon adverse et perdrait tout son sel.
    if (a.id === 'interception') {
      const v = e.vol;
      return !!v && !!v.receveur && v.receveur.cote !== p.cote
        && distance2(p.pos, v.receveur.pos) < 12 * 12;
    }
    // La contre-poussée se joue au ruck qu’on DÉFEND : le paquet passe
    // par-dessus le ballon au sol. C’est le pendant collectif du grattage.
    if (a.id === 'contreRuck') {
      return (e.phase === 'ruck' || e.phase === 'maul') && !monEquipeAttaque
        && distance2(p.pos, e.ballon) < 8 * 8;
    }

    switch (a.famille) {
      case 'ballon':
        // Courir, crocheter, raffuter : dès que le ballon vient sur soi.
        if (a.id === 'sprint' || a.id === 'crochet' || a.id === 'raffut') {
          return ballonArrive;
        }
        if (!jeVaisAuBallon) return false;
        // On ne « passe » que s'il y a quelqu'un à qui donner.
        if (a.id === 'passe') return !!receveurPour(e, p);
        if (a.id === 'passeGauche') return !!receveurCote(e, p, -1);
        if (a.id === 'passeDroite') return !!receveurCote(e, p, 1);
        return true;
      case 'attaque':
        return vivant && monEquipeAttaque && !jeVaisAuBallon;
      case 'defense':
        if (!vivant || monEquipeAttaque) return false;
        // Gratter suppose un regroupement : au ruck, ou juste avant.
        if (a.id === 'grattage') return e.phase === 'ruck' || e.phase === 'jeuCourant';
        return true;
      case 'discipline':
        return adversairePres;
    }
  });
}

/**
 * Le partenaire à qui l'on peut donner le ballon : le suivant de la
 * combinaison s'il y en a un, sinon le soutien le plus proche EN ARRIÈRE
 * (règle du rugby : la passe ne part jamais vers l'avant).
 */
export function receveurPour(e: EtatMatch, p: Pion): Pion | undefined {
  const l = e.lancement;
  const suivant = l && l.index + 1 < l.chaine.length ? l.chaine[l.index + 1] : null;
  if (suivant && suivant.surLeTerrain && suivant.sanction <= 0) return suivant;
  const s = p.cote === 'A' ? 1 : -1;
  return surLeTerrain(e, p.cote)
    .filter((q) => q !== p && q.sanction <= 0 && (q.pos.x - p.pos.x) * s <= 0.6)
    .sort((a, b) => distance2(a.pos, p.pos) - distance2(b.pos, p.pos))[0];
}

/**
 * Le partenaire vers LA GAUCHE ou LA DROITE DE L'ÉCRAN, en respectant la règle
 * du rugby : la passe ne part jamais vers l'avant.
 *
 * ⚠️ `cote` EST DONNÉ EN REPÈRE D'ÉCRAN (−1 = vers la gauche de l'image,
 * +1 = vers la droite), et il est retourné pour le camp B. Sans ça, « passe à
 * gauche » enverrait le ballon à droite un match sur deux — puisque le camp B
 * attaque dans l'autre sens et que la caméra le retourne (`moteur/camera.ts`).
 * Le joueur, lui, voit toujours son écran : c'est cette gauche-là qui compte.
 */
export function receveurCote(e: EtatMatch, p: Pion, cote: -1 | 1 | number): Pion | undefined {
  const s = p.cote === 'A' ? 1 : -1;
  // Le camp A attaque vers les X croissants ; sa gauche d'écran est donc les Y
  // décroissants. Pour le camp B, tout est retourné.
  const versY = cote * s;
  return surLeTerrain(e, p.cote)
    .filter((q) => q !== p && q.sanction <= 0
      // Jamais en avant : la règle, avant tout le reste.
      && (q.pos.x - p.pos.x) * s <= 0.6
      // Et bien du bon côté, avec une marge d'un mètre pour ne pas exiger
      // l'alignement parfait.
      && (q.pos.y - p.pos.y) * versY > 1)
    .sort((a, b) => distance2(a.pos, p.pos) - distance2(b.pos, p.pos))[0];
}

/**
 * Le joueur clique (ou tape son raccourci).
 *
 * Les gestes de discipline sont RÉSOLUS TOUT DE SUITE — chambrer ou frapper
 * n'attend pas une occasion, ça arrive à l'instant même. Les autres arment
 * l'intention, que le moteur consommera quand la situation se présentera.
 */
export function demanderAction(e: EtatMatch, id: ActionJoueur): boolean {
  if (e.fini || e.bagarre) return false;
  const def = ACTION_PAR_ID.get(id);
  const p = monPion(e);
  if (!def || !p) return false;
  if (!actionsDisponibles(e).some((a) => a.id === id)) return false;

  p.endurance = Math.max(0, p.endurance - def.cout);
  e.intention = { type: id, restant: def.duree };
  e.recharges[id] = def.recharge;

  if (id === 'provoquer') provoquer(e);
  else if (id === 'frapper') frapper(e);
  else if (id === 'calmer') calmerLeJeu(e);
  return true;
}

/** Annule l'ordre en cours (le joueur change d'avis). */
export function annulerAction(e: EtatMatch): void {
  e.intention = null;
}

// ---------------------------------------------------------------------------
// LE PILOTAGE DIRECT
// ---------------------------------------------------------------------------

/**
 * ⚠️ « FAIS CE QU'IL FAUT FAIRE » — la barre d'espace, le bouton A.
 *
 * On ne demande pas à un joueur de se rappeler que J plaque et P passe pendant
 * qu'un ailier lui arrive dessus : la touche principale joue l'action évidente
 * de la situation. Les touches dédiées restent là pour qui veut la précision —
 * décider de gratter plutôt que de plaquer, par exemple.
 */
export function actionPrincipale(e: EtatMatch): ActionJoueur | null {
  const dispo = actionsDisponibles(e);
  if (!dispo.length) return null;
  const a = (id: ActionJoueur) => (dispo.some((d) => d.id === id) ? id : null);
  const p = monPion(e);
  if (!p) return null;
  // Ballon en main : on donne. C'est le geste le plus fréquent du rugby.
  if (e.porteur === p) return a('passe') ?? a('sprint');
  // En défense : gratter au sol si le regroupement est formé, plaquer sinon.
  if (e.possession !== p.cote) {
    if (e.phase === 'ruck') return a('grattage') ?? a('plaquage');
    return a('plaquage') ?? a('monter');
  }
  // Son équipe attaque : on réclame le ballon.
  return a('appel') ?? a('soutien');
}

/** L'ordre en cours est-il bien celui-là ? (lu par le moteur, à chaque tick.) */
export function intentionEst(e: EtatMatch, ...types: ActionJoueur[]): boolean {
  return e.controle && !!e.intention && types.includes(e.intention.type);
}

/** Consomme l'ordre : il a servi, il ne doit pas resservir. */
export function consommerIntention(e: EtatMatch): void {
  e.intention = null;
}

/**
 * ⚠️ Y A-T-IL UN INTERVALLE DEVANT ? — en mètres de large, 0 s’il n’y en a pas.
 *
 * On regarde les défenseurs encore debout DEVANT le porteur, à moins de vingt
 * mètres, et on mesure l’écart latéral le plus large PRÈS DE SOI — le segment
 * dans lequel on court, et ses deux voisins.
 *
 * ⚠️ « PRÈS DE SOI », ET C’EST TOUT L’ENJEU. Première version : le plus grand
 * écart du rideau, bords de touche compris. Un pilier au ras du ruck se voyait
 * donc offrir « prendre l’espace » parce qu’il restait vingt mètres de libre à
 * l’autre bout du terrain — mesuré, **13,7 percées proposées par match** et
 * 56 % de réussite. Un trou qu’on ne peut pas atteindre n’est pas un trou.
 *
 * ⚠️ ELLE VIT ICI PARCE QUE DEUX LECTEURS EN ONT BESOIN, de part et d’autre de
 * la frontière : `actionsDisponibles` pour décider si le geste s’offre, et
 * `enjeuDe` (dans `moteur.ts`) pour en calculer la chance. Recopiée, on
 * proposerait un geste à 0 % ou on en cacherait un à 70 %.
 */
export function intervalle(e: EtatMatch, p: Pion): number {
  const s = p.cote === 'A' ? 1 : -1;
  const devant = surLeTerrain(e, adverse(p.cote))
    .filter((q) => q.sanction <= 0 && q.battu <= 0
      && (q.pos.x - p.pos.x) * s > -1 && (q.pos.x - p.pos.x) * s < 20)
    .map((q) => q.pos.y)
    .sort((a, b) => a - b);
  // Personne devant : ce n’est pas un intervalle, c’est un boulevard.
  if (!devant.length) return LARGEUR;

  // ⚠️ LES DEUX TOUCHES SONT DES BORNES COMME LES AUTRES : déborder par
  // l’extérieur est un intervalle, simplement fermé d’un seul côté.
  const bornes = [0, ...devant, LARGEUR];
  // Le segment dans lequel JE cours, et ses deux voisins : on peut se
  // déporter d’une foulée, pas de vingt mètres.
  let k = 0;
  while (k < bornes.length - 2 && bornes[k + 1] < p.pos.y) k++;
  let large = 0;
  for (let n = Math.max(0, k - 1); n <= Math.min(bornes.length - 2, k + 1); n++) {
    large = Math.max(large, bornes[n + 1] - bornes[n]);
  }
  // Sous quatre mètres, deux défenseurs se touchent presque : il n’y a rien à
  // prendre, et le geste ne doit pas être proposé.
  return large < 4 ? 0 : large;
}
/** La distance au défenseur debout le plus proche DEVANT soi, en mètres. */
export function pressionDevant(e: EtatMatch, p: Pion): number {
  const s = p.cote === 'A' ? 1 : -1;
  let d2 = Infinity;
  for (const q of surLeTerrain(e, adverse(p.cote))) {
    if (q.sanction > 0 || q.battu > 0) continue;
    if ((q.pos.x - p.pos.x) * s < -1) continue;
    d2 = Math.min(d2, distance2(q.pos, p.pos));
  }
  return d2 === Infinity ? 99 : Math.sqrt(d2);
}

/** Combien de mètres il reste jusqu’à la ligne d’essai adverse. */
export function metresDeLaLigne(p: Pion): number {
  return p.cote === 'A' ? LIGNE_B - p.pos.x : p.pos.x - LIGNE_A;
}
