// L'APPARENCE DE TON JOUEUR — création, personnalisation, match
//
// Tout ce qui se voit sur le corps du joueur vit ICI, dans un seul objet
// (`ApparenceJoueur`, rangé dans `Joueur.apparence`) :
//   - le teint, appliqué au visage, aux bras, aux jambes et aux mains (le lecteur 3D
//     peint le corps ENTIER d'une couleur de peau : jamais le maillot, jamais de blanc) ;
//   - la coupe de cheveux et sa couleur — les 23 maillages récupérés de l'APK ;
//   - la barbe et sa couleur — les 15 maillages ;
//   - la morphologie, en valeurs lisibles (taille, poids, épaules, muscle, torse, bras, jambes).
//
// ⚠️ LA MORPHOLOGIE EST BORNÉE, ET C'EST VOULU. Le rig et les animations récupérés sont
// calés sur un corps moyen : au-delà de ±12 % les pieds quittent le sol, la prise du ballon
// se décale et les épaules traversent le buste. `morphoPourScene` ne rend JAMAIS un facteur
// hors de ces bornes, quelles que soient les valeurs saisies ou une sauvegarde abîmée.
//
// ⚠️ L'ÉQUIPEMENT N'EST PAS ICI. Casque et crampons viennent de `equipementActif` (la boutique) ;
// `equipementPourScene` les traduit en modèles. Le modèle du joueur LIT ces valeurs une seule
// fois, à l'entrée du match : aucun accès au store pendant les images.

import type { PosteId } from '../types.js';
import { apparenceJoueurMatch, type ApparenceMatch } from './moteur/apparenceMatch.js';
import { EQUIPEMENT_PAR_ID } from '../data/boutique.js';
import type { CategorieEquipement } from '../data/boutique.js';

// --- Catalogues --------------------------------------------------------------

/** Les sept teints du lecteur 3D (`skins` de `public/rn26/corps.js`), du plus clair au plus foncé. */
export const TEINTS_PEAU = ['#e2b99a', '#d3a17c', '#c99168', '#ad7651', '#875333', '#623b29', '#452d23'] as const;

export type FamilleCoupe = 'ras' | 'court' | 'miLong' | 'long' | 'boucle';
export type FamilleBarbe = 'moustache' | 'bouc' | 'courte' | 'longue';

/** Les maillages de coiffure de l'APK, rangés par ce qu'on VOIT une fois le masque appliqué (`COIFFURES` de `corps.js`). */
export const COUPES: readonly { id: string; famille: FamilleCoupe }[] = [
  ...(['19', '18', '16'] as const).map((id) => ({ id, famille: 'ras' as const })),
  ...(['09', '13', '14', '21', '23', '12'] as const).map((id) => ({ id, famille: 'court' as const })),
  ...(['01', '02', '10'] as const).map((id) => ({ id, famille: 'miLong' as const })),
  ...(['03', '05', '06', '07', '08', '25', '11'] as const).map((id) => ({ id, famille: 'long' as const })),
  ...(['22', '15', '17', '24'] as const).map((id) => ({ id, famille: 'boucle' as const })),
];

export const BARBES: readonly { id: string; famille: FamilleBarbe }[] = [
  { id: '01', famille: 'moustache' },
  ...(['02', '03', '04'] as const).map((id) => ({ id, famille: 'bouc' as const })),
  ...(['05', '06', '07', '08', '09', '10'] as const).map((id) => ({ id, famille: 'courte' as const })),
  ...(['11', '12', '13', '14', '15'] as const).map((id) => ({ id, famille: 'longue' as const })),
];

/** Couleurs de cheveux proposées : noir, châtain, brun, roux, blond, gris, blanc. */
export const COULEURS_CHEVEUX = [
  '#15110f', '#2a211c', '#4a3324', '#6a4a30', '#8a5a2b', '#a8431f', '#c2a063', '#d8c27a', '#7b7774', '#d9d6d0',
] as const;

