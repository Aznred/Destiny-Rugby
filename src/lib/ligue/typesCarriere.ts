import type { CompositionManager, FamillePoste, PosteId } from '../../types.js';
import type { CommandeMatchEnLigne, EtatMatchEnLigne, StrategieEnLigne, VueMatchEnLigne } from './matchCarriere.js';

export type RareteCarriere = 'bronze' | 'argent' | 'or' | 'elite' | 'star';
/**
 * L'identifiant d'un pack. Ouvert : la liste vit dans `catalogueCarriere.ts`,
 * et le serveur ne reconnaît que ceux qui y figurent.
 */
export type IdPackCarriere = string;

/**
 * ⚠️ LE FILTRE EST UNE STRUCTURE, PAS UN MOT-CLÉ. Il n'acceptait que quatre
 * valeurs ('avants', 'france'…), ce qui interdisait tout pack un peu inventif :
 * une charnière, un Top 14, des espoirs de moins de 23 ans. Chaque champ est un
 * ET ; à l'intérieur d'un champ, c'est un OU.
 */
export interface FiltrePack {
  categorie?: 'avant' | 'arriere';
  familles?: FamillePoste[];
  championnats?: string[];
  pays?: string[];
  nations?: string[];
  ageMax?: number;
  ageMin?: number;
  /** Tout sauf la France — plus court que d'énumérer seize championnats. */
  horsFrance?: boolean;
}
export interface CarteCarriere {
  id: string; sourceId: string; nom: string; poste: PosteId; famille: FamillePoste;
  note: number; potentiel: number; age: number; nation: string;
  clubReel: string; championnat: string; pays: string; photo?: string;
  origine: 'formation' | 'professionnel' | 'ffr'; rarete: RareteCarriere;
  /** Les notes sont celles du jeu, pas des mesures officielles. */
  statistiques: Record<string, number>;
  proprietaire: string | null; verrou?: string;
  /**
   * Marque posee par le proprietaire : ce joueur-la ne part pas dans un lot.
   * Elle n'INTERDIT rien - elle exclut la carte de « Tout cocher ».
   */
  favori?: boolean;
  fatigue: number; blesseJusqua?: string;
  matchs: number; essais: number; clubs: { clubId: string; saison: number }[];
}
export interface PackCarriere {
  id: IdPackCarriere; nom: string; prix: number; cartes: number;
  probabilites: Record<RareteCarriere, number>;
  filtre?: FiltrePack;
  /** Au moins une carte de cette bande ou mieux. C'est ce qui fait acheter. */
  garantie?: RareteCarriere;
  /** Ce que le pack promet, en une phrase, pour la boutique. */
  promesse?: string;
  /** Le rayon de la boutique où il est présenté. */
  famille?: 'general' | 'poste' | 'monde' | 'age';
}
export interface PackGratuitCarriere {
  id: string; packId: IdPackCarriere; recuLe: string;
}
export interface ClubCarriere {
  id: string; compteId: string; pseudo: string; nom: string; ovas: number;
  /** Chemin d'un vrai écusson de club (`emblemeValide` fait foi). */
  embleme?: string;
  composition: CompositionManager; strategie: StrategieEnLigne;
  /** Absent/faux tant que le jeu choisit lui-même le buteur. */
  buteurManuel?: boolean;
  rejointLe: string;
  /** Lots quotidiens non ouverts. Le serveur seul choisit leur type. */
  packsGratuits?: PackGratuitCarriere[];
  /** Lots planifiés par l'administrateur, indexés par jour UTC. Jamais exposés aux autres clubs. */
  packsGratuitsProgrammes?: Record<string, IdPackCarriere[]>;
  dernierLotPacksGratuits?: string;
}
export interface ResultatCarriere {
  pointsD: number; pointsE: number; essaisD: number; essaisE: number;
  penalitesD?: number; penalitesE?: number; joueLe: string; origine: 'direct' | 'absence';
}
export interface RencontreCarriere {
  id: string; competitionId: string; journee: number; domicile: string; exterieur: string;
  ouvre: string; ferme: string; match?: EtatMatchEnLigne; resultat?: ResultatCarriere;
}
export interface CompetitionCarriere {
  id: string; nom: string; trophee: string; format: 'championnat' | 'elimination' | 'poules';
  /** Logo de la compétition et identifiant du trophée soulevé. */
  logo?: string; tropheeId?: string;
  /** Championnat : une phase finale à quatre couronne le champion. */
  playoffs?: boolean; journeesRegulieres?: number;
  /** Coupe avec poules : groupes, taille du tableau, ordre des qualifiés et repêchés. */
  poules?: string[][]; qualifies?: number; phaseFinaleSeed?: string[]; repeches?: string[];
  /** Classements calculés pour l'affichage, jamais persistés par le moteur. */
  classementsPoules?: LigneClassementCarriere[][];
  participants: string[]; saison: number; debut: string; etat: 'enCours' | 'terminee';
  recompenseParticipation: number; recompenseVainqueur: number; recompenseFinaliste: number;
  vainqueur?: string; finaliste?: string;
}
export interface VenteCarriere {
  id: string; carteId: string; vendeurId: string; type: 'directe' | 'enchere';
  prix: number; expireLe: string; etat: 'ouverte' | 'vendue' | 'annulee' | 'expiree';
  enchere?: { clubId: string; montant: number }; acheteurId?: string;
  /** Conservé après la vente, même si la carte quitte ensuite la ligue. */
  joueurNom?: string;
}
export interface EchangeCarriere {
  id: string; de: string; vers: string; cartesDonnees: string[]; cartesDemandees: string[];
  ovasDonnes: number; ovasDemandes: number; expireLe: string;
  etat: 'propose' | 'accepte' | 'refuse' | 'annule' | 'expire';
}
export interface TransactionCarriere {
  id: string; clubId: string; nature: 'dotation' | 'pack' | 'vente' | 'venteRapide' | 'enchere' | 'echange' | 'match' | 'objectif' | 'competition';
  ovas: number; cartes: string[]; libelle: string; date: string;
  /** Petit résumé durable pour les records, sans devoir conserver la carte. */
  meta?: { packId?: string; packNom?: string; packApparence?: RareteCarriere; meilleureNote?: number; meilleurJoueur?: string; meilleurPortrait?: string };
}
export interface StatistiquesLigueCarriere {
  packsOuverts: number;
  parClub: { clubId: string; pseudo: string; nom: string; packs: number }[];
  meilleurOuvreur?: { clubId: string; pseudo: string; packs: number };
  meilleurPack?: { clubId: string; pseudo: string; pack: string; apparence: RareteCarriere; note: number; joueur: string; portrait?: string; date: string };
  plusGrosAchat?: { clubId: string; pseudo: string; joueur: string; montant: number; date: string };
}
export interface StatistiquesGlobalesCarriere {
  ligues: number; comptes: number; clubs: number; packsOuverts: number; matchsJoues: number;
  ovasDepensesPacks: number; volumeMarche: number;
  meilleurOuvreur?: { pseudo: string; packs: number; ligue: string };
  meilleurPack?: { pseudo: string; pack: string; apparence: RareteCarriere; note: number; joueur: string; portrait?: string; ligue: string };
  plusGrosAchat?: { pseudo: string; joueur: string; montant: number; ligue: string };
}
export interface ObjectifCarriere {
  id: string; clubId: string; libelle: string; type: 'participer' | 'gagner' | 'essais' | 'formation' | 'penalites' | 'serie';
  cible: number; progression: number; recompense: number; debut: string; fin: string; reclame: boolean;
}
export interface LigneClassementCarriere {
  clubId: string; nom: string; points: number; joues: number; gagnes: number; nuls: number;
  perdus: number; pour: number; contre: number; difference: number; bonus: number;
}
export interface HistoireCarriere {
  competitionId: string; nom: string; trophee: string; logo?: string; tropheeId?: string; saison: number;
  vainqueur: string; finaliste?: string; date: string;
}
/** État exclusivement serveur. Écriture atomique avec comparaison de version en base. */
export interface EtatCarriereEnLigne {
  catalogueRevision?: number;
  schema: 1; id: string; nom: string; code: string; createurId: string; creeLe: string;
  version: number; saison: number; phase: 'salon' | 'saison' | 'intersaison';
  rythme: number; maxClubs: number; graine: string; debutSaison?: string;
  /** L'identité de la ligue : son logo, son trophée, sa phase finale. */
  logo?: string; tropheeId?: string; playoffs?: boolean;
  /** Ce que chaque club reçoit en arrivant. Fixé à la création, jamais après. */
  dotationOvas: number;
  clubs: ClubCarriere[]; cartes: CarteCarriere[]; packs: PackCarriere[];
  competitions: CompetitionCarriere[]; rencontres: RencontreCarriere[];
  ventes: VenteCarriere[]; echanges: EchangeCarriere[]; transactions: TransactionCarriere[];
  objectifs: ObjectifCarriere[]; histoire: HistoireCarriere[];
}
export interface VueCarriereEnLigne extends Omit<EtatCarriereEnLigne, 'graine' | 'clubs' | 'cartes' | 'rencontres' | 'objectifs' | 'transactions' | 'echanges'> {
  monClubId: string;
  clubs: (Omit<ClubCarriere, 'compteId' | 'composition' | 'strategie' | 'packsGratuits' | 'packsGratuitsProgrammes' | 'dernierLotPacksGratuits' | 'buteurManuel'> & { composition?: CompositionManager; strategie?: StrategieEnLigne; packsGratuits?: PackGratuitCarriere[]; dernierLotPacksGratuits?: string })[];
  /** Vue courante : cartes distribuées seulement. Le catalogue public est consulté séparément, par pages. */
  cartes: CarteCarriere[];
  rencontres: (Omit<RencontreCarriere, 'match'> & { match?: VueMatchEnLigne })[];
  objectifs: ObjectifCarriere[]; transactions: TransactionCarriere[]; echanges: EchangeCarriere[];
  classement: LigneClassementCarriere[]; vivierDisponible: number;
  /** Records publics de cette ligue, visibles dans son journal. */
  statistiques: StatistiquesLigueCarriere;
}
export interface CreationCarriere {
  id: string; nom: string; code: string; compteId: string; pseudo: string; clubNom: string;
  rythme: number; maxClubs: number; embleme?: string;
  logo?: string; tropheeId?: string; playoffs?: boolean; dotationOvas?: number;
}
export type CommandeCarriere =
  // ⚠️ L'ÉCUSSON SE CHOISIT À L'INSCRIPTION, ET PLUS JAMAIS APRÈS. Il n'y a
  // donc pas de commande pour le changer : dans une ligue entre potes, on
  // reconnaît le club de chacun à son écusson, et le voir changer en cours de
  // saison rend le classement et l'historique illisibles.
  | { type: 'rejoindre'; pseudo: string; clubNom: string; embleme?: string }
  | { type: 'demarrerSaison' }
  | { type: 'composition'; composition: CompositionManager }
  | { type: 'strategie'; strategie: StrategieEnLigne }
  | { type: 'ouvrirPack'; packId: IdPackCarriere }
  | { type: 'ouvrirPackGratuit'; attributionId: string }
  | { type: 'venteRapide'; carteId: string }
  // ⚠️ LE LOT PART D'UN SEUL BLOC, et c'est tout l'intérêt : le plancher
  // d'effectif se vérifie sur l'ENSEMBLE des sortants. Vendre les mêmes cartes
  // une par une passerait les quatre premières puis échouerait sur la
  // cinquième, en laissant l'effectif à moitié démantelé.
  | { type: 'venteRapideGroupee'; carteIds: string[] }
  | { type: 'vendre'; carteId: string; prix: number; mode: 'directe' | 'enchere'; dureeHeures: number }
  | { type: 'acheter'; venteId: string }
  | { type: 'encherir'; venteId: string; montant: number }
  | { type: 'annulerVente'; venteId: string }
  | { type: 'proposerEchange'; vers: string; cartesDonnees: string[]; cartesDemandees: string[]; ovasDonnes: number; ovasDemandes: number }
  | { type: 'repondreEchange'; echangeId: string; accepter: boolean }
  | { type: 'annulerEchange'; echangeId: string }
  | { type: 'favori'; carteId: string; valeur: boolean }
  | { type: 'reclamerObjectif'; objectifId: string }
  | { type: 'creerCoupe'; nom: string; trophee: string; participants: string[]; format: 'elimination' | 'championnat' | 'poules'; debut: string; recompenseParticipation: number; recompenseVainqueur: number; recompenseFinaliste: number; logo?: string; tropheeId?: string; playoffs?: boolean }
  | { type: 'match'; matchId: string; action: CommandeMatchEnLigne }
  | { type: 'lancerMatch'; matchId: string }
  | { type: 'actualiser' };


/** Catalogue public paginé ; aucune graine, transaction financière ou identité de compte. */
export interface EntreeCollection {
  carte: CarteCarriere;
  obtenuPar: string | null;
  obtention: 'pack' | 'dotation' | 'inconnue' | null;
  obtenuLe: string | null;
}
export interface PageCollection {
  joueurs: EntreeCollection[];
  total: number; page: number; pages: number;
  catalogueTotal: number; distribues: number; packes: number;
}
