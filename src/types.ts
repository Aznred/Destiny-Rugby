// Types du domaine — Destiny Rugby 🏉
import type { SituationRecrutement } from './lib/economie';
export type { SituationRecrutement };

// Les 15 postes du rugby, du pilier gauche (1) à l'arrière (15).
export type PosteId =
  | 'pilier_gauche' | 'talonneur' | 'pilier_droit'
  | 'deuxieme_ligne_g' | 'deuxieme_ligne_d'
  | 'troisieme_aile_g' | 'troisieme_aile_d' | 'numero_8'
  | 'demi_melee' | 'demi_ouverture'
  | 'ailier_gauche' | 'premier_centre' | 'deuxieme_centre' | 'ailier_droit'
  | 'arriere';

// « Famille » de postes : c'est ce que donnent les données réelles, qui ne
// distinguent pas le pilier gauche du pilier droit.
export type FamillePoste =
  | 'pilier' | 'talonneur' | 'deuxieme_ligne' | 'troisieme_ligne'
  | 'demi_melee' | 'demi_ouverture' | 'centre' | 'ailier' | 'arriere';

export interface Poste {
  id: PosteId;
  nom: string;
  numero: number; // le numéro du maillot, 1 à 15
  famille: FamillePoste;
  categorie: 'Avant' | 'Arrière';
  description: string;
  // Attributs mis en avant pour ce poste (utilisés pour la génération de base)
  cles: (keyof Attributs)[];
}

export interface Attributs {
  vitesse: number;
  force: number;
  endurance: number;
  plaquage: number;
  passe: number;
  jeuAuPied: number;
  vision: number;
  mental: number;
}

export type AttributId = keyof Attributs;

// Clés numériques du joueur que l'IA peut faire varier
//
// ⚠️ LES TROIS DERNIÈRES SONT ARRIVÉES APRÈS COUP (demande explicite : « la
// popularité, donc le nombre d'abonnés sur X »). Elles ne sont PAS des
// attributs : `popularite` et `confianceCoach` sont bornées 0-100 comme la
// forme, `abonnes` est un compteur absolu qui peut valoir des dizaines de
// milliers. Chacune a son propre plafond dans `plafonnerDeltas` (lib/mj.ts).
export type StatVariable =
  | AttributId
  | 'forme'
  | 'moral'
  | 'reputation'
  | 'argent'
  | 'popularite'
  | 'abonnes'
  | 'confianceCoach';

// Contrat en cours du joueur : durée restante et salaire annuel.
export interface Contrat {
  club: string;
  division: string;
  saisons: number; // saisons restantes (0 = fin de contrat)
  salaire: number; // € par saison
  /**
   * ⚠️ LE RUGBY AMATEUR NE PAIE PAS DE SALAIRE, IL PAIE LA FEUILLE DE MATCH.
   * Retour de jeu : « certains clubs ne proposent pas de salaires, que des
   * primes ». Sous la Nationale 2 — et dans les petits championnats étrangers —
   * beaucoup de clubs engagent un joueur pour un défraiement par match et rien
   * d'autre : `salaire` vaut alors 0 et c'est CE champ qui remplit le
   * portefeuille, au prorata des matchs joués (voir `saisonSuivante`).
   * Optionnel : les sauvegardes antérieures ne l'ont pas.
   */
  primeMatch?: number; // € par feuille de match
}

/**
 * Un accord de principe, signé mais pas encore effectif.
 * ⚠️ Il porte tout ce qu'il faut pour appliquer le transfert SANS relire
 * l'approche : celle-ci peut avoir été purgée, ou le monde avoir bougé entre la
 * poignée de main et le mois de juillet.
 */
export interface PreAccord {
  club: string;
  division: string;
  divisionNom: string;
  salaire: number;
  prime: number;
  /** Défraiement par match, quand le club ne verse pas de salaire. */
  primeMatch?: number;
  saisons: number;
  garantie: boolean;
  etranger: boolean;
  prolongation: boolean;
  /** La saison À LA FIN DE LAQUELLE il s'applique. */
  saison: number;
}

// Une proposition du marché (`lib/offres.ts`). Elle ne s'affiche plus dans un
// panneau : elle devient une APPROCHE négociée en message privé sur L'Ovale
// (`lib/negociation.ts`).
export interface OffreContrat {
  id: string;
  club: string;
  division: string;
  divisionNom: string;
  pays: string;
  noteClub: number;
  salaire: number;
  prime: number;
  saisons: number;
  etranger: boolean;
  argumentaire: string;
  negociee?: boolean; // on ne renégocie pas deux fois la même offre
  /** Défraiement par match — les clubs amateurs ne proposent que ça (`salaire: 0`). */
  primeMatch?: number;
}

