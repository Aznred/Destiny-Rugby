// ═══════════════════════════════════════════════════════════════════════════
// LA SIGNATURE D'UN JEUNE — le meilleur club ne gagne pas automatiquement
// ═══════════════════════════════════════════════════════════════════════════
// Demande :
//
//   « Score offre = réputation centre + chance de jouer + proximité famille +
//     niveau club + salaire + installations + réputation entraîneur + club
//     préféré. Donc le meilleur club ne gagne pas automatiquement. Un jeune de
//     Toulouse pourrait préférer Colomiers parce qu'il sait qu'il aura plus de
//     chances de jouer. »
//
//   « Pour les petits clubs, je mettrais énormément d'importance à la distance.
//     Un joueur de 16 ans ne va pas forcément faire 1h30 de route trois fois
//     par semaine. »
//
// ⚠️ LA DISTANCE N'EST PAS UN MALUS PARMI D'AUTRES — c'est un VETO qui
// s'assouplit avec l'âge. À 14 ans, on habite chez ses parents et on va à
// l'école : deux cents kilomètres ne se négocient pas, quel que soit le
// prestige du club. À 19 ans on peut déménager, et l'internat d'un grand centre
// règle le problème. Traiter la distance comme un simple terme de la somme
// ferait signer un gamin de quinze ans à six cents kilomètres de chez lui parce
// que le club a une belle réputation, ce qui est exactement ce que la demande
// écarte.

import { competitionDuClub } from '../data/clubs';
import { graine } from './championnat';
import { attraitDuCentre, notesDuCentre } from './centreFormation';
import type { NotesCentre } from './centreFormation';
import type { JeuneJoueur } from './jeunes';
import type { InstallationsClub } from '../types';

export interface OffreDeCentre {
  club: string;
  /** La force sportive du club — ce qu'il vaut sur un terrain. */
  niveauSportif: number;
  /** L'étage du club : 1 = Top 14. */
  niveau: number;
  /** Kilomètres entre le club du jeune et celui qui l'appelle. */
  distance: number;
  /** 0-100 : ce que le club lui promet comme temps de jeu chez les jeunes. */
  tempsDeJeuPromis: number;
  notes: NotesCentre;
  /** 0-100 : la réputation personnelle de l'entraîneur qui porte le projet. */
  reputationEntraineur: number;
}

export interface DetailChoix {
  club: string;
  total: number;
  lignes: { libelle: string; valeur: number }[];
  /** Vrai si la distance rend l'offre irrecevable à cet âge. */
  tropLoin: boolean;
}

/**
 * JUSQU'OÙ UN JEUNE ACCEPTE D'ALLER, en kilomètres.
 *
 * ⚠️ CE N'EST PAS UNE PRÉFÉRENCE, C'EST UNE CONTRAINTE DE VIE. À 14 ans le
 * garçon est scolarisé près de chez lui ; le seuil monte au fil des années
 * parce qu'un internat devient possible, puis parce qu'on peut simplement
 * déménager.
 *
 * ⚠️ ET UN GRAND CENTRE REPOUSSE LE SEUIL, il ne l'annule pas. C'est ce que
 * finance la ligne « encadrement scolaire » de la demande : un club qui loge et
 * scolarise ses jeunes peut aller les chercher plus loin — jusqu'à un point.
 */
export function rayonAcceptable(age: number, notes: NotesCentre): number {
  const parLAge = age <= 14 ? 45 : age <= 15 ? 70 : age <= 16 ? 110
    : age <= 17 ? 190 : age <= 18 ? 340 : 600;
  const internat = 1 + (notes.installations + notes.reputation) / 240;
  return Math.round(parLAge * internat);
}

/**
 * LE SCORE D'UNE OFFRE AUX YEUX DU JEUNE.
 *
 * ⚠️ « LE MEILLEUR CLUB NE GAGNE PAS AUTOMATIQUEMENT », et c'est le TEMPS DE
 * JEU qui le garantit — c'est le terme le plus lourd de la somme après la
 * proximité. L'exemple de la demande (« un jeune de Toulouse pourrait préférer
 * Colomiers parce qu'il sait qu'il aura plus de chances de jouer ») n'est
 * atteignable que si une promesse de jouer pèse plus que trente points de
 * niveau sportif.
 *
 * ⚠️ ET L'ATTACHEMENT AU CLUB FORMATEUR EST UN VRAI CONCURRENT. Rester chez soi
 * est une option, pas un défaut : sans elle, tout jeune un peu observé partirait
 * dès la première offre et les clubs de village ne garderaient jamais personne.
 */
/**
 * LES POIDS DE LA SOMME, DÉCLARÉS UNE SEULE FOIS.
 *
 * ⚠️ `scorerOffre` ET `scoreDeRester` DOIVENT LES PARTAGER. Recopiés, ils
 * divergent — et quand ils divergent, l'option « rester » disparaît sans que
 * rien ne le signale.
 *
 * L'ordre dit la demande : la proximité et le temps de jeu d'abord (« un jeune
 * de Toulouse pourrait préférer Colomiers parce qu'il aura plus de chances de
 * jouer »), le blason ensuite.
 */
