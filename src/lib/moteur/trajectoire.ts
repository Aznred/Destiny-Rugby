import type { Vol } from './etat.js';
import { AXE, EN_BUT, LARGEUR, LIGNE_A, LIGNE_B, sens, type Cote, type Vec } from './terrain.js';

export const GRAVITE_BALLON = 9.81;
/** La même trajectoire sert au moteur et à sa représentation en trois dimensions. */
export function positionVol(vol: Pick<Vol, 'de' | 'vers' | 'duree' | 'ecoule' | 'type' | 'intention' | 'hauteur'> & Pick<Partial<Vol>, 'derive' | 'ricochet'>, avance = 0): { x: number; y: number; hauteur: number } {
  const instant = Math.max(0, Math.min(vol.duree, vol.ecoule + avance));
  // Après le poteau, le ballon tombe droit vers son nouveau point de chute.
  if (vol.ricochet && instant > vol.ricochet.t) {
    const choc = positionVol({ ...vol, ricochet: undefined, ecoule: vol.ricochet.t });
    const v = (instant - vol.ricochet.t) / Math.max(.05, vol.duree - vol.ricochet.t);
    return {
      x: choc.x + (vol.ricochet.vers.x - choc.x) * v, y: choc.y + (vol.ricochet.vers.y - choc.y) * v,
      hauteur: Math.max(.12, choc.hauteur * (1 - v * v) + .9 * v * (1 - v)),
    };
  }
  const t = instant;
  const u = t / Math.max(.001, vol.duree);
  const pied = vol.type === 'pied';
  // Traînée horizontale : vitesse décroissante, point de chute inchangé.
  const k = pied ? (1 - Math.exp(-.18 * t)) / (1 - Math.exp(-.18 * vol.duree)) : u;
  const bas = vol.intention === 'rasant';
  const depart = pied ? .26 : 1.05, arrivee = pied ? .12 : 1.05;
  const h = pied && !bas
    ? depart + ((arrivee - depart) / vol.duree + .5 * GRAVITE_BALLON * vol.duree) * t - .5 * GRAVITE_BALLON * t * t
    : depart + (arrivee - depart) * u + 4 * Math.max(.08, vol.hauteur) * u * (1 - u);
  // Le vent : la droite visée, plus une dérive qui grandit comme le carré du temps.
  const dx = vol.derive?.x ?? 0, dy = vol.derive?.y ?? 0;
  return {
    x: vol.de.x + (vol.vers.x - dx - vol.de.x) * k + dx * u * u,
    y: vol.de.y + (vol.vers.y - dy - vol.de.y) * k + dy * u * u,
    hauteur: h,
  };
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
  vol: Pick<Vol, 'de' | 'vers' | 'duree'> & Pick<Partial<Vol>, 'derive'>, cote: Cote,
): { ecart: number; hauteur: number; t: number } | null {
  const ligne = cote === 'A' ? LIGNE_B : LIGNE_A;
  // La dérive d'un tir n'est que latérale (voir `viseeTirVariee`) : l'avancée reste celle d'une droite.
  const part = (ligne - vol.de.x) / (vol.vers.x - vol.de.x);
  if (!Number.isFinite(part) || part <= 0 || part > 1) return null;
  // Inverse de la traînée de `positionVol` : l'instant où le ballon a couvert cette part du trajet.
  const t = -Math.log(1 - part * (1 - Math.exp(-.18 * vol.duree))) / .18;
  const dy = vol.derive?.y ?? 0, u = t / vol.duree;
  return { ecart: vol.de.y + (vol.vers.y - dy - vol.de.y) * part + dy * u * u - AXE, hauteur: hauteurPied(vol.duree, t), t };
}

