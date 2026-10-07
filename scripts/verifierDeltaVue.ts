// LA RÉPONSE COMPACTE D'UNE COMMANDE — banc du Correctif 25 (points 43 à 46) — `npm run verify:delta-vue`
//
// Ce qu'il tient fermé :
//   1. un écran qui applique les deltas tient EXACTEMENT la vue que le serveur rendrait entière, commande après commande ;
//   2. un écran d'avant (qui n'annonce rien) reçoit toujours la vue entière ;
//   3. un écran dont la version n'est plus la bonne reçoit la vue entière, jamais un delta inapplicable ;
//   4. un delta appliqué sur la mauvaise version est refusé (l'écran redemande la ligue) ;
//   5. ce que ça pèse : la réponse d'une ouverture de pack, avant et après.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { stockageFichier } from '../serveur/carriereFichier';
import { agirCarriere, creerCarriere } from '../src/lib/ligue/carriere';
import { appliquerDeltaVue, differenceVue, estReponseDelta, type DeltaVue } from '../src/lib/ligue/deltaVue';
import type { CarteCarriere, VueCarriereEnLigne } from '../src/lib/ligue/typesCarriere';

const T0 = Date.parse('2026-10-12T10:00:00.000Z');
let horloge = T0;
Date.now = () => horloge;
let controles = 0;
const ok = (c: unknown, m: string) => { controles++; assert.ok(c, m); };
const uuid = (p: string, n: number) => `${p}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const NOMS = Array.from({ length: 16 }, (_, k) => `m${k + 1}`);
const compte = (nom: string) => ({ id: uuid('c', NOMS.indexOf(nom) + 1), jeton: `jeton-${nom}` });

const fichier = join(mkdtempSync(join(tmpdir(), 'delta-vue-')), 'base.json');
writeFileSync(fichier, JSON.stringify({
  comptes: NOMS.map((n) => ({ id: compte(n).id, identifiant: n, pseudo: n.toUpperCase(), empreinte: '', creeLe: T0, vuLe: T0 })),
  sessions: Object.fromEntries(NOMS.map((n) => [empreinteJeton(compte(n).jeton), { compte: compte(n).id, expiration: T0 + 1e10 }])),
  ligues: [], recus: {}, debits: {},
}));
const stockage = stockageFichier(fichier);
// Une ligue pleine (seize clubs, saison lancée) : c'est le cas où la vue entière pèse le plus.
let etat = creerCarriere({ id: uuid('a', 1), nom: 'Delta', code: 'DR-DELTA00001', compteId: compte('m1').id, pseudo: 'M1', clubNom: 'Club m1', rythme: 7, maxClubs: 16 }, T0, 'delta');
for (const n of NOMS.slice(1)) etat = agirCarriere(etat, compte(n).id, { type: 'rejoindre', pseudo: n.toUpperCase(), clubNom: `Club ${n}` }, T0, `delta-${n}`);
etat = agirCarriere(etat, compte('m1').id, { type: 'demarrerSaison' }, T0, 'delta-saison');
await stockage.creerLigue({ id: etat.id, code: etat.code, version: 0, comptes: etat.clubs.map((c) => c.compteId), etat });
const api = creerGestionnaireCarriere(stockage, async () => {});
let n = 0;
async function appeler(methode: 'GET' | 'POST', url: string, nom: string, body?: object) {
  let statut = 200; let donnees: any;
  const res = { status(x: number) { statut = x; return res; }, setHeader() {}, json(x: unknown) { donnees = JSON.parse(JSON.stringify(x)); } };   // comme le réseau : ce qui est undefined ne voyage pas
  await api.handler({ method: methode, url, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: `destiny_carriere=${compte(nom).jeton}` }, body } as never, res as never);
  return { statut, donnees, octets: Buffer.byteLength(JSON.stringify(donnees)), compresses: gzipSync(JSON.stringify(donnees)).length };
}
const entiere = async (nom: string) => (await appeler('GET', `/api/carriere?ligue=${etat.id}`, nom)).donnees as VueCarriereEnLigne;
const commander = (nom: string, commande: object, version?: number) => appeler('POST', '/api/carriere?action=commande', nom,
  { action: 'commande', ligue: etat.id, requeteId: `requete-delta-vue-${++n}`, commande, ...(version ? { v: version, delta: true } : {}) });

// ── 1. Une longue suite de commandes, l'écran ne tient que des deltas ───────
let vue = await entiere('m1');
const mien = (v: VueCarriereEnLigne) => v.clubs.find((c) => c.id === v.monClubId)!;
const horsFeuille = (v: VueCarriereEnLigne): CarteCarriere[] => {
  const feuille = new Set([...(mien(v).composition?.titulaires ?? []), ...(mien(v).composition?.remplacants ?? [])]);
  return v.cartes.filter((c) => c.proprietaire === v.monClubId && !c.verrou && !feuille.has(c.id)).sort((a, b) => a.note - b.note);
};
const poids: { commande: string; delta: number; entiere: number; deltaGz: number; entiereGz: number }[] = [];
async function jouer(commande: { type: string } & Record<string, unknown>, attendu = 200) {
  const r = await commander('m1', commande, vue.version);
  assert.equal(r.statut, attendu, `${commande.type} : ${r.donnees?.erreur}`);
  if (attendu !== 200) return;
  ok(estReponseDelta(r.donnees), `${commande.type} : le serveur répond par un delta`);
  const suivante = appliquerDeltaVue(vue, (r.donnees as { delta: DeltaVue }).delta);
  ok(suivante, `${commande.type} : le delta part de la version tenue`);
  const reference = await appeler('GET', `/api/carriere?ligue=${etat.id}`, 'm1');
  controles++;
  assert.deepEqual(JSON.parse(JSON.stringify(suivante)), reference.donnees, `${commande.type} : la vue reconstituée n'est pas celle du serveur`);
  poids.push({ commande: commande.type, delta: r.octets, entiere: reference.octets, deltaGz: r.compresses, entiereGz: reference.compresses });
  vue = suivante!;
}
await jouer({ type: 'ouvrirPack', packId: 'bronze' });
await jouer({ type: 'ouvrirPack', packId: 'bronze' });
await jouer({ type: 'favori', carteId: horsFeuille(vue)[3].id, valeur: true });
await jouer({ type: 'favori', carteId: horsFeuille(vue)[3].id, valeur: false });
await jouer({ type: 'venteRapide', carteId: horsFeuille(vue)[0].id });
await jouer({ type: 'venteRapideGroupee', carteIds: horsFeuille(vue).slice(0, 2).map((c) => c.id) });
const aVendre = horsFeuille(vue)[0];
await jouer({ type: 'vendre', carteId: aVendre.id, prix: 300, mode: 'directe', dureeHeures: 24 });
await jouer({ type: 'annulerVente', venteId: vue.ventes.at(-1)!.id });
await jouer({ type: 'vendre', carteId: aVendre.id, prix: 320, mode: 'enchere', dureeHeures: 24 });
await jouer({ type: 'strategie', strategie: { ...mien(vue).strategie!, penaliteCourte: mien(vue).strategie!.penaliteCourte === 'touche' ? 'tir' : 'touche' } as never });
// Une commande qui ne change rien : un delta vide, pas la ligue entière.
await jouer({ type: 'strategie', strategie: mien(vue).strategie as never });
const compo = structuredClone(mien(vue).composition!);
[compo.remplacants[0], compo.remplacants[1]] = [compo.remplacants[1], compo.remplacants[0]];
await jouer({ type: 'composition', composition: compo });
await jouer({ type: 'sauvegarderComposition', nom: 'Banc inversé', composition: compo });
await jouer({ type: 'ouvrirPack', packId: 'bronze' });
// Un autre club agit : la version avance sans que l'écran de m1 le sache.
const autre = await entiere('m2');
ok((await commander('m2', { type: 'encherir', venteId: vue.ventes.at(-1)!.id, montant: 320 }, autre.version)).statut === 200, 'un autre club enchérit');
console.log(`1. ${poids.length} commandes : la vue tenue par deltas est celle du serveur à chaque pas`);

