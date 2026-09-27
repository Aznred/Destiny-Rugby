import Stripe from 'stripe';
import type { StockageCarriere } from './carriereStockage.js';

export const OFFRES_OVAS = {
  p1: { ovas: 100, centimes: 99 },
  p2: { ovas: 550, centimes: 499 },
  p3: { ovas: 1200, centimes: 999 },
} as const;

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
      message: 'La clé Stripe n’a pas le droit de créer une session Checkout. Dans Stripe en mode test, autorise « Checkout Sessions : Write » pour STRIPE_SECRET_KEY, puis redéploie.',
    };
  }
  if (type === 'StripeAuthenticationError') {
    return {
      statut: 400,
      message: 'Stripe a refusé la clé de test. Vérifie que STRIPE_SECRET_KEY commence par rk_test_ ou sk_test_, appartient bien au mode test, puis redéploie la Production.',
    };
  }
  if (type === 'StripeInvalidRequestError') {
    const suffixe = typeof code === 'string' ? ` (code Stripe : ${code})` : '';
    return {
      statut: 400,
      message: `Stripe a refusé la demande Checkout${suffixe}. Vérifie dans Workbench → Request logs que la clé de test est active et qu’elle autorise « Checkout Sessions : Write ».`,
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
  const cle = process.env.STRIPE_SECRET_KEY?.trim();
  if (!cle || !/^[sr]k_test_/.test(cle)) throw new Error('Les paiements Stripe de test attendent leur configuration serveur.');
  return new Stripe(cle);
}

export async function creerPaiement(compte: string, pack: unknown, tentative: unknown, stockage: StockageCarriere) {
  if (typeof pack !== 'string' || !Object.hasOwn(OFFRES_OVAS, pack)) throw new Error('Recharge inconnue.');
  if (typeof tentative !== 'string' || !/^[a-f0-9-]{36}$/i.test(tentative)) throw new Error('Identifiant d’achat invalide.');
  if (!stockage.crediterAchat || !await stockage.boutique(compte)) throw new Error('Synchronisez votre boutique avec votre compte avant de payer.');
  if (process.env.VERCEL && !process.env.APP_URL) throw new Error('Adresse publique de la boutique non configurée.');
  const origine = new URL(process.env.APP_URL || 'http://localhost:5173');
  if (origine.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(origine.hostname)) throw new Error('Adresse publique de la boutique invalide.');
  const offre = OFFRES_OVAS[pack as keyof typeof OFFRES_OVAS];
  const session = await clientStripe().checkout.sessions.create({
    mode: 'payment',
    // Le jeu n'accepte pour l'instant que les clés de test. Managed Payments
    // est activé par défaut sur certains comptes et impose alors un code fiscal
    // produit : ne pas en inventer un pour une recharge de test.
    managed_payments: { enabled: false },
    client_reference_id: compte,
    metadata: { compte, pack, ovas: String(offre.ovas), application: 'destiny-rugby' },
    line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: offre.centimes,
      product_data: { name: `${offre.ovas} Ovas — Destiny Rugby (test)` } } }],
    success_url: `${origine.origin}/?paiement=retour&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origine.origin}/?paiement=annule`,
    integration_identifier: 'destiny_rugby_ovas_qmzptvka',
  }, { idempotencyKey: `ovas:${compte}:${tentative}` });
  if (!session.url) throw new Error('La page de paiement est indisponible.');
  return { url: session.url };
}

/** Seul un événement signé et payé peut créditer le compte. Le retour navigateur ne crédite rien. */
export async function traiterEvenementStripe(event: Stripe.Event, stockage: StockageCarriere) {
  if (event.livemode) throw new Error('Ce serveur accepte uniquement les paiements de test.');
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
