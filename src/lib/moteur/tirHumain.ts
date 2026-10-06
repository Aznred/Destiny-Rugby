// 🎯 LE TIR À LA MAIN — pénalités, transformations, drops : le résultat sort de la GÉOMÉTRIE DU VOL. (Correctif 17)
//
// Demande : « le résultat doit dépendre de la visée du joueur, de son geste, des stats du joueur, de la
// fatigue, de la pression, de la distance et du vent ».
//
// ═══ CE QUI A ÉTÉ TRANCHÉ AVANT D'ÉCRIRE UNE LIGNE ═══════════════════════════
//
// 1. ⚠️ LE MÊME ÉTALON QUE L'IA. L'IA tire avec `probabilitePenalite` (distance, angle, pied, fraîcheur,
//    pluie, vent, pression). Pour un tir joué à la main, on en déduit la DISPERSION du buteur : le
//    sigma tel qu'un tir visé au milieu des poteaux réussisse avec cette probabilité. Un joueur moyen
//    fait donc aussi bien que l'IA ; un bon geste fait mieux, un mauvais fait pire — sans que la
//    difficulté du moteur change.
// 2. ⚠️ LE VENT N'EST PLUS DANS LA PROBABILITÉ, IL EST DANS LA COURBE. L'appelant retire le malus du
//    vent de la chance, et la dérive pousse VRAIMENT le ballon : le joueur voit la flèche du vent, il
//    vise à côté du milieu pour que le ballon revienne.
// 3. ⚠️ LA PUISSANCE EST UNE DISTANCE. Pleine force, le buteur envoie le ballon à `portee` mètres ; un
//    tir de dix mètres n'a donc pas besoin de la même force qu'un tir de cinquante. Trop court, le
//    ballon passe sous la barre ou retombe devant la ligne ; trop fort, la précision se dégrade.
// 4. ⚠️ L'ISSUE EST LUE SUR LA TRAJECTOIRE (`tirPasseEntreLesPoteaux`), comme pour le spectateur : le
//    tableau d'affichage et le vol racontent le même match. Aucun tirage ne décide du résultat —
//    ils ne servent qu'à la dispersion.
// 5. ⚠️ CE FICHIER NE CONNAÎT PAS `moteur.ts` : il reçoit tout ce dont il a besoin (le contexte du tir, la
//    chance de base) et rend une trajectoire.

import { DEMI_POTEAUX, HAUTEUR_BARRE, passageAuxPoteaux, tirPasseEntreLesPoteaux, type ContexteTir, type IssueTir } from './trajectoire.js';
import { AXE, LARGEUR, LIGNE_A, LIGNE_B, MILIEU, borner, sens, type Cote, type Vec } from './terrain.js';

// ---------------------------------------------------------------------------
// LES RÉGLAGES — tout ce qui s'étalonne au banc (`verifierResponsabilites.ts`)
// ---------------------------------------------------------------------------

export const REGLAGES_TIR = {
  /** Portée à pleine force d'un buteur moyen (puissance 50, pied 60), en mètres. */
  porteeDeBase: 44,
  /** Mètres de portée par point de puissance / de pied au-dessus de la moyenne. */
  porteeParPuissance: 0.45,
  porteeParPied: 0.1,
  /** Part de la portée que donne une force nulle : un tir toujours un peu lancé. */
  porteeMinimale: 0.38,
  /** Marge au-dessus de la distance à franchir : le ballon doit passer la barre, pas la frôler. */
  margeBarre: 1,
  /** Au-delà de ce manque de portée (m), le ballon retombe devant la ligne. */
  manqueCourt: 4,
  /** En deçà de ce manque (m), le ballon passe quand même la barre. */
  manqueTolere: 0.4,
  /**
   * Part de la dispersion que l'IA "paie" déjà : sa chance de réussite mêle le geste, la visée et le hasard. À la main, la visée est
   * celle du joueur, donc un peu moins de dispersion que celle que la chance suggère (mais jamais zéro : un tir reste un tir).
   */
  dispersionBase: 0.85,
  /** Qualité du geste : la dispersion va de `geste0` (geste nul) à `geste1` (geste parfait) fois le sigma de base. */
  geste0: 1.35,
  geste1: 0.6,
  /** Une frappe à plus de cette part de la force dégrade la précision. */
  forceExcessive: 0.85,
  /** L'effet demandé coûte en dispersion : de 0 à ce taux de plus à effet plein. */
  coutEffet: 0.3,
  /** Un ballon à moins de cette distance du poteau le touche. */
  poteau: 0.1,
} as const;

