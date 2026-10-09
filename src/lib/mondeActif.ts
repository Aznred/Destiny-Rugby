// QUEL MONDE EST CHARGÉ : LE RUGBY MASCULIN OU LE RUGBY FÉMININ.
//
// ⚠️ LE JEU NE CONNAÎT QU'UN MONDE À LA FOIS, ET IL LE CHOISIT AU CHARGEMENT DE LA PAGE. Les deux mondes partagent des noms
// de clubs (« Stade Toulousain », « Racing 92 ») et tout le jeu retrouve un club par son nom (`clubParNom`,
// `effectifDuClub`, quatre-vingts usages) : les additionner donnerait à une joueuse l'effectif des hommes. Les listes
// dérivées (`COMPETITIONS`, `DIVISIONS_FRANCE`, index de clubs, catalogue des joueurs) sont calculées UNE fois, à l'import
// des modules — d'où ce choix lu AVANT tout le reste, dans `localStorage`. En changer recharge la page.
//
// Qui décide : `App` (`mondeVoulu`). Le monde féminin n'est chargé que pour une carrière solo de joueuse, sur ses propres
// écrans ; la ligue en ligne, la Collection et le mode entraîneur restent sur le monde masculin, parce que leur catalogue
// de cartes est recalculé dans le navigateur à partir de ces mêmes listes et doit rester celui du serveur.
//
// Module FEUILLE : aucun import. Côté serveur et dans les bancs (pas de `localStorage`), le monde est masculin ; un banc
// force l'autre avec `globalThis.__DESTINY_MONDE = 'F'` AVANT d'importer quoi que ce soit du jeu.

export type Monde = 'H' | 'F';

const CLE = 'destiny-rugby:monde';
/** L'écran à rouvrir après le rechargement qui change de monde (le store ne persiste pas l'écran). */
const CLE_RETOUR = 'destiny-rugby:monde-retour';

function lire(): Monde {
  try {
    const force = (globalThis as { __DESTINY_MONDE?: unknown }).__DESTINY_MONDE;
    if (force === 'F' || force === 'H') return force;
    return globalThis.localStorage?.getItem(CLE) === 'F' ? 'F' : 'H';
  } catch { return 'H'; }
}

/** Le monde chargé par cette page. Constant jusqu'au prochain rechargement. */
export const MONDE: Monde = lire();
export const MONDE_FEMININ = MONDE === 'F';
let rechargementDemande = false;

/**
 * Demande un monde. S'il est déjà chargé : rien, rend `false`. Sinon il est inscrit, l'écran de retour aussi, et la page
 * se recharge (rend `true` : l'appelant ne doit plus rien faire).
 * Une seule demande par page. Vérifier l'écriture évite de boucler si le stockage est indisponible ; aucun délai
 * entre deux pages ne doit empêcher une utilisatrice de revenir immédiatement à sa carrière.
 */
export function passerAuMonde(monde: Monde, retour?: string): boolean {
  if (monde === MONDE || rechargementDemande) return false;
  try {
    const stockage = globalThis.localStorage, session = globalThis.sessionStorage;
    if (!stockage || typeof location === 'undefined') return false;
    stockage.setItem(CLE, monde);
    if (stockage.getItem(CLE) !== monde) return false;
    if (retour) session?.setItem(CLE_RETOUR, retour); else session?.removeItem(CLE_RETOUR);
    rechargementDemande = true;
    location.reload();
    return true;
  } catch { rechargementDemande = false; return false; }
}

/** L'écran demandé avant le rechargement, lu une seule fois. */
export function retourApresChangementDeMonde(): string | null {
  try {
    const session = globalThis.sessionStorage, retour = session?.getItem(CLE_RETOUR) ?? null;
    session?.removeItem(CLE_RETOUR);
    return retour;
  } catch { return null; }
}
