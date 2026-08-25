// LES LANGUES DU JEU
//
// Destiny Rugby a été écrit en français, de bout en bout : l'interface, les
// données, les prompts du Maître du Jeu. L'ouvrir à d'autres langues demandait
// donc un socle, pas un remplacement — d'où ce module.
//
// ⚠️ TROIS PRINCIPES, ET ILS EXPLIQUENT TOUT LE RESTE
//
// 1. **Le français reste la source.** Chaque texte est identifié par une clé,
//    et la traduction française est OBLIGATOIRE (le type l'impose). Une langue
//    à laquelle il manque une clé retombe sur le français : jamais de trou,
//    jamais de « missing.translation.key » à l'écran.
// 2. **Le contenu écrit par l'IA n'est pas ici.** Le Maître du Jeu, les
//    situations et L'Ovale sont générés à l'exécution : on ne les traduit pas,
//    on demande au modèle d'écrire directement dans la bonne langue
//    (`consigneDeLangue`, utilisée par lib/iaLocale.ts et lib/iaSociale.ts).
//    C'est ce qui rend le jeu *réellement* multilingue plutôt que « traduit ».
// 3. **Aucune dépendance.** Pas de i18next : 40 lignes suffisent, et la
//    bibliothèque pèserait plus lourd que tous les textes réunis.

export const LANGUES = [
  { id: 'fr', nom: 'Français', drapeau: 'fr', enAnglais: 'French' },
  { id: 'en', nom: 'English', drapeau: 'gb', enAnglais: 'English' },
  { id: 'es', nom: 'Español', drapeau: 'es', enAnglais: 'Spanish' },
  { id: 'it', nom: 'Italiano', drapeau: 'it', enAnglais: 'Italian' },
  { id: 'de', nom: 'Deutsch', drapeau: 'de', enAnglais: 'German' },
  { id: 'pt', nom: 'Português', drapeau: 'pt', enAnglais: 'Portuguese' },
  { id: 'ja', nom: '日本語', drapeau: 'jp', enAnglais: 'Japanese' },
] as const;

export type Langue = (typeof LANGUES)[number]['id'];

export const LANGUE_DEFAUT: Langue = 'fr';

// La langue du navigateur reste le repli hors ligne et en développement. En
// production, le pays associé à l'adresse IP passe d'abord par `/api/langue` :
// un navigateur configuré en anglais n'impose donc plus l'anglais à quelqu'un
// qui arrive depuis un pays francophone.
/**
 * ⚠️ LE REPLI SE PASSE EN PARAMÈTRE, IL N'EST PAS LU ICI. Sur notre site il
 * vaut le français ; sur un portail de jeux il DOIT valoir l'anglais (« if not
 * available/set fallback to English »). On serait tenté d'importer `lib/cible`
 * pour trancher — c'est justement ce qu'il ne faut pas faire : ce module est
 * aussi importé par `api/langue.ts`, une fonction serverless où
 * `import.meta.env` n'existe pas et ferait échouer l'import entier. Le module
 * reste donc lisible des DEUX côtés, et c'est l'appelant qui sait où il est.
 */
export function langueDuNavigateur(repli: Langue = LANGUE_DEFAUT): Langue {
  if (typeof navigator === 'undefined') return repli;
  for (const brut of navigator.languages ?? [navigator.language]) {
    const court = String(brut).slice(0, 2).toLowerCase();
    const connue = LANGUES.find((l) => l.id === court);
    if (connue) return connue.id;
  }
  return repli;
}

