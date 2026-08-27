// ═══════════════════════════════════════════════════════════════════════════
// LA PRÉPARATION DE L'ADVERSAIRE — « la mécanique la plus importante »
// ═══════════════════════════════════════════════════════════════════════════
// Demande, mot pour mot : « c'est probablement la mécanique que je rendrais la
// plus importante. Ton analyste te donne : Rapport Toulouse · Mêlée 88 · Touche
// 91 · Ruck 94 · Jeu au large 96 · ⚠️ Faiblesse détectée : défense derrière les
// rucks · ⚠️ 68 % des sorties de camp passent par du jeu au pied. Tu peux alors
// adapter ta semaine […] et tu obtiens des bonus pour CE match. Donc
// l'entraînement ne sert pas uniquement à faire passer Dupont de Passe 91 → 92.
// Il sert surtout à préparer ton équipe pour samedi. »
//
// ⚠️ LE RAPPORT SE LIT SUR L'ADVERSAIRE RÉEL, IL N'EST PAS INVENTÉ. Chaque note
// de secteur sort de l'effectif que le club aligne vraiment cette saison-là
// (`effectifDuClub`) : un club à gros pack a une mêlée forte parce qu'il a un
// gros pack, pas parce qu'un tirage l'a décidé. Sans ça, préparer un match
// reviendrait à jouer contre un nombre aléatoire, et le joueur le sentirait à la
// deuxième journée.
//
// ⚠️ ET LE BONUS EST LIÉ AU MATCH, PAS À LA SAISON. Il ne s'accumule pas : on
// travaille la défense au large cette semaine parce que CE club joue au large.
// Un bonus permanent aurait transformé la préparation en une deuxième courbe de
// progression, et la demande dit exactement le contraire.

import { effectifDuClub } from './effectif';
import { familleDe } from './jeunes';
import { graine } from './championnat';
import { JOURS, seance } from './entrainementPro';
import type { SemaineEntrainement, TypeSeance } from './entrainementPro';

export type SecteurAdverse =
  | 'melee' | 'touche' | 'ruck' | 'jeuAuLarge' | 'defenseAxe'
  | 'defenseLarge' | 'jeuAuPied' | 'discipline';

export const SECTEURS_ADVERSE: SecteurAdverse[] = [
  'melee', 'touche', 'ruck', 'jeuAuLarge', 'defenseAxe',
  'defenseLarge', 'jeuAuPied', 'discipline',
];

export interface RapportAdversaire {
  club: string;
  /** 0-100 par secteur, tels que l'analyste les a lus. */
  notes: Record<SecteurAdverse, number>;
  /** Le secteur le plus faible — c'est là qu'il faut frapper. */
  faiblesse: SecteurAdverse;
  /** Le secteur le plus fort — c'est là qu'il faut se protéger. */
  force: SecteurAdverse;
  /** Une tendance chiffrée, comme « 68 % des sorties de camp au pied ». */
  tendance: { quoi: 'sortieAuPied' | 'jeuAuLarge' | 'pickAndGo' | 'contreAttaque'; part: number };
  /** 0-100 : ce que vaut ce rapport. Un analyste médiocre se trompe. */
  fiabilite: number;
}

/**
 * CE QUE VAUT CHAQUE SECTEUR CHEZ L'ADVERSAIRE.
 *
 * ⚠️ ON SÉPARE LES AVANTS ET LES TROIS-QUARTS, sinon les huit notes ne seraient
 * que huit copies de la force d'effectif. Un club peut avoir un pack de Top 14
 * et une ligne arrière de Pro D2 : c'est précisément ce genre de déséquilibre
 * qu'un manager doit pouvoir exploiter, et c'est ce qui donne un sens à
 * « faiblesse détectée ».
 */
