// LES COSMÉTIQUES QUE LE JEU OFFRE (Correctif 21) : un titre d'équipe gagné donne le kit « Champion en titre » (jamais en vente).
// Le trophée gagné attend sa cérémonie dans `tropheesEnAttente` : on le lit là, une fois, et l'inventaire du compte s'enrichit
// (`octroyerCosmetique` ne donne rien deux fois).
import { useEffect, useRef } from 'react';
import { useGame } from '../store/useGame';
import { TROPHEES } from '../data/trophees';

export function useRecompensesCosmetiques(): void {
  const attente = useGame((s) => s.tropheesEnAttente);
  const vus = useRef(0);
  useEffect(() => {
    if (attente.length > vus.current && attente.slice(vus.current).some((id) => TROPHEES[id] && !TROPHEES[id].individuel)) {
      useGame.getState().octroyerCosmetique('kit-champion', 'titre');
    }
    vus.current = attente.length;
  }, [attente]);
}
