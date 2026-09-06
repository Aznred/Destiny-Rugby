// ═══════════════════════════════════════════════════════════════════════════
// LES JEUNES — ce qu'ils sont, et ce qu'on n'a pas le droit de savoir
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « le point important : le potentiel exact ne doit jamais être
// visible. Ton recruteur peut afficher par exemple “potentiel estimé : 3,5 à
// 4,5 étoiles”, alors que le vrai potentiel est caché. »
//
// ⚠️ ET C'EST LA CONTRAINTE QUI STRUCTURE TOUT LE FICHIER. `potentielReel` est
// le seul champ que rien, jamais, ne doit rendre à l'écran. Il n'existe que
// pour deux consommateurs : la PROGRESSION (`progresser`, ci-dessous) et
// l'ESTIMATION d'un recruteur (`lib/detection.ts`), qui en produit une
// fourchette perturbée. Un composant qui l'afficherait viderait de son sens
// tout le lot détection — plus rien à parier, plus aucune raison de scouter.
//
// ⚠️ LE JEUNE EXISTE AVANT QU'ON LE CONNAISSE. Demande explicite : « les jeunes
// existent avant d'arriver dans ton centre ; tu pourrais tomber à 17 ans sur un
// ailier incroyable de Régionale 2 qui joue dans le club de son village, plutôt
// que toutes les pépites apparaissent magiquement dans les académies des grands
// clubs ». Il est donc DÉTERMINISTE et rattaché à un vrai club de la pyramide
// (`lib/viviers.ts`), exactement comme les effectifs : rien à sauvegarder, et
// il vieillit tout seul d'une saison à l'autre.

import type { FamillePoste, PosteId } from '../types.js';
import { POSTES, POSTES_PAR_FAMILLE } from '../data/rugby.js';
import { graine } from './championnat.js';

/** L'âge auquel un jeune entre dans le vivier, et celui où il en sort. */
export const AGE_MIN_JEUNE = 14;
export const AGE_MAX_JEUNE = 19;

/**
 * La part de jeunes qui reçoivent un TALENT hors norme.
 *
 * ⚠️ C'EST LE SEUL RÉGLAGE QUI DÉCIDE DE LA RARETÉ D'UNE PÉPITE, et il se
 * mesure (`scripts/verifFormation.ts`) : viser ~2 % de potentiels ≥ 80 et
 * quelques dizaines de ≥ 88 sur les six mille jeunes du pays. Le monter rend
 * la détection sans intérêt — il y aurait un crack dans chaque village.
 */
export const PART_TALENT = 0.085;

export type StyleJeu =
  | 'percutant' | 'evasif' | 'technicien' | 'buteur'
  | 'travailleur' | 'plaqueur' | 'meneur';

export type Personnalite =
  | 'modele' | 'ambitieux' | 'discret' | 'insouciant'
  | 'fort_caractere' | 'perfectionniste' | 'fragile';

export interface JeuneJoueur {
  /** Déterministe : `club#cohorte#rang`. Il ne change jamais. */
  id: string;
  nom: string;
  /** Le club où il joue AUJOURD'HUI — souvent celui de son village. */
  club: string;
  region: string;
  age: number;
  poste: PosteId;
  nation: string;
  /** Ce qu'il vaut aujourd'hui. C'est la seule note honnête du modèle. */
  note: number;
  /**
   * ⚠️ NE JAMAIS AFFICHER. Ce qu'il vaudra à son pic s'il est bien formé et
   * qu'il joue. Voir l'avertissement en tête de fichier.
   */
  potentielReel: number;
  // ── Les trois axes de développement ──────────────────────────────────────
  physique: number;
  technique: number;
  mental: number;
  // ── Ce qui décide s'il ira au bout de son potentiel ──────────────────────
  discipline: number;
  professionnalisme: number;
  risqueBlessure: number;
  // ── Ce qui décide de son usage ───────────────────────────────────────────
  polyvalence: PosteId[];
  taille: number;
  poids: number;
  piedFort: 'gauche' | 'droit';
  style: StyleJeu;
  personnalite: Personnalite;
  /** 0-100 : ce qu'il en coûte de le faire partir de chez lui. */
  attachement: number;
}

