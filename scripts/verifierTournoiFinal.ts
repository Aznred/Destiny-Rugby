// BANC DES MATCHS COUPERETS (Correctif 26)
//
// Signalé : « certains matchs de playoffs / coupes ne semblent pas pouvoir être simulés » — Régionale, Fédérale,
// Nationale. Le tournoi final des divisions à poules était affiché mais jamais proposé comme match. Ce banc tient :
//   1. dans chaque division à poules, un qualifié reçoit une affiche de tournoi à chaque tour, jusqu'à la finale ;
//   2. cette affiche se joue avec LE moteur des matchs de championnat (création, simulation jusqu'à la sirène) ;
//   3. le score joué décide du tour suivant (une victoire contraire au tirage fait avancer, une défaite élimine) ;
//   4. un nul en match couperet a toujours un vainqueur, le même pour l'écran de fin et pour le tableau ;
//   5. l'entraîneur ne peut pas passer la semaine tant qu'un tour reste à jouer, et l'avance déléguée les joue ;
//   6. la carrière joueur lit les mêmes affiches, donc les mêmes clés.
//
//   npm run verify:tournoi-final

import { strict as assert } from 'node:assert';
import { CALENDRIER } from '../src/data/calendrier';
import { COMPETITIONS } from '../src/data/clubs';
import { useGame } from '../src/store/useGame';
import { afficheDuClub, afficheDuJoueur, affichesDePhaseFinale, libelleAfficheManager, resteUnMatchCeWeekEnd } from '../src/lib/matchLive';
import { effacerResultatsJoues, enregistrerResultatJoue, poulesDe } from '../src/lib/championnat';
import { oublierResultats } from '../src/lib/promotion';
import { tournoiDeFinDAnnee } from '../src/lib/tournoi';
import { departager, estMatchCouperet } from '../src/lib/couperet';
import { effectifDuClub } from '../src/lib/effectif';
import { creerMatch } from '../src/lib/moteur/moteur';
import { simulerPendant } from '../src/lib/moteur/sortie';
import type { Joueur } from '../src/types';

let controles = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); controles++; };
const egal = <T>(a: T, b: T, message: string) => { assert.deepEqual(a, b, message); controles++; };
const semaineDu = (tour: string) => CALENDRIER.find((s) => s.tourFinal === tour)!.numero;
const nom = (id: string) => COMPETITIONS.find((c) => c.id === id)!.nom;
const SAISON = 1;

