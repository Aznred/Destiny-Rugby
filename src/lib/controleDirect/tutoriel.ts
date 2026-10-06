// LE TUTORIEL DE CONTRÔLE DU JOUEUR (Correctifs 16 et 20) — dix gestes, dans le match, par petites situations.
//
// Demande : « un vrai tutoriel interactif : pas une liste de commandes, de petites situations où le joueur teste
// vraiment chaque action ». Chaque étape est annoncée AU MOMENT où la situation s'y prête et n'est validée que par ce
// que le joueur fait réellement — jamais par un « Suivant » :
//
//   1 déplacement · 2 sprint · 3 placement (suivre l'anneau vert) · 4 réclamer le ballon (l'IA lui fait la passe) ·
//   5 passe · 6 crochet · 7 raffut · 8 jeu au pied · 9 défense (plaquer) · 10 grattage.
//
// ⚠️ IL NE SCÉNARISE PAS LE MATCH. Il attend la situation (le ballon est à nous, un défenseur arrive, un adversaire part
// avec le ballon) ; quand elle tarde trop, il passe à la suivante plutôt que de bloquer. Seules deux aides :
//  - l'appel est assuré (`assistance.appelAssure`) : le porteur de l'IA entend l'appelant, pour que le joueur reçoive son
//    premier ballon sans attendre ;
//  - le jeu passe au ralenti (×0,4) tant qu'une invite est à l'écran et que la situation presse.
//
// ⚠️ Le tutoriel se REJOUE par sections depuis les Réglages (commandes générales, attaque, défense, jeu au pied).
//
// LES EXPLICATIONS CONTEXTUELLES (`ExplicationsContextuelles`) sont à part : offload, rôle au ruck, passe au pied, placement
// selon le poste. Elles ne s'affichent QUE le jour où la situation arrive, une seule fois, sans figer le match, et jamais
// pendant le tutoriel guidé (les rôles de responsabilité — lanceur, buteur, capitaine — ont leurs propres cartes, `responsabilites.ts`).

import type { EtatMatch } from '../moteur/etat';
import type { Pion } from '../moteur/entites';
import { distance, sens } from '../moteur/terrain';

export type EtapeTuto =
  | 'intro' | 'deplacer' | 'sprint' | 'placement' | 'appel' | 'passe' | 'crochet' | 'raffut' | 'pied' | 'plaquer' | 'gratter' | 'fin';

/** Les sections qu'on peut rejouer depuis les Réglages. */
export type SectionTuto = 'tout' | 'general' | 'attaque' | 'defense' | 'pied';

export const ORDRES_TUTO: Record<SectionTuto, readonly Exclude<EtapeTuto, 'intro' | 'fin'>[]> = {
  tout: ['deplacer', 'sprint', 'placement', 'appel', 'passe', 'crochet', 'raffut', 'pied', 'plaquer', 'gratter'],
  general: ['deplacer', 'sprint', 'placement'],
  attaque: ['appel', 'passe', 'crochet', 'raffut'],
  defense: ['plaquer', 'gratter'],
  pied: ['pied'],
};

export interface SnapTuto {
  etape: EtapeTuto;
  /** De 1 au nombre d'étapes (0 pour la carte d'accueil). */
  numero: number;
  total: number;
  /** Clé de base du texte : la suite (`.tactile`, `.clavier`, `.manette`) dépend de l'appareil. */
  cle: string;
  /** L'invite est à l'écran (la situation est là) ; sinon l'étape attend son moment, sans rien dire. */
  visible: boolean;
  /** L'étape vient d'être réussie : une coche, une seconde, puis la suivante. */
  valide: boolean;
  /** La carte d'accueil : le match est figé derrière. */
  carte: boolean;
  /** Le match passe au ralenti (une situation presse, l'invite est affichée). */
  ralenti: boolean;
}

interface Contexte {
  dt: number;
  sprint: boolean;
  appareil: 'clavier' | 'tactile' | 'manette';
  bouge: boolean;
}

