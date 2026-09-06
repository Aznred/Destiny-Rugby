// ═══════════════════════════════════════════════════════════════════════════
// LA DÉTECTION — ce qu'on croit voir, et pourquoi ça vaut le déplacement
// ═══════════════════════════════════════════════════════════════════════════
// Demande, avec ses chiffres :
//
//   « Et plus tu observes longtemps un joueur, plus ton rapport devient précis.
//     Au début :            Potentiel 55-88
//     Après 3 matchs :      Potentiel 68-84
//     Après 10 matchs + entretien : Potentiel 74-82
//     Ça donne une vraie raison de scout plutôt que juste regarder une base de
//     données. »
//
// ⚠️ C'EST LA PHRASE LA PLUS IMPORTANTE DU LOT : « plutôt que juste regarder une
// base de données ». L'écran Marché du manager existe déjà et montre la note et
// le potentiel de n'importe quel joueur du monde. Si la détection des jeunes
// affichait la même chose, elle ne serait qu'un second annuaire — il faut que
// la connaissance se PAIE, en temps et en argent.
//
// ⚠️ ET UN RAPPORT EST STABLE. Rouvrir l'écran, recharger la sauvegarde ou
// relancer le jeu ne redonne jamais une meilleure estimation du même garçon :
// la perturbation est semée sur (club observateur + jeune + nombre
// d'observations). C'est la même protection anti-save-scumming que les plafonds
// cachés des négociations et que les contrats du marché.

import { graine } from './championnat.js';
import { incertitudeDeDepart } from './centreFormation.js';
import type { NotesCentre } from './centreFormation.js';
import type { JeuneRepere } from './viviers.js';

/** Ce que le club a accumulé sur un jeune. Persisté : c'est un investissement. */
export interface Observation {
  jeuneId: string;
  /** Combien de fois on est allé le voir jouer. */
  matchs: number;
  /** L'entretien avec le joueur et sa famille — il vaut trois matchs. */
  entretien: boolean;
  /** La saison de la dernière visite, pour dater le rapport. */
  saison: number;
}

export interface FicheDetection {
  jeune: JeuneRepere;
  /** Le niveau ACTUEL tel qu'on le lit : à peine perturbé, il se voit à l'œil. */
  noteObservee: number;
  potentielBas: number;
  potentielHaut: number;
  /** Les mêmes bornes, en étoiles — c'est ce que la demande veut à l'écran. */
  etoilesBas: number;
  etoilesHaut: number;
  /** 0-100 : ce que vaut ce rapport. */
  confiance: number;
  matchs: number;
  entretien: boolean;
}

/**
 * Le haut de l'échelle de potentiel du jeu.
 *
 * ⚠️ UNE FOURCHETTE NE MONTE JAMAIS AU-DESSUS. Bornée à 99 — au-dessus de ce
 * que `fabriquerJeune` produit réellement —, toute la moitié haute de la
 * pyramide affichait « … - 99 » et les étoiles ne distinguaient plus rien :
 * cinq rapports sur cinq rendaient « 4,5 à 5 ★ », mesuré à l'écran.
 */
export const POTENTIEL_MAX = 96;

/** Un entretien vaut trois déplacements : on y apprend ce qu'un match ne dit pas. */
export const VALEUR_ENTRETIEN = 3;
/** Au-delà, on n'apprend plus rien de neuf. */
export const OBSERVATIONS_UTILES = 10;

/**
 * CE QUE L'OBSERVATION A RESSERRÉ, de 0 (rien vu) à 1 (on sait).
 *
 * ⚠️ LA COURBE EST CONCAVE, et c'est ce qui rend la première visite précieuse.
 * Une droite donnerait au dixième match la même valeur qu'au premier : personne
 * n'irait voir un garçon deux fois, on scouterait dix joueurs une fois chacun.
 * Ici le premier déplacement rapporte le plus, et l'entretien clôt le dossier.
 */
export function progresDObservation(o: Observation | undefined): number {
  if (!o) return 0;
  const vues = Math.min(OBSERVATIONS_UTILES, o.matchs + (o.entretien ? VALEUR_ENTRETIEN : 0));
  return Math.min(1, (vues / OBSERVATIONS_UTILES) ** 0.62);
}

