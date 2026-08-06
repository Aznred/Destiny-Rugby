// CALENDRIER D'UNE SAISON DE RUGBY
//
// La saison va d'août à juin, comme la vraie. Chaque semaine porte une date et
// un type d'évènement : journée de championnat, coupe d'Europe, fenêtre
// internationale (tournée d'automne, Tournoi, Coupe du monde), trêve, ou phase
// finale. C'est ce calendrier qui donne son rythme au mode « journée par
// journée » et qui décide QUAND les sélections tombent.
//
// Les dates sont celles d'une saison type (2025-26) : on ne gère pas les années
// bissextiles ni les décalages réels d'un exercice à l'autre — le but est de
// donner un fil crédible, pas un almanach.

export type TypeSemaine =
  | 'championnat'
  | 'coupe'
  | 'international'
  | 'phaseFinale'
  | 'treve';

// ⚠️ CE QU'UNE DATE EUROPÉENNE FAIT DISPUTER. Le calendrier réserve 8 week-ends
// à la Coupe d'Europe : les QUATRE premiers sont des journées de poules, les
// QUATRE suivants sont le tableau final. Sans cette information, `lib/coupe.ts`
// devait deviner — et il révélait tout le tableau d'un coup dès que les poules
// étaient finies (quarts, demies ET finale avec leurs scores, le même week-end).
export type TourCoupe = 'poule' | 'huitieme' | 'quart' | 'demie' | 'finale';

export interface Semaine {
  numero: number; // 1 = première semaine d'août
  jour: number;
  mois: number; // 1-12
  type: TypeSemaine;
  libelle: string;
  journee?: number; // numéro de journée de championnat
  // Compétition internationale disputée cette semaine (id de COMPETITIONS_NATIONS)
  competitionInternationale?: string;
  finale?: boolean;
  // Tour de la phase finale disputé cette semaine (voir lib/phaseFinale.ts)
  tourFinal?: 'barrage' | 'demie' | 'finale' | 'acces';
  // Tour de coupe d'Europe disputé cette semaine (voir lib/coupe.ts)
  tourCoupe?: TourCoupe;
}

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function libelleDate(s: Semaine): string {
  return `${s.jour} ${MOIS[s.mois - 1]}`;
}

// Construction : on empile les blocs de la saison dans l'ordre réel.
function construire(): Semaine[] {
  const semaines: Semaine[] = [];
  let numero = 0;
  let journee = 0;

  const ajouter = (
    jour: number, mois: number, type: TypeSemaine, libelle: string,
    extra: Partial<Semaine> = {},
  ) => {
    numero += 1;
    if (type === 'championnat') journee += 1;
    semaines.push({
      numero, jour, mois, type, libelle,
      ...(type === 'championnat' ? { journee } : {}),
      ...extra,
    });
  };

  // --- Août / septembre : lancement du championnat ---
  ajouter(30, 8, 'championnat', 'Reprise du championnat');
  ajouter(6, 9, 'championnat', 'Journée de championnat');
  ajouter(13, 9, 'championnat', 'Journée de championnat');
  ajouter(20, 9, 'championnat', 'Journée de championnat');
  ajouter(27, 9, 'championnat', 'Journée de championnat');
  // --- Octobre ---
  ajouter(4, 10, 'championnat', 'Journée de championnat');
  ajouter(11, 10, 'championnat', 'Journée de championnat');
  ajouter(18, 10, 'championnat', 'Journée de championnat');
  ajouter(25, 10, 'championnat', 'Journée de championnat');
  // --- Novembre : fenêtre internationale (tournée d'automne) ---
  ajouter(8, 11, 'international', 'Tournée d’automne', { competitionInternationale: 'autumn' });
  ajouter(15, 11, 'international', 'Tournée d’automne', { competitionInternationale: 'autumn' });
  ajouter(22, 11, 'international', 'Tournée d’automne', { competitionInternationale: 'autumn' });
  ajouter(29, 11, 'championnat', 'Journée de championnat');
  // --- Décembre : coupes d'Europe ---
  ajouter(6, 12, 'championnat', 'Journée de championnat');
  ajouter(13, 12, 'coupe', 'Coupe d’Europe — 1re journée', { tourCoupe: 'poule' });
  ajouter(20, 12, 'coupe', 'Coupe d’Europe — 2e journée', { tourCoupe: 'poule' });
  ajouter(27, 12, 'championnat', 'Journée des fêtes');
  // --- Janvier ---
  ajouter(3, 1, 'championnat', 'Journée de championnat');
  ajouter(10, 1, 'coupe', 'Coupe d’Europe — 3e journée', { tourCoupe: 'poule' });
  ajouter(17, 1, 'coupe', 'Coupe d’Europe — 4e journée', { tourCoupe: 'poule' });
  ajouter(24, 1, 'championnat', 'Journée de championnat');
  ajouter(31, 1, 'championnat', 'Journée de championnat');
  // --- Février / mars : Tournoi des 6 Nations ---
  ajouter(7, 2, 'international', 'Tournoi des 6 Nations', { competitionInternationale: 'sixNations' });
  ajouter(14, 2, 'international', 'Tournoi des 6 Nations', { competitionInternationale: 'sixNations' });
  ajouter(21, 2, 'championnat', 'Journée de championnat');
  ajouter(28, 2, 'international', 'Tournoi des 6 Nations', { competitionInternationale: 'sixNations' });
  ajouter(7, 3, 'championnat', 'Journée de championnat');
  ajouter(14, 3, 'international', 'Tournoi des 6 Nations', { competitionInternationale: 'sixNations' });
  ajouter(21, 3, 'international', 'Tournoi des 6 Nations — Super Samedi', {
    competitionInternationale: 'sixNations', finale: true,
  });
  ajouter(28, 3, 'championnat', 'Journée de championnat');
  // --- Avril : sprint final + phases finales européennes ---
  ajouter(4, 4, 'championnat', 'Journée de championnat');
  ajouter(11, 4, 'coupe', 'Coupe d’Europe — huitièmes', { tourCoupe: 'huitieme' });
  ajouter(18, 4, 'championnat', 'Journée de championnat');
  ajouter(25, 4, 'coupe', 'Coupe d’Europe — quarts', { tourCoupe: 'quart' });
  // --- Mai ---
  ajouter(2, 5, 'championnat', 'Journée de championnat');
  ajouter(9, 5, 'coupe', 'Coupe d’Europe — demi-finales', { tourCoupe: 'demie' });
  ajouter(16, 5, 'championnat', 'Journée de championnat');
  ajouter(23, 5, 'coupe', 'Finale de la Coupe d’Europe', { tourCoupe: 'finale', finale: true });
  ajouter(30, 5, 'championnat', 'Dernière journée');
  // --- Juin : phase finale du championnat ---
  ajouter(6, 6, 'phaseFinale', 'Barrages', { tourFinal: 'barrage' });
  ajouter(13, 6, 'phaseFinale', 'Demi-finales', { tourFinal: 'demie' });
  ajouter(20, 6, 'phaseFinale', 'FINALE', { tourFinal: 'finale', finale: true });
  // Le match d'accès se joue une fois les finales connues : l'avant-dernier de
  // la division reçoit le finaliste malheureux de la division du dessous.
  ajouter(27, 6, 'phaseFinale', 'Match d’accès', { tourFinal: 'acces' });
  ajouter(4, 7, 'treve', 'Intersaison — repos et mercato');

  return semaines;
}

