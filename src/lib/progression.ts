// ÉVOLUTION DYNAMIQUE DU JOUEUR
//
// Les attributs ne sont plus figés : chaque saison est notée (sur 10) à partir
// du temps de jeu, des essais, du niveau du joueur face à son groupe, de sa
// forme et du résultat du club. Cette note décide de la progression :
//
//   • une saison pleine et bien notée à 21 ans fait exploser les stats ;
//   • une saison sur le banc fait stagner, puis régresser ;
//   • passé 31 ans, le déclin s'installe même en jouant.
//
// Le POTENTIEL lui-même bouge : une saison énorme chez un jeune relève son
// plafond, une saison ratée le rabote. Rien n'est écrit d'avance.

import type { Attributs, Joueur, PosteId } from '../types';
import { POSTE_PAR_ID } from '../data/rugby';
import { effetsTraits } from '../data/traits';

const ATTRS: (keyof Attributs)[] = [
  'vitesse', 'force', 'endurance', 'plaquage',
  'passe', 'jeuAuPied', 'vision', 'mental',
];

// Essais attendus sur une saison pleine, par poste (référence de « finition »).
const ESSAIS_ATTENDUS: Record<PosteId, number> = {
  pilier_gauche: 0.9, talonneur: 1.5, pilier_droit: 0.9,
  deuxieme_ligne_g: 1.3, deuxieme_ligne_d: 1.3,
  troisieme_aile_g: 2.2, troisieme_aile_d: 2.2, numero_8: 3,
  demi_melee: 2.8, demi_ouverture: 2,
  ailier_gauche: 7, premier_centre: 3.4, deuxieme_centre: 4.2, ailier_droit: 7,
  arriere: 5,
};

export interface SaisonJouee {
  matchs: number;
  essais: number;
  forceGroupe: number; // niveau moyen de l'effectif
  rang: number; // classement du club dans sa poule
  // Mode « journée par journée » : moyenne des notes de match réellement
  // obtenues. Quand elle existe, elle pèse autant que la note calculée.
  noteMatchs?: number;
}

export interface Evolution {
  noteSaison: number; // note moyenne de la saison, sur 10
  deltas: Partial<Attributs>;
  gainPotentiel: number;
  points: number; // total de points d'attributs gagnés (ou perdus)
  resume: string;
}

const MATCHS_SAISON_PLEINE = 22;

function generale(a: Attributs): number {
  const vals = Object.values(a);
  return Math.round(vals.reduce((x, y) => x + y, 0) / vals.length);
}

// Note de la saison (3 à 9,8) : c'est le juge de paix de la progression.
export function noterSaison(j: Joueur, s: SaisonJouee): number {
  // La réputation compte, mais c'est le niveau de jeu qui note une saison.
  const perso = generale(j.attributs) * 0.85 + j.reputation * 0.15;
  const titularisation = Math.min(1, s.matchs / MATCHS_SAISON_PLEINE);
  const attendus = ESSAIS_ATTENDUS[j.poste] * Math.max(0.2, titularisation);
  const note =
    5.6 +
    // Un joueur de moins de 23 ans est jugé à l'aune des espoirs, pas des
    // cadres : être en dessous du groupe est NORMAL à cet âge.
    (perso - s.forceGroupe) * (j.age < 23 ? 0.05 : 0.12) +
    (titularisation - 0.5) * 2.2 + // le temps de jeu pèse lourd
    (s.essais - attendus) * 0.45 + // finition
    (j.forme - 70) * 0.012 +
    (j.moral - 70) * 0.008 +
    (7.5 - s.rang) * 0.06; // porté par un club qui gagne
  const finale = s.noteMatchs != null ? (note + s.noteMatchs) / 2 : note;
  return Math.round(Math.max(3, Math.min(9.8, finale)) * 10) / 10;
}

// ⚠️ ON PROGRESSE JUSQU'À 31 ANS (demande explicite : « potentiel jusqu'à 31 »).
// La courbe s'arrêtait net à 27 ans (×1 → ×0,7 puis ×0,45) : un joueur qui
// perçait tard n'avait plus aucun moyen d'atteindre son plafond, alors même que
// `AGE_DECLIN` place le déclin à 31 ans. La marche haute court désormais
// jusqu'à 28 ans, et il reste de la vitesse jusqu'à 31 — le déclin, lui, ne
// bouge pas d'un an. Et parce que la limite d'âge est passée à 44 ans, la queue
// de courbe descend plus doucement qu'avant plutôt que de tomber à zéro.
function facteurAge(age: number): number {
  if (age <= 21) return 1.5;
  if (age <= 24) return 1.25;
  if (age <= 28) return 1;
  if (age <= 31) return 0.8;
  if (age <= 34) return 0.45;
  if (age <= 38) return 0.3;
  return 0.2;
}

