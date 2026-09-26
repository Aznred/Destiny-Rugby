import { strict as assert } from 'node:assert';
import { MODE_ENTRAINEUR_PUBLIC, chantierVisible } from '../src/lib/modeDev';
import { useGame } from '../src/store/useGame';
import { annuaire } from '../src/lib/comptes';

const jeu = () => useGame.getState();

assert.equal(MODE_ENTRAINEUR_PUBLIC, true, 'Le mode entraîneur est encore marqué comme chantier privé.');
assert.equal(chantierVisible('manager'), true, 'La porte du mode entraîneur est fermée.');

jeu().reinitialiser();
jeu().creerManager({
  nom: 'Coach Navigation', nation: 'France', club: 'Stade Toulousain', age: 42, libre: true,
});

assert.ok(jeu().manager, "La création n'ouvre aucune carrière entraîneur.");
assert.equal(jeu().joueur, null, 'Une carrière joueur reste active en parallèle.');
assert.equal(jeu().ecran, 'manager', "La création n'arrive pas sur le bureau.");

for (const ecran of ['effectif', 'tableau'] as const) {
  jeu().setEcran(ecran);
  assert.equal(jeu().ecran, ecran, `L'écran ${ecran} est inaccessible depuis le banc.`);
}

jeu().ouvrirMessagesOvale();
assert.equal(jeu().ecran, 'manager', "L'Ovale fait quitter le bureau entraîneur.");
assert.equal(jeu().ouvrirSocialSur, 'messages', "L'Ovale ne s'ouvre pas sur les messages.");

const manager = jeu().manager!;
const destinataire = annuaire({ club: manager.club, saison: manager.saison, division: manager.division })
  .find(c => c.pseudo !== manager.nom);
assert.ok(destinataire, 'Aucun compte disponible dans l’annuaire du manager.');
await jeu().envoyerMessage(destinataire.pseudo, 'Bonjour, parlons rugby !');
assert.equal(jeu().conversations[destinataire.pseudo]?.[0]?.texte, 'Bonjour, parlons rugby !');
assert.equal(jeu().conversations[destinataire.pseudo]?.[1]?.de, 'lui', 'Le destinataire ne répond pas au manager.');

jeu().setEcran('accueil');
assert.equal(jeu().ecran, 'accueil', "Le retour à l'accueil échoue.");

console.log('OK — mode entraîneur public, création, bureau, effectif, résultats et messages libres accessibles.');
