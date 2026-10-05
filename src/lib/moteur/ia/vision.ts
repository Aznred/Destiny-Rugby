// CE QUE LE PORTEUR VOIT DEVANT LUI — la lecture locale (IA de niveau 3)
//
// `lecture.ts` compte les joueurs couloir par couloir : c'est la carte que le
// demi de mêlée consulte avant d'annoncer un jeu. Ici, c'est le regard de
// celui qui a le ballon dans les mains, à chaque pas : trois rayons devant lui
// (gauche, axe, droite), l'intervalle le plus ouvert à portée de course, et
// le surnombre à son épaule — deux contre un, trois contre deux.
//
// ⚠️ FONCTIONS PURES, AUCUN TIRAGE. Ce que le joueur EN FAIT (et s'il le voit à
// temps) se décide dans `moteur.ts`, avec ses statistiques.
import type { EtatMatch } from '../etat.js';
import type { Pion } from '../entites.js';
import { LARGEUR, adverse, sens, type Cote, type Vec } from '../terrain.js';
import { attaquantLibre, defenseurPresent } from './lecture.js';

/** La lecture locale est-elle active dans ce match ? (niveau figé à la création) */
export function lectureLocale(e: Pick<EtatMatch, 'ia'>): boolean { return (e.ia ?? 1) >= 3; }

export interface Rayon {
  /** Angle par rapport à l'axe d'attaque, en radians (négatif : vers les y décroissants). */
  angle: number;
  /** Mètres libres le long du rayon avant le premier défenseur (la portée s'il n'y en a pas). */
  libre: number;
  defenseur: Pion | null;
}

export interface Intervalle {
  /** Largeur du trou entre les deux défenseurs (ou entre un défenseur et la touche), en mètres. */
  largeur: number;
  /** Où courir pour le prendre. */
  y: number;
  /** Distance du rideau à cet endroit, et ce qui couvre derrière (défenseurs à moins de quinze mètres dans l'axe du trou). */
  profondeur: number;
  couverture: number;
  /** Les deux défenseurs qui le bordent (`null` : la touche). */
  bords: [Pion | null, Pion | null];
}

export interface VueLocale {
  rayons: { gauche: Rayon; axe: Rayon; droite: Rayon };
  /** Le défenseur le plus menaçant devant, et sa distance. */
  devant: Pion | null;
  distance: number;
  /** Le meilleur intervalle à portée de course, s'il y en a un. */
  intervalle: Intervalle | null;
}

const PORTEE = 14;
const DEMI_COULOIR = 1.25;

/** Où sera ce défenseur dans un tiers de seconde : on lit sa course, pas sa photo. */
function bientot(d: Pion): Vec { return { x: d.pos.x + d.vitesse.x * 0.3, y: d.pos.y + d.vitesse.y * 0.3 }; }

function lancerRayon(p: Pion, defense: Pion[], angle: number): Rayon {
  const s = sens(p.cote);
  const ux = Math.cos(angle) * s, uy = Math.sin(angle);
  let libre = PORTEE, touche: Pion | null = null;
  for (const d of defense) {
    const q = bientot(d);
    const rx = q.x - p.pos.x, ry = q.y - p.pos.y;
    const le_long = rx * ux + ry * uy;
    if (le_long < 0.4 || le_long > libre) continue;
    if (Math.abs(-rx * uy + ry * ux) < DEMI_COULOIR) { libre = le_long; touche = d; }
  }
  // La touche arrête aussi un rayon.
  if (uy !== 0) {
    const bord = uy > 0 ? (LARGEUR - 1.5 - p.pos.y) / uy : (1.5 - p.pos.y) / uy;
    if (bord >= 0 && bord < libre) { libre = bord; touche = null; }
  }
  return { angle, libre, defenseur: touche };
}

/**
 * LE REGARD DU PORTEUR : trois rayons, et le meilleur intervalle du rideau.
 *
 * Un intervalle se mesure LÀ OÙ SONT LES DÉFENSEURS, entre deux voisins du
 * rideau (ou entre le dernier et la touche), une fois retiré ce que chacun
 * peut refermer d'un pas de côté. Il ne compte que si le porteur peut
 * l'atteindre sans courir en travers.
 */
export function regarderDevant(e: EtatMatch, p: Pion): VueLocale {
  const s = sens(p.cote);
  const defense = e.pions.filter((d) => d.cote !== p.cote && d.surLeTerrain && defenseurPresent(e, d));
  const rayons = {
    gauche: lancerRayon(p, defense, -0.42),
    axe: lancerRayon(p, defense, 0),
    droite: lancerRayon(p, defense, 0.42),
  };
  let devant: Pion | null = null, dMin = Infinity;
  const rideau: { d: Pion; y: number; avant: number }[] = [];
  for (const d of defense) {
    const q = bientot(d);
    const avant = (q.x - p.pos.x) * s;
    if (avant < -0.8 || avant > 13) continue;
    const dist = Math.hypot(q.x - p.pos.x, q.y - p.pos.y);
    if (dist < dMin && Math.abs(q.y - p.pos.y) < 6 + avant * 0.35) { dMin = dist; devant = d; }
    if (Math.abs(q.y - p.pos.y) < 16) rideau.push({ d, y: q.y, avant });
  }
  rideau.sort((a, b) => a.y - b.y);
  let intervalle: Intervalle | null = null, note = 0;
  for (let i = 0; i <= rideau.length; i++) {
    const g = rideau[i - 1], dr = rideau[i];
    if (!g && !dr) break;
    const yG = g ? g.y : 0, yD = dr ? dr.y : LARGEUR;
    // Chaque défenseur referme un mètre de son côté ; la touche ne referme rien, mais on n'y court pas collé.
    const largeur = yD - yG - (g ? 1 : 1.5) - (dr ? 1 : 1.5);
    if (largeur < 2.6) continue;
    const y = g && dr ? (yG + yD) / 2 : g ? Math.min(LARGEUR - 2.5, yG + 1 + Math.min(4.5, largeur / 2)) : Math.max(2.5, yD - 1 - Math.min(4.5, largeur / 2));
    const profondeur = Math.max(1.5, ((g?.avant ?? dr!.avant) + (dr?.avant ?? g!.avant)) / 2);
    // Atteignable : pas plus d'un mètre de travers par mètre de profondeur, à peu près.
    const travers = Math.abs(y - p.pos.y);
    if (travers > 1.2 + profondeur * 0.95) continue;
    let couverture = 0;
    for (const d of defense) {
      const avant = (d.pos.x - p.pos.x) * s;
      if (avant > profondeur + 1.5 && avant < profondeur + 16 && Math.abs(d.pos.y - y) < 7) couverture++;
    }
    const n = Math.min(largeur, 9) - travers * 0.55 - couverture * 0.9 + (!g || !dr ? -0.6 : 0);
    if (n > note) { note = n; intervalle = { largeur, y, profondeur, couverture, bords: [g?.d ?? null, dr?.d ?? null] }; }
  }
  return { rayons, devant, distance: devant ? dMin : 99, intervalle };
}

