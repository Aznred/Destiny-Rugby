// LE CHAMPIONNAT EN DIRECT
//
// Jusqu'ici, le classement du club était une estimation de fin de saison. Ici,
// on joue vraiment le championnat : un calendrier aller-retour, tous les
// résultats équipe contre équipe journée après journée, et un classement qui se
// met à jour en direct — avec le barème du rugby (4 points la victoire, bonus
// offensif et défensif).
//
// Tout est DÉTERMINISTE (graine = division + saison + journée) : rouvrir le
// tableau ne rejoue pas les matchs, et rien n'a besoin d'être sauvegardé.

import { forceEffectif } from './effectif.js';
import { clubsDeDivision } from './divisions.js';
import { CALENDRIER, NB_JOURNEES, type Semaine, type TypeSemaine } from '../data/calendrier.js';
import { clubParNom } from '../data/clubs.js';

export interface MatchChampionnat {
  domicile: string;
  exterieur: string;
  scoreD: number;
  scoreE: number;
  essaisD: number;
  essaisE: number;
}

// Les matchs effectivement coachés remplacent leur résultat théorique dans
// tous les écrans : calendrier, classement et verdict du board. Le registre
// est réalimenté par la sauvegarde au chargement.
let revisionResultats = 0;
export function versionResultatsJoues(): number { return revisionResultats; }
const RESULTATS_JOUES = new Map<string, MatchChampionnat>();

/** Même registre pour la ligue, les coupes et les rencontres à élimination. */
export function resultatJoue(cle: string): MatchChampionnat | undefined {
  return RESULTATS_JOUES.get(cle);
}

export function enregistrerResultatJoue(cle: string, match: MatchChampionnat): void {
  revisionResultats++;
  RESULTATS_JOUES.set(cle, { ...match });
}

export function setResultatsJoues(liste: { cle: string; match: MatchChampionnat }[]): void {
  revisionResultats++;
  RESULTATS_JOUES.clear();
  for (const { cle, match } of liste) RESULTATS_JOUES.set(cle, { ...match });
}

export function effacerResultatsJoues(): void {
  revisionResultats++;
  RESULTATS_JOUES.clear();
}

export interface LigneTableau {
  position: number;
  club: string;
  joues: number;
  gagnes: number;
  nuls: number;
  perdus: number;
  pour: number;
  contre: number;
  difference: number;
  bonus: number;
  points: number;
}

