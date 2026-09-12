import type { FamillePoste, JeuneForme, Joueur, PosteId, TransfertAnnonce } from '../types.js';
import { POSTE_PAR_ID, posteDepuisFamille } from '../data/rugby.js';
import { COMPETITIONS, competitionDuClub, NOTE_PAR_NIVEAU } from '../data/clubs.js';
import { EFFECTIFS_REELS, NOTE_CLUB_REEL } from '../data/effectifsReels.js';
import { EFFECTIFS_AMATEURS, POSTES_AMATEURS } from '../data/amateurs.js';
import {
  effectifNouveau, NOTE_CLUB_NOUVEAU, type JoueurNouveau,
} from '../data/nouvellesLigues.js';
import { mercatoReel, type RecrueReelle } from './mercato.js';
import { generationDuClub } from './generations.js';
import { noteJoueurRevalorisee } from './evaluationJoueurReel.js';

// Génération DÉTERMINISTE de l'effectif d'un club : même club + même saison
// => même équipe. Les joueurs vieillissent d'un an par saison ; passé leur âge
// de retraite, ils sont remplacés par un « regen » (jeune généré).
// NB : prêt à être remplacé par un import CSV réel (voir CLAUDE.md).

export interface Coequipier {
  /** Sorti du centre de formation du club (🎓 à l'écran). */
  duCentre?: boolean;
  /**
   * Ce joueur ne suit PAS le cycle de génération de son nouveau club.
   *
   * ⚠️ C'EST CE QUI FAIT QUE LA NOTE DU MARCHÉ EST LA VRAIE NOTE. Le bonus de
   * `generationDuClub` s'applique à tout l'effectif, donc il s'appliquait aussi
   * à une recrue — qui perdait au passage le bonus de son ANCIEN club et
   * héritait de celui du nouveau. Mesuré à la saison 3 sur 70 clubs : de −3,5
   * à +5,2, soit près de NEUF points d'écart possible. Un joueur affiché 74 sur
   * le marché arrivait à 65, sans que rien ne l'explique.
   *
   * Une génération, c'est une promotion de joueurs que le club a vue grandir
   * ensemble ; un trentenaire acheté cet été n'en fait pas partie. Il garde
   * donc la note sur laquelle on l'a acheté.
   */
  horsGeneration?: boolean;
  id: string;
  nom: string;
  poste: PosteId;
  age: number;
  note: number; // note générale À CET ÂGE
  potentiel: number; // note visée au pic de carrière (27 ans)
  /** Statistique spécifique utilisée lorsque le jeu choisit automatiquement le buteur. */
  jeuAuPied?: number;
  nation: string; // drapeau + nom (ex. « 🇫🇯 Fidji »)
  regen: boolean; // true si ce joueur a remplacé un retraité
}

// Un joueur est un « espoir » tant qu'il lui reste au moins 3 points de marge.
export function estEspoir(j: Pick<Coequipier, 'note' | 'potentiel' | 'age'>): boolean {
  return j.age < 27 && j.potentiel - j.note >= 3;
}

// …et il décline une fois passé l'âge de déclin, potentiel atteint.
export function estDeclinant(j: Pick<Coequipier, 'age'>): boolean {
  return j.age > AGE_DECLIN;
}

