/**
 * LE PACK PREMIUM GAGNÉ DANS LA BOUTIQUE S'OUVRE DANS LA COLLECTION (Correctif 42).
 *
 * La Boutique sait jouer la publicité et la roulette ; l'ouverture d'un pack solo (catalogue, tirage, cartes qu'on
 * retourne) vit dans la Collection. La Boutique dépose donc ici la session gagnée et change d'écran ; la Collection la
 * prend à son arrivée. ⚠️ Ce dépôt n'est qu'un passage de main : si la page est fermée entre les deux, la session reste
 * « réservée » côté serveur et la Collection la propose à la visite suivante.
 */
let depot: string | null = null;

export function deposerPackPremium(rewardSessionId: string): void { depot = rewardSessionId; }

export function prendrePackPremium(): string | null {
  const session = depot;
  depot = null;
  return session;
}
