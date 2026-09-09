import { JOUEURS_NEW_MAJ } from '../../data/photosNewMaj.js';
import { LNR_MAJ } from '../../data/lnrMaj.js';
import { EFFECTIFS_REELS } from '../../data/effectifsReels.js';
import { CLUBS_AMATEURS, EFFECTIFS_AMATEURS, POSTES_AMATEURS } from '../../data/amateurs.js';
import { PHOTO_JOUEUR } from '../../data/photosJoueurs.js';
import { EVALUATION_JOUEUR_MAJ } from '../../data/evaluationsJoueursMaj.js';
import { photoReelle } from '../avatars.js';
import { COMPETITIONS } from '../../data/clubs.js';
import { LOGO_COMPETITION } from '../../data/logosCompetitions.js';
import { LOGO_COMPETITION_NOUVEAU } from '../../data/nouvellesLigues.js';
import { TROPHEES } from '../../data/trophees.js';
import { posteDepuisFamille, POSTE_PAR_ID } from '../../data/rugby.js';
import type { FamillePoste } from '../../types.js';
import type { Coequipier } from '../effectif.js';
import { graine, melanger } from './aleatoire.js';
import type { CarteCarriere, FiltrePack, PackCarriere, RareteCarriere } from './typesCarriere.js';

export const RARETES_CARRIERE: RareteCarriere[] = ['bronze', 'argent', 'or', 'elite', 'star'];
// ═══════════════════════════════════════════════════════════════════════════
// LES PACKS
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ TROIS AXES, ET C'EST CE QUI FAIT UNE BOUTIQUE PLUTÔT QU'UNE LISTE : le
// VOLUME (combien de cartes, à quelle qualité), le POSTE (renforcer sa
// première ligne, sa charnière) et le MONDE (le Top 14, le Japon, les Îles).
// Un manager à qui il manque un talonneur ne doit pas avoir à ouvrir des packs
// génériques en espérant tomber dessus.
//
// ⚠️ LA GARANTIE EST CE QUI FAIT ACHETER, ET CE QUI COÛTE CHER. « Au moins une
// carte en Or » transforme un tirage en promesse. Le prix d'un pack garanti
// n'est donc pas celui d'un pack ordinaire un peu meilleur : c'est celui de la
// carte garantie. S'il paraît bas au regard du marché (un Or vaut 12 000 à
// 40 000 OVA), c'est parce qu'il ne dit rien de QUEL Or — ce sera le plus
// souvent un 66, pas un 79.
//
// ⚠️ ET LES PROBABILITÉS SONT LE LEVIER D'ÉQUILIBRAGE, AVANT LE PRIX. Elles
// sont copiées dans l'état de la ligue à sa création, donc modifiables côté
// serveur sans toucher au code. Voir `serveur/LIGUES.md`.
const CHAMPIONNATS_SUD = ['Super Rugby Pacific', 'Bunnings NPC'];
const CHAMPIONNATS_JAPON = ['Japan Rugby League One : D1', 'Japan Rugby League One : D2', 'Japan Rugby League One : D3'];
const CHAMPIONNATS_NORD = ['Gallagher Premiership', 'United Rugby Championship', 'RFU Championship', 'Championship Cup'];
const CHAMPIONNATS_AMATEURS = ['Fédérale 1', 'Fédérale 2', 'Fédérale 3', 'Régionale 1', 'Régionale 2', 'Régionale 3'];
const NATIONS_ILES = ['Fidji', 'Samoa', 'Tonga'];

/** Le tirage courant, celui de la plupart des packs thématiques. */
const MIXTE = { bronze: 48, argent: 37, or: 14, elite: .95, star: .05 };