export interface Joueur {
  nom: string;
  poste: PosteId;
  nation: string;
  club: string;
  division?: string; // id de division ('top14'…'reg3') — absent sur vieilles sauvegardes
  age: number;
  attributs: Attributs;
  forme: number; // 0-100
  moral: number; // 0-100
  reputation: number; // 0-100
  argent: number; // €
  saison: number;
  matchsJoues: number;
  essais: number;
  titres: string[];
  // ⚠️ LE PALMARÈS STRUCTURÉ. `titres` est une liste de libellés (« Bouclier de
  // Brennus (S4) ») : parfait pour l'affichage, inexploitable pour un succès du
  // type « champion avec trois clubs différents ». On double donc la mise avec
  // une trace exploitable — id du trophée, saison ET club. Absent des vieilles
  // sauvegardes : toujours lire avec `?? []`.
  palmares?: TitreGagne[];
  /**
   * TOUS LES CLUBS PORTÉS, dans l'ordre, sans doublon consécutif.
   *
   * ⚠️ `palmares[].club` ne suffisait pas : il ne connaît que les clubs où l'on
   * a GAGNÉ quelque chose. Une carrière honnête passée par cinq clubs sans titre
   * n'en laissait aucune trace, alors que c'est précisément ce qu'on veut lire
   * sur la fiche d'un joueur du classement mondial (« les clubs qu'ils ont
   * faits »). Alimenté à la création et à chaque signature effective
   * (`appliquerPreAccord`). Optionnel : les vieilles sauvegardes n'en ont pas,
   * la migration les initialise avec le club courant.
   */
  clubs?: string[];
  // --- Évolution dynamique (ajoutés en cours de route : optionnels pour les
  // sauvegardes antérieures, complétés à la volée par le store) ---
  potentiel?: number; // note générale visée au pic de carrière
  noteSaison?: number; // note moyenne (sur 10) de la saison écoulée
  contrat?: Contrat;
  /**
   * ⚠️ UN ACCORD TROUVÉ EN COURS DE SAISON NE S'APPLIQUE QU'À L'INTERSAISON
   * (décision de l'utilisateur : « le transfert s'effectue qu'à l'intersaison »).
   * On serre la main en février, on déménage en juillet — comme dans la vraie
   * vie. `saisonSuivante` le consomme et le remet à `undefined`.
   */
  preAccord?: PreAccord;
  // --- Mode « journée par journée » (calendrier réel) ---
  semaine?: number; // semaine en cours dans le calendrier (1 = fin août)
  saisonEnCours?: BilanEnCours;
  selections?: number; // nombre de capes internationales
  stats?: StatsDetaillees; // cumul de carrière
  blessure?: Blessure | null; // blessure en cours
  mentorat?: boolean; // a pris un jeune sous son aile (30 ans et +)
  traits?: string[]; // traits de caractère choisis à la création
  capitaine?: boolean; // porte le brassard
  relations?: Relation[]; // amitiés et rivalités du vestiaire
  entrainementSemaine?: number; // dernière semaine où l'on s'est entraîné
  // ⚠️ LE SECTEUR TRAVAILLÉ EN PERMANENCE. On le choisit une fois, la séance
  // se fait TOUTE SEULE chaque semaine, et on peut en changer quand on veut.
  entrainementFocus?: AttributId;
  // --- Lot 6 : ce que le staff et le public pensent de toi ---
  confianceCoach?: number; // 0-100, 50 par défaut — pèse sur le temps de jeu
  // Une mise au banc disciplinaire force réellement le statut de remplaçant.
  // Champ optionnel pour que toutes les anciennes sauvegardes restent valides.
  miseAuBanc?: { semaines: number; motif: string };
  popularite?: number; // 0-100, 50 par défaut — pèse sur la réputation et le marché
  agent?: string; // id de l'agent (data/agents.ts) — il se mérite, voir `choisirAgent`
  /**
   * La saison écoulée était-elle ratée (< 5/10) ?
   * ⚠️ Sert UNIQUEMENT à ce qu'un agent ne parte pas sur un accident : il faut
   * DEUX saisons ratées d'affilée pour qu'il te lâche (`mouvementAgents`).
   */
  derniereSaisonRatee?: boolean;
  // Poids du joueur sur les résultats de son club, figé pour la saison
  // (voir `calculerApportClub` dans le store).
  apportClub?: number;
  // --- Lot 7 : réseau social ---
  pseudo?: string; // identifiant @ sur L'Ovale
  abonnes?: number; // nombre d'abonnés
  profilSocial?: ProfilSocial; // nom affiché, photo, bio, bannière
}

// Un titre remporté, avec ce qu'il faut pour construire un palmarès : quel
// trophée, quelle saison, et surtout AVEC QUEL CLUB.
export interface TitreGagne {
  trophee: string; // id dans data/trophees.ts
  nom: string;
  saison: number;
  club: string;
  division?: string;
}

// Ce que le joueur a accumulé depuis le début de la saison, semaine après
// semaine. Sert de base au bilan de fin de saison (au lieu d'une simulation).
export interface BilanEnCours {
  matchs: number;
  titularisations: number;
  essais: number;
  notes: number[]; // note de chaque match joué, sur 10
  capes: number; // sélections honorées cette saison
  stats: StatsDetaillees; // cumul de la saison en cours
}

