// EDGE FUNCTION — l'envoi d'une carrière au classement mondial
//
// Déno / Supabase Edge Functions. C'est le SEUL endroit qui a le droit d'écrire
// dans la table `classement` : le navigateur ne parle qu'à cette fonction, et la
// clé de service ne quitte jamais le serveur.
//
// ⚠️ CE FICHIER NE CALCULE RIEN LUI-MÊME. Il importe le barème du jeu
// (`src/lib/classementMondial.ts`) : une seule définition du score dans tout le
// projet. Deux exemplaires, ce serait un jour deux vérités — et un serveur qui
// refuse des scores légitimes ou en accepte d'impossibles.
//
// Déploiement :
//   supabase functions deploy classement --no-verify-jwt
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
//
// (Le `--no-verify-jwt` est volontaire : le jeu n'a pas de comptes. C'est le
//  débit et la vérification de la fiche qui protègent, pas l'authentification.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifierFiche } from '../src/lib/classementMondial.ts';
import { TROPHEES } from '../src/data/trophees.ts';

const IDS_TROPHEES = Object.keys(TROPHEES);

// Débit : un envoi par heure et dix par jour pour un même appareil. Une carrière
// de douze saisons demande des heures de jeu — personne d'honnête n'est gêné.
const PAR_HEURE = 1;
const PAR_JOUR = 10;

const base = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

/** Haché de l'appareil : on ne stocke JAMAIS l'IP en clair. */
async function empreinteAppareil(req: Request, sel: string): Promise<string> {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  if (!ip) throw new Error('Adresse réseau absente');
  const brut = `${ip}|${sel}`;
  const octets = new TextEncoder().encode(brut);
  const condense = await crypto.subtle.digest('SHA-256', octets);
  return [...new Uint8Array(condense)].map((o) => o.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function reponse(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type',
        'access-control-allow-methods': 'POST, OPTIONS',
      },
    });
  }
  if (req.method !== 'POST') return reponse({ erreur: 'POST attendu' }, 405);

  // ---- 1. LE DÉBIT, AVANT TOUT LE RESTE ------------------------------------
  // Le contrôle le moins cher passe en premier : inutile de valider une fiche
  // envoyée par un script qui en balance mille à la seconde.
  const sel = Deno.env.get('SEL_APPAREIL')?.trim();
  if (!sel) return reponse({ erreur: 'SEL_APPAREIL absente' }, 500);
  const appareil = await empreinteAppareil(req, sel);
  const depuis = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

  const { count: derniereHeure } = await base
    .from('envois').select('*', { count: 'exact', head: true })
    .eq('appareil', appareil).gte('envoye_le', depuis(1));
  if ((derniereHeure ?? 0) >= PAR_HEURE) {
    return reponse({ erreur: 'Trop d’envois. Réessaie dans une heure.' }, 429);
  }
  const { count: dernierJour } = await base
    .from('envois').select('*', { count: 'exact', head: true })
    .eq('appareil', appareil).gte('envoye_le', depuis(24));
  if ((dernierJour ?? 0) >= PAR_JOUR) {
    return reponse({ erreur: 'Quota quotidien atteint.' }, 429);
  }

  // ---- 2. LA FICHE --------------------------------------------------------
  let fiche: unknown;
  try {
    fiche = await req.json();
  } catch {
    return reponse({ erreur: 'JSON illisible' }, 400);
  }

  // ⚠️ ICI, ET NULLE PART AILLEURS : on ne croit PAS le score reçu, on le
  // recalcule. `verifierFiche` refuse aussi tout ce qui ne tient pas debout
  // (âge/saisons incohérents, 900 matchs en 12 saisons, trophée inventé…).
  const verdict = verifierFiche(fiche, IDS_TROPHEES);

  // On journalise l'envoi qu'il soit accepté ou non : les refus sont exactement
  // là où l'on voit arriver les scripts.
  await base.from('envois').insert({ appareil });

  if (!verdict.valide) {
    console.warn('[classement] refus', { appareil, anomalies: verdict.anomalies });
    return reponse({ erreur: 'Fiche refusée', anomalies: verdict.anomalies }, 422);
  }

  // ---- 3. L'ÉCRITURE : le score, et RIEN d'autre ---------------------------
  const pseudo = String((fiche as { pseudo: string }).pseudo).trim().slice(0, 24);
  const { error } = await base.rpc('poser_score', { p_pseudo: pseudo, p_score: verdict.score });
  if (error) {
    console.error('[classement] écriture', error);
    return reponse({ erreur: 'Écriture impossible' }, 500);
  }

  // La fiche sort de la mémoire ici. Elle n'a jamais touché la base.
  return reponse({ ok: true, score: verdict.score });
});
