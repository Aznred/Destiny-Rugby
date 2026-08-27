// ═══════════════════════════════════════════════════════════════════════════
// L'ENTRAÎNEMENT DE L'ÉQUIPE PRO — la semaine, l'intensité, la fatigue
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « quelque chose de plus poussé que pour les jeunes, mais sans tomber
// dans le micro-management chiant. Le cœur du système serait : planning
// hebdomadaire + intensité + priorités tactiques + programmes individuels +
// fatigue. »
//
// ⚠️ « SANS TOMBER DANS LE MICRO-MANAGEMENT CHIANT » EST UNE CONTRAINTE DE
// CONCEPTION, PAS UN VŒU. Quatorze cases à remplir chaque semaine, quarante-
// trois semaines par saison, c'est 602 décisions par an — personne ne joue à ça
// deux saisons de suite. Trois choses l'empêchent, et il faut les trois :
//
//   1. **la délégation** (`MODES_ENTRAINEMENT`) : le mode automatique est le
//      DÉFAUT, et il produit une semaine correcte. On ne touche au planning que
//      si on en a envie ;
//   2. **les priorités** du mode semi-automatique : cinq curseurs remplacent
//      quatorze cases et suffisent à orienter une saison ;
//   3. **la semaine type** : elle se reconduit tant qu'on ne la change pas.
//
// ⚠️ ET LE VRAI SUJET N'EST PAS DE FAIRE MONTER DUPONT DE 91 À 92. Demande
// explicite : « l'entraînement ne sert pas uniquement à faire passer Dupont de
// Passe 91 → 92. Il sert surtout à préparer ton équipe pour samedi. » La
// progression d'attributs est donc VOLONTAIREMENT LENTE ici ; ce qui se joue
// dans la semaine, c'est la préparation du match (`lib/analyseAdversaire.ts`)
// et les automatismes (`lib/cohesion.ts`).

import { graine } from './championnat';

// ---------------------------------------------------------------------------
// LES SÉANCES
// ---------------------------------------------------------------------------
// « Je n'en mettrais pas 50. Environ 15-20, regroupées en catégories. »

export type CategorieSeance = 'physique' | 'technique' | 'attaque' | 'defense' | 'conquete';

export type TypeSeance =
  | 'repos' | 'recuperation'
  | 'endurance' | 'force' | 'vitesse'
  | 'manipulation' | 'plaquage' | 'jeu_au_pied' | 'rucks'
  | 'attaque_generale' | 'jeu_rapide' | 'jeu_au_large' | 'pick_and_go' | 'contre_attaque'
  | 'defense_generale' | 'montee_rapide' | 'defense_rucks' | 'defense_large'
  | 'melee' | 'touche' | 'maul' | 'renvois'
  | 'mise_en_place';

/** Les secteurs d'automatismes — voir `lib/cohesion.ts`. */
export type SecteurCohesion = 'melee' | 'touche' | 'ligneArriere' | 'defense' | 'attaque';

export interface Seance {
  id: TypeSeance;
  categorie: CategorieSeance;
  emoji: string;
  /** Ce que la séance fait progresser, par point d'efficacité. */
  gains: Partial<Record<string, number>>;
  /** Les secteurs d'automatismes qu'elle soude. */
  secteurs: Partial<Record<SecteurCohesion, number>>;
  /** Coût en fatigue, à intensité normale. */
  fatigue: number;
  /** Risque de blessure ajouté, en points de pourcentage, à intensité normale. */
  risque: number;
  /**
   * ⚠️ QUI TRAVAILLE VRAIMENT. Une séance de mêlée ne fatigue pas un ailier et
   * ne lui apprend rien. Sans ce champ, tout l'effectif paierait le prix de
   * toutes les séances, et faire travailler la conquête abîmerait les
   * trois-quarts pour rien.
   */
  concerne: 'tous' | 'avants' | 'arrieres';
}

