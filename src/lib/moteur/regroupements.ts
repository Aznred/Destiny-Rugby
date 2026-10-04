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
  /** Celui qui sortira le ballon : le demi de mêlée, ou son remplaçant du moment. */
  relayeurId?: string;
  /** Secondes passées, ballon sorti, à attendre un relayeur encore en chemin. */
  attenteSortie?: number;
}

export function organiserRuck(e: EtatMatch): void {
  if (!e.ruck) return;
  const detaille = !!e.cadenceDetaillee;
  // ⚠️ CADENCE DÉTAILLÉE : ON PREND CEUX QUI PEUVENT VRAIMENT ARRIVER. Le plus
  // proche à l'instant du plaquage est souvent le soutien lancé qui a déjà
  // dépassé le ballon : il lui faut freiner, faire demi-tour et rentrer par
  // l'axe. On compte donc là où sa course l'emmène, et chaque mètre au-delà du
  // ballon coûte double. Un joueur au sol ne vient pas se lier.
  const cout = (p: Pion) => {
    if (!detaille) return distance(p.pos, e.ballon);
    const futur = { x: p.pos.x + p.vitesse.x * .45, y: p.pos.y + p.vitesse.y * .45 };
    return distance(futur, e.ballon) + Math.max(0, (futur.x - e.ballon.x) * sens(p.cote)) * 1.2;
  };
  const choisir = (attaque: boolean) => e.pions.filter(p => p.surLeTerrain && p.sanction <= 0 && p.avant
    && (!detaille || !p.corps)
    && (p.cote === e.possession) === attaque && p.id !== e.ruck?.porteurId && p.id !== e.ruck?.plaqueurId)
    .map(p => ({ p, c: cout(p) }))
    .sort((a, b) => a.c - b.c).slice(0, attaque ? 3 : 2).map(x => x.p.id);
  e.ruck.organisation = { debut: e.sim, origine: { ...e.ballon }, attaque: choisir(true), defense: choisir(false), contacts: [], animations: {} };
}

/** Distance au-delà de laquelle le demi de mêlée n'arrivera pas à temps au ruck. */
const PORTEE_DU_NEUF = 20;
const PORTEE_DETAILLEE = 9;

/**
 * QUI SORT LE BALLON DU RUCK.
 *
 * ⚠️ LE NUMÉRO 9 N'EST PAS TOUJOURS LÀ. Plaqué, encore au sol, exclu ou parti
 * trente mètres plus loin, il ne peut pas jouer ce ballon. Le regroupement
 * l'attendait pourtant : sa cible était posée au pied du ruck, il n'y arrivait
 * jamais, et l'équipe finissait par lier une chenille autour d'un demi absent.
 * Sur un terrain, le premier joueur disponible prend le relais — un avant de la
 * cellule proche, l'ouvreur, celui qui est là.
 *
 * Le choix reste STABLE pendant tout le ruck : en changer à chaque image ferait
 * converger deux joueurs vers la même place. Il n'est refait que si le relayeur
 * désigné tombe, sort ou se retrouve lié au regroupement.
 */