// PRNG déterministe.
export function graine(s: string): () => number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Poule du joueur : les grandes divisions amateurs (jusqu'à 157 clubs) sont
// découpées en poules régionales — on prend celle qui contient son club.
export const TAILLE_POULE_MAX = 16;
export const TAILLE_POULE = 12;

// LES DIVISIONS AMATEURES ne s'arrêtent pas. Pas de trêve pendant la Coupe
// d'Europe ni pendant le Tournoi : à ces dates-là, la Fédérale 3 et la
// Régionale 2 jouent leur journée comme les autres week-ends. Seules la trêve
// d'intersaison et les phases finales les mettent au repos.
export const DIVISIONS_AMATEURS = new Set([
  'nationale2', 'fed1', 'fed2', 'fed3', 'reg1', 'reg2', 'reg3',
]);

export function estAmateur(divisionId: string): boolean {
  return DIVISIONS_AMATEURS.has(divisionId);
}

// Les types de semaine où CETTE division dispute une journée.
export function typesJoues(divisionId: string): TypeSemaine[] {
  return estAmateur(divisionId)
    ? ['championnat', 'coupe', 'international']
    : ['championnat'];
}

// Cette semaine du calendrier est-elle une journée pour cette division ?
export function estJourneeDe(divisionId: string, sem: Semaine): boolean {
  return typesJoues(divisionId).includes(sem.type);
}

// Combien de journées se sont jouées AVANT cette semaine, dans cette division.
export function weekEndsJoues(divisionId: string, numeroSemaine: number): number {
  const types = typesJoues(divisionId);
  return CALENDRIER.slice(0, Math.max(0, numeroSemaine - 1))
    .filter((s) => types.includes(s.type)).length;
}

// Combien de week-ends de jeu la saison compte-t-elle pour cette division.
export function totalWeekEnds(divisionId: string): number {
  const types = typesJoues(divisionId);
  return CALENDRIER.filter((s) => types.includes(s.type)).length;
}

function distanceEntreClubs(a: string, b: string): number {
  const ca = clubParNom(a);
  const cb = clubParNom(b);
  if (!Number.isFinite(ca?.latitude) || !Number.isFinite(ca?.longitude)
    || !Number.isFinite(cb?.latitude) || !Number.isFinite(cb?.longitude)) return Number.POSITIVE_INFINITY;
  const rad = (degres: number) => degres * Math.PI / 180;
  const dLat = rad(cb!.latitude! - ca!.latitude!);
  const dLon = rad(cb!.longitude! - ca!.longitude!);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(ca!.latitude!)) * Math.cos(rad(cb!.latitude!)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Forme des groupes équilibrés en prenant, autour d'un club, ses voisins. */
function decouperGeographiquement(noms: string[]): string[][] {
  if (noms.length <= TAILLE_POULE_MAX) return [[...noms]];
  const nombrePoules = Math.ceil(noms.length / TAILLE_POULE);
  const tailleBase = Math.floor(noms.length / nombrePoules);
  const grandes = noms.length % nombrePoules;
  const restants = [...noms].sort((a, b) => {
    const ca = clubParNom(a);
    const cb = clubParNom(b);
    return (ca?.longitude ?? 999) - (cb?.longitude ?? 999)
      || (ca?.latitude ?? 999) - (cb?.latitude ?? 999)
      || a.localeCompare(b, 'fr');
  });
  const poules: string[][] = [];
  for (let numero = 0; numero < nombrePoules; numero++) {
    const taille = tailleBase + (numero < grandes ? 1 : 0);
    const tete = restants.shift();
    if (!tete) break;
    const voisins = restants
      .map((club) => ({ club, distance: distanceEntreClubs(tete, club) }))
      .sort((a, b) => a.distance - b.distance || a.club.localeCompare(b.club, 'fr'))
      .slice(0, Math.max(0, taille - 1))
      .map(({ club }) => club);
    const retenus = new Set(voisins);
    poules.push([tete, ...voisins]);
    for (let i = restants.length - 1; i >= 0; i--) {
      if (retenus.has(restants[i])) restants.splice(i, 1);
    }
  }
  return poules;
}

/** Une ligue isolée peut n'avoir qu'un à trois clubs à cet échelon (Corse). */
function rattacherPetitesPoules(poulesInitiales: string[][]): string[][] {
  const poules = poulesInitiales.map((poule) => [...poule]);
  for (;;) {
    const index = poules.findIndex((poule) => poule.length <= 3);
    if (index < 0 || poules.length <= 1) return poules;
    const petite = poules[index];
    let cible = -1;
    let meilleureDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < poules.length; i++) {
      if (i === index || poules[i].length + petite.length > TAILLE_POULE_MAX) continue;
      const distance = Math.min(...petite.flatMap((a) => poules[i].map((b) => distanceEntreClubs(a, b))));
      if (distance < meilleureDistance) {
        meilleureDistance = distance;
        cible = i;
      }
    }
    if (cible < 0) return poules;
    poules[cible].push(...petite);
    poules.splice(index, 1);
  }
}

// TOUTES les poules d'une division. Une division de 12 à 16 clubs n'en a
// qu'une. Les autres sont regroupées avec les coordonnées FFR : un club joue
// donc contre ses vrais voisins plutôt que contre les onze lignes suivantes
// d'un fichier. En régionale, chaque ligue est traitée séparément ; seuls les
// groupes isolés de trois clubs ou moins rejoignent la poule jouable la plus
// proche.
export function poulesDe(divisionId: string): string[][] {
  const noms = clubsDeDivision(divisionId);
  if (!noms.length) return [];
  if (noms.length <= TAILLE_POULE_MAX) return [noms];
  if (estAmateur(divisionId)) {
    if (divisionId.startsWith('reg')) {
      const parLigue = new Map<string, string[]>();
      for (const nom of noms) {
        const ligue = clubParNom(nom)?.ligue ?? 'sans-ligue';
        if (!parLigue.has(ligue)) parLigue.set(ligue, []);
        parLigue.get(ligue)!.push(nom);
      }
      return rattacherPetitesPoules([...parLigue.entries()]
        .sort(([a], [b]) => a.localeCompare(b, 'fr'))
        .flatMap(([, clubs]) => decouperGeographiquement(clubs)));
    }
    return decouperGeographiquement(noms);
  }
  const poules: string[][] = [];
  for (let i = 0; i < noms.length; i += TAILLE_POULE) poules.push(noms.slice(i, i + TAILLE_POULE));
  // Une poule résiduelle de 1 ou 2 clubs ne veut rien dire : on la reverse
  // dans la précédente.
  if (poules.length > 1 && poules[poules.length - 1].length <= 3) {
    const reste = poules.pop()!;
    poules[poules.length - 1].push(...reste);
  }
  return poules;
}

// Index de la poule où joue ce club (−1 s'il n'est nulle part).
export function indexPoule(divisionId: string, club: string): number {
  return poulesDe(divisionId).findIndex((p) => p.includes(club));
}

export function pouleDe(divisionId: string, clubJoueur: string, numeroPoule?: number): string[] {
  // ⚠️ La composition vient de `clubsDeDivision()` (lib/divisions.ts), donc
  // montées et descentes des saisons précédentes COMPRISES : c'est ce qui fait
  // qu'un club promu apparaît vraiment dans son nouveau championnat.
  const poules = poulesDe(divisionId);
  if (!poules.length) return clubJoueur ? [clubJoueur] : [];
  if (numeroPoule != null) return poules[Math.max(0, Math.min(poules.length - 1, numeroPoule))];
  // Le club du joueur peut ne pas figurer dans la liste de la division (il vient
  // d'être promu ou relégué) : on l'ajoute, il doit TOUJOURS être dans SA poule.
  // ⚠️ Uniquement dans SA division : sans ce garde-fou, consulter la Régionale 3
  // faisait apparaître le Stade Toulousain dans son classement.
  if (!clubJoueur) return poules[0];
  const sienne = poules.find((p) => p.includes(clubJoueur));
  if (sienne) return sienne;
  return [clubJoueur, ...poules[0].slice(1)];
}

// Calendrier aller-retour par la méthode du carrousel (Berger).
/**
 * Le calendrier aller-retour d'une poule (méthode du carrousel).
 *
 * @param cle graine du TIRAGE AU SORT du calendrier. ⚠️ SANS ELLE, LE
 *   CALENDRIER EST LE MÊME TOUS LES ANS — c'est le retour de jeu « j'ai
 *   l'impression que c'est toujours le même calendrier des matchs ». Le
 *   carrousel part de l'ordre du fichier de données, qui ne bouge pas : la J1
 *   opposait éternellement les deux mêmes clubs, et un club recevait toujours
 *   les mêmes adversaires à la même date. Avec une clé (`division#saison`), on
 *   mélange la liste AVANT de dérouler le carrousel : chaque saison a son
 *   tirage, et il reste parfaitement déterministe.
 */
export function calendrier(clubs: string[], cle?: string): [string, string][][] {
  const liste = [...clubs];
  if (cle) {
    // Fisher-Yates seedé : le seul mélange qui ne favorise aucune position.
    const rng = graine(`tirage#${cle}`);
    for (let i = liste.length - 1; i > 0; i--) {
      const k = Math.floor(rng() * (i + 1));
      [liste[i], liste[k]] = [liste[k], liste[i]];
    }
  }
  if (liste.length % 2) liste.push('-'); // exempt
  const n = liste.length;
  const aller: [string, string][][] = [];
  for (let tour = 0; tour < n - 1; tour++) {
    const journee: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = liste[i];
      const b = liste[n - 1 - i];
      if (a !== '-' && b !== '-') journee.push(tour % 2 ? [b, a] : [a, b]);
    }
    aller.push(journee);
    // rotation : le premier reste, les autres tournent
    liste.splice(1, 0, liste.pop()!);
  }
  // Retour : mêmes affiches, terrains inversés.
  const retour = aller.map((j) => j.map(([a, b]) => [b, a] as [string, string]));
  return [...aller, ...retour];
}

