// LIRE LE JEU — ce qu'un joueur voit avant de décider.
//
// « Qui je suis, où je suis, ce que fait mon équipe, ce que fait la défense,
// quelle est la situation du match. » Ce module répond aux trois dernières
// questions, et il ne décide de rien : il COMPTE. Combien de défenseurs sont
// réellement dans le rideau, couloir par couloir ; combien d'attaquants en
// face ; où est le trou ; qui couvre derrière ; où en est le match.
//
// ⚠️ FONCTIONS PURES, SANS TIRAGE. Une lecture qui consommerait le générateur
// changerait la rejoue d'un match selon qu'on l'a regardée ou non. Le hasard
// reste dans les décisions (`jeu.ts`), jamais dans ce qu'on observe.

import type { EtatMatch } from '../etat.js';
import type { Pion } from '../entites.js';
import {
  AXE, LARGEUR, adverse, borner, distance, metresAvantLaLigne, sens, type Cote, type Vec,
} from '../terrain.js';

/** L'IA par poste est-elle en service sur ce match ? Voir `EtatMatch.ia`. */
export function iaParPoste(e: Pick<EtatMatch, 'ia'>): boolean { return (e.ia ?? 1) >= 2; }

/**
 * LE MATCH CONDENSÉ. Un match de carrière se regarde en dix minutes : son
 * horloge avance huit fois plus vite que l'écran pendant le jeu, et il ne
 * contient qu'un quart des temps de jeu d'une vraie rencontre (mesuré : 48
 * rucks contre 195). Ce qui se compte PAR MATCH — la fatigue, les fautes, les
 * cartons — y est donc ramené à l'échelle de l'horloge, sinon un joueur finit
 * frais et une équipe ne prend jamais son deuxième avertissement.
 */
export function condense(e: Pick<EtatMatch, 'carriereDixMinutes'>): boolean { return !!e.carriereDixMinutes; }

/** Ce défenseur compte-t-il dans le rideau à cet instant ? Au sol, lié, battu ou en retard : non. */
export function defenseurPresent(e: Pick<EtatMatch, 'retards' | 'sim'>, p: Pion): boolean {
  return p.surLeTerrain && p.sanction <= 0 && !p.corps && p.battu <= 0.4 && p.role !== 'ruck'
    && !((e.retards?.[p.id] ?? 0) > e.sim);
}

/** Cet attaquant peut-il jouer le ballon sur ce temps de jeu ? */
export function attaquantLibre(p: Pion): boolean {
  return p.surLeTerrain && p.sanction <= 0 && !p.corps && p.role !== 'ruck';
}

export interface Couloir { att: number; def: number }

export interface LectureDefense {
  /** Du ruck à neuf mètres, côté ouvert. */
  ras: Couloir;
  /** Le milieu du terrain, côté ouvert. */
  milieu: Couloir;
  /** Le couloir extérieur, côté ouvert. */
  large: Couloir;
  /** Tout le petit côté. */
  ferme: Couloir;
  /** Largeur du grand côté et du petit côté, en mètres. */
  espaceOuvert: number;
  espaceFerme: number;
  /** Défenseurs présents dans le premier rideau. */
  rideau: number;
  /** Défenseurs proches mais hors du coup : au sol, liés, battus, pas revenus. */
  retardataires: number;
  /** Défenseurs en couverture, plus de treize mètres derrière le rideau. */
  fond: number;
  /** Défenseurs à moins de 4,5 m du regroupement, de chaque côté. */
  gardes: { ouvert: number; ferme: number };
  /** Le rideau est-il monté près du ballon ? (blitz, ou ligne déjà sur le porteur) */
  monteeRapide: boolean;
  /** Profondeur moyenne du rideau devant le ballon, en mètres. */
  profondeurRideau: number;
  /** Le plus grand intervalle du rideau, côté ouvert : décalage latéral depuis le ballon et largeur. */
  trou: { lateral: number; largeur: number } | null;
  /** Mètres libres autour du point visé par une passe au pied vers l'ailier ouvert. */
  espaceAile: number;
  /** Mètres libres autour d'un point quinze mètres derrière le rideau, dans le couloir du milieu. */
  espaceDerriere: number;
  /** Mètres libres autour d'un point huit mètres derrière le rideau : la place d'un petit par-dessus. */
  espaceJusteDerriere: number;
}

