// BANC DES RÈGLEMENTS DE COMPÉTITION (Correctif 29)
//
// Un seul règlement par compétition (`src/lib/competitionRules.ts`), lu par la simulation, le classement, le tableau,
// le calendrier, l'écran et la saison suivante. Ce banc tient :
//   1. Fédérale : les deux derniers descendent directement, aucun match d'accès ; les divisions gardent leur taille ;
//   2. Top 14 : le dernier descend, l'avant-dernier joue le match d'accès — les deux statuts sont distincts ;
//   3. les statuts du classement suivent le règlement, quelle que soit la taille (12, 14, 16 clubs) ;
//   4. Champions Cup : quatre qualifiés par poule, le cinquième reversé en Challenge Cup, son huitième à l'extérieur ;
//   5. essai après la sirène : la transformation est tentée avant la mi-temps et avant le coup de sifflet final ;
//   6. match couperet : jamais de nul — prolongation jouée par le même état (fatigue conservée), puis la procédure
//      de la compétition ; un match de championnat, lui, peut finir à égalité.
//
//   npm run verify:reglements

import { strict as assert } from 'node:assert';
import { CALENDRIER } from '../src/data/calendrier';
import {
  matchRules, onlineRules, poolStatuses, rulesFor, standingsStatuses, zones,
} from '../src/lib/competitionRules';
import { effacerResultatsJoues, enregistrerResultatJoue, poulesDe } from '../src/lib/championnat';
import { clubsDeDivision } from '../src/lib/divisions';
import { duel, phaseFinale } from '../src/lib/phaseFinale';
import { oublierResultats, resoudrePyramide, resoudreSaisonClub, resoudreToutesDivisions, type MouvementClub } from '../src/lib/promotion';
import { coupeEnDirect, coupesDuClub, coupesDuClubALaDate } from '../src/lib/coupe';
import { afficheDuClub } from '../src/lib/matchLive';
import { departageDuMatch, departager, inscrireIssueJouee } from '../src/lib/couperet';
import { effectifDuClub } from '../src/lib/effectif';
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { IA_MATCH_DE_CARRIERE } from '../src/lib/moteur/passerelle3D';

let controles = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); controles++; };
const egal = <T>(a: T, b: T, message: string) => { assert.deepEqual(a, b, message); controles++; };
const SAISON = 1;

const equilibre = (mouvements: MouvementClub[]) => {
  const solde = new Map<string, number>();
  for (const m of mouvements) {
    solde.set(m.de, (solde.get(m.de) ?? 0) - 1);
    solde.set(m.vers, (solde.get(m.vers) ?? 0) + 1);
  }
  return [...solde.entries()].filter(([, v]) => v !== 0);
};

