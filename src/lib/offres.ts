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
import { etagePaieUnSalaire, salaireAnnuel } from './economie';

// Salaire annuel de référence par niveau de division (€). En dessous de la
// Fédérale 1, c'est du rugby amateur : quelques défraiements, pas un métier.
/**
 * ⚠️ CETTE TABLE A ÉTÉ REMPLACÉE PAR `lib/economie.ts`, et elle ne subsiste que
 * pour les appelants qui veulent l'ordre de grandeur d'un étage sans passer par
 * un joueur. Les valeurs sont désormais celles de la table économique réelle
 * (produits LNR, minima de l'accord collectif) : un salaire de Top 14 n'est plus
 * « 300 000 € × un facteur borné à 1,8 » mais une interpolation entre le tarif
 * d'un titulaire et celui d'une vedette. Voir `salaireAnnuel`.
 */
export const SALAIRE_PAR_NIVEAU: Record<number, number> = {
  0: 230000, 1: 250000, 2: 70000, 3: 35000, 4: 20000,
  5: 12000, 6: 5700, 7: 2400, 8: 1500, 9: 900, 10: 400,
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
/**
 * ⚠️ UNE SEULE ÉCHELLE DE SALAIRE DANS LE JEU, ET ELLE VIT DANS
 * `lib/economie.ts`. Cette fonction n'est plus qu'un point d'entrée : le mode
 * joueur, le marché du manager et les défraiements amateurs lisent tous la même
 * courbe. Le jour où deux barèmes coexistent, c'est un jour où le jeu propose
 * 42 000 € pour un poste que le manager facture 290 000 € — c'est arrivé, et
 * c'est ce qui a motivé l'extraction.
 */
export function salaire(niveau: number, ecart: number, age: number): number {
  return salaireAnnuel(niveau, ecart, age);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOUS LES CLUBS NE PAIENT PAS DE SALAIRE
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ Retour de jeu : « certains clubs ne proposent pas de salaires, que des
// primes ». C'est la réalité de la pyramide : sous la Nationale 2, un club
// n'emploie pas ses joueurs, il les défraie à la feuille de match. Le jeu
// versait pourtant à tout le monde un salaire annuel, jusqu'à la Régionale 3 —
// 500 € par an, mais un salaire quand même, et donc un contrat de la même forme
// à tous les étages.
//
// Un club amateur propose désormais `salaire: 0` et une PRIME PAR MATCH : on ne
// gagne rien en restant sur le banc, et une saison pleine rapporte à peu près ce
// que valait l'ancien salaire. C'est la même somme, mais elle se mérite.
const PART_AMATEUR: Record<number, number> = {
  5: 0.15, 6: 0.45, 7: 0.7, 8: 0.85, 9: 0.9, 10: 0.92,
};

export function partAmateur(niveau: number, etranger: boolean): number {
  // ⚠️ UN ÉTAGE OÙ PERSONNE N'EST PAYÉ N'A AUCUN CLUB EMPLOYEUR. La table
  //    économique donne un salaire typique nul en Régionale 2 et 3 ; y laisser
  //    8 à 10 % de clubs « professionnels » leur faisait proposer un salaire de
  //    zéro euro SANS défraiement — un contrat vide, relevé par `verifMarche`.
  //    La réponse se lit dans la table, elle ne se redéclare pas ici.
  if (!etagePaieUnSalaire(niveau)) return 1;
  const base = PART_AMATEUR[niveau] ?? 0;
  // À l'étranger, hors élite, le statut professionnel est plus rare encore :
  // l'Ereklasse, la Bundesliga ou le Heartland Championship sont des
  // championnats du samedi après-midi. On décale donc d'un cran — et on ouvre
  // le cas à partir du niveau 4, que la France réserve à la Nationale 2.
  if (!etranger) return base;
  return niveau >= 4 ? Math.min(0.92, Math.max(base, 0.1) + 0.25) : 0;
}

/** Ce club paie-t-il un salaire, ou seulement la feuille de match ? */
export function sansSalaire(club: string, niveau: number, etranger: boolean): boolean {
  const part = partAmateur(niveau, etranger);
  if (part <= 0) return false;
  // Stable pour un club donné : un club amateur ne devient pas professionnel
  // parce qu'on rouvre le marché la saison suivante.
  return graine(`amateur#${club}`)() < part;
}

/**
 * Le défraiement par match d'un club qui ne verse pas de salaire. Calé sur ce
 * que le poste vaudrait en salaire annuel, divisé par une saison pleine : jouer
 * tous les week-ends rapporte l'équivalent, ne pas jouer ne rapporte rien.
 */
export function primeDeMatch(niveau: number, ecart: number, age: number): number {
  const brut = salaire(niveau, ecart, age) / 22;
  const arrondi = brut > 300 ? 50 : brut > 80 ? 10 : 5;
  return Math.max(15, Math.round(brut / arrondi) * arrondi);
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
function besoinAuPoste(
  club: string, saison: number, poste: PosteId, c: number, niveau: number,
): number {
  // ⚠️ EN AMATEUR, ON NE REFUSE PAS UN JOUEUR QUI SE PRÉSENTE — et c'est la
  // seconde moitié de la réponse à « toujours les mêmes clubs ». Ce filtre est
  // écrit pour le rugby professionnel, où une place se prend à quelqu'un.
  // Appliqué à la Régionale, il jetait presque tout le monde : mesuré sur un
  // débutant, il ne restait qu'une poignée de clubs assez faibles pour « avoir
  // besoin » de lui, et le même nom revenait dix fois en douze saisons. Un club
  // du dimanche, lui, cherche des licenciés pour aligner un XV et un banc.
  const plancher = niveau >= 8 ? 0.75 : niveau >= 6 ? 0.5 : niveau >= 5 ? 0.3 : 0;

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
  if (second - c > 6) return plancher;
  return Math.max(0.35, plancher);
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
  /** Un club contacté directement passe en tête, sans ignorer les règles sportives. */
  clubCible?: string;
  /** Clubs déjà venus récemment : ils restent possibles, mais passent après les nouveaux. */
  clubsRecents?: readonly string[];
}

/**
 * La distance ne représente pas le même obstacle selon le championnat.
 * Une star doit être connue pour traverser le monde vers une ligue majeure ;
 * une formation semi-amatrice étrangère peut en revanche étudier le dossier
 * d'un joueur de Fédérale ou de Régionale transmis par son agent.
 */
function seuilEtranger(niveau: number): number {
  return 22 + Math.max(0, 8 - niveau) * 5;
}

// ═══════════════════════════════════════════════════════════════════════════
// LA GÉOGRAPHIE DU MARCHÉ
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ Retour de jeu : « les mêmes championnats même si on est à l'étranger ».
// Mesuré avant correction : un joueur évoluant en Didi 10 (Géorgie) recevait
// 27 offres françaises sur 48 en douze saisons, dont 24 de Fédérale 1 — la
// Géorgie, elle, n'en envoyait que 3. La cause n'était pas un oubli, c'était
// une conséquence arithmétique : le tirage se faisait CLUB PAR CLUB, et la
// France aligne plus de 500 clubs quand la Géorgie en aligne 10. À poids égal,
// la France gagnait toujours.
//
// Deux réponses, et les deux comptent :
//   1. on tire d'abord un CHAMPIONNAT, ensuite un club dedans (voir plus bas) ;
//   2. un championnat proche de là où on vit pèse plus lourd.
const VOISINS: Record<string, readonly string[]> = {
  France: ['Espagne', 'Italie', 'Angleterre', 'Pays de Galles', 'Écosse', 'Irlande', 'Portugal', 'Allemagne'],
  Angleterre: ['Pays de Galles', 'Écosse', 'Irlande', 'France'],
  'Pays de Galles': ['Angleterre', 'Irlande', 'Écosse', 'France'],
  Écosse: ['Angleterre', 'Irlande', 'Pays de Galles'],
  Irlande: ['Angleterre', 'Écosse', 'Pays de Galles', 'France'],
  Espagne: ['Portugal', 'France', 'Italie'],
  Portugal: ['Espagne', 'France'],
  Italie: ['France', 'Espagne', 'Géorgie', 'Roumanie'],
  Allemagne: ['Pays-Bas', 'Pologne', 'République tchèque', 'France'],
  'Pays-Bas': ['Allemagne', 'Angleterre', 'Pologne'],
  Pologne: ['Allemagne', 'République tchèque', 'Roumanie'],
  'République tchèque': ['Allemagne', 'Pologne', 'Roumanie'],
  Roumanie: ['Géorgie', 'Italie', 'Pologne', 'Russie'],
  Géorgie: ['Roumanie', 'Russie', 'Italie'],
  Russie: ['Géorgie', 'Roumanie', 'Finlande', 'Pologne'],
  Finlande: ['Russie', 'Pays-Bas', 'Allemagne'],
  'Nouvelle-Zélande': ['Pacifique', 'Australie', 'Japon'],
  Pacifique: ['Nouvelle-Zélande', 'Australie', 'Japon'],
  Japon: ['Nouvelle-Zélande', 'Pacifique'],
  'Afrique du Sud': ['IRL/GAL/ÉCO/ITA/RSA', 'Angleterre'],
  'États-Unis': ['Pacifique', 'Angleterre'],
  Argentine: ['Afrique du Sud', 'Espagne', 'Italie'],
};

/**
 * Le poids d'un championnat selon OÙ ON EST et D'OÙ ON VIENT.
 *
 * Rester dans le pays où l'on joue est le mouvement le plus courant ; rentrer
 * chez soi vient juste après ; partir ailleurs reste possible, et une graine par
 * saison décide quelle destination lointaine « bouge » cette année-là. C'est ce
 * dernier point qui met de l'exotisme dans le marché sans jamais le rendre
 * absurde : les portes ouvertes changent d'une intersaison à l'autre.
 */
function affinite(
  comp: Competition, paysActuel: string, nation: string, chaleur: number,
): number {
  if (comp.pays === paysActuel) return 2.1;
  if (comp.pays.includes(nation) || nation === comp.pays) return 1.7;
  const voisins = VOISINS[paysActuel] ?? [];
  if (voisins.includes(comp.pays)) return 1.15;
  const depuisNation = VOISINS[nation] ?? [];
  if (depuisNation.includes(comp.pays)) return 1;
  // Le bout du monde : rare, mais pas fermé — et différent chaque saison.
  return 0.35 + chaleur * 1.2;
}

/** Tirage pondéré : renvoie l'indice choisi, ou -1 si tous les poids sont nuls. */
function tirer(poids: readonly number[], r: number): number {
  let total = 0;
  for (const p of poids) total += Math.max(0, p);
  if (total <= 0) return -1;
  let x = r * total;
  for (let i = 0; i < poids.length; i++) {
    x -= Math.max(0, poids[i]);
    if (x <= 0) return i;
  }
  return poids.length - 1;
}

type Candidat = { comp: Competition; club: Competition['clubs'][number]; note: number };
type Vivier = { comp: Competition; clubs: Candidat[]; poids: number };

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
  const compActuelle = COMPETITIONS.find((cp) => cp.id === j.division)
    ?? COMPETITIONS.find((cp) => cp.clubs.some((cl) => cl.nom === j.club));
  const niveauActuel = compActuelle?.niveau ?? 6;
  const paysActuel = compActuelle?.pays ?? j.nation;
  const sautMax = j.age <= 21 ? 3 : 2;

  const viviers: Vivier[] = [];
  for (const comp of COMPETITIONS) {
    const etranger = comp.zone === 'Monde';
    const cibleDansCetteCompetition = !!ctx.clubCible
      && comp.clubs.some((club) => club.nom === ctx.clubCible);
    // L'ancien seuil unique (55) fermait absolument TOUT l'étranger aux petits
    // joueurs, y compris les ligues de leur niveau. Le seuil suit désormais la
    // puissance du championnat ; une demande ou un message direct aide le
    // dossier à franchir la distance sans supprimer les règles sportives.
    const ouvertureDossier = (ctx.demande ? 5 : 0) + (cibleDansCetteCompetition ? 18 : 0);
    if (etranger && notoriete + ouvertureDossier < seuilEtranger(comp.niveau)) continue;
    // Un club ne fait pas rêver un joueur bien au-dessus de son niveau.
    if ((NOTE_PAR_NIVEAU[comp.niveau] ?? 50) > plafond + 12) continue;
    // Le niveau 0 est le plus haut : monter, c'est faire BAISSER le numéro.
    if (niveauActuel - comp.niveau > sautMax) continue;

    // ⚠️ À L'ÉTRANGER, ON EST UN RENFORT — PAS UN JOUEUR DU CRU. Un Fédérale 2
    // français qui part aux Pays-Bas ou en Tchéquie y arrive comme import : ces
    // clubs recrutent volontiers un peu au-dessus de leur moyenne, c'est même
    // tout l'intérêt qu'ils y trouvent. Sans ce cran, le plafond calé sur la
    // cote fermait l'intégralité des petits championnats étrangers aux joueurs
    // amateurs — d'où le « on n'a que de la Régionale au début ».
    const plafondIci = plafond + (etranger && comp.niveau >= 5 ? 6 : 0);

    const clubs: Candidat[] = [];
    for (const club of comp.clubs) {
      if (club.nom === j.club) continue;
      const note = noteDuClub(club.nom);
      if (note > plafondIci) continue;
      clubs.push({ comp, club, note });
    }
    if (clubs.length) viviers.push({ comp, clubs, poids: 0 });
  }
  if (!viviers.length) return [];

  let meilleure = -Infinity;
  for (const v of viviers) for (const p of v.clubs) if (p.note > meilleure) meilleure = p.note;
  // Une star intéresse aussi des projets moins huppés qui veulent en faire leur
  // tête d'affiche. L'ancien écart fixe de 16 points supprimait ces clubs et
  // finissait par afficher toujours la même poignée de géants. On élargit donc
  // progressivement la fenêtre, sans jamais descendre une star en Régionale.
  const profondeur = c >= 88 ? 28 : c >= 76 ? 23 : 18;
  const plancher = Math.min(c - profondeur, meilleure - 10);
  for (const v of viviers) v.clubs = v.clubs.filter((p) => p.note >= plancher);
  const retenus = viviers.filter((v) => v.clubs.length > 0);
  if (!retenus.length) return [];
  // L'amplitude sert au tirage pondéré : sans elle, un joueur à 105 de cote
  // voyait tous les clubs à « proximité 0 » et ne recevait presque rien.
  const amplitude = Math.max(16, c - plancher);
  const proximite = (note: number) => 1 - Math.min(1, Math.abs(note - c) / amplitude);

  // ⚠️ CHAQUE CLUB A SON HUMEUR DE LA SAISON, ET C'EST LA RÉPONSE À « C'EST
  // TOUJOURS LES MÊMES CLUBS ». Le tirage ne regardait que la proximité de
  // niveau : comme la note d'un club ne bouge presque pas, les mêmes cinq ou six
  // noms sortaient à chaque intersaison, pendant douze saisons. Un club scoute
  // quelques joueurs par an, et pas les mêmes d'une année sur l'autre : cette
  // graine — stable pour une saison, différente à la suivante — rebat les cartes
  // sans rien laisser au hasard pur (rouvrir le panneau ne change rien).
  const interet = (nom: string) => 0.25 + graine(`marche#${j.nom}#${nom}#${ctx.saison}`)() * 1.5;
  const clubsRecents = new Set(ctx.clubsRecents ?? []);

  // ⚠️ ET SURTOUT : ON TIRE UN CHAMPIONNAT AVANT DE TIRER UN CLUB. Le tirage
  // club par club donnait mécaniquement le marché à la division la plus
  // peuplée — la Fédérale 3 aligne 157 clubs, la Didi 10 géorgienne en aligne
  // 10 : à mérite égal, la Fédérale 3 sortait seize fois plus souvent. C'est ce
  // qui produisait les listes « que de la Régionale » en bas de pyramide et
  // « toujours les cinq mêmes géants » en haut.
  for (const v of retenus) {
    const chaleur = graine(`exot#${j.nom}#${v.comp.id}#${ctx.saison}`)();
    // Un championnat vaut ce que valent ses meilleurs dossiers pour ce joueur —
    // pas la moyenne : une ligue avec un seul club au bon niveau doit rester
    // jouable.
    let attrait = 0;
    for (const p of v.clubs) attrait = Math.max(attrait, proximite(p.note));
    const humeur = 0.4 + graine(`ligue#${j.nom}#${v.comp.id}#${ctx.saison}`)() * 1.2;
    // Un championnat dont tous les clubs t'ont déjà écrit récemment attend son
    // tour : c'est la mémoire qui casse les listes figées d'une saison à l'autre.
    const frais = v.clubs.some((p) => !clubsRecents.has(p.club.nom)) ? 1 : 0.2;
    v.poids = (0.18 + attrait * 0.82)
      * affinite(v.comp, paysActuel, j.nation, chaleur) * humeur * frais;
  }

  // « Ambitieux » fait sonner le téléphone, « Fidèle au maillot » le fait taire.
  const maximum = Math.max(
    1,
    Math.round((ctx.maximum ?? 3) * effetsTraits(j.traits).offres * agent.offres),
  );

  const choisis: Candidat[] = [];
  const pris = new Set<string>();

  // Une démarche directe ne se perd pas dans le tirage : si ce club a réellement
  // le niveau pour recruter le joueur, il étudie son dossier avant les autres.
  // Les critères de division et de niveau restent appliqués plus haut.
  if (ctx.clubCible) {
    for (const v of retenus) {
      const cible = v.clubs.find((x) => x.club.nom === ctx.clubCible);
      if (cible && besoinAuPoste(cible.club.nom, ctx.saison, j.poste, c, v.comp.niveau) > 0) {
        choisis.push(cible);
        pris.add(cible.club.nom);
      }
    }
  }

  // Le tirage lui-même. `vague` distingue deux appels de la même intersaison
  // (un club écrit en cours d'année, un autre à la fin) sans rendre le résultat
  // imprévisible : à sauvegarde identique, la suite est identique.
  const vague = clubsRecents.size;
  const dé = graine(`tirage#${j.nom}#${j.club}#${ctx.saison}#${vague}#${ctx.demande ? 'd' : 's'}`);
  const poidsLigue = retenus.map((v) => v.poids);

  // ⚠️ LE COUP DE CŒUR DE L'AGENT — ce qui met vraiment de l'exotisme dans une
  // carrière. Demande explicite : « ça serait bien d'avoir un peu plus
  // d'exotique ». Les poids seuls n'y suffisent pas : un joueur du bas de la
  // pyramide française a sept championnats français à portée contre deux ou
  // trois étrangers, et l'étranger ne sortait quasiment jamais (mesuré : 1 offre
  // sur 48 en douze saisons). Une fois de temps en temps, la PREMIÈRE offre de
  // la vague est donc réservée à l'étranger — le dossier qu'un agent fait
  // circuler hors des frontières. Le niveau, lui, reste filtré comme partout
  // ailleurs : c'est un dépaysement, pas un passe-droit.
  const aDeLEtranger = retenus.some((v) => v.comp.zone === 'Monde' && v.poids > 0);
  let coupDeCoeur = aDeLEtranger && !ctx.clubCible
    && graine(`aventure#${j.nom}#${ctx.saison}#${vague}`)() < (ctx.demande ? 0.45 : 0.32);

  let essais = 0;
  while (choisis.length < maximum && essais < 60) {
    essais++;
    const poidsCourants = coupDeCoeur
      ? poidsLigue.map((p, i) => (retenus[i].comp.zone === 'Monde' ? p : 0))
      : poidsLigue;
    const iLigue = tirer(poidsCourants, dé());
    if (iLigue < 0) break;
    const vivier = retenus[iLigue];

    const libres = vivier.clubs.filter((p) => !pris.has(p.club.nom));
    if (!libres.length) {
      poidsLigue[iLigue] = 0;
      // Plus rien à l'étranger : on rend la main au marché normal.
      if (coupDeCoeur && !retenus.some((v, i) => v.comp.zone === 'Monde' && poidsLigue[i] > 0)) {
        coupDeCoeur = false;
      }
      continue;
    }
    const poidsClubs = libres.map((cand) => {
      // Un club déjà vu reste crédible, mais le marché cherche d'abord de
      // nouveaux interlocuteurs.
      const nouveaute = clubsRecents.has(cand.club.nom) ? 0.12 : 1;
      // Pour un joueur d'élite, un club moyen peut présenter un vrai projet de
      // tête d'affiche : ce bonus empêche les seules superpuissances d'occuper
      // systématiquement les premières places du tirage.
      const ecartProjet = c - cand.note;
      const projet = c >= 78 && ecartProjet >= 8 && ecartProjet <= profondeur ? 1.35 : 1;
      return (0.22 + proximite(cand.note) * 0.78) * interet(cand.club.nom) * nouveaute * projet;
    });
    const iClub = tirer(poidsClubs, dé());
    if (iClub < 0) { poidsLigue[iLigue] = 0; continue; }
    const cand = libres[iClub];
    // Le coup de cœur ne vaut que pour un seul dossier : le reste de la vague
    // se joue de nouveau sur tout le marché.
    coupDeCoeur = false;

    // Le besoin au poste tranche en dernier : c'est le filtre le plus cher, et
    // celui qui écarte le plus de monde.
    const besoin = besoinAuPoste(cand.club.nom, ctx.saison, j.poste, c, vivier.comp.niveau);
    pris.add(cand.club.nom); // vu, quel que soit le verdict : on ne le rejoue pas
    if (besoin <= 0) continue;
    if (dé() > Math.min(0.95, (0.35 + proximite(cand.note) * 0.65) * besoin)) continue;

    choisis.push(cand);
    // ⚠️ UNE VAGUE D'OFFRES N'EST PAS QUATRE FOIS LE MÊME CHAMPIONNAT. Sans ce
    // freinage, la ligue la mieux notée raflait toutes les places de la vague :
    // c'est exactement l'effet « toujours les mêmes championnats ».
    poidsLigue[iLigue] *= 0.28;
  }

  if (!choisis.length) return [];

  return choisis.map(({ comp, club, note }) => {
    const ecart = c - note;
    const etranger = comp.zone === 'Monde';
    const amateur = sansSalaire(club.nom, comp.niveau, etranger);
    const sal = amateur ? 0 : salaire(comp.niveau, ecart, j.age);
    const parMatch = amateur ? primeDeMatch(comp.niveau, ecart, j.age) : 0;
    compteurOffre += 1;
    return {
      id: `offre-${ctx.saison}-${compteurOffre}`,
      club: club.nom,
      division: comp.id,
      divisionNom: comp.nom,
      pays: comp.pays,
      noteClub: Math.round(note),
      salaire: sal,
      // Un club amateur ne verse pas de prime à la signature : il n'a pas de
      // trésorerie pour ça. Ce qu'il met sur la table, c'est la feuille de match.
      prime: amateur ? 0 : Math.round((sal * (0.2 + Math.random() * 0.3)) / 100) * 100,
      primeMatch: parMatch,
      saisons: 1 + Math.floor(Math.random() * 4),
      etranger,
      argumentaire: argumentaire(comp, ecart, etranger),
    } satisfies OffreContrat;
  }).sort((a, b) => b.noteClub - a.noteClub || b.salaire - a.salaire);
}

// Le club actuel propose systématiquement une prolongation en fin de contrat.
/**
 * La prolongation proposée par le club actuel — quand il en veut encore.
 *
 * ⚠️ ELLE ÉTAIT INCONDITIONNELLE, ET C'ÉTAIT LE BUG. Cette fonction rendait
 * TOUJOURS une offre : ni l'âge, ni le niveau, ni la saison écoulée n'entraient
 * en jeu. On pouvait donc rester au même club de 20 à 44 ans en signant
 * prolongation sur prolongation, sans jamais avoir à se battre pour une place —
 * mesuré : seize saisons d'affilée au même club, sans une seule remise en
 * question. Un club de rugby ne renouvelle pas un joueur qui a décroché.
 *
 * ⚠️ LE CRITÈRE EST LE MÊME QUE POUR RECRUTER : l'écart entre la cote du joueur
 * et la note du club. On ne réinvente pas une seconde doctrine — un club garde
 * qui il recruterait. Le seuil est simplement plus INDULGENT que pour une
 * arrivée : on pardonne à celui qui est déjà là (l'attachement, le vestiaire,
 * le coût d'un remplaçant), mais pas indéfiniment.
 */
export function offreProlongation(j: Joueur, comp: Competition | undefined, saison: number): OffreContrat | null {
  if (!comp) return null;
  const note = noteDuClub(j.club);
  const ecart = cote(j) - note;

  // ⚠️ TROP FAIBLE POUR SON CLUB : on ne prolonge pas. La marge de tolérance se
  // resserre avec l'âge — à 22 ans on parie sur la marge de progression, à 35
  // on regarde ce que le joueur vaut aujourd'hui.
  const tolerance = j.age <= 23 ? 14 : j.age <= 29 ? 10 : j.age <= 33 ? 6 : 3;
  if (ecart < -tolerance) return null;

  // ⚠️ ET UNE SAISON RATÉE COMPTE. `noteSaison` est la note sur 10 de l'année
  // écoulée ; en dessous de 4 chez un joueur qui n'est déjà pas au niveau, le
  // club passe à autre chose plutôt que de reconduire par habitude.
  if ((j.noteSaison ?? 6) < 4 && ecart < 0) return null;

  const etranger = comp.zone === 'Monde';
  const amateur = sansSalaire(j.club, comp.niveau, etranger);
  const sal = amateur ? 0 : salaire(comp.niveau, ecart, j.age);
  compteurOffre += 1;
  return {
    id: `prolong-${saison}-${compteurOffre}`,
    club: j.club,
    division: comp.id,
    divisionNom: comp.nom,
    pays: comp.pays,
    noteClub: Math.round(note),
    salaire: sal,
    prime: amateur ? 0 : Math.round(sal * 0.15),
    primeMatch: amateur ? primeDeMatch(comp.niveau, ecart, j.age) : 0,
    // Un vétéran ne signe plus pour quatre ans : le club s'engage à l'année.
    saisons: j.age >= 34 ? 1 : j.age >= 31 ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3),
    etranger: false,
    argumentaire: 'Ton club veut te garder : tu connais le vestiaire, le public t\'a adopté.',
  };
}
