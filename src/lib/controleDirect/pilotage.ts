// LE PILOTAGE — l'hôte du contrôle direct (Correctif 16).
//
// Le moteur sait obéir (`moteur/direct.ts`) ; la scène sait se placer derrière un
// joueur (`correctif_16_scene.cjs`). Ce module est ce qui les relie à des DOIGTS :
// il lit le clavier, la manette ou le téléphone, décide quand le joueur prend la
// main (le remplaçant est entré, la caméra est venue derrière lui) et quand il la
// rend, traduit un joystick vu de la caméra en direction sur le terrain, et choisit,
// pour chaque bouton, le geste que la situation rend possible.
//
// ⚠️ IL NE DÉCIDE D'AUCUNE RÈGLE. Un bouton « passe » devient `demanderDirect(passe)` ;
// c'est le moteur qui sait si elle est jouable, à qui elle part, ce qu'elle risque.
//
// ⚠️ LES TROIS APPAREILS PRODUISENT LES MÊMES INTENTIONS. Clavier, manette et pouce ne
// se distinguent qu'ici, à la lecture : après, tout le monde parle `Intention`. C'est
// ce qui permet de changer de manette en plein match sans rien casser, et de ne
// documenter qu'une fois ce que fait un geste.

import type { EtatMatch } from '../moteur/etat';
import type { Pion } from '../moteur/entites';
import {
  activerDirect, choisirReceveur, classerCoupDePied, commanderDirect, demanderDirect, poserViseur,
  type ActionDirecte, type VueDirecte,
} from '../moteur/direct';
import type { Camera3D, ReperesScene, Scene3D } from '../match3D';
import { INDEX_BOUTON, LecteurManette, MANETTE_ABSENTE, type EtatManette, type TypeManette } from './manette';
import { actionDeLaTouche, apprendreTouche, type ActionClavier } from './touches';
import { lirePreferencesControle, ecrirePreferencesControle } from './prefs';
import { tutorielsDesactives } from '../tutoriel/memoire';
import { TutorielDirect, type SnapTuto } from './tutoriel';
import { LARGEUR, sens } from '../moteur/terrain';
import { PiloteResp, TOUCHES_BRUTES, type SnapResp } from './responsabilites';

export type Appareil = 'clavier' | 'tactile' | 'manette';
export type PhasePilotage = 'attente' | 'entree' | 'actif';
export type FamillePoste = 'avant' | 'demi' | 'ouvreur' | 'centre' | 'ailier' | 'arriere';

/** Ce que chaque famille de postes met en avant (ordre des boutons, première aide) : voir `ControleDirect.tsx`. */
export function famillePoste(p: Pion): FamillePoste {
  if (p.avant) return 'avant';
  switch (p.poste) {
    case 'demi_melee': return 'demi';
    case 'demi_ouverture': return 'ouvreur';
    case 'premier_centre': case 'deuxieme_centre': return 'centre';
    case 'ailier_gauche': case 'ailier_droit': return 'ailier';
    default: return 'arriere';
  }
}

/** Ce que veut le joueur, quel que soit l'appareil. `cote` : −1 la gauche de l'écran, +1 la droite. */
export type Intention =
  | { type: 'passe'; cote: -1 | 1; longue: boolean }
  /** Coup de pied : `x, y` dans le repère de l'écran (x à droite, y vers le haut), `puissance` de 0 à 1. */
  | { type: 'pied'; auto: boolean; x: number; y: number; puissance: number; vif: number }
  | { type: 'raffut' }
  | { type: 'crochet'; cote: -1 | 0 | 1 }
  | { type: 'action' }
  | { type: 'appel' }
  | { type: 'gratter' }
  | { type: 'feinte'; cote: -1 | 0 | 1 }
  /** Drop (Correctif 17) : sans direction, le jeu choisit ; avec, le joueur vise. */
  | { type: 'drop'; auto: boolean; x: number; y: number }
  | { type: 'aide' }
  | { type: 'pause' };

/** Ce que l'écran tactile (le composant) dépose, et que le pilote consomme à chaque image. */
export interface EntreeTactile {
  stick: { x: number; y: number };
  sprint: boolean;
  /** Un doigt tient le bouton de coup de pied : depuis quand, et la visée en pixels depuis le bouton. */
  pied: { depuis: number; dx: number; dy: number; vif: number } | null;
  file: Intention[];
  /** Dernier contact (ms), pour savoir que l'appareil du moment est le téléphone. */
  actif: number;
}

export interface SnapPilotage {
  phase: PhasePilotage;
  /** Le HUD est à l'écran. */
  visible: boolean;
  appareil: Appareil;
  manette: TypeManette;
  libre: boolean;
  raison: VueDirecte['raison'];
  porte: boolean;
  attaque: boolean;
  endurance: number;
  famille: FamillePoste;
  possible: VueDirecte['possible'];
  contactImminent: boolean;
  horsJeu: boolean;
  horsPoste: boolean;
  aide: boolean;
  appelActif: boolean;
  /** Une phrase brève : ce que le dernier geste refusé n'a pas pu faire (`cd.refus.*`). */
  toast: { cle: string; n: number } | null;
  kick: { puissance: number } | null;
  tuto: SnapTuto | null;
  pause: boolean;
  /** Le poste que l'IA donnerait au joueur est connu (l'aide au placement a quelque chose à montrer). */
  aPoste: boolean;
  /** Les gestes en recharge : le HUD les montre éteints plutôt que de les faire disparaître. */
  recharge: ActionDirecte[];
  /** Un geste armé attend son contact : le bouton reste allumé jusqu'à ce qu'il aboutisse. */
  arme: VueDirecte['arme'];
  /** Le joueur sprinte (stick poussé au bord, bouton tenu ou verrouillé, touche, gâchette) : le bouton s'allume. */
  sprint: boolean;
  /** Ce que le jeu attend de lui (capitaine, tir, engagement, touche) et les bandeaux qui l'accompagnent (Correctif 17). */
  resp: SnapResp;
}

