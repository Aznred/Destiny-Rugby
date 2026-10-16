import assert from 'node:assert';
import {
  creerCarriere,
  recuperationFatigueSelonRythme,
  recuperationFatigueParJour,
  recupererFatiguePassivement,
} from '../src/lib/ligue/carriere.js';
import type { CreationCarriere } from '../src/lib/ligue/typesCarriere.js';

console.log('=== 1. Test des calculs de récupération selon les rythmes ===');
// Rythme 1 (hebdomadaire : 1 match / 7 jours)
const r1 = recuperationFatigueSelonRythme(1);
const j1 = recuperationFatigueParJour(1);
console.log(`Rythme 1: total = ${r1}, par jour = ${j1} pts/j (7 j = ${j1 * 7} pts)`);
assert.strictEqual(r1, 22);
assert.ok(j1 >= 4, 'Le gain par jour au rythme 1 doit être suffisant pour effacer 32 pts en une semaine');
assert.ok(j1 * 7 >= 32, '7 jours de repos doivent effacer un match plein de 32 points');

// Rythme 7 (quotidien : 1 match / jour)
const r7 = recuperationFatigueSelonRythme(7);
const j7 = recuperationFatigueParJour(7);
console.log(`Rythme 7: total = ${r7}, par jour = ${j7} pts/j`);
assert.strictEqual(r7, 40);
assert.strictEqual(j7, 40);

console.log('=== 2. Test de la récupération passive quotidienne sur un état de ligue ===');
const JOUR = 86_400_000;
const T0 = Date.parse('2026-10-01T12:00:00.000Z');

const config: CreationCarriere = {
  id: 'test-ligue-recup',
  nom: 'Ligue Recup',
  code: 'RECUP1',
  compteId: '00000000-0000-0000-0000-000000000001',
  pseudo: 'Manager1',
  clubNom: 'RC Test',
  rythme: 1,
  maxClubs: 2,
};

let ligue = creerCarriere(config, T0, 'graine-test');
ligue.phase = 'saison'; // En saison active
ligue.dernierJourRecuperation = '2026-10-01';

// Ajout d'une carte avec 32 de fatigue
ligue.cartes.push({
  id: 'carte-fatiguee-1',
  sourceId: 's1',
  nom: 'Antoine Dupont',
  poste: 'demi_melee',
  note: 92,
  potentiel: 94,
  rarete: 'or',
  age: 28,
  nation: 'France',
  clubReel: 'Stade Toulousain',
  championnat: 'Top 14',
  pays: 'France',
  fatigue: 32,
  matchs: 1,
  essais: 0,
  clubs: [],
  proprietaire: ligue.clubs[0].id,
});

// Même jour (aucun temps calendaire écoulé) -> pas de changement
recupererFatiguePassivement(ligue, T0 + 3600_000);
assert.strictEqual(ligue.cartes.find(c => c.id === 'carte-fatiguee-1')!.fatigue, 32);

// Jour suivant (2026-10-02) -> 1 jour écoulé
recupererFatiguePassivement(ligue, T0 + JOUR + 1000);
const fatigueJ1 = ligue.cartes.find(c => c.id === 'carte-fatiguee-1')!.fatigue;
console.log(`Fatigue après 1 jour de repos : ${fatigueJ1} (initial: 32, gain: -${j1})`);
assert.strictEqual(fatigueJ1, 32 - j1);
assert.strictEqual(ligue.dernierJourRecuperation, '2026-10-02');

// 3 jours plus tard (2026-10-05) -> 3 jours écoulés d'un coup
recupererFatiguePassivement(ligue, T0 + 4 * JOUR + 1000);
const fatigueJ4 = ligue.cartes.find(c => c.id === 'carte-fatiguee-1')!.fatigue;
console.log(`Fatigue après 4 jours au total : ${fatigueJ4}`);
assert.strictEqual(fatigueJ4, Math.max(0, 32 - 4 * j1));
assert.strictEqual(ligue.dernierJourRecuperation, '2026-10-05');

// Après 7 jours -> fatigue doit être tombée à 0
recupererFatiguePassivement(ligue, T0 + 7 * JOUR + 1000);
const fatigueJ7 = ligue.cartes.find(c => c.id === 'carte-fatiguee-1')!.fatigue;
console.log(`Fatigue après 7 jours au total : ${fatigueJ7}`);
assert.strictEqual(fatigueJ7, 0, 'Après 7 jours de repos sans match, la fatigue doit être à 0');

console.log('=== 3. Test de non-dépassement sous 0 ===');
// Carte à 3 de fatigue
ligue.cartes[0].fatigue = 3;
recupererFatiguePassivement(ligue, T0 + 8 * JOUR + 1000);
assert.strictEqual(ligue.cartes[0].fatigue, 0, 'La fatigue ne doit jamais être négative');

console.log('✅ Tous les tests de récupération passive ont réussi avec succès !');
