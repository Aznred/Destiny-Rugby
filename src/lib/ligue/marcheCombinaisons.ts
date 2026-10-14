/**
 * LE MARCHÉ DES COMBINAISONS (Correctif 41, points 16 à 32) — règles pures, partagées par le navigateur et le serveur.
 *
 * Un entraîneur publie une combinaison de son cahier ; les autres la regardent, l'ajoutent à leurs tactiques, la notent.
 * Ce qu'elle VAUT ne vient ni des téléchargements ni des étoiles : ce sont les matchs réels qui le disent (mètres gagnés,
 * franchissements, essais, ballons perdus, pénalités), remontés par le moteur à la fin de chaque rencontre.
 *
 * ⚠️ LE SERVEUR FAIT AUTORITÉ : tout ce qui arrive du navigateur repasse par `combinaisonsValides` et par les contrôles
 * d'ici (nom, copie, quotas). Le navigateur n'envoie jamais une statistique — elles sortent du moteur du serveur.
 * ⚠️ UNE NOUVELLE VERSION N'ÉCRASE RIEN : la copie rangée dans un cahier reste celle qu'on a prise. Le marché dit
 * seulement « nouvelle version disponible », et c'est l'entraîneur qui décide.
 */
import type { BilanCombinaisonMatch } from '../moteur/lectureCombinaison.js';
import type { StyleJeu } from '../moteur/etat.js';
import { graine, tirerPondere } from './aleatoire.js';
import {
  combinaisonsValides, EMPLACEMENTS, emplacementsOccupes, etapesCombinaison, MAX_COMBINAISONS, SITUATIONS_CAHIER, situationDuPlan,
  type Combinaison, type SituationCahier,
} from './combinaisons.js';

export type TypeCombinaison = 'avants' | 'large' | 'leurres' | 'pied' | 'simple';
export const TYPES_COMBINAISON: readonly TypeCombinaison[] = ['avants', 'large', 'leurres', 'pied', 'simple'];
export type DifficulteCombinaison = 1 | 2 | 3;
export type EtatPublication = 'publiee' | 'attente' | 'retiree';
export type MotifSignalement = 'nom' | 'spam' | 'copie' | 'autre';
export const MOTIFS_SIGNALEMENT: readonly MotifSignalement[] = ['nom', 'spam', 'copie', 'autre'];

/** Ce qu'une combinaison a donné en match : un compteur par issue, plus les sommes. */
export interface StatsCombinaison {
  utilisations: number; matchs: number;
  metres: number; battus: number;
  essais: number; franchissements: number; conserves: number; pieds: number;
  pertes: number; penalitesPour: number; penalitesContre: number;
}
export const STATS_VIDES: StatsCombinaison = { utilisations: 0, matchs: 0, metres: 0, battus: 0, essais: 0, franchissements: 0, conserves: 0, pieds: 0, pertes: 0, penalitesPour: 0, penalitesContre: 0 };

export interface VersionPubliee {
  numero: number;
  plan: Combinaison;
  /** L'empreinte du contenu : deux plans au même dessin ont la même, quels que soient leur nom et leur zone. */
  empreinte: string;
  publieLe: number;
  /** Ce qui change dans cette version, en une ligne. */
  note: string;
  stats: StatsCombinaison;
}
export interface FichePubliee {
  id: string;
  auteur: string; pseudo: string;
  nom: string; description: string;
  type: TypeCombinaison; difficulte: DifficulteCombinaison; situation: SituationCahier;
  etat: EtatPublication;
  creeLe: number; majLe: number;
  /** Les comptes qui l'ont ajoutée à leurs tactiques (une fois chacun). */
  telecharges: string[];
  notes: Record<string, number>;
  signalements: Record<string, MotifSignalement>;
  /** De la plus ancienne à la plus récente ; la dernière est la version courante. */
  versions: VersionPubliee[];
  stats: StatsCombinaison;
  /** Les rencontres déjà comptées : une remontée rejouée ne compte pas deux fois. */
  matchsVus: string[];
}
/** Ce que la liste du marché montre : rien de lourd, aucun identifiant de compte. */
export interface ResumePublie {
  id: string; pseudo: string; nom: string; description: string;
  type: TypeCombinaison; difficulte: DifficulteCombinaison; situation: SituationCahier;
  phase: Combinaison['phase']; etat: EtatPublication;
  version: number; creeLe: number; majLe: number;
  telechargements: number; note: number | null; votes: number;
  stats: StatsCombinaison;
  /** Part des utilisations qui ont créé quelque chose (essai, franchissement, pénalité obtenue). `null` : pas assez de matchs. */
  reussite: number | null;
  /** Le score communautaire, de 0 à 100. `null` tant que l'échantillon est trop petit. */
  score: number | null;
  mienne?: boolean; maNote?: number; signalee?: boolean; ajoutee?: boolean;
}
export interface DetailPublie extends ResumePublie {
  plan: Combinaison;
  versions: { numero: number; publieLe: number; note: string; stats: StatsCombinaison }[];
  signalements?: number;
}

