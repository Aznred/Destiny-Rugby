-- Additif : les anciens serveurs peuvent continuer à lire/écrire donnees.
-- Un manifeste n'est utilisable que pour EXACTEMENT la même version CAS.
alter table carriere_ligues add column if not exists transfert_version integer;
alter table carriere_ligues add column if not exists transfert_manifest jsonb;
alter table carriere_ligues add column if not exists catalogue_revision integer;
create table if not exists carriere_transfert_blocs (
  ligue uuid not null references carriere_ligues(id) on delete cascade,
  cle text not null,
  empreinte text not null,
  contenu text not null,
  primary key (ligue,cle)
);
alter table carriere_transfert_blocs enable row level security;
-- Métadonnée maintenue aussi quand un ancien serveur écrit.
create or replace function carriere_metadonnees_transfert() returns trigger
language plpgsql as $$
begin
  new.catalogue_revision := coalesce((new.donnees->>'catalogueRevision')::integer,0);
  if tg_op='UPDATE' and new.donnees is distinct from old.donnees
     and new.transfert_manifest is not distinct from old.transfert_manifest then
    new.transfert_version := null;
  end if;
  return new;
end;
$$;
create or replace trigger carriere_metadonnees_transfert
before insert or update of donnees on carriere_ligues
for each row execute function carriere_metadonnees_transfert();
update carriere_ligues set catalogue_revision=coalesce((donnees->>'catalogueRevision')::integer,0)
where catalogue_revision is null;
create index if not exists sessions_expiration_idx on sessions(expire_le);
create index if not exists carriere_debits_nettoyage_idx on carriere_debits(debut);
