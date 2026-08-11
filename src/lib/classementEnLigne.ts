// LE CLASSEMENT EN LIGNE, CÔTÉ NAVIGATEUR
//
// ⚠️ CE MODULE NE SAIT RIEN DU SCORE, et c'est le point. Il envoie les FAITS
// d'une carrière et lit ce que le serveur renvoie. Le score affiché dans le
// tableau mondial est celui que le serveur a RECALCULÉ — jamais celui que ce
// navigateur a calculé. Un client qui « envoie son score » est un classement
// mort en une semaine.
//
// ⚠️ SANS SERVEUR, LE JEU NE CASSE PAS. `VITE_CLASSEMENT_URL` absente = le
// classement reste local, et l'écran le dit. C'est la règle du projet : chaque
// brique en ligne est un bonus, jamais une dépendance.
//
// Déploiement de l'autre bout : `serveur/VERCEL.md`.

import type { FicheCarriere } from './classementMondial';

/**
 * Où joindre la fonction. Vide = pas de serveur configuré.
 * ⚠️ En déployant le jeu et l'API sur le MÊME projet Vercel, `/api/classement`
 * suffit : même origine, donc pas de CORS et rien à configurer. La variable
 * n'est là que pour pointer ailleurs (préproduction, API séparée).
 */
const URL_CONFIGUREE = (import.meta.env.VITE_CLASSEMENT_URL as string | undefined)?.trim();

export const URL_CLASSEMENT: string = URL_CONFIGUREE || '/api/classement';

/**
 * ⚠️ EN DÉVELOPPEMENT, ON N'APPELLE PAS — sauf si une URL est explicitement
 * configurée. `npm run dev` lance Vite, qui ne sait pas exécuter une fonction
 * serverless : `/api/classement` répond 500, et la console se remplit d'erreurs
 * rouges à chaque ouverture de l'écran. Le jeu fonctionnait (l'appel est
 * rattrapé), mais une console qui crie pour un comportement normal finit par
 * masquer les vraies erreurs. Pour tester l'API en local : `vercel dev`, ou
 * `VITE_CLASSEMENT_URL=https://ton-site.vercel.app/api/classement npm run dev`.
 */
const ACTIF = import.meta.env.PROD || !!URL_CONFIGUREE;

/**
 * Le classement en ligne est-il joignable depuis cette installation ?
 * ⚠️ L'ÉCRAN DOIT LE DIRE. Tant qu'il ne l'affichait pas, un tableau vide en
 * développement était impossible à distinguer d'un serveur en panne ou d'un
 * classement réellement vide — d'où « le classement fonctionne pas ».
 */
export const CLASSEMENT_EN_LIGNE = ACTIF;

/**
 * Une ligne du classement mondial, telle que la base la rend.
 *
 * ⚠️ TOUT EST OPTIONNEL SAUF LE PSEUDO ET LE SCORE, et ce n'est pas de la
 * prudence de principe : une ligne écrite avant la migration v2 du schéma
 * (`serveur/schema-vercel.sql`) n'a que ces deux colonnes remplies. L'écran doit
 * afficher la ligne quand même — un classement qui masque les anciens joueurs
 * parce qu'il leur manque un champ, c'est un classement qui a l'air cassé.
 */
export interface LigneMondiale {
  pseudo: string;
  score: number;
  maj_le?: string;
  nom?: string | null;
  poste?: string | null;
  nation?: string | null;
  age?: number | null;
  saisons?: number | null;
  note?: number | null;
  reputation?: number | null;
  matchs?: number | null;
  essais?: number | null;
  selections?: number | null;
  /** Ids de trophées (`data/trophees.ts`). */
  titres?: string[] | null;
  /** Clubs traversés, dans l'ordre. */
  clubs?: string[] | null;
}

/** La ligne porte-t-elle de quoi ouvrir une fiche ? */
export function ficheDisponible(l: LigneMondiale): boolean {
  return typeof l.saisons === 'number' && typeof l.note === 'number';
}

export interface ResultatEnvoi {
  ok: boolean;
  /** Le score RECALCULÉ par le serveur. Peut différer de celui du client. */
  score?: number;
  /** Message lisible en cas de refus. */
  erreur?: string;
  /** Le détail du refus, tel que `verifierFiche` l'a produit. */
  anomalies?: string[];
}

