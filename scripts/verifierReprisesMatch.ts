// LES POINTS DE REPRISE — une instance froide reprend-elle EXACTEMENT le match qu'elle aurait rejoué ?
//
// Un match de ligue est rejoué depuis sa graine : c'est sa définition. Un point de reprise n'a le droit
// d'exister que s'il rend, au chiffre près, ce que la rejoue aurait rendu. Ce banc joue un vrai direct à
// travers le VRAI gestionnaire HTTP, devant plusieurs instances qui partagent une base, et compare à chaque
// étape trois instances au même instant :
//   · celle qui joue le match depuis le coup d'envoi (chaude) ;
//   · une instance neuve qui REPREND le point déposé ;
//   · une instance neuve SANS points, qui rejoue tout comme avant — la référence.
// Leurs vues de la ligue doivent être identiques, octet pour octet.
//
// Puis ce qui ne doit jamais passer : un point illisible, un point d'un autre coup d'envoi, un point d'un
// autre code — chacun est refusé et le match est rejoué. Et la fin : le match se termine sur des instances
// nées d'un point, et son point quitte la base.
// (`SANS=1` fait jouer tout le scénario sans aucun point : le score final doit être le même.)
//
// Lancer : npm run verify:reprises-match -- [--graine=1]
import assert from 'node:assert/strict';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { creerBase, Releve } from './baseQuiCompte';
import { agirCarriere, creerCarriere } from '../src/lib/ligue/carriere';
import { graine } from '../src/lib/ligue/aleatoire';
import {
  diagnosticCacheMatchEnLigne, espaceMoteursPourBanc, rngReprenable, STRATEGIE_EN_LIGNE_DEFAUT, MENTALITES,
  type EtatMatchEnLigne,
} from '../src/lib/ligue/matchCarriere';
import { deballerReprise, emballerReprise, INTERVALLE_REPRISE } from '../serveur/reprisesMatch';
import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere';
import type { StockageCarriere } from '../serveur/carriereStockage';

const GRAINE = Number(process.argv.find((a) => a.startsWith('--graine='))?.split('=')[1] ?? 1);
let controles = 0;
const verifier = (condition: unknown, message: string) => { controles++; assert.ok(condition, message); };
const egal = <T>(a: T, b: T, message: string) => { controles++; assert.deepStrictEqual(a, b, message); };

// ── 1. Le tirage reprenable est la suite de `graine()`, et se reprend où l'on veut ─────────────────
for (const s of ['match#a', 'match#ligue:42:J3', '']) {
  const reference = graine(s), reprenable = rngReprenable(s);
  const suite = Array.from({ length: 5000 }, () => reference());
  for (let i = 0; i < suite.length; i++) if (reprenable() !== suite[i]) assert.fail(`tirage ${i} de « ${s} » différent`);
  controles++;
  for (const saut of [0, 1, 777, 4999]) {
    const repris = rngReprenable(s, saut);
    verifier(repris() === suite[saut] && repris.tirages === saut + 1, `reprise au tirage ${saut}`);
  }
}

