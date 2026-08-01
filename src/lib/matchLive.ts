// LE MATCH DE LA SEMAINE, JOUÉ EN DIRECT
//
// Jusqu'ici un match se résumait à une ligne dans le journal : « Victoire
// 24-18 ». Ici on le DÉROULE — 80 minutes, minute par minute, avec le ballon
// qui circule, les 30 joueurs qui se déplacent et le commentaire qui tombe,
// façon Football Manager.
//
// ⚠️ RÈGLE ABSOLUE : on n'invente aucun résultat. Le score final vient du
// moteur existant (`jouerRencontre`, lib/championnat.ts) et la simulation ne
// fait que le RACONTER : on décompose chaque score en actions (essais,
// transformations, pénalités, drops) dont la somme retombe EXACTEMENT sur le
// score. Regarder le match ou passer la semaine donne donc le même résultat.
//
// Tout est déterministe (graine = clé de la rencontre) : rouvrir la fenêtre
// rejoue le même match, avec les mêmes buteurs aux mêmes minutes.

import { graine, jouerRencontre, calendrier, pouleDe, journeesALaSemaine, nombreJournees, type MatchChampionnat } from './championnat';
import { effectifDuClub, type Coequipier } from './effectif';
import { POSTE_PAR_ID } from '../data/rugby';
import type { Joueur, PosteId } from '../types';

export type TypeAction =
  | 'coupEnvoi' | 'essai' | 'transformation' | 'transformationRatee'
  | 'penalite' | 'peneRatee' | 'drop' | 'occasion' | 'melee' | 'touche'
  | 'plaquage' | 'carton' | 'miTemps' | 'fin';

export interface ActionMatch {
  minute: number;
  type: TypeAction;
  cote: 'domicile' | 'exterieur' | null;
  acteur?: string; // le joueur concerné
  texte: string;
  points: number; // points marqués par CETTE action
  scoreD: number; // score après l'action
  scoreE: number;
  // Position du ballon sur le terrain, en pourcentage : 0 = ligne d'en-but
  // domicile, 100 = ligne d'en-but extérieur.
  x: number;
  y: number;
}

export interface MatchEnDirect {
  domicile: string;
  exterieur: string;
  scoreD: number;
  scoreE: number;
  actions: ActionMatch[];
  compoD: Coequipier[];
  compoE: Coequipier[];
}

// --- DÉCOMPOSITION D'UN SCORE ----------------------------------------------
// Un score de rugby se lit : combien d'essais (5, +2 si transformé), combien de
// pénalités (3), un drop (3) ? On part des essais (le plus probable), puis on
// complète avec des pénalités, et le reste tombe sur des drops.
type Marque =
  | { type: 'essai'; transforme: boolean }
  | { type: 'penalite' }
  | { type: 'drop' };

// ⚠️ VERSION PRÉCÉDENTE FAUSSE : elle bricolait le reste à coups de rattrapages
// et se trompait sur 27 scores entre 0 et 60 (le récit ne retombait pas sur le
// score final). Ici on ÉNUMÈRE toutes les décompositions exactes puis on choisit
// la plus crédible — c'est exact par construction, et vérifié par
// `scripts/verifLot9.ts`.
export function decomposer(score: number, rng: () => number): Marque[] {
  if (score <= 0) return [];
  // Une solution = (essais transformés ×7, essais bruts ×5, coups de pied ×3).
  const solutions: { sept: number; cinq: number; trois: number }[] = [];
  for (let sept = 0; sept * 7 <= score; sept++) {
    for (let cinq = 0; sept * 7 + cinq * 5 <= score; cinq++) {
      const reste = score - sept * 7 - cinq * 5;
      if (reste % 3 === 0) solutions.push({ sept, cinq, trois: reste / 3 });
    }
  }
  // 1, 2 et 4 points sont impossibles au rugby : `scorePossible` les écarte en
  // amont, mais si jamais il en passe un, mieux vaut ne rien raconter que mentir.
  if (!solutions.length) return [];

  // On note chaque solution : un match crédible, c'est ~1 essai par tranche de
  // 7 points, une majorité d'essais transformés, et pas dix pénalités.
  const essaisIdeal = score / 7;
  const note = (s: { sept: number; cinq: number; trois: number }) => {
    const essais = s.sept + s.cinq;
    const partTransformee = essais ? s.sept / essais : 1;
    return (
      -Math.abs(essais - essaisIdeal) * 2 // le bon nombre d'essais avant tout
      - Math.abs(partTransformee - 0.78) * 3 // ~78 % de réussite au pied
      - Math.max(0, s.trois - 4) * 1.5 // au-delà de 4 coups de pied, ça sonne faux
    );
  };
  // Un peu de hasard pour ne pas rejouer toujours le même schéma.
  const choisie = solutions
    .map((s) => ({ s, score: note(s) + rng() * 1.2 }))
    .sort((a, b) => b.score - a.score)[0].s;

  const marques: Marque[] = [
    ...Array.from({ length: choisie.sept }, () => ({ type: 'essai', transforme: true }) as Marque),
    ...Array.from({ length: choisie.cinq }, () => ({ type: 'essai', transforme: false }) as Marque),
    // Un coup de pied sur six est un drop, le reste des pénalités.
    ...Array.from({ length: choisie.trois }, () => (rng() < 0.16 ? { type: 'drop' } : { type: 'penalite' }) as Marque),
  ];
  // On mélange pour que les essais ne tombent pas tous en début de match.
  for (let i = marques.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [marques[i], marques[j]] = [marques[j], marques[i]];
  }
  return marques;
}

