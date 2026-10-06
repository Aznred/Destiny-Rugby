// LE JOUEUR QUE L'ON INCARNE N'EST PAS UN FIGURANT DU MONDE (Correctif 19).
//
// Quand la carrière part d'un joueur existant (Antoine DUPONT, Stade Toulousain), le monde contient DÉJÀ ce
// joueur : il figure dans l'effectif de son club, dans le vivier de sa sélection, dans les concurrents de son
// poste. Le laisser, c'est deux Dupont sur la feuille de match, deux dans l'écran Effectif — et un club qui compte
// deux fois son meilleur demi de mêlée (une fois dans son effectif, une fois dans l'apport du joueur incarné).
//
// Ce module ne fait que TENIR LE NOM. Il n'importe rien : `effectif.ts`, `selection.ts` et `international.ts` le
// lisent pour écarter ce joueur de leurs listes, et le store le renseigne (à la création de la carrière, au
// rechargement de la sauvegarde, à sa fin) — même principe que `setTransfertsSociaux`.
//
// ⚠️ LE NOM EST CELUI DE LA CARTE, À L'IDENTIQUE (« Antoine DUPONT ») : c'est la chaîne que l'effectif porte, et
// celle que le joueur de la carrière garde. Pas de normalisation — elle coûterait à chaque lecture d'effectif, et
// n'est pas nécessaire puisque les deux viennent de la même source.

let nom: string | null = null;
let version = 0;

/** Désigne le joueur incarné (`null` : personne). Rend vrai si cela change quelque chose. */
export function definirJoueurIncarne(nouveau: string | null | undefined): boolean {
  const valeur = nouveau || null;
  if (valeur === nom) return false;
  nom = valeur;
  version++;
  return true;
}

export const joueurIncarne = (): string | null => nom;

/** Change à chaque désignation : les mémoires qui dépendent des effectifs l'ajoutent à leur clé. */
export const versionJoueurIncarne = (): number => version;

export const estJoueurIncarne = (candidat: string): boolean => nom !== null && candidat === nom;
