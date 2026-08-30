// ═══════════════════════════════════════════════════════════════════════════
// LA CARRIÈRE PROFONDE — déléguer, appartenir à un club et laisser des traces
// ═══════════════════════════════════════════════════════════════════════════
//
// Cette couche ne crée pas des anecdotes isolées. Elle conserve les personnes,
// les liens, les réputations, les records et les choix politiques qui donnent
// une couleur différente à deux sauvegardes de trente saisons.

import { competitionDuClub } from '../data/clubs';
import { POSTE_PAR_ID } from '../data/rugby';
import type { Manager, PosteId, ResultatMatchManager, TactiqueManager } from '../types';
import { graine } from './championnat';
import type { Coequipier } from './effectif';
import type { Identite } from './identiteClub';
import { nomNation } from './nations';

const borne = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const moyenne = (nombres: number[]) => nombres.length
  ? nombres.reduce((total, n) => total + n, 0) / nombres.length
  : 0;

export const DOMAINES_DELEGATION = [
  'recrutement', 'contrats', 'renouvellements', 'prets', 'jeunes',
  'staff', 'entrainements', 'compositions', 'amicaux',
] as const;
export type DomaineDelegation = (typeof DOMAINES_DELEGATION)[number];

export const LIBELLES_DELEGATION: Record<DomaineDelegation, string> = {
  recrutement: 'Recrutement', contrats: 'Négociations de contrats',
  renouvellements: 'Renouvellements', prets: 'Prêts', jeunes: 'Recrutement des jeunes',
  staff: 'Staff', entrainements: 'Entraînements', compositions: 'Compositions', amicaux: 'Amicaux',
};

export interface DelegationsManager {
  recrutement: boolean;
  contrats: boolean;
  renouvellements: boolean;
  prets: boolean;
  jeunes: boolean;
  staff: boolean;
  entrainements: boolean;
  compositions: boolean;
  amicaux: boolean;
}

export interface DirecteurSportif {
  id: string;
  nom: string;
  evaluation: number;
  recrutement: number;
  negociation: number;
  formation: number;
  gestionStaff: number;
  tactique: number;
  prudence: number;
  reputation: number;
  salaire: number;
}

export interface DecisionDeleguee {
  id: string;
  domaine: DomaineDelegation;
  saison: number;
  semaine: number;
  qualite: 'bonne' | 'moyenne' | 'mauvaise';
  score: number;
  titre: string;
  detail: string;
}

export interface ProfilTactiqueManager {
  jeuAuLarge: number;
  jeuAuPied: number;
  possession: number;
  rythme: number;
  defenseAgressive: number;
  conquete: number;
  matchsObserves: number;
}

export type TagManager =
  | 'Formateur' | 'Rugby offensif' | 'Excellent tacticien'
  | 'Gestionnaire humain' | 'Gestion difficile du vestiaire'
  | 'Maître de la conquête' | 'Pragmatique' | 'Fidèle à son club';

export type TypeRelationJoueurs = 'amitie' | 'respect' | 'rivalite' | 'mentor' | 'conflit' | 'famille';
export interface RelationJoueurs {
  id: string;
  joueurA: string;
  joueurB: string;
  type: TypeRelationJoueurs;
  intensite: number;
  depuis: number;
  derniereEvolution: number;
}

export type AmbitionCachee =
  | 'devenirInternational' | 'gagnerElite' | 'jouerPremiereDivision'
  | 'devenirTitulaire' | 'gagnerArgent' | 'resterRegion'
  | 'jouerEtranger' | 'devenirCapitaine' | 'jouerAvecProche'
  | 'finirClubFormateur';
export type PreferenceAvenir = 'rester' | 'retourPays' | 'autreChampionnat' | 'indecis';

export interface IntegrationJoueur {
  joueurId: string;
  nom: string;
  nation: string;
  adaptationPays: number;
  adaptationClub: number;
  langue: number;
  cohesion: number;
  adaptabilite: number;
  saisonsAuClub: number;
  bonheur: number;
  ambition: AmbitionCachee;
  ambitionRevelee: boolean;
  preferenceAvenir: PreferenceAvenir;
}

export interface HierarchieCapitaines {
  capitaineId: string;
  viceCapitaineId: string;
  troisiemeCapitaineId: string;
  derniereModification: number;
}

export type ProfilSupporters = 'traditionnels' | 'passionnes' | 'familiaux' | 'occasionnels';
export interface SupportersClub {
  confiance: number;
  profils: Record<ProfilSupporters, number>;
  motifs: { texte: string; delta: number; saison: number; semaine: number }[];
}

export interface ReputationsClub {
  locale: number;
  nationale: number;
  internationale: number;
}

export interface PopulariteJoueur {
  joueurId: string;
  nom: string;
  locale: number;
  nationale: number;
  internationale: number;
  marketing: number;
}

export type TypePresident = 'batisseur' | 'ambitieux' | 'financier' | 'mecene' | 'local';
export interface PresidentClub {
  id: string;
  nom: string;
  type: TypePresident;
  patience: number;
  ambition: number;
  finances: number;
  formation: number;
  localisme: number;
  depuis: number;
}

export interface StatHistoriqueJoueur {
  joueurId: string;
  nom: string;
  poste: PosteId;
  ageDebut: number;
  matchs: number;
  essais: number;
  points: number;
  capitanats: number;
  numeros: Record<string, number>;
  scoreHistorique: number;
}

export interface RecordHistorique {
  id: string;
  libelle: string;
  valeur: number;
  unite: string;
  saison: number;
  joueurId?: string;
  joueurNom?: string;
  adversaire?: string;
}

export interface RegistreRecords {
  club: Record<string, RecordHistorique>;
  championnat: Record<string, RecordHistorique>;
  joueurs: Record<string, StatHistoriqueJoueur>;
  serieVictoires: number;
  serieInvaincue: number;
  xvHistorique: Partial<Record<PosteId, StatHistoriqueJoueur>>;
}

export interface ChoixStrategique {
  id: string;
  label: string;
  consequence: string;
  confianceDirection: number;
  confianceSupporters: number;
  budgetTransferts: number;
  budgetStructure: number;
  duree: number;
  axes: Partial<Record<'formation' | 'recrutement' | 'professionnalisation' | 'local', number>>;
}

export interface DecisionStrategiqueProfonde {
  id: string;
  saison: number;
  semaine: number;
  titre: string;
  texte: string;
  choix: ChoixStrategique[];
  choisie?: string;
}

export interface EffetStrategique {
  id: string;
  libelle: string;
  jusquA: number;
  axes: ChoixStrategique['axes'];
}

export interface EvenementChronologie {
  id: string;
  saison: number;
  semaine: number;
  mois: string;
  categorie: 'transfert' | 'manager' | 'international' | 'record' | 'titre' | 'retraite' | 'direction' | 'derby';
  importance: 1 | 2 | 3;
  titre: string;
  texte: string;
}

export interface FinCarriereJoueurProfonde {
  joueurId: string;
  nom: string;
  saison: number;
  age: number;
  choix: 'retraite' | 'prolongation' | 'divisionInferieure' | 'clubFormateur' | 'etranger' | 'roleReduit';
  hommage: boolean;
  texte: string;
}

export interface VieClubProfonde {
  club: string;
  supporters: SupportersClub;
  reputations: ReputationsClub;
  president: PresidentClub;
  records: RegistreRecords;
  popularites: Record<string, PopulariteJoueur>;
  revenuMarketingDerniereSaison: number;
}

