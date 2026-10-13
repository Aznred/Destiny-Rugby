import { POSTE_PAR_ID } from '../data/rugby.js';
import type { PosteId } from '../types.js';
import type { SourceCarte } from './ligue/catalogueCarriere.js';

export interface SaisieCarteNormale {
  nom: string; poste: PosteId; note: number; potentiel: number; age: number;
  nation: string; clubReel: string; championnat: string; pays: string;
  gender: 'male' | 'female'; photo?: string;
}
export interface DemandeCarte {
  id: string; type: 'creation' | 'correction'; sourceId?: string;
  carte: SaisieCarteNormale; message: string;
  statut: 'attente' | 'acceptee' | 'refusee'; revision: number;
  creeLe: string; decideLe?: string; reponse?: string; pseudo?: string; photoProposee?: boolean;
}
export type SaisieDemandeCarte = Pick<DemandeCarte, 'type' | 'sourceId' | 'carte' | 'message'>;

const texte = (v: unknown, max: number, nom: string) => {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(`${nom} manquant ou trop long.`);
  return v.replace(/\s+/g, ' ').trim();
};
const entier = (v: unknown, min: number, max: number, nom: string) => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new Error(`${nom} : un entier entre ${min} et ${max} est requis.`);
  return v;
};
/** Même validation pour le formulaire public, le Labo et l'API. */
export function validerCarteNormale(brut: unknown): SaisieCarteNormale {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) throw new Error('Carte invalide.');
  const b = brut as Record<string, unknown>;
  if (typeof b.poste !== 'string' || !Object.hasOwn(POSTE_PAR_ID, b.poste)) throw new Error('Poste invalide.');
  if (b.gender !== 'male' && b.gender !== 'female') throw new Error('Choisis joueur ou joueuse.');
  const carte: SaisieCarteNormale = {
    nom: texte(b.nom, 80, 'Nom'), poste: b.poste as PosteId, note: entier(b.note, 20, 99, 'Général'),
    potentiel: entier(b.potentiel, 20, 99, 'Potentiel'), age: entier(b.age, 18, 50, 'Âge'),
    nation: texte(b.nation, 80, 'Nation'), clubReel: texte(b.clubReel, 100, 'Club'),
    championnat: texte(b.championnat, 100, 'Championnat'), pays: texte(b.pays, 80, 'Pays du championnat'), gender: b.gender,
  };
  if (carte.potentiel < carte.note) throw new Error('Le potentiel doit être au moins égal au général.');
  if (b.photo !== undefined && b.photo !== '') {
    if (typeof b.photo !== 'string' || b.photo.length > 90_000) throw new Error('Photo trop volumineuse (90 Ko maximum).');
    let valide = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(b.photo)
      || (/^\/photos\/[a-zA-Z0-9_./%-]+$/.test(b.photo) && !b.photo.includes('..'));
    try { const url = new URL(b.photo); valide ||= url.protocol === 'https:' && !url.username && !url.password && b.photo.length <= 2048; } catch { /* chemin ou image importée */ }
    if (!valide) throw new Error('Photo : importe un PNG, JPEG ou WebP, ou utilise une URL HTTPS.');
    carte.photo = b.photo;
  }
  return carte;
}
export function validerDemandeCarte(brut: Record<string, unknown>): SaisieDemandeCarte {
  if (brut.type !== 'creation' && brut.type !== 'correction') throw new Error('Type de demande invalide.');
  const sourceId = brut.type === 'correction' ? texte(brut.sourceId, 250, 'Carte à corriger') : undefined;
  return { type: brut.type, sourceId, carte: validerCarteNormale(brut.carte),
    message: typeof brut.message === 'string' ? brut.message.trim().slice(0, 500) : '' };
}
export const carteNormaleVide = (): SaisieCarteNormale => ({ nom: '', poste: 'demi_melee', note: 50, potentiel: 53,
  age: 25, nation: 'France', clubReel: '', championnat: '', pays: 'France', gender: 'male' });

export function saisieDepuisSource(source: SourceCarte): SaisieCarteNormale {
  return { nom: source.nom, poste: source.poste, note: source.note, potentiel: source.potentiel, age: source.age,
    nation: source.nation, clubReel: source.clubReel, championnat: source.championnat, pays: source.pays,
    gender: source.gender ?? 'male', photo: source.photo };
}

export async function appelCartes<T>(corps?: unknown, params = ''): Promise<T> {
  const r = await fetch(`/api/carriere?demandesCartes=1${params}`, { method: corps ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: corps ? { 'Content-Type': 'application/json' } : undefined, body: corps ? JSON.stringify(corps) : undefined });
  const d = await r.json();
  if (r.status === 401) throw new Error('Connecte ton compte pour envoyer et suivre une demande de carte.');
  if (!r.ok) throw new Error(d.erreur ?? 'Opération impossible.');
  return d as T;
}
