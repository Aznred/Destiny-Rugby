// LE RÈGLEMENT DE CHAQUE COMPÉTITION — une seule définition (Correctif 29)
//
// Qui se qualifie, qui descend, qui joue un match d'accès, ce qui arrive au cinquième d'une poule de Champions Cup,
// si un match peut finir sur un nul et comment on le départage : tout cela vivait en morceaux dans la phase finale,
// les montées, les coupes et trois écrans de classement — chacun avec sa propre idée du « bas de tableau ».
//
// ⚠️ CE MODULE EST UNE FEUILLE : il n'importe rien du jeu. La simulation, le classement, le tableau, le calendrier,
// l'écran et la saison suivante le lisent tous ; aucun ne redéfinit une règle de son côté.
//
// ⚠️ L'INTERFACE NE DÉCIDE JAMAIS D'UNE COULEUR PAR UNE POSITION. Elle reçoit un `StandingsStatus` calculé ici
// (`standingsStatuses`) : une division à 14 clubs, une poule de 10, une ligue en ligne de 6 se colorent sans retouche.

/** Ce que vaut une place au classement si la phase s'arrêtait aujourd'hui. */
export type StandingsStatus =
  | 'QUALIFIED'          // qualification directe (demi-finale, tournoi final, huitièmes de la coupe)
  | 'PLAYOFF'            // barrages / phase finale
  | 'PROMOTION'          // montée directe (divisions publiques en ligne)
  | 'CHALLENGE_CUP'      // reversé en Challenge Cup
  | 'SAFE'
  | 'ACCESS_MATCH'       // match d'accès / barrage de maintien
  | 'DIRECT_RELEGATION'
  | 'ELIMINATED';        // éliminé de la compétition (poule de coupe)

/** D'où vient un club dans un tableau à élimination directe. */
export type QualifiedFrom = 'POOL' | 'CHAMPIONS_CUP_5TH';

/** Ce qui départage après les prolongations, dans l'ordre. */
export type Tiebreak = 'essais' | 'tirsAuBut';

export interface DrawResolution {
  /** Prolongations : nombre de périodes et minutes de chacune. `null` : pas de prolongation. */
  extraTime: { periodes: number; minutes: number } | null;
  /** Si l'égalité persiste : la procédure de la compétition, critère après critère. */
  thenCompetitionSpecificTiebreak: Tiebreak[];
}

export interface KnockoutRules {
  allowDraw: boolean;
  extraTime: boolean;
  drawResolution: DrawResolution;
}

export interface StandingsRules {
  /** Places de qualification directe ; `auto` suit la taille de la poule (voir `nombreQualifies`). */
  qualified: number | 'auto';
  /** Places de barrage, à la suite des qualifiés directs. */
  playoffs: number | 'auto';
  /** Montées directes annoncées au classement (ligue en ligne). */
  promotion?: number;
  /** Les N derniers descendent sans jouer. */
  directRelegation: number;
  /**
   * Places qui jouent un match d'accès, COMPTÉES DEPUIS LE BAS (1 = dernier, 2 = avant-dernier) : la règle tient
   * que la division compte 12 ou 14 clubs.
   */
  accessMatchPositions: number[];
}

export interface PoolQualification {
  /** Les rangs de poule qui continuent dans la compétition. */
  qualified: number[];
  /** Les rangs reversés dans une autre compétition. */
  transferred?: { positions: number[]; to: string; origin: QualifiedFrom };
}

export interface CompetitionRules {
  competition: string;
  standings: StandingsRules;
  poolQualification?: PoolQualification;
  /** Un match de saison régulière peut finir sur un nul. */
  league: { allowDraw: true };
  knockout: KnockoutRules;
}

// ── Les procédures de départage ─────────────────────────────────────────────

const PROLONGATION = { periodes: 2, minutes: 10 };
/** Phases finales françaises et coupes d'Europe : prolongations, puis le plus d'essais, puis les tirs au but. */
const COUPERET_ESSAIS: KnockoutRules = {
  allowDraw: false, extraTime: true,
  drawResolution: { extraTime: PROLONGATION, thenCompetitionSpecificTiebreak: ['essais', 'tirsAuBut'] },
};
/** Ligue en ligne et compétitions sans règle particulière : prolongations, puis tirs au but. */
const COUPERET_TIRS: KnockoutRules = {
  allowDraw: false, extraTime: true,
  drawResolution: { extraTime: PROLONGATION, thenCompetitionSpecificTiebreak: ['tirsAuBut'] },
};

