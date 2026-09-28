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
export interface PageOffresSolo { offres: OffreSolo[]; total: number; }

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
