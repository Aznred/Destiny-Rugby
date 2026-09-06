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

import type { Pion } from './entites.js';
import type { AttributId, Joueur, PosteId, StatVariable } from '../../types.js';
import { POSTE_PAR_ID } from '../../data/rugby.js';

// ⚠️ TROIS POINTS PAR SAISON, PAS PLUS. C'est ~+0,4 de générale par saison, soit
// environ +4 sur une carrière de douze saisons : de quoi sentir qu'un grand
// match compte, sans déplacer l'étalonnage de difficulté (médiane 58, une
// carrière sur huit au-dessus de 80 — voir la section « Difficulté » de
// CLAUDE.md). Ne pas augmenter sans relancer `scripts/verifDifficulte.ts`.
export const BUDGET_MATCHS_PAR_SAISON = 3;

// ⚠️ LA FEUILLE COMPLÈTE ENTRE DANS LA NOTE (demande explicite : « pour les
// notes il faut prendre en compte tout le jeu »). Les champs ajoutés sont
// OPTIONNELS : un appelant qui ne les fournit pas obtient exactement l'ancienne
// note, ce qui garantit qu'aucun chemin existant ne change de comportement sans
// qu'on l'ait voulu.
export interface StatsMatchJoueur {
  points?: number;
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
  // --- Le reste du jeu ------------------------------------------------------
  passesDecisives?: number;
  offloads?: number;
  franchissements?: number;
  turnovers?: number;       // ballons concédés : ça retire
  melees?: number;          // conquête (avants)
  touchesGagnees?: number;
  pickAndGo?: number;
  cinquanteVingtDeux?: number;
  cartonsRouges?: number;   // un rouge coûte bien plus cher qu'un jaune
}

// Ce qu'on attend d'un poste sur 80 minutes. Chiffres calés sur les moyennes du
// rugby professionnel — et sur ce que le moteur produit réellement, mesuré par
// `verifMoteur.ts`.
interface Attendu {
  plaquages: number; metres: number; essais: number;
  // Conquête et jeu au ras : nuls pour un trois-quarts, c'est le point.
  melees: number; touches: number; pickAndGo: number;
  offloads: number;
}
const ATTENDU: Record<PosteId, Attendu> = {
  pilier_gauche: { plaquages: 9, metres: 18, essais: 0.05, melees: 11, touches: 0.7, pickAndGo: 4.5, offloads: 0.15 },
  talonneur: { plaquages: 10, metres: 22, essais: 0.12, melees: 11, touches: 0.3, pickAndGo: 4.5, offloads: 0.2 },
  pilier_droit: { plaquages: 9, metres: 18, essais: 0.05, melees: 11, touches: 0.7, pickAndGo: 4.5, offloads: 0.15 },
  deuxieme_ligne_g: { plaquages: 12, metres: 22, essais: 0.06, melees: 11, touches: 5.9, pickAndGo: 4.5, offloads: 0.2 },
  deuxieme_ligne_d: { plaquages: 12, metres: 22, essais: 0.06, melees: 11, touches: 5.9, pickAndGo: 4.5, offloads: 0.2 },
  troisieme_aile_g: { plaquages: 13, metres: 32, essais: 0.12, melees: 11, touches: 2, pickAndGo: 4.5, offloads: 0.45 },
  troisieme_aile_d: { plaquages: 13, metres: 32, essais: 0.12, melees: 11, touches: 2, pickAndGo: 4.5, offloads: 0.45 },
  numero_8: { plaquages: 11, metres: 45, essais: 0.16, melees: 11, touches: 2, pickAndGo: 4.5, offloads: 0.6 },
  demi_melee: { plaquages: 7, metres: 30, essais: 0.14, melees: 0, touches: 0, pickAndGo: 0, offloads: 0.3 },
  demi_ouverture: { plaquages: 6, metres: 30, essais: 0.10, melees: 0, touches: 0, pickAndGo: 0, offloads: 0.35 },
  ailier_gauche: { plaquages: 4, metres: 75, essais: 0.42, melees: 0, touches: 0, pickAndGo: 0, offloads: 0.5 },
  premier_centre: { plaquages: 9, metres: 55, essais: 0.18, melees: 0, touches: 0, pickAndGo: 0, offloads: 0.8 },
  deuxieme_centre: { plaquages: 8, metres: 60, essais: 0.24, melees: 0, touches: 0, pickAndGo: 0, offloads: 0.9 },
  ailier_droit: { plaquages: 4, metres: 75, essais: 0.42, melees: 0, touches: 0, pickAndGo: 0, offloads: 0.5 },
  arriere: { plaquages: 5, metres: 80, essais: 0.28, melees: 0, touches: 0, pickAndGo: 0, offloads: 0.6 },
};

