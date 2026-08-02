// LES STATISTIQUES INDIVIDUELLES DE TOUS LES JOUEURS, DANS TOUTES LES LIGUES
//
// Jusqu'ici, seul le joueur humain accumulait des statistiques détaillées. Les
// 18 000 autres n'étaient que des noms avec une note. Impossible, donc, de
// répondre à la seule question qui compte quand on lit un championnat : QUI est
// le meilleur marqueur d'essais ? Le meilleur buteur ? Le meilleur gratteur ?
//
// ⚠️ RIEN N'EST STOCKÉ. Comme les effectifs et les championnats, tout est
// DÉTERMINISTE : les statistiques d'un joueur découlent de son poste, de sa
// note, du niveau de son club et du nombre de journées disputées, à partir
// d'une graine stable (club + nom + saison). Rouvrir l'écran redonne les mêmes
// chiffres, et aucune sauvegarde ne grossit.
//
// ⚠️ Le JOUEUR HUMAIN fait exception : lui a de vraies stats accumulées match
// après match (`Joueur.saisonEnCours.stats`). `classementJoueurs()` les
// substitue à l'estimation — sinon on se verrait dans le classement avec des
// chiffres qui ne sont pas les siens.

import type { Joueur, PosteId, StatsDetaillees } from '../types';
import { graine, journeesALaSemaine, nombreJournees, poulesDe } from './championnat';
import { effectifDuClub, forceEffectif, type Coequipier } from './effectif';
import { POSTE_PAR_ID } from '../data/rugby';
import type { LigneReelle } from './moteur/saison';

export interface LigneStats {
  nom: string;
  club: string;
  poste: PosteId;
  age: number;
  note: number;
  matchs: number;
  titularisations: number;
  minutes: number;
  essais: number;
  points: number;
  butsTentes: number;
  butsReussis: number;
  plaquages: number;
  plaquagesManques: number;
  grattages: number; // ballons grattés au sol
  turnovers: number; // ballons rendus à l'adversaire
  passesDecisives: number;
  cartons: number;
  moi?: boolean; // le joueur humain
}

// --- LES REPÈRES PAR POSTE --------------------------------------------------
// Par match complet (80 minutes), pour un joueur de niveau moyen. Chiffres
// calés sur les moyennes réelles du rugby professionnel.
interface Profil {
  essais: number; // essais par match
  plaquages: number; // plaquages réussis par match
  grattages: number; // ballons grattés
  turnovers: number; // ballons concédés
  passesD: number;
  buteur: number; // part des tirs au but de l'équipe assurée par ce poste
}

const PROFILS: Record<PosteId, Profil> = {
  pilier_gauche: { essais: 0.05, plaquages: 9, grattages: 0.25, turnovers: 1.1, passesD: 0.1, buteur: 0 },
  talonneur: { essais: 0.09, plaquages: 10, grattages: 0.4, turnovers: 1.2, passesD: 0.15, buteur: 0 },
  pilier_droit: { essais: 0.05, plaquages: 9, grattages: 0.25, turnovers: 1.1, passesD: 0.1, buteur: 0 },
  deuxieme_ligne_g: { essais: 0.08, plaquages: 13, grattages: 0.5, turnovers: 0.9, passesD: 0.15, buteur: 0 },
  deuxieme_ligne_d: { essais: 0.08, plaquages: 13, grattages: 0.5, turnovers: 0.9, passesD: 0.15, buteur: 0 },
  troisieme_aile_g: { essais: 0.13, plaquages: 14, grattages: 1.5, turnovers: 1, passesD: 0.25, buteur: 0 },
  troisieme_aile_d: { essais: 0.13, plaquages: 14, grattages: 1.9, turnovers: 1, passesD: 0.25, buteur: 0 },
  numero_8: { essais: 0.18, plaquages: 11, grattages: 0.9, turnovers: 1.3, passesD: 0.35, buteur: 0 },
  demi_melee: { essais: 0.16, plaquages: 6, grattages: 0.4, turnovers: 1.4, passesD: 0.8, buteur: 0.04 },
  demi_ouverture: { essais: 0.12, plaquages: 5, grattages: 0.2, turnovers: 1.2, passesD: 0.7, buteur: 0.62 },
  ailier_gauche: { essais: 0.42, plaquages: 4, grattages: 0.2, turnovers: 0.8, passesD: 0.3, buteur: 0.02 },
  premier_centre: { essais: 0.2, plaquages: 9, grattages: 0.4, turnovers: 1, passesD: 0.4, buteur: 0.03 },
  deuxieme_centre: { essais: 0.26, plaquages: 8, grattages: 0.35, turnovers: 1, passesD: 0.45, buteur: 0.05 },
  ailier_droit: { essais: 0.42, plaquages: 4, grattages: 0.2, turnovers: 0.8, passesD: 0.3, buteur: 0.02 },
  arriere: { essais: 0.3, plaquages: 6, grattages: 0.3, turnovers: 1.1, passesD: 0.5, buteur: 0.22 },
};

