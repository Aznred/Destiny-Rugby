import assert from 'node:assert/strict';
import { agirCarriere, creerCarriere, reparerOuverturesCalendrier } from '../src/lib/ligue/carriere.js';

const debut = Date.parse('2026-09-09T07:19:35.845Z');
let etat = creerCarriere({
  id: 'test-calendrier', nom: 'Calendrier test', code: 'DR-DATES',
  compteId: 'compte-1', pseudo: 'Un', clubNom: 'Club 1', rythme: 2, maxClubs: 4,
}, debut, 'graine');
for (let i = 2; i <= 4; i++) etat = agirCarriere(etat, `compte-${i}`,
  { type: 'rejoindre', pseudo: `Ami ${i}`, clubNom: `Club ${i}` }, debut, `graine-${i}`);
etat = agirCarriere(etat, 'compte-1', { type: 'demarrerSaison' }, debut, 'saison');

const championnat = etat.competitions[0];
const calendrier = etat.rencontres.filter(r => r.competitionId === championnat.id);
const ouvertureAncienne = calendrier[0].ouvre;
for (const rencontre of calendrier) rencontre.ouvre = ouvertureAncienne;
const resultat = { pointsD: 17, pointsE: 12, essaisD: 2, essaisE: 1, joueLe: calendrier[0].ferme, origine: 'absence' as const };
for (const rencontre of calendrier.filter(r => r.journee === 1)) rencontre.resultat = resultat;

const corriges = reparerOuverturesCalendrier(etat);
assert(corriges > 0);
assert(calendrier.filter(r => r.journee === 1).every(r => r.ouvre === ouvertureAncienne));
assert(calendrier.filter(r => r.journee === 1).every(r => r.resultat === resultat));
for (let journee = 2; journee <= Math.max(...calendrier.map(r => r.journee)); journee++) {
  const precedente = calendrier.filter(r => r.journee === journee - 1);
  const attendue = Math.max(...precedente.map(r => Date.parse(r.ferme)));
  assert(calendrier.filter(r => r.journee === journee).every(r => Date.parse(r.ouvre) === attendue));
}
assert.equal(reparerOuverturesCalendrier(etat), 0, 'la réparation doit être idempotente');
console.log(`OK — ${corriges} ouvertures réparées, résultats conservés, seconde passe sans changement.`);