// --- LES JOUEURS QUI MARQUENT ----------------------------------------------
// Un essai n'est pas marqué au hasard : un ailier finit, un pilier beaucoup
// moins. On reprend les mêmes poids que le reste du jeu.
const POIDS_ESSAI: Record<PosteId, number> = {
  pilier_gauche: 3, talonneur: 5, pilier_droit: 3,
  deuxieme_ligne_g: 4, deuxieme_ligne_d: 4,
  troisieme_aile_g: 7, troisieme_aile_d: 7, numero_8: 9,
  demi_melee: 8, demi_ouverture: 6,
  ailier_gauche: 20, premier_centre: 10, deuxieme_centre: 13, ailier_droit: 20,
  arriere: 15,
};

function tirerMarqueur(compo: Coequipier[], rng: () => number): Coequipier | undefined {
  if (!compo.length) return undefined;
  const total = compo.reduce((a, c) => a + (POIDS_ESSAI[c.poste] ?? 5), 0);
  let seuil = rng() * total;
  for (const c of compo) {
    seuil -= POIDS_ESSAI[c.poste] ?? 5;
    if (seuil <= 0) return c;
  }
  return compo[0];
}

// Le buteur : l'ouvreur, sinon l'arrière, sinon le meilleur au pied.
function buteur(compo: Coequipier[]): Coequipier | undefined {
  return compo.find((c) => c.poste === 'demi_ouverture')
    ?? compo.find((c) => c.poste === 'arriere')
    ?? compo[0];
}

// --- LE RÉCIT ---------------------------------------------------------------
const ESSAIS = [
  'aplatit dans le coin après une chevauchée !',
  'perce la ligne et va au bout ! Personne ne le rattrape.',
  'conclut une action à la main partie de ses 22 mètres !',
  'plonge en force à l’aplomb des poteaux !',
  'récupère un ballon de contre-attaque et file marquer !',
  'sort du maul pénétrant et pose le ballon !',
];
const OCCASIONS = [
  'passe au pied dans le dos de la défense… le rebond est mauvais.',
  'tente un cadrage-débordement, il est repris in extremis.',
  'lance une offensive dans les 22, ballon perdu au contact.',
  'trouve une touche à cinq mètres. Ça sent le maul.',
  'envoie une chandelle sous les perches, duel aérien.',
  'gratte un ballon au sol ! Ballon rendu.',
];
const MELEES = ['obtient la pénalité en mêlée fermée.', 'domine la mêlée, l’arbitre siffle.', 'recule en mêlée, ça grince.'];
const TOUCHES = ['récupère une touche adverse !', 'assure sa touche, ballon propre.', 'rate son lancer en touche.'];

function piocher<T>(liste: T[], rng: () => number): T {
  return liste[Math.floor(rng() * liste.length)];
}

