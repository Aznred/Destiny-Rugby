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

/** `tv` : la réalisation choisit ses plans (derrière le buteur, derrière les poteaux, en-but, vue aérienne…). */
export type Camera3D = 'tv' | 'follow' | 'close' | 'wide' | 'aerienne' | 'basse' | 'enbut';
export const CAMERAS_3D: readonly Camera3D[] = ['tv', 'follow', 'close', 'wide', 'aerienne', 'basse', 'enbut'];

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
  /** Par identifiant de pion : ce que la carte du joueur sait de son apparence. */
  apparences?: Record<string, Pick<ApparenceMatch, 'peau' | 'cheveux' | 'coiffure' | 'barbe'>>;
  /** Le pion du joueur, cerclé sur la pelouse. */
  moi?: string;
  /** La caméra reste entre son pion et le ballon. */
  suivreMoi?: boolean | number;
  /** Téléphone ou tablette : textures et définition réduites. */
  leger?: boolean;
  camera?: Camera3D;
  /** Ralentis automatiques après un essai. */
  television?: { ralentis?: boolean };
  /** La compétition, montrée sur le volet des ralentis. */
  habillage?: { nom?: string; logo?: string };
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
  readonly ips: number;
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
export function webglDisponible(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const toile = document.createElement('canvas');
    return !!(toile.getContext('webgl2') ?? toile.getContext('webgl'));
  } catch {
    return false;
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

interface ModuleScene {
  creerScene3D: (conteneur: HTMLElement, options: unknown) => Promise<Scene3D>;
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
    sortie[j.id] = { peau: a.peau, cheveux: a.cheveux, coiffure: a.coiffure, barbe: a.barbe };
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
