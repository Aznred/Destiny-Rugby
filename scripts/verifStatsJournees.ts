// BANC D'ESSAI : LE CLASSEMENT INDIVIDUEL NE PREND PAS D'AVANCE
//
// Deux bugs signalés en jeu, et c'était le même : « on a plus de matchs que le
// maximum possible » et « on voit les stats de la journée avant de l'avoir
// jouée ».
//
// ⚠️ LA CAUSE ÉTAIT UN NUMÉRO DE SEMAINE. `semaineSuivante` fait passer la fiche
// du joueur à `numero + 1` AVANT d'appeler `simulerStatsJournee`, qui lisait
// `joueur.semaine` et demandait à `matchDeLaSemaine` l'affiche de CETTE
// semaine-là : on rejouait donc la journée suivante, celle qui n'avait pas
// encore eu lieu. Le classement individuel avait en permanence une journée
// d'avance sur le championnat.
//
// Ce que ce banc vérifie, et qu'aucun autre ne vérifiait :
//   1. la dernière journée rejouée ne dépasse jamais celle que le championnat a
//      réellement disputée ;
//   2. aucun joueur n'a plus de matchs qu'il n'y a eu de journées ;
//   3. les minutes d'un joueur ne dépassent pas 80 par journée disputée.
//
//   npx vite-node scripts/verifStatsJournees.ts

import { useGame } from '../src/store/useGame';
import { journeesALaSemaine, nombreJournees } from '../src/lib/championnat';

let echecs = 0;
function ligne(nom: string, valeur: string | number, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${nom.padEnd(52)} ${valeur}`);
}

const DIVISION = 'reg3';
const SEMAINES_JOUEES = 9;

const api = useGame.getState();
api.creerJoueur({
  nom: 'Témoin Statistique',
  poste: 'demi_ouverture',
  nation: 'France',
  club: 'Pierrefeucain',
  division: DIVISION,
  age: 22,
  traits: [],
});

// ⚠️ ON ATTEND LA FILE. `simulerStatsJournee` est asynchrone et sérialisée
// (`fileStatsReelles`) : sans l'attendre, on lirait `statsReelles` avant que la
// journée ne soit rejouée, et le banc passerait au vert sur un tableau vide.
for (let k = 0; k < SEMAINES_JOUEES; k++) {
  const avant = useGame.getState().joueur!.semaine ?? 1;
  useGame.getState().semaineSuivante();
  // Une scène du MJ bloque l'avance tant qu'on n'y a pas répondu.
  if (useGame.getState().evenementHebdo) useGame.getState().abandonnerEvenement();
  if (useGame.getState().scenarioActif) useGame.setState({ scenarioActif: null });
  await useGame.getState().simulerStatsJournee(avant);
}

const j = useGame.getState().joueur!;
const cle = `${DIVISION}#${j.saison}`;
const total = nombreJournees(DIVISION, j.club);
const derniereSemaineJouee = (j.semaine ?? 1) - 1;

// Combien de journées le championnat a-t-il RÉELLEMENT disputées ?
const journeesJouees = journeesALaSemaine(DIVISION, derniereSemaineJouee + 1, total);
const journeesRejouees = useGame.getState().journeesReelles[cle] ?? 0;

console.log('=== 1. LA SIMULATION NE DÉPASSE PAS LE CHAMPIONNAT ===');
console.log(`     ${SEMAINES_JOUEES} semaines jouées · journées disputées : ${journeesJouees}`);
ligne('la dernière journée rejouée existe déjà',
  `rejouée J${journeesRejouees} · disputée J${journeesJouees}`,
  journeesRejouees <= journeesJouees);
ligne('… et on ne saute pas de journée non plus',
  `écart ${journeesJouees - journeesRejouees}`,
  journeesJouees - journeesRejouees <= 1);

console.log('\n=== 2. PERSONNE N’A JOUÉ PLUS DE MATCHS QU’IL N’Y A DE JOURNÉES ===');
{
  const table = useGame.getState().statsReelles[cle] ?? {};
  const lignes = Object.entries(table);
  ligne('des statistiques ont bien été produites', `${lignes.length} joueur(s)`, lignes.length > 0);

  const tropDeMatchs = lignes.filter(([, l]) => (l.matchs ?? 0) > journeesRejouees);
  ligne('aucun joueur au-dessus du nombre de journées',
    tropDeMatchs.length
      ? tropDeMatchs.slice(0, 3).map(([n, l]) => `${n} ${l.matchs}/${journeesRejouees}`).join(' · ')
      : `max ${Math.max(...lignes.map(([, l]) => l.matchs ?? 0))} pour ${journeesRejouees} journées`,
    tropDeMatchs.length === 0);

  const plafondMinutes = journeesRejouees * 80;
  const tropDeMinutes = lignes.filter(([, l]) => (l.minutes ?? 0) > plafondMinutes + 1);
  ligne('aucun joueur au-dessus de 80 min par journée',
    tropDeMinutes.length
      ? tropDeMinutes.slice(0, 3).map(([n, l]) => `${n} ${Math.round(l.minutes)}′`).join(' · ')
      : `max ${Math.round(Math.max(...lignes.map(([, l]) => l.minutes ?? 0)))}′ pour ${plafondMinutes}′`,
    tropDeMinutes.length === 0);
}

console.log('\n=== 3. LE JOUEUR INCARNÉ EST COHÉRENT AVEC SA SAISON ===');
{
  const saison = j.saisonEnCours;
  console.log(`     fiche : ${saison?.matchs ?? 0} match(s) joué(s) sur ${journeesJouees} journée(s)`);
  ligne('sa fiche ne dépasse pas les journées disputées',
    `${saison?.matchs ?? 0} ≤ ${journeesJouees}`,
    (saison?.matchs ?? 0) <= journeesJouees);
}

console.log(echecs === 0
  ? '\n✅ Le classement individuel ne prend plus d’avance sur le championnat.'
  : `\n❌ ${echecs} contrôle(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
