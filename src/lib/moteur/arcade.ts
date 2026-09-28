import type { EtatMatch, Phase } from './etat.js';
import type { Pion } from './entites.js';
import { LARGEUR, LONGUEUR, borner, distance2, sens, type Cote, type Vec } from './terrain.js';

/**
 * Commandes logiques du match arcade. Le gameplay ne lit jamais une touche,
 * un bouton de manette ou un contact tactile directement.
 */
export const INPUT_ACTIONS = [
  'MOVE', 'SPRINT', 'ACTION_PRIMARY', 'ACTION_SECONDARY',
  'PASS_LEFT', 'PASS_RIGHT', 'KICK', 'SWITCH_PLAYER',
] as const;
export type InputActionArcade = typeof INPUT_ACTIONS[number];

export type EtatJoueurArcade =
  | 'IDLE' | 'RUNNING' | 'SPRINTING' | 'PASSING' | 'KICKING' | 'TACKLING'
  | 'TACKLED' | 'RUCKING' | 'JACKALING' | 'SCRUM' | 'LINEOUT' | 'STUNNED';

export type EtatGlobalArcade =
  | 'OPEN_PLAY' | 'RUCK' | 'SCRUM_SETUP' | 'SCRUM' | 'LINEOUT_SETUP'
  | 'LINEOUT' | 'PENALTY' | 'CONVERSION' | 'KICKOFF' | 'HALF_TIME' | 'FULL_TIME';

export interface EvenementInputArcade {
  sequence: number;
  action: Exclude<InputActionArcade, 'MOVE' | 'SPRINT'>;
  tempsClient: number;
  tempsServeurEstime: number;
  dureeMs?: number;
  direction?: { x: number; y: number };
  option?: 'court' | 'milieu' | 'long';
}

export interface TrameInputArcade {
  sequence: number;
  dx: number;
  dy: number;
  sprint: boolean;
  joueurId?: string;
  evenements: EvenementInputArcade[];
  tempsClient: number;
}

export const TOUCHES_ARCADE: Readonly<Record<string, InputActionArcade>> = {
  ShiftLeft: 'SPRINT', ShiftRight: 'SPRINT',
  KeyQ: 'PASS_LEFT', KeyE: 'PASS_RIGHT',
  Space: 'ACTION_PRIMARY', ControlLeft: 'ACTION_SECONDARY', ControlRight: 'ACTION_SECONDARY', KeyF: 'ACTION_SECONDARY',
  KeyC: 'KICK', Tab: 'SWITCH_PLAYER',
};

const TRANSITIONS: Readonly<Record<EtatJoueurArcade, readonly EtatJoueurArcade[]>> = {
  IDLE: ['RUNNING', 'SPRINTING', 'PASSING', 'KICKING', 'TACKLING', 'TACKLED', 'RUCKING', 'JACKALING', 'SCRUM', 'LINEOUT', 'STUNNED'],
  RUNNING: ['IDLE', 'SPRINTING', 'PASSING', 'KICKING', 'TACKLING', 'TACKLED', 'RUCKING', 'JACKALING', 'SCRUM', 'LINEOUT', 'STUNNED'],
  SPRINTING: ['IDLE', 'RUNNING', 'PASSING', 'KICKING', 'TACKLING', 'TACKLED', 'RUCKING', 'SCRUM', 'LINEOUT', 'STUNNED'],
  PASSING: ['IDLE', 'RUNNING', 'TACKLED', 'STUNNED'],
  KICKING: ['IDLE', 'RUNNING', 'TACKLED', 'STUNNED'],
  TACKLING: ['IDLE', 'RUNNING', 'RUCKING', 'STUNNED'],
  TACKLED: ['RUCKING', 'IDLE', 'STUNNED'],
  RUCKING: ['IDLE', 'RUNNING', 'JACKALING', 'STUNNED'],
  JACKALING: ['RUCKING', 'IDLE', 'STUNNED'],
  SCRUM: ['IDLE', 'RUNNING'],
  LINEOUT: ['IDLE', 'RUNNING'],
  STUNNED: ['IDLE', 'RUNNING', 'RUCKING'],
};

/** Une seule porte contrôle toutes les transitions des trente joueurs. */
export class MachineEtatsJoueurs {
  private readonly etats = new Map<string, EtatJoueurArcade>();

