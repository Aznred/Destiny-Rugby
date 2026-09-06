// MONTÉES ET DESCENTES
//
// Elles ne sont plus estimées : elles découlent du CHAMPIONNAT RÉELLEMENT JOUÉ
// (lib/championnat.ts) et de sa PHASE FINALE (lib/phaseFinale.ts).
//
// Pour la division du joueur — et pour ses deux voisines immédiates, celles
// avec lesquelles elle échange des clubs — on résout :
//
//   ⬆️ le CHAMPION de la division du dessous monte ;
//   ⬇️ le DERNIER de la division descend ;
//   ⚔️ le MATCH D'ACCÈS : l'avant-dernier reçoit le finaliste malheureux de la
//      division du dessous, et le vainqueur prend la place.
//
// Le résultat est mémorisé dans le store (`mouvementsClubs`), puis publié à
// `lib/divisions.ts` : dès la saison suivante, les poules, les classements et
// l'écran Championnats tiennent compte des mouvements.

import { COMPETITIONS } from '../data/clubs.js';
import { clubsDeDivision } from './divisions.js';
import { poulesDe } from './championnat.js';
import { tournoiDeFinDAnnee } from './tournoi.js';
import { phaseFinale, matchAcces, type PhaseFinale, type MatchFinal } from './phaseFinale.js';

export interface MouvementClub {
  club: string;
  de: string; // id de division
  vers: string;
  sens: 'montee' | 'descente';
  motif: 'champion' | 'dernier' | 'acces';
}

// Ordre des divisions françaises, du sommet vers le bas. Les championnats du
// monde sont pour la plupart fermés (franchises) : seuls l'Angleterre et le
// Japon ont une vraie pyramide.
const PYRAMIDES: string[][] = [
  ['top14', 'prod2', 'nationale', 'nationale2', 'fed1', 'fed2', 'fed3', 'reg1', 'reg2', 'reg3'],
  ['premiership', 'championship'],
  ['japon1', 'japon2', 'japon3'],
];

export function pyramideDe(divisionId: string): string[] | null {
  return PYRAMIDES.find((p) => p.includes(divisionId)) ?? null;
}

export function divisionAuDessus(divisionId: string): string | null {
  const p = pyramideDe(divisionId);
  if (!p) return null;
  const i = p.indexOf(divisionId);
  return i > 0 ? p[i - 1] : null;
}

export function divisionEnDessous(divisionId: string): string | null {
  const p = pyramideDe(divisionId);
  if (!p) return null;
  const i = p.indexOf(divisionId);
  return i >= 0 && i < p.length - 1 ? p[i + 1] : null;
}

export function nomDivision(id: string): string {
  return COMPETITIONS.find((c) => c.id === id)?.nom ?? id;
}

// Club servant à choisir la poule d'une division voisine (les grandes divisions
// amateurs sont découpées en poules). ⚠️ Simplification assumée : on prend la
// première poule — c'est elle qui « échange » ses clubs avec la division voisine.
function ancreDe(divisionId: string): string {
  return clubsDeDivision(divisionId)[0] ?? '';
}

// ---------------------------------------------------------------------------
// ⚠️⚠️ UNE SEULE FIN DE SAISON PAR DIVISION — LE BUG DU « TOP 14 À 16 CLUBS »
// ---------------------------------------------------------------------------
// La fin de saison était calculée DEUX FOIS, et pas de la même façon :
//
//   • `resoudrePyramide()` jouait la division du joueur AVEC son apport
//     (`bonusJoueur`), ancrée sur SON club ;
//   • `resoudreToutesDivisions()` la rejouait SANS apport, ancrée sur le premier
//     club du fichier.
//
// Deux championnats différents, donc deux champions et deux derniers différents.
// Le store fusionnait les deux listes en dédoublonnant PAR NOM DE CLUB : quand
// les deux calculs ne désignaient pas le même club, les DEUX montaient. Le
// Top 14 gagnait un club par saison et la Pro D2 en perdait un — d'où le
// « Top 14 à 16 équipes et Pro D2 à 14 » signalé en jeu.
//
// Désormais il n'y a QU'UN calcul, mémoïsé, et il connaît le contexte du joueur :
// tout le monde lit le même championnat.
let CONTEXTE: { club: string; bonus: number } = { club: '', bonus: 0 };

