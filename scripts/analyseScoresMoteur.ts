import { creerMatch, avancer, type EtatMatch } from '../src/lib/moteur/moteur';
import { jouerRencontre } from '../src/lib/championnat';
import { effectifDuClub } from '../src/lib/effectif';

const A = 'Stade Toulousain';
const B = 'Stade Rochelais';
const effA = effectifDuClub(A, 1);
const effB = effectifDuClub(B, 1);

function jouer(cle: string) {
  const m = jouerRencontre(A, B, 1, cle, null);
  const e = creerMatch(A, B, effA, effB, m.scoreD, m.scoreE, cle);
  let garde = 0;
  while (!e.fini && garde++ < 4000) avancer(e, 8);

  const butsA = e.pions.filter(p => p.cote === 'A').reduce((s, p) => s + (p.stats.butsReussis || 0), 0);
  const butsB = e.pions.filter(p => p.cote === 'B').reduce((s, p) => s + (p.stats.butsReussis || 0), 0);
  const plaquagesA = e.pions.filter(p => p.cote === 'A').reduce((s, p) => s + (p.stats.plaquages || 0), 0);
  const plaquagesB = e.pions.filter(p => p.cote === 'B').reduce((s, p) => s + (p.stats.plaquages || 0), 0);
  const plaquagesManquesA = e.pions.filter(p => p.cote === 'A').reduce((s, p) => s + (p.stats.plaquagesManques || 0), 0);
  const plaquagesManquesB = e.pions.filter(p => p.cote === 'B').reduce((s, p) => s + (p.stats.plaquagesManques || 0), 0);

  return {
    scoreA: e.scoreA,
    scoreB: e.scoreB,
    total: e.scoreA + e.scoreB,
    essaisA: e.essaisA,
    essaisB: e.essaisB,
    essaisTotal: e.essaisA + e.essaisB,
    cibleA: m.scoreD,
    cibleB: m.scoreE,
    cibleTotal: m.scoreD + m.scoreE,
    butsTotal: butsA + butsB,
    rucks: e.compteurs.rucks,
    melees: e.compteurs.melees,
    touches: e.compteurs.touches,
    percees: e.compteurs.percees,
    enAvants: e.compteurs.enAvants,
    plaquages: plaquagesA + plaquagesB,
    plaquagesManques: plaquagesManquesA + plaquagesManquesB,
  };
}

console.log('Simulation de 50 matchs en cours...');
const N = 50;
const resultats = [];
for (let i = 0; i < N; i++) {
  resultats.push(jouer(`analyse#${i}`));
}

function stats(valeurs: number[]) {
  const sorted = [...valeurs].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p10 = sorted[Math.floor(sorted.length * 0.10)];
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p90 = sorted[Math.floor(sorted.length * 0.90)];
  const variance = sorted.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / sorted.length;
  const std = Math.sqrt(variance);

  return { mean, median, min, max, p10, p25, p75, p90, std };
}

const pointsTotaux = resultats.map(r => r.total);
const pointsA = resultats.map(r => r.scoreA);
const pointsB = resultats.map(r => r.scoreB);
const ciblesTotales = resultats.map(r => r.cibleTotal);
const essais = resultats.map(r => r.essaisTotal);

console.log('=== ANALYSE STATISTIQUE DES SCORES (ÉCHANTILLON DE 100 MATCHS) ===');
console.log('-----------------------------------------------------------------');
console.log('POINTS TOTAUX PAR MATCH :');
const stTotal = stats(pointsTotaux);
console.log(`  Moyenne       : ${stTotal.mean.toFixed(2)} pts`);
console.log(`  Médiane       : ${stTotal.median.toFixed(2)} pts`);
console.log(`  Écart-type    : ${stTotal.std.toFixed(2)} pts`);
console.log(`  Minimum       : ${stTotal.min} pts`);
console.log(`  Maximum       : ${stTotal.max} pts`);
console.log(`  10e percentile: ${stTotal.p10} pts`);
console.log(`  25e percentile: ${stTotal.p25} pts (Q1)`);
console.log(`  75e percentile: ${stTotal.p75} pts (Q3)`);
console.log(`  90e percentile: ${stTotal.p90} pts`);

