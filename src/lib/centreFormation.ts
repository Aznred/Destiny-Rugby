// ═══════════════════════════════════════════════════════════════════════════
// LE CENTRE DE FORMATION — six notes, et ce que chacune achète vraiment
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « je garderais 6 notes principales du centre : Installations /
// Coaching / Recrutement / Réseau / Médical / Réputation », avec une bande par
// division (« Top 14 70-100 … Régionale 5-30 ») et cette réserve, qui est le
// sel de toute la mécanique : « mais un petit club doit pouvoir avoir
// exceptionnellement un très bon centre. Ça permet des histoires du genre :
// petit club de Fédérale connu pour sa formation → vend régulièrement ses
// jeunes → monte progressivement. »
//
// ⚠️ CHAQUE NOTE DOIT ACHETER QUELQUE CHOSE DE DIFFÉRENT, sinon ce sont six
// façons d'écrire le même nombre. Le tableau ci-dessous est le contrat, et le
// banc d'essai vérifie qu'aucune n'est décorative :
//
//   Installations → la VITESSE de progression
//   Coaching      → le développement TECHNIQUE, et le plafond qu'on atteint
//   Recrutement   → la PRÉCISION de ce qu'on croit voir chez un jeune
//   Réseau        → le RAYON géographique de la détection
//   Médical       → le risque de blessure et la vitesse de retour
//   Réputation    → la capacité à FAIRE SIGNER, et à garder
//
// ⚠️ ET LE CENTRE N'APPARTIENT PAS À L'ENTRAÎNEUR, IL APPARTIENT AU CLUB. On ne
// démonte pas un centre de formation pour l'emporter ailleurs — c'est la même
// règle que `Manager.installations`, indexé par club.

import { competitionDuClub } from '../data/clubs.js';
import { distanceKm, positionDuClub } from '../data/geographie.js';
import { graine } from './championnat.js';
import { forceEffectif } from './effectif.js';
import { NIVEAU_INSTALLATION_MAX, niveauInstallation } from './installations.js';
import type { InstallationsClub } from '../types.js';

export interface NotesCentre {
  installations: number;
  coaching: number;
  recrutement: number;
  reseau: number;
  medical: number;
  reputation: number;
}

export type AxeCentre = keyof NotesCentre;

export const AXES_CENTRE: AxeCentre[] = [
  'installations', 'coaching', 'recrutement', 'reseau', 'medical', 'reputation',
];

/** Les six axes, en noms d'icônes dessinées (voir `components/Icone.tsx`). */
export const ICONE_AXE: Record<AxeCentre, 'stade' | 'entraineur' | 'loupe' | 'monde' | 'soin' | 'etoile'> = {
  installations: 'stade',
  coaching: 'entraineur',
  recrutement: 'loupe',
  reseau: 'monde',
  medical: 'soin',
  reputation: 'etoile',
};

/**
 * LA BANDE DE CHAQUE ÉTAGE — reprise telle quelle de la demande.
 *
 * ⚠️ ELLE EST LARGE EXPRÈS. Une bande étroite ferait de la note du centre une
 * simple redite du niveau du club : on saurait tout d'un club en lisant sa
 * division, et il n'y aurait aucune raison d'aller voir. Trente points d'écart
 * à l'intérieur d'un même étage, c'est de quoi distinguer le club qui forme du
 * club qui achète.
 */
const BANDE_PAR_NIVEAU: Record<number, [number, number]> = {
  0: [70, 100], 1: [70, 100], 2: [55, 90], 3: [40, 75], 4: [30, 65],
  5: [25, 55], 6: [15, 45], 7: [10, 35], 8: [5, 30], 9: [5, 30], 10: [5, 30],
};

function bande(niveau: number): [number, number] {
  return BANDE_PAR_NIVEAU[niveau] ?? [5, 30];
}

/**
 * LA PART DE CLUBS QUI DÉPASSENT LEUR ÉTAGE.
 *
 * ⚠️ SANS ELLE, LA DEMANDE N'EST PAS SATISFAITE. « Un petit club doit pouvoir
 * avoir exceptionnellement un très bon centre » : c'est ce tirage qui autorise
 * un club de Fédérale 2 à former mieux qu'un club de Pro D2, donc à vendre ses
 * jeunes, donc à monter. Sans lui, le classement des centres serait exactement
 * le classement des divisions, et la stratégie « petit club formateur » que la
 * demande décrit ne pourrait pas exister.
 */