export function setContexteJoueur(club: string, bonus: number): void {
  if (CONTEXTE.club === club && CONTEXTE.bonus === bonus) return;
  CONTEXTE = { club, bonus };
  oublierResultats();
}

const cachePhases = new Map<string, PhaseFinale>();

/** La fin de saison d'une division — LA source unique. */
export function phaseFinaleDe(
  divisionId: string, saison: number, numeroPoule?: number,
): PhaseFinale {
  const cle = `${divisionId}#${saison}#${numeroPoule ?? '-'}`;
  const enCache = cachePhases.get(cle);
  if (enCache) return enCache;
  // Le club du joueur n'est l'ancre que dans SA division, et sans numéro de
  // poule imposé : ailleurs, on prend le premier club de la poule visée.
  const sienne = numeroPoule == null && !!CONTEXTE.club
    && clubsDeDivision(divisionId).includes(CONTEXTE.club);
  const ancre = sienne
    ? CONTEXTE.club
    : (poulesDe(divisionId)[numeroPoule ?? 0]?.[0] ?? ancreDe(divisionId));
  const r = phaseFinale(divisionId, saison, ancre, sienne ? CONTEXTE.bonus : 0, numeroPoule);
  cachePhases.set(cle, r);
  return r;
}

export interface BilanPyramide {
  mouvements: MouvementClub[];
  phase: PhaseFinale; // la fin de saison de la division du joueur
  accesVersLeHaut: MatchFinal | null; // notre finaliste tente de monter
  accesDepuisLeBas: MatchFinal | null; // notre avant-dernier défend sa place
  recits: string[];
}

