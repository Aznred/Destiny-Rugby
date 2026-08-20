// LA DISPOSITION DE L'ARMOIRE À TROPHÉES
//
// ⚠️ FONCTION PURE, ET C'EST VOLONTAIRE. La disposition pourrait vivre dans le
// composant R3F, mais elle serait alors invérifiable : il faudrait un GPU, une
// fenêtre et un œil humain pour savoir si le Bouclier de Brennus est bien posé
// au sol plutôt que coincé dans une étagère. Isolée ici, elle se teste en une
// seconde, sans navigateur (`npx vite-node scripts/verifArmoire.ts`).
//
// ⚠️ LES ÉTAGÈRES SONT MESURÉES SUR LE MODÈLE, PLUS DEVINÉES. La première
// version découpait la boîte englobante du meuble en une grille de 4 × 4 et
// espérait tomber juste. Le `.glb` fourni a SIX tablettes, à des hauteurs qui
// ne suivent aucune règle simple : une rangée sur deux se retrouvait donc en
// l'air, entre deux étagères — exactement ce qu'on voyait à l'écran.
// `detecterEtageres()` lit maintenant la géométrie : elle cherche les faces
// horizontales tournées vers le haut, les regroupe par hauteur, et ne garde que
// celles qui traversent le meuble sur toute sa largeur. Chaque tablette connaît
// ensuite le vide au-dessus d'elle (jusqu'au dessous de la suivante), et c'est
// CE vide qui donne sa taille au trophée.
//
// ⚠️ ON DISPOSE TOUT L'ENSEMBLE D'UN COUP, jamais trophée par trophée. Une
// première version décidait pour chacun isolément, à partir de son seul rang :
// dès qu'une pièce partait au sol, son casier restait VIDE, et la vitrine était
// trouée. Ici, on répartit d'abord, on place ensuite — ce qui permet aussi de
// CENTRER une rangée incomplète plutôt que de la tasser à gauche.
//
// ⚠️ LA VITRINE EST AUX DISTINCTIONS, LE SOL EST AUX TITRES (demande explicite :
// « les trophées individuels dans l'armoire et les trophées collectifs à côté,
// plus gros »). C'est le critère de répartition, et il n'y en a plus d'autre :
// `Modele.individuel`, qui vient de `data/trophees.ts`. Les tablettes du modèle
// sont hautes de ~13 cm à l'échelle réelle — TOUT ce qu'on y pose est forcément
// petit, et c'est très bien pour un trophée de meilleur joueur. Les titres
// d'équipe, eux, se dressent au sol à hauteur de buste : trois fois plus
// imposants, et c'est là qu'ils doivent être.
//
// ⚠️ UN BOUCLIER S'APPUIE VRAIMENT SUR LE MEUBLE (deuxième demande : « mets les
// boucliers de Régionale, Fédérale, Nationale, Pro D2 et Russie plus contre
// l'armoire, un peu penchés — là ils tiennent droit comme par magie »). La
// version précédente les inclinait bien… mais les posait à `z = 0,1 × la
// profondeur`, c'est-à-dire À CÔTÉ du meuble, dans le vide : le bouclier
// basculait en arrière sans que rien ne le retienne, d'où l'impression de
// magie. Ils sont maintenant avancés de `sin(inclinaison) × leur hauteur`
// devant la face avant du meuble : leur ARÊTE HAUTE tombe alors pile sur le
// plan du meuble, au coin. Et l'angle a doublé — on voit qu'ils s'appuient.

/** Encombrement de l'armoire, une fois normalisée dans la scène. */
export interface DimensionsArmoire {
  largeur: number;
  profondeur: number;
  hauteur: number;
}

/** Encombrement d'un modèle de trophée, tel que mesuré sur sa boîte englobante. */
export interface TailleModele {
  x: number;
  y: number;
  z: number;
}

/** Une tablette du meuble, mesurée sur la géométrie. Le meuble est posé en y = 0. */
export interface Etagere {
  /** Hauteur de la surface où l'on pose. */
  y: number;
  /** Hauteur libre au-dessus, jusqu'au dessous de la tablette suivante. */
  vide: number;
  /** Largeur utile de la tablette. */
  largeur: number;
  /** Centre de la tablette en profondeur, et sa profondeur utile. */
  z: number;
  profondeur: number;
}

