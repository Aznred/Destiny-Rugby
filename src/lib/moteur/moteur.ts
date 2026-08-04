// ⚙️ LE MOTEUR DE MATCH — 80 minutes jouées tick par tick.
//
// Trente pions se déplacent en mètres sur un terrain de 122 × 70. Rien n'est
// scripté : les plaquages naissent d'une collision, les rucks d'un plaquage,
// les essais d'un espace réellement ouvert. Le moteur décide COMMENT et QUAND
// on marque ; le score final, lui, reste celui de la ligue (voir `plan.ts`).
//
// ═══ CE QUI STRUCTURE LE JEU ════════════════════════════════════════════════
// 1. LE LANCEMENT (`Lancement`) : à chaque libération de ballon, une combinaison
//    est choisie — percussion au ras, bloc d'avants au premier temps, écartement
//    jusqu'à l'aile, passe sautée, coup de pied d'occupation. Elle contient la
//    CHAÎNE DE PASSES (9 → 10 → 12 → 13 → ailier), et c'est elle qui garantit
//    que le ballon voyage vraiment jusqu'aux ailes.
// 2. LA LECTURE : le choix dépend du terrain (ses 22, son camp, les 22
//    adverses), du surnombre au large, du nombre de temps de jeu, du score et
//    du chrono — exactement les critères d'un vrai demi d'ouverture.
// 3. LA DÉFENSE (`tactique.ts`) : premier rideau qui monte ensemble, second
//    rideau en couverture du jeu au pied, sentinelle derrière le ruck.
//
// ⚠️ DÉTERMINISME : `avancer()` accumule le reliquat et ne fait QUE des pas de
// DT exacts. Le match suivi en direct (appels de 16 ms) et le même match rejoué
// en fond (appels de 8 s) donnent donc rigoureusement le même résultat.

import { graine } from '../championnat';
import type { Coequipier } from '../effectif';
import type { PosteId } from '../../types';
import { POSTE_PAR_ID } from '../../data/rugby';
import {
  ORDRE_MAILLOTS, creerPion, deplacer, stopper,
  type AttributsPion, type Pion, type StatsMatch,
} from './entites';
import {
  PHASES_ARRETEES, type ConsigneJoueur, type EtatMatch,
  type IntentionPied, type Lancement, type Phase, type PlanDeScore, type TypeCommentaire,
} from './etat';
import {
  choisirCoteOuvert, choisirSysteme, placerEquipes, plusProche, surLeTerrain,
  surnombreAuLarge, vitesseMontee, numero as maillot,
} from './tactique';
import {
  placementCoupEnvoi, placementInitial, placementMelee, placementRenvoi22,
  placementRuck, placementTir, placementTouche,
} from './phasesArretees';
import { decomposer } from './plan';
import * as C from './commentaire';
import {
  AXE, LARGEUR, LIGNE_A, LIGNE_B, MILIEU, M22_A, M22_B, adverse, borner,
  dansSes22, dansSonCamp, distance, distance2, franchieLigne, horsDuTerrain,
  melanger, metresAvantLaLigne, sens, type Cote, type Vec,
} from './terrain';

export type { EtatMatch, Commentaire } from './etat';
export type { Pion } from './entites';

// Pas de simulation, en secondes. Exporté : l'affichage en a besoin pour
// interpoler entre deux pas (voir `MatchLive.tsx`).
export const DT = 0.15;
const DUREE_PERIODE = 40 * 60;
const RAYON_PLAQUAGE = 1.35;

// Durée de chaque phase arrêtée : ce qu'on REGARDE (secondes simulées) et ce que
// l'horloge du match AVALE (secondes de jeu). C'est cette dissociation qui rend
// le direct regardable : la mêlée se met en place en 5 secondes à l'écran, mais
// le chrono avance de 50 secondes, comme dans la réalité.
// ⚠️ LA DURÉE VISUELLE DOIT SUFFIRE À TRAVERSER LE TERRAIN. Un joueur court à
// ~9 m/s : pour un coup d'envoi, il a jusqu'à 60 mètres à parcourir. Avec les
// 3 secondes du premier réglage, la moitié de l'équipe était encore en route
// quand le ballon partait — d'où l'impression qu'« il n'y a pas de coup d'envoi
// et que les joueurs ne sont pas replacés ». Idem pour la touche.
const ARRETS: Record<string, { visuel: number; horloge: number }> = {
  melee: { visuel: 7, horloge: 50 },
  touche: { visuel: 9, horloge: 35 },
  transformation: { visuel: 4, horloge: 55 },
  tirAuBut: { visuel: 6, horloge: 60 },
  coupEnvoi: { visuel: 9, horloge: 22 },
  renvoi22: { visuel: 7, horloge: 20 },
  apresEssai: { visuel: 9, horloge: 58 }, // célébration + transformation
  penalite: { visuel: 2.5, horloge: 12 },
  miTemps: { visuel: 3, horloge: 0 },
};

function facteurHorloge(phase: Phase): number {
  const a = ARRETS[phase];
  return a ? a.horloge / a.visuel : 1;
}

// ---------------------------------------------------------------------------
// CRÉATION DU MATCH
// ---------------------------------------------------------------------------

export interface Avatar {
  club: string; nom: string; poste: PosteId; attributs: AttributsPion; titulaire?: boolean;
}

function planVide(total: number, rng: () => number): PlanDeScore {
  const d = decomposer(total, rng);
  return {
    essaisTransformes: d.essaisTransformes,
    essaisSecs: d.essaisSecs,
    penalites: d.penalites,
    total,
    marques: 0,
  };
}

// ⚠️ LE BANC EST UN VRAI BANC DE RUGBY : 5 avants + 3 arrières (16-23), à leur
// poste. Prendre « les huit meilleurs restants » donnait un banc de
// trois-quarts, et un arrière entrait en pilier — vu à l'écran : Blair
// Kinghorn avec le n°1 sur la feuille de match.
const BANC_TYPE: PosteId[] = [
  'pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g',
  'troisieme_aile_g', 'demi_melee', 'demi_ouverture', 'premier_centre',
];

// La feuille de match : chaque maillot 1-15 va au meilleur joueur DISPONIBLE à
// ce poste, à défaut à un joueur de la même famille. Le pion joue ensuite au
// poste de son MAILLOT.
function composer(effectif: Coequipier[]): Coequipier[] {
  const dispo = [...effectif].sort((a, b) => b.note - a.note);
  const pris = new Set<Coequipier>();

  const prendre = (poste: PosteId, obligatoire: boolean): Coequipier | undefined => {
    const famille = POSTE_PAR_ID[poste]?.famille;
    const avant = (POSTE_PAR_ID[poste]?.categorie ?? 'Avant') === 'Avant';
    const choisi = dispo.find((c) => !pris.has(c) && c.poste === poste)
      ?? dispo.find((c) => !pris.has(c) && POSTE_PAR_ID[c.poste]?.famille === famille)
      // Pour le banc, on reste dans la bonne CATÉGORIE : un ailier ne finit
      // jamais talonneur.
      ?? dispo.find((c) => !pris.has(c)
        && ((POSTE_PAR_ID[c.poste]?.categorie ?? 'Avant') === 'Avant') === avant)
      ?? (obligatoire ? dispo.find((c) => !pris.has(c)) : undefined);
    if (choisi) pris.add(choisi);
    return choisi;
  };

  const titulaires: Coequipier[] = [];
  for (const poste of ORDRE_MAILLOTS) {
    const c = prendre(poste, true);
    if (!c) break;
    titulaires.push({ ...c, poste });
  }
  const banc: Coequipier[] = [];
  for (const poste of BANC_TYPE) {
    const c = prendre(poste, false);
    if (c) banc.push({ ...c, poste });
  }
  return [...titulaires, ...banc];
}

export function creerMatch(
  clubA: string, clubB: string,
  effectifA: Coequipier[], effectifB: Coequipier[],
  scoreCibleA: number, scoreCibleB: number,
  cle: string, avatar?: Avatar,
): EtatMatch {
  const rng = graine('moteur2#' + cle);
  const pions: Pion[] = [];

  const monter = (eff: Coequipier[], cote: Cote, club: string) => {
    const liste = composer(eff);
    if (avatar && avatar.club === club) {
      // Le joueur prend le maillot de son poste s'il est titulaire ; sinon la
      // place du banc qui correspond à son poste (ou à sa famille), pour qu'il
      // entre bien À SON POSTE.
      let index: number;
      if (avatar.titulaire === false) {
        const famille = POSTE_PAR_ID[avatar.poste]?.famille;
        const surLeBanc = BANC_TYPE.findIndex((p) => p === avatar.poste);
        const parFamille = BANC_TYPE.findIndex((p) => POSTE_PAR_ID[p]?.famille === famille);
        index = 15 + borner(surLeBanc >= 0 ? surLeBanc : parFamille >= 0 ? parFamille : 7, 0, 7);
      } else {
        const place = ORDRE_MAILLOTS.indexOf(avatar.poste);
        index = place >= 0 ? place : 9;
      }
      if (liste[index]) liste[index] = { ...liste[index], nom: avatar.nom, poste: avatar.poste };
    }
    liste.forEach((c, i) => {
      const moi = !!avatar && avatar.club === club && c.nom === avatar.nom;
      pions.push(creerPion(c, i, cote, moi, moi ? avatar!.attributs : undefined));
    });
  };
  monter(effectifA, 'A', clubA);
  monter(effectifB, 'B', clubB);

  const possession: Cote = rng() < 0.5 ? 'A' : 'B';
  const e: EtatMatch = {
    clubA, clubB,
    t: 0, sim: 0, reliquat: 0, minute: 0, periode: 1, sirene: false,
    phase: 'coupEnvoi', minuteur: ARRETS.coupEnvoi.visuel,
    pions, ballon: { x: MILIEU, y: AXE }, porteur: null, possession, vol: null,
    lancement: null, ouvert: 1, phasesDepuisArret: 0, ligneAvantage: MILIEU, metresGagnesPhase: 0,
    ballonLent: false, derniereTouche: null, perceeSignalee: false, aide: 0,
    systeme: 'blitz', ligneDef: MILIEU, horsJeu: MILIEU, gardeRuck: 0,
    scoreA: 0, scoreB: 0,
    planA: planVide(scoreCibleA, rng), planB: planVide(scoreCibleB, rng),
    essaisA: 0, essaisB: 0,
    compteurs: { rucks: 0, melees: 0, touches: 0, percees: 0, tempsA: 0, tempsB: 0 },
    placement: null, cibleRenvoi: null, tir: null, penalite: null,
    remplacementsA: 0, remplacementsB: 0, prochaineDecision: 1, compteur: 0,
    commentaires: [], fini: false, rng,
  };

  e.cibleRenvoi = {
    x: MILIEU + sens(possession) * 30,
    y: borner(AXE + (rng() < 0.5 ? 1 : -1) * 16, 8, LARGEUR - 8),
  };
  e.placement = placementInitial(pions, possession, e.cibleRenvoi);
  for (const p of pions) {
    const c = e.placement[p.id];
    if (c) { p.pos = { x: c.x, y: c.y }; p.cible = { x: c.x, y: c.y }; stopper(p); }
  }
  dire(e, 'jalon', null, `Coup d’envoi ! ${clubA} reçoit ${clubB}.`);
  return e;
}

