// ═══════════════════════════════════════════════════════════════════════════
// LA CARRIÈRE AVANCÉE — un monde qui se souvient et dont les systèmes parlent
// ═══════════════════════════════════════════════════════════════════════════
//
// Cette couche relie les briques déjà présentes (championnats, effectifs,
// recrutement, histoire, identité) au lieu d'ajouter des scènes sans mémoire.
// Elle reste pure : le store décide quand l'appeler et persiste le résultat.

import { COMPETITIONS, NOTE_PAR_NIVEAU, competitionDuClub } from '../data/clubs.js';
import { SELECTIONS_SENIOR } from '../data/selections.js';
import type {
  ApprocheClubManager, Manager, MotivationContratManager, NegociationManager, OptionContratManager,
  ResultatMatchManager, RoleRecrueManager,
} from '../types.js';
import { approcheAGenerer } from './approchesClubs.js';
import { graine, enregistrerResultatJoue, type MatchChampionnat } from './championnat.js';
import { fenetresDeNation, finDeRassemblement, type RassemblementInternational } from './rassemblements.js';
import { effectifNational, matchInternationalDuJoueur } from './international.js';
import { libelleDate, semaine as dateSemaine, SEMAINES_PAR_SAISON } from '../data/calendrier.js';
import type { Coequipier } from './effectif.js';
import { forceEffectif } from './effectif.js';
import {
  ajouterSaison, archiver, compacter, elaguer,
  type CarriereJoueur, type HistoireDuMonde, type SaisonDeJoueur,
} from './histoire.js';
import {
  apresLaSaison, apresLaSaisonRivalite, clePaire, identiteHistorique,
  intensiteDeDepart, type Identite, type Rivalite,
} from './identiteClub.js';
import { nomNation } from './nations.js';
import { evaluerObjectif, objectifsDeSaison, type IndicateurObjectif } from './objectifsManager.js';
import { phaseFinaleDe, resoudreSaisonClub } from './promotion.js';
import {
  apresResultatProfonde, assurerEtatCarriereProfonde, avancerSemaineProfonde,
  compatibiliteManagerClub, creerEtatCarriereProfonde, finSaisonProfonde,
  revenusMarketingProfonde, type EtatCarriereProfonde,
} from './carriereProfonde.js';
import { salaire } from './offres.js';
import { forceDuGroupe, ouvrirNegociationManager, salairesEffectif } from './recrutementManager.js';
import { pseudoStable } from './comptes.js';

const borne = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export type CategorieObjectif = 'sportif' | 'financier' | 'formation' | 'recrutement' | 'identite';
export type ImportanceObjectif = 1 | 2 | 3;

export interface ObjectifDirection {
  id: string;
  indicateur: IndicateurObjectif;
  categorie: CategorieObjectif;
  titre: string;
  detail: string;
  importance: ImportanceObjectif;
  cible: number;
  progression: number;
  etat: 'enCours' | 'reussi' | 'echoue';
}

export type TraitPersonnalite =
  | 'professionnel' | 'ambitieux' | 'loyal' | 'leader' | 'calme'
  | 'travailleur' | 'individualiste' | 'fetard' | 'mercenaire' | 'mauvaisPerdant';
export type RangVestiaire = 'leader' | 'influent' | 'groupe' | 'nouveau';

export interface ProfilVestiaire {
  joueurId: string;
  nom: string;
  traits: TraitPersonnalite[];
  rang: RangVestiaire;
  satisfaction: number;
  relationManager: number;
  moral: number;
  soutien: boolean;
  derniereSaison: number;
}

export type TypeDiscussion = 'tempsDeJeu' | 'contrat' | 'depart' | 'role' | 'pret' | 'resultats';
export interface DiscussionJoueurAvancee {
  id: string;
  joueurId: string;
  nom: string;
  type: TypeDiscussion;
  semaine: number;
  texte: string;
  etat: 'ouverte' | 'close';
  reponse?: ReponseDiscussion;
}
export type ReponseDiscussion = 'promettre' | 'merite' | 'aucunePromesse' | 'ecarter';

export interface PromesseJoueur {
  id: string;
  joueurId: string;
  nom: string;
  type: 'PLAYTIME_PROMISE' | 'CONTRACT_PROMISE' | 'ROLE_PROMISE' | 'LOAN_PROMISE';
  date: number;
  echeance: number;
  objectif: number;
  depart: number;
  progression: number;
  etat: 'active' | 'respectee' | 'rompue';
}

export type ZoneMedicale = 'genou' | 'cheville' | 'epaule' | 'ischio' | 'commotion' | 'dos';
export type PhaseMedicale = 'suspicion' | 'diagnostic' | 'guerison' | 'reprise' | 'clos';
export type DecisionMedicale =
  | 'attente' | 'repos' | 'traitement' | 'disponible' | 'forcer'
  | 'reprise20' | 'reprise40' | 'reserve' | 'retourDirect';

export interface PlanChargeHebdo {
  physique: 0 | 1 | 2 | 3;
  contacts: 0 | 1 | 2 | 3;
  sprint: 0 | 1 | 2 | 3;
  melee: 0 | 1 | 2 | 3;
  recuperation: 0 | 1 | 2 | 3;
}

export interface HistoriqueMedicalJoueur {
  zone: ZoneMedicale;
  type: string;
  saison: number;
  semaine: number;
  gravite: DossierMedical['gravite'];
  rechute: boolean;
  sequelle: number;
  /** Jours d'absence réellement facturés. Optionnel : les dossiers antérieurs ne l'ont pas. */
  jours?: number;
}

/**
 * UNE SAISON DE DISPONIBILITÉ, COMPTÉE ET NON ESTIMÉE.
 *
 * ⚠️ C'EST LE CHIFFRE QUI MANQUAIT AVANT DE SIGNER UN GROS CONTRAT. Un
 * excellent joueur de 32 ans à 68 % de disponibilité et un jeune jamais blessé
 * ne se prolongent pas de la même façon — mais encore faut-il que l'écran le
 * dise. Ces quatre compteurs sont incrémentés après chaque match et chaque
 * semaine, jamais reconstruits après coup.
 */
export interface DisponibiliteSaison {
  saison: number;
  /** Matchs que le club a joués pendant qu'il appartenait au groupe. */
  possibles: number;
  /** Ceux où il était réellement sélectionnable (ni blessé, ni en sélection). */
  disponibles: number;
  titularisations: number;
  semainesBlessees: number;
  joursBlesse: number;
}

export interface ProfilMedicalJoueur {
  joueurId: string;
  fragiliteNaturelle: number;
  zones: Record<ZoneMedicale, number>;
  historique: HistoriqueMedicalJoueur[];
  commotions: number;
  sequelles: Partial<Record<ZoneMedicale, number>>;
  fatigue: number;
  condition: number;
  rythme: number;
  /** Les quatre dernières saisons, la plus récente en dernier. */
  disponibilites?: DisponibiliteSaison[];
}

export interface ContratJoueurAvance {
  joueurId: string;
  nom: string;
  club: string;
  debut: number;
  fin: number;
  salaire: number;
  role: RoleRecrueManager;
  option: OptionContratManager;
  motivations: { type: MotivationContratManager; importance: number }[];
  satisfaction: number;
  interetExterieur: number;
  offresExterieures: number;
  demandeRevalorisation: boolean;
  derniereNegociation?: number;
  /** La saison où il est arrivé au club. Sert d'ancienneté à l'attachement. */
  arrivee?: number;
  /**
   * L'ATTACHEMENT AU CLUB, 0-100.
   *
   * ⚠️ CE N'EST PAS LA SATISFACTION. La satisfaction dit s'il est content
   * cette saison ; l'attachement dit s'il se voit finir ici. Un joueur peut
   * être mécontent de son temps de jeu et refuser malgré tout de partir, ou
   * adorer le club et vouloir quand même découvrir l'étage du dessus. Il monte
   * lentement — ancienneté, matchs, brassard, titres — et ne redescend
   * brutalement que si on le déçoit.
   */
  attachement: number;
  /** Club formateur : il y a signé son premier contrat. Pèse lourd et ne change jamais. */
  formeAuClub?: boolean;
}

export interface DossierMedical {
  id: string;
  joueurId: string;
  nom: string;
  type: string;
  gravite: 'legere' | 'moyenne' | 'grave';
  disponibilite: number;
  douleur: number;
  risqueAggravation: number;
  semaines: number;
  decision: DecisionMedicale;
  penalitePerformance: number;
  saison: number;
  semaine: number;
  phase?: PhaseMedicale;
  zone?: ZoneMedicale;
  origine?: 'match' | 'entrainement';
  activite?: string;
  minute?: number;
  diagnosticInitial?: string;
  diagnosticDans?: number;
  guerison?: number;
  condition?: number;
  rythme?: number;
  risqueRechute?: number;
  protocoleCommotion?: boolean;
  rechute?: boolean;
}


/** Les dossiers en cours, par identifiant de joueur — pour l'écran et la compo. */
export function blessuresParJoueur(
  medical: readonly DossierMedical[] | undefined,
): Map<string, DossierMedical> {
  const par = new Map<string, DossierMedical>();
  for (const d of medical ?? []) {
    if (d.semaines <= 0) continue;
    // Le dossier le plus grave l'emporte si un joueur en cumule deux.
    const avant = par.get(d.joueurId);
    if (!avant || d.semaines > avant.semaines) par.set(d.joueurId, d);
  }
  return par;
}


export interface ConvocationClub {
  rassemblement?: RassemblementInternational;
  id: string;
  joueurId: string;
  nom: string;
  nation: string;
  debut: number;
  fin: number;
  competition: string;
  titularisations: number;
  essais: number;
  points: number;
}

export interface ConnaissanceJoueur {
  joueurId: string;
  observations: number;
  derniereSaison: number;
  paysConnu: boolean;
}

export interface RapportConnaissance {
  niveau: 'inconnu' | 'partiel' | 'complet';
  note: [number, number];
  /**
   * LE « GÉNÉRAL » QU'ON IMPRIME SUR LA CARTE : l'estimation centrale du
   * service de recrutement.
   *
   * ⚠️ IL A FALLU L'AJOUTER, ET C'ÉTAIT LE BUG SIGNALÉ (« dans le marché
   * mondial, fix les généraux »). L'écran n'avait que `note`, une FOURCHETTE,
   * et l'imprimait telle quelle : « 78–100 », « 81–100 », « 74–100 ». Trois
   * défauts d'un coup — une amplitude de vingt-quatre points qui ne dit rien,
   * une borne haute à 100 alors qu'aucun joueur du jeu ne dépasse 99 (donc un
   * chiffre visiblement faux sur presque toutes les cartes), et surtout
   * l'impossibilité de comparer deux cibles d'un coup d'œil : c'est justement
   * ce qu'un général sert à faire.
   *
   * On rend donc les deux : un NOMBRE à afficher en gros, et la MARGE qui
   * l'accompagne. L'incertitude du scouting est conservée entière — elle est
   * simplement dite « 84 ± 9 » au lieu de « 75–93 ».
   */
  estimation: number;
  /** La marge d'erreur du rapport, en points. Zéro quand il est complet. */
  marge: number;
  potentiel: [number, number] | null;
  salaire: [number, number] | null;
  personnalite: TraitPersonnalite | null;
}

export interface AgentPersistant {
  id: string;
  nom: string;
  reputation: number;
  reseau: number;
  agressivite: number;
  difficulte: number;
  interetFinancier: number;
  relationManager: number;
  joueurs: string[];
}

export interface OffreBancManager {
  id: string;
  club: string;
  division: string;
  salaire: number;
  duree: number;
  statut: 'offre' | 'candidature' | 'refusee' | 'acceptee';
  exigePrestige: number;
  saison: number;
}

export interface EntraineurIA {
  id: string;
  nom: string;
  club: string;
  reputation: number;
  confiance: number;
  contrat: number;
  saisons: number;
}

export interface ClubDynamique {
  club: string;
  richesse: number;
  infrastructures: number;
  strategie: 'formation' | 'local' | 'equilibre' | 'international' | 'stars';
  professionnel: boolean;
  entraineurId: string;
  tendance: number;
}

export interface ActualiteCarriere {
  id: string;
  saison: number;
  semaine: number;
  categorie: 'resultat' | 'manager' | 'transfert' | 'blessure' | 'international' | 'finance' | 'formation' | 'record';
  titre: string;
  texte: string;
  club?: string;
  importance: 1 | 2 | 3;
}

export interface StaffAncienJoueur {
  id: string;
  joueurId: string;
  nom: string;
  club: string;
  role: 'entraineur' | 'jeunes' | 'preparateur' | 'recruteur' | 'directeurSportif';
  reputation: number;
  joueurDepuis: number;
}

