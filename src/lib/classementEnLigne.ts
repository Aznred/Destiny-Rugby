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
 * Une identité de ligne pour cette installation, tirée au hasard une fois.
 *
 * ⚠️ ELLE REMPLACE LE PSEUDO COMME CLÉ DE LIGNE. Deux joueurs qui choisissent
 * le même pseudo se partageaient une seule ligne : l'écriture étant gardée par
 * « le score ne recule pas », le second n'entrait jamais au classement. Voir
 * `FicheCarriere.cle`.
 *
 * ⚠️ `crypto.randomUUID()` n'existe qu'en contexte sécurisé (https ou
 * localhost) et pas dans tous les moteurs où tournent les scripts de mesure :
 * le repli n'est pas décoratif. Il n'a rien de cryptographique et n'a pas à
 * l'être — une collision entre deux installations n'ouvre aucune porte, elle
 * recrée simplement le bug qu'on corrige, avec une chance sur quelques
 * milliards.
 */
export function cleAleatoire(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const bout = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `${bout()}-${bout()}-${bout()}-${bout()}`;
}

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
  /**
   * L'identifiant PUBLIC de la ligne, attribué par la base.
   *
   * ⚠️ CE N'EST PAS `FicheCarriere.cle`, et il ne faut surtout pas confondre :
   * la clé est le droit d'ÉCRIRE sur cette ligne, elle ne sort jamais du
   * serveur. Cet identifiant-là ne sert qu'à deux choses, toutes deux
   * indispensables depuis que deux joueurs peuvent porter le même pseudo :
   * distinguer deux lignes dans le rendu React, et reconnaître la sienne.
   *
   * Absent d'une base qui n'a pas encore joué la migration v3.
   */
  id?: number | null;
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
  /**
   * Le rang mondial de CETTE ligne, calculé par la base.
   *
   * ⚠️ Renseigné UNIQUEMENT sur `moi` : pour les lignes d'une page, le rang se
   * déduit du numéro de page et de la position, et le faire calculer par la
   * base pour cinquante lignes serait une fenêtre de tri par ligne pour rien.
   * Pour la sienne, en revanche, il n'y a pas d'autre moyen : on peut être
   * 4 000ᵉ et n'apparaître sur aucune page consultée.
   */
  rang?: number | null;
}

/** La ligne porte-t-elle de quoi ouvrir une fiche ? */
export function ficheDisponible(l: LigneMondiale): boolean {
  return typeof l.saisons === 'number' && typeof l.note === 'number';
}

export interface ResultatEnvoi {
  ok: boolean;
  /** Le score RECALCULÉ par le serveur. Peut différer de celui du client. */
  score?: number;
  /**
   * L'identifiant public de la ligne écrite. Le jeu le retient pour savoir
   * laquelle, dans le tableau mondial, est la sienne — le pseudo ne suffit plus
   * à le dire, puisque deux joueurs peuvent le partager.
   */
  id?: number;
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
  | { etat: 'hors-ligne' }              // aucun serveur sur cette installation
  | { etat: 'panne'; erreur: string }   // serveur injoignable ou en erreur
  | {
      etat: 'ok';
      /** La page demandée (la liste peut être vide). */
      lignes: LigneMondiale[];
      /** Le nombre TOTAL de carrières classées, toutes pages confondues. */
      total: number;
      page: number;
      parPage: number;
      /**
       * Ma ligne et son rang mondial, où qu'elle soit dans le classement.
       *
       * ⚠️ C'EST LA RÉPONSE À « QU'ON PUISSE VOIR NOTRE CLASSEMENT EN BAS ».
       * Elle ne dépend pas de la page affichée : on est 4 000ᵉ et on le voit
       * quand même, sans feuilleter quarante pages à sa propre recherche.
       */
      moi?: LigneMondiale | null;
    };

/**
 * Une page du classement, avec l'état de la lecture. Ne lève jamais.
 *
 * @param page 1 pour la tête du classement.
 * @param monId l'identifiant public de MA ligne, pour que le serveur renvoie
 *   aussi mon rang. Facultatif : sans lui, `moi` est simplement absent.
 */
export async function lireClassementMondial(page = 1, monId?: number | null): Promise<EtatMondial> {
  if (!ACTIF) return { etat: 'hors-ligne' };
  try {
    // ⚠️ ON COMPOSE LA CHAÎNE, ON NE PASSE PAS PAR new URL(). URL_CLASSEMENT
    // peut être RELATIVE (/api/classement, le cas normal) ou ABSOLUE (une
    // préproduction, ou le faux serveur des essais). Reconstruire une URL puis
    // n'en garder que le chemin envoyait la requête sur la mauvaise origine :
    // mesuré en essai, le classement revenait vide alors que le serveur avait
    // les données.
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (monId != null && Number.isFinite(monId)) params.set('id', String(monId));
    const q = params.toString();
    const r = await appeler(q ? URL_CLASSEMENT + '?' + q : URL_CLASSEMENT);
    const data = (await r.json().catch(() => ({}))) as {
      classement?: LigneMondiale[]; total?: number; page?: number; parPage?: number;
      moi?: LigneMondiale | null; erreur?: string;
    };
    if (!r.ok) return { etat: 'panne', erreur: data.erreur ?? `Le serveur a répondu ${r.status}` };
    const lignes = Array.isArray(data.classement) ? data.classement : [];
    return {
      etat: 'ok',
      lignes,
      // ⚠️ UN SERVEUR D'AVANT LA PAGINATION NE RENVOIE NI TOTAL NI PAGE, et il
      // ne doit pas casser l'écran pour autant : on retombe sur ce qu'on a.
      total: typeof data.total === 'number' ? data.total : lignes.length,
      page: typeof data.page === 'number' ? data.page : page,
      parPage: typeof data.parPage === 'number' && data.parPage > 0 ? data.parPage : Math.max(1, lignes.length),
      moi: data.moi ?? null,
    };
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
    return { ok: true, score: data.score, id: data.id };
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
