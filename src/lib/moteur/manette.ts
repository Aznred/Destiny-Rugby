// 🎮 LES COMMANDES — clavier, manette, et joystick tactile
//
// Demande explicite : « je veux que ce soit comme un jeu : tu contrôles les
// mouvements du joueur, avec une touche pour plaquer, passer, demander la
// passe, gratter, etc., et que ça marche sur manettes aussi. »
//
// ═══ CE QUE FAIT CE FICHIER, ET CE QU'IL NE FAIT PAS ═════════════════════════
//
// Il LIT les entrées et rend un état — une direction, un sprint, des touches
// qui viennent d'être enfoncées. Il ne touche jamais au match : c'est
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

import type { ActionJoueur } from './etat';

// ---------------------------------------------------------------------------
// LE CLAVIER
// ---------------------------------------------------------------------------

/** Les quatre directions, en codes physiques (AZERTY : Z Q S D). */
const HAUT = ['KeyW', 'ArrowUp'];
const BAS = ['KeyS', 'ArrowDown'];
const GAUCHE = ['KeyA', 'ArrowLeft'];
const DROITE = ['KeyD', 'ArrowRight'];

/** Le sprint est MAINTENU : on le lit comme un état, pas comme un appui. */
const SPRINT = ['ShiftLeft', 'ShiftRight'];

/**
 * ⚠️ LES TOUCHES D'ACTION SONT SOUS LA MAIN DROITE, le déplacement sous la
 * gauche — comme dans n'importe quel jeu au clavier. Les libellés affichés
 * (`touche`) sont ceux d'un clavier AZERTY, puisque le jeu est écrit en
 * français d'abord ; la touche physique, elle, est la même partout.
 */
export const TOUCHES: { code: string; touche: string; action: ActionJoueur }[] = [
  { code: 'KeyP', touche: 'P', action: 'passe' },
  { code: 'KeyL', touche: 'L', action: 'appel' },
  { code: 'KeyJ', touche: 'J', action: 'plaquage' },
  { code: 'KeyK', touche: 'K', action: 'grattage' },
  { code: 'KeyI', touche: 'I', action: 'pied' },
  { code: 'KeyU', touche: 'U', action: 'crochet' },
  { code: 'KeyO', touche: 'O', action: 'raffut' },
  { code: 'KeyM', touche: ',', action: 'soutien' },
  { code: 'KeyH', touche: 'H', action: 'monter' },
  { code: 'KeyB', touche: 'B', action: 'provoquer' },
  { code: 'KeyN', touche: 'N', action: 'frapper' },
  { code: 'KeyC', touche: 'C', action: 'calmer' },
];

const ACTION_PAR_CODE = new Map(TOUCHES.map((t) => [t.code, t.action]));
export const TOUCHE_PAR_ACTION = new Map(TOUCHES.map((t) => [t.action, t.touche]));

/**
 * ⚠️ LA BARRE D'ESPACE FAIT « CE QU'IL FAUT FAIRE ». C'est la touche des jeux
 * de sport : on ne demande pas au joueur de se souvenir que J plaque et P
 * passe pendant qu'un ailier lui arrive dessus. Elle joue l'action évidente de
 * la situation — et les touches dédiées restent là pour qui veut la précision.
 */
export const CODE_PRINCIPAL = 'Space';