/** La demande du joueur : où, avec quelle force, avec quel effet, et la qualité de son geste. */
export interface ViseeHumaine {
  /** Écart à l'axe des poteaux voulu dans leur plan, en mètres (positif : vers les y croissants), effet compris. */
  ecart: number;
  /** De 0 à 1 : la force dosée. */
  puissance: number;
  /** De −1 à 1 : la courbure demandée (elle dessine le vol et coûte en précision). */
  effet: number;
  /** De 0 à 1 : la régularité du geste (tracé net, visée tenue) — 1 est un geste parfait. */
  geste: number;
}

export interface ResultatTir {
  vers: Vec;
  duree: number;
  derive: Vec;
  ricochet?: { t: number; vers: Vec };
  issue: IssueTir;
  reussi: boolean;
  /** Où le ballon a franchi le plan des poteaux, écart à l'axe en mètres (null : retombé devant). */
  ecartFinal: number | null;
  /** Mètres de portée qui manquaient (0 : assez). */
  manque: number;
  /** Ce que valait la dispersion : de la visée au résultat, en mètres. */
  sigma: number;
}

// ---------------------------------------------------------------------------
// LA LOI NORMALE, SANS BIBLIOTHÈQUE
// ---------------------------------------------------------------------------

/** L'écart (en sigmas) qui contient une probabilité `p` d'une loi normale centrée : Abramowitz & Stegun 26.2.23. */
export function quantileCentre(p: number): number {
  const q = borner((1 + borner(p, 0.01, 0.995)) / 2, 0.5, 0.9975);
  const t = Math.sqrt(-2 * Math.log(1 - q));
  return t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
}

/** Un tirage normal centré réduit (Box-Muller) à partir de deux tirages uniformes. */
export function normal(r1: number, r2: number): number {
  return Math.sqrt(-2 * Math.log(Math.max(1e-9, r1))) * Math.cos(2 * Math.PI * r2);
}

// ---------------------------------------------------------------------------
// LA PORTÉE ET LA DISTANCE
// ---------------------------------------------------------------------------

/** Mètres que le buteur envoie à pleine force : sa puissance, son pied, sa fraîcheur, le vent dans le dos ou de face. */
export function porteeMaximale(c: ContexteTir): number {
  const R = REGLAGES_TIR;
  const dos = Math.max(0, c.ventDos), face = Math.max(0, -c.ventDos);
  return borner(R.porteeDeBase + (c.puissance - 50) * R.porteeParPuissance + (c.precision - 60) * R.porteeParPied
    + dos * 0.9 - face * 1.1 - (100 - c.fraicheur) * 0.05, 36, 66);
}

/** Distance à franchir jusqu'au plan des poteaux (la droite du ballon à l'axe), en mètres. */
export function distanceAuxPoteaux(de: Vec, cote: Cote): { devant: number; droite: number } {
  const ligne = cote === 'A' ? LIGNE_B : LIGNE_A;
  const devant = Math.max(1, (ligne - de.x) * sens(cote));
  return { devant, droite: Math.hypot(devant, de.y - AXE) };
}

/** Portée d'un tir à une force donnée (de 0 à 1) pour un buteur de portée maximale `reach`. */
export const porteeALaForce = (reach: number, puissance: number): number =>
  reach * (REGLAGES_TIR.porteeMinimale + (1 - REGLAGES_TIR.porteeMinimale) * borner(puissance, 0, 1));

/**
 * La force qui suffit juste à passer la barre depuis ce point, de 0 à 1 (supérieure à 1 : hors de portée).
 * Ce que l'aide visuelle montre d'un trait fin sur la jauge — jamais le résultat.
 */
export function puissanceUtile(de: Vec, cote: Cote, c: ContexteTir): number {
  const R = REGLAGES_TIR;
  const besoin = distanceAuxPoteaux(de, cote).droite + R.margeBarre;
  return (besoin / porteeMaximale(c) - R.porteeMinimale) / (1 - R.porteeMinimale);
}

/** La dérive du vent sur le ballon, dans le plan des poteaux, pour un tir de cette durée (m). */
export function deriveDuTir(c: ContexteTir, duree: number): number {
  return c.ventTravers * 0.5 * 0.11 * duree * duree;
}

// ---------------------------------------------------------------------------
// LE TIR
// ---------------------------------------------------------------------------

/**
 * LA DISPERSION DU BUTEUR, en mètres dans le plan des poteaux, d'après la chance qu'a un tir visé au
 * milieu (sans vent), puis le geste, l'effet et la force.
 */
