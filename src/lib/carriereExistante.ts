// LA CARRIÈRE AVEC UN JOUEUR EXISTANT — Correctif 19.
//
// Demande : « jouer avec Antoine Dupont → commencer directement une carrière avec ce joueur, son club, son poste et
// ses caractéristiques actuelles ». Ce module est PUR (ni store, ni DOM, ni horloge, ni `Math.random`) : il choisit
// qui l'on peut incarner, filtre le catalogue, et fabrique la fiche de départ d'une carrière à partir d'une carte.
//
// ═══ CE QUI A ÉTÉ TRANCHÉ ═══════════════════════════════════════════════════════
//
// 1. ⚠️ LA CARTE EST UN POINT DE DÉPART, JAMAIS UN LIEN. `joueurDepuisCarte` COPIE tout ce qu'il lit (attributs,
//    postes, listes) : la carrière vit sa vie dans sa propre fiche, la carte du catalogue — qui sert aussi aux packs,
//    aux ligues et à la collection — ne bouge pas d'un point quand le joueur progresse ou régresse. `origine` ne
//    garde qu'un instantané (GEN, potentiel, club, âge de départ), pour l'affichage.
// 2. ⚠️ UN JOUEUR EXISTANT NE COMPTE JAMAIS AU CLASSEMENT, ET LE DRAPEAU SE POSE À LA CRÉATION. Commencer en GEN 95
//    ne se compare pas à un joueur qu'on a fait grandir depuis la Régionale 3. `estCarriereClassee` est LE prédicat
//    que tout le jeu interroge (envoi mondial, classement local, Panthéon, récompenses) ; aucune action du store ne
//    réécrit `rankedCareer`, il n'y a donc pas de chemin « existant → classé ».
// 3. ⚠️ ON N'INCARNE QUE LES JOUEURS ACTIFS. Les cartes spéciales (ICONS retraités, Halloween) sont écartées par
//    défaut : une légende n'a pas de club à rejoindre, une Halloween est le double d'un joueur déjà listé. L'option
//    `legendes` existe pour qu'un réglage du Labo l'ouvre un jour — elle est fermée, et le banc le vérifie.
// 4. ⚠️ LES ATTRIBUTS NE SE TIRENT PAS : ils se DÉDUISENT. Les huit notes de la carrière viennent des notes de la
//    carte quand elles existent (VIT, PAS, JDP, DEF, PHY… ou MEL, RCK, END pour un avant) et, pour les autres, du
//    profil de poste que le moteur donne déjà à ses coéquipiers (`attributsDe`). Puis la moyenne est recalée sur la
//    GEN de la carte : un joueur affiché 95 démarre à 95, pas à 94 ou 96.

import type { Attributs, Joueur, OrigineJoueur, PosteId } from '../types';
import type { SourceCarte } from './ligue/catalogueCarriere';
import { POSTE_PAR_ID } from '../data/rugby';
import { clubParNom, competitionDuClub } from '../data/clubs';
import { attributsDe } from './carteJoueur';
import { noteDuClub } from './effectif';
import { graine } from './championnat';
import { pseudoDe } from './social';
import { scoreDeLaFiche } from './classementMondial';
import { responsabilitesVides, evaluerResponsabilites } from './responsabilites';

/** À 44 ans la carrière s'arrête d'office (`AGE_RETRAITE_FORCEE`) : on ne commence pas à un âge qui l'interdit. */
export const AGE_MAX_EXISTANT = 43;
/** En dessous, le jeu n'a ni contrat ni calendrier à lui offrir (`LIMITES.ageDebutMin`). */
export const AGE_MIN_EXISTANT = 16;

// ---------------------------------------------------------------------------
// LE DRAPEAU DU CLASSEMENT
// ---------------------------------------------------------------------------

/**
 * Cette carrière compte-t-elle dans les classements compétitifs ?
 *
 * ⚠️ UNE SEULE QUESTION POSÉE PARTOUT. Deux règles contradictoires (« rankedCareer » ici, « origine » là) finiraient
 * par laisser passer une carrière sur deux chemins : le prédicat lit les DEUX et refuse dès que l'un des deux dit
 * « existant ». Une sauvegarde d'avant le Correctif 19 n'a ni l'un ni l'autre : elle a été créée de zéro, elle est
 * classée.
 */
export function estCarriereClassee(joueur: Pick<Joueur, 'rankedCareer' | 'origine'> | null | undefined): boolean {
  if (!joueur) return false;
  return joueur.rankedCareer !== false && !joueur.origine;
}

// ---------------------------------------------------------------------------
// QUI PEUT-ON INCARNER ?
// ---------------------------------------------------------------------------

