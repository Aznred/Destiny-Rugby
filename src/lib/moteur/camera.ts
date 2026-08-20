// 🎥 LA CAMÉRA — ce que l'écran montre du terrain, et dans quel sens.
//
// ═══ POURQUOI CE FICHIER EXISTE ══════════════════════════════════════════════
//
// Retour de jeu : « en match c'est injouable et pas fun, et il faut que ça
// marche sur téléphone ». La cause n'était pas le moteur — il tourne à trente
// pions et sept ticks par seconde — mais le CADRAGE : l'écran affichait les
// 122 × 70 mètres du terrain d'un seul tenant. Sur un téléphone de 375 px, un
// joueur mesure alors **3 pixels**. On ne distingue pas son propre pion, on ne
// voit pas qui vient nous plaquer, on ne sait pas à qui on passe. Aucun réglage
// de bouton ne rattrape ça : il fallait une caméra.
//
// ═══ TROIS DÉCISIONS, ET ELLES EXPLIQUENT TOUT LE FICHIER ════════════════════
//
// 1. **LE CADRAGE SE MESURE EN MÈTRES DE TERRAIN, PAS EN ZOOM.** « proche » ne
//    veut pas dire « ×2,7 », ça veut dire « 46 mètres de longueur de terrain à
//    l'écran ». C'est la seule définition qui donne la même lisibilité sur un
//    téléphone de 375 px et sur un écran de 1 440 : le pion fait toujours la
//    même fraction de l'écran, donc toujours la même taille au doigt.
//
// 2. **EN PORTRAIT, LE TERRAIN PIVOTE D'UN QUART DE TOUR.** Un terrain de rugby
//    fait 1,74 fois plus long que large ; un téléphone tenu droit fait 2,2 fois
//    plus haut que large. Poser l'un dans l'autre sans pivoter, c'est jeter les
//    trois quarts de l'écran. On joue donc VERS LE HAUT, comme tous les jeux de
//    sport sur téléphone. Le pivot est une rotation propre (pas un miroir) :
//    seuls les numéros de maillot reçoivent la rotation inverse pour rester
//    lisibles.
//
// 3. **ON ATTAQUE TOUJOURS DANS LE MÊME SENS.** Le moteur fait attaquer le camp
//    A vers les X croissants et le camp B vers les X décroissants. À l'écran,
//    on tourne le monde de 180° quand on joue pour B : le joueur pousse
//    toujours son stick vers l'en-but adverse, match après match, sans jamais
//    avoir à se demander de quel côté il joue. C'est ce qui rend le pilotage
//    réflexe plutôt que réfléchi.
//
// ⚠️ CE FICHIER NE CONNAÎT NI REACT NI LE MOTEUR. Il prend un point d'intérêt,
// un cadrage et les proportions du conteneur ; il rend un `viewBox`, deux
// chaînes `transform` et les deux conversions écran ↔ terrain. Le rendu s'en
// sert pour dessiner, le joystick pour lire le doigt — et comme c'est la MÊME
// matrice des deux côtés, un pivot ne peut pas désaccorder l'image et la
// commande.

import { LARGEUR, LONGUEUR, borner, type Cote, type Vec } from './terrain';

/** À quelle distance on regarde le jeu. */
export type Cadrage = 'large' | 'suivi' | 'proche';

/**
 * Mètres de LONGUEUR DE TERRAIN visibles à l'écran, par cadrage.
 *
 * ⚠️ MESURÉ AU DOIGT, PAS CHOISI AU HASARD. Les pions sont dessinés à leur
 * taille réelle (0,86 m de rayon) ; sur un téléphone de 375 px tenu droit, cela
 * donne :
 *   • `large`  (122 m) → disque de 8,5 px — on lit la FORME du jeu, les lignes
 *                        et les intervalles, pas les individus. C'est le mode
 *                        « je regarde le match » ;
 *   • `suivi`  (68 m)  → disque de 15 px  — on distingue les maillots et on voit
 *                        arriver la défense ;
 *   • `proche` (46 m)  → disque de 22 px  — on vise, on décide, on joue.
 *
 * En dessous de 40 m on perdrait la lecture du hors-jeu et du soutien : le
 * joueur ne verrait plus arriver la défense, et le jeu deviendrait injuste
 * plutôt que dur.
 *
 * ⚠️ `suivi` EST PASSÉ DE 78 À 68 m APRÈS MESURE. À 78, le pion tombait à 13 px
 * sur un téléphone : lisible de justesse, mais c'est le cadrage dans lequel on
 * passe les trois quarts du temps de pilotage — celui où l'on se replace et où
 * l'on lit le jeu qui vient. Huit mètres de moins ne coûtent aucun contexte
 * (on voit toujours toute la largeur du terrain) et rendent les maillots nets.
 */