// ---------------------------------------------------------------------------
// BOUCLE PRINCIPALE
// ---------------------------------------------------------------------------

export function avancer(e: EtatMatch, secondesSimulees: number): void {
  if (e.fini) return;
  e.reliquat += secondesSimulees;
  let garde = 0;
  while (e.reliquat >= DT && !e.fini && garde++ < 40000) {
    e.reliquat -= DT;
    tick(e);
  }
}

function tick(e: EtatMatch): void {
  const dt = DT;
  e.sim += dt;
  const dtHorloge = dt * facteurHorloge(e.phase);
  e.t += dtHorloge;
  e.minute = Math.min(80, Math.floor(e.t / 60));

  // ── Chronomètre, sirène, mi-temps ────────────────────────────────────────
  const finPeriode = e.periode * DUREE_PERIODE;
  if (!e.sirene && e.t >= finPeriode) {
    e.sirene = true;
    dire(e, 'jalon', null, e.periode === 1
      ? '🔔 La sirène retentit. On joue jusqu’à la sortie du ballon.'
      : '🔔 Sirène ! Le temps est écoulé : ballon mort et c’est terminé.');
  }
  // Garde-fou : on ne joue pas trois minutes de plus.
  if (e.sirene && e.t > finPeriode + 150) return clorePeriode(e);

  // ── Compteurs des joueurs ────────────────────────────────────────────────
  for (const p of e.pions) {
    if (p.battu > 0) p.battu = Math.max(0, p.battu - dt);
    if (p.sanction > 0) {
      p.sanction = Math.max(0, p.sanction - dtHorloge);
      if (p.sanction === 0 && !p.surLeTerrain) {
        p.surLeTerrain = true;
        p.pos = { x: e.ballon.x, y: p.numero <= 8 ? 4 : LARGEUR - 4 };
        stopper(p);
      }
      continue;
    }
    if (p.surLeTerrain) {
      p.minutes += dtHorloge / 60;
      // On récupère un peu de souffle pendant les arrêts de jeu.
      if (PHASES_ARRETEES.has(e.phase)) p.endurance = Math.min(100, p.endurance + dtHorloge * 0.055);
    }
  }
  if (e.minute >= 48) gererRemplacements(e);

  // ── Placement toutes les 3 images de simulation (0,45 s) : invisible à
  // l'écran, et trois fois moins cher pour la simulation de fond.
  if (e.compteur++ % 3 === 0) {
    placerEquipes(e);
    if (e.placement) {
      for (const p of e.pions) {
        const c = e.placement[p.id];
        if (c && p.surLeTerrain) p.cible = c;
      }
    }
  }

  // ── Le rythme de marque, relu par la tactique ────────────────────────────
  e.aide = retard(e, e.possession);
  if (e.phase === 'jeuCourant' || e.phase === 'ruck' || e.phase === 'maul') {
    if (e.possession === 'A') e.compteurs.tempsA += dt; else e.compteurs.tempsB += dt;
  }

  // ── La ligne défensive avance ────────────────────────────────────────────
  if (e.phase === 'jeuCourant' && e.porteur) {
    if (e.gardeRuck > 0) {
      e.gardeRuck -= dt;
    } else {
      const sa = sens(e.possession);
      e.ligneDef -= sa * vitesseMontee(e, adverse(e.possession)) * dt;
      // ⚠️ Le rideau s'arrête AU CONTACT, 60 cm DEVANT le porteur. Le signe
      // était inversé : la ligne se plaçait derrière lui, donc tous les
      // défenseurs comptaient comme battus et la défense était transparente.
      const limite = e.porteur.pos.x + sa * 0.6;
      if ((e.ligneDef - limite) * sa < 0) e.ligneDef = limite;
    }
  }

  // ── Le ballon en vol ─────────────────────────────────────────────────────
  if (e.vol) {
    e.vol.ecoule += dt;
    const k = Math.min(1, e.vol.ecoule / e.vol.duree);
    e.ballon = {
      x: e.vol.de.x + (e.vol.vers.x - e.vol.de.x) * k,
      y: e.vol.de.y + (e.vol.vers.y - e.vol.de.y) * k,
    };
  }

  // ── Déplacements ─────────────────────────────────────────────────────────
  for (const p of e.pions) {
    if (!p.surLeTerrain || p.sanction > 0) continue;
    if (p === e.porteur) continue; // le porteur est piloté par sa course
    deplacer(p, dt);
  }

  e.minuteur -= dt;
  switch (e.phase) {
    case 'coupEnvoi': return phaseCoupEnvoi(e);
    case 'renvoi22': return phaseRenvoi22(e);
    case 'jeuCourant': return phaseJeuCourant(e, dt);
    case 'ballonEnLAir': return phaseBallonEnLAir(e);
    case 'ruck': return phaseRuck(e);
    case 'maul': return phaseMaul(e, dt);
    case 'melee': return phaseMelee(e);
    case 'touche': return phaseTouche(e);
    case 'penalite': return phasePenalite(e);
    case 'tirAuBut': return phaseTirAuBut(e);
    // ⚠️ Pas de phase `transformation` : la transformation est jouée dans la
    // foulée de l'essai (`tenterEssai`), et c'est `apresEssai` qui en avale le
    // temps au chronomètre.
    case 'apresEssai': return phaseApresEssai(e);
    case 'miTemps': return phaseMiTemps(e);
    default: return;
  }
}

// ---------------------------------------------------------------------------
// COMMENTAIRE
// ---------------------------------------------------------------------------

function dire(
  e: EtatMatch, type: TypeCommentaire, cote: Cote | null, texte: string,
  points = 0, moi = false,
): void {
  e.commentaires.push({
    minute: Math.min(80, Math.floor(e.t / 60)), texte, type, cote, points,
    scoreA: e.scoreA, scoreB: e.scoreB, moi,
  });
}

// ⚠️ INSTALLER UNE FORMATION. Les joueurs COURENT s'y placer — c'est ce qui
// rend les phases arrêtées vivantes. Mais un joueur peut avoir cent mètres à
// parcourir (il vient d'aplatir dans l'en-but et le coup d'envoi se joue au
// centre) : à 8 m/s, aucune durée raisonnable ne suffit, et le ballon repartait
// avec la moitié de l'équipe encore en chemin. Au-delà de `seuil` mètres, on
// replace donc directement — le chronomètre a de toute façon avalé 20 à 60
// secondes pendant l'arrêt.
function installerPlacement(e: EtatMatch, placement: Record<string, Vec>, seuil = 26): void {
  e.placement = placement;
  for (const p of e.pions) {
    if (!p.surLeTerrain || p.sanction > 0) continue;
    const c = placement[p.id];
    if (!c) continue;
    p.cible = c;
    if (distance(p.pos, c) > seuil) {
      p.pos = { x: c.x, y: c.y };
      stopper(p);
    }
  }
}

function nomClub(e: EtatMatch, cote: Cote): string { return cote === 'A' ? e.clubA : e.clubB; }
function planDe(e: EtatMatch, cote: Cote): PlanDeScore { return cote === 'A' ? e.planA : e.planB; }
function ecart(e: EtatMatch, cote: Cote): number {
  return cote === 'A' ? e.scoreA - e.scoreB : e.scoreB - e.scoreA;
}

// LE RYTHME : positif = l'équipe est en retard sur son plan de marque, il faut
// lui ouvrir des espaces ; négatif = elle marque trop vite, la défense se
// durcit. C'est ce réglage invisible qui fait tomber le score juste sans jamais
// « refuser » un essai à l'écran.
// L'ÉCHÉANCIER : le score doit tomber tout au long des 80 minutes, pas dans le
// premier quart d'heure. On compare ce qui est marqué à ce qui devrait l'être à
// cet instant. ⚠️ Le facteur est presque linéaire (1,03) — un facteur trop
// avancé bouclait le score à la 64ᵉ et la fin de match devenait stérile. La
// marge de sécurité vient plutôt de la POUSSÉE FINALE : à partir de la 60ᵉ,
// l'écart au plan pèse deux fois plus lourd.
function retard(e: EtatMatch, cote: Cote): number {
  const plan = planDe(e, cote);
  if (plan.total <= 0) return -0.5;
  const attendu = plan.total * Math.min(1, (e.t / (2 * DUREE_PERIODE)) * 1.03);
  let r = (attendu - plan.marques) / Math.max(8, plan.total);
  if (e.minute >= 60) r *= 2;
  return borner(r, -0.6, 1);
}

// ---------------------------------------------------------------------------
// PHASE : COUP D'ENVOI ET RENVOIS
// ---------------------------------------------------------------------------

function preparerCoupEnvoi(e: EtatMatch, pour: Cote): void {
  e.possession = pour;
  e.porteur = null;
  e.vol = null;
  e.lancement = null;
  e.phasesDepuisArret = 0;
  e.ballon = { x: MILIEU, y: AXE };
  e.phase = 'coupEnvoi';
  e.minuteur = ARRETS.coupEnvoi.visuel;
  e.ouvert = e.rng() < 0.5 ? 1 : -1;
  // Le point de chute est décidé MAINTENANT : les deux équipes se placent en
  // fonction de lui, exactement comme sur un terrain. ⚠️ S'il a déjà été fixé
  // (les joueurs regagnent le centre pendant la transformation), on le GARDE :
  // sinon ils changeraient de destination à mi-parcours.
  if (!e.cibleRenvoi) viserLeCoupEnvoi(e, pour);
  installerPlacement(e, placementCoupEnvoi(e.pions, MILIEU, pour, e.cibleRenvoi!));
}

// Fixe le point de chute du coup d'envoi et renvoie tout le monde au centre.
// Appelé dès l'essai marqué : les vingt-deux joueurs ont ainsi la durée de la
// célébration ET de la transformation pour rejoindre leur place, comme dans un
// vrai match. Sans ça, le ballon repartait alors que la moitié du terrain était
// encore en train de courir.
function viserLeCoupEnvoi(e: EtatMatch, pour: Cote): void {
  e.cibleRenvoi = {
    x: MILIEU + sens(pour) * (27 + e.rng() * 11),
    y: borner(AXE + (e.rng() < 0.5 ? 1 : -1) * (14 + e.rng() * 10), 8, LARGEUR - 8),
  };
}

function phaseCoupEnvoi(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const camp = e.possession;
  const liste = surLeTerrain(e, camp);
  const botteur = maillot(liste, 10) ?? liste[0];
  if (!botteur) return clorePeriode(e);
  const arrivee = e.cibleRenvoi ?? { x: MILIEU + sens(camp) * 30, y: AXE };
  botteur.stats.coupsDePied += 1;
  e.placement = null;
  lancerVol(e, botteur, arrivee, 'renvoi', 3.0, 1, { x: MILIEU, y: AXE });
  dire(e, 'pied', camp, `${botteur.nom} donne le coup d’envoi.`, 0, botteur.moi);
}

