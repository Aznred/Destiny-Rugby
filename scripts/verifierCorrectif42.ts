// BANC — CORRECTIF 42 : LES PUBLICITÉS RÉCOMPENSÉES ÉTENDUES
//
//   Ligue en ligne   — deux packs par jour, que le joueur passe par la carte « Pack Pub » ou par la fenêtre
//                      « pas assez d'Ovas » : un seul compteur.
//   Boutique Premium — cinq packs par jour, tirés par le serveur dans une roulette à part, ouverts une seule fois.
//   Cosmétiques      — une progression que seul le serveur fait avancer, un déblocage définitif, non répétable.
//
// Dans tous les cas : clic volontaire → publicité complète → reçu signé → récompense. Jamais l'inverse.
// Le banc joue de vraies requêtes contre le vrai gestionnaire HTTP, avec de vrais reçus signés, sur un stockage fichier.
//
//   npm run verify:correctif42

import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, unlinkSync, readFileSync } from 'node:fs';
import { stockageFichier } from '../serveur/carriereFichier';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { creerServicePublicites } from '../serveur/publicitesRecompensees';
import { contexteAtelier, validerConfigPublicites } from '../serveur/atelierAdmin';
import { CATALOGUE_ADMIN_VIDE } from '../src/lib/ligue/atelierCatalogue';
import {
  PUBLICITES_PAR_DEFAUT, chancesPacksPremium, completerConfigPublicites, famillePub, jourPublicites,
} from '../src/lib/publicitesRecompensees';
import { PACKS_CARRIERE } from '../src/lib/ligue/catalogueCarriere';
import { creerCarriere, agirCarriere } from '../src/lib/ligue/carriere';
import { EQUIPEMENT_PAR_ID } from '../src/data/boutique';
import type { EtatBoutiqueCompte } from '../src/lib/boutiqueCompte';

let controles = 0;
const egal = (a: unknown, b: unknown, message: string) => { assert.deepEqual(a, b, message); controles++; };
const ok = (a: unknown, message: string) => { assert.ok(a, message); controles++; };
const maintenant = Date.now(), fichier = `node_modules/.tmp/correctif42-${randomUUID()}.json`;
mkdirSync('node_modules/.tmp', { recursive: true });
const secretAvant = process.env.APPLIXIR_CALLBACK_SECRET;
process.env.APPLIXIR_CALLBACK_SECRET = `banc-${randomUUID()}`;
const key = PUBLICITES_PAR_DEFAUT.apiKey;
let db = stockageFichier(fichier), api = creerGestionnaireCarriere(db);
// Un compte par usage : le serveur limite à soixante écritures publicitaires par minute et par compte.
const comptes = { ligue: randomUUID(), premium: randomUUID(), cosmetique: randomUUID(), voleur: randomUUID(), kiri: randomUUID() };
const coffre = (): EtatBoutiqueCompte => ({ ovas: 50, achatsOvas: 0, collectionSolo: { quantites: {}, packsOuverts: {}, doublons: 0, revision: 0 },
  inventaire: [], skinActif: 'cuir', equipements: [], equipementActif: {}, traitsDebloques: [] });