export interface EtatCarriereProfonde {
  version: 1;
  delegations: DelegationsManager;
  directeurSportif: DirecteurSportif;
  decisionsDeleguees: DecisionDeleguee[];
  profilManager: ProfilTactiqueManager;
  tagsManager: TagManager[];
  relations: RelationJoueurs[];
  integrations: Record<string, IntegrationJoueur>;
  capitaines: HierarchieCapitaines;
  clubs: Record<string, VieClubProfonde>;
  decisionsStrategiques: DecisionStrategiqueProfonde[];
  effetsStrategiques: EffetStrategique[];
  chronologie: EvenementChronologie[];
  finsCarriere: FinCarriereJoueurProfonde[];
}

const delegationsInitiales = (): DelegationsManager => Object.fromEntries(
  DOMAINES_DELEGATION.map((domaine) => [domaine, false]),
) as unknown as DelegationsManager;

const moisDeSemaine = (semaine: number): string => {
  const mois = ['Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet'];
  return mois[Math.min(mois.length - 1, Math.floor(Math.max(0, semaine - 1) / 4))];
};

function directeurInitial(club: string): DirecteurSportif {
  const rng = graine(`directeur-sportif#${club}`);
  const prenoms = ['Laurent', 'Émilie', 'Romain', 'Sophie', 'Gonzalo', 'Ugo', 'Patrice', 'Léa'];
  const noms = ['Martel', 'Ledesma', 'Brunel', 'Farrell', 'Davies', 'Collazo', 'Smith', 'Bouscatel'];
  return {
    id: `ds-${club}`, nom: `${prenoms[Math.floor(rng() * prenoms.length)]} ${noms[Math.floor(rng() * noms.length)]}`,
    evaluation: 35 + Math.round(rng() * 55), recrutement: 28 + Math.round(rng() * 67),
    negociation: 28 + Math.round(rng() * 67), formation: 28 + Math.round(rng() * 67),
    gestionStaff: 28 + Math.round(rng() * 67), tactique: 28 + Math.round(rng() * 67),
    prudence: 20 + Math.round(rng() * 75), reputation: 24 + Math.round(rng() * 70),
    salaire: 20_000 + Math.round(rng() * 160_000 / 5_000) * 5_000,
  };
}

function presidentInitial(club: string, saison: number): PresidentClub {
  const rng = graine(`president#${club}#${Math.floor((saison - 1) / 6)}`);
  const types: TypePresident[] = ['batisseur', 'ambitieux', 'financier', 'mecene', 'local'];
  const type = types[Math.floor(rng() * types.length)];
  const bonus = (vise: TypePresident) => type === vise ? 24 : 0;
  return {
    id: `president-${club}-${saison}`, nom: `${['Jean', 'Claire', 'Marc', 'Nadia', 'Pierre', 'Anne'][Math.floor(rng() * 6)]} ${['Lacombe', 'Brennus', 'Rivière', 'Marty', 'Fontaine', 'Serra'][Math.floor(rng() * 6)]}`,
    type, patience: borne(42 + rng() * 32 - bonus('ambitieux') * .45),
    ambition: borne(48 + rng() * 28 + bonus('ambitieux') + bonus('mecene') * .5),
    finances: borne(45 + rng() * 28 + bonus('financier') + bonus('mecene') * .55),
    formation: borne(42 + rng() * 28 + bonus('batisseur') + bonus('local') * .45),
    localisme: borne(40 + rng() * 30 + bonus('local')), depuis: saison,
  };
}

function supportersInitiaux(club: string): SupportersClub {
  const rng = graine(`supporters#${club}`);
  const traditionnels = 24 + Math.round(rng() * 28);
  const passionnes = 12 + Math.round(rng() * 20);
  const familiaux = 14 + Math.round(rng() * 23);
  const occasionnels = Math.max(8, 100 - traditionnels - passionnes - familiaux);
  const somme = traditionnels + passionnes + familiaux + occasionnels;
  return {
    confiance: 62,
    profils: {
      traditionnels: Math.round(traditionnels / somme * 100),
      passionnes: Math.round(passionnes / somme * 100),
      familiaux: Math.round(familiaux / somme * 100),
      occasionnels: Math.round(occasionnels / somme * 100),
    },
    motifs: [],
  };
}

function registreVide(): RegistreRecords {
  return { club: {}, championnat: {}, joueurs: {}, serieVictoires: 0, serieInvaincue: 0, xvHistorique: {} };
}

function vieClubInitiale(club: string, saison: number): VieClubProfonde {
  const niveau = competitionDuClub(club)?.niveau ?? 8;
  return {
    club, supporters: supportersInitiaux(club), president: presidentInitial(club, saison), records: registreVide(), popularites: {},
    reputations: { locale: borne(74 - niveau * 3), nationale: borne(58 - niveau * 5), internationale: borne(34 - niveau * 4) },
    revenuMarketingDerniereSaison: 0,
  };
}

function ambitionPour(joueurId: string): AmbitionCachee {
  const ambitions: AmbitionCachee[] = ['devenirInternational', 'gagnerElite', 'jouerPremiereDivision', 'devenirTitulaire', 'gagnerArgent', 'resterRegion', 'jouerEtranger', 'devenirCapitaine', 'jouerAvecProche', 'finirClubFormateur'];
  return ambitions[Math.floor(graine(`ambition#${joueurId}`)() * ambitions.length)];
}

function integrationInitiale(j: Coequipier, m: Manager): IntegrationJoueur {
  const rng = graine(`integration#${j.id}#${m.club}`);
  const paysClub = competitionDuClub(m.club)?.pays ?? 'France';
  const local = nomNation(j.nation).toLowerCase().includes(paysClub.toLowerCase());
  return {
    joueurId: j.id, nom: j.nom, nation: j.nation,
    adaptationPays: local ? 100 : 25 + Math.round(rng() * 28),
    adaptationClub: j.duCentre ? 100 : 38 + Math.round(rng() * 30),
    langue: local ? 100 : 12 + Math.round(rng() * 38), cohesion: j.duCentre ? 88 : 32 + Math.round(rng() * 34),
    adaptabilite: 24 + Math.round(rng() * 72), saisonsAuClub: j.duCentre ? Math.max(2, j.age - 17) : 0,
    bonheur: 58 + Math.round(rng() * 22), ambition: ambitionPour(j.id), ambitionRevelee: false, preferenceAvenir: 'indecis',
  };
}

function populariteInitiale(j: Coequipier, integration: IntegrationJoueur): PopulariteJoueur {
  const rng = graine(`popularite#${j.id}`);
  const local = j.duCentre ? 18 : 0;
  const marketing = borne(j.note * .72 + j.potentiel * .15 + local + rng() * 16);
  return {
    joueurId: j.id, nom: j.nom,
    locale: borne(j.note * .55 + integration.saisonsAuClub * 5 + local + rng() * 12),
    nationale: borne(j.note * .62 - 18 + rng() * 14),
    internationale: borne(j.note * .58 - 30 + rng() * 12), marketing,
  };
}

function relationsInitiales(effectif: Coequipier[], saison: number): RelationJoueurs[] {
  const relations: RelationJoueurs[] = [];
  const deja = new Set<string>();
  for (const joueur of effectif) {
    const rng = graine(`relations#${joueur.id}`);
    const candidats = effectif.filter((autre) => autre.id !== joueur.id);
    const autre = candidats[Math.floor(rng() * candidats.length)];
    if (!autre) continue;
    const paire = [joueur.id, autre.id].sort();
    const cle = paire.join('|');
    if (deja.has(cle)) continue;
    deja.add(cle);
    const memeNom = joueur.nom.split(' ').slice(-1)[0] === autre.nom.split(' ').slice(-1)[0];
    const ecartAge = joueur.age - autre.age;
    const type: TypeRelationJoueurs = memeNom && rng() > .55 ? 'famille'
      : Math.abs(ecartAge) >= 8 && rng() > .42 ? 'mentor'
        : joueur.poste === autre.poste && rng() > .52 ? 'rivalite'
          : rng() > .88 ? 'conflit' : rng() > .46 ? 'amitie' : 'respect';
    relations.push({ id: `relation-${paire.join('-')}`, joueurA: paire[0], joueurB: paire[1], type, intensite: 38 + Math.round(rng() * 46), depuis: saison, derniereEvolution: saison });
  }
  return relations.slice(0, Math.max(8, Math.round(effectif.length * .7)));
}