function phaseRenvoi22(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const camp = e.possession;
  const s = sens(camp);
  const liste = surLeTerrain(e, camp);
  const botteur = [...liste].sort((a, b) => b.pied - a.pied)[0] ?? liste[0];
  if (!botteur) return clorePeriode(e);
  const depart = camp === 'A' ? M22_A : M22_B;
  const arrivee = {
    x: depart + s * (28 + botteur.pied / 4 + e.rng() * 10),
    y: borner(AXE + (e.rng() * 30 - 15), 6, LARGEUR - 6),
  };
  botteur.stats.coupsDePied += 1;
  e.placement = null;
  lancerVol(e, botteur, arrivee, 'renvoi', 2.8, 1, { x: depart, y: AXE });
  dire(e, 'pied', camp, `Renvoi aux 22 de ${botteur.nom}.`, 0, botteur.moi);
}

// ---------------------------------------------------------------------------
// LE BALLON EN L'AIR
// ---------------------------------------------------------------------------

function lancerVol(
  e: EtatMatch, auteur: Pion, arrivee: Vec, intention: IntentionPied,
  duree: number, hauteur: number, depuis?: Vec,
): void {
  const de = depuis ?? { x: auteur.pos.x, y: auteur.pos.y };
  e.vol = {
    de, vers: arrivee, duree, ecoule: 0, hauteur,
    type: 'pied', intention, auteur, receveur: null,
  };
  auteur.stats.metresAuPied += Math.abs(arrivee.x - de.x);
  e.porteur = null;
  e.phase = 'ballonEnLAir';
  e.minuteur = duree + 0.5;
  e.derniereTouche = auteur;
}

function phaseBallonEnLAir(e: EtatMatch): void {
  const v = e.vol;
  if (!v) return reprendreJeu(e, e.ballon);
  if (v.ecoule < v.duree) return;
  e.vol = null;
  const camp = v.auteur.cote;
  const arrivee = e.ballon;

  // ── Sortie en touche ─────────────────────────────────────────────────────
  if (horsDuTerrain(arrivee)) {
    if (v.intention === 'penaltouche') {
      dire(e, 'touche', camp, `Touche à suivre pour ${nomClub(e, camp)}.`);
      return arret(e, 'touche', camp, arrivee);
    }
    if (v.intention === 'cinquanteVingtDeux') {
      dire(e, 'pied', camp, C.phrase(e.rng, C.PIED_5022, { nom: v.auteur.nom }), 0, v.auteur.moi);
      return arret(e, 'touche', camp, arrivee);
    }
    // Coup de pied direct depuis l'extérieur de ses 22 : touche au point du coup
    // de pied. Depuis ses 22 : là où le ballon sort.
    const direct = !dansSes22(v.de, camp);
    const lieu = direct ? { x: v.de.x, y: arrivee.y } : arrivee;
    return arret(e, 'touche', adverse(camp), lieu);
  }

  // ── Ballon dans l'en-but ─────────────────────────────────────────────────
  if (arrivee.x <= LIGNE_A || arrivee.x >= LIGNE_B) {
    const defenseur: Cote = arrivee.x <= LIGNE_A ? 'A' : 'B';
    if (v.intention === 'cinquanteVingtDeux' || v.intention === 'occupation') {
      dire(e, 'pied', camp, `Ballon dans l’en-but, renvoi aux 22.`);
    }
    return arret(e, 'renvoi22', defenseur, { x: defenseur === 'A' ? M22_A : M22_B, y: AXE });
  }

  // ── Réception contestée ──────────────────────────────────────────────────
  const proches = e.pions.filter((p) => p.surLeTerrain && p.sanction <= 0 && distance2(p.pos, arrivee) < 400);
  const mien = proches.filter((p) => p.cote === camp);
  const adv = proches.filter((p) => p.cote !== camp);
  const meilleur = (l: Pion[]) => {
    let best: Pion | null = null; let note = -Infinity;
    for (const p of l) {
      const n2 = p.detente * 0.5 + p.vision * 0.3 - distance(p.pos, arrivee) * 3.2;
      if (n2 > note) { note = n2; best = p; }
    }
    return best;
  };
  const chasseur = meilleur(mien);
  const receveur = meilleur(adv);

  // Un coup de pied de récupération (chandelle, rasant, transversale) donne une
  // vraie chance au chasseur ; un dégagement, non.
  const contestable = v.intention === 'chandelle' || v.intention === 'rasant'
    || v.intention === 'transversale' || v.intention === 'renvoi';
  const chanceChasseur = contestable ? 0.42 : 0.12;

  let gagnant: Pion | null = null;
  if (chasseur && (!receveur || e.rng() < chanceChasseur
    || distance(chasseur.pos, arrivee) < distance(receveur.pos, arrivee) - 5)) {
    gagnant = chasseur;
  } else {
    gagnant = receveur ?? chasseur;
  }
  if (!gagnant) {
    const tous = e.pions.filter((p) => p.surLeTerrain && p.sanction <= 0);
    gagnant = plusProche(arrivee, tous);
  }
  if (!gagnant) return clorePeriode(e);

  if (gagnant.cote === camp && contestable) {
    dire(e, 'pied', camp, `${gagnant.nom} récupère le ballon dans les airs !`, 0, gagnant.moi);
  }
  // Petit risque d'échapper un ballon haut.
  if (v.hauteur > 0.7 && e.rng() < 0.07) {
    dire(e, 'jeu', gagnant.cote, C.phrase(e.rng, C.EN_AVANT, {
      nom: gagnant.nom, club: nomClub(e, adverse(gagnant.cote)),
    }), 0, gagnant.moi);
    gagnant.stats.passesRatees += 1;
    return arret(e, 'melee', adverse(gagnant.cote), gagnant.pos);
  }
  e.possession = gagnant.cote;
  reprendreJeu(e, gagnant.pos, gagnant);
}

// ---------------------------------------------------------------------------
// LE JEU COURANT
// ---------------------------------------------------------------------------

function phaseJeuCourant(e: EtatMatch, dt: number): void {
  // Une passe est en l'air.
  if (e.vol && e.vol.type === 'passe') {
    if (e.vol.ecoule < e.vol.duree) return;
    const receveur = e.vol.receveur;
    const offload = e.vol.intention === 'offload';
    e.vol = null;
    if (!receveur || !receveur.surLeTerrain || receveur.sanction > 0) return formerRuck(e, e.ballon);
    donnerBallon(e, receveur, offload ? 0.5 : 0.35);
    return;
  }

  const porteur = e.porteur;
  if (!porteur) return formerRuck(e, e.ballon);
  const s = sens(porteur.cote);

  // ── La course du porteur ─────────────────────────────────────────────────
  porteur.cible = ligneDeCourse(e, porteur);
  const avant = porteur.pos.x;
  deplacer(porteur, dt);
  // ⚠️ LES MÈTRES SE COMPTENT AU-DELÀ DE LA LIGNE D'AVANTAGE, comme dans les
  // statistiques officielles. Un ouvreur qui reçoit dix mètres derrière le ruck
  // et court cinq mètres vers l'avant n'a pas « gagné cinq mètres » : il n'a
  // même pas atteint la ligne. Compter tout mouvement vers l'avant donnait
  // 1 700 mètres par équipe, trois fois la réalité.
  const audela = (x: number) => Math.max(0, (x - e.ligneAvantage) * s);
  const gagne = audela(porteur.pos.x) - audela(avant);
  if (gagne > 0) {
    porteur.stats.metres += gagne;
    e.metresGagnesPhase = Math.max(e.metresGagnesPhase, audela(porteur.pos.x));
  }
  e.ballon = { x: porteur.pos.x, y: porteur.pos.y };

  // ── Ligne d'essai, touche ────────────────────────────────────────────────
  if (franchieLigne(porteur.pos, porteur.cote)) return tenterEssai(e, porteur);
  if (horsDuTerrain(porteur.pos)) {
    dire(e, 'touche', adverse(porteur.cote), `${porteur.nom} est poussé en touche.`, 0, porteur.moi);
    return arret(e, 'touche', adverse(porteur.cote), porteur.pos);
  }

  // ── Pression, collision et franchissement, en un seul balayage ───────────
  let pression = 99;
  let plaqueur: Pion | null = null;
  let depasses = 0;
  for (const d of surLeTerrain(e, adverse(porteur.cote))) {
    if (d.sanction > 0) continue;
    const devant = (d.pos.x - porteur.pos.x) * s;
    if (devant < -0.5) depasses++;
    if (d.battu <= 0) {
      const dd = distance(d.pos, porteur.pos);
      if (dd <= RAYON_PLAQUAGE && !plaqueur) plaqueur = d;
      if (dd < pression && devant > -1.2) pression = dd;
    }
  }

  // ⚠️ UNE PERCÉE, C'EST LA LIGNE FRANCHIE. On la reconnaît au nombre de
  // défenseurs laissés derrière — dix sur quinze — ET au terrain réellement
  // gagné sur la phase : sans cette seconde condition, le simple retard du
  // rideau à la sortie du ruck comptait pour une percée.
  if (!e.perceeSignalee && depasses >= 13 && pression > 10 && e.metresGagnesPhase > 8) {
    e.perceeSignalee = true;
    e.compteurs.percees += 1;
    porteur.stats.franchissements += 1;
    dire(e, 'franchissement', porteur.cote,
      C.phrase(e.rng, C.FRANCHISSEMENT, { nom: porteur.nom }), 0, porteur.moi);
  }

  // ⚠️ « FIXER ET DONNER » — ÉVALUÉ À CHAQUE TICK, avant le plaquage.
  // C'était LE bug du ballon qui n'allait jamais à l'aile : la décision n'était
  // reprise que toutes les 0,22 s, et entre 3 m et 1,35 m il ne s'écoule que
  // 0,13 s — le porteur était plaqué avant d'avoir eu le droit de passer.
  const lancement = e.lancement;
  const suivant = lancement && lancement.index + 1 < lancement.chaine.length
    ? lancement.chaine[lancement.index + 1] : null;
  if (suivant && suivant.surLeTerrain && pression <= (porteur.avant ? 2.6 : 3.7)) {
    return passerLeBallon(e, porteur, suivant, pression);
  }

  if (plaqueur && porteur.battu <= 0) return resoudrePlaquage(e, porteur, plaqueur);

  // ── Les décisions plus lourdes (coup de pied, drop) ──────────────────────
  e.prochaineDecision -= dt;
  if (e.prochaineDecision > 0) return;
  e.prochaineDecision = 0.25;
  deciderAvecLeBallon(e, porteur, pression);
}

