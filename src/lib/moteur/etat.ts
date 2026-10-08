// L'ÉTAT D'UN MATCH — la structure de données partagée par tout le moteur.
//
// Elle vit dans son propre fichier pour que `tactique.ts` (le placement) et
// `phasesArretees.ts` puissent la lire sans importer `moteur.ts`, qui les
// importe : sans ça, on aurait un cycle d'imports.

import type { Pion } from './entites.js';
import type { Cote, Vec } from './terrain.js';
import type { TactiqueManager } from '../../types.js';

export type Phase =
  | 'coupEnvoi'      // engagement et renvois après un score
  | 'renvoi22'       // renvoi aux 22
  | 'jeuCourant'     // ballon vivant, en main
  | 'ballonEnLAir'   // un coup de pied est en cours
  | 'ballonLibre'    // ballon au sol : rebonds, roule et course à la récupération
  | 'ruck'
  | 'maul'
  | 'maul'
  | 'melee'
  | 'touche'
  | 'penalite'       // la faute vient d'être sifflée, l'équipe choisit
  | 'tirAuBut'
  | 'transformation'
  | 'aplatissage'    // le marqueur contrôle puis pose réellement le ballon
  | 'tmo'            // arbitrage vidéo (TMO) : vérification sur écran TV
  | 'apresEssai'
  | 'miTemps'
  | 'bagarre'        // ça a dégénéré : le jeu attend l'ordre du joueur
  | 'fini';

// Les phases pendant lesquelles le chronomètre défile vite : le ballon est mort,
// il n'y a rien à regarder. L'horloge du match avance alors par bonds.
export const PHASES_ARRETEES: Set<Phase> = new Set<Phase>([
  'coupEnvoi', 'renvoi22', 'melee', 'touche', 'penalite', 'tirAuBut',
  'transformation', 'tmo', 'apresEssai', 'miTemps',
]);

export type TMOMotif =
  | 'en_avant' | 'plaquage_haut' | 'jeu_deloyal' | 'aplatissage'
  | 'en_avant_volontaire' | 'coup_de_poing' | 'pied_en_touche';
export type TMODecision =
  | 'en_cours' | 'essai_accorde' | 'essai_refuse' | 'carton_jaune' | 'carton_rouge' | 'penalite';

export interface TMOEtat {
  actif: boolean;
  type: 'essai' | 'faute_grave';
  motif: TMOMotif;
  libelleMotif: string;
  cible: Vec;
  lieuFaute?: Vec;
  auteur?: Pion;
  fautif?: { id: string; nom: string; cote: Cote };
  victime?: Pion;
  carton?: 'jaune' | 'rouge';
  decision: TMODecision;
  duree: number;
  restant: number;
  etape: 'appel' | 'visionnage' | 'decision';
  origineEssai?: Aplatissage;
  essaiEnJeu?: { marqueur: Pion; origine: 'jeu' | 'maul'; lieu: Vec };
}

export type TypeCommentaire =
  | 'essai' | 'but' | 'butRate' | 'plaquage' | 'franchissement' | 'ruck'
  | 'melee' | 'touche' | 'maul' | 'pied' | 'penalite' | 'carton'
  | 'remplacement' | 'jalon' | 'faute' | 'jeu';

export interface Commentaire {
  seconde?: number;
  minute: number;
  texte: string;
  type: TypeCommentaire;
  cote: Cote | null;
  points: number;
  scoreA: number;
  scoreB: number;
  moi?: boolean;
}

export type SystemeDefensif = 'blitz' | 'glissee' | 'repli';

// ---------------------------------------------------------------------------
// LE JOUEUR PREND LA MAIN — actions, tension, bagarre, discipline
// ---------------------------------------------------------------------------

/**
 * ⚠️ LE NIVEAU N'EST PAS DÉCORATIF : C'EST LUI QUI RÈGLE LA DISCIPLINE.
 * En amateur ça part vite et l'arbitre sort la carte facilement, mais la
 * commission fait dans la semaine et dans le pardon. En professionnel, une
 * bagarre est rarissime — personne ne veut jouer sa saison sur un coup de sang
 * — et quand elle éclate, elle coûte des mois. Voir `moteur/bagarre.ts`.
 */
export type NiveauMatch = 'pro' | 'amateur';

/** Ce que le joueur peut demander à son pion pendant le match. */
/**
 * ⚠️ LE COUP DE SIFFLET, POUR QU'IL SE VOIE.
 *
 * Retour de jeu : « on peut faire des en-avants sans répercussion ». La
 * répercussion EXISTAIT — mêlée pour l'adversaire, possession perdue, c'est
 * mesuré — mais elle était invisible : elle passait dans une ligne du fil de
 * commentaire, réduit à sa dernière ligne au-dessus du terrain, et défilant à
 * neuf fois la vitesse réelle. Une sanction qu'on ne voit pas est une sanction
 * qui n'existe pas pour le joueur.
 *
 * L'arbitre pose donc sa décision ICI, et l'écran l'affiche en grand : ce qui
 * s'est passé, et surtout QUI RÉCUPÈRE LE BALLON.
 */
export interface CoupDeSifflet {
  /** Clé i18n de la décision : en-avant, passe en avant, pénalité, carton. */
  cle: string;
  /** Le club qui récupère le ballon. */
  club: string;
  /** Le fautif, s'il est nommé. */
  fautif: string;
  /** ⚠️ Est-ce MOI qui viens de la faire ? L'écran ne le dit pas pareil. */
  maFaute: boolean;
  /** Ce qu'il reste à l'afficher, en secondes SIMULÉES. */
  restant: number;
  /**
   * L'arbitre appelle un capitaine (IA par poste) : son identifiant. La
   * prochaine faute de son équipe vaudra carton — voir `ia/arbitrage.ts`.
   */
  avertissement?: string;
}

export type ActionJoueur =
  // ── Ballon en main ───────────────────────────────────────────────────────
  // ⚠️ LA PASSE EST DIRECTIONNELLE. Retour de jeu : « en mode A ou E pour faire
  // la passe droite ou gauche ». Un seul bouton « passer » laissait le moteur
  // choisir le receveur : on subissait sa lecture au lieu de jouer la sienne,
  // et l'aile fermée ne recevait jamais rien. `passe` reste (c'est l'action
  // contextuelle du gros bouton, qui donne au plus évident) ; les deux autres
  // désignent un CÔTÉ, et c'est le joueur qui décide d'ouvrir ou de fermer.
  | 'sprint' | 'crochet' | 'raffut' | 'passe' | 'passeGauche' | 'passeDroite' | 'pied'
  // ⚠️ LES GESTES DE POSTE. Retour de jeu : « rajoute de nouvelles actions en
  // fonction du poste — un arrière l'occasion de faire un 50/22, une 9 de faire
  // une chenille, une chandelle pour dégager, foncer en avant, et faire un
  // offload au dernier moment ».
  //
  // ⚠️ TROIS D'ENTRE ELLES N'AJOUTENT RIEN AU MOTEUR — elles LUI RENDENT LA
  // MAIN. `taperAuPied` sait déjà jouer une chandelle, un 50/22, un rasant et
  // une transversale ; c'était `intentionDePied` qui choisissait à la place du
  // joueur. Ces actions-là ne font que retirer ce choix à la machine.
  //   · cinquanteVingtDeux — le pari de l'arrière : touche dans leurs 22
  //   · chandelle         — le box kick du 9, ses avants montent dessus
  //   · chenille          — le 9 protège la sortie de ruck, puis dégage
  //   · percussion        — l'avant rentre dedans : des mètres, sûrs
  //   · offload           — donner APRÈS le contact, au dernier moment
  | 'cinquanteVingtDeux' | 'chandelle' | 'chenille' | 'percussion' | 'offload'
  // ⚠️ LES GESTES QUI MÈNENT QUELQUE PART. Retour de jeu : « nos actions
  // n’ont aucun impact dans le jeu ; fais qu’un raffut, un sprint ou un
  // prendre-l’espace mène à un essai si réussi, qu’un turnover relance la
  // dynamique de l’équipe, qu’une passe puisse arriver à une passe
  // décisive ».
  //
  // ⚠️ CE QUI MANQUAIT N’ÉTAIT PAS LE GESTE, C’ÉTAIT LA SUITE. Battre son
  // vis-à-vis rendait la main au rugby automatique : deux foulées plus loin,
  // le pion refaisait une passe de routine. Ces cinq-là ouvrent une
  // ÉCHAPPÉE (`EtatMatch.echappee`) ou la concluent — c’est le chemin qui
  // va du duel gagné à la ligne d’essai.
  //   · percee        — lire l’intervalle et l’attaquer : on est dans le dos
  //   · chipEtSuivre  — par-dessus le rideau, et on court après
  //   · plongeon      — à portée de la ligne, on plonge dans l’en-but
  //   · interception  — lire la passe adverse : le turnover le plus payant
  //   · contreRuck    — pousser le paquet par-dessus le ballon au sol
  | 'percee' | 'chipEtSuivre' | 'plongeon' | 'interception' | 'contreRuck'
  // ── Son équipe attaque, il n'a pas le ballon ─────────────────────────────
  | 'appel' | 'soutien'
  // ── Son équipe défend ───────────────────────────────────────────────────
  | 'plaquage' | 'monter' | 'grattage'
  // ── Discipline : à tout moment, y compris ballon mort ────────────────────
  | 'provoquer' | 'frapper' | 'calmer';

