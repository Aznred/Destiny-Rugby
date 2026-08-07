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
import { createHash } from 'node:crypto';
import { verifierFiche } from '../src/lib/classementMondial.js';
import { TROPHEES } from '../src/data/trophees.js';

export const config = { runtime: 'nodejs' };

const IDS_TROPHEES = Object.keys(TROPHEES);

// Débit par appareil.
//
// ⚠️ DESSERRÉ AVEC L'ENVOI AUTOMATIQUE. Un envoi par heure était calibré pour un
// bouton qu'on cliquait à la main. Depuis que la carrière part toute seule à
// chaque fin de saison et à la retraite, une session de jeu normale en produit
// plusieurs par heure : le joueur honnête se prenait des 429 et son meilleur
// score n'arrivait jamais. Six par heure couvre une bonne session, quarante par
// jour couvre la journée la plus intense — et ça reste sans intérêt pour un
// script, puisque la vraie barrière n'est pas le débit mais le RECALCUL.
const PAR_HEURE = 6;
const PAR_JOUR = 40;
const TOP = 100;

/**
 * ⚠️ CONNEXION PARESSEUSE, ET C'EST IMPORTANT. `neon('')` LÈVE à l'appel (« No
 * database connection string was provided »). Créée en tête de module, une
 * variable d'environnement manquante faisait donc échouer l'IMPORT de la
 * fonction : Vercel renvoyait une 500 opaque, et le message clair prévu plus bas
 * (« DATABASE_URL absente… ») n'était jamais atteint. Un diagnostic qu'on
 * n'atteint pas ne sert à rien.
 */
let connexion: ReturnType<typeof neon> | null = null;
function sqlClient() {
  connexion ??= neon(process.env.DATABASE_URL as string);
  return connexion;
}

/**
 * Haché de l'appareil : on ne stocke JAMAIS l'IP en clair.
 * ⚠️ `SEL_APPAREIL` doit être défini dans les variables d'environnement Vercel.
 * Sans sel, l'empreinte d'une IP donnée se retrouve par force brute en quelques
 * secondes — le haché ne protégerait plus rien.
 */
function empreinteAppareil(req: Request, sel: string): string {
  // Vercel renseigne l'adresse à sa frontière. Le user-agent est contrôlé par
  // l'appelant : le mélanger à l'empreinte permettait de contourner le quota en
  // changeant simplement cette chaîne.
  const ip = (req.headers.get('x-vercel-forwarded-for')
    ?? req.headers.get('x-forwarded-for')
    ?? '')
    .split(',')[0]
    .trim();
  if (!ip) throw new Error('Adresse réseau absente');
  const brut = `${ip}|${sel}`;
  return createHash('sha256').update(brut).digest('hex').slice(0, 32);
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


// ============================================================================
// ROUTES VERCEL DÉCOUPÉES (OPTIONS, GET, POST)
// ============================================================================

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { headers: ENTETES });
}

export async function GET(): Promise<Response> {
  if (!process.env.DATABASE_URL) {
    return reponse({ erreur: 'DATABASE_URL absente des variables d’environnement' }, 500);
  }

  try {
    const sql = sqlClient();
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

export async function POST(req: Request): Promise<Response> {
  if (!process.env.DATABASE_URL) {
    return reponse({ erreur: 'DATABASE_URL absente des variables d’environnement' }, 500);
  }
  const sel = process.env.SEL_APPAREIL?.trim();
  if (!sel) {
    return reponse({ erreur: 'SEL_APPAREIL absente des variables d’environnement' }, 500);
  }

  // ---- 1. LE DÉBIT, AVANT TOUT LE RESTE ------------------------------------
  let sql: ReturnType<typeof neon>;
  let appareil: string;
  let heure = 0;
  let jour = 0;
  try {
    sql = sqlClient();
    appareil = empreinteAppareil(req, sel);
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

  const verdict = verifierFiche(fiche, IDS_TROPHEES);

  // ⚠️ UN REFUS NE CONSOMME PAS LE QUOTA, et ce n'est pas une faiblesse. Le
  // débit protège la table `classement` ; une fiche refusée n'y écrit rien, et
  // `verifierFiche` est pure, publique et sans coût. La compter, en revanche,
  // enfermait le joueur honnête : une première tentative refusée (une vieille
  // sauvegarde, un trophée non reconnu) le bloquait UNE HEURE, avec pour seule
  // explication « Trop d'envois ». On journalise le refus — c'est là qu'on voit
  // arriver les scripts — mais on ne le facture pas.
  if (!verdict.valide) {
    console.warn('[classement] refus', appareil, verdict.anomalies.join(' | '));
    return reponse({ erreur: 'Fiche refusée', anomalies: verdict.anomalies }, 422);
  }

  try {
    await sql`insert into envois (appareil) values (${appareil})`;
  } catch (e) {
    console.error('[classement] journal', e);
  }

  // ---- 3. L'ÉCRITURE : le score, et RIEN d'autre ---------------------------
  const pseudo = String((fiche as { pseudo: string }).pseudo).trim().slice(0, 24);
  try {
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

  return reponse({ ok: true, score: verdict.score });
}

// Vercel appelle une fonction `api/*.ts` via son export par défaut (req, res).
// Les exports GET/POST ci-dessus restent utiles pour les tests et les runtimes
// web, mais sans ce pont Vercel chargeait le module sans jamais appeler GET :
// le navigateur recevait alors une erreur 500 générique.
type RequeteVercel = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type ReponseVercel = {
  status: (code: number) => ReponseVercel;
  setHeader: (nom: string, valeur: string) => void;
  send: (corps: string) => void;
};

export default async function classementVercel(req: RequeteVercel, res: ReponseVercel): Promise<void> {
  try {
    const methode = (req.method ?? 'GET').toUpperCase();
    const headers = new Headers();
    for (const [nom, valeur] of Object.entries(req.headers ?? {})) {
      if (Array.isArray(valeur)) headers.set(nom, valeur.join(', '));
      else if (valeur) headers.set(nom, valeur);
    }

    const corps = methode === 'GET' || methode === 'OPTIONS'
      ? undefined
      : typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const demande = new Request(`https://destiny-rugby.local${req.url ?? '/api/classement'}`, {
      method: methode,
      headers,
      body: corps,
    });

    let resultat: Response;
    if (methode === 'GET') resultat = await GET();
    else if (methode === 'POST') resultat = await POST(demande);
    else if (methode === 'OPTIONS') resultat = await OPTIONS();
    else resultat = reponse({ erreur: 'Méthode non autorisée' }, 405);

    resultat.headers.forEach((valeur, nom) => res.setHeader(nom, valeur));
    res.status(resultat.status).send(await resultat.text());
  } catch (e) {
    console.error('[classement] invocation Vercel', e);
    for (const [nom, valeur] of Object.entries(ENTETES)) res.setHeader(nom, valeur);
    res.status(500).send(JSON.stringify({ erreur: 'Erreur interne du classement' }));
  }
}
