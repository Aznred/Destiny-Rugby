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
} from './championnat.js';
import type { Coequipier } from './effectif.js';
import { POSTE_PAR_ID } from '../data/rugby.js';
import type { Joueur, PosteId } from '../types.js';

export interface AfficheSemaine {
  journee: number;
  match: MatchChampionnat;
  cle: string;
}

/** La clé d'un match de préparation : il ne compte dans aucun classement. */
export const PREFIXE_PREPARATION = 'prepa#';
/** Les deux derniers week-ends d'août, juste avant la première journée. */
const SEMAINES_DE_PREPARATION = [7, 8];

/**
 * LE MATCH DE PRÉPARATION DU CLUB (Correctif 24). Demande : « Lorsqu'on démarre une carrière avec un joueur existant, les
 * matchs d'été semblent toujours utiliser la même équipe. Il faut utiliser le véritable club du joueur sélectionné. »
 *
 * L'été n'avait de matchs que pour les internationaux — et c'étaient ceux de leur sélection. Le club, lui, ne jouait rien
 * avant la première journée. Il dispute maintenant deux amicaux, l'un à domicile, l'autre à l'extérieur, contre deux
 * adversaires de SA poule, tirés de son nom et de la saison (donc différents d'un club à l'autre, et d'un été au suivant).
 *
 * ⚠️ SA CLÉ COMMENCE PAR `prepa#` : le championnat ne lit que les clés de sa propre grille, ce résultat n'entre donc dans
 * aucun classement. Le match se joue ou se laisse passer ; il ne se simule pas en fond.
 */
