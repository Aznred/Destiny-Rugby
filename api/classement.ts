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
//   GET  → les 100 meilleures carrières (lecture publique)
//   POST → 1. débit par appareil · 2. `verifierFiche` · 3. RECALCUL du score
//          4. écriture du score ET des faits affichables de la fiche
//
// ⚠️ LA BASE GARDE MAINTENANT LA FICHE, plus seulement le score. Demande
// explicite : « dans le classement mondial, qu'on puisse voir les stats des
// autres joueurs, leurs profils, armoires à trophées, clubs qu'ils ont faits ».
// Ça n'affaiblit rien — le score reste RECALCULÉ, c'est là qu'est la sécurité —
// mais ça demande une migration de schéma : voir `serveur/schema-vercel.sql`,
// section « v2 ». Sans les nouvelles colonnes, le POST échoue proprement (500
// « Écriture impossible ») et le GET ne renvoie que ce qu'il trouve.
//
// Déploiement : voir `serveur/VERCEL.md`.

import { neon } from '@neondatabase/serverless';
import { createHash } from 'node:crypto';
import { verifierFiche, type FicheCarriere } from '../src/lib/classementMondial.js';
import { TROPHEES } from '../src/data/trophees.js';

export const config = { runtime: 'nodejs' };

const IDS_TROPHEES = Object.keys(TROPHEES);

// Débit par appareil.
//
// ⚠️ DESSERRÉ UNE PREMIÈRE FOIS AVEC L'ENVOI AUTOMATIQUE. Un envoi par heure
// était calibré pour un bouton qu'on cliquait à la main. Depuis que la carrière
// part toute seule à chaque fin de saison et à la retraite, une session de jeu
// normale en produit plusieurs par heure : le joueur honnête se prenait des 429
// et son meilleur score n'arrivait jamais.
//
// ⚠️ ET TRIPLÉ UNE SECONDE FOIS (6 → 18 par heure, 40 → 120 par jour), à la
// demande : « augmente la limite de requêtes par heure, c'est pas assez ». Six
// ne suffisait plus parce que l'envoi ne se déclenche plus seulement à la fin
// d'une saison — `publierAuClassement` part aussi à CHAQUE SEMAINE JOUÉE dès que
// le score progresse (voir le store, frein de dix minutes). Une soirée où l'on
// avance par le calendrier franchit donc six envois en moins d'une heure.
//
// ⚠️ CE N'EST PAS UN AFFAIBLISSEMENT DE LA PROTECTION, et il faut le redire
// parce que le réflexe serait de le croire : **le débit n'a jamais été ce qui
// protège le classement**. Ce qui protège, c'est que le serveur RECALCULE le
// score (`scoreDeLaFiche`) et que `verifierFiche` borne chaque champ par les
// autres. Un script qui posterait cent fois par heure n'obtiendrait toujours
// que des refus : il lui faudrait fabriquer une carrière entière qui tient
// debout, et à ce moment-là autant la jouer. Le débit ne sert qu'à empêcher
// qu'on martèle la base pour rien.
const PAR_HEURE = 18;
const PAR_JOUR = 120;

/**
 * ⚠️ LE CLASSEMENT NE S'ARRÊTE PLUS AU CENTIÈME.
 *
 * Demande explicite : « qu'on puisse avoir accès à tout le monde ». Le `GET`
 * rendait les cent meilleurs et rien d'autre : au-delà, une carrière existait en
 * base sans exister à l'écran, et son auteur n'avait aucun moyen de savoir où il
 * se situait. Un classement mondial qui cache 90 % du monde est un tableau
 * d'honneur, pas un classement.
 *
 * ⚠️ ET ON PAGINE PLUTÔT QUE DE TOUT ENVOYER. Une base à dix mille carrières,
 * fiches et palmarès compris, ferait plusieurs mégaoctets par ouverture d'écran
 * — sur un téléphone en 4G, c'est l'écran qui ne s'affiche jamais.
 */
const PAR_PAGE = 50;
/** Garde-fou : au-delà, c'est un script qui balaie la table, pas un joueur. */
const PAGE_MAX = 400;

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