  lire(pionId: string): EtatJoueurArcade { return this.etats.get(pionId) ?? 'IDLE'; }

  transition(pionId: string, suivant: EtatJoueurArcade, force = false): boolean {
    const actuel = this.lire(pionId);
    if (actuel === suivant) return true;
    if (!force && !TRANSITIONS[actuel].includes(suivant)) return false;
    this.etats.set(pionId, suivant);
    return true;
  }

  synchroniser(match: EtatMatch): void {
    for (const pion of match.pions) {
      let suivant: EtatJoueurArcade = 'IDLE';
      if (!pion.surLeTerrain || pion.sanction > 0 || pion.battu > 1.2) suivant = 'STUNNED';
      else if (pion.corps) suivant = 'TACKLED';
      else if (match.phase === 'melee' && pion.avant) suivant = 'SCRUM';
      else if (match.phase === 'touche' && pion.avant) suivant = 'LINEOUT';
      else if (pion.role === 'ruck') suivant = 'RUCKING';
      else if (Math.hypot(pion.vitesse.x, pion.vitesse.y) > .8) suivant = pion.effort > 1.08 ? 'SPRINTING' : 'RUNNING';
      this.transition(pion.id, suivant, true);
    }
  }

  autorise(pionId: string, action: InputActionArcade): boolean {
    const etat = this.lire(pionId);
    if (etat === 'TACKLED' || etat === 'STUNNED') return false;
    if (etat === 'SCRUM' || etat === 'LINEOUT') {
      return action === 'ACTION_PRIMARY' || action === 'ACTION_SECONDARY';
    }
    if (etat === 'PASSING' || etat === 'KICKING' || etat === 'TACKLING') return action === 'MOVE';
    return true;
  }
}

export function etatGlobalArcade(phase: Phase, minuteur = 0): EtatGlobalArcade {
  switch (phase) {
    case 'ruck': case 'maul': return 'RUCK';
    case 'melee': return minuteur > 2.5 ? 'SCRUM_SETUP' : 'SCRUM';
    case 'touche': return minuteur > 2.5 ? 'LINEOUT_SETUP' : 'LINEOUT';
    case 'penalite': case 'tirAuBut': return 'PENALTY';
    case 'transformation': case 'apresEssai': return 'CONVERSION';
    case 'coupEnvoi': case 'renvoi22': return 'KICKOFF';
    case 'miTemps': return 'HALF_TIME';
    case 'fini': return 'FULL_TIME';
    default: return 'OPEN_PLAY';
  }
}

function directionNormalisee(x: number, y: number): Vec {
  const norme = Math.hypot(x, y);
  if (norme < .001) return { x: 0, y: 0 };
  return { x: x / Math.max(1, norme), y: y / Math.max(1, norme) };
}

/**
 * Gestionnaire multi-périphérique. Les méthodes physiques ne font que remplir
 * une trame logique ; le contrôleur de match consomme ensuite cette trame.
 */
export class InputManagerArcade {
  private touches = new Set<string>();
  private tactile: Vec = { x: 0, y: 0 };
  private sprintTactile = false;
  private sequence = 0;
  private file: EvenementInputArcade[] = [];
  private manetteAvant: boolean[] = [];
  private decalageServeur = 0;
  joueurId?: string;

  reglerDecalageServeur(ms: number): void {
    if (Number.isFinite(ms)) this.decalageServeur = this.decalageServeur * .8 + ms * .2;
  }

  enfoncer(code: string): InputActionArcade | null {
    this.touches.add(code);
    return TOUCHES_ARCADE[code] ?? null;
  }

  relacher(code: string): InputActionArcade | null {
    this.touches.delete(code);
    return TOUCHES_ARCADE[code] ?? null;
  }

  definirTactile(dx: number, dy: number): void { this.tactile = directionNormalisee(dx, dy); }
  definirSprintTactile(actif: boolean): void { this.sprintTactile = actif; }

  emettre(action: Exclude<InputActionArcade, 'MOVE' | 'SPRINT'>, options: Partial<Omit<EvenementInputArcade, 'sequence' | 'action' | 'tempsClient' | 'tempsServeurEstime'>> = {}): EvenementInputArcade {
    const maintenant = Date.now();
    const evenement: EvenementInputArcade = {
      sequence: ++this.sequence, action, tempsClient: maintenant,
      tempsServeurEstime: maintenant + this.decalageServeur,
      ...options,
    };
    this.file.push(evenement);
    if (this.file.length > 16) this.file.splice(0, this.file.length - 16);
    return evenement;
  }

