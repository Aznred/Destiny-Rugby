-- Correctif 35. Appliquer AVANT d'activer les publicités sur le serveur Neon.
create table if not exists pub_comptes (
  compte uuid primary key references comptes(id) on delete cascade,
  donnees jsonb not null
);
create table if not exists pub_transactions (
  tid text primary key,
  compte uuid not null references comptes(id) on delete cascade,
  cree_le timestamptz not null default now()
);
create table if not exists pub_sessions (
  id uuid primary key,
  compte uuid not null references comptes(id) on delete cascade
);
-- Les reçus sont conservés : pas de remise à zéro de l'idempotence quotidienne.
create or replace function pub_ecrire(c uuid, revision_attendue int, document jsonb, credit bigint, transaction_id text)
returns boolean language plpgsql as $$
declare revision_actuelle int;
begin
  perform pg_advisory_xact_lock(hashtextextended('pub:' || c::text,0));
  select (donnees->>'revision')::int into revision_actuelle from pub_comptes where compte=c;
  if revision_actuelle is distinct from revision_attendue then return false; end if;
  if credit < 0 or credit > 10000 then raise exception 'Crédit publicitaire invalide'; end if;
  if credit > 0 and not exists(select 1 from compte_boutique where compte=c) then return false; end if;
  if transaction_id is not null then
    insert into pub_transactions(tid,compte) values(transaction_id,c) on conflict do nothing;
    if not found then return false; end if;
  end if;
  if credit > 0 then
    update compte_boutique set donnees=donnees || jsonb_build_object(
      'ovas',coalesce((donnees->>'ovas')::bigint,0)+credit,
      'achatsOvas',coalesce((donnees->>'achatsOvas')::bigint,0)+credit
    ), modifie_le=now() where compte=c;
  end if;
  insert into pub_comptes(compte,donnees) values(c,document)
    on conflict(compte) do update set donnees=excluded.donnees;
  insert into pub_sessions(id,compte)
    select (s->>'rewardSessionId')::uuid,c from jsonb_array_elements(document->'sessions') s
    on conflict do nothing;
  return true;
end $$;