/**
 * L'ordre en cours, et sa durée de validité.
 *
 * ⚠️ UNE ACTION N'EST PAS INSTANTANÉE, ET C'EST VOULU. « Je plaque » ne veut
 * rien dire à l'instant t : le porteur est à quinze mètres. L'intention reste
 * donc armée quelques secondes, le temps que la situation se présente — puis
 * elle expire, exactement comme un joueur qui a lu la mauvaise action.
 */
export interface IntentionJoueur {
  type: ActionJoueur;
  restant: number; // secondes simulées avant expiration
}

/**
 * ⚠️ LE TEMPS DE RECHARGE EXISTE PARCE QUE LE JOUEUR VA MARTELER LE BOUTON.
 * Mesuré au banc d'essai (`scripts/verifControle.ts`) sans lui : un pilote qui
 * réclame le ballon dès que possible finissait à **60 ballons portés** (un
 * troisième ligne en porte douze), un gratteur à **14 turnovers**, et une
 * provocation toutes les six secondes déclenchait **seize bagarres par match**.
 * Ce n'était pas un défaut de réglage mais un défaut de conception : un geste
 * de rugby demande de se replacer, de souffler, et de se faire oublier de
 * l'arbitre.
 */


/**
 * 💬 UNE BULLE AU-DESSUS D'UN PION.
 *
 * ⚠️ Demande explicite : « en mode chambrage, petites bulles avec les joueurs
 * qui disent quelque chose ». Le fil de commentaire raconte le match à la
 * troisième personne ; une bulle, elle, se passe SUR LE TERRAIN, à l'endroit
 * exact où ça se joue — c'est ce qui fait qu'on voit une friction naître au
 * lieu d'en lire le compte rendu deux lignes plus bas.
 *
 * ⚠️ Elles vivent dans l'ÉTAT, pas dans l'écran : le moteur les fait vieillir
 * avec le reste, donc elles suivent la vitesse du match (une bulle ne reste pas
 * trois minutes à l'écran en accéléré) et deux matchs simulés en parallèle ne
 * se les partagent pas.
 */
export interface Bulle {
  pion: Pion;
  texte: string;
  /** Secondes simulées restantes avant de disparaître. */
  restant: number;
}

/** L'ordre donné pendant la bagarre. */
export type OrdreBagarre = 'tous' | 'proteger' | 'calmer' | 'reculer';

export interface Bagarre {
  /** Qui a commencé : le joueur, ou l'adversaire qu'il avait chauffé. */
  origine: 'moi' | 'adversaire';
  adversaire: Pion;
  /** Le joueur a-t-il déjà porté un coup avant l'ordre ? */
  coupPorte: boolean;
  attente: number;          // secondes simulées passées à attendre l'ordre
  ordre: OrdreBagarre | null;
  /** Le déroulé, ligne à ligne, pour l'écran. */
  resume: string[];
}

/**
 * Ce que le match laisse au joueur côté discipline. Lu APRÈS le coup de
 * sifflet final (`bilan`) : c'est ce qui devient une suspension, une amende ou
 * une blessure dans la carrière.
 */
export interface DisciplineMatch {
  provocations: number;
  bagarres: number;
  coupsPortes: number;
  jaunes: number;
  rouges: number;
  /** Le mot de l'arbitre sur la feuille de match — motif de la citation. */
  motif: string;
  /** Ce que la commission retiendra (rempli à la sirène). */
  citation: { semaines: number; motif: string } | null;
  /** Une blessure prise dans la bagarre : main cassée, arcade, nez. */
  blessure: { nom: string; semaines: number } | null;
}

export function disciplineVide(): DisciplineMatch {
  return {
    provocations: 0, bagarres: 0, coupsPortes: 0, jaunes: 0, rouges: 0,
    motif: '', citation: null, blessure: null,
  };
}

// Le paramétrage de placement d'UN joueur, dicté par le coaching en direct.
export interface ConsigneJoueur {
  profondeur: number;   // <0 = plus bas / en couverture, >0 = il monte
  largeur: number;      // <0 = il se recentre, >0 = il cherche le large
  agressivite: number;  // 0 = il temporise, 1 = il réclame le ballon au ras
  libelle: string;
}

export type IntentionPied =
  | 'degagement'   // trouver la touche depuis ses 22
  | 'occupation'   // long coup de pied de terrain, souvent contestable
  | 'chandelle'    // box kick du 9, on monte dessus
  | 'cinquanteVingtDeux'
  | 'rasant'       // grubber derrière la défense
  | 'transversale' // par-dessus vers l'ailier
  | 'parDessus'    // petit coup de pied par-dessus un rideau qui monte vite
  | 'drop'
  | 'penaltouche'
  | 'renvoi';

// Le ballon en vol : c'est ce qui empêche la passe de se téléporter.
export interface Vol {
  de: Vec;
  vers: Vec;
  duree: number;
  ecoule: number;
  hauteur: number;      // 0 = passe tendue, 1 = chandelle (pour l'ombre au sol)
  type: 'passe' | 'pied';
  intention: IntentionPied | 'passe' | 'offload';
  auteur: Pion;
  receveur: Pion | null;
  /** La façon de donner (cadence détaillée) : chistera, passe au contact, offload à une main, dans le dos… */
  variante?: string;
  /**
   * Ce que le vent a déplacé du point de chute (`vers` est le point RÉEL de
   * retombée). La trajectoire s'en écarte comme le carré du temps : droite au
   * départ, de plus en plus couchée à l'arrivée.
   */
  derive?: Vec;
  /** Le ballon touche un poteau à l'instant `t` et repart vers `vers`. */
  ricochet?: { t: number; vers: Vec };
  /**
   * IA 3 : retombé, le ballon rebondit encore — `duree` secondes de plus,
   * jusqu'à `vers`, en montant à `hauteur`. Le même vol : ni second coup de
   * pied, ni second bruit de frappe.
   */
  rebond?: { duree: number; vers: Vec; hauteur: number };
  /**
   * LE COUP DE PIED D'UNE PÉNALITÉ TAPÉE VERS LA TOUCHE (Correctif 33). Le lancer reste à l'équipe qui a tapé, que le
   * ballon sorte directement ou après un ou plusieurs rebonds : c'est la pénalité qui donne le lancer, pas la
   * trajectoire. Porté à part de `intention`, parce qu'une pénaltouche manquée vole comme un coup de pied d'occupation.
   */
  dePenalite?: boolean;
}

/**
 * Copie légère d'un vol récemment déclenché.
 *
 * Le direct ne relève le moteur que quelques fois par seconde : une passe de
 * 300 ms peut donc commencer et finir entre deux relevés. On garde brièvement
 * ses extrémités et son instant de départ afin que l'écran puisse néanmoins
 * la rejouer à sa vraie vitesse.
 */
export type VolRecent = Omit<Vol, 'ecoule'> & { debut: number };

/**
 * La mêlée jouée temps par temps (cadence détaillée) : liaison, impact,
 * introduction, poussée puis sortie du ballon.
 *
 * Le duel est tranché AU DÉBUT de la poussée, pour que ce qu'on regarde —
 * un pack qui avance, recule, tourne ou s'écroule — soit le résultat réel et
 * non un habillage posé sur un tirage fait après coup.
 */