export const VERSIONS_GARDEES = 5;
export const PUBLICATIONS_PAR_COMPTE = 12;
export const PUBLICATIONS_PAR_JOUR = 3;
/** En dessous, une combinaison n'a ni score ni taux de réussite : trois matchs heureux ne font pas une vérité. */
export const ECHANTILLON_MINIMUM = 25;
export const MATCHS_MINIMUM = 3;
/** Autant de comptes différents qui signalent : la fiche quitte la liste en attendant qu'un modérateur la regarde. */
export const SIGNALEMENTS_AVANT_RETRAIT = 3;
const TEXTE_NOM = 40, TEXTE_DESCRIPTION = 240, TEXTE_NOTE = 120;

// ---------------------------------------------------------------------------
// LE TEXTE : ce qu'un nom ou une description ne peut pas être
// ---------------------------------------------------------------------------

// Courte liste, comparée MOT À MOT après normalisation (accents, chiffres-lettres) : « contre » ne contient pas d'injure.
const MOTS_REFUSES = new Set([
  'connard', 'connards', 'connasse', 'conasse', 'con', 'cons', 'conne', 'salope', 'salopes', 'salaud', 'salauds', 'pute', 'putes', 'putain',
  'encule', 'encules', 'enculer', 'enfoire', 'enfoires', 'batard', 'batards', 'pd', 'pede', 'pedes', 'tapette', 'tarlouze', 'gouine',
  'nique', 'niquer', 'ntm', 'fdp', 'tg', 'bite', 'bites', 'couille', 'couilles', 'chatte', 'merde', 'merdes', 'bougnoule', 'negre', 'negres',
  'youpin', 'bicot', 'nazi', 'nazis', 'hitler', 'viol', 'violeur', 'fuck', 'fucker', 'fucking', 'shit', 'bitch', 'bitches', 'asshole',
  'cunt', 'dick', 'nigger', 'nigga', 'faggot', 'fag', 'whore', 'slut', 'rape', 'rapist', 'retard', 'puta', 'puto', 'mierda', 'cabron',
  'maricon', 'pendejo', 'cazzo', 'stronzo', 'troia', 'vaffanculo', 'scheisse', 'arschloch', 'fotze', 'hurensohn', 'caralho', 'porra',
]);
const normaliser = (texte: string) => texte.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/[@]/g, 'a').replace(/[$]/g, 's');

/** Pourquoi un texte est refusé, ou `null`. */
export function texteRefuse(texte: string): 'offensant' | 'lien' | 'spam' | null {
  const brut = texte.trim();
  if (/(https?:\/\/|www\.|\.(com|fr|net|gg|io|xyz|ru)\b|discord\.|t\.me\/)/i.test(brut)) return 'lien';
  if (/(.)\1{5,}/u.test(brut)) return 'spam';
  const mots = normaliser(brut).split(/[^a-z]+/).filter(Boolean);
  // Lettres espacées (« c o n ») : on relit aussi le texte recollé quand il n'est fait que de lettres isolées.
  const recolle = mots.length > 2 && mots.every((m) => m.length === 1) ? [mots.join('')] : [];
  return [...mots, ...recolle].some((m) => MOTS_REFUSES.has(m)) ? 'offensant' : null;
}
const propre = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');

