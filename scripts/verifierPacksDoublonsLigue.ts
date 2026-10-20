import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { stockageFichier } from '../serveur/carriereFichier';
import { contexteAtelier } from '../serveur/atelierAdmin';
import { contexteFfr } from '../serveur/ffr/contexte';
import { CATALOGUE_ADMIN_VIDE, type CatalogueAdmin } from '../src/lib/ligue/atelierCatalogue';
import { cataloguePacksPublicitaires, definitionsDepart, packsEvenements } from '../src/lib/ligue/catalogueSpecial';
import { doublonDeComposition, identiteJoueur, PACK_HALLOWEEN, PACK_OCTOBRE_ROSE } from '../src/lib/ligue/cartesSpeciales';
import { agirCarriere, avancerCarriere, creerCarriere, packPublicitaireDisponible } from '../src/lib/ligue/carriere';
import { chancesPacksPremium, chancesPacksPub, packPublicitaireDeLigue, PUBLICITES_PAR_DEFAUT } from '../src/lib/publicitesRecompensees';
import { meilleureComposition } from '../src/lib/meilleureComposition';
import { creerRecetteDoublons, COMPTE_RECETTE, INSTANT_RECETTE } from './recettePacksDoublonsLigue';

const { etat, original, copie, invalide } = creerRecetteDoublons();
assert.equal(doublonDeComposition(etat.cartes, invalide)?.id, copie.id);
for (const type of ['composition', 'sauvegarderComposition'] as const) assert.throws(() => agirCarriere(etat, COMPTE_RECETTE,
  type === 'composition' ? { type, composition: invalide } : { type, nom: 'Interdit', composition: invalide }, INSTANT_RECETTE, 'refus'), /déjà sur la feuille/);
const variante = { ...copie, id: 'variante-speciale', sourceId: 'speciale:recette', speciale: { type: 'halloween', base: original.sourceId } } as typeof copie;
assert.ok(doublonDeComposition([...etat.cartes, variante], { titulaires: [original.id], remplacants: [variante.id] }));
assert.equal(doublonDeComposition([original, { ...copie, sourceId: 'personne-homonyme', nom: original.nom }], { titulaires: [original.id], remplacants: [copie.id] }), undefined);
const remplacee = structuredClone(etat.clubs[0].composition); remplacee.titulaires[0] = copie.id;
if (remplacee.capitaineId === original.id) remplacee.capitaineId = copie.id;
if (remplacee.buteurId === original.id) remplacee.buteurId = copie.id;
assert.doesNotThrow(() => agirCarriere(etat, COMPTE_RECETTE, { type: 'composition', composition: remplacee }, INSTANT_RECETTE, 'remplacer'));
const ancienne = structuredClone(etat); ancienne.clubs[0].composition = invalide;
const reparee = avancerCarriere(ancienne, INSTANT_RECETTE, 'reparer');
assert.equal(doublonDeComposition(reparee.cartes, reparee.clubs[0].composition), undefined);
assert.equal(reparee.clubs[0].composition.titulaires.length + reparee.clubs[0].composition.remplacants.length, 23);
assert.equal(reparee.cartes.length, ancienne.cartes.length, 'Les exemplaires restent dans la collection.');
ancienne.cartes.find(c => c.id === original.id)!.blesseJusqua = new Date(INSTANT_RECETTE + 3600000).toISOString();
const blessee = avancerCarriere(ancienne, INSTANT_RECETTE, 'blessure'), feuilleBlessee = blessee.clubs[0].composition;
assert.ok([...feuilleBlessee.titulaires, ...feuilleBlessee.remplacants].includes(copie.id), 'La copie saine reste utilisable si la première est blessée.');
const optimale = meilleureComposition(etat.cartes, INSTANT_RECETTE)!;
assert.ok(optimale && !doublonDeComposition(etat.cartes, optimale));
assert.ok([...optimale.titulaires, ...optimale.remplacants].includes(copie.id));
const tropCourte = etat.cartes.slice(0, 22); tropCourte.push({ ...tropCourte[0], id: 'copie-supplementaire' });
assert.equal(meilleureComposition(tropCourte, INSTANT_RECETTE), null, '23 cartes ne remplacent pas 23 personnes.');

const publication: CatalogueAdmin = { ...structuredClone(CATALOGUE_ADMIN_VIDE), revision: 1,
  speciales: { cartes: Object.fromEntries(definitionsDepart().map(d => [d.id, { published: true, imageReady: true, image: '/photos/silhouette.webp' }])) } };
const packs = contexteAtelier.run(publication, () => packsEvenements()).filter(p => ['halloween','octobre-rose'].includes(p.evenement!.type));
assert.equal(packs.length, 2);
for (const p of packs) {
  const copiePack = structuredClone(p), pub = packPublicitaireDeLigue(p);
  assert.equal(pub.cartes, 3); assert.equal(pub.garantieSpeciale, p.garantieSpeciale);
  assert.deepEqual(pub.probabilites, p.probabilites); assert.deepEqual(p, copiePack);
  const chances = chancesPacksPub([{ ...p, rewardedAdsEnabled: true }], INSTANT_RECETTE);
  assert.equal(chances[0].pack.cartes, 3);
  assert.equal(chancesPacksPremium([{ ...p, rewardedAdsEnabled: true }], { premiumPacks: {} }, INSTANT_RECETTE)[0].pack.cartes, 10);
  assert.equal(contexteAtelier.run(publication, () => packPublicitaireDisponible(etat, pub, INSTANT_RECETTE)), true);
}
assert.equal(PACK_HALLOWEEN.cartes, 10); assert.equal(PACK_OCTOBRE_ROSE.cartes, 10);

