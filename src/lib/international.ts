// LES COMPÉTITIONS DE SÉLECTIONS, JOUÉES POUR DE VRAI
//
// ⚠️ Jusqu'ici, `COMPETITIONS_NATIONS` (data/mondeReel.ts) ne contenait qu'un
// classement FIGÉ, recopié de la saison réelle : pendant une fenêtre
// internationale, le joueur ne voyait ni affiche, ni résultat, ni évolution —
// « les matchs et les compétitions sont invisibles ». Ici on les JOUE, avec le
// même moteur que le championnat et les coupes.
//
// Trois compétitions tournantes, calées sur le calendrier :
//   · le Tournoi des 6 Nations   (février-mars, 5 journées, aller simple)
//   · The Rugby Championship     (l'hémisphère sud, sur la même fenêtre)
//   · la tournée d'automne       (novembre, Nord contre Sud, 3 journées)
//
// Tout est DÉTERMINISTE (graine = compétition + saison + journée) : rien à
// sauvegarder, rouvrir l'écran ne rejoue rien.

import { calendrier, classer, graine, scorePossible, type LigneTableau, type MatchChampionnat } from './championnat';
import { noteALAge } from './effectif';
import type { Coequipier } from './effectif';
import { EFFECTIFS_REELS } from '../data/effectifsReels';
import { POSTE_PAR_ID, posteDepuisFamille } from '../data/rugby';
import { nomNation } from '../components/Drapeau';
import { semaine, CALENDRIER, estAnneeDeCoupeDuMonde } from '../data/calendrier';
import { COMPETITIONS_NATIONS_NOUVELLES } from '../data/nouvellesLigues';
import type { Joueur, PosteId } from '../types';

// La hiérarchie mondiale, en « note d'équipe » sur la même échelle que les
// clubs. Elle sert à jouer les matchs : deux points d'écart ≈ une possession.
export const FORCE_NATION: Record<string, number> = {
  'Afrique du Sud': 92, 'Nouvelle-Zélande': 91, Irlande: 90, France: 90,
  Angleterre: 87, Argentine: 86, Écosse: 85, Australie: 85,
  'Pays de Galles': 81, Fidji: 81, Italie: 80, Japon: 78, Géorgie: 77,
  Samoa: 76, Tonga: 75, Portugal: 73, Espagne: 71, Uruguay: 71,
  'États-Unis': 70, Roumanie: 69, Canada: 69, Chili: 68, Namibie: 65,
  'Hong Kong': 63, Zimbabwe: 63, Belgique: 62, Allemagne: 62, 'Pays-Bas': 61,
  Suisse: 58, Brésil: 68, 'Corée du Sud': 60, Kenya: 62,
};

export function forceNation(nation: string): number {
  const nom = nomNation(nation);
  return FORCE_NATION[nom] ?? forcesDesNouvellesNations()[nom] ?? 55;
}

export interface CompetitionInternationale {
  id: string;
  nom: string;
  emoji: string;
  equipes: string[];
  // Nombre de journées réellement disputées (aller simple, éventuellement tronqué).
  journees: number;
  // Type de semaine du calendrier où elle se joue.
  fenetre: 'automne' | 'tournoi';
}

export const COMPETITIONS_INTERNATIONALES: CompetitionInternationale[] = [
  {
    id: 'sixNations', nom: 'Tournoi des 6 Nations', emoji: '🏆', fenetre: 'tournoi',
    equipes: ['France', 'Irlande', 'Angleterre', 'Écosse', 'Pays de Galles', 'Italie'],
    journees: 5,
  },
  {
    id: 'rugbyChampionship', nom: 'The Rugby Championship', emoji: '🌏', fenetre: 'tournoi',
    equipes: ['Afrique du Sud', 'Nouvelle-Zélande', 'Argentine', 'Australie'],
    journees: 3,
  },
  {
    id: 'autumn', nom: 'Tournée d’automne', emoji: '🍂', fenetre: 'automne',
    equipes: [
      'France', 'Irlande', 'Angleterre', 'Écosse', 'Pays de Galles', 'Italie',
      'Afrique du Sud', 'Nouvelle-Zélande', 'Argentine', 'Australie', 'Fidji', 'Japon',
    ],
    journees: 3,
  },
];

