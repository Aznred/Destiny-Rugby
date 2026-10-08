// L'ÉCRAN D'ACHAT : UNE SEULE PORTE POUR TOUT CE QUI SE PAIE (Correctif 21)
//
// Packs, cosmétiques, stades, kits : tout passe par `demanderPaiement`, qui conduit le joueur jusqu'à une monnaie SUFFISANTE et
// rend la monnaie à débiter — ou `null` s'il renonce. C'est ensuite à l'appelant de faire la transaction (store). Le flux :
//
//   1. une seule monnaie acceptée, ou monnaie déjà choisie → on l'utilise ; deux monnaies → le joueur CHOISIT ;
//   2. solde insuffisant → une vraie fenêtre : « Pas assez d'Ovas, il te manque N » (Utiliser des Crédits / Obtenir des Ovas),
//      ou « Crédits insuffisants » (solde, prix, manque, Payer en Ovas) ;
//   3. dépenser des Crédits demande TOUJOURS une confirmation claire ; des Ovas, non (c'est la monnaie du jeu).
//
// ⚠️ AUCUN ARGENT RÉEL : le jeu ne vend plus rien. Les Crédits ne s'achètent plus ; un solde restant se dépense, c'est tout.
// Le module n'importe pas React : l'état se lit par `useSyncExternalStore` dans `components/ModalesMonnaie.tsx`.

import type { Devise, PrixArticle } from './monnaies';
import { devisesProposees, montantEn } from './monnaies';

export type EtapeAchat = 'choix' | 'insuffisant' | 'confirmation' | 'obtenirOvas';

export interface DemandeAchat {
  /** Ce qu'on achète, tel qu'on l'écrit dans les fenêtres (« Pack Espoirs », « Stade Destiny »). */
  titre: string;
  prix: PrixArticle;
  /** Monnaie déjà choisie (le joueur a cliqué sur « 150 Crédits ») : pas de fenêtre de choix. */
  devise?: Devise;
}

export interface EtatModaleAchat {
  etape: EtapeAchat | null;
  demande: DemandeAchat | null;
  devise: Devise | null;
}

const VIDE: EtatModaleAchat = { etape: null, demande: null, devise: null };
let etat: EtatModaleAchat = VIDE;
let resolution: ((devise: Devise | null) => void) | null = null;
let soldesLus: () => { ovas: number; credits: number } = () => ({ ovas: 0, credits: 0 });
const abonnes = new Set<() => void>();

const emettre = () => { for (const a of abonnes) a(); };
const poser = (suivant: EtatModaleAchat) => { etat = suivant; emettre(); };

export const lireEtatAchat = (): EtatModaleAchat => etat;
export function abonnerAchat(cb: () => void): () => void { abonnes.add(cb); return () => { abonnes.delete(cb); }; }

/** Le store du jeu fournit les soldes au module (une seule fois, au démarrage) : pas de cycle d'imports. */
export function fournirSoldes(lecture: () => { ovas: number; credits: number }): void { soldesLus = lecture; }

function terminer(devise: Devise | null) {
  const r = resolution;
  resolution = null;
  poser(VIDE);
  r?.(devise);
}

/** Après le choix d'une monnaie : solde suffisant → confirmation (Crédits) ou fin (Ovas) ; sinon fenêtre « insuffisant ». */
export function choisirDevise(devise: Devise): void {
  const d = etat.demande;
  if (!d) return;
  const montant = montantEn(d.prix, devise);
  if (montant === null) return;
  const soldes = soldesLus();
  if (soldes[devise] < montant) { poser({ ...etat, etape: 'insuffisant', devise }); return; }
  if (devise === 'credits') { poser({ ...etat, etape: 'confirmation', devise }); return; }
  terminer('ovas');
}

export function confirmerAchat(): void {
  if (etat.etape !== 'confirmation' || !etat.devise || !etat.demande) return;
  const montant = montantEn(etat.demande.prix, etat.devise);
  // Le solde peut avoir bougé depuis l'ouverture de la fenêtre : on le relit AVANT de rendre la main.
  if (montant === null || soldesLus()[etat.devise] < montant) { poser({ ...etat, etape: 'insuffisant' }); return; }
  terminer(etat.devise);
}

export function aller(etape: EtapeAchat): void { if (etat.etape) poser({ ...etat, etape }); }
export function annulerAchat(): void { terminer(null); }

/**
 * Conduit le joueur jusqu'à une monnaie suffisante. Rend la monnaie à débiter, ou `null` s'il renonce.
 * Deux appels simultanés : le second attend sa fenêtre (jamais deux fenêtres d'achat superposées).
 */
export async function demanderPaiement(demande: DemandeAchat): Promise<Devise | null> {
  while (etat.etape) await new Promise((r) => setTimeout(r, 120));
  // Les Crédits ne s'obtiennent plus : on ne les propose qu'à qui en a encore.
  const acceptees = devisesProposees(demande.prix, soldesLus());
  if (acceptees.length === 0) return null;
  const devise = demande.devise && acceptees.includes(demande.devise) ? demande.devise : acceptees.length === 1 ? acceptees[0] : null;
  // Chemin rapide : des Ovas en quantité suffisante, monnaie déjà connue — aucune fenêtre.
  if (devise === 'ovas' && soldesLus().ovas >= (montantEn(demande.prix, 'ovas') ?? Infinity)) return 'ovas';
  // Gratuit (récompense, pub) : rien à débiter.
  if (devise && (montantEn(demande.prix, devise) ?? 1) === 0) return devise;
  return new Promise<Devise | null>((resolve) => {
    resolution = resolve;
    poser({ etape: 'choix', demande, devise });
    if (devise) choisirDevise(devise);
  });
}