/**
 * LA POUSSÉE D'UNE MÊLÉE, CONTINUE (IA de niveau 4). Plus de `avanceFinale` tranchée d'avance : la mêlée avance — ou recule — à une
 * vitesse qui suit le rapport de force du moment (`duel0` + ce que le geste du joueur y ajoute), et se mesure en mètres. Un pack qui
 * domine près de la ligne continue de pousser, ballon aux pieds du 8, jusqu'à l'essai de poussée.
 */
export interface PousseeMelee {
  /** Le rapport de force à l'introduction, bruit compris : positif quand l'introducteur domine. */
  duel0: number;
  /** Ce que le geste du joueur ajoute au rapport de force à cet instant. */
  bonus: number;
  /** Instant du dernier pas, mètres gagnés par l'introducteur (négatif : il recule) et vitesse à cet instant. */
  t: number; a: number; v: number;
  /** L'issue est tranchée (pénalité, écroulement, mêlée qui tourne, ballon renversé, départ du 8). */
  decidee?: boolean;
  /** Le pack a franchi la ligne : l'essai de poussée est déclaré. */
  essai?: boolean;
  /** Le 8 garde le ballon à ses pieds et le pack poursuit sa poussée vers la ligne. */
  garde?: boolean;
  /** La mêlée a tourné : depuis quand (s de poussée) et de quel côté. */
  tourne?: { depuis: number; sens: number };
}

export interface MeleeDetaillee {
  /** Poussée continue (niveau 4) : voir `PousseeMelee`. */
  dyn?: PousseeMelee;
  etape: 'placement' | 'liaison' | 'impact' | 'introduction' | 'poussee' | 'sortie';
  /** Instant de simulation où l'étape en cours a commencé. */
  etapeDepuis: number;
  /** Instant où la formation est installée (les étapes partent de là). */
  debut: number;
  /** Milieu du tunnel à la mise en place. */
  centre: Vec;
  introducteur: Cote;
  /** Durées des étapes de CETTE mêlée (niveau 5 : sans temps mort). Absentes : celles de `TEMPS_MELEE`. */
  durees?: { liaison: number; impact: number; introduction: number; sortie: number };
  /** Secondes de poussée avant que le pack dominé ne s'écroule ou ne se relève. */
  ruptureApres?: number;
  /** Durée de la poussée, fixée avec l'issue. */
  dureePoussee: number;
  /** Camp qui talonne le ballon : ses pieds le ramènent vers son numéro 8. */
  talonneur?: Cote;
  /**
   * Ce que la poussée donne à voir. « ecroulee » et « relevee » précèdent une
   * pénalité ; « tourne » un ballon lent ; les autres une sortie normale.
   */
  issue?: 'stable' | 'avance' | 'recule' | 'tourne' | 'ecroulee' | 'relevee';
  /** Mètres gagnés par l'introducteur en fin de poussée (négatif s'il recule). */
  avanceFinale: number;
  /** Rotation finale de l'ensemble autour du tunnel, en radians. */
  angleFinal: number;
  /** Pack sanctionné ou dominé : c'est lui qui s'écroule ou se relève. */
  perdant?: Cote;
  /** Décision conservée pour la conclusion, sans nouveau tirage. */
  duel?: number;
  penalite?: { pour: Cote; motif: string };
  contre?: boolean;
  depart8?: boolean;
}

/**
 * L'ISSUE D'UNE TOUCHE, TRANCHÉE AVANT LE SAUT (IA de niveau 4 — Correctif 23). La scène la lit pour que ce qu'on voit soit ce
 * qui se passe : l'adversaire capte vraiment, ou dévie, ou le lancer est trop court ; `contreurId` est le sauteur d'en face.
 *   gagnee  — le sauteur annoncé capte ;
 *   perdue  — le sauteur adverse capte (variante 0 : par-dessus, 1 : arraché des mains, 2 : tapé vers son 9) ;
 *   devie   — une main adverse touche le ballon, qui part libre vers `point` ;
 *   courte / longue — le lancer n'atteint pas, ou dépasse, le sauteur ; le ballon tombe à `point` ;
 *   pasDroit — lancer de travers : l'arbitre siffle, mêlée pour l'autre camp.
 */
export interface IssueTouche {
  type: 'gagnee' | 'perdue' | 'devie' | 'courte' | 'longue' | 'pasDroit';
  sauteurId: string;
  contreurId?: string;
  /** Pour une touche perdue : 0 capté par-dessus, 1 arraché des mains, 2 tapé vers son 9. Pour une déviation : 0 ou 1. */
  variante: number;
  /** Où le ballon retombe (repère terrain), pour un lancer court ou long et pour une déviation. */
  point?: Vec;
  /** Instant de la décision. */
  decideeA: number;
  /**
   * Niveau 6 — pourquoi le ballon n'est pas dans les mains du sauteur : `timing` (il est monté trop tôt ou trop tard),
   * `effleure` (l'adversaire le touche sans le contrôler), `entre-deux` (il retombe entre les deux alignements).
   */
  cause?: 'timing' | 'effleure' | 'entre-deux';
}

/** Animation et appel annoncés pendant une phase de conquête. */
export interface ConqueteAnimee {
  type: 'melee' | 'touche';
  progression: number;
  combinaison?: 'premierBloc' | 'milieu' | 'fond' | 'leurreDevant';
  /** Celui qui feint le saut pendant que le ballon va ailleurs (IA par poste) : un faux saut au fond, puis prise au milieu. */
  leurreId?: string;
  /**
   * Sortie annoncée avec la combinaison (cadence détaillée) : déviation pour le
   * 9, peel d'un avant, maul annoncé, ou maul simulé puis ballon rapide.
   */
  sortie?: 'deviation' | 'peel' | 'maul' | 'mauleSimule';
  /**
   * Touche jouée vite (IA par poste) : pas d'alignement. Celui qui est au
   * ballon le ramasse et le remet en jeu pour un partenaire à cinq mètres.
   */
  rapide?: {
    lanceurId: string; receveurId: string;
    /** Où en est le lanceur : il court au ballon, le ramasse, arme sa remise en jeu. */
    etape?: 'aller' | 'ramasse' | 'arme';
    /** Instant de simulation où l'étape en cours a commencé. */
    depuis?: number;
  };
  /** L'avant qui contourne l'alignement pour recevoir du sauteur. */
  peelId?: string;
  cibleId?: string;
  horsAlignement?: boolean;
  reception?: Vec;
  pousseVers?: Cote;
  melee?: MeleeDetaillee;
  /**
   * Le lanceur va chercher le ballon (placement joué) : il rejoint l'endroit où
   * il est sorti, le ramasse, puis gagne sa place de lancer — derrière la ligne.
   * « tenu » : il l'a en main. La touche ne se joue pas avant.
   */
  ramassage?: 'aller' | 'ramasse' | 'tenu';
  ramassageDepuis?: number;
  lanceurId?: string;
  /** Où repose le ballon sorti, juste derrière la ligne de touche. */
  ballonAuSol?: Vec;
  /** Ce que le saut va donner, décidé avant lui (niveau 4). */
  issue?: IssueTouche;
  /**
   * LA COMBINAISON ANNONCÉE (Correctif 30, niveau 6) : son nom dans la bibliothèque de `touches.ts`, et tout ce que la scène
   * doit montrer AVANT le lancer — les blocs qui feintent (dans l'ordre), le sauteur qui change de bloc et les lifteurs qui
   * l'accompagnent — puis ce que l'équipe en fait une fois le ballon gagné.
   */
  jeu?: string;
  /** Les sauteurs qui montent pour de faux, dans l'ordre : un faux saut, ou deux. */
  feintes?: string[];
  /**
   * Le vrai sauteur vient d'ailleurs : il attend en `de`, à hauteur d'un autre bloc et en retrait de l'alignement, et n'entre
   * à sa place (`vers`) qu'une fois la formation avancée de `jusqua`. Il y COURT — sa place reste vide en attendant.
   */
  glissement?: { de: Vec; vers: Vec; jusqua: number };
  /** Ce qui suit la prise de balle : voir `SuiteDeTouche`. */
  suite?: import('./touches').SuiteDeTouche;
}

