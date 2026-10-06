// LE PILOTE DES RESPONSABILITÉS — l'hôte de ce que le jeu demande au joueur : capitaine, tir, engagement, touche (Correctif 17).
//
// Le moteur sait attendre (`e.responsabilites.attente`) et résoudre (`trancherPenalite`, `tirerHumain`, `engagerHumain`,
// `choisirCombinaisonTouche`, `lancerLaTouche`, `demanderToucheRapide`). Ce module est ce qui les relie à des DOIGTS : il lit le clavier,
// la manette, la souris et le pouce, tient la visée (`ControleurVisee`), affiche ce que la scène peut montrer (le repère de visée sur
// la pelouse) et photographie, pour le HUD, tout ce qu'il y a à dessiner.
//
// ⚠️ IL NE DÉCIDE D'AUCUNE RÈGLE. « Frapper » devient `tirerHumain(visée)` ; c'est le moteur qui lit la géométrie du vol, qui compte
// les points, qui dit si le ballon passe. ⚠️ Et il n'écrit dans le moteur que depuis la boucle de l'écran (`surImage`) : le HUD dépose
// des demandes, ce module les exécute — jamais de mutation du match depuis un gestionnaire d'évènement React.
//
// ⚠️ LES TROIS APPAREILS PRODUISENT LA MÊME VISÉE (`visee.ts`) : on peut changer de manette ou de souris en plein tir sans rien casser.

import type { EtatMatch } from '../moteur/etat';
import {
  aideDeTir, choisirCombinaisonTouche, demanderToucheRapide, engagerHumain, lancerLaTouche, tirerHumain, trancherPenalite,
  type AideDeTir,
} from '../moteur/moteur';
import type { ChoixPenalite, CombinaisonTouche, DecisionCapitaine, TypeAttente } from '../moteur/responsabilites';
import { COMBINAISONS_TOUCHE } from '../moteur/responsabilites';
import { porteeEngagement } from '../moteur/tirHumain';
import { AXE, LIGNE_A, LIGNE_B, MILIEU, sens } from '../moteur/terrain';
import type { Pion } from '../moteur/entites';
import type { ReperesScene, Scene3D } from '../match3D';
import { INDEX_BOUTON, type EtatManette } from './manette';
import { ControleurVisee, type EtatVisee } from './visee';
import { ecrirePreferencesControle, lirePreferencesControle } from './prefs';
import { tutorielsDesactives } from '../tutoriel/memoire';

export type Appareil = 'clavier' | 'tactile' | 'manette';
export type TutoResp = 'penalite' | 'tir' | 'engagement' | 'touche' | 'drop';
export type PanneauResp = 'penalite' | 'tir' | 'engagement' | 'touche';

/** Les touches que le pilote lit en plus des actions remappées : choisir (1 à 8), valider, la touche rapide. */
export const TOUCHES_BRUTES = new Set([
  'Enter', 'NumpadEnter', 'KeyT',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8',
  'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8',
]);

/** Le côté maximal que la visée peut prendre dans le plan des poteaux (m) et sur le terrain d'engagement (m). */
const COTE_TIR = 7;
const COTE_ENGAGEMENT = 28;
/** Largeur de référence d'un écran de téléphone : le glissé du pouce est rapporté à elle. */
const LARGEUR_REF = 390;

/** Ce que le HUD demande au pilote : exécuté dans la boucle de l'écran, jamais depuis un gestionnaire React. */
export type DemandeResp =
  | { t: 'penalite'; choix: ChoixPenalite }
  | { t: 'combinaison'; choix: CombinaisonTouche }
  | { t: 'rapide' }
  | { t: 'hauteur'; h: number }
  | { t: 'valider' }
  | { t: 'compris' };

/** Un évènement de pointeur sur la zone de visée : le HUD les traduit en coordonnées de la zone. */
export interface EvenementPointeur {
  type: 'bas' | 'bouge' | 'haut' | 'annule' | 'molette' | 'survol';
  /** Position dans la zone, en pixels, et dimensions de la zone. */
  x: number; y: number; w: number; h: number;
  pointeur: 'souris' | 'doigt';
  /** Molette : crans (positif vers le haut). */
  crans?: number;
  /** Souris : bouton principal. */
  principal?: boolean;
}