function notesReelles(club: string, saison: number): Record<SecteurAdverse, number> {
  const effectif = effectifDuClub(club, saison);
  const trier = (l: typeof effectif) => l.map((j) => j.note).sort((a, b) => b - a);
  const moyenne = (l: number[], n: number) => (l.length
    ? l.slice(0, n).reduce((s, v) => s + v, 0) / Math.min(n, l.length) : 50);

  const avants = trier(effectif.filter((j) => ['pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne']
    .includes(familleDe(j.poste))));
  const premiereLigne = trier(effectif.filter((j) => ['pilier', 'talonneur'].includes(familleDe(j.poste))));
  const sauteurs = trier(effectif.filter((j) => ['deuxieme_ligne', 'troisieme_ligne'].includes(familleDe(j.poste))));
  const arrieres = trier(effectif.filter((j) => ['demi_melee', 'demi_ouverture', 'centre', 'ailier', 'arriere']
    .includes(familleDe(j.poste))));
  const botteurs = trier(effectif.filter((j) => ['demi_ouverture', 'arriere'].includes(familleDe(j.poste))));

  const rng = graine(`profilAdverse#${club}#${saison}`);
  // ⚠️ LE BRUIT EST FAIBLE ET DÉTERMINISTE. Il donne à chaque club une identité
  // — « ils jouent au pied », « ils poussent en mêlée » — sans jamais démentir
  // ce que son effectif dit. Un bruit large aurait rendu le rapport arbitraire.
  const perso = () => (rng() * 2 - 1) * 7;

  return {
    melee: Math.round(moyenne(premiereLigne, 5) + perso()),
    touche: Math.round(moyenne(sauteurs, 5) + perso()),
    ruck: Math.round(moyenne(avants, 8) + perso()),
    jeuAuLarge: Math.round(moyenne(arrieres, 7) + perso()),
    defenseAxe: Math.round(moyenne(avants, 8) * 0.6 + moyenne(arrieres, 7) * 0.4 + perso()),
    defenseLarge: Math.round(moyenne(arrieres, 7) * 0.75 + moyenne(avants, 8) * 0.25 + perso()),
    jeuAuPied: Math.round(moyenne(botteurs, 3) + perso()),
    discipline: Math.round(moyenne(effectif.map((j) => j.note).sort((a, b) => b - a), 23) + perso()),
  };
}

const TENDANCES = ['sortieAuPied', 'jeuAuLarge', 'pickAndGo', 'contreAttaque'] as const;

/**
 * LE RAPPORT DE L'ANALYSTE.
 *
 * ⚠️ UN ANALYSTE MÉDIOCRE REND UN RAPPORT FAUX, pas un rapport vide. C'est ce
 * qui donne sa valeur au poste : à 20 de note, les chiffres bougent de ±12 et
 * la « faiblesse détectée » peut être un point fort. À 90, on lit l'adversaire
 * presque exactement. Un rapport toujours juste ferait du staff une décoration.
 *
 * ⚠️ ET IL EST STABLE POUR UN MATCH DONNÉ. Rouvrir l'écran ne redonne pas un
 * meilleur rapport : la graine tient le club, la saison et la journée.
 */
export function rapportSur(
  club: string,
  saison: number,
  journee: number,
  noteAnalyste: number,
): RapportAdversaire {
  const vraies = notesReelles(club, saison);
  const rng = graine(`analyse#${club}#${saison}#${journee}`);
  const flou = Math.max(1.5, 14 - noteAnalyste * 0.13);

  const notes = {} as Record<SecteurAdverse, number>;
  for (const s of SECTEURS_ADVERSE) {
    notes[s] = Math.max(1, Math.min(99, Math.round(vraies[s] + (rng() * 2 - 1) * flou)));
  }
  // La faiblesse et la force se lisent sur ce que l'analyste CROIT avoir vu :
  // c'est ce qui permet de préparer le mauvais secteur.
  const classes = SECTEURS_ADVERSE.slice().sort((a, b) => notes[a] - notes[b]);
  const tendance = TENDANCES[Math.floor(rng() * TENDANCES.length)];

  return {
    club,
    notes,
    faiblesse: classes[0],
    force: classes[classes.length - 1],
    tendance: { quoi: tendance, part: Math.round(45 + rng() * 35) },
    fiabilite: Math.round(Math.min(98, 30 + noteAnalyste * 0.68)),
  };
}

// ---------------------------------------------------------------------------
// CE QUE LA SEMAINE PRÉPARE VRAIMENT
// ---------------------------------------------------------------------------