/** Ballon vivant après un rebond : personne ne le possède encore. */
export interface BallonLibre {
  vitesse: Vec;
  hauteur: number;
  vitesseVerticale: number;
  /** Axe du ballon ovale et rotation en radians, liés à ses vrais rebonds. */
  orientation?: number;
  vitesseRotation?: number;
  dernierRebondSim?: number;
  /** D'où le coup de pied est parti : un ballon qui rebondit avant de sortir peut valoir un 50/22. */
  depuis?: Vec;
  intention: IntentionPied | 'touche';
  auteurCote: Cote;
  auteur?: Pion;
  age: number;
  rebonds: number;
  /** Le ballon d'un tir au but manqué, resté en jeu (niveau 5) : mort ou aplati dans l'en-but, c'est un renvoi aux 22. */
  deTir?: boolean;
  /**
   * Le ballon d'une pénalité tapée vers la touche, retombé dans le champ (voir `Vol.dePenalite`) : s'il sort en touche
   * après ses rebonds, le lancer reste au botteur. Tombe dès qu'un partenaire du botteur le touche.
   */
  dePenalite?: boolean;
}

/**
 * LE DUEL DU RUCK, JOUÉ (IA de niveau 4 — Correctif 23). Grattage ou contre-ruck : la séquence se déroule AVANT que la
 * possession ne change. La scène la lit (qui plonge, qui charge, de combien le groupe recule) ; `phaseRuck` n'applique l'issue
 * qu'à la fin de la séquence.
 *   gratte — `acteurId` arrive sur le ballon, se couche dessus, lutte avec les soutiens, puis se relève ballon en main ;
 *   contre — `contreursIds` chargent lancés, percutent les soutiens et les repoussent de `avancee` mètres.
 * Issues : turnover (la défense prend le ballon), attaqueConserve (le contre échoue), instable (le ballon sort libre), penalite.
 */
export interface DuelRuck {
  type: 'gratte' | 'contre';
  acteurId: string;
  contreursIds: string[];
  debut: number;
  /** Instant du contact : avant, ils courent ; après, ils luttent. */
  contact: number;
  /** Durée de la poussée d'un contre-ruck (s). */
  poussee: number;
  fin: number;
  issue: 'turnover' | 'attaqueConserve' | 'instable' | 'penalite';
  /** Mètres gagnés par ceux qui contrent (positif : le groupe d'attaque recule). Négatif : c'est l'attaque qui avance. */
  avancee: number;
  /** Où était le ballon au début : la poussée se mesure depuis là. */
  origine: Vec;
  /** Penalite : qui a fauté, et pourquoi. */
  fautifId?: string;
  motif?: string;
  /** Celui qui tient le ballon debout à la fin d'un grattage réussi : la scène le lui met dans les mains. */
  balle?: string;
  /** Le joueur humain a minuté son geste (Correctif 23) : de 0 (raté) à 1 (parfait). */
  timing?: number;
  /**
   * LE GRATTAGE QU'ON VOIT (Correctif 30, niveau 6) : rapide, contesté, récompensé d'une pénalité, perdu (nettoyé par le
   * soutien) ou trop tardif. Les trois temps de la séquence après le contact — prise d'appui et mains sur le ballon, lutte,
   * conclusion — sont écrits ici pour que la scène et le moteur comptent les mêmes.
   */
  sequence?: import('./animations').SequenceGrattage;
  temps?: { appui: number; lutte: number; fin: number };
  /** Les soutiens qui viennent déloger le gratteur (au plus deux) : la scène les fait percuter, le moteur les y envoie. */
  nettoyeursIds?: string[];
  /** Un contre-ruck à un, à deux, ou collectif. Son issue (stoppé, ballon récupéré) reste dans `issue`. */
  variante?: import('./animations').VarianteContreRuck;
  /** Le gratteur a été délogé par le soutien (séquence « perdu ») : le moteur l'a repoussé, une seule fois. */
  deloge?: boolean;
}

/** Contexte du duel au sol, conservé entre le plaquage et la sortie. */
export interface RuckEnCours {
  duel?: DuelRuck;
  organisation?: import('./regroupements').OrganisationRuck;
  porteurId?: string;
  plaqueurId?: string;
  attaque: Cote;
  vitesseAttaque: number;
  vitesseDefense: number;
  /** Instant de l'impact, pour rejouer ensemble le plaquage et la chute. */
  debut?: number;
  /** Ruck éclair (IA par poste) : collision gagnée, soutiens déjà là — le ballon sort avant que la défense se relève. */
  eclair?: boolean;
  /**
   * Comment le plaquage s'est fait (cadence détaillée) : voir `duels.ts`. Niveau 6 : la `variante` jouée (une des vingt-deux
   * de `animations.ts`), le côté d'où venait le plaqueur vu du porteur (−1 gauche, 1 droite) et le second plaqueur.
   */
  plaquage?: {
    type: import('./duels').TypePlaquage; angle: import('./duels').AnglePlaquage;
    variante?: import('./animations').VariantePlaquage; cote?: -1 | 0 | 1; secondId?: string;
  };
  /** Niveau 6 : le porteur a été plaqué sans aucun soutien à moins de quatre mètres et demi — celui qui gratte y arrive le premier. */
  isole?: boolean;
  /** Les déblayages de ce ruck, tels qu'ils se sont joués (niveau 6) : qui a nettoyé qui, comment, et quand. */
  deblayages?: { de: string; sur: string; variante: import('./animations').VarianteDeblayage; t: number }[];
}

/**
 * L'ALTERCATION (Correctif 30, niveau 6) : rare, brève, jamais un combat. Elle suit un coup de sifflet — geste dangereux,
 * gros plaquage, fautes répétées, match tendu — et se joue pendant l'arrêt : on se pousse (1), on se saisit par les maillots
 * (2), ou les deux équipes se regroupent et les arbitres séparent (3). Le jeu sait qui l'a déclenchée, et c'est lui que
 * l'arbitre sanctionne.
 */
export interface Altercation {
  niveau: import('./animations').NiveauAltercation;
  cause: import('./animations').CauseAltercation;
  lieu: Vec;
  debut: number;
  fin: number;
  /** Celui qui est venu chercher l'autre, et celui qu'il est venu chercher. */
  declencheurId: string;
  cibleId: string;
  /** Ceux qui s'en mêlent, dans l'ordre où ils arrivent (les deux premiers sont le déclencheur et sa cible). */
  participants: string[];
  /** Ceux qui viennent séparer sans s'en mêler. */
  separateurs: string[];
  sanction: import('./animations').SanctionAltercation;
  /** La sanction a été prononcée (une seule fois, à la fin). */
  jugee?: boolean;
}

/** Bref temps de contrôle du ballon dans l'en-but avant validation de l'essai. */
export interface Aplatissage {
  marqueur: Pion;
  origine: 'jeu' | 'maul';
  lieu: Vec;
  /** Comment il marque (niveau 6) : plongeon, en force, glissade, posé, en coin, sous les poteaux… */
  style?: import('./animations').StyleEssai;
}

// LE LANCEMENT DE JEU : la combinaison décidée pour la phase qui commence.
// C'est LUI qui fait circuler le ballon — sans plan, chaque porteur cherchait
// son voisin le plus proche et le ballon tournait sur trois mètres.
export type TypeLancement =
  | 'ras'        // un avant percute au plus près du ruck
  | 'pod'        // 9 → 10 → un bloc d'avants au premier temps
  | 'large'      // toute la ligne de trois-quarts jusqu'à l'aile
  | 'saute'      // passe sautée pour prendre la défense à contre-pied
  | 'pied'       // occupation, dégagement, chandelle…
  | 'pickAndGo'; // le 9 ou un avant repart seul près de la ligne

export interface Lancement {
  type: TypeLancement;
  chaine: Pion[];          // l'ordre des receveurs, du premier au dernier
  index: number;           // où en est-on dans la chaîne
  intention?: IntentionPied;
  botteur?: Pion;
  libelle: string;
  /** Structure d'attaque jouée (cadence détaillée) : voir `structureAvancee`. */
  structure?: 'ecran' | 'croisee' | 'redoublee';
  /** Ceux qui courent comme s'ils allaient recevoir, sans recevoir. */
  leurres?: Pion[];
  /** La défense a déjà réagi au leurre de cette structure. */
  fixe?: boolean;
  /** Décalage latéral (m) que prend le premier porteur : départ du 8 petit côté, grand côté ou dans l'axe. */
  couloir?: number;
  /** Le jeu choisi par le demi de mêlée (IA par poste) : sert au commentaire, aux mesures et aux courses. */
  jeu?: string;
  /** « Les mains » : chaque porteur donne dès que son partenaire est prêt, sans attendre le contact. */
  tempo?: 'vite';
  /** L'organisateur relit la défense en recevant, et peut changer le plan (IA par poste). */
  relecture?: boolean;
  /** La relecture a eu lieu : elle ne se refait pas à chaque image. */
  relu?: boolean;
}

