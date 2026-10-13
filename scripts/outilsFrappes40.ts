// OUTILS DE LA SONDE DU JEU AU PIED — Correctif 40 (partagés par `sonderFrappes40.ts` et `verifierFrappes40.ts`). Ce que le moteur fait VRAIMENT entre la demande d'un coup de pied et le départ du
// ballon : combien de pas, combien d'armés (un geste de frappe relancé = une animation rejouée), et de combien le botteur
// s'est déplacé. À lancer avant et après une retouche du jeu au pied.
//
//   npx vite-node scripts/sonderFrappes40.ts            (niveau des matchs de carrière)
//   IA_EMPREINTE=7 npx vite-node scripts/sonderFrappes40.ts
import { avancer, DT } from '../src/lib/moteur/moteur';
import type { EtatMatch } from '../src/lib/moteur/etat';
import type { Pion } from '../src/lib/moteur/entites';
import { activerDirect, commanderDirect, demanderDirect, type DemandeDirecte } from '../src/lib/moteur/direct';
import { AXE, sens } from '../src/lib/moteur/terrain';
import { creerMatchDEmpreinte } from './outilsEmpreinte';

const GESTES_DE_FRAPPE = new Set(['grubber', 'chip', 'punt', 'box_kick', 'drop', 'restart']);

function poser(p: Pion, x: number, y: number, vx = 0, vy = 0): void {
  p.pos = { x, y }; p.cible = { x, y }; p.vitesse = { x: vx, y: vy };
  p.corps = undefined; p.battu = 0; p.sanction = 0; p.surLeTerrain = true; p.role = 'ligne';
}

export function situationDeFrappe(k: number): { e: EtatMatch; h: Pion } {
  const e = creerMatchDEmpreinte(k, { responsabilites: { avatar: ['droppeur'] } });
  activerDirect(e, true);
  let garde = 0;
  while (e.phase !== 'jeuCourant' && garde++ < 4000) avancer(e, DT);
  const h = e.pions.find((p) => p.moi)!;
  const amis = e.pions.filter((p) => p.cote === h.cote && p !== h && p.surLeTerrain);
  const adv = e.pions.filter((p) => p.cote !== h.cote && p.surLeTerrain);
  const s = sens(h.cote);
  amis.forEach((p, i) => poser(p, 61 - s * (22 + (i % 7) * 3), 6 + i * 4));
  adv.forEach((p, i) => poser(p, 61 + s * (34 + (i % 5) * 2.5), 5 + i * 4));
  e.phase = 'jeuCourant'; e.vol = null; e.ruck = null; e.ballonLibre = null; delete e.piedPrepare;
  e.lancement = null; e.cellule = null; e.duel = null; e.conquete = null; e.placement = null; e.blocPrepare = null;
  e.minuteur = 99; e.gardeRuck = 0; e.combinaisonEnCours = undefined; e.combinaisonPreparee = undefined;
  return { e, h };
}

export interface ReleveFrappe {
  /** Secondes simulées entre la demande et le premier geste de frappe. */
  demandeArme: number | null;
  /** Secondes simulées entre la demande et le départ du ballon. */
  demandeContact: number | null;
  /** Nombre de gestes de frappe lancés pour ce coup de pied (1 attendu). */
  armes: number;
  /** Nombre de fois où l'armé a été remis à zéro. */
  remises: number;
  /** Le botteur, entre la demande et la frappe (m). */
  deplacement: number;
  /** Écart entre le point de départ du vol et le botteur au départ (m). */
  ecartDepart: number;
  /** Ce qu'il a parcouru À REBOURS de sa course entre la demande et la frappe (m) : zéro quand il ne revient pas sur ses pas. */
  recul: number;
}

export function sonderUneFrappe(k: number, vitesse: number, demande: DemandeDirecte, tenirLeStick = true): ReleveFrappe {
  const { e, h } = situationDeFrappe(k);
  const s = sens(h.cote);
  // Un drop se tente à portée des poteaux ; le reste se tape du milieu du terrain.
  poser(h, demande.action === 'drop' ? 61 + s * 22 : 61 - s * 12, AXE, s * vitesse, 0);
  e.porteur = h; e.possession = h.cote; e.ballon = { ...h.pos };
  e.origine = { x: h.pos.x - s * 3, y: h.pos.y }; e.ligneAvantage = h.pos.x;
  // Il court déjà : quelques pas le stick en avant, pour que l'allure soit celle du moteur.
  // (À l'arrêt, un pas suffit : c'est lui qui écrit ce que le joueur peut jouer.)
  for (let i = 0; i < (vitesse > 0 ? 6 : 1); i++) { commanderDirect(e, vitesse > 0 ? s : 0, 0, vitesse > 6); avancer(e, DT); if (e.porteur !== h) break; }
  if (e.porteur !== h) return { demandeArme: null, demandeContact: null, armes: 0, remises: 0, deplacement: 0, ecartDepart: 0, recul: 0 };
  const t0 = e.sim, depart = { ...h.pos };
  const gestesAvant = new Set((e.gestes ?? []).map((g) => g.id));
  demanderDirect(e, demande);
  let arme: number | null = null, contact: number | null = null, remises = 0, avaitPret = false, ecartDepart = 0, recul = 0, avantX = h.pos.x;
  for (let i = 0; i < 40; i++) {
    if (tenirLeStick) commanderDirect(e, s, 0, vitesse > 6);
    avancer(e, DT);
    recul += Math.max(0, -(h.pos.x - avantX) * s); avantX = h.pos.x;
    const pret = e.piedPrepare?.auteurId === h.id && e.piedPrepare.pretDepuis !== undefined;
    if (avaitPret && e.piedPrepare?.auteurId === h.id && !pret) remises++;
    avaitPret = pret;
    if (arme === null && (e.gestes ?? []).some((g) => !gestesAvant.has(g.id) && g.joueurId === h.id && GESTES_DE_FRAPPE.has(g.clip))) arme = e.sim - t0;
    if (e.vol && e.vol.type === 'pied' && e.vol.auteur === h) {
      contact = e.sim - t0;
      ecartDepart = Math.hypot(e.vol.de.x - h.pos.x, e.vol.de.y - h.pos.y);
      break;
    }
    if (!e.piedPrepare && e.porteur !== h) break;
  }
  const armes = (e.gestes ?? []).filter((g) => !gestesAvant.has(g.id) && g.joueurId === h.id && GESTES_DE_FRAPPE.has(g.clip)).length;
  return { demandeArme: arme, demandeContact: contact, armes, remises, deplacement: Math.hypot(h.pos.x - depart.x, h.pos.y - depart.y), ecartDepart, recul };
}