const DUREE_ENTREE = 1.45;
const PHASES_SPECTACLE = new Set(['penalite', 'tirAuBut', 'transformation', 'aplatissage', 'apresEssai', 'tmo', 'miTemps', 'fini']);
/** Au-delà de cette durée, un appui est un « maintenu » : passe sautée, coup de pied appuyé. */
export const SEUIL_MAINTIEN = 0.26;
/** Temps pour charger un coup de pied au clavier ou à la manette, secondes. */
const CHARGE_PIED = 1.0;

const produit = (v: { x: number; y: number }, k: number) => ({ x: v.x * k, y: v.y * k });

// ---------------------------------------------------------------------------
// LE CLAVIER
// ---------------------------------------------------------------------------

class Clavier {
  tenues = new Set<string>();
  debut = new Map<string, number>();
  fronts: string[] = [];
  /** Touches lues en plus des actions remappées : choisir (1 à 8), valider, la touche rapide (Correctif 17). */
  brutes: string[] = [];
  relaches: { code: string; duree: number }[] = [];
  /** Vrai quand le pilote conduit : les touches de jeu ne font plus rien d'autre (défilement, focus). */
  capture = false;
  /** La touche d'une action (selon les préférences du moment). */
  action: (code: string) => ActionClavier | null = () => null;
  derniere = 0;

  attacher(): () => void {
    const bas = (ev: KeyboardEvent) => {
      apprendreTouche(ev.code, ev.key);
      // Échap appartient à la fenêtre du match (pause en jeu, sortie sinon) : le pilote ne le lit pas.
      if (ev.code === 'Escape') return;
      if (ev.repeat) { if (this.capture && this.action(ev.code)) ev.preventDefault(); return; }
      const cible = ev.target as HTMLElement | null;
      if (cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (this.capture && TOUCHES_BRUTES.has(ev.code)) { this.brutes.push(ev.code); ev.preventDefault(); }
      const a = this.action(ev.code);
      if (!a) return;
      if (this.capture) ev.preventDefault();
      this.tenues.add(ev.code);
      this.debut.set(ev.code, performance.now());
      this.fronts.push(ev.code);
      this.derniere = performance.now();
    };
    const haut = (ev: KeyboardEvent) => {
      if (!this.tenues.has(ev.code)) return;
      this.tenues.delete(ev.code);
      this.relaches.push({ code: ev.code, duree: (performance.now() - (this.debut.get(ev.code) ?? performance.now())) / 1000 });
      this.debut.delete(ev.code);
      if (this.capture && this.action(ev.code)) ev.preventDefault();
    };
    const perdu = () => { this.tenues.clear(); this.debut.clear(); };
    window.addEventListener('keydown', bas, true);
    window.addEventListener('keyup', haut, true);
    window.addEventListener('blur', perdu);
    return () => {
      window.removeEventListener('keydown', bas, true);
      window.removeEventListener('keyup', haut, true);
      window.removeEventListener('blur', perdu);
    };
  }

  est(a: ActionClavier, table: Record<ActionClavier, string[]>): boolean {
    return table[a].some((c) => this.tenues.has(c));
  }
}

// ---------------------------------------------------------------------------
// LE PILOTE
// ---------------------------------------------------------------------------

export interface RappelsPilotage {
  /** Choisir la caméra du match (le pilote ne le fait que si le joueur n'en a pas choisi une autre). */
  surCamera: (c: Camera3D) => void;
  /** Le joueur demande la pause (touche, bouton). */
  surPause: () => void;
  vibrer: (ms: number) => void;
  /** Le joueur va prendre la main : l'écran rend le tempo au jeu normal (on ne conduit pas à ×4). */
  surPrise: () => void;
}

export interface ContexteImage {
  moi: Pion | undefined;
  pause: boolean;
  /** L'avant-match (équipes, tunnel) occupe encore l'écran. */
  avantMatch: boolean;
  /** Le joueur a-t-il changé de caméra lui-même ? Alors on ne la lui reprend pas. */
  cameraChoisie: Camera3D;
}

export class PilotageDirect {
  phase: PhasePilotage = 'attente';
  appareil: Appareil = 'clavier';
  tactile: EntreeTactile = { stick: { x: 0, y: 0 }, sprint: false, pied: null, file: [], actif: 0 };
  /** Le tutoriel d'entrée (premier contrôle). */
  tuto: TutorielDirect | null = null;

