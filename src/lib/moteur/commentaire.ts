// LE COMMENTAIRE — des phrases qui ne se répètent pas.
//
// Un pool de formulations par événement, tiré à la graine du match. Les
// variables sont substituées AVANT le tirage des alternatives : un `{nom}`
// niché dans une alternative casserait la reconnaissance.

import { langueCourante } from '../i18n';
import {
  COMMENTAIRES_DIRECTS, POOLS_COMMENTAIRES,
  type CleCommentaireDirect, type IdPoolCommentaire,
} from '../../data/commentairesMatch';

export type Variables = Record<string, string | number>;

export function phrase(rng: () => number, pool: string[], v: Variables = {}): string {
  const langue = langueCourante();
  const id = ID_PAR_POOL.get(pool);
  const localise = langue !== 'fr' && id ? POOLS_COMMENTAIRES[langue][id] : pool;
  let t = localise[Math.floor(rng() * localise.length)] ?? localise[0] ?? '';
  for (const cle of Object.keys(v)) {
    const valeur = cle === 'motif' ? motifLocalise(String(v[cle]), langue) : v[cle];
    t = t.split(`{${cle}}`).join(String(valeur));
  }
  // Alternatives « {a|b|c} », tirées après substitution.
  return t.replace(/\{([^{}]*\|[^{}]*)\}/g, (_, groupe: string) => {
    const choix = groupe.split('|');
    return choix[Math.floor(rng() * choix.length)] ?? choix[0];
  });
}

export const ESSAI = [
  'ESSAI ! {nom} plonge dans l’en-but {precision} !',
  'ESSAI DE {nom} ! Il aplatit {precision}, {le stade explose|c’est magnifique|quelle fin d’action}.',
  'Il y va… ESSAI ! {nom} {precision}, imparable.',
  'ESSAI ! Personne ne rattrape {nom}, il aplatit {precision}.',
];

export const ESSAI_PRECISION = [
  'à la pointe du ballon', 'en coin', 'sous les poteaux', 'au terme d’une action de cent mètres',
  'après avoir résisté à deux plaquages', 'd’un plongeon',
];

export const TRANSFORMATION = [
  'Transformation de {nom}, {facile|sans trembler|au bout du pied}.',
  '{nom} ajuste et transforme.',
  'La transformation est bonne, {nom} ne tremble pas.',
];

export const TRANSFORMATION_RATEE = [
  '{nom} manque la transformation, le ballon passe à côté.',
  'Transformation ratée par {nom}, deux points perdus.',
  '{nom} bute contre le poteau ! Elle est manquée.',
];

export const PENALITE_BUT = [
  'Pénalité de {nom}, trois points de plus.',
  '{nom} l’ajuste depuis {distance} mètres, c’est bon.',
  'Trois points au pied de {nom}, {distance} mètres.',
];

export const PENALITE_RATEE = [
  '{nom} manque la pénalité de {distance} mètres.',
  'La pénalité de {nom} passe à côté, {distance} mètres.',
];

export const DROP = [
  'DROP DE {nom} ! Trois points d’un geste.',
  '{nom} arme un drop… c’est passé !',
];

export const PENALITE = [
  'Pénalité pour {club} — {motif}.',
  'Coup de sifflet : {motif}. Pénalité pour {club}.',
  'M. l’arbitre siffle {motif}, pénalité {club}.',
];

// ⚠️ CETTE LISTE EST UNE TABLE DE TRADUCTION, PAS UN POOL DE TIRAGE. Les motifs
// sont choisis par le moteur (`siffler`) puis retrouvés ICI PAR LEUR INDEX dans
// la langue du joueur (`motifLocalise`). Ajouter un motif oblige donc à
// l'ajouter AU MÊME RANG dans les sept tableaux `motif` de
// `data/commentairesMatch.ts` — sinon une pénalité s'annonce avec le libellé
// d'une autre.
export const MOTIFS_PENALITE = [
  'hors-jeu', 'plaquage haut', 'ballon tenu au sol', 'plaqueur qui ne se relève pas',
  'entrée par le côté au ruck', 'faute technique en mêlée', 'obstruction',
  // Les motifs de discipline (moteur/bagarre.ts) : ils passent par la même
  // table, ce qui leur donne les sept langues sans mécanique de plus.
  'coup de poing', 'bagarre générale', 'antijeu', 'coup de poing relevé sur les images',
];

