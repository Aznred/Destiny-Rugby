// BANC D'ESSAI DU MOTEUR DE MATCH — sans navigateur.
//
//  1. le score du moteur EST celui de la ligue (sinon le classement ment) ;
//  2. les statistiques du match tombent dans les fourchettes du rugby pro ;
//  3. LE BALLON CIRCULE : tous les postes le touchent, il va jusqu'aux ailes ;
//  4. la défense tient (ligne + second rideau) et occupe le terrain ;
//  5. toutes les phases du rugby apparaissent ;
//  6. déterminisme et vitesse de calcul.
//
//   npx vite-node scripts/verifMoteur.ts

import { creerMatch, avancer, bilan, type EtatMatch } from '../src/lib/moteur/moteur';
import { LARGEUR, AXE } from '../src/lib/moteur/terrain';
import { jouerRencontre } from '../src/lib/championnat';
import { effectifDuClub } from '../src/lib/effectif';
import { atteignable } from '../src/lib/moteur/plan';

const A = 'Stade Toulousain';
const B = 'Stade Rochelais';
const effA = effectifDuClub(A, 1);
const effB = effectifDuClub(B, 1);

function jouer(cle: string, avatar = false): EtatMatch {
  const m = jouerRencontre(A, B, 1, cle, null);
  const e = creerMatch(A, B, effA, effB, m.scoreD, m.scoreE, cle,
    avatar
      ? {
          club: A, nom: effA[10].nom, poste: 'demi_ouverture',
          attributs: { vitesse: 88, passe: 74, plaquage: 60, jeuAuPied: 78, vision: 80, force: 66, mental: 72, endurance: 82 },
          titulaire: true,
        }
      : undefined);
  let garde = 0;
  while (!e.fini && garde++ < 4000) avancer(e, 8);
  return e;
}

const N = 30;
const matchs: EtatMatch[] = [];
const t0 = process.hrtime.bigint();
for (let i = 0; i < N; i++) matchs.push(jouer(`test#${i}`));
const msTotal = Number(process.hrtime.bigint() - t0) / 1e6;

const moy = (f: (e: EtatMatch) => number) => matchs.reduce((s, e) => s + f(e), 0) / N;
const compter = (e: EtatMatch, t: string) => e.commentaires.filter((c) => c.type === t).length;
const contient = (e: EtatMatch, mot: string) => e.commentaires.filter((c) => c.texte.includes(mot)).length;
const totalStat = (e: EtatMatch, f: (s: EtatMatch['pions'][0]['stats']) => number) =>
  e.pions.reduce((s, p) => s + f(p.stats), 0);

console.log('=== 1. LE SCORE EST CELUI DE LA LIGUE ===');
{
  let faux = 0;
  const ecarts: string[] = [];
  for (let i = 0; i < N; i++) {
    const attendu = jouerRencontre(A, B, 1, `test#${i}`, null);
    const e = matchs[i];
    if (e.scoreA !== attendu.scoreD || e.scoreB !== attendu.scoreE) {
      faux++;
      if (ecarts.length < 4) ecarts.push(`   ✗ test#${i} : moteur ${e.scoreA}-${e.scoreB}, ligue ${attendu.scoreD}-${attendu.scoreE}`);
    }
  }
  ecarts.forEach((l) => console.log(l));
  console.log(`  ${N} matchs — écarts avec le championnat : ${faux} ${faux === 0 ? '✅' : '❌'}`);
  const exemples = matchs.slice(0, 6).map((e) => `${e.scoreA}-${e.scoreB}`).join(' · ');
  console.log(`  scores : ${exemples}`);
  const total = moy((e) => e.scoreA + e.scoreB);
  console.log(`  total de points par match : ${total.toFixed(1)} (rugby pro : 40 à 55)`);
  const impossibles = matchs.filter((e) => !atteignable(e.scoreA) || !atteignable(e.scoreB)).length;
  console.log(`  scores impossibles au rugby : ${impossibles} ${impossibles === 0 ? '✅' : '❌'}`);
  // Les points soldés à la sirène doivent rester l'exception.
  const soldes = moy((e) => e.commentaires.filter((c) => /arrêts de jeu|temps additionnel|dernière seconde/.test(c.texte)).reduce((s, c) => s + c.points, 0));
  console.log(`  points soldés en fin de match : ${soldes.toFixed(1)} par match (cible < 4)`);
}

