/**
 * L'ESSAI D'UNE COMBINAISON SUR LE VRAI MOTEUR (Correctif 41, points 1, 2, 5 et 14).
 *
 * « Le preview ne doit surtout pas être une animation différente fabriquée uniquement pour l'éditeur. » L'essai monte
 * donc un match avec LES MÊMES OPTIONS qu'une rencontre de ligue créée aujourd'hui (`optionsMoteurDesRegles` : cadence
 * détaillée, placement joué, IA par poste), pose la situation (mêlée, touche, ruck), charge le cahier d'un seul plan, et
 * laisse le moteur jouer. L'état rendu est un `EtatMatch` vivant : la scène 3D le lit comme un match de carrière
 * (`scene.brancher(e)`), le terrain vu de haut aussi. Rien n'est écrit dans une ligue.
 *
 * ⚠️ LA DÉFENSE NE REÇOIT PAS LE CAHIER (point 15) : `plansCombinaisons` ne contient que le camp A, et aucun module de
 * l'IA ne le lit. Elle défend ce qu'elle voit.
 *
 * ⚠️ « SANS DÉFENSE » GARDE LA CONQUÊTE DISPUTÉE : une mêlée ou une touche sans adversaire n'existe pas dans le moteur.
 * Les défenseurs quittent le terrain à l'instant où la combinaison démarre — c'est la sortie de balle qu'on regarde.
 */
import type { Coequipier } from '../effectif.js';
import { ORDRE_MAILLOTS, stopper } from '../moteur/entites.js';
import { avancer, creerMatch, DT, installerSituationCombinaison } from '../moteur/moteur.js';
import type { EtatMatch, SystemeDefensif } from '../moteur/etat.js';
import { LIGNE_A } from '../moteur/terrain.js';
import { combinaisonsValides, erreursVariante, etapesCombinaison, origineApercu, type ActionCombinaison, type Combinaison, type ConditionCombinaison, type PhaseCombinaison, type VarianteCombinaison } from './combinaisons.js';
import { optionsMoteurDesRegles } from './matchCarriere.js';

export type NiveauDefense = 'aucune' | 'faible' | 'normale' | 'forte';
export const NIVEAUX_DEFENSE: readonly NiveauDefense[] = ['aucune', 'faible', 'normale', 'forte'];
export const SYSTEMES_DEFENSE: readonly SystemeDefensif[] = ['glissee', 'blitz', 'repli'];

export interface ReglagesEssai {
  niveau: NiveauDefense;
  systeme: SystemeDefensif;
  /** Le numéro de l'essai : chaque valeur est un autre tirage, rejouable à l'identique. */
  essai: number;
}
export const REGLAGES_ESSAI_DEFAUT: ReglagesEssai = { niveau: 'normale', systeme: 'glissee', essai: 0 };

/** Pourquoi l'essai s'est arrêté. L'écran le traduit ; rien n'est écrit en dur ici. */
export type IssueEssai = 'enCours' | 'invalide' | 'plaque' | 'perdu' | 'conquetePerdue' | 'essai' | 'faute' | 'arret' | 'temps';

export interface BilanEssai {
  issue: IssueEssai;
  /** Secondes jouées depuis la mise en place. */
  duree: number;
  /** Secondes entre la mise en place et le départ de la combinaison (la conquête). `null` : pas encore partie. */
  depart: number | null;
  passes: number;
  plaquages: number;
  /** Mètres gagnés depuis la conquête, dans le sens de l'attaque. */
  metres: number;
  /** Défenseurs battus et lignes franchies par l'attaque. */
  franchissements: number;
  /** L'étape du cahier en cours (0 = la première), `null` hors combinaison. */
  etape: number | null;
  /** L'option que le porteur a jouée à la place du geste prévu (cahier vivant), s'il y en a eu une. */
  option?: ConditionCombinaison;
}

