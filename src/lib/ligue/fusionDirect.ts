import type { VueCarriereEnLigne } from './typesCarriere.js';

type RencontreVue = VueCarriereEnLigne['rencontres'][number];
export interface DeltaDirect {
  id: string;
  version: number;
  rencontre: RencontreVue;
  /** Repères des parties lentes (fil, temps forts, banc…) : à renvoyer au sondage suivant. */
  reperes?: string;
  /** Parties que le serveur n'a PAS renvoyées parce que l'écran les tient déjà. */
  gardes?: string[];
  /** Les lignes ajoutées au fil depuis celles que l'écran connaît. */
  filSuite?: unknown[];
  /** Le serveur a retenu ce sondage comme une présence : le battement à part devient inutile. */
  presence?: boolean;
}

/**
 * Le match tel que l'écran le garde : ce que le serveur vient d'envoyer, plus
 * les parties lentes qu'il n'a pas renvoyées.
 *
 * ⚠️ LES REPÈRES VOYAGENT AVEC LA VUE (`reperesDirect`), pas à côté. Une
 * réponse refusée (plus ancienne que l'image affichée) ne doit pas faire croire
 * au serveur que l'écran tient ses parties : rangés dans le match fusionné, ils
 * décrivent toujours ce qui est RÉELLEMENT à l'écran. Une vue complète de la
 * ligue n'en porte pas : le sondage suivant redemande tout.
 */
function completerMatch(precedente: RencontreVue | undefined, delta: DeltaDirect): RencontreVue {
  const recu = delta.rencontre.match;
  // Le serveur n'envoie plus l'affiche à chaque sondage (clubs, horaires) : on garde celle qu'on tient.
  if (!recu || delta.reperes === undefined) return precedente ? { ...precedente, ...delta.rencontre } : delta.rencontre;
  const avant = precedente?.match as Record<string, unknown> | undefined;
  const match = { ...recu } as Record<string, unknown>;
  let complet = true;
  for (const cle of delta.gardes ?? []) {
    if (avant && avant[cle] !== undefined) match[cle] = avant[cle];
    else complet = false;
  }
  if (delta.filSuite?.length && Array.isArray(match.fil)) match.fil = [...match.fil, ...delta.filSuite];
  // Une partie gardée que l'écran n'a pas : on ne prétend rien, tout reviendra.
  if (complet) match.reperesDirect = delta.reperes;
  return { ...precedente, ...delta.rencontre, match: match as unknown as RencontreVue['match'] };
}

/**
 * Le score et le chrono du direct sont recalculés entre deux écritures de la
 * ligue : deux réponses peuvent donc porter la même version tout en ayant été
 * produites à des instants différents. Une réponse réseau ancienne ne doit
 * jamais faire reculer le match déjà affiché.
 */
export function rencontreDirectRegresse(courante: RencontreVue, suivante: RencontreVue): boolean {
  const avant = courante.match;
  const apres = suivante.match;
  if (!avant || !apres || avant.id !== apres.id) return false;
  if (avant.termine && !apres.termine) return true;
  if (apres.horloge + 1e-6 < avant.horloge) return true;
  return apres.score.domicile < avant.score.domicile || apres.score.exterieur < avant.score.exterieur;
}

function memeInstance(courante: RencontreVue, suivante: RencontreVue): boolean {
  const avant = courante.match;
  const apres = suivante.match;
  return Boolean(avant && apres && avant.id === apres.id
    && avant.instance !== undefined && avant.instance === apres.instance);
}

export function fusionnerDeltaDirect(
  courante: VueCarriereEnLigne,
  delta: DeltaDirect,
): VueCarriereEnLigne {
  if (courante.id !== delta.id || delta.version < courante.version) return courante;
  const precedente = courante.rencontres.find(r => r.id === delta.rencontre.id);
  // Une version réellement plus récente peut correspondre à une réinitialisation
  // volontaire du laboratoire. À version égale, en revanche, seul le temps a
  // passé et toute régression est nécessairement une réponse périmée.
  if (precedente && (delta.version === courante.version || memeInstance(precedente, delta.rencontre))
    && rencontreDirectRegresse(precedente, delta.rencontre)) return courante;
  const rencontre = completerMatch(precedente, delta);
  return {
    ...courante,
    rencontres: courante.rencontres.map(r => r.id === delta.rencontre.id ? rencontre : r),
  };
}

/**
 * Quand le serveur a, pour la dernière fois, retenu un sondage du direct comme
 * une présence (par match). Tant que c'est récent, l'écran n'envoie plus son
 * battement à part.
 */
export const presencesAcquittees = new Map<string, number>();

export function fusionnerVueLigue(
  courante: VueCarriereEnLigne | null,
  suivante: VueCarriereEnLigne,
): VueCarriereEnLigne {
  if (!courante || courante.id !== suivante.id) return suivante;
  if (suivante.version < courante.version) return courante;
  const anciennes = new Map(courante.rencontres.map(r => [r.id, r]));
  return {
    ...suivante,
    rencontres: suivante.rencontres.map(r => {
      const avant = anciennes.get(r.id);
      const comparable = suivante.version === courante.version || Boolean(avant && memeInstance(avant, r));
      return avant && comparable && rencontreDirectRegresse(avant, r) ? avant : r;
    }),
  };
}
