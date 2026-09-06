import type { Joueur } from '../types.js';
import { datesCompetitionInternationale, numeroDate } from '../data/calendrierMondial.js';
import { competitionsDeLaSaison, COMPETITIONS_U20, equipeU20 } from './international.js';
import { matchInternationalDuJoueur, prioriteInternationale, internationalEnDirect } from './international.js';
import { nomNation } from './nations.js';
import { convocation, convocationU20 } from './selection.js';
import { graine, type MatchChampionnat } from './championnat.js';
import { mondialEnDirect, DATES_MONDIAL } from './mondial.js';

export interface RassemblementInternational {
  id: string; saison: number; competition: string; nom: string; nation: string; u20: boolean;
  annonce: number; debut: number; fin: number; dates: number[]; retenu: boolean; marge: number;
}
export interface ParcoursInternational {
  rassemblements: RassemblementInternational[];
  matchs: Record<string, { competition: string; saison: number; titulaire: boolean; essais: number; points: number }>;
  resultats: Record<string, MatchChampionnat>;
}
export function parcoursInternational(j: Joueur): ParcoursInternational {
  return j.international ?? { rassemblements: [], matchs: {}, resultats: {} };
}
export function fenetresDeNation(nation: string, saison: number, u20 = false): RassemblementInternational[] {
  return competitionsDeLaSaison(saison).filter((c) => c.equipes.includes(nation) && COMPETITIONS_U20.has(c.id) === u20)
    .map((c) => {
      const dates = datesCompetitionInternationale(c.id, c.fenetre, c.journees, saison);
      const debut = c.id === 'coupeDuMonde' ? numeroDate(9,4) : Math.max(1, dates[0] - 1);
      return { id: `${saison}#${c.id}#${nation}`, saison, competition: c.id, nom: c.nom, nation, u20,
        annonce: Math.max(1, debut - 2), debut, fin: dates.at(-1) ?? debut, dates, retenu: true, marge: 0 };
    }).filter((c) => c.dates.length > 0)
    .sort((a,b) => prioriteInternationale(b.competition) - prioriteInternationale(a.competition));
}

/** Retour après élimination + cinq jours : apte au prochain week-end, pas à la finale. */
export function finDeRassemblement(c: RassemblementInternational, semaine: number): number {
  if (c.competition !== 'coupeDuMonde') return c.fin;
  const jouees = c.dates.filter((n) => n < semaine).length;
  if (jouees < 3) return c.fin;
  const etat = mondialEnDirect(c.saison, jouees);
  if (!etat.qualifies.includes(c.nation)) return c.dates[2];
  const elimination = etat.bracket.find((m) => m.perdant === c.nation && ['huitieme','quart'].includes(m.tour));
  if (elimination) return c.dates[elimination.tour === 'huitieme' ? 3 : 4];
  return c.fin; // Les quatre demi-finalistes jouent la finale ou le bronze.
}

/** La liste est figée à l'annonce ; ni un rendu ni un entraînement ne la retirent. */
export function actualiserRassemblements(j: Joueur): Joueur {
  const p = parcoursInternational(j);
  const rassemblements = [...p.rassemblements];
  const semaine = j.semaine ?? 1;
  const fenetres = [...fenetresDeNation(nomNation(j.nation), j.saison),
    ...(j.age <= 20 ? fenetresDeNation(equipeU20(j.nation), j.saison, true) : [])];
  for (const c of fenetres) {
    if (c.annonce > semaine || rassemblements.some((r) => r.id === c.id)) continue;
    const verdict = c.u20 ? convocationU20(j, graine(c.id + '#' + j.nom)())
      : convocation(j, graine(c.id + '#' + j.nom)());
    const dejaPris = rassemblements.some((r) => r.saison === j.saison && r.retenu
      && r.debut <= c.fin && r.fin >= c.debut && prioriteInternationale(r.competition) >= prioriteInternationale(c.competition));
    rassemblements.push({ ...c, retenu: verdict.selectionne && !dejaPris && !j.blessure, marge: verdict.marge });
  }
  return rassemblements.length === p.rassemblements.length ? j : { ...j, international: { ...p, rassemblements } };
}