const PART_CENTRE_REMARQUABLE = 0.07;
const BONUS_REMARQUABLE = 28;

const cache = new Map<string, NotesCentre>();

function borne(v: number): number {
  return Math.max(1, Math.min(100, Math.round(v)));
}

/**
 * LES SIX NOTES D'UN CLUB, avant tout investissement.
 *
 * Déterministe (graine = nom du club) : un centre ne change pas de valeur parce
 * qu'on rouvre l'écran, et rien n'a besoin d'être sauvegardé pour les
 * 855 clubs du jeu.
 *
 * ⚠️ LES SIX NOTES NE SONT PAS TIRÉES ENSEMBLE. Un club a un PROFIL — beaucoup
 * de béton et peu d'éducateurs, ou l'inverse. Six tirages indépendants dans la
 * même bande donneraient six nombres voisins, et tous les centres se
 * ressembleraient à l'intérieur d'un étage.
 */
export function notesDeBase(club: string): NotesCentre {
  const memo = cache.get(club);
  if (memo) return memo;

  const comp = competitionDuClub(club);
  const niveau = comp?.niveau ?? 8;
  const [bas, haut] = bande(niveau);
  const rng = graine(`centre#${club}`);

  // Le socle commun : où ce club se situe dans la bande de son étage.
  const socle = bas + rng() * (haut - bas);
  const remarquable = rng() < PART_CENTRE_REMARQUABLE;
  const prime = remarquable ? BONUS_REMARQUABLE * (0.5 + rng() * 0.5) : 0;

  // Puis le profil : chaque axe s'écarte du socle, dans les deux sens.
  const ecart = () => (rng() * 2 - 1) * (haut - bas) * 0.32;
  const notes: NotesCentre = {
    installations: borne(socle + ecart() + prime * 0.9),
    coaching: borne(socle + ecart() + prime),
    recrutement: borne(socle + ecart() + prime * 0.7),
    reseau: borne(socle + ecart() + prime * 0.6),
    medical: borne(socle + ecart() + prime * 0.5),
    // ⚠️ LA RÉPUTATION SUIT LE RÉSULTAT, PAS LE BÉTON. Elle est la seule des six
    // à regarder ce que le club vaut SPORTIVEMENT : on ne se fait pas un nom de
    // formateur en construisant un gymnase, mais en sortant des joueurs qu'on
    // voit jouer. C'est aussi elle qui fait qu'un club prestigieux attire des
    // jeunes que son centre ne mériterait pas.
    reputation: borne(socle * 0.55 + (comp ? (100 - niveau * 8.5) : 30) * 0.45 + prime * 0.8),
  };
  cache.set(club, notes);
  return notes;
}

/**
 * CE QUE LES INVESTISSEMENTS DU MANAGER AJOUTENT.
 *
 * ⚠️ ON NE JETTE PAS LE SYSTÈME EXISTANT, ON LE BRANCHE. `lib/installations.ts`
 * fait déjà acheter trois structures par paliers, avec son enveloppe, ses prix
 * en saisons de budget et son banc d'essai. Les six notes sont la SURFACE
 * LISIBLE que la demande réclame ; les paliers restent le LEVIER qu'on paie.
 * Deux systèmes d'achat concurrents auraient fini par se contredire.
 *
 * Chaque palier vaut +9 : quatre paliers font donc +36, de quoi sortir un club
 * de Fédérale de sa bande — mais il faut dix saisons d'enveloppe pour ça.
 */
export const GAIN_PAR_PALIER = 9;

export function notesDuCentre(
  club: string,
  installations?: Record<string, InstallationsClub>,
): NotesCentre {
  const base = notesDeBase(club);
  if (!installations) return base;
  const f = niveauInstallation(installations, club, 'formation');
  const e = niveauInstallation(installations, club, 'entrainement');
  const r = niveauInstallation(installations, club, 'recrutement');
  return {
    installations: borne(base.installations + e * GAIN_PAR_PALIER),
    coaching: borne(base.coaching + f * GAIN_PAR_PALIER),
    recrutement: borne(base.recrutement + r * GAIN_PAR_PALIER),
    reseau: borne(base.reseau + r * GAIN_PAR_PALIER * 0.8),
    medical: borne(base.medical + e * GAIN_PAR_PALIER * 0.6),
    // Un centre complet finit par se savoir.
    reputation: borne(base.reputation + (f + e + r) * GAIN_PAR_PALIER * 0.25),
  };
}

// ---------------------------------------------------------------------------
// CE QUE CHAQUE NOTE ACHÈTE
// ---------------------------------------------------------------------------

