// BANC — LES CARTES SPÉCIALES (ICONS, Halloween) ET LES IMPORTS DU LABO
//
//   npm run verify:cartes-speciales
//
// Ce que ce banc tient fermé :
//   • la graine : 100 ICONS (Galthié compris, jusqu'à 97), 23 Halloween entre
//     82 et 92 avec COL 10, toutes en « image manquante » ;
//   • rien ne sort avant l'image et la publication, rien dans une ligue qui
//     ne les autorise pas — et une telle ligue tire EXACTEMENT comme avant ;
//   • la rareté : ICONS proches des Mythiques, Halloween entre bleue et Mythique ;
//   • le pack Halloween : dans la boutique de packs spéciaux de la Collection
//     solo (jamais en ligue), garanti, puis disparu le 1er décembre ; ses
//     cartes sortent aussi des packs ordinaires des ligues, jusqu'à la même date ;
//   • collection, marché, collectif (COL 10), une seule carte par joueur sur la feuille ;
//   • le Labo par l'API réelle : droits, bornes, images, publication, imports.

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { stockageFichier } from '../serveur/carriereFichier';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { contexteAtelier } from '../serveur/atelierAdmin';
import { CATALOGUE_ADMIN_VIDE, type CatalogueAdmin } from '../src/lib/ligue/atelierCatalogue';
import { PACKS_CARRIERE } from '../src/lib/ligue/catalogueCarriere';
import {
  assemblerCatalogueSpecial, catalogueSpecial, chanceSpecialeParCarte, definitionsDepart, identiteJoueur, preparerTirageSpecial, specialesPubliques, statutCarteSpeciale, EVENEMENTS_DEPART,
} from '../src/lib/ligue/catalogueSpecial';
import { catalogueBaseCarriere } from '../src/lib/ligue/catalogueCarriere';
import { etatCollectionSoloVide, ouvrirPackSolo, packCollectionSolo, packsEvenementSolo } from '../src/lib/collectionSolo';
import { agirCarriere, avancerCarriere, creerCarriere } from '../src/lib/ligue/carriere';
import { collectionCarriere } from '../src/lib/ligue/collectionCarriere';
import { collectifCarriere } from '../src/lib/ligue/collectifCarriere';
import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere';

let controles = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); controles++; };
const egal = <T>(a: T, b: T, message: string) => { assert.deepEqual(a, b, message); controles++; };

const PENDANT = Date.parse('2026-10-20T12:00:00Z');
const APRES = Date.parse('2026-12-01T09:00:00Z');

