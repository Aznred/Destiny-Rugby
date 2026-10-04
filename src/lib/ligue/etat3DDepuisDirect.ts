// LE MATCH EN LIGNE VU EN TROIS DIMENSIONS — sans rien demander de plus au serveur.
//
// ⚠️ CHEMIN D'ORIGINE, GARDÉ POUR L'ATELIER ET LE LABORATOIRE. Un direct reçoit
// maintenant le FILM du match (`filmDirect.ts`) : les pas du moteur eux-mêmes,
// que la scène lit comme un match de carrière. Ce module ne sert plus qu'à
// montrer un relevé isolé du terrain, ou à un serveur qui n'enverrait pas de film.
//
// ⚠️ LE SERVEUR NE CHANGE PAS, LA BASE NON PLUS. Le direct d'une ligue reçoit
// déjà, toutes les deux secondes, un relevé du terrain (`TerrainDirect`) :
// positions, vols, gestes datés, conquête, contact, tir en préparation. L'écran
// en deux dimensions l'interpole à soixante images par seconde ; la scène 3D
// lit exactement la même interpolation.
//
// Ce module traduit donc, à chaque image, le relevé interpolé en un état « à la
// manière du moteur » : les champs que la scène sait lire (pions, ballon, vol,
// ruck, conquête, tir), reconstitués ou DÉDUITS quand le relevé ne les porte
// pas — qui est lié dans un regroupement, qui est dans l'alignement, où en est
// le rituel du buteur. Aucune position n'est envoyée ni stockée pour cela :
// tout ce qui est purement visuel se reconstruit ici, côté client.
//
// Il ne décide de rien et ne connaît ni la graine ni la feuille de match.

import type { CoteEnLigne, PionDirect, TerrainDirect, VolDirect } from './matchCarriere.js';
import type { BallonAfficheDirect } from './interpolationDirect.js';
import type { PosteId } from '../../types.js';
import type { Phase } from '../moteur/etat.js';
import { apparenceJoueurMatch, type ApparenceMatch } from '../moteur/apparenceMatch.js';
import { tirPasseEntreLesPoteaux } from '../moteur/trajectoire.js';
import { LARGEUR, type Vec } from '../moteur/terrain.js';

type Cote = 'A' | 'B';
const COTE: Record<CoteEnLigne, Cote> = { domicile: 'A', exterieur: 'B' };

/** Un pion tel que la scène le lit. L'objet vit tout le match : les autres champs y renvoient. */
export interface Pion3D {
  id: string; cote: Cote; numero: number; numeroMaillot: number; nom: string; poste: PosteId;
  pos: Vec; vitesse: Vec; surLeTerrain: boolean; sanction: number; role: string;
  corps?: PionDirect['corps']; vitesseMax: number; apparence: Pick<ApparenceMatch, 'peau' | 'cheveux' | 'coiffure' | 'barbe'>;
  stats: Record<string, number>;
}

interface Vol3D {
  de: Vec; vers: Vec; duree: number; ecoule: number; hauteur: number;
  type: 'passe' | 'pied'; intention?: VolDirect['intention']; auteur: Pion3D | null; receveur: Pion3D | null;
}
interface Ruck3D {
  porteurId?: string; plaqueurId?: string;
  organisation: { attaque: string[]; defense: string[]; relayeurId?: string; origine: Vec };
}
interface Tir3D {
  buteur: Pion3D; valeur: number; lieu: Vec; volLance: boolean; retombe?: boolean; reussi?: boolean;
}

/** L'état lu par la scène. Un seul objet par match, mis à jour en place à chaque image. */
export interface Etat3D {
  sim: number; t: number; reliquat: number; fini: boolean;
  phase: Phase; possession: Cote;
  pions: Pion3D[]; ballon: Vec; ballonLibre: { hauteur: number; orientation: number } | null;
  porteur: Pion3D | null; porteurAffiche: string | null;
  vol: Vol3D | null; ruck: Ruck3D | null;
  conquete: { type: 'melee' | 'touche'; progression: number; cibleId?: string; pousseVers?: Cote; horsAlignement?: boolean; reception?: Vec } | null;
  tir: Tir3D | null;
  aplatissage: { marqueur: Pion3D } | null;
  /** Avancement de la phase arrêtée en cours (conquête ou tir), de 0 à 1. */
  progression?: number; minuteur: number; dureeArret: number;
  gestes: NonNullable<TerrainDirect['gestes']>;
  arbitre: { pos: Vec; vitesse: Vec } | null;
  sifflet: { cle: string } | null;
  scoreA: number; scoreB: number;
}

export interface MemoireEtat3D {
  etat: Etat3D;
  pions: Map<string, Pion3D>;
  cleVol: string;
  cleSifflet: string;
  /** Repère pour estimer la durée d'une phase arrêtée à partir de sa progression. */
  suivi: { cle: string; sim0: number; p0: number; duree: number } | null;
}

