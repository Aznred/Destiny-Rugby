// BLESSURES
//
// Le rugby casse des corps. Chaque match comporte un risque, d'autant plus
// grand que la forme est basse, que le joueur enchaîne les minutes et qu'il
// vieillit. Une blessure va de la semaine de repos à la fin de carrière.

import type { Blessure, GraviteBlessure, Joueur } from '../types';

interface Modele {
  gravite: GraviteBlessure;
  noms: string[];
  semaines: [number, number];
  poids: number; // fréquence relative
}

const MODELES: Modele[] = [
  {
    gravite: 'legere', poids: 58, semaines: [1, 3],
    noms: ['Contusion à la cuisse', 'Entorse de la cheville', 'Élongation aux ischios', 'Commotion (protocole)', 'Côtes douloureuses'],
  },
  {
    gravite: 'moyenne', poids: 28, semaines: [4, 10],
    noms: ['Déchirure musculaire', 'Fracture de la main', 'Entorse du genou', 'Luxation de l’épaule', 'Fracture du nez et du plancher orbitaire'],
  },
  {
    gravite: 'saison', poids: 12, semaines: [24, 40],
    noms: ['Rupture des ligaments croisés', 'Fracture du péroné', 'Rupture du tendon d’Achille', 'Hernie discale opérée'],
  },
  {
    gravite: 'carriere', poids: 2, semaines: [99, 99],
    noms: ['Commotions à répétition — le médecin est formel', 'Rachis cervical : l’arrêt est impératif', 'Genou détruit, l’articulation ne suivra plus'],
  },
];

// Risque de blessure sur UN match. ~4 % pour un joueur frais de 25 ans, ça
// grimpe vite quand la forme s'effondre ou que le corps a passé 32 ans.
export function risqueDeBlessure(j: Joueur, minutes: number, intensite = 1): number {
  const usure = Math.max(0, (60 - j.forme) / 100); // forme basse = danger
  const age = Math.max(0, (j.age - 28) * 0.004);
  const charge = (minutes / 80) * 0.035;
  const resistance = j.attributs.endurance / 2500; // un athlète tient mieux
  return Math.max(0.005, (0.012 + charge + usure * 0.09 + age) * intensite - resistance);
}

// Tire une blessure (gravité + durée). `chance` permet de tester.
export function tirerBlessure(alea = Math.random(), alea2 = Math.random()): Blessure {
  const total = MODELES.reduce((a, m) => a + m.poids, 0);
  let seuil = alea * total;
  let modele = MODELES[0];
  for (const m of MODELES) {
    seuil -= m.poids;
    if (seuil <= 0) { modele = m; break; }
  }
  const [min, max] = modele.semaines;
  return {
    nom: modele.noms[Math.floor(alea2 * modele.noms.length)],
    gravite: modele.gravite,
    semaines: min + Math.floor(alea2 * (max - min + 1)),
  };
}

export function messageBlessure(b: Blessure): string {
  switch (b.gravite) {
    case 'legere':
      return `${b.nom}. Rien de grave : ${b.semaines} semaine${b.semaines > 1 ? 's' : ''} de soins et tu reprends.`;
    case 'moyenne':
      return `${b.nom}. Le staff annonce ${b.semaines} semaines d’indisponibilité — la saison va être longue.`;
    case 'saison':
      return `${b.nom}. C’est terminé pour la saison : opération, rééducation, et un mental à toute épreuve.`;
    default:
      return `${b.nom}. Les médecins sont unanimes : tu ne rejoueras plus. Ta carrière s’arrête ici.`;
  }
}

// Effet immédiat d'une blessure sur le joueur.
export function deltasBlessure(b: Blessure): Partial<Record<'forme' | 'moral', number>> {
  switch (b.gravite) {
    case 'legere': return { forme: -8, moral: -4 };
    case 'moyenne': return { forme: -22, moral: -12 };
    case 'saison': return { forme: -40, moral: -25 };
    default: return { forme: -50, moral: -40 };
  }
}