// ---------------------------------------------------------------------------
// LA MANETTE (Gamepad API, disposition « standard »)
// ---------------------------------------------------------------------------
// ⚠️ ON NE LIT QUE LA DISPOSITION `standard`. Le navigateur remappe déjà les
// manettes Xbox, PlayStation, Switch Pro et la plupart des génériques sur ce
// même plan : boutons 0-3 en losange, 4-7 gâchettes, 12-15 croix directionnelle.
// Deviner un plan propriétaire par l'identifiant du périphérique, c'est écrire
// une table qui sera fausse pour la manette suivante.
//
// ⚠️ UN BOUTON PEUT PORTER DEUX ACTIONS, et ce n'est pas de l'économie de
// place : les familles sont MUTUELLEMENT EXCLUSIVES (on ne peut pas être le
// porteur et défendre en même temps), donc une seule des deux est jamais
// disponible. `demanderAction` refuse l'autre sans rien faire. C'est ce qui
// permet de tenir treize actions sur une manette sans combinaison de touches —
// LB crochète quand on porte le ballon et gratte quand on défend, exactement
// comme le même bouton tire ou tacle dans un jeu de football.
export const BOUTONS: { index: number; nom: string; actions: ActionJoueur[] }[] = [
  { index: 1, nom: 'B / ○', actions: ['plaquage', 'pied'] },
  { index: 2, nom: 'X / □', actions: ['passe', 'appel'] },
  { index: 3, nom: 'Y / △', actions: ['raffut', 'soutien', 'monter'] },
  { index: 4, nom: 'LB / L1', actions: ['crochet', 'grattage'] },
  { index: 5, nom: 'RB / R1', actions: ['provoquer'] },
  { index: 6, nom: 'LT / L2', actions: ['calmer'] },
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
  /** L'action principale a été demandée (barre d'espace ou bouton A). */
  principale: boolean;
  /** Une manette est branchée et a bougé au moins une fois. */
  manette: boolean;
  /** Ordre de bagarre choisi à la manette : index 0 à 3 du losange. */
  ordre: number | null;
}

const VIDE: Entrees = { dx: 0, dy: 0, sprint: false, appuis: [], principale: false, manette: false, ordre: null };

/**
 * Le lecteur d'entrées. Une instance par match ouvert.
 *
 * ⚠️ IL DISTINGUE L'ÉTAT ET L'APPUI. Une direction est un ÉTAT (on la lit à
 * chaque image tant que la touche est enfoncée) ; une action est un
 * ÉVÉNEMENT (elle ne doit partir qu'une fois par pression, sinon maintenir la
 * touche « passe » enverrait quarante passes par seconde). D'où le front
 * montant, tenu à la fois pour le clavier et pour la manette.
 */
export class LecteurEntrees {
  private enfoncees = new Set<string>();
  private fileClavier: ActionJoueur[] = [];
  private principaleClavier = false;
  private boutonsPrecedents = new Set<number>();
  private manetteVue = false;

  /** À brancher sur `keydown`. Renvoie `true` si la touche a été consommée. */
  auClavier(ev: KeyboardEvent): boolean {
    const code = ev.code;
    if (this.enfoncees.has(code)) return true; // répétition automatique : on ignore
    this.enfoncees.add(code);
    if (code === CODE_PRINCIPAL) { this.principaleClavier = true; return true; }
    const action = ACTION_PAR_CODE.get(code);
    if (action) { this.fileClavier.push(action); return true; }
    return HAUT.includes(code) || BAS.includes(code)
      || GAUCHE.includes(code) || DROITE.includes(code) || SPRINT.includes(code);
  }

  /** À brancher sur `keyup`. */
  relacher(ev: KeyboardEvent): void {
    this.enfoncees.delete(ev.code);
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
   * Lit tout — clavier, manette, tactile — et vide les files d'appuis.
   * Appelée UNE FOIS par image de rendu.
   */
  lire(): Entrees {
    const appuis = this.fileClavier;
    this.fileClavier = [];
    const principaleClavier = this.principaleClavier;
    this.principaleClavier = false;

    let dx = 0;
    let dy = 0;
    if (this.enfoncees.has('KeyW') || this.enfoncees.has('ArrowUp')) dy -= 1;
    if (this.enfoncees.has('KeyS') || this.enfoncees.has('ArrowDown')) dy += 1;
    if (this.enfoncees.has('KeyA') || this.enfoncees.has('ArrowLeft')) dx -= 1;
    if (this.enfoncees.has('KeyD') || this.enfoncees.has('ArrowRight')) dx += 1;
    let sprint = SPRINT.some((c) => this.enfoncees.has(c));

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

    if (!dx && !dy && !sprint && !appuis.length && !principale && !this.manetteVue) return VIDE;
    return { dx, dy, sprint, appuis, principale, manette: this.manetteVue, ordre };
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
