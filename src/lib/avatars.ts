// LES PHOTOS DE PROFIL DE L’OVALE
// Portraits officiels locaux en priorité ; portrait stable du catalogue sinon.
// Les initiales servent de repli local, les clubs gardent leur écusson.

import { graine } from './championnat.js';
import { PHOTO_JOUEUR } from '../data/photosJoueurs.js';
import { PHOTO_JOUEUR_MAJ } from '../data/photosMaj.js';


// Prénoms féminins courants — les données amateurs mélangent les sections d'un
// club, on y croise donc de vraies joueuses. Une liste courte suffit : le reste
// tombe côté masculin, majoritaire dans les effectifs.
const PRENOMS_FEMININS = new Set([
  'marie', 'sophie', 'julie', 'claire', 'camille', 'lea', 'léa', 'emma', 'chloe',
  'chloé', 'manon', 'sarah', 'laura', 'pauline', 'audrey', 'celine', 'céline',
  'nathalie', 'sandrine', 'mathilde', 'anais', 'anaïs', 'elodie', 'élodie',
  'aurelie', 'aurélie', 'stephanie', 'stéphanie', 'virginie', 'caroline',
  'charlotte', 'juliette', 'lucie', 'margot', 'alice', 'eva', 'jeanne', 'ines',
  'inès', 'oceane', 'océane', 'amandine', 'delphine', 'isabelle', 'valerie',
  'valérie', 'christine', 'catherine', 'veronique', 'véronique', 'agathe',
]);