/** Un trophée à placer : son encombrement, et ce qu'il est. */
export interface Modele {
  taille: TailleModele;
  /**
   * Distinction personnelle (`Trophee.individuel`) : elle va EN VITRINE. Un
   * titre d'équipe, lui, se dresse au sol autour du meuble. C'est le seul
   * critère de répartition — voir l'en-tête du fichier.
   */
  individuel: boolean;
  /** Pièce plate et large : elle s'adosse au meuble plutôt que de tenir debout. */
  bouclier: boolean;
}

export interface Place {
  position: [number, number, number];
  /** Radians. `x` = inclinaison (un bouclier s'appuie contre le meuble), `y` = orientation. */
  rotation: [number, number, number];
  echelle: number;
  /** true = posé au sol autour du meuble, à hauteur de buste. */
  dehors: boolean;
}

/** Trophées par tablette. Au-delà, la pièce descend d'un étage. */
export const COLONNES = 4;

// Au-delà, on n'affiche plus : chaque trophée est un `.glb` de ~1,4 Mo, et
// trente modèles chargés d'un coup mettraient une machine modeste à genoux.
export const MAX_PIECES = 16;

// --- LE MEUBLE ---------------------------------------------------------------
// Un trophée occupe 90 % de la hauteur libre de sa tablette : le reste, c'est
// l'air au-dessus, sans lequel une vitrine ressemble à un carton de déménagement.
const REMPLISSAGE_HAUTEUR = 0.9;
// Et au plus 80 % de sa colonne, pour qu'une pièce large ne touche pas sa voisine.
const REMPLISSAGE_LARGEUR = 0.8;
// Marge intérieure d'une tablette : on ne pose rien contre les montants.
const PART_LARGEUR_UTILE = 0.94;

// --- LE SOL ------------------------------------------------------------------
// « La taille d'un buste de rugbyman » : une armoire à trophées fait environ
// deux mètres, un buste soixante-dix centimètres. Relevé à 40 % à la demande
// (« les trophées collectifs à côté, PLUS GROS ») : un titre d'équipe écrase
// désormais une distinction de vitrine dans un rapport de 1 à 3,5.
// La pièce maîtresse (le premier du palmarès) est encore un cran au-dessus.
const PART_BUSTE = 0.4;
const PART_VEDETTE = 1.12;
// ⚠️ LE SOL PREND TOUS LES TITRES, ET C'EST UN BUG CORRIGÉ.
// `MAX_SOL` valait 8 : au-delà, un titre d'équipe « restait en vitrine ». Ça
// semblait un repli inoffensif, c'en était un vrai — signalé en jeu : « au bout
// d'un certain nombre de trophées différents gagnés, des trophées collectifs se
// mettent dans l'armoire à trophées individuels ». La vitrine est aux
// distinctions, POINT : un joueur qui gagne beaucoup ne doit pas voir la règle
// se déliter au moment précis où son palmarès devient intéressant. Le plafond
// est donc celui de la scène entière (`MAX_PIECES`), plus une borne du sol.
// Ce qui était devenu possible entre-temps : les titres ne s'alignent plus en
// deux files qui s'éloignent, ils s'éparpillent DEVANT le meuble (voir plus
// bas) — vingt pièces y tiennent sans que la caméra ait à reculer.
const MAX_SOL = MAX_PIECES;

