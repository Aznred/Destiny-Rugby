import type { DemandeCarte, PropositionClub, SaisieCarteNormale, SaisieDemandeCarte } from '../src/lib/cartesNormales.js';
import type { CatalogueAdmin } from '../src/lib/ligue/atelierCatalogue.js';
import type { ExecuterSql } from './packsInternesStockage.js';

export interface StockageDemandesCartes {
  creer(compte: string, id: string, saisie: SaisieDemandeCarte): Promise<boolean>;
  lister(compte: string | null): Promise<DemandeCarte[]>;
  lire(id: string, compte: string | null): Promise<DemandeCarte | null>;
  modifier(id: string, revision: number, carte: SaisieCarteNormale): Promise<boolean>;
  refuser(id: string, revision: number, reponse: string, par: string): Promise<boolean>;
  annuler(id: string, compte: string): Promise<boolean>;
  /** L'approbation et le catalogue sont inscrits ensemble, avec leurs deux révisions. */
  approuver(id: string, revision: number, config: CatalogueAdmin, revisionCatalogue: number, carte: SaisieCarteNormale, par: string): Promise<boolean>;
}
const versDemande = (r: Record<string, unknown>): DemandeCarte => {
  const carteObj = (r.carte ?? {}) as Record<string, unknown>;
  const clubPropose = (carteObj.clubPropose ?? r.club_propose) as PropositionClub | undefined;
  return {
    id: String(r.id), type: r.type as DemandeCarte['type'], sourceId: r.source_id ? String(r.source_id) : undefined,
    carte: r.carte as SaisieCarteNormale, clubPropose, message: String(r.message), statut: r.statut as DemandeCarte['statut'],
    revision: Number(r.revision), creeLe: new Date(String(r.cree_le)).toISOString(),
    decideLe: r.decide_le ? new Date(String(r.decide_le)).toISOString() : undefined,
    reponse: r.reponse ? String(r.reponse) : undefined, pseudo: r.pseudo ? String(r.pseudo) : undefined,
    photoProposee: Boolean(r.photo_proposee || carteObj.photo || clubPropose?.logo),
    droitsCertifies: true,
  };
};
export function demandesCartesSql(sql: ExecuterSql): StockageDemandesCartes {
  let preparation: Promise<unknown> | undefined;
  const preparer = async () => {
    preparation ??= (async () => {
      await sql`create table if not exists demandes_cartes (
        id uuid primary key, compte uuid not null references comptes(id), type text not null check(type in ('creation','correction','club','retrait')),
        source_id text, carte jsonb not null, message text not null default '', statut text not null default 'attente' check(statut in ('attente','acceptee','refusee')),
        revision integer not null default 0, place integer not null check(place between 1 and 5), cree_le timestamptz not null default now(),
        decide_le timestamptz, decide_par text, reponse text)`;
      try {
        await sql`alter table demandes_cartes drop constraint if exists demandes_cartes_type_check`;
        await sql`alter table demandes_cartes add constraint demandes_cartes_type_check check(type in ('creation','correction','club','retrait'))`;
      } catch {
        /* ignorer si table inexistante ou contrainte déjà à jour */
      }
      await sql`create unique index if not exists demandes_cartes_places on demandes_cartes(compte, place) where statut='attente'`;
      await sql`alter table demandes_cartes enable row level security`;
    })().catch(e => { preparation = undefined; throw e; });
    await preparation;
  };
  return {
    async creer(compte, id, s) {
      await preparer();
      const carteAStocker = s.clubPropose ? { ...s.carte, clubPropose: s.clubPropose } : s.carte;
      const r = await sql`insert into demandes_cartes(id, compte, type, source_id, carte, message, place)
        select ${id}::uuid, ${compte}::uuid, ${s.type}, ${s.sourceId ?? null}, ${JSON.stringify(carteAStocker)}::jsonb, ${s.message}, n
        from generate_series(1,5) n where not exists(select 1 from demandes_cartes where compte=${compte}::uuid and place=n and statut='attente')
        order by n limit 1 on conflict do nothing returning id`;
      return r.length > 0;
    },
    async lister(compte) {
      await preparer();
      return (await sql`select d.id,d.type,d.source_id,d.carte - 'photo' as carte,d.carte ? 'photo' as photo_proposee,
        d.message,d.statut,d.revision,d.cree_le,d.decide_le,d.reponse,c.pseudo from demandes_cartes d join comptes c on c.id=d.compte
        where (${compte}::uuid is null or d.compte=${compte}::uuid) order by (d.statut='attente') desc,d.cree_le desc limit 200`).map(versDemande);
    },
    async lire(id, compte) {
      await preparer();
      const r = await sql`select * from demandes_cartes where id=${id}::uuid and (${compte}::uuid is null or compte=${compte}::uuid)`;
      return r.length ? versDemande(r[0]) : null;
    },
    async modifier(id, revision, carte) {
      await preparer();
      return (await sql`update demandes_cartes set carte=${JSON.stringify(carte)}::jsonb,revision=revision+1 where id=${id}::uuid and revision=${revision} and statut='attente' returning id`).length > 0;
    },
    async refuser(id, revision, reponse, par) {
      await preparer();
      return (await sql`update demandes_cartes set statut='refusee',revision=revision+1,reponse=${reponse},decide_le=now(),decide_par=${par}
        where id=${id}::uuid and revision=${revision} and statut='attente' returning id`).length > 0;
    },
    async annuler(id, compte) {
      await preparer();
      return (await sql`delete from demandes_cartes where id=${id}::uuid and compte=${compte}::uuid and statut='attente' returning id`).length > 0;
    },
    async approuver(id, revision, config, revisionCatalogue, carte, par) {
      await preparer();
      await sql`create table if not exists carriere_catalogue_admin (id integer primary key check(id=1), revision integer not null, donnees jsonb not null)`;
      await sql`alter table carriere_catalogue_admin enable row level security`;
      const r = await sql`with demande as (
        select id from demandes_cartes where id=${id}::uuid and revision=${revision} and statut='attente' for update
      ), publication as (
        insert into carriere_catalogue_admin(id,revision,donnees)
          select 1,${config.revision},${JSON.stringify(config)}::jsonb where exists(select 1 from demande)
            and (${revisionCatalogue}=0 or exists(select 1 from carriere_catalogue_admin where id=1 and revision=${revisionCatalogue}))
        on conflict(id) do update set revision=excluded.revision,donnees=excluded.donnees where carriere_catalogue_admin.revision=${revisionCatalogue}
        returning id
      ) update demandes_cartes set statut='acceptee',revision=revision+1,carte=${JSON.stringify(carte)}::jsonb,decide_le=now(),decide_par=${par}
        where id in(select id from demande) and exists(select 1 from publication) returning id`;
      return r.length > 0;
    },
  };
}
