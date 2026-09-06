// LES PACKS — et pourquoi ils ne sont PAS une machine à sous
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ CE QU'UN PACK N'EST PAS
// ═══════════════════════════════════════════════════════════════════════════
// « Je ferais zéro carte +15 complètement artificielle. Tu récupères de vrais
// joueurs du pool du jeu avec niveau, âge, potentiel, poste. »
//
// Donc : un pack ne FABRIQUE rien. Il ne fait que sortir du vivier de la ligue
// une carte qui y dormait déjà — celle-là même qu'un pote aurait pu obtenir.
// C'est toute la différence avec un jeu de cartes classique, et c'est ce qui
// rend un pack intéressant : ouvrir un pack, c'est retirer quelque chose du
// stock commun.
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ CE QUI RÉGULE LES PACKS : LE VIVIER QUI SE VIDE, PAS LE PRIX
// ═══════════════════════════════════════════════════════════════════════════
// Le pack standard garantit une carte « rare » (75-82) pour 5 000 OVA, alors
// qu'une carte de cette bande vaut 14 000 à 42 000 OVA au barème
// (`valeur.ts`). Pris isolément, c'est intenable : le pack serait toujours la
// meilleure affaire de la ligue et le marché ne servirait à rien.
//
// Ce qui l'empêche, c'est que le vivier est FINI. À dix clubs, il contient 45
// cartes entre 75 et 79 et 10 entre 80 et 82 ; la dotation en distribue déjà 30.
// Il reste donc une vingtaine de « rares » libres pour toute la ligue. Les
// premiers packs de la saison sont effectivement de très bonnes affaires — et
// c'est bien : ça déclenche la ruée du début. Puis la bande se vide, la
// garantie se dégrade d'un cran (`degradations` ci-dessous le dit franchement),
// et le marché entre potes devient le seul endroit où trouver un 78.
//
// ⚠️ C'EST DONC UN ÉQUILIBRE À MESURER, PAS À SUPPOSER.
// `npm run verify:ligue` ouvre des packs jusqu'à épuisement et affiche à quelle
// journée la bande « rare » se tarit. Si ce chiffre te déplaît, le levier est
// `PYRAMIDE` (vivier.ts) ou le prix ci-dessous — dans cet ordre.

import type { FamillePoste } from '../../types.js';
import type { CarteJoueur, Rarete } from './types.js';
import { rangRarete, rareteDeLaNote } from './rarete.js';
import { tirerPondere } from './aleatoire.js';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LE CATALOGUE
// ═══════════════════════════════════════════════════════════════════════════

const AVANTS: FamillePoste[] = ['pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne'];
const TROIS_QUARTS: FamillePoste[] = ['demi_melee', 'demi_ouverture', 'centre', 'ailier', 'arriere'];

/** Ce qu'une place du pack exige. Une place sans exigence est « aléatoire ». */
export interface PlacePack {
  /** Rareté minimale garantie. */
  rareteMin?: Rarete;
  /** Rareté maximale — c'est ce qui fait les « communes » du pack standard. */
  rareteMax?: Rarete;
  /** Note minimale garantie. */
  noteMin?: number;
}

export interface TypePack {
  id: string;
  /** Clé i18n du nom. */
  cle: string;
  prix: number;
  places: PlacePack[];
  /** Restriction de poste appliquée à TOUTES les places. */
  familles?: FamillePoste[];
  /** Âge maximal appliqué à toutes les places. */
  ageMax?: number;
}

/**
 * ⚠️ LES PRIX DES PACKS AVANTS ET TROIS-QUARTS NE VENAIENT PAS DE LA DEMANDE
 * (elle les nommait sans les chiffrer). 6 000 : un peu plus que le standard,
 * parce qu'on choisit la moitié du terrain — c'est-à-dire qu'on transforme un
 * tirage en recrutement ciblé — et nettement moins que le premium, parce que
 * la restriction ne dit rien du NIVEAU. À retoucher librement.
 */
