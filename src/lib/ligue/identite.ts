// LES IDENTITÉS DE LA LIGUE — codes d'invitation, tags, noms de club
//
// Trois choses différentes, qu'on confond très vite :
//
//   • L'IDENTIFIANT TECHNIQUE (`IdCompte`) — opaque, immuable, invisible. C'est
//     lui, et lui seul, qui dit « c'est la même personne ».
//   • LE PSEUDO — choisi, modifiable, jamais unique. Deux Colin, c'est normal.
//   • LE TAG (`Colin#4821`) — le pseudo plus quatre chiffres tirés du compte.
//     Il sert à s'ajouter en ami sans se tromper de Colin. Il n'est PAS une clé
//     non plus : il suit le pseudo quand celui-ci change.
//
// ⚠️ CETTE SÉPARATION EST UNE LEÇON DÉJÀ PAYÉE. Dans le classement mondial, le
// pseudo servait de clé primaire : deux joueurs homonymes se partageaient une
// ligne, et celui qui avait le score le plus bas n'écrivait rien — sans erreur,
// sans message. Sa carrière n'entrait jamais au classement (voir la migration
// v3 de `serveur/schema-vercel.sql`). On ne recommence pas.

import { graine } from './aleatoire';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LE CODE D'INVITATION
// ═══════════════════════════════════════════════════════════════════════════
// Format : trois lettres, un tiret, cinq caractères. `TLS-8F4K2`.
// Ça se lit à voix haute, ça se recopie sans erreur, ça tient dans un message.

/**
 * ⚠️ ALPHABET SANS `O`, `I`, `L`, `U`, `0`, `1`.
 *
 * Deux raisons, et les deux comptent :
 *   • un code se dicte en vocal Discord — `0` et `O`, `1` et `I` et `L` sont
 *     indiscernables à l'oral comme dans la plupart des polices ;
 *   • sans voyelles complètes, un tirage aléatoire ne peut pas composer de mot
 *     malheureux. On garde `A`, `E` et `Y` : le risque devient négligeable et
 *     l'alphabet reste assez large (30 caractères) pour 24 millions de codes.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

/** Longueur de la partie tirée au sort (après le tiret). */
const LONGUEUR_SUFFIXE = 5;

/**
 * Le préfixe : trois lettres tirées du NOM de la ligue quand c'est possible.
 * « Toulouse Rugby League » donne `TLS`, « Ovalie des copains » donne `OVL`.
 * C'est purement cosmétique — le code reste unique par son suffixe — mais ça
 * rend la ligue reconnaissable dans une liste de trois codes collés à la suite.
 *
 * ⚠️ LE PRÉFIXE, LUI, PEUT CONTENIR N'IMPORTE QUELLE LETTRE (`O`, `I`, `L`…) :
 * il vient d'un mot qu'on lit, pas d'un tirage qu'on dicte. Seul le suffixe est
 * contraint à l'alphabet sans ambiguïté.
 */
function prefixeDepuisNom(nom: string): string {
  const lettres = nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (lettres.length >= 3) {
    // Première lettre, puis deux consonnes : « TOULOUSE » → « TLS ».
    const consonnes = lettres.slice(1).replace(/[AEIOUY]/g, '');
    if (consonnes.length >= 2) return lettres[0] + consonnes.slice(0, 2);
    return lettres.slice(0, 3);
  }
  return (lettres + 'RFC').slice(0, 3);
}

/**
 * Code d'invitation d'une ligue.
 *
 * ⚠️ DÉTERMINISTE À PARTIR DE LA GRAINE, pas de `Math.random()`. C'est le
 * serveur qui appelle cette fonction, et il doit pouvoir la rejouer : si un
 * enregistrement échoue à mi-chemin et qu'on rejoue la création, on veut le
 * MÊME code, pas un second. L'unicité, elle, est garantie par la contrainte
 * `unique` de la base — et en cas de collision, le serveur ré-appelle avec un
 * suffixe de graine différent.
 */
export function codeInvitation(nomLigue: string, graineLigue: string): string {
  const rng = graine(`code|${graineLigue}`);
  let suffixe = '';
  for (let i = 0; i < LONGUEUR_SUFFIXE; i++) {
    suffixe += ALPHABET[Math.floor(rng() * ALPHABET.length)];
  }
  return `${prefixeDepuisNom(nomLigue)}-${suffixe}`;
}

/**
 * Nettoie ce que la personne a collé : minuscules, espaces, tiret manquant,
 * tiret en trop, `#` ou `/` recopiés d'une URL. Rend `null` si ça ne peut pas
 * être un code.
 *
 * ⚠️ ON NE DEVINE RIEN. Une première version « corrigeait » les confusions
 * (`0` pour `O`, `1` pour `I`) — c'était un raisonnement circulaire : l'alphabet
 * du suffixe exclut DÉJÀ `O`, `I`, `L`, `U`, `0` et `1` précisément pour que
 * l'ambiguïté n'existe pas. Un caractère hors alphabet ne veut donc pas dire
 * « il a mal lu », il veut dire « ce n'est pas ce code-là », et le remplacer au
 * jugé fabriquerait un code valide mais FAUX — celui d'une autre ligue, ou
 * d'aucune. On refuse, et l'écran redemande.
 */
