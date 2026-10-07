// LE MARCHÉ COMMUN DES DIVISIONS PUBLIQUES — banc du Correctif 24 (points 13 à 15) — `npm run verify:marche-commun`
//
// Ce qu'il tient fermé :
//   1. les règles du document commun : une annonce n'y existe qu'une fois, une seule réclamation passe, les enchères
//      se dépassent d'au moins 5 %, l'enchérisseur dépassé est à rembourser ;
//   2. à travers le VRAI gestionnaire HTTP, devant le stockage fichier : une annonce de la division 1 se voit et s'achète
//      depuis la division 2 ; trois acheteurs simultanés, un seul servi ; aucun Ova créé ni perdu ; aucune carte en double ;
//   3. les enchères entre divisions, l'annulation, l'expiration ;
//   4. les coupures : un achat réclamé mais pas conclu se termine tout seul, une seule fois ; une réserve sans achat est
//      rendue ; une annonce jamais publiée est republiée ;
//   5. ce qui ne doit pas bouger : une ligue privée garde son marché ; sans la table, une division publique aussi.
//
// Lancer : npm run verify:marche-commun
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { stockageFichier } from '../serveur/carriereFichier';
import type { StockageCarriere } from '../serveur/carriereStockage';
import { agirCarriere, creerCarriere, creerDivisionPublique, operationMarcheCarriere } from '../src/lib/ligue/carriere';
import {
  annulerAnnonce, echeancesMarche, enchereMinimale, ErreurMarche, idClubExterne, idMarchePublic, marcheVide, placerEnchere, publierAnnonce,
  reclamerAnnonce, refReserve, vueMarchePartage, type AnnoncePartagee, type EtatMarchePartage, type PartieMarche, type VueMarchePartage,
} from '../src/lib/ligue/marchePartage';
import type { CarteCarriere, EtatCarriereEnLigne, VueCarriereEnLigne } from '../src/lib/ligue/typesCarriere';

