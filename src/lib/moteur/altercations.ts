// 🤼 LES ALTERCATIONS (Correctif 30, niveau d'IA 6)
//
// Demande : « des altercations collectives non graphiques pouvant arriver rarement après un gros plaquage, un geste dangereux,
// une provocation, une accumulation de fautes, un match très tendu. Pas fréquent ni arcade. Trois niveaux. Éviter de
// transformer ça en combat prolongé. Le jeu doit savoir quel joueur a déclenché l'incident. »
//
// ═══ CE QUE C'EST, ET CE QUE CE N'EST PAS ════════════════════════════════════
//
// `bagarre.ts` raconte ce qui arrive AU JOUEUR incarné (il chambre, il frappe, il donne des ordres, la commission le
// convoque). Ici il ne s'agit que du MATCH : trente pions, un coup de sifflet, deux ou dix joueurs qui s'expliquent quelques
// secondes pendant que la pénalité attend, puis un arbitre qui tranche. Personne ne frappe, personne ne se blesse.
//
// ⚠️ ELLE NE NAÎT QU'À UN COUP DE SIFFLET. Le jeu est déjà arrêté : rien à interrompre, rien à faire reprendre.
// ⚠️ ELLE N'EST JAMAIS TIRÉE DU GÉNÉRATEUR DU MATCH. L'envie se MESURE (`envieDAltercation` : tension, cause, gravité, fautes
// récentes) et se compare à un seuil lu sur un tirage À PART (`tirageAPart`, fonction de la graine du vent, de l'instant et
// des joueurs) : poser ou retirer une altercation ne décale aucun autre tirage du match.
// ⚠️ CE MODULE N'IMPORTE PAS `moteur.ts` (qui l'importe) : il décide et conduit, le moteur applique la sanction.
import {
  DUREE_ALTERCATION, envieDAltercation, jeuPhysique, niveauAltercation, sanctionAltercation,
  type CauseAltercation,
} from './animations.js';
import { jouerGeste, visibiliteFaute } from './dynamique.js';
import type { Pion } from './entites.js';
import type { Altercation, EtatMatch } from './etat.js';
import { LARGEUR, LONGUEUR, borner, type Vec } from './terrain.js';

/** Au plus tant d'altercations par match, et jamais deux à moins de tant de secondes simulées l'une de l'autre. */
export const ALTERCATIONS_MAX = 2;
export const REPOS_ENTRE_ALTERCATIONS = 90;

/**
 * Un nombre de [0, 1[ qui ne doit rien au générateur du match : il se déduit de la graine du vent (fixée au coup d'envoi),
 * de l'instant et d'un sel. Deux moteurs qui rejouent le même match y lisent la même valeur.
 */
