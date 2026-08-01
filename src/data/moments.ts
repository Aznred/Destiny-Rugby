// MOMENTS DÉCISIFS — le choix de la 80ᵉ minute (lot 6, point 20)
//
// Certains matchs se jouent sur une décision : taper au pied, jouer la mêlée,
// tenter la pénalité. Le moment se présente APRÈS un match serré, et l'issue
// dépend d'un attribut du joueur : le même choix ne donne pas le même résultat
// selon qu'on a 40 ou 80 de jeu au pied.
//
// Jouable SANS IA (c'est ce fichier). Avec une clé Groq, `lib/ia.ts` en génère
// un sur mesure à partir du contexte réel du match.

import type { AttributId, StatVariable } from '../types';

export interface OptionMoment {
  texte: string;
  attribut: AttributId; // ce que le geste exige
  seuil: number; // niveau à partir duquel il passe souvent
  reussite: { recit: string; deltas: Partial<Record<StatVariable, number>> };
  echec: { recit: string; deltas: Partial<Record<StatVariable, number>> };
}

export interface MomentDecisif {
  id: string;
  emoji: string;
  titre: string;
  situation: string;
  options: OptionMoment[];
}

export const MOMENTS: MomentDecisif[] = [
  {
    id: 'penalite',
    emoji: '🎯',
    titre: '80ᵉ minute — la pénalité de la gagne',
    situation:
      "Deux points de retard, dernière minute, pénalité à 40 mètres légèrement excentrée. L'arbitre te regarde : tu tapes, ou tu joues ?",
    options: [
      {
        texte: 'Je prends les points : je tape au but.',
        attribut: 'jeuAuPied', seuil: 62,
        reussite: {
          recit: 'Tu poses le ballon, souffles, et la frappe part droite dans les perches. Le stade explose : vous gagnez sur ton coup de pied.',
          deltas: { reputation: 7, moral: 12, jeuAuPied: 1 },
        },
        echec: {
          recit: 'Le ballon part mou, dévié par le vent, et passe à un mètre du poteau. Coup de sifflet final. C’est toi qu’on regardera ce soir.',
          deltas: { reputation: -5, moral: -14 },
        },
      },
      {
        texte: 'Touche à cinq mètres, on va chercher l’essai.',
        attribut: 'mental', seuil: 60,
        reussite: {
          recit: 'Touche assurée, maul lancé, et le ballon franchit la ligne dans un amas de corps. Vous gagnez à la dernière seconde, et le vestiaire hurle.',
          deltas: { reputation: 6, moral: 14, mental: 1 },
        },
        echec: {
          recit: 'Le lancer est de travers, l’adversaire s’en empare et dégage en touche. Fin du match. Le coach ne dit rien — c’est pire.',
          deltas: { moral: -12, reputation: -3 },
        },
      },
      {
        texte: 'Je perce moi-même : ça passe ou ça casse.',
        attribut: 'vitesse', seuil: 70,
        reussite: {
          recit: 'Crochet intérieur, appui, tu plonges dans le coin ! Ton nom est repris par toute la tribune.',
          deltas: { reputation: 10, moral: 15, vitesse: 1 },
        },
        echec: {
          recit: 'Tu forces le passage seul, tu es plaqué, et le ballon te fuit. Ton demi de mêlée lève les bras au ciel : il était seul à l’aile.',
          deltas: { moral: -12, reputation: -6 },
        },
      },
    ],
  },
  {
    id: 'melee',
    emoji: '🥩',
    titre: '80ᵉ minute — la mêlée de la survie',
    situation:
      "Vous menez de trois points, mêlée à cinq mètres de votre ligne. Tout se joue sur cette poussée : que dis-tu au pack ?",
    options: [
      {
        texte: 'On pousse. On les enfonce.',
        attribut: 'force', seuil: 65,
        reussite: {
          recit: 'La première ligne s’arc-boute, le pack avance de deux mètres, pénalité pour vous. Le match est mort. Tu as gagné ça avec les épaules.',
          deltas: { reputation: 5, moral: 10, force: 1 },
        },
        echec: {
          recit: 'La mêlée recule, s’écroule, pénalité contre vous. Ils tapent, égalisent. Ton dos te fait mal et ta fierté encore plus.',
          deltas: { moral: -10, forme: -6 },
        },
      },
      {
        texte: 'Ballon sorti vite, on dégage loin.',
        attribut: 'vision', seuil: 62,
        reussite: {
          recit: 'Sortie éclair, chandelle parfaite à 45 mètres, récupérée par ton ailier. La sirène retentit : c’est fini, vous tenez.',
          deltas: { reputation: 4, moral: 9, vision: 1 },
        },
        echec: {
          recit: 'Le ballon sort mal, ton dégagement est contré et l’adversaire aplatit dans la foulée. Un cauchemar en huit secondes.',
          deltas: { moral: -14, reputation: -5 },
        },
      },
    ],
  },
  {
    id: 'plaquage',
    emoji: '🛡️',
    titre: '80ᵉ minute — le dernier défenseur',
    situation:
      "Leur ailier est lancé, tu es seul entre lui et l'en-but. Une balle de match, ta décision.",
    options: [
      {
        texte: 'Plaquage cathédrale, je le renverse.',
        attribut: 'plaquage', seuil: 68,
        reussite: {
          recit: 'Tu montes, tu serres, tu le retournes en touche. Le stade se lève. Ce plaquage-là, on t’en parlera longtemps.',
          deltas: { reputation: 8, moral: 12, plaquage: 1 },
        },
        echec: {
          recit: 'Tu montes trop haut, il te passe l’épaule et aplatit derrière toi. L’arbitre siffle même un carton pour le plaquage haut.',
          deltas: { moral: -12, reputation: -6 },
        },
      },
      {
        texte: 'Je le pousse en touche, sans prendre de risque.',
        attribut: 'endurance', seuil: 58,
        reussite: {
          recit: 'Tu l’accompagnes, tu l’escortes, il met le pied sur la ligne. Sortie en touche, fin du match. Sobre et parfait.',
          deltas: { reputation: 4, moral: 8, endurance: 1 },
        },
        echec: {
          recit: 'Tu manques de jus dans les cinq derniers mètres. Il te déborde et aplatit dans le coin. La tête dans le gazon, tu écoutes leur clameur.',
          deltas: { moral: -11, forme: -5 },
        },
      },
    ],
  },
];
