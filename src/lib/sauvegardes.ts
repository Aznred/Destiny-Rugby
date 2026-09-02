// ═══════════════════════════════════════════════════════════════════════════
// LES EMPLACEMENTS DE SAUVEGARDE — plusieurs carrières sur le même appareil
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « faire en sorte de pouvoir avoir plusieurs sauvegardes de joueurs
// et entraîneur ».
//
// ⚠️ LE JEU N'AVAIT QU'UNE SEULE PARTIE, ET C'ÉTAIT STRUCTUREL. `useGame` est
// persisté sous la clé `destin-ovalie`, une et une seule ; créer une carrière
// écrasait la précédente sans un mot. Pire : `creerManager` met `joueur` à null
// et `creerJoueur` met `manager` à null — les deux modes se chassent l'un
// l'autre, donc essayer le mode entraîneur coûtait sa carrière de joueur.
//
// ⚠️ ON NE TOUCHE PAS À L'ÉTAT DU JEU, ON DÉTOURNE SON STOCKAGE. C'est le seul
// choix qui ne demande aucune réécriture du store (362 000 lignes) et qui ne
// peut donc rien casser : `persist` écrit sous un nom fixe, et l'adaptateur de
// stockage redirige ce nom vers l'emplacement ACTIF. Le store ne sait même pas
// que les emplacements existent.
//
// ⚠️ L'EMPLACEMENT 1 GARDE LA CLÉ HISTORIQUE, sans quoi tout le monde perdrait
// sa partie au premier chargement de cette version. `destin-ovalie` reste
// `destin-ovalie` ; seuls les emplacements 2 à 6 prennent un suffixe.
//
// ⚠️ ET L'INDEX N'EST PAS PERSISTÉ, IL EST LU. `persist` écrit à CHAQUE
// changement d'état — plusieurs fois par seconde pendant un match. Tenir un
// index à jour obligerait à analyser le JSON de la partie à chaque écriture,
// c'est-à-dire à doubler le coût de la sauvegarde pour une information qu'on ne
// regarde qu'en ouvrant l'écran des parties. On lit donc les six emplacements
// au moment de les afficher, et c'est tout.

/** La clé du store. Elle ne change jamais : c'est celle que `persist` écrit. */
export const CLE_JEU = 'destin-ovalie';

/** Où l'on note l'emplacement actif. Hors des parties : ce n'est pas du jeu. */
const CLE_ACTIF = 'destin-ovalie:emplacement';

/**
 * ⚠️ SIX, ET PAS PLUS. Une sauvegarde complète pèse quelques centaines de
 * kilo-octets (le journal, les publications de L'Ovale, les statistiques
 * réelles d'une saison) et `localStorage` plafonne autour de 5 Mo par origine.
 * Le jeu a DÉJÀ payé ce mur une fois — la migration « anti quota exceeded » qui
 * ne garde que la saison en cours des feuilles de match. Douze emplacements le
 * repaieraient, et cette fois en effaçant des carrières.
 */
export const NB_EMPLACEMENTS = 6;

export type TypeCarriere = 'joueur' | 'entraineur' | 'vide';

export interface Emplacement {
  /** 1 à NB_EMPLACEMENTS. */
  id: number;
  type: TypeCarriere;
  /** Le nom du personnage, ou une chaîne vide pour un emplacement libre. */
  nom: string;
  /** Club · division, quand il y en a un. */
  sous: string;
  saison: number;
  /** La note générale d'un joueur, le prestige d'un entraîneur. */
  valeur: number;
  actif: boolean;
}

/** Le minimum dont ce fichier a besoin. Un `Storage` complet en fait plus. */
type Acces = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * ⚠️ LE REPLI MÉMOIRE EST AU NIVEAU DU MODULE, ET C'EST INDISPENSABLE. Les
 * scripts de vérification et le rendu serveur n'ont pas de `localStorage` :
 * si chaque appelant fabriquait sa propre mémoire, l'adaptateur du store
 * écrirait dans une carte et `listerEmplacements` lirait dans une autre — la
 * partie « existerait » sans jamais apparaître dans la liste. C'est exactement
 * ce que le banc d'essai a attrapé à sa première exécution.
 */
const memoire = new Map<string, string>();
const repliMemoire: Acces = {
  getItem: (nom) => memoire.get(nom) ?? null,
  setItem: (nom, valeur) => { memoire.set(nom, valeur); },
  removeItem: (nom) => { memoire.delete(nom); },
};

