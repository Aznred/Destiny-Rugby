// BANC — LA MONTÉE NE DÉPEND PLUS D'UN CHAMPION UNIQUE (Correctif 39)
//
// Signalé en jeu : « plusieurs groupes/régions participent à la compétition, mais finalement un seul club obtient la
// montée, comme si toute la pyramide dépendait du champion unique du tableau final ».
//
// Ce que ce banc tient :
//   1. chaque division déclare ses quatre blocs (qualification aux finales, montée, relégation, tableau) ;
//   2. les places de poule restent acquises hors Nationale 2 et Fédérales 1/2, dont les qualifications sportives décident ;
//   3. ce qu'un étage promeut, celui du dessus le relègue : aucune division ne change de taille, sur trois saisons ;
//   4. les Régionales s'échangent par LIGUE : autant de descentes que de montées dans chaque ligue régionale ;
//   5. les phases finales donnent les montées de Nationale 2 et Fédérales 1/2, mais pas celles des Régionales ;
//   6. vu d'un club (carrière d'entraîneur), TOUTE sa division bouge, pas seulement sa poule ;
//   7. le classement affiché dit vrai : ce qui est « montée » monte, ce qui est « relégation » descend.
//
//   npm run verify:montees        (~1 min)

import { strict as assert } from 'node:assert';
import { COMPETITIONS } from '../src/data/clubs';
import { poulesDe, effacerResultatsJoues } from '../src/lib/championnat';
import { placesAccessionParTableau, rulesFor } from '../src/lib/competitionRules';
import { qualifiesPourAccession } from '../src/lib/accessionFederale';
import {
  ligueDeLaPoule, nomDivision, oublierResultats, placesDeLaPoule, resoudreSaisonClub, resoudreToutesDivisions,
  setContexteJoueur, statutsDeLaPoule, type MouvementClub,
} from '../src/lib/promotion';
import { clubsDeDivision, setArriveesClubs, setMouvementsClubs } from '../src/lib/divisions';
import { tournoiDeFinDAnnee } from '../src/lib/tournoi';
import { jouerAutresPhasesFinales } from '../src/lib/phasesFinalesJouees';
import { SEMAINES_PAR_SAISON } from '../src/data/calendrier';

let controles = 0;
const ok = (condition: unknown, quoi: string) => { controles++; assert.ok(condition, quoi); };
const egal = <T,>(recu: T, attendu: T, quoi: string) => { controles++; assert.deepEqual(recu, attendu, quoi); };
const debut = Date.now();
const chrono = () => `${((Date.now() - debut) / 1000).toFixed(0)} s`;

const PYRAMIDE = ['top14', 'prod2', 'nationale', 'nationale2', 'fed1', 'fed2', 'fed3', 'reg1', 'reg2', 'reg3'];
const A_POULES = PYRAMIDE.filter((id) => poulesDe(id).length > 1);
const frontiere = (mouvements: MouvementClub[], haut: string, bas: string) => ({
  montees: mouvements.filter((m) => m.de === bas && m.vers === haut && m.sens === 'montee'),
  descentes: mouvements.filter((m) => m.de === haut && m.vers === bas && m.sens === 'descente'),
});

setMouvementsClubs({}); setArriveesClubs({}); effacerResultatsJoues(); setContexteJoueur('', 0); oublierResultats();

// ═══ 1. Le règlement : titre et montée sont deux règles ══════════════════════════════════════════════════
for (const id of PYRAMIDE) {
  const r = rulesFor(id);
  ok(r.qualificationToFinals && r.promotionRules && r.relegationRules && r.championshipBracket, `${id} : les quatre blocs sont déclarés`);
  egal(r.relegationRules.directPerPool, r.standings.directRelegation, `${id} : les descentes n'ont qu'une saisie`);
}
egal(A_POULES, ['nationale2', 'fed1', 'fed2', 'fed3', 'reg1', 'reg2', 'reg3'], 'sept divisions sont découpées en poules');
for (const id of A_POULES) {
  ok(rulesFor(id).promotionRules.promotionSlots >= 1 || placesAccessionParTableau(rulesFor(id)) > 0, `${id} : l'accession est déclarée par poule ou par tour`);
  ok(rulesFor(id).championshipBracket.promotionImpact !== 'decides', `${id} : le tableau final ne donne pas la montée`);
}
egal(rulesFor('reg2').promotionRules.territory, 'ligue', 'Régionale 2 : les places se comptent par ligue régionale');
egal(rulesFor('reg3').promotionRules.territory, 'ligue', 'Régionale 3 : les places se comptent par ligue régionale');
egal(rulesFor('prod2').championshipBracket.promotionImpact, 'decides', 'Pro D2 (poule unique) : le champion monte, comme avant');
egal(rulesFor('top14').promotionRules.promotionSlots, 0, 'Top 14 : personne ne monte plus haut');

