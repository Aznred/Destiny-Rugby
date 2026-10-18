import assert from 'node:assert/strict';
import { COMPETITIONS } from '../src/data/clubs';
import { effacerResultatsJoues, enregistrerResultatJoue, poulesDe } from '../src/lib/championnat';
import { coupeEnDirect, engagesEuropeens } from '../src/lib/coupe';
import { formatTournoi, qualificationParPoule, rulesFor, standingsStatuses, zones } from '../src/lib/competitionRules';
import { arriveesClubs, clubsDeDivision, reconstituerArriveesClubs, setArriveesClubs, setMouvementsClubs } from '../src/lib/divisions';
import { construireBracket } from '../src/lib/bracketProgressif';
import { oublierResultats, echangeFrontiere, divisionAuDessus, divisionEnDessous } from '../src/lib/promotion';
import { tournoiDeFinDAnnee } from '../src/lib/tournoi';
import { useGame } from '../src/store/useGame';

const gagner = (m: { cle: string; domicile: string; exterieur: string }, dehors = false) => enregistrerResultatJoue(m.cle,
  { domicile: m.domicile, exterieur: m.exterieur, scoreD: dehors ? 10 : 30, scoreE: dehors ? 30 : 10, essaisD: dehors ? 1 : 4, essaisE: dehors ? 4 : 1 });

for (const [id, directs, barragistes, tour] of [
  ['nationale2', 2, 4, 'quart'], ['fed1', 2, 4, 'huitieme'], ['fed2', 2, 4, 'seizieme'], ['fed3', 3, 2, 'trenteDeuxieme'],
] as const) {
  effacerResultatsJoues(); oublierResultats();
  const z = zones(rulesFor(id), 12, poulesDe(id).length);
  assert.deepEqual([z.qualified, z.playoffs], [directs, barragistes]);
  const lire = () => tournoiDeFinDAnnee(id, 1, COMPETITIONS.find(c => c.id === id)!.nom)!;
  const debut = lire(), nombrePoules = debut.poules.length;
  assert.equal(debut.qualifies.length, nombrePoules * (directs + barragistes));
  assert.equal(debut.qualifiesDirects!.length, nombrePoules * directs);
  assert.equal(debut.matchs.length, nombrePoules * barragistes / 2);
  assert.ok(debut.matchs.every(m => m.tour === 'barrage' && m.scoreD === null));
  const rang = new Map(debut.qualifies.map(q => [q.club, q.rang]));
  for (const m of debut.matchs) {
    assert.ok(rang.get(m.domicile)! < rang.get(m.exterieur)!);
    assert.ok(!debut.qualifiesDirects!.includes(m.domicile));
    gagner(m, true);
  }
  const suite = lire();
  assert.equal(suite.matchs.find(m => m.status !== 'completed')!.tour, tour);
  const survivants = new Set([...debut.qualifiesDirects!, ...debut.matchs.map(m => m.exterieur)]);
  let garde = 0;
  while (!lire().champion && garde++ < 8) for (const m of lire().matchs.filter(m => m.status !== 'completed')) {
    assert.ok(survivants.has(m.domicile) && survivants.has(m.exterieur)); gagner(m);
  }
  assert.ok(lire().champion);
  assert.equal(lire().matchs.length, debut.qualifies.length - 1, 'tous les qualifiés ont un chemin jusqu’au titre');
  console.log(`${id} : ${directs} directs, ${barragistes} barragistes par poule, puis ${tour}. Aucun qualifié supprimé.`);
}

// Un ancien tableau effectivement commencé garde ses clubs et sa clé de résultat.
effacerResultatsJoues(); oublierResultats();
const n2 = tournoiDeFinDAnnee('nationale2', 1, 'Nationale 2')!;
const ancienMatch = { domicile: n2.poules[0].classement[0].club, exterieur: n2.poules[1].classement[0].club,
  cle: `tournoi#nationale2#1#4#${n2.poules[0].classement[0].club}#${n2.poules[1].classement[0].club}` };
gagner(ancienMatch);
const ancienTableau = tournoiDeFinDAnnee('nationale2', 1, 'Nationale 2')!;
assert.equal(ancienTableau.qualifies.length, 4);
assert.ok(ancienTableau.matchs.some(m => m.cle === ancienMatch.cle && m.status === 'completed' && m.scoreD === 30));

for (const taille of [4, 7, 10, 12]) {
  const f = qualificationParPoule(rulesFor('reg1'), taille)!;
  assert.equal(f.directs + f.barragistes, taille >= 12 ? 6 : taille >= 8 ? 4 : 2);
}
for (const n of [3, 7, 28, 56, 88]) {
  effacerResultatsJoues(); const clubs = Array.from({ length: n }, (_, i) => `Club ${i}`);
  let t = construireBracket(clubs, 'test#irrégulier'), garde = 0;
  while (t.some(m => m.status !== 'completed') && garde++ < 8) {
    t.filter(m => m.status !== 'completed').forEach(m => gagner(m)); t = construireBracket(clubs, 'test#irrégulier');
  }
  assert.equal(t.length, n - 1); assert.equal(t.at(-1)!.tour, 'finale'); assert.equal(t.at(-1)!.status, 'completed');
}
assert.ok(formatTournoi(rulesFor('reg1'), [10, 12, 6])!.principal > 0);