function borner(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

// LA NOTE DU MATCH, sur 10. Elle compare ce qu'a fait le joueur à ce qu'on
// attend de SON POSTE, au prorata de son temps de jeu.
/** Une ligne du barème : ce que tel aspect du match a rapporté ou coûté. */
export interface PostNote {
  cle: string;
  libelle: string;
  variables?: Record<string, string | number>;
  points: number;
}

/**
 * LE DÉTAIL DE LA NOTE, poste par poste du barème.
 *
 * ⚠️ C'EST LA SEULE IMPLÉMENTATION DU BARÈME — `noterMatch` ne fait qu'en
 * additionner les lignes. Retour de jeu : « notre joueur est jugé que sur
 * plaquage, mètres parcourus et essai, ce qui est dommage ». C'était FAUX depuis
 * un moment (la note regarde quinze choses), mais rigoureusement l'impression
 * qu'on en avait : le résumé affiché ne citait que ces trois-là. Un barème qu'on
 * ne voit pas est un barème qui n'existe pas pour le joueur — d'où cette
 * fonction, et l'affichage qui va avec.
 *
 * ⚠️ NE JAMAIS RECOPIER CE CALCUL AILLEURS pour l'affichage : deux exemplaires,
 * et un jour la note montrée ne sera plus celle qui compte.
 */
export function detailNote(poste: PosteId, s: StatsMatchJoueur): PostNote[] {
  const att = ATTENDU[poste] ?? ATTENDU.premier_centre;
  const part = borner(s.minutes / 80, 0.1, 1);
  const lignes: PostNote[] = [{ cle: 'ml.note.base', libelle: 'Base', points: 5.8 }];
  const ajouter = (cle: string, libelle: string, points: number, variables?: Record<string, string | number>) => {
    if (Math.abs(points) >= 0.05) lignes.push({ cle, libelle, variables, points });
  };

  // Entrer en jeu et tenir sa place, ça compte déjà.
  ajouter('ml.note.temps', 'Temps de jeu', part >= 0.75 ? 0.35 : part <= 0.3 ? -0.35 : 0);

  // Défense
  const plqAttendus = att.plaquages * part;
  ajouter('ml.note.plaquages', `Plaquages (${s.plaquages} pour ${plqAttendus.toFixed(1)} attendus)`,
    borner((s.plaquages - plqAttendus) / Math.max(3, plqAttendus) * 1.3, -1.2, 1.6),
    { n: s.plaquages, attendu: plqAttendus.toFixed(1) });
  ajouter('ml.note.plaquagesManques', `Plaquages manqués (${s.plaquagesManques})`, -s.plaquagesManques * 0.28,
    { n: s.plaquagesManques });

  // Avancée ballon en main
  const mAttendus = att.metres * part;
  ajouter('ml.note.metres', `Mètres gagnés (${Math.round(s.metres)} pour ${Math.round(mAttendus)} attendus)`,
    borner((s.metres - mAttendus) / Math.max(15, mAttendus) * 1.1, -1, 1.8),
    { n: Math.round(s.metres), attendu: Math.round(mAttendus) });

  // Ce qui fait gagner un match
  ajouter('ml.note.essais', `Essais (${s.essais})`, s.essais * 1.25, { n: s.essais });
  ajouter('ml.note.grattages', `Ballons grattés (${s.grattages})`, s.grattages * 0.45, { n: s.grattages });
  if (s.butsTentes > 0) {
    ajouter('ml.note.buts', `Tirs au but (${s.butsReussis}/${s.butsTentes})`,
      s.butsReussis * 0.32 - (s.butsTentes - s.butsReussis) * 0.4,
      { reussis: s.butsReussis, tentes: s.butsTentes });
  }

  // ═══ TOUT LE RESTE DU JEU ═══════════════════════════════════════════════
  // ⚠️ SANS CETTE SECTION, UN PILIER NE POUVAIT PAS FAIRE UN GRAND MATCH. La
  // note ne regardait que plaquages, mètres, essais, grattages et tirs au but :
  // une première ligne qui domine la mêlée, gagne ses ballons au ras et offre
  // un essai obtenait exactement la même note qu'un pilier qui n'a rien fait.
  // Chaque ligne ci-dessous est bornée : le total ne peut pas s'envoler, et
  // l'étalonnage de difficulté ne bouge pas — vérifié.
  ajouter('ml.note.passesDecisives', `Passes décisives (${s.passesDecisives ?? 0})`,
    borner((s.passesDecisives ?? 0) * 0.8, 0, 1.6), { n: s.passesDecisives ?? 0 });
  ajouter('ml.note.offloads', `Offloads (${s.offloads ?? 0})`,
    borner(((s.offloads ?? 0) - att.offloads * part) * 0.35, -0.3, 0.9), { n: s.offloads ?? 0 });
  ajouter('ml.note.franchissements', `Franchissements (${s.franchissements ?? 0})`,
    borner((s.franchissements ?? 0) * 0.22, 0, 1), { n: s.franchissements ?? 0 });
  // Les ballons rendus se paient : un porteur qui perd trois ballons a coûté
  // trois possessions, quoi qu'il ait fait par ailleurs.
  ajouter('ml.note.turnovers', `Ballons rendus (${s.turnovers ?? 0})`,
    -borner((s.turnovers ?? 0) * 0.3, 0, 1.5), { n: s.turnovers ?? 0 });

  // La conquête. `att.melees` vaut 0 pour un trois-quarts : la ligne est donc
  // absente pour lui, sans avoir besoin d'un test de poste ici.
  if (att.melees > 0) {
    ajouter('ml.note.melees', `Mêlée (${s.melees ?? 0})`,
      borner(((s.melees ?? 0) - att.melees * part) / Math.max(4, att.melees * part) * 0.8, -0.7, 0.9),
      { n: s.melees ?? 0 });
    ajouter('ml.note.touches', `Touches captées (${s.touchesGagnees ?? 0})`,
      borner(((s.touchesGagnees ?? 0) - att.touches * part) * 0.22, -0.4, 0.9),
      { n: s.touchesGagnees ?? 0 });
    ajouter('ml.note.pickAndGo', `Pick and go (${s.pickAndGo ?? 0})`,
      borner(((s.pickAndGo ?? 0) - att.pickAndGo * part) * 0.10, -0.4, 0.7),
      { n: s.pickAndGo ?? 0 });
  }
  // Le 50/22 est un coup de maître : il retourne une position, on le paie cher.
  ajouter('ml.note.cinquanteVingtDeux', `50/22 réussis (${s.cinquanteVingtDeux ?? 0})`,
    borner((s.cinquanteVingtDeux ?? 0) * 0.7, 0, 1.4), { n: s.cinquanteVingtDeux ?? 0 });

  // ⚠️ Le rouge n'est pas un jaune. `cartons` reste le total pour compatibilité
  // (les appelants historiques ne fournissent que lui) ; quand la couleur est
  // connue, un rouge coûte trois fois plus — il a mis son équipe à quatorze.
  const rouges = s.cartonsRouges ?? 0;
  ajouter('ml.note.cartons', 'Cartons', -((s.cartons - rouges) * 1.4 + rouges * 4));

  return lignes;
}

// LA NOTE DU MATCH, sur 10. Elle compare ce qu'a fait le joueur à ce qu'on
// attend de SON POSTE, au prorata de son temps de jeu.
/**
 * La feuille d'un joueur, au format attendu par le barème de note.
 *
 * ⚠️ UNE SEULE EXTRACTION, TROIS USAGES : ce qui part dans la saison
 * (`enregistrerMatchVecu`), ce qui s'affiche en détail de note, et les deux
 * écrans de match. Deux copies, et le détail montré finirait par ne plus
 * correspondre à la note calculée.
 *
 * ⚠️ ELLE A DÉMÉNAGÉ ICI DEPUIS `MatchLive.tsx` le jour où un second écran de
 * match a existé un temps. Ce second écran a disparu, mais la fonction reste
 * ici : une fonction de barème n'avait de toute façon rien à faire dans un
 * composant de rendu.
 */
export function statsPourLaNote(p: Pion): StatsMatchJoueur {
  return {
    points: p.stats.essais * 5 + (p.stats.pointsAuPied ?? p.stats.butsReussis * 2),
    essais: p.stats.essais,
    plaquages: p.stats.plaquages,
    plaquagesManques: p.stats.plaquagesManques,
    passes: p.stats.passes,
    metres: Math.round(p.stats.metres),
    grattages: p.stats.grattages,
    butsTentes: p.stats.butsTentes,
    butsReussis: p.stats.butsReussis,
    cartons: p.stats.cartonsJaunes + p.stats.cartonsRouges,
    minutes: Math.min(80, Math.round(p.minutes)),
    // ⚠️ TOUTE LA FEUILLE REMONTE, pas seulement ce qui se voit. C'est ce qui
    // permet à la note de juger un avant sur son vrai travail (mêlée, touche,
    // ballons portés au ras) et pas sur ses essais.
    passesDecisives: p.stats.passesDecisives,
    offloads: p.stats.offloads,
    franchissements: p.stats.franchissements,
    turnovers: p.stats.passesRatees,
    melees: p.stats.melees,
    touchesGagnees: p.stats.touchesGagnees,
    pickAndGo: p.stats.pickAndGo,
    cinquanteVingtDeux: p.stats.cinquanteVingtDeux,
    cartonsRouges: p.stats.cartonsRouges,
  };
}

export function noterMatch(poste: PosteId, s: StatsMatchJoueur): number {
  const total = detailNote(poste, s).reduce((a, l) => a + l.points, 0);
  return Math.round(borner(total, 1, 10) * 10) / 10;
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
