// Vérification SANS NAVIGATEUR du nouveau moteur de match :
//   1. le match se joue de bout en bout et retombe sur le score de la ligue ;
//   2. les 30 pions bougent, occupent l'espace et ne s'empilent pas ;
//   3. toutes les phases du rugby apparaissent (ruck, touche, mêlée, maul,
//      coup de pied, 50/22, drop, pénalité, carton, remplacement) ;
//   4. les statistiques individuelles sont bien produites ;
//   5. le moteur est déterministe et assez rapide pour la simulation de fond.

import { creerMatch, avancer, bilan, type EtatMatch } from '../src/lib/moteur/moteur';
import { LARGEUR } from '../src/lib/moteur/terrain';
import { jouerRencontre } from '../src/lib/championnat';
import { effectifDuClub } from '../src/lib/effectif';

const A = 'Stade Toulousain';
const B = 'Stade Rochelais';

function jouerJusquAuBout(cle: string, avatar = false): EtatMatch {
  const m = jouerRencontre(A, B, 1, cle, null);
  const e = creerMatch(
    A, B, effectifDuClub(A, 1), effectifDuClub(B, 1),
    m.scoreD, m.scoreE, cle,
    avatar ? { club: A, nom: effectifDuClub(A, 1)[10].nom, attributs: { vitesse: 88, passe: 74, plaquage: 60, jeuAuPied: 55, vision: 70, force: 66, mental: 72, endurance: 80 } } : undefined,
  );
  let garde = 0;
  while (!e.fini && garde++ < 40000) avancer(e, 4); // 4 s de jeu par appel
  return e;
}

console.log('=== 1. LE MATCH RETOMBE SUR LE SCORE DE LA LIGUE ===');
{
  let faux = 0;
  let tempsTotal = 0;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 40; i++) {
    const cle = `test#${i}`;
    const attendu = jouerRencontre(A, B, 1, cle, null);
    const e = jouerJusquAuBout(cle);
    if (e.scoreA !== attendu.scoreD || e.scoreB !== attendu.scoreE) {
      faux++;
      if (faux <= 3) console.log(`   ✗ ${cle} : moteur ${e.scoreA}-${e.scoreB}, ligue ${attendu.scoreD}-${attendu.scoreE}`);
    }
    tempsTotal += e.t;
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`  40 matchs joués — écarts avec le championnat : ${faux} ${faux === 0 ? '✅' : '❌'}`);
  console.log(`  durée de jeu moyenne : ${Math.round(tempsTotal / 40 / 60)} minutes`);
  console.log(`  temps de calcul : ${Math.round(ms)} ms au total, soit ${(ms / 40).toFixed(1)} ms par match`);
}

console.log('\n=== 2. LES PIONS OCCUPENT L’ESPACE ===');
{
  const e = creerMatch(A, B, effectifDuClub(A, 1), effectifDuClub(B, 1), 24, 17, 'espace');
  const mesures: { largeur: number; empiles: number; ecart: number }[] = [];
  for (let i = 0; i < 60; i++) {
    avancer(e, 12);
    if (e.fini) break;
    const sur = e.pions.filter((p) => p.surLeTerrain);
    const a = sur.filter((p) => p.cote === 'A');
    const b = sur.filter((p) => p.cote === 'B');
    const largeur = Math.max(...a.map((p) => p.pos.y)) - Math.min(...a.map((p) => p.pos.y));
    const empiles = sur.filter((p, i2) =>
      sur.some((q, j) => j !== i2 && Math.hypot(p.pos.x - q.pos.x, p.pos.y - q.pos.y) < 1.2)).length;
    const moy = (l: typeof a) => l.reduce((s, p) => s + p.pos.x, 0) / l.length;
    mesures.push({ largeur, empiles, ecart: Math.abs(moy(a) - moy(b)) });
  }
  const moyenne = (f: (m: typeof mesures[0]) => number) =>
    (mesures.reduce((s, m) => s + f(m), 0) / mesures.length).toFixed(1);
  console.log(`  largeur occupée par une équipe : ${moyenne((m) => m.largeur)} m sur ${LARGEUR}`);
  console.log(`  pions superposés (< 1,2 m) : ${moyenne((m) => m.empiles)} sur 30`);
  console.log(`  écart moyen entre les deux blocs : ${moyenne((m) => m.ecart)} m`);
}

