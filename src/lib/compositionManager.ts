import { POSTE_PAR_ID } from '../data/rugby';
import type {
  CompositionManager, PosteId, TactiqueManager,
} from '../types';
import type { Coequipier } from './effectif';

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
    ?? libres.find((j) => memeCategorie(j.poste, poste))
    ?? libres[0];
  if (joueur) pris.add(joueur.id);
  return joueur;
}

export function compositionManagerParDefaut(effectif: Coequipier[]): CompositionManager {
  const pris = new Set<string>();
  const titulaires = POSTES_XV_MANAGER.map((poste) => prendre(effectif, pris, poste)?.id ?? '').filter(Boolean);
  const remplacants = POSTES_BANC_MANAGER.map((poste) => prendre(effectif, pris, poste)?.id ?? '').filter(Boolean);
  const joueurs = [...titulaires, ...remplacants].map((id) => effectif.find((j) => j.id === id)).filter(Boolean) as Coequipier[];
  const buteur = [...joueurs].sort((a, b) => {
    const bonus = (j: Coequipier) => j.poste === 'demi_ouverture' ? 8 : j.poste === 'arriere' ? 5 : j.poste === 'demi_melee' ? 3 : 0;
    return (b.note + bonus(b)) - (a.note + bonus(a));
  })[0];
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
 * Répare une ancienne composition quand l'effectif a vieilli, qu'une recrue
 * arrive ou qu'un joueur a pris sa retraite. Les choix encore valides restent.
 */
export function reconcilerCompositionManager(
  effectif: Coequipier[], composition?: Partial<CompositionManager> | null,
): CompositionManager {
  const defaut = compositionManagerParDefaut(effectif);
  if (!composition) return defaut;
  const ids = new Set(effectif.map((j) => j.id));
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
  return joueur.poste === poste || memeFamille(joueur.poste, poste) || memeCategorie(joueur.poste, poste);
}
