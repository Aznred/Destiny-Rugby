// BANC DES PROPOSITIONS DE CARTES DE LA COLLECTION (Correctif 26)
//
// Le vrai gestionnaire HTTP devant le stockage fichier, deux comptes et un troisième larron :
//   1. une proposition envoyée est REÇUE (suivi du destinataire) et reste visible de son auteur ;
//   2. rien ne change de main avant l'acceptation ; à l'acceptation, les deux inventaires bougent et le nombre total
//      d'exemplaires de chaque carte ne change jamais (aucune duplication) ;
//   3. refus, retrait, annulation ; une carte promise ne peut pas l'être deux fois ; un tiers ne peut rien forcer ;
//   4. chaque réponse porte son delta (`tradeCreated`, `tradeProposed`…) : l'écran n'a rien à recharger.
//
//   npm run verify:propositions-collection

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { creerGestionnaireCarriere } from '../serveur/carriereApi';
import { stockageFichier } from '../serveur/carriereFichier';
import { catalogueBaseCarriere } from '../src/lib/ligue/catalogueCarriere';
import { cleCarteSolo } from '../src/lib/collectionSolo';
import { appliquerDeltaEchange, cartesEngagees, doublonsLibres, type DeltaEchangeSolo, type PageOffresSolo } from '../src/lib/echangesSolo';
import type { EtatBoutiqueCompte } from '../src/lib/boutiqueCompte';

const fichier = path.join(os.tmpdir(), `destiny-propositions-${process.pid}.json`);
const stockage = stockageFichier(fichier);
const gestionnaire = creerGestionnaireCarriere(stockage);
let controles = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); controles++; };
const egal = <T>(a: T, b: T, message: string) => { assert.deepEqual(a, b, message); controles++; };