// ⚠️ TOUS LES SCORES NE SONT PAS POSSIBLES AU RUGBY. On marque par 3 (pénalité,
// drop), 5 (essai) ou 7 (essai transformé) : 1, 2 et 4 n'existent pas. Le
// moteur en produisait pourtant, et le match en direct ne pouvait alors pas
// raconter le score sans mentir. On rabat sur la valeur atteignable la plus
// proche (1 → 0, 2 et 4 → 3).
export function scorePossible(brut: number): number {
  const n = Math.max(0, Math.round(brut));
  if (n === 1) return 0;
  if (n === 2 || n === 4) return 3;
  return n;
}

// Un match : le score naît de l'écart de force, avec l'avantage du terrain.
// Exporté : les coupes (lib/coupe.ts) rejouent exactement le même moteur.
export function jouerRencontre(
  domicile: string, exterieur: string, saison: number, cle: string,
  apportJoueur: { club: string; bonus: number } | null,
): MatchChampionnat {
  const reel = RESULTATS_JOUES.get(cle);
  if (reel && reel.domicile === domicile && reel.exterieur === exterieur) return { ...reel };
  const rng = graine(cle);
  const fD = forceEffectif(domicile, saison) + 2.5; // avantage du terrain
  const fE = forceEffectif(exterieur, saison);
  let ecart = fD - fE;
  // La saison du joueur pèse sur les matchs de SON club.
  if (apportJoueur?.club === domicile) ecart += apportJoueur.bonus;
  if (apportJoueur?.club === exterieur) ecart -= apportJoueur.bonus;

  const baseD = 23 + ecart * 0.85 + (rng() * 12 - 6);
  const baseE = 23 - ecart * 0.85 + (rng() * 12 - 6);
  const scoreD = scorePossible(baseD);
  const scoreE = scorePossible(baseE);
  return {
    domicile, exterieur, scoreD, scoreE,
    essaisD: Math.max(0, Math.round((scoreD - 6) / 7)),
    essaisE: Math.max(0, Math.round((scoreE - 6) / 7)),
  };
}