// --- L'ÉPARPILLEMENT ---------------------------------------------------------
// ⚠️ Demande explicite : « j'aimerais que les trophées collectifs soient rangés
// dans le désordre, en mode éparpillés un peu partout devant l'armoire ».
//
// ⚠️ LE DÉSORDRE EST CALCULÉ, PAS TIRÉ AU SORT. `Math.random()` rendrait cette
// fonction impure : le palmarès sauterait d'une place à l'autre à chaque image,
// et `scripts/verifArmoire.ts` ne pourrait plus rien vérifier. On part donc
// d'une grille — qui garantit qu'aucune pièce n'en chevauche une autre — et on
// secoue chaque case d'un décalage DÉTERMINISTE tiré de l'indice du trophée.
// À l'œil c'est du désordre ; au test, c'est reproductible au millimètre.
// ⚠️ LA ZONE EST SERRÉE, ET C'EST LA CAMÉRA QUI L'IMPOSE. Chaque unité de
// largeur coûte un recul de caméra — 1,4 sur ordinateur, 2,5 sur téléphone où
// le canvas est presque carré — et chaque unité de profondeur en coûte une.
// Un premier réglage à 2,3 × 0,95 étalait la scène sur 8,5 unités : le meuble
// ne faisait plus que 31 % de la hauteur du cadre sur téléphone, contre les
// 40 % que `verifArmoire` exige pour qu'il reste lisible. On éparpille donc
// LARGE MAIS PAS LOIN.
const ZONE_LARGEUR = 1.75;   // × la largeur du meuble
// ⚠️ `ZONE_PROFONDEUR` A DISPARU, et c'est la moitié du correctif. Elle
// imposait une profondeur FIXE à la zone, découpée en autant de rangs qu'il
// fallait : les cases rétrécissaient à mesure que le palmarès grandissait, et
// les pièces, elles, gardaient leur stature. La profondeur de la scène se
// déduit maintenant des pièces elles-mêmes, rangée par rangée.
//
// L'écart minimal entre deux pièces au sol, en part de la largeur du meuble.
// C'est LUI qui garantit qu'elles ne se touchent pas, et c'est lui qui borne
// la secousse.
const ECART_SOL = 0.1;
// ⚠️ LA PROFONDEUR DE LA SCÈNE EST BUDGÉTÉE, en part de la hauteur du meuble.
// Chaque unité de profondeur coûte une unité de recul à la caméra : sans
// plafond, un palmarès complet repoussait l'objectif à 32 unités et le meuble
// n'occupait plus que 15 % de la hauteur d'écran (mesuré, verifArmoire §9).
// Au-delà de ce budget, les pièces rétrécissent — on ne retire jamais un
// trophée gagné.
const PROFONDEUR_MAX = 0.85;
// Ce qu'on laisse entre la face avant du meuble et la première rangée, en part
// de la hauteur du meuble. Sans ça, une pièce posée contre le meuble semble
// sortir du bois — et la moitié de son épaisseur passe DANS le meuble.
const RECUL_MEUBLE = 0.06;
// Secousse maximale d'une pièce dans sa case, en part de la case. Au-delà de
// 0,5 deux voisines peuvent se toucher.
const SECOUSSE = 0.34;
// De combien une pièce peut pivoter sur elle-même. Un palmarès posé au sol par
// quelqu'un de pressé n'est pas aligné au rapporteur.
// ⚠️ ET IL Y A UN MINIMUM. Sans plancher, le tirage déterministe finit par
// donner à deux ou trois pièces un angle de 0,01 rad : elles se lisent alors
// comme parfaitement alignées au milieu de voisines de travers, et c'est ce
// détail-là qui trahit une grille. On garde donc le SIGNE du tirage et on
// n'utilise sa valeur que pour choisir entre le minimum et le maximum.
const PIVOT_MIN = 0.14;
const PIVOT_MAX = 0.55;
// ⚠️ LES BOUCLIERS NE SONT PLUS PENCHÉS (demande explicite : « le bouclier russe
// et le Brennus sont penchés alors qu'il ne faut pas »). L'inclinaison de 0,3 rad
// venait d'une demande antérieure — « mets les boucliers plus contre l'armoire,
// un peu penchés » — qui n'a plus de sens depuis qu'ils ne s'adossent plus à
// rien : éparpillés devant le meuble, un bouclier incliné ne s'appuie sur RIEN
// et retombe dans le défaut qu'on cherchait justement à corriger, celui de la
// pièce qui tient en l'air par magie. Ils se dressent donc droits.
const INCLINAISON_BOUCLIER = 0;

/**
 * Un « hasard » reproductible entre −1 et 1, dérivé d'un entier.
 *
 * ⚠️ CE N'EST PAS DU HASARD, ET IL NE FAUT PAS QUE ÇA EN SOIT. Deux appels avec
 * la même graine donnent la même valeur, toujours : c'est ce qui permet à
 * `disposerArmoire` de rester une fonction pure, testable sans GPU, et au
 * palmarès de ne pas se réorganiser sous les yeux du joueur à chaque rendu.
 * (Mélange entier façon FNV, puis normalisation.)
 */