export const SEANCES: Seance[] = [
  // ── Récupération ─────────────────────────────────────────────────────────
  { id: 'repos', categorie: 'physique', emoji: '😴', gains: {}, secteurs: {}, fatigue: -14, risque: 0, concerne: 'tous' },
  { id: 'recuperation', categorie: 'physique', emoji: '🧊', gains: {}, secteurs: {}, fatigue: -9, risque: -2, concerne: 'tous' },
  // ── Physique ─────────────────────────────────────────────────────────────
  { id: 'endurance', categorie: 'physique', emoji: '🏃', gains: { endurance: 1 }, secteurs: {}, fatigue: 11, risque: 2, concerne: 'tous' },
  { id: 'force', categorie: 'physique', emoji: '🏋️', gains: { force: 1 }, secteurs: { melee: 0.4 }, fatigue: 12, risque: 3, concerne: 'tous' },
  { id: 'vitesse', categorie: 'physique', emoji: '⚡', gains: { vitesse: 1 }, secteurs: {}, fatigue: 10, risque: 4, concerne: 'tous' },
  // ── Technique ────────────────────────────────────────────────────────────
  { id: 'manipulation', categorie: 'technique', emoji: '🤲', gains: { passe: 1 }, secteurs: { attaque: 0.6 }, fatigue: 5, risque: 1, concerne: 'tous' },
  { id: 'plaquage', categorie: 'technique', emoji: '💥', gains: { plaquage: 1 }, secteurs: { defense: 0.7 }, fatigue: 9, risque: 4, concerne: 'tous' },
  { id: 'jeu_au_pied', categorie: 'technique', emoji: '🦶', gains: { jeuAuPied: 1 }, secteurs: {}, fatigue: 5, risque: 1, concerne: 'arrieres' },
  { id: 'rucks', categorie: 'technique', emoji: '🌀', gains: { force: 0.4, plaquage: 0.4 }, secteurs: { attaque: 0.5, defense: 0.5 }, fatigue: 10, risque: 3, concerne: 'tous' },
  // ── Attaque ──────────────────────────────────────────────────────────────
  { id: 'attaque_generale', categorie: 'attaque', emoji: '⚔️', gains: { vision: 0.6 }, secteurs: { attaque: 1.2 }, fatigue: 7, risque: 2, concerne: 'tous' },
  { id: 'jeu_rapide', categorie: 'attaque', emoji: '💨', gains: { vitesse: 0.3, vision: 0.4 }, secteurs: { attaque: 1, ligneArriere: 0.5 }, fatigue: 9, risque: 2, concerne: 'tous' },
  { id: 'jeu_au_large', categorie: 'attaque', emoji: '↔️', gains: { passe: 0.6, vision: 0.4 }, secteurs: { ligneArriere: 1.3 }, fatigue: 7, risque: 2, concerne: 'arrieres' },
  { id: 'pick_and_go', categorie: 'attaque', emoji: '🐂', gains: { force: 0.5 }, secteurs: { attaque: 0.7, melee: 0.3 }, fatigue: 10, risque: 3, concerne: 'avants' },
  { id: 'contre_attaque', categorie: 'attaque', emoji: '🔁', gains: { vision: 0.7 }, secteurs: { ligneArriere: 0.9, attaque: 0.4 }, fatigue: 7, risque: 2, concerne: 'arrieres' },
  // ── Défense ──────────────────────────────────────────────────────────────
  { id: 'defense_generale', categorie: 'defense', emoji: '🛡️', gains: { plaquage: 0.5 }, secteurs: { defense: 1.2 }, fatigue: 8, risque: 2, concerne: 'tous' },
  { id: 'montee_rapide', categorie: 'defense', emoji: '⬆️', gains: { vitesse: 0.3, mental: 0.3 }, secteurs: { defense: 1.1 }, fatigue: 10, risque: 3, concerne: 'tous' },
  { id: 'defense_rucks', categorie: 'defense', emoji: '🧱', gains: { force: 0.4 }, secteurs: { defense: 0.9, melee: 0.3 }, fatigue: 9, risque: 3, concerne: 'avants' },
  { id: 'defense_large', categorie: 'defense', emoji: '🕸️', gains: { vitesse: 0.3, vision: 0.3 }, secteurs: { defense: 0.9, ligneArriere: 0.6 }, fatigue: 8, risque: 2, concerne: 'arrieres' },
  // ── Conquête ─────────────────────────────────────────────────────────────
  { id: 'melee', categorie: 'conquete', emoji: '🐗', gains: { force: 0.9 }, secteurs: { melee: 1.6 }, fatigue: 13, risque: 4, concerne: 'avants' },
  { id: 'touche', categorie: 'conquete', emoji: '🙌', gains: { passe: 0.4 }, secteurs: { touche: 1.7 }, fatigue: 7, risque: 2, concerne: 'avants' },
  { id: 'maul', categorie: 'conquete', emoji: '🚂', gains: { force: 0.6 }, secteurs: { touche: 0.8, melee: 0.5 }, fatigue: 11, risque: 3, concerne: 'avants' },
  { id: 'renvois', categorie: 'conquete', emoji: '🎯', gains: { jeuAuPied: 0.4 }, secteurs: { ligneArriere: 0.6, attaque: 0.3 }, fatigue: 6, risque: 1, concerne: 'tous' },
  // ── La veille du match ───────────────────────────────────────────────────
  // ⚠️ ELLE NE FAIT PROGRESSER PERSONNE, et c'est exactement son rôle : c'est la
  // séance qui transforme le TRAVAIL de la semaine en préparation du match
  // (`lib/analyseAdversaire.ts`). Sans elle, un manager n'aurait aucune raison
  // de lever le pied le vendredi.
  { id: 'mise_en_place', categorie: 'attaque', emoji: '📋', gains: {}, secteurs: { attaque: 0.4, defense: 0.4 }, fatigue: 3, risque: 0, concerne: 'tous' },
];

