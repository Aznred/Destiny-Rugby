// 🎖️ LES RESPONSABILITÉS — le joueur ne fait pas que courir : il décide, il tape, il lance. (Correctif 17)
//
// Demande : « si notre joueur devient capitaine, buteur, lanceur en touche ou joueur chargé des
// engagements, il faut réellement lui donner ces responsabilités pendant les matchs. »
//
// ═══ CE QUI A ÉTÉ TRANCHÉ AVANT D'ÉCRIRE UNE LIGNE ═══════════════════════════
//
// 1. ⚠️ TOUT EST DERRIÈRE `e.responsabilites`. Absent, le moteur rejoue à l'identique (matchs de
//    ligue, manager, empreinte `npm run mesure:empreinte`) : aucune des fonctions d'ici n'est
//    appelée, aucun tirage supplémentaire n'est consommé.
// 2. ⚠️ UN RÔLE SE TIENT PAR UN JOUEUR, PAS PAR UN MAILLOT. On le désigne par `sourceId` (comme le
//    capitaine et le buteur de la composition manager) ; celui qui sort, se blesse ou prend un
//    carton ne le tient plus, et la CHAÎNE DE REPLI prend le relais — vice-capitaine, buteur
//    secondaire, lanceur secondaire, puis le meilleur disponible. Un remplaçant n'hérite de rien :
//    il faut avoir été désigné pour tenir un rôle.
// 3. ⚠️ AUCUNE DÉCISION AU HASARD. Le capitaine que le joueur ne tient pas choisit (poteaux, touche,
//    mêlée, jeu rapide) d'après le score, la minute, la distance, la qualité du buteur, le vent,
//    la mêlée et la défense d'en face : même situation, même choix, et il dit pourquoi.
// 4. ⚠️ LE JOUEUR NE DÉCIDE JAMAIS À LA PLACE DU MOTEUR : il choisit, le moteur exécute avec ses
//    règles (`choisirPenalite`, `lancerTrajectoireTir`, `lancerVol`, `phaseTouche`). Une tentative
//    qui se joue à la main passe par la géométrie du vol, pas par un tirage.
// 5. ⚠️ CE FICHIER NE CONNAÎT PAS `moteur.ts` — c'est l'inverse (voir `direct.ts`). Il déclare, il
//    résout, il juge ; ce que le moteur sait calculer (la chance d'un tir) lui est passé.

import type { EtatMatch } from './etat.js';
import type { Pion } from './entites.js';
import { lireLaDefense, situer, type Posture } from './ia/lecture.js';
import type { ViseeEngagement } from './tirHumain.js';
import { AXE, adverse, type Cote, type Vec } from './terrain.js';

// ---------------------------------------------------------------------------
// LES RÔLES
// ---------------------------------------------------------------------------

export type RoleEquipe =
  | 'capitaine' | 'viceCapitaine' | 'buteur' | 'buteur2' | 'engagement' | 'droppeur' | 'lanceur' | 'lanceur2';

export const ROLES_EQUIPE: readonly RoleEquipe[] = [
  'capitaine', 'viceCapitaine', 'buteur', 'buteur2', 'engagement', 'droppeur', 'lanceur', 'lanceur2',
];

/** Qui tient quoi, par identifiant stable de l'effectif (`sourceId`). */
export type RolesEquipe = Partial<Record<RoleEquipe, string>>;

export interface OptionsResponsabilites {
  /** Ce que la composition impose, équipe par équipe ; le reste est attribué automatiquement. */
  A?: RolesEquipe;
  B?: RolesEquipe;
  /** Les rôles que tient le joueur incarné (ils priment sur tout le reste). */
  avatar?: readonly RoleEquipe[];
}

// ---------------------------------------------------------------------------
// LA DÉCISION D'UN CAPITAINE
// ---------------------------------------------------------------------------

export type ChoixPenalite = 'points' | 'touche' | 'melee' | 'rapide';