/** Pays dont la langue du jeu ne prête pas à ambiguïté. */
const PAYS_PAR_LANGUE: Readonly<Record<Exclude<Langue, 'en'>, readonly string[]>> = {
  fr: [
    'FR', 'MC', 'SN', 'CI', 'ML', 'BF', 'NE', 'BJ', 'TG', 'GN', 'CD', 'CG',
    'GA', 'TD', 'CF', 'DJ', 'MG', 'KM', 'HT', 'DZ', 'MA', 'TN', 'RE', 'GP',
    'MQ', 'GF', 'PF', 'NC', 'PM', 'WF',
  ],
  es: [
    'ES', 'MX', 'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GT',
    'HN', 'NI', 'PA', 'PY', 'PE', 'PR', 'UY', 'VE', 'GQ', 'AD',
  ],
  it: ['IT', 'SM', 'VA'],
  de: ['DE', 'AT', 'LI'],
  pt: ['PT', 'BR', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL', 'MO'],
  ja: ['JP'],
};

/**
 * Les pays où l'IP seule ne peut pas deviner la langue de la personne.
 * L'ordre donne le repli local ; `Accept-Language` départage quand il désigne
 * une des langues du jeu réellement utilisée dans ce pays.
 */
const PAYS_MULTILINGUES: Readonly<Record<string, readonly Langue[]>> = {
  BE: ['fr', 'de'],
  CA: ['en', 'fr'],
  CH: ['de', 'fr', 'it'],
  CM: ['fr', 'en'],
  BI: ['fr', 'en'],
  LB: ['fr', 'en'],
  LU: ['fr', 'de'],
  MU: ['fr', 'en'],
  RW: ['en', 'fr'],
  SC: ['en', 'fr'],
  VU: ['fr', 'en'],
};

function langueDesPreferences(preferences: readonly string[], permises?: readonly Langue[]): Langue | null {
  for (const preference of preferences) {
    const id = String(preference).trim().slice(0, 2).toLowerCase() as Langue;
    if (LANGUES.some((langue) => langue.id === id) && (!permises || permises.includes(id))) return id;
  }
  return null;
}

/**
 * Langue à servir pour un code pays ISO à deux lettres.
 *
 * - l'adresse IP décide du pays ;
 * - la préférence du navigateur ne sert qu'aux pays multilingues ;
 * - un pays dont la langue n'est pas encore traduite reçoit l'anglais ;
 * - sans pays (développement/hors ligne), on conserve le repli navigateur.
 */
export function langueDuPays(pays: string | null | undefined, preferences: readonly string[] = []): Langue {
  const code = String(pays ?? '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return langueDesPreferences(preferences) ?? LANGUE_DEFAUT;

  const multilingue = PAYS_MULTILINGUES[code];
  if (multilingue) return langueDesPreferences(preferences, multilingue) ?? multilingue[0];

  for (const [langue, paysDeLaLangue] of Object.entries(PAYS_PAR_LANGUE) as [Exclude<Langue, 'en'>, readonly string[]][]) {
    if (paysDeLaLangue.includes(code)) return langue;
  }
  return 'en';
}

let detectionIP: Promise<Langue | null> | null = null;

/**
 * Demande au serveur la langue déduite du pays de l'IP. Une seule requête est
 * faite par chargement, même sous React StrictMode. L'échec est silencieux :
 * la langue du navigateur déjà affichée reste alors en place.
 */
export function langueDepuisAdresseIP(): Promise<Langue | null> {
  detectionIP ??= fetch('/api/langue', { headers: { Accept: 'application/json' } })
    .then(async (reponse) => {
      if (!reponse.ok) return null;
      const corps = await reponse.json() as { langue?: unknown };
      const langue = String(corps.langue ?? '') as Langue;
      return LANGUES.some((candidate) => candidate.id === langue) ? langue : null;
    })
    .catch(() => null);
  return detectionIP;
}

// ⚠️ Le français est requis, les autres sont facultatives : on peut donc
// ajouter une clé sans traduire les sept langues d'un coup, sans rien casser.
export type Traduction = { fr: string } & Partial<Record<Langue, string>>;

// La langue courante vit dans un module, pas dans React : `t()` est appelée
// depuis des fonctions pures (formatage de dates, libellés de postes) qui n'ont
// pas de hook. Le store la synchronise à chaque changement.
let courante: Langue = LANGUE_DEFAUT;

export function langueCourante(): Langue {
  return courante;
}

export function definirLangue(l: Langue): void {
  courante = l;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = l;
  }
}

// Le dictionnaire, alimenté par `src/data/textes.ts`.
let dictionnaire: Record<string, Traduction> = {};

export function chargerTextes(textes: Record<string, Traduction>): void {
  dictionnaire = textes;
}

/**
 * Traduit une clé. Les variables se notent `{nom}` dans le texte.
 *
 *   t('nav.carriere')                        → « Carrière »
 *   t('bilan.matchs', { n: 12 })             → « 12 matchs joués »
 *
 * ⚠️ Une clé inconnue renvoie la clé elle-même : à l'écran, ça saute aux yeux
 * en développement, et ça reste lisible en production plutôt que d'être vide.
 */
export function t(cle: string, vars?: Record<string, string | number>): string {
  const entree = dictionnaire[cle];
  if (!entree) return cle;
  let texte = entree[courante] ?? entree.fr;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      texte = texte.split(`{${k}}`).join(String(v));
    }
  }
  return texte;
}

