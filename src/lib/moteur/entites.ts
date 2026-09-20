// LE PION — un joueur sur le terrain.
//
// ⚠️ LE DÉPLACEMENT EST À INERTIE, et c'est ce qui rend le direct fluide.
// L'ancien moteur posait le joueur sur sa cible à la vitesse maximale : à
// chaque changement de consigne, les trente pions changeaient de direction dans
// la même image — ça « téléportait ». Ici chaque pion a une VITESSE (un
// vecteur), qu'il infléchit avec une accélération bornée. Un ailier lancé ne
// pivote pas sur place, il décrit une courbe ; un pilier met deux secondes à se
// mettre en route. Le rendu n'a plus besoin d'aucune transition CSS.

import type { Coequipier } from '../effectif.js';
import { attributsDe } from '../carteJoueur.js';
import { apparenceJoueurMatch } from './apparenceMatch.js';
import type { PosteId } from '../../types.js';
import { AXE, LARGEUR, LONGUEUR, borner, type Cote, type Vec } from './terrain.js';

// ⚠️ LA FEUILLE DE MATCH COMPLÈTE, JOUEUR PAR JOUEUR (demande explicite : « je
// veux que chaque joueur ait de vraies stats, pas des stats simulées ; pour les
// avants mêlée, touche gagnée, grattages, turnovers, pick and go, essais, passes
// décisives, passes normales, minutes jouées, mètres parcourus avec le ballon,
// cartons jaunes et rouges ; pour les arrières pareil + coups de pied, 50/22
// réussis, offloads, et sans mêlée ni touche ni pick and go »).
//
// ⚠️ TOUT CE QUI EST ICI EST COMPTÉ PAR LE MOTEUR, À L'ÉVÉNEMENT. Rien n'est
// déduit d'une formule après coup : une mêlée gagnée l'est parce que le pack a
// gagné la poussée à la 34ᵉ minute, un offload parce que la passe après contact
// est arrivée. C'est ce qui rend les classements individuels vrais — et ce qui
// permet de noter une performance sur autre chose que les essais.
export interface StatsMatch {
  metres: number;            // mètres gagnés ballon en main
  courses: number;           // ballons portés
  passes: number;
  passesDecisives: number;   // la passe qui amène l'essai
  passesRatees: number;      // en-avant et passes au sol
  offloads: number;          // passe APRÈS contact, la marque des grands centres
  franchissements: number;   // défenseurs battus / lignes franchies
  plaquages: number;
  plaquagesManques: number;
  rucksNettoyes: number;
  grattages: number;         // ballons volés au sol
  // --- Conquête : réservée aux avants (un ailier n'y participe pas) ---------
  melees: number;            // mêlées gagnées par son pack, lui sur le terrain
  touchesGagnees: number;    // touches captées (le sauteur)
  pickAndGo: number;         // ballons portés au ras depuis un ruck ou le 8
  // --- Jeu au pied ---------------------------------------------------------
  coupsDePied: number;
  metresAuPied: number;
  cinquanteVingtDeux: number; // 50/22 RÉUSSIS (trouvés en touche dans les 22)
  essais: number;
  butsTentes: number;
  butsReussis: number;
  pointsAuPied?: number;
  // ⚠️ LES DEUX CARTONS SONT SÉPARÉS. Un jaune coûte dix minutes, un rouge coûte
  // le match — les confondre dans un seul compteur rendait la discipline
  // illisible dans les classements comme dans la note de match.
  cartonsJaunes: number;
  cartonsRouges: number;
  distanceParcourue: number; // effort total, pour l'endurance et la feuille
}

