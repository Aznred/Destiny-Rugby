// 🔒 LES CHANTIERS EN COURS — visibles par le développeur, pas par les joueurs.
//
// Demande explicite : « cache le mode entraîneur pour l'instant, il doit être
// accessible que par moi le dev pour voir les bugs etc ».
//
// ⚠️ CE N'EST PAS UNE SÉCURITÉ, ET IL NE FAUT PAS LE PRÉSENTER COMME TELLE.
// Tout ce qui est livré au navigateur est lisible : quelqu'un de motivé
// trouvera la clé en vingt secondes dans le bundle, exactement comme la clé
// Groq du site. Le but est différent — c'est un INTERRUPTEUR DE CHANTIER : il
// évite qu'un joueur ordinaire tombe sur un mode inachevé, se demande pourquoi
// il ne peut pas composer son XV, et le prenne pour un bug.
//
// ⚠️ ET IL NE SUPPRIME RIEN. Le mode entraîneur est entièrement là : store,
// écrans, banc d'essai, classement à catégories. Ce fichier ne fait que décider
// si ses PORTES s'affichent. Le jour où la couche 2 est prête, on retire
// `manager` de `CHANTIERS` et tout apparaît — sans rien réécrire.

/** Les fonctionnalités encore en chantier, cachées par défaut. */
const CHANTIERS = ['manager'] as const;
export type Chantier = (typeof CHANTIERS)[number];

/** Ce qu'on tape dans l'adresse ou dans le stockage local pour ouvrir. */
const CLE_DEV = 'ovalie-dev';

/**
 * Le mode développeur est-il actif ?
 *
 * Trois façons de l'allumer, et la troisième est celle qui sert vraiment :
 *
 *   1. **en développement** (`npm run dev`) : toujours ouvert — c'est là qu'on
 *      travaille, et devoir s'authentifier chez soi n'a aucun sens ;
 *   2. **`?dev=1` dans l'adresse** : le passage qu'on utilise une fois ;
 *   3. **`localStorage`** : le passage POSÉ par le précédent, qui survit aux
 *      rechargements. Sans lui, il faudrait remettre `?dev=1` à chaque fois —
 *      y compris après chaque navigation interne du jeu.
 *
 * ⚠️ LA LECTURE EST FAITE UNE FOIS, À L'IMPORT. Elle touche `location` et
 * `localStorage` : appelée à chaque rendu, elle ferait un accès au stockage par
 * pion affiché. Et l'état ne change pas en cours de session — sauf à recharger,
 * ce qui relit de toute façon.
 */
function lireModeDev(): boolean {
  if (import.meta.env?.DEV) return true;
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const demande = params.get('dev');
    if (demande === '1') {
      window.localStorage.setItem(CLE_DEV, '1');
      return true;
    }
    if (demande === '0') {
      window.localStorage.removeItem(CLE_DEV);
      return false;
    }
    return window.localStorage.getItem(CLE_DEV) === '1';
  } catch {
    // Navigation privée, stockage refusé : on reste côté joueur.
    return false;
  }
}

export const MODE_DEV = lireModeDev();

/** Cette fonctionnalité est-elle visible pour cette personne ? */
export function chantierVisible(quoi: Chantier): boolean {
  return MODE_DEV || !CHANTIERS.includes(quoi);
}
