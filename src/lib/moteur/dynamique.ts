import type { EtatMatch } from './etat.js';
import type { Pion } from './entites.js';
import { AXE, MILIEU, LONGUEUR, LARGEUR, LIGNE_A, LIGNE_B, borner, sens, type Vec } from './terrain.js';

export interface GesteMatch {
  id: string; joueurId: string; clip: string; debut: number; duree: number;
  /** Nuance du geste pour l'affichage (« bousculade » plutôt que coup porté). */
  variante?: string;
}
export interface ArbitreMatch { pos: Vec; vitesse: Vec; regard: number }
export interface CorpsMatch {
  age: number; duree: number; direction: number; intensite: number;
  /** Bassin, épaules, deux appuis et deux mains, contraints dans le plan. */
  points: Array<{ x: number; y: number; vx: number; vy: number }>;
}

export function corpsPourAffichage(p: Pion, avance = 0) {
  const c = p.corps;
  if (!c) return undefined;
  const bassin = c.points[0]!;
  const appuis = [2, 3].map((i) => {
    const pied = c.points[i]!;
    const angle = Math.atan2(pied.y - bassin.y, pied.x - bassin.x) - c.direction - Math.atan2(i === 2 ? .22 : -.22, -.35);
    return Math.round(borner(Math.atan2(Math.sin(angle), Math.cos(angle)) * 180 / Math.PI, -40, 40));
  });
  const bras = c.points.slice(4, 6).map((main, i) => {
    const epaule = c.points[1]!;
    const angle = Math.atan2(main.y - epaule.y, main.x - epaule.x) - c.direction - (i === 0 ? Math.PI / 2 : -Math.PI / 2);
    return Math.round(borner(Math.atan2(Math.sin(angle), Math.cos(angle)) * 180 / Math.PI, -50, 50));
  });
  return { age: c.age + avance, duree: c.duree, direction: c.direction, intensite: c.intensite, appuis, bras };
}

export function jouerGeste(e: EtatMatch, p: Pion, clip: string, duree = 1.2, variante?: string): void {
  const debut = e.sim;
  e.gestes = (e.gestes ?? []).filter((g) => debut - g.debut < 8).slice(-63);
  e.gestes.push({ id: `${p.id}:${debut.toFixed(3)}:${clip}`, joueurId: p.id, clip, debut, duree, ...(variante ? { variante } : {}) });
}

export function creerArbitre(): ArbitreMatch {
  return { pos: { x: MILIEU - 7, y: AXE - 9 }, vitesse: { x: 0, y: 0 }, regard: 0 };
}

/** Le botteur porte visuellement le ballon durant l'armé, même sur un renvoi. */
export function porteurPourAffichage(e: EtatMatch): string | undefined {
  if (e.porteur) return e.porteur.id;
  // Un grattage réussi : le défenseur s'est relevé ballon en main, avant que le jeu ne reprenne (Correctif 23).
  if (e.phase === 'ruck' && e.ruck?.duel?.balle) return e.ruck.duel.balle;
  if (!e.piedPrepare || e.vol) return undefined;
  const p = e.pions.find(q => q.id === e.piedPrepare!.auteurId && q.surLeTerrain && q.sanction <= 0);
  return p && !p.corps && Math.hypot(p.pos.x - e.piedPrepare.depuis.x, p.pos.y - e.piedPrepare.depuis.y) < 1
    ? p.id : undefined;
}

