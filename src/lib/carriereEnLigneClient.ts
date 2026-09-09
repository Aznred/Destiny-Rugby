import type { CommandeCarriere, VueCarriereEnLigne, PageCollection, StatistiquesGlobalesCarriere } from './ligue/typesCarriere.js';

export interface CompteCarriere { id: string; pseudo: string; administrateur?: boolean }
export interface SessionCarriere {
  compte: CompteCarriere;
  ligues: {
    id: string; nom: string; etat: string; clubNom: string; ovas: number;
    clubEmbleme?: string; logo?: string;
  }[];
}
export class ErreurCarriere extends Error {
  statut: number;
  constructor(message: string, statut: number) { super(message); this.statut = statut; }
}

/**
 * Le jeton que rend une lecture conditionnelle quand rien n'a bougé. On le
 * reconnaît par identité (`===`), jamais par un champ : aucune vue de ligue
 * ne peut lui ressembler par accident.
 */
export const INCHANGE = Symbol('vue inchangée') as unknown as never;

/** Les cookies de session restent HttpOnly. Le client ne conserve aucun portefeuille. */
async function requete<T>(corps?: unknown, ligue?: string, signal?: AbortSignal, chemin?: string): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(`/api/carriere${chemin ?? (ligue ? `?ligue=${encodeURIComponent(ligue)}` : '')}`, {
      method: corps ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: corps ? { 'Content-Type': 'application/json' } : undefined,
      body: corps ? JSON.stringify(corps) : undefined,
      signal: signal ?? AbortSignal.timeout(25000),
    });
  } catch (erreur) {
    if (signal?.aborted) throw erreur;
    throw new ErreurCarriere('Le serveur de carrière en ligne est momentanément inaccessible. Vérifie ta connexion puis réessaie.', 0);
  }
  const donnees = await reponse.json().catch(() => null) as (T & { erreur?: string; message?: string; inchange?: boolean }) | null;
  /**
   * ⚠️ « INCHANGÉ » N'EST PAS UNE ERREUR, C'EST UNE BONNE NOUVELLE : la vue
   * qu'on a déjà est la bonne. Le serveur répond ça quand la version annoncée
   * est encore à jour et qu'aucune échéance n'est passée — il n'a alors PAS lu
   * l'état de la ligue, et c'est tout l'intérêt. Vingt octets au lieu de
   * quatre cent mille.
   */
  if (donnees?.inchange === true) return INCHANGE as T;
  if (!reponse.ok || !donnees) {
    throw new ErreurCarriere(donnees?.erreur ?? donnees?.message ??
      (reponse.status === 401 ? 'Connecte-toi pour retrouver tes ligues.' :
        'Le service de carrière en ligne est indisponible sur ce serveur. Réessaie dans un instant.'), reponse.status);
  }
  return donnees;
}
export interface GroupeEmblemes { groupe: string; pays: string; emblemes: { nom: string; logo: string }[] }
export interface LogoCompetition { id: string; nom: string; logo: string }
export interface TropheeLigue { id: string; nom: string; couleur: string; desc: string; modele: string }
export interface CataloguesIdentite { groupes: GroupeEmblemes[]; competitions: LogoCompetition[]; trophees: TropheeLigue[] }
/**
 * ⚠️ CHARGÉE UNE SEULE FOIS, ET JAMAIS AVEC LA VUE. 1 353 écussons, c'est
 * 80 Ko : dans la vue de la ligue, ils repartiraient à chaque sondage.
 */
let emblemesEnCache: Promise<CataloguesIdentite> | undefined;
export const chargerEmblemesCarriere = () =>
  (emblemesEnCache ??= requete<CataloguesIdentite>(undefined, undefined, undefined, '?emblemes=1')
    .catch((e) => { emblemesEnCache = undefined; throw e; }));

export const chargerSessionCarriere = (signal?: AbortSignal) => requete<SessionCarriere>(undefined, undefined, signal);
export const chargerStatistiquesGlobales = (signal?: AbortSignal) =>
  requete<StatistiquesGlobalesCarriere>(undefined, undefined, signal, '?statistiques=globales');
/**
 * ⚠️ ON ANNONCE LA VERSION QU'ON DÉTIENT. Deux octets dans l'URL, et le
 * serveur répond 304 sans lire les 300 à 400 Ko de l'état quand rien n'a
 * changé. Sans `version`, on reçoit la vue complète comme avant — c'est le
 * cas du tout premier chargement, qui n'a rien à comparer.
 */
export const chargerLigueCarriere = (id: string, signal?: AbortSignal, version?: number) =>
  requete<VueCarriereEnLigne>(undefined, undefined, signal,
    `?ligue=${encodeURIComponent(id)}${version ? `&v=${version}` : ''}`);
export const identifierCarriere = (action: 'inscription' | 'connexion', identifiant: string, motDePasse: string, pseudo: string, confirmationMotDePasse = '') =>
  requete<CompteCarriere>({ action, identifiant, motDePasse, pseudo, confirmationMotDePasse });
export const deconnecterCarriere = () => requete<{ ok: boolean }>({ action: 'deconnexion' });
export interface IdentiteLigue { embleme?: string; logo?: string; tropheeId?: string; playoffs?: boolean; dotationOvas?: number }
export const creerLigueCarriere = (nom: string, clubNom: string, rythme: number, maxClubs: number, identite: IdentiteLigue = {}) =>
  requete<VueCarriereEnLigne>({ action: 'creer', nom, clubNom, rythme, maxClubs, ...identite });
export const rejoindreLigueCarriere = (code: string, clubNom: string, embleme?: string) => requete<VueCarriereEnLigne>({ action: 'rejoindre', code, clubNom, embleme });
export const commanderCarriere = (ligue: string, commande: CommandeCarriere, requeteId: string) =>
  requete<VueCarriereEnLigne>({ action: 'commande', ligue, commande, requeteId });

export function chargerCollectionCarriere(ligue: string, filtres: Record<string, string>, signal?: AbortSignal) {
  const params = new URLSearchParams({ ...filtres, ligue, collection: '1' });
  return requete<PageCollection>(undefined, undefined, signal, `?${params}`);
}
