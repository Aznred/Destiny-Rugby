// LA VALEUR D'UNE CARTE — et le garde-fou anti-cadeau
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ LA GROSSE FAILLE DU MODE, ET ELLE N'EST PAS THÉORIQUE
// ═══════════════════════════════════════════════════════════════════════════
// « Il faut empêcher : Colin donne son meilleur joueur OVR 90 à Hugo contre
// 1 OVA. Sinon deux potes peuvent alimenter une seule équipe. »
//
// C'est la seule faille qui tue une ligue entre potes, parce qu'elle ne demande
// aucune compétence technique : deux personnes qui s'entendent suffisent. Et
// elle ne se voit pas — le championnat a l'air normal jusqu'au jour où une
// équipe aligne quinze joueurs à 85.
//
// La parade tient en une phrase : **il existe une valeur de référence, et le
// serveur compare toute transaction à elle.** Ce qui se passe ensuite dépend du
// mode d'équité choisi à la création (`ModeEquite`) — parce qu'un groupe de
// potes qui se fait confiance a le droit de tout se donner, et qu'un groupe qui
// joue le titre a le droit de l'interdire.
//
// ⚠️ CETTE VALEUR N'EST PAS UN PRIX. Personne n'est obligé de vendre à ce
// prix-là, et le marché fixe le sien (une enchère peut tripler la mise). Elle
// sert à REPÉRER L'ABERRATION, pas à cadrer le commerce. Un joueur vendu 20 %
// sous sa valeur, c'est une bonne affaire ; vendu 98 % en dessous, c'est un
// cadeau déguisé.

import type { CarteJoueur, ModeEquite } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LE BARÈME
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Le point d'ancrage, donné par la demande : « OVR 82 → valeur estimée
 * 35-50k OVA ». On vise le milieu de la fourchette.
 */
const NOTE_REFERENCE = 82;
const VALEUR_REFERENCE = 42_000;

/**
 * Ce que vaut un point de note.
 *
 * ⚠️ EXPONENTIEL, PAS LINÉAIRE, et c'est ce qui fait tout le mode. Avec un
 * barème linéaire, deux joueurs à 74 valent un joueur à 84 : il suffirait
 * d'empiler du milieu de gamme pour acheter une star, et plus personne n'aurait
 * à négocier — il n'y aurait qu'à additionner. Avec ce facteur, un 88 vaut
 * quatre 74 : la star reste hors de portée d'un simple tas de cartes moyennes,
 * et pour l'obtenir il faut parler à celui qui l'a.
 *
 * 1,167 par point donne : 65 → 3 000 · 75 → 14 000 · 82 → 42 000 ·
 * 88 → 106 000 · 91 → 169 000. À comparer aux **37 950 OVA** qu'une saison de
 * 18 journées rapporte à un club moyen (chiffre mesuré par
 * `npm run verify:ligue`, voir `gainsDeSaisonEstimes`) : un joueur à 88 vaut
 * donc près de trois saisons de tout ce qu'on gagne. Il ne s'achète pas, il se
 * négocie.
 */
const FACTEUR_PAR_POINT = 1.167;

/** Plancher : une carte a toujours un prix, même à 55. */
const VALEUR_PLANCHER = 250;

/**
 * L'âge, en multiplicateur.
 *
 * ⚠️ LE PIC EST À 27 ANS, comme dans le reste du jeu (`AGE_PIC`,
 * lib/effectif.ts). Le barème n'est pas le même — ici on cote un actif, là on
 * calcule une note — mais l'âge charnière doit l'être, sinon un joueur perd de
 * la valeur une saison avant de perdre de la note, et personne ne comprend.
 */
function facteurAge(age: number): number {
  if (age <= 20) return 1.30;
  if (age <= 23) return 1.20;
  if (age <= 26) return 1.08;
  if (age <= 29) return 1.00;
  if (age <= 31) return 0.82;
  if (age <= 33) return 0.62;
  return 0.42;
}