  lireManette(manette?: Gamepad | null): { detectee: boolean; nouveaux: EvenementInputArcade[]; axe: Vec; sprint: boolean } {
    if (!manette) return { detectee: false, nouveaux: [], axe: { x: 0, y: 0 }, sprint: false };
    const brutX = manette.axes[0] ?? 0;
    const brutY = manette.axes[1] ?? 0;
    const axe = directionNormalisee(Math.abs(brutX) > .16 ? brutX : 0, Math.abs(brutY) > .16 ? brutY : 0);
    const boutons = manette.buttons.map((bouton) => bouton.pressed);
    const nouveaux: EvenementInputArcade[] = [];
    const front = (index: number, action: Exclude<InputActionArcade, 'MOVE' | 'SPRINT'>) => {
      if (boutons[index] && !this.manetteAvant[index]) nouveaux.push(this.emettre(action));
    };
    // Xbox : A/B/X/Y, LB/RB. PlayStation remonte les mêmes indices logiques.
    front(0, 'ACTION_PRIMARY'); front(1, 'ACTION_SECONDARY'); front(2, 'KICK'); front(3, 'SWITCH_PLAYER');
    front(4, 'PASS_LEFT'); front(5, 'PASS_RIGHT');
    this.manetteAvant = boutons;
    return { detectee: true, nouveaux, axe, sprint: Boolean(boutons[6] || boutons[7]) };
  }

  trame(manette?: Gamepad | null, conserverEvenements = true): TrameInputArcade {
    const gp = this.lireManette(manette);
    let x = 0; let y = 0;
    if (this.touches.has('KeyA') || this.touches.has('ArrowLeft')) x -= 1;
    if (this.touches.has('KeyD') || this.touches.has('ArrowRight')) x += 1;
    if (this.touches.has('KeyW') || this.touches.has('KeyZ') || this.touches.has('ArrowUp')) y -= 1;
    if (this.touches.has('KeyS') || this.touches.has('ArrowDown')) y += 1;
    let axe = directionNormalisee(x, y);
    if (gp.axe.x || gp.axe.y) axe = gp.axe;
    if (this.tactile.x || this.tactile.y) axe = this.tactile;
    const evenements = [...this.file];
    if (!conserverEvenements) this.file = [];
    return {
      sequence: this.sequence, dx: axe.x, dy: axe.y,
      sprint: this.sprintTactile || gp.sprint || this.touches.has('ShiftLeft') || this.touches.has('ShiftRight'),
      joueurId: this.joueurId, evenements, tempsClient: Date.now(),
    };
  }

  acquitter(sequence: number): void { this.file = this.file.filter((e) => e.sequence > sequence); }
}

function joueursValides(match: EtatMatch, camp: Cote): Pion[] {
  return match.pions.filter((p) => p.cote === camp && p.surLeTerrain && p.sanction <= 0 && !p.corps);
}

/**
 * Score d'intervention : trajectoire, angle, vitesse et possibilité réelle de
 * fermer le porteur. Il remplace le simple « joueur le plus proche ».
 */
export function scoreIntervention(match: EtatMatch, pion: Pion, direction?: Vec): number {
  const cible = match.porteur?.cote !== pion.cote ? match.porteur : null;
  const point = cible?.pos ?? match.ballon;
  const distance = Math.sqrt(distance2(pion.pos, point));
  const vitesseCible = cible?.vitesse ?? { x: 0, y: 0 };
  const futur = { x: point.x + vitesseCible.x * .75, y: point.y + vitesseCible.y * .75 };
  const interception = Math.sqrt(distance2(pion.pos, futur));
  const vers = directionNormalisee(point.x - pion.pos.x, point.y - pion.pos.y);
  const course = directionNormalisee(pion.vitesse.x, pion.vitesse.y);
  const angle = course.x * vers.x + course.y * vers.y;
  const directionVoulue = direction ? directionNormalisee(direction.x, direction.y) : null;
  const bonusDirection = directionVoulue ? Math.max(0, directionVoulue.x * vers.x + directionVoulue.y * vers.y) * 11 : 0;
  const devant = cible ? (pion.pos.x - cible.pos.x) * sens(pion.cote) : 0;
  return 110 - distance * 3.1 - interception * 1.6 + angle * 9 + bonusDirection
    + borner(pion.vitesseMax, 0, 12) * 1.4 + (devant > -4 ? 8 : -8) - pion.battu * 18;
}