// ── 2. Un direct, plusieurs instances ──────────────────────────────────────────────────────────────
const T0 = Date.parse('2026-10-10T12:00:00.000Z');
let horloge = T0;
Date.now = () => horloge;
let alea = (GRAINE * 2654435761) >>> 0;
const hasard = (): number => { alea = (Math.imul(alea ^ (alea >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; return alea / 4294967296; };

type Gestionnaire = ReturnType<typeof creerGestionnaireCarriere>;
const espaces = new Map<Gestionnaire, string>();
async function appeler(api: Gestionnaire, methode: 'GET' | 'POST', url: string, jeton: string, body?: object) {
  if (!espaces.has(api)) espaces.set(api, `instance-${espaces.size + 1}`);
  espaceMoteursPourBanc(espaces.get(api)!);
  let statut = 200; let donnees: unknown;
  const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(x: unknown) { donnees = x; } };
  await api.handler({ method: methode, url, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: `destiny_carriere=${jeton}` }, body } as never, res as never);
  return { statut, donnees: JSON.parse(JSON.stringify(donnees) ?? 'null') };
}

const uuid = (prefixe: string, n: number) => `${prefixe}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const releve = new Releve();
const base = creerBase(releve);
const ligueId = uuid('a', 1);
const membres = Array.from({ length: 4 }, (_, i) => {
  const c = uuid('c', i + 1);
  base.comptes.set(c, { id: c, identifiant: `m${i + 1}`, pseudo: `Manager ${i + 1}`, empreinte: '' });
  base.sessions.set(empreinteJeton(`jeton-${i + 1}`), c);
  return { compte: c, jeton: `jeton-${i + 1}`, n: i + 1 };
});
let depart = creerCarriere({ id: ligueId, nom: 'Ligue du banc', code: 'DR-BANC01', compteId: membres[0].compte,
  pseudo: 'Manager', clubNom: 'Club 1', rythme: 7, maxClubs: 4 }, T0, `reprises-${GRAINE}`);
for (const m of membres.slice(1)) depart = agirCarriere(depart, m.compte, { type: 'rejoindre', pseudo: `Manager ${m.n}`, clubNom: `Club ${m.n}` }, T0, `reprises-${GRAINE}-${m.n}`);
depart = agirCarriere(depart, membres[0].compte, { type: 'demarrerSaison' }, T0, `reprises-saison-${GRAINE}`);
await base.instance().creerLigue({ id: ligueId, code: depart.code, version: 0, comptes: depart.clubs.map((c) => c.compteId), etat: depart });
const coupEnvoi = Math.min(...depart.rencontres.map((r) => Date.parse(r.ferme)));
const journee = depart.rencontres.filter((r) => Date.parse(r.ferme) === coupEnvoi);
const rencontre = journee[0];
horloge = coupEnvoi + 1_000;

/** Une instance comme avant ce correctif : sa base n'a pas de points de reprise. */
const sansReprises = (): StockageCarriere => {
  const s = base.instance() as StockageCarriere & Record<string, unknown>;
  delete s.lireReprises; delete s.ecrireReprise; delete s.nettoyerReprises;
  return s;
};
const SANS = process.env.SANS === '1';
const instance = (stockage = SANS ? sansReprises() : base.instance()) => creerGestionnaireCarriere(stockage, async () => {});
const chaude = instance();
espaceMoteursPourBanc('lanceur');
await chaude.actualiserLigue(ligueId);

const camps = [rencontre.domicile, rencontre.exterieur].map((clubId) => membres[depart.clubs.findIndex((c) => c.id === clubId)]);
const etatEnBase = (): EtatCarriereEnLigne => JSON.parse(base.ligues.get(ligueId)!.json) as EtatCarriereEnLigne;
const matchsEnCours = (): EtatMatchEnLigne[] => etatEnBase().rencontres.flatMap((r) => (r.match && !r.match.termine ? [r.match] : []));

/** La vue de la ligue rendue par une instance, sans ce qui dépend de l'instance (rien) ni du moment (rien : même heure). */
async function vueDe(api: Gestionnaire, jeton = camps[0].jeton) {
  const r = await appeler(api, 'GET', `/api/carriere?ligue=${ligueId}`, jeton);
  verifier(r.statut === 200, `vue de la ligue : HTTP ${r.statut}`);
  return r.donnees;
}
const resumeMatchs = (vue: any) => (vue.rencontres as any[]).filter((r) => r.match).map((r) => ({
  id: r.id, horloge: r.match.horloge, score: r.match.score, termine: r.match.termine, essais: r.match.essais,
  fil: r.match.fil?.length, terrain: r.match.terrain, stats: r.match.stats,
}));

let commandes = 0;
const post = (api: Gestionnaire, m: { jeton: string; compte: string }, action: object) => appeler(api, 'POST', '/api/carriere', m.jeton, {
  action: 'commande', ligue: ligueId, requeteId: `reprises-${m.compte}-${horloge}-${++commandes}`,
  commande: { type: 'match', matchId: rencontre.id, action },
});

/** Fait vivre le direct jusqu'à `jusqua` : les deux managers sondent une des instances données, la file réveille la ligue. */
const file = instance();
let prochainReveil = (Math.floor(horloge / 60_000) + 1) * 60_000;
let prochaineConsigne = horloge + 70_000;
async function jouer(jusqua: number, instances: Gestionnaire[]) {
  for (; horloge < jusqua; horloge += 3_000) {
    if (horloge >= prochainReveil) {
      prochainReveil += 60_000;
      espaceMoteursPourBanc('file');
      await file.actualiserLigue(ligueId);
    }
    const api = instances[Math.floor(hasard() * instances.length)];
    if (horloge >= prochaineConsigne && horloge < coupEnvoi + 76 * 60_000) {
      prochaineConsigne = horloge + 120_000 + hasard() * 240_000;
      const r = await post(api, camps[hasard() < 0.5 ? 0 : 1], { type: 'strategie',
        strategie: { ...STRATEGIE_EN_LIGNE_DEFAUT, mentalite: MENTALITES[Math.floor(hasard() * MENTALITES.length)], rythme: hasard() < 0.5 ? 'accelerer' : 'normal' } });
      verifier(r.statut === 200, `consigne : HTTP ${r.statut}`);
    }
    for (const m of camps) await appeler(api, 'GET', `/api/carriere?ligue=${ligueId}&direct=${encodeURIComponent(rencontre.id)}`, m.jeton);
  }
}

/** Les matchs en cours qui ont un point déposé (un match de moins de cinq minutes n'en a pas encore). */
const matchsAvecPoint = () => matchsEnCours().filter((m) => [...base.reprises.values()].some((r) => r.ligue === ligueId && r.match === m.id && r.debut === m.debut)).length;
/** Trois instances au même instant : la chaude, une froide qui reprend, une froide qui rejoue. */
async function comparer(etape: string, attendu: { reprises: number }) {
  const avant = diagnosticCacheMatchEnLigne();
  const t0 = performance.now();
  const vueReprise = await vueDe(instance());
  const msReprise = performance.now() - t0;
  const milieu = diagnosticCacheMatchEnLigne();
  const t1 = performance.now();
  const vueRejouee = await vueDe(instance(sansReprises()));
  const msRejoue = performance.now() - t1;
  const apres = diagnosticCacheMatchEnLigne();
  const vueChaude = await vueDe(chaude);
  egal(milieu.reprises - avant.reprises, attendu.reprises, `${etape} : ${attendu.reprises} moteur(s) repris`);
  egal(milieu.rejouesAFroid - avant.rejouesAFroid, matchsEnCours().length - attendu.reprises, `${etape} : aucune rejoue depuis le coup d'envoi pour un match repris`);
  egal(apres.rejouesAFroid - milieu.rejouesAFroid, matchsEnCours().length, `${etape} : l'instance sans points rejoue tout`);
  egal(resumeMatchs(vueReprise), resumeMatchs(vueRejouee), `${etape} : le match repris est le match rejoué`);
  egal(vueReprise, vueRejouee, `${etape} : vue reprise = vue rejouée, en entier`);
  egal(resumeMatchs(vueChaude), resumeMatchs(vueRejouee), `${etape} : l'instance chaude montre le même match`);
  const minute = Math.max(...resumeMatchs(vueRejouee).filter((m) => !m.termine).map((m) => m.horloge), 0);
  console.log(`  ${etape.padEnd(34)} minute ${String(Math.round(minute)).padStart(2)} · reprise ${msReprise.toFixed(0).padStart(5)} ms · rejoue ${msRejoue.toFixed(0).padStart(6)} ms`);
  return { msReprise, msRejoue };
}

