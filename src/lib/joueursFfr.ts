import { CLUBS_AMATEURS, EFFECTIFS_AMATEURS, POSTES_AMATEURS } from '../data/amateurs.js';
import { PHOTOS_FFR_PAR_ID, PHOTOS_FFR_SUPPLEMENTAIRES } from '../data/photosFfr.js';
import type { FamillePoste, PosteId } from '../types.js';

const POSTES_NUMEROS: PosteId[] = ['pilier_gauche', 'talonneur', 'pilier_droit',
  'deuxieme_ligne_g', 'deuxieme_ligne_d', 'troisieme_aile_g', 'troisieme_aile_d',
  'numero_8', 'demi_melee', 'demi_ouverture', 'ailier_gauche', 'premier_centre',
  'deuxieme_centre', 'ailier_droit', 'arriere'];
export const normaliserNomFfr = (nom: string): string => nom.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export interface JoueurFfr {
  nom: string;
  famille: FamillePoste | null;
  poste?: PosteId;
  postesSecondaires: PosteId[];
  ffrId?: number;
  photo?: string;
}
const cache = new Map<string, JoueurFfr[]>();
const structures = new Map(Object.values(CLUBS_AMATEURS).flat().map(c => [c.nom, c.structureId]));

/** L'ordre des licenciés est conservé : leurs identifiants de carrière restent stables. */
export function joueursFfrDuClub(club: string): readonly JoueurFfr[] {
  const connus = cache.get(club); if (connus) return connus;
  const supplement = PHOTOS_FFR_SUPPLEMENTAIRES[structures.get(club) ?? ''] ?? {};
  const liste: JoueurFfr[] = (EFFECTIFS_AMATEURS[club] ?? '').split('~').filter(Boolean).map(entree => {
    const [nom, famille, numeros = '', identifiant = ''] = entree.split('|');
    const postes = numeros.split(',').filter(Boolean).map(n => POSTES_NUMEROS[Number(n) - 1]).filter(Boolean);
    const ffrId = identifiant ? Number(identifiant) : undefined;
    return { nom, famille: famille === '' ? null : POSTES_AMATEURS[Number(famille)] ?? null,
      poste: postes[0], postesSecondaires: postes.slice(1), ffrId,
      photo: (ffrId ? PHOTOS_FFR_PAR_ID[ffrId] : undefined) ?? supplement[normaliserNomFfr(nom)] };
  });
  // Les sept portraits nominatifs de Palavas absents de l'export complètent
  // son effectif. Aucun poste ni identifiant FFR ne leur est attribué ici.
  const noms = new Set(liste.map(j => normaliserNomFfr(j.nom)));
  for (const [nom, photo] of Object.entries(supplement).sort(([a], [b]) => a.localeCompare(b))) if (!noms.has(nom)) {
    liste.push({ nom: nom.replace(/(^| )[a-z]/g, lettre => lettre.toUpperCase()),
      famille: null, postesSecondaires: [], photo });
  }
  cache.set(club, liste); return liste;
}

let profilsParNom: Map<string, JoueurFfr | null> | undefined;
export function profilJoueurFfr(nom: string, club?: string): JoueurFfr | undefined {
  const cle = normaliserNomFfr(nom);
  if (club && structures.has(club)) {
    const candidats = joueursFfrDuClub(club).filter(j => normaliserNomFfr(j.nom) === cle);
    return candidats.length === 1 ? candidats[0] : undefined;
  }
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