export interface CarriereInternationaleManager {
  nation: string;
  reputation: number;
  cumulClub: boolean;
  matchs: number;
  victoires: number;
  titres: string[];
  depuis: number;
  resultats?: Record<string, MatchChampionnat>;
  matchEnAttente?: { id: string; adversaire: string; competition: string; semaine: number; match?: MatchChampionnat; domicile?: boolean; elimination?: boolean };
}

export interface PropositionSelection {
  nation: string;
  reputationDemandee: number;
  cumulClub: boolean;
  saison: number;
}

export interface EtatCarriereAvancee {
  version: 1;
  profonde: EtatCarriereProfonde;
  objectifs: ObjectifDirection[];
  dernierBilanObjectifs?: { saison: number; club: string; objectifs: ObjectifDirection[] };
  vestiaire: Record<string, ProfilVestiaire>;
  discussions: DiscussionJoueurAvancee[];
  promesses: PromesseJoueur[];
  medical: DossierMedical[];
  profilsMedicaux: Record<string, ProfilMedicalJoueur>;
  chargeEntrainement: PlanChargeHebdo;
  contratsJoueurs: Record<string, ContratJoueurAvance>;
  /** Les clubs qui viennent chercher un joueur qu'on n'a pas mis en vente. */
  approches: ApprocheClubManager[];
  convocations: ConvocationClub[];
  connaissances: Record<string, ConnaissanceJoueur>;
  agents: AgentPersistant[];
  offresBanc: OffreBancManager[];
  entraineursIA: Record<string, EntraineurIA>;
  clubsMonde: Record<string, ClubDynamique>;
  actualites: ActualiteCarriere[];
  histoire: HistoireDuMonde;
  carrieresJoueurs: CarriereJoueur[];
  identites: Record<string, Identite>;
  rivalites: Rivalite[];
  staffAnciens: StaffAncienJoueur[];
  selection?: CarriereInternationaleManager;
  propositionSelection?: PropositionSelection;
}

const TOUS_LES_CLUBS = [...new Set(COMPETITIONS.flatMap((c) => c.clubs.map((club) => club.nom)))];
const PRENOMS_COACH = ['Julien', 'Ronan', 'Mathieu', 'Fabien', 'Ugo', 'Patrice', 'Joe', 'Scott', 'Diego', 'Tana', 'Gonzalo', 'Pierre'];
const NOMS_COACH = ['Delmas', 'O’Connor', 'Martinez', 'Brunel', 'Davies', 'Ledesma', 'Ryan', 'Mola', 'Smith', 'Collazo', 'Galthier', 'Farrell'];

function profilDuJoueur(j: Coequipier, capitaineId: string, saison: number): ProfilVestiaire {
  const rng = graine(`personnalite#${j.id}`);
  const positifs: TraitPersonnalite[] = ['professionnel', 'ambitieux', 'loyal', 'leader', 'calme', 'travailleur'];
  const difficiles: TraitPersonnalite[] = ['individualiste', 'fetard', 'mercenaire', 'mauvaisPerdant'];
  const traits: TraitPersonnalite[] = [positifs[Math.floor(rng() * positifs.length)]];
  if (rng() > 0.32) traits.push(positifs[Math.floor(rng() * positifs.length)]);
  if (rng() > 0.76) traits.push(difficiles[Math.floor(rng() * difficiles.length)]);
  if (j.id === capitaineId && !traits.includes('leader')) traits.push('leader');
  const rang: RangVestiaire = j.id === capitaineId || (j.age >= 30 && j.note >= 66)
    ? 'leader' : j.age >= 27 && j.note >= 62 ? 'influent' : j.age <= 22 || j.regen ? 'nouveau' : 'groupe';
  return {
    joueurId: j.id, nom: j.nom, traits: [...new Set(traits)], rang,
    satisfaction: 66, relationManager: 55, moral: 64, soutien: true,
    derniereSaison: saison,
  };
}

export const CHARGE_HEBDO_DEFAUT: PlanChargeHebdo = {
  physique: 2, contacts: 1, sprint: 1, melee: 1, recuperation: 2,
};

function profilMedicalInitial(j: Coequipier): ProfilMedicalJoueur {
  const rng = graine(`profil-medical#${j.id}`);
  const avant = ['pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g', 'deuxieme_ligne_d', 'troisieme_aile_g', 'troisieme_aile_d', 'numero_8'].includes(j.poste);
  const vitesse = ['ailier_gauche', 'ailier_droit', 'arriere', 'premier_centre', 'deuxieme_centre'].includes(j.poste);
  const base = 18 + Math.round(rng() * 42);
  const zone = (bonus = 0) => borne(base * .6 + rng() * 28 + bonus);
  return {
    joueurId: j.id,
    fragiliteNaturelle: base,
    zones: {
      genou: zone(avant ? 9 : 2), cheville: zone(vitesse ? 10 : 2),
      epaule: zone(avant ? 11 : 3), ischio: zone(vitesse ? 14 : 1),
      commotion: zone(avant ? 7 : 2), dos: zone(avant ? 8 : 1),
    },
    historique: [], commotions: 0, sequelles: {}, fatigue: 20, condition: 100, rythme: 100,
    disponibilites: [],
  };
}

/** La ligne de la saison en cours, créée à la volée et jamais dupliquée. */
function ligneDisponibilite(profil: ProfilMedicalJoueur, saison: number): DisponibiliteSaison[] {
  const lignes = [...(profil.disponibilites ?? [])];
  if (!lignes.some((d) => d.saison === saison)) {
    lignes.push({ saison, possibles: 0, disponibles: 0, titularisations: 0, semainesBlessees: 0, joursBlesse: 0 });
  }
  // Quatre saisons suffisent : l'écran en montre trois, la quatrième sert de
  // marge quand une carrière chevauche deux clubs la même année.
  return lignes.sort((a, b) => a.saison - b.saison).slice(-4);
}

/**
 * Le bilan de disponibilité sur les N dernières saisons — le chiffre qu'on
 * regarde AVANT de signer trois ans à un joueur de 32 ans.
 */
export function disponibiliteJoueur(
  profil: ProfilMedicalJoueur | undefined, saison: number, saisons = 3,
): { possibles: number; disponibles: number; titularisations: number; joursBlesse: number; part: number } {
  const lignes = (profil?.disponibilites ?? []).filter((d) => d.saison > saison - saisons);
  const total = lignes.reduce((n, d) => ({
    possibles: n.possibles + d.possibles,
    disponibles: n.disponibles + d.disponibles,
    titularisations: n.titularisations + d.titularisations,
    joursBlesse: n.joursBlesse + d.joursBlesse,
  }), { possibles: 0, disponibles: 0, titularisations: 0, joursBlesse: 0 });
  return { ...total, part: total.possibles ? Math.round(total.disponibles * 1000 / total.possibles) / 10 : 100 };
}

/**
 * LE COMPTE À REBOURS DU CONTRAT, en mois de saison.
 *
 * ⚠️ LE TIMING EST LE VRAI SUJET D'UNE PROLONGATION. À vingt-quatre mois, le
 * joueur est tranquille et ne coûte rien à faire attendre ; à six, chaque
 * semaine qui passe donne un argument à ses prétendants, et à zéro il part
 * libre. Cette fonction est la SEULE définition de ces paliers : l'écran, la
 * pression du marché et le texte de l'agent lisent tous celle-ci.
 */
export function moisRestantsContrat(fin: number, saison: number, semaine: number): number {
  const saisonsPleines = Math.max(0, fin - saison - 1);
  const moisDeLaSaison = Math.max(0, Math.round((SEMAINES_PAR_SAISON - semaine) / SEMAINES_PAR_SAISON * 12));
  return saisonsPleines * 12 + (fin > saison ? moisDeLaSaison : 0);
}

export type PalierContrat = 'serein' | 'discussions' | 'reflexion' | 'danger' | 'libre';

export function palierContrat(mois: number): PalierContrat {
  if (mois <= 0) return 'libre';
  if (mois <= 6) return 'danger';
  if (mois <= 12) return 'reflexion';
  if (mois <= 18) return 'discussions';
  return 'serein';
}

function motivationsContrat(p: ProfilVestiaire, j: Coequipier): ContratJoueurAvance['motivations'] {
  const rng = graine(`motivations-contrat#${j.id}`);
  const choix: MotivationContratManager[] = p.traits.includes('mercenaire') ? ['argent', 'agent', 'ambition']
    : p.traits.includes('loyal') ? ['attachement', 'stabilite', 'entraineur']
      : p.traits.includes('ambitieux') ? ['ambition', 'tempsDeJeu', 'argent']
        : j.age <= 23 ? ['tempsDeJeu', 'ambition', 'stabilite']
          : ['stabilite', 'argent', 'entraineur'];
  return choix.map((type, index) => ({ type, importance: 64 + Math.round(rng() * 31) - index * 5 }))
    .sort((a, b) => b.importance - a.importance);
}

function contratJoueurInitial(m: Manager, j: Coequipier, p: ProfilVestiaire): ContratJoueurAvance {
  const rng = graine(`contrat-long#${m.club}#${j.id}#${m.saison}`);
  const niveau = competitionDuClub(m.club)?.niveau ?? 8;
  const role: RoleRecrueManager = j.age <= 23 && j.potentiel >= j.note + 4 ? 'espoir'
    : j.note >= forceEffectif(m.club, m.saison) + 1 ? 'cadre' : 'rotation';
  // ⚠️ L'ANCIENNETÉ EXISTE AVANT LA PREMIÈRE SEMAINE DE JEU. Un groupe qu'on
  // reprend n'est pas composé de treize inconnus arrivés hier : sans ce passé
  // tiré une fois pour toutes, aucun joueur n'aurait d'attachement crédible
  // avant la cinquième saison de la sauvegarde.
  const anciennete = Math.min(Math.max(0, j.age - 18), Math.floor(rng() * (j.age >= 29 ? 8 : 4)));
  const formeAuClub = j.age - anciennete <= 20 && rng() > .58;
  return {
    joueurId: j.id, nom: j.nom, club: m.club, debut: m.saison,
    arrivee: m.saison - anciennete, formeAuClub,
    fin: m.saison + 1 + Math.floor(rng() * (j.age >= 31 ? 2 : 4)),
    salaire: niveau > 3 ? 0 : Math.round(salaire(niveau, j.note - forceDuGroupe(m.club, m.saison), j.age)),
    role, option: j.age <= 23 ? 'club' : rng() > .72 ? 'joueur' : 'aucune',
    motivations: motivationsContrat(p, j), satisfaction: p.satisfaction,
    attachement: attachementInitial(j, p, anciennete, formeAuClub),
    interetExterieur: Math.max(0, borne((j.note - forceEffectif(m.club, m.saison)) * 9 + rng() * 28)),
    offresExterieures: 0, demandeRevalorisation: false,
  };
}

/**
 * L'ATTACHEMENT DE DÉPART : ancienneté, formation au club, personnalité.
 *
 * ⚠️ IL N'EST PAS TIRÉ AU SORT. Les trois entrées sont déjà déterminées à ce
 * moment-là, et c'est ce qui permet à l'écran d'expliquer un chiffre — « douze
 * ans au club, formé ici » — plutôt que d'afficher une jauge inexplicable.
 */
function attachementInitial(
  j: Coequipier, p: ProfilVestiaire, anciennete: number, formeAuClub: boolean,
): number {
  return borne(
    22 + Math.min(38, anciennete * 5.5) + (formeAuClub ? 20 : 0)
    + (p.traits.includes('loyal') ? 16 : 0) + (p.traits.includes('leader') ? 6 : 0)
    - (p.traits.includes('mercenaire') ? 20 : 0) - (p.traits.includes('ambitieux') ? 6 : 0)
    + (j.age >= 30 ? 6 : 0),
  );
}

/**
 * L'attachement d'une semaine à l'autre. Il monte LENTEMENT — jouer, porter le
 * brassard, gagner des titres, rester — et ne chute que sur une vraie déception.
 */
function evoluerAttachement(
  c: ContratJoueurAvance, m: Manager, j: Coequipier, p: ProfilVestiaire | undefined, partDeJeu: number,
): number {
  const anciennete = Math.max(0, m.saison - (c.arrivee ?? c.debut));
  const capitaine = m.composition.capitaineId === j.id;
  const titres = m.palmares.filter((t) => t.club === m.club).length;
  const gain = 0.10 + anciennete * 0.035 + partDeJeu * 0.14 + (capitaine ? 0.12 : 0)
    + (c.formeAuClub ? 0.05 : 0) + Math.min(0.2, titres * 0.05);
  const perte = Math.max(0, 48 - c.satisfaction) * 0.022
    + Math.max(0, 45 - (p?.relationManager ?? 55)) * 0.018
    + (p?.traits.includes('mercenaire') ? 0.06 : 0);
  return borne(c.attachement + gain - perte);
}