export function selectionnerJoueurPertinent(
  match: EtatMatch, camp: Cote, courantId?: string, direction?: Vec, changer = false,
): Pion | undefined {
  if (match.porteur?.cote === camp) return match.porteur;
  const valides = joueursValides(match, camp);
  if (!valides.length) return undefined;
  const courant = valides.find((p) => p.id === courantId);
  if (courant && !changer) return courant;
  return [...valides]
    .filter((p) => !changer || p.id !== courantId)
    .sort((a, b) => scoreIntervention(match, b, direction) - scoreIntervention(match, a, direction))[0] ?? courant;
}

export interface ActionContextuelleArcade {
  principale: 'raffut' | 'plaquage' | 'grattage' | 'soutien';
  secondaire: 'crochet' | 'grattage' | 'monter';
  libellePrincipal: string;
  libelleSecondaire: string;
  piedVisible: boolean;
}

export function actionContextuelleArcade(match: EtatMatch, pion?: Pion): ActionContextuelleArcade {
  const porte = !!pion && match.porteur === pion;
  const attaque = !!pion && match.possession === pion.cote;
  const presRuck = !!pion && (match.phase === 'ruck' || match.phase === 'maul') && distance2(pion.pos, match.ballon) < 9 * 9;
  if (porte) return { principale: 'raffut', secondaire: 'crochet', libellePrincipal: 'Raffut', libelleSecondaire: 'Crochet', piedVisible: true };
  if (!attaque && presRuck) return { principale: 'grattage', secondaire: 'grattage', libellePrincipal: 'Grattage', libelleSecondaire: 'Grattage', piedVisible: false };
  if (!attaque) return { principale: 'plaquage', secondaire: 'monter', libellePrincipal: 'Plaquage', libelleSecondaire: 'Monter', piedVisible: false };
  return { principale: 'soutien', secondaire: 'monter', libellePrincipal: 'Soutien', libelleSecondaire: 'Se replacer', piedVisible: false };
}

/** Un geste sur le terrain remplace les boutons tactiles sans gêner le joystick. */
export function actionGesteTactileArcade(dx: number, dy: number, porteurControle: boolean): EvenementInputArcade['action'] | null {
  const horizontal = Math.abs(dx);
  const vertical = Math.abs(dy);
  if (Math.hypot(dx, dy) < 25) return porteurControle ? null : 'SWITCH_PLAYER';
  if (!porteurControle) {
    if (dy < -52 && vertical > horizontal * 1.1) return 'SWITCH_PLAYER';
    return Math.hypot(dx, dy) >= 45 ? 'ACTION_PRIMARY' : null;
  }
  if (dy > 52 && horizontal > 38 && horizontal < vertical * 1.45) return 'ACTION_SECONDARY';
  if (horizontal >= 55 && horizontal > vertical * 1.1) return dx < 0 ? 'PASS_LEFT' : 'PASS_RIGHT';
  if (dy <= -55 && vertical > horizontal * .8) return 'KICK';
  if (dy >= 48 && vertical > horizontal * .8) return 'ACTION_PRIMARY';
  return null;
}

export function deflexionJoystickArcade(x: number, y: number): { dx: number; dy: number; sprint: boolean; px: number; py: number } {
  const distance = Math.hypot(x, y);
  const force = Math.min(1, distance / 48);
  const dx = distance ? x / distance * force : 0;
  const dy = distance ? y / distance * force : 0;
  return { dx, dy, sprint: force >= .82, px: dx * 48, py: dy * 48 };
}

