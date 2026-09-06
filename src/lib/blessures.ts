// BLESSURES
//
// Le rugby casse des corps. Chaque match comporte un risque, d'autant plus
// grand que la forme est basse, que le joueur enchaîne les minutes et qu'il
// vieillit. Une blessure va de la semaine de repos à la fin de carrière.

import type { Blessure, GraviteBlessure, Joueur } from '../types.js';
import { langueCourante } from './i18n.js';

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
    noms: ['Commotions à répétition, le médecin est formel', 'Rachis cervical : l’arrêt est impératif', 'Genou détruit, l’articulation ne suivra plus'],
  },
];

const BLESSURES_ANGLAISES: Record<string, string> = {
  'Contusion à la cuisse': 'Thigh contusion',
  'Entorse de la cheville': 'Ankle sprain',
  'Élongation aux ischios': 'Hamstring strain',
  'Commotion (protocole)': 'Concussion (protocol)',
  'Côtes douloureuses': 'Sore ribs',
  'Déchirure musculaire': 'Muscle tear',
  'Fracture de la main': 'Hand fracture',
  'Entorse du genou': 'Knee sprain',
  'Luxation de l’épaule': 'Shoulder dislocation',
  'Fracture du nez et du plancher orbitaire': 'Nasal and orbital-floor fracture',
  'Rupture des ligaments croisés': 'Cruciate ligament rupture',
  'Fracture du péroné': 'Fibula fracture',
  'Rupture du tendon d’Achille': 'Achilles tendon rupture',
  'Hernie discale opérée': 'Surgery for a slipped disc',
  'Commotions à répétition, le médecin est formel': 'Repeated concussions, the doctor is unequivocal',
  'Rachis cervical : l’arrêt est impératif': 'Cervical spine injury: retirement is mandatory',
  'Genou détruit, l’articulation ne suivra plus': 'Destroyed knee: the joint will not hold up',
};

/** Nom affiché, sans modifier le libellé canonique sauvegardé avec la carrière. */
export function nomBlessure(b: Blessure): string {
  return langueCourante() === 'en' ? BLESSURES_ANGLAISES[b.nom] ?? b.nom : b.nom;
}

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
  const nom = nomBlessure(b);
  if (langueCourante() === 'en') {
    switch (b.gravite) {
      case 'legere': return `${nom}. Nothing serious: ${b.semaines} week${b.semaines > 1 ? 's' : ''} of treatment, then you are back.`;
      case 'moyenne': return `${nom}. The staff expect ${b.semaines} weeks out, it will be a long season.`;
      case 'saison': return `${nom}. Your season is over: surgery, rehabilitation and a serious mental test ahead.`;
      default: return `${nom}. The doctors agree: you will not play again. Your career ends here.`;
    }
  }
  switch (b.gravite) {
    case 'legere':
      return `${nom}. Rien de grave : ${b.semaines} semaine${b.semaines > 1 ? 's' : ''} de soins et tu reprends.`;
    case 'moyenne':
      return `${nom}. Le staff annonce ${b.semaines} semaines d’indisponibilité, la saison va être longue.`;
    case 'saison':
      return `${nom}. C’est terminé pour la saison : opération, rééducation, et un mental à toute épreuve.`;
    default:
      return `${nom}. Les médecins sont unanimes : tu ne rejoueras plus. Ta carrière s’arrête ici.`;
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
