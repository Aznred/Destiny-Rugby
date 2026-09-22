import { momentsDepuisFil } from './momentsForts.js';
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
  demanderRemplacement, facteurHorloge, infoPenalite, type PenaliteEnCours,
} from '../moteur/moteur.js';
import type { EtatMatch, IntentionPied, Phase, TypeLancement, Vol, VolRecent } from '../moteur/etat.js';
import type { Cote } from '../moteur/terrain.js';
import { corpsPourAffichage, porteurPourAffichage } from '../moteur/dynamique.js';
import { scorePossible } from '../championnat.js';
import { POSTES_BANC_MANAGER, POSTES_XV_MANAGER } from '../compositionManager.js';
import { adequationAuPoste, facteurDePerformance } from '../carteJoueur.js';
import type { CompositionManager, PosteId, TactiqueManager } from '../../types.js';
import type { Coequipier } from '../effectif.js';
import { graine } from './aleatoire.js';

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
  | { type: 'decision'; choix: ChoixPenaliteEnLigne };

export interface EvenementMatchEnLigne {
  /** La minute de jeu à laquelle l'ordre prend effet. Le journal est trié dessus. */
  horloge: number;
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
  simulation?: number;
  gestes?: import('../moteur/dynamique.js').GesteMatch[];
  arbitre?: { x: number; y: number; vx: number; vy: number; regard: number };
  preparationTir?: { buteurId: string; progression: number; transformation: boolean };
  pions: PionDirect[];
  ballon: { x: number; y: number; hauteur?: number };
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
  lancement?: { type: TypeLancement; intention?: IntentionPied };
  /** Lecture visuelle de la conquête en cours : appel de touche ou poussée. */
  conquete?: {
    type: 'melee' | 'touche'; progression: number;
    combinaison?: 'premierBloc' | 'milieu' | 'fond' | 'leurreDevant';
    cibleId?: string; pousseVers?: CoteEnLigne;
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
}

/** Ce que le client reçoit : jamais la graine, jamais le plan d'en face. */
export interface VueMatchEnLigne {
  moments?: import('./momentsForts.js').MomentFort[];
  gele?: boolean;
  id: string;
  /** Identite du coup d'envoi : distingue une vraie relance d'une vieille reponse. */
  instance?: number;
  terrain?: TerrainDirect;
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
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LE TEMPS
// ═══════════════════════════════════════════════════════════════════════════

/** Une minute de rugby correspond à une minute réelle, hors arrêts de décision. */
export const MS_PAR_MINUTE = 60_000;
/** Ce qu'un manager a pour trancher une pénalité avant que l'IA ne le fasse. */
export const DELAI_DECISION = 20_000;
/** Au-delà, on considère que le manager a fermé l'onglet. */
export const DELAI_PRESENCE = 45_000;
/** Un match lancé puis oublié se termine tout seul au bout de ce délai. */
export const DUREE_REELLE = 80 * MS_PAR_MINUTE;

/**
 * ⚠️ L'HORLOGE D'UN MATCH NE RECULE JAMAIS. Elle est calculée à partir de
 * `Date.now()` du serveur, et deux instances serverless n'ont pas la
 * milliseconde exacte : sans ce plancher, une requête servie par une machine
 * légèrement en retard ramènerait le chrono de la 44ᵉ à la 43ᵉ, rejouerait un
 * essai déjà annoncé, et le fil se contredirait sous les yeux des deux
 * managers.
 */
export function minuteCible(etat: EtatMatchEnLigne, maintenant: number): number {
  return Math.max(etat.horloge, Math.min(80, (maintenant - etat.debut - etat.gel) / MS_PAR_MINUTE));
}

/**
 * Les minutes de jeu du moteur, AU CENTIÈME.
 *
 * ⚠️ ET PAS `e.minute`, QUI EST UN ENTIER. Toute la rejoue vise cette valeur :
 * s'arrêter sur `e.minute` revient à ne jamais s'arrêter ailleurs qu'au début
 * d'une minute, donc à jouer le direct par bonds de soixante secondes.
 */
const minuteExacte = (e: EtatMatch): number => Math.min(80, e.t / 60);

/** Le gel ne se relâche jamais non plus : il ne fait que s'ajouter. */
function gelJusqua(etat: EtatMatchEnLigne, instant: number): number {
  return Math.max(etat.gel, instant - etat.debut - etat.horloge * MS_PAR_MINUTE);
}

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
 * Le barème est celui du jeu entier (`facteurDePerformance`) : 100 % à son
 * poste, dans sa famille ou à son poste secondaire, 82 % ailleurs.
 */
export function feuilleGeleeEnLigne(
  effectif: readonly Coequipier[], composition: CompositionManager,
): Coequipier[] {
  const parId = new Map(effectif.map(j => [j.id, j]));
  return [...composition.titulaires, ...composition.remplacants].map((id, i) => {
    const joueur = parId.get(id);
    if (!joueur) return null;
    const poste = POSTES_FEUILLE[i] ?? joueur.poste;
    const facteur = facteurDePerformance(adequationAuPoste(joueur.poste, poste, joueur.postesSecondaires));
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
// 5. LA REJOUE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ LE CACHE EST UNE OPTIMISATION, JAMAIS UNE MÉMOIRE. Sa clé contient tout ce
 * qui détermine le match (graine et nombre d'ordres) : un ordre de plus, et
 * c'est un autre match qui est calculé. Un processus serverless qui démarre à
 * froid le retrouve à l'identique en rejouant — le cache n'est donc jamais une
 * source de vérité, seulement un raccourci.
 */
interface EntreeCacheMoteur { moteur: EtatMatch; minute: number; octets: number }
const CACHE = new Map<string, EntreeCacheMoteur>();
const MOTEUR_VERS_COTE: Record<Cote, CoteEnLigne> = { A: 'domicile', B: 'exterieur' };
/**
 * 16 entrées obligeaient 384 matchs sur 400 à repartir du coup d'envoi à la
 * requête suivante. Le cache est désormais dimensionné pour la charge cible,
 * mais aussi borné en mémoire : une fonction chaude ne grossit jamais sans
 * limite si les commentaires d'un match deviennent exceptionnellement longs.
 */
const CACHE_MAX = 512;
const CACHE_OCTETS_MAX = 96 * 1024 * 1024;
let cacheOctets = 0;
const cleCache = (etat: EtatMatchEnLigne) => `${etat.cle}#${etat.journal.length}`;

function supprimerCache(cle: string): void {
  cacheOctets -= CACHE.get(cle)?.octets ?? 0;
  CACHE.delete(cle);
}

function poidsMoteur(moteur: EtatMatch): number {
  // Estimation volontairement prudente et O(1), pour ne pas sérialiser trente
  // joueurs à chacun des ticks du direct. Les fermetures et références du RNG
  // ne sont de toute façon pas mesurables par JSON.stringify.
  return 48 * 1024 + moteur.pions.length * 2_048 + moteur.commentaires.length * 320;
}

function ranger(cle: string, moteur: EtatMatch): void {
  const precedente = CACHE.get(cle);
  if (precedente) {
    supprimerCache(cle);
  }
  const entree: EntreeCacheMoteur = {
    moteur, minute: minuteExacte(moteur), octets: poidsMoteur(moteur),
  };
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
  return { matchs: CACHE.size, octetsEstimes: cacheOctets, maximumMatchs: CACHE_MAX, maximumOctets: CACHE_OCTETS_MAX };
}

/**
 * La pénalité qui MÉRITE qu'on réveille un entraîneur : à son avantage, dans
 * les 50 mètres adverses, et pour un camp dont on a des nouvelles.
 *
 * ⚠️ ELLE SERT AUX DEUX BOUTS, ET C'EST OBLIGATOIRE. `pousser` s'arrête
 * dessus ; `avancerMatchEnLigne` en fait une décision. Si les deux critères
 * divergeaient d'un mètre, le moteur s'arrêterait sur une pénalité dont
 * personne ne ferait jamais rien — et le match resterait figé là pour toujours,
 * puisque plus aucun tick ne le sortirait de la phase.
 */
function penaliteADecider(e: EtatMatch, camps: readonly Cote[]): PenaliteEnCours | null {
  if (e.fini || e.phase !== 'penalite' || !e.penalite) return null;
  if (!camps.includes(e.penalite.pour)) return null;
  const info = infoPenalite(e);
  return info && info.distance <= METRES_DECISION ? info : null;
}

/** Avance le moteur, en s'arrêtant sur une pénalité si un manager doit trancher. */
function pousser(e: EtatMatch, jusqua: number, arretSur: readonly Cote[]): void {
  // ⚠️ UN PAS DE 0,6 SECONDE, TOUJOURS LE MÊME, ET POUR DEUX RAISONS.
  //
  // La première est la décision du manager : la phase « pénalité » ne dure que
  // 2,5 secondes à l'écran. Un pas plus large la traverserait sans jamais
  // pouvoir s'y arrêter, et « je prends les points ou je vais en touche ? »
  // n'existerait tout simplement pas.
  //
  // La seconde est le DÉTERMINISME, et c'est elle qui interdit d'optimiser ici.
  // Un pas plus large dépasse la minute demandée de plus loin : la rejoue
  // s'arrêterait à la 30ᵉ 42 au lieu de la 30ᵉ 03, donc à un autre tick, donc
  // AVANT ou APRÈS un ordre daté de la 30ᵉ. Deux managers dont l'un regarde et
  // l'autre pas verraient alors deux matchs différents.
  //
  // Le coût est mesuré, et il ne vient pas de là : à pas de 8 secondes, un
  // match complet prend 267 ms au lieu de 285 (le prix est celui des ticks du
  // moteur, pas celui des appels). Il n'y a donc rien à gagner à élargir.
  let garde = 0;
  while (!e.fini && minuteExacte(e) < jusqua && garde++ < 40_000) {
    if (arretSur.length && penaliteADecider(e, arretSur)) return;
    avancer(e, 0.6);
  }
}

/**
 * Coupe l'avance aux minutes tactiques. Sans ces paliers, les bascules 60/65/70
 * n'étaient recalculées qu'après un clic du manager et restaient décoratives
 * lors des matchs joués en son absence.
 */
function pousserAvecBascules(e: EtatMatch, etat: EtatMatchEnLigne, jusqua: number, arretSur: readonly Cote[]): void {
  for (const seuil of [60, 65, 70]) {
    if (minuteExacte(e) >= seuil || seuil > jusqua) continue;
    pousser(e, seuil, arretSur);
    if (minuteExacte(e) + 1e-9 < seuil) return;
    for (const cote of COTES) {
      const moteur = MOTEUR[cote];
      const ecart = moteur === 'A' ? e.scoreA - e.scoreB : e.scoreB - e.scoreA;
      const strategie = strategieA(etat, cote, seuil);
      const effective = { ...strategie, mentalite: mentaliteAppliquee(strategie, seuil, ecart) };
      appliquerTactiqueEquipe(e, moteur, tactiqueDepuisStrategie(effective), true, impactStrategie(effective));
    }
  }
  pousser(e, jusqua, arretSur);
}

/** La stratégie d'un camp telle qu'elle était à une minute donnée. */
function strategieA(etat: EtatMatchEnLigne, cote: CoteEnLigne, horloge: number): StrategieEnLigne {
  let s = strategieValide(etat.strategies[cote]);
  for (const ev of etat.journal) {
    if (ev.horloge > horloge) break;
    if (ev.cote === cote && ev.commande.type === 'strategie') s = strategieValide(ev.commande.strategie);
  }
  return s;
}

function appliquerAuMoteur(e: EtatMatch, ev: EvenementMatchEnLigne): void {
  const cote = MOTEUR[ev.cote];
  const c = ev.commande;
  if (c.type === 'strategie') {
    const ecart = cote === 'A' ? e.scoreA - e.scoreB : e.scoreB - e.scoreA;
    const effective: StrategieEnLigne = { ...c.strategie, mentalite: mentaliteAppliquee(c.strategie, e.minute, ecart) };
    appliquerTactiqueEquipe(e, cote, tactiqueDepuisStrategie(effective), true, impactStrategie(effective));
  } else if (c.type === 'remplacement') {
    demanderRemplacement(e, cote, c.entrantId, c.sortantId);
  } else if (c.type === 'decision') {
    choisirPenalite(e, cote, c.choix);
  }
}

function monter(etat: EtatMatchEnLigne): EtatMatch {
  const equipes = etat.equipes;
  if (!equipes) throw new Error('Ce match est terminé : ses feuilles ont été archivées.');
  const strategieD = strategieA(etat, 'domicile', 0);
  const strategieE = strategieA(etat, 'exterieur', 0);
  const e = creerMatch(
    equipes.domicile.nom, equipes.exterieur.nom,
    equipes.domicile.feuille, equipes.exterieur.feuille,
    etat.cibles.domicile, etat.cibles.exterieur, etat.cle, undefined,
    {
      rng: graine(`match#${etat.cle}`),
      // ⚠️ LE CŒUR DU DIRECT. Les déplacements restent à vitesse naturelle et
      // chaque arrêt utilise sa durée directe, courte mais lisible.
      tempsReel: true,
      scoreSurTerrain: true,
      compositionA: equipes.domicile.feuille, compositionB: equipes.exterieur.feuille,
      tactiqueA: tactiqueDepuisStrategie(strategieD), tactiqueB: tactiqueDepuisStrategie(strategieE),
      capitaineAId: equipes.domicile.capitaineId, capitaineBId: equipes.exterieur.capitaineId,
      buteurAId: equipes.domicile.buteurId, buteurBId: equipes.exterieur.buteurId,
      cohesionA: equipes.domicile.collectif, cohesionB: equipes.exterieur.collectif,
    },
  );
  e.impactBanc = { A: impactStrategie(strategieD), B: impactStrategie(strategieE) };
  return e;
}

/** Reconstruit l'état du moteur à la minute demandée. */
function rejouer(etat: EtatMatchEnLigne, jusqua: number, arretSur: readonly CoteEnLigne[]): EtatMatch {
  const cle = cleCache(etat);
  const garde = CACHE.get(cle);
  let e: EtatMatch;
  let depart = 0;
  if (garde && garde.minute <= jusqua + 1e-9) {
    // Le match est déjà calculé jusqu'ici : on repart de là, sans rien rejouer.
    e = garde.moteur;
    depart = etat.journal.length;
    // Un vrai LRU : un match regardé reste chaud, contrairement au FIFO qui
    // éjectait aussi les directs actifs dès que 16 autres matchs passaient.
    CACHE.delete(cle);
    CACHE.set(cle, garde);
  } else {
    e = monter(etat);
  }
  for (let i = depart; i < etat.journal.length; i++) {
    const ev = etat.journal[i];
    if (ev.horloge > jusqua) break;
    pousserAvecBascules(e, etat, ev.horloge, []);
    appliquerAuMoteur(e, ev);
  }
  // Une présence ne rend jamais le passé interactif. C'était le défaut qui
  // faisait « revenir au début » un direct lorsqu'un entraîneur l'ouvrait :
  // sur une instance froide, la rejoue repartait de 0 avec `arretSur` actif et
  // s'immobilisait à la toute première pénalité du match, parfois quarante
  // minutes avant le chrono réellement affiché.
  //
  // La table de présence conserve le dernier battement, pas l'instant exact
  // d'ouverture. La fenêtre de validité constitue donc la borne sûre : une
  // pénalité antérieure à celle-ci n'a pas pu être proposée par ce passage sur
  // le direct. On active chaque banc à sa borne, sans jamais reculer le moteur.
  const seuils = arretSur.map((cote) => {
    const vu = etat.presence[cote];
    const minutePresence = vu !== undefined
      ? Math.max(0, (vu - etat.debut - etat.gel) / MS_PAR_MINUTE)
      : jusqua;
    const debutArret = Math.max(etat.horloge, minutePresence);
    return {
      cote: MOTEUR[cote],
      depuis: Math.max(0, Math.min(jusqua, debutArret)),
    };
  }).sort((a, b) => a.depuis - b.depuis);
  const actifs: Cote[] = [];
  const deja = minuteExacte(e);
  for (const seuil of seuils) if (seuil.depuis <= deja + 1e-9 && !actifs.includes(seuil.cote)) actifs.push(seuil.cote);
  for (const seuil of seuils) {
    if (seuil.depuis <= minuteExacte(e) + 1e-9) continue;
    pousserAvecBascules(e, etat, Math.min(jusqua, seuil.depuis), actifs);
    if (minuteExacte(e) + 1e-9 < Math.min(jusqua, seuil.depuis)) break;
    if (!actifs.includes(seuil.cote)) actifs.push(seuil.cote);
  }
  pousserAvecBascules(e, etat, jusqua, actifs);
  ranger(cle, e);
  return e;
}

/**
 * Déplace l'entrée de cache d'un état vers son successeur.
 *
 * Sans elle, chaque ordre d'un manager relancerait un match complet depuis la
 * première seconde : quinze changements tactiques dans une rencontre, ce sont
 * quinze rejoues de 80 minutes pour rien.
 */
function adopterCache(avant: EtatMatchEnLigne, apres: EtatMatchEnLigne, moteur: EtatMatch): void {
  supprimerCache(cleCache(avant));
  ranger(cleCache(apres), moteur);
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
    if (!TYPES_FIL.has(c.type)) continue;
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

function extraireTerrain(e: EtatMatch, emisLe: number): TerrainDirect {
  const terrain: TerrainDirect = {
    pions: e.pions.filter((p) => p.surLeTerrain).map((p) => ({
      id: p.id, numero: p.numeroMaillot ?? p.numero, numeroRole: p.numero, nom: p.nom, poste: p.poste,
      cote: MOTEUR_VERS_COTE[p.cote],
      x: r2(p.pos.x), y: r2(p.pos.y), vx: r2(p.vitesse.x), vy: r2(p.vitesse.y),
      corps: corpsPourAffichage(p),
      force: p.puissance, tailleCm: p.tailleCm, poidsKg: p.poidsKg,
    })),
    ballon: {
      x: r2(e.ballon.x), y: r2(e.ballon.y),
      hauteur: e.ballonLibre ? r2(e.ballonLibre.hauteur) : undefined,
    },
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
      buteurId: e.tir.buteur.id, progression: Math.max(0, Math.min(1, 1 - e.minuteur / (e.dureeArret ?? 45))), transformation: e.tir.valeur === 2,
    } : undefined,
    emisLe,
    snapshot: Math.max(0, Math.round(e.t / 0.6)),
  };
  if (e.lancement) {
    terrain.lancement = { type: e.lancement.type };
    if (e.lancement.intention) terrain.lancement.intention = e.lancement.intention;
  }
  if (e.conquete) {
    terrain.conquete = {
      type: e.conquete.type,
      progression: r2(e.conquete.progression),
      combinaison: e.conquete.combinaison,
      cibleId: e.conquete.cibleId,
      pousseVers: e.conquete.pousseVers ? MOTEUR_VERS_COTE[e.conquete.pousseVers] : undefined,
    };
  }
  if (e.aplatissage) {
    terrain.aplatissage = {
      marqueurId: e.aplatissage.marqueur.id,
      progression: r2(Math.max(0, Math.min(1, 1 - e.minuteur / 1.35))),
    };
  }
  if (e.ruck?.porteurId && e.ruck.plaqueurId && e.ruck.debut !== undefined) {
    const progression = Math.max(0, Math.min(1, (e.t - e.ruck.debut) / 1.35));
    if (progression < 1) terrain.contact = {
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
  const ancienneCle = cleCache(etat);
  relever(etat, e);
  etat.horloge = 80;
  etat.termine = true;
  etat.feuille = extraireFeuille(e);
  delete etat.decision;
  delete etat.equipes;
  etat.journal = [];
  supprimerCache(ancienneCle);
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
    id: p.id, cle, debut: p.debut, gel: 0, horloge: 0,
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
 * Fait avancer un match jusqu'à l'instant présent.
 *
 * ⚠️ C'EST LE SEUL ENDROIT QUI FAIT AVANCER LE TEMPS, et il est appelé à chaque
 * lecture de la ligue — donc par n'importe qui, y compris par l'horloge
 * automatique quand personne ne regarde. C'est ce qui garantit qu'un match
 * lancé puis abandonné se termine quand même, et qu'une ligue ne se bloque
 * jamais sur l'absence d'un manager.
 */
export function avancerMatchEnLigne(etat: EtatMatchEnLigne, maintenant: number): EtatMatchEnLigne {
  if (etat.termine) return etat;
  const suivant: EtatMatchEnLigne = {
    ...etat, journal: [...etat.journal], presence: { ...etat.presence },
    score: { ...etat.score }, essais: { ...etat.essais }, penalites: { ...etat.penalites },
  };
  if (!suivant.equipes) { suivant.termine = true; return suivant; }

  // ── 1. Une décision en attente gèle l'horloge, puis expire ────────────────
  if (suivant.decision) {
    const limite = suivant.decision.jusqua;
    if (maintenant < limite) {
      suivant.gel = gelJusqua(etat, maintenant);
      return suivant;
    }
    const d = suivant.decision;
    const ecart = suivant.score[d.cote] - suivant.score[autre(d.cote)];
    const choix = decisionIA(
      strategieA(suivant, d.cote, d.horloge), d.distance,
      d.distance < 52 && d.angle < 30, Math.round(d.horloge), ecart,
    );
    suivant.journal.push({ horloge: d.horloge, cote: d.cote, commande: { type: 'decision', choix }, auto: true });
    suivant.gel = gelJusqua(etat, limite);
    delete suivant.decision;
  }

  // ── 2. On avance jusqu'à l'heure qu'il est ────────────────────────────────
  // ⚠️ LES DEUX CAMPS SONT ÉCOUTÉS, PAS SEULEMENT LE PREMIER. La rejoue ne
  // s'arrêtait que sur les pénalités d'UN seul camp — celui de l'équipe à
  // domicile dès qu'elle regardait. Le manager visiteur, présent devant son
  // écran, ne se voyait alors JAMAIS proposer la moindre décision de tout le
  // match : le moteur traversait ses pénalités sans marquer l'arrêt.
  const arret = COTES.filter((c) => presenceActive(suivant, c, maintenant));
  const e = rejouer(suivant, minuteCible(suivant, maintenant), arret);
  relever(suivant, e);

  // ── 3. Une pénalité arrêtée devant un manager présent devient une décision ─
  const penalite = penaliteADecider(e, arret.map((c) => MOTEUR[c]));
  if (penalite) {
    suivant.decision = {
      cote: MOTEUR_VERS_COTE[penalite.cote],
      distance: penalite.distance, angle: penalite.angle,
      probabilite: Math.round(penalite.probabilite * 100), buteur: penalite.buteur,
      aPortee: penalite.aPortee,
      horloge: suivant.horloge, jusqua: maintenant + DELAI_DECISION,
    };
  }

  if (e.fini || suivant.horloge >= 80) clore(suivant, e);
  return suivant;
}

/**
 * Enregistre l'ordre d'un manager.
 *
 * ⚠️ IL REND TOUJOURS UN ÉTAT, jamais une exception. Un clic sur « prendre les
 * points » qui arrive une seconde après la reprise du jeu n'est pas une faute
 * du joueur : l'ordre est ignoré, le match continue. Lever une erreur ferait
 * remonter « action impossible » à l'écran pour un geste parfaitement normal.
 */
export function commanderMatchEnLigne(
  etat: EtatMatchEnLigne, clubId: string, action: CommandeMatchEnLigne, maintenant: number,
): EtatMatchEnLigne {
  if (etat.termine || !etat.equipes) return etat;
  const cote = COTES.find((c) => etat.equipes![c].clubId === clubId);
  if (!cote) return etat;
  const commande = normaliserCommande(action);
  if (!commande) return etat;

  const marque: EtatMatchEnLigne = { ...etat, presence: { ...etat.presence, [cote]: maintenant } };
  if (commande.type === 'presence') return avancerMatchEnLigne(marque, maintenant);

  // La décision se prend à la minute où le jeu est arrêté, pas à celle qu'il
  // serait sans l'arrêt : sinon l'ordre serait daté après la reprise.
  const horloge = etat.decision && etat.decision.cote === cote
    ? etat.decision.horloge
    : Math.min(80, minuteCible(marque, maintenant));

  if (commande.type === 'decision' && (!etat.decision || etat.decision.cote !== cote)) {
    return avancerMatchEnLigne(marque, maintenant);
  }

  const moteur = rejouer(marque, horloge, []);
  if (commande.type === 'remplacement') {
    // Le moteur refuse un entrant déjà utilisé ou un sortant absent. On le lui
    // demande AVANT d'écrire au journal : un ordre mort y resterait pour
    // toutes les rejoues suivantes.
    const cible = MOTEUR[cote];
    const entrant = moteur.pions.find((p) => p.cote === cible && p.sourceId === commande.entrantId && !p.surLeTerrain && p.minutes === 0);
    const sortant = moteur.pions.find((p) => p.cote === cible && p.sourceId === commande.sortantId && p.surLeTerrain && p.numero <= 15);
    if (!entrant || !sortant) return avancerMatchEnLigne(marque, maintenant);
  }

  const evenement: EvenementMatchEnLigne = { horloge, cote, commande };
  const suivant: EtatMatchEnLigne = { ...marque, journal: [...marque.journal, evenement] };
  if (commande.type === 'strategie') {
    suivant.strategies = { ...marque.strategies, [cote]: commande.strategie };
  }
  if (commande.type === 'decision' && marque.decision) {
    // Le gel s'arrête à l'instant du clic : le manager n'a pas volé de temps.
    suivant.gel = gelJusqua(marque, maintenant);
    delete suivant.decision;
  }
  appliquerAuMoteur(moteur, evenement);
  adopterCache(marque, suivant, moteur);
  return avancerMatchEnLigne(suivant, maintenant);
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
  const suivant: EtatMatchEnLigne = { ...etat, presence: {}, decision: undefined };
  if (!suivant.equipes) { suivant.termine = true; return suivant; }
  clore(suivant, rejouer(suivant, 80, []));
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
    if (ev.cote !== monCote || ev.commande.type === 'presence') continue;
    const ordre: OrdreFil = ev.commande.type === 'strategie' ? 'consignes'
      : ev.commande.type === 'remplacement' ? 'remplacement' : ev.commande.choix;
    const ligne: LigneFil = { minute: Math.min(80, Math.round(ev.horloge)), texte: '', type: 'ordre', cote: monCote, ordre };
    if (ev.auto) ligne.auto = true;
    lignes.push(ligne);
  }
  return lignes;
}

export function vueMatchEnLigne(etat: EtatMatchEnLigne, clubId: string, emisLe = Date.now()): VueMatchEnLigne {
  const monCote = etat.equipes ? COTES.find((c) => etat.equipes![c].clubId === clubId) : undefined;
  const vue: VueMatchEnLigne = {
    id: etat.id, instance: etat.debut, minute: Math.floor(etat.horloge), horloge: r2(etat.horloge), termine: etat.termine,
    score: etat.score, essais: etat.essais, penalites: etat.penalites,
    fil: etat.fil, stats: etat.stats, feuille: etat.feuille,
    moments: momentsDepuisFil(etat.id, etat.fil), gele: Boolean(etat.decision),
    remplacementsFaits: 0, surLeTerrain: [], surLeBanc: [],
  };
  if (etat.termine) return vue;

  // ⚠️ UNE SEULE REJOUE POUR TOUT LE MONDE. Le terrain et le banc sortent du
  // MÊME état du moteur : deux appels, c'était deux fois le coût pour la même
  // image — et, sur un démarrage à froid où le cache est vide, deux rejoues
  // complètes du match à chaque sondage.
  const e = rejouer(etat, etat.horloge, []);
  vue.terrain = extraireTerrain(e, emisLe);
  if (!monCote) return vue;

  vue.monCote = monCote;
  vue.maStrategie = strategieA(etat, monCote, etat.horloge);
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