// LA LIGNE DE COURSE : on ne fonce pas tout droit. Tant qu'il reste un
// partenaire dans la chaîne, le porteur vient FIXER son vis-à-vis ; sinon il
// attaque l'espace en dehors de lui.
function ligneDeCourse(e: EtatMatch, p: Pion): Vec {
  const s = sens(p.cote);
  const ouvert = e.ouvert;
  const defense = surLeTerrain(e, adverse(p.cote));
  let marqueur: Pion | null = null;
  let dMin = Infinity;
  for (const d of defense) {
    if (d.battu > 0 || d.sanction > 0) continue;
    if ((d.pos.x - p.pos.x) * s < -1.5) continue; // déjà battu
    const dd = distance2(d.pos, p.pos);
    if (dd < dMin) { dMin = dd; marqueur = d; }
  }
  const distMarqueur = marqueur ? Math.sqrt(dMin) : 99;
  const restant = metresAvantLaLigne(p.pos, p.cote);

  // Personne devant : cap sur la ligne, et on rentre vers les poteaux à
  // l'approche pour faciliter la transformation.
  if (!marqueur || distMarqueur > 13) {
    const versLAxe = restant < 22 ? borner((22 - restant) / 22, 0, 1) * 0.55 : 0;
    return {
      x: p.pos.x + s * 22,
      y: borner(melanger(p.pos.y, AXE, versLAxe), 2.5, LARGEUR - 2.5),
    };
  }
  const suite = e.lancement && e.lancement.index + 1 < e.lancement.chaine.length;
  if (suite) {
    // Fixer : courir sur l'épaule intérieure du vis-à-vis pour l'aspirer.
    return { x: p.pos.x + s * 14, y: borner(marqueur.pos.y + ouvert * 0.6, 2.5, LARGEUR - 2.5) };
  }
  // Attaquer l'intervalle extérieur.
  return { x: p.pos.x + s * 15, y: borner(marqueur.pos.y + ouvert * 5.5, 2.5, LARGEUR - 2.5) };
}

function donnerBallon(e: EtatMatch, p: Pion, delai: number): void {
  e.porteur = p;
  e.possession = p.cote;
  e.ballon = { x: p.pos.x, y: p.pos.y };
  p.stats.courses += 1;
  e.prochaineDecision = delai;
  e.vol = null;
}

// LES DÉCISIONS DE SECOND PLAN : le jeu au pied et le drop. La passe, elle, est
// arbitrée à chaque tick dans `phaseJeuCourant`.
function deciderAvecLeBallon(e: EtatMatch, p: Pion, pression: number): void {
  const lancement = e.lancement;
  const suivant = lancement && lancement.index + 1 < lancement.chaine.length;

  // Coup de pied prévu par le lancement (occupation, chandelle, dégagement) :
  // le botteur tape dès qu'il a le ballon et un peu d'air.
  if (lancement && lancement.type === 'pied' && lancement.botteur === p && pression > 2.4) {
    return taperAuPied(e, p, lancement.intention ?? 'occupation');
  }
  if (suivant) return;

  // Le drop : trois points quand la défense tient bon. Le 10 le tente s'il lui
  // reste des points « au pied » à inscrire et que le temps presse.
  if (p.numero === 10 && metresAvantLaLigne(p.pos, p.cote) < 34
    && planDe(e, p.cote).penalites > 0 && pression > 4
    && e.rng() < (e.minute >= 62 ? 0.12 : 0.03)) {
    return taperAuPied(e, p, 'drop');
  }
  // Rasant derrière une défense montée, tout près de la ligne.
  if (!p.avant && metresAvantLaLigne(p.pos, p.cote) < 26 && pression < 6
    && p.pied > 55 && e.rng() < 0.05) {
    return taperAuPied(e, p, 'rasant');
  }
}

function passerLeBallon(e: EtatMatch, p: Pion, receveur: Pion, pression: number): void {
  const s = sens(p.cote);
  // ⚠️ RÈGLE DU RUGBY : la passe ne part JAMAIS vers l'avant. On vise le
  // receveur, mais si celui-ci a pris de l'avance on ramène le point d'arrivée
  // derrière le passeur.
  const cible: Vec = { x: receveur.pos.x, y: receveur.pos.y };
  if ((cible.x - p.pos.x) * s > 0.4) cible.x = p.pos.x - s * 0.4;

  const d = distance(p.pos, cible);
  p.stats.passes += 1;

  // En-avant : rare, mais plus fréquent sous pression et chez un avant.
  const risque = 0.016 + Math.max(0, 3 - pression) * 0.009 + d / 1400;
  if (e.rng() < risque * (1.35 - p.passe / 220)) {
    p.stats.passes -= 1;
    p.stats.passesRatees += 1;
    dire(e, 'jeu', p.cote, C.phrase(e.rng, C.EN_AVANT, {
      nom: p.nom, club: nomClub(e, adverse(p.cote)),
    }), 0, p.moi);
    return arret(e, 'melee', adverse(p.cote), p.pos);
  }

  // Les défenseurs engagés sur le passeur sont battus : c'est le décalage.
  const marqueurs = surLeTerrain(e, adverse(p.cote));
  let engages = 0;
  for (const d2 of marqueurs) {
    if (d2.battu > 0) continue;
    if (distance2(d2.pos, p.pos) < 30) { d2.battu = 1.1; engages++; }
  }

  // ⚠️ UNE PERCÉE, C'EST UN DÉFENSEUR PASSÉ — pas juste un peu d'espace. On ne
  // regarde donc QUE les défenseurs encore DEVANT le receveur : sans ce filtre,
  // le moteur annonçait cent franchissements par match.
  let espace = 99;
  for (const q of marqueurs) {
    if (q.battu > 0 || q.sanction > 0) continue;
    if ((q.pos.x - receveur.pos.x) * s < -0.5) continue; // déjà derrière lui
    const dd = distance(receveur.pos, q.pos);
    if (dd < espace) espace = dd;
  }

  if (e.lancement) e.lancement.index += 1;
  e.porteur = null;
  e.vol = {
    de: { x: p.pos.x, y: p.pos.y }, vers: cible,
    duree: Math.max(0.22, d / 18), ecoule: 0, hauteur: 0,
    type: 'passe', intention: 'passe', auteur: p, receveur,
  };

  // Le receveur arrive dans un trou : le rideau traversé est hors du coup le
  // temps qu'il s'échappe. ⚠️ On n'ANNONCE rien ici — une percée, ce n'est pas
  // « de l'espace », c'est la ligne franchie. Elle est détectée dans
  // `phaseJeuCourant`, quand le porteur passe réellement derrière la défense.
  if (espace > 13 && engages > 0) {
    for (const d2 of marqueurs) {
      if (d2.numero === 15) continue;
      if (distance2(d2.pos, receveur.pos) < 180) d2.battu = Math.max(d2.battu, 1.5);
    }
  } else if (e.lancement && e.lancement.type !== 'ras'
    && e.lancement.index === e.lancement.chaine.length - 1
    && !receveur.avant && receveur.numero >= 11 && e.rng() < 0.45) {
    dire(e, 'jeu', p.cote, C.phrase(e.rng, C.ECARTEMENT, { nom: receveur.nom }), 0, receveur.moi);
  }
}

// ---------------------------------------------------------------------------
// PLAQUAGE, RUCK, MAUL
// ---------------------------------------------------------------------------

function resoudrePlaquage(e: EtatMatch, porteur: Pion, defenseur: Pion): void {
  const fatigueD = 0.72 + defenseur.endurance / 360;
  const force = defenseur.plaquage * fatigueD;
  const resistance = porteur.evitement * 0.55 + porteur.puissance * 0.45;
  // ⚠️ Le taux de réussite au plaquage du rugby professionnel est de ~88 %.
  // Le rythme de l'équipe qui court après son plan de marque l'infléchit :
  // c'est le seul endroit où le score « aide » l'attaque, et c'est ce réglage
  // invisible qui évite d'avoir à refuser un essai à l'écran.
  const r = retard(e, porteur.cote);
  const pres = metresAvantLaLigne(porteur.pos, porteur.cote);
  // ⚠️ Le réglage est ASYMÉTRIQUE. Une équipe en retard sur son plan trouve un
  // peu d'espace ; une équipe en avance se heurte à un mur. Sans ce second
  // versant, tout le score tombait dans le premier quart d'heure et la fin de
  // match était stérile (mesuré : 16 points avant la 20ᵉ, 5 après la 60ᵉ).
  const aide = r >= 0
    ? r * 0.20 + (pres < 25 ? r * 0.22 : 0) + (pres < 8 ? r * 0.22 : 0)
    : r * 0.45;
  const proba = borner(0.90 + (force - resistance) / 400 - aide, 0.36, 0.99);

  if (e.rng() >= proba) {
    defenseur.stats.plaquagesManques += 1;
    porteur.stats.franchissements += 1;
    defenseur.battu = 2.0;
    porteur.battu = 0.4; // il ne peut pas être re-plaqué dans la même seconde
    if (e.rng() < 0.22) {
      dire(e, 'plaquage', porteur.cote,
        `${porteur.nom} se dégage du plaquage de ${defenseur.nom} !`, 0, porteur.moi || defenseur.moi);
    }
    return;
  }

  defenseur.stats.plaquages += 1;
  // Plaquage à deux : le second défenseur qui arrive est crédité, comme dans
  // les statistiques officielles du rugby.
  for (const d2 of surLeTerrain(e, defenseur.cote)) {
    if (d2 === defenseur || d2.battu > 0) continue;
    if (distance2(d2.pos, porteur.pos) < 5.3) { d2.stats.plaquages += 1; break; }
  }
  if (e.rng() < 0.08) {
    dire(e, 'plaquage', defenseur.cote,
      C.phrase(e.rng, C.PLAQUAGE, { nom: defenseur.nom, cible: porteur.nom }),
      0, defenseur.moi || porteur.moi);
  }

  // Faute de plaquage (haut, sans les bras…).
  if (e.rng() < 0.020 * (1.6 - defenseur.discipline / 130)) {
    return siffler(e, porteur.cote, porteur.pos, 'plaquage haut', defenseur);
  }

  // Offload : le geste des grandes équipes, rare mais spectaculaire.
  if (e.rng() < 0.055 + porteur.vision / 1600) {
    const s = sens(porteur.cote);
    const soutiens = surLeTerrain(e, porteur.cote).filter((q) =>
      q !== porteur && (q.pos.x - porteur.pos.x) * s <= 0.8 && distance2(q.pos, porteur.pos) < 90);
    if (soutiens.length) {
      const recu = soutiens.sort((a, b) => distance2(porteur.pos, a.pos) - distance2(porteur.pos, b.pos))[0];
      dire(e, 'jeu', porteur.cote, `Offload de ${porteur.nom} pour ${recu.nom} !`, 0, porteur.moi || recu.moi);
      porteur.stats.passes += 1;
      if (e.lancement) { e.lancement.chaine = []; e.lancement.index = 0; }
      e.porteur = null;
      e.vol = {
        de: { x: porteur.pos.x, y: porteur.pos.y }, vers: { x: recu.pos.x, y: recu.pos.y },
        duree: 0.28, ecoule: 0, hauteur: 0, type: 'passe', intention: 'offload',
        auteur: porteur, receveur: recu,
      };
      return;
    }
  }

  formerRuck(e, { x: porteur.pos.x, y: porteur.pos.y });
}

function formerRuck(e: EtatMatch, lieu: Vec): void {
  e.ballon = { x: lieu.x, y: lieu.y };
  e.porteur = null;
  e.vol = null;
  e.phase = 'ruck';
  e.phasesDepuisArret += 1;
  e.compteurs.rucks += 1;
  e.perceeSignalee = false;
  // Un ruck dure 3 à 6 secondes. C'est du ballon VIVANT : l'horloge tourne
  // normalement.
  const lent = e.rng() < 0.3;
  e.ballonLent = lent;
  e.minuteur = (lent ? 4.5 : 2.8) + e.rng() * 1.6;
  e.placement = placementRuck(e.pions, e.ballon, e.possession);
  // La ligne de hors-jeu se replace au dernier pied.
  const sa = sens(e.possession);
  e.horsJeu = lieu.x + sa * 1.3;
  e.ligneDef = e.horsJeu;
}

