// ═══════════════════════════════════════════════════════════════════════════
// L'IDENTITÉ D'UN CLUB, ET SES RIVALITÉS — ce qui met des années à changer
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « créer plusieurs valeurs persistantes de 0 à 100 […] ces valeurs
// évoluent lentement selon les décisions prises pendant plusieurs saisons »,
// et : « une identité doit demander plusieurs années pour réellement changer ».
//
// ⚠️ « LENTEMENT » EST LA SPÉCIFICATION, PAS UN DÉTAIL DE RÉGLAGE. Une identité
// qui suivrait la saison en cours ne serait qu'une deuxième écriture des
// résultats : elle ne dirait rien que le classement ne dit déjà. Ce qui la rend
// intéressante, c'est qu'elle RÉSISTE — un club formateur reste un club
// formateur deux ou trois ans après qu'on a cessé de former, et le président
// vous le rappelle. Le banc d'essai refuse qu'une valeur bouge de plus de
// quelques points en une saison, et vérifie qu'il faut une décennie pour
// retourner un club.

import { competitionDuClub } from '../data/clubs.js';
import { graine } from './championnat.js';

export type AxeIdentite =
  | 'formation' | 'offensif' | 'defensif' | 'joueursLocaux' | 'international'
  | 'stars' | 'discipline' | 'fidelite' | 'stabilite' | 'ambition';

export const AXES_IDENTITE: AxeIdentite[] = [
  'formation', 'offensif', 'defensif', 'joueursLocaux', 'international',
  'stars', 'discipline', 'fidelite', 'stabilite', 'ambition',
];

export type Identite = Record<AxeIdentite, number>;

/**
 * L'IDENTITÉ HISTORIQUE D'UN CLUB — celle qu'il a avant qu'on y touche.
 *
 * ⚠️ ELLE EST DÉTERMINISTE ET CORRÉLÉE À L'ÉTAGE, mais pas dictée par lui. Un
 * club de Fédérale peut être un club formateur reconnu ; un club de Top 14 peut
 * être un club à stars sans école de rugby. C'est ce qui fait qu'on rencontre
 * des maisons différentes en montant, au lieu de dix versions du même club.
 *
 * ⚠️ ET LES AXES S'OPPOSENT DEUX À DEUX. « joueursLocaux » et « international »
 * ne peuvent pas être hauts ensemble, « stars » et « formation » non plus : un
 * club qui achète des vedettes ne fait pas jouer ses jeunes. Sans cette tension,
 * un club aurait dix valeurs à 80 et l'identité ne voudrait plus rien dire.
 */
export function identiteHistorique(club: string): Identite {
  const niveau = competitionDuClub(club)?.niveau ?? 8;
  const rng = graine(`identite#${club}`);
  const b = (centre: number, etendue: number) => Math.max(2, Math.min(98,
    Math.round(centre + (rng() * 2 - 1) * etendue)));

  // Les moyens du club orientent, sans décider.
  const richesse = Math.max(0, 1 - niveau / 10);
  const formation = b(46 + rng() * 34, 16);
  const stars = b(18 + richesse * 52 - formation * 0.22, 15);
  const joueursLocaux = b(84 - richesse * 40 - stars * 0.28, 14);
  const offensif = b(50, 26);

  return {
    formation,
    offensif,
    // ⚠️ Défensif n'est PAS l'inverse d'offensif : une équipe peut être bonne
    // ou mauvaise dans les deux. C'est un style, pas un curseur unique.
    defensif: b(100 - offensif * 0.55, 22),
    joueursLocaux,
    international: b(96 - joueursLocaux, 12),
    stars,
    discipline: b(52, 24),
    fidelite: b(40 + formation * 0.35, 18),
    stabilite: b(50 + richesse * 12, 22),
    ambition: b(34 + richesse * 44, 18),
  };
}

/** Ce que le club a fait cette saison, et qui déplace son identité. */
export interface DecisionsDeSaison {
  /** Part des minutes jouées par des joueurs du centre, 0-1. */
  partJeunesFormes: number;
  /** Part de l'effectif recruté à moins de 120 km, 0-1. */
  partLocaux: number;
  /** Part de l'effectif recruté à l'étranger, 0-1. */
  partEtrangers: number;
  /** Nombre de joueurs payés plus du double du salaire typique de l'étage. */
  grosSalaires: number;
  /** Essais marqués et encaissés par match. */
  essaisMarques: number;
  essaisEncaisses: number;
  cartons: number;
  /** Nombre de départs subis dans l'effectif. */
  departs: number;
  /** Le manager a-t-il changé cette saison ? */
  changementDEntraineur: boolean;
  /** 0 = champion, 1 = dernier. */
  positionRelative: number;
  /** Niveaux d'installations du centre de formation, 0-4. */
  investissementFormation: number;
}