/**
 * L'ÂGE REND UN JEUNE LISIBLE, OU NON.
 *
 * ⚠️ CE FACTEUR MANQUAIT, ET C'EST CE QUI DONNE SA TENSION AU LOT. Sans lui, un
 * bon service de recrutement lisait un garçon de quatorze ans aussi bien qu'un
 * garçon de dix-neuf : mesuré, la toute première fiche sur une pépite de 16 ans
 * annonçait déjà « 90-99, 4,5 à 5 étoiles » — le secret était éventé avant
 * d'avoir envoyé qui que ce soit le voir.
 *
 * À quatorze ans on ne sait rien : le corps n'a pas fini de pousser, et la
 * moitié de ce qu'on voit est de l'avance de croissance. À dix-neuf, le joueur
 * est presque là. C'est ce qui crée le vrai arbitrage du recrutement : signer
 * tôt et pas cher en pariant, ou signer tard et cher en sachant — sauf que d'ici
 * là, quinze autres clubs l'auront vu.
 */
export function flouDeLAge(age: number): number {
  return Math.max(0.75, 2.05 - (age - 14) * 0.26);
}

/** Le potentiel, sur l'échelle d'étoiles que la demande veut afficher. */
export function enEtoiles(potentiel: number): number {
  const brut = 0.5 + ((potentiel - 30) / (POTENTIEL_MAX - 30)) * 4.5;
  return Math.max(0.5, Math.min(5, Math.round(brut * 2) / 2));
}

/**
 * LE RAPPORT D'UN CLUB SUR UN JEUNE.
 *
 * ⚠️ LA FOURCHETTE CONTIENT PRESQUE TOUJOURS LA VÉRITÉ, MAIS PAS TOUJOURS.
 * « Mais attention : ton scout peut se tromper. Le "futur international" peut
 * finalement être moyen. » Deux mécanismes distincts s'en chargent, et il faut
 * les deux :
 *
 *   1. **ici**, un service faible se trompe pour de bon — la fourchette rate le
 *      vrai potentiel. La probabilité tombe à presque rien quand on paie ;
 *   2. **ailleurs** (`progresser`, lib/jeunes.ts), le potentiel lui-même est
 *      DYNAMIQUE : un rapport juste ne promet rien, parce qu'un potentiel 90
 *      finit à 75 s'il ne joue pas.
 *
 * Sans le second, il suffirait de payer un bon service pour connaître la fin de
 * l'histoire. Sans le premier, un petit club aurait une information vraie mais
 * vague, ce qui n'est pas la même chose qu'une information fausse.
 */
export function ficheDe(
  jeune: JeuneRepere,
  notes: NotesCentre,
  observation: Observation | undefined,
  clubObservateur: string,
): FicheDetection {
  const rng = graine(`detect#${clubObservateur}#${jeune.id}#${observation?.matchs ?? 0}#${observation?.entretien ? 1 : 0}`);
  const progres = progresDObservation(observation);

  // La largeur part du service de recrutement, s'élargit avec la JEUNESSE du
  // garçon, et se resserre avec les visites.
  // ⚠️ ET LA LARGEUR EST PLAFONNÉE. Sans ce plafond, un garçon de quatorze ans
  // vu par une cellule modeste ressortait à « 20-96 » : une fourchette qui
  // couvre toute l'échelle ne dit rien, ne peut pas se tromper, et rend la
  // différence entre un bon et un mauvais service invisible. Ce qui distingue
  // les deux services devient alors le TAUX D'ERREUR, ci-dessous, qui est une
  // information bien plus utile qu'une barre qui déborde.
  const depart = incertitudeDeDepart(notes.recrutement) * flouDeLAge(jeune.age);
  const demiLargeur = Math.max(1.5, Math.min(21, depart * (1 - progres * 0.82)));

  // Le centre de la fourchette est décalé, de moins en moins.
  const biaisMax = depart * 0.55 * (1 - progres);
  const biais = (rng() * 2 - 1) * biaisMax;

  // ⚠️ L'ERREUR FRANCHE est rare et se paie : elle décale le centre au-delà de
  // la demi-largeur, si bien que la vérité sort de la fourchette. Un service à
  // 20 se trompe une fois sur cinq, un service à 90 une fois sur cinquante.
  const partErreur = Math.max(0.02, 0.26 - notes.recrutement / 380) * (1 - progres * 0.7);
  const seTrompe = rng() < partErreur;
  const decalage = seTrompe ? (rng() < 0.5 ? -1 : 1) * demiLargeur * (1.05 + rng() * 0.5) : 0;

  // ⚠️ ON RAMÈNE LE CENTRE DANS L'ÉCHELLE, PUIS ON TRONQUE. Deux versions
  // antérieures ont échoué autrement :
  //
  //   · borner les deux extrémités séparément transformait un scout très
  //     optimiste en « 99-99 » — une certitude parfaite après zéro observation ;
  //   · DÉPLACER la fourchette entière la collait au plafond dès que le garçon
  //     était bon : mesuré, six fiches sur six affichaient exactement « 72-96 »,
  //     et le classement du rapport annuel n'avait plus rien pour départager.
  //
  // Ramener le centre laisse la largeur dire ce qu'elle a à dire, et deux
  // garçons différents ne rendent plus la même ligne.
  const centreBrut = jeune.potentielReel + biais + decalage;
  const centre = Math.max(24, Math.min(POTENTIEL_MAX - 4, centreBrut));
  const potentielBas = Math.max(20, Math.min(POTENTIEL_MAX - 2, Math.round(centre - demiLargeur)));
  const potentielHaut = Math.min(POTENTIEL_MAX, Math.max(potentielBas + 2, Math.round(centre + demiLargeur)));

  // ⚠️ LA NOTE DU JOUR SE VOIT, ELLE. On la lit sur un terrain en quatre-vingts
  // minutes ; c'est le POTENTIEL qui se devine. Une note aussi incertaine que le
  // potentiel rendrait le rapport illisible, et fausserait le classement.
  const flouNote = Math.max(0, 3.2 - notes.recrutement / 42) * (1 - progres * 0.85);
  const noteObservee = Math.max(10, Math.round(jeune.note + (rng() * 2 - 1) * flouNote));

  return {
    jeune,
    noteObservee,
    potentielBas,
    potentielHaut,
    etoilesBas: enEtoiles(potentielBas),
    etoilesHaut: enEtoiles(potentielHaut),
    confiance: Math.round(
      Math.min(100, 22 + progres * 58 + notes.recrutement * 0.22),
    ),
    matchs: observation?.matchs ?? 0,
    entretien: observation?.entretien ?? false,
  };
}

