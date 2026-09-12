import assert from 'node:assert/strict';
import { agirCarriere, creerCarriere, dureeBlessureSelonRythme, recuperationFatigueSelonRythme, reparerOuverturesCalendrier } from '../src/lib/ligue/carriere.js';

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

const calendrierAvant = structuredClone(etat.rencontres);
assert.throws(() => agirCarriere(etat, 'compte-2', { type: 'modifierRythme', rythme: 7 }, debut, 'intrus'),
  /Seul le créateur/, 'un invité ne doit pas pouvoir changer le rythme');
etat = agirCarriere(etat, 'compte-1', {
  type: 'creerCoupe', nom: 'Coupe du rythme', trophee: 'Trophée du rythme',
  participants: etat.clubs.map(c => c.id), format: 'championnat',
  debut: new Date(debut + 2 * 86_400_000).toISOString(),
  recompenseParticipation: 0, recompenseVainqueur: 0, recompenseFinaliste: 0,
}, debut, 'coupe');
etat = agirCarriere(etat, 'compte-1', { type: 'modifierRythme', rythme: 7 }, debut, 'quotidien');
assert.equal(etat.rythme, 7);
for (const competition of etat.competitions) {
  const dates = [...new Set(etat.rencontres.filter(r => r.competitionId === competition.id && !r.resultat)
    .map(r => r.journee))].sort((a, b) => a - b).map(journee => Math.max(...etat.rencontres
      .filter(r => r.competitionId === competition.id && r.journee === journee).map(r => Date.parse(r.ferme))));
  for (let i = 1; i < dates.length; i++) {
    const intervalle = dates[i] - dates[i - 1];
    assert(intervalle >= 20 * 3_600_000 && intervalle <= 28 * 3_600_000,
      `${competition.nom} doit avancer d'une journée civile à la fois`);
  }
}
assert(calendrierAvant.some(ancienne => etat.rencontres.some(r => r.id === ancienne.id && r.ferme !== ancienne.ferme)),
  'les affiches futures doivent être réellement reprogrammées');
assert(recuperationFatigueSelonRythme(7) > recuperationFatigueSelonRythme(1),
  'la récupération de fatigue doit accélérer avec le rythme');
assert(dureeBlessureSelonRythme(7, 7) < dureeBlessureSelonRythme(7, 1),
  'les blessures doivent durer moins longtemps dans une ligue accélérée');

console.log(`OK — ${corriges} ouvertures réparées, calendrier quotidien championnat + coupe, récupération adaptée et droits du créateur vérifiés.`);