/**
 * LA MÉMOIRE DE L'ARBITRE (IA par poste) : chaque pénalité concédée, avec
 * l'instant, la zone et la famille de faute. C'est elle qui transforme une
 * série de fautes en avertissement au capitaine, puis en carton.
 */
export type FamilleFaute = 'ruck' | 'horsJeu' | 'plaquage' | 'maul' | 'melee' | 'antijeu' | 'brutalite' | 'divers';
export interface FauteNotee {
  /** Instant de l'horloge du match, en secondes. */
  t: number;
  /** Mètres entre la faute et la ligne du camp fautif. */
  deSaLigne: number;
  famille: FamilleFaute;
}
export interface ArdoiseArbitre {
  fautes: FauteNotee[];
  /** Horloge du dernier avertissement donné au capitaine : la faute suivante vaut carton. */
  avertiA?: number;
  /** Cartons déjà sortis pour fautes répétées. */
  cartonsRepetes: number;
}

/** L'identité de jeu d'une équipe sans consigne d'entraîneur (cadence détaillée). */
export type StyleJeu = 'equilibre' | 'avants' | 'large' | 'pied' | 'leurres';

// Le plan de marque d'une équipe : combien d'essais transformés, d'essais secs
// et de pénalités il lui reste à inscrire (voir `plan.ts`).
export interface PlanDeScore {
  essaisTransformes: number;
  essaisSecs: number;
  penalites: number;
  total: number;   // total de points visé, pour le rythme
  marques: number; // points déjà inscrits
}

export interface EtatMatch {
  /** Une indication discrète pour l'écran (Correctif 23) : « BALLON GRATTÉ », « TURNOVER »… Elle ne dit que ce que la scène montre déjà. */
  indicationJeu?: { cle: 'grattage' | 'turnover' | 'contreRuck' | 'touchePerdue' | 'melee'; cote: Cote; t: number };
  plansCombinaisons?: Partial<Record<Cote, import('../ligue/combinaisons.js').Combinaison[]>>;
  combinaisonPreparee?: import('./combinaisons.js').CombinaisonPreparee;
  combinaisonEnCours?: import('./combinaisons.js').CombinaisonEnCours;
  /** Solo : mouvements naturels, horloge sportive sur dix minutes. */
  carriereDixMinutes?: boolean;
  /** Durée réelle d'un match arcade complet, en secondes. */
  dureeReelleArcade?: number;
  /** Après la sirène, le jeu se poursuit jusqu'à une touche ou un en-avant. */
  finSurSortieOuEnAvant?: boolean;
  /** Les équipes dont le porteur est piloté directement dans le match de collection. */
  controleArcadeCamps?: Cote[];
  /** Défense du bot renforcée uniquement pour le match de collection. */
  defenseArcadeCote?: Cote;
  dropEnCours?: { auteurId: string; reussi: boolean;
    /** IA par poste : comment il finit — dedans, sur le poteau, à côté, trop court, mal frappé, contré. */
    issue?: string;
    /** Correctif 17 : le joueur l'a tenté à la main. Le contre se juge à la FRAPPE, d'après le défenseur le plus proche. */
    humain?: boolean };
  /**
   * Les phases se jouent à leur rythme de terrain : mêlée complète, passes à
   * vitesse réelle, célébration puis rituel entier du buteur. Réservé au match
   * en trois dimensions ; les autres écrans gardent leur cadence resserrée et
   * l'étalonnage qui va avec.
   */
  cadenceDetaillee?: boolean;
  /**
   * NIVEAU DE L'IA DE JEU. Absent ou 1 : le moteur d'origine. 2 : l'IA par
   * poste — le demi de mêlée lit la défense et choisit son jeu, l'ouvreur
   * relit en recevant, les avants se rangent selon leur numéro, la défense se
   * reforme avec ceux qui sont réellement disponibles, l'arbitre a une mémoire.
   *
   * ⚠️ FIGÉ À LA CRÉATION DU MATCH, comme `placementJoue` : le changer en cours
   * de rencontre donnerait une autre rejoue, donc un autre score que celui déjà
   * annoncé. Un match de ligue en cours garde le niveau avec lequel il a commencé.
   */
  ia?: number;
  /**
   * LE VENT DU MATCH (IA par poste) : direction (radians, repère du stade),
   * force moyenne (m/s) et graine des rafales, fixées au coup d'envoi. Trois
   * champs à plat : ils voyagent tels quels dans le film d'un direct, et tout
   * le reste s'en déduit (`moteur/vent.ts`).
   */
  ventDirection?: number;
  ventForce?: number;
  ventGraine?: number;
  /**
   * Seconde période : les équipes ont changé de côté. Le moteur garde son
   * repère (A attaque vers les x croissants) ; c'est le STADE qui a tourné d'un
   * demi-tour autour de lui — le vent souffle donc dans l'autre sens, et
   * l'affichage retourne le terrain (bancs, tribunes, caméras).
   */
  cotesInverses?: boolean;
  /**
   * LE REGARD DU PORTEUR (IA 3) : depuis quand il a le ballon, son tirage de
   * lecture (un seul par ballon reçu, pour qu'il ne change pas d'avis à chaque
   * pas), et la course qu'il a décidée en regardant devant lui.
   */
  regard?: { id: string; depuis: number; alea: number; cible?: Vec; cibleA?: number; intervalle?: boolean; feinteA?: number } | null;
  /**
   * LE DUEL D'UN SURNOMBRE (IA 3) : le porteur fixe, les soutiens gardent leur
   * largeur, et le défenseur a fait un choix — monter, glisser, hésiter ou
   * couper la passe.
   */
  duel?: { porteurId: string; soutienIds: string[]; defenseurId: string; cote: 1 | -1;
    choix: 'monter' | 'glisser' | 'hesiter' | 'couper'; depuis: number; rechoisiA?: number } | null;
  /** La mémoire de l'arbitre, par camp fautif (IA par poste). */
  arbitrage?: Record<Cote, ArdoiseArbitre>;
  /**
   * La défense prise de vitesse (IA par poste) : après un ruck rapide, ceux qui
   * étaient au sol ou liés ne sont pas dans la ligne. Instant de simulation, par
   * joueur, jusqu'auquel il ne compte pas dans le rideau.
   */
  retards?: Record<string, number>;
  /** Le défenseur sorti seul de sa ligne sur ce temps de jeu, et jusqu'à quand. */
  monteeSeul?: { id: string; jusqua: number } | null;
  /** Ceux qui accompagnent une percée : épaule intérieure, épaule extérieure, relais. */
  soutiensPercee?: string[];
  /**
   * La place de chaque avant dans la structure d'attaque du temps de jeu en
   * cours (cadence détaillée). Gardée tant que la phase dure : une cellule se
   * forme et tient, au lieu d'être redistribuée à chaque recalcul.
   */
  structureAttaque?: { cle: string; places: Record<string, number> } | null;
  /**
   * La ligne d'avantage, gagnée ou perdue (cadence détaillée) : nombre de
   * collisions de suite gagnées (positif) ou perdues (négatif) par l'équipe
   * qui tient le ballon, de -3 à 3. Voir `formerRuck`.
   */
  avantage?: number;
  /** Le ballon porté en cours : qui a capté le lancer, et depuis quand. */
  maul?: {
    receveurId: string; debut: number; /** Mètres gagnés par le maul depuis son début (Correctif 23). */ avance?: number;
    /** Niveau 6 : ce maul n'est qu'un temps de la combinaison — à `suiteA`, le ballon ressort pour le 9, ou le joueur du fond se détache. */
    suite?: 'maul-sortie' | 'maul-peel'; suiteA?: number;
  } | null;
  /** Niveau 6 : le lancement annoncé avec la touche, à jouer dès que le demi de mêlée a le ballon en main. */
  suiteDeTouche?: { suite: import('./touches').SuiteDeTouche; neufId: string; jusqua: number } | null;
  /**
   * La cellule d'avants de la phase (cadence détaillée) : le porteur — ou
   * l'avant qui va recevoir — et les deux coéquipiers qui se lient à lui.
   */
  cellule?: {
    porteurId: string;
    soutiens: string[];
    /** Ceux qui sont assez près pour être entraînés par le porteur. */
    accroches?: string[];
    /** Les deux soutiens sont à leur place, épaule contre le porteur. */
    lie: boolean;
    depuis: number;
    /** La cellule se forme autour d'un avant qui n'a pas encore le ballon. */
    approche?: boolean;
    /** Plaquage engagé mais le trio avance encore : poussée au contact. */
    pousse?: { defenseurId: string; jusqua: number; vitesse: number; debut: number };
    pousseFaite?: boolean;
  } | null;
  arbitre?: import('./dynamique.js').ArbitreMatch;
  gestes?: import('./dynamique.js').GesteMatch[];
  incidentApres?: number;
  fautesVues?: Record<string, boolean>;
  piedPrepare?: { auteurId: string; arrivee: Vec; intention: IntentionPied; duree: number; hauteur: number; depuis: Vec; pretDepuis?: number; debut?: number; rapideArcade?: boolean; avaitBallon?: boolean;
    /** Courbe déjà calculée pour ce coup de pied (drop : dérive du vent, poteau). */
    courbe?: Pick<Vol, 'derive' | 'ricochet'>;
    /** Pénalité tapée vers la touche : le vol gardera le lancer au botteur (`Vol.dePenalite`). */
    dePenalite?: boolean };
  clubA: string;
  clubB: string;