export function resoudrePyramide(
  divisionId: string,
  saison: number,
  clubJoueur: string,
  bonusJoueur = 0,
): BilanPyramide {
  // ⚠️ On POSE le contexte avant de lire quoi que ce soit : `resultatDivision`
  // et `phaseFinaleDe` doivent voir exactement le même championnat.
  setContexteJoueur(clubJoueur, bonusJoueur);
  const phase = phaseFinaleDe(divisionId, saison);
  const mouvements: MouvementClub[] = [];
  const recits: string[] = [];
  const haut = divisionAuDessus(divisionId);
  const bas = divisionEnDessous(divisionId);
  let accesVersLeHaut: MatchFinal | null = null;
  let accesDepuisLeBas: MatchFinal | null = null;

  const bouger = (club: string, de: string, vers: string, sens: MouvementClub['sens'], motif: MouvementClub['motif']) => {
    if (!club || mouvements.some((m) => m.club === club)) return;
    mouvements.push({ club, de, vers, sens, motif });
  };

  // ---- Vers le haut : notre champion monte, notre finaliste joue l'accès ----
  if (haut) {
    const phaseHaut = phaseFinaleDe(haut, saison);
    if (phase.champion) {
      bouger(phase.champion, divisionId, haut, 'montee', 'champion');
      recits.push(`${phase.champion}, champion de ${nomDivision(divisionId)}, accède à la ${nomDivision(haut)}.`);
    }
    if (phaseHaut.dernier) {
      bouger(phaseHaut.dernier, haut, divisionId, 'descente', 'dernier');
      recits.push(`${phaseHaut.dernier} termine dernier de ${nomDivision(haut)} et descend.`);
    }
    accesVersLeHaut = matchAcces(phaseHaut, phase, saison);
    if (accesVersLeHaut) {
      const m = accesVersLeHaut;
      const monte = m.vainqueur === phase.finaliste;
      recits.push(
        `Match d’accès à la ${nomDivision(haut)} : ${m.domicile} ${m.scoreD}-${m.scoreE} ${m.exterieur}. ` +
          (monte
            ? `${m.vainqueur} arrache sa montée, ${m.perdant} est relégué.`
            : `${m.vainqueur} conserve sa place, ${m.perdant} reste en ${nomDivision(divisionId)}.`),
      );
      if (monte) {
        bouger(m.vainqueur, divisionId, haut, 'montee', 'acces');
        bouger(m.perdant, haut, divisionId, 'descente', 'acces');
      }
    }
  }

  // ---- Vers le bas : le dernier descend, l'avant-dernier défend sa place ----
  if (bas) {
    const phaseBas = phaseFinaleDe(bas, saison);
    if (phase.dernier) {
      bouger(phase.dernier, divisionId, bas, 'descente', 'dernier');
      recits.push(`${phase.dernier} termine dernier de ${nomDivision(divisionId)} et descend en ${nomDivision(bas)}.`);
    }
    if (phaseBas.champion) {
      bouger(phaseBas.champion, bas, divisionId, 'montee', 'champion');
      recits.push(`${phaseBas.champion}, champion de ${nomDivision(bas)}, monte en ${nomDivision(divisionId)}.`);
    }
    accesDepuisLeBas = matchAcces(phase, phaseBas, saison);
    if (accesDepuisLeBas) {
      const m = accesDepuisLeBas;
      const monte = m.vainqueur === phaseBas.finaliste;
      recits.push(
        `Match d’accès à la ${nomDivision(divisionId)} : ${m.domicile} ${m.scoreD}-${m.scoreE} ${m.exterieur}. ` +
          (monte
            ? `${m.vainqueur} monte, ${m.perdant} redescend en ${nomDivision(bas)}.`
            : `${m.vainqueur} sauve sa place.`),
      );
      if (monte) {
        bouger(m.vainqueur, bas, divisionId, 'montee', 'acces');
        bouger(m.perdant, divisionId, bas, 'descente', 'acces');
      }
    }
  }

  return { mouvements, phase, accesVersLeHaut, accesDepuisLeBas, recits };
}

// ---------------------------------------------------------------------------
// TOUTE LA PYRAMIDE, ÉTAGE PAR ÉTAGE
//
// `resoudrePyramide` ne traite que la division du joueur et ses deux voisines :
// ailleurs, plus rien ne bougeait — un club de Fédérale 2 restait en Fédérale 2
// à vie. Ici on résout LES DIX DIVISIONS françaises d'un coup, à la fin de
// chaque saison.
//
// Le champion d'une division amateur n'est pas le premier d'un classement
// unique (elles comptent jusqu'à 13 poules) mais le vainqueur du TOURNOI DE FIN
// D'ANNÉE (lib/tournoi.ts). Les places d'échange entre deux étages suivent le
// nombre de poules : une division à poule unique n'échange qu'un club, une
// division à poules multiples jusqu'à trois.
//
// ⚠️ COÛT : on joue vraiment toutes les poules de toutes les divisions. C'est
// la partie la plus lourde de la fin de saison (quelques dizaines de milliers
// de rencontres simulées), d'où la MÉMOÏSATION par saison — l'écran de bilan
// et le calcul des mouvements ne la refont pas deux fois.

const cacheChampions = new Map<string, ResultatDivision>();

export interface ResultatDivision {
  divisionId: string;
  champions: string[]; // dans l'ordre : le meilleur d'abord
  derniers: string[]; // dans l'ordre : le pire d'abord
  vainqueurTournoi: string | null;
}

