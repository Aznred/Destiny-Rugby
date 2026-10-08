import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { stockageFichier } from '../serveur/carriereFichier';
import { contexteAtelier } from '../serveur/atelierAdmin';
import { catalogueSpecial, specialesPubliques, carteEchangeAutorise, carteSurMarcheAutorisee } from '../src/lib/ligue/catalogueSpecial';
import { carteSpecialePackable, preparerTirageSpecial, chanceSpecialeParCarte, EVENEMENTS_DEPART, identiteJoueur } from '../src/lib/ligue/cartesSpeciales';
import { catalogueBaseCarriere, carteDepuisSource, PACKS_CARRIERE } from '../src/lib/ligue/catalogueCarriere';
import { collectifCarriere } from '../src/lib/ligue/collectifCarriere';
import { creerCarriere, agirCarriere } from '../src/lib/ligue/carriere';
import { collectionCarriere } from '../src/lib/ligue/collectionCarriere';
import { cleCarteSolo, etatCollectionSoloVide, ouvrirPackSolo, packsEvenementSolo } from '../src/lib/collectionSolo';
import { rangPack } from '../src/lib/presentationPacks';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CarteJoueurEnLigne } from '../src/components/CarteJoueurEnLigne';
import type { CarteCarriere } from '../src/lib/ligue/typesCarriere';

