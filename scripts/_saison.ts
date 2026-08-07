// AIDE PARTAGÉE DES SCRIPTS : jouer une saison de bout en bout.
//
// ⚠️ POURQUOI CE FICHIER EXISTE. Cinq scripts de mesure enchaînent des saisons
// (`verifDifficulte`, `verifHonneurs`, `verifTitres`, `verifClassement`,
// `verif`), et chacun recopiait le même motif : « appeler `saisonSuivante`,
// signer ce qui traîne, rappeler `saisonSuivante` si la saison n'a pas démarré ».
// Ce motif dépend directement du marché des transferts — quand celui-ci a changé
// de forme (panneau « Choix de carrière » → négociation sur L'Ovale), les cinq
// copies se sont cassées en même temps. Une seule définition, donc.
//
// ⚠️ ET CE N'EST PAS UN DÉTAIL DE TEST. `saisonSuivante` s'ARRÊTE quand le
// contrat est épuisé : un script qui ne signe pas compte des saisons qui n'ont
// jamais été jouées, et l'étalonnage de difficulté devient faux sans prévenir.

import type { useGame as Store } from '../src/store/useGame';

type Etat = ReturnType<(typeof Store)['getState']>;

/**
 * Joue UNE saison complète, en signant ce qu'il faut pour que la saison
 * démarre. Renvoie `false` si la carrière s'est arrêtée (retraite).
 *
 * @param g accesseur à l'état du store (`() => useGame.getState()`)
 */
export function jouerUneSaison(g: () => Etat, set: (p: Partial<Etat>) => void): boolean {
  const avant = g().joueur?.saison ?? 0;
  if (!avant) return false;

  /**
   * ⚠️ ON ACCEPTE LA MEILLEURE APPROCHE, PAS LA PREMIÈRE.
   *
   * Mesuré : prendre `approches[0]` faisait DESCENDRE les carrières (médiane
   * 49 → 34). La raison est mécanique — depuis que des clubs écrivent aussi EN
   * COURS DE SAISON, la plus ancienne approche ouverte est souvent celle d'un
   * club inférieur reçue à la 3ᵉ journée, alors que l'ancien panneau présentait
   * les offres de l'intersaison, triées. Un joueur réel compare avant de signer.
   *
   * ⚠️ ET ON NE FILTRE PAS SUR « ÇA MONTE ». Testé, et c'est une impasse :
   * `genererOffres` propose déjà des clubs à PORTÉE du joueur, souvent en
   * dessous de celui où il est bloqué. Exiger une montée revenait à ne jamais
   * signer — plus aucune carrière au-dessus de 40 sur 100. Descendre d'un étage
   * pour aller JOUER, c'est exactement ce qui relance une carrière.
   */
  const accepterCeQuiTraine = () => {
    const ouvertes = g().approches.filter((a) => a.etat === 'ouverte');
    if (!ouvertes.length) return;
    const meilleure = [...ouvertes].sort((a, b) => b.noteClub - a.noteClub)[0];
    g().accepterApproche(meilleure.id);
  };

  g().saisonSuivante();
  accepterCeQuiTraine();
  // ⚠️ DEUX RELANCES POSSIBLES, et les deux sont nécessaires :
  //   · la première si la saison a refusé de démarrer (contrat épuisé) — on
  //     vient d'accepter, elle peut repartir ;
  //   · la seconde parce qu'accepter ne pose qu'un PRÉ-ACCORD : c'est la
  //     `saisonSuivante` suivante qui l'applique, puis rejoue la saison.
  for (let n = 0; n < 2; n++) {
    if (!g().joueur) return false;
    if ((g().joueur?.saison ?? 0) > avant) break;
    g().saisonSuivante();
    accepterCeQuiTraine();
  }
  set({ tropheesEnAttente: [] });
  return !!g().joueur;
}
