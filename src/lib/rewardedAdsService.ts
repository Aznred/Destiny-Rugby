import type { ConfigPublicites, ContextePub, ProgresCosmetiquePub, RecompensePub, VuePublicites } from './publicitesRecompensees';
import type { PackCarriere } from './ligue/typesCarriere';

type StatutAppLixir = { type: string };
interface OptionsAppLixir {
  apiKey: string; injectionElementId: string; userId: string; customData: { context: ContextePub };
  adStatusCallbackFn: (statut: StatutAppLixir) => void;
  adErrorCallbackFn: (erreur: { getError?: () => { data?: { errorCode?: number } } }) => void;
}
declare global { interface Window { initializeAndOpenPlayer?: (options: OptionsAppLixir) => void | Promise<unknown> } }
export interface SessionNavigateurPub extends RecompensePub { apiKey: string; mode: 'TEST' | 'LIVE' }
export async function appelerPublicites<T>(corps?: unknown, ligue?: string, signal?: AbortSignal): Promise<T> {
  const controle = new AbortController();
  const annuler = () => controle.abort(signal?.reason);
  if (signal?.aborted) annuler(); else signal?.addEventListener('abort', annuler, { once: true });
  const delai = setTimeout(() => controle.abort(new Error('La connexion a pris trop de temps. Votre récompense reste récupérable.')), 15000);
  try {
    const r = await fetch(`/api/carriere?publicites=1${ligue ? `&ligue=${encodeURIComponent(ligue)}` : ''}`, {
      method: corps ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal: controle.signal,
      headers: corps ? { 'Content-Type': 'application/json' } : undefined,
      body: corps ? JSON.stringify({ action: 'publicites', ...corps as object }) : undefined,
    });
    const d = await r.json();
    // Toute écriture périme les vues gardées : la prochaine lecture repart du serveur.
    if (corps) vues.clear();
    if (!r.ok) throw new Error(r.status === 401 ? 'Connectez-vous à votre compte pour recevoir la récompense.' : d.erreur ?? 'Publicité indisponible.');
    return d as T;
  } finally { clearTimeout(delai); signal?.removeEventListener('abort', annuler); }
}

/**
 * LA VUE EST PARTAGÉE ENTRE LES OFFRES D'UN MÊME ÉCRAN (Correctif 42). La Boutique affiche la carte des Ovas, celle du
 * pack Premium et un bouton par cosmétique : chacune relisait la vue pour elle-même — six requêtes identiques à
 * l'ouverture de l'écran. Elles partagent maintenant la même lecture pendant quatre secondes, et une écriture la périme.
 */
const vues = new Map<string, { le: number; promesse: Promise<VuePublicites> }>();
const DUREE_VUE = 4000;
/** Une offre vient de changer quelque chose : les autres offres de l'écran relisent (une seule requête pour toutes). */
export function publicitesModifiees(): void {
  vues.clear();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('destiny:publicites'));
}

/**
 * LA PUBLICITÉ OUVERTE, POUR LA FERMER SI LA PAGE PART (15 octobre 2026). Une session préparée ou une vidéo en cours qu'on
 * quitte en fermant l'onglet, en changeant d'application ou en rechargeant ne disait rien au serveur : elle restait « en
 * cours » un quart d'heure. Au départ de la page, un dernier envoi la ferme (`sendBeacon` : il part même page fermée).
 * Une vidéo terminée n'est jamais fermée ainsi — son reçu peut encore arriver.
 */
