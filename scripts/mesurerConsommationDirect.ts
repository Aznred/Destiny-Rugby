// CE QUE COÛTE UN MATCH EN LIGNE — requêtes SQL, octets, calcul, mémoire
//
// Le banc joue de vrais directs à travers le VRAI gestionnaire HTTP
// (`serveur/carriereApi.ts`), devant une base tenue en mémoire qui répond comme
// celle de Neon (mêmes méthodes, mêmes lectures conditionnelles) et qui COMPTE :
// une ligne par requête SQL que la vraie base aurait reçue, rangée par nature
// (SELECT, UPDATE, INSERT), avec les octets partis et revenus.
//
// L'heure est simulée : quatre-vingts minutes de match tiennent en quelques
// secondes, et deux lancements donnent exactement les mêmes chiffres.
//
// Les clients sont ceux de l'écran (`CarriereEnLigne.tsx`) :
//   · un sondage du direct toutes les 3 s, qui annonce sa version et le dernier pas de sa chronologie
//     (`--film` : l'écran d'avant le Correctif 24, film v1 sondé toutes les 2 s) ;
//   · un battement de présence toutes les 25 s pour les deux managers ;
//   · une réponse à chaque décision de pénalité, quelques secondes après ;
//   · le réveil durable de la file Vercel, une fois par minute et par ligue,
//     sur une AUTRE instance (celle de `api/matchs.ts`, qui a ses propres caches).
//
// Lancer : npm run mesure:conso-direct -- 10,50,100,300 [--minutes=80]
//          [--spectateurs=2] [--clubs=2] [--instances=1] [--regles=2] [--ancien]
//   --ancien      client d'avant le Correctif 11 (présence par POST, vue entière)
//   --json=fichier  écrit aussi les mesures brutes
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { gzipSync } from 'node:zlib';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { creerBase, poids, Releve, type Compteur } from './baseQuiCompte';
import { agirCarriere, creerCarriere } from '../src/lib/ligue/carriere';
import { diagnosticCacheMatchEnLigne, espaceMoteursPourBanc } from '../src/lib/ligue/matchCarriere';
import { LecteurFilm } from '../src/lib/ligue/filmDirect';
import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere';

const arg = (nom: string, defaut: number) => {
  const brut = process.argv.find((a) => a.startsWith(`--${nom}=`));
  return brut ? Number(brut.split('=')[1]) : defaut;
};
const option = (nom: string) => process.argv.includes(`--${nom}`);
const TAILLES = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '10').split(',').map(Number);
const MINUTES = arg('minutes', 80);
const SPECTATEURS = arg('spectateurs', 2);
const CLUBS = arg('clubs', 2);
const INSTANCES = arg('instances', 1);
const ANCIEN = option('ancien');
/** L'écran d'avant la chronologie : film v1, sondage toutes les deux secondes. */
const FILM_V1 = option('film') || ANCIEN;
const SONDAGE_MS = FILM_V1 ? 2_000 : 3_000;
/** Les règles des matchs mesurés ; 0 = celles du jeu (`REGLES_MATCH_EN_LIGNE`). */
const REGLES = arg('regles', 0);
const SORTIE = process.argv.find((a) => a.startsWith('--json='))?.split('=')[1];

// ── L'heure simulée ────────────────────────────────────────────────────────
const T0 = Date.parse('2026-10-10T12:00:00.000Z');
let horloge = T0;
Date.now = () => horloge;

// ── Les clients ────────────────────────────────────────────────────────────
interface Reponse { statut: number; donnees: any; octets: number; json: string }
type Gestionnaire = ReturnType<typeof creerGestionnaireCarriere>;

/** Chaque instance a son propre cache de moteurs, comme en production. */
const espaces = new Map<Gestionnaire, string>();
async function appeler(api: Gestionnaire, methode: 'GET' | 'POST', url: string, jeton: string, body?: object): Promise<Reponse> {
  if (!espaces.has(api)) espaces.set(api, `instance-${espaces.size + 1}`);
  espaceMoteursPourBanc(espaces.get(api)!);
  let statut = 200; let donnees: unknown;
  const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(x: unknown) { donnees = x; } };
  await api.handler({ method: methode, url, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: `destiny_carriere=${jeton}` }, body } as never, res as never);
  const json = JSON.stringify(donnees) ?? '';
  return { statut, donnees, octets: Buffer.byteLength(json), json };
}