function stockage(): Acces {
  try {
    if (typeof localStorage === 'undefined') return repliMemoire;
    return localStorage;
  } catch {
    // Navigateur en mode privé strict, ou stockage refusé par une politique.
    return repliMemoire;
  }
}

/** La clé de stockage d'un emplacement. Le 1 garde le nom historique. */
export function cleDe(id: number): string {
  return id <= 1 ? CLE_JEU : `${CLE_JEU}:s${id}`;
}

export function emplacementActif(): number {
  const brut = stockage().getItem(CLE_ACTIF);
  const n = Number(brut);
  return Number.isInteger(n) && n >= 1 && n <= NB_EMPLACEMENTS ? n : 1;
}

function poserActif(id: number): void {
  try { stockage().setItem(CLE_ACTIF, String(id)); } catch { /* stockage plein */ }
}

// ---------------------------------------------------------------------------
// L'ADAPTATEUR DE STOCKAGE
// ---------------------------------------------------------------------------

/**
 * Le `Storage` que reçoit `persist` : il fait suivre chaque lecture et chaque
 * écriture vers l'emplacement actif.
 *
 * ⚠️ IL NE DOIT REDIRIGER QUE LA CLÉ DU JEU. Un adaptateur qui préfixerait
 * TOUTES les clés déplacerait aussi `destin-ovalie:emplacement` lui-même, et
 * l'emplacement actif deviendrait propre à chaque emplacement — un serpent qui
 * se mord la queue, et une partie qu'on ne retrouve plus.
 */
export function stockageParEmplacement(): Storage {
  // ⚠️ `stockage()` est appelé À CHAQUE OPÉRATION, pas capturé une fois. Un
  // navigateur peut refuser `localStorage` en cours de session (quota, mode
  // privé) : le capturer figerait le repli mémoire pour toute la partie.
  const cible = (nom: string) => (nom === CLE_JEU ? cleDe(emplacementActif()) : nom);

  return {
    get length() { return memoire.size; },
    key: () => null,
    clear: () => { memoire.clear(); },
    getItem: (nom: string) => stockage().getItem(cible(nom)),
    setItem: (nom: string, valeur: string) => stockage().setItem(cible(nom), valeur),
    removeItem: (nom: string) => stockage().removeItem(cible(nom)),
  } as Storage;
}

// ---------------------------------------------------------------------------
// CE QU'ON AFFICHE D'UN EMPLACEMENT
// ---------------------------------------------------------------------------

/**
 * ⚠️ CE FICHIER N'IMPORTE RIEN DU JEU, ET C'EST DÉLIBÉRÉ. Il est chargé par le
 * store lui-même (c'est lui qui fournit l'adaptateur de stockage) : lui faire
 * importer les données des clubs, les types du domaine ou un helper de note
 * créerait un cycle d'imports au démarrage — le genre de panne qui donne un
 * écran blanc et une `ReferenceError` illisible. On décrit donc à la main les
 * quelques champs qu'on lit, en les traitant tous comme facultatifs : une
 * sauvegarde d'une version antérieure n'a pas forcément les mêmes.
 */
type ResumeBrut = {
  state?: {
    joueur?: { nom?: string; club?: string; saison?: number;
      attributs?: Record<string, number> } | null;
    manager?: { nom?: string; club?: string; saison?: number;
      prestige?: number; divisionNom?: string } | null;
  };
};

/**
 * La générale d'un joueur.
 *
 * ⚠️ ELLE N'EST PAS STOCKÉE, ELLE SE CALCULE. `Joueur` ne porte pas de champ
 * `note` : c'est la moyenne de ses huit attributs (`noteGlobale`, dans le
 * store). La recopier ici est le prix à payer pour ne pas importer le store
 * depuis un fichier que le store importe — et la formule est une moyenne, elle
 * ne risque pas de diverger en silence.
 */
function generaleDe(attributs?: Record<string, number>): number {
  if (!attributs) return 0;
  const valeurs = Object.values(attributs).filter((v) => Number.isFinite(v));
  if (!valeurs.length) return 0;
  return Math.round(valeurs.reduce((s, v) => s + v, 0) / valeurs.length);
}

