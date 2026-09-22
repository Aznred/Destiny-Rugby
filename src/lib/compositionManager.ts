import { POSTE_PAR_ID } from '../data/rugby.js';
import type {
  CompositionManager, PosteId, TactiqueManager,
} from '../types.js';
import type { Coequipier } from './effectif.js';
import { adequationAuPoste, disponible, facteurDePerformance, type EtatDuJoueur } from './carteJoueur.js';

export const POSTES_XV_MANAGER: PosteId[] = [
  'pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g', 'deuxieme_ligne_d',
  'troisieme_aile_g', 'troisieme_aile_d', 'numero_8', 'demi_melee', 'demi_ouverture',
  'ailier_gauche', 'premier_centre', 'deuxieme_centre', 'ailier_droit', 'arriere',
];

export const POSTES_BANC_MANAGER: PosteId[] = [
  'talonneur', 'pilier_gauche', 'pilier_droit', 'deuxieme_ligne_d',
  'troisieme_aile_d', 'demi_melee', 'demi_ouverture', 'deuxieme_centre',
];

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

/**
 * Sélectionne la composition optimale pour le mode entraîneur :
 * - XV de départ (15) et banc équilibré (8) choisis parmi les joueurs disponibles.
 * - Respect strict des postes déclarés (naturel et secondaires exacts à 100% de rendement, hors-poste à 82%).
 * - Règle de rugby pour la 1ère ligne remplaçante : présence obligatoire de piliers et talonneur.
 * - Choix du meilleur buteur selon son adresse réelle au pied et du capitaine selon l'expérience et l'autorité.
 * - Prise en compte de la forme et fatigue si fournies dans `etats`.
 */
