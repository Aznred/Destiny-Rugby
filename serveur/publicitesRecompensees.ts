import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { catalogueAdmin } from '../src/lib/ligue/atelierCatalogue.js';
import { STATS_PUB_VIDES, chancesPacksPremium, chancesPacksPub, choisirPackPub, completerConfigPublicites, compterPub, famillePub, jourPublicites,
  type ConfigPublicites, type ContextePub, type ProgresCosmetiquePub, type VuePublicites } from '../src/lib/publicitesRecompensees.js';
import type { PackCarriere } from '../src/lib/ligue/typesCarriere.js';
import type { StockagePublicites, RegistrePublicites, SessionPub } from './publicitesStockage.js';

const MINUTE = 60_000;
export function configPublicites(): ConfigPublicites {
  const config = completerConfigPublicites(catalogueAdmin().publicites);
  config.apiKey = process.env.APPLIXIR_API_KEY || config.apiKey;
  // Les previews et le développement restent en test même si le Labo demande LIVE.
  if (process.env.VERCEL_ENV !== 'production' || process.env.APPLIXIR_LIVE_APPROVED !== 'true') config.mode = 'TEST';
  if (config.mode === 'TEST') config.apiKey = process.env.APPLIXIR_TEST_API_KEY || config.apiKey;
  return config;
}
export function raisonModePublicites(): string | undefined {
  if (catalogueAdmin().publicites?.mode !== 'LIVE') return;
  if (process.env.VERCEL_ENV !== 'production') return 'Les aperçus et le développement utilisent toujours le mode Test.';
  if (process.env.APPLIXIR_LIVE_APPROVED !== 'true') return 'Le mode Test reste actif jusqu’à l’approbation du site par AppLixir et l’activation du Live sur le serveur.';
}
export function packPourPublicites(pack: PackCarriere): PackCarriere {
  const edition = catalogueAdmin().packs[pack.id];
  return { ...pack, ...edition, ...(pack.evenement ? {evenement:pack.evenement} : {}),
    rewardedAdsEnabled: edition?.rewardedAdsEnabled ?? pack.rewardedAdsEnabled ?? true,
    rewardedAdWeight: edition?.rewardedAdWeight ?? pack.rewardedAdWeight,
  };
}
function erreur(message: string): never { const e=new Error(message); e.name='ErreurCarriere'; throw e; }

/** Pourquoi un callback AppLixir a été refusé : c'est ce que le journal du Labo et les journaux du serveur affichent. */
export type RefusCallback = 'format' | 'signature' | 'session' | 'cle' | 'jeu' | 'expiree' | 'plafond' | 'autre';
function refuser(raison: RefusCallback, message: string): never {
  const e = new Error(message) as Error & { refus: RefusCallback }; e.name = 'ErreurCarriere'; e.refus = raison; throw e;
}

/**
 * LES PARAMÈTRES D'UN CALLBACK APPLIXIR, quelle que soit la façon dont ils ont été collés à notre adresse.
 *
 * Signalé le 12 octobre 2026 : « on ne récupère pas la récompense quand on regarde la vidéo en entier ». Le lecteur
 * annonce bien `complete`, mais aucun reçu signé n'a jamais été accepté — et rien ne disait s'il en arrivait.
 *
 * ⚠️ L'ADRESSE ENREGISTRÉE CHEZ APPLIXIR CONTIENT DÉJÀ UN « ? » (`/api/carriere?applixirCallback=1`). Leur documentation
 * ne dit pas comment ils y ajoutent leurs paramètres. S'ils écrivent « adresse + ? + paramètres », la requête devient
 * `?applixirCallback=1?gameApiKey=…&gameId=…` : `applixirCallback` ne vaut plus « 1 » mais « 1?gameApiKey=… », le callback
 * n'était pas reconnu, et le serveur répondait 401 « Connectez-vous… » — mesuré sur le site public. Aucune récompense ne
 * pouvait arriver par ce chemin. On relit donc cette forme, et on offre une adresse SANS « ? » (`/api/applixir`, réécrite
 * par `vercel.json`) où n'importe quel collage reste bien formé.
 *
 * Le corps d'un POST (objet JSON ou formulaire) complète la requête : la documentation annonce un GET, on n'en dépend pas.
 * Rend `null` quand la requête n'est pas un callback.
 */
