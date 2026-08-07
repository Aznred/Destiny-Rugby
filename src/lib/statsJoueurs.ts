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
import { nombre, t } from './i18n';
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
  // ⚠️ TOUT LE JEU, PAS SEULEMENT CE QUI SE VOIT (demande explicite : « pour les
  // notes il faut prendre en compte tout le jeu »). Un pilier ne marque pas
  // d'essai et ne fait pas de passe décisive : sans ces lignes-là, il n'existait
  // dans aucun classement, et sa saison ne se jugeait sur rien.
  passes: number;          // passes réussies (toutes)
  offloads: number;        // passes APRÈS contact
  metres: number;          // mètres gagnés ballon en main
  franchissements: number; // défenseurs battus
  melees: number;          // mêlées gagnées par son pack (avants)
  touchesGagnees: number;  // touches captées (avants)
  pickAndGo: number;       // ballons portés au ras (avants)
  coupsDePied: number;
  cinquanteVingtDeux: number; // 50/22 réussis
  cartonsJaunes: number;
  cartonsRouges: number;
  moi?: boolean; // le joueur humain
}

// --- LES REPÈRES PAR POSTE --------------------------------------------------
// Par match complet (80 minutes), pour un joueur de niveau moyen. Chiffres
// calés sur les moyennes réelles du rugby professionnel.
export interface Profil {
  essais: number; // essais par match
  plaquages: number; // plaquages réussis par match
  grattages: number; // ballons grattés
  turnovers: number; // ballons concédés
  passesD: number;
  buteur: number; // part des tirs au but de l'équipe assurée par ce poste
  // --- Le reste du jeu, par match complet ----------------------------------
  passes: number;   // passes réussies
  metres: number;   // mètres gagnés ballon en main
  offloads: number; // passes après contact
  pieds: number;    // coups de pied
  /**
   * ⚠️ `avant` COMMANDE TROIS COLONNES ENTIÈRES (demande explicite : les
   * arrières, « sans mêlée et touche et pick and go »). Un ailier ne pousse pas
   * en mêlée et ne saute pas en touche : lui attribuer ne serait-ce qu'une
   * valeur estimée le ferait apparaître dans un classement où il n'a rien à
   * faire. C'est donc ici, et une seule fois, qu'on décide qui participe à la
   * conquête.
   */
  avant: boolean;
}