/**
 * LA VITESSE MAXIMALE D'UN AXE, EN POINTS PAR SAISON.
 *
 * ⚠️ C'EST LE RÉGLAGE CENTRAL DU FICHIER. À 3 points par saison, il faut une
 * DÉCENNIE pour faire passer un club de 30 à 60 : c'est exactement ce que la
 * demande veut (« plusieurs années pour réellement changer »), et c'est ce qui
 * donne du poids aux décisions anciennes. Le monter à dix ferait de l'identité
 * un curseur qu'on repositionne à volonté, donc une information sans mémoire.
 */
export const VITESSE_IDENTITE = 3;

export function apresLaSaison(id: Identite, d: DecisionsDeSaison): Identite {
  const vers = (actuel: number, cible: number, force = 1): number => {
    const pas = Math.max(-VITESSE_IDENTITE, Math.min(VITESSE_IDENTITE, (cible - actuel) * 0.18 * force));
    return Math.max(2, Math.min(98, Math.round((actuel + pas) * 10) / 10));
  };

  const totalRecrues = Math.max(0.01, d.partLocaux + d.partEtrangers);
  return {
    formation: vers(id.formation, d.partJeunesFormes * 100 * 0.6 + d.investissementFormation * 10),
    offensif: vers(id.offensif, Math.min(100, d.essaisMarques * 22)),
    defensif: vers(id.defensif, Math.max(0, 100 - d.essaisEncaisses * 20)),
    joueursLocaux: vers(id.joueursLocaux, (d.partLocaux / totalRecrues) * 100),
    international: vers(id.international, (d.partEtrangers / totalRecrues) * 100),
    stars: vers(id.stars, Math.min(100, d.grosSalaires * 16)),
    discipline: vers(id.discipline, Math.max(0, 100 - d.cartons * 9)),
    fidelite: vers(id.fidelite, Math.max(0, 100 - d.departs * 11)),
    // ⚠️ LA STABILITÉ TOMBE VITE ET REMONTE LENTEMENT. Changer d'entraîneur se
    // paie tout de suite ; se refaire une réputation de maison calme prend des
    // années. C'est la seule asymétrie du fichier, et elle est voulue.
    stabilite: d.changementDEntraineur
      ? Math.max(2, id.stabilite - 9)
      : vers(id.stabilite, 88, 0.6),
    ambition: vers(id.ambition, Math.max(0, 100 - d.positionRelative * 100)),
  };
}

/** Le libellé d'un axe dominant, pour l'écran. */
export function traitsDominants(id: Identite, combien = 3): AxeIdentite[] {
  return AXES_IDENTITE.slice().sort((a, b) => id[b] - id[a]).slice(0, combien);
}

/**
 * CE QUE L'IDENTITÉ ATTEND D'UN RECRUTEMENT.
 *
 * Demande : « l'identité influence les attentes des supporters, le recrutement,
 * les jeunes, la direction, le choix des futurs entraîneurs ». Voilà le premier
 * de ces effets, et il est chiffré : un club à 90 de « joueurs locaux » qui
 * signe un Sud-Africain de 32 ans à gros salaire fait grincer des dents.
 */
export function accordAvecLIdentite(
  id: Identite,
  recrue: { age: number; etranger: boolean; local: boolean; grosSalaire: boolean; duCentre: boolean },
): { accord: number; reproches: AxeIdentite[] } {
  let accord = 50;
  const reproches: AxeIdentite[] = [];
  if (recrue.duCentre) accord += id.formation * 0.30;
  else if (recrue.age <= 22) accord += id.formation * 0.14;
  if (recrue.local) accord += id.joueursLocaux * 0.24;
  else if (recrue.etranger) {
    accord += id.international * 0.20 - id.joueursLocaux * 0.22;
    if (id.joueursLocaux >= 70) reproches.push('joueursLocaux');
  }
  if (recrue.grosSalaire) {
    accord += id.stars * 0.22 - id.formation * 0.12;
    if (id.stars <= 30) reproches.push('stars');
  }
  return { accord: Math.max(0, Math.min(100, Math.round(accord))), reproches };
}

