// LE COUP DE PIED EN UNE SEULE ACTION — Correctif 40, IA de niveau 8 (`frappeFranche`).
//
// Demande : « un input = une seule action de kick = une seule animation = un seul événement de contact = départ immédiat
// et synchronisé du ballon ».
//
// ⚠️ CE QUE LE MOTEUR FAISAIT (mesuré par `scripts/sonderFrappes40.ts`, niveau 7) : le botteur devait REVENIR à l'endroit
// où le coup de pied avait été demandé. À l'arrêt, 0,45 à 0,60 s entre la demande et le départ du ballon. En course, il
// dépassait ce point d'un pas à l'autre : l'armé était annulé, il freinait, revenait sur ses pas, et l'armé repartait de
// zéro — 1,65 à 1,80 s, DEUX gestes de frappe, quatre à neuf mètres parcourus pour rien. C'est « l'animation jouée deux
// fois » et « le délai énorme ».
//
// Au niveau 8, un coup de pied tapé ballon en main est UNE ACTION, avec un numéro (`id`) et des instants écrits à la demande :
//
//   demande ─(orientation : 0 ou 1 pas)→ armé ─(amorce : 1 à 3 pas selon le geste)→ CONTACT ─(suivi)→ reprise
//
//   - il ne revient nulle part : il tape de là où il est quand le pied touche le ballon, sur sa course ;
//   - `armeA` et `contactA` sont FIXÉS à la demande et ne bougent plus : l'armé ne se relance jamais ;
//   - tant que `contactA` n'est pas atteint il reste plaquable (le geste est alors abandonné, pas rejoué) ;
//   - à `contactA` le ballon part — contré ou gêné par celui qui est sur lui à cet instant, jamais avant.
//
// La scène cale son clip sur `contactA` (son image de contact tombe à cet instant) : il n'y a plus deux horloges.
// Sans le niveau 8, rien ne change : le moteur rejoue à l'identique (empreintes des niveaux 3, 5, 6 et 7 vérifiées).
//
// Module FEUILLE : aucun import du moteur, pour que la scène reçoive ces fonctions telles quelles (`outils`).
import type { EtatMatch, IntentionPied } from './etat.js';
import { FRAPPE_VIVE } from './conquete.js';

/** Le coup de pied en une seule action : matchs de carrière (`IA_MATCH_DE_CARRIERE`) et ligue en règles 10. */
export function frappeFranche(e: Pick<EtatMatch, 'ia'>): boolean { return (e.ia ?? 1) >= 8; }

/**
 * Le geste, tel que la scène le joue :
 *   rasant     — tapé au ras du sol, d'un geste court ;
 *   parDessus  — petit coup de pied par-dessus le rideau ;
 *   course     — dégagement, occupation, chandelle ou transversale tapés dans la course ;
 *   boite      — le 9 derrière son regroupement : il se prépare, puis tape haut ;
 *   drop       — le ballon est lâché, touche la pelouse, et le pied le reprend.
 */
export type GesteDeFrappe = 'rasant' | 'parDessus' | 'course' | 'boite' | 'drop';

/** Sous cette allure (m/s), un 9 qui vient de ramasser derrière son regroupement tape une boîte, pas un coup de pied en course. */
const ALLURE_DE_BOITE = 2;

/** Le ballon sort tout juste d'un regroupement (ou y est encore) : le 9 qui tape là prépare une boîte. */
export function aLaSortieDuRuck(e: Pick<EtatMatch, 'phase' | 'gardeRuck' | 'controleEquipe'>): boolean {
  return e.phase === 'ruck' || e.gardeRuck > 0 || !!e.controleEquipe?.sortie;
}

export function gesteDeFrappe(intention: IntentionPied, numero: number, allure: number, auRuck = false): GesteDeFrappe {
  if (intention === 'drop') return 'drop';
  if (intention === 'rasant') return 'rasant';
  if (intention === 'parDessus') return 'parDessus';
  if (numero === 9 && auRuck && allure < ALLURE_DE_BOITE) return 'boite';
  return 'course';
}

/**
 * L'AMORCE, en pas du moteur (0,15 s) : le temps entre l'armé et le contact pied-ballon. Chaque geste a la sienne — un
 * rasant et un petit par-dessus partent presque aussitôt, un dégagement prend deux appuis, un drop le temps de lâcher le
 * ballon et de le reprendre au rebond, une boîte celui de se redresser derrière le regroupement.
 * ⚠️ En PAS, pas en secondes : le contact tombe sur un pas, et la scène — qui affiche le match un pas en retard — dispose
 * d'un pas de plus pour dérouler son clip. Un rasant armé part donc 0,15 s plus tard pour le moteur, 0,30 s à l'image.
 */
