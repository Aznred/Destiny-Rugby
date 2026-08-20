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
import { adverse, distance2 } from './terrain';

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
}

// ⚠️ L'ORDRE DE CE TABLEAU EST L'ORDRE DES RACCOURCIS CLAVIER (1, 2, 3…) et
// celui des boutons à l'écran. Le changer change les réflexes du joueur.
export const ACTIONS: DefinitionAction[] = [
  // ── Ballon en main ───────────────────────────────────────────────────────
  { id: 'sprint', emoji: '🏃', cle: 'ml.act.sprint', aide: 'ml.act.sprint.aide', famille: 'ballon', duree: 3.2, recharge: 6, cout: 3 },
  { id: 'crochet', emoji: '↩️', cle: 'ml.act.crochet', aide: 'ml.act.crochet.aide', famille: 'ballon', duree: 2.6, recharge: 5, cout: 3 },
  { id: 'raffut', emoji: '💪', cle: 'ml.act.raffut', aide: 'ml.act.raffut.aide', famille: 'ballon', duree: 2.6, recharge: 5, cout: 3 },
  { id: 'passe', emoji: '🤝', cle: 'ml.act.passe', aide: 'ml.act.passe.aide', famille: 'ballon', duree: 1.4, recharge: 2, cout: 0 },
  { id: 'pied', emoji: '🦶', cle: 'ml.act.pied', aide: 'ml.act.pied.aide', famille: 'ballon', duree: 1.4, recharge: 3, cout: 1 },
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
  const monEquipeAttaque = e.possession === p.cote;
  const vivant = ballonVivant(e);
  const adversairePres = !!surLeTerrain(e, adverse(p.cote))
    .find((q) => q.sanction <= 0 && distance2(q.pos, p.pos) < 26 * 26);

  return ACTIONS.filter((a) => {
    if ((e.recharges[a.id] ?? 0) > 0) return false;
    switch (a.famille) {
      case 'ballon':
        if (!jeVaisAuBallon) return false;
        // On ne « passe » que s'il y a quelqu'un à qui donner.
        if (a.id === 'passe') return !!receveurPour(e, p);
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
 * 🕹️ POUSSER SON PION. Appelée à CHAQUE IMAGE par l'écran, avec ce que rendent
 * le stick, les touches ou le doigt.
 *
 * ⚠️ ON NE POSE PAS UNE POSITION, ON POSE UNE DIRECTION. Le moteur garde la
 * main sur la façon dont le pion s'y rend : accélération bornée, vitesse
 * maximale du poste, endurance qui se vide. Un pion piloté reste donc un
 * rugbyman — pas un curseur qui glisse sur le terrain.
 */
export function piloterDirection(e: EtatMatch, dx: number, dy: number, sprint: boolean): void {
  if (!e.controle) { e.direction = null; e.sprint = false; return; }
  const norme = Math.hypot(dx, dy);
  // En deçà, c'est de la dérive de stick ou un doigt qui tremble.
  e.direction = norme < 0.2 ? null : { x: dx / norme, y: dy / norme };
  e.sprint = sprint;
}

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
