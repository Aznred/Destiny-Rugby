import type { SourceCarte } from './ligue/catalogueCarriere.js';
import { cleCarteSolo, type EtatCollectionSolo } from './collectionSolo.js';
import { POSTES } from '../data/rugby.js';
import type { Coequipier } from './effectif.js';
import type { PosteId } from '../types.js';

export interface JoueurCollectionAmical {
  id: string;
  sourceId: string;
  nom: string;
  numero: number;
  poste: PosteId;
  note: number;
  vitesse: number;
  force: number;
  passe: number;
  plaquage: number;
  endurance: number;
  jeuAuPied: number;
  photo?: string;
  clubReel?: string;
  nation?: string;
}

export interface EquipeAmical {
  nom: string;
  couleur: string;
  embleme?: string;
  joueurs: JoueurCollectionAmical[];
  noteMoyenne: number;
}

export interface InputAmical {
  dx: number;
  dy: number;
  sprint: boolean;
  action?: 'passeGauche' | 'passeDroite' | 'passe' | 'plaquage' | 'pied' | 'changer';
  temps: number;
}

export interface SalonAmicalVue {
  code: string;
  creeLe: number;
  statut: 'attente' | 'pret' | 'en_cours' | 'termine';
  hote: {
    pseudo: string;
    equipe: EquipeAmical;
    enLigne: boolean;
  };
  invite?: {
    pseudo: string;
    equipe: EquipeAmical;
    enLigne: boolean;
  };
}

/**
 * Compose automatiquement le meilleur XV de départ à partir des cartes possédées
 * dans la collection solo de l'utilisateur. Si un poste est vacant, complète avec
 * un joueur équilibré de façon à garantir une équipe de 15 joueurs prête à jouer.
 */
export function composerEquipeDepuisCollection(
  nomEquipe: string,
  couleur: string,
  collection: EtatCollectionSolo,
  catalogue: readonly SourceCarte[],
  embleme?: string,
): EquipeAmical {
  const possedees = catalogue.filter((c) => (collection.quantites[cleCarteSolo(c.sourceId)] ?? 0) > 0)
    .sort((a, b) => b.note - a.note);

  const utilisees = new Set<string>();
  const joueurs: JoueurCollectionAmical[] = [];

  for (const posteInfo of POSTES) {
    // 1. Cherche une carte possédée du poste exact
    let carte = possedees.find((c) => !utilisees.has(c.sourceId) && c.poste === posteInfo.id);

    // 2. Repli : même famille de poste
    if (!carte) {
      carte = possedees.find((c) => !utilisees.has(c.sourceId) && c.famille === posteInfo.famille);
    }

    // 3. Repli : poste secondaire compatible
    if (!carte) {
      carte = possedees.find((c) => !utilisees.has(c.sourceId) && c.postesSecondaires?.includes(posteInfo.id));
    }

    // 4. Repli général : meilleure carte libre disponible
    if (!carte) {
      carte = possedees.find((c) => !utilisees.has(c.sourceId));
    }

    // 5. Repli ultime si la collection a moins de 15 cartes : prend dans le catalogue
    if (!carte) {
      carte = catalogue.find((c) => !utilisees.has(c.sourceId) && c.famille === posteInfo.famille)
        ?? catalogue.find((c) => !utilisees.has(c.sourceId))
        ?? catalogue[0];
    }

    if (carte) utilisees.add(carte.sourceId);

    const stats = carte.statistiques;
    joueurs.push({
      id: `amical-${posteInfo.numero}-${carte.sourceId}`,
      sourceId: carte.sourceId,
      nom: carte.nom,
      numero: posteInfo.numero,
      poste: posteInfo.id,
      note: carte.note,
      vitesse: Math.round(stats.VIT),
      force: Math.round(stats.FRC),
      passe: Math.round(stats.PAS),
      plaquage: Math.round(stats.PLQ),
      endurance: Math.round(stats.END),
      jeuAuPied: Math.round(stats.JDP),
      photo: carte.photo,
      clubReel: carte.clubReel,
      nation: carte.nation,
    });
  }

  const noteMoyenne = Math.round(joueurs.reduce((acc, j) => acc + j.note, 0) / joueurs.length);

  return {
    nom: nomEquipe || 'XV de la Collection',
    couleur: couleur || '#1a56db',
    embleme,
    joueurs,
    noteMoyenne,
  };
}

/** Convertit une liste de JoueurCollectionAmical en Coequipier pour le moteur de match de Destiny Rugby. */
export function convertirEnCoequipiers(joueurs: JoueurCollectionAmical[]): Coequipier[] {
  return joueurs.map((j) => ({
    id: j.id,
    nom: j.nom,
    poste: j.poste,
    age: 25,
    note: j.note,
    potentiel: j.note,
    jeuAuPied: j.jeuAuPied,
    nation: j.nation ?? 'France',
    regen: false,
    photo: j.photo,
  }));
}

/** Vérifie si l'utilisateur actuel est le compte Kiri ou a l'autorisation du prototype amical. */
export function estCompteKiriAutorise(
  sessionCompte?: { administrateur?: boolean; pseudo?: string } | null,
  pseudoActuel?: string | null,
): boolean {
  if (sessionCompte?.administrateur) return true;
  if (sessionCompte?.pseudo?.trim().toLowerCase() === 'kiri') return true;
  if (pseudoActuel?.trim().toLowerCase() === 'kiri') return true;
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('destiny-compte-kiri') === '1') return true;
    const url = new URLSearchParams(window.location.search);
    if (url.get('kiri') === '1' || url.has('amical')) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLIENT RÉSEAU SALON AMICAL
// ═══════════════════════════════════════════════════════════════════════════

export async function creerSalonAmicalApi(equipe: EquipeAmical, pseudo: string): Promise<{ code: string; salon: SalonAmicalVue }> {
  const res = await fetch('/api/carriere', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'creerSalonAmical', equipe, pseudo, dev: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.erreur ?? 'Impossible de créer le salon amical.');
  return data;
}

export async function rejoindreSalonAmicalApi(code: string, equipe: EquipeAmical, pseudo: string): Promise<{ code: string; salon: SalonAmicalVue }> {
  const res = await fetch('/api/carriere', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'rejoindreSalonAmical', code: code.toUpperCase().trim(), equipe, pseudo }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.erreur ?? 'Impossible de rejoindre ce salon amical.');
  return data;
}

export async function synchroniserSalonAmicalApi(
  code: string,
  role: 'hote' | 'invite',
  input?: InputAmical,
  etatMatch?: unknown,
  statut?: 'en_cours' | 'termine',
): Promise<{
  ok: boolean;
  statut: 'attente' | 'pret' | 'en_cours' | 'termine';
  inputAdverse?: InputAmical;
  etatMatch?: unknown;
  invitePresent: boolean;
  hotePresent: boolean;
  equipeHote?: EquipeAmical;
  equipeInvite?: EquipeAmical;
}> {
  const res = await fetch('/api/carriere', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'syncSalonAmical',
      code: code.toUpperCase().trim(),
      role,
      input,
      etatMatch,
      statut,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.erreur ?? 'Synchronisation du salon perdue.');
  return data;
}

export async function quitterSalonAmicalApi(code: string, role: 'hote' | 'invite'): Promise<void> {
  try {
    await fetch('/api/carriere', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'quitterSalonAmical', code: code.toUpperCase().trim(), role }),
      keepalive: true,
    });
  } catch {
    // Silence à la fermeture
  }
}
