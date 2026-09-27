import Stripe from 'stripe';
import type { StockageCarriere } from './carriereStockage.js';

export const OFFRES_OVAS = {
  p1: { ovas: 100, centimes: 99 },
  p2: { ovas: 550, centimes: 499 },
  p3: { ovas: 1200, centimes: 999 },
} as const;

type ModeStripe = 'test' | 'live';
type ConfigurationStripe = { mode: ModeStripe; cle: string; codeFiscal?: string };

/**
 * Le passage aux paiements réels est volontairement explicite. Une clé live ne
 * suffit pas : le compte actif utilise Managed Payments, qui demande un code
 * fiscal produit confirmé par l'éditeur avant la première vente.
 */
export function configurationStripe(): ConfigurationStripe {
  const valeurMode = process.env.STRIPE_MODE?.trim() || 'test';
  if (valeurMode !== 'test' && valeurMode !== 'live') throw new Error('STRIPE_MODE doit être « test » ou « live ».');
  const mode = valeurMode as ModeStripe;
  const cle = process.env.STRIPE_SECRET_KEY?.trim();
  const prefixe = mode === 'live' ? /^[sr]k_live_/ : /^[sr]k_test_/;
  if (!cle || !prefixe.test(cle)) {
    throw new Error(`La clé Stripe ${mode === 'live' ? 'live' : 'de test'} attendue n’est pas configurée côté serveur.`);
  }
  const codeFiscal = process.env.STRIPE_PRODUCT_TAX_CODE?.trim();
  if (mode === 'live' && !/^txcd_[A-Za-z0-9]+$/.test(codeFiscal ?? '')) {
    throw new Error('STRIPE_PRODUCT_TAX_CODE est requis pour les paiements réels avec Managed Payments.');
  }
  return { mode, cle, codeFiscal };
}

type ErreurStripe = {
  type?: unknown;
  code?: unknown;
  requestId?: unknown;
};

/**
 * La réponse ne révèle ni la clé, ni le message brut de Stripe. En revanche,
 * elle distingue les réglages que l'administrateur peut réellement corriger
 * d'une indisponibilité passagère. Sans cela, une clé restreinte sans le droit
 * Checkout produisait le même message qu'une panne réseau.
 */
export function diagnosticErreurStripe(erreur: unknown): { statut: 400 | 503; message: string } | null {
  if (!erreur || typeof erreur !== 'object') return null;
  const { type, code } = erreur as ErreurStripe;
  if (typeof type !== 'string' || !type.startsWith('Stripe')) return null;
  if (type === 'StripePermissionError') {
    return {
      statut: 400,
      message: 'La clé Stripe n’a pas le droit de créer une session Checkout. Dans Stripe, autorise « Checkout Sessions : Write » pour STRIPE_SECRET_KEY, puis redéploie.',
    };
  }
  if (type === 'StripeAuthenticationError') {
    return {
      statut: 400,
      message: 'Stripe a refusé la clé. Vérifie que STRIPE_MODE et le préfixe de STRIPE_SECRET_KEY correspondent (rk_test_/sk_test_ ou rk_live_/sk_live_), puis redéploie la Production.',
    };
  }
  if (type === 'StripeInvalidRequestError') {
    const suffixe = typeof code === 'string' ? ` (code Stripe : ${code})` : '';
    return {
      statut: 400,
      message: `Stripe a refusé la demande Checkout${suffixe}. Vérifie dans Workbench → Request logs que la clé du mode actif est valide et autorise « Checkout Sessions : Write ».`,
    };
  }
  if (type === 'StripeRateLimitError') {
    return { statut: 503, message: 'Stripe limite momentanément les demandes. Attends une minute puis réessaie.' };
  }
  if (type === 'StripeConnectionError' || type === 'StripeAPIError') {
    return { statut: 503, message: 'Stripe est momentanément inaccessible depuis le serveur. Réessaie dans un instant.' };
  }
  return { statut: 503, message: 'Stripe a refusé la demande. Vérifie Workbench → Request logs avec l’heure de cet essai.' };
}