// Statistiques détaillées, cumulées sur une saison ou sur toute la carrière.
//
// ⚠️ TOUT LE JEU EST COMPTÉ (demande explicite : « pour les notes il faut
// prendre en compte tout le jeu »). Les champs ajoutés sont OPTIONNELS et
// toujours lus avec `?? 0` : une sauvegarde antérieure ne les a pas, et elle ne
// doit ni planter ni afficher `NaN`. Ils sont remplis par le moteur de match
// (`moteur/entites.ts` → `enregistrerMatchVecu`), jamais estimés pour le joueur
// humain — c'est toute la différence avec `lib/statsJoueurs.ts`.
export interface StatsDetaillees {
  points: number;
  butsTentes: number;
  butsReussis: number;
  plaquages: number;
  plaquagesManques: number;
  grattages: number;
  passesDecisives: number;
  cartonsJaunes: number;
  cartonsRouges: number;
  // --- Ajoutés avec la feuille de match complète ---------------------------
  passes?: number;          // passes réussies (toutes)
  offloads?: number;        // passes après contact
  metres?: number;          // mètres gagnés ballon en main
  franchissements?: number; // défenseurs battus
  turnovers?: number;       // ballons concédés
  melees?: number;          // mêlées gagnées par son pack (avants)
  touchesGagnees?: number;  // touches captées (avants)
  pickAndGo?: number;       // ballons portés au ras (avants)
  coupsDePied?: number;
  cinquanteVingtDeux?: number; // 50/22 réussis
}

// --- BLESSURES ---
export type GraviteBlessure = 'legere' | 'moyenne' | 'saison' | 'carriere';

export interface Blessure {
  nom: string;
  gravite: GraviteBlessure;
  semaines: number; // indisponibilité restante
}

// Ce que devient le joueur une fois les crampons raccrochés.
export interface Reconversion {
  id: string;
  nom: string;
  emoji: string;
  desc: string;
}

// Lien noué avec un autre joueur : un ami dans le vestiaire, une rivalité qui
// dure. Les relations naissent des saisons passées ensemble et des transferts.
export interface Relation {
  nom: string;
  club: string;
  type: 'ami' | 'nemesis';
  depuis: number; // saison où le lien est né
}

// --- RÉSEAU SOCIAL « L'Ovale » (lot 7) ---
export interface PostSocial {
  id: string;
  auteur: string;
  pseudo: string; // sans @
  avatar: string; // emoji, ou 'moi' pour le joueur
  certifie?: boolean;
  texte: string;
  saison: number;
  semaine: number;
  date: string; // libellé court (« 12 oct. »)
  moi?: boolean; // publié par le joueur
  ton?: string; // id du ton employé (posts du joueur)
  likes: number;
  reposts: number;
  vues: number;
  aime?: boolean; // le joueur a aimé ce post
  repostee?: boolean; // le joueur a reposté (apparaît sur son profil)
  // ⚠️ Vues gagnées grâce à TON repost, mémorisées pour être reprises si tu le
  // retires. Sans ça, reposter/dé-reposter en boucle gonflait les vues à
  // l'infini (le compteur montait à chaque activation, jamais à la baisse).
  bonusRepost?: number;
  hostile?: boolean; // réponse négative
  reponses?: PostSocial[];
  // Ce que le post PROVOQUE dans le monde du jeu (généré par l'IA) : un
  // transfert annoncé se fait vraiment, une offre arrive vraiment.
  action?: {
    type: 'transfert' | 'offre' | 'rumeur' | 'conference' | 'drama';
    joueur?: string;
    de?: string;
    vers?: string;
    poste?: string;
    age?: number;
    note?: number;
  };
  type?: string; // type de compte auteur
  media?: { url: string; gif?: boolean; legende?: string }; // image ou GIF joint
}

// Un compte que le joueur suit sur L'Ovale : un coéquipier, un rival, un club,
// un journaliste. Les vrais noms viennent des effectifs et des championnats.
export interface CompteSuivi {
  pseudo: string; // sans @
  nom: string;
  // Avatar : un emoji, 'club:<nom du club>' (écusson officiel),
  // 'compet:<id>' (logo de championnat) ou 'moi' (le joueur).
  avatar: string;
  type: 'joueur' | 'club' | 'journaliste' | 'media' | 'fan' | 'hater' | 'selection' | 'competition';
  club?: string;
  bio?: string;
  certifie?: boolean;
  abonnes: number;
  banniere?: string; // dégradé de la bannière de profil
}

// Ce que le joueur peut personnaliser sur SON profil.
export interface ProfilSocial {
  nomAffiche?: string;
  pseudo?: string;
  bio?: string;
  avatar?: string; // 'club' (écusson) ou un emoji
  banniere?: string;
}

// Un message privé échangé avec un compte (l'IA locale répond à sa place).
export interface MessageDM {
  id: string;
  pseudo: string; // interlocuteur
  de: 'moi' | 'lui';
  texte: string;
  saison: number;
  /**
   * ⚠️ LA SEMAINE DU JEU — c'est ELLE qu'on affiche. L'horodatage réel ne sert
   * plus qu'au tri : un message reçu pendant la 12ᵉ journée doit être daté de
   * novembre, pas du jour où l'on joue.
   */
  semaine?: number;
  /** Date locale de création : sert à garder les conversations dans le bon ordre. */
  creeLe?: number;
  /** Un message reçu reste bleu tant que le joueur n'a pas ouvert la discussion. */
  lu?: boolean;
}

/**
 * Un club qui a refusé une candidature sans fermer définitivement la porte.
 *
 * Le dossier est persistant : le marché le réétudie après une progression
 * significative du joueur et, quoi qu'il arrive, à la saison suivante.
 */
export interface DossierRecrutementClub {
  pseudo: string;
  club: string;
  saisonContact: number;
  semaineContact: number;
  coteAuContact: number;
  derniereCoteEtudiee: number;
  derniereSaisonEtudiee: number;
}

