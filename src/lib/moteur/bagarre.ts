// 🥊 LA TENSION, LES PROVOCATIONS ET LES BAGARRES
//
// Demande explicite : « qu'il puisse y avoir des bagarres si on insulte des
// joueurs, avec l'option de pouvoir donner des ordres, avec répercussions —
// cartons plus souvent en amateur et presque jamais en pro, qui suivent de
// grosses sanctions, suspensions pour la saison, blessures, etc. »
//
// ═══ LES TROIS RÈGLES QUI TIENNENT TOUT ══════════════════════════════════════
//
// 1. **ON NE DÉCLENCHE JAMAIS UNE BAGARRE AU HASARD.** Elle est toujours la
//    suite d'un geste du joueur : il a chambré quelqu'un, ou il a frappé. C'est
//    la même règle que les conséquences dures de la carrière
//    (`lib/consequences.ts`) — le jeu ne punit pas sans qu'on ait rien fait.
// 2. **LE NIVEAU CHANGE TOUT, DANS LES DEUX SENS.** En Fédérale, ça part au
//    quart de tour et l'arbitre distribue ; la commission, elle, fait dans la
//    semaine. En Top 14, personne ne relève une provocation — mais celui qui
//    craque joue sa saison. C'est exactement l'asymétrie demandée : « cartons
//    plus souvent en amateur et presque jamais en pro, qui suivent de grosses
//    sanctions ».
// 3. **LE MOTEUR NE FAIT PAS REPARTIR LE JEU.** Ce fichier calcule (cartons,
//    blessures, citation) et rend la façon dont l'arbitre remet le ballon en
//    jeu ; c'est `moteur.ts` qui l'applique. Sans cette séparation, `bagarre.ts`
//    devrait importer `moteur.ts`, qui l'importe déjà — un cycle.

import { CARTON, CHAMBRAGE, phrase, texteMatch } from './commentaire.js';
import type { Pion } from './entites.js';
import { stopper } from './entites.js';
import {
  ajouterCommentaire, type Bagarre, type EtatMatch, type NiveauMatch,
  type OrdreBagarre,
} from './etat.js';
import { surLeTerrain } from './tactique.js';
import { adverse, borner, distance2, type Cote, type Vec } from './terrain.js';

/** Le pion du joueur incarné, s'il est bien sur le terrain et pas sanctionné. */
export function monPion(e: EtatMatch): Pion | undefined {
  const p = e.pions.find((q) => q.moi);
  return p && p.surLeTerrain && p.sanction <= 0 ? p : undefined;
}

/** L'adversaire le plus proche, dans un rayon donné (mètres). */
function adversaireProche(e: EtatMatch, p: Pion, rayon: number): Pion | undefined {
  let meilleur: Pion | undefined;
  let d = rayon * rayon;
  for (const q of surLeTerrain(e, adverse(p.cote))) {
    if (q.sanction > 0) continue;
    const dd = distance2(q.pos, p.pos);
    if (dd < d) { d = dd; meilleur = q; }
  }
  return meilleur;
}

// ---------------------------------------------------------------------------
// LA TEMPÉRATURE DU MATCH
// ---------------------------------------------------------------------------

/** Fait monter la tension et la borne. Appelée aussi par le moteur (gros contacts). */
export function chauffer(e: EtatMatch, points: number): void {
  e.tension = borner(e.tension + points, 0, 100);
}

/** La tension retombe toute seule : un match ne reste pas électrique 80 minutes. */
export function refroidir(e: EtatMatch, dt: number): void {
  if (e.tension > 0) e.tension = Math.max(0, e.tension - dt * 0.42);
}

