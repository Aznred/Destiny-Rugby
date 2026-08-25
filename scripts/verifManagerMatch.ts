import { jouerRencontre, enregistrerResultatJoue, effacerResultatsJoues } from '../src/lib/championnat';
import {
  compositionManagerParDefaut, feuilleDepuisComposition, POSTES_BANC_MANAGER,
  POSTES_XV_MANAGER, TACTIQUE_MANAGER_DEFAUT,
} from '../src/lib/compositionManager';
import { effectifDuClub } from '../src/lib/effectif';
import {
  appliquerTactiqueEquipe, avancer, creerMatch, demanderRemplacement,
} from '../src/lib/moteur/moteur';

let echecs = 0;
function test(nom: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${nom}`);
}

const clubA = 'Stade Toulousain';
const clubB = 'RC Toulon';
const effectifA = effectifDuClub(clubA, 1);
const effectifB = effectifDuClub(clubB, 1);
const composition = compositionManagerParDefaut(effectifA);
const feuille = feuilleDepuisComposition(effectifA, composition);

console.log('=== 1. FEUILLE DE MATCH ===');
test('15 titulaires', composition.titulaires.length === POSTES_XV_MANAGER.length);
test('8 remplaçants', composition.remplacants.length === POSTES_BANC_MANAGER.length);
test('23 joueurs sans doublon', new Set([...composition.titulaires, ...composition.remplacants]).size === 23);
test('feuille ordonnée 1 à 23', feuille.length === 23);
test('capitaine dans le XV', composition.titulaires.includes(composition.capitaineId));
test('buteur sur la feuille', [...composition.titulaires, ...composition.remplacants].includes(composition.buteurId));

console.log('\n=== 2. CONSIGNES BRANCHÉES AU MOTEUR ===');
const tactique = { ...TACTIQUE_MANAGER_DEFAUT, attaque: 'large' as const, defense: 'blitz' as const };
const match = creerMatch(clubA, clubB, effectifA, effectifB, 24, 18, 'verif-manager-match', undefined, {
  compositionA: feuille, tactiqueA: tactique,
  capitaineAId: composition.capitaineId, buteurAId: composition.buteurId,
});
test('la composition choisie entre sur le terrain', composition.titulaires.every((id) => match.pions.some((p) => p.sourceId === id && p.surLeTerrain)));
test('le capitaine reçoit son rôle', match.pions.some((p) => p.sourceId === composition.capitaineId && p.capitaine));
test('le buteur reçoit son rôle', match.pions.some((p) => p.sourceId === composition.buteurId && p.buteur));
test('le système défensif est imposé', match.tactiques.A?.defense === 'blitz');

const avant = match.planA.total;
appliquerTactiqueEquipe(match, 'A', { ...tactique, rythme: 'intense', penalites: 'points' });
test('la nouvelle consigne est mémorisée', match.tactiques.A?.rythme === 'intense' && match.tactiques.A.penalites === 'points');
test('le potentiel de marque restant réagit', match.planA.total !== avant);

const entrant = match.pions.find((p) => p.cote === 'A' && !p.surLeTerrain)!;
const sortant = match.pions.find((p) => p.cote === 'A' && p.surLeTerrain && p.numero <= 15)!;
test('un changement peut être programmé', demanderRemplacement(match, 'A', entrant.sourceId, sortant.sourceId));
for (let i = 0; i < 20 && !entrant.surLeTerrain; i++) avancer(match, 1);
test('le changement est exécuté au premier arrêt', entrant.surLeTerrain && !sortant.surLeTerrain);

console.log('\n=== 3. LE SCORE RÉEL REMPLACE LA SIMULATION ===');
const cle = 'top14#1#0#Stade Toulousain#RC Toulon';
enregistrerResultatJoue(cle, { domicile: clubA, exterieur: clubB, scoreD: 31, scoreE: 17, essaisD: 4, essaisE: 2 });
const reel = jouerRencontre(clubA, clubB, 1, cle, null);
test('score coaché relu par le championnat', reel.scoreD === 31 && reel.scoreE === 17 && reel.essaisD === 4);
effacerResultatsJoues();

console.log(`\n${echecs ? `❌ ${echecs} échec(s)` : '✅ TOUT PASSE'}`);
process.exitCode = echecs ? 1 : 0;
