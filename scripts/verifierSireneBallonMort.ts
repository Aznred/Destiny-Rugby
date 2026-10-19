import assert from 'node:assert/strict';
import { avancer, DT } from '../src/lib/moteur/moteur';
import { creerMatchDEmpreinte } from './outilsEmpreinte';
import type { EtatMatch } from '../src/lib/moteur/etat';
import { optionsMoteurDesRegles } from '../src/lib/ligue/matchCarriere';

assert.equal(optionsMoteurDesRegles().reglesSirene, 'ballonMort');
assert.equal(optionsMoteurDesRegles(11).reglesSirene, 'transformation', 'Les directs déjà ouverts gardent leurs règles.');

function ballonLibre(periode: number, touche = false, penalite = false): EtatMatch {
  const e = creerMatchDEmpreinte(0, { dureeMiTempsSolo: 3, vent: null });
  e.periode = periode; e.t = periode * 2400 + 400; e.sirene = true;
  e.secondesActivesSolo = 10000;
  e.phase = 'ballonLibre'; e.minuteur = 10; e.placement = null; e.porteur = null; e.vol = null;
  e.ballon = { x: 60, y: touche ? .02 : 35 };
  for (const p of e.pions) { p.pos = { x: 20, y: 30 }; p.cible = { ...p.pos }; }
  const auteur = e.pions.find(p => p.cote === 'A' && p.numero === 10)!;
  e.ballonLibre = { vitesse: { x: 0, y: touche ? -5 : 0 }, hauteur: .2, vitesseVerticale: 0,
    orientation: 0, vitesseRotation: 0, dernierRebondSim: -10, depuis: { x: 30, y: 35 },
    intention: 'occupation', auteurCote: 'A', auteur, age: 0, rebonds: 0, dePenalite: penalite };
  return e;
}

for (const periode of [1, 2]) {
  const vivant = ballonLibre(periode);
  vivant.t = periode * 2400 - DT;
  vivant.sirene = false;
  avancer(vivant, DT);
  assert.equal(vivant.sirene, true);
  assert.equal(vivant.periode, periode, 'Franchir précisément 40/80 minutes ne siffle pas la période.');
  vivant.t = periode * 2400 + 400;
  avancer(vivant, DT);
  assert.equal(vivant.periode, periode);
  assert.equal(vivant.fini, false, 'Aucune minuterie de secours ne coupe le ballon en jeu.');
  assert.equal(vivant.phase, 'ballonLibre');
  const sortie = ballonLibre(periode, true);
  avancer(sortie, DT);
  assert.equal(sortie.phase, periode === 1 ? 'miTemps' : 'fini', 'Une touche ordinaire termine la période.');
  const penalite = ballonLibre(periode, true, true);
  avancer(penalite, DT);
  assert.equal(penalite.periode, periode);
  assert.equal(penalite.phase, 'touche', 'Une pénaltouche se joue après la sirène.');
  assert.equal(penalite.possession, 'A');
  // Le drapeau arcade ne doit pas prolonger un ballon devenu injouable dans un maul.
  const maul = ballonLibre(periode);
  maul.finSurSortieOuEnAvant = true; maul.phase = 'maul'; maul.ballonLibre = null; maul.minuteur = 0;
  maul.possession = 'A'; maul.maul = { avance: 0 } as NonNullable<EtatMatch['maul']>;
  for (const p of maul.pions) p.puissance = p.cote === 'A' ? 1 : 99;
  maul.rng = () => .5;
  avancer(maul, DT);
  assert.equal(maul.phase, periode === 1 ? 'miTemps' : 'fini', 'Maul coffré : la mêlée accordée termine la période.');
}
const ancien = ballonLibre(2);
ancien.reglesSirene = 'historique'; avancer(ancien, DT);
assert.equal(ancien.fini, true, 'Les anciennes rencontres explicitement versionnées gardent leur rejoue.');
console.log('Sirène : ballon vivant, deux garde-fous, touche, pénaltouche, maul coffré et ancien moteur validés pour les deux périodes.');