let ouverte: string | null = null, ecoute = false;
export function sessionOuverte(id: string | null): void {
  ouverte = id;
  if (ecoute || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  ecoute = true;
  window.addEventListener('pagehide', () => {
    if (!ouverte) return;
    const corps = JSON.stringify({ action: 'publicites', operation: 'evenement', rewardSessionId: ouverte, evenement: 'CLOSED' });
    ouverte = null;
    try {
      if (!navigator.sendBeacon?.('/api/carriere?publicites=1', new Blob([corps], { type: 'application/json' })))
        void fetch('/api/carriere?publicites=1', { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: corps }).catch(() => {});
    } catch { /* la session expirera d'elle-même, et la publicité suivante la remplace */ }
  });
}

/** Un SDK partagé, aucun téléchargement de vidéo avant le geste explicite. */
class ServicePublicitesRecompensees {
  private chargement?: Promise<void>;
  private config?: ConfigPublicites;
  private terminer?: () => void;
  private sessionActive?: string;
  initialize(config: ConfigPublicites): Promise<void> {
    this.config = config;
    if (!config.enabled) return Promise.reject(new Error('Publicités désactivées.'));
    if (window.initializeAndOpenPlayer) return Promise.resolve();
    this.chargement ??= new Promise<void>((resolve, reject) => {
      const src = 'https://cdn.applixir.com/applixir.app.v6.1.0.js';
      const existant = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
      const script = existant ?? document.createElement('script');
      const nettoyer = () => { clearTimeout(delai); script.removeEventListener('load', charge); script.removeEventListener('error', echoue); };
      const charge = () => { nettoyer(); if (window.initializeAndOpenPlayer) resolve(); else { script.remove(); reject(new Error('Le lecteur publicitaire est indisponible.')); } };
      const echoue = () => { nettoyer(); script.remove(); reject(new Error('La publicité est bloquée ou momentanément indisponible.')); };
      const delai = setTimeout(echoue,15000);
      script.addEventListener('load',charge,{once:true}); script.addEventListener('error',echoue,{once:true});
      if (!existant) { script.src = src; script.async = true; document.head.appendChild(script); }
    }).catch(e => { this.chargement = undefined; throw e; });
    return this.chargement;
  }
  isAvailable(): boolean { return Boolean(this.config?.enabled && window.initializeAndOpenPlayer && !this.terminer); }
  cancel(id?: string): void { if (!id || id === this.sessionActive) this.terminer?.(); }
  showRewardedAd(contexte: ContextePub, session: SessionNavigateurPub): Promise<boolean> {
    if (!this.isAvailable() || session.contexte !== contexte) return Promise.reject(new Error('Publicité indisponible.'));
    const conteneur = document.getElementById('applixir-ad-container');
    if (!conteneur) return Promise.reject(new Error('Lecteur indisponible.'));
    const audios = [...document.querySelectorAll<HTMLMediaElement>('audio, video')].filter(a => !conteneur.contains(a) && !a.paused);
    for (const a of audios) a.pause();
    return new Promise<boolean>((resolve) => {
      let finie = false, complete = false, fermeture: ReturnType<typeof setTimeout> | undefined;
      const signaler = (evenement: string) => appelerPublicites({operation:'evenement',rewardSessionId:session.rewardSessionId,evenement}).catch(() => {});
      const finir = (ok: boolean, evenement?: string) => {
        if (finie) return; finie = true; clearTimeout(delai); clearTimeout(fermeture);
        // ⚠️ LA FIN EST ENREGISTRÉE AVANT QUE L'ÉCRAN NE RELISE SES COMPTEURS. Rendue tout de suite, la relecture partait avant
        // la fermeture : le serveur voyait encore la pub « en cours », l'écran affichait « Revenez demain » et n'y revenait plus.
        const envoi: Promise<unknown> = evenement ? signaler(evenement) : Promise.resolve();
        sessionOuverte(complete ? null : session.rewardSessionId);
        // Un lecteur tiers détaché ou un média en erreur ne doit jamais empêcher
        // la résolution de la promesse et laisser toute l'offre « occupée ».
        for (const media of conteneur.querySelectorAll<HTMLMediaElement>('video,audio')) {
          try { media.pause(); media.removeAttribute('src'); media.load(); } catch { /* nettoyage facultatif */ }
        }
        try { conteneur.replaceChildren(); } catch { /* le portail peut déjà être démonté */ }
        for (const a of audios) { try { if (a.isConnected) void a.play().catch(() => {}); } catch { /* son facultatif */ } }
        void Promise.race([envoi, new Promise(fin => setTimeout(fin, 4000))]).then(() => {
          // Le portail reste présent jusqu'à cette résolution. Un second lecteur
          // ouvert plus tôt retrouverait l'ancien conteneur portant le même id.
          this.terminer = undefined; this.sessionActive = undefined;
          sessionOuverte(null); resolve(ok);
        });
      };
      // Les callbacks locaux précèdent le traitement interne du SDK (reçu et télémétrie).
      // Ne pas retirer son lecteur au milieu de cette pile d'appels.
      const finirApresSdk = (evenement?: string) => queueMicrotask(() => finir(complete,complete ? undefined : evenement));
      const attendreFinSdk = () => { fermeture ??= setTimeout(() => finir(complete,complete ? undefined : 'NO_FILL'),5000); };
      this.terminer = () => finir(complete,complete ? undefined : 'CLOSED');
      this.sessionActive = session.rewardSessionId;
      sessionOuverte(session.rewardSessionId);
      const delai = setTimeout(() => finir(complete,complete ? undefined : 'FAILED'),180000);
      try {
        // Appel synchrone dans le clic « Lancer la vidéo » : conserve le geste Safari/iOS.
        const ouverture = window.initializeAndOpenPlayer!({ apiKey: session.apiKey, injectionElementId: conteneur.id,
          userId: session.rewardSessionId, customData: { context: contexte },
          adStatusCallbackFn: s => {
            if (finie) return;
            // IMA émet « start » ; certains adaptateurs exposent « started ».
            if (s.type === 'start' || s.type === 'started') void signaler('STARTED');
            else if (s.type === 'complete') {
              if (!complete) void signaler('WATCHED'); // Reprise durable, jamais une preuve de récompense.
              complete = true; sessionOuverte(null);
              attendreFinSdk();
            } else if (s.type === 'allAdsCompleted' || s.type === 'skipped') attendreFinSdk();
            else if (['thankYouModalClosed','adSkippedNoReward'].includes(s.type)) finirApresSdk(s.type === 'adSkippedNoReward' ? 'CLOSED' : 'NO_FILL');
            else if (['manuallyEnded','consentDeclined'].includes(s.type)) finirApresSdk('CLOSED');
            else if (s.type === 'noAd') finirApresSdk('NO_FILL');
          },
          adErrorCallbackFn: e => {
            let code: number | undefined;
            try { code = e.getError?.().data?.errorCode; } catch { /* aucune confiance dans l'erreur SDK */ }
            finirApresSdk(code === 303 ? 'NO_FILL' : 'FAILED');
          },
        });
        // Le SDK v6 ouvre le lecteur de façon asynchrone : un try/catch seul ne suffit pas.
        if (ouverture) void ouverture.catch(() => finirApresSdk('FAILED'));
      } catch { finir(false,'FAILED'); }
    });
  }
}
export const RewardedAdsService = new ServicePublicitesRecompensees();
export function chargerPublicites(ligue?: string): Promise<VuePublicites> {
  const cle = ligue ?? '', connue = vues.get(cle);
  if (connue && Date.now() - connue.le < DUREE_VUE) return connue.promesse;
  const promesse = appelerPublicites<VuePublicites>(undefined, ligue).catch((e) => { if (vues.get(cle)?.promesse === promesse) vues.delete(cle); throw e; });
  vues.set(cle, { le: Date.now(), promesse });
  return promesse;
}
/** Où en est le cosmétique après la publicité qu'on vient de réclamer : c'est le serveur qui a compté. */
export type CosmetiquePubRecu = { id: string } & ProgresCosmetiquePub;
/**
 * Le pack Premium gagné, rendu UNE fois par le serveur à l'instant où il le marque ouvert. `null` : déjà ouvert
 * (double clic, autre onglet) — il n'y a rien à tirer une seconde fois.
 */
export async function ouvrirPackPremium(id: string): Promise<PackCarriere | null> {
  const d = await appelerPublicites<{ statut: string; pack?: PackCarriere }>({ operation: 'ouvrirPremium', rewardSessionId: id });
  return d.statut === 'OPENED' && d.pack ? d.pack : null;
}
export async function claimRewardedAdReward(id: string, signal?: AbortSignal): Promise<(RecompensePub & { cosmetique?: CosmetiquePubRecu }) | null> {
  // Reconciliation bornée, uniquement après une vidéo terminée ou une reprise manuelle.
  for (const delai of [0,1000,2000,4000,6000]) {
    if (signal?.aborted) return null;
    if (delai) await new Promise<void>(resolve => {
      const finir = () => { clearTimeout(timer); signal?.removeEventListener('abort',finir); resolve(); };
      const timer = setTimeout(finir,delai); signal?.addEventListener('abort',finir,{once:true});
    });
    if (signal?.aborted) return null;
    const d = await appelerPublicites<{statut:string;recompense:RecompensePub;cosmetique?:CosmetiquePubRecu}>({operation:'reclamer',rewardSessionId:id},undefined,signal);
    if (['CLAIMED','RESERVED','ALREADY_CLAIMED'].includes(d.statut)) return { ...d.recompense, ...(d.cosmetique ? { cosmetique: d.cosmetique } : {}) };
  }
  return null;
}
