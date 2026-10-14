/**
 * LA GESTION AUTOMATIQUE DES CONTRATS (Correctif 41).
 *
 * Signalé en jeu : « en début de carrière, il est beaucoup trop pénible de devoir gérer énormément de contrats un par
 * un ». Un groupe qu'on reprend a un contrat sur quatre qui s'arrête à la fin de la première saison.
 *
 * ⚠️ L'ASSISTANT NÉGOCIE POUR DE VRAI. Il n'existe pas de « prolonger tout le monde » : chaque dossier passe par la même
 * négociation que celle de L'Ovale (`ouvrirRenegociationJoueur`, `negocierAvecJoueur`, `signerRenegociationJoueur`),
 * avec les exigences cachées du joueur, sa patience, son refus de prolonger s'il veut partir, la marge sous le plafond
 * salarial et la prime à la signature prise sur le budget. Il ouvre plus bas que la demande, monte par paliers, s'arrête
 * à ce que la politique autorise — et laisse partir celui qui coûte trop cher.
 *
 * Deux temps, pour que l'écran puisse montrer AVANT ce qui sera fait :
 *   `planContrats`   — qui garder, qui laisser partir, pourquoi. Aucun effet.
 *   `executerPlan`   — les négociations, dans l'ordre d'importance (les cadres passent avant que la marge soit entamée).
 *
 * Fonctions pures : elles rendent un `Manager` neuf, le store l'écrit.
 */
import { POSTE_PAR_ID } from '../data/rugby.js';
import type { Manager, NegociationManager, TermesRecrutementManager } from '../types.js';
import type { Coequipier } from './effectif.js';
import {
  assurerEtatCarriereAvancee, moisRestantsContrat, ouvrirRenegociationJoueur, signerRenegociationJoueur,
  type ContratJoueurAvance, type EtatCarriereAvancee,
} from './carriereAvancee.js';
import { accepterDemandesJoueur, contratAmateur, negocierAvecJoueur, salairesEffectif, situationSalariale } from './recrutementManager.js';
import { tempsDeJeuReclamable } from './tempsDeJeuManager.js';

export interface PolitiqueContrats {
  /** Conserver les cadres. */
  cadres: boolean;
  /** Prolonger les jeunes prometteurs. */
  jeunes: boolean;
  /** Prolonger les remplaçants : toujours, seulement si le salaire reste raisonnable, ou jamais. */
  remplacants: 'oui' | 'raisonnable' | 'non';
  /** Durée maximale proposée à un joueur de plus de 32 ans. */
  dureeVeterans: 1 | 2;
  /** Jusqu'où monter : toute la marge du budget, des hausses mesurées, ou presque aucune hausse. */
  plafond: 'budget' | 'prudent' | 'serre';
  /** Laisser partir les joueurs qui ne jouent pas. */
  libererInutilises: boolean;
  /** À la clôture de la saison, l'assistant règle les contrats restés sans décision. */
  cloture: boolean;
}

export const POLITIQUE_CONTRATS_DEFAUT: PolitiqueContrats = {
  cadres: true, jeunes: true, remplacants: 'raisonnable', dureeVeterans: 1, plafond: 'budget', libererInutilises: true, cloture: true,
};

/** La place d'un joueur dans le groupe : c'est elle, pas l'étiquette de son contrat, qui décide de son sort. */
export type StatutSportif = 'cadre' | 'jeune' | 'remplacant' | 'complement' | 'inutilise';
export type ActionContrat = 'prolonger' | 'revaloriser' | 'depart' | 'attendre';
export type RaisonContrat =
  | 'cadre' | 'jeune' | 'remplacant' | 'profondeur' | 'inutilise' | 'veteran'
  | 'politiqueCadres' | 'politiqueJeunes' | 'politiqueRemplacants' | 'accordEnAttente' | 'delai';

export interface DecisionContrat {
  joueurId: string;
  nom: string;
  poste: Coequipier['poste'];
  age: number;
  note: number;
  potentiel: number;
  statut: StatutSportif;
  /** Mois restants sur son contrat. */
  mois: number;
  action: ActionContrat;
  raison: RaisonContrat;
  /** L'ordre de passage : les plus importants négocient d'abord. */
  importance: number;
  salaireActuel: number;
  /** Ce que le dossier devrait coûter par an (estimation avant négociation). */
  salaireEstime: number;
  /** Le salaire au-delà duquel l'assistant ne suit plus. `Infinity` : seule la marge du budget limite. */
  salaireMax: number;
  dureeMax: number;
}