// --- LA SAISON D'UN JOUEUR --------------------------------------------------
//
// Combien de matchs ? Un joueur nettement au-dessus de son groupe joue tout ;
// un remplaçant entre en cours de match ; un jeune loin du niveau reste sur le
// banc. C'est la même logique que la titularisation du joueur humain.
export function statsDeSaison(
  c: Coequipier, club: string, saison: number, journees: number, forceGroupe: number,
): LigneStats {
  const rng = graine(`stats#${club}#${c.nom}#${saison}`);
  const profil = PROFILS[c.poste] ?? PROFILS.premier_centre;
  const marge = c.note - forceGroupe;

  // ⚠️ ON PART DES MINUTES, pas des matchs. Un club dispute 15 × 80 = 1 200
  // minutes par rencontre ; réparties sur les 26 joueurs retenus, cela fait en
  // moyenne 57,7 % des minutes de la saison pour chacun. La première version
  // partait du nombre de matchs et n'arrivait qu'à 60 % de ce volume : le
  // championnat ne comptait plus que 2,7 essais par match au lieu de 5.
  const PART_MOYENNE = 15 / 26;
  const partMinutes = Math.max(0.04, Math.min(0.95, PART_MOYENNE + marge / 24 + (rng() - 0.5) * 0.2));
  const minutes = Math.round(partMinutes * 80 * journees);
  const matchsEquivalents = minutes / 80;

  // Combien de feuilles de match ? Un titulaire joue ~68 minutes, un remplaçant
  // ~24. On en déduit le nombre d'apparitions, borné par le calendrier.
  const partTitu = Math.max(0, Math.min(1, 0.5 + marge / 13 + (rng() - 0.5) * 0.2));
  const parMatch = 68 * partTitu + 24 * (1 - partTitu);
  const matchs = Math.max(minutes > 0 ? 1 : 0, Math.min(journees, Math.round(minutes / parMatch)));
  const titularisations = Math.min(matchs, Math.round(matchs * partTitu));

  // Le niveau amplifie ce qui se voit (essais, grattages) et réduit les fautes.
  const talent = 1 + marge / 26;
  const bruit = (etendue: number) => 1 + (rng() - 0.5) * etendue;

  const essais = Math.max(0, Math.round(profil.essais * matchsEquivalents * talent * bruit(0.9)));
  const plaquages = Math.max(0, Math.round(profil.plaquages * matchsEquivalents * bruit(0.35)));
  const plaquagesManques = Math.max(0, Math.round(plaquages * (0.1 + rng() * 0.12) / Math.max(0.6, talent)));
  const grattages = Math.max(0, Math.round(profil.grattages * matchsEquivalents * talent * bruit(0.7)));
  const turnovers = Math.max(0, Math.round(profil.turnovers * matchsEquivalents * bruit(0.5) / Math.max(0.6, talent)));
  const passesDecisives = Math.max(0, Math.round(profil.passesD * matchsEquivalents * talent * bruit(0.8)));

  // Le buteur : un seul par équipe en général, d'où la part par poste. On lui
  // attribue les tirs de l'équipe au prorata de son temps de jeu.
  // ⚠️ Un club n'a qu'un ou deux buteurs, pas trois : la probabilité n'est pas
  // amplifiée, et les tentatives suivent le temps de jeu — un remplaçant qui
  // tire de temps en temps ne finit pas au classement des buteurs.
  const tireur = profil.buteur > 0 && rng() < profil.buteur * partMinutes * 1.5;
  const butsTentes = tireur ? Math.max(0, Math.round(matchsEquivalents * (4.4 + rng() * 2.2))) : 0;
  // La réussite au pied monte avec le niveau : 62 % à 55 de note, 82 % à 85.
  const reussite = Math.max(0.45, Math.min(0.92, 0.5 + c.note / 260 + (rng() - 0.5) * 0.12));
  const butsReussis = Math.round(butsTentes * reussite);

  const cartons = rng() < 0.16 + Math.max(0, -marge) / 90 ? 1 + (rng() < 0.15 ? 1 : 0) : 0;

  return {
    nom: c.nom, club, poste: c.poste, age: c.age, note: c.note,
    matchs, titularisations, minutes,
    essais,
    // Points marqués : essais + tirs au but (transformations 2, pénalités 3 —
    // on prend 2,4 en moyenne, la proportion réelle des deux).
    points: essais * 5 + Math.round(butsReussis * 2.4),
    butsTentes, butsReussis,
    plaquages, plaquagesManques, grattages, turnovers, passesDecisives, cartons,
  };
}