console.log('\n=== 2. LES CHIFFRES DU MATCH ===');
{
  const ligne = (nom: string, v: number, cible: string) =>
    console.log(`  ${nom.padEnd(26)} ${v.toFixed(1).padStart(7)}   (${cible})`);
  ligne('durée jouée (min)', moy((e) => e.t / 60), '80');
  ligne('essais', moy((e) => e.essaisA + e.essaisB), '4 à 8');
  ligne('plaquages réussis', moy((e) => totalStat(e, (s) => s.plaquages)), '180 à 280');
  ligne('plaquages manqués', moy((e) => totalStat(e, (s) => s.plaquagesManques)), '14 à 40');
  ligne('passes', moy((e) => totalStat(e, (s) => s.passes)), '280 à 460');
  ligne('en-avant', moy((e) => totalStat(e, (s) => s.passesRatees)), '8 à 20');
  ligne('coups de pied', moy((e) => totalStat(e, (s) => s.coupsDePied)), '35 à 60');
  ligne('rucks', moy((e) => e.compteurs.rucks), '110 à 180');
  ligne('mêlées', moy((e) => e.compteurs.melees), '8 à 18');
  ligne('touches (alignements)', moy((e) => e.compteurs.touches), '20 à 34');
  ligne('percées annoncées', moy((e) => e.compteurs.percees), '10 à 25');
  ligne('pénalités sifflées', moy((e) => compter(e, 'penalite')), '14 à 26');
  ligne('cartons jaunes', moy((e) => compter(e, 'carton')), '0 à 3');
  ligne('remplacements', moy((e) => compter(e, 'remplacement')), '10 à 16');
  ligne('50/22 tentés', moy((e) => contient(e, '50/22')), '0 à 3');
  ligne('% de réussite au pied', 100 * moy((e) => {
    const t = totalStat(e, (s) => s.butsTentes);
    return t ? totalStat(e, (s) => s.butsReussis) / t : 0;
  }), '70 à 85 %');
  const minutes = matchs.flatMap((e) => e.pions.filter((p) => p.minutes > 0).map((p) => p.minutes));
  console.log(`  minutes jouées : max ${Math.max(...minutes).toFixed(0)}′ (doit être ≤ 82)`);
}

console.log('\n=== 3. LE BALLON CIRCULE (le vrai bug d’avant) ===');
{
  // Combien de joueurs différents portent le ballon, et jusqu'où va-t-il ?
  const parNumero = new Array(16).fill(0);
  let porteursDistincts = 0;
  let essaisAiliers = 0;
  let essaisTotal = 0;
  for (const e of matchs) {
    const actifs = e.pions.filter((p) => p.stats.courses > 0);
    porteursDistincts += actifs.length;
    for (const p of e.pions) {
      if (p.numero <= 15) parNumero[p.numero] += p.stats.courses;
      if (p.stats.essais) {
        essaisTotal += p.stats.essais;
        if (p.numero === 11 || p.numero === 14 || p.numero === 15) essaisAiliers += p.stats.essais;
      }
    }
  }
  console.log(`  joueurs différents ayant touché le ballon : ${(porteursDistincts / N).toFixed(1)} sur 46 (titulaires + banc, 2 équipes)`);
  const total = parNumero.reduce((a, b) => a + b, 0);
  console.log('  ballons portés par numéro de maillot (%) :');
  let ligne = '   ';
  for (let n = 1; n <= 15; n++) ligne += `${String(n).padStart(3)}:${((parNumero[n] / total) * 100).toFixed(1).padStart(5)}%`;
  console.log(ligne.replace(/(.{78})/g, '$1\n   '));
  const avants = parNumero.slice(1, 9).reduce((a, b) => a + b, 0) / total;
  console.log(`  part des avants (1-8) : ${(avants * 100).toFixed(0)} % (cible > 15 %)`);
  const ailiers = (parNumero[11] + parNumero[14] + parNumero[15]) / total;
  console.log(`  part des ailiers + arrière : ${(ailiers * 100).toFixed(0)} % (cible 8 à 25 %) 🎯`);
  console.log(`  essais marqués par le trio arrière : ${((essaisAiliers / Math.max(1, essaisTotal)) * 100).toFixed(0)} %`);
  const jamais = [];
  for (let n = 1; n <= 15; n++) if (parNumero[n] === 0) jamais.push(n);
  console.log(`  maillots n’ayant JAMAIS touché le ballon : ${jamais.length ? jamais.join(', ') + ' ❌' : 'aucun ✅'}`);
}