function normaliserDossier(d: DossierMedical): DossierMedical {
  const zone: ZoneMedicale = d.zone ?? (d.type.toLowerCase().includes('genou') ? 'genou'
    : d.type.toLowerCase().includes('muscul') ? 'ischio' : 'epaule');
  return {
    ...d, phase: d.phase ?? (d.semaines > 0 ? 'diagnostic' : 'clos'), zone,
    origine: d.origine ?? 'match', diagnosticInitial: d.diagnosticInitial ?? d.type,
    diagnosticDans: d.diagnosticDans ?? 0,
    guerison: d.guerison ?? (d.semaines <= 0 ? 100 : Math.max(5, 100 - d.semaines * 12)),
    condition: d.condition ?? (d.semaines <= 0 ? 82 : Math.max(25, 100 - d.semaines * 7)),
    rythme: d.rythme ?? (d.semaines <= 0 ? 68 : Math.max(15, 100 - d.semaines * 9)),
    risqueRechute: d.risqueRechute ?? d.risqueAggravation,
    protocoleCommotion: d.protocoleCommotion ?? zone === 'commotion', rechute: d.rechute ?? false,
  };
}

function creerAgents(): AgentPersistant[] {
  return Array.from({ length: 12 }, (_, i) => {
    const rng = graine(`agent-avance#${i}`);
    return {
      id: `agent-avance-${i}`, nom: `${PRENOMS_COACH[(i + 3) % PRENOMS_COACH.length]} ${NOMS_COACH[(i * 5 + 1) % NOMS_COACH.length]}`,
      reputation: 28 + Math.round(rng() * 69), reseau: 25 + Math.round(rng() * 72),
      agressivite: 15 + Math.round(rng() * 80), difficulte: 22 + Math.round(rng() * 73),
      interetFinancier: 18 + Math.round(rng() * 80), relationManager: 50, joueurs: [],
    };
  });
}

function rattacherAgents(agents: AgentPersistant[], effectif: Coequipier[]): AgentPersistant[] {
  const suivants = agents.map((a) => ({ ...a, joueurs: [...a.joueurs] }));
  for (const j of effectif) {
    const rng = graine(`representation#${j.id}`);
    const index = Math.floor(rng() * suivants.length);
    if (!suivants[index].joueurs.includes(j.id)) suivants[index].joueurs.push(j.id);
  }
  return suivants;
}

function mondeInitial(): Pick<EtatCarriereAvancee, 'entraineursIA' | 'clubsMonde' | 'identites'> {
  const entraineursIA: Record<string, EntraineurIA> = {};
  const clubsMonde: Record<string, ClubDynamique> = {};
  const identites: Record<string, Identite> = {};
  for (let i = 0; i < TOUS_LES_CLUBS.length; i++) {
    const club = TOUS_LES_CLUBS[i];
    const rng = graine(`monde-club#${club}`);
    const niveau = competitionDuClub(club)?.niveau ?? 8;
    const coachId = `coach-${i}`;
    entraineursIA[coachId] = {
      id: coachId,
      nom: `${PRENOMS_COACH[Math.floor(rng() * PRENOMS_COACH.length)]} ${NOMS_COACH[Math.floor(rng() * NOMS_COACH.length)]}`,
      club, reputation: borne(forceEffectif(club, 1) + rng() * 16 - 8), confiance: 48 + Math.round(rng() * 34),
      contrat: 1 + Math.floor(rng() * 4), saisons: 0,
    };
    const strategies: ClubDynamique['strategie'][] = ['formation', 'local', 'equilibre', 'international', 'stars'];
    clubsMonde[club] = {
      club, richesse: borne((NOTE_PAR_NIVEAU[niveau] ?? 30) + rng() * 18),
      infrastructures: borne(18 + (10 - niveau) * 5 + rng() * 24),
      strategie: strategies[Math.floor(rng() * strategies.length)],
      professionnel: niveau <= 4, entraineurId: coachId, tendance: 0,
    };
    identites[club] = identiteHistorique(club);
  }
  return { entraineursIA, clubsMonde, identites };
}

export function creerEtatCarriereAvancee(m: Manager, effectif: Coequipier[]): EtatCarriereAvancee {
  const monde = mondeInitial();
  const vestiaire = Object.fromEntries(effectif.map((j) => [j.id, profilDuJoueur(j, m.composition.capitaineId, m.saison)]));
  const profilsMedicaux = Object.fromEntries(effectif.map((j) => [j.id, profilMedicalInitial(j)]));
  const contratsJoueurs = Object.fromEntries(effectif.map((j) => [j.id, contratJoueurInitial(m, j, vestiaire[j.id])]));
  return {
    version: 1,
    profonde: creerEtatCarriereProfonde(m, effectif),
    objectifs: objectifsDeSaison(m, effectif), vestiaire, discussions: [], promesses: [], medical: [],
    profilsMedicaux, chargeEntrainement: { ...CHARGE_HEBDO_DEFAUT }, contratsJoueurs,
    approches: [], convocations: [],
    connaissances: {}, agents: rattacherAgents(creerAgents(), effectif), offresBanc: [],
    entraineursIA: monde.entraineursIA, clubsMonde: monde.clubsMonde, actualites: [],
    histoire: {}, carrieresJoueurs: [], identites: monde.identites, rivalites: [], staffAnciens: [],
  };
}

/** Le monde reste, mais une nouvelle direction fixe de nouvelles attentes. */
export function changerClubCarriereAvancee(a: EtatCarriereAvancee | undefined, m: Manager, effectif: Coequipier[]): EtatCarriereAvancee {
  const etat = a ? assurerEtatCarriereAvancee({ ...m, avancee: a }, effectif) : creerEtatCarriereAvancee(m, effectif);
  return {
    ...etat,
    profonde: assurerEtatCarriereProfonde(etat.profonde, m, effectif),
    objectifs: objectifsDeSaison(m, effectif),
    vestiaire: Object.fromEntries(effectif.map((j) => [j.id, etat.vestiaire[j.id] ?? profilDuJoueur(j, m.composition.capitaineId, m.saison)])),
    discussions: etat.discussions.map((d) => d.etat === 'ouverte' ? { ...d, etat: 'close' as const, reponse: 'aucunePromesse' as const } : d),
    promesses: etat.promesses.map((p) => p.etat === 'active' ? { ...p, etat: 'rompue' as const } : p),
    medical: etat.medical.map(normaliserDossier).filter((d) => d.phase === 'clos'), convocations: [],
    // Les clubs ne poursuivent pas une approche auprès d'un entraîneur qui a
    // quitté le banc : c'est au nouveau club de traiter ses propres dossiers.
    approches: [],
  };
}

export function assurerEtatCarriereAvancee(m: Manager, effectif: Coequipier[]): EtatCarriereAvancee {
  const a = m.avancee;
  if (!a) return creerEtatCarriereAvancee(m, effectif);
  const vestiaire = { ...a.vestiaire };
  const profilsMedicaux = { ...(a.profilsMedicaux ?? {}) };
  const contratsJoueurs = { ...(a.contratsJoueurs ?? {}) };
  for (const j of effectif) {
    vestiaire[j.id] ??= profilDuJoueur(j, m.composition.capitaineId, m.saison);
    vestiaire[j.id] = { ...vestiaire[j.id], nom: j.nom, derniereSaison: m.saison };
    profilsMedicaux[j.id] ??= profilMedicalInitial(j);
    profilsMedicaux[j.id] = { ...profilsMedicaux[j.id], disponibilites: profilsMedicaux[j.id].disponibilites ?? [] };
    contratsJoueurs[j.id] ??= contratJoueurInitial(m, j, vestiaire[j.id]);
    // ⚠️ UNE SAUVEGARDE ANTÉRIEURE N'A NI ATTACHEMENT NI ANCIENNETÉ, et un
    // `?? 0` les laisserait tous à zéro : le premier club venu emporterait
    // l'effectif entier. On rejoue donc le calcul initial, qui ne dépend que
    // de données déjà présentes (âge, traits) — jamais d'un tirage nouveau.
    const initial = contratsJoueurs[j.id].attachement === undefined
      ? contratJoueurInitial(m, j, vestiaire[j.id]) : null;
    contratsJoueurs[j.id] = {
      ...contratsJoueurs[j.id], nom: j.nom, club: m.club,
      attachement: contratsJoueurs[j.id].attachement ?? initial!.attachement,
      arrivee: contratsJoueurs[j.id].arrivee ?? initial?.arrivee ?? contratsJoueurs[j.id].debut,
      formeAuClub: contratsJoueurs[j.id].formeAuClub ?? initial?.formeAuClub ?? false,
    };
  }
  // Chemin courant : aucun monde de 850 clubs n'est régénéré à chaque rendu.
  // Les trois registres n'ont besoin d'un repli que pour une sauvegarde bêta
  // partielle ; les sauvegardes antérieures n'ont pas `avancee` du tout.
  const incomplet = !a.entraineursIA || !a.clubsMonde || !a.identites;
  const monde = incomplet ? mondeInitial() : null;
  const agents = a.agents?.length ? a.agents : creerAgents();
  return {
    ...a, version: 1, vestiaire, profilsMedicaux, contratsJoueurs,
    approches: a.approches ?? [],
    chargeEntrainement: a.chargeEntrainement ?? { ...CHARGE_HEBDO_DEFAUT },
    medical: (a.medical ?? []).map(normaliserDossier),
    profonde: assurerEtatCarriereProfonde(a.profonde, m, effectif),
    objectifs: a.objectifs?.length && a.objectifs.every((o) => o.indicateur && o.id.endsWith(`-${m.club}-${m.saison}`))
      ? a.objectifs : objectifsDeSaison(m, effectif).map((o) => o.indicateur === 'feuillesJeunes'
        ? { ...o, progression: effectif.filter((j) => j.age <= 22).reduce((n, j) => n + (m.tempsDeJeu[j.id] ?? 0), 0) } : o),
    agents: rattacherAgents(agents, effectif),
    entraineursIA: a.entraineursIA ?? monde!.entraineursIA,
    clubsMonde: a.clubsMonde ?? monde!.clubsMonde,
    identites: a.identites ?? monde!.identites,
  };
}

function nouvelleActualite(a: Omit<ActualiteCarriere, 'id'>): ActualiteCarriere {
  return { ...a, id: `actu-${a.saison}-${a.semaine}-${a.categorie}-${Math.abs(a.texte.length * 97 + a.titre.length)}` };
}

function actualitesBornees(liste: ActualiteCarriere[]): ActualiteCarriere[] {
  return liste.slice(-180);
}

function mettreAJourPromesses(a: EtatCarriereAvancee, m: Manager): EtatCarriereAvancee {
  const vestiaire = { ...a.vestiaire };
  const agents = a.agents.map((agent) => ({ ...agent }));
  const promesses = a.promesses.map((p) => {
    if (p.etat !== 'active') return p;
    const progression = p.type === 'CONTRACT_PROMISE'
      ? p.progression
      : p.type === 'LOAN_PROMISE'
        ? (m.ventes.some((vente) => vente.joueurId === p.joueurId) ? 1 : 0)
        : Math.max(0, (m.tempsDeJeu[p.joueurId] ?? 0) - p.depart);
    const respectee = progression >= p.objectif;
    const rompue = !respectee && m.semaine > p.echeance;
    if (respectee || rompue) {
      const profil = vestiaire[p.joueurId];
      if (profil) vestiaire[p.joueurId] = {
        ...profil,
        satisfaction: borne(profil.satisfaction + (respectee ? 14 : -22)),
        relationManager: borne(profil.relationManager + (respectee ? 12 : -20)),
        moral: borne(profil.moral + (respectee ? 10 : -16)), soutien: respectee,
      };
      const agent = agents.find((x) => x.joueurs.includes(p.joueurId));
      if (agent) agent.relationManager = borne(agent.relationManager + (respectee ? 5 : -11));
    }
    return { ...p, progression, etat: respectee ? 'respectee' as const : rompue ? 'rompue' as const : p.etat };
  });
  return { ...a, vestiaire, agents, promesses };
}

