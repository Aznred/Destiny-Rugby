import { POSTE_PAR_ID } from '../data/rugby.js';
import type {
  CompositionManager, PosteId, TactiqueManager,
} from '../types.js';
import type { Coequipier } from './effectif.js';
import type { RolesEquipe } from './moteur/responsabilites.js';
import { rendementAuPoste } from './carteJoueur.js';

export const POSTES_XV_MANAGER: PosteId[] = [
  'pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g', 'deuxieme_ligne_d',
  'troisieme_aile_g', 'troisieme_aile_d', 'numero_8', 'demi_melee', 'demi_ouverture',
  'ailier_gauche', 'premier_centre', 'deuxieme_centre', 'ailier_droit', 'arriere',
];

export const POSTES_BANC_MANAGER: PosteId[] = [
  'talonneur', 'pilier_gauche', 'pilier_droit', 'deuxieme_ligne_d',
  'troisieme_aile_d', 'demi_melee', 'demi_ouverture', 'deuxieme_centre',
];

/**
 * CE QUE CHAQUE PLACE DU BANC DOIT COUVRIR, dans l'ordre de `POSTES_BANC_MANAGER` (16 à 23) : première ligne, cage,
 * troisième ligne, charnière, lignes arrière. Le premier poste de la liste est celui qu'on cherche ; les suivants
 * dépannent presque aussi bien (un pilier de l'autre côté, un arrière à la place d'un centre).
 */
export const COUVERTURE_BANC: readonly (readonly PosteId[])[] = [
  ['talonneur'],
  ['pilier_gauche', 'pilier_droit'],
  ['pilier_droit', 'pilier_gauche'],
  ['deuxieme_ligne_d', 'deuxieme_ligne_g'],
  ['troisieme_aile_d', 'troisieme_aile_g', 'numero_8'],
  ['demi_melee'],
  ['demi_ouverture'],
  ['deuxieme_centre', 'premier_centre', 'ailier_gauche', 'ailier_droit', 'arriere'],
];

/** Le mieux placé pour ces postes : la note, pesée par le rendement au poste (`rendementAuPoste`). */
function meilleurPour(candidats: Coequipier[], postes: readonly PosteId[]): Coequipier | undefined {
  let choisi: Coequipier | undefined;
  let valeur = -Infinity;
  for (const j of candidats) {
    const v = Math.max(...postes.map((p, rang) => j.note * rendementAuPoste(j.poste, p, j.postesSecondaires) * (rang ? .97 : 1)));
    if (v > valeur) { valeur = v; choisi = j; }
  }
  return choisi;
}

export const TACTIQUE_MANAGER_DEFAUT: TactiqueManager = {
  attaque: 'equilibre',
  defense: 'glissee',
  rythme: 'normal',
  penalites: 'mixte',
  remplacements: 'standard',
};

function memeFamille(a: PosteId, b: PosteId): boolean {
  return POSTE_PAR_ID[a]?.famille === POSTE_PAR_ID[b]?.famille;
}

function memeCategorie(a: PosteId, b: PosteId): boolean {
  return POSTE_PAR_ID[a]?.categorie === POSTE_PAR_ID[b]?.categorie;
}

function prendre(
  effectif: Coequipier[], pris: Set<string>, poste: PosteId,
): Coequipier | undefined {
  const libres = effectif.filter((j) => !pris.has(j.id)).sort((a, b) => b.note - a.note);
  const joueur = libres.find((j) => j.poste === poste)
    ?? libres.find((j) => memeFamille(j.poste, poste))
    ?? libres.find((j) => j.postesSecondaires?.includes(poste))
    ?? libres.find((j) => j.postesSecondaires?.some((p) => memeFamille(p, poste)))
    ?? libres.find((j) => memeCategorie(j.poste, poste))
    ?? libres[0];
  if (joueur) pris.add(joueur.id);
  return joueur;
}

/**
 * La feuille par défaut — sans les blessés.
 *
 * ⚠️ `indisponibles` EST LA CORRECTION. Le dossier médical existait, personne
 * ne le lisait : on pouvait aligner un joueur absent six semaines, et rien ne
 * l'indiquait. Les blessés sont désormais mis de côté comme s'ils n'étaient pas
 * dans le groupe — le remplaçant naturel prend la place, comme pour un retraité.
 */