// ⚠️ C'EST CE COUPLE DE NOMBRES QUI PORTE TOUTE LA DEMANDE. La probabilité
// qu'un adversaire chambré relève et vienne aux mains : une fois sur quatre en
// amateur, une fois sur vingt-cinq chez les professionnels — et encore,
// seulement si le match est déjà chaud.
//
// ⚠️ ET ELLE S'ÉTEINT APRÈS CHAQUE ALTERCATION. Sans cet amortissement,
// provoquer en boucle donnait SEIZE BAGARRES par match (mesuré,
// `scripts/verifControle.ts`) : chaque tirage était indépendant, alors qu'au
// rugby la première échauffourée change tout — l'arbitre a parlé aux
// capitaines, tout le monde sait que le prochain part au vestiaire. La
// deuxième est trois fois moins probable, la troisième six fois.
function chanceDeRiposte(niveau: NiveauMatch, tension: number, dejaVues: number): number {
  const base = niveau === 'amateur'
    ? 0.22 + tension / 320    // 22 % à froid, jusqu'à 53 % quand ça bout
    : 0.012 + tension / 2600; // 1,2 % à froid, 5 % au maximum
  return base / (1 + 2 * dejaVues);
}

// ⚠️ AU-DELÀ, L'ARBITRE AURAIT VIDÉ LE TERRAIN. Trois altercations dans un même
// match, c'est déjà le maximum de ce qu'on voit en Fédérale un jour de derby.
const BAGARRES_MAX = 3;

// ---------------------------------------------------------------------------
// 💬 LES BULLES — ce que les joueurs se disent, sur le terrain
// ---------------------------------------------------------------------------
// ⚠️ Demande explicite : « en mode chambrage, petites bulles avec les joueurs
// qui disent quelque chose ». Le fil raconte le match à la troisième personne ;
// une bulle se passe À L'ENDROIT où ça se joue. C'est la différence entre lire
// « le ton monte » et VOIR deux pions se parler avant que ça parte.

/** Combien de bulles peuvent coexister. Au-delà, l'écran devient une BD. */
const BULLES_MAX = 4;

export function ajouterBulle(e: EtatMatch, pion: Pion, texte: string, duree = 2.8): void {
  // Un joueur ne parle pas par-dessus lui-même : sa bulle précédente est
  // remplacée, pas empilée.
  const dejaLa = e.bulles.findIndex((b) => b.pion === pion);
  if (dejaLa >= 0) e.bulles.splice(dejaLa, 1);
  e.bulles.push({ pion, texte, restant: duree });
  if (e.bulles.length > BULLES_MAX) e.bulles.shift();
}

/** Les bulles vieillissent au RYTHME DU MATCH, pas à celui de l'écran. */
export function vieillirBulles(e: EtatMatch, dt: number): void {
  if (!e.bulles.length) return;
  for (const b of e.bulles) b.restant -= dt;
  e.bulles = e.bulles.filter((b) => b.restant > 0 && b.pion.surLeTerrain && b.pion.sanction <= 0);
}

// ---------------------------------------------------------------------------
// 🗯️ LES FRICTIONS AUTOMATIQUES — le match s'échauffe tout seul
// ---------------------------------------------------------------------------
// ⚠️ CE BLOC RENVERSE LA RÈGLE N° 1 D'ORIGINE, ET C'EST DEMANDÉ.
//
// La première version posait : « on ne déclenche jamais une bagarre au hasard,
// elle est toujours la suite d'un geste du joueur ». Conséquence en jeu : rien
// n'arrivait JAMAIS si l'on ne cliquait pas sur « chambrer », et l'équipe d'en
// face était un décor poli. Retour de jeu : « refais les bagarres pour que
// l'équipe d'en face puisse la lancer, et que ça vienne plutôt d'actions
// illégales — plaquage haut, chambrage — qui s'activent toutes seules ».
//
// ⚠️ MAIS LE PRINCIPE DE FOND TIENT TOUJOURS : on ne PUNIT jamais le joueur sans
// cause. Une friction adverse ne coûte rien tant qu'il n'y répond pas — c'est
// l'adversaire qui prend la pénalité et le carton. Le joueur reste maître de
// ce qui lui arrive : il peut reculer, séparer, ou entrer dedans.

/** Secondes simulées entre deux tentatives de friction. */
const PERIODE_FRICTION = 9;

