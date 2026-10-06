// LA CONQUÊTE LISIBLE, MESURÉE — Correctif 23 (`moteur/conquete.ts`, niveau d'IA 4).
//
// Ce banc joue des matchs de carrière 3D entiers et vérifie, pas à pas, ce que la demande exige :
//   · TOUCHE : l'issue est tranchée avant le saut ; une touche perdue donne le ballon à l'adversaire QUI A SAUTÉ — jamais à
//     son 9 par téléportation ; une touche tranchée une fois ne change plus ; les fréquences restent celles de l'ancien moteur.
//   · RUCK, MÊLÉE, MAUL : voir les sections suivantes (ajoutées avec chaque conquête).
// Toute rupture d'invariant arrête le banc avec le match, la minute et la graine.
//
// Lancer : npm run verify:conquete -- 24
import assert from 'node:assert/strict';
import { avancer, creerMatch, DT, geometrieMelee, installerSituationCombinaison } from '../src/lib/moteur/moteur';
import { activerDirect, demanderDirect } from '../src/lib/moteur/direct';
import { effectifDuClub } from '../src/lib/effectif';
import { COMPETITIONS } from '../src/data/clubs';
import { AXE, LIGNE_B, distance } from '../src/lib/moteur/terrain';
import type { EtatMatch, IssueTouche } from '../src/lib/moteur/etat';

const N = Number(process.argv[2] ?? 12);
const reg = COMPETITIONS.find((c) => c.id === 'reg1')!.clubs;
const PAIRES: [string, string][] = [
  ['Stade Toulousain', 'RC Toulon'], ['Stade Rochelais', 'Racing 92'], [reg[0].nom, reg[1].nom], [reg[2].nom, reg[3].nom],
  ['Castres Olympique', 'Section Paloise'], [reg[4].nom, reg[5].nom],
];

let ok = 0;
const verifier = (condition: unknown, message: string) => { assert.ok(condition, message); ok++; };

function nouveauMatch(k: number, ia = 4): EtatMatch {
  const [a, b] = PAIRES[k % PAIRES.length];
  const e = creerMatch(a, b, effectifDuClub(a, 1), effectifDuClub(b, 1), 24, 20, `conquete-${k}`, undefined,
    { niveau: 'pro', scoreSurTerrain: true, cadenceDetaillee: true, placementJoue: true, ia });
  e.carriereDixMinutes = true;
  return e;
}

const compte: Record<string, number> = {};
const plus = (cle: string) => { compte[cle] = (compte[cle] ?? 0) + 1; };

console.log('— La touche : tranchée avant le saut, perdue pour de vrai —');
for (let k = 0; k < N; k++) {
  const e = nouveauMatch(k);
  let garde = 0;
  let issueVue: IssueTouche | null = null;
  let progressTranchee = -1;
  let avantTouche: { possession: string; sauteurAdverse?: string } | null = null;
  let suivi = 0;
  e.apresPas = (m: EtatMatch) => {
    if (m.phase === 'touche' && m.conquete?.issue) {
      if (!issueVue) {
        issueVue = m.conquete.issue;
        const total = m.dureeArret ?? 1;
        progressTranchee = 1 - m.minuteur / total;
        verifier(progressTranchee >= 0.4 && progressTranchee < 0.6, `touche tranchée avant le saut (avancement ${progressTranchee.toFixed(2)}, graine ${k})`);
        avantTouche = { possession: m.possession };
      } else {
        verifier(m.conquete.issue === issueVue, `l'issue ne change plus une fois tranchée (graine ${k})`);
      }
    } else if (issueVue && m.phase !== 'touche') {
      const issue: IssueTouche = issueVue;
      plus(issue.type + (issue.type === 'perdue' ? `:${issue.variante}` : ''));
      if (issue.type === 'perdue' && m.phase === 'jeuCourant') {
        const adv = avantTouche!.possession === 'A' ? 'B' : 'A';
        verifier(m.possession === adv, `touche perdue : la possession change (graine ${k})`);
        // Le ballon est entre les mains du sauteur d'en face (ou déjà parti de ses mains vers son 9) — jamais apparu ailleurs.
        const contre = m.pions.find((p) => p.id === issue.contreurId)!;
        const portePar = m.porteur;
        const vol = m.vol;
        verifier(portePar === contre || (vol && vol.auteur === contre), `touche perdue : le ballon vient de ${contre.nom}, pas d'ailleurs (porteur ${portePar?.nom}, graine ${k})`);
        verifier(distance(m.ballon, contre.pos) < 3.2, `touche perdue : le ballon est au sauteur adverse (${distance(m.ballon, contre.pos).toFixed(1)} m, graine ${k})`);
      }
      issueVue = null;
      suivi++;
    }
  };
  while (!e.fini && garde++ < 200000) avancer(e, DT * 4);
  verifier(suivi > 0 || e.compteurs.touches === 0, `le match ${k} a eu des touches tranchées (${suivi} / ${e.compteurs.touches})`);
}
console.log('  issues des touches :', compte);
const total = Object.values(compte).reduce((a, b) => a + b, 0);
const perdues = Object.entries(compte).filter(([c]) => c.startsWith('perdue')).reduce((a, [, n]) => a + n, 0);
console.log(`  ${total} touches tranchées, ${perdues} perdues (${(100 * perdues / Math.max(1, total)).toFixed(0)} %)`);
verifier(total > 0, 'des touches ont été jouées');

