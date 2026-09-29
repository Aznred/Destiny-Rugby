import assert from 'node:assert/strict';
import { effectifDuClub } from '../src/lib/effectif';
import { avancer, creerMatch, DT } from '../src/lib/moteur/moteur';
import type { IntentionPied } from '../src/lib/moteur/etat';
import type { Cote } from '../src/lib/moteur/terrain';

function verifierTouche(camp: Cote, departX: number, sortieX: number, intention: IntentionPied, pour: Cote) {
  const e = creerMatch(
    'Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1),
    effectifDuClub('RC Toulon', 1), 0, 0, `touche-22-${camp}-${intention}`,
  );
  const auteur = e.pions.find(p => p.cote === camp && p.surLeTerrain)!;
  const depart = { x: departX, y: 18 };
  const arrivee = { x: sortieX, y: -1 };
  e.phase = 'ballonEnLAir';
  e.porteur = null;
  e.vol = { de: depart, vers: arrivee, duree: DT, ecoule: 0, hauteur: .5, type: 'pied', intention, auteur, receveur: null };
  avancer(e, DT);
  assert.equal(e.phase, 'touche');
  assert.equal(e.possession, pour);
  assert.equal(e.ballon.x, sortieX);
}

// Un dégagement direct depuis ses 22 ne devient jamais un 50/22, même s'il
// sort très loin dans les 22 adverses. La touche reste au point de sortie.
verifierTouche('A', 20, 95, 'degagement', 'B');
verifierTouche('B', 102, 27, 'degagement', 'A');
// Le geste 50/22 représente au contraire la trajectoire indirecte du moteur.
verifierTouche('A', 40, 95, 'cinquanteVingtDeux', 'A');

console.log('OK — dégagements directs depuis les 22 et 50/22.');