export function matchDePreparation(c: CarriereDeClub, bonus = 0): AfficheSemaine | null {
  const rang = SEMAINES_DE_PREPARATION.indexOf(c.semaine);
  if (rang < 0 || !c.club || !c.division) return null;
  const autres = pouleDe(c.division, c.club).filter((nom) => nom !== c.club);
  if (!autres.length) return null;
  // Un tirage stable, sans générateur : la somme des lettres du club et la saison.
  let h = c.saison * 7919;
  for (let i = 0; i < c.club.length; i++) h = (h * 31 + c.club.charCodeAt(i)) >>> 0;
  const premier = h % autres.length;
  const adversaire = autres[(premier + rang * Math.max(1, Math.floor(autres.length / 2))) % autres.length];
  const [d, e] = rang % 2 === 0 ? [c.club, adversaire] : [adversaire, c.club];
  const cle = `${PREFIXE_PREPARATION}${c.division}#${c.saison}#${c.semaine}#${d}#${e}`;
  return { journee: 0, match: jouerRencontre(d, e, c.saison, cle, { club: c.club, bonus }), cle };
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

import { phaseFinale, type MatchFinal } from './phaseFinale.js';
import { tournoiDeFinDAnnee } from './tournoi.js';
import { coupeEnDirect, coupesDuClub, matchDuTourCourant } from './coupe.js';
import { semaine as semaineDuCalendrier, CALENDRIER } from '../data/calendrier.js';
import { divisionAuDessus, divisionEnDessous, nomDivision, resoudrePyramide } from './promotion.js';

/** D'où vient l'affiche du week-end. Le rendu s'en sert pour l'annoncer. */
export type NatureAffiche = 'championnat' | 'phaseFinale' | 'coupe';

export interface AfficheComplete extends AfficheSemaine {
  nature: NatureAffiche;
  /** Le nom du tour, pour une phase finale ou une coupe. */
  tour?: string;
  competition?: string;
  /** Le nom du tour tel que le tableau l'annonce (« Seizièmes », « Quarts de finale ») quand `tour` ne suffit pas. */
  libelleTour?: string;
}

export function libelleAfficheManager(affiche: AfficheComplete, division: string): string {
  const tours: Record<string, string> = {
    barrage: affiche.nature === 'coupe' ? 'Huitième de finale' : 'Barrage',
    quart: 'Quart de finale', demie: 'Demi-finale', finale: 'Finale', accession: 'Barrage d’accès',
  };
  return `${affiche.competition ?? division} · ${affiche.libelleTour ?? (affiche.tour ? tours[affiche.tour] ?? affiche.tour : `Journée ${affiche.journee}`)}`;
}

/** Les tours du TOURNOI FINAL disputés à chaque week-end de phase finale : le même découpage que le tableau affiché. */
const TOURS_DU_TOURNOI: Record<string, MatchFinal['tour'][]> = {
  barrage: ['barrage', 'quart'], demie: ['demie'], finale: ['finale'], acces: [],
};

/**
 * TOUS les matchs couperets de ce club pour ce week-end de phase finale, dans l'ordre où ils se jouent.
 *
 * ⚠️ LE TOURNOI FINAL DES DIVISIONS À POULES N'ÉTAIT PROPOSÉ NULLE PART (Correctif 26). De la Nationale 2 à la
 * Régionale 3, le champion sort d'un tableau sec entre les meilleurs de chaque poule (`lib/tournoi.ts`) : l'écran
 * Résultats l'affichait, la fin de saison s'en servait, mais ni l'entraîneur ni le joueur ne pouvaient en disputer
 * un seul match — le titre se jouait sans eux, sur un score tiré au sort. Ses matchs passent maintenant par la même
 * affiche que les autres, donc par le même moteur, les mêmes vitesses et la même simulation.
 *
 * ⚠️ LA CLÉ EST CELLE QUE LE TABLEAU RELIT (`MatchFinal.cle`, `duel`) : le score joué décide du tour suivant.
 */
export function affichesDePhaseFinale(c: CarriereDeClub, bonus = 0): AfficheComplete[] {
  const sem = semaineDuCalendrier(c.semaine);
  if (!c.club || !c.division || sem.type !== 'phaseFinale' || !sem.tourFinal) return [];
  const affiches: AfficheComplete[] = [];
  const duelEnAffiche = (m: MatchFinal): MatchChampionnat => ({
    domicile: m.domicile, exterieur: m.exterieur,
    scoreD: m.scoreD, scoreE: m.scoreE,
    // ⚠️ UN DUEL NE COMPTE PAS LES ESSAIS. `MatchFinal` ne porte que le
    // score : le moteur les recalculera au coup d’envoi, et les afficher
    // à zéro avant le match serait un chiffre faux, pas une absence.
    essaisD: 0, essaisE: 0,
  } as MatchChampionnat);

  // 1. Le tour de SA poule (barrage, demie, finale) ou le match d'accès.
  const phase = phaseFinale(c.division, c.saison, c.club, bonus);
  const tour = sem.tourFinal === 'acces' ? 'accession' : sem.tourFinal;
  const acces = tour === 'accession' ? resoudrePyramide(c.division, c.saison, c.club, bonus) : null;
  const m = (acces ? [acces.accesVersLeHaut, acces.accesDepuisLeBas] : phase.matchs)
    .find((x) => x && x.tour === tour && (x.domicile === c.club || x.exterieur === c.club));
  if (m) affiches.push({
    journee: 0,
    tour,
    nature: 'phaseFinale',
    cle: acces
      ? `acces#${acces.accesVersLeHaut === m ? divisionAuDessus(c.division) : c.division}#${acces.accesVersLeHaut === m ? c.division : divisionEnDessous(c.division)}#${c.saison}#${m.domicile}#${m.exterieur}`
      : `phase#${c.division}#${c.saison}#${tour}#${m.domicile}#${m.exterieur}`,
    match: duelEnAffiche(m),
  });

  // 2. Le tournoi final de la division, pour les qualifiés des divisions à poules.
  const tours = TOURS_DU_TOURNOI[sem.tourFinal] ?? [];
  const tournoi = tours.length ? tournoiDeFinDAnnee(c.division, c.saison, nomDivision(c.division), c.club, bonus) : null;
  for (const t of tournoi?.matchs ?? []) {
    if (!t.cle || !tours.includes(t.tour) || (t.domicile !== c.club && t.exterieur !== c.club)) continue;
    affiches.push({
      journee: 0, tour: t.tour, nature: 'phaseFinale', competition: tournoi!.nom, cle: t.cle,
      // « Seizièmes : A - B » → « Seizièmes » ; la finale s'écrit en capitales dans le tableau.
      libelleTour: t.tour === 'finale' ? 'Finale' : t.libelle.split(' : ')[0],
      match: duelEnAffiche(t),
    });
  }
  return affiches;
}

/**
 * L'affiche du week-end pour la CARRIÈRE JOUEUR.
 *
 * ⚠️ LA MÊME QUE CELLE DE L'ENTRAÎNEUR pour tout ce qui est couperet (Correctif 26). L'écran du joueur fabriquait ses
 * propres clés (« phase#division#saison#semaine », « coupe#saison#semaine ») : aucune n'était celle que le tableau
 * relit. On gagnait son barrage sur le terrain et le tableau gardait son score tiré au sort — éliminé après une
 * victoire, ou qualifié après une défaite. Le championnat garde son chemin d'origine (une journée par week-end).
 */
export function afficheDuJoueur(j: Joueur, bonus = 0): AfficheComplete | null {
  const c: CarriereDeClub = {
    division: j.division ?? '', club: j.club, saison: j.saison, semaine: j.semaine ?? 1, resultats: j.resultatsClub,
  };
  const sem = semaineDuCalendrier(c.semaine);
  if (sem.type === 'phaseFinale' || (sem.type === 'coupe' && !estJourneeDe(c.division, sem))) return afficheDuClub(c, bonus);
  const championnat = matchDeLaSemaine(j, bonus);
  return championnat ? { ...championnat, nature: 'championnat' } : null;
}

/** Reste-t-il au joueur un match couperet à disputer CE week-end (deuxième tour du tournoi final le même jour) ? */
export function resteUnMatchCeWeekEnd(j: Joueur, bonus = 0): boolean {
  if (semaineDuCalendrier(j.semaine ?? 1).type !== 'phaseFinale') return false;
  const affiche = afficheDuJoueur(j, bonus);
  return !!affiche && !j.resultatsClub?.[affiche.cle];
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
    // Un même week-end peut porter PLUSIEURS matchs couperets (le tour de sa poule, puis le tournoi final de la
    // division) : on rend le premier qui n'a pas encore été joué, et le dernier quand tout l'est.
    const affiches = affichesDePhaseFinale(c, bonus);
    return affiches.find((a) => !c.resultats?.[a.cle]) ?? affiches.at(-1) ?? null;
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
