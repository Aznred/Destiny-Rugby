// LE DOMAINE DE LA LIGUE EN LIGNE — « OVALIE LEAGUE »
//
// Une ligue privée : 4 à 20 managers, chacun son club, un championnat étalé sur
// plusieurs mois, une monnaie (l'OVA), des packs, un marché entre potes, des
// coupes créées par le commissaire, et une mémoire qui traverse les saisons.
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ POURQUOI LES TYPES SONT DÉCLARÉS ICI ET PAS DANS `src/types.ts`
// ═══════════════════════════════════════════════════════════════════════════
// Même règle que `lib/classementMondial.ts`, et pour la même raison : ces
// fichiers tournent AUSSI dans les fonctions serverless (`api/`). `src/types.ts`
// fait 1 100 lignes et tire tout le domaine solo derrière lui. Le serveur, lui,
// n'a besoin que du vocabulaire de la ligue.
//
// La SEULE exception tolérée est `import type` : effacé à la compilation, il ne
// pèse rien à l'exécution. C'est ce qui permet de réutiliser `FamillePoste`
// plutôt que d'en réécrire une copie qui divergerait un jour.
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ ET SURTOUT : LE SERVEUR EST LA SOURCE DE VÉRITÉ
// ═══════════════════════════════════════════════════════════════════════════
// La carrière solo vit dans le navigateur (Zustand + persist) et c'est très
// bien : personne ne triche contre soi-même. Une ligue entre potes, c'est
// l'inverse — le solde d'OVA, la propriété d'une carte et le résultat d'un
// match engagent QUELQU'UN D'AUTRE.
//
// Donc, ici, le client ne DÉCLARE jamais un état : il DEMANDE une action.
//
//   ✗ « j'ai 100 000 OVA »            → le serveur ne lit pas ça
//   ✓ « je veux ouvrir un pack »      → le serveur vérifie le solde, débite,
//                                       tire dans le vivier, attribue, journalise
//
// Tous les types marqués « côté serveur » décrivent ce que la base garde. Le
// client en reçoit des projections, jamais le droit de les écrire.

import type { FamillePoste } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LES IDENTIFIANTS
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ TOUS OPAQUES. Un pseudo n'identifie RIEN : il se change, et deux personnes
// peuvent porter le même. Le classement mondial a déjà payé cette leçon — voir
// la migration v3 de `serveur/schema-vercel.sql`, où le pseudo servait de clé
// primaire et où deux homonymes se partageaient une ligne, la carrière du moins
// bien classé n'entrant jamais au classement. L'identité technique ne s'affiche
// jamais.

/** Compte global d'une personne. Traverse toutes ses ligues. */
export type IdCompte = string;
/** Une ligue. C'est l'unité d'isolement de l'économie. */
export type IdLigue = string;
/** L'adhésion d'un compte à une ligue (le « manager » de cette ligue-là). */
export type IdMembre = string;
/** Le club d'un membre dans une ligue. */
export type IdClub = string;
/**
 * Une carte joueur DANS UNE LIGUE.
 *
 * ⚠️ Volontairement local à la ligue, jamais global. Deux ligues ont chacune
 * leur Dupont, et c'est le principe même du mode : « tu ne peux jamais
 * transférer un joueur de la ligue A vers la ligue B ». Un identifiant global
 * inviterait un jour à le faire.
 */
export type IdCarte = string;

// ═══════════════════════════════════════════════════════════════════════════
// 2. LES RÉGLAGES — ce que le commissaire choisit à la création
// ═══════════════════════════════════════════════════════════════════════════

/** Les cinq saveurs de ligue (voir `reglages.ts` pour les préréglages). */
export type TypeLigue = 'ultimate' | 'manager' | 'draft' | 'equilibre' | 'hardcore';

/** Aller simple, ou aller-retour. */
export type FormatChampionnat = 'aller' | 'allerRetour';

