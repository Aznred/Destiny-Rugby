import type { Coequipier } from '../effectif';
import type { PosteId } from '../../types';
import { LARGEUR, type Cote, type Vec } from './terrain';

export interface Pion {
  id: string; nom: string; numero: number; poste: PosteId; cote: Cote;
  avant: boolean; moi: boolean;
  pos: Vec; cible: Vec; vitesseMax: number;
  endurance: number; recuperation: number; surLeTerrain: boolean; minutesJouees: number;
  acceleration: number; plaquage: number; evitement: number; passe: number;
  pied: number; vision: number; puissance: number;
  stats: StatsMatch;
}

export interface StatsMatch {
  metres: number; courses: number; passes: number; passesRatees: number;
  plaquages: number; plaquagesManques: number; rucksNettoyes: number; grattages: number;
  coupsDePied: number; essais: number; butsTentes: number; butsReussis: number;
  cartons: number; distanceParcourue: number;
}

export function statsVides(): StatsMatch {
  return { metres: 0, courses: 0, passes: 0, passesRatees: 0, plaquages: 0, plaquagesManques: 0, rucksNettoyes: 0, grattages: 0, coupsDePied: 0, essais: 0, butsTentes: 0, butsReussis: 0, cartons: 0, distanceParcourue: 0 };
}

export const ORDRE_MAILLOTS: PosteId[] = [
  'pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g', 'deuxieme_ligne_d',
  'troisieme_aile_g', 'troisieme_aile_d', 'numero_8', 'demi_melee', 'demi_ouverture',
  'ailier_gauche', 'premier_centre', 'deuxieme_centre', 'ailier_droit', 'arriere',
];

const VITESSE_BASE: Record<PosteId, number> = {
  pilier_gauche: 6.2, talonneur: 6.6, pilier_droit: 6.2, deuxieme_ligne_g: 6.7, deuxieme_ligne_d: 6.7,
  troisieme_aile_g: 7.3, troisieme_aile_d: 7.3, numero_8: 7.2, demi_melee: 7.6, demi_ouverture: 7.5,
  ailier_gauche: 8.6, premier_centre: 7.7, deuxieme_centre: 7.9, ailier_droit: 8.6, arriere: 8.2,
};

export const USURE = 0.055;
function note(v: number | undefined, defaut = 50): number { return typeof v === 'number' && Number.isFinite(v) ? v : defaut; }

export interface AttributsPion {
  vitesse?: number; force?: number; endurance?: number; plaquage?: number;
  passe?: number; jeuAuPied?: number; vision?: number; mental?: number;
}

export function creerPion(c: Coequipier, index: number, cote: Cote, moi = false, attributs?: AttributsPion): Pion {
  const poste = ORDRE_MAILLOTS[index] ?? c.poste;
  const avant = index < 8;
  const g = c.note;
  const a = attributs ?? {};
  const vitesse = note(a.vitesse, avant ? g - 6 : g + 4);
  const base = VITESSE_BASE[poste] ?? 7;
  return {
    id: `${cote}${index}`, nom: c.nom, numero: index + 1, poste, cote, avant, moi,
    pos: { x: 0, y: LARGEUR / 2 }, cible: { x: 0, y: LARGEUR / 2 },
    vitesseMax: base * (0.86 + vitesse / 380), endurance: 100, recuperation: 0,
    surLeTerrain: index < 15, minutesJouees: 0, acceleration: 3 + vitesse / 45,
    plaquage: note(a.plaquage, avant ? g + 4 : g - 3), evitement: note(a.vitesse, g) * 0.6 + note(a.mental, g) * 0.4,
    passe: note(a.passe, g), pied: note(a.jeuAuPied, poste === 'demi_ouverture' || poste === 'arriere' ? g + 5 : g - 10),
    vision: note(a.vision, g), puissance: note(a.force, avant ? g + 5 : g - 2), stats: statsVides(),
  };
}

export function vitesseActuelle(p: Pion): number {
  const fatigue = 0.55 + 0.45 * (p.endurance / 100);
  return p.vitesseMax * fatigue;
}

export function deplacer(p: Pion, dt: number): number {
  const dx = p.cible.x - p.pos.x; const dy = p.cible.y - p.pos.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.15) return 0;
  const v = Math.min(vitesseActuelle(p), d / dt);
  const pas = v * dt;
  p.pos.x += (dx / d) * pas; p.pos.y += (dy / d) * pas;
  p.stats.distanceParcourue += pas;
  p.endurance = Math.max(0, p.endurance - USURE * dt * (v / p.vitesseMax) ** 1.5 * 10);
  return pas;
}