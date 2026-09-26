import type { IncomingMessage, ServerResponse } from 'node:http';
import { stockageNeon } from '../serveur/carriereStockage.js';
import { recevoirWebhookStripe } from '../serveur/paiementsStripe.js';

export const config = { api: { bodyParser: false } };
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.statusCode = 405; return res.end(); }
  if (!process.env.DATABASE_URL || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) { res.statusCode = 503; return res.end('Paiements non configurés'); }
  const morceaux: Buffer[] = []; let taille = 0;
  for await (const morceau of req) {
    const b = Buffer.from(morceau); taille += b.length;
    if (taille > 1_048_576) { res.statusCode = 413; return res.end(); }
    morceaux.push(b);
  }
  try {
    await recevoirWebhookStripe(Buffer.concat(morceaux), String(req.headers['stripe-signature'] ?? ''), stockageNeon(process.env.DATABASE_URL));
    res.statusCode = 200; res.end('ok');
  } catch (erreur) {
    // Une panne de stockage doit être retentée par Stripe, contrairement à une signature invalide.
    res.statusCode = (erreur as { type?: string }).type === 'StripeSignatureVerificationError' ? 400 : 500;
    res.end('Notification non traitée');
  }
}
