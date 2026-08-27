// ═══════════════════════════════════════════════════════════════════════════
// LA FANBASE — ce qui fait qu'un club de village n'est pas Toulouse
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « je créerais surtout une vraie variable : Fanbase · Supporters
// 82 400 · Hardcore 9 200 · Réguliers 21 500 · Occasionnels 51 700. Elle évolue
// lentement. »
//
// ⚠️ C'EST LA VARIABLE CENTRALE DES TROIS BOUCLES. « Les résultats sportifs font
// grandir supporters/réputation → ça augmente billetterie/sponsors/merchandising
// → cet argent permet d'améliorer effectif et infrastructures → ce qui aide les
// résultats sportifs. » Tout ce qui rentre dans les caisses passe par ce nombre :
// il n'y a pas une deuxième source de revenus qui l'ignorerait.
//
// ⚠️ ET ELLE ÉVOLUE LENTEMENT, C'EST TOUTE SA VALEUR. « Un club de Régionale que
// tu amènes en Top 14 en dix saisons n'aurait pas instantanément 100 000
// supporters. » Une fanbase qui suivrait le niveau sportif ne serait qu'une
// deuxième écriture de la division — et la sensation d'avoir CONSTRUIT le club
// disparaîtrait, puisque tout serait acquis à la montée.

import { competitionDuClub } from '../data/clubs';
import { graine } from './championnat';
import { forceEffectif } from './effectif';

export interface Fanbase {
  /** Ceux qui viennent quoi qu'il arrive. Ils ne partent presque jamais. */
  hardcore: number;
  /** Ceux qui viennent quand l'équipe tourne. */
  reguliers: number;
  /** Ceux qui viennent pour les affiches. Les premiers à disparaître. */
  occasionnels: number;
}

export function total(f: Fanbase): number {
  return f.hardcore + f.reguliers + f.occasionnels;
}

/**
 * LA FANBASE HISTORIQUE D'UN CLUB — celle qu'il a AVANT qu'on y touche.
 *
 * ⚠️ ELLE NE SORT PAS DE SA DIVISION, ELLE SORT DE SON HISTOIRE. Un club qui
 * descend garde ses supporters une bonne partie du chemin ; c'est pour ça qu'un
 * ancien grand club de Pro D2 remplit encore son stade en Nationale. On l'ancre
 * donc sur le nom du club (déterministe) et sur son étage actuel, avec une
 * dispersion large : dans un même étage, un club peut avoir trois fois plus de
 * monde qu'un autre.
 */
const FANBASE_PAR_NIVEAU: Record<number, [number, number]> = {
  0: [30_000, 160_000], 1: [42_000, 210_000], 2: [11_000, 46_000],
  3: [3_500, 14_000], 4: [1_400, 5_500], 5: [800, 3_000],
  6: [380, 1_500], 7: [200, 800], 8: [130, 520], 9: [90, 360], 10: [60, 260],
};

const cache = new Map<string, Fanbase>();

/**
 * ⚠️ LA RÉPARTITION EN TROIS CERCLES N'EST PAS DÉCORATIVE : elle décide de la
 * SOLIDITÉ du club. Un club à forte proportion de hardcore encaisse une
 * relégation ; un club porté par les occasionnels se vide en une saison. C'est
 * ce qui distingue un club populaire d'un club à la mode, et ça change tout au
 * moment où les résultats tournent.
 */
export function fanbaseHistorique(club: string): Fanbase {
  const memo = cache.get(club);
  if (memo) return memo;
  const niveau = competitionDuClub(club)?.niveau ?? 8;
  const [bas, haut] = FANBASE_PAR_NIVEAU[niveau] ?? [60, 260];
  const rng = graine(`fanbase#${club}`);
  // Loi puissance : beaucoup de petits clubs, quelques gros. Une loi uniforme
  // aurait donné trop de clubs moyens et aucune identité.
  //
  // ⚠️ MAIS PAS TROP PENCHÉE. À l'exposant 1,7, la médiane d'un étage tombait à
  // 31 % de sa fourchette : les recettes médianes de la Fédérale 1 sortaient
  // sous le plancher de la table économique, parce que le club médian était un
  // petit club. À 1,35 la médiane monte à 39 % de la fourchette, ce qui reste
  // une pyramide sans être une punition.
  const t = rng() ** 1.35;
  const nombre = Math.round(bas + t * (haut - bas));
  // La part de noyau dur monte dans les petits clubs (on y va parce que c'est
  // le club du village) et dans les très gros (on y va depuis trois
  // générations) ; elle est la plus faible au milieu.
  const partDure = 0.10 + rng() * 0.10 + (niveau >= 7 ? 0.14 : 0);
  const partReguliers = 0.24 + rng() * 0.14;
  const f: Fanbase = {
    hardcore: Math.round(nombre * partDure),
    reguliers: Math.round(nombre * partReguliers),
    occasionnels: Math.round(nombre * (1 - partDure - partReguliers)),
  };
  cache.set(club, f);
  return f;
}

/** Ce qui est arrivé au club cette saison, et qui déplace la fanbase. */
export interface SaisonDuClub {
  /** 1 = champion, au-delà = classement dans la poule. */
  rang: number;
  taillePoule: number;
  monte: boolean;
  descend: boolean;
  titre: boolean;
  /** Niveau de la division APRÈS le mouvement. */
  niveau: number;
}

