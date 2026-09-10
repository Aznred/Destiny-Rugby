import { programmerMatchsVercel } from '../serveur/horlogeVercel.js';
import { creerGestionnaireCarriere } from '../serveur/carriereApi.js';
import type { RequeteCarriere, ReponseCarriere } from '../serveur/carriereApi.js';
import { stockageNeon } from '../serveur/carriereStockage.js';

export const config = { runtime: 'nodejs' };
export const maxDuration = 60;

/**
 * ⚠️ LA RÉPONSE VERCEL EST ENRICHIE, PAS REMPLACÉE. Le gestionnaire a besoin
 * d'un `envoyer` pour le relais d'écussons (une réponse binaire) ; l'objet de
 * Vercel a bien un `end`, mais pas sous ce nom. On l'enveloppe donc au lieu de
 * faire dépendre `serveur/carriereApi.ts` d'un type d'hôte particulier — c'est
 * ce qui lui permet de tourner aussi bien derrière Vercel que derrière le
 * serveur de développement de Vite.
 */
interface ReponseHote extends ReponseCarriere { end(donnees: Uint8Array): unknown }

let gestionnaire: ReturnType<typeof creerGestionnaireCarriere> | undefined;
export default async function handler(req: RequeteCarriere, res: ReponseHote) {
  const reponse: ReponseCarriere = {
    status: (code) => { res.status(code); return reponse; },
    setHeader: (nom, valeur) => res.setHeader(nom, valeur),
    json: (contenu) => res.json(contenu),
    envoyer: (donnees) => res.end(donnees),
  };
  if (!process.env.DATABASE_URL) {
    reponse.setHeader('Cache-Control', 'no-store');
    return reponse.status(503).json({ erreur: 'La Carrière en ligne attend la configuration de son serveur.' });
  }
  gestionnaire ??= creerGestionnaireCarriere(stockageNeon(process.env.DATABASE_URL), programmerMatchsVercel);
  return gestionnaire.handler(req, reponse);
}
