// LA VISÉE — un geste, trois appareils, une seule loi (Correctif 17).
//
// Demande : « tir mobile au doigt (direction, longueur = puissance, courbure = effet, relâcher = frappe) ; tir PC (souris
// horizontale = direction, molette = puissance en %, clic/touche = frappe, variante clavier flèches + espace) ; manette
// (stick gauche direction, stick droit ou gâchette puissance, bouton de validation, plusieurs modes) ».
//
// ⚠️ CE FICHIER NE CONNAÎT NI LE MOTEUR NI LE DOM. Il reçoit des lectures brutes (une position de souris, un cran de molette,
// un stick, un doigt posé) et tient une visée : le côté, la force, l'effet, et la RÉGULARITÉ du geste — c'est elle que le moteur
// traduit en dispersion (`tirHumain.ts`). Le pilote lui passe les lectures, le HUD affiche ce qu'il tient.
//
// ⚠️ LA RÉGULARITÉ SE GAGNE, ET ELLE SE LIT DE LA MÊME FAÇON PARTOUT : au clavier, à la souris et à la manette, c'est le calme
// qui précède la frappe (frapper une demi-seconde après avoir bougé donne un geste brouillon) ; au doigt, c'est la netteté du
// tracé (un glissé tremblé donne un geste brouillon, un geste franc un geste net).

export type SourceVisee = 'souris' | 'clavier' | 'manette' | 'doigt';

export interface EtatVisee {
  /** De −1 (tout à gauche de l'écran) à +1 (tout à droite) : le côté visé, tel que le joueur le voit. */
  x: number;
  /** De 0 à 1 : la force dosée. */
  p: number;
  /** De −1 à 1 : la courbure demandée (la boucle que dessine le doigt). */
  effet: number;
  /** De 0 à 1 : la régularité du geste en cours. */
  geste: number;
  source: SourceVisee | null;
  /** Un doigt est posé, ou la touche de charge est tenue : la frappe part au relâchement. */
  arme: boolean;
}

export const REGLAGES_VISEE = {
  /** Glissé de référence (pixels) pour une force pleine, sur un cadre de 390 px de large. */
  longueurPleine: 170,
  /** Au-dessous, le doigt n'a rien décidé : un tapotement, pas une frappe. */
  longueurMinimale: 24,
  /** Inclinaison du glissé (degrés) qui vise le bord de la zone. */
  inclinaisonPleine: 25,
  /** Un cran de molette, en force (2 % : on lit 70 %, 72 %, 74 %). */
  cranMolette: 0.02,
  /** Vitesse des flèches : le côté (zone/s) et la force (par seconde), qui accélèrent quand on les tient. */
  fleches: { cote: 0.9, force: 0.5, accel: 1.6 },
  /** Charge d'une touche ou d'une gâchette tenue : de 0 à la force pleine en tant de secondes. */
  chargeDuree: 1.4,
  /** Calme (ms) sans changer la visée pour un geste net. */
  calme: 700,
  /** Plancher de la régularité : frapper dans la seconde ne ruine pas le tir. */
  plancherGeste: 0.4,
} as const;

const borner = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function visee0(): EtatVisee {
  return { x: 0, p: 0.7, effet: 0, geste: 0.5, source: null, arme: false };
}

interface Point { x: number; y: number; t: number }

export class ControleurVisee {
  etat: EtatVisee = visee0();
  private dernierChangement = 0;
  private trace: Point[] = [];
  private chargeDepuis: number | null = null;
  private vitesseFleche = { cote: 0, force: 0 };

  /** Remet la visée à zéro pour un nouveau tir : force de départ, côté neutre. */
  reinitialiser(force = 0.7, maintenant = 0): void {
    this.etat = { ...visee0(), p: borner(force, 0, 1) };
    this.dernierChangement = maintenant;
    this.trace = [];
    this.chargeDepuis = null;
    this.vitesseFleche = { cote: 0, force: 0 };
  }

  private bouger(source: SourceVisee, maintenant: number): void {
    this.etat.source = source;
    this.dernierChangement = maintenant;
  }

  /** La régularité du moment : le calme qui précède, pour les appareils à visée posée. */
  private calmer(maintenant: number): number {
    const calme = borner((maintenant - this.dernierChangement) / REGLAGES_VISEE.calme, 0, 1);
    return REGLAGES_VISEE.plancherGeste + (1 - REGLAGES_VISEE.plancherGeste) * calme;
  }

