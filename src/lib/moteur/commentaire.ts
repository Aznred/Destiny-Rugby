// LE COMMENTAIRE — des phrases qui ne se répètent pas.
//
// Un pool de formulations par événement, tiré à la graine du match. Les
// variables sont substituées AVANT le tirage des alternatives : un `{nom}`
// niché dans une alternative casserait la reconnaissance.

import { langueCourante } from '../i18n.js';
import {
  COMMENTAIRES_DIRECTS, POOLS_COMMENTAIRES,
  type CleCommentaireDirect, type IdPoolCommentaire,
} from '../../data/commentairesMatch.js';

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
  '{nom} fixe le dernier défenseur et va au bout : ESSAI {precision} !',
  'Le ballon ressort vite, {nom} attaque l’espace et marque {precision} !',
  'Après une longue séquence, {nom} trouve enfin la brèche : ESSAI !',
  '{nom} résiste au retour et tend le bras : cinq points !',
  'Essai en première main ! {nom} conclut le mouvement {precision}.',
  'Turnover, relance, accélération : {nom} termine le travail {precision} !',
  '{nom} ramasse au ras et s’arrache jusqu’à la ligne : ESSAI !',
  'La défense glisse trop tard, {nom} déborde et aplatit {precision}.',
];

export const ESSAI_PRECISION = [
  'à la pointe du ballon', 'en coin', 'sous les poteaux', 'au terme d’une action de cent mètres',
  'après avoir résisté à deux plaquages', 'd’un plongeon',
  'le long de la ligne de touche', 'après une passe intérieure', 'au pied du poteau',
  'sur une passe sautée', 'après un petit coup de pied à suivre', 'à la sortie d’un ruck rapide',
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

export const TRANSFORMATION_CONTREE = [
  '💥 CONTRE ! {contreur} a jailli dès la course d’élan et contre la transformation de {nom} !',
  'Incroyable contre de {contreur} ! La transformation de {nom} est déviée au sol.',
  '{contreur} a surgi à pleine vitesse et contre le tir de {nom} au tee !',
];

export const PENALITE_BUT = [
  'Pénalité de {nom}, trois points de plus.',
  '{nom} l’ajuste depuis {distance} mètres, c’est bon.',
  'Trois points au pied de {nom}, {distance} mètres.',
  '{nom} prend son temps et récompense la faute : trois points.',
  'Le ballon fend les poteaux depuis {distance} mètres, signé {nom}.',
  '{nom} ne laisse rien passer : pénalité réussie.',
];

export const PENALITE_RATEE = [
  '{nom} manque la pénalité de {distance} mètres.',
  'La pénalité de {nom} passe à côté, {distance} mètres.',
  'Le ballon fuit à droite : échec de {nom}.',
  '{nom} trouve le poteau, pas les trois points.',
  'Tentative trop courte de {nom} depuis {distance} mètres.',
];

export const DROP = [
  'DROP DE {nom} ! Trois points d’un geste.',
  '{nom} arme un drop… c’est passé !',
];

export const PENALITE = [
  'Pénalité pour {club} : {motif}.',
  'Coup de sifflet : {motif}. Pénalité pour {club}.',
  'M. l’arbitre siffle {motif}, pénalité {club}.',
  'Avantage terminé : {motif}. {club} récupère une pénalité.',
  'Le capitaine montre les poteaux après cette faute : {motif}.',
  'Le sifflet coupe l’action, {motif} contre la défense.',
  'L’arbitre est formel : {motif}. Ballon à {club}.',
  'La pression paie pour {club} : {motif}.',
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
  'hors-jeu au ruck', 'soutien qui plonge au ruck', 'mêlée écroulée',
  'maul écroulé', 'plaquage sans ballon',
];

export const PLAQUAGE = [
  'Gros plaquage de {nom} sur {cible} !',
  '{nom} stoppe {cible} net.',
  '{cible} est cueilli par {nom}.',
  'Plaquage dominateur de {nom}, {cible} recule.',
];

export const FRANCHISSEMENT = [
  '{nom} est dans l’intervalle, il est lancé !',
  'Cadrage-débordement de {nom}, la ligne est franchie !',
  '{nom} casse le premier rideau, il y a de l’espace !',
  'Quelle accélération de {nom}, il est passé !',
];

export const RUCK_GRATTAGE = [
  'Grattage de {nom} ! Ballon récupéré au sol.',
  '{nom} est dans le ruck, il arrache le ballon !',
  'Turnover ! {nom} sort le ballon du regroupement.',
  '{nom} reste sur ses appuis et gagne la pénalité au sol !',
  'Le soutien arrive trop tard : {nom} gratte ce ballon.',
  '{nom} verrouille le ballon, turnover pour son équipe !',
  'Quel contest de {nom} ! Le ruck change de camp.',
];

export const EN_AVANT = [
  'En-avant de {nom}, mêlée pour {club}.',
  'Le ballon échappe à {nom}, en-avant.',
  'Ballon perdu par {nom}, l’arbitre siffle l’en-avant.',
  '{nom} ne maîtrise pas la réception : ballon tombé vers l’avant.',
  'Passe trop dure, {nom} échappe le ballon. Mêlée adverse.',
  'Sous la pression, {nom} commet l’en-avant.',
  'Le ballon rebondit sur les mains de {nom} : mêlée pour {club}.',
];

export const PASSE_AVANT = [
  'Passe en avant de {nom}, mêlée pour {club}.',
  'Le ballon part devant sur la passe de {nom}, l’arbitre siffle.',
  '{nom} a lâché sa passe en avant, mêlée {club}.',
  'La passe de {nom} flotte vers l’avant : le juge de touche l’a vue.',
  '{nom} force la transmission, son partenaire était devant.',
  'Mouvement stoppé : passe en avant de {nom}.',
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
  'Chandelle de {nom}, les avants montent dessus !',
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
  'Lancer précis, {nom} domine dans les airs pour {club}.',
  '{club} varie l’alignement et trouve {nom} au premier bloc.',
  '{nom} capte au fond de la touche, le maul peut se former.',
  'Combinaison propre de {club}, ballon sécurisé par {nom}.',
];

export const TOUCHE_PERDUE = [
  'Touche ratée ! {club} récupère l’alignement.',
  'Lancer pas droit, le ballon change de camp.',
  '{nom} contre en touche, quel timing !',
  'Le lancer est trop long, {club} hérite du ballon.',
  'Mauvaise coordination dans l’alignement : touche volée par {club}.',
  '{nom} surgit devant le sauteur et subtilise le lancer !',
];

export const MELEE_GAGNEE = [
  'Mêlée solide de {club}, ballon sorti.',
  'Ballon propre en sortie de mêlée pour {club}.',
  'Les huit de {club} restent liés, la mêlée est maîtrisée.',
  '{club} stabilise puis libère vite pour son demi de mêlée.',
  'Introduction nette, talonnage propre : possession {club}.',
  'Le pack de {club} absorbe la poussée et conserve son ballon.',
];

export const MELEE_DOMINEE = [
  'La mêlée de {club} recule, pénalité contre elle.',
  'Mêlée dominatrice ! {club} avance et obtient la pénalité.',
  'Le pack de {club} enfonce son vis-à-vis : bras tendu de l’arbitre.',
  'Grosse poussée de {club}, la première ligne adverse se désunit.',
  '{club} tourne la mêlée et gagne le coup de sifflet.',
  'Les crampons labourent la pelouse : {club} prend nettement le dessus.',
];

export const MAUL = [
  'Ballon porté de {club}, ça avance !',
  'Le maul se met en route pour {club}.',
  'Les avants de {club} se lient autour du ballon et avancent.',
  'Ballon caché au cœur du maul, {club} gagne mètre après mètre.',
  'Le paquet de {club} change d’axe et repart vers la ligne.',
  'Maul compact de {club}, la défense recule encore.',
];

export const MAUL_ESSAI = [
  'ESSAI au terme du ballon porté ! {nom} pose le ballon.',
  'Le maul enfonce tout : ESSAI de {nom} !',
  'Le ballon porté traverse la ligne, {nom} aplatit derrière ses avants !',
  'La défense s’écroule dans l’en-but : essai collectif conclu par {nom}.',
  'Tout le pack pousse jusqu’au bout, {nom} libère le ballon et marque !',
];

export const CARTON = [
  'CARTON JAUNE pour {nom} : {motif}. {club} à quatorze pour dix minutes.',
  'L’arbitre sort le jaune : {nom} quitte le terrain dix minutes.',
];

// 💬 CE QUE LES JOUEURS SE DISENT — le contenu des bulles (moteur/bagarre.ts).
//
// ⚠️ COURT, ET SANS INSULTE. Trois contraintes qui ne sont pas de la pudeur :
// une bulle tient dans 120 px au-dessus d'un pion de 20 px, elle est lue en
// une seconde et demie, et le jeu est ouvert aux mineurs. Le chambrage de
// rugby marche très bien au premier degré — c'est du mépris tranquille, pas
// de la grossièreté.
export const CHAMBRAGE = [
  'Tu tiens debout, toi ?',
  'On t’attend, allez.',
  'C’est tout ?',
  'Reste avec nous, ça va être long.',
  'Regarde le tableau.',
  'Tu comptes courir aujourd’hui ?',
  'Encore une heure comme ça.',
  'Doucement, le vieux.',
  'T’as fini ?',
  'Retourne au vestiaire.',
];
export const REMPLACEMENT = [
  '{entrant} remplace {sortant}.',
  'Changement pour {club} : {entrant} entre à la place de {sortant}.',
];

export const PICK_AND_GO = [
  '{nom} repart au ras, il gagne le premier mètre.',
  'Pick and go de {nom}, ça pilonne.',
  '{nom} plonge sur le ballon et repart dans l’axe.',
  'Une passe courte au ras pour {nom}, encore deux mètres.',
  '{nom} baisse les épaules et attaque le petit côté.',
];

export const PERCUSSION = [
  '{nom} percute au ras, la défense recule.',
  'Un temps de plus par {nom} dans l’axe.',
  '{nom} arrive lancé sur l’épaule intérieure du défenseur.',
  'Course droite de {nom}, point de fixation créé.',
  '{nom} gagne le duel au centre du terrain et présente vite.',
];

export const ECARTEMENT = [
  'Le ballon voyage… {nom} le reçoit au large !',
  'Ça écarte vite, {nom} est servi à l’aile !',
  'Surnombre au large, le ballon file jusqu’à {nom} !',
];

const ID_PAR_POOL = new Map<string[], IdPoolCommentaire>([
  [CHAMBRAGE, 'chambrage'],
  [ESSAI, 'essai'], [ESSAI_PRECISION, 'precision'],
  [TRANSFORMATION, 'transformation'], [TRANSFORMATION_RATEE, 'transformationRatee'],
  [PENALITE_BUT, 'penaliteBut'], [PENALITE_RATEE, 'penaliteRatee'],
  [DROP, 'drop'], [PENALITE, 'penalite'], [MOTIFS_PENALITE, 'motif'],
  [PLAQUAGE, 'plaquage'], [FRANCHISSEMENT, 'franchissement'],
  [RUCK_GRATTAGE, 'grattage'], [EN_AVANT, 'enAvant'], [PASSE_AVANT, 'passeAvant'],
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