export interface PlanContrats {
  decisions: DecisionContrat[];
  aProlonger: number;
  departs: number;
  enAttente: number;
  /** Hausse de masse salariale estimée si tout se signe. */
  surcoutEstime: number;
  margeSalariale: number;
  budgetPrimes: number;
}

export type IssueContrat = 'signe' | 'echec' | 'refus' | 'depart' | 'attente';
export type MotifContrat = 'tropCher' | 'budget' | 'statut' | 'duree' | 'veutPartir' | 'delai' | 'politique';

export interface ResultatContrat {
  joueurId: string;
  nom: string;
  note: number;
  issue: IssueContrat;
  motif?: MotifContrat;
  /** Ce que le joueur réclamait, et ce qui a été signé. */
  salaireDemande?: number;
  salaire?: number;
  prime?: number;
  duree?: number;
  tours?: number;
}

export interface OptionsContrats {
  /** « Tout régler maintenant » et la clôture : chaque contrat reçoit une décision, rien n'est laissé à l'entraîneur. */
  toutRegler?: boolean;
  /** À la clôture, seuls les contrats qui s'arrêtent à la fin de CETTE saison comptent, et une rupture récente est définitive. */
  cloture?: boolean;
}

/** Combien de titulaires par famille de poste dans un XV. */
const PLACES_PAR_FAMILLE: Record<string, number> = {
  pilier: 2, talonneur: 1, deuxieme_ligne: 2, troisieme_ligne: 3, demi_melee: 1, demi_ouverture: 1, centre: 2, ailier: 2, arriere: 1,
};

const HAUSSE_MAX: Record<PolitiqueContrats['plafond'], Record<'cadre' | 'jeune' | 'autre', number>> = {
  budget: { cadre: Infinity, jeune: Infinity, autre: 1.1 },
  prudent: { cadre: 1.25, jeune: 1.3, autre: 1.08 },
  serre: { cadre: 1.12, jeune: 1.15, autre: 1 },
};

export function politiqueContrats(m: Pick<Manager, 'politiqueContrats'>): PolitiqueContrats {
  return { ...POLITIQUE_CONTRATS_DEFAUT, ...(m.politiqueContrats ?? {}) };
}

/** Le rang d'un joueur dans sa famille de poste (0 = le meilleur du groupe à ce poste). */
function rangAuPoste(j: Coequipier, effectif: readonly Coequipier[]): { rang: number; places: number } {
  const famille = POSTE_PAR_ID[j.poste]?.famille ?? '';
  const rang = effectif.filter((x) => (POSTE_PAR_ID[x.poste]?.famille ?? '') === famille
    && (x.note > j.note || (x.note === j.note && x.id < j.id))).length;
  return { rang, places: PLACES_PAR_FAMILLE[famille] ?? 1 };
}

export function statutSportif(j: Coequipier, effectif: readonly Coequipier[], partDeJeu: number | null, matchsJoues: number): StatutSportif {
  const { rang, places } = rangAuPoste(j, effectif);
  if (rang < places) return 'cadre';
  if (j.age <= 23 && j.potentiel >= j.note + 4) return 'jeune';
  if (rang < places * 2) return 'remplacant';
  // Au-delà de la doublure : un troisième choix de moins de trente ans qui joue un peu reste une profondeur utile.
  // Le quatrième choix, le troisième choix en fin de parcours et celui qui ne joue jamais ne servent plus.
  const neJouePas = matchsJoues >= 6 && partDeJeu !== null && partDeJeu < .15;
  if (rang < places * 3 && j.age <= 29 && !neJouePas) return 'complement';
  return 'inutilise';
}

const arrondir = (montant: number, pas: number) => Math.max(pas, Math.round(montant / pas) * pas);

/**
 * LE PLAN : chaque contrat qui demande une décision, et ce que l'assistant en ferait.
 * Un contrat demande une décision quand il lui reste un an ou moins, ou que le joueur réclame une revalorisation.
 */