// Champions et relégables d'une division, poules comprises.
export function resultatDivision(divisionId: string, saison: number): ResultatDivision {
  const cle = `${divisionId}#${saison}`;
  const enCache = cacheChampions.get(cle);
  if (enCache) return enCache;

  const poules = poulesDe(divisionId);
  let res: ResultatDivision;
  if (poules.length <= 1) {
    const phase = phaseFinaleDe(divisionId, saison);
    res = {
      divisionId,
      champions: phase.champion ? [phase.champion, ...(phase.finaliste ? [phase.finaliste] : [])] : [],
      derniers: [phase.dernier, phase.avantDernier].filter((c): c is string => !!c),
      vainqueurTournoi: null,
    };
  } else {
    const t = tournoiDeFinDAnnee(divisionId, saison, nomDivision(divisionId));
    if (!t) {
      res = { divisionId, champions: [], derniers: [], vainqueurTournoi: null };
    } else {
      // TOUS les vainqueurs de poule montent. Le vainqueur du tournoi passe en
      // tête de liste (c'est lui le champion de la division), mais l'ordre
      // n'exclut plus personne : il y a autant de places que de poules.
      const vainqueursDePoule = t.poules
        .map((poule) => poule.classement[0]?.club)
        .filter((c): c is string => !!c);
      const champions = [
        // Le champion de la division d'abord, à condition d'avoir gagné sa poule.
        ...(t.champion && vainqueursDePoule.includes(t.champion) ? [t.champion] : []),
        ...vainqueursDePoule,
        ...(t.champion && !vainqueursDePoule.includes(t.champion) ? [t.champion] : []),
      ].filter((c, i, liste) => liste.indexOf(c) === i);
      res = { divisionId, champions, derniers: t.relegues, vainqueurTournoi: t.champion };
    }
  }
  cacheChampions.set(cle, res);
  return res;
}

export function oublierResultats(): void {
  cacheChampions.clear();
  cachePhases.clear();
}

// ---------------------------------------------------------------------------
// ⚠️ LE GARDE-FOU : UNE DIVISION NE CHANGE JAMAIS DE TAILLE
// ---------------------------------------------------------------------------
// Même avec une source unique, deux résolutions se superposent : celle de la
// division du joueur (match d'accès compris) et celle de toute la pyramide.
// Un jour ou l'autre, un cas limite les fera diverger — un club champion de sa
// poule ET vainqueur du match d'accès, une division amateur dont le tournoi
// final ne désigne pas le premier de poule…
//
// Ce filtre est la ceinture ET les bretelles : pour CHAQUE division, autant de
// clubs doivent entrer que de clubs doivent sortir. Si ce n'est pas le cas, on
// retire le mouvement le moins prioritaire (les derniers de la liste sont ceux
// des étages où le joueur ne joue pas) jusqu'à ce que tout s'équilibre.
// Résultat : le Top 14 compte 14 clubs à la saison 12 comme à la saison 1.
export function equilibrerMouvements(mouvements: MouvementClub[]): MouvementClub[] {
  const garde = [...mouvements];
  const soldes = () => {
    const s = new Map<string, number>();
    for (const m of garde) {
      s.set(m.de, (s.get(m.de) ?? 0) - 1);
      s.set(m.vers, (s.get(m.vers) ?? 0) + 1);
    }
    return s;
  };
  // Chaque tour retire au plus un mouvement : la boucle termine forcément.
  for (let tour = 0; tour <= mouvements.length; tour++) {
    const s = soldes();
    let desequilibre = false;
    for (const v of s.values()) if (v !== 0) { desequilibre = true; break; }
    if (!desequilibre) return garde;
    // On annule en priorité un mouvement qui ALIMENTE une division en surnombre
    // ou qui VIDE une division en sous-nombre, en partant de la fin de liste.
    let index = -1;
    for (let i = garde.length - 1; i >= 0; i--) {
      const m = garde[i];
      if ((s.get(m.vers) ?? 0) > 0 || (s.get(m.de) ?? 0) < 0) { index = i; break; }
    }
    if (index < 0) return garde;
    garde.splice(index, 1);
  }
  return garde;
}

