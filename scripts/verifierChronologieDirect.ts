// 1 MATCH = 1 SIMULATION = N SPECTATEURS — le banc de la chronologie du direct (Correctif 24)
//
// Ce banc joue un vrai direct à travers le VRAI gestionnaire HTTP, mais devant
// PLUSIEURS instances du serveur (chacune ses caches, son moteur, sa caméra) qui
// partagent une seule base — comme sur Vercel. Chaque écran sonde une instance
// tirée au hasard à chaque fois, reçoit ses réponses avec une latence variable,
// et rejoue la chronologie dans un vrai `LecteurFilm`. Les deux managers
// tranchent leurs pénalités, changent de consignes et font un remplacement, sur
// n'importe quelle instance.
//
// À la fin, le match est rejoué UNE fois, à part, depuis la graine et le journal
// écrits en base : c'est la référence. On vérifie, pas par pas :
//   · que chaque écran a montré exactement ce pas-là (phase, score, porteur,
//     positions à la tolérance des pistes) — donc que tous ont vu le même match ;
//   · qu'aucun n'a reculé, sauté ou dû se raccorder ;
//   · qu'aucune instance n'a dû remonter son moteur (ordre arrivé derrière elle) ;
//   · que les événements portent les mêmes numéros partout ;
//   · et ce que tout cela pèse sur le réseau.
//
// Lancer : npm run verify:chronologie -- [--minutes=12] [--instances=3] [--ecrans=4] [--graine=1]
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { creerBase, Releve } from './baseQuiCompte';
import { agirCarriere, creerCarriere } from '../src/lib/ligue/carriere';
import {
  diagnosticCacheMatchEnLigne, espaceMoteursPourBanc, MARGE_AUTORITE, rejouerPourBanc, STRATEGIE_EN_LIGNE_DEFAUT, MENTALITES,
  type EtatMatchEnLigne, type VueMatchEnLigne,
} from '../src/lib/ligue/matchCarriere';
import { graineEvenement, LecteurFilm, ligneEvenement, PAS_FILM, type EvenementChrono } from '../src/lib/ligue/filmDirect';
import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere';
import type { EtatMatch } from '../src/lib/moteur/etat';

const arg = (nom: string, defaut: number) => {
  const brut = process.argv.find((a) => a.startsWith(`--${nom}=`));
  return brut ? Number(brut.split('=')[1]) : defaut;
};
const MINUTES = arg('minutes', 12);
const INSTANCES = arg('instances', 3);
const ECRANS = arg('ecrans', 4);
const GRAINE = arg('graine', 1);
const SONDAGE_MS = 3_000;
const EXEMPLE = arg('exemple', 0);
const SORTIE = process.argv.find((a) => a.startsWith('--sortie='))?.split('=')[1];
let exemplesVus = 0;

