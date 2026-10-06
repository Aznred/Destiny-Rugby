// CE QUE LA BOUTIQUE CHANGE DANS UN MATCH (Correctif 21) : le kit de TOUTE l'équipe.
//
// ⚠️ UN KIT EST LE MAILLOT DU JEU, REPEINT : mêmes maillage, rig et animations — `habillage.js` repeint l'atlas d'origine avec les
// paramètres du kit (couleurs, motif, short, chaussettes) ou, pour un kit du Labo, avec son atlas fourni (`jerseyTexture`).
// Les quinze titulaires et les remplaçants du camp du joueur le portent d'un seul réglage : `equippedTeamKitId` (domicile) et
// `equippedAwayKitId` (extérieur), c'est-à-dire `equipementActif.maillot` et `equipementActif.maillotExt`.
// Si les deux équipes arrivent en couleurs trop proches, la scène bascule seule le visiteur en tenue extérieure (`departagerTenues`).

import { EQUIPEMENT_PAR_ID } from '../data/boutique';
import type { KitDef } from '../data/kitsBoutique';
import type { MaillotMatch } from './moteur/apparenceMatch';
import type { CategorieEquipement } from '../data/boutique';

export type ActifEquipement = Partial<Record<CategorieEquipement, string>> | undefined;

/** Un kit de la boutique devient les paramètres de tenue que lit la scène. */
export function maillotDepuisKit(kit: KitDef): MaillotMatch {
  return {
    principal: kit.principal, secondaire: kit.secondaire, accent: kit.accent, short: kit.short, chaussettes: kit.chaussettes, motif: kit.motif,
    ...(kit.jerseyTexture ? { texture: kit.jerseyTexture } : {}),
  };
}

const kitEquipe = (actif: ActifEquipement, emplacement: 'maillot' | 'maillotExt'): KitDef | undefined => {
  const id = actif?.[emplacement];
  const a = id ? EQUIPEMENT_PAR_ID[id] : undefined;
  return a?.categorie === 'maillot' ? a.kit : undefined;
};

/**
 * Le kit que porte l'équipe du joueur : à domicile, son kit domicile ; en déplacement, son kit extérieur, à défaut son kit
 * domicile (la scène l'adapte si les couleurs se confondent). `undefined` : l'équipe garde les couleurs de son club.
 */
export function kitDeMonEquipe(actif: ActifEquipement, aDomicile: boolean): KitDef | undefined {
  return aDomicile ? kitEquipe(actif, 'maillot') : (kitEquipe(actif, 'maillotExt') ?? kitEquipe(actif, 'maillot'));
}
