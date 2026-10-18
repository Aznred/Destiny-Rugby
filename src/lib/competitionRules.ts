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
  | 'PROMOTION'          // montée directe, acquise au classement
  | 'PROMOTION_FINALS'   // montée acquise ET qualification pour le tableau qui désigne le champion
  | 'PROMOTION_POSSIBLE' // montée possible : les meilleurs suivants prennent les places restantes
  | 'CHALLENGE_CUP'      // reversé en Challenge Cup
  | 'SAFE'
  | 'ACCESS_MATCH'       // match d'accès / barrage de maintien
  | 'DIRECT_RELEGATION'
  | 'RELEGATION_POSSIBLE' // relégation possible : les moins bien classés de la ligue complètent les descentes
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

// ── Titre et montée : deux règles distinctes (Correctif 39) ──────────────────
//
// Signalé en jeu : « plusieurs groupes/régions participent à la compétition, mais finalement un seul club obtient la
// montée, comme si toute la pyramide dépendait du champion unique du tableau final ».
//
// Chaque division distingue les places gagnées au classement et celles gagnées dans le tableau : en Fédérale 2,
// les quart-finalistes montent ; en Fédérale 1, les demi-finalistes. Les Régionales gardent leurs places par poule.

/** Qui dispute le tableau final, distinct des conditions d'accession (`ChampionshipBracket`). */
export interface QualificationToFinals {
  /** Qualifiés par poule. `auto` : la phase finale de la poule (poule unique), deux par poule jusqu'à trois poules, un au-delà. */
  perPool: number | 'auto';
  /** Barragistes de chaque poule ; « auto » adapte le format régional à son effectif. */
  playoffsPerPool?: number | 'auto';
  /** Le tableau est complété à la puissance de deux par les meilleurs suivants. */
  bestRunnersUp: boolean;
}

/** Les montées acquises au classement ; zéro lorsque l'accession dépend des phases finales. */
export interface PromotionRules {
  /** Montées acquises par poule. 0 : aucune montée au seul classement. */
  promotionSlots: number;
  /**
   * Le territoire de l'échange avec l'étage du dessus. `ligue` : les places se comptent à l'intérieur de chaque ligue
   * régionale — un club occitan ne dispute sa montée qu'aux clubs d'Occitanie, et ce sont des clubs d'Occitanie qui
   * descendent à sa place. `division` : toutes poules confondues.
   */
  territory: 'ligue' | 'division';
  /** Les places que l'étage du dessus libère en plus vont aux meilleurs suivants (les deuxièmes les mieux classés). */
  bestRunnersUp: boolean;
}

/** Les descentes : les mêmes valeurs que `standings` (une seule saisie), nommées pour ce qu'elles sont. */
export interface RelegationRules {
  /** Relégués directs par poule. Dans un échange par ligue, c'est la valeur nominale : le compte réel suit les montées de la ligue. */
  directPerPool: number;
  /** Places qui jouent un match de maintien, comptées depuis le bas. */
  accessMatchPositions: number[];
}

/**
 * Le tableau final et la montée. `decides` : le champion monte, le finaliste joue l'accès (poule unique : Pro D2,
 * Nationale). `tiebreak` : le tableau ne donne aucune place, mais le champion passe en tête des meilleurs suivants.
 * `none` : le tableau ne désigne que le champion. `qualification` : atteindre `tourAccession` donne la montée.
 */
export interface ChampionshipBracket {
  promotionImpact: 'decides' | 'tiebreak' | 'none' | 'qualification';
  /** L'accession est acquise en atteignant ce tour, même si le club y perd ensuite. */
  tourAccession?: 'quart' | 'demie';
}

export function placesAccessionParTableau(rules: CompetitionRules): number {
  return rules.championshipBracket.promotionImpact === 'qualification'
    ? rules.championshipBracket.tourAccession === 'quart' ? 8 : rules.championshipBracket.tourAccession === 'demie' ? 4 : 0
    : 0;
}