const T0 = Date.parse('2026-10-10T12:00:00.000Z');
let horloge = T0;
Date.now = () => horloge;
let alea = (GRAINE * 2654435761) >>> 0;
const hasard = (): number => { alea = (Math.imul(alea ^ (alea >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; return alea / 4294967296; };

type Gestionnaire = ReturnType<typeof creerGestionnaireCarriere>;
interface Reponse { statut: number; donnees: any; octets: number; compresse: number }
/** Chaque instance a SON cache de moteurs, comme en production : on bascule dessus avant de l'appeler. */
const espaces = new Map<Gestionnaire, string>();
async function appeler(api: Gestionnaire, methode: 'GET' | 'POST', url: string, jeton: string, body?: object): Promise<Reponse> {
  if (!espaces.has(api)) espaces.set(api, `instance-${espaces.size + 1}`);
  espaceMoteursPourBanc(espaces.get(api)!);
  let statut = 200; let donnees: unknown;
  const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(x: unknown) { donnees = x; } };
  await api.handler({ method: methode, url, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: `destiny_carriere=${jeton}` }, body } as never, res as never);
  const json = JSON.stringify(donnees) ?? '';
  return { statut, donnees: JSON.parse(json || 'null'), octets: Buffer.byteLength(json), compresse: gzipSync(json, { level: 6 }).length };
}

/** Ce qu'un pas montre : assez pour dire que deux écrans voient la même chose. */
interface Empreinte { phase: string; possession: string; score: string; porteur: string; ballon: [number, number]; pos: Map<string, [number, number]> }
const cm = (n: number) => Math.round(n * 100);
function empreinte(e: { phase: string; possession: string; scoreA: number; scoreB: number; porteur: { id: string } | null; ballon: { x: number; y: number }; pions: { id: string; surLeTerrain: boolean; pos: { x: number; y: number } }[] }): Empreinte {
  return {
    phase: e.phase, possession: e.possession, score: `${e.scoreA}-${e.scoreB}`, porteur: e.porteur?.id ?? '-',
    ballon: [cm(e.ballon.x), cm(e.ballon.y)],
    pos: new Map(e.pions.filter((p) => p.surLeTerrain).map((p) => [p.id, [cm(p.pos.x), cm(p.pos.y)] as [number, number]])),
  };
}

interface Ecran {
  nom: string; jeton: string; compte: string; manager: boolean;
  lecteur: LecteurFilm; version: number; reperes: string;
  prochainSondage: number; enVol?: { arrive: number; reponse: Reponse };
  montre: Map<number, Empreinte>; ordre: number[];
  decisionVue?: number; decisionA?: number; choix?: string;
  sondages: number; octets: number; compresse: number; reculs: number; sauts: number; retardCumule: number; mesures: number;
  surLeTerrain: { carteId: string; numero: number }[]; surLeBanc: { carteId: string; numero: number }[]; monCote?: string;
}

const uuid = (prefixe: string, n: number) => `${prefixe}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const releve = new Releve();
const base = creerBase(releve);
const montage = base.instance();
const ligueId = uuid('a', 1);
const membres = Array.from({ length: 4 }, (_, i) => {
  const c = uuid('c', i + 1);
  base.comptes.set(c, { id: c, identifiant: `m${i + 1}`, pseudo: `Manager ${i + 1}`, empreinte: '' });
  base.sessions.set(empreinteJeton(`jeton-${i + 1}`), c);
  return { compte: c, jeton: `jeton-${i + 1}`, n: i + 1 };
});
let depart = creerCarriere({ id: ligueId, nom: 'Ligue du banc', code: 'DR-BANC01', compteId: membres[0].compte,
  pseudo: 'Manager', clubNom: 'Club 1', rythme: 7, maxClubs: 4 }, T0, `banc-${GRAINE}`);
for (const m of membres.slice(1)) depart = agirCarriere(depart, m.compte, { type: 'rejoindre', pseudo: `Manager ${m.n}`, clubNom: `Club ${m.n}` }, T0, `banc-${GRAINE}-${m.n}`);
depart = agirCarriere(depart, membres[0].compte, { type: 'demarrerSaison' }, T0, `banc-saison-${GRAINE}`);
await montage.creerLigue({ id: ligueId, code: depart.code, version: 0, comptes: depart.clubs.map((c) => c.compteId), etat: depart });
const coupEnvoi = Math.min(...depart.rencontres.map((r) => Date.parse(r.ferme)));
const rencontre = depart.rencontres.find((r) => Date.parse(r.ferme) === coupEnvoi)!;
horloge = coupEnvoi + 1_000;
const lanceur = creerGestionnaireCarriere(base.instance(), async () => {});
espaceMoteursPourBanc('lanceur');
await lanceur.actualiserLigue(ligueId);

const instances = Array.from({ length: INSTANCES }, () => creerGestionnaireCarriere(base.instance(), async () => {}));
const file = creerGestionnaireCarriere(base.instance(), async () => {});
const auHasard = () => instances[Math.floor(hasard() * instances.length)];

const camps = [rencontre.domicile, rencontre.exterieur].map((clubId) => membres[depart.clubs.findIndex((c) => c.id === clubId)]);
const autres = membres.filter((m) => !camps.includes(m));
const ecrans: Ecran[] = [...camps, ...autres].slice(0, Math.max(2, ECRANS)).map((m, k) => ({
  nom: k < 2 ? `manager ${k + 1}` : `spectateur ${k - 1}`, jeton: m.jeton, compte: m.compte, manager: k < 2,
  lecteur: new LecteurFilm(), version: 0, reperes: '', prochainSondage: horloge + 200 + k * 733,
  montre: new Map(), ordre: [], sondages: 0, octets: 0, compresse: 0, reculs: 0, sauts: 0, retardCumule: 0, mesures: 0,
  surLeTerrain: [], surLeBanc: [],
}));
for (const s of ecrans) {
  const vue = await appeler(auHasard(), 'GET', `/api/carriere?ligue=${ligueId}`, s.jeton);
  s.version = vue.donnees?.version ?? 0;
}

const debut = horloge;
const fin = debut + MINUTES * 60_000;
let prochainReveil = (Math.floor(debut / 60_000) + 1) * 60_000;
let prochaineConsigne = debut + 45_000 + hasard() * 60_000;
let remplacementA = debut + Math.min(MINUTES * 0.6, 8) * 60_000;
let commandes = 0, decisionsVues = 0, decisionsLaissees = 0;
const post = async (s: Ecran, action: object) => {
  commandes++;
  const r = await appeler(auHasard(), 'POST', '/api/carriere', s.jeton, {
    action: 'commande', ligue: ligueId, requeteId: `banc-${s.compte}-${horloge}-${commandes}`,
    commande: { type: 'match', matchId: rencontre.id, action },
  });
  if (r.statut === 200 && r.donnees?.version) s.version = Math.max(s.version, r.donnees.version);
  return r;
};

/** Ce que pèse chaque partie de la chronologie, en octets de JSON. */
const poids: Record<string, number> = {};
const taille = (x: unknown) => (x === undefined ? 0 : Buffer.byteLength(JSON.stringify(x)));
function peser(match: VueMatchEnLigne): void {
  const c = match.chrono;
  const plus = (cle: string, n: number) => { poids[cle] = (poids[cle] ?? 0) + n; };
  plus('réponse entière', taille(match));
  if (!c) return;
  plus('image complète', taille(c.cle));
  plus('événements', taille(c.ev));
  for (const s of c.s) {
    plus('pistes (déplacements)', taille(s.p)); plus('états', taille(s.d)); plus('gestes', taille(s.g));
    plus('pas entiers', taille(s.q) + taille(s.sur));
    for (let i = 1; s.d && i < s.d.length; i += 2) {
      const patch = s.d[i] as Record<string, unknown>;
      for (const cle in patch) plus(`  état.${cle}`, taille(patch[cle]));
    }
  }
}
function recevoir(s: Ecran, r: Reponse): void {
  if (r.statut !== 200 || !r.donnees || r.donnees.inchange) return;
  s.version = Math.max(s.version, r.donnees.version ?? 0);
  if (typeof r.donnees.reperes === 'string') s.reperes = r.donnees.reperes;
  const match = r.donnees.rencontre?.match as VueMatchEnLigne | undefined;
  if (!match) return;
  peser(match);
  // `--exemple=<n> --sortie=<fichier>` : écrit la n-ième réponse sans image complète, pour la lire à l'œil.
  if (EXEMPLE && match.chrono && !match.chrono.cle && ++exemplesVus === EXEMPLE && SORTIE) writeFileSync(SORTIE, JSON.stringify(r.donnees));
  s.lecteur.recevoirChrono(match.chrono);
  if (match.monCote) s.monCote = match.monCote;
  if (match.surLeTerrain?.length) s.surLeTerrain = match.surLeTerrain;
  if (match.surLeBanc?.length) s.surLeBanc = match.surLeBanc;
  if (match.decision && s.manager && match.decision.cote === s.monCote && s.decisionVue !== match.decision.horloge) {
    s.decisionVue = match.decision.horloge;
    decisionsVues++;
    // Une fois sur quatre, le manager laisse courir : l'adjoint tranchera.
    if (hasard() < 0.25) decisionsLaissees++;
    else { s.decisionA = horloge + 2_000 + hasard() * 6_000; s.choix = match.decision.aPortee ? 'points' : hasard() < 0.5 ? 'touche' : 'rapide'; }
  }
}

for (horloge = debut; horloge < fin; horloge += 50) {
  if (horloge >= prochainReveil) {
    prochainReveil += 60_000;
    espaceMoteursPourBanc('file');
    await file.actualiserLigue(ligueId);
  }
  // Les managers : consignes, remplacement.
  if (horloge >= prochaineConsigne) {
    prochaineConsigne = horloge + 60_000 + hasard() * 150_000;
    const s = ecrans[hasard() < 0.5 ? 0 : 1];
    await post(s, { type: 'strategie', strategie: { ...STRATEGIE_EN_LIGNE_DEFAUT, mentalite: MENTALITES[Math.floor(hasard() * MENTALITES.length)], rythme: hasard() < 0.5 ? 'accelerer' : 'normal' } });
  }
  if (horloge >= remplacementA) {
    remplacementA = Infinity;
    const s = ecrans[0];
    const sortant = s.surLeTerrain.find((p) => p.numero === 11), entrant = s.surLeBanc.find((p) => p.numero >= 21) ?? s.surLeBanc[s.surLeBanc.length - 1];
    if (sortant && entrant) await post(s, { type: 'remplacement', sortantId: sortant.carteId, entrantId: entrant.carteId });
  }
  for (const s of ecrans) {
    if (s.decisionA !== undefined && horloge >= s.decisionA) {
      s.decisionA = undefined;
      await post(s, { type: 'decision', choix: s.choix ?? 'touche' });
    }
    if (s.enVol && horloge >= s.enVol.arrive) { const r = s.enVol.reponse; s.enVol = undefined; recevoir(s, r); }
    if (!s.enVol && horloge >= s.prochainSondage) {
      s.prochainSondage = horloge + SONDAGE_MS;
      const url = `/api/carriere?ligue=${ligueId}&direct=${encodeURIComponent(rencontre.id)}&v=${s.version}&tl=${s.lecteur.repere}&r=${encodeURIComponent(s.reperes)}`;
      const reponse = await appeler(auHasard(), 'GET', url, s.jeton);
      s.sondages++; s.octets += reponse.octets; s.compresse += reponse.compresse;
      // Le réseau : de 40 ms à 900 ms, avec de temps en temps une réponse franchement lente.
      const latence = hasard() < 0.06 ? 1_200 + hasard() * 1_600 : 40 + hasard() * 860;
      s.enVol = { arrive: horloge + latence, reponse };
    }
    // L'écran : il rejoue, vingt fois par seconde ici.
    const avant = s.lecteur.etat.sim;
    if (s.lecteur.avancer(0.05)) {
      const e = s.lecteur.etat;
      const n = Math.round(e.sim / PAS_FILM);
      if (e.sim + 1e-9 < avant) s.reculs++;
      const dernier = s.ordre[s.ordre.length - 1];
      if (dernier !== undefined && n !== dernier + 1) s.sauts++;
      s.ordre.push(n);
      s.montre.set(n, empreinte(e as never));
      s.retardCumule += (horloge - debut + (debut - coupEnvoi)) / 1000 - e.sim; s.mesures++;
    }
  }
}

// ── La référence : le match rejoué une fois, à part, depuis la base ─────────
const etatFinal = JSON.parse(base.ligues.get(ligueId)!.json) as EtatCarriereEnLigne;
const matchFinal = etatFinal.rencontres.find((r) => r.id === rencontre.id)!.match as EtatMatchEnLigne;
assert.ok(matchFinal?.equipes, 'le match est encore en cours à la fin du banc (sinon ses feuilles sont archivées)');
const dernierPas = Math.max(...ecrans.map((s) => s.ordre[s.ordre.length - 1] ?? 0));
const verite = new Map<number, Empreinte>();
rejouerPourBanc(matchFinal, { sim: dernierPas * PAS_FILM + 1 }, (e: EtatMatch) => { verite.set(Math.round(e.sim / PAS_FILM), empreinte(e)); });

let echecs = 0;
const dire = (ok: boolean, texte: string) => { console.log(`  ${ok ? '✓' : '✗'} ${texte}`); if (!ok) echecs++; };
console.log(`\n══ Chronologie du direct — ${MINUTES} min, ${INSTANCES} instances, ${ecrans.length} écrans, graine ${GRAINE}`);
console.log(`   journal : ${matchFinal.journal.length} ordres (${matchFinal.journal.map((ev) => ev.commande.type).join(', ') || 'aucun'})`);
console.log(`   décisions proposées ${decisionsVues} (dont ${decisionsLaissees} laissées à l'adjoint), commandes envoyées ${commandes}`);

let ecartMax = 0, ecartLoin = 0, ecartBallon = 0;
for (const s of ecrans) {
  let differents = 0, compares = 0; let premier = '';
  for (const [n, vu] of s.montre) {
    const vrai = verite.get(n);
    if (!vrai) continue;
    compares++;
    let ok = vu.phase === vrai.phase && vu.possession === vrai.possession && vu.score === vrai.score && vu.porteur === vrai.porteur && vu.pos.size === vrai.pos.size;
    ecartBallon = Math.max(ecartBallon, Math.abs(vu.ballon[0] - vrai.ballon[0]), Math.abs(vu.ballon[1] - vrai.ballon[1]));
    if (ok) for (const [id, [x, y]] of vrai.pos) {
      const p = vu.pos.get(id);
      if (!p) { ok = false; break; }
      const d = Math.max(Math.abs(p[0] - x), Math.abs(p[1] - y));
      // La tolérance des pistes : 5 cm à moins de sept mètres du ballon, 20 cm au-delà (plus l'arrondi).
      const pres = Math.hypot(x - vrai.ballon[0], y - vrai.ballon[1]) < 700;
      if (pres) ecartMax = Math.max(ecartMax, d); else ecartLoin = Math.max(ecartLoin, d);
      if (d > (pres ? 6 : 21)) { ok = false; break; }
    }
    if (!ok) { differents++; premier ||= `pas ${n} : écran ${vu.phase}/${vu.score}/${vu.porteur}, référence ${vrai.phase}/${vrai.score}/${vrai.porteur}`; }
  }
  dire(compares > MINUTES * 300 && differents === 0, `${s.nom} : ${compares} pas montrés, ${differents} différents de la référence${premier ? ` (${premier})` : ''}`);
  dire(s.reculs === 0 && s.sauts === 0, `${s.nom} : ${s.reculs} recul, ${s.sauts} saut de pas`);
  dire(s.lecteur.coupes === 0 && s.lecteur.raccords === 0, `${s.nom} : ${s.lecteur.coupes} reprise à zéro, ${s.lecteur.raccords} raccord`);
}
dire(ecartMax <= 6 && ecartLoin <= 21 && ecartBallon <= 4, `écart de position le plus grand : ${ecartMax} cm pour un joueur près du ballon, ${ecartLoin} cm loin de l'action, ${ecartBallon} cm pour le ballon`);

// Les événements : mêmes numéros, mêmes pas, sur tous les écrans.
const parId = new Map<number, string>();
let evDifferents = 0, evTotal = 0;
for (const s of ecrans) for (const ev of s.lecteur.evenements) {
  const cle = `${ev.pas}|${ev.type}|${ev.resultat ?? ''}|${ev.joueurs.join(',')}`;
  const connu = parId.get(ev.id);
  evTotal++;
  if (connu === undefined) parId.set(ev.id, cle); else if (connu !== cle) evDifferents++;
}
dire(evTotal > 0 && evDifferents === 0, `événements : ${parId.size} distincts dans les tampons, ${evDifferents} en désaccord entre écrans`);

const diag = diagnosticCacheMatchEnLigne();
dire(diag.retards === 0, `ordres arrivés derrière un moteur : ${diag.retards}`);
console.log(`   rejoues depuis le coup d'envoi : ${diag.rejouesAFroid} (pour ${INSTANCES + 2} instances)`);

const sondages = ecrans.reduce((n, s) => n + s.sondages, 0), octets = ecrans.reduce((n, s) => n + s.octets, 0), compresse = ecrans.reduce((n, s) => n + s.compresse, 0);
const retard = ecrans.reduce((n, s) => n + s.retardCumule, 0) / Math.max(1, ecrans.reduce((n, s) => n + s.mesures, 0));
console.log(`   réseau : ${sondages} sondages, ${(octets / sondages / 1024).toFixed(2)} Ko par réponse (${(compresse / sondages / 1024).toFixed(2)} Ko compressés)`
  + ` → ${(compresse / ecrans.length / MINUTES / 1024).toFixed(1)} Ko compressés par écran et par minute`);
console.log(`   retard de l'image sur l'heure du serveur : ${retard.toFixed(1)} s (dont ${MARGE_AUTORITE} s de marge d'autorité)`);
console.log('   ce que pèse la chronologie (octets par sondage) : ' + Object.entries(poids).sort((a, b) => b[1] - a[1]).slice(0, 16)
  .map(([cle, o]) => `${cle.trim()} ${(o / sondages).toFixed(0)}`).join(', '));
const nomme = (id: string) => id.slice(-6);
const exemple: EvenementChrono[] = ecrans[0].lecteur.evenements.slice(-6);
console.log('   derniers événements (numéro | chrono | type | joueurs | résultat | graine) :');
for (const ev of exemple) console.log(`     ${ligneEvenement(ev, ev.pas * PAS_FILM, nomme)}`);
void graineEvenement;
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est conforme.');
process.exit(echecs ? 1 : 0);
