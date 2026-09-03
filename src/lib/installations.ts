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

/**
 * ⚠️ CE SONT DES NOMS D'ICÔNES DESSINÉES, PLUS DES EMOJI. La table s'appelait
 * `EMOJI_INSTALLATION` et rendait 🎓 🏋️ 🔎 : trois pictogrammes dessinés par le
 * système d'exploitation, dans des couleurs qui ne sont pas celles du jeu et
 * avec une ligne de base qui varie d'une machine à l'autre. Les tracés de
 * `components/Icone.tsx` prennent la couleur du texte et s'alignent dessus.
 */
export const ICONE_INSTALLATION: Record<TypeInstallation, 'formation' | 'halteres' | 'loupe'> = {
  formation: 'formation',
  entrainement: 'halteres',
  recrutement: 'loupe',
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

/**
 * LA TROISIÈME ENVELOPPE : ce que le club met dans ses murs chaque saison.
 *
 * ⚠️ ELLE EST SÉPARÉE DES DEUX AUTRES, ET C'EST TOUT L'INTÉRÊT. Prendre les
 * structures sur le budget transferts en ferait un arbitrage « un joueur ou un
 * centre » — que personne ne tranche en faveur du centre, parce que le joueur
 * joue dimanche et que le centre rapporte dans quatre ans. Et chez un club
 * amateur, où le budget transferts n'achète presque rien (`PRO_JUSQUA`), il
 * n'y aurait même pas d'arbitrage : juste un écran mort.
 *
 * ⚠️ CE FICHIER N'EN EST PAS L'AUTEUR, ET IL N'EN OFFRE PLUS D'ACCÈS. Elle sort
 * de `budgetsDuClub` (`lib/recrutementManager.ts`), avec les deux autres lignes
 * du budget. Il a existé ici un raccourci `budgetStructure(force, niveau)` :
 * l'écran des installations l'appelait, le store appelait `budgetsDuClub`, et
 * les deux ne tombaient pas d'accord — mesuré, 5 étages sur 8 divergeaient, et
 * en Nationale l'écran annonçait 125 000 € quand le store en exigeait 315 000.
 * Le bouton « Améliorer » s'allumait, et le clic ne faisait rien.
 * **Ne pas rouvrir ce raccourci** : un seul appelant suffit à recréer l'écart.
 * Banc de mesure : `scripts/verifEnveloppeStructure.ts`.
 */

/**
 * LE PRIX D'UNE MARCHE — UN PALIER FIXE, EN EUROS.
 *
 * ⚠️ IL ÉTAIT PROPORTIONNEL À L'ENVELOPPE DU CLUB, ET C'EST CE QUI LE RENDAIT
 * INATTEIGNABLE. Le prix valait `enveloppe × COUT_PAR_NIVEAU[vise]`, donc il
 * MONTAIT avec le championnat : un club qui progressait voyait le tarif grimper
 * exactement au même rythme que ses moyens, et la structure restait toujours à
 * la même distance. Retour de jeu : « les structures n'ont pas de prix fixe et
 * augmentent en fonction du championnat, donc impossible de les augmenter ;
 * fais plutôt des paliers, le prix est fixe mais un club de Régionale ne pourra
 * jamais avoir le meilleur ».
 *
 * ⚠️ ET C'EST LE PRIX FIXE QUI CRÉE LA HIÉRARCHIE, pas un plafond artificiel.
 * On ne dit nulle part « la Régionale n'a pas droit au niveau 4 » : le tarif
 * suffit. Mesuré en saisons d'enveloppe, avec les revenus réels du jeu :
 *
 *   étage         N1     N2      N3      N4      → plafond atteignable
 *   Top 14       0,0    0,1     0,4     1,5      les quatre marches
 *   Pro D2       0,0    0,3     1,4     5,8      les quatre, en y consacrant une carrière
 *   Nationale    0,1    0,8     3,8    15,9      trois marches
 *   Nationale 2  0,4    2,4    11,4    47,6      deux, la troisième au très long terme
 *   Fédérale 1   0,7    4,2    20,0    83,3      deux marches
 *   Régionale 1  2,7   16,7    80,0   333,3      une marche
 *   Régionale 3  8,0   50,0   240,0  1000,0      une marche, et il faut la vouloir
 *
 * L'enveloppe se banque intégralement d'une saison à l'autre (le store), donc
 * ces durées sont des durées d'ÉPARGNE, pas des refus.
 */
const PRIX_PAR_NIVEAU = [0, 40_000, 250_000, 1_200_000, 5_000_000];

export function coutAmelioration(niveauActuel: number): number | null {
  if (!Number.isInteger(niveauActuel) || niveauActuel < 0) return null;
  const vise = niveauActuel + 1;
  if (vise > NIVEAU_INSTALLATION_MAX) return null;
  return PRIX_PAR_NIVEAU[vise];
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
