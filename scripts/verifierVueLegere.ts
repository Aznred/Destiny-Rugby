// LA VUE LÉGÈRE DE LA LIGUE — le détail d'un match terminé ne voyage qu'à son ouverture
//
// La vue d'une ligue portait, pour chacune des vingt dernières rencontres, son fil, ses temps forts et sa feuille :
// 56 Ko par match, 1,2 Mo sur 1,7 pour la division publique 1. L'écran n'en affiche que le score tant qu'on n'ouvre
// pas le match. Avec `leger=1`, le serveur n'envoie que le résumé ; le détail se demande par `&direct=<match>`.
//
// Ce banc passe par le VRAI gestionnaire HTTP et les VRAIES fonctions de fusion de l'écran, et vérifie :
//   · qu'un écran d'avant (sans `leger`) reçoit toujours tout ;
//   · que la vue légère ne diffère de la pleine QUE par le détail des matchs terminés ;
//   · que le détail demandé à part est exactement celui de la vue pleine ;
//   · qu'une fois chargé, il survit aux vues légères suivantes et aux réponses compactes des commandes ;
//   · qu'un match EN COURS n'est jamais résumé.
//
// Lancer : npm run verify:vue-legere
import assert from 'node:assert/strict';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { creerBase, Releve } from './baseQuiCompte';
import { agirCarriere, creerCarriere } from '../src/lib/ligue/carriere';
import { appliquerDeltaVue, estReponseDelta } from '../src/lib/ligue/deltaVue';
import { fusionnerDeltaDirect, fusionnerVueLigue, type DeltaDirect } from '../src/lib/ligue/fusionDirect';
import type { EtatCarriereEnLigne, VueCarriereEnLigne } from '../src/lib/ligue/typesCarriere';

let controles = 0;
const verifier = (condition: unknown, message: string) => { controles++; assert.ok(condition, message); };
const egal = <T>(a: T, b: T, message: string) => { controles++; assert.deepStrictEqual(a, b, message); };

const T0 = Date.parse('2026-10-10T12:00:00.000Z');
let horloge = T0;
Date.now = () => horloge;

