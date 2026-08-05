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

// ⚠️ LES BOOSTS ONT ÉTÉ SUPPRIMÉS (demande explicite).
// Ils vendaient « +2 à tous les attributs » et « forme et moral au maximum »
// pour 60 à 80 Ovas. C'était en contradiction directe avec l'étalonnage de
// difficulté (`lib/progression.ts`, `scripts/verifDifficulte.ts`) : une carrière
// se construit sur le terrain, pas au comptoir. La boutique ne vend plus que
// des ballons — du cosmétique, et rien qui touche à la progression.
// Ne pas les réintroduire sans relancer `npx vite-node scripts/verifDifficulte.ts`.

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
