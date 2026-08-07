// Types du domaine — Destiny Rugby 🏉

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
export type StatVariable =
  | AttributId
  | 'forme'
  | 'moral'
  | 'reputation'
  | 'argent';

// Contrat en cours du joueur : durée restante et salaire annuel.
export interface Contrat {
  club: string;
  division: string;
  saisons: number; // saisons restantes (0 = fin de contrat)
  salaire: number; // € par saison
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

// Un message privé échangé avec un compte (Groq répond à sa place).
export interface MessageDM {
  id: string;
  pseudo: string; // interlocuteur
  de: 'moi' | 'lui';
  texte: string;
  saison: number;
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
  lue?: boolean;
}

// Un succès débloqué : id → saison où il est tombé.
export type SuccesDebloques = Record<string, number>;

// Rythme de jeu choisi par le joueur.
export type Rythme = 'semaine' | 'saison';

// L'ambiance du site. Elle ne repeint que le FOND (la rampe `--pelouse-*` du
// design system) : l'or, le cuir et la craie restent, quelle que soit la
// couleur choisie. Voir `index.css` et `appliquerTheme` (store/useGame.ts).
export type Theme = 'vert' | 'bleu' | 'rouge';

export interface EntreeJournal {
  id: string;
  saison: number;
  role: 'joueur' | 'mj' | 'systeme';
  titre?: string;
  texte: string;
  deltas?: Partial<Record<StatVariable, number>>;
  evenement?: string;
}

// Réponse structurée attendue du Maître du Jeu (Groq)
export interface ReponseMJ {
  recit: string;
  evenement?: string;
  deltas?: Partial<Record<StatVariable, number>>;
  consequences?: string;
  choix?: string[];
}

/**
 * L'ÉVÈNEMENT DE LA SEMAINE — le cœur du récit.
 *
 * Demande explicite : « au lieu d'avoir des boutons, chaque semaine Groq sort un
 * évènement ; le joueur répond en écrivant et Groq juge la réponse ». Ce n'est
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
  | 'social';

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
  score: number;
  fictif?: boolean; // légende pré-générée (pour peupler le classement)
  reconversion?: string; // ce qu'il est devenu après sa carrière
}
