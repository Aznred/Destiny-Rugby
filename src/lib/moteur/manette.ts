// 🎮 LES COMMANDES — clavier, souris, manette, et joystick tactile
//
// Demande initiale : « je veux que ce soit comme un jeu : tu contrôles les
// mouvements du joueur, avec une touche pour plaquer, passer, demander la
// passe, gratter, etc., et que ça marche sur manettes aussi. »
//
// Reprise après retour de jeu : « sur PC ou manette les touches pour plaquer
// etc. ne sont pas bonnes. Il faudrait A ou E pour la passe droite ou gauche,
// clic droit ou gauche pour plaquer / tirer au pied, Maj pour sprinter, et
// qu'on puisse modifier ces touches dans les paramètres. »
//
// ═══ CE QUE FAIT CE FICHIER, ET CE QU'IL NE FAIT PAS ═════════════════════════
//
// Il LIT les entrées et rend un état — une direction, un sprint, des commandes
// qui viennent d'être déclenchées. Il ne touche jamais au match : c'est
// `MatchLive` qui, à chaque image, passe cet état à `piloterDirection()` et
// `demanderAction()`. Aucune dépendance à React, aucune au moteur : on peut le
// tester seul, et il ne peut rien casser du déterminisme.
//
// ⚠️ TOUT EST LU SUR `ev.code`, JAMAIS SUR `ev.key`. `code` désigne la TOUCHE
// PHYSIQUE : `KeyW` est la touche en haut à gauche du bloc de frappe, c'est-à-
// dire **Z** sur un clavier AZERTY et **W** sur un QWERTY. Le même code source
// donne donc ZQSD à un joueur français et WASD à un anglophone, sans aucune
// détection de disposition. Lire `ev.key` aurait donné « z q s d » en AZERTY et
// des raccourcis morts partout ailleurs.
//
// ⚠️ ET C'EST AUSSI POURQUOI « A ET E » MARCHE DANS LES DEUX MONDES. Les deux
// touches qui encadrent la touche « avancer » portent le code `KeyQ` et `KeyE` :
// elles se lisent **A** et **E** en AZERTY, **Q** et **E** en QWERTY. Dans les
// deux cas, ce sont les deux voisines immédiates du pouce gauche — donc la
// passe à gauche et la passe à droite tombent sous les doigts sans y penser.

import type { ActionJoueur } from './etat';

// ---------------------------------------------------------------------------
// CE QUI PEUT ÊTRE ASSIGNÉ
// ---------------------------------------------------------------------------

/**
 * Une commande assignable. Les quatre directions et le sprint sont des ÉTATS
 * (on les lit tant qu'elles sont enfoncées) ; tout le reste est un ÉVÉNEMENT.
 */
export type Commande =
  | 'haut' | 'bas' | 'gauche' | 'droite'
  | 'sprint' | 'principale'
  | ActionJoueur;

/** Les commandes qui se MAINTIENNENT plutôt que de se déclencher. */
export const COMMANDES_MAINTENUES: Commande[] = ['haut', 'bas', 'gauche', 'droite', 'sprint'];

/** Une assignation : le code physique, et comment l'écrire à l'écran. */
export interface Assignation {
  /** `ev.code` (`KeyQ`, `ShiftLeft`, `Space`) ou `Mouse0` / `Mouse2`. */
  code: string;
  /**
   * Ce qu'on affiche. ⚠️ Il est stocké AVEC le code, pas déduit : `KeyQ`
   * s'écrit « A » en AZERTY et « Q » en QWERTY, et seul le navigateur du joueur
   * sait laquelle. À la capture on lit `ev.key`, qui donne le vrai caractère de
   * SA disposition ; les valeurs par défaut ci-dessous sont écrites en AZERTY,
   * puisque le jeu est français d'abord.
   */
  libelle: string;
}

export type Liaisons = Partial<Record<Commande, Assignation>>;

/**
 * ⚠️ LA DISPOSITION PAR DÉFAUT, ET LES TROIS RÈGLES QUI L'EXPLIQUENT.
 *
 * 1. **La main gauche court, la main droite agit** — comme dans tous les jeux
 *    au clavier. ZQSD déplace, Maj sprinte.
 * 2. **Les deux passes encadrent « avancer ».** A et E (physiquement `KeyQ` et
 *    `KeyE`) sont les voisines immédiates de Z : on donne à gauche ou à droite
 *    sans quitter les doigts du bloc de déplacement. C'est la demande, et c'est
 *    aussi la seule place qui rend la passe réflexe.
 * 3. **La souris fait les deux gestes qui décident du terrain** : clic gauche
 *    plaque, clic droit tape. Ce sont ceux qu'on joue en urgence, et une souris
 *    répond plus vite qu'une lettre qu'il faut chercher.
 *
 * ⚠️ SI LA COMMANDE DE LA SOURIS N'EST PAS JOUABLE À L'INSTANT (on plaque alors
 * qu'on porte le ballon), l'écran joue l'action CONTEXTUELLE à la place plutôt
 * que rien : voir `MatchLive`. Un clic qui ne fait rien passe pour un bug.
 */