export interface SnapResp {
  /** Le signe de la droite de l'écran sur l'axe y du terrain (le vent et le côté visé se lisent avec). */
  sens: 1 | -1;
  /** Ce que le jeu attend du joueur ; `null` : rien (seuls le bandeau du capitaine IA et les invites vivent). */
  panneau: PanneauResp | null;
  appareil: Appareil;
  /** Secondes simulées restantes avant que l'IA tranche à sa place (le chrono ne court qu'une fois le jeu prêt). */
  reste: number | null;
  delai: number;
  /** Le tutoriel de cette responsabilité est affiché : le match est figé derrière. */
  tuto: TutoResp | null;
  penalite: {
    distance: number; angle: number; chance: number; suggestion: DecisionCapitaine | null; aPortee: boolean;
    buteur: string;
  } | null;
  tir: (Pick<AideDeTir, 'distance' | 'angle' | 'chance' | 'utile' | 'ventDos' | 'ventTravers' | 'derive' | 'valeur'> & { aide: boolean; buteur: string }) | null;
  engagement: { hauteur: number; portee: number; distance: number } | null;
  touche: {
    pret: boolean; choix: CombinaisonTouche | null; annoncee: CombinaisonTouche | null; combinaisons: CombinaisonTouche[];
    rapide: { possible: boolean } | null; lanceur: string;
  } | null;
  visee: EtatVisee | null;
  /** La zone de visée est ouverte (le HUD place son calque de pointeur). */
  zone: boolean;
  /** La manette : mode de tir et symbole de validation. */
  modeManette: 'direct' | 'charge';
  /** Le dernier choix d'un capitaine IA : un bandeau de quelques secondes. */
  derniere: { cote: 'A' | 'B'; choix: ChoixPenalite; raison: string; humain: boolean; n: number } | null;
  /** Un geste est refusé ou vient d'être joué : une phrase brève (`rv.retour.*`). */
  retour: { cle: string; n: number } | null;
  /** Une invite qui ne fige pas le jeu : le drop est possible pour la première fois. */
  conseil: TutoResp | null;
}

const bornerN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

interface EntreesResp {
  dt: number;
  maintenant: number;
  appareil: Appareil;
  /** Fronts de touches remappées et de touches brutes depuis la dernière image, et touches tenues. */
  fronts: string[];
  brutes: string[];
  tenues: ReadonlySet<string>;
  /** Codes des actions : ce que valent « haut/bas/gauche/droite », « action » et « coup de pied » dans les touches du joueur. */
  tables: { haut: string[]; bas: string[]; gauche: string[]; droite: string[]; action: string[]; coupDePied: string[] };
  manette: EtatManette;
  /** « Droit devant » et « à droite » vus de la caméra : le signe de la droite de l'écran en y du terrain. */
  droiteY: number;
}

export class PiloteResp {
  private visee = new ControleurVisee();
  private file: DemandeResp[] = [];
  private evenements: EvenementPointeur[] = [];
  private cle = '';
  private hauteur = 0.6;
  private surligne: CombinaisonTouche | null = null;
  private tuto: TutoResp | null = null;
  private conseil: TutoResp | null = null;
  private conseilJusqua = 0;
  private vus = new Set<string>(lirePreferencesControle().tutosResp);
  private derniereLue = -1;
  private derniereVue: SnapResp['derniere'] = null;
  private nDerniere = 0;
  private retour: { cle: string; n: number; jusqua: number } | null = null;
  private nRetour = 0;
  private snap: SnapResp = this.vide(0);
  private zone = false;

  /** Le HUD dépose une demande (un bouton touché, un clic). */
  demander(d: DemandeResp): void { this.file.push(d); if (this.file.length > 8) this.file.shift(); }
  pointeur(ev: EvenementPointeur): void { this.evenements.push(ev); if (this.evenements.length > 120) this.evenements.shift(); }

  get lire(): SnapResp { return this.snap; }
  /** Le match attend une réponse du joueur (le HUD normal s'éteint) ou un tutoriel est affiché. */
  get occupe(): boolean { return this.snap.panneau !== null; }
  /** Le tutoriel d'une responsabilité fige le match derrière sa carte. */
  get fige(): boolean { return !!this.tuto; }
  get zoneOuverte(): boolean { return this.zone && !this.tuto; }

  private dire(cle: string, maintenant: number): void { this.retour = { cle, n: ++this.nRetour, jusqua: maintenant + 1600 }; }

