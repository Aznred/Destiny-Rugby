import type { PosteId } from '../../types.js';
import { couleursDepuisEcusson } from '../tenuesMatch.js';
import { APPARENCES_JOUEURS_MATCH, type CoiffureMatch } from '../../data/apparencesMatch.generated.js';
import type { SurchargeApparence } from '../apparenceJoueur.js';

export type MorphologieMatch = 'pilier' | 'avant' | 'athletique' | 'arriere' | 'ailier';
export type MotifMaillot = 'uni' | 'cerceaux' | 'rayures' | 'epaules' | 'bande' | 'diagonale';

export interface ApparenceMatch {
  tailleCm: number;
  poidsKg: number;
  peau: string;
  yeux: string;
  cheveux: string;
  coiffure: CoiffureMatch;
  barbe: 'none' | 'moustache' | 'goatee' | 'short_beard' | 'full_beard';
  morphologie: MorphologieMatch;
  // Correctif 20 — présents pour le joueur du jeu seulement (`definirSurchargeApparence`).
  /** Numéro exact du maillage de coiffure (`''` = chauve) et de barbe ; la scène les préfère à la famille. */
  coupeId?: string;
  barbeId?: string;
  couleurBarbe?: string;
  /** Facteurs d'échelle déjà bornés (`morphoPourScene`). */
  morpho?: SurchargeApparence['morpho'];
  /** Casque et crampons réellement équipés : lus UNE fois à l'entrée du match. */
  equipement?: SurchargeApparence['equipement'];
}

// ⚠️ L'APPARENCE DU JOUEUR DU JEU PASSE PAR UN REGISTRE, pas par les cartes. Tout le match (moteur, scène
// 3D, sprites, direct) lit `apparenceJoueurMatch(nom, poste)` : y brancher ses choix en un seul endroit
// garantit que la taille et le poids qui font les collisions sont ceux qu'on VOIT. Un joueur sans
// personnalisation (sauvegarde ancienne) garde le tirage d'avant, à l'identique.
const SURCHARGES = new Map<string, SurchargeApparence>();

export function definirSurchargeApparence(nom: string, surcharge: SurchargeApparence | null): void {
  const cle = normaliserNomMatch(nom);
  if (surcharge) SURCHARGES.set(cle, surcharge); else SURCHARGES.delete(cle);
}

export interface MaillotMatch {
  principal: string;
  secondaire: string;
  accent: string;
  short: string;
  chaussettes: string;
  motif: MotifMaillot;
  /** Atlas du maillot fourni en image (kit du Labo) : posé tel quel, sans repeindre. */
  texture?: string;
}

const PROFIL_POSTE: Record<PosteId, [number, number, MorphologieMatch]> = {
  pilier_gauche: [184, 119, 'pilier'], talonneur: [181, 108, 'pilier'], pilier_droit: [185, 121, 'pilier'],
  deuxieme_ligne_g: [199, 116, 'avant'], deuxieme_ligne_d: [199, 116, 'avant'],
  troisieme_aile_g: [191, 107, 'avant'], troisieme_aile_d: [191, 107, 'avant'], numero_8: [193, 112, 'avant'],
  demi_melee: [176, 82, 'arriere'], demi_ouverture: [183, 88, 'arriere'],
  ailier_gauche: [186, 91, 'ailier'], premier_centre: [188, 99, 'athletique'],
  deuxieme_centre: [189, 100, 'athletique'], ailier_droit: [186, 91, 'ailier'], arriere: [187, 92, 'arriere'],
};

const PEAUX = ['#efc19d', '#d99b72', '#b87550', '#8f573b', '#633d2f', '#4a3028'];
const CHEVEUX = ['#171311', '#2c1d17', '#4c2f20', '#72503a', '#b07d4f'];
const YEUX = ['#49301f', '#654530', '#3e5361', '#4f6247', '#6c5435'];
const COIFFURES: CoiffureMatch[] = ['bald', 'buzz', 'short', 'fade', 'curly', 'afro', 'mullet', 'mohawk', 'messy', 'long', 'dreadlocks'];
const BARBES: ApparenceMatch['barbe'][] = ['none', 'none', 'none', 'none', 'moustache', 'goatee', 'short_beard', 'full_beard'];

