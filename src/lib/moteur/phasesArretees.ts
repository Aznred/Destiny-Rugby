// LES PHASES ARRÊTÉES — mêlée, touche, ruck, coup d'envoi, tir au but.
//
// ⚠️ Chaque formation est calculée UNE SEULE FOIS à l'entrée dans la phase, puis
// figée : les joueurs COURENT s'y placer. Recalculer le placement à chaque tick,
// avec du hasard dedans, faisait vibrer les pions sur place.
//
// ⚠️⚠️ UNE SEULE CONVENTION DE SIGNE, ET ELLE EST VITALE.
// Pour une équipe de sens `s` (+1 pour A, −1 pour B) :
//     « d mètres DERRIÈRE, de son point de vue »  =  ref − s × d
//     « d mètres DEVANT »                          =  ref + s × d
// Les deux équipes utilisent la MÊME formule avec LEUR propre `s`. C'est ce qui
// place naturellement les deux packs face à face et les deux lignes de
// trois-quarts de part et d'autre. Le premier jet inversait le signe pour
// l'équipe qui ne lançait pas : ses trois-quarts se retrouvaient DERRIÈRE
// l'attaque, et toute la défense était traversée dès la première passe.

import type { Pion } from './entites.js';
import { AXE, LARGEUR, LONGUEUR, MILIEU, borner, sens, type Cote, type Vec } from './terrain.js';

export type Placement = Record<string, Vec>;

const MARGE = 2.5;
function bY(y: number): number { return borner(y, MARGE, LARGEUR - MARGE); }

function parCote(pions: Pion[], cote: Cote): Pion[] {
  return pions.filter((p) => p.surLeTerrain && p.cote === cote && p.sanction <= 0);
}
function numero(liste: Pion[], n: number): Pion | undefined { return liste.find((p) => p.numero === n); }

// ---------------------------------------------------------------------------
// LA MÊLÉE — 3-4-1 contre 3-4-1
// ---------------------------------------------------------------------------
// [recul depuis le tunnel, écart latéral], en mètres.
const MELEE: Record<number, [number, number]> = {
  1: [0.5, -0.85], 2: [0.4, 0], 3: [0.5, 0.85],
  4: [1.6, -0.45], 5: [1.6, 0.45],
  6: [1.8, -1.55], 7: [1.8, 1.55],
  8: [2.8, 0],
};

export function placementMelee(pions: Pion[], mark: Vec, possession: Cote): Placement {
  const pl: Placement = {};
  const ouvert: 1 | -1 = mark.y < AXE ? 1 : -1;
  for (const cote of ['A', 'B'] as Cote[]) {
    const s = sens(cote);
    const liste = parCote(pions, cote);
    const introduit = cote === possession;

    // Les huit avants, chacun reculé depuis le tunnel DE SON CÔTÉ : les deux
    // premières lignes se retrouvent donc épaule contre épaule.
    for (const p of liste.filter((q) => q.avant).slice(0, 8)) {
      const [dx, dy] = MELEE[p.numero] ?? [2, 0];
      p.role = 'melee';
      pl[p.id] = { x: mark.x - s * dx, y: bY(mark.y + dy) };
    }

    // Le 9 qui introduit est au tunnel ; l'autre garde la sortie, à hauteur du 8.
    const neuf = numero(liste, 9);
    if (neuf) {
      pl[neuf.id] = introduit
        ? { x: mark.x - s * 0.5, y: bY(mark.y - ouvert * 1.5) }
        : { x: mark.x - s * 2.6, y: bY(mark.y + ouvert * 1.8) };
    }

    // La ligne de trois-quarts. ⚠️ Ligne de hors-jeu de la mêlée : cinq mètres
    // derrière le dernier pied pour l'équipe qui ne l'introduit pas.
    const recul = introduit ? 0 : -1.5;
    const trois: [number, number, number][] = [
      [10, 10, 9], [12, 12, 19], [13, 13, 28], [15, 21, 4],
    ];
    for (const [n, prof, dy] of trois) {
      const p = numero(liste, n);
      if (!p) continue;
      pl[p.id] = {
        x: mark.x - s * (prof + recul),
        y: bY(mark.y + ouvert * dy * (introduit ? 1 : 0.85)),
      };
    }
    for (const n of [11, 14]) {
      const p = numero(liste, n);
      if (!p) continue;
      pl[p.id] = { x: mark.x - s * (introduit ? 15 : 13), y: n === 11 ? 6 : LARGEUR - 6 };
    }
  }
  return pl;
}