/** Pourquoi un capitaine a choisi : la clé du texte (`rv.raison.*`). */
export type RaisonPenalite =
  | 'egaliser' | 'passerDevant' | 'seMettreALAbri' | 'allongerLAvance' | 'chercherLEssai'
  | 'vaincreLaMontre' | 'tropLoin' | 'buteurSur' | 'buteurHesitant' | 'meleeDominante'
  | 'defenseDesorganisee' | 'consignePoints' | 'consigneTouche' | 'gagnerDuTerrain' | 'tenirLeBallon'
  | 'choixDuJoueur';

export interface DecisionCapitaine { choix: ChoixPenalite; raison: RaisonPenalite }

/** Ce que le moteur sait de la pénalité, et que ce fichier ne peut pas recalculer. */
export interface ContextePenalite {
  cote: Cote;
  lieu: Vec;
  /** Mètres jusqu'à la ligne d'essai adverse. */
  distance: number;
  /** Écart à l'axe des poteaux, en mètres. */
  angle: number;
  /** La chance du buteur sur CE tir (vent, pluie, fraîcheur compris). */
  chance: number;
  /** Il y a quelqu'un pour tirer. */
  buteurPresent: boolean;
  /** La consigne de l'entraîneur pour les pénalités. */
  consigne: 'points' | 'touche' | 'mixte';
  /** Le rideau d'en face, au coup de sifflet : défenseurs en place, retardataires. */
  defense?: { rideau: number; retardataires: number };
}

/** Le tir est-il à portée d'un buteur ? (comme `aPortee` de la phase de pénalité) */
export const tirAPortee = (c: Pick<ContextePenalite, 'distance' | 'angle'>) => c.distance < 50 && c.angle < 26;

/**
 * L'avantage de la mêlée, en points de `puissance` : la moyenne de ses avants en jeu moins celle de
 * l'adversaire, et quatre points par homme de moins (un carton jaune se paie en mêlée).
 */
export function avantageDeMelee(e: Pick<EtatMatch, 'pions'>, cote: Cote): number {
  const stat = (c: Cote) => {
    const avants = e.pions.filter((p) => p.cote === c && p.avant && p.surLeTerrain && p.sanction <= 0);
    return { n: avants.length, m: avants.length ? avants.reduce((s, p) => s + p.puissance, 0) / avants.length : 0 };
  };
  const a = stat(cote), b = stat(adverse(cote));
  return a.m - b.m + (a.n - b.n) * 4;
}

/** La défense d'en face au coup de sifflet : combien sont en place, combien traînent. */
export function defenseAuSifflet(e: EtatMatch, cote: Cote, lieu: Vec): { rideau: number; retardataires: number } {
  const l = lireLaDefense(e, cote, lieu);
  return { rideau: l.rideau, retardataires: l.retardataires };
}

/**
 * LE CHOIX D'UN CAPITAINE APRÈS UNE PÉNALITÉ.
 *
 * ⚠️ DÉTERMINISTE, ET LISIBLE. L'ordre des raisons est celui d'un capitaine de rugby : d'abord ce que
 * dit le tableau d'affichage en fin de match (le seul moment où la minute commande), puis la
 * mêlée et la défense qui offrent une occasion, puis les chances du buteur. La consigne de
 * l'entraîneur donne la pente, et la fin de match la renverse.
 *
 * Exemples du cahier des charges, qui sont des tests : mené 20-18 à la 78ᵉ à trente-cinq mètres,
 * on prend les poteaux ; mené 24-18 à la 75ᵉ, on va en touche ; mêlée dominante près de la
 * ligne, on choisit la mêlée ; défense désorganisée, on joue vite.
 */