// ---------------------------------------------------------------------------
// LES COURBES D'ÂGE, PAR POSTE
// ---------------------------------------------------------------------------
// Demande : « un ailier peut progresser très rapidement entre 17 et 21 ans, un
// pilier peut devenir excellent beaucoup plus tard […] ça permet d'éviter le
// problème Football Manager où tous les postes semblent évoluer pareil ».
//
// ⚠️ CE N'EST PAS UNE COURBE DÉCALÉE DE DEUX ANS, C'EST UNE AUTRE COURBE. Un
// ailier vit de vitesse pure : il est à son sommet tôt et il redescend tôt. Un
// pilier vit de masse et de technique de mêlée, deux choses qui s'acquièrent
// lentement — il perce vers 24 ans et tient jusqu'à 33. Décaler une seule
// courbe donnerait un pilier qui explose à 19 ans avec deux ans de retard,
// c'est-à-dire toujours le même joueur.
//
// Chaque entrée donne le facteur de progression par tranche d'âge : 15-17,
// 18-20, 21-23, 24-27, 28-30, 31+.
const COURBE_PAR_FAMILLE: Record<FamillePoste, number[]> = {
  //                     15-17  18-20  21-23  24-27  28-30  31+
  pilier: /*         */ [0.55, 0.85, 1.15, 1.30, 0.75, -0.35],
  talonneur: /*      */ [0.60, 0.95, 1.20, 1.15, 0.65, -0.45],
  deuxieme_ligne: /* */ [0.70, 1.10, 1.20, 1.00, 0.55, -0.60],
  troisieme_ligne: /**/ [0.85, 1.25, 1.20, 0.85, 0.45, -0.75],
  demi_melee: /*     */ [0.95, 1.30, 1.15, 0.85, 0.55, -0.65],
  demi_ouverture: /* */ [0.90, 1.20, 1.20, 0.95, 0.60, -0.60],
  centre: /*         */ [1.00, 1.35, 1.10, 0.80, 0.45, -0.85],
  ailier: /*         */ [1.15, 1.45, 1.00, 0.65, 0.35, -1.05],
  arriere: /*        */ [1.05, 1.35, 1.05, 0.75, 0.45, -0.90],
};

function trancheDAge(age: number): number {
  if (age <= 17) return 0;
  if (age <= 20) return 1;
  if (age <= 23) return 2;
  if (age <= 27) return 3;
  if (age <= 30) return 4;
  return 5;
}

export function familleDe(poste: PosteId): FamillePoste {
  return POSTES.find((p) => p.id === poste)?.famille ?? 'centre';
}

/** Le facteur de progression de ce poste à cet âge. Négatif = déclin. */
export function facteurDAge(poste: PosteId, age: number): number {
  return COURBE_PAR_FAMILLE[familleDe(poste)][trancheDAge(age)];
}

/** L'âge où ce poste atteint son sommet — utile pour situer un espoir. */
export function agePicDe(poste: PosteId): number {
  const c = COURBE_PAR_FAMILLE[familleDe(poste)];
  let meilleur = 0;
  for (let i = 1; i < c.length; i++) if (c[i] > c[meilleur]) meilleur = i;
  return [16, 19, 22, 26, 29, 33][meilleur];
}

// ---------------------------------------------------------------------------
// LA MORPHOLOGIE
// ---------------------------------------------------------------------------
// ⚠️ ELLE N'EST PAS DÉCORATIVE. Un jeune de 15 ans qui mesure 1,72 m au poste
// de pilier n'a pas le gabarit, et c'est une information que le recruteur doit
// pouvoir lire — comme dans la fiche de la demande (« Taille : 1m72 · Technique
// très bonne · Physique faible »). Un jeune GRANDIT encore : la taille indiquée
// est celle d'aujourd'hui, et le modèle sait ce qu'il lui reste à prendre.
const GABARIT: Record<FamillePoste, [number, number, number, number]> = {
  // [taille moyenne adulte (cm), écart, poids moyen adulte (kg), écart]
  pilier: [185, 4, 118, 7],
  talonneur: [182, 4, 108, 6],
  deuxieme_ligne: [199, 4, 117, 6],
  troisieme_ligne: [192, 5, 110, 6],
  demi_melee: [177, 5, 82, 5],
  demi_ouverture: [182, 5, 88, 5],
  centre: [186, 5, 98, 6],
  ailier: [184, 5, 92, 5],
  arriere: [185, 5, 92, 5],
};

