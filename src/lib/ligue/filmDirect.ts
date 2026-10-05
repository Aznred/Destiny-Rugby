// LE FILM DU DIRECT — ce que le serveur raconte d'un match, et comment l'écran le rejoue.
//
// ═══ POURQUOI UN FILM ET PLUS UNE PHOTO ═════════════════════════════════════
//
// Le direct recevait une photo du terrain toutes les deux secondes et inventait
// le reste : trente trajectoires tirées entre deux positions, un plaquage placé
// « quelque part » entre les deux, un porteur deviné. C'est de là que venaient
// les retours en arrière (l'écran prolongeait une course, puis la photo suivante
// le contredisait), les plaquages à distance et les phases qui démarraient avant
// que les joueurs n'y soient.
//
// Le serveur envoie maintenant LES PAS DU MOTEUR eux-mêmes — un toutes les
// 0,15 s — depuis le dernier que l'écran connaît. L'écran ne devine plus rien :
// il rejoue, avec un peu de retard, exactement ce qui s'est joué. Animations,
// orientation, interpolation entre deux pas, caméra, son : tout cela reste
// calculé côté client, à partir d'un état qui a la forme de celui du moteur.
//
// ═══ CE QUE ÇA COÛTE ════════════════════════════════════════════════════════
//
// Rien en base : un pas n'est jamais écrit, il sort de la rejoue en mémoire
// (`matchCarriere.ts`). Et moins en transfert qu'avant, parce qu'un pas ne
// porte que ce qui CHANGE : les déplacements en centimètres depuis le pas
// précédent, et les seuls champs de l'état qui ont bougé. Un nouveau ruck, une
// passe qui part, un coup de sifflet sont donc de vrais événements, datés au
// pas près ; les noms et les gabarits ne voyagent qu'une fois.
//
// ⚠️ LE CLIENT NE REÇOIT TOUJOURS NI LA GRAINE NI LE PLAN ADVERSE. Il ne peut
// rejouer que le passé que le serveur lui a donné, jamais calculer la suite.

import type { EtatMatch, Phase } from '../moteur/etat.js';
import type { Pion, Role } from '../moteur/entites.js';
import { corpsPourAffichage, type GesteMatch } from '../moteur/dynamique.js';
import { apparenceJoueurMatch, type ApparenceMatch } from '../moteur/apparenceMatch.js';
import type { Cote, Vec } from '../moteur/terrain.js';
import type { PosteId } from '../../types.js';
import { exclusionsDepuisEtat } from '../habillageTV.js';

/** Le pas de simulation du moteur (`DT`), en secondes. */
export const PAS_FILM = 0.15;
/** Ce que la caméra garde en mémoire : douze secondes de match. */
const PHOTOS_MAX = 80;
/** Une image complète est servie avec ce recul, pour que l'écran ait de quoi jouer tout de suite. */
const RECUL_CLE = 22;

export type Json = null | boolean | number | string | Json[] | { [cle: string]: Json };
type Objet = { [cle: string]: Json };

/** Ce qui ne change pas pendant le match : envoyé avec l'image complète seulement. */
export interface FeuilleFilm {
  id: string; cote: Cote; nom: string; vitesseMax: number; puissance: number;
  tailleCm?: number; poidsKg?: number;
}
export type GesteFilm = Omit<GesteMatch, 'id'>;

/** Un pas du moteur, tel que la caméra le garde. */
interface PhotoFilm {
  n: number;
  /** Les pions présents sur la pelouse, dans l'ordre du moteur. */
  sur: string[];
  /**
   * Des entiers : horloge et minuteur (centièmes de seconde), ballon x, y et
   * hauteur (cm), arbitre x, y (cm) et regard (centièmes de radian), puis x, y
   * (cm) de chaque pion de `sur`.
   */
  q: number[];
  /** Tout le reste de l'état visible. */
  d: Objet;
  g: GesteMatch[];
}

export interface PasFilm {
  /** Les entiers du pas : différence avec le pas précédent, ou valeurs entières si `a`. */
  q: number[];
  a?: 1;
  sur?: string[];
  /** Ce qui a changé dans l'état. `null` : le champ a disparu. */
  d?: Objet;
  /** Les gestes nés à ce pas. */
  g?: GesteFilm[];
}

