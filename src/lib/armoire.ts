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
// ⚠️ LES PIÈCES DE PRESTIGE SORTENT DU MEUBLE (demande explicite : « j'aimerais
// que le bouclier de Brennus soit grand à côté de l'armoire, et certains
// boucliers contre l'armoire, posés ; le bouclier fait la taille d'un buste de
// rugbyman, et les grosses coupes pareil »). Les tablettes du modèle sont
// hautes de ~13 cm à l'échelle réelle : TOUT ce qu'on y pose est forcément
// petit. Les boucliers et les grands trophées vont donc au sol, à hauteur de
// buste, adossés au meuble ou à côté — c'est la seule façon de leur donner leur
// vraie stature.

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
  /** Pièce de prestige (Brennus, Coupe du monde…) : elle sort du meuble. */
  majeur: boolean;
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
// deux mètres, un buste soixante-dix centimètres — d'où ce tiers de la hauteur
// du meuble. La pièce maîtresse (le premier du palmarès) est un cran au-dessus.
const PART_BUSTE = 0.34;
const PART_VEDETTE = 1.14;
// ⚠️ LE SOL EST BORNÉ À SIX PIÈCES. Une version intermédiaire sortait TOUS les
// boucliers et toutes les grandes coupes : sur un palmarès complet, douze
// pièces s'alignaient au sol, la scène faisait dix-huit unités de large et la
// caméra devait reculer si loin que le meuble devenait un timbre-poste. Au-delà
// de six, les pièces majeures restent en vitrine — et le pied de la modale dit
// déjà, noir sur blanc, ce qui n'est pas montré.
const MAX_SOL = 6;
// Espace entre le flanc du meuble et la première pièce : assez court pour qu'un
// bouclier incliné semble VRAIMENT s'appuyer contre l'armoire.
const MARGE_FLANC = 0.12;
// Trois rangs par côté, chacun un peu plus écarté ET un peu plus en avant : une
// simple file le long du flanc s'étalerait sur toute la largeur de l'écran, et
// une simple pile masquerait les pièces du fond.
const DECALAGE_RANG = 0.32;
const PAS_AVANT = 0.85;
// Un bouclier posé au sol ne tient pas debout tout seul : il s'incline en
// arrière et s'appuie sur le meuble.
const INCLINAISON_BOUCLIER = -0.15;
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
  // Les boucliers passent devant les coupes dans la file du sol : ce sont eux
  // qu'on adosse au meuble, donc eux qui prennent les emplacements collés aux
  // flancs. `sort` est stable en JavaScript : à l'intérieur de chaque famille,
  // l'ordre de prestige est conservé.
  const majeures = modeles
    .map((_, i) => i)
    .filter((i) => modeles[i].majeur || modeles[i].bouclier)
    .sort((a, b) => Number(modeles[b].bouclier) - Number(modeles[a].bouclier));
  const sol: number[] = majeures.slice(0, MAX_SOL);
  const auSol = new Set(sol);

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
  // Un emplacement par rang et par côté : le rang 0 est collé au flanc du
  // meuble (c'est là que s'adossent les boucliers), les suivants s'écartent et
  // s'avancent vers le spectateur.
  const buste = dims.hauteur * PART_BUSTE;
  sol.forEach((i, k) => {
    const m = modeles[i];
    const hauteur = buste * (k === 0 ? PART_VEDETTE : 1);
    const echelle = hauteur / (m.taille.y || 1);
    const largeur = m.taille.x * echelle;
    const droite = k % 2 === 0;
    const rang = Math.floor(k / 2);
    const cote = droite ? 1 : -1;
    const inclinaison = m.bouclier ? INCLINAISON_BOUCLIER : 0;
    places[i] = {
      position: [
        cote * (dims.largeur / 2 + MARGE_FLANC + rang * DECALAGE_RANG + largeur / 2),
        // Une pièce inclinée pivote sur sa base : sans ce rattrapage, son arête
        // arrière passe sous le sol.
        (Math.abs(Math.sin(inclinaison)) * m.taille.z * echelle) / 2,
        dims.profondeur * 0.1 + rang * PAS_AVANT,
      ],
      rotation: [inclinaison, -cote * OUVERTURE, 0],
      echelle,
      dehors: true,
    };
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
