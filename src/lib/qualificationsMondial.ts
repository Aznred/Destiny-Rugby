import { calendrier, classer, versionResultatsJoues } from './championnat.js';
import { forceNation, jouerTestMatch, type CompetitionInternationale } from './international.js';
import { mondialEnDirect, DATES_POULES } from './mondial.js';
import { estAnneeDeCoupeDuMonde } from '../data/calendrier.js';

const AUTOMATIQUES_2027 = ['France', 'Afrique du Sud', 'Nouvelle-Zélande', 'Angleterre', 'Irlande',
  'Écosse', 'Italie', 'Pays de Galles', 'Australie', 'Fidji', 'Japon', 'Argentine'];
const ZONES = [
  { id: 'europe', nom: 'Europe', places: 4, nations: ['Géorgie','Portugal','Espagne','Roumanie','Belgique','Pays-Bas','Allemagne','Russie','Suisse','Pologne','France','Irlande','Angleterre','Écosse','Pays de Galles','Italie'] },
  { id: 'afrique', nom: 'Afrique', places: 1, nations: ['Namibie','Zimbabwe','Kenya','Ouganda','Algérie','Tunisie','Afrique du Sud'] },
  { id: 'ameriqueSud', nom: 'Amérique du Sud', places: 1, nations: ['Uruguay','Chili','Brésil','Paraguay','Colombie','Pérou','Argentine'] },
  { id: 'ameriqueNord', nom: 'Amérique du Nord', places: 1, nations: ['États-Unis','Canada','Mexique','Jamaïque'] },
  { id: 'asie', nom: 'Asie', places: 1, nations: ['Hong Kong','Corée du Sud','Malaisie','Sri Lanka','Émirats arabes unis','Japon'] },
  { id: 'pacifique', nom: 'Pacifique', places: 3, nations: ['Samoa','Tonga','Îles Cook','Papouasie-Nouvelle-Guinée','Îles Salomon','Australie','Nouvelle-Zélande','Fidji'] },
];
export interface CycleQualification {
  saisonMondial: number;
  automatiques: string[];
  regions: { competition: CompetitionInternationale; places: number; qualifies: string[] }[];
  repechage: CompetitionInternationale;
  vainqueurRepechage: string;
  qualifies: string[];
}
const cache = new Map<string, CycleQualification>();

function classement(c: CompetitionInternationale, saison: number) {
  const matchs = calendrier(c.equipes, c.id + '#' + saison).slice(0, c.journees).map((tour, j) =>
    tour.map(([d,e]) => jouerTestMatch(d,e,saison, `${c.id}#${saison}#${j}#${d}#${e}`, null)));
  return classer(c.equipes, matchs).map((l) => l.club);
}

/** Cycle du jeu : 12 places héritées, 11 régionales et un repêchage à quatre.
 * Les résultats seedés et les scores sauvegardés restent identiques au rechargement.
 * Les quotas régionaux sont une règle de simulation, pas une reproduction des futurs règlements.
 */
export function cycleQualification(saisonMondial: number): CycleQualification {
  const cle = saisonMondial + '#' + versionResultatsJoues();
  const memo = cache.get(cle);
  if (memo) return memo;
  const automatiques = saisonMondial <= 2 ? [...AUTOMATIQUES_2027]
    : mondialEnDirect(saisonMondial - 4, DATES_POULES).poules.flatMap((p) => p.classement.slice(0,2).map((l) => l.club));
  const saison = Math.max(1, saisonMondial - 1);
  const regions = ZONES.map((z) => {
    const equipes = z.nations.filter((n) => !automatiques.includes(n));
    const competition: CompetitionInternationale = { id: 'qualif-' + z.id, nom: 'Qualifications Mondial · ' + z.nom,
      emoji: '🌍', fenetre: 'tournoi', equipes, journees: equipes.length % 2 ? equipes.length : equipes.length - 1 };
    const ordre = classement(competition, saison);
    return { competition, places: z.places, qualifies: ordre.slice(0,z.places), suivant: ordre[z.places] };
  });
  // Les quatre meilleurs non-qualifiés régionaux accèdent au tournoi final.
  const repeches = regions.map((r) => r.suivant).filter((n): n is string => !!n)
    .sort((a,b) => forceNation(b) - forceNation(a)).slice(0,4);
  const repechage: CompetitionInternationale = { id: 'repechageMondial', nom: 'Repêchage final · Coupe du monde',
    emoji: '🎟️', fenetre: 'tournoi', equipes: repeches, journees: 3 };
  const vainqueurRepechage = classement(repechage, saison)[0];
  const qualifies = [...automatiques, ...regions.flatMap((r) => r.qualifies), vainqueurRepechage]
    .sort((a,b) => forceNation(b) - forceNation(a));
  const cycle = { saisonMondial, automatiques, regions, repechage, vainqueurRepechage, qualifies };
  cache.set(cle, cycle);
  return cycle;
}
export function competitionsQualifications(saison: number): CompetitionInternationale[] {
  if (!estAnneeDeCoupeDuMonde(saison + 1)) return [];
  const cycle = cycleQualification(saison + 1);
  return [...cycle.regions.map((r) => r.competition), cycle.repechage];
}