// ── 2 à 4. Les cas où il ne faut PAS de delta ───────────────────────────────
{
  // L'écran de m1 n'a pas vu l'enchère de m2 : sa version n'est plus la bonne.
  const r = await commander('m1', { type: 'favori', carteId: horsFeuille(vue)[2].id, valeur: true }, vue.version);
  ok(r.statut === 200 && !estReponseDelta(r.donnees) && Array.isArray(r.donnees.cartes), 'version décalée : le serveur rend la vue entière');
  vue = r.donnees;
  const ancien = await commander('m1', { type: 'favori', carteId: horsFeuille(vue)[2].id, valeur: false });
  ok(!estReponseDelta(ancien.donnees) && Array.isArray(ancien.donnees.cartes), 'écran d\'avant (rien annoncé) : la vue entière');
  vue = ancien.donnees;
  // La même requête renvoyée : déjà traitée, on rend la vue entière.
  const corps = { action: 'commande', ligue: etat.id, requeteId: 'requete-delta-rejouee-1', commande: { type: 'ouvrirPack', packId: 'bronze' }, v: vue.version, delta: true };
  const un = await appeler('POST', '/api/carriere?action=commande', 'm1', corps);
  const deux = await appeler('POST', '/api/carriere?action=commande', 'm1', corps);
  ok(estReponseDelta(un.donnees) && !estReponseDelta(deux.donnees), 'requête rejouée : vue entière, et le pack n\'est ouvert qu\'une fois');
  const tenue = appliquerDeltaVue(vue, un.donnees.delta)!;
  controles++; assert.deepEqual(JSON.parse(JSON.stringify(tenue)), deux.donnees, 'la vue tenue vaut la vue entière rendue à la requête rejouée');
  // Un delta sur la mauvaise base est refusé.
  ok(appliquerDeltaVue({ ...vue, version: vue.version - 1 }, un.donnees.delta) === null, 'delta sur une autre version : refusé');
  ok(appliquerDeltaVue(null, un.donnees.delta) === null, 'delta sans vue : refusé');
  vue = tenue;
  // Une commande refusée ne change rien et ne rend pas de delta.
  const refus = await commander('m1', { type: 'ouvrirPack', packId: 'pack-qui-n-existe-pas' }, vue.version);
  ok(refus.statut === 400 && typeof refus.donnees.erreur === 'string', 'commande refusée : une erreur, pas de delta');
  console.log('2-4. version décalée, écran d\'avant, requête rejouée, mauvaise base, commande refusée');
}