// ── 1 à 4 : la bibliothèque seule, sur trois étages de la pyramide ─────────────────────────────────────────────
for (const division of ['nationale2', 'fed1', 'reg1']) {
  effacerResultatsJoues(); oublierResultats();
  const debut = Date.now();
  const tournoi = tournoiDeFinDAnnee(division, SAISON, nom(division))!;
  const calcul = Date.now() - debut;
  ok(tournoi && tournoi.matchs.length >= 3, `${division} : le tournoi final existe (${poulesDe(division).length} poules)`);
  ok(tournoi.matchs.every((m) => m.cle?.startsWith(`tournoi#${division}#${SAISON}#`)), `${division} : chaque match du tournoi porte la clé que le tableau relit`);
  const rappel = Date.now();
  tournoiDeFinDAnnee(division, SAISON, nom(division));
  ok(Date.now() - rappel < 20, `${division} : le tournoi est mémorisé (${calcul} ms la première fois, ${Date.now() - rappel} ms ensuite)`);

  // Le club le MOINS bien placé du tableau : il n'est pas censé aller au bout, et il va tout gagner sur le terrain.
  const club = tournoi.qualifies.at(-1)!.club;
  const resultats: Record<string, unknown> = {};
  const carriere = (semaine: number) => ({ division, club, saison: SAISON, semaine, resultats });
  let joues = 0;
  let moteurVerifie = false;
  for (const tour of ['barrage', 'demie', 'finale']) {
    for (let garde = 0; garde < 8; garde++) {
      const affiche = afficheDuClub(carriere(semaineDu(tour)));
      if (!affiche || resultats[affiche.cle]) break;
      ok(estMatchCouperet(affiche.cle), `${division} : « ${affiche.cle} » est un match couperet`);
      ok(affiche.match.domicile === club || affiche.match.exterieur === club, `${division} : l'affiche concerne bien le club`);
      if (affiche.cle.startsWith('tournoi#')) {
        ok(libelleAfficheManager(affiche, nom(division)).startsWith('Tournoi final'), `${division} : le tour s'annonce (« ${libelleAfficheManager(affiche, nom(division))} »)`);
        // ⚠️ LE MÊME MOTEUR QUE LE CHAMPIONNAT : aucun type de compétition n'a son propre simulateur.
        if (!moteurVerifie) {
          const { domicile, exterieur } = affiche.match;
          const e = creerMatch(domicile, exterieur, effectifDuClub(domicile, SAISON), effectifDuClub(exterieur, SAISON), 70, 70, affiche.cle);
          let lots = 0;
          while (!e.fini && lots++ < 20000) simulerPendant(e, 50, () => Date.now());
          ok(e.fini, `${division} : le match du tournoi se simule jusqu'à la sirène (${e.scoreA}-${e.scoreB})`);
          moteurVerifie = true;
        }
      }
      // Victoire du club, quoi que disait le tirage.
      const chezLui = affiche.match.domicile === club;
      const match = { domicile: affiche.match.domicile, exterieur: affiche.match.exterieur,
        scoreD: chezLui ? 31 : 6, scoreE: chezLui ? 6 : 31, essaisD: chezLui ? 4 : 0, essaisE: chezLui ? 0 : 4 };
      enregistrerResultatJoue(affiche.cle, match); oublierResultats();
      resultats[affiche.cle] = match;
      joues++;
    }
  }
  ok(moteurVerifie, `${division} : au moins un match du tournoi a été proposé`);
  const apres = tournoiDeFinDAnnee(division, SAISON, nom(division), club)!;
  egal(apres.champion, club, `${division} : ${joues} matchs gagnés sur le terrain font de ${club} le champion du tournoi`);

  // Une défaite élimine : plus aucune affiche de tournoi ensuite.
  effacerResultatsJoues(); oublierResultats();
  const autre = tournoiDeFinDAnnee(division, SAISON, nom(division))!.qualifies[0].club;
  const perdus: Record<string, unknown> = {};
  const premiere = affichesDePhaseFinale({ division, club: autre, saison: SAISON, semaine: semaineDu(division === 'nationale2' ? 'demie' : 'barrage'), resultats: perdus })
    .find((a) => a.cle.startsWith('tournoi#'));
  ok(premiere, `${division} : la tête de série a un match de tournoi`);
  const chezLui = premiere!.match.domicile === autre;
  enregistrerResultatJoue(premiere!.cle, { domicile: premiere!.match.domicile, exterieur: premiere!.match.exterieur,
    scoreD: chezLui ? 3 : 40, scoreE: chezLui ? 40 : 3, essaisD: 0, essaisE: 0 });
  oublierResultats();
  perdus[premiere!.cle] = true;
  const suite = ['barrage', 'demie', 'finale'].flatMap((tour) =>
    affichesDePhaseFinale({ division, club: autre, saison: SAISON, semaine: semaineDu(tour), resultats: perdus }))
    .filter((a) => a.cle.startsWith('tournoi#') && !perdus[a.cle]);
  egal(suite.length, 0, `${division} : battu sur le terrain, ${autre} n'a plus de match de tournoi`);

  // Un nul a un vainqueur, le même partout.
  const d = departager(premiere!.cle, 17, 17);
  ok(d.prolongation && d.scorePour !== d.scoreContre && Math.abs(d.scorePour - d.scoreContre) === 3, `${division} : un nul couperet est tranché à trois points`);
  egal(departager(premiere!.cle, 17, 17), d, `${division} : le départage est le même à chaque lecture`);
  egal(departager(`${division}#1#3#A#B`, 17, 17).prolongation, false, `${division} : un nul de championnat reste un nul`);
}

