// CE QUE L'HABILLAGE TÉLÉVISION LIT DANS L'ÉTAT DU MATCH.
//
// Fonctions pures : elles ne décident de rien, elles relèvent ce que le moteur
// a déjà joué — qui vient d'entrer, qui est sorti, qui a le plus pesé.

import type { EtatMatch } from './moteur/etat';
import type { Pion } from './moteur/entites';
import type { Cote } from './moteur/terrain';

export interface ChangementTV {
  cle: string;
  cote: Cote;
  club: string;
  couleur: string;
  numero: number;
  entrant: string;
  sortant: string;
  /** Le sortant quitte la pelouse sur blessure. */
  blesse: boolean;
}

/**
 * Les remplacements des dernières secondes. Un geste « substitution » désigne
 * l'entrant ; le sortant est celui dont il a repris le numéro. Plusieurs
 * changements au même arrêt de jeu sont rendus ensemble.
 */
export function changementsRecents(e: EtatMatch, couleurs: Record<Cote, string>, fenetre = 7): ChangementTV[] {
  const sortie: ChangementTV[] = [];
  for (const g of e.gestes ?? []) {
    if (g.clip !== 'substitution' || e.sim - g.debut > fenetre || e.sim < g.debut) continue;
    const entrant = e.pions.find((p) => p.id === g.joueurId);
    if (!entrant) continue;
    const sortant = e.pions.find((p) => p.cote === entrant.cote && p.remplace && !p.surLeTerrain && p.numero === entrant.numero);
    if (!sortant) continue;
    sortie.push({
      cle: g.id, cote: entrant.cote, club: entrant.cote === 'A' ? e.clubA : e.clubB, couleur: couleurs[entrant.cote],
      numero: entrant.numero, entrant: entrant.nom, sortant: sortant.nom,
      blesse: !!(sortant as Pion & { blesse?: boolean }).blesse,
    });
  }
  return sortie;
}

/** Le joueur qui a le plus pesé : essais, franchissements, passes décisives, plaquages, ballons volés. */
export function hommeDuMatch(e: EtatMatch): Pion | undefined {
  const poids = (p: Pion) => p.stats.essais * 9 + p.stats.passesDecisives * 4 + p.stats.franchissements * 2.4
    + p.stats.plaquages * 0.75 + p.stats.grattages * 3.2 + p.stats.metres * 0.06 + p.stats.offloads * 1.2
    + (p.stats.pointsAuPied ?? 0) * 0.9 - p.stats.plaquagesManques * 0.9 - p.stats.passesRatees * 1.1
    - p.stats.cartonsJaunes * 6 - p.stats.cartonsRouges * 14;
  const gagnant: Cote | null = e.scoreA === e.scoreB ? null : e.scoreA > e.scoreB ? 'A' : 'B';
  return e.pions.filter((p) => p.minutes > 8)
    // À valeur voisine, le trophée va dans le vestiaire qui a gagné.
    .map((p) => ({ p, v: poids(p) * (gagnant && p.cote === gagnant ? 1.12 : 1) }))
    .sort((a, b) => b.v - a.v)[0]?.p;
}
