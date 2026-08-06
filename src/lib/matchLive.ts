// LE MATCH DE LA SEMAINE — quelle affiche ton club dispute-t-il ce week-end ?
//
// ⚠️ Ce fichier ne SIMULE plus rien. L'ancien système « narratif » (décomposer
// le score en actions, puis les raconter minute par minute) a été entièrement
// remplacé par le moteur tick par tick de `lib/moteur/` : trente entités qui se
// déplacent en mètres, des plaquages par collision, des essais qui naissent
// d'un espace réellement ouvert. Il ne reste ici que la recherche de l'affiche.

import {
  calendrier, estAmateur, journeesALaSemaine, jouerRencontre, nombreJournees,
  pouleDe, poulesDe, type MatchChampionnat,
} from './championnat';
import { semaine } from '../data/calendrier';
import { afficheCoupeDuClub, coupesDuClub } from './coupe';
import { phaseFinale, tourDeLaSemaine, type MatchFinal } from './phaseFinale';
import { tournoiDeFinDAnnee } from './tournoi';
import { resoudrePyramide } from './promotion';
import { COMPETITIONS } from '../data/clubs';
import type { Coequipier } from './effectif';
import { POSTE_PAR_ID } from '../data/rugby';
import type { Joueur, PosteId } from '../types';

export interface AfficheSemaine {
  journee: number;
  match: MatchChampionnat;
  cle: string;
}