// ⚠️ EXPORTÉ : `lib/honneurs.ts` juge une saison individuelle en comparant ce
// qu'a fait le joueur à ce qu'on attend de SON POSTE. Recopier ces chiffres
// ailleurs, c'est se garantir un jour deux barèmes — un classement de meilleur
// marqueur qui dit une chose, un trophée de meilleur joueur qui en dit une autre.
// ⚠️ LES QUATRE COLONNES AJOUTÉES SONT CALÉES SUR LE MOTEUR, pas inventées.
// Mesuré par `verifMoteur.ts` sur une saison : le 9 fait ~86 passes par match,
// le 10 ~55, les centres ~30, les ailiers 1 à 2, les avants 1 à 2,4. Les mètres
// suivent `ATTENDU` (moteur/apresMatch.ts), la seule table du projet qui les
// donnait déjà. L'estimation et le moteur doivent produire des ordres de
// grandeur comparables, sinon le classement change de nature le jour où une
// journée est rejouée.
export const PROFILS: Record<PosteId, Profil> = {
  pilier_gauche: { essais: 0.05, plaquages: 9, grattages: 0.25, turnovers: 1.1, passesD: 0.1, buteur: 0, passes: 1.4, metres: 18, offloads: 0.15, pieds: 0, avant: true },
  talonneur: { essais: 0.09, plaquages: 10, grattages: 0.4, turnovers: 1.2, passesD: 0.15, buteur: 0, passes: 1.8, metres: 22, offloads: 0.2, pieds: 0, avant: true },
  pilier_droit: { essais: 0.05, plaquages: 9, grattages: 0.25, turnovers: 1.1, passesD: 0.1, buteur: 0, passes: 1.4, metres: 18, offloads: 0.15, pieds: 0, avant: true },
  deuxieme_ligne_g: { essais: 0.08, plaquages: 13, grattages: 0.5, turnovers: 0.9, passesD: 0.15, buteur: 0, passes: 1.6, metres: 22, offloads: 0.2, pieds: 0, avant: true },
  deuxieme_ligne_d: { essais: 0.08, plaquages: 13, grattages: 0.5, turnovers: 0.9, passesD: 0.15, buteur: 0, passes: 1.6, metres: 22, offloads: 0.2, pieds: 0, avant: true },
  troisieme_aile_g: { essais: 0.13, plaquages: 14, grattages: 1.5, turnovers: 1, passesD: 0.25, buteur: 0, passes: 2.2, metres: 32, offloads: 0.45, pieds: 0.05, avant: true },
  troisieme_aile_d: { essais: 0.13, plaquages: 14, grattages: 1.9, turnovers: 1, passesD: 0.25, buteur: 0, passes: 2.2, metres: 32, offloads: 0.45, pieds: 0.05, avant: true },
  numero_8: { essais: 0.18, plaquages: 11, grattages: 0.9, turnovers: 1.3, passesD: 0.35, buteur: 0, passes: 2.4, metres: 45, offloads: 0.6, pieds: 0.1, avant: true },
  demi_melee: { essais: 0.16, plaquages: 6, grattages: 0.4, turnovers: 1.4, passesD: 0.8, buteur: 0.04, passes: 86, metres: 30, offloads: 0.3, pieds: 5.5, avant: false },
  demi_ouverture: { essais: 0.12, plaquages: 5, grattages: 0.2, turnovers: 1.2, passesD: 0.7, buteur: 0.62, passes: 55, metres: 30, offloads: 0.35, pieds: 12, avant: false },
  ailier_gauche: { essais: 0.42, plaquages: 4, grattages: 0.2, turnovers: 0.8, passesD: 0.3, buteur: 0.02, passes: 2, metres: 75, offloads: 0.5, pieds: 1.6, avant: false },
  premier_centre: { essais: 0.2, plaquages: 9, grattages: 0.4, turnovers: 1, passesD: 0.4, buteur: 0.03, passes: 30, metres: 55, offloads: 0.8, pieds: 0.9, avant: false },
  deuxieme_centre: { essais: 0.26, plaquages: 8, grattages: 0.35, turnovers: 1, passesD: 0.45, buteur: 0.05, passes: 30, metres: 60, offloads: 0.9, pieds: 1.1, avant: false },
  ailier_droit: { essais: 0.42, plaquages: 4, grattages: 0.2, turnovers: 0.8, passesD: 0.3, buteur: 0.02, passes: 2, metres: 75, offloads: 0.5, pieds: 1.6, avant: false },
  arriere: { essais: 0.3, plaquages: 6, grattages: 0.3, turnovers: 1.1, passesD: 0.5, buteur: 0.22, passes: 6, metres: 80, offloads: 0.6, pieds: 6, avant: false },
};