export const COUVERTURE: Record<Cadrage, number> = {
  large: LONGUEUR,
  suivi: 68,
  proche: 46,
};

/**
 * Le quart de tour appliqué au monde, en degrés.
 *
 * 0 / 180 : écran couché (ordinateur, téléphone à l'horizontale).
 * −90 / 90 : écran debout — on attaque vers le HAUT.
 */
export type Angle = 0 | 90 | 180 | -90;

/** Le sens de jeu à l'écran, selon le camp incarné et la forme du conteneur. */
export function angleDeVue(cote: Cote, portrait: boolean): Angle {
  if (portrait) return cote === 'A' ? -90 : 90;
  return cote === 'A' ? 0 : 180;
}

/** Le cadre du monde effectivement montré, en mètres de terrain. */
export interface Cadre {
  /** Centre, en coordonnées du terrain. */
  cx: number;
  cy: number;
  /** Étendue couverte sur chaque axe DU TERRAIN. */
  w: number;
  h: number;
}

/**
 * Tout ce dont l'écran a besoin pour une image : le `viewBox`, les deux
 * `transform` SVG, et les conversions dans les deux sens.
 *
 * ⚠️ Le repère du `viewBox` est en « mètres d'écran » : `0 0 W H`, avec W/H
 * exactement les proportions du conteneur. Un mètre de terrain y vaut donc un
 * mètre, quel que soit le pivot — c'est ce qui permet de dessiner les rayons
 * des pions en mètres réels sans jamais les corriger.
 */
export interface Vue {
  viewBox: string;
  /** À poser sur le groupe qui contient tout le monde dessiné. */
  transform: string;
  /** À poser sur chaque texte pour qu'il reste droit malgré le pivot. */
  redresser: string;
  /** Largeur et hauteur du repère d'écran, en mètres. */
  W: number;
  H: number;
  angle: Angle;
  cadre: Cadre;
  /** Terrain → écran (mètres d'écran). */
  versEcran(v: Vec): Vec;
  /** Écran (mètres d'écran) → terrain. */
  versMonde(v: Vec): Vec;
  /** Une DIRECTION d'écran (le joystick) vers une direction de terrain. */
  directionMonde(dx: number, dy: number): { dx: number; dy: number };
}

/** L'axe du terrain qui court en travers de l'écran est-il l'axe long ? */
function couche(angle: Angle): boolean {
  return angle === 0 || angle === 180;
}

/**
 * Le cadre qui montre `spanX` mètres de LONGUEUR de terrain, aux proportions
 * `ratio` du conteneur, centré au mieux sur `cible` sans jamais laisser voir
 * le vide autour du terrain.
 *
 * ⚠️ `large` est le seul cadrage qui a le droit de déborder : montrer le
 * terrain ENTIER sur un écran qui n'a pas ses proportions impose des bandes.
 * Tous les autres sont « au contact » : on préfère rogner que border de noir.
 */
function cadrer(cible: Vec, spanX: number, ratio: number, angle: Angle, contenir: boolean): Cadre {
  // Mètres d'écran : W en travers, H en hauteur, W/H = ratio du conteneur.
  const W = couche(angle) ? spanX : spanX * ratio;
  const H = W / ratio;
  // Les mêmes, projetés sur les axes DU TERRAIN.
  let w = couche(angle) ? W : H;
  let h = couche(angle) ? H : W;

  if (contenir) {
    // Le terrain entier doit tenir dedans : on agrandit jusqu'à l'englober.
    const k = Math.max(1, LONGUEUR / w, LARGEUR / h);
    w *= k;
    h *= k;
  } else {
    // On ne montre jamais plus grand que le terrain : sinon on rend du vide.
    const k = Math.min(1, LONGUEUR / w, LARGEUR / h);
    w *= k;
    h *= k;
  }

  // Le centre est ramené pour que le cadre reste dans le terrain. Si le cadre
  // est plus grand que le terrain sur un axe, il se centre dessus.
  const cx = w >= LONGUEUR ? LONGUEUR / 2 : borner(cible.x, w / 2, LONGUEUR - w / 2);
  const cy = h >= LARGEUR ? LARGEUR / 2 : borner(cible.y, h / 2, LARGEUR - h / 2);
  return { cx, cy, w, h };
}

/**
 * La vue complète, prête à être posée sur le SVG.
 *
 * ⚠️ Le ratio du conteneur n'est PAS un paramètre : il est déjà tout entier
 * dans le cadre, que `cadrer()` a construit avec lui. Le repasser ici serait
 * une seconde source de vérité, et la première image où les deux divergent
 * décale l'image du doigt.
 */