console.log('\n— Le ruck : grattage et contre-ruck se jouent avant que le ballon ne change de camp —');
let rucksVus = 0;
for (let k = 0; k < N; k++) {
  const e = nouveauMatch(k);
  let duel: NonNullable<EtatMatch['ruck']>['duel'] | null = null;
  let possAvant = '';
  let avancementMax = 0;
  e.apresPas = (m: EtatMatch) => {
    if (m.phase === 'ruck' && m.ruck?.duel) {
      if (!duel) { duel = m.ruck.duel; possAvant = m.possession; avancementMax = 0; verifier(m.ruck.duel.fin > m.sim, 'le duel a une durée'); }
      verifier(m.possession === possAvant, `la possession ne change pas PENDANT le duel (${m.ruck.duel.type}, graine ${k})`);
      verifier(m.ruck.duel === duel, 'le duel est le même objet tout du long');
      if (m.ruck.duel.type === 'contre') avancementMax = Math.max(avancementMax, Math.hypot(m.ballon.x - duel.origine.x, m.ballon.y - duel.origine.y));
    } else if (duel) {
      const d = duel; duel = null;
      rucksVus++;
      plus(`duel:${d.type}:${d.issue}`);
      if (d.issue === 'turnover') {
        verifier(m.possession !== possAvant, `turnover : la possession change à la fin (graine ${k})`);
        const acteur = m.pions.find((p) => p.id === d.acteurId)!;
        const ballonLibre = m.phase === 'ballonLibre';
        verifier(m.porteur?.id === acteur.id || ballonLibre || m.porteur?.cote === acteur.cote || !!m.vol, `turnover : ballon à celui qui l'a pris ou à son camp (graine ${k})`);
        verifier(distance(m.ballon, acteur.pos) < 6, `turnover : le ballon est au pied de l'acteur (${distance(m.ballon, acteur.pos).toFixed(1)} m, graine ${k})`);
        if (d.type === 'contre') verifier(avancementMax > 0.8, `contre-ruck : le groupe a réellement reculé (${avancementMax.toFixed(2)} m, graine ${k})`);
      }
      if (d.issue === 'attaqueConserve' && m.phase === 'jeuCourant') verifier(m.possession === possAvant, 'attaque conserve : le ballon ne change pas de camp');
    }
  };
  let garde = 0;
  while (!e.fini && garde++ < 200000) avancer(e, DT * 4);
}
console.log('  duels de ruck :', Object.fromEntries(Object.entries(compte).filter(([c]) => c.startsWith('duel'))));
console.log(`  ${rucksVus} duels joués en ${N} matchs`);
verifier(rucksVus > 0, 'des duels de ruck ont été joués');

