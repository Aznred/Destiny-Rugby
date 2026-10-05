// L'ARBITRE A UNE MÉMOIRE.
//
// Le carton n'était tiré que sur quatre motifs — coup de poing, cathédrale,
// plaquage haut, faute « volontaire » près de la ligne — et jamais sur ce qui
// en produit le plus dans un vrai match : la RÉPÉTITION. Une équipe pouvait
// concéder six pénalités de suite sur sa ligne sans que rien ne se passe.
//
// L'arbitre note donc chaque pénalité : quand, où, et de quelle famille. Trois
// fautes dans la même zone ou de la même famille, et il appelle le capitaine ;
// la suivante vaut dix minutes. Et une faute qui empêche l'attaque de conclure
// à quelques mètres de la ligne est jugée pour ce qu'elle est.
//
// ⚠️ LES FENÊTRES SONT EN MINUTES D'HORLOGE, pas en secondes d'écran : la même
// règle vaut pour un match de quatre-vingts minutes et pour un match condensé.

import type { ArdoiseArbitre, EtatMatch, FamilleFaute } from '../etat.js';
import { ligneDefendue, type Cote, type Vec } from '../terrain.js';
import { condense } from './lecture.js';
import { REGLAGES_IA } from './reglages.js';

export function familleDeFaute(motif: string): FamilleFaute {
  const m = motif.toLowerCase();
  if (m.includes('coup de p') || m.includes('brutalité') || m.includes('bousculade') || m.includes('geste dangereux')) return 'brutalite';
  if (m.includes('plaquage') || m.includes('croche')) return 'plaquage';
  if (m.includes('hors-jeu')) return 'horsJeu';
  if (m.includes('maul')) return 'maul';
  if (m.includes('mêlée')) return 'melee';
  if (m.includes('volontaire') || m.includes('antijeu') || m.includes('obstruction')) return 'antijeu';
  if (m.includes('ruck') || m.includes('ballon gardé') || m.includes('relève') || m.includes('roule') || m.includes('mains') || m.includes('sol')) return 'ruck';
  return 'divers';
}

function ardoise(e: EtatMatch, cote: Cote): ArdoiseArbitre {
  e.arbitrage ??= { A: { fautes: [], cartonsRepetes: 0 }, B: { fautes: [], cartonsRepetes: 0 } };
  return e.arbitrage[cote];
}

export interface JugementFaute {
  /** L'arbitre appelle le capitaine : la prochaine faute de l'équipe vaudra carton. */
  avertissement: boolean;
  /** Cette faute tombe après l'avertissement : carton jaune pour fautes répétées. */
  cartonRepete: boolean;
  /** Mètres entre la faute et la ligne du camp fautif. */
  deSaLigne: number;
  famille: FamilleFaute;
  /** Pénalités concédées par ce camp dans le dernier quart d'heure, celle-ci comprise. */
  recentes: number;
}

const QUART_D_HEURE = 15 * 60;

/**
 * Inscrit la faute sur l'ardoise du camp sanctionné et dit ce que l'arbitre
 * en fait : rien de plus, un avertissement, ou le carton promis.
 */
export function noterFaute(e: EtatMatch, fautif: Cote, lieu: Vec, motif: string): JugementFaute {
  const a = ardoise(e, fautif);
  const famille = familleDeFaute(motif);
  const deSaLigne = Math.abs(lieu.x - ligneDefendue(fautif));
  a.fautes = a.fautes.filter((f) => e.t - f.t < 25 * 60);
  a.fautes.push({ t: e.t, deSaLigne, famille });
  const recentes = a.fautes.filter((f) => e.t - f.t < QUART_D_HEURE);
  const dansSaZone = recentes.filter((f) => f.deSaLigne < 30).length;
  const memeFamille = recentes.filter((f) => f.famille === famille).length;
  // Une brutalité se juge seule : elle ne compte pas dans la série.
  if (famille === 'brutalite') return { avertissement: false, cartonRepete: false, deSaLigne, famille, recentes: recentes.length };

  const averti = a.avertiA !== undefined && e.t - a.avertiA < QUART_D_HEURE;
  if (averti && (deSaLigne < 45 || memeFamille >= 2)) {
    // Le carton purge l'avertissement : la série repart de zéro, à quatorze.
    a.avertiA = undefined;
    a.cartonsRepetes += 1;
    a.fautes = a.fautes.filter((f) => e.t - f.t < 60);
    return { avertissement: false, cartonRepete: true, deSaLigne, famille, recentes: recentes.length };
  }
  // Un match condensé compte quatre fois moins de fautes : la série y est plus courte.
  const seuil = condense(e) ? REGLAGES_IA.serieCondense : REGLAGES_IA.serieTempsReel;
  const serie = dansSaZone >= seuil || memeFamille >= seuil || recentes.length >= seuil + 2;
  if (serie && !averti) {
    a.avertiA = e.t;
    return { avertissement: true, cartonRepete: false, deSaLigne, famille, recentes: recentes.length };
  }
  return { avertissement: false, cartonRepete: false, deSaLigne, famille, recentes: recentes.length };
}

