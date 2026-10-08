// Correctif 34 : une identité FFR devient une personne de la carrière.
// Le snapshot privé est conservé séparément (IndexedDB), jamais dans le gros
// JSON Zustand. La graine et les décisions humaines suffisent à rejouer le
// monde ; seules les fiches consultées matérialisent leur historique complet.
import type { FamillePoste, PosteId } from '../types.js';
import type { SourceJeuneFfr } from './jeunesFfr.js';
import type { JeuneJoueur, Personnalite, StyleJeu } from './jeunes.js';
import { courbeDeveloppement } from './jeunes.js';
import type { JeuneRepere } from './viviers.js';
import type { Coequipier } from './effectif.js';
import { COMPETITIONS, NOTE_PAR_NIVEAU, competitionDuClub } from '../data/clubs.js';
import { POSTE_PAR_ID, POSTES_PAR_FAMILLE } from '../data/rugby.js';
import { distanceKm, positionDuClub } from '../data/geographie.js';
import type { PositionClub } from '../data/geographie.js';
import { financesDuClub } from './economie.js';
import { graine } from './ligue/aleatoire.js';

export type StatutMondeJeune = 'YOUTH' | 'SENIOR' | 'RETIRED';
export type CategorieMondeJeune = 'u18' | 'espoirs' | 'senior' | 'pret';
export type ProfilDeveloppementJeune = 'precoce' | 'regulier' | 'tardif';

export interface ActionMondeJeune {
  id: string;
  /** Saison jouée. Un bilan de développement s'applique à sa clôture. */
  saison: number;
  type: 'recrutement' | 'u18' | 'espoirs' | 'senior' | 'pret' | 'liberation' | 'developpement' | 'entrainement_senior' | 'gestion';
  club?: string;
  clubPret?: string;
  duree?: number;
  indemnite?: number;
  note?: number;
  potentielReel?: number;
  moral?: number;
  tempsDeJeu?: number;
  postesSecondaires?: PosteId[];
  blesse?: boolean;
  entrainementSenior?: boolean;
  controle?: boolean;
}

export interface MondeJeunesCarriere {
  version: 1;
  snapshotId: string;
  sourceVersion: string;
  sourceVersionDemandee?: string;
  graine: string;
  saisonDebut: number;
  saison: number;
  anneeDebut: number;
  totalSources: number;
  /** Première génération qui ne peut plus appartenir au snapshot réel. */
  saisonPremiersRegens: number;
  actions: ActionMondeJeune[];
}

export interface JoueurMondeJeune extends JeuneJoueur {
  sourcePlayerId: string;
  youthPlayerId: string;
  sourceVersion: string;
  clubOrigine: string;
  ageEstime: boolean;
  categorie: CategorieMondeJeune;
  statut: StatutMondeJeune;
  profilDeveloppement: ProfilDeveloppementJeune;
  forme: number;
  confiance: number;
  matchs: number;
  minutes: number;
  niveauClub: number;
  saison: number;
  clubProprietaire?: string;
  finPret?: number;
  debutPro?: number;
  fictif: boolean;
}

export interface SaisonHistoriqueJeune {
  saison: number;
  annee: number;
  age: number;
  ageEstime: boolean;
  club: string;
  statut: StatutMondeJeune;
  categorie: CategorieMondeJeune;
  noteAvant: number;
  noteApres: number;
  matchs: number;
  minutes: number;
  tempsDeJeu: number;
  confiance: number;
  forme: number;
  blessure?: { semaines: number; resume: string };
  postesSecondaires: PosteId[];
}

export interface MouvementHistoriqueJeune {
  saison: number;
  de: string;
  vers: string;
  motif: 'recrutement' | 'pret' | 'retour_pret' | 'liberation' | 'senior' | 'espoirs' | 'retraite';
  indemnite: number;
  /** Le lien contractuel appartient à la même identité, après un prêt aussi. */
  finContrat?: number;
}

export interface HistoriqueJeuneMonde {
  sourcePlayerId: string;
  youthClubs: string[];
  seniorClubs: string[];
  saisons: SaisonHistoriqueJeune[];
  mouvements: MouvementHistoriqueJeune[];
  debutsPro?: { saison: number; annee: number; age: number; club: string };
  sources: SourceJeuneFfr['sourceSeasonHistory'];
}

export interface PlanClubJeunes {
  club: string;
  niveau: number;
  academyBudget: number;
  recruitmentLevel: number;
  clubReputation: number;
  academyReputation: number;
  capacite: number;
  recrutementsMax: number;
  positionNeeds: Partial<Record<FamillePoste, number>>;
}

interface ProfilInterne {
  potentielInitial: number;
  profil: ProfilDeveloppementJeune;
  professionnalisme: number;
  risqueBlessure: number;
  attachement: number;
}

interface EtatJeune {
  source: SourceJeuneFfr;
  age: number;
  club: string;
  note: number;
  potentiel: number;
  categorie: CategorieMondeJeune;
  statut: StatutMondeJeune;
  confiance: number;
  forme: number;
  matchs: number;
  minutes: number;
  tempsDeJeu: number;
  postesSecondaires: PosteId[];
  profil: ProfilInterne;
  controle: boolean;
  clubProprietaire?: string;
  finPret?: number;
  debutPro?: number;
  entrainementSenior?: boolean;
  saisonEntree?: number;
}

interface MondeCalcule {
  joueurs: EtatJeune[];
  parId: Map<string, EtatJeune>;
  parClub: Map<string, EtatJeune[]>;
  /** Uniquement les transferts IA : les saisons sont reconstruites à la demande. */
  mouvements: Map<string, MouvementHistoriqueJeune[]>;
  plans: Map<string, PlanClubJeunes>;
}

