-- LE CLASSEMENT MONDIAL — schéma pour Vercel + Postgres (Neon)
--
-- À coller UNE FOIS dans la console SQL de la base (Vercel → Storage → ta base
-- → Query, ou le SQL Editor de Neon). Voir `serveur/VERCEL.md` pour le pas à pas.
--
-- ⚠️ V2 — LA BASE GARDE MAINTENANT LA FICHE, PAS SEULEMENT LE SCORE.
-- La v1 ne stockait que `pseudo` + `score` (demande d'alors : « dans la DB je
-- veux retenir juste le score »), et notait la conséquence : « on ne pourra
-- pas, plus tard, afficher 12 saisons, 44 essais à côté d'un score ». C'est
-- exactement ce qui est demandé aujourd'hui — « dans le classement mondial,
-- qu'on puisse voir les stats des autres joueurs, leurs profils, armoires à
-- trophées, clubs qu'ils ont faits ». On conserve donc les faits AFFICHABLES,
-- ceux-là mêmes qui servent au recalcul : rien de nominatif, rien de personnel,
-- et le pseudo reste choisi par le joueur.
--
-- ⚠️ LA SÉCURITÉ NE CHANGE PAS D'UN POUCE. Ce qui protège le classement, c'est
-- que le serveur RECALCULE le score (`scoreDeLaFiche`) au lieu de croire celui
-- qu'on lui envoie. Stocker davantage n'ouvre aucune brèche : chaque champ est
-- borné par `verifierFiche` avant d'arriver ici.
--
-- ═══ MIGRATION D'UNE BASE V1 DÉJÀ EN LIGNE ═══════════════════════════════════
-- À coller tel quel : les colonnes sont nullables, les lignes existantes
-- restent affichables (score seul, fiche vide) et se complètent au prochain
-- envoi du joueur.
--
--   alter table classement
--     add column if not exists nom        text,
--     add column if not exists poste      text,
--     add column if not exists nation     text,
--     add column if not exists age        integer,
--     add column if not exists saisons    integer,
--     add column if not exists note       integer,
--     add column if not exists reputation integer,
--     add column if not exists matchs     integer,
--     add column if not exists essais     integer,
--     add column if not exists selections integer,
--     add column if not exists titres     jsonb,
--     add column if not exists clubs      jsonb;
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
  maj_le   timestamptz not null default now(),

  -- ═══ LA FICHE AFFICHABLE (v2) ═════════════════════════════════════════════
  -- Les mêmes champs que ceux qui servent au recalcul du score, plus les clubs.
  -- TOUS NULLABLES : une ligne écrite par la v1 reste lisible, elle n'affiche
  -- simplement pas de détail tant que le joueur n'a pas renvoyé sa carrière.
  nom        text,
  poste      text,
  nation     text,
  age        integer,
  saisons    integer,
  note       integer,
  reputation integer,
  matchs     integer,
  essais     integer,
  selections integer,
  -- Ids de trophées (`data/trophees.ts`) et clubs traversés, dans l'ordre.
  titres     jsonb,
  clubs      jsonb
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