/**
 * LA CHANCE D'UN CARTON POUR CETTE FAUTE, hors répétition. Trois degrés :
 * faute simple, jaune, rouge. Le rouge reste l'exception — un geste violent ou
 * un contact dangereux à la tête.
 *
 * @returns `jaune` : chance qu'un carton sorte ; `rouge` : part de ces cartons
 *   qui sont rouges.
 */
export function graviteDeLaFaute(e: EtatMatch, motif: string, j: JugementFaute): { jaune: number; rouge: number } {
  const m = motif.toLowerCase();
  // En temps réel les fautes sont quatre fois plus nombreuses : chacune pèse moins lourd.
  const severite = (e.niveau === 'amateur' ? 1.5 : 1) * (condense(e) ? 1 : REGLAGES_IA.cartonsReel);
  // Devant sa ligne, empêcher l'attaque de jouer est une faute cynique.
  const surSaLigne = j.deSaLigne < 12 ? 1 : j.deSaLigne < 24 ? 0.45 : 0;
  if (m.includes('coup de poing') || m.includes('brutalité')) return { jaune: 1, rouge: 0.45 };
  if (m.includes('coup de pied au sol')) return { jaune: 1, rouge: 0.4 };
  if (m.includes('cathédrale')) return { jaune: 0.85, rouge: 0.35 };
  if (m.includes('plaquage dangereux')) return { jaune: 0.75, rouge: 0.45 };
  if (m.includes('plaquage haut')) return { jaune: 0.3 * severite, rouge: 0.2 };
  if (m.includes('plaquage en retard')) return { jaune: 0.16 * severite, rouge: 0.03 };
  if (m.includes('sans ballon')) return { jaune: (0.14 + 0.4 * surSaLigne) * severite, rouge: 0 };
  if (m.includes('croche')) return { jaune: 0.3 * severite, rouge: 0.02 };
  if (m.includes('geste dangereux')) return { jaune: 0.4 * severite, rouge: 0.1 };
  if (m.includes('volontaire') || m.includes('antijeu')) return { jaune: (0.3 + 0.45 * surSaLigne) * severite, rouge: 0 };
  if (m.includes('maul écroulé')) return { jaune: (0.08 + 0.5 * surSaLigne) * severite, rouge: 0 };
  if (j.famille === 'horsJeu' || j.famille === 'ruck') return { jaune: 0.34 * surSaLigne * severite, rouge: 0 };
  if (j.famille === 'melee') return { jaune: 0.1 * surSaLigne * severite, rouge: 0 };
  return { jaune: 0, rouge: 0 };
}

/**
 * CE QU'UNE DÉFENSE EST TENTÉE DE FAIRE, de 0 (rien) à 1 (elle défend sa
 * ligne, débordée) : c'est ce qui fait naître les fautes là où elles
 * arrivent vraiment — au pied de ses poteaux, quand le ballon sort trop vite.
 */
export function tentation(e: EtatMatch, defenseur: Cote, lieu: Vec): number {
  const d = Math.abs(lieu.x - ligneDefendue(defenseur));
  const zone = d < 8 ? 1 : d < 15 ? 0.7 : d < 26 ? 0.35 : 0.1;
  const subit = Math.max(0, e.avantage ?? 0) * 0.12 + (e.ballonLent ? 0 : 0.12);
  return Math.min(1, zone + subit);
}

/**
 * Combien de fois plus souvent une faute « de situation » se produit dans un
 * match condensé. Voir `condense` : dix minutes d'écran contiennent quatre
 * fois moins de rucks qu'un vrai match ; sans cette échelle, une équipe
 * concède cinq pénalités par rencontre et l'arbitre n'a jamais de série à juger.
 */
export function echelleDesFautes(e: EtatMatch): number {
  return condense(e) ? REGLAGES_IA.fautesCondense : REGLAGES_IA.fautesTempsReel;
}