  /** Marque un tutoriel comme vu : il ne reviendra pas (préférence de l'appareil). */
  private vu(id: TutoResp): void {
    this.vus.add(id);
    ecrirePreferencesControle({ tutosResp: [...this.vus] });
  }

  /** Le drop vient d'être possible pour la première fois : une invite brève, qui ne fige rien. */
  noterConseilDrop(possible: boolean, maintenant: number): void {
    if (!possible || this.vus.has('drop') || tutorielsDesactives()) return;
    this.vu('drop');
    this.conseil = 'drop';
    this.conseilJusqua = maintenant + 7000;
  }

  /**
   * Une image. Renvoie `true` quand le jeu attend le joueur ou qu'une carte d'explication est affichée : le pilote ne lit alors RIEN
   * d'autre (le stick et les gestes de jeu sont éteints).
   */
  surImage(e: EtatMatch, scene: Scene3D, moi: Pion, ent: EntreesResp): boolean {
    const r = e.responsabilites;
    const a = r?.attente ?? null;
    if (this.conseil && ent.maintenant > this.conseilJusqua) this.conseil = null;
    if (this.retour && ent.maintenant > this.retour.jusqua) this.retour = null;
    // Le dernier choix d'un capitaine IA : un bandeau, même quand rien n'attend.
    const d = r?.derniere;
    if (d && !d.humain && d.t !== this.derniereLue && moi && d.cote === moi.cote) {
      this.derniereLue = d.t;
      this.derniereVue = { cote: d.cote, choix: d.decision.choix, raison: d.decision.raison, humain: false, n: ++this.nDerniere };
    } else if (d && d.humain && d.t !== this.derniereLue) {
      this.derniereLue = d.t;
    }
    if (!r || !a || e.fini) {
      this.cle = ''; this.zone = false; this.file.length = 0; this.evenements.length = 0;
      this.tuto = null; this.surligne = null;
      this.snap = this.vide(ent.maintenant);
      return false;
    }
    const type: TypeAttente = a.type;
    // Un nouvel appel : visée remise à zéro, tutoriel s'il n'a pas été vu.
    const cle = `${type}:${Math.round(a.depuis * 100)}`;
    if (cle !== this.cle) {
      this.cle = cle;
      this.file.length = 0; this.evenements.length = 0;
      const aide = type === 'tir' ? aideDeTir(e) : null;
      this.visee.reinitialiser(type === 'tir' && aide && lirePreferencesControle().aideTir ? bornerN(aide.utile + 0.1, 0.35, 1) : type === 'touche' ? 0.55 : 0.7, ent.maintenant);
      this.hauteur = 0.6;
      this.surligne = type === 'touche' ? a.annoncee ?? null : null;
      const id = type === 'penalite' ? 'penalite' : type === 'tir' ? 'tir' : type === 'engagement' ? 'engagement' : 'touche';
      if (!this.vus.has(id) && !tutorielsDesactives()) this.tuto = id;
    }
    // Les touches et boutons lus ici ne servent à rien d'autre.
    const cl = ent.fronts, br = ent.brutes, ma = ent.manette;
    const touche = (...codes: string[]) => br.some((c) => codes.includes(c));
    const valider = ent.tables.action.some((c) => cl.includes(c)) || touche('Enter', 'NumpadEnter');

    // ── Une carte d'explication : on la lit, on la ferme ────────────────────
    if (this.tuto) {
      const ferme = this.file.some((x) => x.t === 'compris') || valider || ma.fronts.includes(INDEX_BOUTON.a);
      this.file.length = 0; this.evenements.length = 0;
      if (ferme) { this.vu(this.tuto); this.tuto = null; }
      this.zone = false;
      this.snap = this.photographier(e, a, ent, null);
      return true;
    }

    const demandes = this.file.splice(0);
    const evenements = this.evenements.splice(0);
    let commit: 'valider' | null = null;

    // ═══ LA PÉNALITÉ : un choix ═══════════════════════════════════════════════
    if (type === 'penalite') {
      this.zone = false;
      let choix: ChoixPenalite | null = null;
      for (const q of demandes) if (q.t === 'penalite') choix = q.choix;
      const ordre: ChoixPenalite[] = ['points', 'touche', 'melee', 'rapide'];
      const numero = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].findIndex((c, i) => touche(c, `Numpad${i + 1}`));
      if (numero >= 0) choix = ordre[numero];
      // A, B, X, Y : poteaux, touche, mêlée, jeu rapide (les symboles sont affichés sur les boutons).
      for (const b of ma.fronts) {
        if (b === INDEX_BOUTON.a) choix = 'points';
        else if (b === INDEX_BOUTON.b) choix = 'touche';
        else if (b === INDEX_BOUTON.x) choix = 'melee';
        else if (b === INDEX_BOUTON.y) choix = 'rapide';
      }
      // Entrée : suivre le conseil du vice-capitaine.
      if (!choix && touche('Enter', 'NumpadEnter') && a.suggestion) choix = a.suggestion.choix;
      if (choix && trancherPenalite(e, choix)) this.dire('rv.retour.decide', ent.maintenant);
      this.consommer(ent);
      this.snap = this.photographier(e, a, ent, null);
      return true;
    }