// ---------------------------------------------------------------------------
// LE DESSIN : son empreinte, son type, sa difficulté
// ---------------------------------------------------------------------------

function fnv(texte: string, depart: number): string {
  let h = depart >>> 0;
  for (let i = 0; i < texte.length; i++) h = Math.imul(h ^ texte.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, '0');
}
const metre = (n: number) => Math.round(n);

/**
 * L'empreinte d'un plan : son DESSIN, au mètre près — gestes, placements, options, réglages de touche. Ni le nom, ni la
 * zone, ni le côté n'y entrent : renommer une combinaison ne la rend pas nouvelle.
 */
export function empreintePlan(plan: Combinaison): string {
  const dessin = JSON.stringify([plan.phase, plan.variantes.map((v) => [
    v.depart, plan.phase === 'touche' ? [v.sauteur, v.touche ?? null] : null,
    [...v.placements].sort((a, b) => a.numero - b.numero).map((p) => [p.numero, metre(p.x), metre(p.y)]),
    v.actions.map((a) => [a.type, a.simultanee ? 1 : 0,
      a.type === 'passe' ? a.destinataire : a.type === 'pied' ? a.intention : a.type === 'leurre' ? [a.numero, metre(a.destination.x), metre(a.destination.y)] : [metre(a.destination.x), metre(a.destination.y)]]),
    (v.options ?? []).map((o) => [o.etape, o.condition, o.reponse]),
  ])]);
  return fnv(dessin, 2166136261) + fnv(dessin, 0x9747b28c);
}

/** Le genre de jeu d'un plan, lu sur ses gestes : c'est ce que l'écran propose, et ce que l'IA communautaire regarde. */
export function typeDuPlan(plan: Combinaison): TypeCombinaison {
  const v = plan.variantes[0];
  if (!v) return 'simple';
  const passes = v.actions.filter((a) => a.type === 'passe');
  const versAvants = passes.filter((a) => a.type === 'passe' && a.destinataire <= 8).length;
  const leurres = v.actions.filter((a) => a.type === 'leurre' && a.numero > 8).length;
  if (v.actions.some((a) => a.type === 'pied')) return 'pied';
  // Une cellule (le premier ballon va à un avant), un maul, un départ du 8, un ballon gardé devant : c'est du jeu d'avants,
  // même si la ligne joue ensuite dans leur dos.
  const premier = passes[0];
  if (v.touche?.maul || v.depart === 8 || (premier?.type === 'passe' && premier.destinataire <= 8) || (versAvants > 0 && versAvants >= passes.length - versAvants)) return 'avants';
  if (leurres >= 2) return 'leurres';
  if (passes.length >= 3 || passes.some((a) => a.type === 'passe' && [11, 14, 15].includes(a.destinataire))) return 'large';
  return 'simple';
}
export function difficulteDuPlan(plan: Combinaison): DifficulteCombinaison {
  const v = plan.variantes[0];
  if (!v) return 1;
  const poids = etapesCombinaison(v.actions).length + v.actions.filter((a) => a.type === 'leurre').length
    + 2 * (v.options?.length ?? 0) + 2 * (plan.variantes.length - 1) + (v.touche?.doubleFeinte || v.touche?.glissement ? 1 : 0);
  return poids <= 4 ? 1 : poids <= 8 ? 2 : 3;
}

/** Le plan tel qu'il est publié : validé, sans identité de cahier, actif, au nom de la publication. */
export function planPourPublication(brut: unknown, nom: string): Combinaison | null {
  const plan = combinaisonsValides([brut])[0];
  if (!plan) return null;
  const publie: Combinaison = { ...plan, id: 'publication', nom, active: true };
  delete publie.origine;
  return publie;
}