const snapshots = new Map<string, readonly SourceJeuneFfr[]>();
let cache: { monde: MondeJeunesCarriere; source: readonly SourceJeuneFfr[]; resultat: MondeCalcule } | undefined;
const borner = (v: number, min = 0, max = 100): number => Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));
const dixieme = (v: number): number => Math.round(v * 10) / 10;
const famille = (p: PosteId): FamillePoste => POSTE_PAR_ID[p]?.famille ?? 'centre';
const normaliser = (s: string): string => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// Le registre public cherche linéairement parmi les clubs ; le vivier peut
// contenir 130 000 personnes. Une résolution par club suffit pour tout le lot.
const competitionsClub = new Map(COMPETITIONS.flatMap(c => c.clubs.map(j => [j.nom, c] as const)));
const clubsInconnus = new Set<string>();
function competitionClub(club: string): ReturnType<typeof competitionDuClub> {
  const connue = competitionsClub.get(club); if (connue) return connue;
  if (clubsInconnus.has(club)) return undefined;
  const trouvee = competitionDuClub(club);
  if (trouvee) competitionsClub.set(club, trouvee); else clubsInconnus.add(club);
  return trouvee;
}

/** Un snapshot enregistré reste immuable, même si le catalogue source évolue. */
export function setSourcesMondeJeunes(snapshotId: string, sources: readonly SourceJeuneFfr[]): void {
  const existant = snapshots.get(snapshotId);
  if (existant?.length) return;
  const ids = new Set<string>();
  const copies: SourceJeuneFfr[] = [];
  for (const j of sources) {
    if (!j.sourcePlayerId || !j.nom?.trim() || !j.clubSource?.trim() || !POSTE_PAR_ID[j.poste]
      || !Number.isFinite(j.age) || j.age < 13 || j.age > 23 || ids.has(j.sourcePlayerId)) continue;
    ids.add(j.sourcePlayerId);
    const copie = { ...j, id: j.sourcePlayerId, youthPlayerId: j.sourcePlayerId,
      postesSecondaires: [...new Set(j.postesSecondaires)].filter(p => p !== j.poste && !!POSTE_PAR_ID[p]),
      sourceSeasonHistory: j.sourceSeasonHistory.map(s => ({ ...s })) };
    Object.freeze(copie.postesSecondaires);
    copie.sourceSeasonHistory.forEach(Object.freeze); Object.freeze(copie.sourceSeasonHistory);
    copies.push(Object.freeze(copie));
  }
  snapshots.set(snapshotId, Object.freeze(copies));
  cache = undefined;
}

export function sourcesMondeJeunes(snapshotId: string): readonly SourceJeuneFfr[] | undefined {
  return snapshots.get(snapshotId);
}

export function mondeJeunesDisponible(monde?: MondeJeunesCarriere | null): boolean {
  return !!monde && monde.sourceVersion !== 'en_attente' && snapshots.has(monde.snapshotId);
}

export function creerMondeJeunes(
  sources: readonly SourceJeuneFfr[],
  options: { snapshotId: string; sourceVersion: string; graine: string; saison?: number; annee?: number },
): MondeJeunesCarriere {
  setSourcesMondeJeunes(options.snapshotId, sources);
  const valides = snapshots.get(options.snapshotId) ?? [];
  const saison = options.saison ?? 1;
  // Pas de génération fictive avant que le dernier jeune réel ait quitté
  // toutes les catégories de formation (23 ans), avec au moins huit saisons.
  const plusJeune = valides.reduce((age, j) => Math.min(age, j.age), 23);
  return { version: 1, snapshotId: options.snapshotId, sourceVersion: options.sourceVersion,
    graine: options.graine, saisonDebut: saison, saison, anneeDebut: options.annee ?? 2026,
    totalSources: valides.length, saisonPremiersRegens: saison + Math.max(8, 24 - plusJeune), actions: [] };
}

/** Les signatures, promotions et bilans restent datés dans la sauvegarde. */
export function enregistrerActionMondeJeune(monde: MondeJeunesCarriere, action: ActionMondeJeune): MondeJeunesCarriere {
  const a = { ...action, saison: Math.max(monde.saisonDebut, action.saison),
    ...(action.postesSecondaires ? { postesSecondaires: [...action.postesSecondaires] } : {}) };
  // Un bilan n'est appliqué qu'une fois ; une autre action reste un véritable
  // événement (prêter puis rappeler un joueur dans une même saison est permis).
  const actions = a.type === 'developpement'
    ? monde.actions.filter(x => !(x.id === a.id && x.saison === a.saison && x.type === a.type))
    : [...monde.actions];
  return { ...monde, actions: [...actions, a] };
}

export function avancerMondeJeunes(monde: MondeJeunesCarriere, bilans: ActionMondeJeune[] = []): MondeJeunesCarriere {
  let suivant = monde;
  for (const bilan of bilans) suivant = enregistrerActionMondeJeune(suivant, bilan);
  return { ...suivant, saison: suivant.saison + 1 };
}

/** La disponibilité réelle précède toujours le remplacement procédural. */
export function regensMondeJeunesAutorises(monde: MondeJeunesCarriere, club?: string): boolean {
  if (!mondeJeunesDisponible(monde) || monde.saison < monde.saisonPremiersRegens) return false;
  return !calculerMonde(monde).joueurs.some(j => !j.saisonEntree && j.age <= 23 && j.statut !== 'RETIRED' && (!club || j.club === club));
}

function niveauDe(j: EtatJeune): number {
  const source = j.source as SourceJeuneFfr & { niveauDivision?: number };
  const niveau = j.club === source.clubSource ? source.niveauDivision
    ?? (source.niveauCompetition !== null && source.niveauCompetition <= 10 ? source.niveauCompetition : undefined) : undefined;
  return competitionClub(j.club)?.niveau ?? niveau ?? 8;
}

function forceCompetition(source: SourceJeuneFfr): number {
  // Le pipeline publie une FORCE de compétition (Crabos 52, Espoirs 57),
  // distincte du numéro d'étage de la pyramide française.
  if (source.niveauCompetition !== null && source.niveauCompetition > 10) return borner(source.niveauCompetition, 20, 85);
  const niveau = source.niveauCompetition ?? competitionClub(source.clubSource)?.niveau ?? 8;
  const nom = normaliser(`${source.competition} ${source.categorie}`);
  const bonus = /crabos|elite|reichel|alamercery|national/.test(nom) ? 9 : /regional/.test(nom) ? -4 : 0;
  return borner((NOTE_PAR_NIVEAU[niveau] ?? 38) + bonus, 20, 85);
}