export function avancerArbitre(e: EtatMatch, dt: number): void {
  const a = e.arbitre ??= creerArbitre();
  const v = e.porteur?.vitesse ?? { x: 0, y: 0 };
  const cible = {
    x: borner(e.ballon.x + v.x * .6 - sens(e.possession) * 7, 2, LONGUEUR - 2),
    y: borner(e.ballon.y + v.y * .5 + (e.ballon.y > AXE ? -8 : 8), 3, LARGEUR - 3),
  };
  // Répulsion des regroupements : le referee contourne les joueurs.
  for (const p of e.pions) {
    if (!p.surLeTerrain) continue;
    const dx = a.pos.x - p.pos.x, dy = a.pos.y - p.pos.y;
    const d = Math.hypot(dx, dy);
    if (d < 3 && d > .001) {
      cible.x += dx / d * (3 - d) * 2;
      cible.y += dy / d * (3 - d) * 2;
    }
  }
  const dx = cible.x - a.pos.x, dy = cible.y - a.pos.y;
  const d = Math.max(.001, Math.hypot(dx, dy));
  const vitesse = Math.min(7.6, d * 1.4);
  const ax = dx / d * vitesse - a.vitesse.x, ay = dy / d * vitesse - a.vitesse.y;
  const facteur = Math.min(1, 4.8 * dt / Math.max(.001, Math.hypot(ax, ay)));
  a.vitesse.x += ax * facteur; a.vitesse.y += ay * facteur;
  a.pos.x = borner(a.pos.x + a.vitesse.x * dt, 1, LONGUEUR - 1);
  a.pos.y = borner(a.pos.y + a.vitesse.y * dt, 1, LARGEUR - 1);
  const angle = Math.atan2(e.ballon.y - a.pos.y, e.ballon.x - a.pos.x);
  const delta = Math.atan2(Math.sin(angle - a.regard), Math.cos(angle - a.regard));
  a.regard += borner(delta, -2.8 * dt, 2.8 * dt);
}

/** Visibilité géométrique : distance, champ de vision et corps interposés. */
export function visibiliteFaute(e: EtatMatch, lieu: Vec, auteurId?: string): number {
  const a = e.arbitre ??= creerArbitre();
  const dx = lieu.x - a.pos.x, dy = lieu.y - a.pos.y;
  const d = Math.hypot(dx, dy);
  if (d > 42) return 0;
  const cos = (dx * Math.cos(a.regard) + dy * Math.sin(a.regard)) / Math.max(.01, d);
  if (cos < -.15 && d > 3) return 0;
  let masques = 0;
  for (const p of e.pions) {
    if (!p.surLeTerrain || p.id === auteurId) continue;
    const t = ((p.pos.x - a.pos.x) * dx + (p.pos.y - a.pos.y) * dy) / Math.max(.01, d * d);
    if (t > .08 && t < .87 && Math.hypot(p.pos.x - a.pos.x - t * dx, p.pos.y - a.pos.y - t * dy) < .65) masques++;
  }
  return borner((1 - d / 55) * (.35 + .65 * Math.max(0, cos)) * .64 ** masques, 0, .98);
}

export function declencherChute(p: Pion, impulsion: Vec, duree = 1.5): void {
  const brut = Math.hypot(impulsion.x, impulsion.y);
  impulsion = brut < .01 ? { x: sens(p.cote) * .01, y: 0 }
    : { x: impulsion.x * Math.min(1, 6 / brut), y: impulsion.y * Math.min(1, 6 / brut) };
  const n = Math.max(.01, Math.hypot(impulsion.x, impulsion.y));
  const nx = impulsion.x / n, ny = impulsion.y / n;
  p.corps = {
    age: 0, duree, direction: Math.atan2(ny, nx), intensite: Math.min(1, n / 5),
    points: [0, .48, -.35, -.35, .48, .48].map((long, i) => ({
      x: p.pos.x + nx * long - ny * (i === 2 ? .22 : i === 3 ? -.22 : i === 4 ? .42 : i === 5 ? -.42 : 0),
      y: p.pos.y + ny * long + nx * (i === 2 ? .22 : i === 3 ? -.22 : i === 4 ? .42 : i === 5 ? -.42 : 0),
      vx: impulsion.x * (i === 1 ? 1 : .7), vy: impulsion.y * (i === 1 ? 1 : .7),
    })),
  };
  p.battu = Math.max(p.battu, duree);
}

