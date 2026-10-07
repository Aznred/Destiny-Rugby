// CE QU'UN DIRECT DEMANDE À LA BASE — banc de non-régression du Correctif 11
//
//   1. `memeEtatDurable` répond comme deux `empreinteEcriture`, sur des matchs
//      entiers (sinon une écriture utile serait perdue, ou l'état réécrit pour rien) ;
//   2. une décision en attente n'écrit l'état que deux fois : à l'ouverture, au choix ;
//   3. le sondage vaut présence : les décisions sont proposées sans battement à part ;
//   4. l'écran qui annonce ses repères reconstitue EXACTEMENT la vue complète ;
//   5. un écran d'avant (sans `r=`) reçoit toujours tout ;
//   6. le budget SQL d'un direct tient, et un écran de plus ne coûte presque rien ;
//   7. un catalogue plus récent vu dans une ligue est relu sur-le-champ.
//
// Lancer : npm run verify:ecriture-direct
import assert from 'node:assert/strict';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { CATALOGUE_ADMIN_VIDE } from '../src/lib/ligue/atelierCatalogue';
import { agirCarriere, avancerCarriere, avancerCarrierePourDirect, creerCarriere, empreinteEcriture, memeEtatDurable } from '../src/lib/ligue/carriere';
import { fusionnerDeltaDirect, type DeltaDirect } from '../src/lib/ligue/fusionDirect';
import type { EtatCarriereEnLigne, VueCarriereEnLigne } from '../src/lib/ligue/typesCarriere';
import { creerBase, Releve } from './baseQuiCompte';

const T0 = Date.parse('2026-10-10T12:00:00.000Z');
let horloge = T0;
Date.now = () => horloge;
const uuid = (prefixe: string, n: number) => `${prefixe}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function ligueDeDeux(n: number): { etat: EtatCarriereEnLigne; comptes: string[] } {
  const comptes = [uuid('c', n * 2 + 1), uuid('c', n * 2 + 2)];
  let etat = creerCarriere({ id: uuid('a', n + 1), nom: `Ligue ${n}`, code: `DR-V${String(n).padStart(6, '0')}`, compteId: comptes[0],
    pseudo: 'Un', clubNom: `Club ${n}A`, rythme: 7, maxClubs: 2 }, T0, `verif-${n}`);
  etat = agirCarriere(etat, comptes[1], { type: 'rejoindre', pseudo: 'Deux', clubNom: `Club ${n}B` }, T0, `verif-${n}-b`);
  etat = agirCarriere(etat, comptes[0], { type: 'demarrerSaison' }, T0, `verif-${n}-s`);
  return { etat, comptes };
}

const sansPresence = (e: EtatCarriereEnLigne): EtatCarriereEnLigne => ({ ...e, rencontres: e.rencontres.map((r) => r.match && !r.match.termine
  ? { ...r, match: { ...r.match, presence: {} } } : r) });

// ── 1. La comparaison sans sérialisation dit la même chose que l'empreinte ──
{
  let ecritures = 0, comparaisons = 0;
  for (let n = 0; n < 3; n++) {
    let { etat, comptes } = ligueDeDeux(n);
    const debut = Math.min(...etat.rencontres.map((r) => Date.parse(r.ferme)));
    etat = avancerCarriere(etat, debut + 500, `v-${n}`);
    const match = etat.rencontres.find((r) => r.match)!;
    for (let t = debut + 2_000; t < debut + 95 * 60_000; t += 2_000) {
      // Un manager présent : des décisions s'ouvrent, puis expirent ou sont tranchées.
      const present = { ...etat, rencontres: etat.rencontres.map((r) => r.id === match.id && r.match && !r.match.termine
        ? { ...r, match: { ...r.match, presence: { domicile: t, exterieur: n === 1 ? t : undefined } } } : r) };
      let suivant = avancerCarrierePourDirect(present, match.id, t, `g-${t}`);
      const enCours = suivant.rencontres.find((r) => r.id === match.id)!.match;
      if (enCours?.decision && t % 6_000 === 0 && n !== 2) {
        suivant = agirCarriere(suivant, comptes[enCours.decision.cote === 'domicile' ? 0 : 1],
          { type: 'match', matchId: match.id, action: { type: 'decision', choix: 'touche' } }, t, `d-${t}`);
      }
      // Comme le serveur : la présence vit dans sa table, elle ne compte pas dans l'écriture.
      const memeParEmpreinte = empreinteEcriture(sansPresence(suivant), 0) === empreinteEcriture(sansPresence(etat), 0);
      assert.equal(memeEtatDurable(sansPresence(suivant), sansPresence(etat)), memeParEmpreinte, `Les deux comparaisons divergent (ligue ${n}, t=${t - debut} ms).`);
      comparaisons++;
      if (!memeParEmpreinte) { ecritures++; etat = { ...suivant }; }
      else etat = { ...suivant, version: etat.version };
      if (!etat.rencontres.find((r) => r.id === match.id)!.match || etat.rencontres.find((r) => r.id === match.id)!.resultat) break;
    }
  }
  assert.ok(ecritures > 10 && ecritures < comparaisons * 0.05, `${ecritures} écritures pour ${comparaisons} ticks : seuls le score, les ordres et les décisions doivent écrire.`);
  // Un état recopié à l'identique, une clé absente contre une clé `undefined` : rien à écrire.
  const { etat } = ligueDeDeux(9);
  assert.ok(memeEtatDurable(etat, JSON.parse(JSON.stringify(etat))));
  assert.ok(memeEtatDurable(etat, { ...etat, version: etat.version + 7 }));
  assert.ok(!memeEtatDurable(etat, { ...etat, nom: 'Autre' }));
  console.log(`1. ${comparaisons} comparaisons identiques à l'empreinte, ${ecritures} écritures utiles sur trois matchs entiers.`);
}