// ── 1. La graine ───────────────────────────────────────────────────────────
const graine = definitionsDepart();
const icons = graine.filter(d => d.cardType === 'icon'), halloween = graine.filter(d => d.cardType === 'halloween');
egal(icons.length, 100, '100 ICONS au départ');
egal(halloween.length, 23, 'une équipe Halloween de 23');
// Octobre Rose : 23 joueuses en activité, toutes féminines, chacune liée à sa carte ordinaire.
const octobreRose = graine.filter(d => d.cardType === 'octobre-rose');
egal(octobreRose.length, 23, 'une équipe Octobre Rose de 23');
ok(octobreRose.every(d => d.gender === 'female' && d.identiteId && !d.retraite && !d.published && d.imageReady && d.image?.startsWith('/photos/octobre-rose/')), 'Octobre Rose : féminines, liées à leur carte, portrait livré, non publiées');
ok(octobreRose.every(d => d.overall >= 84 && d.overall <= 96 && d.club && d.league), 'Octobre Rose : GEN de 84 à 96, club et championnat renseignés');
egal(new Set(octobreRose.map(d => d.identiteId)).size, 23, 'Octobre Rose : 23 joueuses différentes');
{
  // Octobre Rose sort dans TOUS les packs — ligue masculine, féminine ou mixte — et seulement en octobre.
  const publiees = octobreRose.map(d => ({ ...d, published: true, imageReady: true, image: '/photos/essai.webp' }));
  const cat = assemblerCatalogueSpecial(publiees, EVENEMENTS_DEPART);
  const pack = PACKS_CARRIERE.find(x => (x.probabilites.star ?? 0) > 0)!;
  egal(preparerTirageSpecial(pack, true, PENDANT, new Set(), cat)?.lots[0].candidats.length, 23, 'Octobre Rose : tirables aussi dans une ligue masculine');
  const chezLesFemmes = preparerTirageSpecial(pack, true, PENDANT, new Set(), cat, 'women');
  egal(chezLesFemmes?.lots.length, 1, 'Octobre Rose : un lot dans une ligue féminine');
  egal(chezLesFemmes!.lots[0].candidats.length, 23, 'Octobre Rose : les 23 cartes y sont tirables');
  ok(chezLesFemmes!.lots[0].candidats.every(c => c.gender === 'female' && c.speciale?.type === 'octobre-rose' && c.speciale.base), 'Octobre Rose : cartes féminines, identité de base posée');
  egal(preparerTirageSpecial(pack, true, PENDANT, new Set(), cat, 'mixed')?.lots[0].candidats.length, 23, 'Octobre Rose : tirables en ligue mixte');
  egal(preparerTirageSpecial(pack, true, APRES, new Set(), cat, 'women'), null, 'Octobre Rose : plus rien après octobre');
  const kildunne = chezLesFemmes!.lots[0].candidats.find(c => c.nom === 'Ellie KILDUNNE')!;
  egal(identiteJoueur({ sourceId: kildunne.sourceId, nom: kildunne.nom, speciale: kildunne.speciale }), 'feminine:pwr-bristol-bears-ellie-kildunne', 'Octobre Rose : même identité que la carte ordinaire');
}
egal(new Set(graine.map(d => d.id)).size, graine.length, 'identifiants uniques');
ok(icons.some(d => d.nom === 'Fabien Galthié'), 'Fabien Galthié est une ICON');
egal(Math.max(...icons.map(d => d.overall)), 97, 'les ICONS montent jusqu’à 97');
ok(icons.every(d => d.retraite && !d.basePlayerId), 'une ICON est toujours un retraité');
ok(halloween.every(d => d.overall >= 82 && d.overall <= 92 && d.collectif === 10), 'Halloween : GEN 82-92 et COL 10');
ok(halloween.some(d => d.basePlayerId) && halloween.some(d => d.retraite), 'Halloween : actifs ET retraités');
ok(graine.every(d => statutCarteSpeciale(d) === (d.cardType === 'octobre-rose' ? 'ready' : 'image_missing') && !d.published), 'aucune carte publiée ; seules les Octobre Rose ont déjà leur image');
for (const nation of ['France', 'Nouvelle-Zélande', 'Afrique du Sud', 'Angleterre', 'Pays de Galles', 'Irlande', 'Australie', 'Argentine']) {
  ok(icons.some(d => d.nation === nation), `ICONS : ${nation} représentée`);
}
const familles = new Set(icons.map(d => d.poste));
ok(['pilier_gauche', 'talonneur', 'deuxieme_ligne_d', 'troisieme_aile_d', 'numero_8', 'demi_melee', 'demi_ouverture', 'ailier_gauche', 'deuxieme_centre', 'arriere'].every(p => familles.has(p as never)), 'ICONS : tous les postes');
const vide = catalogueSpecial(CATALOGUE_ADMIN_VIDE);
const dupontHalloween = vide.parId.get('halloween-2026:antoine-dupont')!;
egal([dupontHalloween.club, dupontHalloween.league], ['Stade Toulousain', 'Top 14'], 'un actif garde son club et sa ligue');

// ── 2. Les chances ─────────────────────────────────────────────────────────
const evIcons = EVENEMENTS_DEPART.find(e => e.id === 'icons')!, evHalloween = EVENEMENTS_DEPART.find(e => e.id === 'halloween-2026')!;
for (const pack of PACKS_CARRIERE) {
  const { elite, star } = pack.probabilites;
  const h = chanceSpecialeParCarte(pack, evHalloween), i = chanceSpecialeParCarte(pack, evIcons);
  if (star > 0 && elite > star) ok(h > star && h < elite, `${pack.nom} : Halloween entre bleue (${elite}) et Mythique (${star}) — ${h.toFixed(3)}`);
  if (star === 0) ok(h === 0 && i === 0, `${pack.nom} : pas de Mythique, pas de carte spéciale`);
  ok(i <= star && i >= star * .5, `${pack.nom} : ICON proche de la Mythique`);
}