/** Ce qu'il lui reste à grandir : on finit de pousser vers 19-20 ans. */
function partDeCroissance(age: number): number {
  if (age >= 20) return 1;
  return 0.90 + (age - AGE_MIN_JEUNE) * 0.0165;
}

const STYLES: StyleJeu[] = [
  'percutant', 'evasif', 'technicien', 'buteur', 'travailleur', 'plaqueur', 'meneur',
];
const PERSONNALITES: Personnalite[] = [
  'modele', 'ambitieux', 'discret', 'insouciant', 'fort_caractere',
  'perfectionniste', 'fragile',
];

/**
 * ⚠️ LA PERSONNALITÉ N'EST PAS UNE ÉTIQUETTE : elle DÉPLACE la progression.
 * Un « modèle » tire le maximum de ce qu'il a, un « insouciant » gâche une
 * partie de son potentiel, un « fragile » s'effondre quand ça va mal. C'est ce
 * qui produit la promesse de la demande — « un joueur avec potentiel 90
 * pourrait finir à 75 parce qu'il joue peu, se blesse, travaille mal ».
 */
export const EFFET_PERSONNALITE: Record<Personnalite, {
  professionnalisme: number; mental: number; progression: number;
}> = {
  modele: { professionnalisme: 18, mental: 10, progression: 1.14 },
  perfectionniste: { professionnalisme: 14, mental: 4, progression: 1.10 },
  ambitieux: { professionnalisme: 8, mental: 8, progression: 1.06 },
  discret: { professionnalisme: 2, mental: -2, progression: 1.00 },
  fort_caractere: { professionnalisme: -4, mental: 8, progression: 0.98 },
  insouciant: { professionnalisme: -16, mental: -6, progression: 0.88 },
  fragile: { professionnalisme: -2, mental: -16, progression: 0.90 },
};

const PRENOMS = [
  'Léo', 'Hugo', 'Gabriel', 'Louis', 'Arthur', 'Jules', 'Adam', 'Maël',
  'Lucas', 'Noah', 'Liam', 'Sacha', 'Paul', 'Antoine', 'Baptiste', 'Romain',
  'Thibault', 'Mathis', 'Enzo', 'Théo', 'Nathan', 'Tom', 'Clément', 'Quentin',
  'Maxime', 'Alexandre', 'Pierre', 'Damien', 'Florian', 'Julien', 'Ethan',
  'Bastien', 'Corentin', 'Dorian', 'Erwan', 'Fabien', 'Gaël', 'Iban', 'Peyo',
  'Marius', 'Timéo', 'Raphaël', 'Nolan', 'Milo', 'Axel', 'Malo', 'Ilan',
];

const NOMS = [
  'Dupont', 'Martin', 'Bernard', 'Etcheverry', 'Larrieu', 'Cazenave',
  'Duprat', 'Lacroix', 'Barrère', 'Sallefranque', 'Mora', 'Ibañez',
  'Castagnède', 'Dourthe', 'Bru', 'Lamerat', 'Baradat', 'Sempé', 'Puyo',
  'Etchegaray', 'Elissalde', 'Marchand', 'Cros', 'Jelonch', 'Fabre',
  'Barassi', 'Costes', 'Vergnes', 'Sansus', 'Bielle', 'Serin', 'Laborde',
  'Guirado', 'Picamoles', 'Ollivon', 'Penaud', 'Capdevielle', 'Lartigue',
  'Fickou', 'Villière', 'Baille', 'Aldegheri', 'Lauret', 'Pujol', 'Rieu',
  'Danty', 'Jaminet', 'Buros', 'Lucu', 'Moefana', 'Bergès', 'Soulan',
];

function borne(v: number, bas = 1, haut = 99): number {
  return Math.max(bas, Math.min(haut, Math.round(v)));
}