/** Surnombre d'un couloir : positif, l'attaque y a un homme de plus. */
export function surnombre(c: Couloir): number { return c.att - c.def; }

/** Distance du défenseur debout le plus proche d'un point (présent ou non dans le rideau). */
export function espaceAutour(e: EtatMatch, defenseur: Cote, point: Vec): number {
  let d = 60;
  for (const p of e.pions) {
    if (p.cote !== defenseur || !p.surLeTerrain || p.sanction > 0 || p.corps) continue;
    d = Math.min(d, distance(p.pos, point));
  }
  return d;
}

/**
 * LA DÉFENSE VUE DU BALLON. Chaque couloir oppose ceux qui peuvent attaquer à
 * ceux qui peuvent défendre — pas ceux qui portent le bon maillot : un
 * troisième ligne encore au sol ou un pilier lié au regroupement ne ferme rien.
 */
export function lireLaDefense(e: EtatMatch, cote: Cote, b: Vec = e.ballon, ouvert: number = e.ouvert, sans?: Pion): LectureDefense {
  const s = sens(cote);
  const def = adverse(cote);
  const lateral = (p: Pion) => (p.pos.y - b.y) * ouvert;
  const devant = (p: Pion) => (p.pos.x - b.x) * s;
  const espaceOuvert = ouvert === 1 ? LARGEUR - b.y : b.y;
  const espaceFerme = LARGEUR - espaceOuvert;
  const limiteLarge = borner(espaceOuvert * 0.62, 16, 26);
  const ras: Couloir = { att: 0, def: 0 }, milieu: Couloir = { att: 0, def: 0 };
  const large: Couloir = { att: 0, def: 0 }, ferme: Couloir = { att: 0, def: 0 };
  const ranger = (l: number): Couloir => (l < -1.5 ? ferme : l < 9 ? ras : l < limiteLarge ? milieu : large);
  const gardes = { ouvert: 0, ferme: 0 };
  const rideau: Pion[] = [];
  let retardataires = 0, fond = 0, profondeur = 0;

  for (const d of e.pions) {
    if (d.cote !== def || !d.surLeTerrain || d.sanction > 0) continue;
    const av = devant(d);
    if (!defenseurPresent(e, d)) { if (Math.abs(av) < 14 && Math.abs(lateral(d)) < 30) retardataires++; continue; }
    if (av > 13) { fond++; continue; }
    if (av < -3) { retardataires++; continue; }
    rideau.push(d);
    profondeur += av;
    const l = lateral(d);
    ranger(l).def++;
    if (Math.abs(l) < 4.5) { if (l >= 0) gardes.ouvert++; else gardes.ferme++; }
  }
  for (const a of e.pions) {
    if (a.cote !== cote || a === sans || !attaquantLibre(a)) continue;
    const recul = -devant(a);
    if (recul < -1.2 || recul > 24) continue;
    const l = lateral(a);
    // Le relayeur au pied du regroupement n'est pas une option de passe : c'est lui qui joue.
    if (Math.abs(l) < 2.2 && recul < 3) continue;
    ranger(l).att++;
  }

  // Le plus grand intervalle du rideau côté ouvert — les deux touches sont des bornes.
  const marques = rideau.map(lateral).filter((l) => l > -1.5).sort((x, y) => x - y);
  let trou: LectureDefense['trou'] = null;
  const bornes = [0, ...marques, espaceOuvert];
  for (let i = 0; i < bornes.length - 1; i++) {
    const largeur = bornes[i + 1] - bornes[i];
    // L'intervalle le long de la touche vaut moins : on n'y a qu'un côté pour passer.
    const utile = i === bornes.length - 2 ? largeur * 0.75 : largeur;
    if (utile >= 5 && (!trou || utile > trou.largeur)) trou = { lateral: (bornes[i] + bornes[i + 1]) / 2, largeur: utile };
  }

  const profondeurRideau = rideau.length ? profondeur / rideau.length : 12;
  const cibleAile = { x: b.x + s * (profondeurRideau + 9), y: borner(b.y + ouvert * (espaceOuvert - 6), 3, LARGEUR - 3) };
  const cibleMilieu = { x: b.x + s * (profondeurRideau + 15), y: borner(b.y + ouvert * Math.min(14, espaceOuvert * 0.45), 3, LARGEUR - 3) };
  const ciblePres = { x: b.x + s * (profondeurRideau + 8), y: borner(b.y + ouvert * Math.min(8, espaceOuvert * 0.3), 3, LARGEUR - 3) };
  return {
    ras, milieu, large, ferme, espaceOuvert, espaceFerme,
    rideau: rideau.length, retardataires, fond, gardes,
    monteeRapide: e.systeme === 'blitz' || profondeurRideau < 4.2,
    profondeurRideau, trou,
    espaceAile: espaceAutour(e, def, cibleAile),
    espaceDerriere: espaceAutour(e, def, cibleMilieu),
    espaceJusteDerriere: espaceAutour(e, def, ciblePres),
  };
}