function genererDiscussion(a: EtatCarriereAvancee, m: Manager, effectif: Coequipier[]): EtatCarriereAvancee {
  if (a.discussions.some((d) => d.etat === 'ouverte')) return a;
  const dejaCetteSaison = new Set(a.discussions.filter((d) => d.id.includes(`-${m.saison}-`)).map((d) => d.joueurId));
  const candidat = effectif
    .map((j) => ({ j, p: a.vestiaire[j.id] }))
    .filter(({ j, p }) => p && p.satisfaction < 47 && !dejaCetteSaison.has(j.id))
    .sort((x, y) => x.p.satisfaction - y.p.satisfaction)[0];
  if (!candidat) return a;
  const { j, p } = candidat;
  const temps = m.tempsDeJeu[j.id] ?? 0;
  const type: TypeDiscussion = temps <= 2 ? 'tempsDeJeu'
    : p.traits.includes('ambitieux') && j.note >= forceEffectif(m.club, m.saison) ? 'role'
      : p.traits.includes('mercenaire') ? 'contrat'
        : p.traits.includes('mauvaisPerdant') ? 'resultats' : 'depart';
  const textes: Record<TypeDiscussion, string> = {
    tempsDeJeu: `« Je voudrais jouer davantage. J'ai besoin de savoir si tu comptes vraiment sur moi. »`,
    contrat: `« Mon contrat et mon salaire ne correspondent plus à mon statut dans le groupe. »`,
    depart: `« Je ne me vois plus avancer ici. Si rien ne change, je veux partir. »`,
    role: `« Le rôle que j'occupe n'est pas celui que j'espérais en début de saison. »`,
    pret: `« Un prêt me permettrait de jouer toutes les semaines. »`,
    resultats: `« Les résultats m'inquiètent. Le vestiaire a besoin de savoir où va le club. »`,
  };
  return {
    ...a,
    discussions: [...a.discussions, {
      id: `discussion-${m.saison}-${m.semaine}-${j.id}`, joueurId: j.id, nom: j.nom,
      type, semaine: m.semaine, texte: textes[type], etat: 'ouverte',
    }],
  };
}

function mettreAJourVestiaire(a: EtatCarriereAvancee, m: Manager, effectif: Coequipier[], victoire: boolean, nul: boolean): EtatCarriereAvancee {
  const matchs = Math.max(1, Object.values(m.resultats).filter((r) => r.saison === m.saison && r.club === m.club).length);
  const vestiaire = { ...a.vestiaire };
  for (const j of effectif) {
    const p = vestiaire[j.id] ?? profilDuJoueur(j, m.composition.capitaineId, m.saison);
    const part = (m.tempsDeJeu[j.id] ?? 0) / matchs;
    const attendu = p.rang === 'leader' ? 0.75 : p.rang === 'influent' ? 0.55 : p.rang === 'groupe' ? 0.34 : 0.2;
    const caractere = p.traits.includes('professionnel') || p.traits.includes('calme') ? 0.7 : p.traits.includes('mauvaisPerdant') ? 1.35 : 1;
    const deltaJeu = (part - attendu) * 9 * caractere;
    const deltaResultat = (victoire ? 2.2 : nul ? 0 : -2.8) * caractere;
    vestiaire[j.id] = {
      ...p, rang: j.id === m.composition.capitaineId ? 'leader' : p.rang,
      satisfaction: borne(p.satisfaction + deltaJeu + deltaResultat),
      moral: borne(p.moral + (victoire ? 3 : nul ? 0 : -3)),
      soutien: p.relationManager >= 52 && p.satisfaction >= 48,
    };
  }
  // Les leaders pèsent davantage : un capitaine uni amortit, un meneur fâché entraîne.
  const leaders = Object.values(vestiaire).filter((p) => p.rang === 'leader');
  const onde = leaders.reduce((n, p) => n + (p.soutien ? 1 : -1), 0) * 0.7;
  for (const [id, p] of Object.entries(vestiaire)) {
    if (p.rang !== 'leader') vestiaire[id] = { ...p, moral: borne(p.moral + onde), satisfaction: borne(p.satisfaction + onde * 0.5) };
  }
  return { ...a, vestiaire };
}

const TYPES_PAR_ZONE: Record<ZoneMedicale, [string, string]> = {
  genou: ['Entorse du genou', 'Lésion ligamentaire du genou'],
  cheville: ['Entorse de la cheville', 'Traumatisme de la cheville'],
  epaule: ['Contusion de l’épaule', 'Luxation de l’épaule'],
  ischio: ['Élongation des ischio-jambiers', 'Déchirure des ischio-jambiers'],
  commotion: ['Suspicion de commotion', 'Commotion cérébrale'],
  dos: ['Lombalgie aiguë', 'Lésion musculaire du dos'],
};

export function chargeTotaleEntrainement(plan: PlanChargeHebdo): number {
  return plan.physique + plan.contacts * 1.25 + plan.sprint * 1.1 + plan.melee * 1.15 - plan.recuperation * .8;
}

function chargePourJoueur(plan: PlanChargeHebdo, j: Coequipier): number {
  const avant = ['pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g', 'deuxieme_ligne_d', 'troisieme_aile_g', 'troisieme_aile_d', 'numero_8'].includes(j.poste);
  const vitesse = ['ailier_gauche', 'ailier_droit', 'arriere', 'premier_centre', 'deuxieme_centre'].includes(j.poste);
  return plan.physique + plan.contacts * (avant ? 1.45 : 1) + plan.melee * (avant ? 1.65 : .25)
    + plan.sprint * (vitesse ? 1.65 : .7) - plan.recuperation * .8;
}

export function risqueMedicalJoueur(
  profil: ProfilMedicalJoueur, j: Coequipier, plan: PlanChargeHebdo,
  origine: 'match' | 'entrainement', intensite = 1,
): number {
  const fragiliteZone = Math.max(...Object.values(profil.zones));
  const historique = profil.historique.length * 4 + Object.values(profil.sequelles).reduce((n, x) => n + (x ?? 0), 0) * .25;
  const age = Math.max(0, j.age - 28) * 2.1;
  const charge = Math.max(0, chargePourJoueur(plan, j)) * 4;
  const contact = origine === 'match' ? 18 * intensite : plan.contacts * 4;
  return borne(profil.fragiliteNaturelle * .28 + fragiliteZone * .24 + profil.fatigue * .34
    + charge + contact + historique + age - plan.recuperation * 5);
}

function zoneIncident(j: Coequipier, activite: string, rng: () => number): ZoneMedicale {
  const choix: ZoneMedicale[] = activite === 'sprint' ? ['ischio', 'cheville', 'genou']
    : activite === 'melee' ? ['epaule', 'dos', 'genou']
      : activite === 'contacts' || activite === 'match'
        ? ['epaule', 'commotion', 'genou', 'cheville']
        : ['ischio', 'genou', 'dos'];
  if (['pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g', 'deuxieme_ligne_d'].includes(j.poste) && rng() > .58) return rng() > .45 ? 'epaule' : 'dos';
  return choix[Math.floor(rng() * choix.length)];
}

function creerIncidentMedical(
  m: Manager, j: Coequipier, profil: ProfilMedicalJoueur, origine: 'match' | 'entrainement',
  activite: string, rng: () => number,
): DossierMedical {
  const zone = zoneIncident(j, activite, rng);
  const ancien = profil.historique.filter((h) => h.zone === zone).length;
  const score = profil.zones[zone] + profil.fatigue * .45 + ancien * 12 + (j.age >= 31 ? 9 : 0);
  const grave = rng() * 100 + score * .22 > 86;
  const moyenne = !grave && rng() * 100 + score * .18 > 64;
  const gravite: DossierMedical['gravite'] = grave ? 'grave' : moyenne ? 'moyenne' : 'legere';
  const baseSemaines = zone === 'commotion' ? (grave ? 8 : moyenne ? 4 : 2) : grave ? 12 + Math.floor(rng() * 13) : moyenne ? 5 + Math.floor(rng() * 5) : 2 + Math.floor(rng() * 3);
  const type = TYPES_PAR_ZONE[zone][grave || moyenne ? 1 : 0];
  const qualite = borne(35 + (m.installations[m.club]?.entrainement ?? 0) * 10 + (m.avancee?.profonde?.directeurSportif.gestionStaff ?? 45) * .25);
  return {
    id: `medical-${m.saison}-${m.semaine}-${j.id}-${origine}`, joueurId: j.id, nom: j.nom,
    type, gravite, disponibilite: 0, douleur: grave ? 90 : moyenne ? 70 : 48,
    risqueAggravation: grave ? 46 : moyenne ? 30 : 17, semaines: baseSemaines,
    decision: 'attente', penalitePerformance: grave ? 30 : moyenne ? 19 : 10,
    saison: m.saison, semaine: m.semaine, phase: 'suspicion', zone, origine, activite,
    minute: origine === 'match' ? 5 + Math.floor(rng() * 74) : undefined,
    diagnosticInitial: zone === 'commotion' ? 'Suspicion de commotion, sortie immédiate.'
      : `Douleur à la zone ${zone}. Durée encore incertaine.`,
    diagnosticDans: qualite >= 68 ? 0 : qualite >= 48 ? 1 : 2,
    guerison: 0, condition: Math.max(20, 75 - baseSemaines * 3), rythme: Math.max(10, 68 - baseSemaines * 4),
    risqueRechute: grave ? 38 : moyenne ? 23 : 12, protocoleCommotion: zone === 'commotion', rechute: ancien > 0,
  };
}

function traiterMedicalApresMatch(a: EtatCarriereAvancee, m: Manager, effectif: Coequipier[], resultat?: ResultatMatchManager): EtatCarriereAvancee {
  const rng = graine(`medical#${m.club}#${m.saison}#${m.semaine}`);
  let actualites = [...a.actualites];
  let medical = a.medical.map(normaliserDossier);
  const profilsMedicaux = { ...a.profilsMedicaux };
  const alignes = new Set([...m.composition.titulaires, ...m.composition.remplacants]);

  medical = medical.map((d) => {
    if (d.phase === 'clos' || !alignes.has(d.joueurId)) return d;
    if (['traitement', 'disponible', 'forcer', 'retourDirect', 'reprise20', 'reprise40'].includes(d.decision)
      && rng() < (d.risqueRechute ?? d.risqueAggravation) / 100) {
      actualites.push(nouvelleActualite({ saison: m.saison, semaine: m.semaine, categorie: 'blessure', importance: 3, club: m.club, titre: `Rechute de ${d.nom}`, texte: `${d.nom} a rejoué avant d’avoir retrouvé sa condition. L’absence et les séquelles augmentent.` }));
      const profil = profilsMedicaux[d.joueurId];
      if (profil && d.zone) profilsMedicaux[d.joueurId] = { ...profil,
        zones: { ...profil.zones, [d.zone]: borne(profil.zones[d.zone] + 10) },
        sequelles: { ...profil.sequelles, [d.zone]: Math.min(30, (profil.sequelles[d.zone] ?? 0) + 6) } };
      return { ...d, gravite: 'grave' as const, phase: 'diagnostic' as const, semaines: Math.max(10, d.semaines * 3), disponibilite: 0, douleur: 92, decision: 'repos' as const, risqueAggravation: 52, risqueRechute: 46, penalitePerformance: 32, rechute: true };
    }
    return d;
  });

  // ⚠️ LA DISPONIBILITÉ SE COMPTE ICI, MATCH PAR MATCH. La reconstituer après
  // coup à partir des dossiers médicaux donnerait un chiffre faux : une absence
  // pour sélection, un dossier clos ou un joueur arrivé en cours de saison
  // n'auraient pas la même base de matchs possibles.
  const absents = new Set(indisponiblesCarriereAvancee(a, m.semaine));
  for (const j of effectif) {
    const profil = profilsMedicaux[j.id] ?? profilMedicalInitial(j);
    const joue = alignes.has(j.id);
    const lignes = ligneDisponibilite(profil, m.saison);
    const index = lignes.findIndex((d) => d.saison === m.saison);
    lignes[index] = {
      ...lignes[index],
      possibles: lignes[index].possibles + 1,
      disponibles: lignes[index].disponibles + (absents.has(j.id) ? 0 : 1),
      titularisations: lignes[index].titularisations + (m.composition.titulaires.includes(j.id) ? 1 : 0),
    };
    profilsMedicaux[j.id] = { ...profil, disponibilites: lignes,
      fatigue: borne(profil.fatigue + (joue ? (m.composition.titulaires.includes(j.id) ? 15 : 8) : -7)),
      condition: borne(profil.condition + (joue ? -3 : 2)), rythme: borne(profil.rythme + (joue ? 5 : -1)) };
  }

  const actifs = new Set(medical.filter((d) => d.phase !== 'clos').map((d) => d.joueurId));
  const intensite = m.tactique.rythme === 'intense' ? 1.25 : m.tactique.rythme === 'gestion' ? .82 : 1;
  const blessureLive = resultat?.blessures?.find((b) => !actifs.has(b.joueurId));
  const candidatLive = blessureLive ? effectif.find((j) => j.id === blessureLive.joueurId) : undefined;
  const candidat = candidatLive ?? effectif.filter((j) => alignes.has(j.id) && !actifs.has(j.id)).find((j) => {
    const profil = profilsMedicaux[j.id];
    return profil && rng() < risqueMedicalJoueur(profil, j, a.chargeEntrainement, 'match', intensite) / 5_500;
  });
  if (candidat) {
    const dossier = creerIncidentMedical(m, candidat, profilsMedicaux[candidat.id], 'match', blessureLive?.activite ?? 'match', rng);
    if (blessureLive) dossier.minute = blessureLive.minute;
    medical.push(dossier);
    actualites.push(nouvelleActualite({ saison: m.saison, semaine: m.semaine, categorie: 'blessure', importance: dossier.gravite === 'grave' ? 3 : 2, club: m.club, titre: `${candidat.nom} sort à la ${dossier.minute}e`, texte: dossier.diagnosticInitial ?? dossier.type }));
  }
  return { ...a, medical, profilsMedicaux, actualites: actualitesBornees(actualites) };
}