let controles = 0;
const egal = (a: unknown, b: unknown, message: string) => { assert.deepEqual(a, b, message); controles++; };
const ok = (a: unknown, message: string) => { assert.ok(a, message); controles++; };
const maintenant = Date.now();
const dossier = mkdtempSync(join(tmpdir(), 'destiny-influenceurs-'));
try {
  const fichier = join(dossier, 'base.json'), db = stockageFichier(fichier), kiri = randomUUID(), ami = randomUUID();
  for (const [id, identifiant] of [[kiri, 'kiri'], [ami, 'verification']]) {
    await db.creerCompte({ id, identifiant, pseudo: identifiant, empreinte: 'verification' });
    await db.ouvrirSession(empreinteJeton(id), id, maintenant + 600_000);
  }
  const api = creerGestionnaireCarriere(db);
  async function appel(compte: string, chemin: string, body?: unknown) {
    let statut = 200, donnees: any;
    const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(d: unknown) { donnees = d; } };
    await api.handler({ method: body ? 'POST' : 'GET', url: chemin, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: compte ? `destiny_carriere=${compte}` : '' }, body }, res);
    return { statut, donnees };
  }
  const ecrire = async (operation: string, champs: Record<string, unknown>) => {
    const c = await db.atelier!.lire();
    return appel(kiri, '/api/carriere?atelier=1', { action: 'atelier', operation, revision: c.revision, ...champs });
  };
  const edition = (id: string, carte: Record<string, unknown>) => ecrire('carteSpeciale', { id, carte });
  const publicSolo = async (compte = '') => {
    const r = await appel(compte, '/api/carriere?catalogueSolo=1&revision=-1');
    egal(r.statut, 200, `Catalogue public : ${JSON.stringify(r.donnees).slice(0, 300)}`);
    return r;
  };
  const definition = { cardType: 'influencer', nom: 'Mika', display_name: '@MikaLive', first_name: 'Mika', last_name: 'Créateur', real_name: 'Mika Créateur', poste: 'demi_ouverture', nation: 'France', club: 'Stade Toulousain', overall: 85, rarity: 'star', statistiques: { PAS: 91 }, description: 'Partenariat test', niveauInfluenceur: 'evenement', packWeight: 1 };
  const initial = (await appel(kiri, '/api/carriere?atelier=1&section=speciales')).donnees;
  ok(initial.familles.influencer, 'Famille proposée dans le Labo');
  egal(initial.evenements.find((e: any) => e.id === 'influencers').actif, false, 'Famille désactivée par défaut');
  for (const overall of [59, 100, 85.5]) egal((await ecrire('creerCarteSpeciale', { carte: { ...definition, overall } })).statut, 400, `GEN ${overall} refusé`);
  const cree = await ecrire('creerCarteSpeciale', { carte: definition });
  egal(cree.statut, 200, 'Création Influenceur');
  const id = cree.donnees.id as string;
  egal(catalogueSpecial(await db.atelier!.lire()).parId.get(id)?.brouillon, true, 'Création en brouillon');
  egal((await publicSolo()).donnees.speciales.definitions.length, 0, 'Brouillon absent du catalogue public');
  egal((await edition(id, { published: true, brouillon: false })).statut, 400, 'Publication sans image refusée');
  egal((await ecrire('imageCarteSpeciale', { id, image: '/photos/silhouette.webp' })).statut, 200, 'Image préparée');
  egal((await edition(id, { published: true })).statut, 400, 'Un brouillon avec image ne se publie pas');
  egal((await edition(id, { brouillon: false, published: true })).statut, 200, 'Publication après préparation');
  egal((await publicSolo()).donnees.speciales.definitions.length, 0, 'Famille inactive : aucune définition publique');
  egal((await ecrire('evenementSpecial', { id: 'influencers', evenement: { actif: true } })).statut, 200, 'Activation globale');
  let config = await db.atelier!.lire(), cat = catalogueSpecial(config);
  const source = cat.sources.get(id)!;
  egal([source.nom, source.clubReel, source.nation, source.championnat, source.rarete, source.statistiques.PAS], ['@MikaLive', 'Stade Toulousain', 'France', 'Top 14', 'star', 91], 'Identité, club, nation, rareté et stats résolus');
  egal([source.speciale?.retraite, source.speciale?.animation], [undefined, 'influenceur'], 'Créateur jouable avec son animation');
  const carte = carteDepuisSource(source, 'test', 'club', 1);
  const rendu = renderToStaticMarkup(createElement(CarteJoueurEnLigne, { carte }));
  for (const texte of ['design-influencer', '@MikaLive', 'Stade Toulousain', 'LIVE', 'INFLUENCEUR']) ok(rendu.includes(texte), `La carte rend ${texte}`);
  egal(rangPack(carte), 5, 'Révélation après les rouges');
  egal(identiteJoueur(carte), id, 'Identité indépendante des joueurs réels');
  egal((await publicSolo()).donnees.speciales.definitions.map((d: any) => d.id), [id], 'Seule la carte publiée et active est publique');
  const ev = EVENEMENTS_DEPART.find(e => e.id === 'influencers')!;
  for (const p of PACKS_CARRIERE.filter(p => p.probabilites.star > 0)) ok(chanceSpecialeParCarte(p, ev) < p.probabilites.star, `${p.nom} : plus rare qu’une rouge`);

  const [pack] = packsEvenementSolo(cat, maintenant);
  egal([pack.id, pack.prix, pack.cartes], ['evenement-influencers', 200, 10], 'Pack Créateurs réglable');
  const catalogue = [...catalogueBaseCarriere(), source];
  for (let i = 0; i < 8; i++) {
    const tirage = ouvrirPackSolo(pack, catalogue, etatCollectionSoloVide(), undefined, { speciales: cat, maintenant });
    egal(tirage.indices.length, 10, 'Dix cartes dans le pack Créateurs');
    ok(tirage.indices.some(n => catalogue[n].sourceId === id), 'Une carte Influenceur garantie');
  }
  const premium = PACKS_CARRIERE.find(p => p.id === 'premium')!;
  egal((await edition(id, { allowedPackIds: ['evenement-influencers'] })).statut, 200, 'Choix des packs');
  cat = catalogueSpecial(await db.atelier!.lire());
  egal(preparerTirageSpecial(premium, true, maintenant, new Set(), cat), null, 'Pack non autorisé exclu');
  ok(preparerTirageSpecial(pack, true, maintenant, new Set(), cat), 'Pack choisi autorisé');
  egal((await edition(id, { allowedPackIds: [] })).statut, 200, 'Aucun pack autorisé');
  egal(packsEvenementSolo(catalogueSpecial(await db.atelier!.lire()), maintenant).length, 0, 'Pas de pack vendu avec une garantie impossible');
  egal((await edition(id, { allowedPackIds: ['inexistant'] })).statut, 400, 'Pack inexistant refusé');
  await edition(id, { allowedPackIds: null, packWeight: 0 });
  egal(packsEvenementSolo(catalogueSpecial(await db.atelier!.lire()), maintenant).length, 0, 'Poids nul : aucun tirage ni pack mensonger');
  await edition(id, { packWeight: 1, availableFrom: new Date(maintenant + 3600_000).toISOString(), availableUntil: new Date(maintenant + 7200_000).toISOString() });
  cat = catalogueSpecial(await db.atelier!.lire());
  egal(carteSpecialePackable(cat.parId.get(id)!, cat, maintenant), false, 'Pas de distribution avant la date');
  egal(specialesPubliques(await db.atelier!.lire(), maintenant).definitions.length, 0, 'Aucun dévoilement avant la date');
  ok(carteSpecialePackable(cat.parId.get(id)!, cat, maintenant + 3600_000), 'Début inclus');
  egal(carteSpecialePackable(cat.parId.get(id)!, cat, maintenant + 7200_000), false, 'Fin exclue');
  await edition(id, { availableFrom: '', availableUntil: '' });

  const coequipiers: CarteCarriere[] = [1, 2].map(n => ({ ...carte, id: `coequipier-${n}`, sourceId: `reel:${n}`, speciale: undefined }));
  egal(collectifCarriere([carte, ...coequipiers], { titulaires: [carte.id, ...coequipiers.map(c => c.id)] }).parCarte[carte.id].points, 10, 'Collectif avec les joueurs du club');
  const sansClub: CarteCarriere = { ...carte, clubReel: '', championnat: '', speciale: { ...carte.speciale!, sansClub: 'nation' } };
  egal(collectifCarriere([sansClub, ...coequipiers], { titulaires: [carte.id, ...coequipiers.map(c => c.id)] }).parCarte[carte.id].nation, 3, 'Sans club : liens de nation');
  sansClub.speciale!.sansClub = 'neutre';
  egal(collectifCarriere([sansClub, ...coequipiers], { titulaires: [carte.id, ...coequipiers.map(c => c.id)] }).parCarte[carte.id].points, 0, 'Sans club neutre : aucun lien');
  const creators = [1, 2, 3].map(n => ({ ...sansClub, id: `creator-${n}`, nation: '', speciale: { ...sansClub.speciale!, sansClub: 'creator' as const } }));
  egal(collectifCarriere(creators, { titulaires: creators.map(c => c.id) }).total, 100, 'Groupe Creator configurable');
  egal((await edition(id, { club: '', league: '', nation: '', sansClub: 'creator' })).statut, 200, 'Club et nation facultatifs');
  cat = catalogueSpecial(await db.atelier!.lire());
  egal([cat.parId.get(id)!.club, cat.parId.get(id)!.nation, cat.parId.get(id)!.league], ['', '', ''], 'Aucun club fictif ajouté aux créateurs neutres');
  await edition(id, { club: 'Club partenaire', nation: 'France', market_allowed: false, trade_allowed: false });
  config = await db.atelier!.lire();
  egal(carteSurMarcheAutorisee(carte, true, config), false, 'Vente interdite selon configuration');
  egal(carteEchangeAutorise(carte, true, config), false, 'Échange interdit selon configuration');
  await edition(id, { market_allowed: true, trade_allowed: true });
  config = await db.atelier!.lire();
  ok(carteSurMarcheAutorisee(carte, true, config), 'Vente autorisée');
  ok(carteEchangeAutorise(carte, true, config), 'Échange autorisé');
  const coffre = (quantite: number) => ({ ovas: 0, collectionSolo: { ...etatCollectionSoloVide(), quantites: { [cleCarteSolo(id)]: quantite } }, inventaire: [], skinActif: '', equipements: [], equipementActif: {}, traitsDebloques: [] });
  await db.sauvegarderBoutique(kiri, coffre(3)); await db.sauvegarderBoutique(ami, coffre(3));
  const offre = await appel(kiri, '/api/carriere', { action: 'creerOffreSolo', offertes: { [cleCarteSolo(id)]: 1 }, souhaitees: { [cleCarteSolo(id)]: 1 } });
  egal(offre.statut, 200, 'Offre solo créée lorsque l’échange est permis');
  const offreId = (await db.echangesSolo!.lister(kiri, 0)).offres[0].id;
  await edition(id, { trade_allowed: false });
  egal((await appel(ami, '/api/carriere', { action: 'accepterOffreSolo', offre: offreId })).statut, 409, 'Interdiction relue à l’acceptation d’une ancienne offre');
  egal((await appel(ami, '/api/carriere', { action: 'creerOffreSolo', offertes: { [cleCarteSolo(id)]: 1 }, souhaitees: {} })).statut, 409, 'Carte exclusive refusée par l’API des échanges');
  await edition(id, { trade_allowed: true });
  egal((await appel(ami, '/api/carriere', { action: 'accepterOffreSolo', offre: offreId })).statut, 200, 'Échange solo accepté après réactivation');

  await ecrire('evenementSpecial', { id: 'influencers', evenement: { actif: false } });
  config = await db.atelier!.lire(); cat = catalogueSpecial(config);
  egal(specialesPubliques(config, maintenant).definitions.length, 0, 'Désactivation : définitions gardées uniquement dans la base');
  egal((await publicSolo()).donnees.speciales.definitions.length, 0, 'Désactivation : aucune carte transmise au public');
  egal((await publicSolo(kiri)).donnees.speciales.definitions.map((d: any) => d.id), [id], 'Le propriétaire conserve sa carte pour jouer');
  egal(packsEvenementSolo(cat, maintenant).length, 0, 'Désactivation : pas de pack Créateurs');
  egal(carteSpecialePackable(cat.parId.get(id)!, cat, maintenant), false, 'Désactivation : aucun tirage');
  const evenementPersonnalise = structuredClone(config);
  evenementPersonnalise.speciales!.evenements = { ...evenementPersonnalise.speciales!.evenements, 'creators-test': { ...ev, id: 'creators-test', actif: true } };
  evenementPersonnalise.speciales!.cartes![id].specialEventId = 'creators-test';
  const catPersonnalise = catalogueSpecial(evenementPersonnalise);
  egal(catPersonnalise.evenementParId.get('creators-test')?.actif, true, 'Événement personnalisé actif pour vérifier le bouton global');
  egal(carteSpecialePackable(catPersonnalise.parId.get(id)!, catPersonnalise, maintenant), false, 'Le bouton global bloque aussi les événements personnalisés');
  egal(specialesPubliques(evenementPersonnalise, maintenant).definitions.length, 0, 'Événement personnalisé : aucune visibilité après désactivation globale');
  contexteAtelier.run(config, () => {
    let ligue = creerCarriere({ id: randomUUID(), nom: 'Vérification Influenceurs', code: 'TEST', compteId: kiri, pseudo: 'Kiri', clubNom: 'Kiri RFC', rythme: 1, maxClubs: 2, cartesSpeciales: true }, maintenant, 'influenceurs');
    ligue = agirCarriere(ligue, ami, { type: 'rejoindre', pseudo: 'Ami', clubNom: 'Ami XV' }, maintenant, 'rejoindre');
    const distribuee = carteDepuisSource(cat.sources.get(id)!, ligue.id, ligue.clubs[0].id, 999);
    ligue.cartes.push(distribuee);
    const commande = { type: 'proposerEchange' as const, vers: ligue.clubs[1].id, cartesDonnees: [distribuee.id], cartesDemandees: [], ovasDonnes: 0, ovasDemandes: 0 };
    const proposee = agirCarriere(ligue, kiri, commande, maintenant, 'proposer');
    const exclusive = structuredClone(config);
    exclusive.speciales!.cartes![id].trade_allowed = false;
    contexteAtelier.run(exclusive, () => {
      assert.throws(() => agirCarriere(ligue, kiri, commande, maintenant, 'refus'), /échangée/); controles++;
      assert.throws(() => agirCarriere(proposee, ami, { type: 'repondreEchange', echangeId: proposee.echanges[0].id, accepter: true }, maintenant, 'refus'), /échangée/); controles++;
    });
    const acceptee = agirCarriere(proposee, ami, { type: 'repondreEchange', echangeId: proposee.echanges[0].id, accepter: true }, maintenant, 'accepter');
    egal(acceptee.cartes.find(c => c.id === distribuee.id)?.proprietaire, ligue.clubs[1].id, 'Échange ligue accepté lorsque la permission le permet');
    const collection = collectionCarriere(ligue, kiri, new URLSearchParams({ type: 'influencer' }), maintenant);
    egal(collection.total, 1, 'Collection ligue : exemplaire conservé après désactivation');
    const comp = { ...ligue.clubs[0].composition, titulaires: [...ligue.clubs[0].composition.titulaires] };
    comp.titulaires[9] = distribuee.id;
    const composee = agirCarriere(ligue, kiri, { type: 'composition', composition: comp }, maintenant, 'composition');
    ok(composee.clubs[0].composition.titulaires.includes(distribuee.id), 'Influenceur utilisable en composition après désactivation');
  });
  const relu = await stockageFichier(fichier).atelier!.lire();
  ok(catalogueSpecial(relu).parId.has(id), 'Carte persistée après redémarrage du stockage');
} finally {
  const cible = resolve(dossier), racine = resolve(tmpdir());
  assert.ok(cible.startsWith(racine + '\\') && cible.split(/[\\/]/).at(-1)?.startsWith('destiny-influenceurs-'));
  rmSync(cible, { recursive: true, force: true });
}
console.log(`OK Influenceurs — ${controles} contrôles.`);
