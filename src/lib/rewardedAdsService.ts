import type { ConfigPublicites, ContextePub, RecompensePub, VuePublicites } from './publicitesRecompensees';

type StatutAppLixir = { type: string };
interface OptionsAppLixir {
  apiKey: string; injectionElementId: string; userId: string; customData: { context: ContextePub };
  adStatusCallbackFn: (statut: StatutAppLixir) => void;
  adErrorCallbackFn: (erreur: { getError?: () => { data?: { errorCode?: number } } }) => void;
}
declare global { interface Window { initializeAndOpenPlayer?: (options: OptionsAppLixir) => void } }
export interface SessionNavigateurPub extends RecompensePub { apiKey: string; mode: 'TEST' | 'LIVE' }
export async function appelerPublicites<T>(corps?: unknown, ligue?: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(`/api/carriere?publicites=1${ligue ? `&ligue=${encodeURIComponent(ligue)}` : ''}`, {
    method: corps ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal,
    headers: corps ? { 'Content-Type': 'application/json' } : undefined,
    body: corps ? JSON.stringify({ action: 'publicites', ...corps as object }) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(r.status === 401 ? 'Connectez-vous à votre compte pour recevoir la récompense.' : d.erreur ?? 'Publicité indisponible.');
  return d as T;
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
      const charge = () => { nettoyer(); if (window.initializeAndOpenPlayer) resolve(); else reject(new Error('Le lecteur publicitaire est indisponible.')); };
      const echoue = () => { nettoyer(); reject(new Error('La publicité est bloquée ou momentanément indisponible.')); };
      const delai = setTimeout(echoue,15000);
      script.addEventListener('load',charge,{once:true}); script.addEventListener('error',echoue,{once:true});
      if (!existant) { script.src = src; script.async = true; document.head.appendChild(script); }
    });
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
      this.terminer = () => finir(complete,complete ? undefined : 'CLOSED');
      const delai = setTimeout(() => finir(complete,complete ? undefined : 'FAILED'),180000);
      try {
        // Appel synchrone dans le clic « Lancer la vidéo » : conserve le geste Safari/iOS.
        window.initializeAndOpenPlayer!({ apiKey: session.apiKey, injectionElementId: conteneur.id,
          userId: session.rewardSessionId, customData: { context: contexte },
          adStatusCallbackFn: s => {
            if (finie) return;
            if (s.type === 'started') signaler('STARTED');
            else if (s.type === 'complete') {
              complete = true;
              // Laisser le SDK terminer son cycle, même sans allAdsCompleted.
              fermeture ??= setTimeout(() => finir(true),1200);
            } else if (s.type === 'allAdsCompleted') finir(complete,complete ? undefined : 'NO_FILL');
            else if (['skipped','manuallyEnded','consentDeclined'].includes(s.type)) finir(complete,complete ? undefined : 'CLOSED');
            else if (s.type === 'noAd') finir(false,'NO_FILL');
          },
          adErrorCallbackFn: e => {
            let code: number | undefined;
            try { code = e.getError?.().data?.errorCode; } catch { /* aucune confiance dans l'erreur SDK */ }
            finir(complete,complete ? undefined : code === 303 ? 'NO_FILL' : 'FAILED');
          },
        });
      } catch { finir(false,'FAILED'); }
    });
  }
}
export const RewardedAdsService = new ServicePublicitesRecompensees();
export const chargerPublicites = (ligue?: string, signal?: AbortSignal) => appelerPublicites<VuePublicites>(undefined,ligue,signal);
export async function claimRewardedAdReward(id: string, signal?: AbortSignal): Promise<RecompensePub | null> {
  // Reconciliation bornée, uniquement après une vidéo terminée ou une reprise manuelle.
  for (const delai of [0,1000,2000,4000,6000]) {
    if (signal?.aborted) return null;
    if (delai) await new Promise<void>(resolve => {
      const finir = () => { clearTimeout(timer); signal?.removeEventListener('abort',finir); resolve(); };
      const timer = setTimeout(finir,delai); signal?.addEventListener('abort',finir,{once:true});
    });
    if (signal?.aborted) return null;
    const d = await appelerPublicites<{statut:string;recompense:RecompensePub}>({operation:'reclamer',rewardSessionId:id},undefined,signal);
    if (['CLAIMED','RESERVED','ALREADY_CLAIMED'].includes(d.statut)) return d.recompense;
  }
  return null;
}