export function evoluer(j: Joueur, s: SaisonJouee): Evolution {
  const noteSaison = noterSaison(j, s);
  const gen = generale(j.attributs);
  const potentiel = j.potentiel ?? Math.min(99, gen + 12);
  const titularisation = Math.min(1, s.matchs / MATCHS_SAISON_PLEINE);

  // Moteur de progression : la note de saison et le temps de jeu.
  let points = ((noteSaison - 5.7) * 1.5 + (titularisation - 0.4) * 3) * facteurAge(j.age);
  // FORMATION : avant 25 ans, on apprend même en jouant peu — un jeune ne
  // régresse pas parce qu'il est (normalement) plus faible que ses aînés.
  // Le plancher est ce qu'on apprend à l'entraînement : sans lui, un débutant
  // trop faible pour jouer n'a aucun moyen de rattraper son groupe et s'enfonce
  // (testé : générale 46 → 30 en 8 saisons).
  if (j.age < 25) points += (25 - j.age) * 0.4;
  // TALENT BRUT : un jeune très au-dessous de son potentiel apprend vite, même
  // avec peu de temps de jeu. C'est ce qui sépare le joueur de Fédérale qui
  // plafonne du gamin dont tout le monde dit qu'« il ira loin ».
  //
  // ⚠️ C'EST LE LEVIER PRINCIPAL de l'accessibilité (demande explicite : « c'est
  // trop dur d'avoir une générale au-dessus de 80 »). Avec l'ancien /11 plafonné
  // à 2,2, un joueur gagnait ~0,9 point de générale par saison : douze saisons
  // ne suffisaient jamais à rejoindre un potentiel de 75, et le maximum mesuré
  // sur 100 carrières plafonnait à 76. La marge au potentiel compte désormais
  // beaucoup plus — mais elle reste la SEULE porte : un joueur né sans talent
  // ne perce toujours pas, il n'a rien à rattraper.
  //
  // ⚠️ OUVERT JUSQU'À 31 ANS (demande explicite). Le levier se coupait à 27 :
  // un joueur à 68 pour un potentiel de 84 n'avait plus rien pour combler
  // l'écart passé son 27ᵉ anniversaire, et son potentiel restait lettre morte.
  // Après 28 ans il rapporte moins — on rattrape, on n'explose plus.
  if (j.age <= 31) {
    const marge = Math.max(0, potentiel - gen);
    points += Math.min(5.5, marge / 4.5) * (j.age < 27 ? 1 : j.age <= 29 ? 0.7 : 0.45);
  }
  if (j.age <= 21) points = Math.max(points, 1.2);
  else if (j.age <= 23) points = Math.max(points, 0.7);
  else if (j.age <= 25) points = Math.max(points, 0.35);
  // Le déclin du corps, inévitable après 31 ans — le MENTORAT l'adoucit :
  // transmettre, c'est aussi s'entretenir et rester utile au groupe.
  if (j.age > 31) points -= (j.age - 31) * (j.mentorat ? 0.35 : 0.55);

  // On ne dépasse pas son potentiel d'un bond : plus on s'en approche, plus la
  // marge de progression se resserre.
  // Les traits de caractère pèsent sur la vitesse de progression.
  points *= effetsTraits(j.traits).progression;

  // ⚠️ Le rabot final : on ne colle pas son potentiel d'un bond. Il était à
  // 0,7 × marge, ce qui étranglait les dernières marches — un joueur à 74 pour
  // un potentiel de 88 ne gagnait plus rien d'utile. À 0,88, la fin de
  // progression respire, sans jamais permettre de dépasser le potentiel.
  const marge = potentiel - gen;
  if (points > 0) points = Math.min(points, Math.max(0.4, marge * 0.88));
  // Un jeune à très fort potentiel peut vraiment exploser sur une saison.
  points = Math.max(-4, Math.min(j.age <= 24 ? 8 : 6.5, points));

  // Le potentiel lui-même bouge : une saison énorme relève le plafond d'un
  // jeune, une saison ratée le rabote.
  // ⚠️ Le plafond peut encore monter jusqu'à 29 ans (et plus seulement 26) :
  // c'est le pendant de « potentiel jusqu'à 31 » — une saison énorme à 28 ans
  // doit pouvoir repousser la limite, pas seulement la remplir.
  let gainPotentiel = 0;
  if (j.age <= 29 && noteSaison >= 8.2) gainPotentiel = noteSaison >= 9 && j.age <= 26 ? 2 : 1;
  else if (j.age <= 29 && noteSaison <= 4.5) gainPotentiel = -1;
  else if (j.age >= 32) gainPotentiel = -1;

  // Répartition sur les attributs : les points clés du poste prennent le plus.
  // 6 points d'attributs par point de progression — soit un peu moins d'un
  // point de générale (moyenne de 8 attributs) pour une saison correcte, et
  // jusqu'à +3 pour une saison énorme chez un jeune.
  const cles = POSTE_PAR_ID[j.poste].cles;
  const poids = ATTRS.map((k) => (cles.includes(k) ? 1.7 : 0.8));
  const total = poids.reduce((a, b) => a + b, 0);
  const aRepartir = Math.round(points * 8);
  const deltas: Partial<Attributs> = {};

  // Méthode du plus fort reste : on n'égare pas les décimales en chemin, et un
  // recul se répartit aussi équitablement qu'une progression.
  const parts = ATTRS.map((k, i) => ({ k, exact: (aRepartir * poids[i]) / total }));
  let distribue = 0;
  for (const p of parts) {
    const entier = Math.trunc(p.exact);
    if (entier !== 0) deltas[p.k] = entier;
    distribue += entier;
  }
  const restes = parts
    .map((p) => ({ k: p.k, frac: Math.abs(p.exact - Math.trunc(p.exact)) }))
    .sort((a, b) => b.frac - a.frac);
  const signe = aRepartir >= 0 ? 1 : -1;
  for (let n = 0; n < Math.abs(aRepartir - distribue); n++) {
    const cible = restes[n % restes.length].k;
    deltas[cible] = (deltas[cible] ?? 0) + signe;
  }

  const resume =
    noteSaison >= 8
      ? 'Saison référence : tu as changé de dimension.'
      : noteSaison >= 6.8
        ? 'Belle saison, tu progresses nettement.'
        : noteSaison >= 5.5
          ? 'Saison correcte : tu grappilles quelques points.'
          : noteSaison >= 4.5
            ? 'Saison en demi-teinte, ta progression cale.'
            : 'Saison à oublier : tu régresses.';

  return { noteSaison, deltas, gainPotentiel, points, resume };
}
