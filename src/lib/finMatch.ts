// LA FIN D'UN MATCH EST UNE SUITE D'ÉTAPES, PAS UNE SEULE IMAGE (Correctif 26)
//
// Signalé : « à la fin d'un match l'application peut freezer plusieurs secondes, ne plus répondre, crasher, surtout
// sur téléphone ». À la sirène, tout partait dans le même instant : le résultat dans le championnat, les
// statistiques dans la saison, la sanction, les succès — et chaque écriture du store réécrivait la sauvegarde
// ENTIÈRE (`persist` : `JSON.stringify` de toute la carrière puis `localStorage.setItem`, synchrones). Derrière, l'écran
// de carrière recalculait son classement, et la scène 3D tenait encore son contexte graphique.
//
//   SIRÈNE
//     → RÉSULTAT VERROUILLÉ     score, vainqueur, feuille : un objet léger, lu une fois (`bilan`)
//     → ÉCRAN DE FIN AFFICHÉ    deux images dessinées avant de toucher au store
//     → FINALISATION            une étape par tâche du navigateur, l'écran reste vivant entre deux
//     → UNE SEULE ÉCRITURE      la sauvegarde est sérialisée une fois, à la fin (`suspendreEcritures`)
//   « Terminer »
//     → NETTOYAGE 3D            par tranches (`detruireParEtapes` de la scène), puis `lib/sortieMatch.ts`
//
// Les statistiques ne sont PAS recalculées à la fin : le moteur les cumule pion par pion pendant le match
// (`p.stats`), la feuille ne fait que les lire.
//
// ⚠️ UN MATCH N'EST FINALISÉ QU'UNE FOIS. Le registre ci-dessous tient par identifiant de match : un second
// passage (double appui, effet rejoué, composant remonté après une rotation) rend la même promesse et ne rejoue rien.

import { suspendreEcritures } from './persistanceNavigation';

/** Les jalons mesurés (`performance.mark`, et `globalThis.__finMatch` en développement). */
export type JalonFinMatch =
  | 'match_end_detected' | 'stats_finalize_start' | 'stats_finalize_end' | 'db_save_start' | 'db_save_end'
  | 'scene_cleanup_start' | 'scene_cleanup_end' | 'navigation_start' | 'navigation_end';

export interface MesureFinMatch { jalon: JalonFinMatch; t: number; match: string }

const MESURES: MesureFinMatch[] = [];
const maintenant = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Pose un jalon. Sans effet sur le jeu : une ligne en mémoire (les 200 dernières) et une marque du profileur. */
export function jalon(nom: JalonFinMatch, match = ''): void {
  MESURES.push({ jalon: nom, t: maintenant(), match });
  if (MESURES.length > 200) MESURES.splice(0, MESURES.length - 200);
  try { performance.mark?.(`fin-match:${nom}`); } catch { /* profileur absent */ }
}

/** Les jalons relevés, du plus ancien au plus récent. */
export function mesuresFinMatch(): MesureFinMatch[] { return [...MESURES]; }

/** Les durées du dernier match mesuré, en millisecondes : ce qu'on lit pour savoir OÙ part le temps. */
export function dureesFinMatch(): Record<string, number> {
  const t = (nom: JalonFinMatch) => MESURES.findLast((m) => m.jalon === nom)?.t;
  const ecart = (a: JalonFinMatch, b: JalonFinMatch) => {
    const [debut, fin] = [t(a), t(b)];
    return debut != null && fin != null ? Math.round((fin - debut) * 10) / 10 : NaN;
  };
  return {
    // L'écran de fin dessiné ET la scène 3D rendue : ce que le joueur attend avant que le store ne travaille.
    attenteEcran: ecart('match_end_detected', 'stats_finalize_start'),
    finalisation: ecart('stats_finalize_start', 'stats_finalize_end'),
    sauvegarde: ecart('db_save_start', 'db_save_end'),
    nettoyage3D: ecart('scene_cleanup_start', 'scene_cleanup_end'),
    navigation: ecart('navigation_start', 'navigation_end'),
  };
}

if (import.meta.env?.DEV) {
  (globalThis as { __finMatch?: unknown }).__finMatch = { mesures: mesuresFinMatch, durees: dureesFinMatch };
}

/** Rend la main au navigateur : une tâche plus tard (les clics et le dessin passent entre deux étapes). */
export function tacheSuivante(): Promise<void> {
  return new Promise<void>((fin) => { setTimeout(fin, 0); });
}

/**
 * Attend que l'écran ait été DESSINÉ (deux images).
 * ⚠️ Jamais sans filet : un onglet caché ne tire plus `requestAnimationFrame`, et la fin du match resterait
 * suspendue jusqu'au retour du joueur. Soixante millisecondes suffisent alors.
 */
export function apresLEcran(): Promise<void> {
  return new Promise<void>((fin) => {
    let fait = false;
    const finir = () => { if (!fait) { fait = true; fin(); } };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(finir));
    setTimeout(finir, typeof requestAnimationFrame === 'function' ? 60 : 0);
  });
}

/** Exécute `travail` en n'écrivant la sauvegarde qu'UNE fois, à la fin, quel que soit le nombre de `set()`. */
export function ecrituresGroupees<T>(travail: () => T): T {
  const reprendre = suspendreEcritures();
  try { return travail(); } finally { reprendre(); }
}

const FINALISATIONS = new Map<string, Promise<void>>();

/** Ce match a-t-il déjà été finalisé (ou est-il en train de l'être) ? */
export function matchFinalise(match: string): boolean { return FINALISATIONS.has(match); }

/**
 * Finalise un match : chaque étape dans SA tâche, la sauvegarde écrite une seule fois à la fin.
 *
 * - `match` identifie la rencontre (clé + saison) : un second appel rend la promesse du premier, sans rien rejouer ;
 * - une étape qui lève une erreur n'empêche pas les suivantes (le résultat ne doit pas dépendre d'un succès à débloquer) ;
 * - `avant` : ce qu'il faut laisser finir d'abord (la scène 3D qui se rend) ;
 * - `immediat` saute l'attente de l'écran (bancs sans navigateur).
 */
export function finaliserMatch(
  match: string, etapes: (() => void)[], options: { immediat?: boolean; avant?: () => Promise<void> } = {},
): Promise<void> {
  const dejaLa = FINALISATIONS.get(match);
  if (dejaLa) return dejaLa;
  jalon('match_end_detected', match);
  const promesse = (async () => {
    // L'écran de fin d'abord : le joueur voit le score avant que le store ne travaille.
    if (!options.immediat) await apresLEcran();
    try { await options.avant?.(); } catch { /* le match se finalise quand même */ }
    jalon('stats_finalize_start', match);
    const reprendre = suspendreEcritures();
    try {
      for (const etape of etapes) {
        try { etape(); } catch (erreur) { console.error('[fin de match] étape en échec', erreur); }
        if (!options.immediat) await tacheSuivante();
      }
    } finally {
      jalon('stats_finalize_end', match);
      jalon('db_save_start', match);
      // La seule sérialisation de la sauvegarde pour toute la fin du match.
      reprendre();
      jalon('db_save_end', match);
    }
  })();
  FINALISATIONS.set(match, promesse);
  // Le registre ne grossit pas au fil d'une carrière : on ne garde que les dernières rencontres.
  if (FINALISATIONS.size > 64) FINALISATIONS.delete(FINALISATIONS.keys().next().value!);
  return promesse;
}

/** Bancs seulement : repartir d'un registre vide. */
export function oublierFinalisations(): void { FINALISATIONS.clear(); MESURES.length = 0; }
