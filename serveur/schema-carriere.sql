-- À appliquer APRÈS schema-ligues.sql. Migration additive, sans effacement.
-- Les comptes et sessions du socle sont réutilisés. La carrière conserve un
-- agrégat versionné : débit, propriété, résultat et reçu sont un seul commit.
alter table comptes add column if not exists identifiant text;
create unique index if not exists comptes_identifiant_idx on comptes (identifiant);

create table if not exists carriere_ligues (
  id uuid primary key,
  code text not null unique,
  version integer not null default 0 check (version >= 0),
  comptes uuid[] not null,
  donnees jsonb not null check (jsonb_typeof(donnees) = 'object'),
  cree_le timestamptz not null default now()
);
create index if not exists carriere_ligues_comptes_idx on carriere_ligues using gin(comptes);
-- ⚠️ LA PROCHAINE DATE À LAQUELLE LA LIGUE PEUT BOUGER TOUTE SEULE. Sans elle,
-- répondre « rien n'a changé » à un sondage obligeait à relire l'état entier
-- (300 à 400 Ko) rien que pour le constater — le quota de transfert Neon est
-- parti en huit jours à ce rythme. Avec elle, une lecture conditionnelle tient
-- en trois colonnes de quelques octets. NULL veut dire « on ne sait pas » : la
-- lecture retombe alors sur le comportement d'avant, jamais sur une ligue figée.
alter table carriere_ligues add column if not exists echeance timestamptz;
create table if not exists carriere_commandes (
  ligue uuid not null references carriere_ligues(id),
  compte text not null,
  requete text not null,
  fait_le timestamptz not null default now(),
  primary key (ligue,compte,requete)
);
create table if not exists carriere_debits (
  cle text primary key,
  debut bigint not null,
  nombre integer not null check (nombre > 0)
);
-- Ne pas purger carriere_commandes pendant la vie d'une ligue : ses reçus
-- interdisent qu'une ancienne requête rejouée rachète un pack ou un joueur.
