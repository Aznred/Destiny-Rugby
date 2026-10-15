import type { Attributs, PosteId } from '../types.js';
import { POSTE_PAR_ID } from '../data/rugby.js';
import { morphoConseillee, morphoValide, type MorphoJoueur } from './apparenceJoueur.js';
import { noteDuClub } from './effectif.js';
import { MONDE_FEMININ } from './mondeActif.js';

export const ATTRIBUTS_CREATION = ['vitesse', 'force', 'endurance', 'plaquage', 'passe', 'jeuAuPied', 'vision', 'mental'] as const;
export const ATTRIBUTS_PHYSIQUES = ['vitesse', 'force', 'endurance', 'plaquage'] as const;
export type EcartsPhysique = Pick<Attributs, typeof ATTRIBUTS_PHYSIQUES[number]>;

/** Un seul tirage pour l'aperçu et la validation ; sans graine, le tirage historique reste disponible. */
export function attributsDeBase(poste: PosteId, graine?: number): Attributs {
  let etat = (graine ?? 0) >>> 0;
  const hasard = Number.isFinite(graine) ? () => {
    etat = (Math.imul(etat, 1664525) + 1013904223) >>> 0;
    return etat / 4294967296;
  } : Math.random;
  const cles = POSTE_PAR_ID[poste].cles;
  const base = {} as Attributs;
  for (const cle of ATTRIBUTS_CREATION) {
    let valeur = 26 + Math.floor(hasard() * 11);
    if (cles.includes(cle)) valeur += 6 + Math.floor(hasard() * 5);
    base[cle] = Math.min(60, valeur);
  }
  return base;
}

/** Le gabarit redistribue les aptitudes physiques : chaque avantage a sa contrepartie. */
export function ecartsDuPhysique(poste: PosteId, morpho?: Partial<MorphoJoueur>): EcartsPhysique {
  const reference = morphoValide(morphoConseillee(poste), poste);
  const physique = morphoValide(morpho, poste);
  const taille = (physique.tailleCm - reference.tailleCm) / 20;
  const poids = (physique.poidsKg - reference.poidsKg) / 25;
  const muscle = physique.muscle - reference.muscle;
  const epaules = physique.epaules - reference.epaules;
  const torse = physique.torse - reference.torse;
  const bras = physique.bras - reference.bras;
  const jambes = physique.jambes - reference.jambes;
  const arrondir = (valeur: number, limite: number) => Math.round(Math.max(-limite, Math.min(limite, valeur))) || 0;
  // Force ↔ vitesse ; plaquage ↔ endurance ; longueur de foulée ↔ endurance.
  const puissance = arrondir(2.5 * poids + taille + 2 * muscle + epaules + torse + .5 * bras, 4);
  const contact = arrondir(1.5 * poids + 1.5 * taille + muscle + .75 * epaules + .75 * torse + bras, 4);
  const foulee = arrondir(1.5 * jambes - .75 * taille - muscle - .5 * torse - .5 * bras, 2);
  return { force: puissance, plaquage: contact, vitesse: -puissance + foulee || 0, endurance: -contact - foulee || 0 };
}

/** Appliqué une fois à la création. La somme des points et les aptitudes techniques sont conservées. */
export function appliquerPhysiqueAuxAttributs(base: Attributs, ecarts: EcartsPhysique): Attributs {
  const resultat = { ...base };
  const transferer = (receveur: typeof ATTRIBUTS_PHYSIQUES[number], donneur: typeof ATTRIBUTS_PHYSIQUES[number], points: number) => {
    if (points < 0) { transferer(donneur, receveur, -points); return; }
    const transfert = Math.max(0, Math.min(points, 100 - resultat[receveur], resultat[donneur]));
    resultat[receveur] += transfert;
    resultat[donneur] -= transfert;
  };
  transferer('force', 'vitesse', ecarts.force);
  transferer('plaquage', 'endurance', ecarts.plaquage);
  transferer('vitesse', 'endurance', ecarts.vitesse + ecarts.force);
  return resultat;
}

/** Les valeurs affichées à la création sont exactement celles enregistrées par le store. */
export function attributsDeCreation({ poste, club, morpho, graine }: {
  poste: PosteId; club: string; morpho?: Partial<MorphoJoueur>; graine?: number;
}): { attributs: Attributs; ecartsPhysique: EcartsPhysique } {
  const base = attributsDeBase(poste, graine);
  // Une espoir du monde féminin démarre huit points sous la moyenne de son club, comme auparavant.
  const moyenne = Math.round(ATTRIBUTS_CREATION.reduce((somme, cle) => somme + base[cle], 0) / ATTRIBUTS_CREATION.length);
  const ecartClub = MONDE_FEMININ ? Math.max(0, Math.round(noteDuClub(club) - 8 - moyenne)) : 0;
  if (ecartClub) for (const cle of ATTRIBUTS_CREATION) base[cle] = Math.min(92, base[cle] + ecartClub);
  const attributs = appliquerPhysiqueAuxAttributs(base, ecartsDuPhysique(poste, morpho));
  const ecartsPhysique = Object.fromEntries(ATTRIBUTS_PHYSIQUES.map(cle => [cle, attributs[cle] - base[cle]])) as EcartsPhysique;
  return { attributs, ecartsPhysique };
}
