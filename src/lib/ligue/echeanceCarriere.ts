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

/**
 * ⚠️ UN MATCH EN DIRECT EST UNE ÉCHÉANCE PERMANENTE, ET AUCUNE DATE NE LE DIT.
 *
 * C'est le trou de la méthode « la plus petite date future » : une rencontre en
 * cours ne porte aucune date d'échéance — sa clôture est DERRIÈRE nous, et ce
 * qui doit se produire, c'est le prochain instant, tout le temps. La plus petite
 * date future trouvée dans l'état était donc la rencontre SUIVANTE, un jour plus
 * tard, ou minuit.
 *
 * Conséquence mesurée dans le navigateur : pendant les quatre-vingts minutes
 * d'un direct, CHAQUE sondage recevait « rien n'a changé » sans que le serveur
 * ne lise l'état — donc sans faire avancer le match. Le terrain n'avançait plus
 * que sur le battement de présence, toutes les douze secondes, par bonds. C'est
 * une bonne part du « c'est lent, les joueurs sont mal placés ».
 *
 * Tant qu'une rencontre est en cours, l'échéance est donc MAINTENANT : la
 * lecture conditionnelle se désarme, l'état est relu, le match avance.
 */
function directEnCours(etat: unknown): boolean {
  const rencontres = (etat as { rencontres?: unknown } | null)?.rencontres;
  if (!Array.isArray(rencontres)) return false;
  return rencontres.some((r) => {
    const match = (r as { match?: { termine?: boolean } } | null)?.match;
    return Boolean(match) && match?.termine !== true;
  });
}

/**
 * Prochain instant où le serveur doit réveiller une ligue pour ses matchs.
 *
 * Cette date est volontairement plus étroite que `echeanceLigue` : minuit,
 * une enchère ou un objectif peuvent être régularisés lors de la prochaine
 * ouverture de la ligue. Les matchs, eux, doivent avancer en arrière-plan
 * pour produire le direct et les notifications push.
 */
export function prochaineEcheanceMatch(etat: unknown, maintenant: number): number | null {
  const source = etat as { phase?: string; rencontres?: { ouvre: string; ferme: string; match?: { termine?: boolean }; resultat?: unknown }[] } | null;
  if (source?.phase !== 'saison') return null;
  const rencontres = source.rencontres ?? [];
  if (rencontres.some(r => r.match && r.match.termine !== true)) return maintenant;
  if (rencontres.some(r => !r.resultat && !r.match && Date.parse(r.ferme) <= maintenant)) return maintenant;
  const dates = rencontres
    .filter(r => !r.resultat && !r.match)
    .flatMap(r => [Date.parse(r.ouvre), Date.parse(r.ferme) - 120_000, Date.parse(r.ferme)])
    .filter(t => Number.isFinite(t) && t > maintenant);
  return dates.length ? Math.min(...dates) : null;
}

/** L'échéance à retenir pour une ligue : la plus proche des deux. */
export function echeanceLigue(etat: unknown, maintenant: number): number {
  if (directEnCours(etat)) return maintenant;
  const rencontres = (etat as {rencontres?: {ferme:string;match?:unknown;resultat?:unknown}[]})?.rencontres ?? [];
  const rappels = rencontres.filter(r=>!r.match&&!r.resultat).map(r=>Date.parse(r.ferme)-120000).filter(t=>t>maintenant);
  const prochainRappel = rappels.length ? Math.min(...rappels) : Infinity;
  const dansLEtat = prochaineEcheance(etat, maintenant);
  const jour = prochainJour(maintenant);
  return Math.min(dansLEtat ?? jour, jour, prochainRappel);
}