/** Un appel HTTP au gestionnaire, cookie de session compris. */
async function appel(methode: 'GET' | 'POST', requete: string, corps?: unknown, cookie = ''): Promise<{ statut: number; corps: any; cookie: string }> {
  const entetes: Record<string, string> = {};
  let statut = 200;
  let recu: unknown;
  const res = {
    setHeader(nom: string, valeur: string | string[]) { entetes[nom.toLowerCase()] = Array.isArray(valeur) ? valeur.join(',') : String(valeur); return res; },
    getHeader(nom: string) { return entetes[nom.toLowerCase()]; },
    status(code: number) { statut = code; return res; },
    json(valeur: unknown) { recu = valeur; return res; },
    send(valeur: unknown) { recu = valeur; return res; },
    end(valeur?: unknown) { if (valeur !== undefined) recu = valeur; return res; },
  };
  const req = {
    method: methode, url: `/api/carriere${requete}`,
    headers: { cookie, host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
    body: corps, socket: { remoteAddress: '127.0.0.1' },
  };
  await gestionnaire.handler(req as never, res as never);
  const pose = entetes['set-cookie']?.split(';')[0] ?? cookie;
  return { statut, corps: recu, cookie: pose };
}

async function inscrire(identifiant: string): Promise<{ cookie: string; id: string; pseudo: string }> {
  const r = await appel('POST', '', { action: 'inscription', identifiant, pseudo: identifiant, motDePasse: 'un-mot-de-passe-long-26', confirmationMotDePasse: 'un-mot-de-passe-long-26' });
  assert.equal(r.statut, 200, `inscription ${identifiant} : ${JSON.stringify(r.corps)}`);
  return { cookie: r.cookie, id: r.corps.compte.id, pseudo: r.corps.compte.pseudo };
}

const [c1, c2, c3, c4] = catalogueBaseCarriere().slice(0, 4).map(c => cleCarteSolo(c.sourceId));
const coffre = (quantites: Record<string, number>, revision = 1): EtatBoutiqueCompte => ({
  ovas: 0, achatsOvas: 0, credits: 0, achatsCredits: 0, cosmetiquesMeta: {}, inventaire: [], skinActif: 'classique',
  equipements: [], equipementActif: {}, traitsDebloques: [],
  collectionSolo: { quantites, packsOuverts: {}, doublons: Object.values(quantites).reduce((n, q) => n + Math.max(0, q - 1), 0), revision },
} as unknown as EtatBoutiqueCompte);

try {
  const alice = await inscrire('alice26');
  const bruno = await inscrire('bruno26');
  const carla = await inscrire('carla26');
  // Les coffres : Alice a c1 ×3 et c2 ×2 ; Bruno c3 ×3 ; Carla c4 ×2.
  await stockage.sauvegarderBoutique(alice.id, coffre({ [c1]: 3, [c2]: 2 }));
  await stockage.sauvegarderBoutique(bruno.id, coffre({ [c3]: 3 }));
  await stockage.sauvegarderBoutique(carla.id, coffre({ [c4]: 2 }));
  const quantites = async (compte: string) => (await stockage.boutique(compte))!.collectionSolo.quantites;
  /** Tous les exemplaires d'une carte : dans les collections ET sous séquestre dans les offres ouvertes. */
  const exemplaires = async (cle: string) => {
    let n = 0;
    for (const c of [alice, bruno, carla]) n += (await quantites(c.id))[cle] ?? 0;
    const pages = (await appel('GET', '?echangesSolo=1&offset=0', undefined, alice.cookie)).corps as PageOffresSolo;
    for (const o of pages.offres) if (o.statut === 'ouverte') n += o.offertes[cle] ?? 0;
    return n;
  };
  const totaux = { [c1]: 3, [c2]: 2, [c3]: 3, [c4]: 2 };
  const verifierTotaux = async (quand: string) => {
    for (const [cle, attendu] of Object.entries(totaux)) egal(await exemplaires(cle), attendu, `${quand} : ${attendu} exemplaires de ${cle}, ni plus ni moins`);
  };

  // ── 1. Alice publie une offre libre : c1 contre ce qu'on voudra bien lui proposer.
  let r = await appel('POST', '', { action: 'creerOffreSolo', offertes: { [c1]: 1 }, souhaitees: {} }, alice.cookie);
  egal(r.statut, 200, `création de l'offre : ${JSON.stringify(r.corps)}`);
  const creation = r.corps.delta as DeltaEchangeSolo;
  egal(creation.evenement, 'tradeCreated', 'la création annonce « tradeCreated »');
  ok(creation.offre && creation.offre.id === creation.offreId && creation.offre.compteId === alice.id, "le delta porte l'offre créée");
  egal(r.corps.boutique.collectionSolo.quantites[c1], 2, "la carte offerte est séquestrée : il en reste deux chez Alice");
  const offreId = creation.offreId;
  await verifierTotaux('après la création');

  // ── 2. Bruno propose c3. Rien ne bouge : la carte reste chez lui.
  r = await appel('POST', '', { action: 'proposerOffreSolo', offre: offreId, cartes: { [c3]: 1 } }, bruno.cookie);
  egal(r.statut, 200, `proposition de Bruno : ${JSON.stringify(r.corps)}`);
  const proposee = r.corps.delta as DeltaEchangeSolo;
  egal(proposee.evenement, 'tradeProposed', 'la proposition annonce « tradeProposed »');
  egal((await quantites(bruno.id))[c3], 3, "une proposition ne transfère rien : Bruno garde ses trois c3");
  egal(proposee.suivi?.envoyees.length, 1, "Bruno retrouve sa proposition dans « envoyées »");
  egal(proposee.offre?.propositions.length, 1, "Bruno voit SA proposition sur l'offre");
  await verifierTotaux('après la proposition');

  // ── 3. Alice la REÇOIT, sans chercher dans la liste.
  let page = (await appel('GET', '?echangesSolo=1&offset=0', undefined, alice.cookie)).corps as PageOffresSolo;
  egal(page.suivi?.recues.length, 1, 'Alice a une offre avec une proposition reçue');
  const recue = page.suivi!.recues[0].propositions[0];
  egal(recue.pseudo, bruno.pseudo, 'la proposition reçue nomme son auteur');
  egal(recue.cartes, { [c3]: 1 }, 'la proposition reçue montre les cartes proposées');
  ok(Number.isFinite(Date.parse(recue.creeLe)), 'la proposition reçue est datée');

  // ── 4. Carla, tierce, ne voit pas la proposition de Bruno et ne peut ni l'accepter ni la refuser.
  page = (await appel('GET', '?echangesSolo=1&offset=0', undefined, carla.cookie)).corps as PageOffresSolo;
  egal(page.offres.find(o => o.id === offreId)?.propositions.length, 0, "un tiers ne voit pas les propositions des autres");
  egal(page.suivi?.recues.length, 0, 'un tiers ne reçoit rien');
  r = await appel('POST', '', { action: 'accepterOffreSolo', offre: offreId, proposition: recue.id }, carla.cookie);
  ok(r.statut >= 400, "un tiers ne peut pas accepter la proposition d'un autre");
  r = await appel('POST', '', { action: 'refuserOffreSolo', offre: offreId, proposition: recue.id }, carla.cookie);
  ok(r.statut >= 400, "un tiers ne peut pas refuser la proposition d'un autre");
  r = await appel('POST', '', { action: 'retirerPropositionSolo', offre: offreId }, carla.cookie);
  ok(r.statut >= 400, "on ne retire pas une proposition qu'on n'a pas faite");

  // ── 5. Une carte promise ne se promet pas deux fois ; une carte non possédée ne se propose pas.
  r = await appel('POST', '', { action: 'creerOffreSolo', offertes: { [c4]: 1 }, souhaitees: {} }, carla.cookie);
  egal(r.statut, 200, "Carla publie son offre");
  const offreCarla = (r.corps.delta as DeltaEchangeSolo).offreId;
  r = await appel('POST', '', { action: 'proposerOffreSolo', offre: offreCarla, cartes: { [c3]: 2 } }, bruno.cookie);
  egal(r.statut, 409, "c3 ×2 chez Carla alors qu'un c3 est déjà promis à Alice : refusé (il ne resterait pas d'exemplaire)");
  r = await appel('POST', '', { action: 'proposerOffreSolo', offre: offreCarla, cartes: { [c3]: 1 } }, bruno.cookie);
  egal(r.statut, 200, 'un second c3, encore libre, se propose ailleurs');
  r = await appel('POST', '', { action: 'proposerOffreSolo', offre: offreCarla, cartes: { [c2]: 1 } }, bruno.cookie);
  ok(r.statut >= 400, 'une seconde proposition sur la même offre, avec une carte non possédée, est refusée');
  r = await appel('POST', '', { action: 'proposerOffreSolo', offre: offreId, cartes: { [c2]: 1 } }, carla.cookie);
  ok(r.statut >= 400, "Carla ne possède pas c2 : elle ne peut pas le proposer");
  r = await appel('POST', '', { action: 'proposerOffreSolo', offre: offreId, cartes: { [c1]: 1 } }, alice.cookie);
  ok(r.statut >= 400, "on ne fait pas de proposition sur sa propre offre");
  r = await appel('POST', '', { action: 'proposerOffreSolo', offre: offreId, cartes: { 'joueur:inconnu': 1 } }, bruno.cookie);
  ok(r.statut >= 400, "une carte qui n'existe pas n'est pas échangeable");
  await verifierTotaux('après les tentatives refusées');

  // ── 6. Bruno retire sa proposition chez Carla : elle disparaît des deux côtés.
  r = await appel('POST', '', { action: 'retirerPropositionSolo', offre: offreCarla }, bruno.cookie);
  egal(r.statut, 200, `retrait : ${JSON.stringify(r.corps)}`);
  egal((r.corps.delta as DeltaEchangeSolo).evenement, 'tradeWithdrawn', 'le retrait annonce « tradeWithdrawn »');
  egal((r.corps.delta as DeltaEchangeSolo).suivi?.envoyees.length, 1, 'il ne reste à Bruno que sa proposition chez Alice');
  page = (await appel('GET', '?echangesSolo=1&offset=0', undefined, carla.cookie)).corps as PageOffresSolo;
  egal(page.suivi?.recues.length, 0, 'Carla ne voit plus la proposition retirée');

  // ── 7. Alice accepte : les deux inventaires bougent, une seule fois.
  r = await appel('POST', '', { action: 'accepterOffreSolo', offre: offreId, proposition: recue.id }, alice.cookie);
  egal(r.statut, 200, `acceptation : ${JSON.stringify(r.corps)}`);
  const acceptee = r.corps.delta as DeltaEchangeSolo;
  egal(acceptee.evenement, 'tradeAccepted', "l'acceptation annonce « tradeAccepted »");
  egal(acceptee.offre?.statut, 'acceptee', "l'offre est conclue");
  egal(r.corps.boutique.collectionSolo.quantites[c3], 1, "Alice reçoit le c3 dans la réponse, sans recharger sa collection");
  egal(await quantites(alice.id), { [c1]: 2, [c2]: 2, [c3]: 1 }, 'inventaire d’Alice après l’échange');
  egal(await quantites(bruno.id), { [c3]: 2, [c1]: 1 }, 'inventaire de Bruno après l’échange');
  await verifierTotaux("après l'acceptation");
  r = await appel('POST', '', { action: 'accepterOffreSolo', offre: offreId, proposition: recue.id }, alice.cookie);
  ok(r.statut >= 400, 'un second appui sur « Accepter » ne rejoue pas l’échange');
  egal(await quantites(bruno.id), { [c3]: 2, [c1]: 1 }, 'le double appui ne donne rien de plus à Bruno');
  await verifierTotaux('après le double appui');

  // ── 8. Bruno apprend l'échange à sa prochaine lecture : sa collection arrive avec la liste.
  page = (await appel('GET', '?echangesSolo=1&offset=0&rev=1', undefined, bruno.cookie)).corps as PageOffresSolo;
  egal(page.collectionSolo?.quantites, { [c3]: 2, [c1]: 1 }, "la collection à jour accompagne la liste quand celle de l'écran est plus ancienne");
  egal(page.suivi?.envoyees.length, 0, 'plus aucune proposition en attente pour Bruno');
  const aJour = (await appel('GET', `?echangesSolo=1&offset=0&rev=${page.collectionSolo!.revision}`, undefined, bruno.cookie)).corps as PageOffresSolo;
  egal(aJour.collectionSolo, undefined, 'une collection déjà à jour ne voyage pas');

  // ── 9. Refus, puis annulation : les cartes séquestrées reviennent.
  r = await appel('POST', '', { action: 'proposerOffreSolo', offre: offreCarla, cartes: { [c2]: 1 } }, alice.cookie);
  egal(r.statut, 200, 'Alice propose c2 à Carla');
  page = (await appel('GET', '?echangesSolo=1&offset=0', undefined, carla.cookie)).corps as PageOffresSolo;
  const aRefuser = page.suivi!.recues[0].propositions[0];
  r = await appel('POST', '', { action: 'refuserOffreSolo', offre: offreCarla, proposition: aRefuser.id }, carla.cookie);
  egal(r.statut, 200, 'Carla refuse');
  egal((r.corps.delta as DeltaEchangeSolo).evenement, 'tradeRefused', 'le refus annonce « tradeRefused »');
  egal((await quantites(alice.id))[c2], 2, "un refus ne coûte rien à celui qui proposait");
  page = (await appel('GET', '?echangesSolo=1&offset=0', undefined, alice.cookie)).corps as PageOffresSolo;
  egal(page.suivi?.envoyees.length, 0, 'la proposition refusée quitte « envoyées »');
  r = await appel('POST', '', { action: 'annulerOffreSolo', offre: offreCarla }, carla.cookie);
  egal(r.statut, 200, 'Carla retire son offre');
  egal((r.corps.delta as DeltaEchangeSolo).evenement, 'tradeCancelled', "l'annulation annonce « tradeCancelled »");
  egal((await quantites(carla.id))[c4], 2, 'la carte séquestrée revient chez Carla');
  await verifierTotaux("après le refus et l'annulation");

  // ── 10. Une proposition dont l'auteur n'a plus les cartes est retirée au lieu d'échouer indéfiniment.
  r = await appel('POST', '', { action: 'creerOffreSolo', offertes: { [c1]: 1 }, souhaitees: {} }, alice.cookie);
  const offre2 = (r.corps.delta as DeltaEchangeSolo).offreId;
  r = await appel('POST', '', { action: 'proposerOffreSolo', offre: offre2, cartes: { [c3]: 1 } }, bruno.cookie);
  egal(r.statut, 200, 'Bruno propose son dernier doublon de c3');
  // Il l'a perdu entre-temps (révision plus récente : le coffre ne garde jamais une collection plus ancienne).
  await stockage.sauvegarderBoutique(bruno.id, coffre({ [c3]: 1, [c1]: 1 }, 99));
  page = (await appel('GET', '?echangesSolo=1&offset=0', undefined, alice.cookie)).corps as PageOffresSolo;
  const morte = page.suivi!.recues[0].propositions[0];
  r = await appel('POST', '', { action: 'accepterOffreSolo', offre: offre2, proposition: morte.id }, alice.cookie);
  egal(r.statut, 409, "l'échange est refusé : Bruno n'a plus la carte");
  page = (await appel('GET', '?echangesSolo=1&offset=0', undefined, alice.cookie)).corps as PageOffresSolo;
  egal(page.suivi?.recues.length, 0, 'la proposition morte a été retirée');
  egal((await quantites(alice.id))[c1], 1, "rien n'a été transféré");

  // ── 11. Les fonctions pures de l'écran.
  const page0: PageOffresSolo = { offres: [], total: 0 };
  const apresCreation = appliquerDeltaEchange(page0, creation, alice.id);
  egal([apresCreation.offres.length, apresCreation.total], [1, 1], "« tradeCreated » ajoute l'offre en tête sans rien recharger");
  const apresProposition = appliquerDeltaEchange(apresCreation, proposee, bruno.id);
  egal(apresProposition.offres[0].propositions.length, 1, "« tradeProposed » remplace l'offre par sa version à jour");
  const chezBruno = appliquerDeltaEchange(apresProposition, acceptee, bruno.id);
  egal([chezBruno.offres.length, chezBruno.total], [0, 0], "une offre conclue quitte la liste de celui qui n'en est pas l'auteur");
  const chezAlice = appliquerDeltaEchange(apresProposition, acceptee, alice.id);
  egal(chezAlice.offres[0]?.statut, 'acceptee', "son auteur la garde, marquée conclue");
  const engagees = cartesEngagees(proposee.suivi, bruno.id);
  egal(engagees, { [c3]: 1 }, 'les cartes engagées se lisent dans le suivi');
  const collection = coffre({ [c3]: 3 }).collectionSolo;
  ok(doublonsLibres(collection, { [c3]: 1 }, engagees), 'un doublon reste proposable tant qu’il en reste un de libre');
  ok(!doublonsLibres(collection, { [c3]: 2 }, engagees), 'on ne propose pas son dernier exemplaire');

  console.log(`Propositions de cartes de la Collection : ${controles} contrôles, OK`);
} finally {
  try { fs.rmSync(fichier, { force: true }); } catch { /* fichier temporaire */ }
}
