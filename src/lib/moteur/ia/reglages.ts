// LES RÉGLAGES DE L'IA PAR POSTE — tout ce qui s'étalonne au banc
// (`npm run mesure:rugby`) est ici, et nulle part ailleurs.
//
// ⚠️ AUCUN DE CES NOMBRES N'EST « LA CHANCE DE MARQUER ». Ils règlent des
// SITUATIONS : combien de temps un défenseur lié au regroupement manque à sa
// ligne, ce que vaut un porteur lancé face à un plaqueur à l'arrêt, à quel
// point un ballon bien soutenu sort vite. Les essais en sont la conséquence.
//
// ⚠️ ILS CHANGENT LA REJOUE DES MATCHS JOUÉS AVEC L'IA PAR POSTE. Toute
// retouche se mesure avant (`npm run mesure:rugby -- 72 carriere3d 2`) et
// après, et le relevé va dans CLAUDE.md.
//
// L'objet est mutable pour que le banc puisse essayer une valeur sans toucher
// au fichier (`--reglages='{"condense":1.5}'`). Le jeu, lui, ne le modifie jamais.

/**
 * Le niveau d'IA des matchs de carrière et de l'aperçu (voir `EtatMatch.ia`).
 * ⚠️ La ligue en ligne ne le reçoit pas : ses matchs se jouent en temps réel,
 * et l'IA par poste n'y est pas étalonnée (mesuré : 11,6 essais par match).
 * La remettre à 1 suffit à revenir au moteur d'origine.
 */
export const IA_MATCH_DE_CARRIERE = 4;

export const REGLAGES_IA = {
  // ── Le duel porteur / plaqueur (`avantageDuPorteur`) ──────────────────────
  /** Porteur lancé : jusqu'à tant de points de plaquage en moins. */
  lance: 0.09,
  /** Défenseur à l'arrêt ou qui recule devant un porteur lancé. */
  subit: 0.04,
  /** Plaquage pris de travers à pleine vitesse. */
  travers: 0.05,
  /** Trois-quarts dans l'espace face à un avant du cinq de devant. */
  duelVitesse: 0.10,
  /** Défenseur pas encore revenu de son regroupement. */
  enRetard: 0.08,
  /** Deux défenseurs sur le même homme : le plaquage tient. */
  aDeux: 0.05,
  /**
   * MATCH CONDENSÉ. Dans un match de dix minutes, les situations favorables au
   * porteur pèsent davantage : un quart des temps de jeu doit y produire une
   * feuille de match entière. Ce sont les situations — pas un tirage d'essai —
   * qui portent cet écart ; face à un rideau en place, rien ne change.
   */
  condense: 1.7,

  /** Distance (m) à laquelle le porteur d'une percée sert son soutien : le dernier défenseur est alors engagé. */
  fixation: 3.8,
  /** Jeu au pied d'occupation hors de ses 22, en match condensé : chaque ballon rendu y coûte quatre fois plus de temps de jeu. */
  occupationCondensee: 0.6,

  // ── La défense après un regroupement (`poserLesRetards`) ──────────────────
  /** Secondes pendant lesquelles un défenseur lié au ruck manque au rideau, ballon rapide. */
  retardRapide: 2,
  /** Idem, ballon lent : tout le monde est déjà debout. */
  retardLent: 0.4,
  /** Chance qu'un défenseur sorte seul de sa ligne sur une défense qui monte. */
  monteeSeul: 0.25,

  // ── Le regroupement ───────────────────────────────────────────────────────
  /** Ce que deux soutiens à l'épaule du porteur ajoutent à la vitesse du ballon ; un seul ; aucun. */
  soutienDeux: 4,
  soutienUn: 1,
  soutienAucun: -3,
  /** Part des ballons volés au sol qui reste quand deux soutiens protègent ; un seul ; aucun. */
  protectionDeux: 0.4,
  protectionUn: 0.75,
  protectionAucun: 1.3,

  /** Secondes d'horloge par seconde d'écran, ballon vivant, dans un match de dix minutes (8 dans le moteur d'origine). */
  horlogeCondensee: 8,

  // ── La fatigue et la discipline d'un match condensé ───────────────────────
  /** Dépense d'endurance ajoutée en match condensé, en multiples de la dépense normale. */
  fatigueCondensee: 1.8,
  /** Fautes de situation : combien de fois plus souvent en match condensé, et en temps réel. */
  fautesCondense: 3.2,
  fautesTempsReel: 0.35,
  /** Chance par plaquage lancé (plus de 8 m/s de fermeture) que l'épaule arrive à la tête, avant échelle. */
  contactDangereux: 0.009,
  /** Nombre de fautes dans la même zone (ou de la même famille) avant l'avertissement : condensé, temps réel. */
  serieCondense: 2,
  serieTempsReel: 5,

  // ── La lecture locale du porteur (IA 3 : `ia/vision.ts`) ──────────────────
  /** Secondes qu'un joueur sans vision met à lire le rideau après avoir reçu (un bon lecteur : presque rien). */
  tempsDeLecture: 0.5,
  /** Largeur (m) d'un intervalle qu'un lecteur parfait attaque ; un mauvais lecteur en demande trois de plus. */
  intervalleMin: 3.6,
  /** Ce que la percée doit valoir de plus que la passe prévue pour que le porteur abandonne le plan. */
  margeDuPlan: 1.2,
  /** Distance (m) à laquelle le porteur d'un surnombre donne, avant d'ajouter la vitesse de fermeture. */
  passeAuDernierMoment: 2.2,
  /** Secondes pendant lesquelles un défenseur fixé (ou dupé par une feinte) ne peut plus intervenir. */
  defenseurFixe: 0.7,
  /** Lecture qu'il faut pour voir le défenseur partir sur le soutien et tenter la feinte de passe. */
  lectureDeLaFeinte: 0.62,
  /** Chance de base qu'une feinte de passe dupe le défenseur, avant les statistiques des deux joueurs. */
  feinteReussie: 0.36,
  // Les mêmes, en temps réel (ligue, règles 4) : huit fois plus de ballons portés, donc une lecture plus exigeante.
  intervalleMinReel: 4.5,
  margeDuPlanReel: 2.2,
  defenseurFixeReel: 0.45,
  feinteReussieReel: 0.26,

  // ── Le match en temps réel (ligue en ligne, règles 3) ─────────────────────
  // Quatre-vingts minutes réelles contiennent 260 regroupements, contre 34
  // dans un match de dix minutes : les mêmes situations s'y présentent huit
  // fois plus souvent. Ce qu'elles valent y est donc ramené à sa mesure
  // (`npm run mesure:rugby -- 72 ligue 2`). Étalonné le 05/10/2026 : voir CLAUDE.md.
  /** Ce que valent les situations favorables au porteur (et la montée solitaire), en temps réel. */
  avantageReel: 0.3,
  /** Durée des retards après un regroupement, en temps réel. */
  retardReel: 0.3,
  /** Jeu au pied choisi hors de ses 22 (occupation, passe au pied, rasant, par-dessus), en temps réel. */
  piedReel: 0.5,
  /** Ce que le soutien à l'épaule ajoute à la vitesse du ballon de ruck, en temps réel. */
  soutienReel: 0.3,
  /** Part des ballons volés au sol, en temps réel : multiplie les trois `protection*`. */
  protectionReel: 1.4,
  /** Joueurs qui accompagnent une percée, en temps réel (trois dans un match condensé). */
  soutiensReel: 3,
  /** Chance qu'une faute (hors geste violent) vaille un carton, en temps réel. */
  cartonsReel: 0.35,
};

export type ReglagesIA = typeof REGLAGES_IA;