/**
 * Deux adversaires proches se cherchent. Appelée à chaque tick par le moteur.
 *
 * ⚠️ LA FRÉQUENCE SUIT LA TEMPÉRATURE ET LE NIVEAU. À froid en professionnel,
 * on s'ignore ; à 80 de tension en Fédérale, ça se parle à chaque regroupement.
 * Sans ce couplage, on obtenait soit un match muet, soit un plateau de théâtre.
 */
export function frictions(e: EtatMatch, dt: number): void {
  if (e.fini || e.bagarre) return;
  e.prochaineFriction -= dt;
  if (e.prochaineFriction > 0) return;
  e.prochaineFriction = PERIODE_FRICTION;

  // La chance qu'un mot parte, sur cette fenêtre.
  const chaleur = e.tension / 100;
  const chance = (e.niveau === 'amateur' ? 0.30 : 0.16) * (0.35 + chaleur);
  if (e.rng() >= chance) return;

  // On cherche deux adversaires côte à côte. Le joueur incarné est privilégié
  // — c'est son match, il doit le vivre, pas le regarder de loin.
  const moi = monPion(e);
  const auteur = moi && e.rng() < 0.55
    ? adversaireProche(e, moi, 12)
    : pionAuHasard(e);
  if (!auteur) return;
  const cible = adversaireProche(e, auteur, 10);
  if (!cible) return;

  chambrer(e, auteur, cible);
}

/** Un joueur au hasard, parmi ceux qui sont en jeu. */
function pionAuHasard(e: EtatMatch): Pion | undefined {
  const dispo = e.pions.filter((p) => p.surLeTerrain && p.sanction <= 0);
  return dispo[Math.floor(e.rng() * dispo.length)];
}

/**
 * Un joueur en chambre un autre : deux bulles, de la tension, et parfois la
 * suite.
 *
 * ⚠️ LA RÉPONSE EST PONDÉRÉE PAR LA DISCIPLINE, comme la riposte à une
 * provocation du joueur. Un capitaine international encaisse, un soupe-au-lait
 * répond — et c'est lui qui, plus tard, craquera.
 */
export function chambrer(e: EtatMatch, auteur: Pion, cible: Pion): void {
  ajouterBulle(e, auteur, phrase(e.rng, CHAMBRAGE));
  chauffer(e, e.niveau === 'amateur' ? 9 : 5);

  // La cible répond une fois sur deux, plus souvent si elle est soupe-au-lait.
  const repond = e.rng() < 0.35 + (100 - cible.discipline) / 220;
  if (repond) {
    ajouterBulle(e, cible, phrase(e.rng, CHAMBRAGE), 2.4);
    chauffer(e, 4);
  }

  // ⚠️ ÇA NE PART EN BAGARRE QUE SI LE JOUEUR INCARNÉ EST DEDANS. Le moteur
  // sait résoudre une altercation entre deux PNJ, mais l'écran, lui, ne sait
  // poser la question qu'à une personne : mettre le jeu en pause pour une
  // bagarre qu'on ne peut pas arbitrer serait une interruption sans choix.
  // Les frictions entre PNJ chauffent donc le match, et c'est tout — ce sont
  // elles qui rendent la suivante possible.
  const moi = monPion(e);
  if (!moi || (auteur !== moi && cible !== moi)) return;
  if (e.discipline.bagarres >= BAGARRES_MAX) return;

  const adversaire = auteur === moi ? cible : auteur;
  // Le joueur s'est fait chercher : c'est l'adversaire qui monte, donc c'est
  // lui l'origine — et la commission en tiendra compte.
  const chance = chanceDeRiposte(e.niveau, e.tension, e.discipline.bagarres)
    * (1.35 - adversaire.discipline / 150);
  if (e.rng() < chance) declencherBagarre(e, 'adversaire', false, adversaire);
}

// ---------------------------------------------------------------------------
// ⚖️ LES GESTES ILLÉGAUX — plaquage haut, plaquage en retard
// ---------------------------------------------------------------------------

/** Ce qu'un plaquage irrégulier vaut à l'arbitre. */
export interface Irregularite {
  /** Le motif tel que l'arbitre l'annonce (traduit par `motifLocalise`). */
  motif: string;
  /** Le geste a-t-il visé la tête ? Le carton n'est pas le même. */
  haut: boolean;
}