export const PACKS_CARRIERE: PackCarriere[] = [
  // ── Le volume ────────────────────────────────────────────────────────────
  { id: 'bronze', nom: 'Bronze', prix: 250, cartes: 3, famille: 'general',
    promesse: 'De la profondeur, pas cher. De quoi faire tourner un effectif.',
    probabilites: { bronze: 90, argent: 9.5, or: .5, elite: 0, star: 0 } },
  { id: 'standard', nom: 'Argent', prix: 700, cartes: 3, famille: 'general',
    promesse: 'Le pack de tous les jours. Une chance sur sept de toucher de l’Or.',
    probabilites: MIXTE },
  { id: 'premium', nom: 'Premium', prix: 1800, cartes: 3, famille: 'general',
    promesse: 'Quatre cartes sur dix sont en Or. C’est ici que se construit un XV.',
    probabilites: { bronze: 15, argent: 40, or: 42, elite: 2.8, star: .2 } },
  { id: 'or', nom: 'Or garanti', prix: 2600, cartes: 3, famille: 'general', garantie: 'or',
    promesse: 'Au moins une carte en Or, c’est écrit. Les deux autres se jouent.',
    probabilites: { bronze: 20, argent: 42, or: 35, elite: 2.7, star: .3 } },
  { id: 'grand', nom: 'Grand pack', prix: 4500, cartes: 8, famille: 'general', garantie: 'or',
    promesse: 'Huit cartes d’un coup, dont une en Or au minimum. De quoi refaire un banc.',
    probabilites: { bronze: 34, argent: 40, or: 24, elite: 1.8, star: .2 } },
  { id: 'elite', nom: 'Élite garantie', prix: 8500, cartes: 3, famille: 'general', garantie: 'elite',
    promesse: 'Un joueur à 80 ou plus, garanti. Il n’y en a que 416 dans tout le jeu.',
    probabilites: { bronze: 8, argent: 30, or: 55, elite: 6.4, star: .6 } },

  // ── Les postes ───────────────────────────────────────────────────────────
  { id: 'avants', nom: 'Avants', prix: 800, cartes: 3, famille: 'poste',
    filtre: { categorie: 'avant' },
    promesse: 'Uniquement les postes 1 à 8. Pour renforcer le paquet.',
    probabilites: MIXTE },
  { id: 'arrieres', nom: 'Arrières', prix: 800, cartes: 3, famille: 'poste',
    filtre: { categorie: 'arriere' },
    promesse: 'Uniquement les postes 9 à 15. Pour ouvrir le jeu.',
    probabilites: MIXTE },
  { id: 'premiereLigne', nom: 'Première ligne', prix: 950, cartes: 3, famille: 'poste',
    filtre: { familles: ['pilier', 'talonneur'] },
    promesse: 'Piliers et talonneurs. Les postes qu’on ne trouve jamais au marché.',
    probabilites: MIXTE },
  { id: 'charniere', nom: 'Charnière', prix: 1100, cartes: 3, famille: 'poste',
    filtre: { familles: ['demi_melee', 'demi_ouverture'] },
    promesse: 'Le 9 et le 10. Deux postes qui décident d’un match à eux seuls.',
    probabilites: { bronze: 40, argent: 40, or: 18, elite: 1.8, star: .2 } },
  { id: 'troisiemeLigne', nom: 'Troisième ligne', prix: 900, cartes: 3, famille: 'poste',
    filtre: { familles: ['troisieme_ligne'] },
    promesse: 'Les 6, 7 et 8 — les plaqueurs, les gratteurs, les porteurs de ballon.',
    probabilites: MIXTE },
  { id: 'finisseurs', nom: 'Finisseurs', prix: 1000, cartes: 3, famille: 'poste',
    filtre: { familles: ['ailier', 'centre', 'arriere'] },
    promesse: 'Ailiers, centres et arrières. Ceux qui vont marquer les essais.',
    probabilites: MIXTE },

  // ── Le monde ─────────────────────────────────────────────────────────────
  { id: 'france', nom: 'France', prix: 800, cartes: 3, famille: 'monde',
    filtre: { pays: ['France'] },
    promesse: 'Du Top 14 à la Régionale 3, uniquement le championnat français.',
    probabilites: MIXTE },
  { id: 'international', nom: 'International', prix: 1000, cartes: 3, famille: 'monde',
    filtre: { horsFrance: true },
    promesse: 'Les seize championnats étrangers. Le meilleur taux d’Argent et d’Or.',
    probabilites: { bronze: 35, argent: 44, or: 19.9, elite: 1, star: .1 } },
  { id: 'top14', nom: 'Top 14', prix: 3400, cartes: 3, famille: 'monde',
    filtre: { championnats: ['Top 14'] },
    promesse: 'Le meilleur championnat du monde. Pas une seule carte Bronze.',
    probabilites: { bronze: 0, argent: 30, or: 65, elite: 4.7, star: .3 } },
  { id: 'prod2', nom: 'Pro D2', prix: 1500, cartes: 3, famille: 'monde',
    filtre: { championnats: ['Pro D2'] },
    promesse: 'L’antichambre. Des joueurs solides à un prix raisonnable.',
    // ⚠️ NI ÉLITE NI STAR : mesuré, la Pro D2 compte UNE carte à 80+ et zéro à
    // 88+. Les annoncer, c'était vendre une chance qui n'existe pas.
    probabilites: { bronze: 2, argent: 48, or: 50, elite: 0, star: 0 } },
  { id: 'nord', nom: 'Îles Britanniques', prix: 2000, cartes: 3, famille: 'monde',
    filtre: { championnats: CHAMPIONNATS_NORD },
    promesse: 'Premiership, URC et Championship. L’école du combat.',
    probabilites: { bronze: 6, argent: 44, or: 46, elite: 3.6, star: .4 } },
  { id: 'sud', nom: 'Hémisphère Sud', prix: 2200, cartes: 3, famille: 'monde',
    filtre: { championnats: CHAMPIONNATS_SUD },
    promesse: 'Super Rugby et NPC. Le rugby de mouvement, et des mains en or.',
    probabilites: { bronze: 4, argent: 40, or: 51, elite: 4.5, star: .5 } },
  { id: 'japon', nom: 'Japon', prix: 1300, cartes: 3, famille: 'monde',
    filtre: { championnats: CHAMPIONNATS_JAPON },
    promesse: 'La League One, où finissent les internationaux du monde entier.',
    probabilites: { bronze: 12, argent: 46, or: 39.6, elite: 2.2, star: .2 } },
  { id: 'iles', nom: 'Îles du Pacifique', prix: 1700, cartes: 3, famille: 'monde',
    filtre: { nations: NATIONS_ILES },
    promesse: 'Fidji, Samoa, Tonga. De la puissance, et de l’imprévisible.',
    probabilites: { bronze: 14, argent: 42, or: 40, elite: 3.6, star: .4 } },
  { id: 'terroir', nom: 'Terroir', prix: 400, cartes: 5, famille: 'monde',
    filtre: { championnats: CHAMPIONNATS_AMATEURS },
    promesse: 'Cinq licenciés de Fédérale et de Régionale. Le vrai rugby du dimanche.',
    // ⚠️ AUCUN OR : les six championnats amateurs ne comptent pas un seul
    // joueur à 65 ou plus. C'est le pack du volume, il l'assume.
    probabilites: { bronze: 82, argent: 18, or: 0, elite: 0, star: 0 } },

  // ── L'âge ────────────────────────────────────────────────────────────────
  { id: 'espoirs', nom: 'Espoirs', prix: 1200, cartes: 3, famille: 'age',
    filtre: { ageMax: 23 },
    promesse: 'Moins de 23 ans. Ils ne sont pas encore bons — ils vont le devenir.',
    probabilites: { bronze: 40, argent: 40, or: 18.5, elite: 1.4, star: .1 } },
  { id: 'confirmes', nom: 'Confirmés', prix: 1600, cartes: 3, famille: 'age',
    filtre: { ageMin: 26, ageMax: 30 },
    promesse: 'Entre 26 et 30 ans : le sommet d’une carrière, sans le déclin.',
    probabilites: { bronze: 20, argent: 42, or: 35, elite: 2.7, star: .3 } },
];