  /** Lire la régularité courante (à appeler à chaque image pour que le HUD la montre). */
  rafraichir(maintenant: number): void {
    if (this.etat.source !== 'doigt') this.etat.geste = this.calmer(maintenant);
  }

  // ── La souris : le côté suit le pointeur, la molette dose la force ──────────
  /** `xRel` : la position du pointeur dans la zone, de 0 (gauche) à 1 (droite). */
  souris(xRel: number, maintenant: number): void {
    const x = borner(xRel * 2 - 1, -1, 1);
    if (Math.abs(x - this.etat.x) > 0.004) this.bouger('souris', maintenant);
    this.etat.x = x;
    this.etat.source = 'souris';
  }

  /** `crans` : positif vers le haut (plus de force), négatif vers le bas. */
  molette(crans: number, maintenant: number): void {
    if (!crans) return;
    this.etat.p = borner(this.etat.p + crans * REGLAGES_VISEE.cranMolette, 0, 1);
    this.bouger('souris', maintenant);
  }

  // ── Le clavier : flèches pour le côté et la force, qui accélèrent ──────────
  /** `dx`, `dp` : −1, 0 ou 1 selon les flèches tenues. */
  clavier(dx: number, dp: number, dt: number, maintenant: number): void {
    const F = REGLAGES_VISEE.fleches;
    const v = this.vitesseFleche;
    v.cote = dx ? Math.min(F.cote * F.accel, (v.cote || F.cote * 0.35) * (1 + dt * 1.2)) : 0;
    v.force = dp ? Math.min(F.force * F.accel, (v.force || F.force * 0.35) * (1 + dt * 1.2)) : 0;
    if (dx) { this.etat.x = borner(this.etat.x + Math.sign(dx) * v.cote * dt, -1, 1); this.bouger('clavier', maintenant); }
    if (dp) { this.etat.p = borner(this.etat.p + Math.sign(dp) * v.force * dt, 0, 1); this.bouger('clavier', maintenant); }
    if (!dx && !dp) this.etat.source ??= 'clavier';
  }

  // ── La manette : le stick gauche vise, la force se dose ou se charge ─────
  /**
   * `stickX` : stick gauche, de −1 à 1 (le côté suit la position du stick). `forceStick` : le stick droit vers le haut, de 0 à 1,
   * ou `null` s'il n'est pas touché. `charge` : un bouton (A) ou une gâchette est tenu, et la force MONTE tant qu'il l'est.
   * Renvoie `true` à l'instant où une charge qui vient d'être relâchée doit frapper (voir `relacherCharge`).
   */
  manette(stickX: number, forceStick: number | null, charge: boolean, dt: number, maintenant: number): void {
    if (Math.abs(stickX) > 0.12) {
      const x = borner(stickX, -1, 1);
      if (Math.abs(x - this.etat.x) > 0.01) this.bouger('manette', maintenant);
      this.etat.x = x;
    }
    if (forceStick !== null && forceStick > 0.12) {
      const p = borner(forceStick, 0, 1);
      if (Math.abs(p - this.etat.p) > 0.01) this.bouger('manette', maintenant);
      this.etat.p = p;
    }
    if (charge) {
      if (this.chargeDepuis === null) { this.chargeDepuis = maintenant; this.etat.p = 0; }
      this.etat.p = borner(this.etat.p + dt / REGLAGES_VISEE.chargeDuree, 0, 1);
      this.etat.arme = true;
      this.bouger('manette', maintenant);
    }
  }

  /** La charge est relâchée : la force reste où elle était montée, et il faut frapper. */
  relacherCharge(): boolean {
    const etait = this.chargeDepuis !== null;
    this.chargeDepuis = null;
    this.etat.arme = false;
    return etait;
  }

  // ── Le doigt : direction, longueur, courbure — relâcher frappe ─────────────
  /** Coordonnées en pixels de RÉFÉRENCE (le HUD divise par son échelle) : même glissé, même force sur tout écran. */
  doigtDebut(x: number, y: number, maintenant: number): void {
    this.trace = [{ x, y, t: maintenant }];
    this.etat.source = 'doigt';
    this.etat.arme = true;
    this.dernierChangement = maintenant;
    this.etat.p = 0;
    this.etat.x = 0;
    this.etat.effet = 0;
    this.etat.geste = 0.5;
  }