console.log('Points de reprise des matchs en cours');
// Avant le premier point, une instance froide rejoue (et c'est court).
await jouer(coupEnvoi + 3 * 60_000, [chaude]);
verifier(base.reprises.size === 0, 'aucun point avant cinq minutes de jeu');
await comparer('avant le premier point', { reprises: 0 });

await jouer(coupEnvoi + 14 * 60_000, [chaude]);
const points = () => [...base.reprises.values()].filter((r) => r.ligue === ligueId);
verifier(points().length >= 1 && matchsAvecPoint() === points().length, `un point par match en cours depuis plus de cinq minutes (${points().length})`);
verifier(points().every((p) => p.sim >= INTERVALLE_REPRISE && p.donnees.length < 80_000), 'points récents et légers');
console.log(`  poids d'un point : ${Math.round(points()[0].donnees.length / 1024)} Ko en base`);
const premier = await comparer('14ᵉ minute', { reprises: matchsAvecPoint() });

// Le direct continue sur DEUX instances, dont une née d'un point de reprise.
const nee = instance();
await vueDe(nee);
await jouer(coupEnvoi + 31 * 60_000, [chaude, nee]);
verifier(etatEnBase().rencontres.find((r) => r.id === rencontre.id)!.match!.journal.length >= 3, 'le journal porte des consignes et des décisions');
await comparer('31ᵉ minute, deux instances', { reprises: matchsAvecPoint() });

