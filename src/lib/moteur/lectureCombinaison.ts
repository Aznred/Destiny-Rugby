// LE CAHIER VIVANT (Correctif 41, règles 11) — ce que le porteur LIT avant de jouer une étape de sa combinaison, et ce
// que le match retient de ce qu'elle a donné.
//
// ⚠️ TOUT EST DERRIÈRE `cahierVivant(e)`, gelé à la création du match. Sans lui le moteur rejoue exactement comme avant :
// un cahier qui porte des options les ignore, aucune mémoire n'est tenue, aucun bilan n'est écrit.
// ⚠️ AUCUN TIRAGE ICI. Une condition est une géométrie — des distances, des vitesses, des comptes — lue sur l'état du
// match : deux rejoues du même match tombent sur la même lecture, et rien ne décale le générateur.
// ⚠️ C'EST L'ATTAQUE QUI LIT LA DÉFENSE, JAMAIS L'INVERSE : aucun défenseur n'apprend ce que le cahier prévoit.
import { candidatesCombinaison, type Combinaison, type ConditionCombinaison, type OptionCombinaison, type PhaseCombinaison } from '../ligue/combinaisons.js';
import type { CombinaisonEnCours } from './combinaisons.js';
import type { EtatMatch } from './etat.js';
import type { Pion } from './entites.js';
import { attaquantLibre, defenseurPresent } from './ia/lecture.js';
import { ligneDePasseCoupee, lireLeSurnombre, regarderDevant } from './ia/vision.js';
import { adverse, AXE, distance, LIGNE_A, LIGNE_B, sens, type Cote } from './terrain.js';

export function cahierVivant(e: Pick<EtatMatch, 'cahierVivant'>): boolean { return !!e.cahierVivant; }

const camp = (e: EtatMatch, cote: Cote) => e.pions.filter((p) => p.cote === cote && p.surLeTerrain && p.sanction <= 0);

/** Vers où est « l'extérieur » pour ce porteur : loin de la conquête ; au centre exact, vers le grand côté. */
function versLExterieur(c: CombinaisonEnCours, porteur: Pion): 1 | -1 {
  const ecart = porteur.pos.y - c.origine.y;
  if (Math.abs(ecart) > 2) return ecart > 0 ? 1 : -1;
  return porteur.pos.y < AXE ? 1 : -1;
}

/**
 * La condition d'une option est-elle vraie, là, maintenant ? `receveur` : celui que l'étape prévoyait de servir ;
 * `cible` : celui que la réponse servirait.
 *
 * ⚠️ LES SEUILS SONT ÉTALONNÉS SUR CE QUE LE MOTEUR PRODUIT (`scripts/etalonnerConditions.ts`), pas sur une idée du
 * rugby : au moment où un ouvreur doit donner, son vis-à-vis est à 3 à 5,5 m et presque à l'arrêt, le défenseur le plus
 * proche de son premier centre à 8 à 11 m. Une condition réglée « à vue » serait toujours vraie, ou jamais.
 * Les intervalles et le surnombre sont ceux que le porteur de l'IA lit déjà (`ia/vision.ts`) : une seule lecture du jeu.
 */
