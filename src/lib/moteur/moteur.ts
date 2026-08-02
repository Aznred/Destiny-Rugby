// LE MOTEUR DE MATCH — 80 minutes jouées tick par tick
//
// Ce n'est plus un récit plaqué sur un score : les 30 pions se déplacent, le
// porteur cherche l'espace, la défense monte, les plaquages naissent d'une
// COLLISION, les rucks se forment là où le plaquage a eu lieu, les coups de
// pied volent et retombent, les touches et les mêlées se disputent.
//
// ⚠️ UN CHOIX D'ARCHITECTURE À CONNAÎTRE. Le score final reste celui de
// `jouerRencontre` (lib/championnat.ts) : c'est lui qui alimente les
// classements, les montées, les coupes et toute la saison. Le moteur joue
// librement — placements, phases, décisions, tout émerge — mais la CONVERSION
// d'une occasion est arbitrée par un « budget de points » restant. Autrement
// dit le moteur décide COMMENT et QUAND on marque, la ligue décide COMBIEN.
// Sans ça, regarder son match donnerait un résultat différent de celui inscrit
// au classement — incohérence rédhibitoire.
//
// Tout est déterministe (graine = clé de la rencontre) : rejouer le match donne
// exactement la même partie.

import { graine } from '../championnat';
import type { Coequipier } from '../effectif';
import type { PosteId } from '../../types';
import { POSTE_PAR_ID } from '../../data/rugby';
import {
  creerPion, deplacer, ORDRE_MAILLOTS, type AttributsPion, type Pion,
} from './entites';
import {
  choisirSysteme, placer, type ConsigneJoueur, type Contexte, type SystemeDefensif,
} from './tactique';
import {
  LARGEUR, LIGNE_A, LIGNE_B, MILIEU, borner, dansLes22, dansSonCamp, distance,
  enTouche, ligneAdverse, sens, type Cote, type Vec,
} from './terrain';
import {
  placementCoupEnvoi, placementMelee, placementRuck, placementTouche,
} from './phasesArretees';

export type Phase =
  | 'coupEnvoi' | 'jeuCourant' | 'ruck' | 'melee' | 'touche' | 'maul'
  | 'coupDePied' | 'tirAuBut' | 'apresEssai' | 'miTemps' | 'fini';

export interface Commentaire {
  minute: number;
  texte: string;
  type: 'essai' | 'but' | 'butRate' | 'plaquage' | 'ruck' | 'melee' | 'touche'
    | 'maul' | 'pied' | 'penalite' | 'carton' | 'remplacement' | 'jalon' | 'jeu';
  cote: Cote | null;
  points: number;
  scoreA: number;
  scoreB: number;
  moi?: boolean; // implique l'avatar du joueur
}

export interface EtatMatch {
  clubA: string;
  clubB: string;
  // Temps de JEU écoulé, en secondes (0 → 4800).
  t: number;
  minute: number;
  periode: 1 | 2;
  // ⚠️ LA RÈGLE DE LA SIRÈNE : passé 40' et 80', le chrono est à zéro mais on
  // joue jusqu'à ce que le ballon soit mort (touche, en-avant, pénalité, coup
  // de pied direct en touche).
  sirene: boolean;
  phase: Phase;
  minuteur: number; // secondes restantes dans la phase en cours
  pions: Pion[];
  ballon: Vec;
  porteur: Pion | null;
  possession: Cote;
  systeme: SystemeDefensif;
  scoreA: number;
  scoreB: number;
  // Budget de points restant pour retomber sur le résultat de la ligue.
  resteA: number;
  resteB: number;
  // Score « attendu » par le modèle statistique : sert de repère, pas de loi.
  cibleA: number;
  cibleB: number;
  phasesDeJeu: number; // temps de jeu enchaînés depuis le dernier arrêt
  // ⚠️ CADENCE DE DÉCISION. Le porteur ne décide pas cinq fois par seconde :
  // il court, et ne se repose la question que toutes les ~0,9 s. Sans ce
  // verrou, la moindre probabilité de 5 % s'appliquait à chaque tick — mesuré :
  // 412 coups de pied par match, un festival ridicule.
  prochaineDecision: number;
  // ⚠️ LE BALLON VOLE. Une passe et un coup de pied ne se téléportent pas d'un
  // joueur à l'autre : le ballon part, traverse l'air, et le receveur ne le
  // possède qu'à l'arrivée. C'est ce qui rend l'action LISIBLE.
  vol: Vol | null;
  // Placement figé d'une phase arrêtée (ruck, mêlée, touche). Calculé UNE FOIS
  // à l'entrée dans la phase : le recalculer à chaque tick faisait vibrer les
  // pions sur place, ce qui donnait cette impression de téléportation.
  placementFige: Record<string, Vec> | null;
  tir: { buteur: Pion; distance: number; valeur: number } | null;
  commentaires: Commentaire[];
  consigne?: ConsigneJoueur;
  fini: boolean;
  // Mémoire interne du moteur
  rng: () => number;
  prochainEssaiEn?: Cote; // le directeur a décidé qu'une occasion aboutirait
  remplacementsA: number;
  remplacementsB: number;
}

export interface Vol {
  de: Vec;
  vers: Vec;
  duree: number;
  ecoule: number;
  type: 'passe' | 'pied';
  intention: '50/22' | 'occupation' | 'chandelle' | 'drop' | 'penaltouche' | 'passe';
  auteur: Pion;
  receveur?: Pion;
}

const DT = 0.2; // pas de simulation, en secondes de jeu
const DUREE_PERIODE = 40 * 60;
const RAYON_PLAQUAGE = 1.4;

// --- CRÉATION ---------------------------------------------------------------

