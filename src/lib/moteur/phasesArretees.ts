// LES PHASES ARRÊTÉES : MÊLÉE, TOUCHE, RUCK
//
// ⚠️ Ces placements étaient recalculés À CHAQUE TICK, avec du hasard dedans.
// Résultat : les pions vibraient sur place, et une mêlée ressemblait à une
// grappe informe. Ici chaque formation est calculée UNE SEULE FOIS, à l'entrée
// dans la phase, et les joueurs COURENT s'y placer — d'où un rendu naturel.
//
// Toutes les positions sont en mètres, dans le repère de `terrain.ts`.

import type { Pion } from './entites';
import { LARGEUR, borner, sens, type Cote, type Vec } from './terrain';

export type Placement = Record<string, Vec>;

// --- LA MÊLÉE ---------------------------------------------------------------
// Un vrai 3-4-1 face à face : première ligne (1-2-3), deuxième ligne (4-5)
// derrière, troisièmes lignes (6-7) sur les côtés, le 8 en pointe arrière.
// Le 9 est à la sortie, les trois-quarts en ligne derrière, les ailiers ouverts.
const MELEE_AVANTS: [number, number][] = [
  [0, -1.0], [0, 0], [0, 1.0], // 1-2-3 au contact
  [-1.5, -0.55], [-1.5, 0.55], // 4-5
  [-1.6, -1.7], [-1.6, 1.7], // 6-7
  [-3.0, 0], // 8 en pointe
];

export function placementMelee(
  pions: Pion[], ballon: Vec, possession: Cote,
): Placement {
  const placement: Placement = {};
  const grandCote = ballon.y < LARGEUR / 2 ? 1 : -1;

  for (const cote of ['A', 'B'] as Cote[]) {
    const s = sens(cote);
    const liste = pions.filter((p) => p.surLeTerrain && p.cote === cote);
    const avants = liste.filter((p) => p.avant).slice(0, 8);
    const arrieres = liste.filter((p) => !p.avant);
    // Les deux packs se font face : l'axe de poussée est celui du terrain.
    avants.forEach((p, i) => {
      const [dx, dy] = MELEE_AVANTS[i] ?? [-2, 0];
      placement[p.id] = {
        x: ballon.x - s * (0.8 - dx),
        y: borner(ballon.y + dy, 3, LARGEUR - 3),
      };
    });

    const attaque = cote === possession;
    for (const p of arrieres) {
      switch (p.numero) {
        case 9: // à la sortie de mêlée, du côté fermé
          placement[p.id] = {
            x: ballon.x - s * (attaque ? 1.2 : -1.2),
            y: borner(ballon.y - grandCote * 2.2, 2, LARGEUR - 2),
          };
          break;
        case 10:
          placement[p.id] = {
            x: ballon.x - s * (attaque ? 10 : -6),
            y: borner(ballon.y + grandCote * 9, 4, LARGEUR - 4),
          };
          break;
        case 12:
          placement[p.id] = { x: ballon.x - s * (attaque ? 12 : -6), y: borner(ballon.y + grandCote * 17, 4, LARGEUR - 4) };
          break;
        case 13:
          placement[p.id] = { x: ballon.x - s * (attaque ? 13 : -6), y: borner(ballon.y + grandCote * 25, 4, LARGEUR - 4) };
          break;
        case 11:
          placement[p.id] = { x: ballon.x - s * (attaque ? 14 : -8), y: 5 };
          break;
        case 14:
          placement[p.id] = { x: ballon.x - s * (attaque ? 14 : -8), y: LARGEUR - 5 };
          break;
        default: // 15 en couverture
          placement[p.id] = { x: ballon.x - s * 24, y: borner(ballon.y + grandCote * 3, 6, LARGEUR - 6) };
      }
    }
  }
  return placement;
}

