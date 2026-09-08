import assert from 'node:assert/strict';
import { horairesChampionnat } from '../src/lib/ligue/horaires';

const paris = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
for (const lancement of ['2026-09-08T10:00:00Z', '2026-12-08T10:00:00Z']) {
  for (let nombre = 1; nombre <= 10; nombre++) {
    const horaires = horairesChampionnat(Date.parse(lancement), 3, 0, nombre);
    const comptes = ['19:00', '20:00', '21:00'].map(h => horaires.filter(t => paris.format(t) === h).length);
    assert.equal(comptes.reduce((a, b) => a + b), nombre);
    assert.ok(Math.max(...comptes) - Math.min(...comptes) <= 1);
    assert.ok(horaires.every(t => new Date(t).toISOString().slice(0, 10) === lancement.slice(0, 10)));
  }
}
for (const [lancement, attendues] of [
  ['2026-09-08T17:00:00Z', ['19:00', '20:00', '21:00']],
  ['2026-09-08T17:30:00Z', ['20:00', '21:00']],
  ['2026-09-08T18:30:00Z', ['21:00']],
  ['2026-09-08T19:00:00Z', ['21:00']],
  ['2026-09-08T19:00:01Z', ['19:00', '20:00', '21:00']],
] as const) {
  const horaires = horairesChampionnat(Date.parse(lancement), 7, 0, 6);
  assert.deepEqual([...new Set(horaires.map(t => paris.format(t)))], attendues);
  assert.ok(horaires.every(t => t >= Date.parse(lancement)));
  assert.equal(new Date(horaires[0]).getUTCDate(), lancement.endsWith('01Z') ? 9 : 8);
}
// Les changements d'heure et tous les rythmes conservent les trois heures locales.
for (const lancement of ['2026-03-28T10:00:00Z', '2026-10-24T10:00:00Z']) {
  for (let rythme = 1; rythme <= 7; rythme++) {
    let precedent = 0;
    for (let ronde = 0; ronde < 38; ronde++) {
      const horaires = horairesChampionnat(Date.parse(lancement), rythme, ronde, 10);
      assert.ok(Math.min(...horaires) > precedent);
      assert.ok(horaires.every(t => ['19:00', '20:00', '21:00'].includes(paris.format(t))));
      precedent = Math.max(...horaires);
    }
  }
}
console.log('Horaires de ligue : répartition, lancement tardif, rythmes et changements d’heure vérifiés.');