console.log('\nESSAIS PAR MATCH :');
const stEssais = stats(essais);
console.log(`  Moyenne       : ${stEssais.mean.toFixed(2)} essais`);
console.log(`  Médiane       : ${stEssais.median.toFixed(2)} essais`);
console.log(`  Minimum       : ${stEssais.min} essais`);
console.log(`  Maximum       : ${stEssais.max} essais`);

console.log('\nPOINTS ÉQUIPE DOMICILE (Toulouse) :');
const stA = stats(pointsA);
console.log(`  Moyenne       : ${stA.mean.toFixed(2)} pts (Médiane : ${stA.median.toFixed(2)} pts, Min: ${stA.min}, Max: ${stA.max})`);

console.log('\nPOINTS ÉQUIPE EXTÉRIEUR (La Rochelle) :');
const stB = stats(pointsB);
console.log(`  Moyenne       : ${stB.mean.toFixed(2)} pts (Médiane : ${stB.median.toFixed(2)} pts, Min: ${stB.min}, Max: ${stB.max})`);

console.log('\nCIBLES THÉORIQUES DU CHAMPIONNAT (Ce que le moteur DEVRAIT viser) :');
const stCible = stats(ciblesTotales);
console.log(`  Moyenne cible : ${stCible.mean.toFixed(2)} pts (Médiane cible : ${stCible.median.toFixed(2)} pts)`);

console.log('\nÉCART MOTEUR vs CIBLE :');
console.log(`  Surplus moyen de points : +${(stTotal.mean - stCible.mean).toFixed(2)} pts (+${((stTotal.mean / stCible.mean - 1) * 100).toFixed(1)} %)`);

console.log('\nINDICATEURS DE JEU TOP 14 (Moyennes par match) :');
const stRucks = stats(resultats.map(r => r.rucks));
const stMelees = stats(resultats.map(r => r.melees));
const stTouches = stats(resultats.map(r => r.touches));
const stPercees = stats(resultats.map(r => r.percees));
const stEnAvants = stats(resultats.map(r => r.enAvants));
const stPlaquages = stats(resultats.map(r => r.plaquages));
const stPlaquagesM = stats(resultats.map(r => r.plaquagesManques));
const stButs = stats(resultats.map(r => r.butsTotal));

const tauxPlaquage = (stPlaquages.mean / (stPlaquages.mean + stPlaquagesM.mean) * 100);
console.log(`  Rucks disputés       : ${stRucks.mean.toFixed(1)} / match (Cible Top 14: ~140-170)`);
console.log(`  Mêlées ordonnées     : ${stMelees.mean.toFixed(1)} / match (Cible Top 14: ~12-16)`);
console.log(`  Touches              : ${stTouches.mean.toFixed(1)} / match (Cible Top 14: ~22-28)`);
console.log(`  Franchissements nets : ${stPercees.mean.toFixed(1)} / match (Cible Top 14: ~7-10)`);
console.log(`  En-avants commis     : ${stEnAvants.mean.toFixed(1)} / match (Cible Top 14: ~8-14)`);
console.log(`  Plaquages réussis    : ${stPlaquages.mean.toFixed(1)} / match (Taux réussite: ${tauxPlaquage.toFixed(1)} % | Cible Top 14: ~88-92 %)`);
console.log(`  Pénalités réussies   : ${stButs.mean.toFixed(1)} / match (Cible Top 14: ~3.5-5.0)`);

console.log('\nÉCHANTILLON DE 10 SCORES RÉELS DU MOTEUR :');
resultats.slice(0, 10).forEach((r, idx) => {
  console.log(`  Match ${String(idx + 1).padStart(2)}: Toulouse ${r.scoreA} - ${r.scoreB} La Rochelle (Total: ${r.total} pts | Cible championnat: ${r.cibleA}-${r.cibleB} = ${r.cibleTotal} pts | Essais: ${r.essaisTotal})`);
});