    // ═══ LE TIR ET L'ENGAGEMENT : une visée ═══════════════════════════════════
    const aVisee = type === 'tir' || type === 'engagement' || (type === 'touche' && !!a.pret);
    this.zone = aVisee;
    if (type === 'engagement') {
      for (const q of demandes) if (q.t === 'hauteur') this.hauteur = bornerN(q.h, 0, 1);
      for (const [i, h] of [0.2, 0.6, 1].entries()) if (touche(`Digit${i + 1}`, `Numpad${i + 1}`)) this.hauteur = h;
      for (const b of ma.fronts) {
        if (b === INDEX_BOUTON.lb) this.hauteur = bornerN(this.hauteur - 0.4, 0, 1);
        else if (b === INDEX_BOUTON.rb) this.hauteur = bornerN(this.hauteur + 0.4, 0, 1);
      }
    }
    if (type === 'touche') {
      // La combinaison : touches 1 à 7, croix directionnelle + A, ou un bouton du HUD.
      let choisi: CombinaisonTouche | null = null;
      for (const q of demandes) if (q.t === 'combinaison') choisi = q.choix;
      COMBINAISONS_TOUCHE.forEach((c, i) => { if (touche(`Digit${i + 1}`, `Numpad${i + 1}`) && (a.combinaisons ?? []).includes(c)) choisi = c; });
      const liste = a.combinaisons ?? [];
      for (const b of ma.fronts) {
        if (b === 14 || b === 15) {
          const i = Math.max(0, liste.indexOf(this.surligne ?? liste[0]));
          this.surligne = liste[(i + (b === 15 ? 1 : liste.length - 1)) % Math.max(1, liste.length)] ?? null;
        } else if (b === INDEX_BOUTON.a && !a.pret && this.surligne) choisi = this.surligne;
        else if (b === INDEX_BOUTON.y && r.offreToucheRapide) { if (!demanderToucheRapide(e)) this.dire('rv.retour.rapideRefusee', ent.maintenant); }
      }
      if (choisi) {
        if (choisirCombinaisonTouche(e, choisi)) { this.surligne = choisi; this.dire('rv.retour.annonce', ent.maintenant); }
        else this.dire('rv.retour.combinaisonImpossible', ent.maintenant);
      }
      if (touche('KeyT') || demandes.some((q) => q.t === 'rapide')) {
        if (!demanderToucheRapide(e)) this.dire('rv.retour.rapideRefusee', ent.maintenant);
      }
      if (!e.responsabilites?.attente || e.responsabilites.attente.type !== 'touche') { this.consommer(ent); this.snap = this.vide(ent.maintenant); return true; }
    }
    if (aVisee) {
      const v = this.visee;
      // Les évènements de pointeur de la zone : la souris vise et dose, le doigt trace.
      for (const ev of evenements) {
        const k = LARGEUR_REF / bornerN(ev.w, 320, 520);
        if (ev.type === 'survol' && ev.pointeur === 'souris') { if (type !== 'touche') v.souris(ev.x / Math.max(1, ev.w), ent.maintenant); }
        else if (ev.type === 'molette') v.molette(ev.crans ?? 0, ent.maintenant);
        else if (ev.pointeur === 'souris') {
          if (ev.type === 'bas' && ev.principal) commit = 'valider';
        } else if (ev.pointeur === 'doigt') {
          if (ev.type === 'bas') v.doigtDebut(ev.x * k, ev.y * k, ent.maintenant);
          else if (ev.type === 'bouge') v.doigtBouge(ev.x * k, ev.y * k, ent.maintenant);
          else if (ev.type === 'haut') { if (v.doigtFin()) commit = 'valider'; }
          else if (ev.type === 'annule') v.doigtAnnule();
        }
      }
      // Le clavier : flèches (côté, force), espace ou entrée pour frapper.
      const tient = (cles: string[]) => cles.some((c) => ent.tenues.has(c));
      const dx = (tient(ent.tables.droite) ? 1 : 0) - (tient(ent.tables.gauche) ? 1 : 0);
      const dp = (tient(ent.tables.haut) ? 1 : 0) - (tient(ent.tables.bas) ? 1 : 0);
      if (type === 'touche') { if (dp) v.clavier(0, dp, ent.dt, ent.maintenant); }
      else if (dx || dp) v.clavier(dx, dp, ent.dt, ent.maintenant);
      if (valider || ent.tables.coupDePied.some((c) => cl.includes(c))) commit = 'valider';
      // La manette : le mode « direct » (stick droit dose, A frappe) ou « charge » (on tient A, on relâche pour frapper).
      if (ma.connectee) {
        const mode = lirePreferencesControle().tirManette;
        const gachette = ma.boutons[INDEX_BOUTON.rt] ? 1 : 0;
        const forceStick = ma.droit.y > 0.15 ? ma.droit.y : null;
        const charge = mode === 'charge' ? !!ma.boutons[INDEX_BOUTON.a] || !!gachette : !!gachette;
        v.manette(type === 'touche' ? 0 : ma.stick.x, forceStick, charge, ent.dt, ent.maintenant);
        if (mode === 'charge') {
          if (ma.relaches.includes(INDEX_BOUTON.a) || ma.relaches.includes(INDEX_BOUTON.rt)) { if (v.relacherCharge()) commit = 'valider'; }
        } else {
          if (ma.fronts.includes(INDEX_BOUTON.a)) commit = 'valider';
          if (ma.relaches.includes(INDEX_BOUTON.rt)) { if (v.relacherCharge()) commit = 'valider'; }
        }
      }
      if (demandes.some((q) => q.t === 'valider')) commit = 'valider';
      v.rafraichir(ent.maintenant);

      // Frapper : le moteur lit la géométrie. Pour une touche, il faut d'abord annoncer ; pour le reste, tout est prêt.
      if (commit === 'valider') {
        const l = v.lire(ent.maintenant);
        const sgn = ent.droiteY >= 0 ? 1 : -1;
        if (type === 'tir') {
          if (tirerHumain(e, { ecart: l.x * COTE_TIR * sgn, puissance: l.p, effet: l.effet, geste: l.geste })) this.dire('rv.retour.frappe', ent.maintenant);
        } else if (type === 'engagement') {
          const portee = a.portee ?? porteeEngagement(moi.puissance, moi.pied, moi.endurance);
          const distance = 10.5 + l.p * Math.max(0, portee - 10.5);
          if (engagerHumain(e, { distance, ecart: l.x * COTE_ENGAGEMENT * sgn, hauteur: this.hauteur, geste: l.geste })) this.dire('rv.retour.frappe', ent.maintenant);
        } else if (type === 'touche') {
          if (!lancerLaTouche(e, { puissance: l.p, geste: l.geste })) this.dire('rv.retour.attendre', ent.maintenant);
          else this.dire('rv.retour.lance', ent.maintenant);
        }
      }
    }
    this.consommer(ent);