const T0 = Date.parse('2026-10-12T10:00:00.000Z');
let horloge = T0;
Date.now = () => horloge;
const HEURE = 3_600_000;
let controles = 0;
const ok = (condition: unknown, message: string) => { controles++; assert.ok(condition, message); };
const egal = <T>(a: T, b: T, message: string) => { controles++; assert.deepEqual(a, b, message); };
const refuse = (f: () => unknown, message: string) => { controles++; assert.throws(f, ErreurMarche, message); };
const uuid = (prefixe: string, n: number) => `${prefixe}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// ═══ 1. Les règles du document commun ═══════════════════════════════════════
{
  const partie = (ligue: number, club: number): PartieMarche => ({ ligueId: uuid('a', ligue), clubId: `club-${ligue}-${club}`, pseudo: `P${ligue}${club}`, nom: `Club ${ligue}.${club}`, division: ligue });
  const carte = { id: 'c1', sourceId: 's1', nom: 'Joueur Un', proprietaire: 'club-1-1', verrou: 'v', favori: true } as unknown as CarteCarriere;
  const annonce = (id: string, type: 'directe' | 'enchere', prix = 500): AnnoncePartagee => ({ id, vendeur: partie(1, 1), carte, type, prix,
    publieLe: new Date(T0).toISOString(), expireLe: new Date(T0 + HEURE).toISOString(), etat: 'ouverte' });
  const m = marcheVide(1);
  ok(publierAnnonce(m, annonce('v1', 'directe')), 'une annonce se publie');
  ok(!publierAnnonce(m, annonce('v1', 'directe')), 'publiée deux fois, elle n\'existe qu\'une fois');
  egal(m.annonces.length, 1, 'une seule annonce dans le document');
  ok(!('verrou' in m.annonces[0].carte) && !('favori' in m.annonces[0].carte), 'la carte publiée ne porte ni verrou ni favori');
  refuse(() => reclamerAnnonce(m, 'v1', partie(1, 1), T0), 'on n\'achète pas sa propre carte');
  const a = reclamerAnnonce(m, 'v1', partie(2, 1), T0);
  ok(a.etat === 'reclamee' && a.acheteur?.clubId === 'club-2-1' && a.acheteur.montant === 500, 'la première réclamation prend l\'annonce');
  refuse(() => reclamerAnnonce(m, 'v1', partie(3, 1), T0), 'la seconde est refusée');
  refuse(() => annulerAnnonce(m, 'v1', partie(1, 1)), 'une annonce réclamée ne s\'annule plus');

  publierAnnonce(m, annonce('v2', 'enchere', 300));
  refuse(() => reclamerAnnonce(m, 'v2', partie(2, 1), T0), 'une enchère ne s\'achète pas comptant');
  refuse(() => placerEnchere(m, 'v2', partie(2, 1), 299, T0), 'une enchère sous la mise à prix est refusée');
  placerEnchere(m, 'v2', partie(2, 1), 300, T0);
  egal(enchereMinimale(m.annonces.find((x) => x.id === 'v2')!), 325, 'la surenchère minimale est de 25 Ovas au moins');
  refuse(() => placerEnchere(m, 'v2', partie(3, 1), 324, T0), 'une surenchère trop faible est refusée');
  placerEnchere(m, 'v2', partie(3, 1), 400, T0);
  egal(m.remboursements, [{ ligueId: uuid('a', 2), clubId: 'club-2-1', ref: refReserve('v2', 300) }], 'l\'enchérisseur dépassé est à rembourser');
  refuse(() => annulerAnnonce(m, 'v2', partie(1, 1)), 'une annonce avec enchère ne s\'annule pas');
  refuse(() => placerEnchere(m, 'v2', partie(1, 1), 900, T0), 'on n\'enchérit pas sur sa carte');
  refuse(() => placerEnchere(m, 'v2', partie(2, 2), 900, T0 + HEURE), 'une enchère close ne reçoit plus d\'offre');

  publierAnnonce(m, annonce('v3', 'directe'));
  refuse(() => annulerAnnonce(m, 'v3', partie(1, 2)), 'seul le vendeur retire son annonce');
  annulerAnnonce(m, 'v3', partie(1, 1));
  ok(!m.annonces.some((x) => x.id === 'v3') && m.clotures.some((c) => c.venteId === 'v3' && c.issue === 'annulee'), 'annulée : sortie du marché, carte à déverrouiller');

  publierAnnonce(m, annonce('v4', 'directe'));
  ok(!echeancesMarche(m, T0 + HEURE - 1), 'rien n\'expire avant l\'heure');
  ok(echeancesMarche(m, T0 + HEURE), 'l\'heure venue, les échéances tombent');
  ok(m.clotures.some((c) => c.venteId === 'v4' && c.issue === 'expiree'), 'sans preneur : expirée');
  const v2 = m.annonces.find((x) => x.id === 'v2')!;
  ok(v2.etat === 'reclamee' && v2.acheteur?.clubId === 'club-3-1' && v2.acheteur.montant === 400, 'l\'enchère revient au meilleur enchérisseur');

  // La vue : mes clubs gardent leur identifiant, ceux des autres divisions portent « ext: ».
  const n = marcheVide(1);
  publierAnnonce(n, annonce('v5', 'enchere', 100));
  placerEnchere(n, 'v5', partie(2, 1), 120, T0);
  const vueD1 = vueMarchePartage(n, 7, uuid('a', 1), T0), vueD2 = vueMarchePartage(n, 7, uuid('a', 2), T0);
  ok(vueD1.ventes[0].vendeurId === 'club-1-1' && vueD1.cartes.length === 0, 'dans la division du vendeur : son club, et la carte est déjà dans la ligue');
  ok(vueD2.ventes[0].vendeurId === idClubExterne(partie(1, 1)) && vueD2.cartes.length === 1 && vueD2.clubs[vueD2.ventes[0].vendeurId] === 'Club 1.1 · D1', 'dans une autre division : club externe nommé, carte fournie');
  ok(vueD2.ventes[0].enchere?.clubId === 'club-2-1' && vueD1.ventes[0].enchere?.clubId === idClubExterne(partie(2, 1)), 'l\'enchérisseur est reconnu dans SA division');
  egal(vueMarchePartage(n, 7, uuid('a', 2), T0 + HEURE).ventes.length, 0, 'une annonce échue ne s\'affiche plus');
  console.log('1. règles du document commun');
}

// ═══ 2 à 5. À travers le vrai gestionnaire ══════════════════════════════════
const dossier = mkdtempSync(join(tmpdir(), 'marche-commun-'));
const COMPTES = ['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'p1', 'p2'].map((nom, k) => ({ nom, id: uuid('c', k + 1), jeton: `jeton-${nom}` }));
const compte = (nom: string) => COMPTES.find((c) => c.nom === nom)!;
function baseNeuve(nom: string) {
  const fichier = join(dossier, `${nom}.json`);
  writeFileSync(fichier, JSON.stringify({
    comptes: COMPTES.map((c) => ({ id: c.id, identifiant: c.nom, pseudo: c.nom.toUpperCase(), empreinte: '', creeLe: T0, vuLe: T0 })),
    sessions: Object.fromEntries(COMPTES.map((c) => [empreinteJeton(c.jeton), { compte: c.id, expiration: T0 + 365 * 24 * HEURE }])),
    ligues: [], recus: {}, debits: {},
  }));
  return stockageFichier(fichier);
}

/** Une division publique de trois clubs (en salon : le marché n'attend pas le coup d'envoi). */
function division(numero: number, noms: string[]): EtatCarriereEnLigne {
  let etat = creerDivisionPublique({ id: uuid(numero === 1 ? 'a' : 'b', 1), code: `DR-PUBLIC-C1-D${numero}`, compteId: compte(noms[0]).id,
    pseudo: noms[0].toUpperCase(), clubNom: `Club ${noms[0]}` }, 1, numero, T0, `div-${numero}`);
  for (const nom of noms.slice(1)) etat = agirCarriere(etat, compte(nom).id, { type: 'rejoindre', pseudo: nom.toUpperCase(), clubNom: `Club ${nom}` }, T0, `div-${numero}-${nom}`);
  return etat;
}

function banc(stockage: StockageCarriere) {
  const api = creerGestionnaireCarriere(stockage, async () => {});
  let n = 0;
  async function appeler(methode: 'GET' | 'POST', url: string, nom: string, body?: object) {
    let statut = 200; let donnees: any;
    const res = { status(x: number) { statut = x; return res; }, setHeader() {}, json(x: unknown) { donnees = x; } };
    await api.handler({ method: methode, url, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: `destiny_carriere=${compte(nom).jeton}` }, body } as never, res as never);
    return { statut, donnees };
  }
  const commander = (nom: string, ligue: string, commande: object, requete = `requete-banc-marche-${++n}`) =>
    appeler('POST', '/api/carriere?action=commande', nom, { action: 'commande', ligue, requeteId: requete, commande });
  const marche = async (nom: string, ligue: string, mv?: number) =>
    (await appeler('GET', `/api/carriere?ligue=${ligue}&marche=1${mv === undefined ? '' : `&mv=${mv}`}`, nom)).donnees as VueMarchePartage & { inchange?: true; indisponible?: true };
  const etat = async (ligue: string) => (await stockage.ligue(ligue))!.etat;
  const document = async () => ((await stockage.lireMarche!(idMarchePublic(1)))?.donnees ?? marcheVide(1)) as EtatMarchePartage;
  return { appeler, commander, marche, etat, document };
}

const club = (e: EtatCarriereEnLigne, nom: string) => e.clubs.find((c) => c.compteId === compte(nom).id)!;
/** Une carte vendable : hors feuille de match, la moins bien notée (le plancher d'effectif laisse partir quatre cartes). */
function vendable(e: EtatCarriereEnLigne, nom: string, rang = 0): CarteCarriere {
  const c = club(e, nom);
  const feuille = new Set([...c.composition.titulaires, ...c.composition.remplacants]);
  return e.cartes.filter((x) => x.proprietaire === c.id && !x.verrou && !feuille.has(x.id)).sort((a, b) => a.note - b.note)[rang];
}

const stockage = baseNeuve('commun');
const D1 = division(1, ['a1', 'a2', 'a3']), D2 = division(2, ['b1', 'b2', 'b3']);
for (const e of [D1, D2]) await stockage.creerLigue({ id: e.id, code: e.code, version: 0, comptes: e.clubs.map((c) => c.compteId), etat: e });
const B = banc(stockage);

/** Tout ce qui ne doit jamais varier : les Ovas (soldes + réserves) et le nombre de cartes des deux divisions. */
async function bilan() {
  const etats = [await B.etat(D1.id), await B.etat(D2.id)];
  const ovas = etats.flatMap((e) => e.clubs).reduce((s, c) => s + c.ovas + (c.reservesMarche ?? []).reduce((x, r) => x + r.montant, 0), 0);
  const cartes = etats.reduce((s, e) => s + e.cartes.filter((c) => c.proprietaire).length, 0);
  const reserves = etats.flatMap((e) => e.clubs).reduce((s, c) => s + (c.reservesMarche?.length ?? 0), 0);
  return { ovas, cartes, reserves };
}
const depart = await bilan();
const invariants = async (quoi: string, reservesAttendues = 0) => {
  const b = await bilan();
  egal(b.ovas, depart.ovas, `${quoi} : aucun Ova créé ni perdu`);
  egal(b.cartes, depart.cartes, `${quoi} : aucune carte créée ni perdue`);
  egal(b.reserves, reservesAttendues, `${quoi} : ${reservesAttendues} réserve(s) en cours`);
};

// ── 2. Vendre en division 1, voir et acheter depuis la division 2 ────────────
{
  ok((await B.marche('a1', D1.id)).ventes?.length === 0, 'le marché commun répond, vide');
  const carte = vendable(await B.etat(D1.id), 'a1');
  const r = await B.commander('a1', D1.id, { type: 'vendre', carteId: carte.id, prix: 500, mode: 'directe', dureeHeures: 24 });
  egal(r.statut, 200, `la mise en vente passe (${r.donnees?.erreur})`);
  const vente = (r.donnees as VueCarriereEnLigne).ventes.at(-1)!;
  ok(vente.partagee === true && vente.etat === 'ouverte', 'l\'annonce est notée « marché commun » dans la ligue du vendeur');
  ok((await B.etat(D1.id)).cartes.find((c) => c.id === carte.id)?.verrou === vente.id, 'la carte reste chez le vendeur, verrouillée');
  egal((await B.document()).annonces.length, 1, 'UNE annonce dans le document commun');

  const vueD2 = await B.marche('b1', D2.id), vueD1 = await B.marche('a2', D1.id);
  ok(vueD2.ventes.length === 1 && vueD2.ventes[0].id === vente.id && vueD2.cartes[0]?.nom === carte.nom, 'la division 2 voit l\'annonce et sa carte');
  ok(vueD2.ventes[0].vendeurId.startsWith('ext:') && vueD2.clubs[vueD2.ventes[0].vendeurId] === 'Club a1 · D1', 'avec le nom du club vendeur et sa division');
  ok(vueD1.ventes.length === 1 && vueD1.ventes[0].vendeurId === club(D1, 'a1').id && vueD1.cartes.length === 0, 'la division 1 voit la même annonce, une seule fois');
  ok((await B.marche('b1', D2.id, vueD2.version)).inchange === true, 'relue à la même révision : « inchangé »');
  egal((await B.commander('a1', D1.id, { type: 'acheter', venteId: vente.id })).statut, 409, 'on n\'achète pas sa propre annonce');
  await invariants('achat de sa propre carte refusé');

  // ⚠️ LE CAS DE LA DEMANDE : trois acheteurs de deux divisions, au même instant.
  const avant = { d1: await B.etat(D1.id), d2: await B.etat(D2.id) };
  const reponses = await Promise.all([
    B.commander('b1', D2.id, { type: 'acheter', venteId: vente.id }),
    B.commander('b2', D2.id, { type: 'acheter', venteId: vente.id }),
    B.commander('a2', D1.id, { type: 'acheter', venteId: vente.id }),
  ]);
  const servis = reponses.filter((x) => x.statut === 200), refusesN = reponses.filter((x) => x.statut === 409);
  egal([servis.length, refusesN.length], [1, 2], `trois acheteurs simultanés : un seul servi (${reponses.map((x) => `${x.statut} ${x.donnees?.erreur ?? ''}`).join(' | ')})`);
  ok(refusesN.every((x) => x.donnees.erreur === 'Cette vente n’est plus disponible.'), 'les deux autres lisent « plus disponible »');
  const gagnant = ['b1', 'b2', 'a2'][reponses.findIndex((x) => x.statut === 200)];
  const apres = { d1: await B.etat(D1.id), d2: await B.etat(D2.id) };
  const tous = [...apres.d1.cartes, ...apres.d2.cartes].filter((c) => c.sourceId === carte.sourceId && c.nom === carte.nom && c.proprietaire);
  egal(tous.length, 1, 'la carte n\'existe qu\'UNE fois, toutes divisions confondues');
  const ligueGagnant = gagnant === 'a2' ? apres.d1 : apres.d2, ligueAvant = gagnant === 'a2' ? avant.d1 : avant.d2;
  egal(tous[0].proprietaire, club(ligueGagnant, gagnant).id, 'elle est chez l\'acheteur servi');
  ok(!tous[0].verrou && !tous[0].favori, 'livrée sans verrou ni favori');
  egal(club(ligueGagnant, gagnant).ovas, club(ligueAvant, gagnant).ovas - 500, 'l\'acheteur a payé 500');
  egal(club(apres.d1, 'a1').ovas, club(avant.d1, 'a1').ovas + 500, 'le vendeur a reçu 500');
  for (const perdant of ['b1', 'b2', 'a2'].filter((x) => x !== gagnant)) {
    const l = perdant === 'a2' ? apres.d1 : apres.d2, la = perdant === 'a2' ? avant.d1 : avant.d2;
    egal(club(l, perdant).ovas, club(la, perdant).ovas, `${perdant} n'a rien payé`);
  }
  egal(apres.d1.ventes.find((v) => v.id === vente.id)?.etat, 'vendue', 'la vente est close dans la ligue du vendeur');
  egal((await B.document()).annonces.length, 0, 'l\'annonce a quitté le document commun');
  egal((await B.marche('b3', D2.id)).ventes.length, 0, 'et plus personne ne la voit');
  await invariants('achat simultané');
  egal((await B.commander('b3', D2.id, { type: 'acheter', venteId: vente.id })).statut, 409, 'un achat après coup est refusé');
  await invariants('achat après coup');
  console.log(`2. annonce partagée, trois acheteurs simultanés : ${gagnant} servi, les deux autres refusés`);
}