export function compositionManagerParDefaut(
  effectif: Coequipier[], indisponibles: ReadonlySet<string> = new Set(),
): CompositionManager {
  const dispo = indisponibles.size ? effectif.filter((j) => !indisponibles.has(j.id)) : effectif;
  const pris = new Set<string>();
  const titulaires = POSTES_XV_MANAGER.map((poste) => prendre(dispo, pris, poste)?.id ?? '').filter(Boolean);
  const remplacants = POSTES_BANC_MANAGER.map((poste) => prendre(dispo, pris, poste)?.id ?? '').filter(Boolean);
  const joueurs = [...titulaires, ...remplacants].map((id) => dispo.find((j) => j.id === id)).filter(Boolean) as Coequipier[];
  // Le rôle dépend de l'adresse réelle au pied, pas du GEN ni du numéro 10.
  // Le GEN reste uniquement le repli des anciens effectifs sans statistique.
  const buteur = [...joueurs].sort((a, b) => (b.jeuAuPied ?? b.note) - (a.jeuAuPied ?? a.note))[0];
  const capitaine = [...titulaires]
    .map((id) => effectif.find((j) => j.id === id))
    .filter(Boolean)
    .sort((a, b) => (b!.age * 1.4 + b!.note) - (a!.age * 1.4 + a!.note))[0];
  return {
    titulaires,
    remplacants,
    capitaineId: capitaine?.id ?? titulaires[0] ?? '',
    buteurId: buteur?.id ?? titulaires[9] ?? titulaires[0] ?? '',
  };
}

// « Meilleure équipe » et la composition déléguée : `composerParLAdjoint` (lib/adjointComposition.ts), une seule
// affectation pour le bouton de l'écran et pour l'adjoint (Correctif 41).

/**
 * Répare une ancienne composition quand l'effectif a vieilli, qu'une recrue
 * arrive ou qu'un joueur a pris sa retraite. Les choix encore valides restent.
 */
export function reconcilerCompositionManager(
  effectif: Coequipier[], composition?: Partial<CompositionManager> | null,
  indisponibles: ReadonlySet<string> = new Set(),
  bancSeulement: ReadonlySet<string> = new Set(),
): CompositionManager {
  const defaut = compositionManagerParDefaut(effectif, new Set([...indisponibles, ...bancSeulement]));
  composition ??= defaut;
  // ⚠️ UN BLESSÉ SORT DE LA FEUILLE, même s'il y était la semaine d'avant :
  //    sinon la composition sauvegardée le réintroduisait à chaque réconciliation.
  const ids = new Set(effectif.filter((x) => !indisponibles.has(x.id)).map((x) => x.id));
  // ⚠️ UN TROU SE COMBLE PAR LE MEILLEUR AU POSTE (Correctif 41). Il était comblé par le premier titulaire de la feuille
  //    par défaut encore libre, sans regarder la place à tenir : sur une feuille retouchée par l'entraîneur, l'ouvreur
  //    blessé pouvait être remplacé par un talonneur. Les choix encore valides restent où ils sont ; un remplaçant
  //    monte dans le XV s'il est le mieux placé, et sa place sur le banc est comblée à son tour.
  const vus = new Set<string>();
  const garder = (source: string[] | undefined, postes: PosteId[], titulaire: boolean) => postes.map((_, i) => {
    const id = source?.[i];
    if (!id || !ids.has(id) || vus.has(id) || (titulaire && bancSeulement.has(id))) return '';
    vus.add(id);
    return id;
  });
  const xv = garder(composition.titulaires, POSTES_XV_MANAGER, true);
  const banc = garder(composition.remplacants, POSTES_BANC_MANAGER, false);
  const dansLeXV = new Set(xv.filter(Boolean));
  xv.forEach((id, i) => {
    if (id) return;
    const choisi = meilleurPour(effectif.filter((j) => ids.has(j.id) && !dansLeXV.has(j.id) && !bancSeulement.has(j.id)), [POSTES_XV_MANAGER[i]]);
    if (!choisi) return;
    xv[i] = choisi.id;
    dansLeXV.add(choisi.id);
    const place = banc.indexOf(choisi.id);
    if (place >= 0) banc[place] = '';
  });
  const pris = new Set([...dansLeXV, ...banc.filter(Boolean)]);
  banc.forEach((id, i) => {
    if (id) return;
    const choisi = meilleurPour(effectif.filter((j) => ids.has(j.id) && !pris.has(j.id)), COUVERTURE_BANC[i] ?? COUVERTURE_BANC[COUVERTURE_BANC.length - 1]);
    if (!choisi) return;
    banc[i] = choisi.id;
    pris.add(choisi.id);
  });
  const titulaires = xv.filter(Boolean);
  const remplacants = banc.filter(Boolean);
  const feuille = new Set([...titulaires, ...remplacants]);
  // Les autres rôles (Correctif 17) : on garde ceux dont le joueur est toujours sur la feuille, les autres retombent en « automatique ».
  const autres: Partial<CompositionManager> = {};
  for (const champ of CHAMPS_ROLES_COMPOSITION) {
    const id = composition[champ];
    if (id && feuille.has(id)) autres[champ] = id;
  }
  return {
    titulaires,
    remplacants,
    capitaineId: composition.capitaineId && titulaires.includes(composition.capitaineId)
      ? composition.capitaineId : titulaires.includes(defaut.capitaineId) ? defaut.capitaineId : titulaires[0] ?? '',
    buteurId: composition.buteurId && feuille.has(composition.buteurId)
      ? composition.buteurId : feuille.has(defaut.buteurId) ? defaut.buteurId : titulaires[0] ?? remplacants[0] ?? '',
    ...autres,
  };
}