export const PLAQUAGE = [
  'Gros plaquage de {nom} sur {cible} !',
  '{nom} stoppe {cible} net.',
  '{cible} est cueilli par {nom}.',
  'Plaquage dominateur de {nom}, {cible} recule.',
];

export const FRANCHISSEMENT = [
  '{nom} est dans l’intervalle, il est lancé !',
  'Cadrage-débordement de {nom} — la ligne est franchie !',
  '{nom} casse le premier rideau, il y a de l’espace !',
  'Quelle accélération de {nom}, il est passé !',
];

export const RUCK_GRATTAGE = [
  'Grattage de {nom} ! Ballon récupéré au sol.',
  '{nom} est dans le ruck, il arrache le ballon !',
  'Turnover ! {nom} sort le ballon du regroupement.',
];

export const EN_AVANT = [
  'En-avant de {nom}, mêlée pour {club}.',
  'Le ballon échappe à {nom} — en-avant.',
  'Ballon perdu par {nom}, l’arbitre siffle l’en-avant.',
];

export const PIED_DEGAGEMENT = [
  '{nom} dégage en touche et rend cinquante mètres.',
  'Chandelle de dégagement de {nom}, l’équipe respire.',
  '{nom} tape par-dessus, le ballon file en touche.',
];

export const PIED_OCCUPATION = [
  '{nom} occupe le terrain au pied.',
  'Coup de pied de déplacement de {nom}, on inverse la pression.',
  '{nom} rend le ballon mais gagne trente mètres.',
];

export const PIED_CHANDELLE = [
  'Chandelle de {nom} — les avants montent dessus !',
  '{nom} envoie un ballon haut, la course est lancée.',
  'Box kick de {nom}, contestable.',
];

export const PIED_5022 = [
  '50/22 de {nom} ! La touche est pour eux !',
  'Quel coup de pied ! {nom} trouve le 50/22.',
];

export const PIED_5022_RATE = [
  '{nom} tente le 50/22, le ballon sort trop tôt.',
  'Tentative de 50/22 manquée par {nom}.',
];

export const PIED_RASANT = [
  'Coup de pied rasant de {nom} derrière la défense !',
  '{nom} glisse un ballon au sol dans le dos du rideau.',
];

export const PIED_TRANSVERSALE = [
  'Transversale de {nom} pour l’aile !',
  '{nom} renverse le jeu d’un coup de pied par-dessus.',
];

export const TOUCHE_GAGNEE = [
  'Touche de {club}, ballon propre pour {nom}.',
  '{nom} prend l’alignement, ballon assuré.',
];

export const TOUCHE_PERDUE = [
  'Touche ratée ! {club} récupère l’alignement.',
  'Lancer pas droit, le ballon change de camp.',
  '{nom} contre en touche, quel timing !',
];

export const MELEE_GAGNEE = [
  'Mêlée solide de {club}, ballon sorti.',
  'Ballon propre en sortie de mêlée pour {club}.',
];

export const MELEE_DOMINEE = [
  'La mêlée de {club} recule, pénalité contre elle.',
  'Mêlée dominatrice ! {club} avance et obtient la pénalité.',
];

export const MAUL = [
  'Ballon porté de {club}, ça avance !',
  'Le maul se met en route pour {club}.',
];

export const MAUL_ESSAI = [
  'ESSAI au terme du ballon porté ! {nom} pose le ballon.',
  'Le maul enfonce tout — ESSAI de {nom} !',
];