// ---------------------------------------------------------------------------
// PUBLIER
// ---------------------------------------------------------------------------

export type RefusPublication = 'plan' | 'nom' | 'offensant' | 'lien' | 'spam' | 'copie' | 'dejaPubliee' | 'quota' | 'quotaJour' | 'inchange' | 'introuvable' | 'interdit';
export interface SaisiePublication { plan: Combinaison; nom: string; description: string; type: TypeCombinaison; difficulte: DifficulteCombinaison; note: string; empreinte: string }

/** Lit et borne ce que le navigateur propose. Rend la raison du refus, sinon la saisie propre. */
export function lirePublication(brut: unknown): { saisie: SaisiePublication } | { refus: RefusPublication } {
  const b = (brut && typeof brut === 'object' ? brut : {}) as Record<string, unknown>;
  const nom = propre(b.nom, TEXTE_NOM), description = propre(b.description, TEXTE_DESCRIPTION), note = propre(b.note, TEXTE_NOTE);
  if (nom.length < 3) return { refus: 'nom' };
  for (const texte of [nom, description, note]) { const r = texteRefuse(texte); if (r) return { refus: r }; }
  const plan = planPourPublication(b.plan, nom);
  if (!plan) return { refus: 'plan' };
  const type = TYPES_COMBINAISON.includes(b.type as TypeCombinaison) ? b.type as TypeCombinaison : typeDuPlan(plan);
  const difficulte = b.difficulte === 1 || b.difficulte === 2 || b.difficulte === 3 ? b.difficulte : difficulteDuPlan(plan);
  return { saisie: { plan, nom, description, type, difficulte, note, empreinte: empreintePlan(plan) } };
}

const JOUR = 86_400_000;
/**
 * Une nouvelle publication est-elle acceptable ? Copie identique d'un autre auteur, doublon d'une des siennes, trop de
 * publications (en tout, ou aujourd'hui) : refus. Sinon elle est publiée tout de suite — c'est la validation automatique.
 */
export function refusNouvellePublication(fiches: readonly FichePubliee[], compte: string, saisie: SaisiePublication, maintenant: number): RefusPublication | null {
  const vivantes = fiches.filter((f) => f.etat !== 'retiree');
  for (const f of vivantes) {
    if (!f.versions.some((v) => v.empreinte === saisie.empreinte)) continue;
    return f.auteur === compte ? 'dejaPubliee' : 'copie';
  }
  const miennes = vivantes.filter((f) => f.auteur === compte);
  if (miennes.length >= PUBLICATIONS_PAR_COMPTE) return 'quota';
  // Les retirées comptent aussi dans la journée : publier puis retirer en boucle reste du spam.
  if (fiches.filter((f) => f.auteur === compte && maintenant - f.creeLe < JOUR).length >= PUBLICATIONS_PAR_JOUR) return 'quotaJour';
  return null;
}
export function creerFiche(id: string, compte: string, pseudo: string, saisie: SaisiePublication, maintenant: number): FichePubliee {
  return {
    id, auteur: compte, pseudo: propre(pseudo, 24) || 'Entraîneur', nom: saisie.nom, description: saisie.description,
    type: saisie.type, difficulte: saisie.difficulte, situation: situationDuPlan(saisie.plan), etat: 'publiee',
    creeLe: maintenant, majLe: maintenant, telecharges: [], notes: {}, signalements: {},
    versions: [{ numero: 1, plan: saisie.plan, empreinte: saisie.empreinte, publieLe: maintenant, note: saisie.note, stats: { ...STATS_VIDES } }],
    stats: { ...STATS_VIDES }, matchsVus: [],
  };
}
/** Une version de plus, par son auteur. Les précédentes restent (les cinq dernières), avec leurs statistiques. */
export function nouvelleVersion(fiche: FichePubliee, compte: string, autres: readonly FichePubliee[], saisie: SaisiePublication, maintenant: number): { fiche: FichePubliee } | { refus: RefusPublication } {
  if (fiche.auteur !== compte || fiche.etat === 'retiree') return { refus: 'interdit' };
  if (fiche.versions.at(-1)?.empreinte === saisie.empreinte) return { refus: 'inchange' };
  if (autres.some((f) => f.id !== fiche.id && f.etat !== 'retiree' && f.auteur !== compte && f.versions.some((v) => v.empreinte === saisie.empreinte))) return { refus: 'copie' };
  const numero = (fiche.versions.at(-1)?.numero ?? 0) + 1;
  const versions = [...fiche.versions, { numero, plan: saisie.plan, empreinte: saisie.empreinte, publieLe: maintenant, note: saisie.note, stats: { ...STATS_VIDES } }].slice(-VERSIONS_GARDEES);
  return { fiche: { ...fiche, nom: saisie.nom, description: saisie.description, type: saisie.type, difficulte: saisie.difficulte,
    situation: situationDuPlan(saisie.plan), majLe: maintenant, versions } };
}

