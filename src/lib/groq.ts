// LE MAÎTRE DU JEU TOURNE SUR GROQ
//
// ⚠️ REMPLACE LE MODÈLE LOCAL (WebLLM). Le modèle embarqué demandait 900 Mo de
// téléchargement, un GPU compatible WebGPU, et mettait plusieurs secondes à
// répondre sur une machine ordinaire — pour un Llama 1B qui écrivait mal.
// Groq répond en quelques centaines de millisecondes sur des modèles bien plus
// gros. Demande explicite : « reviens à une clé Groq au lieu d'un LLM local,
// c'est plus rapide pour répondre ».
//
// CE FICHIER NE FAIT QUE LE TRANSPORT : la clé, l'appel HTTP, le comptage, et
// surtout LE QUOTA. Les prompts, le parsing et les garde-fous du jeu vivent
// dans `lib/mj.ts` — c'est LUI qui reste l'autorité sur ce qu'une réponse a le
// droit de changer.
//
// ⚠️ LA CLÉ DU SITE EST VISIBLE CÔTÉ CLIENT, et c'est assumé (décision de
// l'utilisateur) : le jeu est 100 % navigateur, tout le monde joue avec la même
// clé et personne n'a rien à saisir. Un joueur peut coller la sienne dans
// ⚙️ Réglages : elle prend alors la priorité, ce qui lui rend l'IA même quand
// le quota du site est épuisé.

import { t } from './i18n';

const URL_GROQ = 'https://api.groq.com/openai/v1/chat/completions';

/** La clé du site, injectée à la compilation (`.env.local` → `VITE_GROQ_KEY`). */
const CLE_SITE: string = (import.meta.env?.VITE_GROQ_KEY as string | undefined)?.trim() ?? '';

// ⚠️ LES MODÈLES LLAMA ONT ÉTÉ RETIRÉS DE GROQ. `llama-3.3-70b-versatile` et
// `llama-3.1-8b-instant` ne figurent plus dans son catalogue de production : le
// premier appel répondait donc 404 `model_decommissioned`, et comme une erreur
// non-quota coupait la cascade (voir `appelIAJSON`), TOUTE l'IA du jeu était
// muette — silencieusement, puisqu'un problème d'IA ne s'affiche jamais.
//
// ⚠️ ON PART DU MOINS CHER, ET C'EST UN CHANGEMENT DE DOCTRINE. L'ancienne
// cascade descendait du gros modèle vers le petit ; on fait l'inverse, parce
// que la clé du site est partagée par tous les joueurs et que le petit modèle
// suffit très largement à ce qu'on lui demande (du JSON court et cadré, dont
// `lib/mj.ts` reste de toute façon l'autorité). Tarifs Groq au moment de la
// bascule, par million de jetons entrée/sortie :
//
//   openai/gpt-oss-20b    0,075 $ / 0,30 $   ← le moins cher, production
//   openai/gpt-oss-120b   0,15 $  / 0,60 $   ← repli quand le 20b est à sec
//   qwen/qwen3.6-27b      ~0,29 $ / ~0,59 $  ← dernier recours, catalogue « preview »
//
// Les limites Groq étant comptées PAR MODÈLE, cette cascade reste d'abord une
// mécanique anti-quota : quand le premier est épuisé, le suivant ne l'est
// presque jamais. Surchargeable sans recompiler : `VITE_GROQ_MODELE="a,b,c"`.
//
// ⚠️ Le dernier est un modèle « preview » chez Groq : il peut disparaître du
// jour au lendemain. C'est exactement le cas que gère `modeleDisparu()` — il
// est mis au repos pour la session et la cascade continue, au lieu de couper
// l'IA comme l'a fait le retrait de Llama.
const MODELES_PAR_DEFAUT = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'qwen/qwen3.6-27b',
];

const MODELES_CONFIGURES = ((import.meta.env?.VITE_GROQ_MODELE as string | undefined) ?? '')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

export const MODELES_GROQ: string[] = MODELES_CONFIGURES.length
  ? MODELES_CONFIGURES
  : MODELES_PAR_DEFAUT;

export const MODELE_DEFAUT = MODELES_GROQ[0];

// ---------------------------------------------------------------------------
// L'ÉTAT — clé, quota, reprise
// ---------------------------------------------------------------------------

