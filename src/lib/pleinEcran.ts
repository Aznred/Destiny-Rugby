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

// ── LE JEU A-T-IL TOURNÉ L'ÉCRAN LUI-MÊME ? ──────────────────────────────────────────────────────────────────────
// La sortie d'un match attendait que l'écran « revienne debout » dès qu'un appareil tactile était tenu en paysage :
// 1,8 seconde d'écran mort à chaque match sur un iPhone ou un iPad, où le navigateur ne verrouille JAMAIS
// l'orientation — rien n'allait donc pivoter. On n'attend ce retour que si le verrou a réellement pris.
let paysageVerrouille = false;

/** Demande le paysage (après le plein écran). Rend `true` seulement si le navigateur l'a accordé. */
export async function verrouillerPaysage(): Promise<boolean> {
  paysageVerrouille = false;
  try {
    const orientation = screen.orientation as OrientationVerrouillable | undefined;
    if (typeof orientation?.lock !== 'function') return false;
    await orientation.lock('landscape');
    paysageVerrouille = true;
  } catch { /* refusé (iOS, ordinateur) : l'écran reste comme le joueur le tient */ }
  return paysageVerrouille;
}

export function paysageVerrouilleParLeJeu(): boolean { return paysageVerrouille; }

/** Le plein écran est quitté : le navigateur a rendu l'orientation avec lui. */
export function oublierLeVerrou(): void { paysageVerrouille = false; }

// ── ENTRER EN PLEIN ÉCRAN, Y COMPRIS LÀ OÙ LE NAVIGATEUR NE SAIT PAS (Correctif 33) ───────────────────────────────
// Signalé en jeu : « on ne peut plus mettre en plein écran sur les matchs — sur mobile, le bouton n'apparaît pas ».
// Le bouton ne s'affichait que si `document.fullscreenEnabled` valait vrai : c'est faux sur iPhone, où Safari ne
// propose le plein écran qu'aux vidéos, et sur un iPad d'avant Safari 16.4, qui ne connaît que la forme préfixée.
// Trois cas, du meilleur au repli :
//   natif    — l'API standard, ou sa forme `webkit` ; le téléphone passe en paysage quand il sait le faire ;
//   simulé   — pas d'API du tout (iPhone) : le cadre du match est posé par-dessus toute la page, à la taille de la
//              fenêtre. La barre du navigateur reste (lui seul peut la retirer), mais le match prend tout l'écran
//              et suit le téléphone quand on le tourne ;
// et dans les deux cas le MÊME bouton, la même classe d'état, la même sortie.
type DocumentWebkit = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type ElementWebkit = HTMLElement & { webkitRequestFullscreen?: () => void };

const CLASSE_SIMULE = 'plein-ecran-simule';
const CLASSE_ANCETRE = 'plein-ecran-simule-ancetre';
const CLASSE_PAGE = 'plein-ecran-simule-actif';
let simule: HTMLElement | null = null;
const abonnes = new Set<() => void>();
const prevenir = () => { for (const abonne of [...abonnes]) abonne(); };

/** En développement, `?pleinEcran=simule` force le repli : c'est le seul moyen de l'essayer ailleurs que sur un iPhone. */
const repliForce = () => import.meta.env?.DEV === true && typeof location !== 'undefined' && new URLSearchParams(location.search).get('pleinEcran') === 'simule';

export function pleinEcranNatifPossible(): boolean {
  if (typeof document === 'undefined' || repliForce()) return false;
  const d = document as DocumentWebkit;
  return d.fullscreenEnabled === true || d.webkitFullscreenEnabled === true;
}

/** Ce qui occupe l'écran en ce moment : l'élément en plein écran natif, ou celui qu'on a posé par-dessus la page. */
export function elementEnPleinEcran(): Element | null {
  if (typeof document === 'undefined') return null;
  if (simule && !simule.isConnected) quitterPleinEcranSimule();
  const d = document as DocumentWebkit;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? simule;
}

/** S'abonner aux entrées et sorties de plein écran, natif ou simulé. Rend la fonction de désabonnement. */
export function surPleinEcran(ecouteur: () => void): () => void {
  abonnes.add(ecouteur);
  document.addEventListener('fullscreenchange', ecouteur);
  document.addEventListener('webkitfullscreenchange', ecouteur);
  return () => {
    abonnes.delete(ecouteur);
    document.removeEventListener('fullscreenchange', ecouteur);
    document.removeEventListener('webkitfullscreenchange', ecouteur);
  };
}

/**
 * Retire le plein écran simulé. ⚠️ SYNCHRONE ET SANS CONDITION : c'est aussi le filet de la sortie de match — un cadre
 * resté « par-dessus la page » après la fermeture du match laisserait le défilement de la page verrouillé.
 */
export function quitterPleinEcranSimule(): void {
  if (typeof document === 'undefined') return;
  const etait = simule !== null;
  simule?.classList.remove(CLASSE_SIMULE);
  simule = null;
  for (const ancetre of document.querySelectorAll(`.${CLASSE_ANCETRE}`)) ancetre.classList.remove(CLASSE_ANCETRE);
  document.documentElement.classList.remove(CLASSE_PAGE);
  if (etait) { window.dispatchEvent(new Event('resize')); prevenir(); }
}

function simulerPleinEcran(element: HTMLElement): void {
  quitterPleinEcranSimule();
  simule = element;
  element.classList.add(CLASSE_SIMULE);
  // ⚠️ UN ANCÊTRE TRANSFORMÉ OU FLOUTÉ PIÈGE LES `position: fixed` (c'est le piège des `.carte` et des fenêtres animées) :
  // le cadre resterait enfermé dans son panneau. Le temps du plein écran, ses ancêtres rendent leur bloc conteneur.
  for (let ancetre = element.parentElement; ancetre && ancetre !== document.documentElement; ancetre = ancetre.parentElement) ancetre.classList.add(CLASSE_ANCETRE);
  document.documentElement.classList.add(CLASSE_PAGE);
  // La scène 3D et les caméras relisent la taille de leur cadre sur cet événement.
  window.dispatchEvent(new Event('resize'));
  prevenir();
}

/**
 * Passe `element` en plein écran. Natif quand le navigateur le permet (et le téléphone se tourne en paysage s'il sait
 * verrouiller l'orientation), simulé sinon. Ne lève jamais : un refus du navigateur retombe sur le plein écran simulé.
 */
export async function entrerEnPleinEcran(element: HTMLElement): Promise<'natif' | 'simule'> {
  if (pleinEcranNatifPossible()) {
    try {
      const e = element as ElementWebkit;
      if (typeof e.requestFullscreen === 'function') await e.requestFullscreen({ navigationUI: 'hide' });
      else if (typeof e.webkitRequestFullscreen === 'function') e.webkitRequestFullscreen();
      else throw new Error('aucune méthode');
      void verrouillerPaysage();
      return 'natif';
    } catch { /* refusé : on retombe sur le plein écran simulé */ }
  }
  simulerPleinEcran(element);
  return 'simule';
}

/** Quitte le plein écran, quel qu'il soit. */
export function sortirDuPleinEcran(): void {
  if (typeof document === 'undefined') return;
  const d = document as DocumentWebkit;
  if (d.fullscreenElement) void document.exitFullscreen().catch(() => { /* déjà sorti */ });
  else if (d.webkitFullscreenElement) d.webkitExitFullscreen?.();
  quitterPleinEcranSimule();
}

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