export async function GET(req?: Request): Promise<Response> {
  if (!process.env.DATABASE_URL) {
    return reponse({ erreur: 'DATABASE_URL absente des variables d’environnement' }, 500);
  }

  // ⚠️ `id` EST L'IDENTIFIANT PUBLIC DE LA LIGNE, JAMAIS LA CLÉ D'ÉCRITURE.
  // Il voyage dans l'adresse, donc dans les journaux du serveur : y faire
  // passer `cle` reviendrait à publier le droit d'écrire sur une ligne. Voir
  // `serveur/MIGRATION-FICHES.md`, étape 2 bis.
  let page = 1;
  let monId = NaN;
  let categorie = 'total';
  if (req) {
    const params = new URL(req.url).searchParams;
    page = Math.min(PAGE_MAX, Math.max(1, Math.floor(Number(params.get('page')) || 1)));
    monId = Math.floor(Number(params.get('id')));
    categorie = params.get('categorie') ?? 'total';
  }
  const decalage = (page - 1) * PAR_PAGE;

  try {
    const sql = sqlClient();
    // ⚠️ ON LIT LA FICHE ENTIÈRE, pas seulement le score : c'est elle que
    // l'écran Classement déplie quand on clique sur une ligne (stats, armoire à
    // trophées, clubs traversés). Les colonnes sont toutes nullables — une ligne
    // écrite avant la migration v2 s'affiche encore, avec son seul score.
    // ⚠️ LE CODE 42703, C'EST « CETTE COLONNE N'EXISTE PAS » : une base restée à
    // un schéma plus ancien que le code. Vu en production : « column "nom" does
    // not exist », et le classement mondial renvoyait 500 pour TOUT LE MONDE. Un
    // déploiement de code ne doit pas pouvoir casser la lecture parce qu'un
    // ALTER TABLE traîne. On descend donc les schémas un par un, du plus complet
    // au plus pauvre : le tableau s'affiche dans tous les cas, et les colonnes
    // manquantes réapparaissent d'elles-mêmes une fois la migration jouée
    // (`serveur/schema-vercel.sql`, en tête).
    // ═══ LES CLASSEMENTS DE CATÉGORIE ═══════════════════════════════════
    // Demande explicite : « faire plusieurs classements de catégories et un
    // classement total comprenant les carrières sans entraîneur, juste
    // entraîneur, et joueur + entraîneur ».
    //
    // ⚠️ LE FILTRE EST FAIT PAR LA BASE, ET IL LE FAUT. Le classement est
    // PAGINÉ (50 lignes) : filtrer côté navigateur ne filtrerait que la page
    // affichée, et l’onglet « Entraîneurs » montrerait deux lignes sur cent
    // en laissant croire qu’il n’y a que deux entraîneurs au monde.
    //
    // ⚠️ ET IL N’Y A AUCUNE COLONNE `categorie` À AJOUTER : la catégorie se
    // DÉDUIT de deux colonnes qui existent depuis la v2 du schéma. Une fiche
    // d’entraîneur porte `poste = 'entraineur'` (`ficheDepuisManager`), et
    // `matchs > 0` distingue celui qui a d’abord joué. Zéro migration SQL,
    // donc zéro risque de casser une base déjà en ligne — la leçon de
    // « column "nom" does not exist », qui avait rendu 500 à tout le monde.
    const filtre = ['joueur', 'entraineur', 'joueurEntraineur'].includes(categorie)
      ? categorie : 'total';

    const lectures = [
      // v3 : la ligne porte un identifiant public — c'est lui qui permet
      // d'afficher deux lignes sous le même pseudo sans les confondre.
      ['v3', () => sql`
        select id, pseudo, score, maj_le,
               nom, poste, nation, age, saisons, note, reputation,
               matchs, essais, selections, titres, clubs
        from classement
        where ${filtre} = 'total'
           or (${filtre} = 'joueur' and coalesce(poste, '') <> 'entraineur')
           or (${filtre} = 'entraineur' and poste = 'entraineur' and coalesce(matchs, 0) = 0)
           or (${filtre} = 'joueurEntraineur' and poste = 'entraineur' and coalesce(matchs, 0) > 0)
        order by score desc, maj_le asc
        limit ${PAR_PAGE} offset ${decalage}
      `],
      // v2 : la fiche affichable, sans identifiant de ligne.
      ['v2', () => sql`
        select pseudo, score, maj_le,
               nom, poste, nation, age, saisons, note, reputation,
               matchs, essais, selections, titres, clubs
        from classement
        where ${filtre} = 'total'
           or (${filtre} = 'joueur' and coalesce(poste, '') <> 'entraineur')
           or (${filtre} = 'entraineur' and poste = 'entraineur' and coalesce(matchs, 0) = 0)
           or (${filtre} = 'joueurEntraineur' and poste = 'entraineur' and coalesce(matchs, 0) > 0)
        order by score desc, maj_le asc
        limit ${PAR_PAGE} offset ${decalage}
      `],
      // v1 : le score seul.
      ['v1', () => sql`
        select pseudo, score, maj_le
        from classement
        order by score desc, maj_le asc
        limit ${PAR_PAGE} offset ${decalage}
      `],
    ] as const;

    let lignes: Record<string, unknown>[] | null = null;
    let schema = 'v1';
    for (const [nom, lire] of lectures) {
      try {
        lignes = (await lire()) as Record<string, unknown>[];
        schema = nom;
        break;
      } catch (e) {
        if ((e as { code?: string }).code !== '42703') throw e;
        console.warn(`[classement] schéma antérieur à ${nom} : lecture repliée d'un cran`);
      }
    }
    if (!lignes) throw new Error('aucun schéma de classement reconnu');

    // Combien de carrières en tout : c'est ce qui permet à l'écran d'annoncer
    // « page 3 sur 12 » plutôt qu'un « suivant » qui mène parfois au vide.
    // ⚠️ LE TOTAL COMPTE EXACTEMENT CE QUE LA PAGE MONTRE. Un total non
    //    filtré à côté d’une page filtrée annoncerait « page 1 sur 12 » pour
    //    une catégorie qui tient sur une page.
    let total = lignes.length + decalage;
    try {
      const [c] = schema === 'v1'
        ? await sql`select count(*)::int as total from classement`
        : await sql`
          select count(*)::int as total from classement
          where ${filtre} = 'total'
             or (${filtre} = 'joueur' and coalesce(poste, '') <> 'entraineur')
             or (${filtre} = 'entraineur' and poste = 'entraineur' and coalesce(matchs, 0) = 0)
             or (${filtre} = 'joueurEntraineur' and poste = 'entraineur' and coalesce(matchs, 0) > 0)
        `;
      total = Number((c as { total?: unknown })?.total ?? total);
    } catch (e) {
      console.warn('[classement] total indisponible', e);
    }

    // ⚠️ MA LIGNE ET MON RANG, MÊME SI JE SUIS 4 000ᵉ. Demande explicite :
    // « qu'on puisse voir notre classement en bas ». Sans ça, il faudrait
    // feuilleter jusqu'à se trouver — et on ne se cherche pas soi-même dans
    // quarante pages. Le rang est calculé par la base, sur le MÊME tri que la
    // page : deux tris différents donneraient deux rangs différents pour la
    // même ligne, et le joueur aurait raison de ne pas y croire.
    let moi: Record<string, unknown> | null = null;
    if (schema === 'v3' && Number.isFinite(monId) && monId > 0) {
      try {
        const [ligne] = await sql`
          select * from (
            select id, pseudo, score, maj_le,
                   nom, poste, nation, age, saisons, note, reputation,
                   matchs, essais, selections, titres, clubs,
                   rank() over (order by score desc, maj_le asc) as rang
            from classement
          ) tout
          where id = ${monId}
        `;
        moi = (ligne as Record<string, unknown>) ?? null;
      } catch (e) {
        console.warn('[classement] rang personnel indisponible', e);
      }
    }

    // ⚠️ UNE BASE RESTÉE EN v1 N’A PAS DE COLONNE `poste` : la cascade est
    //    retombée sur la requête NON filtrée. On le DIT plutôt que de servir
    //    le classement total en le présentant comme celui des entraîneurs —
    //    c'est exactement le genre de silence qui se lit comme un bug.
    return reponse({
      classement: lignes, total, page, parPage: PAR_PAGE, moi,
      categorie: filtre,
      ...(filtre !== 'total' && schema === 'v1' ? { filtreIgnore: true } : {}),
    });
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

  // ---- 3. L'ÉCRITURE : le score RECALCULÉ, et les faits affichables --------
  // ⚠️ TOUT VIENT DE `fiche`, MAIS RIEN N'EST CRU SUR PAROLE : `verifierFiche`
  // a déjà borné chaque champ (types, longueurs, cohérence interne) et refusé la
  // fiche sinon. Le score écrit est celui du serveur, jamais `fiche.score`.
  const f = fiche as FicheCarriere;
  const pseudo = String(f.pseudo).trim().slice(0, 24);

  // ⚠️ LA LIGNE N'EST PLUS IDENTIFIÉE PAR LE PSEUDO, ET C'ÉTAIT UN VRAI BUG.
  // Signalé en jeu : « si on a le même pseudo qu'un joueur dans le classement,
  // notre classement apparaît pas ». Le pseudo était la clé primaire : deux
  // joueurs qui choisissent le même nom se partageaient UNE ligne, et l'ON
  // CONFLICT n'écrit que si le score ne recule pas. Celui des deux qui avait le
  // score le plus bas n'écrivait donc RIEN — sans erreur et sans message, le
  // serveur répondant `ok` : sa carrière n'entrait jamais au classement.
  //
  // ⚠️ ET LE REPLI SUR LE PSEUDO EST DÉLIBÉRÉ. Une fiche sans clé vient d'un
  // onglet resté ouvert sur l'ancien bundle : elle retrouve exactement l'ancien
  // comportement — sa ligne historique, avec son bug — plutôt que de se voir
  // refusée. Le préfixe garantit qu'une clé tirée au hasard ne tombera jamais
  // sur une identité héritée.
  const cle = typeof f.cle === 'string' && f.cle.trim()
    ? f.cle.trim().slice(0, 40)
    : `v1:${pseudo}`;

  try {
    const ecrit = await sql`
      insert into classement (
        cle, pseudo, score, nom, poste, nation, age, saisons, note, reputation,
        matchs, essais, selections, titres, clubs
      ) values (
        ${cle}, ${pseudo}, ${verdict.score}, ${f.nom}, ${f.poste}, ${f.nation}, ${f.age},
        ${f.saisons}, ${f.note}, ${f.reputation}, ${f.matchs}, ${f.essais},
        ${f.selections}, ${JSON.stringify(f.titres)}::jsonb, ${JSON.stringify(f.clubs)}::jsonb
      )
      on conflict (cle) do update
        set score = greatest(classement.score, excluded.score), maj_le = now(),
            pseudo = excluded.pseudo,
            nom = excluded.nom, poste = excluded.poste, nation = excluded.nation,
            age = excluded.age, saisons = excluded.saisons, note = excluded.note,
            reputation = excluded.reputation, matchs = excluded.matchs,
            essais = excluded.essais, selections = excluded.selections,
            titres = excluded.titres, clubs = excluded.clubs
        -- ⚠️ On ne remplace la fiche QUE si le score ne RECULE pas : sinon un
        -- envoi de mi-carrière écraserait la ligne d'une carrière déjà terminée,
        -- et le tableau afficherait un palmarès plus pauvre que le score gardé.
        -- « greatest » interdit par ailleurs à tout score de baisser au passage.
        --
        -- ⚠️ ET C'EST BIEN « ≥ », PAS « > » : à score égal la carrière est la
        -- même, donc la fiche est bonne à prendre. Avec un « > » strict, une
        -- ligne écrite avant la v2 du schéma (score seul, fiche vide) ne se
        -- remplissait JAMAIS — son propriétaire renvoie sa carrière terminée,
        -- donc le MÊME score, donc la condition est fausse, donc son armoire à
        -- trophées reste vide à l'écran, définitivement.
        where excluded.score >= classement.score
      returning id
    `;
    // ⚠️ UN « ON CONFLICT … WHERE » NE RENVOIE RIEN QUAND IL N'ÉCRIT PAS. Le
    // score n'a pas progressé, mais la ligne existe : on va chercher son
    // identifiant, sinon le joueur perdrait le surlignage de SA ligne pour la
    // seule raison qu'il n'a pas battu son record.
    let id = Number((ecrit as { id?: unknown }[])[0]?.id ?? NaN);
    if (!Number.isFinite(id)) {
      const [dejaLa] = await sql`select id from classement where cle = ${cle}`;
      id = Number((dejaLa as { id?: unknown })?.id ?? NaN);
    }
    return reponse(Number.isFinite(id)
      ? { ok: true, score: verdict.score, id }
      : { ok: true, score: verdict.score });
  } catch (e) {
    if ((e as { code?: string }).code !== '42703') {
      console.error('[classement] écriture', e);
      return reponse({ erreur: 'Écriture impossible' }, 500);
    }
    console.warn('[classement] schéma antérieur à v3 : écriture repliée sur le pseudo');
  }

  // ═══ REPLI v2 : la fiche complète, mais la ligne est encore clé par pseudo ══
  // ⚠️ Le bug des homonymes revient tant que la migration v3 n'est pas jouée :
  // sans la colonne `cle`, il n'y a rien d'autre à quoi accrocher une ligne.
  // C'est écrit dans les journaux ci-dessus, et le remède est dans
  // `serveur/schema-vercel.sql`.
  try {
    await sql`
      insert into classement (
        pseudo, score, nom, poste, nation, age, saisons, note, reputation,
        matchs, essais, selections, titres, clubs
      ) values (
        ${pseudo}, ${verdict.score}, ${f.nom}, ${f.poste}, ${f.nation}, ${f.age},
        ${f.saisons}, ${f.note}, ${f.reputation}, ${f.matchs}, ${f.essais},
        ${f.selections}, ${JSON.stringify(f.titres)}::jsonb, ${JSON.stringify(f.clubs)}::jsonb
      )
      on conflict (pseudo) do update
        set score = greatest(classement.score, excluded.score), maj_le = now(),
            nom = excluded.nom, poste = excluded.poste, nation = excluded.nation,
            age = excluded.age, saisons = excluded.saisons, note = excluded.note,
            reputation = excluded.reputation, matchs = excluded.matchs,
            essais = excluded.essais, selections = excluded.selections,
            titres = excluded.titres, clubs = excluded.clubs
        -- ⚠️ On ne remplace la fiche QUE si le score ne RECULE pas : sinon un
        -- envoi de mi-carrière écraserait la ligne d'une carrière déjà terminée,
        -- et le tableau afficherait un palmarès plus pauvre que le score gardé.
        --
        -- ⚠️ MAIS C'EST BIEN « ≥ », PAS « > », ET C'EST LA MIGRATION QUI L'EXIGE.
        -- Avec un « > » strict, une ligne écrite avant la v2 du schéma (score
        -- seul, fiche vide) ne se remplissait JAMAIS : son propriétaire renvoie
        -- sa carrière terminée, donc le MÊME score, donc la condition est fausse,
        -- donc l'armoire à trophées reste vide à l'écran — définitivement. À
        -- score égal la carrière est la même : la fiche est bonne à prendre.
        -- « greatest » garantit qu'aucun score ne peut baisser au passage.
        where excluded.score >= classement.score
    `;
  } catch (e) {
    // ⚠️ MÊME REPLI QUE POUR LA LECTURE : sur une base encore en v1, on écrit
    // au moins le score. Sans ça, plus AUCUNE carrière n'entrait au classement
    // tant que l'ALTER TABLE n'était pas joué — et le joueur n'avait, pour
    // toute explication, qu'un « Écriture impossible ».
    if ((e as { code?: string }).code === '42703') {
      console.warn('[classement] schéma v1 détecté : seul le score est écrit');
      try {
        await sql`
          insert into classement (pseudo, score) values (${pseudo}, ${verdict.score})
          on conflict (pseudo) do update
            set score = greatest(classement.score, excluded.score), maj_le = now()
            where excluded.score > classement.score
        `;
        return reponse({ ok: true, score: verdict.score });
      } catch (e2) {
        console.error('[classement] écriture (repli v1)', e2);
      }
    } else {
      console.error('[classement] écriture', e);
    }
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
    if (methode === 'GET') resultat = await GET(demande);
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