    // ── Ce que la scène dessine sur la pelouse : où le ballon irait, jamais s'il passe ──
    scene.reperes = this.reperes(e, a, moi, ent.droiteY);
    this.snap = this.photographier(e, a, ent, aVisee ? this.visee.etat : null);
    return true;
  }

  /** Les fronts lus ici ne seront pas relus par le reste du pilote. */
  private consommer(ent: EntreesResp): void { ent.fronts.length = 0; ent.brutes.length = 0; }

  private reperes(e: EtatMatch, a: NonNullable<EtatMatch['responsabilites']>['attente'] & object, moi: Pion, droiteY: number): ReperesScene | null {
    const sgn = droiteY >= 0 ? 1 : -1;
    const x = this.visee.etat.x, p = this.visee.etat.p;
    if (a.type === 'tir' && e.tir) {
      const ligne = e.tir.buteur.cote === 'A' ? LIGNE_B : LIGNE_A;
      return { visee: { arrivee: { x: ligne, y: AXE + x * COTE_TIR * sgn }, puissance: p } };
    }
    if (a.type === 'engagement') {
      const portee = a.portee ?? porteeEngagement(moi.puissance, moi.pied, moi.endurance);
      const s = sens(moi.cote);
      return { visee: { arrivee: { x: MILIEU + s * (10.5 + p * Math.max(0, portee - 10.5)), y: AXE + x * COTE_ENGAGEMENT * sgn }, puissance: p } };
    }
    return null;
  }

  private photographier(e: EtatMatch, a: NonNullable<NonNullable<EtatMatch['responsabilites']>['attente']>, ent: EntreesResp, visee: EtatVisee | null): SnapResp {
    const prefs = lirePreferencesControle();
    const r = e.responsabilites!;
    const restant = a.type === 'touche' && !a.pret ? null : Math.max(0, a.delai - (e.sim - a.depuis));
    const aide = a.type === 'tir' ? aideDeTir(e) : null;
    const moi = e.pions.find((p) => p.moi);
    const buteurNom = e.tir?.buteur.nom ?? '';
    const portee = a.type === 'engagement' && moi ? (a.portee ?? porteeEngagement(moi.puissance, moi.pied, moi.endurance)) : 0;
    return {
      panneau: a.type === 'toucheRapide' ? 'touche' : a.type,
      sens: ent.droiteY >= 0 ? 1 : -1,
      appareil: ent.appareil,
      reste: restant, delai: a.delai,
      tuto: this.tuto,
      penalite: a.type === 'penalite' ? {
        distance: a.distance ?? 0, angle: a.angle ?? 0, chance: Math.round((a.chance ?? 0) * 100),
        suggestion: prefs.conseilCapitaine ? a.suggestion ?? null : null,
        aPortee: (a.distance ?? 99) < 50 && (a.angle ?? 99) < 26,
        buteur: moi?.nom ?? '',
      } : null,
      tir: aide ? {
        distance: Math.round(aide.distance), angle: Math.round(aide.angle), chance: Math.round(aide.chance * 100), utile: aide.utile,
        ventDos: aide.ventDos, ventTravers: aide.ventTravers, derive: aide.derive, valeur: aide.valeur, aide: prefs.aideTir, buteur: buteurNom,
      } : null,
      engagement: a.type === 'engagement' && visee ? {
        hauteur: this.hauteur, portee: Math.round(portee), distance: Math.round(10.5 + visee.p * Math.max(0, portee - 10.5)),
      } : null,
      touche: a.type === 'touche' ? {
        pret: !!a.pret, choix: r.touche?.choix ?? null, annoncee: a.annoncee ?? null, combinaisons: a.combinaisons ?? [],
        rapide: r.offreToucheRapide ? { possible: r.offreToucheRapide.possible } : null,
        lanceur: moi?.nom ?? '',
      } : null,
      visee: visee ? { ...visee, x: Math.round(visee.x * 100) / 100, p: Math.round(visee.p * 100) / 100, geste: Math.round(visee.geste * 100) / 100, effet: Math.round(visee.effet * 100) / 100 } : null,
      zone: this.zone && !this.tuto,
      modeManette: prefs.tirManette,
      derniere: this.derniereVue,
      retour: this.retour ? { cle: this.retour.cle, n: this.retour.n } : null,
      conseil: this.conseil,
    };
  }

  /** Le joueur rend la main (remplacé, cartes) : plus rien n'attend, plus rien ne s'affiche. */
  reinitialiser(): void {
    this.cle = ''; this.zone = false; this.file.length = 0; this.evenements.length = 0; this.tuto = null; this.surligne = null;
    this.conseil = null; this.retour = null; this.derniereVue = null;
    this.snap = this.vide(0);
  }

  /** Un cliché sans panneau : le bandeau du capitaine IA, la dernière phrase de retour et l'invite du drop vivent sans lui. */
  private vide(maintenant: number): SnapResp {
    void maintenant;
    return {
      panneau: null, sens: 1, appareil: 'clavier', reste: null, delai: 0, tuto: null, penalite: null, tir: null, engagement: null, touche: null,
      visee: null, zone: false, modeManette: lirePreferencesControle().tirManette,
      derniere: this.derniereVue,
      retour: this.retour ? { cle: this.retour.cle, n: this.retour.n } : null, conseil: this.conseil,
    };
  }
}
