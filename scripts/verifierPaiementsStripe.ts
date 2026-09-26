import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Stripe from 'stripe';
import { stockageFichier } from '../serveur/carriereFichier';
import { traiterEvenementStripe, recevoirWebhookStripe } from '../serveur/paiementsStripe';
import type { EtatBoutiqueCompte } from '../src/lib/boutiqueCompte';

const dossier=mkdtempSync(join(tmpdir(),'destiny-paiements-'));
try {
  const stockage=stockageFichier(join(dossier,'test.json'));
  const boutique={ovas:25,achatsOvas:0} as EtatBoutiqueCompte;
  await stockage.sauvegarderBoutique('compte-test',boutique);
  const evenement={id:'evt_test',type:'checkout.session.completed',livemode:false,data:{object:{
    id:'cs_test_fixture',mode:'payment',payment_status:'paid',currency:'eur',amount_total:499,
    client_reference_id:'compte-test',metadata:{compte:'compte-test',pack:'p2',ovas:'550',application:'destiny-rugby'},
  }}} as unknown as Stripe.Event;
  await traiterEvenementStripe(evenement,stockage);
  await traiterEvenementStripe(evenement,stockage);
  await traiterEvenementStripe({...evenement,type:'checkout.session.async_payment_succeeded'} as Stripe.Event,stockage);
  assert.equal((await stockage.boutique('compte-test'))?.ovas,575,'Un seul crédit malgré les doublons.');
  await stockage.sauvegarderBoutique('compte-test',{...boutique,ovas:20});
  assert.equal((await stockage.boutique('compte-test'))?.ovas,570,'Une sauvegarde antérieure au webhook préserve l’achat.');
  assert.equal(await stockage.achatCredite!('cs_test_fixture','autre-compte'),false);
  await assert.rejects(traiterEvenementStripe({...evenement,livemode:true},stockage));
  const faux=structuredClone(evenement); (faux.data.object as Stripe.Checkout.Session).amount_total=1;
  await assert.rejects(traiterEvenementStripe(faux,stockage));
  const impaye=structuredClone(evenement); Object.assign(impaye.data.object,{id:'cs_impaye',payment_status:'unpaid'});
  await traiterEvenementStripe(impaye,stockage);
  assert.equal(await stockage.achatCredite!('cs_impaye','compte-test'),false);
  process.env.STRIPE_SECRET_KEY='sk_test_fixture_sans_acces_reseau';
  process.env.STRIPE_WEBHOOK_SECRET='whsec_fixture_locale';
  const brut=Buffer.from(JSON.stringify(evenement));
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
  const signature=stripe.webhooks.generateTestHeaderString({payload:brut.toString(),secret:process.env.STRIPE_WEBHOOK_SECRET});
  await recevoirWebhookStripe(brut,signature,stockage);
  await assert.rejects(recevoirWebhookStripe(Buffer.from('{}'),signature,stockage));
  const relu=stockageFichier(join(dossier,'test.json'));
  assert.equal(await relu.achatCredite!('cs_test_fixture','compte-test'),true);
  console.log('OK — webhook signé, paiement différé, doublons, refus des montants faux et conservation des Ovas.');
} finally { rmSync(dossier,{recursive:true,force:true}); }
