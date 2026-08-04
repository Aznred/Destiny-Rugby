// APRÈS LE MATCH — ce que la performance rapporte VRAIMENT.
//
// Demande explicite du joueur : « fais que notre joueur augmente ses stats en
// fonction de sa perf dans le match ». Jusqu'ici, un match suivi en direct ne
// remplissait que les statistiques de la saison ; la progression, elle,
// attendait le bilan de fin de saison.
//
// ⚠️ CE MODULE NE REMET PAS EN CAUSE LA DIFFICULTÉ DU JEU. Le gros de la
// progression continue de venir de `lib/progression.ts` (la note de saison).
// Ici on ajoute un retour IMMÉDIAT et VOLONTAIREMENT MODESTE :
//   · toujours de la forme, du moral, de la confiance du staff ;
//   · un point d'attribut au maximum par match, jamais après 33 ans,
//     jamais au-delà du potentiel, et un BUDGET DE 5 POINTS PAR SAISON
//     (`BUDGET_MATCHS_PAR_SAISON`) que rien ne contourne — sinon il suffirait
//     de regarder tous ses matchs pour exploser le plafond de carrière.

import type { AttributId, Joueur, PosteId, StatVariable } from '../../types';
import { POSTE_PAR_ID } from '../../data/rugby';

// ⚠️ TROIS POINTS PAR SAISON, PAS PLUS. C'est ~+0,4 de générale par saison, soit
// environ +4 sur une carrière de douze saisons : de quoi sentir qu'un grand
// match compte, sans déplacer l'étalonnage de difficulté (médiane 58, une
// carrière sur huit au-dessus de 80 — voir la section « Difficulté » de
// CLAUDE.md). Ne pas augmenter sans relancer `scripts/verifDifficulte.ts`.
export const BUDGET_MATCHS_PAR_SAISON = 3;

export interface StatsMatchJoueur {
  essais: number;
  plaquages: number;
  plaquagesManques: number;
  passes: number;
  metres: number;
  grattages: number;
  butsTentes: number;
  butsReussis: number;
  cartons: number;
  minutes: number;
}

// Ce qu'on attend d'un poste sur 80 minutes : plaquages, mètres, essais.
// Chiffres calés sur les moyennes du rugby professionnel.
const ATTENDU: Record<PosteId, { plaquages: number; metres: number; essais: number }> = {
  pilier_gauche: { plaquages: 9, metres: 18, essais: 0.05 },
  talonneur: { plaquages: 10, metres: 22, essais: 0.12 },
  pilier_droit: { plaquages: 9, metres: 18, essais: 0.05 },
  deuxieme_ligne_g: { plaquages: 12, metres: 22, essais: 0.06 },
  deuxieme_ligne_d: { plaquages: 12, metres: 22, essais: 0.06 },
  troisieme_aile_g: { plaquages: 13, metres: 32, essais: 0.12 },
  troisieme_aile_d: { plaquages: 13, metres: 32, essais: 0.12 },
  numero_8: { plaquages: 11, metres: 45, essais: 0.16 },
  demi_melee: { plaquages: 7, metres: 30, essais: 0.14 },
  demi_ouverture: { plaquages: 6, metres: 30, essais: 0.10 },
  ailier_gauche: { plaquages: 4, metres: 75, essais: 0.42 },
  premier_centre: { plaquages: 9, metres: 55, essais: 0.18 },
  deuxieme_centre: { plaquages: 8, metres: 60, essais: 0.24 },
  ailier_droit: { plaquages: 4, metres: 75, essais: 0.42 },
  arriere: { plaquages: 5, metres: 80, essais: 0.28 },
};