function mettreAJourRivalite(a: EtatCarriereAvancee, m: Manager, resultat: ResultatMatchManager): EtatCarriereAvancee {
  const paire = clePaire(m.club, resultat.adversaire);
  const index = a.rivalites.findIndex((r) => r.clubs[0] === paire[0] && r.clubs[1] === paire[1]);
  const rng = graine(`rivalite#${paire.join('#')}`);
  const base: Rivalite = index >= 0 ? a.rivalites[index] : {
    clubs: paire, intensite: intensiteDeDepart(80 + rng() * 260, true), causes: [], derniereSaison: m.saison,
  };
  const causes: Parameters<typeof apresLaSaisonRivalite>[1] = [];
  if (Math.abs(resultat.scorePour - resultat.scoreContre) <= 7) causes.push('serieSerree');
  if (m.semaine >= 35) causes.push('maintien');
  const suivante = apresLaSaisonRivalite(base, causes, m.saison);
  const rivalites = [...a.rivalites];
  if (index >= 0) rivalites[index] = suivante;
  else rivalites.push(suivante);
  return { ...a, rivalites };
}

export function apresResultatCarriereAvancee(
  m: Manager, effectif: Coequipier[], resultat: ResultatMatchManager,
): { etat: EtatCarriereAvancee; confiance: number } {
  const victoire = resultat.scorePour > resultat.scoreContre;
  const nul = resultat.scorePour === resultat.scoreContre;
  let a = assurerEtatCarriereAvancee(m, effectif);
  a = mettreAJourVestiaire(a, m, effectif, victoire, nul);
  a = mettreAJourPromesses(a, m);
  a = genererDiscussion(a, m, effectif);
  a = traiterMedicalApresMatch(a, m, effectif, resultat);
  a = mettreAJourRivalite(a, m, resultat);
  const objectifs = a.objectifs.map((o) => {
    if (o.indicateur === 'feuillesJeunes') {
      const absents = new Set(indisponiblesCarriereAvancee(m.avancee, m.semaine));
      const jeunesAlignes = [...new Set([...m.composition.titulaires, ...m.composition.remplacants])]
        .filter((id) => !absents.has(id) && (effectif.find((j) => j.id === id)?.age ?? 99) <= 22).length;
      return { ...o, progression: o.progression + jeunesAlignes };
    }
    return o;
  });
  const actualites = actualitesBornees([...a.actualites, nouvelleActualite({
    saison: m.saison, semaine: m.semaine, categorie: 'resultat', importance: Math.abs(resultat.scorePour - resultat.scoreContre) <= 3 ? 2 : 1,
    club: m.club, titre: `${m.club} ${resultat.scorePour}-${resultat.scoreContre} ${resultat.adversaire}`,
    texte: victoire ? 'Une victoire qui nourrit la confiance et les ambitions du club.' : nul ? 'Un résultat serré qui ne tranche rien.' : 'Une défaite qui pèse sur le vestiaire et la direction.',
  })]);
  const leaders = Object.values(a.vestiaire).filter((p) => p.rang === 'leader');
  const soutienLeaders = leaders.reduce((n, p) => n + (p.soutien ? 1 : -1), 0);
  const relationMoyenne = moyenneVestiaire(a);
  const profonde = apresResultatProfonde(a.profonde, m, effectif, resultat, relationMoyenne);
  return { etat: { ...a, objectifs, actualites, profonde }, confiance: Math.max(-2, Math.min(2, soutienLeaders)) };
}

export function actualiserConvocationsClub(m: Manager, effectif: Coequipier[], numero: number, precedentes: ConvocationClub[]): ConvocationClub[] {
  const convocations = precedentes.map((c) => c.rassemblement
    ? { ...c, fin: finDeRassemblement(c.rassemblement, numero) } : c).filter((c) => c.fin >= numero);
  for (const nation of new Set(effectif.map((j) => nomNation(j.nation)))) {
    const groupe = effectifNational(nation, m.saison);
    const noms = new Set(groupe.map((j) => j.nom));
    for (const camp of fenetresDeNation(nation, m.saison)) {
      if (camp.annonce > numero || finDeRassemblement(camp, numero) < numero) continue;
      for (const j of effectif.filter((p) => noms.has(p.nom))) {
        const id = camp.id + '#' + j.id;
        if (convocations.some((c) => c.id === id)) continue;
        // Une seule liste par joueur sur une période : les fenêtres prioritaires viennent d'abord.
        if (convocations.some((c) => c.joueurId === j.id && c.debut <= camp.fin && c.fin >= camp.debut)) continue;
        convocations.push({ id, joueurId: j.id, nom: j.nom, nation, debut: camp.debut,
          fin: finDeRassemblement(camp, numero), competition: camp.nom, rassemblement: camp,
          titularisations: 0, essais: 0, points: 0 });
      }
    }
  }
  return convocations;
}

function faireEvoluerDossier(dossier: DossierMedical): DossierMedical {
  const d = normaliserDossier(dossier);
  if (d.phase === 'clos') return d;
  if (d.phase === 'suspicion') {
    const diagnosticDans = Math.max(0, (d.diagnosticDans ?? 0) - 1);
    return diagnosticDans > 0 ? { ...d, diagnosticDans } : {
      ...d, phase: 'diagnostic', diagnosticDans: 0, diagnosticInitial: undefined,
      disponibilite: 0, decision: 'attente',
    };
  }
  if (d.phase === 'diagnostic' || d.phase === 'guerison') {
    if (d.decision === 'attente') return d;
    const vitesse = d.decision === 'repos' ? 1 : d.decision === 'traitement' || d.decision === 'disponible' ? .72 : .42;
    const semaines = Math.max(0, d.semaines - vitesse);
    const guerison = borne((d.guerison ?? 0) + (d.gravite === 'grave' ? 5 : d.gravite === 'moyenne' ? 10 : 16) * vitesse);
    if (semaines <= 0 || guerison >= 100) return {
      ...d, phase: 'reprise', semaines: 0, guerison: 100, disponibilite: 55,
      condition: Math.max(35, d.condition ?? 45), rythme: Math.max(20, d.rythme ?? 30),
      risqueRechute: Math.max(12, d.risqueRechute ?? 20), decision: 'attente', penalitePerformance: 18,
    };
    return { ...d, phase: 'guerison', semaines: Math.ceil(semaines), guerison,
      douleur: borne(d.douleur - 9 * vitesse), disponibilite: d.decision === 'repos' ? 0 : d.disponibilite };
  }
  const retour = d.decision;
  const gainCondition = retour === 'reserve' ? 14 : retour === 'reprise20' ? 10 : retour === 'reprise40' ? 8 : retour === 'retourDirect' || retour === 'forcer' ? 4 : 7;
  const gainRythme = retour === 'reserve' ? 12 : retour === 'reprise20' ? 14 : retour === 'reprise40' ? 16 : retour === 'retourDirect' || retour === 'forcer' ? 18 : 5;
  const condition = borne((d.condition ?? 50) + gainCondition);
  const rythme = borne((d.rythme ?? 35) + gainRythme);
  const risqueRechute = Math.max(4, (d.risqueRechute ?? 20) - (retour === 'reserve' ? 7 : retour === 'reprise20' ? 5 : 3));
  const clos = condition >= 92 && rythme >= 88 && risqueRechute <= 8;
  return { ...d, phase: clos ? 'clos' : 'reprise', condition, rythme, risqueRechute,
    disponibilite: clos ? 100 : retour === 'reserve' || retour === 'attente' || retour === 'repos' ? 0 : retour === 'reprise20' ? 65 : retour === 'reprise40' ? 78 : 92,
    penalitePerformance: clos ? 0 : retour === 'reprise20' ? 16 : retour === 'reprise40' ? 10 : retour === 'retourDirect' || retour === 'forcer' ? 18 : 0,
    decision: clos ? 'repos' : d.decision };
}

function actualiserContratsJoueurs(a: EtatCarriereAvancee, m: Manager, effectif: Coequipier[], semaineSuivante: number): Record<string, ContratJoueurAvance> {
  const contrats = { ...a.contratsJoueurs };
  const force = forceEffectif(m.club, m.saison);
  const matchs = Math.max(1, Object.keys(m.resultats).filter((cle) => cle.startsWith(`${m.saison}-`) || cle.includes(`-${m.saison}-`)).length);
  for (const j of effectif) {
    const c = contrats[j.id] ?? contratJoueurInitial(m, j, a.vestiaire[j.id] ?? profilDuJoueur(j, m.composition.capitaineId, m.saison));
    const part = (m.tempsDeJeu[j.id] ?? 0) / matchs;
    const attendu = c.role === 'cadre' ? .68 : c.role === 'rotation' ? .32 : .14;
    const satisfaction = borne(c.satisfaction + (part - attendu) * 5 + ((a.vestiaire[j.id]?.satisfaction ?? 55) - 55) * .035);
    const valeurSportive = Math.max(0, j.note - force) * 10 + Math.max(0, j.potentiel - j.note) * 3;
    // ⚠️ LA FIN DE CONTRAT SE LIT EN MOIS, PAS EN SAISONS. Un « fin de contrat
    // la saison prochaine » traitait de la même façon un joueur à dix-huit mois
    // et un joueur à quatre : l'un est tranquille, l'autre est à deux semaines
    // de pouvoir signer ailleurs. Les paliers de `palierContrat` commandent
    // maintenant la pression du marché comme le texte de l'écran.
    const mois = moisRestantsContrat(c.fin, m.saison, semaineSuivante);
    const palier = palierContrat(mois);
    const finProche = palier === 'libre' ? 34 : palier === 'danger' ? 26 : palier === 'reflexion' ? 16 : palier === 'discussions' ? 7 : 0;
    const interetExterieur = borne(c.interetExterieur * .72 + valeurSportive + finProche + Math.max(0, 45 - satisfaction) * .35);
    const rng = graine(`offres-contrat#${j.id}#${m.saison}#${semaineSuivante}`);
    const fenetre = [7, 15, 23, 31, 39].includes(semaineSuivante);
    // À six mois, les prétendants ne se contentent plus de regarder.
    const appetit = palier === 'danger' || palier === 'libre' ? 95 : 140;
    const nouvellesOffres = fenetre && rng() < interetExterieur / appetit ? 1 : 0;
    const niveau = competitionDuClub(m.club)?.niveau ?? 8;
    const marche = niveau > 3 ? 0 : salaire(niveau, j.note - force, j.age);
    const explosion = j.age <= 27 && part >= .55 && j.note >= force + 2;
    contrats[j.id] = { ...c, nom: j.nom, club: m.club, satisfaction, interetExterieur,
      attachement: evoluerAttachement(c, m, j, a.vestiaire[j.id], part),
      offresExterieures: Math.min(5, c.offresExterieures + nouvellesOffres),
      demandeRevalorisation: c.demandeRevalorisation || (explosion && c.salaire < marche * .88)
        || ((palier === 'danger' || palier === 'reflexion') && interetExterieur >= 62) };
  }
  return contrats;
}

