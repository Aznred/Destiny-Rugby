// ═══════════════════════════════════════════════════════════════════════════
// LES FINANCES DU CLUB — d'où vient l'argent, et où il part
// ═══════════════════════════════════════════════════════════════════════════
// Demande : un écran FINANCES avec neuf lignes de revenus et neuf lignes de
// dépenses, et surtout « une énorme différence entre Régionale et Top 14 […] le
// joueur ressent alors réellement la montée du club ».
//
// ⚠️ CE FICHIER PRODUIT LE BUDGET, IL NE LE DÉCLARE PLUS. `lib/economie.ts`
// donne une fourchette de budget par étage (20 à 55 M€ en Top 14, 20 à 100 k€ en
// Régionale 3) : c'était une table posée à plat. Ici, ces montants sont le
// RÉSULTAT de ce que le club vend — billets, maillots, panneaux publicitaires,
// droits télé. La table reste la CIBLE D'ÉTALONNAGE, et `verifClubEconomie.ts`
// vérifie qu'on retombe dedans à tous les étages. Deux avantages : les chiffres
// deviennent explicables à l'écran, et améliorer une buvette change vraiment
// quelque chose.
//
// ⚠️ ET LES TROIS BOUCLES SE REFERMENT ICI. Les résultats font la fanbase
// (`lib/supporters.ts`), la fanbase fait les recettes (ce fichier), les recettes
// paient l'effectif et les murs (`lib/infrastructuresClub.ts`), et l'effectif
// refait les résultats. Aucune ligne de revenu ne contourne la fanbase — sinon
// une des trois boucles serait ouverte, et l'ensemble ne tiendrait pas.

import { graine } from './championnat.js';
import { notorieteDuClub, total } from './supporters.js';
import type { Fanbase } from './supporters.js';
import { MATCHS_PAYANTS_PAR_SAISON, capacite, chargesDuStade } from './stade.js';
import type { Stade } from './stade.js';

// ---------------------------------------------------------------------------
// LES DROITS TÉLÉ
// ---------------------------------------------------------------------------
// « Je ne laisserais pas le joueur contrôler ça. Chaque championnat distribue
// automatiquement de l'argent. » Et : « ça rend la promotion extrêmement
// importante financièrement ».

const TV_PAR_NIVEAU: Record<number, [number, number]> = {
  0: [3_000_000, 8_000_000], 1: [5_000_000, 10_000_000], 2: [1_500_000, 4_000_000],
  3: [100_000, 500_000], 4: [25_000, 90_000], 5: [6_000, 25_000],
  6: [2_000, 9_000], 7: [0, 3_000], 8: [0, 0], 9: [0, 0], 10: [0, 0],
};

/**
 * ⚠️ LA MARCHE ENTRE DEUX ÉTAGES EST BRUTALE, ET C'EST VOULU. Passer de
 * Nationale à Pro D2 multiplie la redistribution par dix. C'est ce qui rend une
 * montée « extrêmement importante financièrement » — et une descente
 * potentiellement mortelle quand on vient d'emprunter pour un stade.
 */
export function droitsTV(club: string, niveau: number, rang: number, taillePoule: number): number {
  const [bas, haut] = TV_PAR_NIVEAU[niveau] ?? [0, 0];
  if (haut === 0) return 0;
  // Part fixe (70 %) + part au classement (30 %) : tout le monde touche, les
  // premiers touchent plus.
  const part = 1 - (rang - 1) / Math.max(1, taillePoule - 1);
  const rng = graine(`tv#${club}#${niveau}`);
  const brut = bas + (haut - bas) * (0.30 + rng() * 0.35 + part * 0.35);
  return Math.round(brut / 1_000) * 1_000;
}

// ---------------------------------------------------------------------------
// LE SPONSORING
// ---------------------------------------------------------------------------

export type EmplacementSponsor =
  | 'principal' | 'equipementier' | 'manche' | 'dos' | 'short'
  | 'naming' | 'locaux' | 'premium';

export const EMPLACEMENTS: EmplacementSponsor[] = [
  'principal', 'equipementier', 'manche', 'dos', 'short', 'naming', 'locaux', 'premium',
];

/** La part de la recette totale de sponsoring que vaut chaque emplacement. */
const POIDS_EMPLACEMENT: Record<EmplacementSponsor, number> = {
  principal: 0.34, equipementier: 0.16, manche: 0.08, dos: 0.07,
  short: 0.05, naming: 0.14, locaux: 0.10, premium: 0.06,
};