/**
 * QUELLE SÉANCE RÉPOND À QUEL SECTEUR ADVERSE.
 *
 * ⚠️ CE N'EST PAS UNE TABLE DE CORRESPONDANCE COSMÉTIQUE : c'est elle qui décide
 * si le travail de la semaine sert à quelque chose samedi. Chaque ligne se lit
 * « pour contrer ÇA chez eux, travaille ÇA chez toi ».
 */
const REPONSE_A: Record<SecteurAdverse, TypeSeance[]> = {
  melee: ['melee', 'force', 'defense_rucks'],
  touche: ['touche', 'maul'],
  ruck: ['rucks', 'defense_rucks', 'jeu_rapide'],
  jeuAuLarge: ['defense_large', 'montee_rapide', 'defense_generale'],
  defenseAxe: ['pick_and_go', 'rucks', 'jeu_rapide'],
  defenseLarge: ['jeu_au_large', 'contre_attaque', 'manipulation'],
  jeuAuPied: ['renvois', 'contre_attaque', 'jeu_au_pied'],
  discipline: ['defense_generale', 'plaquage'],
};

export interface PreparationMatch {
  /** Le bonus par secteur, en points de pourcentage, pour CE match. */
  bonus: { secteur: SecteurAdverse; valeur: number }[];
  /** Le total, borné — c'est lui que le moteur consomme. */
  total: number;
  /** La séance de mise en place a-t-elle eu lieu ? Sans elle, tout est bridé. */
  miseEnPlace: boolean;
}

/**
 * ⚠️ LE PLAFOND EST LA PIÈCE MAÎTRESSE DU RÉGLAGE. Sans lui, il suffirait de
 * remplir les quatorze cases avec la même séance pour arriver au match avec
 * +40 % partout — et le score, qui vient de la ligue, se ferait tordre par un
 * planning. Un bonus de préparation doit faire pencher un match serré, jamais
 * renverser une hiérarchie.
 */
// ⚠️ DEUX SECTEURS AU PLAFOND NE DOIVENT PAS SUFFIRE À ATTEINDRE LE TOTAL.
// Réglés à 8 et 15, ils le faisaient : la semaine ciblée, la semaine
// générique et la semaine sans mise en place rendaient toutes « +15 % »,
// et les trois contrôles qui les comparent tombaient à égalité. Un plafond
// qu'on touche en permanence n'est plus un plafond, c'est une valeur fixe.
export const BONUS_MAX_PAR_SECTEUR = 5;
export const BONUS_MAX_TOTAL = 18;

/**
 * CE QUE LA SEMAINE A PRÉPARÉ CONTRE CET ADVERSAIRE.
 *
 * ⚠️ ON RÉCOMPENSE LE CIBLAGE, PAS LE VOLUME. Le bonus d'un secteur est
 * plafonné et les rendements décroissent (racine carrée) : trois séances de
 * défense au large valent 1,7 fois une seule, pas trois fois. C'est ce qui
 * pousse à répartir sur les deux ou trois points qui comptent contre CE club,
 * au lieu de marteler la même case.
 *
 * ⚠️ ET LA MISE EN PLACE DU VENDREDI CONDITIONNE TOUT LE RESTE. Sans elle, on a
 * travaillé sans transmettre le plan : la préparation ne rend que 55 %. C'est ce
 * qui donne un rôle à une séance qui ne fait progresser personne.
 */