// Un transfert ANNONCÉ sur L'Ovale — et réellement appliqué au monde du jeu.
export interface TransfertAnnonce {
  nom: string; // joueur concerné
  de: string; // club quitté
  vers: string; // club rejoint
  saison: number;
  poste?: string;
  age?: number;
  note?: number;
  nation?: string;
}

export interface NotifSocial {
  id: string;
  emoji: string;
  titre: string;
  texte: string;
  saison: number;
  /** La semaine de jeu, pour dater la notification sur le calendrier du jeu. */
  semaine?: number;
  /** Horodatage local : sert au TRI, jamais à l'affichage. */
  creeLe?: number;
  lue?: boolean;
}

// Un succès débloqué : id → saison où il est tombé.
export type SuccesDebloques = Record<string, number>;

// L'ambiance du site. Elle ne repeint que le FOND (la rampe `--pelouse-*` du
// design system) : l'or, le cuir et la craie restent, quelle que soit la
// couleur choisie. Voir `index.css` et `appliquerTheme` (store/useGame.ts).
export type Theme =
  | 'vert'
  | 'bleu'
  | 'rouge'
  | 'violet'
  | 'turquoise'
  | 'cuivre'
  | 'rose'
  | 'carbone';

export interface EntreeJournal {
  id: string;
  saison: number;
  role: 'joueur' | 'mj' | 'systeme';
  titre?: string;
  texte: string;
  deltas?: Partial<Record<StatVariable, number>>;
  evenement?: string;
}

// ---------------------------------------------------------------------------
// CE QUE LE MJ PEUT DÉCLENCHER DANS LA VRAIE VIE DU JOUEUR
// ---------------------------------------------------------------------------
// ⚠️ DÉFINIS ICI, PAS DANS `data/situations.ts` (qui les ré-exporte pour ne
// casser aucun import) : `ReponseMJ` en a besoin, et `types.ts` ne doit
// dépendre d'aucun fichier de données.

/** Les issues lourdes — voir `lib/consequences.ts`. */
export type ConsequenceDure =
  | 'prison'          // condamnation : plusieurs mois hors des terrains
  | 'accident'        // accident grave : longue indisponibilité
  | 'deces'           // fin brutale — la carrière s'arrête là
  | 'finDeCarriere'   // le corps a dit stop
  | 'exclusionClub'   // le club rompt le contrat : te voilà sans club
  | 'banRugby'        // radiation : plus aucun club, plus aucune fédération
  | 'blessure'        // le corps lâche : indisponibilité, sans faute morale
  | 'relegationFinanciere' // le club est rétrogradé administrativement
  | 'suspension';     // suspension sportive de quelques semaines

/** Ce que le club décide côté portefeuille — voir `appliquerActionClub`. */
export type ActionClub = 'augmentation' | 'prime' | 'amende';

/** La décision « contrat » d'un jugement du MJ, avant plafonnement. */
export interface DecisionClub {
  type: ActionClub;
  /** Montant proposé par le MJ, en € (borné par le code). */
  montant?: number;
  /** Une demi-phrase qui explique pourquoi. */
  motif?: string;
}

// Réponse structurée attendue du Maître du Jeu local
export interface ReponseMJ {
  recit: string;
  evenement?: string;
  deltas?: Partial<Record<StatVariable, number>>;
  consequences?: string;
  choix?: string[];
  // --- Les leviers de carrière (demande explicite) -------------------------
  /** Suspension, exclusion, prison, radiation… Toujours filtrée par le code. */
  consequence?: ConsequenceDure;
  /** Durée de l'indisponibilité, quand la conséquence en demande une. */
  semaines?: number;
  /** Le motif écrit par le MJ, repris tel quel dans le journal. */
  motif?: string;
  /** Augmentation, prime de match, amende interne. */
  club?: DecisionClub;
  /** La réponse met vraiment le joueur sur le marché des transferts. */
  marche?: boolean;
}

/**
 * L'ÉVÈNEMENT DE LA SEMAINE — le cœur du récit.
 *
 * Demande explicite : « au lieu d'avoir des boutons, chaque semaine l'IA sort un
 * évènement ; le joueur répond en écrivant et l'IA juge la réponse ». Ce n'est
 * donc PAS un scénario à choix : il n'y a pas d'options, seulement une situation
 * et un champ de saisie. Les choix multiples restent le mode hors ligne.
 */
export interface EvenementHebdo {
  id: string;
  emoji: string;
  titre: string;
  texte: string;
  /**
   * ⚠️ LE PERMIS DE TUER, ET RIEN D'AUTRE. Une conséquence dure (prison,
   * accident, décès, exclusion) n'est acceptée du juge QUE si l'évènement
   * lui-même mettait le joueur en danger. Sans ce garde-fou, une réponse
   * maladroite à « le kiné te propose un massage » pouvait finir à la morgue :
   * le jeu ne punit jamais au hasard (voir `lib/consequences.ts`).
   */
  risque: boolean;
  /** Semaine de jeu où il a été posé : sert à ne pas en poser deux d'affilée. */
  semaine: number;
}