/**
 * CE QU'UNE SAISON FAIT À LA FANBASE.
 *
 * Repères de la demande : une victoire +0,1 % · une bonne saison +3 à 8 % ·
 * champion +10 à 20 % · montée +10 à 25 % · relégation −5 à −15 %.
 *
 * ⚠️ LES TROIS CERCLES NE BOUGENT PAS ENSEMBLE, et c'est ce qui donne à la
 * mécanique sa mémoire. Une belle saison recrute surtout des OCCASIONNELS, qui
 * repartiront au premier hiver ; il faut plusieurs bonnes saisons d'affilée pour
 * qu'ils se sédimentent en réguliers, puis en noyau dur. C'est exactement ce qui
 * empêche « je monte en Top 14 donc j'ai 100 000 supporters » : on peut gagner
 * du monde vite, on ne gagne un PUBLIC que lentement.
 */
export function apresLaSaison(f: Fanbase, s: SaisonDuClub, alea: () => number): Fanbase {
  const part = 1 - (s.rang - 1) / Math.max(1, s.taillePoule - 1);
  let variation = -0.04 + part * 0.11;
  if (s.titre) variation += 0.10 + alea() * 0.09;
  if (s.monte) variation += 0.10 + alea() * 0.14;
  if (s.descend) variation -= 0.06 + alea() * 0.09;

  // ⚠️ LE NOYAU DUR EST QUASI INAMOVIBLE : il encaisse le quart du mouvement à
  // la hausse et le dixième à la baisse. Sans lui, une relégation viderait le
  // club et une carrière ratée deviendrait irrattrapable.
  const bouger = (v: number, sensibilite: number) => Math.max(
    1, Math.round(v * (1 + variation * sensibilite)),
  );
  const suivant: Fanbase = {
    hardcore: bouger(f.hardcore, variation > 0 ? 0.25 : 0.1),
    reguliers: bouger(f.reguliers, variation > 0 ? 0.7 : 0.55),
    occasionnels: bouger(f.occasionnels, variation > 0 ? 1.5 : 1.35),
  };

  // ── LA SÉDIMENTATION ────────────────────────────────────────────────────
  // Un occasionnel qui revient trois ans devient un régulier. C'est le seul
  // chemin vers un gros noyau dur, et il prend des saisons.
  if (variation > 0.04) {
    const promus = Math.round(suivant.occasionnels * 0.045);
    suivant.occasionnels -= promus;
    suivant.reguliers += promus;
    const fideles = Math.round(suivant.reguliers * 0.025);
    suivant.reguliers -= fideles;
    suivant.hardcore += fideles;
  }

  // ⚠️ ET IL Y A UN PLAFOND LIÉ À L'ÉTAGE. Un club de Fédérale 3 qui gagne tout
  // pendant quinze ans ne peut pas atteindre 80 000 supporters sans monter : ce
  // n'est pas le titre qui remplit un stade, c'est le niveau où l'on joue. Le
  // plafond est large (le triple du haut de bande) pour laisser exister le club
  // exceptionnel, mais il existe.
  const [, hautDeBande] = FANBASE_PAR_NIVEAU[s.niveau] ?? [60, 260];
  const plafond = hautDeBande * 3;
  const cumul = total(suivant);
  if (cumul > plafond) {
    const r = plafond / cumul;
    suivant.hardcore = Math.round(suivant.hardcore * r);
    suivant.reguliers = Math.round(suivant.reguliers * r);
    suivant.occasionnels = Math.round(suivant.occasionnels * r);
  }
  return suivant;
}

/**
 * COMBIEN DE MONDE PEUT VENIR UN SOIR DE MATCH ORDINAIRE.
 *
 * ⚠️ LA PART QUI SE DÉPLACE CHUTE AVEC LA TAILLE, et il faut cette courbe.
 * Dans un club de village, presque tous ceux qui « sont du club » sont au bord
 * du terrain le dimanche : ils sont deux cents. À Toulouse, la fanbase se compte
 * en centaines de milliers et le stade en fait dix-neuf mille. Une part
 * constante aurait donné soit des villages déserts, soit des stades de Top 14 à
 * cent mille places.
 *
 * Calée sur : ~75 % à 400 supporters, ~10 % à 150 000.
 */
export function partQuiSeDeplace(fanbase: number): number {
  return Math.max(0.06, Math.min(0.9, 5.75 * fanbase ** -0.34));
}

export function spectateursDeBase(f: Fanbase): number {
  const n = total(f);
  return Math.round(n * partQuiSeDeplace(n));
}

/**
 * LA NOTORIÉTÉ DU CLUB, sur 100 — ce que lisent les sponsors et le
 * merchandising.
 *
 * ⚠️ ELLE MÊLE LE PUBLIC ET LE SPORTIF, et pas seulement l'un des deux. Un club
 * bien classé sans public n'intéresse pas un annonceur ; un club populaire qui
 * joue mal l'intéresse encore. La fanbase pèse donc plus lourd que la force
 * d'effectif — c'est ce qui permet à un club historique en Nationale de garder
 * de vrais partenaires.
 */
export function notorieteDuClub(club: string, saison: number, f?: Fanbase): number {
  const base = f ?? fanbaseHistorique(club);
  const n = total(base);
  const parLePublic = Math.min(70, Math.log10(Math.max(10, n)) * 14 - 12);
  const parLeSport = Math.max(0, (forceEffectif(club, saison) - 30) / 60) * 30;
  return Math.round(Math.max(1, Math.min(100, parLePublic + parLeSport)));
}

/** Purge les mémoires — pour les bancs d'essai. */
export function oublierFanbases(): void {
  cache.clear();
}
