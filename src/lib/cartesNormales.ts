import { POSTE_PAR_ID } from '../data/rugby.js';
import type { PosteId } from '../types.js';
import type { SourceCarte } from './ligue/catalogueCarriere.js';

export interface SaisieCarteNormale {
  nom: string; poste: PosteId; note: number; potentiel: number; age: number;
  nation: string; clubReel: string; championnat: string; pays: string;
  gender: 'male' | 'female'; photo?: string;
}
export interface PropositionClub {
  nom: string;
  division: string;
  ville?: string;
  pays?: string;
  logo?: string;
  c1?: string;
  c2?: string;
  joueurs: SaisieCarteNormale[];
}
export interface DemandeCarte {
  id: string; type: 'creation' | 'correction' | 'club' | 'retrait'; sourceId?: string;
  carte: SaisieCarteNormale; clubPropose?: PropositionClub; message: string;
  statut: 'attente' | 'acceptee' | 'refusee'; revision: number;
  creeLe: string; decideLe?: string; reponse?: string; pseudo?: string; photoProposee?: boolean;
  droitsCertifies?: boolean;
}
export interface SaisieDemandeCarte {
  type: 'creation' | 'correction' | 'club' | 'retrait';
  sourceId?: string;
  carte: SaisieCarteNormale;
  clubPropose?: PropositionClub;
  message: string;
  droitsCertifies: boolean;
}

export const MAX_JOUEURS_CLUB_PROPOSE = 30;

/** L'identité du club reste commune à tout l'effectif, même après une correction du nom. */
export function joueurDuClubPropose(joueur: SaisieCarteNormale, club: Pick<PropositionClub, 'nom' | 'division' | 'pays'>): SaisieCarteNormale {
  return { ...joueur, clubReel: club.nom, championnat: club.division, pays: club.pays || 'France' };
}

/** Le premier joueur de chaque poste occupe le XV ; les autres restent dans le groupe. */
export function compositionClubPropose(joueurs: SaisieCarteNormale[]) {
  const postes = new Set<string>();
  const titulaires: number[] = [], remplacants: number[] = [];
  joueurs.forEach((joueur, index) => {
    if (postes.has(joueur.poste)) remplacants.push(index);
    else { postes.add(joueur.poste); titulaires.push(index); }
  });
  return { titulaires, remplacants };
}

export function titulariserJoueurClubPropose(joueurs: SaisieCarteNormale[], index: number): SaisieCarteNormale[] {
  if (!joueurs[index]) return joueurs;
  const suivants = [...joueurs];
  const [joueur] = suivants.splice(index, 1);
  const titulaire = suivants.findIndex(j => j.poste === joueur.poste);
  suivants.splice(titulaire < 0 ? 0 : titulaire, 0, joueur);
  return suivants;
}

/** Les listes gardent les effectifs et leurs compteurs ; les images se lisent dans le détail. */
export function demandeCarteSansImages(demande: DemandeCarte): DemandeCarte {
  const { photo, clubPropose: embarque, ...carte } = demande.carte as SaisieCarteNormale & { clubPropose?: PropositionClub };
  const club = demande.clubPropose ?? embarque;
  return { ...demande, carte,
    photoProposee: demande.photoProposee || !!photo || !!club?.logo || !!club?.joueurs.some(j => j.photo),
    clubPropose: club ? { ...club, logo: undefined, joueurs: club.joueurs.map(({ photo: _photo, ...joueur }) => joueur) } : undefined };
}

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
    try { const url = new URL(b.photo); valide ||= (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password && b.photo.length <= 2048; } catch { /* chemin ou image importée */ }
    if (!valide) throw new Error('Photo : importe un PNG, JPEG ou WebP, ou utilise une URL.');
    carte.photo = b.photo;
  }
  return carte;
}