function borner(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

// LA NOTE DU MATCH, sur 10. Elle compare ce qu'a fait le joueur à ce qu'on
// attend de SON POSTE, au prorata de son temps de jeu.
export function noterMatch(poste: PosteId, s: StatsMatchJoueur): number {
  const att = ATTENDU[poste] ?? ATTENDU.premier_centre;
  const part = borner(s.minutes / 80, 0.1, 1);
  let note = 5.8;

  // Entrer en jeu et tenir sa place, ça compte déjà.
  note += part >= 0.75 ? 0.35 : part <= 0.3 ? -0.35 : 0;

  // Défense
  const plqAttendus = att.plaquages * part;
  note += borner((s.plaquages - plqAttendus) / Math.max(3, plqAttendus) * 1.3, -1.2, 1.6);
  note -= s.plaquagesManques * 0.28;

  // Avancée ballon en main
  const mAttendus = att.metres * part;
  note += borner((s.metres - mAttendus) / Math.max(15, mAttendus) * 1.1, -1, 1.8);

  // Ce qui fait gagner un match
  note += s.essais * 1.25;
  note += s.grattages * 0.45;
  if (s.butsTentes > 0) note += s.butsReussis * 0.32 - (s.butsTentes - s.butsReussis) * 0.4;
  note -= s.cartons * 1.4;

  return Math.round(borner(note, 1, 10) * 10) / 10;
}

// L'attribut que la performance a mis en avant : c'est CELUI-LÀ qui progresse.
function attributTravaille(poste: PosteId, s: StatsMatchJoueur): AttributId {
  const att = ATTENDU[poste] ?? ATTENDU.premier_centre;
  const part = borner(s.minutes / 80, 0.1, 1);
  const scores: [AttributId, number][] = [
    ['plaquage', s.plaquages / Math.max(1, att.plaquages * part) + s.grattages * 0.5],
    ['vitesse', s.metres / Math.max(1, att.metres * part) + s.essais * 0.6],
    ['passe', s.passes / Math.max(1, 12 * part)],
    ['jeuAuPied', s.butsReussis * 1.4],
    ['force', s.metres / Math.max(1, att.metres * part) * 0.7 + s.plaquages / 14],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][0];
}

export interface RetourDeMatch {
  note: number;
  deltas: Partial<Record<StatVariable, number>>;
  attribut: AttributId | null;   // l'attribut qui gagne un point (null = aucun)
  texte: string;
}

// Le bilan d'après-match : ce que le joueur gagne (ou perd) tout de suite.
export function retourDeMatch(
  j: Joueur, s: StatsMatchJoueur, budgetRestant: number, tirage: () => number,
): RetourDeMatch {
  const note = noterMatch(j.poste, s);
  const ecart = note - 6;

  const deltas: Partial<Record<StatVariable, number>> = {
    // Un match, ça coûte. Plus on joue, plus on est cuit.
    forme: -Math.round(3 + s.minutes / 14),
    moral: Math.round(ecart * 1.8),
    reputation: note >= 8.2 ? 2 : note >= 7 ? 1 : note <= 4 ? -1 : 0,
  };

  // ⚠️ LE POINT D'ATTRIBUT. Il faut une VRAIE bonne performance, il en reste au
  // budget de la saison, et l'attribut n'est pas déjà au niveau du potentiel.
  // ⚠️ L'ÂGE : aligné sur « potentiel jusqu'à 31 » — on progresse encore
  // franchement jusqu'à 31 ans, et la porte ne se ferme complètement qu'à 36
  // (elle claquait à 33, ce qui n'a plus de sens avec une limite d'âge à 44).
  const facteurAge = j.age < 21 ? 1.5 : j.age < 25 ? 1.2 : j.age < 29 ? 0.9
    : j.age < 32 ? 0.7 : j.age < 36 ? 0.3 : 0.1;
  const cible = attributTravaille(j.poste, s);
  const valeur = j.attributs?.[cible] ?? 50;
  const plafond = Math.min(99, j.potentiel ?? 99);
  const possible = budgetRestant > 0 && j.age < 36 && note >= 7.2 && valeur < plafond;
  const chance = borner((note - 7) / 9, 0, 0.45) * facteurAge;
  const attribut = possible && tirage() < chance ? cible : null;

  return { note, deltas, attribut, texte: resume(j.nom, j.poste, note, s) };
}

// ---------------------------------------------------------------------------
// LE RÉSUMÉ D'APRÈS-MATCH
// ---------------------------------------------------------------------------
// ⚠️ Demande explicite : « des résumés de match plus positifs ». Quatre phrases
// couvraient toute l'échelle, et un 6,2/10 — soit une prestation tout à fait
// correcte — s'affichait « Match sans relief » : le joueur avait l'impression
// de rater tous ses matchs. Les paliers sont resserrés vers le haut, le ton est
// celui d'un journaliste bienveillant, et surtout LE RÉSUMÉ CITE CE QU'ON A
// BIEN FAIT (l'essai, les plaquages, les mètres, le pied) plutôt que de juger
// dans le vide. La note, elle, ne bouge pas d'un dixième : l'étalonnage de
// difficulté (`scripts/verifDifficulte.ts`) reste intact.
const PALIERS: [number, string[]][] = [
  [8.6, ['Match immense de {nom} ({poste})', 'Récital de {nom} ({poste})', '{nom} a survolé la rencontre']],
  [7.6, ['Très grand match de {nom}', '{nom} a fait basculer la rencontre', 'Prestation majuscule de {nom}']],
  [6.8, ['Belle prestation de {nom}', '{nom} a tenu son rang, et bien au-delà', 'Match plein de {nom}']],
  [6.0, ['Prestation solide de {nom}', '{nom} a fait le travail', 'Match sérieux de {nom}']],
  [5.2, ['Match honnête de {nom}', '{nom} a tenu sa place', 'Sortie appliquée de {nom}']],
  [4.2, ['Match discret de {nom}', '{nom} est resté dans l’ombre', 'Sortie en demi-teinte pour {nom}']],
  [0, ['Soirée compliquée pour {nom}', '{nom} n’y est jamais entré', 'Match à oublier pour {nom}']],
];

// Ce qu'on retient de la copie : on cherche le fait marquant AVANT de juger.
function faitMarquant(poste: PosteId, s: StatsMatchJoueur): string {
  const att = ATTENDU[poste] ?? ATTENDU.premier_centre;
  const part = borner(s.minutes / 80, 0.1, 1);
  if (s.essais >= 2) return `Un doublé, rien que ça.`;
  if (s.essais === 1) return `Et un essai au bout.`;
  if (s.butsTentes > 0 && s.butsReussis === s.butsTentes && s.butsReussis >= 3) {
    return `${s.butsReussis}/${s.butsTentes} au pied : sans faute.`;
  }
  if (s.grattages >= 2) return `${s.grattages} ballons arrachés au sol.`;
  if (s.plaquages >= att.plaquages * part * 1.35) return `Un abattage énorme en défense.`;
  if (s.metres >= att.metres * part * 1.5) return `${Math.round(s.metres)} mètres avalés ballon en main.`;
  if (s.cartons > 0) return `Le carton jaune coûte cher.`;
  if (s.plaquagesManques >= 4) return `Trop de plaquages dans le vide, en revanche.`;
  return '';
}

function resume(nom: string, poste: PosteId, note: number, s: StatsMatchJoueur): string {
  const palier = PALIERS.find(([seuil]) => note >= seuil) ?? PALIERS[PALIERS.length - 1];
  // Tirage stable : le même match donne toujours la même phrase, mais deux
  // matchs voisins n'ont pas la même.
  const cle = Math.abs(Math.round(note * 10) + s.minutes * 7 + s.plaquages * 13 + nom.length);
  const modele = palier[1][cle % palier[1].length];
  const tete = modele
    .replace('{nom}', nom)
    .replace('{poste}', POSTE_PAR_ID[poste]?.nom ?? '');
  const fait = faitMarquant(poste, s);
  return `${tete} : ${note}/10.${fait ? ` ${fait}` : ''}`;
}
