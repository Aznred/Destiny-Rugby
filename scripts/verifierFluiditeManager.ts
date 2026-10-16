import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { COMPETITIONS } from '../src/data/clubs';
import { CALENDRIER } from '../src/data/calendrier';
import { poulesDe, estJourneeDe } from '../src/lib/championnat';
import { clubsDeDivision, mouvementsClubs, setMouvementsClubs } from '../src/lib/divisions';
import { appliquerLocalisations, sourcesLocalisationsClubs } from '../src/lib/localisationClub';
import { afficheSure } from '../src/lib/clotureSaison';
import { prochainesAffichesManager } from '../src/lib/tableauManager';
import { effectifDuClub, forceEffectif, setContratsEffectifManager, setEffectifJeunesCarriere, setJoueurIncarne } from '../src/lib/effectif';
import { effectifNational, effectifsNationaux } from '../src/lib/international';
import { useGame } from '../src/store/useGame';

// Le cache conserve exactement les poules existantes et rend des copies indépendantes.
const debut = performance.now();
const division = COMPETITIONS.find(c => c.id === 'reg3')!;
const poules = poulesDe(division.id);
assert.deepEqual(poules.flat().sort(), [...clubsDeDivision(division.id)].sort());
const copie = poulesDe(division.id);
copie[0].reverse();
copie.pop();
assert.deepEqual(poulesDe(division.id), poules, 'Un appelant ne doit pas modifier les poules partagées.');
for (let i = 0; i < 100; i++) assert.deepEqual(poulesDe(division.id), poules);
console.log(`100 relectures des poules : ${(performance.now() - debut).toFixed(0)} ms, premier calcul compris.`);

// Montées/descentes : changer le registre doit invalider la composition mémorisée.
const mouvements = mouvementsClubs();
const promu = poules[0][0];
setMouvementsClubs({ ...mouvements, [promu]: 'reg2' });
assert.ok(!poulesDe('reg3').flat().includes(promu));
assert.ok(poulesDe('reg2').flat().includes(promu));
setMouvementsClubs(mouvements);
assert.deepEqual(poulesDe('reg3'), poules);

// Une correction des coordonnées produit la même poule qu'un calcul à froid.
const [localisations] = sourcesLocalisationsClubs();
appliquerLocalisations({ ...localisations, [promu]: { latitude: 48.85, longitude: 2.35 } });
const corrigees = poulesDe('reg3');
setMouvementsClubs(mouvements);
assert.deepEqual(poulesDe('reg3'), corrigees);
appliquerLocalisations(localisations);
assert.deepEqual(poulesDe('reg3'), poules);

useGame.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
useGame.getState().creerManager({ nom: 'Fluidité', nation: 'France', club: 'Stade Toulousain', age: 40, libre: true });
const manager = useGame.getState().manager!;
const apercu = prochainesAffichesManager(manager);
assert.ok(apercu.length >= 4 && apercu.length <= 5);
assert.ok(apercu.some(r => r.affiche.nature === 'coupe'), 'La prochaine coupe de poule reste annoncée.');
for (const r of apercu) {
  assert.equal(r.affiche.cle, afficheSure({ ...manager, semaine: r.semaine }).affiche?.cle);
  assert.ok(!manager.resultats[r.affiche.cle]);
}
const dernierePoule = CALENDRIER.filter(s => s.type === 'coupe')[3].numero;
assert.deepEqual(prochainesAffichesManager({ ...manager, semaine: dernierePoule + 1 })
  .filter(r => r.semaine > dernierePoule + 1 && r.affiche.nature !== 'championnat'), [],
'Le bureau ne simule pas de futures qualifications.');
const amateur = { ...manager, club: promu, division: 'reg3', semaine: 1 };
assert.ok(prochainesAffichesManager(amateur).every(r => estJourneeDe('reg3', CALENDRIER[r.semaine - 1]) || r.semaine === 1));

// Une tactique ou une composition ne réinstalle ni les identités ni les forces du monde.
let projections = 0;
setEffectifJeunesCarriere(() => {
  projections++;
  return [{ id: 'temoin-fluidite', nom: 'Témoin', poste: 'arriere', note: 99, potentiel: 99, age: 25, nation: 'France', regen: false }];
});
const force = forceEffectif(manager.club, manager.saison);
const avant = projections;
useGame.getState().definirTactiqueManager({ ...manager.tactique, rythme: 'intense' });
assert.equal(forceEffectif(manager.club, manager.saison), force);
assert.equal(projections, avant, 'Changer une consigne ne doit pas vider le cache des forces.');
useGame.getState().definirCompositionManager({ ...manager.composition });
assert.equal(forceEffectif(manager.club, manager.saison), force);
// La composition peut réconcilier les contrats : leur propre cache est alors invalidé.
assert.ok(projections <= avant + 1);
setEffectifJeunesCarriere();

// L'index des contrats garde les comparaisons de noms et les dates d'expiration.
const autreClub = 'Union Bordeaux Bègles';
const externe = effectifDuClub(autreClub, 1)[0];
const contrat = { joueurId: 'id-ancien', nom: externe.nom.toUpperCase(), club: manager.club, debut: 1, fin: 2 };
setContratsEffectifManager(manager.club, { test: contrat });
assert.ok(!effectifDuClub(autreClub, 1).some(j => j.id === externe.id));
setContratsEffectifManager(manager.club, { test: { ...contrat, fin: 1 } });
assert.ok(effectifDuClub(autreClub, 1).some(j => j.id === externe.id));
setContratsEffectifManager(manager.club, manager.avancee!.contratsJoueurs);

// Calcul groupé et calculs isolés : mêmes 34 joueurs, même ordre, mêmes notes.
const nations = ['France', 'Argentine', 'France U20'];
const groupes = effectifsNationaux(nations, 1);
setJoueurIncarne('__temoin_absent_du_catalogue__');
for (const nation of nations) {
  assert.deepEqual(effectifNational(nation, 1), groupes.get(nation));
  assert.equal(groupes.get(nation)!.length, 34);
}
setJoueurIncarne(null);
assert.equal(effectifsNationaux([], 1).size, 0);
console.log('OK — poules, promotions, coordonnées, rendez-vous, caches, contrats et sélections groupées.');