// ── 2 bis. La même requête renvoyée deux fois ne paie qu'une fois ───────────
{
  const carte = vendable(await B.etat(D2.id), 'b1');
  const v = (await B.commander('b1', D2.id, { type: 'vendre', carteId: carte.id, prix: 200, mode: 'directe', dureeHeures: 24 })).donnees.ventes.at(-1);
  const avant = club(await B.etat(D1.id), 'a3').ovas;
  const un = await B.commander('a3', D1.id, { type: 'acheter', venteId: v.id }, 'requete-rejouee-0001');
  const deux = await B.commander('a3', D1.id, { type: 'acheter', venteId: v.id }, 'requete-rejouee-0001');
  egal([un.statut, deux.statut], [200, 200], 'la requête rejouée répond comme la première');
  egal(club(await B.etat(D1.id), 'a3').ovas, avant - 200, 'et n\'a débité qu\'une fois');
  await invariants('requête rejouée');
  // Pas assez d'Ovas : refus net, rien de réservé.
  const chere = vendable(await B.etat(D2.id), 'b1');
  const vc = (await B.commander('b1', D2.id, { type: 'vendre', carteId: chere.id, prix: 900_000, mode: 'directe', dureeHeures: 24 })).donnees.ventes.at(-1);
  const pauvre = await B.commander('a3', D1.id, { type: 'acheter', venteId: vc.id });
  ok(pauvre.statut === 400 && pauvre.donnees.erreur === 'Ovas insuffisants.', 'sans les Ovas, l\'achat est refusé');
  await invariants('achat sans les Ovas');
  egal((await B.commander('b1', D2.id, { type: 'annulerVente', venteId: vc.id })).statut, 200, 'le vendeur retire son annonce');
  const d2 = await B.etat(D2.id);
  ok(d2.ventes.find((x) => x.id === vc.id)?.etat === 'annulee' && !d2.cartes.find((c) => c.id === chere.id)?.verrou, 'retirée : vente annulée, carte déverrouillée');
  egal((await B.commander('a2', D1.id, { type: 'acheter', venteId: vc.id })).statut, 409, 'une annonce retirée ne s\'achète plus');
  egal((await B.commander('b2', D2.id, { type: 'annulerVente', venteId: vc.id })).statut, 409, 'ni ne se retire deux fois');
  await invariants('annulation');
  console.log('2 bis. requête rejouée, Ovas insuffisants, annulation');
}

