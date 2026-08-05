import type { StatVariable } from '../types';
import { t } from '../lib/i18n';

// Évènements aléatoires jouables SANS IA : un pool crédible avec récit, bonus,
// malus et récompense en Ovas. Le MJ IA reste dispo pour les actions libres.
export interface EvenementAleatoire {
  id: string;
  emoji: string;
  titre: string;
  recit: string;
  deltas: Partial<Record<StatVariable, number>>;
  ovas: number;
  positif: boolean;
}

export const EVENEMENTS: EvenementAleatoire[] = [
  {
    id: 'repere',
    emoji: '👀',
    titre: 'Repéré par un recruteur',
    recit: "Un recruteur d'un grand club t'a observé à l'entraînement. Ta cote grimpe.",
    deltas: { reputation: 8, moral: 6 },
    ovas: 25,
    positif: true,
  },
  {
    id: 'blessure',
    emoji: '🤕',
    titre: 'Petite blessure',
    recit: 'Une gêne à l’ischio te freine deux semaines. La rééducation entame ta forme.',
    deltas: { forme: -18, endurance: -1 },
    ovas: 8,
    positif: false,
  },
  {
    id: 'essai',
    emoji: '🎯',
    titre: 'Essai en solitaire',
    recit: 'Crochet, appui, et tu aplatis dans le coin ! Le stade explose.',
    deltas: { reputation: 10, moral: 10, vitesse: 1 },
    ovas: 30,
    positif: true,
  },
  {
    id: 'presse',
    emoji: '📰',
    titre: 'Polémique dans la presse',
    recit: 'Une déclaration mal comprise fait la une. L’ambiance se tend.',
    deltas: { reputation: -10, moral: -8 },
    ovas: 5,
    positif: false,
  },
  {
    id: 'sponsor',
    emoji: '🤝',
    titre: 'Contrat de sponsoring',
    recit: 'Un équipementier te propose un partenariat. Ton compte respire.',
    deltas: { argent: 4000, reputation: 5 },
    ovas: 20,
    positif: true,
  },
  {
    id: 'capitaine',
    emoji: '©️',
    titre: 'Brassard de capitaine',
    recit: 'Le coach te confie le brassard pour un match. Le leadership te grandit.',
    deltas: { mental: 3, vision: 2, moral: 8 },
    ovas: 28,
    positif: true,
  },
  {
    id: 'fatigue',
    emoji: '😮‍💨',
    titre: 'Coup de fatigue',
    recit: 'Enchaînement de matchs, sommeil en vrac. Ton corps tire la langue.',
    deltas: { forme: -12, endurance: -1 },
    ovas: 6,
    positif: false,
  },
  {
    id: 'muscu',
    emoji: '💪',
    titre: 'Cycle de musculation réussi',
    recit: 'Six semaines de fonte payantes : tu pousses des charges records.',
    deltas: { force: 3, forme: 5 },
    ovas: 18,
    positif: true,
  },
  {
    id: 'penalty',
    emoji: '🥅',
    titre: 'Pénalité de la gagne',
    recit: 'Dernière minute, face aux poteaux... et tu la passes. Sang-froid total.',
    deltas: { jeuAuPied: 2, mental: 2, reputation: 7 },
    ovas: 26,
    positif: true,
  },
  {
    id: 'carton',
    emoji: '🟥',
    titre: 'Carton rouge',
    recit: 'Un plaquage haut de trop : tu files aux vestiaires. Suspension à la clé.',
    deltas: { reputation: -12, moral: -10 },
    ovas: 4,
    positif: false,
  },
  {
    id: 'jeune',
    emoji: '🌱',
    titre: 'Mentor d’un jeune',
    recit: 'Tu prends un espoir sous ton aile. Transmettre te recentre.',
    deltas: { moral: 7, vision: 2 },
    ovas: 15,
    positif: true,
  },
  {
    id: 'derby',
    emoji: '🔥',
    titre: 'Homme du match dans le derby',
    recit: 'Dans le choc de la région, tu as tout dévoré. Héros d’un soir.',
    deltas: { reputation: 12, plaquage: 2, moral: 9 },
    ovas: 32,
    positif: true,
  },
];

// L'évènement dans la langue du joueur. ⚠️ À appeler AU MOMENT où l'évènement
// est tiré (store) : il part ensuite dans le journal, où le texte est figé.
// Les deltas et les Ovas ne sont pas touchés — une traduction ne change jamais
// l'équilibre du jeu. Une clé absente retombe sur le français.
export function traduireEvenement(e: EvenementAleatoire): EvenementAleatoire {
  const titre = t(`evt.${e.id}.titre`);
  const recit = t(`evt.${e.id}.txt`);
  return {
    ...e,
    titre: titre === `evt.${e.id}.titre` ? e.titre : titre,
    recit: recit === `evt.${e.id}.txt` ? e.recit : recit,
  };
}
