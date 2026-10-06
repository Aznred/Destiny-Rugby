// LES KITS D'ÉQUIPE DE LA BOUTIQUE (Correctif 21)
//
// Un kit n'est PAS un nouveau modèle de maillot. C'est le maillot du jeu — le même maillage, le même rig, les mêmes
// animations (bras, épaules, plaquages, rucks) — repeint : couleurs, motif, short, chaussettes, et un logo éventuel.
// `habillage.js` repeint l'atlas d'origine pixel par pixel ; un kit ne fait que lui donner d'autres paramètres.
//
// ⚠️ ÉQUIPER UN KIT HABILLE TOUTE L'ÉQUIPE : `equipementActif.maillot` (domicile) et `equipementActif.maillotExt` (extérieur)
// désignent un kit possédé, et le match l'applique aux quinze titulaires et aux remplaçants du camp du joueur. Si les deux
// équipes arrivent avec des couleurs trop proches, `departagerTenues` bascule seul sur la tenue extérieure.

import { prixCredits, prixLesDeux, prixOvas, type PrixArticle } from '../lib/monnaies';

export type MotifKit = 'uni' | 'cerceaux' | 'rayures' | 'epaules' | 'bande' | 'diagonale';

export interface KitDef {
  principal: string;
  secondaire: string;
  accent: string;
  short: string;
  chaussettes: string;
  motif: MotifKit;
  /** Textures optionnelles (kits créés dans le Labo) : atlas du maillot, du short, des chaussettes. */
  jerseyTexture?: string;
  shortTexture?: string;
  socksTexture?: string;
  /** Logo central de la poitrine, facultatif (chemin `/…` ou URL HTTPS). */
  logo?: string;
}

export interface ArticleKit {
  id: string;
  nom: string;
  detail: string;
  emoji: string;
  kit: KitDef;
  prix: PrixArticle;
  rarete: 'commun' | 'rare' | 'epique' | 'legendaire';
  /** Récompense : jamais en vente, offerte par le jeu. */
  recompense?: string;
}

/** Les maillots vendus AVANT le Correctif 21 : leur identifiant ne change pas (les joueurs les possèdent), ils gagnent un kit. */
export const KITS_EXISTANTS: Record<string, KitDef> = {
  'maillot-bleu': { principal: '#15317e', secondaire: '#f4f4ef', accent: '#e2231a', short: '#0c1b4a', chaussettes: '#15317e', motif: 'bande' },
  'maillot-blanc': { principal: '#eef1f6', secondaire: '#15317e', accent: '#15317e', short: '#15317e', chaussettes: '#eef1f6', motif: 'uni' },
  'maillot-legende': { principal: '#f4cd63', secondaire: '#8a5a12', accent: '#4a2f08', short: '#8a5a12', chaussettes: '#f4cd63', motif: 'cerceaux' },
  'maillot-toulousain': { principal: '#c8102e', secondaire: '#14110f', accent: '#ffffff', short: '#14110f', chaussettes: '#c8102e', motif: 'epaules' },
  'maillot-rochelais': { principal: '#f2d21b', secondaire: '#15130f', accent: '#15130f', short: '#15130f', chaussettes: '#f2d21b', motif: 'rayures' },
  'maillot-ubb': { principal: '#7a1431', secondaire: '#f4f4ef', accent: '#f4f4ef', short: '#f4f4ef', chaussettes: '#7a1431', motif: 'cerceaux' },
  'maillot-pau': { principal: '#1d7a3d', secondaire: '#f4f4ef', accent: '#f4f4ef', short: '#f4f4ef', chaussettes: '#1d7a3d', motif: 'cerceaux' },
  'maillot-stade-francais': { principal: '#e8458c', secondaire: '#1b2a6b', accent: '#ffffff', short: '#1b2a6b', chaussettes: '#e8458c', motif: 'uni' },
  'maillot-lyon': { principal: '#c8102e', secondaire: '#1b3f9a', accent: '#ffffff', short: '#1b3f9a', chaussettes: '#c8102e', motif: 'diagonale' },
  'maillot-bayonnais': { principal: '#8fc8ee', secondaire: '#f4f4ef', accent: '#0f3a63', short: '#f4f4ef', chaussettes: '#8fc8ee', motif: 'cerceaux' },
  'maillot-vannes': { principal: '#7a1020', secondaire: '#f4f4ef', accent: '#f4f4ef', short: '#f4f4ef', chaussettes: '#7a1020', motif: 'bande' },
  'maillot-angleterre': { principal: '#f4f4ef', secondaire: '#15317e', accent: '#c8102e', short: '#15317e', chaussettes: '#f4f4ef', motif: 'uni' },
  'maillot-irlande': { principal: '#1c8f4a', secondaire: '#f4f4ef', accent: '#f4f4ef', short: '#f4f4ef', chaussettes: '#1c8f4a', motif: 'epaules' },
  'maillot-italie': { principal: '#2a6fd1', secondaire: '#f4f4ef', accent: '#f4f4ef', short: '#f4f4ef', chaussettes: '#2a6fd1', motif: 'uni' },
};

