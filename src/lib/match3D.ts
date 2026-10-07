// LE MATCH EN TROIS DIMENSIONS — le pont entre les écrans de match et la scène.
//
// La scène vit dans `public/rn26/` (sources : `../analyse-rn26/apercu/match/`).
// Elle ne décide de RIEN : elle lit un état de match et le met en images. Ce
// module la charge à la demande et lui remet les fonctions pures du moteur, pour
// que l'affichage lise exactement la version du moteur qui joue le match.
//
// ⚠️ ELLE N'EST PAS DANS LE BUNDLE, ET C'EST VOULU. Ses modules, three compris,
// sont servis tels quels depuis `public/` : un joueur qui n'ouvre jamais de
// match ne télécharge ni le stade ni les mouvements (une quarantaine de Mo).

import { jalon } from './finMatch';
import { geometrieMelee, TEMPS_MELEE, RITUEL_TIR } from './moteur/moteur';
import { porteurPourAffichage } from './moteur/dynamique';
import type { EtatMatch } from './moteur/etat';
import { positionVol } from './moteur/trajectoire';
import { apparenceJoueurMatch, maillotDeSecours, type ApparenceMatch, type MaillotMatch } from './moteur/apparenceMatch';
import { sourceEcusson } from './ecussons';
import type { PosteId } from '../types';

export interface EquipeScene3D {
  nom: string;
  maillot: MaillotMatch;
  /** Écusson cousu sur la poitrine et posé sur les protections de poteaux. */
  blason?: string;
}

/**
 * `tv` : la réalisation choisit ses plans (derrière le buteur, derrière les poteaux, en-but, vue aérienne…).
 * `joueur` : derrière notre joueur, légèrement surélevée — la vue du contrôle direct (Correctif 16).
 */
export type Camera3D = 'tv' | 'follow' | 'close' | 'wide' | 'aerienne' | 'basse' | 'enbut' | 'joueur';
export const CAMERAS_3D: readonly Camera3D[] = ['tv', 'follow', 'close', 'wide', 'aerienne', 'basse', 'enbut'];
/** Les mêmes, plus la vue derrière le joueur : celle que le bouton de caméra propose quand on incarne un joueur. */
export const CAMERAS_3D_AVEC_JOUEUR: readonly Camera3D[] = ['tv', 'joueur', 'follow', 'close', 'wide', 'aerienne', 'basse', 'enbut'];

/**
 * Ce que l'hôte pose sur la pelouse pendant le contrôle direct (Correctif 16). Les points sont en repère
 * TERRAIN du moteur ; la scène les convertit et ne décide de rien.
 */
export interface ReperesScene {
  /** Le poste que l'IA lui donnerait, et s'il s'en est éloigné (l'anneau devient orange). */
  suggestion?: { x: number; y: number };
  horsPoste?: boolean;
  /** Les receveurs qu'une passe à gauche ou à droite servirait (`fort: false` : un joueur plus loin). */
  passes?: { id: string; fort?: boolean }[];
  /** Le porteur qu'on peut plaquer. */
  plaquage?: string;
  /** Un coup de pied qui se prépare : où le ballon retomberait, et avec quelle puissance (0 à 1). */
  visee?: { arrivee: { x: number; y: number }; puissance: number };
}

/** Le son du match, porté par la scène : foule, sifflet, chocs, frappes. */
export interface Son3D {
  readonly disponible: boolean;
  muet: boolean;
  volume: number;
  /** Son d'habillage demandé par l'écran : `entree`, `corne`, `volet`, `applaudissements`… */
  evenement(nom: string, reglages?: { gain?: number; retard?: number }): void;
}

