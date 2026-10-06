// ⏱️ LES MOMENTS — quand le match ralentit parce que c'est À TOI de jouer.
//
// ═══ LE PROBLÈME QUE CE FICHIER RÈGLE ════════════════════════════════════════
//
// Retour de jeu : « c'est injouable et pas fun ». Deux causes, et la seconde
// était invisible dans le code.
//
// 1. **LE JEU TOURNAIT À CINQ FOIS LA VITESSE RÉELLE PENDANT QU'ON PILOTAIT.**
//    La vitesse « ×1 » de l'ancienne barre valait `facteur: 5` : une seconde de
//    poignet pour cinq secondes de rugby. Un plaquage à contrer durait 0,2 s à
//    l'écran. Ce n'était pas dur, c'était impossible — on cliquait après coup,
//    toujours.
//
// 2. **MAIS ON NE PEUT PAS JOUER 80 MINUTES EN TEMPS RÉEL NON PLUS.** Un match
//    contient ~35 minutes de ballon vivant, et un ouvreur en touche le ballon
//    peut-être quarante fois. Passer trente-cinq minutes à trottiner pour vivre
//    quatre minutes de rugby, c'est le second visage du « pas fun ».
//
// ═══ LA RÉPONSE : LE MATCH DÉFILE, ET IL S'ARRÊTE SUR TOI ════════════════════
//
// Le jeu file vite tant qu'il ne se passe rien pour ton joueur, et retombe en
// TEMPS RÉEL dès qu'un ballon arrive sur toi, qu'un porteur te fonce dessus ou
// qu'un regroupement se forme à ta portée. C'est le mode « carrière joueur »
// des jeux de sport : on ne vit que ses propres moments, mais on les vit
// vraiment, à la bonne vitesse, avec le temps de décider.
//
// ⚠️ CE FICHIER NE MUTE RIEN. C'est une lecture pure de l'état, appelée à
// chaque image par l'écran. Le moteur n'en sait rien et reste déterministe :
// changer la vitesse d'affichage ne change pas le match, seulement le nombre de
// secondes réelles qu'il met à se jouer.

import type { EtatMatch } from './etat.js';
import type { Pion } from './entites.js';
import { distance2 } from './terrain.js';

/** Pourquoi le jeu vient de ralentir. */
export type TypeMoment =
  | 'ballon'      // le ballon est dans tes mains
  | 'reception'   // il arrive sur toi (passe, chandelle, ou tu es le suivant)
  | 'libre'       // il traîne au sol et tu es le plus proche
  | 'defense'     // le porteur adverse arrive dans ta zone
  | 'ruck'        // un regroupement se forme à ta portée
  // ⚠️ LE MOMENT QUI RÉCOMPENSE UN DUEL GAGNÉ. Retour de jeu : « nos actions
  // n'ont aucun impact ». Une percée rendait la main au rugby automatique ;
  // maintenant elle ouvre une échappée, et l'échappée a sa propre question :
  // plonger, chiper par-dessus le dernier défenseur, ou servir le soutien.
  | 'espace';      // tu es passé, la ligne est devant toi

export interface Moment {
  type: TypeMoment;
  /** Clé i18n de la bannière affichée en haut du terrain. */
  cle: string;
  emoji: string;
}

const BANNIERES: Record<TypeMoment, { cle: string; emoji: string }> = {
  ballon: { cle: 'ml.moment.ballon', emoji: '🏉' },
  reception: { cle: 'ml.moment.reception', emoji: '🙌' },
  libre: { cle: 'ml.moment.libre', emoji: '⚡' },
  defense: { cle: 'ml.moment.defense', emoji: '🛡️' },
  ruck: { cle: 'ml.moment.ruck', emoji: '🔒' },
  espace: { cle: 'ml.moment.espace', emoji: '💨' },
};

// ⚠️ LES DISTANCES SONT DES SECONDES DÉGUISÉES. Un trois-quarts court à 8 m/s :
// quatorze mètres, c'est près de deux secondes de préavis — le temps de voir
// arriver, de choisir, et d'appuyer.
//
// ⚠️ ET ELLES ONT ÉTÉ RESSERRÉES APRÈS MESURE (`scripts/verifMatchJouable.ts`).
// À vingt-et-un mètres, un ouvreur placé dans sa ligne défensive était « en
// moment » quasiment tout le temps que l'adversaire avait le ballon : le banc
// d'essai a relevé **47 % du match joué au ralenti**, soit vingt minutes de
// manette pour un match. Le ralenti permanent n'est pas du ralenti, c'est juste
// un jeu lent — et l'accélération entre les moments ne servait plus à rien.
const PORTEE_DEFENSE = 14;
const PORTEE_RUCK = 9;
const PORTEE_LIBRE = 12;

