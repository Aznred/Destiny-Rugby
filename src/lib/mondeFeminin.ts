// LE MONDE DU RUGBY FÉMININ, DANS LA FORME QUE LE JEU SAIT LIRE (première pierre de la carrière solo féminine).
// `data/mondeFeminin.generated.ts` porte les championnats, les clubs et les effectifs. Ce module les traduit vers les
// types du jeu (`Competition`, `Club`) et dit ce que le règlement de chaque championnat donne au classement
// (`competitionRules.ts`, entrées `f-…`). Fonctions pures : ni store, ni DOM.
//
// Le monde actif est choisi à la création (`mondeActif.ts`). Les clubs homonymes restent ainsi dans des catalogues
// distincts : une joueuse de Toulouse ne récupère ni l'effectif ni la note de l'équipe masculine.

import type { Club, Competition, PosteId } from '../types.js';
import { CHAMPIONNATS_FEMININS, effectifFeminin, type ChampionnatFeminin, type JoueuseMonde } from '../data/mondeFeminin.generated.js';
import { rulesFor, standingsStatuses, type StandingsStatus } from './competitionRules.js';

/** Les championnats dont on connaît les clubs et les effectifs. */
export const championnatsJouables = (): ChampionnatFeminin[] => CHAMPIONNATS_FEMININS.filter(c => c.jouable);

/** La pyramide française : Élite 1 puis Élite 2 (la Fédérale 1 et la Fédérale 2 attendent leurs données). */
export const pyramideFrancaise = (): ChampionnatFeminin[] => championnatsJouables().filter(c => c.france).sort((a, b) => b.niveau - a.niveau);

export function championnatDuClubFeminin(club: string): ChampionnatFeminin | undefined {
  return CHAMPIONNATS_FEMININS.find(c => c.clubs.some(k => k.nom === club));
}

/** Un championnat féminin comme une `Competition` du jeu : même forme que le Top 14 ou la Premiership. */
export function competitionDepuisChampionnat(c: ChampionnatFeminin): Competition {
  const rang = c.france ? pyramideFrancaise().findIndex(p => p.id === c.id) + 1 : 0;
  return {
    id: c.id, nom: c.nom, pays: c.pays, drapeaux: [c.drapeau], emoji: '', niveau: rang, zone: c.france ? 'France' : 'Monde',
    clubs: c.clubs.map((k): Club => ({ nom: k.nom, c1: k.c1, c2: k.c2, ...(k.logo ? { logo: k.logo } : {}) })),
  };
}
export const competitionsFeminines = (): Competition[] => championnatsJouables().map(competitionDepuisChampionnat);

/** Matchs de saison régulière d'un club : aller-retour ou aller simple contre chaque adversaire. */
export const matchsParClub = (c: ChampionnatFeminin): number => Math.max(0, c.clubs.length - 1) * (c.allerRetour ? 2 : 1);

/** Ce que chaque place du classement vaut en fin de saison régulière (qualifiée, reléguée, barragiste…). */
export function statutsDuClassement(c: ChampionnatFeminin): StandingsStatus[] {
  return standingsStatuses(rulesFor(c.id), c.clubs.length);
}

/** Le XV type d'un club : la mieux notée à chaque poste. */
export function quinzeType(club: string): JoueuseMonde[] {
  const effectif = effectifFeminin(club) ?? [];
  const vus = new Set<PosteId>();
  return [...effectif].sort((a, b) => b.note - a.note).filter(j => !vus.has(j.poste) && Boolean(vus.add(j.poste)));
}
