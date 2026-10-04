import type { Vol } from './etat.js';
import { AXE, EN_BUT, LARGEUR, LIGNE_A, LIGNE_B, sens, type Cote, type Vec } from './terrain.js';

export const GRAVITE_BALLON = 9.81;
/** La même trajectoire sert au moteur et à sa représentation en trois dimensions. */
export function positionVol(vol: Pick<Vol, 'de' | 'vers' | 'duree' | 'ecoule' | 'type' | 'intention' | 'hauteur'>, avance = 0) {
  const t = Math.max(0, Math.min(vol.duree, vol.ecoule + avance));
  const u = t / Math.max(.001, vol.duree);
  const pied = vol.type === 'pied';
  // Traînée horizontale : vitesse décroissante, point de chute inchangé.
  const k = pied ? (1 - Math.exp(-.18 * t)) / (1 - Math.exp(-.18 * vol.duree)) : u;
  const bas = vol.intention === 'rasant';
  const depart = pied ? .26 : 1.05, arrivee = pied ? .12 : 1.05;
  const h = pied && !bas
    ? depart + ((arrivee - depart) / vol.duree + .5 * GRAVITE_BALLON * vol.duree) * t - .5 * GRAVITE_BALLON * t * t
    : depart + (arrivee - depart) * u + 4 * Math.max(.08, vol.hauteur) * u * (1 - u);
  return { x: vol.de.x + (vol.vers.x - vol.de.x) * k, y: vol.de.y + (vol.vers.y - vol.de.y) * k, hauteur: h };
}

// ---------------------------------------------------------------------------
// LES TIRS AU BUT
// ---------------------------------------------------------------------------

/** Demi-écart entre les poteaux (5,6 m) et hauteur de la barre transversale. */
export const DEMI_POTEAUX = 2.8;
export const HAUTEUR_BARRE = 3;

/** Hauteur d'un coup de pied `t` secondes après la frappe (même loi que `positionVol`). */
function hauteurPied(duree: number, t: number): number {
  return .26 + ((.12 - .26) / duree + .5 * GRAVITE_BALLON * duree) * t - .5 * GRAVITE_BALLON * t * t;
}

/**
 * Où le ballon traverse le plan des poteaux : écart à l'axe et hauteur.
 * `null` s'il retombe avant la ligne de but.
 */
export function passageAuxPoteaux(
  vol: Pick<Vol, 'de' | 'vers' | 'duree'>, cote: Cote,
): { ecart: number; hauteur: number } | null {
  const ligne = cote === 'A' ? LIGNE_B : LIGNE_A;
  const part = (ligne - vol.de.x) / (vol.vers.x - vol.de.x);
  if (!Number.isFinite(part) || part <= 0 || part > 1) return null;
  // Inverse de la traînée de `positionVol` : l'instant où le ballon a couvert cette part du trajet.
  const t = -Math.log(1 - part * (1 - Math.exp(-.18 * vol.duree))) / .18;
  return { ecart: vol.de.y + (vol.vers.y - vol.de.y) * part - AXE, hauteur: hauteurPied(vol.duree, t) };
}

/** Le résultat qu'un spectateur lirait sur la trajectoire seule. */
export function tirPasseEntreLesPoteaux(vol: Pick<Vol, 'de' | 'vers' | 'duree'>, cote: Cote): boolean {
  const p = passageAuxPoteaux(vol, cote);
  return !!p && Math.abs(p.ecart) < DEMI_POTEAUX && p.hauteur > HAUTEUR_BARRE;
}

const bornerDuree = (d: number) => Math.max(1.65, Math.min(2.55, d));

/**
 * LA TRAJECTOIRE D'UN TIR EST CELLE DE SON RÉSULTAT.
 *
 * ⚠️ ON VISE LA TRAVERSÉE DES POTEAUX, PAS LE POINT DE CHUTE. Le moteur décide
 * d'abord si le tir est réussi ; la trajectoire doit ensuite MONTRER ce
 * résultat, sans quoi l'écran et le tableau d'affichage racontent deux matchs.
 * Un point de chute « derrière les poteaux, dans l'axe » ne garantit rien : vu
 * d'un tee excentré, la droite qui y mène coupe la ligne de but plusieurs
 * mètres à côté. On choisit donc le point où le ballon franchit le plan des
 * poteaux, puis on prolonge jusqu'à sa retombée dans l'en-but.
 *
 * - réussi : entre les poteaux (± 1,6 m autour de l'axe), au-dessus de la barre ;
 * - manqué : à gauche ou à droite (au moins un mètre dehors), ou trop court
 *   quand le tir est lointain — le ballon retombe devant la ligne.
 *
 * `r1`, `r2`, `r3` : trois tirages uniformes fournis par l'appelant.
 */
export function viseeTir(
  de: Vec, cote: Cote, reussi: boolean, r1: number, r2: number, r3: number,
): { vers: Vec; duree: number; issue: 'dedans' | 'gauche' | 'droite' | 'court' } {
  const s = sens(cote);
  const ligne = cote === 'A' ? LIGNE_B : LIGNE_A;
  const jusquALaLigne = Math.max(1, (ligne - de.x) * s);
  if (!reussi && jusquALaLigne > 36 && r2 < .34) {
    // Trop court : il retombe devant la ligne, à peu près dans l'axe des poteaux.
    const vers = { x: ligne - s * (1.5 + r3 * 5), y: AXE + (r1 - .5) * 9 };
    return { vers, duree: bornerDuree(1.35 + Math.hypot(vers.x - de.x, vers.y - de.y) / 34), issue: 'court' };
  }
  const coteRate = r1 < .5 ? -1 : 1;
  const ecart = reussi ? (r2 - .5) * 3.2 : coteRate * (DEMI_POTEAUX + 1.1 + r2 * 3.4);
  // Prolongement jusqu'à la retombée, sans sortir de l'en-but ni du terrain.
  let recul = Math.min(EN_BUT - 1.5, 6 + r3 * 3.5);
  const yA = (prolonge: number) => de.y + (AXE + ecart - de.y) * (jusquALaLigne + prolonge) / jusquALaLigne;
  while (recul > 1 && (yA(recul) < 1.5 || yA(recul) > LARGEUR - 1.5)) recul -= .5;
  const vers = { x: ligne + s * recul, y: yA(recul) };
  let duree = bornerDuree(1.35 + Math.hypot(vers.x - de.x, vers.y - de.y) / 34);
  // Réussi : il franchit la barre avec de la marge, quitte à monter plus haut.
  if (reussi) {
    while (duree < 3.6 && (passageAuxPoteaux({ de, vers, duree }, cote)?.hauteur ?? 0) < HAUTEUR_BARRE + .8) duree += .08;
  }
  return { vers, duree, issue: reussi ? 'dedans' : coteRate < 0 ? 'gauche' : 'droite' };
}