export function creerMatch(
  clubA: string, clubB: string,
  effectifA: Coequipier[], effectifB: Coequipier[],
  scoreCibleA: number, scoreCibleB: number,
  cle: string,
  avatar?: { club: string; nom: string; poste: PosteId; attributs: AttributsPion },
): EtatMatch {
  const rng = graine('moteur#' + cle);
  const pions: Pion[] = [];
  const monter = (eff: Coequipier[], cote: Cote, club: string) => {
    // ⚠️ ON COMPOSE UNE VRAIE FEUILLE DE MATCH. Avant, le numéro de maillot
    // venait de l'ORDRE de l'effectif : un deuxième ligne se retrouvait en 9 et
    // un demi de mêlée en 15. Ici, chaque maillot 1-15 est attribué au meilleur
    // joueur DISPONIBLE À CE POSTE (à défaut, de la même famille de postes, à
    // défaut n'importe qui) ; le reste part sur le banc.
    const dispo = [...eff].sort((a, b) => b.note - a.note);
    const pris = new Set<Coequipier>();
    const titulaires: Coequipier[] = [];

    for (const poste of ORDRE_MAILLOTS) {
      const famille = POSTE_PAR_ID[poste]?.famille;
      const choisi =
        dispo.find((c) => !pris.has(c) && c.poste === poste)
        ?? dispo.find((c) => !pris.has(c) && POSTE_PAR_ID[c.poste]?.famille === famille)
        ?? dispo.find((c) => !pris.has(c));
      if (!choisi) break;
      pris.add(choisi);
      // Le pion joue au poste du MAILLOT, pas à son poste d'origine : c'est ce
      // qui fait qu'un joueur repositionné se place bien là où il doit être.
      titulaires.push({ ...choisi, poste });
    }
    // Le banc : les 8 meilleurs restants, à leur poste naturel.
    const banc = dispo.filter((c) => !pris.has(c)).slice(0, 8);
    const liste = [...titulaires, ...banc];

    // ⚠️ LE JOUEUR HUMAIN N'EST PAS DANS L'EFFECTIF GÉNÉRÉ (`effectifDuClub`
    // rend ses coéquipiers, pas lui). On l'insère donc à SON poste dans le XV
    // de départ, à la place du titulaire — sinon son pion n'existe nulle part
    // et l'aura, le coaching et sa feuille de match n'ont rien à accrocher.
    if (avatar && avatar.club === club) {
      const place = ORDRE_MAILLOTS.indexOf(avatar.poste);
      const index = place >= 0 ? place : 9;
      if (liste[index]) {
        liste[index] = { ...liste[index], nom: avatar.nom, poste: avatar.poste };
      }
    }
    liste.forEach((c, i) => {
      const moi = !!avatar && avatar.club === club && c.nom === avatar.nom;
      pions.push(creerPion(c, i, cote, moi, moi ? avatar!.attributs : undefined));
    });
  };
  monter(effectifA, 'A', clubA);
  monter(effectifB, 'B', clubB);

  const etat: EtatMatch = {
    clubA, clubB,
    t: 0, minute: 0, periode: 1, sirene: false,
    phase: 'coupEnvoi', minuteur: 2,
    pions,
    ballon: { x: MILIEU, y: LARGEUR / 2 },
    porteur: null,
    possession: rng() < 0.5 ? 'A' : 'B',
    systeme: 'blitz',
    scoreA: 0, scoreB: 0,
    resteA: scoreCibleA, resteB: scoreCibleB,
    cibleA: scoreCibleA, cibleB: scoreCibleB,
    phasesDeJeu: 0,
    prochaineDecision: 1,
    vol: null,
    placementFige: null,
    tir: null,
    commentaires: [],
    fini: false,
    rng,
    remplacementsA: 0, remplacementsB: 0,
  };
  placerPourCoupEnvoi(etat, true);
  dire(etat, 'jalon', null, `Coup d’envoi ! ${clubA} reçoit ${clubB}.`);
  return etat;
}

function dire(
  e: EtatMatch, type: Commentaire['type'], cote: Cote | null, texte: string,
  points = 0, moi = false,
): void {
  e.commentaires.push({
    minute: Math.floor(e.t / 60), texte, type, cote, points,
    scoreA: e.scoreA, scoreB: e.scoreB, moi,
  });
}

function surLeTerrain(e: EtatMatch, cote: Cote): Pion[] {
  return e.pions.filter((p) => p.cote === cote && p.surLeTerrain);
}

function nomClub(e: EtatMatch, cote: Cote): string {
  return cote === 'A' ? e.clubA : e.clubB;
}

function adverse(cote: Cote): Cote {
  return cote === 'A' ? 'B' : 'A';
}

// --- PLACEMENTS D'ARRÊT DE JEU ---------------------------------------------

function placerPourCoupEnvoi(e: EtatMatch, instantane = false): void {
  e.ballon = { x: MILIEU, y: LARGEUR / 2 };
  e.placementFige = placementCoupEnvoi(e.pions, MILIEU, e.possession);
  // Au tout premier coup d'envoi, on pose les joueurs directement ; ensuite ils
  // COURENT se replacer, ce qui évite l'effet téléportation entre deux phases.
  if (instantane) {
    const fige = e.placementFige;
    for (const p of e.pions) {
      const c = fige[p.id];
      if (c) { p.pos = { ...c }; p.cible = { ...c }; }
    }
  }
}

// --- LE TICK ----------------------------------------------------------------
//
// Appelé en boucle par l'affichage. `dt` est en SECONDES DE JEU : à l'échelle
// ×1, l'écran consomme 4 800 s de jeu en ~600 s réelles, soit 8 s de jeu par
// seconde réelle. C'est ce qui tient la promesse « 80 minutes en 10 minutes ».

export function avancer(e: EtatMatch, secondesDeJeu: number): void {
  if (e.fini) return;
  let reste = secondesDeJeu;
  while (reste > 0 && !e.fini) {
    const pas = Math.min(DT, reste);
    tick(e, pas);
    reste -= pas;
  }
}

function tick(e: EtatMatch, dt: number): void {
  // 1. LE TEMPS. Le chrono ne tourne que quand le jeu est vivant.
  const jeuVivant = e.phase !== 'apresEssai' && e.phase !== 'tirAuBut' && e.phase !== 'miTemps';
  if (jeuVivant) e.t += dt;
  e.minute = Math.floor(e.t / 60);

  // 2. LA SIRÈNE. À 40' et 80', l'horloge est écoulée — mais on joue jusqu'au
  // prochain ballon mort. C'est LE moment le plus tendu d'un match de rugby.
  const finPeriode = e.periode * DUREE_PERIODE;
  // Garde-fou : même sans ballon mort, une période ne dure pas éternellement.
  if (e.sirene && e.t > finPeriode + 180) return clorePeriode(e);
  if (!e.sirene && e.t >= finPeriode) {
    e.sirene = true;
    dire(e, 'jalon', null, e.periode === 1
      ? '🔔 La sirène retentit. On joue jusqu’à la sortie du ballon.'
      : '🔔 Sirène ! Le temps est écoulé — ballon mort et c’est terminé.');
  }

  // Le temps de jeu se compte une seule fois, ici, pour tout le monde.
  if (jeuVivant) for (const p of e.pions) if (p.surLeTerrain) p.minutesJouees += dt / 60;

  // 3. LES REMPLACEMENTS : le staff sort les joueurs vidés.
  if (jeuVivant && e.minute >= 45) gererRemplacements(e);

  // 4. LE PLACEMENT de tout le monde, puis le déplacement.
  const ctx: Contexte = {
    ballon: e.ballon, possession: e.possession, systeme: e.systeme,
    porteur: e.porteur ? e.porteur.pos : null, consigne: e.consigne,
  };
  if (e.placementFige) {
    // Phase arrêtée : chacun rejoint SA place, calculée une fois pour toutes à
    // l'entrée dans la phase. Personne ne se téléporte, tout le monde y court.
    for (const p of e.pions) {
      const cible = e.placementFige[p.id];
      if (cible) p.cible = cible;
    }
  } else {
    placer(e.pions, ctx);
  }

  // LE BALLON EN VOL : une passe ou un coup de pied traverse vraiment l'air.
  if (e.vol) {
    e.vol.ecoule += dt;
    const k = Math.min(1, e.vol.ecoule / e.vol.duree);
    e.ballon = {
      x: e.vol.de.x + (e.vol.vers.x - e.vol.de.x) * k,
      y: e.vol.de.y + (e.vol.vers.y - e.vol.de.y) * k,
    };
  }

  for (const p of e.pions) {
    if (!p.surLeTerrain) continue;
    p.recuperation = Math.max(0, p.recuperation - dt);
    if (p === e.porteur) continue; // le porteur est piloté par la phase
    deplacer(p, dt);
  }

  // 5. LA PHASE EN COURS.
  e.minuteur -= dt;
  switch (e.phase) {
    case 'coupEnvoi': return phaseCoupEnvoi(e);
    case 'jeuCourant': return phaseJeuCourant(e, dt);
    case 'ruck': return phaseRuck(e);
    case 'melee': return phaseMelee(e);
    case 'touche': return phaseTouche(e);
    case 'maul': return phaseMaul(e, dt);
    case 'coupDePied': return phaseCoupDePied(e);
    case 'tirAuBut': return phaseTirAuBut(e);
    case 'apresEssai': return phaseApresEssai(e);
    case 'miTemps': return phaseMiTemps(e);
    default: return;
  }
}

