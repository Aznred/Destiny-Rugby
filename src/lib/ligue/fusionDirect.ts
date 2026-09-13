import type { VueCarriereEnLigne } from './typesCarriere.js';

type RencontreVue = VueCarriereEnLigne['rencontres'][number];
export interface DeltaDirect {
  id: string;
  version: number;
  rencontre: RencontreVue;
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
  return {
    ...courante,
    rencontres: courante.rencontres.map(r => r.id === delta.rencontre.id ? delta.rencontre : r),
  };
}

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