/**
 * Ce plaquage est-il irrégulier ? Appelée par le moteur à CHAQUE contact.
 *
 * ⚠️ CE N'EST PAS UNE ACTION DU JOUEUR, ET C'EST TOUT L'INTÉRÊT. Retour de
 * jeu : « ça serait plus par rapport à des actions illégales type plaquage
 * haut, chambrage, mais qui s'activent toutes seules ». Un bouton « plaquer
 * haut » ferait de la faute un choix tactique — au rugby, c'est un geste qui
 * ÉCHAPPE, sous la fatigue et sous la tension. La probabilité suit donc les
 * deux : un plaqueur cuit dans un match électrique monte trop haut.
 *
 * ⚠️ ET ELLE VAUT POUR LES TRENTE PIONS, pas seulement pour le joueur. C'est ce
 * qui permet à l'équipe d'en face d'être à l'origine de l'altercation.
 */
export function irregularite(e: EtatMatch, plaqueur: Pion): Irregularite | null {
  // Un plaqueur discipliné et frais ne monte pas haut. Un joueur à bout de
  // souffle dans un match tendu, si.
  const fatigue = 1 - plaqueur.endurance / 100;
  const base = e.niveau === 'amateur' ? 0.016 : 0.009;
  const p = base * (0.5 + fatigue) * (0.6 + e.tension / 70) * (1.4 - plaqueur.discipline / 150);
  if (e.rng() >= p) return null;
  // Deux tiers de plaquages hauts, un tiers de plaquages en retard : c'est la
  // répartition des cartons du rugby moderne, où la tête est la priorité.
  const haut = e.rng() < 0.66;
  return {
    motif: haut ? 'plaquage haut' : 'plaquage en retard',
    haut,
  };
}

/**
 * La suite d'un geste illégal : la tension monte, et l'équipe lésée peut venir
 * demander des comptes.
 *
 * ⚠️ APPELÉE APRÈS que le moteur ait sifflé la pénalité — c'est lui qui gère
 * l'arbitrage, ce fichier ne s'occupe que de ce que ça déclenche entre les
 * hommes. Sans cette séparation, `bagarre.ts` devrait importer `moteur.ts`,
 * qui l'importe déjà : un cycle.
 */
export function apresGesteIllegal(
  e: EtatMatch, fautif: Pion, victime: Pion, irreg: Irregularite,
): void {
  // Un plaquage sur la tête soulève le stade ; un plaquage en retard agace.
  chauffer(e, irreg.haut ? 26 : 16);
  ajouterBulle(e, victime, phrase(e.rng, CHAMBRAGE), 2.6);

  const moi = monPion(e);
  if (!moi || e.bagarre || e.discipline.bagarres >= BAGARRES_MAX) return;

  // ⚠️ TROIS CAS, ET UN SEUL DÉCLENCHE. Le joueur est la VICTIME (ses coéquipiers
  // et lui vont chercher le fautif), le joueur est le FAUTIF (l'équipe d'en face
  // vient le chercher), ou ça ne le concerne pas (la tension monte, point).
  const jeSuisVictime = victime === moi;
  const jeSuisFautif = fautif === moi;
  if (!jeSuisVictime && !jeSuisFautif) return;

  const adversaire = jeSuisVictime ? fautif : victime;
  // Un geste sur la tête se relève beaucoup plus facilement qu'un simple retard,
  // et un joueur qui vient d'en prendre un ne se laisse pas faire.
  const chance = chanceDeRiposte(e.niveau, e.tension, e.discipline.bagarres)
    * (irreg.haut ? 2.4 : 1.2)
    * (1.35 - adversaire.discipline / 150);
  if (e.rng() >= chance) return;

  // ⚠️ L'ORIGINE EST « adversaire » DANS LES DEUX SENS, et ce n'est pas une
  // erreur : elle dit qui a ALLUMÉ la mèche, pas qui est de quel côté. Victime,
  // le joueur n'a rien demandé ; fautif, c'est son geste — mais un geste subi,
  // pas un coup de poing volontaire. La commission distingue déjà les deux par
  // `coupPorte`, qui reste faux ici.
  declencherBagarre(e, 'adversaire', false, adversaire);
}

