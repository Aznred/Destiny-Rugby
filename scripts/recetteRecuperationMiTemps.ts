import { effectifDuClub } from '../src/lib/effectif';
import { creerMatch } from '../src/lib/moteur/moteur';
import { optionsMoteurDesRegles, REGLES_MATCH_EN_LIGNE } from '../src/lib/ligue/matchCarriere';
import type { OptionsMatch } from '../src/lib/moteur/moteur';

/** Ballon mort après la sirène : le vrai moteur doit ouvrir la pause suivante. */
export function creerRecetteMiTemps(plus: Partial<OptionsMatch> = {}, regles = REGLES_MATCH_EN_LIGNE) {
  const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1),
    effectifDuClub('RC Toulon', 1), 24, 20, 'recuperation-mi-temps', undefined,
    { ...optionsMoteurDesRegles(regles), vent: null, ...plus });
  e.carriereDixMinutes = true;
  e.t = 2400; e.minute = 40; e.sirene = true;
  e.phase = 'ballonLibre'; e.minuteur = 10; e.placement = null; e.porteur = null; e.vol = null;
  e.ballon = { x: 60, y: .02 };
  const auteur = e.pions.find(p => p.cote === 'A' && p.numero === 10)!;
  e.ballonLibre = { vitesse: { x: 0, y: -5 }, hauteur: .2, vitesseVerticale: 0,
    orientation: 0, vitesseRotation: 0, dernierRebondSim: -10, depuis: { x: 30, y: 35 },
    intention: 'occupation', auteurCote: 'A', auteur, age: 0, rebonds: 0, dePenalite: false };
  e.pions.forEach((p, i) => {
    p.endurance = i % 3 === 0 ? 42 : i % 3 === 1 ? 91 : 100;
    p.sprint = 0; p.essoufle = true; p.usure = 0;
    p.pos = { x: 20, y: 30 }; p.cible = { ...p.pos }; p.vitesse = { x: 0, y: 0 };
  });
  return e;
}