// Classement au barème rugby (4 / 2 / 0, bonus offensif à 3 essais d'écart,
// défensif à 7 points ou moins). Exporté : les poules de coupe s'en servent.
export function classer(poule: string[], journees: MatchChampionnat[][]): LigneTableau[] {
  const stats = new Map<string, LigneTableau>();
  for (const club of poule) {
    stats.set(club, {
      position: 0, club, joues: 0, gagnes: 0, nuls: 0, perdus: 0,
      pour: 0, contre: 0, difference: 0, bonus: 0, points: 0,
    });
  }
  for (const journee of journees) {
    for (const m of journee) {
      const a = stats.get(m.domicile);
      const b = stats.get(m.exterieur);
      if (!a || !b) continue;
      a.joues++; b.joues++;
      a.pour += m.scoreD; a.contre += m.scoreE;
      b.pour += m.scoreE; b.contre += m.scoreD;

      if (m.scoreD > m.scoreE) { a.gagnes++; b.perdus++; a.points += 4; }
      else if (m.scoreD < m.scoreE) { b.gagnes++; a.perdus++; b.points += 4; }
      else { a.nuls++; b.nuls++; a.points += 2; b.points += 2; }

      if (m.essaisD - m.essaisE >= 3) { a.points++; a.bonus++; }
      if (m.essaisE - m.essaisD >= 3) { b.points++; b.bonus++; }
      if (m.scoreD < m.scoreE && m.scoreE - m.scoreD <= 7) { a.points++; a.bonus++; }
      if (m.scoreE < m.scoreD && m.scoreD - m.scoreE <= 7) { b.points++; b.bonus++; }
    }
  }
  return [...stats.values()]
    .map((l) => ({ ...l, difference: l.pour - l.contre }))
    .sort((x, y) => y.points - x.points || y.difference - x.difference || y.pour - x.pour)
    .map((l, i) => ({ ...l, position: i + 1 }));
}

export interface EtatChampionnat {
  poule: string[];
  journees: MatchChampionnat[][]; // toutes les journées jouées jusqu'ici
  classement: LigneTableau[];
  totalJournees: number;
}