// ---------------------------------------------------------------------------
// LES TROIS GESTES DU JOUEUR
// ---------------------------------------------------------------------------

/**
 * 🗯️ CHAMBRER UN ADVERSAIRE. Ça ne coûte rien tout de suite — et c'est bien le
 * piège : la tension monte, et c'est elle qui décide plus tard si quelqu'un
 * craque. Un joueur qui passe le match à provoquer finit rarement le match.
 */
export function provoquer(e: EtatMatch): void {
  const p = monPion(e);
  if (!p || e.bagarre || e.fini) return;
  const cible = adversaireProche(e, p, 26);
  if (!cible) return;

  e.discipline.provocations += 1;
  chauffer(e, e.niveau === 'amateur' ? 21 : 13);
  ajouterCommentaire(e, 'jeu', p.cote,
    texteMatch('provocation', { nom: p.nom, cible: cible.nom }), 0, true);

  // ⚠️ LA RIPOSTE EST PONDÉRÉE PAR LA DISCIPLINE DE L'ADVERSAIRE : un joueur
  // au mental solide encaisse, un soupe-au-lait répond. Sans ce terme, le
  // vestiaire adverse serait un bloc, et chambrer un pilier de Régionale
  // reviendrait au même que chambrer un capitaine international.
  const chance = chanceDeRiposte(e.niveau, e.tension, e.discipline.bagarres)
    * (1.35 - cible.discipline / 150);
  if (e.discipline.bagarres < BAGARRES_MAX && e.rng() < chance) {
    return declencherBagarre(e, 'adversaire', false, cible);
  }
  if (e.rng() < 0.45) {
    ajouterCommentaire(e, 'jeu', cible.cote,
      texteMatch('provocationIgnoree', { cible: cible.nom }), 0, true);
  }
}

/**
 * 🥊 FRAPPER. Aucune ambiguïté : le joueur porte un coup. La bagarre éclate à
 * tous les coups, et il en est le coupable désigné — c'est ce que retiendra la
 * commission après le match, même si l'arbitre n'a rien vu sur le moment.
 */
export function frapper(e: EtatMatch): void {
  const p = monPion(e);
  if (!p || e.bagarre || e.fini) return;
  const cible = adversaireProche(e, p, 22);
  // Passé trois altercations, plus personne ne rentre dans le jeu : les deux
  // capitaines ont été prévenus, et le coup partirait dans le vide.
  if (!cible || e.discipline.bagarres >= BAGARRES_MAX) return;
  ajouterCommentaire(e, 'carton', p.cote,
    texteMatch('coupPorte', { nom: p.nom, cible: cible.nom }), 0, true);
  declencherBagarre(e, 'moi', true, cible);
}

/**
 * ✋ CALMER LE JEU. Le geste du capitaine : on rassemble, on fait reculer, on
 * évite la carte. Il fait vraiment retomber la tension — donc il réduit le
 * risque qu'un adversaire craque plus tard.
 */
export function calmerLeJeu(e: EtatMatch): void {
  const p = monPion(e);
  if (!p || e.bagarre || e.fini) return;
  e.tension = Math.max(0, e.tension - 30);
  ajouterCommentaire(e, 'jeu', p.cote,
    texteMatch('bagarreSeparee', { nom: p.nom }), 0, true);
}

// ---------------------------------------------------------------------------
// LA BAGARRE
// ---------------------------------------------------------------------------

/**
 * ⚠️ LE JEU S'ARRÊTE ET ATTEND UN ORDRE. La phase `bagarre` ne fait rien tant
 * que `e.bagarre.ordre` est nul : l'écran met la pause et pose la question.
 * Un garde-fou (`attente`) tranche tout seul au bout d'un moment, pour qu'un
 * appel à `avancer()` hors interface (script de mesure) ne se bloque jamais.
 */