export const LIAISONS_DEFAUT: Record<Commande, Assignation> = {
  haut: { code: 'KeyW', libelle: 'Z' },
  bas: { code: 'KeyS', libelle: 'S' },
  gauche: { code: 'KeyA', libelle: 'Q' },
  droite: { code: 'KeyD', libelle: 'D' },
  sprint: { code: 'ShiftLeft', libelle: 'Maj' },
  principale: { code: 'Space', libelle: 'Espace' },

  // ── Ballon en main ────────────────────────────────────────────────────────
  passeGauche: { code: 'KeyQ', libelle: 'A' },
  passeDroite: { code: 'KeyE', libelle: 'E' },
  passe: { code: 'KeyT', libelle: 'T' },
  pied: { code: 'Mouse2', libelle: 'Clic droit' },
  crochet: { code: 'KeyF', libelle: 'F' },
  raffut: { code: 'KeyR', libelle: 'R' },

  // ── Sans ballon ───────────────────────────────────────────────────────────
  appel: { code: 'KeyX', libelle: 'X' },
  soutien: { code: 'KeyG', libelle: 'G' },

  // ── Défense ───────────────────────────────────────────────────────────────
  plaquage: { code: 'Mouse0', libelle: 'Clic gauche' },
  monter: { code: 'KeyV', libelle: 'V' },
  grattage: { code: 'KeyC', libelle: 'C' },

  // ── Discipline ────────────────────────────────────────────────────────────
  provoquer: { code: 'KeyB', libelle: 'B' },
  frapper: { code: 'KeyN', libelle: 'N' },
  calmer: { code: 'KeyH', libelle: 'H' },
};

/** L'ordre d'affichage dans les réglages : par famille, comme la barre d'actions. */
export const COMMANDES_REGLABLES: { cle: Commande; cleI18n: string }[] = [
  { cle: 'haut', cleI18n: 'cmd.haut' },
  { cle: 'bas', cleI18n: 'cmd.bas' },
  { cle: 'gauche', cleI18n: 'cmd.gauche' },
  { cle: 'droite', cleI18n: 'cmd.droite' },
  { cle: 'sprint', cleI18n: 'cmd.sprint' },
  { cle: 'principale', cleI18n: 'cmd.principale' },
  { cle: 'passeGauche', cleI18n: 'ml.act.passeGauche' },
  { cle: 'passeDroite', cleI18n: 'ml.act.passeDroite' },
  { cle: 'passe', cleI18n: 'ml.act.passe' },
  { cle: 'pied', cleI18n: 'ml.act.pied' },
  { cle: 'crochet', cleI18n: 'ml.act.crochet' },
  { cle: 'raffut', cleI18n: 'ml.act.raffut' },
  { cle: 'plaquage', cleI18n: 'ml.act.plaquage' },
  { cle: 'monter', cleI18n: 'ml.act.monter' },
  { cle: 'grattage', cleI18n: 'ml.act.grattage' },
  { cle: 'appel', cleI18n: 'ml.act.appel' },
  { cle: 'soutien', cleI18n: 'ml.act.soutien' },
  { cle: 'provoquer', cleI18n: 'ml.act.provoquer' },
  { cle: 'frapper', cleI18n: 'ml.act.frapper' },
  { cle: 'calmer', cleI18n: 'ml.act.calmer' },
];

/** Les liaisons effectives : les réglages du joueur par-dessus les valeurs par défaut. */
export function liaisonsEffectives(perso?: Liaisons): Record<Commande, Assignation> {
  if (!perso) return LIAISONS_DEFAUT;
  return { ...LIAISONS_DEFAUT, ...perso };
}

/**
 * Comment écrire un code physique quand on n'a pas de libellé stocké.
 *
 * ⚠️ Utilisé UNIQUEMENT en repli. La bonne source, c'est le libellé capturé au
 * moment de l'assignation : lui seul connaît la disposition du joueur.
 */