// ── 1. Fédérale : deux relégués directs, aucun match d'accès ───────────────────────────────────────────────────
effacerResultatsJoues(); oublierResultats();
for (const division of ['fed1', 'fed2', 'fed3']) {
  const regles = rulesFor(division);
  egal(regles.standings.directRelegation, 2, `${division} : le règlement relègue deux clubs`);
  egal(regles.standings.accessMatchPositions, [], `${division} : le règlement ne prévoit aucun match d'accès`);
  const club = poulesDe(division)[0][0];
  const phase = phaseFinale(division, SAISON, club);
  const n = phase.classement.length;
  egal(phase.relegues.length, zones(regles, n).directRelegation, `${division} : la poule de ${n} clubs relègue ce que dit le règlement`);
  if (n >= 8) {
    egal(phase.relegues, [phase.classement[n - 1].club, phase.classement[n - 2].club], `${division} : ce sont le dernier et l'avant-dernier`);
  }
  egal(phase.barragistes, [], `${division} : personne ne joue de match d'accès`);
  const statuts = standingsStatuses(regles, n, poulesDe(division).length);
  egal(statuts.filter((s) => s === 'ACCESS_MATCH').length, 0, `${division} : aucune place orange au classement`);
  egal(statuts.slice(-phase.relegues.length).every((s) => s === 'DIRECT_RELEGATION'), true, `${division} : les relégués sont en rouge`);

  const py = resoudrePyramide(division, SAISON, club);
  const descendants = py.mouvements.filter((m) => m.de === division && m.sens === 'descente');
  if (division !== 'fed3' || descendants.length) {
    egal(descendants.map((m) => m.club).sort(), [...phase.relegues].sort(), `${division} : les deux relégués descendent sans jouer`);
  }
  ok(descendants.every((m) => m.motif === 'dernier'), `${division} : aucune descente par match d'accès`);
  egal(py.accesDepuisLeBas, null, `${division} : pas de match d'accès pour garder sa place`);
  egal(equilibre(py.mouvements), [], `${division} : autant de montées que de descentes à chaque frontière`);
  egal(equilibre(resoudreSaisonClub(division, SAISON, club).mouvements), [], `${division} : la saison complète garde la taille de chaque division`);
}
// L'étage au-dessus d'une Fédérale : en Fédérale 2, monter en Fédérale 1 ne passe par aucun match d'accès non plus.
egal(resoudrePyramide('fed2', SAISON, poulesDe('fed2')[0][0]).accesVersLeHaut, null, 'fed2 → fed1 : pas de match d\'accès vers le haut');
egal(equilibre(resoudreToutesDivisions(SAISON).mouvements), [], 'toute la pyramide : chaque division garde sa taille');
{
  const fed1 = resoudreToutesDivisions(SAISON).mouvements.filter((m) => m.de === 'fed1' && m.sens === 'descente');
  const places = Math.min(poulesDe('fed1').length, poulesDe('fed2').length) * 2;
  egal(fed1.length, places, `fed1 : ${places} descentes sur l'ensemble des poules (deux par poule échangée)`);
}

// ── 2. Top 14 : relégation directe ET match d'accès, deux statuts distincts ────────────────────────────────────
{
  const club = clubsDeDivision('top14')[0];
  const phase = phaseFinale('top14', SAISON, club);
  const n = phase.classement.length;
  egal(phase.relegues, [phase.classement[n - 1].club], 'top14 : seul le dernier descend directement');
  egal(phase.barragistes, [phase.classement[n - 2].club], 'top14 : l\'avant-dernier joue le match d\'accès');
  const statuts = standingsStatuses(rulesFor('top14'), n);
  egal(statuts[n - 1], 'DIRECT_RELEGATION', 'top14 : dernier en rouge');
  egal(statuts[n - 2], 'ACCESS_MATCH', 'top14 : avant-dernier en orange');
  egal(statuts.slice(0, 6), ['QUALIFIED', 'QUALIFIED', 'PLAYOFF', 'PLAYOFF', 'PLAYOFF', 'PLAYOFF'], 'top14 : deux qualifiés directs, quatre barragistes');
  egal(statuts[6], 'SAFE', 'top14 : le septième est tranquille');
  const py = resoudrePyramide('top14', SAISON, club);
  ok(py.accesDepuisLeBas && py.accesDepuisLeBas.domicile === phase.barragistes[0], 'top14 : le match d\'accès oppose l\'avant-dernier au prétendant de Pro D2');
  egal(equilibre(py.mouvements), [], 'top14 : mouvements équilibrés');
}

