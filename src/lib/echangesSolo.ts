import type { EtatCollectionSolo } from './collectionSolo.js';

export type LotCartesSolo = Record<string, number>;
export interface PropositionSolo {
  id: string; compteId: string; pseudo: string; cartes: LotCartesSolo; creeLe: string;
}
export interface OffreSolo {
  id: string; compteId: string; pseudo: string; offertes: LotCartesSolo;
  souhaitees: LotCartesSolo; propositions: PropositionSolo[];
  creeLe: string; statut: 'ouverte' | 'acceptee' | 'annulee';
}
export interface PageOffresSolo {
  offres: OffreSolo[]; total: number;
  /** Ce qui me concerne, quelle que soit la page affichée (absent d'un serveur d'avant le Correctif 26). */
  suivi?: SuiviEchangesSolo | null;
  /** Ma collection telle que le serveur la connaît, quand elle est plus récente que la mienne (un échange conclu). */
  collectionSolo?: EtatCollectionSolo;
}

/**
 * CE QUI ME CONCERNE DANS LA BOURSE (Correctif 26).
 *
 * Une proposition reçue n'apparaissait que sous l'offre visée, dans une liste paginée par date : sur la troisième
 * page, son auteur ne la voyait jamais. Et celui qui l'avait envoyée n'en gardait AUCUNE trace à l'écran — il la
 * renvoyait, le serveur la refusait (« déjà proposé »), et la fonction semblait ne pas marcher.
 * - `recues` : mes offres ouvertes qui ont reçu au moins une proposition ;
 * - `envoyees` : les offres ouvertes des autres où j'ai une proposition en attente.
 */
export interface SuiviEchangesSolo { recues: OffreSolo[]; envoyees: OffreSolo[]; }

/** Ce qu'une action vient de changer : l'écran met à jour ses listes sans rien recharger. */
export type EvenementEchangeSolo =
  | 'tradeCreated' | 'tradeProposed' | 'tradeAccepted' | 'tradeRefused' | 'tradeCancelled' | 'tradeWithdrawn';
export interface DeltaEchangeSolo {
  evenement: EvenementEchangeSolo;
  offreId: string;
  /** L'offre touchée, telle que JE la vois après l'action (`null` : elle n'est plus visible). */
  offre: OffreSolo | null;
  suivi: SuiviEchangesSolo | null;
}

/**
 * Les cartes déjà ENGAGÉES dans mes propositions en attente.
 * ⚠️ Une proposition ne déplace rien : la carte reste chez moi jusqu'à l'acceptation (jamais dans deux collections).
 * Mais le même doublon ne peut pas être promis à deux joueurs à la fois.
 */
export function cartesEngagees(suivi: SuiviEchangesSolo | null | undefined, compte: string): LotCartesSolo {
  const lot: LotCartesSolo = {};
  for (const offre of suivi?.envoyees ?? []) {
    for (const p of offre.propositions) {
      if (p.compteId !== compte) continue;
      for (const [cle, n] of Object.entries(p.cartes)) lot[cle] = (lot[cle] ?? 0) + n;
    }
  }
  return lot;
}

/** Le lot est-il proposable : des doublons que je possède, une fois retirés ceux déjà promis ailleurs ? */
export function doublonsLibres(collection: EtatCollectionSolo, lot: LotCartesSolo, engagees: LotCartesSolo): boolean {
  return Object.entries(lot).every(([cle, nombre]) => (collection.quantites[cle] ?? 0) - (engagees[cle] ?? 0) > nombre);
}

/** Applique un delta à la page affichée : l'offre touchée est remplacée, ajoutée en tête ou retirée. */
export function appliquerDeltaEchange(page: PageOffresSolo, delta: DeltaEchangeSolo, compte: string): PageOffresSolo {
  const presente = page.offres.some(o => o.id === delta.offreId);
  const visible = !!delta.offre && (delta.offre.statut === 'ouverte' || delta.offre.compteId === compte);
  let offres = page.offres;
  let total = page.total;
  if (visible && presente) offres = offres.map(o => (o.id === delta.offreId ? delta.offre! : o));
  else if (visible && delta.evenement === 'tradeCreated') { offres = [delta.offre!, ...offres]; total += 1; }
  else if (!visible && presente) { offres = offres.filter(o => o.id !== delta.offreId); total = Math.max(0, total - 1); }
  return { ...page, offres, total, suivi: delta.suivi ?? page.suivi };
}

/** Un lot limité permet plusieurs cartes sans transformer une requête en inventaire complet. */
export function lotCartesSolo(valeur: unknown, clesValides: ReadonlySet<string>, vide = false): LotCartesSolo {
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) throw new Error('Lot de cartes invalide.');
  const entrees = Object.entries(valeur as Record<string, unknown>);
  if (entrees.length > 10 || (!vide && !entrees.length)) throw new Error('Choisissez entre 1 et 10 cartes.');
  const lot: LotCartesSolo = {};
  let nombre = 0;
  for (const [cle, quantite] of entrees) {
    if (!clesValides.has(cle) || !Number.isInteger(quantite) || Number(quantite) < 1 || Number(quantite) > 20) throw new Error('Carte ou quantité invalide.');
    lot[cle] = Number(quantite); nombre += lot[cle];
  }
  if (nombre > 20) throw new Error('Un échange ne peut contenir que 20 cartes.');
  return lot;
}

export function possedeDoublons(collection: EtatCollectionSolo, lot: LotCartesSolo): boolean {
  return Object.entries(lot).every(([cle, nombre]) => (collection.quantites[cle] ?? 0) > nombre);
}

export function modifierCollectionSolo(collection: EtatCollectionSolo, lot: LotCartesSolo, signe: -1 | 1): EtatCollectionSolo {
  const quantites = { ...collection.quantites };
  for (const [cle, nombre] of Object.entries(lot)) {
    const nouveau = (quantites[cle] ?? 0) + signe * nombre;
    if (nouveau < 0) throw new Error('Cartes insuffisantes.');
    if (nouveau) quantites[cle] = nouveau; else delete quantites[cle];
  }
  return { ...collection, quantites,
    doublons: Object.values(quantites).reduce((somme, n) => somme + Math.max(0, n - 1), 0),
    revision: (collection.revision ?? 0) + 1 };
}
