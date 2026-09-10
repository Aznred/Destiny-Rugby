import type { FamillePoste } from '../../types.js';
import { graine } from './aleatoire.js';
const borner = (n:number) => Math.max(20, Math.min(99, Math.round(n)));
export function statistiquesCarte(note: number, famille: FamillePoste, cle: string): Record<string, number> {
  const rng = graine(cle);
  const avant = ['pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne'].includes(famille);
  const demi = famille === 'demi_melee' || famille === 'demi_ouverture';
  const valeur = (bonus = 0) => borner(note + bonus + Math.round(rng() * 8) - 4);
  return avant
    ? { MEL: valeur(famille === 'pilier' ? 7 : 0), PHY: valeur(6), DEF: valeur(3), RCK: valeur(4), END: valeur(), TEC: valeur(-4) }
    : { VIT: valeur(demi ? 1 : 6), PAS: valeur(demi ? 6 : 1), JDP: valeur(demi || famille === 'arriere' ? 5 : -4), TEC: valeur(3), DEF: valeur(-2), PHY: valeur(-3) };
}
