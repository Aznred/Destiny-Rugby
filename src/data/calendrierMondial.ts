import { CALENDRIER, estAnneeDeCoupeDuMonde } from './calendrier';

export type FenetreMondiale = 'ete' | 'sud' | 'automne' | 'tournoi';
export function numeroDate(mois: number, jour: number): number {
  const candidates = CALENDRIER.filter((s) => s.mois === mois);
  if (!candidates.length) throw new Error('Mois hors calendrier : ' + mois);
  // Une fenêtre officielle tombe dans son week-end de jeu (écart de 0 à 3 jours).
  return candidates.reduce((a,b) => Math.abs(b.jour - jour) < Math.abs(a.jour - jour) ? b : a).numero;
}
const dates = (liste: [number, number][]) => liste.map(([m, j]) => numeroDate(m, j));

/** Dates hebdomadaires de jeu, pas report des championnats pendant les sélections. */
export function datesCompetitionInternationale(id: string, fenetre: FenetreMondiale, nombre: number, saison: number): number[] {
  if (id === 'coupeDuMonde') return estAnneeDeCoupeDuMonde(saison)
    ? dates([[10,2],[10,9],[10,16],[10,23],[10,30],[11,6],[11,13]]) : [];
  if (id.startsWith('qualif-')) return CALENDRIER.filter((s) => s.mois <= 3 || (s.mois === 4 && s.jour <= 17))
    .map((s) => s.numero).slice(0, nombre);
  if (id === 'repechageMondial') return dates([[5,8],[5,15],[5,29]]);
  if (id === 'mondialU20') return dates([[6,5],[6,12],[6,19]]);
  const programme: Record<FenetreMondiale, number[]> = {
    ete: dates([[7,4],[7,11],[7,18],[7,25]]),
    sud: dates([[8,7],[8,14],[8,28],[9,4],[9,11],[9,18]]),
    automne: dates([[11,6],[11,13],[11,20],[11,27]]),
    tournoi: dates([[2,6],[2,13],[2,27],[3,6],[3,13]]),
  };
  // En année de Mondial, pas de double convocation Sud / préparation.
  const disponibles = fenetre === 'sud' && estAnneeDeCoupeDuMonde(saison)
    ? programme.sud.slice(0, 3) : programme[fenetre];
  return disponibles.slice(0, nombre);
}

export function programmeInternational(semaine: number, saison: number): string[] {
  const s = CALENDRIER[semaine - 1];
  if (!s) return [];
  const labels: string[] = [];
  if (s.mois === 7) labels.push('Tests d’été');
  if ([8,9].includes(s.mois)) labels.push(estAnneeDeCoupeDuMonde(saison) && s.mois === 9
    ? 'Préparation du Mondial' : 'Rugby Championship');
  if (estAnneeDeCoupeDuMonde(saison)) {
    const n = datesCompetitionInternationale('coupeDuMonde', 'automne', 7, saison).indexOf(semaine);
    if (n >= 0) labels.push(['Mondial · poules J1','Mondial · poules J2','Mondial · poules J3',
      'Mondial · huitièmes','Mondial · quarts','Mondial · demi-finales','Mondial · bronze et finale'][n]);
  } else if (s.mois === 11) labels.push('Tests d’automne');
  if ([2,3].includes(s.mois)) labels.push('Six Nations / tournois régionaux');
  if (estAnneeDeCoupeDuMonde(saison + 1) && [1,2,3,5].includes(s.mois))
    labels.push(s.mois === 5 ? 'Repêchage du Mondial' : 'Qualifications régionales du Mondial');
  if (s.mois === 6) labels.push('Mondial U20');
  return labels;
}