// ═══ 2 à 4. Une saison entière : chaque poule envoie son premier, les étages se répondent, par ligue en Régionale ══
const tailles = new Map(COMPETITIONS.map((c) => [c.id, clubsDeDivision(c.id).length]));
// Les poules de chaque ligue régionale : c'est ce que l'échange par territoire doit conserver d'une saison à l'autre.
const poulesParLigue = (id: string) => {
  const compte = new Map<string, number>();
  for (const poule of poulesDe(id)) compte.set(ligueDeLaPoule(poule), (compte.get(ligueDeLaPoule(poule)) ?? 0) + 1);
  return Object.fromEntries([...compte].sort());
};
const liguesAuDepart = { reg2: poulesParLigue('reg2'), reg3: poulesParLigue('reg3') };

function verifierUneSaison(saison: number) {
  jouerAutresPhasesFinales(saison, SEMAINES_PAR_SAISON, '');
  const bilan = resoudreToutesDivisions(saison);
  egal(bilan.incidents, [], `saison ${saison} : toutes les frontières se résolvent`);
  for (let i = 0; i < PYRAMIDE.length - 1; i++) {
    const haut = PYRAMIDE[i], bas = PYRAMIDE[i + 1];
    const { montees, descentes } = frontiere(bilan.mouvements, haut, bas);
    egal(montees.length, descentes.length, `S${saison} ${bas} → ${haut} : autant de montées que de descentes`);
    ok(montees.length >= 1, `S${saison} ${bas} → ${haut} : quelqu'un monte`);
    if (!A_POULES.includes(bas)) continue;
    const poules = poulesDe(bas);
    ok(montees.length >= poules.length - (rulesFor(bas).promotionRules.territory === 'ligue' ? 1 : 0),
      `S${saison} ${bas} : ${montees.length} montées pour ${poules.length} poules — plus jamais un seul club`);
    const tournoi = tournoiDeFinDAnnee(bas, saison, nomDivision(bas))!;
    const promus = new Set(montees.map((m) => m.club));
    const parTableau = placesAccessionParTableau(rulesFor(bas));
    if (parTableau) egal(promus, new Set(qualifiesPourAccession(rulesFor(bas), tournoi.matchs)), `${bas} : exactement les clubs ayant atteint le tour d'accession`);
    const premiers = tournoi.poules.map((p) => p.classement[0].club);
    // ── Le classement affiché dit vrai ────────────────────────────────────
    tournoi.poules.forEach((p, n) => {
      const places = placesDeLaPoule(bas, n);
      const statuts = statutsDeLaPoule(bas, n, p.classement.length);
      egal(statuts.filter((s) => s === 'PROMOTION' || s === 'PROMOTION_FINALS').length, places.promotion, `S${saison} ${bas} poule ${n + 1} : autant de places « montée » affichées que de places sûres`);
      p.classement.forEach((l, r) => {
        if (parTableau) return; // Le classement ne promet aucune montée en Nationale 2 et Fédérales 1 et 2.
        if (r < places.promotion) ok(promus.has(l.club), `S${saison} ${bas} poule ${n + 1} : ${l.club}, place de montée, monte`);
        else if (r >= places.promotion + places.promotionPossible) ok(!promus.has(l.club), `S${saison} ${bas} poule ${n + 1} : ${l.club} (${r + 1}e) ne monte pas`);
      });
    });
    const sansPlace = premiers.filter((c) => !promus.has(c));
    if (!parTableau) egal(sansPlace, [], `S${saison} ${bas} : le premier de chaque poule monte`);
    // Les descentes de l'étage du dessus, poule par poule.
    const relegues = new Set(descentes.map((m) => m.club));
    const hautPoules = poulesDe(haut).length > 1
      ? tournoiDeFinDAnnee(haut, saison, nomDivision(haut))!.poules.map((p) => p.classement.map((l) => l.club)) : [];
    hautPoules.forEach((classement, n) => {
      const places = placesDeLaPoule(haut, n);
      const statuts = statutsDeLaPoule(haut, n, classement.length);
      egal(statuts.filter((s) => s === 'DIRECT_RELEGATION').length, places.relegation, `S${saison} ${haut} poule ${n + 1} : autant de places « relégation » affichées que de descentes sûres`);
      classement.forEach((club, r) => {
        const depuisLeBas = classement.length - r;
        if (depuisLeBas <= places.relegation) ok(relegues.has(club), `S${saison} ${haut} poule ${n + 1} : ${club}, place de relégation, descend`);
        else if (depuisLeBas > places.relegation + places.relegationPossible) ok(!relegues.has(club), `S${saison} ${haut} poule ${n + 1} : ${club} ne descend pas`);
      });
    });
    // ── Par ligue régionale ───────────────────────────────────────────────
    if (rulesFor(bas).promotionRules.territory === 'ligue') {
      // ⚠️ LA LIGUE D'UNE POULE, pas celle de chaque club : une poule rattachée (un club corse dans une poule de Provence)
      // joue sa montée et sa descente avec la ligue de sa poule.
      const ligueDeSaPoule = new Map<string, string>();
      for (const id of [haut, bas]) for (const poule of poulesDe(id)) for (const club of poule) ligueDeSaPoule.set(club, ligueDeLaPoule(poule));
      const compter = (liste: MouvementClub[]) => {
        const c = new Map<string, number>();
        for (const m of liste) c.set(ligueDeSaPoule.get(m.club)!, (c.get(ligueDeSaPoule.get(m.club)!) ?? 0) + 1);
        return Object.fromEntries([...c].sort());
      };
      egal(compter(montees), compter(descentes), `S${saison} ${bas} ↔ ${haut} : autant de descentes que de montées dans CHAQUE ligue`);
      ok(Object.keys(compter(montees)).length >= 5, `S${saison} ${bas} : plusieurs régions envoient des clubs (${Object.keys(compter(montees)).length})`);
    }
  }
  return bilan;
}

