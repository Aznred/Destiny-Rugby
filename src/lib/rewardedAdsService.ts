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
  const r = await fetch(`/api/carriere?publicites=1${ligue ? `&ligue=${encodeURIComponent(ligue)}` : ''}`, {
    method: corps ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal,
    headers: corps ? { 'Content-Type': 'application/json' } : undefined,
    body: corps ? JSON.stringify({ action: 'publicites', ...corps as object }) : undefined,
  });
  const d = await r.json();
  // Toute écriture périme les vues gardées : la prochaine lecture repart du serveur.
  if (corps) vues.clear();
  if (!r.ok) throw new Error(r.status === 401 ? 'Connectez-vous à votre compte pour recevoir la récompense.' : d.erreur ?? 'Publicité indisponible.');
  return d as T;
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

/** Un SDK partagé, aucun téléchargement de vidéo avant le geste explicite. */
class ServicePublicitesRecompensees {
  private chargement?: Promise<void>;
  private config?: ConfigPublicites;
  private terminer?: () => void;
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
  cancel(): void { this.terminer?.(); }
  showRewardedAd(contexte: ContextePub, session: SessionNavigateurPub): Promise<boolean> {
    if (!this.isAvailable() || session.contexte !== contexte) return Promise.reject(new Error('Publicité indisponible.'));
    const conteneur = document.getElementById('applixir-ad-container');
    if (!conteneur) return Promise.reject(new Error('Lecteur indisponible.'));
    const audios = [...document.querySelectorAll<HTMLMediaElement>('audio, video')].filter(a => !conteneur.contains(a) && !a.paused);
    for (const a of audios) a.pause();
    return new Promise<boolean>((resolve) => {
      let finie = false, complete = false, fermeture: ReturnType<typeof setTimeout> | undefined;
      const signaler = (evenement: string) => { void appelerPublicites({operation:'evenement',rewardSessionId:session.rewardSessionId,evenement}).catch(() => {}); };
      const finir = (ok: boolean, evenement?: string) => {
        if (finie) return; finie = true; clearTimeout(delai); clearTimeout(fermeture); this.terminer = undefined;
        if (evenement) signaler(evenement);
        for (const media of conteneur.querySelectorAll<HTMLMediaElement>('video,audio')) { media.pause(); media.removeAttribute('src'); media.load(); }
        conteneur.replaceChildren();
        for (const a of audios) { if (a.isConnected) void a.play().catch(() => {}); }
        resolve(ok);
      };
      // Les callbacks locaux précèdent le traitement interne du SDK (reçu et télémétrie).
      // Ne pas retirer son lecteur au milieu de cette pile d'appels.
      const finirApresSdk = (evenement?: string) => queueMicrotask(() => finir(complete,complete ? undefined : evenement));
      const attendreFinSdk = () => { fermeture ??= setTimeout(() => finir(complete,complete ? undefined : 'NO_FILL'),5000); };
      this.terminer = () => finir(complete,complete ? undefined : 'CLOSED');
      const delai = setTimeout(() => finir(complete,complete ? undefined : 'FAILED'),180000);
      try {
        // Appel synchrone dans le clic « Lancer la vidéo » : conserve le geste Safari/iOS.
        const ouverture = window.initializeAndOpenPlayer!({ apiKey: session.apiKey, injectionElementId: conteneur.id,
          userId: session.rewardSessionId, customData: { context: contexte },
          adStatusCallbackFn: s => {
            if (finie) return;
            // IMA émet « start » ; certains adaptateurs exposent « started ».
            if (s.type === 'start' || s.type === 'started') signaler('STARTED');
            else if (s.type === 'complete') {
              if (!complete) signaler('WATCHED'); // Reprise durable, jamais une preuve de récompense.
              complete = true;
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