// ---------------------------------------------------------------------------
// LES COMPÉTITIONS DE SÉLECTIONS DU DOSSIER « new league »
// ---------------------------------------------------------------------------
// Treize compétitions de plus, avec leur vrai plateau et leur vraie hiérarchie :
// Rugby Europe Championship / Trophy / Conference, Oceania Cup, Americas
// Championship, Pacific Challenge, Autumn Nations Cup, Tbilisi Cup, U20 Trophy…
// Elles sont CONSULTABLES dans l'écran Résultats et jouées avec le même moteur
// que le Tournoi. La force de chaque nation vient de son classement réel
// (`scripts/genNouvellesLigues.cjs`) et complète `FORCE_NATION` pour les nations
// que la table d'origine ne connaissait pas — l'Andorre, le Kosovo ou les Îles
// Salomon n'y figuraient pas.
//
// ⚠️ CONSTRUIT À LA DEMANDE, jamais au chargement du module. Une boucle en tête
// de fichier s'exécute à l'évaluation de l'import, et le moindre cycle
// (`international` → `effectif` → `clubs` → …) laissait la constante dans sa
// zone morte : `ReferenceError` au démarrage, écran blanc. Un getter mémoïsé
// n'a pas ce problème — il ne lit rien avant le premier appel.
let forcesNouvelles: Record<string, number> | null = null;
function forcesDesNouvellesNations(): Record<string, number> {
  if (!forcesNouvelles) {
    forcesNouvelles = {};
    for (const comp of COMPETITIONS_NATIONS_NOUVELLES) {
      for (const e of comp.equipes) {
        // On n'écrase JAMAIS une force calibrée à la main : `FORCE_NATION` fait
        // autorité pour les 32 nations qu'elle couvre.
        if (forcesNouvelles[e.nom] === undefined) forcesNouvelles[e.nom] = e.force;
      }
    }
  }
  return forcesNouvelles;
}

let competitionsNouvelles: CompetitionInternationale[] | null = null;
export function competitionsNouvellesNations(): CompetitionInternationale[] {
  competitionsNouvelles ??= COMPETITIONS_NATIONS_NOUVELLES.map((c) => ({
    id: c.id,
    nom: c.nom,
    emoji: c.emoji,
    fenetre: c.fenetre,
    equipes: c.equipes.map((e) => e.nom),
    // Aller simple : une journée de moins que le nombre d'équipes, plafonnée
    // au nombre de dates que le calendrier réserve à cette fenêtre.
    journees: Math.max(1, Math.min(5, c.equipes.length - 1)),
  }));
  return competitionsNouvelles;
}

// La Coupe du monde remplace la tournée d'automne une saison sur quatre.
export const COUPE_DU_MONDE: CompetitionInternationale = {
  id: 'coupeDuMonde', nom: 'Coupe du monde', emoji: '🌍', fenetre: 'automne',
  equipes: [
    'Afrique du Sud', 'Nouvelle-Zélande', 'Irlande', 'France', 'Angleterre',
    'Argentine', 'Écosse', 'Australie', 'Pays de Galles', 'Fidji', 'Italie',
    'Japon', 'Géorgie', 'Samoa', 'Tonga', 'Portugal',
  ],
  journees: 4,
};

export function competitionsDeLaSaison(saison: number): CompetitionInternationale[] {
  const mondial = estAnneeDeCoupeDuMonde(saison);
  return COMPETITIONS_INTERNATIONALES
    .filter((c) => !(mondial && c.id === 'autumn'))
    .concat(mondial ? [COUPE_DU_MONDE] : [])
    // ⚠️ Les compétitions du dossier « new league » viennent APRÈS : c'est
    // `fenetreInternationale` qui choisit celle du week-end, et elle prend la
    // PREMIÈRE de la fenêtre. Les 6 Nations et le Rugby Championship gardent
    // donc la priorité — le reste est consultable dans l'écran Résultats.
    .concat(competitionsNouvellesNations());
}

export function competitionInternationaleParId(id: string, saison: number) {
  return competitionsDeLaSaison(saison).find((c) => c.id === id);
}