// --- LE CLASSEMENT D'UNE COMPÉTITION ---------------------------------------

export type Categorie =
  | 'essais' | 'points' | 'buteurs' | 'plaquages' | 'grattages'
  | 'turnovers' | 'passes' | 'cartons' | 'minutes';

export const CATEGORIES: { id: Categorie; nom: string; emoji: string; desc: string }[] = [
  { id: 'essais', nom: 'Essais', emoji: '🏉', desc: 'Les meilleurs marqueurs du championnat.' },
  { id: 'points', nom: 'Points', emoji: '💯', desc: 'Essais et coups de pied confondus.' },
  { id: 'buteurs', nom: 'Buteurs', emoji: '🎯', desc: 'Pourcentage de réussite au pied (10 tentatives minimum).' },
  { id: 'plaquages', nom: 'Plaquages', emoji: '🛡️', desc: 'Plaquages réussis, et taux de réussite.' },
  { id: 'grattages', nom: 'Grattages', emoji: '🪝', desc: 'Ballons volés au sol.' },
  { id: 'turnovers', nom: 'Turnovers', emoji: '🔄', desc: 'Ballons concédés à l’adversaire — moins il y en a, mieux c’est.' },
  { id: 'passes', nom: 'Passes déc.', emoji: '🅰️', desc: 'La dernière passe avant l’essai.' },
  { id: 'cartons', nom: 'Cartons', emoji: '🟨', desc: 'Les plus sanctionnés du championnat.' },
  { id: 'minutes', nom: 'Temps de jeu', emoji: '⏱️', desc: 'Les increvables.' },
];

// La valeur triée pour chaque catégorie.
export function valeurDe(l: LigneStats, cat: Categorie): number {
  switch (cat) {
    case 'essais': return l.essais;
    case 'points': return l.points;
    case 'buteurs': return l.butsTentes >= 10 ? (l.butsReussis / l.butsTentes) * 100 : -1;
    case 'plaquages': return l.plaquages;
    case 'grattages': return l.grattages;
    case 'turnovers': return l.turnovers;
    case 'passes': return l.passesDecisives;
    case 'cartons': return l.cartons;
    case 'minutes': return l.minutes;
  }
}

export function afficherValeur(l: LigneStats, cat: Categorie): string {
  switch (cat) {
    case 'buteurs': return `${Math.round(valeurDe(l, cat))} % (${l.butsReussis}/${l.butsTentes})`;
    case 'plaquages': {
      const total = l.plaquages + l.plaquagesManques;
      return `${l.plaquages} · ${total ? Math.round((l.plaquages / total) * 100) : 0} %`;
    }
    case 'minutes': return `${l.minutes.toLocaleString('fr-FR')} min`;
    default: return String(valeurDe(l, cat));
  }
}

// Toutes les statistiques d'une compétition, mémoïsées : recalculer 6 000
// joueurs à chaque changement d'onglet serait absurde.
const cache = new Map<string, LigneStats[]>();

export function statsCompetition(
  divisionId: string, saison: number, journees: number, numeroPoule?: number,
): LigneStats[] {
  const cle = `${divisionId}#${saison}#${journees}#${numeroPoule ?? 'tout'}`;
  const enCache = cache.get(cle);
  if (enCache) return enCache;

  const poules = poulesDe(divisionId);
  const clubs = numeroPoule != null ? (poules[numeroPoule] ?? []) : poules.flat();
  const lignes: LigneStats[] = [];
  for (const club of clubs) {
    const force = forceEffectif(club, saison);
    // Les 26 premiers : au-delà, ce sont des joueurs qui ne voient pas le terrain.
    for (const c of effectifDuClub(club, saison).slice(0, 26)) {
      lignes.push(statsDeSaison(c, club, saison, journees, force));
    }
  }
  cache.set(cle, lignes);
  return lignes;
}

