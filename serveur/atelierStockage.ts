import { neon } from '@neondatabase/serverless';
import { CATALOGUE_ADMIN_VIDE, type CatalogueAdmin } from '../src/lib/ligue/atelierCatalogue.js';

export interface StockageAtelier {
  lire(): Promise<CatalogueAdmin>;
  ecrire(configuration: CatalogueAdmin, revision: number): Promise<boolean>;
}
export function atelierNeon(url: string): StockageAtelier {
  const sql = neon(url);
  let cache: CatalogueAdmin | undefined;
  return {
    async lire() {
      try {
        const version = await sql`select revision from carriere_catalogue_admin where id=1`;
        if(cache && cache.revision === Number(version[0]?.revision ?? 0)) return cache;
        const r = await sql`select donnees from carriere_catalogue_admin where id=1`;
        cache = r[0]?.donnees as CatalogueAdmin ?? CATALOGUE_ADMIN_VIDE;
        return cache;
      } catch (e) { if ((e as {code?:string}).code === '42P01') return CATALOGUE_ADMIN_VIDE; throw e; }
    },
    async ecrire(configuration, revision) {
      // Initialisation à la première écriture autorisée de Kiri, sur Vercel aussi.
      await sql`create table if not exists carriere_catalogue_admin (id integer primary key check(id=1), revision integer not null, donnees jsonb not null)`;
      await sql`alter table carriere_catalogue_admin enable row level security`;
      const r = await sql`insert into carriere_catalogue_admin (id,revision,donnees)
        select 1,${configuration.revision},${JSON.stringify(configuration)}::jsonb where ${revision}=0
        on conflict(id) do update set revision=excluded.revision,donnees=excluded.donnees
        where carriere_catalogue_admin.revision=${revision} returning id`;
      if (r.length) return true;
      if (!revision) return false;
      const update = await sql`update carriere_catalogue_admin set revision=${configuration.revision}, donnees=${JSON.stringify(configuration)}::jsonb where id=1 and revision=${revision} returning id`;
      return update.length === 1;
    },
  };
}