export function seance(id: TypeSeance): Seance {
  return SEANCES.find((s) => s.id === id) ?? SEANCES[0];
}

// ---------------------------------------------------------------------------
// L'INTENSITÉ
// ---------------------------------------------------------------------------
// « Repos → Légère → Normale → Forte → Très forte. Plus tu pousses, plus tu
// progresses/prépares l'équipe, mais plus tu augmentes fatigue et blessures. »

export type Intensite = 0 | 1 | 2 | 3 | 4;

export const LIBELLE_INTENSITE = ['repos', 'legere', 'normale', 'forte', 'tresForte'] as const;

/**
 * ⚠️ LE GAIN EST CONCAVE, LA FATIGUE EST CONVEXE. C'est ce qui rend « très
 * forte » un vrai choix et non un réglage par défaut : on gagne 30 % de plus
 * qu'en normale, on paie 85 % de fatigue en plus et le double de risque. Deux
 * courbes linéaires auraient donné une seule stratégie — tout à fond, toujours.
 */
const GAIN_INTENSITE = [0, 0.55, 1, 1.3, 1.5];
const FATIGUE_INTENSITE = [0, 0.5, 1, 1.45, 1.85];
const RISQUE_INTENSITE = [0, 0.4, 1, 1.6, 2.4];

// ---------------------------------------------------------------------------
// LA SEMAINE
// ---------------------------------------------------------------------------

export type Jour = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';
export const JOURS: Jour[] = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export interface Creneau {
  seance: TypeSeance;
  intensite: Intensite;
}

/** Deux créneaux par jour : matin et après-midi. */
export type SemaineEntrainement = Record<Jour, [Creneau, Creneau]>;

export type ModeEntrainement = 'auto' | 'semi' | 'manuel';

export const MODES_ENTRAINEMENT: ModeEntrainement[] = ['auto', 'semi', 'manuel'];

/** Les cinq curseurs du mode semi-automatique, de 0 à 3 étoiles. */
export interface PrioritesEntrainement {
  physique: number;
  technique: number;
  attaque: number;
  defense: number;
  conquete: number;
}

export const PRIORITES_PAR_DEFAUT: PrioritesEntrainement = {
  physique: 2, technique: 2, attaque: 2, defense: 2, conquete: 2,
};

const REPOS: Creneau = { seance: 'repos', intensite: 0 };

/**
 * LA SEMAINE TYPE — celle du staff, exactement celle de la demande.
 *
 * ⚠️ ELLE EST CALÉE SUR UN MATCH LE SAMEDI, et elle décharge en fin de semaine :
 * lundi récupération, gros travail mardi-mercredi, tactique jeudi, mise en place
 * vendredi. C'est le rythme réel d'un club professionnel, et c'est aussi ce qui
 * fait qu'un joueur arrive frais — le banc d'essai vérifie qu'une semaine par
 * défaut ne détruit personne.
 */