export function libelleDeCode(code: string): string {
  if (code === 'Mouse0') return 'Clic gauche';
  if (code === 'Mouse1') return 'Clic milieu';
  if (code === 'Mouse2') return 'Clic droit';
  if (code === 'Space') return 'Espace';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return { Up: '▲', Down: '▼', Left: '◀', Right: '▶' }[code.slice(5)] ?? code;
  if (code.startsWith('Shift')) return 'Maj';
  if (code.startsWith('Control')) return 'Ctrl';
  if (code.startsWith('Alt')) return 'Alt';
  return code;
}

/**
 * ⚠️ LES FLÈCHES MARCHENT TOUJOURS, en plus de ce qui est assigné, et elles ne
 * sont PAS réglables. C'est le filet de sécurité : quelqu'un qui réassigne ses
 * quatre directions sur des touches introuvables doit pouvoir bouger quand
 * même, sans aller rouvrir les réglages avec un pion planté au milieu du pré.
 */
const FLECHES: Record<string, 'haut' | 'bas' | 'gauche' | 'droite'> = {
  ArrowUp: 'haut', ArrowDown: 'bas', ArrowLeft: 'gauche', ArrowRight: 'droite',
};

// ---------------------------------------------------------------------------
// LA MANETTE (Gamepad API, disposition « standard »)
// ---------------------------------------------------------------------------
// ⚠️ ON NE LIT QUE LA DISPOSITION `standard`. Le navigateur remappe déjà les
// manettes Xbox, PlayStation, Switch Pro et la plupart des génériques sur ce
// même plan : boutons 0-3 en losange, 4-7 gâchettes, 12-15 croix directionnelle.
// Deviner un plan propriétaire par l'identifiant du périphérique, c'est écrire
// une table qui sera fausse pour la manette suivante.
//
// ⚠️ LE LOSANGE PORTE LES DEUX PASSES, comme A et E au clavier : X/□ à gauche,
// B/○ à droite. C'est la même logique — deux boutons opposés pour deux côtés
// opposés — et c'est ce qui rend la manette jouable sans réfléchir.
export const BOUTONS: { index: number; nom: string; actions: ActionJoueur[] }[] = [
  { index: 2, nom: 'X / □', actions: ['passeGauche', 'appel'] },
  { index: 1, nom: 'B / ○', actions: ['passeDroite', 'plaquage'] },
  { index: 3, nom: 'Y / △', actions: ['raffut', 'soutien', 'monter'] },
  { index: 4, nom: 'LB / L1', actions: ['crochet', 'grattage'] },
  { index: 5, nom: 'RB / R1', actions: ['pied'] },
  { index: 6, nom: 'LT / L2', actions: ['calmer'] },
  { index: 9, nom: 'Start', actions: ['provoquer'] },
  { index: 10, nom: 'L3', actions: ['frapper'] },
];

/** Le bouton (ou les boutons) de manette qui joue cette action. */
export const BOUTON_PAR_ACTION = new Map<ActionJoueur, string>(
  BOUTONS.flatMap((b) => b.actions.map((a) => [a, b.nom] as [ActionJoueur, string])),
);

/** Bouton A/✕ : l'équivalent manette de la barre d'espace. */
const BOUTON_PRINCIPAL = 0;
/** Gâchette droite : le sprint, maintenu. */
const BOUTON_SPRINT = 7;
/** Croix directionnelle : haut, bas, gauche, droite. */
const CROIX = { haut: 12, bas: 13, gauche: 14, droite: 15 };
/** En deçà, le stick est considéré au repos (dérive des potentiomètres). */
const ZONE_MORTE = 0.28;

// ---------------------------------------------------------------------------
// L'ÉTAT DES ENTRÉES
// ---------------------------------------------------------------------------

export interface Entrees {
  /** Direction voulue, non normalisée (‑1 à 1 sur chaque axe). */
  dx: number;
  dy: number;
  /** Le sprint est maintenu. */
  sprint: boolean;
  /** Les actions déclenchées DEPUIS LA DERNIÈRE LECTURE (front montant). */
  appuis: ActionJoueur[];
  /**
   * Les actions demandées À LA SOURIS. Séparées des autres parce qu'elles ont
   * un repli : si le geste n'est pas jouable, l'écran joue l'action
   * contextuelle plutôt que rien.
   */
  souris: ActionJoueur[];
  /** L'action principale a été demandée (barre d'espace ou bouton A). */
  principale: boolean;
  /** Une manette est branchée et a bougé au moins une fois. */
  manette: boolean;
  /** Ordre de bagarre choisi à la manette : index 0 à 3 du losange. */
  ordre: number | null;
}