export interface EtatIA {
  /** Une clé est disponible (site ou joueur). */
  clePresente: boolean;
  /** L'IA peut répondre MAINTENANT (clé valide et au moins un modèle libre). */
  disponible: boolean;
  /** Le quota est épuisé : on joue en mode pré-écrit en attendant. */
  quotaEpuise: boolean;
  /** Horodatage de la reprise estimée (ms), quand le quota est épuisé. */
  reprise?: number;
  /** La clé a été refusée : inutile de retenter avant qu'elle change. */
  cleRefusee: boolean;
  /** Le modèle réellement utilisé au prochain appel. */
  modele?: string;
}

/** Modèle → horodatage (ms) avant lequel il est inutile de le rappeler. */
const blocages = new Map<string, number>();
let cleJoueur = '';
let cleRefusee = false;
let minuterieReprise: ReturnType<typeof setTimeout> | null = null;

const ecouteurs = new Set<() => void>();
/** `useSyncExternalStore` compare par référence : on mémoïse l'instantané. */
let instantane: EtatIA = calculerEtat();

function publier(): void {
  instantane = calculerEtat();
  ecouteurs.forEach((ecouter) => ecouter());
  programmerReveil();
}

/**
 * ⚠️ C'EST LUI QUI FAIT « ÇA REVIENT TOUT SEUL ». Quand tous les modèles sont
 * bloqués, on programme un réveil à l'instant exact de la reprise : l'écran des
 * réglages se remet à jour, et l'appel suivant repart sur Groq sans que le
 * joueur ait rien à faire. Sans ce réveil, l'IA ne reviendrait qu'au prochain
 * rendu déclenché par autre chose.
 */
function programmerReveil(): void {
  if (minuterieReprise) { clearTimeout(minuterieReprise); minuterieReprise = null; }
  if (typeof setTimeout !== 'function') return;
  const reprise = instantane.reprise;
  if (!reprise) return;
  const delai = Math.max(250, Math.min(15 * 60_000, reprise - Date.now() + 200));
  minuterieReprise = setTimeout(() => {
    minuterieReprise = null;
    instantane = calculerEtat();
    ecouteurs.forEach((ecouter) => ecouter());
  }, delai);
}

function calculerEtat(): EtatIA {
  const clePresente = Boolean(cleGroq());
  const modele = modeleDisponible();
  const reprises = MODELES_GROQ.map((m) => blocages.get(m) ?? 0).filter((t) => t > Date.now());
  return {
    clePresente,
    disponible: clePresente && !cleRefusee && Boolean(modele),
    quotaEpuise: clePresente && !cleRefusee && !modele,
    reprise: reprises.length ? Math.min(...reprises) : undefined,
    cleRefusee,
    modele,
  };
}

export function etatIA(): EtatIA {
  return instantane;
}

export function ecouterEtatIA(ecouter: () => void): () => void {
  ecouteurs.add(ecouter);
  return () => { ecouteurs.delete(ecouter); };
}

/** La clé effective : celle du joueur si elle existe, sinon celle du site. */
export function cleGroq(): string {
  return cleJoueur || CLE_SITE;
}

/**
 * Posée par le store (comme la langue et le thème) : le module ne peut pas
 * importer le store sans créer un cycle.
 */
export function definirCleGroqJoueur(cle: string): void {
  const propre = (cle ?? '').trim();
  if (propre === cleJoueur) return;
  cleJoueur = propre;
  // Une nouvelle clé, c'est un nouveau quota : on repart d'une ardoise propre.
  cleRefusee = false;
  blocages.clear();
  publier();
}

/** Le premier modèle qui n'est pas en attente de reprise. */
function modeleDisponible(): string | undefined {
  const maintenant = Date.now();
  return MODELES_GROQ.find((m) => (blocages.get(m) ?? 0) <= maintenant);
}

/**
 * ⚠️ LA QUESTION QUE POSE TOUT LE JEU. Chaque endroit qui voulait appeler l'IA
 * la pose AVANT d'appeler : si elle répond non, on joue le contenu pré-écrit,
 * sans un mot au joueur. Comme elle est réévaluée à chaque fois, l'IA revient
 * d'elle-même à la seconde où le quota se libère.
 */
export function iaDisponible(): boolean {
  return calculerEtat().disponible;
}

/** Le quota est épuisé (à afficher dans les réglages, nulle part ailleurs). */
export function quotaEpuise(): boolean {
  return calculerEtat().quotaEpuise;
}

