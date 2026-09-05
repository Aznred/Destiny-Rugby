import type { CommandeCarriere, VueCarriereEnLigne } from './ligue/typesCarriere';

export interface CompteCarriere { id: string; pseudo: string; identifiant?: string }
export interface SessionCarriere {
  compte: CompteCarriere;
  ligues: { id: string; nom: string; etat: string; clubNom: string; ovas: number }[];
}
export class ErreurCarriere extends Error {
  statut: number;
  constructor(message: string, statut: number) { super(message); this.statut = statut; }
}

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
  const donnees = await reponse.json().catch(() => null) as (T & { erreur?: string; message?: string }) | null;
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
export const chargerLigueCarriere = (id: string, signal?: AbortSignal) => requete<VueCarriereEnLigne>(undefined, id, signal);
export const identifierCarriere = (action: 'inscription' | 'connexion', identifiant: string, motDePasse: string, pseudo: string) =>
  requete<CompteCarriere>({ action, identifiant, motDePasse, pseudo });
export const deconnecterCarriere = () => requete<{ ok: boolean }>({ action: 'deconnexion' });
export interface IdentiteLigue { embleme?: string; logo?: string; tropheeId?: string; playoffs?: boolean; dotationOvas?: number }
export const creerLigueCarriere = (nom: string, clubNom: string, rythme: 1 | 2, maxClubs: number, identite: IdentiteLigue = {}) =>
  requete<VueCarriereEnLigne>({ action: 'creer', nom, clubNom, rythme, maxClubs, ...identite });
export const rejoindreLigueCarriere = (code: string, clubNom: string, embleme?: string) => requete<VueCarriereEnLigne>({ action: 'rejoindre', code, clubNom, embleme });
export const commanderCarriere = (ligue: string, commande: CommandeCarriere, requeteId: string) =>
  requete<VueCarriereEnLigne>({ action: 'commande', ligue, commande, requeteId });
