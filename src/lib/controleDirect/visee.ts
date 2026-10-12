// LA VISÉE — UN GESTE, trois appareils, une seule loi (Correctifs 17 et 39).
//
// Correctif 39, demande : « le système actuel pour les transformations est trop chargé. Mobile : uniquement un balayage
// (toucher, glisser dans la direction souhaitée, relâcher). PC : clic maintenu, déplacement de la souris, relâchement —
// comme un swipe. Manette : joystick pour l'orientation, carré maintenu pour charger la puissance, relâcher pour frapper.
// Le même principe pour les engagements. »
//
// ⚠️ IL N'Y A PLUS QU'UN GESTE. Le doigt et la souris tracent le MÊME balayage (`traceDebut` / `traceBouge` / `traceFin`) :
//   · sa DIRECTION donne le côté visé ;
//   · sa LONGUEUR donne la force, sa vitesse y ajoute un peu ;
//   · sa COURBURE donne l'effet d'un tir au but ;
//   · sa VITESSE donne la hauteur d'un coup d'envoi — un geste vif part tendu, un geste posé monte en cloche ;
//   · le RELÂCHER frappe.
// La manette vise au stick gauche, charge au bouton tenu, frappe au relâcher ; son stick dit aussi la hauteur d'un
// engagement (poussé : tendu et profond ; tiré : en cloche). Le clavier garde ses flèches et sa touche d'action : c'est un
// repli discret, pas une seconde interface.
//
// ⚠️ CE FICHIER NE CONNAÎT NI LE MOTEUR NI LE DOM. Il reçoit des lectures brutes (un point, un stick, un bouton tenu) et
// tient une visée : le côté, la force, l'effet, la hauteur, et la RÉGULARITÉ du geste — c'est elle que le moteur traduit en
// dispersion (`tirHumain.ts`). Le geste donne l'INTENTION ; le vent, la distance, le pied et la fatigue font le reste.
//
// ⚠️ LA RÉGULARITÉ SE GAGNE, ET ELLE SE LIT DE LA MÊME FAÇON PARTOUT : au clavier et à la manette, c'est le calme qui
// précède la frappe ; au balayage, c'est la netteté du tracé (un glissé tremblé donne un geste brouillon).

export type SourceVisee = 'souris' | 'clavier' | 'manette' | 'doigt';
/** Ce que le geste commande : un tir au but, un coup d'envoi, un lancer en touche. */
export type ModeVisee = 'tir' | 'engagement' | 'touche';

export interface EtatVisee {
  /** De −1 (tout à gauche de l'écran) à +1 (tout à droite) : le côté visé, tel que le joueur le voit. */
  x: number;
  /** De 0 à 1 : la force dosée. */
  p: number;
  /** De −1 à 1 : la courbure demandée (la boucle que dessine le balayage). */
  effet: number;
  /** De 0 (tendu, rapide) à 1 (en cloche) : la hauteur d'un coup d'envoi. */
  h: number;
  /** De 0 à 1 : la régularité du geste en cours. */
  geste: number;
  source: SourceVisee | null;
  /** Un balayage est en cours, ou le bouton de charge est tenu : la frappe part au relâchement. */
  arme: boolean;
}

export const REGLAGES_VISEE = {
  /** Balayage de référence (pixels) pour une force pleine, sur un cadre de 390 px de large. */
  longueurPleine: 190,
  /** Au-dessous, le geste n'a rien décidé : un tapotement, pas une frappe. */
  longueurMinimale: 26,
  /** Inclinaison du balayage (degrés) qui vise le bord de la zone. */
  inclinaisonPleine: 26,
  /** Part de la force que donne la vitesse du geste (le reste vient de sa longueur) : tir au but seulement. */
  partVitesse: 0.2,
  /** Vitesses du balayage (px de référence par milliseconde) : un geste posé, un geste vif. */
  vitesseLente: 0.22,
  vitesseVive: 1.35,
  /** Vitesse des flèches : le côté (zone/s) et la force (par seconde), qui accélèrent quand on les tient. */
  fleches: { cote: 0.9, force: 0.5, accel: 1.6 },
  /** Charge du bouton tenu : de 0 à la force pleine en tant de secondes. */
  chargeDuree: 1.25,
  /** Calme (ms) sans changer la visée pour un geste net. */
  calme: 700,
  /** Plancher de la régularité : frapper dans la seconde ne ruine pas le tir. */
  plancherGeste: 0.4,
} as const;

const borner = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function visee0(): EtatVisee {
  return { x: 0, p: 0.7, effet: 0, h: 0.6, geste: 0.5, source: null, arme: false };
}

interface Point { x: number; y: number; t: number }

export class ControleurVisee {
  etat: EtatVisee = visee0();
  private mode: ModeVisee = 'tir';
  private dernierChangement = 0;
  private trace: Point[] = [];
  private chargeDepuis: number | null = null;
  private vitesseFleche = { cote: 0, force: 0 };

