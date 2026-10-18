// LE TOURNOI DE FIN D'ANNÉE DES DIVISIONS AMATEURES
//
// Une division amateur ne se joue pas dans une poule unique : la Fédérale 3
// aligne 157 clubs, la Régionale 1 en compte 63. On les découpe en poules de
// 12 (`poulesDe`, lib/championnat.ts) — mais alors, qui est CHAMPION ?
//
// Les places directes et les barrages de poule viennent de competitionRules.
// Les vainqueurs rejoignent ensuite un tableau sec jusqu'au titre. Les poules
// incomplètes donnent des exemptions aux meilleures têtes de série : aucun
// qualifié n'est supprimé pour arrondir la taille à une puissance de deux.
// Une poule unique garde sa phase finale classique. Un ancien tableau déjà
// commencé conserve ses appariements et ses résultats pour cette saison.
//
// Le tableau est une lecture des résultats enregistrés : sa construction
// ne simule aucune rencontre et n'anticipe aucun vainqueur.

import { poulesDe, resultatsJouesDuTableau, versionResultatsJoues, type LigneTableau } from './championnat.js';
import { championnatEnDirect } from './championnat.js';
import { construireBracket, preparerElimination, semaineElimination, vainqueursDuTour, type MatchElimination } from './bracketProgressif.js';
import { formatTournoi, qualificationParPoule, rulesFor, zones } from './competitionRules.js';
import { clubParNom } from '../data/clubs.js';

export interface QualifieTournoi {
  club: string;
  qualificationId: string;
  region?: string;
  seed?: number;
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
  matchs: MatchElimination[];
  champion: string | null;
  finaliste: string | null;
  /** Les relégués directs de chaque poule (règlement de la division) : tous les derniers d'abord, puis les avant-derniers. */
  relegues: string[];
  qualifiesDirects?: string[];
  barragistes?: string[];
  tailleTableau?: number;
}

// La plus grande puissance de deux qui tienne dans le nombre de candidats
// (minimum 2 : sans ça il n'y a pas de finale).
function tailleDuTableau(candidats: number): number {
  let n = 2;
  while (n * 2 <= candidats) n *= 2;
  return Math.min(64, n);
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
  // ⚠️ ON JOUE TOUTES LES POULES DE LA DIVISION : jusqu'à vingt-deux championnats entiers (de 40 à 700 ms selon
  // l'étage). L'affiche du week-end (`afficheDuClub`) le demande à chaque rendu : sans mémoire, l'écran de carrière
  // se figeait pendant les phases finales. Le résultat ne dépend que de ses paramètres et des résultats JOUÉS
  // (`versionResultatsJoues`). La mémoire se lit AVANT tout : découper la division en poules coûte déjà 30 ms.
  const empreinte = `${divisionId}#${saison}#${nomDivision}#${clubJoueur}#${bonusJoueur}#${versionResultatsJoues()}`;
  const connu = memoire.get(empreinte);
  if (connu !== undefined) return connu;
  const poules = poulesDe(divisionId);
  const tournoi = poules.length < 2 ? null : calculerTournoi(poules, divisionId, saison, nomDivision, clubJoueur, bonusJoueur);
  if (memoire.size >= 24) memoire.clear();
  memoire.set(empreinte, tournoi);
  return tournoi;
}

const memoire = new Map<string, Tournoi | null>();