export function oublierStats(): void {
  cache.clear();
}

// Le classement d'une catégorie. Le joueur humain y entre avec SES VRAIES
// statistiques quand il évolue dans cette compétition.
// ⚠️ QUAND LE MOTEUR A TOURNÉ, C'EST LUI QUI FAIT FOI.
// Le store rejoue en fond toutes les affiches de la poule (lib/moteur/saison.ts).
// Dès qu'au moins une journée a été simulée, le classement se construit sur ces
// chiffres RÉELS plutôt que sur l'estimation par poste — pour TOUT LE MONDE, pas
// seulement pour le joueur humain. On ne mélange jamais les deux sources : ce
// serait comparer un match joué à vingt-cinq matchs devinés.
function depuisLeMoteur(reelles: Record<string, LigneReelle>): LigneStats[] {
  return Object.values(reelles).map((l) => ({
    nom: l.nom,
    club: l.club,
    poste: l.poste,
    age: 0,
    note: 0,
    matchs: l.matchs,
    titularisations: l.matchs,
    minutes: l.minutes,
    essais: l.essais,
    points: l.essais * 5 + l.butsReussis * 2,
    butsTentes: l.butsTentes,
    butsReussis: l.butsReussis,
    plaquages: l.plaquages,
    plaquagesManques: l.plaquagesManques,
    grattages: l.grattages,
    turnovers: l.turnovers,
    passesDecisives: l.passes,
    cartons: l.cartons,
  }));
}

export function classementJoueurs(
  divisionId: string, saison: number, journees: number,
  cat: Categorie, joueur?: Joueur | null, numeroPoule?: number, max = 20,
  reelles?: Record<string, LigneReelle>,
): LigneStats[] {
  const auMoteur = reelles && Object.keys(reelles).length > 0;
  const base = auMoteur ? depuisLeMoteur(reelles) : statsCompetition(divisionId, saison, journees, numeroPoule);
  let lignes = base;

  if (!auMoteur && joueur && joueur.division === divisionId) {
    const vecu = joueur.saisonEnCours;
    const stats: StatsDetaillees | undefined = vecu?.stats;
    const mien: LigneStats = {
      nom: joueur.nom,
      club: joueur.club,
      poste: joueur.poste,
      age: joueur.age,
      note: 0,
      matchs: vecu?.matchs ?? 0,
      titularisations: vecu?.titularisations ?? 0,
      // Le détail des minutes n'est pas suivi : 70 par titularisation, 22 sinon.
      minutes: Math.round((vecu?.titularisations ?? 0) * 70 + ((vecu?.matchs ?? 0) - (vecu?.titularisations ?? 0)) * 22),
      essais: vecu?.essais ?? 0,
      points: stats?.points ?? 0,
      butsTentes: stats?.butsTentes ?? 0,
      butsReussis: stats?.butsReussis ?? 0,
      plaquages: stats?.plaquages ?? 0,
      plaquagesManques: stats?.plaquagesManques ?? 0,
      grattages: stats?.grattages ?? 0,
      // Les turnovers ne sont pas comptés pour le joueur humain : on les déduit
      // de son poste et de son temps de jeu, comme pour les autres.
      turnovers: Math.round((PROFILS[joueur.poste]?.turnovers ?? 1) * ((vecu?.matchs ?? 0) * 0.8)),
      passesDecisives: stats?.passesDecisives ?? 0,
      cartons: (stats?.cartonsJaunes ?? 0) + (stats?.cartonsRouges ?? 0),
      moi: true,
    };
    // On remplace l'estimation faite pour lui par ses vrais chiffres.
    lignes = base.filter((l) => !(l.club === joueur.club && l.nom === joueur.nom)).concat(mien);
  }

  return lignes
    .filter((l) => valeurDe(l, cat) >= 0 && l.matchs > 0)
    .sort((a, b) => valeurDe(b, cat) - valeurDe(a, cat) || b.matchs - a.matchs || a.nom.localeCompare(b.nom))
    .slice(0, max);
}

// Le classement de la compétition du joueur à la semaine en cours — raccourci
// utilisé par l'écran Résultats.
export function journeesDisputees(divisionId: string, semaine: number, ancre = ''): number {
  return journeesALaSemaine(divisionId, semaine, nombreJournees(divisionId, ancre));
}

export function nomPoste(p: PosteId): string {
  return POSTE_PAR_ID[p]?.nom ?? '';
}
