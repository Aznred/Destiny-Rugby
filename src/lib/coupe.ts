// LES COUPES D'EUROPE, JOUÉES POUR DE VRAI
//
// Même moteur que le championnat (lib/championnat.ts) : phase de poules au
// barème rugby, puis un TABLEAU FINAL à élimination directe (huitièmes ou
// quarts selon le nombre d'engagés), jusqu'à la finale.
//
// Format : les clubs engagés sont répartis en 4 poules équilibrées (méthode du
// serpent sur la force d'effectif), chaque poule se joue en aller-retour, les
// deux premiers de chaque poule sortent. Tout est DÉTERMINISTE (graine = coupe
// + saison) : rien à sauvegarder, rouvrir l'écran ne rejoue rien.

import { COUPES_EUROPE } from '../data/mondeReel';
import { forceEffectif } from './effectif';
import {
  calendrier, classer, jouerRencontre,
  type LigneTableau, type MatchChampionnat,
} from './championnat';
import { duel, type MatchFinal } from './phaseFinale';

export interface PouleCoupe {
  nom: string;
  clubs: string[];
  journees: MatchChampionnat[][];
  classement: LigneTableau[];
}

export interface EtatCoupe {
  id: string;
  nom: string;
  emoji: string;
  poules: PouleCoupe[];
  totalJournees: number;
  journeesJouees: number;
  bracket: MatchFinal[]; // huitièmes/quarts → demies → finale
  vainqueur: string | null;
  engage: boolean; // le club du joueur dispute cette coupe
}

// 4 poules quand il y a du monde (Champions Cup, Challenge Cup), 2 seulement
// pour une coupe courte comme la Premiership Rugby Cup — sinon on qualifierait
// 8 clubs sur 10 engagés.
function nbPoules(engages: number): number {
  return engages >= 16 ? 4 : 2;
}

export function coupeParId(id: string) {
  return COUPES_EUROPE.find((c) => c.id === id);
}

// Le club dispute-t-il cette coupe cette saison ?
export function participe(coupeId: string, club: string): boolean {
  return !!coupeParId(coupeId)?.clubs.some((c) => c.nom === club);
}

// Coupes auxquelles ce club participe.
export function coupesDuClub(club: string): string[] {
  return COUPES_EUROPE.filter((c) => c.clubs.some((x) => x.nom === club)).map((c) => c.id);
}

// Répartition en poules « serpent » : on classe par force d'effectif, puis on
// distribue 1-2-3-4 / 4-3-2-1. Les gros ne se retrouvent pas tous ensemble.
function repartir(clubs: string[], saison: number): string[][] {
  const n = nbPoules(clubs.length);
  const tries = [...clubs].sort((a, b) => forceEffectif(b, saison) - forceEffectif(a, saison));
  const poules: string[][] = Array.from({ length: n }, () => []);
  tries.forEach((club, i) => {
    const rangee = Math.floor(i / n);
    const col = rangee % 2 === 0 ? i % n : n - 1 - (i % n);
    poules[col].push(club);
  });
  return poules;
}

export function coupeEnDirect(
  coupeId: string, saison: number, clubJoueur: string, journeesJouees: number,
): EtatCoupe | null {
  const coupe = coupeParId(coupeId);
  if (!coupe || coupe.clubs.length < 8) return null;

  const groupes = repartir(coupe.clubs.map((c) => c.nom), saison);
  // ALLER SIMPLE : le calendrier de la saison ne réserve que 8 dates
  // européennes. Un aller-retour (10 journées de poules) ne laisserait aucune
  // place au tableau final — on joue donc la poule à l'aller, et les trois
  // dernières dates servent aux quarts, demies et finale.
  const grilles = groupes.map((g) => {
    const complet = calendrier(g);
    return complet.slice(0, Math.ceil(complet.length / 2));
  });
  const total = Math.max(...grilles.map((g) => g.length));
  const jusqua = Math.max(0, Math.min(total, journeesJouees));

  const poules: PouleCoupe[] = groupes.map((clubs, p) => {
    const journees: MatchChampionnat[][] = [];
    for (let j = 0; j < Math.min(jusqua, grilles[p].length); j++) {
      journees.push(grilles[p][j].map(([d, e]) =>
        jouerRencontre(d, e, saison, `${coupeId}#${saison}#${p}#${j}#${d}#${e}`, null),
      ));
    }
    return {
      nom: `Poule ${String.fromCharCode(65 + p)}`,
      clubs,
      journees,
      classement: classer(clubs, journees),
    };
  });

  // Tableau final : seulement quand les poules sont terminées.
  const bracket: MatchFinal[] = [];
  let vainqueur: string | null = null;
  if (jusqua >= total) {
    // Les deux premiers de chaque poule : premiers d'un côté, deuxièmes de
    // l'autre — un premier ne peut pas croiser un premier avant les demies.
    const n = poules.length;
    const premiers = poules.map((p) => p.classement[0]?.club).filter(Boolean) as string[];
    const seconds = poules.map((p) => p.classement[1]?.club).filter(Boolean) as string[];
    if (premiers.length === n && seconds.length === n) {
      const cle = (tour: string, a: string, b: string) => `coupe#${coupeId}#${saison}#${tour}#${a}#${b}`;
      // Un premier ne peut pas croiser un premier avant les demies : A1-D2,
      // B1-C2, C1-B2, D1-A2 (le premier de poule reçoit).
      const affiches: [string, string][] = premiers.map(
        (p, i) => [p, seconds[n - 1 - i]] as [string, string],
      );

      let demiFinalistes: string[];
      if (n === 4) {
        const quarts = affiches.map(([d, e], i) =>
          duel(d, e, saison, cle(`quart${i}`, d, e), 'quart', `Quart de finale : ${d} – ${e}`),
        );
        bracket.push(...quarts);
        demiFinalistes = quarts.map((q) => q.vainqueur);
      } else {
        // Coupe courte : deux poules, on passe directement aux demi-finales.
        demiFinalistes = [affiches[0][0], affiches[0][1], affiches[1][0], affiches[1][1]];
      }

      const d1 = duel(
        demiFinalistes[0], demiFinalistes[1], saison,
        cle('demie1', demiFinalistes[0], demiFinalistes[1]), 'demie',
        `Demi-finale : ${demiFinalistes[0]} – ${demiFinalistes[1]}`,
      );
      const d2 = duel(
        demiFinalistes[2], demiFinalistes[3], saison,
        cle('demie2', demiFinalistes[2], demiFinalistes[3]), 'demie',
        `Demi-finale : ${demiFinalistes[2]} – ${demiFinalistes[3]}`,
      );
      const finale = duel(
        d1.vainqueur, d2.vainqueur, saison,
        cle('finale', d1.vainqueur, d2.vainqueur), 'finale',
        `FINALE : ${d1.vainqueur} – ${d2.vainqueur}`,
        0, // terrain neutre
      );
      bracket.push(d1, d2, finale);
      vainqueur = finale.vainqueur;
    }
  }

  return {
    id: coupe.id,
    nom: coupe.nom,
    emoji: coupe.emoji,
    poules,
    totalJournees: total,
    journeesJouees: jusqua,
    bracket,
    vainqueur,
    engage: participe(coupeId, clubJoueur),
  };
}