const VIDE: Entrees = {
  dx: 0, dy: 0, sprint: false, appuis: [], souris: [], principale: false,
  manette: false, ordre: null,
};

/**
 * Le lecteur d'entrées. Une instance par match ouvert.
 *
 * ⚠️ IL DISTINGUE L'ÉTAT ET L'APPUI. Une direction est un ÉTAT (on la lit à
 * chaque image tant que la touche est enfoncée) ; une action est un
 * ÉVÉNEMENT (elle ne doit partir qu'une fois par pression, sinon maintenir la
 * touche « passe » enverrait quarante passes par seconde). D'où le front
 * montant, tenu à la fois pour le clavier, la souris et la manette.
 */
export class LecteurEntrees {
  private enfoncees = new Set<string>();
  private fileClavier: ActionJoueur[] = [];
  private fileSouris: ActionJoueur[] = [];
  private principaleClavier = false;
  private boutonsPrecedents = new Set<number>();
  private manetteVue = false;

  /** Les liaisons en vigueur, et l'index inverse code → commande. */
  private liaisons: Record<Commande, Assignation> = LIAISONS_DEFAUT;
  private parCode = new Map<string, Commande>();

  constructor(perso?: Liaisons) {
    this.definirLiaisons(perso);
  }

  /**
   * Remplace la table des touches. ⚠️ Appelée aussi EN COURS DE MATCH quand le
   * joueur change un réglage : les touches enfoncées sont oubliées, sinon une
   * direction restée en mémoire sur l'ancienne touche ferait courir le pion
   * tout seul jusqu'à la touche.
   */
  definirLiaisons(perso?: Liaisons): void {
    this.liaisons = liaisonsEffectives(perso);
    this.parCode = new Map();
    for (const [commande, a] of Object.entries(this.liaisons) as [Commande, Assignation][]) {
      if (a?.code) this.parCode.set(a.code, commande);
    }
    this.toutRelacher();
  }

  /** À brancher sur `keydown`. Renvoie `true` si la touche a été consommée. */
  auClavier(ev: KeyboardEvent): boolean {
    const code = ev.code;
    if (this.enfoncees.has(code)) return true; // répétition automatique : on ignore
    this.enfoncees.add(code);
    if (FLECHES[code]) return true;
    const commande = this.parCode.get(code);
    if (!commande) return false;
    if (commande === 'principale') { this.principaleClavier = true; return true; }
    if (COMMANDES_MAINTENUES.includes(commande)) return true;
    this.fileClavier.push(commande as ActionJoueur);
    return true;
  }

  /** À brancher sur `keyup`. */
  relacher(ev: KeyboardEvent): void {
    this.enfoncees.delete(ev.code);
  }

  /**
   * À brancher sur `pointerdown` du terrain, pour un vrai bouton de souris.
   * Renvoie `true` si le bouton porte une commande (l'appelant coupe alors le
   * menu contextuel et le joystick).
   */
  aLaSouris(bouton: number): boolean {
    const code = `Mouse${bouton}`;
    const commande = this.parCode.get(code);
    if (!commande) return false;
    if (commande === 'principale') { this.principaleClavier = true; return true; }
    if (COMMANDES_MAINTENUES.includes(commande)) return true;
    this.fileSouris.push(commande as ActionJoueur);
    return true;
  }

  /** Un bouton de souris porte-t-il une commande ? (sans la déclencher) */
  sourisAssignee(bouton: number): boolean {
    return this.parCode.has(`Mouse${bouton}`);
  }

  /**
   * ⚠️ INDISPENSABLE : on vide tout quand la fenêtre perd le focus. Sans ça,
   * une touche enfoncée au moment où l'on change d'onglet ne reçoit jamais son
   * `keyup` — et le joueur revient sur un pion qui court tout seul vers la
   * touche, sans que rien ne puisse l'arrêter.
   */
  toutRelacher(): void {
    this.enfoncees.clear();
    this.fileClavier = [];
    this.fileSouris = [];
    this.principaleClavier = false;
    this.boutonsPrecedents.clear();
  }

  /**
   * La direction imposée par le joystick tactile, ou `null` si le doigt est levé.
   *
   * ⚠️ `sprint` VIENT DU STICK, PAS D'UN BOUTON. Sur téléphone on n'a que deux
   * pouces : un pour courir, un pour agir. Un troisième bouton « sprint »
   * demanderait un doigt qu'on n'a pas — et il ne serait jamais pressé.
   * Pousser le stick à fond (voir `SEUIL_SPRINT` dans `MatchLive`) suffit :
   * c'est déjà le geste qu'on fait quand on veut aller vite.
   */
  tactile: { dx: number; dy: number; sprint: boolean } | null = null;