function phaseRuck(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const attaque = e.possession;
  const defense = adverse(attaque);

  // Faute au sol : la pénalité la plus fréquente du rugby (≈ 20 par match,
  // toutes causes confondues).
  if (e.rng() < 0.085) {
    const pour = e.rng() < 0.55 ? attaque : defense;
    const motif = pour === attaque ? 'plaqueur qui ne se relève pas' : 'ballon tenu au sol';
    return siffler(e, pour, e.ballon, motif);
  }

  // Grattage : les troisièmes lignes et le talonneur, sur ballon lent surtout.
  const proches = e.pions
    .filter((p) => p.surLeTerrain && p.sanction <= 0 && p.avant && p.cote === defense)
    .sort((a, b) => distance2(a.pos, e.ballon) - distance2(b.pos, e.ballon));
  const gratteur = proches.find((p) => p.numero === 7 || p.numero === 6 || p.numero === 2) ?? proches[0];
  const chanceGrattage = (e.ballonLent ? 0.10 : 0.045) + (gratteur ? gratteur.plaquage / 2200 : 0);
  if (gratteur && e.rng() < chanceGrattage) {
    gratteur.stats.grattages += 1;
    dire(e, 'ruck', defense, C.phrase(e.rng, C.RUCK_GRATTAGE, { nom: gratteur.nom }), 0, gratteur.moi);
    e.possession = defense;
    e.phasesDepuisArret = 0;
  }

  // Les nettoyeurs.
  for (const p of e.pions) {
    if (p.surLeTerrain && p.avant && p.cote === e.possession && distance2(p.pos, e.ballon) < 9) {
      p.stats.rucksNettoyes += 1;
    }
  }

  // ⚠️ LA LIGNE DE HORS-JEU. Sans elle, les défenseurs étaient déjà sur le 9 à
  // la sortie du ruck et chaque temps de jeu finissait au sol.
  e.gardeRuck = e.ballonLent ? 0.25 : 0.55;
  e.placement = null;
  reprendreJeu(e, e.ballon, undefined, 1.3);
}

function phaseMaul(e: EtatMatch, dt: number): void {
  const cote = e.possession;
  const s = sens(cote);
  const mien = surLeTerrain(e, cote).filter((p) => p.avant);
  const adv = surLeTerrain(e, adverse(cote)).filter((p) => p.avant);
  const moy = (l: Pion[]) => (l.length ? l.reduce((a, b) => a + b.puissance, 0) / l.length : 50);
  const poussee = moy(mien) - moy(adv);

  const avance = borner(0.75 + poussee / 45, 0.1, 1.9);
  e.ballon.x += s * avance * dt;
  mien.forEach((p, i) => {
    p.role = 'maul';
    p.cible = { x: e.ballon.x - s * (0.7 + Math.floor(i / 3) * 1.1), y: borner(e.ballon.y + ((i % 3) - 1) * 1.3, 3, LARGEUR - 3) };
  });
  adv.forEach((p, i) => {
    p.role = 'maul';
    p.cible = { x: e.ballon.x + s * (0.7 + Math.floor(i / 3) * 1.1), y: borner(e.ballon.y + ((i % 3) - 1) * 1.3, 3, LARGEUR - 3) };
  });

  if (franchieLigne(e.ballon, cote)) {
    const marqueur = mien.find((p) => p.numero === 2) ?? mien[0];
    if (marqueur) {
      marqueur.pos = { x: e.ballon.x, y: e.ballon.y };
      return tenterEssai(e, marqueur, 'maul');
    }
  }
  if (e.minuteur <= 0) {
    // Le maul s'arrête : le 8 ou le 9 relance.
    formerRuck(e, e.ballon);
  }
}

// ---------------------------------------------------------------------------
// PHASES ARRÊTÉES
// ---------------------------------------------------------------------------

function arret(e: EtatMatch, quoi: Phase, pour: Cote, lieu: Vec): void {
  if (e.sirene) return clorePeriode(e);
  e.possession = pour;
  e.porteur = null;
  e.vol = null;
  e.lancement = null;
  e.phasesDepuisArret = 0;
  e.metresGagnesPhase = 0;
  e.perceeSignalee = false;
  e.ballon = { x: borner(lieu.x, LIGNE_A + 1, LIGNE_B - 1), y: lieu.y };
  e.phase = quoi;
  const a = ARRETS[quoi];
  e.minuteur = a ? a.visuel : 3;
  e.ouvert = choisirCoteOuvert(e);

  if (quoi === 'touche') {
    e.ballon.y = e.ballon.y < AXE ? 0.6 : LARGEUR - 0.6;
    e.ballon.x = borner(e.ballon.x, LIGNE_A + 5, LIGNE_B - 5);
    const nb = e.rng() < 0.32 ? 4 : e.rng() < 0.6 ? 5 : 7;
    installerPlacement(e, placementTouche(e.pions, e.ballon, pour, nb), 34);
    e.compteurs.touches += 1;
  } else if (quoi === 'melee') {
    e.ballon.y = borner(e.ballon.y, 12, LARGEUR - 12);
    e.ballon.x = borner(e.ballon.x, LIGNE_A + 6, LIGNE_B - 6);
    installerPlacement(e, placementMelee(e.pions, e.ballon, pour), 22);
    e.compteurs.melees += 1;
  } else if (quoi === 'renvoi22') {
    installerPlacement(e, placementRenvoi22(e.pions, pour === 'A' ? M22_A : M22_B, pour));
  } else {
    e.placement = null;
  }
  const sa = sens(pour);
  e.ligneDef = e.ballon.x + sa * (quoi === 'touche' ? 10 : quoi === 'melee' ? 5 : 10);
  e.horsJeu = e.ligneDef;
}

function phaseMelee(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const cote = e.possession;
  const mien = surLeTerrain(e, cote).filter((p) => p.avant);
  const adv = surLeTerrain(e, adverse(cote)).filter((p) => p.avant);
  const moy = (l: Pion[]) => (l.length ? l.reduce((a, b) => a + b.puissance, 0) / l.length : 50);
  const dom = moy(mien) - moy(adv);

  // La mêlée adverse domine : pénalité.
  if (e.rng() < borner(0.10 - dom / 160, 0.02, 0.3)) {
    dire(e, 'melee', adverse(cote), C.phrase(e.rng, C.MELEE_DOMINEE, { club: nomClub(e, adverse(cote)) }));
    return siffler(e, adverse(cote), e.ballon, 'faute technique en mêlée');
  }
  if (dom > 6 && e.rng() < 0.2) {
    dire(e, 'melee', cote, C.phrase(e.rng, C.MELEE_DOMINEE, { club: nomClub(e, cote) }));
    return siffler(e, cote, e.ballon, 'faute technique en mêlée');
  }
  dire(e, 'melee', cote, C.phrase(e.rng, C.MELEE_GAGNEE, { club: nomClub(e, cote) }));
  e.placement = null;
  e.gardeRuck = 0.4;
  // Départ du 8 quand la mêlée avance.
  const huit = mien.find((p) => p.numero === 8);
  if (huit && dom > 4 && e.rng() < 0.32) {
    e.lancement = {
      type: 'pickAndGo', chaine: [huit], index: 0, libelle: 'départ du 8',
    };
    return donnerBallon(e, huit, 0.3);
  }
  reprendreJeu(e, e.ballon, undefined, 5);
}

function phaseTouche(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const cote = e.possession;
  const liste = surLeTerrain(e, cote);
  const avants = liste.filter((p) => p.avant);
  const sauteur = [...avants].sort((a, b) => b.detente - a.detente)[0] ?? liste[0];
  if (!sauteur) return clorePeriode(e);

  // ~86 % des touches sont gagnées par l'équipe qui lance.
  if (e.rng() > 0.87) {
    const adv = surLeTerrain(e, adverse(cote));
    const contre = [...adv].filter((p) => p.avant).sort((a, b) => b.detente - a.detente)[0] ?? adv[0];
    dire(e, 'touche', adverse(cote), C.phrase(e.rng, C.TOUCHE_PERDUE, {
      club: nomClub(e, adverse(cote)), nom: contre?.nom ?? '',
    }), 0, contre?.moi);
    e.possession = adverse(cote);
    e.placement = null;
    return reprendreJeu(e, e.ballon);
  }

  dire(e, 'touche', cote, C.phrase(e.rng, C.TOUCHE_GAGNEE, { club: nomClub(e, cote), nom: sauteur.nom }), 0, sauteur.moi);
  e.placement = null;

  // Ballon porté près de la ligne : l'arme n°1 des avants.
  const pres = metresAvantLaLigne(e.ballon, cote) < 12;
  if (pres && e.rng() < 0.55) {
    e.phase = 'maul';
    e.minuteur = 6 + e.rng() * 3;
    e.porteur = null;
    e.ballon = { x: sauteur.pos.x, y: sauteur.pos.y };
    dire(e, 'maul', cote, C.phrase(e.rng, C.MAUL, { club: nomClub(e, cote) }));
    return;
  }
  e.gardeRuck = 0.5;
  reprendreJeu(e, sauteur.pos, sauteur, 10);
}

// ---------------------------------------------------------------------------
// FAUTES, PÉNALITÉS, CARTONS
// ---------------------------------------------------------------------------

function siffler(e: EtatMatch, pour: Cote, lieu: Vec, motif: string, fautif?: Pion): void {
  dire(e, 'penalite', pour, C.phrase(e.rng, C.PENALITE, { club: nomClub(e, pour), motif }));
  // Carton jaune : rare (≈ 1,3 par match), plus probable près de sa ligne.
  const pres = metresAvantLaLigne(lieu, pour) < 22;
  if (fautif && e.rng() < (pres ? 0.16 : 0.05)) {
    fautif.surLeTerrain = false;
    fautif.sanction = 600; // dix minutes d'horloge
    fautif.stats.cartons += 1;
    dire(e, 'carton', fautif.cote, C.phrase(e.rng, C.CARTON, {
      nom: fautif.nom, motif, club: nomClub(e, fautif.cote),
    }), 0, fautif.moi);
  }
  arret(e, 'penalite', pour, lieu);
  e.penalite = { pour, lieu: { x: lieu.x, y: lieu.y }, motif };
}

// Probabilité de réussite d'un tir au but selon la distance et l'angle.
function probaTir(dist: number, ecartAxe: number, pied: number): number {
  const base = 0.97 - Math.max(0, dist - 20) / 62 - (ecartAxe / AXE) * 0.22;
  return borner(base + (pied - 60) / 420, 0.25, 0.97);
}

