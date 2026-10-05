// SORTIR D'UN MATCH EN PLEIN ÉCRAN SANS FAIRE TOMBER LE TÉLÉPHONE
//
// ⚠️ UNE CHOSE À LA FOIS. Le match se regarde en plein écran paysage ; à
// « Continuer », l'écran faisait TOUT en même temps — démonter la scène 3D et
// son contexte WebGL, changer de page, quitter le plein écran, rendre
// l'orientation. Sur téléphone (WebView iOS surtout), détruire un contexte
// graphique pendant que le système fait pivoter l'écran suffit à fermer
// l'application.
//
// L'ordre tenu ici : l'hôte arrête d'abord son moteur visuel, puis appelle
// `quitterPleinEcran()` et ATTEND — orientation rendue, plein écran quitté,
// écran revenu à sa taille — avant de naviguer.

type OrientationVerrouillable = ScreenOrientation & { lock?: (o: string) => Promise<void>; unlock?: () => void };

const attendre = (ms: number) => new Promise<void>((fin) => { window.setTimeout(fin, ms); });

/** Deux images dessinées : React a eu le temps de démonter ce qu'on vient de retirer. */
export function deuxImages(): Promise<void> {
  return new Promise<void>((fin) => {
    if (typeof requestAnimationFrame !== 'function') { fin(); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => fin()));
  });
}

/**
 * Rend l'orientation, quitte le plein écran, et attend que l'écran ait
 * réellement repris sa forme. Ne lève jamais d'erreur : un navigateur qui
 * refuse l'une des étapes ne doit pas empêcher de sortir du match.
 */
export async function quitterPleinEcran(): Promise<void> {
  if (typeof document === 'undefined') return;
  const etait = !!document.fullscreenElement;
  try { (screen.orientation as OrientationVerrouillable | undefined)?.unlock?.(); } catch { /* jamais verrouillée */ }
  if (etait) {
    const sortie = new Promise<void>((fin) => {
      const surChangement = () => { if (!document.fullscreenElement) { document.removeEventListener('fullscreenchange', surChangement); fin(); } };
      document.addEventListener('fullscreenchange', surChangement);
    });
    try { await document.exitFullscreen(); } catch { /* déjà sorti */ }
    // L'événement confirme la sortie ; au pire, on n'attend pas plus d'une seconde.
    await Promise.race([sortie, attendre(1000)]);
  }
  if (!etait) return;
  // Le système remet l'écran debout : on attend qu'il ait fini de tourner.
  const paysage = () => window.innerWidth > window.innerHeight;
  const tactile = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (tactile && paysage()) {
    await Promise.race([
      new Promise<void>((fin) => {
        const surTaille = () => { if (!paysage()) { window.removeEventListener('resize', surTaille); fin(); } };
        window.addEventListener('resize', surTaille);
        window.setTimeout(() => window.removeEventListener('resize', surTaille), 900);
      }),
      attendre(800),
    ]);
  }
  await deuxImages();
}