export function decisionDuCapitaine(e: EtatMatch, c: ContextePenalite): DecisionCapitaine {
  const S = situer(e, c.cote, c.lieu);
  const portee = tirAPortee(c) && c.buteurPresent;
  const diff = S.diff;
  const finDeMatch = e.sirene || S.restantes <= 8;
  const tropLoin: DecisionCapitaine = { choix: 'touche', raison: 'tropLoin' };
  const melee = avantageDeMelee(e, c.cote);
  const defense = c.defense;
  // Une défense qui n'est pas là : peu de monde dans le premier rideau, ou des hommes au sol.
  const desorganisee = !!defense && (defense.retardataires >= 3 || defense.rideau <= 3);

  // ── 1. La fin de match : la minute et le score commandent ────────────────
  if (finDeMatch) {
    if (diff > 0) {
      // On mène : on prend les points qui font basculer l'écart, sinon on tue le ballon en touche.
      if (portee && c.chance >= 0.55 && diff <= 4) return { choix: 'points', raison: 'seMettreALAbri' };
      if (portee && c.chance >= 0.7 && diff <= 7) return { choix: 'points', raison: 'allongerLAvance' };
      return { choix: 'touche', raison: 'vaincreLaMontre' };
    }
    if (diff >= -3) {
      // Trois points suffisent pour égaliser ou passer devant.
      if (portee && c.chance >= 0.3) return { choix: 'points', raison: diff === 0 ? 'passerDevant' : diff === -3 ? 'egaliser' : 'passerDevant' };
      if (desorganisee && c.distance < 35) return { choix: 'rapide', raison: 'defenseDesorganisee' };
      return { choix: 'touche', raison: portee ? 'buteurHesitant' : 'tropLoin' };
    }
    // Il faut un essai : on va chercher le ballon porté, la mêlée si elle écrase, le jeu vite si elle dort.
    if (desorganisee && c.distance < 40) return { choix: 'rapide', raison: 'defenseDesorganisee' };
    if (melee >= 5 && c.distance <= 28) return { choix: 'melee', raison: 'meleeDominante' };
    return { choix: 'touche', raison: 'chercherLEssai' };
  }

  // ── 2. Hors fin de match : une occasion se saisit ───────────────────────
  // Une défense désorganisée se punit tout de suite, sauf si les poteaux sont tout proches et sûrs.
  if (desorganisee && c.distance < 38 && !(portee && c.chance >= 0.85 && c.distance > 20)) {
    return { choix: 'rapide', raison: 'defenseDesorganisee' };
  }
  // Une mêlée qui écrase, à portée d'essai : on s'y met plutôt que d'aller aux poteaux.
  if (melee >= 5 && c.distance <= 28 && c.chance < 0.9) return { choix: 'melee', raison: 'meleeDominante' };
  if (c.consigne === 'points') {
    if (portee) return { choix: 'points', raison: 'consignePoints' };
    return tropLoin;
  }
  if (c.consigne === 'touche') {
    return c.distance <= 7 ? { choix: 'melee', raison: 'consigneTouche' } : { choix: 'touche', raison: 'consigneTouche' };
  }
  // Mixte : le buteur fait la décision. Sûr, on prend les points ; douteux, on gagne du terrain.
  if (portee) {
    const exigence = postureExigeante(S.posture) ? 0.55 : 0.5;
    if (c.chance >= 0.8 && c.distance > 15) return { choix: 'points', raison: 'buteurSur' };
    if (c.chance >= exigence + (c.distance < 20 ? 0.05 : 0)) return { choix: 'points', raison: 'buteurSur' };
    if (c.chance >= 0.4 && S.posture === 'prudent') return { choix: 'points', raison: 'buteurSur' };
    return { choix: 'touche', raison: 'buteurHesitant' };
  }
  if (c.distance <= 7) return { choix: 'melee', raison: 'tenirLeBallon' };
  return { choix: 'touche', raison: 'gagnerDuTerrain' };
}

const postureExigeante = (p: Posture): boolean => p === 'urgence' || p === 'troisPoints';

// ---------------------------------------------------------------------------
// L'ÉTAT
// ---------------------------------------------------------------------------

