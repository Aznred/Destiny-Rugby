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
  Russie: 72, Biélorussie: 64,
};

// ⚠️ « France U20 » n'est pas dans `FORCE_NATION` — et n'a pas à y être : sa
// force se DÉDUIT de celle des séniors. Une équipe de moins de 20 ans joue une
// quinzaine de points en dessous de son équipe première, partout dans le monde.
// Sans ça, toutes les sélections U20 seraient retombées sur la valeur par
// défaut (55) et l'Italie U20 aurait battu la Nouvelle-Zélande U20 une fois sur
// deux.
export const SUFFIXE_U20 = ' U20';
const ECART_U20 = 15;

// ⚠️ Les données réelles nomment l'équipe galloise « Galles U20 » (c'est la clé
// de `LOGO_PAR_EQUIPE`) alors que la sélection sénior s'appelle « Pays de
// Galles ». Sans cette table, l'écusson gallois U20 n'était jamais trouvé et la
// force de l'équipe retombait sur la valeur par défaut.
const NOM_U20: Record<string, string> = { 'Pays de Galles': 'Galles' };
const NOM_SENIOR: Record<string, string> = { Galles: 'Pays de Galles' };

export function estEquipeU20(equipe: string): boolean {
  return equipe.endsWith(SUFFIXE_U20);
}

export function nationDeLEquipeU20(equipe: string): string {
  const nom = equipe.slice(0, -SUFFIXE_U20.length);
  return NOM_SENIOR[nom] ?? nom;
}

export function equipeU20(nation: string): string {
  const nom = nomNation(nation);
  return (NOM_U20[nom] ?? nom) + SUFFIXE_U20;
}

export function forceNation(nation: string): number {
  const nom = nomNation(nation);
  if (estEquipeU20(nom)) {
    return Math.max(35, forceNation(nationDeLEquipeU20(nom)) - ECART_U20);
  }
  return FORCE_NATION[nom] ?? forcesDesNouvellesNations()[nom] ?? 55;
}

export interface LigneClassementMondial {
  rang: number;
  nation: string;
  points: number;
  force: number;
}

/**
 * Classement vivant inspiré de World Rugby. Il rejoue les résultats
 * internationaux des saisons passées : battre un adversaire mieux classé fait
 * gagner davantage de points, une défaite en retire. Il sert aussi aux
 * qualifications de la Coupe du monde.
 */
export function classementMondial(saison: number): LigneClassementMondial[] {
  // Le classement mondial est celui des sélections A uniquement. Les U20 et
  // équipes réserves peuvent jouer leurs propres compétitions, mais ne doivent
  // jamais voler une place dans le Top 12 senior ou les qualifications.
  const estSelectionSenior = (nom: string) => !estEquipeU20(nom) && !/\s+[BC]$/.test(nom);
  const nations = new Set<string>(
    [...Object.keys(FORCE_NATION), ...Object.keys(forcesDesNouvellesNations())]
      .filter(estSelectionSenior),
  );
  const points = new Map<string, number>([...nations].map((n) => [n, 1000 + forceNation(n) * 10]));
  const competitions = [...COMPETITIONS_INTERNATIONALES, ...competitionsNouvellesNations()]
    .filter((c) => !COMPETITIONS_U20.has(c.id));
  for (let annee = 1; annee < Math.max(1, saison); annee++) {
    for (const comp of competitions) {
      for (const journee of grille(comp, annee)) {
        for (const [domicile, exterieur] of journee) {
          const match = jouerTestMatch(domicile, exterieur, annee, `rang#${comp.id}#${annee}#${domicile}#${exterieur}`, null);
          const pd = points.get(domicile) ?? 1000;
          const pe = points.get(exterieur) ?? 1000;
          const attendu = 1 / (1 + 10 ** ((pe - pd) / 260));
          const resultat = match.scoreD === match.scoreE ? 0.5 : match.scoreD > match.scoreE ? 1 : 0;
          const variation = Math.round(18 * (resultat - attendu));
          points.set(domicile, pd + variation);
          points.set(exterieur, pe - variation);
        }
      }
    }
  }
  return [...nations].map((nation) => ({ nation, points: Math.round(points.get(nation) ?? 1000), force: forceNation(nation), rang: 0 }))
    .sort((a, b) => b.points - a.points || b.force - a.force || a.nation.localeCompare(b.nation, 'fr'))
    .map((l, i) => ({ ...l, rang: i + 1 }));
}