export type Ecran =
  | 'accueil'
  | 'creation'
  | 'carriere'
  | 'profil'
  | 'boutique'
  | 'pantheon'
  | 'classement'
  | 'championnats'
  | 'effectif'
  | 'tableau'
  | 'social'
  | 'finCarriere'
  // ── Le mode manager ─────────────────────────────────────────────────
  | 'creationManager'
  | 'manager';

// ---------------------------------------------------------------------------
// CLUBS & CHAMPIONNATS
// (définis ici plutôt que dans data/clubs.ts : le fichier généré
// data/mondeReel.ts en a besoin, et clubs.ts importe ce fichier généré.)
// ---------------------------------------------------------------------------
export interface Club {
  nom: string;
  ville?: string;
  c1: string; // couleurs du blason généré (repli quand il n'y a pas de logo)
  c2: string;
  logo?: string; // logo officiel (public/logos/*.png)
}

export interface Competition {
  id: string;
  nom: string;
  pays: string;
  drapeaux: string[]; // codes flag-icons (ex. 'fr', 'gb-eng')
  emoji: string;
  niveau: number; // 1 = élite France ; 7 = Fédérale 3 (0 = étranger/élite)
  zone: 'France' | 'Monde';
  clubs: Club[];
  note?: string;
}

// Une ligne de classement (championnat de clubs OU compétition de sélections).
export interface LigneClassement {
  position: number;
  equipe: string;
  logo?: string;
  points: number;
  joues: number;
  gagnes: number;
  nuls: number;
  perdus: number;
  difference: number;
  bonus: number;
}

// Coupe : pas de championnat propre, ses clubs viennent des championnats.
export interface CompetitionCoupe {
  id: string;
  nom: string;
  pays: string;
  drapeaux: string[];
  emoji: string;
  desc: string;
  clubs: Club[];
}

// Compétition de sélections nationales (6 Nations, tournée d'automne…).
export interface CompetitionNations {
  id: string;
  nom: string;
  emoji: string;
  desc: string;
  classement: LigneClassement[];
}

// ═══════════════════════════════════════════════════════════════════════
// LE MODE MANAGER
// ═══════════════════════════════════════════════════════════════════════

/**
 * Ce qu’une carrière a été. C’est ÇA qui la classe.
 *
 * Demande explicite : « faire plusieurs classements de catégories, et un
 * classement total comprenant les carrières sans entraîneur, juste
 * entraîneur, et avec entraîneur/joueur ».
 *
 * ⚠️ ELLE EST FACULTATIVE PARTOUT, et se lit `?? 'joueur'`. Toutes les fiches
 * déjà envoyées au classement mondial en sont dépourvues : les refuser, ou
 * les reclasser ailleurs, viderait le tableau existant.
 *
 * ⚠️ ET ELLE EST DÉFINIE DANS `lib/classementMondial.ts`, PAS ICI. Ce
 * fichier-là doit rester copiable tel quel dans une Edge Function : il ne peut
 * pas importer le domaine du jeu. On le réexporte donc, pour que le reste du
 * code continue de lire ses types au même endroit.
 */
export type { CategorieCarriere } from './lib/classementMondial';

/** Une saison d’entraîneur, telle que le board l’a jugée. */
export interface SaisonManager {
  saison: number;
  club: string;
  division: string;
  divisionNom: string;
  /** Le rang obtenu dans la poule. */
  rang: number;
  /** Le rang que le board avait demandé. */
  objectif: number;
  tenu: boolean;
  /** Ids de trophées (`data/trophees.ts`). */
  titres: string[];
  montee?: boolean;
  descente?: boolean;
  /** Le club a-t-il remercié son entraîneur à la fin de cette saison ? */
  licencie?: boolean;
}

export type RoleRecrueManager = 'cadre' | 'rotation' | 'espoir';

/** Un joueur réellement présent dans un effectif du monde, repéré par le manager. */
export interface CibleRecrutementManager {
  id: string;
  pseudo: string;
  nom: string;
  club: string;
  division: string;
  poste: PosteId;
  age: number;
  note: number;
  potentiel: number;
  nation: string;
  /**
   * Indemnité RÉELLEMENT réclamée pour le libérer maintenant.
   *
   * ⚠️ ELLE VAUT 0 EN FIN DE CONTRAT, et c'est le cœur du marché du rugby
   * français : on attend, et on ne paie rien — mais les autres clubs attendent
   * aussi. Elle vaut 0 également à partir de la Nationale 2, où l'on ne se vend
   * pas de joueurs. Voir `indemniteDeRachat` (`lib/economie.ts`).
   */
  indemnite: number;
  /**
   * Ce que le joueur VAUT, indépendamment de ce qu'il coûte.
   *
   * ⚠️ C'est une valeur de jeu, pas un prix : elle sert à comparer deux cibles
   * et à cadrer une négociation. Un joueur estimé 250 000 € en dernière année
   * de contrat se libère pour 40 000 € — et pour rien du tout six mois plus
   * tard.
   */
  valeur: number;
  /** Saisons de contrat restantes chez son club. 0 = il sera libre. */
  saisonsRestantes: number;
  situation: SituationRecrutement;
  /** Salaire annuel réclamé. 0 chez un club amateur, qui ne salarie personne. */
  salaireDemande: number;
  /** Prime à la signature. 0 chez un club amateur. */
  primeDemandee: number;
  /**
   * Défraiement par feuille de match réclamé. Le pendant amateur du salaire :
   * 0 chez un club professionnel, > 0 chez un club amateur. Jamais les deux.
   */
  primeMatchDemandee: number;
  dureeDemandee: number;
  roleDemande: RoleRecrueManager;
}