const regles = (
  competition: string, standings: Partial<StandingsRules>, knockout: KnockoutRules = COUPERET_ESSAIS,
  poolQualification?: PoolQualification,
): CompetitionRules => ({
  competition,
  standings: { qualified: 'auto', playoffs: 'auto', directRelegation: 0, accessMatchPositions: [], ...standings },
  league: { allowDraw: true },
  knockout,
  ...(poolQualification ? { poolQualification } : {}),
});

/** Le dernier descend, l'avant-dernier défend sa place contre le finaliste de l'étage du dessous. */
const UN_PLUS_ACCES = { directRelegation: 1, accessMatchPositions: [2] };
/** Fédérale : les deux derniers descendent, personne ne joue de match d'accès. */
const DEUX_DIRECTS = { directRelegation: 2, accessMatchPositions: [] };

/**
 * ⚠️ UNE ENTRÉE PAR COMPÉTITION. Changer le sort d'une division, c'est changer SA ligne — jamais une règle
 * « globale » du bas de tableau.
 */
const TABLE: Record<string, CompetitionRules> = Object.fromEntries([
  // Pyramide française
  regles('top14', UN_PLUS_ACCES),
  regles('prod2', UN_PLUS_ACCES),
  regles('nationale', UN_PLUS_ACCES),
  regles('nationale2', UN_PLUS_ACCES),
  regles('fed1', DEUX_DIRECTS),
  regles('fed2', DEUX_DIRECTS),
  regles('fed3', DEUX_DIRECTS),
  regles('reg1', UN_PLUS_ACCES),
  regles('reg2', UN_PLUS_ACCES),
  regles('reg3', {}),
  // Pyramides étrangères
  regles('premiership', UN_PLUS_ACCES),
  regles('championship', {}),
  regles('japon1', UN_PLUS_ACCES),
  regles('japon2', UN_PLUS_ACCES),
  regles('japon3', {}),
  // Coupes d'Europe : quatre qualifiés par poule ; le cinquième de Champions Cup est reversé en Challenge Cup.
  regles('championsCup', { qualified: 4, playoffs: 0 }, COUPERET_ESSAIS, {
    qualified: [1, 2, 3, 4],
    transferred: { positions: [5], to: 'challengeCup', origin: 'CHAMPIONS_CUP_5TH' },
  }),
  regles('challengeCup', { qualified: 4, playoffs: 0 }, COUPERET_ESSAIS, { qualified: [1, 2, 3, 4] }),
  regles('premCup', { qualified: 4, playoffs: 0 }, COUPERET_ESSAIS, { qualified: [1, 2, 3, 4] }),
  // Ligue en ligne
  regles('ligueEnLigne', { qualified: 0, playoffs: 'auto' }, COUPERET_TIRS),
  regles('divisionPublique', { qualified: 0, playoffs: 'auto', promotion: 1, ...UN_PLUS_ACCES }, COUPERET_TIRS),
  regles('coupeDuMonde', { qualified: 2, playoffs: 0 }, COUPERET_TIRS),
].map((r) => [r.competition, r]));

const PAR_DEFAUT = regles('*', {}, COUPERET_TIRS);

/** Le règlement d'une compétition. Une compétition inconnue n'a ni relégation ni règle particulière. */
export function rulesFor(competition: string | undefined | null): CompetitionRules {
  return (competition && TABLE[competition]) || PAR_DEFAUT;
}

/**
 * Le règlement d'une ligue en ligne : privée (phase finale facultative) ou division publique (montée, barrage,
 * relégation). La première division publique n'a personne au-dessus d'elle : pas de montée.
 */
export function onlineRules(ligue: { publique?: { division: number; derniereDivision?: boolean } | null; playoffs?: boolean }): CompetitionRules {
  const base = rulesFor(ligue.publique ? 'divisionPublique' : 'ligueEnLigne');
  return {
    ...base,
    standings: {
      ...base.standings,
      playoffs: ligue.playoffs ? 'auto' : 0,
      promotion: ligue.publique && ligue.publique.division > 1 ? base.standings.promotion : 0,
      ...(ligue.publique?.derniereDivision ? { directRelegation: 0, accessMatchPositions: [] } : {}),
    },
  };
}