export const CALENDRIER: Semaine[] = construire();
export const SEMAINES_PAR_SAISON = CALENDRIER.length;
export const NB_JOURNEES = CALENDRIER.filter((s) => s.type === 'championnat').length;

// --- LES REPÈRES DES COMPÉTITIONS À ÉLIMINATION DIRECTE ---------------------
// ⚠️ CES QUATRE CONSTANTES SONT LA SOURCE UNIQUE. `lib/coupe.ts` dimensionne
// ses poules et son tableau dessus, `screens/Tableau.tsx` décide ce qu'il a le
// droit d'afficher dessus, et le store sait quel tour se joue ce week-end. Les
// recalculer ailleurs, c'est se garantir un jour un tableau qui montre une
// finale qui ne s'est pas encore jouée.

/** Journées de POULES de coupe d'Europe réservées au calendrier (4). */
export const JOURNEES_POULES_COUPE =
  CALENDRIER.filter((s) => s.tourCoupe === 'poule').length;

/** Les tours du tableau final européen, dans l'ordre du calendrier. */
export const TOURS_COUPE: Exclude<TourCoupe, 'poule'>[] =
  CALENDRIER.filter((s) => s.tourCoupe && s.tourCoupe !== 'poule')
    .map((s) => s.tourCoupe as Exclude<TourCoupe, 'poule'>);

/** Les tours de phase finale du championnat, hors match d'accès (3). */
export const TOURS_PHASE_FINALE: ('barrage' | 'demie' | 'finale')[] =
  CALENDRIER.filter((s) => s.type === 'phaseFinale' && s.tourFinal && s.tourFinal !== 'acces')
    .map((s) => s.tourFinal as 'barrage' | 'demie' | 'finale');

/** Week-ends d'un type de tour déjà PASSÉS avant cette semaine. */
export function weekEndsCoupePasses(numeroSemaine: number): number {
  return CALENDRIER.slice(0, Math.max(0, numeroSemaine - 1))
    .filter((s) => s.type === 'coupe').length;
}

/** Week-ends de phase finale (hors accès) déjà PASSÉS avant cette semaine. */
export function weekEndsPhaseFinalePasses(numeroSemaine: number): number {
  return CALENDRIER.slice(0, Math.max(0, numeroSemaine - 1))
    .filter((s) => s.type === 'phaseFinale' && s.tourFinal !== 'acces').length;
}

/** Le match d'accès a-t-il déjà été disputé ? */
export function accesJoue(numeroSemaine: number): boolean {
  return CALENDRIER.slice(0, Math.max(0, numeroSemaine - 1))
    .some((s) => s.tourFinal === 'acces');
}

export function semaine(numero: number): Semaine {
  return CALENDRIER[Math.max(0, Math.min(CALENDRIER.length - 1, numero - 1))];
}

// Une année de Coupe du monde remplace la tournée d'automne par le Mondial.
export function estAnneeDeCoupeDuMonde(saison: number): boolean {
  return saison % 4 === 0;
}