  doigtBouge(x: number, y: number, maintenant: number): void {
    if (!this.trace.length) return;
    this.trace.push({ x, y, t: maintenant });
    if (this.trace.length > 160) this.trace.splice(1, 1);
    this.lireLeTrace();
  }

  /** Le doigt se lève : `true` s'il a décidé quelque chose (assez long), `false` pour un tapotement. */
  doigtFin(): boolean {
    const decide = this.trace.length > 1 && this.longueur() >= REGLAGES_VISEE.longueurMinimale;
    if (decide) this.lireLeTrace();
    const etat = decide;
    this.trace = [];
    this.etat.arme = false;
    return etat;
  }

  /** Le glissé est abandonné : on le ramène au point de départ, ou on lève le doigt hors de la zone. */
  doigtAnnule(): void {
    this.trace = [];
    this.etat.arme = false;
  }

  private longueur(): number {
    const a = this.trace[0], b = this.trace[this.trace.length - 1];
    return a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
  }

  private lireLeTrace(): void {
    const R = REGLAGES_VISEE;
    const a = this.trace[0], b = this.trace[this.trace.length - 1];
    if (!a || !b) return;
    const dx = b.x - a.x, dy = b.y - a.y;
    const L = Math.hypot(dx, dy);
    this.etat.p = borner(L / R.longueurPleine, 0, 1);
    if (L >= R.longueurMinimale) {
      // L'inclinaison du glissé par rapport à la verticale : vers le haut de l'écran et un peu de côté.
      const theta = Math.atan2(dx, -dy) * 180 / Math.PI;
      this.etat.x = borner(theta / R.inclinaisonPleine, -1, 1);
    }
    this.etat.effet = this.courbure(L);
    this.etat.geste = this.nettete(L);
  }

  /** La boucle du tracé : la flèche du point le plus écarté de la corde, rapportée à la corde (positive : bombée à droite). */
  private courbure(L: number): number {
    if (this.trace.length < 5 || L < REGLAGES_VISEE.longueurMinimale) return 0;
    const a = this.trace[0], b = this.trace[this.trace.length - 1];
    let pire = 0;
    for (const p of this.trace) {
      // Distance signée à la corde : le produit vectoriel, normalisé.
      const d = ((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / L;
      if (Math.abs(d) > Math.abs(pire)) pire = d;
    }
    return borner((pire / L) / 0.12, -1, 1);
  }

  /** La netteté du tracé : un tracé franc a des changements de cap doux, un tracé tremblé les enchaîne. */
  private nettete(L: number): number {
    if (this.trace.length < 6 || L < REGLAGES_VISEE.longueurMinimale) return 0.5;
    // On ne garde qu'un point tous les 8 px pour que la fréquence d'échantillonnage ne compte pas.
    const pts: Point[] = [this.trace[0]];
    for (const p of this.trace) {
      const q = pts[pts.length - 1];
      if (Math.hypot(p.x - q.x, p.y - q.y) >= 8) pts.push(p);
    }
    if (pts.length < 4) return 0.7;
    let somme = 0, n = 0;
    for (let i = 2; i < pts.length; i++) {
      const c1 = Math.atan2(pts[i - 1].y - pts[i - 2].y, pts[i - 1].x - pts[i - 2].x);
      const c2 = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
      const d = Math.atan2(Math.sin(c2 - c1), Math.cos(c2 - c1));
      somme += d * d; n++;
    }
    const tremblement = Math.sqrt(somme / Math.max(1, n));
    // 0,15 rad (9°) de changement de cap par pas : un tracé de main ferme ; 0,6 rad : un doigt qui tremble.
    return borner(1 - (tremblement - 0.12) / 0.55, REGLAGES_VISEE.plancherGeste * 0.6, 1);
  }

  // ── La frappe ────────────────────────────────────────────────────────────
  /** Ce que le joueur a visé, à l'instant de la frappe. */
  lire(maintenant: number): { x: number; p: number; effet: number; geste: number } {
    if (this.etat.source !== 'doigt') this.etat.geste = this.calmer(maintenant);
    return { x: this.etat.x, p: this.etat.p, effet: this.etat.effet, geste: this.etat.geste };
  }
}