export function creerEtatCarriereProfonde(m: Manager, effectif: Coequipier[]): EtatCarriereProfonde {
  const integrations = Object.fromEntries(effectif.map((j) => [j.id, integrationInitiale(j, m)]));
  const vie = vieClubInitiale(m.club, m.saison);
  vie.popularites = Object.fromEntries(effectif.map((j) => [j.id, populariteInitiale(j, integrations[j.id])]));
  return {
    version: 1, delegations: delegationsInitiales(), directeurSportif: directeurInitial(m.club), decisionsDeleguees: [],
    profilManager: { jeuAuLarge: 50, jeuAuPied: 50, possession: 50, rythme: 50, defenseAgressive: 50, conquete: 50, matchsObserves: 0 },
    tagsManager: [], relations: relationsInitiales(effectif, m.saison), integrations,
    capitaines: { capitaineId: m.composition.capitaineId, viceCapitaineId: '', troisiemeCapitaineId: '', derniereModification: m.saison },
    clubs: { [m.club]: vie }, decisionsStrategiques: [], effetsStrategiques: [], chronologie: [], finsCarriere: [],
  };
}

export function assurerEtatCarriereProfonde(etat: EtatCarriereProfonde | undefined, m: Manager, effectif: Coequipier[]): EtatCarriereProfonde {
  if (!etat) return creerEtatCarriereProfonde(m, effectif);
  const integrations = { ...etat.integrations };
  const clubs = { ...etat.clubs };
  const vie = clubs[m.club] ? { ...clubs[m.club], popularites: { ...clubs[m.club].popularites } } : vieClubInitiale(m.club, m.saison);
  for (const j of effectif) {
    integrations[j.id] ??= integrationInitiale(j, m);
    integrations[j.id] = { ...integrations[j.id], nom: j.nom, nation: j.nation };
    vie.popularites[j.id] ??= populariteInitiale(j, integrations[j.id]);
  }
  clubs[m.club] = vie;
  const ids = new Set(effectif.map((j) => j.id));
  const relations = [...etat.relations];
  const presentes = relations.filter((r) => ids.has(r.joueurA) && ids.has(r.joueurB)).length;
  if (presentes < Math.max(5, effectif.length / 3)) {
    for (const r of relationsInitiales(effectif, m.saison)) if (!relations.some((x) => x.id === r.id)) relations.push(r);
  }
  return {
    ...etat, version: 1, integrations, clubs, relations,
    capitaines: {
      ...etat.capitaines,
      capitaineId: m.composition.capitaineId || etat.capitaines.capitaineId,
      viceCapitaineId: ids.has(etat.capitaines.viceCapitaineId) ? etat.capitaines.viceCapitaineId : '',
      troisiemeCapitaineId: ids.has(etat.capitaines.troisiemeCapitaineId) ? etat.capitaines.troisiemeCapitaineId : '',
    },
  };
}

export function vieClubProfonde(etat: EtatCarriereProfonde | undefined, club: string): VieClubProfonde | undefined {
  return etat?.clubs[club];
}

export function configurerDelegationProfonde(etat: EtatCarriereProfonde, domaine: DomaineDelegation, delegue: boolean): EtatCarriereProfonde {
  return { ...etat, delegations: { ...etat.delegations, [domaine]: delegue } };
}

export function definirCapitainesProfonde(etat: EtatCarriereProfonde, m: Manager, capitaineId: string, viceCapitaineId: string, troisiemeCapitaineId: string): EtatCarriereProfonde {
  const ancien = etat.capitaines.capitaineId;
  const clubs = { ...etat.clubs };
  const vie = clubs[m.club] ? { ...clubs[m.club], supporters: { ...clubs[m.club].supporters, motifs: [...clubs[m.club].supporters.motifs] } } : vieClubInitiale(m.club, m.saison);
  if (ancien && ancien !== capitaineId) {
    const popularite = vie.popularites[ancien]?.locale ?? 40;
    const delta = popularite >= 75 ? -6 : -2;
    vie.supporters = { ...vie.supporters, confiance: borne(vie.supporters.confiance + delta), motifs: [{ texte: `Le brassard a été retiré à ${vie.popularites[ancien]?.nom ?? 'un cadre'}.`, delta, saison: m.saison, semaine: m.semaine }, ...vie.supporters.motifs].slice(0, 8) };
  }
  clubs[m.club] = vie;
  return { ...etat, clubs, capitaines: { capitaineId, viceCapitaineId, troisiemeCapitaineId, derniereModification: m.saison } };
}

function aptitudeCapitaine(j: Coequipier, etat: EtatCarriereProfonde, rang: number): number {
  const integration = etat.integrations[j.id];
  const stat = Object.values(etat.clubs).map((c) => c.records.joueurs[j.id]).find(Boolean);
  const rng = graine(`capitaine#${j.id}`);
  const leadership = 35 + rng() * 60;
  const sangFroid = 30 + rng() * 65;
  const discipline = 38 + rng() * 58;
  return borne(leadership * .24 + sangFroid * .18 + discipline * .14 + Math.min(100, j.age * 2.7) * .15 + (integration?.cohesion ?? 50) * .2 + Math.min(100, (stat?.matchs ?? 0) * 3) * .09 - rang * 2);
}

export function ajustementsCapitaines(etat: EtatCarriereProfonde | undefined, effectif: Coequipier[]): Record<string, number> {
  if (!etat) return {};
  const ids = [etat.capitaines.capitaineId, etat.capitaines.viceCapitaineId, etat.capitaines.troisiemeCapitaineId];
  const joueur = effectif.find((j) => j.id === ids[0]);
  if (!joueur) return {};
  const aptitude = aptitudeCapitaine(joueur, etat, 0);
  // MatchLive soustrait cette valeur : une valeur négative est donc un bonus.
  return { [joueur.id]: aptitude >= 70 ? -2 : aptitude < 45 ? 3 : 0 };
}

function tagsDuProfil(profil: ProfilTactiqueManager, relationMoyenne: number, formation: number): TagManager[] {
  const tags: TagManager[] = [];
  if (formation >= 68) tags.push('Formateur');
  if (profil.jeuAuLarge >= 68 && profil.rythme >= 62) tags.push('Rugby offensif');
  if (profil.matchsObserves >= 18 && moyenne([profil.jeuAuLarge, profil.jeuAuPied, profil.possession, profil.defenseAgressive, profil.conquete]) >= 62) tags.push('Excellent tacticien');
  if (relationMoyenne >= 68) tags.push('Gestionnaire humain');
  if (relationMoyenne < 42) tags.push('Gestion difficile du vestiaire');
  if (profil.conquete >= 72) tags.push('Maître de la conquête');
  if (profil.jeuAuPied >= 68 && profil.rythme <= 48) tags.push('Pragmatique');
  return tags.slice(0, 4);
}