export const AMORCE_EN_PAS: Record<GesteDeFrappe, number> = { rasant: 1, parDessus: 1, course: 2, boite: 3, drop: 3 };

/** Au-delà de cet écart (radians) entre sa course et sa visée, le botteur prend un pas pour se tourner avant d'armer. */
export const ECART_D_ORIENTATION = 1.75;

/** Après le contact, le botteur finit sa jambe : il ne repart pas à pleine allure avant ce délai (secondes). */
export const SUIVI_DE_FRAPPE = 0.3;

interface V2 { x: number; y: number }

/** Nombre de pas d'orientation avant l'armé : 0 quand il tape devant lui, 1 quand il doit se retourner. */
export function pasDOrientation(vitesse: V2, de: V2, vers: V2, sensAttaque: number): number {
  const allure = Math.hypot(vitesse.x, vitesse.y);
  // À l'arrêt il fait face au jeu ; lancé, il regarde où il court.
  const fx = allure > 1.2 ? vitesse.x / allure : sensAttaque, fy = allure > 1.2 ? vitesse.y / allure : 0;
  const dx = vers.x - de.x, dy = vers.y - de.y, d = Math.hypot(dx, dy);
  if (d < 0.5) return 0;
  const ecart = Math.acos(Math.max(-1, Math.min(1, (fx * dx + fy * dy) / d)));
  return ecart > ECART_D_ORIENTATION ? 1 : 0;
}

export interface PlanDeFrappe { geste: GesteDeFrappe; armeA: number; contactA: number }

/**
 * Les instants d'un coup de pied demandé au pas `sim` : quand l'armé commence, quand le pied touche le ballon.
 * Pure : le pilote s'en sert pour ANNONCER le geste à l'image même de l'appui, avant que le moteur ait joué son pas.
 */
export function planDeFrappe(
  intention: IntentionPied, numero: number, vitesse: V2, de: V2, vers: V2, sensAttaque: number, sim: number, dt: number, auRuck = false,
): PlanDeFrappe {
  const geste = gesteDeFrappe(intention, numero, Math.hypot(vitesse.x, vitesse.y), auRuck);
  const armeA = sim + pasDOrientation(vitesse, de, vers, sensAttaque) * dt;
  return { geste, armeA, contactA: armeA + AMORCE_EN_PAS[geste] * dt };
}

/** Le délai entre l'armé et la frappe des niveaux d'avant (secondes), tel que `armerFrappe` le calcule. */
export function delaiDeFrappeHistorique(
  e: Pick<EtatMatch, 'ia'>, attente: { intention: IntentionPied; rapideArcade?: boolean; avaitBallon?: boolean }, numero: number,
): number {
  const duGeste = attente.rapideArcade ? 0.28 : attente.intention === 'drop' ? 1.12 : attente.intention === 'renvoi' ? 1.05 : numero === 9 ? 0.84 : 0.7;
  const contestable = (e.ia ?? 1) >= 5 && !!attente.avaitBallon && attente.intention !== 'renvoi';
  if (!contestable || attente.rapideArcade) return duGeste;
  return attente.intention === 'rasant' ? FRAPPE_VIVE.rasant : attente.intention === 'drop' ? FRAPPE_VIVE.drop
    : numero === 9 ? FRAPPE_VIVE.boite : attente.intention === 'chandelle' || attente.intention === 'parDessus' ? FRAPPE_VIVE.chip : FRAPPE_VIVE.degagement;
}

/**
 * L'INSTANT DU CONTACT PIED-BALLON, pour l'affichage. Niveau 8 : celui que le moteur a écrit. Niveaux d'avant : celui que
 * son délai annonce, arrondi au pas où il tapera — une ESTIMATION (un armé peut encore y être remis à zéro), que la scène
 * corrige d'elle-même quand le vol apparaît. `undefined` tant que rien n'est armé.
 */
export function contactDeFrappe(
  e: Pick<EtatMatch, 'ia'>,
  attente: { intention: IntentionPied; pretDepuis?: number; contactA?: number; rapideArcade?: boolean; avaitBallon?: boolean },
  numero: number, dt = 0.15,
): number | undefined {
  if (attente.contactA !== undefined) return attente.contactA;
  if (attente.pretDepuis === undefined) return undefined;
  const delai = delaiDeFrappeHistorique(e, attente, numero);
  return attente.pretDepuis + Math.ceil(delai / dt - 1e-6) * dt;
}
