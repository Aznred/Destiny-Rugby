// LE MATCH DE LA SEMAINE — quelle affiche ton club dispute-t-il ce week-end ?
//
// ⚠️ Ce fichier ne SIMULE plus rien. L'ancien système « narratif » (décomposer
// le score en actions, puis les raconter minute par minute) a été entièrement
// remplacé par le moteur tick par tick de `lib/moteur/` : trente entités qui se
// déplacent en mètres, des plaquages par collision, des essais qui naissent
// d'un espace réellement ouvert. Il ne reste ici que la recherche de l'affiche.

import {
  calendrier, journeesALaSemaine, jouerRencontre, nombreJournees, pouleDe, estJourneeDe,
  type MatchChampionnat,
} from './championnat';
import type { Coequipier } from './effectif';
import { POSTE_PAR_ID } from '../data/rugby';
import type { Joueur, PosteId } from '../types';

export interface AfficheSemaine {
  journee: number;
  match: MatchChampionnat;
  cle: string;
}

export interface CarriereDeClub {
  division: string;
  club: string;
  saison: number;
  semaine: number;
  resultats?: Record<string, unknown>;
}

export function matchDuClubSemaine(c: CarriereDeClub, bonus = 0): AfficheSemaine | null {
  const affiches = affichesChampionnatDuClub(c, bonus);
  return affiches.find((a) => !c.resultats?.[a.cle]) ?? affiches.at(-1) ?? null;
}

/** Toutes les journées de la semaine, y compris les semaines à deux matchs. */
export function affichesChampionnatDuClub(c: CarriereDeClub, bonus = 0): AfficheSemaine[] {
  const division = c.division;
  if (!division || !c.club) return [];
  const total = nombreJournees(division, c.club);
  const fin = journeesALaSemaine(division, c.semaine + 1, total);
  const debut = journeesALaSemaine(division, c.semaine, total) + 1;
  if (fin < debut) return [];
  const grille = calendrier(pouleDe(division, c.club), `${division}#${c.saison}`);
  const affiches: AfficheSemaine[] = [];
  for (let journee = debut; journee <= fin; journee++) {
    const affiche = (grille[journee - 1] ?? []).find(([d, e]) => d === c.club || e === c.club);
    if (!affiche) continue;
    const [d, e] = affiche;
    const cle = `${division}#${c.saison}#${journee - 1}#${d}#${e}`;
    affiches.push({
      journee,
      match: jouerRencontre(d, e, c.saison, cle, { club: c.club, bonus }),
      cle,
    });
  }
  return affiches;
}