/**
 * CE QUE LA CELLULE RAMÈNE D'UNE SAISON DE DÉTECTION.
 *
 * ⚠️ ON NE REND PAS TOUT CE QUI EST À PORTÉE. Un réseau national voit seize
 * cents garçons : les déverser à l'écran, ce serait le « juste regarder une
 * base de données » que la demande écarte. La cellule fait son métier — elle
 * TRIE et elle ne remonte qu'une poignée de noms, d'autant plus juste qu'elle
 * est bien notée.
 *
 * ⚠️ ET ELLE TRIE SUR CE QU'ELLE CROIT, PAS SUR LA VÉRITÉ. Trier sur le
 * potentiel réel reviendrait à lui prêter la connaissance qu'on vient de lui
 * retirer : la meilleure pépite remonterait toujours en tête, quel que soit le
 * budget du service. C'est le même principe que `lib/recruteurs.ts` pour les
 * professionnels.
 */
export function rapportDeSaison(
  candidats: JeuneRepere[],
  notes: NotesCentre,
  observations: Record<string, Observation>,
  clubObservateur: string,
  combien: number,
): FicheDetection[] {
  const fiches = candidats.map((j) => ficheDe(j, notes, observations[j.id], clubObservateur));
  return fiches
    .sort((a, b) => {
      // ⚠️ ON TRIE SUR LE JOUEUR QU'IL DEVIENDRA, PAS SUR LA MARGE. Trier sur
      // (potentiel − note du jour) paraît juste — c'est ce que cherche un
      // recruteur — et c'est faux : la marge dépend surtout de l'ÂGE DU PIC du
      // poste. Un pilier de seize ans est très loin de son plafond (il perce à
      // vingt-six ans), un ailier du même âge en est déjà proche. Mesuré, le
      // rapport annuel du Stade Toulousain remontait **cinq piliers sur cinq**,
      // saison après saison — une cellule de recrutement qui ne trouve qu'un
      // seul poste n'est pas une cellule de recrutement.
      const ca = (a.potentielBas + a.potentielHaut) / 2;
      const cb = (b.potentielBas + b.potentielHaut) / 2;
      // La marge ne départage plus que deux profils de potentiel égal : à ce
      // moment-là, oui, on préfère celui qui a le plus à donner.
      return (cb - ca)
        || ((cb - b.noteObservee) - (ca - a.noteObservee));
    })
    .slice(0, combien);
}

/** Combien de dossiers une cellule peut suivre en une saison. */
export function dossiersParSaison(recrutement: number): number {
  return Math.max(3, Math.round(3 + recrutement / 11));
}

/**
 * COMBIEN DE DÉPLACEMENTS LA CELLULE PEUT FAIRE EN UNE SAISON.
 *
 * ⚠️ C'EST LA RESSOURCE RARE DU LOT, et elle doit le rester. Sans plafond, on
 * observerait dix fois chacun des cinquante dossiers dès la première saison :
 * toutes les fourchettes se refermeraient d'un coup, la détection deviendrait
 * un annuaire complet, et payer le service de recrutement n'aurait plus aucun
 * intérêt.
 */
export function deplacementsParSaison(reseau: number, recrutement: number): number {
  return Math.max(4, Math.round(4 + reseau / 14 + recrutement / 18));
}