  /** Remet la visée à zéro pour un nouveau geste : force de départ, côté neutre. */
  reinitialiser(force = 0.7, maintenant = 0, mode: ModeVisee = 'tir'): void {
    this.etat = { ...visee0(), p: borner(force, 0, 1) };
    this.mode = mode;
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

  private parTrace(): boolean { return this.etat.source === 'doigt' || this.etat.source === 'souris'; }

  /** Lire la régularité courante (à appeler à chaque image). */
  rafraichir(maintenant: number): void {
    if (!this.parTrace()) this.etat.geste = this.calmer(maintenant);
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

  /** La hauteur d'un coup d'envoi, posée d'une touche (1 à 3) ou d'un bouton. */
  hauteur(h: number): void { this.etat.h = borner(h, 0, 1); }

  // ── La manette : le stick vise, le bouton tenu charge, le relâcher frappe ────
  /**
   * `stickX`, `stickY` : stick gauche, de −1 à 1 (y vers le haut). Le côté suit le stick ; pour un coup d'envoi, le
   * pousser l'envoie tendu et profond, le tirer l'envoie en cloche. `charge` : le bouton de frappe est tenu, la force
   * MONTE tant qu'il l'est, jusqu'à la limite du joueur.
   */
  manette(stickX: number, stickY: number, charge: boolean, dt: number, maintenant: number): void {
    if (Math.abs(stickX) > 0.12) {
      const x = borner(stickX, -1, 1);
      if (Math.abs(x - this.etat.x) > 0.01) this.bouger('manette', maintenant);
      this.etat.x = x;
    }
    if (this.mode === 'engagement' && Math.abs(stickY) > 0.2) {
      this.etat.h = borner(0.6 - stickY * 0.5, 0, 1);
      this.etat.source = 'manette';
    }
    if (charge) {
      if (this.chargeDepuis === null) { this.chargeDepuis = maintenant; this.etat.p = 0; }
      this.etat.p = borner(this.etat.p + dt / REGLAGES_VISEE.chargeDuree, 0, 1);
      this.etat.arme = true;
      // Charger n'est pas « bouger » : seul le stick trouble le geste.
      this.etat.source = 'manette';
    }
  }

  /** Le bouton est relâché : la force reste où elle était montée, et il faut frapper. */
  relacherCharge(): boolean {
    const etait = this.chargeDepuis !== null;
    this.chargeDepuis = null;
    this.etat.arme = false;
    return etait;
  }

  // ── Le balayage : direction, longueur, vitesse, courbure — relâcher frappe ───
  /** Coordonnées en pixels de RÉFÉRENCE (le HUD divise par son échelle) : même geste, même force sur tout écran. */
  traceDebut(x: number, y: number, maintenant: number, source: 'doigt' | 'souris' = 'doigt'): void {
    this.trace = [{ x, y, t: maintenant }];
    this.etat.source = source;
    this.etat.arme = true;
    this.dernierChangement = maintenant;
    this.etat.p = 0;
    this.etat.x = 0;
    this.etat.effet = 0;
    this.etat.geste = 0.5;
  }

  traceBouge(x: number, y: number, maintenant: number): void {
    if (!this.trace.length) return;
    this.trace.push({ x, y, t: maintenant });
    if (this.trace.length > 160) this.trace.splice(1, 1);
    this.lireLeTrace();
  }

  /** Le geste se termine : `true` s'il a décidé quelque chose (assez long), `false` pour un tapotement. */
  traceFin(): boolean {
    const decide = this.trace.length > 1 && this.longueur() >= REGLAGES_VISEE.longueurMinimale;
    if (decide) this.lireLeTrace();
    this.trace = [];
    this.etat.arme = false;
    return decide;
  }

  /** Le balayage est abandonné (pointeur perdu, second doigt) : rien n'est frappé. */
  traceAnnule(): void {
    this.trace = [];
    this.etat.arme = false;
  }

  /** Un balayage est-il en cours ? */
  get enCours(): boolean { return this.trace.length > 0; }

  private longueur(): number {
    const a = this.trace[0], b = this.trace[this.trace.length - 1];
    return a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
  }

  /** La vitesse du geste, de 0 (posé) à 1 (vif) : sa longueur rapportée à sa durée. */
  private vivacite(L: number): number {
    const R = REGLAGES_VISEE;
    const a = this.trace[0], b = this.trace[this.trace.length - 1];
    const duree = Math.max(16, (b?.t ?? 0) - (a?.t ?? 0));
    return borner((L / duree - R.vitesseLente) / (R.vitesseVive - R.vitesseLente), 0, 1);
  }

  private lireLeTrace(): void {
    const R = REGLAGES_VISEE;
    const a = this.trace[0], b = this.trace[this.trace.length - 1];
    if (!a || !b) return;
    const dx = b.x - a.x, dy = b.y - a.y;
    const L = Math.hypot(dx, dy);
    const longueur = borner(L / R.longueurPleine, 0, 1);
    const vif = this.vivacite(L);
    if (this.mode === 'tir') {
      // La longueur d'abord, la vitesse en appoint : un geste franc porte un peu plus loin que le même geste traîné.
      this.etat.p = borner(longueur * (1 - R.partVitesse) + longueur * vif * R.partVitesse * 1.6, 0, 1);
    } else this.etat.p = longueur;
    if (L >= R.longueurMinimale) {
      // L'inclinaison du balayage par rapport à la verticale : vers le haut de l'écran et un peu de côté.
      const theta = Math.atan2(dx, -dy) * 180 / Math.PI;
      this.etat.x = borner(theta / R.inclinaisonPleine, -1, 1);
      // Coup d'envoi : un geste vif part tendu, un geste posé monte en cloche.
      if (this.mode === 'engagement') this.etat.h = borner(1 - vif * 1.15, 0, 1);
    }
    this.etat.effet = this.mode === 'tir' ? this.courbure(L) : 0;
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
  lire(maintenant: number): { x: number; p: number; effet: number; h: number; geste: number } {
    if (!this.parTrace()) this.etat.geste = this.calmer(maintenant);
    return { x: this.etat.x, p: this.etat.p, effet: this.etat.effet, h: this.etat.h, geste: this.etat.geste };
  }
}