function initialiser(source: SourceJeuneFfr, monde: MondeJeunesCarriere): EtatJeune {
  const rng = graine(`jeune-ffr:${monde.graine}:${source.sourcePlayerId}`);
  const force = forceCompetition(source);
  const frequence = Math.min(1, source.minutes !== undefined ? source.minutes / (18 * 70) : source.matchs / 18);
  const forceClub = source.forceClub === undefined ? force : borner(source.forceClub, 20, 90);
  const senior = Math.min(18, source.apparitionsSenior) * (0.65 + force / 180);
  const espoirs = source.espoirs || /espoir|reichel/i.test(`${source.categorie} ${source.competition}`);
  const note = borner(20 + (source.age - 14) * 2.35 + force * 0.19 + (forceClub - force) * 0.045 + frequence * 5.5
    + senior + (source.surclassement ? 3.5 : 0) + (espoirs ? 5 : 0)
    + (source.groupePro ? 8 : 0) + (rng() * 2 - 1) * 4, 15, 77);
  let potentiel = 34 + force * 0.22 + (forceClub - force) * 0.035 + frequence * 5 + senior * 0.5
    + (source.surclassement ? 3 : 0) + (espoirs ? 4 : 0) + (source.groupePro ? 6 : 0)
    + Math.min(4, Math.max(0, source.progressionObservee ?? 0)) + rng() ** 1.7 * 17;
  // Une exception reste possible dans un village ; les preuves sportives
  // rendent cette exception plus probable, sans transformer tout le vivier.
  if (rng() < 0.012 + (senior > 4 ? 0.014 : 0) + (source.groupePro ? 0.02 : 0)) potentiel += 16 + rng() * 12;
  potentiel = borner(Math.max(note + 3, potentiel), 28, 96);
  const tirageProfil = rng();
  const profil: ProfilDeveloppementJeune = tirageProfil < 0.12 ? 'tardif' : tirageProfil > 0.85 ? 'precoce' : 'regulier';
  const categorie: CategorieMondeJeune = source.age > 23 ? 'senior' : espoirs ? 'espoirs'
    : source.age >= 18 && /senior/i.test(source.categorie) ? 'senior' : source.age > 18 ? 'espoirs' : 'u18';
  return { source, age: source.age, club: source.clubSource, note: dixieme(note), potentiel: dixieme(potentiel),
    categorie, statut: source.age >= 21 || categorie === 'senior' ? 'SENIOR' : 'YOUTH',
    confiance: Math.round(45 + rng() * 30), forme: 100, matchs: source.matchs,
    minutes: source.minutes ?? source.matchs * 55, tempsDeJeu: Math.round(frequence * 100),
    postesSecondaires: [...source.postesSecondaires], controle: false,
    profil: { potentielInitial: potentiel, profil, professionnalisme: 36 + rng() * 57,
      risqueBlessure: 8 + rng() * 45, attachement: 45 + rng() * 50 } };
}

const plansBase = new Map<string, PlanClubJeunes>();
/** Budgets de formation pris dans l'économie commune, avec des places limitées. */
export function planClubJeunes(club: string): PlanClubJeunes {
  const connu = plansBase.get(club); if (connu) return connu;
  const niveau = competitionClub(club)?.niveau ?? 8;
  const rng = graine(`projet-formation:${club}`);
  const reputation = borner(104 - niveau * 8 + rng() * 8);
  const academie = borner(102 - niveau * 8.5 + (rng() * 2 - 1) * 18, 10);
  const finances = financesDuClub(NOTE_PAR_NIVEAU[niveau] ?? 38, niveau);
  const plan: PlanClubJeunes = { club, niveau, academyBudget: Math.round(finances.budget * 0.005),
    recruitmentLevel: borner(100 - niveau * 8 + (rng() * 2 - 1) * 12, 15),
    clubReputation: reputation, academyReputation: academie, capacite: niveau <= 2 ? 32 : niveau <= 5 ? 26 : 24,
    recrutementsMax: niveau <= 2 ? 3 : niveau <= 5 ? 2 : 1, positionNeeds: {} };
  plansBase.set(club, plan); return plan;
}