// ── 2 ter. Trois INSTANCES du serveur lisent la même révision avant d'écrire ─
// Le cas le plus dur : chaque acheteur passe par une fonction serverless différente, et toutes ont lu le document avant
// que l'une d'elles n'écrive. La comparaison de version doit en refuser deux, qui relisent et trouvent l'annonce prise.
{
  let echecs = 0, retenir = true;
  const lent = { ...stockage,
    lireMarche: async (id: string) => { const r = await stockage.lireMarche!(id); if (retenir) await new Promise((f) => setTimeout(f, 20)); return r; },
    comparerEtEcrireMarche: async (id: string, revision: number | null, donnees: unknown) => {
      const passe = await stockage.comparerEtEcrireMarche!(id, revision, donnees);
      if (!passe) echecs++;
      return passe;
    } } as StockageCarriere;
  const instances = [banc(lent), banc(lent), banc(lent)];
  const carte = vendable(await B.etat(D1.id), 'a2');
  const v = (await B.commander('a2', D1.id, { type: 'vendre', carteId: carte.id, prix: 60, mode: 'directe', dureeHeures: 24 })).donnees.ventes.at(-1);
  const reponses = await Promise.all([
    instances[0].commander('b1', D2.id, { type: 'acheter', venteId: v.id }, 'requete-instance-0001'),
    instances[1].commander('b2', D2.id, { type: 'acheter', venteId: v.id }, 'requete-instance-0002'),
    instances[2].commander('a3', D1.id, { type: 'acheter', venteId: v.id }, 'requete-instance-0003'),
  ]);
  retenir = false;
  egal(reponses.map((x) => x.statut).sort(), [200, 409, 409], `trois instances : un seul achat passe (${reponses.map((x) => `${x.statut} ${x.donnees?.erreur ?? ''}`).join(' | ')})`);
  ok(echecs >= 1, `la comparaison de version a bien refusé des écritures concurrentes (${echecs})`);
  const tous = [...(await B.etat(D1.id)).cartes, ...(await B.etat(D2.id)).cartes].filter((c) => c.sourceId === carte.sourceId && c.nom === carte.nom && c.proprietaire);
  egal(tous.length, 1, 'la carte n\'existe toujours qu\'une fois');
  await invariants('trois instances');
  console.log(`2 ter. trois instances sur la même révision : un achat, ${echecs} écriture(s) refusée(s) par la comparaison de version`);
}

