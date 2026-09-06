// Les traductions restent volontairement séparées des données de trophées.
// `api/classement.ts` charge `data/trophees.ts` dans Node sur Vercel : importer
// i18n depuis ce module serveur ferait dépendre la fonction de toute l'interface.

import { TROPHEES, type Trophee } from '../data/trophees.js';
import { t } from './i18n.js';

/** Nom pour les cartes et le palmarès ; les données source restent immuables. */
export function nomTrophee(trophee: Trophee | undefined): string {
  if (!trophee) return '';
  const cle = `trophee.${trophee.id}.nom`;
  const traduit = t(cle);
  return traduit === cle ? trophee.nom : traduit;
}

export function descriptionTrophee(trophee: Trophee | undefined): string {
  if (!trophee) return '';
  const cle = `trophee.${trophee.id}.desc`;
  const traduit = t(cle);
  return traduit === cle ? trophee.desc : traduit;
}

/** Traduit aussi les anciens libellés sauvegardés (« … (S8) »). */
export function titreTraduit(titre: string): string {
  const trouve = Object.values(TROPHEES).find((trophee) =>
    titre === trophee.nom || titre.startsWith(`${trophee.nom} (`));
  if (!trouve) return titre;
  return `${nomTrophee(trouve)}${titre.slice(trouve.nom.length)}`;
}