/** Les phases pendant lesquelles il y a quelque chose à jouer. */
function ballonVivant(e: EtatMatch): boolean {
  return e.phase === 'jeuCourant' || e.phase === 'ruck' || e.phase === 'maul'
    || e.phase === 'ballonEnLAir';
}

/**
 * Suis-je le joueur de mon camp le plus proche de ce point ?
 *
 * ⚠️ C'EST LA CONDITION QUI DIT « C'EST POUR TOI ». Sans elle, « à quatorze
 * mètres du ballon » décrit la moitié d'une ligne défensive : le banc d'essai
 * relevait 37 % du match au ralenti, c'est-à-dire un jeu simplement lent. Un
 * plaquage, un grattage, un ballon qui traîne : à chaque fois, c'est le joueur
 * le plus proche qui doit y aller, et lui seul.
 */
function leMieuxPlace(e: EtatMatch, p: Pion, cible: { x: number; y: number }): boolean {
  const mien = distance2(p.pos, cible);
  for (const q of e.pions) {
    if (q === p || q.cote !== p.cote) continue;
    if (!q.surLeTerrain || q.sanction > 0) continue;
    if (distance2(q.pos, cible) < mien) return false;
  }
  return true;
}

/**
 * Est-ce le moment du joueur ? Et si oui, lequel.
 *
 * L'ordre des tests est l'ordre d'importance : avoir le ballon prime sur tout,
 * puis le recevoir, puis défendre. Deux situations peuvent être vraies en même
 * temps (on défend ET un ruck se forme) — on annonce la plus engageante.
 */
export function momentDuJoueur(e: EtatMatch, p: Pion | undefined): Moment | null {
  if (!p || e.fini || e.bagarre) return null;
  if (!p.surLeTerrain || p.sanction > 0) return null;
  if (!ballonVivant(e)) return null;

  const type = lireMoment(e, p);
  if (!type) return null;
  return { type, ...BANNIERES[type] };
}