export function construireVue(cadre: Cadre, angle: Angle): Vue {
  const W = couche(angle) ? cadre.w : cadre.h;
  const H = couche(angle) ? cadre.h : cadre.w;
  const rad = (angle * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const { cx, cy } = cadre;

  const versEcran = (v: Vec): Vec => ({
    x: W / 2 + (v.x - cx) * c - (v.y - cy) * s,
    y: H / 2 + (v.x - cx) * s + (v.y - cy) * c,
  });
  const versMonde = (v: Vec): Vec => {
    const dx = v.x - W / 2;
    const dy = v.y - H / 2;
    return { x: cx + dx * c + dy * s, y: cy - dx * s + dy * c };
  };

  return {
    viewBox: `0 0 ${W.toFixed(3)} ${H.toFixed(3)}`,
    // ⚠️ Lu de droite à gauche : on recentre le monde sur le point visé, on
    // pivote, puis on pose le tout au milieu du viewBox.
    transform: `translate(${(W / 2).toFixed(3)} ${(H / 2).toFixed(3)}) rotate(${angle}) `
      + `translate(${(-cx).toFixed(3)} ${(-cy).toFixed(3)})`,
    redresser: angle === 0 ? '' : `rotate(${-angle})`,
    W,
    H,
    angle,
    cadre,
    versEcran,
    versMonde,
    directionMonde: (dx, dy) => ({ dx: dx * c + dy * s, dy: -dx * s + dy * c }),
  };
}

/**
 * 🎥 LA CAMÉRA — un centre et une distance qui rattrapent leur cible.
 *
 * ⚠️ ELLE N'EST PAS UNE INTERPOLATION LINÉAIRE. Un `lerp(a, b, 0.1)` par image
 * dépend du nombre d'images par seconde : la caméra suivrait deux fois plus
 * vite à 120 Hz qu'à 60. On utilise donc un rattrapage exponentiel exact,
 * `1 − e^(−dt/τ)`, qui donne le même mouvement quel que soit l'écran.
 *
 * ⚠️ ET ELLE COUPE AU LIEU DE VOYAGER quand le jeu saute (un dégagement de
 * soixante mètres, une mêlée à l'autre bout, la reprise après un essai). Une
 * caméra qui traverse le terrain en glissant fait perdre deux secondes de jeu
 * à chaque coup de pied — et on rate justement l'action qu'on suivait.
 */
export class Camera {
  private cx = LONGUEUR / 2;
  private cy = LARGEUR / 2;
  private span = LONGUEUR;

  /** Constante de temps du rattrapage, en secondes réelles. */
  private static readonly TAU = 0.28;
  /** Au-delà, on coupe au lieu de suivre. */
  private static readonly SAUT = 34;

  /**
   * Avance d'une image.
   *
   * @param cible    le point à garder au centre (ballon, joueur, ou entre les deux)
   * @param cadrage  la distance de vue voulue
   * @param ratio    largeur / hauteur du conteneur, en pixels
   * @param angle    le pivot du monde à l'écran
   * @param dt       secondes RÉELLES écoulées depuis l'image précédente
   */
  suivre(cible: Vec, cadrage: Cadrage, ratio: number, angle: Angle, dt: number): Vue {
    const spanVoulu = COUVERTURE[cadrage];
    // Le cadre visé, calculé AVANT le lissage : c'est lui qui porte les bornes
    // du terrain, donc la caméra ne lisse jamais vers un point interdit.
    const vise = cadrer(cible, spanVoulu, ratio, angle, cadrage === 'large');

    const saut = Math.hypot(vise.cx - this.cx, vise.cy - this.cy) > Camera.SAUT;
    const k = saut ? 1 : 1 - Math.exp(-Math.max(0, dt) / Camera.TAU);
    this.cx += (vise.cx - this.cx) * k;
    this.cy += (vise.cy - this.cy) * k;
    this.span += (spanVoulu - this.span) * k;

    const cadre = cadrer({ x: this.cx, y: this.cy }, this.span, ratio, angle, cadrage === 'large');
    // On repart du cadre borné : sans ça la caméra dérive vers un centre
    // interdit et « colle » au bord dès qu'on longe la touche.
    this.cx = cadre.cx;
    this.cy = cadre.cy;
    return construireVue(cadre, angle);
  }

  /** Replacer la caméra d'un coup (changement de mode, ouverture du match). */
  couper(cible: Vec, cadrage: Cadrage): void {
    this.cx = cible.x;
    this.cy = cible.y;
    this.span = COUVERTURE[cadrage];
  }
}