export function normaliserNomMatch(texte: string): string {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ').trim().toLowerCase();
}

export function graineVisuelleMatch(texte: string): number {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) h = Math.imul(h ^ texte.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function apparenceJoueurMatch(nom: string, poste: PosteId): ApparenceMatch {
  const cle = normaliserNomMatch(nom);
  const generee = APPARENCES_JOUEURS_MATCH[cle];
  const h = graineVisuelleMatch(`${cle}:${poste}`);
  const [taille, poids, morphologie] = PROFIL_POSTE[poste] ?? PROFIL_POSTE.arriere;
  const s = SURCHARGES.get(cle);
  return {
    ...(s?.equipement ? { equipement: s.equipement } : {}),
    ...(s?.coupeId !== undefined ? { coupeId: s.coupeId } : {}),
    ...(s?.barbeId !== undefined ? { barbeId: s.barbeId } : {}),
    ...(s?.couleurBarbe ? { couleurBarbe: s.couleurBarbe } : {}),
    ...(s?.morpho ? { morpho: s.morpho } : {}),
    tailleCm: s?.tailleCm ?? generee?.tailleCm ?? taille + (h % 15) - 7,
    poidsKg: s?.poidsKg ?? generee?.poidsKg ?? poids + ((h >>> 4) % 19) - 9,
    peau: s?.peau ?? generee?.peau ?? PEAUX[(h >>> 8) % PEAUX.length],
    yeux: generee?.yeux ?? YEUX[(h >>> 6) % YEUX.length],
    cheveux: s?.cheveux ?? generee?.cheveux ?? CHEVEUX[(h >>> 12) % CHEVEUX.length],
    coiffure: s?.coiffure ?? generee?.coiffure ?? COIFFURES[(h >>> 16) % COIFFURES.length],
    barbe: s?.barbe ?? generee?.barbe ?? BARBES[(h >>> 20) % BARBES.length],
    morphologie,
  };
}

function assombrir(hex: string, facteur: number): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  if (!Number.isFinite(n)) return '#171b20';
  const c = (decalage: number) => Math.round(((n >> decalage) & 255) * facteur).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return (((n >> 16) & 255) * .299 + ((n >> 8) & 255) * .587 + (n & 255) * .114) / 255;
}

export function maillotDeSecours(principal: string, cle: string): MaillotMatch {
  const h = graineVisuelleMatch(cle);
  const clair = luminance(principal) > .55;
  return {
    principal,
    secondaire: clair ? '#182128' : '#f3efe2',
    accent: clair ? '#111820' : '#ffffff',
    short: assombrir(principal.startsWith('#') ? principal : '#344054', .48),
    chaussettes: principal,
    motif: (['uni', 'cerceaux', 'rayures', 'epaules', 'bande', 'diagonale'] as MotifMaillot[])[h % 6],
  };
}


/**
 * Le maillot d'un club tiré de son écusson. ⚠️ L'analyse vit dans `lib/tenuesMatch.ts` (Correctif 24) : surface occupée,
 * fond exclu, noir et blanc admis — l'ancienne lecture prenait le premier pixel de la teinte la plus vive.
 */
export async function maillotDepuisBlason(url: string | undefined, secours: MaillotMatch, cle: string): Promise<MaillotMatch> {
  const lues = await couleursDepuisEcusson(url);
  if (!lues) return secours;
  const p = lues.principal, s = lues.secondaire;
  const h = graineVisuelleMatch(`${cle}:${p}:${s}`);
  return {
    principal: p, secondaire: s, accent: luminance(p) > .52 ? '#10161c' : '#ffffff', short: assombrir(p, .48), chaussettes: p,
    motif: (['uni', 'cerceaux', 'rayures', 'epaules', 'bande', 'diagonale'] as MotifMaillot[])[h % 6],
  };
}
