// OFFRES DE CONTRAT — le marché s'intéresse (ou non) à toi.
//
// Une offre naît de la rencontre entre TA COTE (générale + réputation + saison
// écoulée) et le NIVEAU d'un club : un club ne recrute ni très en dessous de
// lui (il a mieux en interne) ni très au-dessus (il n'a pas les moyens). Les
// clubs étrangers n'entrent en jeu qu'à partir d'une certaine notoriété : on ne
// s'expatrie pas quand personne ne vous connaît.

import type { Joueur, OffreContrat, PosteId } from '../types';
import { COMPETITIONS, NOTE_PAR_NIVEAU, type Competition } from '../data/clubs';
import { noteDuClub, effectifDuClub } from './effectif';
import { graine } from './championnat';
import { POSTE_PAR_ID } from '../data/rugby';
import { effetsTraits } from '../data/traits';
import { agentDe } from '../data/agents';

// Salaire annuel de référence par niveau de division (€). En dessous de la
// Fédérale 1, c'est du rugby amateur : quelques défraiements, pas un métier.
const SALAIRE_PAR_NIVEAU: Record<number, number> = {
  0: 260000, 1: 300000, 2: 90000, 3: 42000, 4: 18000,
  5: 9000, 6: 4500, 7: 2400, 8: 1200, 9: 800, 10: 500,
};

/** Ce que la notoriété peut ajouter, au maximum, au-dessus du niveau réel. */
export const RENOM_MAX = 7;

/**
 * La cote d'un joueur sur le marché.
 *
 * ⚠️ LA NOTORIÉTÉ NE FAIT PLUS LE NIVEAU. Un joueur moyen (générale 60) très
 * connu (réputation 95) affichait une cote de 68,75 : de quoi intéresser le bas
 * du Top 14 sans jamais y avoir joué. La cote est maintenant PLAFONNÉE à
 * `générale + RENOM_MAX` — la notoriété ouvre des portes, elle ne remplace pas
 * le niveau.
 *
 * ⚠️ ET LA PONDÉRATION D'ORIGINE EST CONSERVÉE (75 / 25), après mesure. Une
 * version intermédiaire faisait de la générale la base et de la réputation un
 * simple bonus : ça paraissait plus juste, et ça a fait sauter l'étalonnage de
 * difficulté — carrières au-dessus de 80 : 10/100 → 24/100. La raison est une
 * BOUCLE : dans ce jeu la réputation traîne derrière la générale, si bien que le
 * mélange 75/25 freinait la cote des bons joueurs ; en le retirant, ils
 * signaient plus haut, gagnaient plus de titres, gagnaient donc de la
 * réputation, et remontaient encore. Ne pas « simplifier » cette ligne sans
 * relancer `scripts/verifDifficulte.ts`.
 */
export function cote(j: Joueur): number {
  const vals = Object.values(j.attributs);
  const gen = vals.reduce((a, b) => a + b, 0) / vals.length;
  const bonusSaison = ((j.noteSaison ?? 6) - 6) * 1.6;
  return Math.min(gen * 0.75 + j.reputation * 0.25, gen + RENOM_MAX) + bonusSaison;
}

/**
 * Le salaire proposé. Trois choses le fixent : l'étage du championnat, l'écart
 * entre le joueur et le club, et l'ÂGE.
 *
 * ⚠️ L'ÂGE MANQUAIT, et c'est ce qui rendait les gros salaires trop faciles. Un
 * espoir de 19 ans qui débarquait avec une bonne cote touchait le salaire d'un
 * cadre international : aucun club ne fait ça. Un joueur paie son manque de
 * bouteille jusqu'à 23 ans, touche le plein tarif entre 25 et 31, et voit son
 * contrat se resserrer après 33.
 */
function salaire(niveau: number, ecart: number, age: number): number {
  const base = SALAIRE_PAR_NIVEAU[niveau] ?? 3000;
  // Un joueur nettement au-dessus du club se fait payer davantage — mais moins
  // qu'avant (2,2 → 1,8) : c'est un salaire, pas une prime de transfert.
  const facteur = Math.max(0.55, Math.min(1.8, 1 + ecart / 15));
  const parLAge = age <= 20 ? 0.55 : age <= 23 ? 0.78 : age <= 24 ? 0.92
    : age <= 31 ? 1 : age <= 33 ? 0.9 : 0.72;
  const brut = base * facteur * parLAge;
  const arrondi = brut > 50000 ? 5000 : brut > 10000 ? 1000 : 100;
  return Math.round(brut / arrondi) * arrondi;
}