export interface CompetitionRules {
  competition: string;
  standings: StandingsRules;
  qualificationToFinals: QualificationToFinals;
  promotionRules: PromotionRules;
  relegationRules: RelegationRules;
  championshipBracket: ChampionshipBracket;
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

/** Ce qu'une division déclare en plus de son bas de tableau : sa montée, son tableau final, et ce que l'un doit à l'autre. */
interface ReglesSportives {
  promotion?: Partial<PromotionRules>;
  finals?: Partial<QualificationToFinals>;
  bracket?: ChampionshipBracket['promotionImpact'];
  tourAccession?: ChampionshipBracket['tourAccession'];
}

const regles = (
  competition: string, standings: Partial<StandingsRules>, knockout: KnockoutRules = COUPERET_ESSAIS,
  poolQualification?: PoolQualification, sport: ReglesSportives = {},
): CompetitionRules => {
  const s: StandingsRules = { qualified: 'auto', playoffs: 'auto', directRelegation: 0, accessMatchPositions: [], ...standings };
  return {
    competition,
    standings: s,
    qualificationToFinals: { perPool: 'auto', bestRunnersUp: true, ...sport.finals },
    promotionRules: { promotionSlots: s.promotion ?? 0, territory: 'division', bestRunnersUp: false, ...sport.promotion },
    // ⚠️ UNE SEULE SAISIE : les descentes sont celles de `standings`, que `zones()` colore au classement.
    relegationRules: { directPerPool: s.directRelegation, accessMatchPositions: s.accessMatchPositions },
    // Sans précision, c'est le tableau qui donne la place (le comportement de toute poule unique).
    championshipBracket: { promotionImpact: sport.bracket ?? 'decides', ...(sport.tourAccession ? { tourAccession: sport.tourAccession } : {}) },
    league: { allowDraw: true },
    knockout,
    ...(poolQualification ? { poolQualification } : {}),
  };
};

/** Une division de la pyramide : son bas de tableau, puis sa montée et son tableau final. */
const division = (competition: string, standings: Partial<StandingsRules>, sport: ReglesSportives = {}): CompetitionRules =>
  regles(competition, standings, COUPERET_ESSAIS, undefined, sport);

/** Le dernier descend, l'avant-dernier défend sa place contre le finaliste de l'étage du dessous. */
const UN_PLUS_ACCES = { directRelegation: 1, accessMatchPositions: [2] };
/** Les deux derniers descendent, personne ne joue de match d'accès. */
const DEUX_DIRECTS = { directRelegation: 2, accessMatchPositions: [] };
/** Régionale : un relégué par poule en valeur nominale — le compte réel suit les montées de la ligue (`promotion.ts`). */
const UN_DIRECT = { directRelegation: 1, accessMatchPositions: [] };

/** Poule unique : le champion monte, le finaliste joue l'accès. C'est le tableau final qui donne la place. */
const MONTEE_DU_CHAMPION: ReglesSportives = { promotion: { promotionSlots: 1 }, bracket: 'decides' };
/** Division à poules : le premier de CHAQUE poule monte. Le tableau final ne désigne que le champion. */
const MONTEE_PAR_POULE: ReglesSportives = { promotion: { promotionSlots: 1 }, bracket: 'none' };
/** Le premier de chaque poule monte, et les meilleurs deuxièmes prennent les places que l'étage du dessus libère en plus. */
const MONTEE_ET_MEILLEURS_DEUXIEMES: ReglesSportives = { promotion: { promotionSlots: 1, bestRunnersUp: true }, bracket: 'tiebreak' };
/** Régionale : le premier de chaque poule monte, à l'intérieur de sa ligue régionale. */
const MONTEE_PAR_LIGUE: ReglesSportives = { promotion: { promotionSlots: 1, territory: 'ligue' }, bracket: 'none' };

/**
 * ⚠️ UNE ENTRÉE PAR COMPÉTITION. Changer le sort d'une division, c'est changer SA ligne — jamais une règle
 * « globale » du bas de tableau.
 *
 * ⚠️ LES PLACES DOIVENT SE RÉPONDRE D'UN ÉTAGE À L'AUTRE (Correctif 39) : ce qu'un étage promeut, celui du dessus le
 * relègue. Mesuré sur les poules du jeu (`npm run verify:montees`) :
 *
 *   Nationale 2 (2 poules) → Nationale : 2 montées, 2 relégués directs — plus de match d'accès, qui ne se jouait jamais
 *     (il attendait le finaliste d'une poule unique que la Nationale 2 n'a pas) ;
 *   Fédérale 1 (4) → Nationale 2 : 4 montées, 2 relégués par poule ;
 *   Fédérale 2 (8) → Fédérale 1 : 8 et 8 ;  Fédérale 3 (14) → Fédérale 2 : 14 premiers + 2 meilleurs deuxièmes, 16 ;
 *   Régionale 1 (22) → Fédérale 3 : 22 premiers + 6 meilleurs deuxièmes, 28 ;
 *   Régionale 2 → Régionale 1 et Régionale 3 → Régionale 2 : par LIGUE régionale, autant de descentes que de montées.
 */
const TABLE: Record<string, CompetitionRules> = Object.fromEntries([
  // Pyramide française
  division('top14', UN_PLUS_ACCES),
  division('prod2', UN_PLUS_ACCES, MONTEE_DU_CHAMPION),
  division('nationale', DEUX_DIRECTS, MONTEE_DU_CHAMPION),
  division('nationale2', DEUX_DIRECTS, { ...MONTEE_PAR_POULE, finals: { perPool: 2, playoffsPerPool: 4 } }),
  division('fed1', DEUX_DIRECTS, { bracket: 'qualification', tourAccession: 'demie', finals: { perPool: 2, playoffsPerPool: 4 } }),
  division('fed2', DEUX_DIRECTS, { bracket: 'qualification', tourAccession: 'quart', finals: { perPool: 2, playoffsPerPool: 4 } }),
  // FFR : trois qualifiés directs, puis un barrage entre les quatrième et cinquième en Fédérale 3.
  division('fed3', DEUX_DIRECTS, { ...MONTEE_ET_MEILLEURS_DEUXIEMES, finals: { perPool: 3, playoffsPerPool: 2 } }),
  division('reg1', UN_DIRECT, { ...MONTEE_ET_MEILLEURS_DEUXIEMES, finals: { playoffsPerPool: 'auto' } }),
  division('reg2', UN_DIRECT, { ...MONTEE_PAR_LIGUE, finals: { playoffsPerPool: 'auto' } }),
  division('reg3', {}, { ...MONTEE_PAR_LIGUE, finals: { playoffsPerPool: 'auto' } }),
  // Pyramides étrangères
  // La PREM n'échange plus automatiquement ses clubs avec le Championship.
  division('premiership', {}, { bracket: 'none' }),
  division('championship', {}, { bracket: 'none' }),
  division('japon1', UN_PLUS_ACCES),
  division('japon2', UN_PLUS_ACCES, MONTEE_DU_CHAMPION),
  division('japon3', {}, MONTEE_DU_CHAMPION),
  // Coupes d'Europe : quatre qualifiés par poule ; le cinquième de Champions Cup est reversé en Challenge Cup.
  regles('championsCup', { qualified: 4, playoffs: 0 }, COUPERET_ESSAIS, {
    qualified: [1, 2, 3, 4],
    transferred: { positions: [5], to: 'challengeCup', origin: 'CHAMPIONS_CUP_5TH' },
  }),
  regles('challengeCup', { qualified: 4, playoffs: 0 }, COUPERET_ESSAIS, { qualified: [1, 2, 3, 4] }),
  regles('premCup', { qualified: 4, playoffs: 0 }, COUPERET_ESSAIS, { qualified: [1, 2, 3, 4] }),
  // Rugby féminin (formats 2026-2027 ; identifiants de `data/mondeFeminin.generated.ts`). Quatre demi-finalistes partout, sauf
  // l'Aupiki (les deux premières jouent la finale). Franchises et provinces : ni montée ni descente.
  regles('f-pwr', { qualified: 4, playoffs: 0 }),
  regles('f-aupiki', { qualified: 2, playoffs: 0 }),
  regles('f-superw', { qualified: 4, playoffs: 0 }),
  regles('f-celtic', { qualified: 4, playoffs: 0 }),
  regles('f-fpc', { qualified: 4, playoffs: 0, directRelegation: 1 }),
  regles('f-fpc2', { qualified: 4, playoffs: 0, promotion: 1 }),
  // Élite 1 : la dernière descend en Élite 2. Élite 2 : la championne monte, la dernière descend en Fédérale 1.
  regles('f-elite1', { qualified: 4, playoffs: 0, directRelegation: 1 }),
  regles('f-elite2', { qualified: 4, playoffs: 0, promotion: 1, directRelegation: 1 }),
  regles('f-seriea', { qualified: 4, playoffs: 0, directRelegation: 1 }),
  regles('f-liga', { qualified: 4, playoffs: 0, directRelegation: 1 }),
  // All-Ireland League : la dernière de 1A joue un barrage contre la première de 1B.
  regles('f-ail', { qualified: 4, playoffs: 0, accessMatchPositions: [1] }),
  // 1B : la première dispute le barrage de montée, la dernière un barrage contre un club des ligues provinciales.
  regles('f-ail2', { qualified: 1, playoffs: 0, accessMatchPositions: [1] }),
  // Ligue en ligne
  regles('ligueEnLigne', { qualified: 0, playoffs: 'auto' }, COUPERET_TIRS),
  regles('divisionPublique', { qualified: 0, playoffs: 0, promotion: 2, directRelegation: 4, accessMatchPositions: [] }, COUPERET_TIRS),
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

/** Le format de la poule, partagé par ses couleurs, ses barrages et son calendrier. */
export function qualificationParPoule(rules: CompetitionRules, taille: number): { directs: number; barragistes: number } | null {
  const f = rules.qualificationToFinals;
  if (f.playoffsPerPool === undefined) return null;
  const total = nombreQualifies(taille);
  const directs = Math.min(taille, f.perPool === 'auto' ? (total >= 6 ? 2 : total) : f.perPool);
  const demandes = f.playoffsPerPool === 'auto' ? Math.max(0, total - directs) : f.playoffsPerPool;
  // Un barrage a deux participants : une poule raccourcie ne crée jamais un adversaire absent.
  return { directs, barragistes: Math.max(0, Math.floor(Math.min(demandes, taille - directs) / 2) * 2) };
}

/** Nombre de places du tableau principal et présence du tour préliminaire. */
export function formatTournoi(rules: CompetitionRules, tailles: number[]): { principal: number; barrages: boolean } | null {
  const formats = tailles.map(t => qualificationParPoule(rules, t));
  if (formats.some(f => !f)) return null;
  return { principal: formats.reduce((n, f) => n + f!.directs + f!.barragistes / 2, 0), barrages: formats.some(f => f!.barragistes > 0) };
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
  const poule = poules > 1 ? qualificationParPoule(rules, taille) : null;
  if (poule) {
    qualified = poule.directs;
    playoffs = poule.barragistes;
  } else if (s.qualified === 'auto') {
    // Poule unique : les deux premiers attendent en demi-finale quand il y a des barrages. Division à poules : les
    // qualifiés du tournoi final (deux par poule jusqu'à trois poules, un au-delà).
    const finales = rules.qualificationToFinals.perPool;
    qualified = poules > 1 ? (finales === 'auto' ? (poules <= 3 ? 2 : 1) : finales) : phase >= 6 ? 2 : phase;
    // ⚠️ UNE DIVISION À POULES N'A PAS DE BARRAGES DE POULE : ses qualifiés vont droit au tableau final. Les places 2 à 6
    // s'affichaient « Barrages » pour un tour qui n'existe pas.
    playoffs = poules > 1 ? 0 : s.playoffs === 'auto' ? Math.max(0, phase - qualified) : s.playoffs;
  } else {
    // Ligue en ligne : le nombre de qualifiés suit la taille du championnat. Avec des barrages (six qualifiés), les
    // exemptés du premier tour sont « qualifiés » et les autres « en barrage » — le tableau dit la même chose.
    const enLice = s.playoffs === 'auto' ? qualifiesPlayoffsEnLigne(taille) : 0;
    qualified = s.playoffs === 'auto' ? Math.max(s.qualified, tableauPlayoffs(enLice).exemptes) : s.qualified;
    playoffs = s.playoffs === 'auto' ? Math.max(0, enLice - qualified) : s.playoffs;
  }
  qualified = Math.min(qualified, taille);
  playoffs = Math.min(playoffs, taille - qualified);
  // La montée acquise au classement : les places par poule d'une division à poules. En poule unique, c'est le tableau
  // final qui la donne (`decides`) — rien n'est promis au classement —, sauf montée directe déclarée (`standings.promotion`).
  const promotion = Math.min(poules > 1 ? rules.promotionRules.promotionSlots : s.promotion ?? 0, taille);
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
    // Monter ET jouer le titre : la montée est acquise au classement, le tableau final reste à disputer.
    if (position <= z.promotion) return poules > 1 && position <= z.qualified ? 'PROMOTION_FINALS' : 'PROMOTION';
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
  PROMOTION_FINALS: { symbole: '▲Q', cle: 'zone.promotionFinales' },
  PROMOTION_POSSIBLE: { symbole: '△', cle: 'zone.promotionPossible' },
  CHALLENGE_CUP: { symbole: 'CC', cle: 'zone.challenge' },
  ACCESS_MATCH: { symbole: 'B', cle: 'zone.acces' },
  DIRECT_RELEGATION: { symbole: '▼', cle: 'zone.relegation' },
  RELEGATION_POSSIBLE: { symbole: '▽', cle: 'zone.relegationPossible' },
  ELIMINATED: { symbole: '✕', cle: 'zone.elimine' },
};
