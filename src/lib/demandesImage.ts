// « MON IMAGE » — une joueuse ou un joueur décide de son portrait dans le jeu.
//
// Deux demandes : RETIRER son portrait (la carte garde la silhouette), ou PROPOSER le sien. Rien ne s'applique tout
// seul : chaque demande attend une décision dans le Labo (compte interne), parce que n'importe qui peut prétendre
// être n'importe qui. Acceptée, elle entre dans la liste publique `ImagesJoueurs`, que tous les écrans lisent.
//
// ⚠️ Ce module tourne des deux côtés (navigateur et fonctions serveur) : aucun DOM, aucun store, aucune horloge.

export type TypeDemandeImage = 'retrait' | 'ajout';
export type StatutDemandeImage = 'attente' | 'acceptee' | 'refusee';

export interface DemandeImage {
  id: string;
  type: TypeDemandeImage;
  /** Le nom tel qu'il est écrit sur la carte. */
  joueur: string;
  club: string;
  message: string;
  statut: StatutDemandeImage;
  creeLe: string;
  decideLe?: string;
  /** Le portrait proposé (data URL) : envoyé au seul compte interne, jamais dans la liste d'un joueur. */
  image?: string;
  /** Pour le Labo : qui demande. */
  pseudo?: string;
}

/** Ce que tout le monde reçoit : les portraits retirés, et ceux qui ont été remplacés. */
export interface ImagesJoueurs {
  /** Change à chaque décision : l'adresse des portraits ajoutés la porte, le cache long ne ment pas. */
  revision: string;
  retirees: string[];
  /** Clé du joueur → adresse du portrait accepté. */
  ajoutees: Record<string, string>;
}

/** Un portrait proposé : 600 px de côté au plus, redimensionné par l'écran avant l'envoi. */
export const IMAGE_DEMANDE_MAX = 280_000;
export const DEMANDES_EN_ATTENTE_MAX = 5;
const IMAGE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

/** La clé d'un joueur : son nom sans accents, sans casse, mots triés — « Zoe STRATFORD » et « Stratford Zoé » se rejoignent. */
export function cleJoueurImage(nom: string): string {
  return nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).sort().join(' ');
}

export interface SaisieDemandeImage { type: TypeDemandeImage; joueur: string; club: string; message: string; image?: string }

/** La demande nettoyée, ou la raison du refus (une clé de texte `img.erreur.*`). */
export function validerDemandeImage(brut: unknown): SaisieDemandeImage | { erreur: string } {
  const b = (brut && typeof brut === 'object' ? brut : {}) as Record<string, unknown>;
  const texte = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const type = b.type === 'ajout' ? 'ajout' : b.type === 'retrait' ? 'retrait' : null;
  if (!type) return { erreur: 'img.erreur.type' };
  const joueur = texte(b.joueur, 80);
  if (cleJoueurImage(joueur).split(' ').length < 2) return { erreur: 'img.erreur.nom' };
  const saisie: SaisieDemandeImage = { type, joueur, club: texte(b.club, 80), message: texte(b.message, 500) };
  if (type === 'ajout') {
    if (typeof b.image !== 'string' || !IMAGE.test(b.image)) return { erreur: 'img.erreur.image' };
    if (b.image.length > IMAGE_DEMANDE_MAX) return { erreur: 'img.erreur.poids' };
    saisie.image = b.image;
  }
  return saisie;
}

/**
 * La liste publique, à partir des demandes ACCEPTÉES dans l'ordre de leur décision : pour un même joueur, la dernière
 * décision l'emporte (un retrait après un ajout retire, un ajout après un retrait remet un portrait).
 */
export function imagesDepuisDemandes(acceptees: readonly Pick<DemandeImage, 'id' | 'type' | 'joueur' | 'decideLe'>[], adresse: (id: string) => string): ImagesJoueurs {
  const dernier = new Map<string, Pick<DemandeImage, 'id' | 'type'>>();
  let revision = '';
  for (const d of [...acceptees].sort((a, b) => (a.decideLe ?? '').localeCompare(b.decideLe ?? ''))) {
    dernier.set(cleJoueurImage(d.joueur), d);
    if ((d.decideLe ?? '') > revision) revision = d.decideLe ?? '';
  }
  const images: ImagesJoueurs = { revision, retirees: [], ajoutees: {} };
  for (const [cle, d] of dernier) { if (d.type === 'retrait') images.retirees.push(cle); else images.ajoutees[cle] = adresse(d.id); }
  images.retirees.sort();
  return images;
}