export function statsVides(): StatsMatch {
  return {
    metres: 0, courses: 0, passes: 0, passesDecisives: 0, passesRatees: 0,
    offloads: 0, franchissements: 0, plaquages: 0, plaquagesManques: 0,
    rucksNettoyes: 0, grattages: 0, melees: 0, touchesGagnees: 0, pickAndGo: 0,
    coupsDePied: 0, metresAuPied: 0, cinquanteVingtDeux: 0, essais: 0,
    butsTentes: 0, butsReussis: 0, cartonsJaunes: 0, cartonsRouges: 0,
    distanceParcourue: 0,
  };
}

// Le rôle occupé sur la phase en cours. Sert au placement ET au commentaire.
export type Role =
  | 'ruck' | 'demi' | 'ouvreur' | 'podRas' | 'podMilieu' | 'podLarge' | 'ligne'
  | 'aileFerme' | 'arriere' | 'gardien' | 'rideau1' | 'rideau2' | 'sentinelle'
  | 'chasseur' | 'maul' | 'melee' | 'alignement' | 'hors';

export interface Pion {
  /** Numéro affiché lorsque le poste tactique est repris par un remplaçant. */
  numeroMaillot?: number;
  remplace?: boolean;
  corps?: import('./dynamique.js').CorpsMatch;
  poidsKg?: number;
  tailleCm?: number;
  id: string;
  /** Identifiant stable dans l'effectif, utilisé par la composition manager. */
  sourceId: string;
  nom: string;
  numero: number;       // 1 à 23
  poste: PosteId;       // le poste DU MAILLOT (pas celui de la fiche joueur)
  cote: Cote;
  avant: boolean;
  moi: boolean;
  capitaine: boolean;
  buteur: boolean;

  pos: Vec;
  vitesse: Vec;         // vecteur vitesse courant (m/s)
  cible: Vec;
  vitesseMax: number;   // m/s à pleine fraîcheur
  acceleration: number; // m/s²

  endurance: number;    // 100 → 0
  battu: number;        // secondes pendant lesquelles il est hors du coup
  /**
   * ⚠️ HORS-JEU SUR COUP DE PIED : il était DEVANT le botteur au moment du
   * coup de pied. Tant que ce drapeau est levé, il ne peut ni chasser, ni
   * jouer le ballon — et s’il le joue quand même, c’est pénalité.
   *
   * Il vit sur le PION, pas dans une variable de module : deux matchs simulés
   * en parallèle se partageraient la variable, et le déterminisme du moteur
   * tomberait avec (voir l’entête de `moteur.ts`).
   */
  horsJeu: boolean;
  surLeTerrain: boolean;
  sanction: number;     // secondes de carton restantes (0 = pas sanctionné)
  minutes: number;
  role: Role;

  // Attributs de match, dérivés de la note et des attributs du joueur.
  plaquage: number;
  evitement: number;
  puissance: number;
  passe: number;
  pied: number;
  vision: number;
  discipline: number;
  detente: number;      // touche et ballons hauts
  usure: number;        // vitesse à laquelle l'endurance se vide
  // ⚠️ L'ENGAGEMENT. Un joueur à quarante mètres du ballon ne sprinte pas : il
  // trottine en se replaçant. Sans ça, les trente pions couraient à fond
  // pendant 35 minutes de ballon vivant — 11 km au compteur pour un ouvreur,
  // le double de la réalité.
  effort: number;

  stats: StatsMatch;
}

// L'ordre des maillots : c'est LUI qui décide du poste joué, pas la fiche.
export const ORDRE_MAILLOTS: PosteId[] = [
  'pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g', 'deuxieme_ligne_d',
  'troisieme_aile_g', 'troisieme_aile_d', 'numero_8', 'demi_melee', 'demi_ouverture',
  'ailier_gauche', 'premier_centre', 'deuxieme_centre', 'ailier_droit', 'arriere',
];

