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

import { CARTON, phrase, texteMatch } from './commentaire';
import type { Pion } from './entites';
import { stopper } from './entites';
import {
  ajouterCommentaire, type Bagarre, type EtatMatch, type NiveauMatch,
  type OrdreBagarre,
} from './etat';
import { surLeTerrain } from './tactique';
import { adverse, borner, distance2, type Cote, type Vec } from './terrain';

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