/** Les douze premiers sont qualifiés d'office ; douze places se gagnent en barrages. */
export function qualifiesCoupeDuMonde(saison: number): string[] {
  const rang = classementMondial(Math.max(1, saison - 1));
  const directs = rang.slice(0, 12).map((l) => l.nation);
  const barragistes = rang.slice(12, 36).map((l) => l.nation);
  const qualifies: string[] = [];
  for (let i = 0; i + 1 < barragistes.length && qualifies.length < 12; i += 2) {
    const a = barragistes[i];
    const b = barragistes[i + 1];
    const match = jouerTestMatch(a, b, saison - 1, `qualif-mondial#${saison}#${a}#${b}`, null);
    qualifies.push(match.scoreD >= match.scoreE ? a : b);
  }
  return [...directs, ...qualifies];
}

export interface CompetitionInternationale {
  id: string;
  nom: string;
  emoji: string;
  equipes: string[];
  // Nombre de journées réellement disputées (aller simple, éventuellement tronqué).
  journees: number;
  // Type de semaine du calendrier où elle se joue.
  fenetre: 'automne' | 'tournoi' | 'ete';
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
  // ═══ LES MOINS DE 20 ANS ═══════════════════════════════════════════════
  // ⚠️ Demande explicite : « rajoute les compétitions U20 ». Elles se jouent sur
  // les MÊMES fenêtres que les séniors (c'est la réalité : le Tournoi U20 se
  // dispute en parallèle du Tournoi, le Championnat du monde U20 à l'été). Le
  // nom des équipes porte le suffixe « U20 » — c'est la clé de `LOGO_PAR_EQUIPE`
  // et celle que `forceNation` reconnaît pour appliquer l'écart d'âge.
  {
    id: 'sixNationsU20', nom: 'Tournoi des 6 Nations U20', emoji: '🌱', fenetre: 'tournoi',
    equipes: [
      'France U20', 'Irlande U20', 'Angleterre U20', 'Écosse U20',
      'Galles U20', 'Italie U20',
    ],
    journees: 5,
  },
  {
    id: 'mondialU20', nom: 'Championnat du monde U20', emoji: '🎓', fenetre: 'automne',
    equipes: [
      'France U20', 'Irlande U20', 'Angleterre U20', 'Écosse U20', 'Galles U20',
      'Italie U20', 'Afrique du Sud U20', 'Nouvelle-Zélande U20', 'Argentine U20',
      'Australie U20', 'Géorgie U20', 'Uruguay U20',
    ],
    journees: 3,
  },
  {
    id: 'amicaux', nom: 'Matchs amicaux d’été', emoji: '☀️', fenetre: 'ete',
    equipes: [
      'France', 'Irlande', 'Angleterre', 'Écosse', 'Pays de Galles', 'Italie',
      'Afrique du Sud', 'Nouvelle-Zélande', 'Argentine', 'Australie', 'Japon', 'Géorgie',
      'Portugal', 'Espagne', 'Roumanie', 'Belgique', 'Allemagne', 'Pays-Bas',
      'Russie', 'Biélorussie', 'Uruguay', 'Chili', 'Canada', 'États-Unis',
      'Brésil', 'Kenya', 'Zimbabwe', 'Namibie', 'Samoa', 'Tonga', 'Fidji', 'Corée du Sud',
    ],
    journees: 1,
  },
];

// Les compétitions réservées aux moins de 20 ans.
export const COMPETITIONS_U20 = new Set(['sixNationsU20', 'mondialU20']);

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
  equipes: [],
  journees: 4,
};

export function coupeDuMondeDeLaSaison(saison: number): CompetitionInternationale {
  return { ...COUPE_DU_MONDE, equipes: qualifiesCoupeDuMonde(saison) };
}