function lireMoment(e: EtatMatch, p: Pion): TypeMoment | null {
  // ⚠️ AVANT « LE BALLON EST À TOI », et c’est tout l’enjeu : pendant une
  // échappée on EST le porteur. Posé après, ce test n’était jamais atteint —
  // mesuré, zéro carte de l’espace sur vingt matchs. Le moment le plus
  // spécifique se lit toujours en premier.
  if (e.echappee?.pion === p && e.porteur === p) return 'espace';
  if (e.porteur === p) return 'ballon';

  // Le ballon est en l'air ET il t'est destiné : c'est déjà ton moment, il
  // faut être placé avant qu'il ne tombe.
  if (e.vol && e.vol.receveur === p) return 'reception';

  // Tu es LE PROCHAIN de la combinaison en cours : la passe arrive dans une
  // seconde, on te laisse le temps de te démarquer. ⚠️ Le prochain seulement,
  // pas les deux suivants : sur une envolée de trois-quarts, prévenir trois
  // maillots à l'avance mettait la moitié de la ligne « en moment » à chaque
  // temps de jeu.
  const l = e.lancement;
  if (l && e.possession === p.cote && l.chaine[l.index + 1] === p) return 'reception';

  // Ballon au sol sans personne dessus : le premier arrivé le ramasse.
  if (!e.porteur && !e.vol && distance2(p.pos, e.ballon) < PORTEE_LIBRE * PORTEE_LIBRE) {
    const plusProche = e.pions.reduce<Pion | null>((meilleur, q) => {
      if (!q.surLeTerrain || q.sanction > 0) return meilleur;
      if (!meilleur) return q;
      return distance2(q.pos, e.ballon) < distance2(meilleur.pos, e.ballon) ? q : meilleur;
    }, null);
    if (plusProche === p) return 'libre';
  }

  // ⚠️ LE 9 À LA SORTIE DE SON PROPRE RUCK — un moment qui N’EXISTAIT PAS.
  // Tout ce qui suit était gardé derrière « je défends » : le demi de mêlée
  // qui protège son propre regroupement, ballon à ses pieds, n’avait donc
  // aucun moment, aucune carte, aucun geste. C’est pourtant LA situation la
  // plus caractéristique de son poste — et la demande le disait mot pour mot :
  // « une 9 de faire une chenille, chandelle pour dégager ».
  //
  // ⚠️ RÉSERVÉ AU NUMÉRO 9, et pas au « mieux placé » : au ruck, le mieux
  // placé de son camp est presque toujours un avant qui pousse. Le ballon à la
  // sortie appartient au demi de mêlée, personne d’autre ne se met là.
  if ((e.phase === 'ruck' || e.phase === 'maul') && e.possession === p.cote
    && p.numero === 9 && distance2(p.pos, e.ballon) < PORTEE_RUCK * PORTEE_RUCK) {
    return 'ruck';
  }

  const defend = e.possession !== p.cote;
  if (!defend) return null;

  // Un regroupement à ta portée, et c'est TOI le plus près : on peut gratter,
  // nettoyer, ou défendre le ras.
  if ((e.phase === 'ruck' || e.phase === 'maul')
    && distance2(p.pos, e.ballon) < PORTEE_RUCK * PORTEE_RUCK
    && leMieuxPlace(e, p, e.ballon)) {
    return 'ruck';
  }

  // ⚠️ UNE PASSE EN L’AIR POUR EUX, À TA PORTÉE — le moment de l’interception,
  // et il N’EXISTAIT PAS. Mesuré sur vingt matchs joués carte par carte :
  // **zéro interception proposée**. La raison est mécanique — pendant un vol
  // il n’y a pas de porteur, donc pas de moment `defense`, donc pas de carte.
  // Le geste était dans le type, dans la liste, dans le moteur, et
  // inatteignable. Exactement le sort des deux effets de traits restés sans
  // lecteur pendant des mois.
  if (e.vol?.receveur && e.vol.receveur.cote !== p.cote
    && distance2(p.pos, e.vol.receveur.pos) < PORTEE_DEFENSE * PORTEE_DEFENSE
    && leMieuxPlace(e, p, e.vol.receveur.pos)) return 'defense';

  // En défense, le porteur entre dans ta zone, IL VIENT VERS TOI, et c'est toi
  // le mieux placé pour l'arrêter.
  //
  // ⚠️ « À PORTÉE » NE SUFFIT PAS, et ces deux conditions sont ce qui a rendu
  // le mode jouable. Un défenseur placé dans sa ligne est presque toujours à
  // quinze mètres du ballon : sans elles, le jeu ralentissait dès que
  // l'adversaire avait la balle — y compris pendant qu'elle s'éloignait à
  // l'autre bout de la ligne — et le banc d'essai relevait 37 % du match au
  // ralenti. Ce n'est plus du ralenti, c'est un jeu lent.
  if (e.porteur && distance2(p.pos, e.porteur.pos) < PORTEE_DEFENSE * PORTEE_DEFENSE) {
    const versMoi = { x: p.pos.x - e.porteur.pos.x, y: p.pos.y - e.porteur.pos.y };
    const approche = e.porteur.vitesse.x * versMoi.x + e.porteur.vitesse.y * versMoi.y;
    if (approche > 0 && leMieuxPlace(e, p, e.porteur.pos)) return 'defense';
  }

  return null;
}

// ---------------------------------------------------------------------------
// LE TEMPO
// ---------------------------------------------------------------------------

/**
 * La vitesse à laquelle le match se joue.
 *
 * ⚠️ UN TEMPO N'EST PAS UN AUTRE MOTEUR : c'est le nombre de pas de simulation
 * que l'écran fait avancer par seconde réelle (`allureDuTempo`). Le moteur joue
 * à pas fixe (`DT`) et ne sait pas à quelle vitesse on le regarde : passer de
 * ×10 à ×1 en plein jeu ne remet rien à zéro et ne change rien au résultat — il
 * y a seulement plus ou moins de pas par image. Le banc `verify:vitesse-match`
 * rejoue un match avec une vitesse tirée au hasard à chaque image et exige le
 * même score, les mêmes statistiques et le même chronomètre qu'à ×1.
 *
 * ⚠️ ON NE LES NOMME PLUS « ÉCOULEMENT / FIN ». Le libellé d'avant (« Accéléré »,
 * « Fin », sans chiffre) ne disait pas ce qu'il faisait : on ne savait pas qu'il
 * existait un ×4, et sur téléphone il ne restait qu'une icône. Chaque bouton
 * porte maintenant sa vitesse écrite.
 *
 *  - `decisions` : le mode « cartes » — ×1, le match se fige sur chaque carrefour ;
 *  - `x1`, `x2`, `x3` et `x10` : on regarde, sans carte, à cette vitesse.
 */