function sansAccent(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function estFeminin(nom: string): boolean {
  return PRENOMS_FEMININS.has(sansAccent(nom.trim().split(/\s+/)[0] ?? ''));
}

/**
 * L'URL d'un portrait, stable pour un nom donné — et SERVIE EN LOCAL.
 *
 * ⚠️ ELLE POINTAIT SUR `randomuser.me`, ET C'EST POURQUOI LES PROFILS ÉTAIENT
 * VIDES. L'intention d'origine était bonne (« il fallait de vraies photos, sans
 * base de données et sans clé ») et le repli sur les initiales évitait le trou
 * dans le fil. Mais le service ne répond pas : chaque joueur sans portrait
 * officiel se retrouvait donc avec un monogramme, et sur un réseau social ça se
 * voit immédiatement. Retour de jeu : « les joueurs n'ont pas de photo de profil
 * sur X ». C'était aussi le dernier asset RÉSEAU EXTERNE du jeu, à rebours de
 * la règle maison — le mode hors ligne devait rester entier.
 *
 * ⚠️ ON PIOCHE DANS NOS PROPRES PHOTOS. `public/photos/` embarque 1 574
 * portraits officiels, dont seuls 84 % des joueurs du Top 14 et 23 % de la
 * Régionale portent le leur. Les autres reçoivent donc un visage du pool, tiré
 * de façon DÉTERMINISTE sur leur nom : deux ouvertures de l'écran donnent le
 * même visage, et le fil ressemble enfin à un réseau social. Un remplaçant de
 * Fédérale peut porter le visage d'un joueur connu — c'est exactement le
 * compromis que le jeu fait déjà pour les regens, qui empruntent l'identité
 * d'un joueur réel de leur club.
 *
 * ⚠️ SAUF POUR LES FEMMES. Le pool est celui du rugby masculin ; coller un
 * visage d'homme sur une joueuse serait pire que pas de photo. Les effectifs
 * amateurs mélangent les sections d'un club, on en croise donc vraiment. Elles
 * gardent le monogramme local, qui ne raconte rien de faux.
 */
export function photoDe(nom: string, feminin = estFeminin(nom)): string {
  if (feminin) return avatarInitiales(nom);
  const pool = poolDePhotos();
  if (!pool.length) return avatarInitiales(nom);
  const rng = graine('portrait#' + nom);
  return pool[Math.floor(rng() * pool.length)];
}

// Tous les portraits disponibles, une seule fois, triés pour que le tirage
// déterministe ne dépende pas de l'ordre d'énumération de l'objet.
let poolPhotos: string[] | null = null;
function poolDePhotos(): string[] {
  if (poolPhotos) return poolPhotos;
  poolPhotos = [...new Set(Object.values(PHOTO_JOUEUR))].sort();
  return poolPhotos;
}

// L'écriture stockée dans `CompteSuivi.avatar` et `PostSocial.avatar`.
export type TypeAvatar = 'joueur' | 'club' | 'journaliste' | 'media' | 'fan' | 'hater' | 'selection' | 'competition';

// La VRAIE photo d'un joueur du Top 14 ou de la Pro D2, quand on l'a.
// 1 574 portraits officiels sont rangés dans `public/photos/`, indexés par nom
// normalisé (voir scripts/copierPhotosJoueurs.cjs).
export function normaliserNom(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ⚠️ Les prénoms ne concordent pas toujours : le fichier dit « william_skelton »
// là où la base écrit « Will SKELTON ». On construit donc un second index par
// NOM DE FAMILLE, utilisé seulement quand ce nom est unique parmi les photos —
// sinon on risquerait de coller le visage d'un homonyme.
let parMotsDuNom: Map<string, string | null> | null = null;

function signatureNom(nom: string): string {
  return nom.split(' ').filter(Boolean).sort().join('|');
}

function indexMotsDuNom(): Map<string, string | null> {
  if (parMotsDuNom) return parMotsDuNom;
  const index = new Map<string, string | null>();
  for (const [cle, chemin] of Object.entries({ ...PHOTO_JOUEUR, ...PHOTO_JOUEUR_MAJ })) {
    const signature = signatureNom(cle);
    if (!signature.includes('|')) continue;
    // `null` = ambigu, on ne s'en sert plus.
    const connu = index.get(signature);
    index.set(signature, connu && connu !== chemin ? null : chemin);
  }
  parMotsDuNom = index;
  return index;
}

export function photoReelle(nom: string): string | undefined {
  const cle = normaliserNom(nom);
  const exacte = PHOTO_JOUEUR_MAJ[cle] ?? PHOTO_JOUEUR[cle];
  if (exacte) return exacte;
  return indexMotsDuNom().get(signatureNom(cle)) ?? undefined;
}

export function avatarPourCompte(nom: string, type: TypeAvatar, club?: string): string {
  if (type === 'club') return `club:${club ?? nom}`;
  if (type === 'competition' || type === 'selection') return `compet:${club ?? nom}`;
  // Un média est une rédaction, pas une personne : monogramme plutôt que photo.
  if (type === 'media') return `initiales:${nom}`;
  // ⚠️ Un vrai joueur porte SON visage. Les portraits officiels du Top 14 et de
  // la Pro D2 passent avant le portrait générique : voir Dupont avec la tête de
  // Dupont change tout sur un réseau social.
  const vraie = photoReelle(nom);
  return `photo:${vraie ?? photoDe(nom)}`;
}

// --- LE REPLI LOCAL --------------------------------------------------------
const TEINTES = [
  ['#0d3b2e', '#1c6b4c'], ['#2b1a10', '#7a4a22'], ['#101a33', '#2f4d8f'],
  ['#2a0f1c', '#7d2244'], ['#1a2410', '#4d6b1f'], ['#26102e', '#5c2a72'],
  ['#0b2b28', '#00806b'], ['#2b1405', '#a2600f'],
];

export function initialesDe(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (!mots.length) return '?';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

// Une pastille SVG avec les initiales — aucune requête réseau.
export function avatarInitiales(nom: string): string {
  const rng = graine('teinte#' + nom);
  const [a, b] = TEINTES[Math.floor(rng() * TEINTES.length)];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
    `<rect width="100" height="100" fill="url(#g)"/>` +
    `<text x="50" y="50" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="Arial,Helvetica,sans-serif" font-size="40" font-weight="700" ` +
    `fill="rgba(255,255,255,.9)">${initialesDe(nom)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// --- DES COMPTES LAMBDA, COMME SUR LE VRAI RÉSEAU --------------------------
//
// Demande explicite : « plus de comptes normaux, Jean-Michel etc. ». Un réseau
// social, ce n'est pas que des clubs et des journalistes : c'est surtout des
// gens ordinaires qui commentent depuis leur canapé.

const PRENOMS = [
  'Jean-Michel', 'Patrick', 'Sylvie', 'Christophe', 'Nathalie', 'Didier',
  'Sandrine', 'Fabrice', 'Corinne', 'Hervé', 'Karine', 'Sébastien', 'Émilie',
  'Bruno', 'Valérie', 'Cédric', 'Sophie', 'Thierry', 'Delphine', 'Ludovic',
  'Marie', 'Guillaume', 'Céline', 'Franck', 'Aurélie', 'Yannick', 'Isabelle',
  'Mickaël', 'Julie', 'Stéphane', 'Laetitia', 'Nicolas', 'Camille', 'Olivier',
  'Élodie', 'Vincent', 'Sabrina', 'Gérard', 'Pauline', 'Alexandre',
];
const NOMS = [
  'Dubois', 'Lafitte', 'Etcheverry', 'Marty', 'Cazaux', 'Bernadet', 'Roussel',
  'Peyre', 'Delmas', 'Fabre', 'Soulé', 'Barrière', 'Lasserre', 'Ducasse',
  'Mounier', 'Sarrat', 'Vidal', 'Bousquet', 'Larrieu', 'Castagné', 'Pujol',
  'Bonnet', 'Teixeira', 'Salles', 'Nogué', 'Darrieux', 'Bergès', 'Mazet',
];
const SUFFIXES = ['', '_31', '_64', '_65', '_11', '_81', '33', '_rugby', 'xv', '_ovalie', '_officiel_non', '_1987'];

export interface CompteLambda {
  nom: string;
  pseudo: string;
  avatar: string;
  abonnes: number;
  bio: string;
  hater: boolean;
}

// Les supporters lambda d'un club donné. Déterministe : même club, mêmes gens.
export function comptesLambda(club: string, combien = 24): CompteLambda[] {
  const sortie: CompteLambda[] = [];
  const vus = new Set<string>();
  for (let i = 0; i < combien * 2 && sortie.length < combien; i++) {
    const rng = graine(`lambda#${club}#${i}`);
    const prenom = PRENOMS[Math.floor(rng() * PRENOMS.length)];
    const nom = NOMS[Math.floor(rng() * NOMS.length)];
    const complet = `${prenom} ${nom}`;
    const suffixe = SUFFIXES[Math.floor(rng() * SUFFIXES.length)];
    const pseudo = sansAccent(`${prenom}${nom}`).replace(/[^a-z0-9]/g, '') + suffixe;
    if (vus.has(pseudo)) continue;
    vus.add(pseudo);
    // Un compte sur cinq est là pour râler : c'est la vie d'un réseau.
    const hater = rng() < 0.2;
    sortie.push({
      nom: complet,
      pseudo,
      avatar: `photo:${photoDe(complet)}`,
      abonnes: Math.round(40 + rng() * 2600),
      bio: hater
        ? `${Math.floor(rng() * 40) + 20} ans de rugby devant la télé. Je dis ce que je pense.`
        : `Supporter de ${club} depuis toujours. ${['Abonné en tribune.', 'Père de famille.', 'Ancien 3e ligne du dimanche.', 'Je rate jamais un match.'][Math.floor(rng() * 4)]}`,
      hater,
    });
  }
  return sortie;
}