/** Délai (s réelles) au bout duquel une étape qui n'a pas trouvé sa situation est abandonnée. */
const PATIENCE: Record<string, number> = {
  deplacer: 16, sprint: 16, placement: 30, appel: 55, passe: 40, crochet: 70, raffut: 70, pied: 70, plaquer: 100, gratter: 80,
};
const RALENTI = 0.4;

export class TutorielDirect {
  etape: EtapeTuto = 'intro';
  fini = false;
  readonly section: SectionTuto;
  private readonly ordre: readonly Exclude<EtapeTuto, 'intro' | 'fin'>[];
  private depuis = 0;
  private visible = false;
  private valideJusqua = 0;
  private metres = 0;
  private sprintS = 0;
  private derniere: { x: number; y: number } | null = null;
  private passesAvant = -1;
  private piedsAvant = -1;
  private grattagesAvant = -1;
  private appelFait = false;
  private appelDepuis = 0;
  private duelVu = false;
  private surPosteS = 0;
  private ralenti = false;
  private chrono = 0;

  constructor(section: SectionTuto = 'tout') {
    this.section = section;
    this.ordre = ORDRES_TUTO[section] ?? ORDRES_TUTO.tout;
  }

  /** Facteur de vitesse du match demandé par le tutoriel (1 : normal). */
  get vitesse(): number { return this.ralenti ? RALENTI : 1; }
  /** La carte d'accueil fige le match. */
  get fige(): boolean { return this.etape === 'intro'; }

  continuer(): void { if (this.etape === 'intro') this.passerA(this.ordre[0]); }
  passer(): void { this.etape = 'fin'; this.fini = true; this.ralenti = false; }

  private passerA(e: EtapeTuto): void {
    this.etape = e; this.depuis = this.chrono; this.visible = false; this.ralenti = false; this.valideJusqua = 0;
    this.metres = 0; this.sprintS = 0; this.passesAvant = -1; this.piedsAvant = -1; this.grattagesAvant = -1;
    this.appelFait = false; this.duelVu = false; this.surPosteS = 0;
  }

  private suivante(): void {
    const i = this.ordre.indexOf(this.etape as typeof this.ordre[number]);
    const s = this.ordre[i + 1];
    if (s) this.passerA(s); else { this.etape = 'fin'; this.fini = true; this.ralenti = false; }
  }

  snapshot(): SnapTuto {
    const i = this.ordre.indexOf(this.etape as typeof this.ordre[number]);
    return {
      etape: this.etape, numero: i + 1, total: this.ordre.length, cle: `cd.tuto.${this.etape}`,
      visible: this.etape === 'intro' || this.visible || this.chrono < this.valideJusqua, valide: this.chrono < this.valideJusqua,
      carte: this.etape === 'intro', ralenti: this.ralenti,
    };
  }