export function planContrats(
  m: Manager, effectif: readonly Coequipier[], politique: PolitiqueContrats = politiqueContrats(m), options: OptionsContrats = {},
): PlanContrats {
  const avancee = m.avancee ?? assurerEtatCarriereAvancee(m, [...effectif]);
  const salaires = new Map(salairesEffectif(m.club, m.saison, m.recrues, avancee.contratsJoueurs).map((x) => [x.joueurId, x.salaire]));
  const matchs = Object.values(m.resultats).filter((r) => r.saison === m.saison && r.club === m.club).length;
  const decisions: DecisionContrat[] = [];
  for (const j of effectif) {
    const contrat = avancee.contratsJoueurs[j.id];
    if (!contrat || contrat.club !== m.club) continue;
    const mois = moisRestantsContrat(contrat.fin, m.saison, m.semaine);
    const expire = contrat.fin <= m.saison + 1;
    const revalorisation = !expire && contrat.demandeRevalorisation && !options.cloture;
    if (!expire && !revalorisation) continue;
    if (avancee.decisionsContrats?.[j.id]?.saison === m.saison) continue;
    const derniere = m.negociations.findLast((n) => n.joueur.id === j.id && n.nature !== 'recrutement' && n.saison === m.saison);
    if (derniere?.etat === 'signee') continue;
    const jeu = tempsDeJeuReclamable(m, j.id, matchs, avancee);
    const statut = statutSportif(j, effectif, jeu.part, matchs);
    const salaireActuel = contrat.salaire || salaires.get(j.id) || 0;
    const cle = statut === 'cadre' ? 'cadre' : statut === 'jeune' ? 'jeune' : 'autre';
    const hausse = statut === 'remplacant' && politique.remplacants === 'oui' && politique.plafond === 'budget' ? Infinity : HAUSSE_MAX[politique.plafond][cle];
    const base = { joueurId: j.id, nom: j.nom, poste: j.poste, age: j.age, note: j.note, potentiel: j.potentiel, statut, mois,
      importance: Math.round((j.note + (statut === 'cadre' ? 30 : statut === 'jeune' ? 14 + (j.potentiel - j.note) : statut === 'remplacant' ? 6 : 0)) * 10) / 10,
      salaireActuel, salaireEstime: salaireActuel > 0 ? arrondir(salaireActuel * (revalorisation ? 1.22 : 1.1), 5_000) : 0,
      salaireMax: salaireActuel > 0 && Number.isFinite(hausse) ? arrondir(salaireActuel * hausse, 5_000) : Infinity,
      dureeMax: j.age > 32 ? politique.dureeVeterans : 5 };
    const decider = (action: ActionContrat, raison: RaisonContrat) => decisions.push({ ...base, action, raison });
    // Une rupture de moins de quatre semaines : le joueur ne revient pas à la table tout de suite. À la clôture, c'est fini.
    if (derniere?.etat === 'rompue' && m.semaine < derniere.semaine + 4) { decider(options.cloture ? 'depart' : 'attendre', 'delai'); continue; }
    if (derniere?.etat === 'accord') { decider(revalorisation ? 'revaloriser' : 'prolonger', 'accordEnAttente'); continue; }
    if (revalorisation) {
      // Une revalorisation ne se discute d'office que pour ceux qu'on tient à garder ; les autres attendent l'entraîneur.
      if ((statut === 'cadre' && politique.cadres) || (statut === 'jeune' && politique.jeunes)) decider('revaloriser', statut);
      continue;
    }
    if (statut === 'cadre') decider(politique.cadres || options.toutRegler ? 'prolonger' : 'attendre', politique.cadres || options.toutRegler ? 'cadre' : 'politiqueCadres');
    else if (statut === 'jeune') decider(politique.jeunes || options.toutRegler ? 'prolonger' : 'attendre', politique.jeunes || options.toutRegler ? 'jeune' : 'politiqueJeunes');
    else if (statut === 'remplacant') decider(politique.remplacants === 'non' ? 'depart' : 'prolonger', politique.remplacants === 'non' ? 'politiqueRemplacants' : 'remplacant');
    else if (statut === 'inutilise') decider(politique.libererInutilises || options.toutRegler ? 'depart' : 'attendre', j.age >= 30 ? 'veteran' : 'inutilise');
    else decider(politique.remplacants === 'non' ? 'depart' : 'prolonger', politique.remplacants === 'non' ? 'politiqueRemplacants' : 'profondeur');
  }
  decisions.sort((a, b) => b.importance - a.importance);
  const situation = situationSalariale({ ...m, avancee });
  const negocies = decisions.filter((d) => d.action === 'prolonger' || d.action === 'revaloriser');
  return {
    decisions,
    aProlonger: negocies.length,
    departs: decisions.filter((d) => d.action === 'depart').length,
    enAttente: decisions.filter((d) => d.action === 'attendre').length,
    surcoutEstime: negocies.reduce((n, d) => n + Math.max(0, d.salaireEstime - d.salaireActuel), 0),
    margeSalariale: situation.disponible,
    budgetPrimes: m.budgetTransferts,
  };
}