export interface ReperesEssai {
  /** Par étape : l'instant (secondes depuis le départ de la combinaison) où son geste est joué — la passe lâchée, le coup de pied frappé, la course arrivée. */
  faits: number[];
  /** Par étape qui se termine par une passe : l'instant où le destinataire a le ballon en main. */
  recus: (number | undefined)[];
  /** L'instant où le dernier geste s'est achevé. */
  fin: number | null;
}

export interface EssaiVivant {
  e: EtatMatch;
  /** Un pas de moteur (`DT`). Rend faux quand l'essai est terminé : l'état reste lisible. */
  avancer(): boolean;
  /** Avance d'une durée quelconque (une image d'écran) : le moteur garde son pas fixe. Rend faux à la fin. */
  avancerDe(secondes: number): boolean;
  termine(): boolean;
  bilan(): BilanEssai;
  reperes(): ReperesEssai;
}

/** Durée maximale d'un essai, et ce qu'on laisse voir après ce qui l'a conclu. */
const DUREE_MAX = 45;
const APRES = { plaque: 1.8, perdu: 1.2, conquetePerdue: 1.2, essai: 2.4, faute: 1.2, arret: 1.2 } as const;
// « Sans défense » : la conquête reste jouée, mais contre un pack très inférieur — on veut voir la sortie de balle.
const ECART_NIVEAU: Record<NiveauDefense, number> = { aucune: -30, faible: -10, normale: 0, forte: 10 };

function moyenne(notes: number[]): number { return notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : 65; }

/**
 * Monte l'essai. `joueurs` : les noms par numéro (affichage) ; `effectif` : le XV dans l'ordre des maillots, s'il existe —
 * l'essai se joue alors avec leurs notes, et la défense se règle PAR RAPPORT à elles (faible : −10, forte : +10).
 */