// ── 3. Ce qui ne doit pas passer ───────────────────────────────────────────────────────────────────
const sauvegarde = new Map([...base.reprises].map(([k, v]) => [k, { ...v }]));
// Illisible.
for (const p of base.reprises.values()) p.donnees = Buffer.from('ceci n’est pas un moteur').toString('base64');
await comparer('point illisible → rejoue', { reprises: 0 });
// Lisible, mais d'un autre coup d'envoi.
for (const [k, v] of sauvegarde) {
  const point = deballerReprise(v.donnees)!;
  base.reprises.set(k, { ...v, donnees: emballerReprise({ ...point, debut: point.debut + 1 }) });
}
await comparer('autre coup d’envoi → rejoue', { reprises: 0 });
// Un moteur qui a déjà appliqué un ordre que le journal ne connaît pas.
for (const [k, v] of sauvegarde) {
  const point = deballerReprise(v.donnees)!;
  base.reprises.set(k, { ...v, donnees: emballerReprise({ ...point, annexe: { ...point.annexe, appliques: 99 } }) });
}
await comparer('journal qui ne suit pas → rejoue', { reprises: 0 });
// D'un autre code (autre déploiement) : la base ne le rend même pas.
for (const [k, v] of sauvegarde) base.reprises.set(k, { ...v, code: 'autre-deploiement' });
await comparer('autre déploiement → rejoue', { reprises: 0 });
// Remis en place : un point ANCIEN reste bon, le moteur joue la suite, ordres compris.
for (const [k, v] of sauvegarde) base.reprises.set(k, { ...v });
await jouer(coupEnvoi + 38 * 60_000, [nee]);
for (const [k, v] of sauvegarde) base.reprises.set(k, { ...v });
await comparer('point vieux de sept minutes', { reprises: matchsAvecPoint() });

// ── 4. Jusqu'à la sirène ───────────────────────────────────────────────────────────────────────────
await jouer(coupEnvoi + 62 * 60_000, [chaude, nee]);
const tard = await comparer('62ᵉ minute', { reprises: matchsAvecPoint() });
verifier(tard.msReprise < tard.msRejoue / 4, `reprendre coûte au moins quatre fois moins que rejouer (${tard.msReprise.toFixed(0)} contre ${tard.msRejoue.toFixed(0)} ms)`);
verifier(premier.msReprise < premier.msRejoue, 'dès la 14ᵉ minute, reprendre coûte moins que rejouer');

// La sirène, jouée par une instance née d'un point et une autre arrivée encore plus tard. La dernière comparaison
// complète avec une rejoue depuis le coup d'envoi se fait juste avant : après, le journal est archivé avec le match.
await jouer(coupEnvoi + 77 * 60_000, [chaude, nee]);
await comparer('77ᵉ minute', { reprises: matchsAvecPoint() });
const tardive = instance();
let dernierVivant: EtatMatchEnLigne | undefined;
for (const limite = coupEnvoi + 100 * 60_000; horloge < limite;) {
  const r = etatEnBase().rencontres.find((x) => x.id === rencontre.id)!;
  if (r.match && !r.match.termine) dernierVivant = r.match;
  else if (r.resultat) break;
  await jouer(horloge + 6_000, [nee, tardive]);
}
const finale = etatEnBase().rencontres.find((r) => r.id === rencontre.id)!;
verifier(finale.resultat && dernierVivant, 'le match est terminé et son résultat écrit');
verifier(finale.resultat!.pointsD >= dernierVivant!.score.domicile && finale.resultat!.pointsE >= dernierVivant!.score.exterieur, 'le résultat prolonge le dernier état vivant');
console.log(`  sirène : ${finale.resultat!.pointsD}-${finale.resultat!.pointsE}`);
const idMatch = dernierVivant!.id;
verifier(!points().some((p) => p.match === idMatch), 'le point du match terminé a quitté la base');
const ecritures = [...releve.sql].filter(([, c]) => c.table === 'carriere_reprises');
console.log('  base :', ecritures.map(([methode, c]) => `${methode} ×${c.n} (${Math.round(c.envoyes / 1024)} Ko envoyés, ${Math.round(c.recus / 1024)} Ko reçus)`).join(' · '));
console.log(`\n✅ ${controles} contrôles.`);
