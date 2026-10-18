import assert from 'node:assert/strict';
import { useGame, recuperationHebdo } from '../src/store/useGame';
import { BAREMES_FORME, coutFormeMatch, DIFFICULTES_CARRIERE, normaliserDifficulteCarriere, recuperationConditionManager } from '../src/lib/formeCarriere';
import { effectifDuClub } from '../src/lib/effectif';
import { apresResultatCarriereAvancee, avancerSemaineCarriereAvancee } from '../src/lib/carriereAvancee';
import { penalitesConditionManager } from '../src/lib/adjointManager';
import { retourDeMatch } from '../src/lib/moteur/apresMatch';
import { agirCarriere, avancerCarriere, creerCarriere, recuperationFatigueParJour, recupererFatiguePassivement } from '../src/lib/ligue/carriere';
import { coutFatigueMatchEnLigne } from '../src/lib/ligue/horaires';
import { creerMatchEnLigne, STRATEGIE_EN_LIGNE_DEFAUT } from '../src/lib/ligue/matchCarriere';
import { coequipierDepuisCarte } from '../src/lib/ligue/catalogueCarriere';
import type { ResultatMatchManager } from '../src/types';

let sauvegarde: unknown;
useGame.persist.setOptions({ storage: { getItem: () => sauvegarde as never, setItem: (_, v) => { sauvegarde = structuredClone(v); }, removeItem: () => {} } });
for (const valeur of [undefined, null, '', 'expert', 3]) assert.equal(normaliserDifficulteCarriere(valeur), 'moyen');
useGame.getState().setDifficulteCarriere('moyen');
useGame.getState().creerManager({ nom: 'Essai forme', nation: 'France', club: 'Stade Toulousain', age: 40, libre: true });
const manager = useGame.getState().manager!, effectif = effectifDuClub(manager.club, 1);
const [titulaire, remplacant, inutilise] = effectif;
const resultat: ResultatMatchManager = { cle: 'forme#test', club: manager.club, saison: 1, semaine: 1, journee: 1, domicile: true,
  adversaire: 'Stade Rochelais', scorePour: 20, scoreContre: 12, essaisPour: 2, essaisContre: 1, blessures: [],
  minutesJouees: { [titulaire.id]: 80, [remplacant.id]: 20, [inutilise.id]: 0 } };
const traces: Record<string, number[]> = {};
for (const niveau of DIFFICULTES_CARRIERE) {
  const m = { ...manager, difficulteCarriere: niveau };
  const apres = apresResultatCarriereAvancee(m, effectif, resultat).etat;
  const avant = manager.avancee!.profilsMedicaux;
  assert.equal(apres.profilsMedicaux[titulaire.id].condition, avant[titulaire.id].condition - coutFormeMatch(80, niveau));
  assert.equal(apres.profilsMedicaux[remplacant.id].condition, avant[remplacant.id].condition - coutFormeMatch(20, niveau));
  assert.equal(apres.profilsMedicaux[inutilise.id].condition, avant[inutilise.id].condition);
  const repose = avancerSemaineCarriereAvancee({ ...m, avancee: apres }, effectif, 2);
  assert.ok(repose.profilsMedicaux[titulaire.id].condition > apres.profilsMedicaux[titulaire.id].condition);
  let sansRotation = 100, avecRotation = 100;
  traces[niveau] = [];
  for (let n = 0; n < 6; n++) {
    const gain = recuperationConditionManager(4, 2, niveau);
    sansRotation = Math.min(100, Math.max(0, sansRotation - coutFormeMatch(80, niveau)) + gain);
    avecRotation = Math.min(100, Math.max(0, avecRotation - (n % 3 === 2 ? 0 : coutFormeMatch(80, niveau))) + gain);
    traces[niveau].push(sansRotation);
  }
  if (niveau !== 'facile') assert.ok(avecRotation > sansRotation + 10, 'le repos apporte un bénéfice réel');
  console.log(`${niveau} : condition avant match, six semaines sans rotation : ${traces[niveau].join(' → ')}`);
}
assert.ok(traces.facile[5] >= 90 && traces.moyen[2] < 80 && traces.difficile[1] < 80);
assert.ok(recuperationConditionManager(13, 0, 'moyen') < recuperationConditionManager(4, 2, 'moyen'));
const fatigue = structuredClone(manager.avancee!);
fatigue.profilsMedicaux[titulaire.id].condition = 55;
assert.ok(penalitesConditionManager(fatigue, effectif)[titulaire.id] > 5, 'la condition coûte aussi au match réel et délégué');
useGame.setState({ manager: { ...manager, avancee: fatigue } });
useGame.getState().setDifficulteCarriere('difficile');
assert.equal(useGame.getState().manager!.avancee!.profilsMedicaux[titulaire.id].condition, 55, 'changer de niveau ne soigne personne');
await useGame.persist.rehydrate();
assert.equal(useGame.getState().difficulteCarriere, 'difficile');
assert.equal(useGame.getState().manager!.difficulteCarriere, 'difficile');
const options = useGame.persist.getOptions();
const ancienne = options.merge!({ manager: { ...manager, difficulteCarriere: undefined } }, useGame.getState());
assert.equal(ancienne.difficulteCarriere, 'moyen', 'ancienne sauvegarde en niveau moyen');

