// L'ÉTAT D'UN MATCH — la structure de données partagée par tout le moteur.
//
// Elle vit dans son propre fichier pour que `tactique.ts` (le placement) et
// `phasesArretees.ts` puissent la lire sans importer `moteur.ts`, qui les
// importe : sans ça, on aurait un cycle d'imports.

import type { Pion } from './entites';
import type { Cote, Vec } from './terrain';

export type Phase =
  | 'coupEnvoi'      // engagement et renvois après un score
  | 'renvoi22'       // renvoi aux 22
  | 'jeuCourant'     // ballon vivant, en main
  | 'ballonEnLAir'   // un coup de pied est en cours
  | 'ruck'
  | 'maul'
  | 'melee'
  | 'touche'
  | 'penalite'       // la faute vient d'être sifflée, l'équipe choisit
  | 'tirAuBut'
  | 'transformation'
  | 'apresEssai'
  | 'miTemps'
  | 'fini';

// Les phases pendant lesquelles le chronomètre défile vite : le ballon est mort,
// il n'y a rien à regarder. L'horloge du match avance alors par bonds.
export const PHASES_ARRETEES: Set<Phase> = new Set<Phase>([
  'coupEnvoi', 'renvoi22', 'melee', 'touche', 'penalite', 'tirAuBut',
  'transformation', 'apresEssai', 'miTemps',
]);

export type TypeCommentaire =
  | 'essai' | 'but' | 'butRate' | 'plaquage' | 'franchissement' | 'ruck'
  | 'melee' | 'touche' | 'maul' | 'pied' | 'penalite' | 'carton'
  | 'remplacement' | 'jalon' | 'jeu';

export interface Commentaire {
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
}

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
  clubA: string;
  clubB: string;

  // Horloge. `t` = secondes de jeu écoulées (0 → 4800), `sim` = secondes
  // simulées (celles que voit le spectateur).
  t: number;
  sim: number;
  reliquat: number;      // reste de pas non consommé, pour un DT toujours exact
  minute: number;
  periode: 1 | 2;
  sirene: boolean;

  phase: Phase;
  minuteur: number;      // secondes simulées restantes dans la phase en cours

  pions: Pion[];
  ballon: Vec;
  porteur: Pion | null;
  possession: Cote;
  vol: Vol | null;

  // Structure de jeu
  lancement: Lancement | null;
  ouvert: 1 | -1;            // côté ouvert choisi pour la phase
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
  essaisA: number;
  essaisB: number;

  // Compteurs de match (affichés et mesurés par le banc d'essai).
  compteurs: {
    rucks: number; melees: number; touches: number; percees: number;
    tempsA: number; tempsB: number; // secondes de possession, pour l'affichage
  };

  // Phases arrêtées
  placement: Record<string, Vec> | null;
  cibleRenvoi: Vec | null;   // où va tomber le coup d'envoi (sert au placement)
  tir: { buteur: Pion; distance: number; angle: number; valeur: number; suite: 'renvoi' | 'coupEnvoi' } | null;
  penalite: { pour: Cote; lieu: Vec; motif: string } | null;

  remplacementsA: number;
  remplacementsB: number;
  prochaineDecision: number;
  compteur: number;      // ⚠️ dans l'état, pas en variable de module : deux
                         // matchs simulés en parallèle ne doivent pas se
                         // partager le rythme de replacement.
  commentaires: Commentaire[];
  consigne?: ConsigneJoueur;
  fini: boolean;
  rng: () => number;
}