  private clavier = new Clavier();
  private lecteur = new LecteurManette();
  private manette: EtatManette = MANETTE_ABSENTE;
  private abonnes = new Set<() => void>();
  private snap: SnapPilotage;
  private jsonSnap = '';
  private derniereSnap = 0;
  private tEntree = 0;
  private pause = false;
  private cameraAuto = false;
  private tvJusqua = 0;
  private enTV = false;
  private nToast = 0;
  private dernierRetour = -1;
  private toast: { cle: string; n: number; jusqua: number } | null = null;
  /** Les passes « tap ou maintien » : où en est chaque appui. */
  private passes = new Map<string, { debut: number; long: boolean }>();
  private pied: { source: Appareil; depuis: number } | null = null;
  private manetteDroite = { x: 0, t: 0 };
  private kickVise: { puissance: number } | null = null;
  private veutDernier = false;
  private sprintActuel = false;
  private visee: { x: number; y: number; puissance: number } | null = null;
  private rappels: RappelsPilotage;
  /** Les responsabilités : le capitaine, le tir, l'engagement, la touche (Correctif 17). */
  readonly resp = new PiloteResp();
  /** Où pointe la souris, dans le repère de la scène (posé par le HUD quand la visée à la souris est voulue). */
  souris: { x: number; y: number; t: number; h: number } | null = null;

  constructor(rappels: RappelsPilotage) {
    this.rappels = rappels;
    // Un téléphone ou une tablette : le pouce est l'appareil de départ, il n'y a pas de clavier à attendre.
    try {
      if (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) this.appareil = 'tactile';
    } catch {
      // Pas de matchMedia (rendu serveur, test) : le clavier reste l'appareil par défaut.
    }
    this.snap = this.photographier(null, null, lirePreferencesControle().aidePlacement);
  }

  // ── Abonnements : le HUD se rafraîchit seul, sans repasser par le rendu du match ──
  abonner = (cb: () => void): (() => void) => { this.abonnes.add(cb); return () => { this.abonnes.delete(cb); }; };
  lire = (): SnapPilotage => this.snap;

  /** Écoute le clavier ; à appeler une fois, au montage de l'écran de match. */
  attacher(): () => void {
    return this.clavier.attacher();
  }

  /** Le pilote conduit-il ? (Échap met alors en pause au lieu de quitter le match.) */
  get actif(): boolean { return this.phase === 'actif'; }
  get enPause(): boolean { return this.pause; }
  get cameraDirecte(): boolean { return this.phase !== 'attente' && this.cameraAuto; }
  /** Le joueur veut le contrôle direct et la scène est là pour le porter : les cartes de décision se taisent. */
  get voulu(): boolean { return this.veutDernier; }
  /** La carte d'accueil du tutoriel fige le match derrière elle. */
  get fige(): boolean { return this.phase === 'actif' && (!!this.tuto?.fige || this.resp.fige); }
  /** Facteur de vitesse que le tutoriel demande au match (1 : normal). */
  get vitesseTuto(): number { return this.phase === 'actif' ? (this.tuto?.vitesse ?? 1) : 1; }
  /** Échap ou le bouton de pause : c'est l'écran qui décide ce qu'il en fait. */
  demanderPause(): void { this.rappels.surPause(); }

  /** La caméra réellement affichée : le choix du joueur, sauf sur les phases qui ne lui appartiennent pas. */
  cameraPour(choix: Camera3D, e: EtatMatch, maintenant = performance.now()): Camera3D {
    if (choix !== 'joueur') return choix;
    // La touche : on voit l'alignement entier, pas le dos du lanceur.
    if (e.responsabilites?.attente?.type === 'touche') { this.enTV = true; this.tvJusqua = maintenant + 900; return 'tv'; }
    // Le joueur qui tape : la caméra se place derrière lui, face aux poteaux ou au terrain, pour viser.
    if (this.resp.zoneOuverte && (e.tir?.etape === 'vise' || e.phase === 'coupEnvoi')) { this.enTV = false; return 'joueur'; }
    if (PHASES_SPECTACLE.has(e.phase)) { this.enTV = true; this.tvJusqua = maintenant + 900; return 'tv'; }
    if (this.enTV && maintenant < this.tvJusqua) return 'tv';
    this.enTV = false;
    return 'joueur';
  }