// --- LA TOUCHE --------------------------------------------------------------
// L'alignement est PERPENDICULAIRE à la ligne de touche, les deux packs face à
// face à un mètre d'écart, le lanceur sur la ligne, le 9 derrière l'alignement,
// et les trois-quarts déployés dans le champ.
export function placementTouche(
  pions: Pion[], ballon: Vec, possession: Cote, nbSauteurs: number,
): Placement {
  const placement: Placement = {};
  const bord = ballon.y < LARGEUR / 2 ? 0 : LARGEUR;
  const versLInterieur = bord === 0 ? 1 : -1;

  for (const cote of ['A', 'B'] as Cote[]) {
    const s = sens(cote);
    const liste = pions.filter((p) => p.surLeTerrain && p.cote === cote);
    const avants = liste.filter((p) => p.avant);
    const arrieres = liste.filter((p) => !p.avant);
    const lance = cote === possession;
    // Le talonneur (2) lance : il est SUR la ligne de touche.
    const lanceur = avants.find((p) => p.numero === 2);
    const alignes = avants.filter((p) => p !== lanceur).slice(0, nbSauteurs);
    const horsAlignement = avants.filter((p) => p !== lanceur && !alignes.includes(p));

    if (lanceur) {
      placement[lanceur.id] = lance
        ? { x: ballon.x, y: bord === 0 ? 0.8 : LARGEUR - 0.8 }
        : { x: ballon.x - s * 3, y: bord === 0 ? 2.5 : LARGEUR - 2.5 };
    }
    // L'alignement : espacés d'un mètre, en s'éloignant de la touche.
    alignes.forEach((p, i) => {
      placement[p.id] = {
        x: ballon.x - s * (lance ? 0.5 : -0.5),
        y: borner(bord + versLInterieur * (5 + i * 2.2), 2, LARGEUR - 2),
      };
    });
    // Les avants hors alignement viennent dans la ligne de trois-quarts.
    horsAlignement.forEach((p, i) => {
      placement[p.id] = {
        x: ballon.x - s * (lance ? 8 : -5),
        y: borner(bord + versLInterieur * (18 + i * 5), 3, LARGEUR - 3),
      };
    });

    for (const p of arrieres) {
      if (p.numero === 9) {
        placement[p.id] = {
          x: ballon.x - s * (lance ? 2.5 : -2.5),
          y: borner(bord + versLInterieur * 3.5, 2, LARGEUR - 2),
        };
      } else if (p.numero === 15) {
        placement[p.id] = { x: ballon.x - s * 22, y: LARGEUR / 2 };
      } else {
        // 10, 12, 13, 11, 14 : la ligne se déploie vers le grand côté.
        const rang = [10, 12, 13, 11, 14].indexOf(p.numero);
        placement[p.id] = {
          x: ballon.x - s * (lance ? 10 : -7),
          y: borner(bord + versLInterieur * (14 + rang * 9), 3, LARGEUR - 3),
        };
      }
    }
  }
  return placement;
}

// --- LE RUCK ----------------------------------------------------------------
// Trois joueurs de chaque côté au contact, en deux lignes face à face, plus le 9
// à la sortie. Le reste de l'équipe se replace normalement (la tactique s'en
// charge) : on ne fige que le regroupement.
export function placementRuck(
  pions: Pion[], ballon: Vec, possession: Cote,
): Placement {
  const placement: Placement = {};
  for (const cote of ['A', 'B'] as Cote[]) {
    const s = sens(cote);
    const proches = pions
      .filter((p) => p.surLeTerrain && p.cote === cote && p.avant)
      .sort((a, b) =>
        Math.hypot(a.pos.x - ballon.x, a.pos.y - ballon.y)
        - Math.hypot(b.pos.x - ballon.x, b.pos.y - ballon.y))
      .slice(0, 3);
    proches.forEach((p, i) => {
      placement[p.id] = {
        x: ballon.x - s * (0.9 + Math.floor(i / 3) * 1.2),
        y: borner(ballon.y + (i - 1) * 1.15, 2, LARGEUR - 2),
      };
    });
    // Le 9 de l'équipe qui a le ballon vient le ramasser ; celui d'en face garde.
    const neuf = pions.find((p) => p.surLeTerrain && p.cote === cote && p.numero === 9);
    if (neuf) {
      placement[neuf.id] = cote === possession
        ? { x: ballon.x - s * 2.2, y: borner(ballon.y - 1.4, 2, LARGEUR - 2) }
        : { x: ballon.x + s * 2.2, y: borner(ballon.y + 1.4, 2, LARGEUR - 2) };
    }
  }
  return placement;
}

// --- LE COUP D'ENVOI --------------------------------------------------------
// --- LE COUP D'ENVOI --------------------------------------------------------
export function placementCoupEnvoi(pions: Pion[], milieu: number, possession: Cote): Placement {
  const placement: Placement = {};
  for (const p of pions) {
    if (!p.surLeTerrain) continue;
    const s = sens(p.cote);
    const engage = p.cote === possession;
    if (engage) {
      // L'équipe qui engage est massée derrière le ballon, prête à monter.
      placement[p.id] = {
        x: milieu - s * (2 + (p.numero % 4) * 1.5),
        y: borner(8 + p.numero * 3.6, 4, LARGEUR - 4),
      };
    } else {
      // L'équipe qui reçoit s'étage : les avants devant, les arrières au fond.
      const profondeur = p.avant ? 12 : 22 + (p.numero === 15 ? 8 : 0);
      placement[p.id] = {
        // 🛠️ CORRECTION ICI : "milieu - s * profondeur" au lieu du "+"
        // Cela garantit que chaque équipe reste bien dans son propre camp.
        x: milieu - s * profondeur,
        y: borner(8 + p.numero * 3.6, 4, LARGEUR - 4),
      };
    }
  }
  return placement;
}