/** Ce que la note du match et le tutoriel retiennent des responsabilités. */
export interface StatsResponsabilites {
  /** Décisions de capitaine prises à la main, et celles qui allaient dans le sens du capitaine IA. */
  decisions: number;
  decisionsConformes: number;
  /** Points rapportés par une décision prise à la main (poteaux, touche gagnée, essai qui suit…). */
  tirs: number;
  tirsReussis: number;
  transformations: number;
  transformationsReussies: number;
  drops: number;
  dropsReussis: number;
  engagements: number;
  engagementsReussis: number;
  touches: number;
  touchesGagnees: number;
  toucheRapides: number;
  /** Une tentative laissée filer au chrono : l'IA a joué à sa place. */
  chronosDepasses: number;
}

export function statsResponsabilitesVides(): StatsResponsabilites {
  return {
    decisions: 0, decisionsConformes: 0, tirs: 0, tirsReussis: 0, transformations: 0, transformationsReussies: 0,
    drops: 0, dropsReussis: 0, engagements: 0, engagementsReussis: 0, touches: 0, touchesGagnees: 0,
    toucheRapides: 0, chronosDepasses: 0,
  };
}

/** Ce que le jeu attend du joueur à cet instant (l'écran l'affiche, le moteur patiente). */
export type TypeAttente = 'penalite' | 'tir' | 'engagement' | 'touche' | 'toucheRapide';

export interface AttenteHumaine {
  type: TypeAttente;
  /** Instant simulé du début, et durée accordée avant que l'IA ne tranche (secondes simulées). */
  depuis: number;
  delai: number;
  /** Pénalité : ce que ferait le capitaine IA, les chances du buteur, le lieu. */
  suggestion?: DecisionCapitaine;
  distance?: number;
  angle?: number;
  chance?: number;
  /** Le tir ou le coup d'envoi : qui tape, pour que l'écran le dise, et la valeur (2 : transformation, 3 : pénalité, 0 : engagement). */
  valeur?: number;
  /** Touche : les combinaisons jouables, et celle que l'IA aurait annoncée. */
  combinaisons?: CombinaisonTouche[];
  annoncee?: CombinaisonTouche;
  /**
   * Touche : l'alignement est formé, le lancer peut partir. Le chrono ne court qu'à partir de là — la marche des packs ne mange pas
   * le temps de décider.
   */
  pret?: boolean;
  /** Engagement : la portée du botteur à pleine force (m). */
  portee?: number;
}

/** Le lancer du joueur : la force dosée (la longueur du lancer) et la régularité de son geste. */
export interface LancerTouche { puissance: number; geste: number }

/** Une touche jouée vite que le joueur peut demander, tant que la situation le permet. */
export interface OffreToucheRapide {
  /** Jusqu'à quand elle se propose (instant simulé). */
  jusqua: number;
  /** Elle est jouable à cet instant (le bouton est grisé sinon). */
  possible: boolean;
  receveurId?: string;
}

/**
 * La force qu'il faut à chaque lancer, de 0 à 1 : devant, le ballon est court ; au fond, il est long — et c'est celui
 * qu'on rate. ⚠️ Le HUD ne montre jamais cette cible : il montre le saut, le joueur apprend la longueur.
 */
export const PUISSANCE_TOUCHE: Record<CombinaisonTouche, number> = {
  avant: 0.34, milieu: 0.55, fond: 0.78, maul: 0.34, leurreAvant: 0.78, leurreMilieu: 0.55, sortieRapide: 0.7,
};

export interface QualiteLancer {
  /** Points de « note de lancer » ajoutés ou retirés (de −34 à +14). */
  delta: number;
  /** Multiplicateurs de la chance de lancer pas droit / de mauvaise longueur. */
  pasDroit: number;
  longueur: number;
}