// Nationalités étrangères plausibles (avec les BONS drapeaux), et prénoms/noms
// typés pour rendre les joueurs crédibles.
const NATIONS_ETRANGERES: { nation: string; noms: string[] }[] = [
  { nation: '🇫🇯 Fidji', noms: ['Tuisova', 'Radradra', 'Nakosi', 'Botia', 'Waqaniburotu'] },
  { nation: '🇬🇪 Géorgie', noms: ['Gorgadze', 'Kubriashvili', 'Abzhandadze', 'Lobzhanidze', 'Tabutsadze'] },
  { nation: '🇼🇸 Samoa', noms: ['Taulagi', 'Alaalatoa', 'Fifita', 'Tuilagi', 'Leiataua'] },
  { nation: '🇹🇴 Tonga', noms: ['Takulua', 'Piutau', 'Fekitoa', 'Veainu', 'Halaifonua'] },
  { nation: '🇿🇦 Afrique du Sud', noms: ['Botha', 'Du Plessis', 'Van der Merwe', 'Steyn', 'Kriel'] },
  { nation: '🇳🇿 Nouvelle-Zélande', noms: ['Williams', 'Ioane', 'Tuipulotu', 'McKenzie', 'Perenara'] },
  { nation: '🇦🇺 Australie', noms: ['Cooper', 'Hodge', 'Kerevi', 'Simmons', 'Paisami'] },
  { nation: '🇦🇷 Argentine', noms: ['Sánchez', 'Boffelli', 'Matera', 'Petti', 'Chocobares'] },
  { nation: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Angleterre', noms: ['Ashton', 'Hughes', 'Spencer', 'Atkinson', 'Ford'] },
  { nation: '🇮🇹 Italie', noms: ['Capuozzo', 'Garbisi', 'Polledri', 'Negri', 'Menoncello'] },
  { nation: '🇷🇴 Roumanie', noms: ['Radu', 'Popescu', 'Ionescu', 'Stancu', 'Munteanu'] },
  { nation: '🇵🇹 Portugal', noms: ['Marta', 'Storti', 'Bettencourt', 'Appleton', 'Cardoso'] },
];

// Part de joueurs français selon le niveau (0 = élite mondiale, 7 = Fédérale 3).
const PART_FRANCAIS: Record<number, number> = {
  0: 0.5, 1: 0.55, 2: 0.65, 3: 0.75, 4: 0.82, 5: 0.88, 6: 0.93, 7: 0.96,
};

const PRENOMS = [
  'Léo', 'Hugo', 'Gabriel', 'Louis', 'Arthur', 'Jules', 'Adam', 'Maël',
  'Lucas', 'Noah', 'Liam', 'Sacha', 'Paul', 'Antoine', 'Baptiste', 'Romain',
  'Thibault', 'Mathis', 'Enzo', 'Théo', 'Nathan', 'Tom', 'Clément', 'Quentin',
  'Maxime', 'Alexandre', 'Pierre', 'Damien', 'Florian', 'Julien', 'Kevin',
  'Bastien', 'Corentin', 'Dorian', 'Erwan', 'Fabien', 'Gaël', 'Iban', 'Peyo',
];

const NOMS = [
  'Dupont', 'Martin', 'Bernard', 'Etcheverry', 'Larrieu', 'Cazenave',
  'Duprat', 'Lacroix', 'Barrère', 'Sallefranque', 'Mora', 'Ibañez',
  'Castagnède', 'Dourthe', 'Bru', 'Lamerat', 'Baradat', 'Sempé', 'Puyo',
  'Etchegaray', 'Harinordoquy', 'Elissalde', 'Marchand', 'Cros', 'Jelonch',
  'Barassi', 'Costes', 'Vergnes', 'Sansus', 'Bielle', 'Serin', 'Bastareaud',
  'Guirado', 'Picamoles', 'Vahaamahina', 'Ollivon', 'Alldritt', 'Penaud',
  'Fickou', 'Villière', 'Baille', 'Aldegheri', 'Taofifenua', 'Lauret',
  'Danty', 'Jaminet', 'Buros', 'Lucu', 'Moefana', 'Depoortère',
];

// Composition type d'un groupe : le XV de départ, plus une doublure aux postes
// clés (24 joueurs). Les numéros suivent le maillot, de 1 à 15.
const COMPOSITION: [PosteId, number][] = [
  ['pilier_gauche', 2],
  ['talonneur', 2],
  ['pilier_droit', 2],
  ['deuxieme_ligne_g', 2],
  ['deuxieme_ligne_d', 1],
  ['troisieme_aile_g', 2],
  ['troisieme_aile_d', 1],
  ['numero_8', 2],
  ['demi_melee', 2],
  ['demi_ouverture', 2],
  ['ailier_gauche', 1],
  ['premier_centre', 2],
  ['deuxieme_centre', 1],
  ['ailier_droit', 1],
  ['arriere', 1],
];

// PRNG mulberry32 seedé par une chaîne.
function graine(s: string): () => number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Numéro de maillot d'un joueur réel : les données ne donnent que la famille
// (« pilier »), on lui attribue un numéro concret, toujours le même.
function posteConcret(famille: FamillePoste, cle: string): PosteId {
  const rng = graine('poste#' + cle);
  return posteDepuisFamille(famille, Math.floor(rng() * 1000));
}

function genJoueur(club: string, slot: number, generation: number, saison: number, noteBase: number, niveau: number): Coequipier {
  const rng = graine(`${club}#${slot}#g${generation}`);
  const prenom = PRENOMS[Math.floor(rng() * PRENOMS.length)];
  let nom = NOMS[Math.floor(rng() * NOMS.length)];
  const ageDebut = generation === 0 ? 19 + Math.floor(rng() * 14) : 19 + Math.floor(rng() * 3);
  const retraite = 33 + Math.floor(rng() * 4); // 33-36 ans
  const talent = Math.floor(rng() * 13) - 6; // -6..+6 autour de la division

  // Nationalité : majorité de Français, part d'étrangers croissante avec le niveau
  let nation = '🇫🇷 France';
  if (rng() > (PART_FRANCAIS[niveau] ?? 0.9)) {
    const etr = NATIONS_ETRANGERES[Math.floor(rng() * NATIONS_ETRANGERES.length)];
    nation = etr.nation;
    nom = etr.noms[Math.floor(rng() * etr.noms.length)];
  }

  // Âge courant compte tenu de la saison (les generations précédentes ont vieilli)
  let age = ageDebut + (saison - 1);
  // Cette fonction n'est appelée que si le joueur est encore actif (voir effectifDuClub)
  age = Math.min(age, retraite);

  // Note « au pic » du joueur, puis note effective à son âge actuel.
  const potentielBase = Math.max(30, Math.min(94, noteBase + talent + courbeAge(AGE_PIC)));
  const vitesseDeclin = rng();
  const prime = bonusPepite(club + '#' + slot + '#g' + generation, ageDebut);
  const potentiel = prime > 0
    ? Math.max(potentielBase, Math.min(plafondPepite(niveau), potentielBase + prime))
    : potentielBase;

  // ⚠️ ICI LE POTENTIEL COMMANDE DIRECTEMENT LA NOTE DU JOUR, et c'est ce qui
  // interdit de l'augmenter naïvement : la note de référence EST le potentiel
  // (`noteALAge(potentiel, AGE_PIC, potentiel, …)`), si bien qu'avant 27 ans
  // elle vaut `potentiel − (27 − âge)`. Ajouter +30 de potentiel ajouterait
  // +30 à la note du jour et inflaterait toute la division.
  //
  // On RÉANCRE donc la courbe sur la note de départ calculée SANS la pépite :
  // le joueur démarre exactement là où il démarrait, et ne progresse plus vers
  // le potentiel ordinaire mais vers le sien. Les deux formes sont d'ailleurs
  // rigoureusement identiques en l'absence de pépite — l'interpolation retombe
  // sur une pente de 1 point par an, et `declin` est nul avant 31 ans. La
  // branche n'existe que pour rendre l'intention lisible.
  let note: number;
  if (prime > 0) {
    const noteDepart = noteALAge(potentielBase, AGE_PIC, potentielBase, ageDebut, vitesseDeclin);
    note = noteALAge(noteDepart, ageDebut, potentiel, age, vitesseDeclin);
  } else {
    note = noteALAge(potentiel, AGE_PIC, potentiel, age, vitesseDeclin);
  }

  return {
    id: `${club}-${slot}-${generation}`,
    nom: `${prenom} ${nom}`,
    poste: 'pilier_gauche', // corrigé par l'appelant
    age,
    note,
    potentiel,
    nation,
    regen: generation > 0,
  };
}

// ---------------------------------------------------------------------------
// PROGRESSION / DÉCLIN
// Chaque joueur a un POTENTIEL : la note qu'il atteint à son pic (27 ans).
// Avant le pic il progresse d'année en année vers ce potentiel ; après l'âge
// de déclin il perd des points, de plus en plus vite. C'est ce qui fait qu'un
// espoir de 20 ans noté 65 peut valoir 82 six saisons plus tard — et qu'un
// cadre de 33 ans s'éteint.
// ---------------------------------------------------------------------------
export const AGE_PIC = 27;
export const AGE_DECLIN = 31;

// Déclin cumulé à un âge donné (0 avant l'âge de déclin, de plus en plus lourd
// ensuite). `vitesse` (0-1) module la rapidité de la chute.
function declin(age: number, vitesse: number): number {
  if (age <= AGE_DECLIN) return 0;
  return (0.8 + vitesse * 1.4) * (age - AGE_DECLIN) + Math.max(0, age - 34) * 0.8;
}

// Note d'un joueur à un âge donné, connaissant sa note de référence à
// `ageRef` et son potentiel. `vitesse` (0-1) module la rapidité du déclin.
// NB : le déclin est compté RELATIVEMENT à `ageRef` — la note d'un joueur de
// 34 ans à l'âge où on l'a mesuré doit être exactement celle de la base, et ne
// commencer à baisser qu'à partir de la saison suivante.
export function noteALAge(
  noteRef: number,
  ageRef: number,
  potentiel: number,
  age: number,
  vitesseDeclin: number,
): number {
  let note: number;
  if (age >= AGE_PIC) {
    note = Math.max(noteRef, potentiel);
  } else if (ageRef >= AGE_PIC) {
    // Cas rare (on remonte le temps) : on redescend linéairement vers -1/an.
    note = noteRef - (AGE_PIC - age);
  } else {
    // Progression linéaire de la note de référence jusqu'au potentiel à 27 ans.
    const restant = AGE_PIC - ageRef;
    const parAn = restant > 0 ? (potentiel - noteRef) / restant : 0;
    note = noteRef + parAn * (age - ageRef);
  }

  note -= declin(age, vitesseDeclin) - declin(ageRef, vitesseDeclin);
  return Math.round(Math.max(35, Math.min(97, note)));
}

// Courbe d'âge simple, conservée pour la génération procédurale.
function courbeAge(age: number): number {
  return Math.round(4 - Math.abs(Math.min(age, 34) - 27) * 0.9);
}

// ═══════════════════════════════════════════════════════════════════════════
// LES PÉPITES — un gros potentiel peut naître n'importe où
// ═══════════════════════════════════════════════════════════════════════════
// Demande explicite : « des recruteurs pour trouver les pépites ; il peut aussi
// y avoir des gros potentiels dans les petites ligues ».
//
// ⚠️ IL N'Y EN AVAIT AUCUNE, ET C'EST MESURÉ. Le talent inventé est un tirage
// UNIFORME de ±7 autour de la note de la division : la marge potentiel − note
// plafonnait donc à 9 points dans TOUTES les divisions amateurs, le meilleur
// espoir de Régionale 3 passant de 34 à 39 en huit saisons. Un recruteur envoyé
// chercher des pépites serait rentré bredouille à chaque fois — non par
// malchance, mais parce que la loi de tirage n'en produit aucune.
//
// Le joueur incarné, lui, a une queue longue depuis toujours (`creerJoueur` :
// gen + 18 + rand^1,5 × 44). C'est elle qu'on rend au reste du monde.
//
// ⚠️ TROIS GARDE-FOUS, ET C'EST GRÂCE À EUX QUE RIEN D'AUTRE NE BOUGE.
//
// 1. GRAINE SÉPARÉE. `graine()` est une fermeture à état : seuls le NOMBRE et
//    l'ORDRE des appels déterminent la suite. Tirer la pépite dans le flux
//    existant décalerait l'âge, la retraite, la nationalité et la note de TOUS
//    les joueurs générés du jeu. `graine('pepite#…')` ne consomme rien.
// 2. ON N'ÉCRASE QUE `potentiel`, JAMAIS LA NOTE DU JOUR. La note de la saison
//    1 est démontrablement indépendante du potentiel aux deux sites (voir les
//    commentaires sur place) : la force des effectifs, les classements, les
//    montées et l'étalonnage des divisions ne bougent pas d'un point.
// 3. RÉSERVÉ AUX JEUNES (`AGE_PEPITE`). Un potentiel qu'on n'a plus le temps
//    d'atteindre n'est pas une pépite, c'est un chiffre décoratif — et il
//    ferait mentir la marge sur laquelle les recruteurs classent leurs cibles.
export const AGE_PEPITE = 23;
/** Part de jeunes qui naissent avec une marge hors norme. */
export const PART_PEPITE = 0.012;

/**
 * Le supplément de potentiel d'une pépite, ou 0. La loi est très penchée : la
 * plupart des élus sont de bons espoirs (+14 à +22), une poignée sont des
 * talents de génération. Sans cette pente, « pépite » désignerait la moitié
 * d'une classe d'âge et ne voudrait plus rien dire.
 */
function bonusPepite(cle: string, ageRef: number): number {
  if (ageRef > AGE_PEPITE) return 0;
  const rng = graine('pepite#' + cle);
  if (rng() >= PART_PEPITE) return 0;
  return 14 + Math.floor(rng() ** 1.7 * 34);
}

/**
 * Le plafond d'une pépite, RELATIF À SON ÉTAGE.
 *
 * ⚠️ UN PLAFOND ABSOLU NE MARCHE PAS, et c'est mesuré : à 94, la première
 * mesure a sorti un joueur de Fédérale 2 qui culminait à 95 — meilleur que
 * n'importe qui en Top 14, dans un club de sixième division. Le monde ne s'en
 * remet pas, et rien ne l'en sortirait : le jeu ne fait pas monter un bon
 * joueur de club en club, il ne connaît que le mercato circulaire de sa
 * division. La pépite resterait donc en Fédérale 2 à 95, pour toujours.
 *
 * Trente-deux points au-dessus de la note de sa division, c'est environ trois
 * étages : un gamin de Régionale 3 peut devenir un joueur de Nationale (62),
 * un espoir de Fédérale 2 un joueur de Pro D2 (79), un jeune de Nationale 2
 * une star du Top 14 (90). C'est exactement l'histoire demandée, et elle
 * s'arrête là où elle cesserait d'être croyable.
 */
export const MARGE_PEPITE = 32;
export function plafondPepite(niveau: number): number {
  return Math.min(94, (NOTE_PAR_NIVEAU[niveau] ?? 50) + MARGE_PEPITE);
}

// ---------------------------------------------------------------------------
// LA NOTE D'UN CLUB AMATEUR
// ---------------------------------------------------------------------------
// ⚠️ Retour de jeu : « les clubs de Nationale 2 à Régionale 3 n'ont pas leur
// générale marquée dans la section Clubs ». Elle n'y était pas parce qu'elle
// n'existait pas : TOUS les clubs d'un étage partageaient `NOTE_PAR_NIVEAU`,
// donc afficher la note revenait à répéter le niveau de la division sur les
// 512 cartes de la Fédérale 3 — l'atlas préférait ne rien montrer.
//
// Les sources amateurs (rugbyamateur.fr) ne donnent ni classement ni niveau :
// il n'y a rien à recopier. On TIRE donc la note du club, une fois pour toutes,
// à partir de son nom — comme on tire déjà l'âge et la note de ses joueurs
// (`effectifAmateur`). C'est déterministe : le même club a toujours la même
// note, aujourd'hui et dans douze saisons, sans rien sauvegarder.
//
// L'étalement (±4) est volontairement ÉTROIT et la loi TRIANGULAIRE (deux
// tirages moyennés) : la hiérarchie des étages ne doit jamais se brouiller —
// le meilleur club de Régionale 1 reste sous le pire club de Fédérale 3 — mais
// à l'intérieur d'une poule, on distingue enfin celui qui vise la montée de
// celui qui lutte pour rester.
const ETALEMENT_AMATEUR = 4;

export function noteAmateur(nomClub: string, niveau: number): number {
  const base = NOTE_PAR_NIVEAU[niveau] ?? 45;
  const rng = graine(`noteClub#${nomClub}`);
  const tirage = (rng() + rng()) / 2; // loi triangulaire, centrée
  return Math.round(base + (tirage * 2 - 1) * ETALEMENT_AMATEUR);
}

// Note générale d'un club : la vraie note issue des stats 25-26 si on l'a
// (Top 14), celle des nouvelles ligues ensuite, sinon celle qu'on lui tire.
export function noteDuClub(nomClub: string): number {
  const reelle = NOTE_CLUB_REEL[nomClub];
  if (reelle !== undefined) return reelle;
  // Les nouvelles ligues ont leur propre table, calculée sur leur classement
  // réel (voir scripts/genNouvellesLigues.cjs).
  const nouvelle = NOTE_CLUB_NOUVEAU[nomClub];
  if (nouvelle !== undefined) return nouvelle;
  const niveau = competitionDuClub(nomClub)?.niveau ?? 6;
  return noteAmateur(nomClub, niveau);
}

// Effectif RÉEL (Top 14 2025-26) vieilli jusqu'à la saison demandée : les
// joueurs prennent un an par saison, et sont remplacés par un regen une fois
// leur âge de retraite atteint.
function effectifReel(nomClub: string, saison: number, niveau: number): Coequipier[] {
  const noteBase = NOTE_CLUB_REEL[nomClub] ?? NOTE_PAR_NIVEAU[niveau] ?? 50;
  return EFFECTIFS_REELS[nomClub].map((reel, i) => {
    const rngRetraite = graine(`reel#${nomClub}#${reel.nom}`);
    // 33-37 ans, mais jamais avant l'âge qu'il a en 2025-26 : à la saison 1
    // l'effectif affiché doit être l'effectif réel, sans aucun regen.
    const retraite = Math.max(reel.age, 33 + Math.floor(rngRetraite() * 5));
    const vitesseDeclin = rngRetraite();
    const age = reel.age + (saison - 1);
    const noteReference = noteJoueurRevalorisee(reel.nom, reel.note);
    const potentielReference = Math.max(noteReference, reel.potentiel);

    if (age <= retraite) {
      return {
        id: `${nomClub}-reel-${i}`,
        nom: reel.nom,
        poste: posteConcret(reel.poste, nomClub + reel.nom),
        age,
        // La note de l'export est celle de 2025-26 : le joueur progresse vers
        // son potentiel jusqu'à 27 ans, puis décline.
        note: noteALAge(noteReference, reel.age, potentielReference, age, vitesseDeclin),
        potentiel: potentielReference,
        nation: reel.nation,
        regen: false,
      };
    }

    // Le joueur a raccroché : générations successives de remplaçants.
    const generation = Math.max(1, Math.ceil((age - retraite) / 15));
    const j = genJoueur(nomClub, 1000 + i, generation, ((age - retraite - 1) % 15) + 1, noteBase, niveau);
    j.id = `${nomClub}-regen-${i}-${generation}`;
    j.poste = posteConcret(reel.poste, nomClub + reel.nom);
    // Identité du regen : prénom et nom empruntés à l'effectif RÉEL du club,
    // sinon un espoir de Kintetsu s'appellerait « Léo Etcheverry ».
    const rngNom = graine(`regen#${nomClub}#${i}#${generation}`);
    const source = EFFECTIFS_REELS[nomClub];
    const prenom = source[Math.floor(rngNom() * source.length)].nom.split(' ')[0];
    const parrain = source[Math.floor(rngNom() * source.length)];
    j.nom = `${prenom} ${parrain.nom.split(' ').slice(1).join(' ')}`.trim();
    j.nation = parrain.nation;
    return j;
  });
}

// ---------------------------------------------------------------------------
// EFFECTIFS DES NOUVELLES LIGUES (Espagne, Italie, Géorgie, Galles, Pologne…)
//
// Les données de `sources/competitions/ligues/` donnent les clubs et leurs classements, jamais
// les joueurs : `scripts/genNouvellesLigues.cjs` en fabrique un effectif de 30
// joueurs avec des noms du pays et une part d'étrangers. Ils vieillissent,
// progressent vers leur potentiel et laissent la place à des regens exactement
// comme les joueurs réels — c'est la même mécanique que `effectifReel`.
// ---------------------------------------------------------------------------
function effectifDesNouvellesLigues(
  nomClub: string, saison: number, source: JoueurNouveau[],
): Coequipier[] {
  const niveau = competitionDuClub(nomClub)?.niveau ?? 5;
  const noteBase = NOTE_CLUB_NOUVEAU[nomClub] ?? NOTE_PAR_NIVEAU[niveau] ?? 45;

  return source.map((reel, i) => {
    const rng = graine(`nouveau#${nomClub}#${reel.nom}#${i}`);
    // Même règle que pour les effectifs réels : jamais de retraite avant l'âge
    // de départ, sinon la saison 1 n'afficherait pas l'effectif annoncé.
    const retraite = Math.max(reel.age, 33 + Math.floor(rng() * 5));
    const vitesseDeclin = rng();
    const age = reel.age + (saison - 1);
    const poste = posteConcret(reel.poste, nomClub + reel.nom);

    if (age <= retraite) {
      return {
        id: `${nomClub}-nl-${i}`,
        nom: reel.nom,
        poste,
        age,
        note: noteALAge(reel.note, reel.age, reel.potentiel, age, vitesseDeclin),
        potentiel: reel.potentiel,
        nation: reel.nation,
        regen: false,
      };
    }

    // Retraité : un jeune du cru le remplace, avec un nom du même vivier — un
    // espoir de Batumi ne s'appelle pas « Léo Etcheverry ».
    const generation = Math.max(1, Math.ceil((age - retraite) / 15));
    const j = genJoueur(nomClub, 4000 + i, generation, ((age - retraite - 1) % 15) + 1, noteBase, niveau);
    j.id = `${nomClub}-nl-regen-${i}-${generation}`;
    j.poste = poste;
    const rngNom = graine(`regennl#${nomClub}#${i}#${generation}`);
    const prenom = source[Math.floor(rngNom() * source.length)].nom.split(' ')[0];
    const parrain = source[Math.floor(rngNom() * source.length)];
    j.nom = `${prenom} ${parrain.nom.split(' ').slice(1).join(' ')}`.trim();
    j.nation = parrain.nation;
    return j;
  });
}

// ---------------------------------------------------------------------------
// EFFECTIFS FFR (Nationale → Régionale 3)
// La base Mon Club House donne les 73 999 licenciés masculins de rugby
// compétition. Elle ne fournit ni âge ni poste pour les nouveaux venus : le
// poste est réparti de façon équilibrée et l'âge est tiré de façon déterministe
// (seed = club + nom). Les quelques postes déjà connus sont conservés.
// ---------------------------------------------------------------------------
interface JoueurAmateur { nom: string; poste: FamillePoste | null }

const cacheAmateur = new Map<string, JoueurAmateur[]>();

function listeAmateur(nomClub: string): JoueurAmateur[] {
  const memo = cacheAmateur.get(nomClub);
  if (memo) return memo;
  const liste = EFFECTIFS_AMATEURS[nomClub].split('~').map((entree) => {
    const [nom, idx] = entree.split('|');
    const poste = idx === '' || idx === undefined ? null : (POSTES_AMATEURS[Number(idx)] as FamillePoste);
    return { nom, poste: poste ?? null };
  });
  cacheAmateur.set(nomClub, liste);
  return liste;
}

// Poste des joueurs dont la source ne dit rien (« N/A ») : réparti de façon
// déterministe sur la composition type, pour ne pas se retrouver avec un
// effectif sans talonneur.
const POSTES_ROTATION: PosteId[] = COMPOSITION.flatMap(([p, n]) => Array<PosteId>(n).fill(p));

function effectifAmateur(nomClub: string, saison: number, niveau: number): Coequipier[] {
  // ⚠️ La note du CLUB, pas celle de la division : c'est ce qui fait qu'un
  // effectif de Fédérale 2 n'est pas le clone de son voisin de poule.
  const noteBase = noteAmateur(nomClub, niveau);
  const source = listeAmateur(nomClub);

  return source.map((brut, i) => {
    const rng = graine(`amateur#${nomClub}#${brut.nom}#${i}`);
    const poste = brut.poste ? posteConcret(brut.poste, nomClub + brut.nom) : POSTES_ROTATION[i % POSTES_ROTATION.length];
    // Rugby amateur : des seniors de 18 à 35 ans, la masse autour de 24-27.
    const ageRef = 18 + Math.floor((rng() + rng()) * 9);
    const retraite = Math.max(ageRef, 32 + Math.floor(rng() * 6));
    const vitesseDeclin = rng();
    const talent = Math.floor(rng() * 15) - 7; // −7..+7 autour de la division
    const potentielBase = Math.max(28, Math.min(80, noteBase + talent + courbeAge(AGE_PIC)));
    // ⚠️ ICI ON PEUT ÉCRIRE LE POTENTIEL DIRECTEMENT, sans réancrer la courbe,
    // et la démonstration tient en deux lignes. Une pépite a `ageRef ≤ 23`,
    // donc `Math.min(ageRef, AGE_PIC)` vaut `ageRef` : `noteRef` est calculée
    // avec un âge de référence ÉGAL à l'âge demandé, ce qui fait retomber
    // `noteALAge` sur son point de départ — elle vaut `max(28, noteBase +
    // talent)` borné, sans que le potentiel n'intervienne. Et à la saison 1,
    // `age === ageRef`, donc la note du jour vaut `noteRef`. Le plafond passe
    // de 80 à 86 : c'est tout l'intérêt, une pépite de Régionale doit pouvoir
    // viser plus haut que le meilleur joueur ordinaire de son étage.
    const prime = bonusPepite(nomClub + '#' + brut.nom + '#' + i, ageRef);
    const potentiel = prime > 0
      ? Math.max(potentielBase, Math.min(plafondPepite(niveau), potentielBase + prime))
      : potentielBase;
    const noteRef = noteALAge(
      Math.max(28, noteBase + talent), Math.min(ageRef, AGE_PIC), potentiel, ageRef, vitesseDeclin,
    );
    const age = ageRef + (saison - 1);

    if (age <= retraite) {
      return {
        id: `${nomClub}-am-${i}`,
        nom: brut.nom,
        poste,
        age,
        note: noteALAge(noteRef, ageRef, potentiel, age, vitesseDeclin),
        potentiel,
        nation: '🇫🇷 France',
        regen: false,
      };
    }

    // Retraité : un jeune du cru prend sa place, avec un nom du club.
    const generation = Math.max(1, Math.ceil((age - retraite) / 15));
    const j = genJoueur(nomClub, 2000 + i, generation, ((age - retraite - 1) % 15) + 1, noteBase, niveau);
    j.id = `${nomClub}-am-regen-${i}-${generation}`;
    j.poste = poste;
    const rngNom = graine(`regenam#${nomClub}#${i}#${generation}`);
    const prenom = source[Math.floor(rngNom() * source.length)].nom.split(' ')[0];
    const parrain = source[Math.floor(rngNom() * source.length)].nom.split(' ').slice(1).join(' ');
    j.nom = `${prenom} ${parrain}`.trim();
    j.nation = '🇫🇷 France';
    return j;
  });
}

// Effectif complet du club pour une saison donnée, MERCATO COMPRIS : c'est
// cette fonction que le jeu utilise partout.
/**
 * Deux joueurs d'un même club ne peuvent pas porter le même nom.
 *
 * ⚠️ CE N'EST PAS DE LA COSMÉTIQUE, C'EST LA CLÉ D'IDENTITÉ DU JEU. Les
 * statistiques de fond sont cumulées sous `club|nom` (`statsReelles`) : deux
 * homonymes dans le même club fusionnent en UNE ligne, qui additionne leurs
 * deux feuilles de match. Signalé en jeu — « on a plus de matchs que le
 * maximum possible » : mesuré en Régionale 3, un « Leo BOGALHO » apparaissait
 * QUATRE fois dans le même club, donc 4 matchs et 320 minutes par journée.
 *
 * ⚠️ ET C'EST UN DÉFAUT DES DONNÉES, PAS UN BOGUE DE GÉNÉRATION. Les effectifs
 * amateurs viennent de listes de licenciés qui MÉLANGENT LES SECTIONS d'un
 * club : la même personne y figure plusieurs fois, et de vrais frères y
 * figurent aussi.
 *
 * ⚠️ ON RENOMME, ON NE SUPPRIME PAS. Retirer les doublons changerait la taille
 * du groupe, donc `forceEffectif`, donc les classements et tout
 * l'étalonnage. Et on renomme APRÈS le tirage : l'âge et la note sont semés
 * sur le nom D'ORIGINE (`effectifAmateur`), qui ne bouge pas. Le seul effet
 * est l'étiquette, à l'écran et dans la clé de cumul.
 */
function distinguerLesHomonymes(liste: Coequipier[]): Coequipier[] {
  const vus = new Map<string, number>();
  let doublons = 0;
  const sortie = liste.map((j) => {
    const n = (vus.get(j.nom) ?? 0) + 1;
    vus.set(j.nom, n);
    if (n === 1) return j;
    doublons++;
    return { ...j, nom: `${j.nom} ${romain(n)}` };
  });
  return doublons ? sortie : liste;
}

/** « II », « III »… : plus discret qu'un « (2) » sur une feuille de match. */
function romain(n: number): string {
  return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n] ?? `#${n}`;
}