export function lireCondition(
  e: EtatMatch, c: CombinaisonEnCours, porteur: Pion, condition: ConditionCombinaison, receveur?: Pion, cible?: Pion,
): boolean {
  const s = sens(porteur.cote);
  const ext = versLExterieur(c, porteur);
  const rideau = camp(e, adverse(porteur.cote)).filter((d) => defenseurPresent(e, d));
  /** Devant le joueur, en mètres dans le sens de l'attaque ; à son extérieur, en mètres. */
  const devant = (d: Pion, de: Pion = porteur) => (d.pos.x - de.pos.x) * s;
  const lateral = (d: Pion, de: Pion = porteur) => (d.pos.y - de.pos.y) * ext;
  /** Où sera ce défenseur dans un tiers de seconde : on lit sa course, pas sa photo. */
  const bientot = (d: Pion) => ({ x: d.pos.x + d.vitesse.x * 0.3, y: d.pos.y + d.vitesse.y * 0.3 });

  switch (condition) {
    case 'monteeRapide': {
      // La défense est déjà sur lui (à moins de 3 m quand il peut jouer : un rideau en place se tient à 4 ou 5), ou elle arrive lancée.
      const vue = regarderDevant(e, porteur);
      if (!vue.devant) return false;
      const fermeture = Math.max(0, ...rideau.filter((d) => devant(d) > 0 && distance(d.pos, porteur.pos) < 9).map((d) => -d.vitesse.x * s));
      return vue.distance < 3 || (vue.distance < 7 && fermeture > 4);
    }
    case 'receveurMarque': {
      // Celui qu'on devait servir est pris : un défenseur dans la ligne de passe, ou plus près de lui qu'un rideau en place.
      if (!receveur) return false;
      if (ligneDePasseCoupee(e, porteur, receveur)) return true;
      return rideau.some((d) => distance(bientot(d), receveur.pos) < 9);
    }
    case 'intervalleInterieur':
    case 'intervalleExterieur': {
      // Le meilleur intervalle que voit le porteur : assez large (5,8 m une fois retiré ce que chacun referme), peu couvert.
      const trou = regarderDevant(e, porteur).intervalle;
      if (!trou || trou.largeur < 5.8 || trou.couverture > 1) return false;
      const dehors = (trou.y - porteur.pos.y) * ext > 0.5;
      return condition === 'intervalleExterieur' ? dehors : !dehors;
    }
    case 'joueurLibre': {
      // Le joueur visé par la réponse (un pod, un ailier) a du champ : personne dans son couloir à moins de 13,6 m.
      if (!cible || !attaquantLibre(cible)) return false;
      return !rideau.some((d) => devant(d, cible) > -1 && devant(d, cible) < 13.6 && Math.abs(d.pos.y - cible.pos.y) < 5);
    }
    case 'ailierMonte': {
      // Le dernier défenseur du côté ouvert est monté à hauteur du rideau (il se tient un mètre plus bas quand il couvre),
      // et personne ne garde le fond derrière lui.
      const large = rideau.filter((d) => lateral(d) > 8).sort((a, b) => lateral(b) - lateral(a))[0];
      if (!large) return false;
      const ligne = rideau.filter((d) => d !== large && devant(d) > 0 && devant(d) < 12);
      if (!ligne.length) return false;
      const hauteur = ligne.reduce((somme, d) => somme + devant(d), 0) / ligne.length;
      if (devant(large) > hauteur + 0.5) return false;
      return !rideau.some((d) => d !== large && devant(d, large) > 6 && Math.abs(d.pos.y - large.pos.y) < 16);
    }
    case 'surnombre': {
      // Un attaquant de plus que de défenseurs à l'extérieur du porteur — deux contre un, trois contre deux.
      const surnombre = lireLeSurnombre(e, porteur);
      return !!surnombre && surnombre.cote === ext;
    }
  }
}

/** Les options à lire à cette étape, dans l'ordre du cahier. */
export function optionsDeLEtape(c: CombinaisonEnCours): OptionCombinaison[] {
  return (c.variante.options ?? []).filter((o) => o.etape === c.index);
}

// ---------------------------------------------------------------------------
// CE QUE LE MATCH RETIENT : le bilan de chaque combinaison jouée, et une mémoire légère par plan.
// ---------------------------------------------------------------------------

export type IssueCombinaison = 'essai' | 'franchissement' | 'conserve' | 'pied' | 'perdu' | 'penalitePour' | 'penaliteContre';
export interface BilanCombinaisonMatch {
  cote: Cote; id: string; variante: string;
  /** Le plan vient du marché : sa publication et sa version, pour les statistiques communes. */
  publication?: string; version?: number;
  /** Instant de simulation du départ, mètres gagnés jusqu'à l'issue, passes et défenseurs battus pendant la séquence. */
  debut: number; metres: number; passes: number; battus: number;
  issue: IssueCombinaison;
  /** L'option qui a été jouée à la place du geste prévu, s'il y en a eu une. */
  option?: ConditionCombinaison;
}
export interface SuiviCombinaison {
  cote: Cote; id: string; variante: string; publication?: string; version?: number;
  debut: number; x0: number; score0: number; passes0: number; battus0: number; option?: ConditionCombinaison;
}
export interface MemoireCombinaison { jouees: number; reussies: number }
/** Au-delà, les plus anciens bilans sont oubliés : un match de quatre-vingts minutes en produit une centaine. */
const BILANS_MAX = 160;

const somme = (e: EtatMatch, cote: Cote, lire: (p: Pion) => number) => e.pions.reduce((n, p) => (p.cote === cote ? n + lire(p) : n), 0);
const scoreDe = (e: EtatMatch, cote: Cote) => (cote === 'A' ? e.scoreA : e.scoreB);

/** Appelé quand une combinaison démarre : on note d'où elle part. */
export function ouvrirSuivi(e: EtatMatch, c: CombinaisonEnCours): void {
  if (!cahierVivant(e)) return;
  e.suiviCombinaison = {
    cote: c.cote, id: c.plan.id, variante: c.variante.nom,
    ...(c.plan.origine ? { publication: c.plan.origine.publication, version: c.plan.origine.version } : {}),
    debut: e.sim, x0: e.ballon.x, score0: scoreDe(e, c.cote),
    passes0: somme(e, c.cote, (p) => p.stats.passes), battus0: somme(e, c.cote, (p) => p.stats.franchissements),
  };
}

