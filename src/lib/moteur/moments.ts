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

import type { EtatMatch } from './etat';
import type { Pion } from './entites';
import { distance2 } from './terrain';

/** Pourquoi le jeu vient de ralentir. */
export type TypeMoment =
  | 'ballon'      // le ballon est dans tes mains
  | 'reception'   // il arrive sur toi (passe, chandelle, ou tu es le suivant)
  | 'libre'       // il traîne au sol et tu es le plus proche
  | 'defense'     // le porteur adverse arrive dans ta zone
  | 'ruck';       // un regroupement se forme à ta portée

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

  const defend = e.possession !== p.cote;
  if (!defend) return null;

  // Un regroupement à ta portée, et c'est TOI le plus près : on peut gratter,
  // nettoyer, ou défendre le ras.
  if ((e.phase === 'ruck' || e.phase === 'maul')
    && distance2(p.pos, e.ballon) < PORTEE_RUCK * PORTEE_RUCK
    && leMieuxPlace(e, p, e.ballon)) {
    return 'ruck';
  }

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
 * ⚠️ ON NE LES NOMME PLUS « ×1 / ×2 / ×4 ». L'ancienne barre appelait « ×1 »
 * une simulation à cinq fois la vitesse réelle : le libellé mentait, et c'est
 * lui qui faisait croire que le pilotage était cassé alors qu'il était
 * seulement cinq fois trop rapide. Chaque tempo dit maintenant ce qu'il FAIT.
 */
export type Tempo = 'moments' | 'suivre' | 'accelere' | 'fin';

export interface DefinitionTempo {
  id: Tempo;
  emoji: string;
  cle: string;
  aide: string;
  /** Secondes simulées par seconde réelle quand c'est ton moment. */
  moment: number;
  /** … et quand il ne se passe rien pour toi. */
  hors: number;
}

export const TEMPOS: DefinitionTempo[] = [
  // ⚠️ LE TEMPO PAR DÉFAUT DÈS QU'ON PILOTE. Temps réel sur tes moments —
  // c'est-à-dire exactement quand tu as une décision à prendre — et neuf fois
  // la vitesse réelle le reste du temps, ce qui ramène un match complet à cinq
  // ou six minutes de manette sans jamais rien te faire manquer.
  { id: 'moments', emoji: '🎯', cle: 'ml.tempo.moments', aide: 'ml.tempo.moments.aide', moment: 1, hors: 9 },
  // Le match qu'on regarde : assez vif pour tenir en sept minutes, assez lent
  // pour lire les courses. C'est l'ancien « ×1 ».
  { id: 'suivre', emoji: '👁️', cle: 'ml.tempo.suivre', aide: 'ml.tempo.suivre.aide', moment: 5, hors: 5 },
  { id: 'accelere', emoji: '⏩', cle: 'ml.tempo.accelere', aide: 'ml.tempo.accelere.aide', moment: 18, hors: 18 },
  { id: 'fin', emoji: '⏭️', cle: 'ml.tempo.fin', aide: 'ml.tempo.fin.aide', moment: 600, hors: 600 },
];

export const TEMPO_PAR_ID = new Map(TEMPOS.map((t) => [t.id, t]));

/**
 * Le facteur de vitesse à appliquer maintenant.
 *
 * ⚠️ LE RALENTI NE S'ÉTEINT PAS AVEC LE MOMENT. Une passe reçue et donnée en
 * une seconde ferait clignoter la vitesse trois fois par phase — et le joueur
 * n'aurait jamais le temps de voir le résultat de son geste. Le mode ralenti
 * TIENT encore `TENUE` secondes après la fin du moment : c'est ce qui donne au
 * ralenti une durée de plan de télévision plutôt qu'un hoquet.
 */
export const TENUE = 1.2;

export function facteurTempo(tempo: Tempo, enMoment: boolean): number {
  const def = TEMPO_PAR_ID.get(tempo) ?? TEMPOS[0];
  return enMoment ? def.moment : def.hors;
}
