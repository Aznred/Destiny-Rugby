import { strict as assert } from 'node:assert';
import { useGame } from '../src/store/useGame';

const jeu = () => useGame.getState();

jeu().reinitialiser();
jeu().creerJoueur({
  nom: 'Joueur Navigation', poste: 'demi_ouverture', nation: 'France',
  club: 'Stade Toulousain', division: 'top14', age: 22, traits: [],
});

assert.ok(jeu().joueur, "La création n'ouvre aucune carrière joueur.");
assert.equal(jeu().manager, null, 'Une carrière entraîneur reste active en parallèle.');
assert.equal(jeu().ecran, 'carriere', "La création n'arrive pas sur la carrière.");

for (const ecran of ['profil', 'effectif', 'tableau', 'social'] as const) {
  jeu().setEcran(ecran);
  assert.equal(jeu().ecran, ecran, `L'écran ${ecran} est inaccessible depuis la carrière.`);
}

jeu().ouvrirMessagesOvale();
assert.equal(jeu().ecran, 'social', "L'Ovale joueur ne rejoint pas l'écran social.");
assert.equal(jeu().ouvrirSocialSur, 'messages', "L'Ovale ne s'ouvre pas sur les messages.");

// Une sauvegarde historique peut ne pas avoir de numéro de semaine. Les
// succès doivent la réparer silencieusement, pas faire planter une action.
useGame.setState((etat) => ({
  joueur: etat.joueur ? { ...etat.joueur, semaine: undefined } : null,
}));
assert.doesNotThrow(() => jeu().verifierSucces(), 'Une ancienne sauvegarde fait planter les succès.');

console.log('OK — création joueur, écrans partagés, messagerie et ancienne sauvegarde vérifiés.');