export interface TermesRecrutementManager {
  salaire: number;
  prime: number;
  /**
   * Défraiement par feuille de match. ⚠️ Optionnel : les sauvegardes
   * antérieures au régime amateur ne le portent pas, et tout lecteur doit
   * faire `?? 0`. Un contrat amateur a `salaire: 0` et `primeMatch > 0`.
   */
  primeMatch?: number;
  duree: number;
  role: RoleRecrueManager;
}

/** Une discussion de recrutement menée dans les messages de L'Ovale. */
export interface NegociationManager {
  id: string;
  pseudo: string;
  joueur: CibleRecrutementManager;
  offre: TermesRecrutementManager;
  /** Exigences cachées du joueur : l'interface ne montre que sa patience. */
  exigences: TermesRecrutementManager;
  patience: number;
  etat: 'ouverte' | 'accord' | 'signee' | 'rompue';
  saison: number;
  semaine: number;
}

export interface RecrueManager {
  joueur: CibleRecrutementManager;
  termes: TermesRecrutementManager;
  saison: number;
}

// ---------------------------------------------------------------------------
// L'OVALE DU MANAGER : négocier avec le club, écouter le vestiaire, vendre
// ---------------------------------------------------------------------------
// Demande : « pareil pour X, sauf qu'on l'utilise pour démarcher les joueurs et
// négocier avec les autres clubs ; que les joueurs puissent demander leur
// besoin s'ils ne jouent pas assez ou dire qu'ils veulent partir ; pouvoir
// vendre les joueurs ».

/**
 * La discussion avec le club VENDEUR, avant celle avec le joueur.
 *
 * ⚠️ ELLE VIENT D'ABORD, ET C'EST L'ORDRE DU RUGBY : on s'entend sur
 * l'indemnité, puis on parle au joueur. L'inverse — se mettre d'accord avec le
 * joueur puis découvrir que son club ne le lâche pas — n'existe pas dans un
 * transfert réel, et ferait perdre au manager une négociation entière pour rien.
 *
 * ⚠️ ELLE N'EXISTE PAS SOUS LA NATIONALE 2. Les clubs amateurs ne se vendent
 * pas de joueurs (`PRO_JUSQUA`) : l'indemnité vaut 0, il n'y a rien à négocier,
 * et on parle directement au joueur.
 */
export interface NegociationClubManager {
  id: string;
  /** Le compte officiel du club sur L'Ovale (`pseudoStable(club, '_officiel')`). */
  pseudo: string;
  club: string;
  cible: CibleRecrutementManager;
  /** Ce que le club réclame au départ. */
  demande: number;
  /** Ce qu'on propose aujourd'hui. */
  offre: number;
  /** Le plancher CACHÉ : sous ce montant, le club raccroche. */
  plancher: number;
  patience: number;
  etat: 'ouverte' | 'accord' | 'rompue';
  saison: number;
  semaine: number;
}

/** Ce qu'un joueur du groupe vient réclamer dans les messages. */
export interface DemandeJoueur {
  id: string;
  pseudo: string;
  joueurId: string;
  nom: string;
  poste: PosteId;
  note: number;
  /**
   * `tempsDeJeu` : il ne joue pas et le fait savoir.
   * `depart` : il est trop bon pour le banc de ce club, il veut partir.
   */
  type: 'tempsDeJeu' | 'depart';
  saison: number;
  semaine: number;
  etat: 'ouverte' | 'acceptee' | 'refusee';
}

/** Une offre reçue pour un joueur mis sur la liste. */
export interface OffreVente {
  id: string;
  club: string;
  division: string;
  montant: number;
}

/** Un joueur mis sur la liste des transferts. */
export interface VenteManager {
  joueurId: string;
  nom: string;
  poste: PosteId;
  age: number;
  note: number;
  potentiel: number;
  /** Ce qu'il vaut au barème du jeu (`valeurMarchande`, la MÊME que pour acheter). */
  valeur: number;
  saison: number;
  offres: OffreVente[];
}

export interface ChoixDecisionManager {
  id: string;
  label: string;
  consequence: string;
  confiance?: number;
  prestige?: number;
  budgetTransferts?: number;
  budgetSalarial?: number;
}

/** La scène hebdomadaire du manager : contexte, puis décision obligatoire. */
export interface DecisionManager {
  id: string;
  emoji: string;
  titre: string;
  texte: string;
  choix: ChoixDecisionManager[];
}

export type PlanAttaqueManager = 'equilibre' | 'avants' | 'large' | 'occupation';
export type PlanDefenseManager = 'blitz' | 'glissee' | 'repli';
export type RythmeManager = 'gestion' | 'normal' | 'intense';
export type ChoixPenaliteManager = 'mixte' | 'points' | 'touche';
export type TimingRemplacementsManager = 'precoces' | 'standard' | 'tardifs';

/** Le plan collectif transmis au moteur de match, avant et pendant la partie. */
export interface TactiqueManager {
  attaque: PlanAttaqueManager;
  defense: PlanDefenseManager;
  rythme: RythmeManager;
  penalites: ChoixPenaliteManager;
  remplacements: TimingRemplacementsManager;
}