// ── Les catalogues de test ─────────────────────────────────────────────────
function configPubliee(sur: (id: string) => boolean = () => true, extra: Partial<CatalogueAdmin> = {}): CatalogueAdmin {
  return { ...CATALOGUE_ADMIN_VIDE, revision: 7, ...extra, speciales: { ...(extra.speciales ?? {}), cartes: Object.fromEntries(graine.filter(d => sur(d.id)).map(d => [d.id,
    { published: true, image: `https://example.org/${encodeURIComponent(d.id)}.webp`, imageReady: true, ...(extra.speciales?.cartes?.[d.id] ?? {}) }])) } };
}
const PUBLIEE = configPubliee();
const kiri = '00000000-0000-4000-8000-0000000000aa', ami = '00000000-0000-4000-8000-0000000000bb';
function ligue(cartesSpeciales: boolean, id = randomUUID(), doublonsAutorises = false): EtatCarriereEnLigne {
  const e = creerCarriere({ id, nom: 'Ligue test', code: 'TEST', compteId: kiri, pseudo: 'Kiri', clubNom: 'Kiri RFC', rythme: 1, maxClubs: 4, dotationOvas: 100_000, cartesSpeciales, doublonsAutorises }, PENDANT, `graine-${id}`);
  return agirCarriere(e, ami, { type: 'rejoindre', pseudo: 'Ami', clubNom: 'Ami XV' }, PENDANT, 'rejoindre');
}
function ouvrir(etat: EtatCarriereEnLigne, packId: string, fois: number, maintenant = PENDANT) {
  let e = etat;
  for (let n = 0; n < fois; n++) {
    e.clubs[0].ovas = 10_000_000;
    e = agirCarriere(e, kiri, { type: 'ouvrirPack', packId }, maintenant, `pack-${n}`);
  }
  return e;
}
const speciales = (e: EtatCarriereEnLigne) => e.cartes.filter(c => c.speciale);