export interface OffreSponsor {
  emplacement: EmplacementSponsor;
  /** Le fixe garanti chaque saison. */
  fixe: number;
  /** Ce qui tombe en plus si l'objectif est atteint. */
  bonusTop6: number;
  bonusTitre: number;
  duree: number;
}

/**
 * CE QUE LE SPONSORING RAPPORTE À CE CLUB.
 *
 * ⚠️ IL SUIT LA NOTORIÉTÉ, DONC LA FANBASE, DONC LES RÉSULTATS. Un annonceur
 * achète une audience : c'est le seul lien qui rende la boucle cohérente. Le
 * calculer sur la division aurait fait d'un promu fauché l'égal d'un club
 * historique, et la notion de « construire un club » n'aurait plus eu de sens.
 *
 * ⚠️ ET LE NAMING N'EXISTE QUE SI LE CLUB EST CHEZ LUI. On ne vend pas le nom
 * d'un stade municipal — c'est l'un des vrais avantages de la propriété, et
 * c'est ce qui aide à financer une construction.
 */
export function sponsoringTotal(
  club: string,
  fanbase: Fanbase,
  saison: number,
  stade: Stade,
): number {
  const notoriete = notorieteDuClub(club, saison, fanbase);
  const n = total(fanbase);
  const rng = graine(`sponsors#${club}#${saison}`);
  // ⚠️ COURBE PUISSANCE, PAS LINÉAIRE. Le sponsoring d'un club de Top 14 n'est
  // pas cent fois celui d'un club de Fédérale parce qu'il a cent fois plus de
  // supporters : il est mille fois plus grand, parce que la valeur d'une
  // audience croît plus vite que sa taille. C'est ce qui creuse l'écart entre
  // les étages, exactement comme la demande le décrit.
  // ⚠️ ET IL S'AMORTIT TOUT EN HAUT. Sans ce frein, le sponsoring d'un club de
  // Top 14 ressortait à 21,6 M€ sur 37 M€ de recettes — 58 % du budget, contre
  // ~28 % dans la réalité et dans l'exemple de la demande. Le frein ne mord
  // qu'au-dessus de quelques dizaines de milliers de supporters : le bas de la
  // pyramide, où le sponsoring local fait vivre le club, n'est pas touché.
  const frein = (1 + n / 45_000) ** 0.95;
  const brut = 62 * n ** 1.16 * (0.55 + notoriete / 130) * (0.82 + rng() * 0.36) / frein;
  const sansNaming = stade.propriete === 'club' ? 1 : 1 - POIDS_EMPLACEMENT.naming;
  return Math.round((brut * sansNaming) / 1_000) * 1_000;
}

/**
 * LES TROIS OFFRES POUR UN EMPLACEMENT.
 *
 * Demande : « Offre A 2,4 M€/an sur 4 ans · Offre B 1,9 M€/an +400k si Top 6
 * +600k si champion · Offre C 2,1 M€/an sur 2 ans. Tu dois choisir entre
 * sécurité et bonus de performance. »
 *
 * ⚠️ L'ESPÉRANCE DES TROIS EST VOISINE — sinon il n'y a pas de choix, juste une
 * bonne réponse. Ce qui les sépare, c'est le RISQUE et la DURÉE : un club qui
 * vise la montée prend les bonus, un club qui vient d'emprunter pour son stade
 * prend le fixe long.
 */
export function offresPour(
  club: string,
  emplacement: EmplacementSponsor,
  totalSponsoring: number,
  saison: number,
): OffreSponsor[] {
  const valeur = totalSponsoring * POIDS_EMPLACEMENT[emplacement];
  const rng = graine(`offreSponsor#${club}#${emplacement}#${saison}`);
  const arrondi = (v: number) => Math.round(v / 1_000) * 1_000;
  return [
    { emplacement, fixe: arrondi(valeur * (0.98 + rng() * 0.06)), bonusTop6: 0, bonusTitre: 0, duree: 4 },
    {
      emplacement,
      // ⚠️ L'ESPÉRANCE DOIT ÊTRE VOISINE DES DEUX AUTRES. À 0,78 de fixe, l'offre
      // à bonus valait 19 % de moins que l'offre sèche : ce n'était plus un
      // arbitrage entre sécurité et performance, c'était un piège.
      fixe: arrondi(valeur * 0.86),
      bonusTop6: arrondi(valeur * 0.22),
      bonusTitre: arrondi(valeur * 0.34),
      duree: 3,
    },
    { emplacement, fixe: arrondi(valeur * (1.04 + rng() * 0.08)), bonusTop6: 0, bonusTitre: 0, duree: 2 },
  ];
}

