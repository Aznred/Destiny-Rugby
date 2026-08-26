// ═══════════════════════════════════════════════════════════════════════════
// LES INSTALLATIONS DU CLUB — les murs, pas les hommes
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « fais qu'on puisse avoir un centre de formation avec des
// améliorations etc. et des recruteurs pour trouver les pépites ; il peut aussi
// y avoir des gros potentiels dans les petites ligues ; et fais le centre
// d'entraînement aussi pour faire des entraînements perso ».
//
// ⚠️ CE FICHIER EST PUR : pas de store, pas de DOM, aucun import d'écran. Les
// trois structures se règlent ici et nulle part ailleurs, pour la même raison
// que `lib/manager.ts` : ce sont des chiffres qu'on veut pouvoir mesurer sans
// navigateur (`scripts/verifInstallations.ts`).

import { NOTE_PAR_NIVEAU } from '../data/clubs';
import type { InstallationsClub, TypeInstallation } from '../types';

export const NIVEAU_INSTALLATION_MAX = 4;

export const TYPES_INSTALLATION: TypeInstallation[] = ['formation', 'entrainement', 'recrutement'];

export const EMOJI_INSTALLATION: Record<TypeInstallation, string> = {
  formation: '🎓',
  entrainement: '🏋️',
  recrutement: '🔎',
};

/** Un club qu'on prend en main n'a rien de construit tant qu'on n'a rien payé. */
export function installationsVierges(): InstallationsClub {
  return { formation: 0, entrainement: 0, recrutement: 0 };
}

export function niveauInstallation(
  installations: Record<string, InstallationsClub> | undefined,
  club: string,
  type: TypeInstallation,
): number {
  return installations?.[club]?.[type] ?? 0;
}

function arrondir(v: number, pas: number): number {
  return Math.max(pas, Math.round(v / pas) * pas);
}

/**
 * Le coefficient de richesse d'un étage.
 *
 * ⚠️ C'EST LA MÊME COURBE QUE `facteurNiveau` (`lib/recrutementManager.ts`),
 * recopiée ici pour une seule raison : `recrutementManager.ts` importe
 * `lib/effectif.ts`, qui est lourd, alors que ce fichier doit rester importable
 * par n'importe quoi. Si l'une des deux bouge, l'autre doit bouger — le banc
 * d'essai compare les deux valeur par valeur, précisément pour que la copie ne
 * puisse pas diverger en silence.
 */
export function facteurEtage(niveau: number): number {
  return Math.max(0.28, 1.1 - niveau * 0.075);
}

/**
 * LA TROISIÈME ENVELOPPE : ce que le club met dans ses murs chaque saison.
 *
 * ⚠️ ELLE EST SÉPARÉE DES DEUX AUTRES, ET C'EST TOUT L'INTÉRÊT. Prendre les
 * structures sur le budget transferts en ferait un arbitrage « un joueur ou un
 * centre » — que personne ne tranche en faveur du centre, parce que le joueur
 * joue dimanche et que le centre rapporte dans quatre ans. Et chez un club
 * amateur, où le budget transferts n'achète plus rien du tout (`PRO_JUSQUA`),
 * il n'y aurait même pas d'arbitrage : juste un écran mort.
 *
 * Elle part du MÊME point d'origine que les deux autres (`force − 31`), donc
 * le rapport structure/effectif est constant par construction à tous les
 * étages, au lieu de dépendre de deux courbes réglées séparément.
 */
export function budgetStructure(force: number, niveau: number): number {
  const brut = Math.max(0, force - 31) ** 2;
  return arrondir(Math.max(40_000, brut * 1_100 * facteurEtage(niveau)), 5_000);
}

/**
 * Le prix d'une marche, en saisons d'enveloppe.
 *
 * ⚠️ L'ENVELOPPE SE BANQUE INTÉGRALEMENT d'une saison à l'autre (le store),
 * et il le faut : à 4,6 saisons de budget, la dernière marche serait
 * inaccessible à un club modeste avec un report partiel — la structure la plus
 * intéressante du lot n'existerait que pour ceux qui n'en ont pas besoin.
 * Le prix total d'un centre complet fait donc ~10 saisons d'enveloppe pour qui
 * reste au même étage, et bien moins pour qui fait monter son club : c'est la
 * courbe qu'on veut, pas une prime aux gros clubs.
 */
const COUT_PAR_NIVEAU = [0, 0.9, 1.7, 2.9, 4.6];

export function coutAmelioration(niveauActuel: number, enveloppeDeReference: number): number | null {
  const vise = niveauActuel + 1;
  if (vise > NIVEAU_INSTALLATION_MAX) return null;
  return arrondir(enveloppeDeReference * COUT_PAR_NIVEAU[vise], 5_000);
}

