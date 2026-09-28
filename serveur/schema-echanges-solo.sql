-- À appliquer APRÈS schema-carriere.sql. Migration additive.
create index if not exists carriere_divisions_publiques_cycle_idx on carriere_ligues ((resume->'publique'->>'cycle'))
  where resume ? 'publique';
-- Bourse publique de la collection solo. Les cartes offertes sont séquestrées
-- dès la création ; chaque opération et les deux coffres restent atomiques.
create table if not exists collection_offres (
  id uuid primary key,
  compte uuid not null references comptes(id) on delete cascade,
  pseudo text not null,
  offertes jsonb not null,
  souhaitees jsonb not null,
  propositions jsonb not null default '[]'::jsonb,
  statut text not null default 'ouverte' check (statut in ('ouverte','acceptee','annulee')),
  cree_le timestamptz not null default now()
);
create index if not exists collection_offres_ouvertes_idx on collection_offres(cree_le desc) where statut='ouverte';
create index if not exists collection_offres_compte_idx on collection_offres(compte,cree_le desc);

create or replace function collection_possede_doublons(p_compte uuid,p_lot jsonb)
returns boolean language plpgsql as $$
declare v_quant jsonb; v_cle text; v_nombre text;
begin
  select donnees->'collectionSolo'->'quantites' into v_quant from compte_boutique where compte=p_compte;
  if v_quant is null then return false; end if;
  for v_cle,v_nombre in select key,value from jsonb_each_text(p_lot) loop
    if (v_quant->>v_cle)::integer <= v_nombre::integer or v_quant->>v_cle is null then return false; end if;
  end loop;
  return true;
end $$;

create or replace function collection_modifier(p_compte uuid,p_lot jsonb,p_signe integer,p_garder boolean)
returns void language plpgsql as $$
declare v_donnees jsonb; v_quant jsonb; v_cle text; v_nombre text; v_nouveau integer; v_doublons integer;
begin
  select donnees into v_donnees from compte_boutique where compte=p_compte for update;
  if v_donnees is null then raise exception 'Collection de compte indisponible.'; end if;
  v_quant := coalesce(v_donnees->'collectionSolo'->'quantites','{}'::jsonb);
  for v_cle,v_nombre in select key,value from jsonb_each_text(p_lot) loop
    v_nouveau := coalesce((v_quant->>v_cle)::integer,0) + p_signe * v_nombre::integer;
    if (p_garder and v_nouveau < 1) or (not p_garder and v_nouveau < 0) then
      raise exception 'Doublons insuffisants.';
    end if;
    if v_nouveau = 0 then v_quant := v_quant - v_cle;
    else v_quant := jsonb_set(v_quant,array[v_cle],to_jsonb(v_nouveau),true); end if;
  end loop;
  select coalesce(sum(greatest(value::integer-1,0)),0) into v_doublons from jsonb_each_text(v_quant);
  v_donnees := jsonb_set(v_donnees,'{collectionSolo,quantites}',v_quant,true);
  v_donnees := jsonb_set(v_donnees,'{collectionSolo,doublons}',to_jsonb(v_doublons),true);
  v_donnees := jsonb_set(v_donnees,'{collectionSolo,revision}',
    to_jsonb(coalesce((v_donnees->'collectionSolo'->>'revision')::integer,0)+1),true);
  update compte_boutique set donnees=v_donnees,modifie_le=now() where compte=p_compte;
end $$;

create or replace function collection_creer_offre(p_id uuid,p_compte uuid,p_pseudo text,p_offertes jsonb,p_souhaitees jsonb)
returns boolean language plpgsql as $$
begin
  if (select count(*) from collection_offres where compte=p_compte and statut='ouverte') >= 10 then
    raise exception 'Dix offres sont déjà ouvertes.';
  end if;
  perform collection_modifier(p_compte,p_offertes,-1,true);
  insert into collection_offres(id,compte,pseudo,offertes,souhaitees) values(p_id,p_compte,p_pseudo,p_offertes,p_souhaitees);
  return true;