/**
 * FABRIQUE UN JEUNE, de façon déterministe.
 *
 * ⚠️ L'ORDRE DES TIRAGES EST FIGÉ. `graine` est une fermeture à état : seuls le
 * NOMBRE et l'ORDRE des appels décident de la suite. Insérer un tirage au
 * milieu change tous les jeunes du jeu, y compris ceux qu'un rapport de
 * détection a déjà décrits. Tout nouvel attribut se tire À LA FIN.
 *
 * @param qualiteRegion le bonus de la terre de rugby dont il sort
 * @param niveauClub    la note du club où il joue aujourd'hui
 */
export function fabriquerJeune(
  cle: string,
  club: string,
  region: string,
  age: number,
  qualiteRegion: number,
  niveauClub: number,
): JeuneJoueur {
  const rng = graine(`jeune#${cle}`);

  const prenom = PRENOMS[Math.floor(rng() * PRENOMS.length)];
  const nom = NOMS[Math.floor(rng() * NOMS.length)];

  const familles = Object.keys(POSTES_PAR_FAMILLE) as FamillePoste[];
  const famille = familles[Math.floor(rng() * familles.length)];
  const dansLaFamille = POSTES_PAR_FAMILLE[famille];
  const poste = dansLaFamille[Math.floor(rng() * dansLaFamille.length)];

  // ── LE POTENTIEL RÉEL : une loi ORDINAIRE, plus un talent RARE ──────────
  //
  // ⚠️ UNE SEULE LOI DE PUISSANCE NE PEUT PAS FAIRE LES DEUX, et la première
  // version l'a prouvé : `socle + rng()^1,6 × 52` a rendu **30 % de jeunes au
  // potentiel ≥ 80** sur les 6 030 du pays, c'est-à-dire dix-huit cents futurs
  // internationaux par promotion. Rendre l'exposant plus raide écrase alors le
  // milieu : tout le monde finit médiocre, et il n'y a plus rien à former.
  //
  // On sépare donc, exactement comme les pépites du monde adulte
  // (`lib/effectif.ts`) : une loi ordinaire qui décide de la masse, puis un
  // tirage RARE et indépendant qui décide des exceptions. C'est le seul moyen
  // d'avoir à la fois un vivier crédible et « l'ailier incroyable de
  // Régionale 2 » de la demande.
  //
  // ⚠️ ET LE CLUB PÈSE PEU, LA RÉGION PÈSE LOURD. C'est le cœur de la demande :
  // les pépites ne doivent PAS apparaître magiquement dans les académies des
  // grands clubs. Un gamin naît là où l'on joue au rugby, pas là où le club est
  // riche — le club, lui, décide de le GARDER, et ça se joue dans
  // `lib/centreFormation.ts`.
  const socle = 28 + qualiteRegion * 1.6 + niveauClub * 0.09;
  let brutPotentiel = socle + rng() ** 2.2 * 30;
  const talentRare = rng();
  if (talentRare < PART_TALENT) {
    brutPotentiel += 10 + (talentRare / PART_TALENT) ** 1.5 * 34;
  }
  const potentielReel = borne(brutPotentiel, 26, 96);

  // ── CE QU'IL VAUT AUJOURD'HUI ───────────────────────────────────────────
  //
  // ⚠️ ON PART DE L'ÂGE, PAS DU POTENTIEL MOINS UN RETARD. La première version
  // faisait `potentiel − retard`, ce qui donnait un gamin de 14 ans noté 68 —
  // c'est-à-dire, dans ce jeu, un titulaire de Nationale. Un jeune de 14 ans
  // n'est pas « un bon joueur en avance » : c'est un enfant, et il vaut 20.
  //
  // ⚠️ ET LA COURBE PASSE PAR L'ÂGE DU PIC DE SON POSTE. Un pilier de 19 ans
  // est bien plus loin de son plafond qu'un ailier du même âge, parce que son
  // sommet est sept ans plus tard. C'est ce qui rend la détection difficile
  // là où elle doit l'être : le gros gamin lourd n'a l'air de rien.
  const part = Math.min(1, (age - 13) / Math.max(1, agePicDe(poste) - 13));
  const note = borne(
    16 + (potentielReel - 16) * part ** 1.4 * (0.78 + rng() * 0.32),
    12, 78,
  );

  const physique = borne(38 + rng() * 46 + (age - AGE_MIN_JEUNE) * 2.2);
  const technique = borne(36 + rng() * 48);
  const mentalBrut = 32 + rng() * 46;
  const discipline = borne(34 + rng() * 54);
  const risqueBlessure = borne(8 + rng() ** 1.7 * 62);

  const personnalite = PERSONNALITES[Math.floor(rng() * PERSONNALITES.length)];
  const effet = EFFET_PERSONNALITE[personnalite];
  const mental = borne(mentalBrut + effet.mental);
  const professionnalisme = borne(34 + rng() * 44 + effet.professionnalisme);

  const style = STYLES[Math.floor(rng() * STYLES.length)];
  const piedFort: 'gauche' | 'droit' = rng() < 0.22 ? 'gauche' : 'droit';

  const [tMoy, tEcart, pMoy, pEcart] = GABARIT[famille];
  const croissance = partDeCroissance(age);
  const taille = Math.round((tMoy + (rng() * 2 - 1) * tEcart) * croissance);
  // ⚠️ LE POIDS SUIT LA TAILLE, il ne se tire pas à part : un pilier de 1,72 m
  // à 118 kg n'existe pas, et un tirage indépendant en produit un sur vingt.
  const poids = Math.round((pMoy + (rng() * 2 - 1) * pEcart) * croissance ** 2.6);

  // ── POLYVALENCE ─────────────────────────────────────────────────────────
  // ⚠️ ELLE RESTE DANS LA FAMILLE, ou juste à côté. Un talonneur dépanne en
  // pilier, pas à l'aile — et une polyvalence tirée au hasard sur les quinze
  // maillots rendrait le champ inutile pour composer une feuille de match.
  const polyvalence: PosteId[] = [];
  if (rng() < 0.42) {
    const voisins = dansLaFamille.filter((p) => p !== poste);
    if (voisins.length) polyvalence.push(voisins[Math.floor(rng() * voisins.length)]);
    else {
      const i = familles.indexOf(famille);
      const cote = familles[(i + (rng() < 0.5 ? 1 : familles.length - 1)) % familles.length];
      const l = POSTES_PAR_FAMILLE[cote];
      polyvalence.push(l[Math.floor(rng() * l.length)]);
    }
  }

  const attachement = borne(30 + rng() * 60);

  return {
    id: cle,
    nom: `${prenom} ${nom}`,
    club,
    region,
    age,
    poste,
    nation: 'France',
    note,
    potentielReel,
    physique,
    technique,
    mental,
    discipline,
    professionnalisme,
    risqueBlessure,
    polyvalence,
    taille,
    poids,
    piedFort,
    style,
    personnalite,
    attachement,
  };
}