// ── 3. Enchères entre divisions, puis expiration ────────────────────────────
{
  const carte = vendable(await B.etat(D1.id), 'a1');
  const v = (await B.commander('a1', D1.id, { type: 'vendre', carteId: carte.id, prix: 300, mode: 'enchere', dureeHeures: 1 })).donnees.ventes.at(-1);
  const soldes = async () => ({ a1: club(await B.etat(D1.id), 'a1').ovas, a2: club(await B.etat(D1.id), 'a2').ovas, b1: club(await B.etat(D2.id), 'b1').ovas, b2: club(await B.etat(D2.id), 'b2').ovas });
  const s0 = await soldes();
  egal((await B.commander('b1', D2.id, { type: 'encherir', venteId: v.id, montant: 300 })).statut, 200, 'la division 2 enchérit sur une annonce de la division 1');
  egal((await soldes()).b1, s0.b1 - 300, 'ses Ovas sont réservés');
  await invariants('première enchère', 1);
  egal((await B.commander('b2', D2.id, { type: 'encherir', venteId: v.id, montant: 310 })).statut, 409, 'une surenchère de moins de 25 Ovas est refusée');
  egal((await soldes()).b2, s0.b2, 'et rien n\'est réservé');
  egal((await B.commander('a2', D1.id, { type: 'encherir', venteId: v.id, montant: 340 })).statut, 200, 'la division 1 surenchérit');
  const s1 = await soldes();
  egal([s1.b1, s1.a2], [s0.b1, s0.a2 - 340], 'l\'enchérisseur dépassé est remboursé, le nouveau a réservé');
  ok((await B.marche('b1', D2.id)).ventes.find((x) => x.id === v.id)?.enchere?.montant === 340, 'tout le monde voit la meilleure enchère');
  await invariants('surenchère', 1);
  // Surenchérir sur soi-même : la première réserve est rendue.
  egal((await B.commander('a2', D1.id, { type: 'encherir', venteId: v.id, montant: 400 })).statut, 200, 'on peut relever sa propre enchère');
  egal((await soldes()).a2, s0.a2 - 400, 'seule la dernière offre reste réservée');
  await invariants('enchère relevée', 1);
  egal((await B.commander('a1', D1.id, { type: 'annulerVente', venteId: v.id })).statut, 409, 'une annonce avec enchère ne se retire plus');

  horloge += HEURE + 1_000;
  egal((await B.commander('b2', D2.id, { type: 'encherir', venteId: v.id, montant: 900 })).statut, 409, 'une enchère close ne reçoit plus d\'offre');
  await B.marche('b3', D2.id);
  const d1 = await B.etat(D1.id);
  const livree = d1.cartes.filter((c) => c.sourceId === carte.sourceId && c.nom === carte.nom && c.proprietaire);
  ok(livree.length === 1 && livree[0].proprietaire === club(d1, 'a2').id, 'à l\'échéance, la carte va au meilleur enchérisseur');
  const s2 = await soldes();
  egal([s2.a1, s2.a2, s2.b1], [s0.a1 + 400, s0.a2 - 400, s0.b1], 'le vendeur touche l\'enchère, le perdant a tout récupéré');
  egal(d1.ventes.find((x) => x.id === v.id)?.etat, 'vendue', 'l\'enchère est close dans la ligue du vendeur');
  await invariants('enchère conclue');

  // Sans preneur : l'annonce expire, la carte est rendue.
  const seule = vendable(await B.etat(D2.id), 'b2');
  const vs = (await B.commander('b2', D2.id, { type: 'vendre', carteId: seule.id, prix: 250, mode: 'directe', dureeHeures: 1 })).donnees.ventes.at(-1);
  horloge += HEURE + 1_000;
  await B.marche('a1', D1.id);
  const d2 = await B.etat(D2.id);
  ok(d2.ventes.find((x) => x.id === vs.id)?.etat === 'expiree' && !d2.cartes.find((c) => c.id === seule.id)?.verrou, 'sans preneur : annonce expirée, carte déverrouillée');
  egal((await B.document()).annonces.length + (await B.document()).clotures.length + (await B.document()).remboursements.length, 0, 'le document commun ne garde rien');
  await invariants('expiration');
  console.log('3. enchères entre divisions, conclusion à l\'échéance, expiration');
}