export function validerClubPropose(brut: unknown): PropositionClub {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) throw new Error('Proposition de club invalide.');
  const b = brut as Record<string, unknown>;
  const nom = texte(b.nom, 100, 'Nom du club');
  const division = texte(b.division, 100, 'Division');
  const ville = b.ville ? texte(b.ville, 80, 'Ville') : undefined;
  const pays = b.pays ? texte(b.pays, 80, 'Pays') : 'France';
  let logo: string | undefined;
  if (b.logo !== undefined && b.logo !== '') {
    if (typeof b.logo !== 'string' || b.logo.length > 90_000) throw new Error('Logo trop volumineux (90 Ko maximum).');
    let valide = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(b.logo)
      || (/^\/logos\/[a-zA-Z0-9_./%-]+$/.test(b.logo) && !b.logo.includes('..'));
    try { const url = new URL(b.logo); valide ||= (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password && b.logo.length <= 2048; } catch { /* format base64 */ }
    if (!valide) throw new Error('Logo : importe un PNG, JPEG ou WebP, ou utilise une URL.');
    logo = b.logo;
  }
  const c1 = typeof b.c1 === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(b.c1) ? b.c1 : '#1e3a8a';
  const c2 = typeof b.c2 === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(b.c2) ? b.c2 : '#ffd700';
  const joueurs: SaisieCarteNormale[] = [];
  if (Array.isArray(b.joueurs)) {
    if (b.joueurs.length > MAX_JOUEURS_CLUB_PROPOSE) throw new Error('Un effectif proposé peut contenir 30 joueurs maximum.');
    for (const j of b.joueurs) {
      if (j && typeof j === 'object') {
        const jObj = j as Record<string, unknown>;
        joueurs.push(validerCarteNormale({
          ...jObj,
          clubReel: nom, championnat: division, pays,
        }));
      }
    }
  }
  return { nom, division, ville, pays, logo, c1, c2, joueurs };
}

export function validerDemandeCarte(brut: Record<string, unknown>): SaisieDemandeCarte {
  if (brut.type !== 'creation' && brut.type !== 'correction' && brut.type !== 'club' && brut.type !== 'retrait') throw new Error('Type de demande invalide.');
  if (brut.droitsCertifies === false) {
    if (brut.type === 'retrait') throw new Error("Tu dois certifier sur l'honneur ta demande de retrait de carte.");
    throw new Error("Tu dois certifier avoir les droits d'utilisation de l'image postée ou des images postées.");
  }
  const sourceId = (brut.type === 'correction' || brut.type === 'retrait')
    ? texte(brut.sourceId, 250, brut.type === 'retrait' ? 'Carte à retirer' : 'Carte à corriger')
    : undefined;
  let clubPropose: PropositionClub | undefined;
  let carte: SaisieCarteNormale;

  if (brut.type === 'club') {
    clubPropose = validerClubPropose(brut.clubPropose);
    if (clubPropose.joueurs.length > 0) {
      carte = clubPropose.joueurs[0];
    } else {
      carte = {
        nom: clubPropose.nom,
        poste: 'demi_ouverture',
        note: 60,
        potentiel: 65,
        age: 24,
        nation: clubPropose.pays || 'France',
        clubReel: clubPropose.nom,
        championnat: clubPropose.division,
        pays: clubPropose.pays || 'France',
        gender: 'male',
      };
    }
  } else if (brut.type === 'retrait') {
    if (brut.carte && typeof brut.carte === 'object') {
      try {
        carte = validerCarteNormale(brut.carte);
      } catch {
        const c = brut.carte as Record<string, unknown>;
        carte = {
          nom: typeof c.nom === 'string' && c.nom.trim() ? c.nom.trim().slice(0, 80) : 'Joueur à retirer',
          poste: 'demi_ouverture',
          note: typeof c.note === 'number' ? c.note : 50,
          potentiel: 50,
          age: 25,
          nation: 'France',
          clubReel: typeof c.clubReel === 'string' ? c.clubReel.slice(0, 80) : '',
          championnat: typeof c.championnat === 'string' ? c.championnat.slice(0, 80) : '',
          pays: 'France',
          gender: 'male',
        };
      }
    } else {
      carte = {
        nom: 'Joueur à retirer',
        poste: 'demi_ouverture',
        note: 50,
        potentiel: 50,
        age: 25,
        nation: 'France',
        clubReel: '',
        championnat: '',
        pays: 'France',
        gender: 'male',
      };
    }
  } else {
    carte = validerCarteNormale(brut.carte);
  }

  const aImage = Boolean(carte.photo || clubPropose?.logo || clubPropose?.joueurs.some(j => j.photo));
  if (aImage && brut.droitsCertifies === false) {
    throw new Error("Tu dois certifier avoir les droits d'utilisation de l'image postée ou des images postées.");
  }

  return {
    type: brut.type,
    sourceId,
    carte,
    clubPropose,
    droitsCertifies: brut.droitsCertifies !== false,
    message: typeof brut.message === 'string' ? brut.message.trim().slice(0, 500) : '',
  };
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
