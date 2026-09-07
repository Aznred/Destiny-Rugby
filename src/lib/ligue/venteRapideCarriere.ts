import type { CarteCarriere, RareteCarriere } from './typesCarriere';

/**
 * La vente rapide reste un filet de sécurité, jamais une meilleure affaire que
 * le marché entre joueurs. La note fait progresser la valeur dans chaque
 * bande, entre la moitié du plafond et le plafond demandé.
 */
const BAREME: Record<RareteCarriere, { debut: number; fin: number; plafond: number; pas: number }> = {
  bronze: { debut: 20, fin: 49, plafond: 50, pas: 5 },
  argent: { debut: 50, fin: 64, plafond: 250, pas: 10 },
  or: { debut: 65, fin: 79, plafond: 1_000, pas: 50 },
  elite: { debut: 80, fin: 87, plafond: 10_000, pas: 250 },
  star: { debut: 88, fin: 99, plafond: 20_000, pas: 500 },
};

/** Le plafond de la bande, celui que l'écran annonce avant de vendre. */
export function plafondVenteRapide(rarete: RareteCarriere): number {
  return BAREME[rarete].plafond;
}

export function valeurVenteRapide(carte: Pick<CarteCarriere, 'note' | 'rarete'>): number {
  const regle = BAREME[carte.rarete];
  const progression = Math.max(0, Math.min(1, (carte.note - regle.debut) / Math.max(1, regle.fin - regle.debut)));
  const valeur = regle.plafond * (0.5 + progression * 0.5);
  return Math.min(regle.plafond, Math.max(regle.pas, Math.round(valeur / regle.pas) * regle.pas));
}