// Le match du club du joueur pour la semaine en cours, s'il y en a un.
export function matchDeLaSemaine(j: Joueur, bonus = 0): AfficheSemaine | null {
  const division = j.division;
  if (!division) return null;
  const total = nombreJournees(division, j.club);
  const sem = j.semaine ?? 1;
  const fin = journeesALaSemaine(division, sem + 1, total); // journées jouées APRÈS cette semaine
  const debut = journeesALaSemaine(division, sem, total) + 1;
  if (fin < debut) return null; // pas de journée ce week-end

  const grille = calendrier(pouleDe(division, j.club));
  for (let journee = debut; journee <= fin; journee++) {
    const affiche = (grille[journee - 1] ?? []).find(([d, e]) => d === j.club || e === j.club);
    if (!affiche) continue;
    const [d, e] = affiche;
    const cle = `${division}#${j.saison}#${journee - 1}#${d}#${e}`;
    return {
      journee,
      match: jouerRencontre(d, e, j.saison, cle, { club: j.club, bonus }),
      cle,
    };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// L'AFFICHE DU WEEK-END, TOUTES COMPÉTITIONS
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ BUG SIGNALÉ EN JEU : « on peut pas jouer les coupes d'Europe, les matchs
// ne sont pas simulés en direct ». `matchDeLaSemaine` ne regarde que le
// championnat : un week-end européen ou une semaine de phase finale, il rend
// `null`, le bouton « ▶️ Jouer le match » disparaît, et le store se rabat sur
// une estimation générique — sans adversaire, sans score, sans feuille de match.
//
// Ici, on rend l'affiche RÉELLE quelle que soit la compétition : la coupe
// d'Europe (poules ET tableau final), la phase finale du championnat, le
// tournoi de fin d'année des divisions à poules, et le match d'accès.

export interface AfficheCompetition {
  type: 'championnat' | 'coupe' | 'phaseFinale';
  /** Nom de la compétition, pour l'en-tête de la fenêtre de match. */
  competition: string;
  /** Le tour disputé : « journée 7 », « Quart de finale »… */
  tour: string;
  /** L'identifiant du tour couperet (`finale`, `demie`, `accession`…), s'il y en a un. */
  tourId?: TourFinal;
  journee: number;
  match: MatchChampionnat;
  cle: string;
}

// Un match couperet rendu au format « rencontre » : le moteur ne connaît que
// le score, il se moque de savoir que c'était une demi-finale.
function depuisDuel(m: MatchFinal): MatchChampionnat {
  return {
    domicile: m.domicile, exterieur: m.exterieur, scoreD: m.scoreD, scoreE: m.scoreE,
    essaisD: Math.max(0, Math.round((m.scoreD - 6) / 7)),
    essaisE: Math.max(0, Math.round((m.scoreE - 6) / 7)),
  };
}

const LIBELLE_TOUR_FINAL: Record<string, string> = {
  seizieme: 'Seizième de finale', huitieme: 'Huitième de finale',
  quart: 'Quart de finale', barrage: 'Barrage', demie: 'Demi-finale',
  finale: 'FINALE', accession: 'Match d’accès',
};

/** Le match européen du club, ce week-end de coupe. */
export function afficheCoupeDeLaSemaine(j: Joueur): AfficheCompetition | null {
  for (const id of coupesDuClub(j.club)) {
    const a = afficheCoupeDuClub(id, j.saison, j.club, j.semaine ?? 1);
    if (a) {
      return {
        type: 'coupe', competition: a.nom, tour: a.tour,
        journee: a.journee, match: a.match, cle: a.cle,
      };
    }
  }
  return null;
}

/** Le match de phase finale du club, ce week-end de juin. */
export function affichePhaseFinaleDeLaSemaine(j: Joueur, bonus = 0): AfficheCompetition | null {
  const division = j.division;
  if (!division) return null;
  const sem = semaine(j.semaine ?? 1);
  if (sem.type !== 'phaseFinale') return null;
  const nom = COMPETITIONS.find((c) => c.id === division)?.nom ?? 'Phase finale';
  const rendre = (m: MatchFinal): AfficheCompetition => ({
    type: 'phaseFinale', competition: nom,
    tour: LIBELLE_TOUR_FINAL[m.tour] ?? 'Phase finale',
    journee: 0, match: depuisDuel(m),
    cle: `finale#${division}#${j.saison}#${m.tour}#${m.domicile}#${m.exterieur}`,
  });

  // Le match d'accès a sa propre date, après la finale.
  if (sem.tourFinal === 'acces') {
    const py = resoudrePyramide(division, j.saison, j.club, bonus);
    const m = [py.accesVersLeHaut, py.accesDepuisLeBas]
      .find((x): x is MatchFinal => !!x && (x.domicile === j.club || x.exterieur === j.club));
    return m ? rendre(m) : null;
  }

  // ⚠️ DANS UNE DIVISION À POULES MULTIPLES, le champion sort du TOURNOI de fin
  // d'année, pas de la phase finale d'une poule. Sans ça, un joueur de Fédérale
  // 3 n'avait jamais de match en juin alors que son club jouait le titre.
  const matchs = poulesDe(division).length > 1
    ? (tournoiDeFinDAnnee(
        division, j.saison,
        COMPETITIONS.find((c) => c.id === division)?.nom ?? division, j.club, bonus,
      )?.matchs ?? [])
    : phaseFinale(division, j.saison, j.club, bonus).matchs;
  if (!matchs.length) return null;

  const tour = tourDeLaSemaine(matchs, j.semaine ?? 1);
  if (!tour) return null;
  const mien = matchs.find(
    (m) => m.tour === tour && (m.domicile === j.club || m.exterieur === j.club),
  );
  return mien ? rendre(mien) : null;
}

/**
 * L'AFFICHE DU WEEK-END, quelle que soit la compétition. C'est elle que lit le
 * panneau de carrière pour proposer « ▶️ Jouer le match ».
 */
export function afficheDeLaSemaine(j: Joueur, bonus = 0): AfficheCompetition | null {
  const sem = semaine(j.semaine ?? 1);
  // ⚠️ PAS DE TRÊVE EN BAS DE LA PYRAMIDE : de la Nationale 2 à la Régionale 3,
  // un week-end européen est une journée de championnat comme une autre.
  const amateur = estAmateur(j.division ?? '');
  if (sem.type === 'coupe' && !amateur) return afficheCoupeDeLaSemaine(j);
  if (sem.type === 'phaseFinale') return affichePhaseFinaleDeLaSemaine(j, bonus);
  const a = matchDeLaSemaine(j, bonus);
  if (!a) return null;
  return {
    type: 'championnat',
    competition: COMPETITIONS.find((c) => c.id === j.division)?.nom ?? 'Championnat',
    tour: `journée ${a.journee}`,
    journee: a.journee, match: a.match, cle: a.cle,
  };
}

// Le numéro de maillot d'un joueur dans la compo (1 à 15).
export function numeroDe(c: Coequipier, index: number): number {
  const ordre: PosteId[] = [
    'pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g', 'deuxieme_ligne_d',
    'troisieme_aile_g', 'troisieme_aile_d', 'numero_8', 'demi_melee', 'demi_ouverture',
    'ailier_gauche', 'premier_centre', 'deuxieme_centre', 'ailier_droit', 'arriere',
  ];
  const i = ordre.indexOf(c.poste);
  return i >= 0 ? i + 1 : index + 1;
}

export function nomPoste(c: Coequipier): string {
  return POSTE_PAR_ID[c.poste]?.nom ?? '';
}
