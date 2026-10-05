// CHOISIR LE JEU — le demi de mêlée organise, l'ouvreur relit, l'arrière relance.
//
// Le moteur tirait jusqu'ici un lancement au sort dans un tableau par zone :
// le même ballon rapide derrière une défense en retard et le même ballon lent
// devant un rideau en place donnaient le même tirage. Ici chaque option reçoit
// un POIDS, et ce poids se construit en quatre couches :
//
//   1. la ZONE du terrain (on ne joue pas dans ses 22 comme à cinq mètres) ;
//   2. l'IDENTITÉ de l'équipe (ou la consigne de son entraîneur) ;
//   3. la LECTURE de la défense, couloir par couloir (`lecture.ts`) ;
//   4. la SITUATION du match : vitesse du ballon, score, temps.
//
// Le tirage se fait ensuite au prorata des poids. Deux matchs ne se
// ressemblent donc pas — mais une option absurde (écarter à trois contre cinq,
// taper quand il faut un essai) ne sort plus.
//
// ⚠️ UN SEUL TIRAGE PAR DÉCISION, toujours pris au générateur du match : la
// rejoue d'une rencontre reste identique au pas près.

import type { EtatMatch, IntentionPied, Lancement, StyleJeu } from '../etat.js';
import type { Pion } from '../entites.js';
import { AXE, adverse, dansSonCamp, distance, sens, type Cote } from '../terrain.js';
import {
  aPorteeDeTir, attaquantLibre, condense, espaceAutour, lireLaDefense, situer, surnombre,
  type LectureDefense, type Situation, type Zone,
} from './lecture.js';
import { REGLAGES_IA } from './reglages.js';

/** Les quatre familles de jeu, et le goût qu'en a une équipe. */
interface Gout { avants: number; mains: number; pied: number; leurres: number }

const GOUTS: Record<StyleJeu, Gout> = {
  equilibre: { avants: 1, mains: 1, pied: 1, leurres: 1 },
  avants: { avants: 1.5, mains: 0.68, pied: 0.9, leurres: 0.7 },
  large: { avants: 0.72, mains: 1.45, pied: 0.78, leurres: 1.15 },
  pied: { avants: 0.95, mains: 0.82, pied: 1.65, leurres: 0.8 },
  leurres: { avants: 0.88, mains: 1.15, pied: 0.85, leurres: 1.75 },
};

/** La consigne de l'entraîneur prime ; sinon l'identité du club. */
export function goutDe(e: EtatMatch, cote: Cote): Gout {
  const consigne = e.tactiques[cote]?.attaque;
  if (consigne === 'avants') return GOUTS.avants;
  if (consigne === 'large') return GOUTS.large;
  if (consigne === 'occupation') return GOUTS.pied;
  if (consigne === 'equilibre') return GOUTS.equilibre;
  return GOUTS[e.styles?.[cote] ?? 'equilibre'];
}

/** Poids de base de chaque jeu selon la zone : ses 22, son camp, le milieu, le camp adverse, la zone de marque, la ligne. */
const ZONES: Zone[] = ['ses22', 'sonCamp', 'milieu', 'campAdverse', 'zoneDeMarque', 'ligne'];
const BASE: Record<string, number[]> = {
  pickAndGo:   [0.25, 0.45, 0.45, 0.6, 1.1, 3.4],
  departNeuf:  [0.12, 0.3, 0.35, 0.4, 0.55, 0.7],
  cellule:     [0.9, 1.35, 1.4, 1.4, 1.6, 2.2],
  relais:      [0.15, 0.45, 0.55, 0.65, 0.7, 0.5],
  celluleLoin: [0.25, 0.75, 0.85, 0.85, 0.8, 0.4],
  ecran:       [0.08, 0.6, 0.95, 1.15, 1.05, 0.45],
  ouvreur:     [0.45, 1.0, 1.1, 1.1, 0.9, 0.45],
  large:       [0.2, 0.6, 0.95, 1.25, 1.3, 0.7],
  saute:       [0.04, 0.25, 0.4, 0.5, 0.5, 0.2],
  arriere:     [0.04, 0.3, 0.45, 0.6, 0.6, 0.25],
  croisee:     [0.04, 0.25, 0.4, 0.5, 0.5, 0.3],
  redoublee:   [0.02, 0.2, 0.3, 0.4, 0.4, 0.12],
  ferme:       [0.12, 0.35, 0.4, 0.5, 0.6, 0.55],
  boxKick:     [1.3, 0.85, 0.42, 0.1, 0, 0],
  piedOuvreur: [3.4, 0.9, 0.4, 0.08, 0, 0],
};
const base = (jeu: keyof typeof BASE, zone: Zone) => BASE[jeu][ZONES.indexOf(zone)];