export function creerEssaiCombinaison(
  c: Combinaison, v: VarianteCombinaison, joueurs: Record<number, string>,
  reglages: ReglagesEssai = REGLAGES_ESSAI_DEFAUT, effectif?: readonly Coequipier[], tirage = 0,
): EssaiVivant | null {
  const plan = combinaisonsValides([{ ...c, active: true, variantes: [v] }])[0];
  if (!plan || erreursVariante(c.phase, v).length) return null;
  const niveauAttaque = Math.round(moyenne((effectif ?? []).slice(0, 15).map((j) => j.note)));
  const niveauDefense = Math.max(30, Math.min(95, niveauAttaque + ECART_NIVEAU[reglages.niveau]));
  const equipe = (adverse: boolean): Coequipier[] => ORDRE_MAILLOTS.map((poste, i) => ({
    ...(adverse ? undefined : effectif?.[i]), id: `essai-${adverse ? 'defense' : 'attaque'}-${i + 1}`,
    nom: adverse ? `Défenseur ${i + 1}` : joueurs[i + 1] ?? effectif?.[i]?.nom ?? `Joueur ${i + 1}`, poste,
    age: adverse ? 27 : effectif?.[i]?.age ?? 27, note: adverse ? niveauDefense : effectif?.[i]?.note ?? 65,
    potentiel: adverse ? niveauDefense : effectif?.[i]?.potentiel ?? 65,
    nation: adverse ? 'France' : effectif?.[i]?.nation ?? 'France', regen: false,
  }));
  const attaque = equipe(false), defenseurs = equipe(true);
  const e = creerMatch('Ton XV', 'Opposition', attaque, defenseurs, 0, 0,
    JSON.stringify(['essai', c.id, v, reglages, tirage]), undefined, {
      ...optionsMoteurDesRegles(),
      compositionA: attaque, compositionB: defenseurs,
      tactiqueB: { attaque: 'equilibre', defense: reglages.systeme, rythme: 'normal', penalites: 'mixte', remplacements: 'standard' },
    });
  e.plansCombinaisons = { A: [plan] };
  e.commentaires = [];
  const origine = origineApercu(c);
  const depart = { x: origine.x + LIGNE_A, y: origine.y };
  installerSituationCombinaison(e, c.phase, depart);
  // Les deux équipes sont déjà à leurs marques : on teste une sortie de balle, pas le trajet jusqu'à la mêlée.
  for (const p of e.pions) {
    const marque = e.placement?.[p.id];
    if (!marque || !p.surLeTerrain) continue;
    p.pos = { ...marque }; p.cible = { ...marque }; stopper(p);
  }

  let fin: number | null = null, issue: IssueEssai = 'enCours', partie: number | null = null, defenseRetiree = false;
  const faits: number[] = [], recus: (number | undefined)[] = [];
  let reception: { etape: number; numero: number } | null = null;
  let finGestes: number | null = null;
  const depuisLeDepart = () => Math.round((e.sim - (partie ?? e.sim)) * 100) / 100;
  const camp = (cote: 'A' | 'B') => e.pions.filter((p) => p.cote === cote);
  const conclure = (raison: Exclude<IssueEssai, 'enCours' | 'invalide' | 'temps'>) => { if (fin === null) { fin = e.sim + APRES[raison]; issue = raison; } };
  const observer = () => {
    const enCours = e.combinaisonEnCours;
    if (enCours && partie === null) {
      partie = e.sim;
      // Un seul passage du cahier par essai : la phase suivante appartient au jeu libre.
      e.plansCombinaisons = {};
    }
    if (enCours && partie !== null) {
      // L'index avance quand le geste est joué : les étapes passées sont « faites » à cet instant.
      while (faits.length < enCours.index) {
        const passe = enCours.etapes[faits.length]?.actions.find((a) => a.action.type === 'passe')?.action;
        if (passe?.type === 'passe') reception = { etape: faits.length, numero: passe.destinataire };
        faits.push(depuisLeDepart());
      }
    }
    // La passe est « reçue » quand son destinataire tient le ballon : plus de vol, et c'est lui le porteur.
    if (reception && partie !== null && !e.vol && e.porteur?.cote === 'A' && e.porteur.numero === reception.numero) {
      recus[reception.etape] = depuisLeDepart();
      reception = null;
    }
    if (!enCours && partie !== null && finGestes === null) finGestes = depuisLeDepart();
    if (reglages.niveau === 'aucune' && partie !== null && !defenseRetiree) {
      defenseRetiree = true;
      for (const p of camp('B')) { p.surLeTerrain = false; p.sanction = 0; }
    }
    if (fin !== null) return;
    if (camp('B').some((p) => p.stats.plaquages > 0)) conclure('plaque');
    else if (e.possession === 'B') conclure(partie === null ? 'conquetePerdue' : 'perdu');
    else if (e.scoreA > 0 || e.phase === 'aplatissage') conclure('essai');
    else if (e.phase === 'penalite') conclure('faute');
    else if (partie !== null && !enCours && e.phase !== 'jeuCourant' && e.phase !== 'ballonEnLAir') conclure('arret');
  };
  observer();
  const termine = () => e.fini || e.sim >= Math.min(fin ?? DUREE_MAX, DUREE_MAX);
  return {
    e,
    avancer() {
      if (termine()) return false;
      avancer(e, DT);
      observer();
      return !termine();
    },
    avancerDe(secondes) {
      if (termine()) return false;
      // Jamais au-delà de la fin : l'image suivante montrerait un jeu que l'essai n'a pas à juger.
      avancer(e, Math.max(0, Math.min(secondes, Math.min(fin ?? DUREE_MAX, DUREE_MAX) - e.sim + DT)));
      observer();
      return !termine();
    },
    termine,
    bilan() {
      const a = camp('A');
      const sensA = 1;
      return {
        issue: termine() && issue === 'enCours' ? 'temps' : issue,
        duree: Math.round(e.sim * 100) / 100, depart: partie === null ? null : Math.round(partie * 100) / 100,
        passes: a.reduce((n, p) => n + p.stats.passes, 0),
        plaquages: camp('B').reduce((n, p) => n + p.stats.plaquages, 0),
        metres: Math.round((e.ballon.x - depart.x) * sensA * 10) / 10,
        franchissements: a.reduce((n, p) => n + p.stats.franchissements, 0),
        etape: e.combinaisonEnCours?.index ?? null,
        ...(e.suiviCombinaison?.option ?? e.bilansCombinaisons?.at(-1)?.option ? { option: e.suiviCombinaison?.option ?? e.bilansCombinaisons?.at(-1)?.option } : {}),
      };
    },
    reperes: () => ({ faits: [...faits], recus: [...recus], fin: finGestes }),
  };
}