// ---------------------------------------------------------------------------
// LA SITUATION DU MATCH : la zone, le score, le temps
// ---------------------------------------------------------------------------

export type Zone = 'ses22' | 'sonCamp' | 'milieu' | 'campAdverse' | 'zoneDeMarque' | 'ligne';

/**
 * L'état d'esprit d'une équipe à cet instant. Une équipe ne joue pas le même
 * ballon à 5-5 à la dixième minute et à 24-22 à la soixante-dix-neuvième.
 *   - prudent     : dans ses 22, on sort d'abord ;
 *   - gestion     : devant en fin de match, on garde le ballon et on occupe ;
 *   - troisPoints : à portée d'une pénalité ou d'un drop pour passer devant ;
 *   - urgence     : il faut un essai, on ne rend plus le ballon au pied.
 */
export type Posture = 'normal' | 'prudent' | 'gestion' | 'troisPoints' | 'urgence';

export interface Situation {
  zone: Zone;
  posture: Posture;
  /** Écart au score, vu de l'équipe (positif : elle mène). */
  diff: number;
  /** Minutes d'horloge restantes. */
  restantes: number;
  /** Mètres jusqu'à la ligne adverse. */
  distLigne: number;
}

export function zoneDe(b: Vec, cote: Cote): Zone {
  const d = metresAvantLaLigne(b, cote);
  return d >= 78 ? 'ses22' : d >= 50 ? 'sonCamp' : d >= 40 ? 'milieu' : d >= 22 ? 'campAdverse' : d >= 7 ? 'zoneDeMarque' : 'ligne';
}

export function situer(e: EtatMatch, cote: Cote, b: Vec = e.ballon): Situation {
  const diff = cote === 'A' ? e.scoreA - e.scoreB : e.scoreB - e.scoreA;
  const restantes = Math.max(0, 80 - e.minute);
  const zone = zoneDe(b, cote);
  let posture: Posture = 'normal';
  if (e.sirene || restantes <= 8) {
    posture = diff > 0 ? 'gestion' : diff >= -3 ? 'troisPoints' : 'urgence';
  } else if (restantes <= 20 && diff <= -9) posture = 'urgence';
  else if (restantes <= 14 && diff >= 1 && diff <= 7 && zone !== 'zoneDeMarque' && zone !== 'ligne') posture = 'gestion';
  else if (zone === 'ses22') posture = 'prudent';
  return { zone, posture, diff, restantes, distLigne: metresAvantLaLigne(b, cote) };
}

/** Le ballon est-il à portée d'un drop ou d'une pénalité tirable ? */
export function aPorteeDeTir(b: Vec, cote: Cote): boolean {
  return metresAvantLaLigne(b, cote) < 36 && Math.abs(b.y - AXE) < 17;
}
