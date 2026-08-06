// LE CLASSEMENT MONDIAL — la fonction serverless Vercel
//
// ⚠️ CE FICHIER NE CALCULE RIEN LUI-MÊME. Il importe le barème du jeu
// (`src/lib/classementMondial.ts`) : une seule définition du score dans tout le
// projet. Deux exemplaires, ce serait un jour deux vérités — un serveur qui
// refuse des scores légitimes, ou qui en accepte d'impossibles.
//
// ⚠️ POURQUOI `api/` EST À LA RACINE DU PROJET, à côté de `src/`. C'est la
// convention Vercel : tout fichier de `api/` devient une fonction serverless,
// déployée avec le site sans configuration. Et surtout, c'est ce qui permet
// d'importer directement `../src/lib/classementMondial` — le serveur et le jeu
// partagent le fichier, ils ne le recopient pas. Vite ignore ce dossier (il ne
// part que d'`index.html`), il n'entre donc pas dans le bundle du navigateur.
//
// Ce qu'il fait, dans cet ordre :
//   GET  → les 100 meilleurs scores (lecture publique)
//   POST → 1. débit par appareil · 2. `verifierFiche` · 3. RECALCUL du score
//          4. écriture du seul score · 5. la fiche est jetée
//
// Déploiement : voir `serveur/VERCEL.md`.

import { neon } from '@neondatabase/serverless';
import { verifierFiche } from '../src/lib/classementMondial.js';
import { TROPHEES } from '../src/data/trophees.ts';

export const config = { runtime: 'nodejs' };

const IDS_TROPHEES = Object.keys(TROPHEES);

// Débit : un envoi par heure et dix par jour pour un même appareil. Une carrière
// de douze saisons demande des heures de jeu — personne d'honnête n'est gêné.
const PAR_HEURE = 1;
const PAR_JOUR = 10;
const TOP = 100;

const sql = neon(process.env.DATABASE_URL ?? '');

/**
 * Haché de l'appareil : on ne stocke JAMAIS l'IP en clair.
 * ⚠️ `SEL_APPAREIL` doit être défini dans les variables d'environnement Vercel.
 * Sans sel, l'empreinte d'une IP donnée se retrouve par force brute en quelques
 * secondes — le haché ne protégerait plus rien.
 */
async function empreinteAppareil(req: Request): Promise<string> {
  const brut = [
    req.headers.get('x-forwarded-for') ?? '',
    req.headers.get('user-agent') ?? '',
    process.env.SEL_APPAREIL ?? 'sel-par-defaut',
  ].join('|');
  const octets = new TextEncoder().encode(brut);
  const condense = await crypto.subtle.digest('SHA-256', octets);
  return [...new Uint8Array(condense)].map((o) => o.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

const ENTETES = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

function reponse(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), { status: statut, headers: ENTETES });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: ENTETES });

  if (!process.env.DATABASE_URL) {
    // Message explicite plutôt qu'une erreur de connexion illisible : c'est
    // l'oubli le plus fréquent au premier déploiement.
    return reponse({ erreur: 'DATABASE_URL absente des variables d’environnement' }, 500);
  }

  // ---- LECTURE : le tableau, ouvert à tous ---------------------------------
  if (req.method === 'GET') {
    try {
      const lignes = await sql`
        select pseudo, score, maj_le
        from classement
        order by score desc, maj_le asc
        limit ${TOP}
      `;
      return reponse({ classement: lignes });
    } catch (e) {
      console.error('[classement] lecture', e);
      return reponse({ erreur: 'Lecture impossible' }, 500);
    }
  }

  if (req.method !== 'POST') return reponse({ erreur: 'GET ou POST attendu' }, 405);

  // ---- 1. LE DÉBIT, AVANT TOUT LE RESTE ------------------------------------
  // Le contrôle le moins cher passe en premier : inutile de valider une fiche
  // envoyée par un script qui en balance mille à la seconde.
  const appareil = await empreinteAppareil(req);
  let heure = 0;
  let jour = 0;
  try {
    const [c] = await sql`
      select
        count(*) filter (where envoye_le > now() - interval '1 hour') as heure,
        count(*) filter (where envoye_le > now() - interval '24 hours') as jour
      from envois where appareil = ${appareil}
    `;
    heure = Number(c?.heure ?? 0);
    jour = Number(c?.jour ?? 0);
  } catch (e) {
    console.error('[classement] débit', e);
    return reponse({ erreur: 'Base indisponible' }, 500);
  }
  if (heure >= PAR_HEURE) return reponse({ erreur: 'Trop d’envois. Réessaie dans une heure.' }, 429);
  if (jour >= PAR_JOUR) return reponse({ erreur: 'Quota quotidien atteint.' }, 429);

  // ---- 2. LA FICHE ---------------------------------------------------------
  let fiche: unknown;
  try {
    fiche = await req.json();
  } catch {
    return reponse({ erreur: 'JSON illisible' }, 400);
  }

  // ⚠️ ICI, ET NULLE PART AILLEURS : on ne croit PAS le score reçu, on le
  // RECALCULE. `verifierFiche` refuse aussi tout ce qui ne tient pas debout —
  // âge et saisons incohérents, 900 matchs en 12 saisons, trophée inventé, un
  // même trophée gagné deux fois dans la même saison…
  const verdict = verifierFiche(fiche, IDS_TROPHEES);

  // On journalise l'envoi qu'il soit accepté ou non : les refus sont exactement
  // là où l'on voit arriver les scripts.
  try {
    await sql`insert into envois (appareil) values (${appareil})`;
  } catch (e) {
    console.error('[classement] journal', e);
  }

  if (!verdict.valide) {
    console.warn('[classement] refus', appareil, verdict.anomalies.join(' | '));
    return reponse({ erreur: 'Fiche refusée', anomalies: verdict.anomalies }, 422);
  }

  // ---- 3. L'ÉCRITURE : le score, et RIEN d'autre ---------------------------
  const pseudo = String((fiche as { pseudo: string }).pseudo).trim().slice(0, 24);
  try {
    // ⚠️ `on conflict` fait tout côté base : pas de course entre deux envois
    // simultanés, et un score MOINS BON n'écrase jamais le record.
    await sql`
      insert into classement (pseudo, score) values (${pseudo}, ${verdict.score})
      on conflict (pseudo) do update
        set score = greatest(classement.score, excluded.score), maj_le = now()
        where excluded.score > classement.score
    `;
  } catch (e) {
    console.error('[classement] écriture', e);
    return reponse({ erreur: 'Écriture impossible' }, 500);
  }

  // La fiche sort de la mémoire ici. Elle n'a jamais touché la base.
  return reponse({ ok: true, score: verdict.score });
}
