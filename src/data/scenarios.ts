import type { StatVariable } from '../types';

// Scénarios à choix jouables SANS clé IA : une situation, 2-3 options, chacune
// avec son issue (récit + variations de stats + Ovas). Le MJ IA reste dispo en
// plus pour les actions libres.
export interface IssueChoix {
  recit: string;
  deltas: Partial<Record<StatVariable, number>>;
  ovas: number;
  // Effets « lot 6 » : ce que le staff et le public retiennent de ton choix.
  coach?: number; // confiance du staff (pèse sur le temps de jeu)
  fans?: number; // popularité (pèse sur la réputation et le marché)
  // Transfert éventuel déclenché par ce choix (offres de fin de saison).
  transfert?: { club: string; division: string };
}
export interface ChoixScenario {
  texte: string;
  issue: IssueChoix;
}
export interface Scenario {
  id: string;
  emoji: string;
  titre: string;
  situation: string;
  choix: ChoixScenario[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'contrat',
    emoji: '📝',
    titre: 'Première proposition de contrat',
    situation:
      "Le club te propose ton premier contrat pro, mais le salaire est modeste. Ton agent pense que tu peux négocier.",
    choix: [
      {
        texte: 'Signer tout de suite, la sécurité avant tout.',
        issue: { recit: 'Tu signes sans discuter. Le staff apprécie ta loyauté et ta sérénité.', deltas: { moral: 8, argent: 2000, reputation: 3 }, ovas: 15 },
      },
      {
        texte: 'Négocier un meilleur salaire.',
        issue: { recit: 'Bras de fer tendu... mais tu obtiens gain de cause. Le vestiaire te regarde autrement.', deltas: { argent: 6000, reputation: 5, mental: 1 }, ovas: 22 },
      },
      {
        texte: 'Tester le marché ailleurs.',
        issue: { recit: 'Personne ne surenchérit et le club se braque. Tu reviens signer, un peu échaudé.', deltas: { moral: -8, reputation: -4, argent: 1500 }, ovas: 8 },
      },
    ],
  },
  {
    id: 'soiree',
    emoji: '🍻',
    titre: 'Soirée la veille du match',
    situation: 'Tes coéquipiers t’entraînent en soirée alors que tu joues demain. Que fais-tu ?',
    choix: [
      {
        texte: 'Rester te reposer et bien dormir.',
        issue: { recit: 'Frais et affûté, tu réalises un gros match. Le coach le remarque.', deltas: { forme: 8, reputation: 6, moral: 4 }, ovas: 18 },
      },
      {
        texte: 'Sortir un peu, sans excès.',
        issue: { recit: 'Bonne ambiance, mais tu accuses le coup au réveil. Match moyen.', deltas: { forme: -6, moral: 4 }, ovas: 10 },
      },
      {
        texte: 'Sortir toute la nuit.',
        issue: { recit: 'Catastrophe : jambes lourdes, erreurs, remplacé à la mi-temps.', deltas: { forme: -15, reputation: -8, moral: -6 }, ovas: 4 },
      },
    ],
  },
  {
    id: 'blessure_choix',
    emoji: '🩹',
    titre: 'Douleur avant un grand match',
    situation: 'Tu ressens une gêne musculaire à deux jours d’un match capital. Le staff te laisse juge.',
    choix: [
      {
        texte: 'Déclarer forfait pour te soigner.',
        issue: { recit: 'Sage décision : tu reviens à 100 % la semaine suivante.', deltas: { forme: 6, reputation: -2 }, ovas: 12 },
      },
      {
        texte: 'Serrer les dents et jouer.',
        issue: { recit: 'Tu tiens... jusqu’à la 60e où la blessure se rouvre. Plusieurs semaines dehors.', deltas: { forme: -20, endurance: -2, moral: -6 }, ovas: 6 },
      },
    ],
  },
  {
    id: 'media',
    emoji: '🎤',
    titre: 'Interview d’après-match',
    situation: 'Après une défaite frustrante, un journaliste te tend le micro. L’arbitrage était discutable.',
    choix: [
      {
        texte: 'Rester diplomate et fair-play.',
        issue: { recit: 'Ta maturité impressionne. Ton image grandit.', deltas: { reputation: 8, mental: 1 }, ovas: 16 },
      },
      {
        texte: 'Critiquer ouvertement l’arbitre.',
        issue: { recit: 'Le buzz enfle, la commission te sanctionne. Mauvaise pub.', deltas: { reputation: -12, argent: -1500, moral: -4 }, ovas: 5 },
      },
    ],
  },
  {
    id: 'jeune_talent',
    emoji: '🌟',
    titre: 'Un cadre te met au défi',
    situation: 'À l’entraînement, un ancien du club te provoque sur un exercice de plaquage devant tout le monde.',
    choix: [
      {
        texte: 'Relever le défi à fond.',
        issue: { recit: 'Tu ne lâches rien et gagnes le respect du groupe.', deltas: { plaquage: 2, force: 1, reputation: 6, moral: 5 }, ovas: 18 },
      },
      {
        texte: 'Rester prudent pour éviter la blessure.',
        issue: { recit: 'Choix raisonnable, mais certains y voient un manque de caractère.', deltas: { reputation: -3, forme: 2 }, ovas: 8 },
      },
    ],
  },
  {
    id: 'transfert',
    emoji: '✈️',
    titre: 'Offre d’un club plus huppé',
    situation: 'Un club d’une division supérieure te veut, mais tu y seras remplaçant. Ton club actuel te fait jouer titulaire.',
    choix: [
      {
        texte: 'Partir pour le grand club.',
        issue: { recit: 'Nouveau standing, mais tu ronges ton frein sur le banc.', deltas: { reputation: 10, argent: 8000, moral: -6 }, ovas: 25 },
      },
      {
        texte: 'Rester titulaire et t’imposer.',
        issue: { recit: 'Tu enchaînes les matchs et progresses vite. Les recruteurs notent.', deltas: { vitesse: 1, vision: 1, reputation: 5, moral: 6 }, ovas: 20 },
      },
    ],
  },
  {
    id: 'capitanat',
    emoji: '©️',
    titre: 'Le brassard te tend les bras',
    situation: 'Le capitaine est blessé. Le coach hésite à te confier le brassard malgré ton jeune âge.',
    choix: [
      {
        texte: 'Accepter la responsabilité.',
        issue: { recit: 'Tu mènes le groupe avec autorité. Un leader est né.', deltas: { mental: 3, vision: 2, reputation: 9 }, ovas: 24 },
      },
      {
        texte: 'Refuser, tu ne te sens pas prêt.',
        issue: { recit: 'Honnête, mais l’occasion passe à un autre.', deltas: { moral: -3, mental: 1 }, ovas: 8 },
      },
    ],
  },
  {
    id: 'entrainement_choix',
    emoji: '🏋️',
    titre: 'Programme d’intersaison',
    situation: 'Tu as six semaines pour te préparer. Sur quoi mets-tu l’accent ?',
    choix: [
      {
        texte: 'Puissance et musculation.',
        issue: { recit: 'Tu prends de la masse et de la percussion.', deltas: { force: 3, endurance: 1, forme: 4 }, ovas: 16 },
      },
      {
        texte: 'Vitesse et cardio.',
        issue: { recit: 'Plus vif et endurant, tu débordes tes vis-à-vis.', deltas: { vitesse: 3, endurance: 2, forme: 4 }, ovas: 16 },
      },
      {
        texte: 'Technique et jeu au pied.',
        issue: { recit: 'Ton pied et ta lecture du jeu montent d’un cran.', deltas: { jeuAuPied: 3, passe: 2, vision: 1 }, ovas: 16 },
      },
    ],
  },
];
