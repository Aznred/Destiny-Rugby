// LES PACKS DE TEST — Correctif 33. Tout passe par la vraie route HTTP, devant le stockage local.
//
// Ce que ce banc tient fermé :
//   - la permission est une ligne de la base : 403 pour tout autre compte (même au pseudo « kiri »), 403 dès qu'elle
//     est retirée au compte interne, et accordée à un autre compte elle lui ouvre l'outil ;
//   - le navigateur n'envoie que des identifiants : une carte inconnue fait refuser le pack, et rien de ce qu'il
//     ajoute à la demande d'ouverture (cartes, prix) n'est lu ;
//   - le contenu est EXACTEMENT celui choisi, dans l'ordre choisi, carte principale en dernier — aucun tirage ;
//   - normale, rouge, ICON, Halloween, Influenceur, et une carte spéciale non publiée : toutes s'ouvrent ;
//   - un pack n'est lisible et ouvrable que par son auteur ;
//   - création, ouverture, suppression : tout est consigné avec la source INTERNAL_CUSTOM_PACK ;
//   - les packs publics, leurs probabilités et le catalogue ne bougent pas d'un octet.
//
// Lancer : npm run verify:packs-test
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { stockageFichier } from '../serveur/carriereFichier';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { packsInternesSql } from '../serveur/packsInternesStockage';
import { cleCarteSolo } from '../src/lib/collectionSolo';
import { CATALOGUE_ADMIN_VIDE } from '../src/lib/ligue/atelierCatalogue';
import { catalogueBaseCarriere, packsCatalogueAdmin } from '../src/lib/ligue/catalogueCarriere';
import {
  CARTES_MAX_PACK_INTERNE, CLE_COFFRE_PACKS_INTERNES, ordreDeRevelation, PERMISSION_PACKS_INTERNES, SOURCE_ACQUISITION_INTERNE,
  validerDefinitionPackInterne,
} from '../src/lib/packsInternes';
import type { EtatBoutiqueCompte } from '../src/lib/boutiqueCompte';

let controles = 0;
const egal = (a: unknown, b: unknown, message: string) => { assert.deepEqual(a, b, message); controles++; console.log(`  ✓ ${message}`); };
const ok = (a: unknown, message: string) => { assert.ok(a, message); controles++; console.log(`  ✓ ${message}`); };
const titre = (t: string) => console.log(`\n${t}`);

// ── 1. Le vocabulaire ───────────────────────────────────────────────────────
titre('1. La définition d\'un pack');
egal(ordreDeRevelation({ cartes: ['a', 'b', 'c'] }), ['a', 'b', 'c'], 'sans carte principale : l\'ordre choisi');
egal(ordreDeRevelation({ cartes: ['a', 'b', 'c'], principale: 'a' }), ['b', 'c', 'a'], 'la carte principale se retourne en dernier');
egal(ordreDeRevelation({ cartes: ['a', 'b', 'a'], principale: 'a' }), ['a', 'b', 'a'], 'déjà dernière : rien ne bouge');
for (const [brut, quoi] of [[{ nom: 'x', cartes: ['a'] }, 'nom trop court'], [{ nom: 'Pack', cartes: [] }, 'aucune carte'],
  [{ nom: 'Pack', cartes: Array(CARTES_MAX_PACK_INTERNE + 1).fill('a') }, 'trop de cartes'], [{ nom: 'Pack', cartes: ['a'], principale: 'z' }, 'principale hors du pack'],
  [{ nom: 'Pack', cartes: [42] }, 'identifiant qui n\'est pas un texte'], [null, 'rien']] as const) {
  assert.throws(() => validerDefinitionPackInterne(brut)); controles++;
  console.log(`  ✓ refusé : ${quoi}`);
}