/**
 * LE RAYON DE DÉTECTION, en kilomètres.
 *
 * Demande : « Réseau de scouting → rayon géographique », avec l'exemple d'un
 * club de Régionale 1 qui voit « 50 km autour du club » face à un Toulouse
 * « national + international ».
 *
 * ⚠️ LA COURBE EST EXPONENTIELLE, PAS LINÉAIRE, et c'est ce qui donne son sens
 * aux trois étages de détection de la demande. En linéaire, un réseau à 50
 * verrait la moitié de la France : il n'y aurait plus de « détection locale »,
 * et la carte n'existerait plus comme contrainte.
 */
export function rayonDeDetection(reseau: number): number {
  return Math.round(35 * Math.exp(reseau / 26));
}

/** Le libellé de l'étage de détection, pour l'écran. */
export function etageDeDetection(reseau: number): 'local' | 'regional' | 'national' | 'international' {
  const r = rayonDeDetection(reseau);
  if (r < 90) return 'local';
  if (r < 260) return 'regional';
  if (r < 750) return 'national';
  return 'international';
}

/**
 * L'INCERTITUDE D'UNE PREMIÈRE OBSERVATION, en points de potentiel.
 *
 * Demande : « au début : Potentiel 55-88 · après 3 matchs : 68-84 · après
 * 10 matchs + entretien : 74-82 ». La largeur de départ vient donc du service
 * de recrutement ; c'est l'observation qui la resserre (`lib/detection.ts`).
 */
export function incertitudeDeDepart(recrutement: number): number {
  return Math.max(6, Math.round(25 - recrutement * 0.13));
}

/** Le risque de blessure d'un jeune, corrigé par le service médical. */
export function risqueCorrige(risqueBrut: number, medical: number): number {
  return Math.max(2, Math.round(risqueBrut * (1.25 - medical / 145)));
}

/**
 * LE POIDS DU CENTRE DANS LE CHOIX D'UN JEUNE.
 *
 * Demande : « Réputation du centre → attire les meilleurs jeunes » et « même si
 * un petit club tombe sur un jeune très fort, il peut avoir du mal à le
 * conserver ».
 */
export function attraitDuCentre(n: NotesCentre): number {
  return n.reputation * 0.5 + n.coaching * 0.3 + n.installations * 0.2;
}

/**
 * LE CENTRE VAUT-IL LE DÉPLACEMENT ? Une note globale sur 100, pour classer les
 * centres entre eux — c'est elle qu'on affiche en tête de fiche.
 */
export function noteGlobaleCentre(n: NotesCentre): number {
  return Math.round(
    (n.installations + n.coaching + n.recrutement + n.reseau + n.medical + n.reputation) / 6,
  );
}

/** Un centre qui dépasse franchement la bande de son étage se remarque. */
export function centreRemarquable(club: string): boolean {
  const comp = competitionDuClub(club);
  const [, haut] = bande(comp?.niveau ?? 8);
  return noteGlobaleCentre(notesDeBase(club)) > haut;
}

/**
 * LES CENTRES QUI COMPTENT AUTOUR DE CE JEUNE.
 *
 * ⚠️ C'EST LA FONCTION QUI FAIT EXISTER LA CONCURRENCE de la demande. Un club
 * n'est un rival que si son RÉSEAU atteint vraiment le garçon : c'est la même
 * distance et le même rayon que pour sa propre détection, pas un chiffre
 * inventé pour l'occasion.
 */
export function centresQuiObservent(
  clubDuJeune: string,
  clubsCandidats: string[],
): { club: string; distance: number; attrait: number }[] {
  const chezLui = positionDuClub(clubDuJeune);
  const liste: { club: string; distance: number; attrait: number }[] = [];
  for (const c of clubsCandidats) {
    if (c === clubDuJeune) continue;
    const n = notesDeBase(c);
    const d = distanceKm(chezLui, positionDuClub(c));
    if (d <= rayonDeDetection(n.reseau)) {
      liste.push({ club: c, distance: d, attrait: attraitDuCentre(n) });
    }
  }
  return liste.sort((a, b) => b.attrait - a.attrait);
}

/**
 * LA FORCE SPORTIVE DU CLUB, pour le choix d'un jeune. Mémoïsée par
 * `forceEffectif`, donc gratuite à répéter.
 */
export function niveauSportif(club: string, saison: number): number {
  return forceEffectif(club, saison);
}

export { NIVEAU_INSTALLATION_MAX };