export const PACKS: readonly TypePack[] = [
  {
    id: 'standard',
    cle: 'ligue.pack.standard',
    prix: 1,
    places: [
      { rareteMax: 'commun' },
      { rareteMax: 'commun' },
      { rareteMax: 'commun' },
      { rareteMin: 'rare' },
      {},
    ],
  },
  {
    id: 'premium',
    cle: 'ligue.pack.premium',
    prix: 1,
    places: [{ noteMin: 72 }, { noteMin: 72 }, { noteMin: 72 }, { noteMin: 72 }, { noteMin: 72 }],
  },
  {
    id: 'espoir',
    cle: 'ligue.pack.espoir',
    prix: 1,
    ageMax: 22,
    places: [{}, {}, {}, {}, {}],
  },
  {
    id: 'avants',
    cle: 'ligue.pack.avants',
    prix: 1,
    familles: AVANTS,
    places: [{}, {}, {}, {}, {}],
  },
  {
    id: 'troisQuarts',
    cle: 'ligue.pack.troisQuarts',
    prix: 1,
    familles: TROIS_QUARTS,
    places: [{}, {}, {}, {}, {}],
  },
] as const;

export function packParId(id: string): TypePack | undefined {
  return PACKS.find((p) => p.id === id);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LE TIRAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Poids relatif de chaque rareté dans une place SANS exigence.
 *
 * ⚠️ SANS CETTE PONDÉRATION, UNE PLACE LIBRE TIRERAIT À PLAT dans le vivier —
 * et comme le vivier compte proportionnellement peu de stars, on croirait que
 * ça revient au même. Ce n'est pas le cas : au fil de la saison la dotation et
 * les packs vident d'abord le bas du vivier (il est plus nombreux, donc plus
 * souvent tiré), et la proportion de stars parmi les cartes libres MONTE. En
 * fin de saison, un tirage à plat sortirait surtout du haut de tableau. La
 * pondération garde une place « aléatoire » majoritairement modeste, du premier
 * au dernier pack.
 */
const POIDS_RARETE: Record<Rarete, number> = {
  commun: 100,
  confirme: 42,
  rare: 7,
  elite: 1.4,
  mondial: 0.35,
};

export interface CartePackee {
  carte: CarteJoueur;
  /** La place avait une garantie qu'on n'a pas pu tenir : le vivier est sec. */
  degradee: boolean;
}

export interface ResultatPack {
  cartes: CartePackee[];
  /**
   * Places dont la garantie a été dégradée. Vide, en général.
   * ⚠️ À REMONTER À L'ÉCRAN, pas à cacher : un pack « premium » qui sort un 68
   * sans explication passe pour une arnaque. Avec la phrase « il ne reste plus
   * aucun joueur à 72 ou plus dans la ligue », c'est une information de jeu —
   * et même une bonne : elle dit que le vivier est épuisé, donc que le marché
   * est désormais le seul endroit où trouver mieux.
   */
  degradations: number;
}

/**
 * Ouvre un pack dans un vivier donné.
 *
 * ⚠️ CETTE FONCTION NE DÉBITE RIEN ET N'ÉCRIT RIEN. Elle tire, c'est tout. Le
 * débit, le verrouillage des cartes et l'écriture au journal sont le travail du
 * serveur, DANS UNE SEULE TRANSACTION : sans ça, une coupure réseau entre le
 * tirage et le débit offre un pack gratuit — et deux appels simultanés en
 * offrent deux pour le prix d'un.
 *
 * @param libres les cartes sans propriétaire (voir `cartesLibres`)
 * @param rng    le tirage, fourni par l'appelant pour rester reproductible
 */
export function ouvrirPack(
  type: TypePack,
  libres: readonly CarteJoueur[],
  rng: () => number,
): ResultatPack {
  const restantes = libres.slice();
  const cartes: CartePackee[] = [];
  let degradations = 0;

  // ⚠️ LES PLACES EXIGEANTES D'ABORD. Servir dans l'ordre du tableau ferait
  // consommer les dernières cartes rares par une place « aléatoire », et la
  // garantie du pack standard tomberait alors qu'il restait de quoi la tenir.
  const ordre = type.places
    .map((place, index) => ({ place, index }))
    .sort((a, b) => exigence(b.place) - exigence(a.place));

  const parIndex = new Map<number, CartePackee>();
  for (const { place, index } of ordre) {
    const tirage = tirerUnePlace(type, place, restantes, rng);
    if (!tirage) continue; // vivier totalement vide : le serveur refusera la vente
    if (tirage.degradee) degradations++;
    parIndex.set(index, tirage);
    const position = restantes.findIndex((c) => c.id === tirage.carte.id);
    if (position >= 0) restantes.splice(position, 1);
  }
  // On restitue l'ordre du tableau : c'est celui de l'ouverture à l'écran, et
  // la place garantie doit rester à sa place (l'avant-dernière, le suspense).
  for (let i = 0; i < type.places.length; i++) {
    const c = parIndex.get(i);
    if (c) cartes.push(c);
  }
  return { cartes, degradations };
}

