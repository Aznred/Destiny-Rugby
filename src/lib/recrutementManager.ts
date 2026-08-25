// LE RECRUTEMENT DU MANAGER
//
// Les joueurs viennent des vrais effectifs simulés. Les montants, les attentes
// et les réponses sont déterministes : L'Ovale habille la discussion, mais le
// modèle économique reste jouable hors ligne et ne change pas au rechargement.

import type {
  CibleRecrutementManager, NegociationManager, RoleRecrueManager,
  TermesRecrutementManager,
} from '../types';
import { COMPETITIONS, competitionDuClub } from '../data/clubs';
import { effectifDuClub } from './effectif';
import { graine } from './championnat';
import { pseudoStable } from './comptes';

export type LevierRecrutementManager = 'salaire' | 'prime' | 'duree' | 'role';

const ORDRE_ROLE: RoleRecrueManager[] = ['espoir', 'rotation', 'cadre'];

function arrondir(montant: number, pas: number): number {
  return Math.max(pas, Math.round(montant / pas) * pas);
}

export function budgetsDuClub(club: string, saison: number): {
  transferts: number; salarial: number;
} {
  const groupe = effectifDuClub(club, saison);
  const force = groupe.length
    ? groupe.map((j) => j.note).sort((a, b) => b - a).slice(0, 23)
      .reduce((s, n) => s + n, 0) / Math.min(23, groupe.length)
    : 45;
  const niveau = competitionDuClub(club)?.niveau ?? 8;
  const facteur = Math.max(0.28, 1.1 - niveau * 0.075);
  return {
    transferts: arrondir(Math.max(150_000, (force - 31) ** 2 * 8_200 * facteur), 25_000),
    salarial: arrondir(Math.max(90_000, (force - 31) ** 2 * 1_850 * facteur), 10_000),
  };
}

function roleAttendu(note: number, potentiel: number, age: number, forceClub: number): RoleRecrueManager {
  if (age <= 23 && potentiel >= note + 4) return 'espoir';
  if (note >= forceClub + 1) return 'cadre';
  return 'rotation';
}

function ciblePour(
  club: string,
  division: string,
  saison: number,
  joueur: ReturnType<typeof effectifDuClub>[number],
  forceClubManager: number,
): CibleRecrutementManager {
  const rng = graine(`cible-manager#${club}#${joueur.id}#${saison}`);
  const jeunesse = joueur.age <= 24 ? 1.25 : joueur.age >= 32 ? 0.55 : 1;
  const potentiel = 1 + Math.max(0, joueur.potentiel - joueur.note) * 0.055;
  const rarete = 0.88 + rng() * 0.24;
  const valeur = Math.max(35, joueur.note - 34);
  const indemnite = arrondir(valeur ** 2 * 1_850 * jeunesse * potentiel * rarete, 25_000);
  const salaireDemande = arrondir(
    Math.max(18_000, valeur ** 2 * 180 * (0.9 + rng() * 0.24)),
    5_000,
  );
  const roleDemande = roleAttendu(joueur.note, joueur.potentiel, joueur.age, forceClubManager);
  return {
    id: `${club}#${joueur.id}`,
    pseudo: pseudoStable(joueur.nom),
    nom: joueur.nom,
    club,
    division,
    poste: joueur.poste,
    age: joueur.age,
    note: joueur.note,
    potentiel: joueur.potentiel,
    nation: joueur.nation,
    indemnite,
    salaireDemande,
    primeDemandee: arrondir(salaireDemande * (0.12 + rng() * 0.18), 2_500),
    dureeDemandee: joueur.age >= 31 ? 2 : 3 + (rng() > 0.72 ? 1 : 0),
    roleDemande,
  };
}

/**
 * Le marché d'une compétition. « Tous les clubs » reste borné pour les grands
 * championnats amateurs ; choisir un club donne toujours son effectif complet.
 */