console.log('\n=== 3. TOUTES LES PHASES DU RUGBY APPARAISSENT ===');
{
  const compte: Record<string, number> = {};
  const exemples: Record<string, string> = {};
  for (let i = 0; i < 20; i++) {
    const e = jouerJusquAuBout(`phases#${i}`);
    for (const c of e.commentaires) {
      compte[c.type] = (compte[c.type] ?? 0) + 1;
      if (!exemples[c.type]) exemples[c.type] = c.texte;
    }
  }
  for (const t of Object.keys(compte).sort((a, b) => compte[b] - compte[a])) {
    console.log(`  ${t.padEnd(13)} ${String(compte[t]).padStart(4)} — ${exemples[t].slice(0, 74)}`);
  }
  const attendus = ['essai', 'but', 'plaquage', 'ruck', 'touche', 'melee', 'pied', 'penalite'];
  const manquants = attendus.filter((t) => !compte[t]);
  console.log(`  phases manquantes : ${manquants.length ? manquants.join(', ') + ' ❌' : 'aucune ✅'}`);
  // Le 50/22 et le drop sont rares par nature : on les cherche sur plus de matchs.
  let cinquante = 0; let drop = 0; let maul = 0; let remplacement = 0;
  for (let i = 0; i < 40; i++) {
    const e = jouerJusquAuBout(`rare#${i}`);
    for (const c of e.commentaires) {
      if (c.texte.includes('50/22')) cinquante++;
      if (c.texte.includes('DROP') || c.texte.includes('drop')) drop++;
      if (c.type === 'maul') maul++;
      if (c.type === 'remplacement') remplacement++;
    }
  }
  console.log(`  sur 40 matchs : ${cinquante} tentatives de 50/22 · ${drop} drops · ${maul} mauls · ${remplacement} remplacements`);
}

console.log('\n=== 4. LES STATISTIQUES INDIVIDUELLES ===');
{
  const e = jouerJusquAuBout('stats', true);
  const b = bilan(e);
  console.log(`  ${b.parJoueur.length} joueurs ont foulé le terrain`);
  const tri = [...b.parJoueur].sort((x, y) => y.stats.metres - x.stats.metres);
  console.log('  meilleurs porteurs de balle :');
  for (const j of tri.slice(0, 4)) {
    console.log(`    #${String(j.numero).padStart(2)} ${j.nom.padEnd(24)} ${Math.round(j.stats.metres)} m portés · ${j.stats.plaquages} plaquages · ${j.stats.passes} passes · ${j.minutes}′`);
  }
  const plaqueurs = [...b.parJoueur].sort((x, y) => y.stats.plaquages - x.stats.plaquages)[0];
  console.log(`  meilleur plaqueur : ${plaqueurs.nom} (${plaqueurs.stats.plaquages})`);
  const moi = e.pions.find((p) => p.moi);
  console.log(`  avatar : ${moi?.nom} — ${Math.round(moi?.stats.distanceParcourue ?? 0)} m parcourus, endurance finale ${Math.round(moi?.endurance ?? 0)}/100`);
  const total = b.parJoueur.reduce((s, j) => s + j.stats.plaquages, 0);
  console.log(`  plaquages cumulés sur le match : ${total}`);
}

console.log('\n=== 5. DÉTERMINISME ===');
{
  const a = jouerJusquAuBout('determinisme');
  const b = jouerJusquAuBout('determinisme');
  const memeScore = a.scoreA === b.scoreA && a.scoreB === b.scoreB;
  const memeRecit = a.commentaires.map((c) => c.texte).join() === b.commentaires.map((c) => c.texte).join();
  console.log(`  même score : ${memeScore ? '✅' : '❌'} · même récit minute par minute : ${memeRecit ? '✅' : '❌'}`);
  console.log(`  ${a.commentaires.length} commentaires produits sur le match`);
}