console.log('\n=== 4. LA STRUCTURE SUR LE TERRAIN ===');
{
  const e = creerMatch(A, B, effA, effB, 24, 17, 'structure');
  const mesures: { largeurAtt: number; largeurDef: number; empiles: number; rideau2: number; platitude: number; grappe: number }[] = [];
  for (let i = 0; i < 220; i++) {
    avancer(e, 3);
    if (e.fini) break;
    if (e.phase !== 'jeuCourant' || !e.porteur) continue;
    const sur = e.pions.filter((p) => p.surLeTerrain && p.sanction <= 0);
    const att = sur.filter((p) => p.cote === e.possession);
    const def = sur.filter((p) => p.cote !== e.possession);
    if (att.length < 10 || def.length < 10) continue;
    const etendue = (l: typeof att) => Math.max(...l.map((p) => p.pos.y)) - Math.min(...l.map((p) => p.pos.y));
    const empiles = sur.filter((p, i2) =>
      sur.some((q, j) => j !== i2 && Math.hypot(p.pos.x - q.pos.x, p.pos.y - q.pos.y) < 1.1)).length;
    // ⚠️ LE SECOND RIDEAU se mesure par rapport au PREMIER, pas au porteur :
    // ce sont les défenseurs nettement plus bas que le rideau qui monte.
    const sa = e.possession === 'A' ? 1 : -1;
    const profondeurs = def.map((p) => (p.pos.x - e.porteur!.pos.x) * sa).sort((x, y) => x - y);
    // Référence = le 4ᵉ défenseur le plus avancé : c'est le premier rideau,
    // pas l'isolé qui traîne devant ni la moyenne polluée par les retardataires.
    const rideau1 = profondeurs[Math.min(3, profondeurs.length - 1)];
    const rideau2 = profondeurs.filter((d) => d > rideau1 + 10).length;
    // Platitude du premier rideau : écart-type des X des 8 défenseurs les plus avancés.
    const avancees = def.map((p) => (p.pos.x - e.porteur!.pos.x) * sa).sort((a, b) => a - b).slice(0, 8);
    const m = avancees.reduce((a, b) => a + b, 0) / avancees.length;
    const platitude = Math.sqrt(avancees.reduce((a, b) => a + (b - m) ** 2, 0) / avancees.length);
    // ⚠️ « Ils courent tous après le ballon » : combien de défenseurs sont
    // agglutinés à moins de 6 m du porteur ? Au rugby : deux ou trois.
    const grappe = def.filter((p) => Math.hypot(p.pos.x - e.porteur!.pos.x, p.pos.y - e.porteur!.pos.y) < 6).length;
    mesures.push({ largeurAtt: etendue(att), largeurDef: etendue(def), empiles, rideau2, platitude, grappe });
  }
  const m = (f: (x: typeof mesures[0]) => number) =>
    (mesures.reduce((s, x) => s + f(x), 0) / Math.max(1, mesures.length)).toFixed(1);
  console.log(`  relevés en jeu courant : ${mesures.length}`);
  console.log(`  largeur occupée par l’attaque : ${m((x) => x.largeurAtt)} m sur ${LARGEUR} (cible > 35)`);
  console.log(`  largeur occupée par la défense : ${m((x) => x.largeurDef)} m (cible > 40)`);
  console.log(`  joueurs superposés (< 1,1 m) : ${m((x) => x.empiles)} sur 30 (cible < 8)`);
  console.log(`  SECOND RIDEAU — défenseurs en couverture : ${m((x) => x.rideau2)} (cible 2 à 5) 🛡️`);
  console.log(`  défenseurs agglutinés à moins de 6 m du porteur : ${m((x) => x.grappe)} (cible < 4)`);
  console.log(`  platitude du premier rideau (écart-type) : ${m((x) => x.platitude)} m (cible < 4)`);
}