export interface OptionsScene3D {
  /** Domicile d'abord : c'est son public qui remplit le stade. */
  equipes: [EquipeScene3D, EquipeScene3D];
  /**
   * Les deux tenues sont déjà départagées par l'écran (`lib/tenuesMatch.ts`) : la scène les habille telles quelles. Sans
   * ce drapeau elle refait son propre choix, et le tableau des scores pourrait afficher une autre couleur que le terrain.
   */
  tenuesDepartagees?: boolean;
  /** Par identifiant de pion : ce que la carte du joueur sait de son apparence. */
  apparences?: Record<string, Pick<ApparenceMatch, 'peau' | 'cheveux' | 'coiffure' | 'barbe' | 'coupeId' | 'barbeId' | 'couleurBarbe' | 'morpho' | 'equipement'>>;
  /** Le pion du joueur, cerclé sur la pelouse. */
  moi?: string;
  /** La caméra reste entre son pion et le ballon. */
  suivreMoi?: boolean | number;
  /** Téléphone ou tablette : textures et définition réduites. */
  leger?: boolean;
  /** Le profil de l'appareil (`lib/profilAppareil.ts`) : « bas » fait partir la scène à 30 images par seconde régulières. */
  profil?: 'bas' | 'moyen' | 'haut';
  /** `false` : la scène ne règle ni sa définition ni sa cadence (bancs de mesure). */
  cadence?: boolean;
  /** Le navigateur a repris le contexte graphique en cours de match : à l'hôte de revenir au terrain vu de haut. */
  surPerte?: () => void;
  camera?: Camera3D;
  /** Ralentis automatiques après un essai. */
  television?: { ralentis?: boolean };
  /** La compétition, montrée sur le volet des ralentis. */
  habillage?: { nom?: string; logo?: string };
  /** Le ballon équipé en boutique (identifiant du skin) ; absent ou inconnu : le ballon Destiny Rugby de la scène. */
  ballon?: string;
  /** Le décor, selon le niveau du club qui reçoit (`lib/stade3D.ts`) ; absent : la grande enceinte. */
  stade?: 'campagne' | 'village' | 'moyen' | 'grand' | 'international';
  /** Libellés de la scène, dans la langue du joueur. */
  textes?: { ralenti?: string };
}

export interface Scene3D {
  /** Branche un état de match. `direct` : état déjà interpolé (relevés du direct en ligne). */
  brancher(etat: unknown, options?: { direct?: boolean }): unknown;
  /** Une image. `fige` : le match est arrêté (carte de décision, pause). */
  image(dt: number, options?: { fige?: boolean; vitesse?: number }): void;
  /** Retient une conquête tant que les avants ne sont pas en place ; à appeler avant `avancer`. */
  retenir(dt: number): void;
  recadrer(): void;
  /** Position à l'écran, en pixels du cadre, du dessus de la tête d'un joueur. */
  ecran(id: string, hauteurTete?: number): { x: number; y: number } | null;
  detruire(): void;
  /** La même destruction, par tranches (Correctif 26). Absente d'un lecteur installé avant ce correctif. */
  detruireParEtapes?(): Promise<void>;
  /** `null` quand le navigateur n'a pas de sortie son. */
  son: Son3D | null;
  television: { ralentis: boolean };
  /** Un ralenti est à l'image (ou son volet arrive). */
  readonly ralenti: boolean;
  /** Le plan réellement à l'image. */
  readonly plan: string | null;
  passerRalenti(): void;
  /** Revoir les dernières secondes : arbitrage vidéo, action demandée par l'écran. */
  revoir(options?: { depuis?: number; jusqua?: number; vitesse?: number }): boolean;
  /** Le volet de la compétition ; `auMilieu` est appelé quand il couvre l'image. */
  volet(auMilieu?: () => void): void;
  /** Entrée des équipes : `k` de 0 (dans le tunnel) à 1 (en place) ; `null` rend la main au match. */
  entrer(k: number | null, dt?: number): void;
  surRalenti: ((actif: boolean, motif: string) => void) | null;
  camera: Camera3D;
  moi: string | undefined;
  suivreMoi: boolean | number;
  /** Recul de la caméra derrière le joueur (réglage du joueur, 1 par défaut). */
  reculCamera: number;
  /** Caméra du joueur à 360° (Correctif 23) : tourne la vue de `dYaw` radians (positif : vers la droite). */
  orbiter(dYaw: number): void;
  /** `libre` : la caméra reste où le joueur l'a mise ; `assistee` : elle revient derrière sa course après un moment. */
  modeCamera: 'libre' | 'assistee';
  readonly ips: number;
  /** Le profileur (Correctif 25) : ce que coûte une image. Absent d'un lecteur plus ancien. */
  mesures?(): import('./profileur').MesuresScene;
  /** Mesure GPU facultative, uniquement lorsque le profileur est affiché. */
  mesurerGpu?(actif: boolean): void;
  /** Les repères du contrôle direct, redessinés à chaque image ; `null` les éteint. */
  reperes: ReperesScene | null;
  /** « Droit devant » et « à droite » tels que le joueur les voit, en repère terrain (vecteurs unitaires). */
  reperesCamera(): { avant: { x: number; y: number }; droite: { x: number; y: number } };
  /** Le remplaçant est-il encore en train d'entrer sur le terrain ? */
  entreeEnCours(id: string): boolean;
  /** Fond la pose de la caméra avec la précédente : un changement de point de vue sans coupe sèche. */
  glisser(duree?: number): void;
}