// Un serveur qui ne répond pas ne doit pas figer l'écran : au-delà, on abandonne.
const DELAI = 8000;

async function appeler(url: string, init?: RequestInit): Promise<Response> {
  const arret = new AbortController();
  const minuteur = setTimeout(() => arret.abort(), DELAI);
  try {
    return await fetch(url, { ...init, signal: arret.signal });
  } finally {
    clearTimeout(minuteur);
  }
}

/**
 * L'état de la lecture du tableau mondial.
 *
 * ⚠️ ON DISTINGUE LES TROIS CAS, et c'est tout l'intérêt. L'ancienne version
 * renvoyait `[]` pour « pas de serveur », « serveur en panne » ET « personne n'a
 * encore envoyé » : l'écran ne pouvait donc rien expliquer, et n'affichait rien
 * du tout. Un tableau absent se lit « le classement est cassé ».
 */
export type EtatMondial =
  | { etat: 'hors-ligne' }                       // aucun serveur sur cette installation
  | { etat: 'panne'; erreur: string }            // serveur injoignable ou en erreur
  | { etat: 'ok'; lignes: LigneMondiale[] };     // lu (la liste peut être vide)

/** Les meilleurs scores, avec l'état de la lecture. Ne lève jamais. */
export async function lireClassementMondial(): Promise<EtatMondial> {
  if (!ACTIF) return { etat: 'hors-ligne' };
  try {
    const r = await appeler(URL_CLASSEMENT);
    const data = (await r.json().catch(() => ({}))) as { classement?: LigneMondiale[]; erreur?: string };
    if (!r.ok) return { etat: 'panne', erreur: data.erreur ?? `Le serveur a répondu ${r.status}` };
    return { etat: 'ok', lignes: Array.isArray(data.classement) ? data.classement : [] };
  } catch (e) {
    // Pas de serveur, hors ligne, ou fonction pas encore déployée : le jeu
    // continue avec son classement local. On ne lève pas — on le DIT.
    const abandonne = e instanceof DOMException && e.name === 'AbortError';
    return {
      etat: 'panne',
      erreur: abandonne ? 'Le serveur n’a pas répondu à temps.' : 'Serveur injoignable.',
    };
  }
}

/**
 * Envoie une carrière. Le serveur vérifie, recalcule, et n'écrit que le score.
 *
 * ⚠️ ON ENVOIE LA FICHE TELLE QUELLE, score compris — non pas pour qu'il soit
 * cru, mais pour que le serveur puisse COMPARER : un écart entre le score
 * annoncé et le score recalculé est le signal le plus net qu'une sauvegarde a
 * été retouchée. C'est `verifierFiche` qui tranche, côté serveur.
 */
export async function envoyerAuClassement(fiche: FicheCarriere): Promise<ResultatEnvoi> {
  // ⚠️ Ici on TENTE quand même en développement quand l'utilisateur clique : un
  // bouton qui ne fait rien est pire qu'un message d'erreur. C'est la lecture
  // automatique à l'ouverture de l'écran qu'il ne faut pas déclencher pour rien.
  if (!ACTIF && !URL_CONFIGUREE && !import.meta.env.PROD) {
    return {
      ok: false,
      erreur: 'Aucun classement en ligne sur cette installation de développement. '
        + 'Déploie l’API (serveur/VERCEL.md), ou lance `vercel dev`.',
    };
  }
  try {
    const r = await appeler(URL_CLASSEMENT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(fiche),
    });
    const data = (await r.json().catch(() => ({}))) as ResultatEnvoi & { erreur?: string };
    if (!r.ok) {
      return {
        ok: false,
        erreur: data.erreur ?? `Le serveur a répondu ${r.status}`,
        anomalies: data.anomalies,
      };
    }
    return { ok: true, score: data.score };
  } catch (e) {
    const abandonne = e instanceof DOMException && e.name === 'AbortError';
    return {
      ok: false,
      erreur: abandonne
        ? 'Le serveur ne répond pas. Réessaie dans un moment.'
        : 'Aucun classement en ligne n’est branché sur cette installation.',
    };
  }
}