  // Horloge. `t` = secondes de jeu écoulées (0 → 4800), `sim` = secondes
  // simulées (celles que voit le spectateur).
  t: number;
  sim: number;
  reliquat: number;      // reste de pas non consommé, pour un DT toujours exact
  minute: number;
  /** 1 et 2 : les deux mi-temps. Au-delà : les périodes de prolongation (`departage`). */
  periode: number;
  sirene: boolean;
  /**
   * ⚠️ ESSAI À TEMPS EXPIRÉ : la transformation est due (Correctif 29). Tant que ce drapeau est levé, ni la mi-temps
   * ni le match ne peuvent être sifflés — la sirène ne supprime jamais une transformation, qui peut changer le
   * résultat, un bonus ou la différence de points. Baissé quand le tir est résolu.
   */
  transformationDue?: boolean;
  reglesSirene?: 'historique' | 'transformation';
  /**
   * `historique` : une pénaltouche retombée dans le champ redevient un ballon ordinaire (les matchs de ligue créés avant
   * les règles 8 se rejouent ainsi). Absent : le lancer reste au botteur, rebonds compris (Correctif 33).
   */
  reglesPenaltouche?: 'historique';
  /** Score à la fin du temps réglementaire, avant toute période supplémentaire. */
  scoreReglementaire?: [number, number];
  /**
   * UN VAINQUEUR EST OBLIGATOIRE (match couperet) : le règlement du départage, figé à la création depuis
   * `competitionRules.ts`. Absent : le match peut finir sur un nul.
   */
  departage?: { periodes: number; duree: number; criteres: ('essais' | 'tirsAuBut')[] };
  /** La prolongation a été jouée (ou se joue). */
  prolongation?: boolean;
  /** Comment le match a été tranché quand il a fallu départager. */
  issue?: { vainqueur: Cote; critere: 'prolongation' | 'essais' | 'tirsAuBut'; tirs?: [number, number] };

  phase: Phase;
  minuteur: number;      // secondes simulées restantes dans la phase en cours

  pions: Pion[];
  ballon: Vec;
  porteur: Pion | null;
  possession: Cote;
  vol: Vol | null;
  volsRecents?: VolRecent[];
  conquete?: ConqueteAnimee | null;
  /** Bonus de timing du duel arcade, consommé une seule fois par la conquête. */
  bonusConqueteArcade?: { type: 'melee' | 'touche'; scores: Partial<Record<Cote, number>> } | null;
  ballonLibre?: BallonLibre | null;
  ruck?: RuckEnCours | null;
  aplatissage?: Aplatissage | null;
  tmo?: TMOEtat | null;
  dernierReplayEssai?: { marqueurNom: string; lieu: Vec; restant: number } | null;
  grosImpact?: { lieu: Vec; type: 'tampon' | 'raffut'; restant: number } | null;

  // Structure de jeu
  lancement: Lancement | null;
  ouvert: 1 | -1;            // côté ouvert choisi pour la phase
  /** Camp pour lequel le côté de la phase suivante a déjà été décidé, pendant le ruck. */
  coteDecidePour?: Cote;
  /** Combien de temps de jeu de suite vers le même côté : au-delà de trois, on renverse. */
  serieCote?: { cote: 1 | -1; n: number };
  /** Les trois avants qui se préparent à percuter près du ruck : la pointe, puis ses deux soutiens. */
  blocPrepare?: { cote: Cote; ids: string[];
    /** IA par poste : à quelle distance du regroupement la cellule attend le ballon. */
    profondeur?: 'courte' | 'standard' | 'profonde' } | null;
  /**
   * IA par poste : le 9 prépare son coup de pied derrière la chenille, qui reste
   * liée jusqu'à la frappe. Le regroupement n'est défait qu'au départ du ballon.
   */
  chenilleTenue?: boolean;
  /** Identité de jeu de chaque équipe (cadence détaillée). */
  styles?: Record<Cote, StyleJeu>;
  phasesDepuisArret: number; // nombre de temps de jeu depuis la dernière phase arrêtée
  ligneAvantage: number;     // X où la phase a démarré : les mètres se comptent AU-DELÀ
  origine: Vec;              // ⚠️ le point de départ de la phase (ruck, mêlée, touche).
                             // C'est LUI qui ancre la largeur des pods, PAS le porteur :
                             // sinon toute l'attaque suit le ballon en travers du terrain
                             // et les trente joueurs finissent en paquet.
  metresGagnesPhase: number; // terrain gagné au-delà de la ligne d'avantage
  ballonLent: boolean;       // sortie de ruck lente : la défense a le temps
  derniereTouche: Pion | null;
  // ⚠️ LE DERNIER PASSEUR, pour créditer la PASSE DÉCISIVE. Il doit vivre dans
  // l'état et nulle part ailleurs : deux matchs simulés en parallèle se
  // partageraient une variable de module, et le déterminisme du moteur — sur
  // lequel repose l'égalité entre le match regardé en direct et le même match
  // rejoué en fond — tomberait. Remis à `null` dès qu'un ruck, une phase
  // arrêtée ou un coup de pied s'intercale : l'essai qui suit n'est alors la
  // conséquence de la passe de personne.
  dernierPasseur: Pion | null;
  perceeSignalee: boolean;   // une percée a déjà été annoncée sur cette phase
  aide: number;              // rythme de marque de l'équipe qui attaque (voir `retard`)

  // Défense
  systeme: SystemeDefensif;
  ligneDef: number;          // position X de la ligne défensive
  horsJeu: number;           // X de la ligne de hors-jeu (au ruck)
  gardeRuck: number;         // secondes avant que la défense soit remise en jeu

  // Score
  scoreA: number;
  scoreB: number;
  planA: PlanDeScore;
  planB: PlanDeScore;
  /** Cibles de ligue avant les ajustements du banc. */
  cibleBaseA: number;
  cibleBaseB: number;
  /** Impact déjà appliqué au plan, pour qu'un changement ne puisse pas s'empiler. */
  ajustementTactiqueA: number;
  ajustementTactiqueB: number;
  /** Seul le côté coaché en direct en possède une ; l'autre garde son IA. */
  tactiques: Partial<Record<Cote, TactiqueManager>>;
  /**
   * CE QUE L'ÉQUIPE SE CONNAÎT, de 0 à 100. Absent = 50, c'est-à-dire neutre.
   *
   * ⚠️ ELLE NE TOUCHE QUE LES ERREURS ENTRE COÉQUIPIERS — la passe qui part
   * devant, le ballon lâché à la réception, l'offload donné à personne. Un
   * groupe qui se connaît ne court pas plus vite et ne plaque pas plus fort :
   * il se comprend. C'est exactement ce que le collectif de la Carrière en
   * ligne mesure (quatre joueurs d'un même club réel, une nation partagée),
   * et c'est pour ça qu'il entre ici et nulle part ailleurs.
   */
  cohesion?: Partial<Record<Cote, number>>;
  essaisA: number;
  essaisB: number;