// ── 4. Les coupures ─────────────────────────────────────────────────────────
{
  /** Écrit directement une ligue, comme le ferait une étape du serveur. */
  const ecrire = async (id: string, f: (e: EtatCarriereEnLigne) => EtatCarriereEnLigne) => {
    const l = (await stockage.ligue(id))!;
    ok(await stockage.comparerEtEcrire({ ...l, etat: f(l.etat) }, l.version), 'écriture directe de la ligue');
  };
  const ecrireDocument = async (f: (m: EtatMarchePartage) => void) => {
    const lu = await stockage.lireMarche!(idMarchePublic(1));
    const m = structuredClone((lu?.donnees ?? marcheVide(1)) as EtatMarchePartage);
    f(m);
    ok(await stockage.comparerEtEcrireMarche!(idMarchePublic(1), lu ? lu.revision : null, m), 'écriture directe du document');
  };

  // (a) Le serveur s'arrête juste APRÈS la réclamation : ni soldé, ni livré.
  const carte = vendable(await B.etat(D1.id), 'a1');
  const v = (await B.commander('a1', D1.id, { type: 'vendre', carteId: carte.id, prix: 150, mode: 'directe', dureeHeures: 24 })).donnees.ventes.at(-1);
  const avantB3 = club(await B.etat(D2.id), 'b3').ovas, avantA1 = club(await B.etat(D1.id), 'a1').ovas;
  await ecrire(D2.id, (e) => operationMarcheCarriere(e, { type: 'reserver', compteId: compte('b3').id, ref: refReserve(v.id, 150), montant: 150, libelle: 'Achat', carte, clubLibre: true }, horloge).etat);
  const d2 = await B.etat(D2.id);
  await ecrireDocument((m) => { reclamerAnnonce(m, v.id, { ligueId: D2.id, clubId: club(d2, 'b3').id, pseudo: 'B3', nom: 'Club b3', division: 2 }, horloge); });
  await invariants('coupure après la réclamation', 1);
  await B.marche('a2', D1.id);   // n'importe quelle requête reprend le travail
  let chezB3 = (await B.etat(D2.id)).cartes.filter((c) => c.nom === carte.nom && c.sourceId === carte.sourceId && c.proprietaire === club(d2, 'b3').id);
  egal(chezB3.length, 1, 'l\'achat interrompu se termine : la carte est livrée');
  egal([club(await B.etat(D2.id), 'b3').ovas, club(await B.etat(D1.id), 'a1').ovas], [avantB3 - 150, avantA1 + 150], 'acheteur débité une fois, vendeur payé une fois');
  await B.marche('a2', D1.id); await B.marche('b1', D2.id);
  chezB3 = (await B.etat(D2.id)).cartes.filter((c) => c.nom === carte.nom && c.sourceId === carte.sourceId && c.proprietaire === club(d2, 'b3').id);
  egal(chezB3.length, 1, 'reprise une seconde fois, rien n\'est livré deux fois');
  ok(!(await B.etat(D1.id)).cartes.some((c) => c.id === carte.id), 'et la carte a quitté le vendeur');
  await invariants('reprise après coupure');

  // (b) Le serveur s'arrête entre le solde et la livraison : la carte n'est plus chez personne, le document la porte.
  const carte2 = vendable(await B.etat(D1.id), 'a2');
  const v2 = (await B.commander('a2', D1.id, { type: 'vendre', carteId: carte2.id, prix: 120, mode: 'directe', dureeHeures: 24 })).donnees.ventes.at(-1);
  await ecrire(D2.id, (e) => operationMarcheCarriere(e, { type: 'reserver', compteId: compte('b1').id, ref: refReserve(v2.id, 120), montant: 120, libelle: 'Achat', carte: carte2, clubLibre: true }, horloge).etat);
  await ecrireDocument((m) => { reclamerAnnonce(m, v2.id, { ligueId: D2.id, clubId: club(d2, 'b1').id, pseudo: 'B1', nom: 'Club b1', division: 2 }, horloge); });
  await ecrire(D1.id, (e) => operationMarcheCarriere(e, { type: 'solder', venteId: v2.id, montant: 120, acheteur: 'Club b1 · D2' }, horloge).etat);
  await B.marche('b2', D2.id);
  egal((await B.etat(D2.id)).cartes.filter((c) => c.nom === carte2.nom && c.sourceId === carte2.sourceId && c.proprietaire === club(d2, 'b1').id).length, 1, 'coupure après le solde : la carte est quand même livrée');
  await invariants('reprise après le solde');

  // (c) Une réserve sans achat (arrêt entre le débit et la réclamation) : rendue, mais pas tout de suite.
  const avantB2 = club(await B.etat(D2.id), 'b2').ovas;
  await ecrire(D2.id, (e) => operationMarcheCarriere(e, { type: 'reserver', compteId: compte('b2').id, ref: refReserve(`${D1.id}:vente:999`, 80), montant: 80, libelle: 'Achat', carte, clubLibre: true }, horloge).etat);
  horloge += 61_000;
  await B.marche('b2', D2.id);
  egal(club(await B.etat(D2.id), 'b2').ovas, avantB2 - 80, 'une réserve récente n\'est pas touchée : son achat est peut-être en cours');
  horloge += 91_000;
  await B.marche('b2', D2.id);
  egal(club(await B.etat(D2.id), 'b2').ovas, avantB2, 'une réserve restée sans achat est rendue');
  await invariants('réserve orpheline');

  // (d) Une annonce écrite dans la ligue mais jamais publiée : republiée.
  const carte3 = vendable(await B.etat(D2.id), 'b3');
  await ecrire(D2.id, (e) => agirCarriere(e, compte('b3').id, { type: 'vendre', carteId: carte3.id, prix: 90, mode: 'directe', dureeHeures: 24, partagee: true }, horloge, 'oubliee'));
  egal((await B.document()).annonces.length, 0, 'l\'annonce n\'est pas encore dans le document');
  horloge += 61_000;
  await B.marche('b3', D2.id);
  const publiees = (await B.document()).annonces;
  ok(publiees.length === 1 && publiees[0].carte.nom === carte3.nom, 'une annonce restée dans la ligue est republiée');
  egal((await B.commander('a1', D1.id, { type: 'acheter', venteId: publiees[0].id })).statut, 200, 'et elle s\'achète normalement');
  await invariants('annonce republiée');
  console.log('4. coupures : achat repris une seule fois, réserve rendue, annonce republiée');
}

