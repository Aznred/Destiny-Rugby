import assert from 'node:assert/strict';
import { effacerResultatsJoues, enregistrerResultatJoue, resultatJoue } from '../src/lib/championnat';
import { tournoiDeFinDAnnee } from '../src/lib/tournoi';
import { jouerAutresPhasesFinales } from '../src/lib/phasesFinalesJouees';
import { oublierResultats, nomDivision } from '../src/lib/promotion';

for (const division of ['fed2', 'fed1', 'nationale2']) {
  effacerResultatsJoues(); oublierResultats();
  const lire = () => tournoiDeFinDAnnee(division, 1, nomDivision(division))!;
  const premier = lire().matchs[0];
  const nul = { domicile: premier.domicile, exterieur: premier.exterieur, scoreD: 17, scoreE: 17, essaisD: 2, essaisE: 2 };
  enregistrerResultatJoue(premier.cle, nul);
  assert.equal(lire().matchs[0].status, 'in_progress');
  const sauves = jouerAutresPhasesFinales(1, 53, '');
  const tableau = lire();
  assert.ok(tableau.champion, `${division} : un champion est désigné malgré l'ancien nul.`);
  assert.ok(tableau.finaliste && tableau.finaliste !== tableau.champion);
  assert.ok(tableau.matchs.every(m => m.status === 'completed'));
  assert.deepEqual([resultatJoue(premier.cle)!.scoreD, resultatJoue(premier.cle)!.scoreE], [17, 17], 'Le vrai score est conservé.');
  assert.ok(sauves[premier.cle].vainqueurDesigne, 'Le départage est persistable.');
  const fin = JSON.stringify(tableau.matchs);
  jouerAutresPhasesFinales(1, 53, '');
  assert.equal(JSON.stringify(lire().matchs), fin, 'Une seconde avance ne rejoue rien.');
  // Sans résultat, le club humain garde son match à jouer : aucune victoire inventée.
  effacerResultatsJoues(); oublierResultats();
  const protege = lire().matchs[0];
  jouerAutresPhasesFinales(1, protege.semaine, protege.domicile);
  assert.equal(resultatJoue(protege.cle), undefined);
  console.log(`OK ${division} : ancien nul débloqué, champion, finaliste, reprise idempotente et match humain protégé.`);
}
effacerResultatsJoues(); oublierResultats();
