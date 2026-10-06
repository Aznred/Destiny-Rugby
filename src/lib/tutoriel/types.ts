// LES TYPES DU TUTORIEL GUIDÉ (Correctif 18).
//
// Principe de la demande : « mettre en évidence → expliquer en une phrase → faire effectuer l'action → passer à la suivante ».
// Un PARCOURS est une suite d'ÉTAPES ; chaque étape désigne un élément RÉEL de l'écran par son ancre `data-tuto="…"`.
//
// ⚠️ UNE ÉTAPE NE CONNAÎT PAS LE COMPOSANT : seulement le nom d'une ancre. C'est ce qui permet de retoucher un écran sans casser
// son tutoriel, et de ne dépendre d'aucun import circulaire entre `screens/` et `lib/tutoriel/`.

import type { NomIcone } from '../../components/Icone';

/** Les mini-démonstrations animées (composants `AnimationTuto`). */
export type NomAnimation = 'clic' | 'glisse' | 'molette' | 'stick' | 'glisser' | 'retourne' | 'defile';

/**
 * - `carte`  : une carte au centre, sans élément visé (introductions, conclusions, choix).
 * - `info`   : l'élément est mis en évidence, le reste reste assombri ; « Suivant » ou « Passer ».
 * - `clic`   : l'élément est mis en évidence et le tutoriel ATTEND le clic — il n'y a pas de « Suivant ».
 * - `action` : le tutoriel attend qu'une condition (`jusqua`) soit vraie : placer un joueur, ouvrir un pack…
 */
export type TypeEtape = 'carte' | 'info' | 'clic' | 'action';

export type CoteBulle = 'haut' | 'bas' | 'gauche' | 'droite';

/** Une des grandes cartes d'un écran de choix (l'introduction générale). */
export interface ChoixTuto {
  id: string;
  icone: NomIcone;
  /** Clés de texte. */
  titre: string;
  texte: string;
  /** Ce qui se passe quand on la choisit. */
  choisir: () => void;
}

export interface EtapeTuto {
  /** Sert à construire les clés de texte : `tg.<parcours>.<id>.x` (texte) et `.t` (titre, facultatif). */
  id: string;
  type?: TypeEtape;
  /** Valeur de `data-tuto` de l'élément visé. Absent : carte centrée. */
  cible?: string;
  /** Le titre existe-t-il en clé de texte ? Sinon la bulle n'a que sa phrase. */
  titre?: boolean;
  icone?: NomIcone;
  /** La mini-démonstration — une fonction quand elle dépend de l'appareil (doigt au tactile, molette à la souris). */
  anim?: NomAnimation | (() => NomAnimation);
  /** Clé de texte complète à la place de `tg.<parcours>.<id>` : une même phrase servie par plusieurs parcours. */
  cle?: string;
  /** Côté préféré de la bulle (le placement l'ignore s'il masquerait la cible). */
  cote?: CoteBulle;
  /** Condition qui termine une étape `action` — relevée toutes les 200 ms. */
  jusqua?: () => boolean;
  /** Joué à l'entrée de l'étape : ouvrir un onglet, remonter le défilement… */
  avant?: () => void;
  /** Étape sans objet dans la situation courante : elle est franchie sans jamais s'afficher (pas de pack gratuit à ouvrir, pack déjà ouvert…). */
  ignorerSi?: () => boolean;
  /** Joué à la sortie de l'étape, quelle qu'en soit la raison (sauf abandon du parcours). */
  apres?: () => void;
  /** Attente maximale de l'élément visé avant de sauter l'étape (ms). Défaut 3500. */
  patience?: number;
  /** `true` : l'étape disparaît d'elle-même si sa cible reste introuvable. `false` : elle attend. Défaut `true`. */
  facultative?: boolean;
  /** Pour `carte` : les grandes cartes de choix. */
  choix?: ChoixTuto[];
  /** Clé de texte du bouton principal à la place de « Suivant » (dernière étape : « Terminer »). */
  bouton?: string;
  /** Clé de texte d'une consigne courte affichée sous la phrase pour une étape `clic` ou `action`. */
  consigne?: string;
  /** Lien vers l'étape déclenchée en retour arrière : par défaut l'étape précédente. */
  sansRetour?: boolean;
}

export type FamilleTuto = 'general' | 'league' | 'player' | 'coach' | 'contexte';

export interface ParcoursTuto {
  /** `league.intro` → drapeau `tutorial.league.intro`. */
  id: string;
  famille: FamilleTuto;
  /** Plus petit = passe avant dans la file. */
  priorite: number;
  /** Peut-il démarrer maintenant ? Relevé toutes les 400 ms tant que le parcours n'a pas été vu. */
  declencheur?: () => boolean;
  /**
   * Le parcours a-t-il toujours sa place à l'écran ? Faux : il s'interrompt (et compte comme vu — on ne rejoue pas
   * une section parce qu'on a changé d'onglet).
   */
  valide?: () => boolean;
  /** `true` : le match en cours s'arrête tant que ce parcours est affiché (on lit en paix pendant qu'une rencontre tourne derrière). */
  figeLeMatch?: boolean;
  /** `true` : pas de voile, une bulle posée en bas de l'écran, ne bloque rien (tutoriels contextuels en match). */
  souple?: boolean;
  etapes: EtapeTuto[];
  /** Joué quand le parcours se termine (fini ou passé). */
  fin?: () => void;
}