export const KITS_BOUTIQUE: ArticleKit[] = [
  // ── Destiny Rugby ───────────────────────────────────────────────────────────────────────────────
  { id: 'kit-destiny-classique', nom: 'Destiny · Classique', emoji: '🟢', rarete: 'commun', prix: prixOvas(90),
    detail: 'Le vert profond du stade de nuit, liseré doré. Le maillot de la maison.',
    kit: { principal: '#0f3d31', secondaire: '#d8a94a', accent: '#f4e7bf', short: '#0a2a22', chaussettes: '#0f3d31', motif: 'cerceaux' } },
  { id: 'kit-destiny-nuit', nom: 'Destiny · Nuit', emoji: '🌌', rarete: 'rare', prix: prixLesDeux(180),
    detail: 'Bleu minuit, diagonale électrique. Fait pour les matchs sous les projecteurs.',
    kit: { principal: '#0b1226', secondaire: '#4fb8ff', accent: '#e9f6ff', short: '#070c1a', chaussettes: '#0b1226', motif: 'diagonale' } },
  { id: 'kit-destiny-or', nom: 'Destiny · Or', emoji: '✨', rarete: 'legendaire', prix: prixCredits(120),
    detail: 'Or satiné et noir de fumée. À ne sortir que les soirs de finale.',
    kit: { principal: '#d8a94a', secondaire: '#14110f', accent: '#fff4cc', short: '#14110f', chaussettes: '#d8a94a', motif: 'uni' } },
  // ── Rétro (fictifs) ─────────────────────────────────────────────────────────────────────────────
  { id: 'kit-retro-80', nom: 'Rétro 1984', emoji: '📼', rarete: 'rare', prix: prixLesDeux(200),
    detail: 'Cerceaux larges sur coton crème, col blanc. Comme sur les photos jaunies du club-house.',
    kit: { principal: '#f3ead2', secondaire: '#1c4f9b', accent: '#1c4f9b', short: '#ffffff', chaussettes: '#1c4f9b', motif: 'cerceaux' } },
  { id: 'kit-retro-90', nom: 'Rétro 1996', emoji: '📺', rarete: 'rare', prix: prixLesDeux(200),
    detail: 'Rayures vert bouteille sur beige, la grande époque des tournées d’été.',
    kit: { principal: '#1a5d3a', secondaire: '#e9d9a0', accent: '#e9d9a0', short: '#143d2a', chaussettes: '#1a5d3a', motif: 'rayures' } },
  { id: 'kit-retro-ocean', nom: 'Rétro Atlantique', emoji: '⚓', rarete: 'commun', prix: prixOvas(110),
    detail: 'Blanc et noir à cerceaux serrés, comme une marinière de pêcheur.',
    kit: { principal: '#f4f4ef', secondaire: '#15130f', accent: '#15130f', short: '#15130f', chaussettes: '#f4f4ef', motif: 'cerceaux' } },
  // ── Humour ──────────────────────────────────────────────────────────────────────────────────────
  { id: 'kit-fromage', nom: 'Le Fromager', emoji: '🧀', rarete: 'commun', prix: prixLesDeux(130),
    detail: 'Jaune tomme et trous de gruyère. On sent l’équipe arriver.',
    kit: { principal: '#f4c542', secondaire: '#d98f1b', accent: '#fff3c4', short: '#d98f1b', chaussettes: '#f4c542', motif: 'rayures' } },
  { id: 'kit-pasteque', nom: 'La Pastèque', emoji: '🍉', rarete: 'commun', prix: prixLesDeux(130),
    detail: 'Vert écorce et rose chair. Léger, comme un après-midi de juillet.',
    kit: { principal: '#2a8f4a', secondaire: '#e84a5f', accent: '#fff0f2', short: '#1f6b37', chaussettes: '#e84a5f', motif: 'rayures' } },
  { id: 'kit-flamant', nom: 'Le Flamant', emoji: '🦩', rarete: 'rare', prix: prixCredits(60),
    detail: 'Rose fluo, épaules blanches. Impossible de ne pas vous voir.',
    kit: { principal: '#ff7fb2', secondaire: '#ffffff', accent: '#ffffff', short: '#ff7fb2', chaussettes: '#ffffff', motif: 'epaules' } },
  // ── Récompense de saison : jamais en vente ──────────────────────────────────────────────────────
  { id: 'kit-champion', nom: 'Champion en titre', emoji: '🏆', rarete: 'legendaire', prix: prixOvas(0), recompense: 'Gagner un titre de champion',
    detail: 'Or et blanc brodés de l’étoile du titre. Il ne s’achète pas : il se gagne.',
    kit: { principal: '#f7f2e4', secondaire: '#d8a94a', accent: '#d8a94a', short: '#d8a94a', chaussettes: '#f7f2e4', motif: 'epaules' } },
];