export function declencherBagarre(
  e: EtatMatch, origine: 'moi' | 'adversaire', coupPorte: boolean, adversaire: Pion,
): void {
  const p = monPion(e);
  if (!p) return;
  e.discipline.bagarres += 1;
  if (coupPorte) e.discipline.coupsPortes += 1;
  chauffer(e, 30);
  ajouterCommentaire(e, 'carton', p.cote,
    texteMatch('bagarreDebut', { nom: p.nom, cible: adversaire.nom }), 0, true);
  e.bagarre = {
    origine, adversaire, coupPorte, attente: 0, ordre: null,
    resume: [texteMatch('bagarreGenerale')],
  };
  e.phase = 'bagarre';
  e.porteur = null;
  e.vol = null;
  e.placement = null;
  for (const q of e.pions) stopper(q);
}

/** L'ordre du joueur, posé par l'interface. Le tick suivant le résout. */
export function donnerOrdre(e: EtatMatch, ordre: OrdreBagarre): void {
  if (e.bagarre && !e.bagarre.ordre) e.bagarre.ordre = ordre;
}

export interface SuiteBagarre {
  /** À qui l'arbitre donne la pénalité, et où. */
  pour: Cote;
  lieu: Vec;
  motif: string;
}

/**
 * ⚖️ LE VERDICT. Il tient en une note de CULPABILITÉ — combien le joueur a
 * pesé dans ce qui vient d'arriver — puis en une table de cartons qui dépend
 * du niveau. Rien n'est tiré au sort avant d'avoir établi cette note : c'est
 * ce qui rend la sanction lisible pour le joueur, et jamais arbitraire.
 */
export function resoudreBagarre(e: EtatMatch): SuiteBagarre {
  const b = e.bagarre;
  const p = e.pions.find((q) => q.moi);
  const lieu: Vec = { x: e.ballon.x, y: e.ballon.y };
  if (!b || !p) {
    return { pour: e.possession, lieu, motif: 'antijeu' };
  }
  const ordre = b.ordre ?? 'reculer';

  // ── 1. LA CULPABILITÉ ────────────────────────────────────────────────────
  let culpabilite = b.origine === 'moi' ? 2.4 : 0;
  if (b.coupPorte) culpabilite += 1;
  culpabilite += ORDRE_CULPABILITE[ordre];
  // Un ordre de mêlée générale, c'est vingt-deux joueurs au sol : l'arbitre ne
  // cherche plus qui a commencé, il sanctionne les deux camps.
  const generale = ordre === 'tous';
  if (generale) chauffer(e, 20);

  // ── 2. LES CARTONS ───────────────────────────────────────────────────────
  const amateur = e.niveau === 'amateur';
  const motif = b.coupPorte ? 'coup de poing' : generale ? 'bagarre générale' : 'antijeu';
  const carte = carteMeritee(e, culpabilite, amateur);
  if (carte) sanctionner(e, p, carte === 'rouge', motif, b.resume);

  // L'adversaire prend aussi, et plus volontiers en amateur : quand deux
  // joueurs se battent, l'arbitre sort rarement une seule carte.
  const carteAdverse = b.origine === 'adversaire'
    ? carteMeritee(e, 2.4 + ORDRE_CULPABILITE.reculer, amateur)
    : carteMeritee(e, generale ? 1.6 : 0.9, amateur);
  if (carteAdverse) sanctionner(e, b.adversaire, carteAdverse === 'rouge', motif, b.resume);

  // ⚠️ EN AMATEUR, IL Y A TOUJOURS UN INNOCENT QUI PAIE. Sur une générale, un
  // troisième larron prend la carte — c'est le rugby du dimanche, et c'est ce
  // qui rend ces divisions vraiment plus hachées que le professionnalisme.
  if (amateur && generale && e.rng() < 0.5) {
    const camp = e.rng() < 0.5 ? p.cote : b.adversaire.cote;
    const autres = surLeTerrain(e, camp).filter((q) => q !== p && q !== b.adversaire && q.sanction <= 0);
    const malchanceux = autres[Math.floor(e.rng() * autres.length)];
    if (malchanceux) sanctionner(e, malchanceux, false, 'bagarre générale', b.resume);
  }

  // ── 3. LES CORPS ─────────────────────────────────────────────────────────
  blesserPeutEtre(e, b, ordre);

  // ── 4. LA REPRISE ────────────────────────────────────────────────────────
  // La pénalité va au camp le moins fautif. À culpabilité égale (une générale
  // où tout le monde a tapé), l'arbitre rend le ballon à qui l'avait.
  const pour: Cote = culpabilite >= 2 ? adverse(p.cote)
    : b.origine === 'adversaire' && culpabilite <= 0.5 ? p.cote
      : e.possession;
  return { pour, lieu, motif };
}