export function ciblesDuMarche(
  division: string,
  saison: number,
  clubManager: string,
  clubFiltre = '',
  max = 72,
): CibleRecrutementManager[] {
  const comp = COMPETITIONS.find((c) => c.id === division);
  if (!comp) return [];
  const forceManager = (() => {
    const groupe = effectifDuClub(clubManager, saison);
    if (!groupe.length) return 50;
    const notes = groupe.map((j) => j.note).sort((a, b) => b - a).slice(0, 23);
    return notes.reduce((s, n) => s + n, 0) / notes.length;
  })();
  const clubs = clubFiltre
    ? comp.clubs.filter((c) => c.nom === clubFiltre)
    : comp.clubs.filter((c) => c.nom !== clubManager).slice(0, 18);
  const parClub = clubFiltre ? 60 : Math.max(4, Math.ceil(max / Math.max(1, clubs.length)));
  return clubs.flatMap((club) => [...effectifDuClub(club.nom, saison)]
    .sort((a, b) => b.note - a.note || b.potentiel - a.potentiel)
    .slice(0, parClub)
    .map((joueur) => ciblePour(club.nom, division, saison, joueur, forceManager)))
    .filter((c) => c.club !== clubManager)
    .sort((a, b) => b.note - a.note || b.potentiel - a.potentiel)
    .slice(0, max);
}

export function ouvrirNegociationManager(
  cible: CibleRecrutementManager,
  saison: number,
  semaine: number,
): NegociationManager {
  const exigences: TermesRecrutementManager = {
    salaire: cible.salaireDemande,
    prime: cible.primeDemandee,
    duree: cible.dureeDemandee,
    role: cible.roleDemande,
  };
  const rang = Math.max(0, ORDRE_ROLE.indexOf(cible.roleDemande) - 1);
  return {
    id: `nego-manager#${cible.id}#${saison}`,
    pseudo: cible.pseudo,
    joueur: cible,
    offre: {
      salaire: arrondir(cible.salaireDemande * 0.82, 5_000),
      prime: arrondir(cible.primeDemandee * 0.55, 2_500),
      duree: Math.max(1, cible.dureeDemandee - 1),
      role: ORDRE_ROLE[rang],
    },
    exigences,
    patience: 4,
    etat: 'ouverte',
    saison,
    semaine,
  };
}

function score(offre: TermesRecrutementManager, exigences: TermesRecrutementManager): number {
  const salaire = Math.min(1.15, offre.salaire / Math.max(1, exigences.salaire));
  const prime = Math.min(1.15, offre.prime / Math.max(1, exigences.prime));
  const duree = Math.min(1.1, offre.duree / Math.max(1, exigences.duree));
  const role = ORDRE_ROLE.indexOf(offre.role) >= ORDRE_ROLE.indexOf(exigences.role) ? 1 : 0.55;
  return salaire * 0.52 + prime * 0.14 + duree * 0.12 + role * 0.22;
}

export function negocierAvecJoueur(
  negociation: NegociationManager,
  levier: LevierRecrutementManager,
): { negociation: NegociationManager; accord: boolean } {
  if (negociation.etat !== 'ouverte') return { negociation, accord: negociation.etat === 'accord' };
  const offre = { ...negociation.offre };
  if (levier === 'salaire') offre.salaire = arrondir(offre.salaire * 1.12, 5_000);
  if (levier === 'prime') offre.prime = arrondir(offre.prime * 1.35, 2_500);
  if (levier === 'duree') offre.duree = Math.min(5, offre.duree + 1);
  if (levier === 'role') {
    offre.role = ORDRE_ROLE[Math.min(ORDRE_ROLE.length - 1, ORDRE_ROLE.indexOf(offre.role) + 1)];
  }
  const accord = score(offre, negociation.exigences) >= 0.94;
  const patience = Math.max(0, negociation.patience - 1);
  return {
    accord,
    negociation: {
      ...negociation,
      offre,
      patience,
      etat: accord ? 'accord' : patience === 0 ? 'rompue' : 'ouverte',
    },
  };
}

export function accepterDemandesJoueur(negociation: NegociationManager): NegociationManager {
  if (negociation.etat !== 'ouverte') return negociation;
  return { ...negociation, offre: { ...negociation.exigences }, etat: 'accord' };
}

export function coutPremiereSaison(negociation: NegociationManager): number {
  return negociation.joueur.indemnite + negociation.offre.prime;
}
