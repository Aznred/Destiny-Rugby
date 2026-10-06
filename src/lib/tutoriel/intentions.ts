// LES INTENTIONS — ce que le tutoriel demande à un écran qui n'est pas encore monté.
//
// ⚠️ UNE INTENTION SE LIT UNE SEULE FOIS. L'introduction générale envoie le joueur vers la création en lui épargnant le choix du
// mode : l'écran de création, en se montant, lit l'intention et s'ouvre directement sur la fiche du joueur. Le lendemain, le même
// écran s'ouvre sur son choix habituel : une intention qui resterait en place ferait croire à un bug.

type ModeDeCreation = 'joueur';

let modeDemande: ModeDeCreation | null = null;

export function demanderLeModeDeCreation(mode: ModeDeCreation): void {
  modeDemande = mode;
}

/** Lit l'intention ET l'efface. */
export function prendreLeModeDeCreation(): ModeDeCreation | null {
  const m = modeDemande;
  modeDemande = null;
  return m;
}