function calculerTournoi(
  poules: string[][], divisionId: string, saison: number, nomDivision: string, clubJoueur: string, bonusJoueur: number,
): Tournoi {
  const reglement = rulesFor(divisionId);
  const format = formatTournoi(reglement, poules.map(p => p.length));
  const prefixe = `tournoi#${divisionId}#${saison}`;
  // Une phase finale déjà commencée conserve ses clubs, ses clés et ses résultats.
  if (!format || resultatsJouesDuTableau(prefixe).some(r => /^\d+$/.test(r.cle.split('#')[3]))) {
    const ancien = calculerAncienTournoi(poules, divisionId, saison, nomDivision, clubJoueur, bonusJoueur);
    if (!format || ancien.matchs.some(m => m.status === 'completed')) return ancien;
  }
  const classements = poules.map((_, i) => championnatEnDirect(divisionId, saison, clubJoueur, 999, bonusJoueur, i).classement);
  const qualifies: QualifieTournoi[] = [];
  const directs: string[] = [], barragistes: string[] = [];
  const matchs: MatchElimination[] = [];
  const taille = Math.max(2, 2 ** Math.ceil(Math.log2(format!.principal)));
  const debut = semaineElimination(taille);
  const relegues: string[] = [];
  classements.forEach((cl, i) => {
    const f = qualificationParPoule(reglement, cl.length)!;
    cl.slice(0, f.directs + f.barragistes).forEach((l, r) => {
      qualifies.push({ club: l.club, qualificationId: `${divisionId}#${saison}#${l.club}`, poule: i, rang: r + 1, points: l.points, difference: l.difference, region: clubParNom(l.club)?.ligue });
      (r < f.directs ? directs : barragistes).push(l.club);
    });
    const candidats = cl.slice(f.directs, f.directs + f.barragistes);
    for (let j = 0; j < candidats.length / 2; j++) {
      const a = candidats[j].club, b = candidats[candidats.length - 1 - j].club;
      matchs.push(preparerElimination(a, b, `${prefixe}#format2026#barrage#${a}#${b}`, 'barrage', `Barrage : ${a} - ${b}`, debut - 1));
    }
    const n = zones(reglement, cl.length, poules.length).directRelegation;
    relegues.push(...cl.slice(cl.length - n).reverse().map(l => l.club));
  });
  qualifies.sort((a, b) => a.rang - b.rang || b.points - a.points || b.difference - a.difference || a.club.localeCompare(b.club, 'fr'));
  qualifies.forEach((q, i) => { q.seed = i + 1; });
  const gagnants = barragistes.length ? vainqueursDuTour(matchs, barragistes) : [];
  if (gagnants) {
    const retenus = new Set([...directs, ...gagnants]);
    matchs.push(...construireBracket(qualifies.filter(q => retenus.has(q.club)).map(q => q.club), `${prefixe}#format2026`));
  }
  const finale = matchs.find(m => m.tour === 'finale' && m.status === 'completed');
  return { divisionId, nom: `Tournoi final de ${nomDivision}`, poules: classements.map((classement, i) => ({ nom: `Poule ${i + 1}`, classement })),
    qualifies, qualifiesDirects: directs, barragistes, tailleTableau: taille, matchs,
    champion: finale?.vainqueur ?? null, finaliste: finale?.perdant ?? null, relegues };
}

function calculerAncienTournoi(
  poules: string[][], divisionId: string, saison: number, nomDivision: string, clubJoueur: string, bonusJoueur: number,
): Tournoi {

  // 1. On joue TOUTES les poules jusqu'au bout.
  const classements = poules.map((_, i) =>
    championnatEnDirect(divisionId, saison, clubJoueur, 999, bonusJoueur, i).classement,
  );

  const qualifies: QualifieTournoi[] = [];
  const deuxiemes: QualifieTournoi[] = [];
  const reglement = rulesFor(divisionId);
  const releguesParRang: string[][] = [];
  const parPoule = poules.length <= 3 ? 2 : 1;

  classements.forEach((cl, i) => {
    cl.slice(0, parPoule).forEach((l, r) => {
      qualifies.push({ club: l.club, qualificationId: `${divisionId}#${saison}#${l.club}`, poule: i, rang: r + 1, points: l.points, difference: l.difference });
    });
    // Les deuxièmes non qualifiés d'office servent de repêchés.
    if (parPoule === 1 && cl[1]) {
      deuxiemes.push({ club: cl[1].club, qualificationId: `${divisionId}#${saison}#${cl[1].club}`, poule: i, rang: 2, points: cl[1].points, difference: cl[1].difference });
    }
    // Les relégués directs de la poule, le dernier d'abord. Leur nombre vient du règlement (deux en Fédérale).
    const n = zones(reglement, cl.length, poules.length).directRelegation;
    for (let r = 0; r < n; r++) (releguesParRang[r] ??= []).push(cl[cl.length - 1 - r].club);
  });
  const relegues = releguesParRang.flat();

  // 2. On complète à la puissance de deux avec les meilleurs deuxièmes.
  deuxiemes.sort((a, b) => b.points - a.points || b.difference - a.difference);
  const cible = tailleDuTableau(qualifies.length + deuxiemes.length);
  while (qualifies.length < cible && deuxiemes.length) qualifies.push(deuxiemes.shift()!);
  // Trop de qualifiés pour un tableau propre : on garde les meilleurs.
  qualifies.sort((a, b) => a.rang - b.rang || b.points - a.points || b.difference - a.difference);
  const tableau = qualifies.slice(0, tailleDuTableau(qualifies.length)).map((q, i) => ({ ...q, region: clubParNom(q.club)?.ligue, seed: i + 1 }));

  // 3. Le tableau, en tête de série : le 1er reçoit le dernier qualifié.
  //    Les rencontres historiques valides gardent leur appariement.
  // Les identités des qualifications sont conservées ; les graines ne servent qu'à l'appariement.
  const matchs = construireBracket(tableau.map(q => q.club), `tournoi#${divisionId}#${saison}`);
  const finale = matchs.find(m => m.tour === 'finale' && m.status === 'completed');
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