export function competitionsDeLaSaison(saison: number): CompetitionInternationale[] {
  const mondial = estAnneeDeCoupeDuMonde(saison);
  return COMPETITIONS_INTERNATIONALES
    .filter((c) => !(mondial && c.id === 'autumn'))
    .concat(mondial ? [coupeDuMondeDeLaSaison(saison)] : [])
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
// ⚠️ Le tirage change chaque saison (`competition#saison`) : sans clé, la J1 du
// Tournoi opposait éternellement les deux mêmes nations, et chaque équipe
// recevait toujours les mêmes adversaires à la même date.
function grille(c: CompetitionInternationale, saison: number): [string, string][][] {
  const complet = calendrier(c.equipes, `${c.id}#${saison}`);
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
  const g = grille(c, saison);
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
  const affiches = grille(c, saison)[journee - 1];
  if (!affiches) return [];
  const jouee = journee <= journeesJouees;
  return affiches.map(([d, e]) => ({
    domicile: d, exterieur: e, jouee,
    match: jouee ? jouerTestMatch(d, e, saison, `${id}#${saison}#${journee - 1}#${d}#${e}`, apport) : null,
  }));
}

// --- LA FENÊTRE EN COURS ----------------------------------------------------
// Quelle compétition se joue cette semaine, et quelle journée ?
function fenetreDe(
  numeroSemaine: number, saison: number,
  retenir: (c: CompetitionInternationale) => boolean,
  equipe?: string,
): { competition: CompetitionInternationale; journee: number } | null {
  const sem = semaine(numeroSemaine);
  if (sem.type !== 'international') return null;
  const fenetre: 'automne' | 'tournoi' | 'ete' = sem.competitionInternationale === 'amicaux'
    ? 'ete'
    : sem.competitionInternationale === 'autumn' ? 'automne' : 'tournoi';
  // Combien de semaines de CETTE fenêtre sont déjà passées ?
  const memeFenetre = (s: typeof sem) => s.type === 'international'
    && (fenetre === 'ete' ? s.competitionInternationale === 'amicaux'
      : (s.competitionInternationale === 'autumn') === (fenetre === 'automne'));
  const dejaFaites = CALENDRIER.slice(0, numeroSemaine - 1).filter(memeFenetre).length;
  const ouvertes = competitionsDeLaSaison(saison).filter((c) => c.fenetre === fenetre && retenir(c));
  // ⚠️ LA COMPÉTITION DE **TON** PAYS D'ABORD (correctif signalé en jeu :
  // « c'est dur d'atteindre des sélections pour des nations faibles alors qu'on
  // est très bon »). On prenait la PREMIÈRE compétition de la fenêtre, toujours
  // la même : le Tournoi des 6 Nations en février, la tournée d'automne en
  // novembre. Un Belge, un Portugais ou un Roumain n'y figure pas — sa
  // convocation était donc refusée à CHAQUE fenêtre de sa carrière, quel que
  // soit son niveau, alors que le Rugby Europe Championship existait juste à
  // côté et qu'il n'y avait personne pour le lui ouvrir.
  const competition = (equipe && ouvertes.find((c) => c.equipes.includes(equipe))) || ouvertes[0];
  if (!competition) return null;
  return { competition, journee: Math.min(competition.journees, dejaFaites + 1) };
}

/**
 * La compétition de sélections qui se joue cette semaine-là.
 *
 * @param equipe si elle est fournie, on retient EN PRIORITÉ la compétition où
 *               cette sélection est engagée — c'est ce qui permet à un joueur
 *               d'une nation hors 6 Nations d'être appelé chez lui.
 */
export function fenetreInternationale(numeroSemaine: number, saison: number, equipe?: string) {
  // ⚠️ On écarte explicitement les compétitions U20 : sinon, une saison de Coupe
  // du monde (où la tournée d'automne disparaît), le Championnat du monde U20
  // serait devenu la compétition « séniors » de la fenêtre.
  return fenetreDe(numeroSemaine, saison, (c) => !COMPETITIONS_U20.has(c.id), equipe);
}

/** La compétition U20 qui se joue cette semaine-là, s'il y en a une. */
export function fenetreU20(numeroSemaine: number, saison: number, equipe?: string) {
  return fenetreDe(numeroSemaine, saison, (c) => COMPETITIONS_U20.has(c.id), equipe);
}

// Journées déjà disputées par une compétition à cette semaine du calendrier.
export function journeesInternationalesA(id: string, numeroSemaine: number, saison: number): number {
  const c = competitionInternationaleParId(id, saison);
  if (!c) return 0;
  const memeFenetre = (s: (typeof CALENDRIER)[number]) => s.type === 'international'
    && (c.fenetre === 'ete' ? s.competitionInternationale === 'amicaux'
      : (s.competitionInternationale === 'autumn') === (c.fenetre === 'automne'));
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
export function matchInternationalDuJoueur(
  j: Joueur, bonus = 0, u20 = false,
): AfficheInternationale | null {
  const sem = semaine(j.semaine ?? 1);
  if (sem.type !== 'international') return null;
  const nation = u20 ? equipeU20(j.nation) : nomNation(j.nation);
  const fen = u20
    ? fenetreU20(j.semaine ?? 1, j.saison, nation)
    : fenetreInternationale(j.semaine ?? 1, j.saison, nation);
  if (!fen) return null;
  if (!fen.competition.equipes.includes(nation)) return null;

  const affiches = grille(fen.competition, j.saison)[fen.journee - 1] ?? [];
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

  // ⚠️ « France U20 » compose son groupe dans le MÊME vivier que « France »,
  // mais borné à 20 ans : ce sont bien les meilleurs joueurs U20 du pays, pas
  // des joueurs inventés. Au-delà de l'âge, la logique est identique.
  const u20 = estEquipeU20(nom);
  const paysSource = u20 ? nationDeLEquipeU20(nom) : nom;

  // ⚠️ LES BASES DE DONNÉES NE LISTENT PAS LES ACADÉMIES. Beaucoup de pays
  // n'ont qu'une poignée de joueurs de 20 ans ou moins dans les effectifs
  // professionnels — l'Irlande n'en comptait que douze, pas de quoi aligner un
  // XV. On élargit donc l'âge source par paliers (20, puis 21, 22, 23) jusqu'à
  // avoir de quoi composer une feuille de match, et on RAMÈNE ces joueurs à
  // vingt ans : leur note est recalculée à cet âge-là (`noteALAge`), donc c'est
  // bien le niveau qu'ils avaient chez les U20, pas celui d'aujourd'hui.
  const construire = (ageMax: number): Coequipier[] => {
    const liste: Coequipier[] = [];
    for (const [club, effectif] of Object.entries(EFFECTIFS_REELS)) {
      for (const joueur of effectif) {
        if (nomNation(joueur.nation) !== paysSource) continue;
        const age = joueur.age + saison - 1;
        if (age > ageMax) continue;
        // Chez les U20, personne n'a plus de vingt ans sur la feuille.
        const ageRetenu = u20 ? Math.min(20, age) : age;
        liste.push({
          id: `${nom}-${club}-${joueur.nom}`,
          nom: joueur.nom,
          // ⚠️ Les données réelles ne donnent que la FAMILLE de poste ; on tire
          // un numéro concret de façon déterministe, comme `effectif.ts`.
          poste: posteDepuisFamille(joueur.poste, Math.floor(graine('poste#' + club + joueur.nom)() * 1000)),
          age: ageRetenu,
          note: noteALAge(joueur.note, joueur.age, joueur.potentiel, ageRetenu, 0.5),
          potentiel: joueur.potentiel,
          nation: joueur.nation,
          regen: false,
        });
      }
    }
    return liste;
  };

  let candidats = construire(u20 ? 20 : 36);
  if (u20) {
    for (const limite of [21, 22, 23]) {
      if (candidats.length >= 26) break;
      candidats = construire(limite);
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

  // ⚠️ ON COMPLÈTE TOUJOURS JUSQU'À 23. La base ne couvre que les championnats
  // professionnels : l'Uruguay n'y a qu'une poignée de joueurs, l'Uruguay U20
  // un seul. Sans complément, la feuille de match était impossible à monter et
  // le moteur jouait à deux contre quinze. Les joueurs ajoutés empruntent leurs
  // NOM ET PRÉNOM au vivier réel du pays (comme les regens des clubs réels,
  // voir `lib/effectif.ts`) et leur niveau vient de la force de la sélection —
  // ils sont donc crédibles, et parfaitement déterministes.
  if (groupe.length < 23) {
    const force = forceNation(nom);
    const donneurs = candidats.length ? candidats : construire(36);
    const postes15 = (Object.keys(POSTE_PAR_ID) as PosteId[]);
    for (let i = groupe.length; i < 23; i++) {
      const rng = graine(`selection#${nom}#${saison}#${i}`);
      const modele = donneurs.length
        ? donneurs[Math.floor(rng() * donneurs.length)]
        : null;
      const poste = postes15[i % postes15.length];
      const note = Math.round(force - 6 + rng() * 8);
      groupe.push({
        id: `${nom}-complement-${i}`,
        nom: modele
          // On recompose un nom du pays : prénom de l'un, nom d'un autre.
          ? `${modele.nom.split(' ')[0]} ${donneurs[Math.floor(rng() * donneurs.length)].nom.split(' ').slice(-1)[0]}`
          : `Joueur ${i + 1}`,
        poste,
        age: u20 ? 19 + Math.floor(rng() * 2) : 22 + Math.floor(rng() * 10),
        note: Math.max(30, Math.min(92, note)),
        potentiel: Math.max(35, Math.min(94, note + 4)),
        nation: modele?.nation ?? paysSource,
        regen: true,
      });
    }
  }

  cacheSelections.set(cle, groupe);
  return groupe;
}