/** Une feuille de match complète : XV, banc de huit, capitaine et buteur. */
export interface CompositionManager {
  titulaires: string[];
  remplacants: string[];
  capitaineId: string;
  buteurId: string;
}

/** Le score réellement produit par le moteur et réinjecté au championnat. */
export interface ResultatMatchManager {
  cle: string;
  club: string;
  saison: number;
  semaine: number;
  journee: number;
  domicile: boolean;
  adversaire: string;
  scorePour: number;
  scoreContre: number;
  essaisPour: number;
  essaisContre: number;
}

// ---------------------------------------------------------------------------
// LES INSTALLATIONS DU CLUB
// Demande : « qu'on puisse avoir un centre de formation avec des améliorations,
// et des recruteurs pour trouver les pépites ; et fais le centre
// d'entraînement aussi pour faire des entraînements perso ».
// ---------------------------------------------------------------------------
export type TypeInstallation = 'formation' | 'entrainement' | 'recrutement';

/** Le niveau de chaque structure, de 0 (rien) à `NIVEAU_INSTALLATION_MAX`. */
export type InstallationsClub = Record<TypeInstallation, number>;

/**
 * Un jeune sorti du centre de formation.
 *
 * ⚠️ IL EST PERSISTÉ, PAS RECALCULÉ, et c'est une différence de nature avec le
 * reste des effectifs. Un joueur du monde est déterministe : on le retrouve en
 * rejouant sa graine. Celui-ci est la CONSÉQUENCE D'UNE DÉCISION de carrière
 * (avoir payé le centre, telle saison, dans tel club) — le rejouer demanderait
 * de rejouer la carrière. Il vit donc dans la sauvegarde, comme les transferts
 * annoncés sur L'Ovale, et `effectif.ts` le reçoit par registre.
 */
export interface JeuneForme {
  id: string;
  club: string;
  /** La saison où il sort du centre : il n'existe pas avant. */
  saison: number;
  nom: string;
  poste: PosteId;
  nation: string;
  age: number;
  note: number;
  potentiel: number;
}

/** Ce qu'un recruteur ramène d'un déplacement. */
export interface RapportRecruteur {
  id: string;
  saison: number;
  /** Le club observé, et sa division. */
  club: string;
  division: string;
  niveau: number;
  nom: string;
  poste: PosteId;
  nation: string;
  age: number;
  note: number;
  /**
   * Le potentiel que le service CROIT avoir vu — pas forcément le vrai.
   *
   * ⚠️ C'EST UNE ESTIMATION, ET C'EST LE CŒUR DU SYSTÈME. Un rapport qui
   * dirait la vérité serait un oracle : on signerait à coup sûr, et améliorer
   * le service ne changerait que le nombre de lignes affichées. Ici, monter de
   * niveau, c'est cesser de parier — l'écart à la vérité est tiré dans
   * `± incertitude` (`INCERTITUDE_RECRUTEURS`), nul au niveau 4.
   */
  potentiel: number;
  /** ± admis par le service. 0 = le rapport ne se trompe plus. */
  incertitude: number;
}

