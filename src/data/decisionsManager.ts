import type { DecisionManager, Manager } from '../types';
import { t } from '../lib/i18n';
import { graine } from '../lib/championnat';

type ModeleDecision = {
  id: string;
  emoji: string;
};

const MODELES: ModeleDecision[] = [
  {
    id: 'cadre_mecontent', emoji: '🗣️',
  },
  {
    id: 'jeune_lancer', emoji: '🌱',
  },
  {
    id: 'board_recrue', emoji: '📋',
  },
  {
    id: 'presse_tactique', emoji: '🎙️',
  },
  {
    id: 'entrainement', emoji: '🏋️',
  },
  {
    id: 'capitaine', emoji: '🛡️',
  },
];

/** Une décision stable pour cette carrière et cette semaine. */
export function decisionManagerPour(manager: Manager): DecisionManager {
  const rng = graine(`decision-manager#${manager.nom}#${manager.club}#${manager.saison}#${manager.semaine}`);
  const modele = MODELES[Math.floor(rng() * MODELES.length)];
  return {
    id: `${modele.id}#${manager.saison}#${manager.semaine}`,
    emoji: modele.emoji,
    titre: t(`mgr.decision.${modele.id}.titre`),
    texte: t(`mgr.decision.${modele.id}.texte`, { club: manager.club }),
    choix: [
      { confiance: 2, budgetSalarial: -15_000 },
      { prestige: 2, confiance: -1 },
      { confiance: -1, budgetTransferts: 25_000 },
    ].map((effet, i) => ({
      id: `${modele.id}.${i}`,
      label: t(`mgr.decision.choix${i + 1}`),
      consequence: t(`mgr.decision.consequence${i + 1}`),
      ...effet,
    })),
  };
}