  /** Une image : regarde ce que fait le joueur et décide d'afficher, de valider ou d'abandonner. */
  surImage(e: EtatMatch, moi: Pion, c: Contexte): void {
    if (this.fini || this.etape === 'intro' || this.etape === 'fin') return;
    this.chrono += c.dt;
    const d = e.direct;
    if (!d) return;
    const v = d.vue;
    const dansLEtape = this.chrono - this.depuis;
    // Une étape réussie laisse sa coche une seconde, puis la suivante démarre.
    if (this.valideJusqua > 0) {
      if (this.chrono >= this.valideJusqua) this.suivante();
      return;
    }
    const reussir = () => { this.valideJusqua = this.chrono + 1.15; this.ralenti = false; if (d.assistance) d.assistance.appelAssure = false; };
    // Trop long : on passe sans bruit, le tutoriel ne bloque jamais.
    if (dansLEtape > (PATIENCE[this.etape] ?? 60)) { this.suivante(); return; }
    /** Pas de ballon à porter : l'appel (assuré) le lui apportera. */
    const apporterLeBallon = () => {
      if (!v.porte && v.possible.appel && dansLEtape > 12 && !d.appel) {
        this.visible = false;
        if (d.assistance) d.assistance.appelAssure = true; else d.assistance = { appelAssure: true };
      }
    };
    switch (this.etape) {
      case 'deplacer': {
        this.visible = true;
        if (v.libre && this.derniere) this.metres += distance(this.derniere, moi.pos);
        this.derniere = { x: moi.pos.x, y: moi.pos.y };
        if (this.metres >= 9 || (dansLEtape > 11 && c.bouge)) reussir();
        break;
      }
      case 'sprint': {
        this.visible = true;
        if (c.sprint && Math.hypot(moi.vitesse.x, moi.vitesse.y) > 3.5) this.sprintS += c.dt;
        if (this.sprintS >= 1.1) reussir();
        break;
      }
      case 'placement': {
        // L'anneau vert montre où l'IA le placerait : l'invite vient quand il est loin, et se valide quand il l'a rejoint.
        const cible = v.suggestion;
        if (!cible || v.porte) { this.visible = false; break; }
        const loin = distance(moi.pos, cible);
        if (loin > 5) this.visible = true;
        if (this.visible && loin < 3.2) this.surPosteS += c.dt; else this.surPosteS = 0;
        if (this.surPosteS >= 0.8) reussir();
        // Déjà à son poste depuis le début : rien à apprendre ici, on enchaîne vite.
        if (!this.visible && dansLEtape > 6) reussir();
        break;
      }
      case 'appel': {
        // L'invite vient quand le ballon est à nous et que l'appel est possible ; l'IA sert alors l'appelant.
        const pret = v.libre && v.possible.appel;
        if (pret || this.appelFait) {
          this.visible = true;
          if (d.assistance) d.assistance.appelAssure = true; else d.assistance = { appelAssure: true };
        }
        if (d.appel && !this.appelFait) { this.appelFait = true; this.appelDepuis = this.chrono; }
        // Réussi quand le ballon arrive, ou quand l'appel s'est éteint après une vraie tentative.
        if (this.appelFait && (v.porte || this.chrono - this.appelDepuis > 7)) reussir();
        break;
      }
      case 'passe': {
        if (this.passesAvant < 0 && v.porte) this.passesAvant = moi.stats.passes;
        if (v.porte && v.libre) {
          this.visible = true;
          // Le ralenti : un défenseur approche, le joueur a le temps de lire.
          this.ralenti = this.defenseurProche(e, moi, 9) && this.chrono - this.depuis < 25;
        } else this.ralenti = false;
        if (this.passesAvant >= 0 && moi.stats.passes > this.passesAvant) reussir();
        // Plaqué ou ballon perdu sans avoir passé : on rattrape l'étape au prochain ballon.
        if (this.passesAvant >= 0 && !v.porte && !v.libre) this.passesAvant = -1;
        apporterLeBallon();
        break;
      }
      case 'crochet':
      case 'raffut': {
        // Le crochet s'apprend à distance (le défenseur arrive), le raffut quand il est presque au contact.
        const rayon = this.etape === 'crochet' ? 10 : 6;
        if (v.porte && v.libre && this.defenseurProche(e, moi, rayon)) { this.visible = true; this.duelVu = true; this.ralenti = true; }
        else this.ralenti = false;
        if (this.duelVu && d.arme?.action === this.etape) reussir();
        apporterLeBallon();
        break;
      }
      case 'pied': {
        if (this.piedsAvant < 0 && v.porte) this.piedsAvant = moi.stats.coupsDePied;
        if (v.porte && v.libre) this.visible = true;
        else if (!v.porte) this.visible = false;
        if (this.piedsAvant >= 0 && moi.stats.coupsDePied > this.piedsAvant) reussir();
        apporterLeBallon();
        break;
      }
      case 'plaquer': {
        const porteur = e.porteur;
        const adverse = !!porteur && porteur.cote !== moi.cote && e.phase === 'jeuCourant';
        if (adverse && v.libre && distance(moi.pos, porteur!.pos) < 14) {
          this.visible = true;
          this.ralenti = distance(moi.pos, porteur!.pos) < 7 && this.chrono - this.depuis < 40;
        } else { this.ralenti = false; }
        if (v.arme === 'plaquage' || (d.retour?.action === 'plaquage' && d.retour.ok)) reussir();
        break;
      }
      case 'gratter': {
        if (this.grattagesAvant < 0) this.grattagesAvant = moi.stats.grattages;
        // Le grattage n'existe qu'au sol, juste après un plaquage : l'invite vient quand le moteur le propose.
        this.visible = v.possible.grattage;
        this.ralenti = v.possible.grattage && this.chrono - this.depuis < 60;
        if (moi.stats.grattages > this.grattagesAvant || (d.retour?.action === 'grattage' && d.retour.ok)) reussir();
        break;
      }
      default: break;
    }
  }