const saison1 = verifierUneSaison(1);
const f = (haut: string, bas: string) => frontiere(saison1.mouvements, haut, bas).montees.length;
egal([f('nationale', 'nationale2'), f('nationale2', 'fed1'), f('fed1', 'fed2'), f('fed2', 'fed3'), f('fed3', 'reg1')], [2, 4, 8, 16, 28],
  'les places mesurées : 2, 4, 8, 16 (14 premiers + 2 meilleurs deuxièmes), 28 (22 + 6)');
egal(frontiere(saison1.mouvements, 'fed2', 'fed3').montees.filter((m) => m.motif !== 'classement').length, 2, 'Fédérale 3 : deux meilleurs deuxièmes complètent les places');
ok(poulesDe('reg1').some((p, n) => ligueDeLaPoule(p) === 'ILE-DE-FRANCE' && placesDeLaPoule('reg1', n).relegation === 0),
  'une ligue sans Régionale 2 ne relègue personne de sa Régionale 1');
console.log(`✓ règlement, places par poule, échange par ligue, classement affiché (${controles} contrôles, ${chrono()})`);

// ═══ 5. Le tableau final ne change pas les montées ═══════════════════════════════════════════════════════
effacerResultatsJoues(); oublierResultats();
const montantsAvant = (bas: string, haut: string) => frontiere(resoudreToutesDivisions(1).mouvements, haut, bas).montees.map((m) => m.club).sort();
const avantTableau = { reg3: montantsAvant('reg3', 'reg2'), fed2: montantsAvant('fed2', 'fed1') };
ok(tournoiDeFinDAnnee('reg3', 1, nomDivision('reg3'))!.champion === null, 'avant le tableau, la Régionale 3 n’a pas de champion');
jouerAutresPhasesFinales(1, SEMAINES_PAR_SAISON, '');
oublierResultats();
const championReg3 = tournoiDeFinDAnnee('reg3', 1, nomDivision('reg3'))!.champion;
ok(championReg3, `le tableau final de Régionale 3 a désigné son champion (${championReg3})`);
egal(montantsAvant('reg3', 'reg2'), avantTableau.reg3, 'Régionale 3 : les mêmes clubs montent, tableau final joué ou non');
egal(avantTableau.fed2, [], 'Fédérale 2 : aucune montée avant les résultats du tableau');
egal(montantsAvant('fed2', 'fed1').length, 8, 'Fédérale 2 : huit clubs montent après qualification en quarts');
const tableau = tournoiDeFinDAnnee('reg3', 1, nomDivision('reg3'))!;
const elimines = tableau.matchs.filter((m) => m.status === 'completed').map((m) => m.perdant!).filter((c) => avantTableau.reg3.includes(c));
ok(elimines.length >= 10, `${elimines.length} clubs de Régionale 3 perdent en phase finale ET montent : la montée est acquise au classement`);
// Un deuxième de poule champion de Régionale 3 n'est pas promu pour autant : le titre n'est pas une place.
const deuxiemesQualifies = tableau.qualifies.filter((q) => q.rang === 2).map((q) => q.club);
ok(deuxiemesQualifies.every((c) => !avantTableau.reg3.includes(c)), 'Régionale 3 : un deuxième de poule peut jouer le titre sans monter');
console.log(`✓ titre et montée séparés (${controles} contrôles, ${chrono()})`);

