import type { Pion } from './entites';
import { LARGEUR, borner, sens, type Cote, type Vec } from './terrain';

export type Placement = Record<string, Vec>;
const MELEE_AVANTS: [number, number][] = [[0, -1.0], [0, 0], [0, 1.0], [-1.5, -0.55], [-1.5, 0.55], [-1.6, -1.7], [-1.6, 1.7], [-3.0, 0]];

export function placementMelee(pions: Pion[], ballon: Vec, possession: Cote): Placement {
  const placement: Placement = {}; const grandCote = ballon.y < LARGEUR / 2 ? 1 : -1;
  for (const cote of ['A', 'B'] as Cote[]) {
    const s = sens(cote); const liste = pions.filter((p) => p.surLeTerrain && p.cote === cote);
    const avants = liste.filter((p) => p.avant).slice(0, 8); const arrieres = liste.filter((p) => !p.avant);
    avants.forEach((p, i) => { const [dx, dy] = MELEE_AVANTS[i] ?? [-2, 0]; placement[p.id] = { x: ballon.x - s * (0.8 - dx), y: borner(ballon.y + dy, 3, LARGEUR - 3) }; });
    const attaque = cote === possession;
    for (const p of arrieres) {
      switch (p.numero) {
        case 9: placement[p.id] = { x: ballon.x - s * (attaque ? 1.2 : -1.2), y: borner(ballon.y - grandCote * 2.2, 2, LARGEUR - 2) }; break;
        case 10: placement[p.id] = { x: ballon.x - s * (attaque ? 10 : -6), y: borner(ballon.y + grandCote * 9, 4, LARGEUR - 4) }; break;
        case 12: placement[p.id] = { x: ballon.x - s * (attaque ? 12 : -6), y: borner(ballon.y + grandCote * 17, 4, LARGEUR - 4) }; break;
        case 13: placement[p.id] = { x: ballon.x - s * (attaque ? 13 : -6), y: borner(ballon.y + grandCote * 25, 4, LARGEUR - 4) }; break;
        case 11: placement[p.id] = { x: ballon.x - s * (attaque ? 14 : -8), y: 5 }; break;
        case 14: placement[p.id] = { x: ballon.x - s * (attaque ? 14 : -8), y: LARGEUR - 5 }; break;
        default: placement[p.id] = { x: ballon.x - s * 24, y: borner(ballon.y + grandCote * 3, 6, LARGEUR - 6) };
      }
    }
  }
  return placement;
}

export function placementTouche(pions: Pion[], ballon: Vec, possession: Cote, nbSauteurs: number): Placement {
  const placement: Placement = {}; const bord = ballon.y < LARGEUR / 2 ? 0 : LARGEUR; const versLInterieur = bord === 0 ? 1 : -1;
  for (const cote of ['A', 'B'] as Cote[]) {
    const s = sens(cote); const liste = pions.filter((p) => p.surLeTerrain && p.cote === cote);
    const avants = liste.filter((p) => p.avant); const arrieres = liste.filter((p) => !p.avant);
    const lance = cote === possession; const lanceur = avants.find((p) => p.numero === 2);
    const alignes = avants.filter((p) => p !== lanceur).slice(0, nbSauteurs);
    const horsAlignement = avants.filter((p) => p !== lanceur && !alignes.includes(p));

    if (lanceur) placement[lanceur.id] = lance ? { x: ballon.x, y: bord === 0 ? 0.8 : LARGEUR - 0.8 } : { x: ballon.x - s * 3, y: bord === 0 ? 2.5 : LARGEUR - 2.5 };
    alignes.forEach((p, i) => { placement[p.id] = { x: ballon.x - s * (lance ? 0.5 : -0.5), y: borner(bord + versLInterieur * (5 + i * 2.2), 2, LARGEUR - 2) }; });
    horsAlignement.forEach((p, i) => { placement[p.id] = { x: ballon.x - s * (lance ? 8 : -5), y: borner(bord + versLInterieur * (18 + i * 5), 3, LARGEUR - 3) }; });

    for (const p of arrieres) {
      if (p.numero === 9) placement[p.id] = { x: ballon.x - s * (lance ? 2.5 : -2.5), y: borner(bord + versLInterieur * 3.5, 2, LARGEUR - 2) };
      else if (p.numero === 15) placement[p.id] = { x: ballon.x - s * 22, y: LARGEUR / 2 };
      else { const rang = [10, 12, 13, 11, 14].indexOf(p.numero); placement[p.id] = { x: ballon.x - s * (lance ? 10 : -7), y: borner(bord + versLInterieur * (14 + rang * 9), 3, LARGEUR - 3) }; }
    }
  }
  return placement;
}

export function placementRuck(pions: Pion[], ballon: Vec, possession: Cote): Placement {
  const placement: Placement = {};
  for (const cote of ['A', 'B'] as Cote[]) {
    const s = sens(cote);
    const proches = pions.filter((p) => p.surLeTerrain && p.cote === cote && p.avant).sort((a, b) => Math.hypot(a.pos.x - ballon.x, a.pos.y - ballon.y) - Math.hypot(b.pos.x - ballon.x, b.pos.y - ballon.y)).slice(0, 3);
    proches.forEach((p, i) => { placement[p.id] = { x: ballon.x - s * (0.9 + Math.floor(i / 3) * 1.2), y: borner(ballon.y + (i - 1) * 1.15, 2, LARGEUR - 2) }; });
    const neuf = pions.find((p) => p.surLeTerrain && p.cote === cote && p.numero === 9);
    if (neuf) placement[neuf.id] = cote === possession ? { x: ballon.x - s * 2.2, y: borner(ballon.y - 1.4, 2, LARGEUR - 2) } : { x: ballon.x + s * 2.2, y: borner(ballon.y + 1.4, 2, LARGEUR - 2) };
  }
  return placement;
}

// 🛠️ CORRECTION MAGISTRALE DU COUP D'ENVOI : Le "moins" au lieu du "plus"
export function placementCoupEnvoi(pions: Pion[], milieu: number, possession: Cote): Placement {
  const placement: Placement = {};
  for (const p of pions) {
    if (!p.surLeTerrain) continue;
    const s = sens(p.cote);
    const engage = p.cote === possession;

    if (engage) {
      // L'équipe qui tape avance jusqu'à la ligne
      placement[p.id] = { x: milieu - s * (2 + (p.numero % 4) * 1.5), y: borner(LARGEUR / 2 + ((p.numero % 2 === 0 ? 1 : -1) * (p.numero * 2)), 4, LARGEUR - 4) };
    } else {
      // L'équipe qui reçoit : Le quadrillage se fait bien en RECULANT dans SON camp ("milieu - s * prof")
      let profondeur = 0; let ecartY = LARGEUR / 2;
      if (p.avant) {
        profondeur = 12 + (p.numero % 3) * 5; // Rideau 1 (Avants)
        ecartY = (LARGEUR / 8) * p.numero;
      } else if (p.numero === 11 || p.numero === 14 || p.numero === 15) {
        profondeur = 35; // Rideau 3 (Arrières)
        ecartY = p.numero === 15 ? LARGEUR / 2 : (p.numero === 11 ? 15 : LARGEUR - 15);
      } else {
        profondeur = 24; // Rideau 2 (Centres)
        ecartY = (LARGEUR / 5) * (p.numero - 8);
      }
      placement[p.id] = { x: milieu - s * profondeur, y: borner(ecartY, 4, LARGEUR - 4) };
    }
  }
  return placement;
}