/**
 * Le potentiel restant, en multiplicateur.
 *
 * « Tu packs Léo Martin, 19 ans, OVR 68, POT 88. Ton pote rigole. Deux saisons
 * plus tard : OVR 84. » Pour que cette histoire existe, il faut que le jeune à
 * gros potentiel ait une valeur SUPÉRIEURE à sa note — sinon son propriétaire
 * le vend pour trois francs six sous et l'histoire n'arrive jamais.
 *
 * ⚠️ MAIS PAS TROP : le pote doit pouvoir rigoler. Si un 68/88 valait déjà le
 * prix d'un 80, il n'y aurait plus de pari — juste un prix à payer. Le bonus
 * plafonne à +45 %, et il s'éteint avec l'âge : à 28 ans, un potentiel inatteint
 * ne vaut plus rien, c'est un joueur qui n'a pas percé.
 */
function facteurPotentiel(note: number, potentiel: number, age: number): number {
  const marge = Math.max(0, Math.min(20, potentiel - note));
  const jeunesse = age <= 21 ? 1 : age <= 24 ? 0.7 : age <= 26 ? 0.35 : 0;
  return 1 + (marge / 20) * 0.45 * jeunesse;
}

/**
 * LA valeur de référence d'une carte, en OVA. Une seule définition — l'écran,
 * le marché, les enchères et le contrôle d'équité lisent celle-ci.
 */
export function valeurCarte(carte: Pick<CarteJoueur, 'note' | 'age' | 'potentiel'>): number {
  const base = VALEUR_REFERENCE * Math.pow(FACTEUR_PAR_POINT, carte.note - NOTE_REFERENCE);
  const brut = base * facteurAge(carte.age) * facteurPotentiel(carte.note, carte.potentiel, carte.age);
  const arrondi = arrondirPrix(Math.max(VALEUR_PLANCHER, brut));
  return arrondi;
}

/**
 * Arrondi « lisible » : on ne montre jamais 41 837 OVA.
 *
 * ⚠️ ET IL EST PROGRESSIF. Un pas fixe de 500 donnerait « 250 » et « 500 » pour
 * deux cartes du bas de tableau qui n'ont rien à voir, et « 42 000 » et
 * « 42 500 » pour deux stars qu'on ne distingue pas. Le pas suit l'ordre de
 * grandeur.
 */
function arrondirPrix(v: number): number {
  const pas = v >= 50_000 ? 1_000 : v >= 10_000 ? 500 : v >= 2_000 ? 100 : 50;
  return Math.round(v / pas) * pas;
}

/**
 * La fourchette affichée : ± 18 % autour de la valeur.
 * Un 82 donne bien « 35 000 – 50 000 OVA », comme demandé.
 */