export function designerRelayeur(e: EtatMatch): Pion | undefined {
  const ruck = e.ruck;
  if (!ruck) return undefined;
  if (!ruck.organisation) organiserRuck(e);
  const o = ruck.organisation!;
  const lies = new Set([...o.attaque, ...o.defense, ruck.porteurId, ruck.plaqueurId]);
  const disponible = (p: Pion) => p.surLeTerrain && p.sanction <= 0 && !p.corps
    && p.cote === e.possession && !lies.has(p.id);
  const actuel = o.relayeurId ? e.pions.find(p => p.id === o.relayeurId) : undefined;
  const neuf = e.pions.find(p => p.numero === 9 && p.cote === e.possession);
  // En cadence détaillée, le demi n'est le relayeur que s'il peut vraiment y
  // être : au-delà de neuf mètres, quelqu'un d'autre est déjà sur le ballon.
  const neufPret = !!neuf && disponible(neuf)
    && distance(neuf.pos, e.ballon) <= (e.cadenceDetaillee ? PORTEE_DETAILLEE : PORTEE_DU_NEUF);
  // Le demi de mêlée reprend sa place dès qu'il redevient disponible, sauf si
  // son remplaçant est déjà au pied du ruck, prêt à sortir le ballon.
  if (neufPret && !(actuel && actuel !== neuf && disponible(actuel) && distance(actuel.pos, e.ballon) < 2.5)) {
    o.relayeurId = neuf!.id;
    return neuf;
  }
  if (actuel && disponible(actuel)) return actuel;
  const s = sens(e.possession);
  const candidats = e.pions.filter(p => disponible(p) && p.numero !== 9);
  let choisi: Pion | undefined; let meilleur = Infinity;
  for (const p of candidats) {
    // Le plus proche l'emporte ; à distance égale, celui qui passe le mieux et
    // qui arrive par l'arrière du ruck plutôt que par le camp adverse.
    const devant = Math.max(0, (p.pos.x - e.ballon.x) * s);
    const note = distance(p.pos, e.ballon) + devant * 0.8 - p.passe * 0.03;
    if (note < meilleur) { meilleur = note; choisi = p; }
  }
  if (e.cadenceDetaillee && (!choisi || distance(choisi.pos, e.ballon) > 6)) {
    // Personne de libre à portée : le dernier avant lié se détache du
    // regroupement et ramassera lui-même.
    const liesDuCamp = (e.possession === ruck.attaque ? o.attaque : o.defense)
      .map(id => e.pions.find(p => p.id === id))
      .filter((p): p is Pion => !!p && p.surLeTerrain && p.sanction <= 0 && !p.corps);
    const dernier = liesDuCamp[liesDuCamp.length - 1];
    if (dernier) choisi = dernier;
  }
  o.relayeurId = choisi?.id;
  return choisi;
}

/**
 * Le joueur debout, du camp qui a le ballon, le plus proche du ballon au sol.
 * C'est lui qui joue quand le relayeur attendu n'est pas au pied du ruck.
 */
export function ramasseurAuRuck(e: EtatMatch, rayon = 3.2): Pion | undefined {
  const ruck = e.ruck;
  let choisi: Pion | undefined; let meilleure = rayon;
  for (const p of e.pions) {
    if (!p.surLeTerrain || p.sanction > 0 || p.corps || p.cote !== e.possession || p.id === ruck?.porteurId) continue;
    const d = distance(p.pos, e.ballon);
    if (d < meilleure) { meilleure = d; choisi = p; }
  }
  if (choisi && ruck?.organisation) ruck.organisation.relayeurId = choisi.id;
  return choisi;
}

export function preparerChenille(e: EtatMatch, neuf: Pion): boolean {
  if (e.phase !== 'ruck' || !e.ruck || neuf.numero !== 9 || neuf.cote !== e.possession) return false;
  if (!e.ruck.organisation) organiserRuck(e);
  // La chenille protège la boîte au pied du demi de mêlée : sans lui au pied
  // du ruck, on ne la forme pas, le relayeur du moment sort le ballon.
  if (designerRelayeur(e) !== neuf) return false;
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
  const ancien = o.relayeurId;
  const relayeur = designerRelayeur(e);
  // Celui qui cède le relais retourne dans la ligne au lieu de rester planté
  // derrière le ruck avec un rôle de regroupement.
  if (ancien && ancien !== relayeur?.id) {
    delete e.placement[ancien];
    const p = e.pions.find(q => q.id === ancien);
    if (p && p.role === 'ruck') p.role = 'ligne';
  }
  if (relayeur) {
    // En cadence détaillée, il se tient derrière le dernier avant lié, là où
    // le ballon est présenté — sans se superposer à lui.
    placer(relayeur.id, e.cadenceDetaillee && !o.chenille
      ? { x: lieu.x - s * 2.05, y: lieu.y - .25 }
      : { x: lieu.x - s * (o.chenille ? 3.45 : 1.65), y: lieu.y - .35 });
    relayeur.effort = Math.max(relayeur.effort, .95);
  }
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
    const b = o.defense.map(actif).find(q => q && !q.corps && distance(a.pos, q.pos) < 0.95);
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
    // Le demi tombé ou sorti ne commande plus de chenille : sortie normale.
    if (!neuf || neuf.corps) { delete o.chenille; return; }
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