// --- PHASES -----------------------------------------------------------------

function phaseCoupEnvoi(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const receveur = choisirPorteur(e, e.possession);
  donnerBallon(e, receveur);
  e.phase = 'jeuCourant';
  e.phasesDeJeu = 0;
}

// Qui prend le ballon à la sortie d'une phase ? Le 9 ressort, le 10 lance le jeu.
function choisirPorteur(e: EtatMatch, cote: Cote): Pion {
  const liste = surLeTerrain(e, cote);
  return liste.find((p) => p.numero === 10) ?? liste.find((p) => p.numero === 9) ?? liste[0];
}

function donnerBallon(e: EtatMatch, p: Pion): void {
  e.placementFige = null;
  e.porteur = p;
  e.possession = p.cote;
  e.ballon = { ...p.pos };
  p.stats.courses += 1;
  // Il porte un instant avant de lever la tête : c'est là qu'il décide.
  e.prochaineDecision = 0.3 + e.rng() * 0.5;
  e.systeme = choisirSysteme(e.ballon, adverse(p.cote), e.minute, ecart(e, adverse(p.cote)));
}

function ecart(e: EtatMatch, cote: Cote): number {
  return cote === 'A' ? e.scoreA - e.scoreB : e.scoreB - e.scoreA;
}

// LE JEU COURANT : le porteur avance, la défense monte, ça finit par un
// plaquage, une passe, un coup de pied ou un essai.
function phaseJeuCourant(e: EtatMatch, dt: number): void {
  // Le ballon est en l'air (passe en cours) : le receveur le prend à l'arrivée,
  // et il peut le lâcher s'il est déjà sous pression.
  if (e.vol && e.vol.type === 'passe') {
    if (e.vol.ecoule < e.vol.duree) return;
    const receveur = e.vol.receveur;
    e.vol = null;
    if (receveur && receveur.surLeTerrain) {
      donnerBallon(e, receveur);
      // Il court un instant avant de lever la tête.
      e.prochaineDecision = 0.9 + e.rng() * 0.8;
      return;
    }
    return formerRuck(e, e.ballon);
  }

  const porteur = e.porteur;
  if (!porteur) { formerRuck(e, e.ballon); return; }
  const s = sens(porteur.cote);
  const defenseurs = surLeTerrain(e, adverse(porteur.cote));

  // Où est l'espace ? Le porteur vise l'intervalle le plus large devant lui.
  const menace = plusProche(porteur.pos, defenseurs);
  const pression = menace ? distance(porteur.pos, menace.pos) : 99;
  let viseeY = porteur.pos.y;
  if (menace && pression < 12) {
    // On évite le défenseur le plus proche en allant dans son dos libre.
    viseeY += menace.pos.y > porteur.pos.y ? -6 : 6;
  }
  porteur.cible = {
    x: porteur.pos.x + s * 12,
    y: borner(viseeY, 2, LARGEUR - 2),
  };
  const parcouru = deplacer(porteur, dt);
  porteur.stats.metres += parcouru;
  e.ballon = { ...porteur.pos };

  // ---- ESSAI : le porteur a franchi la ligne ----
  const ligne = ligneAdverse(porteur.cote);
  const franchi = porteur.cote === 'A' ? porteur.pos.x >= ligne : porteur.pos.x <= ligne;
  if (franchi) return conclureEssai(e, porteur);

  // ---- SORTIE EN TOUCHE ----
  if (enTouche(porteur.pos)) {
    dire(e, 'touche', porteur.cote, `${porteur.nom} est poussé en touche. Ballon à ${nomClub(e, adverse(porteur.cote))}.`, 0, porteur.moi);
    return arretDeJeu(e, 'touche', adverse(porteur.cote), porteur.pos);
  }

  // ---- PLAQUAGE : une vraie collision, testée à chaque tick ----
  for (const d of defenseurs) {
    if (porteur.recuperation > 0) break; // il vient d'effacer un homme
    if (d.recuperation > 0) continue;
    if (distance(d.pos, porteur.pos) > RAYON_PLAQUAGE) continue;
    return resoudrePlaquage(e, porteur, d);
  }

  // ---- DÉCISIONS DU PORTEUR ----
  // ⚠️ Une fois toutes les 0,9 s de jeu, pas à chaque tick : sinon la moindre
  // probabilité de 5 % se déclenche cinq fois par seconde.
  e.prochaineDecision -= dt;
  if (e.prochaineDecision > 0) return;
  e.prochaineDecision = 2.5;
  const decision = deciderAvecLeBallon(e, porteur, pression);
  if (decision === 'pied') return taperAuPied(e, porteur);
  if (decision === 'passe') return passerLeBallon(e, porteur, pression);
}

function plusProche(p: Vec, liste: Pion[]): Pion | null {
  let meilleur: Pion | null = null;
  let d = Infinity;
  for (const q of liste) {
    const dd = distance(p, q.pos);
    if (dd < d) { d = dd; meilleur = q; }
  }
  return meilleur;
}

// --- LE QI TERRAIN : que fait le porteur ? ---------------------------------
type Decision = 'porter' | 'passe' | 'pied';

function deciderAvecLeBallon(e: EtatMatch, p: Pion, pression: number): Decision {
  const r = e.rng();
  const mene = ecart(e, p.cote) < 0;
  if (e.sirene && !mene) return 'pied'; // on met le ballon dehors, c'est fini
  const minutesRestantes = 80 - e.minute;

  // 1. LE 50/22 : réservé aux BUTEURS (9, 10, 15), dans son camp, avec de la
  //    vision, et seulement si les ailiers adverses sont montés dans la ligne.
  //    ⚠️ C'est un coup rare : sans ces trois verrous, on en voyait 400 par
  //    match. Il doit rester le geste qui fait lever le stade.
  if (
    (p.numero === 9 || p.numero === 10 || p.numero === 15)
    && p.pied > 66 && dansSonCamp(p.pos, p.cote)
    && e.phasesDeJeu >= 2 && arriereGardeMontee(e, adverse(p.cote)) && r < 0.004 + p.vision / 12000
  ) return 'pied';

  // 2. OCCUPATION : on étouffe dans ses 22, on dégage long.
  if (estDansSes22(p) && r < 0.16) return 'pied';

  // 3. LA CHANDELLE (box kick) : ballon lent, le 9 tape haut pour faire
  //    remonter le pack et contester en l'air.
  if (p.numero === 9 && e.phasesDeJeu >= 5 && r < 0.07) return 'pied';

  // 4. LE DROP : plusieurs temps de jeu dans les 22 adverses, fin de match
  //    serrée, l'ouvreur recule dans la poche.
  if (
    p.numero === 10 && dansLes22(p.pos, adverse(p.cote)) && e.phasesDeJeu >= 4
    && minutesRestantes < 20 && Math.abs(ecart(e, p.cote)) <= 6 && r < 0.35
  ) return 'pied';

  // 5. GESTION DU RISQUE : on mène de plus de 7 dans les 5 dernières minutes →
  //    pick and go, on garde le ballon au ras, on ne prend aucun risque.
  if (minutesRestantes <= 5 && ecart(e, p.cote) > 7) return 'porter';

  // 6. Sous pression, on passe. Sinon on porte, d'autant plus qu'on est fort.
  if (pression < 5 && r < 0.9) return 'passe'; // au contact, on libère
  if (r < 0.6 + p.passe / 500) return 'passe'; // sinon on fait vivre le ballon
  // Mené en fin de match : on garde le ballon à la main, on joue.
  if (mene && minutesRestantes < 10) return r < 0.2 ? 'passe' : 'porter';
  return 'porter';
}