export interface FilmDirect {
  v: 1;
  /** Image complète : l'écran repart d'elle (premier chargement, ou suite impossible à raccorder). */
  cle?: { n: number; feuille: FeuilleFilm[]; sur: string[]; q: number[]; d: Objet; g: GesteFilm[] };
  /** Numéro du premier pas de `pas`. */
  de: number;
  pas: PasFilm[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. LA CAMÉRA (serveur) — elle photographie chaque pas du moteur
// ═══════════════════════════════════════════════════════════════════════════

const SCALAIRES = [
  'phase', 'possession', 'dureeArret', 'fini', 'scoreA', 'scoreB', 'essaisA', 'essaisB', 'systeme',
  'phasesDepuisArret', 'ligneAvantage', 'metresGagnesPhase', 'ballonLent', 'ouvert', 'periode', 'sirene', 'placementJoue',
  // Le vent (trois nombres fixés au coup d'envoi) et le changement de côté : l'écran en déduit tout le reste.
  'ventDirection', 'ventForce', 'ventGraine', 'cotesInverses',
] as const;
/**
 * ⚠️ LES OBJETS DONT L'IDENTITÉ COMPTE. L'affichage reconnaît un nouveau ruck,
 * une nouvelle passe ou un nouveau coup de sifflet à ce que l'OBJET a changé,
 * pas à son contenu. Chacun porte donc une marque de génération (`#`) : tant
 * qu'elle ne bouge pas, l'écran garde son objet et le met à jour ; dès qu'elle
 * change, il en crée un neuf.
 */
const IDENTITES = [
  'vol', 'ruck', 'conquete', 'tir', 'aplatissage', 'sifflet', 'grosImpact', 'maul', 'penalite',
  'piedPrepare', 'echappee', 'tmo', 'dernierReplayEssai',
] as const;
/** Ceux dont le décompte (`restant`) part en date de fin : une valeur fixe ne se renvoie pas à chaque pas. */
const A_ECHEANCE = new Set<string>(['sifflet', 'grosImpact', 'echappee', 'tmo', 'dernierReplayEssai']);

const r2 = (n: number): number => Math.round(n * 100) / 100;
const r3 = (n: number): number => Math.round(n * 1000) / 1000;
const cm = (n: number): number => Math.round(n * 100);
const estPion = (v: object): v is Pion => typeof (v as Pion).id === 'string' && 'pos' in v && 'stats' in v;

interface Camera {
  /**
   * Quelqu'un regarde ce match. ⚠️ ON NE FILME QUE CE QUI EST REGARDÉ : gardées
   * pour les quatre cents matchs qu'un serveur chaud peut tenir, douze secondes
   * de photos sortaient les moteurs du cache (banc `verify:scale-direct`). La
   * caméra s'allume à la première demande et s'éteint quand plus personne ne
   * demande la suite.
   */
  active: boolean;
  /** Avances du moteur depuis la dernière demande de film. */
  sansDemande: number;
  photos: PhotoFilm[];
  /** On ne photographie qu'à partir de cette seconde de jeu (les rejoues à froid ne filment que la fin). */
  seuil: number;
  generations: WeakMap<object, number>;
  feuille?: FeuilleFilm[];
}
const CAMERAS = new WeakMap<EtatMatch, Camera>();

function serialiser(v: unknown, profondeur = 0): Json | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? r3(v) : undefined;
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v !== 'object' || profondeur > 6) return undefined;
  if (Array.isArray(v)) return v.map((x) => serialiser(x, profondeur + 1) ?? null);
  if (estPion(v)) return { $: v.id };
  const o: Objet = {};
  for (const k in v) {
    const s = serialiser((v as Record<string, unknown>)[k], profondeur + 1);
    if (s !== undefined) o[k] = s;
  }
  return o;
}