export function parametresCallbackAppLixir(url: URL, corps?: unknown): URLSearchParams | null {
  const marque = url.searchParams.get('applixirCallback');
  const adressePropre = /\/applixir\/?$/.test(url.pathname);
  if (marque === null && !adressePropre) return null;
  const q = new URLSearchParams(url.searchParams);
  if (marque !== null && marque !== '1') {
    const colle = /^1[?&]([^=]+)=?(.*)$/s.exec(marque);
    if (!colle) return null;
    q.set('applixirCallback', '1');
    q.set(colle[1], colle[2]);
  }
  const ajouter = (cle: string, valeur: unknown) => {
    if (!q.has(cle) && (typeof valeur === 'string' || typeof valeur === 'number')) q.set(cle, String(valeur));
  };
  if (corps && typeof corps === 'object' && !Array.isArray(corps)) for (const [cle, valeur] of Object.entries(corps)) ajouter(cle, valeur);
  else if (typeof corps === 'string' && corps.includes('=')) for (const [cle, valeur] of new URLSearchParams(corps)) ajouter(cle, valeur);
  return q;
}

/** Ce qu'on a le droit d'écrire d'un callback dans un journal : jamais le secret, jamais la signature. */
export function resumeCallback(q: URLSearchParams): { parametres: string[]; userId: string; tid: boolean } {
  const id = q.get('userId') ?? '';
  return { parametres: [...new Set(q.keys())].filter((k) => k !== 'secretKey').sort(), userId: id ? `${id.slice(0, 8)}…` : '', tid: Boolean(q.get('tid')) };
}
function publicSession(s: SessionPub) {
  return { rewardSessionId: s.rewardSessionId, contexte: s.contexte, ligue: s.ligue,
    rewardStatus: s.rewardStatus, pack: s.pack, montant: s.montant, ...(s.article ? { article: s.article } : {}) };
}
const recompensee = (s: SessionPub) => ['VERIFIED','RESERVED','CLAIMED'].includes(s.rewardStatus);
const occupeQuota = (s: SessionPub, maintenant: number) => recompensee(s) || (s.rewardStatus === 'REQUESTED' && s.expireLe > maintenant);
const avecPack = (contexte: ContextePub) => contexte === 'DAILY_PACK' || contexte === 'SHOP_PREMIUM_PACK';

/**
 * LE PLAFOND QUOTIDIEN D'UN USAGE (Correctif 42). Chaque usage a le sien, et ils ne se mélangent pas :
 * deux packs de ligue, cinq packs Premium, les Ovas, et pour un cosmétique ce que SON réglage autorise par jour.
 * ⚠️ La ligue n'a qu'UN compteur : la carte « Pack Pub » et la fenêtre « pas assez d'Ovas » créent la même session
 * `DAILY_PACK`, donc consomment le même plafond.
 */
function plafond(config: ConfigPublicites, contexte: ContextePub, article?: string): number {
  if (contexte === 'SHOP_OVAS') return config.ovasDailyLimit;
  if (contexte === 'DAILY_PACK') return config.packsDailyLimit;
  if (contexte === 'SHOP_PREMIUM_PACK') return config.premiumDailyLimit ?? 0;
  const reglage = article ? config.cosmetiques?.[article] : undefined;
  return reglage?.actif ? reglage.limiteJour : 0;
}
/** Deux sessions partagent-elles le même plafond ? Un cosmétique a le sien, article par article. */
const memeUsage = (s: SessionPub, contexte: ContextePub, article?: string) => s.contexte === contexte && (contexte !== 'COSMETIC' || s.article === article);
function usageActif(config: ConfigPublicites, contexte: ContextePub): boolean {
  return contexte === 'SHOP_OVAS' ? config.ovasEnabled : contexte === 'DAILY_PACK' ? config.packsEnabled
    : contexte === 'SHOP_PREMIUM_PACK' ? config.premiumEnabled === true : config.cosmeticsEnabled === true;
}

