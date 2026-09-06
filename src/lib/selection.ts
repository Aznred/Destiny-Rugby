// SÉLECTION NATIONALE
//
// On n'est pas appelé en équipe nationale parce qu'on l'a demandé : il faut
// être, à son poste, au niveau qu'exige sa nation. Une place chez les Bleus ne
// se joue pas au même niveau qu'une place chez les Belges — d'où les paliers
// ci-dessous, calqués sur la hiérarchie mondiale.

import type { Joueur } from '../types.js';
import { nomNation } from './nations.js';
import { EFFECTIFS_REELS } from '../data/effectifsReels.js';
import { POSTE_PAR_ID } from '../data/rugby.js';
import { noteALAge } from './effectif.js';
// ⚠️ `international.ts` n'importe PAS `selection.ts` : le sens unique est
// vérifié, il n'y a pas de cycle. C'est lui qui sait écrire « Galles U20 ».
import { equipeU20 } from './international.js';

// Niveau (générale + réputation) exigé pour être appelé, par nation.
const NIVEAU_EXIGE: Record<string, number> = {
  // Le gratin mondial : il faut être parmi les tout meilleurs de son poste.
  France: 84, 'Nouvelle-Zélande': 84, 'Afrique du Sud': 84, Irlande: 83,
  Angleterre: 82, Australie: 81, Argentine: 79, Écosse: 79, 'Pays de Galles': 78,
  // Le deuxième cercle
  Italie: 75, Fidji: 75, Japon: 74, Géorgie: 72, Samoa: 72, Tonga: 71,
  Uruguay: 68, Portugal: 68, Espagne: 65, Roumanie: 64, 'États-Unis': 64,
  Canada: 64, Chili: 63, Namibie: 62, 'Hong Kong': 60, Zimbabwe: 60,
};

// Toutes les autres nations : le vivier est plus mince, la porte plus large.
const NIVEAU_PAR_DEFAUT = 55;

export function niveauExige(nation: string): number {
  return NIVEAU_EXIGE[nomNation(nation)] ?? NIVEAU_PAR_DEFAUT;
}

// Niveau personnel retenu pour une sélection : le jeu, d'abord.
export function niveauInternational(j: Joueur): number {
  const vals = Object.values(j.attributs);
  const gen = vals.reduce((a, b) => a + b, 0) / vals.length;
  return gen * 0.8 + j.reputation * 0.2;
}

// --- LA CONCURRENCE À TON POSTE ---
// Une sélection, ce n'est pas seulement « être bon » : c'est être meilleur que
// les autres joueurs de ton pays À TON POSTE. On indexe donc, une fois pour
// toutes, les meilleurs joueurs réels par nation et par famille de poste.
const cacheConcurrence = new Map<string, number[]>();

function meilleursDuPays(nation: string, famille: string, saison: number): number[] {
  const cle = nation + '#' + famille + '#' + saison;
  const memo = cacheConcurrence.get(cle);
  if (memo) return memo;
  const notes: number[] = [];
  for (const effectif of Object.values(EFFECTIFS_REELS)) {
    for (const joueur of effectif) {
      if (joueur.poste !== famille) continue;
      if (nomNation(joueur.nation) !== nation) continue;
      // Le concurrent vieillit lui aussi d'une saison à l'autre.
      notes.push(noteALAge(joueur.note, joueur.age, joueur.potentiel, joueur.age + saison - 1, 0.5));
    }
  }
  notes.sort((a, b) => b - a);
  cacheConcurrence.set(cle, notes);
  return notes;
}

// Deux joueurs par poste dans un groupe international.
const PLACES_PAR_POSTE = 2;

export interface Convocation {
  selectionne: boolean;
  niveau: number;
  exige: number;
  marge: number; // > 0 = titulaire indiscutable, < 0 = trop juste
}

// ---------------------------------------------------------------------------
// LES MOINS DE 20 ANS
// ---------------------------------------------------------------------------
// ⚠️ Demande explicite : « rajoute les compétitions U20, convocation des joueurs
// U20 donc les meilleurs joueurs U20 de chaque pays ».
//
// C'est une VRAIE sélection, pas un lot de consolation : on y entre parce qu'on
// est parmi les meilleurs de son âge dans son pays, et on en sort mécaniquement
// à 21 ans. Deux différences avec les séniors :
//   • la concurrence ne se compte que parmi les joueurs de 20 ans ou moins ;
//   • le palier de la nation est abaissé — un U20 français n'a pas le niveau
//     d'un titulaire du XV de France, et c'est normal.
export const AGE_MAX_U20 = 20;

// Un espoir n'a pas à valoir un international A. L'écart mesuré entre un XV
// national et son équipe U20 tourne autour de quinze points de note.
const REMISE_U20 = 15;

