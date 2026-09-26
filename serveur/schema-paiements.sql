create table if not exists achats_stripe (
  session text primary key,
  compte uuid not null references comptes(id) on delete cascade,
  ovas integer not null check (ovas > 0),
  cree_le timestamptz not null default now()
);
