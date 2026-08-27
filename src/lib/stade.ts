// ═══════════════════════════════════════════════════════════════════════════
// LE STADE — « beaucoup plus qu'une capacité »
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « je ferais une vraie économie avec stade + infrastructures +
// supporters + sponsors + merchandising + hospitalités, plutôt qu'un simple
// bouton "améliorer stade" ». Et : « à ce niveau [Régionale 3], la buvette peut
// presque être plus importante que la billetterie ».
//
// ⚠️ UN SPECTATEUR NE RAPPORTE PAS QUE SON BILLET, et c'est là que l'économie
// devient un jeu. Billetterie, buvettes, boutique, parking, VIP : cinq lignes,
// cinq bâtiments à améliorer, cinq arbitrages. Un stade réduit à une capacité
// n'aurait qu'un seul levier — la taille — donc qu'une seule stratégie.
//
// ⚠️ ET LA DEMANDE EST ÉLASTIQUE AU PRIX. C'est ce qui transforme la billetterie
// en problème d'optimisation plutôt qu'en bouton : « tu gagnes davantage par
// spectateur mais tu remplis moins », et un stade à moitié vide coûte aussi ses
// buvettes et sa boutique.

import { competitionDuClub } from '../data/clubs';
import { graine } from './championnat';
import { partQuiSeDeplace, total } from './supporters';
import type { Fanbase } from './supporters';

export type Tribune = 'populaire' | 'laterale' | 'centrale' | 'vip';
export const TRIBUNES: Tribune[] = ['populaire', 'laterale', 'centrale', 'vip'];

export type ProprieteStade = 'municipal' | 'loue' | 'club';

export interface Stade {
  nom: string;
  propriete: ProprieteStade;
  /** Les places par tribune. La somme fait la capacité. */
  places: Record<Tribune, number>;
  /** Le prix décidé par le club, par tribune. */
  prix: Record<Tribune, number>;
  // ── Les notes du stade, 0-100 ────────────────────────────────────────────
  confort: number;
  ambiance: number;
  accessibilite: number;
  securite: number;
  etat: number;
  /** Loyer annuel — nul quand le club est propriétaire. */
  loyer: number;
}

export function capacite(s: Stade): number {
  return TRIBUNES.reduce((t, k) => t + s.places[k], 0);
}

/**
 * LA RÉPARTITION DES PLACES PAR ÉTAGE.
 *
 * ⚠️ UN CLUB DE VILLAGE N'A PAS DE TRIBUNE VIP, et ce n'est pas un détail
 * cosmétique : c'est ce qui fait que le même stade rapporte trois fois plus en
 * Top 14. « Les clubs avec un stade moderne gagnent énormément plus qu'un club
 * ayant simplement beaucoup de places. » Les parts ci-dessous sont ce qui rend
 * cette phrase vraie dans les chiffres.
 */
const PARTS_PAR_NIVEAU: Record<number, Record<Tribune, number>> = {
  0: { populaire: 0.30, laterale: 0.42, centrale: 0.20, vip: 0.08 },
  1: { populaire: 0.30, laterale: 0.42, centrale: 0.20, vip: 0.08 },
  2: { populaire: 0.36, laterale: 0.42, centrale: 0.17, vip: 0.05 },
  3: { populaire: 0.45, laterale: 0.38, centrale: 0.14, vip: 0.03 },
  4: { populaire: 0.55, laterale: 0.33, centrale: 0.11, vip: 0.01 },
  5: { populaire: 0.62, laterale: 0.29, centrale: 0.09, vip: 0 },
  6: { populaire: 0.70, laterale: 0.24, centrale: 0.06, vip: 0 },
  7: { populaire: 0.78, laterale: 0.19, centrale: 0.03, vip: 0 },
  8: { populaire: 0.85, laterale: 0.15, centrale: 0, vip: 0 },
  9: { populaire: 0.90, laterale: 0.10, centrale: 0, vip: 0 },
  10: { populaire: 1, laterale: 0, centrale: 0, vip: 0 },
};