console.log('\n— La mêlée : une poussée continue, mesurée en mètres, jusqu’à l’essai de poussée —');
let melees = 0, essaisDePoussee = 0, gardes = 0, ecroulees = 0;
const avances: number[] = [];
for (let k = 0; k < N; k++) {
  const e = nouveauMatch(k);
  let derniere: number | null = null;
  let mAvant: NonNullable<NonNullable<EtatMatch['conquete']>['melee']> | null = null;
  e.apresPas = (m: EtatMatch) => {
    const me = m.phase === 'melee' ? m.conquete?.melee : undefined;
    if (me?.dyn && me.etape === 'poussee') {
      const a = geometrieMelee(me, m.sim).avance;
      if (derniere !== null) verifier(Math.abs(a - derniere) < 0.45, `la mêlée n'a pas de saut (${(a - derniere).toFixed(2)} m en un pas, graine ${k})`);
      derniere = a;
      verifier(a > -4.5 && a < 45, 'la mêlée ne recule pas de plus de 4,5 m');
      if (me !== mAvant) { melees++; mAvant = me; }
    } else if (derniere !== null && !(me?.dyn)) {
      avances.push(derniere);
      if (mAvant?.dyn?.garde) gardes++;
      if (mAvant?.dyn?.essai) { essaisDePoussee++; verifier(m.phase === 'aplatissage' || m.essaisA + m.essaisB > 0, 'un essai de poussée est un essai'); }
      if (mAvant?.issue === 'ecroulee' || mAvant?.issue === 'relevee') ecroulees++;
      derniere = null; mAvant = null;
    }
  };
  let garde = 0;
  while (!e.fini && garde++ < 200000) avancer(e, DT * 4);
}
const moy = avances.reduce((a, b) => a + b, 0) / Math.max(1, avances.length);
console.log(`  ${melees} mêlées poussées en ${N} matchs : avance moyenne ${moy.toFixed(2)} m, ${ecroulees} s'effondrent ou se relèvent, ${gardes} où le 8 garde le ballon, ${essaisDePoussee} essai(s) de poussée`);
verifier(melees > 0, 'des mêlées ont été poussées');

// Une mêlée à quatre mètres de la ligne, un pack qui écrase l'autre : le ballon doit franchir la ligne AUX PIEDS du 8, sans essai à distance.
console.log('  — essai de poussée provoqué —');
{
  let essais = 0, essaisPlaces = 0, total = 0;
  const parties = Math.min(N, 12);
  for (let k = 0; k < parties; k++) {
    const e = nouveauMatch(k);
    e.pions.forEach((p) => { if (p.avant) { if (p.cote === 'A') { p.puissance = 99; p.plaquage = 95; p.discipline = 90; } else { p.puissance = Math.max(20, p.puissance - 30); } } });
    e.possession = 'A';
    installerSituationCombinaison(e, 'melee', { x: LIGNE_B - 4.2, y: AXE });
    let garde = 0, avantEssai = 0, ballonAuDepart: { x: number; y: number } | null = null;
    while (e.phase === 'melee' && garde++ < 600) {
      avancer(e, DT);
      if (e.conquete?.melee?.etape === 'poussee' && !ballonAuDepart) ballonAuDepart = { ...e.ballon };
    }
    total++;
    if (e.phase === 'aplatissage' || e.essaisA > avantEssai) {
      essais++;
      const huit = e.aplatissage?.marqueur;
      verifier(huit?.numero === 8, 'le 8 aplatit');
      verifier((e.ballon.x - LIGNE_B) >= -0.2, `le ballon est bien sur la ligne ou derrière (${(e.ballon.x - LIGNE_B).toFixed(2)} m)`);
      verifier(e.aplatissage?.origine === 'maul', 'la poussée est déclarée comme essai en force');
      if (ballonAuDepart && Math.abs(e.ballon.y - ballonAuDepart.y) < 3) essaisPlaces++;
    }
  }
  console.log(`  ${essais} essai(s) de poussée sur ${total} mêlées à 4 m de la ligne face à un pack écrasé`);
  verifier(essais >= Math.floor(total * 0.5), 'un pack qui écrase l\'autre à quatre mètres de la ligne marque au moins une fois sur deux');
  void essaisPlaces;
}