function phasePenalite(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const info = e.penalite;
  e.penalite = null;
  if (!info) return reprendreJeu(e, e.ballon);
  const cote = info.pour;
  const plan = planDe(e, cote);
  const liste = surLeTerrain(e, cote);
  if (!liste.length) return clorePeriode(e);
  const buteur = [...liste].sort((a, b) => b.pied - a.pied)[0];

  const dist = metresAvantLaLigne(info.lieu, cote) + 11;
  const ecartAxe = Math.abs(info.lieu.y - AXE);
  const restantes = 80 - e.minute;
  const diff = ecart(e, cote);

  // ── Le choix : tir au but, pénaltouche, ou jeu à la main ────────────────
  // Un buteur professionnel tente jusqu'à 52 mètres, et jusqu'à 30 m de l'axe.
  const aPortee = dist < 52 && ecartAxe < 30;
  const besoinEssai = diff < -3 && restantes < 12 && plan.essaisTransformes + plan.essaisSecs > 0;
  // ⚠️ Le taux de réussite au pied du rugby pro est de ~78 %. On l'obtient en
  // laissant l'équipe tenter quelques pénalités qu'elle n'a PAS au plan : ce
  // sont les tirs manqués. Sans elles, tous les tirs seraient bons.
  const veutTirer = aPortee && !besoinEssai
    && (plan.penalites > 0 ? e.rng() < 0.93 : e.rng() < 0.11);

  if (veutTirer) {
    e.tir = { buteur, distance: dist, angle: ecartAxe, valeur: 3, suite: 'coupEnvoi' };
    e.phase = 'tirAuBut';
    e.minuteur = ARRETS.tirAuBut.visuel;
    e.placement = placementTir(e.pions, info.lieu, cote);
    return;
  }

  const s = sens(cote);
  if (metresAvantLaLigne(info.lieu, cote) > 8 && e.rng() < 0.72) {
    // Pénaltouche : on gagne le terrain ET on garde le ballon.
    const gain = borner(28 + buteur.pied / 3, 20, 48);
    const arrivee = {
      x: borner(info.lieu.x + s * gain, LIGNE_A + 5, LIGNE_B - 5),
      y: info.lieu.y < AXE ? -1 : LARGEUR + 1,
    };
    buteur.stats.coupsDePied += 1;
    e.placement = null;
    lancerVol(e, buteur, arrivee, 'penaltouche', 2.4, 0.4, info.lieu);
    dire(e, 'pied', cote, `${buteur.nom} trouve la touche à ${Math.round(metresAvantLaLigne(arrivee, cote))} mètres de la ligne.`, 0, buteur.moi);
    return;
  }
  // Jeu rapide à la main.
  e.placement = null;
  e.gardeRuck = 0.7;
  dire(e, 'jeu', cote, `Pénalité jouée vite par ${nomClub(e, cote)}.`);
  reprendreJeu(e, info.lieu);
}

function phaseTirAuBut(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const tir = e.tir;
  e.tir = null;
  e.placement = null;
  if (!tir) return preparerCoupEnvoi(e, e.possession);
  const { buteur, distance: d, angle } = tir;
  const cote = buteur.cote;
  const plan = planDe(e, cote);
  buteur.stats.butsTentes += 1;

  const reussi = plan.penalites > 0 && e.rng() < Math.max(0.85, probaTir(d, angle, buteur.pied));
  if (reussi) {
    plan.penalites -= 1;
    buteur.stats.butsReussis += 1;
    marquer(e, cote, 3);
    dire(e, 'but', cote, C.phrase(e.rng, C.PENALITE_BUT, {
      nom: buteur.nom, distance: Math.round(d),
    }), 3, buteur.moi);
    if (e.sirene) return clorePeriode(e);
    return preparerCoupEnvoi(e, adverse(cote));
  }
  dire(e, 'butRate', cote, C.phrase(e.rng, C.PENALITE_RATEE, {
    nom: buteur.nom, distance: Math.round(d),
  }), 0, buteur.moi);
  if (e.sirene) return clorePeriode(e);
  return arret(e, 'renvoi22', adverse(cote), {
    x: adverse(cote) === 'A' ? M22_A : M22_B, y: AXE,
  });
}

// ---------------------------------------------------------------------------
// L'ESSAI
// ---------------------------------------------------------------------------

function tenterEssai(e: EtatMatch, marqueur: Pion, origine: 'jeu' | 'maul' = 'jeu'): void {
  const cote = marqueur.cote;
  const plan = planDe(e, cote);
  const reste = plan.essaisTransformes + plan.essaisSecs;

  // ⚠️ LE SEUL GARDE-FOU DUR — et il sert à deux choses. D'abord ne jamais
  // dépasser le score de la ligue. Ensuite ne pas le boucler à la 25ᵉ minute :
  // une équipe trop en avance sur son rythme est arrêtée sur la ligne. Le
  // ballon est « tenu » dans l'en-but, renvoi aux 22 — c'est une vraie règle du
  // rugby, et ça se raconte.
  const avance = plan.total > 0
    ? plan.marques / plan.total - Math.min(1, (e.t / (2 * DUREE_PERIODE)) * 0.95)
    : 0;
  if (reste <= 0 || (avance > 0.10 && e.minute < 72)) {
    dire(e, 'jeu', adverse(cote),
      `${marqueur.nom} est tenu dans l’en-but ! Renvoi aux 22 pour ${nomClub(e, adverse(cote))}.`,
      0, marqueur.moi);
    return arret(e, 'renvoi22', adverse(cote), {
      x: adverse(cote) === 'A' ? M22_A : M22_B, y: AXE,
    });
  }

  marqueur.stats.essais += 1;
  marquer(e, cote, 5);
  if (cote === 'A') e.essaisA += 1; else e.essaisB += 1;

  const precision = origine === 'maul'
    ? 'au terme du ballon porté'
    : C.phrase(e.rng, C.ESSAI_PRECISION, {});
  dire(e, 'essai', cote, origine === 'maul'
    ? C.phrase(e.rng, C.MAUL_ESSAI, { nom: marqueur.nom })
    : C.phrase(e.rng, C.ESSAI, { nom: marqueur.nom, precision }), 5, marqueur.moi);

  // ── La transformation : le PLAN décide, la position décide qui du 7 ou du 5
  const liste = surLeTerrain(e, cote);
  const buteur = [...liste].sort((a, b) => b.pied - a.pied)[0] ?? marqueur;
  const ecartAxe = Math.abs(marqueur.pos.y - AXE);
  const chance = probaTir(22 + ecartAxe * 0.55, ecartAxe, buteur.pied);

  let transforme: boolean;
  if (plan.essaisTransformes > 0 && plan.essaisSecs > 0) transforme = e.rng() < chance;
  else transforme = plan.essaisTransformes > 0;

  buteur.stats.butsTentes += 1;
  if (transforme) {
    plan.essaisTransformes -= 1;
    buteur.stats.butsReussis += 1;
    marquer(e, cote, 2);
    dire(e, 'but', cote, C.phrase(e.rng, C.TRANSFORMATION, { nom: buteur.nom }), 2, buteur.moi);
  } else {
    plan.essaisSecs -= 1;
    dire(e, 'butRate', cote, C.phrase(e.rng, C.TRANSFORMATION_RATEE, { nom: buteur.nom }), 0, buteur.moi);
  }

  e.phase = 'apresEssai';
  e.minuteur = ARRETS.apresEssai.visuel;
  e.possession = adverse(cote);
  // ⚠️ Dès l'essai marqué, tout le monde regagne le centre pour le coup
  // d'envoi. Ils ont la célébration + la transformation pour y arriver.
  viserLeCoupEnvoi(e, adverse(cote));
  e.placement = placementCoupEnvoi(e.pions, MILIEU, adverse(cote), e.cibleRenvoi!);
}

function phaseApresEssai(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  e.placement = null;
  if (e.sirene) return clorePeriode(e);
  preparerCoupEnvoi(e, e.possession);
}

function marquer(e: EtatMatch, cote: Cote, points: number): void {
  if (cote === 'A') e.scoreA += points; else e.scoreB += points;
  planDe(e, cote).marques += points;
}

// ---------------------------------------------------------------------------
// LA REPRISE DU JEU : c'est ici qu'on CHOISIT LA COMBINAISON
// ---------------------------------------------------------------------------

function reprendreJeu(e: EtatMatch, lieu: Vec, porteurImpose?: Pion, deltaLigne?: number): void {
  // Après la sirène, l'équipe qui mène met le ballon en touche : le match est
  // terminé. Celle qui est menée continue de jouer.
  if (e.sirene && ecart(e, e.possession) >= 0) return clorePeriode(e);

  const cote = e.possession;
  const liste = surLeTerrain(e, cote);
  if (!liste.length) return clorePeriode(e);

  e.ouvert = choisirCoteOuvert(e);
  e.systeme = choisirSysteme(e, adverse(cote));
  e.phase = 'jeuCourant';
  e.placement = null;
  e.perceeSignalee = false;
  e.cibleRenvoi = null; // le ballon est vivant : plus de coup d'envoi en attente
  e.ligneAvantage = lieu.x;
  e.metresGagnesPhase = 0;

  // ⚠️ LA LIGNE DÉFENSIVE DOIT ÊTRE REPOSÉE À CHAQUE REPRISE. Sans ça elle
  // gardait la valeur absolue de la phase précédente : après une réception de
  // coup de pied à quarante mètres de là, tout le rideau se retrouvait DERRIÈRE
  // le porteur, et la défense devenait transparente.
  const sa = sens(cote);
  if (deltaLigne != null) {
    e.ligneDef = lieu.x + sa * deltaLigne;
  } else {
    // On prend le 4ᵉ défenseur le plus avancé : c'est le rideau, pas
    // l'isolé qui traîne devant.
    const deltas: number[] = [];
    for (const d of surLeTerrain(e, adverse(cote))) deltas.push((d.pos.x - lieu.x) * sa);
    deltas.sort((a, b) => a - b);
    const ref = deltas[Math.min(3, deltas.length - 1)] ?? 10;
    e.ligneDef = lieu.x + sa * borner(ref, 0.6, 32);
  }
  e.horsJeu = e.ligneDef;

  const lancement = choisirLancement(e, cote, liste, porteurImpose);
  // Le premier maillon : celui qui a déjà le ballon (sauteur en touche,
  // réceptionneur d'un coup de pied), sinon le premier de la combinaison.
  const premier = porteurImpose ?? lancement.chaine[0] ?? liste[0];
  lancement.chaine = raccourcir(dedoublonner([premier, ...lancement.chaine]), 5);
  lancement.index = 0;
  e.lancement = lancement;

  e.ballon = { x: lieu.x, y: lieu.y };
  donnerBallon(e, premier, 0.3);
}

// ⚠️ On raccourcit une chaîne trop longue en supprimant un maillon AU MILIEU —
// c'est la « passe sautée » du rugby. Tronquer par la fin coupait l'ailier :
// mesuré, il ne touchait plus le ballon que sur 0,4 % des ballons portés.
function raccourcir(c: Pion[], max: number): Pion[] {
  const out = [...c];
  while (out.length > max) out.splice(Math.max(1, Math.floor(out.length / 2) - 1), 1);
  return out;
}

// Une chaîne de passes ne peut pas contenir deux fois le même joueur : sinon
// le 9 se passe le ballon à lui-même et la phase se bloque.
function dedoublonner(liste: Pion[]): Pion[] {
  const vus = new Set<Pion>();
  const sortie: Pion[] = [];
  for (const p of liste) {
    if (!p || vus.has(p) || !p.surLeTerrain || p.sanction > 0) continue;
    vus.add(p);
    sortie.push(p);
  }
  return sortie;
}