function estDansSes22(p: Pion): boolean {
  return p.cote === 'A' ? p.pos.x < LIGNE_A + 22 : p.pos.x > LIGNE_B - 22;
}

// Les ailiers adverses sont-ils montés dans la ligne ? (condition du 50/22)
function arriereGardeMontee(e: EtatMatch, defenseur: Cote): boolean {
  const fond = surLeTerrain(e, defenseur).filter((p) => p.numero === 11 || p.numero === 14);
  return fond.every((p) => Math.abs(p.pos.x - e.ballon.x) < 26);
}

// --- PASSE ------------------------------------------------------------------
function passerLeBallon(e: EtatMatch, p: Pion, pression: number): void {
  const partenaires = surLeTerrain(e, p.cote).filter((q) => q !== p);
  const s = sens(p.cote);
  // On passe vers l'arrière : le receveur doit être derrière le porteur.
  const valides = partenaires.filter((q) => (q.pos.x - p.pos.x) * s <= 0.5 && distance(q.pos, p.pos) < 15);
  if (!valides.length) return;

  // ⚠️ ON ÉCARTE LE JEU. La première version passait au partenaire le plus
  // proche : le ballon tournait sur trois mètres et tout le monde restait
  // agglutiné. Ici on cherche le joueur suivant DANS LA LIGNE, du côté ouvert —
  // c'est comme ça qu'on déplace la défense et qu'on ouvre des brèches.
  const versLeLarge = p.pos.y < LARGEUR / 2 ? 1 : -1;
  const dehors = valides
    .filter((q) => (q.pos.y - p.pos.y) * versLeLarge > 1.5)
    .sort((a, b) => Math.abs(a.pos.y - p.pos.y) - Math.abs(b.pos.y - p.pos.y));

  // ⚠️ LE 9 NE SERT PAS LE PACK. À la sortie du ruck, les avants sont juste à
  // côté de lui : le « partenaire le plus à l'extérieur » était donc un avant,
  // qui rentrait aussitôt dans la défense et créait un nouveau ruck. Le demi de
  // mêlée cherche donc ses TROIS-QUARTS — l'ouvreur d'abord, les centres
  // ensuite. C'est comme ça qu'on écarte le jeu.
  let receveur: Pion | undefined;
  if (p.numero === 9) {
    const troisQuarts = valides.filter((q) => !q.avant && q.numero !== 9);
    receveur =
      troisQuarts.find((q) => q.numero === 10)
      ?? troisQuarts.find((q) => q.numero === 12)
      ?? troisQuarts.find((q) => q.numero === 13)
      ?? troisQuarts.sort((a, b) => distance(p.pos, a.pos) - distance(p.pos, b.pos))[0];
  }
  receveur ??= dehors[0]
    ?? valides.sort((a, b) => distance(p.pos, a.pos) - distance(p.pos, b.pos))[0];
  if (!receveur) return;

  p.stats.passes += 1;
  // La réussite dépend de la note de passe ET de la pression adverse.
  const difficulte = 0.012 + Math.max(0, 4 - pression) * 0.012 + distance(p.pos, receveur.pos) / 900;
  if (e.rng() < difficulte * (1 - p.passe / 260)) {
    p.stats.passes -= 1;
    p.stats.passesRatees += 1;
    dire(e, 'jeu', p.cote, `En-avant de ${p.nom} ! Mêlée pour ${nomClub(e, adverse(p.cote))}.`, 0, p.moi);
    return arretDeJeu(e, 'melee', adverse(p.cote), p.pos);
  }

  // ⚠️ LES DÉFENSEURS QUI S'ÉTAIENT ENGAGÉS SUR LE PORTEUR SONT BATTUS.
  // C'est ce qui crée les brèches : sans ce délai de réaction, les trois
  // chasseurs se recollaient instantanément au nouveau porteur et aucune passe
  // ne débouchait sur quoi que ce soit.
  const engages = surLeTerrain(e, adverse(p.cote))
    .filter((d) => distance(d.pos, p.pos) < 6)
    .sort((a, b) => distance(a.pos, p.pos) - distance(b.pos, p.pos))
    .slice(0, 2);
  for (const d of engages) d.recuperation = 1.4;

  // Une passe qui trouve un homme lancé dans un intervalle, c'est la brèche.
  const marqueurs = surLeTerrain(e, adverse(p.cote));
  const garde = plusProche(receveur.pos, marqueurs.filter((d) => d.recuperation <= 0));
  const espace = garde ? distance(receveur.pos, garde.pos) : 99;

  // ⚠️ LE BALLON VOLE VERS LE RECEVEUR. Il ne change pas de mains d'un tick à
  // l'autre : on le voit partir, traverser, arriver. Une passe de 12 m met
  // ~0,6 s. Le porteur n'existe plus pendant ce temps — c'est LE moment où
  // l'action devient lisible.
  const d = distance(p.pos, receveur.pos);
  e.porteur = null;
  e.vol = {
    de: { ...p.pos },
    vers: { ...receveur.pos },
    duree: Math.max(0.3, d / 16),
    ecoule: 0,
    type: 'passe',
    intention: 'passe',
    auteur: p,
    receveur,
  };
  if (espace > 13) {
    dire(e, 'jeu', p.cote,
      `${p.nom} trouve ${receveur.nom} dans l’intervalle — il est lancé !`, 0, p.moi || receveur.moi);
  }
}

// --- COUP DE PIED -----------------------------------------------------------

function taperAuPied(e: EtatMatch, p: Pion): void {
  const s = sens(p.cote);
  p.stats.coupsDePied += 1;
  let intention: Vol['intention'] = 'occupation';
  let arrivee: Vec;
  let duree = 2.4;

  if (p.numero === 10 && dansLes22(p.pos, adverse(p.cote)) && e.phasesDeJeu >= 5) {
    // DROP GOAL : l'ouvreur arme depuis la poche.
    intention = 'drop';
    const reussi = e.rng() < 0.32 + p.pied / 300;
    p.stats.butsTentes += 1;
    if (reussi && peutMarquer(budget(e, p.cote), 3)) {
      p.stats.butsReussis += 1;
      marquer(e, p.cote, 3);
      dire(e, 'but', p.cote, `DROP de ${p.nom} ! Il arme de 25 mètres et ça passe entre les perches.`, 3, p.moi);
      return arretDeJeu(e, 'coupEnvoi', adverse(p.cote), { x: MILIEU, y: LARGEUR / 2 });
    }
    dire(e, 'butRate', p.cote, `${p.nom} tente le drop… le ballon passe à côté.`, 0, p.moi);
    return arretDeJeu(e, 'coupEnvoi', adverse(p.cote), { x: MILIEU, y: LARGEUR / 2 });
  }

  if (p.numero === 9 && e.phasesDeJeu >= 4) {
    // CHANDELLE : haute et courte, pour contester à la retombée.
    intention = 'chandelle';
    arrivee = { x: p.pos.x + s * 22, y: borner(p.pos.y + (e.rng() * 16 - 8), 4, LARGEUR - 4) };
    duree = 3.6;
  } else if (dansSonCamp(p.pos, p.cote) && arriereGardeMontee(e, adverse(p.cote)) && p.pied > 62) {
    // 50/22 : rasant vers la touche adverse, dans les 22.
    intention = '50/22';
    const cibleX = p.cote === 'A' ? LIGNE_B - 12 : LIGNE_A + 12;
    arrivee = { x: cibleX, y: p.pos.y < LARGEUR / 2 ? 1 : LARGEUR - 1 };
    duree = 3;
  } else {
    // OCCUPATION : on gagne du terrain, on cherche la touche.
    arrivee = {
      x: borner(p.pos.x + s * (34 + p.pied / 3), LIGNE_A - 4, LIGNE_B + 4),
      y: p.pos.y < LARGEUR / 2 ? -1 : LARGEUR + 1,
    };
    duree = 3.2;
  }

  e.vol = { de: { ...p.pos }, vers: arrivee, duree, ecoule: 0, type: 'pied', intention, auteur: p };
  e.porteur = null;
  e.phase = 'coupDePied';
  e.minuteur = duree;
  dire(e, 'pied', p.cote, libellePied(e, p, intention), 0, p.moi);
}

