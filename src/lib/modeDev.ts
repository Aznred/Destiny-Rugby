// 🔒 LES CHANTIERS EN COURS — visibles par le développeur, pas par les joueurs.
//
// Le mode entraîneur a terminé sa phase privée : il est désormais public et
// ne figure donc plus dans cette liste. L'interrupteur reste disponible pour
// de futurs modules réellement inachevés.
//
// ⚠️ CE N'EST PAS UNE SÉCURITÉ, ET IL NE FAUT PAS LE PRÉSENTER COMME TELLE.
// Tout ce qui est livré au navigateur est lisible : quelqu'un de motivé
// trouvera la clé en vingt secondes dans le bundle, exactement comme la clé
// Groq du site. Le but est différent — c'est un INTERRUPTEUR DE CHANTIER : il
// évite qu'un joueur ordinaire tombe sur un mode inachevé, se demande pourquoi
// il ne peut pas composer son XV, et le prenne pour un bug.
//
// ⚠️ ET IL NE SUPPRIME RIEN. Ce fichier décide seulement si les portes d'une
// fonctionnalité en chantier s'affichent dans une version publique.

export type Chantier = 'manager';

/** Les fonctionnalités encore en chantier, cachées par défaut. */
const CHANTIERS: readonly Chantier[] = [];

/** Contrat explicite consommé par les contrôles de la version publique. */
export const MODE_ENTRAINEUR_PUBLIC = !CHANTIERS.includes('manager');

/**
 * Le mode développeur est-il actif ?
 *
 * Deux façons de l'allumer :
 *
 *   1. **en développement** (`npm run dev`) : toujours ouvert — c'est là qu'on
 *      travaille, et devoir s'authentifier chez soi n'a aucun sens ;
 *   2. **`?dev=1` dans l'adresse** : un accès TEMPORAIRE pour tester la
 *      production. Dès que l'on revient sur l'adresse normale, le chantier se
 *      recache. Aucun drapeau n'est plus conservé dans le navigateur.
 *
 * ⚠️ LA LECTURE EST FAITE UNE FOIS, À L'IMPORT. Elle touche `location` et
 * l'état ne change pas en cours de session — sauf à recharger, ce qui relit
 * de toute façon l'adresse.
 */
function lireModeDev(): boolean {
  if (import.meta.env?.DEV) return true;
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('dev') === '1';
  } catch {
    // Adresse illisible : on reste côté joueur.
    return false;
  }
}

export const MODE_DEV = lireModeDev();

/** Cette fonctionnalité est-elle visible pour cette personne ? */
export function chantierVisible(quoi: Chantier): boolean {
  return MODE_DEV || !CHANTIERS.includes(quoi);
}
