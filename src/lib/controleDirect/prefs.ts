// LES PRÉFÉRENCES DU CONTRÔLE DIRECT — ce qui appartient à l'appareil, pas à la partie.
//
// ⚠️ DANS `localStorage`, PAS DANS LA SAUVEGARDE. Une disposition de touches, une taille
// de joystick, un tutoriel déjà vu : tout cela suit la machine et la personne qui
// s'en sert, pas la carrière ouverte. (Le store persistant l'avait appris à ses
// dépens : « quand on switch de sauvegarde, ça nous remet le tuto ».) Même
// convention que `preferencesTele` : un module, un stockage, aucun cycle d'imports.

import { useSyncExternalStore } from 'react';
import { assainirTouches, copierTouches, type TouchesDirectes } from './touches';

const CLE = 'destiny-rugby:controle';

/** Comment on joue en 3D : au stick (direct), ou par cartes de décision (le jeu d'avant). */
export type ModePilotage = 'direct' | 'cartes';

export interface PreferencesControle {
  /** Direct : le joueur conduit son pion dès qu'il est sur le terrain. Cartes : le jeu d'avant. */
  mode: ModePilotage;
  /** L'anneau qui montre où l'IA le placerait. */
  aidePlacement: boolean;
  /** Taille de l'ensemble des commandes tactiles, de 0,75 à 1,5. */
  tailleHud: number;
  /** Opacité des commandes tactiles, de 0,3 à 1. */
  opaciteHud: number;
  /** Le joystick naît sous le pouce (flottant) ou reste à sa place (fixe). */
  joystick: 'flottant' | 'fixe';
  /** Un doigt poussé au bord du joystick sprinte. */
  sprintAuBord: boolean;
  /** Les commandes tactiles à droite (défaut) ou à gauche, pour les gauchers. */
  gaucher: boolean;
  /** Viser un coup de pied à la souris (facultatif). */
  souris: boolean;
  /** Vibrations du téléphone et de la manette. */
  vibrations: boolean;
  /** La rangée d'indications (touches ou boutons de la manette) posée au bas de l'écran. */
  indications: boolean;
  /** Le tutoriel d'entrée sur le terrain a été vu (ou passé). */
  tutorielVu: boolean;
  touches: TouchesDirectes;
  // ── Les responsabilités (Correctif 17) ──────────────────────────────────
  /** Tir à la manette : `direct` (stick gauche vise, stick droit dose, A frappe) ou `charge` (on tient A pour charger, on relâche pour frapper). */
  tirManette: 'direct' | 'charge';
  /** L'aide de visée légère : la ligne vers les poteaux, le repère de force utile, le vent. Jamais le résultat. */
  aideTir: boolean;
  /** Montrer au capitaine ce qu'un vice-capitaine lui conseillerait après une pénalité. */
  conseilCapitaine: boolean;
  /** Les cartes d'explication déjà vues, une par responsabilité (`penalite`, `tir`, `engagement`, `touche`, `drop`). */
  tutosResp: string[];
}

export const PREFERENCES_PAR_DEFAUT: Readonly<PreferencesControle> = {
  mode: 'direct', aidePlacement: true, tailleHud: 1, opaciteHud: 0.62, joystick: 'flottant', sprintAuBord: true,
  gaucher: false, souris: false, vibrations: true, indications: true, tutorielVu: false, touches: copierTouches(),
  tirManette: 'direct', aideTir: true, conseilCapitaine: true, tutosResp: [],
};

const bornerNombre = (v: unknown, min: number, max: number, defaut: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : defaut;

function assainir(brut: unknown): PreferencesControle {
  const b = (brut && typeof brut === 'object' ? brut : {}) as Record<string, unknown>;
  const d = PREFERENCES_PAR_DEFAUT;
  return {
    mode: b.mode === 'cartes' ? 'cartes' : 'direct',
    aidePlacement: b.aidePlacement !== false,
    tailleHud: bornerNombre(b.tailleHud, 0.75, 1.5, d.tailleHud),
    opaciteHud: bornerNombre(b.opaciteHud, 0.3, 1, d.opaciteHud),
    joystick: b.joystick === 'fixe' ? 'fixe' : 'flottant',
    sprintAuBord: b.sprintAuBord !== false,
    gaucher: b.gaucher === true,
    souris: b.souris === true,
    vibrations: b.vibrations !== false,
    indications: b.indications !== false,
    tutorielVu: b.tutorielVu === true,
    touches: assainirTouches(b.touches),
    tirManette: b.tirManette === 'charge' ? 'charge' : 'direct',
    aideTir: b.aideTir !== false,
    conseilCapitaine: b.conseilCapitaine !== false,
    tutosResp: Array.isArray(b.tutosResp) ? b.tutosResp.filter((x): x is string => typeof x === 'string').slice(0, 12) : [],
  };
}

let courantes: PreferencesControle | null = null;
const abonnes = new Set<() => void>();

export function lirePreferencesControle(): PreferencesControle {
  if (courantes) return courantes;
  try {
    courantes = assainir(JSON.parse(localStorage.getItem(CLE) ?? 'null'));
  } catch {
    courantes = assainir(null);
  }
  return courantes;
}

/** Retient un changement ; le nouvel objet remplace l'ancien (c'est ce qui réveille les abonnés). */
export function ecrirePreferencesControle(partiel: Partial<PreferencesControle>): PreferencesControle {
  const suivantes = assainir({ ...lirePreferencesControle(), ...partiel });
  courantes = suivantes;
  try {
    localStorage.setItem(CLE, JSON.stringify(suivantes));
  } catch {
    // Stockage refusé (navigation privée) : le réglage ne vaut que pour cette session.
  }
  for (const a of abonnes) a();
  return suivantes;
}

export function reinitialiserTouchesDirectes(): PreferencesControle {
  return ecrirePreferencesControle({ touches: copierTouches() });
}

/** « Rejouer le tutoriel carrière joueur » : il se relancera à la prochaine entrée sur le terrain, et celui des responsabilités aussi. */
export function rejouerLeTutorielDirect(): PreferencesControle {
  return ecrirePreferencesControle({ tutorielVu: false, tutosResp: [] });
}

function abonner(cb: () => void): () => void {
  abonnes.add(cb);
  // Un réglage modifié dans un autre onglet : on relit.
  const surStockage = (ev: StorageEvent) => { if (ev.key === CLE) { courantes = null; cb(); } };
  window.addEventListener('storage', surStockage);
  return () => { abonnes.delete(cb); window.removeEventListener('storage', surStockage); };
}

export function usePreferencesControle(): PreferencesControle {
  return useSyncExternalStore(abonner, lirePreferencesControle, () => PREFERENCES_PAR_DEFAUT);
}