/**
 * Ce qui se passe quand une journée se ferme sans que le match ait été joué.
 * Choisi une fois pour toutes à la création : personne n'arbitre au cas par cas.
 */
export type RegleMatchNonJoue = 'report' | 'simulation' | 'forfait' | 'commissaire';

/**
 * Le garde-fou anti-cadeau (point 11 du cahier des charges).
 *
 * ⚠️ C'EST LA FAILLE STRUCTURELLE DU MODE, et elle n'a rien d'hypothétique :
 * deux potes peuvent décider d'alimenter une seule équipe. « Colin donne son
 * OVR 90 à Hugo contre 1 OVA » et le championnat est mort avant la 5e journée.
 *
 *   libre       — tout passe. Pour un groupe qui se fait confiance.
 *   fairplay    — au-delà du seuil, le commissaire valide (ou non).
 *   competitif  — au-delà du seuil, l'échange est simplement impossible.
 */
export type ModeEquite = 'libre' | 'fairplay' | 'competitif';

export interface ReglagesLigue {
  type: TypeLigue;
  /** Nombre de clubs, donc de managers. 4 à 20. */
  clubs: number;
  format: FormatChampionnat;
  /** Matchs par semaine : 1 ou 2. */
  rythme: 1 | 2;
  /**
   * Jours de fin de journée, 0 = dimanche … 6 = samedi.
   * ⚠️ Autant d'entrées que `rythme` — « mercredi + dimanche » = [3, 0].
   * Ce ne sont PAS des heures de rendez-vous : voir `Journee` plus bas.
   */
  jours: number[];
  packs: boolean;
  /** Le marché ouvert (mise en vente, enchères). */
  marche: boolean;
  /** Les échanges directs de club à club. */
  echanges: boolean;
  prets: boolean;
  plafondSalarial: boolean;
  blessures: boolean;
  fatigue: boolean;
  equite: ModeEquite;
  nonJoue: RegleMatchNonJoue;
  /** 0,5 (clémente) à 2 (impitoyable). Multiplie le risque de blessure. */
  severiteBlessures: number;
  /** 0,5 (généreuse) à 2 (dure). Divise les gains d'OVA. */
  dureteEconomie: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LA LIGUE ELLE-MÊME
// ═══════════════════════════════════════════════════════════════════════════

export type EtatLigue =
  /** Ouverte aux inscriptions : on attend les managers. */
  | 'salon'
  /** Le draft est en cours (type `draft` uniquement). */
  | 'draft'
  /** Elle tourne : on joue les journées. */
  | 'saison'
  /** Entre deux saisons : bilan, vieillissement, renouvellement du vivier. */
  | 'intersaison'
  /** Terminée pour de bon. Elle reste consultable — c'est son histoire. */
  | 'archivee';

export interface Ligue {
  id: IdLigue;
  nom: string;
  /** Le code qu'on colle dans Discord. Voir `identite.ts`. */
  code: string;
  /** Le compte qui commande. Il peut être transmis. */
  commissaire: IdCompte;
  reglages: ReglagesLigue;
  etat: EtatLigue;
  /** Numéro de saison, à partir de 1. */
  saison: number;
  /** Graine du monde : le vivier et la dotation en découlent, à l'identique. */
  graine: string;
  /** Premier jour de la saison, ISO `AAAA-MM-JJ`. */
  debut: string;
  creeLe: string;
}

/** Un manager dans une ligue. Le compte est global, le club ne l'est pas. */
export interface MembreLigue {
  id: IdMembre;
  compte: IdCompte;
  ligue: IdLigue;
  /** Nom affiché DANS cette ligue (recopié du compte, modifiable). */
  pseudo: string;
  club: ClubLigue;
  rejointLe: string;
}

export interface ClubLigue {
  id: IdClub;
  nom: string;
  /** Couleurs de l'écusson, `#rrggbb`. */
  couleurs: [string, string];
  /**
   * ⚠️ LE SOLDE VIT DANS LA LIGUE, JAMAIS DANS LE COMPTE.
   * « Surtout pas de portefeuille OVA global » : quelqu'un qui a joué 500
   * heures dans une vieille ligue détruirait l'économie de la nouvelle en
   * arrivant. Chaque ligue repart de zéro, pour tout le monde.
   */
  ova: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. LES CARTES — un joueur n'existe QU'UNE FOIS par ligue
// ═══════════════════════════════════════════════════════════════════════════
// C'est le point 13, et c'est ce qui fait toute l'économie : si Dupont
// appartient à Colin RFC, personne d'autre ne peut l'avoir. Il devient donc
// négociable — et une négociation entre potes, c'est le vrai contenu du mode.

/** Cinq bandes de rareté. Voir `rarete.ts` pour les bornes et les couleurs. */
export type Rarete = 'commun' | 'confirme' | 'rare' | 'elite' | 'mondial';

export interface CarteJoueur {
  id: IdCarte;
  nom: string;
  poste: FamillePoste;
  nation: string;
  age: number;
  /** La note générale (OVR). */
  note: number;
  /** La note visée au pic de carrière — c'est elle qui fait rêver. */
  potentiel: number;
  rarete: Rarete;
  /**
   * Le club qui la possède, `null` si elle dort dans le vivier.
   * ⚠️ Écrit UNIQUEMENT par le serveur, et toujours dans la même transaction
   * que le mouvement d'OVA qui la justifie.
   */
  proprietaire: IdClub | null;
  /**
   * Verrouillée : elle est engagée dans une offre ou une enchère en cours.
   * Sans ce drapeau, on peut vendre le même joueur à trois personnes en même
   * temps — il suffit d'ouvrir trois onglets.
   */
  verrouillee?: boolean;
}

/**
 * L'HISTOIRE D'UNE CARTE — ce qui la rend irremplaçable (point 20).
 *
 * « J'ai packé ce 74 à la première saison, personne n'en voulait, il est devenu
 * 87, il a joué 6 saisons chez moi. » Sans cette trace, ce souvenir n'existe
 * nulle part dans le jeu.
 */
export interface HistoireCarte {
  carte: IdCarte;
  /** Clubs traversés, avec les saisons. `a: null` = il y est encore. */
  clubs: { club: IdClub; de: number; a: number | null }[];
  matchs: number;
  essais: number;
  /** Ids de distinctions gagnées (`mvp`, `xvSaison`…), avec la saison. */
  distinctions: { id: string; saison: number }[];
  /** Ids de trophées d'équipe remportés en portant ce maillot. */
  titres: { id: string; saison: number }[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. LE CALENDRIER — une journée est une FENÊTRE, pas une heure
// ═══════════════════════════════════════════════════════════════════════════
// Point 22 : « je ne forcerais pas une heure précise ». Colin est libre le
// mercredi, Hugo non. La journée s'ouvre, les deux se mettent d'accord sur
// Discord, l'un des deux lance le match, et le résultat est enregistré. Ce qui
// compte, c'est la DATE LIMITE.

export interface RencontreLigue {
  journee: number;
  domicile: IdClub;
  exterieur: IdClub;
  /** Rempli quand le match a été joué. */
  resultat?: ResultatRencontre;
}

export interface ResultatRencontre {
  pointsD: number;
  pointsE: number;
  essaisD: number;
  essaisE: number;
  /** Comment il est arrivé : joué par les deux, simulé, forfait… */
  origine: 'joue' | 'simule' | 'forfait' | 'commissaire';
  joueLe: string;
}

export interface Journee {
  numero: number;
  /** Ouverture de la fenêtre, ISO complet. */
  ouvre: string;
  /** Fermeture : au-delà, `ReglagesLigue.nonJoue` s'applique. */
  ferme: string;
  rencontres: RencontreLigue[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. LE MARCHÉ
// ═══════════════════════════════════════════════════════════════════════════

/** Une offre d'échange de club à club (point 8 : la négociation privée). */
export interface OffreEchange {
  id: string;
  ligue: IdLigue;
  de: IdClub;
  vers: IdClub;
  /** Ce que l'émetteur donne. */
  cartesDonnees: IdCarte[];
  ovaDonnes: number;
  /** Ce qu'il demande. */
  cartesDemandees: IdCarte[];
  ovaDemandes: number;
  message?: string;
  etat: 'envoyee' | 'acceptee' | 'refusee' | 'expiree' | 'attenteCommissaire';
  /** Chaînage des contre-propositions : l'offre à laquelle celle-ci répond. */
  repondA?: string;
  creeeLe: string;
  expireLe: string;
}

/** Une vente à prix fixe, ou une enchère (points 9 et 10). */
export interface VenteLigue {
  id: string;
  ligue: IdLigue;
  carte: IdCarte;
  vendeur: IdClub;
  /** Prix demandé (vente directe) ou mise à prix (enchère). */
  prix: number;
  /** `null` tant que personne n'a enchéri. */
  meilleureOffre: number | null;
  meilleurEncherisseur: IdClub | null;
  type: 'directe' | 'enchere';
  ferme: string;
  etat: 'ouverte' | 'vendue' | 'retiree' | 'infructueuse';
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. LE JOURNAL — on garde TOUT
// ═══════════════════════════════════════════════════════════════════════════
// Ça sert deux fois : à démêler une dispute (« je te jure que je t'ai envoyé
// 12 000 »), et à raconter la ligue. Six saisons de transactions, c'est une
// histoire commune.

export type NatureTransaction =
  | 'dotation'
  | 'pack'
  | 'echange'
  | 'vente'
  | 'enchere'
  | 'recompenseMatch'
  | 'recompenseCompetition'
  | 'recompenseObjectif'
  | 'ajustementCommissaire';

export interface Transaction {
  id: string;
  ligue: IdLigue;
  nature: NatureTransaction;
  /** Le club qui subit le mouvement. */
  club: IdClub;
  /** L'autre partie, s'il y en a une. */
  contrepartie?: IdClub;
  /** Positif = encaissé, négatif = payé. */
  ova: number;
  /** Cartes entrées et sorties du club. */
  cartesEntrantes?: IdCarte[];
  cartesSortantes?: IdCarte[];
  /** Résumé lisible, déjà composé côté serveur. */
  libelle: string;
  faitLe: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. LES COMPÉTITIONS MAISON (points 2 et 3)
// ═══════════════════════════════════════════════════════════════════════════
// Le commissaire peut lancer une coupe À N'IMPORTE QUEL MOMENT. C'est ce qui
// fabrique les traditions d'un groupe : la Christmas Cup, la Coupe de
// Printemps, la Colin's Champions Cup. Et le trophée reste dans l'histoire.

export type FormatCompetition = 'championnat' | 'eliminationDirecte' | 'poulesPuisKO';

export interface CompetitionLigue {
  id: string;
  ligue: IdLigue;
  nom: string;
  /** Le nom gravé sur le trophée — souvent différent de celui de la coupe. */
  trophee: string;
  couleurs: [string, string];
  format: FormatCompetition;
  /** Clubs engagés. Une coupe peut n'en prendre que 8 sur 10. */
  participants: IdClub[];
  /** Dotation au vainqueur, en OVA. Peut valoir 0 : le prestige suffit. */
  dotation: number;
  saison: number;
  etat: 'aVenir' | 'enCours' | 'terminee';
  vainqueur?: IdClub;
}

/** Le palmarès qui traverse les saisons — c'est lui qui donne du long terme. */
export interface LigneHistoire {
  competition: string;
  saison: number;
  vainqueur: string;
  finaliste?: string;
}
