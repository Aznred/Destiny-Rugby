// LA PROCHAINE DATE À LAQUELLE LA LIGUE PEUT BOUGER TOUTE SEULE
//
// ⚠️ POURQUOI CE CALCUL EXISTE. Chaque sondage de l'écran faisait relire au
// serveur l'état COMPLET de la ligue — 300 à 400 Ko pour une ligue à huit
// clubs — uniquement pour découvrir, neuf fois sur dix, que rien n'avait
// changé. Le quota de transfert Neon (5 Go par mois) est parti en huit jours.
//
// Pour répondre « rien n'a changé » SANS lire l'état, il faut deux choses : la
// version de la ligne (quelques octets) et la certitude qu'aucune échéance
// n'est passée depuis la dernière écriture. C'est cette seconde date que ce
// module calcule.
//
// ⚠️ ET IL LA CALCULE BÊTEMENT, EXPRÈS. On pourrait énumérer les échéances
// une par une — clôture d'une rencontre, fin d'une enchère, changement de jour
// pour les packs, fin d'un objectif, retour de blessure, calendrier des
// coupes. On aurait alors un catalogue à tenir à jour : le jour où quelqu'un
// ajoute une règle datée en oubliant cette liste, la ligue se FIGE — les
// matchs ne partent plus, les enchères ne se closent plus, et personne ne
// comprend pourquoi.
//
// On prend donc la plus petite date FUTURE qui apparaisse n'importe où dans
// l'état. Une échéance est forcément une date rangée quelque part : on ne peut
// pas en manquer une. Au pire, on retient une date qui n'était l'échéance de
// rien — et on relit l'état un peu plus tôt que nécessaire. Le défaut de cette
// méthode, c'est de moins économiser ; jamais de casser le jeu.

/** Une date ISO, telle que le mode en ligne les écrit (`dateServeur`). */
const DATE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
/**
 * ⚠️ ON NE DESCEND PAS INDÉFINIMENT. L'état est un objet de quelques niveaux ;
 * une profondeur bornée protège d'une structure cyclique qu'un futur champ
 * introduirait, sans rien coûter au cas normal.
 */
const PROFONDEUR_MAX = 8;

/**
 * La plus petite date strictement postérieure à `maintenant` trouvée dans
 * l'état, en millisecondes — ou `null` si la ligue ne peut plus bouger seule.
 */
export function prochaineEcheance(etat: unknown, maintenant: number): number | null {
  let plusProche: number | null = null;
  const visiter = (valeur: unknown, profondeur: number): void => {
    if (profondeur > PROFONDEUR_MAX || valeur == null) return;
    if (typeof valeur === 'string') {
      if (valeur.length < 16 || !DATE_ISO.test(valeur)) return;
      const instant = Date.parse(valeur);
      if (!Number.isFinite(instant) || instant <= maintenant) return;
      if (plusProche === null || instant < plusProche) plusProche = instant;
      return;
    }
    if (Array.isArray(valeur)) { for (const x of valeur) visiter(x, profondeur + 1); return; }
    if (typeof valeur === 'object') { for (const x of Object.values(valeur)) visiter(x, profondeur + 1); }
  };
  visiter(etat, 0);
  return plusProche;
}

/**
 * ⚠️ LE CHANGEMENT DE JOUR EN EST UNE AUSSI, ET IL N'EST ÉCRIT NULLE PART.
 * `attribuerPacksQuotidiens` compare le jour courant au dernier lot distribué :
 * l'échéance est minuit, une date qui n'apparaît dans aucun champ. Sans elle,
 * les dix packs quotidiens d'une ligue endormie n'arriveraient qu'à la
 * première action d'un manager.
 */
export function prochainJour(maintenant: number): number {
  const minuit = new Date(maintenant);
  minuit.setUTCHours(24, 0, 0, 0);
  return minuit.getTime();
}

/** L'échéance à retenir pour une ligue : la plus proche des deux. */
export function echeanceLigue(etat: unknown, maintenant: number): number {
  const dansLEtat = prochaineEcheance(etat, maintenant);
  const jour = prochainJour(maintenant);
  return dansLEtat === null ? jour : Math.min(dansLEtat, jour);
}
