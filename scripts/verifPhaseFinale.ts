// Vérification SANS NAVIGATEUR de la fin de saison :
// phase finale (barrages → demies → finale), match d'accès, montées/descentes,
// et cohérence du classement d'une saison à l'autre.
import { phaseFinale, matchAcces } from '../src/lib/phaseFinale';
import { resoudrePyramide, nomDivision } from '../src/lib/promotion';
import { clubsDeDivision, setMouvementsClubs } from '../src/lib/divisions';
import { championnatEnDirect, nombreJournees, journeesApres } from '../src/lib/championnat';
import { NB_JOURNEES } from '../src/data/calendrier';

console.log('=== PHASE FINALE DU TOP 14 (saison 1) ===');
const p = phaseFinale('top14', 1, 'RC Toulon');
console.log('  poule :', p.classement.length, 'clubs ·', nombreJournees('top14', 'RC Toulon'), 'journées');
console.log('  qualifiés :', p.qualifies.join(', '));
for (const m of p.matchs) console.log(`  ${m.libelle} → ${m.scoreD}-${m.scoreE} (${m.vainqueur})`);
console.log(`  🏆 champion : ${p.champion} · finaliste : ${p.finaliste}`);
console.log(`  dernier : ${p.dernier} · avant-dernier (match d'accès) : ${p.avantDernier}`);

console.log('\n=== MATCH D’ACCÈS TOP 14 / PRO D2 ===');
const prod2 = phaseFinale('prod2', 1, clubsDeDivision('prod2')[0]);
const acces = matchAcces(p, prod2, 1);
console.log(`  ${acces?.libelle} → ${acces?.scoreD}-${acces?.scoreE} · vainqueur ${acces?.vainqueur}`);

console.log('\n=== ENCHAÎNEMENT DE 5 SAISONS (pyramide française) ===');
let mouvements: Record<string, string> = {};
setMouvementsClubs(mouvements);
let division = 'prod2';
const club = 'US Montauban';
for (let saison = 1; saison <= 5; saison++) {
  const avant = clubsDeDivision(division).length;
  const bilan = resoudrePyramide(division, saison, club, 0);
  mouvements = { ...mouvements };
  for (const m of bilan.mouvements) mouvements[m.club] = m.vers;
  setMouvementsClubs(mouvements);
  const rang = bilan.phase.classement.find((l) => l.club === club)?.position;
  console.log(`  S${saison} · ${nomDivision(division)} (${avant} clubs) — ${club} ${rang}e`);
  for (const r of bilan.recits) console.log(`      ${r}`);
  const sien = bilan.mouvements.find((m) => m.club === club);
  if (sien) {
    console.log(`      >>> ${club} ${sien.sens === 'montee' ? 'MONTE' : 'DESCEND'} en ${nomDivision(sien.vers)} (${sien.motif})`);
    division = sien.vers;
  }
}
console.log('  clubs déplacés au total :', Object.keys(mouvements).length);

console.log('\n=== COMPOSITION EFFECTIVE APRÈS COUP ===');
for (const id of ['top14', 'prod2', 'nationale']) {
  const l = clubsDeDivision(id);
  console.log(`  ${nomDivision(id)} : ${l.length} clubs — ${l.slice(0, 4).join(', ')}…`);
}

console.log('\n=== ALIGNEMENT CALENDRIER / JOURNÉES ===');
for (const id of ['top14', 'prod2', 'fed3', 'japon3']) {
  const ancre = clubsDeDivision(id)[0];
  const total = nombreJournees(id, ancre);
  console.log(
    `  ${nomDivision(id)} : ${total} journées pour ${NB_JOURNEES} week-ends · ` +
      `au 12e week-end → J${journeesApres(12, total)} · au dernier → J${journeesApres(NB_JOURNEES, total)}`,
  );
}

console.log('\n=== CLASSEMENT EN DIRECT COHÉRENT AVEC LE FINAL ===');
const etatFin = championnatEnDirect('prod2', 2, 'US Montauban', 999, 0);
const phaseFin = phaseFinale('prod2', 2, 'US Montauban', 0);
const memeOrdre = etatFin.classement.every((l, i) => l.club === phaseFin.classement[i].club);
console.log('  le classement final et celui de la phase finale coïncident :', memeOrdre ? 'OUI ✅' : 'NON ❌');