function libellePied(e: EtatMatch, p: Pion, i: Vol['intention']): string {
  switch (i) {
    case '50/22': return `${p.nom} tente le 50/22 ! Le ballon file vers la touche adverse…`;
    case 'chandelle': return `${p.nom} envoie une chandelle. Duel aérien en vue.`;
    case 'penaltouche': return `${p.nom} tape en pénaltouche, ${nomClub(e, p.cote)} joue la touche.`;
    default: return `${p.nom} dégage en touche pour gagner du terrain.`;
  }
}

function phaseCoupDePied(e: EtatMatch): void {
  const v = e.vol;
  if (!v) { formerRuck(e, e.ballon); return; }
  if (v.ecoule < v.duree) return;

  const auteur = v.auteur;
  const camp = auteur.cote;
  e.vol = null;

  if (v.intention === '50/22') {
    const reussi = e.rng() < 0.34 + auteur.pied / 260 + auteur.vision / 400;
    if (reussi) {
      dire(e, 'pied', camp, `🎯 50/22 RÉUSSI ! ${auteur.nom} offre une touche à 15 mètres de la ligne adverse.`, 0, auteur.moi);
      return arretDeJeu(e, 'touche', camp, e.ballon);
    }
    dire(e, 'pied', camp, `Le 50/22 de ${auteur.nom} est trop long, ballon en ballon mort.`, 0, auteur.moi);
    return arretDeJeu(e, 'melee', adverse(camp), { x: e.ballon.x, y: LARGEUR / 2 });
  }

  if (v.intention === 'chandelle') {
    // Contest aérien : les ailiers ont ajusté leur course pour arriver dessus.
    const contestants = e.pions.filter((p) => p.surLeTerrain && distance(p.pos, e.ballon) < 14);
    const mien = contestants.filter((p) => p.cote === camp);
    const gagne = mien.length > 0 && e.rng() < 0.42;
    const vainqueur = gagne ? mien[0] : plusProche(e.ballon, contestants.filter((p) => p.cote !== camp));
    if (vainqueur) {
      dire(e, 'pied', vainqueur.cote, `${vainqueur.nom} gagne le duel aérien !`, 0, vainqueur.moi);
      donnerBallon(e, vainqueur);
      e.phase = 'jeuCourant';
      e.phasesDeJeu = 0;
      return;
    }
    return formerRuck(e, e.ballon);
  }

  // Occupation / pénaltouche : sortie en touche, remise en jeu à l'adversaire
  // (ou à soi-même après une pénalité).
  const pourQui = v.intention === 'penaltouche' ? camp : adverse(camp);
  return arretDeJeu(e, 'touche', pourQui, e.ballon);
}

// --- PLAQUAGE ET RUCK -------------------------------------------------------
function resoudrePlaquage(e: EtatMatch, porteur: Pion, defenseur: Pion): void {
  // La réussite du plaquage : la note de plaquage contre l'évitement et la
  // puissance du porteur, avec la fatigue des deux.
  const force = defenseur.plaquage * (0.7 + defenseur.endurance / 330);
  const resistance = porteur.evitement * 0.6 + porteur.puissance * 0.4;
  const reussi = e.rng() < 0.93 + (force - resistance) / 320;

  if (!reussi) {
    defenseur.stats.plaquagesManques += 1;
    dire(e, 'plaquage', porteur.cote,
      `${porteur.nom} casse le plaquage de ${defenseur.nom} !`, 0, porteur.moi || defenseur.moi);
    // Le défenseur est effacé : il repart de derrière.
    defenseur.pos.x -= sens(porteur.cote) * 4;
    defenseur.recuperation = 4; // il est effacé, il doit revenir
    // Le porteur est passé : on ne lui saute pas dessus à cinq dans la foulée.
    porteur.recuperation = 1.2;
    return;
  }

  defenseur.stats.plaquages += 1;
  porteur.stats.courses += 0;
  const dur = e.rng() < 0.12;
  dire(e, 'plaquage', adverse(porteur.cote),
    dur
      ? `Énorme plaquage de ${defenseur.nom} sur ${porteur.nom} ! Le choc s’entend d’ici.`
      : `${defenseur.nom} stoppe ${porteur.nom}.`,
    0, porteur.moi || defenseur.moi);

  // PÉNALITÉ ? Un plaquage sur trente est fautif (haut, sans les bras…).
  if (e.rng() < 0.016) {
    dire(e, 'penalite', porteur.cote, `Pénalité ! ${defenseur.nom} est sanctionné pour un plaquage haut.`, 0, defenseur.moi);
    if (e.rng() < 0.07) {
      defenseur.stats.cartons += 1;
      dire(e, 'carton', adverse(porteur.cote), `🟨 Carton jaune pour ${defenseur.nom} — dix minutes à quatorze.`, 0, defenseur.moi);
      defenseur.surLeTerrain = false;
    }
    return gererPenalite(e, porteur.cote, { ...porteur.pos });
  }
  formerRuck(e, { ...porteur.pos });
}

// LE RUCK : les avants viennent s'agglutiner autour du point de plaquage.
function formerRuck(e: EtatMatch, lieu: Vec): void {
  e.ballon = { ...lieu };
  e.porteur = null;
  e.phase = 'ruck';
  // Un ruck dure 3 à 5 secondes ; plus il traîne, plus le ballon est lent.
  e.minuteur = 28 + e.rng() * 12;
  e.phasesDeJeu += 1;
  e.vol = null;
  e.placementFige = placementRuck(e.pions, e.ballon, e.possession);
}