function lire(id: number): Emplacement {
  const vide: Emplacement = {
    id, type: 'vide', nom: '', sous: '', saison: 0, valeur: 0,
    actif: id === emplacementActif(),
  };
  const brut = stockage().getItem(cleDe(id));
  if (!brut) return vide;
  try {
    const donnees = JSON.parse(brut) as ResumeBrut;
    const j = donnees.state?.joueur;
    const m = donnees.state?.manager;
    // ⚠️ LE JOUEUR PASSE DEVANT L'ENTRAÎNEUR, et l'ordre compte : une carrière
    // issue d'une reconversion garde les deux champs le temps d'une transition.
    // C'est `joueur: null` que pose `creerManager` qui tranche vraiment.
    if (j?.nom) {
      return {
        ...vide,
        type: 'joueur',
        nom: j.nom,
        sous: j.club ?? '',
        saison: j.saison ?? 1,
        valeur: generaleDe(j.attributs),
      };
    }
    if (m?.nom) {
      return {
        ...vide,
        type: 'entraineur',
        nom: m.nom,
        sous: [m.club, m.divisionNom].filter(Boolean).join(' · '),
        saison: m.saison ?? 1,
        valeur: Math.round(m.prestige ?? 0),
      };
    }
    return vide;
  } catch {
    // Une sauvegarde illisible ne doit jamais empêcher d'ouvrir l'écran : on
    // l'affiche comme occupée sans nom, et on laisse la supprimer.
    return { ...vide, type: 'joueur', nom: '—' };
  }
}

export function listerEmplacements(): Emplacement[] {
  return Array.from({ length: NB_EMPLACEMENTS }, (_, i) => lire(i + 1));
}

export function premierLibre(): number | null {
  const libre = listerEmplacements().find((e) => e.type === 'vide');
  return libre?.id ?? null;
}

// ---------------------------------------------------------------------------
// CHANGER DE PARTIE
// ---------------------------------------------------------------------------

/**
 * ⚠️ ON RECHARGE LA PAGE, ET C'EST DÉLIBÉRÉ. `persist.rehydrate()` FUSIONNE
 * l'état lu par-dessus l'état courant : tout champ absent de la sauvegarde
 * visée garderait la valeur de la partie qu'on quitte — le journal de l'un, les
 * publications de l'autre, et des mélanges impossibles à diagnostiquer. Un
 * rechargement repart d'un état neuf, ne coûte rien (tout est déjà écrit sur
 * le disque) et ne peut pas se tromper.
 */
export function ouvrirEmplacement(id: number): void {
  if (id < 1 || id > NB_EMPLACEMENTS) return;
  poserActif(id);
  if (typeof window !== 'undefined') window.location.reload();
}

/** Supprime une partie. L'emplacement actif ne peut pas être supprimé ainsi. */
export function supprimerEmplacement(id: number): void {
  if (id < 1 || id > NB_EMPLACEMENTS) return;
  try { stockage().removeItem(cleDe(id)); } catch { /* rien à faire */ }
}

/**
 * Ouvre une partie neuve dans le premier emplacement libre.
 *
 * ⚠️ RENVOIE `null` QUAND TOUT EST PLEIN, et l'écran le DIT. Écraser
 * silencieusement le plus ancien serait la pire réponse possible : c'est
 * exactement le bug qu'on répare.
 */
export function nouvelleCarriere(): number | null {
  const libre = premierLibre();
  if (libre == null) return null;
  ouvrirEmplacement(libre);
  return libre;
}

// ═══════════════════════════════════════════════════════════════════════════
// CE QUI APPARTIENT À L'APPAREIL, PAS À LA CARRIÈRE
// ═══════════════════════════════════════════════════════════════════════════
// Bug signalé : « quand on switch de sauvegarde, ça nous remet le tuto ».
//
// ⚠️ ET LE TUTORIEL N'ÉTAIT QUE LE SYMPTÔME LE PLUS VISIBLE. `persist` écrit
// TOUT l'état dans l'emplacement actif : en ouvrant une autre partie, on
// repartait aussi avec la langue du navigateur, le thème vert, zéro Ova, une
// boutique vide, aucun succès et aucune légende au Hall. Or rien de tout ça
// n'appartient à une carrière — le projet le dit déjà lui-même pour les
// archétypes : « un archétype débloqué appartient au COMPTE, pas à la
// carrière : on ne rachète pas ses caractères à chaque fois qu'on raccroche ».
//
// ⚠️ CE QUI RESTE PAR CARRIÈRE, ET POURQUOI. `defis` suit la semaine de jeu ;
// `ecransVus` et `guideFerme` pilotent le guide, qui explique LA carrière en
// cours ; et surtout `cleClassement` — chaque carrière doit garder SA ligne au
// classement mondial. Partagée, six carrières se disputeraient une seule ligne
// et l'on n'en verrait qu'une (voir « DEUX JOUEURS, UN SEUL PSEUDO » dans
// CLAUDE.md, c'est le même piège dans l'autre sens).
//
// ⚠️ ET ON N'ANALYSE PAS LE GROS JSON À CHAQUE ÉCRITURE. `persist` sauvegarde
// plusieurs fois par seconde pendant un match : re-découper le blob de la
// partie à chaque fois doublerait le coût de la sauvegarde. Le compte est un
// petit objet écrit à part, et seulement quand l'une de ses clés a changé.