export const CARTON = [
  'CARTON JAUNE pour {nom} — {motif}. {club} à quatorze pour dix minutes.',
  'L’arbitre sort le jaune : {nom} quitte le terrain dix minutes.',
];

export const REMPLACEMENT = [
  '{entrant} remplace {sortant}.',
  'Changement pour {club} : {entrant} entre à la place de {sortant}.',
];

export const PICK_AND_GO = [
  '{nom} repart au ras, il gagne le premier mètre.',
  'Pick and go de {nom}, ça pilonne.',
];

export const PERCUSSION = [
  '{nom} percute au ras, la défense recule.',
  'Un temps de plus par {nom} dans l’axe.',
];

export const ECARTEMENT = [
  'Le ballon voyage… {nom} le reçoit au large !',
  'Ça écarte vite, {nom} est servi à l’aile !',
  'Surnombre au large — le ballon file jusqu’à {nom} !',
];

const ID_PAR_POOL = new Map<string[], IdPoolCommentaire>([
  [ESSAI, 'essai'], [ESSAI_PRECISION, 'precision'],
  [TRANSFORMATION, 'transformation'], [TRANSFORMATION_RATEE, 'transformationRatee'],
  [PENALITE_BUT, 'penaliteBut'], [PENALITE_RATEE, 'penaliteRatee'],
  [DROP, 'drop'], [PENALITE, 'penalite'], [MOTIFS_PENALITE, 'motif'],
  [PLAQUAGE, 'plaquage'], [FRANCHISSEMENT, 'franchissement'],
  [RUCK_GRATTAGE, 'grattage'], [EN_AVANT, 'enAvant'],
  [PIED_DEGAGEMENT, 'degagement'], [PIED_OCCUPATION, 'occupation'],
  [PIED_CHANDELLE, 'chandelle'], [PIED_5022, 'cinquanteVingtDeux'],
  [PIED_5022_RATE, 'cinquanteVingtDeuxRate'], [PIED_RASANT, 'rasant'],
  [PIED_TRANSVERSALE, 'transversale'], [TOUCHE_GAGNEE, 'toucheGagnee'],
  [TOUCHE_PERDUE, 'touchePerdue'], [MELEE_GAGNEE, 'meleeGagnee'],
  [MELEE_DOMINEE, 'meleeDominee'], [MAUL, 'maul'], [MAUL_ESSAI, 'maulEssai'],
  [CARTON, 'carton'], [REMPLACEMENT, 'remplacement'],
  [PICK_AND_GO, 'pickAndGo'], [PERCUSSION, 'percussion'], [ECARTEMENT, 'ecartement'],
]);

function motifLocalise(motif: string, langue: ReturnType<typeof langueCourante>): string {
  if (langue === 'fr') return motif;
  const index = MOTIFS_PENALITE.indexOf(motif);
  return index >= 0 ? (POOLS_COMMENTAIRES[langue].motif[index] ?? motif) : motif;
}

/**
 * Le motif d'une sanction dans la langue du joueur.
 *
 * Le moteur travaille en français (c'est sa langue source, comme tout le
 * projet) ; l'écran de fin de match, lui, doit annoncer « punch » à un joueur
 * anglais. Même table que les pénalités : une seule liste à tenir.
 */
export function motifTraduit(motif: string): string {
  return motifLocalise(motif, langueCourante());
}

export function texteMatch(cle: CleCommentaireDirect, vars: Variables = {}): string {
  const langue = langueCourante();
  let texte = COMMENTAIRES_DIRECTS[langue][cle];
  for (const [nom, valeurBrute] of Object.entries(vars)) {
    const valeur = nom === 'motif' ? motifLocalise(String(valeurBrute), langue) : valeurBrute;
    texte = texte.split(`{${nom}}`).join(String(valeur));
  }
  return texte;
}
