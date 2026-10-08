import { CLUBS_AMATEURS, EFFECTIFS_AMATEURS, POSTES_AMATEURS } from '../data/amateurs.js';
import { PHOTOS_FFR_PAR_ID, PHOTOS_FFR_SUPPLEMENTAIRES } from '../data/photosFfr.js';
import { PHOTOS_DETOUREES_PAR_CLUB, PHOTOS_DETOUREES_PAR_ID, JOUEURS_DETOURES_SUPPLEMENTAIRES } from '../data/photosDetourees.js';
import type { FamillePoste, PosteId } from '../types.js';

const POSTES_NUMEROS: PosteId[] = ['pilier_gauche', 'talonneur', 'pilier_droit',
  'deuxieme_ligne_g', 'deuxieme_ligne_d', 'troisieme_aile_g', 'troisieme_aile_d',
  'numero_8', 'demi_melee', 'demi_ouverture', 'ailier_gauche', 'premier_centre',
  'deuxieme_centre', 'ailier_droit', 'arriere'];
export const normaliserNomFfr = (nom: string): string => nom.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export interface JoueurFfr {
  /** Rang dans l'export complet, stable pour les effectifs et sauvegardes. */
  indexSource: number;
  nom: string;
  famille: FamillePoste | null;
  poste?: PosteId;
  postesSecondaires: PosteId[];
  ffrId?: number;
  photo?: string;
}
const cache = new Map<string, JoueurFfr[]>();
const structures = new Map(Object.values(CLUBS_AMATEURS).flat().map(c => [c.nom, c.structureId]));

/** Les emplacements retirés restent vides pour préserver les indices des sauvegardes. */
export function joueursFfrDuClub(club: string): readonly JoueurFfr[] {
  const connus = cache.get(club); if (connus) return connus;
  const supplement = PHOTOS_FFR_SUPPLEMENTAIRES[structures.get(club) ?? ''] ?? {};
  const liste: JoueurFfr[] = (EFFECTIFS_AMATEURS[club] ?? '').split('~').map((entree, indexSource) => {
    const [nom, famille, numeros = '', identifiant = ''] = entree.split('|');
    const postes = numeros.split(',').filter(Boolean).map(n => POSTES_NUMEROS[Number(n) - 1]).filter(Boolean);
    const ffrId = identifiant ? Number(identifiant) : undefined;
    return { nom, indexSource, famille: famille === '' ? null : POSTES_AMATEURS[Number(famille)] ?? null,
      poste: postes[0], postesSecondaires: postes.slice(1), ffrId,
      photo: PHOTOS_DETOUREES_PAR_CLUB[club]?.[normaliserNomFfr(nom)] ?? (ffrId ? PHOTOS_DETOUREES_PAR_ID[ffrId] ?? PHOTOS_FFR_PAR_ID[ffrId] : undefined) ?? supplement[normaliserNomFfr(nom)] };
  }).filter(j => j.nom.trim().length > 0);
  // Les sept portraits nominatifs de Palavas absents de l'export complètent
  // son effectif. Aucun poste ni identifiant FFR ne leur est attribué ici.
  const noms = new Set(liste.map(j => normaliserNomFfr(j.nom)));
  for (const [nom, photo] of Object.entries(supplement).sort(([a], [b]) => a.localeCompare(b))) if (!noms.has(nom)) {
    liste.push({ indexSource: liste.length, nom: nom.replace(/(^| )[a-z]/g, lettre => lettre.toUpperCase()),
      famille: null, postesSecondaires: [], photo });
    noms.add(nom);
  }
  // Les portraits nouveaux complètent les effectifs après les identités existantes.
  for (const [cle, j] of Object.entries(JOUEURS_DETOURES_SUPPLEMENTAIRES[club] ?? {}).sort(([a], [b]) => a.localeCompare(b))) if (!noms.has(cle)) {
    liste.push({ indexSource: liste.length, nom: j.nom, famille: null, postesSecondaires: [], photo: j.photo });
    noms.add(cle);
  }
  // Les effectifs et le catalogue attribuent un poste de jeu déterministe
  // aux profils non renseignés, sans modifier leur identité dans la source.
  cache.set(club, liste); return liste;
}

let profilsParNom: Map<string, JoueurFfr | null> | undefined;
export function profilJoueurFfr(nom: string, club?: string): JoueurFfr | undefined {
  const cle = normaliserNomFfr(nom);
  if (club && structures.has(club)) {
    const candidats = joueursFfrDuClub(club).filter(j => normaliserNomFfr(j.nom) === cle);
    return candidats.length === 1 ? candidats[0] : undefined;
  }
  // ⚠️ UN NOM SEUL NE DÉSIGNE PERSONNE (Correctif 24, audit des postes). Quand le club demandé n'était pas une structure
  // FFR (tout le Top 14, la Pro D2, l'étranger), on cherchait ce nom dans TOUTE la France amateur : s'il n'y avait qu'un
  // licencié de ce nom, le professionnel héritait de son poste et de son portrait. Arthur Retière (UBB) devenait
  // deuxième ligne parce qu'un Arthur Retière joue deuxième ligne à Clisson ; 95 professionnels avaient ainsi changé de
  // famille de poste depuis l'import FFR du 1ᵉʳ octobre. Un club demandé et inconnu ne rend donc plus rien.
  if (club) return undefined;
  if (!profilsParNom) {
    profilsParNom = new Map();
    for (const c of structures.keys()) for (const j of joueursFfrDuClub(c)) {
      const identite = normaliserNomFfr(j.nom);
      profilsParNom.set(identite, profilsParNom.has(identite) ? null : j);
    }
  }
  return profilsParNom.get(cle) ?? undefined;
}

let photosParNom: Map<string, string | null> | undefined;
const photosParClub = new Map<string, Map<string, string | null>>();
function ajouter(table: Map<string, string | null>, nom: string, photo?: string): void {
  const cle = normaliserNomFfr(nom);
  if (table.has(cle)) table.set(cle, null);
  else table.set(cle, photo ?? null);
}
/** Recherche exacte : les homonymes restent sans portrait en l'absence de club. */
export function photoJoueurFfr(nom: string, club?: string): string | undefined {
  const detouree = club ? PHOTOS_DETOUREES_PAR_CLUB[club]?.[normaliserNomFfr(nom)] : undefined;
  if (detouree) return detouree;
  if (club && structures.has(club)) {
    let table = photosParClub.get(club);
    if (!table) {
      table = new Map();
      for (const j of joueursFfrDuClub(club)) ajouter(table, j.nom, j.photo);
      for (const [cle, photo] of Object.entries(PHOTOS_FFR_SUPPLEMENTAIRES[structures.get(club)!] ?? {})) {
        if (!table.has(cle)) table.set(cle, photo);
      }
      photosParClub.set(club, table);
    }
    return table.get(normaliserNomFfr(nom)) ?? undefined;
  }
  if (!photosParNom) {
    photosParNom = new Map();
    for (const c of structures.keys()) for (const j of joueursFfrDuClub(c)) ajouter(photosParNom, j.nom, j.photo);
  }
  return photosParNom.get(normaliserNomFfr(nom)) ?? undefined;
}