function profilApresMatch(profil: ProfilTactiqueManager, tactique: TactiqueManager, resultat: ResultatMatchManager): ProfilTactiqueManager {
  const cible = {
    jeuAuLarge: tactique.attaque === 'large' ? 88 : tactique.attaque === 'avants' ? 28 : 52,
    jeuAuPied: tactique.attaque === 'occupation' ? 88 : tactique.penalites === 'points' ? 68 : 42,
    possession: tactique.attaque === 'avants' ? 72 : tactique.attaque === 'occupation' ? 38 : 58,
    rythme: tactique.rythme === 'intense' ? 88 : tactique.rythme === 'gestion' ? 34 : 58,
    defenseAgressive: tactique.defense === 'blitz' ? 88 : tactique.defense === 'repli' ? 34 : 60,
    conquete: tactique.attaque === 'avants' ? 82 : 54 + Math.min(12, resultat.essaisPour * 2),
  };
  const poids = Math.min(.12, 1 / Math.max(8, profil.matchsObserves + 1));
  return {
    jeuAuLarge: borne(profil.jeuAuLarge * (1 - poids) + cible.jeuAuLarge * poids),
    jeuAuPied: borne(profil.jeuAuPied * (1 - poids) + cible.jeuAuPied * poids),
    possession: borne(profil.possession * (1 - poids) + cible.possession * poids),
    rythme: borne(profil.rythme * (1 - poids) + cible.rythme * poids),
    defenseAgressive: borne(profil.defenseAgressive * (1 - poids) + cible.defenseAgressive * poids),
    conquete: borne(profil.conquete * (1 - poids) + cible.conquete * poids),
    matchsObserves: profil.matchsObserves + 1,
  };
}

export function contexteDerby(clubA: string, clubB: string): { derby: boolean; distance: number; motivation: number; pression: number; medias: number } {
  const rng = graine(`distance-clubs#${[clubA, clubB].sort().join('#')}`);
  const memeCompetition = competitionDuClub(clubA)?.id === competitionDuClub(clubB)?.id;
  const distance = Math.round(8 + rng() * (memeCompetition ? 220 : 760));
  const derby = distance <= 55;
  return { derby, distance, motivation: derby ? 2 : 0, pression: derby ? 18 : 0, medias: derby ? 24 : 0 };
}

function ajouterMotif(supporters: SupportersClub, texte: string, delta: number, m: Manager): SupportersClub {
  return { ...supporters, confiance: borne(supporters.confiance + delta), motifs: [{ texte, delta, saison: m.saison, semaine: m.semaine }, ...supporters.motifs].slice(0, 8) };
}

function meilleurRecord(registre: Record<string, RecordHistorique>, record: RecordHistorique, sens: 'max' | 'min' = 'max'): { registre: Record<string, RecordHistorique>; battu: boolean } {
  const precedent = registre[record.id];
  const battu = !precedent || (sens === 'max' ? record.valeur > precedent.valeur : record.valeur < precedent.valeur);
  return { registre: battu ? { ...registre, [record.id]: record } : registre, battu };
}

function recalculerXv(stats: Record<string, StatHistoriqueJoueur>): Partial<Record<PosteId, StatHistoriqueJoueur>> {
  const xv: Partial<Record<PosteId, StatHistoriqueJoueur>> = {};
  for (const stat of Object.values(stats)) {
    if (!xv[stat.poste] || (xv[stat.poste]?.scoreHistorique ?? 0) < stat.scoreHistorique) xv[stat.poste] = stat;
  }
  return xv;
}

function miseAJourRecords(vie: VieClubProfonde, m: Manager, effectif: Coequipier[], resultat: ResultatMatchManager): { vie: VieClubProfonde; recordsBattus: RecordHistorique[] } {
  const records = { ...vie.records, club: { ...vie.records.club }, championnat: { ...vie.records.championnat }, joueurs: { ...vie.records.joueurs } };
  const alignes = [...m.composition.titulaires, ...m.composition.remplacants].filter(Boolean);
  const buteur = m.composition.buteurId;
  const marqueurs = effectif.filter((j) => alignes.includes(j.id)).sort((a, b) => graine(`essais#${resultat.cle}#${a.id}`)() - graine(`essais#${resultat.cle}#${b.id}`)());
  for (const j of effectif.filter((x) => alignes.includes(x.id))) {
    const ancienne = records.joueurs[j.id] ?? { joueurId: j.id, nom: j.nom, poste: j.poste, ageDebut: j.age, matchs: 0, essais: 0, points: 0, capitanats: 0, numeros: {}, scoreHistorique: 0 };
    const numero = String(POSTE_PAR_ID[j.poste]?.numero ?? 0);
    const essais = marqueurs.slice(0, resultat.essaisPour).filter((x) => x.id === j.id).length;
    const points = j.id === buteur ? Math.max(0, resultat.scorePour - resultat.essaisPour * 5) : essais * 5;
    const suivante = {
      ...ancienne, nom: j.nom, matchs: ancienne.matchs + 1, essais: ancienne.essais + essais,
      points: ancienne.points + points, capitanats: ancienne.capitanats + (j.id === m.composition.capitaineId ? 1 : 0),
      numeros: { ...ancienne.numeros, [numero]: (ancienne.numeros[numero] ?? 0) + 1 },
      scoreHistorique: 0,
    };
    suivante.scoreHistorique = Math.round(suivante.matchs * 2 + suivante.essais * 5 + suivante.points * .18 + suivante.capitanats * 1.5 + (j.duCentre ? 35 : 0));
    records.joueurs[j.id] = suivante;
  }
  const battus: RecordHistorique[] = [];
  const saison = m.saison;
  const candidatJoueur = (id: string, libelle: string, stat: StatHistoriqueJoueur, valeur: number, unite: string, sens: 'max' | 'min' = 'max') => {
    const record = { id, libelle, valeur, unite, saison, joueurId: stat.joueurId, joueurNom: stat.nom };
    const precedent = records.club[id];
    const maj = meilleurRecord(records.club, record, sens); records.club = maj.registre; if (maj.battu) battus.push(record);
    if (maj.battu) {
      const pas = id === 'matchs' ? 50 : id === 'essais' ? 10 : id === 'points' ? 100 : id === 'capitanats' ? 25 : 1;
      const notable = !!precedent && (precedent.joueurId !== stat.joueurId || valeur % pas === 0);
      if (!notable) battus.pop();
    }
  };
  const stats = Object.values(records.joueurs);
  for (const stat of stats) {
    candidatJoueur('matchs', 'Plus grand nombre de matchs', stat, stat.matchs, 'matchs');
    candidatJoueur('essais', 'Plus grand nombre d’essais', stat, stat.essais, 'essais');
    candidatJoueur('points', 'Plus grand nombre de points', stat, stat.points, 'points');
    candidatJoueur('capitanats', 'Plus grand nombre de matchs comme capitaine', stat, stat.capitanats, 'capitanats');
  }
  const numeros = new Map<string, number>();
  for (const stat of stats) for (const [numero, matchs] of Object.entries(stat.numeros)) numeros.set(numero, (numeros.get(numero) ?? 0) + matchs);
  const plusPorte = [...numeros.entries()].sort((a, b) => b[1] - a[1])[0];
  if (plusPorte) {
    const record = { id: 'numero-plus-porte', libelle: 'Numéro le plus porté', valeur: plusPorte[1], unite: 'matchs', saison, adversaire: `n°${plusPorte[0]}` };
    const maj = meilleurRecord(records.club, record); records.club = maj.registre; if (maj.battu) battus.push(record);
  }
  const matchsNumero10 = numeros.get('10') ?? 0;
  if (matchsNumero10 > 0) {
    const record = { id: 'numero-10', libelle: 'Nombre de matchs au n°10', valeur: matchsNumero10, unite: 'matchs', saison };
    const maj = meilleurRecord(records.club, record); records.club = maj.registre; if (maj.battu) battus.push(record);
  }
  for (const j of effectif.filter((x) => alignes.includes(x.id))) {
    const stat = records.joueurs[j.id];
    candidatJoueur('plus-jeune', 'Plus jeune joueur aligné', stat, j.age, 'ans', 'min');
    candidatJoueur('plus-vieux', 'Plus vieux joueur aligné', stat, j.age, 'ans');
  }
  const marge = resultat.scorePour - resultat.scoreContre;
  const equipe = [
    marge > 0 ? { id: 'plus-grosse-victoire', libelle: 'Plus grosse victoire', valeur: marge, unite: 'points', saison, adversaire: resultat.adversaire } : null,
    marge < 0 ? { id: 'plus-grosse-defaite', libelle: 'Plus grosse défaite', valeur: Math.abs(marge), unite: 'points', saison, adversaire: resultat.adversaire } : null,
  ].filter(Boolean) as RecordHistorique[];
  for (const record of equipe) { const maj = meilleurRecord(records.club, record); records.club = maj.registre; if (maj.battu) battus.push(record); }
  records.serieVictoires = marge > 0 ? records.serieVictoires + 1 : 0;
  records.serieInvaincue = marge >= 0 ? records.serieInvaincue + 1 : 0;
  for (const record of [
    { id: 'serie-victoires', libelle: 'Plus longue série de victoires', valeur: records.serieVictoires, unite: 'matchs', saison },
    { id: 'invincibilite', libelle: 'Record d’invincibilité', valeur: records.serieInvaincue, unite: 'matchs', saison },
  ]) { const maj = meilleurRecord(records.club, record); records.club = maj.registre; if (maj.battu && record.valeur > 1) battus.push(record); }
  const derby = contexteDerby(m.club, resultat.adversaire);
  const marketing = moyenne(Object.values(vie.popularites).map((p) => p.marketing));
  const affluence = Math.round((900 + vie.reputations.locale * 115) * (derby.derby ? 1.3 : 1) * (1 + marketing / 500) * (1 + Math.max(0, marge) / 150));
  const aff = { id: 'affluence', libelle: 'Plus grosse affluence', valeur: affluence, unite: 'spectateurs', saison, adversaire: resultat.adversaire };
  const majAff = meilleurRecord(records.club, aff); records.club = majAff.registre; if (majAff.battu) battus.push(aff);
  const championnat = [
    { id: 'essais-saison', libelle: 'Record d’essais sur une saison', valeur: Object.values(m.resultats).filter((r) => r.saison === saison && r.club === m.club).reduce((n, r) => n + r.essaisPour, 0), unite: 'essais', saison },
    { id: 'points-saison', libelle: 'Record de points sur une saison', valeur: Object.values(m.resultats).filter((r) => r.saison === saison && r.club === m.club).reduce((n, r) => n + r.scorePour, 0), unite: 'points', saison },
    { id: 'victoires-saison', libelle: 'Record de victoires sur une saison', valeur: Object.values(m.resultats).filter((r) => r.saison === saison && r.club === m.club && r.scorePour > r.scoreContre).length, unite: 'victoires', saison },
    { id: 'invincibilite-championnat', libelle: 'Record d’invincibilité du championnat', valeur: records.serieInvaincue, unite: 'matchs', saison },
    { id: 'affluence-championnat', libelle: 'Record d’affluence du championnat', valeur: affluence, unite: 'spectateurs', saison },
  ];
  for (const record of championnat) { const maj = meilleurRecord(records.championnat, record); records.championnat = maj.registre; if (maj.battu && record.valeur > 0) battus.push(record); }
  records.xvHistorique = recalculerXv(records.joueurs);
  return { vie: { ...vie, records }, recordsBattus: battus.filter((r) => !['matchs', 'essais', 'points', 'capitanats'].includes(r.id) || r.valeur > 1) };
}