// ═══ 6. Vu d'un club : toute sa division bouge, pas seulement sa poule ═══════════════════════════════════
effacerResultatsJoues(); oublierResultats();
const poulesReg3 = poulesDe('reg3');
const milieu = tournoiDeFinDAnnee('reg3', 1, nomDivision('reg3'))!.poules[3].classement[5].club;
const vuDuMilieu = resoudreSaisonClub('reg3', 1, milieu);
egal(vuDuMilieu.incidents, [], 'la fin de saison d’un club de Régionale 3 se résout sans incident');
egal(frontiere(vuDuMilieu.mouvements, 'reg2', 'reg3').montees.length, poulesReg3.length, `vu d’un club de milieu de tableau, ${poulesReg3.length} clubs montent de Régionale 3 (un seul auparavant)`);
ok(!vuDuMilieu.mouvements.some((m) => m.club === milieu), 'lui ne bouge pas');
const premier = tournoiDeFinDAnnee('reg3', 1, nomDivision('reg3'))!.poules[3].classement[0].club;
const vuDuPremier = resoudreSaisonClub('reg3', 1, premier);
const sien = vuDuPremier.mouvements.find((m) => m.club === premier);
egal([sien?.sens, sien?.motif, sien?.vers], ['montee', 'classement', 'reg2'], 'le premier de sa poule monte par sa place, sans attendre le tableau final');
egal(frontiere(vuDuPremier.mouvements, 'reg2', 'reg3').montees.length, poulesReg3.length, 'et les premiers des autres poules montent avec lui');
setContexteJoueur('', 0);
console.log(`✓ carrière d’entraîneur : toute la division bouge (${controles} contrôles, ${chrono()})`);

// ═══ 3 (suite). Trois saisons de suite : aucune division ne change de taille, les ligues régionales non plus ══
effacerResultatsJoues(); oublierResultats();
const mouvements: Record<string, string> = {};
for (let saison = 1; saison <= 3; saison++) {
  const bilan = verifierUneSaison(saison);
  for (const m of bilan.mouvements) mouvements[m.club] = m.vers;
  setMouvementsClubs({ ...mouvements });
  oublierResultats();
  for (const c of COMPETITIONS) egal(clubsDeDivision(c.id).length, tailles.get(c.id), `après la saison ${saison}, ${c.id} garde ses ${tailles.get(c.id)} clubs`);
  egal(poulesParLigue('reg3'), liguesAuDepart.reg3, `après la saison ${saison}, chaque ligue garde ses poules de Régionale 3`);
  egal(poulesParLigue('reg2'), liguesAuDepart.reg2, `après la saison ${saison}, chaque ligue garde ses poules de Régionale 2`);
  for (const id of A_POULES) ok(poulesDe(id).every((p) => p.length >= 4), `après la saison ${saison}, aucune poule de ${id} n'est vidée`);
}
setMouvementsClubs({}); oublierResultats();
console.log(`✓ trois saisons : tailles des divisions et des ligues régionales conservées (${controles} contrôles, ${chrono()})`);

console.log(`\n${controles} contrôles réussis.`);