export function situationInternationale(j: Joueur) {
  const actualise = actualiserRassemblements(j);
  const numero = j.semaine ?? 1;
  const listes = parcoursInternational(actualise).rassemblements.filter((r) => r.saison === j.saison
    && r.retenu && r.annonce <= numero && finDeRassemblement(r, numero) >= numero);
  const camp = listes.filter((r) => r.debut <= numero)
    .sort((a,b) => prioriteInternationale(b.competition) - prioriteInternationale(a.competition))[0] ?? null;
  const annonce = camp ?? listes.sort((a,b) => a.debut - b.debut)[0] ?? null;
  const affiche = camp ? matchInternationalDuJoueur(j, 0, camp.u20) : null;
  const memeCompetition = affiche?.competition.id === camp?.competition;
  const match = memeCompetition ? affiche : null;
  const tirage = graine((match?.cle ?? camp?.id ?? '') + '#' + j.nom + '#feuille')();
  const role: 'titulaire' | 'remplacant' | 'horsGroupe' | 'preparation' = !match ? 'preparation'
    : camp!.marge >= 3 ? (tirage < 0.9 ? 'titulaire' : 'remplacant')
      : tirage < 0.45 + camp!.marge / 30 ? 'titulaire' : tirage < 0.8 ? 'remplacant' : 'horsGroupe';
  return { camp, annonce, match, role, indisponibleClub: !!camp };
}

export function ajouterMatchInternational(j: Joueur, essais: number, points: number, titulaire: boolean): Joueur {
  const situation = situationInternationale(j);
  if (!situation.match || !situation.camp || situation.camp.u20 || situation.role === 'horsGroupe') return j;
  const p = parcoursInternational(j);
  return { ...j, international: { ...p, matchs: { ...p.matchs, [situation.match.cle]: {
    competition: situation.camp.competition, saison: j.saison, titulaire, essais, points,
  } } } };
}

export function bilanInternational(j: Joueur) {
  const p = parcoursInternational(j);
  const matchs = Object.values(p.matchs);
  const participations = [...new Set(p.rassemblements.filter((r) => r.retenu && r.competition === 'coupeDuMonde'
    && (r.saison < j.saison || r.debut <= (j.semaine ?? 1))).map((r) => r.saison))];
  const titres: string[] = [];
  for (const saison of [...new Set(matchs.map((m) => m.saison))]) {
    const finTournoi = datesCompetitionInternationale('sixNations','tournoi',5,saison).at(-1)!;
    if (matchs.some((m) => m.saison === saison && m.competition === 'sixNations')
      && (saison < j.saison || (j.semaine ?? 1) > finTournoi)) {
      const etat = internationalEnDirect('sixNations', saison, 5);
      const premier = etat?.classement[0];
      if (premier?.club === nomNation(j.nation)) titres.push(`S${saison} · Six Nations${premier.gagnes === 5 ? ' · Grand Chelem' : ''}`);
    }
  }
  for (const saison of participations) {
    const derniere = datesCompetitionInternationale('coupeDuMonde','automne',7,saison).at(-1)!;
    if (saison === j.saison && (j.semaine ?? 1) <= derniere) continue;
    const etat = mondialEnDirect(saison, DATES_MONDIAL);
    const nation = nomNation(j.nation);
    const medaille = etat.vainqueur === nation ? 'Or' : etat.finaliste === nation ? 'Argent' : etat.troisieme === nation ? 'Bronze' : null;
    if (medaille) titres.push(`S${saison} · Mondial · ${medaille}`);
  }
  return { capes: Math.max((j.selections ?? 0) + (j.saisonEnCours?.capes ?? 0), matchs.length),
    titularisations: matchs.filter((m) => m.titulaire).length, essais: matchs.reduce((n,m) => n + m.essais,0),
    points: matchs.reduce((n,m) => n + m.points,0), participations: participations.length, titres };
}
