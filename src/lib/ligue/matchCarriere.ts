import { momentsDepuisFil } from './momentsForts.js';
import { exclusionsDepuisEtat, type ExclusionTV } from '../habillageTV.js';
// LE MATCH DE LA CARRIÈRE EN LIGNE — 80 minutes de rugby arbitrées par le serveur
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ ON NE STOCKE PAS UN MATCH, ON STOCKE DE QUOI LE REJOUER
// ═══════════════════════════════════════════════════════════════════════════
// `EtatMatch` (moteur/etat.ts) porte 46 pions avec leurs positions, leurs
// vecteurs vitesse, leurs statistiques, le fil de commentaires — et un `rng`
// qui est une FERMETURE. Rien de tout ça ne traverse un `JSON.stringify`, et
// l'écrire dans le jsonb d'une ligue à chaque tick coûterait plus cher que de
// rejouer le match.
//
// Ce qui est persisté tient en quatre choses, et elles suffisent :
//
//   1. la GRAINE — le moteur est déterministe, à pas fixe ;
//   2. les DEUX FEUILLES, gelées au coup d'envoi (un transfert conclu pendant
//      la rencontre ne peut donc pas changer l'équipe qui joue) ;
//   3. le JOURNAL des ordres, chacun daté à la MINUTE DE JEU où il a pris effet ;
//   4. l'horloge et le gel — voir plus bas.
//
// `rejouer()` reconstruit l'état exact à n'importe quelle minute. Deux managers
// qui regardent la même rencontre voient donc rigoureusement le même match :
// même score, mêmes essais, mêmes commentaires, même chrono. Ce n'est pas une
// synchronisation, c'est la même fonction pure appelée deux fois.
//
// ⚠️ COROLLAIRE, ET IL EST DUR : un ordre n'existe que s'il est au journal,
// avec sa minute. Muter l'état rejoué sans l'y écrire donne un match qui se
// contredit au rechargement suivant.
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ POURQUOI LES SCORES NE PARTENT PAS EN VRILLE
// ═══════════════════════════════════════════════════════════════════════════
// « Il ne faut surtout pas que la multiplication des actions provoque des
// scores absurdes du type 200-150. » Le moteur du jeu a ce garde-fou depuis
// l'origine : il reçoit un SCORE CIBLE par équipe, en tire un plan (tant
// d'essais transformés, tant d'essais secs, tant de pénalités) et refuse
// l'essai qui ferait dépasser ce plan — le ballon est tenu dans l'en-but,
// renvoi aux 22, ce qui est une vraie règle du rugby.
//
// La cible vient de la FORCE DES DEUX FEUILLES (`cibleDeScore`), avec la même
// formule que le championnat solo. Ce qui change en ligne, c'est
// `scoreSurTerrain` : le reliquat du plan n'est PAS soldé au coup de sifflet
// final. Le score affiché est donc celui qui a réellement été marqué — il peut
// rester sous la cible, jamais la dépasser franchement.
//
// Mesuré sur 400 rencontres (`npm run verify:carriere`).
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ L'HORLOGE EST CONTINUE — ET ELLE NE L'A PAS TOUJOURS ÉTÉ
// ═══════════════════════════════════════════════════════════════════════════
// `EtatMatch.minute` est un ENTIER (`Math.floor(t / 60)`). Tant que la rejoue
// s'arrêtait dessus, demander « le match à la 30ᵉ 03 » le poussait en réalité
// jusqu'à la 31ᵉ pile — puis plus rien pendant cinquante-sept secondes réelles,
// jusqu'à ce que l'horloge murale rattrape la 31ᵉ. Le direct était donc une
// PHOTO QUI SE TÉLÉPORTAIT UNE FOIS PAR MINUTE : le ballon passait de la ligne
// des 55 m à celle des 35 m sans qu'on ait rien vu, et « suivre le match »
// n'existait pas.
//
// La rejoue vise donc `e.t / 60` — les minutes de jeu au centième. Un sondage
// toutes les deux secondes avance le moteur de deux secondes de jeu, et les
// pions se déplacent d'une foulée, pas d'une phase entière.
//
// ⚠️ ET LE RÉSULTAT D'UN MATCH N'EN BOUGE PAS. Jouer d'un bloc, c'est pousser
// jusqu'à la 80ᵉ : `e.minute < 80` et `e.t / 60 < 80` s'arrêtent au MÊME tick,
// celui où `e.t` franchit 4 800. Les scores mesurés par le banc d'essai sont
// donc les mêmes qu'avant, à la virgule près.

import {
  appliquerTactiqueEquipe, avancer, bilan, choisirPenalite, creerMatch,
  demanderRemplacement, facteurHorloge, infoPenalite, patienter, type PenaliteEnCours,
} from '../moteur/moteur.js';
import type { EtatMatch, IntentionPied, Phase, TypeLancement, Vol, VolRecent } from '../moteur/etat.js';
import { combinaisonsValides, type Combinaison } from './combinaisons.js';
import type { Cote } from '../moteur/terrain.js';
import { corpsPourAffichage, porteurPourAffichage } from '../moteur/dynamique.js';
import { scorePossible } from '../championnat.js';
import { POSTES_BANC_MANAGER, POSTES_XV_MANAGER } from '../compositionManager.js';
import { adequationAuPoste, facteurDePerformance, rendementAuPoste } from '../carteJoueur.js';
import type { CompositionManager, PosteId, TactiqueManager } from '../../types.js';
import type { Coequipier } from '../effectif.js';
import { graine } from './aleatoire.js';
import {
  cadrerFilm, extraireChrono, extraireFilm, filmer, PAS_FILM, poidsFilm, type ChronoDirect, type FilmDirect, type RepereChrono,
} from './filmDirect.js';
import { marqueurDepuisEtat, ventPourLeTir, type MarqueurTV, type VentTV } from '../statsTV.js';

/** Les deux camps, nommés comme la rencontre les nomme. */
export type CoteEnLigne = 'domicile' | 'exterieur';
const COTES: readonly CoteEnLigne[] = ['domicile', 'exterieur'];
const MOTEUR: Record<CoteEnLigne, Cote> = { domicile: 'A', exterieur: 'B' };
const autre = (c: CoteEnLigne): CoteEnLigne => c === 'domicile' ? 'exterieur' : 'domicile';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LA STRATÉGIE — ce qu'un entraîneur règle, avant et pendant
// ═══════════════════════════════════════════════════════════════════════════

export type MentaliteEnLigne = 'tresDefensive' | 'defensive' | 'equilibree' | 'offensive' | 'tresOffensive';
export type JeuEnLigne = 'occupation' | 'possession' | 'jeuAuPied' | 'large' | 'axe' | 'rapide' | 'conservation';
export type RythmeEnLigne = 'ralentir' | 'normal' | 'accelerer';
export type DefenseEnLigne = 'conservatrice' | 'normale' | 'agressive';
export type RucksEnLigne = 'faible' | 'normal' | 'forte';
export type ChoixPenaliteEnLigne = 'points' | 'touche' | 'rapide' | 'melee';

/**
 * Les consignes enregistrées d'un club.
 *
 * ⚠️ ELLES SERVENT SURTOUT QUAND PERSONNE N'EST LÀ. « Un match ne doit jamais
 * bloquer toute la ligue » : si les deux managers sont absents, c'est cette
 * structure qui entraîne les deux équipes. Elle doit donc décrire un plan
 * complet, pas seulement une humeur — d'où les deux bascules de fin de match.
 */
export interface StrategieEnLigne {
  /** Cahier personnel ; les anciennes stratégies restent en mode automatique. */
  modeCombinaisons?: 'automatique' | 'configure';
  combinaisons?: Combinaison[];
  mentalite: MentaliteEnLigne;
  jeu: JeuEnLigne;
  rythme: RythmeEnLigne;
  defense: DefenseEnLigne;
  rucks: RucksEnLigne;
  /** Pénalité à moins de 35 mètres. */
  penaliteCourte: ChoixPenaliteEnLigne;
  /** Pénalité au-delà de 35 mètres. */
  penaliteLongue: ChoixPenaliteEnLigne;
  /** Mentalité prise automatiquement si l'équipe est menée après la 60ᵉ. */
  bascule60: MentaliteEnLigne;
  /** Mentalité prise si elle est menée de plus de 7 points après la 70ᵉ. */
  bascule70: MentaliteEnLigne;
  remplacements: 'precoces' | 'standard' | 'tardifs';
  /** Niveau de risque sur les passes, relances et soutiens offensifs. */
  risqueOffensif: 'prudent' | 'mesure' | 'audacieux';
  /** Fréquence voulue des coups de pied hors pénalités. */
  frequencePied: 'rare' | 'equilibree' | 'frequente';
  /** Plan automatiquement appliqué avec au moins huit points d'avance après la 65e. */
  gestionAvance: 'defensive' | 'equilibree' | 'offensive';
}

export const STRATEGIE_EN_LIGNE_DEFAUT: StrategieEnLigne = {
  modeCombinaisons: 'automatique', combinaisons: [],
  mentalite: 'equilibree', jeu: 'possession', rythme: 'normal', defense: 'normale',
  rucks: 'normal', penaliteCourte: 'points', penaliteLongue: 'touche',
  bascule60: 'offensive', bascule70: 'tresOffensive', remplacements: 'standard',
  risqueOffensif: 'mesure', frequencePied: 'equilibree', gestionAvance: 'defensive',
};

export const MENTALITES: readonly MentaliteEnLigne[] = ['tresDefensive', 'defensive', 'equilibree', 'offensive', 'tresOffensive'];
export const JEUX: readonly JeuEnLigne[] = ['occupation', 'possession', 'jeuAuPied', 'large', 'axe', 'rapide', 'conservation'];
export const RYTHMES: readonly RythmeEnLigne[] = ['ralentir', 'normal', 'accelerer'];
export const DEFENSES: readonly DefenseEnLigne[] = ['conservatrice', 'normale', 'agressive'];
export const RUCKS: readonly RucksEnLigne[] = ['faible', 'normal', 'forte'];
export const CHOIX_PENALITE: readonly ChoixPenaliteEnLigne[] = ['points', 'touche', 'rapide', 'melee'];

/**
 * Assainit une stratégie reçue du client.
 *
 * ⚠️ C'EST LA SEULE PORTE D'ENTRÉE. Le serveur ne fait jamais confiance à ce
 * qu'on lui envoie : une valeur inconnue ne provoque pas d'erreur, elle est
 * remplacée par le défaut. Un client bricolé ne peut donc pas inventer une
 * mentalité « invincible ».
 */
export function strategieValide(brut: unknown): StrategieEnLigne {
  const s = (brut ?? {}) as Partial<StrategieEnLigne>;
  const dans = <T extends string>(valeur: unknown, options: readonly T[], defaut: T): T =>
    options.includes(valeur as T) ? valeur as T : defaut;
  return {
    modeCombinaisons: s.modeCombinaisons === 'configure' ? 'configure' : 'automatique',
    combinaisons: combinaisonsValides(s.combinaisons),
    mentalite: dans(s.mentalite, MENTALITES, 'equilibree'),
    jeu: dans(s.jeu, JEUX, 'possession'),
    rythme: dans(s.rythme, RYTHMES, 'normal'),
    defense: dans(s.defense, DEFENSES, 'normale'),
    rucks: dans(s.rucks, RUCKS, 'normal'),
    penaliteCourte: dans(s.penaliteCourte, CHOIX_PENALITE, 'points'),
    penaliteLongue: dans(s.penaliteLongue, CHOIX_PENALITE, 'touche'),
    bascule60: dans(s.bascule60, MENTALITES, 'offensive'),
    bascule70: dans(s.bascule70, MENTALITES, 'tresOffensive'),
    remplacements: dans(s.remplacements, ['precoces', 'standard', 'tardifs'] as const, 'standard'),
    risqueOffensif: dans(s.risqueOffensif, ['prudent', 'mesure', 'audacieux'] as const, 'mesure'),
    frequencePied: dans(s.frequencePied, ['rare', 'equilibree', 'frequente'] as const, 'equilibree'),
    gestionAvance: dans(s.gestionAvance, ['defensive', 'equilibree', 'offensive'] as const, 'defensive'),
  };
}

/**
 * La stratégie devient le plan que le moteur comprend.
 *
 * ⚠️ TOUT NE TIENT PAS DANS `TactiqueManager`, et c'est voulu. Le moteur solo
 * connaît quatre plans d'attaque, trois défenses et trois rythmes ; la ligue en
 * ligne ajoute une mentalité, une consigne de ruck et une agressivité
 * défensive. Ce qui n'a pas d'équivalent ne se perd pas : il devient un
 * `impactSupplementaire`, l'ajustement de potentiel de marque que le moteur
 * applique déjà à toute modification tactique en cours de match. Une consigne
 * qui ne changerait rien au résultat serait décorative — c'est exactement ce
 * que la demande interdit.
 */
export function tactiqueDepuisStrategie(s: StrategieEnLigne): TactiqueManager {
  return {
    attaque: s.frequencePied === 'frequente' ? 'occupation'
      : s.jeu === 'large' || s.jeu === 'rapide' ? 'large'
      : s.jeu === 'occupation' || s.jeu === 'jeuAuPied' ? 'occupation'
        : s.jeu === 'axe' || s.jeu === 'conservation' ? 'avants' : 'equilibre',
    defense: s.defense === 'agressive' ? 'blitz' : s.defense === 'conservatrice' ? 'repli' : 'glissee',
    rythme: s.rythme === 'accelerer' ? 'intense' : s.rythme === 'ralentir' ? 'gestion' : 'normal',
    penalites: s.penaliteCourte === 'points' && s.penaliteLongue === 'points' ? 'points'
      : s.penaliteCourte === 'touche' && s.penaliteLongue === 'touche' ? 'touche'
        : 'mixte',
    remplacements: s.remplacements,
  };
}