// ── 2 à 7. À travers le vrai gestionnaire, devant la base qui compte ──────
const releve = new Releve();
const base = creerBase(releve);
const { etat: creee, comptes } = ligueDeDeux(20);
const id = creee.id;
for (const [k, c] of comptes.entries()) {
  base.comptes.set(c, { id: c, identifiant: `v${k}`, pseudo: `V${k}`, empreinte: '' });
  base.sessions.set(empreinteJeton(`jeton-${k}`), c);
}
await base.instance().creerLigue({ id, code: creee.code, version: 0, comptes: creee.clubs.map((c) => c.compteId), etat: creee });
const api = creerGestionnaireCarriere(base.instance(), async () => {});
async function appeler(methode: 'GET' | 'POST', url: string, jeton: string, body?: object) {
  let statut = 200; let donnees: any;
  const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(x: unknown) { donnees = x; } };
  await api.handler({ method: methode, url, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: `destiny_carriere=${jeton}` }, body } as never, res as never);
  return { statut, donnees };
}
const coupEnvoi = Math.min(...creee.rencontres.map((r) => Date.parse(r.ferme)));
horloge = coupEnvoi + 1_000;
await api.actualiserLigue(id);
let vue = (await appeler('GET', `/api/carriere?ligue=${id}`, 'jeton-0')).donnees as VueCarriereEnLigne;
const matchId = vue.rencontres.find((r) => r.match)!.id;
releve.sql.clear();