function photographier(e: EtatMatch, camera: Camera): PhotoFilm {
  const n = Math.round(e.sim / PAS_FILM);
  const marque = (objet: object): number => {
    let g = camera.generations.get(objet);
    if (g === undefined) { g = n; camera.generations.set(objet, g); }
    return g;
  };
  const d: Objet = {};
  for (const cle of SCALAIRES) {
    const v = e[cle];
    if (v !== undefined && v !== null) d[cle] = typeof v === 'number' ? r3(v) : v as Json;
  }
  for (const cle of IDENTITES) {
    const source = e[cle];
    if (!source) continue;
    const o = serialiser(source) as Objet;
    o['#'] = marque(source);
    if (A_ECHEANCE.has(cle) && typeof o.restant === 'number') { o.fin = r3(e.sim + o.restant); delete o.restant; }
    if (cle === 'vol') { o.depart = r3(e.sim - e.vol!.ecoule); delete o.ecoule; }
    if (cle === 'conquete') {
      // La progression se relit sur le minuteur ; la mêlée détaillée garde sa propre identité.
      delete o.progression;
      if (e.conquete!.melee && o.melee) (o.melee as Objet)['#'] = marque(e.conquete!.melee);
    }
    d[cle] = o;
  }
  if (e.porteur) d.porteur = { $: e.porteur.id };
  if (e.origine) d.origine = { x: r2(e.origine.x), y: r2(e.origine.y) };
  if (e.cellule) d.cellule = serialiser(e.cellule) as Json;
  if (e.ballonLibre) {
    const b = e.ballonLibre;
    d.ballonLibre = {
      '#': marque(b), orientation: r2(b.orientation ?? 0), vitesseRotation: r2(b.vitesseRotation ?? 0),
      dernierRebondSim: r3(b.dernierRebondSim ?? -10), rebonds: b.rebonds, intention: b.intention,
    };
  }
  if (e.lancement) {
    d.lancement = { type: e.lancement.type, libelle: e.lancement.libelle };
    if (e.lancement.intention) (d.lancement as Objet).intention = e.lancement.intention;
    if (e.lancement.structure) (d.lancement as Objet).structure = e.lancement.structure;
  }
  if (e.combinaisonEnCours) d.combinaisonEnCours = true;
  if (e.discipline?.jaunes || e.discipline?.rouges) d.discipline = { jaunes: e.discipline.jaunes, rouges: e.discipline.rouges };

  const pions: Objet = {};
  const sur: string[] = [];
  const q: number[] = [
    cm(e.t), cm(e.minuteur), cm(e.ballon.x), cm(e.ballon.y), cm(e.ballonLibre?.hauteur ?? 0),
    cm(e.arbitre?.pos.x ?? 0), cm(e.arbitre?.pos.y ?? 0), cm(e.arbitre?.regard ?? 0),
  ];
  for (const p of e.pions) {
    const j: Objet = { role: p.role, numero: p.numero, poste: p.poste };
    if (p.numeroMaillot !== undefined) j.numeroMaillot = p.numeroMaillot;
    if (p.surLeTerrain) { j.t = 1; sur.push(p.id); q.push(cm(p.pos.x), cm(p.pos.y)); }
    if (p.sanction > 0) j.s = 1;
    if (p.remplace) j.remplace = true;
    if ((p as Pion & { blessure?: unknown; blesse?: unknown }).blessure || (p as Pion & { blesse?: unknown }).blesse) j.blesse = true;
    if (p.corps) {
      const c = corpsPourAffichage(p)!;
      j.corps = { debut: r3(e.sim - c.age), duree: r3(c.duree), direction: r2(c.direction), intensite: r2(c.intensite), appuis: c.appuis, bras: c.bras };
    }
    // La place visée ne sert à l'écran que pour lier les soutiens d'un regroupement.
    if (p.surLeTerrain && (p.role === 'ruck' || p.role === 'maul')) j.cible = { x: r2(p.cible.x), y: r2(p.cible.y) };
    pions[p.id] = j;
  }
  d.pions = pions;
  // Échéances absolues stables : pas de compteur à retransmettre à chaque image.
  d.exclusionsTV = exclusionsDepuisEtat(e).map(p => ({
    id: p.id, nom: p.nom, numero: p.numero, poste: p.poste, cote: p.cote, type: p.type,
    ...(p.retour !== undefined ? { retour: p.retour } : {}),
    ...(p.motif ? { motif: p.motif } : {}),
  }));
  return { n, sur, q, d, g: e.gestes ?? SANS_GESTE };
}
const SANS_GESTE: GesteMatch[] = [];

/**
 * Pose la caméra sur un moteur. ⚠️ ELLE NE FAIT QU'OBSERVER : `apresPas` est
 * appelé après chaque pas, et rien de ce qu'elle lit n'est modifié — deux
 * rejoues du même match restent identiques, qu'on les filme ou non.
 */
export function filmer(e: EtatMatch): void {
  if (CAMERAS.has(e)) return;
  const camera: Camera = { active: false, sansDemande: 0, photos: [], seuil: Infinity, generations: new WeakMap() };
  CAMERAS.set(e, camera);
  e.apresPas = (m) => {
    if (m.t < camera.seuil) return;
    const photo = photographier(m, camera);
    const derniere = camera.photos[camera.photos.length - 1];
    // Un trou dans la suite (la caméra n'a filmé que la fin d'un long rattrapage) : on repart de là.
    if (derniere && photo.n !== derniere.n + 1) camera.photos.length = 0;
    camera.photos.push(photo);
    if (camera.photos.length > PHOTOS_MAX) camera.photos.splice(0, camera.photos.length - PHOTOS_MAX);
  };
}