// ── 3. Les statuts suivent le règlement, pas une position écrite dans l'écran ──────────────────────────────────
for (const taille of [10, 12, 14, 16]) {
  const fed = standingsStatuses(rulesFor('fed1'), taille);
  egal([fed[taille - 1], fed[taille - 2], fed[taille - 3]], ['DIRECT_RELEGATION', 'DIRECT_RELEGATION', 'SAFE'], `Fédérale à ${taille} clubs : les deux dernières places, quelles qu'elles soient`);
  const pro = standingsStatuses(rulesFor('prod2'), taille);
  egal([pro[taille - 1], pro[taille - 2]], ['DIRECT_RELEGATION', 'ACCESS_MATCH'], `Pro D2 à ${taille} clubs : relégation puis match d'accès`);
}
egal(standingsStatuses(rulesFor('reg3'), 12).includes('DIRECT_RELEGATION'), false, 'reg3 : le dernier étage ne relègue personne');
egal(standingsStatuses(rulesFor('urc'), 16).some((s) => s === 'DIRECT_RELEGATION' || s === 'ACCESS_MATCH'), false, 'une ligue fermée n\'a ni relégation ni barrage');
{
  const publique = standingsStatuses(onlineRules({ publique: { division: 2 }, playoffs: false }), 16);
  egal([publique[0], publique[14], publique[15]], ['PROMOTION', 'ACCESS_MATCH', 'DIRECT_RELEGATION'], 'division publique 2 : montée, barrage, relégation');
  egal(standingsStatuses(onlineRules({ publique: { division: 1 }, playoffs: false }), 16)[0], 'SAFE', 'division publique 1 : personne ne monte plus haut');
  const privee = standingsStatuses(onlineRules({ playoffs: true }), 6);
  egal(privee, ['PLAYOFF', 'PLAYOFF', 'PLAYOFF', 'PLAYOFF', 'SAFE', 'SAFE'], 'ligue privée à six avec phase finale : quatre qualifiés, aucune relégation');
}

// ── 4. Champions Cup : quatre qualifiés, le cinquième reversé, huitième à l'extérieur ──────────────────────────
{
  egal(rulesFor('championsCup').poolQualification, {
    qualified: [1, 2, 3, 4], transferred: { positions: [5], to: 'challengeCup', origin: 'CHAMPIONS_CUP_5TH' },
  }, 'Champions Cup : le règlement de poule');
  egal(poolStatuses(rulesFor('championsCup'), 6), ['QUALIFIED', 'QUALIFIED', 'QUALIFIED', 'QUALIFIED', 'CHALLENGE_CUP', 'ELIMINATED'], 'Champions Cup : statuts d\'une poule de six');
  const dates = CALENDRIER.filter((s) => s.type === 'coupe').length;
  const champions = coupeEnDirect('championsCup', SAISON, '', dates)!;
  const challenge = coupeEnDirect('challengeCup', SAISON, '', dates)!;
  const cinquiemes = champions.poules.map((p) => p.classement[4].club);
  egal([...champions.transferes!.clubs].sort(), [...cinquiemes].sort(), 'Champions Cup : les quatre cinquièmes sont reversés');
  egal(champions.transferes!.vers, 'challengeCup', 'Champions Cup : vers la Challenge Cup');
  const huitiemesCh = champions.bracket.filter((m) => m.tour === 'barrage');
  egal(huitiemesCh.length, 8, 'Champions Cup : huit huitièmes de finale');
  const seize = new Set(huitiemesCh.flatMap((m) => [m.domicile, m.exterieur]));
  ok(champions.poules.every((p) => p.classement.slice(0, 4).every((l) => seize.has(l.club))), 'Champions Cup : les quatre premiers de chaque poule sont en huitièmes');
  ok(cinquiemes.every((c) => !seize.has(c)), 'Champions Cup : aucun cinquième ne reste dans le tableau');
  ok(champions.poules.every((p) => !seize.has(p.classement[5].club)), 'Champions Cup : les sixièmes sont éliminés');

  const huitiemes = challenge.bracket.filter((m) => m.tour === 'barrage');
  egal(huitiemes.length, 8, 'Challenge Cup : huit huitièmes de finale');
  for (const club of cinquiemes) {
    const m = huitiemes.find((x) => x.domicile === club || x.exterieur === club);
    ok(m, `${club} (5ᵉ de Champions Cup) dispute un huitième de Challenge Cup`);
    egal(m!.exterieur, club, `${club} joue son huitième à l'extérieur`);
    egal(challenge.qualifiedFrom[club], 'CHAMPIONS_CUP_5TH', `${club} : origine conservée (qualified_from)`);
    egal(m!.qualifiedFrom?.[club], 'CHAMPIONS_CUP_5TH', `${club} : l'origine est portée par le match du tableau`);
    egal(challenge.qualifiedFrom[m!.domicile], 'POOL', `${club} se déplace chez un qualifié de poule`);
    ok(!coupesDuClub(club, SAISON).includes('challengeCup'), `${club} n'était pas engagé en Challenge Cup au départ`);
    ok(!coupesDuClubALaDate(club, SAISON, 3).includes('challengeCup'), `${club} : pas de reversement avant la fin des poules`);
    ok(coupesDuClubALaDate(club, SAISON, 5).includes('challengeCup'), `${club} : reversé une fois les poules finies`);
  }
  // Le calendrier d'un cinquième : la première date à élimination directe lui donne son huitième de Challenge Cup.
  // (un club sans coupe nationale la même semaine : la Premiership Rugby Cup a ses propres dates)
  const club = cinquiemes.find((c) => coupesDuClub(c, SAISON).length === 1) ?? cinquiemes[0];
  const semaineHuitieme = CALENDRIER.filter((s) => s.type === 'coupe')[4].numero;
  const affiche = afficheDuClub({ division: 'top14', club, saison: SAISON, semaine: semaineHuitieme, resultats: {} });
  // (la division passée ne sert qu'à écarter les étages amateurs)
  ok(affiche && affiche.cle.startsWith('coupe#challengeCup#'), `${club} : son affiche de la semaine est un huitième de Challenge Cup`);
  egal(affiche!.match.exterieur, club, `${club} : et il s'y déplace`);
}