export interface OptionsSelection {
  /** Ouvre aussi les cartes spéciales retraitées (ICONS). Fermé par défaut. */
  legendes?: boolean;
}

/** Le club de la carte, tel que le monde le connaît : sans lui, la carrière n'a ni division ni calendrier. */
function clubDuMonde(carte: SourceCarte): { club: string; division: string; championnat: string } | null {
  const nom = clubParNom(carte.clubReel)?.nom ?? carte.clubReel;
  const competition = competitionDuClub(nom);
  return competition ? { club: nom, division: competition.id, championnat: competition.nom } : null;
}

export function joueurIncarnable(carte: SourceCarte, options: OptionsSelection = {}): boolean {
  if (carte.speciale && !(options.legendes && carte.speciale.retraite)) return false;
  if (!POSTE_PAR_ID[carte.poste]) return false;
  if (carte.age < AGE_MIN_EXISTANT || carte.age > AGE_MAX_EXISTANT) return false;
  return clubDuMonde(carte) !== null;
}

/** Une carte rangée pour la recherche : tout ce qu'un joueur peut taper, une seule fois normalisé. */
export interface EntreeRecherche {
  carte: SourceCarte;
  /** « nom » seul, sans accents ni majuscules. */
  nom: string;
  /** « nom club ville » : ce que cherche la zone de texte. */
  texte: string;
  poste: PosteId;
  division: string;
  club: string;
  nation: string;
}

export const normaliserRecherche = (texte: string): string =>
  texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Le catalogue prêt à être filtré : 78 000 cartes, une normalisation chacune, UNE fois par catalogue.
 *
 * ⚠️ ON NE RE-NORMALISE PAS À CHAQUE FRAPPE. Taper « dup » filtrait 78 000 noms en les passant chacun par
 * `normalize('NFD')` : sur un téléphone, une demi-seconde par lettre. Ici la frappe ne fait plus qu'un `includes`.
 */
export function indexerJoueursExistants(catalogue: readonly SourceCarte[], options: OptionsSelection = {}): EntreeRecherche[] {
  const clubs = new Map<string, ReturnType<typeof clubDuMonde>>();
  const sortie: EntreeRecherche[] = [];
  for (const carte of catalogue) {
    if (carte.speciale && !(options.legendes && carte.speciale.retraite)) continue;
    if (!POSTE_PAR_ID[carte.poste] || carte.age < AGE_MIN_EXISTANT || carte.age > AGE_MAX_EXISTANT) continue;
    let monde = clubs.get(carte.clubReel);
    if (monde === undefined) { monde = clubDuMonde(carte); clubs.set(carte.clubReel, monde); }
    if (!monde) continue;
    const nom = normaliserRecherche(carte.nom);
    sortie.push({
      carte, nom, texte: `${nom} ${normaliserRecherche(monde.club)}`,
      poste: carte.poste, division: monde.division, club: monde.club, nation: carte.nation,
    });
  }
  // Les meilleurs d'abord : c'est ce qu'on cherche quand on ne sait pas encore qui incarner.
  return sortie.sort((a, b) => b.carte.note - a.carte.note || (a.carte.nom < b.carte.nom ? -1 : a.carte.nom > b.carte.nom ? 1 : 0));
}

export interface FiltresJoueursExistants {
  /** Nom ou club, tel que tapé. */
  recherche: string;
  /** Id du championnat (`Competition.id`), '' = tous. */
  championnat: string;
  /** Nom exact du club, '' = tous. */
  club: string;
  /** Nation exacte de la carte, '' = toutes. */
  nation: string;
  /** Poste principal de la carte, '' = tous. */
  poste: PosteId | '';
  /** Bornes de GEN incluses ; 0 / 100 = pas de borne. */
  genMin: number;
  genMax: number;
}

export const FILTRES_VIDES: FiltresJoueursExistants = {
  recherche: '', championnat: '', club: '', nation: '', poste: '', genMin: 0, genMax: 100,
};