export function semaineParDefaut(): SemaineEntrainement {
  return {
    lundi: [{ seance: 'recuperation', intensite: 1 }, REPOS],
    mardi: [{ seance: 'force', intensite: 3 }, { seance: 'defense_generale', intensite: 2 }],
    mercredi: [{ seance: 'manipulation', intensite: 2 }, { seance: 'attaque_generale', intensite: 3 }],
    jeudi: [{ seance: 'melee', intensite: 2 }, { seance: 'touche', intensite: 2 }],
    vendredi: [{ seance: 'mise_en_place', intensite: 1 }, REPOS],
    samedi: [REPOS, REPOS],
    dimanche: [REPOS, REPOS],
  };
}

const PAR_CATEGORIE: Record<CategorieSeance, TypeSeance[]> = {
  physique: ['force', 'endurance', 'vitesse'],
  technique: ['manipulation', 'plaquage', 'rucks', 'jeu_au_pied'],
  attaque: ['attaque_generale', 'jeu_au_large', 'jeu_rapide', 'contre_attaque', 'pick_and_go'],
  defense: ['defense_generale', 'montee_rapide', 'defense_large', 'defense_rucks'],
  conquete: ['melee', 'touche', 'maul', 'renvois'],
};

/**
 * LA SEMAINE QUE LE STAFF COMPOSE À PARTIR DE CINQ CURSEURS.
 *
 * ⚠️ C'EST LA FONCTION QUI REND LE LOT JOUABLE. Sans elle, le mode semi
 * automatique ne serait qu'un mot : cinq étoiles remplacent quatorze cases, et
 * un manager qui veut « juste gérer les transferts et les matchs » n'a jamais à
 * ouvrir le planning.
 *
 * ⚠️ ET LES DEUX BOUTS DE SEMAINE NE SONT PAS NÉGOCIABLES. Lundi reste de la
 * récupération, vendredi reste de la mise en place, samedi et dimanche restent
 * vides. Laisser les curseurs les remplir produirait une équipe rincée au coup
 * d'envoi — c'est-à-dire un mode automatique qui joue mal, donc inutilisable.
 */
export function composerSemaine(
  priorites: PrioritesEntrainement,
  cle: string,
): SemaineEntrainement {
  const rng = graine(`semaine#${cle}`);
  const sac: TypeSeance[] = [];
  for (const [cat, poids] of Object.entries(priorites) as [CategorieSeance, number][]) {
    const liste = PAR_CATEGORIE[cat];
    for (let i = 0; i < poids; i++) sac.push(liste[Math.floor(rng() * liste.length)]);
  }
  const tirer = (): Creneau => {
    if (!sac.length) return { seance: 'attaque_generale', intensite: 2 };
    const i = Math.floor(rng() * sac.length);
    const s = sac.splice(i, 1)[0];
    return { seance: s, intensite: 2 };
  };
  const semaine = semaineParDefaut();
  semaine.mardi = [{ ...tirer(), intensite: 3 }, tirer()];
  semaine.mercredi = [tirer(), { ...tirer(), intensite: 3 }];
  semaine.jeudi = [tirer(), tirer()];
  return semaine;
}

// ---------------------------------------------------------------------------
// L'EFFICACITÉ D'UNE SÉANCE
// ---------------------------------------------------------------------------
// Formule de la demande :
//   efficacite = qualiteCoach × qualiteInstallations × motivationJoueur
//                × conditionJoueur × intensite

export interface ContexteSeance {
  /** 0-100 : la note du staff sur cette catégorie. */
  coach: number;
  /** 0-100 : les installations du club. */
  installations: number;
  /** 0-100 : le moral du joueur. */
  motivation: number;
  /** 0-100 : sa condition physique du moment. */
  condition: number;
  /** 0-100 : sa charge cumulée sur la saison. */
  charge: number;
}

