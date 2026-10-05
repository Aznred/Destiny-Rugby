// LES STATISTIQUES DE L'HABILLAGE TV — le marqueur après un essai, les petites
// bulles d'information pendant le match, la flèche du vent devant un tir.
//
// ⚠️ RIEN ICI NE DEMANDE QUOI QUE CE SOIT À UN SERVEUR. Tout sort de ce que
// l'écran tient déjà : l'état du match qu'il affiche, et un `ContexteStatsTV`
// que l'hôte remplit UNE fois à l'ouverture (saison du joueur en carrière ;
// cartes et résultats de la ligue, déjà chargés, en ligne). Une bulle qui
// apparaît ne coûte ni requête ni lecture en base.
//
// Les phrases sont des clés de traduction (`tv.stat.*`) avec leurs variables :
// ce module ne porte aucun texte affichable.
import type { EtatMatch } from './moteur/etat.js';
import { ventAuMoteur, ventPourLeBotteur } from './moteur/vent.js';
import { AXE, LIGNE_A, LIGNE_B } from './moteur/terrain.js';

export interface PhraseTV { cle: string; vars: Record<string, string | number> }

/** Ce que l'hôte sait d'un joueur AVANT le match (saison, ligue, carrière). */
export interface StatsJoueurTV { essais?: number; matchs?: number }
export interface ContexteStatsTV {
  /** Par identifiant de joueur du match (ou par nom, en repli). */
  joueurs?: Record<string, StatsJoueurTV>;
  /** Série de victoires en cours de chaque équipe, toutes compétitions de la saison. */
  serieA?: number; serieB?: number;
  /** Les dernières confrontations directes : victoires de A et de B (les plus récentes d'abord dans `dernieres`). */
  confrontations?: { dernieres: ('A' | 'B' | 'N')[] };
}

export interface MarqueurTV {
  id: string; nom: string; numero: number; poste: string; cote: 'A' | 'B';
  /** Essais de ce joueur dans CE match, celui-ci compris. */
  essaisDuMatch: number;
}

/** Le joueur qui vient de marquer, tant que dure la célébration. */
export function marqueurDepuisEtat(e: Pick<EtatMatch, 'tir' | 'pions'>): MarqueurTV | null {
  const tir = e.tir;
  if (!tir || tir.etape !== 'celebration' || !tir.marqueurId) return null;
  const p = e.pions.find((x) => x.id === tir.marqueurId);
  if (!p) return null;
  return { id: p.id, nom: p.nom, numero: p.numeroMaillot ?? p.numero, poste: p.poste, cote: p.cote, essaisDuMatch: Math.max(1, p.stats?.essais ?? 1) };
}

/** La ligne sous le nom du marqueur : sa saison quand on la connaît, son match sinon. */
export function phraseDuMarqueur(m: MarqueurTV, club: string, contexte?: ContexteStatsTV): PhraseTV {
  const avant = contexte?.joueurs?.[m.id] ?? contexte?.joueurs?.[m.nom];
  if (avant && avant.essais !== undefined) {
    const essais = avant.essais + m.essaisDuMatch;
    if (avant.matchs !== undefined) return { cle: 'tv.stat.essaisEnMatchs', vars: { n: essais, m: avant.matchs + 1, club } };
    return { cle: 'tv.stat.essaiSaison', vars: { n: essais } };
  }
  if (m.essaisDuMatch >= 2) return { cle: 'tv.stat.essaisAujourdhui', vars: { n: m.essaisDuMatch } };
  return { cle: 'tv.stat.premierEssai', vars: { club } };
}

/** Le vent devant un tir posé : sa force (km/h) et d'où il pousse, vu par le buteur (0 = vers les poteaux, π/2 = vers sa droite). */
export interface VentTV { kmh: number; angle: number }
export function ventPourLeTir(e: Pick<EtatMatch, 'tir' | 'ventDirection' | 'ventForce' | 'ventGraine' | 'cotesInverses' | 't'>): VentTV | null {
  const tir = e.tir;
  if (!tir || tir.volLance || tir.etape === 'celebration' || !(e.ventForce ?? 0)) return null;
  const de = tir.lieu ?? tir.buteur.pos;
  const vers = { x: tir.buteur.cote === 'A' ? LIGNE_B : LIGNE_A, y: AXE };
  const vent = ventAuMoteur(e, e.t);
  const { dos, travers } = ventPourLeBotteur(vent, de, vers);
  const force = Math.hypot(vent.x, vent.y);
  if (force < 1.2) return null;
  // Dans le repère du moteur, « travers positif » est à gauche d'une équipe qui attaque vers les x croissants.
  return { kmh: Math.round(force * 3.6), angle: Math.atan2(-travers, dos) };
}

// ── Les bulles ────────────────────────────────────────────────────────────

export interface MemoireBulles {
  /** Seconde d'écran de la dernière bulle, et celles déjà montrées. */
  derniere: number; vues: Set<string>;
  /** Possession relevée chaque seconde d'écran (les dix dernières minutes de jeu). */
  possession: { t: number; cote: 'A' | 'B' }[];
}
export const memoireBullesVide = (): MemoireBulles => ({ derniere: -Infinity, vues: new Set(), possession: [] });

