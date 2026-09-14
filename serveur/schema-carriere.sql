-- À appliquer APRÈS schema-ligues.sql. Migration additive, sans effacement.
-- Les comptes et sessions du socle sont réutilisés. La carrière conserve un
-- agrégat versionné : débit, propriété, résultat et reçu sont un seul commit.
alter table comptes add column if not exists identifiant text;
create unique index if not exists comptes_identifiant_idx on comptes (identifiant);
-- Connexion fédérée. Le sujet Google est l'identité stable ; le courriel ne
-- sert qu'à rattacher sans doublon un ancien compte créé avec cette adresse.
alter table comptes add column if not exists courriel text;
alter table comptes add column if not exists fournisseur text;
alter table comptes add column if not exists sujet_externe text;
create unique index if not exists comptes_externe_idx
  on comptes (fournisseur, sujet_externe) where sujet_externe is not null;
create unique index if not exists comptes_courriel_idx
  on comptes (courriel) where courriel is not null;

-- Coffre commun a toutes les carrieres solo du compte : Ovas, collection et
-- achats cosmetiques. Il reste separe des economies propres aux ligues.
create table if not exists compte_boutique (
  compte uuid primary key references comptes(id) on delete cascade,
  donnees jsonb not null check (jsonb_typeof(donnees) = 'object'),
  modifie_le timestamptz not null default now()
);

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
-- Ces deux champs minuscules évitent de décompresser `donnees` pour chaque
-- polling et permettent à l'horloge de trouver ses ligues par index.
alter table carriere_ligues add column if not exists etat_version integer;
alter table carriere_ligues add column if not exists phase text;
alter table carriere_ligues add column if not exists resume jsonb;
-- Réveil strictement réservé aux matchs. `echeance` comprend aussi minuit et
-- sert au polling client ; l'utiliser pour le cron chargeait toutes les ligues
-- chaque nuit, même celles qui n'avaient aucun match à calculer.
alter table carriere_ligues add column if not exists reveil_match timestamptz;
update carriere_ligues
set etat_version=coalesce((donnees->>'version')::integer,0), phase=donnees->>'phase',
    resume=jsonb_build_object(
      'nom',donnees->'nom','phase',donnees->'phase','logo',donnees->'logo','createurId',donnees->'createurId',
      'clubs',coalesce((select jsonb_agg(jsonb_build_object(
        'compteId',c->'compteId','nom',c->'nom','ovas',c->'ovas','embleme',c->'embleme'))
        from jsonb_array_elements(coalesce(donnees->'clubs','[]'::jsonb)) c),'[]'::jsonb))
where etat_version is distinct from coalesce((donnees->>'version')::integer,0)
   or phase is distinct from donnees->>'phase' or resume is null or not (resume ? 'createurId');
alter table carriere_ligues alter column etat_version set default 0;
alter table carriere_ligues alter column etat_version set not null;
create index if not exists carriere_ligues_echeance_idx on carriere_ligues (echeance,id) where phase='saison';
create index if not exists carriere_ligues_salon_echeance_idx on carriere_ligues (echeance,id) where phase='salon';
update carriere_ligues l set reveil_match=case
  when exists (select 1 from jsonb_array_elements(coalesce(l.donnees->'rencontres','[]'::jsonb)) r
               where r ? 'match' and coalesce((r->'match'->>'termine')::boolean,false)=false) then now()
  when exists (select 1 from jsonb_array_elements(coalesce(l.donnees->'rencontres','[]'::jsonb)) r
               where not (r ? 'resultat') and not (r ? 'match') and (r->>'ferme')::timestamptz<=now()) then now()
  else (select min(v.instant) from jsonb_array_elements(coalesce(l.donnees->'rencontres','[]'::jsonb)) r
        cross join lateral (values ((r->>'ouvre')::timestamptz),
          ((r->>'ferme')::timestamptz-interval '2 minutes'),((r->>'ferme')::timestamptz)) v(instant)
        where not (r ? 'resultat') and not (r ? 'match') and v.instant>now()) end
where l.phase='saison' and l.reveil_match is null
  and exists (select 1 from jsonb_array_elements(coalesce(l.donnees->'rencontres','[]'::jsonb)) r
              where not (r ? 'resultat'));
create index if not exists carriere_ligues_reveil_match_idx on carriere_ligues (reveil_match,id)
  where phase='saison' and reveil_match is not null;
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
-- Un battement de présence change toutes les 12 secondes. Le garder ici évite
-- de réécrire 400 à 900 Ko de JSONB pour quelques octets.
create table if not exists carriere_presences (
  ligue uuid not null references carriere_ligues(id) on delete cascade,
  match text not null,
  compte text not null,
  vu_le timestamptz not null,
  primary key (ligue,match,compte)
);
create index if not exists carriere_presences_vu_idx on carriere_presences (ligue,vu_le);
create index if not exists carriere_presences_nettoyage_idx on carriere_presences (vu_le);
-- Ne pas purger carriere_commandes pendant la vie d'une ligue : ses reçus
-- interdisent qu'une ancienne requête rejouée rachète un pack ou un joueur.