/**
 * ⚠️ UN JOUEUR ROUGE N'APPREND PLUS RIEN, et c'est la moitié de l'intérêt de la
 * fatigue. Demande : « Progression entraînement −30 % » sur une charge très
 * élevée. Sans ce terme, faire tourner l'effectif n'aurait qu'un intérêt
 * médical ; avec lui, un international cramé ne progresse plus, ce qui est une
 * raison SPORTIVE de le laisser souffler.
 */
export function efficacite(c: ContexteSeance, intensite: Intensite): number {
  const fCoach = 0.45 + c.coach / 90;
  const fInstall = 0.70 + c.installations / 200;
  const fMotivation = 0.72 + c.motivation / 280;
  const fCondition = 0.55 + c.condition / 165;
  const fCharge = 1 - Math.max(0, c.charge - 55) / 150;
  return GAIN_INTENSITE[intensite] * fCoach * fInstall * fMotivation * fCondition * fCharge;
}

/**
 * ⚠️ LA RÉCUPÉRATION EST PROPORTIONNELLE À CE QU'ON A À RÉCUPÉRER, et c'est ce
 * qui donne à la fatigue un point d'équilibre au lieu d'un plancher.
 *
 * La première version rendait un forfait : cinq créneaux de repos effaçaient
 * 79 points de fatigue par semaine, soit plus que tout le travail possible.
 * Mesuré, un titulaire finissait la saison à **20 de fatigue** quelle que soit
 * l'intensité — la fatigue existait dans le code et nulle part dans le jeu.
 *
 * Avec une récupération proportionnelle, une semaine normale se stabilise vers
 * 65-70 et une semaine très dure sature : le manager sent la différence sans
 * qu'aucun seuil arbitraire n'ait été posé.
 */
export function coutEnFatigue(s: Seance, intensite: Intensite, fatigue: number): number {
  if (s.fatigue >= 0) return s.fatigue * FATIGUE_INTENSITE[intensite];
  return s.fatigue * (0.55 + fatigue / 150);
}

export function risqueDeBlessure(s: Seance, intensite: Intensite, fatigue: number): number {
  const brut = s.risque * (s.risque >= 0 ? RISQUE_INTENSITE[intensite] : 1);
  // Un joueur fatigué se blesse beaucoup plus : c'est le vrai coût d'une
  // semaine trop dure, et il ne se voit qu'à retardement.
  return brut * (0.8 + fatigue / 90);
}

// ---------------------------------------------------------------------------
// LA FATIGUE, LA CONDITION, LA FORME
// ---------------------------------------------------------------------------
// « Je séparerais absolument niveau, condition et forme. Un joueur peut être :
//   Niveau 84 · Condition 97 % · Forme 62/100 🔴. Il est physiquement prêt mais
//   joue mal actuellement. »
//
// ⚠️ CE SONT TROIS CHOSES DIFFÉRENTES, et les confondre est le défaut le plus
// courant des jeux de gestion :
//
//   · le NIVEAU est ce que le joueur sait faire — il bouge sur des saisons ;
//   · la CONDITION est son état physique — elle se construit à l'entraînement
//     et se détruit par la fatigue ;
//   · la FORME est le moment qu'il traverse — elle monte quand il joue bien et
//     s'effondre quand tout va mal, indépendamment des deux autres.
//
// C'est ce qui permet la question de la demande : « tu peux te demander si tu ne
// dois pas titulariser le joueur de 76 ».

export interface EtatPhysique {
  /** 0-100 : la fraîcheur du moment. */
  fatigue: number;
  /** 0-100 : la condition physique construite à l'entraînement. */
  condition: number;
  /** 0-100 : la charge cumulée sur la saison. */
  charge: number;
}

export const ETAT_NEUF: EtatPhysique = { fatigue: 12, condition: 82, charge: 8 };

/**
 * CE QU'UNE SEMAINE FAIT À UN JOUEUR.
 *
 * ⚠️ LA CHARGE NE SE VIDE PAS COMPLÈTEMENT, et c'est le point de la demande :
 * « la fatigue ne disparaît pas complètement chaque semaine ». Elle se dissipe
 * de 6 % par semaine ; un titulaire qui enchaîne trente matchs finit en rouge
 * quoi qu'on fasse, et il faut faire tourner. Une fatigue qui repart de zéro
 * chaque lundi rendrait la rotation d'effectif purement décorative.
 */
