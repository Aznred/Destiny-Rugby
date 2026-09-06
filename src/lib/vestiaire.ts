// LE VESTIAIRE VIVANT — affinités, rivalités et brassard de capitaine.
//
// Un rugbyman ne joue pas seul : il a des potes avec qui tout est plus simple,
// des types avec qui ça ne passe pas, et parfois le brassard. Ces liens ne sont
// pas décoratifs — ils modifient les notes de match et le moral.

import type { Joueur, Relation } from '../types.js';
import { effectifDuClub } from './effectif.js';
import { effetsTraits } from '../data/traits.js';

// PRNG déterministe (même graine = même vestiaire).
function graine(s: string): () => number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Nouvelles relations nouées à l'arrivée dans une saison : on se lie surtout
// avec les joueurs de son âge et de son secteur de jeu.
export function nouerRelations(j: Joueur, saison: number): Relation[] {
  const groupe = effectifDuClub(j.club, saison);
  if (groupe.length < 8) return [];
  const rng = graine(`vestiaire#${j.nom}#${j.club}#${saison}`);
  const sociabilite = effetsTraits(j.traits).vestiaire; // −1 à +2 selon les traits
  const nouvelles: Relation[] = [];

  // 1 à 2 amitiés (davantage si le joueur est apprécié du groupe).
  const nbAmis = Math.max(0, 1 + Math.round(sociabilite / 2) + (rng() < 0.3 ? 1 : 0));
  const candidats = [...groupe].sort((a, b) => Math.abs(a.age - j.age) - Math.abs(b.age - j.age)).slice(0, 12);
  for (let n = 0; n < nbAmis && candidats.length; n++) {
    const ami = candidats[Math.floor(rng() * candidats.length)];
    nouvelles.push({ nom: ami.nom, club: j.club, type: 'ami', depuis: saison });
  }

  // Une rivalité de temps en temps — plus souvent si le caractère est difficile.
  if (rng() < 0.18 - sociabilite * 0.04) {
    const rival = groupe[Math.floor(rng() * groupe.length)];
    nouvelles.push({ nom: rival.nom, club: j.club, type: 'nemesis', depuis: saison });
  }

  // Dédoublonnage : on ne se lie pas deux fois avec le même joueur.
  const vues = new Set((j.relations ?? []).map((r) => r.nom));
  return nouvelles.filter((r) => {
    if (vues.has(r.nom)) return false;
    vues.add(r.nom);
    return true;
  });
}

// Amis présents dans l'effectif actuel : ce sont eux qui aident sur le terrain.
export function amisPresents(j: Joueur, saison: number): Relation[] {
  const noms = new Set(effectifDuClub(j.club, saison).map((c) => c.nom));
  return (j.relations ?? []).filter((r) => r.type === 'ami' && noms.has(r.nom));
}

// Effet des relations sur la note d'un match : jouer entouré de ses potes aide,
// avoir une némésis dans le groupe pèse.
export function bonusVestiaire(j: Joueur, saison: number): number {
  const amis = amisPresents(j, saison).length;
  const noms = new Set(effectifDuClub(j.club, saison).map((c) => c.nom));
  const nemesis = (j.relations ?? []).filter((r) => r.type === 'nemesis' && noms.has(r.nom)).length;
  return Math.min(0.6, amis * 0.2) - Math.min(0.5, nemesis * 0.25);
}

// ---------------------------------------------------------------------------
// BRASSARD DE CAPITAINE
// Il ne se demande pas : il se mérite. Il faut peser dans le groupe (niveau),
// avoir du mental, de la bouteille, et être respecté (réputation, traits).
// ---------------------------------------------------------------------------
export function scoreLeadership(j: Joueur, forceGroupe: number): number {
  const vals = Object.values(j.attributs);
  const gen = vals.reduce((a, b) => a + b, 0) / vals.length;
  return (
    (gen - forceGroupe) * 1.2 + // être au-dessus du groupe
    j.attributs.mental * 0.35 +
    j.reputation * 0.2 +
    Math.max(0, j.age - 24) * 1.2 + // l'expérience
    (j.mentorat ? 6 : 0) +
    effetsTraits(j.traits).leadership * 2
  );
}

// Seuil de nomination : environ 45 points, c'est-à-dire un cadre reconnu.
export const SEUIL_CAPITANAT = 45;

export function meriteLeBrassard(j: Joueur, forceGroupe: number): boolean {
  return scoreLeadership(j, forceGroupe) >= SEUIL_CAPITANAT;
}
