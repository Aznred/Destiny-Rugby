// L'INTRODUCTION GÉNÉRALE — le premier lancement : trois grandes cartes, un choix, et chaque mode a son guide (Correctif 18).
//
// ⚠️ ELLE NE S'OUVRE QUE SUR L'ACCUEIL, JAMAIS SUR UNE CARRIÈRE EN COURS (les anciens joueurs sont reconnus par
// `reconnaitreLesAnciens`), et jamais deux fois : « Plus tard » compte comme vu, le tutoriel se rejoue depuis les Réglages.
// ⚠️ CHOISIR UNE CARTE NE DÉMARRE PAS LE GUIDE DU MODE : cela emmène vers l'écran du mode, et c'est CET ÉCRAN, en apparaissant,
// qui déclenche son guide (voir `ligue.ts`, `joueur.ts`, `entraineur.ts`). Un seul mécanisme, deux entrées possibles.

import { useGame } from '../../../store/useGame';
import { demanderLeModeDeCreation } from '../intentions';
import type { ParcoursTuto } from '../types';

const surAccueil = (): boolean => {
  const s = useGame.getState();
  return s.ecran === 'accueil';
};

export const PARCOURS_GENERAUX: ParcoursTuto[] = [
  {
    id: 'general.intro',
    famille: 'general',
    priorite: 0,
    // Un instant après l'arrivée : l'accueil a fini de se dessiner.
    declencheur: () => {
      const s = useGame.getState();
      return surAccueil() && !s.joueur && !s.manager && performance.now() > 1400;
    },
    valide: surAccueil,
    etapes: [
      { id: 'bienvenue', type: 'carte', titre: true, icone: 'ballon', bouton: 'tg.ui.commencer' },
      {
        id: 'modes', type: 'carte', titre: true, icone: 'livre', sansRetour: false,
        choix: [
          {
            id: 'ligue', icone: 'equipe', titre: 'tg.general.choix.ligue.t', texte: 'tg.general.choix.ligue.x',
            choisir: () => useGame.getState().setEcran('carriereEnLigne'),
          },
          {
            id: 'joueur', icone: 'joueur', titre: 'tg.general.choix.joueur.t', texte: 'tg.general.choix.joueur.x',
            choisir: () => { demanderLeModeDeCreation('joueur'); useGame.getState().setEcran('creation'); },
          },
          {
            id: 'coach', icone: 'entraineur', titre: 'tg.general.choix.coach.t', texte: 'tg.general.choix.coach.x',
            choisir: () => useGame.getState().setEcran('creationManager'),
          },
        ],
      },
    ],
  },
];
