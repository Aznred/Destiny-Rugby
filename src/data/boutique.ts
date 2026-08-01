import type { AttributId } from '../types';

export interface SkinBallon {
  id: string;
  nom: string;
  corps: string;
  bande: string;
  lisere: string;
  couture: string;
  lacet: string;
  metal?: number;
  france?: boolean; // dessine le motif Équipe de France (coq + FRANCE RUGBY)
  glb?: string; // si défini, utilise ce modèle 3D au lieu du ballon codé
  prix: number; // en Ovas (0 = de base)
}

export const SKINS: SkinBallon[] = [
  {
    id: 'classique',
    nom: 'France Rugby',
    corps: '#f4f4ef',
    bande: '#15317e',
    lisere: '#e2231a',
    couture: '#1a1a1a',
    lacet: '#f7f7f2',
    france: true,
    glb: '/ballon.glb',
    prix: 0,
  },
  {
    id: 'tricolore',
    nom: 'Tricolore Away',
    corps: '#eef1f6',
    bande: '#0d2a6b',
    lisere: '#e2231a',
    couture: '#2a2a2a',
    lacet: '#ffffff',
    france: true,
    prix: 90,
  },
  {
    id: 'cuir',
    nom: 'Cuir Vintage',
    corps: '#8a4b2a',
    bande: '#5f3018',
    lisere: '#b3653a',
    couture: '#3a1d0e',
    lacet: '#e8dcc5',
    glb: '/m3d/ballon-cuir.glb',
    prix: 120,
  },
  {
    id: 'ocean',
    nom: 'RC Vannes',
    corps: '#7a1020',
    bande: '#ffffff',
    lisere: '#7a1020',
    couture: '#3a4046',
    lacet: '#e6e9ec',
    metal: 0.2,
    glb: '/m3d/ballon-vannes.glb',
    prix: 180,
  },
  {
    id: 'or',
    nom: 'Légende d’Or',
    corps: '#f4cd63',
    bande: '#8a5a12',
    lisere: '#6d3a1f',
    couture: '#a97b1c',
    lacet: '#fff4d6',
    metal: 0.5,
    glb: '/m3d/ballon-or.glb',
    prix: 350,
  },
];

export const SKIN_PAR_ID: Record<string, SkinBallon> = Object.fromEntries(
  SKINS.map((s) => [s.id, s]),
);

// Boosts consommables : effet immédiat sur les attributs.
export interface Boost {
  id: string;
  nom: string;
  desc: string;
  emoji: string;
  prix: number;
  effet: { attributs?: number; forme?: number; moral?: number };
}

export const BOOSTS: Boost[] = [
  {
    id: 'stage',
    nom: 'Stage intensif',
    desc: '+2 à tous les attributs. Une semaine de sueur.',
    emoji: '🏋️',
    prix: 80,
    effet: { attributs: 2 },
  },
  {
    id: 'reeduc',
    nom: 'Soins de pointe',
    desc: 'Forme et moral au maximum. Comme neuf.',
    emoji: '🧊',
    prix: 60,
    effet: { forme: 100, moral: 100 },
  },
  {
    id: 'mental',
    nom: 'Coach mental',
    desc: '+5 Mental, +5 Vision, +10 Moral.',
    emoji: '🧠',
    prix: 70,
    effet: { moral: 10 },
  },
];

// Packs d'Ovas (achat en argent réel — NON branché, purement indicatif).
export interface PackOvas {
  id: string;
  ovas: number;
  prix: string;
  bonus?: string;
}

export const PACKS: PackOvas[] = [
  { id: 'p1', ovas: 100, prix: '0,99 €' },
  { id: 'p2', ovas: 550, prix: '4,99 €', bonus: '+10 %' },
  { id: 'p3', ovas: 1200, prix: '9,99 €', bonus: '+20 %' },
];

// Bonus d'attribut ciblé pour le coach mental (appliqué à la main dans le store)
export const CIBLES_COACH: AttributId[] = ['mental', 'vision'];