// ---------------------------------------------------------------------------
// LES RIVALITÉS
// ---------------------------------------------------------------------------
// « Conserver les rivalités historiques existantes. Ajouter également des
// rivalités dynamiques. […] Elle doit évoluer lentement sur plusieurs saisons. »

export interface Rivalite {
  /** Toujours rangés dans l'ordre alphabétique : une rivalité n'a pas de sens. */
  clubs: [string, string];
  intensite: number;
  /** Ce qui l'a nourrie, pour l'expliquer à l'écran. */
  causes: CauseRivalite[];
  /** La dernière saison où quelque chose s'est passé entre eux. */
  derniereSaison: number;
}

export type CauseRivalite =
  | 'proximite' | 'finale' | 'montee' | 'maintien' | 'transfert'
  | 'serieSerree' | 'incident' | 'histoire';

export const POUSSEE_PAR_CAUSE: Record<CauseRivalite, number> = {
  histoire: 0, // posée à la création, elle ne se rejoue pas
  proximite: 2,
  finale: 16,
  montee: 11,
  maintien: 9,
  transfert: 13,
  serieSerree: 5,
  incident: 8,
};

export function clePaire(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * ⚠️ LA PROXIMITÉ N'EST PAS UNE RIVALITÉ, C'EST UN TERRAIN FAVORABLE. Deux clubs
 * à quinze kilomètres partent avec de l'intensité, mais deux clubs éloignés qui
 * se disputent trois finales en cinq ans finissent par se détester aussi. Faire
 * de la distance la seule cause aurait figé la carte des rivalités le premier
 * jour — l'inverse exact de « rivalités dynamiques ».
 */
export function intensiteDeDepart(distanceKm: number, memeDivision: boolean): number {
  const parLaDistance = Math.max(0, 34 - distanceKm / 4.5);
  return Math.round(parLaDistance * (memeDivision ? 1 : 0.45));
}

/**
 * L'INTENSITÉ APRÈS UNE SAISON.
 *
 * ⚠️ ELLE RETOMBE QUAND IL NE SE PASSE RIEN. Sans érosion, toutes les paires du
 * jeu finiraient à 100 au bout de vingt saisons et le mot « rivalité » ne
 * distinguerait plus rien. Deux clubs qui ne se croisent plus se calment : c'est
 * ce qui garde la liste courte et lisible.
 */
export const EROSION_RIVALITE = 2.5;

export function apresLaSaisonRivalite(
  r: Rivalite,
  causes: CauseRivalite[],
  saison: number,
): Rivalite {
  const poussee = causes.reduce((n, c) => n + POUSSEE_PAR_CAUSE[c], 0);
  const suivante = poussee > 0
    ? Math.min(100, r.intensite + poussee)
    : Math.max(0, r.intensite - EROSION_RIVALITE);
  return {
    ...r,
    intensite: Math.round(suivante * 10) / 10,
    causes: [...new Set([...r.causes, ...causes])],
    derniereSaison: poussee > 0 ? saison : r.derniereSaison,
  };
}

export function libelleRivalite(i: number): 'aucune' | 'naissante' | 'installee' | 'brulante' {
  if (i < 20) return 'aucune';
  if (i < 45) return 'naissante';
  if (i < 72) return 'installee';
  return 'brulante';
}

/**
 * CE QU'UNE RIVALITÉ CHANGE LE JOUR DU MATCH.
 *
 * Demande : « plus elle augmente : affluence ↑, intérêt médiatique ↑,
 * pression ↑, importance pour les supporters ↑ ».
 *
 * ⚠️ LES MULTIPLICATEURS RESTENT MODESTES. Une rivalité à 100 remplit un stade
 * de 35 % de plus, elle ne double pas l'affluence : au-delà, un club vivrait de
 * deux matchs par an et toute l'économie du stade se tordrait autour d'eux.
 */
export function effetsDeLaRivalite(intensite: number): {
  affluence: number; pression: number; interetMedia: number;
} {
  const t = intensite / 100;
  return {
    affluence: 1 + t * 0.35,
    pression: 1 + t * 0.55,
    interetMedia: 1 + t * 0.9,
  };
}

/** Les rivalités d'un club, de la plus brûlante à la plus tiède. */
export function rivalitesDe(toutes: Rivalite[], club: string): Rivalite[] {
  return toutes
    .filter((r) => r.clubs.includes(club) && r.intensite >= 20)
    .sort((a, b) => b.intensite - a.intensite);
}
