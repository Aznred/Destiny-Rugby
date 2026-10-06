// LES PETITS OUTILS COMMUNS AUX PARCOURS.

import { useGame } from '../../store/useGame';
import { ancre } from './guide';
import type { NomAnimation } from './types';

/** L'écran du jeu qui est affiché (`useGame().ecran`). */
export const ecranEst = (nom: string): boolean => useGame.getState().ecran === nom;

/** Doigt ou souris ? Une démonstration différente selon l'appareil. */
export const auDoigt = (): boolean => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
export const geste = (doigt: NomAnimation, souris: NomAnimation): (() => NomAnimation) => () => (auDoigt() ? doigt : souris);

/** Clique l'élément visé par une ancre, s'il est là : ouvrir un onglet avant de l'expliquer. */
export function cliquerSur(nomAncre: string): void {
  const el = ancre(nomAncre);
  if (el) el.click();
}

/** Clique le premier élément qui correspond au sélecteur (onglets sans ancre, ouverts par l'étape précédente). */
export function cliquerLeSelecteur(selecteur: string): void {
  document.querySelector<HTMLElement>(selecteur)?.click();
}

/**
 * Une condition qui doit rester vraie un moment : sans cela, une étape « écris un nom » se terminerait à la troisième lettre, pendant qu'on
 * tape encore. Se remet à zéro dès que la condition retombe.
 */
export function stable(condition: () => boolean, ms: number): () => boolean {
  let depuis: number | null = null;
  return () => {
    if (!condition()) { depuis = null; return false; }
    const maintenant = Date.now();
    depuis ??= maintenant;
    return maintenant - depuis >= ms;
  };
}

/** Remonte en haut de la page : une carte d'accueil de section ne doit pas s'ouvrir au milieu d'un écran resté défilé. */
export function remonter(): void {
  if (window.scrollY > 4) window.scrollTo({ top: 0, behavior: 'smooth' });
}