const OUTILS_3D = {
  // L'état reconstitué du direct en ligne porte déjà son porteur : il n'a pas de moteur à interroger.
  porteurPourAffichage: (e: EtatMatch | { porteurAffiche: string | null }) => (
    'porteurAffiche' in e ? e.porteurAffiche ?? undefined : porteurPourAffichage(e)),
  positionVol, geometrieMelee, TEMPS_MELEE, RITUEL_TIR,
};

const CLE_PREFERENCE = 'destiny-rugby:match-3d';
const CLE_TELE = 'destiny-rugby:tele';

/** Ce que le joueur veut voir autour du match : tout se coupe, rien n'est imposé. */
export interface PreferencesTele {
  /** Ralentis après un essai et pendant l'arbitrage vidéo. */
  ralentis: boolean;
  /** Avant-match : entrée des équipes et compositions. */
  presentation: boolean;
}

export function preferencesTele(): PreferencesTele {
  const defaut: PreferencesTele = { ralentis: true, presentation: true };
  try {
    const lu = JSON.parse(localStorage.getItem(CLE_TELE) ?? 'null') as Partial<PreferencesTele> | null;
    return lu && typeof lu === 'object'
      ? { ralentis: lu.ralentis !== false, presentation: lu.presentation !== false } : defaut;
  } catch {
    return defaut;
  }
}

export function retenirPreferencesTele(p: Partial<PreferencesTele>): PreferencesTele {
  const suivantes = { ...preferencesTele(), ...p };
  try {
    localStorage.setItem(CLE_TELE, JSON.stringify(suivantes));
  } catch {
    // Stockage refusé : le réglage ne vaut que pour ce match.
  }
  return suivantes;
}

/** Le navigateur sait-il dessiner la scène ? Sinon le match garde son terrain en deux dimensions. */
let disponibiliteWebgl: boolean | undefined;
export function webglDisponible(): boolean {
  if (typeof document === 'undefined') return false;
  if (disponibiliteWebgl !== undefined) return disponibiliteWebgl;
  let toile: HTMLCanvasElement | undefined;
  try {
    toile = document.createElement('canvas');
    const contexte = toile.getContext('webgl2', { antialias: false }) ?? toile.getContext('webgl', { antialias: false });
    disponibiliteWebgl = !!contexte;
    contexte?.getExtension('WEBGL_lose_context')?.loseContext();
    return disponibiliteWebgl;
  } catch {
    return (disponibiliteWebgl = false);
  } finally {
    if (toile) { toile.width = 1; toile.height = 1; }
  }
}