/**
 * Ce que vaut le lancer du joueur, d'après la combinaison annoncée, la force dosée et la régularité du geste.
 *
 * ⚠️ CORRECTIF 23 : avec `lanceur` (le pion qui lance), la précision dépend AUSSI de lui — qualité de passe et de lecture,
 * fatigue, pression du moment, et distance du lancer (le fond est plus loin que le premier bloc). Le joueur choisit la cible,
 * mais même visé parfaitement, un lancer au fond peut finir un peu court ou un peu long : jamais de résultat garanti.
 * Sans `lanceur`, la loi d'origine (Correctif 17).
 */
export function qualiteDuLancer(
  choix: CombinaisonTouche, l: LancerTouche, lanceur?: Pick<Pion, 'passe' | 'vision' | 'discipline' | 'endurance'>, pression = 0,
): QualiteLancer {
  const erreur = Math.abs(Math.max(0, Math.min(1, l.puissance)) - PUISSANCE_TOUCHE[choix]);
  const flou = 1 - Math.max(0, Math.min(1, l.geste));
  if (!lanceur) {
    return {
      delta: 14 - erreur * 70 - flou * 20,
      pasDroit: 1 + 1.5 * flou,
      longueur: 1 + 5 * Math.max(0, erreur - 0.1),
    };
  }
  const talent = lanceur.passe * 0.55 + lanceur.vision * 0.3 + lanceur.discipline * 0.15;
  const fatigue = Math.max(0, 1 - lanceur.endurance / 100);
  // Plus on vise loin, plus le lancer est exigeant : le fond (0,78) pèse près de deux fois le premier bloc (0,34).
  const distance = 0.8 + PUISSANCE_TOUCHE[choix] * 0.55;
  // Un bruit propre au joueur et à la situation, jamais tiré : talent faible, fatigue, pression et distance l'élargissent.
  const bruit = Math.max(0, (68 - talent) / 420) + fatigue * 0.07 + pression * 0.05 + (distance - 1) * 0.04;
  const e2 = erreur + bruit;
  return {
    delta: 14 - e2 * 70 - flou * 20 + (talent - 60) / 9,
    pasDroit: (1 + 1.5 * flou) * (1 + pression * 0.25 + fatigue * 0.3),
    longueur: (1 + 5 * Math.max(0, e2 - 0.1)) * distance,
  };
}

export type CombinaisonTouche = 'avant' | 'milieu' | 'fond' | 'maul' | 'leurreAvant' | 'leurreMilieu' | 'sortieRapide';

export const COMBINAISONS_TOUCHE: readonly CombinaisonTouche[] = [
  'avant', 'milieu', 'fond', 'maul', 'leurreAvant', 'leurreMilieu', 'sortieRapide',
];

export interface EtatResponsabilites {
  roles: Record<Cote, RolesEquipe>;
  /** Les rôles tenus par le joueur incarné. */
  avatar: readonly RoleEquipe[];
  attente: AttenteHumaine | null;
  /** La dernière décision d'un capitaine IA, pour l'écran et les bancs. */
  derniere: { cote: Cote; decision: DecisionCapitaine; humain: boolean; t: number } | null;
  /** Ce que le joueur a demandé pour son coup d'envoi, en attendant que la phase le joue. */
  engagement: ViseeEngagement | null;
  /** La touche que lance le joueur : la combinaison annoncée, puis le lancer. */
  touche: { choix?: CombinaisonTouche; lancer?: LancerTouche } | null;
  /** La touche rapide qu'il peut demander, tant que c'est permis. */
  offreToucheRapide: OffreToucheRapide | null;
  stats: StatsResponsabilites;
}

// ---------------------------------------------------------------------------
// L'ATTRIBUTION : qui tient quoi
// ---------------------------------------------------------------------------

/** Le meneur d'hommes : discipline et lecture du jeu, les numéros d'autorité en tête. */
function noteDeMeneur(p: Pion): number {
  const autorite = [8, 9, 10, 2, 4, 5, 6, 7, 12, 13, 15].indexOf(p.numero);
  return p.discipline * 0.5 + p.vision * 0.3 + (autorite < 0 ? 0 : (11 - autorite) * 0.35);
}

