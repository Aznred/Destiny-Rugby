import type { LigneFil, Paire } from './matchCarriere.js';

export interface MomentFort {
  id: string; seconde: number; type: string; videoId: string; duree: number;
  texte: string; cote?: 'domicile' | 'exterieur'; score: Paire; points: number;
}
export const TYPES_IMPORTANTS = new Set(['essai', 'but', 'butRate', 'penalite', 'carton', 'blessure', 'jalon', 'remplacement']);
const hash = (s: string) => { let n = 2166136261; for (const c of s) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; };
export function momentsDepuisFil(matchId: string, fil: LigneFil[]): MomentFort[] {
  return fil.filter(l => !l.ordre && (TYPES_IMPORTANTS.has(l.type) || l.type === 'franchissement')).map((l, i) => {
    const id = l.id ? `${matchId}:${l.id}` : `${matchId}:${l.minute}:${l.type}:${hash(l.texte)}:${i}`;
    const situation = l.type === 'but' ? (l.points === 2 ? 'transformation' : 'penalite_reussie') : l.type;
    return { id, seconde: l.seconde ?? l.minute * 60, type: l.type,
      videoId: `${situation}_${hash(id) % 3 + 1}`, duree: l.type === 'essai' ? 10 : 7,
      texte: l.texte, cote: l.cote, score: l.score ?? { domicile: 0, exterieur: 0 }, points: l.points ?? 0 };
  });
}
