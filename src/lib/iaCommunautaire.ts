// L'IA COMMUNAUTAIRE DANS LES CARRIÈRES SOLO (Correctif 41, points 22 à 30).
//
// Un club que personne n'entraîne reçoit, au coup d'envoi, un cahier tiré des combinaisons qui ont fait leurs preuves en
// match — pas des plus téléchargées. Son style de jeu et son niveau pèsent le tirage (`cahierCommunautaire`) ; le choix
// selon la situation et ce qui marche pendant le match restent le travail du moteur (cahier vivant).
//
// ⚠️ SANS MÉTA, RIEN NE CHANGE : pas de cahier, pas de cahier vivant — le match se joue exactement comme avant. La méta
// n'existe que lorsque des combinaisons publiées ont dépassé l'échantillon minimum.
// ⚠️ JAMAIS LE CAMP DU JOUEUR : celui qu'il conduit ou qu'il entraîne garde son jeu.

import type { Combinaison } from './ligue/combinaisons';
import { cahierCommunautaire, type MetaCombinaison } from './ligue/marcheCombinaisons';
import { metaCombinaisons } from './marcheCombinaisonsClient';
import { styleDuClub } from './moteur/moteur';
import type { EtatMatch } from './moteur/etat';
import type { Cote } from './moteur/terrain';

const moyenne = (notes: number[]) => (notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : 65);

/** Le cahier d'un club sans entraîneur : son style (tiré de son nom, comme en match), son niveau (son XV), sa saison. */
export function cahierDuClubIA(club: string, effectif: readonly { note: number }[], saison: string, meta: readonly MetaCombinaison[] = metaCombinaisons()): Combinaison[] {
  if (!meta.length) return [];
  return cahierCommunautaire(meta, { style: styleDuClub(club), niveau: Math.round(moyenne(effectif.slice(0, 15).map((j) => j.note))) }, `${club}#${saison}`);
}

/** Y a-t-il de quoi donner un cahier à un club ? C'est ce qui décide d'ouvrir le cahier vivant à la création du match. */
export function metaDisponible(): boolean { return metaCombinaisons().length > 0; }

/**
 * Pose les cahiers des camps sans entraîneur sur un match qui vient d'être créé (avec `cahierVivant`). `cotesHumains` :
 * les camps que le joueur conduit ou entraîne — ils ne reçoivent rien.
 */
export function equiperLesClubsIA(e: EtatMatch, effectifs: Record<Cote, readonly { note: number }[]>, saison: string, cotesHumains: readonly Cote[]): void {
  if (!e.cahierVivant) return;
  for (const cote of ['A', 'B'] as const) {
    if (cotesHumains.includes(cote)) continue;
    const cahier = cahierDuClubIA(cote === 'A' ? e.clubA : e.clubB, effectifs[cote], saison);
    if (cahier.length) (e.plansCombinaisons ??= {})[cote] = cahier;
  }
}
