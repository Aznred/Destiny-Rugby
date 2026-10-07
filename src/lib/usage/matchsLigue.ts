// La référence reste locale : seul le nombre de nouveaux matchs part dans un compteur anonyme.
export const EVENEMENT_MATCHS_LIGUE = 'destiny-rugby:usage-matchs-ligue';
export interface DetailMatchsLigue { cle: string; nombre: number }
export function noterMatchsLigueUsage(ligue: string, club: string, saison: number, nombre: number): void {
  try { window.dispatchEvent(new CustomEvent<DetailMatchsLigue>(EVENEMENT_MATCHS_LIGUE, { detail: { cle: `${ligue}:${club}:${saison}`, nombre } })); } catch { /* le suivi ne bloque jamais la ligue */ }
}
