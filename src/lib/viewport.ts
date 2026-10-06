// LES DIMENSIONS DE L'ÉCRAN, RELUES AU BON MOMENT
//
// Après un retour paysage → portrait (surtout dans l'application installée sur
// l'écran d'accueil, où iOS annonce l'orientation AVANT d'avoir redimensionné la
// fenêtre), `innerWidth/innerHeight` peuvent rester ceux du paysage pendant un
// moment. Tout ce qui se calcule sur la taille (rendu 3D, canvas, bulles,
// zones tactiles) doit donc attendre une taille STABLE, puis être prévenu.
//
// Ce module tient deux choses :
//  - `installerEcouteursApp()` : les écouteurs GLOBAUX de l'application
//    (orientation, taille, retour au premier plan). Idempotent, et recréable à
//    volonté après un match : jamais en double, jamais manquants.
//  - `attendreViewportStable()` + `recalculerViewport()` : la mesure que la
//    machine de sortie de match (`sortieMatch.ts`) appelle.

import { libererArrierePlan } from './useModalDialog';

export interface Taille { largeur: number; hauteur: number }

export function tailleVisible(): Taille {
  const vv = window.visualViewport;
  return {
    largeur: Math.round(vv?.width ?? window.innerWidth),
    hauteur: Math.round(vv?.height ?? window.innerHeight),
  };
}

export function estPaysage(t: Taille = tailleVisible()): boolean { return t.largeur > t.hauteur; }

/** Application installée (PWA / « Sur l'écran d'accueil ») : pas de barre de navigateur, pas de plein écran possible sur iOS. */
export function estInstallee(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true
    || !!window.matchMedia?.('(display-mode: standalone)').matches
    || !!window.matchMedia?.('(display-mode: fullscreen)').matches;
}

export function estTactile(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches ?? false);
}

/** Pose les dimensions en variables CSS et marque l'orientation : les feuilles de style peuvent s'y fier. */
export function recalculerViewport(): Taille {
  const t = tailleVisible();
  const racine = document.documentElement;
  racine.style.setProperty('--app-largeur', `${t.largeur}px`);
  racine.style.setProperty('--app-hauteur', `${t.hauteur}px`);
  racine.dataset.orientation = estPaysage(t) ? 'paysage' : 'portrait';
  return t;
}

/** Fait relire sa taille à tout ce qui écoute `resize` (rendu 3D, canvas, tutoriel, zones tactiles). */
export function annoncerNouvelleTaille(): void {
  window.dispatchEvent(new Event('resize'));
}

const attendre = (ms: number) => new Promise<void>((fin) => { window.setTimeout(fin, ms); });

const image = () => new Promise<void>((fin) => {
  if (typeof requestAnimationFrame !== 'function' || document.hidden) { window.setTimeout(fin, 32); return; }
  requestAnimationFrame(() => fin());
});

/**
 * Attend que la taille visible cesse de bouger : identique sur `stable` images
 * consécutives, et — si `attendue` est donnée — dans la bonne orientation.
 * Ne rejette jamais : au bout de `delaiMax`, rend la dernière mesure.
 */
export async function attendreViewportStable(options: { attendue?: 'paysage' | 'portrait'; delaiMax?: number; stable?: number } = {}): Promise<Taille> {
  const { attendue, delaiMax = 1500, stable = 3 } = options;
  const debut = Date.now();
  let derniere = tailleVisible();
  let egales = 0;
  while (Date.now() - debut < delaiMax) {
    await image();
    // Une fenêtre masquée ne tire pas requestAnimationFrame : on temporise.
    if (document.hidden) await attendre(50);
    const t = tailleVisible();
    const bonne = !attendue || (attendue === 'paysage') === estPaysage(t);
    if (t.largeur === derniere.largeur && t.hauteur === derniere.hauteur && bonne) { if (++egales >= stable) return t; }
    else egales = 0;
    derniere = t;
  }
  return derniere;
}

// --- Écouteurs globaux de l'application ------------------------------------

let retirerEcouteurs: (() => void) | null = null;
let minuterie = 0;

function surChangement() {
  // Plusieurs événements (orientationchange, resize, visualViewport) arrivent en rafale : une seule relecture.
  window.clearTimeout(minuterie);
  minuterie = window.setTimeout(() => { recalculerViewport(); libererArrierePlan(); }, 60);
}

/** (Ré)installe les écouteurs globaux. Appeler plusieurs fois ne les multiplie pas. */
export function installerEcouteursApp(): void {
  if (typeof window === 'undefined') return;
  retirerEcouteurs?.();
  const vv = window.visualViewport;
  const surVisible = () => { if (!document.hidden) surChangement(); };
  window.addEventListener('resize', surChangement);
  window.addEventListener('orientationchange', surChangement);
  window.addEventListener('pageshow', surChangement);
  document.addEventListener('visibilitychange', surVisible);
  document.addEventListener('fullscreenchange', surChangement);
  vv?.addEventListener('resize', surChangement);
  screen.orientation?.addEventListener?.('change', surChangement);
  retirerEcouteurs = () => {
    window.clearTimeout(minuterie);
    window.removeEventListener('resize', surChangement);
    window.removeEventListener('orientationchange', surChangement);
    window.removeEventListener('pageshow', surChangement);
    document.removeEventListener('visibilitychange', surVisible);
    document.removeEventListener('fullscreenchange', surChangement);
    vv?.removeEventListener('resize', surChangement);
    screen.orientation?.removeEventListener?.('change', surChangement);
    retirerEcouteurs = null;
  };
  recalculerViewport();
}

/** Nombre d'écouteurs installés (0 ou 1) : sert au banc et au diagnostic. */
export function ecouteursAppInstalles(): boolean { return retirerEcouteurs !== null; }
