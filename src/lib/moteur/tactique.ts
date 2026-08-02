import type { Pion } from './entites';
import { LARGEUR, borner, ligneDefendue, sens, distance, type Cote, type Vec } from './terrain';

export type SystemeDefensif = 'blitz' | 'glissee';

const POD_PROFONDEUR = [-1.5, -3, -4, -3.5, -5, -6, -8, -12];

export interface Contexte {
  ballon: Vec; possession: Cote; systeme: SystemeDefensif;
  porteur?: Vec | null; consigne?: ConsigneJoueur; perceeEnCours?: boolean;
}

export interface ConsigneJoueur { profondeur: number; largeur: number; agressivite: number; libelle: string; }

function cibleAttaque(p: Pion, ctx: Contexte, index: number): Vec {
  const s = sens(p.cote); const b = ctx.ballon; const grandCote = b.y < LARGEUR / 2 ? 1 : -1;

  if (p.avant) {
    const prof = POD_PROFONDEUR[index] ?? -4;
    const bloc = index < 3 ? 0 : index < 6 ? 1 : 2;
    const ecart = [3, 11, 22][bloc] * grandCote;
    const decalage = ((index % 3) - 1) * 3.5;
    return { x: b.x + s * prof, y: borner(b.y + ecart + decalage, 3, LARGEUR - 3) };
  }

  switch (p.numero) {
    case 9: return { x: b.x + s * -1.5, y: borner(b.y - grandCote * 2, 2, LARGEUR - 2) };
    case 10: return { x: b.x + s * -7, y: borner(b.y + grandCote * 9, 4, LARGEUR - 4) };
    case 12: return { x: b.x + s * -8.5, y: borner(b.y + grandCote * 17, 4, LARGEUR - 4) };
    case 13: return { x: b.x + s * -9.5, y: borner(b.y + grandCote * 25, 4, LARGEUR - 4) };
    case 11: return { x: b.x + s * -10, y: 4 };
    case 14: return { x: b.x + s * -10, y: LARGEUR - 4 };
    default: return { x: b.x + s * -16, y: borner(b.y + grandCote * 4, 5, LARGEUR - 5) };
  }
}

function cibleDefense(p: Pion, ctx: Contexte, index: number): Vec {
  const s = sens(p.cote); const b = ctx.ballon;
  const avancee = ctx.systeme === 'blitz' ? 3.5 : 1.5;

  if (p.numero === 15) return { x: b.x - s * 26, y: borner(b.y * 0.35 + (LARGEUR / 2) * 0.65, 8, LARGEUR - 8) };
  if (p.numero === 11 || p.numero === 14) {
    const monCote = p.numero === 11 ? 0 : LARGEUR;
    if (Math.abs(b.y - monCote) > LARGEUR * 0.55) return { x: b.x - s * 20, y: borner(monCote === 0 ? 12 : LARGEUR - 12, 5, LARGEUR - 5) };
    return { x: b.x - s * avancee, y: borner(monCote === 0 ? 5 : LARGEUR - 5, 4, LARGEUR - 4) };
  }

  const rang = p.avant ? index : index - 6;
  const centre = ctx.systeme === 'glissee' ? b.y + (b.y < LARGEUR / 2 ? 6 : -6) : b.y;
  const decalage = (rang - (p.avant ? 3.5 : 2)) * (p.avant ? 5.5 : 8.5);
  return { x: b.x - s * avancee - (p.avant ? 0 : s * 1.5), y: borner(centre + decalage, 3, LARGEUR - 3) };
}

export function placer(pions: Pion[], ctx: Contexte): void {
  const parCote: Record<string, Pion[]> = { A: [], B: [] };
  for (const p of pions) if (p.surLeTerrain) parCote[p.cote].push(p);

  for (const cote of ['A', 'B'] as Cote[]) {
    const liste = parCote[cote];
    const attaque = ctx.possession === cote;
    const chasseurs = new Set<Pion>();

    if (!attaque && ctx.porteur) {
      const cible = ctx.porteur;
      const ligneADefendre = ligneDefendue(cote);
      const distAttaquantLigne = Math.abs(ligneADefendre - cible.x);

      [...liste]
          .filter((p) => p.recuperation <= 0)
          .filter((p) => p.numero !== 15 || ctx.perceeEnCours)
          .sort((a, b) => {
            const aBattu = Math.abs(ligneADefendre - a.pos.x) > distAttaquantLigne;
            const bBattu = Math.abs(ligneADefendre - b.pos.x) > distAttaquantLigne;
            if (aBattu !== bBattu) return aBattu ? 1 : -1;
            return distance(a.pos, cible) - distance(b.pos, cible);
          })
          .slice(0, 2)
          .forEach((p) => chasseurs.add(p));
    }

    liste.forEach((p, i) => {
      if (chasseurs.has(p) && ctx.porteur) { p.cible = { x: ctx.porteur.x, y: ctx.porteur.y }; return; }
      const cible = attaque ? cibleAttaque(p, ctx, i) : cibleDefense(p, ctx, i);
      if (p.moi && ctx.consigne) {
        const s = sens(p.cote);
        cible.x += s * ctx.consigne.profondeur;
        cible.y = borner(cible.y + ctx.consigne.largeur * (cible.y < LARGEUR / 2 ? -1 : 1), 3, LARGEUR - 3);
        if (attaque && ctx.consigne.agressivite > 0.6) { cible.x = cible.x * 0.55 + ctx.ballon.x * 0.45; cible.y = cible.y * 0.55 + ctx.ballon.y * 0.45; }
      }
      p.cible = cible;
    });
  }
}

export function choisirSysteme(ballon: Vec, defenseur: Cote, minute: number, ecartScore: number): SystemeDefensif {
  if (defenseur === 'A' ? ballon.x < 33 : ballon.x > 89) return 'glissee';
  if (minute > 60 && ecartScore < 0) return 'blitz';
  return Math.abs(ballon.y - LARGEUR / 2) > 18 ? 'glissee' : 'blitz';
}