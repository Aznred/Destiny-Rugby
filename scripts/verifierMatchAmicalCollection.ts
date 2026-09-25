import assert from 'node:assert/strict';
import { catalogueBaseCarriere } from '../src/lib/ligue/catalogueCarriere';
import {
  composerEquipeDepuisCollection,
  convertirEnCoequipiers,
  estCompteKiriAutorise,
} from '../src/lib/amicalCollection';
import { cleCarteSolo, etatCollectionSoloVide } from '../src/lib/collectionSolo';
import { creerMatch, avancer } from '../src/lib/moteur/moteur';

console.log('Testing Collection Friendly Match & Realtime Controller Prototype...');

const catalogue = catalogueBaseCarriere();
assert.ok(catalogue.length > 1000, 'Catalogue must be loaded');

// 1. Tester la composition automatique à partir de la collection
const etatCollection = etatCollectionSoloVide();
// On simule 5 cartes possédées
const cartesPossedees = catalogue.slice(0, 5);
for (const c of cartesPossedees) {
  etatCollection.quantites[cleCarteSolo(c.sourceId)] = 1;
}

const equipe = composerEquipeDepuisCollection('XV de Kiri', '#1a56db', etatCollection, catalogue);
assert.equal(equipe.joueurs.length, 15, 'L’équipe doit comporter exactement 15 titulaires');
assert.equal(equipe.nom, 'XV de Kiri');
assert.ok(equipe.noteMoyenne >= 30 && equipe.noteMoyenne <= 99, 'La note moyenne doit être valide');

// Vérifie que les numéros 1 à 15 sont bien présents
const numeros = equipe.joueurs.map(j => j.numero).sort((a, b) => a - b);
assert.deepEqual(numeros, Array.from({ length: 15 }, (_, i) => i + 1), 'Chaque numéro de 1 à 15 doit être attribué');

// 2. Vérification de la conversion en Coequipiers pour le moteur
const coequipiersA = convertirEnCoequipiers(equipe.joueurs);
assert.equal(coequipiersA.length, 15);

const equipeB = composerEquipeDepuisCollection('XV Adverse', '#dc2626', etatCollection, catalogue);
const coequipiersB = convertirEnCoequipiers(equipeB.joueurs);

// 3. Tester l'initialisation et l'avancement du moteur de match
const match = creerMatch(
  equipe.nom,
  equipeB.nom,
  coequipiersA,
  coequipiersB,
  20,
  17,
  'test-amical',
  undefined,
  {
    niveau: 'pro',
    tempsReel: true,
    controle: true,
  },
);

assert.ok(match, 'Le match amical doit être initialisé');
assert.equal(match.pions.length, 30, '30 joueurs doivent être sur la feuille de match');

// Faire avancer de quelques secondes
avancer(match, 1.0);
assert.ok(match.sim > 0, 'Le chrono du match doit progresser');

// 4. Tester la détection du compte Kiri
assert.equal(estCompteKiriAutorise({ pseudo: 'kiri' }), true, 'Pseudo kiri doit être autorisé');
assert.equal(estCompteKiriAutorise({ administrateur: true }), true, 'Administrateur doit être autorisé');
assert.equal(estCompteKiriAutorise({ pseudo: 'joueur_lambda' }), false, 'Joueur ordinaire ne doit pas être autorisé par défaut');

console.log('✅ ALL TESTS PASSED SUCCESSFULLY for Collection Friendly Match Prototype!');
