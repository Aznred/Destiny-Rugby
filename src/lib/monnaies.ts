// LES DEUX MONNAIES DU JEU (Correctif 21)
//
//   OVAS     → la monnaie de GAMEPLAY : matchs, objectifs, saisons, événements. Elle ne s'achète plus avec de l'argent réel.
//   CRÉDITS  → la monnaie PREMIUM : la seule qui s'achète (Stripe), au même titre que les points d'un jeu de football.
//
// ⚠️ UN PRIX DÉCLARE SA MONNAIE. Un article est vendu en Ovas seulement (`OVAS`), en Crédits seulement (`CREDITS`),
// ou dans les deux au choix du joueur (`OVAS_OR_CREDITS`). Rien ne convertit une monnaie en l'autre à la volée : chaque
// article porte ses deux montants. Le taux ci-dessous ne sert qu'à PROPOSER un prix en Crédits quand on n'en a pas écrit.
//
// ⚠️ ET RIEN NE SE PAIE EN ARGENT RÉEL SANS CONFIRMATION. Dépenser des Crédits demande une confirmation claire ; en acheter
// ouvre la page de paiement de Stripe, qui est elle-même la confirmation. Un solde insuffisant n'achète jamais rien tout seul.

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
 * Combien d'Ovas valent un Crédit, À L'ÉCHELLE ACTUELLE DU JEU : une belle carrière rapporte environ 500 Ovas, et 1 € achète
 * 100 Crédits (voir `OFFRES_CREDITS`) alors qu'il en achetait ≈ 505 en Ovas avant le Correctif 21. D'où 5.
 * ⚠️ À réviser SEULEMENT avec les gains d'Ovas : les deux se tiennent.
 */
export const OVAS_PAR_CREDIT = 5;

export const prixOvas = (ovas: number): PrixArticle => ({ mode: 'OVAS', ovas });
export const prixCredits = (credits: number): PrixArticle => ({ mode: 'CREDITS', credits });
export const prixLesDeux = (ovas: number, credits = Math.max(1, Math.round(ovas / OVAS_PAR_CREDIT))): PrixArticle => ({ mode: 'OVAS_OR_CREDITS', ovas, credits });

/** Les monnaies qu'accepte ce prix, dans l'ordre où la boutique les propose (Ovas d'abord). */
export function devisesAcceptees(prix: PrixArticle): Devise[] {
  const liste: Devise[] = [];
  if (prix.mode !== 'CREDITS' && Number.isFinite(prix.ovas)) liste.push('ovas');
  if (prix.mode !== 'OVAS' && Number.isFinite(prix.credits)) liste.push('credits');
  return liste;
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
  if (mode === 'CREDITS') return entier(credits) ? { mode, credits: credits as number } : null;
  if (mode === 'OVAS_OR_CREDITS') return entier(ovas) && entier(credits) ? { mode, ovas: ovas as number, credits: credits as number } : null;
  return null;
}

/** Les recharges de Crédits : les mêmes identifiants, quantités et montants vivent côté serveur (`paiementsStripe.ts`). */
export interface OffreCredits { id: string; nom: string; credits: number; prix: string; bonus?: string; populaire?: boolean }

export const OFFRES_CREDITS: OffreCredits[] = [
  { id: 'p1', nom: 'Essentiel', credits: 100, prix: '0,99 €' },
  { id: 'p2', nom: 'Réserve', credits: 600, prix: '4,99 €', bonus: '+20 %' },
  { id: 'p3', nom: 'Coffre', credits: 1400, prix: '9,99 €', bonus: '+40 %' },
  { id: 'p4', nom: 'Club', credits: 4000, prix: '24,99 €', bonus: '+60 %' },
  { id: 'p5', nom: 'Stade', credits: 9000, prix: '49,99 €', bonus: '+80 %', populaire: true },
  { id: 'p6', nom: 'Fortune', credits: 20000, prix: '99,99 €', bonus: '+100 %' },
];

/** Le résultat d'un achat : réussi, ou refusé pour une raison que l'écran SAIT dire (jamais un échec muet). */
export type ResultatAchat =
  | { ok: true; devise: Devise; montant: number }
  | { ok: false; raison: 'inconnu' | 'possede' | 'indisponible' | 'devise' }
  | { ok: false; raison: 'solde'; manque: number; montant: number; devise: Devise };
