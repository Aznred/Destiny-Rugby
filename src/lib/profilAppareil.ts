// LE PROFIL DE L'APPAREIL (Correctif 25, points 37 et 38)
//
// « Au lancement, détecter approximativement les capacités de l'appareil. Créer plusieurs profils internes : Low,
// Medium, High. Les différences doivent surtout être techniques — pas la suppression pure et simple d'éléments. »
//
// ⚠️ LE MEILLEUR INDICE EST CE QUE L'APPAREIL A DÉJÀ FAIT. Un navigateur ne dit presque rien du matériel (ni la carte
// graphique sur iOS, ni la mémoire hors de Chrome) ; en revanche le dernier match joué en 3D a été MESURÉ ici même.
// S'il a fini à trente images par seconde, le suivant y commence au lieu de saccader dix secondes avant de s'y
// résoudre — et la scène remonte d'elle-même à la pleine cadence si une image lui coûte assez peu (`scene.js`).
// Faute de mesure, on se rabat sur ce que le navigateur veut bien dire : tactile ou non, mémoire, cœurs.
//
// Ce que chaque profil change, TECHNIQUEMENT (l'image, elle, garde tout : stade, public, joueurs, équipements) :
//   haut  — ordinateur : textures entières, cadence de l'écran ;
//   moyen — téléphone ou tablette : mode léger de la scène (textures du stade à 1 024 px, définition bornée), 60 au plus ;
//   bas   — comme « moyen », en partant à 30 images par seconde régulières.
import type { MesuresScene } from './profileur';

export type ProfilAppareil = 'bas' | 'moyen' | 'haut';
export const PLATEFORMES = ['ordinateur', 'android', 'ios', 'autre'] as const;
export type Plateforme = typeof PLATEFORMES[number];
/** Ce que le joueur a ressenti sur tout le match : 55 et plus, de 40 à 54, de 25 à 39 (trente régulier), moins de 25. */
export const TRANCHES_FLUIDITE = ['fluide', 'correcte', 'trente', 'saccadee'] as const;
export type TrancheFluidite = typeof TRANCHES_FLUIDITE[number];

export interface MatchMesure { le: string; cadence: number; definition: number; ips: number }
export interface DiagnosticAppareil {
  profil: ProfilAppareil; plateforme: Plateforme; leger: boolean;
  /** Go annoncés par le navigateur (Chrome seulement) et cœurs logiques. */
  memoire?: number; coeurs?: number;
  /** Pourquoi ce profil : affiché dans le Labo, jamais au joueur. */
  raison: string;
  dernierMatch?: MatchMesure;
}
export interface DetailFluidite { plateforme: Plateforme; tranche: TrancheFluidite; cadence30: boolean; definitionReduite: boolean }

const CLE = 'destiny-rugby:fluidite';
/** Annoncé à la fin d'un match mesuré ; le relevé d'utilisation l'écoute (`lib/usage/suivi.ts`). */
export const EVENEMENT_FLUIDITE = 'destiny-rugby:fluidite';
/** En dessous, un match ne dit rien (présentation passée, sortie immédiate). */
const DUREE_UTILE = 20;

export function plateforme(): Plateforme {
  if (typeof navigator === 'undefined') return 'ordinateur';
  const ua = navigator.userAgent || '';
  // Un iPad se présente comme un Mac : c'est l'écran tactile qui le trahit.
  if (/iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return appareilTactile() ? 'autre' : 'ordinateur';
}

function appareilTactile(): boolean {
  if (typeof window === 'undefined') return false;
  const tactile = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return tactile || Math.min(window.innerWidth, window.innerHeight) < 700;
}

function dernierMatch(): MatchMesure | undefined {
  try {
    const m = JSON.parse(localStorage.getItem(CLE) ?? 'null') as MatchMesure | null;
    return m && typeof m.cadence === 'number' && typeof m.ips === 'number' ? m : undefined;
  } catch { return undefined; }
}

export function trancheDeFluidite(ips: number): TrancheFluidite {
  return ips >= 55 ? 'fluide' : ips >= 40 ? 'correcte' : ips >= 25 ? 'trente' : 'saccadee';
}

/** Le profil de CET appareil, relu à chaque match (il suit la dernière mesure). */
export function profilAppareil(): DiagnosticAppareil {
  const systeme = plateforme();
  const leger = systeme === 'ios' || appareilTactile();
  const nav = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { deviceMemory?: number });
  const memoire = nav?.deviceMemory, coeurs = nav?.hardwareConcurrency;
  const dernier = dernierMatch();
  const renduLeger = systeme === 'ios' || leger && !((memoire ?? 0) >= 6 && (coeurs ?? 0) >= 8);
  const base = { plateforme: systeme, leger: renduLeger, memoire, coeurs, dernierMatch: dernier };
  if (dernier && dernier.cadence === 30) return { ...base, profil: 'bas', raison: 'Le dernier match en 3D a fini à 30 images par seconde.' };
  if (dernier) return { ...base, profil: renduLeger ? 'moyen' : 'haut', raison: `Le dernier match en 3D a tenu ${dernier.ips} images par seconde.` };
  if (memoire !== undefined && memoire <= 2) return { ...base, leger: true, profil: 'bas', raison: `${memoire} Go de mémoire annoncés.` };
  if (coeurs !== undefined && coeurs <= 2) return { ...base, leger: true, profil: 'bas', raison: `${coeurs} cœurs annoncés.` };
  if (systeme === 'ios') return { ...base, profil: 'moyen', raison: 'iPhone ou iPad : textures allégées et mémoire graphique bornée.' };
  if (leger && (memoire ?? 0) >= 6 && (coeurs ?? 0) >= 8) return { ...base, leger: false, profil: 'haut', raison: 'Appareil tactile avec mémoire et processeur suffisants pour le rendu complet.' };
  if (leger && coeurs !== undefined && coeurs <= 4 && (memoire ?? 4) <= 3) return { ...base, profil: 'bas', raison: `Appareil tactile, ${coeurs} cœurs.` };
  if (leger) return { ...base, profil: 'moyen', raison: 'Appareil tactile ou petit écran, pas encore mesuré.' };
  return { ...base, profil: 'haut', raison: 'Ordinateur, pas encore mesuré.' };
}

/**
 * À la fin d'un match en 3D : retient ce que l'appareil a tenu (pour le profil du match suivant) et l'annonce au relevé
 * d'utilisation, qui n'en garde qu'un compteur anonyme par plateforme. Sans effet sur un match trop court.
 */
export function retenirMesure(m: MesuresScene | undefined, maintenant = Date.now()): DetailFluidite | null {
  if (!m || (m.dureeMesuree ?? 0) < DUREE_UTILE || !m.moyenneMatch) return null;
  const ips = Math.round(m.moyenneMatch);
  const detail: DetailFluidite = {
    plateforme: plateforme(), tranche: trancheDeFluidite(ips), cadence30: m.cadence === 30,
    definitionReduite: m.definitionDeDepart !== undefined && m.definition < m.definitionDeDepart - 0.01,
  };
  try {
    const mesure: MatchMesure = { le: new Date(maintenant).toISOString(), cadence: m.cadence ?? 0, definition: Math.round(m.definition * 100) / 100, ips };
    localStorage.setItem(CLE, JSON.stringify(mesure));
  } catch { /* stockage refusé : le profil repartira des indices du navigateur */ }
  try { window.dispatchEvent(new CustomEvent<DetailFluidite>(EVENEMENT_FLUIDITE, { detail })); } catch { /* navigateur sans CustomEvent */ }
  return detail;
}