// La conquête, par match complet et pour un avant. Un pack gagne ~11 mêlées et
// ~14 touches par match ; la touche revient au sauteur (donc surtout aux
// deuxièmes lignes), la mêlée se crédite aux huit.
const MELEES_PAR_MATCH = 11;
const TOUCHES_PAR_MATCH = 14;
const PICK_AND_GO_PAR_MATCH = 4.5; // par avant : le pack en fait ~36

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
  // ⚠️ Un rouge est bien plus rare qu'un jaune : ~0,09 par match dans le rugby
  // professionnel, soit un carton sur quatorze. Le moteur applique le même taux
  // (`siffler`), il faut que l'estimation le suive — sinon le classement des
  // cartons rouges change de nature dès qu'une journée est rejouée.
  const cartonsRouges = cartons > 0 && rng() < 0.07 ? 1 : 0;
  const cartonsJaunes = Math.max(0, cartons - cartonsRouges);

  const passes = Math.max(0, Math.round(profil.passes * matchsEquivalents * bruit(0.3)));
  const metres = Math.max(0, Math.round(profil.metres * matchsEquivalents * talent * bruit(0.45)));
  const offloads = Math.max(0, Math.round(profil.offloads * matchsEquivalents * talent * bruit(0.9)));
  const coupsDePied = Math.max(0, Math.round(profil.pieds * matchsEquivalents * bruit(0.4)));
  // Le 50/22 est un geste rare et difficile : ~1,7 tenté par match pour toute
  // une équipe, et un sur trois trouve la touche. Réservé à ceux qui tapent.
  const cinquanteVingtDeux = profil.pieds >= 1.5
    ? Math.max(0, Math.round(matchsEquivalents * 0.12 * (c.note / 70) * bruit(1.2)))
    : 0;
  const franchissements = Math.max(0, Math.round(matchsEquivalents * (profil.metres / 42) * talent * bruit(0.8)));

  // ⚠️ LA CONQUÊTE N'EXISTE QUE POUR LES AVANTS. Un ailier à qui l'on
  // attribuerait « 3 mêlées » polluerait le classement de la mêlée avec des
  // trois-quarts — exactement ce que la demande écarte.
  const melees = profil.avant ? Math.max(0, Math.round(MELEES_PAR_MATCH * matchsEquivalents * bruit(0.25))) : 0;
  // La touche revient au SAUTEUR : la détente compte, d'où l'avantage des
  // deuxièmes lignes (grattages élevés = troisième ligne, pas sauteur).
  const partSauteur = c.poste.startsWith('deuxieme_ligne') ? 0.42
    : c.poste === 'numero_8' || c.poste.startsWith('troisieme') ? 0.14
      : c.poste === 'talonneur' ? 0.02 : 0.05;
  const touchesGagnees = profil.avant
    ? Math.max(0, Math.round(TOUCHES_PAR_MATCH * partSauteur * matchsEquivalents * talent * bruit(0.5)))
    : 0;
  const pickAndGo = profil.avant
    ? Math.max(0, Math.round(PICK_AND_GO_PAR_MATCH * matchsEquivalents * bruit(0.6)))
    : 0;

  return {
    nom: c.nom, club, poste: c.poste, age: c.age, note: c.note,
    matchs, titularisations, minutes,
    essais,
    // Points marqués : essais + tirs au but (transformations 2, pénalités 3 —
    // on prend 2,4 en moyenne, la proportion réelle des deux).
    points: essais * 5 + Math.round(butsReussis * 2.4),
    butsTentes, butsReussis,
    plaquages, plaquagesManques, grattages, turnovers, passesDecisives,
    passes, offloads, metres, franchissements,
    melees, touchesGagnees, pickAndGo, coupsDePied, cinquanteVingtDeux,
    cartonsJaunes, cartonsRouges,
  };
}

// --- LE CLASSEMENT D'UNE COMPÉTITION ---------------------------------------

export type Categorie =
  | 'essais' | 'points' | 'buteurs' | 'plaquages' | 'grattages'
  | 'turnovers' | 'passes' | 'passesTotal' | 'offloads' | 'metres'
  | 'franchissements' | 'melees' | 'touches' | 'pickAndGo'
  | 'pieds' | 'cinquanteVingtDeux' | 'cartons' | 'minutes';

/**
 * ⚠️ `famille` DÉCIDE QUI FIGURE DANS LE CLASSEMENT (demande explicite : la
 * conquête pour les avants, le jeu au pied et les offloads mis en avant chez les
 * arrières). Un classement de la mêlée où figure un ailier n'est pas un
 * classement, c'est une liste. Absente = tout le monde concourt.
 */