function phaseRuck(e: EtatMatch): void {
  // ⚠️ La formation du ruck est figée à l'entrée dans la phase (voir
  // `formerRuck`) : la recalculer à chaque tick avec du hasard faisait vibrer
  // les pions sur place. Ici on ne fait qu'attendre la sortie du ballon.
  if (e.minuteur > 0) return;
  const proches = e.pions
    .filter((p) => p.surLeTerrain && p.avant)
    .sort((a, b) => distance(a.pos, e.ballon) - distance(b.pos, e.ballon))
    .slice(0, 6);

  // GRATTAGE : un gratteur bien placé peut voler le ballon.
  const defenseurs = proches.filter((p) => p.cote !== e.possession);
  const gratteur = defenseurs.find((p) => p.numero === 7 || p.numero === 6);
  if (gratteur && e.rng() < 0.07 + gratteur.plaquage / 1100) {
    gratteur.stats.grattages += 1;
    dire(e, 'ruck', gratteur.cote, `🪝 ${gratteur.nom} gratte le ballon au sol ! Ballon récupéré.`, 0, gratteur.moi);
    e.possession = gratteur.cote;
    e.phasesDeJeu = 0;
  }
  for (const p of proches.filter((q) => q.cote === e.possession)) p.stats.rucksNettoyes += 1;

  // Sortie du ruck : le 9 relance, et la défense est encore au sol ou en train
  // de se remettre en ligne — c'est la règle du hors-jeu, et c'est elle qui
  // rend le jeu debout possible.
  const neuf = surLeTerrain(e, e.possession).find((p) => p.numero === 9)
    ?? choisirPorteur(e, e.possession);
  for (const d of surLeTerrain(e, adverse(e.possession))) {
    if (distance(d.pos, e.ballon) < 11) d.recuperation = Math.max(d.recuperation, 1.3);
  }
  donnerBallon(e, neuf);
  // Le 9 ne garde pas le ballon : il sert tout de suite.
  e.prochaineDecision = 0.25;
  e.phase = 'jeuCourant';
  finDeBallonMort();
}

// --- ARRÊTS DE JEU ----------------------------------------------------------
function arretDeJeu(e: EtatMatch, quoi: Phase | 'coupEnvoi', pour: Cote, lieu: Vec): void {
  // ⚠️ LA SIRÈNE : si le temps est écoulé, le ballon mort met fin à la période.
  if (e.sirene) return clorePeriode(e);
  e.possession = pour;
  e.phasesDeJeu = 0;
  e.porteur = null;
  e.ballon = { ...lieu };
  if (quoi === 'coupEnvoi') {
    e.ballon = { x: MILIEU, y: LARGEUR / 2 };
    e.phase = 'coupEnvoi';
    e.minuteur = 12;
    placerPourCoupEnvoi(e);
    return;
  }
  e.phase = quoi as Phase;
  e.vol = null;
  // Durées réelles : une mêlée se forme en 45 s, une touche en 30 s.
  e.minuteur = quoi === 'touche' ? 30 : 45;
  // ⚠️ La FORMATION est calculée ici, une seule fois, et les joueurs courent
  // s'y placer. C'est ce qui donne une vraie mêlée en 3-4-1 et un alignement de
  // touche perpendiculaire à la ligne, au lieu d'une grappe qui vibre.
  if (quoi === 'touche') {
    e.ballon.y = e.ballon.y < LARGEUR / 2 ? 0.5 : LARGEUR - 0.5;
    // Alignement complet à 7, ou réduit — décidé maintenant pour que ce qu'on
    // voit corresponde à ce qui va se jouer.
    e.placementFige = placementTouche(e.pions, e.ballon, pour, e.rng() < 0.35 ? 4 : 6);
  } else if (quoi === 'melee') {
    e.placementFige = placementMelee(e.pions, e.ballon, pour);
  }
}

function finDeBallonMort(): void {
  // Rien à faire ici : le ruck relance le jeu. La fonction existe pour
  // documenter que le ballon n'est PAS mort à la sortie d'un ruck — la sirène
  // ne peut donc pas arrêter le match sur un simple temps de jeu.
}

// LA TOUCHE : alignement, choix de la zone de lancer, et le maul si on est près.
function phaseTouche(e: EtatMatch): void {
  if (e.minuteur > 0) return; // l'alignement est figé, chacun y court

  const cote = e.possession;
  const avants = surLeTerrain(e, cote).filter((p) => p.avant);
  // Alignement réduit (4-5) pour envoyer des avants dans la ligne, ou complet.
  const reduite = e.rng() < 0.35;
  // Lancer devant (sûr) ou fond d'alignement (risqué, mais lance les trois-quarts).
  const fond = e.rng() < 0.4;
  const sauteur = avants.find((p) => p.numero === (fond ? 5 : 4)) ?? avants[0]
    ?? choisirPorteur(e, cote);
  const reussie = e.rng() < (fond ? 0.78 : 0.9);

  if (!reussie) {
    dire(e, 'touche', adverse(cote), `Touche perdue par ${nomClub(e, cote)} ! ${nomClub(e, adverse(cote))} récupère.`);
    e.possession = adverse(cote);
    donnerBallon(e, choisirPorteur(e, e.possession));
    e.phase = 'jeuCourant';
    return;
  }

  // L'ARME DU MAUL : touche à moins de 8 m de la ligne → ballon porté.
  const distLigne = Math.abs(ligneAdverse(cote) - e.ballon.x);
  if (distLigne < 9 && !reduite) {
    dire(e, 'maul', cote, `${sauteur.nom} capte en touche — ${nomClub(e, cote)} lance le ballon porté !`, 0, sauteur.moi);
    e.phase = 'maul';
    e.minuteur = 6;
    donnerBallon(e, sauteur);
    return;
  }

  dire(e, 'touche', cote,
    reduite
      ? `Touche réduite de ${nomClub(e, cote)} : ${sauteur.nom} capte, les trois-quarts sont lancés.`
      : `${sauteur.nom} assure sa touche, ballon propre pour ${nomClub(e, cote)}.`,
    0, sauteur.moi);
  donnerBallon(e, fond ? choisirPorteur(e, cote) : sauteur);
  e.phase = 'jeuCourant';
  e.phasesDeJeu = 0;
}

// LE MAUL : il avance tant que le pack pousse et que l'adversaire ne le stoppe pas.
function phaseMaul(e: EtatMatch, dt: number): void {
  const cote = e.possession;
  const s = sens(cote);
  const avants = surLeTerrain(e, cote).filter((p) => p.avant);
  const advAvants = surLeTerrain(e, adverse(cote)).filter((p) => p.avant);
  const poussee = moyenne(avants.map((p) => p.puissance)) - moyenne(advAvants.map((p) => p.puissance));
  // Le maul avance de 0,4 à 1,2 m/s selon le rapport de force.
  const vitesse = borner(0.7 + poussee / 60, 0.15, 1.4);
  e.ballon.x += s * vitesse * dt;
  for (const p of avants) p.cible = { x: e.ballon.x - s * 1.2, y: e.ballon.y + (p.numero - 4) * 1.3 };
  for (const p of advAvants) p.cible = { x: e.ballon.x + s * 1.2, y: e.ballon.y + (p.numero - 4) * 1.3 };

  const ligne = ligneAdverse(cote);
  const franchi = cote === 'A' ? e.ballon.x >= ligne : e.ballon.x <= ligne;
  if (franchi) {
    const marqueur = avants.find((p) => p.numero === 2) ?? avants[0] ?? choisirPorteur(e, cote);
    marqueur.pos = { ...e.ballon };
    return conclureEssai(e, marqueur, 'au terme du ballon porté');
  }
  if (e.minuteur > 0) return;
  // Le maul s'écroule ou est stoppé : on repart au ras.
  dire(e, 'maul', cote, `Le maul est stoppé. ${nomClub(e, cote)} rejoue au ras.`);
  formerRuck(e, e.ballon);
}

function moyenne(v: number[]): number {
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 50;
}

