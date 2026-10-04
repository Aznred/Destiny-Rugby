// L'IDENTITÉ DE CHAQUE POSTE — « qui je suis, ce que mon numéro doit faire ».
//
// Un pilier ne réfléchit pas comme un demi d'ouverture. Jusqu'ici le moteur
// connaissait deux familles — avants et arrières — et distribuait les places
// d'une structure au plus proche : un pilier pouvait tenir le couloir de
// l'ailier, et un troisième ligne aile rester planté dans la cellule du ras.
// Ce tableau dit, pour chaque numéro, où il se range, s'il porte, s'il arrive
// le premier au regroupement, s'il gratte, s'il suit une percée, s'il saute.
//
// ⚠️ CE SONT DES PRÉFÉRENCES, PAS DES INTERDITS. Un pilier isolé au large après
// trois temps de jeu y défend quand même ; il n'ira simplement pas s'y ranger
// de lui-même quand une place existe près du ruck.

import type { Pion } from '../entites.js';

export type Famille =
  | 'pilier' | 'talonneur' | 'deuxiemeLigne' | 'flanker' | 'huit'
  | 'demiMelee' | 'ouvreur' | 'centre' | 'ailier' | 'arriere';

export function familleDe(p: Pick<Pion, 'numero' | 'avant'>): Famille {
  switch (p.numero) {
    case 1: case 3: return 'pilier';
    case 2: return 'talonneur';
    case 4: case 5: return 'deuxiemeLigne';
    case 6: case 7: return 'flanker';
    case 8: return 'huit';
    case 9: return 'demiMelee';
    case 10: return 'ouvreur';
    case 12: case 13: return 'centre';
    case 11: case 14: return 'ailier';
    case 15: return 'arriere';
    default: return p.avant ? 'deuxiemeLigne' : 'centre';
  }
}

/** Où un avant se range dans la structure d'attaque. */
export type PlaceAvant = 'proche' | 'lointaine' | 'bord';

export interface ProfilPoste {
  /** Sa cellule : celle du ras, la seconde, ou le bord (garde du petit côté, lien avec les trois-quarts). */
  place: PlaceAvant;
  /** Goût pour porter le ballon : pèse sur le choix du percuteur. */
  porte: number;
  /** Mètres d'avance qu'on lui compte pour arriver au regroupement en soutien. */
  soutienRuck: number;
  /** Points ajoutés à sa valeur de gratteur. */
  gratte: number;
  /** Mètres d'avance qu'on lui compte pour accompagner une percée. */
  suitLaPercee: number;
  /** Priorité de sauteur en touche. */
  saute: number;
  /** Au-delà de cette distance du regroupement, une place de la structure lui coûte cher. */
  largeurMax: number;
}

const PROFILS: Record<Famille, ProfilPoste> = {
  // 1 et 3 : gagner les collisions, sécuriser près du ruck, pick and go près de la ligne.
  pilier: { place: 'proche', porte: 1, soutienRuck: 2.5, gratte: 0, suitLaPercee: 0, saute: 0, largeurMax: 17 },
  // 2 : avant mobile dans le jeu, lanceur en touche, gratteur.
  talonneur: { place: 'proche', porte: 1.05, soutienRuck: 3.5, gratte: 5, suitLaPercee: 2, saute: 0, largeurMax: 22 },
  // 4 et 5 : porteurs puissants de la seconde cellule, leurres, premiers sauteurs.
  deuxiemeLigne: { place: 'lointaine', porte: 1.2, soutienRuck: 2.5, gratte: 1, suitLaPercee: 1, saute: 3, largeurMax: 30 },
  // 6 et 7 : les plus actifs — premiers au ruck, gratteurs, soutiens des trois-quarts.
  flanker: { place: 'bord', porte: 0.9, soutienRuck: 6, gratte: 8, suitLaPercee: 9, saute: 1.5, largeurMax: 70 },
  // 8 : porteur puissant, pointe de la seconde cellule, base de la mêlée.
  huit: { place: 'lointaine', porte: 1.4, soutienRuck: 3, gratte: 3, suitLaPercee: 6, saute: 1.2, largeurMax: 46 },
  demiMelee: { place: 'bord', porte: 0.5, soutienRuck: 0, gratte: 0, suitLaPercee: 8, saute: 0, largeurMax: 70 },
  ouvreur: { place: 'bord', porte: 0.6, soutienRuck: 0, gratte: 0, suitLaPercee: 4, saute: 0, largeurMax: 70 },
  centre: { place: 'bord', porte: 1, soutienRuck: 1, gratte: 1, suitLaPercee: 7, saute: 0, largeurMax: 70 },
  ailier: { place: 'bord', porte: 0.9, soutienRuck: 0.5, gratte: 0, suitLaPercee: 8, saute: 0, largeurMax: 70 },
  arriere: { place: 'bord', porte: 0.9, soutienRuck: 0, gratte: 0, suitLaPercee: 8, saute: 0, largeurMax: 70 },
};

export function profilDe(p: Pick<Pion, 'numero' | 'avant'>): ProfilPoste { return PROFILS[familleDe(p)]; }

/**
 * Ce que coûte à un avant une place de la structure : la distance à parcourir,
 * plus ce que son numéro pense de l'endroit. `genre` est la cellule de la
 * place ; `distanceDuRuck` sa distance latérale au regroupement.
 */
export function coutDeLaPlace(p: Pion, genre: PlaceAvant, distanceDuRuck: number, trajet: number): number {
  const profil = profilDe(p);
  let cout = trajet;
  if (profil.place !== genre) {
    // Un flanker dans une cellule, ça se fait ; un pilier au bord du terrain, non.
    cout += profil.place === 'bord' ? 6 : genre === 'bord' ? 22 : 9;
  }
  if (distanceDuRuck > profil.largeurMax) cout += (distanceDuRuck - profil.largeurMax) * 2.2;
  return cout;
}

/** Le meilleur porteur d'un groupe d'avants : celui qui a le moins porté, pondéré par son goût du ballon. */
export function choisirPorteur(candidats: Pion[]): Pion | undefined {
  let choisi: Pion | undefined; let note = Infinity;
  for (const p of candidats) {
    const n = (p.stats.courses + 1) / profilDe(p).porte - p.endurance / 400;
    if (n < note) { note = n; choisi = p; }
  }
  return choisi;
}