export function avancerSemaineCarriereAvancee(m: Manager, effectif: Coequipier[], semaineSuivante: number): EtatCarriereAvancee {
  let a = assurerEtatCarriereAvancee(m, effectif);
  const avantMedical = a.medical.map(normaliserDossier);
  let medical = avantMedical.map(faireEvoluerDossier);
  const profilsMedicaux = { ...a.profilsMedicaux };
  const soignes = new Set(avantMedical.filter((d) => d.phase !== 'clos' && (d.disponibilite ?? 0) < 100).map((d) => d.joueurId));
  for (const j of effectif) {
    const profil = profilsMedicaux[j.id] ?? profilMedicalInitial(j);
    const charge = Math.max(0, chargePourJoueur(a.chargeEntrainement, j) + (m.entrainements.includes(j.nom) ? 1.5 : 0));
    const lignes = ligneDisponibilite(profil, m.saison);
    if (soignes.has(j.id)) {
      const index = lignes.findIndex((d) => d.saison === m.saison);
      lignes[index] = { ...lignes[index],
        semainesBlessees: lignes[index].semainesBlessees + 1,
        joursBlesse: lignes[index].joursBlesse + 7 };
    }
    profilsMedicaux[j.id] = { ...profil, disponibilites: lignes,
      fatigue: borne(profil.fatigue + charge * 1.7 - a.chargeEntrainement.recuperation * 4),
      condition: borne(profil.condition + (charge <= 5 ? 2 : charge >= 9 ? -2 : 1)), rythme: borne(profil.rythme + 1) };
  }
  // Une blessure passée laisse enfin une trace durable : récidive et séquelle
  // influenceront les saisons suivantes et la visite médicale d'un contrat.
  for (const d of medical.filter((x) => x.phase === 'reprise' || x.phase === 'clos')) {
    if (!d.zone) continue;
    const profil = profilsMedicaux[d.joueurId];
    if (!profil || profil.historique.some((h) => h.saison === d.saison && h.semaine === d.semaine && h.type === d.type)) continue;
    const sequelle = d.gravite === 'grave' ? 8 : d.gravite === 'moyenne' ? 3 : 1;
    // Les jours d'absence sont ce que l'écran « Disponibilité » affiche à côté
    // de chaque blessure : on les fige à la clôture du dossier, à partir de la
    // semaine où il s'est ouvert.
    const jours = Math.max(3, (semaineSuivante - d.semaine) * 7);
    profilsMedicaux[d.joueurId] = { ...profil,
      historique: [...profil.historique, { zone: d.zone, type: d.type, saison: d.saison, semaine: d.semaine, gravite: d.gravite, rechute: !!d.rechute, sequelle, jours }].slice(-24),
      commotions: profil.commotions + (d.zone === 'commotion' ? 1 : 0),
      zones: { ...profil.zones, [d.zone]: borne(profil.zones[d.zone] + sequelle) },
      sequelles: { ...profil.sequelles, [d.zone]: Math.min(30, (profil.sequelles[d.zone] ?? 0) + sequelle) } };
  }
  const rng = graine(`medical-entrainement#${m.club}#${m.saison}#${semaineSuivante}`);
  const actifs = new Set(medical.filter((d) => d.phase !== 'clos').map((d) => d.joueurId));
  // ⚠️ `as const` REND LE TABLEAU EN LECTURE SEULE, donc sans `.sort()`. On
  //    type explicitement sur les clés du plan : la comparaison indexe alors
  //    `chargeEntrainement` sans `any`, et l'activité la plus chargée reste en
  //    tête — c’est elle qui donne son motif à la blessure.
  const activites: (keyof PlanChargeHebdo)[] = ["physique", "contacts", "sprint", "melee"];
  activites.sort((x, y) => a.chargeEntrainement[y] - a.chargeEntrainement[x]);
  const candidat = effectif.filter((j) => !actifs.has(j.id)).find((j) => rng() < risqueMedicalJoueur(profilsMedicaux[j.id], j, a.chargeEntrainement, 'entrainement') / 7_200);
  const nouvellesMedicales: ActualiteCarriere[] = [];
  if (candidat && chargeTotaleEntrainement(a.chargeEntrainement) > 3) {
    const dossier = creerIncidentMedical({ ...m, semaine: semaineSuivante }, candidat, profilsMedicaux[candidat.id], 'entrainement', activites[0], rng);
    medical = [...medical, dossier];
    nouvellesMedicales.push(nouvelleActualite({ saison: m.saison, semaine: semaineSuivante, categorie: 'blessure', importance: dossier.gravite === 'grave' ? 3 : 2, club: m.club, titre: `${candidat.nom} touché à l’entraînement`, texte: `${activites[0]} · ${dossier.diagnosticInitial}` }));
  }
  const nouvelles = actualiserConvocationsClub(m, effectif, semaineSuivante, a.convocations);
  const nouveauxIds = new Set(a.convocations.map((c) => c.id));
  const actualites = [...a.actualites, ...nouvellesMedicales, ...nouvelles.filter((c) => !nouveauxIds.has(c.id)).map((c) =>
    nouvelleActualite({ saison: m.saison, semaine: semaineSuivante, categorie: 'international', importance: 2, club: m.club,
      titre: `Convocation · ${c.nom}`, texte: `${c.nation} · ${c.competition}. Groupe de 34, du ${libelleDate(dateSemaine(c.debut))} au ${libelleDate(dateSemaine(c.fin))}. Le club joue sans lui, même hors des 23.` }))];
  if (a.selection?.matchEnAttente && a.selection.matchEnAttente.semaine < semaineSuivante) {
    const attente = a.selection.matchEnAttente;
    if (attente.match) a = enregistrerMatchSelectionAvance(a, m,
      attente.domicile ? attente.match.scoreD : attente.match.scoreE,
      attente.domicile ? attente.match.scoreE : attente.match.scoreD);
  }
  let selection = a.selection;
  if (selection && !selection.matchEnAttente) {
    const affiche = matchInternationalDuJoueur({ nation: selection.nation, saison: m.saison, semaine: semaineSuivante });
    if (affiche && !selection.resultats?.[affiche.cle]) {
      const domicile = affiche.match.domicile === nomNation(selection.nation);
      selection = { ...selection, matchEnAttente: { id: affiche.cle, match: affiche.match, domicile,
        elimination: affiche.competition.id === 'coupeDuMonde' && affiche.journee > 3,
        adversaire: domicile ? affiche.match.exterieur : affiche.match.domicile,
        competition: affiche.competition.nom, semaine: semaineSuivante } };
    }
  }
  const contratsJoueurs = actualiserContratsJoueurs(a, m, effectif, semaineSuivante);
  // ⚠️ L'APPROCHE NAÎT APRÈS LES CONTRATS DE LA SEMAINE, jamais avant : c'est
  // l'`interetExterieur` fraîchement recalculé qui désigne le convoité. Dans
  // l'autre ordre, un joueur qui vient d'exploser devait attendre une semaine
  // de plus pour être remarqué.
  // ⚠️ UNE OFFRE NE RESTE PAS SUR LA TABLE INDÉFINIMENT. Sans péremption, un
  // manager qui n'ouvre jamais ses messages bloquait tout le marché : la
  // condition « une approche à la fois » ne se libérait plus, et plus aucun
  // club ne venait jamais. Quatre semaines, puis ils vont voir ailleurs.
  // ⚠️ ET LA SAISON COMPTE AUTANT QUE LES SEMAINES. Au 1er juillet, la semaine
  // repart à 1 : `semaineSuivante - x.semaine` devient négatif, une approche
  // laissée ouverte en juin n'expirait donc JAMAIS et bloquait le marché pour
  // toute la carrière.
  const perimees = (a.approches ?? []).map((x) => (x.etat === 'ouverte' || x.etat === 'negociation')
    && (x.saison < m.saison || semaineSuivante - x.semaine >= 4) ? { ...x, etat: 'rompue' as const } : x);
  const approche = approcheAGenerer(m, effectif, contratsJoueurs, profilsMedicaux, perimees, semaineSuivante);
  const approches = approche ? [...perimees, approche] : perimees;
  if (approche) actualites.push(nouvelleActualite({
    saison: m.saison, semaine: semaineSuivante, categorie: 'transfert', importance: 3, club: m.club,
    titre: `${approche.club} se positionne sur ${approche.nom}`,
    texte: `Offre d'ouverture : ${approche.offre.toLocaleString('fr-FR')} € pour ${approche.saisonsRestantes} saison(s) de contrat restantes.`,
  }));
  a = {
    ...a, medical, profilsMedicaux, contratsJoueurs, approches,
    convocations: nouvelles, actualites: actualitesBornees(actualites), selection,
    profonde: avancerSemaineProfonde(a.profonde, m, effectif, semaineSuivante),
  };
  return mettreAJourPromesses(a, { ...m, semaine: semaineSuivante });
}

export function repondreDiscussionAvancee(a: EtatCarriereAvancee, m: Manager, id: string, reponse: ReponseDiscussion): EtatCarriereAvancee {
  const discussion = a.discussions.find((d) => d.id === id && d.etat === 'ouverte');
  if (!discussion) return a;
  const vestiaire = { ...a.vestiaire };
  const p = vestiaire[discussion.joueurId];
  const delta = reponse === 'promettre' ? 8 : reponse === 'merite' ? 2 : reponse === 'aucunePromesse' ? -4 : -14;
  if (p) vestiaire[p.joueurId] = { ...p, satisfaction: borne(p.satisfaction + delta), relationManager: borne(p.relationManager + delta), soutien: delta >= 0 };
  let promesses = a.promesses;
  if (reponse === 'promettre') {
    const type = discussion.type === 'tempsDeJeu' ? 'PLAYTIME_PROMISE' : discussion.type === 'contrat' ? 'CONTRACT_PROMISE' : discussion.type === 'pret' ? 'LOAN_PROMISE' : 'ROLE_PROMISE';
    promesses = [...promesses, {
      id: `promesse-${discussion.id}`, joueurId: discussion.joueurId, nom: discussion.nom,
      type, date: m.semaine, echeance: Math.min(43, m.semaine + 8),
      objectif: type === 'PLAYTIME_PROMISE' ? 5 : type === 'ROLE_PROMISE' ? 4 : 1,
      depart: m.tempsDeJeu[discussion.joueurId] ?? 0,
      // La prolongation est actée par cette réponse ; les promesses de rôle et
      // de prêt restent, elles, liées aux vraies décisions sportives du manager.
      progression: type === 'CONTRACT_PROMISE' ? 1 : 0, etat: 'active',
    }];
  }
  return { ...a, vestiaire, promesses, discussions: a.discussions.map((d) => d.id === id ? { ...d, etat: 'close', reponse } : d) };
}

export function deciderMedical(a: EtatCarriereAvancee, id: string, decision: Exclude<DecisionMedicale, 'attente'>): EtatCarriereAvancee {
  return {
    ...a,
    medical: a.medical.map((brut) => {
      if (brut.id !== id) return brut;
      const d = normaliserDossier(brut);
      // Le protocole commotion ne peut être contourné par une décision du coach.
      if (d.protocoleCommotion && ['forcer', 'retourDirect', 'reprise20', 'reprise40'].includes(decision) && d.phase !== 'reprise') return d;
      if (d.phase === 'suspicion') return d;
      if (d.phase === 'reprise') {
        const autorisee = ['repos', 'reprise20', 'reprise40', 'reserve', 'retourDirect', 'forcer'].includes(decision);
        if (!autorisee) return d;
        return { ...d, decision, disponibilite: decision === 'reprise20' ? 65 : decision === 'reprise40' ? 78 : decision === 'retourDirect' || decision === 'forcer' ? 92 : 0,
          risqueRechute: Math.min(100, (d.risqueRechute ?? 15) + (decision === 'retourDirect' || decision === 'forcer' ? 18 : 0)) };
      }
      if (decision === 'repos') return { ...d, decision, disponibilite: 0, risqueAggravation: Math.max(2, d.risqueAggravation - 8), penalitePerformance: 0 };
      if (decision === 'traitement' || decision === 'disponible') return { ...d, decision: 'disponible', disponibilite: 72, risqueAggravation: Math.min(100, d.risqueAggravation + 14), penalitePerformance: 14 };
      if (decision === 'forcer') return { ...d, decision, disponibilite: 90, risqueAggravation: Math.min(100, d.risqueAggravation + 30), risqueRechute: Math.min(100, (d.risqueRechute ?? 15) + 24), penalitePerformance: 22 };
      return d;
    }),
  };
}

export function definirChargeEntrainement(
  a: EtatCarriereAvancee, axe: keyof PlanChargeHebdo, niveau: PlanChargeHebdo[keyof PlanChargeHebdo],
): EtatCarriereAvancee {
  return { ...a, chargeEntrainement: { ...a.chargeEntrainement, [axe]: niveau } };
}

export function risqueMoyenGroupe(a: EtatCarriereAvancee, effectif: Coequipier[]): number {
  if (!effectif.length) return 0;
  return Math.round(effectif.reduce((total, j) => total + risqueMedicalJoueur(
    a.profilsMedicaux[j.id] ?? profilMedicalInitial(j), j, a.chargeEntrainement, 'entrainement',
  ), 0) / effectif.length);
}