// ---------------------------------------------------------------------------
// LA PROGRESSION
// ---------------------------------------------------------------------------
/** Ce qu'une saison a apporté à un jeune, et pourquoi. */
export interface SaisonDeFormation {
  /** 0-100 : la qualité de l'encadrement (voir `lib/centreFormation.ts`). */
  coaching: number;
  infrastructures: number;
  /** 0-100 : la part de matchs réellement joués. C'est le facteur DOMINANT. */
  tempsDeJeu: number;
  /** 0-100 : moral du joueur cette saison. */
  moral: number;
  /** Une saison blanche pour blessure ne fait pas progresser. */
  blesse?: boolean;
}

export interface GainDeFormation {
  note: number;
  potentiel: number;
  detail: { libelle: string; valeur: number }[];
}

/**
 * CE QU'UNE SAISON FAIT À UN JEUNE.
 *
 * Demande : « progression = potentiel × âge × coaching × infrastructures ×
 * temps de jeu × professionnalisme × moral, avec une part aléatoire […] c'est
 * important parce qu'un jeune ne doit jamais être garanti de devenir une
 * superstar ».
 *
 * ⚠️ LE TEMPS DE JEU PÈSE PLUS LOURD QUE TOUT LE RESTE, et c'est ce qui rend le
 * PRÊT intéressant. Demande : « Entraînement ⭐⭐⭐⭐⭐ + Temps de jeu ⭐ →
 * progression moyenne ; Entraînement ⭐⭐⭐ + Temps de jeu ⭐⭐⭐⭐⭐ →
 * progression forte. Donc parfois tu dois prêter ton jeune. » Un facteur
 * secondaire ne produirait jamais cet arbitrage : on garderait toujours son
 * espoir au chaud dans le meilleur centre.
 *
 * ⚠️ ET LE POTENTIEL EST DYNAMIQUE, DANS LES DEUX SENS. « Un joueur avec
 * potentiel 90 pourrait finir à 75 […] à l'inverse, un potentiel 76 pourrait
 * atteindre 82 grâce à une excellente progression. » Un potentiel figé fait de
 * la détection un oracle : il suffirait de connaître le chiffre pour connaître
 * la fin de l'histoire.
 */