// Deux vraies routes API avec stockage isolé et reçus signés simulés. Aucun fournisseur ni compte distant.
const temporaire = realpathSync(tmpdir()), dossier = mkdtempSync(join(temporaire, 'destiny-packs-doublons-'));
const secretAvant = process.env.APPLIXIR_CALLBACK_SECRET, maintenantAvant = Date.now;
process.env.APPLIXIR_CALLBACK_SECRET = `recette-${randomUUID()}`; Date.now = () => INSTANT_RECETTE;
try {
  for (const pack of packs) {
    const db = stockageFichier(join(dossier, `${pack.id}.json`));
    const compte = randomUUID(), ligue = randomUUID(), jeton = `recette-${randomUUID()}`;
    const catalogue = contexteAtelier.run(publication, () => contexteFfr.run({ pool: 'mixed', joueurs: [] }, () => cataloguePacksPublicitaires()));
    const config = { ...structuredClone(publication), packs: Object.fromEntries(catalogue.map(p => [p.id, {
      ...p, rewardedAdsEnabled: p.id === pack.id, rewardedAdWeight: p.id === pack.id ? 1 : 0,
    }])) };
    await db.atelier!.ecrire(config, 0);
    await db.creerCompte({ id: compte, identifiant: `recette-${compte}`, pseudo: 'Recette', empreinte: 'test' });
    await db.ouvrirSession(empreinteJeton(jeton), compte, INSTANT_RECETTE + 86400000);
    const ligueEtat = contexteAtelier.run(config, () => creerCarriere({ id: ligue, code: 'RECETTE', nom: 'Recette locale', compteId: compte,
      pseudo: 'Recette', clubNom: 'Club local', rythme: 3, maxClubs: 2, packsGratuitsParJour: 0, doublonsAutorises: true, cartesSpeciales: true }, INSTANT_RECETTE, 'ligue-pub'));
    await db.creerLigue({ id: ligue, code: 'RECETTE', version: ligueEtat.version, comptes: [compte], etat: ligueEtat });
    const api = creerGestionnaireCarriere(db);
    const appel = async (chemin: string, body?: object, authentifie = true) => {
      let statut = 200, donnees: any;
      const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(x: unknown) { donnees = x; } };
      await api.handler({ method: body ? 'POST' : 'GET', url: `/api/carriere${chemin}`, headers: { host: 'localhost', origin: 'http://localhost',
        'content-type': 'application/json', cookie: authentifie ? `destiny_carriere=${jeton}` : '' }, body }, res);
      assert.equal(statut, 200, JSON.stringify(donnees)); return donnees;
    };
    const vue = await appel(`?publicites=1&ligue=${ligue}`);
    assert.equal(vue.chances.length, 1); assert.equal(vue.chances[0].pack.cartes, 3);
    const session = await appel('?publicites=1', { action: 'publicites', operation: 'commencer', contexte: 'DAILY_PACK', ligue });
    const q = new URLSearchParams({ gameApiKey: session.apiKey ?? PUBLICITES_PAR_DEFAUT.apiKey, gameId: '123', userId: session.rewardSessionId, tid: randomUUID() });
    q.set('signature', createHash('md5').update(q.get('gameApiKey')! + q.get('gameId')! + q.get('userId')! + q.get('tid')! + process.env.APPLIXIR_CALLBACK_SECRET!).digest('hex'));
    await appel(`?applixirCallback=1&${q}`, undefined, false);
    const reserve = (await db.ligue(ligue))!.etat.packsPubReserves![session.rewardSessionId];
    assert.equal(reserve.pack.cartes, 3); assert.equal(reserve.cartes.length, 3);
    assert.ok(reserve.cartes.some(c => c.speciale?.evenement === pack.garantieSpeciale));
    const ouvrir = () => appel('', { action: 'commande', ligue, requeteId: randomUUID(), commande: { type: 'ouvrirPackPub', rewardSessionId: session.rewardSessionId } });
    await ouvrir(); await ouvrir();
    const finale = (await db.ligue(ligue))!.etat;
    assert.equal(finale.cartes.length, ligueEtat.cartes.length + 3, 'La réclamation ne livre que trois cartes, une seule fois.');
    assert.equal(finale.clubs[0].ovas, ligueEtat.clubs[0].ovas);
    console.log(`OK API ${pack.nom} : annonce → reçu signé → 3 cartes réservées → ouverture unique, garantie préservée.`);
  }
} finally {
  Date.now = maintenantAvant;
  if (secretAvant === undefined) delete process.env.APPLIXIR_CALLBACK_SECRET; else process.env.APPLIXIR_CALLBACK_SECRET = secretAvant;
  assert.ok(resolve(dossier).startsWith(temporaire + sep) && basename(dossier).startsWith('destiny-packs-doublons-'));
  rmSync(dossier, { recursive: true, force: true });
}
assert.equal(new Set([...optimale.titulaires, ...optimale.remplacants].map(id => identiteJoueur(etat.cartes.find(c => c.id === id)!))).size, 23);
console.log('Packs de ligue à 3, solo à 10, doublons ordinaires/spéciaux, homonymes, réparation, blessure et assemblage : OK.');