/** Les titulaires d'une équipe, du plus fort au moins fort selon `note`. */
const titulaires = (pions: readonly Pion[], cote: Cote): Pion[] =>
  pions.filter((p) => p.cote === cote && p.numero <= 15);

/**
 * Les rôles d'une équipe : ce qu'on lui impose d'abord, le reste attribué d'après les joueurs. Le
 * même effectif donne toujours les mêmes rôles.
 */
export function attribuerLesRoles(pions: readonly Pion[], cote: Cote, imposes: RolesEquipe = {}, exclu?: string): RolesEquipe {
  const roles: RolesEquipe = {};
  const effectif = titulaires(pions, cote);
  const pris = (id: string | undefined) => !!id && Object.values(roles).includes(id);
  const valide = (id: string | undefined) => !!id && pions.some((p) => p.cote === cote && p.sourceId === id);
  for (const r of ROLES_EQUIPE) if (valide(imposes[r])) roles[r] = imposes[r];

  // ⚠️ L'IA N'ATTRIBUE JAMAIS AU JOUEUR CE QU'IL N'A PAS GAGNÉ : `exclu` (son identifiant) ne sort d'un choix automatique que
  // si personne d'autre n'est disponible. Meilleur buteur du groupe ou pas, il ne reçoit pas les tirs et les engagements de lui-même.
  const classer = (tri: (a: Pion, b: Pion) => number, liste: Pion[]) => [...liste].sort((a, b) => tri(a, b) || a.numero - b.numero)[0];
  const choisir = (tri: (a: Pion, b: Pion) => number, ecarter: (p: Pion) => boolean = () => false): string | undefined => {
    const possibles = effectif.filter((p) => !ecarter(p));
    return (classer(tri, possibles.filter((p) => p.sourceId !== exclu)) ?? classer(tri, possibles))?.sourceId;
  };
  const choisirParmi = (tri: (a: Pion, b: Pion) => number, garde: (p: Pion) => boolean): string | undefined => {
    const possibles = effectif.filter(garde);
    return (classer(tri, possibles.filter((p) => p.sourceId !== exclu)) ?? classer(tri, possibles))?.sourceId;
  };
  const parMeneur = (a: Pion, b: Pion) => noteDeMeneur(b) - noteDeMeneur(a);
  const parPied = (a: Pion, b: Pion) => b.pied - a.pied;
  const parPasse = (a: Pion, b: Pion) => b.passe - a.passe;
  const sansRole = (p: Pion) => pris(p.sourceId);

  // Un joueur tient un rôle de chaque famille, sauf quand l'effectif n'a pas le choix.
  roles.capitaine ??= choisir(parMeneur);
  roles.viceCapitaine ??= choisir(parMeneur, sansRole) ?? choisir(parMeneur, (p) => p.sourceId === roles.capitaine);
  roles.buteur ??= choisir(parPied, (p) => p.numero <= 3);
  const butsPris = (p: Pion) => p.sourceId === roles.buteur || p.numero <= 3;
  roles.buteur2 ??= choisir(parPied, butsPris);
  // L'engagement : le buteur s'il est derrière, sinon l'ouvreur ou l'arrière qui tape le mieux.
  const butApres = effectif.find((p) => p.sourceId === roles.buteur);
  roles.engagement ??= butApres && !butApres.avant && butApres.sourceId !== exclu ? butApres.sourceId
    : choisirParmi(parPied, (p) => [10, 15, 9].includes(p.numero));
  // Le droppeur : le numéro 10, à moins qu'un autre tape nettement mieux.
  const candidats = effectif.filter((p) => [10, 9, 12, 15].includes(p.numero) && p.sourceId !== exclu);
  const dix = candidats.find((p) => p.numero === 10);
  const meilleurPied = classer(parPied, candidats);
  roles.droppeur ??= (dix && meilleurPied && meilleurPied.pied - dix.pied >= 8 ? meilleurPied : dix ?? meilleurPied)?.sourceId
    ?? choisirParmi(parPied, (p) => [10, 9, 12, 15].includes(p.numero));
  // La touche : le talonneur lance ; un troisième ligne le remplace.
  const talonneur = effectif.find((p) => p.numero === 2 && p.sourceId !== exclu);
  roles.lanceur ??= talonneur?.sourceId ?? choisir(parPasse, (p) => !p.avant)
    ?? effectif.find((p) => p.numero === 2)?.sourceId;
  roles.lanceur2 ??= choisirParmi(parPasse, (p) => [6, 7, 8].includes(p.numero) && p.sourceId !== roles.lanceur)
    ?? choisir(parPasse, (p) => !p.avant || p.sourceId === roles.lanceur);
  return roles;
}