// ── Classement : combien de places, et quel statut pour chacune ─────────────

/** Combien de clubs disputent la phase finale d'une poule : 6 à douze et plus, 4 de huit à onze, une finale sèche en dessous. */
export function nombreQualifies(taille: number): number {
  if (taille >= 12) return 6;
  if (taille >= 8) return 4;
  return Math.min(2, Math.max(0, taille));
}

/**
 * LIGUE EN LIGNE : combien de clubs disputent la phase finale d'un championnat (Correctif 33).
 * 4 clubs → 2 (finale sèche), 6 → 4, 8 → 4, 10 → 6 (barrages puis demi-finales), 16 et plus → 8.
 *
 * ⚠️ UNE SEULE DÉFINITION, lue par le serveur qui crée les affiches, par le tableau de l'écran et par les zones du
 * classement. Il y en avait trois : le serveur qualifiait « la plus grande puissance de deux » (16 clubs sur 16,
 * 8 sur 8), l'écran dessinait un tableau deux fois plus petit — à 16 clubs, huit matchs réels pour quatre cases,
 * et une finale qui n'apparaissait jamais.
 */
export function qualifiesPlayoffsEnLigne(clubs: number): number {
  if (!Number.isFinite(clubs) || clubs < 2) return 0;
  const n = Math.floor(clubs);
  return n >= 16 ? 8 : n >= 10 ? 6 : n >= 6 ? 4 : 2;
}

/**
 * Le tableau d'une phase finale à `qualifies` clubs : combien sont exemptés du premier tour, et combien de matchs
 * compte chaque tour. Six qualifiés : deux barrages (3ᵉ-6ᵉ, 4ᵉ-5ᵉ), les deux premiers attendent en demi-finale.
 */
export function tableauPlayoffs(qualifies: number): { exemptes: number; tours: number[] } {
  const n = Math.max(0, Math.floor(qualifies));
  if (n < 2) return { exemptes: n, tours: [] };
  const plein = 2 ** Math.floor(Math.log2(n));
  const barrages = n - plein;
  const tours: number[] = barrages ? [barrages] : [];
  for (let matchs = plein / 2; matchs >= 1; matchs /= 2) tours.push(matchs);
  return { exemptes: barrages ? n - 2 * barrages : 0, tours };
}

export interface Zones {
  qualified: number;
  playoffs: number;
  promotion: number;
  directRelegation: number;
  /** Positions (1 = premier) qui jouent un match d'accès. */
  accessMatch: number[];
}

/**
 * Les zones d'un classement de `taille` clubs. `poules` : nombre de poules de la division (les divisions à poules
 * qualifient leurs meilleurs pour le tournoi final).
 *
 * ⚠️ C'EST LA MÊME FONCTION QUI DÉSIGNE LES RELÉGUÉS (`phaseFinale`, `tournoi`) ET QUI COLORE LE CLASSEMENT : ce qui
 * est rouge à l'écran est exactement ce qui descend.
 */