/** La capacité type d'un stade, par étage. */
const CAPACITE_PAR_NIVEAU: Record<number, [number, number]> = {
  0: [10_000, 30_000], 1: [11_000, 33_000], 2: [4_500, 14_000],
  3: [2_500, 9_000], 4: [1_400, 5_000], 5: [900, 3_500],
  6: [600, 2_400], 7: [400, 1_500], 8: [300, 1_100], 9: [250, 900], 10: [200, 700],
};

/** Le prix conseillé d'un billet, par tribune et par étage. */
export const PRIX_CONSEILLE: Record<number, Record<Tribune, number>> = {
  0: { populaire: 16, laterale: 28, centrale: 42, vip: 110 },
  1: { populaire: 16, laterale: 28, centrale: 42, vip: 110 },
  2: { populaire: 11, laterale: 19, centrale: 29, vip: 70 },
  3: { populaire: 8, laterale: 13, centrale: 19, vip: 45 },
  4: { populaire: 6, laterale: 10, centrale: 14, vip: 30 },
  5: { populaire: 5, laterale: 8, centrale: 11, vip: 22 },
  6: { populaire: 5, laterale: 7, centrale: 9, vip: 18 },
  7: { populaire: 4, laterale: 6, centrale: 8, vip: 15 },
  8: { populaire: 4, laterale: 5, centrale: 6, vip: 12 },
  9: { populaire: 3, laterale: 4, centrale: 5, vip: 10 },
  10: { populaire: 3, laterale: 4, centrale: 5, vip: 10 },
};

const cache = new Map<string, Stade>();

/**
 * LE STADE HISTORIQUE D'UN CLUB.
 *
 * ⚠️ LA PROPRIÉTÉ SUIT L'ÉTAGE, ET C'EST UNE VRAIE CONTRAINTE DE DÉBUT DE
 * CARRIÈRE. « Tu commences : stade municipal, 2 800 places, loyer 35 000 €/an. »
 * Un club amateur joue chez la commune : il paie un loyer, il ne touche pas tous
 * les revenus annexes, et il ne peut rien construire. C'est ce qui fait de la
 * construction d'un stade « un événement majeur dans une carrière » au lieu
 * d'une ligne de dépense parmi d'autres.
 */
export function stadeHistorique(club: string): Stade {
  const memo = cache.get(club);
  if (memo) return memo;
  const niveau = competitionDuClub(club)?.niveau ?? 8;
  const [bas, haut] = CAPACITE_PAR_NIVEAU[niveau] ?? [200, 700];
  const rng = graine(`stade#${club}`);
  const cap = Math.round(bas + rng() ** 1.5 * (haut - bas));
  const parts = PARTS_PAR_NIVEAU[niveau] ?? PARTS_PAR_NIVEAU[10];

  const places = {} as Record<Tribune, number>;
  for (const t of TRIBUNES) places[t] = Math.round(cap * parts[t]);

  // Le petit club joue chez la commune ; le gros club est chez lui.
  const tirPropriete = rng();
  const propriete: ProprieteStade = niveau <= 2
    ? (tirPropriete < 0.55 ? 'club' : 'loue')
    : niveau <= 4 ? (tirPropriete < 0.2 ? 'club' : tirPropriete < 0.6 ? 'loue' : 'municipal')
      : (tirPropriete < 0.12 ? 'loue' : 'municipal');

  const socle = Math.max(12, 92 - niveau * 8);
  const note = () => Math.max(5, Math.min(100, Math.round(socle + (rng() * 2 - 1) * 18)));

  const s: Stade = {
    nom: `Stade de ${club}`,
    propriete,
    places,
    prix: { ...(PRIX_CONSEILLE[niveau] ?? PRIX_CONSEILLE[10]) },
    confort: note(),
    // ⚠️ L'AMBIANCE NE SUIT PAS LE CONFORT — souvent l'inverse. Un vieux stade
    // debout et plein fait plus de bruit qu'une enceinte neuve à moitié vide, et
    // c'est ce qui laisse un petit club avoir quelque chose que l'argent
    // n'achète pas.
    ambiance: Math.max(15, Math.min(100, Math.round(52 + (rng() * 2 - 1) * 34))),
    accessibilite: note(),
    securite: note(),
    etat: Math.max(20, Math.min(100, Math.round(70 + (rng() * 2 - 1) * 26))),
    loyer: propriete === 'municipal' ? Math.round(cap * 9) : propriete === 'loue' ? Math.round(cap * 26) : 0,
  };
  cache.set(club, s);
  return s;
}