/** Avant d'avancer le moteur jusqu'à `secondeCible` : ne filmer que les douze dernières secondes. */
export function cadrerFilm(e: EtatMatch, secondeCible: number): void {
  const camera = CAMERAS.get(e);
  if (!camera) return;
  if (camera.active && ++camera.sansDemande > 12) { camera.active = false; camera.photos.length = 0; }
  camera.seuil = camera.active ? secondeCible - PHOTOS_MAX * PAS_FILM : Infinity;
}

/** Octets estimés des photos gardées : le cache des moteurs en tient compte. */
export function poidsFilm(e: EtatMatch): number {
  return (CAMERAS.get(e)?.photos.length ?? 0) * 5_120;
}

const gesteFilm = (g: GesteMatch): GesteFilm => {
  const f: GesteFilm = { joueurId: g.joueurId, clip: g.clip, debut: r3(g.debut), duree: r3(g.duree) };
  if (g.variante) f.variante = g.variante;
  return f;
};

/**
 * Le film à envoyer : les pas qui suivent `depuis` (le dernier que l'écran
 * connaît), ou une image complète s'il n'en connaît aucun qui se raccorde.
 */
export function extraireFilm(e: EtatMatch, depuis?: number): FilmDirect | undefined {
  const camera = CAMERAS.get(e);
  if (!camera) return undefined;
  // Première demande : la caméra s'allume, et cette réponse-ci part avec le
  // relevé du terrain — le film commence au sondage suivant.
  camera.active = true; camera.sansDemande = 0;
  const photos = camera.photos;
  if (!photos.length) return undefined;
  const derniere = photos[photos.length - 1];
  let i = depuis === undefined ? -1 : photos.findIndex((p) => p.n === depuis);
  // L'écran est déjà à jour (chrono gelé, ou instance un pas en retard) : rien de neuf.
  if (i < 0 && depuis !== undefined && depuis >= derniere.n && depuis - derniere.n < 40) return { v: 1, de: depuis + 1, pas: [] };
  const film: FilmDirect = { v: 1, de: 0, pas: [] };
  if (i < 0) {
    i = Math.max(0, photos.length - 1 - RECUL_CLE);
    const cle = photos[i];
    camera.feuille ??= e.pions.map((p) => ({
      id: p.id, cote: p.cote, nom: p.nom, vitesseMax: r2(p.vitesseMax), puissance: Math.round(p.puissance),
      tailleCm: p.tailleCm, poidsKg: p.poidsKg,
    }));
    film.cle = { n: cle.n, feuille: camera.feuille, sur: cle.sur, q: cle.q, d: cle.d, g: cle.g.map(gesteFilm) };
  }
  film.de = photos[i].n + 1;
  for (let k = i + 1; k < photos.length; k++) {
    const avant = photos[k - 1], photo = photos[k];
    const memes = avant.sur.length === photo.sur.length && avant.sur.every((id, j) => id === photo.sur[j]);
    const pas: PasFilm = memes ? { q: photo.q.map((v, j) => v - avant.q[j]) } : { q: photo.q, a: 1, sur: photo.sur };
    const d = difference(avant.d, photo.d);
    if (d !== undefined && d !== null) pas.d = d as Objet;
    if (photo.g !== avant.g) {
      const connus = new Set(avant.g.map((g) => g.id));
      const nes = photo.g.filter((g) => !connus.has(g.id));
      if (nes.length) pas.g = nes.map(gesteFilm);
    }
    film.pas.push(pas);
  }
  return film;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LA DIFFÉRENCE ENTRE DEUX PAS
// ═══════════════════════════════════════════════════════════════════════════

const estObjet = (v: Json | undefined): v is Objet => typeof v === 'object' && v !== null && !Array.isArray(v);

/** `undefined` : rien n'a changé. `null` : la valeur a disparu. Un objet marqué (`#`) d'une autre génération part entier. */
export function difference(a: Json | undefined, b: Json | undefined): Json | undefined {
  if (b === undefined) return a === undefined ? undefined : null;
  if (a === undefined) return b;
  if (!estObjet(a) || !estObjet(b)) {
    if (a === b) return undefined;
    return Array.isArray(a) && Array.isArray(b) && JSON.stringify(a) === JSON.stringify(b) ? undefined : b;
  }
  if (a['#'] !== b['#']) return b;
  let patch: Objet | undefined;
  for (const k in b) {
    const d = difference(a[k], b[k]);
    if (d !== undefined) (patch ??= {})[k] = d;
  }
  for (const k in a) if (!(k in b)) (patch ??= {})[k] = null;
  return patch;
}

/** Applique une différence. Renvoie rien : `base` est modifié en place. */
export function appliquerDifference(base: Objet, patch: Objet): void {
  for (const k in patch) {
    const v = patch[k];
    const ici = base[k];
    if (v === null) delete base[k];
    else if (estObjet(v) && !('#' in v) && estObjet(ici)) appliquerDifference(ici, v);
    else base[k] = v;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LE LECTEUR (client) — il rejoue le film avec un peu de retard
// ═══════════════════════════════════════════════════════════════════════════

/** Un pion tel que l'affichage le lit : la forme de celui du moteur, sans ses attributs de jeu. */
export interface PionFilm {
  id: string; cote: Cote; nom: string; numero: number; numeroMaillot?: number; poste: PosteId;
  pos: Vec; vitesse: Vec; cible?: Vec; surLeTerrain: boolean; sanction: number; role: Role;
  corps?: { age: number; debut: number; duree: number; direction: number; intensite: number; appuis?: number[]; bras?: number[] };
  vitesseMax: number; puissance: number; tailleCm?: number; poidsKg?: number;
  remplace?: boolean; blesse?: boolean;
  apparence: Pick<ApparenceMatch, 'peau' | 'cheveux' | 'coiffure' | 'barbe'>;
  stats: Record<string, number>;
}

/**
 * L'état rejoué. ⚠️ IL A LA FORME DE CELUI DU MOTEUR, champ pour champ, pour ce
 * que l'affichage en lit : la scène 3D et le terrain vu de haut le lisent comme
 * ils lisent un match de carrière. C'est un seul objet pour tout le match, mis
 * à jour en place à chaque pas.
 */
export interface EtatFilm {
  sim: number; t: number; minute: number; reliquat: number; fini: boolean; tempsReel: true;
  phase: Phase; possession: Cote; minuteur: number; dureeArret?: number;
  scoreA: number; scoreB: number; essaisA: number; essaisB: number;
  pions: PionFilm[]; ballon: Vec; porteur: PionFilm | null;
  gestes: GesteMatch[];
  arbitre: { pos: Vec; vitesse: Vec; regard: number };
  volsRecents: never[]; commentaires: never[]; compteurs: Record<string, number>;
  [champ: string]: unknown;
}

/**
 * Ce qu'il doit rester de film AU PLUS BAS, juste avant qu'un envoi n'arrive.
 *
 * ⚠️ ON RÈGLE LE CREUX, PAS LA MOYENNE. Le film se vide entre deux envois et se
 * remplit d'un coup : viser « trois secondes d'avance » à l'arrivée ne dit rien
 * de ce qui reste quand une réponse met une seconde de plus que la précédente.
 * Le lecteur mesure donc le creux de ses derniers envois et s'en tient à cette
 * marge — son retard sur le direct s'adapte tout seul au réseau qu'il a.
 */
const CREUX_CIBLE = 0.9;
/** En deçà, on ne corrige pas : une réponse un peu lente n'est pas une dérive. */
const CREUX_TOLERANCE = 0.3;
/** Avance donnée à la lecture quand elle repart de zéro. */
const AVANCE_REPRISE = 3.2;
/** En dessous, le film ralentit pour ne jamais buter sur sa dernière image. */
const AVANCE_BASSE = 0.5;
/** Au-delà, on n'accélère plus : on saute (onglet resté caché, réseau coupé). */
const AVANCE_RUPTURE = 12;

interface PasRecu { n: number; sur?: string[]; q: number[]; d?: Objet; g?: GesteFilm[] }
/** Tant que le poste du pion n'est pas connu : remplacée au premier pas par celle de sa carte. */
const APPARENCE_VIDE = {} as PionFilm['apparence'];

export class LecteurFilm {
  /** L'état rejoué. Le même objet du premier pas à la sirène. */
  readonly etat: EtatFilm;
  /** Numéro du dernier pas reçu : c'est lui qu'on annonce au serveur. `undefined` : rien reçu. */
  dernier: number | undefined;
  /** Compte les reprises à zéro (image complète non raccordée) : l'affichage doit alors se rebrancher. */
  coupes = 0;
  /** Le film n'avance pas, faute d'images : le serveur est en retard ou le chrono est gelé. */
  enAttente = true;

  private pions = new Map<string, PionFilm>();
  private brut: Objet = {};
  private sur: string[] = [];
  /** Entiers du dernier pas reçu (décodage) et du pas affiché. */
  private qTete: number[] = [];
  private tampon: PasRecu[] = [];
  /** Numéro du pas appliqué à `etat`. */
  private applique = -1;
  /** Position de lecture, en secondes simulées. */
  private lecture = 0;
  /** Écart de synchronisation restant à résorber (secondes) : positif, on est en retard sur le direct. */
  private ecart = 0;
  /** Ce qu'il restait de film à l'arrivée des derniers envois. */
  private creux: number[] = [];
  private precedentes = new Map<string, Vec>();
  private ballonAvant: Vec = { x: 61, y: 35 };
  private immobile = false;

  constructor() {
    this.etat = {
      sim: 0, t: 0, minute: 0, reliquat: 0, fini: false, tempsReel: true,
      phase: 'coupEnvoi', possession: 'A', minuteur: 0,
      scoreA: 0, scoreB: 0, essaisA: 0, essaisB: 0,
      pions: [], ballon: { x: 61, y: 35 }, porteur: null, gestes: [],
      arbitre: { pos: { x: 54, y: 26 }, vitesse: { x: 0, y: 0 }, regard: 0 },
      volsRecents: [], commentaires: [], compteurs: {},
      vol: null, ruck: null, conquete: null, tir: null, aplatissage: null, sifflet: null, ballonLibre: null,
    };
  }

  /** Le film a de quoi être montré. */
  get pret(): boolean { return this.applique >= 0; }
  /** Secondes de film encore devant la lecture. */
  get avance(): number { return this.dernier === undefined ? 0 : this.dernier * PAS_FILM - this.lecture; }
  /** Position d'un pion au pas précédent, pour l'interpolation du terrain vu de haut. */
  avant(id: string): Vec | undefined { return this.precedentes.get(id); }
  /** Position du ballon au pas précédent. */
  get ballonPrecedent(): Vec { return this.ballonAvant; }
  /** Part du pas courant déjà écoulée, de 0 (pas précédent) à 1 (pas courant). */
  get alpha(): number { return Math.max(0, Math.min(1, this.etat.reliquat / PAS_FILM)); }

  /** Range un envoi du serveur. Une réponse ancienne ou en double est simplement ignorée. */
  recevoir(film: FilmDirect | undefined): void {
    if (!film || film.v !== 1) return;
    let de = film.de;
    let pas = film.pas;
    if (film.cle) {
      const raccord = this.dernier !== undefined && film.cle.n <= this.dernier && film.cle.n + pas.length >= this.dernier;
      if (raccord) {
        // On connaît déjà ce passé : seule la suite nous intéresse.
        pas = pas.slice(this.dernier! - film.cle.n);
        de = this.dernier! + 1;
      } else {
        this.repartir(film.cle);
      }
    }
    if (this.dernier === undefined || de !== this.dernier + 1) return;
    if (!pas.length) return;
    const creux = this.avance;
    let tete: number = this.dernier;
    for (const p of pas) {
      tete += 1;
      const q = p.a ? p.q : p.q.map((v, j) => v + (this.qTete[j] ?? 0));
      this.qTete = q;
      this.tampon.push({ n: tete, sur: p.sur, q, d: p.d, g: p.g });
    }
    this.dernier = tete;
    if (this.avance > AVANCE_RUPTURE) {
      // Très loin derrière : on saute au retard voulu plutôt que de rejouer douze secondes en accéléré.
      this.lecture = tete * PAS_FILM - AVANCE_REPRISE;
      this.ecart = 0; this.creux.length = 0; this.coupes++;
      this.rattraper(true);
      return;
    }
    // La correction se fait par la vitesse de lecture, jamais par un saut — et
    // seulement quand trois envois de suite disent la même chose.
    this.creux.push(creux);
    if (this.creux.length < 3 || Math.abs(this.ecart) > 0.05) return;
    const bas = Math.min(...this.creux);
    const derive = bas - CREUX_CIBLE;
    if (this.creux.length > 6) this.creux.shift();
    if (Math.abs(derive) <= CREUX_TOLERANCE) return;
    this.ecart = derive;
    this.creux.length = 0;
  }

  /**
   * Fait avancer la lecture de `dt` secondes réelles et applique les pas
   * franchis. Renvoie vrai si l'état a changé de pas.
   *
   * ⚠️ LA LECTURE NE RECULE JAMAIS ET NE DÉPASSE JAMAIS LA DERNIÈRE IMAGE. Un
   * envoi en retard ne se rattrape pas en inventant la suite : le film ralentit
   * à l'approche de sa fin, s'arrête au besoin, puis repart un peu plus vite.
   */
  avancer(dt: number): boolean {
    if (this.dernier === undefined || this.applique < 0) return false;
    const reste = Math.max(0, this.dernier * PAS_FILM - this.lecture);
    // L'écart se résorbe par la vitesse, sur quelques secondes : 12 % de moins
    // ou 15 % de plus ne se remarquent pas, un saut si.
    const correction = Math.abs(this.ecart) < 0.04 ? 0 : Math.max(-0.12, Math.min(0.15, this.ecart * 0.25));
    const freine = reste < AVANCE_BASSE && reste / AVANCE_BASSE < 1 + correction;
    const vitesse = freine ? reste / AVANCE_BASSE : 1 + correction;
    const parcouru = Math.min(reste, dt * vitesse);
    this.enAttente = dt > 0 && parcouru < dt * 0.05;
    // Seule la correction VOULUE consomme l'écart. Ce que la fin du film a
    // freiné creuse le retard — c'est justement ce qu'un écart négatif demande.
    if (!freine) this.ecart = correction ? this.ecart - correction * dt : 0;
    else if (this.ecart < 0) this.ecart = Math.min(0, this.ecart + dt - parcouru);
    this.lecture += parcouru;
    const change = this.rattraper(false);
    // Le film attend sa suite : plus personne ne court sur place, chacun
    // s'arrête comme on s'arrête quand le jeu s'arrête.
    if (this.enAttente && !change && !this.immobile) {
      this.immobile = true;
      for (const p of this.etat.pions) { p.vitesse.x = 0; p.vitesse.y = 0; }
      this.etat.arbitre.vitesse.x = 0; this.etat.arbitre.vitesse.y = 0;
    }
    return change;
  }

  /** Applique les pas dont l'instant est atteint. */
  private rattraper(force: boolean): boolean {
    let change = force;
    // L'état montre le pas `k` dès que la lecture a dépassé l'instant du pas `k - 1`.
    while (this.tampon.length && this.lecture > (this.tampon[0].n - 1) * PAS_FILM - 1e-9) {
      this.appliquer(this.tampon.shift()!);
      change = true;
    }
    this.etat.reliquat = Math.max(0, Math.min(PAS_FILM, this.lecture - (this.applique - 1) * PAS_FILM));
    return change;
  }

  private repartir(cle: NonNullable<FilmDirect['cle']>): void {
    this.tampon.length = 0;
    this.brut = {};
    this.precedentes.clear();
    for (const f of cle.feuille) {
      let p = this.pions.get(f.id);
      if (!p) {
        p = {
          id: f.id, cote: f.cote, nom: f.nom, numero: 0, poste: 'pilier_gauche', pos: { x: 0, y: 0 }, vitesse: { x: 0, y: 0 },
          surLeTerrain: false, sanction: 0, role: 'ligne', vitesseMax: f.vitesseMax, puissance: f.puissance,
          tailleCm: f.tailleCm, poidsKg: f.poidsKg, apparence: APPARENCE_VIDE, stats: {},
        };
        this.pions.set(f.id, p);
      }
    }
    this.etat.pions = cle.feuille.map((f) => this.pions.get(f.id)!);
    this.etat.gestes = [];
    if (this.dernier !== undefined) this.coupes++;
    this.qTete = cle.q;
    this.dernier = cle.n;
    this.applique = -1;
    this.appliquer({ n: cle.n, sur: cle.sur, q: cle.q, d: cle.d, g: cle.g }, true);
    this.lecture = cle.n * PAS_FILM;
    this.ecart = 0; this.creux.length = 0;
    this.etat.reliquat = PAS_FILM;
  }

  private appliquer(pas: PasRecu, entier = false): void {
    const e = this.etat;
    const sim = pas.n * PAS_FILM;
    this.immobile = false;
    this.ballonAvant = entier ? { x: pas.q[2] / 100, y: pas.q[3] / 100 } : { x: e.ballon.x, y: e.ballon.y };
    for (const id of this.sur) { const p = this.pions.get(id); if (p) this.precedentes.set(id, { x: p.pos.x, y: p.pos.y }); }
    if (pas.sur) this.sur = pas.sur;
    const q = pas.q;
    const suite = !entier && pas.n === this.applique + 1;
    e.sim = sim; e.t = q[0] / 100; e.minute = Math.min(80, Math.floor(e.t / 60)); e.minuteur = q[1] / 100;
    e.ballon.x = q[2] / 100; e.ballon.y = q[3] / 100;
    const a = e.arbitre, ax = q[5] / 100, ay = q[6] / 100;
    a.vitesse.x = suite ? (ax - a.pos.x) / PAS_FILM : 0; a.vitesse.y = suite ? (ay - a.pos.y) / PAS_FILM : 0;
    a.pos.x = ax; a.pos.y = ay; a.regard = q[7] / 100;

    // ── L'état : seuls les champs qui ont changé sont repris ──────────────────
    if (pas.d) {
      const patch = pas.d;
      appliquerDifference(this.brut, patch);
      const pions = patch.pions;
      if (estObjet(pions)) for (const id in pions) this.majPion(id);
      for (const cle in patch) {
        if (cle === 'pions') continue;
        const valeur = this.brut[cle];
        const p = patch[cle];
        const neuf = estObjet(p) && '#' in p;
        e[cle] = valeur === undefined ? null : this.animer(valeur, neuf ? undefined : e[cle]);
      }
    }
    // ── Les positions : la vitesse d'un pion est son déplacement réel ────────
    for (let i = 0; i < this.sur.length; i++) {
      const p = this.pions.get(this.sur[i]);
      if (!p) continue;
      const x = q[8 + i * 2] / 100, y = q[9 + i * 2] / 100;
      const connu = suite && this.precedentes.has(p.id);
      p.vitesse.x = connu ? (x - p.pos.x) / PAS_FILM : 0;
      p.vitesse.y = connu ? (y - p.pos.y) / PAS_FILM : 0;
      p.pos.x = x; p.pos.y = y;
      if (!connu) this.precedentes.set(p.id, { x, y });
      if (p.corps) p.corps.age = Math.max(0, sim - p.corps.debut);
    }
    // ── Ce qui se déduit du temps : rien de tout ça ne voyage à chaque pas ───
    const vol = e.vol as { depart?: number; ecoule?: number } | null;
    if (vol && typeof vol.depart === 'number') vol.ecoule = Math.max(0, sim - vol.depart);
    for (const cle of A_ECHEANCE) {
      const o = e[cle] as { fin?: number; restant?: number } | null;
      if (o && typeof o.fin === 'number') o.restant = Math.max(0, o.fin - sim);
    }
    const conquete = e.conquete as { progression?: number } | null;
    if (conquete) conquete.progression = e.dureeArret ? Math.max(0, Math.min(1, 1 - e.minuteur / e.dureeArret)) : 1;
    const libre = e.ballonLibre as { hauteur?: number } | null;
    if (libre) libre.hauteur = q[4] / 100;
    if (pas.g?.length) {
      for (const g of pas.g) e.gestes.push({ ...g, id: `${g.joueurId}:${g.debut.toFixed(3)}:${g.clip}` });
    }
    if (e.gestes.length && sim - e.gestes[0].debut >= 8) e.gestes = e.gestes.filter((g) => sim - g.debut < 8);
    this.applique = pas.n;
  }

  private majPion(id: string): void {
    const p = this.pions.get(id);
    const j = (this.brut.pions as Objet | undefined)?.[id];
    if (!p || !estObjet(j)) return;
    const poste = j.poste as PosteId;
    if (poste !== p.poste || p.apparence === APPARENCE_VIDE) {
      const a = apparenceJoueurMatch(p.nom, poste);
      p.apparence = { peau: a.peau, cheveux: a.cheveux, coiffure: a.coiffure, barbe: a.barbe };
    }
    p.poste = poste;
    p.role = j.role as Role;
    p.numero = j.numero as number;
    p.numeroMaillot = j.numeroMaillot as number | undefined;
    const etait = p.surLeTerrain;
    p.surLeTerrain = j.t === 1;
    if (etait !== p.surLeTerrain) this.precedentes.delete(id);
    p.sanction = j.s === 1 ? 1 : 0;
    p.remplace = j.remplace === true;
    p.blesse = j.blesse === true;
    p.cible = estObjet(j.cible) ? { x: j.cible.x as number, y: j.cible.y as number } : undefined;
    if (estObjet(j.corps)) {
      const c = j.corps;
      p.corps = {
        age: 0, debut: c.debut as number, duree: c.duree as number, direction: c.direction as number,
        intensite: c.intensite as number, appuis: c.appuis as number[], bras: c.bras as number[],
      };
    } else delete p.corps;
  }

  /** Rend vivant un morceau d'état : les renvois deviennent des pions, l'objet déjà en place est gardé. */
  private animer(brut: Json, vivant: unknown): unknown {
    if (!estObjet(brut)) return Array.isArray(brut) ? brut.map((x) => this.animer(x, undefined)) : brut;
    if (typeof brut.$ === 'string') return this.pions.get(brut.$) ?? null;
    const cible = (vivant && typeof vivant === 'object' && !Array.isArray(vivant) ? vivant : {}) as Record<string, unknown>;
    for (const k in cible) if (!(k in brut)) delete cible[k];
    for (const k in brut) if (k !== '#') cible[k] = this.animer(brut[k], cible[k]);
    return cible;
  }
}

/**
 * Le dernier pas connu de chaque direct ouvert, pour que le sondage l'annonce
 * au serveur. Le lecteur vit dans l'écran du terrain, le sondage dans celui de
 * la ligue : ce repère évite de les lier l'un à l'autre.
 */
export const reperesFilm = new Map<string, number>();