export const POIDS_PROXIMITE = 34;
export const POIDS_TEMPS_DE_JEU = 38;
export const POIDS_CENTRE = 22;
export const POIDS_SPORTIF = 18;

export function scorerOffre(
  jeune: JeuneJoueur,
  offre: OffreDeCentre,
  alea: () => number,
): DetailChoix {
  const lignes: { libelle: string; valeur: number }[] = [];
  const limite = rayonAcceptable(jeune.age, offre.notes);
  const tropLoin = offre.distance > limite;

  // ── proximité ───────────────────────────────────────────────────────────
  // Pleine valeur à la porte de chez soi, zéro à la limite acceptable.
  const proximite = Math.max(0, 1 - offre.distance / Math.max(1, limite)) * POIDS_PROXIMITE;
  lignes.push({ libelle: 'proximité', valeur: Math.round(proximite) });

  // ── temps de jeu promis ─────────────────────────────────────────────────
  const jeu = (offre.tempsDeJeuPromis / 100) * POIDS_TEMPS_DE_JEU;
  lignes.push({ libelle: 'temps de jeu', valeur: Math.round(jeu) });

  // ── le centre : réputation, encadrement, installations ──────────────────
  const centre = (attraitDuCentre(offre.notes) / 100) * POIDS_CENTRE;
  lignes.push({ libelle: 'centre de formation', valeur: Math.round(centre) });

  // ── le niveau du club ───────────────────────────────────────────────────
  const sportif = Math.max(0, (offre.niveauSportif - 30) / 60) * POIDS_SPORTIF;
  lignes.push({ libelle: 'niveau du club', valeur: Math.round(sportif) });

  // Un entraîneur reconnu rassure la famille, sans pouvoir annuler la distance
  // ni une promesse de temps de jeu médiocre.
  const entraineur = Math.max(0, Math.min(8, offre.reputationEntraineur * 0.08));
  lignes.push({ libelle: 'entraîneur', valeur: Math.round(entraineur) });

  // ── ce qu'il touchera ───────────────────────────────────────────────────
  // ⚠️ LE SALAIRE PÈSE PEU, ET C'EST VOULU. On parle de mineurs : un centre de
  // formation ne paie pas un salaire, il offre un cadre. Un terme lourd ici
  // ferait gagner les clubs riches à tous les coups, ce qui viderait de son sens
  // tout le reste de la somme.
  const argent = Math.max(0, (11 - offre.niveau) / 10) * 8;
  lignes.push({ libelle: 'conditions', valeur: Math.round(argent) });

  // ── l'ambition personnelle ──────────────────────────────────────────────
  // Un ambitieux regarde le blason, un discret regarde la distance.
  const ambition = jeune.personnalite === 'ambitieux' ? 1.35
    : jeune.personnalite === 'modele' ? 1.1
      : jeune.personnalite === 'discret' ? 0.75 : 1;

  const total = (proximite + jeu + centre + sportif * ambition + argent + entraineur)
    // La part de hasard reste modeste : on veut un choix lisible, pas un dé.
    * (0.90 + alea() * 0.20);

  return { club: offre.club, total: Math.round(total * 10) / 10, lignes, tropLoin };
}

/**
 * CE QUE VAUT, POUR LE JEUNE, LE FAIT DE SIMPLEMENT RESTER CHEZ LUI.
 *
 * ⚠️ CE N'EST PAS UN LOT DE CONSOLATION, C'EST UNE OFFRE CONCURRENTE, et elle
 * se calcule avec LES MÊMES POIDS que les autres. Chez lui, le garçon est à zéro
 * kilomètre (pleine proximité) et il joue (plein temps de jeu) : ce sont les
 * deux termes les plus lourds de la somme. C'est exactement pour ça qu'un club
 * de village garde parfois son meilleur gamin.
 *
 * ⚠️ ET LES CONSTANTES SONT REPRISES DE `scorerOffre`, pas recopiées à la main.
 * Une version antérieure avait gardé « 22 » pour le temps de jeu après que le
 * poids soit passé à 38 : mesuré, **soixante jeunes sur soixante partaient**,
 * et rester chez soi n'existait plus comme option.
 */
export function scoreDeRester(jeune: JeuneJoueur, notesActuelles: NotesCentre): number {
  return Math.round(
    (POIDS_PROXIMITE + POIDS_TEMPS_DE_JEU + (attraitDuCentre(notesActuelles) / 100) * POIDS_CENTRE)
    * (0.55 + jeune.attachement / 190),
  );
}

export interface Decision {
  choix: string | null;
  classement: DetailChoix[];
  scoreRester: number;
}