function saisonDuJoueur(j: EtatJeune, monde: MondeJeunesCarriere, saison: number): SaisonHistoriqueJeune {
  const avant = j.note;
  const club = j.club;
  const categorie = j.categorie;
  const statut = j.statut;
  const age = j.age;
  const plan = planClubJeunes(club);
  const rng = graine(`saison-jeune:${monde.graine}:${j.source.sourcePlayerId}:${saison}`);
  const reference = NOTE_PAR_NIVEAU[niveauDe(j)] ?? 38;
  const facteurMatch = categorie === 'u18' ? 0.8 : categorie === 'espoirs' ? 0.75
    : borner(0.66 + (j.note - reference) / 38, 0.08, 1);
  let matchs = j.statut === 'RETIRED' ? 0 : Math.floor((12 + rng() * 14) * facteurMatch);
  const blesse = j.statut !== 'RETIRED' && rng() < j.profil.risqueBlessure / 500;
  const semaines = blesse ? 2 + Math.floor(rng() * 13) : 0;
  if (semaines) matchs = Math.max(0, matchs - Math.ceil(semaines * 0.8));
  let temps = Math.min(100, Math.round(matchs / 22 * 100));
  const bilan = monde.actions.findLast(a => a.id === j.source.sourcePlayerId && a.saison === saison && a.type === 'developpement');
  if (bilan?.tempsDeJeu !== undefined) temps = borner(bilan.tempsDeJeu);
  if (bilan) matchs = bilan.blesse ? Math.min(matchs, 4) : Math.round(temps / 100 * 22);
  const coaching = plan.academyReputation + (j.entrainementSenior ? 8 : 0);
  const agePoste = famille(j.source.poste) === 'pilier' || famille(j.source.poste) === 'talonneur'
    ? (age < 20 ? 0.7 : age <= 27 ? 1.15 : age > 32 ? -0.4 : 0.4)
    : (age < 18 ? 0.9 : age <= 22 ? 1.2 : age <= 27 ? 0.65 : age > 30 ? -0.7 : 0.25);
  const late = j.profil.profil === 'tardif' ? age < 21 ? 0.28 : age <= 25 ? 1.85 : 0.9
    : j.profil.profil === 'precoce' ? age <= 20 ? 1.35 : age >= 24 ? 0.65 : 1 : 1;
  const environnement = (0.55 + coaching / 130) * (0.22 + temps / 105)
    * (0.65 + j.profil.professionnalisme / 150) * (0.8 + j.confiance / 300);
  const manque = Math.max(0, j.potentiel - j.note);
  let gain = agePoste < 0 ? agePoste * (0.5 + rng() * 1.2)
    : Math.min(9, manque / 5.2 * agePoste * late * environnement * (0.65 + rng() * 0.8));
  if (blesse || bilan?.blesse) gain *= 0.25;
  if (temps < 18 && age < 28 && rng() < 0.35) j.potentiel = Math.max(j.note, j.potentiel - 1.5);
  if (temps > 65 && coaching > 55 && age < 27 && rng() < 0.15) {
    j.potentiel = Math.min(96, j.profil.potentielInitial + 6, j.potentiel + 1);
  }
  j.note = dixieme(borner(j.note + gain, 12, j.potentiel));
  if (bilan?.note !== undefined) j.note = dixieme(borner(bilan.note, 12, 99));
  if (bilan?.potentielReel !== undefined) j.potentiel = borner(bilan.potentielReel, j.note, 96);
  j.potentiel = Math.max(j.note, j.potentiel);
  j.confiance = Math.round(borner(bilan?.moral ?? j.confiance + (temps - 50) / 12 + (rng() * 2 - 1) * 4, 15, 98));
  j.forme = blesse || bilan?.blesse ? 55 + Math.floor(rng() * 25) : 85 + Math.floor(rng() * 16);
  j.matchs = matchs;
  j.minutes = Math.round(matchs * (45 + rng() * 30));
  j.tempsDeJeu = temps;
  if (bilan?.postesSecondaires) j.postesSecondaires = [...new Set(bilan.postesSecondaires)].filter(p => p !== j.source.poste && !!POSTE_PAR_ID[p]);
  // Les reconversions restent voisines du poste pratiqué et sont rares.
  if (age >= 18 && age <= 25 && matchs >= 6 && j.postesSecondaires.length < 2 && rng() < 0.045) {
    const proches: Partial<Record<FamillePoste, FamillePoste>> = { centre: 'ailier', ailier: 'arriere',
      troisieme_ligne: 'deuxieme_ligne', demi_ouverture: 'arriere', talonneur: 'pilier' };
    const f = proches[famille(j.source.poste)] ?? famille(j.source.poste);
    const p = POSTES_PAR_FAMILLE[f].find(p => p !== j.source.poste && !j.postesSecondaires.includes(p));
    if (p) j.postesSecondaires.push(p);
  }
  const ligne: SaisonHistoriqueJeune = { saison, annee: monde.anneeDebut + saison - monde.saisonDebut,
    age, ageEstime: j.source.ageEstime, club, categorie, statut, noteAvant: avant, noteApres: j.note,
    matchs, minutes: j.minutes, tempsDeJeu: temps, confiance: j.confiance, forme: j.forme,
    postesSecondaires: [...j.postesSecondaires], ...(semaines || bilan?.blesse ? {
      blessure: { semaines: semaines || 12, resume: 'Blessure ayant réduit le temps de jeu.' } } : {}) };
  j.age++;
  if (j.age >= 21) j.statut = 'SENIOR';
  if (j.categorie === 'u18' && j.age > 18) j.categorie = 'espoirs';
  if (j.categorie !== 'pret' && (j.age > 23 || !j.controle && j.age >= 18 && j.note >= reference - 10 && rng() < 0.38)) j.categorie = 'senior';
  if (j.age >= 34 + Math.floor(graine(`retraite:${monde.graine}:${j.source.sourcePlayerId}`)() * 5)) j.statut = 'RETIRED';
  if (j.debutPro === undefined && plan.niveau <= 3 && categorie === 'senior' && j.matchs > 0) j.debutPro = saison;
  return ligne;
}

function appliquerAction(j: EtatJeune, action: ActionMondeJeune): MouvementHistoriqueJeune | undefined {
  const de = j.club;
  if (action.type === 'developpement') return undefined;
  if (action.type === 'gestion') { j.controle = action.controle ?? true; return undefined; }
  if (action.type === 'entrainement_senior') { j.entrainementSenior = action.entrainementSenior ?? true; return undefined; }
  if (action.type === 'recrutement') {
    j.club = action.club ?? j.club; j.controle = action.controle ?? true;
    j.categorie = j.age > 23 ? 'senior' : j.age <= 18 ? 'u18' : 'espoirs';
    if (j.categorie === 'senior') j.statut = 'SENIOR';
  }
  if (action.type === 'u18' || action.type === 'espoirs' || action.type === 'senior') {
    j.categorie = action.type; j.controle = action.controle ?? true;
    if (j.clubProprietaire) j.club = j.clubProprietaire;
    j.clubProprietaire = undefined; j.finPret = undefined;
    if (action.type === 'senior') j.statut = 'SENIOR';
  }
  if (action.type === 'pret' && action.clubPret) {
    j.clubProprietaire = j.clubProprietaire ?? action.club ?? j.club;
    j.club = action.clubPret; j.finPret = action.saison + Math.max(1, action.duree ?? 1); j.categorie = 'pret'; j.controle = true;
  }
  if (action.type === 'liberation') {
    // Libérer de l'académie laisse le licencié dans le rugby de son club.
    j.club = j.clubProprietaire ?? action.club ?? j.club; j.clubProprietaire = undefined; j.finPret = undefined;
    j.categorie = j.age >= 18 ? 'senior' : 'u18'; j.controle = false;
  }
  if (action.postesSecondaires) j.postesSecondaires = [...action.postesSecondaires];
  if (action.note !== undefined) j.note = action.note;
  if (action.potentielReel !== undefined) j.potentiel = Math.max(j.note, action.potentielReel);
  if (action.moral !== undefined) j.confiance = borner(action.moral);
  if (action.controle !== undefined) j.controle = action.controle;
  const motif: MouvementHistoriqueJeune['motif'] = action.type === 'recrutement' ? 'recrutement'
    : action.type === 'pret' ? 'pret' : action.type === 'liberation' ? 'liberation'
    : action.type === 'senior' ? 'senior' : 'espoirs';
  return { saison: action.saison, de, vers: j.club, motif, indemnite: action.indemnite ?? 0,
    ...(action.type === 'recrutement' ? { finContrat: action.saison + (action.duree ?? 3) } : {}) };
}

