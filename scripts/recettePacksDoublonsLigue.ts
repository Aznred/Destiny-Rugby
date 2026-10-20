import { creerCarriere } from '../src/lib/ligue/carriere';
import type { CompositionManager } from '../src/types';

export const INSTANT_RECETTE = Date.parse('2026-10-20T12:00:00Z');
export const COMPTE_RECETTE = 'compte-recette-doublons';
export function creerRecetteDoublons() {
  const etat = creerCarriere({ id: 'recette-doublons', code: 'DOUBLONS', nom: 'Recette locale', compteId: COMPTE_RECETTE,
    pseudo: 'Recette', clubNom: 'Club local', rythme: 3, maxClubs: 2, packsGratuitsParJour: 0, doublonsAutorises: true, cartesSpeciales: true }, INSTANT_RECETTE, 'recette-doublons');
  const club = etat.clubs[0], original = etat.cartes.find(c => c.id === club.composition.titulaires[0])!;
  const copie = { ...structuredClone(original), id: 'exemplaire-en-double', nom: `Copie de ${original.nom}`, note: 99 };
  etat.cartes.push(copie);
  const invalide: CompositionManager = structuredClone(club.composition);
  invalide.remplacants[0] = copie.id;
  club.compositionsSauvegardees = [{ id: 'ancienne-equipe', nom: 'Ancienne feuille en double', composition: invalide }];
  return { etat, original, copie, invalide };
}
