// LE TUTORIEL D'ENTRÉE — six gestes, dans le match, sans le figer plus qu'il ne faut.
//
// Demande : « la première fois que le joueur entre sur le terrain dans sa carrière,
// lancer un petit tutoriel. Pas un énorme tutoriel de 20 minutes : court et
// contextuel. » Six étapes — se déplacer, sprinter, réclamer le ballon, passer, battre
// son défenseur, plaquer — chacune annoncée AU MOMENT où la situation s'y prête, et
// validée par ce que le joueur fait réellement, pas par un « Suivant ».
//
// ⚠️ IL NE SCÉNARISE PAS LE MATCH. Il attend la situation (le ballon est à nous, le
// joueur le porte, un défenseur arrive, un adversaire part avec le ballon) ; quand
// elle tarde trop, il passe à la suivante plutôt que de bloquer. Seules deux aides :
//  - l'appel est assuré (`assistance.appelAssure`) : le porteur de l'IA entend
//    l'appelant, pour que le joueur reçoive son premier ballon sans attendre ;
//  - le jeu passe au ralenti (×0,4) tant qu'une invite est à l'écran et que la
//    situation presse (un défenseur à moins de 9 m, un porteur à moins de 7 m).
//
// ⚠️ « CONTINUER » OU « PASSER LE TUTORIEL » : la première carte, seule, fige le match.
// Une fois fini (ou passé), il ne revient plus tout seul : les réglages le rejouent.

import type { EtatMatch } from '../moteur/etat';
import type { Pion } from '../moteur/entites';
import { distance, sens } from '../moteur/terrain';

export type EtapeTuto = 'intro' | 'deplacer' | 'sprint' | 'appel' | 'passe' | 'duel' | 'plaquer' | 'fin';

export interface SnapTuto {
  etape: EtapeTuto;
  /** De 1 à 6 (0 pour la carte d'accueil). */
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

const ORDRE: EtapeTuto[] = ['deplacer', 'sprint', 'appel', 'passe', 'duel', 'plaquer'];
/** Délai (s réelles) au bout duquel une étape qui n'a pas trouvé sa situation est abandonnée. */
const PATIENCE: Record<string, number> = { deplacer: 16, sprint: 16, appel: 55, passe: 40, duel: 75, plaquer: 100 };
const RALENTI = 0.4;

export class TutorielDirect {
  etape: EtapeTuto = 'intro';
  fini = false;
  private depuis = 0;
  private visible = false;
  private valideJusqua = 0;
  private metres = 0;
  private sprintS = 0;
  private derniere: { x: number; y: number } | null = null;
  private passesAvant = -1;
  private appelFait = false;
  private appelDepuis = 0;
  private duelVu = false;
  private ralenti = false;
  private chrono = 0;

  /** Facteur de vitesse du match demandé par le tutoriel (1 : normal). */
  get vitesse(): number { return this.ralenti ? RALENTI : 1; }
  /** La carte d'accueil fige le match. */
  get fige(): boolean { return this.etape === 'intro'; }

  continuer(): void { if (this.etape === 'intro') this.passerA('deplacer'); }
  passer(): void { this.etape = 'fin'; this.fini = true; this.ralenti = false; }

  private passerA(e: EtapeTuto): void {
    this.etape = e; this.depuis = this.chrono; this.visible = false; this.ralenti = false; this.valideJusqua = 0;
    this.metres = 0; this.sprintS = 0; this.passesAvant = -1; this.appelFait = false; this.duelVu = false;
  }

  private suivante(): void {
    const i = ORDRE.indexOf(this.etape as typeof ORDRE[number]);
    const s = ORDRE[i + 1];
    if (s) this.passerA(s); else { this.etape = 'fin'; this.fini = true; this.ralenti = false; }
  }

  snapshot(): SnapTuto {
    const i = ORDRE.indexOf(this.etape as typeof ORDRE[number]);
    return {
      etape: this.etape, numero: i + 1, total: ORDRE.length, cle: `cd.tuto.${this.etape}`,
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
    const s = sens(moi.cote);
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
        break;
      }
      case 'duel': {
        if (v.porte && v.libre && this.defenseurProche(e, moi, 9)) { this.visible = true; this.duelVu = true; this.ralenti = true; }
        else this.ralenti = false;
        if (this.duelVu && (d.arme?.action === 'raffut' || d.arme?.action === 'crochet')) reussir();
        // Pas de ballon à porter : l'appel (assuré) le lui apportera.
        if (!v.porte && v.possible.appel && dansLEtape > 12 && !d.appel) { this.visible = false; if (d.assistance) d.assistance.appelAssure = true; else d.assistance = { appelAssure: true }; }
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
        void s;
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
