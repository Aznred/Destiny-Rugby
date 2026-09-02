// ═══════════════════════════════════════════════════════════════════════════
// LA CARRIÈRE AVANCÉE — un monde qui se souvient et dont les systèmes parlent
// ═══════════════════════════════════════════════════════════════════════════
//
// Cette couche relie les briques déjà présentes (championnats, effectifs,
// recrutement, histoire, identité) au lieu d'ajouter des scènes sans mémoire.
// Elle reste pure : le store décide quand l'appeler et persiste le résultat.

import { COMPETITIONS, NOTE_PAR_NIVEAU, competitionDuClub } from '../data/clubs';
import { SELECTIONS_SENIOR } from '../data/selections';
import type { Manager, ResultatMatchManager } from '../types';
import { graine, enregistrerResultatJoue, type MatchChampionnat } from './championnat';
import { fenetresDeNation, finDeRassemblement, type RassemblementInternational } from './rassemblements';
import { effectifNational, matchInternationalDuJoueur } from './international';
import { libelleDate, semaine as dateSemaine } from '../data/calendrier';
import type { Coequipier } from './effectif';
import { forceEffectif } from './effectif';
import {
  ajouterSaison, archiver, compacter, elaguer,
  type CarriereJoueur, type HistoireDuMonde, type SaisonDeJoueur,
} from './histoire';
import {
  apresLaSaison, apresLaSaisonRivalite, clePaire, identiteHistorique,
  intensiteDeDepart, type Identite, type Rivalite,
} from './identiteClub';
import { nomNation } from './nations';
import { phaseFinaleDe, resoudreSaisonClub } from './promotion';
import {
  apresResultatProfonde, assurerEtatCarriereProfonde, avancerSemaineProfonde,
  compatibiliteManagerClub, creerEtatCarriereProfonde, finSaisonProfonde,
  revenusMarketingProfonde, type EtatCarriereProfonde,
} from './carriereProfonde';

const borne = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export type CategorieObjectif = 'sportif' | 'financier' | 'formation' | 'recrutement' | 'identite';
export type ImportanceObjectif = 1 | 2 | 3;