/** La clé du compte. Elle vit à côté des emplacements, jamais dedans. */
const CLE_COMPTE = 'destin-ovalie:compte';

/**
 * Les champs de l'état qui suivent l'APPAREIL et non la carrière.
 *
 * ⚠️ AJOUTER UNE CLÉ ICI, C'EST LA PARTAGER ENTRE TOUTES LES PARTIES. Avant
 * d'en ajouter une, se demander si deux carrières menées en parallèle doivent
 * vraiment la voir bouger ensemble : le classement mondial, lui, ne le doit
 * pas.
 */
export const CLES_COMPTE = [
  // Les réglages : personne ne rechoisit sa langue en changeant de partie.
  'theme', 'langue', 'langueManuelle',
  'iaActivee', 'groqKey', 'tenorKey', 'modele',
  'pubConsentement', 'pubs',
  // La boutique et ce qu'on a payé — en Ovas ou en temps.
  'coins', 'inventaire', 'skinActif', 'equipements', 'equipementActif',
  'traitsDebloques',
  // Le palmarès qui TRAVERSE les carrières, par construction.
  'succesDebloques', 'pantheon',
  // L'accueil et la manette ne s'expliquent qu'une fois.
  'tutoVu', 'tutoMatchVu',
] as const;

export type CleCompte = (typeof CLES_COMPTE)[number];

/** Ce que l'appareil a mémorisé, ou rien du tout au premier lancement. */
export function lireCompte(): Record<string, unknown> {
  const brut = stockage().getItem(CLE_COMPTE);
  if (!brut) return {};
  try {
    const donnees = JSON.parse(brut) as Record<string, unknown>;
    // On ne rend QUE les clés déclarées : un enregistrement d'une version
    // ultérieure ne doit pas réinjecter des champs qu'on ne connaît pas.
    const out: Record<string, unknown> = {};
    for (const cle of CLES_COMPTE) if (cle in donnees) out[cle] = donnees[cle];
    return out;
  } catch {
    return {};
  }
}

/**
 * Écrit le compte — et seulement s'il a changé.
 *
 * ⚠️ LA COMPARAISON EST FAITE SUR LE JSON SÉRIALISÉ, pas champ à champ :
 * `equipementActif` et `succesDebloques` sont des objets recréés à chaque
 * `set()` du store, une comparaison de références écrirait à chaque frappe.
 */
let dernierCompte = '';
export function ecrireCompte(etat: Record<string, unknown>): void {
  const extrait: Record<string, unknown> = {};
  for (const cle of CLES_COMPTE) if (etat[cle] !== undefined) extrait[cle] = etat[cle];
  const json = JSON.stringify(extrait);
  if (json === dernierCompte) return;
  dernierCompte = json;
  try { stockage().setItem(CLE_COMPTE, json); } catch { /* stockage plein */ }
}

/**
 * Le compte par-dessus la partie chargée.
 *
 * ⚠️ AU PREMIER LANCEMENT IL N'Y A RIEN À POSER, et c'est voulu : l'état de la
 * partie fait alors autorité, et le premier `ecrireCompte` le recopie dans le
 * compte. C'est ce qui fait qu'une sauvegarde d'avant cette version garde ses
 * Ovas, ses cosmétiques et son Hall au lieu de repartir de zéro.
 */
export function appliquerCompte<T extends Record<string, unknown>>(etat: T): T {
  const compte = lireCompte();
  return Object.keys(compte).length ? { ...etat, ...compte } : etat;
}