export function tirageAPart(e: Pick<EtatMatch, 'ventGraine' | 'sim'>, sel: string): number {
  let h = (2166136261 ^ Math.imul((e.ventGraine ?? 0) + 7, 0x9e3779b1) ^ Math.imul(Math.round(e.sim * 100) + 1, 0x85ebca6b)) >>> 0;
  for (let i = 0; i < sel.length; i++) { h ^= sel.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const debout = (p: Pion) => p.surLeTerrain && p.sanction <= 0 && !p.corps;
const d2 = (a: Vec, b: Vec) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const proches = (e: EtatMatch, cote: Pion['cote'], lieu: Vec, rayon: number, sauf: Set<string>) => e.pions
  .filter((p) => p.cote === cote && debout(p) && !sauf.has(p.id) && d2(p.pos, lieu) < rayon * rayon)
  .sort((a, b) => d2(a.pos, lieu) - d2(b.pos, lieu));

/**
 * Y A-T-IL ALTERCATION ? Appelée par le moteur juste après un coup de sifflet.
 *
 * @param fautif celui qui a commis la faute (il peut avoir quitté le terrain sur un carton).
 * @param victime celui qui l'a subie, s'il y en a un.
 * @param gravite 1 pénalité, 2 jaune, 3 rouge.
 * @param fautesRecentes fautes de l'équipe sanctionnée dans le dernier quart d'heure.
 * @returns l'altercation, déjà posée dans l'état — ou null.
 */
export function chercherAltercation(
  e: EtatMatch, lieu: Vec, fautif: Pion | undefined, victime: Pion | undefined,
  cause: CauseAltercation, gravite: number, fautesRecentes: number,
): Altercation | null {
  if (!jeuPhysique(e) || !e.cadenceDetaillee || e.altercation || e.bagarre || e.phase !== 'penalite' || !fautif) return null;
  const compte = e.altercations ?? { n: 0, derniere: -1e9 };
  if (compte.n >= ALTERCATIONS_MAX || e.sim - compte.derniere < REPOS_ENTRE_ALTERCATIONS) return null;
  const lese = fautif.cote === 'A' ? 'B' : 'A';
  // Celui qui vient demander des comptes : un coéquipier de la victime, proche — et de préférence un sanguin.
  const sauf = new Set<string>(victime ? [victime.id] : []);
  const candidats = proches(e, lese, lieu, 12, sauf).slice(0, 3);
  if (victime && debout(victime) && !candidats.length) candidats.push(victime);
  const declencheur = candidats.sort((a, b) => a.discipline - b.discipline)[0];
  if (!declencheur) return null;
  // Celui qu'il vient chercher : le fautif s'il est encore là, sinon son coéquipier le plus proche.
  const cible = debout(fautif) ? fautif : proches(e, fautif.cote, lieu, 14, new Set())[0];
  if (!cible) return null;
  const envie = envieDAltercation(e.tension ?? 0, cause, gravite, fautesRecentes, declencheur.discipline);
  // Le seuil : de 0,55 à 1. Une faute ordinaire dans un match calme (envie ≈ 0,3) n'en produit jamais ; un geste dangereux
  // qui vaut un carton, quatre fois sur cinq ; des fautes répétées, de loin en loin.
  const seuil = 0.55 + 0.45 * tirageAPart(e, 'alt:' + fautif.id + ':' + declencheur.id);
  if (envie < seuil) return null;
  const pris = new Set([declencheur.id, cible.id]);
  const autour = Math.min(proches(e, 'A', lieu, 11, pris).length, proches(e, 'B', lieu, 11, pris).length);
  const niveau = niveauAltercation(gravite, e.tension ?? 0, autour + 1);
  const parCamp = niveau === 1 ? 0 : niveau === 2 ? 2 : 5;
  const participants = [declencheur.id, cible.id];
  for (const cote of [declencheur.cote, cible.cote] as const) for (const p of proches(e, cote, lieu, niveau === 3 ? 16 : 11, pris).slice(0, parCamp)) { participants.push(p.id); pris.add(p.id); }
  const separateurs: string[] = [];
  if (niveau >= 2) for (const cote of ['A', 'B'] as const) for (const p of proches(e, cote, lieu, 18, pris).slice(0, 1)) { separateurs.push(p.id); pris.add(p.id); }
  const vu = niveau >= 2 && tirageAPart(e, 'vu:' + declencheur.id) < Math.max(0.55, visibiliteFaute(e, lieu));
  const duree = DUREE_ALTERCATION[niveau];
  const a: Altercation = {
    niveau, cause, lieu: { x: lieu.x, y: lieu.y }, debut: e.sim, fin: e.sim + duree,
    declencheurId: declencheur.id, cibleId: cible.id, participants, separateurs,
    sanction: sanctionAltercation(niveau, vu, declencheur.stats.cartonsJaunes > 0, gravite),
  };
  e.altercation = a;
  e.altercations = { n: compte.n + 1, derniere: e.sim + duree };
  // La pénalité attend : le temps de s'expliquer, puis celui de revenir à sa place.
  e.minuteur += duree + 0.6;
  e.dureeArret = (e.dureeArret ?? 0) + duree + 0.6;
  if (e.sifflet) e.sifflet.restant = Math.max(e.sifflet.restant, duree + 1.5);
  return a;
}

/**
 * LA CONDUITE, pas à pas : qui va où, qui fait quoi. Aucune position n'est posée — chacun marche ou court jusqu'à l'autre.
 *   niveau 1   le déclencheur vient au contact, pousse, l'autre répond ; ils se parlent, puis se séparent d'eux-mêmes ;
 *   niveau 2   leurs voisins arrivent et se saisissent par les maillots, un joueur de chaque camp vient séparer ;
 *   niveau 3   une dizaine de joueurs regroupés qui se tiennent et se poussent, jusqu'à ce que les arbitres s'interposent.
 *
 * @returns 'juger' une seule fois, quand l'arbitre doit prononcer sa sanction ; 'finie' au pas où elle se dissout.
 */
export function conduireAltercation(e: EtatMatch): 'juger' | 'finie' | null {
  const a = e.altercation;
  if (!a) return null;
  if (e.phase !== 'penalite' || e.sim >= a.fin + 0.4) { e.altercation = null; return 'finie'; }
  const t = e.sim - a.debut, duree = a.fin - a.debut;
  const pion = (id: string) => e.pions.find((p) => p.id === id);
  const declencheur = pion(a.declencheurId), cible = pion(a.cibleId);
  const etapes = (a as Altercation & { etapes?: Record<string, number> }).etapes ??= {};
  const une = (cle: string, faire: () => void) => { if (etapes[cle] === undefined) { etapes[cle] = e.sim; faire(); } };
  const aller = (p: Pion, x: number, y: number, effort: number) => {
    p.cible = { x: borner(x, 1, LONGUEUR - 1), y: borner(y, 1, LARGEUR - 1) };
    p.effort = Math.max(p.effort, effort);
  };
  // Le retour au calme : dans la dernière seconde, plus personne n'est retenu — chacun regagne sa place de pénalité.
  const retour = t > duree - 1.1;
  if (declencheur && cible && debout(declencheur) && debout(cible) && !retour) {
    const dx = cible.pos.x - declencheur.pos.x, dy = cible.pos.y - declencheur.pos.y, d = Math.max(0.01, Math.hypot(dx, dy));
    // Face à face, à portée de bras : le déclencheur fait le chemin, l'autre fait un pas vers lui.
    aller(declencheur, cible.pos.x - dx / d * 0.95, cible.pos.y - dy / d * 0.95, d > 4 ? 0.8 : 0.5);
    if (d < 3) aller(cible, cible.pos.x - dx / d * 0.15, cible.pos.y - dy / d * 0.15, 0.3);
    if (d < 1.35) {
      une('pousse', () => jouerGeste(e, declencheur, 'scuffle_push', 1.5, 'n' + a.niveau));
      if (etapes.pousse !== undefined && e.sim - etapes.pousse > 0.55) une('repond', () => jouerGeste(e, cible, 'scuffle_push', 1.4, 'reponse'));
      if (etapes.repond !== undefined && e.sim - etapes.repond > 1.2 && a.niveau === 1) {
        une('parle', () => { jouerGeste(e, declencheur, 'scuffle_talk', 1.4); jouerGeste(e, cible, 'scuffle_talk', 1.4, 'reponse'); });
      }
      if (a.niveau >= 2 && etapes.repond !== undefined && e.sim - etapes.repond > 0.9) {
        une('saisit', () => { jouerGeste(e, declencheur, 'scuffle_grab', duree - t - 0.9); jouerGeste(e, cible, 'scuffle_grab', duree - t - 0.9, 'reponse'); });
      }
    }
  }
  if (!retour) {
    // Ceux qui s'en mêlent : par paires adverses, autour du point chaud.
    const autres = a.participants.slice(2).map(pion).filter((p): p is Pion => !!p && debout(p));
    const camp1 = autres.filter((p) => p.cote === declencheur?.cote), camp2 = autres.filter((p) => p.cote !== declencheur?.cote);
    const centre = declencheur && cible ? { x: (declencheur.pos.x + cible.pos.x) / 2, y: (declencheur.pos.y + cible.pos.y) / 2 } : a.lieu;
    const paires = Math.max(camp1.length, camp2.length);
    for (let i = 0; i < paires; i++) {
      const angle = (i / Math.max(1, paires)) * Math.PI * 2 + 0.9, rayon = a.niveau === 3 ? 1.5 + (i % 2) * 0.7 : 1.7;
      const px = centre.x + Math.cos(angle) * rayon, py = centre.y + Math.sin(angle) * rayon;
      const p1 = camp1[i], p2 = camp2[i];
      // Chacun de son côté de la paire, à quatre-vingts centimètres l'un de l'autre.
      const ox = -Math.sin(angle) * 0.42, oy = Math.cos(angle) * 0.42;
      if (p1) aller(p1, px + ox, py + oy, 0.85);
      if (p2) aller(p2, px - ox, py - oy, 0.85);
      if (p1 && p2 && d2(p1.pos, p2.pos) < 1.5 * 1.5) {
        une('paire' + i, () => {
          // À trois ou quatre paires, on ne voit jamais quatre fois le même geste : une paire se tient, la suivante se pousse.
          const tient = a.niveau === 2 || i % 2 === 0;
          jouerGeste(e, p1, tient ? 'scuffle_grab' : 'scuffle_push', Math.max(1.2, duree - t - 1), tient ? undefined : 'n' + a.niveau);
          jouerGeste(e, p2, tient ? 'scuffle_grab' : 'scuffle_push', Math.max(1.2, duree - t - 1), 'reponse');
        });
      }
    }
    // Ceux qui séparent : ils viennent se mettre entre les deux premiers, bras écartés.
    a.separateurs.map(pion).forEach((p, i) => {
      if (!p || !debout(p) || !declencheur || !cible) return;
      const qui = i === 0 ? declencheur : cible;
      const vx = qui.pos.x - centre.x, vy = qui.pos.y - centre.y, n = Math.max(0.01, Math.hypot(vx, vy));
      aller(p, centre.x + vx / n * 0.35 + (i ? 0.5 : -0.5) * (vy / n), centre.y + vy / n * 0.35 - (i ? 0.5 : -0.5) * (vx / n), 0.9);
      if (d2(p.pos, p.cible) < 1) une('separe' + i, () => jouerGeste(e, p, 'scuffle_separate', Math.max(1.2, duree - t - 0.6), 'ecarte'));
    });
  }
  if (!a.jugee && t >= duree - 1.1) { a.jugee = true; return 'juger'; }
  return null;
}