const uuid = (prefixe: string, n: number) => `${prefixe}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const base = creerBase(new Releve());
const ligueId = uuid('a', 1);
const membres = Array.from({ length: 4 }, (_, i) => {
  const c = uuid('c', i + 1);
  base.comptes.set(c, { id: c, identifiant: `m${i + 1}`, pseudo: `Manager ${i + 1}`, empreinte: '' });
  base.sessions.set(empreinteJeton(`jeton-${i + 1}`), c);
  return { compte: c, jeton: `jeton-${i + 1}`, n: i + 1 };
});
let depart = creerCarriere({ id: ligueId, nom: 'Ligue du banc', code: 'DR-BANC01', compteId: membres[0].compte,
  pseudo: 'Manager', clubNom: 'Club 1', rythme: 7, maxClubs: 4 }, T0, 'vue-legere');
for (const m of membres.slice(1)) depart = agirCarriere(depart, m.compte, { type: 'rejoindre', pseudo: `Manager ${m.n}`, clubNom: `Club ${m.n}` }, T0, `vue-legere-${m.n}`);
depart = agirCarriere(depart, membres[0].compte, { type: 'demarrerSaison' }, T0, 'vue-legere-saison');
await base.instance().creerLigue({ id: ligueId, code: depart.code, version: 0, comptes: depart.clubs.map((c) => c.compteId), etat: depart });

const api = creerGestionnaireCarriere(base.instance(), async () => {});
async function appeler(methode: 'GET' | 'POST', url: string, jeton: string, body?: object) {
  let statut = 200; let donnees: unknown;
  const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(x: unknown) { donnees = x; } };
  await api.handler({ method: methode, url, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: `destiny_carriere=${jeton}` }, body } as never, res as never);
  const json = JSON.stringify(donnees) ?? 'null';
  return { statut, donnees: JSON.parse(json), octets: Buffer.byteLength(json) };
}
const etatEnBase = (): EtatCarriereEnLigne => JSON.parse(base.ligues.get(ligueId)!.json) as EtatCarriereEnLigne;

// Deux rencontres : la première jouée jusqu'au bout, la seconde en cours au moment des mesures.
const parHeure = [...depart.rencontres].sort((a, b) => Date.parse(a.ferme) - Date.parse(b.ferme));
const [premiere, seconde] = parHeure;
const moi = membres[depart.clubs.findIndex((c) => c.id === premiere.domicile)];
horloge = Date.parse(premiere.ferme) + 1_000;
await api.actualiserLigue(ligueId);
for (; !etatEnBase().rencontres.find((r) => r.id === premiere.id)!.resultat; horloge += 60_000) {
  verifier(horloge < Date.parse(premiere.ferme) + 130 * 60_000, 'le premier match finit');
  await api.actualiserLigue(ligueId);
}
horloge = Math.max(horloge, Date.parse(seconde.ferme) + 4 * 60_000);
await api.actualiserLigue(ligueId);
const enBase = etatEnBase();
verifier(enBase.rencontres.find((r) => r.id === premiere.id)!.match?.termine, 'le premier match est terminé et garde son détail');
verifier(enBase.rencontres.find((r) => r.id === seconde.id)!.match && !enBase.rencontres.find((r) => r.id === seconde.id)!.resultat, 'le second match est en cours');

console.log('Vue légère de la ligue');
// ── 1. L'écran d'avant reçoit tout ────────────────────────────────────────────────────────────────
const pleine = await appeler('GET', `/api/carriere?ligue=${ligueId}`, moi.jeton);
const legere = await appeler('GET', `/api/carriere?ligue=${ligueId}&leger=1`, moi.jeton);
egal([pleine.statut, legere.statut], [200, 200], 'les deux vues répondent');
const vuePleine = pleine.donnees as VueCarriereEnLigne, vueLegere = legere.donnees as VueCarriereEnLigne;
const de = (vue: VueCarriereEnLigne, id: string) => vue.rencontres.find((r) => r.id === id)!;
const finiPlein = de(vuePleine, premiere.id).match!, finiLeger = de(vueLegere, premiere.id).match!;
verifier(!finiPlein.resume && finiPlein.fil.length > 5 && (finiPlein.feuille?.length ?? 0) > 20, 'sans `leger`, le match terminé arrive entier');
verifier(finiLeger.resume === true && finiLeger.fil.length === 0 && !finiLeger.feuille && !finiLeger.moments, 'avec `leger`, il arrive en résumé');
egal([finiLeger.score, finiLeger.essais, finiLeger.penalites, finiLeger.horloge, finiLeger.termine, finiLeger.stats, finiLeger.instance],
  [finiPlein.score, finiPlein.essais, finiPlein.penalites, finiPlein.horloge, finiPlein.termine, finiPlein.stats, finiPlein.instance], 'le résumé porte le même score, le même chrono, les mêmes statistiques d’équipe');

// ── 2. Rien d'autre ne change ─────────────────────────────────────────────────────────────────────
const sansLeFini = (vue: VueCarriereEnLigne) => ({ ...vue, rencontres: vue.rencontres.map((r) => (r.id === premiere.id ? { ...r, match: undefined } : r)) });
egal(sansLeFini(vueLegere), sansLeFini(vuePleine), 'hors du match terminé, la vue légère est la vue pleine');
const enCours = de(vueLegere, seconde.id).match!;
verifier(!enCours.resume && !enCours.termine && enCours.terrain, 'un match en cours n’est jamais résumé');
console.log(`  vue pleine ${Math.round(pleine.octets / 1024)} Ko → légère ${Math.round(legere.octets / 1024)} Ko (un match terminé sur ${vuePleine.rencontres.length} rencontres)`);
verifier(legere.octets < pleine.octets - 20_000, 'la vue légère pèse nettement moins');

// ── 3. Le détail, à l'ouverture du match ──────────────────────────────────────────────────────────
const detail = await appeler('GET', `/api/carriere?ligue=${ligueId}&direct=${encodeURIComponent(premiere.id)}`, moi.jeton);
egal(detail.statut, 200, 'le détail répond');
let ecran = fusionnerDeltaDirect(vueLegere, detail.donnees as DeltaDirect);
const ouvert = de(ecran, premiere.id).match!;
verifier(!ouvert.resume, 'le match ouvert n’est plus un résumé');
egal([ouvert.fil, ouvert.feuille, ouvert.stats, ouvert.score, ouvert.moments], [finiPlein.fil, finiPlein.feuille, finiPlein.stats, finiPlein.score, finiPlein.moments],
  'fil, feuille, statistiques et temps forts sont ceux de la vue pleine');
egal(de(ecran, premiere.id).resultat, de(vuePleine, premiere.id).resultat, 'le résultat de la rencontre est intact');

// ── 4. Le détail chargé survit aux sondages et aux commandes ──────────────────────────────────────
horloge += 20_000;
const sondage = await appeler('GET', `/api/carriere?ligue=${ligueId}&leger=1`, moi.jeton);
ecran = fusionnerVueLigue(ecran, sondage.donnees as VueCarriereEnLigne);
egal(de(ecran, premiere.id).match!.fil, finiPlein.fil, 'un sondage léger ne reprend pas le détail déjà chargé');
verifier(!de(ecran, premiere.id).match!.resume, 'et le match reste ouvert en entier');

const maCarte = ecran.cartes.find((c) => c.proprietaire === ecran.monClubId)!;
const commande = await appeler('POST', '/api/carriere', moi.jeton, { action: 'commande', ligue: ligueId, requeteId: `vue-legere-${horloge}-favori`,
  commande: { type: 'favori', carteId: maCarte.id, valeur: true }, leger: true, v: ecran.version, delta: true });
egal(commande.statut, 200, 'la commande passe');
verifier(estReponseDelta(commande.donnees), 'la commande répond par un delta');
verifier(commande.octets < 4_000, `le delta d’un favori reste minuscule (${commande.octets} octets)`);
const apresDelta = appliquerDeltaVue(ecran, commande.donnees.delta);
verifier(apresDelta, 'le delta s’applique à la vue tenue');
ecran = fusionnerVueLigue(ecran, apresDelta!);
verifier(ecran.cartes.find((c) => c.id === maCarte.id)?.favori === true, 'la commande a bien eu lieu');
egal(de(ecran, premiere.id).match!.fil, finiPlein.fil, 'le détail survit à la réponse compacte d’une commande');
// La vue tenue, détail mis à part, est celle que le serveur rendrait à un écran neuf.
const neuve = (await appeler('GET', `/api/carriere?ligue=${ligueId}&leger=1`, moi.jeton)).donnees as VueCarriereEnLigne;
const sansMatchs = (vue: VueCarriereEnLigne) => ({ ...vue, rencontres: vue.rencontres.map((r) => ({ ...r, match: undefined })) });
egal(sansMatchs(ecran), sansMatchs(neuve), 'vue tenue par deltas = vue légère du serveur');

// Un écran d'avant, lui, reçoit encore la vue entière à sa commande.
const ancienne = await appeler('POST', '/api/carriere', moi.jeton, { action: 'commande', ligue: ligueId, requeteId: `vue-legere-${horloge}-ancien`,
  commande: { type: 'favori', carteId: maCarte.id, valeur: false } });
verifier(!estReponseDelta(ancienne.donnees) && !de(ancienne.donnees as VueCarriereEnLigne, premiere.id).match!.resume, 'un écran d’avant reçoit la vue pleine à sa commande');

console.log(`\n✅ ${controles} contrôles.`);
