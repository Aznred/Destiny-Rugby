-- Additive migration. Identities never live in the card catalogue.
create table if not exists player_datasets (
  version text primary key, sha256 text not null, status text not null default 'STAGING'
    check(status in ('STAGING','ACTIVE','RETIRED')), report jsonb not null default '{}', created_at timestamptz not null default now()
);
create unique index if not exists one_active_player_dataset on player_datasets(status) where status='ACTIVE';
create table if not exists source_players (
  dataset_version text not null references player_datasets(version), id text not null, identity_key text not null,
  gender text not null, usage text not null, card_status text not null, club text, competition text, position text,
  overall integer, confidence real not null, duplicate boolean not null default false,
  review text not null default 'PENDING' check(review in ('PENDING','APPROVED','REJECTED')),
  revision integer not null default 0, data jsonb not null, primary key(dataset_version,id)
);
create index if not exists source_players_filters on source_players(dataset_version,gender,usage,card_status,id);
create index if not exists source_players_identity on source_players(dataset_version,identity_key text_pattern_ops,id);
create extension if not exists pg_trgm;
create index if not exists source_players_name_search on source_players using gin(identity_key gin_trgm_ops);
create index if not exists source_players_club on source_players(dataset_version,club,id);
create index if not exists source_players_review on source_players(dataset_version,review,id);
create table if not exists game_players (
  id text primary key, source_id text not null, dataset_version text not null references player_datasets(version),
  gender text not null check(gender in ('male','female')), status text not null check(status in ('ACTIVE_CARD','DATABASE_ONLY','LOW_CONFIDENCE')),
  review text not null default 'PENDING', data jsonb not null, unique(dataset_version,source_id)
);
create index if not exists game_players_catalogue on game_players(dataset_version,gender,status,review,id);
create table if not exists player_feature_access (
  compte uuid primary key references comptes(id), feature_womens_rugby boolean not null default false,
  role text not null default 'INTERNAL_TESTER'
);
-- Resolves Kiri once to the immutable account id. No username check in the women's APIs.
insert into player_feature_access(compte,feature_womens_rugby)
  select id,true from comptes where identifiant='kiri' on conflict(compte) do nothing;
create table if not exists player_reviews (
  id bigserial primary key, dataset_version text not null, source_id text not null, revision integer not null,
  action text not null, actor uuid references comptes(id), data jsonb not null, created_at timestamptz not null default now()
);
create index if not exists player_reviews_revision on player_reviews(dataset_version,id desc);
create table if not exists player_migration_snapshots (
  migration text not null, kind text not null, entity_id text not null, revision integer not null,
  data jsonb not null, created_at timestamptz not null default now(), primary key(migration,kind,entity_id,revision)
);
create table if not exists academy_profiles (
  dataset_version text not null references player_datasets(version), club_id text not null, gender text not null,
  data jsonb not null, primary key(dataset_version,club_id,gender)
);
-- Instantanés minimaux de carrière : jamais joints à game_players ni aux cartes.
create table if not exists youth_career_sources (
  dataset_version text not null references player_datasets(version), id text not null,
  club text not null, age integer not null, position text not null, data jsonb not null,
  primary key(dataset_version,id)
);
create index if not exists youth_career_sources_club on youth_career_sources(dataset_version,club,id);
-- These tables are accessed only by the authenticated server/service connection.
alter table source_players enable row level security;
alter table game_players enable row level security;
alter table player_feature_access enable row level security;
alter table player_reviews enable row level security;
alter table player_migration_snapshots enable row level security;
alter table academy_profiles enable row level security;
alter table youth_career_sources enable row level security;
