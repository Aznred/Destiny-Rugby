-- Une seule photographie MVCC : métadonnées et pages ne peuvent pas provenir
-- de versions différentes. INVOKER : les droits de l'appelant sont conservés.
create or replace function carriere_lire_delta(p_id uuid, p_code text, p_connu jsonb)
returns table(id uuid,code text,version integer,comptes uuid[],echeance timestamptz,
              donnees jsonb,champs jsonb,empreintes jsonb,blocs jsonb,compact boolean)
language sql stable security invoker as $$
  select l.id,l.code,l.version,l.comptes,l.echeance,
    case when l.transfert_version=l.version and l.transfert_manifest is not null and d.complet then null else l.donnees end,
    case when f.forme is distinct from p_connu->'champs' then f.forme end,
    case when d.complet then d.empreintes else '{}'::jsonb end,
    case when d.complet then d.blocs else '[]'::jsonb end,
    coalesce(l.transfert_version=l.version and l.transfert_manifest is not null and d.complet,false)
  from carriere_ligues l
  cross join lateral (
    select coalesce(jsonb_object_agg(c.key,case when jsonb_array_length(c.value)=1 and right(c.value->>0,6)=':objet'
      then -1 else jsonb_array_length(c.value) end),'{}'::jsonb) as forme
    from jsonb_each(l.transfert_manifest->'champs') c
  ) f
  cross join lateral (
    select coalesce(jsonb_object_agg(m.key,m.value),'{}'::jsonb) as empreintes,
      coalesce(jsonb_agg(jsonb_build_object('cle',b.cle,'empreinte',b.empreinte,'contenu',b.contenu))
        filter(where b.cle is not null),'[]'::jsonb) as blocs,
      count(*)=count(b.cle) as complet
    from jsonb_each_text(case when l.transfert_version=l.version then l.transfert_manifest->'empreintes' else '{}'::jsonb end) m
    left join carriere_transfert_blocs b on b.ligue=l.id and b.cle=m.key and b.empreinte=m.value
    where m.value is distinct from p_connu->'empreintes'->>m.key
  ) d
  where (p_id is not null and l.id=p_id) or (p_code is not null and l.code=p_code);
$$;

create or replace function carriere_reserver_debit(p_cle text,p_maximum integer,p_debut bigint,p_lot integer)
returns integer language plpgsql security invoker as $$
declare ancien carriere_debits%rowtype; quantite integer;
begin
  if p_maximum<1 or p_lot<1 or p_lot>16 or p_lot>p_maximum then
    raise exception 'Réservation invalide';
  end if;
  loop
    insert into carriere_debits(cle,debut,nombre) values(p_cle,p_debut,p_lot)
      on conflict(cle) do nothing;
    if found then return p_lot; end if;
    select * into ancien from carriere_debits where cle=p_cle for update;
    if found then exit; end if;
  end loop;
  if ancien.debut=p_debut then
    quantite:=greatest(0,least(p_lot,p_maximum-ancien.nombre));
    if quantite>0 then update carriere_debits set nombre=nombre+quantite where cle=p_cle; end if;
  elsif ancien.debut>p_debut then
    -- Un ancien appel retardé ne doit jamais ramener le compteur en arrière.
    return 0;
  else
    quantite:=p_lot;
    update carriere_debits set debut=p_debut,nombre=quantite where cle=p_cle;
  end if;
  return quantite;
end;
$$;