/**
 * ⚠️ LE CLUB A-T-IL BESOIN DE CE POSTE ? C'est LA question qu'aucune version
 * précédente ne posait, et c'est elle qui explique « c'est toujours les mêmes
 * clubs qui proposent ». Le marché ne regardait que le niveau : les clubs les
 * plus proches de la cote du joueur revenaient donc à chaque intersaison, saison
 * après saison, quels que soient leurs effectifs.
 *
 * Un club qui possède déjà deux joueurs nettement meilleurs à ce poste ne
 * recrute pas un troisième. Ça écarte des clubs différents pour chaque poste et
 * chaque saison — et ça rend le marché lisible : on signe là où on peut jouer.
 *
 * Renvoie un multiplicateur d'intérêt : 0 = le club passe son tour.
 */
function besoinAuPoste(club: string, saison: number, poste: PosteId, c: number): number {
  const famille = POSTE_PAR_ID[poste]?.famille;
  const concurrents = effectifDuClub(club, saison)
    .filter((j) => POSTE_PAR_ID[j.poste]?.famille === famille)
    .map((j) => j.note)
    .sort((a, b) => b - a);
  if (concurrents.length === 0) return 1.6; // trou dans l'effectif : priorité
  const meilleur = concurrents[0];
  const second = concurrents[1] ?? 0;
  // On serait le meilleur du poste : le club signe des deux mains.
  if (c > meilleur + 1) return 1.5;
  // On serait la doublure immédiate : c'est un recrutement normal.
  if (c > second) return 1;
  // Deux joueurs devant soi, et bien devant : le club n'a aucun besoin.
  if (second - c > 6) return 0;
  return 0.35;
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

  // ⚠️⚠️ LE BUG DU JOUEUR TROP FORT POUR TOUT LE MONDE.
  // Le plancher était ABSOLU : « un club ne recrute pas à plus de 16 points en
  // dessous de la cote du joueur ». À partir d'une cote de 98 — atteignable avec
  // 99 de générale et 100 de réputation — le meilleur étage du jeu
  // (`NOTE_PAR_NIVEAU[0] = 82`) tombait sous ce plancher : la boucle jetait
  // TOUTES les compétitions, `candidats` restait vide, et plus AUCUN club ne
  // faisait d'offre. Le joueur devenu meilleur du monde se retrouvait sans
  // marché — exactement l'inverse de ce qui devrait arriver.
  //
  // Le plancher est donc devenu RELATIF : 16 points sous la cote, mais jamais au
  // point d'écarter les meilleurs clubs qui restent à portée. On fait donc deux
  // passes : on ramasse d'abord tout ce qui n'est pas hors de portée par le
  // HAUT, puis on calcule le plancher à partir du meilleur club trouvé.
  // ⚠️ LE PLAFOND DÉPEND DE L'ÂGE, ET C'EST TOUTE LA DIFFÉRENCE. Il était fixe
  // (« cote + 5 ») : un joueur de 32 ans à 70 de cote recevait des offres de
  // clubs à 75, exactement comme un espoir de 19 ans. Or un club ne paie
  // au-dessus du niveau constaté que pour du POTENTIEL — c'est-à-dire pour un
  // jeune. Après 26 ans, on est recruté pour ce qu'on vaut, pas pour ce qu'on
  // pourrait valoir.
  const marge = j.age <= 21 ? 7 : j.age <= 25 ? 5 : j.age <= 29 ? 2.5 : 0.5;
  const plafond = c + (ctx.demande ? marge * 0.5 : marge);

  // ⚠️ ET ON NE SAUTE PAS DEUX ÉTAGES D'UN COUP. Un joueur de Fédérale 1 ne
  // signe pas en Top 14, même avec une cote qui le permettrait sur le papier :
  // il passe par la Nationale et la Pro D2. Sans cette règle, une bonne saison
  // en amateur ouvrait directement l'élite — c'est le cœur du « trop facile ».
  // Les très jeunes font exception : un club professionnel va chercher un
  // espoir de 20 ans dans une division inférieure, ça arrive vraiment.
  const niveauActuel = COMPETITIONS.find((cp) => cp.id === j.division)?.niveau
    ?? COMPETITIONS.find((cp) => cp.clubs.some((cl) => cl.nom === j.club))?.niveau ?? 6;
  const sautMax = j.age <= 21 ? 3 : 2;

  type Candidat = { comp: Competition; club: (typeof COMPETITIONS)[number]['clubs'][number]; note: number };
  const possibles: Candidat[] = [];
  for (const comp of COMPETITIONS) {
    const etranger = comp.zone === 'Monde';
    // L'expatriation demande un vrai nom : sinon personne ne va chercher un
    // joueur à l'autre bout du monde.
    if (etranger && notoriete < 55) continue;
    // Un club ne fait pas rêver un joueur bien au-dessus de son niveau.
    if ((NOTE_PAR_NIVEAU[comp.niveau] ?? 50) > plafond + 12) continue;
    // Le niveau 0 est le plus haut : monter, c'est faire BAISSER le numéro.
    if (niveauActuel - comp.niveau > sautMax) continue;

    for (const club of comp.clubs) {
      if (club.nom === j.club) continue;
      const note = noteDuClub(club.nom);
      if (note > plafond) continue;
      possibles.push({ comp, club, note });
    }
  }
  if (!possibles.length) return [];

  let meilleure = -Infinity;
  for (const p of possibles) if (p.note > meilleure) meilleure = p.note;
  // Le plancher normal, SAUF s'il vidait le marché : dans ce cas on descend
  // jusqu'à huit points sous le meilleur club encore accessible.
  const plancher = Math.min(c - 16, meilleure - 8);
  const candidats = possibles.filter((p) => p.note >= plancher);
  if (!candidats.length) return [];
  // L'amplitude sert au tirage pondéré : sans elle, un joueur à 105 de cote
  // voyait tous les clubs à « proximité 0 » et ne recevait presque rien.
  const amplitude = Math.max(16, c - plancher);

  // ⚠️ CHAQUE CLUB A SON HUMEUR DE LA SAISON, ET C'EST LA RÉPONSE À « C'EST
  // TOUJOURS LES MÊMES CLUBS ». Le tirage ne regardait que la proximité de
  // niveau : comme la note d'un club ne bouge presque pas, les mêmes cinq ou six
  // noms sortaient à chaque intersaison, pendant douze saisons. Un club scoute
  // quelques joueurs par an, et pas les mêmes d'une année sur l'autre : cette
  // graine — stable pour une saison, différente à la suivante — rebat les cartes
  // sans rien laisser au hasard pur (rouvrir le panneau ne change rien).
  const interet = (nom: string) => 0.35 + graine(`marche#${nom}#${ctx.saison}`)() * 1.3;

  // On classe d'abord sur ce qui est GRATUIT à calculer (niveau + humeur), puis
  // on n'interroge l'effectif — coûteux — que pour une courte liste.
  const pretendants = candidats
    .map((cand) => {
      const proximite = 1 - Math.min(1, Math.abs(cand.note - c) / amplitude);
      return { cand, score: (0.25 + proximite * 0.75) * interet(cand.club.nom) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 45);

  // « Ambitieux » fait sonner le téléphone, « Fidèle au maillot » le fait taire.
  const maximum = Math.max(
    1,
    Math.round((ctx.maximum ?? 3) * effetsTraits(j.traits).offres * agent.offres),
  );
  const choisis: Candidat[] = [];
  const pris = new Set<string>();
  for (const { cand, score } of pretendants) {
    if (choisis.length >= maximum) break;
    if (pris.has(cand.club.nom)) continue;
    // Le besoin au poste tranche en dernier : c'est le filtre le plus cher, et
    // celui qui écarte le plus de monde.
    const besoin = besoinAuPoste(cand.club.nom, ctx.saison, j.poste, c);
    if (besoin <= 0) continue;
    if (graine(`offre#${j.nom}#${cand.club.nom}#${ctx.saison}#${ctx.demande ? 'd' : 's'}`)()
      > Math.min(0.95, score * besoin)) continue;
    pris.add(cand.club.nom);
    choisis.push(cand);
  }

  return choisis.map(({ comp, club, note }) => {
    const ecart = c - note;
    const sal = salaire(comp.niveau, ecart, j.age);
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
  const sal = salaire(comp.niveau, cote(j) - note, j.age);
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