contexteAtelier.run(PUBLIEE, () => {
  // ── 3. Une ligue qui ne les autorise pas tire comme avant ────────────────
  const id = randomUUID();
  const sans = contexteAtelier.run(CATALOGUE_ADMIN_VIDE, () => ouvrir(ligue(false, id), 'elite', 25));
  const fermee = ouvrir(ligue(false, id), 'elite', 25);
  egal(speciales(fermee).length, 0, 'ligue fermée : aucune carte spéciale');
  egal(fermee.cartes.map(c => c.sourceId), sans.cartes.map(c => c.sourceId), 'ligue fermée : mêmes tirages qu’avant les cartes spéciales');

  // ── 4. Sans image, rien ne sort même dans une ligue ouverte ──────────────
  const sansImage = contexteAtelier.run(CATALOGUE_ADMIN_VIDE, () => ouvrir(ligue(true), 'elite', 25));
  egal(speciales(sansImage).length, 0, 'image manquante : aucune carte ne sort');

  // ── 5. Les fréquences, mesurées dans une ligue À DOUBLONS ───────────────
  // (sinon les 23 Halloween s'épuisent et l'on mesure la taille du lot, pas la chance).
  for (const [packId, fois] of [['premium', 1500], ['elite', 800]] as const) {
    const e = ouvrir(ligue(true, `frequences-${packId}`, true), packId, fois);
    const tirees = e.cartes.filter(c => e.transactions.some(t => t.nature === 'pack' && t.cartes.includes(c.id)));
    const nbIcons = tirees.filter(c => c.speciale?.type === 'icon').length, nbHalloween = tirees.filter(c => c.speciale?.type === 'halloween').length;
    const nbMythiques = tirees.filter(c => !c.speciale && c.rarete === 'star').length, nbBleues = tirees.filter(c => !c.speciale && c.rarete === 'elite').length;
    console.log(`  ${tirees.length} cartes ${packId} : ${nbIcons} ICONS, ${nbHalloween} Halloween, ${nbMythiques} Mythiques, ${nbBleues} bleues`);
    ok(nbHalloween > 0 && nbHalloween < nbBleues, `${packId} : Halloween plus rare qu’une bleue`);
    ok(nbHalloween > nbMythiques, `${packId} : Halloween plus fréquente qu’une Mythique`);
    ok(nbIcons > 0 && nbIcons <= nbMythiques * 1.6 + 3 && nbIcons >= nbMythiques * .3, `${packId} : ICONS proches des Mythiques`);
  }
  const ouverte = ouvrir(ligue(true), 'elite', 300);
  const tirees = ouverte.cartes.filter(c => ouverte.transactions.some(t => t.nature === 'pack' && t.cartes.includes(c.id)));
  const halloweenCarte = tirees.find(c => c.speciale?.type === 'halloween')!;
  egal(halloweenCarte.speciale?.collectif, 10, 'la carte distribuée garde son COL 10');
  egal(new Set(ouverte.cartes.map(c => c.sourceId)).size, ouverte.cartes.length, 'unicité par ligue respectée');

  // ── 6. Le pack Halloween n'est PAS en ligue ; ses cartes, si ─────────────
  ok(!ouverte.packs.some(p => p.evenement), 'aucun pack d’événement dans la boutique d’une ligue');
  assert.throws(() => agirCarriere(ouverte, kiri, { type: 'ouvrirPack', packId: 'evenement-halloween-2026' }, PENDANT, 'x'), /Pack inconnu/); controles++;
  ok(!ouverte.clubs[0].packsGratuits?.some(p => p.packId.startsWith('evenement-')), 'jamais offert en pack quotidien');
  const ancienneAvecPack = structuredClone(ouverte);
  ancienneAvecPack.packs.push({ ...structuredClone(PACKS_CARRIERE[0]), id: 'evenement-halloween-2026', evenement: { id: 'halloween-2026', type: 'halloween', actif: true } });
  ok(!avancerCarriere(ancienneAvecPack, PENDANT, 'nettoyage').packs.some(p => p.evenement), 'un pack d’événement resté dans une ligue en est retiré');
  // Le 1er décembre : plus aucune Halloween ne sort des packs de ligue ; les cartes restent.
  const decembre = avancerCarriere(ouverte, APRES, 'decembre');
  const apres = ouvrir(decembre, 'elite', 150, APRES);
  egal(speciales(apres).filter(c => c.speciale?.type === 'halloween').length, speciales(decembre).filter(c => c.speciale?.type === 'halloween').length, 'après l’événement : plus aucune Halloween ne sort');
  ok(speciales(apres).length > speciales(decembre).length && speciales(apres).some(c => c.speciale?.type === 'icon'), 'ICONS toute l’année');
  egal(speciales(decembre).length, speciales(ouverte).length, 'les Halloween obtenues restent dans les clubs');

  // ── 6 bis. Collection solo : la boutique de packs spéciaux ───────────────
  const publiques = specialesPubliques(PUBLIEE);
  const base = catalogueBaseCarriere(), parId = new Map(base.map(c => [c.sourceId, c]));
  const solo = assemblerCatalogueSpecial(publiques.definitions, publiques.evenements, id => parId.get(id));
  const catalogueSolo = [...base, ...solo.definitions.map(d => solo.sources.get(d.id)!)];
  const [packHalloween] = packsEvenementSolo(solo, PENDANT);
  ok(packHalloween?.id === 'evenement-halloween-2026', 'le pack Halloween est en vente dans la boutique de packs spéciaux');
  egal([packHalloween.prix, packHalloween.cartes], [150, 10], 'prix en Ovas du compte, dix cartes comme les packs solo');
  egal(packCollectionSolo(packHalloween).prix, 150, 'le prix du Labo n’est pas converti');
  egal(packsEvenementSolo(solo, APRES).length, 0, 'le 1er décembre, il quitte la boutique');
  const soloVide = assemblerCatalogueSpecial(specialesPubliques(CATALOGUE_ADMIN_VIDE).definitions, specialesPubliques(CATALOGUE_ADMIN_VIDE).evenements);
  egal(soloVide.definitions.length, 0, 'sans publication, le public ne reçoit aucune carte spéciale');
  egal(packsEvenementSolo(soloVide, PENDANT).length, 0, 'et le pack n’apparaît pas');
  let etatSolo = etatCollectionSoloVide(), halloweenSolo = 0;
  for (let n = 0; n < 60; n++) {
    const r = ouvrirPackSolo(packHalloween, catalogueSolo, etatSolo, undefined, { speciales: solo, maintenant: PENDANT });
    egal(r.indices.length, 10, `pack Halloween n° ${n + 1} : dix cartes`);
    const tirees = r.indices.map(i => catalogueSolo[i]);
    ok(tirees.some(c => c.speciale?.evenement === 'halloween-2026'), `pack Halloween n° ${n + 1} : une Halloween au moins`);
    halloweenSolo += tirees.filter(c => c.speciale?.type === 'halloween').length;
    etatSolo = r.etat;
  }
  console.log(`  60 packs Halloween solo : ${halloweenSolo} cartes Halloween`);
  const refuse = ouvrirPackSolo(packHalloween, catalogueSolo, etatSolo, undefined, { speciales: solo, maintenant: APRES });
  egal(refuse.indices.length, 0, 'après l’événement, un pack Halloween ne se tire plus (rien débité)');
  let speciauxGratuits = 0;
  for (let n = 0; n < 200; n++) speciauxGratuits += ouvrirPackSolo(packCollectionSolo(PACKS_CARRIERE.find(p => p.id === 'or')!), catalogueSolo, etatCollectionSoloVide()).indices.filter(i => catalogueSolo[i].speciale).length;
  egal(speciauxGratuits, 0, 'les cartes spéciales n’entrent jamais dans les bandes ordinaires');

  // ── 7. Interrupteur global ICONS ───────────────────────────────────────────
  const sansIcons = contexteAtelier.run(configPubliee(() => true, { speciales: { evenements: { icons: { actif: false } } } }), () => ouvrir(ligue(true), 'elite', 200));
  egal(speciales(sansIcons).filter(c => c.speciale?.type === 'icon').length, 0, 'ICONS désactivées : aucune ne sort');

  // ── 8. Collection ──────────────────────────────────────────────────────────
  const collection = (e: EtatCarriereEnLigne, type: string, config: CatalogueAdmin = PUBLIEE) =>
    contexteAtelier.run(config, () => collectionCarriere(e, kiri, new URLSearchParams({ type }), PENDANT));
  egal(collection(ouverte, 'icon').total, 100, 'filtre ICONS : 100 cartes');
  egal(collection(ouverte, 'halloween').total, 23, 'filtre HALLOWEEN : 23 cartes');
  egal(collection(fermee, 'icon').total, 0, 'ligue fermée : ICONS masquées');
  ok(collection(fermee, '').joueurs.every(j => !j.carte.speciale), 'ligue fermée : aucune carte spéciale listée');
  const partielle = configPubliee(id => id === 'icon:richie-mccaw');
  egal(collection(ligue(true), 'icon', partielle).total, 1, 'seules les cartes publiées apparaissent');
  ok(collection(ouverte, '').joueurs[0].carte.speciale, 'vue « Toutes » : les cartes spéciales à part, en tête');
  ok(collection(ouverte, 'normal').joueurs.every(j => !j.carte.speciale), 'filtre Joueurs : sans cartes spéciales');

  // ── 9. Réglage de la ligue ─────────────────────────────────────────────────
  assert.throws(() => agirCarriere(ouverte, ami, { type: 'reglerCartesSpeciales', active: false }, PENDANT, 'x'), /créateur/); controles++;
  assert.throws(() => agirCarriere(ouverte, kiri, { type: 'reglerCartesSpeciales', active: false }, PENDANT, 'x'), /restent autorisées/); controles++;
  const activee = agirCarriere(fermee, kiri, { type: 'reglerCartesSpeciales', active: true }, PENDANT, 'x');
  egal(activee.cartesSpeciales, true, 'le créateur active les cartes spéciales');
  egal(agirCarriere(activee, kiri, { type: 'reglerCartesSpeciales', active: false }, PENDANT, 'x').cartesSpeciales, false, 'et les désactive tant que personne n’en a');

  // ── 10. Marché ─────────────────────────────────────────────────────────────
  const uneIcon = speciales(ouverte).find(c => c.speciale?.type === 'icon' && c.proprietaire === ouverte.clubs[0].id
    && !ouverte.clubs[0].composition.titulaires.includes(c.id) && !ouverte.clubs[0].composition.remplacants.includes(c.id))!;
  ok(uneIcon, 'une ICON hors feuille');
  const enVente = agirCarriere(ouverte, kiri, { type: 'vendre', carteId: uneIcon.id, prix: 50_000, mode: 'directe', dureeHeures: 24 }, PENDANT, 'v');
  ok(enVente.ventes.some(v => v.carteId === uneIcon.id && v.etat === 'ouverte'), 'une ICON se met en vente');
  const horsMarche = configPubliee(() => true, { speciales: { cartes: { [uneIcon.sourceId]: { canAppearOnMarket: false } } } });
  contexteAtelier.run(horsMarche, () => {
    assert.throws(() => agirCarriere(ouverte, kiri, { type: 'vendre', carteId: uneIcon.id, prix: 50_000, mode: 'directe', dureeHeures: 24 }, PENDANT, 'v'), /marché/); controles++;
    const vente = enVente.ventes.find(v => v.carteId === uneIcon.id)!;
    enVente.clubs[1].ovas = 1_000_000;
    assert.throws(() => agirCarriere(enVente, ami, { type: 'acheter', venteId: vente.id }, PENDANT, 'a'), /marché/); controles++;
  });

  // ── 11. Collectif et identité sur la feuille ──────────────────────────────
  const club = ouverte.clubs[0];
  const mesCartes = ouverte.cartes.filter(c => c.proprietaire === club.id);
  const halloweenMienne = mesCartes.find(c => c.speciale?.type === 'halloween');
  if (halloweenMienne) {
    const compo = { ...club.composition, titulaires: [halloweenMienne.id, ...club.composition.titulaires.filter(i => i !== halloweenMienne.id).slice(0, 14)] };
    egal(collectifCarriere(mesCartes, compo).parCarte[halloweenMienne.id].points, 10, 'COL 10 : collectif maximal même isolé');
  }
  const dupont = ouverte.cartes.find(c => c.sourceId === 'reel:antoine dupont');
  const e2 = structuredClone(ouverte);
  const club2 = e2.clubs[0];
  const dupontNormal = dupont ? e2.cartes.find(c => c.id === dupont.id)! : e2.cartes.find(c => c.proprietaire === club2.id && !c.speciale)!;
  dupontNormal.proprietaire = club2.id; dupontNormal.sourceId = 'reel:antoine dupont'; dupontNormal.nom = 'Antoine Dupont'; dupontNormal.poste = 'demi_melee'; dupontNormal.famille = 'demi_melee';
  const source = catalogueSpecial().sources.get('halloween-2026:antoine-dupont')!;
  const dupontH = { ...source, statistiques: { ...source.statistiques }, speciale: { ...source.speciale! }, id: `${e2.id}:halloween-dupont`, proprietaire: club2.id, fatigue: 0, matchs: 0, essais: 0, clubs: [] };
  e2.cartes.push(dupontH);
  const feuille = { ...club2.composition, titulaires: [...club2.composition.titulaires], remplacants: [...club2.composition.remplacants] };
  feuille.titulaires = feuille.titulaires.filter(i => i !== dupontNormal.id && i !== dupontH.id);
  feuille.remplacants = feuille.remplacants.filter(i => i !== dupontNormal.id && i !== dupontH.id);
  feuille.titulaires.splice(8, 0, dupontNormal.id); feuille.titulaires = feuille.titulaires.slice(0, 15);
  feuille.remplacants.splice(0, 0, dupontH.id); feuille.remplacants = feuille.remplacants.slice(0, 8);
  feuille.capitaineId = feuille.titulaires[0]; feuille.buteurId = feuille.titulaires[0];
  assert.throws(() => agirCarriere(e2, kiri, { type: 'composition', composition: feuille }, PENDANT, 'c'), /déjà sur la feuille/); controles++;
  e2.clubs[0].composition = feuille;
  const reconcilie = avancerCarriere(e2, PENDANT, 'r').clubs[0].composition;
  const surFeuille = [...reconcilie.titulaires, ...reconcilie.remplacants];
  ok(!(surFeuille.includes(dupontNormal.id) && surFeuille.includes(dupontH.id)), 'la réconciliation écarte le doublon de joueur');
});

