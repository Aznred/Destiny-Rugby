import { cleCarteSolo } from '../collectionSolo.js';
import type { EtatCollectionSolo } from '../collectionSolo.js';
import type { SourceCarte } from './catalogueCarriere.js';
import { carteSeniorAutorisee } from './eligibiliteJoueurs.js';

/** Carte senior au même poste et GEN aussi proche que possible, jamais inférieur. */
export function compensationsSoloFfr(anciens: readonly SourceCarte[], catalogue: readonly SourceCarte[], sourcesRetirees: ReadonlySet<string>) {
  const seniors = catalogue.filter(c => carteSeniorAutorisee(c) && !c.speciale);
  const correspondances = new Map<string, { cle: string; genAvant: number; genApres: number }>();
  for (const ancienne of anciens) {
    if (!sourcesRetirees.has(ancienne.sourceId)) continue;
    const memePoste = seniors.filter(c => c.famille === ancienne.famille && c.note >= ancienne.note);
    const choix = (memePoste.length ? memePoste : seniors.filter(c => c.note >= ancienne.note))
      .sort((a, b) => a.note - b.note || a.sourceId.localeCompare(b.sourceId))[0];
    if (!choix) throw new Error('Aucune compensation senior équivalente. Migration interrompue.');
    correspondances.set(cleCarteSolo(ancienne.sourceId), { cle: cleCarteSolo(choix.sourceId), genAvant: ancienne.note, genApres: choix.note });
  }
  return correspondances;
}

/** Travaille sur une copie brute avant normalisation : ne perd aucun exemplaire retiré. */
export function migrerCollectionFfr(collection: EtatCollectionSolo, correspondances: ReturnType<typeof compensationsSoloFfr>) {
  const resultat = structuredClone(collection);
  const log: { source: string; remplacement: string; exemplaires: number; genAvant: number; genApres: number }[] = [];
  for (const [source, compensation] of correspondances) {
    const exemplaires = resultat.quantites[source] ?? 0;
    if (exemplaires <= 0) continue;
    delete resultat.quantites[source];
    resultat.quantites[compensation.cle] = (resultat.quantites[compensation.cle] ?? 0) + exemplaires;
    log.push({source,remplacement:compensation.cle,exemplaires,genAvant:compensation.genAvant,genApres:compensation.genApres});
  }
  if (log.length) {
    resultat.revision = (resultat.revision ?? 0) + 1;
    resultat.doublons = Object.values(resultat.quantites).reduce((total, n) => total + Math.max(0,n - 1), 0);
  }
  return {collection:resultat,log};
}
