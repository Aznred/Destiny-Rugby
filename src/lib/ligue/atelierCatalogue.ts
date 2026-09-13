import type { PackCarriere } from './typesCarriere.js';

export interface EditionJoueur { note: number; potentiel: number; photo?: string; nation?: string; clubReel?: string; championnat?: string }
export interface CatalogueAdmin {
  revision: number;
  /** Les packs spéciaux ne tournent dans les boutiques que si Kiri l'active. */
  rotationPacks: boolean;
  packs: Record<string, PackCarriere>;
  joueurs: Record<string, EditionJoueur>;
}
export const CATALOGUE_ADMIN_VIDE: CatalogueAdmin = { revision: 0, rotationPacks: false, packs: {}, joueurs: {} };
// Le serveur fournit un contexte par requête ; aucun réglage mutable partagé
// entre deux requêtes concurrentes. Le navigateur garde le catalogue de base.
let contexte = () => CATALOGUE_ADMIN_VIDE;
export function fournirCatalogueAdmin(fournisseur: () => CatalogueAdmin) { contexte = fournisseur; }
export function catalogueAdmin() { return contexte(); }
