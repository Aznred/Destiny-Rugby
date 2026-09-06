// LES RÉGLAGES D'UNE LIGUE — préréglages, bornes, et validation serveur
//
// Le commissaire choisit tout à la création : nombre de clubs, format, rythme,
// jours de journée, et une douzaine de règles à cocher. Ensuite, la ligue vit
// avec — on ne change pas les règles au milieu d'une saison.
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ CE FICHIER EST LE CONTRÔLE D'ENTRÉE DU SERVEUR
// ═══════════════════════════════════════════════════════════════════════════
// `verifierReglages` est appelée par l'API AVANT toute création. Ce n'est pas
// une politesse d'interface : sans elle, un `fetch` à la main crée une ligue à
// 400 clubs, avec `dureteEconomie: 0` (donc des gains infinis) et un format que
// le générateur de calendrier ne sait pas produire. Le formulaire appelle la
// MÊME fonction — une seule définition des bornes, donc pas d'écran qui accepte
// ce que l'API refusera.

import type { ModeEquite, ReglagesLigue, TypeLigue } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LES BORNES
// ═══════════════════════════════════════════════════════════════════════════

export const BORNES = {
  /**
   * ⚠️ 4 AU MINIMUM, et ce n'est pas arbitraire : à 3 clubs, un aller-retour
   * ne fait que 6 journées et chacun affronte le même adversaire une semaine
   * sur deux. À 2, ce n'est plus une ligue.
   *
   * 20 au maximum : la demande dit « 4 à 20 potes ». Au-delà, l'aller-retour
   * dépasse 38 journées, soit près d'un an à un match par semaine.
   */
  clubs: { min: 4, max: 20 },
  /** Multiplicateurs : 1 = le barème de référence. */
  severiteBlessures: { min: 0.5, max: 2 },
  dureteEconomie: { min: 0.5, max: 2 },
} as const;

/**
 * ⚠️ UN NOMBRE IMPAIR DE CLUBS EST AUTORISÉ, avec une équipe exempte par
 * journée (voir `calendrier.ts`). C'était tentant de l'interdire — la demande
 * ne propose que des nombres pairs (4 / 6 / 8 / 10 …) — mais un groupe de potes
 * perd un joueur en cours de route, et refuser 9 clubs signifierait « votre
 * ligue est cassée ». Elle tourne, quelqu'un souffle chaque journée.
 */