export function creerResponsabilites(pions: readonly Pion[], options: OptionsResponsabilites): EtatResponsabilites {
  const avatar = options.avatar ?? [];
  const moi = pions.find((p) => p.moi);
  const fusion = (cote: Cote): RolesEquipe => {
    const imposes: RolesEquipe = { ...(cote === 'A' ? options.A : options.B) };
    // Ce que tient le joueur incarné prime sur la composition : un rôle ne se tient qu'une fois.
    if (moi && moi.cote === cote) for (const r of avatar) imposes[r] = moi.sourceId;
    // Un même joueur ne tient pas un rôle ET son suppléant : le second serait inutile.
    for (const [principal, suppleant] of [['capitaine', 'viceCapitaine'], ['buteur', 'buteur2'], ['lanceur', 'lanceur2']] as const) {
      if (imposes[principal] && imposes[principal] === imposes[suppleant]) delete imposes[suppleant];
    }
    return attribuerLesRoles(pions, cote, imposes, moi && moi.cote === cote ? moi.sourceId : undefined);
  };
  return {
    roles: { A: fusion('A'), B: fusion('B') }, avatar, attente: null, derniere: null, engagement: null, touche: null, offreToucheRapide: null,
    stats: statsResponsabilitesVides(),
  };
}

// ---------------------------------------------------------------------------
// LA RÉSOLUTION : qui tient le rôle MAINTENANT
// ---------------------------------------------------------------------------

const disponible = (p: Pion | undefined): p is Pion => !!p && p.surLeTerrain && p.sanction <= 0;

/**
 * Qui tient ce rôle en ce moment, avec la chaîne de repli. ⚠️ Le titulaire désigné d'abord, puis le
 * suivant de sa famille (vice-capitaine, buteur secondaire…), puis le meilleur de ceux qui sont là.
 */
export function pionDuRole(e: Pick<EtatMatch, 'pions' | 'responsabilites'>, cote: Cote, role: RoleEquipe): Pion | undefined {
  const r = e.responsabilites;
  if (!r) return undefined;
  const roles = r.roles[cote];
  const par = (id: string | undefined) => {
    const p = id ? e.pions.find((q) => q.cote === cote && q.sourceId === id) : undefined;
    return disponible(p) ? p : undefined;
  };
  const la = e.pions.filter((p) => p.cote === cote && disponible(p));
  const dernier = (tri: (a: Pion, b: Pion) => number, garde: (p: Pion) => boolean = () => true) =>
    [...la].filter(garde).sort((a, b) => tri(a, b) || a.numero - b.numero)[0];
  const parPied = (a: Pion, b: Pion) => b.pied - a.pied;
  switch (role) {
    case 'capitaine':
      return par(roles.capitaine) ?? par(roles.viceCapitaine) ?? dernier((a, b) => noteDeMeneur(b) - noteDeMeneur(a));
    case 'viceCapitaine':
      return par(roles.viceCapitaine) ?? par(roles.capitaine) ?? dernier((a, b) => noteDeMeneur(b) - noteDeMeneur(a));
    case 'buteur':
      return par(roles.buteur) ?? par(roles.buteur2) ?? dernier(parPied);
    case 'buteur2':
      return par(roles.buteur2) ?? par(roles.buteur) ?? dernier(parPied);
    case 'engagement':
      return par(roles.engagement) ?? par(roles.buteur) ?? par(roles.buteur2)
        ?? la.find((p) => p.numero === 10) ?? dernier(parPied, (p) => !p.avant);
    case 'droppeur':
      return par(roles.droppeur) ?? la.find((p) => p.numero === 10) ?? par(roles.buteur) ?? dernier(parPied, (p) => !p.avant);
    case 'lanceur':
      return par(roles.lanceur) ?? par(roles.lanceur2) ?? la.find((p) => p.numero === 2)
        ?? dernier((a, b) => b.passe - a.passe, (p) => p.avant);
    case 'lanceur2':
      return par(roles.lanceur2) ?? par(roles.lanceur) ?? la.find((p) => p.numero === 2)
        ?? dernier((a, b) => b.passe - a.passe, (p) => p.avant);
  }
}