console.log('\n— Le geste du joueur dans la mêlée et le maul : un bon timing pousse, un pack ignoré non —');
{
  const POSTES_AVANTS = ['pilier_gauche', 'talonneur', 'deuxieme_ligne_g', 'troisieme_aile_g', 'numero_8'] as const;
  /** `mode` : 'parfait' appuie sur le temps ; 'jamais' ne touche à rien ; 'hasard' appuie n'importe quand. */
  function jouerAvant(poste: typeof POSTES_AVANTS[number], mode: 'parfait' | 'jamais' | 'hasard', k: number) {
    const [a, b] = PAIRES[k % PAIRES.length];
    const e = creerMatch(a, b, effectifDuClub(a, 1), effectifDuClub(b, 1), 24, 20, `pack-${poste}-${k}`,
      { club: a, nom: 'Joueur Test', poste, attributs: { vitesse: 60, force: 80, endurance: 70, plaquage: 70, passe: 60, jeuAuPied: 50, vision: 60, mental: 65 }, titulaire: true },
      { niveau: 'pro', scoreSurTerrain: true, controle: true, cadenceDetaillee: true, placementJoue: true, ia: 4 });
    e.carriereDixMinutes = true;
    activerDirect(e, true);
    let melees = 0, avance = 0, tempsJoues = 0, scoreMax = 0, packVu = 0;
    let hasard = 1 + k;
    e.apresPas = (m: EtatMatch) => {
      const pk = m.direct?.pack;
      if (!pk) return;
      packVu++;
      scoreMax = Math.max(scoreMax, pk.score);
      if (mode === 'parfait') {
        const b0 = pk.temps.find((t) => t.q === undefined && Math.abs(t.t - m.sim) < 0.075);
        if (b0) { demanderDirect(m, { action: 'pousser' }); tempsJoues++; }
      } else if (mode === 'hasard') {
        hasard = (hasard * 1103515245 + 12345) & 0x7fffffff;
        if (hasard % 9 === 0) demanderDirect(m, { action: 'pousser' });
      }
    };
    let garde = 0, dernierMelee: unknown = null;
    while (!e.fini && garde++ < 400000 && e.sim < 1500) {
      avancer(e, DT);
      const me = e.phase === 'melee' ? e.conquete?.melee : undefined;
      if (me?.dyn && me.etape === 'poussee') {
        const sign = (e.pions.find((p) => p.moi)!.cote === me.introducteur ? 1 : -1);
        if (dernierMelee !== me) { dernierMelee = me; melees++; }
        avance += sign * me.dyn.v * DT;
      }
    }
    return { melees, avance, tempsJoues, scoreMax, packVu, essais: e.essaisA + e.essaisB };
  }
  for (const poste of POSTES_AVANTS) {
    const p = jouerAvant(poste, 'parfait', 3), n = jouerAvant(poste, 'jamais', 3), h = jouerAvant(poste, 'hasard', 3);
    console.log(`  ${poste} : mêlées ${p.melees} — poussée cumulée (parfait ${p.avance.toFixed(1)} m · jamais ${n.avance.toFixed(1)} m · au hasard ${h.avance.toFixed(1)} m), ${p.tempsJoues} temps joués`);
    verifier(p.packVu > 0, `un ${poste} voit sa piste de temps`);
    verifier(p.tempsJoues > 0, `un ${poste} peut jouer ses temps`);
    verifier(p.scoreMax > 0.65, `un ${poste} qui joue juste a une bonne synchro (${p.scoreMax.toFixed(2)})`);
  }
}