/** Levée quand Groq refuse pour cause de quota : elle ne s'affiche JAMAIS. */
export class ErreurQuotaIA extends Error {
  override name = 'ErreurQuotaIA';
}

/** Levée quand la clé est absente ou refusée : elle ne s'affiche pas non plus. */
export class ErreurCleIA extends Error {
  override name = 'ErreurCleIA';
}

/**
 * Levée quand Groq ne connaît plus le modèle demandé (retiré du catalogue).
 *
 * ⚠️ ELLE EXISTE À CAUSE DU RETRAIT DE LLAMA. Sans elle, un modèle disparu se
 * présentait comme une panne quelconque, la cascade s'arrêtait au premier et
 * l'IA du jeu était morte en silence. Avec elle, le modèle est mis au repos et
 * on passe au suivant — le joueur ne voit rien, comme pour un quota.
 */
export class ErreurModeleIA extends Error {
  override name = 'ErreurModeleIA';
}

/**
 * Une erreur d'IA doit-elle rester invisible ? Quota, clé, réseau : oui, dans
 * tous ces cas le jeu a déjà un contenu de secours et le joueur n'a rien à
 * faire. Seule une vraie anomalie mérite un message.
 */
export function erreurSilencieuse(cause: unknown): boolean {
  if (cause instanceof ErreurQuotaIA || cause instanceof ErreurCleIA) return true;
  // Un modèle retiré du catalogue est une panne de NOTRE côté, pas de celui du
  // joueur : il a déjà son contenu pré-écrit, on ne lui parle de rien.
  if (cause instanceof ErreurModeleIA) return true;
  const message = cause instanceof Error ? cause.message : String(cause ?? '');
  return /quota|rate.?limit|429|401|403|failed to fetch|networkerror|load failed|abort/i.test(message);
}

// ---------------------------------------------------------------------------
// LE QUOTA — le lire, le retenir, l'oublier au bon moment
// ---------------------------------------------------------------------------

const ATTENTE_PAR_DEFAUT = 90_000;
const ATTENTE_MAX = 60 * 60_000;

/**
 * Groq dit quand revenir, mais de trois façons différentes : l'en-tête
 * `retry-after` (secondes), les en-têtes `x-ratelimit-reset-*` (« 7m32.6s »),
 * ou en toutes lettres dans le message d'erreur. On lit les trois.
 */
export function delaiDeReprise(entetes: Headers | null, corps: string): number {
  const secondes = Number(entetes?.get('retry-after') ?? '');
  if (Number.isFinite(secondes) && secondes > 0) return Math.min(ATTENTE_MAX, secondes * 1000);

  const candidats = [
    entetes?.get('x-ratelimit-reset-requests'),
    entetes?.get('x-ratelimit-reset-tokens'),
    /try again in ([0-9hms.]+)/i.exec(corps)?.[1],
  ].filter(Boolean) as string[];

  for (const brut of candidats) {
    const ms = dureeEnMs(brut);
    if (ms > 0) return Math.min(ATTENTE_MAX, ms);
  }
  return ATTENTE_PAR_DEFAUT;
}

/** « 7m32.6s », « 2h », « 850ms », « 45 » → millisecondes. */
export function dureeEnMs(brut: string): number {
  const texte = brut.trim().toLowerCase();
  if (/^\d+(\.\d+)?$/.test(texte)) return Number(texte) * 1000;
  let total = 0;
  let trouve = false;
  // ⚠️ « ms » AVANT « m », sinon `850ms` se lit « 850 minutes ».
  for (const [regex, facteur] of [
    [/(\d+(?:\.\d+)?)\s*ms/g, 1],
    [/(\d+(?:\.\d+)?)\s*h/g, 3_600_000],
    [/(\d+(?:\.\d+)?)\s*m(?!s)/g, 60_000],
    [/(\d+(?:\.\d+)?)\s*s/g, 1000],
  ] as [RegExp, number][]) {
    for (const m of texte.matchAll(regex)) {
      total += Number(m[1]) * facteur;
      trouve = true;
    }
  }
  return trouve ? total : 0;
}

function bloquer(modele: string, duree: number): void {
  blocages.set(modele, Date.now() + duree);
  publier();
}

// ---------------------------------------------------------------------------
// L'ACTIVITÉ, MESURÉE (⚙️ Réglages)
// ---------------------------------------------------------------------------