export interface ObjectifDirection {
  id: string;
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

export type DecisionMedicale = 'attente' | 'repos' | 'traitement' | 'forcer';
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
  vestiaire: Record<string, ProfilVestiaire>;
  discussions: DiscussionJoueurAvancee[];
  promesses: PromesseJoueur[];
  medical: DossierMedical[];
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

function objectifsDeSaison(m: Pick<Manager, 'club' | 'saison' | 'objectif' | 'budgetSalarial'>, effectif: Coequipier[]): ObjectifDirection[] {
  const niveau = competitionDuClub(m.club)?.niveau ?? 8;
  const jeunes = effectif.filter((j) => j.age <= 22).length;
  const local = effectif.filter((j) => nomNation(j.nation) === 'France').length;
  return [
    {
      id: `sportif-${m.saison}`, categorie: 'sportif', importance: 3,
      titre: m.objectif <= 1 ? 'Jouer le titre' : m.objectif <= 4 ? 'Atteindre les playoffs' : m.objectif <= 8 ? 'Finir dans la première moitié' : 'Assurer le maintien',
      detail: `Terminer ${m.objectif}e ou mieux avec les moyens réels du club.`, cible: m.objectif, progression: 0, etat: 'enCours',
    },
    {
      id: `finance-${m.saison}`, categorie: 'financier', importance: niveau <= 2 ? 2 : 3,
      titre: niveau <= 2 ? 'Respecter la masse salariale' : 'Préserver un budget bénéficiaire',
      detail: `Ne pas dépasser l'enveloppe salariale de ${Math.round(m.budgetSalarial / 1000)} k€.`, cible: m.budgetSalarial, progression: 0, etat: 'enCours',
    },
    {
      id: `formation-${m.saison}`, categorie: 'formation', importance: jeunes >= 5 ? 2 : 1,
      titre: 'Faire vivre la formation', detail: `Donner au moins 18 feuilles de match cumulées aux moins de 23 ans.`,
      cible: 18, progression: 0, etat: 'enCours',
    },
    {
      id: `identite-${m.saison}`, categorie: local / Math.max(1, effectif.length) >= 0.7 ? 'identite' : 'recrutement', importance: 2,
      titre: local / Math.max(1, effectif.length) >= 0.7 ? 'Préserver les joueurs locaux' : 'Rajeunir le groupe',
      detail: local / Math.max(1, effectif.length) >= 0.7 ? 'Conserver une majorité de joueurs du pays.' : 'Recruter ou intégrer deux joueurs de 23 ans ou moins.',
      cible: 2, progression: 0, etat: 'enCours',
    },
  ];
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
  return {
    version: 1,
    profonde: creerEtatCarriereProfonde(m, effectif),
    objectifs: objectifsDeSaison(m, effectif), vestiaire, discussions: [], promesses: [], medical: [], convocations: [],
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
    medical: [], convocations: [],
  };
}

export function assurerEtatCarriereAvancee(m: Manager, effectif: Coequipier[]): EtatCarriereAvancee {
  const a = m.avancee;
  if (!a) return creerEtatCarriereAvancee(m, effectif);
  const vestiaire = { ...a.vestiaire };
  for (const j of effectif) {
    vestiaire[j.id] ??= profilDuJoueur(j, m.composition.capitaineId, m.saison);
    vestiaire[j.id] = { ...vestiaire[j.id], nom: j.nom, derniereSaison: m.saison };
  }
  // Chemin courant : aucun monde de 850 clubs n'est régénéré à chaque rendu.
  // Les trois registres n'ont besoin d'un repli que pour une sauvegarde bêta
  // partielle ; les sauvegardes antérieures n'ont pas `avancee` du tout.
  const incomplet = !a.entraineursIA || !a.clubsMonde || !a.identites;
  const monde = incomplet ? mondeInitial() : null;
  const agents = a.agents?.length ? a.agents : creerAgents();
  return {
    ...a, version: 1, vestiaire,
    profonde: assurerEtatCarriereProfonde(a.profonde, m, effectif),
    objectifs: a.objectifs?.length ? a.objectifs : objectifsDeSaison(m, effectif),
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

function traiterMedicalApresMatch(a: EtatCarriereAvancee, m: Manager, effectif: Coequipier[]): EtatCarriereAvancee {
  const rng = graine(`medical#${m.club}#${m.saison}#${m.semaine}`);
  let actualites = [...a.actualites];
  let medical = a.medical.map((d) => {
    if (d.semaines <= 0) return d;
    const joue = [...m.composition.titulaires, ...m.composition.remplacants].includes(d.joueurId);
    if (joue && (d.decision === 'traitement' || d.decision === 'forcer') && rng() < d.risqueAggravation / 100) {
      actualites.push(nouvelleActualite({ saison: m.saison, semaine: m.semaine, categorie: 'blessure', importance: 3, club: m.club, titre: `Aggravation pour ${d.nom}`, texte: `${d.nom} a joué diminué. La blessure s'aggrave et l'absence se compte désormais en mois.` }));
      return { ...d, gravite: 'grave' as const, semaines: Math.max(14, d.semaines * 4), disponibilite: 0, douleur: 92, decision: 'repos' as const, risqueAggravation: 5, penalitePerformance: 30 };
    }
    return d;
  });
  const enCours = medical.some((d) => d.semaines > 0 && d.decision === 'attente');
  if (!enCours && effectif.length && rng() < 0.055) {
    const j = effectif[Math.floor(rng() * effectif.length)];
    const grave = rng() > 0.82;
    const dossier: DossierMedical = {
      id: `medical-${m.saison}-${m.semaine}-${j.id}`, joueurId: j.id, nom: j.nom,
      type: grave ? 'Entorse du genou' : rng() > 0.5 ? 'Élongation musculaire' : 'Contusion costale',
      gravite: grave ? 'moyenne' : 'legere', disponibilite: 65, douleur: grave ? 72 : 48,
      risqueAggravation: grave ? 28 : 14, semaines: grave ? 7 : 3, decision: 'attente', penalitePerformance: 12,
      saison: m.saison, semaine: m.semaine,
    };
    medical = [...medical, dossier];
    actualites.push(nouvelleActualite({ saison: m.saison, semaine: m.semaine, categorie: 'blessure', importance: grave ? 3 : 2, club: m.club, titre: `${j.nom} touché`, texte: `${dossier.type} : le staff médical attend ta décision avant le prochain match.` }));
  }
  return { ...a, medical, actualites: actualitesBornees(actualites) };
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
  a = traiterMedicalApresMatch(a, m, effectif);
  a = mettreAJourRivalite(a, m, resultat);
  const objectifs = a.objectifs.map((o) => {
    if (o.categorie === 'sportif') return { ...o, progression: Math.min(100, o.progression + (victoire ? 8 : nul ? 3 : 0)) };
    if (o.categorie === 'formation') {
      const jeunesAlignes = [...m.composition.titulaires, ...m.composition.remplacants]
        .filter((id) => effectif.find((j) => j.id === id)?.age && (effectif.find((j) => j.id === id)?.age ?? 99) <= 22).length;
      return { ...o, progression: Math.min(o.cible, o.progression + jeunesAlignes) };
    }
    if (o.categorie === 'identite' && resultat.essaisPour >= 3) return { ...o, progression: Math.min(o.cible, o.progression + 1) };
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

export function avancerSemaineCarriereAvancee(m: Manager, effectif: Coequipier[], semaineSuivante: number): EtatCarriereAvancee {
  let a = assurerEtatCarriereAvancee(m, effectif);
  const medical = a.medical.map((d) => {
    if (d.semaines <= 0 || d.decision === 'attente') return d;
    const semaines = Math.max(0, d.semaines - 1);
    return { ...d, semaines, disponibilite: semaines === 0 ? 100 : d.disponibilite };
  });
  const nouvelles = actualiserConvocationsClub(m, effectif, semaineSuivante, a.convocations);
  const nouveauxIds = new Set(a.convocations.map((c) => c.id));
  const actualites = [...a.actualites, ...nouvelles.filter((c) => !nouveauxIds.has(c.id)).map((c) =>
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
  a = {
    ...a, medical, convocations: nouvelles, actualites: actualitesBornees(actualites), selection,
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
    medical: a.medical.map((d) => d.id !== id ? d : decision === 'repos'
      ? { ...d, decision, disponibilite: 0, risqueAggravation: Math.max(2, d.risqueAggravation - 8), penalitePerformance: 0 }
      : decision === 'traitement'
        ? { ...d, decision, disponibilite: 80, risqueAggravation: Math.min(100, d.risqueAggravation + 15), penalitePerformance: 12 }
        : { ...d, decision, disponibilite: 90, risqueAggravation: Math.min(100, d.risqueAggravation + 30), penalitePerformance: 20 }),
  };
}

export function indisponiblesCarriereAvancee(a: EtatCarriereAvancee | undefined, semaine: number): string[] {
  if (!a) return [];
  const medical = a.medical.filter((d) => d.semaines > 0 && (d.decision === 'repos' || d.decision === 'attente')).map((d) => d.joueurId);
  const selection = a.convocations.filter((c) => semaine >= c.debut && semaine <= c.fin).map((c) => c.joueurId);
  return [...new Set([...medical, ...selection])];
}

export function penalitesMedicales(a: EtatCarriereAvancee | undefined): Record<string, number> {
  return Object.fromEntries((a?.medical ?? []).filter((d) => d.semaines > 0 && (d.decision === 'traitement' || d.decision === 'forcer')).map((d) => [d.joueurId, d.penalitePerformance]));
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
  const objectifs = a.objectifs.map((o) => {
    let reussi = false;
    if (o.categorie === 'sportif') reussi = rang <= o.cible;
    else if (o.categorie === 'financier') reussi = m.budgetSalarial >= 0 && m.budgetTransferts >= 0;
    else if (o.categorie === 'formation') reussi = o.progression >= o.cible;
    else reussi = o.progression >= o.cible || m.recrues.filter((r) => r.saison === m.saison && r.joueur.age <= 23).length >= o.cible;
    return { ...o, etat: reussi ? 'reussi' as const : 'echoue' as const };
  });
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
  const suivant = { ...m, saison: m.saison + 1, objectif: m.objectif };
  a = { ...a, objectifs: objectifsDeSaison(suivant, effectif), discussions: a.discussions.slice(-60), medical: a.medical.filter((d) => d.semaines > 0), convocations: [], connaissances: Object.fromEntries(Object.entries(a.connaissances).filter(([, c]) => c.derniereSaison >= m.saison - 2)) };
  const reussis = objectifs.filter((o) => o.etat === 'reussi').length;
  const revenusMarketing = revenusMarketingProfonde(a.profonde, m.club);
  return { etat: a, confiance: Math.round(confiance), revenusMarketing, resume: `Direction : ${reussis}/${objectifs.length} objectifs atteints (${confiance >= 0 ? '+' : ''}${Math.round(confiance)} confiance). Marketing : ${Math.round(revenusMarketing / 1000)} k€.` };
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