export function normaliserCode(saisi: string): string | null {
  const brut = saisi.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (brut.length !== 3 + LONGUEUR_SUFFIXE) return null;
  const prefixe = brut.slice(0, 3);
  const suffixe = brut.slice(3);
  if (!/^[A-Z]{3}$/.test(prefixe)) return null;
  if (![...suffixe].every((c) => ALPHABET.includes(c))) return null;
  return `${prefixe}-${suffixe}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LE TAG — `Colin#4821`
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Quatre chiffres dérivés de l'identifiant du compte.
 *
 * ⚠️ CE N'EST PAS UN SECRET et ça ne doit jamais le devenir : il se déduit de
 * l'id, qui ne se déduit de rien. Le tag sert à DÉSIGNER quelqu'un (« ajoute
 * Colin#4821 »), pas à l'authentifier. Aucune décision serveur ne le lit.
 */
export function tagCompte(idCompte: string): string {
  const rng = graine(`tag|${idCompte}`);
  return String(1000 + Math.floor(rng() * 9000));
}

/** L'étiquette complète telle qu'on l'affiche et qu'on la copie. */
export function etiquetteCompte(pseudo: string, idCompte: string): string {
  return `${pseudo}#${tagCompte(idCompte)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LES NOMS SAISIS — validation partagée client / serveur
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ LE CLIENT VALIDE POUR ÊTRE AGRÉABLE, LE SERVEUR VALIDE POUR DE VRAI.
// Les deux appellent ces fonctions-ci : une seule définition, donc pas de
// formulaire qui accepte ce que l'API refusera trois secondes plus tard.

export const LONGUEURS = {
  pseudo: { min: 2, max: 20 },
  ligue: { min: 3, max: 32 },
  club: { min: 2, max: 28 },
  trophee: { min: 2, max: 40 },
} as const;

/**
 * Un nom lisible : lettres (accents compris), chiffres, espace et `' - . &`.
 *
 * ⚠️ PAS DE LISTE DE MOTS INTERDITS ICI. Une ligue est PRIVÉE, entre gens qui
 * se connaissent : filtrer les gros mots dans un salon de six potes n'aurait
 * aucun sens et se contournerait en trois secondes. Ce qu'on interdit, ce sont
 * les caractères qui cassent l'affichage — retours à la ligne, marques de
 * direction bidirectionnelle, caractères de contrôle et invisibles.
 */
const NOM_VALIDE = /^[\p{L}\p{N} '’.&-]+$/u;
/**
 * Caractères invisibles ou de contrôle : espaces de largeur nulle, marques de
 * direction bidirectionnelle, retours à la ligne, tabulations.
 *
 * ⚠️ CE CONTRÔLE PORTE SUR LA SAISIE BRUTE, avant `normaliserNom`, et c’est
 * tout son intérêt : `s` inclut le saut de ligne, l’espace insécable et le
 * BOM. La normalisation les change donc en espaces ordinaires, et ils
 * passeraient `NOM_VALIDE` sans laisser de trace. Deux clubs peuvent alors
 * porter des noms identiques à l’œil, et plus personne ne sait à qui il
 * envoie une offre.
 *
 * ⚠️ ET C’EST UNE BOUCLE, PAS UNE EXPRESSION RÉGULIÈRE. La version regex
 * déclenchait `no-control-regex` à chaque `npm run lint` ; taire la règle pour
 * tout le projet coûterait plus cher que ces six lignes.
 */
function contientInvisible(saisi: string): boolean {
  for (const caractere of saisi) {
    const code = caractere.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;       // caractères de contrôle
    if (code === 0x00ad || code === 0xfeff) return true; // trait d’union mou, BOM
    if (code >= 0x200b && code <= 0x200f) return true;   // largeur nulle, marques bidi
    if (code === 0x2028 || code === 0x2029) return true; // séparateurs de ligne
    if (code >= 0x202a && code <= 0x202e) return true;   // forçage bidirectionnel
    if (code >= 0x2060 && code <= 0x206f) return true;   // jointures invisibles
  }
  return false;
}

export type MotifRefus = 'vide' | 'court' | 'long' | 'caracteres';

/** Nettoie un nom saisi : espaces en trop, apostrophes typographiques unifiées. */
export function normaliserNom(saisi: string): string {
  return saisi.replace(/’/g, "'").replace(/\s+/g, ' ').trim();
}

/**
 * Valide un nom pour une catégorie donnée. Rend `null` si tout va bien, sinon
 * le motif — c'est l'écran qui choisit la phrase, dans la langue du joueur.
 */
export function verifierNom(saisi: string, categorie: keyof typeof LONGUEURS): MotifRefus | null {
  const nom = normaliserNom(saisi);
  if (!nom) return 'vide';
  if (contientInvisible(saisi)) return 'caracteres';
  if (!NOM_VALIDE.test(nom)) return 'caracteres';
  const { min, max } = LONGUEURS[categorie];
  // ⚠️ On compte les POINTS DE CODE, pas les unités UTF-16 : `[...nom].length`.
  // `nom.length` compte 2 pour un caractère hors du plan de base, et refusait
  // donc des noms plus courts que la limite affichée.
  const taille = [...nom].length;
  if (taille < min) return 'court';
  if (taille > max) return 'long';
  return null;
}

/**
 * Clé de comparaison de deux noms de club dans une même ligue.
 *
 * ⚠️ « Colin RFC » et « colin  rfc » sont le MÊME club pour un humain. Sans
 * cette normalisation, deux managers peuvent prendre des noms indistinguables
 * à l'écran, et plus personne ne sait à qui on envoie une offre.
 */
export function cleNom(nom: string): string {
  return normaliserNom(nom)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}
