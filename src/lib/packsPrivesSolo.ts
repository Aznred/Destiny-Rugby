import type { EtatCollectionSolo } from './collectionSolo.js';
import type { PackCarriere } from './ligue/typesCarriere.js';

/** Présentation seulement : l'accès et le tirage sont vérifiés par le serveur. */
export const PACK_ICONES_KIRI: PackCarriere = {
  id: 'prive-kiri-icons', nom: 'ICONS · Kiri', prix: 0, cartes: 10, famille: 'general',
  promesse: 'Dix cartes ICONS garanties. Pack gratuit réservé au compte Kiri.',
  probabilites: { bronze: 0, argent: 0, or: 0, elite: 0, star: 100 },
  garantieSpeciale: 'icons', speciales: { icons: 100 },
};

/** Ajout enregistré côté serveur, avec une révision protégeant des anciennes sauvegardes. */
export function ajouterCartesPackSolo(avant: EtatCollectionSolo, pack: string, cartes: Record<string, number>): EtatCollectionSolo {
  const quantites = { ...avant.quantites };
  let doublons = avant.doublons;
  for (const [cle, nombre] of Object.entries(cartes)) {
    doublons += nombre - (quantites[cle] ? 0 : 1);
    quantites[cle] = (quantites[cle] ?? 0) + nombre;
  }
  return { ...avant, quantites, doublons, revision: (avant.revision ?? 0) + 1,
    packsOuverts: { ...avant.packsOuverts, [pack]: (avant.packsOuverts[pack] ?? 0) + 1 } };
}
