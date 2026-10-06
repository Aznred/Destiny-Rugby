import type { PosteId } from '../../types.js';
import type { ConfigCartesSpeciales } from './cartesSpeciales.js';
import type { AjoutJoueur, DecisionImport } from './importsJoueurs.js';
import type { PackCarriere } from './typesCarriere.js';

export interface EditionJoueur {
  note: number;
  potentiel: number;
  photo?: string;
  nation?: string;
  clubReel?: string;
  championnat?: string;
  poste?: PosteId;
  postesSecondaires?: PosteId[];
}
/**
 * UN COSMÉTIQUE CRÉÉ DANS LE LABO (Correctif 21) : le catalogue de la boutique s'enrichit sans toucher au code. Même forme qu'un article du code
 * (`ArticleEquipement`), validée côté serveur (`validerArticleLabo`) : prix par monnaie, rareté, fenêtre de vente, publié ON/OFF, kit d'équipe
 * (couleurs, motif, atlas du maillot) — le maillot reste LE maillot du jeu, repeint.
 */
export type ArticleLabo = Pick<import('../../data/boutique.js').ArticleEquipement,
  'id' | 'nom' | 'categorie' | 'emoji' | 'glb' | 'teinte' | 'prixDef' | 'rarete' | 'kit' | 'detail' | 'dispoDu' | 'dispoAu' | 'publie'>;

export interface CatalogueAdmin {
  revision: number;
  /** Les packs spéciaux ne tournent dans les boutiques que si Kiri l'active. */
  rotationPacks: boolean;
  packs: Record<string, PackCarriere>;
  joueurs: Record<string, EditionJoueur>;
  /**
   * Les cartes spéciales telles que le Labo les a réglées : ce qui diffère de
   * la graine (`data/cartesSpeciales.ts`), les cartes ajoutées et les
   * événements. Les IMAGES n'y sont pas : elles vivent dans leur propre table,
   * sans quoi chaque lecture du catalogue rapatrierait des mégaoctets.
   */
  speciales?: ConfigCartesSpeciales;
  /** Les cosmétiques ajoutés par le Labo à la boutique (clé : identifiant `lab-…`). */
  boutique?: Record<string, ArticleLabo>;
  /** Joueurs ajoutés par « Imports joueurs », absents des effectifs générés. */
  ajouts?: Record<string, AjoutJoueur>;
  /** Ce que le Labo a tranché pour chaque ligne d'import déjà relue. */
  importsDecisions?: Record<string, DecisionImport>;
}
export const CATALOGUE_ADMIN_VIDE: CatalogueAdmin = { revision: 0, rotationPacks: false, packs: {}, joueurs: {} };
// Le serveur fournit un contexte par requête ; aucun réglage mutable partagé
// entre deux requêtes concurrentes. La collection solo reçoit les éditions
// publiques et les applique explicitement au même catalogue de base.
let contexte = () => CATALOGUE_ADMIN_VIDE;
export function fournirCatalogueAdmin(fournisseur: () => CatalogueAdmin) { contexte = fournisseur; }
export function catalogueAdmin() { return contexte(); }