/** Plus le nombre est haut, plus la place est difficile à servir. */
function exigence(place: PlacePack): number {
  if (place.noteMin !== undefined) return 100 + place.noteMin;
  if (place.rareteMin) return 50 + rangRarete(place.rareteMin);
  if (place.rareteMax) return 10;
  return 0;
}

function tirerUnePlace(
  type: TypePack,
  place: PlacePack,
  restantes: readonly CarteJoueur[],
  rng: () => number,
): CartePackee | null {
  const base = restantes.filter((c) => {
    if (type.familles && !type.familles.includes(c.poste)) return false;
    if (type.ageMax !== undefined && c.age > type.ageMax) return false;
    return true;
  });
  if (!base.length) return null;

  // 1er essai : la place telle qu'elle est promise.
  const exact = base.filter((c) => respecte(c, place));
  if (exact.length) return { carte: choisir(exact, rng), degradee: false };

  // 2e essai : on relâche la garantie d'un cran, puis complètement.
  for (const assoupli of assouplir(place)) {
    const candidats = base.filter((c) => respecte(c, assoupli));
    if (candidats.length) return { carte: choisir(candidats, rng), degradee: true };
  }
  return { carte: choisir(base, rng), degradee: Boolean(place.rareteMin || place.noteMin) };
}

function respecte(carte: CarteJoueur, place: PlacePack): boolean {
  if (place.noteMin !== undefined && carte.note < place.noteMin) return false;
  const rarete = rareteDeLaNote(carte.note);
  if (place.rareteMin && rangRarete(rarete) < rangRarete(place.rareteMin)) return false;
  if (place.rareteMax && rangRarete(rarete) > rangRarete(place.rareteMax)) return false;
  return true;
}

/** Les versions dégradées d'une place, de la plus proche à la plus lâche. */
function assouplir(place: PlacePack): PlacePack[] {
  const suites: PlacePack[] = [];
  if (place.noteMin !== undefined) {
    suites.push({ noteMin: place.noteMin - 4 }, { noteMin: place.noteMin - 8 });
  }
  if (place.rareteMin) {
    const rang = rangRarete(place.rareteMin);
    if (rang >= 1) suites.push({ rareteMin: rareteDuRangSur(rang - 1) });
    if (rang >= 2) suites.push({ rareteMin: rareteDuRangSur(rang - 2) });
  }
  // Une place `rareteMax` ne se dégrade pas « vers le haut » sans raison : on
  // la laisse s'ouvrir complètement, elle n'a jamais promis de plafond au
  // joueur, seulement à l'économie.
  if (place.rareteMax) suites.push({});
  return suites;
}

const ORDRE_RARETES: Rarete[] = ['commun', 'confirme', 'rare', 'elite', 'mondial'];
function rareteDuRangSur(rang: number): Rarete {
  return ORDRE_RARETES[Math.max(0, Math.min(ORDRE_RARETES.length - 1, rang))];
}

function choisir(candidats: readonly CarteJoueur[], rng: () => number): CarteJoueur {
  const poids = candidats.map((c) => POIDS_RARETE[rareteDeLaNote(c.note)]);
  const index = tirerPondere(poids, rng);
  return candidats[index >= 0 ? index : 0];
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. CE QUE ÇA VAUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Un pack est-il achetable ? Le serveur doit vérifier les trois, dans cet
 * ordre : la règle de la ligue, le solde, puis le stock.
 *
 * ⚠️ LE STOCK EN DERNIER, et pas par élégance : c'est le seul des trois qui
 * demande de lire le vivier entier. Refuser d'abord sur la règle et le solde
 * évite ce balayage dans les cas les plus fréquents.
 */
export type RefusPack = 'packsDesactives' | 'soldeInsuffisant' | 'vivierVide' | null;

export function refusDAchat(
  type: TypePack,
  packsActifs: boolean,
  solde: number,
  cartesLibresRestantes: number,
): RefusPack {
  if (!packsActifs) return 'packsDesactives';
  if (solde < type.prix) return 'soldeInsuffisant';
  if (cartesLibresRestantes < type.places.length) return 'vivierVide';
  return null;
}
