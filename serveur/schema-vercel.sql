-- LE CLASSEMENT MONDIAL — schéma pour Vercel + Postgres (Neon)
--
-- À coller UNE FOIS dans la console SQL de la base (Vercel → Storage → ta base
-- → Query, ou le SQL Editor de Neon). Voir `serveur/VERCEL.md` pour le pas à pas.
--
-- ⚠️ ON NE STOCKE QUE LE SCORE (demande explicite : « dans la DB je veux
-- retenir juste le score »). La fiche de carrière — saisons, matchs, essais,
-- titres — voyage dans la REQUÊTE pour que le serveur puisse recalculer, puis
-- elle est JETÉE. Rien d'autre ne survit à la vérification.
--
-- Conséquence assumée : on ne pourra pas, plus tard, afficher « 12 saisons,
-- 44 essais » à côté d'un score, ni recalculer un classement si le barème
-- change. C'est le prix d'une base minimale — et c'est ce qui a été demandé.
--
-- ⚠️ DIFFÉRENCE AVEC `schema.sql` (la version Supabase) : PAS DE ROW LEVEL
-- SECURITY, et c'est volontaire. Sur Supabase, le navigateur parle directement
-- à la base avec une clé publique — il FAUT donc une politique qui lui interdise
-- d'écrire. Ici, la chaîne de connexion vit dans les variables d'environnement
-- de la fonction Vercel : le navigateur n'a aucun accès à la base, jamais. La
-- surface est plus petite, il y a moins à verrouiller.

create table if not exists classement (
  -- Le pseudo EST la clé : une seule ligne par joueur, donc pas de spam.
  pseudo   text primary key check (length(pseudo) between 1 and 24),
  -- ⚠️ Le plafond vient de `SCORE_MAX` (src/lib/classementMondial.ts) : la
  -- carrière théorique maximale du jeu. Une valeur au-dessus est
  -- mathématiquement impossible — la base elle-même la refuse, même si le code
  -- se trompait. Il a changé quand les distinctions individuelles sont arrivées
  -- (4 → 9 titres possibles par saison) : 64 488 → 82 488. Si tu retouches
  -- `LIMITES`, remets cette valeur à jour, sinon la base rejettera des scores
  -- que le jeu produit.
  score    integer not null check (score >= 0 and score <= 82488),
  cree_le  timestamptz not null default now(),
  maj_le   timestamptz not null default now()
);

create index if not exists classement_score_idx on classement (score desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- LE GARDE-FOU DE DÉBIT
-- ═══════════════════════════════════════════════════════════════════════════
-- Une carrière crédible demande des heures de jeu. Un envoi par heure et par
-- appareil rend le forçage brutal inutile. On ne garde qu'un HACHÉ de
-- l'identifiant d'appareil : jamais l'IP en clair, jamais rien de nominatif.
create table if not exists envois (
  appareil  text not null,
  envoye_le timestamptz not null default now()
);
create index if not exists envois_appareil_idx on envois (appareil, envoye_le desc);

-- Purge : on ne garde pas d'historique au-delà de ce qui sert au débit.
-- Deux jours suffisent (la fenêtre la plus longue est de 24 h). À planifier une
-- fois par jour — Vercel Cron (`vercel.json`), pg_cron, ou à la main.
-- delete from envois where envoye_le < now() - interval '2 days';