// ---------------------------------------------------------------------------
// LA DEMANDE
// ---------------------------------------------------------------------------
// « Demande = base supporters × réputation × forme × importance match ×
//   adversaire × météo × horaire × prix × confort »

export interface ContexteAffiche {
  /** 0-100 : la force de l'adversaire — une belle affiche remplit. */
  adversaire: number;
  /** 0-100 : la forme du moment de l'équipe. */
  forme: number;
  /** Derby, phase finale, match de gala. */
  importance: 'ordinaire' | 'belle' | 'derby' | 'decisif';
  meteo: 'beau' | 'couvert' | 'pluie';
  horaire: 'samediSoir' | 'samediApresMidi' | 'dimanche' | 'semaine';
}

const IMPORTANCE = { ordinaire: 0.94, belle: 1.10, derby: 1.35, decisif: 1.28 };
const METEO = { beau: 1.05, couvert: 1.0, pluie: 0.88 };
const HORAIRE = { samediSoir: 1.15, samediApresMidi: 1.05, dimanche: 0.90, semaine: 0.80 };

/**
 * ⚠️ L'ÉLASTICITÉ AU PRIX EST LE CŒUR DU LOT. Sans elle, il n'y a pas de
 * « vrai problème d'optimisation » : on mettrait le prix maximal et on
 * encaisserait. Ici, doubler le prix par rapport au tarif conseillé fait fondre
 * la demande d'environ 45 % — assez pour que la recette totale ait un optimum
 * quelque part au milieu, et que cet optimum dépende du confort du stade et de
 * la ferveur du public.
 *
 * ⚠️ ET LE NOYAU DUR EST BEAUCOUP MOINS SENSIBLE. Il vient au prix qu'on lui
 * demande. C'est ce qui fait qu'un club populaire peut se permettre une
 * politique tarifaire qu'un club à la mode ne peut pas.
 */
export function elasticite(prix: number, conseille: number, partDure: number): number {
  if (conseille <= 0) return 1;
  const ratio = prix / conseille;
  // ⚠️ LA SENSIBILITÉ CROÎT AVEC LA HAUSSE, et c'est ce qui crée l'optimum.
  // Avec une élasticité constante sous 1, la recette monte indéfiniment avec le
  // prix : mesuré, la meilleure recette était au prix le plus haut testé, et il
  // n'y avait donc aucune décision à prendre — juste un curseur à pousser. Un
  // public tolère 20 % d'augmentation ; il ne tolère pas qu'on triple.
  const base = 0.85 - partDure * 0.4;
  const sensibilite = base * (1 + Math.max(0, ratio - 1) * 0.55);
  return Math.max(0.05, Math.min(1.7, ratio ** -sensibilite));
}

export interface Affluence {
  parTribune: Record<Tribune, number>;
  total: number;
  /** Ceux qui auraient voulu venir mais n'ont pas trouvé de place. */
  refuses: number;
  tauxRemplissage: number;
}

/**
 * COMBIEN DE MONDE VIENT VRAIMENT.
 *
 * ⚠️ LA DEMANDE SE CALCULE TRIBUNE PAR TRIBUNE, pas en bloc. Un club qui casse
 * le prix de sa populaire et garde une centrale hors de prix doit remplir l'une
 * et pas l'autre — c'est précisément ce que « politique tarifaire » veut dire.
 * Une demande globale répartie au prorata aurait rendu les quatre prix
 * interchangeables.
 */
