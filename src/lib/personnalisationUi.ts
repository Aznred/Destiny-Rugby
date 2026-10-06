// L'OUVERTURE DE LA PERSONNALISATION, DE N'IMPORTE QUEL ÉCRAN (Correctif 21)
//
// La personnalisation montre ce qui est POSSÉDÉ (apparence, kits, stade, ballon, équipement) ; la boutique montre ce qui s'ACHÈTE.
// Elle s'ouvre depuis le profil, la boutique ou la carrière : un petit état partagé, lu par `components/Personnalisation.tsx`.
export type OngletPerso = 'joueur' | 'maillots' | 'divers' | 'debloquer';
export interface EtatPerso { ouvert: boolean; onglet: OngletPerso }

let etat: EtatPerso = { ouvert: false, onglet: 'joueur' };
const abonnes = new Set<() => void>();
const emettre = () => { for (const a of abonnes) a(); };

export const lireEtatPerso = (): EtatPerso => etat;
export function abonnerPerso(cb: () => void): () => void { abonnes.add(cb); return () => { abonnes.delete(cb); }; }
export function ouvrirPersonnalisation(onglet: OngletPerso = 'joueur'): void { etat = { ouvert: true, onglet }; emettre(); }
export function changerOngletPerso(onglet: OngletPerso): void { etat = { ...etat, onglet }; emettre(); }
export function fermerPersonnalisation(): void { etat = { ...etat, ouvert: false }; emettre(); }

/** La boutique à ouvrir « sur tel article » (depuis « Voir dans la boutique ») : lu une fois par l'écran Boutique. */
let cible: { rubrique: string; id: string } | null = null;
export function viserDansLaBoutique(rubrique: string, id: string): void { cible = { rubrique, id }; }
export function prendreCibleBoutique(): { rubrique: string; id: string } | null { const c = cible; cible = null; return c; }
