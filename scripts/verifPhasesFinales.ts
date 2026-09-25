import { creerCarriere, agirCarriere, avancerCarriere, estMatchElimination, resoudreEgaliteElimination, vainqueurRencontre } from '../src/lib/ligue/carriere';

console.log('Testing tiebreak and knockout resolution...');
const T0 = Date.parse('2026-09-07T10:00:00.000Z');
let e = creerCarriere({ id: 'ligue-test-tb', nom: 'Ligue Test', code: 'TB-TEST', compteId: 'c1', pseudo: 'User1', clubNom: 'FC Meze', rythme: 7, maxClubs: 8 }, T0, 'seed-1');
e = agirCarriere(e, 'c2', { type: 'rejoindre', pseudo: 'User2', clubNom: 'Les XV glorieuse' }, T0, 'seed-2');
e = agirCarriere(e, 'c3', { type: 'rejoindre', pseudo: 'User3', clubNom: 'Allah pero' }, T0, 'seed-3');
e = agirCarriere(e, 'c4', { type: 'rejoindre', pseudo: 'User4', clubNom: 'Bangkok Rugby' }, T0, 'seed-4');
e = agirCarriere(e, 'c1', { type: 'demarrerSaison' }, T0, 'seed-start');

e = agirCarriere(e, 'c1', {
  type: 'creerCoupe',
  nom: 'Ladyboy Cup',
  trophee: 'Coupe Asie',
  participants: [e.clubs[0].id, e.clubs[1].id, e.clubs[2].id, e.clubs[3].id],
  format: 'elimination',
  debut: new Date(T0).toISOString(),
  recompenseParticipation: 1000,
  recompenseVainqueur: 5000,
  recompenseFinaliste: 2500,
}, T0, 'seed-cup');

const coupe = e.competitions.find(c => c.nom === 'Ladyboy Cup')!;
console.log('Coupe created:', coupe.id, 'format:', coupe.format);

const r1 = e.rencontres.filter(r => r.competitionId === coupe.id && r.journee === 1);
console.log('Round 1 encounters:', r1.length);
if (r1.length !== 2) throw new Error('Expected 2 matches in round 1');

// Match 1: FC Meze (38) vs Les XV glorieuse (19)
r1[0].resultat = { pointsD: 38, pointsE: 19, essaisD: 5, essaisE: 2, joueLe: new Date(T0).toISOString(), origine: 'direct' };
// Match 2: Allah pero (40) vs Bangkok Rugby (40) -> DRAW!
r1[1].resultat = { pointsD: 40, pointsE: 40, essaisD: 4, essaisE: 4, joueLe: new Date(T0).toISOString(), origine: 'direct' };

// Advance competitions!
e = avancerCarriere(e, T0 + 86400000, 'advance-1');

// Check that Match 2 draw was resolved:
const m2Resolu = e.rencontres.find(r => r.id === r1[1].id)!;
console.log('Match 2 resolved:', {
  pointsD: m2Resolu.resultat?.pointsD,
  pointsE: m2Resolu.resultat?.pointsE,
  vainqueurId: m2Resolu.vainqueurId,
  ap: m2Resolu.resultat?.ap,
  tab: m2Resolu.resultat?.tab,
  tirsAuBut: m2Resolu.resultat?.tirsAuBut,
  prolongations: m2Resolu.resultat?.prolongations,
});

if (!m2Resolu.vainqueurId) throw new Error('Match 2 vainqueurId must be set');
if (!m2Resolu.resultat?.ap && !m2Resolu.resultat?.tab) throw new Error('Match 2 must have ap or tab set');

// Check Round 2 (Finale) encounters:
const r2 = e.rencontres.filter(r => r.competitionId === coupe.id && r.journee === 2);
console.log('Round 2 (Finale) encounters:', r2.length);
if (r2.length !== 1) throw new Error('Expected exactly 1 match in round 2 (the finale)');

console.log('Finale participants:', r2[0].domicile, 'vs', r2[0].exterieur);
const expectedFinalists = new Set([r1[0].domicile, m2Resolu.vainqueurId]);
if (!expectedFinalists.has(r2[0].domicile) || !expectedFinalists.has(r2[0].exterieur)) {
  throw new Error('Finale participants must be the winners of round 1');
}

// Play the Finale:
r2[0].resultat = { pointsD: 71, pointsE: 41, essaisD: 9, essaisE: 5, joueLe: new Date(T0 + 86400000).toISOString(), origine: 'direct' };

// Advance competitions again!
e = avancerCarriere(e, T0 + 2 * 86400000, 'advance-2');

// Check that competition is CLOSED and NO Journée 3 was created!
const coupeFinie = e.competitions.find(c => c.id === coupe.id)!;
console.log('Coupe state after finale:', coupeFinie.etat, 'vainqueur:', coupeFinie.vainqueur, 'finaliste:', coupeFinie.finaliste);
if (coupeFinie.etat !== 'terminee') throw new Error('Coupe must be terminee after finale');
if (coupeFinie.vainqueur !== r2[0].domicile) throw new Error('Winner must be r2 domicile');

const r3 = e.rencontres.filter(r => r.competitionId === coupe.id && r.journee >= 3);
console.log('Encounters in Journée 3 or beyond:', r3.length);
if (r3.length !== 0) throw new Error('NO matches should exist after finale!');

// Test Reparation: simulate an existing league that had the phantom match
console.log('Testing repair of phantom match...');
e.rencontres.push({
  id: 'rencontre-fantome',
  competitionId: coupe.id,
  journee: 3,
  domicile: e.clubs[0].id,
  exterieur: e.clubs[2].id,
  ouvre: new Date(T0 + 3 * 86400000).toISOString(),
  ferme: new Date(T0 + 4 * 86400000).toISOString(),
});
coupeFinie.etat = 'enCours'; // Simulate non-closed

e = avancerCarriere(e, T0 + 5 * 86400000, 'advance-repair');
const rFantome = e.rencontres.filter(r => r.competitionId === coupe.id && r.journee >= 3);
console.log('Phantom matches after repair:', rFantome.length);
if (rFantome.length !== 0) throw new Error('Phantom match was not pruned!');
const coupeReparee = e.competitions.find(c => c.id === coupe.id)!;
console.log('Coupe state after repair:', coupeReparee.etat);
if (coupeReparee.etat !== 'terminee') throw new Error('Coupe was not re-closed!');

console.log('✅ ALL TIEBREAK, KNOCKOUT & REPAIR TESTS PASSED SUCCESSFULLY!');