/** Ceux que le demi de mêlée a sous la main à la sortie du ballon. */
export interface Acteurs {
  liste: Pion[];
  distributeur: Pion;
  dix?: Pion; douze?: Pion; treize?: Pion; quinze?: Pion;
  ailierOuvert?: Pion; ailierFerme?: Pion;
  /** Pointe de la cellule proche du regroupement. */
  percuteur?: Pion;
  /** Les trois avants de cette cellule, quand ils sont prêts à servir d'écran. */
  bloc: Pion[];
  /** Pointe de la seconde cellule, celle que sert l'ouvreur. */
  percuteurLoin?: Pion;
  /** Un avant debout au pied du regroupement : c'est lui qui ramasse sur un pick and go. */
  auRas?: Pion;
}

interface Option { jeu: string; poids: number; faire: () => Lancement }

function tirer(e: EtatMatch, options: Option[]): Option | undefined {
  let total = 0;
  for (const o of options) total += o.poids;
  if (total <= 0) return undefined;
  let r = e.rng() * total;
  for (const o of options) { r -= o.poids; if (r <= 0) return o; }
  return options[options.length - 1];
}

const chaineDe = (...p: (Pion | undefined)[]) => p.filter((q): q is Pion => !!q);

/** Le coup de pied d'occupation que choisit un botteur depuis son camp, d'après la couverture adverse. */
function piedDepuisSonCamp(e: EtatMatch, botteur: Pion, L: LectureDefense, S: Situation): IntentionPied {
  if (S.zone === 'ses22') return 'degagement';
  // Fond de terrain dégarni : le 50/22 se tente. Rare — il faut le pied et la place.
  if (L.fond <= 1 && botteur.pied > 66 && dansSonCamp(botteur.pos, botteur.cote) && e.rng() < 0.3) return 'cinquanteVingtDeux';
  // Ballon lent ou couverture en place : on tape haut, pour le disputer.
  return e.ballonLent || L.fond >= 3 ? 'chandelle' : 'occupation';
}

/**
 * LE DEMI DE MÊLÉE CHOISIT SON JEU.
 *
 * @param apresArret premier temps de jeu après une mêlée ou une touche : c'est
 *   là que se jouent les combinaisons, la défense n'est pas encore réorganisée.
 */
