import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { catalogueAdmin } from '../src/lib/ligue/atelierCatalogue.js';
import { PUBLICITES_PAR_DEFAUT, STATS_PUB_VIDES, chancesPacksPub, choisirPackPub, jourPublicites,
  type ConfigPublicites, type ContextePub, type VuePublicites } from '../src/lib/publicitesRecompensees.js';
import type { PackCarriere } from '../src/lib/ligue/typesCarriere.js';
import type { StockagePublicites, RegistrePublicites, SessionPub } from './publicitesStockage.js';

const MINUTE = 60_000;
export function configPublicites(): ConfigPublicites {
  const config = { ...PUBLICITES_PAR_DEFAUT, ...catalogueAdmin().publicites };
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
function publicSession(s: SessionPub) {
  return { rewardSessionId: s.rewardSessionId, contexte: s.contexte, ligue: s.ligue,
    rewardStatus: s.rewardStatus, pack: s.pack, montant: s.montant };
}
const recompensee = (s: SessionPub) => ['VERIFIED','RESERVED','CLAIMED'].includes(s.rewardStatus);
const occupeQuota = (s: SessionPub, maintenant: number) => recompensee(s) || (s.rewardStatus === 'REQUESTED' && s.expireLe > maintenant);

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
  async function vue(compte: string, packs: PackCarriere[], ligue: string | undefined, maintenant: number): Promise<VuePublicites> {
    const r = await stockage.lire(compte), config = configPublicites(), jour = jourPublicites(maintenant);
    const sessions = r?.sessions ?? [];
    const utilisees = (contexte: ContextePub) => sessions.filter(s => s.jour === jour && s.contexte === contexte && occupeQuota(s, maintenant)).length;
    const chances = chancesPacksPub(packs.map(packPourPublicites), maintenant);
    return { config, disponible: config.enabled && Boolean(config.apiKey) && Boolean(process.env.APPLIXIR_CALLBACK_SECRET),
      raison: process.env.APPLIXIR_CALLBACK_SECRET ? undefined : 'Les publicités seront bientôt disponibles.', jour,
      ovasRestantes: Math.max(0, config.ovasDailyLimit - utilisees('SHOP_OVAS')),
      packsRestants: Math.max(0, config.packsDailyLimit - utilisees('DAILY_PACK')), chances,
      enAttente: sessions.filter(s => (s.rewardStatus === 'VERIFIED' || s.rewardStatus === 'RESERVED')
        && (s.contexte === 'SHOP_OVAS' || s.ligue === ligue)).map(publicSession),
      aVerifier: sessions.filter(s => s.rewardStatus === 'REQUESTED' && s.videoTerminee && s.expireLe > maintenant
        && (s.contexte === 'SHOP_OVAS' || s.ligue === ligue)).map(publicSession),
    };
  }
  async function commencer(compte: string, contexte: ContextePub, packs: PackCarriere[], ligue: string | undefined, maintenant: number) {
    const config = configPublicites(), jour = jourPublicites(maintenant);
    if (!process.env.APPLIXIR_CALLBACK_SECRET) erreur('Les publicités seront bientôt disponibles.');
    if (!config.enabled || !config.apiKey || !(contexte === 'SHOP_OVAS' ? config.ovasEnabled : config.packsEnabled)) erreur('Publicités indisponibles.');
    const chances = contexte === 'DAILY_PACK' ? chancesPacksPub(packs.map(packPourPublicites), maintenant) : [];
    if (contexte === 'DAILY_PACK' && (!ligue || !chances.length)) erreur('Aucun pack disponible pour la roulette.');
    const session: SessionPub = { rewardSessionId: randomUUID(), compte, contexte, ligue,
      rewardStatus: 'REQUESTED', jour, creeLe: maintenant, expireLe: maintenant + 15 * MINUTE,
      config, chances, montant: contexte === 'SHOP_OVAS' ? config.rewardedAdOvasAmount : 0 };
    await modifier(compte, r => {
      if (r.sessions.some(s => s.rewardStatus === 'REQUESTED' && s.expireLe > maintenant)) erreur('Une publicité est déjà en cours sur ce compte.');
      const limite = contexte === 'SHOP_OVAS' ? config.ovasDailyLimit : config.packsDailyLimit;
      if (r.sessions.filter(s => s.jour === jour && s.contexte === contexte && occupeQuota(s, maintenant)).length >= limite) erreur('DAILY_LIMIT — Revenez demain.');
      // Les packs réservés et crédits vérifiés ne sont jamais purgés avant réception.
      r.sessions = r.sessions.filter(s => recompensee(s) && s.rewardStatus !== 'CLAIMED' || s.creeLe > maintenant - 2 * 86400_000);
      if (r.sessions.length > 1000) erreur('Trop de récompenses en attente.');
      r.sessions.push(session); r.stats.requested++;
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
        if (!s.started) { s.started = true; r.stats.started++; }
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
    const signature = q.get('signature') ?? '';
    if (!/^[a-f0-9]{32}$/.test(signature) || !/^[a-f0-9-]{36}$/.test(id) || !game || game.length > 100 || !tid || tid.length > 200) erreur('Signature AppLixir invalide.');
    const attendue = createHash('md5').update(key + game + id + tid + secret).digest();
    if (!timingSafeEqual(attendue, Buffer.from(signature, 'hex'))) erreur('Signature AppLixir invalide.');
    const session = await stockage.trouver(id);
    if (!session || session.config.apiKey !== key || (process.env.APPLIXIR_GAME_ID && game !== process.env.APPLIXIR_GAME_ID)) erreur('Session AppLixir introuvable.');
    if (recompensee(session)) return { ok: true }; // Replay : aucune nouvelle écriture.
    if (session.expireLe < maintenant) erreur('Session AppLixir expirée.');
    const pack = session.contexte === 'DAILY_PACK' ? choisirPackPub(session.chances, randomInt(0, 0x100000000) / 0x100000000) : undefined;
    return modifier(session.compte, r => {
      const s = r.sessions.find(s => s.rewardSessionId === id); if (!s) return null;
      if (recompensee(s)) return { resultat: { ok: true } };
      if (s.expireLe < maintenant) erreur('Session AppLixir expirée.');
      // Un reçu signé prime sur une fermeture ou un no-fill local arrivé en premier.
      // Les callbacks retardés restent soumis au plafond journalier, dans le même CAS.
      const limite = s.contexte === 'SHOP_OVAS' ? s.config.ovasDailyLimit : s.config.packsDailyLimit;
      if (r.sessions.filter(a => a.jour === s.jour && a.contexte === s.contexte && recompensee(a)).length >= limite) erreur('DAILY_LIMIT — Plafond publicitaire atteint.');
      if (s.rewardStatus === 'FAILED') { r.stats.failed--; if (s.failure === 'NO_FILL') r.stats.noFill--; delete s.failure; }
      s.verifieLe = maintenant; s.tid = tid; s.pack = pack; s.rewardStatus = pack ? 'RESERVED' : 'VERIFIED';
      if (pack) {
        r.stats.distributionAttendue ??= {};
        for(const c of s.chances) r.stats.distributionAttendue[c.pack.id]=(r.stats.distributionAttendue[c.pack.id] ?? 0)+c.chance/100;
      }
      s.chances = []; // Ne retransférer aucun catalogue dans les opérations suivantes.
      r.stats.completed++;
      if (!s.started) { s.started = true; r.stats.started++; }
      if (pack) { r.stats.packsEarned++; r.stats.distribution[pack.id] = (r.stats.distribution[pack.id] ?? 0) + 1; }
      return { resultat: { ok: true }, tid };
    });
  }
  async function reclamer(compte: string, id: string) {
    const r = await stockage.lire(compte), session = r?.sessions.find(s => s.rewardSessionId === id);
    if (!session) erreur('Publicité introuvable.');
    if (session.rewardStatus === 'CLAIMED') return { statut: 'ALREADY_CLAIMED', recompense: publicSession(session) };
    if (!recompensee(session)) return { statut: 'PENDING', recompense: publicSession(session) };
    if (session.rewardStatus === 'RESERVED') return { statut: 'RESERVED', recompense: publicSession(session) };
    return modifier(compte, registre => {
      const s = registre.sessions.find(s => s.rewardSessionId === id); if (!s) return null;
      if (s.rewardStatus === 'CLAIMED') return { resultat: { statut: 'ALREADY_CLAIMED', recompense: publicSession(s) } };
      if (s.rewardStatus !== 'VERIFIED') erreur('Récompense non validée.');
      s.rewardStatus = 'CLAIMED'; registre.stats.ovasRewarded += s.montant;
      return { resultat: { statut: 'CLAIMED', recompense: publicSession(s) }, credit: s.montant };
    });
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
  return { vue, commencer, evenement, callback, reclamer, packReserve, marquerOuvert };
}
