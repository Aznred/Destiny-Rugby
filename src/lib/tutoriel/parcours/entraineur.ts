// LES PARCOURS DE LA CARRIÈRE ENTRAÎNEUR (Correctif 18) — création, bureau du club, composition, premier match.
//
// ⚠️ UNE BULLE PAR FONCTION DU CLUB (effectif, calendrier, classement, finances, entraînement), puis la COMPOSITION se fait POUR DE VRAI :
//    sélectionner, placer, choisir un capitaine ET un buteur (obligatoires), voir où se règle la tactique. Les étapes `action` attendent
//    ce que l'écran signale par `noter(…)` (`components/CompositionTerrainManager.tsx`, `screens/Manager.tsx`) : on ne devine pas
//    l'état d'un composant de l'extérieur.
// ⚠️ LA COMPOSITION EST LA MÊME QUE CELLE DE LA LIGUE EN LIGNE : ses ancres `compo-*` servent aux deux modes.

import { useGame } from '../../../store/useGame';
import { acteDepuisLEtape, ancrePresente } from '../guide';
import { ecranEst, remonter } from '../aides';
import type { ParcoursTuto } from '../types';

const surManager = (): boolean => ecranEst('manager') && !!useGame.getState().manager?.club;

export const PARCOURS_ENTRAINEUR: ParcoursTuto[] = [
  // ── La création : le mode, le nom, le club, le contrat ───────────────────
  {
    id: 'coach.creation',
    famille: 'coach',
    priorite: 10,
    declencheur: () => ancrePresente('cm-formulaire'),
    valide: () => ecranEst('creationManager'),
    etapes: [
      { id: 'bienvenue', type: 'carte', titre: true, icone: 'entraineur', bouton: 'tg.ui.commencer' },
      { id: 'mode', cible: 'cm-mode', icone: 'trophee', cote: 'bas' },
      { id: 'identite', cible: 'cm-identite', icone: 'signature', cote: 'bas' },
      { id: 'club', cible: 'cm-club', icone: 'stade', cote: 'bas' },
      { id: 'contrat', cible: 'cm-contrat', icone: 'contrat', cote: 'haut', patience: 800 },
      { id: 'valider', type: 'clic', cible: 'cm-valider', icone: 'signature', cote: 'haut' },
    ],
  },

  // ── Le bureau du club : une bulle par fonction ───────────────────────────
  {
    id: 'coach.club',
    famille: 'coach',
    priorite: 20,
    declencheur: () => surManager() && ancrePresente('mgr-club'),
    valide: surManager,
    etapes: [
      { id: 'bienvenue', type: 'carte', titre: true, icone: 'stade', avant: remonter },
      { id: 'club', cible: 'mgr-club', icone: 'stade', cote: 'bas' },
      { id: 'kpis', cible: 'mgr-kpis', icone: 'resultats', cote: 'bas' },
      { id: 'classement', cible: 'mgr-classement', icone: 'trophee', cote: 'haut' },
      { id: 'prochain', cible: 'mgr-prochain', icone: 'ballon', cote: 'haut' },
      { id: 'actions', cible: 'mgr-actions', icone: 'equipe', cote: 'bas' },
      { id: 'finances', cible: 'mgr-onglet-tresorerie', icone: 'euro', cote: 'bas' },
      { id: 'entrainement', cible: 'mgr-onglet-entrainement', icone: 'halteres', cote: 'bas' },
      { id: 'calendrier', cible: 'mgr-onglet-calendrier', icone: 'calendrier', cote: 'bas' },
      { id: 'composition', type: 'clic', cible: 'mgr-onglet-equipe', titre: true, icone: 'equipe', anim: 'clic', cote: 'bas' },
    ],
  },

  // ── La composition : titulaires, remplaçants, forme, fatigue, rôles, tactique ──
  {
    id: 'coach.composition',
    famille: 'coach',
    priorite: 22,
    // ⚠️ L'ancre est celle du TERRAIN, pas de l'écran entier : la composition s'ouvre en plein écran, et l'écran du club est alors
    // recouvert — une ancre recouverte n'est pas visible (`estVisible`).
    declencheur: () => surManager() && ancrePresente('compo-terrain'),
    valide: () => surManager() && ancrePresente('compo-terrain'),
    etapes: [
      { id: 'terrain', cible: 'compo-terrain', titre: true, icone: 'equipe', cote: 'bas' },
      { id: 'carte', cible: 'compo-carte', icone: 'coeur', cote: 'droite', patience: 900 },
      { id: 'alertes', cible: 'compo-alertes', icone: 'alerte', cote: 'bas' },
      {
        id: 'selection', type: 'action', cible: 'compo-banc', titre: true, icone: 'joueur', anim: 'clic', cote: 'haut',
        jusqua: () => acteDepuisLEtape('compo.selection') || acteDepuisLEtape('compo.place'),
      },
      {
        id: 'placer', type: 'action', cible: 'compo-terrain', icone: 'equipe', anim: 'glisser', cote: 'bas',
        jusqua: () => acteDepuisLEtape('compo.place'),
      },
      { id: 'banc', cible: 'compo-banc', icone: 'banc', cote: 'haut' },
      // La composition s'ouvre en plein écran et masque le reste : on la referme pour atteindre les rôles et la tactique.
      { id: 'retour', type: 'clic', cible: 'compo-fermer', icone: 'plein-ecran', anim: 'clic', cote: 'bas', patience: 700 },
      {
        id: 'roles', type: 'action', cible: 'mgr-roles', titre: true, icone: 'brassard', anim: 'clic', cote: 'haut',
        jusqua: () => acteDepuisLEtape('coach.capitaine') && acteDepuisLEtape('coach.buteur'),
      },
      { id: 'autres', cible: 'mgr-roles', icone: 'lanceur', cote: 'haut' },
      { id: 'tactique', cible: 'mgr-tactique', titre: true, icone: 'cible', cote: 'haut' },
      { id: 'meilleure', cible: 'compo-meilleure', icone: 'eclair', cote: 'bas', patience: 900 },
    ],
  },

  // ── Pendant le match : la tactique et les remplacements se règlent en direct (le match est ARRÊTÉ le temps de lire) ──
  {
    id: 'coach.matchLive',
    famille: 'coach',
    priorite: 26,
    figeLeMatch: true,
    declencheur: () => ancrePresente('ml-coaching-manager') || ancrePresente('ml-bouton-tiroir-manager'),
    valide: () => ancrePresente('ml-coaching-manager') || ancrePresente('ml-bouton-tiroir-manager'),
    etapes: [
      {
        id: 'tiroir', type: 'clic', cible: 'ml-bouton-tiroir-manager', titre: true, icone: 'entraineur', anim: 'clic', cote: 'haut',
        // Sur grand écran, la tactique est déjà là, dans la colonne de droite.
        ignorerSi: () => ancrePresente('ml-coaching-manager'),
      },
      { id: 'tactique', cible: 'ml-coaching-manager', titre: true, icone: 'cible', cote: 'gauche', patience: 2500 },
      { id: 'remplacement', cible: 'ml-changement', titre: true, icone: 'repost', cote: 'gauche', patience: 2500 },
    ],
  },

  // ── Le premier match : on le lance depuis l'écran de match du club ───────
  {
    id: 'coach.premierMatch',
    famille: 'coach',
    priorite: 25,
    declencheur: () => surManager() && ancrePresente('mgr-lancer'),
    valide: surManager,
    etapes: [
      { id: 'lancer', type: 'clic', cible: 'mgr-lancer', titre: true, icone: 'sifflet', anim: 'clic', cote: 'haut' },
    ],
  },
];