export interface Manager {
  nom: string;
  nation: string;
  age: number;
  /** Vide entre deux clubs : un entraîneur au chômage reste un entraîneur. */
  club: string;
  division: string;
  divisionNom: string;
  saison: number;
  semaine: number;
  /**
   * 0 à 100. La seule jauge qui ouvre des portes (`lib/manager.ts`).
   *
   * ⚠️ UNE SEULE, PAS TROIS. « Expérience », « réputation » et « palmarès »
   * auraient dit la même chose trois fois, avec trois équilibrages à tenir.
   */
  prestige: number;
  /** 0 à 100. Celle du board, et elle se perd vite. */
  confiance: number;
  /** Le rang demandé cette saison. */
  objectif: number;
  argent: number;
  /** Enveloppes du club, distinctes du salaire personnel de l'entraîneur. */
  budgetTransferts: number;
  budgetSalarial: number;
  /**
   * La TROISIÈME enveloppe : les murs, pas les hommes.
   *
   * ⚠️ ELLE EST À PART, ET C'EST TOUT L'INTÉRÊT. Prendre les structures sur le
   * budget transferts en ferait un simple arbitrage « un joueur ou un centre »,
   * que personne ne résout en faveur du centre — le joueur joue dimanche. Et
   * chez un club amateur, où le budget transferts n'achète plus rien
   * (`PRO_JUSQUA`), il n'y aurait tout simplement rien à arbitrer.
   */
  budgetStructure: number;
  contrat: { saisons: number; salaire: number } | null;
  decision: DecisionManager | null;
  composition: CompositionManager;
  tactique: TactiqueManager;
  /** Indexé par la clé déterministe du calendrier. Un match ne se joue qu'une fois. */
  resultats: Record<string, ResultatMatchManager>;
  negociations: NegociationManager[];
  /** Les discussions d'indemnité avec les clubs vendeurs. */
  negociationsClubs: NegociationClubManager[];
  recrues: RecrueManager[];
  /**
   * Combien de feuilles de match chaque joueur a eues CETTE SAISON.
   *
   * ⚠️ C'EST LA SEULE SOURCE DES DEMANDES DE TEMPS DE JEU, et elle est
   * mesurée, pas devinée : un joueur se plaint parce qu'il n'a pas joué, pas
   * parce qu'un tirage l'a désigné. Remis à zéro à chaque intersaison.
   */
  tempsDeJeu: Record<string, number>;
  /** Ce que le vestiaire réclame, et qui attend une réponse. */
  demandes: DemandeJoueur[];
  /** Les joueurs qu'on a mis sur la liste des transferts. */
  ventes: VenteManager[];
  /**
   * Les structures, PAR CLUB.
   *
   * ⚠️ ELLES APPARTIENNENT AU CLUB, PAS À L'ENTRAÎNEUR, et c'est la seule
   * lecture qui tienne debout : on ne démonte pas un centre de formation pour
   * l'emporter ailleurs. Un manager qui change de banc repart donc du niveau
   * de SON nouveau club — et retrouve son ancien centre s'il y revient.
   */
  installations: Record<string, InstallationsClub>;
  /** Les jeunes réellement sortis du centre, tous clubs confondus. */
  jeunesFormes: JeuneForme[];
  /** Les joueurs mis au programme individuel, par leur nom affiché. */
  entrainements: string[];
  /**
   * Ce que le programme individuel a rapporté, sous la clé `club|nom`.
   *
   * ⚠️ LA CLÉ EST CELLE DU NOM AFFICHÉ, donc lue APRÈS `distinguerLesHomonymes`
   * (`lib/effectif.ts`) : les effectifs amateurs contiennent de vrais doublons
   * de nom, et créditer « Leo BOGALHO » sans son suffixe entraînerait les
   * quatre d'un coup, pour le prix d'une place.
   *
   * ⚠️ ET CE SONT DES INCRÉMENTS DATÉS, PAS UN CUMUL. Un simple total
   * s'appliquerait à TOUTES les saisons du club, y compris celles déjà jouées :
   * `effectifDuClub(club, 3)` sert encore à afficher un classement passé, et le
   * joueur y aurait rétroactivement gagné des points qu'il n'avait pas. On
   * n'ajoute donc que ce qui a été gagné À CETTE DATE OU AVANT.
   */
  progres: Record<string, { depuis: number; gain: number }[]>;
  /** Les rapports de recrutement, figés à la saison où ils ont été rendus. */
  rapports: RapportRecruteur[];
  /** Tous les clubs entraînés, dans l’ordre, sans doublon consécutif. */
  clubs: string[];
  titres: string[];
  palmares: TitreGagne[];
  historique: SaisonManager[];
  /**
   * Le passé de joueur, quand la carrière vient d’une reconversion.
   *
   * ⚠️ C’EST LUI QUI FAIT LA CATÉGORIE « joueur + entraîneur », et c’est lui
   * qui a ouvert de meilleurs clubs au premier jour (`prestigeDepuisJoueur`).
   */
  passeJoueur?: {
    nom: string;
    saisons: number;
    note: number;
    reputation: number;
    matchs: number;
    essais: number;
    selections: number;
    titres: string[];
    clubs: string[];
    ageDebut: number;
  };
  /**
   * ⚠️ LE MODE LIBRE, ET CE QU’IL COÛTE. Demande : « sinon mettre un mode
   * triche où on peut partir avec n’importe quel club, mais donc pas dans le
   * classement mondial ». Le drapeau est posé À LA CRÉATION et ne s’enlève
   * jamais : une carrière lancée au Stade Toulousain avec zéro prestige ne
   * redevient pas légitime parce qu’on a gagné ensuite.
   */
  libre?: boolean;
  pseudo?: string;
}

// Une carrière figée dans le Hall des Légendes.
export interface LegendeSauvegardee {
  id: string;
  nom: string;
  poste: PosteId;
  nation: string;
  age: number;
  saisons: number;
  note: number; // moyenne des attributs
  reputation: number;
  matchsJoues: number;
  essais: number;
  titres: string[];
  /**
   * Les IDS des trophées remportés (`data/trophees.ts`), un par titre.
   *
   * ⚠️ INDISPENSABLE POUR LE CLASSEMENT MONDIAL, et c'est la raison de ce
   * champ : `titres` ne contient que des LIBELLÉS (« Bouclier de Brennus (S4) »)
   * que le serveur ne peut pas vérifier. Il refusait donc toute carrière du Hall
   * (« trophée(s) inconnu(s) »). Optionnel : les sauvegardes d'avant ce champ ne
   * l'ont pas, et `ficheDepuisLegende` sait alors le reconstruire depuis les
   * libellés.
   */
  tropheeIds?: string[];
  /** Les clubs traversés, dans l'ordre (`Joueur.clubs`). */
  clubs?: string[];
  score: number;
  fictif?: boolean; // légende pré-générée (pour peupler le classement)
  reconversion?: string; // ce qu'il est devenu après sa carrière
}

/** La raison qui a fermé une carrière, conservée jusqu'à ce que le joueur l'ait lue. */
export type MotifFinCarriere =
  | 'retraiteChoisie'
  | 'ageLimite'
  | 'blessure'
  | 'radiation'
  | 'deces'
  | 'sansClub'
  | 'autre';

export interface FinCarriere {
  legendeId: string;
  motif: MotifFinCarriere;
  /** Le fait précis (nom de la blessure, décision, incident) quand il existe. */
  detail?: string;
  reconversion?: string;
  destination: 'pantheon' | 'manager';
}
