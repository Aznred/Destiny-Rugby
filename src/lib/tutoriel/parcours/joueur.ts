// LES PARCOURS DE LA CARRIÈRE JOUEUR (Correctif 18) — création, écran de carrière, puis une carte PAR RESPONSABILITÉ obtenue.
//
// ⚠️ LA CARRIÈRE JOUEUR EST INDÉPENDANTE DE LA LIGUE EN LIGNE : ses parcours ne supposent ni compte, ni ligue, ni packs.
// ⚠️ LES RESPONSABILITÉS S'EXPLIQUENT QUAND ON LES REÇOIT, jamais avant : « Tu viens d'être nommé buteur principal… » n'a de sens que
//    le jour où c'est vrai. Le déclencheur lit `joueur.responsabilites` (voir `lib/responsabilites.ts`), pas un calendrier.
// ⚠️ LE PREMIER MATCH EST CELUI DU CONTRÔLE DIRECT : la dernière étape de l'écran de carrière emmène vers lui, et ce sont les cartes
//    du match lui-même (`lib/controleDirect/tutoriel.ts`, `components/match/Responsabilites.tsx`) qui prennent le relais, au moment
//    où chaque geste sert.

import { useGame } from '../../../store/useGame';
import { rolesDuJoueur } from '../../responsabilites';
import type { RoleEquipe } from '../../moteur/responsabilites';
import { ancrePresente } from '../guide';
import { ecranEst, geste, remonter } from '../aides';
import type { EtapeTuto, ParcoursTuto } from '../types';

const surCarriere = (): boolean => ecranEst('carriere') && !!useGame.getState().joueur;

/**
 * Sur téléphone, la fiche du joueur est derrière l'onglet « Profil » : on l'ouvre avant d'en expliquer un morceau.
 * (Sur grand écran la barre d'onglets n'est pas visible : le clic ne vise rien.)
 */
const ouvrirLaFicheSurTelephone = (): void => {
  const onglet = document.querySelector<HTMLElement>('.carriere-mobile-vues [aria-controls="carriere-joueur"]');
  if (onglet && onglet.offsetParent !== null) onglet.click();
};
const ouvrirLeRecitSurTelephone = (): void => {
  const onglet = document.querySelector<HTMLElement>('.carriere-mobile-vues [aria-controls="carriere-jeu"]');
  if (onglet && onglet.offsetParent !== null) onglet.click();
};

// ───────────────────────────────────────────────────────────────────────────
// Les responsabilités : une carte quand on les reçoit
// ───────────────────────────────────────────────────────────────────────────

const tient = (...roles: RoleEquipe[]): boolean => {
  const j = useGame.getState().joueur;
  if (!j) return false;
  const siens = rolesDuJoueur(j);
  return roles.some((r) => siens.includes(r));
};