export function fourchetteCarte(
  carte: Pick<CarteJoueur, 'note' | 'age' | 'potentiel'>,
): { bas: number; haut: number } {
  const v = valeurCarte(carte);
  return { bas: arrondirPrix(v * 0.82), haut: arrondirPrix(v * 1.18) };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. L'ÉQUILIBRE D'UN ÉCHANGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les seuils d'alerte, en écart relatif entre les deux côtés de l'offre.
 *
 * ⚠️ CES DEUX CHIFFRES SONT LE COMPROMIS DU MODE, et ils sont volontairement
 * larges. Trop serrés, ils interdisent les échanges qui font le sel d'une ligue
 * — céder un 78 sous sa valeur parce qu'on a besoin d'un talonneur maintenant,
 * c'est du jeu, pas de la triche. Trop larges, ils laissent passer le cadeau.
 *
 * 25 % : c'est une mauvaise affaire, on la signale et on continue.
 * 60 % : ce n'est plus un échange, c'est un transfert de patrimoine.
 */
export const SEUILS_EQUITE = { doute: 0.25, aberrant: 0.60 } as const;

export type VerdictEquite = 'equilibre' | 'discutable' | 'aberrant';

export interface BilanEchange {
  /** Valeur totale de ce que l'émetteur donne (cartes + OVA). */
  valeurDonnee: number;
  /** Valeur totale de ce qu'il reçoit. */
  valeurRecue: number;
  /**
   * Écart relatif, entre 0 et 1, toujours rapporté au CÔTÉ LE PLUS GROS.
   * 0 = les deux côtés valent pareil ; 1 = un côté est vide.
   */
  ecart: number;
  /** Qui profite de l'échange. `null` s'il est équilibré. */
  favorise: 'emetteur' | 'destinataire' | null;
  verdict: VerdictEquite;
}

/**
 * Pèse une offre. Les OVA comptent pour leur montant : c'est le seul point de
 * comparaison possible entre une carte et de l'argent.
 */
export function peserEchange(
  cartesDonnees: readonly Pick<CarteJoueur, 'note' | 'age' | 'potentiel'>[],
  ovaDonnes: number,
  cartesRecues: readonly Pick<CarteJoueur, 'note' | 'age' | 'potentiel'>[],
  ovaRecus: number,
): BilanEchange {
  const valeurDonnee = cartesDonnees.reduce((t, c) => t + valeurCarte(c), 0) + Math.max(0, ovaDonnes);
  const valeurRecue = cartesRecues.reduce((t, c) => t + valeurCarte(c), 0) + Math.max(0, ovaRecus);
  const gros = Math.max(valeurDonnee, valeurRecue);
  // ⚠️ DEUX CÔTÉS VIDES : ce n'est pas « équilibré », c'est une offre vide. Le
  // serveur la refuse en amont, mais rendre `ecart: NaN` ferait passer tous les
  // tests de seuil (NaN > x est faux) — donc tout serait autorisé.
  const ecart = gros <= 0 ? 0 : Math.abs(valeurDonnee - valeurRecue) / gros;
  const verdict: VerdictEquite = ecart >= SEUILS_EQUITE.aberrant
    ? 'aberrant'
    : ecart >= SEUILS_EQUITE.doute ? 'discutable' : 'equilibre';
  const favorise = verdict === 'equilibre'
    ? null
    : valeurRecue > valeurDonnee ? 'emetteur' : 'destinataire';
  return { valeurDonnee, valeurRecue, ecart, favorise, verdict };
}

export type SuiteEchange = 'autorise' | 'validationCommissaire' | 'refuse';

/**
 * Ce que le serveur fait d'une offre, selon le mode d'équité de la ligue.
 *
 * ⚠️ EN MODE LIBRE, ON N'EMPÊCHE RIEN — mais on JOURNALISE quand même le bilan.
 * Une ligue « libre » n'est pas une ligue aveugle : quand quelqu'un s'étonne en
 * mars que Hugo aligne quatre joueurs à 85, l'historique doit pouvoir raconter
 * d'où ils viennent. C'est le rôle de `Transaction`.
 */
export function suiteDonneeALEchange(bilan: BilanEchange, equite: ModeEquite): SuiteEchange {
  if (equite === 'libre') return 'autorise';
  if (bilan.verdict === 'equilibre') return 'autorise';
  if (equite === 'fairplay') {
    // En fair-play, seul le franchement aberrant remonte au commissaire : lui
    // demander d'arbitrer chaque échange à 30 % ferait de lui un guichet.
    return bilan.verdict === 'aberrant' ? 'validationCommissaire' : 'autorise';
  }
  // competitif
  return bilan.verdict === 'aberrant' ? 'refuse' : 'autorise';
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LES ENCHÈRES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Le pas minimal d'une enchère.
 *
 * ⚠️ SANS PAS MINIMAL, UNE ENCHÈRE SE GAGNE À +1 OVA — et la dernière seconde
 * devient une course de réflexes, pas une décision. Le pas est relatif : 5 %
 * de l'offre en cours, arrondi, avec un plancher.
 */
export function pasEnchere(offreCourante: number): number {
  return Math.max(100, arrondirPrix(offreCourante * 0.05));
}

/** L'offre minimale acceptable sur une enchère en cours. */
export function offreMinimale(offreCourante: number | null, miseAPrix: number): number {
  if (offreCourante === null) return miseAPrix;
  return offreCourante + pasEnchere(offreCourante);
}

/**
 * PROLONGATION ANTI-SNIPE.
 *
 * « Ton pote arrive à 30 secondes : Hugo RFC — 41 000. » C'est drôle une fois,
 * et c'est insupportable la dixième : celui qui gagne n'est plus celui qui veut
 * le plus le joueur, mais celui qui est devant son écran à 23 h 59. Toute
 * enchère portée dans les deux dernières minutes repousse la clôture d'autant.
 * Ça garde le frisson de la dernière minute et ça rend la surenchère possible.
 */
export const FENETRE_PROLONGATION_MS = 2 * 60 * 1000;

export function clotureApresOffre(clotureActuelle: number, maintenant: number): number {
  const restant = clotureActuelle - maintenant;
  if (restant > FENETRE_PROLONGATION_MS) return clotureActuelle;
  return maintenant + FENETRE_PROLONGATION_MS;
}