// --- Morphologie ---------------------------------------------------------------

/** Valeurs lisibles. `epaules`, `muscle`, `torse`, `bras`, `jambes` vont de −1 (menu) à +1 (imposant). */
export interface MorphoJoueur {
  tailleCm: number;
  poidsKg: number;
  epaules: number;
  muscle: number;
  torse: number;
  bras: number;
  jambes: number;
}

export const LIMITES_MORPHO = { tailleCm: [165, 208], poidsKg: [68, 140] } as const;
export const TAILLE_REFERENCE_CM = 186;

export interface ApparenceJoueur {
  /** Indice dans `TEINTS_PEAU`. */
  peau: number;
  /** Identifiant du maillage de coiffure, ou '' pour chauve. */
  coupe: string;
  couleurCheveux: string;
  /** Identifiant du maillage de barbe, ou '' pour aucune. */
  barbe: string;
  /** Absente : la barbe prend la couleur des cheveux. */
  couleurBarbe?: string;
  morpho: MorphoJoueur;
  /** `true` une fois la carrière lancée : taille, poids et carrure ne changent plus (personnalisation). */
  morphoFigee?: boolean;
}

const borner = (x: number, a: number, b: number) => Math.min(b, Math.max(a, Number.isFinite(x) ? x : (a + b) / 2));

/** Morphologie conseillée par le poste (le joueur reste libre de la modifier). */
export const MORPHO_PAR_POSTE: Record<PosteId, MorphoJoueur> = {
  pilier_gauche: { tailleCm: 185, poidsKg: 121, epaules: 0.4, muscle: 0.7, torse: 0.8, bras: 0.2, jambes: 0.1 },
  talonneur: { tailleCm: 182, poidsKg: 110, epaules: 0.4, muscle: 0.6, torse: 0.6, bras: 0.2, jambes: 0.1 },
  pilier_droit: { tailleCm: 186, poidsKg: 123, epaules: 0.4, muscle: 0.7, torse: 0.8, bras: 0.2, jambes: 0.1 },
  deuxieme_ligne_g: { tailleCm: 199, poidsKg: 117, epaules: 0.3, muscle: 0.4, torse: 0.2, bras: 0.3, jambes: 0.4 },
  deuxieme_ligne_d: { tailleCm: 199, poidsKg: 117, epaules: 0.3, muscle: 0.4, torse: 0.2, bras: 0.3, jambes: 0.4 },
  troisieme_aile_g: { tailleCm: 191, poidsKg: 107, epaules: 0.3, muscle: 0.5, torse: 0.2, bras: 0.1, jambes: 0.2 },
  troisieme_aile_d: { tailleCm: 191, poidsKg: 107, epaules: 0.3, muscle: 0.5, torse: 0.2, bras: 0.1, jambes: 0.2 },
  numero_8: { tailleCm: 194, poidsKg: 113, epaules: 0.3, muscle: 0.5, torse: 0.3, bras: 0.2, jambes: 0.3 },
  demi_melee: { tailleCm: 176, poidsKg: 82, epaules: -0.2, muscle: 0.1, torse: -0.2, bras: -0.1, jambes: 0 },
  demi_ouverture: { tailleCm: 183, poidsKg: 88, epaules: 0, muscle: 0.2, torse: -0.1, bras: 0, jambes: 0.1 },
  ailier_gauche: { tailleCm: 186, poidsKg: 92, epaules: 0, muscle: 0.2, torse: -0.2, bras: 0, jambes: 0.4 },
  premier_centre: { tailleCm: 188, poidsKg: 100, epaules: 0.2, muscle: 0.4, torse: 0.1, bras: 0.1, jambes: 0.2 },
  deuxieme_centre: { tailleCm: 189, poidsKg: 101, epaules: 0.2, muscle: 0.4, torse: 0.1, bras: 0.1, jambes: 0.2 },
  ailier_droit: { tailleCm: 186, poidsKg: 92, epaules: 0, muscle: 0.2, torse: -0.2, bras: 0, jambes: 0.4 },
  arriere: { tailleCm: 187, poidsKg: 93, epaules: 0, muscle: 0.2, torse: -0.1, bras: 0, jambes: 0.3 },
};