// ---------------------------------------------------------------------------
// 🎓 LE CENTRE DE FORMATION
// ---------------------------------------------------------------------------
/** Combien de jeunes sortent chaque intersaison, par niveau de centre. */
export const PROMOTION_PAR_NIVEAU = [0, 1, 1, 2, 2];
/** … plus un de temps en temps, pour que deux saisons ne se ressemblent pas. */
export const CHANCE_UN_DE_PLUS = [0, 0.18, 0.34, 0.42, 0.55];
/**
 * La chance qu'un jeune du cru soit une VRAIE pépite.
 *
 * ⚠️ À COMPARER AUX 1,2 % DU MONDE (`PART_PEPITE`, lib/effectif.ts) : un centre
 * de niveau 4 en produit une fois sur cinq. C’est ça, payer un centre — on
 * n'achète pas des joueurs, on achète une LOI DE TIRAGE. Sans cet écart, le
 * centre serait un générateur de bouche-trous et l'améliorer ne se verrait pas.
 */
export const CHANCE_PEPITE_CENTRE = [0, 0.03, 0.07, 0.12, 0.2];
/**
 * Ce que le centre ajoute au potentiel d'un jeune ORDINAIRE.
 *
 * ⚠️ IL A ÉTÉ DIVISÉ PAR DEUX APRÈS MESURE, et c'est instructif. À +9, la
 * marge d'un sortant de niveau 4 valait 12 à 19 points : autrement dit, TOUS
 * les jeunes du centre étaient des espoirs, et le mot « pépite » ne désignait
 * plus rien — 81 % de la promotion passait la barre. Le centre doit sortir en
 * majorité des joueurs ordinaires, sinon le tirage rare qu'on paie si cher
 * n'est plus distinguable du reste.
 */
export const BONUS_POTENTIEL_CENTRE = [0, 1, 2, 4, 6];

// ---------------------------------------------------------------------------
// 🏋️ LE CENTRE D'ENTRAÎNEMENT
// ---------------------------------------------------------------------------
/** Combien de joueurs peuvent suivre un programme individuel à la fois. */
export const PLACES_ENTRAINEMENT = [0, 1, 2, 3, 5];

/**
 * Ce qu'une saison de programme individuel rapporte à un joueur.
 *
 * ⚠️ C'EST BORNÉ PAR LA MARGE QUI RESTE, et c'est la règle qui empêche le
 * centre de devenir une machine à fabriquer des stars : on ne dépasse jamais le
 * potentiel. Un cadre de 30 ans arrivé à son plafond ne gagne rien — l'envoyer
 * au programme est une erreur de manager, pas un bug.
 *
 * Le jeune profite davantage (× 1,5 avant 24 ans) : c'est l'âge où l'on
 * apprend, et c'est cohérent avec le bonus de formation de `lib/progression.ts`
 * du côté joueur.
 */
export const GAIN_ENTRAINEMENT = [0, 1, 1.6, 2.2, 3];

export function gainEntrainement(niveau: number, age: number, marge: number): number {
  if (niveau <= 0 || marge <= 0) return 0;
  const base = GAIN_ENTRAINEMENT[Math.min(niveau, NIVEAU_INSTALLATION_MAX)];
  const jeunesse = age <= 23 ? 1.5 : age <= 28 ? 1 : 0.5;
  return Math.min(marge, Math.round(base * jeunesse * 10) / 10);
}

// ---------------------------------------------------------------------------
// 🔎 LES RECRUTEURS
// ---------------------------------------------------------------------------
/** Combien de clubs le service observe en une saison. */
export const CLUBS_OBSERVES = [0, 6, 11, 17, 25];
/**
 * Jusqu'à combien d'étages SOUS le sien on sait aller chercher.
 *
 * ⚠️ C'EST LA DEMANDE, LITTÉRALEMENT : « il peut aussi y avoir des gros
 * potentiels dans les petites ligues ». Un service qui ne regarderait qu'à son
 * niveau ne trouverait jamais rien d'autre que ce que tout le monde voit déjà.
 */
export const PORTEE_RECRUTEURS = [0, 2, 3, 5, 10];
/**
 * ± autour du potentiel annoncé.
 *
 * ⚠️ SANS CETTE INCERTITUDE, AMÉLIORER LE SERVICE NE SE VERRAIT PAS. Le nombre
 * de clubs observés est invisible (on ne voit que le résultat) ; la précision,
 * elle, se lit sur chaque ligne du rapport. C'est elle qui rend le niveau 4
 * désirable : on cesse de parier, on sait.
 */
export const INCERTITUDE_RECRUTEURS = [0, 9, 6, 3, 0];

/** La note plancher qu'un recruteur juge digne d'un rapport, à cet étage. */
export function seuilInteret(niveauDuClub: number): number {
  return (NOTE_PAR_NIVEAU[niveauDuClub] ?? 50) - 14;
}