// ---------------------------------------------------------------------------
// NOTER, SIGNALER, MODÉRER
// ---------------------------------------------------------------------------

/** Une note de 1 à 5 par compte ; on ne note pas sa propre combinaison. */
export function noterFiche(fiche: FichePubliee, compte: string, note: number): FichePubliee | null {
  if (fiche.auteur === compte || fiche.etat !== 'publiee' || !Number.isInteger(note) || note < 1 || note > 5) return null;
  return { ...fiche, notes: { ...fiche.notes, [compte]: note } };
}
/** Un signalement par compte. Au troisième compte différent, la fiche passe en attente de modération. */
export function signalerFiche(fiche: FichePubliee, compte: string, motif: MotifSignalement): FichePubliee | null {
  if (fiche.auteur === compte || fiche.etat === 'retiree' || !MOTIFS_SIGNALEMENT.includes(motif)) return null;
  const signalements = { ...fiche.signalements, [compte]: motif };
  return { ...fiche, signalements, etat: fiche.etat === 'publiee' && Object.keys(signalements).length >= SIGNALEMENTS_AVANT_RETRAIT ? 'attente' : fiche.etat };
}
/** Retirer : son auteur ou un modérateur. Rétablir (les signalements sont effacés) : un modérateur seulement. */
export function modererFiche(fiche: FichePubliee, decision: 'retirer' | 'retablir', compte: string, moderateur: boolean): FichePubliee | null {
  if (decision === 'retirer') return moderateur || fiche.auteur === compte ? { ...fiche, etat: 'retiree' } : null;
  return moderateur ? { ...fiche, etat: 'publiee', signalements: {} } : null;
}
export function noterTelechargement(fiche: FichePubliee, compte: string): FichePubliee {
  return fiche.telecharges.includes(compte) || fiche.auteur === compte ? fiche : { ...fiche, telecharges: [...fiche.telecharges, compte].slice(-5000) };
}

// ---------------------------------------------------------------------------
// LES STATISTIQUES ISSUES DES MATCHS
// ---------------------------------------------------------------------------