const clubsDestinations = COMPETITIONS.filter(c => c.pays === 'France' && c.niveau >= 1 && c.niveau <= 10)
  .flatMap(c => c.clubs.map(j => j.nom));
const cacheProximite = new Map<string, { club: string; distance: number }[]>();
function positionSource(j: EtatJeune): PositionClub {
  if (j.club === j.source.clubSource && Number.isFinite(j.source.latitude) && Number.isFinite(j.source.longitude)) {
    return { lat: j.source.latitude!, lon: j.source.longitude!, region: j.source.region ?? positionDuClub(j.club).region, place: true };
  }
  return positionDuClub(j.club);
}
function clubsProches(j: EtatJeune): { club: string; distance: number }[] {
  const pos = positionSource(j);
  const cle = `${j.club}:${pos.lat}:${pos.lon}`;
  const connu = cacheProximite.get(cle); if (connu) return connu;
  const proches = clubsDestinations.map(club => ({ club, distance: distanceKm(pos, positionDuClub(club)) }))
    .sort((a, b) => a.distance - b.distance);
  // Assez de voisins pour chaque étage : le choix n'est pas limité aux trois
  // clubs riches que tous les jeunes du pays auraient en commun.
  const resultat: { club: string; distance: number }[] = [];
  for (let niveau = 1; niveau <= 10; niveau++) resultat.push(...proches.filter(p => planClubJeunes(p.club).niveau === niveau).slice(0, 5));
  cacheProximite.set(cle, resultat); return resultat;
}

function marcheIA(joueurs: EtatJeune[], monde: MondeJeunesCarriere, saison: number, mouvements: MondeCalcule['mouvements']): Map<string, PlanClubJeunes> {
  const plans = new Map<string, PlanClubJeunes>();
  const effectifs = new Map<string, Map<FamillePoste, number>>();
  const occupes = new Map<string, number>();
  const partants = new Map<string, number>();
  for (const j of joueurs) if (j.statut !== 'RETIRED') {
    const parPoste = effectifs.get(j.club) ?? new Map<FamillePoste, number>();
    const f = famille(j.source.poste); parPoste.set(f, (parPoste.get(f) ?? 0) + 1); effectifs.set(j.club, parPoste);
    if (j.age <= 23) occupes.set(j.club, (occupes.get(j.club) ?? 0) + 1);
  }
  const budgetRestant = new Map<string, number>();
  const recrutes = new Map<string, number>();
  // Un ordre semé renouvelé évite que le premier identifiant FFR monopolise
  // les places, et n'utilise jamais le potentiel caché pour classer le marché.
  const candidats = joueurs.filter(j => !j.controle && j.age >= 16 && j.age <= 27 && j.statut !== 'RETIRED')
    .map(j => ({ j, hasard: graine(`marche-jeune:${monde.graine}:${saison}:${j.source.sourcePlayerId}`)() }))
    .filter(({ j, hasard }) => hasard < (j.age <= 23 ? 0.09 : 0.05))
    .sort((a, b) => a.hasard - b.hasard);
  for (const { j } of candidats) {
    const rng = graine(`choix-jeune:${monde.graine}:${saison}:${j.source.sourcePlayerId}`);
    const actuel = niveauDe(j);
    const originaux = occupes.get(j.club) ?? 0;
    // Un petit club ne perd jamais toute sa génération en une fenêtre.
    if ((partants.get(j.club) ?? 0) >= Math.max(1, Math.floor(originaux * 0.12))) continue;
    const offres: { club: string; score: number; prix: number }[] = [];
    for (const voisin of clubsProches(j)) {
      if (voisin.club === j.club) continue;
      const base = planClubJeunes(voisin.club);
      const postes = effectifs.get(voisin.club);
      const besoin = Math.max(0, 3 - (postes?.get(famille(j.source.poste)) ?? 0));
      const plan = plans.get(voisin.club) ?? { ...base, positionNeeds: {} };
      plan.positionNeeds[famille(j.source.poste)] = besoin; plans.set(voisin.club, plan);
      const reference = NOTE_PAR_NIVEAU[plan.niveau] ?? 38;
      const eliteU18 = /elite|crabos|national|reichel/i.test(j.source.competition) && j.age <= 19 && j.note >= 49;
      if (plan.niveau < actuel - (eliteU18 ? 6 : 2) || plan.niveau > actuel + 1) continue;
      // La première équipe exige un niveau immédiatement utile. L'académie
      // pro accepte un peu de retard, mais pas chaque espoir régional.
      if (j.note < reference - (j.age <= 21 ? 27 : 12)) continue;
      if (plan.niveau <= 2 && j.note < (j.age <= 19 ? 48 : 59)) continue;
      if (voisin.distance > (j.age <= 17 ? 160 : 80 + plan.recruitmentLevel * 6)) continue;
      if ((recrutes.get(plan.club) ?? 0) >= plan.recrutementsMax || (occupes.get(plan.club) ?? 0) >= plan.capacite) continue;
      const prix = Math.round((800 + Math.max(0, j.note - 35) ** 2 * 45) * (plan.niveau <= 3 ? 1.7 : 0.3));
      const budget = budgetRestant.get(plan.club) ?? plan.academyBudget;
      if (prix > budget) continue;
      const regionProche = positionDuClub(plan.club).region === positionSource(j).region;
      const concurrence = postes?.get(famille(j.source.poste)) ?? 0;
      const chanceJeu = borner(70 + (j.note - reference) * 1.2 - concurrence * 6, 10, 95);
      const score = (actuel - plan.niveau) * 4 + plan.academyReputation * 0.1 + besoin * 5
        + chanceJeu * 0.2 + (regionProche ? 8 : 0) - voisin.distance * 0.055
        + (rng() * 2 - 1) * 11;
      offres.push({ club: plan.club, score, prix });
    }
    offres.sort((a, b) => b.score - a.score);
    const offre = offres[0];
    const rester = 10 + j.profil.attachement * 0.18 + rng() * 10;
    if (!offre || offre.score <= rester) continue;
    const de = j.club;
    j.club = offre.club;
    j.categorie = j.age <= 18 ? 'u18' : j.age <= 23 && j.note < (NOTE_PAR_NIVEAU[planClubJeunes(j.club).niveau] ?? 38) - 7 ? 'espoirs' : 'senior';
    if (j.categorie === 'senior') j.statut = 'SENIOR';
    const mouvement: MouvementHistoriqueJeune = { saison, de, vers: j.club, motif: 'recrutement',
      indemnite: offre.prix, finContrat: saison + 2 + Math.floor(rng() * 2) };
    const liste = mouvements.get(j.source.sourcePlayerId) ?? []; liste.push(mouvement); mouvements.set(j.source.sourcePlayerId, liste);
    budgetRestant.set(j.club, (budgetRestant.get(j.club) ?? planClubJeunes(j.club).academyBudget) - offre.prix);
    recrutes.set(j.club, (recrutes.get(j.club) ?? 0) + 1);
    partants.set(de, (partants.get(de) ?? 0) + 1);
    occupes.set(de, Math.max(0, (occupes.get(de) ?? 0) - 1));
    occupes.set(j.club, (occupes.get(j.club) ?? 0) + 1);
    const ancienPoste = effectifs.get(de); const f = famille(j.source.poste);
    if (ancienPoste) ancienPoste.set(f, Math.max(0, (ancienPoste.get(f) ?? 0) - 1));
    const nouveauPoste = effectifs.get(j.club) ?? new Map<FamillePoste, number>();
    nouveauPoste.set(f, (nouveauPoste.get(f) ?? 0) + 1); effectifs.set(j.club, nouveauPoste);
  }
  return plans;
}

