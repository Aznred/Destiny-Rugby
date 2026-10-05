import { neon } from '@neondatabase/serverless';
import { CATALOGUE_ADMIN_VIDE, type CatalogueAdmin } from '../src/lib/ligue/atelierCatalogue.js';

/** Une image de carte spéciale : une URL `data:` (PNG, JPEG ou WebP) et sa version. */
export interface ImageSpeciale { version: number; donnees: string }

export interface StockageAtelier {
  lire(): Promise<CatalogueAdmin>;
  ecrire(configuration: CatalogueAdmin, revision: number): Promise<boolean>;
  /**
   * ⚠️ LES IMAGES DES CARTES SPÉCIALES NE VIVENT PAS DANS LE CATALOGUE. Cent
   * vingt portraits à 60 Ko feraient d'un document relu toutes les trente
   * secondes par chaque instance un fardeau de 7 Mo. Le catalogue garde une
   * URL versionnée ; l'image se lit une fois, puis le navigateur la garde.
   */
  lireImage?(id: string): Promise<ImageSpeciale | null>;
  /** Rend la nouvelle version. */
  ecrireImage?(id: string, donnees: string): Promise<number>;
  supprimerImage?(id: string): Promise<void>;
}
export function atelierNeon(url: string): StockageAtelier {
  const sql = neon(url);
  let cache: CatalogueAdmin | undefined;
  const creerTableImages = async () => {
    await sql`create table if not exists carriere_cartes_speciales_images (id text primary key, version integer not null, donnees text not null, maj timestamptz not null default now())`;
    await sql`alter table carriere_cartes_speciales_images enable row level security`;
  };
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
    async lireImage(id) {
      try {
        const r = await sql`select version, donnees from carriere_cartes_speciales_images where id=${id}`;
        return r[0] ? { version: Number(r[0].version), donnees: String(r[0].donnees) } : null;
      } catch (e) { if ((e as {code?:string}).code === '42P01') return null; throw e; }
    },
    async ecrireImage(id, donnees) {
      await creerTableImages();
      const r = await sql`insert into carriere_cartes_speciales_images (id, version, donnees) values (${id}, 1, ${donnees})
        on conflict(id) do update set version = carriere_cartes_speciales_images.version + 1, donnees = excluded.donnees, maj = now()
        returning version`;
      return Number(r[0].version);
    },
    async supprimerImage(id) {
      try { await sql`delete from carriere_cartes_speciales_images where id=${id}`; }
      catch (e) { if ((e as {code?:string}).code !== '42P01') throw e; }
    },
  };
}