// ── 5 : l'entraîneur ───────────────────────────────────────────────────────────────────────────────────────────
{
  effacerResultatsJoues(); oublierResultats();
  const etat = () => useGame.getState();
  const manager = () => etat().manager!;
  const division = 'fed1';
  etat().creerManager({ nom: 'Contrôle tournoi', club: COMPETITIONS.find((c) => c.id === division)!.clubs[0].nom, nation: 'France', age: 40, libre: true });
  const club = manager().club;
  const gagner = () => {
    const m = manager();
    const a = afficheDuClub(m)!;
    const domicile = a.match.domicile === m.club;
    etat().enregistrerResultatManager({
      cle: a.cle, club: m.club, saison: m.saison, semaine: m.semaine, journee: a.journee, domicile,
      adversaire: domicile ? a.match.exterieur : a.match.domicile,
      scorePour: 70, scoreContre: 0, essaisPour: 10, essaisContre: 0,
    });
    return a;
  };
  // Toute la saison régulière gagnée : premier de sa poule, donc qualifié pour le tournoi.
  for (let garde = 0; manager().semaine < semaineDu('barrage') && garde < 200; garde++) {
    const m = manager();
    const a = afficheDuClub(m);
    if (a && !m.resultats[a.cle]) gagner(); else etat().semaineManager();
  }
  egal(manager().semaine, semaineDu('barrage'), "l'entraîneur arrive au premier week-end de phase finale");
  const clesTournoi: string[] = [];
  for (const tour of ['barrage', 'demie', 'finale']) {
    for (let garde = 0; manager().semaine < semaineDu(tour) && garde < 10; garde++) etat().semaineManager();
    for (let garde = 0; garde < 8; garde++) {
      const m = manager();
      const a = afficheDuClub(m);
      if (!a || m.resultats[a.cle]) break;
      // Le match attend : la semaine ne passe pas par-dessus.
      etat().semaineManager();
      egal(manager().semaine, m.semaine, `${tour} : la semaine ne passe pas tant que « ${a.cle.split('#')[0]} » n'est pas joué`);
      if (a.cle.startsWith('tournoi#')) clesTournoi.push(a.cle);
      gagner();
    }
    etat().semaineManager();
    ok(manager().semaine > semaineDu(tour), `${tour} : tous ses matchs joués, la semaine passe`);
  }
  ok(clesTournoi.length >= 3, `l'entraîneur a disputé le tournoi final (${clesTournoi.length} matchs : quart, demie, finale)`);
  ok(clesTournoi.every((cle) => manager().resultats[cle]), 'chaque match du tournoi est inscrit à ses résultats');
  egal(tournoiDeFinDAnnee(division, manager().saison, nom(division), club)!.champion, club, "ses victoires font de son club le champion du tournoi");

  // L'avance déléguée joue aussi les matchs couperets (résultat automatique), tournoi compris.
  effacerResultatsJoues(); oublierResultats();
  etat().creerManager({ nom: 'Contrôle délégué', club: COMPETITIONS.find((c) => c.id === 'nationale2')!.clubs[0].nom, nation: 'France', age: 40, libre: true });
  for (let garde = 0; manager().semaine < semaineDu('barrage') && garde < 200; garde++) {
    const m = manager();
    const a = afficheDuClub(m);
    if (a && !m.resultats[a.cle]) gagner(); else etat().semaineManager();
  }
  const bilan = etat().avancerJusquaManager(semaineDu('acces'), true);
  ok(bilan.arret !== 'match', `l'avance déléguée ne reste bloquée sur aucun match couperet (arrêt : ${bilan.arret})`);
  const delegues = Object.keys(manager().resultats).filter((cle) => estMatchCouperet(cle));
  ok(delegues.length >= 2, `les matchs couperets ont reçu un résultat automatique (${delegues.length})`);
  ok(delegues.some((cle) => cle.startsWith('tournoi#')), 'dont ceux du tournoi final');
}

// ── 6 : la carrière joueur lit les mêmes affiches ──────────────────────────────────────────────────────────────
{
  effacerResultatsJoues(); oublierResultats();
  const division = 'fed1';
  const tournoi = tournoiDeFinDAnnee(division, SAISON, nom(division))!;
  const club = tournoi.qualifies[0].club;
  const joueur = (semaine: number, resultatsClub: Record<string, unknown> = {}) =>
    ({ nom: 'Banc', club, division, saison: SAISON, semaine, resultatsClub }) as unknown as Joueur;
  const semaine = semaineDu('barrage');
  const pourLeJoueur = afficheDuJoueur(joueur(semaine));
  const pourLeClub = afficheDuClub({ division, club, saison: SAISON, semaine, resultats: {} });
  ok(pourLeJoueur, 'le joueur a une affiche le premier week-end de phase finale');
  egal(pourLeJoueur?.cle, pourLeClub?.cle, "le joueur et l'entraîneur lisent la même affiche, sous la même clé");
  ok(resteUnMatchCeWeekEnd(joueur(semaine)), 'un match couperet attend le joueur');
  // Le match joué, s'il en reste un autre ce week-end, il est proposé à son tour ; sinon la semaine peut passer.
  const joues: Record<string, unknown> = {};
  let tours = 0;
  for (let garde = 0; garde < 8 && resteUnMatchCeWeekEnd(joueur(semaine, joues)); garde++) {
    const a = afficheDuJoueur(joueur(semaine, joues))!;
    const chezLui = a.match.domicile === club;
    const match = { domicile: a.match.domicile, exterieur: a.match.exterieur, scoreD: chezLui ? 28 : 9, scoreE: chezLui ? 9 : 28, essaisD: 0, essaisE: 0 };
    enregistrerResultatJoue(a.cle, match); oublierResultats();
    joues[a.cle] = match;
    tours++;
  }
  // Premier de sa poule, il est exempté de barrage : son week-end, c'est le quart du tournoi.
  ok(tours >= 1, `le joueur dispute tous les matchs couperets du week-end (${tours})`);
  ok(Object.keys(joues).some((cle) => cle.startsWith('tournoi#')), 'dont un match du tournoi final');
  ok(!resteUnMatchCeWeekEnd(joueur(semaine, joues)), 'tous joués : la semaine peut passer');
  ok(!resteUnMatchCeWeekEnd(joueur(10)), "en championnat, rien ne retient la semaine");
}

console.log(`Matchs couperets et tournoi final : ${controles} contrôles, OK`);