export function ouvrirRenegociationJoueur(
  a: EtatCarriereAvancee, m: Manager, effectif: Coequipier[], joueurId: string,
): NegociationManager | undefined {
  const j = effectif.find((x) => x.id === joueurId);
  const contrat = a.contratsJoueurs[joueurId];
  if (!j || !contrat) return undefined;
  const salaires = salairesEffectif(m.club, m.saison, m.recrues);
  const courant = contrat.salaire || salaires.find((x) => x.joueurId === joueurId || x.nom === j.nom)?.salaire || 0;
  const revalorisation = contrat.demandeRevalorisation;
  const facteur = revalorisation ? 1.22 : contrat.fin <= m.saison + 1 ? 1.1 : 1.04;
  const profilMedical = a.profilsMedicaux[joueurId] ?? profilMedicalInitial(j);
  const risqueMedical = borne(profilMedical.fragiliteNaturelle * .35 + profilMedical.historique.length * 10
    + Object.values(profilMedical.sequelles).reduce((n, x) => n + (x ?? 0), 0));
  const cible = {
    id: j.id, pseudo: pseudoStable(j.nom), nom: j.nom, club: m.club, division: m.division,
    poste: j.poste, age: j.age, note: j.note, potentiel: j.potentiel, nation: j.nation,
    indemnite: 0, valeur: Math.max(0, courant * 5), saisonsRestantes: Math.max(0, contrat.fin - m.saison),
    situation: contrat.fin <= m.saison ? 'libre' as const : contrat.fin === m.saison + 1 ? 'finDeContrat' as const : 'sousContrat' as const,
    salaireDemande: courant > 0 ? Math.round(courant * facteur / 5_000) * 5_000 : 0,
    primeDemandee: courant > 0 ? Math.round(courant * .16 / 2_500) * 2_500 : 0,
    primeMatchDemandee: courant > 0 ? 0 : 150 + Math.round(j.note / 5) * 25,
    dureeDemandee: j.age >= 31 ? 2 : 3, roleDemande: contrat.role,
  };
  const nego = ouvrirNegociationManager(cible, m.saison, m.semaine, {
    nature: revalorisation ? 'revalorisation' : 'prolongation',
    // ⚠️ C'EST L'ATTACHEMENT MESURÉ QUI PARLE, pas l'importance déclarée d'une
    // motivation. Un joueur peut avoir « attachement » en tête de ses
    // priorités et n'être là que depuis un an : ce qui tempère sa demande,
    // c'est le lien réellement construit avec CE club.
    attachement: contrat.attachement,
    satisfaction: contrat.satisfaction, performance: j.note,
    interetExterieur: contrat.interetExterieur + contrat.offresExterieures * 12, risqueMedical,
  });
  return { ...nego, id: `nego-interne#${j.id}#${m.saison}#${m.semaine}`,
    motivations: contrat.motivations, nature: revalorisation ? 'revalorisation' : 'prolongation' };
}

export function signerRenegociationJoueur(
  a: EtatCarriereAvancee, nego: NegociationManager,
  contexte: { semaine?: number; feuilles?: number } = {},
): EtatCarriereAvancee {
  const semaine = contexte.semaine ?? 1;
  const contrat = a.contratsJoueurs[nego.joueur.id];
  if (!contrat || nego.nature === 'recrutement') return a;
  // ⚠️ UN STATUT PROMIS EST UNE PROMESSE, PAS UNE ÉTIQUETTE. Signer « cadre »
  // et laisser le joueur sur le banc doit se payer exactement comme une parole
  // donnée dans le vestiaire — c'est ce que le système de promesses fait déjà,
  // il suffisait de l'y brancher. Sans elle, le rôle inscrit au contrat ne
  // servait qu'à calculer une satisfaction lente et invisible.
  const promesses = nego.offre.role === 'cadre' && !a.promesses.some((p) => p.joueurId === nego.joueur.id && p.etat === 'active')
    ? [...a.promesses, {
      id: `promesse-role-${nego.joueur.id}-${nego.saison}`, joueurId: nego.joueur.id, nom: nego.joueur.nom,
      type: 'ROLE_PROMISE' as const, date: semaine, echeance: Math.min(43, semaine + 12), objectif: 7,
      depart: contexte.feuilles ?? 0, progression: 0, etat: 'active' as const,
    }]
    : a.promesses;
  return { ...a, promesses, contratsJoueurs: { ...a.contratsJoueurs, [nego.joueur.id]: {
    ...contrat, debut: nego.saison, fin: nego.saison + nego.offre.duree,
    salaire: nego.offre.salaire, role: nego.offre.role,
    option: nego.offre.option ?? 'aucune', satisfaction: borne(contrat.satisfaction + 14),
    // Prolonger, c'est aussi choisir de rester : le lien avec le club y gagne.
    attachement: borne(contrat.attachement + 5),
    demandeRevalorisation: false, offresExterieures: 0, interetExterieur: borne(contrat.interetExterieur - 24),
    derniereNegociation: nego.saison,
  } } };
}

export function indisponiblesCarriereAvancee(a: EtatCarriereAvancee | undefined, semaine: number): string[] {
  if (!a) return [];
  const medical = a.medical.map(normaliserDossier).filter((d) => d.phase !== 'clos'
    && (d.phase === 'suspicion' || d.decision === 'repos' || d.decision === 'attente' || d.decision === 'reserve')).map((d) => d.joueurId);
  const selection = a.convocations.filter((c) => semaine >= c.debut && semaine <= c.fin).map((c) => c.joueurId);
  return [...new Set([...medical, ...selection])];
}

export function penalitesMedicales(a: EtatCarriereAvancee | undefined): Record<string, number> {
  return Object.fromEntries((a?.medical ?? []).map(normaliserDossier).filter((d) => d.phase !== 'clos'
    && ['traitement', 'disponible', 'forcer', 'reprise20', 'reprise40', 'retourDirect'].includes(d.decision)).map((d) => [d.joueurId, d.penalitePerformance]));
}

export function observerCible(a: EtatCarriereAvancee, joueurId: string, saison: number, paysConnu: boolean): EtatCarriereAvancee {
  const actuelle = a.connaissances[joueurId];
  return { ...a, connaissances: { ...a.connaissances, [joueurId]: { joueurId, observations: Math.min(6, (actuelle?.observations ?? 0) + 1), derniereSaison: saison, paysConnu: actuelle?.paysConnu || paysConnu } } };
}

/**
 * ⚠️ AUCUNE NOTE DU JEU N'ATTEINT 100, et c'est la borne qui manquait. Les
 * effectifs plafonnent à 99 (`attributsDe`, `noteALAge`, le générateur de
 * monde) : borner l'intervalle à 100 faisait apparaître un chiffre impossible
 * en haut de presque toutes les cartes du marché — « 81–100 », « 74–100 » —
 * c'est-à-dire un général visiblement faux.
 */
const NOTE_PLAFOND = 99;
const borneNote = (v: number) => Math.max(1, Math.min(NOTE_PLAFOND, Math.round(v)));

export function rapportConnaissance(a: EtatCarriereAvancee | undefined, cible: { id: string; note: number; potentiel: number; salaireDemande: number; age: number }, niveauRecrutement: number): RapportConnaissance {
  const c = a?.connaissances[cible.id];
  const observations = c?.observations ?? 0;
  const niveau = observations >= 4 ? 'complet' : observations >= 1 ? 'partiel' : 'inconnu';
  const rng = graine(`connaissance#${cible.id}#${observations}`);
  const age = cible.age <= 21 ? 3 : cible.age >= 31 ? 1 : 0;
  const pays = c?.paysConnu ? -2 : 2;
  const incertitude = Math.max(0, 10 - observations * 2 - niveauRecrutement * 1.25 + age + pays);
  const decalage = Math.round((rng() * 2 - 1) * incertitude * 0.45);
  /**
   * ⚠️ LA MARGE D'UN RAPPORT INCONNU EST DIVISÉE PAR DEUX (`max(7, …)` devenait
   * ±12 avec un service de niveau 0, soit une fourchette de VINGT-QUATRE
   * points). Ce n'est pas un assouplissement du scouting : l'incertitude
   * globale — décalage compris — reste du même ordre, mais elle est désormais
   * DITE au bon endroit. Une fourchette qui couvre du remplaçant de Fédérale à
   * l'international ne permet aucune décision, donc elle ne coûte rien à celui
   * qui ne scoute pas : c'était le vrai défaut. À ±5 par défaut, observer un
   * joueur change réellement ce qu'on sait de lui.
   */
  const ecartInconnu = Math.max(4, Math.min(9, incertitude * 0.55));
  const intervalle = (v: number, ecart: number): [number, number] => [
    borneNote(v + decalage - ecart), borneNote(v + decalage + ecart),
  ];
  if (niveau === 'inconnu') {
    return {
      niveau,
      note: intervalle(cible.note, ecartInconnu),
      estimation: borneNote(cible.note + decalage),
      marge: Math.round(ecartInconnu),
      potentiel: null,
      salaire: null,
      personnalite: null,
    };
  }
  const salaireEcart = niveau === 'complet' ? 0.08 : 0.28;
  const mesure = (v: number, ecart: number): [number, number] => niveau === 'complet'
    ? [borneNote(v - ecart), borneNote(v + ecart)]
    : intervalle(v, ecart);
  const ecartNote = niveau === 'complet' ? 0 : Math.max(2, incertitude * 0.4);
  return {
    niveau,
    note: mesure(cible.note, ecartNote),
    // Un rapport complet donne la vraie note ; un rapport partiel garde son
    // décalage, sinon observer une seule fois vaudrait déjà certitude.
    estimation: niveau === 'complet' ? borneNote(cible.note) : borneNote(cible.note + decalage),
    marge: Math.round(ecartNote),
    potentiel: mesure(cible.potentiel, niveau === 'complet' ? 2 : Math.max(4, incertitude * 0.6)),
    salaire: [Math.max(0, Math.round(cible.salaireDemande * (1 - salaireEcart) / 1000) * 1000), Math.round(cible.salaireDemande * (1 + salaireEcart) / 1000) * 1000],
    personnalite: niveau === 'complet' ? profilDuJoueur({ id: cible.id, nom: '', poste: 'arriere', age: cible.age, note: cible.note, potentiel: cible.potentiel, nation: '', regen: false }, '', 1).traits[0] : null,
  };
}

function archiverMonde(a: EtatCarriereAvancee, m: Manager): HistoireDuMonde {
  let histoire = a.histoire;
  const bilan = resoudreSaisonClub(m.division, m.saison, m.club);
  for (const comp of COMPETITIONS) {
    const phase = phaseFinaleDe(comp.id, m.saison);
    if (!phase.champion) continue;
    const mouvements = bilan.mouvements.filter((x) => x.de === comp.id);
    histoire = archiver(histoire, comp.id, {
      saison: m.saison, champion: phase.champion, finaliste: phase.finaliste ?? undefined,
      classement: phase.classement.map((l) => l.club),
      montees: mouvements.filter((x) => x.sens === 'montee').map((x) => x.club),
      relegations: mouvements.filter((x) => x.sens === 'descente').map((x) => x.club),
    }, comp.id === m.division || ['top14', 'prod2', 'nationale'].includes(comp.id));
  }
  return histoire;
}

function archiverEffectif(a: EtatCarriereAvancee, m: Manager, effectif: Coequipier[]): CarriereJoueur[] {
  let carrieres = [...a.carrieresJoueurs];
  const matchs = Object.values(m.resultats).filter((r) => r.saison === m.saison && r.club === m.club).length;
  for (const j of effectif) {
    const feuilles = m.tempsDeJeu[j.id] ?? 0;
    if (feuilles === 0 && j.age < 32 && !j.duCentre) continue;
    const ligne: SaisonDeJoueur = {
      saison: m.saison, club: m.club, niveau: competitionDuClub(m.club)?.niveau ?? 8,
      matchs: feuilles, titularisations: Math.min(feuilles, Math.round(feuilles * 0.7)), minutes: feuilles * 61,
      essais: Math.round(feuilles * Math.max(0.02, (j.note - 45) / 220)), points: 0, cartons: Math.round(feuilles / 18),
      selections: a.convocations.filter((c) => c.joueurId === j.id).length, titres: m.titres.slice(-1), recompenses: [],
      capitaine: j.id === m.composition.capitaineId, note: Math.max(4.5, Math.min(9, 5.5 + (j.note - forceEffectif(m.club, m.saison)) / 12 + feuilles / Math.max(1, matchs) * 0.6)),
    };
    const index = carrieres.findIndex((c) => c.id === j.id);
    const carriere: CarriereJoueur = index >= 0 ? carrieres[index] : { id: j.id, nom: j.nom, nation: j.nation, poste: j.poste, age: j.age, saisons: [] };
    const suivante = compacter({ ...ajouterSaison(carriere, ligne), age: j.age }, m.saison);
    if (index >= 0) carrieres[index] = suivante; else carrieres.push(suivante);
  }
  return elaguer(carrieres, m.clubs, 30);
}

