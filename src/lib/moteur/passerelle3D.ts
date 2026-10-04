import { avancer, creerMatch, geometrieMelee, TEMPS_MELEE, RITUEL_TIR } from './moteur';
import { ORDRE_MAILLOTS } from './entites';
import type { Coequipier } from '../effectif';
import type { EtatMatch } from './etat';
import { porteurPourAffichage } from './dynamique';

// Des noms de démonstration, tous inventés : l'aperçu affiche le nom du porteur.
const NOMS_APERCU: Record<string, string[]> = {
  France: ['Rémi Garnier', 'Loïc Lacombe', 'Hugo Roussel', 'Bastien Marchand', 'Théo Besson', 'Enzo Delmas', 'Paul Peyrat', 'Yanis Castaing',
    'Léo Lafitte', 'Matéo Ducasse', 'Nolan Barthe', 'Jules Soulier', 'Simon Moreau', 'Noa Vidal', 'Tom Carrère'],
  Angleterre: ['Jack Hartley', 'Owen Bennett', 'Harry Cole', 'Luke Whitmore', 'Sam Ashby', 'Ben Fenwick', 'Will Radcliffe', 'Joe Thorne',
    'Alex Mercer', 'George Lang', 'Max Pryce', 'Dan Holloway', 'Tom Sutton', 'Jamie Kerr', 'Ollie Blake'],
};

/** L'aperçu 3D lit exactement le moteur employé par les matchs Destiny Rugby. */
export function creerApercuDestiny(cle = 'rn26-destiny-26', cadenceDetaillee = true): EtatMatch {
  const equipe = (cote: string): Coequipier[] => ORDRE_MAILLOTS.map((poste, i) => ({
    id: `${cote}-${i}`, nom: (NOMS_APERCU[cote] ?? [])[i] ?? `${cote} ${i + 1}`, poste,
    age: 26, note: 76 + (i % 4), potentiel: 82, nation: cote,
    regen: false, jeuAuPied: i === 9 || i === 14 ? 86 : 65,
  }));
  // Cadence détaillée : en trois dimensions, chaque phase se joue à son rythme
  // de terrain (mêlée complète, passes à vitesse réelle, rituel du buteur).
  return creerMatch('France', 'Angleterre', equipe('France'), equipe('Angleterre'), 0, 0,
    cle, undefined, { scoreSurTerrain: true, tempsReel: false, niveau: 'pro', cadenceDetaillee, placementJoue: cadenceDetaillee });
}
export { avancer, porteurPourAffichage, geometrieMelee, TEMPS_MELEE, RITUEL_TIR };
export { preparerChenille, designerRelayeur } from './regroupements';
export { positionVol, passageAuxPoteaux, tirPasseEntreLesPoteaux } from './trajectoire';
