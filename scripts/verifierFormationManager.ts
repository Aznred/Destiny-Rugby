import { strict as assert } from 'node:assert';
import { tableauDetectionManager, evoluerAcademieManager } from '../src/lib/formationManager';
import type { AcademicienManager, Manager } from '../src/types';
import { useGame } from '../src/store/useGame';

useGame.getState().creerManager({
  nom: 'Test Formation', nation: 'France', club: 'Stade Toulousain', libre: true,
});
let manager = useGame.getState().manager as Manager;

const rapport = tableauDetectionManager(manager);
assert.equal(rapport.fiches.length, 8, 'une académie neuve doit recevoir 8 dossiers');
assert.equal(rapport.capacite, 8, 'le centre de niveau 0 doit avoir 8 places');
assert.ok(rapport.candidatsVus > rapport.fiches.length, 'le rapport doit filtrer le vivier');
assert.ok(rapport.fiches.every((f) => f.potentielBas <= f.potentielHaut), 'les fourchettes doivent être cohérentes');
assert.ok(rapport.fiches.every((f) => f.etoilesBas <= f.etoilesHaut), 'les étoiles doivent être cohérentes');
assert.ok(
  rapport.fiches.some((f) => f.jeune.nation !== 'France'),
  'un réseau international doit réellement remonter un profil étranger',
);

const cible = rapport.fiches[0].jeune;
useGame.getState().observerJeuneManager(cible.id);
manager = useGame.getState().manager as Manager;
assert.equal(manager.observationsJeunes[cible.id].matchs, 1, 'une visite doit compter un match');
assert.equal(manager.missionsJeunes.utilises, 1, 'une visite doit consommer un déplacement');

// L'entretien est verrouillé avant trois matchs.
useGame.getState().observerJeuneManager(cible.id, true);
manager = useGame.getState().manager as Manager;
assert.equal(manager.observationsJeunes[cible.id].entretien, false);
useGame.getState().observerJeuneManager(cible.id);
useGame.getState().observerJeuneManager(cible.id);
useGame.getState().observerJeuneManager(cible.id, true);
manager = useGame.getState().manager as Manager;
assert.equal(manager.observationsJeunes[cible.id].entretien, true, 'l’entretien doit s’ouvrir après trois matchs');
assert.equal(manager.missionsJeunes.utilises, 6, '3 matchs + un entretien doivent coûter 6 déplacements');

// Un dossier suivi reste visible même si son estimation change le classement.
assert.ok(
  tableauDetectionManager(manager).fiches.some((f) => f.jeune.id === cible.id),
  'un dossier observé ne doit jamais disparaître du rapport',
);

// La progression annuelle est testée avec un profil signé sans révéler son
// potentiel dans le contrat d'écran.
const jeune: AcademicienManager = {
  ...cible,
  clubOrigine: cible.club,
  club: manager.club,
  clubCentre: manager.club,
  recruteSaison: manager.saison,
  derniereSaison: manager.saison,
  categorie: 'espoirs',
  objectif: 'passe',
  moral: 70,
  tempsDeJeu: 55,
  anneesFormees: 0,
};
manager = { ...manager, academie: [jeune] };
const bilan = evoluerAcademieManager(manager);
const apres = bilan.academie.find((j) => j.id === jeune.id);
assert.ok(apres || bilan.revenus.length || bilan.liberes.length, 'la saison doit rendre un destin explicite');
if (apres) {
  assert.equal(apres.age, jeune.age + 1, 'le jeune doit vieillir');
  assert.ok(apres.note >= jeune.note, 'un jeune non blessé ne doit pas régresser en note');
  assert.equal(apres.derniereProgression?.saison, manager.saison, 'le bilan doit expliquer la progression');
}

console.log('✓ détection, observation, entretien, persistance et progression de l’académie vérifiés');