// ── 12. Le Labo par l'API ──────────────────────────────────────────────────
const dossier = mkdtempSync(join(tmpdir(), 'destiny-speciales-'));
try {
  const fichier = join(dossier, 'base.json'), db = stockageFichier(fichier), idKiri = randomUUID(), idAutre = randomUUID();
  for (const [id, identifiant] of [[idKiri, 'kiri'], [idAutre, 'autre']]) {
    await db.creerCompte({ id, identifiant, pseudo: identifiant, empreinte: 'test' });
    await db.ouvrirSession(empreinteJeton(id), id, Date.now() + 600_000);
  }
  const api = creerGestionnaireCarriere(db);
  async function appel(compte: string, chemin: string, body?: unknown) {
    let statut = 200, donnees: any, octets: Uint8Array | undefined; const entetes: Record<string, string> = {};
    const res = { status(n: number) { statut = n; return res; }, setHeader(n: string, v: string) { entetes[n] = v; }, json(d: unknown) { donnees = d; }, envoyer(o: Uint8Array) { octets = o; } };
    await api.handler({ method: body ? 'POST' : 'GET', url: chemin, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: compte ? `destiny_carriere=${compte}` : '' }, body }, res);
    return { statut, donnees, octets, entetes };
  }
  egal((await appel(idAutre, '/api/carriere?atelier=1&section=speciales')).statut, 404, 'Labo : réservé à Kiri');
  const vue = await appel(idKiri, '/api/carriere?atelier=1&section=speciales');
  egal(vue.statut, 200, 'Labo : vue des cartes spéciales');
  egal(vue.donnees.cartes.length, 146, 'Labo : 146 cartes listées (100 ICONS, 23 Halloween, 23 Octobre Rose)');
  ok(vue.donnees.cartes.every((c: any) => c.statut === (c.cardType === 'octobre-rose' ? 'ready' : 'image_missing')), 'Labo : statuts lus');
  const ecrire = (operation: string, extra: Record<string, unknown>, compte = idKiri) =>
    db.atelier!.lire().then(c => appel(compte, '/api/carriere?atelier=1', { action: 'atelier', operation, revision: c.revision, ...extra }));
  egal((await ecrire('carteSpeciale', { id: 'halloween-2026:jonah-lomu', carte: { overall: 95 } })).statut, 400, 'Halloween : GEN 95 refusé (82-92)');
  egal((await ecrire('carteSpeciale', { id: 'icon:dan-carter', carte: { basePlayerId: 'reel:antoine dupont' } })).statut, 400, 'ICON rattachée à un actif : refusé');
  egal((await ecrire('carteSpeciale', { id: 'icon:dan-carter', carte: { published: true } })).statut, 400, 'publication sans image : refusée');
  egal((await ecrire('carteSpeciale', { id: 'icon:dan-carter', carte: { overall: 96, collectif: 8, packWeight: 2 } })).statut, 200, 'édition GEN/COL/poids');
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const envoi = await ecrire('imageCarteSpeciale', { id: 'icon:dan-carter', image: png });
  egal(envoi.statut, 200, 'image envoyée');
  const url = envoi.donnees.image as string;
  ok(url.startsWith('/api/carriere?imageSpeciale=icon%3Adan-carter&v='), 'URL d’image versionnée');
  egal((await appel(idAutre, url)).statut, 404, 'image invisible avant publication');
  const apercu = await appel(idKiri, url);
  ok(apercu.statut === 200 && apercu.octets && apercu.entetes['Cache-Control'] === 'private, no-store', 'Kiri voit l’aperçu privé');
  egal((await ecrire('publierCartesSpeciales', { ids: ['icon:dan-carter', 'icon:richie-mccaw'], published: true })).donnees.ignorees, ['Richie McCaw'], 'publication en masse : sans image, ignorée');
  const publique = await appel(idAutre, url);
  ok(publique.statut === 200 && publique.entetes['Content-Type'] === 'image/png' && publique.entetes['Cache-Control'].includes('immutable'), 'image publique après publication');
  egal((await ecrire('evenementSpecial', { id: 'halloween-2026', evenement: { pack: { prix: 220, cartes: 15 }, tauxPacksNormaux: 1.5 } })).statut, 200, 'pack Halloween : prix et volume réglés');
  egal((await ecrire('evenementSpecial', { id: 'icons', evenement: { actif: false } })).statut, 200, 'bouton « Activer ICONS »');
  const apresReglage = await appel(idKiri, '/api/carriere?atelier=1&section=speciales');
  egal([apresReglage.donnees.evenements.find((e: any) => e.id === 'halloween-2026').pack.prix, apresReglage.donnees.evenements.find((e: any) => e.id === 'halloween-2026').pack.cartes], [220, 15], 'prix et volume relus');
  egal(apresReglage.donnees.evenements.find((e: any) => e.id === 'icons').actif, false, 'ICONS coupées');
  const carter = apresReglage.donnees.cartes.find((c: any) => c.id === 'icon:dan-carter');
  egal([carter.overall, carter.collectif, carter.packWeight, carter.statut], [96, 8, 2, 'published'], 'carte relue');
  egal((await ecrire('creerCarteSpeciale', { carte: { cardType: 'halloween', nom: 'Sébastien Vahaamahina', poste: 'deuxieme_ligne_d', nation: 'France', overall: 84 } })).statut, 200, 'ajout d’une Halloween au lot');
  egal((await ecrire('importCartesSpeciales', { lignes: [
    { cardType: 'icon', nom: 'Sébastien Chabal', poste: 'numero_8', nation: 'France', overall: 89 },
    { cardType: 'halloween', nom: 'Hors bornes', poste: 'arriere', nation: 'France', overall: 70 },
  ] })).donnees.erreurs.length, 1, 'import en masse : la ligne fautive est rendue, les autres passent');
  // La Collection solo lit le catalogue public : seules les cartes publiées, le pack au prix du Labo.
  const publicSolo = await appel('', '/api/carriere?catalogueSolo=1&revision=-1');
  egal(publicSolo.statut, 200, 'catalogue solo public');
  egal(publicSolo.donnees.speciales.definitions.map((d: any) => d.id), ['icon:dan-carter'], 'le public ne reçoit que les cartes publiées');
  egal(publicSolo.donnees.speciales.evenements.find((e: any) => e.id === 'halloween-2026').pack.prix, 220, 'le pack Halloween solo suit le prix du Labo');

  // ── 13. Imports joueurs ─────────────────────────────────────────────────
  const lot = await appel(idKiri, '/api/carriere?atelier=1&section=imports&lot=mlr-championship-npc');
  egal(lot.statut, 200, 'lot MLR · Championship · NPC analysé');
  ok(lot.donnees.analyses.length > 900, 'près de mille joueurs dans le lot');
  egal(lot.donnees.compteurs.nouveau, 0, 'aucun nom du lot absent');
  ok(lot.donnees.analyses.filter((a: any) => a.ligne.fichesSource > 1).every((a: any) => a.verdict === 'present'), 'tous les homonymes source sont intégrés');
  const andrew = lot.donnees.analyses.find((a: any) => a.ligne.nom === 'Andrew SMITH' && a.ligne.club === 'Waikato');
  ok(andrew?.verdict === 'present', 'Andrew Smith (Waikato) existe séparément du joueur du Munster');
  const analyseManuelle = await appel(idKiri, '/api/carriere?atelier=1', { action: 'atelier', operation: 'analyserImport', lignes: [{ ...andrew.ligne, club: 'Club de vérification' }] });
  const douteux = analyseManuelle.donnees.analyses[0];
  egal(douteux.verdict, 'douteux', 'une nouvelle identité incertaine nécessite toujours une décision');
  egal((await ecrire('deciderImport', { decisions: [{ ligne: douteux.ligne, decision: 'ajouter' }] })).donnees.ajoutes, 1, 'validation manuelle : ajouté');
  const config = await db.atelier!.lire();
  ok(Object.keys(config.ajouts ?? {}).some(id => id.startsWith('import:andrew-smith:club-de-verification')), 'un identifiant propre, distinct de l’homonyme');
  const relu = await appel(idKiri, '/api/carriere?atelier=1', { action: 'atelier', operation: 'analyserImport', lignes: [douteux.ligne] });
  ok(relu.donnees.analyses.find((a: any) => a.cle === douteux.cle).decision?.decision === 'ajouter', 'la décision est retenue');
  const apresImport = await appel('', '/api/carriere?catalogueSolo=1&revision=-1');
  egal(Object.keys(apresImport.donnees.ajouts), Object.keys(config.ajouts ?? {}), 'les ajouts du Labo sont transmis au solo');
  const manuel = await appel(idKiri, '/api/carriere?atelier=1', { action: 'atelier', operation: 'analyserImport', lignes: [
    { prenom: 'Antoine', nom: 'Dupont', club: 'Stade Toulousain', ligue: 'Top 14' },
    { prenom: 'Joueur', nom: 'Inventé', club: 'Seattle', ligue: 'MLR', poste: 'Pilier' },
    { prenom: 'Antoine', nom: 'Dupont', club: 'Seattle', ligue: 'MLR' },
  ] });
  egal(manuel.donnees.analyses.map((a: any) => a.verdict), ['present', 'nouveau', 'douteux'], 'nom + club / nouveau / nom seul : à valider');
} finally { rmSync(dossier, { recursive: true, force: true }); }

console.log(`OK cartes spéciales — ${controles} contrôles.`);