// Vitesse de pointe par poste (m/s). Un pilier court à ~7 m/s, un ailier
// international à ~9,8 m/s — les vrais ordres de grandeur du rugby pro.
const VITESSE_POSTE: Record<PosteId, number> = {
  pilier_gauche: 6.9, talonneur: 7.3, pilier_droit: 6.9,
  deuxieme_ligne_g: 7.4, deuxieme_ligne_d: 7.4,
  troisieme_aile_g: 8.1, troisieme_aile_d: 8.1, numero_8: 8.0,
  demi_melee: 8.3, demi_ouverture: 8.2,
  ailier_gauche: 9.3, premier_centre: 8.6, deuxieme_centre: 8.7,
  ailier_droit: 9.3, arriere: 9.0,
};

// Accélération : les avants sont lourds, les trois-quarts partent en flèche.
const ACCEL_POSTE: Record<PosteId, number> = {
  pilier_gauche: 3.0, talonneur: 3.4, pilier_droit: 3.0,
  deuxieme_ligne_g: 3.2, deuxieme_ligne_d: 3.2,
  troisieme_aile_g: 4.0, troisieme_aile_d: 4.0, numero_8: 3.9,
  demi_melee: 4.6, demi_ouverture: 4.4,
  ailier_gauche: 5.0, premier_centre: 4.3, deuxieme_centre: 4.4,
  ailier_droit: 5.0, arriere: 4.6,
};

export interface AttributsPion {
  vitesse?: number; force?: number; endurance?: number; plaquage?: number;
  passe?: number; jeuAuPied?: number; vision?: number; mental?: number;
}

function n(v: number | undefined, defaut: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : defaut;
}

// Les huit avants portent les maillots 1 à 8 : c'est ce qui décide si un pion
// est un avant, y compris pour le banc (où le maillot ne dit plus rien).
const AVANTS = new Set<PosteId>(ORDRE_MAILLOTS.slice(0, 8));

export function creerPion(
  c: Coequipier, index: number, cote: Cote, moi: boolean, attributs?: AttributsPion,
): Pion {
  // ⚠️ LE BANC GARDE SON POSTE. `ORDRE_MAILLOTS[index % 15]` renvoyait le
  // remplaçant n°21 (un demi de mêlée, choisi comme tel par `composer`) au
  // poste de troisième ligne, et le n°23 au poste de numéro 8 — d'où le « demi
  // de mêlée en 8 » vu sur la feuille de match, et un banc entièrement composé
  // d'avants (`index % 15 < 8`). Au-delà du quinze de départ, le poste est
  // celui que la composition a attribué.
  const poste = index < 15 ? (ORDRE_MAILLOTS[index] ?? c.poste) : c.poste;
  const avant = index < 15 ? index < 8 : AVANTS.has(poste);
  const g = borner(c.note, 20, 99);
  // Le terrain utilise exactement les huit notes montrées sur la fiche.
  const a = attributs ?? { ...attributsDe(c), jeuAuPied: c.jeuAuPied ?? attributsDe(c).jeuAuPied };
  const physique = apparenceJoueurMatch(c.nom, c.poste);

  const vitesseNote = n(a.vitesse, avant ? g - 7 : g + 5);
  const enduranceNote = n(a.endurance, g);

  return {
    id: `${cote}${index}`,
    sourceId: c.id,
    nom: c.nom,
    numero: index + 1,
    poste,
    cote,
    avant,
    moi,
    capitaine: false,
    poidsKg: physique.poidsKg,
    tailleCm: physique.tailleCm,
    buteur: false,
    pos: { x: 0, y: AXE },
    vitesse: { x: 0, y: 0 },
    cible: { x: 0, y: AXE },
    vitesseMax: (VITESSE_POSTE[poste] ?? 8) * (0.61 + borner(vitesseNote, 5, 99) / 190),
    acceleration: (ACCEL_POSTE[poste] ?? 4) * (0.55 + borner(vitesseNote, 5, 99) / 145),
    endurance: 100,
    battu: 0,
    horsJeu: false,
    surLeTerrain: index < 15,
    sanction: 0,
    minutes: 0,
    role: 'ligne',
    plaquage: n(a.plaquage, avant ? g + 5 : g - 2),
    evitement: n(a.vitesse, g) * 0.55 + n(a.mental, g) * 0.2 + (avant ? 0 : 8),
    puissance: n(a.force, avant ? g + 6 : g - 2),
    passe: n(a.passe, avant ? g - 8 : g + 2),
    pied: n(a.jeuAuPied, poste === 'demi_ouverture' || poste === 'arriere' ? g + 6
      : poste === 'demi_melee' ? g : g - 14),
    vision: n(a.vision, g),
    discipline: n(a.mental, g),
    detente: avant ? g + (poste.startsWith('deuxieme_ligne') ? 10 : 0) : g - 10,
    // ⚠️ L'usure dépend de l'endurance : un joueur à 40 s'écroule au quart
    // d'heure, un joueur à 90 finit le match debout.
    usure: 0.030 * (1.55 - enduranceNote / 135),
    effort: 1,
    stats: statsVides(),
  };
}