const maintenant = Date.now();
const base = catalogueBaseCarriere();
const rouge = base.find(c => c.rarete === 'star')!, argent = base.find(c => c.rarete === 'argent')!, bronze = base.find(c => c.rarete === 'bronze')!;
const config = { ...CATALOGUE_ADMIN_VIDE, revision: 1, speciales: {
  evenements: { influencers: { actif: true } },
  cartes: {
    'icon:dan-carter': { published: true, image: '/photos/carter.webp' },
    'halloween-2026:antoine-dupont': { published: true, image: '/photos/dupont.webp' },
    // Une ICON jamais publiée : un pack de test doit pouvoir l'ouvrir quand même.
    'icon:richie-mccaw': { image: '/photos/mccaw.webp' },
    'influencers:mika': { id: 'influencers:mika', cardType: 'influencer', specialEventId: 'influencers', nom: 'Mika', display_name: '@MikaLive', poste: 'demi_ouverture',
      overall: 85, nation: 'France', club: 'Stade Toulousain', published: true, image: '/photos/mika.webp', brouillon: false },
  },
} };
const coffre = (): EtatBoutiqueCompte => ({ ovas: 500, achatsOvas: 0,
  collectionSolo: { quantites: { ancienne: 2 }, packsOuverts: { bronze: 3 }, doublons: 1, revision: 4 },
  inventaire: ['classique'], skinActif: 'classique', equipements: [], equipementActif: {}, traitsDebloques: [] });