  private defenseurProche(e: EtatMatch, moi: Pion, rayon: number): boolean {
    const s = sens(moi.cote);
    return e.pions.some((q) => q.cote !== moi.cote && q.surLeTerrain && q.sanction <= 0 && !q.corps
      && (q.pos.x - moi.pos.x) * s > -0.5 && distance(q.pos, moi.pos) < rayon);
  }
}

// ---------------------------------------------------------------------------
// LES EXPLICATIONS CONTEXTUELLES — une phrase, le jour où la situation arrive
// ---------------------------------------------------------------------------

export type IdContexte = 'offload' | 'ruck' | 'passePied' | 'placement';

export interface SnapContexte { id: IdContexte; cle: string }

/** Temps d'affichage d'une explication contextuelle (secondes réelles). */
const DUREE_CONTEXTE = 8;

export class ExplicationsContextuelles {
  private chrono = 0;
  private courante: { id: IdContexte; fin: number } | null = null;
  private derniere = -99;
  private horsPosteS = 0;
  private readonly vus: Set<string>;
  private readonly surVu: (vus: string[]) => void;

  constructor(vus: readonly string[], surVu: (vus: string[]) => void) {
    this.vus = new Set(vus);
    this.surVu = surVu;
  }

  snapshot(): SnapContexte | null {
    return this.courante ? { id: this.courante.id, cle: `cd.ctx.${this.courante.id}` } : null;
  }

  /** `bloque` : le tutoriel guidé, une carte de responsabilité ou la pause occupe déjà l'écran. */
  surImage(e: EtatMatch, moi: Pion, dt: number, bloque: boolean, famille: string): void {
    this.chrono += dt;
    if (this.courante && (this.chrono >= this.courante.fin || bloque)) this.courante = null;
    const d = e.direct;
    if (!d || bloque || this.courante || this.chrono - this.derniere < 14) return;
    const v = d.vue;
    if (!v.libre) return;
    const montrer = (id: IdContexte) => {
      if (this.vus.has(id)) return false;
      this.vus.add(id);
      this.surVu([...this.vus]);
      this.courante = { id, fin: this.chrono + DUREE_CONTEXTE };
      this.derniere = this.chrono;
      return true;
    };
    // Première possibilité d'offload : porteur au contact imminent, une passe est possible.
    if (v.porte && v.contactImminent && v.possible.passe && montrer('offload')) return;
    // Rôle au ruck : le moteur propose de nettoyer un regroupement.
    if (!v.porte && v.possible.engager && montrer('ruck')) return;
    // Passe au pied : un demi, un ouvreur ou un arrière a le ballon, un ailier adverse est monté (le coup de pied est possible).
    if (v.porte && v.possible.coupDePied && ['demi', 'ouvreur', 'arriere'].includes(famille) && e.phase === 'jeuCourant' && moi.stats.passes >= 1 && montrer('passePied')) return;
    // Placement selon le poste : l'anneau vert montre où l'équipe a besoin de lui, quand il s'en éloigne longtemps.
    if (!v.porte && v.suggestion && v.horsPoste) {
      this.horsPosteS += dt;
      if (this.horsPosteS > 5 && montrer('placement')) this.horsPosteS = 0;
    } else this.horsPosteS = 0;
  }
}