export function apresResultatProfonde(etatInitial: EtatCarriereProfonde, m: Manager, effectif: Coequipier[], resultat: ResultatMatchManager, relationManagerMoyenne: number): EtatCarriereProfonde {
  let etat = assurerEtatCarriereProfonde(etatInitial, m, effectif);
  const clubs = { ...etat.clubs };
  let vie = { ...clubs[m.club], supporters: { ...clubs[m.club].supporters }, reputations: { ...clubs[m.club].reputations }, popularites: { ...clubs[m.club].popularites } };
  const victoire = resultat.scorePour > resultat.scoreContre;
  const nul = resultat.scorePour === resultat.scoreContre;
  const derby = contexteDerby(m.club, resultat.adversaire);
  const offensif = resultat.essaisPour >= 3;
  vie.supporters = ajouterMotif(vie.supporters,
    derby.derby ? `${victoire ? 'Derby remporté' : 'Derby non remporté'} à ${derby.distance} km.` : victoire ? 'Résultat satisfaisant.' : nul ? 'Match nul sans relief.' : 'Défaite mal vécue.',
    (victoire ? 3 : nul ? 0 : -3) * (derby.derby ? 1.7 : 1), m);
  if (offensif) vie.supporters = ajouterMotif(vie.supporters, 'Rugby offensif apprécié.', 2, m);
  else if (m.tactique.attaque === 'occupation' && !victoire) vie.supporters = ajouterMotif(vie.supporters, 'Rugby considéré trop prudent.', -2, m);
  vie.reputations.locale = borne(vie.reputations.locale + (victoire ? 1 : -.25) + (derby.derby && victoire ? 1 : 0));
  vie.reputations.nationale = borne(vie.reputations.nationale + (victoire ? .35 : -.1));
  vie.reputations.internationale = borne(vie.reputations.internationale + ((competitionDuClub(m.club)?.niveau ?? 9) <= 1 && victoire ? .18 : 0));
  const bilanRecords = miseAJourRecords(vie, m, effectif, resultat);
  vie = bilanRecords.vie;
  for (const j of effectif.filter((x) => [...m.composition.titulaires, ...m.composition.remplacants].includes(x.id))) {
    const pop = vie.popularites[j.id] ?? populariteInitiale(j, etat.integrations[j.id]);
    vie.popularites[j.id] = { ...pop, locale: borne(pop.locale + (victoire ? .7 : 0) + (j.id === m.composition.capitaineId ? .3 : 0)), marketing: borne(pop.marketing + (resultat.essaisPour >= 4 ? .25 : 0)) };
  }
  clubs[m.club] = vie;
  const profilManager = profilApresMatch(etat.profilManager, m.tactique, resultat);
  const jeunesAlignes = effectif.filter((j) => j.age <= 22 && [...m.composition.titulaires, ...m.composition.remplacants].includes(j.id)).length;
  const formation = borne(32 + jeunesAlignes * 8 + Math.min(20, m.tempsDeJeu ? Object.keys(m.tempsDeJeu).length : 0));
  const tagsManager = tagsDuProfil(profilManager, relationManagerMoyenne, formation);
  const chronologie = [...etat.chronologie];
  if (derby.derby || Math.abs(resultat.scorePour - resultat.scoreContre) >= 35) chronologie.push({ id: `chrono-match-${resultat.cle}`, saison: m.saison, semaine: m.semaine, mois: moisDeSemaine(m.semaine), categorie: derby.derby ? 'derby' : 'record', importance: derby.derby ? 3 : 2, titre: `${m.club} ${resultat.scorePour}-${resultat.scoreContre} ${resultat.adversaire}`, texte: derby.derby ? `Le derby disputé à ${derby.distance} km marque la saison.` : 'Un écart qui entre dans les livres du club.' });
  for (const record of bilanRecords.recordsBattus.slice(-4)) chronologie.push({ id: `chrono-record-${record.id}-${m.saison}-${m.semaine}-${record.valeur}`, saison: m.saison, semaine: m.semaine, mois: moisDeSemaine(m.semaine), categorie: 'record', importance: record.id.includes('serie') || record.id.includes('affluence') ? 2 : 1, titre: '🏆 Nouveau record du club', texte: `${record.joueurNom ? `${record.joueurNom} : ` : ''}${record.libelle.toLowerCase()} — ${record.valeur} ${record.unite}.` });
  return { ...etat, clubs, profilManager, tagsManager, chronologie: chronologie.slice(-600) };
}

