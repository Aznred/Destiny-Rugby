// LA MÉMOIRE DU TUTORIEL — ce que le joueur a déjà vu, et s'il veut qu'on le lui montre (Correctif 18).
//
// Demande : « stocker des flags légers du genre `tutorial.league.intro = true`, `tutorial.player.controls = true` — pas
// besoin d'enregistrer énormément de données, juste savoir quelles étapes ont déjà été vues ».
//
// ═══ CE QUI A ÉTÉ TRANCHÉ ═══════════════════════════════════════════════════
//
// 1. ⚠️ DANS `localStorage`, PAS DANS LA SAUVEGARDE. Ce qu'on a vu suit la machine et la personne, pas la carrière
//    ouverte : un second profil, un « Nouvelle partie », une sauvegarde importée ne doivent pas remettre le tutoriel (c'est
//    le défaut que le tutoriel d'avant avait, et l'une des raisons de sa refonte). Même convention que
//    `lib/controleDirect/prefs.ts` : un module, un stockage, aucun cycle d'imports.
// 2. ⚠️ UN DRAPEAU PAR SECTION, PAS PAR ÉCRAN : `tutorial.league.pack` dit « l'ouverture du premier pack a été guidée ».
//    Une section se termine ou se passe : dans les deux cas elle est vue et ne se rejoue pas toute seule.
// 3. ⚠️ « DÉSACTIVER LES TUTORIELS » NE REND RIEN VU. Il suspend l'affichage ; les drapeaux gardent leur valeur, de sorte que
//    réactiver ne rejoue pas ce qu'on avait déjà vu avant de désactiver.
// 4. ⚠️ UNE ABSENCE DE STOCKAGE N'EST PAS UNE ERREUR : navigation privée, stockage refusé — le tutoriel vaut pour cette session.

import { useSyncExternalStore } from 'react';

const CLE = 'destiny-rugby:tutoriel';
export const PREFIXE_DRAPEAU = 'tutorial.';

interface EtatMemoire {
  v: 1;
  /** Les drapeaux vus, par nom complet (`tutorial.league.intro`). */
  vus: Record<string, true>;
  /** Le joueur ne veut plus d'aide : rien ne s'affiche tant que c'est vrai. */
  desactive: boolean;
}

const vide = (): EtatMemoire => ({ v: 1, vus: {}, desactive: false });

function assainir(brut: unknown): EtatMemoire {
  const e = vide();
  if (!brut || typeof brut !== 'object') return e;
  const b = brut as Record<string, unknown>;
  if (b.vus && typeof b.vus === 'object') {
    for (const [cle, valeur] of Object.entries(b.vus as Record<string, unknown>)) {
      if (valeur === true && cle.startsWith(PREFIXE_DRAPEAU) && cle.length < 80) e.vus[cle] = true;
    }
  }
  e.desactive = b.desactive === true;
  return e;
}

let courante: EtatMemoire | null = null;
/** Le cliché courant, un NOUVEL objet à chaque changement : c'est ce qui réveille `useSyncExternalStore`. */
let cliche: Readonly<EtatMemoire> = vide();
const abonnes = new Set<() => void>();

function lireStockage(): EtatMemoire {
  if (courante) return courante;
  try {
    courante = assainir(JSON.parse(localStorage.getItem(CLE) ?? 'null'));
  } catch {
    courante = vide();
  }
  cliche = { ...courante, vus: { ...courante.vus } };
  return courante;
}

function ecrire(suivante: EtatMemoire): void {
  courante = suivante;
  cliche = { ...suivante, vus: { ...suivante.vus } };
  try {
    localStorage.setItem(CLE, JSON.stringify(suivante));
  } catch {
    // Stockage refusé : le tutoriel vaut pour cette session seulement.
  }
  for (const a of abonnes) a();
}

/** `league.intro` → `tutorial.league.intro`. */
export const drapeau = (nom: string): string => (nom.startsWith(PREFIXE_DRAPEAU) ? nom : PREFIXE_DRAPEAU + nom);

export function dejaVu(nom: string): boolean {
  return !!lireStockage().vus[drapeau(nom)];
}

export function marquerVu(nom: string): void {
  const e = lireStockage();
  const cle = drapeau(nom);
  if (e.vus[cle]) return;
  ecrire({ ...e, vus: { ...e.vus, [cle]: true } });
}

/**
 * Remet des drapeaux à zéro : un seul (`league.pack`), ou tous ceux d'une famille (`league`, qui efface `tutorial.league.*`).
 * C'est « Rejouer ».
 */
export function oublier(famille?: string): void {
  const e = lireStockage();
  if (!famille) { ecrire({ ...e, vus: {} }); return; }
  const base = drapeau(famille);
  const restants: Record<string, true> = {};
  for (const cle of Object.keys(e.vus)) {
    if (cle !== base && !cle.startsWith(base + '.')) restants[cle] = true;
  }
  ecrire({ ...e, vus: restants });
}

export function tutorielsDesactives(): boolean {
  return lireStockage().desactive;
}

export function desactiverLesTutoriels(oui: boolean): void {
  const e = lireStockage();
  if (e.desactive === oui) return;
  ecrire({ ...e, desactive: oui });
}

/** Les drapeaux vus, pour les écrans de réglage et les bancs. */
export function drapeauxVus(): string[] {
  return Object.keys(lireStockage().vus).sort();
}

function abonner(cb: () => void): () => void {
  abonnes.add(cb);
  // Un réglage modifié dans un autre onglet : on relit.
  const surStockage = (ev: StorageEvent) => { if (ev.key === CLE) { courante = null; lireStockage(); cb(); } };
  window.addEventListener('storage', surStockage);
  return () => { abonnes.delete(cb); window.removeEventListener('storage', surStockage); };
}

export function usePreferencesTutoriel(): Readonly<EtatMemoire> {
  return useSyncExternalStore(abonner, () => { lireStockage(); return cliche; }, () => cliche);
}

/**
 * Le stockage du tutoriel n'existe pas encore : c'est la première fois que cette version tourne sur cette machine.
 * C'est le moment de reconnaître les anciens joueurs (voir `lib/tutoriel/guide.ts`, `reconnaitreLesAnciens`).
 */
export function premiereFois(): boolean {
  try { return localStorage.getItem(CLE) === null; } catch { return true; }
}

/** Pour les bancs : relit le stockage comme au premier chargement de la page. */
export function relireLeStockage(): void {
  courante = null;
  lireStockage();
}

/** Pour les bancs : repart d'un stockage vierge. */
export function reinitialiserLaMemoire(): void {
  courante = null;
  cliche = vide();
  try { localStorage.removeItem(CLE); } catch { /* rien à retirer */ }
  for (const a of abonnes) a();
}
