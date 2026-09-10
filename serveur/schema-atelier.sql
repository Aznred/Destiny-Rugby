create table if not exists carriere_catalogue_admin (
  id integer primary key check(id=1),
  revision integer not null,
  donnees jsonb not null
);
alter table carriere_catalogue_admin enable row level security;