export function preparerLeMatch(
  semaine: SemaineEntrainement,
  rapport: RapportAdversaire,
  qualiteCoach: number,
  maitriseTactique: number,
): PreparationMatch {
  const travail = new Map<TypeSeance, number>();
  let miseEnPlace = false;
  for (const jour of JOURS) {
    for (const c of semaine[jour]) {
      if (c.seance === 'mise_en_place') { miseEnPlace = c.intensite > 0; continue; }
      if (c.intensite === 0) continue;
      travail.set(c.seance, (travail.get(c.seance) ?? 0) + c.intensite / 2);
    }
  }

  const fCoach = 0.55 + qualiteCoach / 130;
  const fTactique = 0.60 + maitriseTactique / 150;
  const fFiabilite = 0.45 + rapport.fiabilite / 145;
  const fMiseEnPlace = miseEnPlace ? 1 : 0.55;

  const bonus: { secteur: SecteurAdverse; valeur: number }[] = [];
  for (const secteur of SECTEURS_ADVERSE) {
    let volume = 0;
    for (const s of REPONSE_A[secteur]) volume += travail.get(s) ?? 0;
    if (volume <= 0) continue;
    // ⚠️ ON NE PRÉPARE PAS HUIT SECTEURS, ON EN PRÉPARE DEUX OU TROIS.
    //
    // Une première version pondérait chaque secteur par la note que l'analyste
    // lui avait mise. Contre un gros club, les huit notes sont hautes : les huit
    // secteurs rapportaient donc, une semaine générique atteignait le plafond
    // aussi bien qu'une semaine ciblée, et les trois contrôles qui comparent les
    // deux tombaient à égalité — mesuré, +15 % partout.
    //
    // Ce qui compte, c'est ce que le RAPPORT a signalé : la faiblesse qu'on peut
    // exploiter et la force dont il faut se protéger. Le reste ne rapporte qu'à
    // la marge. C'est aussi ce que dit la demande : « ⚠️ Faiblesse détectée […]
    // tu peux alors adapter ta semaine ».
    const pertinence = secteur === rapport.faiblesse || secteur === rapport.force ? 1
      : rapport.notes[secteur] >= 72 ? 0.28 : 0.10;
    const brut = Math.sqrt(volume) * 2.4 * pertinence * fCoach * fTactique * fFiabilite * fMiseEnPlace;
    const valeur = Math.min(BONUS_MAX_PAR_SECTEUR, Math.round(brut * 10) / 10);
    if (valeur >= 0.5) bonus.push({ secteur, valeur });
  }

  bonus.sort((a, b) => b.valeur - a.valeur);
  const total = Math.min(BONUS_MAX_TOTAL, Math.round(bonus.reduce((s, b) => s + b.valeur, 0) * 10) / 10);
  return { bonus, total, miseEnPlace };
}

/**
 * LA SEMAINE QUE LE STAFF PROPOSERAIT CONTRE CET ADVERSAIRE.
 *
 * ⚠️ ELLE EXISTE POUR QUE LE MODE AUTOMATIQUE PRÉPARE VRAIMENT LES MATCHS. Un
 * mode automatique qui déroulerait toujours la même semaine laisserait toute la
 * mécanique de préparation aux seuls joueurs qui ouvrent le planning — c'est-à
 * dire qu'elle n'existerait pas pour la plupart des parties.
 */
export function semaineContre(
  base: SemaineEntrainement,
  rapport: RapportAdversaire,
): SemaineEntrainement {
  const contreLaForce = REPONSE_A[rapport.force][0];
  const exploiterLaFaiblesse = REPONSE_A[rapport.faiblesse][0];
  // ⚠️ QUATRE CRÉNEAUX, PAS DEUX. Avec deux, la semaine « ciblée » ne se
  // distinguait pas assez d'une semaine ordinaire — mesuré, elles rendaient le
  // même bonus, parce qu'une semaine type touche déjà la mêlée et la défense.
  // Préparer un adversaire, c'est renoncer à autre chose : le staff sacrifie
  // donc son travail de conquête du jeudi.
  return {
    ...base,
    mardi: [base.mardi[0], { seance: contreLaForce, intensite: 3 }],
    mercredi: [base.mercredi[0], { seance: exploiterLaFaiblesse, intensite: 3 }],
    jeudi: [{ seance: exploiterLaFaiblesse, intensite: 3 }, { seance: contreLaForce, intensite: 3 }],
  };
}

/** Le libellé i18n d'un secteur. */
export function cleSecteur(s: SecteurAdverse): string {
  return `ent.secteur.${s}`;
}

/** Ce que la séance de ce créneau apporte contre ce rapport — pour l'écran. */
export function utileContre(type: TypeSeance, rapport: RapportAdversaire): SecteurAdverse | null {
  for (const secteur of SECTEURS_ADVERSE) {
    if (REPONSE_A[secteur].includes(type) && rapport.notes[secteur] >= 55) return secteur;
  }
  return null;
}

export { seance };