export function affluence(
  stade: Stade,
  fanbase: Fanbase,
  niveau: number,
  ctx: ContexteAffiche,
  reputation: number,
): Affluence {
  const n = total(fanbase);
  const base = n * partQuiSeDeplace(n);
  const partDure = fanbase.hardcore / Math.max(1, n);
  const conseille = PRIX_CONSEILLE[niveau] ?? PRIX_CONSEILLE[10];

  const commun = (0.55 + reputation / 220)
    * (0.80 + ctx.forme / 250)
    * (0.75 + ctx.adversaire / 200)
    * IMPORTANCE[ctx.importance]
    * METEO[ctx.meteo]
    * HORAIRE[ctx.horaire]
    * (0.82 + stade.confort / 320 + stade.accessibilite / 420);

  const parTribune = {} as Record<Tribune, number>;
  let venus = 0; let refuses = 0;
  for (const t of TRIBUNES) {
    if (stade.places[t] <= 0) { parTribune[t] = 0; continue; }
    const partDeLaTribune = stade.places[t] / Math.max(1, capacite(stade));
    const veulent = base * commun * partDeLaTribune
      * elasticite(stade.prix[t], conseille[t], partDure);
    const places = Math.min(stade.places[t], Math.round(veulent));
    parTribune[t] = places;
    venus += places;
    refuses += Math.max(0, Math.round(veulent) - places);
  }
  return {
    parTribune,
    total: venus,
    refuses,
    tauxRemplissage: Math.round((venus / Math.max(1, capacite(stade))) * 100),
  };
}

// ---------------------------------------------------------------------------
// LE COMPTE D'EXPLOITATION D'UN JOUR DE MATCH
// ---------------------------------------------------------------------------

/** Les niveaux d'équipement qui transforment un spectateur en chiffre d'affaires. */
export interface EquipementsStade {
  /** 0-5 : nombre et qualité des points de vente. */
  buvettes: number;
  boutique: number;
  parking: number;
  /** 0-5 : loges et salons. */
  hospitalites: number;
}

/**
 * ⚠️ LA CAPACITÉ DE SERVICE EST LA MÉCANIQUE QUI REND LES BUVETTES
 * INTÉRESSANTES. « Tu as 15 000 supporters mais seulement 3 buvettes ? ⚠️ Files
 * d'attente très importantes · Revenus potentiels perdus ~31 000 €. » Sans ce
 * plafond, une buvette de niveau 1 encaisserait autant qu'un niveau 5 dans un
 * stade plein : améliorer n'aurait aucun intérêt, et le levier le plus important
 * d'un club amateur n'existerait pas.
 */
const DEPENSE_BUVETTE = [0, 2.7, 4.0, 5.4, 7.2, 9.0];
const SERVIS_PAR_NIVEAU = [0, 1_400, 3_200, 6_000, 11_000, 20_000];
const DEPENSE_BOUTIQUE = [0, 0.9, 1.6, 2.4, 3.4, 4.6];
const DEPENSE_PARKING = [0, 0.4, 0.7, 1.0, 1.4, 1.9];
/** Une loge, c'est douze personnes, et ça se vend à la saison. */
export const LOGES_PAR_NIVEAU = [0, 2, 5, 10, 18, 30];

export interface ResultatJourDeMatch {
  billetterie: number;
  buvettes: number;
  boutique: number;
  parking: number;
  vip: number;
  chiffreAffaires: number;
  couts: number;
  resultat: number;
  /** Ce que les files d'attente ont fait perdre. */
  perduEnFiles: number;
  affluence: Affluence;
}

/**
 * ⚠️ LES COÛTS SUIVENT L'AFFLUENCE, PAS LA CAPACITÉ. Sécurité, personnel,
 * nettoyage : on ouvre les tribunes qu'on remplit. Des coûts fixes sur la
 * capacité auraient puni un club qui agrandit son stade même les soirs où il le
 * remplit, ce qui aurait rendu tout agrandissement absurde.
 */