type EtatPourBulles = Pick<EtatMatch, 'pions' | 'phase' | 'possession' | 't' | 'clubA' | 'clubB' | 'tir' | 'minute'>;

/**
 * La bulle à montrer maintenant, s'il y en a une qui vaut le coup.
 *
 * `maintenant` : secondes d'ÉCRAN (jamais l'horloge du match, qui file huit
 * fois plus vite dans un match de dix minutes). `espacement` : silence minimal
 * entre deux bulles. On ne parle que pendant le jeu courant — jamais sur un
 * essai, un tir ou un coup de sifflet, qui ont leur propre bandeau.
 */
export function bulleDuMoment(
  e: EtatPourBulles, contexte: ContexteStatsTV | undefined, memoire: MemoireBulles, maintenant: number, espacement = 70,
): PhraseTV | null {
  // La possession se relève en continu, bulle ou pas.
  const derniere = memoire.possession[memoire.possession.length - 1];
  if (e.phase === 'jeuCourant' || e.phase === 'ruck') {
    if (!derniere || e.t - derniere.t >= 6) memoire.possession.push({ t: e.t, cote: e.possession });
    while (memoire.possession.length && e.t - memoire.possession[0].t > 600) memoire.possession.shift();
  }
  if (maintenant - memoire.derniere < espacement) return null;
  if (!['jeuCourant', 'ruck', 'touche', 'melee'].includes(e.phase) || e.tir) return null;
  const club = (cote: 'A' | 'B') => (cote === 'A' ? e.clubA : e.clubB);
  const candidats: (PhraseTV & { id: string; poids: number })[] = [];
  const ajouter = (id: string, poids: number, cle: string, vars: PhraseTV['vars']) => {
    if (!memoire.vues.has(id)) candidats.push({ id, poids, cle, vars });
  };
  // 1. Ce que l'on savait avant le coup d'envoi : confrontations et séries.
  const face = contexte?.confrontations?.dernieres ?? [];
  if (face.length >= 2 && e.minute < 30) {
    let suite = 0;
    while (suite < face.length && face[suite] === face[0] && face[0] !== 'N') suite++;
    if (suite >= 2) {
      const gagnant = face[0] as 'A' | 'B';
      ajouter('face', 3, 'tv.stat.confrontations', { club: club(gagnant), n: suite, adversaire: club(gagnant === 'A' ? 'B' : 'A') });
    }
  }
  for (const cote of ['A', 'B'] as const) {
    const serie = cote === 'A' ? contexte?.serieA : contexte?.serieB;
    if ((serie ?? 0) >= 3 && e.minute < 40) ajouter(`serie${cote}`, 2, 'tv.stat.serie', { club: club(cote), n: serie! });
  }
  // 2. Le match en cours, joueur par joueur.
  for (const p of e.pions) {
    const s = p.stats;
    if (!s) continue;
    if (s.plaquages >= 7 && s.plaquagesManques === 0) ajouter(`plq:${p.id}:${Math.floor(s.plaquages / 4)}`, 2 + s.plaquages / 6, 'tv.stat.plaquages', { nom: p.nom, n: s.plaquages });
    if (s.grattages >= 2) ajouter(`grt:${p.id}:${s.grattages}`, 3 + s.grattages, 'tv.stat.grattages', { nom: p.nom, n: s.grattages });
    if (s.metres >= 55) ajouter(`mtr:${p.id}:${Math.floor(s.metres / 40)}`, 2 + s.metres / 50, 'tv.stat.metres', { nom: p.nom, n: Math.round(s.metres) });
    if (s.franchissements >= 4) ajouter(`frc:${p.id}:${s.franchissements}`, 2.5 + s.franchissements / 2, 'tv.stat.battus', { nom: p.nom, n: s.franchissements });
    if (s.offloads >= 3) ajouter(`off:${p.id}:${s.offloads}`, 2.5, 'tv.stat.offloads', { nom: p.nom, n: s.offloads });
    if (s.touchesGagnees >= 4) ajouter(`tch:${p.id}:${s.touchesGagnees}`, 2, 'tv.stat.touches', { nom: p.nom, n: s.touchesGagnees });
    const avant = contexte?.joueurs?.[p.id] ?? contexte?.joueurs?.[p.nom];
    if (avant?.essais !== undefined && avant.matchs && avant.essais >= 4 && avant.essais / avant.matchs >= 0.45 && p.surLeTerrain && e.minute < 25) {
      ajouter(`sais:${p.id}`, 1.6, 'tv.stat.essaisEnMatchs', { n: avant.essais, m: avant.matchs, club: club(p.cote) });
    }
  }
  // 3. La possession des dix dernières minutes.
  if (memoire.possession.length >= 30) {
    const a = memoire.possession.filter((x) => x.cote === 'A').length / memoire.possession.length;
    const cote = a >= 0.5 ? 'A' : 'B', part = Math.round(Math.max(a, 1 - a) * 100);
    if (part >= 62) ajouter(`poss:${cote}:${Math.floor(e.minute / 20)}`, 2.2, 'tv.stat.possession', { club: club(cote), n: part });
  }
  if (!candidats.length) return null;
  const choisie = candidats.sort((x, y) => y.poids - x.poids)[0];
  memoire.vues.add(choisie.id);
  memoire.derniere = maintenant;
  return { cle: choisie.cle, vars: choisie.vars };
}