/** Le match s'affiche en trois dimensions, sauf si le joueur a choisi le terrain plat. */
export function preferenceMatch3D(): boolean {
  if (!webglDisponible()) return false;
  try {
    return localStorage.getItem(CLE_PREFERENCE) !== '0';
  } catch {
    return true;
  }
}

export function retenirPreferenceMatch3D(active: boolean): void {
  try {
    localStorage.setItem(CLE_PREFERENCE, active ? '1' : '0');
  } catch {
    // Stockage refusé (navigation privée) : le choix ne vaut que pour ce match.
  }
}

/** Écran étroit ou tactile : on allège la scène plutôt que de la voir saccader. */
export function appareilLeger(): boolean {
  if (typeof window === 'undefined') return false;
  const tactile = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return tactile || Math.min(window.innerWidth, window.innerHeight) < 700;
}

/** Le joueur seul (création, personnalisation, profil) : voir `creerApercuJoueur` dans `public/rn26/scene.js`. */
export interface OptionsApercuJoueur {
  /** Apparence du match (`surchargeDeMatch`) : peau, cheveux, coupeId, barbeId, morpho, equipement… */
  apparence?: Record<string, unknown>;
  /** Couleurs du maillot porté. */
  maillot?: { principal: string; secondaire?: string; short?: string; chaussettes?: string };
  /** Un avant (1 à 8) ou un trois-quarts : deux modèles de corps. */
  avant?: boolean;
  cadrage?: 'corps' | 'visage';
  angle?: number;
  leger?: boolean;
}
export interface ApercuJoueur3D {
  mettreAJour(options: Partial<OptionsApercuJoueur>): Promise<void>;
  orienter(cote: 'face' | 'profil' | 'dos' | number): void;
  cadrer(mode: 'corps' | 'visage'): void;
  recadrer(): void;
  readonly angle: number;
  detruire(): void;
}

interface ModuleScene {
  creerScene3D: (conteneur: HTMLElement, options: unknown) => Promise<Scene3D>;
  creerApercuJoueur: (conteneur: HTMLElement, options: OptionsApercuJoueur) => Promise<ApercuJoueur3D>;
}
let chargement: Promise<ModuleScene> | null = null;

/**
 * Charge les modules de la scène, une fois par session.
 *
 * ⚠️ PAR UNE BALISE, PAS PAR `import()`. Un fichier de `public/` ne s'importe
 * pas depuis le code empaqueté : en développement Vite réécrit l'appel et
 * refuse de le servir, et rien ne garantit que le build le laisse intact. Une
 * balise `<script type="module">` est lue telle quelle par le navigateur ;
 * `chargeur.js` dépose alors la scène sur `globalThis` et prévient.
 */
function chargerModule(): Promise<ModuleScene> {
  chargement ??= new Promise<ModuleScene>((resolve, reject) => {
    const portee = globalThis as typeof globalThis & { __destinyRugbyScene3D?: ModuleScene };
    if (portee.__destinyRugbyScene3D) { resolve(portee.__destinyRugbyScene3D); return; }
    const echouer = (raison: string) => { chargement = null; reject(new Error(raison)); };
    const delai = window.setTimeout(() => echouer('La scène 3D met trop de temps à arriver.'), 30_000);
    window.addEventListener('destiny-scene3d', () => {
      window.clearTimeout(delai);
      if (portee.__destinyRugbyScene3D) resolve(portee.__destinyRugbyScene3D);
      else echouer('La scène 3D est arrivée vide.');
    }, { once: true });
    const balise = document.createElement('script');
    balise.type = 'module';
    balise.src = '/rn26/chargeur.js';
    balise.onerror = () => { window.clearTimeout(delai); echouer('La scène 3D est introuvable.'); };
    document.head.append(balise);
  });
  return chargement;
}

export async function creerApercuJoueur(conteneur: HTMLElement, options: OptionsApercuJoueur): Promise<ApercuJoueur3D> {
  const module = await chargerModule();
  return module.creerApercuJoueur(conteneur, options);
}