export function appliquerSemaine(
  etat: EtatPhysique,
  semaine: SemaineEntrainement,
  ctx: ContexteSeance,
  avant: 'avants' | 'arrieres',
  minutesJouees: number,
): { etat: EtatPhysique; gains: Record<string, number>; secteurs: Partial<Record<SecteurCohesion, number>>; risque: number } {
  const gains: Record<string, number> = {};
  const secteurs: Partial<Record<SecteurCohesion, number>> = {};
  let fatigue = etat.fatigue;
  let condition = etat.condition;
  let risque = 0;

  for (const jour of JOURS) {
    for (const creneau of semaine[jour]) {
      const s = seance(creneau.seance);
      if (s.concerne !== 'tous' && s.concerne !== avant) continue;
      const eff = efficacite({ ...ctx, condition, charge: etat.charge }, creneau.intensite);
      for (const [attr, v] of Object.entries(s.gains)) {
        gains[attr] = (gains[attr] ?? 0) + (v ?? 0) * eff * 0.055;
      }
      for (const [sec, v] of Object.entries(s.secteurs) as [SecteurCohesion, number][]) {
        secteurs[sec] = (secteurs[sec] ?? 0) + v * eff;
      }
      fatigue = Math.max(0, Math.min(100, fatigue + coutEnFatigue(s, creneau.intensite, fatigue)));
      risque += risqueDeBlessure(s, creneau.intensite, fatigue);
      // La condition monte avec le travail physique et redescend sans lui.
      if (s.categorie === 'physique' && s.fatigue > 0) {
        condition = Math.min(100, condition + 0.45 * GAIN_INTENSITE[creneau.intensite]);
      }
    }
  }
  condition = Math.max(30, condition - 0.5);

  // Le match, lui, coûte bien plus cher qu'une semaine d'entraînement.
  // ⚠️ LA CHARGE DOIT DISTINGUER UN TITULAIRE D'UN REMPLAÇANT, sinon « faire
  // tourner » ne veut rien dire. La première version convergeait vers 197 pour
  // un titulaire et 83 pour un remplaçant : les deux étaient bornés à 100, et
  // les deux profils affichaient « critique » au bout de vingt journées.
  //
  // Les coefficients ci-dessous sont calés pour que le point d'équilibre soit
  // ~87 à 78 minutes par week-end (critique), ~67 à 60 minutes (élevée) et
  // ~27 à 22 minutes (faible). C'est cet écart qui rend la rotation payante.
  const coutMatch = (minutesJouees / 80) * 26;
  fatigue = Math.min(100, fatigue + coutMatch);
  const charge = Math.max(0, Math.min(100, etat.charge * 0.89 + coutMatch * 0.36 + 0.4));

  return { etat: { fatigue: Math.round(fatigue), condition: Math.round(condition), charge: Math.round(charge) }, gains, secteurs, risque: Math.round(risque * 10) / 10 };
}

/**
 * CE QUE LA CHARGE CUMULÉE COÛTE SUR LE TERRAIN.
 *
 * Demande : « Vitesse −2 % · Endurance −4 % · Risque blessure +18 % ·
 * Progression entraînement −30 % ». On rend les trois premiers ; le quatrième
 * vit dans `efficacite`.
 */
export function penalitesDeCharge(charge: number): {
  vitesse: number; endurance: number; risque: number; libelle: string;
} {
  const excès = Math.max(0, charge - 55) / 45;
  return {
    vitesse: -Math.round(excès * 4 * 10) / 10,
    endurance: -Math.round(excès * 7 * 10) / 10,
    risque: Math.round(excès * 34),
    libelle: charge >= 82 ? 'critique' : charge >= 62 ? 'elevee' : charge >= 38 ? 'moderee' : 'faible',
  };
}

// ---------------------------------------------------------------------------
// LES PROGRAMMES INDIVIDUELS
// ---------------------------------------------------------------------------
// « À côté du planning collectif, chaque joueur possède un SEUL objectif
// individuel principal. »
//
// ⚠️ « UN SEUL », ET C'EST LA RÈGLE QUI ÉVITE LE TABLEUR. Autoriser trois
// objectifs par joueur sur un effectif de cinquante, c'est cent cinquante
// décisions ; un seul objectif, changeable quand on veut, tient sur une ligne
// par joueur et se lit d'un coup d'œil.