/** Nées après la période couverte : ces identités ne proviennent d'aucun FFR. */
function sourcesProcedurales(monde: MondeJeunesCarriere, saison: number): SourceJeuneFfr[] {
  const prenoms = ['Léo', 'Mathis', 'Arthur', 'Romain', 'Hugo', 'Clément', 'Noé', 'Bastien', 'Gabriel', 'Malo'];
  const noms = ['Lapierre', 'Garnier', 'Masson', 'Roussel', 'Fontaine', 'Perrin', 'Legrand', 'Collet', 'Morin', 'Dumont'];
  const postes = Object.values(POSTES_PAR_FAMILLE).flat();
  const sources: SourceJeuneFfr[] = [];
  for (const club of new Set(clubsDestinations)) {
    const rng = graine(`cohorte-future:${monde.graine}:${club}:${saison}`);
    const nombre = 1 + Math.floor(rng() * 3);
    for (let rang = 0; rang < nombre; rang++) {
      const id = `regen-carriere:${monde.graine}:${club}:${saison}:${rang}`;
      const poste = postes[Math.floor(rng() * postes.length)];
      sources.push({ id, sourcePlayerId: id, youthPlayerId: id,
        nom: `${prenoms[Math.floor(rng() * prenoms.length)]} ${noms[Math.floor(rng() * noms.length)]}`,
        clubSource: club, age: 14, ageEstime: false, categorie: 'u14', poste, postesSecondaires: [],
        niveauCompetition: planClubJeunes(club).niveau, competition: 'Formation simulée', saisonSource: null,
        matchs: 0, titularisations: null, apparitionsSenior: 0, surclassement: false,
        confiance: 0, sourceSeasonHistory: [] });
    }
  }
  return sources;
}

function calculerMonde(monde: MondeJeunesCarriere): MondeCalcule {
  const sources = snapshots.get(monde.snapshotId) ?? [];
  if (cache?.monde === monde && cache.source === sources) return cache.resultat;
  const reutilisable = cache && cache.source === sources && cache.monde.graine === monde.graine
    && cache.monde.anneeDebut === monde.anneeDebut && cache.monde.saisonDebut === monde.saisonDebut
    && cache.monde.saison <= monde.saison && cache.monde.actions.every((a, i) => monde.actions[i] === a)
    && monde.actions.slice(cache.monde.actions.length).every(a => a.saison >= cache!.monde.saison);
  const debut = reutilisable ? cache!.monde.saison : monde.saisonDebut;
  const joueurs = reutilisable ? cache!.resultat.joueurs.map(j => ({ ...j, postesSecondaires: [...j.postesSecondaires] }))
    : sources.map(source => initialiser(source, monde));
  const parId = new Map(joueurs.map(j => [j.source.sourcePlayerId, j]));
  const mouvements: MondeCalcule['mouvements'] = reutilisable
    ? new Map([...cache!.resultat.mouvements].map(([id, liste]) => [id, [...liste]])) : new Map();
  const appliquer = (saison: number): void => {
    for (const action of monde.actions) if (action.saison === saison && action.type !== 'developpement') {
      const j = parId.get(action.id); if (j) appliquerAction(j, action);
    }
  };
  if (reutilisable) {
    for (const action of monde.actions.slice(cache!.monde.actions.length)) if (action.saison === debut && action.type !== 'developpement') {
      const j = parId.get(action.id); if (j) appliquerAction(j, action);
    }
  } else appliquer(monde.saisonDebut);
  let plans = reutilisable ? cache!.resultat.plans : new Map<string, PlanClubJeunes>();
  for (let saison = debut; saison < monde.saison; saison++) {
    for (const j of joueurs) {
      saisonDuJoueur(j, monde, saison);
      if (j.finPret && j.finPret <= saison + 1 && j.clubProprietaire) {
        const liste = mouvements.get(j.source.sourcePlayerId) ?? [];
        liste.push({ saison: saison + 1, de: j.club, vers: j.clubProprietaire, motif: 'retour_pret', indemnite: 0 });
        mouvements.set(j.source.sourcePlayerId, liste);
        j.club = j.clubProprietaire; j.clubProprietaire = undefined; j.finPret = undefined;
        j.categorie = j.age > 23 ? 'senior' : j.age <= 18 ? 'u18' : 'espoirs';
      }
    }
    if (saison + 1 >= monde.saisonPremiersRegens && mondeJeunesDisponible(monde)) {
      for (const source of sourcesProcedurales(monde, saison + 1)) {
        const j = initialiser(source, monde); j.saisonEntree = saison + 1;
        joueurs.push(j); parId.set(source.sourcePlayerId, j);
      }
    }
    plans = marcheIA(joueurs, monde, saison + 1, mouvements);
    appliquer(saison + 1);
  }
  const parClub = new Map<string, EtatJeune[]>();
  for (const j of joueurs) { const liste = parClub.get(j.club) ?? []; liste.push(j); parClub.set(j.club, liste); }
  const resultat = { joueurs, parId, parClub, mouvements, plans };
  cache = { monde, source: sources, resultat };
  return resultat;
}