// LA MÊLÉE : la domination décide, et le 8 peut partir seul.
function phaseMelee(e: EtatMatch): void {
  if (e.minuteur > 0) return; // la formation est figée, chacun y court
  const cote = e.possession;
  const mien = surLeTerrain(e, cote).filter((p) => p.avant);
  const adv = surLeTerrain(e, adverse(cote)).filter((p) => p.avant);
  const domination = moyenne(mien.map((p) => p.puissance)) - moyenne(adv.map((p) => p.puissance));

  if (domination < -8 && e.rng() < 0.4) {
    dire(e, 'melee', adverse(cote), `Mêlée dominée ! ${nomClub(e, adverse(cote))} obtient la pénalité.`);
    return gererPenalite(e, adverse(cote), { ...e.ballon });
  }

  // DÉPART DU 8 : si la mêlée avance, le numéro 8 se détache.
  const huit = mien.find((p) => p.numero === 8);
  if (huit && domination > 4 && e.rng() < 0.45) {
    dire(e, 'melee', cote, `Mêlée dominatrice — ${huit.nom} part à la base et attaque le petit côté !`, 0, huit.moi);
    donnerBallon(e, huit);
    e.phase = 'jeuCourant';
    e.phasesDeJeu = 0;
    return;
  }
  dire(e, 'melee', cote, `Mêlée solide de ${nomClub(e, cote)}, ballon jouable.`);
  donnerBallon(e, choisirPorteur(e, cote));
  e.phase = 'jeuCourant';
  e.phasesDeJeu = 0;
}

// --- LA PÉNALITÉ : le vrai « game management » -----------------------------
function gererPenalite(e: EtatMatch, pour: Cote, lieu: Vec): void {
  if (e.sirene) {
    // Une pénalité n'est pas un ballon mort : on peut encore jouer la dernière
    // action. Mais si l'équipe choisit les points, le match s'arrête après.
  }
  const monEcart = ecart(e, pour);
  const restantes = 80 - e.minute;
  const dist = Math.abs(ligneAdverse(pour) - lieu.x);
  const tirable = dist < 42;

  // Mené de 1 à 3 points en fin de match → on prend les points.
  const prendreLesPoints =
    (tirable && restantes <= 12 && monEcart < 0 && monEcart >= -3)
    || (tirable && restantes <= 12 && monEcart >= 0 && monEcart <= 2)
    || (tirable && dist < 30 && e.rng() < 0.55)
    || (tirable && e.rng() < 0.3);

  // Mené de plus de 3 en fin de match → pénaltouche, on cherche l'essai.
  const chercherLEssai = restantes <= 15 && monEcart <= -4;

  if (prendreLesPoints && !chercherLEssai && peutMarquer(budget(e, pour), 3)) {
    const buteur = choisirButeur(e, pour);
    dire(e, 'penalite', pour, `${nomClub(e, pour)} prend les points. ${buteur.nom} se place.`, 0, buteur.moi);
    e.phase = 'tirAuBut';
    e.minuteur = 55; // le buteur prend son temps
    e.ballon = { ...lieu };
    e.tir = { buteur, distance: dist, valeur: 3 };
    return;
  }
  // Pénaltouche : on tape en touche et on joue le maul.
  const buteur = choisirButeur(e, pour);
  dire(e, 'penalite', pour,
    chercherLEssai
      ? `${nomClub(e, pour)} refuse les points et tape en pénaltouche : il faut l’essai.`
      : `${nomClub(e, pour)} joue la touche.`, 0, buteur.moi);
  const cibleX = pour === 'A' ? Math.min(LIGNE_B - 5, lieu.x + 30) : Math.max(LIGNE_A + 5, lieu.x - 30);
  arretDeJeu(e, 'touche', pour, { x: cibleX, y: lieu.y < LARGEUR / 2 ? 0.5 : LARGEUR - 0.5 });
}

function choisirButeur(e: EtatMatch, cote: Cote): Pion {
  const liste = surLeTerrain(e, cote);
  return [...liste].sort((a, b) => b.pied - a.pied)[0] ?? liste[0];
}


function phaseTirAuBut(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const tir = e.tir;
  e.tir = null;
  if (!tir) { arretDeJeu(e, 'coupEnvoi', e.possession, e.ballon); return; }
  const { buteur, distance: d, valeur } = tir;
  buteur.stats.butsTentes += 1;
  // Réussite : la note de pied, moins la distance.
  const chance = borner(0.95 - d / 70 + buteur.pied / 320, 0.35, 0.96);
  const reussi = e.rng() < chance && peutMarquer(budget(e, buteur.cote), valeur);
  if (reussi) {
    buteur.stats.butsReussis += 1;
    marquer(e, buteur.cote, valeur);
    dire(e, 'but', buteur.cote,
      `${buteur.nom} ne tremble pas : ${valeur} points de plus.`, valeur, buteur.moi);
  } else {
    dire(e, 'butRate', buteur.cote, `${buteur.nom} manque sa tentative, le ballon passe à côté.`, 0, buteur.moi);
  }
  if (e.sirene) return clorePeriode(e);
  arretDeJeu(e, 'coupEnvoi', adverse(buteur.cote), { x: MILIEU, y: LARGEUR / 2 });
}

// --- MARQUER ----------------------------------------------------------------
// Un reliquat de 1 (ou de 4, qui exigerait deux transformations sans essai) ne
// peut plus jamais être soldé : on interdit donc l'action qui y mènerait.
function peutMarquer(reste: number, valeur: number): boolean {
  if (reste < valeur) return false;
  const apres = reste - valeur;
  return apres !== 1 && apres !== 4;
}

function budget(e: EtatMatch, cote: Cote): number {
  return cote === 'A' ? e.resteA : e.resteB;
}

function marquer(e: EtatMatch, cote: Cote, points: number): void {
  if (cote === 'A') { e.scoreA += points; e.resteA -= points; }
  else { e.scoreB += points; e.resteB -= points; }
}

function conclureEssai(e: EtatMatch, marqueur: Pion, precision = ''): void {
  const cote = marqueur.cote;
  // ⚠️ LE BUDGET DÉCIDE. Si l'équipe n'a plus de points à marquer sur ce match,
  // l'action est repoussée : ballon tenu, en-avant, sortie en touche. C'est ce
  // qui garantit que le direct retombe EXACTEMENT sur le résultat du
  // championnat, sans jamais mentir sur ce qu'on voit à l'écran.
  if (!peutMarquer(budget(e, cote), 5)) {
    dire(e, 'jeu', adverse(cote),
      `${marqueur.nom} est tenu au-dessus de la ligne ! Ballon gratté, mêlée à cinq mètres.`, 0, marqueur.moi);
    return arretDeJeu(e, 'melee', adverse(cote), {
      x: cote === 'A' ? LIGNE_B - 5 : LIGNE_A + 5,
      y: borner(marqueur.pos.y, 6, LARGEUR - 6),
    });
  }
  marqueur.stats.essais += 1;
  marquer(e, cote, 5);
  dire(e, 'essai', cote,
    `ESSAI ${nomClub(e, cote).toUpperCase()} ! ${marqueur.nom} aplatit ${precision || 'au terme d’une belle action'} !`,
    5, marqueur.moi);

  // La transformation, si le budget la permet.
  const buteur = choisirButeur(e, cote);
  const excentre = Math.abs(marqueur.pos.y - LARGEUR / 2) / (LARGEUR / 2);
  if (peutMarquer(budget(e, cote), 2)) {
    buteur.stats.butsTentes += 1;
    const reussi = e.rng() < borner(0.92 - excentre * 0.35 + buteur.pied / 400, 0.4, 0.97);
    if (reussi) {
      buteur.stats.butsReussis += 1;
      marquer(e, cote, 2);
      dire(e, 'but', cote, `${buteur.nom} ajoute la transformation.`, 2, buteur.moi);
    } else {
      dire(e, 'butRate', cote, `${buteur.nom} manque la transformation, trop excentrée.`, 0, buteur.moi);
    }
  }
  e.phase = 'apresEssai';
  e.minuteur = 70; // le temps de replacer tout le monde et de transformer
  e.possession = adverse(cote);
}