export function jourDeMatch(
  stade: Stade,
  eq: EquipementsStade,
  aff: Affluence,
  notoriete: number,
): ResultatJourDeMatch {
  let billetterie = 0;
  for (const t of TRIBUNES) billetterie += aff.parTribune[t] * stade.prix[t];

  const servis = Math.min(aff.total, SERVIS_PAR_NIVEAU[eq.buvettes] ?? 0);
  const parTete = DEPENSE_BUVETTE[eq.buvettes] ?? 0;
  const buvettes = servis * parTete;
  const perduEnFiles = Math.round((aff.total - servis) * parTete);

  // La boutique vend d'autant mieux que le club est connu.
  const boutique = aff.total * (DEPENSE_BOUTIQUE[eq.boutique] ?? 0) * (0.6 + notoriete / 140);
  const parking = aff.total * (DEPENSE_PARKING[eq.parking] ?? 0);
  // Le VIP se compte en loges vendues à la saison, ramenées au match.
  const vip = aff.parTribune.vip * stade.prix.vip;

  const chiffreAffaires = billetterie + buvettes + boutique + parking + vip;
  // ~3,1 € par spectateur en sécurité, personnel, nettoyage et organisation,
  // plus une part fixe qui dépend de la taille de l'enceinte.
  const couts = aff.total * 3.1 + capacite(stade) * 0.55;

  return {
    billetterie: Math.round(billetterie),
    buvettes: Math.round(buvettes),
    boutique: Math.round(boutique),
    parking: Math.round(parking),
    vip: Math.round(vip),
    chiffreAffaires: Math.round(chiffreAffaires),
    couts: Math.round(couts),
    resultat: Math.round(chiffreAffaires - couts),
    perduEnFiles,
    affluence: aff,
  };
}

// ---------------------------------------------------------------------------
// LES ABONNEMENTS
// ---------------------------------------------------------------------------
// « Avantage : argent immédiatement pendant l'été. Mais une place abonnée
// rapporte potentiellement moins qu'une place vendue individuellement. Encore un
// choix. »

export interface CampagneAbonnements {
  /** Le prix demandé par tribune pour la saison entière. */
  prix: Record<Tribune, number>;
  abonnes: Record<Tribune, number>;
  recette: number;
  /** Combien de matchs il aurait fallu vendre pour faire autant. */
  equivalentMatchs: number;
}

/**
 * ⚠️ LE VRAI ARBITRAGE EST ENTRE LA TRÉSORERIE ET LA RECETTE. Un abonnement se
 * vend l'équivalent de 13 à 15 matchs pour une saison qui en compte plus : le
 * club perd de la marge et gagne de l'argent en juillet, quand il en a besoin
 * pour recruter. C'est exactement l'arbitrage décrit, et il n'existe que si le
 * tarif conseillé est SOUS le prix unitaire × le nombre de matchs.
 */
export const MATCHS_PAYANTS_PAR_SAISON = 15;

export function campagneAbonnements(
  stade: Stade,
  fanbase: Fanbase,
  prix: Record<Tribune, number>,
): CampagneAbonnements {
  const n = total(fanbase);
  const partDure = fanbase.hardcore / Math.max(1, n);
  const abonnes = {} as Record<Tribune, number>;
  let recette = 0;
  for (const t of TRIBUNES) {
    if (stade.places[t] <= 0) { abonnes[t] = 0; continue; }
    // On s'abonne d'autant plus qu'on est du noyau dur, et d'autant moins que le
    // prix s'éloigne de l'équivalent de quinze matchs.
    const juste = stade.prix[t] * MATCHS_PAYANTS_PAR_SAISON;
    const attrait = elasticite(prix[t], Math.max(1, juste), partDure);
    const candidats = (fanbase.hardcore * 0.55 + fanbase.reguliers * 0.22)
      * (stade.places[t] / Math.max(1, capacite(stade)));
    abonnes[t] = Math.min(stade.places[t], Math.round(candidats * attrait));
    recette += abonnes[t] * prix[t];
  }
  const parMatch = TRIBUNES.reduce((s, t) => s + abonnes[t] * stade.prix[t], 0);
  return {
    prix,
    abonnes,
    recette: Math.round(recette),
    equivalentMatchs: parMatch > 0 ? Math.round((recette / parMatch) * 10) / 10 : 0,
  };
}

/** Ce que coûte le stade au club chaque saison, hors jour de match. */
export function chargesDuStade(stade: Stade): number {
  const entretien = stade.propriete === 'club'
    ? Math.round(capacite(stade) * 22 * (1.4 - stade.etat / 160))
    : Math.round(capacite(stade) * 5);
  return entretien + stade.loyer;
}

export function oublierStades(): void {
  cache.clear();
}