/** Ce que chaque ordre ajoute (ou retire) à la culpabilité du joueur. */
const ORDRE_CULPABILITE: Record<OrdreBagarre, number> = {
  tous: 1.2,       // il a fait venir tout le pack
  proteger: 0.4,   // il pousse, il tire, il ne frappe pas
  calmer: -1.2,    // il sépare : l'arbitre le voit aussi
  reculer: -2.2,   // il s'écarte les mains en l'air
};

/**
 * ⚠️ LA TABLE DEMANDÉE, NOIR SUR BLANC. À faute égale, l'amateur voit plus de
 * cartons ; le professionnel en voit moins, mais quand il en prend un, c'est
 * un rouge — et c'est le rouge qui déclenche la commission (voir
 * `sanctionApresMatch`).
 */
function carteMeritee(
  e: EtatMatch, culpabilite: number, amateur: boolean,
): 'jaune' | 'rouge' | null {
  if (culpabilite <= 0) {
    // Le chaos amateur : même en reculant, on peut se retrouver sur la feuille.
    return amateur && e.rng() < 0.14 ? 'jaune' : null;
  }
  const r = e.rng();
  if (culpabilite < 1.5) {
    if (amateur) return r < 0.52 ? 'jaune' : null;
    return r < 0.30 ? 'jaune' : null;
  }
  if (culpabilite < 2.8) {
    if (amateur) return r < 0.14 ? 'rouge' : r < 0.86 ? 'jaune' : null;
    return r < 0.34 ? 'rouge' : r < 0.80 ? 'jaune' : null;
  }
  // Un coup de poing assumé.
  if (amateur) return r < 0.58 ? 'rouge' : 'jaune';
  return r < 0.92 ? 'rouge' : 'jaune';
}

/** Sort la carte, met le joueur dehors, et l'écrit partout où il faut. */
function sanctionner(
  e: EtatMatch, p: Pion, rouge: boolean, motif: string, resume: string[],
): void {
  p.surLeTerrain = false;
  p.sanction = rouge ? 99_999 : 600; // dix minutes d'horloge, ou le reste du match
  if (rouge) p.stats.cartonsRouges += 1; else p.stats.cartonsJaunes += 1;
  if (p.moi) {
    if (rouge) e.discipline.rouges += 1; else e.discipline.jaunes += 1;
    e.discipline.motif = motif;
  }
  const club = p.cote === 'A' ? e.clubA : e.clubB;
  const texte = rouge
    ? texteMatch('cartonRouge', { nom: p.nom, motif, club })
    : phrase(e.rng, CARTON, { nom: p.nom, motif, club });
  ajouterCommentaire(e, 'carton', p.cote, texte, 0, p.moi);
  resume.push(texte);
}

// ⚠️ ON SE BLESSE VRAIMENT DANS UNE BAGARRE, et presque toujours à la main :
// c'est la blessure classique du coup de poing sur un casque. La liste tient
// en quatre entrées parce qu'elles doivent rester reconnaissables — un joueur
// qui lit « fracture de l'orbite » comprend tout de suite ce qu'il a fait.
const BLESSURES_BAGARRE: { nom: string; min: number; max: number; poids: number }[] = [
  { nom: 'Arcade ouverte', min: 1, max: 2, poids: 40 },
  { nom: 'Nez cassé', min: 2, max: 3, poids: 30 },
  { nom: 'Main cassée sur un coup de poing', min: 6, max: 10, poids: 22 },
  { nom: 'Fracture du plancher orbitaire', min: 8, max: 14, poids: 8 },
];