// ---------------------------------------------------------------------------
// LE MERCHANDISING
// ---------------------------------------------------------------------------
// « Les ventes dépendent de : nombre supporters × réputation × résultats ×
// joueurs stars. Tu signes une énorme star : +22 %. Tu remportes le Top 14 :
// +37 %. Tu descends : −28 %. »

export interface ContexteMerch {
  /** La note du meilleur joueur de l'effectif. */
  meilleurJoueur: number;
  titre: boolean;
  monte: boolean;
  descend: boolean;
  /** 0-5 : le niveau de la boutique. */
  boutique: number;
}

export function merchandising(
  club: string,
  fanbase: Fanbase,
  saison: number,
  ctx: ContexteMerch,
): number {
  const n = total(fanbase);
  const notoriete = notorieteDuClub(club, saison, fanbase);
  let facteur = 1;
  // ⚠️ UNE STAR NE VEND QUE SI ELLE EST VRAIMENT UNE STAR. Le seuil est haut
  // (88) : sans lui, chaque recrue correcte aurait donné +22 % et le
  // merchandising serait devenu une deuxième prime de transfert.
  if (ctx.meilleurJoueur >= 88) facteur += 0.22;
  else if (ctx.meilleurJoueur >= 82) facteur += 0.09;
  if (ctx.titre) facteur += 0.37;
  if (ctx.monte) facteur += 0.18;
  if (ctx.descend) facteur -= 0.28;
  const parSupporter = 2.4 * (0.35 + ctx.boutique * 0.22) * (0.5 + notoriete / 120);
  return Math.round((n * parSupporter * Math.max(0.4, facteur)) / 1_000) * 1_000;
}

// ---------------------------------------------------------------------------
// LE COMPTE DE RÉSULTAT DE LA SAISON
// ---------------------------------------------------------------------------

export interface Revenus {
  sponsoring: number;
  tv: number;
  billetterie: number;
  hospitalites: number;
  merchandising: number;
  restauration: number;
  formation: number;
  primes: number;
  autres: number;
}

export interface Depenses {
  salairesJoueurs: number;
  staff: number;
  deplacements: number;
  stade: number;
  formation: number;
  entrainement: number;
  marketing: number;
  dette: number;
  administration: number;
}

export interface CompteDeResultat {
  revenus: Revenus;
  depenses: Depenses;
  totalRevenus: number;
  totalDepenses: number;
  resultat: number;
}

export function sommeRevenus(r: Revenus): number {
  return Object.values(r).reduce((a, b) => a + b, 0);
}
export function sommeDepenses(d: Depenses): number {
  return Object.values(d).reduce((a, b) => a + b, 0);
}

/**
 * LES RECETTES QU'UN CLUB AMATEUR TIRE D'AILLEURS QUE DU SPECTACLE.
 *
 * ⚠️ SANS CETTE LIGNE, LE BAS DE LA PYRAMIDE NE TIENT PAS DEBOUT. Un club de
 * Régionale 3 avec cent spectateurs à 3 € encaisse quatre mille euros de
 * billetterie sur une saison — très loin des 20 à 100 k€ que la table
 * économique lui donne, et très loin de la réalité. Ce qui fait vivre ces
 * clubs, ce sont les licences, la subvention municipale, le loto, les repas et
 * la troisième mi-temps. On le compte, parce que c'est vrai et parce que sans
 * ça le club de village serait injouable.
 *
 * ⚠️ ET ÇA S'ÉTEINT EN MONTANT : un club de Top 14 ne vit pas du loto.
 */
export function recettesAssociatives(niveau: number, fanbase: Fanbase, licencies: number): number {
  if (niveau <= 3) return Math.round(licencies * 60);
  // ⚠️ ERREUR DE SIGNE, TROUVÉE À LA MESURE. La première version écrivait
  // `190 + (niveau − 4) × 24`, c'est-à-dire PLUS d'argent par licencié à mesure
  // qu'on DESCEND : 334 € en Régionale 3 contre 214 € en Fédérale 1. L'intention
  // était juste — plus on descend, plus la PART des licences est grande — mais
  // cette part grandit toute seule parce que les autres recettes s'effondrent.
  // En euros, c'est l'inverse : un club de Nationale 2 fait payer une cotisation
  // de club à section, un club de village fait payer une licence.
  //
  // Conséquence mesurée : la Fédérale 1 sortait à 330 k€ pour une bande à
  // 400 k€–1,5 M€, et la Régionale 3 à 100 k€ pour un plafond à 100 k€.
  const parLicencie = niveau <= 6 ? 380 : 235;
  // La subvention municipale suit la même logique : une commune soutient un club
  // qui emploie et qui remplit ses tribunes, pas un club de quinze bénévoles.
  const subvention = Math.max(0, 30_000 - (niveau - 4) * 4_200);
  // Loto, repas de club, troisième mi-temps : ça suit la communauté.
  const evenements = total(fanbase) * 26;
  return Math.round(licencies * parLicencie + subvention + evenements);
}

