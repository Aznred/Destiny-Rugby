create table if not exists carriere_push (
  id text not null, compte uuid not null references comptes(id) on delete cascade,
  ligue uuid not null references carriere_ligues(id) on delete cascade,
  cree bigint not null, abonnement jsonb not null, primary key(id,ligue)
);
create index if not exists carriere_push_ligue on carriere_push(ligue);
create table if not exists carriere_push_envois (
  cle text primary key, bail bigint not null, envoye boolean not null default false,
  cree_le timestamptz not null default now()
);
alter table carriere_push enable row level security;
alter table carriere_push_envois enable row level security;
-- Maintenance quotidienne : DELETE FROM carriere_push_envois WHERE cree_le < now() - interval '7 days';
