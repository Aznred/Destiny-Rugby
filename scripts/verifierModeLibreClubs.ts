import assert from 'node:assert/strict';
import { clubsAccessibles, etageAccessible, noteMaximale, MARGE_AMBITION } from '../src/lib/manager.js';
import { COMPETITIONS, clubParNom } from '../src/data/clubs.js';
import { useGame } from '../src/store/useGame.js';

// 1. Totalité des clubs dans le jeu
const tousClubs = COMPETITIONS.reduce((acc, c) => acc + c.clubs.length, 0);

// 2. En mode classé normal (prestige = 6), les clubs sont limités
const classes = clubsAccessibles(6, 1, { triche: false });
const maxForceAutorisee = noteMaximale(6) + MARGE_AMBITION;
assert.ok(classes.length > 0 && classes.length < tousClubs, `Mode classé devrait avoir des clubs restreints, obtenu: ${classes.length}`);
assert.ok(classes.every(c => c.force <= maxForceAutorisee));

// 3. En mode libre (triche = true), TOUS les clubs du jeu (1353 clubs) sont accessibles
const libres = clubsAccessibles(6, 1, { triche: true });
assert.equal(libres.length, tousClubs, `Tous les clubs doivent être accessibles en mode libre (${tousClubs} attendus, ${libres.length} obtenus)`);

// 3. Vérification des clubs qui étaient auparavant tronqués par la limite de 400
// Index 0 : club le plus fort (Top 14)
assert.equal(libres[0].club.nom, 'Stade Toulousain');
// Clubs de bas de tableau / régionaux (qui étaient > 400 et donc absents de la liste)
const nomsCibles = ['R C Sablais', 'Amicale Sportive Lisloise', 'CA Mauriennais'];
for (const nom of nomsCibles) {
  const trouve = libres.find(c => c.club.nom === nom);
  assert.ok(trouve, `Le club ${nom} doit être trouvable en mode libre`);
}

// 4. Recherche par ville / nom
const bayonne = libres.find(c => c.club.nom === 'Aviron Bayonnais');
assert.ok(bayonne, 'Aviron Bayonnais accessible');
assert.equal(bayonne.club.ville, 'Bayonne');

const clermont = libres.find(c => c.club.nom === 'ASM Clermont Auvergne');
assert.ok(clermont, 'ASM Clermont accessible');
assert.equal(clermont.club.ville, 'Clermont-Ferrand');

// 5. Test de création d'un manager en mode libre avec un club de division inférieure (ex: CA Mauriennais)
const jeu = () => useGame.getState();
jeu().reinitialiser();
jeu().creerManager({
  nom: 'Coach Libre Test',
  nation: 'France',
  club: 'CA Mauriennais',
  age: 40,
  libre: true,
});

assert.ok(jeu().manager, 'Manager doit être créé');
assert.equal(jeu().manager?.club, 'CA Mauriennais');
assert.equal(jeu().manager?.libre, true);

// 6. Test lorsqu'un manager en mode libre quitte son banc : tous les clubs restent accessibles
const bancsSansBanc = clubsAccessibles(jeu().manager!.prestige, jeu().manager!.saison, { triche: jeu().manager!.libre, limite: jeu().manager!.libre ? undefined : 60 });
assert.equal(bancsSansBanc.length, tousClubs, 'En mode libre sans banc, tous les clubs doivent rester accessibles');

console.log('Mode libre entraîneur : 1353/1353 clubs accessibles, recherche par ville, création et transition sans banc validées.');