export function effectifDuClub(nomClub: string, saison: number): Coequipier[] {
  // ⚠️ Les transferts annoncés sur L'Ovale s'appliquent APRÈS le mercato, et
  // dès la saison 1 (le mercato, lui, ne démarre qu'en saison 2).
  // ⚠️ ET LES JEUNES DU CENTRE ARRIVENT ENCORE APRÈS : un joueur formé au club
  // ne peut pas avoir été transféré ailleurs par un tweet la saison d'avant.
  const liste = appliquerJeunesFormes(nomClub, saison, appliquerTransfertsSociaux(
    nomClub, saison, appliquerMercato(nomClub, saison, effectifBrut(nomClub, saison)),
  ));

  // ═══ LA GÉNÉRATION DU CLUB ════════════════════════════════════════════════
  // ⚠️ C'EST LE SEUL ENDROIT OÙ ELLE S'APPLIQUE, et c'est délibéré (voir
  // `lib/generations.ts`). Le bonus porte sur la NOTE DE CHAQUE JOUEUR, pas sur
  // la force du club : tout en découle alors sans rien d'autre à toucher — le
  // classement, les montées, le marché, la feuille de match, et l'écran 👥 qui
  // montre bien des joueurs meilleurs. L'appliquer sur `forceEffectif` seul
  // aurait donné un club qui joue comme 82 avec un effectif affiché à 75.
  const { bonus } = generationDuClub(nomClub, saison, noteDuClub(nomClub));
  if (Math.abs(bonus) < 0.05) {
    return appliquerProgres(nomClub, saison, distinguerLesHomonymes(liste));
  }
  return appliquerProgres(nomClub, saison, distinguerLesHomonymes(liste.map((j) => (
    // ⚠️ UNE RECRUE NE SUIT PAS LA GÉNÉRATION DE SON NOUVEAU CLUB. Elle arrive
    // avec la note sur laquelle on l'a achetée ; lui appliquer le cycle du club
    // acheteur, c'est faire mentir la fiche du marché de plusieurs points.
    j.horsGeneration ? j : {
      ...j,
      note: Math.max(20, Math.min(99, Math.round(j.note + bonus))),
      // Le potentiel suit : une génération dorée, ce sont des joueurs qui
      // dépassent ce qu'on attendait d'eux, pas seulement une bonne saison.
      potentiel: Math.max(20, Math.min(99, Math.round(j.potentiel + bonus * 0.6))),
    }
  ))));
}