/** Ce que vaut une issue pour la mémoire du match : 1 (elle a marché), 0,5 (elle a tenu), 0 (elle a coûté). */
export function valeurDeLIssue(issue: IssueCombinaison, metres: number): number {
  if (issue === 'essai' || issue === 'franchissement' || issue === 'penalitePour') return 1;
  if (issue === 'conserve') return metres >= 4 ? 0.5 : metres >= 0 ? 0.25 : 0;
  if (issue === 'pied') return 0.4;
  return 0;
}

/**
 * Suit la combinaison ouverte jusqu'à ce qu'on sache ce qu'elle a donné : essai, franchissement, ballon conservé au sol,
 * coup de pied, ballon perdu, pénalité. ⚠️ N'OBSERVE QUE : aucune décision du match ne dépend de ce qui est écrit ici,
 * sauf le choix de la PROCHAINE combinaison parmi des plans également adaptés (`memoireTactique`).
 */
export function suivreCombinaison(e: EtatMatch): void {
  const s = e.suiviCombinaison;
  if (!s) return;
  const metres = Math.round((e.ballon.x - s.x0) * sens(s.cote) * 10) / 10;
  const battus = somme(e, s.cote, (p) => p.stats.franchissements) - s.battus0;
  let issue: IssueCombinaison | null = null;
  if (scoreDe(e, s.cote) > s.score0 || (e.phase === 'aplatissage' && e.possession === s.cote)) issue = 'essai';
  else if (e.phase === 'penalite') issue = e.possession === s.cote ? 'penalitePour' : 'penaliteContre';
  else if (e.possession !== s.cote) issue = 'perdu';
  else if (e.phase === 'ballonEnLAir' && e.vol && e.vol.type !== 'passe') issue = 'pied';
  else if (e.phase !== 'jeuCourant' && e.phase !== 'ballonEnLAir') issue = battus > 0 || metres >= 10 ? 'franchissement' : 'conserve';
  else if (e.sim - s.debut > 40 || e.fini) issue = battus > 0 || metres >= 10 ? 'franchissement' : 'conserve';
  if (!issue) return;
  e.suiviCombinaison = null;
  const bilan: BilanCombinaisonMatch = {
    cote: s.cote, id: s.id, variante: s.variante,
    ...(s.publication ? { publication: s.publication, version: s.version } : {}),
    debut: Math.round(s.debut * 100) / 100, metres, passes: somme(e, s.cote, (p) => p.stats.passes) - s.passes0, battus, issue,
    ...(s.option ? { option: s.option } : {}),
  };
  (e.bilansCombinaisons ??= []).push(bilan);
  if (e.bilansCombinaisons.length > BILANS_MAX) e.bilansCombinaisons.splice(0, e.bilansCombinaisons.length - BILANS_MAX);
  const memoire = ((e.memoireCombinaisons ??= {})[s.cote] ??= {});
  const m = (memoire[s.id] ??= { jouees: 0, reussies: 0 });
  m.jouees += 1;
  m.reussies += valeurDeLIssue(issue, metres);
}

/**
 * LA MÉMOIRE TACTIQUE (points 29 et 30) : parmi des plans AUSSI adaptés à la situation, lequel rejouer ?
 * Celui qui marche revient, celui que l'adversaire contre laisse sa place, et un plan pas encore essayé a sa chance :
 * `(réussies + 1) / (jouées + 2)`, plus une prime qui fond à mesure qu'on le connaît. Un calcul par conquête — rien par image.
 */
export function memoireTactique(memoire: Record<string, MemoireCombinaison> | undefined, candidats: Combinaison[]): Combinaison | undefined {
  let meilleur: Combinaison | undefined, indice = -Infinity;
  for (const c of candidats) {
    const m = memoire?.[c.id] ?? { jouees: 0, reussies: 0 };
    const valeur = (m.reussies + 1) / (m.jouees + 2) + 0.6 / Math.sqrt(m.jouees + 1);
    if (valeur > indice + 1e-9) { meilleur = c; indice = valeur; }
  }
  return meilleur;
}

/** Les plans également adaptés à la situation du ballon, vus du camp qui attaque. */
export function candidatsDeLaSituation(e: EtatMatch, phase: PhaseCombinaison): Combinaison[] {
  const cote = e.possession;
  return candidatesCombinaison(e.plansCombinaisons?.[cote] ?? [], phase,
    cote === 'A' ? e.ballon.x - LIGNE_A : LIGNE_B - e.ballon.x, sens(cote) === 1 ? e.ballon.y : 70 - e.ballon.y);
}