const cacheEspoirs = new Map<string, number[]>();

function meilleursEspoirs(nation: string, famille: string, saison: number): number[] {
  const cle = 'u20#' + nation + '#' + famille + '#' + saison;
  const memo = cacheEspoirs.get(cle);
  if (memo) return memo;
  const notes: number[] = [];
  for (const effectif of Object.values(EFFECTIFS_REELS)) {
    for (const joueur of effectif) {
      if (joueur.poste !== famille) continue;
      if (nomNation(joueur.nation) !== nation) continue;
      const age = joueur.age + saison - 1;
      if (age > AGE_MAX_U20) continue;
      notes.push(noteALAge(joueur.note, joueur.age, joueur.potentiel, age, 0.5));
    }
  }
  notes.sort((a, b) => b - a);
  cacheEspoirs.set(cle, notes);
  return notes;
}

export function estEligibleU20(j: Joueur): boolean {
  return j.age <= AGE_MAX_U20;
}

/** La convocation chez les moins de 20 ans. Renvoie `selectionne: false` d'office
 *  passé l'âge : à 21 ans, la porte est fermée, définitivement. */
export function convocationU20(j: Joueur, alea = Math.random(), saison = j.saison): Convocation {
  const niveau = niveauInternational(j);
  if (!estEligibleU20(j)) {
    return { selectionne: false, niveau, exige: Infinity, marge: -Infinity };
  }
  const nation = nomNation(j.nation);
  const famille = POSTE_PAR_ID[j.poste].famille;
  const concurrents = meilleursEspoirs(nation, famille, saison);
  // Trois places par poste : un groupe U20 tourne plus qu'un XV national.
  const barreConcurrence = concurrents.length >= 3 ? concurrents[2] - 1 : 0;
  const exige = Math.max(niveauExige(j.nation) - REMISE_U20, barreConcurrence);
  const marge = niveau - exige;
  let selectionne: boolean;
  if (marge >= 3) selectionne = true;
  else if (marge <= -6) selectionne = false;
  else selectionne = alea < 0.5 + marge / 12;
  if (selectionne && j.forme < 40) selectionne = alea > 0.6;
  return { selectionne, niveau, exige, marge };
}

// Le sélectionneur tranche : au-dessus du palier c'est oui, juste en dessous
// c'est une question de forme et de concurrence (part de hasard).
export function convocation(j: Joueur, alea = Math.random(), saison = j.saison): Convocation {
  const niveau = niveauInternational(j);
  const nation = nomNation(j.nation);
  const famille = POSTE_PAR_ID[j.poste].famille;

  // Le palier de la nation ET la concurrence réelle à ton poste : le plus
  // exigeant des deux l'emporte. Être 3e ouvreur français ne suffit pas.
  const concurrents = meilleursDuPays(nation, famille, saison);
  const barreConcurrence = concurrents.length >= PLACES_PAR_POSTE
    ? concurrents[PLACES_PAR_POSTE - 1] - 1
    : 0;
  const exige = Math.max(niveauExige(j.nation), barreConcurrence);
  const marge = niveau - exige;
  let selectionne: boolean;
  if (marge >= 3) selectionne = true;
  else if (marge <= -6) selectionne = false;
  else selectionne = alea < 0.5 + marge / 12; // zone de concurrence
  // La forme et le moral pèsent : un cadre méforme reste à la maison.
  if (selectionne && (j.forme < 45 || j.moral < 35)) selectionne = alea > 0.6;
  return { selectionne, niveau, exige, marge };
}

/**
 * L'équipe nationale du joueur : celle où il est RÉELLEMENT retenu.
 *
 * ⚠️ UNE SEULE DÉFINITION DE « MA SÉLECTION », et c'est tout l'objet de cette
 * fonction. Le panneau de carrière, l'écran Effectif et le match en direct
 * posaient chacun la question à leur façon — un jour l'un aurait affiché le
 * maillot des A pendant que l'autre montrait le groupe U20.
 *
 * ⚠️ ET LE TIRAGE EST FIGÉ À 0,5 (`alea`), pas laissé au hasard. `convocation`
 * comporte une zone de concurrence aléatoire : appelée deux fois de suite dans
 * le même rendu, elle rendrait deux réponses différentes, et l'écusson de la
 * sélection clignoterait d'un rendu à l'autre. Ici on ne décide pas d'une
 * feuille de match, on répond à « de quelle sélection suis-je ? ».
 */
export function maSelection(j: Joueur): { equipe: string; u20: boolean } | null {
  if (convocation(j, 0.5).selectionne) return { equipe: nomNation(j.nation), u20: false };
  if (convocationU20(j, 0.5).selectionne) return { equipe: equipeU20(j.nation), u20: true };
  return null;
}
