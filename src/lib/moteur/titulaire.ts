// TITULAIRE OU REMPLAÇANT ?
//
// ⚠️ Cette fonction vit SEULE, dans son propre fichier, et ce n'est pas un
// caprice de rangement : elle est appelée par le store à chaque semaine jouée.
// Tant qu'elle habitait `moteur/saison.ts`, l'importer tirait tout le moteur de
// match (3 500 lignes : la boucle, la tactique, les phases arrêtées, les pools
// de commentaire) dans le chunk PRINCIPAL de l'application — téléchargé avant
// le premier pixel, alors que le moteur ne sert qu'au moment où l'on joue un
// match. Isolée ici, elle ne dépend que de la graine.
//
// Elle est partagée par le direct (`MatchLive`) et par la simulation de fond
// (`moteur/saison.ts`) : si les deux tiraient chacun de leur côté, le match
// qu'on regarde et celui rejoué en fond ne donneraient pas la même feuille.

import { graine } from '../championnat';
import type { Joueur } from '../../types';

// La confiance du staff et le niveau décident, de façon déterministe.
export function estTitulaire(j: Joueur, cle: string): boolean {
  const valeurs = Object.values(j.attributs ?? {});
  const general = valeurs.length ? valeurs.reduce((a, b) => a + b, 0) / valeurs.length : 45;
  const chance = 0.18 + (j.confianceCoach ?? 50) / 190 + (general - 45) / 120;
  return graine('titu#' + cle + j.nom)() < Math.max(0.08, Math.min(0.95, chance));
}
