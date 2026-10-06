import type { Traduction } from '../lib/i18n.js';
import { TEXTES_TUTORIEL_GENERAL } from './textesTutorielGeneral.js';
import { TEXTES_TUTORIEL_JOUEUR } from './textesTutorielJoueur.js';
import { TEXTES_TUTORIEL_ENTRAINEUR } from './textesTutorielEntraineur.js';
import { TEXTES_TUTORIEL_LIGUE } from './textesTutorielLigue.js';
import { TEXTES_TUTORIEL_CONTEXTE } from './textesTutorielContexte.js';

// LES TEXTES DU TUTORIEL GUIDÉ (Correctif 18) — un fichier par mode, fusionnés ici et enregistrés dans `textes.ts`.
export const TEXTES_TUTORIEL: Record<string, Traduction> = {
  ...TEXTES_TUTORIEL_GENERAL,
  ...TEXTES_TUTORIEL_JOUEUR,
  ...TEXTES_TUTORIEL_ENTRAINEUR,
  ...TEXTES_TUTORIEL_LIGUE,
  ...TEXTES_TUTORIEL_CONTEXTE,
};