function blesserPeutEtre(e: EtatMatch, b: Bagarre, ordre: OrdreBagarre): void {
  if (ordre === 'reculer') return; // on ne se casse pas la main en s'écartant
  const expose = (b.coupPorte ? 0.13 : 0.05) + (ordre === 'tous' ? 0.05 : 0);
  if (e.rng() >= expose) return;
  let seuil = e.rng() * BLESSURES_BAGARRE.reduce((a, m) => a + m.poids, 0);
  let modele = BLESSURES_BAGARRE[0];
  for (const m of BLESSURES_BAGARRE) {
    seuil -= m.poids;
    if (seuil <= 0) { modele = m; break; }
  }
  const semaines = modele.min + Math.floor(e.rng() * (modele.max - modele.min + 1));
  e.discipline.blessure = { nom: modele.nom, semaines };
  b.resume.push(`🚑 ${modele.nom}`);
}

// ---------------------------------------------------------------------------
// APRÈS LE COUP DE SIFFLET : LA COMMISSION
// ---------------------------------------------------------------------------

/**
 * ⚠️ C'EST ICI QUE « PRESQUE JAMAIS EN PRO, MAIS DE GROSSES SANCTIONS » PREND
 * SON SENS. Un coup de poing en Fédérale, c'est trois dimanches à regarder les
 * copains. Le même coup de poing en Top 14, c'est une convocation, la vidéo, et
 * une saison qui peut s'arrêter là.
 *
 * ⚠️ ET LA VIDÉO RATTRAPE CE QUE L'ARBITRE N'A PAS VU. Un coup porté sans
 * carton n'est pas un coup gratuit : en professionnel, il y a vingt caméras.
 * C'est ce qui empêche de « frapper quand l'arbitre regarde ailleurs » comme
 * stratégie.
 */
export function sanctionApresMatch(e: EtatMatch): void {
  const d = e.discipline;
  const amateur = e.niveau === 'amateur';
  const entre = (min: number, max: number) => min + Math.floor(e.rng() * (max - min + 1));

  if (d.rouges > 0) {
    const motif = d.motif || 'antijeu';
    const bagarre = d.coupsPortes > 0 || d.bagarres > 0;
    const semaines = bagarre
      ? (amateur ? entre(3, 8) : entre(12, 34))
      : (amateur ? entre(2, 4) : entre(3, 8));
    d.citation = { semaines, motif };
    return;
  }
  // Coup porté, pas vu par l'arbitre : la commission peut citer sur images.
  if (d.coupsPortes > 0) {
    const cite = e.rng() < (amateur ? 0.22 : 0.62);
    if (cite) {
      d.citation = {
        semaines: amateur ? entre(2, 4) : entre(6, 16),
        motif: 'coup de poing relevé sur les images',
      };
    }
  }
}

// ---------------------------------------------------------------------------
// LES ORDRES, POUR L'INTERFACE
// ---------------------------------------------------------------------------

export interface DefinitionOrdre {
  id: OrdreBagarre;
  emoji: string;
  /** Clé i18n du libellé du bouton. */
  cle: string;
  /** Clé i18n de la conséquence annoncée, pour que le choix soit éclairé. */
  aide: string;
}

export const ORDRES: DefinitionOrdre[] = [
  { id: 'tous', emoji: '🥊', cle: 'ml.ordre.tous', aide: 'ml.ordre.tous.aide' },
  { id: 'proteger', emoji: '🛡️', cle: 'ml.ordre.proteger', aide: 'ml.ordre.proteger.aide' },
  { id: 'calmer', emoji: '✋', cle: 'ml.ordre.calmer', aide: 'ml.ordre.calmer.aide' },
  { id: 'reculer', emoji: '🚶', cle: 'ml.ordre.reculer', aide: 'ml.ordre.reculer.aide' },
];