/** Les entrées qui passent TOUS les filtres, dans l'ordre de l'index (GEN décroissante). */
export function filtrerJoueursExistants(index: readonly EntreeRecherche[], filtres: FiltresJoueursExistants): EntreeRecherche[] {
  const mots = normaliserRecherche(filtres.recherche).split(' ').filter(Boolean);
  return index.filter((e) => {
    if (filtres.championnat && e.division !== filtres.championnat) return false;
    if (filtres.club && e.club !== filtres.club) return false;
    if (filtres.nation && e.nation !== filtres.nation) return false;
    if (filtres.poste && e.poste !== filtres.poste) return false;
    if (e.carte.note < filtres.genMin || e.carte.note > filtres.genMax) return false;
    // Chaque mot doit se retrouver, dans n'importe quel ordre : « dupont antoine » trouve Antoine DUPONT.
    for (const mot of mots) if (!e.texte.includes(mot)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// LES HUIT ATTRIBUTS D'UNE CARTE
// ---------------------------------------------------------------------------

const CLES: (keyof Attributs)[] = ['vitesse', 'force', 'endurance', 'plaquage', 'passe', 'jeuAuPied', 'vision', 'mental'];
const borner = (v: number, min = 5, max = 99) => Math.max(min, Math.min(max, Math.round(v)));

/**
 * Les huit attributs de la carrière, déduits de la carte.
 *
 * ⚠️ LE PROFIL DE POSTE DU MOTEUR SERT DE FOND (`attributsDe`) : c'est lui que lit le moteur de match pour les
 * coéquipiers, donc un pilier incarné a la même silhouette qu'un pilier du club. Les notes imprimées sur la carte
 * (VIT, PAS, JDP…) l'emportent là où elles existent ; le reste (endurance d'un trois-quarts, vision, mental) vient
 * du profil. La moyenne est ensuite recalée EXACTEMENT sur la GEN de la carte.
 */
export function attributsDepuisCarte(carte: Pick<SourceCarte, 'sourceId' | 'note' | 'poste' | 'statistiques'>): Attributs {
  const fond = attributsDe({ id: carte.sourceId, note: carte.note, poste: carte.poste });
  const s = carte.statistiques ?? {};
  const a: Attributs = { ...fond };
  const lire = (cle: string): number | undefined => (Number.isFinite(s[cle]) ? s[cle] : undefined);
  const moyenne = (...v: (number | undefined)[]): number | undefined => {
    const l = v.filter((x): x is number => x !== undefined);
    return l.length ? l.reduce((x, y) => x + y, 0) / l.length : undefined;
  };
  const poser = (cle: keyof Attributs, valeur: number | undefined) => { if (valeur !== undefined) a[cle] = borner(valeur); };
  if (lire('VIT') !== undefined) {
    // Une carte de trois-quarts ou de demi.
    poser('vitesse', lire('VIT'));
    poser('passe', lire('PAS'));
    poser('jeuAuPied', lire('JDP'));
    poser('plaquage', lire('DEF'));
    poser('force', lire('PHY'));
    poser('vision', moyenne(lire('TEC'), fond.vision));
  } else if (lire('MEL') !== undefined) {
    // Une carte d'avant.
    poser('force', moyenne(lire('PHY'), lire('MEL')));
    poser('plaquage', lire('DEF'));
    poser('endurance', lire('END'));
    poser('passe', moyenne(lire('TEC'), fond.passe));
    poser('mental', moyenne(lire('RCK'), fond.mental));
  }
  return recalerSurLaNote(a, carte.note);
}

/** Répartit l'écart entre la moyenne des huit notes et la GEN visée, sans sortir de [5, 99]. */
export function recalerSurLaNote(a: Attributs, note: number): Attributs {
  const sortie: Attributs = { ...a };
  let ecart = Math.round(note * CLES.length) - CLES.reduce((s, k) => s + sortie[k], 0);
  // Tant qu'il reste un écart et une note qui peut le porter : on les remplit une par une, la plus éloignée de la borne d'abord.
  for (let tour = 0; ecart !== 0 && tour < 400; tour++) {
    const sens = ecart > 0 ? 1 : -1;
    const candidats = CLES.filter((k) => (sens > 0 ? sortie[k] < 99 : sortie[k] > 5));
    if (!candidats.length) break;
    candidats.sort((x, y) => (sens > 0 ? sortie[x] - sortie[y] : sortie[y] - sortie[x]));
    sortie[candidats[0]] += sens;
    ecart -= sens;
  }
  return sortie;
}

const noteDe = (a: Attributs): number => Math.round(CLES.reduce((s, k) => s + a[k], 0) / CLES.length);

// ---------------------------------------------------------------------------
// LA FICHE DE DÉPART
// ---------------------------------------------------------------------------

/** Il a la réputation de son niveau : un 95 est connu de tout le pays, un 40 de son club. */
export const reputationDeDepart = (gen: number): number => Math.max(15, Math.min(95, Math.round((gen - 30) * 1.25)));

/**
 * Le score que sa fiche valait le jour où la carrière a commencé (aucun match, aucun titre).
 *
 * ⚠️ SERT À NE PAYER QUE CE QU'ON ACCOMPLIT : une récompense de fin de carrière calculée sur le score brut paierait
 * le niveau de départ d'un joueur existant, pas sa carrière (`prendreRetraite`).
 */
export function scoreDeDepart(origine: OrigineJoueur): number {
  return scoreDeLaFiche({
    note: origine.genDepart, reputation: reputationDeDepart(origine.genDepart), saisons: 1, titres: [], essais: 0, matchs: 0,
  });
}

export interface FicheExistante {
  joueur: Joueur;
  /** Le nom à écarter du monde (`setJoueurIncarne`) : celui de la carte, à l'identique. */
  nomIncarne: string;
}

/**
 * La carrière d'un joueur existant, à sa première semaine.
 *
 * Reprend de la carte : nom, âge, club (donc division), poste et postes secondaires, nationalité, photo, attributs,
 * GEN, potentiel, pied (`jeuAuPied`), rôles. Tout le reste démarre comme une carrière ordinaire — même saison 1,
 * mêmes compteurs, mêmes règles de progression, de blessure, de transfert et de sélection.
 *
 * ⚠️ DÉTERMINISTE : la même carte donne toujours la même fiche (durée du contrat tirée de l'identité de la carte, pas
 * de `Math.random`), ce qui la rend testable et rejouable.
 */
export function joueurDepuisCarte(carte: SourceCarte): FicheExistante {
  const monde = clubDuMonde(carte);
  if (!monde) throw new Error(`Joueur non incarnable : club inconnu (${carte.clubReel})`);
  const age = Math.max(AGE_MIN_EXISTANT, Math.min(AGE_MAX_EXISTANT, Math.round(carte.age)));
  const attributs = attributsDepuisCarte(carte);
  const gen = noteDe(attributs);
  const rng = graine(`existant#${carte.sourceId}`);
  const reputation = reputationDeDepart(gen);
  // Sa place dans le groupe décide de la confiance du staff : le titulaire indiscutable de son club l'est aussi à l'écran.
  const confianceCoach = Math.max(35, Math.min(85, Math.round(50 + (gen - noteDuClub(monde.club)) * 1.2)));
  const joueur: Joueur = {
    nom: carte.nom,
    poste: carte.poste,
    postesSecondaires: (carte.postesSecondaires ?? []).filter((p): p is PosteId => p !== carte.poste && !!POSTE_PAR_ID[p]),
    nation: carte.nation,
    club: monde.club,
    division: monde.division,
    age,
    attributs,
    forme: 70,
    moral: 75,
    reputation,
    argent: 1500,
    saison: 1,
    matchsJoues: 0,
    essais: 0,
    titres: [],
    potentiel: Math.max(gen, Math.min(99, Math.round(carte.potentiel))),
    contrat: {
      club: monde.club,
      division: monde.division,
      saisons: 2 + Math.floor(rng() * 2),
      salaire: Math.max(0, Math.round(noteDuClub(monde.club) * 60)),
    },
    traits: [],
    confianceCoach,
    pseudo: pseudoDe(carte.nom),
    abonnes: Math.round(150 + Math.pow(reputation / 100, 3.2) * 250_000),
    clubs: [monde.club],
    photo: carte.photo,
    // Son portrait sert d'avatar à son compte sur L'Ovale, comme n'importe quel joueur réel du fil (modifiable ensuite).
    ...(carte.photo ? { profilSocial: { avatar: `photo:${carte.photo}` } } : {}),
    // ⚠️ POSÉ ICI, ET NULLE PART AILLEURS : voir `estCarriereClassee`.
    rankedCareer: false,
    origine: {
      sourceId: carte.sourceId,
      genDepart: gen,
      potentielDepart: Math.round(carte.potentiel),
      clubDepart: monde.club,
      championnatDepart: monde.championnat,
      ageDepart: age,
    } satisfies OrigineJoueur,
  };
  return { joueur, nomIncarne: carte.nom };
}

/**
 * Ses rôles dans l'équipe, dès le premier jour.
 *
 * ⚠️ UNE ÉVALUATION D'INTERSAISON NE MONTE QUE D'UNE MARCHE (`unCran`) : un joueur qui arrive n'a rien reçu. Un
 * joueur existant, lui, a déjà son rôle — l'ouvreur qui tape les pénalités du Stade Toulousain ne repart pas de
 * zéro. On évalue donc jusqu'à ce que le résultat ne bouge plus (deux marches au plus pour le tee et le lancer).
 */
export function responsabilitesDeDepart(joueur: Joueur, forceGroupe: number): NonNullable<Joueur['responsabilites']> {
  let courant = responsabilitesVides();
  for (let i = 0; i < 3; i++) {
    const { responsabilites, changements } = evaluerResponsabilites({ ...joueur, responsabilites: courant }, joueur.saison, forceGroupe);
    courant = responsabilites;
    if (!changements.length) break;
  }
  return courant;
}