export function morphoConseillee(poste: PosteId): MorphoJoueur {
  return { ...(MORPHO_PAR_POSTE[poste] ?? MORPHO_PAR_POSTE.arriere) };
}

/** Une morphologie propre : chaque valeur bornée, un corps toujours plausible (IMC entre 21 et 36). */
export function morphoValide(m: Partial<MorphoJoueur> | undefined, poste: PosteId): MorphoJoueur {
  const base = morphoConseillee(poste);
  const tailleCm = Math.round(borner(m?.tailleCm ?? base.tailleCm, ...LIMITES_MORPHO.tailleCm));
  let poidsKg = Math.round(borner(m?.poidsKg ?? base.poidsKg, ...LIMITES_MORPHO.poidsKg));
  poidsKg = Math.round(borner(poidsKg, 21 * (tailleCm / 100) ** 2, 36 * (tailleCm / 100) ** 2));
  const l = (x: number | undefined, defaut: number) => borner(x ?? defaut, -1, 1);
  return {
    tailleCm, poidsKg,
    epaules: l(m?.epaules, base.epaules), muscle: l(m?.muscle, base.muscle), torse: l(m?.torse, base.torse),
    bras: l(m?.bras, base.bras), jambes: l(m?.jambes, base.jambes),
  };
}

/** Les facteurs d'échelle que lit le lecteur 3D, tous bornés à ±12 %. */
export interface MorphoScene { hauteur: number; largeur: number; epaisseur: number; epaules: number; bras: number; jambes: number }

export function morphoPourScene(m: MorphoJoueur): MorphoScene {
  const h = m.tailleCm / 100;
  const imc = m.poidsKg / (h * h);
  // 27 : l'IMC d'un joueur de référence (186 cm, 93 kg) ; chaque point d'écart pèse 1,8 % de carrure.
  const corpulence = 1 + (imc - 27) * 0.018;
  const bornes = (x: number) => borner(x, 0.88, 1.12);
  return {
    hauteur: bornes(m.tailleCm / TAILLE_REFERENCE_CM),
    largeur: bornes(corpulence * (1 + m.muscle * 0.03)),
    epaisseur: bornes(corpulence * (1 + m.torse * 0.05) * (1 + m.muscle * 0.02)),
    epaules: bornes(1 + m.epaules * 0.08),
    bras: bornes(1 + m.bras * 0.06 + m.muscle * 0.03),
    jambes: bornes(1 + m.jambes * 0.05 + m.muscle * 0.02),
  };
}

// --- Apparence ------------------------------------------------------------------

/** Une apparence de départ, tirée au hasard par `graine`, avec la morphologie conseillée pour le poste. */
export function apparencePourPoste(poste: PosteId, graine = 0): ApparenceJoueur {
  const h = (n: number) => { let x = Math.imul(graine + 1, 0x9e3779b1) ^ Math.imul(n + 7, 0x85ebca6b); x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d); return ((x ^ (x >>> 15)) >>> 0) / 4294967296; };
  const peau = Math.floor(h(1) * TEINTS_PEAU.length);
  const sombre = peau >= 4;
  const couleurCheveux = COULEURS_CHEVEUX[sombre ? Math.floor(h(2) * 3) : Math.floor(h(2) * COULEURS_CHEVEUX.length)];
  const court = COUPES.filter((c) => c.famille === 'court' || c.famille === 'ras');
  return {
    peau, couleurCheveux,
    coupe: court[Math.floor(h(3) * court.length)].id,
    barbe: h(4) < 0.6 ? '' : BARBES[Math.floor(h(5) * BARBES.length)].id,
    morpho: morphoConseillee(poste),
  };
}

