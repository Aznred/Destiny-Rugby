// LE TOURNOI DE FIN D'ANNÉE DES DIVISIONS AMATEURES
//
// Une division amateur ne se joue pas dans une poule unique : la Fédérale 3
// aligne 157 clubs, la Régionale 1 en compte 63. On les découpe en poules de
// 12 (`poulesDe`, lib/championnat.ts) — mais alors, qui est CHAMPION ?
//
// Réponse, et c'est la demande explicite du joueur : un TOURNOI DE FIN
// D'ANNÉE, façon coupe de France. Les meilleurs de chaque poule se qualifient,
// on complète à la puissance de deux inférieure avec les meilleurs deuxièmes,
// et on joue un tableau sec jusqu'au titre.
//
//   • 1 poule  → pas de tournoi, la phase finale classique suffit ;
//   • 2 à 3 poules → les 2 premiers de chaque poule (4 à 6 qualifiés) ;
//   • 4 poules et plus → le premier de chaque poule, plus les meilleurs
//     deuxièmes pour atteindre 8, 16 ou 32 équipes.
//
// Tout est déterministe (graine = division + saison + tour) : rien à
// sauvegarder, et rouvrir l'écran ne rejoue pas le tournoi.

import { poulesDe, type LigneTableau } from './championnat.js';
import { phaseFinale, duel, type MatchFinal } from './phaseFinale.js';
import { forceEffectif } from './effectif.js';

export interface QualifieTournoi {
  club: string;
  poule: number; // index de la poule d'origine
  rang: number; // sa place dans cette poule
  points: number;
  difference: number;
}

export interface Tournoi {
  divisionId: string;
  nom: string;
  poules: { nom: string; classement: LigneTableau[] }[];
  qualifies: QualifieTournoi[];
  matchs: MatchFinal[];
  champion: string | null;
  finaliste: string | null;
  relegues: string[]; // les derniers de chaque poule
}

const NOM_TOUR: Record<number, string> = {
  32: 'Trente-deuxièmes', 16: 'Seizièmes', 8: 'Quarts de finale',
  4: 'Demi-finales', 2: 'Finale',
};

// La plus grande puissance de deux qui tienne dans le nombre de candidats
// (minimum 2 : sans ça il n'y a pas de finale).
function tailleDuTableau(candidats: number): number {
  let n = 2;
  while (n * 2 <= candidats) n *= 2;
  return Math.min(32, n);
}

// Le tournoi d'une division amateur découpée en poules. Renvoie `null` quand la
// division tient dans une seule poule : la phase finale classique suffit.
export function tournoiDeFinDAnnee(
  divisionId: string,
  saison: number,
  nomDivision: string,
  clubJoueur = '',
  bonusJoueur = 0,
): Tournoi | null {
  const poules = poulesDe(divisionId);
  if (poules.length < 2) return null;

  // 1. On joue TOUTES les poules jusqu'au bout.
  const classements = poules.map((_, i) =>
    phaseFinale(divisionId, saison, clubJoueur, bonusJoueur, i).classement,
  );

  const qualifies: QualifieTournoi[] = [];
  const deuxiemes: QualifieTournoi[] = [];
  const relegues: string[] = [];
  const parPoule = poules.length <= 3 ? 2 : 1;

  classements.forEach((cl, i) => {
    cl.slice(0, parPoule).forEach((l, r) => {
      qualifies.push({ club: l.club, poule: i, rang: r + 1, points: l.points, difference: l.difference });
    });
    // Les deuxièmes non qualifiés d'office servent de repêchés.
    if (parPoule === 1 && cl[1]) {
      deuxiemes.push({ club: cl[1].club, poule: i, rang: 2, points: cl[1].points, difference: cl[1].difference });
    }
    const dernier = cl[cl.length - 1];
    if (dernier) relegues.push(dernier.club);
  });

  // 2. On complète à la puissance de deux avec les meilleurs deuxièmes.
  deuxiemes.sort((a, b) => b.points - a.points || b.difference - a.difference);
  const cible = tailleDuTableau(qualifies.length + deuxiemes.length);
  while (qualifies.length < cible && deuxiemes.length) qualifies.push(deuxiemes.shift()!);
  // Trop de qualifiés pour un tableau propre : on garde les meilleurs.
  qualifies.sort((a, b) => a.rang - b.rang || b.points - a.points || b.difference - a.difference);
  const tableau = qualifies.slice(0, tailleDuTableau(qualifies.length));

  // 3. Le tableau, en tête de série : le 1er reçoit le dernier qualifié.
  //    Les clubs d'une même poule ne se croisent qu'après le premier tour,
  //    c'est ce que donne naturellement l'appariement 1-N, 2-N-1…
  const matchs: MatchFinal[] = [];
  let tour = tableau.map((q) => q.club);
  while (tour.length >= 2) {
    const taille = tour.length;
    const libelleTour = NOM_TOUR[taille] ?? `Tour à ${taille}`;
    const suivant: string[] = [];
    for (let i = 0; i < taille / 2; i++) {
      const a = tour[i];
      const b = tour[taille - 1 - i];
      // Le mieux classé reçoit — sauf en finale, terrain neutre.
      const finale = taille === 2;
      const m = duel(
        a, b, saison,
        `tournoi#${divisionId}#${saison}#${taille}#${a}#${b}`,
        finale ? 'finale' : taille === 4 ? 'demie' : taille === 8 ? 'quart' : 'barrage',
        `${finale ? 'FINALE' : libelleTour} : ${a} - ${b}`,
        finale ? 0 : 3,
      );
      matchs.push(m);
      suivant.push(m.vainqueur);
    }
    // Le tour suivant est reclassé par force d'effectif : le plus solide des
    // qualifiés devient tête de série, comme dans un vrai tirage protégé.
    tour = suivant.sort((x, y) => forceEffectif(y, saison) - forceEffectif(x, saison));
  }

  const finale = matchs[matchs.length - 1] ?? null;
  return {
    divisionId,
    nom: `Tournoi final de ${nomDivision}`,
    poules: poules.map((_, i) => ({ nom: `Poule ${i + 1}`, classement: classements[i] })),
    qualifies: tableau,
    matchs,
    champion: finale?.vainqueur ?? null,
    finaliste: finale?.perdant ?? null,
    relegues,
  };
}