// ---------------------------------------------------------------------------
// LA TOUCHE — alignement perpendiculaire, entre les 5 et les 15 mètres
// ---------------------------------------------------------------------------
export function placementTouche(
  pions: Pion[], mark: Vec, possession: Cote, nbAlignes: number,
): Placement {
  const pl: Placement = {};
  const bord = mark.y < AXE ? 0 : LARGEUR;
  const vers = bord === 0 ? 1 : -1; // « vers l'intérieur du terrain »

  for (const cote of ['A', 'B'] as Cote[]) {
    const s = sens(cote);
    const liste = parCote(pions, cote);
    const lance = cote === possession;

    const lanceur = numero(liste, 2);
    const avants = liste.filter((p) => p.avant && p !== lanceur);
    const alignes = avants.slice(0, Math.max(2, nbAlignes));
    const dehors = avants.slice(alignes.length);

    // Le talonneur lance depuis la ligne de touche ; en face, il se range dans
    // le couloir des 5 mètres, de son côté de l'alignement.
    if (lanceur) {
      pl[lanceur.id] = lance
        ? { x: mark.x, y: bord === 0 ? 0.7 : LARGEUR - 0.7 }
        : { x: mark.x - s * 2.2, y: bY(bord + vers * 3) };
    }
    // L'alignement : de 5 m à ~14 m de la touche, un joueur tous les 2 m. Les
    // deux équipes sont séparées par le mètre réglementaire — chacune 55 cm
    // derrière la ligne de touche, DE SON CÔTÉ.
    alignes.forEach((p, i) => {
      p.role = 'alignement';
      pl[p.id] = { x: mark.x - s * 0.55, y: bY(bord + vers * (5 + i * 2.1)) };
    });
    // Les avants hors alignement remontent dans la ligne, côté ouvert.
    dehors.forEach((p, i) => {
      pl[p.id] = { x: mark.x - s * (lance ? 9 : 11), y: bY(bord + vers * (19 + i * 6)) };
    });

    const neuf = numero(liste, 9);
    if (neuf) pl[neuf.id] = { x: mark.x - s * (lance ? 3 : 4), y: bY(bord + vers * 8) };

    // ⚠️ La ligne de hors-jeu de la touche est à DIX mètres, pour les deux
    // équipes : c'est cet espace qui rend un lancement de jeu possible.
    const trois: [number, number, number][] = [
      [10, 12, 17], [12, 13.5, 26], [13, 15, 35], [15, 23, 45],
    ];
    for (const [n, prof, dy] of trois) {
      const p = numero(liste, n);
      if (!p) continue;
      pl[p.id] = {
        x: mark.x - s * (lance ? prof : Math.max(10.5, prof - 2)),
        y: bY(bord + vers * dy),
      };
    }
    for (const n of [11, 14]) {
      const p = numero(liste, n);
      if (!p) continue;
      // L'ailier du côté de la touche couvre le fond, l'autre est au large.
      const versLeBord = (n === 11 && bord === 0) || (n === 14 && bord === LARGEUR);
      pl[p.id] = versLeBord
        ? { x: mark.x - s * (lance ? 24 : 20), y: bY(bord + vers * 13) }
        : { x: mark.x - s * (lance ? 16 : 12), y: n === 11 ? 6 : LARGEUR - 6 };
    }
  }
  return pl;
}

// ---------------------------------------------------------------------------
// LE RUCK — trois contre deux sur le ballon, le 9 à la sortie
// ---------------------------------------------------------------------------
// ⚠️ Ne fige QUE les joueurs engagés : les autres continuent de se replacer
// selon la structure d'attaque ou de défense, comme dans un vrai match.
export function placementRuck(pions: Pion[], ballon: Vec, possession: Cote): Placement {
  const pl: Placement = {};
  for (const cote of ['A', 'B'] as Cote[]) {
    const s = sens(cote);
    const attaque = cote === possession;
    const liste = parCote(pions, cote)
      .filter((p) => p.avant && p.numero !== 9)
      .sort((a, b) => (a.pos.x - ballon.x) ** 2 + (a.pos.y - ballon.y) ** 2
        - ((b.pos.x - ballon.x) ** 2 + (b.pos.y - ballon.y) ** 2));
    liste.slice(0, attaque ? 3 : 2).forEach((p, i) => {
      p.role = 'ruck';
      pl[p.id] = {
        x: ballon.x - s * (0.75 + Math.floor(i / 2) * 0.9),
        y: bY(ballon.y + ((i % 2) - 0.5) * 1.5),
      };
    });
  }
  const neuf = parCote(pions, possession).find((p) => p.numero === 9);
  if (neuf) {
    const s = sens(possession);
    pl[neuf.id] = { x: ballon.x - s * 1.5, y: bY(ballon.y - 1.1) };
  }
  return pl;
}