const GABARITS: Record<FamillePoste, [number, number]> = { pilier: [184, 114], talonneur: [181, 105],
  deuxieme_ligne: [198, 114], troisieme_ligne: [191, 105], demi_melee: [176, 80], demi_ouverture: [182, 87],
  centre: [186, 97], ailier: [184, 91], arriere: [184, 91] };
function exposer(j: EtatJeune, monde: MondeJeunesCarriere): JoueurMondeJeune {
  const rng = graine(`profil-jeune:${monde.graine}:${j.source.sourcePlayerId}`);
  const f = famille(j.source.poste);
  const croissance = Math.min(1, 0.91 + (j.age - 14) * 0.015);
  const [taille, poids] = GABARITS[f];
  const styles: StyleJeu[] = ['percutant', 'evasif', 'technicien', 'buteur', 'travailleur', 'plaqueur', 'meneur'];
  const personnalites: Personnalite[] = ['modele', 'ambitieux', 'discret', 'insouciant', 'fort_caractere', 'perfectionniste', 'fragile'];
  return { id: j.source.sourcePlayerId, sourcePlayerId: j.source.sourcePlayerId, youthPlayerId: j.source.sourcePlayerId,
    sourceVersion: j.saisonEntree ? 'procedural' : monde.sourceVersion, nom: j.source.nom, club: j.club, clubOrigine: j.source.clubSource,
    region: positionSource(j).region, nation: 'France', age: j.age, ageEstime: j.source.ageEstime,
    poste: j.source.poste, polyvalence: [...j.postesSecondaires], note: j.note, potentielReel: j.potentiel,
    physique: Math.round(borner(j.note * 0.65 + 20 + rng() * 12)),
    technique: Math.round(borner(j.note * 0.6 + 22 + rng() * 15)), mental: j.confiance,
    discipline: Math.round(35 + rng() * 60), professionnalisme: Math.round(j.profil.professionnalisme),
    risqueBlessure: Math.round(j.profil.risqueBlessure), attachement: Math.round(j.profil.attachement),
    taille: Math.round((taille + (rng() * 2 - 1) * 5) * croissance),
    poids: Math.round((poids + (rng() * 2 - 1) * 8) * croissance ** 2.6), piedFort: rng() < 0.22 ? 'gauche' : 'droit',
    style: styles[Math.floor(rng() * styles.length)], personnalite: personnalites[Math.floor(rng() * personnalites.length)],
    categorie: j.categorie, statut: j.statut, profilDeveloppement: j.profil.profil, forme: j.forme,
    confiance: j.confiance, matchs: j.matchs, minutes: j.minutes, niveauClub: niveauDe(j), saison: monde.saison, fictif: !!j.saisonEntree,
    ...(j.clubProprietaire ? { clubProprietaire: j.clubProprietaire } : {}), ...(j.finPret ? { finPret: j.finPret } : {}),
    ...(j.debutPro ? { debutPro: j.debutPro } : {}) };
}

export function jeuneMondeParId(monde: MondeJeunesCarriere, id: string): JoueurMondeJeune | undefined {
  const j = calculerMonde(monde).parId.get(id); return j ? exposer(j, monde) : undefined;
}

export function jeunesMondeDuClub(monde: MondeJeunesCarriere, club: string, ageMax = 23): JoueurMondeJeune[] {
  return calculerMonde(monde).joueurs.filter(j => (j.club === club || j.clubProprietaire === club)
    && j.age <= ageMax && j.statut !== 'RETIRED').map(j => exposer(j, monde));
}

/** Toutes les identités sont présentes ; seule une sélection est matérialisée. */
export function joueursMondeJeunes(monde: MondeJeunesCarriere, max = 60): JoueurMondeJeune[] {
  return calculerMonde(monde).joueurs.slice(0, Math.max(0, max)).map(j => exposer(j, monde));
}

export function jeuneMondeEnJeuneJoueur(j: JoueurMondeJeune): JeuneJoueur {
  const facteur = j.profilDeveloppement === 'tardif' ? j.age < 21 ? 0.28 : j.age <= 25 ? 1.85 : 0.9
    : j.profilDeveloppement === 'precoce' ? j.age <= 20 ? 1.35 : j.age >= 24 ? 0.65 : 1 : 1;
  return { ...j, polyvalence: [...j.polyvalence],
    developmentCurve: courbeDeveloppement(j.poste).map(v => v > 0 ? v * facteur : v) };
}