// ── 4 bis. Le cycle suivant repart sans verrou ni réserve ───────────────────
{
  const carte = vendable(await B.etat(D1.id), 'a3');
  const v = (await B.commander('a3', D1.id, { type: 'vendre', carteId: carte.id, prix: 100, mode: 'enchere', dureeHeures: 48 })).donnees.ventes.at(-1);
  await B.commander('b2', D2.id, { type: 'encherir', venteId: v.id, montant: 100 });
  const d1 = await B.etat(D1.id), d2 = await B.etat(D2.id);
  const suivant = creerDivisionPublique({ id: uuid('d', 1), code: 'DR-PUBLIC-C2-D1', compteId: compte('a1').id, pseudo: 'A1', clubNom: 'Club a1' }, 2, 1, horloge, 'cycle-2',
    [...d1.clubs.map((c) => ({ club: c, cartes: d1.cartes.filter((x) => x.proprietaire === c.id) })), ...d2.clubs.map((c) => ({ club: c, cartes: d2.cartes.filter((x) => x.proprietaire === c.id) }))]);
  ok(suivant.cartes.every((c) => !c.verrou), 'au cycle suivant, aucune carte ne reste verrouillée par une annonce de l\'ancien');
  ok(suivant.clubs.every((c) => !c.reservesMarche), 'ni aucune réserve');
  egal(suivant.clubs.reduce((s, c) => s + c.ovas, 0), depart.ovas, 'les Ovas réservés pour une enchère sont rendus');
  console.log('4 bis. changement de cycle');
}