// Un groupe doit pouvoir aligner un XV et son banc. Quand une source publique
// fournit moins de 26 joueurs, le club ajoute uniquement les renforts inventés
// qui lui manquent, poste par poste.
const EFFECTIF_MINIMUM = 26;

function completerEffectif(
  nomClub: string, saison: number, niveau: number, liste: Coequipier[],
): Coequipier[] {
  if (liste.length >= EFFECTIF_MINIMUM) return liste;
  const noteBase = NOTE_CLUB_REEL[nomClub] ?? NOTE_PAR_NIVEAU[niveau] ?? 50;
  const complet = [...liste];

  // Postes à pourvoir en priorité : ceux où le club est en dessous de la
  // composition type (3 piliers, 2 talonneurs, 3 deuxièmes lignes…).
  const manques: PosteId[] = [];
  for (const [poste, nombre] of COMPOSITION) {
    const presents = liste.filter((j) => j.poste === poste).length;
    for (let n = presents; n < nombre; n++) manques.push(poste);
  }
  let i = 0;
  while (complet.length < EFFECTIF_MINIMUM) {
    const poste = manques[i] ?? POSTES_ROTATION[i % POSTES_ROTATION.length];
    const j = genJoueur(nomClub, 3000 + i, 0, saison, noteBase, niveau);
    j.id = `${nomClub}-complement-${i}`;
    j.poste = poste;
    // Si le club a de vrais joueurs, le complément leur emprunte son identité :
    // un renfort de Kubota ne doit pas s'appeler « Léo Etcheverry ».
    const source = EFFECTIFS_REELS[nomClub];
    if (source?.length) {
      const rng = graine(`complement#${nomClub}#${i}`);
      const prenom = source[Math.floor(rng() * source.length)];
      const parrain = source[Math.floor(rng() * source.length)];
      j.nom = `${prenom.nom.split(' ')[0]} ${parrain.nom.split(' ').slice(1).join(' ')}`.trim();
      j.nation = parrain.nation;
    } else if (EFFECTIFS_AMATEURS[nomClub]) {
      const source2 = listeAmateur(nomClub);
      const rng = graine(`complementam#${nomClub}#${i}`);
      const prenom = source2[Math.floor(rng() * source2.length)].nom.split(' ')[0];
      const parrain = source2[Math.floor(rng() * source2.length)].nom.split(' ').slice(1).join(' ');
      j.nom = `${prenom} ${parrain}`.trim();
      j.nation = '🇫🇷 France';
    }
    complet.push(j);
    i += 1;
    if (i > 60) break; // garde-fou
  }
  return complet;
}

