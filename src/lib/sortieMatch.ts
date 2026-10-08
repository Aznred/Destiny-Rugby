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
//
// ⚠️ ET LA NAVIGATION A LIEU QUOI QU'IL ARRIVE. Pendant la séquence la fenêtre du match ne reçoit plus aucun
// toucher et le reste de l'application est inerte : une seule attente sans fin (une scène qui ne se rend pas, une
// image que le système ne dessine pas) laissait un écran mort qu'il fallait fermer à la main — signalé sur
// iPhone 15 et iPad. Tout ce qui précède la navigation tient donc dans `DELAI_SORTIE` ; passé ce délai on change de
// page, et ce qui restait à faire se termine derrière.

import { annoncerNouvelleTaille, attendreViewportStable, estTactile, installerEcouteursApp, recalculerViewport, tailleVisible, estPaysage } from './viewport';
import { libererArrierePlan } from './useModalDialog';
import { auPlus, tracer } from './finMatch';
import { oublierLeVerrou, paysageVerrouilleParLeJeu, quitterPleinEcranSimule } from './pleinEcran';

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

/** Ce que l'hôte obtient pour arrêter sa boucle et rendre sa scène, puis la séquence entière avant la navigation. */
export const DELAI_BOUCLE = 4000;
export const DELAI_SORTIE = 7000;

let enCours = false;
let etapeCourante: EtapeSortie = 'repos';

export function etapeDeSortie(): EtapeSortie { return etapeCourante; }
export function sortieEnCours(): boolean { return enCours; }

/** Rend l'orientation et quitte le plein écran en attendant la CONFIRMATION de chacun. */
async function quitterLePleinEcran(): Promise<void> {
  try { (screen.orientation as OrientationVerrouillable | undefined)?.unlock?.(); } catch { /* jamais verrouillée */ }
  // Le plein écran simulé (iPhone) se retire d'un geste : sans cela la page resterait verrouillée derrière le match fermé.
  quitterPleinEcranSimule();
  if (typeof document === 'undefined' || !document.fullscreenElement) return;
  const sortie = new Promise<void>((fin) => {
    const surChangement = () => { if (!document.fullscreenElement) { document.removeEventListener('fullscreenchange', surChangement); fin(); } };
    document.addEventListener('fullscreenchange', surChangement);
  });
  try { await document.exitFullscreen(); } catch { /* déjà sorti */ }
  await Promise.race([sortie, attendre(1200)]);
}

/** Tout ce qui précède le changement de page. Ne lève jamais d'erreur. */
async function preparer(c: CrochetsSortie, aller: (e: EtapeSortie) => void): Promise<void> {
  const etaitPaysage = estPaysage(tailleVisible());
  const etaitPleinEcran = typeof document !== 'undefined' && !!document.fullscreenElement;
  // ⚠️ L'ÉCRAN NE REVIENT DEBOUT QUE SI C'EST LE JEU QUI L'A COUCHÉ (`verrouillerPaysage`). Un iPhone ou un iPad tenu
  // en paysage ne pivotera pas à la sortie — iOS ne verrouille jamais l'orientation : attendre ce retour, c'était
  // 1,8 seconde d'écran mort après chaque « Terminer » (mesuré en paysage tactile : la navigation partait 1 990 ms
  // après l'appui, 143 ms depuis).
  const pivotAttendu = paysageVerrouilleParLeJeu() && estTactile() && etaitPaysage;

  aller('boucle-arretee');
  await auPlus(new Promise<void>((fin) => { fin(c.arreterBoucle()); }), DELAI_BOUCLE);
  // Deux images : React a démonté ce qu'on vient de retirer.
  await attendreViewportStable({ delaiMax: 150, stable: 2 });

  aller('plein-ecran-quitte');
  await quitterLePleinEcran();
  oublierLeVerrou();

  aller('orientation-stable');
  const t = await attendreViewportStable(pivotAttendu
    ? { attendue: 'portrait', delaiMax: 1800 }
    : { delaiMax: etaitPleinEcran ? 400 : 120, stable: etaitPleinEcran ? 3 : 2 });

  aller('viewport-recalcule');
  const dim = recalculerViewport();
  annoncerNouvelleTaille();
  try { c.recalculer?.(dim ?? t); } catch { /* ignoré */ }

  aller('ecouteurs-recrees');
  try { c.retirerEcouteursMatch?.(); } catch { /* ignoré */ }
  installerEcouteursApp();

  aller('entrees-reactivees');
  try { c.reactiverEntrees?.(); } catch { /* ignoré */ }
}

/**
 * Déroule la séquence. Retourne `false` si une sortie est déjà en cours
 * (le double appui ne fait strictement rien).
 */
export async function sortirDuMatch(c: CrochetsSortie): Promise<boolean> {
  if (enCours) return false;
  enCours = true;
  let atteinte: EtapeSortie = 'repos';
  const aller = (e: EtapeSortie) => {
    atteinte = etapeCourante = e;
    tracer(`sortie-${e}`);
    try { c.surEtape?.(e); } catch { /* le suivi ne retient jamais la sortie */ }
  };
  try {
    aller('entrees-coupees');
    try { c.couperEntrees(); } catch { /* l'hôte peut être déjà démonté */ }

    const preparee = await auPlus(preparer(c, aller).then(() => true), DELAI_SORTIE);
    if (!preparee) tracer(`sortie-forcee-apres-${atteinte}`);

    aller('navigation');
    try { c.naviguer(); } catch (erreur) { console.error('[sortie de match] navigation en échec', erreur); }
    aller('fini');
    return true;
  } finally {
    // Un prochain match repart d'un état propre : la séquence se rejoue entière.
    window.setTimeout(() => {
      enCours = false; etapeCourante = 'repos';
      // ⚠️ APRÈS le démontage du match, pas avant : tant que sa fenêtre est ouverte ce filet ne fait rien. S'il ne
      // reste aucune fenêtre et que quelque chose est encore inerte, toute l'application retrouve le toucher.
      libererArrierePlan();
    }, 400);
  }
}
