import type { Pion } from './entites';
import { LARGEUR, borner, ligneDefendue, sens, distance, type Cote, type Vec } from './terrain';

export type SystemeDefensif = 'blitz' | 'glissee';

export interface Contexte {
  ballon: Vec; possession: Cote; systeme: SystemeDefensif;
  porteur?: Vec | null; consigne?: ConsigneJoueur; perceeEnCours?: boolean;
}

export interface ConsigneJoueur { profondeur: number; largeur: number; agressivite: number; libelle: string; }

function cibleAttaque(p: Pion, ctx: Contexte, index: number): Vec {
  const s = sens(p.cote);
  const refX = ctx.ballon.x; // La ligne d'avantage virtuelle
  const grandCote = ctx.ballon.y < LARGEUR / 2 ? 1 : -1;

  if (p.avant) {
    const bloc = index < 3 ? 0 : index < 6 ? 1 : 2;
    const ecart = [3, 11, 22][bloc] * grandCote;
    const decalage = ((index % 3) - 1) * 3.5;
    // 🏉 L'attaque arrive LANÇÉE (seulement 2m derrière la ligne, plus de recul !)
    return { x: refX - s * 2.0, y: borner(ctx.ballon.y + ecart + decalage, 3, LARGEUR - 3) };
  }

  // 🏉 Les 3/4 s'alignent à plat et avancent EN MÊME TEMPS que le porteur
  switch (p.numero) {
    case 9: return { x: ctx.ballon.x - s * 1.5, y: ctx.ballon.y };
    case 10: return { x: refX - s * 2.0, y: borner(ctx.ballon.y + grandCote * 10, 4, LARGEUR - 4) };
    case 12: return { x: refX - s * 2.5, y: borner(ctx.ballon.y + grandCote * 17, 4, LARGEUR - 4) };
    case 13: return { x: refX - s * 3.0, y: borner(ctx.ballon.y + grandCote * 24, 4, LARGEUR - 4) };
    case 11: return { x: refX - s * 3.5, y: 5 };
    case 14: return { x: refX - s * 3.5, y: LARGEUR - 5 };
    default: return { x: refX - s * 12, y: borner(ctx.ballon.y + grandCote * 4, 5, LARGEUR - 5) };
  }
}

function cibleDefense(p: Pion, ctx: Contexte, index: number): Vec {
  const s = sens(p.cote); const b = ctx.ballon;
  const avancee = ctx.systeme === 'blitz' ? 4.5 : 1.5;

  // 🛡️ CORRECTION : "b.x - s * distance" place bien le joueur ENTRE le ballon et la ligne d'essai !
  if (p.numero === 15) return { x: b.x - s * 26, y: borner(b.y * 0.35 + (LARGEUR / 2) * 0.65, 8, LARGEUR - 8) };
  if (p.numero === 11 || p.numero === 14) {
    const monCote = p.numero === 11 ? 0 : LARGEUR;
    if (Math.abs(b.y - monCote) > LARGEUR * 0.55) return { x: b.x - s * 20, y: borner(monCote === 0 ? 12 : LARGEUR - 12, 5, LARGEUR - 5) };
    return { x: b.x - s * avancee, y: borner(monCote === 0 ? 5 : LARGEUR - 5, 4, LARGEUR - 4) };
  }

  const rang = p.avant ? index : index - 6;
  const centre = ctx.systeme === 'glissee' ? b.y + (b.y < LARGEUR / 2 ? 6 : -6) : b.y;
  const decalage = (rang - (p.avant ? 3.5 : 2)) * (p.avant ? 5.5 : 8.5);
  // 🛡️ CORRECTION : Le mur défensif se dresse bien DEVANT l'attaque (b.x - s * avancee)
  return { x: b.x - s * avancee - (p.avant ? 0 : s * 1.5), y: borner(centre + decalage, 3, LARGEUR - 3) };
}

export function placer(pions: Pion[], ctx: Contexte): void {
  const parCote: Record<string, Pion[]> = { A: [], B: [] };
  for (const p of pions) if (p.surLeTerrain) parCote[p.cote].push(p);

  for (const cote of ['A', 'B'] as Cote[]) {
    const liste = parCote[cote]; const attaque = ctx.possession === cote;
    const chasseurs = new Set<Pion>();

    if (!attaque && ctx.porteur) {
      const cible = ctx.porteur;
      const ligneADefendre = ligneDefendue(cote);
      const distAttaquantLigne = Math.abs(ligneADefendre - cible.x);

      [...liste]
          .filter((p) => p.recuperation <= 0 && (p.numero !== 15 || ctx.perceeEnCours))
          .sort((a, b) => {
            // Si le défenseur est plus près de sa propre ligne que l'attaquant, c'est bon.
            // S'il est plus loin (dans le dos), on l'exclut du plaquage direct.
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
        const s = sens(p.cote); cible.x += s * ctx.consigne.profondeur;
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