// État du championnat après `journeesJouees` journées.
export function championnatEnDirect(
  divisionId: string,
  saison: number,
  clubJoueur: string,
  journeesJouees: number,
  bonusJoueur = 0,
  numeroPoule?: number,
): EtatChampionnat {
  const poule = pouleDe(divisionId, clubJoueur, numeroPoule);
  // ⚠️ LA CLÉ DU TIRAGE EST `division#saison`, ET ELLE DOIT ÊTRE LA MÊME
  // PARTOUT (`matchDeLaSemaine`, `affichesDeLaJournee`, la simulation de fond).
  // Deux clés différentes, et le panneau de carrière annoncerait un adversaire
  // que le tableau des résultats ne connaît pas.
  const grille = calendrier(poule, `${divisionId}#${saison}`);
  const total = grille.length;
  const jusqua = Math.max(0, Math.min(total, journeesJouees));

  const journees: MatchChampionnat[][] = [];
  for (let j = 0; j < jusqua; j++) {
    journees.push(grille[j].map(([d, e]) =>
      jouerRencontre(d, e, saison, `${divisionId}#${saison}#${j}#${d}#${e}`, { club: clubJoueur, bonus: bonusJoueur }),
    ));
  }

  return { poule, journees, classement: classer(poule, journees), totalJournees: total };
}

// Nombre total de journées du championnat où évolue ce club (aller-retour).
export function nombreJournees(divisionId: string, clubJoueur: string, numeroPoule?: number): number {
  return calendrier(pouleDe(divisionId, clubJoueur, numeroPoule)).length;
}

// TOUTES LES AFFICHES DE L'ANNÉE, jouées ou à venir. C'est ce qui permet de
// cliquer sur le calendrier et de voir le programme de mai en plein mois de
// septembre : le calendrier existe entièrement dès le coup d'envoi, seuls les
// scores attendent d'être joués.
export interface AfficheCalendrier {
  journee: number;
  domicile: string;
  exterieur: string;
  jouee: boolean;
  match: MatchChampionnat | null;
}

export function affichesDeLaJournee(
  divisionId: string, saison: number, clubJoueur: string, journee: number,
  journeesJouees: number, bonusJoueur = 0, numeroPoule?: number,
): AfficheCalendrier[] {
  const poule = pouleDe(divisionId, clubJoueur, numeroPoule);
  const grille = calendrier(poule, `${divisionId}#${saison}`);
  const affiches = grille[journee - 1];
  if (!affiches) return [];
  const jouee = journee <= journeesJouees;
  return affiches.map(([d, e]) => ({
    journee,
    domicile: d,
    exterieur: e,
    jouee,
    match: jouee
      ? jouerRencontre(d, e, saison, `${divisionId}#${saison}#${journee - 1}#${d}#${e}`,
          { club: clubJoueur, bonus: bonusJoueur })
      : null,
  }));
}

// Le calendrier de la saison compte 23 week-ends de championnat, mais un
// aller-retour peut en demander 22 (poule de 12) comme 30 (poule de 16). On
// répartit donc les journées SUR les week-ends disponibles : certaines semaines
// enchaînent deux journées, d'autres une seule — comme un vrai calendrier
// resserré. Renvoie le nombre de journées disputées après le Nᵉ week-end.
export function journeesApres(joues: number, total: number, surCombien = NB_JOURNEES): number {
  if (total <= 0 || surCombien <= 0) return 0;
  return Math.max(0, Math.min(total, Math.round((total * joues) / surCombien)));
}

// Journées disputées par CETTE division à cette semaine du calendrier. Les
// divisions amateurs jouant aussi les week-ends de coupe d'Europe et de
// Tournoi, elles n'avancent pas au même rythme que le Top 14.
export function journeesALaSemaine(
  divisionId: string, numeroSemaine: number, total: number,
): number {
  return journeesApres(
    weekEndsJoues(divisionId, numeroSemaine), total, totalWeekEnds(divisionId),
  );
}

// Rang final du club du joueur, une fois toutes les journées jouées.
export function rangFinal(
  divisionId: string, saison: number, clubJoueur: string, bonusJoueur = 0,
): number {
  const etat = championnatEnDirect(divisionId, saison, clubJoueur, 999, bonusJoueur);
  return etat.classement.find((l) => l.club === clubJoueur)?.position ?? 1;
}
