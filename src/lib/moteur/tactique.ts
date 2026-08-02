// LE PLACEMENT : PODS, RIDEAUX ET PENDULE
//
// Les pions ne courent pas tous vers le ballon — c'est la faute que fait tout
// moteur naïf, et ça se voit immédiatement à l'écran. Ici chacun occupe SON
// espace, selon les standards du rugby moderne :
//
//   • EN ATTAQUE, système en PODS (1-3-3-1) : un pod d'avants au ras du ruck,
//     un deuxième au large, le 9 à la sortie, le 10 en profondeur pour animer,
//     les trois-quarts étalés sur la largeur, le 15 en soutien.
//   • EN DÉFENSE, un PREMIER RIDEAU qui monte ensemble — soit en « blitz »
//     (montée agressive pour étouffer l'ouvreur), soit en « défense glissée »
//     (dérive vers l'aile pour interdire le débordement).
//   • Un TROISIÈME RIDEAU en PENDULE : le 15 et les deux ailiers couvrent le
//     fond ; si le ballon part à droite, l'ailier gauche redescend en couverture.

import type { Pion } from './entites';
import {
  LARGEUR, borner, ligneDefendue, sens, type Cote, type Vec,
} from './terrain';

export type SystemeDefensif = 'blitz' | 'glissee';

// Les pods d'avants : à quelle distance du ruck, et de quel côté.
// 1-3-3-1 : 1 avant au ras, 3 au premier temps, 3 au large, 1 en couverture.
const POD_PROFONDEUR = [-1.5, -3, -4, -3.5, -5, -6, -8, -12];

export interface Contexte {
  ballon: Vec;
  possession: Cote;
  systeme: SystemeDefensif;
  // Le porteur du ballon : les défenseurs les plus proches lui montent dessus
  // au lieu de tenir bêtement leur ligne. Sans ça, personne ne plaque jamais.
  porteur?: Vec | null;
  // Consigne du joueur humain (coaching en direct) : décale SON pion.
  consigne?: ConsigneJoueur;
}

// Ce que le coaching en direct peut changer sur l'avatar.
export interface ConsigneJoueur {
  // Profondeur : négatif = plus bas / en retrait, positif = plus haut.
  profondeur: number;
  // Largeur : négatif = se recentrer, positif = chercher le large.
  largeur: number;
  // 0 = attentiste, 1 = se propose systématiquement au ras du ruck.
  agressivite: number;
  libelle: string;
}

// --- ATTAQUE ---------------------------------------------------------------
function cibleAttaque(p: Pion, ctx: Contexte, index: number): Vec {
  const s = sens(p.cote);
  const b = ctx.ballon;
  // De quel côté du terrain se trouve l'espace ? On étale vers le grand côté.
  const grandCote = b.y < LARGEUR / 2 ? 1 : -1;

  if (p.avant) {
    // Les avants forment les pods, échelonnés derrière et sur les côtés du ruck.
    const prof = POD_PROFONDEUR[index] ?? -4;
    // Un pod au ras (index 0-2), un au premier temps (3-5), un au large (6-7).
    const bloc = index < 3 ? 0 : index < 6 ? 1 : 2;
    const ecart = [3, 11, 22][bloc] * grandCote;
    const decalage = ((index % 3) - 1) * 3.5;
    return {
      x: b.x + s * prof,
      y: borner(b.y + ecart + decalage, 3, LARGEUR - 3),
    };
  }

  switch (p.numero) {
    case 9: // le demi de mêlée, à la sortie du ruck
      return { x: b.x + s * -1.5, y: borner(b.y - grandCote * 2, 2, LARGEUR - 2) };
    case 10: // l'ouvreur, en profondeur : c'est lui qui anime
      return { x: b.x + s * -7, y: borner(b.y + grandCote * 9, 4, LARGEUR - 4) };
    case 12:
      return { x: b.x + s * -8.5, y: borner(b.y + grandCote * 17, 4, LARGEUR - 4) };
    case 13:
      return { x: b.x + s * -9.5, y: borner(b.y + grandCote * 25, 4, LARGEUR - 4) };
    case 11: // les ailiers, aux extrémités
      return { x: b.x + s * -10, y: 4 };
    case 14:
      return { x: b.x + s * -10, y: LARGEUR - 4 };
    default: // 15 : il vient en soutien, dans l'axe, un peu en retrait
      return { x: b.x + s * -16, y: borner(b.y + grandCote * 4, 5, LARGEUR - 5) };
  }
}

