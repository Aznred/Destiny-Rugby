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

import { graine, scorePossible } from '../championnat.js';
import type { Coequipier } from '../effectif.js';
import type { PosteId, TactiqueManager } from '../../types.js';
import { POSTE_PAR_ID } from '../../data/rugby.js';
import {
  ORDRE_MAILLOTS, creerPion, deplacer, stopper,
  type AttributsPion, type Pion, type StatsMatch,
} from './entites.js';
import {
  PHASES_ARRETEES, ajouterCommentaire, disciplineVide,
  type ActionJoueur, type ConsigneJoueur, type DisciplineMatch, type EtatMatch,
  type IntentionPied, type Lancement, type NiveauMatch, type OrdreBagarre,
  type Phase, type PlanDeScore, type TypeCommentaire, type Vol,
} from './etat.js';
import {
  apresGesteIllegal, chauffer, donnerOrdre, frictions, irregularite, refroidir,
  resoudreBagarre, sanctionApresMatch, vieillirBulles,
} from './bagarre.js';
import {
  consommerIntention, demanderAction, intentionEst, intervalle, metresDeLaLigne,
  pressionDevant, receveurCote, receveurPour,
} from './controle.js';
import { POUSSEES, bonusElan, fondreElan, pousserElan } from './elan.js';
import {
  choisirCoteOuvert, choisirSysteme, placerEquipes, surLeTerrain,
  surnombreAuLarge, vitesseMontee, numero as maillot,
} from './tactique.js';
import {
  placementCoupEnvoi, placementInitial, placementMelee, placementRenvoi22,
  placementRuck, placementTir, placementTouche,
} from './phasesArretees.js';
import { decomposer } from './plan.js';
import * as C from './commentaire.js';
import {
  AXE, LARGEUR, LONGUEUR, LIGNE_A, LIGNE_B, MILIEU, M22_A, M22_B, adverse, borner,
  dansLes22Adverses, dansSes22, dansSonCamp, distance, distance2, franchieLigne,
  horsDuTerrain, melanger, metresAvantLaLigne, sens, type Cote, type Vec,
} from './terrain.js';

export type { EtatMatch, Commentaire } from './etat.js';
export type { Pion } from './entites.js';

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
const ARRETS: Record<string, { visuel: number; horloge: number; direct: number }> = {
  // Le direct garde assez de temps pour lire les formations, sans reproduire
  // les longues attentes télévisées où rien ne bouge.
  melee: { visuel: 6.2, horloge: 50, direct: 9.5 },
  touche: { visuel: 6.5, horloge: 35, direct: 8.5 },
  transformation: { visuel: 4, horloge: 55, direct: 6 },
  tirAuBut: { visuel: 6, horloge: 60, direct: 10 },
  coupEnvoi: { visuel: 9, horloge: 22, direct: 9 },
  renvoi22: { visuel: 7, horloge: 20, direct: 7 },
  apresEssai: { visuel: 3, horloge: 8, direct: 3 },
  penalite: { visuel: 2.5, horloge: 12, direct: 3 },
  miTemps: { visuel: 3, horloge: 0, direct: 3 },
  // ⚠️ L'horloge s'arrête pendant une bagarre : l'arbitre coupe le chrono le
  // temps de séparer et de sortir les cartes. C'est aussi ce qui empêche
  // qu'une pause d'écran, pendant qu'on choisit son ordre, coûte du temps de
  // jeu au joueur.
  bagarre: { visuel: 6, horloge: 0, direct: 6 },
};

/**
 * Le rapport entre le chronomètre du match et ce qu'on regarde.
 *
 * ⚠️ EXPORTÉ POUR LE DIRECT EN LIGNE. Là-bas, une seconde regardée vaut une
 * seconde de match, y compris pendant les arrêts raccourcis. L'écran a besoin
 * de ce rapport pour extrapoler les positions entre deux relevés du serveur.
 */
export function facteurHorloge(phase: Phase, tempsReel = false): number {
  if (tempsReel) return 1;
  const a = ARRETS[phase];
  return a ? a.horloge / a.visuel : 1;
}

/**
 * Ce que dure une phase arrêtée À L'ÉCRAN, en secondes simulées.
 *
 * En direct, chaque arrêt possède une durée dédiée : assez longue pour lire la
 * mise en place, mais débarrassée des attentes où rien ne se passe. Son chrono
 * reste à vitesse 1 afin que les déplacements gardent leur vitesse naturelle.
 */
function dureeArret(e: EtatMatch, phase: Phase): number {
  const a = ARRETS[phase];
  const duree = !a ? 3 : e.tempsReel ? a.direct : a.visuel;
  e.dureeArret = duree;
  return duree;
}

/** Ce qui est déjà écoulé de la phase arrêtée, de 0 à 1. */
function avancementArret(e: EtatMatch): number {
  const total = e.dureeArret ?? 0;
  return total > 0 ? borner(1 - e.minuteur / total, 0, 1) : 1;
}

/**
 * LES PHASES ARRÊTÉES QUI SE JOUENT VRAIMENT.
 *
 * ⚠️ EN DIRECT, UNE FORMATION FIGÉE DEVIENT UNE PHOTO. Le placement d'une
 * mêlée est calculé une fois puis animé en trois temps, afin que les joueurs
 * ne restent pas immobiles pendant toute la préparation.
 *
 * Une mêlée se joue donc en trois temps, comme sur un terrain : les deux packs
 * se présentent face à face, ils se lient, puis le plus fort pousse. Une touche
 * se forme : l'alignement se resserre à mesure que le lanceur se prépare. Un
 * tir au but a son rituel : le buteur recule, prend son temps, et s'élance.
 *
 * ⚠️ ON DÉPLACE LA CIBLE, PAS LE PION. Les joueurs gardent leur inertie et
 * courent vers leur nouvelle marque — c'est ce qui rend la liaison d'une mêlée
 * lisible plutôt que saccadée.
 */
function animerArret(e: EtatMatch): void {
  const p = avancementArret(e);
  if (e.conquete) e.conquete.progression = p;
  if (e.phase === 'melee') {
    // Avant la liaison, chaque pack recule d'un mètre sept de SON côté ; une
    // fois lié, l'ensemble dérive dans le sens du pack le plus fort.
    const ecart = Math.max(0, 1 - p / 0.45) * 1.7;
    const avants = (cote: Cote) => surLeTerrain(e, cote).filter((q) => q.avant);
    const ecartPacks = scoreMelee(e, avants(e.possession), e.possession)
      - scoreMelee(e, avants(adverse(e.possession)), adverse(e.possession));
    const domBrut = borner(ecartPacks / 10, -1, 1);
    // Même une domination légère doit se LIRE. Le pack gagnant avance de 1,4
    // à 4 mètres pendant la poussée, au lieu d'un frémissement invisible.
    const dom = Math.abs(domBrut) < 0.16 ? 0
      : Math.abs(domBrut) < 0.35 ? (domBrut < 0 ? -0.35 : 0.35) : domBrut;
    const derive = Math.max(0, p - 0.48) / 0.52 * dom * 4 * sens(e.possession);
    if (e.conquete) e.conquete.pousseVers = dom === 0 ? undefined : dom > 0 ? e.possession : adverse(e.possession);
    for (const pion of e.pions) {
      if (!pion.surLeTerrain || pion.role !== 'melee') continue;
      pion.cible = { x: pion.cible.x - sens(pion.cote) * ecart + derive, y: pion.cible.y };
    }
    return;
  }
  if (e.phase === 'touche') {
    // L'alignement se resserre : d'abord espacé et en retrait, puis à sa place.
    const bord = e.ballon.y < AXE ? 0 : LARGEUR;
    const vers = bord === 0 ? 1 : -1;
    const large = Math.max(0, 1 - p / 0.6);
    for (const pion of e.pions) {
      if (!pion.surLeTerrain || pion.role !== 'alignement') continue;
      const profondeur = Math.abs(pion.cible.y - bord);
      pion.cible = {
        x: pion.cible.x - sens(pion.cote) * large * 1.6,
        y: borner(bord + vers * (profondeur * (1 + large * 0.35)), 2.5, LARGEUR - 2.5),
      };
    }
    const conquete = e.conquete;
    if (conquete?.type === 'touche') {
      const alignes = surLeTerrain(e, e.possession)
        .filter((q) => q.role === 'alignement')
        .sort((a, b) => Math.abs(a.cible.y - bord) - Math.abs(b.cible.y - bord));
      const cible = alignes.find((q) => q.id === conquete.cibleId);
      const leurre = conquete.combinaison === 'leurreDevant'
        ? alignes.find((q) => q !== cible)
        : undefined;
      // L'appel se déroule avant le saut : un leurre attaque le premier bloc,
      // puis le sauteur choisi se décale dans son intervalle.
      const appel = Math.sin(Math.PI * borner((p - 0.30) / 0.48, 0, 1));
      if (leurre) leurre.cible.y = borner(leurre.cible.y + vers * 2.2 * appel, 2.5, LARGEUR - 2.5);
      if (cible) {
        cible.cible.y = borner(cible.cible.y - vers * 1.25 * appel, 2.5, LARGEUR - 2.5);
        cible.cible.x += sens(cible.cote) * 0.55 * Math.sin(Math.PI * borner((p - 0.62) / 0.34, 0, 1));
      }
    }
    return;
  }
  if ((e.phase === 'tirAuBut' || e.phase === 'transformation') && e.tir && !e.tir.volLance) {
    // Le rituel du buteur : il recule de sept mètres, souffle, puis s'élance.
    const buteur = e.tir.buteur;
    if (!buteur.surLeTerrain) return;
    const recul = p < 0.72 ? Math.min(1, p / 0.25) * 7 : Math.max(0, (1 - p) / 0.28) * 7;
    buteur.cible = { x: e.ballon.x - sens(buteur.cote) * recul, y: e.ballon.y };
  }
}

// ---------------------------------------------------------------------------
// CRÉATION DU MATCH
// ---------------------------------------------------------------------------

export interface Avatar {
  club: string; nom: string; poste: PosteId; attributs: AttributsPion; titulaire?: boolean;
}

export interface OptionsMatch {
  /** Un générateur dont le serveur conserve l'état permet les reprises exactes. */
  rng?: () => number;
  scoreSurTerrain?: boolean;
  meteoTir?: 'sec' | 'pluie' | 'vent';
  /**
   * ⚠️ LE NIVEAU COMMANDE TOUTE LA DISCIPLINE (cartons, bagarres, sanctions
   * d'après-match). Il vaut `pro` PAR DÉFAUT, et ce défaut n'est pas neutre :
   * il garantit que les matchs rejoués en fond et les scripts de mesure
   * gardent exactement l'étalonnage documenté. Seul l'appelant qui sait qu'il
   * est en division amateur passe `amateur`.
   */
  niveau?: NiveauMatch;
  /** Le joueur pilote son pion dès le coup d'envoi. */
  controle?: boolean;
  /** Feuilles 1 → 23 déjà composées par un manager. */
  compositionA?: Coequipier[];
  compositionB?: Coequipier[];
  tactiqueA?: TactiqueManager;
  tactiqueB?: TactiqueManager;
  capitaineAId?: string;
  capitaineBId?: string;
  buteurAId?: string;
  buteurBId?: string;
  /**
   * Ce que chaque équipe se connaît, de 0 à 100 (50 = neutre, absent = neutre).
   * Voir `EtatMatch.cohesion` : cela ne joue QUE sur les fautes de liaison.
   */
  cohesionA?: number;
  cohesionB?: number;
  /** Le match se regarde à la vitesse réelle : voir `EtatMatch.tempsReel`. */
  tempsReel?: boolean;
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

// ⚠️ LE BANC EST UN VRAI BANC DE RUGBY : 5 avants + 3 arrières, dans l'ordre
// CONVENTIONNEL des maillots 16 à 23 — 16 talonneur, 17 et 18 piliers,
// 19 deuxième ligne, 20 troisième ligne, 21 demi de mêlée, 22 ouvreur,
// 23 trois-quarts polyvalent. Prendre « les huit meilleurs restants » donnait
// un banc de trois-quarts, et un arrière entrait en pilier.
// L'index dans ce tableau + 16 EST le numéro de maillot du remplaçant.
const BANC_TYPE: PosteId[] = [
  'talonneur', 'pilier_gauche', 'pilier_droit', 'deuxieme_ligne_d',
  'troisieme_aile_d', 'demi_melee', 'demi_ouverture', 'deuxieme_centre',
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
  cle: string, avatar?: Avatar, options: OptionsMatch = {},
): EtatMatch {
  const rng = options.rng ?? graine('moteur2#' + cle);
  const pions: Pion[] = [];

  const monter = (eff: Coequipier[], cote: Cote, club: string) => {
    const imposee = cote === 'A' ? options.compositionA : options.compositionB;
    const liste = imposee?.length ? imposee.slice(0, 23) : composer(eff);
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
      const pion = creerPion(c, i, cote, moi, moi ? avatar!.attributs : undefined);
      const capitaineId = cote === 'A' ? options.capitaineAId : options.capitaineBId;
      const buteurId = cote === 'A' ? options.buteurAId : options.buteurBId;
      pion.capitaine = !!capitaineId && pion.sourceId === capitaineId;
      pion.buteur = !!buteurId && pion.sourceId === buteurId;
      if (pion.capitaine) pion.discipline += 4;
      pions.push(pion);
    });
  };
  monter(effectifA, 'A', clubA);
  monter(effectifB, 'B', clubB);

  // Un capitaine ne se contente pas de porter le brassard : sa présence
  // stabilise aussi la discipline collective de son équipe.
  for (const cote of ['A', 'B'] as Cote[]) {
    if (!pions.some((p) => p.cote === cote && p.capitaine)) continue;
    for (const pion of pions) if (pion.cote === cote) pion.discipline += 1;
  }

  const possession: Cote = rng() < 0.5 ? 'A' : 'B';
  const e: EtatMatch = {
    clubA, clubB,
    t: 0, sim: 0, reliquat: 0, minute: 0, periode: 1, sirene: false,
    phase: 'coupEnvoi', minuteur: ARRETS.coupEnvoi.visuel,
    pions, ballon: { x: MILIEU, y: AXE }, porteur: null, possession, vol: null, volsRecents: [], conquete: null,
    ballonLibre: null, ruck: null, aplatissage: null,
    lancement: null, ouvert: 1, phasesDepuisArret: 0, ligneAvantage: MILIEU,
    origine: { x: MILIEU, y: AXE }, metresGagnesPhase: 0,
    ballonLent: false, derniereTouche: null, dernierPasseur: null,
    perceeSignalee: false, aide: 0,
    systeme: 'blitz', ligneDef: MILIEU, horsJeu: MILIEU, gardeRuck: 0,
    scoreA: 0, scoreB: 0,
    planA: planVide(scoreCibleA, rng), planB: planVide(scoreCibleB, rng),
    cibleBaseA: scoreCibleA, cibleBaseB: scoreCibleB,
    ajustementTactiqueA: 0, ajustementTactiqueB: 0,
    tactiques: {},
    essaisA: 0, essaisB: 0,
    sifflet: null,
    compteurs: { rucks: 0, melees: 0, touches: 0, percees: 0, irregularites: 0, enAvants: 0, tempsA: 0, tempsB: 0 },
    placement: null, cibleRenvoi: null, tir: null, penalite: null,
    remplacementsA: 0, remplacementsB: 0, remplacementsDemandes: {}, prochaineDecision: 1, compteur: 0,
    commentaires: [], fini: false, rng,
    tempsReel: options.tempsReel,
    scoreSurTerrain: options.scoreSurTerrain, meteoTir: options.meteoTir,
    niveau: options.niveau ?? 'pro',
    controle: options.controle ?? false,
    intention: null,
    recharges: {},
    perceeJoueur: false,
    echappee: null,
    elan: 0,
    dernierTurnover: null,
    echos: [],
    tension: 0,
    bagarre: null,
    bulles: [],
    prochaineFriction: 12,
    discipline: disciplineVide(),
  };

  e.minuteur = dureeArret(e, 'coupEnvoi');
  e.cibleRenvoi = {
    x: MILIEU + sens(possession) * 30,
    y: borner(AXE + (rng() < 0.5 ? 1 : -1) * 16, 8, LARGEUR - 8),
  };
  e.placement = placementInitial(pions, possession, e.cibleRenvoi);
  for (const p of pions) {
    const c = e.placement[p.id];
    if (c) { p.pos = { x: c.x, y: c.y }; p.cible = { x: c.x, y: c.y }; stopper(p); }
  }
  dire(e, 'jalon', null, C.texteMatch('coupEnvoiMatch', { clubA, clubB }));
  // Le plan d'avant-match compte déjà. Il est appliqué une fois, puis tout
  // changement en direct ne modifiera que la différence restante.
  if (options.cohesionA !== undefined || options.cohesionB !== undefined) {
    e.cohesion = { A: options.cohesionA, B: options.cohesionB };
  }
  if (options.tactiqueA) appliquerTactiqueEquipe(e, 'A', options.tactiqueA, false);
  if (options.tactiqueB) appliquerTactiqueEquipe(e, 'B', options.tactiqueB, false);
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
  if (e.sifflet) {
    e.sifflet.restant -= dt;
    if (e.sifflet.restant <= 0) e.sifflet = null;
  }
  // ⚠️ LA DYNAMIQUE S’ÉTEINT TOUTE SEULE. Un ballon volé à la 12ᵉ minute ne
  // porte pas l’équipe jusqu’à la sirène : sans cette fonte, l’élan devient
  // une seconde note d’équipe, et le match se décide au premier turnover.
  fondreElan(e, dt);
  // ⚠️ ET UNE ÉCHAPPÉE FINIT TOUJOURS PAR ÊTRE REJOINTE. Elle s’arrête aussi
  // dès que le ballon quitte les mains du fuyard — passé, tapé, ou perdu.
  if (e.echappee) {
    e.echappee.restant -= dt;
    if (e.echappee.restant <= 0 || e.porteur !== e.echappee.pion) e.echappee = null;
  }
  const dtHorloge = dt * facteurHorloge(e.phase, e.tempsReel);
  e.t += dtHorloge;
  e.minute = Math.min(80, Math.floor(e.t / 60));

  // ── Chronomètre, sirène, mi-temps ────────────────────────────────────────
  const finPeriode = e.periode * DUREE_PERIODE;
  if (!e.sirene && e.t >= finPeriode) {
    e.sirene = true;
    dire(e, 'jalon', null, C.texteMatch(e.periode === 1 ? 'sirenePremiere' : 'sireneFinale'));
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
  if (e.minute >= 48 || Object.keys(e.remplacementsDemandes).length > 0) gererRemplacements(e);

  // ── L'ordre du joueur vit sa vie, la tension redescend ───────────────────
  // ⚠️ UNE INTENTION EXPIRE. Sans ça, un « je plaque » cliqué à la 12ᵉ minute
  // resterait armé jusqu'à la sirène et le pion passerait le match à charger
  // le porteur, quelle que soit la phase.
  if (e.intention) {
    e.intention.restant -= dt;
    if (e.intention.restant <= 0) e.intention = null;
  }
  for (const cle of Object.keys(e.recharges) as (keyof typeof e.recharges)[]) {
    const reste = (e.recharges[cle] ?? 0) - dt;
    if (reste <= 0) delete e.recharges[cle]; else e.recharges[cle] = reste;
  }
  refroidir(e, dt);
  // ⚠️ LE MATCH S'ÉCHAUFFE TOUT SEUL. Deux adversaires proches se cherchent, se
  // parlent, et la température monte sans qu'on ait rien cliqué — c'est ce qui
  // permet à l'équipe d'en face d'être à l'origine d'une altercation
  // (`bagarre.ts` → `frictions`). Les bulles vieillissent au rythme du MATCH,
  // pas à celui de l'écran : en accéléré elles passent vite, comme le reste.
  vieillirBulles(e, dt);
  frictions(e, dt);

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
    // ⚠️ APRÈS LE PLACEMENT, JAMAIS AVANT : la formation repose les cibles de
    // tout le monde, et l'animation de l'arrêt les déplace à partir de là.
    if (e.minuteur > 0) animerArret(e);
  }
  // ⚠️ APRÈS LE PLACEMENT, ET À CHAQUE TICK. La tactique repose les cibles de
  // tout le monde toutes les trois images ; si le pilotage passait avant, la
  // consigne du joueur serait écrasée deux images sur trois et son pion
  // « hésiterait » au lieu de foncer.
  if (e.controle) piloterMonJoueur(e);

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
    // ⚠️ REMISE EN JEU : le botteur court, et ceux qu’il dépasse redeviennent
    //    jouables. Sans ce rattrapage, un chasseur marqué au coup de pied le
    //    resterait toute la séquence — même après avoir été doublé par son
    //    propre botteur, ce qui est exactement le cas où il redevient loyal.
    if (e.vol.type === 'pied') remettreEnJeu(e, e.vol.auteur);
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
    // Une touche ou une mêlée raccourcie reste lisible parce que les joueurs
    // rejoignent la formation d'un trot soutenu, sans saut instantané.
    const replacement = e.phase === 'melee' || e.phase === 'touche'
      ? e.tempsReel ? 1.35 : 1.8
      : 1;
    deplacer(p, dt * replacement);
  }

  e.minuteur -= dt;
  switch (e.phase) {
    case 'coupEnvoi': return phaseCoupEnvoi(e);
    case 'renvoi22': return phaseRenvoi22(e);
    case 'jeuCourant': return phaseJeuCourant(e, dt);
    case 'ballonEnLAir': return phaseBallonEnLAir(e);
    case 'ballonLibre': return phaseBallonLibre(e, dt);
    case 'ruck': return phaseRuck(e);
    case 'maul': return phaseMaul(e, dt);
    case 'melee': return phaseMelee(e);
    case 'touche': return phaseTouche(e);
    case 'penalite': return phasePenalite(e);
    case 'tirAuBut': return phaseTirAuBut(e);
    case 'transformation': return phaseTransformation(e);
    case 'aplatissage': return phaseAplatissage(e);
    case 'apresEssai': return phaseApresEssai(e);
    case 'miTemps': return phaseMiTemps(e);
    case 'bagarre': return phaseBagarre(e);
    default: return;
  }
}

