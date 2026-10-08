// LES PACKS DE TEST — un pack interne dont le contenu est IMPOSÉ (Correctif 33)
//
// Demande : « je veux exactement ces joueurs dans le pack », pour essayer une carte ou une animation d'ouverture sans
// attendre qu'un tirage la sorte. Ce n'est pas un pack de la boutique : il n'a ni prix, ni probabilités, ni place dans
// le catalogue des packs. C'est une LISTE de cartes, rangée dans l'ordre où elles se retournent.
//
// ⚠️ RIEN ICI N'ACCORDE QUOI QUE CE SOIT. Ce module ne porte que le vocabulaire partagé par l'écran et le serveur. Le
// droit de créer un pack est une ligne de la base (`compte_permissions`), rattachée à l'identifiant immuable d'un
// compte et vérifiée par le serveur à CHAQUE appel — création, liste, recherche, ouverture. Un écran qui se croirait
// autorisé n'obtiendrait qu'un 403.
//
// ⚠️ ET RIEN ICI NE TOUCHE L'ÉCONOMIE PUBLIQUE : ni les probabilités, ni la configuration des vrais packs, ni le
// catalogue. Un pack de test n'est lisible que par son auteur, et chaque création comme chaque ouverture est
// consignée (`SOURCE_ACQUISITION_INTERNE`) : on sait toujours quelles cartes viennent de l'outil.
//
// Module pur : ni store, ni DOM, ni horloge implicite.

import type { PackCarriere, RareteCarriere } from './ligue/typesCarriere.js';

/** La permission serveur : seul un compte qui la détient crée, liste et ouvre des packs de test. */
export const PERMISSION_PACKS_INTERNES = 'CAN_CREATE_CUSTOM_PACKS';
/** Ce que le journal inscrit pour chaque carte sortie d'un pack de test. */
export const SOURCE_ACQUISITION_INTERNE = 'INTERNAL_CUSTOM_PACK';
export const PREFIXE_PACK_INTERNE = 'interne:';
/**
 * Le compteur du coffre (`packsOuverts`) pour TOUS les packs de test. Une seule clé : le coffre refuse plus de 500
 * compteurs, une clé par pack finirait par bloquer la synchronisation du compte.
 */
export const CLE_COFFRE_PACKS_INTERNES = 'pack-test';
export const CARTES_MAX_PACK_INTERNE = 20;
export const PACKS_INTERNES_MAX = 40;

/** La famille d'une carte, telle que le créateur de pack la filtre. Une famille spéciale future porte son `cardType`. */
export type TypeCarteInterne = 'normale' | 'feminine' | 'icon' | 'halloween' | 'influencer' | (string & {});

export interface PackInterne {
  id: string;
  nom: string;
  /** Les cartes (`sourceId`), DANS L'ORDRE DE RÉVÉLATION : la première se retourne d'abord, la dernière clôt le pack. */
  cartes: string[];
  /** La carte principale : affichée en tête d'affiche. Par défaut, la dernière révélée. */
  principale?: string;
  creeLe: string;
  ouvertures: number;
  derniereOuverture?: string;
}

/** Une carte proposée par la recherche du créateur de pack. */
export interface CarteCandidate {
  sourceId: string; nom: string; poste: string; note: number; rarete: RareteCarriere;
  club: string; nation: string; championnat: string; type: TypeCarteInterne; photo?: string;
  /** Carte spéciale : son état de publication (`draft`, `image_missing`, `ready`, `published`). */
  statut?: string;
  /** Visible dans la Collection solo une fois obtenue. Une carte non publiée s'ouvre, mais ne s'y affiche pas encore. */
  visibleEnCollection: boolean;
}

export interface LigneJournalPackInterne {
  packId: string; nom?: string; action: 'CREATE' | 'OPEN' | 'DELETE'; cartes: string[]; date: string; source: string;
}

export interface DefinitionPackInterne { nom: string; cartes: string[]; principale?: string }

/**
 * Valide ce que l'écran envoie. Lève une `Error` au message lisible ; le serveur vérifie ENSUITE que chaque carte existe.
 * Les doublons sont permis (deux fois la même carte dans un pack : c'est un cas à pouvoir essayer).
 */
export function validerDefinitionPackInterne(brut: unknown): DefinitionPackInterne {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) throw new Error('Pack invalide.');
  const b = brut as Record<string, unknown>;
  const nom = typeof b.nom === 'string' ? b.nom.trim() : '';
  if (nom.length < 2 || nom.length > 40 || /\p{Cc}/u.test(nom)) throw new Error('Nom du pack : entre 2 et 40 caractères.');
  if (!Array.isArray(b.cartes) || b.cartes.length < 1 || b.cartes.length > CARTES_MAX_PACK_INTERNE) {
    throw new Error(`Un pack de test contient de 1 à ${CARTES_MAX_PACK_INTERNE} cartes.`);
  }
  const cartes = b.cartes.map((c) => {
    if (typeof c !== 'string' || !c || c.length > 250 || /\p{Cc}/u.test(c)) throw new Error('Carte invalide.');
    return c;
  });
  let principale: string | undefined;
  if (b.principale !== undefined && b.principale !== null && b.principale !== '') {
    if (typeof b.principale !== 'string' || !cartes.includes(b.principale)) throw new Error('La carte principale doit faire partie du pack.');
    principale = b.principale;
  }
  return { nom, cartes, ...(principale ? { principale } : {}) };
}

/**
 * L'ordre dans lequel les cartes se retournent. La carte principale passe à la fin si elle n'y est pas : c'est elle
 * qu'on garde pour le dernier retournement, celui de la tête d'affiche.
 */
export function ordreDeRevelation(pack: Pick<PackInterne, 'cartes' | 'principale'>): string[] {
  const { cartes, principale } = pack;
  if (!principale) return [...cartes];
  const position = cartes.lastIndexOf(principale);
  if (position < 0 || position === cartes.length - 1) return [...cartes];
  return [...cartes.slice(0, position), ...cartes.slice(position + 1), principale];
}

export const idBoutiquePackInterne = (id: string) => `${PREFIXE_PACK_INTERNE}${id}`;
export const estPackInterne = (idBoutique: string) => idBoutique.startsWith(PREFIXE_PACK_INTERNE);

/** Marque d'un pack de test dans la liste des packs privés du compte. */
export type PackInterneBoutique = PackCarriere & { interne: true; ouvertures: number };

/**
 * Le pack tel que la Collection solo le reçoit. ⚠️ Ses probabilités sont décoratives et à zéro partout sauf une : aucun
 * tirage ne les lit, le contenu est la liste enregistrée. `apparence` : la rareté de sa meilleure carte, pour la pochette.
 */
export function packInternePourBoutique(pack: PackInterne, apparence: RareteCarriere): PackInterneBoutique {
  const probabilites = { bronze: 0, argent: 0, or: 0, elite: 0, star: 0 } as Record<RareteCarriere, number>;
  probabilites[apparence] = 100;
  return {
    id: idBoutiquePackInterne(pack.id), nom: pack.nom, prix: 0, cartes: pack.cartes.length, famille: 'general',
    promesse: 'Pack de test : contenu imposé, hors boutique.', probabilites, interne: true, ouvertures: pack.ouvertures,
  };
}
