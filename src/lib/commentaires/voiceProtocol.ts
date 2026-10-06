/** Messages privés entre le lecteur et son Worker. Aucun événement de match ici. */
export type EtatVoix = { statut: 'repos' | 'chargement' | 'pret' | 'erreur'; progression?: number; moteur?: 'cpu' | 'cuda' | 'xpu' | 'mps'; erreur?: string };
export type RequeteVoix = { id: number; type: 'initialize' } | { id: number; type: 'synthesize'; texte: string; debit: number; generation: number } | { type: 'stop'; generation: number };
export type ReponseVoix = { type: 'etat'; etat: EtatVoix } | { type: 'ready'; id: number } | { type: 'audio'; id: number; audio: Float32Array; frequence: number } | { type: 'annule'; id: number } | { type: 'error'; id: number; erreur: string };