async function appel(jeton: string, chemin: string, body?: object) {
  let statut = 200, donnees: any;
  const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(x: unknown) { donnees = x; } };
  await api.handler({ method: body ? 'POST' : 'GET', url: `/api/carriere${chemin}`, headers: { host: 'localhost', origin: 'http://localhost',
    'content-type': 'application/json', cookie: jeton ? `destiny_carriere=${jeton}` : '' }, body }, res);
  return { statut, donnees };
}
const action = (jeton: string, operation: string, plus: object = {}) => appel(jeton, '?publicites=1', { action: 'publicites', operation, ...plus });
const vue = async (jeton: string, ligue?: string) => (await appel(jeton, `?publicites=1${ligue ? `&ligue=${ligue}` : ''}`)).donnees;
function signature(id: string, tid = randomUUID()) {
  const q = new URLSearchParams({ gameApiKey: key, gameId: '123', userId: id, tid });
  q.set('signature', createHash('md5').update(key + '123' + id + tid + process.env.APPLIXIR_CALLBACK_SECRET!).digest('hex'));
  return q;
}
const callback = (q: URLSearchParams) => appel('', `?applixirCallback=1&${q}`);
/** Une publicité entière : session, reçu signé, réclamation. Rend la session et la réponse de la réclamation. */
async function regarder(jeton: string, contexte: string, plus: object = {}) {
  const debut = await action(jeton, 'commencer', { contexte, ...plus });
  if (debut.statut !== 200) return { debut, statut: debut.statut };
  const id = debut.donnees.rewardSessionId as string;
  const recu = await callback(signature(id));
  const reclame = await action(jeton, 'reclamer', { rewardSessionId: id });
  return { debut, statut: 200, id, recu, reclame };
}