console.log('\n=== 5. TOUTES LES PHASES DU RUGBY ===');
{
  const compte: Record<string, number> = {};
  const exemple: Record<string, string> = {};
  for (const e of matchs) {
    for (const c of e.commentaires) {
      compte[c.type] = (compte[c.type] ?? 0) + 1;
      if (!exemple[c.type]) exemple[c.type] = c.texte;
    }
  }
  for (const t of Object.keys(compte).sort((a, b) => compte[b] - compte[a])) {
    console.log(`  ${t.padEnd(15)} ${String(Math.round(compte[t] / N)).padStart(4)}/match — ${exemple[t].slice(0, 68)}`);
  }
  const attendus = ['essai', 'but', 'ruck', 'touche', 'melee', 'pied', 'penalite', 'franchissement', 'remplacement'];
  const manquants = attendus.filter((t) => !compte[t]);
  console.log(`  phases manquantes : ${manquants.length ? manquants.join(', ') + ' ❌' : 'aucune ✅'}`);
  // Variété du commentaire.
  const textes = new Set(matchs[0].commentaires.map((c) => c.texte));
  console.log(`  textes distincts sur un match : ${textes.size} / ${matchs[0].commentaires.length}`);
}

console.log('\n=== 6. DÉTERMINISME ET PERFORMANCE ===');
{
  // Même graine, granularités d'appel différentes : le résultat doit être IDENTIQUE.
  const fin = (pas: number) => {
    const m = jouerRencontre(A, B, 1, 'determinisme', null);
    const e = creerMatch(A, B, effA, effB, m.scoreD, m.scoreE, 'determinisme');
    let g = 0;
    while (!e.fini && g++ < 200000) avancer(e, pas);
    return e;
  };
  const gros = fin(8);
  const fin16ms = fin(0.016 * 5); // ce que fait le direct à 60 fps
  const memeScore = gros.scoreA === fin16ms.scoreA && gros.scoreB === fin16ms.scoreB;
  const memeRecit = gros.commentaires.map((c) => c.texte).join('|') === fin16ms.commentaires.map((c) => c.texte).join('|');
  console.log(`  simulation de fond (pas de 8 s) vs direct (pas de 80 ms) :`);
  console.log(`    même score : ${memeScore ? '✅' : '❌'} · même récit minute par minute : ${memeRecit ? '✅' : '❌'}`);
  console.log(`  ${gros.commentaires.length} commentaires sur le match`);
  console.log(`  calcul : ${(msTotal / N).toFixed(0)} ms par match — une journée de 8 affiches ≈ ${((msTotal / N) * 8 / 1000).toFixed(2)} s`);
  const secondesSim = moy((e) => e.sim);
  console.log(`  durée simulée : ${Math.round(secondesSim)} s → ${(secondesSim / 5 / 60).toFixed(1)} min à l’écran en ×1`);
}

console.log('\n=== 7. LA FEUILLE DE MATCH ===');
{
  const e = jouer('feuille', true);
  const b = bilan(e);
  console.log(`  ${b.parJoueur.length} joueurs ont foulé le terrain`);
  const tri = [...b.parJoueur].sort((x, y) => y.stats.metres - x.stats.metres).slice(0, 5);
  for (const j of tri) {
    console.log(`   #${String(j.numero).padStart(2)} ${j.nom.padEnd(24)} ${Math.round(j.stats.metres).toString().padStart(4)} m · ${String(j.stats.plaquages).padStart(2)} plq · ${j.stats.essais} ess · ${String(j.stats.passes).padStart(2)} pas · ${j.minutes}′`);
  }
  const moi = e.pions.find((p) => p.moi);
  if (moi) {
    console.log(`  avatar : #${moi.numero} ${moi.nom} — ${Math.round(moi.stats.distanceParcourue)} m parcourus, endurance ${Math.round(moi.endurance)}/100, ${moi.minutes.toFixed(0)}′`);
  }
  const ORDRE = ['pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g', 'deuxieme_ligne_d',
    'troisieme_aile_g', 'troisieme_aile_d', 'numero_8', 'demi_melee', 'demi_ouverture',
    'ailier_gauche', 'premier_centre', 'deuxieme_centre', 'ailier_droit', 'arriere'];
  const titulaires = e.pions.filter((p) => p.cote === 'A' && p.id.slice(1).length <= 2 && Number(p.id.slice(1)) < 15);
  const bons = titulaires.filter((p) => ORDRE[Number(p.id.slice(1))] === p.poste).length;
  console.log(`  maillots 1-15 attribués au bon poste : ${bons}/15`);
  const centre = matchs[0].pions.filter((p) => Math.abs(p.pos.y - AXE) < 1).length;
  console.log(`  pions collés à l’axe en fin de match : ${centre} (empilement)`);
}