export function progresser(
  j: JeuneJoueur,
  saison: SaisonDeFormation,
  alea: () => number,
): GainDeFormation {
  const detail: { libelle: string; valeur: number }[] = [];
  const marge = Math.max(0, j.potentielReel - j.note);

  if (saison.blesse) {
    // ⚠️ UNE SAISON BLANCHE COÛTE DU POTENTIEL, elle ne se contente pas de ne
    // rien rapporter. C'est la moitié de la promesse « il se blesse » : sans
    // ça, une blessure ne serait qu'un retard, jamais un destin.
    const perdu = -Math.round(1 + alea() * 2);
    detail.push({ libelle: 'saison blanche', valeur: perdu });
    return { note: 0, potentiel: perdu, detail };
  }

  const age = facteurDAge(j.poste, j.age);
  const perso = EFFET_PERSONNALITE[j.personnalite].progression;

  // Chaque facteur est centré sur 1 : à 50 partout, on progresse « normalement ».
  const fCoaching = 0.55 + saison.coaching / 110;
  const fInstall = 0.72 + saison.infrastructures / 180;
  const fJeu = 0.35 + saison.tempsDeJeu / 62;
  const fPro = 0.62 + j.professionnalisme / 130;
  const fMoral = 0.80 + saison.moral / 250;

  const brut = (marge / 5.4) * age * fCoaching * fInstall * fJeu * fPro * fMoral * perso;
  // La part aléatoire est large : c'est elle qui fait qu'on ne sait jamais.
  const gain = Math.max(0, brut * (0.62 + alea() * 0.78));

  detail.push({ libelle: 'marge à combler', valeur: Math.round(marge) });
  detail.push({ libelle: 'âge et poste', valeur: Math.round(age * 100) / 100 });
  detail.push({ libelle: 'temps de jeu', valeur: Math.round(fJeu * 100) / 100 });
  detail.push({ libelle: 'encadrement', valeur: Math.round(fCoaching * 100) / 100 });
  detail.push({ libelle: 'professionnalisme', valeur: Math.round(fPro * 100) / 100 });

  // ── LE POTENTIEL BOUGE ───────────────────────────────────────────────────
  // Il monte quand tout va bien et qu'on est encore jeune ; il se rabote quand
  // on ne joue pas et qu'on travaille mal. Le rabot est le plus important des
  // deux : c'est lui qui punit un espoir laissé sur le banc trois ans.
  let potentiel = 0;
  const bienParti = saison.tempsDeJeu >= 55 && j.professionnalisme >= 60 && saison.coaching >= 60;
  const malParti = saison.tempsDeJeu < 25 || j.professionnalisme < 35;
  if (bienParti && j.age <= 22 && alea() < 0.30) potentiel += 1 + Math.floor(alea() * 2);
  if (malParti && alea() < 0.42) potentiel -= 1 + Math.floor(alea() * 2);

  return { note: Math.round(gain * 10) / 10, potentiel, detail };
}

/** Le libellé court d'un style, pour l'écran. */
export function cleStyle(s: StyleJeu): string {
  return `jeune.style.${s}`;
}
export function clePersonnalite(p: Personnalite): string {
  return `jeune.perso.${p}`;
}