end $$;

create or replace function collection_proposer(p_id uuid,p_offre uuid,p_compte uuid,p_pseudo text,p_cartes jsonb)
returns boolean language plpgsql as $$
declare v_offre collection_offres%rowtype;
begin
  select * into v_offre from collection_offres where id=p_offre for update;
  if v_offre.id is null or v_offre.statut <> 'ouverte' or v_offre.compte=p_compte
    or jsonb_array_length(v_offre.propositions)>=30
    or exists(select 1 from jsonb_array_elements(v_offre.propositions) p where p->>'compteId'=p_compte::text)
    or not collection_possede_doublons(p_compte,p_cartes) then raise exception 'Proposition indisponible.'; end if;
  update collection_offres set propositions=propositions || jsonb_build_array(jsonb_build_object(
    'id',p_id,'compteId',p_compte,'pseudo',p_pseudo,'cartes',p_cartes,'creeLe',now())) where id=p_offre;
  return true;
end $$;

create or replace function collection_accepter(p_offre uuid,p_compte uuid,p_proposition uuid)
returns boolean language plpgsql as $$
declare v_offre collection_offres%rowtype; v_proposition jsonb; v_acheteur uuid; v_cartes jsonb;
begin
  select * into v_offre from collection_offres where id=p_offre for update;
  if v_offre.id is null or v_offre.statut<>'ouverte' then raise exception 'Offre indisponible.'; end if;
  if p_proposition is null then
    if v_offre.compte=p_compte or v_offre.souhaitees='{}'::jsonb then raise exception 'Offre indisponible.'; end if;
    v_acheteur:=p_compte; v_cartes:=v_offre.souhaitees;
  else
    if v_offre.compte<>p_compte then raise exception 'Seul l’auteur peut accepter une proposition.'; end if;
    select p into v_proposition from jsonb_array_elements(v_offre.propositions) p where p->>'id'=p_proposition::text;
    if v_proposition is null then raise exception 'Proposition introuvable.'; end if;
    v_acheteur:=(v_proposition->>'compteId')::uuid; v_cartes:=v_proposition->'cartes';
  end if;
  -- Ordre de verrouillage identique pour deux échanges inverses simultanés.
  perform 1 from compte_boutique where compte in (v_acheteur,v_offre.compte) order by compte for update;
  perform collection_modifier(v_acheteur,v_cartes,-1,true);
  perform collection_modifier(v_acheteur,v_offre.offertes,1,false);
  perform collection_modifier(v_offre.compte,v_cartes,1,false);
  update collection_offres set statut='acceptee' where id=p_offre;
  return true;
end $$;

create or replace function collection_refuser(p_offre uuid,p_compte uuid,p_proposition uuid)
returns boolean language plpgsql as $$
declare v_offre collection_offres%rowtype;
begin
  select * into v_offre from collection_offres where id=p_offre for update;
  if v_offre.id is null or v_offre.compte<>p_compte or v_offre.statut<>'ouverte'
    or not exists(select 1 from jsonb_array_elements(v_offre.propositions) p where p->>'id'=p_proposition::text) then
    raise exception 'Proposition indisponible.';
  end if;
  update collection_offres set propositions=coalesce((select jsonb_agg(p) from jsonb_array_elements(v_offre.propositions) p
    where p->>'id'<>p_proposition::text),'[]'::jsonb) where id=p_offre;
  return true;
end $$;

create or replace function collection_annuler(p_offre uuid,p_compte uuid)
returns boolean language plpgsql as $$
declare v_offre collection_offres%rowtype;
begin
  select * into v_offre from collection_offres where id=p_offre for update;
  if v_offre.id is null or v_offre.compte<>p_compte or v_offre.statut<>'ouverte' then raise exception 'Offre indisponible.'; end if;
  perform collection_modifier(p_compte,v_offre.offertes,1,false);
  update collection_offres set statut='annulee' where id=p_offre;
  return true;
end $$;