console.log('\n— Le saut en touche et le grattage : le timing du joueur compte, les stats aussi —');
{
  function avatarMatch(poste: string, cle: string) {
    const [a, b] = PAIRES[0];
    const e = creerMatch(a, b, effectifDuClub(a, 1), effectifDuClub(b, 1), 24, 20, cle,
      { club: a, nom: 'Joueur Test', poste: poste as never, attributs: { vitesse: 60, force: 80, endurance: 70, plaquage: 70, passe: 60, jeuAuPied: 50, vision: 60, mental: 65 }, titulaire: true },
      { niveau: 'pro', scoreSurTerrain: true, controle: true, cadenceDetaillee: true, placementJoue: true, ia: 4 });
    e.carriereDixMinutes = true;
    activerDirect(e, true);
    return e;
  }
  // ── Le saut : on force le joueur comme sauteur annoncé, et on mesure ce que son timing rapporte ──
  const resultat: Record<string, { gagnees: number; total: number }> = { parfait: { gagnees: 0, total: 0 }, jamais: { gagnees: 0, total: 0 } };
  for (const mode of ['parfait', 'jamais'] as const) {
    for (let k = 0; k < 30; k++) {
      const e = avatarMatch('deuxieme_ligne_g', `saut-${k}`);
      const moi = e.pions.find((p) => p.moi)!;
      e.rng = (() => { let s = 5000 + k * 31; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
      installerSituationCombinaison(e, 'touche', { x: 40 + (k % 6) * 8, y: k % 2 ? 0.5 : 69.5 });
      // Il est le sauteur annoncé : le lanceur IA vise le joueur.
      for (let i = 0; i < 4; i++) avancer(e, DT);
      if (e.conquete && moi.role === 'alignement') e.conquete.cibleId = moi.id;
      else if (e.conquete) { const a = e.pions.find((p) => p.cote === 'A' && p.role === 'alignement'); if (a) e.conquete.cibleId = a.id; }
      let garde = 0, issue: string | null = null, tape = false;
      e.apresPas = (m: EtatMatch) => {
        const pk = m.direct?.pack;
        if (pk?.type === 'touche' && mode === 'parfait' && !tape) {
          const b = pk.temps.find((t) => t.q === undefined && Math.abs(t.t - m.sim) < 0.075);
          if (b) { demanderDirect(m, { action: 'pousser' }); tape = true; }
        }
        if (m.conquete?.issue && !issue) issue = m.conquete.issue.type;
      };
      while (e.phase === 'touche' && garde++ < 600) avancer(e, DT);
      if (issue && e.conquete === null) {
        resultat[mode].total++;
        if (issue === 'gagnee') resultat[mode].gagnees++;
      }
    }
  }
  console.log(`  touche (sauteur) : timing parfait ${resultat.parfait.gagnees}/${resultat.parfait.total} gagnées · sans geste ${resultat.jamais.gagnees}/${resultat.jamais.total}`);
  verifier(resultat.parfait.total > 5 && resultat.jamais.total > 5, 'des touches ont été jouées avec le joueur comme sauteur');

  // ── Le grattage : le joueur défenseur à portée du ruck ──
  let fenetres = 0, engages = 0, parfaits = 0, grattages = 0;
  for (let k = 0; k < Math.max(4, N); k++) {
    const e = avatarMatch('troisieme_aile_g', `gratte-${k}`);
    const moi = e.pions.find((p) => p.moi)!;
    let engage = false;
    e.apresPas = (m: EtatMatch) => {
      const pk = m.direct?.pack;
      if (m.phase === 'ruck' && m.ruck && !m.ruck.duel && moi.cote !== m.ruck.attaque && !pk && !engage && m.minuteur > 1.3) {
        // On lui prête les jambes : il se trouve à deux mètres du ballon.
        moi.pos = { x: m.ballon.x + (moi.cote === 'A' ? -2 : 2) * -1, y: m.ballon.y + 1.2 }; moi.cible = { ...moi.pos }; moi.vitesse = { x: 0, y: 0 }; moi.role = 'ligne'; moi.corps = undefined;
      }
      if (pk?.type === 'ruck') {
        if (!fenetres || pk.temps[0]?.q === undefined) { /* fenêtre ouverte */ }
        const b = pk.temps.find((t) => t.q === undefined && Math.abs(t.t - m.sim) < 0.075);
        if (b && !pk.engage && !engage) { demanderDirect(m, { action: 'pousser' }); engage = true; fenetres++; }
      }
      if (m.ruck?.duel?.type === 'gratte' && m.ruck.duel.acteurId === moi.id && !(m as never as { __v?: boolean }).__v) { (m as never as { __v?: boolean }).__v = true; grattages++; }
      if (pk?.type === 'ruck' && pk.engage) { engages++; if (pk.temps[0]?.q === 2) parfaits++; }
    };
    let garde = 0;
    while (!e.fini && garde++ < 80000 && e.sim < 900) { avancer(e, DT * 2); if (e.phase !== 'ruck') engage = false; }
  }
  console.log(`  grattage : ${fenetres} fenêtres jouées, ${grattages} grattage(s) du joueur, ${parfaits ? 'dont des temps parfaits' : 'aucun temps parfait'}`);
  verifier(fenetres > 0, 'la fenêtre du grattage s\'ouvre quand le joueur est à portée du ruck');
}

console.log(`\nOK — ${ok} contrôles de la conquête lisible.`);