/** Solveur à sous-pas bornés, contraintes de longueur et friction au sol. */
export function avancerCorps(e: EtatMatch, dt: number): void {
  for (const p of e.pions) {
    const c = p.corps;
    if (!c || !p.surLeTerrain) continue;
    c.age += dt;
    if (c.age >= c.duree) { delete p.corps; continue; }
    const avant = { ...p.pos };
    const voisins = e.pions.filter(q => q !== p && q.surLeTerrain && q.sanction <= 0
      && Math.abs(q.pos.x - p.pos.x) < 4 && Math.abs(q.pos.y - p.pos.y) < 4);
    const pas = dt / 5;
    for (let k = 0; k < 5; k++) {
      for (const q of c.points) {
        q.vx *= Math.exp(-2.8 * pas); q.vy *= Math.exp(-2.8 * pas);
        q.x = borner(q.x + q.vx * pas, .2, LONGUEUR - .2);
        q.y = borner(q.y + q.vy * pas, .2, LARGEUR - .2);
        for (const voisin of voisins) {
          if (voisin === p || !voisin.surLeTerrain || voisin.sanction > 0) continue;
          const dx = q.x - voisin.pos.x, dy = q.y - voisin.pos.y;
          const d = Math.hypot(dx, dy);
          if (d > .01 && d < .43) {
            const pousse = (.43 - d) * .35;
            q.x += dx / d * pousse; q.y += dy / d * pousse;
            voisin.vitesse.x -= dx / d * pousse * 2;
            voisin.vitesse.y -= dy / d * pousse * 2;
          }
        }
      }
      for (let it = 0; it < 3; it++) {
        for (const [i, j, longueur] of [[0, 1, .48], [0, 2, .414], [0, 3, .414], [2, 3, .44], [1, 4, .42], [1, 5, .42]]) {
          if (!c.points[i] || !c.points[j]) continue; // anciennes sauvegardes à quatre masses
          const a = c.points[i]!, b = c.points[j]!;
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.max(.001, Math.hypot(dx, dy));
          const correction = (d - longueur) / d * .5;
          a.x += dx * correction; a.y += dy * correction;
          b.x -= dx * correction; b.y -= dy * correction;
        }
      }
    }
    p.pos = { x: c.points[0]!.x, y: c.points[0]!.y };
    p.vitesse = { x: (p.pos.x - avant.x) / dt, y: (p.pos.y - avant.y) / dt };
    c.direction = Math.atan2(c.points[1]!.y - p.pos.y, c.points[1]!.x - p.pos.x);
  }
  const plaque = e.phase === 'ruck' ? e.pions.find((p) => p.id === e.ruck?.porteurId) : undefined;
  if (plaque?.corps && plaque.corps.age < 1.35) {
    if ((e.ia ?? 1) >= 5) ancrerLeRuck(e, plaque);
    else e.ballon = { ...plaque.pos };
  }
}

/**
 * LE REGROUPEMENT SE CONSTRUIT AUTOUR DU PLAQUÉ, PAS L'INVERSE (niveau 5).
 *
 * Les places du ruck étaient calculées à l'instant du plaquage, autour du point où le moteur PRÉVOYAIT la chute. Le corps,
 * lui, glisse où le choc l'emmène — un mètre, parfois trois sur un gros tampon. Le ballon le suivait, pas les places : une
 * fois relevé de sa chute, le plaqué était ramené à pied vers un regroupement formé ailleurs, ou restait couché à côté du
 * demi de mêlée. Tant qu'il tombe, tout le regroupement se décale donc avec lui, et sa propre place est là où il est.
 */