export function dispersion(chanceSansVent: number, v: ViseeHumaine, passe: number): number {
  const R = REGLAGES_TIR;
  const base = REGLAGES_TIR.dispersionBase * DEMI_POTEAUX / Math.max(0.5, quantileCentre(chanceSansVent));
  const geste = R.geste0 + (R.geste1 - R.geste0) * borner(v.geste, 0, 1);
  const excessive = 1 + 0.5 * Math.max(0, borner(v.puissance, 0, 1) - R.forceExcessive) / (1 - R.forceExcessive);
  const effet = 1 + R.coutEffet * Math.abs(borner(v.effet, -1, 1));
  return base * geste * excessive * effet * passe;
}

/**
 * RÉSOUT UN TIR JOUÉ À LA MAIN : la trajectoire que prend le ballon, et son issue lue dessus.
 *
 * `r1…r4` sont quatre tirages uniformes (la dispersion latérale en prend deux, la dispersion de la force
 * les autres) : le même tir, avec les mêmes tirages, donne le même vol.
 */
export function resoudreTirHumain(
  de: Vec, cote: Cote, v: ViseeHumaine, c: ContexteTir, chanceSansVent: number,
  r1: number, r2: number, r3: number, r4: number,
): ResultatTir {
  const R = REGLAGES_TIR;
  const s = sens(cote);
  const ligne = cote === 'A' ? LIGNE_B : LIGNE_A;
  const { devant, droite } = distanceAuxPoteaux(de, cote);
  const reach = porteeMaximale(c);
  const puissance = borner(v.puissance, 0, 1);
  const portee = porteeALaForce(reach, puissance);
  const besoin = droite + R.margeBarre;

  // La force : trop de force coûte en précision, un peu de bruit sur la longueur. Le vol dure ce qu'il faut pour la
  // portée (une frappe tendue, ou une cloche).
  const longueurReelle = portee * (1 + normal(r3, r4) * 0.012 * (1 + (100 - c.precision) / 90));
  const manqueReel = Math.max(0, besoin - longueurReelle);
  const sigma = dispersion(chanceSansVent, v, 1);
  const aleatoire = normal(r1, r2) * sigma;
  const voulue = 1.3 + droite / 33 + c.style * 0.2 - (c.puissance - 70) / 190 + Math.max(0, -c.ventDos) * 0.022 - Math.max(0, c.ventDos) * 0.012;
  let duree = Math.max(1.5, Math.min(3.05, voulue));

  // Le ballon retombe devant la ligne.
  if (manqueReel >= R.manqueCourt) {
    // Il retombe là où sa portée l'a mené, sur la droite qu'il visait.
    const k = borner(longueurReelle / droite, 0.2, 0.97);
    const but = AXE + borner(v.ecart, -8, 8) + aleatoire * 0.4;
    const vers = { x: de.x + (ligne - de.x) * k, y: de.y + (but - de.y) * k };
    return {
      vers, duree: Math.max(1.6, duree - 0.15), derive: { x: 0, y: deriveDuTir(c, duree) }, issue: 'court',
      reussi: false, ecartFinal: null, manque: manqueReel, sigma,
    };
  }

  // Le point de chute qui fait passer la courbe (droite + dérive) à l'écart VISÉ + la dispersion, dans le plan des poteaux.
  // Le vent, lui, déplace le ballon : il n'est pas dans la visée.
  const L0 = AXE + borner(v.ecart, -9, 9) + aleatoire;
  let recul = Math.max(2.5, Math.min(34, longueurReelle - droite));
  const yMin = -11, yMax = LARGEUR + 11;
  const viser = (prolonge: number, d: number) => {
    const part = devant / (devant + prolonge);
    const dy = deriveDuTir(c, d);
    // de.y + (y − dy − de.y)·part = L0   (le vent s'ajoute ensuite : + dy·u²)
    return (L0 - de.y) / part + de.y + dy;
  };
  while (recul > 1 && (viser(recul, duree) < yMin || viser(recul, duree) > yMax)) recul -= 0.5;
  const construire = (d: number) => ({
    de, vers: { x: ligne + s * recul, y: viser(recul, d) }, duree: d,
    derive: { x: 0, y: deriveDuTir(c, d) },
  });
  let vol = construire(duree);

  const sousLaBarre = manqueReel > R.manqueTolere;
  if (sousLaBarre) {
    // Il arrive à hauteur de poitrine : on raccourcit le vol jusqu'à passer dessous.
    while (duree > 1.25 && (passageAuxPoteaux(vol, cote)?.hauteur ?? 0) > HAUTEUR_BARRE - 0.5) { duree -= 0.06; vol = construire(duree); }
  } else {
    // Il franchit la barre avec de la marge, quitte à monter plus haut.
    while (duree < 3.6 && (passageAuxPoteaux(vol, cote)?.hauteur ?? 0) < HAUTEUR_BARRE + 0.7) { duree += 0.08; vol = construire(duree); }
  }

  const passage = passageAuxPoteaux(vol, cote);
  const ecartFinal = passage ? passage.ecart : null;
  // Sur le poteau : le ballon le touche, et bascule d'un côté ou de l'autre.
  const surLePoteau = !sousLaBarre && passage && Math.abs(Math.abs(passage.ecart) - DEMI_POTEAUX) < R.poteau && passage.hauteur > HAUTEUR_BARRE;
  if (surLePoteau && passage) {
    const dedans = Math.abs(passage.ecart) < DEMI_POTEAUX;
    const signe = Math.sign(passage.ecart) || 1;
    const vers = dedans
      ? { x: ligne + s * (2 + r3 * 3), y: AXE + signe * (1 + r4 * 1.2) }
      : { x: ligne + s * (r3 < 0.5 ? -(1.5 + r3 * 5) : 1.5 + r3 * 3), y: AXE + signe * (DEMI_POTEAUX + 1 + r4 * 3.5) };
    const ricochet = { t: passage.t, vers };
    const reussi = tirPasseEntreLesPoteaux({ ...vol, ricochet }, cote);
    return {
      vers: vol.vers, duree, derive: vol.derive, ricochet, issue: dedans ? 'poteauRentrant' : 'poteauSortant',
      reussi, ecartFinal, manque: manqueReel, sigma,
    };
  }
  const reussi = tirPasseEntreLesPoteaux(vol, cote);
  const issue: IssueTir = reussi ? 'dedans' : sousLaBarre ? 'sousLaBarre' : (passage?.ecart ?? 0) < 0 ? 'gauche' : 'droite';
  return { vers: vol.vers, duree, derive: vol.derive, issue, reussi, ecartFinal, manque: manqueReel, sigma };
}