const dossier = mkdtempSync(join(tmpdir(), 'destiny-packs-test-'));
try {
  const fichier = join(dossier, 'base.json');
  let db = stockageFichier(fichier);
  const kiri = randomUUID(), autre = randomUUID(), testeur = randomUUID();
  await db.creerCompte({ id: autre, identifiant: 'autre', pseudo: 'kiri', empreinte: 'x' });
  await db.creerCompte({ id: kiri, identifiant: 'kiri', pseudo: 'Colin', empreinte: 'x' });
  await db.creerCompte({ id: testeur, identifiant: 'testeur', pseudo: 'Testeur', empreinte: 'x' });
  for (const [compte, jeton] of [[kiri, 'jeton-kiri'], [autre, 'jeton-autre'], [testeur, 'jeton-testeur']]) {
    await db.ouvrirSession(empreinteJeton(jeton), compte, maintenant + 3_600_000);
    await db.sauvegarderBoutique(compte, coffre());
  }
  assert.ok(await db.atelier!.ecrire(config, 0));
  const packsPublicsAvant = JSON.stringify(packsCatalogueAdmin());
  let api = creerGestionnaireCarriere(db);
  async function appel(jeton: string, chemin: string, body?: object, origin = 'http://localhost') {
    let statut = 200, donnees: any;
    const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(x: unknown) { donnees = x; } };
    await api.handler({ method: body ? 'POST' : 'GET', url: `/api/carriere${chemin}`,
      headers: { host: 'localhost', origin, 'content-type': 'application/json', cookie: jeton ? `destiny_carriere=${jeton}` : '' }, body }, res);
    return { statut, donnees };
  }
  const creer = (jeton: string, pack: object) => appel(jeton, '', { action: 'packInterne', operation: 'creer', pack });
  const ouvrir = (jeton: string, id: string, plus: object = {}) => appel(jeton, '', { action: 'ouvrirPackPriveSolo', pack: `interne:${id}`, ...plus });
  const cartesDuPack = [argent.sourceId, 'halloween-2026:antoine-dupont', 'icon:dan-carter', 'influencers:mika', rouge.sourceId];

  // ── 2. La permission ──────────────────────────────────────────────────────
  titre('2. La permission serveur');
  egal((await appel('', '?packsInternes=1')).statut, 401, 'sans session : 401');
  egal((await appel('jeton-autre', '?packsInternes=1')).statut, 403, 'un autre compte (au PSEUDO « kiri ») : 403 sur la liste');
  egal((await appel('jeton-autre', '?packsInternes=1')).donnees.erreur, 'FORBIDDEN', 'et la réponse dit FORBIDDEN');
  egal((await appel('jeton-autre', '?packsInternes=1&recherche=1&q=dupont')).statut, 403, '403 sur la recherche');
  egal((await creer('jeton-autre', { nom: 'Pack pirate', cartes: [rouge.sourceId] })).statut, 403, '403 sur la création');
  egal((await appel('jeton-autre', '', { action: 'packInterne', operation: 'supprimer', id: randomUUID() })).statut, 403, '403 sur la suppression');
  egal((await ouvrir('jeton-autre', randomUUID())).statut, 403, '403 sur l\'ouverture');
  egal((await appel('jeton-autre', '?packsPrivesSolo=1')).donnees.packsDeTest, undefined, 'sa liste de packs privés ne porte aucun pack de test');
  egal(await db.packsInternes!.permission(kiri, PERMISSION_PACKS_INTERNES), true, 'le compte interne détient la permission (posée une fois, sur son identifiant)');
  egal(await db.packsInternes!.permission(autre, PERMISSION_PACKS_INTERNES), false, 'personne d\'autre');
  const vide = await appel('jeton-kiri', '?packsInternes=1');
  egal([vide.statut, vide.donnees.packs.length, vide.donnees.limites.cartes], [200, 0, CARTES_MAX_PACK_INTERNE], 'le compte interne voit son atelier, vide');
  egal((await creer('jeton-kiri', { nom: 'Pack Test', cartes: cartesDuPack }, )).statut, 200, 'et peut créer');
  egal((await appel('jeton-kiri', '', { action: 'packInterne', operation: 'creer', pack: { nom: 'Depuis ailleurs', cartes: cartesDuPack } }, 'https://evil.example')).statut, 403, 'une demande venue d\'un autre site est refusée');

  // ── 3. La recherche ───────────────────────────────────────────────────────
  titre('3. La recherche de cartes');
  const chercher = async (params: string) => (await appel('jeton-kiri', `?packsInternes=1&recherche=1&${params}`)).donnees;
  egal((await chercher('')).cartes.length, 0, 'sans critère : rien (on ne déverse pas le catalogue)');
  const parNom = await chercher(`q=${encodeURIComponent(rouge.nom)}`);
  ok(parNom.cartes.some((c: any) => c.sourceId === rouge.sourceId && c.type === 'normale' && c.visibleEnCollection), 'par nom : la carte ordinaire, avec son type');
  const parClub = await chercher(`club=${encodeURIComponent(rouge.clubReel)}&rarete=star`);
  ok(parClub.cartes.length > 0 && parClub.cartes.every((c: any) => c.rarete === 'star' && c.club === rouge.clubReel), 'par club et rareté');
  const parPoste = await chercher(`club=${encodeURIComponent(rouge.clubReel)}&poste=${rouge.poste}`);
  ok(parPoste.cartes.length > 0 && parPoste.cartes.every((c: any) => c.poste === rouge.poste), 'par poste');
  const icones = await chercher('type=icon');
  ok(icones.cartes.length > 0 && icones.cartes.every((c: any) => c.type === 'icon'), 'par type : les ICONS');
  ok(icones.cartes.some((c: any) => c.sourceId === 'icon:richie-mccaw' && c.statut !== 'published' && c.visibleEnCollection === false), 'une ICON non publiée est proposée, signalée comme telle');
  ok((await chercher('type=halloween')).cartes.some((c: any) => c.sourceId === 'halloween-2026:antoine-dupont'), 'les Halloween');
  ok((await chercher('type=influencer')).cartes.some((c: any) => c.sourceId === 'influencers:mika' && c.nom === '@MikaLive'), 'les Influenceurs');
  ok((await chercher('q=a')).cartes.length <= 60, 'une recherche large reste bornée');

  // ── 4. Créer ──────────────────────────────────────────────────────────────
  titre('4. La création');
  egal((await creer('jeton-kiri', { nom: 'Faux', cartes: [rouge.sourceId, 'reel:joueur-qui-n-existe-pas'] })).statut, 400, 'une carte inconnue fait refuser le pack entier');
  egal((await creer('jeton-kiri', { nom: 'Trop', cartes: Array(CARTES_MAX_PACK_INTERNE + 1).fill(rouge.sourceId) })).statut, 400, 'plus de cartes que le plafond : refusé');
  const cree = await creer('jeton-kiri', { nom: 'Pack Animation', cartes: [...cartesDuPack, 'icon:richie-mccaw', argent.sourceId], principale: 'icon:dan-carter',
    note: 99, rarete: 'star', prix: -500, probabilites: { star: 100 } });
  egal(cree.statut, 200, 'un pack de sept cartes, dont une en double et une ICON non publiée');
  const idPack = cree.donnees.pack.id as string;
  egal(cree.donnees.pack.detail.map((c: any) => c.sourceId).at(-1), 'icon:dan-carter', 'la carte principale est la dernière révélée');
  egal(Object.keys(cree.donnees.pack).sort(), ['cartes', 'creeLe', 'detail', 'id', 'nom', 'ouvertures', 'principale'], 'rien de ce que le navigateur a ajouté (note, prix, probabilités) n\'est gardé');
  const liste = (await appel('jeton-kiri', '?packsInternes=1')).donnees;
  egal(liste.packs.map((p: any) => p.nom).sort(), ['Pack Animation', 'Pack Test'], 'les deux packs sont dans l\'atelier');
  const enBoutique = (await appel('jeton-kiri', '?packsPrivesSolo=1')).donnees.packsDeTest;
  egal(enBoutique.map((p: any) => [p.nom, p.cartes, p.prix, p.interne]).sort(), [['Pack Animation', 7, 0, true], ['Pack Test', 5, 0, true]], 'et dans la Collection solo, section « Packs de test »');

  // ── 5. Ouvrir ─────────────────────────────────────────────────────────────
  titre('5. L\'ouverture');
  const attendu = [argent.sourceId, 'halloween-2026:antoine-dupont', 'influencers:mika', rouge.sourceId, 'icon:richie-mccaw', argent.sourceId, 'icon:dan-carter'];
  const ouvert = await ouvrir('jeton-kiri', idPack, { cartes: [bronze.sourceId], prix: -1, contenu: 'autre chose' });
  egal(ouvert.statut, 200, 'le pack s\'ouvre');
  egal(ouvert.donnees.cartes.map((c: any) => c.sourceId), attendu, 'EXACTEMENT les cartes choisies, dans l\'ordre choisi — rien de la demande n\'est lu');
  egal(ouvert.donnees.ordreImpose, true, 'l\'écran est prévenu que l\'ordre est imposé');
  egal(ouvert.donnees.cartes.map((c: any) => c.speciale?.type ?? 'normale'), ['normale', 'halloween', 'influencer', 'normale', 'icon', 'normale', 'icon'], 'normale, Halloween, Influenceur, rouge, ICON : tous les types passent');
  const apres = (await db.boutique(kiri))!;
  egal(apres.ovas, 500, 'aucun Ova dépensé ni gagné');
  egal(apres.collectionSolo.revision, 5, 'la révision de la collection avance d\'un cran');
  egal(apres.collectionSolo.quantites[cleCarteSolo(argent.sourceId)], 2, 'la carte en double compte deux fois');
  egal(apres.collectionSolo.quantites[cleCarteSolo('icon:dan-carter')], 1, 'l\'ICON est dans la collection');
  egal(apres.collectionSolo.quantites.ancienne, 2, 'les cartes d\'avant sont toujours là');
  egal(Object.values(apres.collectionSolo.quantites).reduce((s, n) => s + n, 0), 2 + 7, 'sept exemplaires de plus, pas un de moins');
  egal([apres.collectionSolo.packsOuverts[CLE_COFFRE_PACKS_INTERNES], Object.keys(apres.collectionSolo.packsOuverts).length], [1, 2], 'un seul compteur de coffre pour tous les packs de test');
  egal((await ouvrir('jeton-kiri', idPack)).donnees.cartes.map((c: any) => c.sourceId), attendu, 'rouvert : le même contenu, encore (aucun tirage)');
  egal((await db.boutique(kiri))!.collectionSolo.quantites[cleCarteSolo('icon:dan-carter')], 2, 'et les cartes s\'ajoutent de nouveau');
  egal((await ouvrir('jeton-kiri', randomUUID())).statut, 404, 'un pack inexistant : 404');
  egal((await ouvrir('jeton-kiri', 'pas-un-identifiant')).statut, 404, 'un identifiant mal formé : 404');
  egal([(await db.boutique(autre))!.ovas, (await db.boutique(autre))!.collectionSolo], [coffre().ovas, coffre().collectionSolo], 'le coffre des autres comptes n\'a pas bougé');

  // ── 6. Un pack n'appartient qu'à son auteur ───────────────────────────────
  titre('6. Un pack n\'appartient qu\'à son auteur');
  // On accorde la permission à un second compte, comme le ferait un `insert` en base.
  const brute = JSON.parse(readFileSync(fichier, 'utf8'));
  brute.permissions[testeur] = [PERMISSION_PACKS_INTERNES];
  writeFileSync(fichier, JSON.stringify(brute));
  db = stockageFichier(fichier); api = creerGestionnaireCarriere(db);
  egal((await appel('jeton-testeur', '?packsInternes=1')).donnees.packs.length, 0, 'un second compte autorisé a son propre atelier, vide');
  egal((await ouvrir('jeton-testeur', idPack)).statut, 404, 'il ne peut pas ouvrir le pack d\'un autre');
  egal((await appel('jeton-testeur', '', { action: 'packInterne', operation: 'supprimer', id: idPack })).statut, 404, 'ni le supprimer');
  egal((await creer('jeton-testeur', { nom: 'Le mien', cartes: [bronze.sourceId] })).statut, 200, 'mais il crée les siens');
  egal((await appel('jeton-kiri', '?packsInternes=1')).donnees.packs.length, 2, 'que le premier ne voit pas');

  // ── 7. Le journal ─────────────────────────────────────────────────────────
  titre('7. Le journal');
  const journal = (await appel('jeton-kiri', '?packsInternes=1')).donnees.journal as any[];
  egal(journal.map(l => l.action), ['OPEN', 'OPEN', 'CREATE', 'CREATE'], 'deux créations puis deux ouvertures, la plus récente d\'abord');
  ok(journal.every(l => l.source === SOURCE_ACQUISITION_INTERNE && Number.isFinite(Date.parse(l.date))), `chaque ligne porte sa date et la source ${SOURCE_ACQUISITION_INTERNE}`);
  egal(journal[0].cartes, attendu, 'une ouverture consigne les cartes sorties, dans l\'ordre');
  egal([journal[0].packId, journal[0].nom], [idPack, 'Pack Animation'], 'et le pack ouvert');
  egal((await appel('jeton-kiri', '', { action: 'packInterne', operation: 'supprimer', id: idPack })).statut, 200, 'le pack se supprime');
  egal((await ouvrir('jeton-kiri', idPack)).statut, 404, 'supprimé, il ne s\'ouvre plus');
  const apresSuppression = (await appel('jeton-kiri', '?packsInternes=1')).donnees;
  egal([apresSuppression.packs.length, apresSuppression.journal[0].action, apresSuppression.journal.length], [1, 'DELETE', 5], 'la suppression est consignée, et le journal garde tout');
  egal((await db.boutique(kiri))!.collectionSolo.quantites[cleCarteSolo('icon:dan-carter')], 2, 'les cartes déjà ouvertes restent dans la collection');

  // ── 8. La permission retirée ──────────────────────────────────────────────
  titre('8. La permission retirée');
  const sansDroit = JSON.parse(readFileSync(fichier, 'utf8'));
  delete sansDroit.permissions[kiri];
  writeFileSync(fichier, JSON.stringify(sansDroit));
  db = stockageFichier(fichier); api = creerGestionnaireCarriere(db);
  const restant = sansDroit.packsInternes.find((p: any) => p.compte === kiri).id as string;
  egal((await appel('jeton-kiri', '?packsInternes=1')).statut, 403, 'le compte interne lui-même reçoit 403 dès que la ligne est retirée');
  egal((await ouvrir('jeton-kiri', restant)).statut, 403, 'il ne peut plus ouvrir un pack qu\'il avait créé');
  egal((await creer('jeton-kiri', { nom: 'Encore', cartes: [rouge.sourceId] })).statut, 403, 'ni en créer');
  egal((await appel('jeton-kiri', '?packsPrivesSolo=1')).donnees.packsDeTest, undefined, 'et la Collection solo ne lui en montre plus');
  egal((await db.packsInternes!.permission(kiri, PERMISSION_PACKS_INTERNES)), false, 'la permission n\'est pas ressemée au redémarrage : seule la table décide');

  // ── 9. Rien de public n'a bougé ───────────────────────────────────────────
  titre('9. L\'économie publique');
  egal(JSON.stringify(packsCatalogueAdmin()), packsPublicsAvant, 'les packs de la boutique et leurs probabilités sont intacts');
  egal((await db.atelier!.lire()).revision, 1, 'la révision du catalogue n\'a pas bougé : aucun pack de test n\'y est écrit');
  ok(!JSON.stringify(await db.atelier!.lire()).includes('Pack Animation'), 'le catalogue du Labo ne contient aucun pack de test');
} finally {
  rmSync(dossier, { recursive: true, force: true });
}