// Effectif « de base » : celui que le club aurait sans aucun transfert.
const cacheBrut = new Map<string, Coequipier[]>();

function effectifBrut(nomClub: string, saison: number): Coequipier[] {
  const cle = `${nomClub}#${saison}`;
  const memo = cacheBrut.get(cle);
  if (memo) return memo;
  const niveau = competitionDuClub(nomClub)?.niveau ?? 6;
  const liste = completerEffectif(nomClub, saison, niveau, construireEffectif(nomClub, saison));
  cacheBrut.set(cle, liste);
  return liste;
}

function construireEffectif(nomClub: string, saison: number): Coequipier[] {
  const division = competitionDuClub(nomClub);
  const niveau = division?.niveau ?? 6;
  // Les données FFR 2026-2027 passent avant l'ancienne base 2025-2026 pour les
  // clubs de Nationale qui viennent de monter, descendre ou changer d'effectif.
  if (EFFECTIFS_AMATEURS[nomClub]) return effectifAmateur(nomClub, saison, niveau);
  if (EFFECTIFS_REELS[nomClub]) return effectifReel(nomClub, saison, niveau);
  const nouveau = effectifNouveau(nomClub);
  if (nouveau) return effectifDesNouvellesLigues(nomClub, saison, nouveau);
  // Un club français dont la source amateur ne donne aucun licencié : effectif
  // entièrement généré, mais autour de SA note, comme les autres.
  const noteBase = noteAmateur(nomClub, niveau);
  const joueurs: Coequipier[] = [];
  let slot = 0;

  for (const [poste, nombre] of COMPOSITION) {
    for (let n = 0; n < nombre; n++) {
      slot += 1;
      // Cherche la génération active pour ce slot : on remplace les retraités.
      let generation = 0;
      for (;;) {
        const rng = graine(`${nomClub}#${slot}#g${generation}`);
        rng(); rng(); // consomme prénom/nom
        const ageDebut = generation === 0 ? 19 + Math.floor(rng() * 14) : 19 + Math.floor(rng() * 3);
        const retraite = 33 + Math.floor(rng() * 4);
        const anneesActives = retraite - ageDebut + 1;
        // saison où cette génération prend sa retraite (départ décalé par les gen. précédentes)
        const debut = generation === 0 ? 1 : cumulDebut(nomClub, slot, generation);
        if (saison < debut + anneesActives) {
          const j = genJoueur(nomClub, slot, generation, saison - debut + 1, noteBase, niveau);
          j.poste = poste;
          joueurs.push(j);
          break;
        }
        generation += 1;
        if (generation > 30) break; // garde-fou
      }
    }
  }
  return joueurs;
}