  // Compteurs de match (affichés et mesurés par le banc d'essai).
  /**
   * La dernière décision de l'arbitre, tant qu'elle est fraîche. Voir
   * `CoupDeSifflet` : c'est ce qui rend une sanction visible.
   */
  sifflet: CoupDeSifflet | null;

  compteurs: {
    rucks: number; melees: number; touches: number; percees: number;
    /** Plaquages hauts et plaquages en retard sifflés (voir bagarre.ts). */
    irregularites: number;
    /**
     * Les en-avants du match, toutes causes confondues.
     *
     * ⚠️ IL A ÉTÉ AJOUTÉ PARCE QU'ON NE POUVAIT PAS LES COMPTER, et donc pas
     * les régler. Retour de jeu : « on peut faire des en-avants sans
     * répercussion ». Le moteur en produisait bien quelques-uns, mais personne
     * n'en mesurait le nombre, et surtout UNE PASSE REÇUE NE POUVAIT PAS ÊTRE
     * LÂCHÉE : la faute de main la plus banale du rugby n'existait pas.
     */
    enAvants: number;
    tempsA: number; tempsB: number; // secondes de possession, pour l'affichage
  };

  // Phases arrêtées
  placement: Record<string, Vec> | null;
  /**
   * Ce que dure la phase arrêtée en cours, en secondes simulées.
   *
   * ⚠️ SANS ELLE, ON NE SAIT PAS OÙ ON EN EST. `minuteur` dit ce qu'il RESTE ;
   * pour jouer une mêlée en trois temps (les packs se font face, ils se lient,
   * ils poussent) il faut savoir quelle fraction est écoulée.
   */
  dureeArret?: number;
  /**
   * Le renvoi se joue de la ligne d'essai (« renvoi d'en-but ») et non des 22 :
   * abscisse de cette ligne. Absent : renvoi aux 22 mètres.
   */
  ligneRenvoi?: number;
  cibleRenvoi: Vec | null;   // où va tomber le coup d'envoi (sert au placement)
  tir: {
    /** Comment le tir a fini (IA par poste) : dedans, poteau rentrant ou sortant, à gauche, à droite, trop court, sous la barre. */
    issue?: string;
    buteur: Pion;
    distance: number;
    angle: number;
    valeur: number;
    suite: 'renvoi' | 'coupEnvoi';
    /** Point où le ballon est posé. */
    lieu?: Vec;
    /** Le rituel de CE tir (niveau 5) : durées de la pose et de l'attente, et part de la routine déjà faite à l'arrivée du buteur. */
    rituel?: { ramassage: number; pose: number; de: number; pret: number };
    /** Résultat décidé une seule fois, avant le vol visible du ballon. */
    reussi?: boolean;
    /** Le rituel est fini et le ballon est actuellement en vol. */
    volLance?: boolean;
    /** Armé unique au contact du tee, puis instant exact de libération. */
    frappeDepuis?: number;
    departSim?: number;
    /** Joueur ayant contré la transformation lors de sa charge. */
    contre?: Pion | null;
    /** Routine / rituel de préparation au tee du buteur. */
    routine?: import('./routinesButeur').RoutineButeur;
    /** Le ballon a terminé son vol et a atterri au sol derrière les poteaux. */
    retombe?: boolean;
    /**
     * Cadence détaillée : où en est le buteur. Il rejoint le ballon, le
     * ramasse, le porte jusqu'au point du tir, le pose, recule, se concentre
     * puis s'élance — sans jamais être déplacé d'un coup.
     */
    etape?: 'celebration' | 'approche' | 'ramassage' | 'transport' | 'pose' | 'vise' | 'pret' | 'elan';
    /**
     * Correctif 17 : le joueur tape lui-même (il tient le rôle de buteur). `vise` : l'étape où le
     * match attend sa visée ; `visee` : ce qu'il a demandé. Le vol est alors résolu par la géométrie
     * (`tirHumain.ts`), pas par un tirage.
     */
    humain?: boolean;
    visee?: import('./tirHumain.js').ViseeHumaine;
    etapeDepuis?: number;
    /** Où repose le ballon tant que le buteur ne l'a pas ramassé. */
    ballonAuSol?: Vec;
    /** Marqueur fêté par ses coéquipiers avant la transformation. */
    marqueurId?: string;
    celebrationJusqua?: number;
    /** Coéquipiers qui viennent entourer le marqueur. */
    feteurs?: string[];
    /** La fête selon le match (niveau 6) : sobre quand on est mené de loin, toute l'équipe sur un essai décisif. */
    celebration?: import('./animations').StyleCelebration;
    /** Comment l'essai a été marqué : repris de l'aplatissage, pour que la scène enchaîne. */
    essai?: import('./animations').StyleEssai;
  } | null;
  penalite: {
    pour: Cote; lieu: Vec; motif: string;
    /** Correctif 17 : le rideau d'en face au coup de sifflet (un capitaine lit la défense avant qu'elle ne recule). */
    defense?: { rideau: number; retardataires: number };
  } | null;

  remplacementsA: number;
  remplacementsB: number;
  remplacementsDemandes: Partial<Record<Cote, { entrantId: string; sortantId: string }>>;
  prochaineDecision: number;
  compteur: number;      // ⚠️ dans l'état, pas en variable de module : deux
                         // matchs simulés en parallèle ne doivent pas se
                         // partager le rythme de replacement.
  commentaires: Commentaire[];
  consigne?: ConsigneJoueur;
  fini: boolean;
  rng: () => number;
  /**
   * ⚠️ LE MATCH SE REGARDE EN TEMPS RÉEL — une seconde de jeu, une seconde à
   * l'écran, et rien n'est ni accéléré ni ralenti.
   *
   * La carrière solo joue un match accéléré : les phases arrêtées y sont
   * compressées à l'image. En direct, elles avancent à vitesse naturelle mais
   * disposent d'une durée de présentation raccourcie, sans longue attente.
   *
   * Le direct coûte davantage de ticks que le solo, mais les courses restent
   * ainsi fluides et cohérentes avec l'horloge affichée.
   */
  tempsReel?: boolean;
  /**
   * ⚠️ LE PLACEMENT SE JOUE (ligue en ligne, règles 2). Personne n'est installé
   * d'un coup dans une mêlée, une touche ou un renvoi : chacun y court, et la
   * phase ATTEND que les joueurs essentiels soient à leur place avant de
   * décompter son temps. Sans cela le moteur déplaçait près de deux mille
   * joueurs par match d'un seul pas — des téléportations que l'écran du direct
   * ne pouvait que maquiller.
   *
   * ⚠️ FIGÉ À LA CRÉATION DU MATCH. Le changer en cours de rencontre donnerait
   * une rejoue différente, donc un autre score que celui déjà annoncé.
   */
  placementJoue?: boolean;
  /** L'attente de placement de la phase arrêtée en cours (voir `placementJoue`). */
  attentePlacement?: { phase: Phase; depuis: number; pret?: boolean } | null;
  /** Pas d'attente joués sur la pénalité en cours pendant qu'un entraîneur choisit (`patienter`). */
  attenteDecision?: number;
  /**
   * Resserrement de la défense, de 0 (aucun) à 1 : étalonne le nombre d'essais
   * de la cadence détaillée sur celui des matchs de ligue (voir `probaPlaquage`).
   */
  resserrement?: number;
  /**
   * Appelé après chaque pas de simulation. ⚠️ OBSERVATION SEULE : ce crochet
   * ne doit rien modifier, sinon deux rejoues du même match divergent. Il sert
   * au film du direct (`lib/ligue/filmDirect.ts`).
   */
  apresPas?: (e: EtatMatch) => void;
  /** Options serveur : aucune incidence sur les carrières locales existantes. */
  scoreSurTerrain?: boolean;
  meteoTir?: 'sec' | 'pluie' | 'vent';
  impactBanc?: Partial<Record<Cote, number>>;
  choixPenalite?: 'points' | 'touche' | 'rapide' | 'melee';