/** Joue l'essai jusqu'au bout sans rien afficher. */
export function jouerEssaiCombinaison(essai: EssaiVivant): { bilan: BilanEssai; reperes: ReperesEssai } {
  let garde = Math.ceil(DUREE_MAX / DT) + 20;
  while (garde-- > 0 && essai.avancer()) { /* le moteur joue */ }
  return { bilan: essai.bilan(), reperes: essai.reperes() };
}

export interface LigneChronologie {
  /** Secondes depuis la sortie du ballon : la passe lâchée, le pied frappé, la course ou le leurre qui démarre. */
  t: number;
  /** Une passe : l'instant où son destinataire a le ballon en main. */
  recu?: number;
  etape: number;
  action: ActionCombinaison;
  /** Le porteur du ballon au début de l'étape. */
  porteur: number;
  /** Faux : le moteur n'est pas arrivé jusqu'à cette étape pendant la mesure ; l'instant est alors estimé. */
  mesure: boolean;
}

/**
 * LA CHRONOLOGIE D'UNE COMBINAISON (point 5) : « le joueur ne doit pas avoir besoin d'entrer manuellement tous ces temps ».
 * Elle ne se saisit pas et ne se calcule pas à part : elle se MESURE, en jouant la combinaison une fois sans défense sur
 * le moteur du match. Ce qu'elle affiche (« 1,4 s — le 10 reçoit ») est donc ce qui se passera en rencontre, aux
 * contacts près. Les étapes que la mesure n'a pas atteintes sont estimées à 0,9 s l'une.
 */
export function chronologieCombinaison(
  c: Combinaison, v: VarianteCombinaison, effectif?: readonly Coequipier[],
): { lignes: LigneChronologie[]; conquete: number | null; fin: number | null } {
  // Une passe peut tomber même sans défense (le moteur garde ses erreurs de main) : on retient, sur six tirages au plus,
  // celui où la combinaison va le plus loin — c'est la mesure d'un déroulé propre, pas une promesse de réussite.
  const nombreEtapes = etapesCombinaison(v.actions).length;
  let meilleur: { bilan: BilanEssai; reperes: ReperesEssai } | null = null;
  for (let tirage = 0; tirage < 6; tirage++) {
    const essai = creerEssaiCombinaison(c, v, {}, { niveau: 'aucune', systeme: 'glissee', essai: 0 }, effectif, tirage);
    if (!essai) return { lignes: [], conquete: null, fin: null };
    const joue = jouerEssaiCombinaison(essai);
    if (!meilleur || joue.reperes.faits.length > meilleur.reperes.faits.length) meilleur = joue;
    if (joue.reperes.fin !== null && joue.reperes.faits.length >= nombreEtapes - 1) break;
  }
  if (!meilleur) return { lignes: [], conquete: null, fin: null };
  const { bilan, reperes } = meilleur;
  const lignes: LigneChronologie[] = [];
  let porteur = c.phase === 'touche' ? v.sauteur : v.depart;
  let dernier = 0;
  const etapes = etapesCombinaison(v.actions);
  etapes.forEach((etape, i) => {
    // Une étape commence quand son porteur a le ballon : à la sortie pour la première, à la réception de la passe sinon.
    const debut = i === 0 ? 0 : reperes.recus[i - 1] ?? reperes.faits[i - 1];
    // Le dernier geste est « fait » quand la combinaison se termine.
    const fait = reperes.faits[i] ?? (i === etapes.length - 1 ? reperes.fin ?? undefined : undefined);
    for (const { action } of etape.actions) {
      // Une passe ou un coup de pied se date à l'instant où le ballon part ; une course et un leurre, à leur départ.
      const instant = action.type === 'passe' || action.type === 'pied' ? fait : debut;
      const mesure = instant !== undefined;
      const t = mesure ? instant : Math.round((dernier + .9) * 100) / 100;
      const recu = action.type === 'passe' ? reperes.recus[i] : undefined;
      lignes.push({ t, etape: i, action, porteur, mesure, ...(recu !== undefined ? { recu } : {}) });
    }
    dernier = Math.max(dernier, fait ?? debut ?? dernier + .9);
    const principale = etape.actions.find((a) => a.action.type !== 'leurre')?.action;
    if (principale?.type === 'passe') porteur = principale.destinataire;
  });
  lignes.sort((a, b) => a.etape - b.etape || a.t - b.t);
  return { lignes, conquete: bilan.depart, fin: reperes.fin };
}