export const CATEGORIES: {
  id: Categorie; nom: string; emoji: string; desc: string;
  famille?: 'avants' | 'arrieres';
}[] = [
  { id: 'essais', nom: 'Essais', emoji: '🏉', desc: 'Les meilleurs marqueurs du championnat.' },
  { id: 'points', nom: 'Points', emoji: '💯', desc: 'Essais et coups de pied confondus.' },
  { id: 'buteurs', nom: 'Buteurs', emoji: '🎯', desc: 'Pourcentage de réussite au pied (10 tentatives minimum).' },
  { id: 'plaquages', nom: 'Plaquages', emoji: '🛡️', desc: 'Plaquages réussis, et taux de réussite.' },
  { id: 'grattages', nom: 'Grattages', emoji: '🪝', desc: 'Ballons volés au sol.' },
  { id: 'turnovers', nom: 'Turnovers', emoji: '🔄', desc: 'Ballons concédés à l’adversaire — moins il y en a, mieux c’est.' },
  { id: 'metres', nom: 'Mètres', emoji: '📏', desc: 'Mètres gagnés ballon en main, au-delà de la ligne d’avantage.' },
  { id: 'franchissements', nom: 'Franchissements', emoji: '💨', desc: 'Défenseurs battus et lignes franchies.' },
  { id: 'passes', nom: 'Passes déc.', emoji: '🅰️', desc: 'La dernière passe avant l’essai.' },
  { id: 'passesTotal', nom: 'Passes', emoji: '🤾', desc: 'Toutes les passes réussies — le domaine des demis.' },
  { id: 'offloads', nom: 'Offloads', emoji: '🤝', desc: 'Les passes APRÈS contact : faire vivre le ballon dans le plaquage.' },
  { id: 'melees', nom: 'Mêlées', emoji: '🐏', desc: 'Mêlées gagnées par son pack. Réservé aux avants.', famille: 'avants' },
  { id: 'touches', nom: 'Touches', emoji: '🙌', desc: 'Ballons captés en touche. Réservé aux avants.', famille: 'avants' },
  { id: 'pickAndGo', nom: 'Pick and go', emoji: '🪨', desc: 'Ballons portés au ras du ruck. Réservé aux avants.', famille: 'avants' },
  { id: 'pieds', nom: 'Coups de pied', emoji: '🦵', desc: 'Le jeu au pied : dégagements, occupation, chandelles.', famille: 'arrieres' },
  { id: 'cinquanteVingtDeux', nom: '50/22', emoji: '🎯', desc: 'Les 50/22 réussis — trouver la touche dans les 22 adverses depuis son camp.', famille: 'arrieres' },
  { id: 'cartons', nom: 'Cartons', emoji: '🟨', desc: 'Les plus sanctionnés du championnat (rouges en tête).' },
  { id: 'minutes', nom: 'Temps de jeu', emoji: '⏱️', desc: 'Les increvables.' },
];

/** Le moteur garde les libellés français pour ses calculs, l'écran les traduit. */
export function libelleCategorie(id: Categorie): string {
  const traduit = t(`stats.${id}`);
  return traduit === `stats.${id}`
    ? CATEGORIES.find((categorie) => categorie.id === id)?.nom ?? id
    : traduit;
}