function parcoursDeRole(
  id: string, roles: RoleEquipe[], icone: EtapeTuto['icone'], anim?: EtapeTuto['anim'], priorite = 40,
): ParcoursTuto {
  return {
    id: `player.role.${id}`,
    famille: 'player',
    priorite,
    // Sur la carrière, et la fiche chargée : le bloc « Rôles dans l'équipe » est dans son panneau.
    declencheur: () => surCarriere() && tient(...roles),
    valide: surCarriere,
    etapes: [
      { id: 'annonce', type: 'carte', titre: true, icone, anim, bouton: 'tg.ui.suivant' },
      {
        id: 'bloc', cle: 'tg.player.rolebloc', cible: 'roles-equipe', icone: 'brassard', cote: 'bas', patience: 700,
        avant: ouvrirLaFicheSurTelephone,
      },
    ],
    fin: ouvrirLeRecitSurTelephone,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Les parcours
// ───────────────────────────────────────────────────────────────────────────

export const PARCOURS_JOUEUR: ParcoursTuto[] = [
  // ── Le choix du départ (Correctif 19) : deux façons de commencer, présentées en trois phrases ──
  // ⚠️ PAS DE SECOND TUTORIEL POUR « JOUEUR EXISTANT » : une fois la carte choisie, tous les systèmes sont ceux de la
  // carrière ordinaire (écran de carrière, premier match, responsabilités) — leurs parcours se déclenchent comme avant.
  {
    id: 'player.depart',
    famille: 'player',
    priorite: 9,
    declencheur: () => ancrePresente('cr-origine-choix'),
    valide: () => ecranEst('creation'),
    etapes: [
      { id: 'choix', type: 'carte', titre: true, icone: 'joueur', bouton: 'tg.ui.suivant' },
      { id: 'creer', cible: 'cr-origine-creer', icone: 'signature', cote: 'bas' },
      { id: 'existant', cible: 'cr-origine-existant', icone: 'profil', cote: 'bas' },
    ],
  },

  // ── La création : un choix à la fois, le poste d'abord pesé ──────────────
  {
    id: 'player.creation',
    famille: 'player',
    priorite: 10,
    declencheur: () => ancrePresente('cr-formulaire'),
    valide: () => ecranEst('creation'),
    etapes: [
      { id: 'bienvenue', type: 'carte', titre: true, icone: 'joueur', bouton: 'tg.ui.commencer' },
      { id: 'nom', cible: 'cr-nom', icone: 'signature', cote: 'bas' },
      { id: 'origine', cible: 'cr-origine', icone: 'monde', cote: 'bas' },
      { id: 'club', cible: 'cr-club', icone: 'stade', cote: 'bas' },
      { id: 'poste', type: 'clic', cible: 'cr-poste', titre: true, icone: 'maillot', anim: 'clic', cote: 'haut' },
      { id: 'traits', cible: 'cr-traits', icone: 'etoile', cote: 'haut' },
      { id: 'valider', type: 'clic', cible: 'cr-valider', icone: 'ballon', cote: 'haut' },
    ],
  },

  // ── L'écran de carrière : qui je suis, comment je progresse, mon prochain match ──
  {
    id: 'player.carriere',
    famille: 'player',
    priorite: 20,
    declencheur: () => surCarriere() && ancrePresente('car-identite'),
    valide: surCarriere,
    etapes: [
      { id: 'bienvenue', type: 'carte', titre: true, icone: 'ballon', avant: remonter },
      { id: 'identite', cible: 'car-identite', icone: 'profil', cote: 'bas' },
      { id: 'gen', cible: 'car-gen', titre: true, icone: 'etoile', cote: 'bas' },
      { id: 'jauges', cible: 'car-jauges', icone: 'batterie', cote: 'bas' },
      { id: 'attributs', cible: 'car-attributs', icone: 'halteres', cote: 'gauche', patience: 700, avant: ouvrirLaFicheSurTelephone },
      { id: 'stats', cible: 'car-stats', icone: 'resultats', cote: 'haut' },
      {
        id: 'entrainement', type: 'clic', cible: 'car-entrainement-choix', titre: true, icone: 'halteres', anim: 'clic', cote: 'haut',
        patience: 700,
      },
      // Pas de match cette semaine (l'intersaison) : le bouton « Semaine suivante » est là, le match viendra.
      { id: 'semaine', cible: 'car-semaine', icone: 'calendrier', cote: 'haut', patience: 700 },
    ],
    // La fiche est restée ouverte pendant le tutoriel : sur téléphone, on rend le récit.
    fin: () => { if (!document.querySelector('.overlay-match')) ouvrirLeRecitSurTelephone(); },
  },

  // ── Le premier match : dès que le bouton existe, qu'on ait fait le tour de l'écran ou non ──
  {
    id: 'player.premierMatch',
    famille: 'player',
    priorite: 25,
    declencheur: () => surCarriere() && ancrePresente('car-match'),
    valide: surCarriere,
    etapes: [
      { id: 'match', type: 'clic', cible: 'car-match', titre: true, icone: 'sifflet', anim: 'clic', cote: 'haut' },
    ],
  },

  // ── Une carte par responsabilité obtenue ─────────────────────────────────
  parcoursDeRole('capitaine', ['capitaine'], 'brassard', undefined, 30),
  parcoursDeRole('vice', ['viceCapitaine'], 'brassard', undefined, 31),
  parcoursDeRole('buteur', ['buteur', 'buteur2'], 'poteaux', geste('glisse', 'molette'), 32),
  parcoursDeRole('lanceur', ['lanceur', 'lanceur2'], 'lanceur', geste('glisse', 'molette'), 33),
  parcoursDeRole('engagement', ['engagement'], 'engagement', geste('glisse', 'molette'), 34),
  parcoursDeRole('droppeur', ['droppeur'], 'drop', geste('clic', 'clic'), 35),
];