/** Ce qu'on laisse voir de la conquête avant la sortie du ballon, quand on la passe d'office. */
const VUE_AVANT_SORTIE: Record<PhaseCombinaison, number> = { ruck: 99, melee: 3, touche: 4.5 };

export interface EssaiPrepare {
  essai: EssaiVivant;
  /** Secondes de conquête jouées d'office avant la première image (0 : rien n'a été passé). */
  avance: number;
  /** Ce que cet essai donnera : il a été joué une fois à blanc, et le moteur rejoue à l'identique. */
  prevu: BilanEssai;
}

/**
 * PRÉPARE UN ESSAI POUR L'ÉCRAN. Une mêlée met dix secondes à sortir son ballon, une touche dix-neuf : c'est le temps du
 * match, et le regarder à chaque essai d'une combinaison serait une punition. L'essai est donc joué une première fois à
 * blanc (le moteur est déterministe : même tirage, même jeu), ce qui dit QUAND la combinaison part ; le vrai essai est
 * alors avancé sans image jusqu'à quelques secondes avant — on voit l'introduction ou le lancer, pas la mise en place.
 *
 * ⚠️ SANS DÉFENSE, ON VEUT VOIR LA SORTIE DE BALLE : une conquête perdue ou sifflée fait prendre un autre tirage (six au
 * plus). Avec une défense, la conquête perdue fait partie de ce qu'on teste.
 */
export function preparerEssaiCombinaison(
  c: Combinaison, v: VarianteCombinaison, joueurs: Record<number, string>,
  reglages: ReglagesEssai = REGLAGES_ESSAI_DEFAUT, effectif?: readonly Coequipier[], passerConquete = true,
): EssaiPrepare | null {
  let tirage = 0;
  let prevu: BilanEssai | null = null;
  for (; tirage < 6; tirage++) {
    const jumeau = creerEssaiCombinaison(c, v, joueurs, reglages, effectif, tirage);
    if (!jumeau) return null;
    prevu = jouerEssaiCombinaison(jumeau).bilan;
    if (reglages.niveau !== 'aucune' || prevu.depart !== null) break;
  }
  tirage = Math.min(tirage, 5);
  const essai = creerEssaiCombinaison(c, v, joueurs, reglages, effectif, tirage);
  if (!essai || !prevu) return null;
  if (passerConquete && prevu.depart !== null) {
    const cible = prevu.depart - VUE_AVANT_SORTIE[c.phase];
    while (essai.e.sim + DT <= cible && essai.avancer()) { /* la mise en place se joue sans image */ }
  }
  return { essai, avance: Math.round(essai.e.sim * 100) / 100, prevu };
}