const PACKS_PERMANENTS = ['bronze', 'standard', 'or'] as const;

/** Bronze, Argent et Or restent disponibles ; deux packs spéciaux tournent chaque jour. */
export function packsBoutiqueDuJour(
  packs: readonly PackCarriere[],
  maintenant: number | Date = Date.now(),
): PackCarriere[] {
  const instant = maintenant instanceof Date ? maintenant.getTime() : maintenant;
  const cleParis = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(instant);
  const numeroJour = Math.floor(Date.parse(`${cleParis}T00:00:00Z`) / 86_400_000);
  const permanents = PACKS_PERMANENTS
    .map(id => packs.find(pack => pack.id === id))
    .filter((pack): pack is PackCarriere => Boolean(pack));
  const tournants = packs.filter(pack => !PACKS_PERMANENTS.includes(pack.id as typeof PACKS_PERMANENTS[number]));
  if (tournants.length <= 2) return [...permanents, ...tournants];
  const depart = ((numeroJour * 2) % tournants.length + tournants.length) % tournants.length;
  return [...permanents, tournants[depart], tournants[(depart + 1) % tournants.length]];
}

export function rareteCarriere(note: number): RareteCarriere {
  return note >= 88 ? 'star' : note >= 80 ? 'elite' : note >= 65 ? 'or' : note >= 50 ? 'argent' : 'bronze';
}
const normaliser = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const nationLisible = (s: string) => s.replace(/[^\p{L}\p{M}\s'-]/gu, '').trim();
const borner = (n: number) => Math.max(20, Math.min(99, Math.round(n)));

export function statistiquesCarte(note: number, famille: FamillePoste, cle: string): Record<string, number> {
  const rng = graine(cle);
  const avant = ['pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne'].includes(famille);
  const demi = famille === 'demi_melee' || famille === 'demi_ouverture';
  const valeur = (bonus = 0) => borner(note + bonus + Math.round(rng() * 8) - 4);
  return avant
    ? { MEL: valeur(famille === 'pilier' ? 7 : 0), PHY: valeur(6), DEF: valeur(3), RCK: valeur(4), END: valeur(), TEC: valeur(-4) }
    : { VIT: valeur(demi ? 1 : 6), PAS: valeur(demi ? 6 : 1), JDP: valeur(demi || famille === 'arriere' ? 5 : -4), TEC: valeur(3), DEF: valeur(-2), PHY: valeur(-3) };
}

export type SourceCarte = Omit<CarteCarriere, 'id' | 'proprietaire' | 'fatigue' | 'matchs' | 'essais' | 'clubs'>;
let catalogue: SourceCarte[] | undefined;
/** Les identités viennent des effectifs réels. Les notes FFR sont estimées dans le jeu. */
export function catalogueMondialCarriere(): readonly SourceCarte[] {
  if (catalogue) return catalogue;
  const joueurs = new Map<string, SourceCarte>();
  const clubs = new Map(COMPETITIONS.flatMap(c => c.clubs.map(club => [club.nom, c] as const)));
  const ajouter = (source: SourceCarte) => {
    const cle = normaliser(source.nom);
    const existant = joueurs.get(cle);
    if (!existant || source.note > existant.note) joueurs.set(cle, source);
  };
  for (const [club, effectif] of Object.entries(EFFECTIFS_REELS)) {
    const competition = clubs.get(club);
    for (const j of effectif) {
      const sourceId = `reel:${normaliser(j.nom)}`;
      const lnr = LNR_MAJ[normaliser(j.nom)];
      const maj = JOUEURS_NEW_MAJ[normaliser(j.nom)];
      const evaluation = EVALUATION_JOUEUR_MAJ[normaliser(j.nom)];
      const classementMagazine = evaluation && /^(RugbyPass|FloRugby|We Talk Rugby|Ajustement jeu)/.test(evaluation.source);
      const note = classementMagazine ? evaluation.note : Math.max(30, j.note, evaluation?.note ?? 0);
      ajouter({ sourceId, nom: j.nom, famille: j.poste, poste: posteDepuisFamille(j.poste, 0), note,
        potentiel: Math.max(note, j.potentiel), age: j.age, nation: nationLisible(j.nation),
        clubReel: maj?.club ?? lnr?.club ?? club, championnat: maj ? 'Gallagher Premiership' : lnr?.championnat ?? competition?.nom ?? 'Championnat professionnel', pays: competition?.pays ?? 'France',
        // L'index consolidé corrige aussi les variantes de prénom et les URL
        // LNR devenues obsolètes ; l'URL brute ne sert qu'en dernier recours.
        photo: photoReelle(j.nom) ?? lnr?.photo, origine: 'professionnel', rarete: rareteCarriere(note),
        statistiques: statistiquesCarte(note, j.poste, sourceId) });
    }
  }
  // ⚠️ LES CLÉS SONT CELLES DE `CLUBS_AMATEURS`, PAS CELLES QU'ON CROIRAIT.
  // Le dictionnaire portait `federale1`, `regionale3`… alors que les données
  // s'appellent `fed1`, `reg3`. Aucune clé ne tombait juste sauf les deux
  // Nationales : TOUTE la pyramide amateur — Fédérale 1 comme Régionale 3 —
  // retombait sur le défaut 40 et sortait avec exactement la même distribution
  // de notes (33 à 47). Rien ne plantait ; il n'y avait simplement plus de
  // pyramide française, et un pilier de Régionale 3 valait un Fédérale 1.
  const notes: Record<string, number> = { nationale: 65, nationale2: 61, fed1: 56, fed2: 51, fed3: 47, reg1: 43, reg2: 39, reg3: 35 };
  const divisions = new Map(Object.entries(CLUBS_AMATEURS).flatMap(([division, liste]) => liste.map(c => [c.nom, division] as const)));
  for (const [club, effectif] of Object.entries(EFFECTIFS_AMATEURS)) {
    const division = divisions.get(club) ?? 'regionale3';
    const competition = clubs.get(club);
    for (const [index, entree] of effectif.split('~').entries()) {
      const [nom, codePoste] = entree.split('|');
      if (!nom.trim()) continue;
      const famille = codePoste !== '' && POSTES_AMATEURS[Number(codePoste)] ? POSTES_AMATEURS[Number(codePoste)] : POSTES_AMATEURS[index % POSTES_AMATEURS.length];
      const sourceId = `reel:${normaliser(nom)}`;
      const rng = graine(`${club}:${nom}`);
      const note = Math.max(30, Math.min(77, (notes[division] ?? 40) + Math.floor(rng() * 15) - 7));
      ajouter({ sourceId, nom, famille, poste: posteDepuisFamille(famille, index), note, potentiel: Math.min(82, note + 6), age: 18 + Math.floor(rng() * 17),
        nation: 'France', clubReel: club, championnat: competition?.nom ?? division.replace(/(\d)/, ' $1'), pays: 'France',
        photo: PHOTO_JOUEUR[normaliser(nom)], origine: 'ffr', rarete: rareteCarriere(note), statistiques: statistiquesCarte(note, famille, sourceId) });
    }
  }
  catalogue = [...joueurs.values()].sort((a, b) => a.sourceId < b.sourceId ? -1 : 1);
  return catalogue;
}

/**
 * ⚠️ LE VIVIER NE SE MATÉRIALISE JAMAIS. Le catalogue mondial compte plus de
 * 18 000 joueurs : en faire une copie par ligue, ce sont 18 000 objets écrits
 * dans le jsonb d'une ligne de base à chaque action. Les cartes n'existent
 * qu'une fois DISTRIBUÉES ; ce qui reste libre se déduit — le catalogue est
 * déterministe, il est le même partout, et l'unicité par ligue se lit dans les
 * `sourceId` déjà possédés.
 */
export function catalogueParRarete(): Readonly<Record<RareteCarriere, readonly SourceCarte[]>> {
  if (parRarete) return parRarete;
  const vide = { bronze: [], argent: [], or: [], elite: [], star: [] } as Record<RareteCarriere, SourceCarte[]>;
  for (const j of catalogueMondialCarriere()) vide[j.rarete].push(j);
  parRarete = vide;
  return parRarete;
}
let parRarete: Record<RareteCarriere, SourceCarte[]> | undefined;

/** Une source du catalogue devient une carte de ligue au moment où elle sort. */
export function carteDepuisSource(source: SourceCarte, ligueId: string, proprietaire: string, saison: number): CarteCarriere {
  return {
    ...source, statistiques: { ...source.statistiques },
    id: `${ligueId}:${source.sourceId}`, proprietaire,
    fatigue: 0, matchs: 0, essais: 0, clubs: [{ clubId: proprietaire, saison }],
  };
}

/** Le catalogue rangé par bande ET par filtre de pack, calculé une seule fois. */
const RAYONS = new Map<string, readonly SourceCarte[]>();
/**
 * ⚠️ LA CLÉ EST L'IDENTIFIANT DU PACK, PAS SON FILTRE. Le filtre est un objet :
 * l'utiliser comme clé de cache donnerait `[object Object]` pour les vingt-trois
 * packs, qui partageraient alors tous le rayon du premier calculé — un pack
 * Charnière rendrait des piliers. Deux packs qui partagent un filtre calculent
 * donc deux fois le même rayon, et c'est un très petit prix.
 */
export function rayonDePack(rarete: RareteCarriere, pack: Pick<PackCarriere, 'id' | 'filtre'>): readonly SourceCarte[] {
  const cle = `${rarete}#${pack.id}`;
  const connu = RAYONS.get(cle);
  if (connu) return connu;
  const bande = catalogueParRarete()[rarete];
  const rayon = pack.filtre ? bande.filter((c) => carteDansPack(c, pack.filtre)) : bande;
  RAYONS.set(cle, rayon);
  return rayon;
}

/** Les bandes qu'une garantie accepte : celle demandée, et toutes au-dessus. */
export function bandesGaranties(garantie: RareteCarriere): RareteCarriere[] {
  return RARETES_CARRIERE.slice(RARETES_CARRIERE.indexOf(garantie));
}

/**
 * Tire une carte libre dans une bande.
 *
 * ⚠️ TIRAGE PAR REJET, PAS PAR FILTRAGE. Recopier la bande disponible à chaque
 * carte, ce sont 67 000 comparaisons pour un pack Bronze — sur une fonction
 * serverless appelée à chaque ouverture. Le rejet coûte trente essais dans le
 * pire des cas tant que la bande n'est pas presque vide, et le balayage
 * linéaire ne sert qu'à ce moment-là. Le résultat est le même, l'ordre des
 * tirages `rng()` est stable, et c'est ce qui compte pour le déterminisme.
 */
export function tirerDuRayon(
  rayon: readonly SourceCarte[], pris: ReadonlySet<string>, rng: () => number,
): SourceCarte | null {
  if (!rayon.length) return null;
  for (let essai = 0; essai < 30; essai++) {
    const carte = rayon[Math.floor(rng() * rayon.length)];
    if (!pris.has(carte.sourceId)) return carte;
  }
  const depart = Math.floor(rng() * rayon.length);
  for (let i = 0; i < rayon.length; i++) {
    const carte = rayon[(depart + i) % rayon.length];
    if (!pris.has(carte.sourceId)) return carte;
  }
  return null;
}

/** Combien de joueurs du monde restent à découvrir dans cette ligue. */
export function vivierRestant(pris: ReadonlySet<string>): number {
  return Math.max(0, catalogueMondialCarriere().length - pris.size);
}

// ═══════════════════════════════════════════════════════════════════════════
// LES EMBLÈMES — un vrai écusson de club pour son club en ligne
// ═══════════════════════════════════════════════════════════════════════════
/**
 * ⚠️ LA LISTE NE PART PAS DANS LA VUE DE LA LIGUE, ET C'EST DÉLIBÉRÉ. Elle
 * compte 1 353 écussons : la joindre à `vueCarriere` ajouterait 80 Ko à une
 * réponse relue toutes les deux secondes pendant un direct. Elle se demande
 * séparément (`/api/carriere?emblemes=1`), une fois, quand le joueur ouvre le
 * sélecteur.
 *
 * Elle ne peut pas non plus vivre dans l'écran : `data/clubs` tire les
 * 1,7 Mo d'effectifs amateurs, qui n'ont rien à faire dans le paquet du mode
 * en ligne. Le serveur, lui, les a déjà chargés pour le catalogue.
 */
export interface GroupeEmblemes { groupe: string; pays: string; emblemes: { nom: string; logo: string }[] }
let emblemes: GroupeEmblemes[] | undefined;
export function emblemesCarriere(): readonly GroupeEmblemes[] {
  if (emblemes) return emblemes;
  // ⚠️ TOUS LES ÉCUSSONS DE LA BASE, Y COMPRIS LES DISTANTS — choix assumé.
  // Sur les 1 353 logos, 754 sont des fichiers de `public/logos/` et 599 des
  // URL vers l'API de la FFR (`api-web.monclubhouse.ffr.fr`) : ces dernières
  // dépendent d'un tiers et peuvent disparaître. On les garde quand même,
  // parce que ce sont justement les clubs de Fédérale et de Régionale — ceux
  // dont on veut porter les couleurs quand on joue avec ses potes. Le jeu les
  // affiche déjà ainsi partout ailleurs (`components/Blason.tsx`) : une image
  // manquante y est un carré vide, pas une panne.
  emblemes = COMPETITIONS
    .map((c) => ({
      groupe: c.nom, pays: c.pays,
      emblemes: c.clubs.filter((club) => club.logo).map((club) => ({ nom: club.nom, logo: club.logo! })),
    }))
    .filter((g) => g.emblemes.length > 0);
  return emblemes;
}

let logosConnus: Set<string> | undefined;
/** Un emblème inventé par un client bricolé ne devient jamais l'écusson d'un club. */
export function emblemeValide(logo: unknown): logo is string {
  logosConnus ??= new Set(emblemesCarriere().flatMap((g) => g.emblemes.map((e) => e.logo)));
  return typeof logo === 'string' && logosConnus.has(logo);
}

// ═══════════════════════════════════════════════════════════════════════════
// LES LOGOS DE COMPÉTITION, ET LES TROPHÉES
// ═══════════════════════════════════════════════════════════════════════════
// Une ligue entre potes s'appelle « La Ligue du dimanche » — mais elle a le
// logo du Top 14 et on y soulève le Brennus. C'est exactement ce qui la rend
// SIENNE : le championnat des copains, avec ses images à lui.

export interface LogoCompetitionCarriere { id: string; nom: string; logo: string }
export interface TropheeCarriere { id: string; nom: string; couleur: string; desc: string; modele: string }

let logosCompetition: LogoCompetitionCarriere[] | undefined;
export function competitionsCarriere(): readonly LogoCompetitionCarriere[] {
  if (logosCompetition) return logosCompetition;
  const noms = new Map(COMPETITIONS.map((c) => [c.id, c.nom] as const));
  logosCompetition = Object.entries({ ...LOGO_COMPETITION, ...LOGO_COMPETITION_NOUVEAU })
    .map(([id, logo]) => ({ id, nom: noms.get(id) ?? id, logo }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  return logosCompetition;
}

let trophees: TropheeCarriere[] | undefined;
export function tropheesCarriere(): readonly TropheeCarriere[] {
  if (trophees) return trophees;
  // ⚠️ SEULEMENT LES TROPHÉES D'ÉQUIPE. Les huit distinctions individuelles
  // (« meilleur joueur du monde ») ne se soulèvent pas au bout d'un
  // championnat : les proposer au commissaire, ce serait lui faire créer une
  // coupe dont le trophée ne veut rien dire.
  trophees = Object.values(TROPHEES)
    .filter((t) => !t.individuel)
    .map((t) => ({ id: t.id, nom: t.nom, couleur: t.couleur, desc: t.desc, modele: t.modele }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  return trophees;
}

let idsCompetition: Set<string> | undefined;
export function logoCompetitionValide(id: unknown): id is string {
  idsCompetition ??= new Set(competitionsCarriere().map((c) => c.logo));
  return typeof id === 'string' && idsCompetition.has(id);
}
let idsTrophee: Set<string> | undefined;
export function tropheeValide(id: unknown): id is string {
  idsTrophee ??= new Set(tropheesCarriere().map((t) => t.id));
  return typeof id === 'string' && idsTrophee.has(id);
}
export function nomTrophee(id: string | undefined): string {
  return tropheesCarriere().find((t) => t.id === id)?.nom ?? 'Trophée de la ligue';
}

const QUOTAS: [FamillePoste, number][] = [['pilier', 5], ['talonneur', 3], ['deuxieme_ligne', 4], ['troisieme_ligne', 5], ['demi_melee', 2], ['demi_ouverture', 2], ['centre', 4], ['ailier', 3], ['arriere', 2]];
/**
 * ⚠️ LES TRENTE JOUEURS DE DÉPART SONT DE VRAIS LICENCIÉS DE RÉGIONALE 3.
 *
 * Ils étaient générés : trente prénoms tirés dans une liste de quinze, un club
 * appelé « Centre de formation », et des notes calées pour tomber exactement à
 * 35 de moyenne. C'était propre et ça ne racontait rien — on ne s'attache pas à
 * un joueur qui n'existe pas, et la promesse du mode est justement de partir du
 * bas de la vraie pyramide française pour finir avec des internationaux.
 *
 * On tire donc dans la Régionale 3 réelle, entre 30 et 40 : 6 600 licenciés
 * avec leur nom, leur club et leur poste. Le premier XV d'une ligue, ce sont
 * des joueurs qui jouent vraiment le dimanche.
 *
 * L'ÉQUILIBRE EST TENU PAR L'ÉCHELLE DE NOTES, PAS PAR LE TIRAGE : chaque club
 * reçoit la même échelle de trente notes visées (moyenne 35), et pour chaque
 * cran on prend le licencié libre du bon poste dont la note en est la plus
 * proche. Deux clubs peuvent donc avoir des joueurs différents et la même
 * force — mesuré : moins de 0,4 point d'écart entre le plus fort et le plus
 * faible des vingt.
 *
 * ⚠️ `pris` PORTE L'UNICITÉ PAR LIGUE dès la dotation. Sans lui, deux amis
 * pourraient recevoir le même licencié le jour de l'inscription — l'invariant
 * tomberait avant même le premier pack.
 */
const NOTE_DEPART_MIN = 30;
const NOTE_DEPART_MAX = 40;
const CHAMPIONNAT_DEPART = 'Régionale 3';

const vestiaires = new Map<string, readonly SourceCarte[]>();
/** Les licenciés de Régionale 3 d'une famille de poste, rangés par note. */
function vestiaireDeDepart(famille: FamillePoste, note: number): readonly SourceCarte[] {
  const cle = `${famille}#${note}`;
  const connu = vestiaires.get(cle);
  if (connu) return connu;
  const liste = catalogueMondialCarriere().filter((c) => c.famille === famille && c.note === note
    && c.championnat === CHAMPIONNAT_DEPART);
  vestiaires.set(cle, liste);
  return liste;
}

export function dotationBronzeCarriere(
  ligueId: string, clubId: string, alea: string, pris: ReadonlySet<string> = new Set(), saison = 1,
): CarteCarriere[] {
  const rng = graine(alea);
  // L'échelle : quinze notes montantes, quinze descendantes, mélangées. Sa
  // moyenne vaut 35 et elle est la même pour tous les clubs de la ligue.
  const echelle = melanger(Array.from({ length: 30 }, (_, i) => i < 15 ? 30 + i % 6 : 40 - (i - 15) % 6), rng);
  const places = QUOTAS.flatMap(([famille, n]) => Array.from({ length: n }, (_, i) => ({ famille, poste: posteDepuisFamille(famille, i) })));
  const retenus = new Set(pris);
  const cartes: CarteCarriere[] = [];

  places.forEach((place, i) => {
    const vise = echelle[i];
    // On cherche la note visée, puis on s'en écarte d'un cran à la fois.
    let source: SourceCarte | null = null;
    for (let ecart = 0; ecart <= NOTE_DEPART_MAX - NOTE_DEPART_MIN && !source; ecart++) {
      for (const note of ecart === 0 ? [vise] : [vise - ecart, vise + ecart]) {
        if (note < NOTE_DEPART_MIN || note > NOTE_DEPART_MAX) continue;
        source = tirerDuRayon(vestiaireDeDepart(place.famille, note), retenus, rng);
        if (source) break;
      }
    }
    // ⚠️ Repli : si toute une famille était épuisée, un club se retrouverait
    // sans pilier — donc sans composition légale. On élargit alors à la bande
    // Bronze entière plutôt que de rendre une liste incomplète.
    source ??= tirerDuRayon(catalogueParRarete().bronze.filter((c) => c.famille === place.famille), retenus, rng);
    if (!source) return;
    retenus.add(source.sourceId);
    cartes.push({
      ...source, poste: place.poste, statistiques: { ...source.statistiques },
      id: `${ligueId}:${source.sourceId}`, proprietaire: clubId,
      fatigue: 0, matchs: 0, essais: 0, clubs: [{ clubId, saison }],
    });
  });
  return cartes;
}

export function coequipierDepuisCarte(c: CarteCarriere): Coequipier {
  return { id: c.id, nom: c.nom, poste: c.poste, age: c.age, note: c.note, potentiel: c.potentiel, nation: c.nation, regen: c.origine === 'formation', horsGeneration: true };
}
/**
 * Une carte entre-t-elle dans ce pack ? Chaque champ du filtre est un ET ; à
 * l'intérieur d'un champ, c'est un OU.
 */
export function carteDansPack(c: Pick<CarteCarriere, 'poste' | 'famille' | 'pays' | 'nation' | 'championnat' | 'age'>, filtre?: FiltrePack): boolean {
  if (!filtre) return true;
  // ⚠️ « Avant » PORTE UNE MAJUSCULE dans `data/rugby.ts`. Comparé en
  // minuscules, le pack Avants ne trouvait personne et le pack Arrières
  // renvoyait tout le catalogue, piliers compris.
  if (filtre.categorie) {
    const avant = POSTE_PAR_ID[c.poste].categorie === 'Avant';
    if (avant !== (filtre.categorie === 'avant')) return false;
  }
  if (filtre.familles && !filtre.familles.includes(c.famille)) return false;
  if (filtre.championnats && !filtre.championnats.includes(c.championnat)) return false;
  if (filtre.pays && !filtre.pays.includes(c.pays)) return false;
  if (filtre.nations && !filtre.nations.includes(c.nation)) return false;
  if (filtre.horsFrance && c.pays === 'France') return false;
  if (filtre.ageMax !== undefined && c.age > filtre.ageMax) return false;
  if (filtre.ageMin !== undefined && c.age < filtre.ageMin) return false;
  return true;
}