/** Un avant, au sens de la conquête : les maillots 1 à 8. */
export function estAvant(poste: PosteId): boolean {
  return PROFILS[poste]?.avant ?? false;
}

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
    case 'passesTotal': return l.passes;
    case 'offloads': return l.offloads;
    case 'metres': return l.metres;
    case 'franchissements': return l.franchissements;
    case 'melees': return l.melees;
    case 'touches': return l.touchesGagnees;
    case 'pickAndGo': return l.pickAndGo;
    case 'pieds': return l.coupsDePied;
    case 'cinquanteVingtDeux': return l.cinquanteVingtDeux;
    // Un rouge pèse plus lourd qu'un jaune : le tri le reflète.
    case 'cartons': return l.cartonsJaunes + l.cartonsRouges * 3;
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
    case 'minutes': return `${nombre(l.minutes)} min`;
    case 'metres': return `${nombre(l.metres)} m`;
    // On montre les deux couleurs : « 3 🟨 » ou « 2 🟨 · 1 🟥 ».
    case 'cartons': return `${l.cartonsJaunes} 🟨${l.cartonsRouges ? ` · ${l.cartonsRouges} 🟥` : ''}`;
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
    // ⚠️ CORRECTION : cette ligne renvoyait `l.passes`, c'est-à-dire TOUTES les
    // passes, dans la colonne « passes décisives ». Le classement des passeurs
    // décisifs était donc un classement des demis de mêlée — 86 « passes
    // décisives » par match. Le moteur compte maintenant la vraie passe qui
    // amène l'essai (`StatsMatch.passesDecisives`), et les deux sont distinctes.
    passesDecisives: l.passesDecisives,
    passes: l.passes,
    offloads: l.offloads,
    metres: l.metres,
    franchissements: l.franchissements,
    melees: l.melees,
    touchesGagnees: l.touchesGagnees,
    pickAndGo: l.pickAndGo,
    coupsDePied: l.coupsDePied,
    cinquanteVingtDeux: l.cinquanteVingtDeux,
    cartonsJaunes: l.cartonsJaunes,
    cartonsRouges: l.cartonsRouges,
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

  // ⚠️ LE JOUEUR HUMAIN A TOUJOURS SES PROPRES CHIFFRES, quelle que soit la
  // source des autres. C'est le bug signalé en jeu : « le classement des stats
  // joueurs marche pas bien, des fois il perd des stats ».
  //
  // Il y avait DEUX comptabilités parallèles pour lui :
  //   · `saisonEnCours` — ce que le panneau de carrière et le profil affichent,
  //     alimenté match par match (par le moteur s'il a regardé, par l'estimation
  //     sinon) ;
  //   · `statsReelles` — la simulation de fond, alimentée journée par journée.
  // Tant qu'on regardait chaque match, les deux coïncidaient (même graine). Dès
  // qu'on saute des semaines, ou qu'une journée n'est pas rattrapée, elles
  // divergent : le panneau annonce 5 matchs, le classement en montre 2. Le
  // joueur a raison — il perd des stats, et ce sont les siennes.
  //
  // Une carrière n'a qu'une seule vérité : `saisonEnCours`, celle qui a
  // réellement fait progresser le joueur. C'est elle qui gagne, toujours.
  if (joueur && joueur.division === divisionId) {
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
      turnovers: stats?.turnovers ?? 0,
      passesDecisives: stats?.passesDecisives ?? 0,
      // ⚠️ TOUT LE JEU DU JOUEUR HUMAIN EST MAINTENANT COMPTÉ. Ces lignes
      // étaient absentes : il apparaissait à zéro dans les classements de la
      // mêlée, de la touche, des mètres et des offloads — c'est-à-dire dans
      // tout ce qui fait le match d'un avant.
      passes: stats?.passes ?? 0,
      offloads: stats?.offloads ?? 0,
      metres: stats?.metres ?? 0,
      franchissements: stats?.franchissements ?? 0,
      melees: stats?.melees ?? 0,
      touchesGagnees: stats?.touchesGagnees ?? 0,
      pickAndGo: stats?.pickAndGo ?? 0,
      coupsDePied: stats?.coupsDePied ?? 0,
      cinquanteVingtDeux: stats?.cinquanteVingtDeux ?? 0,
      cartonsJaunes: stats?.cartonsJaunes ?? 0,
      cartonsRouges: stats?.cartonsRouges ?? 0,
      moi: true,
    };
    // On remplace l'estimation faite pour lui par ses vrais chiffres.
    lignes = base.filter((l) => !(l.club === joueur.club && l.nom === joueur.nom)).concat(mien);
  }

  // ⚠️ LE FILTRE PAR FAMILLE DE POSTE. La mêlée, la touche et le pick and go
  // sont des classements d'AVANTS ; le jeu au pied et le 50/22, des classements
  // de trois-quarts. Sans ce filtre, un troisième ligne qui dégage une fois se
  // retrouvait au classement des botteurs, et le tableau ne voulait plus rien
  // dire.
  const famille = CATEGORIES.find((c) => c.id === cat)?.famille;
  const concernes = famille
    ? lignes.filter((l) => (famille === 'avants') === estAvant(l.poste))
    : lignes;

  return concernes
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