/** Le nombre de licenciés d'un club — l'assiette des recettes associatives. */
export function licencies(club: string, niveau: number): number {
  const rng = graine(`licencies#${club}`);
  const base = niveau <= 2 ? 420 : niveau <= 4 ? 300 : niveau <= 6 ? 230 : 170;
  return Math.round(base * (0.6 + rng() * 0.9));
}

export interface ContexteSaisonFinances {
  club: string;
  niveau: number;
  saison: number;
  fanbase: Fanbase;
  stade: Stade;
  /** Le cumul des jours de match de la saison. */
  billetterie: number;
  hospitalites: number;
  restauration: number;
  boutiqueJourDeMatch: number;
  coutsJourDeMatch: number;
  rang: number;
  taillePoule: number;
  masseSalariale: number;
  /** Ce qui reste à rembourser cette saison sur un emprunt. */
  annuiteDette: number;
  merch: ContexteMerch;
  /** Indemnités de formation encaissées, transferts nets. */
  formation: number;
  primes: number;
}

/**
 * LE COMPTE DE RÉSULTAT COMPLET.
 *
 * ⚠️ LES DÉPENSES SUIVENT L'ÉTAGE, PAS UN POURCENTAGE DES RECETTES. Un club qui
 * double ses recettes ne double pas ses frais de déplacement : c'est ce qui rend
 * une bonne gestion payante, et c'est aussi ce qui permet à un club bien géré de
 * Fédérale de dégager de quoi construire.
 */
export function compteDeResultat(c: ContexteSaisonFinances): CompteDeResultat {
  const revenus: Revenus = {
    sponsoring: sponsoringTotal(c.club, c.fanbase, c.saison, c.stade),
    tv: droitsTV(c.club, c.niveau, c.rang, c.taillePoule),
    billetterie: Math.round(c.billetterie),
    hospitalites: Math.round(c.hospitalites),
    merchandising: merchandising(c.club, c.fanbase, c.saison, c.merch) + Math.round(c.boutiqueJourDeMatch),
    restauration: Math.round(c.restauration),
    formation: Math.round(c.formation),
    primes: Math.round(c.primes),
    autres: recettesAssociatives(c.niveau, c.fanbase, licencies(c.club, c.niveau)),
  };

  const echelle = Math.max(1, sommeRevenus(revenus));
  const depenses: Depenses = {
    salairesJoueurs: Math.round(c.masseSalariale),
    // Le staff coûte environ un tiers de la masse joueurs.
    staff: Math.round(c.masseSalariale * 0.30 + 12_000),
    deplacements: Math.round(4_000 + Math.max(0, 9 - c.niveau) * 22_000),
    stade: Math.round(chargesDuStade(c.stade) + c.coutsJourDeMatch),
    formation: Math.round(echelle * 0.055),
    entrainement: Math.round(echelle * 0.030),
    marketing: Math.round(echelle * 0.024),
    dette: Math.round(c.annuiteDette),
    administration: Math.round(echelle * 0.042 + 8_000),
  };

  const totalRevenus = sommeRevenus(revenus);
  const totalDepenses = sommeDepenses(depenses);
  return { revenus, depenses, totalRevenus, totalDepenses, resultat: totalRevenus - totalDepenses };
}

/**
 * LE « BUDGET DU CLUB » AU SENS DE `lib/economie.ts`.
 *
 * ⚠️ C'EST LE PONT ENTRE LES DEUX SYSTÈMES, et il n'y en a qu'un. Le reste du
 * jeu (marché, salary cap, enveloppes) raisonne sur un budget ; ce lot le
 * PRODUIT au lieu de le déclarer. Tant que ce pont existe, on peut remplacer la
 * table à plat par les recettes réelles sans rien casser ailleurs.
 */
export function budgetDepuisLesRecettes(cr: CompteDeResultat): number {
  return cr.totalRevenus;
}

/** Un repère lisible : combien pèse une place vide sur la saison. */
export function manqueAGagner(stade: Stade, tauxRemplissageMoyen: number): number {
  const vides = capacite(stade) * (1 - tauxRemplissageMoyen / 100);
  const prixMoyen = (stade.prix.populaire + stade.prix.laterale) / 2;
  return Math.round(vides * prixMoyen * MATCHS_PAYANTS_PAR_SAISON);
}