function scoreDelegation(ds: DirecteurSportif, domaine: DomaineDelegation): number {
  if (domaine === 'recrutement') return ds.recrutement;
  if (domaine === 'contrats' || domaine === 'renouvellements' || domaine === 'prets') return ds.negociation;
  if (domaine === 'jeunes') return ds.formation;
  if (domaine === 'staff') return ds.gestionStaff;
  if (domaine === 'compositions' || domaine === 'amicaux') return ds.tactique;
  return moyenne([ds.tactique, ds.formation]);
}

function decisionDeleguee(etat: EtatCarriereProfonde, domaine: DomaineDelegation, m: Manager): DecisionDeleguee {
  const base = scoreDelegation(etat.directeurSportif, domaine);
  const rng = graine(`delegation#${domaine}#${m.club}#${m.saison}#${m.semaine}`);
  const score = borne(base + rng() * 28 - 14);
  const qualite = score >= 68 ? 'bonne' : score >= 45 ? 'moyenne' : 'mauvaise';
  const detailParDomaine: Record<DomaineDelegation, [string, string, string]> = {
    recrutement: ['Une cible cohérente avec l’ADN est suivie.', 'Le profil suivi apporte de la profondeur.', 'Le staff poursuit une cible coûteuse et peu adaptée.'],
    contrats: ['Les exigences d’un cadre ont été anticipées.', 'Les discussions avancent sans accord définitif.', 'Une négociation traîne et agace l’agent.'],
    renouvellements: ['Une prolongation prioritaire est sécurisée.', 'Un dossier est remis au prochain rendez-vous.', 'Un cadre entre dans sa dernière année sans solution.'],
    prets: ['Un jeune trouve un prêt avec du temps de jeu.', 'Une destination correcte est étudiée.', 'Le prêt proposé correspond mal au développement du joueur.'],
    jeunes: ['Un jeune à fort potentiel est identifié.', 'Le réseau suit plusieurs profils.', 'Le service surestime un jeune sur un échantillon trop faible.'],
    staff: ['Un spécialiste complémentaire est approché.', 'Le staff actuel est maintenu.', 'Une nomination de confort affaiblit la compétence du groupe.'],
    entrainements: ['La charge est individualisée et bien dosée.', 'Le programme reste équilibré.', 'La charge choisie fatigue plusieurs cadres.'],
    compositions: ['Le XV respecte forme, postes et hiérarchie.', 'Le staff privilégie la continuité.', 'Un choix contesté fragilise l’équilibre du vestiaire.'],
    amicaux: ['Un amical utile et rémunérateur est programmé.', 'Un match de préparation sans grand enjeu est retenu.', 'Le calendrier est inutilement alourdi.'],
  };
  return { id: `delegation-${domaine}-${m.saison}-${m.semaine}`, domaine, saison: m.saison, semaine: m.semaine, qualite, score, titre: `${LIBELLES_DELEGATION[domaine]} · ${qualite}`, detail: detailParDomaine[domaine][qualite === 'bonne' ? 0 : qualite === 'moyenne' ? 1 : 2] };
}

function faireEvoluerIntegrations(etat: EtatCarriereProfonde, m: Manager, effectif: Coequipier[]): Record<string, IntegrationJoueur> {
  const integrations = { ...etat.integrations };
  for (const j of effectif) {
    const i = integrations[j.id] ?? integrationInitiale(j, m);
    const compatriotes = effectif.filter((x) => x.id !== j.id && nomNation(x.nation) === nomNation(j.nation)).length;
    const vitesse = .45 + i.adaptabilite / 100 * 1.15 + Math.min(1.2, compatriotes * .3);
    const langue = borne(i.langue + vitesse * (compatriotes ? 1.25 : .75));
    const adaptationPays = borne(i.adaptationPays + vitesse * (langue / 100 + .45));
    const adaptationClub = borne(i.adaptationClub + vitesse * (i.bonheur / 100 + .55));
    const cohesion = borne(i.cohesion + vitesse * (m.tempsDeJeu[j.id] ? 1.15 : .65));
    integrations[j.id] = { ...i, langue, adaptationPays, adaptationClub, cohesion, bonheur: borne(i.bonheur + (adaptationClub >= 70 ? .3 : -.08)) };
  }
  return integrations;
}

export function genererDecisionStrategique(etat: EtatCarriereProfonde, m: Manager): DecisionStrategiqueProfonde | undefined {
  if (etat.decisionsStrategiques.some((d) => d.saison === m.saison)) return undefined;
  const rng = graine(`decision-profonde#${m.club}#${m.saison}`);
  if (rng() > .46) return undefined;
  const president = etat.clubs[m.club]?.president.type;
  const type = president === 'ambitieux' || president === 'mecene' ? (rng() > .52 ? 0 : 1)
    : president === 'batisseur' || president === 'local' ? (rng() > .5 ? 1 : 2)
      : president === 'financier' ? 1 : Math.floor(rng() * 3);
  if (type === 0) return {
    id: `strategie-pro-${m.saison}`, saison: m.saison, semaine: m.semaine,
    titre: 'Le club envisage de passer professionnel', texte: 'La décision engage les finances et les attentes pour plusieurs saisons.',
    choix: [
      { id: 'accepter', label: 'Accepter', consequence: 'Les moyens et la pression augmentent.', confianceDirection: 5, confianceSupporters: 4, budgetTransferts: 350_000, budgetStructure: -120_000, duree: 4, axes: { professionnalisation: 18, recrutement: 8 } },
      { id: 'opposer', label: 'S’opposer', consequence: 'Le club garde son modèle et protège sa trésorerie.', confianceDirection: -6, confianceSupporters: 2, budgetTransferts: 0, budgetStructure: 80_000, duree: 3, axes: { local: 10, professionnalisation: -8 } },
      { id: 'compromis', label: 'Proposer un compromis', consequence: 'La transition sera progressive.', confianceDirection: 1, confianceSupporters: 1, budgetTransferts: 140_000, budgetStructure: -40_000, duree: 3, axes: { professionnalisation: 8, formation: 5 } },
    ],
  };
  if (type === 1) return {
    id: `strategie-invest-${m.saison}`, saison: m.saison, semaine: m.semaine,
    titre: 'Deux millions pour transformer le club', texte: 'Le président demande où concentrer l’investissement exceptionnel.',
    choix: [
      { id: 'formation', label: 'Centre de formation', consequence: 'Le rendement sera lent mais durable.', confianceDirection: 2, confianceSupporters: 4, budgetTransferts: -250_000, budgetStructure: 500_000, duree: 5, axes: { formation: 20, local: 8 } },
      { id: 'recrutement', label: 'Équipe première', consequence: 'Le mercato gagne immédiatement en puissance.', confianceDirection: 4, confianceSupporters: 1, budgetTransferts: 650_000, budgetStructure: -180_000, duree: 3, axes: { recrutement: 18 } },
      { id: 'tresorerie', label: 'Conserver la trésorerie', consequence: 'Le club se protège contre les saisons difficiles.', confianceDirection: 3, confianceSupporters: -2, budgetTransferts: 100_000, budgetStructure: 100_000, duree: 4, axes: {} },
    ],
  };
  return {
    id: `strategie-politique-${m.saison}`, saison: m.saison, semaine: m.semaine,
    titre: 'Réorienter la politique sportive', texte: 'Formation locale ou réseau international : les deux voies ne peuvent être financées à fond.',
    choix: [
      { id: 'local', label: 'Priorité locale', consequence: 'Les traditionnels approuvent.', confianceDirection: 1, confianceSupporters: 6, budgetTransferts: -80_000, budgetStructure: 160_000, duree: 4, axes: { local: 18, formation: 12 } },
      { id: 'international', label: 'Réseau international', consequence: 'Le recrutement s’élargit mais l’identité locale s’efface.', confianceDirection: 4, confianceSupporters: -3, budgetTransferts: 180_000, budgetStructure: 0, duree: 4, axes: { recrutement: 18, local: -10 } },
      { id: 'equilibre', label: 'Maintenir l’équilibre', consequence: 'Aucun secteur n’est sacrifié.', confianceDirection: 0, confianceSupporters: 0, budgetTransferts: 0, budgetStructure: 0, duree: 2, axes: { formation: 4, recrutement: 4 } },
    ],
  };
}

