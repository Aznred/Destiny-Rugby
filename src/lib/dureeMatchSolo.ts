/** Minutes de jeu par mi-temps à vitesse ×1, hors pauses et mises en place. */
export const DUREES_MI_TEMPS_SOLO = [3, 5, 6, 8, 10, 15, 20, 40] as const;
export type DureeMiTempsSolo = typeof DUREES_MI_TEMPS_SOLO[number];
export const DUREE_MI_TEMPS_SOLO_DEFAUT: DureeMiTempsSolo = 6;

/** Les anciennes sauvegardes et les valeurs invalides reçoivent le même repli. */
export function normaliserDureeMiTempsSolo(valeur: unknown): DureeMiTempsSolo {
  return DUREES_MI_TEMPS_SOLO.includes(valeur as DureeMiTempsSolo)
    ? valeur as DureeMiTempsSolo : DUREE_MI_TEMPS_SOLO_DEFAUT;
}