useGame.getState().creerJoueur({ nom: 'Essai joueur', nation: 'France', poste: 'demi_melee', age: 20, club: 'Stade Toulousain', traits: [] } as never);
const joueur = useGame.getState().joueur!;
const stats = { minutes: 80, essais: 0, plaquages: 8, plaquagesManques: 0, passes: 30, metres: 20, grattages: 0, butsTentes: 0, butsReussis: 0, cartons: 0 };
for (const niveau of DIFFICULTES_CARRIERE) {
  const j = { ...joueur, difficulteCarriere: niveau, forme: 70 };
  assert.equal(retourDeMatch(j, stats, 0, () => .5).deltas.forme, -coutFormeMatch(80, niveau));
  assert.ok(recuperationHebdo(j) <= BAREMES_FORME[niveau].recuperation + 5);
  assert.equal(coutFormeMatch(0, niveau), 0);
  assert.ok(coutFormeMatch(120, niveau) > coutFormeMatch(80, niveau));
}

// Deux feuilles finalisées identiques : consulter tous les jours ou une fois
// après une absence doit donner la même fatigue et les mêmes résultats.
const JOUR = 86_400_000, t0 = Date.parse('2026-10-01T12:00:00Z');
let ligue = creerCarriere({ id: 'forme-ligue', nom: 'Forme', code: 'FORME1', compteId: 'compte-1', pseudo: 'Un', clubNom: 'Club Un', rythme: 1, maxClubs: 2 }, t0, 'forme');
ligue = agirCarriere(ligue, 'compte-2', { type: 'rejoindre', pseudo: 'Deux', clubNom: 'Club Deux' }, t0, 'forme');
ligue = agirCarriere(ligue, 'compte-1', { type: 'demarrerSaison' }, t0, 'forme');
const rencontre = ligue.rencontres[0];
const equipe = (id: string) => { const club = ligue.clubs.find(c => c.id === id)!; return { clubId: id, nom: club.nom, effectif: ligue.cartes.filter(c => c.proprietaire === id).map(coequipierDepuisCarte), composition: club.composition, strategie: STRATEGIE_EN_LIGNE_DEFAUT }; };
const modele = creerMatchEnLigne({ id: rencontre.id, domicile: equipe(rencontre.domicile), exterieur: equipe(rencontre.exterieur), debut: t0, graine: 42 });
modele.termine = true;
modele.feuille = ligue.cartes.filter(c => ligue.clubs.some(club => club.composition.titulaires.includes(c.id))).map(c => ({ carteId: c.id, minutes: 80, essais: 0 })) as typeof modele.feuille;
for (const rythme of [1, 2, 3, 7]) {
  const initial = structuredClone(ligue); initial.rythme = rythme;
  const dates = [t0, t0 + 3 * JOUR];
  initial.rencontres = dates.map((date, i) => ({ ...rencontre, id: `forme-rencontre-${i}`, ouvre: new Date(date).toISOString(), ferme: new Date(date + 2 * 3_600_000).toISOString(),
    match: { ...structuredClone(modele), id: `forme-rencontre-${i}`, debut: date }, resultat: undefined }));
  initial.rencontres.push({ ...rencontre, id: 'forme-futur', ouvre: new Date(t0 + 20 * JOUR).toISOString(), ferme: new Date(t0 + 21 * JOUR).toISOString(), match: undefined, resultat: undefined });
  initial.rencontres.reverse(); // Le stockage peut mélanger coupes et championnat.
  // La composition a changé après le gel : ce joueur n'a pas joué ces matchs.
  const club = initial.clubs[0];
  const reserve = initial.cartes.find(c => c.proprietaire === club.id && !modele.feuille!.some(l => l.carteId === c.id))!;
  club.composition.titulaires[14] = reserve.id;
  club.composition.remplacants = club.composition.remplacants.filter(id => id !== reserve.id);
  let quotidien = structuredClone(initial);
  quotidien.rencontres.forEach(r => { delete r.match; });
  for (let jour = 0; jour <= 6; jour++) {
    const maintenant = t0 + jour * JOUR + 2 * 3_600_000;
    // La feuille finalisée n'existe dans le suivi quotidien qu'après son match.
    for (const r of quotidien.rencontres) {
      const source = initial.rencontres.find(s => s.id === r.id)!;
      if (!r.resultat && source.match && source.match.debut + 80 * 60_000 <= maintenant) r.match = structuredClone(source.match);
    }
    quotidien = avancerCarriere(quotidien, maintenant, 'forme');
  }
  const retour = avancerCarriere(initial, t0 + 6 * JOUR + 2 * 3_600_000, 'forme');
  assert.deepEqual(retour.cartes.map(c => [c.id, c.fatigue]), quotidien.cartes.map(c => [c.id, c.fatigue]), `même fatigue après absence, rythme ${rythme}`);
  assert.deepEqual(retour.rencontres.map(r => r.resultat), quotidien.rencontres.map(r => r.resultat));
  assert.equal(retour.cartes.find(c => c.id === reserve.id)!.matchs, 0, 'la feuille gelée prime sur la composition actuelle');
  assert.equal(retour.cartes.find(c => c.id === reserve.id)!.fatigue, 0);
  const repete = avancerCarriere(retour, t0 + 6 * JOUR + 2 * 3_600_000, 'forme');
  assert.deepEqual(repete.cartes.map(c => c.fatigue), retour.cartes.map(c => c.fatigue), 'aucun crédit de repos supplémentaire à la même date');
  const jourAvant = retour.dernierJourRecuperation;
  recupererFatiguePassivement(retour, t0);
  assert.equal(retour.dernierJourRecuperation, jourAvant, 'aucun retour de l’ancre dans le passé');
  assert.ok(recuperationFatigueParJour(rythme) * 7 / rythme >= coutFatigueMatchEnLigne(80) - 2);
}
assert.equal(coutFatigueMatchEnLigne(80), 24);
assert.equal(coutFatigueMatchEnLigne(20), 6);
console.log('Minutes réelles, rotation, intensité, repos, niveaux persistés, joueur et récupération chronologique en ligne : OK.');