// Le match du club du joueur pour la semaine en cours, s'il y en a un.
export function matchDeLaSemaine(j: Joueur, bonus = 0): AfficheSemaine | null {
  return matchDuClubSemaine({
    division: j.division ?? '', club: j.club, saison: j.saison, semaine: j.semaine ?? 1,
  }, bonus);
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

// ═══════════════════════════════════════════════════════════════════════════
// L'AFFICHE COMPLÈTE D'UN CLUB — championnat, PHASE FINALE et coupe
// ═══════════════════════════════════════════════════════════════════════════
// Retour de jeu : « le calendrier n'est pas bien fait, je n'ai pas fait les
// play-offs alors que j'étais premier en Régionale 2 ».
//
// ⚠️ `matchDuClubSemaine` NE CONNAÎT QUE LE CHAMPIONNAT, et c'est écrit dans son
// code : elle lit `journeesALaSemaine`, c'est-à-dire la grille des journées. Les
// trois semaines de PHASE FINALE du calendrier n'ont pas de journée — elles ont
// un `tourFinal` — et les huit semaines de COUPE non plus. Le mode manager
// n'appelait que celle-là : premier de sa poule, il traversait donc les demies
// et la finale sans qu'aucun match ne lui soit proposé, et le titre se décidait
// dans le monde simulé sans lui.
//
// ⚠️ LA CARRIÈRE JOUEUR, ELLE, LES CHERCHAIT DÉJÀ — mais dans son ÉCRAN
// (`PanneauJoueur`), en appelant trois fonctions différentes à la main. Une
// règle de jeu qui vit dans un composant ne peut pas servir à un second mode :
// on la remonte donc ici, et les deux carrières lisent la même.

import { phaseFinale } from './phaseFinale';
import { coupeEnDirect, coupesDuClub, matchDuTourCourant } from './coupe';
import { semaine as semaineDuCalendrier, CALENDRIER } from '../data/calendrier';
import { divisionAuDessus, divisionEnDessous, resoudrePyramide } from './promotion';

/** D'où vient l'affiche du week-end. Le rendu s'en sert pour l'annoncer. */
export type NatureAffiche = 'championnat' | 'phaseFinale' | 'coupe';

export interface AfficheComplete extends AfficheSemaine {
  nature: NatureAffiche;
  /** Le nom du tour, pour une phase finale ou une coupe. */
  tour?: string;
  competition?: string;
}

export function libelleAfficheManager(affiche: AfficheComplete, division: string): string {
  const tours: Record<string, string> = {
    barrage: affiche.nature === 'coupe' ? 'Huitième de finale' : 'Barrage',
    quart: 'Quart de finale', demie: 'Demi-finale', finale: 'Finale', accession: 'Barrage d’accès',
  };
  return `${affiche.competition ?? division} · ${affiche.tour ? tours[affiche.tour] ?? affiche.tour : `Journée ${affiche.journee}`}`;
}

/**
 * Le match que ce club dispute cette semaine, quelle qu'en soit la nature.
 *
 * ⚠️ L'ORDRE DE PRIORITÉ N'EST PAS ARBITRAIRE : il suit le TYPE de la semaine
 * dans le calendrier. Une semaine de phase finale ne contient pas de journée de
 * championnat, une semaine de coupe non plus — chercher les trois dans le
 * désordre reviendrait à proposer deux matchs le même week-end.
 */
export function afficheDuClub(c: CarriereDeClub, bonus = 0): AfficheComplete | null {
  if (!c.club || !c.division) return null;
  const sem = semaineDuCalendrier(c.semaine);
  // Les divisions amateurs jouent leur championnat pendant les dates européennes.
  if (estJourneeDe(c.division, sem)) {
    const affiche = matchDuClubSemaine(c, bonus);
    return affiche ? { ...affiche, nature: 'championnat' } : null;
  }

  // ── Les trois semaines de phase finale ────────────────────────────────────
  if (sem.type === 'phaseFinale' && sem.tourFinal) {
    const phase = phaseFinale(c.division, c.saison, c.club, bonus);
    const tour = sem.tourFinal === 'acces' ? 'accession' : sem.tourFinal;
    const acces = tour === 'accession' ? resoudrePyramide(c.division, c.saison, c.club, bonus) : null;
    const m = (acces ? [acces.accesVersLeHaut, acces.accesDepuisLeBas] : phase.matchs)
      .find((x) => x && x.tour === tour && (x.domicile === c.club || x.exterieur === c.club));
    if (!m) return null;
    return {
      journee: 0,
      tour,
      nature: 'phaseFinale',
      cle: acces
        ? `acces#${acces.accesVersLeHaut === m ? divisionAuDessus(c.division) : c.division}#${acces.accesVersLeHaut === m ? c.division : divisionEnDessous(c.division)}#${c.saison}#${m.domicile}#${m.exterieur}`
        : `phase#${c.division}#${c.saison}#${tour}#${m.domicile}#${m.exterieur}`,
      match: {
        domicile: m.domicile, exterieur: m.exterieur,
        scoreD: m.scoreD, scoreE: m.scoreE,
        // ⚠️ UN DUEL NE COMPTE PAS LES ESSAIS. `MatchFinal` ne porte que le
        // score : le moteur les recalculera au coup d’envoi, et les afficher
        // à zéro avant le match serait un chiffre faux, pas une absence.
        essaisD: 0, essaisE: 0,
      } as MatchChampionnat,
    };
  }

  // ── Les huit dates de coupe d'Europe ──────────────────────────────────────
  if (sem.type === 'coupe') {
    const datesJouees = CALENDRIER
      .slice(0, Math.max(0, c.semaine)).filter((s) => s.type === 'coupe').length;
    const coupes = coupesDuClub(c.club, c.saison);
    // Un cinquième de Champions Cup poursuit sa saison en Challenge Cup.
    if (datesJouees > 4 && coupes.includes('championsCup')) coupes.push('challengeCup');
    for (const coupeId of coupes) {
      const etat = coupeEnDirect(coupeId, c.saison, c.club, datesJouees);
      if (etat && datesJouees <= etat.totalJournees) {
        for (const [p, poule] of etat.poules.entries()) {
          const match = poule.journees[datesJouees - 1]?.find((x) => x.domicile === c.club || x.exterieur === c.club);
          if (match) return {
            journee: datesJouees, nature: 'coupe', competition: etat.nom,
            cle: `${coupeId}#${c.saison}#${p}#${datesJouees - 1}#${match.domicile}#${match.exterieur}`,
            match,
          };
        }
      }
      const m = etat && matchDuTourCourant(etat, c.club);
      if (!m) continue;
      return {
        journee: 0,
        tour: m.tour,
        nature: 'coupe',
        competition: etat!.nom,
        cle: `coupe#${coupeId}#${c.saison}#${m.tour}#${m.domicile}#${m.exterieur}`,
        match: {
          domicile: m.domicile, exterieur: m.exterieur,
          scoreD: m.scoreD, scoreE: m.scoreE,
          // ⚠️ UN DUEL NE COMPTE PAS LES ESSAIS. `MatchFinal` ne porte que le
        // score : le moteur les recalculera au coup d’envoi, et les afficher
        // à zéro avant le match serait un chiffre faux, pas une absence.
        essaisD: 0, essaisE: 0,
        } as MatchChampionnat,
      };
    }
    return null;
  }

  // ── Le championnat, le reste du temps ─────────────────────────────────────
  const championnat = matchDuClubSemaine(c, bonus);
  return championnat ? { ...championnat, nature: 'championnat' } : null;
}
