// LES TABLES INDEXÉES PAR NOM DE CLUB, POUR LE MONDE CHARGÉ (`lib/mondeActif.ts`).
//
// ⚠️ UN CLUB FÉMININ PEUT PORTER LE NOM D'UN CLUB MASCULIN (« Stade Toulousain », « Racing 92 », « Stade Bordelais »). Les
// tables générées du monde masculin — effectifs réels et amateurs, notes de clubs, mercato réel — sont indexées par ce
// nom : lues telles quelles dans le monde féminin, elles donneraient aux joueuses de Toulouse la note du Stade
// Toulousain des hommes (90), leurs recrues de l'été et leurs homonymes. Tout module qui n'est pas lui-même une donnée
// générée lit donc ces tables ICI : dans le monde masculin ce sont les originales, à l'identique ; dans le monde
// féminin elles sont vides, et la note d'un club est celle de son effectif de joueuses.

import { MONDE_FEMININ } from '../lib/mondeActif.js';
import { EFFECTIFS_REELS as EFFECTIFS_REELS_H, NOTE_CLUB_REEL as NOTE_CLUB_REEL_H, aEffectifReel as aEffectifReelH } from './effectifsReels.js';
import { EFFECTIFS_AMATEURS as EFFECTIFS_AMATEURS_H } from './amateurs.js';
import { NOTE_CLUB_NOUVEAU as NOTE_CLUB_NOUVEAU_H, effectifNouveau as effectifNouveauH } from './nouvellesLigues.js';
import { MERCATO_REEL as MERCATO_REEL_H } from './mercato.js';
import { CHAMPIONNATS_FEMININS } from './mondeFeminin.generated.js';

export type { JoueurNouveau } from './nouvellesLigues.js';

export const EFFECTIFS_REELS: typeof EFFECTIFS_REELS_H = MONDE_FEMININ ? {} : EFFECTIFS_REELS_H;
/** Monde féminin : la note de chaque club, calculée sur ses vingt-trois meilleures joueuses (`genMondeFeminin.cjs`). */
export const NOTE_CLUB_REEL: typeof NOTE_CLUB_REEL_H = MONDE_FEMININ
  ? Object.fromEntries(CHAMPIONNATS_FEMININS.flatMap(c => c.clubs.map(k => [k.nom, k.note])))
  : NOTE_CLUB_REEL_H;
export const aEffectifReel: typeof aEffectifReelH = MONDE_FEMININ ? (() => false) as typeof aEffectifReelH : aEffectifReelH;
export const EFFECTIFS_AMATEURS: typeof EFFECTIFS_AMATEURS_H = MONDE_FEMININ ? {} : EFFECTIFS_AMATEURS_H;
export const NOTE_CLUB_NOUVEAU: typeof NOTE_CLUB_NOUVEAU_H = MONDE_FEMININ ? {} : NOTE_CLUB_NOUVEAU_H;
export const effectifNouveau: typeof effectifNouveauH = MONDE_FEMININ ? (() => undefined) : effectifNouveauH;
export const MERCATO_REEL: typeof MERCATO_REEL_H = MONDE_FEMININ ? ({} as typeof MERCATO_REEL_H) : MERCATO_REEL_H;