// Combien de clubs s'échangent entre deux étages voisins.
// Autant de places que de poules : chaque vainqueur de poule monte, chaque
// dernier de poule descend. Une division à poule unique n'échange qu'un club
// (plus le match d'accès, géré par `resoudrePyramide`).
function placesEchangees(haut: string, bas: string): number {
  return Math.max(1, Math.min(poulesDe(haut).length, poulesDe(bas).length));
}

export interface BilanPyramideComplete {
  mouvements: MouvementClub[];
  recits: string[];
  tournois: { divisionId: string; nom: string; champion: string | null }[];
}

/**
 * Les échanges proches du club sont prioritaires PAR PAIRE de divisions.
 * Dédoublonner les noms puis « équilibrer » supprimait parfois la montée du
 * champion : les deux résolutions ne choisissaient pas la même poule amateur.
 */
export function resoudreSaisonClub(division: string, saison: number, club: string) {
  const proche = resoudrePyramide(division, saison, club);
  const complete = resoudreToutesDivisions(saison);
  const frontiere = (m: MouvementClub) => [m.de, m.vers].sort().join('|');
  const reservees = new Set(proche.mouvements.map(frontiere));
  const mouvements = [...proche.mouvements];
  const deplaces = new Set(mouvements.map((m) => m.club));
  // Ajouter les autres échanges par couples, jamais un entrant sans sortant.
  for (const montant of complete.mouvements.filter((m) => m.sens === 'montee')) {
    if (reservees.has(frontiere(montant)) || deplaces.has(montant.club)) continue;
    const descendant = complete.mouvements.find((m) => m.de === montant.vers
      && m.vers === montant.de && m.sens === 'descente' && !deplaces.has(m.club));
    if (!descendant) continue;
    mouvements.push(montant, descendant);
    deplaces.add(montant.club);
    deplaces.add(descendant.club);
  }
  return { ...proche, mouvements };
}

export function resoudreToutesDivisions(saison: number): BilanPyramideComplete {
  const pyramide = PYRAMIDES[0]; // la pyramide FRANÇAISE : c'est là que se joue la carrière
  const mouvements: MouvementClub[] = [];
  const recits: string[] = [];
  const tournois: BilanPyramideComplete['tournois'] = [];
  const deplaces = new Set<string>();

  const bouger = (
    club: string, de: string, vers: string,
    sens: MouvementClub['sens'], motif: MouvementClub['motif'],
  ) => {
    if (!club || deplaces.has(club)) return false;
    deplaces.add(club);
    mouvements.push({ club, de, vers, sens, motif });
    return true;
  };

  for (const id of pyramide) {
    const r = resultatDivision(id, saison);
    if (r.vainqueurTournoi) {
      tournois.push({ divisionId: id, nom: nomDivision(id), champion: r.vainqueurTournoi });
      recits.push(`🏆 ${r.vainqueurTournoi} remporte le tournoi final de ${nomDivision(id)}.`);
    }
  }

  for (let i = 0; i < pyramide.length - 1; i++) {
    const haut = pyramide[i];
    const bas = pyramide[i + 1];
    const places = placesEchangees(haut, bas);
    const montants = resultatDivision(bas, saison).champions.slice(0, places);
    const descendants = resultatDivision(haut, saison).derniers.slice(0, places);

    for (const club of montants) {
      if (bouger(club, bas, haut, 'montee', 'champion')) {
        recits.push(`⬆️ ${club} monte de ${nomDivision(bas)} en ${nomDivision(haut)}.`);
      }
    }
    for (const club of descendants) {
      if (bouger(club, haut, bas, 'descente', 'dernier')) {
        recits.push(`⬇️ ${club} descend de ${nomDivision(haut)} en ${nomDivision(bas)}.`);
      }
    }
  }

  return { mouvements, recits, tournois };
}
