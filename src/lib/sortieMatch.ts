// LA SORTIE D'UN MATCH EST UNE MACHINE À ÉTATS, PAS QUATRE ACTIONS INDÉPENDANTES
//
//   MATCH_END
//     → ENTREES_COUPEES      les doigts, le clavier et la manette ne font plus rien
//     → BOUCLE_ARRETEE       moteur, scène 3D et son contexte WebGL rendus
//     → PLEIN_ECRAN_QUITTE   orientation libérée, plein écran fermé (confirmé)
//     → ORIENTATION_STABLE   l'écran est revenu debout ET sa taille ne bouge plus
//     → VIEWPORT_RECALCULE   dimensions relues : canvas, rendu, interface, zones tactiles
//     → ECOUTEURS_RECREES    écouteurs du match retirés, ceux de l'application recréés
//     → ENTREES_REACTIVEES   l'interface répond à nouveau
//     → NAVIGATION           seulement alors, on change de page
//
// Chaque étape attend la précédente, aucune ne lève d'erreur (un navigateur qui
// refuse le plein écran ou le verrou d'orientation ne doit pas bloquer la
// sortie), et un second appel PENDANT la séquence ne fait rien : « Continuer »
// est verrouillé dès le premier appui.

import { annoncerNouvelleTaille, attendreViewportStable, estInstallee, estTactile, installerEcouteursApp, recalculerViewport, tailleVisible, estPaysage } from './viewport';
import { libererArrierePlan } from './useModalDialog';

export type EtapeSortie =
  | 'repos' | 'entrees-coupees' | 'boucle-arretee' | 'plein-ecran-quitte' | 'orientation-stable'
  | 'viewport-recalcule' | 'ecouteurs-recrees' | 'entrees-reactivees' | 'navigation' | 'fini';

export interface CrochetsSortie {
  /** Plus aucune entrée (pilote, boutons, clavier) ne doit agir. */
  couperEntrees: () => void;
  /** Arrête la boucle du match et démonte la scène 3D. Rend la main quand c'est fait. */
  arreterBoucle: () => Promise<void> | void;
  /** Relit les dimensions des composants propres à l'hôte (facultatif). */
  recalculer?: (t: { largeur: number; hauteur: number }) => void;
  /** Retire les écouteurs du match (facultatif : le démontage React le fait aussi). */
  retirerEcouteursMatch?: () => void;
  reactiverEntrees?: () => void;
  naviguer: () => void;
  /** Suivi (banc et diagnostic). */
  surEtape?: (e: EtapeSortie) => void;
}

type OrientationVerrouillable = ScreenOrientation & { unlock?: () => void };
const attendre = (ms: number) => new Promise<void>((fin) => { window.setTimeout(fin, ms); });

let enCours = false;
let etapeCourante: EtapeSortie = 'repos';

export function etapeDeSortie(): EtapeSortie { return etapeCourante; }
export function sortieEnCours(): boolean { return enCours; }

/** Rend l'orientation et quitte le plein écran en attendant la CONFIRMATION de chacun. */
async function quitterLePleinEcran(): Promise<void> {
  try { (screen.orientation as OrientationVerrouillable | undefined)?.unlock?.(); } catch { /* jamais verrouillée */ }
  if (typeof document === 'undefined' || !document.fullscreenElement) return;
  const sortie = new Promise<void>((fin) => {
    const surChangement = () => { if (!document.fullscreenElement) { document.removeEventListener('fullscreenchange', surChangement); fin(); } };
    document.addEventListener('fullscreenchange', surChangement);
  });
  try { await document.exitFullscreen(); } catch { /* déjà sorti */ }
  await Promise.race([sortie, attendre(1200)]);
}

/**
 * Déroule la séquence. Retourne `false` si une sortie est déjà en cours
 * (le double appui ne fait strictement rien).
 */
export async function sortirDuMatch(c: CrochetsSortie): Promise<boolean> {
  if (enCours) return false;
  enCours = true;
  const aller = (e: EtapeSortie) => { etapeCourante = e; c.surEtape?.(e); };
  try {
    // Seul un appareil tactile a pu verrouiller le paysage ; sur ordinateur la fenêtre ne tourne pas.
    const etaitPaysage = estPaysage(tailleVisible());
    const devraitPivoter = estTactile() && etaitPaysage;

    aller('entrees-coupees');
    try { c.couperEntrees(); } catch { /* l'hôte peut être déjà démonté */ }

    aller('boucle-arretee');
    try { await c.arreterBoucle(); } catch { /* idem */ }
    // Deux images : React a démonté ce qu'on vient de retirer.
    await attendreViewportStable({ delaiMax: 150, stable: 2 });

    aller('plein-ecran-quitte');
    await quitterLePleinEcran();

    aller('orientation-stable');
    // Dans l'application installée, le système tourne l'écran SANS plein écran à quitter : on attend quand même.
    const attendue = devraitPivoter || estInstallee() && estTactile() ? 'portrait' : undefined;
    const t = await attendreViewportStable({ attendue, delaiMax: attendue ? 1800 : 400 });

    aller('viewport-recalcule');
    const dim = recalculerViewport();
    annoncerNouvelleTaille();
    try { c.recalculer?.(dim ?? t); } catch { /* ignoré */ }

    aller('ecouteurs-recrees');
    try { c.retirerEcouteursMatch?.(); } catch { /* ignoré */ }
    installerEcouteursApp();
    libererArrierePlan();

    aller('entrees-reactivees');
    try { c.reactiverEntrees?.(); } catch { /* ignoré */ }

    aller('navigation');
    c.naviguer();
    aller('fini');
    return true;
  } finally {
    // Un prochain match repart d'un état propre : la séquence se rejoue entière.
    window.setTimeout(() => { enCours = false; etapeCourante = 'repos'; }, 400);
  }
}
