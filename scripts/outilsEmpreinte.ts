// Les outils de l'empreinte du moteur, partagés par `empreinteMoteur.ts` (le banc
// qu'on lance à la main) et par les bancs qui s'en servent comme garde-fou
// (`verifierControleDirect.ts`). Voir `empreinteMoteur.ts` pour le propos.
import { avancer, creerMatch, type OptionsMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { IA_MATCH_DE_CARRIERE } from '../src/lib/moteur/ia/reglages';
import type { EtatMatch } from '../src/lib/moteur/etat';

export const PAIRES: [string, string][] = [
  ['Stade Toulousain', 'RC Toulon'], ['Stade Rochelais', 'Racing 92'], ['Union Bordeaux-Bègles', 'ASM Clermont'],
  ['Castres Olympique', 'Section Paloise'], ['Racing 92', 'Stade Toulousain'], ['ASM Clermont', 'Castres Olympique'],
];
export const POSTES = ['ailier_droit', 'demi_ouverture', 'pilier_gauche', 'deuxieme_centre', 'arriere', 'troisieme_aile_g'] as const;

/** Empreinte FNV-1a 32 bits : courte, stable, sans dépendance. */
export function empreinte(texte: string): string {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) { h ^= texte.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function resumerMatch(e: EtatMatch): string {
  const pions = e.pions.map((p) => [
    p.id, p.surLeTerrain ? 1 : 0, Math.round(p.pos.x * 100), Math.round(p.pos.y * 100),
    Math.round(p.endurance * 10), p.stats.passes, p.stats.plaquages, p.stats.plaquagesManques,
    Math.round(p.stats.metres * 10), p.stats.courses, p.stats.offloads, p.stats.grattages,
    p.stats.coupsDePied, p.stats.essais, Math.round(p.minutes * 10),
  ].join(','));
  return [e.scoreA, e.scoreB, e.essaisA, e.essaisB, Math.round(e.sim * 100), Math.round(e.t),
    e.commentaires.length, e.compteurs.rucks, e.compteurs.melees, e.compteurs.touches, e.compteurs.enAvants,
    pions.join('|')].join(';');
}

/** Le même match de carrière 3D que le jeu crée, sans le lancer : à l'appelant de le faire avancer. */
export function creerMatchDEmpreinte(k: number, plus: Partial<OptionsMatch> = {}): EtatMatch {
  const [a, b] = PAIRES[k % PAIRES.length];
  const cibles = [[24, 20], [31, 17], [18, 22], [27, 27]][k % 4];
  const poste = POSTES[k % POSTES.length];
  const e = creerMatch(a, b, effectifDuClub(a, 1), effectifDuClub(b, 1), cibles[0], cibles[1], `empreinte-${k}`,
    {
      club: a, nom: 'Joueur Test', poste,
      attributs: { vitesse: 70, force: 66, endurance: 68, plaquage: 64, passe: 62, jeuAuPied: 58, vision: 64, mental: 62 },
      titulaire: k % 2 === 0,
    },
    {
      niveau: 'pro', scoreSurTerrain: true, controle: true, cadenceDetaillee: true, placementJoue: true, ia: IA_MATCH_DE_CARRIERE,
      ...plus,
    });
  e.carriereDixMinutes = true;
  return e;
}

/** Un match complet, par pas de 0,6 s simulée (comme les bancs), avec un joueur incarné. */
export function jouerPourEmpreinte(k: number, avant?: (e: EtatMatch) => void): EtatMatch {
  const e = creerMatchDEmpreinte(k);
  avant?.(e);
  let garde = 0;
  while (!e.fini && garde++ < 200000) avancer(e, 0.6);
  return e;
}