let sondages = 0, acquittes = 0, decisions = 0, allegees = 0, suites = 0;
let ecrituresPendantDecision = 0, decisionOuverte = false, ecrituresAvant = 0;
let reperes = '', film: number | null = null, version = vue.version;
const ecritures = () => releve.sql.get('comparerEtEcrire (état entier)')?.n ?? 0;
// Quatorze minutes au moins, et jusqu'à ce que deux décisions aient été proposées puis tranchées.
for (let t = 0; t < 60 * 60_000; t += 2_000) {
  horloge = coupEnvoi + 3_000 + t;
  // L'écran d'aujourd'hui (repères) et un écran d'avant (tout), au même instant.
  const url = `/api/carriere?ligue=${id}&direct=${encodeURIComponent(matchId)}&v=${version}&film=${film ?? ''}`;
  const allege = await appeler('GET', `${url}&r=${encodeURIComponent(reperes)}`, 'jeton-0');
  const complet = await appeler('GET', url, 'jeton-0');
  sondages++;
  assert.equal(allege.statut, 200); assert.equal(complet.statut, 200);
  if (allege.donnees.presence) acquittes++;
  if (allege.donnees.gardes?.length) allegees++;
  if (allege.donnees.filSuite?.length) suites++;
  assert.equal(complet.donnees.gardes, undefined, 'Un écran d’avant ne doit rien se voir retirer.');
  assert.ok(Array.isArray(complet.donnees.rencontre.match.fil), 'Un écran d’avant reçoit toujours le fil entier.');
  // 4. La vue fusionnée est exactement la vue complète.
  vue = fusionnerDeltaDirect(vue, allege.donnees as DeltaDirect);
  const fusionne = { ...vue.rencontres.find((r) => r.id === matchId)!.match } as Record<string, unknown>;
  const tenus = fusionne.reperesDirect as string | undefined;
  delete fusionne.reperesDirect;
  const attendu = complet.donnees.rencontre.match as Record<string, unknown>;
  // Correctif 24 : les statistiques ne repartent que lorsqu'elles ont vraiment bougé. Celles que l'écran
  // garde peuvent donc avoir quelques mètres ou un point de possession de retard — jamais davantage.
  if ((allege.donnees.gardes ?? []).includes('stats') && fusionne.stats && attendu.stats) {
    for (const cote of ['domicile', 'exterieur'] as const) {
      const tenu = (fusionne.stats as Record<string, Record<string, number>>)[cote], vrai = (attendu.stats as Record<string, Record<string, number>>)[cote];
      assert.ok(Math.abs(tenu.possession - vrai.possession) <= 4 && Math.abs(tenu.metres - vrai.metres) <= 30 && Math.abs(tenu.plaquages - vrai.plaquages) <= 3
        && tenu.essais === vrai.essais && tenu.cartons === vrai.cartons, `Statistiques gardées trop anciennes (t=${t}).`);
    }
    fusionne.stats = attendu.stats;
  }
  if (!attendu.termine) {
    assert.deepEqual(JSON.parse(JSON.stringify(fusionne)), JSON.parse(JSON.stringify(attendu)), `La vue fusionnée diffère de la vue complète (t=${t}).`);
    assert.equal(tenus, allege.donnees.reperes, 'Les repères tenus sont ceux de la dernière réponse appliquée.');
  }
  reperes = tenus ?? '';
  version = Math.max(version, allege.donnees.version);
  const f = attendu.film as { cle?: { n: number }; de: number; pas: unknown[] } | undefined;
  if (f) film = f.cle ? f.cle.n + f.pas.length : film !== null && f.de === film + 1 ? film + f.pas.length : film;
  // 2. Une décision n'écrit pas l'état à chaque tick.
  const decision = Boolean(attendu.gele);
  if (decision && !decisionOuverte) { decisions++; ecrituresAvant = ecritures(); }
  if (!decision && decisionOuverte) ecrituresPendantDecision = Math.max(ecrituresPendantDecision, ecritures() - ecrituresAvant);
  decisionOuverte = decision;
  if (attendu.termine || (sondages >= 420 && decisions >= 2 && !decisionOuverte)) break;
}
assert.ok(acquittes > sondages * 0.95, '3. Le sondage d’un manager doit valoir présence.');
assert.ok(decisions >= 1, '3. Un manager présent par son seul sondage doit se voir proposer des décisions.');
assert.ok(ecrituresPendantDecision <= 1, `2. Une décision en attente a réécrit l’état ${ecrituresPendantDecision} fois avant de tomber.`);
assert.ok(allegees > sondages * 0.9, '4. Les parties lentes doivent rester chez l’écran presque à chaque sondage.');
assert.equal(releve.sql.get('presencesActives'), undefined, '6. Le direct ne lit plus les présences à part.');
assert.equal(releve.sql.get('verifierSondage'), undefined, '6. Le direct ne relit plus l’en-tête à chaque écran.');
const total = releve.total();
// Deux écrans sondent ici (l'allégé et le complet) : le budget est PAR LIGUE, pas par écran.
assert.ok(total.n / sondages < 1.1, `6. ${(total.n / sondages).toFixed(2)} requêtes SQL par sondage : le budget est d’une par ligue toutes les trois secondes.`);
assert.ok((releve.sql.get('atelier.lire (révision du catalogue)')?.n ?? 0) <= sondages / 10, '6. Le catalogue ne se relit pas à chaque requête.');
console.log(`2-6. ${sondages} sondages doubles : ${total.n} requêtes SQL (${(total.n / sondages).toFixed(2)} par sondage), ${ecritures()} écritures de l’état, `
  + `${decisions} décisions proposées sans battement, ${allegees} réponses allégées dont ${suites} avec une suite de fil.`);

// 7. Une autre instance a enregistré la ligue avec un catalogue plus récent.
{
  const avant = releve.sql.get('atelier.lire (révision du catalogue)')?.n ?? 0;
  base.reglages.catalogue = { ...CATALOGUE_ADMIN_VIDE, revision: 5 };
  base.ligues.get(id)!.catalogue = 5;
  horloge += 4_000;
  const r = await appeler('GET', `/api/carriere?ligue=${id}&direct=${encodeURIComponent(matchId)}&v=${version}&film=`, 'jeton-0');
  assert.equal(r.statut, 200);
  assert.equal((releve.sql.get('atelier.lire (révision du catalogue)')?.n ?? 0), avant + 1, '7. Un catalogue plus récent doit être relu tout de suite, une fois.');
  console.log('7. Catalogue plus récent vu dans la ligue : relu sur-le-champ, la réponse part.');
}
console.log('OK — écritures du direct, présence par sondage, parties lentes, budget SQL et catalogue.');
process.exit(0);
