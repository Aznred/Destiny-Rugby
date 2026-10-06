// LE BARÈME DE CLASSEMENT, PAR COMPÉTITION
//
// Aucune règle globale du type « nul = 1 » : chaque compétition déclare son
// barème, et tous les classements (championnats, Six Nations, poules de Coupe
// du monde, ligues en ligne, carrière joueur et entraîneur) passent par ici.
// Les bonus s'ajoutent TOUJOURS aux points du résultat : ils ne le remplacent
// jamais (un nul à 2 points reste à 2 points, bonus en plus).

export type RegleBonusOffensif =
  /** Bonus d'un championnat de clubs : trois essais d'écart ou plus. */
  | { type: 'ecart'; essais: number }
  /** Bonus d'un tournoi de sélections : N essais marqués, quel que soit le résultat. */
  | { type: 'marques'; essais: number }
  | null;

export interface Bareme {
  victoire: number;
  nul: number;
  defaite: number;
  bonusOffensif: RegleBonusOffensif;
  /** Battu de N points ou moins : un point. `null` = pas de bonus défensif. */
  bonusDefensif: number | null;
}

/** Championnats de clubs (Top 14, Premiership, URC…) et ligues du jeu. */
export const BAREME_CLUBS: Bareme = {
  victoire: 4, nul: 2, defaite: 0,
  bonusOffensif: { type: 'ecart', essais: 3 },
  bonusDefensif: 7,
};

/** Tournois de sélections : Six Nations, poules de Coupe du monde, Rugby Championship. */
export const BAREME_TOURNOI: Bareme = {
  victoire: 4, nul: 2, defaite: 0,
  bonusOffensif: { type: 'marques', essais: 4 },
  bonusDefensif: 7,
};

const BAREMES: Record<string, Bareme> = {
  coupeDuMonde: BAREME_TOURNOI,
  sixNations: BAREME_TOURNOI,
  rugbyChampionship: BAREME_TOURNOI,
  sixNationsU20: BAREME_TOURNOI,
  mondialU20: BAREME_TOURNOI,
};

/** Barème d'une compétition internationale ; les clubs prennent le barème par défaut. */
export function baremeDeCompetition(id?: string): Bareme {
  return (id && BAREMES[id]) || BAREME_CLUBS;
}

export interface LigneBareme { points: number; bonus: number; resultat: 'victoire' | 'nul' | 'defaite' }

/** Points de classement d'UNE équipe pour UN match : résultat + bonus (toujours séparés). */
export function pointsDuMatch(
  b: Bareme, marques: number, encaisses: number, essaisMarques: number, essaisEncaisses: number,
): LigneBareme {
  const resultat = marques > encaisses ? 'victoire' : marques < encaisses ? 'defaite' : 'nul';
  let bonus = 0;
  const o = b.bonusOffensif;
  if (o && (o.type === 'ecart' ? essaisMarques - essaisEncaisses >= o.essais : essaisMarques >= o.essais)) bonus++;
  if (b.bonusDefensif !== null && resultat === 'defaite' && encaisses - marques <= b.bonusDefensif) bonus++;
  const base = resultat === 'victoire' ? b.victoire : resultat === 'nul' ? b.nul : b.defaite;
  return { points: base + bonus, bonus, resultat };
}