export function meilleureCompositionManager(
  effectif: Coequipier[],
  indisponibles: ReadonlySet<string> = new Set(),
  etats?: ReadonlyMap<string, EtatDuJoueur>,
): CompositionManager {
  const dispo = effectif
    .filter((j) => !indisponibles.has(j.id) && disponible(etats?.get(j.id) ?? {}))
    .sort((a, b) => b.note - a.note);

  // Si l'effectif disponible compte moins de 23 joueurs, repli par défaut
  if (dispo.length < 23) {
    return compositionManagerParDefaut(dispo, new Set());
  }

  const postes = [...POSTES_XV_MANAGER, ...POSTES_BANC_MANAGER];
  const n = 23;
  const m = dispo.length;

  const couts = postes.map((poste, i) =>
    dispo.map((j) => {
      // Postes 1..3 et 16..18 : 1ère ligne impérative (piliers / talonneurs)
      const estSlotPremiereLigne = i < 3 || (i >= 15 && i < 18);
      const familleDuSlot = POSTE_PAR_ID[poste]?.famille;
      if (estSlotPremiereLigne) {
        const peutJouerPremiereLigne = [j.poste, ...(j.postesSecondaires ?? [])].some(
          (p) => POSTE_PAR_ID[p]?.famille === familleDuSlot,
        );
        if (!peutJouerPremiereLigne) return 1e9;
      }

      const adq = adequationAuPoste(j.poste, poste, j.postesSecondaires);
      const facteur = facteurDePerformance(adq);
      const etat = etats?.get(j.id);
      const fatigue = etat?.fatigue ?? 0;
      const forme = etat?.forme ?? 50;

      // Légère modulation : la fraîcheur départage les notes proches
      const bonusForme = (forme - 50) * 0.04;
      const malusFatigue = fatigue > 70 ? (fatigue - 70) * 0.25 : 0;
      const noteAjustee = (j.note + bonusForme - malusFatigue) * facteur;

      // Titulaires prioritaires (facteur 100) par rapport au banc
      return -(noteAjustee * (i < 15 ? 100 : 1) - fatigue * 0.001);
    }),
  );

  // Algorithme hongrois (Kuhn-Munkres) rectangulaire
  const u = Array(n + 1).fill(0);
  const v = Array(m + 1).fill(0);
  const p = Array(m + 1).fill(0);
  const way = Array(m + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(m + 1).fill(Infinity);
    const used = Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (!used[j]) {
          const cur = couts[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const choix = Array<number>(23).fill(-1);
  for (let j = 1; j <= m; j++) {
    if (p[j]) choix[p[j] - 1] = j - 1;
  }

  // Si l'affectation stricte a échoué (pénurie de joueurs spécialisés en première ligne), repli par défaut
  if (choix.some((j, i) => j < 0 || couts[i][j] >= 1e9)) {
    return compositionManagerParDefaut(dispo, new Set());
  }

  const titulairesIds = choix.slice(0, 15).map((idx) => dispo[idx].id);
  const remplacantsIds = choix.slice(15, 23).map((idx) => dispo[idx].id);

  const titulaires = titulairesIds.map((id) => dispo.find((j) => j.id === id)!);
  const capitaine = [...titulaires].sort(
    (a, b) => (b.age * 1.4 + b.note) - (a.age * 1.4 + a.note),
  )[0];

  const tousAlignes = [...titulairesIds, ...remplacantsIds].map((id) => dispo.find((j) => j.id === id)!);
  const buteur = [...tousAlignes].sort(
    (a, b) => (b.jeuAuPied ?? b.note) - (a.jeuAuPied ?? a.note),
  )[0];

  return {
    titulaires: titulairesIds,
    remplacants: remplacantsIds,
    capitaineId: capitaine?.id ?? titulairesIds[0] ?? '',
    buteurId: buteur?.id ?? titulairesIds[9] ?? titulairesIds[0] ?? '',
  };
}

/**
 * Répare une ancienne composition quand l'effectif a vieilli, qu'une recrue
 * arrive ou qu'un joueur a pris sa retraite. Les choix encore valides restent.
 */
export function reconcilerCompositionManager(
  effectif: Coequipier[], composition?: Partial<CompositionManager> | null,
  indisponibles: ReadonlySet<string> = new Set(),
): CompositionManager {
  const defaut = compositionManagerParDefaut(effectif, indisponibles);
  if (!composition) return defaut;
  // ⚠️ UN BLESSÉ SORT DE LA FEUILLE, même s'il y était la semaine d'avant :
  //    sinon la composition sauvegardée le réintroduisait à chaque réconciliation.
  const ids = new Set(effectif.filter((x) => !indisponibles.has(x.id)).map((x) => x.id));
  const pris = new Set<string>();
  const remplir = (source: string[] | undefined, postes: PosteId[], secours: string[]) => postes.map((_, i) => {
    const souhaite = source?.[i];
    if (souhaite && ids.has(souhaite) && !pris.has(souhaite)) { pris.add(souhaite); return souhaite; }
    const propose = secours.find((id) => ids.has(id) && !pris.has(id));
    if (propose) { pris.add(propose); return propose; }
    const libre = effectif.find((j) => !pris.has(j.id));
    if (libre) pris.add(libre.id);
    return libre?.id ?? '';
  }).filter(Boolean);
  const titulaires = remplir(composition.titulaires, POSTES_XV_MANAGER, defaut.titulaires);
  const remplacants = remplir(composition.remplacants, POSTES_BANC_MANAGER, defaut.remplacants);
  const feuille = new Set([...titulaires, ...remplacants]);
  return {
    titulaires,
    remplacants,
    capitaineId: composition.capitaineId && titulaires.includes(composition.capitaineId)
      ? composition.capitaineId : defaut.capitaineId,
    buteurId: composition.buteurId && feuille.has(composition.buteurId)
      ? composition.buteurId : defaut.buteurId,
  };
}

/** Transforme les identifiants choisis en feuille ordonnée 1 → 23. */
export function feuilleDepuisComposition(
  effectif: Coequipier[], composition: CompositionManager,
): Coequipier[] {
  const parId = new Map(effectif.map((j) => [j.id, j]));
  const ligne = (ids: string[], postes: PosteId[]) => ids.map((id, i) => {
    const joueur = parId.get(id);
    return joueur ? { ...joueur, poste: postes[i] ?? joueur.poste } : null;
  }).filter(Boolean) as Coequipier[];
  return [
    ...ligne(composition.titulaires, POSTES_XV_MANAGER),
    ...ligne(composition.remplacants, POSTES_BANC_MANAGER),
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