export function avancerSemaineProfonde(etatInitial: EtatCarriereProfonde, m: Manager, effectif: Coequipier[], semaineSuivante: number): EtatCarriereProfonde {
  let etat = assurerEtatCarriereProfonde(etatInitial, m, effectif);
  const managerSuivant = { ...m, semaine: semaineSuivante };
  const integrations = faireEvoluerIntegrations(etat, managerSuivant, effectif);
  const decisionsDeleguees = [...etat.decisionsDeleguees];
  if ([1, 8, 16, 24, 32, 40].includes(semaineSuivante)) {
    for (const domaine of DOMAINES_DELEGATION.filter((d) => etat.delegations[d])) decisionsDeleguees.push(decisionDeleguee(etat, domaine, managerSuivant));
  }
  let decisionsStrategiques = [...etat.decisionsStrategiques];
  let chronologie = [...etat.chronologie];
  if ([12, 28].includes(semaineSuivante)) {
    const decision = genererDecisionStrategique({ ...etat, decisionsStrategiques }, managerSuivant);
    if (decision) {
      decisionsStrategiques.push(decision);
      chronologie.push({ id: `chrono-${decision.id}`, saison: m.saison, semaine: semaineSuivante, mois: moisDeSemaine(semaineSuivante), categorie: 'direction', importance: 2, titre: decision.titre, texte: 'Une décision pluriannuelle attend la réponse du manager.' });
    }
  }
  return { ...etat, integrations, decisionsDeleguees: decisionsDeleguees.slice(-90), decisionsStrategiques, chronologie: chronologie.slice(-600), effetsStrategiques: etat.effetsStrategiques.filter((e) => e.jusquA >= m.saison) };
}

export function repondreDecisionStrategiqueProfonde(etat: EtatCarriereProfonde, m: Manager, decisionId: string, choixId: string): { etat: EtatCarriereProfonde; choix?: ChoixStrategique } {
  const decision = etat.decisionsStrategiques.find((d) => d.id === decisionId && !d.choisie);
  const choix = decision?.choix.find((c) => c.id === choixId);
  if (!decision || !choix) return { etat };
  const clubs = { ...etat.clubs };
  const vie = clubs[m.club] ? { ...clubs[m.club], supporters: { ...clubs[m.club].supporters } } : vieClubInitiale(m.club, m.saison);
  vie.supporters = ajouterMotif(vie.supporters, choix.consequence, choix.confianceSupporters, m);
  clubs[m.club] = vie;
  const chronologie = [...etat.chronologie, { id: `chrono-choix-${decision.id}`, saison: m.saison, semaine: m.semaine, mois: moisDeSemaine(m.semaine), categorie: 'direction' as const, importance: 3 as const, titre: choix.label, texte: choix.consequence }];
  return {
    choix,
    etat: {
      ...etat, clubs, chronologie,
      decisionsStrategiques: etat.decisionsStrategiques.map((d) => d.id === decision.id ? { ...d, choisie: choix.id } : d),
      effetsStrategiques: [...etat.effetsStrategiques, { id: `effet-${decision.id}`, libelle: choix.label, jusquA: m.saison + choix.duree, axes: choix.axes }],
    },
  };
}

function preferenceFinSaison(i: IntegrationJoueur, j: Coequipier): PreferenceAvenir {
  if (i.bonheur >= 72 && i.adaptationClub >= 75) return 'rester';
  if (j.age >= 31 && i.adaptationPays < 62) return 'retourPays';
  if (i.ambition === 'jouerEtranger' || (i.ambition === 'devenirInternational' && i.bonheur < 55)) return 'autreChampionnat';
  return 'indecis';
}

function finCarriere(j: Coequipier, i: IntegrationJoueur, popularite: PopulariteJoueur | undefined, m: Manager): FinCarriereJoueurProfonde | undefined {
  if (j.age < 34) return undefined;
  const rng = graine(`fin-carriere-profonde#${j.id}#${m.saison}`);
  if (j.age < 36 && rng() > .22) return undefined;
  const choix: FinCarriereJoueurProfonde['choix'] = i.ambition === 'finirClubFormateur' ? 'clubFormateur'
    : j.age >= 38 ? 'retraite' : i.preferenceAvenir === 'retourPays' ? 'etranger'
      : j.note >= 65 && rng() > .55 ? 'prolongation' : rng() > .5 ? 'divisionInferieure' : 'roleReduit';
  const hommage = choix === 'retraite' && ((popularite?.locale ?? 0) >= 75 || i.saisonsAuClub >= 8);
  const textes: Record<FinCarriereJoueurProfonde['choix'], string> = {
    retraite: `${j.nom} annonce sa retraite après ${i.saisonsAuClub} saison(s) au club.`,
    prolongation: `${j.nom} souhaite prolonger une dernière saison.`,
    divisionInferieure: `${j.nom} veut terminer en retrouvant davantage de temps de jeu à l’échelon inférieur.`,
    clubFormateur: `${j.nom} souhaite terminer sa carrière dans son club formateur.`,
    etranger: `${j.nom} envisage un dernier défi dans son pays ou à l’étranger.`,
    roleReduit: `${j.nom} accepte de continuer avec un rôle réduit et une mission de transmission.`,
  };
  return { joueurId: j.id, nom: j.nom, saison: m.saison, age: j.age, choix, hommage, texte: textes[choix] };
}