export interface ActiviteIA {
  appels: number;
  entree: number;  // tokens de prompt
  sortie: number;  // tokens générés
  replis: number;  // appels retombés sur le contenu pré-écrit
}

const activite: ActiviteIA = { appels: 0, entree: 0, sortie: 0, replis: 0 };

export function activiteIA(): ActiviteIA {
  return { ...activite };
}

export function reinitialiserActiviteIA(): void {
  activite.appels = 0;
  activite.entree = 0;
  activite.sortie = 0;
  activite.replis = 0;
}

// ---------------------------------------------------------------------------
// L'APPEL
// ---------------------------------------------------------------------------

export interface MessageIA {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Les prompts du jeu sont découpés (règles, fiche du joueur, contexte…). On
 * fusionne les messages `system` en tête : c'est ce qu'attendent les modèles
 * instruct, et ça évite de payer plusieurs en-têtes de rôle.
 */
export function normaliserMessagesIA(messages: MessageIA[]): MessageIA[] {
  const systeme = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join('\n\n');
  const conversation = messages.filter((message) => message.role !== 'system');
  return systeme ? [{ role: 'system', content: systeme }, ...conversation] : conversation;
}

export interface OptionsAppelIA {
  temperature?: number;
  maxTokens?: number;
  /** Le modèle doit rendre du JSON (tous les appels du jeu, sauf exception). */
  json?: boolean;
  /** Délai maximal accordé à Groq. Au-delà, on retombe sur le pré-écrit. */
  timeout?: number;
}

// Un appel qui traîne bloque une semaine de jeu : mieux vaut le contenu
// pré-écrit tout de suite qu'une phrase sur mesure dans quinze secondes.
const TIMEOUT_DEFAUT = 12_000;

/**
 * ⚠️ POINT D'ENTRÉE UNIQUE de toute l'IA du jeu (MJ, situations, L'Ovale,
 * coaching). Il rend TOUJOURS du texte, ou lève — et l'appelant a toujours un
 * contenu de secours.
 */
export async function appelIAJSON(
  messages: MessageIA[],
  options: OptionsAppelIA = {},
): Promise<string> {
  const cle = cleGroq();
  if (!cle) throw new ErreurCleIA(t('ia.sansCle'));
  if (cleRefusee) throw new ErreurCleIA(t('ia.cleRefusee'));

  const corps = {
    messages: normaliserMessagesIA(messages),
    temperature: Math.min(1.2, Math.max(0.1, options.temperature ?? 0.72)),
    top_p: 0.9,
    // ⚠️ LES MODÈLES QUI RAISONNENT CONSOMMENT CE BUDGET AVANT D'ÉCRIRE. Chez
    // gpt-oss, les jetons de réflexion sont décomptés de `max_tokens` comme les
    // autres : au plafond d'origine (360), le JSON attendu se faisait couper
    // net. On garde donc une marge — `reasoning_effort: 'low'` plus bas limite
    // de toute façon la réflexion à quelques dizaines de jetons.
    max_tokens: Math.min(2000, (options.maxTokens ?? 360) + 260),
    ...(options.json === false ? {} : { response_format: { type: 'json_object' as const } }),
  };

  // On descend la liste des modèles : le premier qui répond gagne. Un modèle
  // bloqué est sauté sans même tenter la requête.
  let derniere: unknown = new ErreurQuotaIA(t('ia.quota'));
  for (const modele of MODELES_GROQ) {
    if ((blocages.get(modele) ?? 0) > Date.now()) continue;
    try {
      return await appelUnique(cle, modele, corps, options.timeout ?? TIMEOUT_DEFAUT);
    } catch (cause) {
      derniere = cause;
      if (cause instanceof ErreurCleIA) break;      // inutile d'essayer les autres
      if (cause instanceof ErreurQuotaIA) continue; // le modèle suivant, peut-être
      // ⚠️ UN MODÈLE RETIRÉ DU CATALOGUE NE DOIT PAS COUPER L'IA. C'est
      // exactement ce qui vient d'arriver avec Llama : Groq répondait 404, la
      // boucle sortait sur son `break` « panne réseau », et le jeu tournait
      // sans MJ sans que personne ne puisse s'en apercevoir. On passe au
      // suivant — `appelUnique` a déjà mis le disparu au repos.
      if (cause instanceof ErreurModeleIA) continue;
      break; // panne réseau ou réponse illisible : on ne martèle pas l'API
    }
  }
  activite.replis += 1;
  throw derniere;
}

/**
 * L'effort de réflexion, quand le modèle en accepte un.
 *
 * ⚠️ ON NE L'ENVOIE QU'AUX MODÈLES QUI LE DOCUMENTENT : Groq refuse (400) un
 * paramètre inconnu, et un réglage envoyé « au cas où » couperait le modèle
 * qu'il est censé économiser. `low` est le réglage le moins cher de gpt-oss —
 * juste ce qu'il faut pour un JSON de quinze lignes, et deux fois moins de
 * jetons de sortie facturés.
 */
function effortDeReflexion(modele: string): Record<string, string> {
  return modele.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {};
}

async function appelUnique(
  cle: string,
  modele: string,
  corps: Record<string, unknown>,
  timeout: number,
): Promise<string> {
  const arret = new AbortController();
  const minuterie = setTimeout(() => arret.abort(), timeout);
  let reponse: Response;
  try {
    reponse = await fetch(URL_GROQ, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cle}`,
      },
      body: JSON.stringify({ ...corps, ...effortDeReflexion(modele), model: modele }),
      signal: arret.signal,
    });
  } catch (cause) {
    throw new Error(`Groq injoignable : ${(cause as Error)?.message ?? 'réseau'}`);
  } finally {
    clearTimeout(minuterie);
  }

  if (!reponse.ok) {
    const texte = await reponse.text().catch(() => '');
    // ⚠️ 429 = QUOTA. C'est le cas que le joueur ne doit JAMAIS voir : on note
    // l'heure de reprise du modèle et on laisse l'appelant retomber sur son
    // contenu pré-écrit, sans un mot.
    if (reponse.status === 429) {
      bloquer(modele, delaiDeReprise(reponse.headers, texte));
      throw new ErreurQuotaIA(t('ia.quota'));
    }
    // Une clé absente, révoquée ou sans droits : inutile de retenter tant
    // qu'elle n'a pas changé.
    if (reponse.status === 401 || reponse.status === 403) {
      cleRefusee = true;
      publier();
      throw new ErreurCleIA(t('ia.cleRefusee'));
    }
    // 5xx : Groq est en panne, on met le modèle au repos quelques minutes.
    if (reponse.status >= 500) {
      bloquer(modele, 3 * 60_000);
      throw new ErreurQuotaIA(t('ia.quota'));
    }
    // ⚠️ MODÈLE INCONNU OU RETIRÉ (404 `model_not_found`, 400
    // `model_decommissioned`) : c'est ce qui a tué Llama. On le met au repos
    // pour la session — le rappeler ne servirait à rien, il ne reviendra pas —
    // et l'appelant passe au modèle suivant.
    if (modeleDisparu(reponse.status, texte)) {
      bloquer(modele, 12 * 60 * 60_000);
      throw new ErreurModeleIA(`Groq : modèle ${modele} indisponible`);
    }
    throw new Error(`Groq ${reponse.status} : ${texte.slice(0, 200)}`);
  }

  const donnees = await reponse.json() as {
    choices?: { message?: { content?: string; reasoning?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  activite.appels += 1;
  activite.entree += donnees.usage?.prompt_tokens ?? 0;
  activite.sortie += donnees.usage?.completion_tokens ?? 0;
  const message = donnees.choices?.[0]?.message;
  const contenu = message?.content;
  if (typeof contenu === 'string' && contenu.trim()) return contenu;
  // ⚠️ REPÊCHAGE DES MODÈLES QUI RAISONNENT. Quand la réflexion consomme tout
  // le budget de jetons, gpt-oss rend un `content` vide et laisse le début du
  // travail dans `reasoning`. Le JSON y est parfois complet : `lib/mj.ts` sait
  // extraire un objet noyé dans du texte, autant lui donner sa chance plutôt
  // que de retomber sur le contenu pré-écrit.
  const reflexion = message?.reasoning;
  return typeof reflexion === 'string' && reflexion.includes('{') ? reflexion : '{}';
}

/** Groq ne connaît pas (ou plus) ce modèle : inutile de le rappeler. */
function modeleDisparu(statut: number, corps: string): boolean {
  if (statut !== 400 && statut !== 404) return false;
  return /model_not_found|model_decommissioned|does not exist|has been decommissioned|no longer supported/i.test(corps);
}
