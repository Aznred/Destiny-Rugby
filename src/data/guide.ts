// LE GUIDE DE CARRIÈRE — ce qu'on fait, dans quel ordre, et pourquoi
//
// ⚠️ Retour de joueurs : « au début on ne comprend pas trop comment ça marche,
// les transferts notamment ». Le tutoriel d'accueil (`components/Tutoriel.tsx`)
// répond à « qu'est-ce que je vais faire ? » AVANT de créer un joueur. Il ne
// répond pas à « et maintenant, je clique où ? », qui est la vraie question une
// fois la carrière lancée.
//
// ═══ CE QUI A ÉTÉ TRANCHÉ AVANT D'ÉCRIRE ═════════════════════════════════════
//
//  1. **LE GUIDE NE SCRIPTE RIEN.** Il ne force aucun clic, ne bloque aucun
//     écran, n'impose aucun ordre. Chaque étape est un PRÉDICAT sur l'état de la
//     partie : elle se coche quand la chose est faite, que le joueur soit passé
//     par le guide ou non. Un tutoriel qui prend la main casse exactement ce
//     qu'il prétend apprendre — se débrouiller.
//  2. **IL RESTE LISIBLE À L'AVANCE.** Les explications ne se déverrouillent
//     pas : quelqu'un qui veut comprendre les transferts à la semaine 2 peut
//     lire le chapitre entier tout de suite. C'est le reproche d'origine.
//  3. ⚠️ **LE CHAPITRE DES TRANSFERTS NE PEUT PAS SE TERMINER EN UNE SAISON, ET
//     C'EST LE JEU QUI LE VEUT.** Un club ne démarche que quelqu'un à un an de
//     contrat maximum (`susciterApproches`), et on démarre avec deux ou trois
//     ans. Le premier transfert arrive donc vers la saison 3. C'est précisément
//     ce qui rendait la mécanique incompréhensible : personne ne la voyait
//     jamais assez tôt pour la deviner. Le guide l'EXPLIQUE d'emblée et coche
//     ses étapes le jour venu.

import type { Ecran, Joueur } from '../types.js';

/** Ce que le guide a besoin de savoir de la partie pour cocher ses cases. */
export interface ContexteGuide {
  joueur: Joueur | null;
  /** Les écrans déjà ouverts au moins une fois. */
  ecransVus: string[];
  /** Nombre d'approches de clubs reçues. */
  approches: number;
  /** Nombre de scènes hebdomadaires déjà vécues. */
  scenesVues: number;
}

export type ChapitreGuide = 'debuts' | 'saison' | 'transferts';

export interface EtapeGuide {
  id: string;
  emoji: string;
  chapitre: ChapitreGuide;
  /** L'écran où ça se passe : le guide propose d'y aller. */
  ecran?: Ecran;
  /** Vrai quand l'étape est accomplie. */
  fait: (c: ContexteGuide) => boolean;
}

const saison = (c: ContexteGuide) => c.joueur?.saisonEnCours;

export const ETAPES_GUIDE: EtapeGuide[] = [
  // ═══ CHAPITRE 1 — TES DÉBUTS ═════════════════════════════════════════════
  {
    id: 'fiche', emoji: '👤', chapitre: 'debuts', ecran: 'carriere',
    fait: (c) => c.ecransVus.includes('carriere'),
  },
  {
    id: 'entrainement', emoji: '🎯', chapitre: 'debuts', ecran: 'carriere',
    fait: (c) => !!c.joueur?.entrainementFocus,
  },
  {
    id: 'match', emoji: '▶️', chapitre: 'debuts', ecran: 'carriere',
    fait: (c) => (saison(c)?.matchs ?? 0) >= 1,
  },
  {
    id: 'scene', emoji: '📖', chapitre: 'debuts', ecran: 'carriere',
    fait: (c) => c.scenesVues >= 1,
  },

  // ═══ CHAPITRE 2 — TA PREMIÈRE SAISON ═════════════════════════════════════
  {
    id: 'resultats', emoji: '📊', chapitre: 'saison', ecran: 'tableau',
    fait: (c) => c.ecransVus.includes('tableau'),
  },
  {
    id: 'effectif', emoji: '👥', chapitre: 'saison', ecran: 'effectif',
    fait: (c) => c.ecransVus.includes('effectif'),
  },
  {
    id: 'ovale', emoji: '𝕏', chapitre: 'saison', ecran: 'social',
    fait: (c) => c.ecransVus.includes('social'),
  },
  {
    id: 'bilan', emoji: '🗓️', chapitre: 'saison', ecran: 'carriere',
    fait: (c) => (c.joueur?.saison ?? 1) >= 2,
  },

  // ═══ CHAPITRE 3 — LES TRANSFERTS ═════════════════════════════════════════
  // ⚠️ Ces trois étapes-là mettent deux ou trois saisons à se cocher. Leur
  // TEXTE, lui, est lisible dès la première semaine : c'est tout l'objet du
  // chapitre.
  {
    id: 'contrat', emoji: '📄', chapitre: 'transferts', ecran: 'carriere',
    fait: (c) => (c.joueur?.contrat?.saisons ?? 9) <= 1,
  },
  {
    id: 'approche', emoji: '✉️', chapitre: 'transferts', ecran: 'social',
    fait: (c) => c.approches > 0 || !!c.joueur?.preAccord || (c.joueur?.clubs?.length ?? 1) > 1,
  },
  {
    id: 'preaccord', emoji: '🤝', chapitre: 'transferts', ecran: 'social',
    fait: (c) => !!c.joueur?.preAccord || (c.joueur?.clubs?.length ?? 1) > 1,
  },
  {
    id: 'demenagement', emoji: '🚚', chapitre: 'transferts', ecran: 'carriere',
    fait: (c) => (c.joueur?.clubs?.length ?? 1) > 1,
  },
];

export const CHAPITRES: { id: ChapitreGuide; emoji: string }[] = [
  { id: 'debuts', emoji: '🌱' },
  { id: 'saison', emoji: '📅' },
  { id: 'transferts', emoji: '✈️' },
];

/** La première étape non faite, ou `null` quand tout est bouclé. */
export function etapeCourante(c: ContexteGuide): EtapeGuide | null {
  return ETAPES_GUIDE.find((e) => !e.fait(c)) ?? null;
}

export function avancement(c: ContexteGuide): { faites: number; total: number } {
  return {
    faites: ETAPES_GUIDE.filter((e) => e.fait(c)).length,
    total: ETAPES_GUIDE.length,
  };
}
