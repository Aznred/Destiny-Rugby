import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Stripe from 'stripe';
import { stockageFichier } from '../serveur/carriereFichier';
import { OFFRES_BUNDLES, OFFRES_CREDITS, configurationStripe, diagnosticErreurStripe, traiterEvenementStripe, recevoirWebhookStripe } from '../serveur/paiementsStripe';
import { BUNDLES, PACKS } from '../src/data/boutique';
import type { EtatBoutiqueCompte } from '../src/lib/boutiqueCompte';

const dossier=mkdtempSync(join(tmpdir(),'destiny-paiements-'));
try {
  assert.deepEqual(Object.fromEntries(Object.entries(OFFRES_CREDITS).map(([id,o]) => [id,{credits:o.credits,centimes:o.centimes}])), {
    p1:{credits:100,centimes:99}, p2:{credits:600,centimes:499}, p3:{credits:1400,centimes:999},
    p4:{credits:4000,centimes:2499}, p5:{credits:9000,centimes:4999}, p6:{credits:20000,centimes:9999},
  }, 'Le catalogue Stripe contient les six recharges de CRÉDITS annoncées, jusqu’à 99,99 € — et plus aucune d’Ovas.');
  assert.equal(PACKS.length,Object.keys(OFFRES_CREDITS).length,'La boutique et Stripe affichent le même nombre de recharges.');
  for (const pack of PACKS) {
    const offre=OFFRES_CREDITS[pack.id as keyof typeof OFFRES_CREDITS];
    const centimes=Number(pack.prix.replace(/[^\d]/g,''));
    assert.deepEqual({credits:pack.credits,centimes},{credits:offre.credits,centimes:offre.centimes},`La recharge ${pack.id} affiche exactement le montant facturé.`);
    assert.equal(pack.ballons,undefined,'Une recharge classique ne contient pas de cosmétique.');
    assert.equal(pack.equipements,undefined,'Une recharge classique ne contient pas d’équipement.');
    assert.equal(pack.traits,undefined,'Une recharge classique ne contient pas de trait.');
  }
  assert.equal(BUNDLES.length,Object.keys(OFFRES_BUNDLES).length,'La boutique et Stripe affichent le même nombre de bundles séparés.');
  for (const pack of BUNDLES) {
    const offre=OFFRES_BUNDLES[pack.id as keyof typeof OFFRES_BUNDLES];
    const centimes=Number(pack.prix.replace(/[^\d]/g,''));
    assert.deepEqual({credits:pack.credits,centimes},{credits:offre.credits,centimes:offre.centimes},`Le bundle ${pack.id} affiche exactement le montant facturé.`);
    assert.deepEqual(pack.ballons ?? [],'inventaire' in offre ? offre.inventaire : [],`Les ballons du bundle ${pack.id} correspondent au serveur.`);
    assert.deepEqual(pack.equipements ?? [],'equipements' in offre ? offre.equipements : [],`Les équipements du bundle ${pack.id} correspondent au serveur.`);
    assert.deepEqual(pack.traits ?? [],'traitsDebloques' in offre ? offre.traitsDebloques : [],`Les traits du bundle ${pack.id} correspondent au serveur.`);
  }
  process.env.STRIPE_MODE='test';
  process.env.STRIPE_SECRET_KEY='sk_test_fixture_sans_acces_reseau';
  process.env.STRIPE_WEBHOOK_SECRET='whsec_fixture_locale';
  delete process.env.STRIPE_PRODUCT_TAX_CODE;
  const stockage=stockageFichier(join(dossier,'test.json'));
  const boutique={ovas:25,achatsOvas:0,credits:7,achatsCredits:0,collectionSolo:{quantites:{},packsOuverts:{},doublons:0}} as unknown as EtatBoutiqueCompte;
  await stockage.sauvegarderBoutique('compte-test',boutique);
  const evenement={id:'evt_test',type:'checkout.session.completed',livemode:false,data:{object:{
    id:'cs_test_fixture',mode:'payment',payment_status:'paid',currency:'eur',amount_total:499,
    client_reference_id:'compte-test',metadata:{compte:'compte-test',pack:'p2',credits:'600',application:'destiny-rugby'},
  }}} as unknown as Stripe.Event;
  await traiterEvenementStripe(evenement,stockage);
  await traiterEvenementStripe(evenement,stockage);
  await traiterEvenementStripe({...evenement,type:'checkout.session.async_payment_succeeded'} as Stripe.Event,stockage);
  assert.equal((await stockage.boutique('compte-test'))?.credits,607,'Un seul crédit malgré les doublons.');
  assert.equal((await stockage.boutique('compte-test'))?.ovas,25,'L’argent réel ne crédite JAMAIS d’Ovas.');
  assert.deepEqual((await stockage.boutique('compte-test'))?.inventaire,[],'Une recharge classique ne débloque aucun ballon.');
  assert.deepEqual((await stockage.boutique('compte-test'))?.equipements,[],'Une recharge classique ne débloque aucun cosmétique.');
  const bundleTrait=structuredClone(evenement);
  Object.assign(bundleTrait.data.object,{
    id:'cs_bundle_trait',amount_total:1999,
    metadata:{compte:'compte-test',pack:'b3',credits:'1000',application:'destiny-rugby'},
  });
  await traiterEvenementStripe(bundleTrait,stockage);
  await traiterEvenementStripe(bundleTrait,stockage);
  assert.equal((await stockage.boutique('compte-test'))?.credits,1607,'Le bundle séparé est crédité une seule fois.');
  assert.deepEqual((await stockage.boutique('compte-test'))?.inventaire,['ocean','or'],'Les ballons du bundle sont réunis sans doublon.');
  assert.deepEqual((await stockage.boutique('compte-test'))?.equipements,['maillot-toulousain','crampons-dupont','casque-or'],'Les équipements du bundle sont réunis.');
  assert.deepEqual((await stockage.boutique('compte-test'))?.traitsDebloques,['precoce','tete_brulee','cadre','cerveau'],'Les traits inclus sont débloqués par le webhook.');
  await stockage.sauvegarderBoutique('compte-test',{...boutique,ovas:20,credits:2});
  assert.equal((await stockage.boutique('compte-test'))?.credits,1602,'Une sauvegarde antérieure au webhook préserve les Crédits achetés (la dépense locale se retranche).');
  assert.equal((await stockage.boutique('compte-test'))?.ovas,20,'Les Ovas ne sont pas touchés par un paiement.');
  assert.deepEqual((await stockage.boutique('compte-test'))?.inventaire,['ocean','or'],'Une ancienne sauvegarde préserve les ballons achetés.');
  assert.deepEqual((await stockage.boutique('compte-test'))?.equipements,['maillot-toulousain','crampons-dupont','casque-or'],'Une ancienne sauvegarde préserve les cosmétiques achetés.');
  assert.deepEqual((await stockage.boutique('compte-test'))?.traitsDebloques,['precoce','tete_brulee','cadre','cerveau'],'Une ancienne sauvegarde préserve les traits achetés.');
  assert.equal(await stockage.achatCredite!('cs_test_fixture','autre-compte'),false);
  await assert.rejects(traiterEvenementStripe({...evenement,livemode:true},stockage));
  const ancien=structuredClone(evenement); Object.assign(ancien.data.object,{id:'cs_ancien',metadata:{compte:'compte-test',pack:'p2',ovas:'3000',application:'destiny-rugby'}});
  await assert.rejects(traiterEvenementStripe(ancien,stockage),/ne correspondant pas/);
  const faux=structuredClone(evenement); (faux.data.object as Stripe.Checkout.Session).amount_total=1;
  await assert.rejects(traiterEvenementStripe(faux,stockage));
  const impaye=structuredClone(evenement); Object.assign(impaye.data.object,{id:'cs_impaye',payment_status:'unpaid'});
  await traiterEvenementStripe(impaye,stockage);
  assert.equal(await stockage.achatCredite!('cs_impaye','compte-test'),false);
  const brut=Buffer.from(JSON.stringify(evenement));
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
  const signature=stripe.webhooks.generateTestHeaderString({payload:brut.toString(),secret:process.env.STRIPE_WEBHOOK_SECRET});
  await recevoirWebhookStripe(brut,signature,stockage);
  await assert.rejects(recevoirWebhookStripe(Buffer.from('{}'),signature,stockage));
  const permission=diagnosticErreurStripe(new Stripe.errors.StripePermissionError({message:'permission refusée'}));
  assert.match(permission?.message ?? '', /Checkout Sessions : Write/);
  const authentification=diagnosticErreurStripe(new Stripe.errors.StripeAuthenticationError({message:'clé refusée'}));
  assert.match(authentification?.message ?? '', /rk_live_/);
  assert.equal(configurationStripe().mode,'test');
  process.env.STRIPE_MODE='live'; process.env.STRIPE_SECRET_KEY='rk_live_fixture_sans_acces_reseau';
  delete process.env.STRIPE_PRODUCT_TAX_CODE;
  assert.throws(configurationStripe,/STRIPE_PRODUCT_TAX_CODE/);
  process.env.STRIPE_PRODUCT_TAX_CODE='txcd_10201003';
  assert.equal(configurationStripe().mode,'live');
  const relu=stockageFichier(join(dossier,'test.json'));
  assert.equal(await relu.achatCredite!('cs_test_fixture','compte-test'),true);
  console.log('OK — webhook signé, paiement différé, doublons, refus des montants faux et conservation des Crédits.');
} finally { rmSync(dossier,{recursive:true,force:true}); }