/** Ce que l'assistant met sur la table à ce tour : la demande du joueur, pesée, plafonnée. */
function offreDuTour(
  exigences: TermesRecrutementManager, part: number, partPrime: number,
  limites: { salaireMax: number; primeMax: number; dureeMax: number; cadreMerite: boolean },
): TermesRecrutementManager {
  const amateur = contratAmateur(exigences);
  return {
    ...exigences,
    salaire: exigences.salaire > 0 ? Math.min(limites.salaireMax, arrondir(exigences.salaire * part, 5_000)) : 0,
    prime: exigences.prime > 0 ? Math.max(0, Math.min(limites.primeMax, arrondir(exigences.prime * partPrime, 2_500))) : 0,
    primeMatch: amateur ? Math.max(15, Math.round((exigences.primeMatch ?? 0) * Math.min(1, part) / 5) * 5) : exigences.primeMatch ?? 0,
    duree: Math.max(1, Math.min(exigences.duree, limites.dureeMax)),
    // ⚠️ UN STATUT DE CADRE EST UNE PROMESSE (`signerRenegociationJoueur` l'inscrit) : l'assistant ne la fait pas à la
    //    place de l'entraîneur pour un joueur qui n'est pas titulaire à son poste.
    role: exigences.role === 'cadre' && !limites.cadreMerite ? 'rotation' : exigences.role,
  };
}

/** Les paliers de la négociation : part de la demande salariale, part de la prime à la signature. */
const TOURS: readonly (readonly [number, number])[] = [[.9, .6], [.94, .8], [.98, 1], [1.04, 1]];

/**
 * LES NÉGOCIATIONS. Chaque dossier consomme la marge salariale et le budget de primes des suivants : l'ordre du plan
 * (les plus importants d'abord) est donc une vraie priorité.
 */