export function ajouterStats(a: StatsCombinaison, b: StatsCombinaison): StatsCombinaison {
  const somme = { ...a };
  for (const cle of Object.keys(STATS_VIDES) as (keyof StatsCombinaison)[]) somme[cle] = Math.round(((a[cle] ?? 0) + (b[cle] ?? 0)) * 10) / 10;
  return somme;
}
/** Un bilan du moteur → les compteurs. Les mètres d'une utilisation sont bornés : une échappée de 80 m ne fait pas une moyenne. */
export function statsDUnBilan(b: Pick<BilanCombinaisonMatch, 'issue' | 'metres' | 'battus'>): StatsCombinaison {
  return { ...STATS_VIDES, utilisations: 1, metres: Math.max(-15, Math.min(40, b.metres)), battus: Math.max(0, Math.min(6, b.battus)),
    essais: Number(b.issue === 'essai'), franchissements: Number(b.issue === 'franchissement'), conserves: Number(b.issue === 'conserve'),
    pieds: Number(b.issue === 'pied'), pertes: Number(b.issue === 'perdu'), penalitesPour: Number(b.issue === 'penalitePour'),
    penalitesContre: Number(b.issue === 'penaliteContre') };
}
/** Ce qu'un match remonte au marché : par publication et par version. */
export interface RemonteeCombinaisons { match: string; lignes: { publication: string; version: number; stats: StatsCombinaison }[] }
export function remonteeDuMatch(match: string, bilans: readonly BilanCombinaisonMatch[]): RemonteeCombinaisons | null {
  const parPlan = new Map<string, { publication: string; version: number; stats: StatsCombinaison }>();
  for (const b of bilans) {
    if (!b.publication || !b.version) continue;
    const cle = `${b.publication}#${b.version}`;
    const ligne = parPlan.get(cle) ?? { publication: b.publication, version: b.version, stats: { ...STATS_VIDES, matchs: 1 } };
    ligne.stats = ajouterStats(ligne.stats, statsDUnBilan(b));
    parPlan.set(cle, ligne);
  }
  return parPlan.size ? { match, lignes: [...parPlan.values()] } : null;
}
/** Crédite une fiche des statistiques d'un match. Rend `null` si ce match est déjà compté, ou si rien ne la concerne. */
export function appliquerRemontee(fiche: FichePubliee, remontee: RemonteeCombinaisons): FichePubliee | null {
  if (fiche.matchsVus.includes(remontee.match)) return null;
  const lignes = remontee.lignes.filter((l) => l.publication === fiche.id);
  if (!lignes.length) return null;
  let stats = fiche.stats;
  const versions = fiche.versions.map((v) => {
    const ligne = lignes.find((l) => l.version === v.numero);
    return ligne ? { ...v, stats: ajouterStats(v.stats, ligne.stats) } : v;
  });
  for (const l of lignes) stats = ajouterStats(stats, l.stats);
  // Deux versions jouées dans le même match ne font qu'un match.
  stats = { ...stats, matchs: fiche.stats.matchs + 1 };
  return { ...fiche, stats, versions, matchsVus: [...fiche.matchsVus, remontee.match].slice(-400) };
}

export function echantillonSuffisant(s: StatsCombinaison): boolean { return s.utilisations >= ECHANTILLON_MINIMUM && s.matchs >= MATCHS_MINIMUM; }
/** Les indicateurs lus à l'écran : par utilisation, de 0 à 1 pour les taux. */
export function indicateurs(s: StatsCombinaison) {
  const n = Math.max(1, s.utilisations);
  return {
    metres: s.metres / n, battus: s.battus / n, essais: s.essais / n, franchissements: s.franchissements / n,
    reussite: (s.essais + s.franchissements + s.penalitesPour) / n,
    conservation: (s.essais + s.franchissements + s.conserves + s.penalitesPour) / n,
    pertes: s.pertes / n, penalites: s.penalitesContre / n,
  };
}
/**
 * LE SCORE COMMUNAUTAIRE (points 23 à 25), de 0 à 100. Il ne lit QUE ce que la combinaison a donné en match — jamais les
 * téléchargements ni les étoiles. Une combinaison peu jouée est tirée vers 50 (vingt utilisations « neutres » de plus) :
 * il faut du volume pour s'éloigner de la moyenne, dans un sens comme dans l'autre. `null` sous l'échantillon minimum.
 */
export function scoreCommunautaire(s: StatsCombinaison): number | null {
  if (!echantillonSuffisant(s)) return null;
  const i = indicateurs(s);
  const brut = 50 + 2.2 * Math.max(-5, Math.min(15, i.metres)) + 60 * i.franchissements + 120 * i.essais + 20 * (s.penalitesPour / s.utilisations)
    - 70 * i.pertes - 50 * i.penalites;
  const lisse = (s.utilisations * brut + 20 * 50) / (s.utilisations + 20);
  return Math.round(Math.max(0, Math.min(100, lisse)) * 10) / 10;
}