// ── 5. Ce qui ne doit pas bouger ────────────────────────────────────────────
{
  // Une ligue privée : son marché reste le sien, sans document commun.
  let privee = creerCarriere({ id: uuid('e', 1), nom: 'Privée', code: 'DR-PRIVEE0001', compteId: compte('p1').id, pseudo: 'P1', clubNom: 'Club p1', rythme: 7, maxClubs: 4 }, horloge, 'privee');
  privee = agirCarriere(privee, compte('p2').id, { type: 'rejoindre', pseudo: 'P2', clubNom: 'Club p2' }, horloge, 'privee-2');
  await stockage.creerLigue({ id: privee.id, code: privee.code, version: 0, comptes: privee.clubs.map((c) => c.compteId), etat: privee });
  const documentAvant = JSON.stringify(await B.document());
  const carte = vendable(privee, 'p1');
  const r = await B.commander('p1', privee.id, { type: 'vendre', carteId: carte.id, prix: 100, mode: 'directe', dureeHeures: 24, partagee: true });
  const vente = r.donnees.ventes.at(-1);
  ok(r.statut === 200 && !vente.partagee, 'ligue privée : l\'annonce reste locale, même si le client écrit « partagee »');
  egal((await B.commander('p2', privee.id, { type: 'acheter', venteId: vente.id })).statut, 200, 'et s\'achète dans la ligue, comme avant');
  egal((await B.etat(privee.id)).cartes.find((c) => c.id === carte.id)?.proprietaire, club(await B.etat(privee.id), 'p2').id, 'la carte a changé de club dans la ligue');
  egal(JSON.stringify(await B.document()), documentAvant, 'le document commun n\'a pas bougé');
  ok((await B.marche('p1', privee.id)).indisponible === true, 'une ligue privée n\'a pas de marché commun');

  // Sans la table (migration pas encore passée) : une division publique garde son marché.
  const brut = baseNeuve('sans-table');
  const sans = { ...brut, lireMarche: async () => undefined, comparerEtEcrireMarche: async () => false } as StockageCarriere;
  const S1 = division(1, ['a1', 'a2', 'a3']);
  await sans.creerLigue({ id: S1.id, code: S1.code, version: 0, comptes: S1.clubs.map((c) => c.compteId), etat: S1 });
  const BS = banc(sans);
  const c2 = vendable(S1, 'a1');
  const v2 = (await BS.commander('a1', S1.id, { type: 'vendre', carteId: c2.id, prix: 100, mode: 'directe', dureeHeures: 24 })).donnees.ventes.at(-1);
  ok(!v2.partagee, 'sans la table : l\'annonce reste dans la division');
  egal((await BS.commander('a2', S1.id, { type: 'acheter', venteId: v2.id })).statut, 200, 'et s\'y achète comme avant');
  ok((await BS.marche('a1', S1.id)).indisponible === true, 'l\'écran est prévenu : pas de marché commun');
  console.log('5. ligue privée et base sans la table : inchangées');
}

console.log(`\n✅ ${controles} contrôles`);