export function deplacerJoueurArcade(match: EtatMatch, pion: Pion, trame: TrameInputArcade, dt: number): void {
  if (match.phase === 'melee' || match.phase === 'touche'
    || (!trame.dx && !trame.dy) || pion.corps || pion.sanction > 0) return;
  const direction = directionNormalisee(trame.dx, trame.dy);
  const orientationX = pion.cote === 'A' ? 1 : -1;
  const sprint = trame.sprint && pion.endurance > 12;
  const vitesse = pion.vitesseMax * (sprint ? 1.22 : .90) * (.72 + pion.endurance / 360);
  const avant = { ...pion.pos };
  pion.pos.x = borner(pion.pos.x + direction.x * orientationX * vitesse * dt, -1, LONGUEUR + 1);
  pion.pos.y = borner(pion.pos.y + direction.y * vitesse * dt, 1, LARGEUR - 1);
  if (match.porteur === pion && match.phase === 'jeuCourant' && match.controleArcadeCamps?.includes(pion.cote)) {
    const s = sens(pion.cote);
    const auDela = (x: number) => Math.max(0, (x - match.ligneAvantage) * s);
    const metres = auDela(pion.pos.x) - auDela(avant.x);
    if (metres > 0) {
      pion.stats.metres += metres;
      match.metresGagnesPhase = Math.max(match.metresGagnesPhase, auDela(pion.pos.x));
    }
  }
  pion.cible = { ...pion.pos };
  pion.vitesse.x = (pion.pos.x - avant.x) / Math.max(.001, dt);
  pion.vitesse.y = (pion.pos.y - avant.y) / Math.max(.001, dt);
  pion.effort = sprint ? 1.12 : 1;
  if (sprint) pion.endurance = Math.max(0, pion.endurance - dt * 1.8);
  if (match.porteur === pion) match.ballon = { ...pion.pos };
}

export type TypeQteArcade = 'ruck' | 'melee' | 'touche' | 'tir';
export interface QteArcade {
  id: string;
  type: TypeQteArcade;
  debutServeur: number;
  dureeMs: number;
  cible: number;
  largeurParfaite: number;
  largeurBonne: number;
  initiateur?: Cote;
  choix?: Partial<Record<Cote, 'court' | 'milieu' | 'long'>>;
  scores?: Partial<Record<Cote, number>>;
  etapeTir?: 'direction' | 'puissance';
  directionScore?: number;
}

function hacherGraine(graine: string): number {
  let h = 2166136261;
  for (let i = 0; i < graine.length; i++) { h ^= graine.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

export function creerQteArcade(type: TypeQteArcade, graine: string, debutServeur: number): QteArcade {
  const hasard = hacherGraine(`${type}:${graine}`);
  const dureeMs = type === 'melee' || type === 'touche' ? 2600 : type === 'tir' ? 2200 : 1150;
  return {
    id: `${type}-${graine}`,
    type, debutServeur, dureeMs,
    cible: .28 + hasard * .48,
    largeurParfaite: type === 'ruck' ? .07 : .085,
    largeurBonne: type === 'ruck' ? .18 : .22,
  };
}

export interface ResultatQteArcade { score: number; qualite: 'excellent' | 'bon' | 'rate'; progression: number }

export function evaluerQteArcade(qte: QteArcade, tempsServeur: number): ResultatQteArcade {
  const progression = borner((tempsServeur - qte.debutServeur) / qte.dureeMs, 0, 1);
  const ecart = Math.abs(progression - qte.cible);
  if (ecart <= qte.largeurParfaite) return { score: 1, qualite: 'excellent', progression };
  if (ecart <= qte.largeurBonne) return { score: .55, qualite: 'bon', progression };
  return { score: -.2, qualite: 'rate', progression };
}

export function progressionQte(qte: QteArcade, tempsServeur: number): number {
  return borner((tempsServeur - qte.debutServeur) / qte.dureeMs, 0, 1);
}

/** Les deux gestes du joueur déterminent réellement la transformation. */
export function transformationArcadeReussie(direction: number, puissance: number, angle: number, distance: number): boolean {
  return direction >= (angle > 25 ? 1 : .55) && puissance >= (distance > 40 ? 1 : .55);
}

export function interpolerPosition(actuelle: Vec, cible: Vec, facteur = .28): Vec {
  const distance = Math.sqrt(distance2(actuelle, cible));
  if (distance > 9) return { ...cible };
  return { x: actuelle.x + (cible.x - actuelle.x) * facteur, y: actuelle.y + (cible.y - actuelle.y) * facteur };
}
