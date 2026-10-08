import type { AdministrationCarriere, CommandeCarriere, VueCarriereEnLigne, PageCollection, StatistiquesGlobalesCarriere } from './ligue/typesCarriere.js';
import type { ReponseDelta } from './ligue/deltaVue';
import type { VueMarchePartage } from './ligue/marchePartage';
import type { EtatBoutiqueCompte, ModificationsBoutiqueCompte } from './boutiqueCompte.js';
import type { DeltaEchangeSolo, LotCartesSolo, PageOffresSolo } from './echangesSolo.js';

export interface CompteCarriere { id: string; pseudo: string; administrateur?: boolean; featureFlags?: { womensRugby: boolean } }
export interface SessionCarriere {
  compte: CompteCarriere;
  ligues: {
    playerPool?: 'men' | 'women' | 'mixed';
    id: string; nom: string; etat: string; clubNom: string; ovas: number;
    clubEmbleme?: string; logo?: string; laboratoire?: boolean; createur?: boolean;
    publique?: { cycle: number; division: number };
  }[];
}
export interface MiseAJourDirectCarriere {
  id: string; version: number; rencontre: VueCarriereEnLigne['rencontres'][number];
  reperes?: string; gardes?: string[]; filSuite?: unknown[]; presence?: boolean;
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
    const contenu = corps ? JSON.stringify(corps) : undefined;
    const garderEnFermant = contenu !== undefined && contenu.length < 60_000
      && (corps as { action?: unknown }).action === 'sauvegarderBoutique';
    const action = (corps as { action?: string } | undefined)?.action;
    reponse = await fetch(`/api/carriere${chemin ?? (ligue ? `?ligue=${encodeURIComponent(ligue)}` : action ? `?action=${encodeURIComponent(action)}` : '')}`, {
      method: corps ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: corps ? { 'Content-Type': 'application/json' } : undefined,
      body: contenu,
      keepalive: garderEnFermant,
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

function synchroniserStockageCompte(compte?: CompteCarriere | null) {
  if (typeof window === 'undefined') return;
  try {
    if (compte) {
      if (compte.pseudo) localStorage.setItem('destiny-compte-pseudo', compte.pseudo);
      if (compte.administrateur || compte.pseudo?.trim().toLowerCase() === 'kiri') {
        localStorage.setItem('destiny-compte-kiri', '1');
      }
    } else {
      localStorage.removeItem('destiny-compte-kiri');
      localStorage.removeItem('destiny-compte-pseudo');
    }
  } catch {}
}

export const chargerSessionCarriere = async (signal?: AbortSignal) => {
  const session = await requete<SessionCarriere>(undefined, undefined, signal);
  if (session?.compte) synchroniserStockageCompte(session.compte);
  return session;
};
export const chargerStatistiquesGlobales = (signal?: AbortSignal) =>
  requete<StatistiquesGlobalesCarriere>(undefined, undefined, signal, '?statistiques=globales');
export const chargerAdministrationCarriere = (signal?: AbortSignal) =>
  requete<AdministrationCarriere>(undefined, undefined, signal, '?administration=1');
/**
 * ⚠️ ON ANNONCE LA VERSION QU'ON DÉTIENT. Deux octets dans l'URL, et le
 * serveur répond 304 sans lire les 300 à 400 Ko de l'état quand rien n'a
 * changé. Sans `version`, on reçoit la vue complète comme avant — c'est le
 * cas du tout premier chargement, qui n'a rien à comparer.
 */
export const chargerLigueCarriere = (id: string, signal?: AbortSignal, version?: number, publique?: VueCarriereEnLigne['publique']) =>
  requete<VueCarriereEnLigne>(undefined, undefined, signal,
    // `leger=1` : les matchs terminés arrivent en résumé ; leur détail se demande à l'ouverture (`chargerDirectCarriere`).
    `?ligue=${encodeURIComponent(id)}&leger=1${version ? `&v=${version}` : ''}${publique ? `&cycle=${publique.cycle}&division=${publique.division}&derniere=${publique.derniereDivision === true ? 1 : 0}` : ''}`);
/**
 * L'écran annonce le dernier pas de la chronologie qu'il connaît : le serveur
 * ne renvoie alors que la suite, à la place du relevé du terrain.
 */
export const chargerDirectCarriere = (id: string, matchId: string, signal?: AbortSignal, version?: number,
  /** La chronologie : « dernier pas . somme de contrôle » (`''` : rien encore). Le serveur ne renvoie que la suite. */
  chrono?: string,
  /** Repères des parties lentes déjà tenues (`''` : aucune) ; le serveur ne renvoie que celles qui ont changé. */
  reperes?: string) =>
  requete<MiseAJourDirectCarriere>(undefined, undefined, signal,
    `?ligue=${encodeURIComponent(id)}&direct=${encodeURIComponent(matchId)}${version ? `&v=${version}` : ''}${chrono === undefined ? '' : `&tl=${chrono}`}${reperes === undefined ? '' : `&r=${encodeURIComponent(reperes)}`}`);
const notifierCompte = (type: 'connecte' | 'deconnecte') => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(`destiny-compte-${type}`));
};
export const identifierCarriere = async (action: 'inscription' | 'connexion', identifiant: string, motDePasse: string, pseudo: string, confirmationMotDePasse = '') => {
  const compte = await requete<CompteCarriere>({ action, identifiant, motDePasse, pseudo, confirmationMotDePasse });
  synchroniserStockageCompte(compte);
  notifierCompte('connecte');
  return compte;
};
export const configurationCarriere = () => requete<{ googleClientId?: string }>(undefined, undefined, undefined, '?configuration=1');
export const identifierGoogleCarriere = async (credential: string) => {
  const compte = await requete<CompteCarriere>({ action: 'google', credential });
  synchroniserStockageCompte(compte);
  notifierCompte('connecte');
  return compte;
};
export const deconnecterCarriere = async () => {
  const resultat = await requete<{ ok: boolean }>({ action: 'deconnexion' });
  synchroniserStockageCompte(null);
  notifierCompte('deconnecte');
  return resultat;
};
export const chargerBoutiqueCompte = (signal?: AbortSignal) =>
  requete<{ boutique: EtatBoutiqueCompte | null }>(undefined, undefined, signal, '?boutique=1');
export const chargerPacksPrivesSolo = (signal?: AbortSignal) =>
  requete<{ packs: import('./ligue/typesCarriere').PackCarriere[]; packsDeTest?: import('./packsInternes').PackInterneBoutique[] }>(undefined, undefined, signal, '?packsPrivesSolo=1');
/** `ordreImpose` : un pack de test rend ses cartes dans l'ordre de révélation voulu, pas triées par rareté. */
export const ouvrirPackPriveSolo = (pack: string, signal?: AbortSignal) =>
  requete<{ boutique: EtatBoutiqueCompte; cartes: import('./ligue/catalogueCarriere').SourceCarte[]; ordreImpose?: boolean }>({ action: 'ouvrirPackPriveSolo', pack }, undefined, signal);

// ── Packs de test (Correctif 33) — le serveur répond 403 à tout compte qui n'a pas la permission. ──
export type PackInterneDetaille = import('./packsInternes').PackInterne & {
  detail: (import('./packsInternes').CarteCandidate | { sourceId: string; manquante: true })[];
};
export interface VuePacksInternes {
  packs: PackInterneDetaille[]; journal: import('./packsInternes').LigneJournalPackInterne[];
  limites: { cartes: number; packs: number }; types: string[];
}
export const chargerPacksInternes = (signal?: AbortSignal) =>
  requete<VuePacksInternes>(undefined, undefined, signal, '?packsInternes=1');
export const rechercherCartesPackInterne = (filtre: { q?: string; club?: string; poste?: string; rarete?: string; type?: string }, signal?: AbortSignal) =>
  requete<{ cartes: import('./packsInternes').CarteCandidate[]; total: number }>(undefined, undefined, signal,
    `?packsInternes=1&recherche=1&${new URLSearchParams(Object.entries(filtre).filter(([, v]) => v) as [string, string][]).toString()}`);
export const creerPackInterne = (pack: import('./packsInternes').DefinitionPackInterne) =>
  requete<{ pack: PackInterneDetaille }>({ action: 'packInterne', operation: 'creer', pack });
export const supprimerPackInterne = (id: string) =>
  requete<{ ok: boolean }>({ action: 'packInterne', operation: 'supprimer', id });
export const sauvegarderBoutiqueCompte = (boutique: EtatBoutiqueCompte) =>
  requete<{ boutique: EtatBoutiqueCompte | null }>({ action: 'sauvegarderBoutique', boutique, compact: true });
export const modifierBoutiqueCompte = (modifications: ModificationsBoutiqueCompte) =>
  requete<{ boutique: EtatBoutiqueCompte | null }>({ action: 'sauvegarderBoutique', modifications, compact: true },
    undefined, undefined, '?action=sauvegarderBoutique&format=delta');
const lecturesEchanges = new Map<number, Promise<PageOffresSolo>>();
/** `revision` : celle de ma collection — le serveur ne la renvoie que si la sienne est plus récente (échange conclu). */
export const listerEchangesSolo = (offset = 0, revision?: number): Promise<PageOffresSolo> => {
  const existante = lecturesEchanges.get(offset);
  if (existante) return existante;
  const lecture = requete<PageOffresSolo>(undefined, undefined, undefined,
    `?echangesSolo=1&offset=${offset}${revision == null ? '' : `&rev=${revision}`}`)
    .finally(() => { if (lecturesEchanges.get(offset) === lecture) lecturesEchanges.delete(offset); });
  lecturesEchanges.set(offset, lecture);
  return lecture;
};
/** La réponse d'une action d'échange : le coffre à jour et ce qui vient de changer dans la bourse. */
export interface ReponseEchangeSolo { boutique: EtatBoutiqueCompte; delta?: DeltaEchangeSolo }
export const creerOffreSolo = (offertes: LotCartesSolo, souhaitees: LotCartesSolo) =>
  requete<ReponseEchangeSolo>({ action: 'creerOffreSolo', offertes, souhaitees });
export const proposerOffreSolo = (offre: string, cartes: LotCartesSolo) =>
  requete<ReponseEchangeSolo>({ action: 'proposerOffreSolo', offre, cartes });
export const accepterOffreSolo = (offre: string, proposition?: string) =>
  requete<ReponseEchangeSolo>({ action: 'accepterOffreSolo', offre, proposition });
export const refuserOffreSolo = (offre: string, proposition: string) =>
  requete<ReponseEchangeSolo>({ action: 'refuserOffreSolo', offre, proposition });
export const annulerOffreSolo = (offre: string) =>
  requete<ReponseEchangeSolo>({ action: 'annulerOffreSolo', offre });
export const retirerPropositionSolo = (offre: string) =>
  requete<ReponseEchangeSolo>({ action: 'retirerPropositionSolo', offre });
export const supprimerLigueCarriere = (ligue: string) => requete<{ ok: boolean }>({ action: 'supprimerLigue', ligue });
export interface IdentiteLigue { playerPool?: 'men' | 'women'; embleme?: string; logo?: string; tropheeId?: string; playoffs?: boolean; dotationOvas?: number; packsActifs?: string[]; packsGratuitsParJour?: number; doublonsAutorises?: boolean; cartesSpeciales?: boolean }
export const creerLigueCarriere = (nom: string, clubNom: string, rythme: number, maxClubs: number, identite: IdentiteLigue = {}) =>
  requete<VueCarriereEnLigne>({ action: 'creer', nom, clubNom, rythme, maxClubs, ...identite });
export const rejoindreLigueCarriere = (code: string, clubNom: string, embleme?: string) => requete<VueCarriereEnLigne>({ action: 'rejoindre', code, clubNom, embleme });
export const rejoindreDivisionPublique = (clubNom: string, embleme?: string) =>
  requete<VueCarriereEnLigne>({ action: 'rejoindreDivisionPublique', clubNom, embleme });
/**
 * Une commande. `version` : celle de la vue que l'écran tient — le serveur peut alors ne rendre que ce qui a changé
 * (`ReponseDelta`, à appliquer avec `appliquerDeltaVue`) au lieu de la ligue entière.
 */
export const commanderCarriere = (ligue: string, commande: CommandeCarriere, requeteId: string, version?: number) =>
  requete<VueCarriereEnLigne | ReponseDelta>({ action: 'commande', ligue, commande, requeteId, leger: true, ...(version ? { v: version, delta: true } : {}) });
/** Battement léger : le serveur répond seulement `{ok:true}` et ne renvoie pas la ligue. */
export const signalerPresenceCarriere = (ligue: string, matchId: string) =>
  requete<{ ok: boolean }>({ action: 'presence', ligue, matchId });

/**
 * Le marché commun des divisions publiques, vu de ma division. `revision` : celle que l'écran tient déjà — le serveur
 * répond alors « inchangé » en vingt octets. `null` : pas de marché commun ici (ligue privée, serveur sans sa table).
 */
export async function chargerMarchePartage(ligue: string, revision?: number, signal?: AbortSignal): Promise<VueMarchePartage | null | typeof INCHANGE> {
  const r = await requete<VueMarchePartage | { indisponible: true }>(undefined, undefined, signal,
    `?ligue=${encodeURIComponent(ligue)}&marche=1${revision === undefined ? '' : `&mv=${revision}`}`);
  if ((r as unknown) === INCHANGE) return INCHANGE;
  return 'indisponible' in r ? null : r;
}

export function chargerCollectionCarriere(ligue: string, filtres: Record<string, string>, signal?: AbortSignal) {
  const params = new URLSearchParams({ ...filtres, ligue, collection: '1' });
  return requete<PageCollection>(undefined, undefined, signal, `?${params}`);
}