interface Spectateur {
  jeton: string; compte: string; ligue: string; match: string; manager: boolean;
  prochainSondage: number; prochainePresence: number; version: number; film: number | null;
  termine: boolean; decisionA?: number; decisionVue?: number; choix?: string; presenceAcquittee?: number;
  /** Repères des parties lentes déjà reçues (Correctif 11). */
  reperes?: string;
  /** Le lecteur de la chronologie (Correctif 24) : c'est lui qui dit quel pas annoncer. */
  lecteur: LecteurFilm;
}

interface Mesure {
  matchs: number; ligues: number; spectateurs: number; minutesJouees: number;
  sondages: number; presencesPost: number; reveils: number; commandes: number; decisions: number; refus: number;
  score: number; essais: number;
  octetsDirect: number; octetsDirectMax: number; octetsDirectGzip: number; pasFilm: number; reponsesVides: number;
  sql: Record<string, Compteur>; select: number; update: number; insert: number;
  octetsBaseEnvoyes: number; octetsBaseRecus: number;
  cpuMs: number; memoireMo: number; cacheMoteursMo: number; causes: Record<string, number>; raccords: number;
  parties: Record<string, number>; gardes: Record<string, number>;
  dureeBancS: number;
}

const uuid = (prefixe: string, n: number) => `${prefixe}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function mesurer(nombreMatchs: number): Promise<Mesure> {
  horloge = T0;
  const releve = new Releve();
  const base = creerBase(releve);
  const montage = base.instance();

  const parLigue = Math.max(1, Math.floor(CLUBS / 2));
  const nombreLigues = Math.ceil(nombreMatchs / parLigue);
  const spectateurs: Spectateur[] = [];
  const ligues: { id: string; ferme: number }[] = [];
  let compteur = 0;
  for (let i = 0; i < nombreLigues; i++) {
    const id = uuid('a', i + 1);
    const membres = Array.from({ length: CLUBS }, () => {
      const n = ++compteur; const c = uuid('c', n);
      base.comptes.set(c, { id: c, identifiant: `m${n}`, pseudo: `Manager ${n}`, empreinte: '' });
      base.sessions.set(empreinteJeton(`jeton-${n}`), c);
      return { compte: c, jeton: `jeton-${n}`, n };
    });
    let etat = creerCarriere({ id, nom: `Ligue ${i + 1}`, code: `DR-B${String(i).padStart(6, '0')}`, compteId: membres[0].compte,
      pseudo: 'Manager', clubNom: `Club ${membres[0].n}`, rythme: 7, maxClubs: CLUBS }, T0, `banc-${i}`);
    for (const m of membres.slice(1)) etat = agirCarriere(etat, m.compte, { type: 'rejoindre', pseudo: `Manager ${m.n}`, clubNom: `Club ${m.n}` }, T0, `banc-${i}-${m.n}`);
    etat = agirCarriere(etat, membres[0].compte, { type: 'demarrerSaison' }, T0, `banc-saison-${i}`);
    await montage.creerLigue({ id, code: etat.code, version: 0, comptes: etat.clubs.map((c) => c.compteId), etat });
    const premiere = Math.min(...etat.rencontres.map((r) => Date.parse(r.ferme)));
    ligues.push({ id, ferme: premiere });
    const journee = etat.rencontres.filter((r) => Date.parse(r.ferme) === premiere).slice(0, parLigue);
    for (const r of journee) {
      if (spectateurs.filter((s) => s.manager).length / 2 >= nombreMatchs) break;
      const camps = [r.domicile, r.exterieur].map((clubId) => membres[etat.clubs.findIndex((c) => c.id === clubId)]);
      const autres = membres.filter((m) => !camps.includes(m));
      const public_ = [...camps, ...autres].slice(0, Math.max(1, SPECTATEURS));
      public_.forEach((m, k) => spectateurs.push({
        jeton: m.jeton, compte: m.compte, ligue: id, match: r.id, manager: k < 2 && camps.includes(m),
        prochainSondage: 0, prochainePresence: 0, version: 0, film: null, termine: false, lecteur: new LecteurFilm(),
      }));
    }
  }
  // Tout le monde joue à la même heure : on se cale sur le coup d'envoi.
  const coupEnvoi = Math.max(...ligues.map((l) => l.ferme));
  horloge = coupEnvoi + 1_000;
  // Le montage (création des ligues, coup d'envoi) n'est pas le match : on remet le relevé à zéro après.
  const lanceur = creerGestionnaireCarriere(base.instance(), async () => {});
  for (const l of ligues) await lanceur.actualiserLigue(l.id);
  if (REGLES) {
    // Comparer deux moteurs sur les mêmes ligues : on change la règle gelée
    // AVANT que quiconque ait monté le match (la clé change avec elle).
    for (const l of base.ligues.values()) {
      const etat = JSON.parse(l.json) as EtatCarriereEnLigne;
      for (const r of etat.rencontres) if (r.match) { r.match.regles = REGLES; r.match.cle += `#r${REGLES}`; }
      etat.version += 1; l.etatVersion = etat.version;
      l.json = JSON.stringify(etat);
    }
  }
  // Les instances qui servent les sondages, et celle de la file des réveils.
  const instances = Array.from({ length: INSTANCES }, () => creerGestionnaireCarriere(base.instance(), async () => {}));
  const file = creerGestionnaireCarriere(base.instance(), async () => {});
  const api = (k: number) => instances[k % instances.length];
  for (const [k, s] of spectateurs.entries()) {
    const vue = await appeler(api(k), 'GET', `/api/carriere?ligue=${s.ligue}`, s.jeton);
    s.version = vue.donnees?.version ?? 0;
    // Chacun arrive à son moment : les sondages ne tombent pas tous sur la même milliseconde.
    s.prochainSondage = horloge + 137 + ((k * 733) % 2_000);
    s.prochainePresence = horloge + 211 + ((k * 4_177) % 25_000);
  }
  releve.sql.clear(); releve.tempsBase = 0; base.causes.clear();

  const m: Mesure = {
    matchs: nombreMatchs, ligues: nombreLigues, spectateurs: spectateurs.length, minutesJouees: 0,
    sondages: 0, presencesPost: 0, reveils: 0, commandes: 0, decisions: 0, refus: 0, score: 0, essais: 0,
    octetsDirect: 0, octetsDirectMax: 0, octetsDirectGzip: 0, pasFilm: 0, reponsesVides: 0,
    sql: {}, select: 0, update: 0, insert: 0, octetsBaseEnvoyes: 0, octetsBaseRecus: 0,
    cpuMs: 0, memoireMo: 0, cacheMoteursMo: 0, causes: {}, parties: {}, gardes: {}, dureeBancS: 0, raccords: 0,
  };
  const debutBanc = performance.now();
  const debut = horloge;
  const fin = debut + MINUTES * 60_000 + (MINUTES >= 80 ? 15 * 60_000 : 0);
  let prochainReveil = (Math.floor(debut / 60_000) + 1) * 60_000;
  let tour = 0;
  const chrono = async <T>(f: () => Promise<T>): Promise<T> => {
    const t = performance.now(), b = releve.tempsBase;
    const r = await f();
    m.cpuMs += (performance.now() - t) - (releve.tempsBase - b);
    return r;
  };
  let memoireMax = 0;

  for (horloge = debut; horloge < fin; horloge += 100) {
    if (horloge >= prochainReveil) {
      prochainReveil += 60_000;
      espaceMoteursPourBanc('file');
      for (const l of ligues) { await chrono(() => file.actualiserLigue(l.id)); m.reveils++; }
      memoireMax = Math.max(memoireMax, process.memoryUsage().heapUsed);
    }
    let actifs = 0;
    for (const s of spectateurs) {
      if (s.termine) continue;
      actifs++;
      // Le battement de l'écran : toutes les 25 s, sauf si le sondage a déjà valu présence.
      if (s.manager && horloge >= s.prochainePresence && (ANCIEN || horloge - (s.presenceAcquittee ?? -Infinity) >= 30_000)) {
        s.prochainePresence = horloge + 25_000;
        await chrono(() => appeler(api(tour++), 'POST', '/api/carriere', s.jeton, { action: 'presence', ligue: s.ligue, matchId: s.match }));
        m.presencesPost++;
      }
      if (s.decisionA !== undefined && horloge >= s.decisionA) {
        s.decisionA = undefined;
        const r = await chrono(() => appeler(api(tour++), 'POST', '/api/carriere', s.jeton, {
          action: 'commande', ligue: s.ligue, requeteId: `decision-${s.compte}-${horloge}`,
          commande: { type: 'match', matchId: s.match, action: { type: 'decision', choix: s.choix ?? 'touche' } },
        }));
        if (r.statut === 200 && r.donnees?.version) s.version = Math.max(s.version, r.donnees.version);
        else if (r.statut !== 200) m.refus++;
        m.commandes++;
      }
      if (horloge < s.prochainSondage) continue;
      s.prochainSondage = horloge + SONDAGE_MS;
      const url = `/api/carriere?ligue=${s.ligue}&direct=${encodeURIComponent(s.match)}&v=${s.version}`
        + (FILM_V1 ? `&film=${s.film ?? ''}` : `&tl=${s.lecteur.repere}`) + (ANCIEN ? '' : `&r=${s.reperes ?? ''}`);
      const r = await chrono(() => appeler(api(tour++), 'GET', url, s.jeton));
      m.sondages++; m.octetsDirect += r.octets; m.octetsDirectMax = Math.max(m.octetsDirectMax, r.octets);
      // Ce qui voyage vraiment : Vercel compresse les réponses JSON.
      m.octetsDirectGzip += gzipSync(r.json, { level: 6 }).length;
      if (r.statut !== 200) { s.termine = true; continue; }
      if (r.donnees?.inchange) { m.reponsesVides++; continue; }
      s.version = Math.max(s.version, r.donnees.version ?? 0);
      const match = r.donnees.rencontre?.match;
      if (typeof r.donnees.reperes === 'string') s.reperes = r.donnees.reperes;
      if (r.donnees.presence) s.presenceAcquittee = horloge;
      for (const cle of r.donnees.gardes ?? []) m.gardes[cle] = (m.gardes[cle] ?? 0) + 1;
      if (match) for (const [cle, valeur] of Object.entries(match)) m.parties[cle] = (m.parties[cle] ?? 0) + poids(valeur);
      if (match?.chrono) {
        const avant = s.lecteur.dernier ?? 0;
        s.lecteur.recevoirChrono(match.chrono);
        // Le lecteur ne joue pas ici : on le tient à jour d'un coup, comme un écran qui suit.
        s.lecteur.avancer(60);
        m.pasFilm += Math.max(0, (s.lecteur.dernier ?? 0) - avant);
        m.raccords = Math.max(m.raccords, s.lecteur.raccords + s.lecteur.coupes);
      }
      const film = match?.film;
      if (film) {
        if (film.cle && !(s.film !== null && film.cle.n <= s.film && film.cle.n + film.pas.length >= s.film)) s.film = film.cle.n + film.pas.length;
        else if (film.cle) s.film = film.cle.n + film.pas.length;
        else if (s.film !== null && film.de === s.film + 1) s.film += film.pas.length;
        m.pasFilm += film.pas.length;
      }
      if (match?.decision && s.manager && s.decisionA === undefined && s.decisionVue !== match.decision.horloge) {
        // Le manager réfléchit quatre secondes, puis tranche.
        s.decisionVue = match.decision.horloge; s.decisionA = horloge + 4_000;
        s.choix = match.decision.aPortee ? 'points' : 'touche';
        m.decisions++;
      }
      if (!match || match.termine || r.donnees.rencontre?.resultat) {
        s.termine = true;
        if (match && s.manager) { m.score += (match.score.domicile + match.score.exterieur) / 2; m.essais += (match.essais.domicile + match.essais.exterieur) / 2; }
        m.minutesJouees = Math.max(m.minutesJouees, (horloge - debut) / 60_000);
      }
    }
    if (!actifs) break;
  }
  if (!m.minutesJouees) m.minutesJouees = (horloge - debut) / 60_000;
  m.dureeBancS = (performance.now() - debutBanc) / 1000;
  m.memoireMo = Math.max(memoireMax, process.memoryUsage().heapUsed) / 1_048_576;
  m.cacheMoteursMo = diagnosticCacheMatchEnLigne().octetsEstimes / 1_048_576;
  m.sql = Object.fromEntries([...releve.sql.entries()].sort((a, b) => b[1].n - a[1].n));
  m.select = releve.total('SELECT').n; m.update = releve.total('UPDATE').n; m.insert = releve.total('INSERT').n;
  const tout = releve.total(); m.octetsBaseEnvoyes = tout.envoyes; m.octetsBaseRecus = tout.recus;
  m.causes = Object.fromEntries([...base.causes.entries()].sort((a, b) => b[1] - a[1]));
  return m;
}

