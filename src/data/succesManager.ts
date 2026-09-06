// SUCCÈS D'ENTRAÎNEUR — une carrière de banc a sa propre collection dans L'Ovale.
//
// Les ids sont préfixés `manager_` afin de partager sans collision le registre
// persistant `succesDebloques` avec la carrière de joueur. Toutes les conditions
// lisent des faits déjà enregistrés : matchs, saisons, promotions, palmarès,
// formation et décisions. Aucun succès ne dépend d'un tirage d'affichage.

import type { Manager, SuccesDebloques } from '../types.js';

export interface SuccesManager {
  id: string;
  emoji: string;
  nom: string;
  desc: string;
  ovas: number;
  secret?: boolean;
  atteint: (manager: Manager) => boolean;
}

function resultats(manager: Manager) {
  return Object.values(manager.resultats ?? {});
}

function victoires(manager: Manager): number {
  return resultats(manager).filter((r) => r.scorePour > r.scoreContre).length;
}

function trophees(manager: Manager): string[] {
  return (manager.palmares ?? []).map((t) => t.trophee);
}

export const SUCCES_MANAGER: SuccesManager[] = [
  {
    id: 'manager_premier_match', emoji: '📋', nom: 'Première feuille', ovas: 1,
    desc: 'Diriger ton premier match officiel.',
    atteint: (m) => resultats(m).length >= 1,
  },
  {
    id: 'manager_premiere_victoire', emoji: '✅', nom: 'Premier succès', ovas: 1,
    desc: 'Remporter ton premier match comme entraîneur.',
    atteint: (m) => victoires(m) >= 1,
  },
  {
    id: 'manager_dix_victoires', emoji: '🔟', nom: 'Le banc prend forme', ovas: 2,
    desc: 'Atteindre dix victoires comme entraîneur.',
    atteint: (m) => victoires(m) >= 10,
  },
  {
    id: 'manager_cinquante_matchs', emoji: '🧠', nom: 'Vieux briscard', ovas: 4,
    desc: 'Diriger cinquante rencontres officielles.',
    atteint: (m) => resultats(m).length >= 50,
  },
  {
    id: 'manager_objectif', emoji: '🎯', nom: 'Mission accomplie', ovas: 2,
    desc: 'Tenir l’objectif fixé par la direction.',
    atteint: (m) => m.historique.some((s) => s.tenu),
  },
  {
    id: 'manager_trois_objectifs', emoji: '📈', nom: 'La confiance du board', ovas: 4,
    desc: 'Tenir les objectifs de trois saisons.',
    atteint: (m) => m.historique.filter((s) => s.tenu).length >= 3,
  },
  {
    id: 'manager_promotion', emoji: '⬆️', nom: 'À l’étage supérieur', ovas: 3,
    desc: 'Obtenir une promotion avec ton club.',
    atteint: (m) => m.historique.some((s) => s.montee),
  },
  {
    id: 'manager_premier_titre', emoji: '🏆', nom: 'Le premier du banc', ovas: 4,
    desc: 'Remporter ton premier trophée comme entraîneur.',
    atteint: (m) => trophees(m).length >= 1,
  },
  {
    id: 'manager_trois_titres', emoji: '🏛️', nom: 'Une vraie armoire', ovas: 7,
    desc: 'Remporter trois trophées comme entraîneur.',
    atteint: (m) => trophees(m).length >= 3,
  },
  {
    id: 'manager_coupe_europe', emoji: '⭐', nom: 'Maître d’Europe', ovas: 8,
    desc: 'Gagner une coupe européenne.',
    atteint: (m) => trophees(m).some((id) => ['champions', 'challenge'].includes(id)),
  },
  {
    id: 'manager_double', emoji: '✨', nom: 'Le doublé', ovas: 10, secret: true,
    desc: 'Remporter deux trophées pendant la même saison.',
    atteint: (m) => {
      const saisons = new Map<number, number>();
      for (const titre of m.palmares ?? []) saisons.set(titre.saison, (saisons.get(titre.saison) ?? 0) + 1);
      return [...saisons.values()].some((n) => n >= 2);
    },
  },
  {
    id: 'manager_cinq_saisons', emoji: '📅', nom: 'Projet installé', ovas: 4,
    desc: 'Boucler cinq saisons sur un banc.',
    atteint: (m) => m.historique.length >= 5,
  },
  {
    id: 'manager_dix_saisons', emoji: '🗿', nom: 'Monument du banc', ovas: 8, secret: true,
    desc: 'Boucler dix saisons comme entraîneur.',
    atteint: (m) => m.historique.length >= 10,
  },
  {
    id: 'manager_prestige_50', emoji: '📣', nom: 'Coach reconnu', ovas: 4,
    desc: 'Atteindre 50 de prestige.',
    atteint: (m) => m.prestige >= 50,
  },
  {
    id: 'manager_prestige_80', emoji: '👑', nom: 'Référence mondiale', ovas: 9, secret: true,
    desc: 'Atteindre 80 de prestige.',
    atteint: (m) => m.prestige >= 80,
  },
  {
    id: 'manager_trois_clubs', emoji: '🧳', nom: 'Le carnet d’adresses', ovas: 4,
    desc: 'Entraîner trois clubs différents.',
    atteint: (m) => new Set(m.clubs).size >= 3,
  },
  {
    id: 'manager_formateur', emoji: '🌱', nom: 'Lancé chez les grands', ovas: 4,
    desc: 'Faire sortir un joueur du centre de formation.',
    atteint: (m) => (m.jeunesFormes ?? []).length >= 1,
  },
  {
    id: 'manager_recruteur', emoji: '✍️', nom: 'Bâtisseur d’effectif', ovas: 3,
    desc: 'Finaliser cinq recrutements.',
    atteint: (m) => (m.recrues ?? []).length >= 5,
  },
  {
    id: 'manager_selection', emoji: '🌍', nom: 'Au service d’une nation', ovas: 6,
    desc: 'Diriger un match international.',
    atteint: (m) => (m.avancee?.selection?.matchs ?? 0) >= 1,
  },
  {
    id: 'manager_sans_licenciement', emoji: '🤝', nom: 'Toujours maître du projet', ovas: 6,
    desc: 'Boucler cinq saisons sans être licencié.',
    atteint: (m) => m.historique.length >= 5 && !m.historique.some((s) => s.licencie),
  },
];

export function evaluerSuccesManager(manager: Manager, deja: SuccesDebloques): SuccesManager[] {
  return SUCCES_MANAGER.filter((succes) => deja[succes.id] == null && succes.atteint(manager));
}

export function progressionSuccesManager(deja: SuccesDebloques): { faits: number; total: number } {
  return {
    faits: SUCCES_MANAGER.filter((succes) => deja[succes.id] != null).length,
    total: SUCCES_MANAGER.length,
  };
}