export type ObjectifIndividuel =
  | 'aucun' | 'force' | 'masse' | 'vitesse' | 'endurance'
  | 'passe' | 'plaquage' | 'jeu_au_pied' | 'ruck' | 'melee' | 'touche'
  | 'polyvalence' | 'nouveau_poste';

export const OBJECTIFS_INDIVIDUELS: {
  id: ObjectifIndividuel; attribut: string | null; fatigue: number;
}[] = [
  { id: 'aucun', attribut: null, fatigue: 0 },
  { id: 'force', attribut: 'force', fatigue: 4 },
  { id: 'masse', attribut: 'force', fatigue: 5 },
  { id: 'vitesse', attribut: 'vitesse', fatigue: 4 },
  { id: 'endurance', attribut: 'endurance', fatigue: 4 },
  { id: 'passe', attribut: 'passe', fatigue: 2 },
  { id: 'plaquage', attribut: 'plaquage', fatigue: 3 },
  { id: 'jeu_au_pied', attribut: 'jeuAuPied', fatigue: 2 },
  { id: 'ruck', attribut: 'force', fatigue: 3 },
  { id: 'melee', attribut: 'force', fatigue: 4 },
  { id: 'touche', attribut: 'passe', fatigue: 2 },
  { id: 'polyvalence', attribut: null, fatigue: 3 },
  { id: 'nouveau_poste', attribut: null, fatigue: 3 },
];

export function objectifIndividuel(id: ObjectifIndividuel) {
  return OBJECTIFS_INDIVIDUELS.find((o) => o.id === id) ?? OBJECTIFS_INDIVIDUELS[0];
}

/**
 * CE QU'UN PROGRAMME INDIVIDUEL RAPPORTE EN UNE SEMAINE.
 *
 * ⚠️ IL COÛTE AILLEURS CE QU'IL RAPPORTE ICI. « Mais pendant cette période il
 * progresse moins dans ses autres attributs. » Un programme qui n'aurait qu'un
 * bénéfice serait à mettre sur les cinquante joueurs sans réfléchir : le
 * facteur rendu ci-dessous rabote le reste du travail de la semaine.
 */
export function apportProgramme(
  objectif: ObjectifIndividuel,
  intensite: Intensite,
  ctx: ContexteSeance,
): { attribut: string | null; gain: number; fatigue: number; freinLeReste: number } {
  const o = objectifIndividuel(objectif);
  if (o.id === 'aucun') return { attribut: null, gain: 0, fatigue: 0, freinLeReste: 1 };
  const eff = efficacite(ctx, intensite);
  return {
    attribut: o.attribut,
    gain: Math.round(eff * 0.34 * 100) / 100,
    fatigue: o.fatigue * FATIGUE_INTENSITE[intensite],
    freinLeReste: 1 - 0.10 * GAIN_INTENSITE[intensite],
  };
}

/**
 * APPRENDRE UN NOUVEAU POSTE.
 *
 * Demande : « Ton ailier : Ailier ⭐⭐⭐⭐⭐ · Arrière ⭐⭐. Tu lui mets Programme
 * Arrière. Après plusieurs mois : Arrière ⭐⭐⭐⭐. »
 *
 * ⚠️ ÇA PREND DES MOIS, PAS DES SEMAINES, et c'est ce qui en fait une décision.
 * À ~1,6 point de maîtrise par semaine, il faut une demi-saison pour passer de
 * deux à quatre étoiles — le temps de renoncer à autre chose.
 */
export const MAITRISE_PAR_ETOILE = 20;

export function progresserAuNouveauPoste(
  maitrise: number,
  intensite: Intensite,
  ctx: ContexteSeance,
): number {
  const eff = efficacite(ctx, intensite);
  const reste = Math.max(0, 100 - maitrise);
  return Math.min(100, maitrise + Math.min(reste, eff * 1.6));
}

export function etoilesDePoste(maitrise: number): number {
  return Math.max(0.5, Math.min(5, Math.round((maitrise / MAITRISE_PAR_ETOILE) * 2) / 2));
}
