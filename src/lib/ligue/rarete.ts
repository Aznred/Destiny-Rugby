// LA RARETÉ D'UNE CARTE
//
// « Pas comme FUT avec 46 versions de Mbappé » : un joueur = UNE version, et sa
// rareté n'est qu'une lecture de sa note. Rien d'inventé, rien de cosmétique
// qu'on pourrait acheter — la couleur de la bordure dit exactement ce que vaut
// le joueur en dessous.
//
// ⚠️ CINQ BANDES, ALORS QUE LA DEMANDE EN NOMMAIT QUATRE. Les quatre noms
// donnés étaient « Commun · Rare · Elite · World Class », mais les bornes qui
// les accompagnaient en dessinaient CINQ : 50-64, 65-74, 75-82, 83-87, 88+. La
// bande 65-74 n'avait pas de nom. On la nomme « Confirmé » plutôt que de la
// fondre dans « Commun » : elle contient 610 joueurs réels sur 6 306 et c'est
// tout le milieu de gamme d'un effectif — la confondre avec les remplaçants de
// Régionale rendrait le mot « commun » illisible.
//
// ⚠️ AUCUN EMOJI. La demande les écrivait (⚪🔵🟣🟡) mais l'interface du jeu n'en
// porte aucun, par règle : un emoji est dessiné par Apple ou Microsoft, pas par
// nous, et ne s'aligne pas sur une ligne de texte. Chaque rareté sort donc une
// COULEUR, et l'écran la peint lui-même.

import type { Rarete } from './types.js';

interface BandeRarete {
  id: Rarete;
  /** Note minimale, incluse. */
  min: number;
  /** Couleur de la bordure et du liseré. */
  couleur: string;
  /** Clé i18n du libellé — jamais de texte en dur dans une règle du jeu. */
  cle: string;
}

/**
 * Les bandes, de la plus haute à la plus basse.
 *
 * ⚠️ ORDRE DÉCROISSANT VOLONTAIRE : `rareteDeLaNote` prend la PREMIÈRE bande
 * atteinte. Une table croissante obligerait à écrire des bornes hautes en plus
 * des bornes basses, donc deux chiffres à tenir cohérents au lieu d'un.
 */
export const BANDES_RARETE: readonly BandeRarete[] = [
  { id: 'mondial', min: 88, couleur: '#e8b23a', cle: 'ligue.rarete.mondial' },
  { id: 'elite', min: 83, couleur: '#a855f7', cle: 'ligue.rarete.elite' },
  { id: 'rare', min: 75, couleur: '#3b9bf0', cle: 'ligue.rarete.rare' },
  { id: 'confirme', min: 65, couleur: '#3fb87a', cle: 'ligue.rarete.confirme' },
  { id: 'commun', min: 0, couleur: '#9aa4ad', cle: 'ligue.rarete.commun' },
] as const;

/** La rareté d'une note. C'est la SEULE définition — ne pas la recopier. */
export function rareteDeLaNote(note: number): Rarete {
  for (const bande of BANDES_RARETE) if (note >= bande.min) return bande.id;
  return 'commun';
}

export function couleurRarete(rarete: Rarete): string {
  return BANDES_RARETE.find((b) => b.id === rarete)?.couleur ?? '#9aa4ad';
}

export function cleRarete(rarete: Rarete): string {
  return BANDES_RARETE.find((b) => b.id === rarete)?.cle ?? 'ligue.rarete.commun';
}

/** Bornes d'une bande, `max` compris. `Infinity` pour la plus haute. */
export function bornesRarete(rarete: Rarete): { min: number; max: number } {
  const index = BANDES_RARETE.findIndex((b) => b.id === rarete);
  if (index < 0) return { min: 0, max: 0 };
  return {
    min: BANDES_RARETE[index].min,
    max: index === 0 ? Infinity : BANDES_RARETE[index - 1].min - 1,
  };
}

/** Rang de la rareté, 0 = commun … 4 = mondial. Sert aux garanties de pack. */
export function rangRarete(rarete: Rarete): number {
  return BANDES_RARETE.length - 1 - BANDES_RARETE.findIndex((b) => b.id === rarete);
}

/** L'inverse : la rareté d'un rang. `null` hors bornes. */
export function rareteDuRang(rang: number): Rarete | null {
  const index = BANDES_RARETE.length - 1 - rang;
  return BANDES_RARETE[index]?.id ?? null;
}