export function choisirLeJeu(e: EtatMatch, cote: Cote, a: Acteurs, apresArret: boolean): Lancement | null {
  const d = a.distributeur;
  const L = lireLaDefense(e, cote, e.ballon, e.ouvert, d);
  const S = situer(e, cote);
  const g = goutDe(e, cote);
  const s = sens(cote);
  const rapide = !e.ballonLent;
  const avantage = e.avantage ?? 0;
  const phases = e.phasesDepuisArret;
  const chezSoi = S.zone === 'ses22' || S.zone === 'sonCamp';
  const libre = (p?: Pion): p is Pion => !!p && p !== d && attaquantLibre(p);
  const z = S.zone;

  // ── Les quatre familles, modulées par le ballon et par le match ───────────
  const posture = S.posture;
  const mains = g.mains * (rapide ? 1.3 : 0.72) * (1 + 0.14 * Math.max(0, avantage)) * (L.retardataires >= 2 ? 1.25 : 1)
    * (posture === 'prudent' ? 0.55 : posture === 'gestion' ? 0.2 : posture === 'urgence' ? 1.45 : posture === 'troisPoints' ? 0.6 : 1);
  const avants = g.avants * (rapide ? 0.95 : 1.2)
    * (posture === 'gestion' ? 2.3 : posture === 'troisPoints' ? 1.4 : 1);
  const leurres = g.leurres * (rapide ? 1.2 : 0.8) * (apresArret ? 1.5 : 1)
    * (posture === 'prudent' ? 0.5 : posture === 'gestion' ? 0.15 : 1);
  const pied = g.pied * (rapide ? 0.7 : 1.3) * (phases >= 5 && z !== 'zoneDeMarque' && z !== 'ligne' ? 1.45 : 1)
    * (posture === 'urgence' ? 0.05 : posture === 'gestion' ? (chezSoi ? 1.5 : 0.5) : posture === 'prudent' ? 1.25 : 1)
    // Hors de ses 22, un match condensé occupe moins au pied : chaque ballon rendu y pèse quatre fois plus.
    * (z === 'ses22' ? 1 : condense(e) ? REGLAGES_IA.occupationCondensee : REGLAGES_IA.piedReel);

  const decalage = L.milieu.att + L.large.att - L.milieu.def - L.large.def;
  const sLarge = surnombre(L.large);
  const options: Option[] = [];
  const ajouter = (jeu: string, poids: number, faire: () => Lancement) => { if (poids > 0.002) options.push({ jeu, poids, faire }); };

  // ── Au ras : pick and go, départ du 9 ─────────────────────────────────────
  const gardes = L.gardes.ouvert + L.gardes.ferme;
  if (a.auRas || a.percuteur) {
    ajouter('pickAndGo', base('pickAndGo', z) * avants * (gardes <= 1 ? 1.6 : 1) * (rapide ? 0.9 : 1.2), () => ({
      type: 'pickAndGo', chaine: a.auRas ? chaineDe(a.auRas) : chaineDe(d, a.percuteur), index: 0,
      jeu: 'pickAndGo', libelle: 'pick and go',
    }));
  }
  if (d.numero === 9) {
    const sansGarde = L.gardes.ouvert === 0 || L.gardes.ferme === 0;
    const coteLibre = L.gardes.ouvert === 0 ? e.ouvert : L.gardes.ferme === 0 && L.espaceFerme > 7 ? -e.ouvert : e.ouvert;
    ajouter('departNeuf', base('departNeuf', z) * (sansGarde ? 2.6 : 0.7) * (rapide ? 1.5 : 0.3) * (0.55 + d.evitement / 150)
      * (posture === 'gestion' ? 0.3 : 1), () => ({
      type: 'pickAndGo', chaine: [d], index: 0, couloir: coteLibre * 4.5,
      jeu: 'departNeuf', libelle: 'départ du demi de mêlée',
    }));
  }

  // ── Les cellules d'avants : en percussion, en relais, ou servies par l'ouvreur ──
  if (libre(a.percuteur)) {
    const percuteur = a.percuteur;
    ajouter('cellule', base('cellule', z) * avants * (L.ras.def <= L.ras.att ? 1.2 : 1), () => ({
      type: 'ras', chaine: [d, percuteur], index: 0, jeu: 'cellule', libelle: 'cellule d’avants au ras',
    }));
    const voisin = a.bloc.find((p) => p !== percuteur && libre(p));
    if (voisin) {
      ajouter('relais', base('relais', z) * avants * Math.sqrt(g.leurres) * (L.ras.def >= 3 ? 1.35 : 1), () => ({
        type: 'ras', chaine: [d, percuteur, voisin], index: 0, jeu: 'relais', libelle: 'relais entre avants avant le contact',
      }));
    }
  }
  if (libre(a.dix) && libre(a.percuteurLoin)) {
    const dix = a.dix, loin = a.percuteurLoin;
    ajouter('celluleLoin', base('celluleLoin', z) * avants * (L.milieu.def <= L.milieu.att ? 1.25 : 1), () => ({
      type: 'pod', chaine: [d, dix, loin], index: 0, jeu: 'celluleLoin', libelle: 'seconde cellule servie par l’ouvreur',
    }));
  }

  // ── La deuxième vague : derrière la cellule, sur l'ouvreur, jusqu'à l'aile ──
  if (libre(a.dix) && libre(a.douze)) {
    const dix = a.dix, douze = a.douze;
    const ligne = chaineDe(d, dix, douze, libre(a.treize) ? a.treize : undefined, libre(a.ailierOuvert) ? a.ailierOuvert : undefined);
    const large = L.espaceOuvert >= 20;
    // Écran, croisée et redoublée ont des courses jouées image par image : cadence détaillée seulement.
    const structures = !!e.cadenceDetaillee;
    if (structures && a.bloc.length === 3 && S.distLigne >= 10) {
      ajouter('ecran', base('ecran', z) * leurres * Math.sqrt(mains) * (1 + 0.18 * Math.max(0, L.ras.def - 2)), () => ({
        type: 'large', structure: 'ecran', leurres: [...a.bloc], chaine: ligne, index: 0, relecture: true,
        jeu: 'ecran', libelle: 'passe derrière le bloc d’avants',
      }));
    }
    ajouter('ouvreur', base('ouvreur', z) * Math.pow(mains, 0.6) * (L.trou && L.trou.lateral < 26 ? 1.25 : 1), () => ({
      type: 'large', chaine: [d, dix, douze], index: 0, relecture: true, jeu: 'ouvreur', libelle: 'un temps sur les centres',
    }));
    if (large && libre(a.ailierOuvert)) {
      ajouter('large', base('large', z) * mains * (1 + 0.5 * Math.max(0, sLarge)) * (L.large.def === 0 && L.large.att >= 1 ? 1.6 : 1)
        * (decalage < 0 ? 0.6 : 1), () => ({
        type: 'large', chaine: ligne, index: 0, relecture: true, tempo: decalage >= 1 ? 'vite' : undefined,
        jeu: 'large', libelle: 'jeu déployé jusqu’à l’aile',
      }));
    }
    if (large && libre(a.treize) && L.espaceOuvert >= 24) {
      const treize = a.treize;
      ajouter('saute', base('saute', z) * mains * Math.sqrt(leurres) * (decalage >= 1 ? 1.5 : 1) * (L.monteeRapide ? 1.3 : 1), () => ({
        type: 'saute', chaine: chaineDe(d, dix, treize, libre(a.ailierOuvert) ? a.ailierOuvert : undefined), index: 0, tempo: 'vite',
        jeu: 'saute', libelle: 'passe sautée vers l’aile',
      }));
    }
    if (large && libre(a.quinze) && L.espaceOuvert >= 26) {
      const quinze = a.quinze;
      ajouter('arriere', base('arriere', z) * mains * Math.sqrt(leurres) * (decalage >= 0 ? 1.3 : 0.8), () => ({
        // Le second centre court en leurre : l'arrière surgit dans son dos, lancé.
        type: 'large', chaine: chaineDe(d, dix, douze, quinze, libre(a.ailierOuvert) ? a.ailierOuvert : undefined), index: 0,
        leurres: libre(a.treize) ? [a.treize] : undefined, relecture: true,
        jeu: 'arriere', libelle: 'l’arrière s’intercale',
      }));
    }
    if (structures && S.distLigne >= 10 && phases <= 4) {
      ajouter('croisee', base('croisee', z) * leurres * (e.systeme === 'glissee' ? 1.5 : 1), () => ({
        type: 'large', structure: 'croisee', chaine: [d, dix, douze], index: 0, jeu: 'croisee', libelle: 'croisée ouvreur – centre',
      }));
      if (libre(a.treize)) {
        const treize = a.treize;
        ajouter('redoublee', base('redoublee', z) * leurres, () => ({
          type: 'large', structure: 'redoublee', index: 0, jeu: 'redoublee', libelle: 'redoublée de l’ouvreur',
          chaine: chaineDe(d, dix, douze, dix, treize, libre(a.ailierOuvert) ? a.ailierOuvert : undefined),
        }));
      }
    }
  }

  // ── Le petit côté : ceux qui y sont déjà, contre ceux qui le gardent ──────
  if (L.espaceFerme >= 10) {
    const fermes = a.liste
      .filter((p) => libre(p) && (p.pos.y - e.ballon.y) * e.ouvert < -3 && (e.ballon.x - p.pos.x) * s > 0.3 && (e.ballon.x - p.pos.x) * s < 16)
      .sort((x, y) => Math.abs(x.pos.y - e.ballon.y) - Math.abs(y.pos.y - e.ballon.y)).slice(0, 3);
    if (fermes.length) {
      const sFerme = surnombre(L.ferme);
      ajouter('ferme', base('ferme', z) * Math.sqrt(mains) * (sFerme < 0 ? 0.25 : 1 + 0.8 * sFerme) * (L.ferme.def === 0 ? 2.2 : 1)
        * (L.gardes.ferme === 0 ? 1.4 : 1) * ((e.serieCote?.n ?? 0) >= 2 ? 1.3 : 1), () => ({
        type: 'large', chaine: [d, ...fermes], index: 0, tempo: 'vite', jeu: 'ferme', libelle: 'jeu au petit côté',
      }));
    }
  }

  // ── Le jeu au pied depuis le regroupement ─────────────────────────────────
  if (d.numero === 9 && d.pied >= 48) {
    ajouter('boxKick', base('boxKick', z) * pied * (0.55 + d.pied / 160) * (L.fond <= 1 ? 1.3 : 1), () => ({
      type: 'pied', chaine: [d], index: 0, botteur: d, intention: z === 'ses22' ? 'degagement' : 'chandelle',
      jeu: 'boxKick', libelle: 'coup de pied du demi de mêlée',
    }));
  }
  const botteur = [a.dix, a.quinze].filter(libre).sort((x, y) => y.pied - x.pied)[0];
  if (botteur) {
    ajouter('piedOuvreur', base('piedOuvreur', z) * pied * (0.55 + botteur.pied / 160), () => ({
      type: 'pied', chaine: [d, botteur], index: 0, botteur, intention: piedDepuisSonCamp(e, botteur, L, S),
      jeu: 'piedOuvreur', libelle: z === 'ses22' ? 'sortir de ses 22' : 'occupation au pied',
    }));
  }
  // Le drop : il se prépare quand trois points suffisent. Ailleurs, il reste une rareté.
  // Qui le tape : l'ouvreur, ou l'arrière s'il a un meilleur pied et que le 10 est pris.
  const dropeur = [a.dix, a.quinze].filter((p): p is Pion => !!p && libre(p) && p.pied >= 55).sort((x, y) => y.pied - x.pied)[0];
  if (dropeur && aPorteeDeTir(e.ballon, cote)) {
    const dix = dropeur;
    // Un match condensé compte quatre fois moins de temps de jeu : « plusieurs phases » y arrive plus tôt.
    const longue = condense(e) ? 3 : 6;
    const serre = Math.abs(S.diff) <= 7;
    // 1. Trois points changent le match : on le prépare dès le deuxième temps de jeu.
    let envie = posture === 'troisPoints' ? (phases >= 2 ? 4 : 1.2) : 0;
    // 2. Juste avant la pause, pour ne pas rentrer bredouille.
    if (e.periode === 1 && e.minute >= 38 && phases >= 2) envie = Math.max(envie, serre ? 1.1 : 0.5);
    // 3. La défense ne cède pas : plusieurs temps de jeu devant les 22 sans avancer.
    if (phases >= longue && (e.avantage ?? 0) <= 0 && S.distLigne < 32) envie = Math.max(envie, (serre ? 0.9 : 0.4) * (dix.pied / 70));
    // 4. Devant de peu en fin de match : se mettre à l'abri d'une pénalité.
    if (S.restantes <= 12 && S.diff >= 1 && S.diff <= 4 && phases >= 2) envie = Math.max(envie, 0.8);
    // 5. Ailleurs, un très bon pied le tente de loin en loin dans un match serré.
    if (!envie) envie = S.restantes <= 25 && Math.abs(S.diff) <= 3 ? 0.14 : dix.pied >= 72 ? 0.035 : 0;
    // Dans l'axe et près des poteaux, on le prend plus volontiers ; excentré, presque jamais.
    const axe = Math.abs(e.ballon.y - AXE);
    envie *= (axe < 8 ? 1.3 : axe > 13 ? 0.45 : 1) * (S.distLigne < 26 ? 1.2 : 1) * (posture === 'urgence' ? 0.05 : 1);
    ajouter('drop', envie, () => ({
      type: 'pied', chaine: [d, dix], index: 0, botteur: dix, intention: 'drop', jeu: 'drop', libelle: 'drop',
    }));
  }

  const choix = tirer(e, options);
  return choix ? choix.faire() : null;
}