export function zones(rules: CompetitionRules, taille: number, poules = 1): Zones {
  const s = rules.standings;
  const phase = nombreQualifies(taille);
  let qualified: number;
  let playoffs: number;
  if (s.qualified === 'auto') {
    // Poule unique : les deux premiers attendent en demi-finale quand il y a des barrages. Division à poules : les
    // qualifiés du tournoi final (deux par poule jusqu'à trois poules, un au-delà).
    qualified = poules > 1 ? (poules <= 3 ? 2 : 1) : phase >= 6 ? 2 : phase;
    playoffs = s.playoffs === 'auto' ? Math.max(0, phase - qualified) : s.playoffs;
  } else {
    // Ligue en ligne : le nombre de qualifiés suit la taille du championnat. Avec des barrages (six qualifiés), les
    // exemptés du premier tour sont « qualifiés » et les autres « en barrage » — le tableau dit la même chose.
    const enLice = s.playoffs === 'auto' ? qualifiesPlayoffsEnLigne(taille) : 0;
    qualified = s.playoffs === 'auto' ? Math.max(s.qualified, tableauPlayoffs(enLice).exemptes) : s.qualified;
    playoffs = s.playoffs === 'auto' ? Math.max(0, enLice - qualified) : s.playoffs;
  }
  qualified = Math.min(qualified, taille);
  playoffs = Math.min(playoffs, taille - qualified);
  const promotion = Math.min(s.promotion ?? 0, taille);
  // Une toute petite poule ne perd pas la moitié de ses clubs : un relégué par tranche de quatre, au plus.
  const directRelegation = Math.max(0, Math.min(s.directRelegation, Math.floor(taille / 4)));
  const haut = Math.max(qualified + playoffs, promotion);
  const accessMatch = s.accessMatchPositions
    .map((depuisLeBas) => taille + 1 - depuisLeBas)
    .filter((position) => taille >= 3 && position > haut && position <= taille - directRelegation)
    .sort((a, b) => a - b);
  return { qualified, playoffs, promotion, directRelegation, accessMatch };
}

/** Le statut de chaque place, de la première à la dernière (`[0]` = le premier). */
export function standingsStatuses(rules: CompetitionRules, taille: number, poules = 1): StandingsStatus[] {
  const z = zones(rules, taille, poules);
  return Array.from({ length: taille }, (_, i) => {
    const position = i + 1;
    if (position > taille - z.directRelegation) return 'DIRECT_RELEGATION';
    if (z.accessMatch.includes(position)) return 'ACCESS_MATCH';
    if (position <= z.promotion) return 'PROMOTION';
    if (position <= z.qualified) return 'QUALIFIED';
    if (position <= z.qualified + z.playoffs) return 'PLAYOFF';
    return 'SAFE';
  });
}

/** Le statut de chaque place d'une POULE DE COUPE : qualifié, reversé, éliminé. */
export function poolStatuses(rules: CompetitionRules, taille: number): StandingsStatus[] {
  const q = rules.poolQualification;
  if (!q) return standingsStatuses(rules, taille);
  return Array.from({ length: taille }, (_, i) => {
    const position = i + 1;
    if (q.qualified.includes(position)) return 'QUALIFIED';
    if (q.transferred?.positions.includes(position)) return 'CHALLENGE_CUP';
    return 'ELIMINATED';
  });
}

// ── Matchs : un vainqueur est-il obligatoire ? ──────────────────────────────

/**
 * La compétition d'un match couperet, lue dans sa clé (`phase#division#…`, `finale#division#…`,
 * `tournoi#division#…`, `acces#haut#bas#…`, `coupe#id#…`). `null` : ce n'est pas un match à élimination.
 */
export function competitionDuCouperet(cle: string): string | null {
  if (/^mondial#[^#]+#(huitieme|quart|demie|finale|petiteFinale)#/.test(cle)) return 'coupeDuMonde';
  const m = /^(phase|finale|coupe|acces|tournoi)#([^#]+)/.exec(cle);
  return m ? m[2] : null;
}

/** Les règles du match : `allowDraw` vrai pour une journée de championnat ou de poule, faux pour un match couperet. */
export function matchRules(cle: string): KnockoutRules | { allowDraw: true } {
  const competition = competitionDuCouperet(cle);
  return competition === null ? { allowDraw: true } : rulesFor(competition).knockout;
}

// ── Présentation : une couleur ET un symbole par statut ─────────────────────

/** Le symbole qui double la couleur (accessibilité) et la clé du libellé traduit. */
export const PRESENTATION_STATUT: Record<Exclude<StandingsStatus, 'SAFE'>, { symbole: string; cle: string }> = {
  QUALIFIED: { symbole: 'Q', cle: 'zone.qualifie' },
  PLAYOFF: { symbole: 'PO', cle: 'zone.playoff' },
  PROMOTION: { symbole: '▲', cle: 'zone.promotion' },
  CHALLENGE_CUP: { symbole: 'CC', cle: 'zone.challenge' },
  ACCESS_MATCH: { symbole: 'B', cle: 'zone.acces' },
  DIRECT_RELEGATION: { symbole: '▼', cle: 'zone.relegation' },
  ELIMINATED: { symbole: '✕', cle: 'zone.elimine' },
};
