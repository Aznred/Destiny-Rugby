// LES DEUX MONNAIES DU JEU (Correctif 21, puis fin de toute vente payante)
//
//   OVAS     → la monnaie de GAMEPLAY : matchs, objectifs, saisons, événements.
//   CRÉDITS  → l'ancienne monnaie premium. ⚠️ ELLE NE S'ACHÈTE PLUS : le jeu ne vend plus rien contre de l'argent réel. Un solde
//              déjà acquis reste dépensable, mais plus aucun article ne l'EXIGE : tout ce qui se vend a un prix en Ovas.
//
// ⚠️ UN PRIX DÉCLARE SA MONNAIE (`OVAS` ou `OVAS_OR_CREDITS`). Rien ne convertit une monnaie en l'autre à la volée : chaque
// article porte ses deux montants. Le taux ci-dessous sert à PROPOSER un prix quand on n'en a écrit qu'un.

export type Devise = 'ovas' | 'credits';
export type ModePrix = 'OVAS' | 'CREDITS' | 'OVAS_OR_CREDITS';

export interface PrixArticle {
  mode: ModePrix;
  /** Obligatoire dès que le mode accepte les Ovas. */
  ovas?: number;
  /** Obligatoire dès que le mode accepte les Crédits. */
  credits?: number;
}

export interface Soldes { ovas: number; credits: number }

/**
 * Combien d'Ovas valent un Crédit (le taux d'avant la fin des ventes : 1 Crédit pour 5 Ovas).
 * ⚠️ À réviser SEULEMENT avec les gains d'Ovas : les deux se tiennent.
 */
export const OVAS_PAR_CREDIT = 5;

export const prixOvas = (ovas: number): PrixArticle => ({ mode: 'OVAS', ovas });
/** Un ancien prix « Crédits seulement » : il s'achète aussi en Ovas, au taux du jeu (plus rien n'exige la monnaie payante). */
export const prixCredits = (credits: number): PrixArticle => ({ mode: 'OVAS_OR_CREDITS', ovas: credits * OVAS_PAR_CREDIT, credits });
export const prixLesDeux = (ovas: number, credits = Math.max(1, Math.round(ovas / OVAS_PAR_CREDIT))): PrixArticle => ({ mode: 'OVAS_OR_CREDITS', ovas, credits });

/** Les monnaies qu'accepte ce prix, dans l'ordre où la boutique les propose (Ovas d'abord). */
export function devisesAcceptees(prix: PrixArticle): Devise[] {
  const liste: Devise[] = [];
  if (prix.mode !== 'CREDITS' && Number.isFinite(prix.ovas)) liste.push('ovas');
  if (prix.mode !== 'OVAS' && Number.isFinite(prix.credits)) liste.push('credits');
  return liste;
}

/**
 * Les monnaies que l'ÉCRAN propose : les Crédits ne s'obtiennent plus, on ne les montre donc qu'à qui en a encore
 * (ou si l'article n'accepte rien d'autre).
 */
export function devisesProposees(prix: PrixArticle, soldes: Soldes): Devise[] {
  const acceptees = devisesAcceptees(prix);
  return soldes.credits > 0 || !acceptees.includes('ovas') ? acceptees : ['ovas'];
}

export function montantEn(prix: PrixArticle, devise: Devise): number | null {
  if (!devisesAcceptees(prix).includes(devise)) return null;
  return devise === 'ovas' ? prix.ovas! : prix.credits!;
}

/** Ce qui manque pour payer dans cette monnaie (0 si le solde suffit, `null` si la monnaie n'est pas acceptée). */
export function manque(prix: PrixArticle, devise: Devise, soldes: Soldes): number | null {
  const m = montantEn(prix, devise);
  return m === null ? null : Math.max(0, m - soldes[devise]);
}

/** Un prix est gratuit quand l'article n'en demande aucun (récompense, pub). */
export const estGratuit = (prix: PrixArticle): boolean => devisesAcceptees(prix).every((d) => montantEn(prix, d) === 0);

/** La monnaie proposée par défaut : celle qu'on a les moyens de payer, Ovas d'abord. */
export function devisePreferee(prix: PrixArticle, soldes: Soldes): Devise | null {
  const acceptees = devisesAcceptees(prix);
  return acceptees.find((d) => manque(prix, d, soldes) === 0) ?? acceptees[0] ?? null;
}

/** Valide une définition de prix reçue du Labo ou d'une sauvegarde : jamais de prix négatif, de NaN ni de monnaie absente. */
export function prixValide(valeur: unknown): PrixArticle | null {
  if (!valeur || typeof valeur !== 'object') return null;
  const { mode, ovas, credits } = valeur as Record<string, unknown>;
  const entier = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= 10_000_000;
  if (mode === 'OVAS') return entier(ovas) ? { mode, ovas: ovas as number } : null;
  // Un article réglé « Crédits seulement » (Labo, ancienne sauvegarde) reste achetable : son prix en Ovas se déduit.
  if (mode === 'CREDITS') return entier(credits) ? prixCredits(credits as number) : null;
  if (mode === 'OVAS_OR_CREDITS') return entier(ovas) && entier(credits) ? { mode, ovas: ovas as number, credits: credits as number } : null;
  return null;
}

/** Le résultat d'un achat : réussi, ou refusé pour une raison que l'écran SAIT dire (jamais un échec muet). */
export type ResultatAchat =
  | { ok: true; devise: Devise; montant: number }
  | { ok: false; raison: 'inconnu' | 'possede' | 'indisponible' | 'devise' }
  | { ok: false; raison: 'solde'; manque: number; montant: number; devise: Devise };