// ---------------------------------------------------------------------------
// L'ORGANISATEUR RELIT LA DÉFENSE EN RECEVANT
// ---------------------------------------------------------------------------

export type Relecture =
  | { type: 'pied'; intention: IntentionPied }
  | { type: 'saute'; chaine: Pion[] }
  | { type: 'porter' }
  | null;

/**
 * Le ballon est dans les mains de l'ouvreur (ou du centre qui joue à sa
 * place). Le plan annoncé au ruck n'est qu'une intention : il regarde ce que
 * la défense a fait pendant la passe, et il s'adapte.
 *   - elle monte vite et laisse son dos : petit par-dessus, ou rasant ;
 *   - son ailier est monté : passe au pied pour le sien ;
 *   - son vis-à-vis est pris et l'extérieur est libre : il saute un joueur ;
 *   - un intervalle s'ouvre devant lui : il le prend lui-même ;
 *   - rien n'est ouvert et il est dans son camp : il occupe.
 * Sinon le mouvement continue comme annoncé.
 */
export function relireLeJeu(e: EtatMatch, porteur: Pion, pression: number): Relecture {
  const l = e.lancement;
  if (!l) return null;
  const cote = porteur.cote;
  const s = sens(cote);
  const L = lireLaDefense(e, cote, porteur.pos, e.ouvert, porteur);
  const S = situer(e, cote, porteur.pos);
  const g = goutDe(e, cote);
  const reste = l.chaine.slice(l.index + 1);
  const decalage = L.milieu.att + L.large.att + L.ras.att - L.milieu.def - L.large.def - L.ras.def;
  const z = S.zone;
  const offensif = z === 'campAdverse' || z === 'zoneDeMarque';
  const pied = porteur.pied;
  // Ce que vaut un coup de pied offensif dans cette situation de match.
  const reel = condense(e) ? 1 : REGLAGES_IA.piedReel;
  const envieDePied = reel * g.pied * (S.posture === 'urgence' ? (z === 'zoneDeMarque' ? 0.5 : 0.12) : S.posture === 'gestion' ? 0.3 : S.posture === 'prudent' ? 0.3 : 1);

  const options: { r: Relecture; poids: number }[] = [{ r: null, poids: 1 + (decalage >= 1 ? 0.6 : 0) }];
  const ajouter = (r: Relecture, poids: number) => { if (poids > 0.002) options.push({ r, poids }); };

  // Passe au pied : l'ailier du grand côté a de l'espace, et il est en jeu.
  const ailier = e.pions.find((p) => p.cote === cote && attaquantLibre(p) && (p.numero === 11 || p.numero === 14)
    && (p.pos.y - porteur.pos.y) * e.ouvert > 16 && (p.pos.x - porteur.pos.x) * s <= 0.5);
  if (ailier && pied >= 58 && z !== 'ses22' && L.espaceAile >= 8) {
    ajouter({ type: 'pied', intention: 'transversale' },
      0.5 * envieDePied * ((pied - 50) / 30) * Math.min(1.6, L.espaceAile / 10) * (surnombre(L.large) >= 1 ? 0.45 : 1.2)
      * (L.monteeRapide ? 1.3 : 0.9) * (z === 'zoneDeMarque' ? 1.5 : z === 'sonCamp' ? 0.4 : 1) * (ailier.vitesseMax / 9));
  }
  // Rasant : rideau à plat, personne derrière.
  if (pied >= 55 && (offensif || z === 'milieu') && L.profondeurRideau < 7.5 && L.espaceDerriere >= 9) {
    ajouter({ type: 'pied', intention: 'rasant' },
      0.42 * envieDePied * Math.min(1.7, L.espaceDerriere / 12) * (z === 'zoneDeMarque' ? 1.6 : z === 'campAdverse' ? 1 : 0.5) * (L.fond <= 1 ? 1.4 : 0.8));
  }
  // Petit par-dessus : la défense se jette, son dos est vide.
  if (pied >= 55 && z !== 'ses22' && L.monteeRapide && pression < 9 && L.espaceJusteDerriere >= 7) {
    ajouter({ type: 'pied', intention: 'parDessus' },
      0.36 * envieDePied * Math.min(1.6, L.espaceJusteDerriere / 9) * (offensif || z === 'milieu' ? 1 : 0.6));
  }
  // Rien d'ouvert, dans son camp, après plusieurs temps : on rend le ballon loin.
  if ((z === 'sonCamp' || z === 'milieu') && decalage <= -1 && e.phasesDepuisArret >= 3 && pied >= 52) {
    ajouter({ type: 'pied', intention: L.fond <= 1 ? 'occupation' : 'chandelle' },
      0.5 * reel * g.pied * (S.posture === 'urgence' ? 0.05 : S.posture === 'gestion' ? 1.6 : 1));
  }
  // La sautée : le suivant est marqué de près, celui d'après ne l'est pas.
  if (reste.length >= 2 && attaquantLibre(reste[1]) && distance(porteur.pos, reste[1].pos) < 26) {
    const marque = espaceAutour(e, adverse(cote), reste[0].pos) < 4.5;
    const libre = espaceAutour(e, adverse(cote), reste[1].pos) > 6;
    if (marque && libre) ajouter({ type: 'saute', chaine: [porteur, ...reste.slice(1)] }, 0.7 * g.mains * (L.monteeRapide ? 1.4 : 1));
  }
  // L'intervalle devant lui : il le joue lui-même.
  if (L.trou && Math.abs(L.trou.lateral) < 7 && L.trou.largeur >= 5.5 && pression > 3.5) {
    ajouter({ type: 'porter' }, 0.65 * (porteur.evitement / 65) * Math.min(1.6, L.trou.largeur / 6));
  }

  let total = 0;
  for (const o of options) total += o.poids;
  let r = e.rng() * total;
  for (const o of options) { r -= o.poids; if (r <= 0) return o.r; }
  return null;
}