// ── La fonction pure : ordre, retraits, champs retirés ──────────────────────
{
  const a = { id: 'l', version: 4, cartes: [{ id: 'a', n: 1 }, { id: 'b', n: 2 }, { id: 'c', n: 3 }], vide: [], champ: { x: 1 }, parti: 7 } as unknown as VueCarriereEnLigne;
  const b = { id: 'l', version: 5, cartes: [{ id: 'c', n: 3 }, { id: 'a', n: 9 }, { id: 'd', n: 4 }], vide: [{ id: 'z' }], champ: { x: 2 } } as unknown as VueCarriereEnLigne;
  const d = differenceVue(a, b);
  ok(d.listes?.cartes.ordre?.join() === 'c,a,d' && d.listes.cartes.retraits?.join() === 'b' && d.listes.cartes.maj?.length === 2, 'ordre changé, retrait et modifications sont décrits');
  ok(d.retires?.join() === 'parti' && 'champ' in (d.champs ?? {}), 'champ retiré et champ modifié sont décrits');
  controles++; assert.deepEqual(appliquerDeltaVue(a, d), b, 'le delta appliqué rend la vue d\'arrivée');
  const sansChangement = differenceVue(b, { ...b, version: 6 });
  ok(!sansChangement.listes && !sansChangement.champs?.cartes, 'rien n\'a changé : rien n\'est envoyé (hors version)');
}

// ── 5. Ce que ça pèse ───────────────────────────────────────────────────────
const somme = (f: (p: typeof poids[number]) => number, type?: string) => { const l = poids.filter((p) => !type || p.commande === type); return Math.round(l.reduce((s, p) => s + f(p), 0) / l.length); };
const ko = (o: number) => `${(o / 1024).toFixed(1)} Ko`;
console.log(`5. Ouverture d'un pack (ligue de 16 clubs) : ${ko(somme((p) => p.entiere, 'ouvrirPack'))} → ${ko(somme((p) => p.delta, 'ouvrirPack'))} (compressé : ${ko(somme((p) => p.entiereGz, 'ouvrirPack'))} → ${ko(somme((p) => p.deltaGz, 'ouvrirPack'))})`);
console.log(`   Toutes commandes confondues : ${ko(somme((p) => p.entiere))} → ${ko(somme((p) => p.delta))} (compressé : ${ko(somme((p) => p.entiereGz))} → ${ko(somme((p) => p.deltaGz))})`);
for (const type of [...new Set(poids.map((p) => p.commande))]) console.log(`   · ${type.padEnd(22)} ${ko(somme((p) => p.delta, type)).padStart(9)}  (compressé ${ko(somme((p) => p.deltaGz, type))})`);
ok(somme((p) => p.delta, 'ouvrirPack') * 20 < somme((p) => p.entiere, 'ouvrirPack'), 'une ouverture de pack pèse au moins vingt fois moins');
console.log(`\n✅ ${controles} contrôles`);