// --- LA SIMULATION ----------------------------------------------------------
export function jouerEnDirect(
  match: MatchChampionnat, saison: number, cleUnique: string,
): MatchEnDirect {
  const rng = graine('live#' + cleUnique);
  const compoD = effectifDuClub(match.domicile, saison).slice(0, 15);
  const compoE = effectifDuClub(match.exterieur, saison).slice(0, 15);

  const marquesD = decomposer(match.scoreD, rng);
  const marquesE = decomposer(match.scoreE, rng);

  // On répartit les moments de score sur les 80 minutes, sans doublon.
  const minutes = new Set<number>();
  const tirerMinute = () => {
    for (let i = 0; i < 40; i++) {
      const m = 2 + Math.floor(rng() * 78);
      if (!minutes.has(m)) { minutes.add(m); return m; }
    }
    return 2 + Math.floor(rng() * 78);
  };

  interface Prevu { minute: number; cote: 'domicile' | 'exterieur'; marque: Marque }
  const prevus: Prevu[] = [
    ...marquesD.map((marque) => ({ minute: tirerMinute(), cote: 'domicile' as const, marque })),
    ...marquesE.map((marque) => ({ minute: tirerMinute(), cote: 'exterieur' as const, marque })),
  ].sort((a, b) => a.minute - b.minute);

  const actions: ActionMatch[] = [];
  let scoreD = 0;
  let scoreE = 0;
  // Le ballon part du milieu, et se déplace vers l'en-but visé.
  let x = 50;

  const pousser = (
    minute: number, type: TypeAction, cote: ActionMatch['cote'],
    texte: string, points = 0, acteur?: string,
  ) => {
    // Le ballon avance vers l'en-but visé, mais pas en ligne droite : une fois
    // sur trois l'action recule (plaquage, en-avant, dégagement). Sans ça, le
    // ballon se collait à la ligne d'essai et n'en repartait plus.
    if (cote) {
      const sens = cote === 'domicile' ? 1 : -1;
      const recule = rng() < 0.34;
      x = Math.max(6, Math.min(94, x + sens * (recule ? -1 : 1) * (5 + rng() * 18)));
    }
    // Un essai s'aplatit dans l'en-but ; après un score, on remet au centre
    // pour le coup d'envoi, comme dans un vrai match.
    if (type === 'essai') x = cote === 'domicile' ? 96 : 4;
    actions.push({
      minute, type, cote, acteur, texte, points, scoreD, scoreE,
      x: Math.round(x), y: Math.round(18 + rng() * 64),
    });
    if (points > 0 || type === 'transformationRatee') x = 50;
  };

  pousser(0, 'coupEnvoi', null, `Coup d’envoi ! ${match.domicile} reçoit ${match.exterieur}.`);

  let dernier = 0;
  for (const p of prevus) {
    // Du remplissage entre deux scores : la vie du match.
    for (let m = dernier + 4; m < p.minute - 1; m += 3 + Math.floor(rng() * 6)) {
      if (m >= 40 && dernier < 40 && !actions.some((a) => a.type === 'miTemps')) {
        scoreD = actions[actions.length - 1]?.scoreD ?? scoreD;
        pousser(40, 'miTemps', null, `Mi-temps : ${match.domicile} ${scoreD} – ${scoreE} ${match.exterieur}.`);
      }
      const cote = rng() < 0.5 ? 'domicile' : 'exterieur';
      const compo = cote === 'domicile' ? compoD : compoE;
      const club = cote === 'domicile' ? match.domicile : match.exterieur;
      const qui = tirerMarqueur(compo, rng);
      const d = rng();
      if (d < 0.12) pousser(m, 'melee', cote, `${club} ${piocher(MELEES, rng)}`);
      else if (d < 0.24) pousser(m, 'touche', cote, `${club} ${piocher(TOUCHES, rng)}`);
      else if (d < 0.3 && rng() < 0.25) {
        pousser(m, 'carton', cote, `Carton jaune pour ${qui?.nom ?? club} ! ${club} à quatorze pour dix minutes.`, 0, qui?.nom);
      } else {
        pousser(m, 'occasion', cote, `${qui?.nom ?? club} ${piocher(OCCASIONS, rng)}`, 0, qui?.nom);
      }
    }

    const compo = p.cote === 'domicile' ? compoD : compoE;
    const club = p.cote === 'domicile' ? match.domicile : match.exterieur;
    const ajouter = (pts: number) => {
      if (p.cote === 'domicile') scoreD += pts; else scoreE += pts;
    };

    if (p.marque.type === 'essai') {
      const qui = tirerMarqueur(compo, rng);
      ajouter(5);
      // ⚠️ Pas d'emoji dans le texte : la colonne de gauche en affiche déjà un,
      // et on se retrouvait avec « 🏉 🏉 ESSAI … ».
      pousser(p.minute, 'essai', p.cote, `ESSAI ${club.toUpperCase()} ! ${qui?.nom ?? 'Le porteur'} ${piocher(ESSAIS, rng)}`, 5, qui?.nom);
      const b = buteur(compo);
      if (p.marque.transforme) {
        ajouter(2);
        pousser(p.minute, 'transformation', p.cote, `${b?.nom ?? 'Le buteur'} ajoute la transformation.`, 2, b?.nom);
      } else {
        pousser(p.minute, 'transformationRatee', p.cote, `${b?.nom ?? 'Le buteur'} manque la transformation, trop excentrée.`, 0, b?.nom);
      }
    } else if (p.marque.type === 'penalite') {
      const b = buteur(compo);
      ajouter(3);
      pousser(p.minute, 'penalite', p.cote, `Pénalité pour ${club}. ${b?.nom ?? 'Le buteur'} ne tremble pas : 3 points.`, 3, b?.nom);
    } else {
      const b = buteur(compo);
      ajouter(3);
      pousser(p.minute, 'drop', p.cote, `DROP de ${b?.nom ?? 'l’ouvreur'} ! Il arme de 40 mètres et ça passe.`, 3, b?.nom);
    }
    // On remet le score à jour sur l'action qu'on vient d'empiler.
    for (let i = actions.length - 1; i >= 0 && actions[i].minute === p.minute; i--) {
      actions[i].scoreD = scoreD;
      actions[i].scoreE = scoreE;
    }
    dernier = p.minute;
  }

  if (!actions.some((a) => a.type === 'miTemps')) {
    pousser(40, 'miTemps', null, `Mi-temps : ${match.domicile} ${scoreD} – ${scoreE} ${match.exterieur}.`);
  }
  // Fin de match : on complète jusqu'à la 80e.
  for (let m = Math.max(dernier + 4, 62); m < 79; m += 4 + Math.floor(rng() * 6)) {
    const cote = rng() < 0.5 ? 'domicile' : 'exterieur';
    const compo = cote === 'domicile' ? compoD : compoE;
    const qui = tirerMarqueur(compo, rng);
    pousser(m, 'occasion', cote, `${qui?.nom ?? 'Le porteur'} ${piocher(OCCASIONS, rng)}`, 0, qui?.nom);
  }
  const gagnant = scoreD > scoreE ? match.domicile : scoreE > scoreD ? match.exterieur : null;
  pousser(80, 'fin', null,
    `Coup de sifflet final ! ${match.domicile} ${scoreD} – ${scoreE} ${match.exterieur}. ` +
    (gagnant ? `${gagnant} l’emporte.` : 'Les deux équipes se quittent dos à dos.'));

  // ⚠️ Garde-fou : le récit doit retomber sur le score du moteur. Si la
  // décomposition a dérapé, on corrige l'affichage final plutôt que de mentir.
  const fin = actions[actions.length - 1];
  fin.scoreD = match.scoreD;
  fin.scoreE = match.scoreE;

  return {
    domicile: match.domicile, exterieur: match.exterieur,
    scoreD: match.scoreD, scoreE: match.scoreE,
    actions, compoD, compoE,
  };
}