function ancrerLeRuck(e: EtatMatch, plaque: Pion): void {
  const lieu = { x: borner(plaque.pos.x, LIGNE_A + 0.5, LIGNE_B - 0.5), y: borner(plaque.pos.y, 1.2, LARGEUR - 1.2) };
  const dx = lieu.x - e.ballon.x, dy = lieu.y - e.ballon.y;
  e.ballon = lieu;
  const ruck = e.ruck!;
  if (e.placement) {
    if (dx || dy) for (const id in e.placement) {
      const c = e.placement[id];
      e.placement[id] = { x: c.x + dx, y: borner(c.y + dy, 1.2, LARGEUR - 1.2) };
    }
    // Les deux hommes au sol ne sont rappelés nulle part : ils restent où le contact les a laissés.
    e.placement[plaque.id] = { x: plaque.pos.x, y: plaque.pos.y };
    const plaqueur = ruck.plaqueurId ? e.pions.find((p) => p.id === ruck.plaqueurId) : undefined;
    if (plaqueur?.corps) e.placement[plaqueur.id] = { x: plaqueur.pos.x, y: plaqueur.pos.y };
  }
  if (!dx && !dy) return;
  if (ruck.organisation) { ruck.organisation.origine.x += dx; ruck.organisation.origine.y += dy; }
  e.horsJeu += dx;
  e.ligneDef += dx;
}

/** Les mauvais gestes naissent d'un duel proche, tendu et indiscipliné. */
export function incidentDeContact(e: EtatMatch): { fautif: Pion; victime: Pion; motif: string; rouge: boolean; vu: boolean } | null {
  if (e.phase !== 'jeuCourant' || e.tension < 40 || e.sim < (e.incidentApres ?? 0)) return null;
  e.incidentApres = e.sim + 2;
  const actifs = e.pions.filter((p) => p.surLeTerrain && p.sanction <= 0);
  for (const fautif of actifs) {
    if (fautif.corps || fautif.discipline > 78 || fautif === e.porteur) continue;
    const victime = actifs.find((q) => q.cote !== fautif.cote && Math.hypot(q.pos.x - fautif.pos.x, q.pos.y - fautif.pos.y) < 1.35);
    if (!victime || e.rng() > .009 * (e.tension / 80) * (1.35 - fautif.discipline / 100)) continue;
    const poursuite = Math.hypot(victime.vitesse.x, victime.vitesse.y) > 2.8;
    const auSol = !!victime.corps;

    // Seuls les gestes d'une extrême gravité sous forte tension valent un carton rouge direct.
    // L'immense majorité des frictions au rugby sont des bousculades, accrochages ou croche-pieds (jaune ou pénalité).
    const coupDePiedGrave = auSol && e.rng() < 0.06 && e.tension > 65 && fautif.discipline < 40;
    const coupDePoingGrave = !auSol && !poursuite && e.rng() < 0.05 && e.tension > 65 && fautif.discipline < 40;

    const motif = coupDePiedGrave
      ? 'coup de pied au sol'
      : auSol
        ? 'geste dangereux au sol'
        : coupDePoingGrave
          ? 'coup de poing'
          : poursuite
            ? 'croche-pied'
            : 'bousculade sans ballon';

    const rouge = (coupDePiedGrave && e.rng() < 0.40) || (coupDePoingGrave && e.rng() < 0.35);

    const clip = auSol ? 'foul_kick' : poursuite ? 'foul_trip' : 'foul_punch';
    // Une bousculade n'est pas un coup de poing : même geste pour le terrain
    // vu de haut, mais la scène 3D sait faire la différence.
    jouerGeste(e, fautif, clip, 1.2, motif === 'bousculade sans ballon' ? 'bousculade' : undefined);
    jouerGeste(e, victime, !auSol && poursuite ? 'reaction_trip' : 'reaction_hit', 1.4);
    declencherChute(victime, { x: (victime.pos.x - fautif.pos.x) * 2, y: (victime.pos.y - fautif.pos.y) * 2 }, 1.7);
    e.incidentApres = e.sim + 90;
    const vu = e.rng() < visibiliteFaute(e, victime.pos);
    (e.fautesVues ??= {})[fautif.id] = vu;
    return { fautif, victime, motif, rouge, vu };
  }
  return null;
}