/** Les journaux Vercel gardent une piste de diagnostic sans jamais écrire de secret. */
export function journalErreurStripe(erreur: unknown) {
  const { type, code, requestId } = (erreur && typeof erreur === 'object' ? erreur : {}) as ErreurStripe;
  if (typeof type !== 'string' || !type.startsWith('Stripe')) return;
  console.error('Échec Stripe Checkout', {
    type,
    code: typeof code === 'string' ? code : undefined,
    requestId: typeof requestId === 'string' ? requestId : undefined,
  });
}

export function clientStripe() {
  return new Stripe(configurationStripe().cle);
}

export async function creerPaiement(compte: string, pack: unknown, tentative: unknown, stockage: StockageCarriere) {
  if (typeof pack !== 'string' || !Object.hasOwn(OFFRES_OVAS, pack)) throw new Error('Recharge inconnue.');
  if (typeof tentative !== 'string' || !/^[a-f0-9-]{36}$/i.test(tentative)) throw new Error('Identifiant d’achat invalide.');
  if (!stockage.crediterAchat || !await stockage.boutique(compte)) throw new Error('Synchronisez votre boutique avec votre compte avant de payer.');
  if (process.env.VERCEL && !process.env.APP_URL) throw new Error('Adresse publique de la boutique non configurée.');
  const origine = new URL(process.env.APP_URL || 'http://localhost:5173');
  if (origine.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(origine.hostname)) throw new Error('Adresse publique de la boutique invalide.');
  const offre = OFFRES_OVAS[pack as keyof typeof OFFRES_OVAS];
  const configuration = configurationStripe();
  const session = await clientStripe().checkout.sessions.create({
    mode: 'payment',
    // En test, ne pas inventer un code fiscal. En production, le code fiscal
    // fourni par l'éditeur est obligatoire avant d'activer Managed Payments.
    managed_payments: { enabled: configuration.mode === 'live' },
    client_reference_id: compte,
    metadata: { compte, pack, ovas: String(offre.ovas), application: 'destiny-rugby' },
    line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: offre.centimes,
      product_data: {
        name: `${offre.ovas} Ovas — Destiny Rugby${configuration.mode === 'test' ? ' (test)' : ''}`,
        ...(configuration.codeFiscal ? { tax_code: configuration.codeFiscal } : {}),
      } } }],
    success_url: `${origine.origin}/?paiement=retour&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origine.origin}/?paiement=annule`,
    integration_identifier: 'destiny_rugby_ovas_qmzptvka',
  }, { idempotencyKey: `ovas:${compte}:${tentative}` });
  if (!session.url) throw new Error('La page de paiement est indisponible.');
  return { url: session.url };
}

/** Seul un événement signé et payé peut créditer le compte. Le retour navigateur ne crédite rien. */
export async function traiterEvenementStripe(event: Stripe.Event, stockage: StockageCarriere) {
  const estLive = configurationStripe().mode === 'live';
  if (event.livemode !== estLive) throw new Error(`Ce serveur attend uniquement les paiements Stripe ${estLive ? 'réels' : 'de test'}.`);
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return;
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== 'paid') return;
  const pack = session.metadata?.pack;
  const compte = session.metadata?.compte;
  const offre = pack && Object.hasOwn(OFFRES_OVAS, pack) ? OFFRES_OVAS[pack as keyof typeof OFFRES_OVAS] : null;
  if (!offre || !compte || session.client_reference_id !== compte || session.metadata?.application !== 'destiny-rugby'
    || session.amount_total !== offre.centimes || session.currency !== 'eur' || session.mode !== 'payment'
    || session.metadata?.ovas !== String(offre.ovas)) throw new Error('Paiement ne correspondant pas à une recharge.');
  if (!stockage.crediterAchat) throw new Error('Stockage des paiements indisponible.');
  await stockage.crediterAchat(session.id, compte, offre.ovas);
}

export async function recevoirWebhookStripe(brut: Buffer, signature: string, stockage: StockageCarriere) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('Webhook Stripe non configuré.');
  const event = clientStripe().webhooks.constructEvent(brut, signature, secret);
  await traiterEvenementStripe(event, stockage);
}