// --- QUEL MATCH CETTE SEMAINE ? --------------------------------------------
// Le match du club du joueur pour la semaine en cours, s'il y en a un.
export interface AfficheSemaine {
  journee: number;
  match: MatchChampionnat;
  cle: string;
}

export function matchDeLaSemaine(j: Joueur, bonus = 0): AfficheSemaine | null {
  const division = j.division;
  if (!division) return null;
  const total = nombreJournees(division, j.club);
  const sem = j.semaine ?? 1;
  const fin = journeesALaSemaine(division, sem + 1, total); // journées jouées APRÈS cette semaine
  const debut = journeesALaSemaine(division, sem, total) + 1;
  if (fin < debut) return null; // pas de journée ce week-end

  const grille = calendrier(pouleDe(division, j.club));
  for (let journee = debut; journee <= fin; journee++) {
    const affiche = (grille[journee - 1] ?? []).find(([d, e]) => d === j.club || e === j.club);
    if (!affiche) continue;
    const [d, e] = affiche;
    const cle = `${division}#${j.saison}#${journee - 1}#${d}#${e}`;
    return {
      journee,
      match: jouerRencontre(d, e, j.saison, cle, { club: j.club, bonus }),
      cle,
    };
  }
  return null;
}

// Le numéro de maillot d'un joueur dans la compo (1 à 15).
export function numeroDe(c: Coequipier, index: number): number {
  const ordre: PosteId[] = [
    'pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g', 'deuxieme_ligne_d',
    'troisieme_aile_g', 'troisieme_aile_d', 'numero_8', 'demi_melee', 'demi_ouverture',
    'ailier_gauche', 'premier_centre', 'deuxieme_centre', 'ailier_droit', 'arriere',
  ];
  const i = ordre.indexOf(c.poste);
  return i >= 0 ? i + 1 : index + 1;
}

export function nomPoste(c: Coequipier): string {
  return POSTE_PAR_ID[c.poste]?.nom ?? '';
}