export type Tempo = 'decisions' | 'x1' | 'x2' | 'x3' | 'x10';

export interface DefinitionTempo {
  id: Tempo;
  cle: string;
  aide: string;
  /** Secondes simulées par seconde réelle. */
  allure: number;
}

export const TEMPOS: DefinitionTempo[] = [
  // Le mode de ceux qui jouent : le match file, se FIGE sur une carte de décision
  // (voir `decisions.ts`), puis joue la suite. Toujours à vitesse réelle : une
  // carte qui tomberait à ×10 se lirait en trois dixièmes de seconde.
  { id: 'decisions', cle: 'ml.tempo.decisions', aide: 'ml.tempo.decisions.aide', allure: 1 },
  // Le match qu'on regarde : environ quinze minutes d'écran.
  { id: 'x1', cle: 'ml.tempo.x1', aide: 'ml.tempo.x1.aide', allure: 1 },
  { id: 'x2', cle: 'ml.tempo.x2', aide: 'ml.tempo.x2.aide', allure: 2 },
  { id: 'x3', cle: 'ml.tempo.x3', aide: 'ml.tempo.x3.aide', allure: 3 },
  // ⚠️ ×10 REMPLACE ×4 (demande : « une accélération ×10 à la place du ×4 »). Un match entier tient en moins de
  // deux minutes ; les gestes ne se lisent plus, c'est fait pour avancer, pas pour regarder. Chaque pas du moteur
  // reste joué (rien n'est sauté : essais, cartons, TMO, tirs au but) — seul le nombre de pas par image change.
  { id: 'x10', cle: 'ml.tempo.x10', aide: 'ml.tempo.x10.aide', allure: 10 },
];

export const TEMPO_PAR_ID = new Map(TEMPOS.map((t) => [t.id, t]));

/**
 * Le nombre de secondes de match à faire avancer par seconde réelle.
 *
 * ⚠️ UNE SEULE FONCTION POUR LA BOUCLE, LA PRÉSENTATION ET LE BANC. L'écran
 * lisait avant `tempo === 'accelere' ? 2 : tempo === 'fin' ? 4 : 1` en plusieurs
 * endroits, et un tableau `TEMPOS` portait d'autres valeurs (jusqu'à ×600) que
 * personne ne lisait plus : deux vérités pour la même vitesse.
 */
export function allureDuTempo(tempo: Tempo): number {
  return TEMPO_PAR_ID.get(tempo)?.allure ?? 1;
}

/** Le jeu est-il accéléré ? Une présentation, une carte ou une entrée en jeu ne se jouent pas ainsi. */
export function estAccelere(tempo: Tempo): boolean {
  return allureDuTempo(tempo) > 1;
}

/**
 * Pas plus d'une seconde de match par image : à très basse cadence, ×10 ralentit au lieu de téléporter les joueurs
 * (la scène n'interpole qu'un pas de 1,2 s). Mesuré : à 5 images par seconde, ×10 fait 0,2 s × 10 = 2 s de match par
 * image sans ce plafond.
 */
export const PAS_MAXIMAL_PAR_IMAGE = 1;

/** Ce que l'écran fait avancer le moteur pour une image de `dtReel` secondes réelles. */
export function secondesAAvancer(dtReel: number, allure: number): number {
  return Math.min(PAS_MAXIMAL_PAR_IMAGE, Math.max(0, dtReel) * allure);
}

/**
 * Le tempo à rendre quand on reprend la main sur son joueur.
 *
 * ⚠️ ON NE CONDUIT PAS À ×10. Un tempo accéléré retombe à vitesse réelle ; les
 * autres sont conservés (le mode « cartes » reste le mode « cartes »).
 */
export function tempoALaPriseDeMain(tempo: Tempo): Tempo {
  return estAccelere(tempo) ? 'decisions' : tempo;
}

/**
 * ⚠️ LE RALENTI NE S'ÉTEINT PAS AVEC LE MOMENT. Une passe reçue et donnée en
 * une seconde ferait clignoter la vitesse trois fois par phase — et le joueur
 * n'aurait jamais le temps de voir le résultat de son geste. Le mode ralenti
 * TIENT encore `TENUE` secondes après la fin du moment : c'est ce qui donne au
 * ralenti une durée de plan de télévision plutôt qu'un hoquet.
 */
export const TENUE = 1.2;
