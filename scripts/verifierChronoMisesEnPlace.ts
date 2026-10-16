// VÉRIFICATION DE LA DURÉE DES MATCHS ET DES ARRÊTS DU CHRONO PENDANT LES MISES EN PLACE
//
// 1. Durée d'un match de carrière solo portée à 12 minutes (720s, +2 minutes).
// 2. Arrêt du chronomètre pendant la mise en place des mêlées, touches, coups d'envoi et renvois 22.
// 3. Reprise du chrono dès que le jeu recommence (frappe, introduction, lancer/jeu).
//
// Lancer : npx vite-node scripts/verifierChronoMisesEnPlace.ts

import assert from 'node:assert/strict';
import {
  avancer, DT, DUREE_MATCH_SOLO, arretMiseEnPlaceChrono, creerMatch,
} from '../src/lib/moteur/moteur';
import { creerMatchDEmpreinte } from './outilsEmpreinte';
import type { EtatMatch } from '../src/lib/moteur/etat';

let totalControles = 0;
function verifier(condition: unknown, message: string): void {
  assert.ok(condition, message);
  totalControles++;
}

console.log('— 1. Durée maximale du match solo portée à 12 minutes (720 s) —');
verifier(DUREE_MATCH_SOLO === 720, 'DUREE_MATCH_SOLO est bien réglée sur 720 secondes (12 minutes)');

console.log('— 2. Chronomètre arrêté pendant l’installation du coup d’envoi —');
{
  const e = creerMatchDEmpreinte(0);
  verifier(e.phase === 'coupEnvoi', 'phase initiale : coupEnvoi');
  verifier(arretMiseEnPlaceChrono(e), 'arretMiseEnPlaceChrono est vrai pendant le coup d’envoi');
  const t0 = e.t;
  // Avancer pendant le coup d'envoi
  avancer(e, DT);
  verifier(e.t === t0, `l’horloge ne défile pas pendant le placement du coup d’envoi (t=${e.t}s)`);
  // Avancer jusqu'au départ du ballon
  let garde = 0;
  while (e.phase === 'coupEnvoi' && garde++ < 100) avancer(e, DT);
  verifier(e.phase !== 'coupEnvoi', `le ballon est frappé, phase suivante : ${e.phase}`);
  verifier(!arretMiseEnPlaceChrono(e), 'le jeu a recommencé, arretMiseEnPlaceChrono est faux');
  const tJeu = e.t;
  avancer(e, DT * 5);
  verifier(e.t > tJeu, `le chronomètre avance maintenant que le jeu est vivant (t=${e.t.toFixed(1)}s)`);
}

console.log('— 3. Chronomètre arrêté pendant la mise en place de la mêlée —');
{
  const e = creerMatchDEmpreinte(0);
  // Simuler un en-avant pour forcer une mêlée
  let garde = 0;
  while (e.phase !== 'melee' && !e.fini && garde++ < 2000) avancer(e, DT);
  if (e.phase === 'melee') {
    const etapeInitiale = e.conquete?.melee?.etape;
    verifier(
      etapeInitiale === 'placement' || etapeInitiale === 'liaison' || etapeInitiale === 'impact',
      `la mêlée commence par son installation (${etapeInitiale})`,
    );
    verifier(arretMiseEnPlaceChrono(e), 'arretMiseEnPlaceChrono est vrai pendant l’installation de la mêlée');
    const tMelee = e.t;
    avancer(e, DT);
    verifier(e.t === tMelee, `le chrono reste figé pendant la liaison/impact (t=${e.t}s)`);

    // Avancer jusqu'à l'introduction ou poussée
    let introGarde = 0;
    while (e.phase === 'melee' && arretMiseEnPlaceChrono(e) && introGarde++ < 100) avancer(e, DT);
    if (e.phase === 'melee') {
      const etapeActive = e.conquete?.melee?.etape;
      verifier(
        etapeActive === 'introduction' || etapeActive === 'poussee' || etapeActive === 'sortie',
        `l’introduction ou poussée est enclenchée (${etapeActive})`,
      );
      verifier(!arretMiseEnPlaceChrono(e), 'le chrono est débloqué dès l’introduction');
      const tIntro = e.t;
      avancer(e, DT * 4);
      verifier(e.t > tIntro, `l’horloge avance pendant la poussée/sortie de mêlée (t=${e.t.toFixed(1)}s)`);
    }
  }
}

console.log('— 4. Chronomètre arrêté pendant l’alignement de la touche —');
{
  const e = creerMatchDEmpreinte(1);
  let garde = 0;
  while (e.phase !== 'touche' && !e.fini && garde++ < 2000) avancer(e, DT);
  if (e.phase === 'touche') {
    verifier(arretMiseEnPlaceChrono(e), 'arretMiseEnPlaceChrono est vrai pendant la formation de la touche');
    const tTouche = e.t;
    avancer(e, DT);
    verifier(e.t === tTouche, `l’horloge ne bouge pas pendant que l’alignement se met en place (t=${e.t}s)`);
    // Avancer jusqu'au lancer / reprise
    let lanceGarde = 0;
    while (e.phase === 'touche' && lanceGarde++ < 150) avancer(e, DT);
    verifier(e.phase !== 'touche', `la touche est jouée, nouvelle phase : ${e.phase}`);
    verifier(!arretMiseEnPlaceChrono(e), 'le chrono reprend dès la sortie de touche');
  }
}

console.log('— 5. Chronomètre arrêté pendant le renvoi aux 22 —');
{
  const dummyState: EtatMatch = {
    phase: 'renvoi22',
  } as unknown as EtatMatch;
  verifier(arretMiseEnPlaceChrono(dummyState), 'arretMiseEnPlaceChrono vrai pour renvoi22');
}

console.log('— 6. Chronomètre arrêté pendant miTemps, bagarre et TMO —');
{
  for (const phase of ['miTemps', 'bagarre', 'tmo'] as const) {
    const dummyState = { phase } as unknown as EtatMatch;
    verifier(arretMiseEnPlaceChrono(dummyState), `arretMiseEnPlaceChrono vrai pour ${phase}`);
  }
}

console.log(`OK — ${totalControles} contrôles réussis pour la durée et l’arrêt du chronomètre en mise en place.`);