export function nombreDeClubsValide(n: number): boolean {
  return Number.isInteger(n) && n >= BORNES.clubs.min && n <= BORNES.clubs.max;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LES CINQ TYPES DE LIGUE (point 24)
// ═══════════════════════════════════════════════════════════════════════════
// « Ça élargit énormément le concept sans changer le moteur du jeu » — et c'est
// exactement ce qui est fait ici : un type de ligue N'EST QU'UN PRÉRÉGLAGE. Il
// ne débloque aucun code particulier, il coche des cases. Le commissaire peut
// ensuite tout décocher à la main : le type n'est plus alors qu'une étiquette.

type Preselection = Omit<ReglagesLigue, 'clubs' | 'format' | 'rythme' | 'jours' | 'type'>;

const COMMUN: Preselection = {
  packs: true,
  marche: true,
  echanges: true,
  prets: true,
  plafondSalarial: false,
  blessures: true,
  fatigue: true,
  equite: 'fairplay',
  nonJoue: 'simulation',
  severiteBlessures: 1,
  dureteEconomie: 1,
};

/**
 * Les préréglages, par type.
 *
 * ⚠️ `plafondSalarial` est à `false` PARTOUT, y compris en hardcore, et c'est
 * volontaire : la demande le coche explicitement « ❌ », et le point 19 va plus
 * loin (« je ne mettrais pas les salaires classiques, sinon le mode devient
 * beaucoup trop lourd »). Le drapeau existe dans le type parce qu'il faudra
 * peut-être un jour un mécanisme qui RETIRE des OVA de l'économie — mais rien
 * ne le lit encore. Ne pas l'activer sans avoir écrit ce mécanisme.
 */
export const PRESELECTIONS: Record<TypeLigue, Preselection> = {
  /** 🎴 Packs + OVA + marché. Le mode de référence. */
  ultimate: { ...COMMUN },
  /** 🧠 Pas de packs : budget identique et marché classique. */
  manager: { ...COMMUN, packs: false, equite: 'competitif' },
  /** 🎲 Effectifs construits au draft. Les packs restent ouverts ensuite. */
  draft: { ...COMMUN },
  /** ⚖️ Équipes initiales de force quasi identique (voir `dotation.ts`). */
  equilibre: { ...COMMUN, equite: 'competitif' },
  /** 💀 Blessures fortes, fatigue élevée, économie difficile. */
  hardcore: {
    ...COMMUN,
    blessures: true,
    fatigue: true,
    severiteBlessures: 1.8,
    dureteEconomie: 1.6,
    equite: 'competitif',
    nonJoue: 'forfait',
  },
};

/** Jours de journée par défaut : dimanche seul, ou mercredi + dimanche. */
export const JOURS_PAR_DEFAUT: Record<1 | 2, number[]> = {
  1: [0],
  2: [3, 0],
};

/** Les réglages complets d'une ligue neuve. C'est ce que propose l'écran. */
export function reglagesParDefaut(type: TypeLigue, clubs: number): ReglagesLigue {
  const rythme: 1 | 2 = 1;
  return {
    type,
    clubs,
    format: 'allerRetour',
    rythme,
    jours: [...JOURS_PAR_DEFAUT[rythme]],
    ...PRESELECTIONS[type],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

const TYPES: TypeLigue[] = ['ultimate', 'manager', 'draft', 'equilibre', 'hardcore'];
const EQUITES: ModeEquite[] = ['libre', 'fairplay', 'competitif'];

/**
 * Vérifie des réglages reçus du réseau.
 *
 * Rend la liste des motifs de refus — vide si tout va bien. Des MOTIFS, pas des
 * phrases : la ligue se joue en sept langues, c'est l'écran qui rédige.
 */
export function verifierReglages(brut: unknown): string[] {
  const maux: string[] = [];
  if (typeof brut !== 'object' || brut === null) return ['reglages.absents'];
  const r = brut as Partial<ReglagesLigue>;

  if (!TYPES.includes(r.type as TypeLigue)) maux.push('reglages.type');
  if (!nombreDeClubsValide(Number(r.clubs))) maux.push('reglages.clubs');
  if (r.format !== 'aller' && r.format !== 'allerRetour') maux.push('reglages.format');
  if (r.rythme !== 1 && r.rythme !== 2) maux.push('reglages.rythme');

  // ⚠️ LES JOURS SONT LE PIÈGE DU FORMULAIRE. Il en faut EXACTEMENT autant que
  // le rythme, tous distincts et tous dans 0..6. Deux journées le même jour, et
  // le calendrier produit deux fenêtres qui se ferment à la même seconde : la
  // seconde naît déjà expirée, et la règle `nonJoue` s'applique avant que
  // personne n'ait pu jouer.
  const jours = Array.isArray(r.jours) ? r.jours : [];
  const rythme = r.rythme === 2 ? 2 : 1;
  if (jours.length !== rythme) maux.push('reglages.jours.nombre');
  else if (!jours.every((j) => Number.isInteger(j) && j >= 0 && j <= 6)) maux.push('reglages.jours.valeur');
  else if (new Set(jours).size !== jours.length) maux.push('reglages.jours.doublon');

  for (const cle of ['packs', 'marche', 'echanges', 'prets', 'plafondSalarial', 'blessures', 'fatigue'] as const) {
    if (typeof r[cle] !== 'boolean') maux.push(`reglages.${cle}`);
  }
  if (!EQUITES.includes(r.equite as ModeEquite)) maux.push('reglages.equite');
  if (!['report', 'simulation', 'forfait', 'commissaire'].includes(String(r.nonJoue))) {
    maux.push('reglages.nonJoue');
  }
  for (const cle of ['severiteBlessures', 'dureteEconomie'] as const) {
    const v = Number(r[cle]);
    if (!Number.isFinite(v) || v < BORNES[cle].min || v > BORNES[cle].max) maux.push(`reglages.${cle}`);
  }

  // ⚠️ COHÉRENCES CROISÉES. Chaque champ pris isolément peut être valide et
  // l'ensemble absurde — c'est toujours là que passent les requêtes forgées.
  if (r.packs === false && r.marche === false && r.echanges === false) {
    // Plus aucun moyen de faire évoluer son effectif : la ligue est un mur.
    maux.push('reglages.economieMorte');
  }
  if (r.echanges === false && r.equite && r.equite !== 'libre') {
    // Un mode d'équité sans échange ne garde rien : il n'y a rien à arbitrer.
    // Ce n'est pas dangereux, mais c'est un réglage qui ment à l'écran.
    maux.push('reglages.equiteSansEchange');
  }
  return maux;
}

/**
 * Les réglages tels que le serveur les ENREGISTRE : bornés, complétés, sans un
 * champ de plus. Ne l'appeler qu'après un `verifierReglages` vide.
 *
 * ⚠️ ON NE RANGE JAMAIS L'OBJET REÇU TEL QUEL. Un `JSON.parse` accepte les
 * champs inconnus ; rangés en `jsonb`, ils reviennent à la lecture et un jour
 * quelqu'un les lira. On recompose champ par champ.
 */
export function reglagesAssainis(r: ReglagesLigue): ReglagesLigue {
  return {
    type: r.type,
    clubs: Math.round(r.clubs),
    format: r.format,
    rythme: r.rythme,
    jours: r.jours.slice(0, r.rythme).map((j) => Math.round(j)),
    packs: r.packs,
    marche: r.marche,
    echanges: r.echanges,
    prets: r.prets,
    plafondSalarial: r.plafondSalarial,
    blessures: r.blessures,
    fatigue: r.fatigue,
    equite: r.equite,
    nonJoue: r.nonJoue,
    severiteBlessures: borner(r.severiteBlessures, BORNES.severiteBlessures),
    dureteEconomie: borner(r.dureteEconomie, BORNES.dureteEconomie),
  };
}

function borner(v: number, { min, max }: { min: number; max: number }): number {
  return Math.min(max, Math.max(min, Math.round(v * 10) / 10));
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. CE QUI EN DÉCOULE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Nombre de journées du championnat.
 *
 * ⚠️ UN NOMBRE IMPAIR DE CLUBS DONNE AUTANT DE JOURNÉES QU'AVEC UN CLUB DE
 * PLUS : c'est la journée d'exemption qui occupe la place. À 9 clubs, l'aller
 * simple fait 9 journées (et non 8), chacun soufflant une fois.
 */
export function nombreDeJournees(reglages: Pick<ReglagesLigue, 'clubs' | 'format'>): number {
  const n = reglages.clubs % 2 === 0 ? reglages.clubs : reglages.clubs + 1;
  const aller = n - 1;
  return reglages.format === 'allerRetour' ? aller * 2 : aller;
}

/** Durée de la saison en semaines, arrondie au supérieur. */
export function semainesDeSaison(reglages: Pick<ReglagesLigue, 'clubs' | 'format' | 'rythme'>): number {
  return Math.ceil(nombreDeJournees(reglages) / reglages.rythme);
}