// ---------------------------------------------------------------------------
// CE QUE LE CHOIX DU JOUEUR CHANGE DANS SA COURSE
// ---------------------------------------------------------------------------
// ⚠️ ON NE DÉPLACE PLUS SON PION À LA MAIN — ON ARME UNE INTENTION, ET C'EST
// ELLE QUI LE FAIT COURIR. Demande, mot pour mot : « dans les matchs on ne fait
// que les choix, on ne bouge pas le joueur ». Il y avait ici une première
// branche qui posait la cible à dix mètres dans l'axe du stick et court-
// circuitait tout le reste ; elle n'a plus d'entrée pour l'alimenter.
//
// Ce qui reste est l'essentiel, et c'est ce qui rend un choix VISIBLE : « je
// plaque » envoie vraiment le pion charger le porteur, « je gratte » le jette
// sur le ballon au sol, « j'appelle » le remonte à hauteur de passe. Sans ces
// cibles, une carte de décision ne changerait qu'un tirage de dés.
//
// Les effets sur les DUELS (contact, grattage, combinaison) sont appliqués là
// où ils se jouent : `resoudrePlaquage`, `phaseRuck`, `reprendreJeu`.
//
// ⚠️ `effort` EST UN MULTIPLICATEUR SUR LA VITESSE MAXIMALE, et il reste
// volontairement petit. À 1,3 on obtenait un pion qui double tout le monde en
// ligne droite — un joueur d'arcade au milieu d'un match de rugby. À 1,12, le
// sprint se voit, se paie en endurance, et ne casse pas la simulation.
function piloterMonJoueur(e: EtatMatch): void {
  const p = e.pions.find((q) => q.moi);
  if (!p || !p.surLeTerrain || p.sanction > 0) return;
  const s = sens(p.cote);
  const porteur = e.porteur;

  if (!e.intention) return;

  switch (e.intention.type) {
    case 'sprint':
      p.effort = 1.12;
      // ⚠️ LE SPRINT SE PAIE, SINON ON LE CHOISIT À CHAQUE CARTE. La dépense
      // s'ajoute à celle que `deplacer()` calcule déjà sur l'intensité de la
      // course : trois relances à fond dans la même mi-temps se sentent.
      p.endurance = Math.max(0, p.endurance - DT * 1.4);
      break;
    case 'plaquage':
    case 'monter': {
      // On charge le porteur ; à défaut, on monte sur le ballon.
      const cible = porteur && porteur.cote !== p.cote ? porteur.pos : e.ballon;
      p.cible = { x: cible.x, y: cible.y };
      p.effort = e.intention.type === 'plaquage' ? 1.12 : 1.06;
      break;
    }
    case 'soutien':
      if (porteur && porteur.cote === p.cote && porteur !== p) {
        // Deux mètres derrière son épaule : la position du soutien, celle qui
        // permet de recevoir l'offload et de nettoyer le ruck.
        p.cible = { x: porteur.pos.x - s * 2.2, y: borner(porteur.pos.y + 1.4 * e.ouvert, 2.5, LARGEUR - 2.5) };
        p.effort = 1.08;
      }
      break;
    case 'grattage':
      // Au ruck, on se jette sur le ballon ; avant, on suit le contact.
      if (e.phase === 'ruck' || (porteur && porteur.cote !== p.cote)) {
        const cible = e.phase === 'ruck' ? e.ballon : porteur!.pos;
        p.cible = { x: cible.x, y: cible.y };
        p.effort = 1.1;
      }
      break;
    case 'appel':
      // Se rendre disponible : remonter dans la ligne, à hauteur de passe.
      if (e.possession === p.cote && porteur && porteur !== p) {
        p.cible = {
          x: porteur.pos.x - s * 3.5,
          y: borner(porteur.pos.y + 7 * e.ouvert, 2.5, LARGEUR - 2.5),
        };
        p.effort = 1.05;
      }
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// LA BAGARRE — le jeu attend un ordre
// ---------------------------------------------------------------------------
// ⚠️ CETTE PHASE NE FAIT RIEN TANT QUE L'ORDRE N'EST PAS DONNÉ, et c'est
// exactement ce qu'on veut : l'écran met la pause et pose la question. Le
// garde-fou d'attente n'est là que pour les appels hors interface (simulation
// de fond, scripts de mesure) — sans lui, `avancer()` tournerait sans fin.
function phaseBagarre(e: EtatMatch): void {
  const b = e.bagarre;
  if (!b) { e.phase = 'jeuCourant'; return; }
  if (!b.ordre) {
    b.attente += DT;
    if (b.attente > 90) donnerOrdre(e, 'reculer');
    return;
  }
  const suite = resoudreBagarre(e);
  e.bagarre = null;
  e.intention = null;
  arret(e, 'penalite', suite.pour, suite.lieu);
  e.penalite = { pour: suite.pour, lieu: { x: suite.lieu.x, y: suite.lieu.y }, motif: suite.motif };
}

// ---------------------------------------------------------------------------
// COMMENTAIRE
// ---------------------------------------------------------------------------

// ⚠️ L'ÉCRITURE VIT DANS `etat.ts` : `bagarre.ts` doit pouvoir commenter, et
// `moteur.ts` l'importe déjà — passer par l'état évite le cycle d'imports.
function dire(
  e: EtatMatch, type: TypeCommentaire, cote: Cote | null, texte: string,
  points = 0, moi = false,
): void {
  ajouterCommentaire(e, type, cote, texte, points, moi);
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
  // ⚠️ EN DIRECT, PERSONNE NE SE TÉLÉPORTE. Le seuil existe parce qu'un
  // joueur qui vient d'aplatir dans l'en-but a cent mètres à faire et que la
  // carrière solo ne lui laisse que sept secondes à l'écran. Regardée à la
  // vitesse réelle, la même téléportation se voit — et c'est précisément le
  // « les joueurs sont mal placés » du retour de jeu : ils n'étaient pas mal
  // placés, ils APPARAISSAIENT à leur place. Les durées directes restent assez
  // longues pour rejoindre la formation à vitesse normale.
  // Les deux conquêtes se regardent : même en solo accéléré, leur mise en
  // place doit être une course courte et continue, jamais un changement de
  // coordonnées. Les reprises lointaines gardent leur seuil afin de ne pas
  // démarrer avec quinze joueurs encore dans l'en-but précédent.
  if (e.tempsReel || e.phase === 'melee' || e.phase === 'touche') seuil = Infinity;
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
  e.conquete = null;
  e.phasesDepuisArret = 0;
  e.ballon = { x: MILIEU, y: AXE };
  e.phase = 'coupEnvoi';
  e.minuteur = dureeArret(e, 'coupEnvoi');
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
  const botteur = liste.find((p) => p.buteur) ?? maillot(liste, 10) ?? liste[0];
  if (!botteur) return clorePeriode(e);
  const arrivee = e.cibleRenvoi ?? { x: MILIEU + sens(camp) * 30, y: AXE };
  botteur.stats.coupsDePied += 1;
  e.placement = null;
  lancerVol(e, botteur, arrivee, 'renvoi', 3.0, 1, { x: MILIEU, y: AXE });
  dire(e, 'pied', camp, C.texteMatch('coupEnvoiJoueur', { nom: botteur.nom }), 0, botteur.moi);
}

function phaseRenvoi22(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const camp = e.possession;
  const s = sens(camp);
  const liste = surLeTerrain(e, camp);
  const botteur = liste.find((p) => p.buteur) ?? [...liste].sort((a, b) => b.pied - a.pied)[0] ?? liste[0];
  if (!botteur) return clorePeriode(e);
  const depart = camp === 'A' ? M22_A : M22_B;
  const arrivee = {
    x: depart + s * (28 + botteur.pied / 4 + e.rng() * 10),
    y: borner(AXE + (e.rng() * 30 - 15), 6, LARGEUR - 6),
  };
  botteur.stats.coupsDePied += 1;
  e.placement = null;
  lancerVol(e, botteur, arrivee, 'renvoi', 2.8, 1, { x: depart, y: AXE });
  dire(e, 'pied', camp, C.texteMatch('renvoi22Joueur', { nom: botteur.nom }), 0, botteur.moi);
}

// ---------------------------------------------------------------------------
// LE BALLON EN L'AIR
// ---------------------------------------------------------------------------

/**
 * Mémorise les vols assez longtemps pour que le direct puisse dessiner même
 * une passe entièrement terminée entre deux relevés du serveur.
 */
function memoriserVol(e: EtatMatch, vol: Vol): void {
  const encoreVisibles = (e.volsRecents ?? []).filter((v) => e.t - v.debut <= 8).slice(-23);
  encoreVisibles.push({
    de: { ...vol.de }, vers: { ...vol.vers }, duree: vol.duree,
    hauteur: vol.hauteur, type: vol.type, intention: vol.intention,
    auteur: vol.auteur, receveur: vol.receveur, debut: e.t,
  });
  e.volsRecents = encoreVisibles;
}

function poserVol(e: EtatMatch, vol: Vol): void {
  e.vol = vol;
  memoriserVol(e, vol);
}

function lancerVol(
  e: EtatMatch, auteur: Pion, arrivee: Vec, intention: IntentionPied,
  duree: number, hauteur: number, depuis?: Vec,
): void {
  const de = depuis ?? { x: auteur.pos.x, y: auteur.pos.y };

  // ═══ LE HORS-JEU SUR COUP DE PIED ══════════════════════════════════════
  //
  // ⚠️ IL N'EXISTAIT PAS. Retour de jeu : « durant le jeu y'a pas de hors-jeu
  // sur les coups de pied, fixe-le ». Un ailier placé trente mètres devant son
  // ouvreur récupérait le ballon sans que rien ne soit sifflé — c'est la faute
  // la plus élémentaire du rugby, et la plus visible.
  //
  // La règle : au moment du coup de pied, TOUT partenaire situé devant le
  // botteur est hors-jeu. Il ne peut ni chasser ni jouer le ballon jusqu'à ce
  // qu'on le remette en jeu — en pratique, jusqu'à ce que le botteur (ou un
  // partenaire parti de derrière lui) le dépasse.
  //
  // ⚠️ ON MARQUE ICI PARCE QUE C'EST LE SEUL ENTONNOIR DES COUPS DE PIED.
  // Dégagement, occupation, chandelle, 50/22, rasant, transversale, drop,
  // renvoi : les huit intentions passent par `lancerVol`. Poser la règle dans
  // `deciderAvecLeBallon` aurait demandé huit copies, et il n'en aurait manqué
  // qu'une pour que le hors-jeu redevienne facultatif.
  const sHJ = sens(auteur.cote);
  for (const q of surLeTerrain(e, auteur.cote)) {
    q.horsJeu = q !== auteur && (q.pos.x - de.x) * sHJ > 0.5;
  }
  // Les adversaires ne sont jamais hors-jeu sur NOTRE coup de pied.
  for (const q of surLeTerrain(e, adverse(auteur.cote))) q.horsJeu = false;

  poserVol(e, {
    de, vers: arrivee, duree, ecoule: 0, hauteur,
    type: 'pied', intention, auteur, receveur: null,
  });
  auteur.stats.metresAuPied += Math.abs(arrivee.x - de.x);
  e.porteur = null;
  e.phase = 'ballonEnLAir';
  e.minuteur = duree + 0.5;
  e.derniereTouche = auteur;
}

/**
 * Remet en jeu les partenaires que le botteur a dépassés.
 *
 * ⚠️ C'EST LE BOTTEUR QUI REMET EN JEU, pas le temps qui passe. Un chasseur
 * hors-jeu qui attend ne redevient pas loyal parce qu'il a patienté : il le
 * redevient parce que quelqu’un venu de derrière lui est passé devant. Poser
 * un simple compte à rebours aurait donné un hors-jeu qui s'efface tout seul,
 * c'est-à-dire une règle qu'on n'applique pas.
 */
function remettreEnJeu(e: EtatMatch, botteur: Pion): void {
  const s = sens(botteur.cote);
  for (const q of surLeTerrain(e, botteur.cote)) {
    if (q.horsJeu && (botteur.pos.x - q.pos.x) * s >= 0) q.horsJeu = false;
  }
}

/** Tout le monde est en jeu : à toute reprise, le hors-jeu du pied s’efface. */
function libererHorsJeu(e: EtatMatch): void {
  for (const p of e.pions) p.horsJeu = false;
}

function phaseBallonEnLAir(e: EtatMatch): void {
  const v = e.vol;
  if (!v) return reprendreJeu(e, e.ballon);
  if (v.ecoule < v.duree) return;
  e.vol = null;
  const camp = v.auteur.cote;
  const arrivee = e.ballon;

  // ── Sortie en touche ─────────────────────────────────────────────────────
  //
  // ⚠️ LES TROIS RÈGLES DE LA TOUCHE SUR COUP DE PIED, ET ELLES SONT
  // GÉOMÉTRIQUES — pas déclaratives. Le moteur ne regardait que l'INTENTION du
  // botteur : un dégagement d'occupation qui finissait en touche dans les 22
  // adverses rendait le ballon à l'adversaire, alors que c'est exactement la
  // définition du 50/22. À l'inverse, un « 50/22 » raté mais annoncé aurait été
  // récompensé. On lit donc le terrain, comme un arbitre.
  if (horsDuTerrain(arrivee)) {
    if (v.intention === 'penaltouche') {
      dire(e, 'touche', camp, C.texteMatch('toucheASuivre', { club: nomClub(e, camp) }));
      return arret(e, 'touche', camp, arrivee);
    }
    // 1. LE 50/22 — le coup de pied part de SON CAMP (les 50 ou en deçà) et
    //    sort en touche DANS LES 22 ADVERSES : la touche est pour l'équipe qui
    //    a botté. C'est la seule façon de gagner le ballon en le rendant.
    const deSonCamp = dansSonCamp(v.de, camp) || Math.abs(v.de.x - MILIEU) < 0.5;
    const sortDansLes22 = dansLes22Adverses(arrivee, camp) && !franchieLigne(arrivee, camp);
    if (deSonCamp && sortDansLes22) {
      dire(e, 'pied', camp, C.phrase(e.rng, C.PIED_5022, { nom: v.auteur.nom }), 0, v.auteur.moi);
      // ⚠️ ON COMPTE LE 50/22 SUR LA GÉOMÉTRIE, PAS SUR L'INTENTION. Un
      // dégagement d'occupation qui finit en touche dans les 22 adverses EST un
      // 50/22 : c'est le règlement, et c'est déjà ainsi que le moteur en tire
      // la conséquence deux lignes plus bas. Compter l'intention aurait donné
      // un classement des « 50/22 » où manquent la moitié des vrais.
      v.auteur.stats.cinquanteVingtDeux += 1;
      return arret(e, 'touche', camp, arrivee);
    }
    if (v.intention === 'cinquanteVingtDeux') {
      // Tenté mais pas trouvé : c'est une touche ordinaire pour l'adversaire.
      dire(e, 'pied', camp, C.phrase(e.rng, C.PIED_5022_RATE, { nom: v.auteur.nom }), 0, v.auteur.moi);
    }
    // 2. DIRECT EN TOUCHE DEPUIS L'EXTÉRIEUR DE SES 22 : aucun gain de terrain,
    //    la touche se joue à l'ENDROIT DU COUP DE PIED, pour l'adversaire.
    // 3. DEPUIS SES 22 : le gain de terrain est acquis, la touche se joue là où
    //    le ballon est sorti.
    const direct = !dansSes22(v.de, camp);
    const lieu = direct ? { x: v.de.x, y: arrivee.y } : arrivee;
    if (direct) {
      dire(e, 'touche', adverse(camp), C.texteMatch('toucheDirecte', { nom: v.auteur.nom }), 0, v.auteur.moi);
    }
    return arret(e, 'touche', adverse(camp), lieu);
  }

  // ── Ballon dans l'en-but ─────────────────────────────────────────────────
  if (arrivee.x <= 1 || arrivee.x >= LONGUEUR - 1) {
    const defenseur: Cote = arrivee.x <= LIGNE_A ? 'A' : 'B';
    if (v.intention === 'cinquanteVingtDeux' || v.intention === 'occupation') {
      dire(e, 'pied', camp, C.texteMatch('ballonEnBut'));
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
  // ⚠️ UN JOUEUR HORS-JEU NE PEUT PAS JOUER LE BALLON, et c’est là que la
  //    règle se voit. On choisit donc le meilleur chasseur PARMI LES LOYAUX ;
  //    celui qui était devant son botteur n'est plus candidat, quelle que soit
  //    son avance.
  const chasseur = meilleur(mien.filter((p) => !p.horsJeu));
  const receveur = meilleur(adv);

  // ⚠️ ET S’IL EST SUR LE BALLON, C’EST PÉNALITÉ. Ne pas le laisser gagner la
  //    course suffirait à respecter la règle, mais pas à la RENDRE VISIBLE : un
  //    ailier planté à deux mètres du point de chute doit être sifflé, sinon le
  //    joueur ne comprend pas pourquoi son chasseur s'arrête. Le rayon est
  //    serré (4 m) exprès : au-delà, il n’a gêné personne, et gonfler le compte
  //    de pénalités déplacerait l’étalonnage du moteur (cible 14 à 26).
  //    On siffle quand un hors-jeu est PLUS PRÈS DU BALLON que le chasseur
  //    loyal : c’est le cas où il allait manifestement le jouer. Un rayon fixe
  //    de quatre mètres ne sifflait JAMAIS rien (mesuré : 0,00 par match sur
  //    14 matchs) — la règle existait dans le code et pas à l’écran.
  const distLoyal = chasseur ? distance2(chasseur.pos, arrivee) : Infinity;
  const intrus = mien.find((p) => p.horsJeu
    && distance2(p.pos, arrivee) < Math.min(distLoyal, 100));
  if (intrus) {
    libererHorsJeu(e);
    return siffler(e, adverse(camp), { x: arrivee.x, y: arrivee.y }, 'hors-jeu', intrus);
  }

  // Un coup de pied de récupération (chandelle, rasant, transversale) donne une
  // vraie chance au chasseur ; un dégagement, non.
  const contestable = v.intention === 'chandelle' || v.intention === 'rasant'
    || v.intention === 'transversale' || v.intention === 'renvoi';
  const chanceChasseur = contestable ? 0.42 : 0.12;
  const rayonPrise = v.hauteur > 0.7 ? 3.1 : v.intention === 'rasant' ? 1.55 : 2.15;
  const chasseurPlace = chasseur && distance(chasseur.pos, arrivee) <= rayonPrise ? chasseur : null;
  const receveurPlace = receveur && distance(receveur.pos, arrivee) <= rayonPrise ? receveur : null;

  let gagnant: Pion | null = null;
  if (chasseurPlace && (!receveurPlace || e.rng() < chanceChasseur
    || distance(chasseurPlace.pos, arrivee) < distance(receveurPlace.pos, arrivee) - 0.8)) {
    gagnant = chasseurPlace;
  } else {
    gagnant = receveurPlace ?? chasseurPlace;
  }

  // Personne n'est réellement au point de chute : le ballon n'est plus
  // attribué magiquement au joueur le plus proche. Il rebondit et les deux
  // équipes doivent gagner la course.
  if (!gagnant) return demarrerBallonLibre(e, v);

  if (gagnant.cote === camp && contestable) {
    dire(e, 'pied', camp, C.texteMatch('ballonAerien', { nom: gagnant.nom }), 0, gagnant.moi);
  }
  // Petit risque d'échapper un ballon haut.
  if (v.hauteur > 0.7 && e.rng() < 0.07) {
    e.ballon = { x: gagnant.pos.x, y: gagnant.pos.y };
    return enAvant(e, gagnant);
  }
  e.possession = gagnant.cote;
  reprendreJeu(e, gagnant.pos, gagnant);
}

function demarrerBallonLibre(
  e: EtatMatch,
  vol: Vol,
  intention: IntentionPied | 'touche' = vol.type === 'pied' ? vol.intention as IntentionPied : 'touche',
): void {
  const dx = vol.vers.x - vol.de.x;
  const dy = vol.vers.y - vol.de.y;
  const norme = Math.max(0.01, Math.hypot(dx, dy));
  const haut = vol.hauteur > 0.72;
  const rasant = vol.intention === 'rasant';
  const vitesse = rasant ? 10.5 : haut ? 3.8 : 7.2;
  e.porteur = null;
  e.vol = null;
  e.ballonLibre = null;
  e.ruck = null;
  e.aplatissage = null;
  e.phase = 'ballonLibre';
  e.minuteur = 10;
  e.ballonLibre = {
    vitesse: { x: dx / norme * vitesse, y: dy / norme * vitesse },
    hauteur: haut ? 0.7 : rasant ? 0.12 : 0.28,
    vitesseVerticale: haut ? 4.8 : rasant ? 1.1 : 2.4,
    intention,
    auteurCote: vol.auteur.cote,
    auteur: vol.auteur,
    age: 0,
    rebonds: 0,
  };
  dire(e, 'pied', null, rasant
    ? 'Le ballon fuse au ras du sol : la course à la récupération est lancée.'
    : haut
      ? 'Le ballon retombe sans receveur et prend un rebond imprévisible.'
      : 'Le ballon rebondit puis roule dans l’espace.');
}

function phaseBallonLibre(e: EtatMatch, dt: number): void {
  const libre = e.ballonLibre;
  if (!libre) return reprendreJeu(e, e.ballon);
  libre.age += dt;

  e.ballon.x += libre.vitesse.x * dt;
  e.ballon.y += libre.vitesse.y * dt;
  libre.hauteur += libre.vitesseVerticale * dt;
  libre.vitesseVerticale -= 9.81 * dt;

  if (libre.hauteur <= 0 && libre.vitesseVerticale < 0) {
    libre.hauteur = 0;
    const coefficient = libre.intention === 'rasant' ? 0.34 : libre.rebonds === 0 ? 0.54 : 0.31;
    libre.vitesseVerticale = -libre.vitesseVerticale * coefficient;
    const deviation = (e.rng() - 0.5) * (libre.intention === 'rasant' ? 0.11 : 0.28);
    const vx = libre.vitesse.x;
    const vy = libre.vitesse.y;
    libre.vitesse.x = (vx - vy * deviation) * 0.72;
    libre.vitesse.y = (vy + vx * deviation) * 0.72;
    libre.rebonds += 1;
    if (Math.abs(libre.vitesseVerticale) < 0.75) libre.vitesseVerticale = 0;
  }
  const frein = Math.exp(-(libre.intention === 'rasant' ? 0.34 : 0.48) * dt);
  libre.vitesse.x *= frein;
  libre.vitesse.y *= frein;

  if (e.ballon.y <= 0 || e.ballon.y >= LARGEUR) {
    const lieu = { x: e.ballon.x, y: e.ballon.y <= 0 ? 0 : LARGEUR };
    e.ballonLibre = null;
    return arret(e, 'touche', adverse(libre.auteurCote), lieu);
  }
  if (e.ballon.x <= 0 || e.ballon.x >= LONGUEUR) {
    const defenseur: Cote = e.ballon.x <= LIGNE_A ? 'A' : 'B';
    e.ballonLibre = null;
    return arret(e, 'renvoi22', defenseur, { x: defenseur === 'A' ? M22_A : M22_B, y: AXE });
  }

  // Seuls les joueurs en jeu chassent. Les autres gardent la structure de la
  // ligne, ce qui évite de reformer une boule de trente pions autour du ballon.
  const candidats = e.pions
    .filter((p) => p.surLeTerrain && p.sanction <= 0 && !p.horsJeu)
    .sort((a, b) => distance2(a.pos, e.ballon) - distance2(b.pos, e.ballon));
  for (const p of candidats.slice(0, 5)) {
    p.role = 'chasseur';
    p.effort = distance2(p.pos, e.ballon) < 225 ? 1.08 : 1;
    p.cible = {
      x: borner(e.ballon.x + libre.vitesse.x * 0.16, 0.5, LONGUEUR - 0.5),
      y: borner(e.ballon.y + libre.vitesse.y * 0.16, 0.5, LARGEUR - 0.5),
    };
  }

  const premier = candidats[0];
  const rayon = libre.hauteur > 1.5 ? 0.8 : libre.hauteur > 0.45 ? 1.25 : 1.65;
  if (!premier || distance(premier.pos, e.ballon) > rayon) return;

  // Un rebond haut ou contrarié reste délicat, mais une mauvaise prise ne
  // fige pas le ballon : elle le repousse devant le joueur et la lutte continue.
  const difficulte = libre.hauteur * 7 + Math.hypot(libre.vitesse.x, libre.vitesse.y) * 0.55;
  const securite = premier.vision * 0.45 + premier.detente * 0.35 + premier.passe * 0.20;
  if (libre.age < 0.35 || e.rng() < borner((difficulte + 20 - securite) / 150, 0.015, 0.20)) {
    const s = sens(premier.cote);
    libre.vitesse.x += s * 1.8;
    libre.vitesse.y += (e.rng() - 0.5) * 2.2;
    libre.vitesseVerticale = Math.max(libre.vitesseVerticale, 1.4);
    libre.hauteur = Math.max(libre.hauteur, 0.12);
    premier.battu = Math.max(premier.battu, 0.35);
    return;
  }

  e.ballonLibre = null;
  e.possession = premier.cote;
  libererHorsJeu(e);
  if ((e.ballon.x <= LIGNE_A && premier.cote === 'A')
    || (e.ballon.x >= LIGNE_B && premier.cote === 'B')) {
    return arret(e, 'renvoi22', premier.cote, { x: premier.cote === 'A' ? M22_A : M22_B, y: AXE });
  }
  dire(e, 'pied', premier.cote, `Le ballon vivant est récupéré par ${premier.nom}.`, 0, premier.moi);
  reprendreJeu(e, premier.pos, premier);
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
    const longueur = distance(e.vol.de, e.vol.vers);
    e.vol = null;
    if (!receveur || !receveur.surLeTerrain || receveur.sanction > 0) return formerRuck(e, e.ballon);
    // ⚠️ ET IL FAUT ENCORE L'ATTRAPER. Voir `receptionRatee`.
    if (receptionRatee(e, receveur, longueur, offload)) {
      e.ballon = { x: receveur.pos.x, y: receveur.pos.y };
      return enAvant(e, receveur);
    }
    donnerBallon(e, receveur, offload ? 0.5 : 0.35);
    return;
  }

  const porteur = e.porteur;
  if (!porteur) return formerRuck(e, e.ballon);
  const s = sens(porteur.cote);

  // ── La course du porteur ─────────────────────────────────────────────────
  // ⚠️ TOUT LE MONDE COURT PAREIL, Y COMPRIS SON PROPRE PION. Il y avait ici
  // une branche « piloté » qui posait la cible à dix mètres dans l'axe du
  // stick ; le stick n'existe plus (« que les choix, pas bouger le joueur »).
  // La ligne de course automatique — fixer son vis-à-vis tant qu'il reste un
  // partenaire, attaquer l'intervalle sinon — vaut donc pour les trente.
  // ⚠️ EN ÉCHAPPÉE, ON NE FIXE PLUS PERSONNE : ON COURT À LA LIGNE. C’est la
  // moitié du correctif « qu’un raffut ou un sprint réussi mène à un essai » —
  // `ligneDeCourse` cherche un intervalle et attend un soutien, ce qui est la
  // bonne lecture face à un rideau en place et la mauvaise quand il est déjà
  // dans le dos.
  const enEchappee = e.echappee?.pion === porteur;
  porteur.cible = enEchappee
    ? { x: porteur.cote === 'A' ? LIGNE_B + 2 : LIGNE_A - 2, y: borner(porteur.pos.y, 3, LARGEUR - 3) }
    : ligneDeCourse(e, porteur);
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
    dire(e, 'touche', adverse(porteur.cote), C.texteMatch('pousseTouche', { nom: porteur.nom }), 0, porteur.moi);
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
  const prioriteAplatir = metresAvantLaLigne(porteur.pos, porteur.cote) < 3.5 && pression > 2.1;
  if (prioriteAplatir) {
    porteur.cible = {
      x: porteur.cote === 'A' ? LIGNE_B + 1.2 : LIGNE_A - 1.2,
      y: borner(porteur.pos.y, 2, LARGEUR - 2),
    };
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

  // ⚠️ LE JOUEUR DÉCIDE AVANT LA MACHINE. Passer et taper sont des ordres
  // IMMÉDIATS : les évaluer ici, avant la logique de combinaison et avant le
  // plaquage, c'est la seule façon qu'un clic serve à quelque chose — entre
  // 3 m et 1,35 m de pression il ne s'écoule que 0,13 s (c'est déjà la leçon
  // du « fixer et donner » juste en dessous).
  if (!prioriteAplatir && porteur.moi && e.controle && e.intention) {
    // ⚠️ TROIS PASSES, PAS UNE. `passe` est l'action contextuelle du gros bouton
    // (elle donne au plus évident) ; `passeGauche` et `passeDroite` désignent un
    // CÔTÉ. Retour de jeu : « en mode A ou E pour faire la passe droite ou
    // gauche ». Avec un seul bouton, le moteur choisissait le receveur : on
    // subissait sa lecture au lieu de jouer la sienne, et l'aile fermée ne
    // recevait jamais rien.
    const cote = e.intention.type === 'passeGauche' ? -1
      : e.intention.type === 'passeDroite' ? 1 : 0;
    if (e.intention.type === 'passe' || cote !== 0) {
      const receveur = cote === 0
        ? receveurPour(e, porteur)
        : (receveurCote(e, porteur, cote) ?? receveurPour(e, porteur));
      if (receveur) {
        consommerIntention(e);
        return passerLeBallon(e, porteur, receveur, pression);
      }
    }
    if (e.intention.type === 'pied') {
      consommerIntention(e);
      return taperAuPied(e, porteur, intentionDePied(e, porteur));
    }
  }

  // ⚠️ « FIXER ET DONNER » — ÉVALUÉ À CHAQUE TICK, avant le plaquage.
  // C'était LE bug du ballon qui n'allait jamais à l'aile : la décision n'était
  // reprise que toutes les 0,22 s, et entre 3 m et 1,35 m il ne s'écoule que
  // 0,13 s — le porteur était plaqué avant d'avoir eu le droit de passer.
  // ⚠️ ET LE JOUEUR N'EST PLUS UN CAS PARTICULIER — C'EST LE CŒUR DE LA
  // DEMANDE : « dans les matchs on ne fait que les choix, on ne bouge pas le
  // joueur ». Tant qu'il y avait une manette, le moteur se TAISAIT dès que le
  // pion du joueur portait le ballon : ni passe automatique, ni coup de pied,
  // parce qu'un bouton allait décider. Les boutons ont disparu ; sans ce
  // retrait, le pion garderait le ballon jusqu'au plaquage à CHAQUE possession
  // — quatre-vingts fois par match, et jamais une passe.
  //
  // Ce qui reste au joueur, c'est la CARTE DE DÉCISION. L'intention qu'elle
  // arme est lue une trentaine de lignes plus haut, DONC AVANT ce bloc : un
  // choix passe toujours devant le rugby automatique. Ne pas choisir laisse
  // simplement le pion jouer comme les vingt-neuf autres.
  const lancement = e.lancement;
  const suivant = lancement && lancement.index + 1 < lancement.chaine.length
    ? lancement.chaine[lancement.index + 1] : null;
  // ⚠️ ET ON NE DONNE PAS LE BALLON QUAND ON EST DANS L’ESPACE. « Fixer et
  // donner » est la bonne règle face à un défenseur ; à quarante mètres de la
  // ligne avec le rideau battu, c’est ce qui annulait la percée qu’on venait
  // de réussir. Le joueur peut toujours servir son soutien : la carte de
  // l’espace le lui propose, et un choix passe toujours devant l’automatisme.
  if (!prioriteAplatir && !enEchappee && suivant && suivant.surLeTerrain
    && pression <= (porteur.avant ? 3.4 : 3.7)) {
    return passerLeBallon(e, porteur, suivant, pression);
  }

  if (plaqueur && porteur.battu <= 0) return resoudrePlaquage(e, porteur, plaqueur);

  // ── Les décisions plus lourdes (coup de pied, drop) ──────────────────────
  e.prochaineDecision -= dt;
  if (e.prochaineDecision > 0) return;
  e.prochaineDecision = 0.25;
  // On ne tape pas en touche quand on a la ligne devant soi.
  if (!enEchappee && !prioriteAplatir) deciderAvecLeBallon(e, porteur, pression);
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

/**
 * ⚠️ ON POSE LA DÉCISION DE L'ARBITRE POUR QU'ELLE SE VOIE.
 *
 * `DUREE_SIFFLET` est en secondes SIMULÉES, pas réelles, et c'est voulu : à
 * l'accélération, la bannière disparaît vite parce que le jeu file ; sur un
 * moment joué en temps réel, elle reste le temps de la lire. Elle suit le
 * rythme du match, comme tout le reste.
 */
const DUREE_SIFFLET = 4.5;

function poserSifflet(e: EtatMatch, cle: string, pour: Cote, fautif?: Pion): void {
  e.sifflet = {
    cle,
    club: nomClub(e, pour),
    fautif: fautif?.nom ?? '',
    maFaute: !!fautif?.moi,
    restant: DUREE_SIFFLET,
  };
}

/**
 * ⚠️ L'EN-AVANT — UN SEUL CHEMIN, POUR QU'IL AIT TOUJOURS UNE CONSÉQUENCE.
 *
 * Retour de jeu : « on peut faire des en-avants sans répercussion ». Le fait
 * était exact, et il avait deux causes bien distinctes :
 *
 * 1. ⚠️ UNE PASSE REÇUE NE POUVAIT PAS ÊTRE LÂCHÉE. `donnerBallon` donnait le
 *    ballon, point. Or au rugby la faute de main la plus fréquente n'est pas la
 *    passe ratée, c'est la RÉCEPTION ratée : une passe trop dure, dans le dos,
 *    ou prise avec un défenseur dans le nez. Le geste le plus banal du sport
 *    n'existait tout simplement pas dans le moteur.
 * 2. LE PEU QUI EXISTAIT ÉTAIT RECOPIÉ EN TROIS ENDROITS, avec trois
 *    formulations et un seul point commun : personne ne les comptait. Un
 *    évènement qu'on ne mesure pas est un évènement qu'on ne règle pas.
 *
 * Tout passe donc par ici : le commentaire, la statistique du fautif, le
 * compteur du match, et surtout LA MÊLÉE POUR L'ADVERSAIRE, c'est-à-dire la
 * perte de la possession. C'est ça, la répercussion.
 */
function enAvant(e: EtatMatch, p: Pion): void {
  p.stats.passesRatees += 1;
  e.compteurs.enAvants += 1;
  dire(e, 'faute', p.cote, C.phrase(e.rng, C.EN_AVANT, {
    nom: p.nom, club: nomClub(e, adverse(p.cote)),
  }), 0, p.moi);
  poserSifflet(e, 'ml.sifflet.enAvant', adverse(p.cote), p);
  // Perdre le ballon de ses propres mains, ça casse un élan.
  pousserElan(e, p.cote, POUSSEES.enAvant);
  arret(e, 'melee', adverse(p.cote), p.pos);
}

/**
 * ⚠️ LA PASSE EN AVANT EXISTE ENFIN, ELLE N'EST PLUS RABOTÉE EN SILENCE.
 *
 * `passerLeBallon` ramenait le point d'arrivée derrière le passeur dès que le
 * receveur avait dérivé devant lui : la règle était « respectée », mais à
 * l'écran le ballon partait vers un partenaire placé plus haut et l'arbitre ne
 * disait rien. C'est exactement ce que décrit le retour de jeu, et c'est la
 * seule faute du rugby que le moteur était incapable de commettre.
 *
 * ⚠️ ELLE RESTE RARE, ET C'EST UNE DÉCISION : on ne siffle qu'une fraction des
 * passes litigieuses (les autres sont corrigées par le passeur, qui retient son
 * geste). Une passe en avant sifflée à chaque dérive de trente centimètres
 * rendrait toute envolée de trois-quarts impossible.
 */
function passeEnAvant(e: EtatMatch, p: Pion): void {
  p.stats.passes -= 1;
  p.stats.passesRatees += 1;
  e.compteurs.enAvants += 1;
  dire(e, 'faute', p.cote, C.phrase(e.rng, C.PASSE_AVANT, {
    nom: p.nom, club: nomClub(e, adverse(p.cote)),
  }), 0, p.moi);
  poserSifflet(e, 'ml.sifflet.passeAvant', adverse(p.cote), p);
  arret(e, 'melee', adverse(p.cote), p.pos);
}

/**
 * ⚠️ LA RÉCEPTION PEUT ÊTRE MANQUÉE, et c'est ce qui manquait.
 *
 * Le risque n'est pas un dé plat : il dit quelque chose du jeu, sinon il n'est
 * qu'une punition au hasard. Il monte avec la PRESSION sur le receveur (une
 * passe prise avec un plaqueur sur les épaules), avec la LONGUEUR de la passe,
 * et il descend avec la qualité de mains du receveur (`passe`) et sa fraîcheur.
 *
 * ⚠️ L'OFFLOAD EST BIEN PLUS RISQUÉ, et c'est le point d'équilibre du geste :
 * une passe après contact offre un temps de jeu gratuit, elle doit pouvoir le
 * coûter. Sans ça, raffut puis offload était une machine à franchir sans aucun
 * revers possible.
 */
/**
 * LE FACTEUR D'ERREUR ENTRE COÉQUIPIERS, tiré de la cohésion de l'équipe.
 *
 * ⚠️ IL NE MULTIPLIE QUE DES FAUTES DE LIAISON, jamais une aptitude. Demande,
 * mot pour mot : « il faut que le collectif compte dans l'influence du jeu
 * aussi sur les erreurs entre équipiers ». C'est le bon endroit, et le seul :
 * une passe qui part devant, un ballon lâché à la réception ou un offload
 * donné dans le vide sont EXACTEMENT ce qui sépare une ligne rodée d'un XV de
 * gens qui se sont rencontrés au vestiaire. La vitesse, le plaquage et le pied
 * d'un joueur ne doivent rien à ses voisins — ils restent hors d'ici.
 *
 * L'amplitude est volontairement contenue : ±30 % sur des risques qui valent
 * quelques pour cent. Sur un match, cela se compte en une ou deux fautes de
 * main — assez pour qu'on sente la différence entre un groupe neuf et un bloc
 * constitué, jamais assez pour qu'une feuille dépareillée soit ingagnable. Le
 * mode distribue des cartes au hasard : on ne punit pas un manager pour ce que
 * les packs lui ont donné.
 */
function erreurDeLiaison(e: EtatMatch, cote: Cote): number {
  const c = e.cohesion?.[cote];
  if (c === undefined) return 1;
  return borner(1 + ((50 - c) / 100) * 0.6, 0.7, 1.3);
}

function receptionRatee(e: EtatMatch, receveur: Pion, longueur: number, offload: boolean): boolean {
  let plusProche = 99;
  for (const d of surLeTerrain(e, adverse(receveur.cote))) {
    if (d.sanction > 0 || d.battu > 0) continue;
    plusProche = Math.min(plusProche, distance(d.pos, receveur.pos));
  }
  const mains = 0.55 + receveur.passe / 200 + receveur.endurance / 900;
  const risque = ((offload ? 0.020 : 0.0045)
    + Math.max(0, 4 - plusProche) * 0.006
    + Math.max(0, longueur - 9) / 600) * erreurDeLiaison(e, receveur.cote);
  return e.rng() < Math.max(0, risque / mains);
}

function donnerBallon(e: EtatMatch, p: Pion, delai: number): void {
  e.porteur = p;
  e.possession = p.cote;
  e.ballon = { x: p.pos.x, y: p.pos.y };
  p.stats.courses += 1;
  // ⚠️ LE PICK AND GO SE COMPTE À LA PRISE DE BALLON, pas au choix du lancement.
  // Un lancement choisi n'est pas un ballon porté : la combinaison peut être
  // interrompue avant que l'avant ne parte. Et le filtre `avant` n'est pas
  // cosmétique — le 9 fait partie de la chaîne d'un pick and go, mais quand il
  // sert le ballon au pied du ruck ce n'est pas lui qui « pique et va ».
  if (e.lancement?.type === 'pickAndGo' && p.avant) p.stats.pickAndGo += 1;
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
    && p.pied > 55 && e.rng() < 0.032) {
    return taperAuPied(e, p, 'rasant');
  }
}

function passerLeBallon(e: EtatMatch, p: Pion, receveur: Pion, pression: number): void {
  const s = sens(p.cote);
  // ⚠️ RÈGLE DU RUGBY : la passe ne part JAMAIS vers l'avant. On vise le
  // receveur, mais si celui-ci a pris de l'avance on ramène le point d'arrivée
  // derrière le passeur.
  const cible: Vec = { x: receveur.pos.x, y: receveur.pos.y };
  const d = distance(p.pos, cible);
  p.stats.passes += 1;

  // ⚠️ LE RECEVEUR A DÉRIVÉ DEVANT : soit le passeur retient son geste, soit il
  // la lâche quand même et l'arbitre siffle. Voir `passeEnAvant`.
  // ⚠️ LA PASSE EN AVANT EST UNE FAUTE DE TIMING, PAS DE GESTE : le receveur a
  // dérivé devant, ou le passeur ne l'a pas vu partir. C'est la première chose
  // qu'une ligne rodée cesse de faire — d'où la cohésion, ici comme au sol.
  const liaison = erreurDeLiaison(e, p.cote);
  const avance = (cible.x - p.pos.x) * s;
  if (avance > 0.4) {
    const risque = Math.min(0.22, Math.max(0, avance - 1.4) * 0.038) * (1.3 - p.vision / 200) * liaison;
    if (e.rng() < risque) return passeEnAvant(e, p);
    cible.x = p.pos.x - s * 0.4;
  }

  // En-avant : rare, mais plus fréquent sous pression et chez un avant.
  const risque = (0.010 + Math.max(0, 3 - pression) * 0.007 + d / 1800) * liaison;
  if (e.rng() < risque * (1.35 - p.passe / 220)) {
    p.stats.passes -= 1;
    return enAvant(e, p);
  }

  // La passe est partie et elle est bonne : si un essai tombe avant le
  // prochain regroupement, elle sera la passe décisive.
  e.dernierPasseur = p;

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
  poserVol(e, {
    de: { x: p.pos.x, y: p.pos.y }, vers: cible,
    // Une passe de rugby claque : environ 20/100 s à courte portée, jamais
    // plus d'une demi-seconde. Un coup de pied garde une arche bien plus haute.
    duree: borner(0.14 + d / 42, 0.18, 0.50), ecoule: 0,
    hauteur: Math.min(0.28, 0.08 + d * 0.008),
    type: 'passe', intention: 'passe', auteur: p, receveur,
  });

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

/**
 * ⚠️ DONNER APRÈS LE CONTACT — extrait de `resoudrePlaquage` parce que DEUX
 * chemins en ont désormais besoin : le tirage automatique du moteur, et
 * l'action `offload` que le joueur choisit sur sa carte de décision. Deux
 * copies de ce transfert de ballon, et un jour l’une compte la statistique et
 * pas l’autre.
 *
 * ⚠️ LE SOUTIEN DOIT ÊTRE DERRIÈRE, ou à hauteur : une passe après contact
 * reste une passe, elle ne peut pas partir vers l’avant.
 *
 * @returns faux s’il n’y avait personne pour recevoir — le contact suit alors
 *   son cours normal.
 */
function offloader(e: EtatMatch, porteur: Pion): boolean {
  const s = sens(porteur.cote);
  const soutiens = surLeTerrain(e, porteur.cote).filter((q) =>
    q !== porteur && (q.pos.x - porteur.pos.x) * s <= 0.8 && distance2(q.pos, porteur.pos) < 90);
  if (!soutiens.length) return false;
  const recu = soutiens.sort((a, b) => distance2(porteur.pos, a.pos) - distance2(porteur.pos, b.pos))[0];
  dire(e, 'jeu', porteur.cote, C.texteMatch('offload', { porteur: porteur.nom, receveur: recu.nom }), 0, porteur.moi || recu.moi);
  porteur.stats.passes += 1;
  // ⚠️ L'OFFLOAD EST COMPTÉ À PART, EN PLUS de la passe. C'est une passe
  // APRÈS contact, la marque des grands centres et des troisièmes lignes :
  // la noyer dans le total des passes, c'est perdre exactement ce qui
  // distingue un joueur qui fait vivre le ballon d'un joueur qui le donne.
  porteur.stats.offloads += 1;
  // Un offload amène l'essai aussi souvent qu'une passe classique.
  e.dernierPasseur = porteur;
  if (e.lancement) { e.lancement.chaine = []; e.lancement.index = 0; }
  e.porteur = null;
  poserVol(e, {
    de: { x: porteur.pos.x, y: porteur.pos.y }, vers: { x: recu.pos.x, y: recu.pos.y },
    duree: 0.28, ecoule: 0, hauteur: 0, type: 'passe', intention: 'offload',
    auteur: porteur, receveur: recu,
  });
  return true;
}

/**
 * ⚠️ LA CHANCE QU'UN PLAQUAGE ABOUTISSE — LA SEULE, ET ELLE A DEUX LECTEURS.
 *
 * Elle vivait au milieu de `resoudrePlaquage`, ce qui allait très bien tant que
 * personne d'autre n'avait besoin de la connaître. Depuis que la carte de
 * décision AFFICHE un pourcentage de réussite, un second lecteur existe — et
 * une probabilité recopiée est une probabilité qui ment un jour. Le chiffre
 * montré au joueur et le tirage qui décide de son sort sortent donc
 * littéralement de la même ligne de code.
 *
 * @param geste   le geste ARMÉ PAR L'ATTAQUANT (crochet, raffut, sprint) — il
 *   fait baisser la probabilité de plaquage, donc monter celle de percer.
 * @param monPlaquage le défenseur est le joueur ET il a demandé à plaquer : il
 *   se lance, +16 % de force, et il paiera plus cher s'il manque.
 */
export function probaPlaquage(
  e: EtatMatch, porteur: Pion, defenseur: Pion,
  geste: ActionJoueur | null, monPlaquage: boolean, efficaciteGeste = 1,
): number {
  const fatigueD = 0.72 + defenseur.endurance / 360;
  // ⚠️ LE GESTE DU JOUEUR PÈSE VRAIMENT SUR LE DUEL — sinon la carte ne serait
  // qu'un habillage. Il ne le décide pas pour autant : il déplace le curseur
  // d'un contact qui reste arbitré par les attributs des deux hommes.
  const force = defenseur.plaquage * fatigueD * (monPlaquage ? 1.16 : 1);
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
  // ⚠️ LA DYNAMIQUE PÈSE SUR LE CONTACT, ET ELLE SE VOIT SUR LA CARTE.
  // Retour de jeu : « un turnover relance la dynamique de l’équipe ». Une
  // jauge qui ne changerait que la couleur d’une barre serait un décor ; ici,
  // l’élan entre dans la formule que `enjeuDe` affiche ET que `resoudreChoix`
  // tire. Un plaquage à 88 % passe à 94 % quand l’équipe est portée.
  const elan = bonusElan(e, defenseur.cote);

  // ═══ LE GESTE CHOISI : UN BONUS DIRECT, PAS UN TERME DE RÉSISTANCE ══════
  //
  // ⚠️ RETOUR DE JEU : « les sprints, crochets, raffuts, j’ai l’impression que
  // ça marche jamais, le joueur se fait coffrer et ne passe jamais ». C’était
  // JUSTE, et mesurable — voici ce que la carte annonçait, sur de vrais
  // joueurs de Top 14 :
  //
  //     porteur            rien   crochet   raffut   sprint
  //     demi d’ouverture   12,2 %   21,0 %   21,3 %   13,7 %
  //     pilier gauche      11,6 %   19,3 %   21,3 %   13,1 %
  //
  // Un crochet qui échoue quatre fois sur cinq, ce n’est pas un pari, c’est
  // une loterie ; et le SPRINT ne valait qu’un point et demi — un bouton qui
  // ne fait rien. Pire, un PILIER crochetait presque aussi bien qu’un ouvreur.
  //
  // ⚠️ LA CAUSE ÉTAIT LE DIVISEUR, PAS LES COEFFICIENTS. Le geste passait par
  // `(force − resistance) / 400` : quarante points d’attribut n’y valent que
  // dix points de probabilité. On avait déjà remonté les coefficients une fois
  // (0,30 → 0,45) en croyant régler le problème — ça n’a rendu que six points.
  // Tant que le geste traverse ce diviseur, il ne peut pas se sentir.
  //
  // Le geste retranche donc DIRECTEMENT de la chance de plaquage, et il est
  // indexé sur l’attribut qui le porte : un ailier rapide sprinte, un pilier
  // raffute, et aucun des deux ne fait le métier de l’autre.
  return borner(
    0.90 + (force - resistance) / 400 - aide + elan - bonusDuGeste(porteur, geste) * efficaciteGeste,
    0.36, 0.99,
  );
}

/**
 * Ce que le geste choisi retire à la chance de plaquage.
 *
 * ⚠️ LES BORNES SONT LE VRAI RÉGLAGE, et elles sont posées sur une cible
 * lisible : un joueur MOYEN (attribut 60) doit franchir environ une fois sur
 * cinq, un TRÈS BON (85) un peu plus d’une fois sur trois. En dessous, le
 * geste ne se sent pas ; au-dessus, l’ailier devient imprenable et ce n’est
 * plus du rugby — `verifControle.ts` refuse plus de douze franchissements par
 * match.
 *
 * ⚠️ ET ÇA NE TOUCHE PAS L’ÉTALONNAGE DU MOTEUR. `geste` n’est jamais
 * renseigné hors pilotage (`monGeste` exige `porteur.moi && e.controle && une
 * intention armée`) : les vingt-neuf autres joueurs, la simulation de fond et
 * `verifMoteur.ts` passent tous par `geste === null`, donc par zéro.
 */
function bonusDuGeste(porteur: Pion, geste: ActionJoueur | null): number {
  // Une droite entre « ça n’aide presque pas » et « ça change le duel ».
  //
  // ⚠️ CHAQUE GESTE A SON PROPRE PLANCHER, ET CE N’EST PAS UN DÉTAIL. Les deux
  //    attributs ne vivent pas sur la même plage : dans un pack de Top 14,
  //    `puissance` court de 85 à 97 là où `evitement` va de 68 à 78. Avec un
  //    plancher commun, le raffut butait sur le plafond pour TOUT LE MONDE
  //    (38 % de franchissement contre 33 % au crochet, mesuré) : il devenait la
  //    réponse à tout, et le choix de la carte ne voulait plus rien dire.
  const surAttribut = (a: number, plancher: number) => borner((a - plancher) * 0.006, 0, 0.26);
  switch (geste) {
    case 'crochet': return surAttribut(porteur.evitement, 43);
    case 'raffut': return surAttribut(porteur.puissance, 58);
    // ⚠️ LE SPRINT SE JOUE SUR LA VITESSE RÉELLE DU PION, pas sur un forfait.
    //    Il valait `+6` de résistance pour tout le monde, soit un point et
    //    demi de probabilité : autant dire rien, et rien qui distingue un
    //    ailier d’un pilier. `vitesseMax` va de ~7,5 (première ligne) à ~9,8
    //    (ailier) : le geste ne rend donc quelque chose qu’à ceux qui ont de
    //    quoi prendre l’extérieur.
    case 'sprint': return borner((porteur.vitesseMax - 7.6) * 0.11, 0, 0.20);
    default: return 0;
  }
}

/** Le geste naturel que choisit un porteur non piloté selon son profil. */
function gesteAutomatique(e: EtatMatch, porteur: Pion, defenseur: Pion): ActionJoueur | null {
  // Cette variation ne consomme pas le RNG : le direct et le calcul en arrière-
  // plan gardent exactement la même rejoue, contact après contact.
  const variation = Math.abs(Math.sin(porteur.numero * 17.13 + defenseur.numero * 7.71 + e.t * 0.37));
  const profilPuissant = porteur.puissance - porteur.evitement;
  if (porteur.puissance >= 70 && profilPuissant >= 7 && variation > 0.14) return 'raffut';
  if (porteur.evitement >= 66 && variation > 0.18) return 'crochet';
  if (porteur.vitesseMax >= 8.45 && variation > 0.28) return 'sprint';
  if (porteur.puissance >= 82 && variation > 0.48) return 'raffut';
  return null;
}

/** Amorce un appui, pas un saut de position : le déplacement reste continu. */
function amorcerGeste(e: EtatMatch, porteur: Pion, defenseur: Pion, geste: ActionJoueur | null): number {
  const alternance = ((porteur.numero + defenseur.numero + Math.floor(e.t)) & 1) === 0 ? 1 : -1;
  if (geste === 'crochet') {
    const direction = porteur.pos.y < 4 ? 1 : porteur.pos.y > LARGEUR - 4 ? -1 : alternance;
    porteur.cible.y = borner(porteur.pos.y + direction * 2.6, 1, LARGEUR - 1);
    porteur.vitesse.y += direction * 1.5;
    return direction;
  }
  if (geste === 'sprint') {
    porteur.effort = 1;
    porteur.vitesse.x += sens(porteur.cote) * 1.1;
  }
  return alternance;
}

/**
 * @param abouti  issue IMPOSÉE du duel, quand le joueur vient de choisir son
 *   geste sur une carte de décision : `resoudreChoix` a déjà tiré le dé (avec
 *   la MÊME `probaPlaquage` que celle affichée sur la carte) et impose ici le
 *   résultat. Sans ce paramètre, le contact serait tiré DEUX FOIS et le
 *   pourcentage annoncé au joueur ne voudrait plus rien dire.
 *   Laissé vide, le duel se joue tout seul : le cas des vingt-neuf autres.
 */
function resoudrePlaquage(
  e: EtatMatch, porteur: Pion, defenseur: Pion, abouti?: boolean,
): void {
  // ⚠️ LE GESTE ILLÉGAL SE JOUE AVANT LE DUEL, ET IL LE REMPLACE. Un plaquage
  // haut n'est pas un plaquage raté : l'arbitre siffle, le ballon change de
  // camp, et la température monte d'un cran. Ça vaut pour les TRENTE pions —
  // c'est ce qui permet à l'équipe d'en face d'allumer la mèche
  // (`bagarre.ts` → `irregularite` et `apresGesteIllegal`).
  const irreg = irregularite(e, defenseur);
  if (irreg) {
    e.compteurs.irregularites += 1;
    defenseur.stats.plaquagesManques += 1;
    porteur.battu = 0.6;
    siffler(e, porteur.cote, { x: porteur.pos.x, y: porteur.pos.y }, irreg.motif, defenseur);
    apresGesteIllegal(e, defenseur, porteur, irreg);
    return;
  }

  const monGeste = porteur.moi && e.controle && e.intention ? e.intention.type : null;
  const gesteAuto = monGeste ? null : gesteAutomatique(e, porteur, defenseur);
  const geste = monGeste ?? gesteAuto;
  const directionGeste = amorcerGeste(e, porteur, defenseur, geste);
  const monPlaquage = defenseur.moi && intentionEst(e, 'plaquage');
  const proba = probaPlaquage(e, porteur, defenseur, geste, monPlaquage, monGeste ? 1 : 0.42);

  if (abouti === undefined ? e.rng() >= proba : !abouti) {
    defenseur.stats.plaquagesManques += 1;
    porteur.stats.franchissements += 1;
    // ⚠️ UN PLAQUAGE LANCÉ ET MANQUÉ COÛTE PLUS CHER. On part en cathédrale :
    // si le porteur crochète, on met trois secondes à revenir dans le match,
    // pas deux. C'est le risque qui rend l'action intéressante à jouer.
    defenseur.battu = monPlaquage ? 3.0 : 2.0;
    porteur.battu = 0.4; // il ne peut pas être re-plaqué dans la même seconde
    if (geste === 'raffut') {
      defenseur.vitesse.x += sens(porteur.cote) * 2.8;
      defenseur.vitesse.y += directionGeste * 0.8;
      defenseur.cible.y = borner(defenseur.pos.y + directionGeste * 1.6, 0, LARGEUR);
    } else if (geste === 'crochet') {
      // Le plaqueur part une fraction de seconde sur le mauvais appui.
      defenseur.vitesse.y -= directionGeste * 1.7;
    }
    // ⚠️ C'EST ICI, ET NULLE PART AILLEURS, QU'UNE PERCÉE EXISTE. Que le geste
    // ait été joué sur-le-champ ou qu'il soit resté armé jusqu'au contact, le
    // moteur passe par cette ligne — donc l'enchaînement s'ouvre dans les deux
    // cas, ce qu'un drapeau posé depuis l'écran n'aurait jamais su faire.
    if (porteur.moi) e.perceeJoueur = true;
    // ⚠️ ET C’EST ICI QUE LE DUEL GAGNÉ MÈNE ENFIN QUELQUE PART. Jusque-là,
    // battre son homme rendait la main à `ligneDeCourse` et à « fixer et
    // donner » : deux foulées plus loin, le pion refaisait une passe de
    // routine. Retour de jeu, mot pour mot : « nos actions n’ont aucun impact
    // dans le jeu ». Une percée dans un rideau OUVERT lance une échappée.
    if (porteur.moi && intervalle(e, porteur) >= 7) lancerEchappee(e, porteur);
    else pousserElan(e, porteur.cote, POUSSEES.percee * 0.5);
    if (geste === 'crochet' || geste === 'raffut') {
      if (monGeste) consommerIntention(e);
      dire(e, 'franchissement', porteur.cote, C.texteMatch(
        geste === 'crochet' ? 'crochetReussi' : 'raffutReussi',
        { nom: porteur.nom, cible: defenseur.nom },
      ), 0, Boolean(monGeste));
    } else if (monPlaquage) {
      consommerIntention(e);
      dire(e, 'plaquage', porteur.cote, C.texteMatch('plaquageRateJoueur', {
        nom: defenseur.nom, cible: porteur.nom,
      }), 0, true);
    } else if (e.rng() < 0.22) {
      dire(e, 'plaquage', porteur.cote,
        C.texteMatch('cassePlaquage', { porteur: porteur.nom, defenseur: defenseur.nom }), 0, porteur.moi || defenseur.moi);
    }
    return;
  }

  defenseur.stats.plaquages += 1;
  if (monPlaquage) {
    consommerIntention(e);
    dire(e, 'plaquage', defenseur.cote,
      C.texteMatch('plaquageLance', { nom: defenseur.nom, cible: porteur.nom }), 0, true);
    // Un plaquage appuyé, ça se répond : la température monte d'un cran.
    chauffer(e, 4);
  }
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

  // Faute de plaquage (haut, sans les bras…). ⚠️ Se jeter sur le porteur, c'est
  // DEUX FOIS PLUS de risque de monter dans les épaules : c'est la contrepartie
  // du bonus au plaquage, et ce qui rend le bouton « je plaque » un choix.
  if (e.rng() < 0.020 * (1.6 - defenseur.discipline / 130) * (monPlaquage ? 2.2 : 1)) {
    if (monPlaquage) chauffer(e, 8);
    return siffler(e, porteur.cote, porteur.pos, 'plaquage haut', defenseur);
  }

  // ⚠️ UN CROCHET RATÉ, C'EST UN BALLON EN DANGER. Chercher l'exploit et se
  // faire cueillir, c'est se retrouver au sol dans une position impossible :
  // une fois sur huit, le ballon est rendu. Sans ce risque, on crocheterait à
  // chaque contact.
  if (monGeste === 'crochet') {
    consommerIntention(e);
    dire(e, 'plaquage', defenseur.cote,
      C.texteMatch('crochetRate', { nom: porteur.nom, cible: defenseur.nom }), 0, true);
    if (e.rng() < 0.13) return enAvant(e, porteur);
  }

  // Offload : le geste des grandes équipes, rare mais spectaculaire.
  // Le raffut, lui, est fait pour ça : on garde un bras libre.
  if (e.rng() < 0.055 + porteur.vision / 1600 + (monGeste === 'raffut' ? 0.22 : 0)
    && offloader(e, porteur)) return;

  formerRuck(e, { x: porteur.pos.x, y: porteur.pos.y }, { porteur, defenseur });
}

function formerRuck(
  e: EtatMatch,
  lieu: Vec,
  contact?: { porteur: Pion; defenseur: Pion },
): void {
  // Le porteur est allé au sol : la passe précédente n'amènera plus rien.
  e.dernierPasseur = null;
  // ⚠️ UN RUCK NE SE FORME JAMAIS DANS L'EN-BUT ni sur la ligne de touche : là
  // c'est un essai, un renvoi ou une touche. Sans cette borne, le regroupement
  // se formait derrière la ligne de ballon mort et tout le monde s'y agglutinait.
  e.ballon = {
    x: borner(lieu.x, LIGNE_A + 0.5, LIGNE_B - 0.5),
    y: borner(lieu.y, 1.2, LARGEUR - 1.2),
  };
  e.porteur = null;
  e.vol = null;
  e.ballonLibre = null;
  e.phase = 'ruck';
  e.phasesDepuisArret += 1;
  e.compteurs.rucks += 1;
  e.perceeSignalee = false;
  const attaque = e.possession;
  const defense = adverse(attaque);
  const scoreArrivee = (p: Pion) => {
    const profil = p.plaquage * 0.34 + p.puissance * 0.30 + p.vision * 0.20 + p.discipline * 0.16;
    const specialiste = p.numero === 6 || p.numero === 7 || p.numero === 2 ? 7 : 0;
    return (profil + specialiste) * (0.72 + p.endurance / 360) - distance(p.pos, e.ballon) * 4.2;
  };
  const meilleurs = (c: Cote) => surLeTerrain(e, c)
    .filter((p) => p.avant && p !== contact?.porteur)
    .map(scoreArrivee).sort((a, b) => b - a).slice(0, 3)
    .reduce((s, n, _, l) => s + n / Math.max(1, l.length), 0);
  const vitesseAttaque = meilleurs(attaque) + (e.cohesion?.[attaque] ?? 50) * 0.12;
  const vitesseDefense = meilleurs(defense) + (e.cohesion?.[defense] ?? 50) * 0.12
    + (contact?.defenseur ? 4 : 0);
  e.ruck = {
    porteurId: contact?.porteur.id,
    plaqueurId: contact?.defenseur.id,
    attaque, vitesseAttaque, vitesseDefense,
  };
  // La vitesse de sortie vient de la course des soutiens et du placement du
  // plaqueur. L'aléatoire ne fait plus que départager deux arrivées proches.
  const lent = vitesseDefense + (e.rng() - 0.5) * 12 > vitesseAttaque - 3;
  e.ballonLent = lent;
  e.minuteur = (lent ? 4.0 : 2.25) + e.rng() * (lent ? 1.5 : 0.9);
  e.placement = placementRuck(e.pions, e.ballon, e.possession);
  if (contact) {
    // Au contact, le ballon ET les deux joueurs s'arrêtent ensemble. Avant,
    // le porteur gardait sa vitesse de course pendant que le ballon restait au
    // sol : visuellement, il traversait le ruck sans lui.
    stopper(contact.porteur);
    stopper(contact.defenseur);
    contact.porteur.role = 'ruck';
    contact.defenseur.role = 'ruck';
    const s = sens(contact.porteur.cote);
    e.placement[contact.porteur.id] = {
      x: e.ballon.x - s * 0.25,
      y: borner(e.ballon.y - 0.35, 1.2, LARGEUR - 1.2),
    };
    e.placement[contact.defenseur.id] = {
      x: e.ballon.x + s * 0.45,
      y: borner(e.ballon.y + 0.35, 1.2, LARGEUR - 1.2),
    };
  }
  // La ligne de hors-jeu se replace au dernier pied.
  const sa = sens(e.possession);
  e.horsJeu = lieu.x + sa * 1.3;
  e.ligneDef = e.horsJeu;
}

function phaseRuck(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const attaque = e.possession;
  const defense = adverse(attaque);
  const contexte = e.ruck;
  const valeurRuck = (p: Pion) => (
    p.plaquage * 0.38 + p.puissance * 0.28 + p.vision * 0.19 + p.discipline * 0.15
    + (p.numero === 7 ? 9 : p.numero === 6 || p.numero === 2 ? 6 : 0)
  ) * (0.70 + p.endurance / 335) - distance(p.pos, e.ballon) * 5;
  const prochesDefense = surLeTerrain(e, defense)
    .filter((p) => p.avant && distance2(p.pos, e.ballon) < 72)
    .sort((a, b) => valeurRuck(b) - valeurRuck(a));
  const prochesAttaque = surLeTerrain(e, attaque)
    .filter((p) => p.avant && p.id !== contexte?.porteurId && distance2(p.pos, e.ballon) < 72)
    .sort((a, b) => valeurRuck(b) - valeurRuck(a));
  let gratteur = prochesDefense[0];
  const nettoyeurs = prochesAttaque.slice(0, 3);
  const scoreGrattage = (contexte?.vitesseDefense ?? 45) * 0.42
    + (gratteur ? valeurRuck(gratteur) : 0) * 0.58;
  const scoreNettoyage = (contexte?.vitesseAttaque ?? 45) * 0.45
    + nettoyeurs.reduce((n, p) => n + valeurRuck(p), 0) / Math.max(1, nettoyeurs.length) * 0.55;
  let avantageDefense = scoreGrattage - scoreNettoyage + (e.ballonLent ? 6 : -4);

  // ⚠️ LE GRATTAGE DU JOUEUR — et son revers. S'il a demandé à gratter ET
  // qu'il est vraiment sur le ballon (huit mètres, pas trente), c'est LUI qui
  // conteste, avec une vraie chance de voler le ballon. Mais un gratteur mal
  // placé ne lâche pas le porteur assez vite : une fois sur cinq, c'est
  // pénalité contre son camp — et à ce moment-là le carton devient possible,
  // comme pour n'importe quelle faute (`siffler`).
  const moi = e.pions.find((p) => p.moi);
  const jeGratte = intentionEst(e, 'grattage') && !!moi && moi.cote === defense
    && moi.surLeTerrain && moi.sanction <= 0 && distance2(moi.pos, e.ballon) < 64;
  if (jeGratte && moi) {
    consommerIntention(e);
    gratteur = moi;
    avantageDefense += 12;
    dire(e, 'ruck', defense, C.texteMatch('grattagePlonge', { nom: moi.nom }), 0, true);
  }

  const equilibre = avantageDefense + (e.rng() - 0.5) * 26;
  const disciplineGratteur = gratteur?.discipline ?? 50;
  const malPlace = !gratteur || distance(gratteur.pos, e.ballon) > 3.4;

  // Le défenseur arrivé tard ou hors de ses appuis est sanctionné. Un vrai
  // spécialiste bien placé prend nettement moins ce risque.
  if (gratteur && e.rng() < borner(0.018 + (62 - disciplineGratteur) / 900 + (malPlace ? 0.055 : 0), 0.012, 0.11)) {
    e.ruck = null;
    return siffler(e, attaque, e.ballon, malPlace ? 'défenseur qui plonge au ruck' : 'entrée par le côté au ruck', gratteur);
  }

  // Quand le défenseur est solidement installé et que les soutiens arrivent
  // trop tard, le porteur doit libérer : sinon l'arbitre le sanctionne.
  if (gratteur && !malPlace && equilibre > 13 && e.rng() < borner(0.10 + equilibre / 180, 0.10, 0.27)) {
    e.ruck = null;
    return siffler(e, defense, e.ballon, 'ballon gardé au sol');
  }

  const chanceGrattage = borner(0.035 + equilibre / 230 + (jeGratte ? 0.06 : 0), 0.015, 0.24);
  if (gratteur && !malPlace && e.rng() < chanceGrattage) {
    gratteur.stats.grattages += 1;
    dire(e, 'ruck', defense, C.phrase(e.rng, C.RUCK_GRATTAGE, { nom: gratteur.nom }), 0, gratteur.moi);
    e.possession = defense;
    e.phasesDepuisArret = 0;
    e.dernierTurnover = { pion: gratteur, t: e.t };
    pousserElan(e, defense, POUSSEES.turnover);
  } else if (equilibre > 9 && prochesDefense.length >= 2 && e.rng() < 0.15) {
    const contreur = prochesDefense[0]!;
    e.possession = defense;
    e.phasesDepuisArret = 0;
    e.dernierTurnover = { pion: contreur, t: e.t };
    dire(e, 'ruck', defense, `Contre-ruck puissant : ${nomClub(e, defense)} passe au-dessus du ballon.`);
    pousserElan(e, defense, POUSSEES.turnover);
  } else if (equilibre < -9) {
    e.ballonLent = false;
    dire(e, 'ruck', attaque, `Sortie rapide pour ${nomClub(e, attaque)} : les soutiens ont nettoyé juste à temps.`);
  } else if (equilibre > 2) {
    e.ballonLent = true;
    dire(e, 'ruck', attaque, `Ballon ralenti, la défense de ${nomClub(e, defense)} a le temps de se replacer.`);
  }

  // Les nettoyeurs.
  for (const p of nettoyeurs) if (distance2(p.pos, e.ballon) < 16) p.stats.rucksNettoyes += 1;

  // ⚠️ LA LIGNE DE HORS-JEU. Sans elle, les défenseurs étaient déjà sur le 9 à
  // la sortie du ruck et chaque temps de jeu finissait au sol.
  e.gardeRuck = e.ballonLent ? 0.25 : 0.55;
  e.ruck = null;
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
    // Quand le ballon porté s'arrête, la défense peut l'écrouler au lieu de
    // subir une nouvelle phase. La faute reste rare, mais donne enfin au maul
    // une autre issue visible que « ruck » ou « essai ».
    if (e.rng() < 0.07) return siffler(e, cote, e.ballon, 'maul écroulé');
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
  e.ballonLibre = null;
  e.ruck = null;
  e.aplatissage = null;
  e.lancement = null;
  e.conquete = null;
  // ⚠️ ET LE HORS-JEU DU PIED S’EFFACE. Une phase arrêtée remet tout le monde
  //    en jeu : garder le drapeau ferait chasser un joueur au ralenti trois
  //    phases après le coup de pied qui l’avait mis hors-jeu.
  libererHorsJeu(e);
  // Le jeu s'arrête : ce qui a été passé avant n'amènera plus d'essai.
  e.dernierPasseur = null;
  e.phasesDepuisArret = 0;
  e.metresGagnesPhase = 0;
  e.perceeSignalee = false;
  e.ballon = { x: borner(lieu.x, LIGNE_A + 1, LIGNE_B - 1), y: lieu.y };
  e.phase = quoi;
  e.minuteur = dureeArret(e, quoi);
  e.ouvert = choisirCoteOuvert(e);

  if (quoi === 'touche') {
    e.ballon.y = e.ballon.y < AXE ? 0.6 : LARGEUR - 0.6;
    e.ballon.x = borner(e.ballon.x, LIGNE_A + 5, LIGNE_B - 5);
    const nb = e.rng() < 0.32 ? 4 : e.rng() < 0.6 ? 5 : 7;
    installerPlacement(e, placementTouche(e.pions, e.ballon, pour, nb), 34);
    const alignes = surLeTerrain(e, pour)
      .filter((p) => p.role === 'alignement')
      .sort((a, b) => Math.abs(a.cible.y - e.ballon.y) - Math.abs(b.cible.y - e.ballon.y));
    const combinaisons = ['premierBloc', 'milieu', 'fond', 'leurreDevant'] as const;
    const combinaison = combinaisons[Math.abs(Math.round(e.t / DT) + Math.round(e.ballon.x)) % combinaisons.length];
    const indexCible = combinaison === 'premierBloc' ? 0
      : combinaison === 'fond' ? alignes.length - 1
        : combinaison === 'leurreDevant' ? Math.min(alignes.length - 1, Math.max(1, Math.floor(alignes.length * 0.68)))
          : Math.floor(alignes.length / 2);
    e.conquete = {
      type: 'touche', progression: 0, combinaison,
      cibleId: alignes[Math.max(0, indexCible)]?.id,
    };
    e.compteurs.touches += 1;
  } else if (quoi === 'melee') {
    e.ballon.y = borner(e.ballon.y, 12, LARGEUR - 12);
    e.ballon.x = borner(e.ballon.x, LIGNE_A + 6, LIGNE_B - 6);
    installerPlacement(e, placementMelee(e.pions, e.ballon, pour), 22);
    e.conquete = { type: 'melee', progression: 0, pousseVers: pour };
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
  e.conquete = null;
  const cote = e.possession;
  const mien = surLeTerrain(e, cote).filter((p) => p.avant);
  const adv = surLeTerrain(e, adverse(cote)).filter((p) => p.avant);
  const oppose = adverse(cote);
  const dom = scoreMelee(e, mien, cote) - scoreMelee(e, adv, oppose);
  const duel = dom + (e.rng() - 0.5) * 18;
  const gagnant = duel >= 0 ? cote : oppose;
  const packGagnant = gagnant === cote ? mien : adv;

  // Une grosse domination peut produire une pénalité des deux côtés. Elle
  // dépend du rapport de force, de la technique de la première ligne et de la
  // discipline, pas d'un tirage plat.
  const disciplinePerdant = moyenne(gagnant === cote ? adv : mien, (p) => p.discipline);
  const chancePenalite = borner((Math.abs(duel) - 5) / 105 + (58 - disciplinePerdant) / 700, 0.015, 0.24);
  if (Math.abs(duel) > 6 && e.rng() < chancePenalite) {
    dire(e, 'melee', gagnant, C.phrase(e.rng, C.MELEE_DOMINEE, { club: nomClub(e, gagnant) }));
    e.placement = null;
    return siffler(e, gagnant, e.ballon, e.rng() < 0.5 ? 'liaison perdue en mêlée' : 'mêlée écroulée');
  }

  if (Math.abs(duel) < 3.2 && e.rng() < 0.16) {
    dire(e, 'melee', cote, 'La mêlée tourne, le demi de mêlée doit sortir un ballon difficile.');
    e.ballonLent = true;
  } else if (duel < -7 && e.rng() < borner(0.20 + Math.abs(duel) / 90, 0.20, 0.48)) {
    e.possession = oppose;
    dire(e, 'melee', oppose, `Ballon talonné contre l’introduction : ${nomClub(e, oppose)} renverse la mêlée.`);
    pousserElan(e, oppose, POUSSEES.turnover);
    e.ballonLent = Math.abs(duel) < 13;
  } else if (duel > 8) {
    dire(e, 'melee', cote, `Pack dominant : ${nomClub(e, cote)} avance avant de libérer.`);
    e.ballonLent = false;
  } else {
    dire(e, 'melee', cote, C.phrase(e.rng, C.MELEE_GAGNEE, { club: nomClub(e, cote) }));
    e.ballonLent = duel < -2;
  }
  // ⚠️ LA MÊLÉE GAGNÉE EST CRÉDITÉE AUX HUIT, pas au numéro 8. Une mêlée se
  // gagne à huit ou ne se gagne pas : la porter au seul joueur qui ramasse le
  // ballon donnerait un classement de « mêlées » composé uniquement de numéros
  // 8. C'est aussi ce qui permet à un pilier d'exister dans les statistiques.
  for (const p of packGagnant) p.stats.melees += 1;
  e.placement = null;
  e.gardeRuck = 0.4;
  // Départ du 8 quand la mêlée avance.
  const huit = surLeTerrain(e, e.possession).find((p) => p.numero === 8);
  if (huit && e.possession === cote && duel > 5 && e.rng() < 0.32) {
    e.lancement = {
      type: 'pickAndGo', chaine: [huit], index: 0, libelle: 'départ du 8',
    };
    return donnerBallon(e, huit, 0.3);
  }
  reprendreJeu(e, e.ballon, undefined, 5);
}

function moyenne(liste: Pion[], valeur: (p: Pion) => number): number {
  return liste.length ? liste.reduce((n, p) => n + valeur(p), 0) / liste.length : 50;
}

function scoreMelee(e: EtatMatch, pack: Pion[], cote: Cote): number {
  const premiereLigne = pack.filter((p) => p.numero <= 3);
  const technique = moyenne(premiereLigne, (p) =>
    (p.puissance * 0.48 + p.plaquage * 0.18 + p.discipline * 0.17 + p.vision * 0.17)
    * (0.72 + p.endurance / 360));
  const poussee = moyenne(pack, (p) => (p.puissance * 0.72 + p.plaquage * 0.12 + p.endurance * 0.16));
  return technique * 0.62 + poussee * 0.32 + (e.cohesion?.[cote] ?? 50) * 0.06;
}

function phaseTouche(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const cote = e.possession;
  const liste = surLeTerrain(e, cote);
  const avants = liste.filter((p) => p.avant);
  const lanceur = liste.find((p) => p.numero === 2) ?? avants[0];
  // La combinaison annoncée n'est pas décorative : le lanceur cherche bien le
  // joueur mis en évidence pendant l'alignement. En l'absence de cible valide,
  // on revient au meilleur sauteur comme auparavant.
  const cibleAnnoncee = e.conquete?.cibleId;
  const sauteur = avants.find((p) => p.id === cibleAnnoncee)
    ?? [...avants].sort((a, b) => b.detente - a.detente)[0] ?? liste[0];
  if (!sauteur) return clorePeriode(e);
  const combinaison = e.conquete?.combinaison;
  e.conquete = null;
  const adv = surLeTerrain(e, adverse(cote));
  const contreurs = adv.filter((p) => p.avant);
  const contre = [...contreurs].sort((a, b) =>
    (b.detente * 0.62 + b.vision * 0.38 - distance(b.pos, sauteur.pos) * 1.8)
    - (a.detente * 0.62 + a.vision * 0.38 - distance(a.pos, sauteur.pos) * 1.8))[0] ?? adv[0];
  const lifteurs = avants.filter((p) => p !== sauteur && p !== lanceur)
    .sort((a, b) => distance2(a.pos, sauteur.pos) - distance2(b.pos, sauteur.pos)).slice(0, 2);
  const fraicheur = (p: Pion) => 0.74 + p.endurance / 385;
  const scoreLance = lanceur
    ? (lanceur.passe * 0.55 + lanceur.vision * 0.30 + lanceur.discipline * 0.15) * fraicheur(lanceur)
    : 45;
  const scoreLevage = moyenne(lifteurs, (p) => (p.puissance * 0.58 + p.detente * 0.24 + p.vision * 0.18) * fraicheur(p));
  const scoreAttaque = scoreLance * 0.38 + sauteur.detente * fraicheur(sauteur) * 0.34
    + scoreLevage * 0.20 + (e.cohesion?.[cote] ?? 50) * 0.08
    + (combinaison === 'leurreDevant' ? 2.5 : 0);
  const scoreDefense = contre
    ? (contre.detente * 0.50 + contre.vision * 0.30 + contre.puissance * 0.12
      + (e.cohesion?.[contre.cote] ?? 50) * 0.08) * fraicheur(contre)
    : 45;
  const qualiteLancer = scoreLance + (e.cohesion?.[cote] ?? 50) * 0.08;
  const tirageLancer = e.rng();
  const pasDroit = borner(0.048 - (qualiteLancer - 55) / 950, 0.010, 0.075);
  const mauvaiseLongueur = borner(0.065 - (qualiteLancer - 55) / 800, 0.018, 0.105);

  if (tirageLancer < pasDroit) {
    dire(e, 'touche', adverse(cote), `${lanceur?.nom ?? 'Le lanceur'} n’est pas droit : mêlée pour ${nomClub(e, adverse(cote))}.`);
    return arret(e, 'melee', adverse(cote), e.ballon);
  }
  if (tirageLancer < pasDroit + mauvaiseLongueur) {
    const court = e.rng() < 0.5;
    dire(e, 'touche', null, court ? 'Lancer trop court : le ballon ricoche au premier bloc.' : 'Lancer trop long : le ballon dépasse le sauteur annoncé.');
    e.placement = null;
    e.ballon = {
      x: sauteur.pos.x + (e.rng() - 0.5) * 1.5,
      y: borner(sauteur.pos.y + (court ? -1 : 1) * (1.5 + e.rng() * 2), 1, LARGEUR - 1),
    };
    const fauxVol: Vol = {
      de: { ...e.ballon }, vers: { x: e.ballon.x + sens(cote) * 2.5, y: e.ballon.y + 0.4 },
      duree: 0.4, ecoule: 0.4, hauteur: 0.45, type: 'pied', intention: 'renvoi',
      auteur: lanceur ?? sauteur, receveur: null,
    };
    return demarrerBallonLibre(e, fauxVol, 'touche');
  }

  const duel = scoreAttaque - scoreDefense + (e.rng() - 0.5) * 22;
  if (duel < -5.5 && contre) {
    dire(e, 'touche', adverse(cote), C.phrase(e.rng, C.TOUCHE_PERDUE, {
      club: nomClub(e, adverse(cote)), nom: contre?.nom ?? '',
    }), 0, contre?.moi);
    e.possession = adverse(cote);
    e.placement = null;
    return reprendreJeu(e, e.ballon);
  }

  if (duel < 2 && contre && e.rng() < 0.38) {
    dire(e, 'touche', null, `${contre.nom} dévie le lancer : ballon libre dans le couloir.`);
    e.placement = null;
    e.ballon = { x: (sauteur.pos.x + contre.pos.x) / 2, y: (sauteur.pos.y + contre.pos.y) / 2 };
    const fauxVol: Vol = {
      de: { ...e.ballon }, vers: { x: e.ballon.x + sens(cote) * 3, y: e.ballon.y + (e.rng() - 0.5) * 2 },
      duree: 0.35, ecoule: 0.35, hauteur: 0.55, type: 'pied', intention: 'renvoi',
      auteur: lanceur ?? sauteur, receveur: null,
    };
    return demarrerBallonLibre(e, fauxVol, 'touche');
  }

  dire(e, 'touche', cote, C.phrase(e.rng, C.TOUCHE_GAGNEE, { club: nomClub(e, cote), nom: sauteur.nom }), 0, sauteur.moi);
  // La touche, elle, se crédite au SAUTEUR : c'est lui qui capte, et c'est la
  // statistique officielle (« lineouts won »). Deuxièmes lignes en tête, comme
  // dans la réalité — `detente` les y met.
  sauteur.stats.touchesGagnees += 1;
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
  poserSifflet(e, 'ml.sifflet.penalite', pour, fautif);
  // ⚠️ `pour` EST LE CAMP QUI OBTIENT LA PÉNALITÉ : c’est l’AUTRE qui perd sa
  // dynamique. Le sens du signe est le genre de détail qu’on inverse une fois
  // sur deux, et la jauge se mettrait alors à récompenser l’indiscipline.
  pousserElan(e, adverse(pour), POUSSEES.penalite);

  // ⚠️ UNE PÉNALITÉ A TOUJOURS UN FAUTIF. Trois appels sur quatre n'en
  // désignaient aucun — dont celui du ruck, de loin le plus fréquent : le
  // carton n'était donc tiré que sur une poignée de fautes, et le moteur
  // produisait 0,25 carton par match au lieu des 1,3 annoncés. Un classement
  // des cartons vide, et une discipline qui ne coûtait jamais rien.
  // À défaut de coupable nommé, c'est le joueur de l'équipe sanctionnée le plus
  // proche du ballon : au rugby, c'est presque toujours lui.
  const coupable = fautif ?? (() => {
    const camp = surLeTerrain(e, adverse(pour)).filter((p) => p.sanction <= 0);
    if (!camp.length) return undefined;
    return camp.reduce((a, b) => (distance2(b.pos, lieu) < distance2(a.pos, lieu) ? b : a));
  })();

  // Carton jaune : rare (≈ 1,3 par match), plus probable près de sa ligne.
  // ⚠️ ET PLUS FRÉQUENT EN AMATEUR (demande explicite : « cartons plus souvent
  // en amateur »). Un arbitre seul, sans vidéo ni juges de touche, coupe court :
  // il sort la carte plutôt que de gérer. En professionnel, on siffle, on parle
  // au capitaine, et la sanction lourde arrive après le match (voir
  // `bagarre.ts` → `sanctionApresMatch`).
  const pres = metresAvantLaLigne(lieu, pour) < 22;
  const severite = e.niveau === 'amateur' ? 1.7 : 1;
  if (coupable && e.rng() < (pres ? 0.16 : 0.05) * severite) {
    const fautif = coupable;
    // ⚠️ LE CARTON ROUGE EXISTE ENFIN. Le moteur n'en donnait aucun : la
    // discipline se résumait à un compteur de jaunes, et un joueur ne risquait
    // jamais rien de grave. Un jaune sur quatorze devient rouge, soit ~0,09 par
    // match — l'ordre de grandeur du rugby professionnel. Un rouge, c'est le
    // match terminé : `sanction` couvre les 80 minutes et le joueur ne revient
    // pas (la relève est gérée par les remplacements, comme dans la réalité).
    const rouge = e.rng() < 0.07;
    fautif.surLeTerrain = false;
    fautif.sanction = rouge ? 99_999 : 600; // dix minutes, ou le reste du match
    if (rouge) fautif.stats.cartonsRouges += 1; else fautif.stats.cartonsJaunes += 1;
    // ⚠️ LE CARTON DU JOUEUR INCARNÉ SUIT JUSQU'À LA CARRIÈRE. Il était jusqu'ici
    // une simple ligne de statistique : un rouge coûtait dix minutes de jeu et
    // rien d'autre. C'est lui qui déclenche maintenant la commission de
    // discipline après le match (`sanctionApresMatch`).
    if (fautif.moi) {
      if (rouge) e.discipline.rouges += 1; else e.discipline.jaunes += 1;
      e.discipline.motif = motif;
    }
    if (rouge) chauffer(e, 12);
    dire(e, 'carton', fautif.cote, rouge
      ? C.texteMatch('cartonRouge', { nom: fautif.nom, motif, club: nomClub(e, fautif.cote) })
      : C.phrase(e.rng, C.CARTON, {
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

/** Même calcul pour la décision affichée et le tir réellement joué. */
export function probabilitePenalite(e: EtatMatch, buteur: Pion, distance: number, angle: number): number {
  const pression = e.minute >= 65 && Math.abs(e.scoreA - e.scoreB) <= 7 ? 0.06 : 0;
  const meteo = e.meteoTir === 'pluie' ? 0.08 : e.meteoTir === 'vent' ? 0.13 : 0;
  return borner(probaTir(distance, angle, buteur.pied)
    - (100 - buteur.endurance) * 0.0018 - meteo - pression
    + (buteur.pied - 60) / 350, 0.04, 0.97);
}

/**
 * La pénalité en cours, telle qu'on la POSE À UN ENTRAÎNEUR : d'où, pour qui,
 * avec quel buteur et quelles chances. ⚠️ La distance et l'angle sont calculés
 * ICI, avec les mêmes lignes que `phasePenalite` — un écran qui referait le
 * calcul de son côté annoncerait « 42 m, 71 % » sur un tir que le moteur joue
 * à 38 m. C'est le genre d'écart qu'on ne voit jamais et qui rend une décision
 * incompréhensible.
 */
export interface PenaliteEnCours {
  cote: Cote; distance: number; angle: number; probabilite: number;
  buteur: string; buteurId: string; aPortee: boolean;
}
export function infoPenalite(e: EtatMatch): PenaliteEnCours | null {
  if (e.fini || e.phase !== 'penalite' || !e.penalite) return null;
  const cote = e.penalite.pour;
  const liste = surLeTerrain(e, cote);
  if (!liste.length) return null;
  const buteur = liste.find((p) => p.buteur) ?? [...liste].sort((a, b) => b.pied - a.pied)[0];
  const distance = Math.max(0, metresAvantLaLigne(e.penalite.lieu, cote));
  const angle = Math.abs(e.penalite.lieu.y - AXE);
  return {
    cote, distance: Math.round(distance), angle: Math.round(angle),
    probabilite: probabilitePenalite(e, buteur, distance, angle),
    buteur: buteur.nom, buteurId: buteur.sourceId, aPortee: distance < 52 && angle < 30,
  };
}

/** Le coach choisit ; les phases habituelles du moteur exécutent sa décision. */
export function choisirPenalite(e: EtatMatch, cote: Cote, choix: NonNullable<EtatMatch['choixPenalite']>): boolean {
  if (e.fini || e.phase !== 'penalite' || e.penalite?.pour !== cote) return false;
  e.choixPenalite = choix;
  e.minuteur = 0;
  phasePenalite(e);
  return true;
}

function phasePenalite(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const info = e.penalite;
  e.penalite = null;
  const choix = e.choixPenalite;
  delete e.choixPenalite;
  if (!info) return reprendreJeu(e, e.ballon);
  const cote = info.pour;
  const plan = planDe(e, cote);
  const liste = surLeTerrain(e, cote);
  if (!liste.length) return clorePeriode(e);
  const buteurDesigne = liste.find((p) => p.buteur);
  const buteur = buteurDesigne ?? [...liste].sort((a, b) => b.pied - a.pied)[0];

  const dist = Math.max(0, metresAvantLaLigne(info.lieu, cote));
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
  // ⚠️ Moins de coups de pied de sortie = plus de temps de jeu, donc plus de
  // pénalités à portée : à 11 % de tentatives « hors plan », le pourcentage de
  // réussite au pied du match tombait sous les 68 %. 7 % le remet à ~72 %.
  const ordrePenalite = e.tactiques[cote]?.penalites ?? 'mixte';
  const chanceTir = ordrePenalite === 'points'
    ? (plan.penalites > 0 ? 0.995 : 0.16)
    : ordrePenalite === 'touche'
      ? (plan.penalites > 0 ? 0.28 : 0.015)
      : (plan.penalites > 0 ? 0.93 : 0.07);
  const veutTirer = choix ? choix === 'points' : aPortee && !besoinEssai && e.rng() < chanceTir;

  if (veutTirer) {
    e.tir = {
      buteur, distance: dist, angle: ecartAxe, valeur: 3,
      suite: 'coupEnvoi', lieu: { ...info.lieu },
    };
    e.phase = 'tirAuBut';
    e.minuteur = dureeArret(e, 'tirAuBut');
    e.ballon = { ...info.lieu };
    e.placement = placementTir(e.pions, info.lieu, cote, buteur.id);
    return;
  }

  const s = sens(cote);
  if (choix === 'melee') {
    arret(e, 'melee', cote, info.lieu);
    return;
  }
  const chanceTouche = ordrePenalite === 'touche' ? 0.97 : ordrePenalite === 'points' ? 0.42 : 0.72;
  if (choix === 'touche' || (!choix && metresAvantLaLigne(info.lieu, cote) > 8 && e.rng() < chanceTouche)) {
    // Pénaltouche : on gagne le terrain ET on garde le ballon.
    const gain = borner(28 + buteur.pied / 3, 20, 48);
    const arrivee = {
      x: borner(info.lieu.x + s * gain, LIGNE_A + 5, LIGNE_B - 5),
      y: info.lieu.y < AXE ? -1 : LARGEUR + 1,
    };
    buteur.stats.coupsDePied += 1;
    e.placement = null;
    lancerVol(e, buteur, arrivee, 'penaltouche', 2.4, 0.4, info.lieu);
    dire(e, 'pied', cote, C.texteMatch('penaltouche', {
      nom: buteur.nom, distance: Math.round(metresAvantLaLigne(arrivee, cote)),
    }), 0, buteur.moi);
    return;
  }
  // Jeu rapide à la main.
  e.placement = null;
  e.gardeRuck = 0.7;
  dire(e, 'jeu', cote, C.texteMatch('penaliteRapide', { club: nomClub(e, cote) }));
  reprendreJeu(e, info.lieu);
}

type TirEnCours = NonNullable<EtatMatch['tir']>;

/** Lance un vrai ballon vers les poteaux, réussi ou légèrement à côté. */
function lancerTrajectoireTir(e: EtatMatch, tir: TirEnCours, reussi: boolean): void {
  const { buteur } = tir;
  const s = sens(buteur.cote);
  const ligne = buteur.cote === 'A' ? LIGNE_B : LIGNE_A;
  const coteRate = e.rng() < 0.5 ? -1 : 1;
  const decalage = reussi
    ? (e.rng() - 0.5) * 3.6
    : coteRate * (4.2 + e.rng() * 5.5);
  const de = tir.lieu ?? { ...e.ballon };
  const distance = Math.hypot(ligne + s * 4 - de.x, AXE + decalage - de.y);
  const duree = borner(1.25 + distance / 42, 1.45, 2.35);
  tir.reussi = reussi;
  tir.volLance = true;
  buteur.stats.coupsDePied += 1;
  poserVol(e, {
    de: { ...de }, vers: { x: ligne + s * 4, y: AXE + decalage },
    duree, ecoule: 0, hauteur: borner(4.8 + distance * 0.09, 5.5, 9),
    type: 'pied', intention: 'drop', auteur: buteur, receveur: null,
  });
  e.porteur = null;
  e.minuteur = duree;
}

function phaseTirAuBut(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const tir = e.tir;
  if (!tir) return preparerCoupEnvoi(e, e.possession);
  const { buteur, distance: d, angle } = tir;
  const cote = buteur.cote;
  const plan = planDe(e, cote);
  if (!tir.volLance) {
    buteur.stats.butsTentes += 1;
    const reussi = e.scoreSurTerrain
      ? e.rng() < probabilitePenalite(e, buteur, d, angle)
      : plan.penalites > 0 && e.rng() < Math.max(0.85, probaTir(d, angle, buteur.pied));
    lancerTrajectoireTir(e, tir, reussi);
    return;
  }
  if (e.vol && e.vol.ecoule < e.vol.duree) return;

  const reussi = !!tir.reussi;
  e.vol = null;
  e.tir = null;
  e.placement = null;
  if (reussi) {
    plan.penalites = Math.max(0, plan.penalites - 1);
    buteur.stats.butsReussis += 1;
    marquer(e, cote, 3);
    buteur.stats.pointsAuPied = (buteur.stats.pointsAuPied ?? 0) + 3;
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

function phaseTransformation(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const tir = e.tir;
  if (!tir) return preparerCoupEnvoi(e, adverse(e.possession));
  const cote = tir.buteur.cote;
  if (!tir.volLance) {
    lancerTrajectoireTir(e, tir, !!tir.reussi);
    return;
  }
  if (e.vol && e.vol.ecoule < e.vol.duree) return;

  e.vol = null;
  e.tir = null;
  e.placement = null;
  const plan = planDe(e, cote);
  if (tir.reussi) {
    plan.essaisTransformes = Math.max(0, plan.essaisTransformes - 1);
    tir.buteur.stats.butsReussis += 1;
    marquer(e, cote, 2);
    tir.buteur.stats.pointsAuPied = (tir.buteur.stats.pointsAuPied ?? 0) + 2;
    dire(e, 'but', cote, C.phrase(e.rng, C.TRANSFORMATION, { nom: tir.buteur.nom }), 2, tir.buteur.moi);
  } else {
    plan.essaisSecs = Math.max(0, plan.essaisSecs - 1);
    dire(e, 'butRate', cote, C.phrase(e.rng, C.TRANSFORMATION_RATEE, { nom: tir.buteur.nom }), 0, tir.buteur.moi);
  }
  if (e.sirene) return clorePeriode(e);
  preparerCoupEnvoi(e, adverse(cote));
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
      C.texteMatch('tenuEnBut', { nom: marqueur.nom, club: nomClub(e, adverse(cote)) }),
      0, marqueur.moi);
    return arret(e, 'renvoi22', adverse(cote), {
      x: adverse(cote) === 'A' ? M22_A : M22_B, y: AXE,
    });
  }

  // Franchir la ligne ne suffit pas : le joueur contrôle puis pose le ballon.
  // Ce bref état garde porteur et ballon ensemble et rend enfin l'essai visible
  // avant que l'écran bascule sur la transformation.
  if (!e.aplatissage) {
    const lieu = {
      x: cote === 'A' ? Math.max(marqueur.pos.x, LIGNE_B + 0.55) : Math.min(marqueur.pos.x, LIGNE_A - 0.55),
      y: borner(marqueur.pos.y, 1.5, LARGEUR - 1.5),
    };
    marqueur.pos = { ...lieu };
    marqueur.cible = { ...lieu };
    stopper(marqueur);
    e.ballon = { ...lieu };
    e.porteur = marqueur;
    e.vol = null;
    e.ballonLibre = null;
    e.lancement = null;
    e.aplatissage = { marqueur, origine, lieu };
    e.phase = 'aplatissage';
    e.minuteur = 1.35;
    return;
  }
  e.aplatissage = null;

  marqueur.stats.essais += 1;
  // ⚠️ LA PASSE DÉCISIVE — et le garde-fou qui va avec : on ne se crédite pas
  // soi-même. Un joueur qui passe, récupère son propre coup de pied et aplatit
  // n'a pas fait de passe décisive ; sans ce test, il en aurait une.
  if (e.dernierPasseur && e.dernierPasseur !== marqueur && e.dernierPasseur.cote === cote) {
    e.dernierPasseur.stats.passesDecisives += 1;
    // ⚠️ ON LE DIT TOUT DE SUITE. La statistique existait déjà, mais elle
    // n’apparaissait qu’à la feuille de match, une heure plus tard : le geste
    // et sa récompense étaient séparés par tout un match. C’est exactement ce
    // qui donne le sentiment que « nos actions n’ont aucun impact ».
    if (e.dernierPasseur.moi) {
      e.echos.push({ cle: 'ml.echo.passeDecisive', nom: e.dernierPasseur.nom, cible: marqueur.nom });
    }
  }
  e.dernierPasseur = null;
  // ⚠️ LE BALLON VOLÉ QUI AMÈNE L’ESSAI QUARANTE SECONDES PLUS TARD : personne
  // ne fait le lien, le fil a défilé et la carte est refermée depuis
  // longtemps. C’est ce chaînon qui permet de revenir dessus.
  const vol = e.dernierTurnover;
  if (vol && vol.pion.moi && vol.pion.cote === cote && e.t - vol.t < 40) {
    e.echos.push({ cle: 'ml.echo.turnoverEssai', nom: vol.pion.nom, cible: marqueur.nom });
    e.dernierTurnover = null;
  }
  pousserElan(e, cote, POUSSEES.essai);
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
  const buteur = liste.find((p) => p.buteur) ?? [...liste].sort((a, b) => b.pied - a.pied)[0] ?? marqueur;
  const ecartAxe = Math.abs(marqueur.pos.y - AXE);
  const chance = probaTir(22 + ecartAxe * 0.55, ecartAxe, buteur.pied);

  let transforme: boolean;
  if (plan.essaisTransformes > 0 && plan.essaisSecs > 0) transforme = e.rng() < chance;
  else transforme = plan.essaisTransformes > 0;

  // Le marqueur n'est plus le porteur : sinon la boucle de déplacement le
  // saute indéfiniment et il reste figé dans l'en-but après son essai.
  stopper(marqueur);
  e.porteur = null;
  e.vol = null;
  e.ballonLibre = null;
  e.ruck = null;
  e.aplatissage = null;

  const lieu = {
    x: (cote === 'A' ? LIGNE_B : LIGNE_A) - sens(cote) * 22,
    y: borner(marqueur.pos.y, 2.5, LARGEUR - 2.5),
  };
  e.ballon = { ...lieu };
  buteur.stats.butsTentes += 1;
  e.tir = {
    buteur, distance: 22 + ecartAxe * 0.55, angle: ecartAxe,
    valeur: 2, suite: 'coupEnvoi', lieu, reussi: transforme,
  };
  e.phase = 'transformation';
  e.minuteur = dureeArret(e, 'transformation');
  e.possession = cote;
  e.placement = placementTir(e.pions, lieu, cote, buteur.id);
}

function phaseAplatissage(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  const action = e.aplatissage;
  if (!action) return arret(e, 'renvoi22', adverse(e.possession), {
    x: adverse(e.possession) === 'A' ? M22_A : M22_B, y: AXE,
  });
  tenterEssai(e, action.marqueur, action.origine);
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

  // Le ballon est joué : le hors-jeu du coup de pied précédent est éteint.
  libererHorsJeu(e);
  const cote = e.possession;
  const liste = surLeTerrain(e, cote);
  if (!liste.length) return clorePeriode(e);

  e.ouvert = choisirCoteOuvert(e);
  e.systeme = choisirSysteme(e, adverse(cote));
  e.phase = 'jeuCourant';
  e.conquete = null;
  e.ballonLibre = null;
  e.ruck = null;
  e.placement = null;
  // ⚠️ NE PAS forcer ici un recalcul immédiat du placement (`e.compteur = 0`).
  // Testé : la défense se remettait aussitôt sur sa ligne théorique — lue sur le
  // 4ᵉ défenseur, donc parfois trente mètres en arrière après un coup de pied —
  // au lieu de rester au contact une demi-seconde de plus. Mesuré : percées
  // 20 → 29 par match (cible ≤ 25), plaquages manqués 19 → 11, coups de pied
  // 51 → 61. L'étalonnage du moteur tient à ce demi-temps de retard.
  e.perceeSignalee = false;
  e.cibleRenvoi = null; // le ballon est vivant : plus de coup d'envoi en attente
  e.ligneAvantage = lieu.x;
  e.origine = { x: lieu.x, y: lieu.y };
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
  reclamerLeBallon(e, lancement, cote);
  e.lancement = lancement;

  e.ballon = { x: lieu.x, y: lieu.y };
  donnerBallon(e, premier, 0.3);
}

/**
 * 🙋 « DONNE-LA-MOI. » Quand le joueur a réclamé le ballon, on l'INSÈRE dans la
 * chaîne de passes de la combinaison qui démarre.
 *
 * ⚠️ ON L'INSÈRE, ON NE LE MET PAS EN TÊTE. Le mettre premier ferait servir la
 * mêlée par un ailier ; le mettre dernier ne changerait rien s'il n'y a que
 * deux maillons. Il prend donc la place juste après le lanceur — c'est-à-dire
 * exactement ce qu'un joueur obtient en appelant fort : le ballon au deuxième
 * temps, pas la relance.
 *
 * ⚠️ ET ÇA NE MARCHE PAS À TOUS LES COUPS. Un demi de mêlée n'écoute pas
 * l'ailier qui hurle à trente mètres : il faut être à portée de la combinaison.
 */
function reclamerLeBallon(e: EtatMatch, lancement: Lancement, cote: Cote): void {
  if (!intentionEst(e, 'appel')) return;
  const p = e.pions.find((q) => q.moi);
  if (!p || !p.surLeTerrain || p.sanction > 0 || p.cote !== cote) return;
  if (lancement.chaine.includes(p)) return;
  // ⚠️ ON DOIT ÊTRE À PORTÉE, ET LE 9 N'ÉCOUTE PAS TOUJOURS. Mesuré sans ces
  // deux garde-fous : un joueur qui réclamait dès qu'il le pouvait finissait à
  // SOIXANTE ballons portés — un troisième ligne en porte douze. Vingt-cinq
  // mètres, une fois sur deux : on obtient une vraie influence sur le jeu, pas
  // une confiscation du ballon.
  if (distance2(p.pos, e.ballon) > 25 * 25) return;
  consommerIntention(e);
  if (e.rng() < 0.45) return;
  lancement.chaine.splice(Math.min(1, lancement.chaine.length), 0, p);
  dire(e, 'jeu', cote, C.texteMatch('appelBallon', { nom: p.nom }), 0, true);
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
  const tactique = e.tactiques[cote];
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
  // ⚠️ MOINS DE JEU AU PIED (retour de jeu : « un peu trop de coups de pied »).
  // On dégageait de ses 22 trois fois sur quatre : à ce rythme, la sortie de
  // camp devenait un réflexe et le match comptait près de 60 coups de pied.
  // 58 % laisse le jeu d'occupation lisible tout en autorisant les relances.
  if (chezSoi && pousse < 0.32 && !(diff < 0 && restantes < 8)) {
    const botteur = (dix && dix.pied > 55 ? dix : neuf) ?? liste[0];
    const chanceDegagement = tactique?.attaque === 'occupation' ? 0.88
      : tactique?.attaque === 'large' ? 0.42 : tactique?.attaque === 'avants' ? 0.5 : 0.60;
    if (r < chanceDegagement) {
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
    if (botteur && botteur.pied > 65 && phases >= 1
      && arriereGardeMontee(e, adverse(cote)) && r < 0.014) {
      return {
        type: 'pied', chaine: [neuf, botteur].filter(Boolean) as Pion[], index: 0,
        intention: 'cinquanteVingtDeux', botteur, libelle: '50/22',
      };
    }
    // Occupation depuis son camp : une phase sur huit, plus une sur cinq.
    const occupation = tactique?.attaque === 'occupation' ? 0.29
      : tactique?.attaque === 'large' ? 0.07 : 0.13;
    if (phases >= 2 && r < occupation - pousse * 0.08) {
      return {
        type: 'pied', chaine: [neuf, botteur].filter(Boolean) as Pion[], index: 0,
        intention: e.ballonLent ? 'chandelle' : 'occupation', botteur,
        libelle: 'occupation au pied',
      };
    }
  }

  // ── 3. DANS LES 22 ADVERSES : on pilonne, ou on écarte s'il y a de la place
  if (distLigne < 22) {
    const chanceLarge = tactique?.attaque === 'large' ? 0.82
      : tactique?.attaque === 'avants' ? 0.28 : 0.55;
    if (surnombre >= 1 && r < chanceLarge) {
      return { type: 'large', chaine: chaineLarge, index: 0, libelle: 'écarter au large' };
    }
    const chanceRas = tactique?.attaque === 'avants' ? 0.78
      : tactique?.attaque === 'large' ? 0.34 : 0.55;
    if (distLigne < 8 && r < chanceRas) {
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
  const biaisAttaque = tactique?.attaque === 'large' ? 0.18
    : tactique?.attaque === 'avants' ? -0.18
      : tactique?.attaque === 'occupation' ? -0.05 : 0;
  const envie = r + pousse * 0.3 + biaisAttaque;

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
    // ⚠️ UN TEMPS AU RAS NE PASSE PAS TOUJOURS PAR LE 9 : une fois sur trois,
    // l'avant ramasse lui-même au pied du ruck (« pick and go »). Sans ça le
    // demi de mêlée touchait 80 ballons et faisait 80 passes par match, là où
    // les avants n'en faisaient aucune.
    const pick = e.rng() < 0.34;
    return {
      type: pick ? 'pickAndGo' : 'ras',
      chaine: relais(e, pick ? [percuteur] : [neuf, percuteur], liste),
      index: 0, libelle: pick ? 'le ballon repart au ras' : 'percussion au ras',
    };
  }
  if (envie < 0.72) {
    return {
      type: 'pod', chaine: relais(e, [neuf, dix, percuteur], liste), index: 0,
      libelle: 'bloc d’avants',
    };
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

// LA PASSE AU RAS ENTRE AVANTS (« tip-on »). Deux fois sur cinq, le porteur du
// bloc redonne à l'avant qui suit au lieu de rentrer seul dans la défense.
// C'est ce qui donne aux avants leurs deux passes par match — sans ça, un
// pilier finissait la saison à zéro passe.
function relais(e: EtatMatch, chaine: (Pion | undefined)[], liste: Pion[]): Pion[] {
  const base = chaine.filter(Boolean) as Pion[];
  const dernier = base[base.length - 1];
  if (!dernier || !dernier.avant || e.rng() > 0.55) return base;
  const suivant = liste
    .filter((p) => p.avant && p !== dernier && !base.includes(p) && p.role !== 'ruck')
    .sort((a, b) => distance2(a.pos, dernier.pos) - distance2(b.pos, dernier.pos))[0];
  return suivant ? [...base, suivant] : base;
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

/**
 * Le coup de pied que le joueur veut taper, déduit de l'endroit où il est.
 *
 * ⚠️ ON NE LUI DEMANDE PAS DE CHOISIR ENTRE SEPT COUPS DE PIED. Un menu de
 * sept boutons sur un téléphone, en plein match, personne ne le lit : le
 * rugbyman qui tape depuis ses 22 dégage, celui qui est à vingt mètres de la
 * ligne tente le rasant. On lit donc le terrain à sa place, comme le fait déjà
 * `choisirLancement` pour l'équipe.
 */
function intentionDePied(e: EtatMatch, p: Pion): IntentionPied {
  const restant = metresAvantLaLigne(p.pos, p.cote);
  if (dansSes22(p.pos, p.cote)) return 'degagement';
  if (restant < 28) return p.pied > 60 && e.rng() < 0.35 ? 'transversale' : 'rasant';
  if (dansSonCamp(p.pos, p.cote)) {
    return p.pied > 62 && arriereGardeMontee(e, adverse(p.cote))
      ? 'cinquanteVingtDeux' : 'occupation';
  }
  return p.numero === 9 ? 'chandelle' : 'occupation';
}

function taperAuPied(e: EtatMatch, p: Pion, intention: IntentionPied): void {
  const s = sens(p.cote);
  p.stats.coupsDePied += 1;
  // Un coup de pied rebat les cartes : la passe d'avant ne compte plus.
  e.dernierPasseur = null;
  // ⚠️ PORTÉE RÉALISTE. À `26 + pied/2,2`, un buteur noté 85 tapait à 65 mètres :
  // un dégagement pris sur sa ligne des 22 finissait alors DANS les 22 adverses,
  // et la règle géométrique du 50/22 le récompensait — six « 50/22 » par match.
  // Un dégagement de touche du rugby professionnel fait 40 à 55 mètres.
  const portee = 24 + p.pied / 3.2;

  switch (intention) {
    case 'drop': {
      const plan = planDe(e, p.cote);
      p.stats.butsTentes += 1;
      const d = metresAvantLaLigne(p.pos, p.cote) + 11;
      if (plan.penalites > 0 && e.rng() < probaTir(d, Math.abs(p.pos.y - AXE), p.pied)) {
        plan.penalites -= 1;
        p.stats.butsReussis += 1;
        marquer(e, p.cote, 3);
        p.stats.pointsAuPied = (p.stats.pointsAuPied ?? 0) + 3;
        dire(e, 'but', p.cote, C.phrase(e.rng, C.DROP, { nom: p.nom }), 3, p.moi);
        if (e.sirene) return clorePeriode(e);
        return preparerCoupEnvoi(e, adverse(p.cote));
      }
      dire(e, 'butRate', p.cote, C.texteMatch('dropRate', { nom: p.nom }), 0, p.moi);
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

// ⚠️ LE BANC ENTRE VRAIMENT, ET À L'HEURE. Le seul critère était l'endurance :
// dans un club aux gros moteurs (mesuré au Stade Toulousain), aucun titulaire ne
// passait sous le seuil et les HUIT remplaçants finissaient le match sur la
// touche — un banc pour rien, et jamais un maillot 16-23 sur la feuille.
// Au rugby, les changements suivent d'abord L'HORLOGE : la première ligne
// tourne autour de la 50ᵉ, les gros de devant vers la 58ᵉ, les lignes arrière
// dans le dernier quart d'heure. La fatigue ne fait qu'avancer l'échéance.
const MINUTE_ENTREE: Record<number, number> = {
  16: 52, 17: 50, 18: 50, 19: 58, 20: 56, 21: 63, 22: 66, 23: 62,
};

function faireRemplacement(e: EtatMatch, cote: Cote, entrant: Pion, sortant: Pion): boolean {
  if (entrant.cote !== cote || sortant.cote !== cote || entrant.surLeTerrain || !sortant.surLeTerrain) return false;
  sortant.surLeTerrain = false;
  entrant.surLeTerrain = true;
  entrant.poste = sortant.poste;
  entrant.avant = sortant.avant;
  entrant.pos = { x: sortant.pos.x, y: sortant.pos.y };
  entrant.cible = { x: sortant.pos.x, y: sortant.pos.y };
  stopper(entrant);
  if (cote === 'A') e.remplacementsA += 1; else e.remplacementsB += 1;
  dire(e, 'remplacement', cote, C.phrase(e.rng, C.REMPLACEMENT, {
    entrant: entrant.nom, sortant: sortant.nom, club: nomClub(e, cote),
  }), 0, entrant.moi || sortant.moi);
  return true;
}

function gererRemplacements(e: EtatMatch): void {
  if (!PHASES_ARRETEES.has(e.phase)) return; // on ne change qu'à l'arrêt de jeu
  const famille = (x: Pion) => POSTE_PAR_ID[x.poste]?.famille;

  for (const cote of ['A', 'B'] as Cote[]) {
    const faits = cote === 'A' ? e.remplacementsA : e.remplacementsB;
    if (faits >= 8) continue;
    const sur = surLeTerrain(e, cote);
    const banc = e.pions.filter((p) => p.cote === cote && !p.surLeTerrain && p.sanction <= 0 && p.minutes === 0);
    if (!banc.length) continue;

    // Le manager peut préparer un changement à n'importe quel moment. Il est
    // exécuté ici, au premier arrêt de jeu, comme depuis un vrai banc.
    const demande = e.remplacementsDemandes[cote];
    if (demande) {
      const entrant = banc.find((p) => p.sourceId === demande.entrantId);
      const sortant = sur.find((p) => p.sourceId === demande.sortantId && p.numero <= 15);
      delete e.remplacementsDemandes[cote];
      if (entrant && sortant && faireRemplacement(e, cote, entrant, sortant)) continue;
    }

    // ⚠️ ON APPARIE LE POSTE. Le remplaçant prend la place d'un titulaire de son
    // poste (à défaut de sa famille, à défaut de sa catégorie), jamais « le
    // premier venu » : un arrière est déjà entré pilier. Seuls les TITULAIRES
    // sortent — on ne remplace pas un remplaçant. L'avatar n'est sorti qu'à
    // partir de la 62ᵉ.
    const remplacable = (p: Pion) => p.numero <= 15 && (!p.moi || e.minute >= 62);
    const chercherSortant = (entrant: Pion): Pion | undefined => {
      const exact = sur.filter((p) => remplacable(p) && p.poste === entrant.poste);
      const proche = sur.filter((p) => remplacable(p) && famille(p) === famille(entrant));
      const large = sur.filter((p) => remplacable(p) && p.avant === entrant.avant);
      const pool = exact.length ? exact : proche.length ? proche : large;
      // Dans le secteur concerné, c'est le plus émoussé qui cède sa place.
      return pool.sort((a, b) => a.endurance - b.endurance)[0];
    };

    // Qui a le droit d'entrer maintenant ? L'heure prévue pour son maillot —
    // avancée de dix minutes si celui qu'il doit relayer est déjà cuit.
    const pret = banc
        .map((p) => {
          const timing = e.tactiques[cote]?.remplacements ?? 'standard';
          const decalage = timing === 'precoces' ? -8 : timing === 'tardifs' ? 8 : 0;
          return { p, cible: chercherSortant(p), heure: (MINUTE_ENTREE[p.numero] ?? 60) + decalage };
        })
      .filter((x) => {
        if (!x.cible) return false;
        const cuit = x.cible.endurance < (x.cible.avant ? 42 : 34);
        return e.minute >= (cuit ? x.heure - 10 : x.heure);
      })
      .sort((a, b) => a.heure - b.heure || a.p.numero - b.p.numero);
    if (!pret.length) continue;

    const entrant = pret[0].p;
    const sortant = pret[0].cible;
    if (!sortant || !entrant) continue;

    // Le remplaçant garde son numéro 16 à 23 et prend le poste du sortant.
    faireRemplacement(e, cote, entrant, sortant);
  }
}

function clorePeriode(e: EtatMatch): void {
  if (e.periode === 1) {
    e.periode = 2;
    e.sirene = false;
    e.t = DUREE_PERIODE;
    e.phase = 'miTemps';
    e.minuteur = dureeArret(e, 'miTemps');
    e.porteur = null;
    e.vol = null;
    e.placement = null;
    dire(e, 'jalon', null, C.texteMatch('miTempsScore', {
      clubA: e.clubA, scoreA: e.scoreA, scoreB: e.scoreB, clubB: e.clubB,
    }));
    return;
  }
  if (!e.scoreSurTerrain) solderLesPoints(e);
  // ⚠️ LA COMMISSION SE RÉUNIT APRÈS LE COUP DE SIFFLET, pas pendant. C'est ici
  // qu'un carton rouge ou un coup de poing devient une suspension de carrière —
  // `MatchLive` la lit dans le bilan et la fait appliquer par le store.
  sanctionApresMatch(e);
  e.phase = 'fini';
  e.fini = true;
  e.porteur = null;
  e.vol = null;
  e.bagarre = null;
  e.intention = null;
  // ⚠️ On vide le reliquat. Il sert à interpoler l'affichage entre deux pas de
  // simulation ; en ⏭️ (facteur 600) il pouvait rester deux minutes de jeu non
  // consommées, et l'écran projetait alors les pions à deux cents mètres du
  // terrain à la sirène.
  e.reliquat = 0;
  dire(e, 'jalon', null, C.texteMatch('coupSiffletFinal', {
    clubA: e.clubA, scoreA: e.scoreA, scoreB: e.scoreB, clubB: e.clubB,
  }));
}

function phaseMiTemps(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  dire(e, 'jalon', null, C.texteMatch('deuxiemeMiTemps'));
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
    const buteur = liste.find((p) => p.buteur) ?? [...liste].sort((a, b) => b.pied - a.pied)[0];
    let garde = 0;
    while ((plan.essaisTransformes > 0 || plan.essaisSecs > 0 || plan.penalites > 0) && garde++ < 12) {
      if (plan.essaisTransformes > 0) {
        plan.essaisTransformes -= 1;
        const m = choisirMarqueur(e, cote);
        if (m) m.stats.essais += 1;
        if (buteur) { buteur.stats.butsTentes += 1; buteur.stats.butsReussis += 1; }
        marquer(e, cote, 7);
        if (buteur) buteur.stats.pointsAuPied = (buteur.stats.pointsAuPied ?? 0) + 2;
        if (cote === 'A') e.essaisA += 1; else e.essaisB += 1;
        dire(e, 'essai', cote, C.texteMatch('essaiTransformeFin', {
          nom: m?.nom ?? nomClub(e, cote),
        }), 7, m?.moi);
      } else if (plan.essaisSecs > 0) {
        plan.essaisSecs -= 1;
        const m = choisirMarqueur(e, cote);
        if (m) m.stats.essais += 1;
        if (buteur) buteur.stats.butsTentes += 1;
        marquer(e, cote, 5);
        if (cote === 'A') e.essaisA += 1; else e.essaisB += 1;
        dire(e, 'essai', cote, C.texteMatch('essaiFin', {
          nom: m?.nom ?? nomClub(e, cote),
        }), 5, m?.moi);
      } else {
        plan.penalites -= 1;
        if (buteur) { buteur.stats.butsTentes += 1; buteur.stats.butsReussis += 1; }
        marquer(e, cote, 3);
        if (buteur) buteur.stats.pointsAuPied = (buteur.stats.pointsAuPied ?? 0) + 3;
        dire(e, 'but', cote, C.texteMatch('penaliteFin', {
          nom: buteur?.nom ?? nomClub(e, cote),
        }), 3, buteur?.moi);
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
  if (c) dire(e, 'jeu', null, C.texteMatch('consigne', { libelle: c.libelle }));
}

function impactTactique(e: EtatMatch, cote: Cote): number {
  const t = e.tactiques[cote];
  if (!t) return 0;
  const adverseT = e.tactiques[adverse(cote)];
  let impact = (t.rythme === 'intense' ? 3 : t.rythme === 'gestion' ? -2 : 0) + (e.impactBanc?.[cote] ?? 0);
  impact += t.attaque === 'large' ? 1 : t.attaque === 'occupation' ? -1 : 0;
  if (adverseT) {
    if (t.attaque === 'large' && adverseT.defense === 'blitz') impact += 2;
    if (t.attaque === 'large' && adverseT.defense === 'glissee') impact -= 1;
    if (t.attaque === 'avants' && adverseT.defense === 'repli') impact += 1;
    if (t.attaque === 'occupation' && adverseT.defense === 'repli') impact -= 1;
  }
  return impact;
}

function recomposerPlan(e: EtatMatch, cote: Cote, total: number): void {
  const plan = planDe(e, cote);
  const cible = Math.max(plan.marques, scorePossible(total));
  const d = decomposer(Math.max(0, cible - plan.marques), e.rng);
  plan.essaisTransformes = d.essaisTransformes;
  plan.essaisSecs = d.essaisSecs;
  plan.penalites = d.penalites;
  plan.total = plan.marques + d.essaisTransformes * 7 + d.essaisSecs * 5 + d.penalites * 3;
}

/**
 * Une consigne manager ne change pas qu'un libellé : elle modifie les
 * combinaisons, le système défensif, la fatigue, les pénalités, l'heure du
 * banc et, tant qu'il reste du temps, le potentiel de marque du match.
 */
export function appliquerTactiqueEquipe(
  e: EtatMatch, cote: Cote, tactique: TactiqueManager, annoncer = true, impactSupplementaire?: number,
): void {
  const ancienA = impactTactique(e, 'A');
  const ancienB = impactTactique(e, 'B');
  if (impactSupplementaire !== undefined) {
    e.impactBanc ??= {};
    e.impactBanc[cote] = impactSupplementaire;
  }
  e.tactiques[cote] = { ...tactique };
  const nouveauA = impactTactique(e, 'A');
  const nouveauB = impactTactique(e, 'B');
  const restant = Math.max(0, 1 - e.t / (2 * DUREE_PERIODE));
  const deltaA = Math.round((nouveauA - ancienA) * restant);
  const deltaB = Math.round((nouveauB - ancienB) * restant);
  if (deltaA) recomposerPlan(e, 'A', e.planA.total + deltaA);
  if (deltaB) recomposerPlan(e, 'B', e.planB.total + deltaB);
  e.ajustementTactiqueA = nouveauA;
  e.ajustementTactiqueB = nouveauB;
  // ⚠️ LA PHRASE NE DIT PLUS LE DÉTAIL DU PLAN, et ce n'est pas une perte.
  // En ligne, le fil est LU PAR LES DEUX MANAGERS : « défense blitz, rythme
  // intense » annoncerait à l'adversaire exactement ce qu'il doit contrer, et
  // réduirait à néant le filtre de `signalAdverse` — qui ne laisse justement
  // passer qu'une impression. Celui qui donne l'ordre le relit, lui, dans son
  // propre panneau de consignes.
  if (annoncer) dire(e, 'jeu', cote, C.texteMatch('changementDePlan', { club: nomClub(e, cote) }));
}

/** Programme un changement au prochain arrêt de jeu. */
export function demanderRemplacement(
  e: EtatMatch, cote: Cote, entrantId: string, sortantId: string,
): boolean {
  if (e.fini) return false;
  const entrant = e.pions.find((p) => p.cote === cote && p.sourceId === entrantId && !p.surLeTerrain && p.minutes === 0);
  const sortant = e.pions.find((p) => p.cote === cote && p.sourceId === sortantId && p.surLeTerrain && p.numero <= 15);
  if (!entrant || !sortant) return false;
  e.remplacementsDemandes[cote] = { entrantId, sortantId };
  dire(e, 'jeu', cote, `${entrant.nom} se prépare, ${sortant.nom} sortira au prochain arrêt.`);
  return true;
}

/**
 * Le joueur prend (ou rend) la main sur son pion.
 *
 * ⚠️ RENDRE LA MAIN ANNULE L'ORDRE EN COURS. Sans ça, une intention armée
 * juste avant de décocher continuerait de piloter le pion pendant huit
 * secondes, sans qu'aucun bouton ne soit plus affiché pour l'expliquer.
 */
export function activerControle(e: EtatMatch, actif: boolean): void {
  e.controle = actif;
  if (!actif) e.intention = null;
}

/** L'ordre donné pendant une bagarre (l'écran le pose, le tick le résout). */
export function ordonner(e: EtatMatch, ordre: OrdreBagarre): void {
  donnerOrdre(e, ordre);
}

export interface LigneBilan {
  nom: string; club: string; numero: number; poste: PosteId;
  stats: StatsMatch; minutes: number; moi: boolean;
}

export interface BilanMatch {
  scoreA: number; scoreB: number; essaisA: number; essaisB: number;
  parJoueur: LigneBilan[];
  /** L'ardoise disciplinaire du joueur incarné, citation comprise. */
  discipline: DisciplineMatch;
}

export function bilan(e: EtatMatch): BilanMatch {
  return {
    scoreA: e.scoreA, scoreB: e.scoreB, essaisA: e.essaisA, essaisB: e.essaisB,
    discipline: e.discipline,
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

// ---------------------------------------------------------------------------
// 🎲 LES DUELS DE LA CARTE DE DÉCISION — annoncés, puis joués SUR-LE-CHAMP
// ---------------------------------------------------------------------------
//
// Retour de jeu, mot pour mot : « avec un système de pourcentage de réussite et
// d'impact dans le jeu, et aussi que ça s'applique vraiment — en mode plaquage
// réussi ça plaque direct, plaquage raté le mec perce, pareil pour les autres.
// Et il peut y avoir des combos sur l'action : tu perces, tu peux tenter un
// autre truc sur le défenseur. »
//
// ═══ CE QUI NE MARCHAIT PAS ════════════════════════════════════════════════
//
// Un choix n'était pas un geste, c'était une INTENTION : `demanderAction` posait
// un drapeau, et le moteur le dépensait plus tard, au prochain contact — qui
// pouvait venir quatre secondes après, ou jamais. On choisissait « crochet »
// devant un défenseur, le porteur donnait le ballon avant le contact, et le
// crochet expirait sans avoir existé.
//
// ═══ CE QUI SE PASSE MAINTENANT ════════════════════════════════════════════
//
// 1. `enjeuDe` calcule la chance de réussite AVANT le choix. Elle est écrite
//    sur le bouton : « 💥 Plaquer · 71 % ».
// 2. `resoudreChoix` tire UNE fois, avec cette chance exacte, et applique
//    l'issue immédiatement — le plaquage a lieu, ou le porteur perce.
// 3. Si le vis-à-vis est battu, `Issue.combo` est vrai et une nouvelle carte
//    s'ouvre dans la foulée, sans attendre le repos habituel.
//
// ⚠️ UNE SEULE FORMULE, DEUX LECTEURS. `enjeuDe` et `resoudreChoix` appellent
// tous les deux `probaPlaquage` — celle-là même que le moteur utilise pour les
// vingt-neuf autres. Le pourcentage affiché EST le pourcentage joué ; il ne
// peut pas dériver, parce que ce serait la même ligne qui dérive.
//
// ⚠️ ET LA PHRASE AFFICHÉE EST CELLE DU MOTEUR, PAS UNE COPIE. `resoudreChoix`
// relit le commentaire que le moteur vient d'écrire sur le joueur
// (`phraseDepuis`) plutôt que de composer sa propre prose. Sans ça, il y aurait
// deux récits du même contact — celui du fil et celui de la carte — et ils
// divergeraient au premier réglage. Les clés de repli ne servent que pour les
// issues dont le moteur ne dit rien (un appel dans le vide, par exemple).
//
// ⚠️ ET LE SCORE RESTE CELUI DE LA LIGUE. Ces duels décident du COMMENT, jamais
// du COMBIEN : `jouerRencontre` fixe le résultat et `solderLesPoints` le
// respecte. Un joueur qui réussit tout ne gagne pas un match qu'il devait
// perdre — il le vit autrement, et sa note de fin de match, elle, monte.

export interface Enjeu {
  action: ActionJoueur;
  /** La probabilité EXACTE que `resoudreChoix` va tirer. 0 à 1. */
  chance: number;
  /** Clé i18n : ce que la réussite donne. */
  gain: string;
  /** Clé i18n : ce que l’échec coûte. */
  risque: string;
}

export interface Issue {
  /**
   * ⚠️ LE DÉ A-T-IL VRAIMENT ÉTÉ LANCÉ ?
   *
   * Faux quand la situation ne permettait pas de trancher tout de suite — et
   * c'est le cas le PLUS FRÉQUENT, pas un cas limite : sur une carte de
   * réception (treize des dix-huit cartes d'un match), le ballon n'est pas
   * encore dans les mains. Un crochet demandé là reste ARMÉ pour le contact qui
   * vient, et le moteur le jouera à ce moment-là.
   *
   * ⚠️ SANS CE CHAMP, `reussi` MENTAIT. Il valait `true` sur ces sorties
   * anticipées, et le banc d'essai l'a vu tout de suite : la tranche « 55-75 %
   * annoncés » sortait à 78,6 %, celle des « 35-55 % » à 29 %. Le total, lui,
   * tombait juste — un biais par geste, invisible en moyenne. C'est exactement
   * le genre de mensonge que le joueur met sur le compte de la malchance.
   */
  joue: boolean;
  reussi: boolean;
  /** La phrase à afficher au-dessus du joueur — celle du moteur, si elle existe. */
  texte: string;
  /**
   * ⚠️ LE COMBO. Vrai quand le vis-à-vis est battu ET que le joueur est encore
   * debout, ballon en main : on lui rouvre une carte tout de suite, sans le
   * repos de 95 secondes simulées qui espace les carrefours ordinaires. C'est
   * la demande « tu perces, tu peux tenter un autre truc sur le défenseur ».
   */
  combo: boolean;
}

/** Le vis-à-vis du duel : qui je dois battre, ou qui je dois arrêter. */
function visAVis(e: EtatMatch, p: Pion): Pion | null {
  if (e.porteur === p) {
    let meilleur: Pion | null = null;
    let d2 = 400; // vingt mètres : au-delà, il n’y a pas de duel à jouer
    for (const q of surLeTerrain(e, adverse(p.cote))) {
      if (q.sanction > 0 || q.battu > 0) continue;
      const d = distance2(q.pos, p.pos);
      if (d < d2) { d2 = d; meilleur = q; }
    }
    return meilleur;
  }
  if (e.porteur && e.porteur.cote !== p.cote) return e.porteur;
  return null;
}

/** Le partenaire à qui la passe partirait, du côté demandé. */
function receveurChoisi(e: EtatMatch, p: Pion, action: ActionJoueur): Pion | undefined {
  const cote = action === 'passeGauche' ? -1 : action === 'passeDroite' ? 1 : 0;
  return cote === 0 ? receveurPour(e, p) : (receveurCote(e, p, cote) ?? receveurPour(e, p));
}

/** La distance au vis-à-vis, en mètres. 99 s’il n’y en a pas. */
function pressionSur(e: EtatMatch, p: Pion): number {
  const d = visAVis(e, p);
  return d ? Math.sqrt(distance2(d.pos, p.pos)) : 99;
}

/**
 * La chance qu'une passe parte proprement.
 *
 * ⚠️ ELLE DÉPEND DE LA PRESSION, et c'est ce qui fait de « passer » une vraie
 * décision plutôt qu'un bouton sûr. Passer avec un défenseur dans le nez, c'est
 * la passe au sol ; passer tôt, c'est presque toujours propre.
 */
function probaPasse(e: EtatMatch, p: Pion, receveur: Pion | undefined): number {
  if (!receveur) return 0;
  const longueur = Math.sqrt(distance2(receveur.pos, p.pos));
  const mains = 0.62 + p.passe / 260 + p.endurance / 900;
  const gene = Math.max(0, 5 - pressionSur(e, p)) * 0.035 + Math.max(0, longueur - 12) / 220;
  return borner(mains - gene, 0.35, 0.985);
}

/** La chance de trouver son coup de pied plutôt que de se faire contrer. */
function probaPied(e: EtatMatch, p: Pion): number {
  // ⚠️ Sous six mètres, taper est un pari : le contre est la punition la plus
  // humiliante du rugby, et il doit exister pour que « dégager » ne soit pas la
  // réponse gratuite à toutes les situations difficiles.
  return borner(0.58 + p.pied / 260 - Math.max(0, 6 - pressionSur(e, p)) * 0.055, 0.30, 0.97);
}

/** La chance de gratter le ballon au sol. */
function probaGrattage(e: EtatMatch, p: Pion): number {
  const loin = distance2(p.pos, e.ballon);
  if (loin > 64) return 0;
  // Un ballon volé en appelle un autre : la défense monte, le porteur doute.
  const base = (e.ballonLent ? 0.34 : 0.22) + p.plaquage / 340 + bonusElan(e, p.cote);
  return borner(base - Math.sqrt(loin) * 0.012, 0.08, 0.72);
}

/** La chance de se rendre disponible et de recevoir le prochain ballon. */
function probaAppel(e: EtatMatch, p: Pion): number {
  if (!e.lancement || e.possession !== p.cote) return 0;
  return borner(0.42 + p.vision / 400 + p.vitesseMax / 90, 0.2, 0.9);
}

/**
 * ⚠️ CE QUE CHAQUE OPTION MET EN JEU — le chiffre qui s'affiche sur le bouton.
 *
 * Pure : elle ne tire rien et ne mute rien. Appelée à chaque construction de
 * carte (`decisions.ts`) ET par `resoudreChoix` juste avant le tirage, ce qui
 * garantit que les deux parlent du même dé.
 */
/**
 * Combien de temps un fuyard reste dans l’espace, en secondes simulées.
 *
 * ⚠️ SEPT SECONDES, C’EST CINQUANTE MÈTRES DE COURSE. Au-delà, on ne fuit
 * plus, on marche vers l’en-but : la couverture adverse a toujours le temps
 * de revenir, et un jeu où une percée vaut un essai à tous les coups n’a plus
 * de duel à jouer. Elle s’éteint aussi dès que le ballon quitte les mains.
 */
const DUREE_ECHAPPEE = 7;

/**
 * ⚠️ LE PION EST DANS L’ESPACE — le chaînon qui manquait entre le duel gagné
 * et la ligne d’essai.
 *
 * Retour de jeu : « nos actions n’ont aucun impact dans le jeu ; fais qu’un
 * raffut, un sprint ou un prendre-l’espace mène à un essai si réussi ». Le
 * moteur savait déjà marquer quand un porteur franchit la ligne
 * (`franchieLigne` → `tenterEssai`) : ce qui n’existait pas, c’est le CHEMIN.
 */
function lancerEchappee(e: EtatMatch, p: Pion): void {
  e.echappee = { pion: p, restant: DUREE_ECHAPPEE };
  // ⚠️ ET ON ROUVRE UNE CARTE TOUT DE SUITE. Être dans l’espace sans qu’on
  // vous demande rien, c’est regarder le moteur finir l’action à votre place :
  // le drapeau d’enchaînement est ce qui transforme la percée en question.
  if (p.moi) e.perceeJoueur = true;
  pousserElan(e, p.cote, POUSSEES.percee);
  dire(e, 'franchissement', p.cote, C.texteMatch('echappee', { nom: p.nom }), 0, p.moi);
}

/**
 * Un ballon volé : la dynamique bascule, et on retient qui l’a volé.
 *
 * ⚠️ ON RETIENT LE VOLEUR POUR POUVOIR DIRE MERCI. Un grattage qui amène
 * l’essai quarante secondes plus tard, personne ne fait le lien — le fil a
 * défilé, la carte est refermée depuis longtemps. `tenterEssai` relit ce
 * chaînon et pousse une retombée dans `e.echos`.
 */
function turnoverJoueur(e: EtatMatch, p: Pion): void {
  pousserElan(e, p.cote, POUSSEES.turnover);
  if (p.moi) e.dernierTurnover = { pion: p, t: e.t };
}

export function enjeuDe(e: EtatMatch, p: Pion, action: ActionJoueur): Enjeu {
  const g = (chance: number, gain: string, risque: string): Enjeu =>
    ({ action, chance: borner(chance, 0, 1), gain, risque });
  const adv = visAVis(e, p);

  switch (action) {
    case 'plaquage':
      return adv && e.porteur === adv
        ? g(probaPlaquage(e, adv, p, null, true), 'ml.enj.plaquage.gain', 'ml.enj.plaquage.risque')
        : g(0.5, 'ml.enj.plaquage.gain', 'ml.enj.plaquage.risque');
    case 'monter':
      // ⚠️ MONTER, C’EST PLAQUER PLUS HAUT SUR LE TERRAIN : on gagne des mètres
      // quand ça passe, on ouvre un boulevard quand ça rate. Douze pour cent de
      // réussite en moins, et un échec bien plus cher — c’est ce qui en fait un
      // choix, et pas un « plaquage bis ».
      return adv && e.porteur === adv
        ? g(probaPlaquage(e, adv, p, null, true) * 0.88, 'ml.enj.monter.gain', 'ml.enj.monter.risque')
        : g(0.44, 'ml.enj.monter.gain', 'ml.enj.monter.risque');
    case 'crochet':
      return adv
        ? g(1 - probaPlaquage(e, p, adv, 'crochet', false), 'ml.enj.crochet.gain', 'ml.enj.crochet.risque')
        : g(0.6, 'ml.enj.crochet.gain', 'ml.enj.crochet.risque');
    case 'raffut':
      return adv
        ? g(1 - probaPlaquage(e, p, adv, 'raffut', false), 'ml.enj.raffut.gain', 'ml.enj.raffut.risque')
        : g(0.6, 'ml.enj.raffut.gain', 'ml.enj.raffut.risque');
    case 'sprint':
      return adv && e.porteur === p
        ? g(1 - probaPlaquage(e, p, adv, 'sprint', false), 'ml.enj.sprint.gain', 'ml.enj.sprint.risque')
        : g(borner(0.5 + p.endurance / 260, 0.3, 0.92), 'ml.enj.sprint.gain', 'ml.enj.sprint.risque');
    case 'grattage':
      return g(probaGrattage(e, p), 'ml.enj.grattage.gain', 'ml.enj.grattage.risque');

    // ── LES GESTES DE POSTE ──────────────────────────────────────────────
    case 'cinquanteVingtDeux':
      // ⚠️ DEUX DÉS, DONC UN PRODUIT — et c’est la vraie chance de réussir un
      // 50/22 : ne pas se faire contrer, PUIS trouver la touche dans leurs 22.
      // Le second facteur est copié de `taperAuPied`, qui le tirera lui-même :
      // on annonce exactement ce que le moteur va jouer, pas une estimation.
      return g(probaPied(e, p) * (0.3 + p.pied / 320), 'ml.enj.5022.gain', 'ml.enj.5022.risque');
    case 'chandelle':
      return g(probaPied(e, p), 'ml.enj.chandelle.gain', 'ml.enj.chandelle.risque');
    case 'chenille':
      // Le 9 protège la sortie derrière son paquet : ses mains et un ballon
      // déjà lent (donc un regroupement stabilisé) font tout.
      return g(borner(0.52 + p.passe / 300 + (e.ballonLent ? 0.12 : 0), 0.3, 0.93), 'ml.enj.chenille.gain', 'ml.enj.chenille.risque');
    case 'percussion':
      // ⚠️ LE GESTE SÛR DU LOT, et c’est ce qui en fait un choix : on ne perce
      // pas, on avance et on garde. Un crochet à 60 % qui coûte le ballon une
      // fois sur trois ne se compare pas à une percussion à 85 %.
      return g(borner(0.68 + p.puissance / 320 - pressionSur(e, p) * 0.004, 0.45, 0.95), 'ml.enj.percussion.gain', 'ml.enj.percussion.risque');
    case 'offload':
      // Donner APRÈS le contact, au dernier moment : le geste le plus dur du
      // rugby, et le plus cher quand il rate.
      return g(borner(0.28 + p.passe / 300 + p.vision / 420, 0.18, 0.72), 'ml.enj.offload.gain', 'ml.enj.offload.risque');
    // ── LES GESTES QUI MÈNENT À LA LIGNE ─────────────────────────────────
    case 'percee': {
      // ⚠️ LA CHANCE EST CELLE DU TROU, PAS CELLE DU JOUEUR. Un ailier
      // international ne perce pas un rideau fermé, et un pilier passe dans
      // un boulevard : `intervalle` mesure le plus grand écart entre deux
      // défenseurs devant soi, ce que lit un joueur qui relève la tête.
      //
      // ⚠️ ET L’ÉCART EST PLAFONNÉ À QUATORZE MÈTRES. Sans ça, un rideau vide
      // rend `LARGEUR` (70) et le geste s’affiche à 100 % : on annoncerait une
      // certitude là où il reste une couverture à battre.
      // ⚠️ ON COMPTE CE QUI DÉPASSE L’ÉCARTEMENT NORMAL DU RIDEAU (~6 m), pas
      // l’écart brut. Première version : `trou * 0,028` sur l’écart total —
      // mesuré, la percée sortait à **62 % de réussite**, c’est-à-dire plus
      // souvent qu’un plaquage n’est manqué. Un geste d’exception qui passe
      // deux fois sur trois n’est plus un pari, c’est la tactique de base.
      const trou = Math.min(intervalle(e, p), 16);
      return g(0.06 + Math.max(0, trou - 6) * 0.045 + p.vision / 600
        + p.vitesseMax / 150 - pressionSur(e, p) * 0.008, 'ml.enj.percee.gain', 'ml.enj.percee.risque');
    }
    case 'chipEtSuivre':
      // Deux dés en un : poser le ballon derrière le rideau, PUIS le
      // reprendre. C’est le geste le plus improbable du rugby, et le plus beau
      // quand il passe.
      return g(borner(0.16 + p.pied / 400 + p.vitesseMax / 120 + p.vision / 500, 0.14, 0.52),
        'ml.enj.chip.gain', 'ml.enj.chip.risque');
    case 'plongeon':
      // ⚠️ TOUT EST DANS LA DISTANCE. À un mètre c’est une formalité, à douze
      // c’est un fantasme — et c’est ce qui fait qu’on ne plonge pas n’importe
      // quand. La pression proche compte : un défenseur au contact tient le
      // porteur debout, et un ballon tenu en-but ne vaut rien.
      return g(0.88 - metresDeLaLigne(p) * 0.055
        - Math.max(0, 8 - pressionDevant(e, p)) * 0.028, 'ml.enj.plongeon.gain', 'ml.enj.plongeon.risque');
    case 'interception': {
      // ⚠️ RARISSIME, ET ÇA DOIT SE VOIR SUR LE BOUTON. Lire une passe, c’est
      // partir avant qu’elle ne parte : réussi, on court seul vers l’en-but ;
      // raté, on a ouvert un boulevard là où on était censé défendre.
      const v = e.vol;
      const ecart = v?.receveur ? Math.sqrt(distance2(p.pos, v.receveur.pos)) : 99;
      return g(0.10 + p.vision / 420 + Math.max(0, 8 - ecart) * 0.022,
        'ml.enj.interception.gain', 'ml.enj.interception.risque');
    }
    case 'contreRuck':
      // Le pendant collectif du grattage : on ne pique pas le ballon, on
      // passe le paquet par-dessus. Plus sûr qu’un grattage, plus lent aussi.
      return g(borner(0.30 + p.puissance / 300 + (e.ballonLent ? 0.10 : 0)
        - (e.gardeRuck > 0 ? 0.12 : 0), 0.14, 0.66), 'ml.enj.contreRuck.gain', 'ml.enj.contreRuck.risque');

    case 'passe':
    case 'passeGauche':
    case 'passeDroite':
      return g(probaPasse(e, p, receveurChoisi(e, p, action)), 'ml.enj.passe.gain', 'ml.enj.passe.risque');
    case 'pied':
      return g(probaPied(e, p), 'ml.enj.pied.gain', 'ml.enj.pied.risque');
    case 'appel':
      return g(probaAppel(e, p), 'ml.enj.appel.gain', 'ml.enj.appel.risque');
    case 'soutien':
      return g(borner(0.55 + p.vision / 320, 0.3, 0.9), 'ml.enj.soutien.gain', 'ml.enj.soutien.risque');
    default:
      // La discipline (chambrer, frapper, calmer) ne se tire pas ici : elle
      // reste une intention, et c’est `bagarre.ts` qui en décide. Le chiffre
      // annoncé est la chance que ça reste sans conséquence pour soi.
      return g(0.5, 'ml.enj.discipline.gain', 'ml.enj.discipline.risque');
  }
}

/** Les gestes que `resoudreChoix` joue immédiatement. Les autres restent armés. */
const DUELS: ActionJoueur[] = [
  'plaquage', 'monter', 'crochet', 'raffut', 'sprint', 'grattage',
  'passe', 'passeGauche', 'passeDroite', 'pied', 'appel', 'soutien',
  'cinquanteVingtDeux', 'chandelle', 'chenille', 'percussion', 'offload',
  'percee', 'chipEtSuivre', 'plongeon', 'interception', 'contreRuck',
];

export function estUnDuel(action: ActionJoueur): boolean {
  return DUELS.includes(action);
}

/**
 * Les seules clés de repli que `resoudreChoix` s’autorise.
 *
 * ⚠️ LE TYPE EST ÉTROIT EXPRÈS. Si on laissait `CleCommentaireDirect`, rien
 * n’empêcherait d’aller chercher « coup d’envoi » ou « carton rouge » comme
 * texte de repli d’un duel, et personne ne s’en apercevrait avant de le lire
 * à l’écran en pleine partie.
 */
type CleDuel = 'choixArme' | 'choixTropTard' | 'duelContactKo' | 'duelGrattageKo'
  | 'duelPasseOk' | 'duelPasseKo' | 'duelPiedContre' | 'duelAppelKo'
  | 'duel5022Rate' | 'duelChenilleOk' | 'duelChenilleKo' | 'duelPercussionOk' | 'duelOffloadKo'
  | 'duelPerceeKo' | 'duelChipOk' | 'duelChipKo' | 'duelPlongeonKo'
  | 'duelInterceptionOk' | 'duelInterceptionKo' | 'duelContreRuckOk' | 'duelContreRuckKo';

/** La première phrase que le moteur vient d’écrire sur MON joueur, s’il en a écrit une. */
function phraseDepuis(e: EtatMatch, depuis: number): string | null {
  for (let i = depuis; i < e.commentaires.length; i++) {
    if (e.commentaires[i].moi) return e.commentaires[i].texte;
  }
  return null;
}

/**
 * ⚠️ LE CHOIX SE JOUE MAINTENANT. C'est le cœur de la demande.
 *
 * Un seul tirage, avec la chance exacte affichée sur le bouton, et les
 * conséquences appliquées dans la foulée — pas à un tick futur, pas « quand le
 * moteur en aura envie ».
 */
export function resoudreChoix(e: EtatMatch, p: Pion, action: ActionJoueur): Issue {
  const nom = p.nom;
  const depuis = e.commentaires.length;
  const adv = visAVis(e, p);
  const cible = adv ? adv.nom : nom;
  /** Ce que le moteur a raconté, ou la phrase de repli. */
  const dit = (repli: CleDuel): string =>
    phraseDepuis(e, depuis) ?? C.texteMatch(repli, { nom, cible });
  /**
   * Le geste est parti, mais rien n’est encore tranché : il attend son contact.
   * ⚠️ `joue: false` — c’est ce qui empêche l’écran d’annoncer une réussite qui
   * n’a pas eu lieu, et le banc d’essai de compter ce tirage dans l’étalonnage.
   */
  const arme = (): Issue => ({
    joue: false, reussi: false, texte: C.texteMatch('choixArme', { nom, cible }), combo: false,
  });
  /** Le dé est tombé. `combo` vient du moteur, pas d’une supposition d’ici. */
  const tranche = (reussi: boolean, repli: CleDuel): Issue => ({
    joue: true, reussi, texte: dit(repli), combo: e.perceeJoueur,
  });
  const tropTard = (): Issue => ({
    joue: false, reussi: false, texte: C.texteMatch('choixTropTard', { nom, cible }), combo: false,
  });

  if (!estUnDuel(action)) {
    demanderAction(e, action);
    return arme();
  }

  const enjeu = enjeuDe(e, p, action);
  const reussi = e.rng() < enjeu.chance;

  switch (action) {
    // ── EN DÉFENSE ───────────────────────────────────────────────────────
    case 'plaquage':
    case 'monter': {
      const porteur = e.porteur;
      if (!porteur || porteur.cote === p.cote) return tropTard();
      // ⚠️ ON POSE L’INTENTION AVANT D’APPELER LE MOTEUR : c’est elle qui dit à
      // `resoudrePlaquage` que ce plaquage est LANCÉ (bonus de force, mais
      // risque de plaquage haut doublé). L’issue, elle, est imposée.
      demanderAction(e, action);
      if (reussi && action === 'monter') {
        // Monter et réussir, c’est plaquer AVANT la ligne d’avantage : on le
        // matérialise en ramenant le porteur d’un mètre et demi.
        porteur.pos.x -= sens(porteur.cote) * 1.5;
      }
      resoudrePlaquage(e, porteur, p, reussi);
      return tranche(reussi, reussi ? 'choixArme' : 'duelContactKo');
    }
    case 'grattage': {
      demanderAction(e, action);
      consommerIntention(e);
      if (!reussi) {
        // ⚠️ GRATTER MAL, C’EST UNE PÉNALITÉ CONTRE SON CAMP une fois sur quatre :
        // c’est ce qui empêche de gratter à tous les regroupements.
        if (e.rng() < 0.24) {
          siffler(e, e.possession, { x: e.ballon.x, y: e.ballon.y }, 'plaqueur qui ne se relève pas', p);
        }
        return tranche(false, 'duelGrattageKo');
      }
      p.stats.grattages += 1;
      e.possession = p.cote;
      e.phasesDepuisArret = 0;
      turnoverJoueur(e, p);
      dire(e, 'ruck', p.cote, C.phrase(e.rng, C.RUCK_GRATTAGE, { nom }), 0, true);
      return tranche(true, 'choixArme');
    }

    // ── BALLON EN MAIN, AU CONTACT ───────────────────────────────────────
    case 'crochet':
    case 'raffut':
    case 'sprint': {
      demanderAction(e, action);
      // ⚠️ LE CAS LE PLUS FRÉQUENT, ET LE PLUS FACILE À MAL TRAITER : sur une
      // carte de RÉCEPTION, le ballon n’est pas encore là. Il n’y a rien à
      // trancher — le geste reste armé, et `resoudrePlaquage` le jouera au
      // contact, avec la même formule. On le dit (`joue: false`) au lieu de
      // faire semblant d’avoir gagné.
      if (e.porteur !== p || !adv) return arme();
      // ⚠️ MON SUCCÈS EST L’ÉCHEC DU PLAQUEUR. Le duel est le même objet vu des
      // deux côtés : on impose donc `abouti = !reussi`.
      resoudrePlaquage(e, p, adv, !reussi);
      return tranche(reussi, reussi ? 'choixArme' : 'duelContactKo');
    }

    // ── BALLON EN MAIN, LIBÉRER ──────────────────────────────────────────
    case 'passe':
    case 'passeGauche':
    case 'passeDroite': {
      const receveur = receveurChoisi(e, p, action);
      if (e.porteur !== p || !receveur) return tropTard();
      consommerIntention(e);
      if (!reussi) {
        // ⚠️ UNE PASSE RATÉE COÛTE LE BALLON, TOUJOURS. C’est ce qui donne du
        // poids au choix « je donne » contre « je garde ».
        passeEnAvant(e, p);
        return tranche(false, 'duelPasseKo');
      }
      passerLeBallon(e, p, receveur, pressionSur(e, p));
      return {
        joue: true,
        reussi: true,
        texte: phraseDepuis(e, depuis) ?? C.texteMatch('duelPasseOk', { nom, cible: receveur.nom }),
        combo: false,
      };
    }
    case 'pied': {
      if (e.porteur !== p) return tropTard();
      consommerIntention(e);
      if (!reussi) {
        // ⚠️ LE CONTRE. La punition la plus humiliante du rugby, et la raison
        // pour laquelle « dégager » ne peut pas être la réponse gratuite à
        // toutes les situations difficiles.
        p.stats.coupsDePied += 1;
        dire(e, 'pied', adverse(p.cote), C.texteMatch('duelPiedContre', { nom, cible }), 0, true);
        arret(e, 'melee', adverse(p.cote), { x: p.pos.x, y: p.pos.y });
        return tranche(false, 'duelPiedContre');
      }
      taperAuPied(e, p, intentionDePied(e, p));
      return tranche(true, 'choixArme');
    }

    // ── LES GESTES DE POSTE ──────────────────────────────────────────────
    case 'cinquanteVingtDeux':
    case 'chandelle': {
      if (e.porteur !== p) return tropTard();
      consommerIntention(e);
      // ⚠️ LE CONTRE EST TIRÉ ICI, LE RESTE PAR LE MOTEUR. `probaPied` dit si
      // le ballon quitte le pied ; `taperAuPied` dit où il tombe. On ne
      // refait pas son travail — on lui retire seulement le CHOIX du coup de
      // pied, qui appartenait à `intentionDePied`.
      if (e.rng() >= probaPied(e, p)) {
        p.stats.coupsDePied += 1;
        dire(e, 'pied', adverse(p.cote), C.texteMatch('duelPiedContre', { nom, cible }), 0, true);
        arret(e, 'melee', adverse(p.cote), { x: p.pos.x, y: p.pos.y });
        return tranche(false, 'duelPiedContre');
      }
      taperAuPied(e, p, action === 'chandelle' ? 'chandelle' : 'cinquanteVingtDeux');
      // ⚠️ LA RÉUSSITE SE LIT SUR LE BALLON, PAS SUR UN SECOND DÉ. Quand le
      // 50/22 ne trouve pas la touche, `taperAuPied` bascule lui-même le vol en
      // « occupation » : c’est LUI le verdict, et le relire évite d’avoir deux
      // avis sur le même coup de pied.
      const trouve = action === 'chandelle' || e.vol?.intention === 'cinquanteVingtDeux';
      return tranche(trouve, trouve ? 'choixArme' : 'duel5022Rate');
    }
    case 'chenille': {
      demanderAction(e, action);
      consommerIntention(e);
      if (e.phase !== 'ruck' || e.possession !== p.cote) return tropTard();
      if (!reussi) {
        // ⚠️ UNE CHENILLE QUI S’ÉCROULE, C’EST UNE PÉNALITÉ. Le 9 traîne, le
        // paquet se disloque, l’arbitre siffle le ballon tenu. Sans ce revers,
        // ce serait une sortie de ruck gratuite à tous les regroupements.
        if (e.rng() < 0.45) {
          siffler(e, adverse(p.cote), { x: e.ballon.x, y: e.ballon.y }, 'ballon tenu au sol', p);
          return tranche(false, 'duelChenilleKo');
        }
        e.possession = adverse(p.cote);
        return tranche(false, 'duelChenilleKo');
      }
      // ⚠️ LE BALLON EST ASSURÉ, PUIS DÉGAGÉ. C’est ça, une chenille : on ralentit
      // volontairement la sortie pour que le paquet fasse écran, et le 9 tape
      // par-dessus sans être chargé. Le ballon lent, ici, est un CHOIX.
      e.ballonLent = true;
      e.possession = p.cote;
      e.gardeRuck = 0.9;
      dire(e, 'ruck', p.cote, C.texteMatch('duelChenilleOk', { nom }), 0, true);
      taperAuPied(e, p, 'chandelle');
      return tranche(true, 'choixArme');
    }
    case 'percussion': {
      demanderAction(e, action);
      if (e.porteur !== p) return arme();
      // ⚠️ ON AVANCE AVANT DE RÉSOUDRE, ET ÇA SE VOIT. Une percussion, c’est
      // d’abord des mètres : le pion est poussé de deux à quatre mètres dans
      // l’axe, puis le contact se joue. Sans ce déplacement, « foncer » et
      // « crocheter » donneraient exactement la même image à l’écran.
      const avance = reussi ? 2.6 + p.puissance / 45 : 1.4;
      p.pos.x = borner(p.pos.x + sens(p.cote) * avance, LIGNE_A + 0.5, LIGNE_B - 0.5);
      p.stats.metres += avance;
      if (!adv) return tranche(reussi, 'choixArme');
      if (!reussi) {
        // Le ballon saute dans le contact : la sanction du geste en force.
        enAvant(e, p);
        return tranche(false, 'duelContactKo');
      }
      // Plaqué, mais le ballon est propre et ressort vite pour les siens.
      resoudrePlaquage(e, p, adv, true);
      e.ballonLent = false;
      e.possession = p.cote;
      return tranche(true, 'duelPercussionOk');
    }
    case 'offload': {
      demanderAction(e, action);
      if (e.porteur !== p || !adv) return arme();
      // ⚠️ L'OFFLOAD PART AVANT QUE LE PLAQUAGE NE SE REFERME, et c'est la
      // seule façon qu’il existe. Première version : on résolvait le plaquage
      // PUIS on tentait la passe — mais `resoudrePlaquage` finit sur
      // `formerRuck`, qui met `e.porteur` à `null`. La condition
      // « je porte encore » n’était donc JAMAIS vraie, et le geste ne faisait
      // rien d’autre que déclencher un plaquage ordinaire. Vu dans le journal
      // de jeu : « ✅ Offload — Maxime Retière joue son geste », le texte de
      // repli, parce que le moteur n’avait rien eu à raconter.
      //
      // ⚠️ « AU DERNIER MOMENT » RESTE VRAI : le défenseur est bien au contact
      // (c’est la condition d’entrée), et il reste sonné une demi-seconde —
      // il a plaqué, mais le ballon lui est passé entre les doigts.
      if (reussi && offloader(e, p)) {
        adv.battu = Math.max(adv.battu, 0.6);
        return tranche(true, 'choixArme');
      }
      // Le bras part, le ballon aussi : en-avant, et la mêlée pour eux.
      enAvant(e, p);
      return tranche(false, 'duelOffloadKo');
    }

    // ── LES GESTES QUI MÈNENT À LA LIGNE ─────────────────────────────────
    case 'percee': {
      demanderAction(e, action);
      if (e.porteur !== p) return arme();
      if (!reussi) {
        // L’intervalle s’est refermé : plaqué dans le trou, ballon lent, et la
        // défense a le temps de se remettre en place. On a joué, on a perdu.
        // ⚠️ ET ON LE RACONTE MÊME SANS PLAQUEUR. Attrapé par l’empreinte du
        // banc d’essai : quand l’intervalle visé était au bord du rideau, il n’y
        // avait personne pour plaquer — la percée ratée ne changeait alors
        // strictement RIEN, ni l’état, ni le fil. Un bouton muet.
        if (adv) resoudrePlaquage(e, p, adv, true);
        else dire(e, 'jeu', p.cote, C.texteMatch('duelPerceeKo', { nom: p.nom }), 0, true);
        e.ballonLent = true;
        return tranche(false, 'duelPerceeKo');
      }
      // ⚠️ LE RIDEAU EST DANS LE DOS, ET ON L’ÉCRIT SUR LES PIONS. Sans mettre
      // les défenseurs proches à terre (`battu`), le plus près replaquerait à
      // la frame suivante et la percée n’aurait duré qu’un dixième de seconde.
      for (const q of surLeTerrain(e, adverse(p.cote))) {
        if (q.sanction > 0) continue;
        if (distance2(q.pos, p.pos) < 100) q.battu = Math.max(q.battu, 1.8);
      }
      p.stats.franchissements += 1;
      lancerEchappee(e, p);
      return tranche(true, 'choixArme');
    }
    case 'chipEtSuivre': {
      if (e.porteur !== p) return tropTard();
      consommerIntention(e);
      p.stats.coupsDePied += 1;
      if (!reussi) {
        // Trop long, trop court, ou cueilli par l’arrière : on a rendu le cuir.
        // ⚠️ ON PASSE PAR `taperAuPied` PLUTÔT QUE DE POSER UN ARRÊT : un chip
        // raté ne sort pas du jeu, il offre une contre-attaque — c’est bien
        // pire, et c’est ce qui doit faire hésiter.
        //
        // ⚠️ ON RACONTE L’ÉCHEC AVANT DE TAPER, et ce n’est pas cosmétique.
        // `phraseDepuis` rend le PREMIER commentaire écrit sur mon joueur :
        // laisser `taperAuPied` parler en premier affichait « Coup de pied
        // rasant de Maxime Retière derrière la défense ! » sous une croix rouge.
        // Vu tel quel dans le journal de jeu — le verdict disait raté, la phrase
        // disait réussi, et c’est la phrase qu’on croit.
        dire(e, 'pied', p.cote, C.texteMatch('duelChipKo', { nom: p.nom }), 0, true);
        taperAuPied(e, p, 'rasant');
        return tranche(false, 'duelChipKo');
      }
      // ⚠️ ON REPREND DERRIÈRE LE RIDEAU, ET ÇA SE VOIT : le pion avance
      // vraiment de la longueur du coup de pied, ballon en main.
      const bond = 12 + p.pied / 12;
      p.pos.x = borner(p.pos.x + sens(p.cote) * bond, LIGNE_A + 0.5, LIGNE_B - 0.5);
      p.stats.metres += bond;
      p.stats.metresAuPied += bond;
      e.ballon = { x: p.pos.x, y: p.pos.y };
      for (const q of surLeTerrain(e, adverse(p.cote))) {
        if (q.sanction <= 0 && (q.pos.x - p.pos.x) * sens(p.cote) < 0) {
          q.battu = Math.max(q.battu, 2);
        }
      }
      dire(e, 'pied', p.cote, C.texteMatch('duelChipOk', { nom: p.nom }), 0, true);
      lancerEchappee(e, p);
      return tranche(true, 'choixArme');
    }
    case 'plongeon': {
      if (e.porteur !== p) return tropTard();
      consommerIntention(e);
      if (!reussi) {
        // Tenu à un mètre, ou le ballon qui glisse des mains dans le plongeon.
        if (e.rng() < 0.5) {
          enAvant(e, p);
          return tranche(false, 'duelPlongeonKo');
        }
        p.pos.x = borner(p.pos.x + sens(p.cote) * 1.2, LIGNE_A + 0.5, LIGNE_B - 0.5);
        if (adv) resoudrePlaquage(e, p, adv, true);
        return tranche(false, 'duelPlongeonKo');
      }
      // ⚠️ ON APLATIT, ET C’EST `tenterEssai` QUI TRANCHE. Le score reste celui
      // de la ligue : si le plan de marque est épuisé ou très en avance, le
      // ballon est « tenu en-but » et c’est un renvoi aux 22. Le geste a
      // parfaitement réussi ; c’est le match qui n’en voulait pas.
      p.pos.x = p.cote === 'A' ? LIGNE_B + 0.6 : LIGNE_A - 0.6;
      e.ballon = { x: p.pos.x, y: p.pos.y };
      tenterEssai(e, p);
      return tranche(true, 'choixArme');
    }
    case 'interception': {
      demanderAction(e, action);
      consommerIntention(e);
      const v = e.vol;
      if (!v || !v.receveur || v.receveur.cote === p.cote) return tropTard();
      if (!reussi) {
        // ⚠️ LE PRIX DE L’INTERCEPTION RATÉE : on est sorti de sa ligne, et le
        // trou qu’on laisse est immense. Sans ce revers, le geste serait
        // gratuit et se jouerait à chaque passe adverse.
        p.battu = Math.max(p.battu, 2.8);
        return tranche(false, 'duelInterceptionKo');
      }
      // Le ballon est cueilli en pleine course, et il n’y a plus personne.
      e.vol = null;
      e.lancement = null;
      e.phasesDepuisArret = 0;
      e.ligneAvantage = p.pos.x;
      donnerBallon(e, p, 0.4);
      p.stats.grattages += 1;
      turnoverJoueur(e, p);
      dire(e, 'franchissement', p.cote, C.texteMatch('duelInterceptionOk', { nom: p.nom }), 0, true);
      lancerEchappee(e, p);
      return tranche(true, 'choixArme');
    }
    case 'contreRuck': {
      demanderAction(e, action);
      consommerIntention(e);
      if (e.phase !== 'ruck' && e.phase !== 'maul') return tropTard();
      if (!reussi) {
        // ⚠️ UNE CONTRE-POUSSÉE RATÉE COÛTE, MÊME SANS COUP DE SIFFLET. Première
        // version : une pénalité une fois sur quatre, et RIEN les trois autres
        // fois — un bouton mort dans 72 % des cas, attrapé par l’empreinte
        // avant/après du banc d’essai. On s’est jeté dans le regroupement : on
        // en sort en retard, et le ballon ressort vite pour eux.
        p.battu = Math.max(p.battu, 1.4);
        e.ballonLent = false;
        if (e.rng() < 0.28) {
          siffler(e, e.possession, { x: e.ballon.x, y: e.ballon.y }, 'hors-jeu au ruck', p);
        }
        return tranche(false, 'duelContreRuckKo');
      }
      // ⚠️ LE PAQUET PASSE, ET LE BALLON EST À NOUS TOUT DE SUITE. `ballonLent`
      // à faux, c’est la différence entre un turnover et un turnover EXPLOITÉ :
      // sans ça, la défense adverse a le temps de se replacer et le ballon volé
      // ne vaut qu’une sortie de ruck ordinaire.
      p.stats.grattages += 1;
      e.possession = p.cote;
      e.ballonLent = false;
      e.gardeRuck = 0;
      e.phasesDepuisArret = 0;
      turnoverJoueur(e, p);
      dire(e, 'ruck', p.cote, C.texteMatch('duelContreRuckOk', { nom: p.nom }), 0, true);
      return tranche(true, 'choixArme');
    }

    // ── SANS BALLON ──────────────────────────────────────────────────────
    case 'appel':
    case 'soutien': {
      demanderAction(e, action);
      const l = e.lancement;
      if (!l || e.possession !== p.cote) return tropTard();
      if (!reussi) return tranche(false, 'duelAppelKo');
      // ⚠️ RÉUSSIR UN APPEL, C’EST ENTRER DANS LA COMBINAISON — pour de vrai.
      // On s’insère juste après le porteur courant : le prochain ballon est pour
      // nous. C’est la seule façon qu’un geste sans contact « se voie ».
      if (!l.chaine.includes(p)) l.chaine.splice(l.index + 1, 0, p);
      dire(e, 'jeu', p.cote, C.texteMatch('appelBallon', { nom }), 0, true);
      return tranche(true, 'choixArme');
    }

    default:
      demanderAction(e, action);
      return arme();
  }
}
