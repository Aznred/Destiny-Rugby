import type { CategorieEquipement } from '../data/boutique';
import { normaliserCollectionSolo, type EtatCollectionSolo } from './collectionSolo.js';

/** Tout ce qui appartient au compte, et non a une carriere particuliere. */
export interface EtatBoutiqueCompte {
  ovas: number;
  achatsOvas?: number;
  /** Récompenses Stripe conservées même si une ancienne sauvegarde locale revient. */
  achatsInventaire?: string[];
  achatsEquipements?: string[];
  achatsTraits?: string[];
  collectionSolo: EtatCollectionSolo;
  inventaire: string[];
  skinActif: string;
  equipements: string[];
  equipementActif: Partial<Record<CategorieEquipement, string>>;
  traitsDebloques: string[];
}

/** Les valeurs absolues modifiées ; zéro retire une entrée de la collection. */
export type ModificationsBoutiqueCompte = Partial<Pick<EtatBoutiqueCompte,
  'ovas' | 'achatsOvas' | 'inventaire' | 'skinActif' | 'equipements' | 'equipementActif' | 'traitsDebloques'>>
  & { collectionSolo?: EtatCollectionSolo };

export function differencesBoutiqueCompte(avant: EtatBoutiqueCompte, apres: EtatBoutiqueCompte): ModificationsBoutiqueCompte {
  const modifications: ModificationsBoutiqueCompte = { achatsOvas: apres.achatsOvas ?? 0 };
  for (const cle of ['ovas', 'inventaire', 'skinActif', 'equipements', 'equipementActif', 'traitsDebloques'] as const) {
    if (JSON.stringify(avant[cle]) !== JSON.stringify(apres[cle])) Object.assign(modifications, { [cle]: apres[cle] });
  }
  if (avant.collectionSolo !== apres.collectionSolo && JSON.stringify(avant.collectionSolo) !== JSON.stringify(apres.collectionSolo)) {
    const differences = (a: Record<string, number>, b: Record<string, number>) => Object.fromEntries(
      [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(cle => (a[cle] ?? 0) !== (b[cle] ?? 0))
        .map(cle => [cle, b[cle] ?? 0]));
    modifications.collectionSolo = {
      quantites: differences(avant.collectionSolo.quantites, apres.collectionSolo.quantites),
      packsOuverts: differences(avant.collectionSolo.packsOuverts, apres.collectionSolo.packsOuverts),
      doublons: apres.collectionSolo.doublons, revision: apres.collectionSolo.revision ?? 0,
    };
  }
  return modifications;
}

/** Même fusion qu'une sauvegarde complète, sans remplacer les cartes absentes du delta. */
export function appliquerModificationsBoutiqueCompte(avant: EtatBoutiqueCompte, modifications: ModificationsBoutiqueCompte): EtatBoutiqueCompte {
  const collection = modifications.collectionSolo;
  const fusionner = (a: Record<string, number>, b: Record<string, number>) => {
    const resultat = { ...a };
    for (const [cle, valeur] of Object.entries(b)) { if (valeur) resultat[cle] = valeur; else delete resultat[cle]; }
    return resultat;
  };
  const reunir = (a: string[], b?: string[]) => [...new Set([...a, ...(b ?? [])])];
  return {
    ...avant, ...modifications, achatsOvas: avant.achatsOvas ?? 0,
    ovas: modifications.ovas === undefined ? avant.ovas
      : modifications.ovas + Math.max(0, (avant.achatsOvas ?? 0) - (modifications.achatsOvas ?? 0)),
    inventaire: reunir(modifications.inventaire ?? avant.inventaire, avant.achatsInventaire),
    equipements: reunir(modifications.equipements ?? avant.equipements, avant.achatsEquipements),
    traitsDebloques: reunir(modifications.traitsDebloques ?? avant.traitsDebloques, avant.achatsTraits),
    collectionSolo: !collection || (avant.collectionSolo.revision ?? 0) > (collection.revision ?? 0)
      ? avant.collectionSolo : { ...collection,
        quantites: fusionner(avant.collectionSolo.quantites, collection.quantites),
        packsOuverts: fusionner(avant.collectionSolo.packsOuverts, collection.packsOuverts) },
  };
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

export function validerModificationsBoutiqueCompte(valeur: unknown): ModificationsBoutiqueCompte | null {
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) return null;
  const brut = valeur as Record<string, unknown>;
  const cles = new Set(['ovas', 'achatsOvas', 'inventaire', 'skinActif', 'equipements', 'equipementActif', 'traitsDebloques', 'collectionSolo']);
  if (Object.keys(brut).some(cle => !cles.has(cle))) return null;
  const resultat: ModificationsBoutiqueCompte = {};
  for (const cle of ['ovas', 'achatsOvas'] as const) if (cle in brut) {
    if (!Number.isSafeInteger(brut[cle]) || Number(brut[cle]) < 0 || Number(brut[cle]) > 1_000_000_000) return null;
    resultat[cle] = Number(brut[cle]);
  }
  for (const cle of ['inventaire', 'equipements', 'traitsDebloques'] as const) if (cle in brut) {
    const valeurs = liste(brut[cle]); if (!valeurs) return null; resultat[cle] = valeurs;
  }
  if ('skinActif' in brut) {
    if (typeof brut.skinActif !== 'string' || !IDENTIFIANT.test(brut.skinActif)) return null;
    resultat.skinActif = brut.skinActif;
  }
  if ('equipementActif' in brut) {
    if (!brut.equipementActif || typeof brut.equipementActif !== 'object' || Array.isArray(brut.equipementActif)) return null;
    resultat.equipementActif = {};
    for (const [categorie, id] of Object.entries(brut.equipementActif)) {
      if (!CATEGORIES.has(categorie as CategorieEquipement) || typeof id !== 'string' || !IDENTIFIANT.test(id)) return null;
      resultat.equipementActif[categorie as CategorieEquipement] = id;
    }
  }
  if ('collectionSolo' in brut) {
    if (!brut.collectionSolo || typeof brut.collectionSolo !== 'object' || Array.isArray(brut.collectionSolo)) return null;
    const c = brut.collectionSolo as Record<string, unknown>;
    const compteur = (valeur: unknown, maximum: number) => {
      if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) return false;
      const entrees = Object.entries(valeur);
      return entrees.length <= maximum && entrees.every(([cle, n]) => IDENTIFIANT.test(cle)
        && Number.isSafeInteger(n) && Number(n) >= 0 && Number(n) <= 1_000_000);
    };
    if (!compteur(c.quantites, 100_000) || !compteur(c.packsOuverts, 500)
      || !Number.isSafeInteger(c.doublons) || Number(c.doublons) < 0
      || !Number.isSafeInteger(c.revision) || Number(c.revision) < 0) return null;
    resultat.collectionSolo = { quantites: c.quantites as Record<string, number>, packsOuverts: c.packsOuverts as Record<string, number>,
      doublons: Number(c.doublons), revision: Number(c.revision) };
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
  const achatsInventaire = brut.achatsInventaire == null ? [] : liste(brut.achatsInventaire);
  const achatsEquipements = brut.achatsEquipements == null ? [] : liste(brut.achatsEquipements);
  const achatsTraits = brut.achatsTraits == null ? [] : liste(brut.achatsTraits);
  const collectionSolo = collectionValide(brut.collectionSolo);
  if (!Number.isSafeInteger(brut.ovas) || (brut.ovas as number) < 0 || (brut.ovas as number) > 1_000_000_000) return null;
  if (!inventaire || !equipements || !traitsDebloques || !achatsInventaire || !achatsEquipements || !achatsTraits || !collectionSolo) return null;
  if (typeof brut.skinActif !== 'string' || !IDENTIFIANT.test(brut.skinActif) || !inventaire.includes(brut.skinActif)) return null;
  if (!brut.equipementActif || typeof brut.equipementActif !== 'object' || Array.isArray(brut.equipementActif)) return null;
  const equipementActif: Partial<Record<CategorieEquipement, string>> = {};
  for (const [categorie, id] of Object.entries(brut.equipementActif as Record<string, unknown>)) {
    if (!CATEGORIES.has(categorie as CategorieEquipement) || typeof id !== 'string' || !equipements.includes(id)) return null;
    equipementActif[categorie as CategorieEquipement] = id;
  }
  return {
    achatsOvas: Number.isSafeInteger(brut.achatsOvas) && Number(brut.achatsOvas) >= 0 ? Number(brut.achatsOvas) : 0,
    achatsInventaire, achatsEquipements, achatsTraits,
    ovas: brut.ovas as number, collectionSolo, inventaire, skinActif: brut.skinActif,
    equipements, equipementActif, traitsDebloques,
  };
}