/** Une apparence lue sur une sauvegarde : tout champ manquant ou invalide est remplacé, rien ne plante. */
export function apparenceValide(a: Partial<ApparenceJoueur> | undefined, poste: PosteId): ApparenceJoueur {
  const base = apparencePourPoste(poste, 0);
  const coupeOk = a?.coupe === '' || COUPES.some((c) => c.id === a?.coupe);
  const barbeOk = a?.barbe === '' || BARBES.some((b) => b.id === a?.barbe);
  const couleur = (x: unknown) => (typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x) ? x : undefined);
  return {
    peau: Number.isInteger(a?.peau) && (a!.peau as number) >= 0 && (a!.peau as number) < TEINTS_PEAU.length ? (a!.peau as number) : base.peau,
    coupe: coupeOk ? (a!.coupe as string) : base.coupe,
    couleurCheveux: couleur(a?.couleurCheveux) ?? base.couleurCheveux,
    barbe: barbeOk ? (a!.barbe as string) : base.barbe,
    couleurBarbe: couleur(a?.couleurBarbe),
    morpho: morphoValide(a?.morpho, poste),
    morphoFigee: !!a?.morphoFigee,
  };
}

/** Ce que la personnalisation permet de changer après la création (taille, poids et carrure sont figés). */
export function personnaliser(actuelle: ApparenceJoueur, changement: Partial<Omit<ApparenceJoueur, 'morpho' | 'morphoFigee'>>, poste: PosteId): ApparenceJoueur {
  return apparenceValide({ ...actuelle, ...changement, morpho: actuelle.morpho, morphoFigee: actuelle.morphoFigee }, poste);
}

// --- Équipement porté -------------------------------------------------------------

export interface ModelePorte { modele: string; teinte?: string }
export interface EquipementPorte { casque?: ModelePorte; crampons?: ModelePorte }

/** `/m3d/casque-rouge.glb` → `casque-rouge` : le nom du modèle allégé de `public/rn26/decor/equipement/`. */
function modeleDe(glb: string | undefined): string | undefined {
  const m = glb?.match(/\/([a-z0-9-]+)\.glb$/i);
  return m?.[1];
}

/** Traduit `equipementActif` (identifiants de la boutique) en modèles pour la scène. Lu une fois, à l'entrée du match. */
export function equipementPourScene(actif: Partial<Record<CategorieEquipement, string>> | undefined): EquipementPorte {
  const sortie: EquipementPorte = {};
  for (const [cle, categorie] of [['casque', 'casque'], ['crampons', 'crampons']] as const) {
    const article = actif?.[categorie] ? EQUIPEMENT_PAR_ID[actif[categorie]!] : undefined;
    const modele = modeleDe(article?.glb);
    if (article && modele) sortie[cle] = { modele, ...(article.teinte ? { teinte: article.teinte } : {}) };
  }
  return sortie;
}

// --- Passage vers le moteur et la scène ---------------------------------------------

const COIFFURE_DE_FAMILLE: Record<FamilleCoupe, 'buzz' | 'short' | 'messy' | 'long' | 'curly'> = {
  ras: 'buzz', court: 'short', miLong: 'messy', long: 'long', boucle: 'curly',
};
const BARBE_DE_FAMILLE: Record<FamilleBarbe, 'moustache' | 'goatee' | 'short_beard' | 'full_beard'> = {
  moustache: 'moustache', bouc: 'goatee', courte: 'short_beard', longue: 'full_beard',
};

/** Les champs que le match (moteur, scène 3D, sprites) sait lire. */
export interface SurchargeApparence {
  tailleCm?: number; poidsKg?: number; peau?: string; cheveux?: string;
  coiffure?: 'bald' | 'buzz' | 'short' | 'messy' | 'long' | 'curly';
  barbe?: 'none' | 'moustache' | 'goatee' | 'short_beard' | 'full_beard';
  coupeId?: string; barbeId?: string; couleurBarbe?: string;
  morpho?: MorphoScene;
  equipement?: EquipementPorte;
}