// ⚙️ LA LECTURE DU JEU. C'est le cerveau du moteur : selon le terrain, le
// surnombre, le nombre de temps de jeu, le score et le chrono, on choisit la
// combinaison — et donc la chaîne de passes qui va porter le ballon.
function choisirLancement(
  e: EtatMatch, cote: Cote, liste: Pion[], porteurImpose?: Pion,
): Lancement {
  const neuf = maillot(liste, 9);
  const dix = maillot(liste, 10);
  const douze = maillot(liste, 12);
  const treize = maillot(liste, 13);
  const quinze = maillot(liste, 15);
  const ailierOuvert = e.ouvert === 1
    ? (maillot(liste, 14) ?? maillot(liste, 11))
    : (maillot(liste, 11) ?? maillot(liste, 14));

  const percuteur = choisirPercuteur(e, liste);

  const distLigne = metresAvantLaLigne(e.ballon, cote);
  const chezSoi = dansSes22(e.ballon, cote);
  const sonCamp = dansSonCamp(e.ballon, cote);
  const surnombre = surnombreAuLarge(e);
  const phases = e.phasesDepuisArret;
  const restantes = 80 - e.minute;
  const diff = ecart(e, cote);
  const pousse = retard(e, cote); // >0 : il faut marquer
  const r = e.rng();

  // Trois longueurs de chaîne : au ras (1 passe), au premier centre (2-3), et
  // le grand large (4-5). Une attaque de rugby n'écarte pas à chaque temps de
  // jeu — sinon on compterait 470 passes par match au lieu de 280.
  const chaineLarge = [neuf, dix, douze, treize, ailierOuvert].filter(Boolean) as Pion[];
  const chaineSaute = [neuf, dix, treize, ailierOuvert].filter(Boolean) as Pion[];
  const chaineCourte = [neuf, dix, douze].filter(Boolean) as Pion[];

  // ── 1. DANS SES 22 : on dégage, sauf urgence ────────────────────────────
  // C'EST LE JEU D'OCCUPATION : on rend le ballon mais on gagne 45 mètres.
  // Une équipe qui court après le score, elle, garde le ballon en main.
  if (chezSoi && pousse < 0.32 && !(diff < 0 && restantes < 8)) {
    const botteur = (dix && dix.pied > 55 ? dix : neuf) ?? liste[0];
    if (r < 0.74) {
      return {
        type: 'pied', chaine: [neuf, botteur].filter(Boolean) as Pion[], index: 0,
        intention: botteur === neuf ? 'chandelle' : 'degagement', botteur,
        libelle: 'sortir de ses 22',
      };
    }
  }

  // ── 2. DANS SON CAMP : occupation, 50/22, ou on avance ──────────────────
  if (sonCamp && !chezSoi) {
    const botteur = dix ?? neuf ?? liste[0];
    // Le 50/22 : geste RARE, et seulement si les ailiers adverses sont montés.
    if (botteur && botteur.pied > 66 && phases >= 1
      && arriereGardeMontee(e, adverse(cote)) && r < 0.045) {
      return {
        type: 'pied', chaine: [neuf, botteur].filter(Boolean) as Pion[], index: 0,
        intention: 'cinquanteVingtDeux', botteur, libelle: '50/22',
      };
    }
    if (phases >= 2 && r < 0.20 - pousse * 0.12) {
      return {
        type: 'pied', chaine: [neuf, botteur].filter(Boolean) as Pion[], index: 0,
        intention: e.ballonLent ? 'chandelle' : 'occupation', botteur,
        libelle: 'occupation au pied',
      };
    }
  }

  // ── 3. DANS LES 22 ADVERSES : on pilonne, ou on écarte s'il y a de la place
  if (distLigne < 22) {
    if (surnombre >= 1 && r < 0.55) {
      return { type: 'large', chaine: chaineLarge, index: 0, libelle: 'écarter au large' };
    }
    if (distLigne < 8 && r < 0.55) {
      return {
        type: 'pickAndGo', chaine: [neuf, percuteur].filter(Boolean) as Pion[], index: 0,
        libelle: 'pick and go',
      };
    }
    return {
      type: 'pod', chaine: [neuf, dix, percuteur].filter(Boolean) as Pion[], index: 0,
      libelle: 'bloc d’avants',
    };
  }

  // ── 4. SURNOMBRE AU LARGE : on écarte tout de suite ─────────────────────
  if (surnombre >= 2 || (surnombre >= 1 && phases >= 1)) {
    return {
      type: r < 0.25 ? 'saute' : 'large',
      chaine: r < 0.25 ? chaineSaute : chaineLarge, index: 0,
      libelle: 'exploiter le surnombre',
    };
  }

  // ── 5. GESTION DE FIN DE MATCH ──────────────────────────────────────────
  if (restantes <= 6 && diff > 7) {
    return {
      type: 'ras', chaine: [neuf, percuteur].filter(Boolean) as Pion[], index: 0,
      libelle: 'garder le ballon',
    };
  }

  // ── 6. LE JEU DE MOUVEMENT ORDINAIRE ────────────────────────────────────
  // ⚠️ LE SCHÉMA DE BASE DU RUGBY MODERNE : un ou deux temps au ras pour
  // aspirer la défense dans l'axe, PUIS on écarte dans l'espace libéré. C'est
  // l'alternance qui compte — écarter à chaque temps de jeu ne prend jamais
  // personne à défaut.
  const envie = r + pousse * 0.3;

  // Premier temps après une phase arrêtée : c'est là que les combinaisons se
  // jouent, la défense n'est pas encore réorganisée.
  if (phases === 0) {
    if (envie < 0.34) {
      return { type: 'pod', chaine: [neuf, dix, percuteur].filter(Boolean) as Pion[], index: 0, libelle: 'premier temps' };
    }
    if (envie < 0.62) return { type: 'large', chaine: chaineCourte, index: 0, libelle: 'lancement sur la ligne' };
    return { type: 'large', chaine: chaineLarge, index: 0, libelle: 'lancement au large' };
  }

  // Temps de jeu suivants : les deux tiers se jouent au ras ou au premier
  // temps — comme dans un vrai match, où l'on n'écarte qu'une phase sur cinq.
  if (envie < 0.52) {
    return { type: 'ras', chaine: [neuf, percuteur].filter(Boolean) as Pion[], index: 0, libelle: 'percussion au ras' };
  }
  if (envie < 0.72) {
    return { type: 'pod', chaine: [neuf, dix, percuteur].filter(Boolean) as Pion[], index: 0, libelle: 'bloc d’avants' };
  }
  if (envie < 0.85) {
    return { type: 'large', chaine: chaineCourte, index: 0, libelle: 'un temps sur les centres' };
  }
  if (envie > 0.92 && quinze && treize) {
    // L'arrière s'intercale : la combinaison qui crée le surnombre au large.
    return {
      type: 'large', chaine: [neuf, dix, douze, quinze, ailierOuvert].filter(Boolean) as Pion[],
      index: 0, libelle: 'l’arrière s’intercale',
    };
  }
  if (porteurImpose && porteurImpose.avant && envie < 0.8) {
    return { type: 'ras', chaine: [porteurImpose], index: 0, libelle: 'percussion' };
  }
  return { type: 'large', chaine: chaineLarge, index: 0, libelle: 'écarter à l’aile' };
}

// ⚠️ LE PERCUTEUR TOURNE. Prendre systématiquement « l'avant le plus proche du
// ballon » revenait à toujours désigner le même : les deux troisièmes lignes
// portaient tout, et les piliers finissaient le match à 0 mètre et 0 ballon
// joué. On prend donc, PARMI LES QUATRE avants les plus proches et hors du
// ruck, celui qui a le moins porté — c'est exactement ce que fait un pack :
// on percute avec des hommes frais.
function choisirPercuteur(e: EtatMatch, liste: Pion[]): Pion | undefined {
  const dispo = liste.filter((p) => p.avant && p.role !== 'ruck');
  const pool = dispo.length ? dispo : liste.filter((p) => p.avant);
  if (!pool.length) return undefined;
  return [...pool]
    .sort((a, b) => distance2(a.pos, e.ballon) - distance2(b.pos, e.ballon))
    .slice(0, 4)
    .sort((a, b) => a.stats.courses - b.stats.courses)[0];
}

// Les ailiers adverses sont-ils montés dans la ligne ? (condition du 50/22)
function arriereGardeMontee(e: EtatMatch, defenseur: Cote): boolean {
  const fond = surLeTerrain(e, defenseur).filter((p) => p.numero === 11 || p.numero === 14 || p.numero === 15);
  if (fond.length < 2) return false;
  let montes = 0;
  for (const p of fond) if (Math.abs(p.pos.x - e.ballon.x) < 22) montes++;
  return montes >= 2;
}

// ---------------------------------------------------------------------------
// LE JEU AU PIED
// ---------------------------------------------------------------------------