  /**
   * Lit tout — clavier, souris, manette, tactile — et vide les files d'appuis.
   * Appelée UNE FOIS par image de rendu.
   */
  lire(): Entrees {
    const appuis = this.fileClavier;
    this.fileClavier = [];
    const souris = this.fileSouris;
    this.fileSouris = [];
    const principaleClavier = this.principaleClavier;
    this.principaleClavier = false;

    let dx = 0;
    let dy = 0;
    const tenue = (c: 'haut' | 'bas' | 'gauche' | 'droite') => {
      const code = this.liaisons[c]?.code;
      if (code && this.enfoncees.has(code)) return true;
      // Les flèches, toujours, en plus de l'assignation.
      for (const [fleche, sens] of Object.entries(FLECHES)) {
        if (sens === c && this.enfoncees.has(fleche)) return true;
      }
      return false;
    };
    if (tenue('haut')) dy -= 1;
    if (tenue('bas')) dy += 1;
    if (tenue('gauche')) dx -= 1;
    if (tenue('droite')) dx += 1;
    const codeSprint = this.liaisons.sprint?.code;
    // Les deux touches Maj sprintent quand l'une des deux est assignée : personne
    // ne distingue la gauche de la droite en pleine course.
    let sprint = !!codeSprint && (this.enfoncees.has(codeSprint)
      || (codeSprint.startsWith('Shift') && (this.enfoncees.has('ShiftLeft') || this.enfoncees.has('ShiftRight'))));

    // ── Le joystick tactile prend la main quand un doigt est posé ───────────
    if (this.tactile) {
      dx = this.tactile.dx;
      dy = this.tactile.dy;
      if (this.tactile.sprint) sprint = true;
    }

    // ── La manette ─────────────────────────────────────────────────────────
    let principale = principaleClavier;
    let ordre: number | null = null;
    const pad = this.manetteActive();
    if (pad) {
      this.manetteVue = true;
      const sx = pad.axes[0] ?? 0;
      const sy = pad.axes[1] ?? 0;
      if (Math.abs(sx) > ZONE_MORTE || Math.abs(sy) > ZONE_MORTE) { dx = sx; dy = sy; }
      if (this.presse(pad, CROIX.haut)) dy = -1;
      if (this.presse(pad, CROIX.bas)) dy = 1;
      if (this.presse(pad, CROIX.gauche)) dx = -1;
      if (this.presse(pad, CROIX.droite)) dx = 1;
      if (this.presse(pad, BOUTON_SPRINT)) sprint = true;

      // Front montant des boutons : un appui maintenu ne rejoue pas l'action.
      const maintenant = new Set<number>();
      for (let i = 0; i < pad.buttons.length; i++) if (this.presse(pad, i)) maintenant.add(i);
      for (const b of BOUTONS) {
        if (maintenant.has(b.index) && !this.boutonsPrecedents.has(b.index)) appuis.push(...b.actions);
      }
      if (maintenant.has(BOUTON_PRINCIPAL) && !this.boutonsPrecedents.has(BOUTON_PRINCIPAL)) {
        principale = true;
      }
      // Les quatre boutons du losange servent aussi d'ordres pendant une
      // bagarre : A/✕ = on y va tous, B/○ = protéger, X/□ = on se calme,
      // Y/△ = reculer. L'écran choisit lequel des deux usages s'applique.
      for (const [rang, index] of [0, 1, 2, 3].entries()) {
        if (maintenant.has(index) && !this.boutonsPrecedents.has(index)) ordre = rang;
      }
      this.boutonsPrecedents = maintenant;
    }

    if (!dx && !dy && !sprint && !appuis.length && !souris.length && !principale && !this.manetteVue) {
      return VIDE;
    }
    return { dx, dy, sprint, appuis, souris, principale, manette: this.manetteVue, ordre };
  }

  private presse(pad: Gamepad, index: number): boolean {
    const b = pad.buttons[index];
    return !!b && (b.pressed || b.value > 0.5);
  }

  /** La première manette branchée ET connectée. */
  private manetteActive(): Gamepad | null {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    for (const pad of navigator.getGamepads()) {
      if (pad && pad.connected) return pad;
    }
    return null;
  }
}