export function creerMemoireEtat3D(): MemoireEtat3D {
  return {
    pions: new Map(), cleVol: '', cleSifflet: '', suivi: null,
    etat: {
      sim: 0, t: 0, reliquat: 0, fini: false, phase: 'coupEnvoi', possession: 'A',
      pions: [], ballon: { x: 61, y: 35 }, ballonLibre: null, porteur: null, porteurAffiche: null,
      vol: null, ruck: null, conquete: null, tir: null, aplatissage: null,
      minuteur: 0, dureeArret: 7, gestes: [], arbitre: null, sifflet: null, scoreA: 0, scoreB: 0,
    },
  };
}

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

/** Le rôle d'un joueur dans une phase arrêtée, lu sur sa place : le relevé ne le porte pas. */
function role(p: PionDirect, pos: Vec, phase: Phase, ballon: Vec, possession: CoteEnLigne): string {
  const avant = (p.numeroRole ?? p.numero) <= 8;
  if (!avant) return 'ligne';
  if (phase === 'melee') return dist(pos, ballon) < 4.6 ? 'melee' : 'ligne';
  if (phase === 'maul') return dist(pos, ballon) < 5.2 ? 'maul' : 'ligne';
  if (phase === 'touche') {
    // Le talonneur qui lance n'est pas dans l'alignement.
    if ((p.numeroRole ?? p.numero) === 2 && p.cote === possession) return 'ligne';
    const depuisLaTouche = ballon.y < LARGEUR / 2 ? pos.y : LARGEUR - pos.y;
    return Math.abs(pos.x - ballon.x) < 2.4 && depuisLaTouche > 3.5 && depuisLaTouche < 17.5 ? 'alignement' : 'ligne';
  }
  return 'ligne';
}

/**
 * Met l'état à jour pour l'image courante.
 *
 * `courant` : le relevé interpolé à l'instant affiché ; `positions` et `ballon` :
 * ce que l'écran dessine réellement à cette image (interpolation amortie).
 */