export function vitesseDisponible(p: Pion): number {
  // À plat, on court encore, mais 25 % moins vite.
  return p.vitesseMax * (0.75 + 0.25 * (p.endurance / 100));
}

// DÉPLACEMENT À INERTIE. Renvoie les mètres parcourus pendant ce pas.
export function deplacer(p: Pion, dt: number): number {
  if (p.corps) return 0;
  const dx = p.cible.x - p.pos.x;
  const dy = p.cible.y - p.pos.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  const vMax = vitesseDisponible(p) * p.effort;
  // On freine à l'approche de la cible : sans ça les pions oscillent autour
  // (et un replacement d'un mètre ne mérite pas un sprint).
  const precision = p.role === 'ruck' ? .18 : .7;
  const vVoulue = d < precision ? 0 : Math.min(vMax, Math.max(0, d - precision * .55) / .35);
  const cibleVx = d < 1e-6 ? 0 : (dx / d) * vVoulue;
  const cibleVy = d < 1e-6 ? 0 : (dy / d) * vVoulue;

  let ax = cibleVx - p.vitesse.x;
  let ay = cibleVy - p.vitesse.y;
  const norme = Math.sqrt(ax * ax + ay * ay);
  const maxDv = p.acceleration * dt;
  if (norme > maxDv && norme > 1e-6) { ax = (ax / norme) * maxDv; ay = (ay / norme) * maxDv; }
  p.vitesse.x += ax;
  p.vitesse.y += ay;

  const pas = Math.hypot(p.vitesse.x, p.vitesse.y) * dt;
  p.pos.x += p.vitesse.x * dt;
  p.pos.y += p.vitesse.y * dt;
  // ⚠️ ON BORNE LES DEUX AXES. Seule la largeur l'était : un porteur pouvait
  // dériver derrière la ligne de ballon mort (mesuré : ballon à x = −9 sur un
  // terrain de 0 à 122), le ruck se formait là, et les trente joueurs se
  // rassemblaient dans le coin — c'est ça, la « boule ».
  p.pos.x = borner(p.pos.x, -1.5, LONGUEUR + 1.5);
  p.pos.y = borner(p.pos.y, -1.5, LARGEUR + 1.5);

  p.stats.distanceParcourue += pas;
  // L'effort coûte de l'endurance, et courir vite coûte beaucoup plus cher que
  // trottiner : l'exposant 1,6 fait la différence entre un ailier qui sprinte
  // et un pilier qui marche.
  if (pas > 0) {
    const intensite = Math.min(1, pas / dt / p.vitesseMax);
    p.endurance = Math.max(0, p.endurance - p.usure * dt * intensite ** 1.6 * 10);
  }
  return pas;
}

// Remise à zéro de l'élan : à l'entrée d'une phase arrêtée, les joueurs
// repartent à l'arrêt (sinon ils dérapent au-delà de la mêlée).
export function stopper(p: Pion): void { p.vitesse.x = 0; p.vitesse.y = 0; }