// ---------------------------------------------------------------------------
// LE COUP D'ENVOI — une ligne de chasseurs, l'équipe qui reçoit sous le ballon
// ---------------------------------------------------------------------------
export function placementCoupEnvoi(
  pions: Pion[], ligneX: number, engage: Cote, chute: Vec,
): Placement {
  const pl: Placement = {};
  for (const cote of ['A', 'B'] as Cote[]) {
    const s = sens(cote);
    const liste = parCote(pions, cote);

    if (cote === engage) {
      // Le botteur au centre, les chasseurs en ligne DERRIÈRE la ligne de
      // renvoi (règle : on ne peut pas la dépasser avant le coup de pied).
      const botteur = liste.find((p) => p.numero === 10) ?? liste[0];
      const iBot = liste.indexOf(botteur);
      liste.forEach((p, i) => {
        if (p === botteur) { pl[p.id] = { x: ligneX - s * 1.2, y: AXE }; return; }
        const rang = i - (i > iBot ? 1 : 0);
        pl[p.id] = {
          x: ligneX - s * (1.5 + (rang % 3) * 1.6),
          y: bY(chute.y + (rang - 6) * 4.6),
        };
      });
    } else {
      // ⚠️ L'équipe qui reçoit se place AUTOUR DU POINT DE CHUTE, pas à une
      // profondeur fixe : sinon ses avants attendaient vingt mètres trop court
      // et le chasseur récupérait un ballon sans personne devant lui.
      for (const p of liste) {
        if (p.avant) {
          pl[p.id] = {
            x: chute.x - s * ((p.numero % 3) * 3 - 3),
            y: bY(chute.y + ((p.numero % 4) - 1.5) * 6),
          };
        } else if (p.numero === 15) {
          pl[p.id] = { x: ligneX - s * 34, y: AXE };
        } else if (p.numero === 11 || p.numero === 14) {
          pl[p.id] = { x: ligneX - s * 26, y: p.numero === 11 ? 9 : LARGEUR - 9 };
        } else {
          pl[p.id] = { x: chute.x - s * 11, y: bY(AXE + (p.numero - 11.5) * 9) };
        }
      }
    }
  }
  return pl;
}

// ---------------------------------------------------------------------------
// LE TIR AU BUT — les coéquipiers derrière le botteur, l'adversaire sous ses poteaux
// ---------------------------------------------------------------------------
export function placementTir(pions: Pion[], lieu: Vec, botteur: Cote, buteurId?: string): Placement {
  const pl: Placement = {};
  for (const cote of ['A', 'B'] as Cote[]) {
    const s = sens(cote);
    const liste = parCote(pions, cote);
    liste.forEach((p, i) => {
      if (cote === botteur) {
        const estButeur = buteurId ? p.id === buteurId : i === 0;
        pl[p.id] = estButeur
          ? { x: lieu.x, y: bY(lieu.y) }
          : { x: lieu.x - s * (6 + (i % 4) * 2.5), y: bY(lieu.y + ((i % 7) - 3) * 5) };
      } else {
        // Derrière sa propre ligne d'en-but.
        const ligne = cote === 'A' ? 9 : LONGUEUR - 9;
        pl[p.id] = { x: ligne, y: bY(AXE + ((i % 8) - 3.5) * 5.5) };
      }
    });
  }
  return pl;
}

// ---------------------------------------------------------------------------
// LE RENVOI AUX 22
// ---------------------------------------------------------------------------
export function placementRenvoi22(pions: Pion[], ligneX: number, engage: Cote): Placement {
  const pl: Placement = {};
  for (const cote of ['A', 'B'] as Cote[]) {
    const s = sens(cote);
    const liste = parCote(pions, cote);
    liste.forEach((p, i) => {
      pl[p.id] = cote === engage
        ? { x: ligneX - s * (0.8 + (i % 4) * 1.4), y: bY(AXE + ((i % 8) - 3.5) * 6) }
        // L'adversaire attend à dix mètres au moins, DE SON CÔTÉ de la ligne.
        : { x: ligneX - s * (11 + (i % 5) * 4), y: bY(AXE + ((i % 9) - 4) * 6.5) };
    });
  }
  return pl;
}

// Position de départ, avant le tout premier coup d'envoi.
export function placementInitial(pions: Pion[], engage: Cote, chute: Vec): Placement {
  return placementCoupEnvoi(pions, MILIEU, engage, chute);
}