/** Les rôles de la composition au-delà du capitaine et du buteur, et le rôle du moteur qu'ils désignent (Correctif 17). */
export const CHAMPS_ROLES_COMPOSITION = [
  'viceCapitaineId', 'buteur2Id', 'engagementId', 'droppeurId', 'lanceurId', 'lanceur2Id',
] as const;

/** Ce que la composition impose au moteur : un identifiant par rôle, seulement ceux qui sont choisis. */
export function rolesImposesParLaComposition(c: CompositionManager): RolesEquipe {
  const roles: RolesEquipe = {};
  if (c.capitaineId) roles.capitaine = c.capitaineId;
  if (c.buteurId) roles.buteur = c.buteurId;
  if (c.viceCapitaineId) roles.viceCapitaine = c.viceCapitaineId;
  if (c.buteur2Id) roles.buteur2 = c.buteur2Id;
  if (c.engagementId) roles.engagement = c.engagementId;
  if (c.droppeurId) roles.droppeur = c.droppeurId;
  if (c.lanceurId) roles.lanceur = c.lanceurId;
  if (c.lanceur2Id) roles.lanceur2 = c.lanceur2Id;
  return roles;
}

/** Transforme les identifiants choisis en feuille ordonnée 1 → 23. */
export function feuilleDepuisComposition(
  effectif: Coequipier[], composition: CompositionManager,
): Coequipier[] {
  const parId = new Map(effectif.map((j) => [j.id, j]));
  const ligne = (ids: string[], postes: PosteId[] | null) => ids.map((id, i) => {
    const joueur = parId.get(id);
    return joueur ? { ...joueur, poste: postes?.[i] ?? joueur.poste } : null;
  }).filter(Boolean) as Coequipier[];
  return [
    ...ligne(composition.titulaires, POSTES_XV_MANAGER),
    // ⚠️ LE BANC GARDE SES POSTES (Correctif 33). Le moteur fait entrer un remplaçant à la place d'un titulaire de SON
    // poste : lui donner le poste de sa place sur le banc (16 = talonneur…) faisait entrer un ailier en première ligne.
    ...ligne(composition.remplacants, null),
  ];
}

export function noteCompositionManager(effectif: Coequipier[], composition: CompositionManager): number {
  const parId = new Map(effectif.map((j) => [j.id, j]));
  const notes = composition.titulaires.map((id) => parId.get(id)?.note).filter((n): n is number => n != null);
  return notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : 0;
}

export function joueurCompatibleManager(joueur: Coequipier, poste: PosteId): boolean {
  return joueur.poste === poste || memeFamille(joueur.poste, poste)
    || joueur.postesSecondaires?.some((p) => p === poste || memeFamille(p, poste))
    || memeCategorie(joueur.poste, poste);
}

/**
 * ⚠️ LE PLANCHER D'EFFECTIF — « on peut vendre tout l'effectif sans problème ».
 *
 * Vingt-trois, c'est la feuille de match ; vingt-six laisse trois joueurs de
 * marge, c'est-à-dire de quoi encaisser une blessure et une suspension sans se
 * retrouver à composer avec des trous. En dessous, `composerParDefaut` rendait
 * une feuille incomplète — sans erreur, sans message, et le match se jouait à
 * quatorze.
 *
 * ⚠️ IL VIT ICI, avec les quinze postes et les huit profils de banc, parce que
 * c'est le fichier qui fait autorité sur « ce qu'il faut pour aligner une
 * équipe ». Posé dans le store, il serait un nombre magique de plus.
 */
export const EFFECTIF_MINIMUM = 26;

/**
 * Le plancher de VENTE — et ce n’est PAS le même nombre que celui du dessus.
 *
 * ⚠️ LES DEUX ONT LONGTEMPS VALU 26, ET C’ÉTAIT UN BUG BLOQUANT.
 * `completerEffectif` (lib/effectif.ts) complète TOUT groupe jusqu’à 26 avec
 * des joueurs inventés : un club modeste en compte donc exactement 26, jamais
 * moins. Le garde de vente, lui, refusait dès `restants <= 26`. Résultat :
 * dans un club rempli au minimum — c’est-à-dire la majorité des clubs
 * amateurs — **on ne pouvait vendre absolument personne**, et le refus
 * s’expliquait par un message qui n’avait aucun sens (« il te faut 26
 * joueurs » alors qu’on en avait 26).
 *
 * ⚠️ ET LE REMPLISSAGE REND CE PLANCHER SÛR. Puisque le groupe est complété
 * à 26 quoi qu’il arrive, vendre ne peut PAS empêcher d’aligner une équipe :
 * le club remplace le partant par un joueur de complément, plus faible. La
 * sanction est sportive, pas administrative — c’est ce qu’on veut.
 *
 * Vingt-trois, c’est la feuille de match : en dessous, on jouerait vraiment
 * à moins de quinze plus le banc.
 */
export const EFFECTIF_MINIMUM_VENTE = 23;
