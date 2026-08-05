// LA DISPOSITION DE L'ARMOIRE À TROPHÉES
//
// ⚠️ FONCTION PURE, ET C'EST VOLONTAIRE. La disposition pourrait vivre dans le
// composant R3F, mais elle serait alors invérifiable : il faudrait un GPU, une
// fenêtre et un œil humain pour savoir si le Bouclier de Brennus est bien posé
// au sol plutôt que coincé dans une étagère. Isolée ici, elle se teste en une
// seconde, sans navigateur (`npx vite-node scripts/verifArmoire.ts`).
//
// LA RÈGLE, en une phrase : chaque trophée est mis à l'échelle pour tenir en
// HAUTEUR de casier ; si à cette échelle il déborde en LARGEUR, il ne rentre
// dans aucune étagère et va au sol, en arc autour du meuble — plus grand.
// C'est la traduction littérale de la demande : « tous les trophées dedans, ou
// autour s'ils sont trop grands ».
//
// ⚠️ ON DISPOSE TOUT L'ENSEMBLE D'UN COUP, jamais trophée par trophée. Une
// première version décidait pour chacun isolément, à partir de son seul rang :
// dès qu'une pièce partait au sol, son casier restait VIDE, et la vitrine était
// trouée. Ici, les casiers se remplissent dans l'ordre — le compteur ne monte
// que quand un trophée s'y pose vraiment.

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

export interface Place {
  position: [number, number, number];
  echelle: number;
  /** true = posé au sol autour du meuble, parce qu'il ne rentrait pas. */
  dehors: boolean;
}

export const LIGNES = 4;
export const COLONNES = 4;
export const CASIERS = LIGNES * COLONNES;

// La grille utile, découpée dans la boîte englobante du meuble. Les marges
// laissent la place aux montants et à la vitre — sans elles, les trophées des
// colonnes extrêmes traversent les parois.
const PART_LARGEUR = 0.74;
const BAS = 0.14;
const PART_HAUTEUR = 0.76;
// Un trophée occupe les deux tiers de la hauteur de son casier : le reste, c'est
// l'air au-dessus, sans lequel une vitrine ressemble à un carton de déménagement.
const REMPLISSAGE_HAUTEUR = 0.66;
// Marge de largeur avant de déclarer un trophée « trop large ».
const MARGE_LARGEUR = 0.86;

// L'arc au sol : cinq pièces par anneau, sur 160° devant le meuble.
// ⚠️ LE RAYON EST BORNÉ. Une première version éloignait chaque pièce d'un cran
// supplémentaire, sans limite : au douzième trophée on était à vingt unités du
// meuble, largement hors du champ de la caméra (qui plafonne à 11).
const PAR_ANNEAU = 5;
const ARC_DEGRES = 160;

export function casier(dims: DimensionsArmoire): {
  largeur: number; hauteur: number; basY: number; utileL: number; utileH: number;
} {
  const utileL = dims.largeur * PART_LARGEUR;
  const utileH = dims.hauteur * PART_HAUTEUR;
  return {
    largeur: utileL / COLONNES,
    hauteur: utileH / LIGNES,
    basY: dims.hauteur * BAS,
    utileL,
    utileH,
  };
}

function placeEnRayon(dims: DimensionsArmoire, slot: number, echelle: number): Place {
  const c = casier(dims);
  const ligne = Math.floor(slot / COLONNES);
  const colonne = slot % COLONNES;
  return {
    // Les rangées du HAUT d'abord : un palmarès se lit de haut en bas, et le
    // titre le plus prestigieux doit être à hauteur d'œil.
    position: [
      -c.utileL / 2 + c.largeur * (colonne + 0.5),
      c.basY + c.utileH - c.hauteur * (ligne + 0.5) - c.hauteur * 0.28,
      dims.profondeur * 0.04,
    ],
    echelle,
    dehors: false,
  };
}

function placeAuSol(taille: TailleModele, dims: DimensionsArmoire, slot: number): Place {
  const anneau = Math.floor(slot / PAR_ANNEAU);
  const rang = slot % PAR_ANNEAU;
  const rayon = dims.largeur * 0.85 + anneau * dims.largeur * 0.45;
  // Réparti sur l'arc : un seul élément dans l'anneau ⇒ pile au centre.
  const part = PAR_ANNEAU > 1 ? rang / (PAR_ANNEAU - 1) : 0.5;
  const angle = ((-ARC_DEGRES / 2 + ARC_DEGRES * part) * Math.PI) / 180;
  return {
    position: [Math.sin(angle) * rayon, 0, Math.cos(angle) * rayon],
    // Posé au sol, il a de la place : on lui donne un quart de la hauteur du
    // meuble, ce qui le rend nettement plus imposant qu'en rayon.
    echelle: (dims.hauteur * 0.26) / (taille.y || 1),
    dehors: true,
  };
}

/**
 * Dispose TOUT le palmarès : à chaque trophée sa place, dans un casier ou au sol.
 *
 * @param tailles encombrement de chaque modèle (boîte englobante, échelle 1),
 *                dans l'ordre d'affichage (0 = le plus gagné / le plus prestigieux)
 * @param dims    encombrement de l'armoire dans la scène
 */
export function disposerArmoire(tailles: TailleModele[], dims: DimensionsArmoire): Place[] {
  const c = casier(dims);
  let casierLibre = 0;
  let solLibre = 0;

  return tailles.map((taille) => {
    // 1. Mise à l'échelle sur la HAUTEUR du casier.
    const echelleRayon = (c.hauteur * REMPLISSAGE_HAUTEUR) / (taille.y || 1);
    // 2. À cette échelle, tient-il en largeur ? Et reste-t-il un casier libre ?
    const tient = taille.x * echelleRayon <= c.largeur * MARGE_LARGEUR && casierLibre < CASIERS;
    if (tient) return placeEnRayon(dims, casierLibre++, echelleRayon);
    return placeAuSol(taille, dims, solLibre++);
  });
}