export function etat3DDepuisDirect(
  m: MemoireEtat3D, courant: TerrainDirect, positions: Map<string, Vec>, ballon: BallonAfficheDirect,
  score?: { domicile: number; exterieur: number },
): Etat3D {
  const e = m.etat;
  const sim = courant.simulation ?? courant.instantJeu ?? courant.horloge * 60;
  e.sim = sim;
  e.t = courant.instantJeu ?? courant.horloge * 60;
  e.phase = courant.phase;
  e.possession = COTE[courant.possession];
  e.ballon = { x: ballon.x, y: ballon.y };
  if (score) { e.scoreA = score.domicile; e.scoreB = score.exterieur; }

  // ── Les pions ──────────────────────────────────────────────────────────────
  const presents = new Set<string>();
  e.pions = courant.pions.map((p) => {
    presents.add(p.id);
    const pos = positions.get(p.id) ?? { x: p.x, y: p.y };
    let q = m.pions.get(p.id);
    if (!q) {
      const a = apparenceJoueurMatch(p.nom, p.poste);
      q = {
        id: p.id, cote: COTE[p.cote], numero: p.numeroRole ?? p.numero, numeroMaillot: p.numero, nom: p.nom, poste: p.poste,
        pos: { ...pos }, vitesse: { x: p.vx, y: p.vy }, surLeTerrain: true, sanction: 0, role: 'ligne', vitesseMax: 9,
        apparence: { peau: a.peau, cheveux: a.cheveux, coiffure: a.coiffure, barbe: a.barbe }, stats: {},
      };
      m.pions.set(p.id, q);
    }
    q.pos.x = pos.x; q.pos.y = pos.y;
    q.vitesse.x = p.vx; q.vitesse.y = p.vy;
    q.corps = p.corps;
    q.numero = p.numeroRole ?? p.numero;
    q.role = role(p, pos, courant.phase, e.ballon, courant.possession);
    return q;
  });
  const pion = (id: string | undefined) => (id && presents.has(id) ? m.pions.get(id) ?? null : null);

  // ── Le ballon : porté, en vol, ou libre ────────────────────────────────────
  e.porteurAffiche = courant.porteurId ?? null;
  e.porteur = pion(courant.porteurId);
  const v = courant.vol;
  if (v) {
    const cle = v.id ?? `${v.de.x}:${v.de.y}:${v.vers.x}:${v.vers.y}:${v.duree}`;
    if (cle !== m.cleVol || !e.vol) {
      m.cleVol = cle;
      e.vol = {
        de: { ...v.de }, vers: { ...v.vers }, duree: v.duree, ecoule: v.ecoule, hauteur: v.hauteur,
        type: v.type ?? 'passe', intention: v.intention, auteur: pion(v.auteurId), receveur: pion(v.receveurId),
      };
    }
    e.vol.ecoule = Math.max(0, Math.min(v.duree, v.ecoule));
  } else { e.vol = null; m.cleVol = ''; }
  e.ballonLibre = courant.phase === 'ballonLibre' || (!e.porteur && !e.vol && ballon.h > 0.2)
    ? { hauteur: Math.max(0.12, ballon.h), orientation: courant.ballonLibre?.orientation ?? 0 } : null;

  // ── Le regroupement : qui est lié se lit sur les places ───────────────────
  if (courant.phase === 'ruck') {
    if (!e.ruck || (courant.contact && e.ruck.porteurId !== courant.contact.porteurId)) {
      e.ruck = {
        porteurId: courant.contact?.porteurId, plaqueurId: courant.contact?.plaqueurId,
        organisation: { attaque: [], defense: [], origine: { ...e.ballon } },
      };
    }
    const o = e.ruck.organisation;
    const garder = (liste: string[]) => liste.filter((id) => { const q = pion(id); return !!q && !q.corps && dist(q.pos, e.ballon) < 2.8; });
    o.attaque = garder(o.attaque); o.defense = garder(o.defense);
    const proches = e.pions
      .filter((q) => !q.corps && q.id !== e.ruck!.porteurId && q.id !== e.ruck!.plaqueurId)
      .map((q) => ({ q, d: dist(q.pos, e.ballon) }))
      .sort((a, b) => a.d - b.d);
    for (const { q, d } of proches) {
      if (d > 1.7 || Math.hypot(q.vitesse.x, q.vitesse.y) > 1.6) continue;
      const liste = q.cote === e.possession ? o.attaque : o.defense;
      if (!liste.includes(q.id) && liste.length < (q.cote === e.possession ? 3 : 2)) liste.push(q.id);
    }
    // Le relayeur : le joueur libre du camp qui a le ballon, posté juste derrière.
    const s = e.possession === 'A' ? 1 : -1;
    const actuel = pion(o.relayeurId);
    if (!actuel || actuel.corps || dist(actuel.pos, e.ballon) > 6 || o.attaque.includes(actuel.id)) {
      o.relayeurId = proches.find(({ q, d }) => q.cote === e.possession && !o.attaque.includes(q.id)
        && d < 4.2 && (e.ballon.x - q.pos.x) * s > 0.4)?.q.id;
    }
  } else e.ruck = null;

  // ── Conquête et tir : leur avancement donne les étapes à la scène ─────────
  const c = courant.conquete;
  if (c) {
    if (!e.conquete || e.conquete.type !== c.type) e.conquete = { type: c.type, progression: c.progression };
    Object.assign(e.conquete, {
      progression: c.progression, cibleId: c.cibleId, horsAlignement: c.horsAlignement, reception: c.reception,
      pousseVers: c.pousseVers ? COTE[c.pousseVers] : undefined,
    });
  } else e.conquete = null;

  const prep = courant.preparationTir;
  const enTir = courant.phase === 'tirAuBut' || courant.phase === 'transformation';
  if (prep) {
    const buteur = pion(prep.buteurId);
    if (buteur && (!e.tir || e.tir.buteur !== buteur || e.tir.volLance)) {
      e.tir = { buteur, valeur: prep.transformation ? 2 : 3, lieu: { ...e.ballon }, volLance: false };
    }
  } else if (e.tir && enTir) {
    if (e.vol?.type === 'pied' && !e.tir.volLance) {
      e.tir.volLance = true;
      // Le relevé ne dit pas si le tir est réussi : sa trajectoire, si (voir `viseeTir`).
      e.tir.reussi = tirPasseEntreLesPoteaux(e.vol, e.tir.buteur.cote);
    } else if (e.tir.volLance && !e.vol) e.tir.retombe = true;
  } else e.tir = null;

  const progression = prep?.progression ?? c?.progression;
  e.progression = progression;
  if (progression === undefined) { m.suivi = null; e.minuteur = 0; }
  else {
    const cle = prep ? `tir:${prep.buteurId}` : `conquete:${c!.type}`;
    if (!m.suivi || m.suivi.cle !== cle || progression < m.suivi.p0) m.suivi = { cle, sim0: sim, p0: progression, duree: prep ? 12 : 7 };
    // La durée de la phase se mesure sur sa propre progression, dès qu'elle a assez avancé.
    if (progression - m.suivi.p0 > 0.08 && sim > m.suivi.sim0) {
      m.suivi.duree = Math.max(2.5, Math.min(60, (sim - m.suivi.sim0) / (progression - m.suivi.p0)));
    }
    e.dureeArret = m.suivi.duree;
    e.minuteur = (1 - progression) * m.suivi.duree;
  }

  const marqueur = pion(courant.aplatissage?.marqueurId);
  if (!marqueur) e.aplatissage = null;
  else if (e.aplatissage?.marqueur !== marqueur) e.aplatissage = { marqueur };

  // ── Arbitre, sifflet, gestes ───────────────────────────────────────────────
  e.arbitre = courant.arbitre
    ? { pos: { x: courant.arbitre.x, y: courant.arbitre.y }, vitesse: { x: courant.arbitre.vx, y: courant.arbitre.vy } } : null;
  const cleSifflet = courant.sifflet ? `${courant.sifflet.cle}|${courant.sifflet.fautif}|${courant.sifflet.club}` : '';
  if (cleSifflet !== m.cleSifflet) { m.cleSifflet = cleSifflet; e.sifflet = courant.sifflet ? { cle: courant.sifflet.cle } : null; }
  e.gestes = courant.gestes ?? [];
  return e;
}