effacerResultatsJoues();
const europe = coupeEnDirect('challengeCup', 1, '', 5)!;
const huitiemes = europe.bracket.filter(m => m.tour === 'barrage');
const rangEurope = new Map<string, number>();
huitiemes.forEach((m, i) => { rangEurope.set(m.domicile, i + 1); rangEurope.set(m.exterieur, 16 - i); });
for (const c of europe.reverses) {
  assert.ok(rangEurope.get(c)! >= 9 && rangEurope.get(c)! <= 12);
  assert.ok(huitiemes.some(m => m.exterieur === c));
}
// Les huit visiteurs gagnent : les reversés rencontrent les rangs 13–16 au tour suivant et peuvent recevoir.
huitiemes.forEach(m => gagner({ ...m, cle: `coupe#challengeCup#1#barrage#${m.domicile}#${m.exterieur}` }, true));
const quarts = coupeEnDirect('challengeCup', 1, '', 6)!.bracket.filter(m => m.tour === 'quart');
assert.equal(quarts.length, 4);
assert.ok(quarts.every(m => europe.reverses.includes(m.domicile)), 'un reversé peut recevoir dès les quarts');
assert.ok(quarts.every(m => rangEurope.get(m.domicile)! < rangEurope.get(m.exterieur)!));
assert.deepEqual(coupeEnDirect('challengeCup', 1, '', 6)!.bracket, coupeEnDirect('challengeCup', 1, '', 6)!.bracket);

effacerResultatsJoues();
const ordreInitial = [...rangEurope].sort((a, b) => a[1] - b[1]).map(([c]) => c);
const ancienOrdre = [...ordreInitial.filter(c => !europe.reverses.includes(c)), ...europe.reverses];
gagner({ cle: `coupe#challengeCup#1#barrage#${ancienOrdre[0]}#${ancienOrdre[15]}`, domicile: ancienOrdre[0], exterieur: ancienOrdre[15] });
const anciensHuitiemes = coupeEnDirect('challengeCup', 1, '', 5)!.bracket.filter(m => m.tour === 'barrage');
assert.deepEqual(anciensHuitiemes.map(m => [m.domicile, m.exterieur]), ancienOrdre.slice(0, 8).map((c, i) => [c, ancienOrdre[15 - i]]));
assert.equal(anciensHuitiemes[0].scoreD, 30, 'le vrai score européen ancien est conservé');

for (const id of ['premiership', 'championship']) {
  assert.ok(!standingsStatuses(rulesFor(id), clubsDeDivision(id).length).some(s => ['DIRECT_RELEGATION', 'ACCESS_MATCH', 'PROMOTION'].includes(s)));
}
assert.equal(divisionAuDessus('championship'), null); assert.equal(divisionEnDessous('premiership'), null);
assert.equal(echangeFrontiere('premiership', 'championship', 1).mouvements.length, 0);

const promu = COMPETITIONS.find(c => c.id === 'prod2')!.clubs[0].nom;
const relegue = COMPETITIONS.find(c => c.id === 'top14')!.clubs.at(-1)!.nom;
setMouvementsClubs({ [promu]: 'top14', [relegue]: 'prod2' });
setArriveesClubs({ [promu]: 2, [relegue]: 2 });
const etat = { ...useGame.getState(), mouvementsClubs: { [promu]: 'top14', [relegue]: 'prod2' }, arriveesClubs: arriveesClubs() };
const sauve = useGame.persist.getOptions().partialize!(etat);
const recharge = useGame.persist.getOptions().merge!(JSON.parse(JSON.stringify(sauve)), useGame.getState());
assert.equal(recharge.arriveesClubs[promu], 2, 'date d’arrivée conservée après sérialisation et rechargement');
setArriveesClubs(recharge.arriveesClubs);
const engages = engagesEuropeens(2);
assert.ok(!engages.championsCup.some(c => c.club === promu)); assert.ok(engages.challengeCup.some(c => c.club === promu));
assert.deepEqual(reconstituerArriveesClubs({ mouvementsClubs: { [promu]: 'top14' }, manager: { historique: [{ club: promu, division: 'prod2', saison: 1, montee: true }] } }), { [promu]: 2 });
assert.deepEqual(reconstituerArriveesClubs({ mouvementsClubs: { [promu]: 'top14' }, journal: [{ saison: 2, titre: 'Ton club monte !', texte: `${promu} accède à la Top 14 en tant que champion.` }] }), { [promu]: 2 });
assert.deepEqual(reconstituerArriveesClubs({ mouvementsClubs: { [promu]: 'top14' } }), {}, 'aucune arrivée inventée sans preuve');
setMouvementsClubs({}); setArriveesClubs({}); effacerResultatsJoues(); oublierResultats();
console.log('Régionales, tableaux incomplets, réception après reversement, Angleterre et promotion après rechargement : OK.');