// ---------------------------------------------------------------------------
// L'ENGAGEMENT : coup d'envoi, reprise de la seconde période, engagement après des points
// ---------------------------------------------------------------------------

/** Ce que le joueur demande au coup d'envoi : la distance, le côté, la hauteur du ballon, et la régularité du geste. */
export interface ViseeEngagement {
  /** Mètres au-delà de la ligne médiane, dans le sens du jeu : de 10 (contestable) à 52 (très long). */
  distance: number;
  /** Écart à l'axe du terrain visé, en mètres (positif : vers les y croissants). */
  ecart: number;
  /** De 0 (tendu, rapide) à 1 (en chandelle, long à descendre). */
  hauteur: number;
  /** De 0 à 1 : régularité du geste. */
  geste: number;
}

export interface ResultatEngagement {
  arrivee: Vec;
  duree: number;
  /** Dispersion réelle de la frappe, en mètres. */
  sigma: number;
  /** Mètres de portée qui manquaient (le ballon est retombé plus court que demandé). */
  manque: number;
  /** Le ballon est resté en jeu, au-delà des dix mètres. */
  enJeu: boolean;
}

/** La portée d'un coup d'envoi : un buteur de pied moyen envoie à quarante mètres, un bon à cinquante. */
export const porteeEngagement = (puissance: number, pied: number, fraicheur: number): number =>
  borner(40 + (puissance - 50) * 0.4 + (pied - 60) * 0.15 - (100 - fraicheur) * 0.04, 30, 54);

/**
 * OÙ TOMBE UN COUP D'ENVOI : la visée du joueur, dispersée par son pied, sa fraîcheur, la pression et la
 * régularité de son geste. ⚠️ Pas de tirage qui change le sens du coup : seulement de la dispersion.
 */
export function resoudreEngagement(
  cote: Cote, v: ViseeEngagement, p: { puissance: number; pied: number; endurance: number }, pression: number,
  r1: number, r2: number, r3: number, r4: number,
): ResultatEngagement {
  const s = sens(cote);
  const demande = borner(v.distance, 10.5, 52);
  const portee = porteeEngagement(p.puissance, p.pied, p.endurance);
  const manque = Math.max(0, demande - portee);
  const d = Math.min(demande, portee) - manque * 0.5;
  const gesteK = 1.25 - 0.5 * borner(v.geste, 0, 1);
  const sigma = (d * (0.035 + (100 - p.pied) / 1400) * (1 + pression * 0.3) * gesteK) + (100 - p.endurance) * 0.01;
  const longueur = Math.max(10.5, d + normal(r3, r4) * sigma * 0.7);
  const y = borner(AXE + borner(v.ecart, -34, 34) + normal(r1, r2) * sigma, -2, LARGEUR + 2);
  const hauteur = borner(v.hauteur, 0, 1);
  const duree = 1.9 + hauteur * 1.7 + longueur / 60;
  return {
    arrivee: { x: MILIEU + s * longueur, y }, duree, sigma, manque,
    enJeu: y > 0.4 && y < LARGEUR - 0.4,
  };
}
