// LES TUTORIELS CONTEXTUELS (Correctif 18) — une explication, la première fois qu'une chose arrive.
//
// ⚠️ ILS PASSENT PAR LA FILE : jamais par-dessus un autre tutoriel (un seul parcours actif à la fois, voir `guide.ts`).
// ⚠️ ILS NE REVIENNENT PAS : le drapeau est posé à la première fois, qu'on ait lu ou passé.
// ⚠️ EN MATCH, ILS SONT « SOUPLES » : une bulle en haut de l'écran, sans voile, qui n'arrête ni le chrono ni le jeu.

import { useGame } from '../../../store/useGame';
import { ancrePresente } from '../guide';
import { ecranEst } from '../aides';
import type { ParcoursTuto } from '../types';

export const PARCOURS_CONTEXTE: ParcoursTuto[] = [
  // ── Le premier carton (signalé par MatchLive : un carton vient d'être donné) ──
  {
    id: 'context.carton',
    famille: 'contexte',
    priorite: 3,
    souple: true,
    etapes: [{ id: 'carton', titre: true, icone: 'carton' }],
  },

  // ── La première carte spéciale (signalée par l'ouverture d'un pack : ICON, Halloween) ──
  // ⚠️ SIGNALÉE, PAS SURVEILLÉE : l'ouverture d'un pack est souvent déjà guidée (`league.packs`), et un message qui attend son tour doit
  // survivre à la fermeture de la modale — un déclencheur lu dans le DOM l'aurait perdu.
  {
    id: 'context.carteSpeciale',
    famille: 'contexte',
    priorite: 4,
    souple: true,
    etapes: [{ id: 'carte', titre: true, icone: 'etoile' }],
  },

  // ── La première blessure du joueur ───────────────────────────────────────
  {
    id: 'context.blessure',
    famille: 'contexte',
    priorite: 50,
    declencheur: () => ecranEst('carriere') && !!useGame.getState().joueur && ancrePresente('car-blessure'),
    valide: () => ecranEst('carriere') && ancrePresente('car-blessure'),
    etapes: [{ id: 'blessure', cible: 'car-blessure', titre: true, icone: 'soin', cote: 'bas' }],
  },

  // ── Les premiers blessés de la ligue en ligne ────────────────────────────
  {
    id: 'context.infirmerie',
    famille: 'contexte',
    priorite: 51,
    declencheur: () => ecranEst('carriereEnLigne') && ancrePresente('cel-infirmerie'),
    valide: () => ecranEst('carriereEnLigne') && ancrePresente('cel-infirmerie'),
    etapes: [{ id: 'infirmerie', cible: 'cel-infirmerie', titre: true, icone: 'soin', cote: 'bas' }],
  },

  // ── Le premier passage au marché de l'entraîneur ─────────────────────────
  {
    id: 'context.marcheManager',
    famille: 'contexte',
    priorite: 52,
    declencheur: () => ecranEst('manager') && ancrePresente('mgr-marche'),
    valide: () => ecranEst('manager') && ancrePresente('mgr-marche'),
    etapes: [{ id: 'marche', cible: 'mgr-marche', titre: true, icone: 'monde', cote: 'bas' }],
  },
];