export function executerPlan(
  depart: Manager, effectif: readonly Coequipier[], plan: PlanContrats, options: OptionsContrats = {},
): { manager: Manager; resultats: ResultatContrat[] } {
  let m: Manager = { ...depart, avancee: depart.avancee ?? assurerEtatCarriereAvancee(depart, [...effectif]) };
  const resultats: ResultatContrat[] = [];
  const noterDepart = (a: EtatCarriereAvancee, id: string): EtatCarriereAvancee => ({
    ...a, decisionsContrats: { ...(a.decisionsContrats ?? {}), [id]: { saison: m.saison, decision: 'depart' } },
  });
  for (const d of plan.decisions) {
    const avancee = m.avancee!;
    const base = { joueurId: d.joueurId, nom: d.nom, note: d.note };
    if (d.action === 'attendre') { resultats.push({ ...base, issue: 'attente', motif: d.raison === 'delai' ? 'delai' : 'politique' }); continue; }
    if (d.action === 'depart') {
      m = { ...m, avancee: noterDepart(avancee, d.joueurId) };
      resultats.push({ ...base, issue: 'depart', motif: d.raison === 'delai' ? 'delai' : 'politique' });
      continue;
    }
    const existante = m.negociations.findLast((n) => n.joueur.id === d.joueurId && n.nature !== 'recrutement'
      && (n.etat === 'ouverte' || n.etat === 'accord'));
    let nego: NegociationManager | undefined = existante ?? ouvrirRenegociationJoueur(avancee, m, [...effectif], d.joueurId);
    if (!nego) continue;
    const enregistrer = (n: NegociationManager) => {
      m = { ...m, negociations: m.negociations.some((x) => x.id === n.id) ? m.negociations.map((x) => x.id === n.id ? n : x) : [...m.negociations, n] };
    };
    // Il veut partir : aucune offre ne le retient, et l'assistant n'insiste pas.
    if (nego.refusProlongation) {
      enregistrer(nego);
      if (options.toutRegler || options.cloture) m = { ...m, avancee: noterDepart(m.avancee!, d.joueurId) };
      resultats.push({ ...base, issue: 'refus', motif: 'veutPartir', salaireDemande: nego.exigences.salaire });
      continue;
    }
    const salaireActuel = salairesEffectif(m.club, m.saison, m.recrues, avancee.contratsJoueurs)
      .find((x) => x.joueurId === d.joueurId || x.nom === d.nom)?.salaire ?? 0;
    const marge = situationSalariale(m).disponible + salaireActuel;
    const limites = { salaireMax: Math.min(d.salaireMax, Math.max(0, marge)), primeMax: Math.max(0, m.budgetTransferts),
      dureeMax: d.dureeMax, cadreMerite: d.statut === 'cadre' };
    const demande = nego.exigences.salaire;
    let tours = 0;
    // Trois offres sous la demande, de plus en plus proches.
    while (nego.etat === 'ouverte' && tours < TOURS.length - 1) {
      const [part, partPrime] = TOURS[tours];
      nego = negocierAvecJoueur(nego, 'salaire', offreDuTour(nego.exigences, part, partPrime, limites)).negociation;
      tours++;
    }
    // Le joueur n'a pas cédé : sa contre-proposition est acceptée telle quelle si elle tient dans ce que la politique
    // autorise (salaire, prime, durée, statut) ; sinon une dernière offre au plafond, à prendre ou à laisser.
    const ex = nego.exigences;
    const raisonnable = ex.salaire <= limites.salaireMax && ex.prime <= limites.primeMax && ex.duree <= limites.dureeMax
      && (ex.role !== 'cadre' || limites.cadreMerite);
    if (nego.etat === 'ouverte') {
      const [part, partPrime] = TOURS[TOURS.length - 1];
      nego = raisonnable ? accepterDemandesJoueur(nego) : negocierAvecJoueur(nego, 'salaire', offreDuTour(ex, part, partPrime, limites)).negociation;
      tours++;
    }
    const tient = nego.etat === 'accord' && nego.offre.salaire <= marge && nego.offre.prime <= m.budgetTransferts;
    if (!tient) {
      const rompue: NegociationManager = { ...nego, etat: 'rompue', semaine: m.semaine };
      enregistrer(rompue);
      if (options.toutRegler || options.cloture) m = { ...m, avancee: noterDepart(m.avancee!, d.joueurId) };
      // Pourquoi : la marge du budget, le plafond de la politique, un statut de cadre qu'on ne promet pas, une durée trop longue.
      const motif: MotifContrat = demande > marge || ex.prime > m.budgetTransferts ? 'budget'
        : ex.salaire > limites.salaireMax ? 'tropCher'
          : ex.role === 'cadre' && !limites.cadreMerite ? 'statut' : ex.duree > limites.dureeMax ? 'duree' : 'tropCher';
      resultats.push({ ...base, issue: 'echec', motif, salaireDemande: demande, tours });
      continue;
    }
    const signee: NegociationManager = { ...nego, etat: 'signee' };
    enregistrer(signee);
    const apres = signerRenegociationJoueur(m.avancee!, signee, { semaine: m.semaine, feuilles: m.tempsDeJeu[d.joueurId] ?? 0 });
    const decisionsContrats = { ...(apres.decisionsContrats ?? {}) };
    delete decisionsContrats[d.joueurId];
    m = { ...m, budgetTransferts: m.budgetTransferts - signee.offre.prime, avancee: { ...apres, decisionsContrats } };
    resultats.push({ ...base, issue: 'signe', salaireDemande: demande, salaire: signee.offre.salaire, prime: signee.offre.prime,
      duree: signee.offre.duree, tours });
  }
  return { manager: m, resultats };
}

/** Plan et exécution d'un seul geste : « Tout régler maintenant », et la clôture de la saison. */
export function reglerLesContrats(
  m: Manager, effectif: readonly Coequipier[], politique: PolitiqueContrats = politiqueContrats(m), options: OptionsContrats = {},
): { manager: Manager; resultats: ResultatContrat[]; plan: PlanContrats } {
  const avecEtat: Manager = { ...m, avancee: m.avancee ?? assurerEtatCarriereAvancee(m, [...effectif]) };
  const plan = planContrats(avecEtat, effectif, politique, options);
  return { ...executerPlan(avecEtat, effectif, plan, options), plan };
}

/** Le départ est-il acté pour ce joueur cette saison (l'assistant ou l'entraîneur a décidé de ne pas prolonger) ? */
export function departActe(avancee: Pick<EtatCarriereAvancee, 'decisionsContrats'> | undefined, joueurId: string, saison: number): boolean {
  return avancee?.decisionsContrats?.[joueurId]?.saison === saison;
}

export type { ContratJoueurAvance };