function secousse(graine: number): number {
  let h = (graine + 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return (h / 0xffffffff) * 2 - 1;
}

/** Un pivot reproductible, jamais nul : entre ±PIVOT_MIN et ±PIVOT_MAX. */
function pivot(graine: number): number {
  const s = secousse(graine);
  return Math.sign(s || 1) * (PIVOT_MIN + Math.abs(s) * (PIVOT_MAX - PIVOT_MIN));
}

// --- LA CAMÉRA ---------------------------------------------------------------
/** Ce qu'on laisse d'air autour de la scène une fois tout cadré. */
export const MARGE_CADRAGE = 1.1;

// =============================================================================
// 1. TROUVER LES ÉTAGÈRES
// =============================================================================

/**
 * Une géométrie du meuble, sommets DÉJÀ exprimés dans le repère de la scène
 * (meuble posé en y = 0, centré en x/z). Le composant les extrait du `.glb`
 * chargé, le script de vérification les décode directement du fichier : les
 * deux passent ensuite par la même fonction.
 */
export interface Geometrie {
  positions: ArrayLike<number>;
  index?: ArrayLike<number> | null;
}

// Une face est « horizontale » à partir de là. 0,85 laisse passer les tablettes
// très légèrement bombées des modèles sculptés, sans attraper les biseaux.
const SEUIL_HORIZONTAL = 0.85;
const TRANCHES = 600;
// Deux tranches vides consécutives séparent deux surfaces distinctes.
const TROU_MAX = 2;

interface Surface {
  y: number;
  aire: number;
  largeur: number;
  z0: number;
  z1: number;
}

/** Les surfaces horizontales du meuble, tournées vers le haut (+1) ou le bas (−1). */
function surfaces(geos: Geometrie[], dims: DimensionsArmoire, sens: 1 | -1): Surface[] {
  const pas = dims.hauteur / TRANCHES;
  const aires = new Float64Array(TRANCHES);
  const sommeY = new Float64Array(TRANCHES);
  const x0 = new Float64Array(TRANCHES).fill(Infinity);
  const x1 = new Float64Array(TRANCHES).fill(-Infinity);
  const z0 = new Float64Array(TRANCHES).fill(Infinity);
  const z1 = new Float64Array(TRANCHES).fill(-Infinity);

  for (const geo of geos) {
    const p = geo.positions;
    const n = geo.index ? geo.index.length : p.length / 3;
    for (let f = 0; f + 2 < n; f += 3) {
      const a = (geo.index ? geo.index[f] : f) * 3;
      const b = (geo.index ? geo.index[f + 1] : f + 1) * 3;
      const c = (geo.index ? geo.index[f + 2] : f + 2) * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      const norme = Math.hypot(nx, ny, nz);
      if (!norme) continue;
      if (sens * (ny / norme) < SEUIL_HORIZONTAL) continue;
      const y = (p[a + 1] + p[b + 1] + p[c + 1]) / 3;
      const tranche = Math.min(TRANCHES - 1, Math.max(0, Math.floor(y / pas)));
      const aire = norme / 2;
      aires[tranche] += aire;
      sommeY[tranche] += y * aire;
      x0[tranche] = Math.min(x0[tranche], p[a], p[b], p[c]);
      x1[tranche] = Math.max(x1[tranche], p[a], p[b], p[c]);
      z0[tranche] = Math.min(z0[tranche], p[a + 2], p[b + 2], p[c + 2]);
      z1[tranche] = Math.max(z1[tranche], p[a + 2], p[b + 2], p[c + 2]);
    }
  }

  // Regroupement des tranches voisines : une tablette n'est jamais parfaitement
  // plane, ses faces se répartissent sur deux ou trois tranches.
  const groupes: Surface[] = [];
  let t = 0;
  while (t < TRANCHES) {
    if (aires[t] === 0) { t++; continue; }
    let aire = 0, sy = 0;
    let gx0 = Infinity, gx1 = -Infinity, gz0 = Infinity, gz1 = -Infinity;
    let vide = 0;
    let u = t;
    while (u < TRANCHES && vide <= TROU_MAX) {
      if (aires[u] === 0) { vide++; u++; continue; }
      vide = 0;
      aire += aires[u];
      sy += sommeY[u];
      gx0 = Math.min(gx0, x0[u]); gx1 = Math.max(gx1, x1[u]);
      gz0 = Math.min(gz0, z0[u]); gz1 = Math.max(gz1, z1[u]);
      u++;
    }
    groupes.push({ y: sy / aire, aire, largeur: gx1 - gx0, z0: gz0, z1: gz1 });
    t = u;
  }

  // On ne garde que les surfaces qui traversent le meuble : une plaque de
  // fabricant ou un liseré de socle ne sont pas des étagères.
  const aireMax = groupes.reduce((a, g) => Math.max(a, g.aire), 0);
  return groupes.filter((g) => g.largeur >= dims.largeur * 0.5 && g.aire >= aireMax * 0.22);
}

/**
 * Les tablettes du meuble, de la plus HAUTE à la plus basse : un palmarès se lit
 * de haut en bas, et le titre le plus prestigieux doit être à hauteur d'œil.
 *
 * Une surface n'est une étagère que si quelque chose la couvre : le dessus du
 * meuble est horizontal lui aussi, mais il n'a pas de plafond — c'est ce qui
 * permet de l'écarter sans rien coder en dur.
 */
export function detecterEtageres(geos: Geometrie[], dims: DimensionsArmoire): Etagere[] {
  const hauts = surfaces(geos, dims, 1);
  const bas = surfaces(geos, dims, -1);
  const epsilon = dims.hauteur * 0.01;

  const etageres: Etagere[] = [];
  for (const s of hauts) {
    const plafond = bas
      .filter((d) => d.y > s.y + epsilon)
      .reduce((a, d) => Math.min(a, d.y), Infinity);
    if (!Number.isFinite(plafond)) continue; // rien au-dessus : c'est le toit
    const vide = plafond - s.y;
    if (vide < dims.hauteur * 0.04) continue; // interstice, pas une tablette
    etageres.push({
      y: s.y,
      vide,
      largeur: s.largeur,
      z: (s.z0 + s.z1) / 2,
      profondeur: s.z1 - s.z0,
    });
  }
  etageres.sort((a, b) => b.y - a.y);
  return etageres.length >= 2 ? etageres : etageresParDefaut(dims);
}

/**
 * Repli : si un jour le meuble est remplacé par un modèle dont on ne sait pas
 * lire les tablettes, on retombe sur une grille régulière. Mieux vaut une
 * vitrine approximative qu'une vitrine vide.
 */
export function etageresParDefaut(dims: DimensionsArmoire): Etagere[] {
  const lignes = 4;
  const bas = dims.hauteur * 0.14;
  const utile = dims.hauteur * 0.76;
  const pas = utile / lignes;
  return Array.from({ length: lignes }, (_, i) => ({
    y: bas + pas * (lignes - 1 - i),
    vide: pas,
    largeur: dims.largeur * 0.86,
    z: 0,
    profondeur: dims.profondeur * 0.6,
  }));
}

// =============================================================================
// 2. DISPOSER LE PALMARÈS
// =============================================================================

/**
 * Dispose TOUT le palmarès : à chaque trophée sa place, sur une tablette ou au
 * sol autour du meuble.
 *
 * @param modeles  dans l'ordre d'affichage (0 = le plus gagné / le plus prestigieux)
 * @param dims     encombrement de l'armoire dans la scène
 * @param etageres les tablettes, de la plus haute à la plus basse
 */
export function disposerArmoire(
  modeles: Modele[],
  dims: DimensionsArmoire,
  etageres: Etagere[],
): Place[] {
  const places = new Array<Place>(modeles.length);

  // --- 1. Qui va où ---------------------------------------------------------
  // ⚠️ La répartition se fait AVANT le placement : c'est ce qui permet de
  // centrer une rangée incomplète, et ce qui empêche les casiers troués.
  //
  // LA RÈGLE, EN UNE LIGNE, ET ELLE NE SOUFFRE PLUS D'EXCEPTION : une
  // distinction personnelle va en vitrine, un titre d'équipe va au sol.
  // L'ordre de prestige est conservé (`slice` ne trie pas) : le premier du
  // palmarès prend la place de vedette, au premier plan.
  const collectives = modeles.map((_, i) => i).filter((i) => !modeles[i].individuel);
  const sol: number[] = collectives.slice(0, MAX_SOL);
  const auSol = new Set(sol);

  // La vitrine ne reçoit QUE des distinctions. ⚠️ Elle ne recueille plus le
  // débordement du sol : c'était le bug signalé (« des trophées collectifs se
  // mettent dans l'armoire à trophées individuels »). Un palmarès sans aucune
  // distinction laisse donc le meuble vide — c'est exactement ce qui a été
  // demandé : les titres se voient de loin, la vitrine se remplit à mesure
  // qu'on est élu.
  //
  // ⚠️ LE DÉBORDEMENT VA VERS LE BAS, JAMAIS VERS LE HAUT. Une pièce qui ne
  // trouve pas sa place descend au sol ; rien ne remonte en vitrine. C'est la
  // formulation qui rend le bug impossible plutôt qu'improbable — et elle
  // garantit au passage que CHAQUE modèle reçoit une place (le composant lit
  // `places[i].echelle` sans filet).
  const rangees: number[][] = etageres.map(() => []);
  let etage = 0;
  modeles.forEach((_, i) => {
    if (auSol.has(i)) return;
    if (!modeles[i].individuel) { sol.push(i); return; }
    while (etage < etageres.length && rangees[etage].length >= COLONNES) etage++;
    if (etage >= etageres.length) { sol.push(i); return; }
    rangees[etage].push(i);
  });

  // --- 2. Les tablettes -----------------------------------------------------
  etageres.forEach((et, e) => {
    const rangee = rangees[e];
    if (rangee.length === 0) return;
    const colonne = et.largeur / COLONNES;
    const hMax = et.vide * REMPLISSAGE_HAUTEUR;
    const lMax = colonne * REMPLISSAGE_LARGEUR;
    const echelles = rangee.map((i) => {
      const t = modeles[i].taille;
      return Math.min(hMax / (t.y || 1), lMax / (t.x || 1));
    });
    const largeurs = rangee.map((i, k) => modeles[i].taille.x * echelles[k]);
    const utile = et.largeur * PART_LARGEUR_UTILE;
    const total = largeurs.reduce((a, b) => a + b, 0);
    const espace = Math.max(0, (utile - total) / (rangee.length + 1));
    let x = -utile / 2 + espace;
    rangee.forEach((i, k) => {
      places[i] = {
        position: [x + largeurs[k] / 2, et.y, et.z],
        rotation: [0, 0, 0],
        echelle: echelles[k],
        dehors: false,
      };
      x += largeurs[k] + espace;
    });
  });

  // --- 3. LE SOL : éparpillé devant le meuble -------------------------------
  // ⚠️ Demande explicite : « j'aimerais que les trophées collectifs soient
  // rangés dans le désordre, en mode éparpillés un peu partout devant
  // l'armoire ». Les anciennes files le long des flancs donnaient deux haies
  // bien rangées, d'un ordre de vitrine de magasin.
  //
  // ⚠️ ET LA GRILLE QUI LES A REMPLACÉES SUPERPOSAIT LES PIÈCES — bug signalé
  // en jeu : « certains trophées se superposent ». Elle prétendait pourtant
  // « garantir qu'aucune pièce n'en chevauche une autre ». Trois raisons, qui
  // se cumulaient, et aucune n'était visible à la relecture :
  //
  //  1. **L'ÉCHELLE NE REGARDAIT QUE LA HAUTEUR** (`buste / taille.y`). Un
  //     bouclier est large et plat : mis à hauteur de buste, il fait presque
  //     deux fois la largeur d'une case. La grille espaçait les CENTRES, pas
  //     les pièces.
  //  2. **LA SECOUSSE ÉTAIT UNE PART DE LA CASE**, pas du jeu réellement
  //     disponible : deux voisines déjà serrées se rapprochaient encore de
  //     68 % d'une case.
  //  3. **LA ROTATION SUR Y N'ÉTAIT COMPTÉE NULLE PART.** Une pièce pivotée de
  //     30° occupe au sol `l·cos θ + p·sin θ` — sensiblement plus que sa
  //     largeur. Le banc d'essai l'ignorait aussi, d'où un test au vert devant
  //     un écran qui montrait le contraire.
  //
  // LA MÉTHODE, MAINTENANT : on part des PIÈCES, plus d'une grille. Chacune
  // reçoit sa stature, on calcule son emprise au sol UNE FOIS PIVOTÉE, puis on
  // remplit des rangées tant que la largeur de zone tient — exactement comme la
  // vitrine range ses tablettes. Deux pièces ne peuvent alors plus se toucher :
  // l'écart entre elles est posé en mètres, et la secousse est bornée par lui.
  const buste = dims.hauteur * PART_BUSTE;
  if (sol.length > 0) {
    const zoneL = dims.largeur * ZONE_LARGEUR;
    const ecart = dims.largeur * ECART_SOL;

    /**
     * Range les titres en rangées, à une stature donnée, et rend la
     * profondeur totale occupée.
     *
     * ⚠️ SÉPARÉE DU PLACEMENT parce qu'on l'appelle PLUSIEURS FOIS : c'est le
     * seul moyen de savoir ce que coûte une stature avant de s'y engager.
     */
    const composer = (stature: number) => {
      const poses = sol.map((idx, k) => {
        const m = modeles[idx];
        const angle = m.bouclier ? INCLINAISON_BOUCLIER : 0;
        const pv = pivot(idx * 2 + 3);
        const c = Math.abs(Math.cos(pv));
        const sn = Math.abs(Math.sin(pv));
        // L'emprise au sol d'une boîte pivotée autour de Y, à l'échelle 1.
        const uniteX = m.taille.x * c + m.taille.z * sn;
        const uniteZ = m.taille.x * sn + m.taille.z * c;
        // La pièce maîtresse (le premier du palmarès) est un cran au-dessus.
        let echelle = (buste * stature * (k === 0 ? PART_VEDETTE : 1)) / (m.taille.y || 1);
        // ⚠️ ET AUCUNE PIÈCE N'EST PLUS LARGE QUE LA ZONE. Sans cette borne, un
        // bouclier démesuré ferait une rangée à lui seul et emporterait le
        // cadrage avec lui.
        echelle = Math.min(echelle, zoneL / (uniteX || 1));
        return {
          i: idx,
          angle,
          pv,
          echelle,
          ex: uniteX * echelle,
          ez: uniteZ * echelle,
          epaisseur: m.taille.z * echelle,
        };
      });

      // On remplit des RANGÉES, à la largeur réelle des pièces.
      type Pose = (typeof poses)[number];
      const rangs: Pose[][] = [];
      let courant: Pose[] = [];
      let large = 0;
      for (const pose of poses) {
        const avec = courant.length === 0 ? pose.ex : large + ecart + pose.ex;
        if (courant.length > 0 && avec > zoneL) {
          rangs.push(courant);
          courant = [pose];
          large = pose.ex;
        } else {
          courant.push(pose);
          large = avec;
        }
      }
      if (courant.length > 0) rangs.push(courant);

      const profondeurs = rangs.map((r) => Math.max(...r.map((pose) => pose.ez)));
      const totale = profondeurs.reduce((a, b) => a + b, 0) + ecart * (rangs.length - 1);
      return { rangs, profondeurs, totale };
    };

    // ⚠️ LA STATURE SE RÉDUIT JUSQU'À CE QUE LA SCÈNE TIENNE, et c'est le second
    // correctif de l'armoire.
    //
    // Le test « palmarès complet » (verifArmoire, section 9) a montré le
    // défaut : avec beaucoup de titres, chaque pièce gardait sa hauteur de
    // buste, les rangées s'empilaient vers l'avant, et la caméra reculait
    // d'autant — **le meuble tombait à 15 % de la hauteur de l'écran**. Aucun
    // chevauchement, tout était juste géométriquement, et la vitrine était
    // devenue illisible. Un palmarès complet doit impressionner, pas disparaître.
    //
    // ⚠️ ON RÉDUIT LA TAILLE, PAS LE NOMBRE. Écarter des trophées déjà gagnés
    // serait pire : le joueur ne verrait pas ce qu'il a remporté. Une foule de
    // pièces un peu plus petites devant le meuble se lit très bien — et c'est
    // même ce qui donne sa valeur à un grand palmarès.
    let stature = 1;
    let plan = composer(stature);
    const profondeurMax = dims.hauteur * PROFONDEUR_MAX;
    for (let essai = 0; essai < 12 && plan.totale > profondeurMax; essai++) {
      stature *= 0.9;
      plan = composer(stature);
    }

    // Du fond vers l'avant. ⚠️ LE RANG 0 PORTE LA VEDETTE, donc il va DEVANT :
    // c'est elle qu'on doit voir en premier, pas celle qui a hérité de la
    // meilleure place.
    const zBase = dims.profondeur / 2 + dims.hauteur * RECUL_MEUBLE;
    let z = zBase;
    for (let r = plan.rangs.length - 1; r >= 0; r--) {
      const rang = plan.rangs[r];
      const centreZ = z + plan.profondeurs[r] / 2;
      const largeurRang = rang.reduce((a, pose) => a + pose.ex, 0) + ecart * (rang.length - 1);
      // Une rangée incomplète est CENTRÉE, pas tassée à gauche.
      let x = -largeurRang / 2;
      for (const pose of rang) {
        // ⚠️ LA SECOUSSE EST UNE PART DE L'ÉCART, PAS DE LA CASE. Deux voisines
        // séparées de `ecart` et secouées l'une vers l'autre se rapprochent au
        // pire de `2 × SECOUSSE × ecart` : à 0,34, il reste toujours un tiers
        // de l'écart entre elles. C'est ce qui rend le chevauchement impossible
        // plutôt qu'improbable.
        const dx = secousse(pose.i * 2 + 1) * ecart * SECOUSSE;
        const dz = secousse(pose.i * 2 + 2) * ecart * SECOUSSE;
        places[pose.i] = {
          position: [
            x + pose.ex / 2 + dx,
            // Une pièce inclinée pivote sur sa base : sans ce rattrapage, son
            // arête arrière passe sous le sol. (Nul tant que l'angle l'est.)
            (Math.sin(pose.angle) * pose.epaisseur) / 2,
            // ⚠️ Et jamais en deçà de la face avant du meuble, secousse
            // comprise : `verifArmoire` appelle ça « encastrée dans le meuble ».
            Math.max(centreZ + dz, zBase + pose.ez / 2),
          ],
          // ⚠️ LA ROTATION Y EST LE CŒUR DE L'EFFET. Sans elle, des pièces
          // décalées mais toutes face au spectateur se lisent encore comme une
          // grille. Avec, on voit un palmarès posé, pas un présentoir. Elle est
          // décidée AVANT l'échelle, puisque c'est elle qui fixe l'emprise.
          rotation: [-pose.angle, pose.pv, 0],
          echelle: pose.echelle,
          dehors: true,
        };
        x += pose.ex + ecart;
      }
      z += plan.profondeurs[r] + ecart;
    }
  }
  return places;
}

/** Une pièce de la scène, réduite à ce qu'il faut pour la cadrer. */
export interface Boite {
  x: number;
  z: number;
  /** Base de la pièce, dans le repère du groupe (meuble posé en y = 0). */
  y: number;
  demiLargeur: number;
  hauteur: number;
}

/**
 * Où poser la caméra pour que TOUT tienne dans le champ.
 *
 * ⚠️ LA PROFONDEUR COMPTE. Une pièce posée au sol devant le meuble est plus
 * PRÈS de la caméra : à distance égale, elle occupe plus de largeur à l'écran.
 * Ne cadrer que sur `x` la faisait sortir du champ par les côtés. On exige donc
 * de chaque pièce qu'elle tienne à SA distance (`d − z`), et on garde la plus
 * exigeante.
 *
 * ⚠️ ET LE FORMAT DU CANVAS AUSSI : il fait 790 px de large sur ordinateur et
 * 337 px sur téléphone. Une distance de caméra figée laissait les pièces du sol
 * hors champ sur mobile.
 */
export function cadrage(
  boites: Boite[],
  dims: DimensionsArmoire,
  fovDegres: number,
  rapport: number,
): { distance: number; centreY: number } {
  // Le meuble lui-même est la première boîte à cadrer.
  const toutes: Boite[] = [
    { x: 0, z: dims.profondeur / 2, y: 0, demiLargeur: dims.largeur / 2, hauteur: dims.hauteur },
    ...boites,
  ];
  const haut = toutes.reduce((a, b) => Math.max(a, b.y + b.hauteur), 0);
  // Le groupe est descendu de la moitié du meuble : voici le centre de la scène
  // dans le repère du monde, celui que la caméra doit viser.
  const centreY = haut / 2 - dims.hauteur / 2;
  const tan = Math.tan((fovDegres * Math.PI) / 360);

  let distance = 0;
  for (const b of toutes) {
    const bas = b.y - dims.hauteur / 2;
    const ecartY = Math.max(Math.abs(bas + b.hauteur - centreY), Math.abs(bas - centreY));
    distance = Math.max(
      distance,
      (Math.abs(b.x) + b.demiLargeur) / (tan * rapport) + b.z,
      ecartY / tan + b.z,
    );
  }
  return { distance: distance * MARGE_CADRAGE, centreY };
}

/**
 * Une pièce plate et large — un bouclier. Mesuré sur la boîte englobante, donc
 * vrai quel que soit le `.glb` : pas de liste de noms à tenir à jour. Les
 * trophées qui SONT des boucliers sans en avoir la forme (le Brennus est livré
 * avec son socle, donc épais) le déclarent dans `data/trophees.ts`.
 */
export function estBouclier(t: TailleModele): boolean {
  return t.z <= t.x * 0.34 && t.x >= t.y * 0.55;
}