try {
  for (const [nom, id] of Object.entries(comptes)) {
    await db.creerCompte({ id, identifiant: nom === 'kiri' ? 'kiri' : `banc-${nom}`, pseudo: nom, empreinte: 'x' });
    await db.ouvrirSession(empreinteJeton(nom), id, maintenant + 3600000);
    await db.sauvegarderBoutique(id, coffre());
  }

  // ═══ 0. LES RÉGLAGES ═════════════════════════════════════════════════════════════════════════════════════
  const depart = await vue('premium');
  egal([depart.config.packsDailyLimit, depart.config.premiumDailyLimit], [2, 5], 'deux packs de ligue, cinq packs Premium par jour');
  egal(depart.config.leagueFallbackEnabled, true, 'la publicité est proposée quand il manque des Ovas en ligue');
  egal([depart.packsRestants, depart.premiumRestants], [2, 5], 'les deux compteurs partent pleins, séparément');
  ok(depart.chancesPremium.length > 3, `la roulette Premium a des packs (${depart.chancesPremium.length})`);
  ok(!depart.chancesPremium.some((c: any) => ['bronze', 'standard'].includes(c.pack.id)), 'Bronze et Argent ne sont pas des packs Premium');
  ok(Math.abs(depart.chancesPremium.reduce((n: number, c: any) => n + c.chance, 0) - 100) < 1e-6, 'ses chances sont publiées et font 100 %');
  egal(Object.keys(depart.cosmetiques).sort(), ['casque-rose', 'crampons-graffiti', 'maillot-italie', 'maillot-vannes'], 'quatre cosmétiques se débloquent par publicité');
  egal(depart.cosmetiques['crampons-graffiti'], { progres: 0, requis: 3, restantesAujourdhui: 2, debloque: false }, 'crampons : trois publicités, deux par jour');
  ok(Object.keys(PUBLICITES_PAR_DEFAUT.cosmetiques).every((id) => EQUIPEMENT_PAR_ID[id]?.parPub), 'ces quatre articles existent dans la boutique, sans prix');
  // La validation du Labo : un Labo d'avant n'envoie pas les nouveaux champs, et rien ne dépasse les bornes.
  const ancien = validerConfigPublicites({ enabled: true, mode: 'TEST', apiKey: key, ovasEnabled: true, rewardedAdOvasAmount: 4, ovasDailyLimit: 2, packsEnabled: true, packsDailyLimit: 2 });
  egal([ancien.premiumDailyLimit, ancien.premiumEnabled, ancien.leagueFallbackEnabled], [5, true, true], 'un Labo d’avant garde les réglages du jeu');
  assert.throws(() => validerConfigPublicites({ ...PUBLICITES_PAR_DEFAUT, premiumDailyLimit: 6 }), 'six packs Premium par jour sont refusés'); controles++;
  assert.throws(() => validerConfigPublicites({ ...PUBLICITES_PAR_DEFAUT, cosmetiques: { x: { actif: true, requis: 0, limiteJour: 1 } } }), 'zéro publicité requise est refusé'); controles++;
  assert.throws(() => validerConfigPublicites({ ...PUBLICITES_PAR_DEFAUT, cosmetiques: { x: { actif: 'oui', requis: 1, limiteJour: 1 } } }), 'activation non booléenne refusée'); controles++;
  egal(completerConfigPublicites({ cosmetiques: { 'casque-rose': { actif: false, requis: 2, limiteJour: 1 } } }).cosmetiques['casque-rose'].requis, 2, 'un réglage du Labo passe devant celui du jeu');
  egal(completerConfigPublicites(undefined).cosmetiques['maillot-vannes'].requis, 5, 'sans réglage, ceux du jeu');
  egal([famillePub('DAILY_PACK'), famillePub('SHOP_PREMIUM_PACK'), famillePub('COSMETIC'), famillePub('SHOP_OVAS')], ['LEAGUE', 'PREMIUM', 'COSMETIC', 'OVAS'], 'quatre usages, quatre lignes de statistiques');

  // La roulette Premium, sans serveur.
  const pack = (id: string, prix: number, plus: object = {}) => ({ ...PACKS_CARRIERE.find((p) => p.id === 'or')!, id, nom: id, prix, ...plus });
  const pool = [pack('bronze', 10), pack('standard', 30), pack('or', 100), pack('elite', 400), pack('ferme', 100, { endsAt: '2020-01-01T00:00:00Z' }), pack('cache', 100, { published: false })];
  const auto = chancesPacksPremium(pool, { premiumPacks: {} }, maintenant);
  egal(auto.map((c) => c.pack.id), ['or', 'elite'], 'automatique : ni Bronze, ni Argent, ni pack fermé ou dépublié');
  ok(auto[0].chance > auto[1].chance, 'le pack le plus cher est le plus rare');
  const regle = chancesPacksPremium(pool, { premiumPacks: { bronze: 1, or: 3, elite: 0, ferme: 9 } }, maintenant);
  egal(regle.map((c) => [c.pack.id, c.chance]), [['bronze', 25], ['or', 75]], 'les poids du Labo décident ; 0 exclut ; un pack fermé reste fermé');

  // ═══ 1. LA LIGUE : UN SEUL COMPTEUR POUR LES DEUX CHEMINS ════════════════════════════════════════════════
  const ligue = randomUUID();
  let etat = creerCarriere({ id: ligue, code: 'PUB42', nom: 'Banc 42', compteId: comptes.ligue, pseudo: 'Alice', clubNom: 'Club Test', maxClubs: 2, rythme: 3,
    packsGratuitsParJour: 0, packsActifs: ['bronze', 'standard', 'or'], doublonsAutorises: false }, maintenant, 'graine-42');
  etat = agirCarriere(etat, comptes.voleur, { type: 'rejoindre', pseudo: 'Bob', clubNom: 'Club Autre' }, maintenant, 'graine-join');
  await db.creerLigue({ id: ligue, code: 'PUB42', version: etat.version, comptes: [comptes.ligue, comptes.voleur], etat });
  egal((await vue('ligue', ligue)).packsRestants, 2, 'ligue : deux récompenses au départ');
  // Le Pack Pub ET la fenêtre « pas assez d'Ovas » envoient la même commande : contexte DAILY_PACK.
  const parLaCarte = await regarder('ligue', 'DAILY_PACK', { ligue });
  egal(parLaCarte.reclame!.donnees.statut, 'RESERVED', 'par la carte Pack Pub : un pack réservé');
  egal((await vue('ligue', ligue)).packsRestants, 1, 'il reste une récompense de ligue');
  const parLaFenetre = await regarder('ligue', 'DAILY_PACK', { ligue });
  egal(parLaFenetre.reclame!.donnees.statut, 'RESERVED', 'par la fenêtre « pas assez d’Ovas » : un second pack');
  egal((await vue('ligue', ligue)).packsRestants, 0, 'le même compteur est épuisé');
  const troisieme = await action('ligue', 'commencer', { contexte: 'DAILY_PACK', ligue });
  egal(troisieme.statut, 400, 'une troisième publicité de ligue est refusée');
  ok(/DAILY_LIMIT/.test(troisieme.donnees.erreur), 'et le refus dit que le plafond du jour est atteint');
  // ⚠️ Les cinq packs Premium ne sont pas entamés par les deux packs de ligue.
  egal((await vue('ligue')).premiumRestants, 5, 'les packs de ligue n’entament pas les packs Premium');
  ok((await vue('ligue', ligue)).enAttente.length === 2, 'les deux packs de ligue attendent leur ouverture');
  egal((await vue('ligue')).enAttente.length, 0, 'un pack de ligue ne se reprend que dans sa ligue');

  // ═══ 2. LA BOUTIQUE PREMIUM ══════════════════════════════════════════════════════════════════════════════
  const premier = await action('premium', 'commencer', { contexte: 'SHOP_PREMIUM_PACK' });
  egal(premier.statut, 200, 'session Premium créée');
  const pid = premier.donnees.rewardSessionId as string;
  egal((await action('premium', 'commencer', { contexte: 'COSMETIC', article: 'casque-rose' })).statut, 400, 'une seule publicité à la fois, tous usages confondus');
  egal((await action('premium', 'reclamer', { rewardSessionId: pid, pack: 'elite', videoComplete: true })).donnees.statut, 'PENDING', 'sans reçu signé, rien n’est gagné');
  egal((await action('premium', 'ouvrirPremium', { rewardSessionId: pid })).statut, 400, 'ni ouvert');
  egal((await callback(signature(pid))).statut, 200, 'le reçu signé valide la publicité');
  // Le joueur ferme son navigateur avant la roulette : le serveur redémarre, la récompense attend.
  db = stockageFichier(fichier); api = creerGestionnaireCarriere(db);
  const apresFermeture = await vue('premium');
  egal(apresFermeture.enAttente.map((r: any) => [r.rewardSessionId, r.contexte, r.rewardStatus]), [[pid, 'SHOP_PREMIUM_PACK', 'RESERVED']], 'à la reconnexion, la récompense non ouverte est là');
  const gagne = apresFermeture.enAttente[0].pack;
  ok(gagne?.id && !['bronze', 'standard'].includes(gagne.id), `le serveur a tiré un pack Premium (${gagne?.nom})`);
  ok(depart.chancesPremium.some((c: any) => c.pack.id === gagne.id), 'pris dans la roulette publiée');
  egal(apresFermeture.premiumRestants, 4, 'quatre packs Premium restants');
  egal((await action('premium', 'reclamer', { rewardSessionId: pid })).donnees.statut, 'RESERVED', 'réclamer rend le pack réservé (la roulette peut se jouer)');
  egal((await action('voleur', 'ouvrirPremium', { rewardSessionId: pid })).statut, 400, 'un autre compte ne peut pas l’ouvrir');
  const ouvertures = await Promise.all([action('premium', 'ouvrirPremium', { rewardSessionId: pid }), action('premium', 'ouvrirPremium', { rewardSessionId: pid })]);
  egal(ouvertures.map((r) => r.donnees.statut).sort(), ['ALREADY_CLAIMED', 'OPENED'], 'deux ouvertures simultanées : une seule rend le pack');
  egal(ouvertures.find((r) => r.donnees.statut === 'OPENED')!.donnees.pack.id, gagne.id, 'le pack ouvert est celui que le serveur avait tiré');
  ok(!ouvertures.find((r) => r.donnees.statut === 'ALREADY_CLAIMED')!.donnees.pack, 'la seconde ne reçoit aucun pack');
  egal((await vue('premium')).enAttente.length, 0, 'plus rien n’attend');
  for (let n = 2; n <= 5; n++) {
    const r = await regarder('premium', 'SHOP_PREMIUM_PACK');
    egal(r.reclame!.donnees.statut, 'RESERVED', `pack Premium n° ${n} du jour`);
    egal((await action('premium', 'ouvrirPremium', { rewardSessionId: r.id })).donnees.statut, 'OPENED', `et ouvert`);
  }
  egal((await vue('premium')).premiumRestants, 0, 'cinq packs Premium : le plafond du jour');
  egal((await action('premium', 'commencer', { contexte: 'SHOP_PREMIUM_PACK' })).statut, 400, 'le sixième est refusé');
  egal((await vue('premium')).ovasRestantes, 2, 'les packs Premium n’entament pas les Ovas');
  // Une publicité de ligue est encore possible pour ce compte : sept récompenses dans la journée, deux compteurs.
  await db.creerLigue({ id: randomUUID(), code: 'PUB42B', version: etat.version, comptes: [comptes.premium], etat: { ...etat, id: 'x', code: 'PUB42B' } }).catch(() => {});

  // ═══ 3. LES COSMÉTIQUES ══════════════════════════════════════════════════════════════════════════════════
  egal((await action('cosmetique', 'commencer', { contexte: 'COSMETIC' })).statut, 400, 'un cosmétique sans article est refusé');
  egal((await action('cosmetique', 'commencer', { contexte: 'COSMETIC', article: 'crampons-or' })).statut, 400, 'un article que le Labo n’a pas ouvert à la publicité est refusé');
  egal((await action('cosmetique', 'commencer', { contexte: 'COSMETIC', article: 'nimporte-quoi' })).statut, 400, 'un article inconnu aussi');
  // Une publicité → le casque, définitivement.
  const casque = await action('cosmetique', 'commencer', { contexte: 'COSMETIC', article: 'casque-rose' });
  egal(casque.statut, 200, 'session cosmétique créée');
  const cid = casque.donnees.rewardSessionId as string;
  egal((await action('cosmetique', 'reclamer', { rewardSessionId: cid, cosmetique: { debloque: true }, progres: 99 })).donnees.statut, 'PENDING', 'le navigateur ne peut pas déclarer sa progression');
  ok(!(await db.boutique(comptes.cosmetique))!.equipements.includes('casque-rose'), 'rien dans l’inventaire avant la validation');
  await callback(signature(cid));
  ok(!(await db.boutique(comptes.cosmetique))!.equipements.includes('casque-rose'), 'ni après le reçu seul : la réclamation fait avancer');
  const deux = await Promise.all([action('cosmetique', 'reclamer', { rewardSessionId: cid }), action('cosmetique', 'reclamer', { rewardSessionId: cid })]);
  egal(deux.map((r) => r.donnees.statut).sort(), ['ALREADY_CLAIMED', 'CLAIMED'], 'deux réclamations simultanées : un seul pas');
  egal(deux[0].donnees.cosmetique, { id: 'casque-rose', progres: 1, requis: 1, restantesAujourdhui: 0, debloque: true }, 'une publicité sur une : débloqué');
  const inventaire = (await db.boutique(comptes.cosmetique))!;
  ok(inventaire.equipements.includes('casque-rose') && inventaire.achatsEquipements?.includes('casque-rose'), 'le serveur a ajouté le casque au coffre du compte');
  // Une ancienne sauvegarde locale qui revient ne le fait pas disparaître.
  await db.sauvegarderBoutique(comptes.cosmetique, coffre());
  ok((await db.boutique(comptes.cosmetique))!.equipements.includes('casque-rose'), 'il survit à une ancienne sauvegarde locale');
  const refaire = await action('cosmetique', 'commencer', { contexte: 'COSMETIC', article: 'casque-rose' });
  egal(refaire.statut, 400, 'un objet acquis n’est pas répétable');
  ok(/déjà débloqué/.test(refaire.donnees.erreur), 'et le refus le dit');
  egal((await vue('cosmetique')).cosmetiques['casque-rose'], { progres: 1, requis: 1, restantesAujourdhui: 0, debloque: true }, 'la vue le montre acquis, sans publicité restante');
  // Trois publicités, deux par jour : il faut revenir le lendemain.
  for (const attendu of [1, 2]) {
    const r = await regarder('cosmetique', 'COSMETIC', { article: 'crampons-graffiti' });
    egal(r.reclame!.donnees.cosmetique.progres, attendu, `crampons : ${attendu} / 3`);
    egal(r.reclame!.donnees.cosmetique.debloque, false, 'pas encore débloqués');
  }
  ok(!(await db.boutique(comptes.cosmetique))!.equipements.includes('crampons-graffiti'), 'à 2 / 3, rien dans l’inventaire');
  const tropTot = await action('cosmetique', 'commencer', { contexte: 'COSMETIC', article: 'crampons-graffiti' });
  egal(tropTot.statut, 400, 'la troisième publicité du jour est refusée pour CET article');
  egal((await action('cosmetique', 'commencer', { contexte: 'COSMETIC', article: 'maillot-vannes' })).statut, 200, 'un autre cosmétique a son propre plafond');
  const service = creerServicePublicites(db.publicites!);
  const enCours = (await db.publicites!.lire(comptes.cosmetique))!.sessions.find((s) => s.article === 'maillot-vannes')!;
  await contexteAtelier.run(CATALOGUE_ADMIN_VIDE, () => service.evenement(comptes.cosmetique, enCours.rewardSessionId, 'CLOSED'));
  // Le lendemain (heure de Paris), le serveur rouvre deux pas.
  const lendemain = maintenant + 86400000;
  ok(jourPublicites(lendemain) !== jourPublicites(maintenant), 'le lendemain est un autre jour à Paris');
  const suite = await contexteAtelier.run(CATALOGUE_ADMIN_VIDE, async () => {
    const session = await service.commencer(comptes.cosmetique, 'COSMETIC', [], undefined, lendemain, { article: 'crampons-graffiti' });
    await service.callback(signature(session.rewardSessionId), lendemain);
    return service.reclamer(comptes.cosmetique, session.rewardSessionId, lendemain);
  });
  egal((suite as any).cosmetique, { id: 'crampons-graffiti', progres: 3, requis: 3, restantesAujourdhui: 0, debloque: true }, 'le lendemain : 3 / 3, débloqués');
  ok((await db.boutique(comptes.cosmetique))!.equipements.includes('crampons-graffiti'), 'et livrés au coffre');
  // Un coffre momentanément absent : le déblocage reste acquis, la livraison est retentée à la lecture suivante.
  const registre = (await db.publicites!.lire(comptes.cosmetique))!;
  egal([registre.cosmetiques!['crampons-graffiti'].livre, registre.cosmetiques!['casque-rose'].livre], [true, true], 'les deux livraisons sont notées');
  await db.publicites!.ecrire(comptes.cosmetique, registre.revision, { ...registre, revision: registre.revision + 1,
    cosmetiques: { ...registre.cosmetiques, 'maillot-italie': { progres: 5, debloqueLe: lendemain } } });
  ok(!(await db.boutique(comptes.cosmetique))!.equipements.includes('maillot-italie'), 'un déblocage pas encore livré');
  await vue('cosmetique');
  ok((await db.boutique(comptes.cosmetique))!.equipements.includes('maillot-italie'), 'la lecture de la vue le livre');

  // ═══ 4. LE LABO ET LES STATISTIQUES ══════════════════════════════════════════════════════════════════════
  egal((await appel('premium', '?atelier=1&section=publicites')).statut, 404, 'le Labo reste fermé aux comptes ordinaires');
  const labo = await appel('kiri', '?atelier=1&section=publicites');
  egal(labo.statut, 200, 'Labo des publicités');
  const c = labo.donnees.statistiques.contextes;
  egal([c['LEAGUE.requested'], c['LEAGUE.completed'], c['LEAGUE.rewards'], c['LEAGUE.joueurs']], [2, 2, 2, 1], 'ligue : 2 demandées (la troisième, refusée, ne compte pas), 2 terminées, 2 packs, 1 joueur');
  egal([c['PREMIUM.requested'], c['PREMIUM.completed'], c['PREMIUM.rewards'], c['PREMIUM.joueurs']], [5, 5, 5, 1], 'Premium : 5 packs distribués à 1 joueur');
  ok(c['PREMIUM.ovas'] > 0 && c['LEAGUE.ovas'] > 0, 'la valeur en Ovas des packs gagnés est comptée');
  egal([c['COSMETIC.completed'], c['COSMETIC.rewards'], c['COSMETIC.joueurs']], [4, 2, 1], 'cosmétiques : 4 publicités, 2 objets débloqués, 1 joueur');
  ok(labo.donnees.chancesPremium.length === depart.chancesPremium.length, 'le Labo montre la roulette Premium');
  // Le Labo ferme la roulette à un seul pack, puis éteint l'usage.
  const reglages = { ...labo.donnees.config, premiumPacks: { or: 1 }, cosmetiques: { ...labo.donnees.config.cosmetiques, 'maillot-vannes': { actif: false, requis: 5, limiteJour: 2 } } };
  egal((await appel('kiri', '?atelier=1&section=publicites', { action: 'atelier', operation: 'publicites', revision: labo.donnees.revision, config: reglages })).statut, 200, 'réglages enregistrés');
  const apresLabo = await vue('voleur');
  egal(apresLabo.chancesPremium.map((x: any) => [x.pack.id, x.chance]), [['or', 100]], 'la roulette Premium suit les poids du Labo');
  ok(!apresLabo.cosmetiques['maillot-vannes'], 'un cosmétique fermé par le Labo disparaît de la vue de qui ne l’a pas commencé');
  egal((await action('voleur', 'commencer', { contexte: 'COSMETIC', article: 'maillot-vannes' })).statut, 400, 'et ne se débloque plus par publicité');
  const eteint = { ...reglages, premiumEnabled: false, leagueFallbackEnabled: false };
  const revision = (await appel('kiri', '?atelier=1&section=publicites')).donnees.revision;
  await appel('kiri', '?atelier=1&section=publicites', { action: 'atelier', operation: 'publicites', revision, config: eteint });
  egal((await action('voleur', 'commencer', { contexte: 'SHOP_PREMIUM_PACK' })).statut, 400, 'Premium éteint : aucune session');
  egal((await vue('voleur')).config.leagueFallbackEnabled, false, 'la fenêtre « pas assez d’Ovas » peut être coupée');

  // ═══ 5. CE QUE LE CODE NE DOIT PLUS FAIRE ════════════════════════════════════════════════════════════════
  const roulette = readFileSync('src/components/RoulettePacksPub.tsx', 'utf8');
  ok(!/dataset\.feinte/.test(roulette), 'la roulette ne marque plus de faux arrêt avant le pack gagné');
  const composant = readFileSync('src/components/PublicitesRecompensees.tsx', 'utf8');
  ok(!/localStorage/.test(composant) && !/localStorage/.test(readFileSync('src/lib/rewardedAdsService.ts', 'utf8')), 'aucun compteur publicitaire dans localStorage');

  console.log(`\n✅ Correctif 42 — publicités récompensées : ${controles} contrôles`);
} finally {
  if (secretAvant === undefined) delete process.env.APPLIXIR_CALLBACK_SECRET; else process.env.APPLIXIR_CALLBACK_SECRET = secretAvant;
  try { unlinkSync(fichier); } catch { /* le fichier du banc peut ne pas exister */ }
}
