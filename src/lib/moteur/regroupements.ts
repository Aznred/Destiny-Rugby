import type { EtatMatch } from './etat.js';
import type { Pion } from './entites.js';
import { declencherChute, jouerGeste } from './dynamique.js';
import { borner, distance, sens, LARGEUR, LIGNE_A, LIGNE_B, type Vec } from './terrain.js';

export interface OrganisationRuck {
  debut: number;
  origine: Vec;
  attaque: string[];
  defense: string[];
  contacts: string[];
  animations: Record<string, number>;
  chenilleEssayee?: boolean;
  chenille?: { neufId: string; debut: number; pretDepuis?: number };
}

export function organiserRuck(e: EtatMatch): void {
  if (!e.ruck) return;
  const choisir = (attaque: boolean) => e.pions.filter(p => p.surLeTerrain && p.sanction <= 0 && p.avant
    && (p.cote === e.possession) === attaque && p.id !== e.ruck?.porteurId && p.id !== e.ruck?.plaqueurId)
    .sort((a, b) => distance(a.pos, e.ballon) - distance(b.pos, e.ballon)).slice(0, attaque ? 3 : 2).map(p => p.id);
  e.ruck.organisation = { debut: e.sim, origine: { ...e.ballon }, attaque: choisir(true), defense: choisir(false), contacts: [], animations: {} };
}

export function preparerChenille(e: EtatMatch, neuf: Pion): boolean {
  if (e.phase !== 'ruck' || !e.ruck || neuf.numero !== 9 || neuf.cote !== e.possession) return false;
  if (!e.ruck.organisation) organiserRuck(e);
  const o = e.ruck.organisation!;
  if (o.attaque.length < 2) return false;
  o.chenille ??= { neufId: neuf.id, debut: e.sim };
  o.chenilleEssayee = true;
  e.minuteur = Math.max(e.minuteur, 4.5);
  e.ballonLent = true;
  return true;
}

/** Les appuis convergent vers le ruck, les animations attendent l'arrivée. */
export function placerRegroupement(e: EtatMatch): void {
  if (e.phase !== 'ruck' || !e.ruck) return;
  if (!e.ruck.organisation) organiserRuck(e);
  const o = e.ruck.organisation!;
  const s = sens(e.possession);
  const lieu = o.chenille ? o.origine : e.ballon;
  e.placement ??= {};
  const placer = (id: string, cible: Vec) => {
    const p = e.pions.find(q => q.id === id && q.surLeTerrain && q.sanction <= 0);
    if (!p) return;
    p.role = 'ruck';
    p.cible = { x: borner(cible.x, LIGNE_A + .5, LIGNE_B - .5), y: borner(cible.y, 1.2, LARGEUR - 1.2) };
    e.placement![id] = { ...p.cible };
  };
  o.attaque.forEach((id, i) => placer(id, o.chenille
    ? { x: lieu.x - s * (.7 + i * .85), y: lieu.y + (i % 2 ? .12 : -.12) }
    : { x: lieu.x - s * (i < 2 ? .5 : 1.25), y: lieu.y + (i === 0 ? -.42 : i === 1 ? .42 : 0) }));
  o.defense.forEach((id, i) => placer(id, { x: lieu.x + s * .5, y: lieu.y + (i === 0 ? -.42 : .42) }));
  const neuf = e.pions.find(p => p.surLeTerrain && p.cote === e.possession && p.numero === 9);
  if (neuf) placer(neuf.id, { x: lieu.x - s * (o.chenille ? 3.45 : 1.65), y: lieu.y - .35 });
}

export function animerRegroupement(e: EtatMatch, dt: number): void {
  const o = e.phase === 'ruck' ? e.ruck?.organisation : undefined;
  if (!o) return;
  const actif = (id: string) => e.pions.find(p => p.id === id && p.surLeTerrain && p.sanction <= 0);
  const geste = (p: Pion, clip: string, duree = 1.1) => {
    if (e.sim < (o.animations[p.id] ?? 0)) return;
    jouerGeste(e, p, clip, duree); o.animations[p.id] = e.sim + duree;
  };
  const plaque = actif(e.ruck!.porteurId ?? '');
  const plaqueur = actif(e.ruck!.plaqueurId ?? '');
  if (plaque && e.sim - o.debut > 1.2 && e.sim - o.debut < 2.5) geste(plaque, 'present', 1.3);
  if (plaqueur && e.sim - o.debut > 1.45 && e.sim - o.debut < 2.6) geste(plaqueur, 'roll_away', 1.1);
  for (const id of [...o.attaque, ...o.defense]) {
    const p = actif(id);
    if (!p || p.corps) continue;
    if (distance(p.pos, p.cible) > 1) { geste(p, 'support_arrive', .75); continue; }
    const attaque = o.attaque.includes(id);
    geste(p, o.chenille && attaque ? 'caterpillar_bind' : attaque ? 'ruck_bind' : 'counter_ruck');
  }
  if (!o.chenille) for (const id of o.attaque) {
    const a = actif(id);
    if (!a || a.corps) continue;
    const b = o.defense.map(actif).find(q => q && !q.corps && distance(a.pos, q.pos) < 1.2);
    if (!b) continue;
    const cle = `${a.id}:${b.id}`;
    if (o.contacts.includes(cle)) continue;
    o.contacts.push(cle);
    const relative = Math.hypot(a.vitesse.x - b.vitesse.x, a.vitesse.y - b.vitesse.y);
    const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, d = Math.max(.1, Math.hypot(dx, dy));
    const force = borner(1.5 + relative * .35 + (a.puissance - b.puissance) / 60, 1, 3.8);
    jouerGeste(e, a, 'clearout_drive', 1.25); o.animations[a.id] = e.sim + 1.25;
    jouerGeste(e, b, 'contact_brace', 1.25); o.animations[b.id] = e.sim + 1.25;
    b.vitesse.x += dx / d * force; b.vitesse.y += dy / d * force;
    a.vitesse.x -= dx / d * force * .25; a.vitesse.y -= dy / d * force * .25;
    // Un adversaire déséquilibré tombe ; sinon ses appuis absorbent le choc.
    if (relative > 1.8 && a.puissance > b.puissance + 8) declencherChute(b, { x: dx / d * force, y: dy / d * force }, 1.65);
  }
  if (o.chenille) {
    const neuf = actif(o.chenille.neufId);
    if (!neuf) { delete o.chenille; return; }
    const lies = o.attaque.map(actif).filter((p): p is Pion => !!p);
    const prets = lies.length >= 2 && lies.every(p => !p.corps && distance(p.pos, p.cible) < .95)
      && distance(neuf.pos, neuf.cible) < .8;
    if (!prets) delete o.chenille.pretDepuis;
    else if (o.chenille.pretDepuis === undefined) o.chenille.pretDepuis = e.sim;
    const progression = o.chenille.pretDepuis === undefined ? 0 : borner((e.sim - o.chenille.pretDepuis) / 1.2, 0, 1);
    e.ballon = { x: o.origine.x + (neuf.pos.x - o.origine.x) * progression, y: o.origine.y + (neuf.pos.y - o.origine.y) * progression };
    if (prets) geste(neuf, 'box_setup', 1.2);
  }
  // dt est celui du moteur fixe, jamais celui du rafraîchissement de l'écran.
  void dt;
}
