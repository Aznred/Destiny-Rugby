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
// ⚠️ LE SOL EST BORNÉ. Une version intermédiaire sortait TOUTES les pièces : sur
// un palmarès complet, douze s'alignaient au sol, la scène faisait dix-huit
// unités de large et la caméra reculait si loin que le meuble devenait un
// timbre-poste. Au-delà de huit, un titre d'équipe reste en vitrine — ce qui
// remplit le meuble plutôt que de le laisser vide, et ne perd donc rien.
const MAX_SOL = 8;
// Espace entre le flanc du meuble et la première pièce : quasi nul, pour qu'un
// bouclier incliné semble VRAIMENT s'appuyer sur le coin de l'armoire.
const MARGE_FLANC = 0.05;
// Quatre rangs par côté, chacun un peu plus écarté et un peu plus en avant.
// ⚠️ ON S'ÉTALE EN PROFONDEUR, PAS EN LARGEUR, et c'est un calcul : un mètre de
// profondeur coûte un mètre de recul à la caméra, un mètre de largeur en coûte
// 1,4 sur ordinateur et 2,5 sur téléphone (le canvas y est presque carré). Une
// file qui s'écarte franchement sur les côtés sort du champ bien avant une file
// qui s'avance vers le spectateur.
const DECALAGE_RANG = 0.34;
// L'avancée d'un rang au suivant n'est PAS constante : elle suit l'emprise
// réelle des pièces déjà posées (voir `disposerArmoire`). Ceci n'est que l'air
// qu'on laisse entre deux pièces qui se suivent.
const ESPACE_AVANT = 0.16;
// ⚠️ Un bouclier posé au sol ne tient pas debout tout seul : il bascule en
// arrière jusqu'à toucher le meuble. 0,15 rad (8,6°) se lisait comme « droit » ;
// à 0,3 rad (17°), l'appui est évident.
const INCLINAISON_BOUCLIER = 0.3;
// Les pièces du sol s'ouvrent légèrement vers le spectateur.
const OUVERTURE = 0.2;

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
  // LA RÈGLE, EN UNE LIGNE : une distinction personnelle va en vitrine, un titre
  // d'équipe va au sol. Les boucliers passent devant les coupes dans la file du
  // sol — ce sont eux qu'on adosse au meuble, donc eux qui prennent les
  // emplacements collés aux flancs. `sort` est stable en JavaScript : à
  // l'intérieur de chaque famille, l'ordre de prestige est conservé.
  const collectives = modeles
    .map((_, i) => i)
    .filter((i) => !modeles[i].individuel)
    .sort((a, b) => Number(modeles[b].bouclier) - Number(modeles[a].bouclier));
  const sol: number[] = collectives.slice(0, MAX_SOL);
  const auSol = new Set(sol);

  // La vitrine reçoit les distinctions, PUIS le débordement du sol (les titres
  // au-delà de `MAX_SOL`). Un palmarès sans aucune distinction laisse donc le
  // meuble vide s'il tient au sol : c'est exactement ce qui a été demandé — les
  // titres se voient de loin, la vitrine se remplit à mesure qu'on est élu.
  const rangees: number[][] = etageres.map(() => []);
  let etage = 0;
  modeles.forEach((_, i) => {
    if (auSol.has(i)) return;
    while (etage < etageres.length && rangees[etage].length >= COLONNES) etage++;
    // Vitrine pleine : la pièce rejoint le sol malgré le plafond. Ne peut pas
    // arriver avec MAX_PIECES (16) et six tablettes de quatre — c'est une
    // ceinture, pas une bretelle.
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

  // --- 3. Le sol ------------------------------------------------------------
  // Une file par flanc, qui part du coin avant du meuble et s'avance vers le
  // spectateur. Le rang 0 est collé au meuble : c'est là que s'adossent les
  // boucliers, qui ouvrent la file.
  //
  // ⚠️ L'AVANCÉE SUIT L'EMPRISE RÉELLE, ELLE N'EST PAS FORFAITAIRE. Un pas fixe
  // marchait tant que toutes les pièces se ressemblaient ; un bouclier incliné
  // occupe en profondeur sa propre épaisseur PLUS le débord de son arête haute
  // (`sin(θ) × hauteur`, soit près d'un demi-mètre), et il chevauchait alors la
  // pièce suivante. On empile donc les emprises, côté par côté : aucun
  // recouvrement possible, quelles que soient les formes du palmarès.
  const buste = dims.hauteur * PART_BUSTE;
  const files: number[][] = [[], []];
  sol.forEach((i, k) => files[k % 2].push(i));

  files.forEach((file, c) => {
    const cote = c === 0 ? 1 : -1;
    // Le plan de la face avant du meuble : c'est LUI que l'arête haute d'un
    // bouclier doit toucher, et c'est de lui que part la file.
    let curseur = dims.profondeur / 2;
    file.forEach((i, rang) => {
      const m = modeles[i];
      const hauteur = buste * (i === sol[0] ? PART_VEDETTE : 1);
      const echelle = hauteur / (m.taille.y || 1);
      const largeur = m.taille.x * echelle;
      const epaisseur = m.taille.z * echelle;
      const angle = m.bouclier ? INCLINAISON_BOUCLIER : 0;

      // Ce que la pièce occupe en profondeur, de part et d'autre de sa base.
      const versLArriere = Math.sin(angle) * hauteur + (epaisseur * Math.cos(angle)) / 2;
      const versLAvant = (epaisseur * Math.cos(angle)) / 2;

      places[i] = {
        position: [
          cote * (dims.largeur / 2 + MARGE_FLANC + rang * DECALAGE_RANG + largeur / 2),
          // Une pièce inclinée pivote sur sa base : sans ce rattrapage, son
          // arête arrière passe sous le sol.
          (Math.sin(angle) * epaisseur) / 2,
          curseur + versLArriere,
        ],
        // Négatif = le haut part vers le fond, donc vers le meuble.
        rotation: [-angle, -cote * OUVERTURE, 0],
        echelle,
        dehors: true,
      };
      curseur += versLArriere + versLAvant + ESPACE_AVANT;
    });
  });

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
