import { EFFECTIFS_REELS } from '../../data/effectifsReels';
import { CLUBS_AMATEURS, EFFECTIFS_AMATEURS, POSTES_AMATEURS } from '../../data/amateurs';
import { PHOTO_JOUEUR } from '../../data/photosJoueurs';
import { COMPETITIONS } from '../../data/clubs';
import { LOGO_COMPETITION } from '../../data/logosCompetitions';
import { LOGO_COMPETITION_NOUVEAU } from '../../data/nouvellesLigues';
import { TROPHEES } from '../../data/trophees';
import { posteDepuisFamille, POSTE_PAR_ID } from '../../data/rugby';
import type { FamillePoste } from '../../types';
import type { Coequipier } from '../effectif';
import { graine, melanger } from './aleatoire';
import type { CarteCarriere, PackCarriere, RareteCarriere } from './typesCarriere';

export const RARETES_CARRIERE: RareteCarriere[] = ['bronze', 'argent', 'or', 'elite', 'star'];
export const PACKS_CARRIERE: PackCarriere[] = [
  { id: 'bronze', nom: 'Bronze', prix: 250, cartes: 3, probabilites: { bronze: 90, argent: 9.5, or: .5, elite: 0, star: 0 } },
  { id: 'standard', nom: 'Standard', prix: 700, cartes: 3, probabilites: { bronze: 48, argent: 37, or: 14, elite: .95, star: .05 } },
  { id: 'premium', nom: 'Premium', prix: 1800, cartes: 3, probabilites: { bronze: 15, argent: 40, or: 42, elite: 2.8, star: .2 } },
  { id: 'avants', nom: 'Avants', prix: 800, cartes: 3, filtre: 'avants', probabilites: { bronze: 48, argent: 37, or: 14, elite: .95, star: .05 } },
  { id: 'arrieres', nom: 'Arrières', prix: 800, cartes: 3, filtre: 'arrieres', probabilites: { bronze: 48, argent: 37, or: 14, elite: .95, star: .05 } },
  { id: 'france', nom: 'France', prix: 800, cartes: 3, filtre: 'france', probabilites: { bronze: 48, argent: 37, or: 14, elite: .95, star: .05 } },
  { id: 'international', nom: 'International', prix: 1000, cartes: 3, filtre: 'international', probabilites: { bronze: 35, argent: 44, or: 19.9, elite: 1, star: .1 } },
];

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
      const note = Math.max(30, j.note);
      ajouter({ sourceId, nom: j.nom, famille: j.poste, poste: posteDepuisFamille(j.poste, 0), note,
        potentiel: Math.max(note, j.potentiel), age: j.age, nation: nationLisible(j.nation),
        clubReel: club, championnat: competition?.nom ?? 'Championnat professionnel', pays: competition?.pays ?? 'France',
        photo: PHOTO_JOUEUR[normaliser(j.nom)], origine: 'professionnel', rarete: rareteCarriere(note),
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
export function rayonDePack(rarete: RareteCarriere, filtre: PackCarriere['filtre']): readonly SourceCarte[] {
  const cle = `${rarete}#${filtre ?? 'tout'}`;
  const connu = RAYONS.get(cle);
  if (connu) return connu;
  const bande = catalogueParRarete()[rarete];
  const rayon = filtre ? bande.filter((c) => carteDansPack(c as CarteCarriere, { filtre } as PackCarriere)) : bande;
  RAYONS.set(cle, rayon);
  return rayon;
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
export function carteDansPack(c: CarteCarriere, pack: PackCarriere): boolean {
  if (pack.filtre === 'france') return c.pays === 'France';
  if (pack.filtre === 'international') return c.pays !== 'France';
  // ⚠️ « Avant » PORTE UNE MAJUSCULE dans `data/rugby.ts`. Comparé en
  // minuscules, le pack Avants ne trouvait personne et le pack Arrières
  // renvoyait tout le catalogue, piliers compris.
  if (pack.filtre === 'avants') return POSTE_PAR_ID[c.poste].categorie === 'Avant';
  if (pack.filtre === 'arrieres') return POSTE_PAR_ID[c.poste].categorie !== 'Avant';
  return true;
}