/**
 * CE QUE VAUT LE REGARD D'UN JOUEUR, de 0 à 1. La vision d'abord ; le poste
 * ensuite — un ouvreur passe sa vie à lire un rideau, un pilier beaucoup moins.
 * C'est ce qui donne du prix à la statistique : un bon lecteur voit un trou de
 * trois mètres tout de suite, un mauvais a besoin d'un boulevard, et le voit tard.
 */
export function niveauDeLecture(p: Pion): number {
  const poste = p.numero === 10 ? 0.14 : p.numero === 9 || p.numero === 12 || p.numero === 15 ? 0.08
    : p.numero === 13 || p.numero === 11 || p.numero === 14 ? 0.04 : p.numero >= 6 && p.numero <= 8 ? -0.04 : -0.14;
  return Math.max(0.05, Math.min(1, (p.vision - 35) / 55 + poste));
}

export interface Surnombre {
  /** De quel côté du porteur (+1 : vers les y croissants). */
  cote: 1 | -1;
  /** Les partenaires qui s'offrent, du plus proche au plus large. */
  soutiens: Pion[];
  /** Les défenseurs qui peuvent encore intervenir sur ce côté, du plus proche du porteur au plus large. */
  defenseurs: Pion[];
}

/**
 * LE SURNOMBRE À L'ÉPAULE DU PORTEUR : deux contre un, trois contre deux.
 *
 * On compte, d'un côté du porteur, les partenaires qui peuvent VRAIMENT
 * recevoir (derrière lui, à distance de passe, pas marqués à la culotte par
 * la touche) et les défenseurs qui peuvent encore jouer un rôle dans ce
 * couloir. `null` quand il n'y a pas un attaquant de plus que de défenseurs.
 */
export function lireLeSurnombre(e: EtatMatch, p: Pion): Surnombre | null {
  const s = sens(p.cote);
  let meilleur: Surnombre | null = null, marge = 0;
  for (const cote of [1, -1] as const) {
    const soutiens = e.pions.filter((q) => {
      if (q === p || q.cote !== p.cote || !attaquantLibre(q)) return false;
      const large = (q.pos.y - p.pos.y) * cote, retrait = (p.pos.x - q.pos.x) * s;
      return large >= 2.5 && large <= 24 && retrait >= -0.4 && retrait <= 10;
    }).sort((a, b) => Math.abs(a.pos.y - p.pos.y) - Math.abs(b.pos.y - p.pos.y)).slice(0, 3);
    if (!soutiens.length) continue;
    const bord = soutiens[soutiens.length - 1].pos.y;
    const defenseurs = e.pions.filter((d) => {
      if (d.cote === p.cote || !d.surLeTerrain || !defenseurPresent(e, d)) return false;
      const avant = (d.pos.x - p.pos.x) * s, large = (d.pos.y - p.pos.y) * cote;
      return avant >= -1.2 && avant <= 14 && large >= -3 && large <= (bord - p.pos.y) * cote + 5;
    }).sort((a, b) => Math.abs(a.pos.y - p.pos.y) - Math.abs(b.pos.y - p.pos.y));
    if (!defenseurs.length || defenseurs.length > 2) continue;
    const m = 1 + soutiens.length - defenseurs.length;
    if (m >= 1 && m > marge) { marge = m; meilleur = { cote, soutiens, defenseurs }; }
  }
  return meilleur;
}

/** Un défenseur se tient-il dans la ligne de passe entre ces deux joueurs ? */
export function ligneDePasseCoupee(e: EtatMatch, de: Pion, vers: Pion, camp: Cote = adverse(de.cote)): Pion | null {
  const dx = vers.pos.x - de.pos.x, dy = vers.pos.y - de.pos.y, d2 = dx * dx + dy * dy || 1;
  for (const d of e.pions) {
    if (d.cote !== camp || !d.surLeTerrain || !defenseurPresent(e, d)) continue;
    const q = bientot(d);
    const t = ((q.x - de.pos.x) * dx + (q.y - de.pos.y) * dy) / d2;
    if (t < 0.2 || t > 0.92) continue;
    const ecart = Math.hypot(q.x - (de.pos.x + dx * t), q.y - (de.pos.y + dy * t));
    if (ecart < 1.3) return d;
  }
  return null;
}