// ---------------------------------------------------------------------------
// LA RELANCE : un ballon reçu au fond du terrain
// ---------------------------------------------------------------------------

/**
 * L'arrière (ou l'ailier) vient de capter un coup de pied. Il ne rend pas
 * toujours le ballon et ne fonce pas toujours : il regarde la montée adverse,
 * où il est, et ce que le match demande. Renvoie `null` quand il redonne
 * simplement à ses demis pour reconstruire.
 */
export function choisirLaRelance(e: EtatMatch, porteur: Pion): Lancement | null {
  const cote = porteur.cote;
  const s = sens(cote);
  const S = situer(e, cote, porteur.pos);
  const g = goutDe(e, cote);
  const L = lireLaDefense(e, cote, porteur.pos, e.ouvert, porteur);
  let pres = 60;
  for (const d of e.pions) {
    if (d.cote === cote || !d.surLeTerrain || d.sanction > 0 || d.corps) continue;
    if ((d.pos.x - porteur.pos.x) * s < -1) continue;
    pres = Math.min(pres, distance(d.pos, porteur.pos));
  }
  const soutiens = e.pions
    .filter((p) => p.cote === cote && p !== porteur && attaquantLibre(p) && !p.avant
      && (p.pos.x - porteur.pos.x) * s <= 0.5 && distance(p.pos, porteur.pos) < 22)
    .sort((x, y) => distance(x.pos, porteur.pos) - distance(y.pos, porteur.pos)).slice(0, 2);
  const urgence = S.posture === 'urgence', gestion = S.posture === 'gestion';
  const options: { poids: number; faire: () => Lancement | null }[] = [];
  // Relancer à la main : il faut du champ devant soi.
  options.push({
    poids: (pres > 14 ? 1.5 : pres > 8 ? 0.7 : 0.15) * g.mains * (S.zone === 'ses22' ? 0.4 : 1) * (urgence ? 1.8 : gestion ? 0.4 : 1),
    faire: () => ({ type: 'large', chaine: [porteur, ...soutiens], index: 0, jeu: 'relance', libelle: 'relance à la main', tempo: pres > 14 ? undefined : 'vite' }),
  });
  // Rendre au pied.
  if (porteur.pied >= 48) {
    options.push({
      poids: (pres > 5 ? 1 : 0.35) * g.pied * (S.zone === 'ses22' ? 2.4 : S.zone === 'sonCamp' ? 1.15 : 0.3) * (urgence ? 0.08 : gestion ? 1.6 : 1)
        * (S.zone === 'ses22' ? 1 : condense(e) ? REGLAGES_IA.occupationCondensee : REGLAGES_IA.piedReel),
      faire: () => ({
        type: 'pied', chaine: [porteur], index: 0, botteur: porteur, jeu: 'piedRetour', libelle: 'réponse au pied',
        intention: S.zone === 'ses22' ? 'degagement'
          : L.fond <= 1 && porteur.pied > 66 && e.rng() < 0.25 ? 'cinquanteVingtDeux'
            : e.rng() < 0.42 ? 'chandelle' : 'occupation',
      }),
    });
  }
  // Redonner à ses demis : le jeu se reconstruit.
  options.push({ poids: pres > 8 ? 0.45 : 0.8, faire: () => null });
  let total = 0;
  for (const o of options) total += o.poids;
  let r = e.rng() * total;
  for (const o of options) { r -= o.poids; if (r <= 0) return o.faire(); }
  return null;
}

/** Le botteur se trouve-t-il dans l'axe, à distance d'un drop ? */
export function dansLAxeDuDrop(p: Pion): boolean { return Math.abs(p.pos.y - AXE) < 15; }