  vibrer(ms: number): void {
    if (!lirePreferencesControle().vibrations) return;
    if (this.appareil === 'manette') this.lecteur.vibrer(ms, 0.5);
    else this.rappels.vibrer(ms);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UNE IMAGE
  // ───────────────────────────────────────────────────────────────────────────
  surImage(e: EtatMatch, scene: Scene3D | null, dt: number, ctx: ContexteImage): void {
    const prefs = lirePreferencesControle();
    const moi = ctx.moi;
    this.clavier.action = (code) => actionDeLaTouche(prefs.touches, code);
    this.manette = this.lecteur.lire();
    this.pause = ctx.pause;

    const veut = prefs.mode === 'direct' && !!scene && !!moi && !e.fini && !ctx.avantMatch;
    this.veutDernier = veut;
    if (!veut) {
      if (this.phase !== 'attente') this.sortir(e, scene, ctx);
      this.clavier.capture = false;
      this.emettre(e, moi ?? null, prefs.aidePlacement, dt);
      return;
    }
    const surLeTerrain = moi.surLeTerrain && moi.sanction <= 0;
    switch (this.phase) {
      case 'attente':
        // Il entre (ou il est là depuis le coup d'envoi) : la scène attend qu'il ait fini d'entrer, puis la caméra vient derrière lui.
        if (surLeTerrain && !scene.entreeEnCours(moi.id)) {
          this.phase = 'entree';
          this.tEntree = 0;
          this.rappels.surPrise();
          this.cameraAuto = ctx.cameraChoisie === 'tv';
          if (this.cameraAuto) this.rappels.surCamera('joueur');
        }
        break;
      case 'entree':
        if (!surLeTerrain) { this.sortir(e, scene, ctx); break; }
        this.tEntree += dt;
        // Le contrôle ne passe qu'à la fin du glissé : la caméra est derrière lui, le HUD est apparu.
        if (this.tEntree >= DUREE_ENTREE) {
          this.phase = 'actif';
          activerDirect(e, true);
          if (!prefs.tutorielVu && !this.tuto && !tutorielsDesactives()) this.tuto = new TutorielDirect();
        }
        break;
      case 'actif':
        if (!surLeTerrain) { this.sortir(e, scene, ctx); break; }
        break;
    }
    this.clavier.capture = this.phase === 'actif' && !this.pause;
    if (this.phase === 'actif' && e.direct?.actif) this.conduire(e, scene, moi, dt, prefs);
    else {
      // Entrée, ou attente : on garde les yeux ouverts (la manette se branche, une touche s'apprend) sans rien commander.
      this.clavier.fronts.length = 0; this.clavier.relaches.length = 0; this.tactile.file.length = 0;
      scene.reperes = null;
    }
    this.emettre(e, moi, prefs.aidePlacement, dt);
  }

  private sortir(e: EtatMatch, scene: Scene3D | null, ctx: ContexteImage): void {
    if (e.direct?.actif) activerDirect(e, false);
    if (scene) scene.reperes = null;
    if (this.cameraAuto && ctx.cameraChoisie === 'joueur') this.rappels.surCamera('tv');
    this.cameraAuto = false;
    this.phase = 'attente';
    this.resp.reinitialiser();
    this.sprintActuel = false;
    this.pied = null;
    this.passes.clear();
    this.clavier.fronts.length = 0; this.clavier.relaches.length = 0; this.clavier.brutes.length = 0; this.tactile.file.length = 0;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LIRE LES DOIGTS, PUIS COMMANDER
  // ───────────────────────────────────────────────────────────────────────────
  private conduire(e: EtatMatch, scene: Scene3D, moi: Pion, dt: number, prefs: ReturnType<typeof lirePreferencesControle>): void {
    const d = e.direct!;
    const vue = d.vue;
    const maintenant = performance.now();
    const rep = scene.reperesCamera();
    const t = prefs.touches;
    const cl = this.clavier;
    const ma = this.manette;

    // ── La pause et la carte d'accueil du tutoriel ne commandent rien : on lit seulement de quoi les refermer ──
    if (this.pause || this.tuto?.fige) {
      commanderDirect(e, 0, 0, false);
      poserViseur(e, null);
      this.kickVise = null;
      this.sprintActuel = false;
      this.pied = null;
      this.passes.clear();
      this.tactile.file.length = 0;
      this.tactile.pied = null;
      const fronts = cl.fronts.splice(0);
      cl.relaches.length = 0;
      let pause = false, valider = false;
      for (const code of fronts) {
        const a = actionDeLaTouche(t, code);
        if (a === 'pause') pause = true;
        else if (a === 'action') valider = true;
      }
      for (const b of ma.fronts) {
        if (b === INDEX_BOUTON.start) pause = true;
        else if (b === INDEX_BOUTON.a) valider = true;
      }
      if (valider && this.tuto?.fige) this.tuto.continuer();
      if (pause) this.rappels.surPause();
      scene.reperes = null;
      return;
    }

    // ── LES RESPONSABILITÉS : quand le jeu attend le joueur, il ne conduit plus — il répond ──
    const brutes = cl.brutes.splice(0);
    const tenuesAvant = cl.fronts.splice(0);
    const occupe = this.resp.surImage(e, scene, moi, {
      dt, maintenant, appareil: this.appareil, fronts: tenuesAvant, brutes, tenues: cl.tenues,
      tables: { haut: t.haut, bas: t.bas, gauche: t.gauche, droite: t.droite, action: t.action, coupDePied: t.coupDePied },
      manette: ma, droiteY: rep.droite.y,
    });
    if (occupe) {
      commanderDirect(e, 0, 0, false);
      poserViseur(e, null);
      this.kickVise = null; this.sprintActuel = false; this.pied = null; this.passes.clear();
      cl.relaches.length = 0; this.tactile.file.length = 0; this.tactile.pied = null;
      const r = d.retour;
      if (r && r.t !== this.dernierRetour) this.dernierRetour = r.t;
      return;
    }
    // Rien n'attend : les touches de jeu lues plus haut reviennent aux intentions.
    cl.fronts.push(...tenuesAvant);
    this.resp.noterConseilDrop(vue.possible.drop, maintenant);

    // ── La souris, quand le joueur la veut : le point qu'elle désigne est celui où partirait le ballon ──
    this.visee = prefs.souris ? this.viseeSouris(scene, moi) : null;

    // ── Le stick, vu de l'écran (x à droite, y vers le haut) ────────────────
    let sx = 0, sy = 0;
    const tenu = (a: ActionClavier) => cl.est(a, t);
    const kx = (tenu('droite') ? 1 : 0) - (tenu('gauche') ? 1 : 0);
    const ky = (tenu('haut') ? 1 : 0) - (tenu('bas') ? 1 : 0);
    let sprint = tenu('sprint');
    const meilleur = (x: number, y: number) => { if (Math.hypot(x, y) > Math.hypot(sx, sy)) { sx = x; sy = y; } };
    if (kx || ky) { const n = Math.hypot(kx, ky); meilleur(kx / n, ky / n); this.appareil = 'clavier'; }
    if (ma.connectee && ma.activite) { this.appareil = 'manette'; meilleur(ma.stick.x, ma.stick.y); sprint = sprint || ma.sprint; }
    else if (ma.connectee) meilleur(ma.stick.x, ma.stick.y);
    const tac = this.tactile;
    if (maintenant - tac.actif < 3000 && (tac.stick.x || tac.stick.y || tac.sprint || tac.pied)) {
      this.appareil = 'tactile';
      meilleur(tac.stick.x, tac.stick.y);
      sprint = sprint || tac.sprint;
    }
    if (cl.fronts.length && !(ma.connectee && ma.activite)) this.appareil = 'clavier';

    // ── La direction sur le terrain : ce que le joueur voit droit devant est « devant » ──
    const mx = rep.avant.x * sy + rep.droite.x * sx;
    const my = rep.avant.y * sy + rep.droite.y * sx;
    commanderDirect(e, vue.libre ? mx : 0, vue.libre ? my : 0, vue.libre && sprint);
    this.sprintActuel = vue.libre && sprint;

    // ── Les intentions de l'image ───────────────────────────────────────────
    const intentions: Intention[] = [];
    this.intentionsClavier(intentions, t, maintenant, sx, sy);
    this.intentionsManette(intentions, ma, maintenant, sx, sy, rep, e, moi);
    for (const i of tac.file.splice(0)) intentions.push(i);

    // ── Le coup de pied qui se prépare : clavier et manette chargent, le pouce glisse ──
    const kick = this.lireKick(maintenant, sx, sy);
    this.kickVise = kick && vue.possible.coupDePied ? { puissance: kick.puissance } : null;
    if (kick && vue.possible.coupDePied) {
      const vx = rep.avant.x * kick.y + rep.droite.x * kick.x, vy = rep.avant.y * kick.y + rep.droite.y * kick.x;
      const n = Math.hypot(vx, vy) || 1;
      poserViseur(e, { x: vx / n, y: vy / n, puissance: kick.puissance });
    } else poserViseur(e, null);

    for (const i of intentions) this.appliquer(e, scene, moi, i, rep, sx, sy);

    // ── Le tutoriel regarde ce que le joueur fait, et l'aide ──────────────
    this.tuto?.surImage(e, moi, { dt, sprint: sprint && vue.libre, appareil: this.appareil, bouge: Math.hypot(mx, my) > 0.2 });
    if (this.tuto?.fini) { ecrirePreferencesControle({ tutorielVu: true }); this.tuto = null; if (d.assistance) d.assistance.appelAssure = false; }

    // ── Ce que la scène dessine sur la pelouse ──────────────────────────────
    scene.reperes = this.reperes(e, moi, rep, kick, prefs.aidePlacement);

    // ── Le retour du moteur : une phrase quand un geste n'a pas pu se jouer ──
    const r = d.retour;
    if (r && r.t !== this.dernierRetour) {
      this.dernierRetour = r.t;
      if (!r.ok && r.raison) this.toast = { cle: `cd.refus.${r.raison}`, n: ++this.nToast, jusqua: maintenant + 1400 };
      else if (r.ok && (r.action === 'plaquage' || r.action === 'raffut' || r.action === 'crochet')) this.vibrer(18);
    }
    if (this.toast && maintenant > this.toast.jusqua) this.toast = null;
    void dt;
  }

  /** Le repère unitaire du « côté » d'écran demandé : −1 gauche, +1 droite, en repère terrain. */
  private vers(rep: ReturnType<Scene3D['reperesCamera']>, cote: number) { return produit(rep.droite, cote); }

  private intentionsClavier(sortie: Intention[], t: ReturnType<typeof lirePreferencesControle>['touches'], maintenant: number, sx: number, sy: number): void {
    const cl = this.clavier;
    const fronts = cl.fronts.splice(0), relaches = cl.relaches.splice(0);
    const action = (code: string) => actionDeLaTouche(t, code);
    for (const code of fronts) {
      switch (action(code)) {
        case 'passeGauche': this.passes.set(`c:${code}`, { debut: maintenant, long: false }); break;
        case 'passeDroite': this.passes.set(`c:${code}`, { debut: maintenant, long: false }); break;
        case 'coupDePied': if (!this.pied) this.pied = { source: 'clavier', depuis: maintenant }; break;
        case 'raffut': sortie.push({ type: 'raffut' }); break;
        case 'crochet': sortie.push({ type: 'crochet', cote: Math.abs(sx) > 0.35 ? (sx > 0 ? 1 : -1) : 0 }); break;
        case 'drop': sortie.push({ type: 'drop', auto: Math.hypot(sx, sy) < 0.3, x: sx, y: sy || 1 }); break;
        case 'action': sortie.push({ type: 'action' }); break;
        case 'appel': sortie.push({ type: 'appel' }); break;
        case 'gratter': sortie.push({ type: 'gratter' }); break;
        case 'aide': sortie.push({ type: 'aide' }); break;
        case 'pause': sortie.push({ type: 'pause' }); break;
        default: break;
      }
    }
    // Les passes : un appui bref donne une passe courte au relâchement, un appui tenu une passe sautée dès qu'il dure.
    for (const [cle, p] of [...this.passes]) {
      if (!cle.startsWith('c:')) continue;
      const code = cle.slice(2);
      const a = action(code);
      if (a !== 'passeGauche' && a !== 'passeDroite') { this.passes.delete(cle); continue; }
      const cote = a === 'passeGauche' ? -1 : 1;
      if (!p.long && maintenant - p.debut >= SEUIL_MAINTIEN * 1000 && this.clavier.tenues.has(code)) {
        p.long = true;
        sortie.push({ type: 'passe', cote, longue: true });
      }
    }
    for (const r of relaches) {
      const p = this.passes.get(`c:${r.code}`);
      if (p) {
        this.passes.delete(`c:${r.code}`);
        const a = action(r.code);
        if (!p.long && (a === 'passeGauche' || a === 'passeDroite')) sortie.push({ type: 'passe', cote: a === 'passeGauche' ? -1 : 1, longue: false });
      }
      if (action(r.code) === 'coupDePied' && this.pied?.source === 'clavier') {
        const duree = (maintenant - this.pied.depuis) / 1000;
        this.pied = null;
        sortie.push(this.piedDepuis(duree, sx, sy, 'clavier'));
      }
    }
    void sy;
  }

  private intentionsManette(sortie: Intention[], ma: EtatManette, maintenant: number, sx: number, sy: number, rep: ReturnType<Scene3D['reperesCamera']>, e: EtatMatch, moi: Pion): void {
    if (!ma.connectee) return;
    const vue = e.direct!.vue;
    const cote = (b: number) => b; void cote;
    // Côté « principal » de A : celui où le stick pousse, sinon le côté ouvert du jeu (traduit en gauche/droite d'écran).
    const coteA: -1 | 1 = Math.abs(sx) > 0.35 ? (sx > 0 ? 1 : -1) : coteEcranDuOuvert(rep, e.ouvert);
    for (const b of ma.fronts) {
      if (b === INDEX_BOUTON.a) {
        if (vue.porte) this.passes.set('m:a', { debut: maintenant, long: false }); else sortie.push({ type: 'action' });
      } else if (b === INDEX_BOUTON.x) {
        if (vue.porte) this.passes.set('m:x', { debut: maintenant, long: false }); else sortie.push({ type: 'gratter' });
      } else if (b === INDEX_BOUTON.b) {
        // LB tenu + B : le drop (Correctif 17). B seul : le coup de pied.
        if (ma.boutons[INDEX_BOUTON.lb] && vue.porte) sortie.push({ type: 'drop', auto: Math.hypot(sx, sy) < 0.3, x: sx, y: sy || 1 });
        else if (!this.pied) this.pied = { source: 'manette', depuis: maintenant };
      }
      else if (b === INDEX_BOUTON.y) sortie.push(vue.porte ? { type: 'feinte', cote: 0 } : { type: 'appel' });
      else if (b === INDEX_BOUTON.rb) sortie.push({ type: 'raffut' });
      else if (b === INDEX_BOUTON.lb) { if (!ma.boutons[INDEX_BOUTON.b]) sortie.push({ type: 'crochet', cote: Math.abs(sx) > 0.35 ? (sx > 0 ? 1 : -1) : 0 }); }
      else if (b === INDEX_BOUTON.start) sortie.push({ type: 'pause' });
      else if (b === 14) this.passes.set('m:g', { debut: maintenant, long: false });
      else if (b === 15) this.passes.set('m:d', { debut: maintenant, long: false });
    }
    const coteDe = (cle: string): -1 | 1 => cle === 'm:a' ? coteA : cle === 'm:x' ? (coteA === 1 ? -1 : 1) : cle === 'm:g' ? -1 : 1;
    const indexDe: Record<string, number> = { 'm:a': INDEX_BOUTON.a, 'm:x': INDEX_BOUTON.x, 'm:g': 14, 'm:d': 15 };
    for (const [cle, p] of [...this.passes]) {
      if (!cle.startsWith('m:')) continue;
      if (!p.long && maintenant - p.debut >= SEUIL_MAINTIEN * 1000 && ma.boutons[indexDe[cle]]) {
        p.long = true;
        sortie.push({ type: 'passe', cote: coteDe(cle), longue: true });
      }
    }
    for (const b of ma.relaches) {
      const cle = Object.keys(indexDe).find((k) => indexDe[k] === b);
      if (cle) {
        const p = this.passes.get(cle);
        this.passes.delete(cle);
        if (p && !p.long) sortie.push({ type: 'passe', cote: coteDe(cle), longue: false });
      }
      if (b === INDEX_BOUTON.b && this.pied?.source === 'manette') {
        const duree = (maintenant - this.pied.depuis) / 1000;
        this.pied = null;
        sortie.push(this.piedDepuis(duree, sx, sy, 'manette'));
      }
    }
    // Le stick droit : un coup sec à gauche ou à droite est un crochet.
    const dx = ma.droit.x;
    if (Math.abs(dx) > 0.78 && Math.abs(this.manetteDroite.x) < 0.4 && maintenant - this.manetteDroite.t > 380) {
      sortie.push({ type: 'crochet', cote: dx > 0 ? 1 : -1 });
      this.manetteDroite.t = maintenant;
    }
    this.manetteDroite.x = dx;
    void moi;
  }

  /** Un coup de pied lâché : sans direction ni durée, la situation choisit ; sinon la visée et la charge décident. */
  private piedDepuis(duree: number, sx: number, sy: number, source: Appareil): Intention {
    // Souris : le pointeur désigne l'arrivée ; un appui trop bref (un tapotement) laisse la situation choisir.
    if (source === 'clavier' && this.visee && duree >= 0.2) {
      return { type: 'pied', auto: false, x: this.visee.x, y: this.visee.y, puissance: this.visee.puissance, vif: 0 };
    }
    const aVise = Math.hypot(sx, sy) > 0.3;
    if (duree < 0.2 && !aVise) return { type: 'pied', auto: true, x: 0, y: 1, puissance: 0.5, vif: 0 };
    const puissance = Math.min(1, 0.22 + duree / CHARGE_PIED * 0.78);
    return { type: 'pied', auto: false, x: aVise ? sx : 0, y: aVise ? sy : 1, puissance, vif: source === 'clavier' ? 0 : 0.4 };
  }

  /** La visée de l'instant, tant qu'un appui ou un doigt tient le coup de pied ; `null` sinon. */
  private lireKick(maintenant: number, sx: number, sy: number): { x: number; y: number; puissance: number } | null {
    if (this.pied && (this.pied.source === 'clavier' || this.pied.source === 'manette')) {
      const duree = (maintenant - this.pied.depuis) / 1000;
      if (duree < 0.14) return null;
      if (this.pied.source === 'clavier' && this.visee) return this.visee;
      const aVise = Math.hypot(sx, sy) > 0.3;
      return { x: aVise ? sx : 0, y: aVise ? sy : 1, puissance: Math.min(1, 0.22 + duree / CHARGE_PIED * 0.78) };
    }
    return this.tactile.pied ? viseeTactile(this.tactile.pied, maintenant) : null;
  }

  /** Ce que la souris désigne : direction (repère de l'écran, y vers le haut) et puissance selon la distance au joueur. */
  private viseeSouris(scene: Scene3D, moi: Pion): { x: number; y: number; puissance: number } | null {
    const s = this.souris;
    if (!s || performance.now() - s.t > 3000) return null;
    const p = scene.ecran(moi.id);
    if (!p) return null;
    const dx = s.x - p.x, dy = p.y - s.y;
    const L = Math.hypot(dx, dy);
    if (L < 20) return null;
    return { x: dx / L, y: dy / L, puissance: Math.max(0.2, Math.min(1, L / (0.6 * s.h))) };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UNE INTENTION DEVIENT UNE DEMANDE AU MOTEUR
  // ───────────────────────────────────────────────────────────────────────────
  private appliquer(e: EtatMatch, scene: Scene3D, moi: Pion, i: Intention, rep: ReturnType<Scene3D['reperesCamera']>, sx: number, sy: number): void {
    const vue = e.direct!.vue;
    const aEcran = (x: number, y: number) => {
      const vx = rep.avant.x * y + rep.droite.x * x, vy = rep.avant.y * y + rep.droite.y * x;
      const n = Math.hypot(vx, vy) || 1;
      return { x: vx / n, y: vy / n };
    };
    switch (i.type) {
      case 'pause': this.rappels.surPause(); return;
      case 'aide': ecrirePreferencesControle({ aidePlacement: !lirePreferencesControle().aidePlacement }); return;
      default: break;
    }
    if (!vue.libre) return;
    switch (i.type) {
      case 'passe':
        demanderDirect(e, { action: 'passe', vers: this.vers(rep, i.cote), longue: i.longue });
        break;
      case 'pied': {
        if (i.auto) demanderDirect(e, { action: 'coupDePied', auto: true });
        else {
          const v = aEcran(i.x, i.y);
          demanderDirect(e, { action: 'coupDePied', visee: { x: v.x, y: v.y, puissance: i.puissance, vif: i.vif } });
        }
        break;
      }
      case 'raffut': demanderDirect(e, { action: 'raffut' }); break;
      case 'crochet': {
        const cote = i.cote !== 0 ? i.cote : Math.abs(sx) > 0.35 ? (sx > 0 ? 1 : -1) : 0;
        demanderDirect(e, cote ? { action: 'crochet', vers: this.vers(rep, cote) } : { action: 'crochet' });
        break;
      }
      case 'feinte': {
        const cote = i.cote !== 0 ? i.cote : Math.abs(sx) > 0.35 ? (sx > 0 ? 1 : -1) : 1;
        demanderDirect(e, { action: 'feinte', vers: this.vers(rep, cote) });
        break;
      }
      case 'drop': {
        if (i.auto) demanderDirect(e, { action: 'drop', auto: true });
        else {
          const v = aEcran(i.x, i.y);
          demanderDirect(e, { action: 'drop', visee: { x: v.x, y: v.y, puissance: 0.85, vif: 0.4 } });
        }
        break;
      }
      case 'appel': demanderDirect(e, { action: 'appel' }); break;
      case 'gratter': demanderDirect(e, { action: vue.possible.grattage ? 'grattage' : vue.possible.engager ? 'engager' : 'grattage' }); break;
      case 'action': {
        const a = this.actionPrincipale(vue);
        if (a) demanderDirect(e, { action: a });
        break;
      }
    }
    void scene; void sy; void moi;
  }

  /** « Fais ce qu'il faut faire » : l'action évidente de la situation (la barre d'espace, A, le gros bouton). */
  private actionPrincipale(vue: VueDirecte): ActionDirecte | null {
    if (vue.porte) return 'raffut';
    if (vue.possible.plaquage) return 'plaquage';
    if (vue.possible.grattage) return 'grattage';
    if (vue.possible.engager) return 'engager';
    if (vue.possible.appel) return 'appel';
    return null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CE QUE LA SCÈNE DESSINE
  // ───────────────────────────────────────────────────────────────────────────
  private reperes(e: EtatMatch, moi: Pion, rep: ReturnType<Scene3D['reperesCamera']>, kick: { x: number; y: number; puissance: number } | null, aide: boolean): ReperesScene | null {
    const vue = e.direct!.vue;
    if (!vue.libre) return null;
    const r: ReperesScene = {};
    if (aide && vue.suggestion && !vue.porte) { r.suggestion = vue.suggestion; r.horsPoste = vue.horsPoste; }
    if (vue.porte && vue.possible.passe && !kick) {
      const passes: NonNullable<ReperesScene['passes']> = [];
      for (const cote of [-1, 1]) {
        const q = choisirReceveur(e, moi, this.vers(rep, cote), false);
        if (q) passes.push({ id: q.id, fort: true });
      }
      if (passes.length) r.passes = passes;
    }
    if (vue.cibleDePlaquage) r.plaquage = vue.cibleDePlaquage;
    if (kick && vue.possible.coupDePied) {
      const vx = rep.avant.x * kick.y + rep.droite.x * kick.x, vy = rep.avant.y * kick.y + rep.droite.y * kick.x;
      const n = Math.hypot(vx, vy) || 1;
      const plan = classerCoupDePied(e, moi, { visee: { x: vx / n, y: vy / n, puissance: kick.puissance } });
      r.visee = { arrivee: { x: Math.max(-5, Math.min(130, plan.arrivee.x)), y: Math.max(-4, Math.min(LARGEUR + 4, plan.arrivee.y)) }, puissance: kick.puissance };
    }
    void sens;
    return r;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LE CLICHÉ QUE LIT LE HUD
  // ───────────────────────────────────────────────────────────────────────────
  private photographier(e: EtatMatch | null, moi: Pion | null, aide: boolean): SnapPilotage {
    const d = e?.direct;
    const v = d?.vue;
    return {
      phase: this.phase,
      visible: this.phase === 'actif' || (this.phase === 'entree' && this.tEntree > 0.7),
      appareil: this.appareil,
      manette: this.manette.type,
      libre: !!v?.libre,
      raison: v?.raison ?? null,
      porte: !!v?.porte,
      attaque: !!v?.attaque,
      endurance: Math.round(moi?.endurance ?? 100),
      famille: moi ? famillePoste(moi) : 'ailier',
      possible: v?.possible ?? { passe: false, coupDePied: false, raffut: false, crochet: false, plaquage: false, grattage: false, appel: false, feinte: false, engager: false, drop: false },
      contactImminent: !!v?.contactImminent,
      horsJeu: !!v?.horsJeu,
      horsPoste: !!v?.horsPoste,
      aide,
      appelActif: !!d?.appel,
      toast: this.toast ? { cle: this.toast.cle, n: this.toast.n } : null,
      kick: this.kickVise ? { puissance: Math.round(this.kickVise.puissance * 20) / 20 } : null,
      tuto: this.tuto?.snapshot() ?? null,
      pause: this.pause,
      aPoste: !!v?.suggestion,
      recharge: v ? (Object.entries(v.recharge) as [ActionDirecte, number][]).filter(([, s]) => s > 0).map(([a]) => a) : [],
      arme: v?.arme ?? null,
      sprint: this.sprintActuel,
      resp: this.resp.lire,
    };
  }

  private emettre(e: EtatMatch, moi: Pion | null, aide: boolean, dt: number): void {
    void dt;
    const maintenant = performance.now();
    if (maintenant - this.derniereSnap < (this.resp.zoneOuverte ? 34 : 90)) return;
    this.derniereSnap = maintenant;
    const s = this.photographier(e, moi, aide);
    const json = JSON.stringify(s);
    if (json === this.jsonSnap) return;
    this.jsonSnap = json;
    this.snap = s;
    for (const a of this.abonnes) a();
  }
}

/**
 * La visée d'un doigt posé sur le bouton de coup de pied. `dx, dy` sont en pixels de RÉFÉRENCE (le HUD divise
 * par son échelle) : la même longueur de glissé donne la même puissance sur un téléphone ou une tablette.
 */
export function viseeTactile(p: NonNullable<EntreeTactile['pied']>, maintenant: number): { x: number; y: number; puissance: number } | null {
  const L = Math.hypot(p.dx, p.dy);
  const duree = (maintenant - p.depuis) / 1000;
  if (L < 14) return duree > 0.3 ? { x: 0, y: 1, puissance: Math.min(1, 0.4 + duree * 0.5) } : null;
  return { x: p.dx / L, y: -p.dy / L, puissance: Math.min(1, L / 150 + 0.1 * Math.min(1, p.vif)) };
}

/** Le doigt se lève : un tapotement laisse la situation choisir, un maintien ou un glissé fixent la frappe. */
export function intentionPiedTactile(p: NonNullable<EntreeTactile['pied']>, maintenant: number): Intention {
  const L = Math.hypot(p.dx, p.dy);
  const duree = (maintenant - p.depuis) / 1000;
  if (L < 14 && duree < 0.3) return { type: 'pied', auto: true, x: 0, y: 1, puissance: 0.5, vif: 0 };
  const v = viseeTactile(p, maintenant) ?? { x: 0, y: 1, puissance: 0.5 };
  return { type: 'pied', auto: false, x: v.x, y: v.y, puissance: v.puissance, vif: Math.min(1, p.vif) };
}

/** Le côté de l'écran où se trouve ce côté du terrain : utile aux repères du HUD. */
export function coteEcranDuOuvert(rep: ReturnType<Scene3D['reperesCamera']>, ouvert: 1 | -1): -1 | 1 {
  return rep.droite.y * ouvert >= 0 ? 1 : -1;
}