/** Le résultat qu'un spectateur lirait sur la trajectoire seule. */
export function tirPasseEntreLesPoteaux(vol: Pick<Vol, 'de' | 'vers' | 'duree'> & Pick<Partial<Vol>, 'derive' | 'ricochet'>, cote: Cote): boolean {
  const p = passageAuxPoteaux(vol, cote);
  if (!p) return false;
  // Sur le poteau : le tir compte si le ballon retombe DERRIÈRE la ligne, entre les montants.
  if (vol.ricochet) {
    const s = sens(cote), ligne = cote === 'A' ? LIGNE_B : LIGNE_A;
    return p.hauteur > HAUTEUR_BARRE && (vol.ricochet.vers.x - ligne) * s > 0 && Math.abs(vol.ricochet.vers.y - AXE) < DEMI_POTEAUX;
  }
  return Math.abs(p.ecart) < DEMI_POTEAUX && p.hauteur > HAUTEUR_BARRE;
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

/** Ce qui fait qu'un tir ne ressemble pas au précédent. */
export interface ContexteTir {
  /** Puissance et précision du botteur (0-100), sa fraîcheur (0-100). */
  puissance: number; precision: number; fraicheur: number;
  /** Sa façon de frapper, de −1 (tendu) à 1 (en cloche) : propre à chaque buteur. */
  style: number;
  /** Vent dans le dos (positif) ou de face, et de travers (positif : vers les y croissants), en m/s. */
  ventDos: number; ventTravers: number;
  /** Pression du moment, de 0 à 1. */
  pression: number;
}

export type IssueTir = 'dedans' | 'poteauRentrant' | 'gauche' | 'droite' | 'court' | 'sousLaBarre' | 'poteauSortant';

/**
 * LA TRAJECTOIRE D'UN TIR, AVEC SA MANIÈRE (IA par poste).
 *
 * Même principe que `viseeTir` — le résultat est décidé AVANT, la trajectoire
 * le montre — mais deux tirs réussis ne se ressemblent plus : hauteur et
 * tension selon le buteur, la distance et le vent de face ; marge selon sa
 * précision (au milieu des poteaux, ou à un mètre du montant) ; ballon que le
 * vent couche vers l'arrivée ; raté de peu, largement, trop court, sous la
 * barre, ou sur le poteau.
 *
 * ⚠️ LE VENT NE CHANGE PAS LE RÉSULTAT ICI : il a déjà pesé dans la chance de
 * réussite. Le buteur a visé EN TENANT COMPTE du vent ; la dérive ne fait que
 * dessiner la courbe qui mène au point choisi.
 */
export function viseeTirVariee(
  de: Vec, cote: Cote, reussi: boolean, r1: number, r2: number, r3: number, c: ContexteTir,
): { vers: Vec; duree: number; issue: IssueTir; derive?: Vec; ricochet?: { t: number; vers: Vec } } {
  const s = sens(cote);
  const ligne = cote === 'A' ? LIGNE_B : LIGNE_A;
  const jusquALaLigne = Math.max(1, (ligne - de.x) * s);
  const distance = Math.hypot(jusquALaLigne, de.y - AXE);
  const face = Math.max(0, -c.ventDos), dos = Math.max(0, c.ventDos);
  // Le temps de vol fait la courbe : un buteur puissant frappe tendu, un vent de face fait monter le ballon.
  const voulue = 1.3 + distance / 33 + c.style * .2 - (c.puissance - 70) / 190 + face * .022 - dos * .012 + (r3 - .5) * .22;
  let duree = Math.max(1.5, Math.min(3.05, voulue));
  const loin = jusquALaLigne > 34 - face * 1.2;
  // Trop court : il retombe devant la ligne — de loin, ou quand le vent le retient.
  if (!reussi && loin && r2 < .3 + face * .035) {
    const vers = { x: ligne - s * (1.2 + r3 * 6 + face * .4), y: AXE + (r1 - .5) * 9 };
    const derive = { x: 0, y: c.ventTravers * .5 * .11 * duree * duree };
    return { vers, duree: Math.max(1.6, duree - .15), issue: 'court', derive };
  }
  // Le côté d'un raté suit le vent trois fois sur quatre.
  const sousLeVent = Math.abs(c.ventTravers) > 1.5 ? Math.sign(c.ventTravers) : 0;
  const coteRate = sousLeVent ? (r1 < .76 ? sousLeVent : -sousLeVent) : r1 < .5 ? -1 : 1;
  // La marge d'un tir réussi : un bon buteur passe au milieu, un tir limite frôle le montant.
  const dispersion = .55 + (100 - c.precision) / 90 + c.pression * .25 + (100 - c.fraicheur) / 260;
  const coteReussi = r1 < .5 ? -1 : 1;
  const poteau = r3 > .955 || (!reussi && r2 > .9 && r3 > .7);
  let ecart: number;
  if (poteau) ecart = (reussi ? coteReussi : coteRate) * (DEMI_POTEAUX - .04);
  else if (reussi) ecart = coteReussi * Math.min(DEMI_POTEAUX - .25, Math.pow(r2, 1.5) * DEMI_POTEAUX * Math.min(1.25, dispersion));
  // Manqué : de peu le plus souvent, parfois très largement.
  else ecart = coteRate * (DEMI_POTEAUX + .35 + (r2 < .55 ? r2 * 2.2 : .9 + (r2 - .55) * 17));
  // Sous la barre : de loin, un raté qui a la direction mais pas la longueur.
  const sousLaBarre = !reussi && !poteau && loin && r3 < .22;
  if (sousLaBarre) ecart = (r2 - .5) * 3.6;

  let recul = Math.min(EN_BUT - 1.5, 5 + r3 * 4.5 + dos * .25);
  // Le point de chute qui fait passer la courbe (droite + dérive) à l'écart voulu dans le plan des poteaux.
  const viser = (prolonge: number, d: number) => {
    const part = jusquALaLigne / (jusquALaLigne + prolonge);
    const t = -Math.log(1 - part * (1 - Math.exp(-.18 * d))) / .18, u = t / d;
    const dy = c.ventTravers * .5 * .11 * d * d;
    // de.y + (y − dy − de.y)·part + dy·u² = AXE + ecart
    return (AXE + ecart - de.y - dy * u * u) / part + de.y + dy;
  };
  while (recul > 1 && (viser(recul, duree) < 1.5 || viser(recul, duree) > LARGEUR - 1.5)) recul -= .5;
  const construire = (d: number) => ({ de, vers: { x: ligne + s * recul, y: viser(recul, d) }, duree: d, derive: { x: 0, y: c.ventTravers * .5 * .11 * d * d } });
  let vol = construire(duree);
  if (reussi || poteau) {
    // Il franchit la barre avec de la marge, quitte à monter plus haut.
    while (duree < 3.6 && (passageAuxPoteaux(vol, cote)?.hauteur ?? 0) < HAUTEUR_BARRE + (poteau ? 1.4 : .7)) { duree += .08; vol = construire(duree); }
  } else if (sousLaBarre) {
    // Il arrive à hauteur de poitrine : on raccourcit le vol jusqu'à passer dessous.
    while (duree > 1.25 && (passageAuxPoteaux(vol, cote)?.hauteur ?? 0) > HAUTEUR_BARRE - .5) { duree -= .06; vol = construire(duree); }
  }
  if (poteau) {
    const passage = passageAuxPoteaux(vol, cote)!;
    const dedans = reussi;
    // Poteau rentrant : le ballon bascule derrière la ligne ; sortant : il revient ou file à côté.
    const vers = dedans
      ? { x: ligne + s * (2 + r2 * 3), y: AXE + Math.sign(ecart) * (1 + r2 * 1.2) }
      : { x: ligne + s * (r2 < .5 ? -(1.5 + r2 * 5) : 1.5 + r2 * 3), y: AXE + Math.sign(ecart) * (DEMI_POTEAUX + 1 + r2 * 3.5) };
    return { vers: vol.vers, duree, issue: dedans ? 'poteauRentrant' : 'poteauSortant', derive: vol.derive, ricochet: { t: passage.t, vers } };
  }
  return { vers: vol.vers, duree, issue: reussi ? 'dedans' : sousLaBarre ? 'sousLaBarre' : coteRate < 0 ? 'gauche' : 'droite', derive: vol.derive };
}