export function surchargeDeMatch(
  apparence: ApparenceJoueur | undefined, poste: PosteId,
  actif?: Partial<Record<CategorieEquipement, string>>,
): SurchargeApparence {
  const equipement = equipementPourScene(actif);
  if (!apparence) return { equipement };
  const a = apparenceValide(apparence, poste);
  const coupe = COUPES.find((c) => c.id === a.coupe);
  const barbe = BARBES.find((b) => b.id === a.barbe);
  return {
    tailleCm: a.morpho.tailleCm, poidsKg: a.morpho.poidsKg,
    peau: TEINTS_PEAU[a.peau], cheveux: a.couleurCheveux,
    coiffure: coupe ? COIFFURE_DE_FAMILLE[coupe.famille] : 'bald',
    barbe: barbe ? BARBE_DE_FAMILLE[barbe.famille] : 'none',
    coupeId: a.coupe, barbeId: a.barbe, couleurBarbe: a.couleurBarbe,
    morpho: morphoPourScene(a.morpho),
    equipement,
  };
}

/**
 * L'apparence complète telle que le match la lira, pour un aperçu : le tirage d'origine (sauvegardes anciennes),
 * recouvert par ce que le joueur a choisi et par ce qu'il porte. Calculée sans attendre le registre du match.
 */
export function apparencePourApercu(
  nom: string, poste: PosteId, apparence: ApparenceJoueur | undefined,
  actif?: Partial<Record<CategorieEquipement, string>>,
): ApparenceMatch {
  const base = apparenceJoueurMatch(nom, poste);
  const s = surchargeDeMatch(apparence, poste, actif);
  return { ...base, ...Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)) } as ApparenceMatch;
}

const distanceCouleur = (a: string, b: string) => {
  const n = (h: string) => Number.parseInt(h.replace('#', ''), 16);
  const [x, y] = [n(a), n(b)];
  return Math.hypot((x >> 16) - (y >> 16), ((x >> 8) & 255) - ((y >> 8) & 255), (x & 255) - (y & 255));
};
const plusProche = (couleur: string, palette: readonly string[]) => palette.reduce((m, c, i) => (distanceCouleur(couleur, c) < distanceCouleur(couleur, palette[m]) ? i : m), 0);

/**
 * Le point de départ d'une personnalisation pour un joueur né AVANT l'étape « Apparence » : on traduit ce que
 * le match lui donne aujourd'hui (tirage sur son nom) en choix du catalogue, pour que l'éditeur s'ouvre sur ce
 * qu'on voit déjà. Son physique est alors figé tel qu'il est.
 */
export function apparenceDepuisMatch(nom: string, poste: PosteId): ApparenceJoueur {
  const m = apparenceJoueurMatch(nom, poste);
  const famille: Record<string, FamilleCoupe | undefined> = { buzz: 'ras', short: 'court', fade: 'court', mohawk: 'court', messy: 'miLong', mullet: 'miLong', long: 'long', dreadlocks: 'long', curly: 'boucle', afro: 'boucle' };
  const familleBarbe: Record<string, FamilleBarbe | undefined> = { moustache: 'moustache', goatee: 'bouc', short_beard: 'courte', full_beard: 'longue' };
  return apparenceValide({
    peau: plusProche(m.peau, TEINTS_PEAU),
    coupe: famille[m.coiffure] ? COUPES.find((c) => c.famille === famille[m.coiffure])!.id : '',
    couleurCheveux: COULEURS_CHEVEUX[plusProche(m.cheveux, COULEURS_CHEVEUX)],
    barbe: familleBarbe[m.barbe] ? BARBES.find((b) => b.famille === familleBarbe[m.barbe])!.id : '',
    morpho: { ...morphoConseillee(poste), tailleCm: m.tailleCm, poidsKg: m.poidsKg },
    morphoFigee: true,
  }, poste);
}