function taperAuPied(e: EtatMatch, p: Pion, intention: IntentionPied): void {
  const s = sens(p.cote);
  p.stats.coupsDePied += 1;
  const portee = 26 + p.pied / 2.2;

  switch (intention) {
    case 'drop': {
      const plan = planDe(e, p.cote);
      p.stats.butsTentes += 1;
      const d = metresAvantLaLigne(p.pos, p.cote) + 11;
      if (plan.penalites > 0 && e.rng() < probaTir(d, Math.abs(p.pos.y - AXE), p.pied)) {
        plan.penalites -= 1;
        p.stats.butsReussis += 1;
        marquer(e, p.cote, 3);
        dire(e, 'but', p.cote, C.phrase(e.rng, C.DROP, { nom: p.nom }), 3, p.moi);
        if (e.sirene) return clorePeriode(e);
        return preparerCoupEnvoi(e, adverse(p.cote));
      }
      dire(e, 'butRate', p.cote, `Drop manqué de ${p.nom}.`, 0, p.moi);
      return arret(e, 'renvoi22', adverse(p.cote), {
        x: adverse(p.cote) === 'A' ? M22_A : M22_B, y: AXE,
      });
    }
    case 'degagement': {
      // Un dégagement ne trouve pas toujours la touche : trois fois sur quatre.
      const trouve = e.rng() < 0.62 + p.pied / 400;
      const arrivee = trouve
        ? { x: borner(p.pos.x + s * portee, LIGNE_A - 3, LIGNE_B + 3), y: p.pos.y < AXE ? -1 : LARGEUR + 1 }
        : {
            x: borner(p.pos.x + s * (portee + 6), LIGNE_A + 2, LIGNE_B - 2),
            y: borner(p.pos.y + (e.rng() * 18 - 9), 4, LARGEUR - 4),
          };
      dire(e, 'pied', p.cote, C.phrase(e.rng, C.PIED_DEGAGEMENT, { nom: p.nom }), 0, p.moi);
      return lancerVol(e, p, arrivee, trouve ? 'degagement' : 'occupation', 2.6, 0.5);
    }
    case 'cinquanteVingtDeux': {
      const cibleX = p.cote === 'A' ? LIGNE_B - 14 : LIGNE_A + 14;
      const reussi = e.rng() < 0.3 + p.pied / 320;
      const arrivee = reussi
        ? { x: cibleX, y: p.pos.y < AXE ? -1 : LARGEUR + 1 }
        : { x: borner(p.pos.x + s * (portee - 6), LIGNE_A + 4, LIGNE_B - 4), y: borner(p.pos.y + (e.rng() * 16 - 8), 4, LARGEUR - 4) };
      if (!reussi) dire(e, 'pied', p.cote, C.phrase(e.rng, C.PIED_5022_RATE, { nom: p.nom }), 0, p.moi);
      return lancerVol(e, p, arrivee, reussi ? 'cinquanteVingtDeux' : 'occupation', 2.8, 0.6);
    }
    case 'chandelle': {
      const arrivee = {
        x: borner(p.pos.x + s * (19 + e.rng() * 7), LIGNE_A + 3, LIGNE_B - 3),
        y: borner(p.pos.y + e.ouvert * (4 + e.rng() * 9), 4, LARGEUR - 4),
      };
      dire(e, 'pied', p.cote, C.phrase(e.rng, C.PIED_CHANDELLE, { nom: p.nom }), 0, p.moi);
      return lancerVol(e, p, arrivee, 'chandelle', 3.4, 1);
    }
    case 'rasant': {
      const arrivee = {
        x: borner(p.pos.x + s * (13 + e.rng() * 8), LIGNE_A + 1, LIGNE_B - 1),
        y: borner(p.pos.y + e.ouvert * (e.rng() * 10 - 2), 3, LARGEUR - 3),
      };
      dire(e, 'pied', p.cote, C.phrase(e.rng, C.PIED_RASANT, { nom: p.nom }), 0, p.moi);
      return lancerVol(e, p, arrivee, 'rasant', 1.5, 0.1);
    }
    case 'transversale': {
      const cible = surLeTerrain(e, p.cote)
        .filter((q) => q.numero === 11 || q.numero === 14)
        .sort((a, b) => Math.abs(b.pos.y - p.pos.y) - Math.abs(a.pos.y - p.pos.y))[0];
      const arrivee = {
        x: borner(p.pos.x + s * 20, LIGNE_A + 4, LIGNE_B - 4),
        y: cible ? cible.pos.y : borner(AXE + e.ouvert * 26, 5, LARGEUR - 5),
      };
      dire(e, 'pied', p.cote, C.phrase(e.rng, C.PIED_TRANSVERSALE, { nom: p.nom }), 0, p.moi);
      return lancerVol(e, p, arrivee, 'transversale', 2.6, 0.9);
    }
    default: {
      const arrivee = {
        x: borner(p.pos.x + s * portee, LIGNE_A + 2, LIGNE_B + 2),
        y: borner(p.pos.y + (e.rng() * 22 - 11), 3, LARGEUR - 3),
      };
      dire(e, 'pied', p.cote, C.phrase(e.rng, C.PIED_OCCUPATION, { nom: p.nom }), 0, p.moi);
      return lancerVol(e, p, arrivee, 'occupation', 3.0, 0.8);
    }
  }
}

// ---------------------------------------------------------------------------
// REMPLACEMENTS, FIN DE PÉRIODE
// ---------------------------------------------------------------------------

function gererRemplacements(e: EtatMatch): void {
  if (!PHASES_ARRETEES.has(e.phase)) return; // on ne change qu'à l'arrêt de jeu
  for (const cote of ['A', 'B'] as Cote[]) {
    const faits = cote === 'A' ? e.remplacementsA : e.remplacementsB;
    if (faits >= 8) continue;
    const sur = surLeTerrain(e, cote);
    const banc = e.pions.filter((p) => p.cote === cote && !p.surLeTerrain && p.sanction <= 0 && p.minutes === 0);
    if (!banc.length) continue;

    // On sort d'abord ceux qui n'ont plus de jambes. L'avatar n'est remplacé
    // qu'à partir de la 62ᵉ, et seulement s'il est vraiment cuit.
    const fatigues = sur
      .filter((p) => p.endurance < (p.avant ? 36 : 28) && (!p.moi || e.minute >= 62))
      .sort((a, b) => a.endurance - b.endurance);
    if (!fatigues.length) continue;

    // ⚠️ ON APPARIE LE POSTE. Un remplaçant n'entre qu'à son poste (ou dans sa
    // famille), jamais « le premier du banc » : un arrière est entré pilier.
    const famille = (x: Pion) => POSTE_PAR_ID[x.poste]?.famille;
    let sortant: Pion | undefined;
    let entrant: Pion | undefined;
    for (const f of fatigues) {
      const e2 = banc.find((p) => p.poste === f.poste)
        ?? banc.find((p) => famille(p) === famille(f))
        ?? banc.find((p) => p.avant === f.avant);
      if (e2) { sortant = f; entrant = e2; break; }
    }
    // Si l'avatar attend sur le banc à ce poste, c'est lui qui entre.
    if (sortant) {
      const moi = banc.find((p) => p.moi && (p.poste === sortant!.poste || famille(p) === famille(sortant!)));
      if (moi) entrant = moi;
    }
    if (!sortant || !entrant) continue;

    sortant.surLeTerrain = false;
    entrant.surLeTerrain = true;
    entrant.numero = sortant.numero;
    entrant.poste = sortant.poste;
    entrant.avant = sortant.avant;
    entrant.pos = { x: sortant.pos.x, y: sortant.pos.y };
    entrant.cible = { x: sortant.pos.x, y: sortant.pos.y };
    stopper(entrant);
    if (cote === 'A') e.remplacementsA += 1; else e.remplacementsB += 1;
    dire(e, 'remplacement', cote, C.phrase(e.rng, C.REMPLACEMENT, {
      entrant: entrant.nom, sortant: sortant.nom, club: nomClub(e, cote),
    }), 0, entrant.moi || sortant.moi);
  }
}

function clorePeriode(e: EtatMatch): void {
  if (e.periode === 1) {
    e.periode = 2;
    e.sirene = false;
    e.t = DUREE_PERIODE;
    e.phase = 'miTemps';
    e.minuteur = ARRETS.miTemps.visuel;
    e.porteur = null;
    e.vol = null;
    e.placement = null;
    dire(e, 'jalon', null, `Mi-temps : ${e.clubA} ${e.scoreA} – ${e.scoreB} ${e.clubB}`);
    return;
  }
  solderLesPoints(e);
  e.phase = 'fini';
  e.fini = true;
  e.porteur = null;
  e.vol = null;
  // ⚠️ On vide le reliquat. Il sert à interpoler l'affichage entre deux pas de
  // simulation ; en ⏭️ (facteur 600) il pouvait rester deux minutes de jeu non
  // consommées, et l'écran projetait alors les pions à deux cents mètres du
  // terrain à la sirène.
  e.reliquat = 0;
  dire(e, 'jalon', null,
    `Coup de sifflet final — ${e.clubA} ${e.scoreA} – ${e.scoreB} ${e.clubB}.`);
}

function phaseMiTemps(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  dire(e, 'jalon', null, 'Deuxième mi-temps !');
  // L'équipe qui n'a pas engagé en début de match engage la seconde période.
  preparerCoupEnvoi(e, adverse(e.possession));
}

// ⚠️ FILET DE SÉCURITÉ. Si un plan n'a pas été consommé (une équipe n'a jamais
// pu concrétiser), on solde les points restants plutôt que de mentir sur le
// score. Le rythme (`retard`) rend ce cas rare — et chaque point soldé est
// RACONTÉ, jamais ajouté en silence.
function solderLesPoints(e: EtatMatch): void {
  for (const cote of ['A', 'B'] as Cote[]) {
    const plan = planDe(e, cote);
    const liste = surLeTerrain(e, cote);
    const buteur = [...liste].sort((a, b) => b.pied - a.pied)[0];
    let garde = 0;
    while ((plan.essaisTransformes > 0 || plan.essaisSecs > 0 || plan.penalites > 0) && garde++ < 12) {
      if (plan.essaisTransformes > 0) {
        plan.essaisTransformes -= 1;
        const m = choisirMarqueur(e, cote);
        if (m) m.stats.essais += 1;
        if (buteur) { buteur.stats.butsTentes += 1; buteur.stats.butsReussis += 1; }
        marquer(e, cote, 7);
        if (cote === 'A') e.essaisA += 1; else e.essaisB += 1;
        dire(e, 'essai', cote, `Essai transformé de ${m?.nom ?? nomClub(e, cote)} dans les arrêts de jeu !`, 7, m?.moi);
      } else if (plan.essaisSecs > 0) {
        plan.essaisSecs -= 1;
        const m = choisirMarqueur(e, cote);
        if (m) m.stats.essais += 1;
        if (buteur) buteur.stats.butsTentes += 1;
        marquer(e, cote, 5);
        if (cote === 'A') e.essaisA += 1; else e.essaisB += 1;
        dire(e, 'essai', cote, `Essai de ${m?.nom ?? nomClub(e, cote)} au bout du temps additionnel !`, 5, m?.moi);
      } else {
        plan.penalites -= 1;
        if (buteur) { buteur.stats.butsTentes += 1; buteur.stats.butsReussis += 1; }
        marquer(e, cote, 3);
        dire(e, 'but', cote, `Pénalité de ${buteur?.nom ?? nomClub(e, cote)} à la dernière seconde.`, 3, buteur?.moi);
      }
    }
  }
}

function choisirMarqueur(e: EtatMatch, cote: Cote): Pion | undefined {
  const liste = surLeTerrain(e, cote);
  if (!liste.length) return undefined;
  // Un essai se marque plus souvent chez les trois-quarts.
  const troisQuarts = liste.filter((p) => !p.avant);
  const pool = troisQuarts.length && e.rng() < 0.68 ? troisQuarts : liste;
  return pool[Math.floor(e.rng() * pool.length)];
}

// ---------------------------------------------------------------------------
// API PUBLIQUE
// ---------------------------------------------------------------------------

export function appliquerConsigne(e: EtatMatch, c: ConsigneJoueur | undefined): void {
  e.consigne = c;
  if (c) dire(e, 'jeu', null, `📣 Consigne : « ${c.libelle} »`);
}

export interface LigneBilan {
  nom: string; club: string; numero: number; poste: PosteId;
  stats: StatsMatch; minutes: number; moi: boolean;
}

export interface BilanMatch {
  scoreA: number; scoreB: number; essaisA: number; essaisB: number;
  parJoueur: LigneBilan[];
}

export function bilan(e: EtatMatch): BilanMatch {
  return {
    scoreA: e.scoreA, scoreB: e.scoreB, essaisA: e.essaisA, essaisB: e.essaisB,
    parJoueur: e.pions
      .filter((p) => p.minutes > 0.3)
      .map((p) => ({
        nom: p.nom, club: nomClub(e, p.cote), numero: p.numero, poste: p.poste,
        stats: p.stats, minutes: Math.min(80, Math.round(p.minutes)), moi: p.moi,
      })),
  };
}

export function pionDuJoueur(e: EtatMatch): Pion | undefined {
  return e.pions.find((p) => p.moi);
}

// Libellé de la combinaison en cours, pour l'affichage.
export function libelleLancement(e: EtatMatch): string {
  return e.lancement?.libelle ?? '';
}
