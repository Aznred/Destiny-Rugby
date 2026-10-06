// Garde le match au courant de ce que le joueur porte et de son allure.
//
// Le registre de `apparenceMatch.ts` est lu par tout le match (moteur, scène 3D, sprites). Il est mis à
// jour ICI, hors des images : quand le joueur, son apparence ou son équipement changent — jamais pendant
// un match, et sans aucun accès au store au fil des images (« chargés une fois à l'entrée du match »).

import { useEffect } from 'react';
import { useGame } from '../store/useGame';
import { definirSurchargeApparence } from './moteur/apparenceMatch';
import { surchargeDeMatch } from './apparenceJoueur';

export function useSynchroApparenceJoueur(): void {
  const joueur = useGame((s) => s.joueur);
  const equipementActif = useGame((s) => s.equipementActif);
  const nom = joueur?.nom;
  const poste = joueur?.poste;
  const apparence = joueur?.apparence;
  useEffect(() => {
    if (!nom || !poste) return;
    definirSurchargeApparence(nom, surchargeDeMatch(apparence, poste, equipementActif));
    return () => definirSurchargeApparence(nom, null);
  }, [nom, poste, apparence, equipementActif]);
}
