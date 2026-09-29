import assert from 'node:assert/strict';
import { effectifDuClub } from '../src/lib/effectif';
import { avancer, creerMatch, DT } from '../src/lib/moteur/moteur';
import { distance } from '../src/lib/moteur/terrain';

let plaquagesVus = 0;
let ecartContactMax = 0;
let chutesCouplees = 0;
let ballonsLibres = 0;
let rebonds = 0;
let deviations = 0;
let hauteurMax = 0;
let penetrationsGraves = 0;

for (let matchNumero = 0; matchNumero < 3; matchNumero++) {
  const e = creerMatch('Stade Toulousain', 'Stade Rochelais',
    effectifDuClub('Stade Toulousain', 1), effectifDuClub('Stade Rochelais', 1),
    27, 26, `contacts-et-rebonds-${matchNumero}`, undefined,
    { tempsReel: true, scoreSurTerrain: false });
  let dernierBallonLibre = e.ballonLibre;
  let derniereDirection: number | undefined;
  let dernierNombreRebonds = 0;
  for (let pas = 0; !e.fini && pas < 80_000; pas++) {
    const ancienRuck = e.ruck;
    avancer(e, DT);
    if (e.phase === 'ruck' && e.ruck?.porteurId && e.ruck.plaqueurId && e.ruck !== ancienRuck) {
      const porteur = e.pions.find((p) => p.id === e.ruck?.porteurId);
      const plaqueur = e.pions.find((p) => p.id === e.ruck?.plaqueurId);
      if (porteur && plaqueur) {
        plaquagesVus++;
        ecartContactMax = Math.max(ecartContactMax, distance(porteur.pos, plaqueur.pos));
        if (porteur.corps && plaqueur.corps) chutesCouplees++;
      }
    }
    if (e.phase === 'jeuCourant' && e.porteur && pas % 8 === 0) {
      const joueurs = e.pions.filter((p) => p.surLeTerrain && !p.corps && p.sanction <= 0);
      for (let i = 0; i < joueurs.length; i++) {
        for (let j = i + 1; j < joueurs.length; j++) {
          if (joueurs[i]!.cote !== joueurs[j]!.cote && distance(joueurs[i]!.pos, joueurs[j]!.pos) < .4) {
            penetrationsGraves++;
            if (penetrationsGraves <= 5) console.log('penetration', joueurs[i]!.numero, joueurs[j]!.numero,
              distance(joueurs[i]!.pos, joueurs[j]!.pos).toFixed(2), e.porteur?.numero, e.vol?.type, e.gardeRuck);
          }
        }
      }
    }
    const libre = e.ballonLibre;
    if (!libre || e.phase !== 'ballonLibre') {
      dernierBallonLibre = null;
      derniereDirection = undefined;
      continue;
    }
    if (libre !== dernierBallonLibre) {
      ballonsLibres++;
      dernierNombreRebonds = 0;
      derniereDirection = undefined;
    }
    hauteurMax = Math.max(hauteurMax, libre.hauteur);
    const direction = Math.atan2(libre.vitesse.y, libre.vitesse.x);
    if (libre.rebonds > dernierNombreRebonds) {
      rebonds += libre.rebonds - dernierNombreRebonds;
      if (derniereDirection !== undefined && Math.abs(Math.atan2(Math.sin(direction - derniereDirection), Math.cos(direction - derniereDirection))) > .05) deviations++;
    }
    dernierNombreRebonds = libre.rebonds;
    derniereDirection = direction;
    dernierBallonLibre = libre;
  }
  assert.ok(e.fini, 'Le match doit se terminer sans bloquer sur un ballon au sol.');
}

assert.ok(plaquagesVus > 30, 'Observer assez de vrais plaquages.');
assert.ok(ecartContactMax <= 1.2, `Plaquage déclenché à ${ecartContactMax.toFixed(2)} m.`);
assert.ok(chutesCouplees > 20, 'Le porteur et son plaqueur doivent tomber ensemble.');
assert.equal(penetrationsGraves, 0, 'Deux adversaires debout ne doivent pas se traverser.');
assert.ok(ballonsLibres > 8 && rebonds > 8 && deviations > 2 && hauteurMax > .3,
  'Les ballons au sol doivent faire de vrais rebonds orientés et visibles.');

console.log(`OK — ${plaquagesVus} contacts à 1,2 m maximum, ${chutesCouplees} chutes couplées, `
  + `${ballonsLibres} ballons libres, ${rebonds} rebonds dont ${deviations} déviés, `
  + `hauteur maximale ${hauteurMax.toFixed(2)} m.`);