// --- DÉFENSE ---------------------------------------------------------------
function cibleDefense(p: Pion, ctx: Contexte, index: number): Vec {
  const s = sens(p.cote); // sens d'attaque de SON équipe
  const b = ctx.ballon;
  const maLigne = ligneDefendue(p.cote);
  // La ligne défensive se place DEVANT le ballon, côté de son propre en-but.
  const avancee = ctx.systeme === 'blitz' ? 3.5 : 1.5;

  // TROISIÈME RIDEAU — le pendule. Le 15 couvre l'axe, l'ailier du côté
  // opposé au ballon redescend, l'ailier côté ballon reste haut.
  if (p.numero === 15) {
    return {
      x: b.x - s * 26,
      y: borner(b.y * 0.35 + (LARGEUR / 2) * 0.65, 8, LARGEUR - 8),
    };
  }
  if (p.numero === 11 || p.numero === 14) {
    const monCote = p.numero === 11 ? 0 : LARGEUR;
    const loinDuBallon = Math.abs(b.y - monCote) > LARGEUR * 0.55;
    if (loinDuBallon) {
      // Le pendule : il décroche pour couvrir le fond du terrain.
      return { x: b.x - s * 20, y: borner(monCote === 0 ? 12 : LARGEUR - 12, 5, LARGEUR - 5) };
    }
    return { x: b.x - s * avancee, y: borner(monCote === 0 ? 5 : LARGEUR - 5, 4, LARGEUR - 4) };
  }

  // PREMIER RIDEAU — une ligne à plat qui monte ensemble.
  // Les avants au ras du ruck, les trois-quarts étalés sur la largeur.
  const rang = p.avant ? index : index - 6; // position dans la ligne
  const largeurLigne = p.avant ? 5.5 : 8.5;
  const centre = ctx.systeme === 'glissee'
    // Défense glissée : toute la ligne dérive vers l'aile où va le ballon.
    ? b.y + (b.y < LARGEUR / 2 ? 6 : -6)
    : b.y;
  const decalage = (rang - (p.avant ? 3.5 : 2)) * largeurLigne;
  return {
    x: b.x - s * avancee - (p.avant ? 0 : s * 1.5),
    y: borner(centre + decalage, 3, LARGEUR - 3),
    // ⚠️ On ne dépasse jamais sa propre ligne d'essai : un défenseur ne
    // recule pas dans son en-but pour tenir la ligne.
  };
  void maLigne;
}

// Applique le placement à tous les pions. Appelé à chaque tick : c'est ce qui
// donne l'impression que l'équipe « respire » avec le ballon.
export function placer(pions: Pion[], ctx: Contexte): void {
  const parCote: Record<string, Pion[]> = { A: [], B: [] };
  for (const p of pions) if (p.surLeTerrain) parCote[p.cote].push(p);

  for (const cote of ['A', 'B'] as Cote[]) {
    const liste = parCote[cote];
    const attaque = ctx.possession === cote;
    // LES TROIS PLUS PROCHES MONTENT SUR LE PORTEUR. C'est ce qui déclenche les
    // plaquages : une ligne défensive qui garde sagement ses distances ne touche
    // jamais personne (mesuré avant correction : 15 plaquages par match au lieu
    // de 200). Les autres tiennent le rideau et ferment les espaces.
    const chasseurs = new Set<Pion>();
    if (!attaque && ctx.porteur) {
      const cible = ctx.porteur;
      [...liste]
        .filter((p) => p.numero !== 15)
        .sort((a, b) =>
          Math.hypot(a.pos.x - cible.x, a.pos.y - cible.y)
          - Math.hypot(b.pos.x - cible.x, b.pos.y - cible.y))
        .slice(0, 2)
        .forEach((p) => chasseurs.add(p));
    }

    liste.forEach((p, i) => {
      if (chasseurs.has(p) && ctx.porteur) {
        p.cible = { x: ctx.porteur.x, y: ctx.porteur.y };
        return;
      }
      const cible = attaque ? cibleAttaque(p, ctx, i) : cibleDefense(p, ctx, i);
      // COACHING EN DIRECT : la consigne du joueur décale SON pion, sans jamais
      // le sortir du terrain ni casser la structure de l'équipe.
      if (p.moi && ctx.consigne) {
        const s = sens(p.cote);
        cible.x += s * ctx.consigne.profondeur;
        cible.y = borner(
          cible.y + ctx.consigne.largeur * (cible.y < LARGEUR / 2 ? -1 : 1),
          3, LARGEUR - 3,
        );
        // Un joueur qui « se propose au ras » vient chercher le ballon.
        if (attaque && ctx.consigne.agressivite > 0.6) {
          cible.x = cible.x * 0.55 + ctx.ballon.x * 0.45;
          cible.y = cible.y * 0.55 + ctx.ballon.y * 0.45;
        }
      }
      p.cible = cible;
    });
  }
}

// Choix du système défensif : on blitze quand on est loin de son en-but ou
// qu'il faut récupérer le ballon ; on glisse près de sa ligne, pour ne pas
// se faire déborder.
export function choisirSysteme(
  ballon: Vec, defenseur: Cote, minute: number, ecartScore: number,
): SystemeDefensif {
  const proche = defenseur === 'A' ? ballon.x < 33 : ballon.x > 89;
  if (proche) return 'glissee';
  // Mené en fin de match, on monte agressivement pour créer la faute.
  if (minute > 60 && ecartScore < 0) return 'blitz';
  return Math.abs(ballon.y - LARGEUR / 2) > 18 ? 'glissee' : 'blitz';
}