// ── Le rapport ─────────────────────────────────────────────────────────────
const ko = (o: number) => (o / 1024).toFixed(o < 10_240 ? 1 : 0);
const par = (n: number, d: number) => (d ? n / d : 0);
function rapport(m: Mesure) {
  const p = (n: number) => par(n, m.matchs);
  console.log(`\n══ ${m.matchs} matchs simultanés — ${m.ligues} ligues, ${m.spectateurs} écrans, ${m.minutesJouees.toFixed(0)} min réelles, ${INSTANCES} instance(s)${ANCIEN ? ', client ANCIEN' : ''}`);
  console.log(`  PAR MATCH   SELECT ${p(m.select).toFixed(0)}   UPDATE ${p(m.update).toFixed(0)}   INSERT ${p(m.insert).toFixed(0)}   → ${p(m.select + m.update + m.insert).toFixed(0)} requêtes SQL`
    + `   (${(par(m.select + m.update + m.insert, m.matchs * m.minutesJouees)).toFixed(1)} par minute)`);
  console.log(`              base : ${ko(p(m.octetsBaseEnvoyes))} Ko envoyés, ${ko(p(m.octetsBaseRecus))} Ko reçus`);
  console.log(`              réseau client : ${p(m.sondages).toFixed(0)} sondages, ${ko(p(m.octetsDirect))} Ko (moyenne ${ko(par(m.octetsDirect, m.sondages))} Ko, pic ${ko(m.octetsDirectMax)} Ko ; compressé ${ko(p(m.octetsDirectGzip))} Ko), ${p(m.pasFilm).toFixed(0)} pas de film${FILM_V1 ? ' (film v1)' : `, ${m.raccords} raccord ou reprise`}`);
  console.log(`              présences POST ${p(m.presencesPost).toFixed(0)}, décisions proposées ${p(m.decisions).toFixed(1)}, commandes ${p(m.commandes).toFixed(1)} (${m.refus} refusées), réveils de file ${p(m.reveils).toFixed(0)}`);
  if (m.score) console.log(`              rugby : ${p(m.score).toFixed(1)} points et ${p(m.essais).toFixed(1)} essais par match`);
  console.log(`              calcul serveur ${p(m.cpuMs).toFixed(0)} ms (${par(m.cpuMs, m.sondages + m.presencesPost + m.reveils + m.commandes).toFixed(2)} ms par requête HTTP)`);
  console.log(`  ENSEMBLE    mémoire ${m.memoireMo.toFixed(0)} Mo (moteurs gardés ${m.cacheMoteursMo.toFixed(0)} Mo), banc ${m.dureeBancS.toFixed(0)} s`);
  console.log('  REQUÊTES SQL, par match :');
  for (const [nom, c] of Object.entries(m.sql)) {
    console.log(`    ${c.nature.padEnd(6)} ${nom.padEnd(42)} ${p(c.n).toFixed(1).padStart(8)}   ${ko(p(c.envoyes)).padStart(7)} Ko →   ${ko(p(c.recus)).padStart(7)} Ko ←`);
  }
  const ecritures = Object.entries(m.causes);
  if (ecritures.length) {
    console.log('  CE QUI A FAIT ÉCRIRE L’ÉTAT ENTIER, par match :');
    for (const [motif, n] of ecritures) console.log(`    ${p(n).toFixed(2).padStart(6)}  ${motif}`);
  }
  const parties = Object.entries(m.parties).sort((a, b) => b[1] - a[1]);
  console.log('  CE QUE PÈSE UN SONDAGE (octets moyens par partie) : ' + parties.slice(0, 12).map(([k, o]) => `${k} ${(o / m.sondages).toFixed(0)}`).join(', '));
}

const mesures: Mesure[] = [];
for (const n of TAILLES) {
  const m = await mesurer(n);
  mesures.push(m);
  rapport(m);
}
if (SORTIE) writeFileSync(SORTIE, JSON.stringify({ minutes: MINUTES, spectateurs: SPECTATEURS, clubs: CLUBS, instances: INSTANCES, ancien: ANCIEN, mesures }, null, 1));
process.exit(0);
