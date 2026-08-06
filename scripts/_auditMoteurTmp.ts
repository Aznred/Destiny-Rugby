// SONDE TEMPORAIRE D'AUDIT — à supprimer.
import { creerMatch, avancer, type EtatMatch } from '../src/lib/moteur/moteur';
import { jouerRencontre } from '../src/lib/championnat';
import { effectifDuClub } from '../src/lib/effectif';

const A = 'Stade Toulousain';
const B = 'Stade Rochelais';
const effA = effectifDuClub(A, 1);
const effB = effectifDuClub(B, 1);

function jouer(cle: string): EtatMatch {
  const m = jouerRencontre(A, B, 1, cle, null);
  const e = creerMatch(A, B, effA, effB, m.scoreD, m.scoreE, cle);
  let g = 0;
  while (!e.fini && g++ < 4000) avancer(e, 8);
  return e;
}

const N = 20;
const matchs: EtatMatch[] = [];
for (let i = 0; i < N; i++) matchs.push(jouer(`stat#${i}`));

const cles = [
  'melees', 'touchesGagnees', 'pickAndGo', 'coupsDePied', 'cinquanteVingtDeux',
  'passesDecisives', 'offloads', 'grattages', 'essais', 'butsTentes', 'butsReussis',
  'cartonsJaunes', 'cartonsRouges', 'franchissements', 'plaquages', 'passes', 'metres',
] as const;

console.log('=== TOTAUX PAR MATCH (moyenne sur 20) ===');
for (const c of cles) {
  const tot = matchs.reduce((s, e) => s + e.pions.reduce((t, p) => t + (p.stats as any)[c], 0), 0) / N;
  console.log(`  ${c.padEnd(20)} ${tot.toFixed(1)}`);
}

console.log('\n=== CONCENTRATION : combien de joueurs se partagent chaque stat (équipe A, match 0) ===');
{
  const e = matchs[0];
  for (const c of ['touchesGagnees', 'melees', 'pickAndGo', 'coupsDePied', 'butsTentes', 'grattages', 'passesDecisives'] as const) {
    const l = e.pions.filter((p) => p.cote === 'A' && (p.stats as any)[c] > 0)
      .map((p) => `${p.numero}=${(p.stats as any)[c]}`);
    console.log(`  ${c.padEnd(18)} ${l.length} joueur(s) : ${l.join(' ')}`);
  }
}

console.log('\n=== SAUTEUR EN TOUCHE : est-ce toujours le même ? (5 matchs) ===');
for (let i = 0; i < 5; i++) {
  const e = matchs[i];
  const l = e.pions.filter((p) => p.cote === 'A' && p.stats.touchesGagnees > 0)
    .map((p) => `#${p.numero}(${p.stats.touchesGagnees})`);
  console.log(`  match ${i} : ${l.join(' ')}`);
}

console.log('\n=== BUTEURS : combien de joueurs tentent au but ? ===');
for (let i = 0; i < 5; i++) {
  const e = matchs[i];
  const l = e.pions.filter((p) => p.stats.butsTentes > 0)
    .map((p) => `${p.cote}#${p.numero} ${p.stats.butsReussis}/${p.stats.butsTentes}`);
  console.log(`  match ${i} : ${l.join(' · ')}`);
}

console.log('\n=== CARTONS ROUGES ===');
{
  let rouges = 0; let jaunes = 0;
  for (const e of matchs) {
    for (const p of e.pions) { rouges += p.stats.cartonsRouges; jaunes += p.stats.cartonsJaunes; }
  }
  console.log(`  jaunes ${(jaunes / N).toFixed(2)} / match · rouges ${(rouges / N).toFixed(3)} / match`);
  // un rouge doit laisser l'équipe à 14 jusqu'au bout
  for (const e of matchs) {
    const r = e.pions.find((p) => p.stats.cartonsRouges > 0);
    if (r) console.log(`  rouge : ${r.cote}#${r.numero} minutes=${r.minutes.toFixed(0)} surLeTerrain=${r.surLeTerrain} sanction=${r.sanction.toFixed(0)}`);
  }
}

console.log('\n=== JOUEURS SANS AUCUN BALLON (courses = 0) ===');
{
  const e = matchs[0];
  const zero = e.pions.filter((p) => p.minutes > 20 && p.stats.courses === 0).map((p) => `${p.cote}#${p.numero}`);
  console.log(`  ${zero.length} : ${zero.join(' ')}`);
}

console.log('\n=== PHASES PRÉSENTES ===');
{
  const e = matchs[0];
  const types = new Set(e.commentaires.map((c) => c.type));
  console.log('  ' + [...types].join(', '));
  console.log(`  compteurs : rucks=${e.compteurs.rucks} melees=${e.compteurs.melees} touches=${e.compteurs.touches} percees=${e.compteurs.percees}`);
  console.log(`  possession A=${e.compteurs.tempsA.toFixed(0)}s B=${e.compteurs.tempsB.toFixed(0)}s`);
}

console.log('\n=== MINUTES DES COMMENTAIRES : monotones ? ===');
{
  for (let i = 0; i < 3; i++) {
    const e = matchs[i];
    let recul = 0; let pire = '';
    for (let k = 1; k < e.commentaires.length; k++) {
      if (e.commentaires[k].minute < e.commentaires[k - 1].minute) {
        recul++;
        if (!pire) pire = `${e.commentaires[k - 1].minute}' → ${e.commentaires[k].minute}' (« ${e.commentaires[k].texte.slice(0, 50)} »)`;
      }
    }
    console.log(`  match ${i} : ${recul} reculs — ${pire}`);
  }
}

console.log('\n=== SCORE AFFICHÉ DANS LE FIL vs SCORE FINAL ===');
{
  const e = matchs[0];
  const der = e.commentaires[e.commentaires.length - 1];
  console.log(`  dernier commentaire : ${der.scoreA}-${der.scoreB} · état final ${e.scoreA}-${e.scoreB}`);
  const marques = e.commentaires.filter((c) => c.points > 0);
  console.log(`  somme des points annoncés : A/B confondus = ${marques.reduce((s, c) => s + c.points, 0)} · total réel ${e.scoreA + e.scoreB}`);
}