// ── 5. Essai après la sirène : la transformation avant tout coup de sifflet ────────────────────────────────────
{
  let apresSirene = 0;
  let transformes = 0;
  let periodesCloses = 0;
  const top = clubsDeDivision('top14');
  for (let n = 0; n < 40; n++) {
    const [a, b] = [top[n % top.length], top[(n + 5) % top.length]];
    // Le match de carrière en trois dimensions : dix minutes, cadence détaillée, IA de carrière — là où le bug vivait.
    const e = creerMatch(a, b, effectifDuClub(a, SAISON), effectifDuClub(b, SAISON), 20, 20, `sirene#${n}`, undefined,
      { cadenceDetaillee: true, placementJoue: true, ia: IA_MATCH_DE_CARRIERE });
    e.carriereDixMinutes = true;
    let essais = 0;
    let du = false;       // un essai vient d'être marqué temps expiré, sa transformation n'est pas encore partie
    let periode = e.periode;
    let garde = 0;
    while (!e.fini && garde++ < 60000) {
      avancer(e, 0.15);
      const total = e.essaisA + e.essaisB;
      if (total > essais) { essais = total; if (e.sirene) { apresSirene++; du = true; } }
      if (du && e.phase === 'transformation' && e.tir?.volLance) { du = false; transformes++; }
      if (e.periode !== periode || e.fini) {
        periodesCloses++;
        ok(!du, `match ${n} : la période ${periode} ne se termine pas avant la transformation d'un essai marqué après la sirène`);
        ok(!e.transformationDue, `match ${n} : aucune transformation en attente au coup de sifflet`);
        periode = e.periode; du = false;
      }
    }
    ok(e.fini, `match ${n} : le match se termine`);
  }
  ok(apresSirene > 0, `le cas s'est produit : ${apresSirene} essai(s) après la sirène sur 40 matchs, ${transformes} transformation(s) tentée(s), ${periodesCloses} périodes closes`);
  egal(transformes, apresSirene, 'chaque essai marqué temps expiré a vu sa transformation tentée');
}