/** Le supplément d'agressivité, en points de potentiel de marque. */
export function impactStrategie(s: StrategieEnLigne): number {
  const mentalite = { tresDefensive: -7, defensive: -3.5, equilibree: 0, offensive: 3.5, tresOffensive: 7 }[s.mentalite];
  const rucks = { faible: -2, normal: 0, forte: 2 }[s.rucks];
  const defense = { conservatrice: -1.5, normale: 0, agressive: 1.5 }[s.defense];
  const risque = { prudent: -2.5, mesure: 0, audacieux: 2.5 }[s.risqueOffensif];
  const pied = { rare: .8, equilibree: 0, frequente: 1.2 }[s.frequencePied];
  return mentalite + rucks + defense + risque + pied;
}

/** La mentalité réellement appliquée à cette minute, bascules comprises. */
export function mentaliteAppliquee(s: StrategieEnLigne, minute: number, ecart: number): MentaliteEnLigne {
  if (minute >= 65 && ecart >= 8) return s.gestionAvance;
  if (minute >= 70 && ecart <= -8) return s.bascule70;
  if (minute >= 60 && ecart < 0) return s.bascule60;
  return s.mentalite;
}

/**
 * Le choix de l'IA sur une pénalité, quand le manager n'est pas là.
 *
 * ⚠️ LA SITUATION PASSE AVANT LA CONSIGNE. « Toujours les points » à la 79ᵉ en
 * étant mené de cinq fait perdre le match à coup sûr : trois points ne
 * suffisent pas. La consigne décide du cas ordinaire, la fin de match décide du
 * reste — c'est ce qui rend une équipe abandonnée à l'IA encore crédible.
 */