// --- LE MATCH ---------------------------------------------------------------
// Même esprit que `jouerRencontre` : l'écart de force donne le score, avec un
// avantage au receveur et une part d'aléa. On passe par `scorePossible` pour ne
// jamais produire un score impossible au rugby (1, 2 ou 4 points).
export function jouerTestMatch(
  domicile: string, exterieur: string, saison: number, cle: string,
  apport: { nation: string; bonus: number } | null,
): MatchChampionnat {
  const rng = graine(`inter#${saison}#${cle}`);
  let ecart = forceNation(domicile) + 3 - forceNation(exterieur);
  if (apport && nomNation(apport.nation) === domicile) ecart += apport.bonus;
  if (apport && nomNation(apport.nation) === exterieur) ecart -= apport.bonus;

  const scoreD = scorePossible(22 + ecart * 1.15 + (rng() * 20 - 10));
  const scoreE = scorePossible(22 - ecart * 1.15 + (rng() * 20 - 10));
  return {
    domicile, exterieur, scoreD, scoreE,
    essaisD: Math.max(0, Math.round((scoreD - 6) / 7)),
    essaisE: Math.max(0, Math.round((scoreE - 6) / 7)),
  };
}

// --- LE CALENDRIER ----------------------------------------------------------
// Aller simple : le Tournoi, c'est cinq journées, pas dix.
function grille(c: CompetitionInternationale): [string, string][][] {
  const complet = calendrier(c.equipes);
  return complet.slice(0, c.journees);
}

export interface EtatInternational {
  id: string;
  nom: string;
  emoji: string;
  equipes: string[];
  journees: MatchChampionnat[][];
  classement: LigneTableau[];
  totalJournees: number;
  journeesJouees: number;
}

export function internationalEnDirect(
  id: string, saison: number, journeesJouees: number,
  apport: { nation: string; bonus: number } | null = null,
): EtatInternational | null {
  const c = competitionInternationaleParId(id, saison);
  if (!c) return null;
  const g = grille(c);
  const jusqua = Math.max(0, Math.min(g.length, journeesJouees));
  const journees: MatchChampionnat[][] = [];
  for (let j = 0; j < jusqua; j++) {
    journees.push(g[j].map(([d, e]) =>
      jouerTestMatch(d, e, saison, `${id}#${saison}#${j}#${d}#${e}`, apport)));
  }
  return {
    id: c.id, nom: c.nom, emoji: c.emoji, equipes: c.equipes,
    journees, classement: classer(c.equipes, journees),
    totalJournees: g.length, journeesJouees: jusqua,
  };
}

// Toutes les affiches d'une journée, jouées ou à venir.
export function affichesInternationales(
  id: string, saison: number, journee: number, journeesJouees: number,
  apport: { nation: string; bonus: number } | null = null,
): { domicile: string; exterieur: string; jouee: boolean; match: MatchChampionnat | null }[] {
  const c = competitionInternationaleParId(id, saison);
  if (!c) return [];
  const affiches = grille(c)[journee - 1];
  if (!affiches) return [];
  const jouee = journee <= journeesJouees;
  return affiches.map(([d, e]) => ({
    domicile: d, exterieur: e, jouee,
    match: jouee ? jouerTestMatch(d, e, saison, `${id}#${saison}#${journee - 1}#${d}#${e}`, apport) : null,
  }));
}

// --- LA FENÊTRE EN COURS ----------------------------------------------------
// Quelle compétition se joue cette semaine, et quelle journée ?
export function fenetreInternationale(numeroSemaine: number, saison: number): {
  competition: CompetitionInternationale; journee: number;
} | null {
  const sem = semaine(numeroSemaine);
  if (sem.type !== 'international') return null;
  const fenetre: 'automne' | 'tournoi' = sem.competitionInternationale === 'autumn' ? 'automne' : 'tournoi';
  // Combien de semaines de CETTE fenêtre sont déjà passées ?
  const memeFenetre = (s: typeof sem) => s.type === 'international'
    && ((s.competitionInternationale === 'autumn') === (fenetre === 'automne'));
  const dejaFaites = CALENDRIER.slice(0, numeroSemaine - 1).filter(memeFenetre).length;
  const competition = competitionsDeLaSaison(saison).find((c) => c.fenetre === fenetre);
  if (!competition) return null;
  return { competition, journee: Math.min(competition.journees, dejaFaites + 1) };
}