// Saison de début d'une génération donnée (fin de la précédente + 1).
function cumulDebut(club: string, slot: number, generation: number): number {
  let debut = 1;
  for (let g = 0; g < generation; g++) {
    const rng = graine(`${club}#${slot}#g${g}`);
    rng(); rng();
    const ageDebut = g === 0 ? 19 + Math.floor(rng() * 14) : 19 + Math.floor(rng() * 3);
    const retraite = 33 + Math.floor(rng() * 4);
    debut += retraite - ageDebut + 1;
  }
  return debut;
}

// ---------------------------------------------------------------------------
// MERCATO — le monde bouge autour du joueur
// À partir de la saison 2, les vraies recrues de l'été rejoignent les clubs
// couverts par les données et les vrais partants s'en vont. Ensuite, chaque
// division organise un échange circulaire déterministe : le club i envoie ses
// partants au club i+k. Calculé des deux côtés avec la même graine, l'échange
// ne duplique personne et ne demande aucune sauvegarde.
// ---------------------------------------------------------------------------
function normaliser(nom: string): string {
  return nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

function appliquerMercato(nomClub: string, saison: number, base: Coequipier[]): Coequipier[] {
  if (saison < 2) return base;
  const division = competitionDuClub(nomClub);
  const niveau = division?.niveau ?? 6;
  const noteBase = NOTE_CLUB_REEL[nomClub] ?? NOTE_PAR_NIVEAU[niveau] ?? 50;
  let liste = base;

  // 1. Mercato RÉEL de l'été (une seule fois, à l'entrée dans la saison 2).
  const reel = mercatoReel(nomClub);
  if (reel.departs.length || reel.arrivees.length) {
    const partis = new Set(reel.departs.map((d) => normaliser(d.nom)));
    liste = liste.filter((j) => !partis.has(normaliser(j.nom)));
    liste = [
      ...liste,
      ...reel.arrivees.map((r, i) => recrue(nomClub, r, saison, noteBase, i)),
    ];
  }

  // 2. Mercato SIMULÉ des saisons suivantes.
  if (saison >= 3 && division && division.clubs.length > 2) {
    const clubs = division.clubs;
    const index = clubs.findIndex((c) => c.nom === nomClub);
    const rngDiv = graine(`mercato#${division.id}#${saison}`);
    const decalage = 1 + Math.floor(rngDiv() * (clubs.length - 1));
    const expediteur = clubs[(index - decalage + clubs.length * 2) % clubs.length];

    const sortants = choisirPartants(nomClub, saison, liste);
    if (sortants.size) liste = liste.filter((j) => !sortants.has(j.id));

    const chezLautre = effectifBrut(expediteur.nom, saison);
    const venus = choisirPartants(expediteur.nom, saison, chezLautre);
    for (const j of chezLautre) {
      if (venus.has(j.id)) liste.push({ ...j, id: `${nomClub}-transfert-${j.id}` });
    }
  }

  return liste;
}

// ---------------------------------------------------------------------------
// TRANSFERTS ANNONCÉS SUR L'OVALE
// Quand un compte du réseau social annonce un transfert, il se FAIT : le joueur
// quitte vraiment son club et apparaît dans l'effectif de l'autre. Le store
// tient la liste et la déverse ici (même principe que `setMouvementsClubs`).
// ---------------------------------------------------------------------------
let TRANSFERTS_SOCIAUX: TransfertAnnonce[] = [];

export function setTransfertsSociaux(liste: TransfertAnnonce[] | undefined): void {
  TRANSFERTS_SOCIAUX = liste ?? [];
  cacheBrut.clear();
  cacheForce.clear();
  cacheReference.clear();
}

// ---------------------------------------------------------------------------
// CE QUE LES INSTALLATIONS DU CLUB DÉVERSENT ICI
// Même principe que les transferts annoncés ci-dessus : le store tient la
// liste, `effectif.ts` la rend. Deux apports, et ils ne s'appliquent pas au
// même moment de la chaîne (voir `effectifDuClub`).
// ---------------------------------------------------------------------------
let JEUNES_FORMES: JeuneForme[] = [];
let PROGRES_ENTRAINEMENT: Record<string, { depuis: number; gain: number }[]> = {};

export function setApportsDuCentre(
  jeunes: JeuneForme[] | undefined,
  progres: Record<string, { depuis: number; gain: number }[]> | undefined,
): void {
  JEUNES_FORMES = jeunes ?? [];
  PROGRES_ENTRAINEMENT = progres ?? {};
  cacheBrut.clear();
  cacheForce.clear();
  cacheReference.clear();
}

/**
 * Les jeunes du centre entrent dans le groupe l'année de leur sortie, puis
 * vieillissent comme tout le monde.
 *
 * ⚠️ ILS PASSENT PAR `noteALAge`, comme les 18 000 autres, et pas par une
 * courbe à eux : sans ça, un club aurait deux façons de faire progresser ses
 * joueurs, et l'écran 👥 afficherait des espoirs qui ne suivent pas la même
 * règle que leurs coéquipiers.
 */
function appliquerJeunesFormes(
  nomClub: string, saison: number, liste: Coequipier[],
): Coequipier[] {
  if (!JEUNES_FORMES.length) return liste;
  const miens = JEUNES_FORMES.filter((j) => j.club === nomClub && j.saison <= saison);
  if (!miens.length) return liste;

  const sortie = [...liste];
  for (const j of miens) {
    const age = j.age + (saison - j.saison);
    const rng = graine('centre#' + j.id);
    const vitesseDeclin = rng();
    // Il raccroche comme un joueur du cru : 33-36 ans.
    if (age > 33 + Math.floor(rng() * 4)) continue;
    sortie.push({
      id: j.id,
      nom: j.nom,
      poste: j.poste,
      age,
      note: noteALAge(j.note, j.age, j.potentiel, age, vitesseDeclin),
      potentiel: j.potentiel,
      nation: j.nation,
      regen: false,
      duCentre: true,
    });
  }
  return sortie;
}

/**
 * Le programme individuel du centre d'entraînement.
 *
 * ⚠️ IL S'APPLIQUE APRÈS `distinguerLesHomonymes`, ET C'EST OBLIGATOIRE. La
 * clé est `club|nom AFFICHÉ` : les effectifs amateurs contiennent de vrais
 * doublons de nom, et créditer « Leo BOGALHO » sans son suffixe romain
 * entraînerait les quatre d'un coup — pour le prix d'une place.
 *
 * ⚠️ ET LE POTENTIEL RESTE LE PLAFOND. C'est ce qui empêche le centre de
 * devenir une machine à fabriquer des stars : on rattrape sa marge, on ne la
 * dépasse jamais.
 */
function appliquerProgres(nomClub: string, saison: number, liste: Coequipier[]): Coequipier[] {
  if (!Object.keys(PROGRES_ENTRAINEMENT).length) return liste;
  let touche = false;
  const sortie = liste.map((j) => {
    const incrs = PROGRES_ENTRAINEMENT[nomClub + '|' + j.nom];
    if (!incrs?.length) return j;
    // ⚠️ SEULEMENT CE QUI ÉTAIT ACQUIS À CETTE DATE. Sans le filtre, un
    // classement de la saison 3 qu'on rouvre en saison 9 montrerait le joueur
    // avec six ans d'entraînement qu'il n'avait pas encore faits.
    let gain = 0;
    for (const inc of incrs) if (inc.depuis <= saison) gain += inc.gain;
    if (gain <= 0) return j;
    const note = Math.min(j.potentiel, Math.round(j.note + gain));
    if (note === j.note) return j;
    touche = true;
    return { ...j, note };
  });
  return touche ? sortie : liste;
}

function appliquerTransfertsSociaux(
  nomClub: string, saison: number, liste: Coequipier[],
): Coequipier[] {
  if (!TRANSFERTS_SOCIAUX.length) return liste;
  const concernes = TRANSFERTS_SOCIAUX.filter((t) => t.saison <= saison);
  if (!concernes.length) return liste;

  // ⚠️ SEUL LE DERNIER MOUVEMENT D'UN JOUEUR COMPTE, et c'était le bug. Les
  // départs se calculaient sur la liste d'ORIGINE, puis la boucle des arrivées
  // rajoutait tout ce qui pointait vers ce club — sans regarder si le joueur
  // en était reparti depuis. Conséquence : une recrue mise en vente était
  // retirée d'une liste où elle ne figurait pas encore, puis remise aussitôt
  // par la boucle d'arrivée. « On peut pas virer les joueurs qu'on a
  // recrutés » : ils revenaient à chaque rendu.
  //
  // Les annonces sont chronologiques (le store ajoute en fin de tableau) : la
  // dernière qui concerne un joueur dit donc où il se trouve aujourd'hui. Ça
  // gère du même coup les allers-retours et les reventes en chaîne.
  const dernier = new Map<string, TransfertAnnonce>();
  for (const t of concernes) dernier.set(normaliser(t.nom), t);

  // Ceux dont le dernier mouvement les emmène ailleurs quittent le groupe.
  let sortie = liste.filter((j) => {
    const t = dernier.get(normaliser(j.nom));
    return !t || t.vers === nomClub;
  });

  // Les arrivants débarquent — avec la note EXACTE qu'affichait le marché.
  //
  // ⚠️ ON REPREND LE JOUEUR AVEC LE BONUS DE SON ANCIEN CLUB, et on le marque
  // `horsGeneration`. `effectifBrut` rend la note NUE, alors que la fiche du
  // marché lit `effectifDuClub` — donc la note bonifiée par la génération du
  // club vendeur. Sans ce report, un joueur affiché 74 chez un club en pleine
  // génération dorée arrivait à 69 (bonus source perdu), puis repartait à 65
  // chez un acheteur en creux (bonus destination appliqué). Neuf points
  // d'écart, jamais annoncés : « ils ont pas du tout les bons généraux ».
  for (const [cle, t] of dernier) {
    if (t.vers !== nomClub) continue;
    if (sortie.some((j) => normaliser(j.nom) === cle)) continue;
    const ancien = effectifBrut(t.de, saison).find((j) => normaliser(j.nom) === cle);
    const noteAnnoncee = Number.isFinite(t.note) ? Math.max(30, Math.min(95, t.note!)) : 60;
    const age = ancien?.age ?? (Number.isFinite(t.age) ? t.age! : 26);
    // Le bonus du club d'origine, calculé exactement comme dans `effectifDuClub`.
    const bonusSource = ancien
      ? generationDuClub(t.de, saison, noteDuClub(t.de)).bonus
      : 0;
    sortie = [
      ...sortie,
      ancien
        ? {
            ...ancien,
            id: `${nomClub}-ovale-${cle}`,
            horsGeneration: true,
            note: Math.max(20, Math.min(99, Math.round(ancien.note + bonusSource))),
            potentiel: Math.max(20, Math.min(99, Math.round(ancien.potentiel + bonusSource * 0.6))),
          }
        : {
            id: `${nomClub}-ovale-${cle}`,
            nom: t.nom,
            poste: posteConcret((t.poste ?? 'centre') as FamillePoste, nomClub + t.nom),
            age,
            note: noteAnnoncee,
            potentiel: Math.min(95, noteAnnoncee + Math.max(0, 27 - age)),
            nation: t.nation ?? 'France',
            regen: false,
            horsGeneration: true,
          },
    ];
  }
  return sortie;
}

// Joueurs qu'un club laisse partir cette saison (1 à 3, jamais ses 5 meilleurs).
function choisirPartants(nomClub: string, saison: number, liste: Coequipier[]): Set<string> {
  const sortants = new Set<string>();
  if (liste.length < 12) return sortants;
  const rng = graine(`partants#${nomClub}#${saison}`);
  const classes = [...liste].sort((a, b) => b.note - a.note);
  const eligibles = classes.slice(5); // on ne brade pas ses cadres
  const nombre = 1 + Math.floor(rng() * 3);
  for (let n = 0; n < nombre && eligibles.length; n++) {
    sortants.add(eligibles[Math.floor(rng() * eligibles.length)].id);
  }
  return sortants;
}

// Une recrue réelle transformée en coéquipier jouable.
function recrue(nomClub: string, r: RecrueReelle, saison: number, noteBase: number, i: number): Coequipier {
  const rng = graine(`recrue#${nomClub}#${r.nom}`);
  const ageRef = r.age ?? 20 + Math.floor(rng() * 12);
  const age = ageRef + (saison - 2); // les données décrivent l'été de la saison 2
  const talent = Math.floor(rng() * 11) - 4;
  const potentiel = Math.max(35, Math.min(94, noteBase + talent + courbeAge(AGE_PIC)));
  const vitesseDeclin = rng();
  return {
    id: `${nomClub}-recrue-${i}`,
    nom: r.nom,
    poste: r.poste ? posteConcret(r.poste, nomClub + r.nom) : POSTES_ROTATION[i % POSTES_ROTATION.length],
    age,
    note: noteALAge(Math.max(35, noteBase + talent), Math.min(ageRef, AGE_PIC), potentiel, age, vitesseDeclin),
    potentiel,
    nation: r.nation,
    regen: false,
  };
}

// ---------------------------------------------------------------------------
// FORCE D'UN EFFECTIF
// La force sportive d'un club n'est plus une constante : c'est la moyenne
// pondérée de ses meilleurs joueurs, TELLE QU'ELLE EST CETTE SAISON. Elle
// monte quand les espoirs éclosent et baisse quand les cadres vieillissent —
// et c'est elle qui décide du classement de fin de saison (voir le store).
// ---------------------------------------------------------------------------
const TAILLE_GROUPE = 23; // le groupe qui joue réellement les matchs

const cacheForce = new Map<string, number>();

export function forceEffectif(nomClub: string, saison: number): number {
  const cle = `${nomClub}#${saison}`;
  const memo = cacheForce.get(cle);
  if (memo !== undefined) return memo;

  const notes = effectifDuClub(nomClub, saison)
    .map((j) => j.note)
    .sort((a, b) => b - a)
    .slice(0, TAILLE_GROUPE);

  // Poids dégressifs : le XV de départ pèse plus lourd que les remplaçants.
  let total = 0;
  let poids = 0;
  notes.forEach((note, i) => {
    const p = i < 15 ? 1 : 0.5;
    total += note * p;
    poids += p;
  });
  const force = poids > 0 ? total / poids : NOTE_PAR_NIVEAU[6];
  cacheForce.set(cle, force);
  return force;
}

// Niveau moyen d'une division pour une saison : moyenne des forces d'effectif
// de ses clubs. Échantillonné à 16 clubs max — les divisions amateurs en
// comptent jusqu'à 159, on ne va pas toutes les générer à chaque calcul.
const cacheReference = new Map<string, number>();

export function forceMoyenneDivision(divisionId: string, saison: number): number {
  const cle = `${divisionId}#${saison}`;
  const memo = cacheReference.get(cle);
  if (memo !== undefined) return memo;

  const division = COMPETITIONS.find((d) => d.id === divisionId);
  const clubs = (division?.clubs ?? []).slice(0, 16);
  const moyenne = clubs.length
    ? clubs.reduce((a, c) => a + forceEffectif(c.nom, saison), 0) / clubs.length
    : NOTE_PAR_NIVEAU[division?.niveau ?? 6] ?? 50;
  cacheReference.set(cle, moyenne);
  return moyenne;
}

// Note générale du joueur incarné (moyenne des attributs).
export function generale(j: Pick<Joueur, 'attributs'>): number {
  const vals = Object.values(j.attributs);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function libellePoste(p: PosteId): string {
  return POSTE_PAR_ID[p].nom;
}
