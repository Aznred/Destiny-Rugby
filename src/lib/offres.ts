// OFFRES DE CONTRAT — le marché s'intéresse (ou non) à toi.
//
// Une offre naît de la rencontre entre TA COTE (générale + réputation + saison
// écoulée) et le NIVEAU d'un club : un club ne recrute ni très en dessous de
// lui (il a mieux en interne) ni très au-dessus (il n'a pas les moyens). Les
// clubs étrangers n'entrent en jeu qu'à partir d'une certaine notoriété : on ne
// s'expatrie pas quand personne ne vous connaît.

import type { Joueur, OffreContrat } from '../types';
import { COMPETITIONS, NOTE_PAR_NIVEAU, type Competition } from '../data/clubs';
import { noteDuClub } from './effectif';
import { effetsTraits } from '../data/traits';
import { agentDe } from '../data/agents';

// Salaire annuel de référence par niveau de division (€). En dessous de la
// Fédérale 1, c'est du rugby amateur : quelques défraiements, pas un métier.
const SALAIRE_PAR_NIVEAU: Record<number, number> = {
  0: 260000, 1: 300000, 2: 90000, 3: 42000, 4: 18000,
  5: 9000, 6: 4500, 7: 2400, 8: 1200, 9: 800, 10: 500,
};

export function cote(j: Joueur): number {
  const vals = Object.values(j.attributs);
  const gen = vals.reduce((a, b) => a + b, 0) / vals.length;
  const bonusSaison = ((j.noteSaison ?? 6) - 6) * 1.6;
  return gen * 0.75 + j.reputation * 0.25 + bonusSaison;
}

function salaire(niveau: number, ecart: number): number {
  const base = SALAIRE_PAR_NIVEAU[niveau] ?? 3000;
  // Un joueur nettement au-dessus du club se fait payer davantage.
  const facteur = Math.max(0.55, Math.min(2.2, 1 + ecart / 12));
  const brut = base * facteur;
  const arrondi = brut > 50000 ? 5000 : brut > 10000 ? 1000 : 100;
  return Math.round(brut / arrondi) * arrondi;
}

function argumentaire(comp: Competition, ecart: number, etranger: boolean): string {
  if (etranger) {
    return `${comp.pays} te tend les bras : dépaysement total, championnat exigeant et un rôle qui t'attend en ${comp.nom}.`;
  }
  if (ecart >= 6) return `Le club te veut comme cadre immédiat : tu serais le patron du vestiaire.`;
  if (ecart >= 0) return `Le projet est clair : tu arrives pour être titulaire dès la première journée.`;
  return `Le club voit plus loin que ta saison : tu viendrais y franchir un cap, avec du temps de jeu à gagner.`;
}

let compteurOffre = 0;

export interface ContexteOffres {
  saison: number;
  maximum?: number;
  // Le joueur a demandé son transfert : les clubs de son niveau répondent
  // présents, mais on ne monte pas d'un étage aussi facilement.
  demande?: boolean;
}

export function genererOffres(j: Joueur, ctx: ContexteOffres): OffreContrat[] {
  const c = cote(j);
  const agent = agentDe(j.agent);
  // La notoriété ouvre l'étranger. Un agent international (et une vraie
  // popularité auprès du public) t'y emmènent plus tôt.
  const notoriete =
    j.reputation + (j.noteSaison ?? 6) * 3 + agent.ouverture + ((j.popularite ?? 50) - 50) / 5;

  // Clubs candidats : niveau compatible avec la cote du joueur.
  const candidats: { comp: Competition; club: (typeof COMPETITIONS)[number]['clubs'][number]; note: number }[] = [];
  for (const comp of COMPETITIONS) {
    const etranger = comp.zone === 'Monde';
    // L'expatriation demande un vrai nom : sinon personne ne va chercher un
    // joueur à l'autre bout du monde.
    if (etranger && notoriete < 55) continue;
    // Un club ne recrute pas un joueur très en dessous de son niveau, et ne
    // fait pas rêver un joueur bien au-dessus du sien.
    const niveauDiv = NOTE_PAR_NIVEAU[comp.niveau] ?? 50;
    if (niveauDiv > c + (ctx.demande ? 2 : 5)) continue;
    if (niveauDiv < c - 16) continue;

    for (const club of comp.clubs) {
      if (club.nom === j.club) continue;
      const note = noteDuClub(club.nom);
      if (note > c + (ctx.demande ? 2 : 5) || note < c - 16) continue;
      candidats.push({ comp, club, note });
    }
  }
  if (!candidats.length) return [];

  // Tirage : on privilégie les clubs proches de la cote du joueur.
  // « Ambitieux » fait sonner le téléphone, « Fidèle au maillot » le fait taire.
  const maximum = Math.max(
    1,
    Math.round((ctx.maximum ?? 3) * effetsTraits(j.traits).offres * agent.offres),
  );
  const choisis: typeof candidats = [];
  const pris = new Set<string>();
  for (let essai = 0; essai < 60 && choisis.length < maximum; essai++) {
    const cand = candidats[Math.floor(Math.random() * candidats.length)];
    if (pris.has(cand.club.nom)) continue;
    // Plus le club est proche du niveau du joueur, plus il est probable.
    const proximite = 1 - Math.min(1, Math.abs(cand.note - c) / 16);
    if (Math.random() > 0.25 + proximite * 0.75) continue;
    pris.add(cand.club.nom);
    choisis.push(cand);
  }

  return choisis.map(({ comp, club, note }) => {
    const ecart = c - note;
    const sal = salaire(comp.niveau, ecart);
    const etranger = comp.zone === 'Monde';
    compteurOffre += 1;
    return {
      id: `offre-${ctx.saison}-${compteurOffre}`,
      club: club.nom,
      division: comp.id,
      divisionNom: comp.nom,
      pays: comp.pays,
      noteClub: Math.round(note),
      salaire: sal,
      prime: Math.round((sal * (0.2 + Math.random() * 0.3)) / 100) * 100,
      saisons: 1 + Math.floor(Math.random() * 4),
      etranger,
      argumentaire: argumentaire(comp, ecart, etranger),
    } satisfies OffreContrat;
  }).sort((a, b) => b.noteClub - a.noteClub || b.salaire - a.salaire);
}

// Le club actuel propose systématiquement une prolongation en fin de contrat.
export function offreProlongation(j: Joueur, comp: Competition | undefined, saison: number): OffreContrat | null {
  if (!comp) return null;
  const note = noteDuClub(j.club);
  const sal = salaire(comp.niveau, cote(j) - note);
  compteurOffre += 1;
  return {
    id: `prolong-${saison}-${compteurOffre}`,
    club: j.club,
    division: comp.id,
    divisionNom: comp.nom,
    pays: comp.pays,
    noteClub: Math.round(note),
    salaire: sal,
    prime: Math.round(sal * 0.15),
    saisons: 2 + Math.floor(Math.random() * 3),
    etranger: false,
    argumentaire: 'Ton club veut te garder : tu connais le vestiaire, le public t\'a adopté.',
  };
}