// Journées déjà disputées par une compétition à cette semaine du calendrier.
export function journeesInternationalesA(id: string, numeroSemaine: number, saison: number): number {
  const c = competitionInternationaleParId(id, saison);
  if (!c) return 0;
  const memeFenetre = (s: (typeof CALENDRIER)[number]) => s.type === 'international'
    && ((s.competitionInternationale === 'autumn') === (c.fenetre === 'automne'));
  return Math.min(c.journees, CALENDRIER.slice(0, Math.max(0, numeroSemaine - 1)).filter(memeFenetre).length);
}

// --- LE MATCH DU JOUEUR -----------------------------------------------------
export interface AfficheInternationale {
  competition: CompetitionInternationale;
  journee: number;
  match: MatchChampionnat;
  cle: string;
}

// L'affiche de SA sélection cette semaine, s'il est appelé et que sa nation
// dispute la compétition.
export function matchInternationalDuJoueur(j: Joueur, bonus = 0): AfficheInternationale | null {
  const sem = semaine(j.semaine ?? 1);
  if (sem.type !== 'international') return null;
  const fen = fenetreInternationale(j.semaine ?? 1, j.saison);
  if (!fen) return null;
  const nation = nomNation(j.nation);
  if (!fen.competition.equipes.includes(nation)) return null;

  const affiches = grille(fen.competition)[fen.journee - 1] ?? [];
  const mien = affiches.find(([d, e]) => d === nation || e === nation);
  if (!mien) return null;
  const [d, e] = mien;
  const cle = `${fen.competition.id}#${j.saison}#${fen.journee - 1}#${d}#${e}`;
  return {
    competition: fen.competition,
    journee: fen.journee,
    match: jouerTestMatch(d, e, j.saison, cle, { nation, bonus }),
    cle,
  };
}

// --- LES EFFECTIFS DE SÉLECTION --------------------------------------------
// ⚠️ Un XV national n'est pas un club : on le compose à partir des MEILLEURS
// joueurs réels de la nation, tous clubs confondus. C'est ce qui permet de
// jouer un match international avec le moteur 2D, exactement comme un match de
// championnat.
const cacheSelections = new Map<string, Coequipier[]>();

export function effectifNational(nation: string, saison: number): Coequipier[] {
  const nom = nomNation(nation);
  const cle = nom + '#' + saison;
  const memo = cacheSelections.get(cle);
  if (memo) return memo;

  const candidats: Coequipier[] = [];
  for (const [club, effectif] of Object.entries(EFFECTIFS_REELS)) {
    for (const joueur of effectif) {
      if (nomNation(joueur.nation) !== nom) continue;
      const age = joueur.age + saison - 1;
      if (age > 36) continue;
      candidats.push({
        id: `${nom}-${club}-${joueur.nom}`,
        nom: joueur.nom,
        // ⚠️ Les données réelles ne donnent que la FAMILLE de poste ; on tire
        // un numéro concret de façon déterministe, comme `effectif.ts`.
        poste: posteDepuisFamille(joueur.poste, Math.floor(graine('poste#' + club + joueur.nom)() * 1000)),
        age,
        note: noteALAge(joueur.note, joueur.age, joueur.potentiel, age, 0.5),
        potentiel: joueur.potentiel,
        nation: joueur.nation,
        regen: false,
      });
    }
  }
  candidats.sort((a, b) => b.note - a.note);

  // On garde de quoi monter une feuille complète : les meilleurs à chaque
  // poste, puis les meilleurs restants jusqu'à 30.
  const pris = new Set<Coequipier>();
  const groupe: Coequipier[] = [];
  const postes = Object.keys(POSTE_PAR_ID) as PosteId[];
  for (const poste of postes) {
    const famille = POSTE_PAR_ID[poste]?.famille;
    const deux = candidats.filter((c) => !pris.has(c) && POSTE_PAR_ID[c.poste]?.famille === famille).slice(0, 2);
    for (const c of deux) { pris.add(c); groupe.push(c); }
  }
  for (const c of candidats) {
    if (groupe.length >= 30) break;
    if (!pris.has(c)) { pris.add(c); groupe.push(c); }
  }
  cacheSelections.set(cle, groupe);
  return groupe;
}
