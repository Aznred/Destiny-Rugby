// LE VIVIER D'UNE LIGUE — le stock de cartes, tiré UNE FOIS à la création
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ LE VIVIER EST FINI, ET C'EST TOUTE L'IDÉE
// ═══════════════════════════════════════════════════════════════════════════
// « Dans une ligue donnée, un joueur ne peut exister qu'une seule fois. Si
// Dupont appartient à Colin RFC, personne d'autre ne peut avoir Dupont. Donc si
// quelqu'un ouvre un pack et obtient un OVR 91, il devient extrêmement
// précieux. Les autres doivent négocier avec lui. »
//
// Deux conséquences qu'il faut tenir des deux mains :
//
//   1. ON NE PREND PAS LES 6 306 PROS DU JEU. Avec le catalogue entier, les
//      packs sont une fontaine à stars : 26 joueurs à 88+ et 206 à 83-87
//      dorment dedans, et à 5 000 OVA le pack, l'économie ne tient pas une
//      soirée. Le vivier est CALIBRÉ SUR LA TAILLE DE LA LIGUE — une quarantaine
//      de cartes par club — avec une pyramide serrée en haut. À dix clubs, la
//      ligue entière contient DEUX joueurs à 88+. Ils ont un prénom, tout le
//      monde sait qui les a, et c'est exactement le sujet.
//
//   2. LE TIRAGE EST DÉTERMINISTE (graine + nombre de clubs). Le serveur peut
//      donc rejouer la création d'une ligue sans fabriquer un second monde, et
//      un banc de mesure peut vérifier la même ligue mille fois.
//
// ⚠️ ET LE VIVIER N'EST TIRÉ QU'UNE FOIS. Ensuite, la base est la vérité : le
// serveur range les cartes à la création et ne rappelle plus jamais ce fichier
// pour cette ligue-là. C'est ce qui met la ligue à l'abri d'un
// `node scripts/genMonde.cjs` — les données réelles peuvent être régénérées,
// les notes changer, des joueurs disparaître : les ligues en cours ne bougent
// pas d'un pouce.

import type { FamillePoste } from '../../types';
import { EFFECTIFS_REELS } from '../../data/effectifsReels';
import type { CarteJoueur, IdCarte } from './types';
import { rareteDeLaNote } from './rarete';
import { graine, melanger } from './aleatoire';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LA SOURCE — les vrais pros, dédoublonnés
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ PLANCHER À 55. En dessous, les effectifs réels contiennent 2 684 joueurs
 * qui ne jouent quasiment pas dans leur club : les faire entrer dans une ligue
 * entre potes reviendrait à remplir les packs de figurants. La dotation de
 * départ descend justement jusqu'à 55 et pas plus bas.
 */
const NOTE_PLANCHER = 55;

interface Source {
  nom: string;
  poste: FamillePoste;
  age: number;
  note: number;
  potentiel: number;
  nation: string;
}

let cacheSource: Source[] | null = null;

/**
 * Le catalogue dédoublonné, trié, mis en cache.
 *
 * ⚠️ DÉDOUBLONNÉ PAR NOM, et il le faut : les effectifs réels comptent
 * 6 306 lignes pour 6 278 noms — vingt-huit joueurs figurent dans deux clubs
 * (prêts, arrivées de fin de mercato, homonymes). Deux cartes « Sam SMITH »
 * dans une même ligue, ce serait indéfendable : personne ne saurait laquelle
 * il possède, et la promesse « un joueur = une carte » tomberait au premier
 * regard. On garde la mieux notée des deux.
 *
 * ⚠️ ET LE TRI EST FIGÉ (note décroissante, puis nom) : c'est lui qui rend le
 * tirage reproductible. `Object.values` suit l'ordre d'insertion des clubs, qui
 * dépend du générateur — s'y fier serait un déterminisme d'apparence.
 */
function catalogue(): Source[] {
  if (cacheSource) return cacheSource;
  const parNom = new Map<string, Source>();
  for (const effectif of Object.values(EFFECTIFS_REELS)) {
    for (const j of effectif) {
      if (j.note < NOTE_PLANCHER) continue;
      const dejaLa = parNom.get(j.nom);
      if (!dejaLa || j.note > dejaLa.note) {
        parNom.set(j.nom, {
          nom: j.nom, poste: j.poste, age: j.age,
          note: j.note, potentiel: Math.max(j.potentiel, j.note), nation: j.nation,
        });
      }
    }
  }
  cacheSource = [...parNom.values()].sort((a, b) => b.note - a.note || (a.nom < b.nom ? -1 : 1));
  return cacheSource;
}