export function candidatsMondeJeunes(
  monde: MondeJeunesCarriere, clubObservateur: string,
  options: { rayonKm?: number; ageMin?: number; ageMax?: number; max?: number } = {},
): JeuneRepere[] {
  const depuis = positionDuClub(clubObservateur);
  const rayon = options.rayonKm ?? 160;
  const candidats: { j: EtatJeune; distance: number }[] = [];
  for (const j of calculerMonde(monde).joueurs) {
    if (j.statut === 'RETIRED' || j.controle || j.age < (options.ageMin ?? 14) || j.age > (options.ageMax ?? 24)) continue;
    const distance = distanceKm(depuis, positionSource(j)); if (distance > rayon) continue;
    candidats.push({ j, distance });
  }
  return candidats.sort((a, b) => a.distance - b.distance || a.j.source.sourcePlayerId.localeCompare(b.j.source.sourcePlayerId))
    .slice(0, options.max ?? 1500).map(({ j, distance }) => ({ ...exposer(j, monde), distance, niveauClub: niveauDe(j) }));
}

/** La fiche historique rejoue ce joueur, en réutilisant les transferts du monde. */
export function historiqueJeuneMonde(monde: MondeJeunesCarriere, id: string): HistoriqueJeuneMonde | undefined {
  const resultat = calculerMonde(monde);
  const actuel = resultat.parId.get(id); if (!actuel) return undefined;
  const j = initialiser(actuel.source, monde);
  const saisons: SaisonHistoriqueJeune[] = [];
  const mouvements: MouvementHistoriqueJeune[] = [];
  const appliquer = (saison: number): void => {
    for (const action of monde.actions) if (action.id === id && action.saison === saison && action.type !== 'developpement') {
      const mouvement = appliquerAction(j, action); if (mouvement) mouvements.push(mouvement);
    }
  };
  const entree = actuel.saisonEntree ?? monde.saisonDebut;
  j.saisonEntree = actuel.saisonEntree;
  appliquer(entree);
  for (let saison = entree; saison < monde.saison; saison++) {
    const ligne = saisonDuJoueur(j, monde, saison); saisons.push(ligne);
    if (j.categorie !== ligne.categorie && (j.categorie === 'espoirs' || j.categorie === 'senior')) {
      mouvements.push({ saison: saison + 1, de: ligne.club, vers: ligne.club, motif: j.categorie,
        indemnite: 0, ...(j.categorie === 'senior' && planClubJeunes(j.club).niveau <= 3 ? { finContrat: saison + 3 } : {}) });
    }
    if (j.statut === 'RETIRED' && ligne.statut !== 'RETIRED') {
      mouvements.push({ saison: saison + 1, de: j.club, vers: j.club, motif: 'retraite', indemnite: 0 });
    }
    for (const m of resultat.mouvements.get(id) ?? []) if (m.saison === saison + 1) {
      j.club = m.vers;
      if (m.motif === 'retour_pret') { j.clubProprietaire = undefined; j.finPret = undefined;
        j.categorie = j.age > 23 ? 'senior' : j.age <= 18 ? 'u18' : 'espoirs'; }
      else { j.categorie = j.age <= 18 ? 'u18' : j.age <= 23 && j.note < (NOTE_PAR_NIVEAU[planClubJeunes(j.club).niveau] ?? 38) - 7 ? 'espoirs' : 'senior';
        if (j.categorie === 'senior') j.statut = 'SENIOR'; }
      mouvements.push({ ...m });
    }
    appliquer(saison + 1);
  }
  const youthClubs = [...new Set([actuel.source.clubSource, ...saisons.filter(s => s.categorie !== 'senior').map(s => s.club)])];
  const seniorClubs = [...new Set(saisons.filter(s => s.categorie === 'senior').map(s => s.club))];
  const pro = saisons.find(s => s.categorie === 'senior' && s.matchs > 0 && (competitionClub(s.club)?.niveau ?? 8) <= 3);
  return { sourcePlayerId: id, youthClubs, seniorClubs, saisons, mouvements,
    ...(pro ? { debutsPro: { saison: pro.saison, annee: pro.annee, age: pro.age, club: pro.club } } : {}),
    sources: actuel.source.sourceSeasonHistory.map(s => ({ ...s })) };
}

/** L'interface senior reçoit une estimation, jamais le plafond interne. */
export function seniorsMondeDuClub(monde: MondeJeunesCarriere, club: string, saison = monde.saison): (Coequipier & { potentielEstime: [number, number]; sourcePlayerId: string })[] {
  const aLaSaison = saison === monde.saison ? monde : { ...monde, saison };
  return (calculerMonde(aLaSaison).parClub.get(club) ?? []).filter(j => j.statut === 'SENIOR' && j.categorie === 'senior')
    .map(j => {
      const rng = graine(`potentiel-senior:${monde.graine}:${j.source.sourcePlayerId}:${saison}`);
      const centre = borner(j.potentiel + (rng() * 2 - 1) * 3, j.note, 94);
      const bas = Math.round(Math.max(j.note, centre - 5)); const haut = Math.round(Math.min(96, Math.max(bas + 2, centre + 5)));
      return { id: j.source.sourcePlayerId, sourcePlayerId: j.source.sourcePlayerId, nom: j.source.nom,
        poste: j.source.poste, postesSecondaires: [...j.postesSecondaires], age: j.age, note: j.note,
        potentiel: Math.round((bas + haut) / 2), potentielEstime: [bas, haut] as [number, number],
        nation: 'France', regen: !!j.saisonEntree, duCentre: true, horsGeneration: true, clubReel: j.club,
        championnat: competitionClub(j.club)?.nom };
    });
}

export function bilanMondeJeunes(monde: MondeJeunesCarriere): {
  total: number; jeunes: number; seniors: number; retraites: number; pros: number; transfertsIA: number; disponible: boolean;
} {
  const r = calculerMonde(monde);
  return { total: r.joueurs.length, jeunes: r.joueurs.filter(j => j.statut === 'YOUTH').length,
    seniors: r.joueurs.filter(j => j.statut === 'SENIOR').length, retraites: r.joueurs.filter(j => j.statut === 'RETIRED').length,
    pros: r.joueurs.filter(j => j.categorie === 'senior' && j.statut !== 'RETIRED' && niveauDe(j) <= 3).length,
    transfertsIA: [...r.mouvements.values()].reduce((total, ms) => total + ms.filter(m => m.motif === 'recrutement').length, 0),
    disponible: mondeJeunesDisponible(monde) };
}