export function finSaisonProfonde(etatInitial: EtatCarriereProfonde, m: Manager, effectif: Coequipier[], rang: number): EtatCarriereProfonde {
  let etat = assurerEtatCarriereProfonde(etatInitial, m, effectif);
  const clubs = { ...etat.clubs };
  let vie = { ...clubs[m.club], supporters: { ...clubs[m.club].supporters }, reputations: { ...clubs[m.club].reputations }, popularites: { ...clubs[m.club].popularites } };
  const integrations = { ...etat.integrations };
  for (const j of effectif) {
    const i = integrations[j.id] ?? integrationInitiale(j, m);
    integrations[j.id] = { ...i, saisonsAuClub: i.saisonsAuClub + 1, ambitionRevelee: i.ambitionRevelee || i.cohesion >= 72, preferenceAvenir: preferenceFinSaison(i, j) };
  }
  const popularites = Object.values(vie.popularites);
  const marketingMoyen = moyenne(popularites.map((p) => p.marketing));
  const professionnel = (competitionDuClub(m.club)?.niveau ?? 9) <= 3;
  const revenuMarketing = Math.round(marketingMoyen * vie.reputations.locale * (professionnel ? 72 : 7));
  vie.revenuMarketingDerniereSaison = revenuMarketing;
  vie.reputations.nationale = borne(vie.reputations.nationale + (Math.max(1, 8 - rang) * .5));
  vie.supporters = ajouterMotif(vie.supporters, rang <= m.objectif ? 'L’objectif sportif a été tenu.' : 'La saison termine sous les attentes.', rang <= m.objectif ? 5 : -7, { ...m, semaine: 43 });
  let chronologie = [...etat.chronologie];
  if (rang === 1) chronologie.push({ id: `chrono-titre-${m.club}-${m.saison}`, saison: m.saison, semaine: 43, mois: 'Juin', categorie: 'titre', importance: 3, titre: `${m.club} champion`, texte: `Le club remporte ${m.divisionNom} et inscrit la saison dans son histoire.` });
  let president = vie.president;
  const rngPresident = graine(`changement-president#${m.club}#${m.saison}`);
  if (m.saison - president.depuis >= 5 && rngPresident() < .17) {
    const ancien = president;
    president = presidentInitial(m.club, m.saison + 1);
    chronologie.push({ id: `chrono-president-${m.club}-${m.saison}`, saison: m.saison, semaine: 43, mois: 'Juillet', categorie: 'direction', importance: 3, titre: `Changement de président à ${m.club}`, texte: `${ancien.nom} laisse la place à ${president.nom}, profil ${president.type}. La politique du club change.` });
  }
  vie.president = president;
  clubs[m.club] = vie;
  const finsCarriere = [...etat.finsCarriere];
  for (const j of effectif) {
    const fin = finCarriere(j, integrations[j.id], vie.popularites[j.id], m);
    if (!fin || finsCarriere.some((f) => f.joueurId === j.id)) continue;
    finsCarriere.push(fin);
    chronologie.push({ id: `chrono-retraite-${j.id}-${m.saison}`, saison: m.saison, semaine: 43, mois: 'Juillet', categorie: 'retraite', importance: fin.hommage ? 3 : 2, titre: fin.hommage ? `🎖️ Hommage à ${j.nom}` : `Avenir de ${j.nom}`, texte: fin.hommage ? `${fin.texte} Tifo, standing ovation et hommage sont prévus pour son dernier match à domicile.` : fin.texte });
  }
  return { ...etat, clubs, integrations, chronologie: chronologie.slice(-600), finsCarriere: finsCarriere.slice(-150) };
}

export function revenusMarketingProfonde(etat: EtatCarriereProfonde | undefined, club: string): number {
  return etat?.clubs[club]?.revenuMarketingDerniereSaison ?? 0;
}

export function facteurAmbitionRecrutement(etat: EtatCarriereProfonde | undefined, cible: { id: string; age: number; club: string }, clubVise: string): number {
  const integration = etat?.integrations[cible.id];
  const ambition = integration?.ambition ?? ambitionPour(cible.id);
  const niveau = competitionDuClub(cible.club)?.niveau ?? 8;
  const niveauVise = competitionDuClub(clubVise)?.niveau ?? niveau;
  if ((ambition === 'gagnerElite' || ambition === 'jouerPremiereDivision') && niveauVise > 1) return 1.18;
  if (ambition === 'gagnerArgent') return 1.1;
  if (ambition === 'resterRegion' && cible.club !== clubVise) return 1.08;
  if (ambition === 'jouerEtranger' && niveauVise < niveau) return .94;
  return 1;
}

export function compatibiliteManagerClub(etat: EtatCarriereProfonde | undefined, identite: Identite | undefined): number {
  if (!etat || !identite) return 50;
  const p = etat.profilManager;
  return borne(100 - (
    Math.abs(p.jeuAuLarge - identite.offensif) * .28
    + Math.abs(p.defenseAgressive - identite.defensif) * .24
    + Math.abs(p.conquete - (identite.stabilite * .55 + identite.discipline * .45)) * .18
    + Math.abs(p.rythme - identite.ambition) * .16
  ));
}

export function apresDepartJoueurProfonde(etat: EtatCarriereProfonde, m: Manager, joueurId: string): { etat: EtatCarriereProfonde; moralTouches: Record<string, number> } {
  const clubs = { ...etat.clubs };
  const vie = clubs[m.club] ? { ...clubs[m.club], supporters: { ...clubs[m.club].supporters } } : vieClubInitiale(m.club, m.saison);
  const popularite = vie.popularites[joueurId]?.locale ?? 35;
  if (popularite >= 70) vie.supporters = ajouterMotif(vie.supporters, `Vente de ${vie.popularites[joueurId]?.nom ?? 'une figure locale'}.`, popularite >= 88 ? -12 : -6, m);
  clubs[m.club] = vie;
  const moralTouches: Record<string, number> = {};
  for (const relation of etat.relations.filter((r) => r.joueurA === joueurId || r.joueurB === joueurId)) {
    const autre = relation.joueurA === joueurId ? relation.joueurB : relation.joueurA;
    if (relation.type === 'amitie' || relation.type === 'famille' || relation.type === 'mentor') moralTouches[autre] = -Math.max(3, Math.round(relation.intensite / 16));
    if (relation.type === 'conflit' || relation.type === 'rivalite') moralTouches[autre] = 2;
  }
  return { etat: { ...etat, clubs }, moralTouches };
}

export function enregistrerTransfertProfonde(
  etat: EtatCarriereProfonde, m: Manager,
  joueur: { id: string; nom: string }, montant: number, sens: 'recrue' | 'vente', autreClub: string,
): EtatCarriereProfonde {
  const clubs = { ...etat.clubs };
  const vie = clubs[m.club] ? { ...clubs[m.club], records: { ...clubs[m.club].records, club: { ...clubs[m.club].records.club } }, supporters: { ...clubs[m.club].supporters } } : vieClubInitiale(m.club, m.saison);
  const record: RecordHistorique = {
    id: sens === 'recrue' ? 'plus-grosse-recrue' : 'plus-grosse-vente',
    libelle: sens === 'recrue' ? 'Plus gros recrutement' : 'Plus gros transfert sortant',
    valeur: montant, unite: '€', saison: m.saison, joueurId: joueur.id, joueurNom: joueur.nom, adversaire: autreClub,
  };
  const maj = meilleurRecord(vie.records.club, record);
  vie.records = { ...vie.records, club: maj.registre };
  if (sens === 'recrue' && montant > 0) vie.supporters = ajouterMotif(vie.supporters, `Arrivée ambitieuse de ${joueur.nom}.`, montant >= 1_000_000 ? 4 : 1, m);
  clubs[m.club] = vie;
  const chronologie = [...etat.chronologie, {
    id: `chrono-transfert-${sens}-${joueur.id}-${m.saison}-${m.semaine}`, saison: m.saison, semaine: m.semaine,
    mois: moisDeSemaine(m.semaine), categorie: 'transfert' as const, importance: montant >= 1_000_000 ? 3 as const : 2 as const,
    titre: `${sens === 'recrue' ? 'Arrivée' : 'Départ'} de ${joueur.nom}`,
    texte: `${sens === 'recrue' ? autreClub : m.club} → ${sens === 'recrue' ? m.club : autreClub} · ${Math.round(montant).toLocaleString('fr-FR')} €${maj.battu ? ' · nouveau record du club' : ''}.`,
  }];
  return { ...etat, clubs, chronologie: chronologie.slice(-600) };
}

export function saisonsChronologie(etat: EtatCarriereProfonde | undefined): number[] {
  return [...new Set((etat?.chronologie ?? []).map((e) => e.saison))].sort((a, b) => b - a);
}