export interface OptionsPublicites {
  /** Les packs ouverts à la roulette Premium (ceux de la Collection solo). */
  packsPremium?: PackCarriere[];
  /** COSMETIC : l'article visé. */
  article?: string;
}

export function creerServicePublicites(stockage: StockagePublicites) {
  async function modifier<T>(compte: string, operation: (r: RegistrePublicites) => { resultat: T; credit?: number; tid?: string } | null): Promise<T> {
    for (let n = 0; n < 8; n++) {
      const avant = await stockage.lire(compte);
      const r = avant ? structuredClone(avant) : { revision: 0, sessions: [], stats: STATS_PUB_VIDES() };
      const changement = operation(r);
      if (!changement) erreur('Publicité introuvable.');
      r.revision = (avant?.revision ?? -1) + 1;
      if (await stockage.ecrire(compte, avant?.revision ?? null, r, changement.credit, changement.tid)) return changement.resultat;
    }
    return erreur('La récompense est en cours de traitement. Réessaie dans un instant.');
  }
  /** Où en est chaque cosmétique réglé dans le Labo, pour ce compte. */
  function progresCosmetiques(r: RegistrePublicites | null, config: ConfigPublicites, jour: string, maintenant: number): Record<string, ProgresCosmetiquePub> {
    const sortie: Record<string, ProgresCosmetiquePub> = {};
    for (const [id, reglage] of Object.entries(config.cosmetiques ?? {})) {
      const etat = r?.cosmetiques?.[id];
      if (!reglage.actif && !etat) continue;
      const debloque = Boolean(etat?.debloqueLe);
      const utilisees = (r?.sessions ?? []).filter(s => s.jour === jour && memeUsage(s, 'COSMETIC', id) && occupeQuota(s, maintenant)).length;
      sortie[id] = { progres: Math.min(etat?.progres ?? 0, reglage.requis), requis: reglage.requis, debloque,
        restantesAujourdhui: debloque || !reglage.actif || !config.cosmeticsEnabled ? 0 : Math.max(0, reglage.limiteJour - utilisees) };
    }
    return sortie;
  }
  /**
   * UN COSMÉTIQUE DÉBLOQUÉ EST LIVRÉ AU COFFRE DU COMPTE — et la livraison se rejoue tant qu'elle n'a pas abouti.
   * Le déblocage, lui, est déjà acquis dans le registre (c'est lui qui fait foi) : un coffre momentanément illisible ne
   * fait pas perdre la récompense, la prochaine lecture de la vue retente.
   */
  async function livrerCosmetiques(compte: string, r: RegistrePublicites | null): Promise<void> {
    const dus = Object.entries(r?.cosmetiques ?? {}).filter(([, e]) => e.debloqueLe && !e.livre).map(([id]) => id);
    if (!dus.length || !stockage.octroyerCosmetique) return;
    const livres: string[] = [];
    for (const id of dus) { try { if (await stockage.octroyerCosmetique(compte, id)) livres.push(id); } catch { /* retenté à la prochaine lecture */ } }
    if (!livres.length) return;
    await modifier(compte, registre => {
      for (const id of livres) if (registre.cosmetiques?.[id]) registre.cosmetiques[id].livre = true;
      return { resultat: true };
    }).catch(() => {});
  }
  async function vue(compte: string, packs: PackCarriere[], ligue: string | undefined, maintenant: number, options: OptionsPublicites = {}): Promise<VuePublicites> {
    const r = await stockage.lire(compte), config = configPublicites(), jour = jourPublicites(maintenant);
    await livrerCosmetiques(compte, r);
    const sessions = r?.sessions ?? [];
    const utilisees = (contexte: ContextePub) => sessions.filter(s => s.jour === jour && s.contexte === contexte && occupeQuota(s, maintenant)).length;
    const chances = chancesPacksPub(packs.map(packPourPublicites), maintenant);
    const chancesPremium = config.premiumEnabled ? chancesPacksPremium(options.packsPremium ?? [], config, maintenant) : [];
    // Une récompense de ligue ne se reprend que dans SA ligue ; les autres suivent le compte partout.
    const visible = (s: SessionPub) => s.contexte !== 'DAILY_PACK' || s.ligue === ligue;
    return { config, disponible: config.enabled && Boolean(config.apiKey) && Boolean(process.env.APPLIXIR_CALLBACK_SECRET),
      raison: process.env.APPLIXIR_CALLBACK_SECRET ? undefined : 'Les publicités seront bientôt disponibles.', jour,
      ovasRestantes: Math.max(0, config.ovasDailyLimit - utilisees('SHOP_OVAS')),
      packsRestants: Math.max(0, config.packsDailyLimit - utilisees('DAILY_PACK')), chances,
      premiumRestants: Math.max(0, (config.premiumDailyLimit ?? 0) - utilisees('SHOP_PREMIUM_PACK')), chancesPremium,
      cosmetiques: progresCosmetiques(r, config, jour, maintenant),
      enAttente: sessions.filter(s => (s.rewardStatus === 'VERIFIED' || s.rewardStatus === 'RESERVED') && visible(s)).map(publicSession),
      aVerifier: sessions.filter(s => s.rewardStatus === 'REQUESTED' && s.videoTerminee && s.expireLe > maintenant && visible(s)).map(publicSession),
    };
  }
  async function commencer(compte: string, contexte: ContextePub, packs: PackCarriere[], ligue: string | undefined, maintenant: number, options: OptionsPublicites = {}) {
    const config = configPublicites(), jour = jourPublicites(maintenant);
    if (!process.env.APPLIXIR_CALLBACK_SECRET) erreur('Les publicités seront bientôt disponibles.');
    if (!config.enabled || !config.apiKey || !usageActif(config, contexte)) erreur('Publicités indisponibles.');
    const chances = contexte === 'DAILY_PACK' ? chancesPacksPub(packs.map(packPourPublicites), maintenant)
      : contexte === 'SHOP_PREMIUM_PACK' ? chancesPacksPremium(options.packsPremium ?? [], config, maintenant) : [];
    if (contexte === 'DAILY_PACK' && !ligue) erreur('Aucun pack disponible pour la roulette.');
    if (avecPack(contexte) && !chances.length) erreur('Aucun pack disponible pour la roulette.');
    const article = contexte === 'COSMETIC' ? options.article : undefined;
    const reglage = article ? config.cosmetiques?.[article] : undefined;
    if (contexte === 'COSMETIC' && (!article || !reglage?.actif)) erreur('Ce cosmétique ne se débloque pas par publicité.');
    const session: SessionPub = { rewardSessionId: randomUUID(), compte, contexte, ligue: contexte === 'DAILY_PACK' ? ligue : undefined,
      rewardStatus: 'REQUESTED', jour, creeLe: maintenant, expireLe: maintenant + 15 * MINUTE,
      config, chances, montant: contexte === 'SHOP_OVAS' ? config.rewardedAdOvasAmount : 0, ...(article ? { article } : {}) };
    await modifier(compte, r => {
      // Une seule publicité à la fois par compte : ni double clic, ni deux fenêtres, ni deux onglets.
      if (r.sessions.some(s => s.rewardStatus === 'REQUESTED' && s.expireLe > maintenant)) erreur('Une publicité est déjà en cours sur ce compte.');
      if (article && r.cosmetiques?.[article]?.debloqueLe) erreur('Ce cosmétique est déjà débloqué.');
      if (r.sessions.filter(s => s.jour === jour && memeUsage(s, contexte, article) && occupeQuota(s, maintenant)).length >= plafond(config, contexte, article)) erreur('DAILY_LIMIT — Revenez demain.');
      // Les packs réservés et crédits vérifiés ne sont jamais purgés avant réception.
      r.sessions = r.sessions.filter(s => recompensee(s) && s.rewardStatus !== 'CLAIMED' || s.creeLe > maintenant - 2 * 86400_000);
      if (r.sessions.length > 1000) erreur('Trop de récompenses en attente.');
      r.sessions.push(session); r.stats.requested++; compterPub(r.stats, contexte, 'requested');
      return { resultat: true };
    });
    return { ...publicSession(session), apiKey: config.apiKey, mode: config.mode };
  }
  async function evenement(compte: string, id: string, type: string) {
    if (!['STARTED','WATCHED','FAILED','NO_FILL','CLOSED'].includes(type)) erreur('Événement publicitaire invalide.');
    return modifier(compte, r => {
      const s = r.sessions.find(s => s.rewardSessionId === id); if (!s) return null;
      if (s.rewardStatus !== 'REQUESTED') return { resultat: true };
      if (type === 'STARTED' || type === 'WATCHED') {
        if (!s.started) { s.started = true; r.stats.started++; compterPub(r.stats, s.contexte, 'started'); }
        if (type === 'WATCHED') s.videoTerminee = true;
      }
      else { s.rewardStatus = 'FAILED'; s.failure = type as SessionPub['failure']; r.stats.failed++; if (type === 'NO_FILL') r.stats.noFill++; }
      return { resultat: true };
    });
  }
  async function callback(q: URLSearchParams, maintenant: number) {
    const secret = process.env.APPLIXIR_CALLBACK_SECRET;
    if (!secret) erreur('Callback AppLixir non configuré.');
    const key = q.get('gameApiKey') ?? '', game = q.get('gameId') ?? '', id = q.get('userId') ?? '', tid = q.get('tid') ?? '';
    // La documentation annonce un MD5 en minuscules ; une casse différente n'est pas une raison de perdre une récompense.
    const signature = (q.get('signature') ?? '').toLowerCase();
    if (!/^[a-f0-9]{32}$/.test(signature) || !/^[a-f0-9-]{36}$/i.test(id) || !game || game.length > 100 || !tid || tid.length > 200) refuser('format', 'Signature AppLixir invalide.');
    const attendue = createHash('md5').update(key + game + id + tid + secret).digest();
    if (!timingSafeEqual(attendue, Buffer.from(signature, 'hex'))) refuser('signature', 'Signature AppLixir invalide.');
    const session = await stockage.trouver(id.toLowerCase());
    if (!session) refuser('session', 'Session AppLixir introuvable.');
    if (session.config.apiKey !== key) refuser('cle', 'Session AppLixir introuvable.');
    if (process.env.APPLIXIR_GAME_ID && game !== process.env.APPLIXIR_GAME_ID) refuser('jeu', 'Session AppLixir introuvable.');
    if (recompensee(session)) return { ok: true }; // Replay : aucune nouvelle écriture.
    if (session.expireLe < maintenant) refuser('expiree', 'Session AppLixir expirée.');
    // ⚠️ LE TIRAGE SE FAIT ICI, AU REÇU SIGNÉ, ET NULLE PART AILLEURS : la roulette de l'écran montre ce résultat, elle ne
    // le fabrique pas — ni « presque jackpot », ni second tirage.
    const pack = avecPack(session.contexte) ? choisirPackPub(session.chances, randomInt(0, 0x100000000) / 0x100000000) : undefined;
    return modifier(session.compte, r => {
      const s = r.sessions.find(s => s.rewardSessionId === id); if (!s) return null;
      if (recompensee(s)) return { resultat: { ok: true } };
      if (s.expireLe < maintenant) refuser('expiree', 'Session AppLixir expirée.');
      // Un reçu signé prime sur une fermeture ou un no-fill local arrivé en premier.
      // Les callbacks retardés restent soumis au plafond journalier, dans le même CAS.
      if (r.sessions.filter(a => a.jour === s.jour && memeUsage(a, s.contexte, s.article) && recompensee(a)).length >= plafond(s.config, s.contexte, s.article)) refuser('plafond', 'DAILY_LIMIT — Plafond publicitaire atteint.');
      if (s.rewardStatus === 'FAILED') { r.stats.failed--; if (s.failure === 'NO_FILL') r.stats.noFill--; delete s.failure; }
      s.verifieLe = maintenant; s.tid = tid; s.pack = pack; s.rewardStatus = pack ? 'RESERVED' : 'VERIFIED';
      if (pack) {
        r.stats.distributionAttendue ??= {};
        for(const c of s.chances) r.stats.distributionAttendue[c.pack.id]=(r.stats.distributionAttendue[c.pack.id] ?? 0)+c.chance/100;
      }
      s.chances = []; // Ne retransférer aucun catalogue dans les opérations suivantes.
      // Un compte compte une fois par usage : c'est ce qui donne les « utilisateurs uniques » du Labo.
      if (!r.stats.contextes?.[`${famillePub(s.contexte)}.completed`]) compterPub(r.stats, s.contexte, 'joueurs');
      r.stats.completed++; compterPub(r.stats, s.contexte, 'completed');
      if (!s.started) { s.started = true; r.stats.started++; compterPub(r.stats, s.contexte, 'started'); }
      if (pack) {
        r.stats.packsEarned++; r.stats.distribution[pack.id] = (r.stats.distribution[pack.id] ?? 0) + 1;
        // Ce que le joueur n'a pas eu à dépenser pour ce pack.
        compterPub(r.stats, s.contexte, 'rewards'); compterPub(r.stats, s.contexte, 'ovas', Math.max(0, Math.round(pack.prix)));
      }
      return { resultat: { ok: true }, tid };
    });
  }
  /**
   * UN CALLBACK REFUSÉ LAISSE UNE TRACE SUR SA SESSION, quand elle existe : « un reçu est arrivé le …, refusé pour … ».
   * Sans elle, un reçu mal signé et un reçu jamais envoyé se ressemblaient — c'est ce qui a rendu la panne illisible.
   * ⚠️ Rien n'est crédité ici, et un identifiant de session inconnu n'écrit rien. Un échec d'écriture est ignoré.
   */
  async function noterRefus(q: URLSearchParams, raison: RefusCallback, maintenant: number): Promise<void> {
    const id = (q.get('userId') ?? '').toLowerCase();
    if (!/^[a-f0-9-]{36}$/.test(id)) return;
    try {
      const session = await stockage.trouver(id);
      if (!session) return;
      await modifier(session.compte, r => {
        const s = r.sessions.find(s => s.rewardSessionId === id); if (!s) return null;
        s.callback = { le: maintenant, refus: raison, n: (s.callback?.n ?? 0) + 1 };
        r.stats.callbacksRefuses = (r.stats.callbacksRefuses ?? 0) + 1;
        return { resultat: true };
      });
    } catch { /* le journal est un confort : il ne doit jamais changer la réponse faite au fournisseur */ }
  }
  /**
   * RÉCLAMER. Des Ovas : le coffre est crédité dans la même écriture. Un pack : il reste réservé jusqu'à son ouverture.
   * Un cosmétique : sa progression avance d'un pas — et il n'entre dans l'inventaire que le jour où elle atteint le
   * nombre demandé. ⚠️ C'EST LE SERVEUR QUI COMPTE : l'écran ne fait qu'afficher `progres`.
   */
  async function reclamer(compte: string, id: string, maintenant = Date.now()) {
    const r = await stockage.lire(compte), session = r?.sessions.find(s => s.rewardSessionId === id);
    if (!session) erreur('Publicité introuvable.');
    const cosmetique = (registre: RegistrePublicites | null, s: SessionPub) => s.article
      ? { cosmetique: { id: s.article, ...progresCosmetiques(registre, configPublicites(), jourPublicites(maintenant), maintenant)[s.article] } } : {};
    if (session.rewardStatus === 'CLAIMED') return { statut: 'ALREADY_CLAIMED', recompense: publicSession(session), ...cosmetique(r, session) };
    if (!recompensee(session)) return { statut: 'PENDING', recompense: publicSession(session) };
    if (session.rewardStatus === 'RESERVED') return { statut: 'RESERVED', recompense: publicSession(session) };
    const resultat = await modifier(compte, registre => {
      const s = registre.sessions.find(s => s.rewardSessionId === id); if (!s) return null;
      if (s.rewardStatus === 'CLAIMED') return { resultat: { statut: 'ALREADY_CLAIMED', recompense: publicSession(s), ...cosmetique(registre, s) } };
      if (s.rewardStatus !== 'VERIFIED') erreur('Récompense non validée.');
      s.rewardStatus = 'CLAIMED';
      if (s.contexte === 'COSMETIC' && s.article) {
        const requis = Math.max(1, s.config.cosmetiques?.[s.article]?.requis ?? configPublicites().cosmetiques?.[s.article]?.requis ?? 1);
        registre.cosmetiques ??= {};
        const etat = registre.cosmetiques[s.article] ??= { progres: 0 };
        // Non répétable : une publicité de trop sur un article déjà acquis ne rapporte rien de plus.
        if (!etat.debloqueLe) {
          etat.progres = Math.min(requis, etat.progres + 1);
          if (etat.progres >= requis) { etat.debloqueLe = maintenant; compterPub(registre.stats, 'COSMETIC', 'rewards'); }
        }
        return { resultat: { statut: 'CLAIMED', recompense: publicSession(s), ...cosmetique(registre, s) } };
      }
      registre.stats.ovasRewarded += s.montant;
      compterPub(registre.stats, s.contexte, 'rewards'); compterPub(registre.stats, s.contexte, 'ovas', s.montant);
      return { resultat: { statut: 'CLAIMED', recompense: publicSession(s) }, credit: s.montant };
    });
    if (session.contexte === 'COSMETIC') await livrerCosmetiques(compte, await stockage.lire(compte));
    return resultat;
  }
  async function packReserve(compte: string, id: string, ligue: string) {
    const r = await stockage.lire(compte), s = r?.sessions.find(s => s.rewardSessionId === id);
    if (!s || s.contexte !== 'DAILY_PACK' || s.ligue !== ligue || !s.pack || !['RESERVED','CLAIMED'].includes(s.rewardStatus)) erreur('Pack Pub introuvable.');
    return s;
  }
  async function marquerOuvert(compte: string, id: string) {
    await modifier(compte, r => {
      const s = r.sessions.find(s => s.rewardSessionId === id); if (!s || !s.pack) return null;
      s.rewardStatus = 'CLAIMED'; return { resultat: true };
    });
  }
  /**
   * LE PACK PREMIUM S'OUVRE UNE FOIS. La Collection solo tire ses cartes dans le navigateur, comme tous ses packs : le
   * serveur rend donc le pack à l'instant où il le marque « ouvert », et ne le rendra plus. Un second appel (double
   * clic, deuxième onglet, requête rejouée) reçoit `ALREADY_CLAIMED`, sans pack.
   */
  async function ouvrirPremium(compte: string, id: string): Promise<{ statut: 'OPENED' | 'ALREADY_CLAIMED'; pack?: PackCarriere }> {
    return modifier(compte, r => {
      const s = r.sessions.find(s => s.rewardSessionId === id);
      if (!s || s.contexte !== 'SHOP_PREMIUM_PACK' || !s.pack) return null;
      if (s.rewardStatus === 'CLAIMED') return { resultat: { statut: 'ALREADY_CLAIMED' as const } };
      if (s.rewardStatus !== 'RESERVED') erreur('Récompense non validée.');
      s.rewardStatus = 'CLAIMED';
      return { resultat: { statut: 'OPENED' as const, pack: s.pack } };
    });
  }
  return { vue, commencer, evenement, callback, noterRefus, reclamer, packReserve, marquerOuvert, ouvrirPremium };
}