/** Le pluriel, à la française : 0 et 1 au singulier, le reste au pluriel. */
export function tn(cle: string, n: number, vars?: Record<string, string | number>): string {
  const pluriel = new Intl.PluralRules(locale()).select(n) !== 'one';
  return t(pluriel ? `${cle}.pluriel` : cle, { ...vars, n });
}

// ---------------------------------------------------------------------------
// LES NOMBRES
// ---------------------------------------------------------------------------
// ⚠️ Le jeu écrivait `toLocaleString('fr-FR')` PARTOUT : un joueur anglais lisait
// « 1 200 000 € » avec des espaces insécables là où il attend « 1,200,000 », et
// un Allemand « 1.200.000 ». C'est le genre de détail qui trahit une traduction
// posée par-dessus un jeu français.
const LOCALES: Record<Langue, string> = {
  fr: 'fr-FR', en: 'en-GB', es: 'es-ES', it: 'it-IT',
  de: 'de-DE', pt: 'pt-PT', ja: 'ja-JP',
};

export function locale(l: Langue = courante): string {
  return LOCALES[l] ?? LOCALES.fr;
}

/** Un nombre dans la langue du joueur : `nombre(1200000)` → « 1 200 000 ». */
export function nombre(n: number): string {
  return n.toLocaleString(locale());
}

// ---------------------------------------------------------------------------
// LA LANGUE DE L'IA
// ---------------------------------------------------------------------------
// ⚠️ C'est LA pièce qui rend le jeu multilingue pour de bon. Traduire les
// boutons ne sert à rien si le Maître du Jeu, les situations, les tweets et les
// messages privés — c'est-à-dire 90 % de ce qu'on lit — restent en français.
// Cette consigne est ajoutée en tête de CHAQUE prompt (lib/iaLocale.ts,
// lib/ia.ts, lib/iaSociale.ts, lib/moteur/consignes.ts).
//
// Elle est écrite en anglais : c'est la langue dans laquelle les modèles
// suivent le mieux une instruction de langue, y compris pour écrire en japonais.
export function consigneDeLangue(l: Langue = courante): string {
  const langue = LANGUES.find((x) => x.id === l) ?? LANGUES[0];
  if (l === 'fr') return '';
  return `\n\nIMPORTANT : LANGUAGE: write EVERY piece of text you output in `
    + `${langue.enAnglais} (${langue.nom}), and nothing else. This includes the `
    + `narrative, the event titles, the choices, the tweets and the replies. `
    + `Keep club names, competition names and player names EXACTLY as given : `
    + `they are proper nouns and must never be translated. The JSON keys stay in `
    + `English/French as specified in the format above.`;
}