export function resumeDeFiche(f: FichePubliee, compte?: string): ResumePublie {
  const notes = Object.values(f.notes);
  const courante = f.versions.at(-1)!;
  return {
    id: f.id, pseudo: f.pseudo, nom: f.nom, description: f.description, type: f.type, difficulte: f.difficulte, situation: f.situation,
    phase: courante.plan.phase, etat: f.etat, version: courante.numero, creeLe: f.creeLe, majLe: f.majLe,
    telechargements: f.telecharges.length, note: notes.length ? Math.round(notes.reduce((a, b) => a + b, 0) / notes.length * 10) / 10 : null, votes: notes.length,
    stats: f.stats, reussite: echantillonSuffisant(f.stats) ? Math.round(indicateurs(f.stats).reussite * 1000) / 1000 : null,
    score: scoreCommunautaire(f.stats),
    ...(compte ? { mienne: f.auteur === compte, ...(f.notes[compte] ? { maNote: f.notes[compte] } : {}), ...(f.signalements[compte] ? { signalee: true } : {}), ajoutee: f.telecharges.includes(compte) } : {}),
  };
}
export function detailDeFiche(f: FichePubliee, compte?: string, moderateur = false): DetailPublie {
  return { ...resumeDeFiche(f, compte), plan: f.versions.at(-1)!.plan,
    versions: f.versions.map((v) => ({ numero: v.numero, publieLe: v.publieLe, note: v.note, stats: v.stats })).reverse(),
    ...(moderateur ? { signalements: Object.keys(f.signalements).length } : {}) };
}

// ---------------------------------------------------------------------------
// DU MARCHÉ AU CAHIER
// ---------------------------------------------------------------------------

/**
 * Ajoute une combinaison du marché au cahier. `remplacer` : l'identifiant du plan dont elle prend l'emplacement (il est
 * rangé, pas supprimé). Sans emplacement libre et sans remplacement, elle arrive rangée. `null` : cahier plein.
 */
export function ajouterAuCahier(plans: readonly Combinaison[], publie: Pick<DetailPublie, 'id' | 'version' | 'plan' | 'nom'>, id: string, remplacer?: string): Combinaison[] | null {
  if (plans.length >= MAX_COMBINAISONS) return null;
  const situation = situationDuPlan(publie.plan);
  const suite = plans.map((p) => (p.id === remplacer && situationDuPlan(p) === situation ? { ...p, active: false } : p));
  const libre = emplacementsOccupes(suite).occupes[situation] < EMPLACEMENTS[situation];
  return [...suite, { ...structuredClone(publie.plan), id, nom: publie.nom, active: libre, origine: { publication: publie.id, version: publie.version } }];
}
/** La copie du cahier passe à la version courante : elle garde sa place, son état, sa zone et son côté. */
export function mettreAJour(plan: Combinaison, publie: Pick<DetailPublie, 'id' | 'version' | 'plan'>): Combinaison {
  return { ...structuredClone(publie.plan), id: plan.id, nom: plan.nom, active: plan.active, zone: plan.zone, couloir: plan.couloir,
    origine: { publication: publie.id, version: publie.version } };
}
/** Les plans du cahier dont le marché a une version plus récente : identifiant du plan → version disponible. */
export function versionsDisponibles(plans: readonly Combinaison[], resumes: readonly Pick<ResumePublie, 'id' | 'version' | 'etat'>[]): Record<string, number> {
  const courantes = new Map(resumes.filter((r) => r.etat === 'publiee').map((r) => [r.id, r.version]));
  const dispo: Record<string, number> = {};
  for (const p of plans) { const v = p.origine ? courantes.get(p.origine.publication) : undefined; if (p.origine && v && v > p.origine.version) dispo[p.id] = v; }
  return dispo;
}

// ---------------------------------------------------------------------------
// L'IA COMMUNAUTAIRE : ce que les clubs sans entraîneur prennent au marché
// ---------------------------------------------------------------------------