function phaseApresEssai(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  if (e.sirene) return clorePeriode(e);
  arretDeJeu(e, 'coupEnvoi', e.possession, { x: MILIEU, y: LARGEUR / 2 });
}

// --- FIN DE PÉRIODE ---------------------------------------------------------
function clorePeriode(e: EtatMatch): void {
  if (e.periode === 1) {
    e.periode = 2;
    e.sirene = false;
    e.t = DUREE_PERIODE;
    e.phase = 'miTemps';
    e.minuteur = 3;
    dire(e, 'jalon', null, `Mi-temps : ${e.clubA} ${e.scoreA} – ${e.scoreB} ${e.clubB}.`);
    return;
  }
  terminer(e);
}

function phaseMiTemps(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  e.possession = 'A';
  arretDeJeu(e, 'coupEnvoi', 'A', { x: MILIEU, y: LARGEUR / 2 });
}

// Les points que le match n'a pas réussi à produire naturellement sont inscrits
// ici, sous forme d'actions racontées (essai transformé, pénalité), datées des
// toutes dernières minutes. Le fil de commentaire reste cohérent avec le score.
function solderLesPoints(e: EtatMatch): void {
  for (const cote of ['A', 'B'] as Cote[]) {
    let reste = cote === 'A' ? e.resteA : e.resteB;
    let garde = 0;
    while (reste > 0 && garde++ < 12) {
      const compo = surLeTerrain(e, cote);
      if (!compo.length) break;
      if (peutMarquer(reste, 7)) {
        const marqueur = compo[Math.floor(e.rng() * compo.length)];
        const buteur = choisirButeur(e, cote);
        marqueur.stats.essais += 1;
        buteur.stats.butsTentes += 1;
        buteur.stats.butsReussis += 1;
        marquer(e, cote, 7);
        dire(e, 'essai', cote,
          `ESSAI ${nomClub(e, cote).toUpperCase()} ! ${marqueur.nom} conclut en coin, ${buteur.nom} transforme.`,
          7, marqueur.moi || buteur.moi);
      } else if (peutMarquer(reste, 5)) {
        const marqueur = compo[Math.floor(e.rng() * compo.length)];
        marqueur.stats.essais += 1;
        marquer(e, cote, 5);
        dire(e, 'essai', cote,
          `ESSAI ${nomClub(e, cote).toUpperCase()} ! ${marqueur.nom} aplatit, la transformation est manquée.`,
          5, marqueur.moi);
      } else if (peutMarquer(reste, 3)) {
        const buteur = choisirButeur(e, cote);
        buteur.stats.butsTentes += 1;
        buteur.stats.butsReussis += 1;
        marquer(e, cote, 3);
        dire(e, 'but', cote, `${buteur.nom} passe une pénalité de plus.`, 3, buteur.moi);
      } else if (reste === 2) {
        const buteur = choisirButeur(e, cote);
        buteur.stats.butsTentes += 1;
        buteur.stats.butsReussis += 1;
        marquer(e, cote, 2);
        dire(e, 'but', cote, `${buteur.nom} ajoute la transformation.`, 2, buteur.moi);
      } else {
        break; // reliquat impossible à marquer proprement
      }
      reste = cote === 'A' ? e.resteA : e.resteB;
    }
  }
}

function terminer(e: EtatMatch): void {
  // ⚠️ RECONCILIATION FINALE : si le budget n'a pas été entièrement consommé
  // (une équipe a « raté » toutes ses occasions), on solde au coup de sifflet
  // plutôt que d'afficher un score différent de celui du championnat.
  solderLesPoints(e);
  e.phase = 'fini';
  e.fini = true;
  const gagnant = e.scoreA > e.scoreB ? e.clubA : e.scoreB > e.scoreA ? e.clubB : null;
  dire(e, 'jalon', null,
    `Coup de sifflet final ! ${e.clubA} ${e.scoreA} – ${e.scoreB} ${e.clubB}. ` +
    (gagnant ? `${gagnant} l’emporte.` : 'Les deux équipes se quittent dos à dos.'));
}

// --- REMPLACEMENTS ----------------------------------------------------------
// Le coach IA regarde la barre d'endurance : un joueur vidé sort, même avant
// la 60e. Les avants sortent plus tôt que les trois-quarts, comme dans la vraie
// vie — et on ne remplace jamais l'avatar du joueur humain sans raison.
function gererRemplacements(e: EtatMatch): void {
  for (const cote of ['A', 'B'] as Cote[]) {
    const faits = cote === 'A' ? e.remplacementsA : e.remplacementsB;
    if (faits >= 6) continue;
    const sur = surLeTerrain(e, cote);
    const epuise = sur
      .filter((p) => p.endurance < (p.avant ? 34 : 26) && !p.moi)
      .sort((a, b) => a.endurance - b.endurance)[0];
    if (!epuise) continue;
    const banc = e.pions.filter((p) => p.cote === cote && !p.surLeTerrain && p.minutesJouees === 0);
    // On cherche un remplaçant du même secteur (avant / trois-quarts).
    const entrant = banc.find((p) => p.avant === epuise.avant) ?? banc[0];
    if (!entrant) continue;
    epuise.surLeTerrain = false;
    entrant.surLeTerrain = true;
    entrant.numero = epuise.numero;
    entrant.pos = { ...epuise.pos };
    entrant.cible = { ...epuise.pos };
    if (cote === 'A') e.remplacementsA += 1; else e.remplacementsB += 1;
    dire(e, 'remplacement', cote,
      `🔄 ${nomClub(e, cote)} : ${entrant.nom} remplace ${epuise.nom}, à bout de souffle.`);
  }
}

// --- COACHING EN DIRECT -----------------------------------------------------
export function appliquerConsigne(e: EtatMatch, c: ConsigneJoueur | undefined): void {
  e.consigne = c;
  if (c) dire(e, 'jeu', null, `📣 Consigne transmise : « ${c.libelle} »`);
}

// --- STATISTIQUES DE FIN DE MATCH ------------------------------------------
export interface BilanMatch {
  scoreA: number;
  scoreB: number;
  parJoueur: { nom: string; club: string; numero: number; stats: Pion['stats']; minutes: number }[];
}

export function bilan(e: EtatMatch): BilanMatch {
  return {
    scoreA: e.scoreA,
    scoreB: e.scoreB,
    parJoueur: e.pions
      .filter((p) => p.minutesJouees > 0)
      .map((p) => ({
        nom: p.nom,
        club: nomClub(e, p.cote),
        numero: p.numero,
        stats: p.stats,
        minutes: Math.round(p.minutesJouees),
      })),
  };
}

export function pionDuJoueur(etat: EtatMatch): Pion | undefined {
  return etat.pions.find((p) => p.moi);
}
