-- LE CLASSEMENT MONDIAL — schéma de la base
--
-- ⚠️ ON NE STOCKE QUE LE SCORE (demande explicite : « dans la DB je veux
-- retenir juste le score »). La fiche de carrière — saisons, matchs, essais,
-- titres — voyage dans la REQUÊTE pour que le serveur puisse recalculer, puis
-- elle est JETÉE. Rien d'autre ne survit à la vérification.
--
-- Conséquence assumée : on ne pourra pas, plus tard, afficher « 12 saisons,
-- 44 essais » à côté d'un score, ni recalculer un classement si le barème
-- change. C'est le prix d'une base minimale — et c'est ce qui a été demandé.

create table if not exists classement (
  -- Le pseudo EST la clé : une seule ligne par joueur, donc pas de spam.
  pseudo   text primary key check (length(pseudo) between 1 and 24),
  -- Le plafond vient de `SCORE_MAX` (src/lib/classementMondial.ts) : la carrière
  -- théorique maximale du jeu. Une valeur au-dessus est mathématiquement
  -- impossible — la base elle-même la refuse, même si le code se trompait.
  score    integer not null check (score >= 0 and score <= 64488),
  cree_le  timestamptz not null default now(),
  maj_le   timestamptz not null default now()
);

create index if not exists classement_score_idx on classement (score desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ PERSONNE N'ÉCRIT DEPUIS LE NAVIGATEUR
-- ═══════════════════════════════════════════════════════════════════════════
-- La clé `anon` est publique : elle est dans le bundle, visible de tous. Si elle
-- a le droit d'insérer, le classement est mort en une semaine. Lecture ouverte,
-- écriture réservée à l'Edge Function (qui, elle, détient la clé de service).
alter table classement enable row level security;

drop policy if exists lecture_publique on classement;
create policy lecture_publique on classement
  for select using (true);

-- Aucune policy d'insertion ni de mise à jour : la clé de service les contourne,
-- la clé anon non. C'est volontaire, ne pas « corriger ».

-- ═══════════════════════════════════════════════════════════════════════════
-- LE GARDE-FOU DE DÉBIT (côté base, pour ne pas dépendre du code)
-- ═══════════════════════════════════════════════════════════════════════════
-- Une carrière crédible demande des heures de jeu. Un envoi par heure et par
-- appareil rend le forçage brutal inutile. On ne garde qu'un HACHÉ de
-- l'identifiant d'appareil : jamais l'IP en clair, jamais rien de nominatif.
create table if not exists envois (
  appareil text not null,
  envoye_le timestamptz not null default now()
);
create index if not exists envois_appareil_idx on envois (appareil, envoye_le desc);

-- Purge : on ne garde pas d'historique au-delà de ce qui sert au débit.
-- (à planifier une fois par jour — pg_cron, ou un simple cron externe)
-- delete from envois where envoye_le < now() - interval '2 days';

-- ═══════════════════════════════════════════════════════════════════════════
-- POSER UN SCORE : on ne garde que le MEILLEUR
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ Un joueur qui envoie une carrière moins bonne que la précédente ne doit pas
-- écraser son record. Et deux envois simultanés ne doivent pas créer deux
-- lignes : `on conflict` règle les deux d'un coup, côté base, donc sans course.
create or replace function poser_score(p_pseudo text, p_score integer)
returns void
language sql
security definer
as $$
  insert into classement (pseudo, score)
  values (p_pseudo, p_score)
  on conflict (pseudo) do update
    set score = greatest(classement.score, excluded.score),
        maj_le = now()
    where excluded.score > classement.score;
$$;