/**
 * LE JEUNE TRANCHE.
 *
 * ⚠️ LA GRAINE EST CELLE DU JEUNE ET DE LA SAISON, pas de l'appel. Rouvrir
 * l'écran ne rejoue pas sa décision, et proposer la même chose deux fois ne
 * donne pas deux réponses : c'est la même protection anti-save-scumming que
 * partout ailleurs dans le jeu.
 */
export function choisirSonClub(
  jeune: JeuneJoueur,
  offres: OffreDeCentre[],
  notesActuelles: NotesCentre,
  saison: number,
): Decision {
  const rng = graine(`choixjeune#${jeune.id}#${saison}`);
  const classement = offres
    .map((o) => scorerOffre(jeune, o, rng))
    .sort((a, b) => b.total - a.total);
  const scoreRester = scoreDeRester(jeune, notesActuelles);
  const meilleure = classement.find((c) => !c.tropLoin);
  return {
    choix: meilleure && meilleure.total > scoreRester ? meilleure.club : null,
    classement,
    scoreRester,
  };
}

// ---------------------------------------------------------------------------
// L'INDEMNITÉ DE FORMATION
// ---------------------------------------------------------------------------
// Demande : « c'est très important pour rendre la formation intéressante. Tu
// formes un joueur pendant 7 ans. À 19 ans, Toulouse le recrute. Tu ne veux pas
// juste perdre le joueur gratuitement. Ton club pourrait recevoir : Indemnité
// de formation : 18 000 €. Donc un petit club peut réellement survivre grâce à
// sa formation. »
//
// ⚠️ ELLE EST PAYÉE PAR LE CLUB QUI RECRUTE, PAS PAR LE JEU. Elle sort du budget
// transferts de l'acheteur et entre dans celui du formateur : c'est un vrai
// transfert d'argent entre deux clubs, sinon ce serait une subvention et la
// formation deviendrait de l'argent gratuit.
//
// ⚠️ ET ELLE NE DÉPEND PAS DE LA VALEUR DU JOUEUR — on ne connaît pas encore
// cette valeur, c'est tout le sujet du lot. Elle dépend de ce qui est
// VÉRIFIABLE : les années de formation, l'âge, et l'étage de celui qui achète.
// Un barème indexé sur le potentiel réel ferait fuiter à l'écran le seul chiffre
// que le jeu s'interdit de montrer.

/** Ce qu'une année de formation vaut, selon l'étage du club qui recrute. */
const PAR_AN_ET_ETAGE: Record<number, number> = {
  0: 3_000, 1: 3_000, 2: 1_400, 3: 620, 4: 260, 5: 140,
  6: 70, 7: 40, 8: 25, 9: 15, 10: 10,
};

export function indemniteDeFormation(
  jeune: JeuneJoueur,
  niveauAcheteur: number,
  anneesFormees = 0,
): number {
  const annees = anneesFormees > 0 ? anneesFormees : Math.max(1, jeune.age - 12);
  const parAn = PAR_AN_ET_ETAGE[niveauAcheteur] ?? 10;
  // Un garçon de 19 ans déjà formé coûte plus qu'un enfant de 14 : on paie ce
  // qui a été fait, pas ce qui reste à faire.
  const maturite = 0.55 + (jeune.age - 13) * 0.11;
  return Math.round((annees * parAn * maturite) / 500) * 500;
}

/** Le club qui recrute a-t-il de quoi payer ? */
export function peutPayerLaFormation(budgetTransferts: number, indemnite: number): boolean {
  return budgetTransferts >= indemnite;
}

/**
 * LES OFFRES QUE LES CLUBS RIVAUX FONT À CE JEUNE.
 *
 * ⚠️ LE TEMPS DE JEU PROMIS EST L'INVERSE DU NIVEAU DU CLUB, et c'est ce qui
 * fait exister l'exemple de la demande. Toulouse ne peut pas promettre à un
 * garçon de dix-sept ans qu'il jouera : il a trente professionnels devant lui.
 * Colomiers, si. Sans cette anticorrélation, le classement des offres serait
 * exactement le classement des clubs, et le choix n'existerait pas.
 */
export function promesseDeTempsDeJeu(niveau: number, notes: NotesCentre): number {
  const parEtage = Math.min(92, 8 + niveau * 13);
  // Un centre qui fait confiance à ses jeunes en promet un peu plus.
  return Math.round(Math.min(96, parEtage + (notes.reputation - 50) * 0.12));
}

export function offreDe(
  club: string,
  distance: number,
  niveauSportif: number,
  installations?: Record<string, InstallationsClub>,
  reputationEntraineur = 45,
): OffreDeCentre {
  const niveau = competitionDuClub(club)?.niveau ?? 8;
  const notes = notesDuCentre(club, installations);
  return {
    club,
    niveau,
    niveauSportif,
    distance,
    tempsDeJeuPromis: promesseDeTempsDeJeu(niveau, notes),
    notes,
    reputationEntraineur,
  };
}