function evoluerMonde(a: EtatCarriereAvancee, m: Manager): Pick<EtatCarriereAvancee, 'clubsMonde' | 'entraineursIA' | 'identites' | 'actualites' | 'offresBanc'> {
  const clubsMonde = { ...a.clubsMonde };
  const entraineursIA = { ...a.entraineursIA };
  const identites = { ...a.identites };
  let actualites = [...a.actualites];
  const offresBanc: OffreBancManager[] = [];
  for (const club of TOUS_LES_CLUBS) {
    const c = clubsMonde[club];
    const coach = entraineursIA[c.entraineurId];
    const rng = graine(`evolution-monde#${club}#${m.saison}`);
    const comp = competitionDuClub(club);
    const phase = comp ? phaseFinaleDe(comp.id, m.saison) : null;
    const ligne = phase?.classement.find((x) => x.club === club);
    const position = ligne ? (ligne.position - 1) / Math.max(1, phase!.classement.length - 1) : 0.5;
    const tendance = Math.round((0.5 - position) * 12 + (rng() * 4 - 2));
    const evenementRare = rng();
    const choc = evenementRare < 0.012 ? -(4 + rng() * 9) : evenementRare > 0.988 ? 4 + rng() * 10 : 0;
    const richesse = borne(c.richesse + tendance * 0.24 + choc);
    const infrastructures = borne(c.infrastructures + (richesse > 65 && rng() < 0.18 ? 2 : 0));
    let entraineurId = c.entraineurId;
    const confiance = borne(coach.confiance + tendance - (coach.contrat <= 1 ? 2 : 0));
    if (confiance < 22 || coach.contrat <= 0) {
      const libres = Object.values(entraineursIA).filter((x) => !x.club && x.reputation <= richesse + 18);
      const choisi = libres.sort((x, y) => y.reputation - x.reputation)[0];
      const id = choisi?.id ?? `coach-${club}-${m.saison}`;
      if (choisi) entraineursIA[id] = { ...choisi, club, confiance: 58, contrat: 2 + Math.floor(rng() * 3), saisons: choisi.saisons + 1 };
      else entraineursIA[id] = { id, nom: `${PRENOMS_COACH[Math.floor(rng() * PRENOMS_COACH.length)]} ${NOMS_COACH[Math.floor(rng() * NOMS_COACH.length)]}`, club, reputation: borne(richesse + rng() * 12 - 6), confiance: 58, contrat: 3, saisons: 0 };
      entraineursIA[coach.id] = { ...coach, club: '', confiance, contrat: 0, saisons: coach.saisons + 1 };
      entraineurId = id;
      if (club === m.club || rng() > 0.94) actualites.push(nouvelleActualite({ saison: m.saison, semaine: 43, categorie: 'manager', importance: 2, club, titre: `Changement d'entraîneur à ${club}`, texte: `${coach.nom} quitte son poste. ${entraineursIA[id].nom} prend la suite.` }));
      if (m.prestige >= Math.max(8, richesse - 12) && club !== m.club && offresBanc.length < 8) offresBanc.push({ id: `offre-${m.saison}-${club}`, club, division: comp?.id ?? '', salaire: Math.round(Math.max(12_000, richesse * richesse * 85) / 1000) * 1000, duree: 2 + Math.floor(rng() * 3), statut: 'offre', exigePrestige: Math.max(0, richesse - 12), saison: m.saison + 1 });
    } else entraineursIA[coach.id] = { ...coach, confiance, contrat: Math.max(0, coach.contrat - 1), saisons: coach.saisons + 1 };
    clubsMonde[club] = { ...c, richesse, infrastructures, entraineurId, tendance, professionnel: c.professionnel || (richesse >= 58 && infrastructures >= 52) };
    identites[club] = apresLaSaison(identites[club] ?? identiteHistorique(club), { partJeunesFormes: c.strategie === 'formation' ? 0.32 : 0.12, partLocaux: c.strategie === 'local' ? 0.75 : 0.42, partEtrangers: c.strategie === 'international' ? 0.64 : 0.22, grosSalaires: c.strategie === 'stars' ? 4 : 1, essaisMarques: 2.1 + tendance / 15, essaisEncaisses: 2.2 - tendance / 18, cartons: 2, departs: rng() > 0.75 ? 3 : 1, changementDEntraineur: entraineurId !== c.entraineurId, positionRelative: position, investissementFormation: Math.round(infrastructures / 25) });
    if (choc !== 0 && club === m.club) actualites.push(nouvelleActualite({ saison: m.saison, semaine: 43, categorie: 'finance', importance: 3, club, titre: choc > 0 ? 'Un partenaire change la dimension du club' : 'Un revers financier frappe le club', texte: choc > 0 ? 'Une excellente campagne d’abonnements et un nouveau partenaire renforcent durablement les moyens.' : 'Un sponsor en difficulté et des travaux imprévus réduisent les marges pour la saison prochaine.' }));
  }
  return { clubsMonde, entraineursIA, identites, actualites: actualitesBornees(actualites), offresBanc };
}

export function finSaisonCarriereAvancee(m: Manager, effectif: Coequipier[], rang: number): { etat: EtatCarriereAvancee; confiance: number; resume: string; revenusMarketing: number } {
  let a = assurerEtatCarriereAvancee(m, effectif);
  const objectifs = a.objectifs.map((o) => evaluerObjectif(o, m, effectif, rang, true));
  const confiance = objectifs.reduce((n, o) => n + (o.etat === 'reussi' ? 3.5 : -5) * o.importance, 0);
  const monde = evoluerMonde(a, m);
  const carrieresJoueurs = archiverEffectif(a, m, effectif);
  const rng = graine(`reconversion#${m.club}#${m.saison}`);
  const staffAnciens = [...a.staffAnciens];
  for (const j of effectif.filter((x) => x.age >= 34)) {
    const carriere = carrieresJoueurs.find((c) => c.id === j.id);
    if (!carriere || staffAnciens.some((s) => s.joueurId === j.id) || rng() > 0.32) continue;
    const profil = a.vestiaire[j.id];
    const roles: StaffAncienJoueur['role'][] = profil?.traits.includes('leader') ? ['entraineur', 'directeurSportif', 'jeunes'] : ['preparateur', 'recruteur', 'jeunes'];
    staffAnciens.push({ id: `staff-${j.id}-${m.saison}`, joueurId: j.id, nom: j.nom, club: m.club, role: roles[Math.floor(rng() * roles.length)], reputation: borne(j.note * 0.7 + (profil?.relationManager ?? 50) * 0.3), joueurDepuis: carriere.saisons[0]?.saison ?? m.saison });
  }
  let propositionSelection = a.propositionSelection;
  if (!a.selection && m.prestige >= 48) {
    const candidates = SELECTIONS_SENIOR.filter((s) => s.nation !== m.nation);
    const selection = candidates[Math.floor(rng() * candidates.length)] ?? SELECTIONS_SENIOR.find((s) => s.nation === m.nation);
    if (selection && rng() < Math.min(0.82, (m.prestige - 38) / 55)) propositionSelection = { nation: selection.nation, reputationDemandee: Math.round(m.prestige), cumulClub: true, saison: m.saison + 1 };
  }
  a = {
    ...a, objectifs, histoire: archiverMonde(a, m), carrieresJoueurs,
    clubsMonde: monde.clubsMonde, entraineursIA: monde.entraineursIA, identites: monde.identites,
    actualites: monde.actualites, offresBanc: monde.offresBanc, staffAnciens, propositionSelection,
    rivalites: a.rivalites.map((r) => r.derniereSaison === m.saison ? r : apresLaSaisonRivalite(r, [], m.saison)),
    profonde: finSaisonProfonde(a.profonde, m, effectif, rang),
  };
  // Le store fixera les nouveaux objectifs après la montée/descente et les nouveaux budgets.
  a = { ...a, dernierBilanObjectifs: { saison: m.saison, club: m.club, objectifs }, discussions: a.discussions.slice(-60), medical: a.medical.map(normaliserDossier).filter((d) => d.phase !== 'clos'), convocations: [], connaissances: Object.fromEntries(Object.entries(a.connaissances).filter(([, c]) => c.derniereSaison >= m.saison - 2)) };
  const reussis = objectifs.filter((o) => o.etat === 'reussi').length;
  const revenusMarketing = revenusMarketingProfonde(a.profonde, m.club);
  return { etat: a, confiance: Math.round(confiance), revenusMarketing, resume: `Direction : ${reussis}/${objectifs.length} objectifs atteints (${confiance >= 0 ? '+' : ''}${Math.round(confiance)} confiance). Marketing : ${revenusMarketing.toLocaleString('fr-FR')} €.` };
}

export function postulerBancAvance(a: EtatCarriereAvancee, m: Manager, club: string): EtatCarriereAvancee {
  const force = forceEffectif(club, m.saison);
  const exigePrestige = Math.max(0, force - 14);
  const rng = graine(`candidature#${club}#${m.nom}#${m.saison}`);
  const compatibilite = compatibiliteManagerClub(a.profonde, a.identites[club]);
  const accepte = m.prestige + rng() * 12 + (compatibilite - 50) * .12 >= exigePrestige;
  const comp = competitionDuClub(club);
  const offre: OffreBancManager = { id: `candidature-${m.saison}-${club}`, club, division: comp?.id ?? '', salaire: Math.round(Math.max(12_000, force * force * 80) / 1000) * 1000, duree: 2 + Math.floor(rng() * 3), statut: accepte ? 'offre' : 'refusee', exigePrestige, saison: m.saison };
  return { ...a, offresBanc: [...a.offresBanc.filter((o) => o.club !== club || o.saison !== m.saison), offre] };
}

export function negocierContratManagerAvance(a: EtatCarriereAvancee, m: Manager): { etat: EtatCarriereAvancee; contrat: Manager['contrat']; confiance: number } {
  if (!m.club || !m.contrat) return { etat: a, contrat: m.contrat, confiance: 0 };
  const rng = graine(`contrat-manager#${m.club}#${m.saison}#${Math.round(m.confiance)}`);
  const accepte = m.confiance >= 58 && rng() < Math.min(0.9, m.confiance / 100 + m.prestige / 250);
  const contrat = accepte ? { saisons: Math.max(2, m.contrat.saisons + 2), salaire: Math.round(m.contrat.salaire * (1.08 + m.prestige / 1000) / 1000) * 1000 } : m.contrat;
  const actualite = nouvelleActualite({ saison: m.saison, semaine: m.semaine, categorie: 'manager', importance: 2, club: m.club, titre: accepte ? `Le contrat de ${m.nom} prolongé` : 'La direction attend avant de prolonger', texte: accepte ? `Le club sécurise son entraîneur pour ${contrat.saisons} saisons.` : 'Le président veut voir davantage de résultats avant de rouvrir les négociations.' });
  return { etat: { ...a, actualites: actualitesBornees([...a.actualites, actualite]) }, contrat, confiance: accepte ? 2 : -2 };
}

export function accepterSelectionAvance(a: EtatCarriereAvancee, m: Manager): EtatCarriereAvancee {
  const p = a.propositionSelection;
  if (!p) return a;
  return { ...a, selection: { nation: p.nation, reputation: Math.max(12, Math.round(m.prestige * 0.55)), cumulClub: p.cumulClub, matchs: 0, victoires: 0, titres: [], depuis: m.saison }, propositionSelection: undefined };
}

export function refuserSelectionAvance(a: EtatCarriereAvancee): EtatCarriereAvancee {
  return { ...a, propositionSelection: undefined };
}

export function enregistrerMatchSelectionAvance(a: EtatCarriereAvancee, m: Manager, scorePour: number, scoreContre: number): EtatCarriereAvancee {
  const s = a.selection;
  if (!s?.matchEnAttente) return a;
  if (s.matchEnAttente.elimination && scorePour === scoreContre) {
    if (graine(s.matchEnAttente.id + '#prolongation')() < 0.5) scorePour += 3; else scoreContre += 3;
  }
  const attente = s.matchEnAttente;
  const match: MatchChampionnat = { domicile: attente.domicile ? nomNation(s.nation) : attente.adversaire,
    exterieur: attente.domicile ? attente.adversaire : nomNation(s.nation),
    scoreD: attente.domicile ? scorePour : scoreContre, scoreE: attente.domicile ? scoreContre : scorePour,
    essaisD: Math.max(0, Math.round(((attente.domicile ? scorePour : scoreContre) - 6) / 7)),
    essaisE: Math.max(0, Math.round(((attente.domicile ? scoreContre : scorePour) - 6) / 7)) };
  enregistrerResultatJoue(attente.id, match);
  const victoire = scorePour > scoreContre;
  const selection = { ...s, resultats: { ...s.resultats, [attente.id]: match }, matchs: s.matchs + 1, victoires: s.victoires + (victoire ? 1 : 0), reputation: borne(s.reputation + (victoire ? 2 : scorePour === scoreContre ? 0 : -1)), matchEnAttente: undefined };
  return { ...a, selection, actualites: actualitesBornees([...a.actualites, nouvelleActualite({ saison: m.saison, semaine: m.semaine, categorie: 'international', importance: 3, titre: `${s.nation} ${scorePour}-${scoreContre} ${s.matchEnAttente.adversaire}`, texte: victoire ? `${m.nom} signe une victoire internationale qui renforce sa réputation de sélectionneur.` : 'La sélection repart au travail après ce rendez-vous international.' })]) };
}

export function moyenneVestiaire(a: EtatCarriereAvancee | undefined): number {
  const profils = Object.values(a?.vestiaire ?? {});
  return profils.length ? Math.round(profils.reduce((n, p) => n + p.satisfaction, 0) / profils.length) : 50;
}

export function joueurAgent(a: EtatCarriereAvancee | undefined, joueurId: string): AgentPersistant | undefined {
  if (!a?.agents.length) return undefined;
  return a.agents.find((agent) => agent.joueurs.includes(joueurId))
    ?? a.agents[Math.floor(graine(`agent-joueur#${joueurId}`)() * a.agents.length)];
}