// ── 10. Le SQL de production : forme des requêtes ─────────────────────────────
// Pas de Postgres ici : on vérifie au moins que chaque requête est UNE instruction, entièrement paramétrée (aucune
// valeur du navigateur n'est collée dans le texte), et qu'une table absente ferme l'outil au lieu de l'ouvrir.
titre('10. Les requêtes SQL (forme seulement : elles n\'ont pas été jouées sur une base)');
{
  const vues: { texte: string; valeurs: unknown[] }[] = [];
  const sql = async (textes: TemplateStringsArray, ...valeurs: unknown[]) => { vues.push({ texte: textes.join('$?'), valeurs }); return [] as Record<string, unknown>[]; };
  const s = packsInternesSql(sql);
  const compte = randomUUID(), id = randomUUID(), poison = `'; drop table comptes; --`;
  await s.permission(compte, poison);
  await s.lister(compte); await s.lire(compte, id);
  await s.creer(compte, { id, nom: poison, cartes: [poison], principale: poison, creeLe: new Date().toISOString(), ouvertures: 0 });
  await s.ouvrir(compte, id, { [poison]: 1 }, [poison]);
  await s.supprimer(compte, id); await s.journal(compte, 10);
  ok(vues.length === 7 && vues.every(v => !v.texte.includes('drop table') && !v.texte.includes(';')), 'sept requêtes, une instruction chacune, aucune valeur collée dans le texte');
  ok(vues.every(v => (v.texte.match(/\$\?/g) ?? []).length === v.valeurs.length), 'chaque valeur passe par un paramètre');
  ok(vues[4].texte.includes('compte_boutique') && vues[4].texte.includes('packs_internes_journal') && vues[4].texte.includes("'OPEN'"), 'l\'ouverture écrit le coffre et le journal dans la même instruction');
  const absente = packsInternesSql(async () => { throw Object.assign(new Error('relation does not exist'), { code: '42P01' }); });
  egal(await absente.permission(compte, PERMISSION_PACKS_INTERNES), false, 'table absente (schéma non appliqué) : personne n\'a la permission');
}

console.log(`\n${controles} contrôles : OK`);