/** Le catalogue complet, pour les bancs de mesure. */
export function catalogueDisponible(): readonly Source[] {
  return catalogue();
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LA PYRAMIDE — combien de cartes de chaque niveau, PAR CLUB
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ CES CHIFFRES SONT LE RÉGULATEUR DE TOUTE L'ÉCONOMIE. Ils décident de la
// rareté d'un 85, donc de son prix, donc de ce qu'un pack peut sortir, donc de
// l'intérêt d'aller négocier avec un pote plutôt que d'acheter des packs. Les
// retoucher sans relancer `npm run verify:ligue` n'a aucun sens.
//
// Lecture : à dix clubs, la ligue contient 2 joueurs à 88+, 8 entre 83 et 87,
// et 445 cartes en tout. La dotation en distribue 300 ; il en reste 145 dans le
// vivier libre, pour les packs et le marché.

export interface BandeVivier {
  min: number;
  max: number;
  /** Cartes par club. Peut être fractionnaire — l'arrondi se fait au total. */
  parClub: number;
}

export const PYRAMIDE: readonly BandeVivier[] = [
  { min: 88, max: 100, parClub: 0.2 },
  { min: 83, max: 87, parClub: 0.8 },
  { min: 80, max: 82, parClub: 1.0 },
  { min: 75, max: 79, parClub: 4.5 },
  { min: 70, max: 74, parClub: 11 },
  { min: 65, max: 69, parClub: 16 },
  { min: 55, max: 64, parClub: 11 },
] as const;

/**
 * LES QUOTAS DE POSTE D'UN EFFECTIF DE 30.
 *
 * ⚠️ CE N'EST PAS DE LA DÉCORATION. Un tirage à plat donnerait, une fois sur
 * trois, un effectif sans talonneur ou avec sept ailiers : il n'y aurait alors
 * plus de composition possible, et la seule issue serait d'aller mendier un
 * numéro 2 — pas de négocier, de mendier. La différence entre les deux, c'est
 * qu'on choisit la seconde.
 *
 * Cinq piliers pour trois talonneurs : c'est la réalité d'une feuille de match
 * (deux piliers titulaires, deux sur le banc, un talonneur et son doublon).
 */
export const QUOTAS_POSTE: Readonly<Record<FamillePoste, number>> = {
  pilier: 5,
  talonneur: 3,
  deuxieme_ligne: 4,
  troisieme_ligne: 5,
  demi_melee: 2,
  demi_ouverture: 2,
  centre: 4,
  ailier: 3,
  arriere: 2,
};

/** Taille d'un effectif de départ. La somme des quotas, par construction. */
export const TAILLE_EFFECTIF = Object.values(QUOTAS_POSTE).reduce((a, b) => a + b, 0);

const FAMILLES = Object.keys(QUOTAS_POSTE) as FamillePoste[];

/**
 * En dessous de ce nombre de cartes, on ne stratifie plus par poste.
 *
 * ⚠️ Répartir quatre cartes à 88+ sur neuf postes n'a pas de sens : on
 * obtiendrait « 0,44 pilier ». Et surtout, ce n'est pas ainsi qu'on vit une
 * star — on ne choisit pas son numéro 90 par poste, on l'a ou on ne l'a pas.
 */
const SEUIL_STRATIFICATION = 9;

// ═══════════════════════════════════════════════════════════════════════════
// 3. LE TIRAGE
// ═══════════════════════════════════════════════════════════════════════════

/** Combien de cartes par bande pour un nombre de clubs donné. */
export function effectifsDeBande(clubs: number): number[] {
  return PYRAMIDE.map((b) => Math.max(1, Math.round(b.parClub * clubs)));
}

/** Taille totale du vivier d'une ligue. */
export function tailleVivier(clubs: number): number {
  return effectifsDeBande(clubs).reduce((a, b) => a + b, 0);
}

/**
 * Le vivier complet d'une ligue : toutes les cartes, sans propriétaire.
 *
 * @param graineLigue la graine de la ligue — deux appels identiques rendent
 *        exactement le même vivier, dans le même ordre, avec les mêmes ids.
 * @param clubs le nombre de clubs, qui calibre la pyramide.
 */
export function vivierDeLaLigue(graineLigue: string, clubs: number): CarteJoueur[] {
  const source = catalogue();
  const quotas = effectifsDeBande(clubs);
  // ⚠️ Un joueur pris dans une bande ne doit pas pouvoir l'être dans une autre :
  // les bandes ne se chevauchent pas, mais le rattrapage plus bas, si.
  const pris = new Set<string>();
  const retenus: Source[] = [];

  for (let i = 0; i < PYRAMIDE.length; i++) {
    const bande = PYRAMIDE[i];
    const voulu = quotas[i];
    const disponibles = source.filter(
      (j) => !pris.has(j.nom) && j.note >= bande.min && j.note <= bande.max,
    );
    const rng = graine(`vivier|${graineLigue}|${clubs}|${bande.min}`);
    const choisis = voulu >= SEUIL_STRATIFICATION
      ? tirageStratifie(disponibles, voulu, rng)
      : melanger(disponibles, rng).slice(0, voulu);
    for (const j of choisis) { pris.add(j.nom); retenus.push(j); }

    // ⚠️ RATTRAPAGE : si la bande est plus pauvre que le quota (ça n'arrive
    // pas avec les données actuelles, mais une régénération peut tout changer),
    // on complète avec la bande IMMÉDIATEMENT INFÉRIEURE plutôt que de rendre
    // un vivier trop court. Un vivier incomplet, c'est une dotation qui échoue
    // à la création de la ligue — le pire moment possible.
    if (choisis.length < voulu) {
      const manque = voulu - choisis.length;
      const secours = source.filter((j) => !pris.has(j.nom) && j.note < bande.min);
      for (const j of melanger(secours, rng).slice(0, manque)) {
        pris.add(j.nom); retenus.push(j);
      }
    }
  }

  // Ordre final figé : note décroissante. C'est aussi l'ordre des ids, ce qui
  // rend un vivier lisible à l'œil dans un banc de mesure.
  retenus.sort((a, b) => b.note - a.note || (a.nom < b.nom ? -1 : 1));
  return retenus.map((j, index) => ({
    id: identifiantCarte(index),
    nom: j.nom,
    poste: j.poste,
    nation: j.nation,
    age: j.age,
    note: j.note,
    potentiel: j.potentiel,
    rarete: rareteDeLaNote(j.note),
    proprietaire: null,
  }));
}

/**
 * Tire `voulu` cartes en respectant les proportions de postes d'un effectif.
 *
 * Le reste (arrondis, postes en pénurie) est complété sans contrainte de poste :
 * mieux vaut un vivier légèrement déséquilibré qu'un vivier trop court.
 */
function tirageStratifie(disponibles: Source[], voulu: number, rng: () => number): Source[] {
  const choisis: Source[] = [];
  const pris = new Set<string>();
  for (const famille of FAMILLES) {
    const part = Math.round((QUOTAS_POSTE[famille] / TAILLE_EFFECTIF) * voulu);
    const duPoste = melanger(disponibles.filter((j) => j.poste === famille), rng);
    for (const j of duPoste.slice(0, part)) { pris.add(j.nom); choisis.push(j); }
  }
  if (choisis.length < voulu) {
    const reste = melanger(disponibles.filter((j) => !pris.has(j.nom)), rng);
    for (const j of reste.slice(0, voulu - choisis.length)) choisis.push(j);
  }
  // Un arrondi par excès peut dépasser : on coupe, sans préférence de poste.
  return choisis.slice(0, voulu);
}

/** L'identifiant d'une carte à partir de son rang dans le vivier. */
export function identifiantCarte(index: number): IdCarte {
  return `c${String(index + 1).padStart(4, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. LECTURES UTILES
// ═══════════════════════════════════════════════════════════════════════════

/** Les cartes que personne ne possède — c'est là que puisent les packs. */
export function cartesLibres(vivier: readonly CarteJoueur[]): CarteJoueur[] {
  return vivier.filter((c) => c.proprietaire === null && !c.verrouillee);
}

/** L'effectif d'un club. */
export function cartesDuClub(vivier: readonly CarteJoueur[], club: string): CarteJoueur[] {
  return vivier.filter((c) => c.proprietaire === club);
}

/**
 * La force d'un effectif : moyenne pondérée des 23 meilleures notes.
 *
 * ⚠️ 23, PAS 30, ET PONDÉRÉE. Une moyenne à plat récompense la profondeur d'un
 * effectif au même titre que le XV de départ — or c'est le XV qui joue. Le
 * poids décroît du premier au vingt-troisième, comme dans `forceEffectif`
 * (lib/effectif.ts) : les deux barèmes doivent rester lisibles ensemble, même
 * s'ils ne partagent pas leur code (celui-ci doit tourner côté serveur).
 */
export function forceDeLEffectif(cartes: readonly CarteJoueur[]): number {
  const notes = cartes.map((c) => c.note).sort((a, b) => b - a).slice(0, 23);
  if (!notes.length) return 0;
  let total = 0;
  let poids = 0;
  for (let i = 0; i < notes.length; i++) {
    const p = 1 - i * 0.03;
    total += notes[i] * p;
    poids += p;
  }
  return Math.round((total / poids) * 10) / 10;
}
