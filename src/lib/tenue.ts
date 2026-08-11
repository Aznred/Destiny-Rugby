// LA TENUE DU JOUEUR — une seule lecture, pour tous les écrans
//
// ⚠️ UN SEUL ENDROIT, ET C'EST LE POINT. L'accueil et le profil montrent le
// MÊME rugbyman ; s'ils lisaient chacun le store à leur façon, ils finiraient
// par habiller deux joueurs différents — exactement ce qu'il ne faut pas quand
// on essaie de dire au joueur « c'est toi ».
//
// (Ce hook vit hors de `Rugbyman3D.tsx` pour que ce fichier n'exporte que des
// composants : c'est la condition du rafraîchissement à chaud de React.)

import { useMemo } from 'react';
import { useGame } from '../store/useGame';
import type { CategorieEquipement } from '../data/boutique';

export interface TenueRugbyman {
  /** Couleurs par défaut quand rien n'est équipé : celles du club. */
  club?: string;
  /** Nom du joueur — il décide de la carnation et de la coiffure. */
  nom?: string;
  /** Ce que le joueur porte (`equipementActif` du store). */
  equipement?: Partial<Record<CategorieEquipement, string>>;
  /** Le ballon choisi en boutique. */
  skinBallon?: string;
}

export function useTenue(): TenueRugbyman {
  const club = useGame((s) => s.joueur?.club);
  const nom = useGame((s) => s.joueur?.nom);
  const equipement = useGame((s) => s.equipementActif);
  const skinBallon = useGame((s) => s.skinActif);
  return useMemo(
    () => ({ club, nom, equipement, skinBallon }),
    [club, nom, equipement, skinBallon],
  );
}