/** Le joueur incarné, seulement s'il est sous contrôle direct. */
function humain(e: Pick<EtatMatch, 'pions' | 'direct'>): Pion | undefined {
  if (!e.direct?.actif) return undefined;
  return e.pions.find((p) => p.moi);
}

/** Le joueur tient-il ce rôle, maintenant, pour son équipe ? (jamais vrai sans contrôle direct) */
export function humainTientLe(e: Pick<EtatMatch, 'pions' | 'direct' | 'responsabilites'>, role: RoleEquipe, cote?: Cote): boolean {
  if (!e.responsabilites) return false;
  const moi = humain(e);
  if (!moi || !disponible(moi) || (cote && moi.cote !== cote)) return false;
  return pionDuRole(e, moi.cote, role) === moi;
}

/** Les rôles désignés pour un pion (pour l'écran : « C », « VC », « Buteur »…), tenus ou non. */
export function rolesDuPion(e: Pick<EtatMatch, 'responsabilites'>, p: Pick<Pion, 'cote' | 'sourceId'>): RoleEquipe[] {
  const roles = e.responsabilites?.roles[p.cote];
  if (!roles) return [];
  return ROLES_EQUIPE.filter((r) => roles[r] === p.sourceId);
}

/** Les rôles qu'un pion tient EFFECTIVEMENT en ce moment (repli compris) : ce que lit le HUD. */
export function rolesEffectifs(e: Pick<EtatMatch, 'pions' | 'responsabilites'>, p: Pion): RoleEquipe[] {
  if (!e.responsabilites) return [];
  return ROLES_EQUIPE.filter((r) => pionDuRole(e, p.cote, r) === p);
}

/**
 * Remet à jour les drapeaux que le reste du moteur lit (`capitaine` : l'arbitre l'appelle, `buteur` :
 * les phases de tir) d'après qui tient le rôle MAINTENANT. À appeler à chaque pas, hors tir en cours.
 */
export function synchroniserLesRoles(e: EtatMatch): void {
  if (!e.responsabilites || e.tir) return;
  for (const cote of ['A', 'B'] as Cote[]) {
    const capitaine = pionDuRole(e, cote, 'capitaine');
    const buteur = pionDuRole(e, cote, 'buteur');
    for (const p of e.pions) {
      if (p.cote !== cote) continue;
      p.capitaine = p === capitaine;
      p.buteur = p === buteur;
    }
  }
}

/** La pénalité vue par le capitaine : tout ce qu'il faut pour trancher, sans jamais tirer au sort. */
export function contextePenalite(
  e: EtatMatch, cote: Cote, lieu: Vec, mesures: { distance: number; angle: number; chance: number },
): ContextePenalite {
  const buteur = pionDuRole(e, cote, 'buteur');
  return {
    cote, lieu, ...mesures, buteurPresent: !!buteur,
    consigne: e.tactiques[cote]?.penalites ?? 'mixte',
    defense: e.penalite?.defense,
  };
}

export const ecartALAxe = (y: number): number => Math.abs(y - AXE);
