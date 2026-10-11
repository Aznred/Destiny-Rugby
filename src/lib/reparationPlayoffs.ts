import { nomDivision } from './promotion.js';
import { tournoiDeFinDAnnee } from './tournoi.js';
import { phaseFinale } from './phaseFinale.js';
import { resultatsJouesDuTableau } from './championnat.js';

export interface RapportReparationPlayoffs {
  competition: string;
  saison: number;
  dernierTourValide: string | null;
  qualifies: string[];
  matchsARejouer: string[];
  resultatsEnAttente: string[];
  semaineReprise: number;
}

/** Les résultats incompatibles sont conservés ; ils attendent que leurs deux clubs se qualifient réellement. */
export function analyserReparationPlayoffs(c: { division: string; club: string; saison: number; semaine: number }, bonus = 0): RapportReparationPlayoffs {
  const tournoi = tournoiDeFinDAnnee(c.division, c.saison, nomDivision(c.division), c.club, bonus);
  const phase = tournoi ?? phaseFinale(c.division, c.saison, c.club, bonus);
  const matchs = phase.matchs;
  const cles = new Set(matchs.map(m => m.cle));
  const prefixe = `${tournoi ? 'tournoi' : 'finale'}#${c.division}#${c.saison}`;
  const attente = resultatsJouesDuTableau(prefixe).filter(r => !cles.has(r.cle));
  const manquants = matchs.filter(m => m.status !== 'completed');
  const aRejouer = manquants.filter(m => m.semaine <= c.semaine);
  const tours = [...new Set(matchs.map(m => m.tour))];
  const dernierTourValide = tours.filter(tour => matchs.filter(m => m.tour === tour).every(m => m.status === 'completed')).at(-1) ?? null;
  const encoreQualifies = manquants.length ? manquants.flatMap(m => [m.domicile, m.exterieur]) : phase.champion ? [phase.champion] : [];
  // Les deux premiers d'une phase classique à six clubs sont explicitement exempts de barrages.
  if (!tournoi && manquants.some(m => m.tour === 'barrage')) encoreQualifies.push(...(phase as ReturnType<typeof phaseFinale>).qualifies.slice(0, 2));
  encoreQualifies.push(...matchs.filter(m => m.status === 'completed' && m.tour === manquants[0]?.tour).map(m => m.vainqueur!));
  return { competition: c.division, saison: c.saison,
    dernierTourValide,
    qualifies: [...new Set(encoreQualifies)],
    matchsARejouer: aRejouer.map(m => m.cle), resultatsEnAttente: attente.map(r => r.cle),
    semaineReprise: encoreQualifies.includes(c.club) ? Math.min(c.semaine, ...aRejouer.map(m => m.semaine)) : c.semaine };
}
