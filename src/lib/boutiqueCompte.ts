import type { CategorieEquipement } from '../data/boutique';
import { normaliserCollectionSolo, type EtatCollectionSolo } from './collectionSolo';

/** Tout ce qui appartient au compte, et non a une carriere particuliere. */
export interface EtatBoutiqueCompte {
  ovas: number;
  collectionSolo: EtatCollectionSolo;
  inventaire: string[];
  skinActif: string;
  equipements: string[];
  equipementActif: Partial<Record<CategorieEquipement, string>>;
  traitsDebloques: string[];
}

const IDENTIFIANT = /^[a-zA-Z0-9:_-]{1,100}$/;
const CATEGORIES = new Set<CategorieEquipement>(['crampons', 'maillot', 'casque', 'bouclier', 'sac']);

function liste(valeur: unknown, maximum = 500): string[] | null {
  if (!Array.isArray(valeur) || valeur.length > maximum) return null;
  const resultat: string[] = [];
  for (const element of valeur) {
    if (typeof element !== 'string' || !IDENTIFIANT.test(element)) return null;
    if (!resultat.includes(element)) resultat.push(element);
  }
  return resultat;
}

function collectionValide(valeur: unknown): EtatCollectionSolo | null {
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) return null;
  const collection = normaliserCollectionSolo(valeur);
  if (Object.keys(collection.quantites).length > 100_000 || Object.keys(collection.packsOuverts).length > 500) return null;
  if (Object.entries(collection.quantites).some(([cle, n]) => !IDENTIFIANT.test(cle) || n > 1_000_000)) return null;
  if (Object.entries(collection.packsOuverts).some(([cle, n]) => !IDENTIFIANT.test(cle) || n > 1_000_000)) return null;
  return collection;
}

/** Refuse un coffre malforme avant qu'il ne soit conserve sur le compte. */
export function validerEtatBoutiqueCompte(valeur: unknown): EtatBoutiqueCompte | null {
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) return null;
  const brut = valeur as Record<string, unknown>;
  const inventaire = liste(brut.inventaire);
  const equipements = liste(brut.equipements);
  const traitsDebloques = liste(brut.traitsDebloques);
  const collectionSolo = collectionValide(brut.collectionSolo);
  if (!Number.isSafeInteger(brut.ovas) || (brut.ovas as number) < 0 || (brut.ovas as number) > 1_000_000_000) return null;
  if (!inventaire || !equipements || !traitsDebloques || !collectionSolo) return null;
  if (typeof brut.skinActif !== 'string' || !IDENTIFIANT.test(brut.skinActif) || !inventaire.includes(brut.skinActif)) return null;
  if (!brut.equipementActif || typeof brut.equipementActif !== 'object' || Array.isArray(brut.equipementActif)) return null;
  const equipementActif: Partial<Record<CategorieEquipement, string>> = {};
  for (const [categorie, id] of Object.entries(brut.equipementActif as Record<string, unknown>)) {
    if (!CATEGORIES.has(categorie as CategorieEquipement) || typeof id !== 'string' || !equipements.includes(id)) return null;
    equipementActif[categorie as CategorieEquipement] = id;
  }
  return { ovas: brut.ovas as number, collectionSolo, inventaire, skinActif: brut.skinActif, equipements, equipementActif, traitsDebloques };
}