export interface MetaCombinaison { id: string; version: number; plan: Combinaison; type: TypeCombinaison; difficulte: DifficulteCombinaison; situation: SituationCahier; score: number; utilisations: number }
/** Les combinaisons qui ont fait leurs preuves : publiées, échantillon suffisant, les mieux notées PAR LEURS RÉSULTATS d'abord. */
export function metaDepuisFiches(fiches: readonly FichePubliee[], maximum = 40): MetaCombinaison[] {
  return fiches.flatMap<MetaCombinaison>((f) => {
    const score = f.etat === 'publiee' ? scoreCommunautaire(f.stats) : null;
    const courante = f.versions.at(-1);
    return score === null || !courante ? [] : [{ id: f.id, version: courante.numero, plan: courante.plan, type: f.type, difficulte: f.difficulte, situation: f.situation, score, utilisations: f.stats.utilisations }];
  }).sort((a, b) => b.score - a.score || b.utilisations - a.utilisations).slice(0, maximum);
}

/** Ce qu'un style de jeu aime : une équipe d'avants ne se met pas à jouer des redoublées parce qu'elles sont à la mode. */
const AFFINITE: Record<StyleJeu, Record<TypeCombinaison, number>> = {
  avants: { avants: 2.4, simple: 1.1, pied: 0.9, leurres: 0.5, large: 0.4 },
  large: { large: 2.4, leurres: 1.5, simple: 0.9, pied: 0.7, avants: 0.4 },
  leurres: { leurres: 2.4, large: 1.5, simple: 0.9, pied: 0.6, avants: 0.5 },
  pied: { pied: 2.4, simple: 1.2, avants: 0.9, large: 0.8, leurres: 0.6 },
  equilibre: { avants: 1, large: 1, leurres: 1, pied: 1, simple: 1 },
};
/** Ce qu'un niveau peut jouer : une petite équipe garde des lancements simples, une grosse équipe ose les plus riches. */
function aisance(niveau: number, difficulte: DifficulteCombinaison): number {
  if (niveau < 62) return difficulte === 1 ? 1.6 : difficulte === 2 ? 0.7 : 0.2;
  if (niveau >= 78) return difficulte === 1 ? 0.7 : difficulte === 2 ? 1.1 : 1.6;
  return difficulte === 1 ? 1 : difficulte === 2 ? 1.1 : 0.6;
}
/** Combien d'emplacements un club sans entraîneur remplit : la moitié — le reste de son jeu reste celui de l'IA par poste. */
const EMPLACEMENTS_IA: Record<SituationCahier, number> = { ruck: 2, melee: 2, touche: 2, ligne10: 1 };

/**
 * LE CAHIER D'UN CLUB SANS ENTRAÎNEUR. Tiré une fois, au coup d'envoi, parmi les combinaisons qui ont fait leurs preuves :
 * poids = (score / 50)² × ce que son style aime × ce que son niveau sait jouer. La graine (le club, la saison) garde au
 * club son identité d'un match à l'autre ; ce sont les SCORES qui bougent, donc la méta. Le choix selon la situation
 * (zone, côté) et ce qui a marché dans le match reste le travail du moteur.
 */
export function cahierCommunautaire(meta: readonly MetaCombinaison[], identite: { style: StyleJeu; niveau: number }, germe: string): Combinaison[] {
  const rng = graine(`meta#${germe}`);
  const cahier: Combinaison[] = [];
  for (const situation of SITUATIONS_CAHIER) {
    const candidats = meta.filter((m) => m.situation === situation && m.score >= 45);
    const poids = candidats.map((m) => (m.score / 50) ** 2 * AFFINITE[identite.style][m.type] * aisance(identite.niveau, m.difficulte));
    for (let n = 0; n < EMPLACEMENTS_IA[situation] && candidats.length; n++) {
      if (!poids.some((p) => p > 0)) break;
      const i = tirerPondere(poids, rng);
      const m = candidats[i];
      cahier.push({ ...structuredClone(m.plan), id: `meta:${m.id}`, active: true, origine: { publication: m.id, version: m.version } });
      candidats.splice(i, 1); poids.splice(i, 1);
    }
  }
  return cahier;
}