  // ── LE JOUEUR AUX COMMANDES ──────────────────────────────────────────────
  /** Le niveau du match : il commande toute la discipline. */
  niveau: NiveauMatch;
  /** Le joueur pilote son pion lui-même (bascule à tout moment). */
  controle: boolean;
  /** L'ordre en cours, consommé par le moteur dès que l'occasion se présente. */
  intention: IntentionJoueur | null;
  /**
   * Secondes simulées restantes avant de pouvoir REJOUER chaque geste.
   *
   * ⚠️ UNE RECHARGE PAR ACTION, ET SURTOUT PAS UNE SEULE POUR TOUTES. La
   * première version n'en avait qu'une : chambrer un adversaire (45 s de
   * recharge) rendait alors la PASSE indisponible pendant trois quarts de
   * minute. Sur un jeu où l'on pilote son joueur en direct, c'est
   * insupportable — et ça n'a aucun sens : souffler après un grattage
   * n'empêche pas de donner un ballon.
   */
  recharges: Partial<Record<ActionJoueur, number>>;
  /**
   * ⚠️ LE JOUEUR VIENT DE BATTRE SON VIS-À-VIS — le drapeau qui ouvre un
   * ENCHAÎNEMENT.
   *
   * Demande : « tu perces, tu peux tenter un autre truc sur le défenseur ». Il
   * fallait un signal, et il ne pouvait pas venir de l'écran : une percée se
   * décide dans `resoudrePlaquage`, au fond du moteur, et elle arrive par DEUX
   * chemins — le duel joué sur-le-champ par `resoudreChoix`, et le geste resté
   * ARMÉ qui trouve son contact deux secondes plus tard (le cas le plus
   * fréquent, puisque la carte tombe souvent avant que le ballon arrive). Un
   * seul drapeau couvre les deux.
   *
   * ⚠️ C'EST L'ÉCRAN QUI LE REMET À `false`, comme il consomme un évènement. Le
   * moteur ne le baisse jamais tout seul : une percée non lue reste une percée.
   */
  perceeJoueur: boolean;
  /**
   * ⚠️ L’ÉCHAPPÉE — le pion est DANS L’ESPACE, et il court à la ligne.
   *
   * Retour de jeu : « nos actions n’ont aucun impact ; fais qu’un raffut, un
   * sprint ou un prendre-l’espace mène à un essai si réussi ». Le moteur
   * savait déjà marquer un essai quand un porteur franchit la ligne
   * (`franchieLigne` → `tenterEssai`) ; ce qui n’existait pas, c’est le
   * CHEMIN pour y arriver. Battre son défenseur rendait la main à
   * `ligneDeCourse` et à « fixer et donner », qui redonnaient le ballon deux
   * foulées plus loin. Le duel gagné ne menait donc jamais nulle part.
   *
   * Tant qu’elle dure, le porteur vise la ligne, on ne le fait plus passer
   * automatiquement, et il n’envisage plus le coup de pied. Elle s’éteint
   * toute seule — un contre-attaquant finit toujours par être rejoint.
   */
  echappee: { pion: Pion; restant: number } | null;
  /**
   * ⚠️ LA DYNAMIQUE, DE −1 (le camp B est dessus) À +1 (le camp A l’est).
   *
   * Demande : « un turnover relance la dynamique de l’équipe ». Un seul
   * nombre SIGNÉ, et pas deux jauges : l’élan est un rapport de force, ce
   * que l’un prend l’autre le perd. Deux compteurs indépendants auraient
   * permis aux deux équipes d’être portées en même temps, ce qui ne veut
   * rien dire.
   *
   * ⚠️ ET IL SE LIT SUR LES POURCENTAGES DES CARTES. Il entre dans
   * `probaPlaquage` et `probaGrattage` — les deux duels qui décident le
   * contact et les ballons volés — donc `enjeuDe` l’affiche et
   * `resoudreChoix` le tire. Une jauge qui ne changerait que la couleur
   * d’une barre ne serait qu’un décor.
   */
  elan: number;
  /**
   * Le dernier ballon volé par le joueur incarné, et quand.
   *
   * ⚠️ IL SERT À DIRE MERCI. Un grattage qui amène un essai quarante
   * secondes plus tard, personne ne fait le lien : le fil a défilé, la carte
   * est refermée depuis longtemps. C’est ce chaînon qui permet à l’écran de
   * revenir dessus — « ton ballon volé a amené l’essai ».
   */
  dernierTurnover: { pion: Pion; t: number } | null;
  /**
   * ⚠️ CE QU’UN GESTE PASSÉ VIENT DE RAPPORTER. L’écran les affiche, puis
   * vide la file.
   *
   * Demande : « une passe peut arriver à une passe décisive ». La statistique
   * existait déjà (`stats.passesDecisives`, créditée dans `tenterEssai`) —
   * mais elle n’apparaissait qu’à la feuille de match, une heure plus tard.
   * Le geste et sa récompense étaient séparés par tout un match : c’est
   * exactement ce qui donne le sentiment que « nos actions n’ont aucun
   * impact ». Une retombée se dit À L’INSTANT où elle tombe.
   */
  echos: { cle: string; nom: string; cible: string }[];
  /**
   * La température du match, 0 à 100. Elle monte quand on chambre, quand un
   * plaquage part haut, quand l'écart se creuse — et elle redescend toute
   * seule. C'est elle qui décide si un adversaire relève la provocation.
   */
  tension: number;
  /** La bagarre en cours : tant qu'elle est là, le jeu attend un ordre. */
  bagarre: Bagarre | null;
  /** Altercation sifflée : ceux qui viennent séparer, et jusqu'à quand (cadence détaillée). */
  attroupement?: { lieu: Vec; jusqua: number; ids: string[]; arrives: string[] } | null;
  /** L'altercation en cours (niveau 6) : voir `Altercation`. */
  altercation?: Altercation | null;
  /** La rancune laissée par un gros plaquage (niveau 6) : qui l'a porté, sur qui, et jusqu'à quand on s'en souvient. */
  grief?: { surId: string; pourId: string; jusqua: number };
  /** Combien d'altercations ce match a déjà connues, et quand la dernière a fini (niveau 6). */
  altercations?: { n: number; derniere: number };
  /** Les bulles de dialogue visibles en ce moment sur le terrain. */
  bulles: Bulle[];
  /**
   * Secondes simulées avant la prochaine friction automatique.
   *
   * ⚠️ DANS L'ÉTAT, PAS EN VARIABLE DE MODULE. Deux matchs simulés en parallèle
   * — le direct et une rencontre jouée en fond — se partageraient le compteur,
   * et le déterminisme du moteur tomberait.
   */
  prochaineFriction: number;
  /** L'ardoise disciplinaire du joueur incarné. */
  discipline: DisciplineMatch;
  /**
   * LE CONTRÔLE DIRECT (Correctif 16) : le joueur conduit son pion lui-même, au stick
   * ou au clavier, et les vingt-neuf autres jouent seuls. Absent ou éteint : le moteur
   * rejoue à l'identique (empreinte : `npm run mesure:empreinte`). Voir `direct.ts`.
   */
  direct?: import('./direct.js').EtatDirect;
  /**
   * LES RESPONSABILITÉS (Correctif 17) : capitaine, buteurs, lanceur, engagement, drop. Le joueur les
   * tient quand il les a, l'IA les tient sinon. Absent : le moteur rejoue à l'identique.
   * Voir `responsabilites.ts`.
   */
  responsabilites?: import('./responsabilites.js').EtatResponsabilites;
}

/**
 * Pousser une ligne dans le fil de commentaire.
 *
 * ⚠️ ELLE VIT ICI, PAS DANS `moteur.ts`, pour une raison d'imports :
 * `bagarre.ts` doit pouvoir commenter, et `moteur.ts` importe `bagarre.ts`.
 * Passer par l'état — que tout le monde importe déjà — évite le cycle.
 */
export function ajouterCommentaire(
  e: EtatMatch, type: TypeCommentaire, cote: Cote | null, texte: string,
  points = 0, moi = false,
): void {
  e.commentaires.push({
    seconde: e.prolongation ? Math.floor(e.t) : Math.min(4800, Math.floor(e.t)),
    minute: Math.min(e.prolongation ? 200 : 80, Math.floor(e.t / 60)), texte, type, cote, points,
    scoreA: e.scoreA, scoreB: e.scoreB, moi,
  });
}