export async function creerScene3D(conteneur: HTMLElement, options: OptionsScene3D): Promise<Scene3D> {
  const module = await chargerModule();
  return module.creerScene3D(conteneur, { outils: OUTILS_3D, ...options });
}

/** L'apparence de chaque joueur, lue sur sa carte quand elle existe, tirée de son nom sinon. */
export function apparencesDesJoueurs(
  joueurs: readonly { id: string; nom: string; poste: PosteId }[],
): NonNullable<OptionsScene3D['apparences']> {
  const sortie: NonNullable<OptionsScene3D['apparences']> = {};
  for (const j of joueurs) {
    const a = apparenceJoueurMatch(j.nom, j.poste);
    sortie[j.id] = { peau: a.peau, cheveux: a.cheveux, coiffure: a.coiffure, barbe: a.barbe, coupeId: a.coupeId, barbeId: a.barbeId, couleurBarbe: a.couleurBarbe, morpho: a.morpho, equipement: a.equipement };
  }
  return sortie;
}

/** La tenue d'une équipe à partir de ses deux couleurs. */
export function tenueDepuisCouleurs(principal: string, secondaire: string | undefined, cle: string): MaillotMatch {
  const secours = maillotDeSecours(principal, cle);
  return secondaire ? { ...secours, secondaire } : secours;
}

/**
 * L'écusson tel qu'une toile peut le lire. Un logo distant (les clubs amateurs
 * sont servis par la FFR, sans en-tête de partage) passe par le relais du jeu ;
 * dessiné tel quel, il salirait la texture du maillot.
 */
export function ecussonPourToile(logo: string | undefined): string | undefined {
  return logo ? sourceEcusson(logo) : undefined;
}

// ── RENDRE UNE SCÈNE SANS BLOQUER L'ÉCRAN (Correctif 26) ─────────────────────────────────────────────────────────
// L'écran de fin de match REMPLACE la scène : React la démonte dans l'image du coup de sifflet. Détruite d'un bloc à
// ce moment-là (trente joueurs, textures du stade, contexte WebGL, son), c'était LA grosse image de la fin de match.
// La scène se rend maintenant par tranches ; ceux qui ont un travail lourd à faire ensuite (finaliser le match,
// quitter le plein écran, changer de page) attendent `scenesRendues()`.
const destructions = new Set<Promise<void>>();
const scenesDetruites = new WeakMap<Scene3D, Promise<void>>();

/** Détruit une scène par tranches (d'un bloc si le lecteur ne sait pas faire). Ne lève jamais d'erreur. */
export function detruireScene(scene: Scene3D | null | undefined): Promise<void> {
  if (!scene) return Promise.resolve();
  const deja = scenesDetruites.get(scene);
  if (deja) return deja;
  jalon('scene_cleanup_start');
  let promesse: Promise<void>;
  try {
    promesse = scene.detruireParEtapes ? scene.detruireParEtapes() : Promise.resolve(scene.detruire());
  } catch { try { scene.detruire(); } catch { /* contexte déjà perdu */ } promesse = Promise.resolve(); }
  // Le filet : une tranche qui échoue ne laisse pas un contexte graphique ouvert.
  const suivie: Promise<void> = promesse
    .catch(() => { try { scene.detruire(); } catch { /* déjà rendue */ } })
    .then(() => { destructions.delete(suivie); jalon('scene_cleanup_end'); });
  destructions.add(suivie);
  scenesDetruites.set(scene, suivie);
  return suivie;
}

/** Tenue quand plus aucune scène n'est en cours de destruction. */
export async function scenesRendues(): Promise<void> {
  while (destructions.size) await Promise.all([...destructions]);
}

/** Combien de scènes sont encore en train d'être rendues (banc et diagnostic). */
export function scenesEnDestruction(): number { return destructions.size; }