// ── 6. Match couperet : jamais de nul ──────────────────────────────────────────────────────────────────────────
{
  egal(matchRules('top14#1#3#A#B'), { allowDraw: true }, 'journée de championnat : le nul est permis');
  egal(matchRules('championsCup#1#0#2#A#B'), { allowDraw: true }, 'journée de poule de coupe : le nul est permis');
  for (const cle of ['phase#top14#1#demie#A#B', 'coupe#championsCup#1#quart#A#B', 'acces#top14#prod2#1#A#B', 'tournoi#fed1#1#8#A#B']) {
    egal((matchRules(cle) as { allowDraw: boolean }).allowDraw, false, `${cle.split('#').slice(0, 2).join('#')} : un vainqueur est obligatoire`);
    ok(departageDuMatch(cle), `${cle.split('#')[0]} : le moteur reçoit la procédure de départage`);
  }
  egal(departageDuMatch('top14#1#3#A#B'), undefined, 'championnat : aucune prolongation prévue');
  egal(departageDuMatch('coupe#championsCup#1#quart#A#B'), { periodes: 2, minutes: 10, criteres: ['essais', 'tirsAuBut'] }, 'coupe d\'Europe : 2 × 10 minutes, puis essais, puis tirs au but');

  const top = clubsDeDivision('top14');
  const jouer = (n: number, couperet: boolean) => {
    const [a, b] = [top[n % top.length], top[(n + 3) % top.length]];
    const cle = `${couperet ? 'coupe#championsCup' : 'top14'}#${SAISON}#quart#${a}#${b}#${n}`;
    const e = creerMatch(a, b, effectifDuClub(a, SAISON), effectifDuClub(b, SAISON), 20, 20, cle, undefined,
      couperet ? { departage: departageDuMatch(cle) } : {});
    // On mène le match à la 78e minute, puis on remet les deux équipes à égalité : la sirène tombera sur un nul.
    let garde = 0;
    while (!e.fini && e.t < 78 * 60 && garde++ < 8000) avancer(e, 4);
    e.scoreA = e.scoreB = Math.max(e.scoreA, e.scoreB);
    const enduranceA80 = e.pions.filter((p) => p.surLeTerrain).reduce((s, p) => s + p.endurance, 0);
    const minutesA80 = Math.max(...e.pions.map((p) => p.minutes));
    const remplacements80 = e.pions.filter((p) => p.remplace).length;
    const periodes = new Set<number>([e.periode]);
    let enduranceDebutProlongation: number | null = null;
    while (!e.fini && garde++ < 20000) {
      avancer(e, 2);
      if (!periodes.has(e.periode) && e.periode === 3) enduranceDebutProlongation = e.pions.filter((p) => p.surLeTerrain).reduce((s, p) => s + p.endurance, 0);
      periodes.add(e.periode);
    }
    return { e, cle, periodes, enduranceA80, enduranceDebutProlongation, minutesA80, remplacements80 };
  };

  let prolongations = 0, tirs = 0, auxEssais = 0, enProlongation = 0;
  for (let n = 0; n < 36; n++) {
    const { e, cle, periodes, enduranceA80, enduranceDebutProlongation, minutesA80, remplacements80 } = jouer(n, true);
    ok(e.fini, `couperet ${n} : le match se termine`);
    if (!e.prolongation) { ok(e.scoreA !== e.scoreB, `couperet ${n} : sans prolongation, il y a un vainqueur au score`); continue; }
    prolongations++;
    ok(periodes.has(3) && periodes.has(4), `couperet ${n} : les deux périodes de prolongation sont jouées`);
    ok(e.t >= 4800 + 1200, `couperet ${n} : vingt minutes de plus au chronomètre (${Math.round(e.t / 60)} min)`);
    ok(e.issue, `couperet ${n} : une issue est inscrite`);
    ok(e.scoreA !== e.scoreB || e.issue!.critere !== 'prolongation', `couperet ${n} : à égalité, c'est la procédure qui désigne le vainqueur`);
    // Ce n'est pas un nouveau match : la fatigue de la 80e est encore là, les remplacés ne reviennent pas.
    ok(enduranceDebutProlongation !== null && enduranceDebutProlongation <= enduranceA80 * 1.05 + 1, `couperet ${n} : la fatigue est conservée à la reprise`);
    ok(Math.max(...e.pions.map((p) => p.minutes)) >= minutesA80, `couperet ${n} : le temps de jeu continue de s'accumuler`);
    ok(e.pions.filter((p) => p.remplace).length >= remplacements80 && e.pions.filter((p) => p.remplace).every((p) => !p.surLeTerrain), `couperet ${n} : les remplacés restent remplacés`);
    if (e.issue!.critere === 'tirsAuBut') { tirs++; ok(e.issue!.tirs && e.issue!.tirs[0] !== e.issue!.tirs[1], `couperet ${n} : la séance de tirs au but a un vainqueur`); }
    if (e.issue!.critere === 'essais') { auxEssais++; ok(e.essaisA !== e.essaisB, `couperet ${n} : départagé au nombre d'essais`); }
    if (e.issue!.critere === 'prolongation') enProlongation++;

    // Le store et le tableau lisent la même issue : le vainqueur du terrain avance, même à score égal.
    const vainqueur = e.issue!.vainqueur === 'A' ? e.clubA : e.clubB;
    inscrireIssueJouee(cle, { vainqueur, critere: e.issue!.critere, ...(e.issue!.tirs ? { tirs: e.issue!.tirs } : {}) });
    const tranche = departager(cle, e.scoreA, e.scoreB);
    ok(tranche.prolongation && tranche.issue?.vainqueur === vainqueur, `couperet ${n} : le départage rend l'issue jouée`);
    egal([tranche.scorePour, tranche.scoreContre], [e.scoreA, e.scoreB], `couperet ${n} : aucun point inventé après une prolongation jouée`);
    enregistrerResultatJoue(cle, {
      domicile: e.clubA, exterieur: e.clubB, scoreD: e.scoreA, scoreE: e.scoreB, essaisD: e.essaisA, essaisE: e.essaisB,
      prolongation: true, ...(e.scoreA === e.scoreB ? { vainqueurDesigne: e.issue!.vainqueur === 'A' ? 'D' as const : 'E' as const } : {}),
    });
    const m = duel(e.clubA, e.clubB, SAISON, cle, 'quart', 'banc');
    egal(m.vainqueur, vainqueur, `couperet ${n} : le tableau fait avancer le vainqueur du terrain`);
    egal([m.scoreD, m.scoreE], [e.scoreA, e.scoreB], `couperet ${n} : le tableau garde le score joué`);
    inscrireIssueJouee(cle, null);
  }
  ok(prolongations >= 12, `la prolongation s'est jouée ${prolongations} fois sur 36 (${enProlongation} tranchées au score, ${auxEssais} aux essais, ${tirs} aux tirs au but)`);
  ok(auxEssais + tirs > 0, 'la procédure d\'après prolongation a servi au moins une fois');

  // Le même match en championnat : la sirène sur un nul reste un nul.
  let nuls = 0;
  for (let n = 0; n < 12; n++) {
    const { e } = jouer(n, false);
    ok(!e.prolongation && !e.issue && e.periode === 2, `championnat ${n} : pas de prolongation`);
    if (e.scoreA === e.scoreB) nuls++;
  }
  ok(nuls > 0, `championnat : ${nuls} match(s) nul(s) sur 12, comme le règlement le permet`);

  // Un match couperet non joué (résultat automatique) garde son départage abstrait : jamais de nul non plus.
  const abstrait = departager('phase#top14#1#demie#A#B', 17, 17);
  ok(abstrait.prolongation && abstrait.scorePour !== abstrait.scoreContre, 'résultat automatique : le nul couperet est départagé');
}

effacerResultatsJoues(); oublierResultats();
console.log(`✅ Règlements de compétition : ${controles} contrôles passés.`);