export function decisionIA(
  s: StrategieEnLigne, distance: number, aPortee: boolean, minute: number, ecart: number,
): ChoixPenaliteEnLigne {
  if (!aPortee) return distance > 45 ? 'touche' : 'rapide';
  if (minute >= 65 && ecart < -3) return 'touche';
  if (minute >= 75 && ecart >= -3) return 'points';
  const consigne = distance < 35 ? s.penaliteCourte : s.penaliteLongue;
  return consigne === 'melee' && distance < 40 ? 'rapide' : consigne;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. L'ÉTAT PERSISTÉ
// ═══════════════════════════════════════════════════════════════════════════

export type CommandeMatchEnLigne =
  | { type: 'presence' }
  | { type: 'strategie'; strategie: StrategieEnLigne }
  | { type: 'remplacement'; sortantId: string; entrantId: string }
  | { type: 'decision'; choix: ChoixPenaliteEnLigne }
  /**
   * Le banc veille (ou ne veille plus) sur ses pénalités. ⚠️ ÉCRIT PAR LE
   * SERVEUR, jamais reçu d'un écran : c'est la présence du manager, datée comme
   * un ordre pour que toutes les instances arrêtent le jeu au même pas.
   */
  | { type: 'veille'; actif: boolean };

export interface EvenementMatchEnLigne {
  /**
   * La minute de jeu de l'ordre. Elle sert au fil et à l'affichage ; pour une
   * décision de pénalité, c'est la minute où le jeu s'est arrêté.
   */
  horloge: number;
  /**
   * La seconde SIMULÉE (pas du moteur, attentes comprises) où l'ordre prend
   * effet : l'heure de sa réception, donc une marge d'autorité devant le
   * moteur de toutes les instances. Absente sur les ordres d'avant le
   * Correctif 24, qui s'appliquent à leur minute de jeu.
   */
  sim?: number;
  cote: CoteEnLigne;
  commande: CommandeMatchEnLigne;
  /**
   * ⚠️ CET ORDRE EST CELUI DE L'ADJOINT, PAS DU MANAGER. Une décision de
   * pénalité laissée sans réponse est tranchée par l'IA d'après les consignes
   * enregistrées — et elle entre au journal exactement comme les autres, sinon
   * la rejoue ne la reproduirait pas. Le fil, lui, ne doit surtout pas écrire
   * « Tu prends les trois points » à quelqu'un qui n'a rien touché.
   */
  auto?: true;
  /**
   * Pas d'attente joués avant cette décision (`patienter`) : les joueurs se
   * replacent pendant que l'entraîneur réfléchit. Inscrit ici pour qu'une
   * rejoue à froid en refasse exactement autant.
   */
  attente?: number;
}

/** Un ordre de manager, tel que le fil le montre à CELUI QUI L'A DONNÉ. */
export type OrdreFil = 'consignes' | 'remplacement' | ChoixPenaliteEnLigne;

export interface LigneFil {
  id?: string; seconde?: number; score?: Paire;
  minute: number; texte: string; type: string; cote?: CoteEnLigne; points?: number;
  /**
   * ⚠️ UN ORDRE N'A PAS DE TEXTE ICI, IL A UNE CLÉ. `lib/ligue/` ne porte
   * aucune phrase affichable (l'écran est en sept langues) — et surtout, ces
   * lignes ne sont PAS dans le fil partagé : `vueMatchEnLigne` ne les ajoute
   * qu'au manager concerné. Écrire « consignes changées » dans le fil commun
   * dirait à l'adversaire quand on bouge, ce que `signalAdverse` s'applique
   * justement à ne laisser deviner qu'à moitié.
   */
  ordre?: OrdreFil;
  /** L'ordre a été tranché par l'adjoint, pas par le manager. */
  auto?: true;
}

// ═══════════════════════════════════════════════════════════════════════════
// LE TERRAIN, TEL QUE L'ÉCRAN LE REDESSINE
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ ON ENVOIE LES VITESSES, PAS SEULEMENT LES POSITIONS. Le serveur ne parle
// que toutes les deux secondes ; sans vecteur vitesse, l'écran n'aurait qu'un
// diaporama. Le rendu garde un relevé de retard et reconstruit soixante images
// par seconde entre deux vérités du moteur. Une passe entière manquée par le
// sondage est elle aussi reliée entre ses deux positions, jamais téléportée.
//
// ⚠️ ET LA CADENCE EST INDISPENSABLE. Elle indique explicitement le rapport
// entre horloge et mouvement, afin qu'une phase accélérée ne fasse pas
// traverser le terrain aux joueurs pendant une touche.

export interface PionDirect {
  id: string; numero: number; nom: string; poste: PosteId; cote: CoteEnLigne;
  x: number; y: number; vx: number; vy: number;
  numeroRole?: number;
  force?: number;
  tailleCm?: number;
  poidsKg?: number;
  corps?: { age: number; duree: number; direction: number; intensite: number; appuis?: number[]; bras?: number[] };
}

export interface VolDirect {
  /** Identifiant déterministe de l'action : identique pour tous les spectateurs. */
  id?: string;
  de: { x: number; y: number }; vers: { x: number; y: number };
  duree: number; ecoule: number; hauteur: number;
  type?: 'passe' | 'pied';
  intention?: IntentionPied | 'passe' | 'offload';
  /** Horodatage de l'action sur l'horloge du moteur, en secondes. */
  debut?: number;
  fin?: number;
  auteurId?: string;
  receveurId?: string;
  /** Graine visuelle stable, sans exposer la graine du match. */
  seed?: number;
}

export interface TerrainDirect {
  /** Discipline de tous les joueurs, y compris ceux sortis de la pelouse. */
  exclusionsTV?: ExclusionTV[];
  /** Le marqueur pendant la célébration, et le vent devant un tir posé (habillage TV). */
  marqueurTV?: MarqueurTV;
  ventTV?: VentTV;
  /** Les équipes ont changé de côté (seconde période) : le terrain s'affiche retourné. */
  cotesInverses?: boolean;
  periode?: 1 | 2;
  simulation?: number;
  gestes?: import('../moteur/dynamique.js').GesteMatch[];
  arbitre?: { x: number; y: number; vx: number; vy: number; regard: number };
  preparationTir?: {
    buteurId: string;
    progression: number;
    transformation: boolean;
    routine?: string;
    clipRoutine?: string;
    nomRoutine?: string;
    emojiRoutine?: string;
  };
  pions: PionDirect[];
  ballon: { x: number; y: number; hauteur?: number };
  ballonLibre?: { orientation: number; vitesseRotation: number; dernierRebondSim: number };
  /** Le pion qui porte le ballon : l'écran le colle à sa main. */
  porteurId?: string;
  vol?: VolDirect;
  phase: Phase;
  systeme: string;
  possession: CoteEnLigne;
  /** Contexte structuré de la séquence : le rendu l'interprète, sans rejouer le moteur. */
  sequence?: number;
  origine?: { x: number; y: number };
  ligneAvantage?: number;
  metresGagnes?: number;
  ballonLent?: boolean;
  ouvert?: 'gauche' | 'droite';
  lancement?: { type: TypeLancement; intention?: IntentionPied; combinaison?: string };
  /** Lecture visuelle de la conquête en cours : appel de touche ou poussée. */
  conquete?: {
    type: 'melee' | 'touche'; progression: number;
    combinaison?: 'premierBloc' | 'milieu' | 'fond' | 'leurreDevant';
    cibleId?: string; pousseVers?: CoteEnLigne;
    horsAlignement?: boolean; reception?: { x: number; y: number };
  };
  /** Aplatissage en cours, assez long pour être reconstruit entre deux relevés. */
  aplatissage?: { marqueurId: string; progression: number };
  /** Contact bref, utilisé pour synchroniser le plaqueur et la chute du porteur. */
  contact?: { porteurId: string; plaqueurId: string; progression: number };
  /** Secondes SIMULÉES écoulées par seconde réelle dans la phase en cours. */
  cadence: number;
  /** Minutes de jeu au centième au moment du relevé. */
  horloge: number;
  /** Même instant en secondes, assez précis pour rejouer une passe de 250 ms. */
  instantJeu?: number;
  /** Vols terminés récemment, conservés car ils peuvent tenir entre deux relevés. */
  volsRecents?: VolDirect[];
  /** Instant serveur d'émission : le client absorbe le jitter avec cette horloge. */
  emisLe?: number;
  /** Numéro monotone du relevé dans la simulation autoritaire. */
  snapshot?: number;
  /** La décision de l'arbitre, tant qu'elle est fraîche (secondes simulées). */
  sifflet?: { cle: string; club: string; fautif: string; restant: number };
  /** Données de l'arbitrage vidéo TMO pour l'affichage broadcast TV */
  tmo?: { actif: boolean; action: string; tempsRestant: number; decision: string; explication?: string; cadreCamera?: string };
}

/**
 * ⚠️ ON NE RÉVEILLE LE MANAGER QUE DANS LES 50 MÈTRES ADVERSES.
 *
 * Demande, mot pour mot : « quand il y a une pénalité dans les 50 mètres
 * adverses à son avantage il peut décider de la pénalité ». C'est aussi la
 * seule zone où la question se pose : à 70 mètres des poteaux, « je prends les
 * trois points ? » n'est pas un choix, c'est une faute de goût — l'ouvreur
 * dégage, et personne n'a besoin d'un entraîneur pour ça.
 *
 * Le chiffre compte double, parce que CHAQUE décision gèle le chronomètre le
 * temps qu'on réponde : toutes pénalités confondues, c'était douze arrêts par
 * match. Les pénalités hors zone repartent donc sans interruption, exactement
 * comme si personne ne regardait.
 */
export const METRES_DECISION = 50;

export interface DecisionEnAttente {
  cote: CoteEnLigne; distance: number; angle: number; probabilite: number;
  buteur: string; horloge: number;
  /** Le buteur peut-il raisonnablement tenter les poteaux d'ici ? */
  aPortee: boolean;
  /** Date limite réelle (ms). Passée, l'IA tranche et le jeu repart. */
  jusqua: number;
  /**
   * Déduite du moteur à chaque lecture, jamais écrite pour elle-même. Sans
   * cette marque, c'est une décision restée en attente sous l'ancien moteur.
   */
  derivee?: 1;
}

export interface StatsEquipeMatch {
  possession: number; essais: number; penalitesTentees: number; penalitesReussies: number;
  plaquages: number; metres: number; turnovers: number; cartons: number;
}

export interface LigneFeuilleMatch {
  carteId: string; nom: string; numero: number; poste: PosteId; cote: CoteEnLigne;
  minutes: number; essais: number; plaquages: number; metres: number;
  butsTentes: number; butsReussis: number; cartons: number;
}

/** Une équipe telle qu'on la présente au coup d'envoi. */
export interface EquipeMatchEnLigne {
  clubId: string;
  nom: string;
  effectif: Coequipier[];
  composition: CompositionManager;
  strategie?: StrategieEnLigne;
  /**
   * Le collectif du XV, de 0 à 100 (`collectifCarriere`).
   *
   * ⚠️ IL NE SERT PLUS SEULEMENT À AJUSTER LES NOTES. Demande : « il faut que
   * le collectif compte dans l'influence du jeu aussi sur les erreurs entre
   * équipiers ». Le voici donc porté jusqu'au moteur, qui en fait ce que
   * personne d'autre ne peut faire : une passe qui part devant, un ballon
   * lâché à la réception, un offload donné dans le vide.
   */
  collectif?: number;
}

/** La feuille GELÉE : 1 → 23, plus le brassard, la cible et le collectif. */
export interface FeuilleGelee {
  clubId: string; nom: string; feuille: Coequipier[]; capitaineId: string; buteurId: string;
  /**
   * ⚠️ GELÉ AVEC LA FEUILLE, ET C'EST INDISPENSABLE. Le collectif se calcule
   * depuis les cartes du club ; un transfert conclu à la 50ᵉ minute changerait
   * la valeur, donc la rejoue, donc le score déjà annoncé. Il vit ici comme le
   * reste de la feuille : figé au coup d'envoi.
   *
   * Absent sur les matchs créés avant cette règle : le moteur retombe alors
   * sur le neutre, et ces rencontres se rejouent exactement comme avant.
   */
  collectif?: number;
}

export interface ParametresCreationMatch {
  id: string;
  domicile: EquipeMatchEnLigne;
  exterieur: EquipeMatchEnLigne;
  /** Coup d'envoi réel, en millisecondes. */
  debut: number;
  /** Entier tiré par la ligue : il rend la rencontre unique et rejouable. */
  graine: number;
}

export type Paire = Record<CoteEnLigne, number>;

export interface EtatMatchEnLigne {
  id: string;
  cle: string;
  /** Coup d'envoi réel (ms). `enregistrerResultat` s'en sert pour l'origine. */
  debut: number;
  /** Millisecondes réelles gelées par les décisions en attente. */
  gel: number;
  /** Minutes de jeu validées, 0 → 80. */
  horloge: number;
  cibles: Paire;
  /**
   * ⚠️ EFFACÉES À LA SIRÈNE. Deux feuilles de 23, ce sont 6 Ko par rencontre :
   * gardées sur les 380 matchs d'une saison à vingt clubs, la ligue pèserait
   * deux mégaoctets réécrits à chaque action. Une fois le match terminé, le
   * score, le fil et la feuille de match suffisent à tout raconter.
   */
  equipes?: Record<CoteEnLigne, FeuilleGelee>;
  /** Consignes au coup d'envoi ; les changements datés restent au journal. */
  strategies: Record<CoteEnLigne, StrategieEnLigne>;
  journal: EvenementMatchEnLigne[];
  decision?: DecisionEnAttente;
  /** Dernière présence connue d'un manager devant son match (ms). */
  presence: Partial<Record<CoteEnLigne, number>>;
  termine: boolean;
  score: Paire;
  essais: Paire;
  /** Pénalités et drops RÉUSSIS — les objectifs de la ligue les comptent. */
  penalites: Paire;
  fil: LigneFil[];
  stats: Record<CoteEnLigne, StatsEquipeMatch>;
  feuille?: LigneFeuilleMatch[];
  /**
   * Les règles du moteur pour CETTE rencontre, gelées au coup d'envoi.
   *
   * ⚠️ UN MATCH SE REJOUE AVEC LES RÈGLES QUI L'ONT VU NAÎTRE. Absent (ou 1) :
   * le moteur d'origine — mêlées et touches installées d'un coup, phases sur
   * minuterie. 2 : le placement se joue (personne n'est déplacé d'un coup, la
   * phase attend ses joueurs) et le match suit la cadence détaillée des matchs
   * en trois dimensions. 4 : les règles 3, plus la lecture locale du porteur
   * (intervalles, deux contre un, feinte de passe : IA de niveau 3). 3 : les règles 2, plus l'IA par poste des matchs de
   * carrière (`moteur/ia/`), étalonnée pour quatre-vingts minutes réelles.
   * Une rencontre en cours au moment d'une mise en ligne garde donc son
   * moteur, et son score déjà annoncé.
   */
  regles?: number;
}

/**
 * Les règles données aux rencontres créées à partir de maintenant.
 * ⚠️ LA REMETTRE À 1 SUFFIT À REVENIR EN ARRIÈRE pour les prochains matchs :
 * ceux déjà créés gardent les leurs.
 */
// Règles 5 (Correctif 24) : les conquêtes lisibles du solo (touche, ruck, mêlée, maul : IA de niveau 4) et le jeu vivant (niveau 5).
export const REGLES_MATCH_EN_LIGNE = 5;
/**
 * Défense resserrée des règles 2 : la cadence détaillée marque davantage, ce
 * réglage ramène le nombre d'essais à celui des matchs de ligue d'avant
 * (mesuré : voir `scripts/mesurerReglesLigue.ts`).
 */
export const RESSERREMENT_REGLES_2 = 1;
/**
 * Le niveau d'IA du moteur (`EtatMatch.ia`) que demande une règle de match.
 * ⚠️ Une retouche de l'IA par poste change la rejoue des matchs en règles 3
 * déjà commencés : la porter par un nouveau niveau, donc une nouvelle règle.
 */
// Règles 4 : le porteur lit ce qu'il a devant lui (`moteur/ia/vision.ts`, IA de niveau 3).
export const iaDesRegles = (regles: number | undefined): number | undefined => ((regles ?? 1) >= 5 ? 5 : (regles ?? 1) >= 4 ? 3 : (regles ?? 1) >= 3 ? 2 : undefined);

/** Ce que le client reçoit : jamais la graine, jamais le plan d'en face. */
export interface VueMatchEnLigne {
  moments?: import('./momentsForts.js').MomentFort[];
  gele?: boolean;
  id: string;
  /** Identite du coup d'envoi : distingue une vraie relance d'une vieille reponse. */
  instance?: number;
  terrain?: TerrainDirect;
  /** Côté écran seulement : les repères des parties lentes réellement affichées (`fusionDirect.ts`). */
  reperesDirect?: string;
  /**
   * Les pas du moteur depuis le dernier que l'écran connaît (`filmDirect.ts`).
   * Envoyé À LA PLACE du relevé `terrain` quand l'écran le demande.
   */
  film?: FilmDirect;
  /** La chronologie (film v2) : pistes, événements datés, somme de contrôle. */
  chrono?: ChronoDirect;
  minute: number;
  /** La même, au centième : l'écran fait avancer son chrono entre deux relevés. */
  horloge: number;
  termine: boolean;
  score: Paire;
  essais: Paire;
  penalites: Paire;
  fil: LigneFil[];
  stats: Record<CoteEnLigne, StatsEquipeMatch>;
  feuille?: LigneFeuilleMatch[];
  monCote?: CoteEnLigne;
  maStrategie?: StrategieEnLigne;
  decision?: DecisionEnAttente;
  /** Clé i18n : « l'adversaire semble jouer beaucoup plus offensivement ». */
  signalAdverse?: string;
  remplacementsFaits: number;
  surLeTerrain: { carteId: string; nom: string; numero: number; poste: PosteId }[];
  surLeBanc: { carteId: string; nom: string; numero: number; poste: PosteId }[];
  /**
   * Vue allégée d'un match TERMINÉ, dans la vue de la ligue : score, chrono et statistiques d'équipe seulement.
   * Le fil, les temps forts et la feuille (56 Ko par match) se demandent à l'ouverture du match.
   */
  resume?: true;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LE TEMPS
// ═══════════════════════════════════════════════════════════════════════════

/** Une minute de rugby correspond à une minute réelle, hors arrêts de décision. */
export const MS_PAR_MINUTE = 60_000;
/**
 * Ce qu'un manager a pour trancher une pénalité avant que l'adjoint ne le fasse.
 * ⚠️ Vingt-six secondes de serveur en font dix-sept à l'écran : l'image arrive
 * avec le retard de la marge d'autorité, puis celui du tampon de lecture.
 */
export const DELAI_DECISION = 26_000;
/** Au-delà, on considère que le manager a fermé l'onglet. */
export const DELAI_PRESENCE = 45_000;
/** Un match lancé puis oublié se termine tout seul au bout de ce délai. */
export const DUREE_REELLE = 80 * MS_PAR_MINUTE;

/**
 * ═══ LA MARGE D'AUTORITÉ (Correctif 24) ══════════════════════════════════════
 *
 * ⚠️ 1 MATCH = 1 SIMULATION = N SPECTATEURS. Un match n'est pas calculé par UN
 * serveur : chaque instance serverless rejoue le sien, de la graine et du
 * journal. Elles ne donnent le même match que si elles connaissent le même
 * journal AU MOMENT où elles jouent une seconde donnée. Or un ordre écrit par
 * une instance n'est connu des autres que quelques secondes plus tard (l'en-tête
 * de la ligue n'est relu que toutes les trois secondes).
 *
 * Avant, chaque instance jouait jusqu'à « maintenant ». Un ordre, une décision
 * de pénalité ou la simple présence d'un manager (connue d'une seule instance)
 * tombait donc DANS LE PASSÉ des autres : elles avaient déjà joué — et montré —
 * une autre suite, et devaient tout recalculer. De là les retours en arrière,
 * les téléportations et les spectateurs qui ne voyaient pas la même action.
 *
 * Désormais :
 *   · le moteur joue jusqu'à « maintenant − MARGE_AUTORITE », jamais au-delà ;
 *   · un ordre reçu maintenant est daté de « maintenant » : il prend effet
 *     DEVANT toutes les instances, qui ont la marge entière pour l'apprendre ;
 *   · ce qui a été joué est donc DÉFINITIF : aucune instance ne recalcule ni ne
 *     contredit jamais un pas déjà montré.
 *
 * La marge couvre la relecture de l'en-tête (3 s), l'écriture en base et l'écart
 * d'horloge entre deux machines. Elle vaut huit quanta du moteur.
 */
export const MARGE_AUTORITE = 4.8;

/** La seconde simulée (attentes de décision comprises) que le serveur a le droit de jouer à cette heure. */
export function simCible(etat: Pick<EtatMatchEnLigne, 'debut'>, maintenant: number): number {
  return Math.max(0, (maintenant - etat.debut) / 1000 - MARGE_AUTORITE);
}
/** La seconde simulée où prendra effet un ordre reçu à cette heure : devant toutes les instances. */
export function simOrdre(etat: Pick<EtatMatchEnLigne, 'debut'>, maintenant: number): number {
  return Math.max(0, (maintenant - etat.debut) / 1000);
}

/**
 * La minute de jeu visée à cette heure — une estimation pour l'affichage (elle
 * ignore les attentes de décision). ⚠️ ELLE NE RECULE JAMAIS : deux instances
 * n'ont pas la milliseconde exacte.
 */
export function minuteCible(etat: EtatMatchEnLigne, maintenant: number): number {
  return Math.max(etat.horloge, Math.min(80, simCible(etat, maintenant) / 60));
}

/**
 * Les minutes de jeu du moteur, AU CENTIÈME.
 *
 * ⚠️ ET PAS `e.minute`, QUI EST UN ENTIER. Toute la rejoue vise cette valeur :
 * s'arrêter sur `e.minute` revient à ne jamais s'arrêter ailleurs qu'au début
 * d'une minute, donc à jouer le direct par bonds de soixante secondes.
 */
const minuteExacte = (e: EtatMatch): number => Math.min(80, e.t / 60);

export function presenceActive(etat: EtatMatchEnLigne, cote: CoteEnLigne, maintenant: number): boolean {
  const vu = etat.presence[cote];
  return Boolean(vu && maintenant - vu < DELAI_PRESENCE && maintenant + 1 >= vu);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. LA CIBLE DE SCORE
// ═══════════════════════════════════════════════════════════════════════════

/** La force d'une feuille : le XV pèse presque quatre fois le banc. */
/** Les 23 postes de la feuille, dans l'ordre 1 → 23. */
const POSTES_FEUILLE = [...POSTES_XV_MANAGER, ...POSTES_BANC_MANAGER];

/**
 * La feuille gelée d'une équipe — et LE seul endroit où un joueur hors de son
 * poste paie ce qu'il coûte.
 *
 * ⚠️ POURQUOI LA NOTE, ET PAS UN REFUS. Composer librement fait partie du jeu :
 * on aligne un troisième ligne au centre quand on n'a personne d'autre, et
 * l'écran promet que ça « perd la cohérence collective ». La règle serveur ne
 * juge donc plus le placement (sauf la première ligne, où le règlement
 * commande) ; c'est ici que le prix se paie, une fois pour toutes, au moment
 * de geler la feuille.
 *
 * ⚠️ ET LE PRIX SE PAIE PARTOUT D'UN COUP, parce que la feuille gelée est
 * l'unique entrée du moteur : `forceFeuille` en tire la puissance de l'équipe,
 * `cibleDeScore` en tire le score visé, et chaque duel lit la note du pion.
 * Une seule multiplication suffit à faire descendre les trois.
 *
 * ⚠️ ELLE NE CHANGE RIEN AUX MATCHS DÉJÀ CRÉÉS. Une rencontre garde la feuille
 * gelée à sa création et se rejoue depuis elle : les matchs en cours quand
 * cette règle est arrivée continuent avec l'ancien barème, sans rupture de
 * déterminisme.
 *
 * Le barème est celui du jeu entier (`rendementAuPoste`, dans `carteJoueur.ts`) :
 * 100 % à son poste ou à son poste secondaire, 82 % hors poste, 64 % à
 * contre-emploi (un avant chez les arrières), 60 ou 50 % pour une première
 * ligne improvisée. ⚠️ PLUS AUCUN PLACEMENT N'EST REFUSÉ (Correctif 24) : même la
 * première ligne se compose librement, et se paie ici.
 */
export function feuilleGeleeEnLigne(
  effectif: readonly Coequipier[], composition: CompositionManager,
): Coequipier[] {
  const parId = new Map(effectif.map(j => [j.id, j]));
  return [...composition.titulaires, ...composition.remplacants].map((id, i) => {
    const joueur = parId.get(id);
    if (!joueur) return null;
    const poste = POSTES_FEUILLE[i] ?? joueur.poste;
    // Le XV paie son placement au barème entier (`rendementAuPoste` : un contre-emploi coûte bien plus qu'un simple
    // hors-poste). Le banc garde le barème d'avant : il n'occupe aucun poste tant qu'il n'est pas entré.
    const facteur = i < 15 ? rendementAuPoste(joueur.poste, poste, joueur.postesSecondaires)
      : facteurDePerformance(adequationAuPoste(joueur.poste, poste, joueur.postesSecondaires));
    // Le numéro dans le dos devient celui du poste occupé — c'est déjà ce que
    // faisait `feuilleDepuisComposition`, et le moteur en a besoin pour la
    // mêlée, la touche et les remplacements.
    return { ...joueur, poste, note: Math.round(joueur.note * facteur) };
  }).filter((j): j is Coequipier => j !== null);
}

export function forceFeuille(feuille: readonly Coequipier[]): number {
  if (!feuille.length) return 35;
  const moyenne = (l: readonly Coequipier[]) => l.length ? l.reduce((s, j) => s + j.note, 0) / l.length : 0;
  const xv = feuille.slice(0, 15);
  const banc = feuille.slice(15);
  return banc.length ? moyenne(xv) * 0.78 + moyenne(banc) * 0.22 : moyenne(xv);
}

/**
 * Le score visé par chaque équipe. Le GEN donne un avantage, pas un verdict :
 * son écart est comprimé, le collectif intervient séparément, le domicile vaut
 * environ quatre points et la performance du jour autorise de vraies surprises.
 */
export function cibleDeScore(
  forceD: number, forceE: number, cle: string,
  collectifD = 50, collectifE = 50,
): Paire {
  const rng = graine(`cible#${cle}`);
  const ecartForce = forceD - forceE;
  const influenceForce = Math.sign(ecartForce) * Math.pow(Math.abs(ecartForce), 0.75) * 2;
  const influenceCollectif = (Math.max(0, Math.min(100, collectifD)) - Math.max(0, Math.min(100, collectifE))) * 0.075;
  const avantageDomicile = 3.8;
  // Une forme indépendante par équipe (météo, confiance, réussite, cartons…).
  // Elle change le match sans gommer la construction de l'effectif.
  const formeD = rng() * 22 - 11;
  const formeE = rng() * 22 - 11;
  // Dans environ un match déséquilibré sur dix, l'outsider surperforme : une
  // surprise reste rare, mais elle n'est plus mathématiquement étouffée.
  const surprise = Math.abs(ecartForce) >= 3 && rng() < 0.10
    ? -Math.sign(ecartForce) * (3 + rng() * 4)
    : 0;
  const ecart = avantageDomicile + influenceForce + influenceCollectif + surprise;
  return {
    domicile: scorePossible(21 + ecart / 2 + formeD),
    exterieur: scorePossible(21 - ecart / 2 + formeE),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. LA REJOUE — UNE SEULE LIGNE DE TEMPS PAR MATCH
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ce que le moteur ne porte pas lui-même et que la rejoue doit retenir : où elle
 * en est du journal, et ce que le journal lui a déjà appris.
 *
 * ⚠️ TOUT CE QUI FAIT S'ARRÊTER LE MOTEUR VIENT DU JOURNAL. La présence d'un
 * manager n'est connue que de l'instance qui reçoit ses sondages : s'arrêter
 * sur une pénalité « parce qu'il est là » donnait deux matchs différents sur
 * deux instances. Sa présence entre donc au journal (`veille`), datée comme un
 * ordre, et toutes les instances s'arrêtent — ou non — au même pas.
 */
interface Annexe {
  /** Ordres du journal déjà appliqués à ce moteur. */
  appliques: number;
  /** Signature du dernier ordre appliqué : un journal qui n'en est plus la suite fait remonter le match. */
  signature: string;
  /** Les bancs qui veulent trancher leurs pénalités, d'après le journal. */
  veille: Record<Cote, boolean>;
  /** La dernière consigne APPLIQUÉE de chaque banc : c'est elle que lisent les bascules et l'adjoint. */
  strategies: Record<CoteEnLigne, StrategieEnLigne>;
  /** Bascules tactiques (60ᵉ, 65ᵉ, 70ᵉ) déjà passées. */
  bascules: number;
  /** `e.sim` à la frontière précédente : un ordre qui était déjà dû là est arrivé trop tard. */
  simAvant: number;
  /** Seconde simulée du dernier ordre appliqué (les ordres s'appliquent dans l'ordre du journal). */
  dernierEffet: number;
  /** Le moteur est en train d'être rejoué depuis le coup d'envoi. */
  froid: boolean;
}

/**
 * ⚠️ LE CACHE EST UNE OPTIMISATION, JAMAIS UNE MÉMOIRE. Un processus serverless
 * qui démarre à froid retrouve le match à l'identique en le rejouant.
 *
 * ⚠️ ET SA CLÉ NE CONTIENT PLUS LE NOMBRE D'ORDRES. Un ordre de plus faisait
 * recalculer le match entier depuis le coup d'envoi sur toutes les AUTRES
 * instances — quinze consignes, quinze rejoues de quatre-vingts minutes. Les
 * ordres sont datés DEVANT le moteur (`MARGE_AUTORITE`) : il les rencontre en
 * avançant, comme le reste.
 */
interface EntreeCacheMoteur { moteur: EtatMatch; annexe: Annexe; octets: number }
let CACHE = new Map<string, EntreeCacheMoteur>();
const MOTEUR_VERS_COTE: Record<Cote, CoteEnLigne> = { A: 'domicile', B: 'exterieur' };
/**
 * 16 entrées obligeaient 384 matchs sur 400 à repartir du coup d'envoi à la
 * requête suivante. Le cache est désormais dimensionné pour la charge cible,
 * mais aussi borné en mémoire : une fonction chaude ne grossit jamais sans
 * limite si les commentaires d'un match deviennent exceptionnellement longs.
 */
const CACHE_MAX = 512;
// ⚠️ 96 Mio tenaient 190 directs REGARDÉS (un moteur filmé pèse 0,5 Mio) : au-delà, les
// moteurs sortaient du cache et chaque sondage rejouait son match depuis le coup
// d'envoi — mesuré à 300 matchs, 30 ms par requête au lieu de 4,5 et un film troué.
const CACHE_OCTETS_MAX = 256 * 1024 * 1024;
let cacheOctets = 0;
/** Le coup d'envoi fait partie de la clé : le laboratoire relance un match sous le même identifiant. */
const cleCache = (etat: EtatMatchEnLigne) => `${etat.cle}@${etat.debut}`;

function supprimerCache(cle: string): void {
  cacheOctets -= CACHE.get(cle)?.octets ?? 0;
  CACHE.delete(cle);
}

function poidsMoteur(moteur: EtatMatch): number {
  // Estimation volontairement prudente et O(1), pour ne pas sérialiser trente
  // joueurs à chacun des ticks du direct. Les fermetures et références du RNG
  // ne sont de toute façon pas mesurables par JSON.stringify.
  return 48 * 1024 + moteur.pions.length * 2_048 + moteur.commentaires.length * 320 + poidsFilm(moteur);
}

function ranger(cle: string, entree: EntreeCacheMoteur): void {
  if (CACHE.has(cle)) supprimerCache(cle);
  entree.octets = poidsMoteur(entree.moteur);
  CACHE.set(cle, entree);
  cacheOctets += entree.octets;
  while (CACHE.size > CACHE_MAX || cacheOctets > CACHE_OCTETS_MAX) {
    const plusAncienne = CACHE.keys().next().value;
    if (plusAncienne === undefined) break;
    supprimerCache(plusAncienne);
  }
}

/** Mesure légère utilisée par le banc de charge, jamais envoyée aux joueurs. */
export function diagnosticCacheMatchEnLigne() {
  return { matchs: CACHE.size, octetsEstimes: cacheOctets, maximumMatchs: CACHE_MAX, maximumOctets: CACHE_OCTETS_MAX, rejouesAFroid, retards, reprises };
}
/** Compteurs du banc : rejoues depuis le coup d'envoi, et ordres arrivés derrière le moteur. */
let rejouesAFroid = 0;
let retards = 0;
/**
 * Banc : un processus ne tient qu'UN cache de moteurs, alors qu'en production
 * chaque instance serverless a le sien. Pour éprouver « plusieurs instances »
 * dans un seul processus, le banc range chacune dans son espace et bascule de
 * l'un à l'autre avant chaque requête.
 */
const ESPACES = new Map<string, { cache: Map<string, EntreeCacheMoteur>; octets: number }>();
let espaceCourant = '';
export function espaceMoteursPourBanc(nom: string): void {
  if (nom === espaceCourant) return;
  ESPACES.set(espaceCourant, { cache: CACHE, octets: cacheOctets });
  const suivant = ESPACES.get(nom) ?? { cache: new Map<string, EntreeCacheMoteur>(), octets: 0 };
  CACHE = suivant.cache; cacheOctets = suivant.octets; espaceCourant = nom;
}

/**
 * La pénalité qui MÉRITE qu'on réveille un entraîneur : à son avantage, dans
 * les 50 mètres adverses, et pour un banc qui veille.
 *
 * ⚠️ ELLE SERT AUX DEUX BOUTS, ET C'EST OBLIGATOIRE. La rejoue s'arrête
 * dessus ; `avancerMatchEnLigne` en fait une décision. Si les deux critères
 * divergeaient d'un mètre, le moteur s'arrêterait sur une pénalité dont
 * personne ne ferait jamais rien.
 */
function penaliteADecider(e: EtatMatch, camps: readonly Cote[]): PenaliteEnCours | null {
  if (e.fini || e.phase !== 'penalite' || !e.penalite) return null;
  if (!camps.includes(e.penalite.pour)) return null;
  const info = infoPenalite(e);
  return info && info.distance <= METRES_DECISION ? info : null;
}

/** Le délai de décision, au pas du moteur. */
const PAS_ATTENTE_MAX = Math.round(DELAI_DECISION / (PAS_FILM * 1000));
/** Le moteur avance par quanta de 0,6 s : c'est sur ces frontières que les ordres prennent effet. */
const QUANTUM = 0.6;
const SEUILS_BASCULE = [60, 65, 70] as const;
const signature = (ev: EvenementMatchEnLigne): string =>
  `${ev.sim ?? ''}:${ev.horloge}:${ev.cote}:${ev.commande.type}:${ev.attente ?? ''}`;
const campsEnVeille = (a: Annexe): Cote[] => (['A', 'B'] as const).filter((c) => a.veille[c]);

/** La consigne d'un camp telle que le journal la donnait à une minute donnée. */
function strategieA(etat: EtatMatchEnLigne, cote: CoteEnLigne, horloge: number): StrategieEnLigne {
  let s = strategieValide(etat.strategies[cote]);
  for (const ev of etat.journal) {
    if (ev.horloge > horloge) continue;
    if (ev.cote === cote && ev.commande.type === 'strategie') s = strategieValide(ev.commande.strategie);
  }
  return s;
}

/** Le banc veille-t-il, d'après TOUT le journal (ordres à venir compris) ? Et depuis quelle seconde simulée. */
function veilleAuJournal(journal: readonly EvenementMatchEnLigne[], cote: CoteEnLigne): { actif: boolean; sim: number } {
  for (let i = journal.length - 1; i >= 0; i--) {
    const ev = journal[i];
    if (ev.cote === cote && ev.commande.type === 'veille') return { actif: ev.commande.actif, sim: ev.sim ?? 0 };
  }
  return { actif: false, sim: 0 };
}

function appliquerAuMoteur(e: EtatMatch, a: Annexe, ev: EvenementMatchEnLigne): void {
  const cote = MOTEUR[ev.cote];
  const c = ev.commande;
  if (c.type === 'strategie') {
    const ecart = cote === 'A' ? e.scoreA - e.scoreB : e.scoreB - e.scoreA;
    const effective: StrategieEnLigne = { ...c.strategie, mentalite: mentaliteAppliquee(c.strategie, e.minute, ecart) };
    appliquerTactiqueEquipe(e, cote, tactiqueDepuisStrategie(effective), true, impactStrategie(effective));
    e.plansCombinaisons ??= {};
    const plans = effective.modeCombinaisons === 'configure' ? effective.combinaisons ?? [] : [];
    const cahierModifie = JSON.stringify(e.plansCombinaisons[cote] ?? []) !== JSON.stringify(plans);
    e.plansCombinaisons[cote] = plans;
    // Un ordre en direct prend effet à la prochaine phase de jeu.
    if (cahierModifie && e.combinaisonPreparee?.cote === cote) e.combinaisonPreparee = undefined;
    a.strategies[ev.cote] = strategieValide(c.strategie);
  } else if (c.type === 'remplacement') {
    demanderRemplacement(e, cote, c.entrantId, c.sortantId);
  } else if (c.type === 'decision') {
    choisirPenalite(e, cote, c.choix);
  } else if (c.type === 'veille') {
    a.veille[cote] = c.actif;
  }
}

function monter(etat: EtatMatchEnLigne): EntreeCacheMoteur {
  const equipes = etat.equipes;
  if (!equipes) throw new Error('Ce match est terminé : ses feuilles ont été archivées.');
  const strategieD = strategieA(etat, 'domicile', 0);
  const strategieE = strategieA(etat, 'exterieur', 0);
  const regles2 = (etat.regles ?? 1) >= 2;
  const niveauIA = iaDesRegles(etat.regles);
  const e = creerMatch(
    equipes.domicile.nom, equipes.exterieur.nom,
    equipes.domicile.feuille, equipes.exterieur.feuille,
    etat.cibles.domicile, etat.cibles.exterieur, etat.cle, undefined,
    {
      rng: rngReprenable(`match#${etat.cle}`),
      // ⚠️ LE CŒUR DU DIRECT. Les déplacements restent à vitesse naturelle et
      // chaque arrêt utilise sa durée directe, courte mais lisible.
      tempsReel: true,
      scoreSurTerrain: true,
      // Règles 2 : voir `EtatMatchEnLigne.regles`.
      cadenceDetaillee: regles2, placementJoue: regles2,
      resserrement: regles2 ? RESSERREMENT_REGLES_2 : undefined,
      // Règles 3 : l'IA par poste. Le niveau est figé avec la règle du match.
      ...(niveauIA ? { ia: niveauIA } : {}),
      compositionA: equipes.domicile.feuille, compositionB: equipes.exterieur.feuille,
      tactiqueA: tactiqueDepuisStrategie(strategieD), tactiqueB: tactiqueDepuisStrategie(strategieE),
      capitaineAId: equipes.domicile.capitaineId, capitaineBId: equipes.exterieur.capitaineId,
      buteurAId: equipes.domicile.buteurId, buteurBId: equipes.exterieur.buteurId,
      cohesionA: equipes.domicile.collectif, cohesionB: equipes.exterieur.collectif,
    },
  );
  e.impactBanc = { A: impactStrategie(strategieD), B: impactStrategie(strategieE) };
  e.plansCombinaisons = {
    A: strategieD.modeCombinaisons === 'configure' ? strategieD.combinaisons ?? [] : [],
    B: strategieE.modeCombinaisons === 'configure' ? strategieE.combinaisons ?? [] : [],
  };
  // La caméra du direct : elle observe, et ne filme que les dernières secondes.
  filmer(e);
  rejouesAFroid++;
  return {
    moteur: e, octets: 0,
    annexe: {
      appliques: 0, signature: '', veille: { A: false, B: false },
      strategies: { domicile: strategieD, exterieur: strategieE },
      bascules: 0, simAvant: -1, dernierEffet: -1, froid: true,
    },
  };
}

/** Le moteur gardé pour ce match, s'il est bien la suite de ce journal ; sinon un moteur neuf. */
function prendre(etat: EtatMatchEnLigne): EntreeCacheMoteur {
  const cle = cleCache(etat);
  const garde = CACHE.get(cle);
  if (garde) {
    const a = garde.annexe;
    const suite = a.appliques <= etat.journal.length
      && (a.appliques === 0 || signature(etat.journal[a.appliques - 1]) === a.signature);
    if (suite) {
      // Un vrai LRU : un match regardé reste chaud.
      CACHE.delete(cle); CACHE.set(cle, garde);
      return garde;
    }
    supprimerCache(cle);
  }
  return monter(etat);
}

/** Secondes simulées d'avance au-delà desquelles un moteur gardé ne peut pas être celui du match demandé. */
const AVANCE_SUSPECTE = 60;
/** Jusqu'où dérouler : une seconde simulée (le direct), une minute de jeu (la lecture), ou la sirène. */
type But = { sim: number } | { minute: number } | { fin: true };
interface OptionsDeroule {
  /** Quelqu'un regarde ce match : la caméra tourne. */
  regarde?: boolean;
  /** Le journal de `etat` peut recevoir la décision de l'adjoint quand un délai expire. */
  ecrit?: boolean;
  /** Banc : appelé une fois le moteur monté, avant le premier pas. */
  surMoteur?: (e: EtatMatch) => void;
}

/**
 * Déroule le match : applique les ordres dus, joue les attentes, avance d'un
 * quantum — dans cet ordre, à chaque frontière, sur toutes les instances.
 * Renvoie `false` si un ordre est arrivé DERRIÈRE ce moteur (il faut le remonter).
 */
function deroulerUnMoteur(entree: EntreeCacheMoteur, etat: EtatMatchEnLigne, but: But, options: OptionsDeroule): boolean {
  const e = entree.moteur, a = entree.annexe;
  const atteint = (): boolean => e.fini || ('fin' in but ? false
    : 'sim' in but ? e.sim + 1e-9 >= but.sim : !(minuteExacte(e) < but.minute));
  let garde = 0;
  while (garde++ < 80_000) {
    // ── 1. Les ordres du journal, dans l'ordre du journal ────────────────────
    const ev = etat.journal[a.appliques];
    if (ev) {
      let du = false;
      if (ev.commande.type === 'decision') {
        // La décision se prend là où le jeu s'est arrêté, après les pas d'attente inscrits avec elle.
        if (!(minuteExacte(e) < ev.horloge)) {
          const fait = e.attenteDecision ?? 0, voulu = ev.attente ?? 0;
          if (e.phase === 'penalite' && !e.fini && fait !== voulu) {
            if (fait > voulu) { if (!a.froid) return false; }
            else {
              if (atteint()) break;
              a.simAvant = e.sim;
              patienter(e);
              continue;
            }
          }
          du = true;
        }
      } else if (ev.sim !== undefined) {
        du = e.sim + 1e-9 >= ev.sim;
        // Dû dès la frontière d'avant, et pourtant pas appliqué : il a été écrit derrière ce moteur.
        if (du && !a.froid && Math.max(ev.sim, a.dernierEffet) <= a.simAvant + 1e-9) return false;
      } else {
        // Ordre d'avant la marge d'autorité : daté à la minute de jeu.
        du = !(minuteExacte(e) < ev.horloge);
      }
      if (du) {
        appliquerAuMoteur(e, a, ev);
        a.appliques += 1; a.signature = signature(ev); a.dernierEffet = e.sim;
        continue;
      }
    }
    // ── 2. Les bascules tactiques de fin de match ────────────────────────────
    while (a.bascules < SEUILS_BASCULE.length && minuteExacte(e) >= SEUILS_BASCULE[a.bascules]) {
      const seuil = SEUILS_BASCULE[a.bascules++];
      for (const cote of COTES) {
        const moteur = MOTEUR[cote];
        const ecart = moteur === 'A' ? e.scoreA - e.scoreB : e.scoreB - e.scoreA;
        const strategie = a.strategies[cote];
        const effective = { ...strategie, mentalite: mentaliteAppliquee(strategie, seuil, ecart) };
        appliquerTactiqueEquipe(e, moteur, tactiqueDepuisStrategie(effective), true, impactStrategie(effective));
      }
    }
    if (atteint()) break;
    // ── 3. Une pénalité qui attend son entraîneur ────────────────────────────
    const camps = campsEnVeille(a);
    const penalite = camps.length ? penaliteADecider(e, camps) : null;
    if (penalite) {
      const fait = e.attenteDecision ?? 0;
      if (fait >= PAS_ATTENTE_MAX || 'fin' in but) {
        // Le délai est passé : l'adjoint tranche d'après les consignes — et sa
        // décision entre au journal comme les autres. Deux instances qui la
        // prennent en même temps écrivent la MÊME (elle ne dépend que du moteur).
        if (!options.ecrit) break;
        const cote = MOTEUR_VERS_COTE[penalite.cote];
        const ecart = penalite.cote === 'A' ? e.scoreA - e.scoreB : e.scoreB - e.scoreA;
        const choix = decisionIA(a.strategies[cote], penalite.distance, penalite.aPortee, Math.round(minuteExacte(e)), ecart);
        etat.journal.splice(a.appliques, 0, {
          horloge: minuteExacte(e), cote, commande: { type: 'decision', choix }, auto: true, ...(fait ? { attente: fait } : {}),
        });
        continue;
      }
      // Le chrono est arrêté, pas les joueurs : ils se replacent pendant le choix.
      if (!('sim' in but)) break;
      a.simAvant = e.sim;
      patienter(e);
      continue;
    }
    // ── 4. Un quantum de jeu ─────────────────────────────────────────────────
    a.simAvant = e.sim;
    avancer(e, QUANTUM);
  }
  return true;
}

/**
 * Amène le moteur du match là où on le demande, et le range.
 *
 * ⚠️ IL NE RECULE JAMAIS, ET IL N'A PLUS À LE FAIRE. Tout ce qu'il a joué était
 * définitif. Le seul cas où on le remonte : un ordre daté derrière lui, ce qui
 * suppose une base restée muette plus longtemps que la marge d'autorité. Le
 * film le signale alors à l'écran (`rupture`), qui se raccorde en douceur.
 */
function derouler(etat: EtatMatchEnLigne, but: But, options: OptionsDeroule = {}): EtatMatch {
  const cle = cleCache(etat);
  let entree = prendre(etat);
  // ⚠️ UN MOTEUR GARDÉ UNE MINUTE DEVANT L'HEURE DEMANDÉE N'EST PAS LA SUITE DE CE MATCH. L'heure d'un direct ne recule pas
  // (les horloges de deux instances diffèrent d'une seconde, pas de soixante) : c'est donc une AUTRE partie jouée sous la
  // même clé — un banc qui relance le même match, une base restaurée. Lui faire « continuer » ce moteur montrerait la fin
  // d'un match qui commence : on le remonte depuis le journal.
  if ('sim' in but && entree.moteur.sim > but.sim + AVANCE_SUSPECTE) { supprimerCache(cle); entree = monter(etat); }
  if (entree.annexe.froid) options.surMoteur?.(entree.moteur);
  const cible = 'sim' in but ? but.sim : 'minute' in but ? but.minute * 60 : Infinity;
  cadrerFilm(entree.moteur, cible, options.regarde);
  if (!deroulerUnMoteur(entree, etat, but, options)) {
    retards++;
    supprimerCache(cle);
    entree = monter(etat);
    options.surMoteur?.(entree.moteur);
    cadrerFilm(entree.moteur, cible, options.regarde);
    deroulerUnMoteur(entree, etat, but, options);
  }
  entree.annexe.froid = false;
  ranger(cle, entree);
  return entree.moteur;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 bis. LES POINTS DE REPRISE — un serveur froid ne repart plus du coup d'envoi
// ═══════════════════════════════════════════════════════════════════════════

/**
 * La même suite que `graine()` (`aleatoire.ts`), dont on peut reprendre le fil : son état n'avance que d'une
 * constante par tirage, le NOMBRE de tirages suffit donc à la retrouver. `graine()` garde le sien dans une
 * fermeture, qu'on ne peut ni lire ni copier.
 */
type RngReprenable = (() => number) & { tirages: number };
export function rngReprenable(s: string, tirages = 0): RngReprenable {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = ((h >>> 0) + Math.imul(tirages | 0, 0x6d2b79f5)) | 0;
  const rng = (() => {
    rng.tirages++;
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as RngReprenable;
  rng.tirages = tirages;
  return rng;
}

/**
 * Le moteur d'un match en cours, tel qu'une AUTRE instance peut le reprendre : l'état entier moins ses deux
 * fonctions (le tirage, retrouvé par son compte ; la caméra, reposée à la reprise).
 *
 * ⚠️ C'EST UNE OPTIMISATION, COMME LE CACHE. Un point absent, illisible, d'un autre match ou qui n'est pas la suite
 * du journal est refusé, et le match est rejoué du coup d'envoi comme avant. Rejouer reste la définition du match.
 * ⚠️ `moteur` PARTAGE SES OBJETS AVEC LE MOTEUR VIVANT : il se sérialise tout de suite, il ne se garde pas.
 */
export interface PointDeReprise {
  cle: string; debut: number; regles: number;
  sim: number; tirages: number;
  moteur: Record<string, unknown>;
  annexe: Record<string, unknown>;
}
let reprises = 0;

export function pointDeReprise(etat: EtatMatchEnLigne): PointDeReprise | null {
  const garde = CACHE.get(cleCache(etat));
  if (!garde || garde.annexe.froid || garde.moteur.fini || etat.termine) return null;
  const tirages = (garde.moteur.rng as Partial<RngReprenable>).tirages;
  if (typeof tirages !== 'number') return null;
  const { rng: _rng, apresPas: _camera, ...moteur } = garde.moteur;
  return { cle: etat.cle, debut: etat.debut, regles: etat.regles ?? 1, sim: garde.moteur.sim, tirages,
    moteur: moteur as Record<string, unknown>, annexe: garde.annexe as unknown as Record<string, unknown> };
}

/** La seconde simulée du moteur gardé pour ce match ; `undefined` : cette instance n'en a pas. */
export function simMoteurGarde(etat: EtatMatchEnLigne): number | undefined {
  return CACHE.get(cleCache(etat))?.moteur.sim;
}

/**
 * Installe un point de reprise à la place d'une rejoue. `point` doit venir d'une désérialisation : ses objets
 * deviennent ceux du moteur. Rend faux, sans rien toucher, s'il ne peut pas être la suite de ce match.
 */
export function reprendreMoteur(etat: EtatMatchEnLigne, point: PointDeReprise): boolean {
  if (etat.termine || !etat.equipes || !point || typeof point !== 'object') return false;
  if (point.cle !== etat.cle || point.debut !== etat.debut || point.regles !== (etat.regles ?? 1)) return false;
  const moteur = point.moteur as unknown as EtatMatch;
  const annexe = point.annexe as unknown as Annexe;
  if (!moteur || !annexe || moteur.sim !== point.sim || moteur.fini || !Array.isArray(moteur.pions)) return false;
  if (!Number.isSafeInteger(point.tirages) || point.tirages < 0 || !Number.isSafeInteger(annexe.appliques)) return false;
  // Le journal d'aujourd'hui doit prolonger celui que ce moteur a déjà appliqué.
  if (annexe.appliques < 0 || annexe.appliques > etat.journal.length) return false;
  if (annexe.appliques > 0 && signature(etat.journal[annexe.appliques - 1]) !== annexe.signature) return false;
  const cle = cleCache(etat);
  const garde = CACHE.get(cle);
  if (garde && garde.moteur.sim >= moteur.sim) return false;
  moteur.rng = rngReprenable(`match#${etat.cle}`, point.tirages);
  filmer(moteur);
  ranger(cle, { moteur, annexe: { ...annexe, froid: false }, octets: 0 });
  reprises++;
  return true;
}

/** Le moteur gardé pour ce match, sans le faire avancer. */
function moteurGarde(etat: EtatMatchEnLigne): EntreeCacheMoteur | undefined {
  return CACHE.get(cleCache(etat));
}

/**
 * Banc : rejoue le match depuis le coup d'envoi dans un moteur À PART (hors
 * cache), en observant chaque pas. C'est la référence à laquelle on compare ce
 * que chaque écran a montré.
 */
export function rejouerPourBanc(etat: EtatMatchEnLigne, but: But, surPas: (e: EtatMatch) => void): EtatMatch {
  const entree = monter(etat);
  rejouesAFroid--;
  const camera = entree.moteur.apresPas;
  entree.moteur.apresPas = (m) => { camera?.(m); surPas(m); };
  deroulerUnMoteur(entree, { ...etat, journal: [...etat.journal] }, but, {});
  return entree.moteur;
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. LA LECTURE DU MOTEUR
// ═══════════════════════════════════════════════════════════════════════════

const TYPES_FIL = new Set([
  'essai', 'but', 'butRate', 'penalite', 'franchissement', 'carton', 'blessure', 'jalon', 'remplacement',
  // Ces phases étaient bien simulées mais supprimées du récit de la carrière.
  // Le fil conserve leurs moments significatifs, sans ajouter chaque plaquage.
  'melee', 'touche', 'maul', 'ruck', 'faute',
]);
// Les arrêts plus courts produisent davantage de séquences jouées. On garde un
// fil dense mais borné, sans atteindre le plafond historique de 240 lignes.
const FIL_MAX = 220;

function extraireFil(e: EtatMatch): LigneFil[] {
  const lignes: LigneFil[] = [];
  for (const [index, c] of e.commentaires.entries()) {
    if (!TYPES_FIL.has(c.type) && !(c.type === 'jeu' && c.texte.startsWith('Combinaison :'))) continue;
    lignes.push({
      id: `evenement-${index}`, seconde: c.seconde ?? c.minute * 60,
      score: { domicile: c.scoreA, exterieur: c.scoreB },
      minute: Math.min(80, Math.round(c.minute)), texte: c.texte, type: c.type,
      cote: c.cote === 'A' ? 'domicile' : c.cote === 'B' ? 'exterieur' : undefined,
      points: c.points || undefined,
    });
  }
  return lignes.slice(-FIL_MAX);
}

const statsVides = (): StatsEquipeMatch => ({
  possession: 50, essais: 0, penalitesTentees: 0, penalitesReussies: 0,
  plaquages: 0, metres: 0, turnovers: 0, cartons: 0,
});

function extraireStats(e: EtatMatch): Record<CoteEnLigne, StatsEquipeMatch> {
  const total = Math.max(1, e.compteurs.tempsA + e.compteurs.tempsB);
  const stats: Record<CoteEnLigne, StatsEquipeMatch> = { domicile: statsVides(), exterieur: statsVides() };
  stats.domicile.possession = Math.round((e.compteurs.tempsA / total) * 100);
  stats.exterieur.possession = 100 - stats.domicile.possession;
  stats.domicile.essais = e.essaisA;
  stats.exterieur.essais = e.essaisB;
  for (const p of e.pions) {
    const s = p.cote === 'A' ? stats.domicile : stats.exterieur;
    s.penalitesTentees += p.stats.butsTentes;
    s.penalitesReussies += p.stats.butsReussis;
    s.plaquages += p.stats.plaquages;
    s.metres += Math.round(p.stats.metres);
    s.turnovers += p.stats.grattages;
    s.cartons += p.stats.cartonsJaunes + p.stats.cartonsRouges;
  }
  return stats;
}

/**
 * Les pénalités et drops réussis.
 *
 * ⚠️ PAS `butsReussis` : ce compteur additionne les transformations, et
 * l'objectif « réussir 5 pénalités » serait alors validé par cinq essais. Un
 * but à trois points, c'est une pénalité ou un drop — jamais une transformation.
 */
function extrairePenalites(e: EtatMatch): Paire {
  const p: Paire = { domicile: 0, exterieur: 0 };
  for (const c of e.commentaires) {
    if (c.type !== 'but' || c.points !== 3) continue;
    if (c.cote === 'A') p.domicile += 1; else if (c.cote === 'B') p.exterieur += 1;
  }
  return p;
}

function extraireFeuille(e: EtatMatch): LigneFeuilleMatch[] {
  const parNom = new Map(e.pions.map((p) => [`${p.cote}${p.numeroMaillot ?? p.numero}`, p]));
  return bilan(e).parJoueur.map((l) => {
    const pion = parNom.get(`A${l.numero}`)?.nom === l.nom ? parNom.get(`A${l.numero}`) : parNom.get(`B${l.numero}`);
    return {
      carteId: pion?.sourceId ?? l.nom, nom: l.nom, numero: l.numero, poste: l.poste,
      cote: (pion?.cote ?? 'A') === 'A' ? 'domicile' as const : 'exterieur' as const,
      minutes: l.minutes, essais: l.stats.essais, plaquages: l.stats.plaquages,
      metres: Math.round(l.stats.metres), butsTentes: l.stats.butsTentes,
      butsReussis: l.stats.butsReussis, cartons: l.stats.cartonsJaunes + l.stats.cartonsRouges,
    };
  }).sort((a, b) => a.cote === b.cote ? a.numero - b.numero : a.cote === 'domicile' ? -1 : 1);
}

/** Deux décimales : le terrain se dessine au centimètre, pas au micron. */
const r2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Le terrain tel que l'écran va le redessiner : trente pions avec leur vecteur
 * vitesse, le ballon (porté, en vol ou au sol), la phase et la cadence.
 */
function graineVisuelle(id: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16_777_619);
  return h >>> 0;
}

function extraireVolDirect(vol: Vol | VolRecent, debut: number, ecoule: number): VolDirect {
  const actionId = [
    vol.type, vol.intention, vol.auteur.id, vol.receveur?.id ?? '-',
    r2(debut), r2(vol.de.x), r2(vol.de.y), r2(vol.vers.x), r2(vol.vers.y),
  ].join(':');
  return {
    id: actionId,
    de: { x: r2(vol.de.x), y: r2(vol.de.y) },
    vers: { x: r2(vol.vers.x), y: r2(vol.vers.y) },
    duree: r2(vol.duree), ecoule: r2(ecoule), hauteur: r2(vol.hauteur),
    type: vol.type, intention: vol.intention,
    debut: r2(debut), fin: r2(debut + vol.duree),
    auteurId: vol.auteur.id, receveurId: vol.receveur?.id,
    seed: graineVisuelle(actionId),
  };
}

export function extraireTerrain(
  e: EtatMatch, emisLe: number,
  /** Le film rejoué côté client porte déjà la chute sous sa forme d'affichage. */
  corps: (p: EtatMatch['pions'][number]) => PionDirect['corps'] = corpsPourAffichage,
): TerrainDirect {
  const terrain: TerrainDirect = {
    exclusionsTV: exclusionsDepuisEtat(e),
    periode: e.periode,
    ...(e.cotesInverses ? { cotesInverses: true } : {}),
    pions: e.pions.filter((p) => p.surLeTerrain).map((p) => ({
      id: p.id, numero: p.numeroMaillot ?? p.numero, numeroRole: p.numero, nom: p.nom, poste: p.poste,
      cote: MOTEUR_VERS_COTE[p.cote],
      x: r2(p.pos.x), y: r2(p.pos.y), vx: r2(p.vitesse.x), vy: r2(p.vitesse.y),
      corps: corps(p),
      force: p.puissance, tailleCm: p.tailleCm, poidsKg: p.poidsKg,
    })),
    ballon: {
      x: r2(e.ballon.x), y: r2(e.ballon.y),
      hauteur: e.ballonLibre ? r2(e.ballonLibre.hauteur) : undefined,
    },
    ballonLibre: e.ballonLibre ? {
      orientation: r2(e.ballonLibre.orientation ?? 0),
      vitesseRotation: r2(e.ballonLibre.vitesseRotation ?? 0),
      dernierRebondSim: r2(e.ballonLibre.dernierRebondSim ?? -10),
    } : undefined,
    phase: e.phase,
    systeme: e.systeme,
    possession: MOTEUR_VERS_COTE[e.possession],
    sequence: e.phasesDepuisArret + 1,
    origine: { x: r2(e.origine.x), y: r2(e.origine.y) },
    ligneAvantage: r2(e.ligneAvantage),
    metresGagnes: r2(e.metresGagnesPhase),
    ballonLent: e.ballonLent,
    ouvert: e.ouvert === 1 ? 'droite' : 'gauche',
    cadence: r2(1 / facteurHorloge(e.phase, e.tempsReel)),
    horloge: r2(minuteExacte(e)),
    instantJeu: r2(e.t),
    simulation: r2(e.sim),
    gestes: e.gestes?.filter((g) => e.sim - g.debut < 8),
    arbitre: e.arbitre ? {
      x: r2(e.arbitre.pos.x), y: r2(e.arbitre.pos.y),
      vx: r2(e.arbitre.vitesse.x), vy: r2(e.arbitre.vitesse.y), regard: r2(e.arbitre.regard),
    } : undefined,
    preparationTir: e.tir && !e.tir.volLance ? {
      buteurId: e.tir.buteur.id,
      progression: Math.max(0, Math.min(1, 1 - e.minuteur / (e.dureeArret ?? 45))),
      transformation: e.tir.valeur === 2,
      routine: e.tir.routine?.id,
      clipRoutine: e.tir.routine?.clip,
      nomRoutine: e.tir.routine?.nom,
      emojiRoutine: e.tir.routine?.emoji,
    } : undefined,
    emisLe,
    snapshot: Math.max(0, Math.round(e.t / 0.6)),
  };
  // L'habillage TV : le marqueur tant que dure sa célébration, le vent devant un tir posé.
  const marqueurTV = marqueurDepuisEtat(e);
  if (marqueurTV) terrain.marqueurTV = marqueurTV;
  const ventTV = ventPourLeTir(e);
  if (ventTV) terrain.ventTV = ventTV;
  if (e.lancement) {
    terrain.lancement = { type: e.lancement.type };
    if (e.combinaisonEnCours) terrain.lancement.combinaison = e.lancement.libelle;
    if (e.lancement.intention) terrain.lancement.intention = e.lancement.intention;
  }
  if (e.conquete) {
    terrain.conquete = {
      type: e.conquete.type,
      progression: r2(e.conquete.progression),
      combinaison: e.conquete.combinaison,
      cibleId: e.conquete.cibleId,
      ...(e.conquete.horsAlignement ? { horsAlignement: true, reception: e.conquete.reception } : {}),
      pousseVers: e.conquete.pousseVers ? MOTEUR_VERS_COTE[e.conquete.pousseVers] : undefined,
    };
    if (e.conquete.horsAlignement && e.conquete.reception) {
      const lanceur = e.pions.find(p => p.cote === e.possession && p.numero === 2 && p.surLeTerrain);
      const vol = Math.max(0, Math.min(1, (e.conquete.progression - .52) / .38));
      if (lanceur) terrain.ballon = { x: r2(lanceur.pos.x + (e.conquete.reception.x - lanceur.pos.x) * vol), y: r2(lanceur.pos.y + (e.conquete.reception.y - lanceur.pos.y) * vol), hauteur: r2(Math.sin(Math.PI * vol) * 2.4) };
    }
  }
  if (e.aplatissage) {
    terrain.aplatissage = {
      marqueurId: e.aplatissage.marqueur.id,
      progression: r2(Math.max(0, Math.min(1, 1 - e.minuteur / 1.35))),
    };
  }
  if (e.ruck?.porteurId && e.ruck.plaqueurId) {
    const progression = e.ruck.debut !== undefined
      ? Math.max(0, Math.min(1, (e.t - e.ruck.debut) / 1.35))
      : 1;
    terrain.contact = {
      porteurId: e.ruck.porteurId,
      plaqueurId: e.ruck.plaqueurId,
      progression: r2(progression),
    };
  }
  terrain.porteurId = porteurPourAffichage(e);
  const recents = (e.volsRecents ?? [])
    .filter((vol) => e.t - vol.debut <= 8)
    .map((vol) => extraireVolDirect(vol, vol.debut, e.t - vol.debut));
  if (recents.length) terrain.volsRecents = recents;
  if (e.vol) {
    const debut = Math.max(0, e.t - e.vol.ecoule);
    terrain.vol = extraireVolDirect(e.vol, debut, e.vol.ecoule);
  }
  if (e.sifflet) {
    terrain.sifflet = {
      cle: e.sifflet.cle, club: e.sifflet.club, fautif: e.sifflet.fautif,
      restant: r2(e.sifflet.restant),
    };
  }

  // ⚠️ TMO / REPLAY TV : sans cette extraction, `terrain.tmo` restait toujours
  // `undefined` et `CadreTmoReplay` ne s'affichait JAMAIS en mode Carrière
  // (DirectCinema). On le peuple dans trois situations :
  // 1. TMO actif (arbitrage vidéo en cours)
  // 2. Replay d'essai pendant la transformation (le cadre TV montre l'action)
  // 3. Carton jaune ou rouge (sanction disciplinaire à l'écran)
  if (e.tmo && e.tmo.actif) {
    terrain.tmo = {
      actif: true,
      action: e.tmo.libelleMotif,
      decision: e.tmo.decision === 'en_cours'
        ? 'Analyse des angles vidéo en cours...'
        : e.tmo.decision === 'essai_accorde'
          ? 'Essai accordé'
          : e.tmo.decision === 'essai_refuse'
            ? 'Essai refusé'
            : e.tmo.decision === 'carton_jaune'
              ? 'Carton jaune'
              : e.tmo.decision === 'carton_rouge'
                ? 'Carton rouge'
                : 'Sanction disciplinaire',
      tempsRestant: r2(e.tmo.restant),
      cadreCamera: e.tmo.type === 'essai' ? 'CAM 1 · LIGNE D\'EN-BUT' : 'CAM 3 · VUE LATÉRALE',
    };
  } else if (e.dernierReplayEssai && e.dernierReplayEssai.restant > 0 && e.phase === 'transformation') {
    terrain.tmo = {
      actif: true,
      action: `Essai de ${e.dernierReplayEssai.marqueurNom}`,
      decision: 'Essai accordé',
      tempsRestant: r2(e.dernierReplayEssai.restant),
      cadreCamera: 'CAM 1 · LIGNE D\'EN-BUT',
    };
  } else if (e.sifflet && (e.sifflet.cle.includes('cartonJaune') || e.sifflet.cle.includes('cartonRouge'))) {
    const rouge = e.sifflet.cle.includes('cartonRouge');
    terrain.tmo = {
      actif: true,
      action: `Sanction disciplinaire contre ${e.sifflet.fautif}`,
      decision: rouge ? 'Carton rouge' : 'Carton jaune',
      tempsRestant: r2(e.sifflet.restant),
      cadreCamera: 'CAM 2 · GROS PLAN',
    };
  }

  return terrain;
}

function relever(etat: EtatMatchEnLigne, e: EtatMatch): void {
  etat.horloge = minuteExacte(e);
  etat.score = { domicile: e.scoreA, exterieur: e.scoreB };
  etat.essais = { domicile: e.essaisA, exterieur: e.essaisB };
  etat.penalites = extrairePenalites(e);
  etat.fil = extraireFil(e);
  etat.stats = extraireStats(e);
}

/** Le coup de sifflet final : on relève tout, puis on archive. */
function clore(etat: EtatMatchEnLigne, e: EtatMatch): void {
  relever(etat, e);
  etat.horloge = 80;
  etat.termine = true;
  etat.feuille = extraireFeuille(e);
  delete etat.decision;
  delete etat.equipes;
  etat.journal = [];
  // ⚠️ LE MOTEUR RESTE EN CACHE QUELQUES INSTANTS. Les écrans n'ont pas encore
  // reçu les derniers pas — la dernière action, le coup de sifflet final : ils
  // les demandent au sondage suivant (`vueMatchEnLigne`). Le cache l'évincera
  // de lui-même.
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. LES POINTS D'ENTRÉE
// ═══════════════════════════════════════════════════════════════════════════

export function creerMatchEnLigne(p: ParametresCreationMatch): EtatMatchEnLigne {
  const geler = (equipe: EquipeMatchEnLigne): FeuilleGelee => ({
    clubId: equipe.clubId, nom: equipe.nom,
    feuille: feuilleGeleeEnLigne(equipe.effectif, equipe.composition),
    capitaineId: equipe.composition.capitaineId, buteurId: equipe.composition.buteurId,
    collectif: equipe.collectif,
  });
  const equipes = { domicile: geler(p.domicile), exterieur: geler(p.exterieur) };
  const cle = `${p.id}#${p.graine >>> 0}`;
  return {
    id: p.id, cle, debut: p.debut, gel: 0, horloge: 0, regles: REGLES_MATCH_EN_LIGNE,
    cibles: cibleDeScore(
      forceFeuille(equipes.domicile.feuille), forceFeuille(equipes.exterieur.feuille), cle,
      equipes.domicile.collectif ?? 50, equipes.exterieur.collectif ?? 50,
    ),
    equipes,
    strategies: {
      domicile: strategieValide(p.domicile.strategie),
      exterieur: strategieValide(p.exterieur.strategie),
    },
    journal: [], presence: {}, termine: false,
    score: { domicile: 0, exterieur: 0 }, essais: { domicile: 0, exterieur: 0 },
    penalites: { domicile: 0, exterieur: 0 }, fil: [],
    stats: { domicile: statsVides(), exterieur: statsVides() },
  };
}

/**
 * Fait avancer un match jusqu'à l'instant présent — moins la marge d'autorité.
 *
 * ⚠️ C'EST LE SEUL ENDROIT QUI FAIT AVANCER LE TEMPS, et il est appelé à chaque
 * lecture de la ligue — donc par n'importe qui, y compris par l'horloge
 * automatique quand personne ne regarde. C'est ce qui garantit qu'un match
 * lancé puis abandonné se termine quand même, et qu'une ligue ne se bloque
 * jamais sur l'absence d'un manager.
 *
 * ⚠️ ET TOUTES LES INSTANCES Y CALCULENT LE MÊME MATCH. Rien de ce qui est joué
 * ici ne dépend de ce que CETTE instance est seule à savoir : la présence d'un
 * manager n'arrête le jeu qu'une fois inscrite au journal (`veille`), et le
 * délai d'une décision se compte en pas du moteur, pas en millisecondes.
 */
export function avancerMatchEnLigne(etat: EtatMatchEnLigne, maintenant: number, regarde = false): EtatMatchEnLigne {
  if (etat.termine) return etat;
  const suivant: EtatMatchEnLigne = {
    ...etat, journal: [...etat.journal], presence: { ...etat.presence },
    score: { ...etat.score }, essais: { ...etat.essais }, penalites: { ...etat.penalites },
  };
  if (!suivant.equipes) { suivant.termine = true; return suivant; }

  // ── 0. Une décision restée en attente sous l'ancien moteur : l'adjoint tranche ──
  const ancienne = suivant.decision;
  delete suivant.decision;
  if (ancienne && !ancienne.derivee
    && !suivant.journal.some((ev) => ev.commande.type === 'decision' && ev.horloge === ancienne.horloge)) {
    const ecart = suivant.score[ancienne.cote] - suivant.score[autre(ancienne.cote)];
    const choix = decisionIA(
      strategieA(suivant, ancienne.cote, ancienne.horloge), ancienne.distance,
      ancienne.distance < 52 && ancienne.angle < 30, Math.round(ancienne.horloge), ecart,
    );
    suivant.journal.push({ horloge: ancienne.horloge, cote: ancienne.cote, commande: { type: 'decision', choix }, auto: true });
  }

  // ── 1. Qui veille ? La présence entre au journal, datée comme un ordre ────
  // ⚠️ LES DEUX CAMPS SONT ÉCOUTÉS. Un banc qui veille se voit proposer ses
  // pénalités ; un banc parti (plus de sondage depuis 45 s) ne fait plus
  // attendre personne. L'un et l'autre prennent effet DEVANT le moteur.
  const ordre = simOrdre(suivant, maintenant);
  for (const cote of COTES) {
    const present = presenceActive(suivant, cote, maintenant);
    const veille = veilleAuJournal(suivant.journal, cote);
    if (present === veille.actif || (!present && ordre - veille.sim < 75)) continue;
    suivant.journal.push({
      sim: ordre, horloge: Math.min(80, suivant.horloge + MARGE_AUTORITE / 60), cote, commande: { type: 'veille', actif: present },
    });
  }

  // ── 2. On avance jusqu'à ce que l'heure permet de montrer ─────────────────
  const e = derouler(suivant, { sim: simCible(suivant, maintenant) }, { regarde, ecrit: true });
  relever(suivant, e);

  // ── 3. Une pénalité arrêtée devant un banc qui veille est une décision ────
  // Elle se DÉDUIT du moteur : elle n'est plus écrite en base, toutes les
  // instances la voient au même pas. Son échéance est celle du dernier clic
  // qui garde son effet naturel ; l'adjoint tranche une marge plus tard.
  const entree = moteurGarde(suivant);
  if (entree && !e.fini) {
    const penalite = penaliteADecider(e, campsEnVeille(entree.annexe));
    const tranchee = suivant.journal[entree.annexe.appliques]?.commande.type === 'decision';
    if (penalite && !tranchee) {
      const debutAttente = e.sim - (e.attenteDecision ?? 0) * PAS_FILM;
      suivant.decision = {
        cote: MOTEUR_VERS_COTE[penalite.cote],
        distance: penalite.distance, angle: penalite.angle,
        probabilite: Math.round(penalite.probabilite * 100), buteur: penalite.buteur,
        aPortee: penalite.aPortee,
        horloge: suivant.horloge,
        jusqua: Math.round(suivant.debut + (debutAttente + PAS_ATTENTE_MAX * PAS_FILM) * 1000),
        derivee: 1,
      };
    }
  }

  // ⚠️ LA SIRÈNE NE FINIT PLUS LE MATCH, LE BALLON MORT SI. Couper à 80:00 pile
  // supprimait la dernière action — une pénaltouche accordée avant la sirène ne
  // se jouait jamais. C'est le moteur qui siffle la fin (au plus tard six
  // minutes après la sirène).
  if (e.fini) clore(suivant, e);
  return suivant;
}

/**
 * Enregistre l'ordre d'un manager.
 *
 * ⚠️ IL REND TOUJOURS UN ÉTAT, jamais une exception. Un clic sur « prendre les
 * points » qui arrive une seconde après la reprise du jeu n'est pas une faute
 * du joueur : l'ordre est ignoré, le match continue. Lever une erreur ferait
 * remonter « action impossible » à l'écran pour un geste parfaitement normal.
 *
 * ⚠️ UN ORDRE PREND EFFET UNE MARGE PLUS TARD, JAMAIS TOUT DE SUITE. Il est
 * daté de l'heure qu'il est, et le moteur de chaque instance joue une marge
 * derrière : toutes le rencontrent donc au même pas, sans rien avoir à refaire.
 */
export function commanderMatchEnLigne(
  etat: EtatMatchEnLigne, clubId: string, action: CommandeMatchEnLigne, maintenant: number,
  signalerPresence = true,
): EtatMatchEnLigne {
  if (etat.termine || !etat.equipes) return etat;
  const cote = COTES.find((c) => etat.equipes![c].clubId === clubId);
  if (!cote) return etat;
  const commande = normaliserCommande(action);
  if (!commande) return etat;

  const marque: EtatMatchEnLigne = signalerPresence
    ? { ...etat, presence: { ...etat.presence, [cote]: maintenant } } : etat;
  const avance = avancerMatchEnLigne(marque, maintenant);
  if (commande.type === 'presence' || avance.termine || !avance.equipes) return avance;
  const entree = moteurGarde(avance);
  if (!entree) return avance;
  const moteur = entree.moteur;

  if (commande.type === 'decision') {
    const d = avance.decision;
    if (!d || d.cote !== cote) return avance;
    // Les joueurs continuent de se replacer jusqu'à ce que le choix prenne
    // effet : autant de pas d'attente que la marge en demande, inscrits ici
    // pour que toutes les rejoues en fassent exactement autant.
    const fait = moteur.attenteDecision ?? 0;
    const debutAttente = moteur.sim - fait * PAS_FILM;
    const attente = Math.max(fait, Math.min(PAS_ATTENTE_MAX, Math.ceil((simOrdre(avance, maintenant) - debutAttente) / PAS_FILM)));
    const suivant: EtatMatchEnLigne = {
      ...avance,
      journal: [...avance.journal, { horloge: d.horloge, cote, commande, ...(attente ? { attente } : {}) }],
    };
    delete suivant.decision;
    return suivant;
  }

  if (commande.type === 'remplacement') {
    // Le moteur refuse un entrant déjà utilisé ou un sortant absent. On le lui
    // demande AVANT d'écrire au journal : un ordre mort y resterait pour
    // toutes les rejoues suivantes.
    const cible = MOTEUR[cote];
    const entrant = moteur.pions.find((p) => p.cote === cible && p.sourceId === commande.entrantId && !p.surLeTerrain && p.minutes === 0);
    const sortant = moteur.pions.find((p) => p.cote === cible && p.sourceId === commande.sortantId && p.surLeTerrain && p.numero <= 15);
    if (!entrant || !sortant) return avance;
    // Le même remplacement, demandé deux fois avant d'avoir pris effet, n'entre qu'une fois.
    const deja = avance.journal.slice(entree.annexe.appliques).some((ev) => ev.cote === cote && ev.commande.type === 'remplacement'
      && (ev.commande.entrantId === commande.entrantId || ev.commande.sortantId === commande.sortantId));
    if (deja) return avance;
  }

  // La base reste celle du coup d'envoi. La remplacer ici appliquerait les
  // nouvelles combinaisons dans le passé lors d'une reconstruction à froid.
  const evenement: EvenementMatchEnLigne = {
    sim: simOrdre(avance, maintenant), horloge: Math.min(80, avance.horloge + MARGE_AUTORITE / 60), cote, commande,
  };
  return { ...avance, journal: [...avance.journal, evenement] };
}

/** Le cahier rejoint les rencontres en cours sans remplacer les autres
 * consignes du banc ni déclarer une présence devant le direct. */
export function actualiserCahierMatchEnLigne(
  etat: EtatMatchEnLigne, clubId: string,
  cahier: Pick<StrategieEnLigne, 'modeCombinaisons' | 'combinaisons'>, maintenant: number,
): EtatMatchEnLigne {
  if (etat.termine || !etat.equipes) return etat;
  const cote = COTES.find(c => etat.equipes![c].clubId === clubId);
  if (!cote) return etat;
  // La dernière consigne DONNÉE, qu'elle ait déjà pris effet ou non.
  const actuelle = strategieA(etat, cote, Infinity);
  const demandee = strategieValide({ ...actuelle, ...cahier });
  if (actuelle.modeCombinaisons === demandee.modeCombinaisons
    && JSON.stringify(actuelle.combinaisons) === JSON.stringify(demandee.combinaisons)) return etat;
  return commanderMatchEnLigne(etat, clubId, { type: 'strategie', strategie: demandee }, maintenant, false);
}

/** Assainit l'ordre reçu du client. Une commande inconnue est simplement ignorée. */
function normaliserCommande(action: unknown): CommandeMatchEnLigne | null {
  if (!action || typeof action !== 'object') return null;
  const a = action as { type?: unknown; strategie?: unknown; choix?: unknown; sortantId?: unknown; entrantId?: unknown };
  if (a.type === 'presence') return { type: 'presence' };
  if (a.type === 'strategie') return { type: 'strategie', strategie: strategieValide(a.strategie) };
  if (a.type === 'decision') {
    return CHOIX_PENALITE.includes(a.choix as ChoixPenaliteEnLigne)
      ? { type: 'decision', choix: a.choix as ChoixPenaliteEnLigne } : null;
  }
  if (a.type === 'remplacement') {
    const ok = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 250;
    return ok(a.sortantId) && ok(a.entrantId) && a.sortantId !== a.entrantId
      ? { type: 'remplacement', sortantId: a.sortantId, entrantId: a.entrantId } : null;
  }
  return null;
}

/**
 * Termine un match d'un seul coup, sans horloge.
 *
 * C'est le chemin des ABSENCES : la fenêtre s'est refermée, personne n'a lancé
 * la rencontre, elle se joue quand même avec les compositions et les consignes
 * enregistrées. Exactement le même moteur, exactement les mêmes règles.
 */
export function conclureMatchEnLigne(etat: EtatMatchEnLigne): EtatMatchEnLigne {
  if (etat.termine) return etat;
  const suivant: EtatMatchEnLigne = { ...etat, journal: [...etat.journal], presence: {} };
  delete suivant.decision;
  if (!suivant.equipes) { suivant.termine = true; return suivant; }
  // Jusqu'au coup de sifflet final du moteur : les pénalités qui attendaient un banc sont tranchées par l'adjoint.
  clore(suivant, derouler(suivant, { fin: true }, { ecrit: true }));
  return suivant;
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. LA VUE
// ═══════════════════════════════════════════════════════════════════════════

const LISIBILITE: Record<MentaliteEnLigne, number> = {
  tresDefensive: -2, defensive: -1, equilibree: 0, offensive: 1, tresOffensive: 2,
};

/**
 * Ce que l'adversaire perçoit du plan d'en face.
 *
 * ⚠️ UNE IMPRESSION, JAMAIS LE RÉGLAGE. « L'adversaire semble jouer beaucoup
 * plus offensivement » se lit sur un terrain ; « il est passé en jeu au large,
 * rucks à forte contestation, défense montante » ne se lit nulle part. Sans ce
 * filtre, le duel tactique devient un jeu de miroir où chacun contre exactement
 * le dernier réglage de l'autre — et la lecture du jeu ne sert plus à rien.
 */
export function signalAdverse(etat: EtatMatchEnLigne, moi: CoteEnLigne): string | undefined {
  const lui = autre(moi);
  const ordres = etat.journal.filter((ev) => ev.cote === lui && ev.commande.type === 'strategie');
  if (!ordres.length) return undefined;
  const dernier = ordres[ordres.length - 1];
  // Un changement se ressent pendant quelques minutes, pas jusqu'à la sirène.
  if (etat.horloge - dernier.horloge > 6) return undefined;
  const avant = ordres.length > 1 ? ordres[ordres.length - 2].commande : null;
  const precedente = avant && avant.type === 'strategie' ? avant.strategie : etat.strategies[lui];
  const suivante = dernier.commande.type === 'strategie' ? dernier.commande.strategie : precedente;
  const delta = LISIBILITE[suivante.mentalite] - LISIBILITE[precedente.mentalite];
  if (delta >= 2) return 'ligue.match.signal.beaucoupPlusOffensif';
  if (delta === 1) return 'ligue.match.signal.plusOffensif';
  if (delta <= -2) return 'ligue.match.signal.beaucoupPlusDefensif';
  if (delta === -1) return 'ligue.match.signal.plusDefensif';
  if (suivante.rythme !== precedente.rythme) {
    return suivante.rythme === 'accelerer' ? 'ligue.match.signal.acceleration' : 'ligue.match.signal.ralentissement';
  }
  if (suivante.defense !== precedente.defense) {
    return suivante.defense === 'agressive' ? 'ligue.match.signal.defenseAgressive' : 'ligue.match.signal.defenseBasse';
  }
  return undefined;
}

/**
 * Les ordres que J'AI donnés, ajoutés à MON fil.
 *
 * ⚠️ SANS EUX, PILOTER SON MATCH SE FAIT À L'AVEUGLE. Une consigne part au
 * serveur, revient appliquée… et rien ne le dit à l'écran : le moteur annonce
 * bien le changement de plan, mais dans un commentaire de type `jeu` — la
 * catégorie des en-avants et des passes au large, quatre-vingts lignes par
 * match, que le fil de la ligue ne garde pas. Le manager cliquait donc dans le
 * vide. Ces lignes-là sont reconstruites du JOURNAL, qui est persisté : elles
 * survivent au rechargement comme le reste du match.
 */
function mesOrdres(etat: EtatMatchEnLigne, monCote: CoteEnLigne): LigneFil[] {
  const lignes: LigneFil[] = [];
  for (const ev of etat.journal) {
    if (ev.cote !== monCote || ev.commande.type === 'presence' || ev.commande.type === 'veille') continue;
    const ordre: OrdreFil = ev.commande.type === 'strategie' ? 'consignes'
      : ev.commande.type === 'remplacement' ? 'remplacement' : ev.commande.choix;
    const ligne: LigneFil = { minute: Math.min(80, Math.round(ev.horloge)), texte: '', type: 'ordre', cote: monCote, ordre };
    if (ev.auto) ligne.auto = true;
    lignes.push(ligne);
  }
  return lignes;
}

/** Ce que la liste des rencontres affiche d'un match terminé : voir `VueMatchEnLigne.resume`. */
export function resumeMatchEnLigne(etat: EtatMatchEnLigne): VueMatchEnLigne {
  return {
    id: etat.id, instance: etat.debut, minute: Math.floor(etat.horloge), horloge: r2(etat.horloge), termine: etat.termine,
    score: etat.score, essais: etat.essais, penalites: etat.penalites, fil: [], stats: etat.stats,
    remplacementsFaits: 0, surLeTerrain: [], surLeBanc: [], resume: true,
  };
}

export function vueMatchEnLigne(
  etat: EtatMatchEnLigne, clubId: string, emisLe = Date.now(),
  /** L'écran sait rejouer le film : `depuis` est le dernier pas qu'il connaît. */
  film?: { depuis?: number },
  /** L'écran lit la chronologie : son dernier pas et sa somme de contrôle. */
  chrono?: RepereChrono,
): VueMatchEnLigne {
  const monCote = etat.equipes ? COTES.find((c) => etat.equipes![c].clubId === clubId) : undefined;
  const vue: VueMatchEnLigne = {
    id: etat.id, instance: etat.debut, minute: Math.floor(etat.horloge), horloge: r2(etat.horloge), termine: etat.termine,
    score: etat.score, essais: etat.essais, penalites: etat.penalites,
    fil: etat.fil, stats: etat.stats, feuille: etat.feuille,
    moments: momentsDepuisFil(etat.id, etat.fil), gele: Boolean(etat.decision),
    remplacementsFaits: 0, surLeTerrain: [], surLeBanc: [],
  };
  if (etat.termine) {
    // La fin du film : ce que la caméra a vu jusqu'au coup de sifflet final.
    const garde = chrono ? moteurGarde(etat) : undefined;
    const fin = garde ? extraireChrono(garde.moteur, chrono, true) : undefined;
    if (fin && fin !== 'refilmer' && (fin.cle || fin.s.length)) vue.chrono = fin;
    return vue;
  }

  // ⚠️ UNE SEULE REJOUE POUR TOUT LE MONDE. Le terrain et le banc sortent du
  // MÊME état du moteur : deux appels, c'était deux fois le coût pour la même
  // image — et, sur un démarrage à froid où le cache est vide, deux rejoues
  // complètes du match à chaque sondage.
  // ⚠️ ELLE NE FAIT PAS AVANCER LE MATCH. Le moteur est celui que le dernier
  // `avancerMatchEnLigne` a laissé ; à froid (vue de la ligue sur une autre
  // instance), il est rejoué jusqu'à la minute écrite, pas au-delà.
  let e = derouler(etat, { minute: etat.horloge }, { regarde: Boolean(film || chrono) });
  // ⚠️ LE FILM REMPLACE LE RELEVÉ, IL NE S'Y AJOUTE PAS : envoyer les deux
  // doublerait le transfert pour un écran qui n'en lit qu'un. Sans film à
  // donner (caméra vide), le relevé reste le filet.
  if (chrono) {
    let c = extraireChrono(e, chrono);
    if (c === 'refilmer' && e.sim < 900) {
      // Ce moteur n'a pas filmé les pas que l'écran attend (au-delà de sa
      // traîne). En début de match, on le rejoue caméra allumée — il redonne
      // les mêmes pas, au chiffre près — plutôt que de faire sauter l'écran
      // par-dessus le trou. Plus tard la rejoue coûterait plusieurs secondes :
      // l'écran reçoit alors une image complète et s'y raccorde en douceur.
      const sim = e.sim;
      supprimerCache(cleCache(etat));
      e = derouler(etat, { sim }, { regarde: true });
      c = extraireChrono(e, chrono, true);
    } else if (c === 'refilmer') c = extraireChrono(e, chrono, true);
    if (c && c !== 'refilmer') vue.chrono = c;
  } else if (film) vue.film = extraireFilm(e, film.depuis);
  if (!vue.film && !vue.chrono) vue.terrain = extraireTerrain(e, emisLe);
  if (!monCote) return vue;

  vue.monCote = monCote;
  // La dernière consigne DONNÉE : elle prend effet une marge plus tard, mais le manager doit la voir tout de suite.
  vue.maStrategie = strategieA(etat, monCote, Infinity);
  vue.signalAdverse = signalAdverse(etat, monCote);
  if (etat.decision && etat.decision.cote === monCote) vue.decision = etat.decision;
  // Le tri est stable : à minute égale, le récit du match passe avant mes ordres.
  const ordres = mesOrdres(etat, monCote);
  if (ordres.length) vue.fil = [...etat.fil, ...ordres].sort((a, b) => a.minute - b.minute).slice(-FIL_MAX);

  // Le banc vient du moteur : un remplaçant déjà entré ne doit plus apparaître
  // comme disponible, et un exclu ne doit plus être remplaçable.
  const cible = MOTEUR[monCote];
  vue.remplacementsFaits = cible === 'A' ? e.remplacementsA : e.remplacementsB;
  for (const p of e.pions) {
    if (p.cote !== cible) continue;
    const ligne = { carteId: p.sourceId, nom: p.nom, numero: p.numeroMaillot ?? p.numero, poste: p.poste };
    if (p.surLeTerrain && p.numero <= 15) vue.surLeTerrain.push(ligne);
    else if (!p.surLeTerrain && p.minutes === 0 && p.numero > 15) vue.surLeBanc.push(ligne);
  }
  vue.surLeTerrain.sort((a, b) => a.numero - b.numero);
  vue.surLeBanc.sort((a, b) => a.numero - b.numero);
  return vue;
}
